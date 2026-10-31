// ============================================================
// Migrazione 314 — decisioni dell'utente del 31 ottobre: risultati del 20 maggio, quiz di Ore no Beko, Dote doppia dello studio, due avvisi
// ============================================================
//
// L13, chiusura delle domande aperte (risposte dell'utente del 2026-10-31). Ogni scrittura solo se il dato è ancora esattamente come letto
// sulla copia dei dati (testo della voce ed effetti uno per uno; attività ed eventi della guida mai corretti dall'utente).
//   (1) «il 20/05 deve valere il premio previsto dall'esame in base al piazzamento»: la voce dei risultati del 20 maggio (4ddc2508) perde il
//       Fascino ♪♪ fisso e prende l'effetto «esame» (esame-1: alla spunta si sceglie il piazzamento, che dà il premio), come la voce del
//       24 ottobre nella 311; la nota («Tra i primi 10 … Fascino +3 / Sopra la media … Fascino +2»), ora tutta nei premi dell'esame, si toglie
//       conservando il testo di prima.
//   (2) «per Ore no beko se precisato valore diverso di perizia nel diario il diario prevale su quella prevista per il turno. La discrepanza sta
//       nel fatto che quella standard non prevede la possibilità di segnare il bonus per aver fatto tutto bene»: il lavoro dichiara i suoi esiti
//       dalla guida italiana (https://www.allgamestaff.it/persona-5-royal/lavori-part-time/, letta il 31/10): turno senza quiz 3.600 ¥ e Perizia
//       ♪♪; quiz degli ordini con tutti gli ordini giusti 8.800 ¥ e ♪♪♪, tre giusti 6.000 ¥ e ♪♪, due giusti 3.600 ¥ e ♪♪, uno solo 2.600 ¥ e ♪.
//       La paga dell'esito entra al posto di quella base (`EsitoAttivita.paga`). Le Doti fisse dell'attività escono (le danno gli esiti, una
//       fonte sola, come il bagno e il centro battute). Le due voci del lavoro dicono il loro esito: il 6 maggio il turno senza quiz, l'8 maggio
//       (la voce dice «Fino a 8.800 yen, Perizia +3») il quiz con tutti gli ordini giusti, al posto della Perizia ♪♪♪ scritta nel turno: il
//       Diario prevale, ed è l'esito proposto alla spunta (si può cambiare).
//   (3) «Sullo studio ho inserito esplicitamente il bonus conoscenza perchè non si applicava quello fisso da solo»: ora il turno dello studio a
//       Leblanc dà la Conoscenza da solo, e la Dote scritta nella voce la darebbe una seconda volta. Escono le Doti fisse del 22 aprile e del
//       3 maggio; con la stessa regola quella del Triple Seven del 23 maggio (il turno dà già il Fascino ♪♪). Le altre voci con una Dote
//       fissa uguale a quella del loro turno si elencano nell'audit, non si toccano.
//   (4) «3 toglili li rivedremo quando arriveremo lì»: gli eventi «consiglio» del 19 agosto (Futaba, id 82) e del 17 dicembre (Shido, id 136)
//       escono dal Calendario; la riga intera resta nell'audit. Solo se nessuna voce vi è collegata.
// Le voci (1)-(3) sono spuntate nella partita 1: l'utente ha deciso di convertirle lo stesso (decisione 23, caso c, risolto). Le ricevute della
// partita non si toccano (impronta di tutto lo schema `utente` prima e dopo): l'annullo della spunta legge le ricevute, e rimettendola valgono
// gli effetti nuovi. Idempotente: la seconda volta non trova niente da fare e non scrive. Audit in `dati_guida.audit-314-chiusure-l13`.
// Solo `main`.
// ============================================================

import { createHash } from 'node:crypto';
import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { canonico, convertiVoce, tabellePartiteConVoce, type Esito } from './fbisOndata5.js';
import { normalizzaEffettoVoce, type EffettoVoce } from '../../../shared/effettiVoce.js';
import { normalizzaEsitiAttivita } from '../../../shared/esitiAttivita.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-314-chiusure-l13';
const LOTTO = 'L13-chiusure-314';
const RISPOSTA = '2026-10-31, risposta dell’utente alle domande aperte: «il 20/05 deve valere il premio previsto dall’esame in base al piazzamento. per Ore no beko se precisato valore diverso di perizia nel diario il diario prevale su quella prevista per il turno. La discrepanza sta nel fatto che quella standard non prevede la possibilità di segnare il bonus per aver fatto tutto bene. Sullo studio ho inserito esplicitamente il bonus conoscenza perchè non si applicava quello fisso da solo. […] 3 toglili li rivedremo quando arriveremo lì»';
const FONTE_LAVORI = 'https://www.allgamestaff.it/persona-5-royal/lavori-part-time/';
const errore = (motivo: string): never => { throw new Error(`314: ${motivo}; nessuna modifica applicata.`); };

type EsitoConDati = Esito & { prima?: unknown; dopo?: unknown };

/** Una voce da convertire: gli effetti come sono oggi e come diventano (in ordine), con le parole dell'utente che lo decidono. */
interface Conversione { uid: string; data: string; azione: string; prima: EffettoVoce[]; dopo: EffettoVoce[]; motivo: string; decisione: string }

const ORE_NO_BEKO = 'lavoro-ore-no-beko';
const D_ESAME = '«il 20/05 deve valere il premio previsto dall’esame in base al piazzamento»';
const D_BEKO = '«per Ore no beko se precisato valore diverso di perizia nel diario il diario prevale su quella prevista per il turno»';
const D_STUDIO = '«Sullo studio ho inserito esplicitamente il bonus conoscenza perchè non si applicava quello fisso da solo»';

const VOCI: Conversione[] = [
  { uid: '4ddc2508f2883e98bc61661ad1a1a5df', data: '05-20', azione: 'Vedi la valutazione conseguita all\'esame.',
    prima: [{ tipo: 'dote', dote: 'fascino', note: 2 }], dopo: [{ tipo: 'esame', esame: 'esame-1' }],
    motivo: 'risultati dell’esame di metà semestre 1 il 20 maggio: il Fascino ♪♪ fisso era il premio di un piazzamento, ora scelto alla spunta (effetto «esame»)', decisione: D_ESAME },
  { uid: '82a5443617ef8b45dbddce7a2e54fb91', data: '05-06', azione: 'Central Street. Primo turno di lavoro al Beef Bowl Shop',
    prima: [{ tipo: 'turno', attivita: ORE_NO_BEKO }], dopo: [{ tipo: 'turno', attivita: ORE_NO_BEKO, esito: 'turno' }],
    motivo: 'primo turno a Ore no Beko senza quiz (la voce dice «3.600 yen, Perizia +2»): esito «Turno senza quiz» proposto alla spunta', decisione: D_BEKO },
  { uid: '99acfe68b1637d06c0cca0ec68de7d64', data: '05-08', azione: 'Secondo turno di lavoro al Beef Bowl Shop: memorizzare le ordinazioni casuali',
    prima: [{ tipo: 'turno', attivita: ORE_NO_BEKO, doti: [{ dote: 'perizia', note: 3 }] }], dopo: [{ tipo: 'turno', attivita: ORE_NO_BEKO, esito: 'quiz-tutti-giusti' }],
    motivo: 'quiz degli ordini a Ore no Beko (la voce dice «Fino a 8.800 yen, Perizia +3»): la Perizia ♪♪♪ del turno diventa l’esito «tutti gli ordini giusti», proposto alla spunta (il Diario prevale)', decisione: D_BEKO },
  { uid: 'b8efc7f09a6026a0a3b6c10be2e98b1d', data: '04-22', azione: 'Leblanc: studiare sul Divanetto al piano inferiore (opzione «Studia»)',
    prima: [{ tipo: 'dote', dote: 'conoscenza', note: 2 }, { tipo: 'turno', attivita: 'studio-leblanc' }], dopo: [{ tipo: 'turno', attivita: 'studio-leblanc' }],
    motivo: 'studio a Leblanc: la Conoscenza la dà il turno dell’attività (♪♪, ♪♪♪ con la pioggia); la Dote fissa la dava una seconda volta', decisione: D_STUDIO },
  { uid: '865c3aa8b9e10f1f08b60174b51a52bb', data: '05-03', azione: 'Studia sul tavolino del Leblanc',
    prima: [{ tipo: 'dote', dote: 'conoscenza', note: 2 }, { tipo: 'turno', attivita: 'studio-leblanc' }], dopo: [{ tipo: 'turno', attivita: 'studio-leblanc' }],
    motivo: 'studio a Leblanc: la Conoscenza la dà il turno dell’attività (♪♪, ♪♪♪ con la pioggia); la Dote fissa la dava una seconda volta', decisione: D_STUDIO },
  { uid: '0d1f1318757c0119a6407810ad3a245e', data: '05-23', azione: 'Shibuya - Convenience Store. Triple Seven: lavora part-time.',
    prima: [{ tipo: 'turno', attivita: 'lavoro-triple-seven' }, { tipo: 'dote', dote: 'fascino', note: 2 }], dopo: [{ tipo: 'turno', attivita: 'lavoro-triple-seven' }],
    motivo: 'turno al Triple Seven: il Fascino ♪♪ lo dà il turno del lavoro; la Dote fissa lo dava una seconda volta (stessa regola dello studio)', decisione: D_STUDIO },
];
/** La nota del 20 maggio, tutta nei premi dell'esame: si toglie conservando il testo di prima. */
const NOTA_0520 = 'Tra i primi 10 della classe => Fascino +3 Note\nSopra la media => Fascino +2 Note';

/** Gli esiti di Ore no Beko dalla guida italiana; le Doti fisse dell'attività come sono oggi (escono). */
const ESITI_BEKO = {
  modo: 'scelta',
  esiti: [
    { chiave: 'turno', nome: 'Turno senza quiz', gruppo: null, articolo: null, condizioni: [], doti: [{ dote: 'perizia', note: 2 }], premi: null },
    { chiave: 'quiz-tutti-giusti', nome: 'Quiz degli ordini · tutti giusti', gruppo: 'Quiz degli ordini', articolo: null, condizioni: [], doti: [{ dote: 'perizia', note: 3 }], premi: null, paga: 8800 },
    { chiave: 'quiz-tre-giusti', nome: 'Quiz degli ordini · tre giusti', gruppo: 'Quiz degli ordini', articolo: null, condizioni: [], doti: [{ dote: 'perizia', note: 2 }], premi: null, paga: 6000 },
    { chiave: 'quiz-due-giusti', nome: 'Quiz degli ordini · due giusti', gruppo: 'Quiz degli ordini', articolo: null, condizioni: [], doti: [{ dote: 'perizia', note: 2 }], premi: null },
    { chiave: 'quiz-uno-giusto', nome: 'Quiz degli ordini · uno solo giusto', gruppo: 'Quiz degli ordini', articolo: null, condizioni: [], doti: [{ dote: 'perizia', note: 1 }], premi: null, paga: 2600 },
  ],
};
const EFFETTI_BEKO_PRIMA = [{ effetto: { famiglia: 'dote', dote: 'perizia', note: 2 } }, { effetto: { famiglia: 'dote', dote: 'perizia', note: 2 }, ripetuto: true }];

/** Gli eventi «consiglio» da togliere, come sono oggi. */
const EVENTI = [
  { id: 82, data: '08-19', tipo: 'consiglio', titolo: 'Termine consigliato per completare il Palazzo di Futaba' },
  { id: 136, data: '12-17', tipo: 'consiglio', titolo: 'Termine consigliato per cambiare il cuore di Shido (elezioni 18 dicembre)' },
];

/** L'impronta di tutto lo schema `utente` (ogni tabella, ogni riga): alla fine deve essere identica. */
function improntaPartite(db: AppDatabase): string {
  const h = createHash('sha256');
  for (const t of (db.prepare("SELECT name FROM utente.sqlite_master WHERE type = 'table' ORDER BY name").all() as Array<{ name: string }>).map((x) => x.name)) {
    h.update(`#${t}\n`);
    for (const r of db.prepare(`SELECT * FROM utente."${t}"`).iterate()) h.update(JSON.stringify(r) + '\n');
  }
  return h.digest('hex');
}

/** Gli effetti della voce oggi, in ordine: uid e valore normalizzato (null se illeggibile). */
function effettiDi(db: AppDatabase, uid: string): Array<{ uid: string; effetto: EffettoVoce | null }> {
  return (db.prepare('SELECT uid, dati_json FROM main.voce_effetto WHERE voce_uid = ? ORDER BY ordine').all(uid) as Array<{ uid: string; dati_json: string }>)
    .map((r) => { try { return { uid: r.uid, effetto: normalizzaEffettoVoce(JSON.parse(r.dati_json)) }; } catch { return { uid: r.uid, effetto: null }; } });
}
/** Gli effetti di oggi sono, uno per uno e in ordine, quelli dati? */
const sono = (oggi: ReadonlyArray<{ effetto: EffettoVoce | null }>, attesi: readonly EffettoVoce[]): boolean =>
  oggi.length === attesi.length && oggi.every((e, i) => e.effetto !== null && canonico(e.effetto) === canonico(attesi[i]));

// ---- (2) gli esiti di Ore no Beko ----

function esitiOreNoBeko(db: AppDatabase, esiti: EsitoConDati[]): number {
  const chiave = `attivita:${ORE_NO_BEKO}`;
  if (!haColonna(db, 'attivita', 'esiti_json') || !haColonna(db, 'attivita', 'effetti_json')) { esiti.push({ chiave, esito: 'colonne degli esiti o degli effetti assenti: niente da fare' }); return 0; }
  const normalizzati = normalizzaEsitiAttivita(ESITI_BEKO);
  if (!normalizzati || canonico(normalizzati) !== canonico(ESITI_BEKO)) errore('gli esiti di Ore no Beko non sono validi');
  const r = db.prepare('SELECT esiti_json, effetti_json, origine, seed_json, paga_yen FROM main.attivita WHERE chiave = ?').get(ORE_NO_BEKO) as
    { esiti_json: string | null; effetti_json: string | null; origine: string; seed_json: string | null; paga_yen: number | null } | undefined;
  if (!r) { esiti.push({ chiave, esito: 'attività assente' }); return 0; }
  let letti: unknown;
  try { letti = r.esiti_json === null ? null : JSON.parse(r.esiti_json); } catch { letti = undefined; }
  if (letti != null && canonico(letti) === canonico(ESITI_BEKO)) return 0; // già scritti
  if (r.origine !== 'seed' || r.seed_json !== null) { esiti.push({ chiave, esito: 'corretta dall’utente: lasciata' }); return 0; }
  let effetti: unknown;
  try { effetti = r.effetti_json === null ? null : JSON.parse(r.effetti_json); } catch { effetti = undefined; }
  if (r.esiti_json !== null || effetti === undefined || canonico(effetti) !== canonico(EFFETTI_BEKO_PRIMA) || r.paga_yen !== 3600) { esiti.push({ chiave, esito: 'esiti, effetti o paga diversi da quelli letti: lasciata' }); return 0; }
  if (db.prepare("UPDATE main.attivita SET esiti_json = ?, effetti_json = '[]' WHERE chiave = ? AND esiti_json IS NULL AND effetti_json = ? AND origine = 'seed' AND seed_json IS NULL")
    .run(canonico(ESITI_BEKO), ORE_NO_BEKO, r.effetti_json).changes !== 1) errore('gli esiti di Ore no Beko non si scrivono');
  esiti.push({ chiave, esito: `esiti del quiz degli ordini dalla guida (${FONTE_LAVORI}); Doti fisse tolte (le danno gli esiti)`, prima: { esiti_json: null, effetti_json: EFFETTI_BEKO_PRIMA }, dopo: { esiti_json: ESITI_BEKO, effetti_json: [] } });
  return 1;
}

// ---- (1)-(3) le voci ----

function convertiLeVoci(db: AppDatabase, partite: string[] | null, adesso: string, esiti: EsitoConDati[]): number {
  let scritte = 0;
  const conEsiti = normalizzaEsitiAttivitaSalvati(db.prepare('SELECT esiti_json FROM main.attivita WHERE chiave = ?').pluck().get(ORE_NO_BEKO));
  const risultati0520 = db.prepare('SELECT data_risultati FROM main.esame WHERE chiave = ?').pluck().get('esame-1') as string | null | undefined;
  for (const v of VOCI) {
    const chiave = `voce:${v.data}:${v.uid}`;
    const oggi = effettiDi(db, v.uid);
    if (!oggi.length && !db.prepare('SELECT 1 FROM main.voce_giornata WHERE uid = ?').get(v.uid)) { esiti.push({ chiave, esito: 'voce assente' }); continue; }
    if (sono(oggi, v.dopo)) continue; // già convertita
    // il turno con un esito vale solo se il lavoro dichiara quell'esito (scritto qui sopra); l'esame solo con i risultati il 20 maggio
    const esitoMancante = v.dopo.find((e) => e.tipo === 'turno' && e.esito && !conEsiti.has(e.esito));
    if (esitoMancante) { esiti.push({ chiave, esito: 'Ore no Beko senza gli esiti attesi: voce non convertita' }); continue; }
    if (v.dopo.some((e) => e.tipo === 'esame') && risultati0520 !== v.data) { esiti.push({ chiave, esito: 'i risultati di esame-1 non sono il 20 maggio: voce non convertita' }); continue; }
    if (!sono(oggi, v.prima)) { esiti.push({ chiave, esito: 'effetti diversi da quelli letti: voce lasciata' }); continue; }
    // ciò che resta con lo stesso valore tiene il suo uid; un turno che cambia (Doti → esito) è una modifica dello stesso effetto; il resto esce
    // o entra. Gli uid di oggi si leggono da questa copia, non si scrivono nel codice
    const presi = new Set<number>();
    const modifica: Array<{ uid: string; effetto: EffettoVoce }> = [];
    const togli: string[] = [];
    for (const e of oggi) {
      const uguale = v.dopo.findIndex((d, k) => !presi.has(k) && canonico(d) === canonico(e.effetto));
      if (uguale >= 0) { presi.add(uguale); continue; }
      const stessoTurno = v.dopo.findIndex((d, k) => !presi.has(k) && d.tipo === 'turno' && e.effetto?.tipo === 'turno' && d.attivita === e.effetto.attivita);
      if (stessoTurno >= 0) { presi.add(stessoTurno); modifica.push({ uid: e.uid, effetto: v.dopo[stessoTurno]! }); continue; }
      togli.push(e.uid);
    }
    const aggiungi = v.dopo.flatMap((effetto, k) => (presi.has(k) ? [] : [{ seme: `${LOTTO}:${v.uid}:${k}:${effetto.tipo}`, effetto }]));
    const c = convertiVoce(db, { uid: v.uid, data: v.data, azione: v.azione, lotto: LOTTO, attesi: v.prima.map((effetto) => ({ uid: null, effetto })), togli, aggiungi,
      ...(modifica.length ? { modifica } : {}), motivo: v.motivo, ancheSpuntata: { decisione: v.decisione } }, partite, adesso);
    esiti.push(c);
    if (!c.esito.startsWith('convertita')) continue;
    scritte++;
    // gli effetti riletti devono essere, in ordine, quelli attesi (il Triple Seven ha il turno prima della Dote: resta il turno)
    if (!sono(effettiDi(db, v.uid), v.dopo)) errore(`effetti della voce ${v.uid} diversi da quelli attesi dopo la conversione`);
  }
  return scritte;
}

/** Le chiavi degli esiti salvati di un'attività (vuoto se non ne dichiara o se illeggibili). */
function normalizzaEsitiAttivitaSalvati(grezzo: unknown): Set<string> {
  if (typeof grezzo !== 'string') return new Set();
  try { return new Set(normalizzaEsitiAttivita(JSON.parse(grezzo))?.esiti.map((e) => e.chiave) ?? []); } catch { return new Set(); }
}

/** (1) La nota del 20 maggio, già tutta nei premi dell'esame: tolta conservando il testo di prima (come la voce del 24 ottobre nella 311). */
function notaDel20Maggio(db: AppDatabase, adesso: string, esiti: EsitoConDati[]): number {
  const v = VOCI[0]!;
  const chiave = `nota:${v.data}:${v.uid}`;
  if (!sono(effettiDi(db, v.uid), v.dopo)) return 0; // la voce non è convertita: la nota resta con il Fascino che descrive
  if (!haColonna(db, 'voce_giornata', 'testo_precedente_json') || !haColonna(db, 'voce_giornata', 'motivo_revisione')) { esiti.push({ chiave, esito: 'colonne del testo precedente assenti: nota lasciata' }); return 0; }
  const r = db.prepare('SELECT data, azione, note, riferimento_tipo, riferimento_chiave, riferimento_testo, aggiunta_da, testo_precedente_json FROM main.voce_giornata WHERE uid = ?').get(v.uid) as
    { data: string; azione: string; note: string | null; riferimento_tipo: string | null; riferimento_chiave: string | null; riferimento_testo: string | null; aggiunta_da: string | null; testo_precedente_json: string | null } | undefined;
  if (!r) { esiti.push({ chiave, esito: 'voce assente' }); return 0; }
  if (r.note === null && r.testo_precedente_json !== null) return 0; // già tolta
  if (r.data !== v.data || r.azione !== v.azione || r.note !== NOTA_0520 || r.testo_precedente_json !== null || r.aggiunta_da !== null) { esiti.push({ chiave, esito: 'voce diversa da quella attesa o modificata dall’utente: nota lasciata' }); return 0; }
  const precedente = JSON.stringify({ azione: r.azione, note: r.note, riferimento_tipo: r.riferimento_tipo, riferimento_chiave: r.riferimento_chiave, riferimento_testo: r.riferimento_testo });
  const motivo = '2026-10-31 (L13, decisione dell’utente sul 20 maggio): la nota diceva i premi dei piazzamenti (Fascino ♪♪♪ ai primi 10, ♪♪ sopra la media), ora nei premi dell’esame e scelti alla spunta: tolta, il dato resta nell’esame.';
  if (db.prepare('UPDATE main.voce_giornata SET note = NULL, testo_precedente_json = ?, motivo_revisione = ?, updated_at = ? WHERE uid = ? AND note = ? AND testo_precedente_json IS NULL')
    .run(precedente, motivo, adesso, v.uid, NOTA_0520).changes !== 1) errore('la nota della voce del 20 maggio non si toglie');
  esiti.push({ chiave, esito: 'nota tolta (testo di prima conservato)', prima: NOTA_0520, dopo: null });
  return 1;
}

/** (3) Le altre voci con una Dote fissa uguale a una che il loro turno dà già (stessa Dote): solo elencate, per la verifica sistematica. */
function altreDotiDoppie(db: AppDatabase): Array<{ voce: string; data: string; attivita: string; dote: string }> {
  const out: Array<{ voce: string; data: string; attivita: string; dote: string }> = [];
  const decise = new Set(VOCI.map((v) => v.uid));
  const turni = db.prepare("SELECT DISTINCT e.voce_uid, v.data, e.chiave FROM main.voce_effetto e JOIN main.voce_giornata v ON v.uid = e.voce_uid WHERE e.tipo = 'turno' ORDER BY v.data, e.voce_uid").all() as Array<{ voce_uid: string; data: string; chiave: string }>;
  const dotiAttivita = new Map<string, Set<string>>();
  for (const t of turni) {
    if (decise.has(t.voce_uid)) continue;
    if (!dotiAttivita.has(t.chiave)) {
      const r = db.prepare('SELECT * FROM main.attivita WHERE chiave = ?').get(t.chiave) as { effetti_json?: string | null; esiti_json?: string | null } | undefined;
      const s = new Set<string>();
      try { for (const x of JSON.parse(r?.effetti_json ?? '[]') as Array<{ effetto?: { famiglia?: string; dote?: string } }>) if (x.effetto?.famiglia === 'dote' && x.effetto.dote) s.add(x.effetto.dote); } catch { /* illeggibile: nessuna */ }
      try { for (const e of normalizzaEsitiAttivita(JSON.parse(r?.esiti_json ?? 'null'))?.esiti ?? []) for (const d of e.doti) s.add(d.dote); } catch { /* illeggibile: nessuna */ }
      dotiAttivita.set(t.chiave, s);
    }
    const doti = dotiAttivita.get(t.chiave)!;
    for (const e of effettiDi(db, t.voce_uid)) if (e.effetto?.tipo === 'dote' && doti.has(e.effetto.dote)) out.push({ voce: t.voce_uid, data: t.data, attivita: t.chiave, dote: e.effetto.dote });
  }
  return out;
}

// ---- (4) gli avvisi ----

function togliAvvisi(db: AppDatabase, esiti: EsitoConDati[]): number {
  if (!esisteTabella(db, 'evento_calendario')) return 0;
  let tolti = 0;
  for (const ev of EVENTI) {
    const chiave = `evento:${ev.data}:${ev.id}`;
    const r = db.prepare('SELECT * FROM main.evento_calendario WHERE id = ?').get(ev.id) as Record<string, unknown> | undefined;
    if (!r) continue; // già tolto
    if (r.data !== ev.data || r.tipo !== ev.tipo || r.titolo !== ev.titolo || r.origine !== 'seed' || r.seed_json !== null) { esiti.push({ chiave, esito: 'evento diverso da quello letto o corretto dall’utente: lasciato' }); continue; }
    if (esisteTabella(db, 'evento_calendario_voce') && db.prepare('SELECT 1 FROM main.evento_calendario_voce WHERE evento_id = ? LIMIT 1').get(ev.id)) { esiti.push({ chiave, esito: 'collegato a una voce del Diario: lasciato' }); continue; }
    if (db.prepare('DELETE FROM main.evento_calendario WHERE id = ? AND data = ? AND tipo = ? AND titolo = ?').run(ev.id, ev.data, ev.tipo, ev.titolo).changes !== 1) errore(`l'evento ${ev.id} non si toglie`);
    esiti.push({ chiave, esito: 'avviso «consiglio» tolto dal Calendario (da rivedere quando si arriva lì)', prima: r, dopo: null });
    tolti++;
  }
  return tolti;
}

/** L'audit: la prima esecuzione sempre, le successive solo se hanno cambiato qualcosa. */
function scriviAudit(db: AppDatabase, esecuzione: Record<string, unknown>, cambiato: boolean): void {
  const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(AUDIT) as string | undefined;
  if (vecchio && !cambiato) return;
  let esecuzioni: unknown[] = [];
  if (vecchio) { try { const v = JSON.parse(vecchio) as { esecuzioni?: unknown }; esecuzioni = Array.isArray(v.esecuzioni) ? v.esecuzioni : []; } catch { esecuzioni = []; } }
  db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
    .run(AUDIT, JSON.stringify({
      migrazione: 314, risposta: RISPOSTA, fonte: FONTE_LAVORI,
      regola: 'voci convertite solo se testo ed effetti sono quelli letti (anche spuntate: decisione dell’utente per ciascuna); attività ed eventi solo se mai corretti dall’utente; le partite non si toccano',
      daFareNellaPartita: 'Nella partita 1 le voci del 20 maggio e dell’8 maggio danno il nuovo solo togliendo e rimettendo la spunta (piazzamento all’esame; paga del quiz). Lo studio e il Triple Seven hanno già la Dote una volta: niente da fare.',
      esecuzioni: [...esecuzioni, { il: new Date().toISOString(), ...esecuzione }],
    }));
}

export const migration314: Migration = {
  id: 314,
  name: 'chiusure_l13_esame_lavoro_studio_avvisi',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['attivita', 'esame', 'voce_giornata', 'voce_effetto', 'voce_effetto_transizione', 'dati_guida']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 314, tabella: t }, 'tabella assente: niente da fare'); return; }
    }
    const adesso = new Date().toISOString();
    const partiteAttaccate = (db.prepare('PRAGMA database_list').all() as Array<{ name: string }>).some((s) => s.name === 'utente');
    const partitePrima = partiteAttaccate ? improntaPartite(db) : null;
    const esitiAttivita: EsitoConDati[] = [];
    const attivitaScritte = esitiOreNoBeko(db, esitiAttivita);
    const esitiVoci: EsitoConDati[] = [];
    const vociScritte = convertiLeVoci(db, tabellePartiteConVoce(db), adesso, esitiVoci);
    const noteTolte = notaDel20Maggio(db, adesso, esitiVoci);
    const esitiEventi: EsitoConDati[] = [];
    const eventiTolti = togliAvvisi(db, esitiEventi);
    if (partiteAttaccate && improntaPartite(db) !== partitePrima) errore('le partite risultano cambiate');
    const conteggi = { attivitaScritte, vociScritte, noteTolte, eventiTolti };
    const cambiato = attivitaScritte + vociScritte + noteTolte + eventiTolti > 0;
    if (cambiato) invalidaCacheDiGioco();
    scriviAudit(db, { conteggi, attivita: esitiAttivita, voci: esitiVoci, eventi: esitiEventi, altreDotiDoppie: altreDotiDoppie(db) }, cambiato);
    logger.info({ migrazione: 314, ...conteggi }, 'chiusure L13: esame del 20 maggio, esiti di Ore no Beko, Dote doppia dello studio, avvisi tolti');
  },
};
