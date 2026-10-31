// ============================================================
// miniatureService — le miniature WebP delle immagini del database (L1, variante «miniature», 2026-10-20)
// ============================================================
//
// La rotta del file di un'immagine con `l` (una delle `LARGHEZZE_MINIATURA`) passa da qui: la miniatura si genera la prima volta
// che serve, con sharp (libvips), e si tiene in `immagine_miniatura` (migrazione 108) legata alla versione della sorgente
// (`immagine.created_at`). Le regole:
//   - formato WebP, qualità 80, `effort` 4, alfa conservato, metadati tolti, proporzioni mantenute e mai ingrandita;
//   - **ritaglio sul disegno** (UX2-13): un'immagine con alfa e margini trasparenti (le planimetrie su tele native da 2048) si
//     ritaglia sul riquadro dei pixel visibili, con un piccolo bordo trasparente, prima di ridurla; le immagini senza margini restano
//     intere. Solo la miniatura: il file pieno (visore, editor, coordinate dei pin) è sempre la tela intera;
//   - la riga in cache vale per la versione della sorgente **e** per la generazione dell'algoritmo (`GENERAZIONE_MINIATURE`): le
//     miniature di una generazione di prima non si servono, si rigenerano e la pulizia all'avvio le toglie;
//   - si risponde con l'**originale** per SVG e GIF, quando `l` non riduce (la sorgente non è più larga e non c'è niente da
//     ritagliare), e quando il generatore
//     non c'è o fallisce (un `warn` per immagine, mai un 500 per una miniatura): l'app resta utilizzabile;
//   - **coalescenza**: richieste contemporanee della stessa miniatura aspettano la stessa generazione, e la riga si scrive una volta;
//   - la riga si scrive solo se la sorgente è ancora quella (un'immagine sostituita durante la generazione non riceve la miniatura
//     della vecchia); una riga di un'altra versione non vale e si rigenera;
//   - **riscaldamento** in background (dopo l'avvio, e dopo il caricamento dell'immagine di una mappa): le illustrazioni delle schede
//     alle misure delle schede, così la prima apertura de La città dal telefono non aspetta la generazione.
// Il servizio non dipende dagli altri servizi delle immagini (solo dal database e dai condivisi): `immaginiService` lo usa.
// ============================================================

import type { Sharp, SharpOptions } from 'sharp';
import { eGiocoInSolaLettura, getDb, nowIso, type AppDatabase } from '../db/dbService.js';
import { logger } from '../utils/logger.js';
import { GENERAZIONE_MINIATURE, LARGHEZZE_MINIATURA, versioneImmagine, type LarghezzaMiniatura } from '../../shared/miniature.js';
import { caricataDellaMappa, dimensioniImmagine, immaginiCaricateDelleMappe, immaginiCaricateDi } from './mappe/immagineMappa.js';
import { AMBITO_MINIATURA_LUOGO } from '../../shared/immagini.js';

/** La sorgente di una miniatura: la riga dell'immagine col suo contenuto (quella che la rotta del file ha appena letto). */
export interface SorgenteMiniatura { id: number; contenuto: Buffer; mime: string; byte: number; createdAt: string }

/** Che cosa risponde la rotta: la miniatura (generata ora o dalla cache) oppure l'originale. */
export interface RispostaMiniatura { contenuto: Buffer; mime: string; etag: string; esito: 'generata' | 'cache' | 'originale' }

/** Il generatore: una funzione `sharp(input)`, o null se il modulo nativo non si carica. */
type Generatore = (input: Buffer, opzioni?: SharpOptions) => Sharp;

/** Formati che non si riducono: vettoriali (SVG) o animati (GIF), si serve l'originale. */
const SENZA_MINIATURA = new Set(['image/svg+xml', 'image/gif']);
/** Formati che possono avere l'alfa: anche quando `l` non riduce, potrebbero avere margini trasparenti da ritagliare. */
const CON_ALFA = new Set(['image/png', 'image/webp', 'image/avif', 'image/tiff']);

/** Un pixel conta come disegno sopra questa opacità (su 255): l'alone quasi invisibile dell'antialias resta fuori dal riquadro. */
const SOGLIA_ALFA = 8;
/** Il bordo trasparente attorno al riquadro del disegno: il 2% del suo lato maggiore, almeno 2 pixel. */
const BORDO_RITAGLIO = 0.02;
const BORDO_MINIMO = 2;

/** La versione di una riga in cache: la data della sorgente con la generazione dell'algoritmo (la stessa degli URL `?v=`). */
export const versioneMiniatura = versioneImmagine;

let caricamento: Promise<Generatore | null> | null = null;

/** sharp caricato una volta, in modo difensivo: se il binario manca o non si carica, un errore nel log e le miniature diventano
 *  l'originale. Una sola elaborazione alla volta e niente cache in memoria (VPS piccolo: la cache è il database). */
function generatore(): Promise<Generatore | null> {
  caricamento ??= import('sharp')
    .then((m) => {
      const sharp = m.default;
      sharp.concurrency(1);
      sharp.cache(false);
      return sharp as unknown as Generatore;
    })
    .catch((err: unknown) => {
      logger.error({ err }, 'miniature: sharp non si carica, le immagini si servono a piena risoluzione');
      return null;
    });
  return caricamento;
}

/** Le generazioni in corso (chiave: immagine, versione, larghezza): chi arriva dopo aspetta la stessa. */
const inCorso = new Map<string, Promise<RispostaMiniatura>>();
/** Le immagini (id e versione) per cui una generazione è fallita: il `warn` si scrive una volta sola. */
const fallite = new Set<string>();

/** L'ETag della risposta con `l`: quello del file più la generazione e la larghezza, così ogni misura (e ogni generazione
 *  dell'algoritmo) ha il suo. La rotta lo usa anche per il 304 prima di generare. */
export function etagMiniatura(f: { id: number; byte: number; createdAt: string }, l: LarghezzaMiniatura): string {
  return `"${f.id}-${f.byte}-${f.createdAt}-${GENERAZIONE_MINIATURE}-l${l}"`;
}

function originale(s: SorgenteMiniatura, l: LarghezzaMiniatura): RispostaMiniatura {
  return { contenuto: s.contenuto, mime: s.mime, etag: etagMiniatura(s, l), esito: 'originale' };
}

/** Vero se la tabella delle miniature c'è (dalla 108; i test su uno schema di prima non l'hanno). */
function conMiniature(db: AppDatabase): boolean {
  return !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'immagine_miniatura'").get();
}

/** I metadati di una immagine, senza il contenuto: bastano a calcolare l'ETag e a cercare la miniatura in cache (R12-03). */
export type MetadatiMiniatura = Omit<SorgenteMiniatura, 'contenuto'>;

/**
 * La miniatura larga `l` già in cache per la versione e la generazione della sorgente, o null (da generare, o non ne ha: SVG e GIF, o
 * una tabella delle miniature che non c'è). Legge solo i metadati dell'immagine e la riga della miniatura: l'originale, che può
 * pesare megabyte, non si carica dal database (R12-03: prima la rotta lo leggeva sempre, anche per un 304 o una miniatura in cache).
 */
export function miniaturaInCache(m: MetadatiMiniatura, l: LarghezzaMiniatura, db: AppDatabase = getDb()): RispostaMiniatura | null {
  if (SENZA_MINIATURA.has(m.mime) || !conMiniature(db)) return null;
  const inCache = db.prepare('SELECT mime, contenuto FROM immagine_miniatura WHERE immagine_id = ? AND larghezza = ? AND versione = ?').get(m.id, l, versioneMiniatura(m.createdAt)) as
    { mime: string; contenuto: Buffer } | undefined;
  return inCache ? { contenuto: inCache.contenuto, mime: inCache.mime, etag: etagMiniatura(m, l), esito: 'cache' } : null;
}

/**
 * La miniatura larga `l` della sorgente: dalla cache se c'è per la sua versione, altrimenti generata e scritta; l'originale nei
 * casi dell'intestazione. Non solleva mai per un problema del generatore.
 */
export async function miniaturaDi(s: SorgenteMiniatura, l: LarghezzaMiniatura, db: AppDatabase = getDb()): Promise<RispostaMiniatura> {
  if (SENZA_MINIATURA.has(s.mime) || !conMiniature(db)) return originale(s, l);
  // niente da ridurre: l'originale subito, senza decodificare; non per i formati con l'alfa, che potrebbero avere margini
  // trasparenti da ritagliare (lo decide `genera`, che risponde con l'originale se non ce ne sono)
  const dim = dimensioniImmagine(s.contenuto);
  if (dim && l >= dim.larghezza && !CON_ALFA.has(s.mime)) return originale(s, l);
  const versione = versioneMiniatura(s.createdAt);
  const inCache = miniaturaInCache(s, l, db);
  if (inCache) return inCache;
  // L12, istanza di rilascio: `gioco.db` è chiuso e la cache non si scrive. L'edizione porta già tutte le miniature (le genera
  // «Prepara edizione»); se una manca si serve l'originale, senza generare né scrivere.
  if (eGiocoInSolaLettura()) return originale(s, l);
  const chiave = `${s.id}|${versione}|${l}`;
  const gia = inCorso.get(chiave);
  if (gia) return gia;
  const lavoro = genera(s, l, db).finally(() => inCorso.delete(chiave));
  inCorso.set(chiave, lavoro);
  return lavoro;
}

async function genera(s: SorgenteMiniatura, l: LarghezzaMiniatura, db: AppDatabase): Promise<RispostaMiniatura> {
  const sharp = await generatore();
  if (!sharp) return originale(s, l);
  try {
    // le misure e l'alfa li dice sharp (anche per un formato che `dimensioniImmagine` non conosce); con l'alfa si cerca il riquadro
    // del disegno, e se non c'è niente da ritagliare né da ridurre si serve l'originale
    const meta = await sharp(s.contenuto).metadata();
    const riquadro = meta.hasAlpha ? await riquadroDelDisegno(sharp, s.contenuto, meta.channels) : null;
    if (!riquadro && meta.width !== undefined && l >= meta.width) return originale(s, l);
    const sorgente = sharp(s.contenuto);
    if (riquadro) sorgente.extract(riquadro);
    const { data, info } = await sorgente
      .resize({ width: l, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    // si scrive solo se la sorgente è ancora quella: sostituita nel frattempo, questa miniatura non è più di nessuno
    db.prepare(`INSERT INTO immagine_miniatura (immagine_id, larghezza, versione, mime, byte, larghezza_reale, altezza_reale, contenuto, created_at)
      SELECT ?, ?, ?, 'image/webp', ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM immagine WHERE id = ? AND created_at = ?)
      ON CONFLICT(immagine_id, larghezza) DO UPDATE SET versione = excluded.versione, mime = excluded.mime, byte = excluded.byte,
        larghezza_reale = excluded.larghezza_reale, altezza_reale = excluded.altezza_reale, contenuto = excluded.contenuto, created_at = excluded.created_at`)
      .run(s.id, l, versioneMiniatura(s.createdAt), data.length, info.width, info.height, data, nowIso(), s.id, s.createdAt);
    return { contenuto: data, mime: 'image/webp', etag: etagMiniatura(s, l), esito: 'generata' };
  } catch (err) {
    const quale = `${s.id}|${s.createdAt}`;
    if (!fallite.has(quale)) {
      fallite.add(quale);
      logger.warn({ err, immagine: s.id, larghezza: l }, 'miniature: generazione fallita, si serve l’originale');
    }
    return originale(s, l);
  }
}

/**
 * Il riquadro del disegno di un'immagine con l'alfa (UX2-13): il rettangolo dei pixel con opacità sopra `SOGLIA_ALFA`, allargato
 * del bordo e tenuto dentro la tela. Null se non c'è niente da ritagliare: tela tutta trasparente (si riduce intera) o disegno che
 * col bordo arriva già ai lati. Il canale alfa è l'ultimo (RGBA, scala di grigi con alfa, tavolozza con trasparenza); a 16 bit
 * conta il byte alto.
 */
async function riquadroDelDisegno(sharp: Generatore, contenuto: Buffer, canali: number | undefined): Promise<{ left: number; top: number; width: number; height: number } | null> {
  const ultimo = Math.min(3, Math.max(1, (canali ?? 4) - 1)) as 1 | 2 | 3;
  const { data, info } = await sharp(contenuto).extractChannel(ultimo).raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const passo = data.length / (w * h);
  const alto = passo - 1;
  let minX = w; let minY = h; let maxX = -1; let maxY = -1;
  for (let y = 0; y < h; y++) {
    const riga = y * w;
    let primo = -1;
    for (let x = 0; x < w; x++) if (data[(riga + x) * passo + alto] > SOGLIA_ALFA) { primo = x; break; }
    if (primo < 0) continue;
    let ultimo = primo;
    for (let x = w - 1; x > primo; x--) if (data[(riga + x) * passo + alto] > SOGLIA_ALFA) { ultimo = x; break; }
    if (primo < minX) minX = primo;
    if (ultimo > maxX) maxX = ultimo;
    if (y < minY) minY = y;
    maxY = y;
  }
  if (maxX < 0) return null;
  const bordo = Math.max(BORDO_MINIMO, Math.round(Math.max(maxX - minX + 1, maxY - minY + 1) * BORDO_RITAGLIO));
  const left = Math.max(0, minX - bordo);
  const top = Math.max(0, minY - bordo);
  const right = Math.min(w - 1, maxX + bordo);
  const bottom = Math.min(h - 1, maxY + bordo);
  if (left === 0 && top === 0 && right === w - 1 && bottom === h - 1) return null;
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

/** Toglie le miniature di un'immagine (prima di sostituirla: l'`ON CONFLICT DO UPDATE` conserva l'id, e la cascata non scatta). */
export function eliminaMiniatureDi(db: AppDatabase, ambito: string, chiave: string): void {
  if (!conMiniature(db)) return;
  db.prepare('DELETE FROM immagine_miniatura WHERE immagine_id IN (SELECT id FROM immagine WHERE ambito = ? AND chiave = ?)').run(ambito, chiave);
}

/**
 * Toglie le miniature orfane o stantie: della riga d'immagine che non c'è più, di un'altra versione o di un'altra generazione
 * dell'algoritmo (`versioneMiniatura`), o di una sorgente rimasta senza contenuto (il pacchetto iniziale). Si fa all'avvio, con le
 * altre regole sui dati, e dopo una ricarica del pacchetto.
 */
export function pulisciMiniatureOrfane(db: AppDatabase): number {
  if (!conMiniature(db)) return 0;
  return db.prepare(`DELETE FROM immagine_miniatura WHERE NOT EXISTS (SELECT 1 FROM immagine i
    WHERE i.id = immagine_miniatura.immagine_id AND i.created_at || '~' || ? = immagine_miniatura.versione AND i.contenuto IS NOT NULL)`).run(GENERAZIONE_MINIATURE).changes;
}

/** Le misure che le schede chiedono (riquadri da ~128 px a densità 1 e 2): quelle che il riscaldamento prepara. */
const MISURE_SCHEDE: readonly LarghezzaMiniatura[] = [160, 320];

/**
 * Le immagini delle schede: l'illustrazione di Tokyo, dei quartieri e delle radici dei Palazzi e dei Memento (la caricata; per città
 * e quartieri senza caricata l'asset dichiarato), e le miniature caricate delle carte dei Palazzi, dei Dedali e delle loro aree (O9-5), come
 * (ambito, chiave).
 */
export function immaginiDelleSchede(db: AppDatabase = getDb()): Array<{ ambito: string; chiave: string }> {
  const caricate = immaginiCaricateDelleMappe(db);
  const righe = db.prepare(`SELECT chiave, immagine_chiave, asset, tipo FROM mappa
    WHERE tipo IN ('citta', 'quartiere') OR (genitore_chiave IS NULL AND tipo IN ('palazzo', 'dedalo')) ORDER BY chiave`).all() as
    Array<{ chiave: string; immagine_chiave: string | null; asset: string | null; tipo: string }>;
  const fuori: Array<{ ambito: string; chiave: string }> = [];
  for (const r of righe) {
    const c = caricataDellaMappa(r, caricate);
    if (c) { fuori.push({ ambito: 'mappa', chiave: c.chiave }); continue; }
    const i = r.asset ? r.asset.indexOf('/') : -1;
    if ((r.tipo === 'citta' || r.tipo === 'quartiere') && r.asset && i > 0) fuori.push({ ambito: r.asset.slice(0, i), chiave: r.asset.slice(i + 1) });
  }
  // le miniature caricate delle carte dei Palazzi, dei Dedali e delle loro aree nella pagina Luoghi (O9-5)
  for (const chiave of immaginiCaricateDi(AMBITO_MINIATURA_LUOGO, db).keys()) fuori.push({ ambito: AMBITO_MINIATURA_LUOGO, chiave });
  return fuori;
}

/** Vero se l'immagine (ambito, chiave) è fra quelle delle schede: solo per loro il caricamento fa partire il riscaldamento. */
export function eDelleSchede(ambito: string, chiave: string, db: AppDatabase = getDb()): boolean {
  return immaginiDelleSchede(db).some((i) => i.ambito === ambito && i.chiave === chiave);
}

/**
 * Prepara le miniature delle immagini date (di default quelle delle schede) alle misure delle schede, una alla volta e senza mai
 * sollevare: il lavoro gira in background e non deve fermare nient'altro. Restituisce quante ne ha generate e in quanto tempo.
 */
export async function riscaldaMiniature(immagini?: Array<{ ambito: string; chiave: string }>, dbDato?: AppDatabase): Promise<{ immagini: number; generate: number; ms: number }> {
  const inizio = Date.now();
  let generate = 0; let n = 0;
  try {
    // anche il database si prende qui dentro: un riscaldamento partito tardi (a connessione chiusa) finisce senza errori
    const db = dbDato ?? getDb();
    if (!conMiniature(db)) return { immagini: 0, generate: 0, ms: 0 };
    const elenco = immagini ?? immaginiDelleSchede(db);
    for (const { ambito, chiave } of elenco) {
      // R12-03: prima i soli metadati (`contenuto IS NULL` non carica il contenuto) e la cache: a ogni avvio le immagini già calde non
      // si rileggono per intero (diversi MB ciascuna) per scoprire che non c'è niente da fare
      const meta = db.prepare('SELECT id, mime, byte, created_at, contenuto IS NULL AS senza FROM immagine WHERE ambito = ? AND chiave = ?').get(ambito, chiave) as
        { id: number; mime: string; byte: number; created_at: string; senza: number } | undefined;
      if (!meta || meta.senza) continue;
      n++;
      const m: MetadatiMiniatura = { id: meta.id, mime: meta.mime, byte: meta.byte, createdAt: meta.created_at };
      // SVG e GIF non hanno mai una miniatura (né una riga in cache): senza questo salto `every` sarebbe sempre falso e ad ogni avvio
      // il loro contenuto, anche di megabyte, si leggerebbe per intero prima di scoprire che non c'è niente da generare
      if (SENZA_MINIATURA.has(meta.mime)) continue;
      if (MISURE_SCHEDE.every((l) => miniaturaInCache(m, l, db) !== null)) continue;
      const r = db.prepare('SELECT contenuto FROM immagine WHERE id = ?').get(meta.id) as { contenuto: Buffer | null } | undefined;
      if (!r?.contenuto) continue;
      for (const l of MISURE_SCHEDE) {
        const esito = await miniaturaDi({ ...m, contenuto: r.contenuto }, l, db);
        if (esito.esito === 'generata') generate++;
      }
    }
  } catch (err) {
    logger.warn({ err }, 'miniature: riscaldamento interrotto');
  }
  const ms = Date.now() - inizio;
  if (generate > 0 || immagini === undefined) logger.info({ immagini: n, generate, ms }, 'miniature delle schede pronte');
  return { immagini: n, generate, ms };
}

/** Le larghezze ammesse, per i messaggi d'errore. */
export const MISURE_AMMESSE = LARGHEZZE_MINIATURA.join(', ');
