// ============================================================
// 234 — le voci del Diario dopo il 05-31 collegate agli esiti delle loro attività; «Cosmo Tower» nel paragrafo di sblocco (L13, ondata 2)
// ============================================================
//
// Scelte dell'utente del 2026-10-25 («sistema il collegamento del 3. per 1 e 2 ok allinea»):
//   (1) centro battute: invariato (3 colpi o più = ♪♪♪): questa migrazione non lo tocca;
//   (2) il paragrafo «Sblocco (dalla guida)» della `sfida-big-bang-burger` (nota tenuta dalla 229) dice «Cosmo Town Burger»: si allinea
//       al nome degli articoli e degli esiti, «Cosmo Tower Burger». Solo il nome: i ranghi restano negli articoli come fonte unica e la
//       frase non cambia altrimenti;
//   (3) le 9 voci di `CANDIDATI_COLLEGAMENTO_ESITI` (`server/services/collegamentoVociEsiti.ts`, tutte dopo il 05-31) si collegano agli
//       esiti con la regola di `pianoCollegamentoVoceEsiti`: la voce diventa di tipo «attività» con il collegamento all'attività; gli
//       effetti `dote` sulle Doti che gli esiti dell'attività dichiarano escono (un solo punto per il valore: l'esito); restano gli altri
//       (il Coraggio ♪ della pioggia al bagno); si aggiunge un effetto `turno` dell'attività. L'esito atteso è preselezionato solo dove
//       il testo o le note della voce lo scrivono chiaramente, altrimenti resta «da scegliere» alla spunta; il bagno pubblico è
//       automatico (l'esito si ricava dal giorno, la voce non ne indica uno).
//
// Conservativa. Una voce si tocca solo se: è dopo il 05-31; è ancora esattamente come letta il 2026-10-25 sulla copia dei dati reali
// (data, azione, note, tipo, nessun collegamento, nessuna revisione, `updated_at = created_at`, mai aggiunta dall'utente) con gli effetti
// attesi uno per uno (uid, ordine, valore, origine `regola`) e la fonte «convertita»; non ha decisioni sugli effetti né raccordi
// (`operazione_effetti_voce`, `proposta_effetto_voce`); l'attività dichiara gli esiti nel modo atteso (dalla 233) e accetta turni;
// NESSUNA partita la cita (spunta, ricevute, proposte: ogni tabella dello schema `utente` con la colonna `voce_uid`). Le spunte vivono
// in `partite.db`, attaccato come schema `utente` dalla stessa connessione (`initDb`): se lo schema non c'è o non ha
// `spunta_voce_partita`, le voci NON si toccano e l'audit lo dichiara. `partite.db` non si scrive mai. L'attività si tocca solo se è
// della guida mai corretta (`origine = 'seed'`, `seed_json IS NULL`) e il paragrafo c'è esatto.
// Gli effetti si scrivono come li scrive `salvaEffettiVoce` (`dati_json` canonico, `chiave` dell'effetto, registro di transizione con
// l'impronta della lista); `updated_at` della voce non cambia (la voce resta «della guida»: la traccia della modifica è l'audit).
// L'uid del turno nuovo è derivato dall'uid della voce (stesso dato su ogni copia).
// Audit: prima e dopo, voce per voce, e le voci saltate con il motivo, in `dati_guida.audit-234-voci-collegate-esiti`. Controlli finali:
// impronta identica di tutte le altre righe delle tabelle toccate e delle tabelle vicine; effetti scritti riletti validi. Idempotente:
// con l'audit presente non rifà niente.
// ============================================================

import { createHash } from 'node:crypto';
import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { colonneDi, esisteTabella, haColonna } from './pulizieL11.js';
import { leggiEsitiAttivita } from '../../../shared/esitiAttivita.js';
import { normalizzaEffettoVoce, type EffettoVoce } from '../../../shared/effettiVoce.js';
import { eTracciamentoAttivita, tracciamentoPerTipo } from '../../../shared/attivita.js';

const AUDIT = 'audit-234-voci-collegate-esiti';
const errore = (motivo: string): never => { throw new Error(`234: ${motivo}; nessuna modifica applicata.`); };

const BBB = 'sfida-big-bang-burger';
const BAGNO = 'bagno-pubblico-yongen-jaya';
const ULTIMO_GIORNO_VALIDATO = '05-31';

const PARAGRAFO_PRIMA = 'Sblocco (dalla guida): Tre sfide progressive: Comet Burger (Coraggio/Conoscenza/Perizia Rango 2), Gravity Burger (Rango 3), Cosmo Town Burger (Rango 4)';
const PARAGRAFO_DOPO = 'Sblocco (dalla guida): Tre sfide progressive: Comet Burger (Coraggio/Conoscenza/Perizia Rango 2), Gravity Burger (Rango 3), Cosmo Tower Burger (Rango 4)';

const dote = (d: 'coraggio' | 'conoscenza' | 'fascino' | 'perizia', note: 1 | 2): EffettoVoce => ({ tipo: 'dote', dote: d, note });

interface Candidata {
  uid: string; data: string; azione: string; note: string; tipo: string;
  attivita: typeof BBB | typeof BAGNO; esito: string | null; motivo: string;
  /** Gli effetti attesi oggi, in ordine (uid e valore). */
  effetti: Array<{ uid: string; effetto: EffettoVoce }>;
}

/** Le 9 voci, esattamente come lette il 2026-10-25 sulla copia dei dati reali, con l'esito atteso deciso dalla regola dell'utente. */
const CANDIDATE: Candidata[] = [
  { uid: '0f629a255e9feeca0d339f8f92f9e9b0', data: '06-04', tipo: 'dote', attivita: BBB, esito: null,
    azione: 'Burger Shop di Central Street: affrontare la sfida del Gravity Burger',
    note: 'Coraggio +2; serve per raggiungere Coraggio rango 3 e poter chiamare Kawakami. Conclude la giornata',
    motivo: 'la voce nomina la sfida ma non dice se è vinta o persa (solo Coraggio +2 fisso): esito da scegliere alla spunta',
    effetti: [{ uid: '6cf4f3e9e9390554128d1eab684d6ef9', effetto: dote('coraggio', 2) }] },
  { uid: '3e5106dec8bfe998093d39a88dbc301b', data: '06-07', tipo: 'attivita', attivita: BBB, esito: 'gravity-persa',
    azione: 'Big Bang Burger in Central Street: accettare la sfida (500 yen)',
    note: 'Non si vince, ma si ottiene Coraggio +2: il parametro Coraggio passa da Audace a Coraggioso',
    motivo: '«Non si vince» = sfida persa; Coraggio +2 alla sconfitta è solo la Gravity Burger (Comet +1, Cosmo Tower +3)',
    effetti: [{ uid: '199f64c9a881da1dfacb233c2c1da8f8', effetto: dote('coraggio', 2) }] },
  { uid: 'fb0ac49af6e48c2172f4250626e1c521', data: '08-14', tipo: 'attivita', attivita: BBB, esito: 'gravity-vinta',
    azione: 'Big Bang Burger Challenge: completarla con 2.000 yen',
    note: 'Distintivo #1, 5 Big Bang Burger; Coraggio +2, Conoscenza +2, Fascino +2, Perizia +2; Fascino raggiunge il massimo (Irresistibile)',
    motivo: '«completarla» = vinta; +2 alle quattro Doti, Distintivo #1 (1st Mate) e 5 Big Bang Burger sono la vittoria della Gravity Burger',
    effetti: [
      { uid: '3d29353f85b423ea2ea81d5a5ed4a916', effetto: dote('coraggio', 2) }, { uid: '90a319e1d460731ea4c737f7d24a1e12', effetto: dote('conoscenza', 2) },
      { uid: '91c4547b9fdbfa117afcd5c8d02c9c2a', effetto: dote('fascino', 2) }, { uid: '2cf0e1fb545ddd2c480e76c0cab36e8e', effetto: dote('perizia', 2) },
    ] },
  { uid: '3c0edc3d0692f34375c5db5c718248d0', data: '08-15', tipo: 'attivita', attivita: BBB, esito: 'cosmo-tower-vinta',
    azione: 'Big Bang Burger Challenge: consumare il panino (2.500 yen)',
    note: 'Distintivo del capitano, +12 punti statistica totali',
    motivo: 'Distintivo del capitano (Captain) e +12 totali (+3 alle quattro Doti) sono la vittoria della Cosmo Tower Burger',
    effetti: [] },
  { uid: '29c27bf247246474df1dfca749d0daad', data: '06-09', tipo: 'dote', attivita: BAGNO, esito: null, azione: 'Bagno pubblico', note: 'Fascino +2',
    motivo: 'bagno pubblico: esito automatico del giorno della settimana', effetti: [{ uid: 'f8ec1a9bdb6dd44b76fd406d85d34896', effetto: dote('fascino', 2) }] },
  { uid: '2bfee883c4f851300607c11ac6ba07c4', data: '06-13', tipo: 'dote', attivita: BAGNO, esito: null, azione: 'Bagno pubblico', note: 'Fascino +2, Coraggio +1',
    motivo: 'bagno pubblico: esito automatico del giorno della settimana; il Coraggio ♪ resta effetto proprio',
    effetti: [{ uid: '9102912b9079983329ec5a18e5c80eb8', effetto: dote('fascino', 2) }, { uid: '634232a4988ea59fcc62f24db41e6ad8', effetto: dote('coraggio', 1) }] },
  { uid: 'b33c622e3fa9d0bd032837a040dcd2bb', data: '06-16', tipo: 'dote', attivita: BAGNO, esito: null, azione: 'Bagno pubblico', note: 'Fascino +2, Coraggio +1',
    motivo: 'bagno pubblico: esito automatico del giorno della settimana; il Coraggio ♪ resta effetto proprio',
    effetti: [{ uid: '0af6664f2a14e3f861c27898d6556c27', effetto: dote('fascino', 2) }, { uid: '5b787393d92687ea5a118df960f77094', effetto: dote('coraggio', 1) }] },
  { uid: '995d18392fe29fc99f144b22dbde8708', data: '06-21', tipo: 'dote', attivita: BAGNO, esito: null, azione: 'Bagno pubblico', note: 'Fascino +2, Coraggio +1',
    motivo: 'bagno pubblico: esito automatico del giorno della settimana; il Coraggio ♪ resta effetto proprio',
    effetti: [{ uid: 'f18c160905641fab057decbd984a9212', effetto: dote('fascino', 2) }, { uid: '7bcddcd5fb3c3a543f7d08d4905eb972', effetto: dote('coraggio', 1) }] },
  { uid: '817e560d8cb82f8b861a01329b11aa9c', data: '07-06', tipo: 'dote', attivita: BAGNO, esito: null, azione: 'Bagno pubblico', note: 'Fascino +2, Coraggio +1',
    motivo: 'bagno pubblico: esito automatico del giorno della settimana; il Coraggio ♪ resta effetto proprio',
    effetti: [{ uid: '1992c51df64bcf55e83e8492db46671c', effetto: dote('fascino', 2) }, { uid: '5b3a78cc864fde30f33be6442348c4f4', effetto: dote('coraggio', 1) }] },
];

/** Lo stesso JSON canonico di `jsonCanonico` (`propostePartitaService`) per valori JSON semplici: chiavi ordinate, `undefined` tolti.
 *  Ripetuto qui perché una migrazione non importa da `server/services/` (convenzione di `pulizieL11`). */
function canonico(v: unknown): string {
  const ordina = (x: unknown): unknown => {
    if (x == null || typeof x === 'string' || typeof x === 'boolean') return x ?? null;
    if (typeof x === 'number' && Number.isFinite(x)) return x;
    if (Array.isArray(x)) return x.map(ordina);
    if (typeof x !== 'object') errore('valore non serializzabile');
    return Object.fromEntries(Object.entries(x as Record<string, unknown>).filter(([, y]) => y !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, y]) => [k, ordina(y)]));
  };
  return JSON.stringify(ordina(v));
}
const impronta = (v: unknown): string => createHash('sha256').update(canonico(v)).digest('hex');
/** La `chiave` di `voce_effetto` per i due tipi scritti o tenuti qui (come `chiaveEffetto` del motore). */
const chiaveDi = (e: EffettoVoce): string => e.tipo === 'dote' ? e.dote : e.tipo === 'turno' ? e.attivita : errore(`tipo d'effetto inatteso ${e.tipo}`);

/** Impronta delle righe di una tabella di `main` che soddisfano il filtro, senza le colonne indicate. */
function improntaRighe(db: AppDatabase, tabella: string, filtro: string, parametri: unknown[], senza: readonly string[] = []): string {
  const colonne = colonneDi(db, tabella).filter((c) => !senza.includes(c));
  const h = createHash('sha256');
  let n = 0;
  for (const r of db.prepare(`SELECT ${colonne.map((c) => `"${c}"`).join(', ')} FROM main."${tabella}" WHERE ${filtro} ORDER BY rowid`).iterate(...parametri)) { h.update(JSON.stringify(r) + '\n'); n++; }
  return `${n}:${h.digest('hex')}`;
}

/** Le tabelle dello schema `utente` con la colonna `voce_uid`, o null se lo schema non è attaccato o non ha le spunte (non si può verificare). */
function tabellePartiteConVoce(db: AppDatabase): string[] | null {
  const schemi = db.prepare('PRAGMA database_list').all() as Array<{ name: string }>;
  if (!schemi.some((s) => s.name === 'utente')) return null;
  const tabelle = (db.prepare("SELECT name FROM utente.sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>).map((t) => t.name);
  const conVoce = tabelle.filter((t) => (db.prepare(`PRAGMA utente.table_info("${t}")`).all() as Array<{ name: string }>).some((c) => c.name === 'voce_uid'));
  return conVoce.includes('spunta_voce_partita') ? conVoce : null;
}

interface RigaVoce { uid: string; data: string; genere: string; azione: string; note: string | null; tipo: string; riferimento_tipo: string | null; riferimento_chiave: string | null; riferimento_testo: string | null; aggiunta_da: string | null; testo_precedente_json: string | null; da_rivedere: number; created_at: string; updated_at: string }
interface RigaEffetto { uid: string; ordine: number; tipo: string; chiave: string | null; dati_json: string; origine: string }

/** Perché la voce non si tocca (null = si può collegare). Solo letture. */
function motivoPerSaltare(db: AppDatabase, c: Candidata, partite: string[]): string | null {
  if (c.data <= ULTIMO_GIORNO_VALIDATO) return 'voce fino al 05-31: validata dall’utente';
  const v = db.prepare('SELECT uid, data, genere, azione, note, tipo, riferimento_tipo, riferimento_chiave, riferimento_testo, aggiunta_da, testo_precedente_json, da_rivedere, created_at, updated_at FROM main.voce_giornata WHERE uid = ?').get(c.uid) as RigaVoce | undefined;
  if (!v) return 'voce assente';
  if (v.data !== c.data || v.data <= ULTIMO_GIORNO_VALIDATO) return 'giorno diverso da quello atteso';
  if (v.genere !== 'azione' || v.azione !== c.azione || v.note !== c.note || v.tipo !== c.tipo) return 'testo o tipo diversi da quelli attesi: modificata';
  if (v.riferimento_tipo !== null || v.riferimento_chiave !== null || v.riferimento_testo !== null) return 'ha già un collegamento';
  if (v.aggiunta_da !== null || v.testo_precedente_json !== null || v.da_rivedere !== 0 || v.updated_at !== v.created_at) return 'modificata o rivista dall’utente';
  const t = db.prepare('SELECT stato FROM main.voce_effetto_transizione WHERE voce_uid = ?').get(c.uid) as { stato: string } | undefined;
  if (t?.stato !== 'convertita') return 'fonte degli effetti non convertita';
  const rs = db.prepare('SELECT uid, ordine, tipo, chiave, dati_json, origine FROM main.voce_effetto WHERE voce_uid = ? ORDER BY ordine').all(c.uid) as RigaEffetto[];
  if (rs.length !== c.effetti.length) return 'effetti diversi da quelli attesi';
  for (const [i, r] of rs.entries()) {
    const atteso = c.effetti[i]!;
    let letto: EffettoVoce | null;
    try { letto = normalizzaEffettoVoce(JSON.parse(r.dati_json)); } catch { letto = null; }
    if (r.uid !== atteso.uid || r.ordine !== i || r.origine !== 'regola' || !letto || r.tipo !== letto.tipo || r.chiave !== chiaveDi(letto) || canonico(letto) !== canonico(atteso.effetto)) return 'effetti diversi da quelli attesi';
  }
  for (const tabella of ['operazione_effetti_voce', 'proposta_effetto_voce']) {
    if (esisteTabella(db, tabella) && db.prepare(`SELECT 1 FROM main."${tabella}" WHERE voce_uid = ? LIMIT 1`).get(c.uid)) return `ha righe in ${tabella}: decisioni o raccordi sugli effetti`;
  }
  const citata = partite.filter((tabella) => db.prepare(`SELECT 1 FROM utente."${tabella}" WHERE voce_uid = ? LIMIT 1`).get(c.uid));
  if (citata.length) return `citata nelle partite (${citata.join(', ')}): spuntata o con effetti registrati`;
  return null;
}

/** Collega una voce già verificata: tipo e collegamento, effetti Dote degli esiti tolti, turno aggiunto, registro di transizione. */
function collega(db: AppDatabase, c: Candidata, doteDegliEsiti: ReadonlySet<string>, adesso: string): { prima: unknown; dopo: unknown } {
  const tolti = c.effetti.filter((e) => e.effetto.tipo === 'dote' && doteDegliEsiti.has(e.effetto.dote));
  const restano = c.effetti.filter((e) => !tolti.includes(e));
  const turno = normalizzaEffettoVoce({ tipo: 'turno', attivita: c.attivita, ...(c.esito ? { esito: c.esito } : {}) });
  if (!turno || turno.tipo !== 'turno') return errore(`il turno di ${c.uid} non è valido`);
  const uidTurno = createHash('sha256').update(`L13-234:turno:${c.uid}`).digest('hex').slice(0, 32);
  if (db.prepare('SELECT 1 FROM main.voce_effetto WHERE uid = ?').get(uidTurno)) errore(`l'uid del turno di ${c.uid} è già usato`);
  const dopo = [...restano, { uid: uidTurno, effetto: turno }];

  for (const e of tolti) if (db.prepare('DELETE FROM main.voce_effetto WHERE uid = ? AND voce_uid = ?').run(e.uid, c.uid).changes !== 1) errore(`l'effetto ${e.uid} non è stato tolto`);
  for (const [ordine, e] of restano.entries()) if (db.prepare('UPDATE main.voce_effetto SET ordine = ? WHERE uid = ? AND voce_uid = ?').run(ordine, e.uid, c.uid).changes !== 1) errore(`l'effetto ${e.uid} non è stato riordinato`);
  db.prepare("INSERT INTO main.voce_effetto (uid, voce_uid, ordine, tipo, chiave, dati_json, origine, updated_at) VALUES (?, ?, ?, 'turno', ?, ?, 'regola', ?)")
    .run(uidTurno, c.uid, restano.length, turno.attivita, canonico(turno), adesso);
  if (db.prepare("UPDATE main.voce_effetto_transizione SET impronta = ?, aggiornata_il = ? WHERE voce_uid = ? AND stato = 'convertita'").run(impronta(dopo.map((e) => e.effetto)), adesso, c.uid).changes !== 1) errore(`il registro di ${c.uid} non è stato scritto`);
  if (db.prepare("UPDATE main.voce_giornata SET tipo = 'attivita', riferimento_tipo = 'attivita', riferimento_chiave = ?, riferimento_testo = NULL WHERE uid = ? AND tipo = ? AND riferimento_tipo IS NULL AND riferimento_chiave IS NULL")
    .run(c.attivita, c.uid, c.tipo).changes !== 1) errore(`la voce ${c.uid} non è stata collegata`);
  return {
    prima: { tipo: c.tipo, riferimento: null, effetti: c.effetti },
    dopo: { tipo: 'attivita', riferimento: { tipo: 'attivita', chiave: c.attivita }, effetti: dopo, tolti: tolti.map((e) => e.uid) },
  };
}

/** Rilettura: gli effetti della voce sono quelli scritti, validi, con il turno dell'attività in fondo e l'esito atteso. */
function verificaVoce(db: AppDatabase, c: Candidata, doteDegliEsiti: ReadonlySet<string>): void {
  const rs = db.prepare('SELECT uid, ordine, tipo, chiave, dati_json, origine FROM main.voce_effetto WHERE voce_uid = ? ORDER BY ordine').all(c.uid) as RigaEffetto[];
  const letti = rs.map((r) => normalizzaEffettoVoce(JSON.parse(r.dati_json)));
  if (letti.some((e, i) => !e || e.tipo !== rs[i]!.tipo || rs[i]!.chiave !== chiaveDi(e) || rs[i]!.ordine !== i)) errore(`effetti illeggibili in ${c.uid}`);
  const ultimo = letti.at(-1);
  if (!ultimo || ultimo.tipo !== 'turno' || ultimo.attivita !== c.attivita || (ultimo.esito ?? null) !== c.esito || ultimo.doti) errore(`turno inatteso in ${c.uid}`);
  if (letti.filter((e) => e!.tipo === 'turno').length !== 1) errore(`più di un turno in ${c.uid}`);
  if (letti.some((e) => e!.tipo === 'dote' && doteDegliEsiti.has(e!.dote))) errore(`una Dote dell'esito è rimasta fissa in ${c.uid}`);
  const t = db.prepare('SELECT impronta FROM main.voce_effetto_transizione WHERE voce_uid = ?').get(c.uid) as { impronta: string };
  if (t.impronta !== impronta(letti)) errore(`impronta del registro incoerente in ${c.uid}`);
}

export const migration234: Migration = {
  id: 234,
  name: 'voci_collegate_agli_esiti',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['attivita', 'dati_guida', 'voce_giornata', 'voce_effetto', 'voce_effetto_transizione']) if (!esisteTabella(db, t)) return;
    if (!haColonna(db, 'attivita', 'esiti_json') || !haColonna(db, 'attivita', 'dettagli')) return;
    if (db.prepare('SELECT 1 FROM main.dati_guida WHERE chiave = ?').get(AUDIT)) return; // già applicata: niente da rifare
    const adesso = new Date().toISOString();
    const rapporto: Record<string, unknown> = { data: '2026-10-25' };

    // ---- impronte di prima (solo letture): tutto ciò che non è dichiarato deve restare identico
    const uids = CANDIDATE.map((c) => c.uid);
    const segnaposti = uids.map(() => '?').join(', ');
    const vicine = ['articolo', 'negozio', 'luogo', 'libro', 'film', 'catalogo_oggetto'].filter((t) => esisteTabella(db, t));
    const impronte = (): Record<string, string> => ({
      attivitaAltre: improntaRighe(db, 'attivita', 'chiave <> ?', [BBB]),
      attivitaBbb: improntaRighe(db, 'attivita', 'chiave = ?', [BBB], ['dettagli']),
      vociAltre: improntaRighe(db, 'voce_giornata', `uid NOT IN (${segnaposti})`, uids),
      vociCandidate: improntaRighe(db, 'voce_giornata', `uid IN (${segnaposti})`, uids, ['tipo', 'riferimento_tipo', 'riferimento_chiave', 'riferimento_testo']),
      effettiAltri: improntaRighe(db, 'voce_effetto', `voce_uid NOT IN (${segnaposti})`, uids),
      transizioniAltre: improntaRighe(db, 'voce_effetto_transizione', `voce_uid NOT IN (${segnaposti})`, uids),
      transizioniCandidate: improntaRighe(db, 'voce_effetto_transizione', `voce_uid IN (${segnaposti})`, uids, ['impronta', 'aggiornata_il']),
      datiGuida: improntaRighe(db, 'dati_guida', 'chiave <> ?', [AUDIT]),
      ...Object.fromEntries(vicine.map((t) => [t, improntaRighe(db, t, '1', [])])),
    });
    const prima = impronte();

    // ---- (2) il nome «Cosmo Tower» nel paragrafo di sblocco
    const a = db.prepare('SELECT dettagli, origine, seed_json FROM main.attivita WHERE chiave = ?').get(BBB) as { dettagli: string | null; origine: string; seed_json: string | null } | undefined;
    const paragrafi = a?.dettagli?.split('\n\n') ?? [];
    if (!a) rapporto.paragrafo = 'attività assente';
    else if (a.origine !== 'seed' || a.seed_json !== null) rapporto.paragrafo = 'attività corretta dall’utente: non toccata';
    else if (paragrafi.filter((p) => p === PARAGRAFO_PRIMA).length !== 1) rapporto.paragrafo = paragrafi.includes(PARAGRAFO_DOPO) ? 'già allineato' : 'paragrafo diverso da quello atteso: non toccato';
    else {
      const dettagli = paragrafi.map((p) => (p === PARAGRAFO_PRIMA ? PARAGRAFO_DOPO : p)).join('\n\n');
      if (db.prepare("UPDATE main.attivita SET dettagli = ? WHERE chiave = ? AND dettagli = ? AND origine = 'seed' AND seed_json IS NULL").run(dettagli, BBB, a.dettagli).changes !== 1) errore('il paragrafo non è stato scritto');
      rapporto.paragrafo = { prima: a.dettagli, dopo: dettagli };
    }

    // ---- (3) le voci collegate agli esiti
    const partite = tabellePartiteConVoce(db);
    const voci: Record<string, unknown> = {};
    const collegate: Candidata[] = [];
    const doti = new Map<string, Set<string>>();
    if (partite === null) {
      rapporto.schemaUtente = 'non attaccato o senza spunta_voce_partita: spunte non verificabili, nessuna voce toccata';
      for (const c of CANDIDATE) voci[c.uid] = { giorno: c.data, saltata: 'spunte non verificabili' };
    } else {
      rapporto.schemaUtente = { letto: true, tabelleConVoce: partite };
      for (const chiave of [BBB, BAGNO]) {
        const r = db.prepare('SELECT tipo, tracciamento, nascosto, confidente_chiave, pesca_regola_chiave, esiti_json FROM main.attivita WHERE chiave = ?').get(chiave) as { tipo: string; tracciamento: string; nascosto: number; confidente_chiave: string | null; pesca_regola_chiave: string | null; esiti_json: string | null } | undefined;
        const esiti = leggiEsitiAttivita(r?.esiti_json);
        const conTurni = !!r && r.nascosto === 0 && !r.confidente_chiave && !r.pesca_regola_chiave && (eTracciamentoAttivita(r.tracciamento) ? r.tracciamento : tracciamentoPerTipo(r.tipo)) === 'svolta';
        const attese = CANDIDATE.filter((c) => c.attivita === chiave && c.esito).map((c) => c.esito!);
        if (conTurni && esiti && esiti.modo === (chiave === BAGNO ? 'automatico' : 'scelta') && attese.every((x) => esiti.esiti.some((e) => e.chiave === x))) {
          doti.set(chiave, new Set(esiti.esiti.flatMap((e) => e.doti.map((d) => d.dote))));
        }
      }
      for (const c of CANDIDATE) {
        const dotiEsiti = doti.get(c.attivita);
        const motivo = dotiEsiti ? motivoPerSaltare(db, c, partite) : 'l’attività non dichiara gli esiti attesi o non conta turni';
        if (motivo) { voci[c.uid] = { giorno: c.data, saltata: motivo }; continue; }
        voci[c.uid] = { giorno: c.data, esito: c.esito ?? (c.attivita === BAGNO ? 'automatico' : 'da scegliere'), motivo: c.motivo, ...collega(db, c, dotiEsiti!, adesso) };
        collegate.push(c);
      }
    }
    rapporto.voci = voci;

    // ---- controlli finali: tutto il resto identico, effetti scritti validi
    const dopo = impronte();
    for (const [k, v] of Object.entries(prima)) if (dopo[k] !== v) errore(`${k} è cambiato oltre ai campi dichiarati`);
    for (const c of collegate) verificaVoce(db, c, doti.get(c.attivita)!);
    if (typeof rapporto.paragrafo === 'object') {
      const d = (db.prepare('SELECT dettagli FROM main.attivita WHERE chiave = ?').get(BBB) as { dettagli: string }).dettagli;
      if (d.includes('Cosmo Town') || !d.split('\n\n').includes(PARAGRAFO_DOPO)) errore('il paragrafo non si rilegge allineato');
    }
    db.prepare('INSERT OR IGNORE INTO main.dati_guida (chiave, json) VALUES (?, ?)').run(AUDIT, JSON.stringify(rapporto));
    const saltate = Object.values(voci as Record<string, { giorno: string; saltata?: string }>).filter((v) => v.saltata).map((v) => `${v.giorno}: ${v.saltata}`);
    logger.info({ migrazione: 'L13-234', paragrafo: typeof rapporto.paragrafo === 'string' ? rapporto.paragrafo : 'allineato', collegate: collegate.map((c) => c.data), saltate }, 'Voci del Diario collegate agli esiti delle attività');
  },
};
