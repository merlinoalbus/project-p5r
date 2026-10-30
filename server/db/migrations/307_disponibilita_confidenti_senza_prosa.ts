// ============================================================
// Migrazione 307 — disponibilità dei Confidenti senza prosa: giorni, fasce, luogo e sblocco escono come fonte; le note senza le frasi già rese
// ============================================================
//
// L13, ondata 6, lotto O6-2 (istruzione dell'utente: «completa il lavoro rimasto fermo... le ondate mancanti e tutto quanto non ancora gestito
// rispetto all'obiettivo»). Le 23 righe di `confidente_disponibilita` dicevano giorni, fasce, luogo, data e requisiti di sblocco due volte: in
// prosa (`giorni_json`, `fasce_json`, `luogo`, `sblocco_data`, `sblocco_requisiti`) e in struttura (modo, `giorni_settimana_json`,
// `fasce_orarie_json`, eccezioni, `dal`, luoghi per chiave da `luogo.confidenti_json`, requisiti di rango). Le note (`note`, `note_generali`)
// ripetevano pioggia, ranghi e Doti dei requisiti. Da qui la sola fonte è la struttura; le note dicono solo ciò che la struttura non dice.
//
// Il dato è un elenco CHIUSO scritto a mano (`dati/307-note-disponibilita.json`, letto il 2026-10-30 su una copia portata alla 306): per ogni
// Confidente il testo di oggi di ogni colonna in prosa e, per le note, il testo nuovo con le frasi tolte e la sede che le rende. Qui non si
// calcola nessun testo. Regole, colonna per colonna (ogni scrittura solo se la riga ha ancora il testo atteso; un testo diverso è dell'utente
// o è già cambiato: la colonna si salta e si dice nell'audit):
//   - `giorni_json` e `fasce_json`: svuotati (`'[]'`) solo se la lettura del file dati coincide con la riga (modo «settimanale» con lo stesso
//     elenco strutturato; il modo stesso con l'elenco strutturato vuoto; per il modo «trama» le stesse date «dal» dei requisiti di rango);
//     dove la prosa dice altro (`diverso` nel file) la colonna resta ed è una divergenza dell'audit;
//   - `luogo`, `sblocco_data`, `sblocco_requisiti`: svuotati se uguali al testo atteso (il valore resta nell'audit);
//   - `note`, `note_generali`: il testo nuovo del file, se la riga ha ancora quello atteso; le frasi tolte vanno nell'audit. Le frasi con un
//     vincolo non strutturato restano (nessun requisito nuovo è aggiunto da questa migrazione).
// Lo storico dell'editor delle informazioni (`dati_guida` `confidente-disponibilita-editor-v1:<chiave>`, oggi solo Makoto) non si riscrive: le
// sue revisioni restano com'erano e se ne aggiunge una, «migrazione», con la riga di prima e quella di dopo, perché lo storico deve finire sulla
// riga corrente. Se lo storico è già incoerente con la riga, la riga si salta. Le partite non si toccano. Idempotente: la seconda volta non
// trova niente da fare e non scrive. Audit in `dati_guida.audit-307-disponibilita-senza-prosa`. Solo `main`.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-307-disponibilita-senza-prosa';
const RICHIESTA = '2026-10-30: «completa il lavoro rimasto fermo... le ondate mancanti e tutto quanto non ancora gestito rispetto all’obiettivo» (L13, ondata 6, lotto O6-2)';
const FILE_DATI = '307-note-disponibilita.json';
const STORICO = 'confidente-disponibilita-editor-v1:';
const QUI = path.dirname(fileURLToPath(import.meta.url));
const errore = (motivo: string): never => { throw new Error(`307: ${motivo}; nessuna modifica applicata.`); };

/** Le otto colonne in prosa della riga, nell'ordine dello storico dell'editor. */
const COLONNE = ['giorni_json', 'fasce_json', 'luogo', 'sblocco_data', 'sblocco_requisiti', 'note', 'note_generali', 'fonti_json'] as const;
type Colonna = typeof COLONNE[number];
type Raw = Record<Colonna, string>;

type Lettura = { settimanale: string[] } | { modo: string } | { dateDeiRequisiti: string[] };
type Elenco = { atteso: string; lettura?: Lettura; diverso?: string };
type Nota = { atteso: string; nuovo: string; tolte: Array<{ frase: string; resaDa: string }> };
interface Voce {
  confidente: string;
  giorni: Elenco; fasce: Elenco;
  luogo: string; sbloccoData: string; sbloccoRequisiti: string;
  note?: Nota; noteGenerali?: Nota;
}
type EsitoColonna = { colonna: Colonna; esito: string; prima?: string; dopo?: string; tolte?: Nota['tolte'] };
type Revisione = { id: number; azione: string; data: string; motivo: string; operazioneId: string; richiesta: string; prima: unknown; dopo: unknown };

/** Il file dati, cercato accanto al codice e nei sorgenti (sviluppo e immagine del server). */
function leggiVoci(): Voce[] {
  for (const p of [path.join(QUI, 'dati', FILE_DATI), path.join(process.cwd(), 'server', 'db', 'migrations', 'dati', FILE_DATI)]) {
    if (fs.existsSync(p)) {
      const v = JSON.parse(fs.readFileSync(p, 'utf8')) as { voci?: unknown };
      if (!Array.isArray(v.voci) || v.voci.length === 0) errore(`il file ${FILE_DATI} non ha voci`);
      return v.voci as Voce[];
    }
  }
  return errore(`manca il file server/db/migrations/dati/${FILE_DATI}`);
}

/** Un elenco di testi letto da un JSON della riga; null se non si legge. */
function elenco(testo: string | null | undefined): string[] | null {
  try { const v: unknown = JSON.parse(testo ?? ''); return Array.isArray(v) && v.every((x) => typeof x === 'string') ? v : null; } catch { return null; }
}
const stessi = (a: string[] | null, b: string[]): boolean => a !== null && a.length === b.length && a.every((x, i) => x === b[i]);

/** La lettura del file dati coincide con la struttura della riga (o coi requisiti di rango, per le date della trama)? */
function letturaCoincide(db: AppDatabase, chiave: string, riga: Record<string, string | null>, colonnaStruttura: 'giorni_settimana_json' | 'fasce_orarie_json', l: Lettura): boolean {
  if ('settimanale' in l) return riga.modo === 'settimanale' && stessi(elenco(riga[colonnaStruttura]), l.settimanale);
  if ('modo' in l) return riga.modo === l.modo && stessi(elenco(riga[colonnaStruttura]), []);
  if (riga.modo !== 'trama') return false;
  const date = (db.prepare("SELECT dati_json FROM main.confidente_requisito WHERE confidente_chiave = ? AND tipo = 'data'").pluck().all(chiave) as string[])
    .map((j) => { try { return (JSON.parse(j) as { dal?: unknown }).dal; } catch { return null; } });
  const uniche = [...new Set(date.filter((d): d is string => typeof d === 'string'))].sort();
  return stessi(uniche, [...l.dateDeiRequisiti].sort());
}

/** Come l'impronta dello storico dell'editor (`disponibilitaConfidentiService`): JSON canonico, SHA-256. */
function canonico(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonico).join(',')}]`;
  if (v !== null && typeof v === 'object') return `{${Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => `${JSON.stringify(k)}:${canonico(x)}`).join(',')}}`;
  return JSON.stringify(v);
}
const impronta = (v: unknown) => createHash('sha256').update(canonico(v)).digest('hex');
const ugualiRaw = (a: unknown, b: Raw): boolean => !!a && typeof a === 'object' && Object.keys(a).length === COLONNE.length
  && COLONNE.every((c) => (a as Record<string, unknown>)[c] === b[c]);

type Registro = Record<string, unknown> & { revisioni: Revisione[]; iniziale: unknown };
/** Lo storico dell'editor della riga, se c'è; `coerente` = finisce sulla riga di adesso (l'editor lo vuole). */
function leggiStorico(db: AppDatabase, chiave: string, raw: Raw): { registro: Registro | null; coerente: boolean } | null {
  const testo = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(STORICO + chiave) as string | undefined;
  if (testo === undefined) return null;
  let v: unknown;
  try { v = JSON.parse(testo); } catch { return { registro: null, coerente: false }; }
  if (!v || typeof v !== 'object' || !Array.isArray((v as Registro).revisioni)) return { registro: null, coerente: false };
  const r = v as Registro;
  const ultima = r.revisioni.length ? r.revisioni[r.revisioni.length - 1]!.dopo : r.iniziale;
  return { registro: r, coerente: ugualiRaw(ultima, raw) };
}

/** Una riga: le colonne da cambiare e l'esito di ognuna. */
function riga(db: AppDatabase, v: Voce, adesso: string): { chiave: string; esiti: EsitoColonna[]; cambiate: number } {
  const chiave = v.confidente;
  const r = db.prepare(`SELECT ${COLONNE.join(', ')}, modo, giorni_settimana_json, fasce_orarie_json FROM main.confidente_disponibilita WHERE confidente_chiave = ?`).get(chiave) as Record<string, string | null> | undefined;
  if (!r) return { chiave, esiti: [{ colonna: 'note', esito: 'riga assente: niente da fare' }], cambiate: 0 };
  if (COLONNE.some((c) => typeof r[c] !== 'string')) return { chiave, esiti: [{ colonna: 'note', esito: 'riga con colonne non testuali: saltata' }], cambiate: 0 };
  const prima = Object.fromEntries(COLONNE.map((c) => [c, r[c] as string])) as Raw;
  const dopo: Raw = { ...prima };
  const esiti: EsitoColonna[] = [];

  const elencoDaSvuotare = (colonna: 'giorni_json' | 'fasce_json', e: Elenco, struttura: 'giorni_settimana_json' | 'fasce_orarie_json') => {
    const attuale = prima[colonna];
    if (attuale === '[]') return;
    if (attuale !== e.atteso) { esiti.push({ colonna, esito: 'testo diverso da quello atteso (cambiato dall’utente o già toccato): saltata', prima: attuale }); return; }
    if (e.diverso !== undefined) { esiti.push({ colonna, esito: `divergenza: la prosa dice altro dalla struttura, resta (${e.diverso})`, prima: attuale }); return; }
    if (!e.lettura || !letturaCoincide(db, chiave, r, struttura, e.lettura)) { esiti.push({ colonna, esito: 'la struttura non coincide più con la lettura del file dati: resta', prima: attuale }); return; }
    dopo[colonna] = '[]';
    esiti.push({ colonna, esito: 'svuotata: la struttura dice gli stessi giorni o fasce', prima: attuale, dopo: '[]' });
  };
  elencoDaSvuotare('giorni_json', v.giorni, 'giorni_settimana_json');
  elencoDaSvuotare('fasce_json', v.fasce, 'fasce_orarie_json');

  for (const [colonna, atteso] of [['luogo', v.luogo], ['sblocco_data', v.sbloccoData], ['sblocco_requisiti', v.sbloccoRequisiti]] as const) {
    const attuale = prima[colonna];
    if (attuale === '') continue;
    if (attuale !== atteso) { esiti.push({ colonna, esito: 'testo diverso da quello atteso (cambiato dall’utente o già toccato): saltata', prima: attuale }); continue; }
    dopo[colonna] = '';
    esiti.push({ colonna, esito: 'svuotata: la dicono i luoghi per chiave e i requisiti di rango', prima: attuale, dopo: '' });
  }

  for (const [colonna, nota] of [['note', v.note], ['note_generali', v.noteGenerali]] as const) {
    if (!nota) continue;
    const attuale = prima[colonna];
    if (attuale === nota.nuovo) continue;
    if (attuale !== nota.atteso) { esiti.push({ colonna, esito: 'testo diverso da quello atteso (cambiato dall’utente o già toccato): saltata', prima: attuale }); continue; }
    dopo[colonna] = nota.nuovo;
    esiti.push({ colonna, esito: 'senza le frasi già rese dalla struttura o dai requisiti', prima: attuale, dopo: nota.nuovo, tolte: nota.tolte });
  }

  const cambiate = COLONNE.filter((c) => dopo[c] !== prima[c]);
  if (cambiate.length === 0) return { chiave, esiti, cambiate: 0 };

  const storico = leggiStorico(db, chiave, prima);
  if (storico && (!storico.coerente || !storico.registro)) {
    return { chiave, esiti: [{ colonna: 'note', esito: 'lo storico dell’editor non finisce sulla riga di adesso: riga saltata, niente cambia' },
      ...esiti.map((e) => ({ colonna: e.colonna, esito: `non applicata (storico incoerente): ${e.esito}`, prima: e.prima }))], cambiate: 0 };
  }
  // ogni colonna si scrive solo se ha ancora il valore di prima (nessuna scrittura fra la lettura e l'aggiornamento)
  const n = db.prepare(`UPDATE main.confidente_disponibilita SET ${cambiate.map((c) => `${c} = ?`).join(', ')} WHERE confidente_chiave = ? AND ${cambiate.map((c) => `${c} = ?`).join(' AND ')}`)
    .run(...cambiate.map((c) => dopo[c]), chiave, ...cambiate.map((c) => prima[c])).changes;
  if (n !== 1) errore(`la riga di ${chiave} non si aggiorna una volta sola`);
  if (storico?.registro) {
    const reg = storico.registro;
    const operazioneId = `migrazione-307-${chiave}`;
    if (reg.revisioni.some((x) => x.operazioneId === operazioneId)) errore(`lo storico di ${chiave} ha già la revisione della 307`);
    reg.revisioni.push({ id: reg.revisioni.length + 1, azione: 'migrazione', data: adesso,
      motivo: 'Migrazione 307: le colonne in prosa della disponibilità escono come fonte (la struttura e i requisiti di rango dicono giorni, fasce, luogo e sblocco); le note senza le frasi già rese.',
      operazioneId, richiesta: impronta({ chiave, migrazione: 307 }), prima, dopo });
    if (db.prepare('UPDATE main.dati_guida SET json = ? WHERE chiave = ?').run(JSON.stringify(reg), STORICO + chiave).changes !== 1) errore(`lo storico di ${chiave} non si aggiorna`);
    esiti.push({ colonna: 'note', esito: `storico dell’editor: aggiunta la revisione ${reg.revisioni.length} «migrazione» (le precedenti restano com’erano)` });
  }
  return { chiave, esiti, cambiate: cambiate.length };
}

/** L'audit: la prima esecuzione sempre, le successive solo se hanno cambiato qualcosa. */
function scriviAudit(db: AppDatabase, esecuzione: Record<string, unknown>, daDire: boolean): void {
  const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(AUDIT) as string | undefined;
  if (vecchio && !daDire) return;
  let esecuzioni: unknown[] = [];
  if (vecchio) { try { const v = JSON.parse(vecchio) as { esecuzioni?: unknown }; esecuzioni = Array.isArray(v.esecuzioni) ? v.esecuzioni : []; } catch { esecuzioni = []; } }
  db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
    .run(AUDIT, JSON.stringify({
      migrazione: 307, richiesta: RICHIESTA, file: `server/db/migrations/dati/${FILE_DATI}`,
      regola: 'giorni e fasce svuotati solo se la struttura dice lo stesso (divergenze: restano); luogo e sblocco svuotati se uguali al testo atteso; note sostituite col testo curato se uguali a quello atteso; testo diverso = saltato; storico dell’editor con una revisione in più, mai riscritto; le partite non si toccano',
      esecuzioni: [...esecuzioni, { il: new Date().toISOString(), ...esecuzione }],
    }));
}

export const migration307: Migration = {
  id: 307,
  name: 'disponibilita_confidenti_senza_prosa',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'confidente_disponibilita') || !esisteTabella(db, 'confidente_requisito') || !esisteTabella(db, 'dati_guida')) {
      logger.warn({ migrazione: 307 }, 'tabelle assenti: niente da fare'); return;
    }
    for (const c of ['modo', 'giorni_settimana_json', 'fasce_orarie_json', ...COLONNE]) {
      if (!haColonna(db, 'confidente_disponibilita', c)) { logger.warn({ migrazione: 307, colonna: c }, 'colonna assente: niente da fare'); return; }
    }
    const voci = leggiVoci();
    const adesso = new Date().toISOString();
    const righe = voci.map((v) => riga(db, v, adesso));
    const fuoriElenco = (db.prepare('SELECT confidente_chiave FROM main.confidente_disponibilita ORDER BY 1').pluck().all() as string[])
      .filter((k) => !voci.some((v) => v.confidente === k));
    const conteggi = {
      righeCambiate: righe.filter((r) => r.cambiate > 0).length,
      colonneCambiate: righe.reduce((n, r) => n + r.cambiate, 0),
      divergenze: righe.reduce((n, r) => n + r.esiti.filter((e) => e.esito.startsWith('divergenza')).length, 0),
      saltate: righe.reduce((n, r) => n + r.esiti.filter((e) => e.esito.includes('saltat')).length, 0),
    };
    const cambiato = conteggi.colonneCambiate > 0;
    if (cambiato) invalidaCacheDiGioco();
    scriviAudit(db, { conteggi, righe: righe.filter((r) => r.esiti.length > 0), fuoriElenco }, cambiato);
    logger.info({ migrazione: 307, ...conteggi, fuoriElenco }, 'disponibilità dei Confidenti: la prosa esce come fonte');
  },
};
