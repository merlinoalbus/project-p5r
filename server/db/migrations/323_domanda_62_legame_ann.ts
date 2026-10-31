// ============================================================
// Migrazione 323 — domanda in classe dell'11 gennaio (domanda 62): Ann ♪♪ come il 25 aprile, il 20 giugno e il 7 luglio (L13, ondata 10, lotto O10-1)
// ============================================================
//
// Domanda posta all'utente il 2026-10-31: «Domanda in classe dell'11 gennaio (aiutare Ann con gli dèi dello Shintoismo): la pagina generale
// della guida lo mette fra i giorni in cui "aumenta anche il legame con Ann" ma senza dire di quanto; la soluzione del giorno dice solo "Fascino
// +1 per aver aiutato Ann". Per ora c'è solo Fascino +1. L'11 gennaio aggiungo anche i 2 punti con Ann, come negli altri tre giorni (25/4, 20/6,
// 7/7)?». Risposta dell'utente: «sì aggiungili».
// Fonti (lette il 2026-10-31): https://www.allgamestaff.it/persona-5-royal/interrogazioni-esami-risposte/ (i giorni in cui cresce anche il
// legame con Ann: 25 aprile, 20 giugno, 7 luglio, 11 gennaio) e https://www.allgamestaff.it/persona-5-royal/soluzione-settimana-37/ («Fascino
// +1 per aver aiutato Ann»).
//   (1) la voce del Diario che segna la domanda 62 (1277a396…, 11 gennaio, giorno) riceve Ann ♪♪ ({tipo:'puntiConfidente', confidente:'ann',
//       note:2}) con `convertiVoce`, nella forma della 315 per le domande 4, 23 e 79: effetti come letti il 2026-10-31 (Fascino ♪, domanda 62),
//       Ann ♪♪ in coda. La decisione dell'utente vale anche se la voce è registrata in una partita (`ancheSpuntata`); le ricevute della partita
//       non si toccano (rimettendo la spunta valgono gli effetti nuovi).
//   (2) la nota «Fascino +1», che ripete solo il premio ora negli effetti, si toglie conservando il testo di prima (come la `togliNota` della 315),
//       solo se la voce è quella letta e mai modificata dall'utente.
// La 315 non si riscrive (append-only): il premio della domanda è letto dagli effetti della voce, quindi da qui la domanda 62 dà Fascino ♪ e
// Ann ♪♪. Senza lo schema delle partite attaccato (pacchetto iniziale) la voce non si converte (spunte non verificabili), come nella 315.
// Le partite non si toccano (impronta di tutto lo schema `utente` prima e dopo). Idempotente: la seconda volta non trova niente da fare e non
// scrive (l'audit resta com'è). Audit in `dati_guida.audit-323-domanda-62-ann`. Solo `main`.
// ============================================================

import { createHash } from 'node:crypto';
import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { canonico, convertiVoce, tabellePartiteConVoce, type Esito } from './fbisOndata5.js';
import { normalizzaEffettoVoce, type EffettoVoce } from '../../../shared/effettiVoce.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-323-domanda-62-ann';
const LOTTO = 'O10-1-domanda-62-323';
const DOMANDA_POSTA = 'Domanda in classe dell’11 gennaio (aiutare Ann con gli dèi dello Shintoismo): la pagina generale della guida lo mette fra i giorni in cui "aumenta anche il legame con Ann" ma senza dire di quanto; la soluzione del giorno dice solo "Fascino +1 per aver aiutato Ann". Per ora c’è solo Fascino +1. L’11 gennaio aggiungo anche i 2 punti con Ann, come negli altri tre giorni (25/4, 20/6, 7/7)?';
const DECISIONE = '«sì aggiungili»';
const FONTI = [
  { url: 'https://www.allgamestaff.it/persona-5-royal/interrogazioni-esami-risposte/', frase: 'i giorni in cui aumenta anche il legame con Ann: 25 aprile, 20 giugno, 7 luglio, 11 gennaio' },
  { url: 'https://www.allgamestaff.it/persona-5-royal/soluzione-settimana-37/', frase: 'Fascino +1 per aver aiutato Ann' },
];
const errore = (motivo: string): never => { throw new Error(`323: ${motivo}; nessuna modifica applicata.`); };

type EsitoConDati = Esito & { prima?: unknown; dopo?: unknown };

// ---- la voce e la domanda come lette il 2026-10-31 sulla copia dei dati alla 322 ----

const ID_DOMANDA = 62;
const DOMANDA = { data: '01-11', tipo: 'classe' } as const;
const VOCE = {
  uid: '1277a396a60bfef983273c4ebe6433a5',
  data: '01-11',
  fascia: 'giorno',
  azione: 'Rispondere alla domanda in classe (Gli otto milioni di dei, Shintoismo)',
  nota: 'Fascino +1',
} as const;
const FASCINO: EffettoVoce = { tipo: 'dote', dote: 'fascino', note: 1 };
const D62: EffettoVoce = { tipo: 'domanda', domanda: ID_DOMANDA };
const ANN: EffettoVoce = { tipo: 'puntiConfidente', confidente: 'ann', note: 2 };
const ATTESI: readonly EffettoVoce[] = [FASCINO, D62];
const DOPO: readonly EffettoVoce[] = [FASCINO, D62, ANN];
const MOTIVO = 'domanda 62 (11 gennaio): la guida mette il giorno fra quelli in cui cresce anche il legame con Ann; Ann ♪♪ come il 25/4, il 20/6 e il 7/7 (risposta dell’utente: «sì aggiungili»)';

// ---- letture ----

/** L'impronta di tutto lo schema `utente` (ogni tabella, ogni riga): alla fine deve essere identica. */
function improntaPartite(db: AppDatabase): string {
  const h = createHash('sha256');
  for (const t of (db.prepare("SELECT name FROM utente.sqlite_master WHERE type = 'table' ORDER BY name").all() as Array<{ name: string }>).map((x) => x.name)) {
    h.update(`#${t}\n`);
    for (const r of db.prepare(`SELECT * FROM utente."${t}"`).iterate()) h.update(JSON.stringify(r) + '\n');
  }
  return h.digest('hex');
}

/** Gli effetti della voce oggi, in ordine (null se illeggibile). */
function effettiDi(db: AppDatabase, uid: string): Array<EffettoVoce | null> {
  return (db.prepare('SELECT dati_json FROM main.voce_effetto WHERE voce_uid = ? ORDER BY ordine').pluck().all(uid) as string[])
    .map((j) => { try { return normalizzaEffettoVoce(JSON.parse(j)); } catch { return null; } });
}
const sono = (oggi: ReadonlyArray<EffettoVoce | null>, attesi: readonly EffettoVoce[]): boolean =>
  oggi.length === attesi.length && oggi.every((e, i) => e !== null && canonico(e) === canonico(attesi[i]));

/** Il premio della domanda come lo leggono le pagine (gli effetti delle voci che la segnano), con il testo `ricompensa`: per il prima/dopo. */
function statoDomanda(db: AppDatabase): { ricompensa: string; voci: string[]; doti: string[]; confidenti: string[] } {
  const ricompensa = (db.prepare('SELECT ricompensa FROM main.domanda WHERE id = ?').pluck().get(ID_DOMANDA) as string | undefined) ?? '';
  const voci = db.prepare("SELECT DISTINCT voce_uid FROM main.voce_effetto WHERE tipo = 'domanda' AND chiave = ? ORDER BY voce_uid").pluck().all(String(ID_DOMANDA)) as string[];
  const doti = new Set<string>();
  const confidenti = new Set<string>();
  for (const u of voci) for (const e of effettiDi(db, u)) {
    if (e?.tipo === 'dote') doti.add(`${e.dote}:${e.note}`);
    else if (e?.tipo === 'puntiConfidente') confidenti.add('note' in e ? `${e.confidente}:${e.note} note` : `${e.confidente}:${e.punti} punti`);
  }
  return { ricompensa, voci, doti: [...doti].sort(), confidenti: [...confidenti].sort() };
}

/** Le tabelle delle partite che citano la voce (spunta, ricevute, punti dei Confidenti…): per dire cosa resta da fare nella partita. */
const citataIn = (db: AppDatabase, partite: string[] | null): string[] =>
  partite === null ? [] : partite.filter((t) => db.prepare(`SELECT 1 FROM utente."${t}" WHERE voce_uid = ? LIMIT 1`).get(VOCE.uid));

// ---- (1) Ann ♪♪ negli effetti della voce ----

function allineaVoce(db: AppDatabase, partite: string[] | null, adesso: string, esiti: EsitoConDati[]): number {
  const chiave = `voce:${VOCE.data}:${VOCE.uid}`;
  const v = db.prepare('SELECT data, fascia, azione FROM main.voce_giornata WHERE uid = ?').get(VOCE.uid) as { data: string; fascia: string; azione: string } | undefined;
  if (!v) { esiti.push({ chiave, esito: 'voce assente' }); return 0; }
  if (v.data !== VOCE.data || v.fascia !== VOCE.fascia || v.azione !== VOCE.azione) { esiti.push({ chiave, esito: 'giorno, fascia o testo diversi da quelli letti: voce lasciata' }); return 0; }
  const d = db.prepare('SELECT data, tipo FROM main.domanda WHERE id = ?').get(ID_DOMANDA) as { data: string; tipo: string } | undefined;
  if (!d || d.data !== DOMANDA.data || d.tipo !== DOMANDA.tipo) { esiti.push({ chiave, esito: 'domanda 62 assente o con giorno o tipo diversi da quelli letti: voce lasciata' }); return 0; }
  let scritte = 0;
  if (!sono(effettiDi(db, VOCE.uid), DOPO)) {
    const c = convertiVoce(db, {
      uid: VOCE.uid, data: VOCE.data, azione: VOCE.azione, lotto: LOTTO,
      attesi: ATTESI.map((effetto) => ({ uid: null, effetto })), togli: [],
      aggiungi: [{ seme: `${LOTTO}:${VOCE.uid}:0:${ANN.tipo}`, effetto: ANN }],
      motivo: MOTIVO, ancheSpuntata: { decisione: DECISIONE },
    }, partite, adesso);
    esiti.push(c);
    if (!c.esito.startsWith('convertita')) return 0;
    scritte++;
    if (!sono(effettiDi(db, VOCE.uid), DOPO)) errore(`effetti della voce ${VOCE.uid} diversi da quelli attesi dopo la conversione`);
  }
  return scritte + togliNota(db, adesso, esiti);
}

// ---- (2) la nota che ripeteva il premio ----

/** La nota «Fascino +1», che ripete SOLO il premio ora negli effetti: tolta conservando il testo di prima (come la `togliNota` della 315). */
function togliNota(db: AppDatabase, adesso: string, esiti: EsitoConDati[]): number {
  const chiave = `nota:${VOCE.data}:${VOCE.uid}`;
  if (!haColonna(db, 'voce_giornata', 'testo_precedente_json') || !haColonna(db, 'voce_giornata', 'motivo_revisione')) { esiti.push({ chiave, esito: 'colonne del testo precedente assenti: nota lasciata' }); return 0; }
  const r = db.prepare('SELECT data, azione, note, riferimento_tipo, riferimento_chiave, riferimento_testo, aggiunta_da, testo_precedente_json FROM main.voce_giornata WHERE uid = ?').get(VOCE.uid) as
    { data: string; azione: string; note: string | null; riferimento_tipo: string | null; riferimento_chiave: string | null; riferimento_testo: string | null; aggiunta_da: string | null; testo_precedente_json: string | null } | undefined;
  if (!r) { esiti.push({ chiave, esito: 'voce assente' }); return 0; }
  if (r.note === null && r.testo_precedente_json !== null) return 0; // già tolta
  if (r.data !== VOCE.data || r.azione !== VOCE.azione || r.note !== VOCE.nota || r.testo_precedente_json !== null || r.aggiunta_da !== null) { esiti.push({ chiave, esito: 'voce diversa da quella attesa o modificata dall’utente: nota lasciata' }); return 0; }
  const precedente = JSON.stringify({ azione: r.azione, note: r.note, riferimento_tipo: r.riferimento_tipo, riferimento_chiave: r.riferimento_chiave, riferimento_testo: r.riferimento_testo });
  const motivo = `2026-10-31 (L13, ondata 10, O10-1): la nota «${VOCE.nota}» ripeteva il premio della domanda, ora negli effetti della voce (con Ann ♪♪): tolta, il dato resta negli effetti.`;
  if (db.prepare('UPDATE main.voce_giornata SET note = NULL, testo_precedente_json = ?, motivo_revisione = ?, updated_at = ? WHERE uid = ? AND note = ? AND testo_precedente_json IS NULL')
    .run(precedente, motivo, adesso, VOCE.uid, VOCE.nota).changes !== 1) errore(`la nota della voce ${VOCE.uid} non si toglie`);
  esiti.push({ chiave, esito: 'nota tolta (testo di prima conservato)', prima: VOCE.nota, dopo: null });
  return 1;
}

// ---- audit ----

/** L'audit: la prima esecuzione sempre, le successive solo se hanno cambiato qualcosa. */
function scriviAudit(db: AppDatabase, esecuzione: Record<string, unknown>, daFare: string, cambiato: boolean): void {
  const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(AUDIT) as string | undefined;
  if (vecchio && !cambiato) return;
  let esecuzioni: unknown[] = [];
  if (vecchio) { try { const v = JSON.parse(vecchio) as { esecuzioni?: unknown }; esecuzioni = Array.isArray(v.esecuzioni) ? v.esecuzioni : []; } catch { esecuzioni = []; } }
  db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
    .run(AUDIT, JSON.stringify({
      migrazione: 323, lotto: 'O10-1', domanda: DOMANDA_POSTA, decisione: `2026-10-31, risposta dell’utente: ${DECISIONE}`, fonti: FONTI,
      regola: 'Ann ♪♪ entra negli effetti della voce che segna la domanda 62 solo se giorno, fascia, testo ed effetti sono quelli letti il 2026-10-31 (anche se registrata in una partita: decisione dell’utente); la nota che ripeteva il premio si toglie solo se è quella letta e mai modificata; la 315 non si riscrive; le partite non si toccano',
      daFareNellaPartita: daFare,
      esecuzioni: [...esecuzioni, { il: new Date().toISOString(), ...esecuzione }],
    }));
}

export const migration323: Migration = {
  id: 323,
  name: 'domanda_62_legame_ann',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['domanda', 'voce_giornata', 'voce_effetto', 'voce_effetto_transizione', 'dati_guida']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 323, tabella: t }, 'tabella assente: niente da fare'); return; }
    }
    const adesso = new Date().toISOString();
    const partiteAttaccate = (db.prepare('PRAGMA database_list').all() as Array<{ name: string }>).some((s) => s.name === 'utente');
    const partitePrima = partiteAttaccate ? improntaPartite(db) : null;
    const partite = tabellePartiteConVoce(db);
    const prima = statoDomanda(db);
    const esiti: EsitoConDati[] = [];
    const scritte = allineaVoce(db, partite, adesso, esiti);
    if (partiteAttaccate && improntaPartite(db) !== partitePrima) errore('le partite risultano cambiate');
    const dopo = statoDomanda(db);
    const citata = citataIn(db, partite);
    const daFare = partite === null
      ? 'Schema delle partite non attaccato: la voce non è stata convertita (spunte non verificabili); si converte quando le partite sono attaccate.'
      : citata.length
        ? `La voce 1277a396 (11 gennaio) è registrata in una partita (${citata.join(', ')}): le ricevute non cambiano; Ann ♪♪ entra togliendo e rimettendo la spunta della voce.`
        : 'La voce 1277a396 (11 gennaio) non è registrata in nessuna partita: nessuna spunta da rimettere; spuntandola si ricevono Fascino ♪ e Ann ♪♪.';
    const cambiato = scritte > 0;
    if (cambiato) invalidaCacheDiGioco();
    scriviAudit(db, { scritture: scritte, esiti, domanda62: { prima, dopo }, partiteCheCitanoLaVoce: citata }, daFare, cambiato);
    logger.info({ migrazione: 323, scritture: scritte }, 'domanda 62 (11 gennaio): Ann ♪♪ negli effetti della voce');
  },
};
