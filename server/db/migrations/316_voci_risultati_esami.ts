// ============================================================
// Migrazione 316 — le voci dei risultati degli esami del 19 luglio (esame-2) e del 24 dicembre (esame-4) (L13, ondata 8, lotto O8-2)
// ============================================================
//
// Risposta dell'utente del 2026-10-31 alla domanda (2) dei «daDecidere» dell'audit-311: «aggiungo le voci dei risultati d'esame del 19/7 e
// del 24/12? sì». Fonte (dato Royal): https://www.allgamestaff.it/persona-5-royal/interrogazioni-esami-risposte/ (risultati della prima
// sessione di fine semestre il 19 luglio, della seconda il 24 dicembre; i premi per piazzamento sono già in `esame.premi_json` dalla 311) e
// la soluzione giorno per giorno, letta il 2026-10-31: settimana 15 (https://www.allgamestaff.it/persona-5-royal/soluzione-settimana-15/:
// il 19 luglio, a scuola durante la giornata, «Riceveremo i risultati dei nostri esami scolastici oggi»), settimana 35
// (https://www.allgamestaff.it/persona-5-royal/soluzione-settimana-35/: il 24 dicembre, prima di tutto il resto della giornata, «Scopriremo che
// siamo diventati i primi della classe a scuola oggi», poi negozi e Memento).
// Per ciascuno dei due esami, solo se `esame.data_risultati` è quella letta e nessuna voce porta già l'effetto «esame» di quell'esame: una
// voce nuova nel giorno dei risultati, fascia «giorno», in cima alla fascia (ordine -1, poi la fascia rinumerata 0..n come `posiziona` della
// 241), con lo stesso testo della voce del 20 maggio («Vedi la valutazione conseguita all'esame.») e l'unico effetto `{ tipo: 'esame' }`: il
// piazzamento NON si fissa, si sceglie alla spunta (come il 20 maggio, migrazione 314, e il 24 ottobre, migrazione 311), e dà il premio
// dell'esame. Gli effetti con `convertiVoce` (validi, origine «regola», riga di transizione «convertita» con l'impronta, registro delle
// operazioni). Nessuna voce esistente cambia, se non nell'ordine della fascia (controllato). Le partite non si toccano (impronta di tutto lo
// schema `utente` prima e dopo). Idempotente: la seconda volta non trova niente da fare e non scrive (l'audit resta com'è). Audit in
// `dati_guida.audit-316-voci-risultati-esami`, con gli ordini di prima e di dopo e, alla fine, la voce dei risultati di ogni esame. Solo `main`.
// ============================================================

import { createHash } from 'node:crypto';
import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { canonico, convertiVoce, tabellePartiteConVoce, uidDa, type Esito } from './fbisOndata5.js';
import { normalizzaEffettoVoce, type EffettoVoce } from '../../../shared/effettiVoce.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-316-voci-risultati-esami';
const LOTTO = 'O8-2-esami-316';
const DECISIONE = '2026-10-31, risposta dell’utente: «aggiungo le voci dei risultati d’esame del 19/7 e del 24/12? sì»';
const FONTE = 'https://www.allgamestaff.it/persona-5-royal/interrogazioni-esami-risposte/';
const errore = (motivo: string): never => { throw new Error(`316: ${motivo}; nessuna modifica applicata.`); };

type EsitoConDati = Esito & { prima?: unknown; dopo?: unknown };

/** Il testo della voce: lo stesso della voce dei risultati del 20 maggio (4ddc2508). */
const AZIONE = 'Vedi la valutazione conseguita all\'esame.';
const FASCIA = 'giorno';

/** Gli esami senza la voce dei risultati, con il giorno letto in `esame.data_risultati` e la pagina della guida che colloca i risultati. */
interface RisultatiEsame { esame: 'esame-2' | 'esame-4'; data: string; guida: string; url: string }
const RISULTATI: readonly RisultatiEsame[] = [
  { esame: 'esame-2', data: '07-19', url: 'https://www.allgamestaff.it/persona-5-royal/soluzione-settimana-15/',
    guida: 'a scuola, durante la giornata: «Riceveremo i risultati dei nostri esami scolastici oggi» (prima della Clinica e della sera al Leblanc)' },
  { esame: 'esame-4', data: '12-24', url: 'https://www.allgamestaff.it/persona-5-royal/soluzione-settimana-35/',
    guida: 'all’inizio della giornata: «Scopriremo che siamo diventati i primi della classe a scuola oggi» (prima dei negozi e dei Memento)' },
];
const uidDellaVoce = (r: RisultatiEsame): string => uidDa(`${LOTTO}:${r.esame}`);
const effettoDi = (r: RisultatiEsame): EffettoVoce => ({ tipo: 'esame', esame: r.esame });

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

/** Ogni voce del Diario (riga senza l'ordine, con i suoi effetti): le voci che c'erano devono restare identiche, ordine a parte. */
function improntaVoci(db: AppDatabase): Map<string, string> {
  const effetti = db.prepare('SELECT uid, ordine, tipo, chiave, dati_json, origine FROM main.voce_effetto WHERE voce_uid = ? ORDER BY ordine');
  const out = new Map<string, string>();
  for (const r of db.prepare('SELECT * FROM main.voce_giornata ORDER BY uid').all() as Array<Record<string, unknown> & { uid: string }>) {
    const resto = Object.fromEntries(Object.entries(r).filter(([k]) => k !== 'ordine'));
    out.set(r.uid, createHash('sha256').update(JSON.stringify(resto)).update(JSON.stringify(effetti.all(r.uid))).digest('hex'));
  }
  return out;
}

/** Gli effetti della voce oggi, in ordine (null se illeggibile). */
function effettiDi(db: AppDatabase, uid: string): Array<EffettoVoce | null> {
  return (db.prepare('SELECT dati_json FROM main.voce_effetto WHERE voce_uid = ? ORDER BY ordine').pluck().all(uid) as string[])
    .map((j) => { try { return normalizzaEffettoVoce(JSON.parse(j)); } catch { return null; } });
}

/** Le voci con l'effetto «esame» di un esame, con il loro giorno. */
const vociConEsame = (db: AppDatabase, esame: string): Array<{ uid: string; data: string; fascia: string }> =>
  db.prepare("SELECT DISTINCT g.uid, g.data, g.fascia FROM main.voce_effetto e JOIN main.voce_giornata g ON g.uid = e.voce_uid WHERE e.tipo = 'esame' AND e.chiave = ? ORDER BY g.data, g.uid")
    .all(esame) as Array<{ uid: string; data: string; fascia: string }>;

/** Per ogni esame: il giorno dei risultati e le voci con il suo effetto «esame» (dopo la migrazione: una sola, in quel giorno). */
function vociDeiRisultati(db: AppDatabase): Array<{ esame: string; dataRisultati: string | null; voci: Array<{ uid: string; data: string; fascia: string }>; esito: string }> {
  return (db.prepare('SELECT chiave, data_risultati FROM main.esame ORDER BY ordine').all() as Array<{ chiave: string; data_risultati: string | null }>).map((e) => {
    const voci = vociConEsame(db, e.chiave);
    const esito = voci.length === 1 && voci[0]!.data === e.data_risultati ? 'una voce con l’effetto «esame» nel giorno dei risultati'
      : voci.length ? `${voci.length} voci con l’effetto «esame», non una sola nel giorno dei risultati: da vedere` : 'nessuna voce con l’effetto «esame»: da vedere';
    return { esame: e.chiave, dataRisultati: e.data_risultati, voci, esito };
  });
}

// ---- le voci nuove ----

function vociNuove(db: AppDatabase, partite: string[] | null, adesso: string, esiti: EsitoConDati[]): string[] {
  const create: string[] = [];
  const fascia = db.prepare('SELECT uid, ordine FROM main.voce_giornata WHERE data = ? AND fascia = ? ORDER BY ordine, uid');
  const scriviOrdine = db.prepare('UPDATE main.voce_giornata SET ordine = ? WHERE uid = ?');
  for (const r of RISULTATI) {
    const uid = uidDellaVoce(r);
    const chiave = `voce-nuova:${r.data}:${FASCIA}:${r.esame}`;
    if (db.prepare('SELECT 1 FROM main.voce_giornata WHERE uid = ?').get(uid)) continue; // già creata
    const dataRisultati = db.prepare('SELECT data_risultati FROM main.esame WHERE chiave = ?').pluck().get(r.esame) as string | null | undefined;
    if (dataRisultati !== r.data) { esiti.push({ chiave, esito: `i risultati di ${r.esame} non sono il ${r.data} (${dataRisultati === undefined ? 'esame assente' : String(dataRisultati)}): nessuna voce` }); continue; }
    const gia = vociConEsame(db, r.esame);
    if (gia.length) { esiti.push({ chiave, esito: `una voce porta già l’effetto «esame» di ${r.esame} (${gia.map((v) => `${v.data} ${v.uid}`).join(', ')}): nessuna voce nuova` }); continue; }
    if (!db.prepare('SELECT 1 FROM main.giorno WHERE data = ?').get(r.data)) { esiti.push({ chiave, esito: 'giorno assente dal percorso: nessuna voce' }); continue; }
    if (partite === null) { esiti.push({ chiave, esito: 'schema delle partite non attaccato: voce non creata (gli effetti si scrivono solo con le spunte verificabili)' }); continue; }
    const effetto = effettoDi(r);
    if (canonico(normalizzaEffettoVoce(JSON.parse(canonico(effetto)))) !== canonico(effetto)) errore(`l'effetto «esame» di ${r.esame} non è valido`);
    const ordiniPrima = fascia.all(r.data, FASCIA) as Array<{ uid: string; ordine: number }>;
    // come le voci dei risultati del 24 ottobre e delle domande in classe: una voce della scuola («esame»), senza collegamento e senza nota
    db.prepare(`INSERT INTO main.voce_giornata (uid, data, fascia, ordine, genere, azione, note, tipo, riferimento_tipo, riferimento_chiave, riferimento_testo,
        rango_atteso, indice_guida, created_at, updated_at, da_rivedere, aggiunta_da)
      VALUES (?, ?, ?, -1, 'azione', ?, NULL, 'esame', NULL, NULL, NULL, NULL, NULL, ?, ?, 0, 'team')`)
      .run(uid, r.data, FASCIA, AZIONE, adesso, adesso);
    const c = convertiVoce(db, { uid, data: r.data, azione: AZIONE, lotto: LOTTO, attesi: [], togli: [],
      aggiungi: [{ seme: `${LOTTO}:${uid}:0:esame`, effetto }],
      motivo: `risultati di ${r.esame} il ${r.data} senza voce nel Diario: la guida li colloca ${r.guida} (${r.url}); piazzamento scelto alla spunta` }, partite, adesso);
    if (!c.esito.startsWith('convertita')) errore(`l'effetto della voce nuova del ${r.data} non si scrive (${c.esito})`);
    // in cima alla fascia (ordine -1, il più piccolo), poi la fascia rinumerata 0, 1, 2… come fa `posiziona`
    (fascia.all(r.data, FASCIA) as Array<{ uid: string }>).forEach((x, i) => scriviOrdine.run(i, x.uid));
    const ordiniDopo = fascia.all(r.data, FASCIA) as Array<{ uid: string; ordine: number }>;
    if (ordiniDopo[0]?.uid !== uid) errore(`la voce del ${r.data} non è in cima alla fascia`);
    if (ordiniDopo.length !== ordiniPrima.length + 1 || ordiniPrima.some((p, i) => ordiniDopo[i + 1]?.uid !== p.uid)) errore(`le altre voci del ${r.data} hanno cambiato ordine relativo`);
    const dopo = effettiDi(db, uid);
    if (dopo.length !== 1 || canonico(dopo[0]) !== canonico(effetto)) errore(`gli effetti della voce nuova del ${r.data} non sono quelli attesi`);
    if (!db.prepare("SELECT 1 FROM main.voce_effetto_transizione WHERE voce_uid = ? AND stato = 'convertita'").get(uid)) errore(`la voce nuova del ${r.data} è senza riga di transizione`);
    esiti.push({ chiave, esito: `creata (${uid})`, prima: { ordini: ordiniPrima }, dopo: { azione: AZIONE, effetti: c.dopo, ordini: ordiniDopo } });
    create.push(uid);
  }
  return create;
}

/** L'audit: la prima esecuzione sempre, le successive solo se hanno cambiato qualcosa. */
function scriviAudit(db: AppDatabase, esecuzione: Record<string, unknown>, cambiato: boolean): void {
  const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(AUDIT) as string | undefined;
  if (vecchio && !cambiato) return;
  let esecuzioni: unknown[] = [];
  if (vecchio) { try { const v = JSON.parse(vecchio) as { esecuzioni?: unknown }; esecuzioni = Array.isArray(v.esecuzioni) ? v.esecuzioni : []; } catch { esecuzioni = []; } }
  db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
    .run(AUDIT, JSON.stringify({
      migrazione: 316, lotto: 'O8-2', decisione: DECISIONE, fonte: FONTE, pagine: RISULTATI.map((r) => ({ esame: r.esame, data: r.data, url: r.url, guida: r.guida })),
      regola: 'una voce nuova per esame solo se i risultati sono nel giorno letto e nessuna voce porta già l’effetto «esame» di quell’esame; in cima alla fascia del giorno, le altre voci identiche (ordine a parte); le partite non si toccano',
      chiude: 'audit-311-esami-e-domande, daDecidere (2): «Risultati del 19 luglio e del 24 dicembre: nel Diario non c’è una voce dei risultati.»',
      daFareNellaPartita: 'Niente: le voci sono nuove, nessuna spunta coinvolta. Spuntandole si sceglie il piazzamento, che dà il premio dell’esame.',
      esecuzioni: [...esecuzioni, { il: new Date().toISOString(), ...esecuzione }],
    }));
}

export const migration316: Migration = {
  id: 316,
  name: 'voci_risultati_esami',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['esame', 'giorno', 'voce_giornata', 'voce_effetto', 'voce_effetto_transizione', 'dati_guida']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 316, tabella: t }, 'tabella assente: niente da fare'); return; }
    }
    for (const c of ['da_rivedere', 'aggiunta_da']) if (!haColonna(db, 'voce_giornata', c)) errore(`manca la colonna ${c} delle voci`);
    if (!haColonna(db, 'esame', 'data_risultati')) errore('manca la colonna data_risultati degli esami');
    const adesso = new Date().toISOString();
    const partiteAttaccate = (db.prepare('PRAGMA database_list').all() as Array<{ name: string }>).some((s) => s.name === 'utente');
    const partitePrima = partiteAttaccate ? improntaPartite(db) : null;
    const vociPrima = improntaVoci(db);
    const esiti: EsitoConDati[] = [];
    const create = vociNuove(db, tabellePartiteConVoce(db), adesso, esiti);
    if (partiteAttaccate && improntaPartite(db) !== partitePrima) errore('le partite risultano cambiate');
    const vociDopo = improntaVoci(db);
    if (vociDopo.size !== vociPrima.size + create.length) errore(`le voci del Diario sono ${vociDopo.size} invece di ${vociPrima.size + create.length}`);
    for (const [uid, impronta] of vociPrima) if (vociDopo.get(uid) !== impronta) errore(`la voce ${uid} è cambiata`);
    const cambiato = create.length > 0;
    if (cambiato) invalidaCacheDiGioco();
    const conteggi = { vociCreate: create.length };
    scriviAudit(db, { conteggi, voci: esiti, vociDeiRisultati: vociDeiRisultati(db) }, cambiato);
    logger.info({ migrazione: 316, ...conteggi }, 'esami: voci dei risultati del 19 luglio e del 24 dicembre con l’effetto «esame»');
  },
};
