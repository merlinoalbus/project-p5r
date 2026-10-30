// ============================================================
// Migrazione 309 — dialoghi di rango: punti solo numerici (con il ramo amore), note senza i requisiti ripetuti
// ============================================================
//
// L13, ondata 6, lotto O6-4 (istruzione dell'utente: «completa il lavoro rimasto fermo... le ondate mancanti e tutto quanto non ancora gestito
// rispetto all'obiettivo»). Le scelte di `confidente_dialogo` avevano i punti due volte: `punti` (numero) e `puntiTesto` («+3», «♪♪», «+0
// (amicizia) / +2 (amore)»), e l'interfaccia decideva sul testo se una scelta si poteva toccare. Le note di molti dialoghi ripetevano
// requisiti di rango, pioggia, date e Doti già strutturati. Da qui un dato in un punto:
//   (1) scelte — `puntiTesto` esce: tolto dove è vuoto o dice lo stesso numero di `punti` («+N» o N volte ♪, senza perdita); le poche
//       scelte con un testo diverso sono un elenco CHIUSO nel file dati (`conversioniScelte`: le 4 di Makoto rango 10 → `punti` 0 e
//       `puntiAmore` 2; «0 (da evitare)» di Maruki rango 8 → `punti` 0 e l'avviso «Da evitare», se l'avviso è vuoto); ogni altra combinazione
//       resta com'è ed è nell'audit. Vale per le righe e per le fotografie di «Ripristina» (`dati_guida` `confidente-seed-v1:dialogo:<id>`),
//       perché il ripristino restituisca il dato già convertito.
//   (2) note — elenco CHIUSO scritto a mano (`dati/309-note-dialoghi.json`, letto il 2026-10-30 su una copia portata alla 308): per ogni
//       dialogo la nota di oggi (`atteso`), quella nuova e le frasi tolte, ciascuna con le sedi che la rendono (requisito di rango, Dote a
//       ogni incontro, note della disponibilità), controllate una per una; se una manca, la nota resta. La nota si scrive solo se la riga ha
//       ancora il testo atteso (un testo diverso è dell'utente: saltata); la fotografia di «Ripristina» con il testo atteso prende il nuovo.
//   (3) requisiti — dove la guida italiana Royal documenta un vincolo che la nota diceva e i requisiti non avevano (`requisitiNuovi`, con
//       fonte e citazione: Ryuji rango 3, «Dopo aver completato il Palazzo di Kamoshida»), il requisito si aggiunge in fondo al rango, nei
//       requisiti e nella loro copia della guida, solo se entrambi hanno ancora esattamente i requisiti attesi.
// Le partite non si toccano (le note registrate negli incontri restano). Idempotente: la seconda volta non trova niente da fare e non
// scrive. Audit in `dati_guida.audit-309-dialoghi`. Solo `main`.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-309-dialoghi';
const RICHIESTA = '2026-10-30: «completa il lavoro rimasto fermo... le ondate mancanti e tutto quanto non ancora gestito rispetto all’obiettivo» (L13, ondata 6, lotto O6-4)';
const FILE_DATI = '309-note-dialoghi.json';
const FOTOGRAFIA = 'confidente-seed-v1:dialogo:';
const QUI = path.dirname(fileURLToPath(import.meta.url));
const errore = (motivo: string): never => { throw new Error(`309: ${motivo}; nessuna modifica applicata.`); };

type Dati = Record<string, unknown>;
type Resa = { requisito: { rango: number; tipo: string; dati: Dati } } | { doteIncontro: { versoRango: number; dote: string; note: number } } | { disponibilita: string };
interface Voce { id: number; confidente: string; rango: number; atteso: string; nuovo: string; tolte: Array<{ frase: string; rese: Resa[]; nota?: string }> }
interface Conversione { confidente: string; rango: number; puntiTesto: string; punti: number | null; dopo: { punti: number; puntiAmore?: number; avviso?: string } }
interface RequisitoNuovo { confidente: string; rango: number; attesi: Array<{ tipo: string; dati: Dati }>; nuovo: { tipo: string; dati: Dati; testo: string }; fonte: string; citazione: string }
interface FileDati { voci: Voce[]; conversioniScelte: Conversione[]; requisitiNuovi: RequisitoNuovo[] }

/** Il file dati, cercato accanto al codice e nei sorgenti (sviluppo e immagine del server). */
function leggiFile(): FileDati {
  for (const p of [path.join(QUI, 'dati', FILE_DATI), path.join(process.cwd(), 'server', 'db', 'migrations', 'dati', FILE_DATI)]) {
    if (fs.existsSync(p)) {
      const v = JSON.parse(fs.readFileSync(p, 'utf8')) as Partial<FileDati>;
      if (!Array.isArray(v.voci) || v.voci.length === 0 || !Array.isArray(v.conversioniScelte) || !Array.isArray(v.requisitiNuovi)) errore(`il file ${FILE_DATI} non è completo`);
      return v as FileDati;
    }
  }
  return errore(`manca il file server/db/migrations/dati/${FILE_DATI}`);
}

/** JSON canonico (chiavi in ordine): per confrontare i dati dei requisiti senza badare all'ordine delle chiavi. */
function canonico(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonico).join(',')}]`;
  if (v !== null && typeof v === 'object') return `{${Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => `${JSON.stringify(k)}:${canonico(x)}`).join(',')}}`;
  return JSON.stringify(v);
}
const canonicoJson = (testo: string): string | null => { try { return canonico(JSON.parse(testo)); } catch { return null; } };

// ---- (1) le scelte ----

type EsitoScelta = { dove: string; ordine: unknown; testo: unknown; punti: unknown; puntiTesto: unknown; esito: string };

/** Il numero che un `puntiTesto` dice da sé: «+N» o N volte ♪ (null se dice altro). */
function numeroDelTesto(t: string): number | null {
  const piu = /^\+(\d)$/u.exec(t);
  if (piu) return Number(piu[1]);
  return /^♪{1,3}$/u.test(t) ? t.length : null;
}

/** Le scelte di un JSON convertite; `cambiate` = quante. Una scelta che non si converte resta com'è (con il suo `puntiTesto`) e va nell'audit. */
function convertiScelte(json: string, confidente: string, rango: number | null, dove: string, conversioni: Conversione[], esiti: EsitoScelta[]): { json: string; cambiate: number } | null {
  let v: unknown;
  try { v = JSON.parse(json); } catch { esiti.push({ dove, ordine: null, testo: null, punti: null, puntiTesto: null, esito: 'scelte illeggibili: non toccate' }); return null; }
  if (!Array.isArray(v)) { esiti.push({ dove, ordine: null, testo: null, punti: null, puntiTesto: null, esito: 'scelte non in elenco: non toccate' }); return null; }
  let cambiate = 0;
  const dopo = v.map((s: unknown) => {
    if (!s || typeof s !== 'object' || !('puntiTesto' in s)) return s;
    const x = s as Dati;
    const { puntiTesto, ...resto } = x;
    const base = { dove, ordine: x.ordine, testo: x.testo, punti: x.punti, puntiTesto };
    if (puntiTesto === null || puntiTesto === undefined || puntiTesto === '') { cambiate++; return resto; }
    if (typeof puntiTesto !== 'string') { esiti.push({ ...base, esito: 'testo dei punti non testuale: lasciato' }); return s; }
    const n = numeroDelTesto(puntiTesto);
    if (n !== null && x.punti === n) { cambiate++; return resto; }
    const c = conversioni.find((k) => k.confidente === confidente && k.rango === rango && k.puntiTesto === puntiTesto && k.punti === (x.punti ?? null));
    if (c) {
      if (c.dopo.avviso !== undefined && x.avviso !== null && x.avviso !== undefined && x.avviso !== '') { esiti.push({ ...base, esito: `l’avviso c’è già («${String(x.avviso)}»): lasciato` }); return s; }
      cambiate++;
      esiti.push({ ...base, esito: `convertita: punti ${c.dopo.punti}${c.dopo.puntiAmore !== undefined ? `, ramo amore ${c.dopo.puntiAmore}` : ''}${c.dopo.avviso !== undefined ? `, avviso «${c.dopo.avviso}»` : ''}` });
      return { ...resto, punti: c.dopo.punti, ...(c.dopo.puntiAmore !== undefined ? { puntiAmore: c.dopo.puntiAmore } : {}), ...(c.dopo.avviso !== undefined ? { avviso: c.dopo.avviso } : {}) };
    }
    esiti.push({ ...base, esito: 'testo dei punti diverso dal numero e fuori dall’elenco delle conversioni: lasciato' });
    return s;
  });
  return cambiate > 0 ? { json: JSON.stringify(dopo), cambiate } : null;
}

// ---- (3) i requisiti nuovi ----

type RigaReq = { indice: number; tipo: string; dati_json: string };
const firmaAttesa = (l: RequisitoNuovo['attesi']): string => JSON.stringify(l.map((r) => [r.tipo, canonico(r.dati)]));
const firmaRighe = (l: RigaReq[]): string => JSON.stringify(l.map((r) => [r.tipo, canonicoJson(r.dati_json)]));

function requisitoNuovo(db: AppDatabase, r: RequisitoNuovo, conGuida: boolean): { esito: string; scritto: boolean } {
  const tabelle = conGuida ? ['confidente_requisito', 'confidente_requisito_guida'] as const : ['confidente_requisito'] as const;
  const righe = tabelle.map((t) => db.prepare(`SELECT indice, tipo, dati_json FROM main.${t} WHERE confidente_chiave = ? AND rango = ? ORDER BY indice`).all(r.confidente, r.rango) as RigaReq[]);
  const nuovo = JSON.stringify([r.nuovo.tipo, canonico(r.nuovo.dati)]);
  const haNuovo = righe.map((l) => l.some((x) => JSON.stringify([x.tipo, canonicoJson(x.dati_json)]) === nuovo));
  if (haNuovo.every(Boolean)) return { esito: 'già presente', scritto: false };
  if (righe.some((l, i) => !haNuovo[i] && firmaRighe(l) !== firmaAttesa(r.attesi))) return { esito: 'requisiti del rango diversi da quelli attesi (cambiati dall’utente?): non aggiunto', scritto: false };
  if (haNuovo.some(Boolean)) return { esito: 'presente in una sola delle due tabelle: non aggiunto', scritto: false };
  tabelle.forEach((t, i) => {
    const indice = Math.max(-1, ...righe[i]!.map((x) => x.indice)) + 1;
    if (db.prepare(`INSERT INTO main.${t} (confidente_chiave, rango, indice, tipo, dati_json, testo) VALUES (?, ?, ?, ?, ?, ?)`).run(r.confidente, r.rango, indice, r.nuovo.tipo, JSON.stringify(r.nuovo.dati), r.nuovo.testo).changes !== 1) {
      errore(`il requisito nuovo di ${r.confidente} rango ${r.rango} non si scrive in ${t}`);
    }
  });
  return { esito: `aggiunto in fondo al rango (${tabelle.join(' e ')}): ${r.nuovo.testo}`, scritto: true };
}

// ---- (2) le note ----

/** Una sede di una frase tolta c'è ancora? */
function sedePresente(db: AppDatabase, confidente: string, s: Resa): boolean {
  if ('requisito' in s) {
    const righe = db.prepare('SELECT dati_json FROM main.confidente_requisito WHERE confidente_chiave = ? AND rango = ? AND tipo = ?').pluck().all(confidente, s.requisito.rango, s.requisito.tipo) as string[];
    return righe.some((j) => canonicoJson(j) === canonico(s.requisito.dati));
  }
  if ('doteIncontro' in s) {
    if (!esisteTabella(db, 'confidente_dote_incontro')) return false;
    const j = db.prepare('SELECT effetti_json FROM main.confidente_dote_incontro WHERE confidente_chiave = ? AND verso_rango = ?').pluck().get(confidente, s.doteIncontro.versoRango) as string | undefined;
    if (!j) return false;
    try {
      const effetti = JSON.parse(j) as Array<{ effetto?: { famiglia?: unknown; dote?: unknown; note?: unknown } }>;
      return Array.isArray(effetti) && effetti.some((e) => e.effetto?.famiglia === 'dote' && e.effetto.dote === s.doteIncontro.dote && e.effetto.note === s.doteIncontro.note);
    } catch { return false; }
  }
  const nota = db.prepare('SELECT note FROM main.confidente_disponibilita WHERE confidente_chiave = ?').pluck().get(confidente) as string | undefined;
  return typeof nota === 'string' && nota.includes(s.disponibilita);
}

type EsitoNota = { id: number; confidente: string; rango: number; esito: string; prima?: string; dopo?: string; tolte?: Voce['tolte'] };

/** Una fotografia di «Ripristina» letta (oggetto con note e scelte), o null se non si legge. */
type Fotografia = Record<string, unknown> & { note?: unknown; scelte_json?: unknown };
function leggiFotografia(testo: string | undefined): Fotografia | null {
  if (testo === undefined) return null;
  try { const v: unknown = JSON.parse(testo); return v && typeof v === 'object' && !Array.isArray(v) ? v as Fotografia : null; } catch { return null; }
}

function nota(db: AppDatabase, v: Voce): { esito: EsitoNota | null; scritte: number } {
  const base = { id: v.id, confidente: v.confidente, rango: v.rango };
  const r = db.prepare('SELECT note FROM main.confidente_dialogo WHERE id = ? AND confidente_chiave = ? AND rango = ?').get(v.id, v.confidente, v.rango) as { note: string } | undefined;
  if (!r) return { esito: { ...base, esito: 'dialogo assente (id, Confidente o rango diversi): niente da fare' }, scritte: 0 };
  const chiaveFoto = FOTOGRAFIA + String(v.id);
  const fotoTesto = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(chiaveFoto) as string | undefined;
  const foto = leggiFotografia(fotoTesto);
  const rigaDaFare = r.note === v.atteso;
  const fotoDaFare = !!foto && foto.note === v.atteso;
  if (!rigaDaFare && !fotoDaFare) {
    if (r.note === v.nuovo) return { esito: null, scritte: 0 };
    return { esito: { ...base, esito: 'nota diversa da quella attesa (cambiata dall’utente o già toccata): saltata', prima: r.note }, scritte: 0 };
  }
  const mancanti = v.tolte.flatMap((t) => t.rese.filter((s) => !sedePresente(db, v.confidente, s)).map((s) => ({ frase: t.frase, sede: s })));
  if (mancanti.length > 0) return { esito: { ...base, esito: `una sede delle frasi da togliere non c’è più: nota non toccata (${JSON.stringify(mancanti)})`, prima: r.note }, scritte: 0 };
  let scritte = 0;
  if (rigaDaFare) {
    if (db.prepare('UPDATE main.confidente_dialogo SET note = ? WHERE id = ? AND note = ?').run(v.nuovo, v.id, v.atteso).changes !== 1) errore(`la nota del dialogo ${v.id} non si scrive`);
    scritte++;
  }
  if (fotoDaFare && foto && fotoTesto !== undefined) {
    if (db.prepare('UPDATE main.dati_guida SET json = ? WHERE chiave = ? AND json = ?').run(JSON.stringify({ ...foto, note: v.nuovo }), chiaveFoto, fotoTesto).changes !== 1) errore(`la fotografia del dialogo ${v.id} non si scrive`);
    scritte++;
  }
  const dove = rigaDaFare && fotoDaFare ? 'riga e fotografia di «Ripristina»' : rigaDaFare ? 'riga' : 'solo fotografia di «Ripristina» (la riga ha una nota dell’utente e resta)';
  return { esito: { ...base, esito: `nota senza le frasi già rese (${dove})`, prima: v.atteso, dopo: v.nuovo, tolte: v.tolte }, scritte };
}

/** L'audit: la prima esecuzione sempre, le successive solo se hanno cambiato qualcosa. */
function scriviAudit(db: AppDatabase, esecuzione: Record<string, unknown>, daDire: boolean): void {
  const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(AUDIT) as string | undefined;
  if (vecchio && !daDire) return;
  let esecuzioni: unknown[] = [];
  if (vecchio) { try { const v = JSON.parse(vecchio) as { esecuzioni?: unknown }; esecuzioni = Array.isArray(v.esecuzioni) ? v.esecuzioni : []; } catch { esecuzioni = []; } }
  db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
    .run(AUDIT, JSON.stringify({
      migrazione: 309, richiesta: RICHIESTA, file: `server/db/migrations/dati/${FILE_DATI}`,
      regola: 'puntiTesto tolto se vuoto o uguale al numero dei punti; conversioni solo dall’elenco chiuso del file dati; note sostituite col testo curato solo se uguali a quello atteso e con tutte le sedi delle frasi tolte presenti; fotografie di «Ripristina» con la stessa regola; requisiti nuovi solo su ranghi con i requisiti attesi; le partite non si toccano',
      esecuzioni: [...esecuzioni, { il: new Date().toISOString(), ...esecuzione }],
    }));
}

export const migration309: Migration = {
  id: 309,
  name: 'dialoghi_di_rango_strutturati',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['confidente_dialogo', 'confidente_requisito', 'confidente_disponibilita', 'dati_guida']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 309, tabella: t }, 'tabella assente: niente da fare'); return; }
    }
    const file = leggiFile();
    const conGuida = esisteTabella(db, 'confidente_requisito_guida');

    // (3) prima i requisiti nuovi: le note che li ripetevano li trovano come sede
    const requisiti = file.requisitiNuovi.map((r) => ({ confidente: r.confidente, rango: r.rango, fonte: r.fonte, citazione: r.citazione, ...requisitoNuovo(db, r, conGuida) }));

    // (1) le scelte, nelle righe e nelle fotografie di «Ripristina»
    const esitiScelte: EsitoScelta[] = [];
    let scelteConvertite = 0;
    let righeScelte = 0;
    for (const d of db.prepare('SELECT id, confidente_chiave, rango, scelte_json FROM main.confidente_dialogo ORDER BY id').all() as Array<{ id: number; confidente_chiave: string; rango: number | null; scelte_json: string }>) {
      const c = convertiScelte(d.scelte_json, d.confidente_chiave, d.rango, `dialogo ${d.id}`, file.conversioniScelte, esitiScelte);
      if (!c) continue;
      if (db.prepare('UPDATE main.confidente_dialogo SET scelte_json = ? WHERE id = ? AND scelte_json = ?').run(c.json, d.id, d.scelte_json).changes !== 1) errore(`le scelte del dialogo ${d.id} non si scrivono`);
      scelteConvertite += c.cambiate; righeScelte++;
    }
    let fotografieScelte = 0;
    for (const f of db.prepare('SELECT chiave, json FROM main.dati_guida WHERE chiave LIKE ? ORDER BY chiave').all(`${FOTOGRAFIA}%`) as Array<{ chiave: string; json: string }>) {
      const id = Number(f.chiave.slice(FOTOGRAFIA.length));
      const foto = leggiFotografia(f.json);
      if (!foto || typeof foto.scelte_json !== 'string') { esitiScelte.push({ dove: `fotografia ${f.chiave}`, ordine: null, testo: null, punti: null, puntiTesto: null, esito: 'fotografia illeggibile: non toccata' }); continue; }
      const d = db.prepare('SELECT confidente_chiave, rango FROM main.confidente_dialogo WHERE id = ?').get(id) as { confidente_chiave: string; rango: number | null } | undefined;
      const c = convertiScelte(foto.scelte_json, d?.confidente_chiave ?? '', d?.rango ?? null, `fotografia del dialogo ${id}`, file.conversioniScelte, esitiScelte);
      if (!c) continue;
      if (db.prepare('UPDATE main.dati_guida SET json = ? WHERE chiave = ? AND json = ?').run(JSON.stringify({ ...foto, scelte_json: c.json }), f.chiave, f.json).changes !== 1) errore(`la fotografia ${f.chiave} non si scrive`);
      scelteConvertite += c.cambiate; fotografieScelte++;
    }

    // (2) le note
    const esitiNote: EsitoNota[] = [];
    let noteScritte = 0;
    for (const v of file.voci) {
      const n = nota(db, v);
      if (n.esito) esitiNote.push(n.esito);
      noteScritte += n.scritte;
    }

    const conteggi = {
      requisitiAggiunti: requisiti.filter((r) => r.scritto).length,
      scelteConvertite, righeConScelteCambiate: righeScelte, fotografieConScelteCambiate: fotografieScelte,
      scelteLasciate: esitiScelte.filter((e) => e.esito.includes('lasciat') || e.esito.includes('non toccat')).length,
      noteScritte,
      noteSaltate: esitiNote.filter((e) => e.esito.includes('saltata') || e.esito.includes('non toccata')).length,
    };
    const cambiato = conteggi.requisitiAggiunti + scelteConvertite + noteScritte > 0;
    if (cambiato) invalidaCacheDiGioco();
    scriviAudit(db, { conteggi, requisiti, scelte: esitiScelte, note: esitiNote }, cambiato);
    logger.info({ migrazione: 309, ...conteggi }, 'dialoghi di rango: punti solo numerici, note senza i requisiti ripetuti');
  },
};
