// ============================================================
// Migrazione 312 — Diario: voci di attività collegate dove l'elemento è univoco, nomi dei collegamenti dall'elemento, Doti in prosa delle
// attività tolte dove ripetono gli effetti (L13, ondata 7, lotto O7-3)
// ============================================================
//
// Istruzione dell'utente: «completa il lavoro rimasto fermo... le ondate mancanti e tutto quanto non ancora gestito rispetto all'obiettivo».
// Ondata 7, punti 3, 4 e 5 per le voci, e le lacune del critico del censimento («28 effetti turno», «registro della sala giochi»). Misure
// sulla copia portata alla 311: 78 voci di tipo «attività» senza collegamento (1 nel periodo validato, spuntata; 77 dopo il 31/5), 9 voci
// con il nome di un elemento scritto e nessuna chiave, 442 voci con la chiave e il nome scritto, 16 voci della palestra con il turno e senza
// collegamento, 18 attività con le Doti in prosa (`doti_json`) di cui 15 accanto agli effetti strutturati che dicono la stessa cosa.
//
// Che cosa fa (l'elenco CHIUSO `dati/312-voci-collegate.json`, scritto a mano dopo la lettura del 2026-10-31):
//   (1) le voci dell'elenco: collegamento (tipo e riferimento) e, dove l'elenco lo dice, effetti aggiunti o tolti, con la STESSA scrittura delle
//       migrazioni del lotto F-bis e della 311 (`convertiVoce`: effetti attesi uno per uno, registro di transizione, registro delle operazioni,
//       mai una voce citata da una partita). Una voce si tocca solo se è ancora com'era letta (testo, note, tipo, collegamento, nome scritto,
//       valore e ordine degli effetti) e se l'utente non l'ha mai modificata: nessuna riga in `operazione_voci_diario` che la nomini, nessuna
//       operazione sugli effetti che non venga da una migrazione (`payload.lotto`) o da una proposta applicata (lo stesso contenuto dell'esito),
//       `aggiunta_da`, testo precedente e «da rivedere» vuoti, `updated_at` uguale alla creazione o al momento di una di quelle scritture; nessun
//       raccordo degli effetti aperto. Ogni elemento nuovo si verifica nella guida: il negozio e l'articolo (con la data della voce dentro
//       l'intervallo dell'articolo), l'attività che conta i turni (senza esiti da scegliere, né fonte Confidente o pesca), il videogioco con
//       abbastanza sessioni. Una Dote fissa si toglie SOLO se la voce completa il videogioco e la Dote coincide con quella che l'attività dà al
//       completamento (decisione 8: una volta sola). Le proposte «da completare» che il collegamento supera si chiudono come superate, solo se
//       ancora uguali a quelle lette (`chiudiProposta`);
//   (2) il nome scritto nella voce (`riferimento_testo`) si svuota dove è IDENTICO al nome dell'elemento collegato (`nomeRiferimento`, lo
//       stesso che la voce mostra quando il nome scritto manca), salvo le voci aggiunte dall'utente o con un testo precedente: chi legge la voce
//       prende il nome dall'elemento (e segue le sue rinomine). Dove è diverso resta. Serve la connessione dei servizi (`getDb()`): su un'altra
//       connessione questo passo non si fa e l'audit lo dice;
//   (3) le attività dell'elenco: `doti_json` → `[]` dove ogni Dote in prosa coincide con `effetti_json` (riletto uguale a quello letto); quel
//       che la prosa diceva in più va nel paragrafo «Note sulle Doti» dei dettagli, solo se quel paragrafo è ancora quello letto. Un'attività
//       corretta dall'utente (`origine` diversa da «seed» o `seed_json`) non si tocca;
//   (4) audit in `dati_guida.audit-312-voci-collegate`: voci collegate (prima e dopo), saltate col motivo, lasciate con il motivo dell'elenco,
//       proposte chiuse, nomi svuotati e rimasti, attività scritte e lasciate.
// Le partite non si scrivono mai: lo schema `utente` deve risultare identico (impronta di ogni riga), o la migrazione si annulla. Idempotente:
// la seconda volta ogni voce è «già applicata», nessun nome identico resta, ogni attività è «già applicata», e l'audit non si riscrive.
//
// Fonti (lette il 2026-10-31): https://www.allgamestaff.it/persona-5-royal/scambi-oggetti-curiosi-venditori-nascosti/,
// /videogiochi/, /freccette/, /biliardo/, /elenco-dei-negozi/, /negozi-speciali/, /gestione-del-tempo-e-vita-quotidiana/.
// ============================================================

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Migration } from '../migrationRunner.js';
import { getDb, type AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { canonico, chiudiProposta, convertiVoce, tabellePartiteConVoce, type Esito } from './fbisOndata5.js';
import { normalizzaEffettoVoce, type EffettoVoce } from '../../../shared/effettiVoce.js';
import { leggiVociEffetto } from '../../../shared/effettiCatalogo.js';
import { eTracciamentoAttivita, tracciamentoPerTipo } from '../../../shared/attivita.js';
import { ordineGioco } from '../../../shared/condizioniSpillo.js';
import { nomeRiferimento } from '../../services/azioniStrutturateService.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const QUI = path.dirname(fileURLToPath(import.meta.url));
const FILE_DATI = '312-voci-collegate.json';
const AUDIT = 'audit-312-voci-collegate';
const LOTTO = 'O7-3';
const RICHIESTA = '«completa il lavoro rimasto fermo... le ondate mancanti e tutto quanto non ancora gestito rispetto all’obiettivo» (L13, ondata 7, lotto O7-3)';
const errore = (motivo: string): never => { throw new Error(`312: ${motivo}; nessuna modifica applicata.`); };

interface Rif { tipo: string; chiave: string }
interface VoceDati {
  uid: string; data: string; gruppo: string;
  prima: { azione: string; note: string | null; tipo: string; riferimento: Rif | null; riferimentoTesto: string | null; effetti: unknown[] };
  dopo: { tipo: string; riferimento: Rif; tieniTesto?: boolean };
  aggiungi: unknown[]; togli: number[];
  chiudi: Array<{ id: string; effetti: string; perche: string }>;
  motivo: string;
}
interface AttivitaDati { chiave: string; doti: string; effetti: string; paragrafo: { prima: string; dopo: string } | null; motivo: string }
interface FileDati {
  lotto: string; letto: string; fonti: Record<string, string>; regole: Record<string, string>;
  voci: VoceDati[]; lasciate: Array<{ uid: string; data: string; motivo: string }>;
  attivita: AttivitaDati[]; attivitaLasciate: Array<{ chiave: string; motivo: string }>;
}

/** L'elenco della migrazione (accanto al file compilato o nei sorgenti). */
function leggiDati(): FileDati {
  for (const p of [path.join(QUI, 'dati', FILE_DATI), path.join(process.cwd(), 'server', 'db', 'migrations', 'dati', FILE_DATI)]) {
    if (!fs.existsSync(p)) continue;
    const v = JSON.parse(fs.readFileSync(p, 'utf8')) as Partial<FileDati>;
    if (v.lotto !== LOTTO || !Array.isArray(v.voci) || !Array.isArray(v.lasciate) || !Array.isArray(v.attivita) || !Array.isArray(v.attivitaLasciate)) errore(`il file ${FILE_DATI} non è quello atteso`);
    return v as FileDati;
  }
  return errore(`manca il file ${FILE_DATI}`);
}

/** Un effetto dell'elenco, che deve essere già nella forma dell'app (altrimenti l'elenco è sbagliato e la migrazione si ferma). */
function effettoDellElenco(x: unknown, dove: string): EffettoVoce {
  const e = normalizzaEffettoVoce(x);
  if (!e || canonico(e) !== canonico(x)) return errore(`effetto non nella forma dell'app nell'elenco (${dove})`);
  return e;
}

/** L'impronta di tutto lo schema `utente` (ogni tabella, ogni riga): alla fine deve essere identica. */
function improntaPartite(db: AppDatabase): string {
  const h = createHash('sha256');
  for (const t of (db.prepare("SELECT name FROM utente.sqlite_master WHERE type = 'table' ORDER BY name").all() as Array<{ name: string }>).map((x) => x.name)) {
    h.update(`#${t}\n`);
    for (const r of db.prepare(`SELECT * FROM utente."${t}"`).iterate()) h.update(JSON.stringify(r) + '\n');
  }
  return h.digest('hex');
}

interface RigaVoce { data: string; genere: string; azione: string; note: string | null; tipo: string; riferimento_tipo: string | null; riferimento_chiave: string | null;
  riferimento_testo: string | null; aggiunta_da: string | null; testo_precedente_json: string | null; da_rivedere: number; created_at: string; updated_at: string }
const rigaVoce = (db: AppDatabase, uid: string): RigaVoce | undefined => db.prepare(`SELECT data, genere, azione, note, tipo, riferimento_tipo, riferimento_chiave, riferimento_testo,
  aggiunta_da, testo_precedente_json, da_rivedere, created_at, updated_at FROM main.voce_giornata WHERE uid = ?`).get(uid) as RigaVoce | undefined;
const rifDi = (v: RigaVoce): Rif | null => (v.riferimento_tipo && v.riferimento_chiave ? { tipo: v.riferimento_tipo, chiave: v.riferimento_chiave } : null);
/** I valori degli effetti della voce in ordine (null per uno illeggibile). */
const effettiDi = (db: AppDatabase, uid: string): Array<EffettoVoce | null> =>
  (db.prepare('SELECT dati_json FROM main.voce_effetto WHERE voce_uid = ? ORDER BY ordine').pluck().all(uid) as string[]).map((j) => { try { return normalizzaEffettoVoce(JSON.parse(j)); } catch { return null; } });

/** Il giorno è nel periodo validato (dal 04-01 al 05-31, con l'ordine dell'anno scolastico)? */
const nelPeriodoValidato = (data: string): boolean => ordineGioco(data) >= ordineGioco('04-01') && ordineGioco(data) <= ordineGioco('05-31');

/**
 * Perché la voce risulta modificata dall'utente (null = mai). Le scritture che non sono dell'utente: le migrazioni (il registro delle operazioni
 * porta `lotto` nel payload) e le proposte applicate (il payload è l'effetto dell'esito della proposta). L'ultimo aggiornamento della voce deve
 * essere la creazione o una di quelle scritture.
 */
function modificataDallUtente(db: AppDatabase, uid: string, v: RigaVoce): string | null {
  if (v.aggiunta_da !== null) return 'aggiunta dall’utente';
  if (v.testo_precedente_json !== null || v.da_rivedere !== 0) return 'testo corretto o segnata da rivedere';
  if (esisteTabella(db, 'operazione_voci_diario')
    && db.prepare("SELECT 1 FROM main.operazione_voci_diario WHERE instr(richiesta_json, ?) > 0 OR instr(COALESCE(esito_json, ''), ?) > 0 LIMIT 1").get(uid, uid)) return 'copiata, spostata o incollata dall’utente (registro delle operazioni sulle voci)';
  // i momenti delle scritture note e, per una proposta applicata, l'intervallo della sua applicazione (la stessa transazione scrive il registro
  // degli effetti, poi la voce, poi l'esito della proposta: millisecondi diversi)
  const momenti = new Set<string>([v.created_at]);
  const intervalli: Array<[string, string]> = [];
  const proposte = esisteTabella(db, 'proposta_conversione_voce')
    ? (db.prepare("SELECT esito_json, decisa_il FROM main.proposta_conversione_voce WHERE voce_uid = ? AND stato = 'applicata'").all(uid) as Array<{ esito_json: string | null; decisa_il: string | null }>).map((p) => {
      let contenuto: string | null = null;
      try { const e = JSON.parse(p.esito_json ?? 'null') as { dati?: { effettiVoce?: unknown } } | null; if (e?.dati?.effettiVoce !== undefined) contenuto = canonico(e.dati.effettiVoce); } catch { /* esito illeggibile: non spiega niente */ }
      return { contenuto, decisa: p.decisa_il };
    })
    : [];
  for (const p of proposte) if (p.decisa) momenti.add(p.decisa);
  if (esisteTabella(db, 'operazione_effetti_voce')) {
    for (const o of db.prepare('SELECT payload_json, creata_il FROM main.operazione_effetti_voce WHERE voce_uid = ?').all(uid) as Array<{ payload_json: string; creata_il: string }>) {
      let payload: unknown;
      try { payload = JSON.parse(o.payload_json); } catch { return 'operazione sugli effetti illeggibile'; }
      // le migrazioni firmano il registro con il lotto (`convertiVoce`) o con il numero (`aggiungiEffettoVoce`, 136-154, 179, 301)
      const firma = payload && typeof payload === 'object' ? payload as { lotto?: unknown; migrazione?: unknown } : {};
      const diMigrazione = typeof firma.lotto === 'string' || typeof firma.migrazione === 'string' || typeof firma.migrazione === 'number';
      const proposta = diMigrazione ? undefined : proposte.find((p) => p.contenuto !== null && p.contenuto === canonico(payload));
      if (!diMigrazione && !proposta) return 'effetti salvati dall’utente (registro delle operazioni sugli effetti)';
      momenti.add(o.creata_il);
      if (proposta?.decisa && o.creata_il <= proposta.decisa) intervalli.push([o.creata_il, proposta.decisa]);
    }
  }
  if (!momenti.has(v.updated_at) && !intervalli.some(([da, a]) => da <= v.updated_at && v.updated_at <= a)) return 'aggiornata dopo l’ultima scrittura nota (forse dall’utente)';
  return null;
}

/** L'elemento del collegamento c'è ed è visibile (le tabelle della guida, senza i servizi). */
function esisteRiferimento(db: AppDatabase, r: Rif): boolean {
  const tabella = ({ negozio: 'negozio', attivita: 'attivita', libro: 'libro' } as Record<string, string>)[r.tipo];
  return !!tabella && !!db.prepare(`SELECT 1 FROM main.${tabella} WHERE chiave = ? AND nascosto = 0`).get(r.chiave);
}

/** Verifica nella guida un effetto nuovo dell'elenco (null = valido), con la voce e il suo collegamento nuovo. Solo letture. */
function problemaEffettoNuovo(db: AppDatabase, e: EffettoVoce, x: VoceDati): string | null {
  if (e.tipo === 'articolo') {
    const a = db.prepare('SELECT negozio_chiave, nascosto, condizioni_json FROM main.articolo WHERE chiave = ?').get(e.articolo) as { negozio_chiave: string; nascosto: number; condizioni_json: string | null } | undefined;
    if (!a || a.nascosto !== 0) return `l'articolo ${e.articolo} non c'è (o è nascosto)`;
    if (x.dopo.riferimento.tipo === 'negozio' && a.negozio_chiave !== x.dopo.riferimento.chiave) return `l'articolo ${e.articolo} non è del negozio ${x.dopo.riferimento.chiave}`;
    let condizioni: unknown;
    try { condizioni = JSON.parse(a.condizioni_json ?? '[]'); } catch { return `condizioni dell'articolo ${e.articolo} illeggibili`; }
    for (const c of (Array.isArray(condizioni) ? condizioni : []) as Array<{ tipo?: unknown; dal?: unknown; al?: unknown }>) {
      if (c?.tipo === 'intervallo' && typeof c.dal === 'string' && typeof c.al === 'string'
        && !(ordineGioco(c.dal) <= ordineGioco(x.data) && ordineGioco(x.data) <= ordineGioco(c.al))) return `il giorno ${x.data} è fuori dall'intervallo dell'articolo (${c.dal}…${c.al})`;
    }
    return null;
  }
  if (e.tipo === 'turno' || e.tipo === 'lettura') {
    const chiave = e.tipo === 'turno' ? e.attivita : e.chiave;
    if (x.dopo.riferimento.tipo !== 'attivita' || x.dopo.riferimento.chiave !== chiave) return 'l’effetto non è dell’attività collegata';
    const r = db.prepare('SELECT tipo, tracciamento, nascosto, confidente_chiave, pesca_regola_chiave, esiti_json, sessioni FROM main.attivita WHERE chiave = ?').get(chiave) as
      { tipo: string; tracciamento: string; nascosto: number; confidente_chiave: string | null; pesca_regola_chiave: string | null; esiti_json: string | null; sessioni: number | null } | undefined;
    if (!r || r.nascosto !== 0 || r.confidente_chiave || r.pesca_regola_chiave) return `l'attività ${chiave} non c'è, è nascosta o rimanda a un Confidente o alla pesca`;
    const tracciamento = eTracciamentoAttivita(r.tracciamento) ? r.tracciamento : tracciamentoPerTipo(r.tipo);
    if (e.tipo === 'turno') {
      if (tracciamento !== 'svolta') return `l'attività ${chiave} non conta i turni`;
      if (r.esiti_json !== null && r.esiti_json !== '' && r.esiti_json !== 'null') return `l'attività ${chiave} dichiara esiti: il turno chiederebbe una scelta`;
      return null;
    }
    if (e.categoria !== 'videogioco' || r.tipo !== 'videogioco') return `${chiave} non è un videogioco`;
    if (e.almeno !== null && e.almeno > Math.max(r.sessioni ?? 1, 1)) return `${chiave} ha meno sessioni di ${e.almeno}`;
    return null;
  }
  return `tipo d'effetto ${e.tipo} non previsto dall'elenco`;
}

/** Una Dote fissa che esce: solo sulla voce che completa il videogioco e solo se coincide con la Dote che il videogioco dà al completamento. */
function problemaDoteTolta(db: AppDatabase, e: EffettoVoce, aggiunti: EffettoVoce[]): string | null {
  if (e.tipo !== 'dote') return 'si toglie solo una Dote fissa';
  const lettura = aggiunti.find((a): a is Extract<EffettoVoce, { tipo: 'lettura' }> => a.tipo === 'lettura' && a.categoria === 'videogioco');
  if (!lettura) return 'la Dote si toglie solo dove la voce completa il videogioco';
  const r = db.prepare('SELECT sessioni, effetti_json FROM main.attivita WHERE chiave = ?').get(lettura.chiave) as { sessioni: number | null; effetti_json: string | null } | undefined;
  if (!r || lettura.almeno !== Math.max(r.sessioni ?? 1, 1)) return 'la voce non completa il videogioco: la Dote del livello resta della voce';
  const coincide = leggiVociEffetto(r.effetti_json).some((v) => !v.ripetuto && !(v.condizioni && v.condizioni.length) && v.effetto.famiglia === 'dote' && v.effetto.dote === e.dote && v.effetto.note === e.note);
  return coincide ? null : 'la Dote della voce non coincide con quella che il videogioco dà al completamento: resta';
}

interface EsitoVoce { uid: string; data: string; gruppo: string; esito: string; motivo?: string; prima?: unknown; dopo?: unknown; proposte?: Esito[] }

/** Una voce dell'elenco: già applicata, saltata col motivo, o collegata. */
function scriviVoce(db: AppDatabase, x: VoceDati, partite: string[] | null, adesso: string): EsitoVoce {
  const base = { uid: x.uid, data: x.data, gruppo: x.gruppo };
  const prima = x.prima.effetti.map((e, i) => effettoDellElenco(e, `${x.uid} prima ${i}`));
  const aggiunti = x.aggiungi.map((e, i) => effettoDellElenco(e, `${x.uid} aggiungi ${i}`));
  for (const i of x.togli) if (!Number.isInteger(i) || i < 0 || i >= prima.length) errore(`indice da togliere ${i} fuori dagli effetti di ${x.uid}`);
  const atteso = [...prima.filter((_, i) => !x.togli.includes(i)), ...aggiunti];
  const testoDopo = x.dopo.tieniTesto ? x.prima.riferimentoTesto : null;
  const v = rigaVoce(db, x.uid);
  if (!v) return { ...base, esito: 'voce assente: niente da fare' };
  const letti = effettiDi(db, x.uid);
  // già applicata: collegamento, tipo, nome scritto ed effetti sono quelli di dopo
  if (v.tipo === x.dopo.tipo && canonico(rifDi(v)) === canonico(x.dopo.riferimento) && v.riferimento_testo === testoDopo
    && letti.length === atteso.length && letti.every((e, i) => e !== null && canonico(e) === canonico(atteso[i]))) return { ...base, esito: 'già applicata' };
  if (v.data !== x.data || v.genere !== 'azione' || v.azione !== x.prima.azione || v.note !== x.prima.note || v.tipo !== x.prima.tipo
    || canonico(rifDi(v)) !== canonico(x.prima.riferimento) || v.riferimento_testo !== x.prima.riferimentoTesto) return { ...base, esito: 'saltata: giorno, testo, note, tipo o collegamento diversi da quelli letti' };
  if (letti.length !== prima.length || letti.some((e, i) => e === null || canonico(e) !== canonico(prima[i]))) return { ...base, esito: 'saltata: effetti diversi da quelli letti' };
  if (nelPeriodoValidato(x.data)) return { ...base, esito: 'saltata: voce del periodo validato (l’elenco non ne prevede)' };
  const modificata = modificataDallUtente(db, x.uid, v);
  if (modificata) return { ...base, esito: `saltata: ${modificata}` };
  if (!esisteRiferimento(db, x.dopo.riferimento)) return { ...base, esito: `saltata: il collegamento ${x.dopo.riferimento.tipo} «${x.dopo.riferimento.chiave}» non c'è in questi dati` };
  for (const e of aggiunti) { const p = problemaEffettoNuovo(db, e, x); if (p) return { ...base, esito: `saltata: ${p}` }; }
  for (const i of x.togli) { const p = problemaDoteTolta(db, prima[i]!, aggiunti); if (p) return { ...base, esito: `saltata: ${p}` }; }
  const conv = convertiVoce(db, {
    uid: x.uid, data: x.data, azione: x.prima.azione, lotto: LOTTO, motivo: x.motivo,
    attesi: prima.map((effetto, i) => ({ uid: null, effetto, ...(x.togli.includes(i) ? { togli: true as const } : {}) })),
    togli: [],
    aggiungi: aggiunti.map((effetto, i) => ({ seme: `L13-312:${x.uid}:${i}`, effetto })),
    collega: { tipoPrima: x.prima.tipo, riferimentoPrima: x.prima.riferimento, tipo: x.dopo.tipo, riferimento: x.dopo.riferimento },
  }, partite, adesso);
  if (conv.esito.startsWith('saltata')) return { ...base, esito: conv.esito };
  if (!conv.esito.startsWith('convertita')) errore(`la voce ${x.uid} non risulta collegata (${conv.esito})`);
  // `convertiVoce` toglie il nome scritto: dove la guida chiama l'elemento a modo suo, il nome resta
  if (testoDopo !== null && db.prepare('UPDATE main.voce_giornata SET riferimento_testo = ? WHERE uid = ? AND riferimento_testo IS NULL').run(testoDopo, x.uid).changes !== 1) errore(`il nome scritto di ${x.uid} non si conserva`);
  const riletta = rigaVoce(db, x.uid)!;
  const dopo = effettiDi(db, x.uid);
  if (riletta.tipo !== x.dopo.tipo || canonico(rifDi(riletta)) !== canonico(x.dopo.riferimento) || riletta.riferimento_testo !== testoDopo || riletta.updated_at !== v.updated_at
    || dopo.length !== atteso.length || dopo.some((e, i) => e === null || canonico(e) !== canonico(atteso[i]))) errore(`la voce ${x.uid} riletta non è quella attesa`);
  const proposte = x.chiudi.map((p) => chiudiProposta(db, { id: p.id, voce: x.uid, effetti: p.effetti, modo: 'superata', da: null, perche: p.perche }, adesso));
  return { ...base, esito: 'collegata', motivo: x.motivo, prima: conv.prima, dopo: { ...(conv.dopo as object), tipo: x.dopo.tipo, riferimentoTesto: testoDopo }, proposte };
}

/** (2) Il nome scritto uguale a quello dell'elemento collegato si svuota. Ritorna i conteggi e le voci toccate. */
function nomiDaiCollegamenti(db: AppDatabase): Record<string, unknown> {
  const stessaConnessione = (() => { try { return getDb() === db; } catch { return false; } })();
  if (!stessaConnessione) return { esito: 'saltato: la migrazione non gira sulla connessione dei servizi (il nome dell’elemento non si legge)' };
  const righe = db.prepare(`SELECT uid, riferimento_tipo, riferimento_chiave, riferimento_testo, aggiunta_da, testo_precedente_json FROM main.voce_giornata
    WHERE riferimento_tipo IS NOT NULL AND riferimento_chiave IS NOT NULL AND riferimento_testo IS NOT NULL AND riferimento_testo <> '' ORDER BY data, ordine, uid`).all() as
    Array<{ uid: string; riferimento_tipo: string; riferimento_chiave: string; riferimento_testo: string; aggiunta_da: string | null; testo_precedente_json: string | null }>;
  const svuotati: Array<{ uid: string; nome: string }> = [];
  let diversi = 0, dellUtente = 0, senzaElemento = 0;
  for (const r of righe) {
    let nome: string;
    try { nome = nomeRiferimento({ tipo: r.riferimento_tipo, chiave: r.riferimento_chiave }, { ancheNascosti: true }); } catch { senzaElemento++; continue; }
    if (nome !== r.riferimento_testo) { diversi++; continue; }
    if (r.aggiunta_da !== null || r.testo_precedente_json !== null) { dellUtente++; continue; }
    if (db.prepare('UPDATE main.voce_giornata SET riferimento_testo = NULL WHERE uid = ? AND riferimento_testo = ?').run(r.uid, r.riferimento_testo).changes !== 1) errore(`il nome scritto di ${r.uid} non si svuota`);
    svuotati.push({ uid: r.uid, nome });
  }
  return { letti: righe.length, svuotati: svuotati.length, restanoDiversi: diversi, restanoDellUtente: dellUtente, restanoSenzaElemento: senzaElemento, voci: svuotati };
}

interface EsitoAttivita { chiave: string; esito: string; motivo?: string; prima?: unknown; dopo?: unknown }

/** (3) Un'attività dell'elenco: le Doti in prosa tolte dove ripetono gli effetti, il paragrafo delle note corretto se è quello letto. */
function scriviAttivita(db: AppDatabase, a: AttivitaDati): EsitoAttivita {
  const r = db.prepare('SELECT doti_json, effetti_json, dettagli, origine, seed_json FROM main.attivita WHERE chiave = ?').get(a.chiave) as
    { doti_json: string; effetti_json: string | null; dettagli: string | null; origine: string; seed_json: string | null } | undefined;
  if (!r) return { chiave: a.chiave, esito: 'attività assente: niente da fare' };
  const paragrafi = r.dettagli?.split('\n\n') ?? [];
  const paragrafoFatto = !a.paragrafo || paragrafi.includes(a.paragrafo.dopo);
  if (r.doti_json === '[]' && paragrafoFatto) return { chiave: a.chiave, esito: 'già applicata' };
  if (r.origine !== 'seed' || r.seed_json !== null) return { chiave: a.chiave, esito: 'saltata: attività corretta dall’utente, le sue Doti in prosa restano' };
  if (r.doti_json !== a.doti) return { chiave: a.chiave, esito: 'saltata: Doti in prosa diverse da quelle lette' };
  if (r.effetti_json !== a.effetti) return { chiave: a.chiave, esito: 'saltata: effetti strutturati diversi da quelli letti (la prosa non è più detta da loro)' };
  // ogni Dote nominata dalla prosa è negli effetti, con le stesse note dove la prosa le dice
  const prosa = JSON.parse(a.doti) as Array<{ dote: string | null; note: number | null }>;
  const effetti = leggiVociEffetto(r.effetti_json).flatMap((v) => (v.effetto.famiglia === 'dote' ? [{ dote: v.effetto.dote, note: v.effetto.note }] : []));
  if (!prosa.length || prosa.some((d) => !d.dote || !effetti.some((e) => e.dote === d.dote && (d.note === null || e.note === d.note)))) return { chiave: a.chiave, esito: 'saltata: una Dote della prosa non è negli effetti' };
  let dettagli = r.dettagli;
  if (a.paragrafo && !paragrafoFatto) {
    if (paragrafi.filter((p) => p === a.paragrafo!.prima).length !== 1) return { chiave: a.chiave, esito: 'saltata: il paragrafo «Note sulle Doti» non è quello letto' };
    dettagli = paragrafi.map((p) => (p === a.paragrafo!.prima ? a.paragrafo!.dopo : p)).join('\n\n');
  }
  if (db.prepare("UPDATE main.attivita SET doti_json = '[]', dettagli = ? WHERE chiave = ? AND doti_json = ? AND dettagli IS ? AND origine = 'seed' AND seed_json IS NULL")
    .run(dettagli, a.chiave, r.doti_json, r.dettagli).changes !== 1) errore(`l'attività ${a.chiave} non è stata scritta`);
  return { chiave: a.chiave, esito: 'scritta', motivo: a.motivo, prima: { doti_json: r.doti_json, dettagli: r.dettagli }, dopo: { doti_json: '[]', dettagli } };
}

/** L'audit: la prima esecuzione sempre, le successive solo se hanno cambiato qualcosa. */
function scriviAudit(db: AppDatabase, dati: FileDati, esecuzione: Record<string, unknown>, cambiato: boolean): void {
  const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(AUDIT) as string | undefined;
  if (vecchio && !cambiato) return;
  let esecuzioni: unknown[] = [];
  if (vecchio) { try { const v = JSON.parse(vecchio) as { esecuzioni?: unknown }; esecuzioni = Array.isArray(v.esecuzioni) ? v.esecuzioni : []; } catch { esecuzioni = []; } }
  db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
    .run(AUDIT, JSON.stringify({
      migrazione: 312, lotto: dati.lotto, richiesta: RICHIESTA, letto: dati.letto, fonti: dati.fonti, regole: dati.regole,
      lasciate: dati.lasciate, attivitaLasciate: dati.attivitaLasciate,
      esecuzioni: [...esecuzioni, { il: new Date().toISOString(), ...esecuzione }],
    }));
}

export const migration312: Migration = {
  id: 312,
  name: 'voci_attivita_collegate',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['voce_giornata', 'voce_effetto', 'attivita', 'dati_guida']) if (!esisteTabella(db, t)) { logger.warn({ migrazione: 312, tabella: t }, 'tabella assente: niente da fare'); return; }
    const dati = leggiDati();
    const adesso = new Date().toISOString();
    const partiteAttaccate = (db.prepare('PRAGMA database_list').all() as Array<{ name: string }>).some((s) => s.name === 'utente');
    const partitePrima = partiteAttaccate ? improntaPartite(db) : null;
    const partite = tabellePartiteConVoce(db);
    const voci = dati.voci.map((x) => scriviVoce(db, x, partite, adesso));
    const nomi = nomiDaiCollegamenti(db);
    const attivita = dati.attivita.map((a) => scriviAttivita(db, a));
    if (partiteAttaccate && improntaPartite(db) !== partitePrima) errore('le partite risultano cambiate');
    const collegate = voci.filter((v) => v.esito === 'collegata').length;
    const scritte = attivita.filter((a) => a.esito === 'scritta').length;
    const svuotati = typeof nomi.svuotati === 'number' ? nomi.svuotati : 0;
    const cambiato = collegate + scritte + svuotati > 0;
    if (cambiato) invalidaCacheDiGioco();
    scriviAudit(db, dati, { voci, nomi, attivita }, cambiato);
    logger.info({ migrazione: 312, collegate, saltate: voci.filter((v) => v.esito.startsWith('saltata')).length, nomiSvuotati: svuotati, attivitaScritte: scritte },
      'Diario: voci di attività collegate, nomi dei collegamenti dall’elemento, Doti in prosa delle attività');
  },
};
