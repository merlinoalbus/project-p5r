// ============================================================
// miniatureService — le miniature WebP delle immagini del database (L1, variante «miniature», 2026-10-21)
// ============================================================
//
// La rotta del file di un'immagine con `l` (una delle `LARGHEZZE_MINIATURA`) passa da qui: la miniatura si genera la prima volta
// che serve, con sharp (libvips), e si tiene in `immagine_miniatura` (migrazione 108) legata alla versione della sorgente
// (`immagine.created_at`). Le regole:
//   - formato WebP, qualità 80, `effort` 4, alfa conservato, metadati tolti, proporzioni mantenute e mai ingrandita;
//   - si risponde con l'**originale** per SVG e GIF, quando `l` non riduce (la sorgente non è più larga), e quando il generatore
//     non c'è o fallisce (un `warn` per immagine, mai un 500 per una miniatura): l'app resta utilizzabile;
//   - **coalescenza**: richieste contemporanee della stessa miniatura aspettano la stessa generazione, e la riga si scrive una volta;
//   - la riga si scrive solo se la sorgente è ancora quella (un'immagine sostituita durante la generazione non riceve la miniatura
//     della vecchia); una riga di un'altra versione non vale e si rigenera;
//   - **riscaldamento** in background (dopo l'avvio, e dopo il caricamento dell'immagine di una mappa): le illustrazioni delle schede
//     alle misure delle schede, così la prima apertura de La città dal telefono non aspetta la generazione.
// Il servizio non dipende dagli altri servizi delle immagini (solo dal database e dai condivisi): `immaginiService` lo usa.
// ============================================================

import type { Sharp, SharpOptions } from 'sharp';
import { getDb, nowIso, type AppDatabase } from '../db/dbService.js';
import { logger } from '../utils/logger.js';
import { LARGHEZZE_MINIATURA, type LarghezzaMiniatura } from '../../shared/miniature.js';
import { caricataDellaMappa, dimensioniImmagine, immaginiCaricateDelleMappe } from './mappe/immagineMappa.js';

/** La sorgente di una miniatura: la riga dell'immagine col suo contenuto (quella che la rotta del file ha appena letto). */
export interface SorgenteMiniatura { id: number; contenuto: Buffer; mime: string; byte: number; createdAt: string }

/** Che cosa risponde la rotta: la miniatura (generata ora o dalla cache) oppure l'originale. */
export interface RispostaMiniatura { contenuto: Buffer; mime: string; etag: string; esito: 'generata' | 'cache' | 'originale' }

/** Il generatore: una funzione `sharp(input)`, o null se il modulo nativo non si carica. */
type Generatore = (input: Buffer, opzioni?: SharpOptions) => Sharp;

/** Formati che non si riducono: vettoriali (SVG) o animati (GIF), si serve l'originale. */
const SENZA_MINIATURA = new Set(['image/svg+xml', 'image/gif']);

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

/** L'ETag della risposta con `l`: quello del file più la larghezza, così ogni misura ha il suo. */
function etagDi(s: SorgenteMiniatura, l: LarghezzaMiniatura): string {
  return `"${s.id}-${s.byte}-${s.createdAt}-l${l}"`;
}

function originale(s: SorgenteMiniatura, l: LarghezzaMiniatura): RispostaMiniatura {
  return { contenuto: s.contenuto, mime: s.mime, etag: etagDi(s, l), esito: 'originale' };
}

/** Vero se la tabella delle miniature c'è (dalla 108; i test su uno schema di prima non l'hanno). */
function conMiniature(db: AppDatabase): boolean {
  return !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'immagine_miniatura'").get();
}

/**
 * La miniatura larga `l` della sorgente: dalla cache se c'è per la sua versione, altrimenti generata e scritta; l'originale nei
 * casi dell'intestazione. Non solleva mai per un problema del generatore.
 */
export async function miniaturaDi(s: SorgenteMiniatura, l: LarghezzaMiniatura, db: AppDatabase = getDb()): Promise<RispostaMiniatura> {
  if (SENZA_MINIATURA.has(s.mime) || !conMiniature(db)) return originale(s, l);
  const dim = dimensioniImmagine(s.contenuto);
  if (dim && l >= dim.larghezza) return originale(s, l);
  const inCache = db.prepare('SELECT mime, contenuto FROM immagine_miniatura WHERE immagine_id = ? AND larghezza = ? AND versione = ?').get(s.id, l, s.createdAt) as
    { mime: string; contenuto: Buffer } | undefined;
  if (inCache) return { contenuto: inCache.contenuto, mime: inCache.mime, etag: etagDi(s, l), esito: 'cache' };
  const chiave = `${s.id}|${s.createdAt}|${l}`;
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
    // intestazione non letta da `dimensioniImmagine` (un formato che non conosce): la larghezza la dice sharp, e se non c'è niente
    // da ridurre si serve l'originale
    if (dimensioniImmagine(s.contenuto) === null) {
      const larghezza = (await sharp(s.contenuto).metadata()).width;
      if (larghezza !== undefined && l >= larghezza) return originale(s, l);
    }
    const { data, info } = await sharp(s.contenuto)
      .resize({ width: l, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    // si scrive solo se la sorgente è ancora quella: sostituita nel frattempo, questa miniatura non è più di nessuno
    db.prepare(`INSERT INTO immagine_miniatura (immagine_id, larghezza, versione, mime, byte, larghezza_reale, altezza_reale, contenuto, created_at)
      SELECT ?, ?, ?, 'image/webp', ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM immagine WHERE id = ? AND created_at = ?)
      ON CONFLICT(immagine_id, larghezza) DO UPDATE SET versione = excluded.versione, mime = excluded.mime, byte = excluded.byte,
        larghezza_reale = excluded.larghezza_reale, altezza_reale = excluded.altezza_reale, contenuto = excluded.contenuto, created_at = excluded.created_at`)
      .run(s.id, l, s.createdAt, data.length, info.width, info.height, data, nowIso(), s.id, s.createdAt);
    return { contenuto: data, mime: 'image/webp', etag: etagDi(s, l), esito: 'generata' };
  } catch (err) {
    const quale = `${s.id}|${s.createdAt}`;
    if (!fallite.has(quale)) {
      fallite.add(quale);
      logger.warn({ err, immagine: s.id, larghezza: l }, 'miniature: generazione fallita, si serve l’originale');
    }
    return originale(s, l);
  }
}

/** Toglie le miniature di un'immagine (prima di sostituirla: l'`ON CONFLICT DO UPDATE` conserva l'id, e la cascata non scatta). */
export function eliminaMiniatureDi(db: AppDatabase, ambito: string, chiave: string): void {
  if (!conMiniature(db)) return;
  db.prepare('DELETE FROM immagine_miniatura WHERE immagine_id IN (SELECT id FROM immagine WHERE ambito = ? AND chiave = ?)').run(ambito, chiave);
}

/**
 * Toglie le miniature orfane o stantie: della riga d'immagine che non c'è più, di un'altra versione, o di una sorgente rimasta senza
 * contenuto (il pacchetto iniziale). Si fa all'avvio, con le altre regole sui dati, e dopo una ricarica del pacchetto.
 */
export function pulisciMiniatureOrfane(db: AppDatabase): number {
  if (!conMiniature(db)) return 0;
  return db.prepare(`DELETE FROM immagine_miniatura WHERE NOT EXISTS (SELECT 1 FROM immagine i
    WHERE i.id = immagine_miniatura.immagine_id AND i.created_at = immagine_miniatura.versione AND i.contenuto IS NOT NULL)`).run().changes;
}

/** Le misure che le schede chiedono (riquadri da ~128 px a densità 1 e 2): quelle che il riscaldamento prepara. */
const MISURE_SCHEDE: readonly LarghezzaMiniatura[] = [160, 320];

/**
 * Le immagini delle schede: l'illustrazione di Tokyo, dei quartieri e delle radici dei Palazzi e dei Memento (la caricata; per città
 * e quartieri senza caricata l'asset dichiarato), come (ambito, chiave).
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
      const r = db.prepare('SELECT id, mime, byte, created_at, contenuto FROM immagine WHERE ambito = ? AND chiave = ?').get(ambito, chiave) as
        { id: number; mime: string; byte: number; created_at: string; contenuto: Buffer | null } | undefined;
      if (!r?.contenuto) continue;
      n++;
      for (const l of MISURE_SCHEDE) {
        const esito = await miniaturaDi({ id: r.id, contenuto: r.contenuto, mime: r.mime, byte: r.byte, createdAt: r.created_at }, l, db);
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
