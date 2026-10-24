// ============================================================
// 219 — i legami voce → infiltrazione delle 18 voci con più aree (L11 · R11-10c/2, M-B residuo; documento: `lotti/L11/M-B-voci-multiple-2026-10-24.md`)
// ============================================================
//
// La 207 ha legato le proposte «certe». Restano 18 voci con una proposta «multipla» (16) o «probabile» (2): 83 righe di `proposta_infiltrazione_voce`. L'analisi
// dati ha trovato, per ciascuna, la stessa sequenza di aree nella guida italiana (indice verbatim della pagina del Palazzo) o nel testo della voce, confermata dal Royal per
// giorno, boss e Tesoro: «si legano come la proposta dice». Decisione dell'utente per Shido 11/12 («8 aree (testo)»): si legano le prime 8 aree della proposta (fino alla
// Sala Intrattenimento, quelle che il testo nomina), non le 15 della guida; le altre 7 restano nella proposta.
// Per ogni voce: guardia sull'uid (prefisso unico), sulla data attesa, sull'assenza di legami (una scelta dell'utente non si tocca), sul numero e sull'ordine consecutivo
// delle righe di proposta, sull'esistenza delle aree e sul loro Palazzo (quello atteso, e lo stesso della voce se ha un riferimento «dungeon»), e sul divieto della stessa
// area due volte di seguito (come il gesto «Conferma»). Una voce che non passa una guardia si salta senza errore e finisce nell'audit. Le righe di proposta NON si
// cancellano (archivio). Non cambiano testo, ordine, data, fascia, effetti, note, `da_rivedere` né spunte (impronta di `voce_giornata` e della proposta prima e dopo).
// Audit in `dati_guida.legami-infiltrazioni-voci-219`: legami scritti, voci saltate.
// ============================================================

import { createHash } from 'node:crypto';
import type { AppDatabase } from '../dbService.js';
import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';

/** [prefisso dell'uid, data attesa, righe di proposta attese, Palazzo atteso, quante aree legare (default: tutte)]. */
const VOCI: ReadonlyArray<readonly [string, string, number, string, number?]> = [
  ['09e38fdd', '01-02', 3, 'maruki'], ['cdf1af20', '01-09', 4, 'maruki'], ['6e28e155', '01-12', 4, 'maruki'], ['cf66b722', '01-26', 5, 'maruki'],
  ['a5133905', '04-20', 3, 'kamoshida'], ['65fdbeab', '06-20', 1, 'kaneshiro'], ['5796b127', '06-25', 4, 'kaneshiro'], ['ac258051', '07-25', 2, 'futaba'],
  ['62284ab3', '08-01', 4, 'futaba'], ['f5e781ca', '08-01', 5, 'futaba'], ['fd2a7b29', '09-15', 2, 'okumura'], ['8742bcf9', '10-03', 2, 'maruki'],
  ['c66a02b6', '10-04', 10, 'okumura'], ['7dd92df2', '10-29', 2, 'niijima'], ['ebe00e6b', '11-13', 11, 'niijima'], ['dece90bf', '11-14', 5, 'niijima'],
  ['589d82e8', '11-19', 1, 'niijima'], ['746682fa', '12-11', 15, 'shido', 8],
];
const errore = (motivo: string): never => { throw new Error(`219: ${motivo}; nessuna modifica applicata.`); };

function impronta(db: AppDatabase, sql: string): string {
  const h = createHash('sha256');
  let n = 0;
  for (const r of db.prepare(sql).iterate()) { h.update(JSON.stringify(r) + '\n'); n++; }
  return `${n}:${h.digest('hex')}`;
}

export const migration219: Migration = {
  id: 219, name: 'voci_infiltrazioni_multiple',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['voce_giornata', 'voce_infiltrazione', 'proposta_infiltrazione_voce', 'dungeon_area', 'dati_guida']) if (!esisteTabella(db, t)) return;
    const vociPrima = impronta(db, 'SELECT * FROM main.voce_giornata ORDER BY uid');
    const propostePrima = impronta(db, 'SELECT * FROM main.proposta_infiltrazione_voce ORDER BY voce_uid, ordine');
    const legamiPrima = db.prepare('SELECT COUNT(*) FROM main.voce_infiltrazione').pluck().get() as number;
    const scritti: Record<string, string[]> = {};
    const saltate: Record<string, string> = {};
    for (const [prefisso, data, righe, palazzo, quante] of VOCI) {
      const voci = db.prepare('SELECT uid, data, riferimento_tipo, riferimento_chiave FROM main.voce_giornata WHERE uid LIKE ?').all(`${prefisso}%`) as
        Array<{ uid: string; data: string; riferimento_tipo: string | null; riferimento_chiave: string | null }>;
      if (voci.length !== 1) { saltate[prefisso] = voci.length === 0 ? 'voce assente' : 'prefisso ambiguo'; continue; }
      const v = voci[0]!;
      if (v.data !== data) { saltate[prefisso] = `data ${v.data} invece di ${data}`; continue; }
      if (db.prepare('SELECT 1 FROM main.voce_infiltrazione WHERE voce_uid = ?').get(v.uid)) { saltate[prefisso] = 'ha già dei legami'; continue; }
      const p = db.prepare('SELECT ordine, infiltrazione_chiave FROM main.proposta_infiltrazione_voce WHERE voce_uid = ? ORDER BY ordine').all(v.uid) as Array<{ ordine: number; infiltrazione_chiave: string }>;
      if (p.length !== righe || p.some((r, i) => r.ordine !== i)) { saltate[prefisso] = 'la proposta non è più quella attesa'; continue; }
      const scelte = p.slice(0, quante ?? p.length).map((r) => r.infiltrazione_chiave);
      const aree = scelte.map((k) => db.prepare('SELECT dungeon_chiave FROM main.dungeon_area WHERE chiave = ?').get(k) as { dungeon_chiave: string } | undefined);
      if (aree.some((a) => !a)) { saltate[prefisso] = 'un\'area della proposta non esiste'; continue; }
      if (aree.some((a) => a!.dungeon_chiave !== palazzo)) { saltate[prefisso] = `un'area non è del Palazzo ${palazzo}`; continue; }
      if (v.riferimento_tipo === 'dungeon' && v.riferimento_chiave !== palazzo) { saltate[prefisso] = `Palazzo della voce diverso (${v.riferimento_chiave})`; continue; }
      if (v.riferimento_tipo !== null && v.riferimento_tipo !== 'dungeon' && v.riferimento_tipo !== 'confidente') { saltate[prefisso] = `riferimento ${v.riferimento_tipo}`; continue; }
      if (scelte.some((k, i) => i > 0 && k === scelte[i - 1])) { saltate[prefisso] = 'la stessa area due volte di seguito'; continue; }
      const inserisci = db.prepare('INSERT INTO main.voce_infiltrazione (voce_uid, ordine, infiltrazione_chiave) VALUES (?, ?, ?)');
      scelte.forEach((k, i) => inserisci.run(v.uid, i, k));
      scritti[v.uid] = scelte;
    }
    const n = Object.values(scritti).reduce((s, a) => s + a.length, 0);
    if (Object.keys(scritti).length > 0) {
      db.prepare('INSERT OR REPLACE INTO main.dati_guida (chiave, json) VALUES (?, ?)').run('legami-infiltrazioni-voci-219', JSON.stringify({
        versione: 1, motivo: 'Legami voce → infiltrazione scritti da M-B (L11, R11-10c/2, migrazione 219) per le 18 voci con più aree; Shido 12-11 legata alle prime 8 aree (decisione dell\'utente).', scritti, saltate,
      }));
    }
    if (impronta(db, 'SELECT * FROM main.voce_giornata ORDER BY uid') !== vociPrima) errore('il Diario è cambiato');
    if (impronta(db, 'SELECT * FROM main.proposta_infiltrazione_voce ORDER BY voce_uid, ordine') !== propostePrima) errore('le proposte sono cambiate');
    if ((db.prepare('SELECT COUNT(*) FROM main.voce_infiltrazione').pluck().get() as number) !== legamiPrima + n) errore('il numero dei legami non torna');
    logger.info({ migrazione: 'L11-R11-10c-219', voci: Object.keys(scritti).length, righe: n, saltate }, 'legami voce → infiltrazione delle voci con più aree (M-B)');
  },
};
