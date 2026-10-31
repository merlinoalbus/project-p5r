// ============================================================
// Migrazione 315 — domande in classe e quiz TV: il premio della guida negli effetti delle voci del Diario (L13, ondata 8, lotto O8-1)
// ============================================================
//
// Risposta dell'utente del 2026-10-31: «Il premio di queste domande deve essere corretto e allineato a quanto nel testo. Verifica tutte le
// domande anche quelle antecedenti al 20 giugno. Aggiungi le voci mancanti.» (supera la decisione 10 e la riserva della decisione 16).
// Fonte, che prevale (dato Royal): https://www.allgamestaff.it/persona-5-royal/interrogazioni-esami-risposte/ («Rispondere correttamente
// garantisce un aumento della Conoscenza, ma in alcuni casi specifici anche del Fascino e del Rango Confidente di Ann») e la soluzione giorno per
// giorno (https://www.allgamestaff.it/persona-5-royal/soluzione-settimana-N/, lette il 2026-10-31): ogni domanda in classe e ogni quiz TV dà
// Conoscenza ♪, tranne il 25 aprile, il 20 giugno e il 7 luglio (Fascino ♪ e «2 Punti» nel legame con Ann, cioè ♪♪ come le risposte dei
// dialoghi) e l'11 gennaio (Fascino ♪); una catena di Morgana dà UNA nota per la catena; le righe d'esame nessuna Dote (contano per il
// piazzamento).
//   (1) le voci del Diario che segnano le domande si allineano al premio della guida con `convertiVoce` (effetti uno per uno come letti il
//       2026-10-31): il quiz TV esce dalla voce della domanda in classe dello stesso giorno ed entra nella voce TV della sera; le voci senza
//       l'effetto «domanda» lo ricevono; Ann ♪♪ entra dove la guida lo dice; il quiz TV del 10 novembre riceve la sua Conoscenza. Le voci già
//       registrate in una partita si convertono lo stesso (decisione dell'utente sulle voci delle domande: `ancheSpuntata`); le ricevute della
//       partita non si toccano. Una nota che ripete SOLO il premio ora negli effetti (testo esatto letto) si toglie conservando il testo di prima.
//   (2) le domande senza voce (6 settembre e 6 ottobre in classe, 4 agosto e 29 settembre in TV) ricevono la voce nel loro giorno e fascia, in
//       cima (come `posiziona` per il primo posto, fascia rinumerata 0..n), con la Conoscenza e l'effetto «domanda»; solo se il giorno non ha già
//       una voce con quell'effetto «domanda».
//   (3) per OGNI domanda: il premio delle voci che la segnano (Doti e punti dei Confidenti) confrontato con quello della guida; `ricompensa` si
//       svuota (regola della 311) solo dove coincide, su righe della guida mai corrette; dove non coincide resta, con il motivo nell'audit.
// Le partite non si toccano (impronta di tutto lo schema `utente` prima e dopo). Idempotente: la seconda volta non trova niente da fare e non
// scrive (l'audit resta com'è). Audit in `dati_guida.audit-315-domande-premi-guida`, con prima e dopo di ogni domanda. Solo `main`.
// ============================================================

import { createHash } from 'node:crypto';
import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { canonico, convertiVoce, tabellePartiteConVoce, uidDa, type EffettoAtteso, type Esito } from './fbisOndata5.js';
import { normalizzaEffettoVoce, type EffettoVoce } from '../../../shared/effettiVoce.js';
import { ordineGioco } from '../../../shared/condizioniSpillo.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-315-domande-premi-guida';
const LOTTO = 'O8-1-domande-315';
const DECISIONE = '«Il premio di queste domande deve essere corretto e allineato a quanto nel testo. Verifica tutte le domande anche quelle antecedenti al 20 giugno. Aggiungi le voci mancanti.»';
const FONTE = 'https://www.allgamestaff.it/persona-5-royal/interrogazioni-esami-risposte/';
const errore = (motivo: string): never => { throw new Error(`315: ${motivo}; nessuna modifica applicata.`); };

type EsitoConDati = Esito & { prima?: unknown; dopo?: unknown };

// ---- i dati della guida ----

/** Il primo giorno di ogni pagina «Soluzione settimana N» (indice della guida, https://www.allgamestaff.it/persona-5-royal/indice/, letto il
 *  2026-10-31): la settimana di un giorno è l'ultima che comincia entro quel giorno (la 12 copre dal 27/06 al 03/07). */
const SETTIMANE: ReadonlyArray<readonly [string, number]> = [
  ['04-11', 1], ['04-18', 2], ['04-25', 3], ['05-01', 4], ['05-09', 5], ['05-16', 6], ['05-23', 7], ['06-01', 8], ['06-06', 9], ['06-13', 10],
  ['06-20', 11], ['06-27', 12], ['07-04', 13], ['07-11', 14], ['07-18', 15], ['07-25', 16], ['08-01', 17], ['08-08', 18], ['08-15', 19],
  ['08-22', 20], ['09-01', 21], ['09-12', 22], ['09-19', 23], ['09-26', 24], ['10-01', 25], ['10-10', 26], ['10-17', 27], ['10-24', 28],
  ['11-01', 29], ['11-07', 30], ['11-14', 31], ['11-21', 32], ['12-01', 33], ['12-12', 34], ['12-19', 35], ['01-01', 36], ['01-09', 37],
  ['01-16', 38], ['01-23', 39], ['02-01', 40], ['03-02', 41],
];
/** La pagina della settimana di un giorno (la pagina generale se il giorno viene prima della settimana 1). */
const paginaSettimana = (data: string): string => {
  const s = [...SETTIMANE].reverse().find(([inizio]) => ordineGioco(inizio) <= ordineGioco(data));
  return s ? `https://www.allgamestaff.it/persona-5-royal/soluzione-settimana-${s[1]}/` : FONTE;
};

/** Il premio di una domanda come lo dice la guida: Doti e punti dei Confidenti in note, con la frase della guida. */
interface PremioGuida { doti: Array<{ dote: string; note: 1 | 2 | 3 }>; confidenti: Array<{ confidente: string; note: 1 | 2 | 3 }>; citazione: string }
const CONOSCENZA: PremioGuida = { doti: [{ dote: 'conoscenza', note: 1 }], confidenti: [], citazione: 'Conoscenza +1' };
const ESAME: PremioGuida = { doti: [], confidenti: [], citazione: 'nessuna Dote: le risposte dell’esame contano per il piazzamento' };
const FASCINO_E_ANN = (citazione: string): PremioGuida => ({ doti: [{ dote: 'fascino', note: 1 }], confidenti: [{ confidente: 'ann', note: 2 }], citazione });
/** Le domande con un premio diverso dalla Conoscenza ♪, o con una frase propria della guida (le catene di Morgana: una nota per la catena). */
const PREMI_DIVERSI: Readonly<Record<number, PremioGuida>> = {
  4: FASCINO_E_ANN('2 Punti il legame con Ann e ottenere Fascino +1'),
  6: { ...CONOSCENZA, citazione: 'catena di tre domande: Conoscenza + 1' },
  15: { ...CONOSCENZA, citazione: 'catena: Conoscenza +1' },
  23: FASCINO_E_ANN('2 Punti nel Legame con Ann e Fascino +1'),
  26: { ...CONOSCENZA, citazione: 'Conoscenza +1 (nessun Fascino)' },
  30: { ...CONOSCENZA, citazione: 'La somma delle risposte corrette … un bonus Conoscenza +1' },
  41: { ...CONOSCENZA, citazione: 'catena in tre parti: Conoscenza +1' },
  62: { doti: [{ dote: 'fascino', note: 1 }], confidenti: [], citazione: 'Fascino +1 per aver aiutato Ann' },
  63: { ...CONOSCENZA, citazione: 'Conoscenza +1 (nessun Fascino)' },
  66: { ...CONOSCENZA, citazione: 'catena: Conoscenza +1' },
  79: FASCINO_E_ANN('Fascino +1, assieme a un aumento di 2 Punti nel legame con Ann'),
};
const premioGuida = (id: number, tipo: string): PremioGuida =>
  PREMI_DIVERSI[id] ?? (tipo === 'esame-medio' || tipo === 'esame-finale' ? ESAME : CONOSCENZA);

// ---- (1) le voci da allineare, come lette il 2026-10-31 sulla copia dei dati ----

const D = (n: number): EffettoVoce => ({ tipo: 'domanda', domanda: n });
const DOTE = (dote: 'conoscenza' | 'fascino'): EffettoVoce => ({ tipo: 'dote', dote, note: 1 });
const ANN: EffettoVoce = { tipo: 'puntiConfidente', confidente: 'ann', note: 2 };

/** Una voce da allineare: gli effetti di oggi in ordine (`togli` su quelli che escono), quelli che entrano, la nota che ripete solo il premio. */
interface Allineamento { uid: string; data: string; azione: string; attesi: Array<{ effetto: EffettoVoce; togli?: true }>; aggiungi: EffettoVoce[]; nota?: string; motivo: string }

const VOCI: readonly Allineamento[] = [
  { uid: '5fc91cc4d1909f2ae61e396f792a6ddf', data: '04-25', azione: 'Rispondere alle domande in classe (Lo sostieni incondizionatamente / Hai il dovere di raddrizzarlo)',
    attesi: [{ effetto: DOTE('fascino') }], aggiungi: [ANN, D(4)], nota: 'Fascino +1; Legame Ann +2',
    motivo: 'domanda 4 (25 aprile): la guida dà Fascino ♪ e 2 punti (♪♪) nel legame con Ann; la voce segna la domanda' },
  { uid: '59c1b1b504f883586d50e24dfcfb02c4', data: '04-30', azione: 'Rispondere alle domande della prof.ssa Chouno',
    attesi: [{ effetto: DOTE('conoscenza') }], aggiungi: [D(6)], motivo: 'domanda 6 (30 aprile, catena di tre risposte): Conoscenza ♪ per la catena; la voce segna la domanda' },
  { uid: 'c78e13d0921f104355bf413babc8bb96', data: '05-31', azione: 'Domanda in Classe. Rispondi al professore.',
    attesi: [{ effetto: DOTE('conoscenza') }], aggiungi: [D(17)], motivo: 'domanda 17 (31 maggio): Conoscenza ♪; la voce segna la domanda' },
  { uid: '6be2c9026a145899270efa239745a106', data: '05-19', azione: 'Rispondere alla domanda in classe.',
    attesi: [{ effetto: DOTE('conoscenza') }, { effetto: D(13) }, { effetto: D(68), togli: true }], aggiungi: [],
    motivo: 'il quiz TV 68 del 19 maggio è della voce TV della sera (099e312a), non della domanda in classe' },
  { uid: '099e312ac3d0b382e9e198e496db9727', data: '05-19', azione: 'TV: rispondere alla domanda sulla lesione (Produrre rumori molesti)',
    attesi: [{ effetto: DOTE('conoscenza') }], aggiungi: [D(68)], nota: 'Conoscenza +1', motivo: 'quiz TV 68 (19 maggio, sera): Conoscenza ♪; la voce segna il quiz' },
  { uid: 'b8096fe6fc1a4c1b9bb10164839b4e54', data: '05-26', azione: 'Rispondere alla domanda in classe',
    attesi: [{ effetto: DOTE('conoscenza') }, { effetto: D(16) }, { effetto: D(69), togli: true }], aggiungi: [],
    motivo: 'il quiz TV 69 del 26 maggio è della voce TV della sera (368424f8), non della domanda in classe' },
  { uid: '368424f85483122a24a92f13fa6b9439', data: '05-26', azione: 'TV: rispondere alla domanda.',
    attesi: [{ effetto: DOTE('conoscenza') }], aggiungi: [D(69)], motivo: 'quiz TV 69 (26 maggio, sera): Conoscenza ♪; la voce segna il quiz' },
  { uid: '89137bd1b79805a90c78a507b640758b', data: '06-02', azione: 'TV: rispondere alla domanda.',
    attesi: [{ effetto: DOTE('conoscenza') }], aggiungi: [D(70)], motivo: 'quiz TV 70 (2 giugno): Conoscenza ♪; la voce segna il quiz' },
  { uid: '0232c81135877ff241a9feb2dd17e4da', data: '06-20', azione: 'Rispondere alla domanda in classe (Smartphone)',
    attesi: [{ effetto: DOTE('fascino') }, { effetto: D(23) }], aggiungi: [ANN], nota: 'Fascino +1, +2 legame Ann',
    motivo: 'domanda 23 (20 giugno): la guida dà Fascino ♪ e 2 punti (♪♪) nel legame con Ann' },
  { uid: 'eba816845574988c4ff8c792cafc0877', data: '06-23', azione: 'Rispondere alla domanda in classe (Una papessa)',
    attesi: [{ effetto: DOTE('conoscenza') }, { effetto: D(24) }, { effetto: D(71), togli: true }], aggiungi: [], nota: 'Conoscenza +1',
    motivo: 'il quiz TV 71 del 23 giugno è della voce TV della sera (b337847e, che lo segna già), non della domanda in classe' },
  { uid: 'b9e2763b0f65697c7f0b28dc24c3487c', data: '07-07', azione: 'Rispondere alle domande in classe (Via Lattea / Somen)',
    attesi: [{ effetto: DOTE('fascino') }, { effetto: D(79) }], aggiungi: [ANN], nota: 'Fascino +1, +2 legame Ann',
    motivo: 'domanda 79 (7 luglio): la guida dà Fascino ♪ e 2 punti (♪♪) nel legame con Ann' },
  { uid: 'bcef2fd3c28dbb20a933209b30a764f2', data: '09-29', azione: 'Rispondere alla domanda in classe (Agenzia della Casa Imperiale)',
    attesi: [{ effetto: DOTE('conoscenza') }, { effetto: D(42) }, { effetto: D(74), togli: true }], aggiungi: [],
    motivo: 'il quiz TV 74 del 29 settembre è della sera, al rientro al Leblanc (voce nuova), non della domanda in classe' },
  { uid: '274bfc5563d6a5a06e206eee43cd378a', data: '11-10', azione: 'Rispondere alla domanda in classe sui corvi (Gli occhi dei corvi non si vedono)',
    attesi: [{ effetto: DOTE('conoscenza') }, { effetto: D(54) }, { effetto: D(75), togli: true }], aggiungi: [],
    motivo: 'il quiz TV 75 del 10 novembre è della voce TV della sera (8db0a92b, che lo segna già), non della domanda in classe' },
  { uid: '8db0a92b5cfcd5bc9cfd4a48ee4ede19', data: '11-10', azione: 'TV: Chi detiene il potere? - Noi, gli spettatori',
    attesi: [{ effetto: D(75) }], aggiungi: [DOTE('conoscenza')], motivo: 'quiz TV 75 (10 novembre, sera): la guida dice «Otterremo Conoscenza +1 dando la risposta esatta»' },
];
const dopoDi = (v: Allineamento): EffettoVoce[] => [...v.attesi.filter((a) => !a.togli).map((a) => a.effetto), ...v.aggiungi];

// ---- (2) le voci nuove ----

/** Una voce nuova per una domanda senza voce: giorno, fascia e il posto (in cima) dalla guida. */
interface VoceNuova { domanda: number; data: string; fascia: 'giorno' | 'sera'; tipoDomanda: 'classe' | 'tv'; guida: string }
const VOCI_NUOVE: readonly VoceNuova[] = [
  { domanda: 72, data: '08-04', fascia: 'giorno', tipoDomanda: 'tv', guida: 'prima di uscire per la giornata, scendete al piano di sotto e guardate la TV (settimana 17)' },
  { domanda: 36, data: '09-06', fascia: 'giorno', tipoDomanda: 'classe', guida: 'a scuola la domanda in classe, prima dei Memento e di Chihaya (settimana 21)' },
  { domanda: 74, data: '09-29', fascia: 'sera', tipoDomanda: 'tv', guida: 'di ritorno al Leblanc, esaminiamo la TV per una domanda, prima di Jinbocho e di Sojiro (settimana 24)' },
  { domanda: 44, data: '10-06', fascia: 'giorno', tipoDomanda: 'classe', guida: 'a scuola la domanda in classe, prima del Palazzo di Okumura (settimana 25)' },
];
/** Il testo della voce come quello delle voci esistenti, con le risposte della domanda («… (Cronostasi)»). */
const azioneNuova = (v: VoceNuova, risposte: string[]): string =>
  `${v.tipoDomanda === 'tv' ? 'TV: rispondere alla domanda' : 'Rispondere alla domanda in classe'} (${risposte.join(' / ')})`;
const uidNuova = (v: VoceNuova): string => uidDa(`${LOTTO}:voce:${v.data}:${v.fascia}:${v.domanda}`);

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

/** Lo stato di una domanda: testo `ricompensa`, voci che la segnano e il premio delle voci (Doti e punti dei Confidenti, ordinati). */
interface StatoDomanda { ricompensa: string; voci: string[]; premio: { doti: string[]; confidenti: string[] } }
function statoDomanda(db: AppDatabase, id: number): StatoDomanda {
  const ricompensa = (db.prepare('SELECT ricompensa FROM main.domanda WHERE id = ?').pluck().get(id) as string | undefined) ?? '';
  const voci = db.prepare("SELECT DISTINCT voce_uid FROM main.voce_effetto WHERE tipo = 'domanda' AND chiave = ? ORDER BY voce_uid").pluck().all(String(id)) as string[];
  const doti = new Set<string>();
  const confidenti = new Set<string>();
  for (const u of voci) for (const e of effettiDi(db, u)) {
    if (e?.tipo === 'dote') doti.add(`${e.dote}:${e.note}`);
    else if (e?.tipo === 'puntiConfidente') confidenti.add('note' in e ? `${e.confidente}:${e.note} note` : `${e.confidente}:${e.punti} punti`);
  }
  return { ricompensa, voci, premio: { doti: [...doti].sort(), confidenti: [...confidenti].sort() } };
}
const premioAtteso = (p: PremioGuida): StatoDomanda['premio'] =>
  ({ doti: p.doti.map((d) => `${d.dote}:${d.note}`).sort(), confidenti: p.confidenti.map((c) => `${c.confidente}:${c.note} note`).sort() });

// ---- (1) allineamento delle voci ----

function allineaVoci(db: AppDatabase, partite: string[] | null, adesso: string, esiti: EsitoConDati[]): number {
  let scritte = 0;
  for (const v of VOCI) {
    const chiave = `voce:${v.data}:${v.uid}`;
    if (!db.prepare('SELECT 1 FROM main.voce_giornata WHERE uid = ?').get(v.uid)) { esiti.push({ chiave, esito: 'voce assente' }); continue; }
    const dopo = dopoDi(v);
    if (!sono(effettiDi(db, v.uid), dopo)) {
      const attesi: EffettoAtteso[] = v.attesi.map((a) => ({ uid: null, effetto: a.effetto, ...(a.togli ? { togli: true as const } : {}) }));
      const aggiungi = v.aggiungi.map((effetto, k) => ({ seme: `${LOTTO}:${v.uid}:${k}:${effetto.tipo}`, effetto }));
      const c = convertiVoce(db, { uid: v.uid, data: v.data, azione: v.azione, lotto: LOTTO, attesi, togli: [], aggiungi, motivo: v.motivo, ancheSpuntata: { decisione: DECISIONE } }, partite, adesso);
      esiti.push(c);
      if (!c.esito.startsWith('convertita')) continue;
      scritte++;
      if (!sono(effettiDi(db, v.uid), dopo)) errore(`effetti della voce ${v.uid} diversi da quelli attesi dopo la conversione`);
    }
    if (v.nota) scritte += togliNota(db, v, adesso, esiti);
  }
  return scritte;
}

/** La nota che ripete SOLO il premio, ora negli effetti della voce allineata: tolta conservando il testo di prima (come la 311 e la 314). */
function togliNota(db: AppDatabase, v: Allineamento, adesso: string, esiti: EsitoConDati[]): number {
  const chiave = `nota:${v.data}:${v.uid}`;
  if (!haColonna(db, 'voce_giornata', 'testo_precedente_json') || !haColonna(db, 'voce_giornata', 'motivo_revisione')) { esiti.push({ chiave, esito: 'colonne del testo precedente assenti: nota lasciata' }); return 0; }
  const r = db.prepare('SELECT data, azione, note, riferimento_tipo, riferimento_chiave, riferimento_testo, aggiunta_da, testo_precedente_json FROM main.voce_giornata WHERE uid = ?').get(v.uid) as
    { data: string; azione: string; note: string | null; riferimento_tipo: string | null; riferimento_chiave: string | null; riferimento_testo: string | null; aggiunta_da: string | null; testo_precedente_json: string | null } | undefined;
  if (!r) { esiti.push({ chiave, esito: 'voce assente' }); return 0; }
  if (r.note === null && r.testo_precedente_json !== null) return 0; // già tolta
  if (r.data !== v.data || r.azione !== v.azione || r.note !== v.nota || r.testo_precedente_json !== null || r.aggiunta_da !== null) { esiti.push({ chiave, esito: 'voce diversa da quella attesa o modificata dall’utente: nota lasciata' }); return 0; }
  const precedente = JSON.stringify({ azione: r.azione, note: r.note, riferimento_tipo: r.riferimento_tipo, riferimento_chiave: r.riferimento_chiave, riferimento_testo: r.riferimento_testo });
  const motivo = `2026-10-31 (L13, ondata 8, O8-1): la nota «${v.nota}» ripeteva il premio della domanda, ora negli effetti della voce: tolta, il dato resta negli effetti.`;
  if (db.prepare('UPDATE main.voce_giornata SET note = NULL, testo_precedente_json = ?, motivo_revisione = ?, updated_at = ? WHERE uid = ? AND note = ? AND testo_precedente_json IS NULL')
    .run(precedente, motivo, adesso, v.uid, v.nota).changes !== 1) errore(`la nota della voce ${v.uid} non si toglie`);
  esiti.push({ chiave, esito: 'nota tolta (testo di prima conservato)', prima: v.nota, dopo: null });
  return 1;
}

// ---- (2) voci nuove ----

function vociNuove(db: AppDatabase, partite: string[] | null, adesso: string, esiti: EsitoConDati[]): number {
  let create = 0;
  const fascia = db.prepare('SELECT uid, ordine FROM main.voce_giornata WHERE data = ? AND fascia = ? ORDER BY ordine, uid');
  const scriviOrdine = db.prepare('UPDATE main.voce_giornata SET ordine = ? WHERE uid = ?');
  for (const v of VOCI_NUOVE) {
    const uid = uidNuova(v);
    const chiave = `voce-nuova:${v.data}:${v.fascia}:domanda-${v.domanda}`;
    if (db.prepare('SELECT 1 FROM main.voce_giornata WHERE uid = ?').get(uid)) continue; // già creata
    const d = db.prepare('SELECT data, tipo, risposte_json FROM main.domanda WHERE id = ?').get(v.domanda) as { data: string; tipo: string; risposte_json: string } | undefined;
    if (!d || d.data !== v.data || d.tipo !== v.tipoDomanda) { esiti.push({ chiave, esito: 'domanda assente o con giorno o tipo diversi da quelli letti: nessuna voce' }); continue; }
    const conDomanda = db.prepare("SELECT DISTINCT e.voce_uid FROM main.voce_effetto e JOIN main.voce_giornata g ON g.uid = e.voce_uid WHERE e.tipo = 'domanda' AND e.chiave = ? AND g.data = ?").pluck().all(String(v.domanda), v.data) as string[];
    if (conDomanda.length) { esiti.push({ chiave, esito: `il giorno ha già una voce che segna la domanda (${conDomanda.join(', ')}): nessuna voce nuova` }); continue; }
    if (!db.prepare('SELECT 1 FROM main.giorno WHERE data = ?').get(v.data)) { esiti.push({ chiave, esito: 'giorno assente dal percorso: nessuna voce' }); continue; }
    if (partite === null) { esiti.push({ chiave, esito: 'schema delle partite non attaccato: voce non creata (gli effetti si scrivono solo con le spunte verificabili)' }); continue; }
    let risposte: string[];
    try { risposte = (JSON.parse(d.risposte_json) as Array<{ testo?: unknown }>).flatMap((r) => (typeof r.testo === 'string' && r.testo.trim() ? [r.testo.trim()] : [])); } catch { risposte = []; }
    if (!risposte.length) { esiti.push({ chiave, esito: 'domanda senza risposte leggibili: nessuna voce' }); continue; }
    const azione = azioneNuova(v, risposte);
    const ordiniPrima = fascia.all(v.data, v.fascia) as Array<{ uid: string; ordine: number }>;
    const tv = v.tipoDomanda === 'tv';
    // come le voci esistenti: il quiz TV è una voce «dote» collegata alla Conoscenza (89137bd1), la domanda in classe una voce «esame»
    db.prepare(`INSERT INTO main.voce_giornata (uid, data, fascia, ordine, genere, azione, note, tipo, riferimento_tipo, riferimento_chiave, riferimento_testo,
        rango_atteso, indice_guida, created_at, updated_at, da_rivedere, aggiunta_da)
      VALUES (?, ?, ?, -1, 'azione', ?, NULL, ?, ?, ?, NULL, NULL, NULL, ?, ?, 0, 'team')`)
      .run(uid, v.data, v.fascia, azione, tv ? 'dote' : 'esame', tv ? 'dote' : null, tv ? 'conoscenza' : null, adesso, adesso);
    // gli effetti con `convertiVoce` (validi, origine «regola», riga di transizione «convertita» con l'impronta, registro delle operazioni)
    const c = convertiVoce(db, { uid, data: v.data, azione, lotto: LOTTO, attesi: [], togli: [],
      aggiungi: [{ seme: `${LOTTO}:${uid}:0:dote`, effetto: DOTE('conoscenza') }, { seme: `${LOTTO}:${uid}:1:domanda`, effetto: D(v.domanda) }],
      motivo: `domanda ${v.domanda} senza voce: la guida la colloca il ${v.data} (${v.guida})` }, partite, adesso);
    if (!c.esito.startsWith('convertita')) errore(`gli effetti della voce nuova del ${v.data} non si scrivono (${c.esito})`);
    // in cima alla fascia (ordine -1, il più piccolo), poi la fascia rinumerata 0, 1, 2… come fa `posiziona`
    (fascia.all(v.data, v.fascia) as Array<{ uid: string }>).forEach((r, i) => scriviOrdine.run(i, r.uid));
    const ordiniDopo = fascia.all(v.data, v.fascia) as Array<{ uid: string; ordine: number }>;
    if (ordiniDopo[0]?.uid !== uid) errore(`la voce del ${v.data} non è in cima alla fascia`);
    if (!sono(effettiDi(db, uid), [DOTE('conoscenza'), D(v.domanda)])) errore(`gli effetti della voce nuova del ${v.data} non sono quelli attesi`);
    if (!db.prepare("SELECT 1 FROM main.voce_effetto_transizione WHERE voce_uid = ? AND stato = 'convertita'").get(uid)) errore(`la voce nuova del ${v.data} è senza riga di transizione`);
    esiti.push({ chiave, esito: `creata (${uid})`, prima: { ordini: ordiniPrima }, dopo: { azione, effetti: c.dopo, ordini: ordiniDopo } });
    create++;
  }
  return create;
}

// ---- (3) le ricompense di tutte le domande ----

interface EsitoDomanda { id: number; data: string; tipo: string; guida: StatoDomanda['premio'] & { citazione: string; url: string }; prima: StatoDomanda; dopo: StatoDomanda; esito: string }

function ricompense(db: AppDatabase, prima: Map<number, StatoDomanda>, adesso: string): { esiti: EsitoDomanda[]; svuotate: number } {
  const esiti: EsitoDomanda[] = [];
  let svuotate = 0;
  for (const d of db.prepare('SELECT id, data, tipo, ricompensa, origine, seed_json FROM main.domanda ORDER BY id').all() as Array<{ id: number; data: string; tipo: string; ricompensa: string; origine: string; seed_json: string | null }>) {
    const g = premioGuida(d.id, d.tipo);
    const atteso = premioAtteso(g);
    const ora = statoDomanda(db, d.id);
    let esito: string;
    if (ora.voci.length !== 1) esito = `${ora.voci.length} voci la segnano invece di una: da vedere`;
    else if (canonico(ora.premio) !== canonico(atteso)) esito = 'il premio della voce è diverso da quello della guida: da vedere';
    else if (d.ricompensa === '') esito = 'coincide (testo già vuoto)';
    else if (d.origine !== 'seed' || d.seed_json !== null) esito = 'coincide, ma il testo è corretto dall’utente: lasciato';
    else {
      if (db.prepare("UPDATE main.domanda SET ricompensa = '', updated_at = ? WHERE id = ? AND ricompensa = ? AND origine = 'seed' AND seed_json IS NULL").run(adesso, d.id, d.ricompensa).changes !== 1) errore(`la ricompensa della domanda ${d.id} non si svuota`);
      svuotate++;
      esito = 'coincide: testo svuotato, il premio lo dicono gli effetti della voce';
    }
    esiti.push({ id: d.id, data: d.data, tipo: d.tipo, guida: { ...atteso, citazione: g.citazione, url: paginaSettimana(d.data) }, prima: prima.get(d.id) ?? ora, dopo: statoDomanda(db, d.id), esito });
  }
  return { esiti, svuotate };
}

/** L'audit: la prima esecuzione sempre, le successive solo se hanno cambiato qualcosa. */
function scriviAudit(db: AppDatabase, esecuzione: Record<string, unknown>, cambiato: boolean): void {
  const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(AUDIT) as string | undefined;
  if (vecchio && !cambiato) return;
  let esecuzioni: unknown[] = [];
  if (vecchio) { try { const v = JSON.parse(vecchio) as { esecuzioni?: unknown }; esecuzioni = Array.isArray(v.esecuzioni) ? v.esecuzioni : []; } catch { esecuzioni = []; } }
  db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
    .run(AUDIT, JSON.stringify({
      migrazione: 315, lotto: 'O8-1', decisione: `2026-10-31, risposta dell’utente: ${DECISIONE}`, fonte: FONTE,
      regola: 'voci allineate solo se testo ed effetti sono quelli letti il 2026-10-31 (anche registrate in una partita: decisione dell’utente sulle voci delle domande); voci nuove solo se il giorno non ha già una voce che segna la domanda; ricompensa svuotata solo dove il premio dell’unica voce coincide con quello della guida, su righe mai corrette; le partite non si toccano',
      daFareNellaPartita: 'Nella partita 1 le ricevute non cambiano. Ann ♪♪ del 25 aprile entra togliendo e rimettendo la spunta della voce 5fc91cc4; togliendo la spunta di 6be2c902 (19 maggio) o di b8096fe6 (26 maggio) la ricevuta di allora toglie anche il quiz TV 68 o 69.',
      esecuzioni: [...esecuzioni, { il: new Date().toISOString(), ...esecuzione }],
    }));
}

export const migration315: Migration = {
  id: 315,
  name: 'domande_premi_della_guida',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['domanda', 'giorno', 'voce_giornata', 'voce_effetto', 'voce_effetto_transizione', 'dati_guida']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 315, tabella: t }, 'tabella assente: niente da fare'); return; }
    }
    for (const c of ['da_rivedere', 'aggiunta_da']) if (!haColonna(db, 'voce_giornata', c)) errore(`manca la colonna ${c} delle voci`);
    const adesso = new Date().toISOString();
    const partiteAttaccate = (db.prepare('PRAGMA database_list').all() as Array<{ name: string }>).some((s) => s.name === 'utente');
    const partitePrima = partiteAttaccate ? improntaPartite(db) : null;
    const partite = tabellePartiteConVoce(db);
    const prima = new Map((db.prepare('SELECT id FROM main.domanda ORDER BY id').pluck().all() as number[]).map((id) => [id, statoDomanda(db, id)] as const));
    const esitiVoci: EsitoConDati[] = [];
    const vociScritte = allineaVoci(db, partite, adesso, esitiVoci);
    const esitiNuove: EsitoConDati[] = [];
    const vociCreate = vociNuove(db, partite, adesso, esitiNuove);
    const domande = ricompense(db, prima, adesso);
    if (partiteAttaccate && improntaPartite(db) !== partitePrima) errore('le partite risultano cambiate');
    const conteggi = {
      vociAllineate: vociScritte, vociCreate, ricompenseSvuotate: domande.svuotate,
      // il quiz TV sta nella sua voce: dopo l'allineamento 0 (sul pacchetto iniziale, senza le partite, le voci non si toccano e restano 5)
      vociConPiuDomande: db.prepare("SELECT COUNT(*) FROM (SELECT voce_uid FROM main.voce_effetto WHERE tipo = 'domanda' GROUP BY voce_uid HAVING COUNT(*) > 1)").pluck().get() as number,
      ricompenseInTesto: db.prepare("SELECT COUNT(*) FROM main.domanda WHERE ricompensa <> ''").pluck().get() as number,
      domandeDaVedere: domande.esiti.filter((e) => e.esito.endsWith('da vedere')).length,
    };
    const cambiato = vociScritte + vociCreate + domande.svuotate > 0;
    if (cambiato) invalidaCacheDiGioco();
    scriviAudit(db, { conteggi, voci: esitiVoci, vociNuove: esitiNuove, domande: domande.esiti }, cambiato);
    logger.info({ migrazione: 315, ...conteggi }, 'domande in classe e quiz TV: premio della guida negli effetti delle voci');
  },
};
