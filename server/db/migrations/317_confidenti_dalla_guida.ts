// ============================================================
// Migrazione 317 — Confidenti dalla guida (O8-3): i testi del rango 1 di Takemi e Ohya, Futaba mai con la pioggia, l'evento 7.5 di Takemi con la
// pioggia, le frasi di note e fasce in prosa che la guida smentisce
// ============================================================
//
// L13, ondata 8, lotto O8-3. Risposta dell'utente del 2026-10-31 alle domande aperte dell'ondata 6: «3 per i punti a,b,c,d,e,f fai riferimento
// alla guida su https://www.allgamestaff.it/persona-5-royal/». Regola: dove la guida dice, si struttura o si corregge; dove tace, si lascia e lo
// si scrive nell'audit. Supera la decisione 14 (b) e (d) e chiude le domande 1-3 lasciate «in attesa» dalla 306.
//
// Che cosa fa, ogni scrittura con `WHERE` sul valore letto (una riga diversa da quella attesa è dell'utente o è già cambiata: si salta e si dice):
//   (a) Takemi e Ohya, rango 1: il testo «si sblocca a partire dal 15 aprile / 18 giugno (indicazione dell'utente, 2026-09-05)» contraddiceva il
//       dato (04-18, 07-05), che è quello della guida («Giorno consigliato: 18 aprile» / «5 luglio»; il 18 giugno è il rango 1 di Yusuke): il
//       testo diventa la frase generata dal dato (`descriviRequisitoSpillo`, la stessa di `impostaRequisitiRango` quando il testo è vuoto), in
//       `confidente_requisito` e nella copia della guida `confidente_requisito_guida`, solo se testo e dato sono quelli letti;
//   (b) Futaba «non è mai disponibile anche in caso di pioggia»: il requisito `meteo non-piove` a ogni rango (1-10) in coda (indice successivo
//       all'ultimo), nelle due tabelle, dove il rango non lo ha già (come Yoshida); poi la riga `pioggia` non letta esce dalle eccezioni della
//       disponibilità di Futaba (e dalla fotografia di «Ripristina», se c'è), solo se le eccezioni sono esattamente quelle lette;
//   (c) Takemi: «gli eventi di aumento del rango di Takemi di livello 6, 7.5 e 9 non sono disponibili quando piove». Il 7.5 è l'incontro verso il
//       rango 8 prima dello sblocco di «Medicina amara» (si sblocca nel 7.5): al rango 8 il requisito «almeno una» fra lo sblocco della Richiesta e
//       «non deve piovere», nelle due tabelle; la frase della nota che lo diceva in prosa esce dalle note di Takemi;
//   (d) Yusuke, rango 8: la guida lo esclude dai ranghi che non si fanno con la pioggia (4, 6 e 9) e non dice che la richieda: esce dalla nota la
//       frase «Il rango 8 richiede esplicitamente la pioggia.» (il resto resta);
//   (e) date di sblocco in prosa (audit 307): la guida dà solo il «giorno consigliato», nessuna data di sblocco: nessuna modifica (nell'audit);
//   (f) fasce in prosa: Kasumi «sera (presunta…)» esce (la guida dà incontri su messaggio anche dopo le lezioni; la struttura `su-messaggio`
//       resta); Takemi di sera con la relazione romantica (l'app non ha lo stato), Ryuji «nei giorni di pioggia» (senza fonte), Igor «notte»
//       (il modo `trama` lo rende): restano, nell'audit.
// Le note e le fasce in prosa si scrivono come la 307: se c'è lo storico dell'editor delle informazioni e finisce sulla riga di adesso gli si
// aggiunge la revisione «migrazione»; se non vi finisce, la riga si salta. Le partite non si toccano (impronta di tutto lo schema `utente`, prima e
// dopo). Idempotente: la seconda volta non trova niente da fare e non scrive. Audit in `dati_guida.audit-317-confidenti-guida`.
// ============================================================

import { createHash } from 'node:crypto';
import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';
import { descriviRequisitoSpillo, normalizzaRequisitoSpillo, type RequisitoSpillo } from '../../../shared/condizioniSpillo.js';
import { richiedeNonPioggia } from '../../../shared/disponibilitaStrutturata.js';

const AUDIT = 'audit-317-confidenti-guida';
const RICHIESTA = '2026-10-31: «3 per i punti a,b,c,d,e,f fai riferimento alla guida su https://www.allgamestaff.it/persona-5-royal/» (L13, ondata 8, lotto O8-3)';
const GUIDA = 'https://www.allgamestaff.it/persona-5-royal/';
const PAGINA = (p: string) => `${GUIDA}${p}/`;
const FONTI = {
  takemi: PAGINA('guida-rango-confidente-di-tae-takemi-morte'),
  ohya: PAGINA('guida-rango-confidente-di-ohya-diavolo'),
  yusuke: PAGINA('guida-rango-confidente-di-yusuke-imperatore'),
  futaba: PAGINA('guida-rango-confidente-di-futaba-eremita'),
  kasumi: PAGINA('guida-rango-confidente-di-kasumi-fede'),
  igor: PAGINA('guida-rango-confidente-igor-matto'),
  ryuji: PAGINA('guida-rango-confidente-di-ryuji-carro'),
} as const;
const SEED = (c: string) => `disponibilita-struttura-seed-v1:${c}`;
const STORICO = 'confidente-disponibilita-editor-v1:';
const TABELLE = ['confidente_requisito', 'confidente_requisito_guida'] as const;
type Tabella = typeof TABELLE[number];
const errore = (motivo: string): never => { throw new Error(`317: ${motivo}; nessuna modifica applicata.`); };
type Esito = { punto: string; chiave: string; esito: string; prima?: unknown; dopo?: unknown };

// ---- i dati letti il 2026-10-31 (copia portata alla 316) e le citazioni della guida ----

/** (a) Il testo del rango 1 che contraddiceva il dato: il dato (già della guida) e il testo letto. */
const RANGO_1: ReadonlyArray<{ confidente: 'takemi' | 'ohya'; dal: string; testo: string; citazione: string }> = [
  { confidente: 'takemi', dal: '04-18', testo: "Rango 1: si sblocca a partire dal 15 aprile (indicazione dell'utente, 2026-09-05).",
    citazione: 'Rango 1 — Giorno consigliato: 18 aprile (la soluzione del 16 aprile porta alla clinica per la prima visita: il 15 non è possibile)' },
  { confidente: 'ohya', dal: '07-05', testo: "Rango 1: si sblocca a partire dal 18 giugno (indicazione dell'utente, 2026-09-05).",
    citazione: 'Rango 1 — Giorno consigliato: 5 luglio (il 18 giugno è il rango 1 di Yusuke, «Giorno consigliato: 18 giugno»)' },
];

/** (b) Futaba: il requisito di ogni rango e le eccezioni lette (la riga `pioggia` che il valutatore non legge più dalla 306). */
const FUTABA = {
  confidente: 'futaba', ranghi: Array.from({ length: 10 }, (_, i) => i + 1),
  condizione: { tipo: 'meteo', condizione: 'non-piove' } as const,
  testo: 'Futaba non è mai disponibile in caso di pioggia.',
  eccezioniLette: JSON.stringify([{ tipo: 'pioggia', effetto: 'non-disponibile' }]),
  citazione: 'disponibile solo di giorno (mercoledì, giovedì, sabato e domenica); «Non è mai disponibile anche in caso di pioggia»',
};

/** (c) Takemi, rango 8: l'evento 7.5 (prima dello sblocco di «Medicina amara») non si fa con la pioggia. */
const TAKEMI_75 = {
  confidente: 'takemi', rango: 8, richiesta: 'medicina-amara',
  condizione: { tipo: 'gruppo', modo: 'almeno-una', condizioni: [{ tipo: 'sblocco', bersaglio: 'richiesta', chiave: 'medicina-amara' }, { tipo: 'meteo', condizione: 'non-piove' }] } as const,
  testo: 'L’evento del rango 7.5 non è disponibile quando piove',
  citazione: '«gli eventi di aumento del rango di Takemi di livello 6, 7.5 e 9 non sono disponibili quando piove»; nel 7.5 «sbloccherete una nuova richiesta dei Memento» («Medicina amara»)',
};

/** (c), (d), (f) Le colonne in prosa: il testo letto e quello che prende (solo la frase che la guida smentisce o che la struttura ora dice esce). */
const PROSA: ReadonlyArray<{ punto: string; confidente: string; colonna: 'note' | 'fasce_json'; atteso: string; nuovo: string; tolta: string; perche: string; fonte: string }> = [
  { punto: 'c', confidente: 'takemi', colonna: 'note', atteso: "L'evento del rango 7.5 non è disponibile nei giorni di pioggia.", nuovo: '',
    tolta: "L'evento del rango 7.5 non è disponibile nei giorni di pioggia.", perche: 'resa dal requisito «almeno una» del rango 8 (punto c)', fonte: FONTI.takemi },
  { punto: 'd', confidente: 'yusuke', colonna: 'note',
    atteso: 'Il rango 8 richiede esplicitamente la pioggia. Nessuna diramazione romantica: Yusuke non è un interesse amoroso in P5R.',
    nuovo: 'Nessuna diramazione romantica: Yusuke non è un interesse amoroso in P5R.', tolta: 'Il rango 8 richiede esplicitamente la pioggia.',
    perche: '«In generale, è disponibile anche in caso di pioggia»; solo i ranghi 4, 6 e 9 «non sono disponibili in caso di pioggia»; il rango 8 (16 agosto, «Un altro giorno di pioggia») si fa con la pioggia ma non la richiede', fonte: FONTI.yusuke },
  { punto: 'f', confidente: 'kasumi', colonna: 'fasce_json', atteso: JSON.stringify(['sera (presunta, non specificata esplicitamente per ogni data)']), nuovo: '[]',
    tolta: 'sera (presunta, non specificata esplicitamente per ogni data)',
    perche: 'la guida non dà una fascia: «possiamo progredire solo quando riceviamo un messaggio sul telefono», «Dopo le lezioni riceveremo un messaggio … da Kasumi», «Trascorreremo del tempo con Kasumi, incontrandola in mensa»; la struttura `su-messaggio` resta', fonte: FONTI.kasumi },
];

/** (e) e (f): ciò che la guida non risolve o che non si struttura in questo lotto, per l'audit (nessuna modifica). */
const NON_MODIFICATI = [
  { punto: 'e', chiave: 'iwai', che: 'audit 307: «15 agosto» in prosa; la guida dà il giorno consigliato del rango 1 (15/8, con Coraggio 4: requisito già presente), nessuna data di sblocco', fonte: PAGINA('guida-rango-confidente-di-iwai-appeso') },
  { punto: 'e', chiave: 'sojiro', che: 'audit 307: «23 aprile» in prosa; la guida dà il giorno consigliato (23/4, dopo Kamoshida: requisito `palazzo kamoshida` già presente), nessuna data di sblocco', fonte: PAGINA('guida-rango-confidente-di-sojiro-ierofante') },
  { punto: 'e', chiave: 'hifumi', che: 'audit 307: «28 giugno» in prosa contro il dato dal 25/6; la guida dà il giorno consigliato (2/7, con Fascino 3: già presente), nessuna data di sblocco', fonte: PAGINA('guida-rango-confidente-di-hifumi-stella') },
  { punto: 'e', chiave: 'shinya', che: 'audit 307: «5 settembre» in prosa contro il dato dal 4/9; la guida dà il giorno consigliato (19/9), nessuna data di sblocco', fonte: PAGINA('guida-rango-confidente-di-shinya-torre') },
  { punto: 'e', chiave: 'yoshida', che: 'audit 307: «dall’inizio di maggio» in prosa; la guida dà il giorno consigliato (10/5), nessuna data di sblocco', fonte: PAGINA('guida-rango-confidente-di-yoshida-sole') },
  { punto: 'f', chiave: 'takemi', che: 'fasce in prosa «Sera (se relazione romantica avviata)»: la guida lo dice («potremo trascorrere del tempo con lei solo di sera anziché di giorno»), ma l’app non ha lo stato «relazione romantica»: non strutturato, domanda all’utente', fonte: FONTI.takemi },
  { punto: 'f', chiave: 'ryuji', che: 'fasce in prosa «sera (solo rango 7 …; e nei giorni di pioggia)»: la guida dice solo che il rango 7 si svolge di sera (già `fascia-rango` 7 sera); la parte sulla pioggia non ha fonte nella guida: resta', fonte: FONTI.ryuji },
  { punto: 'f', chiave: 'igor', che: 'fasce in prosa «notte (durante il sonno …)»: la guida conferma i ranghi in sogno, il modo `trama` lo rende e il vocabolario non ha una fascia «notte»: resta', fonte: FONTI.igor },
];

// ---- letture ----

/** Il JSON rimesso in forma canonica; null se non si legge. */
function canonica(testo: string | null | undefined): string | null {
  if (testo === null || testo === undefined) return null;
  try { return JSON.stringify(JSON.parse(testo)); } catch { return null; }
}

/** La condizione di una riga di requisito (tipo + dati), o null se non si legge. */
function condizioneDellaRiga(r: { tipo: string; dati_json: string }): RequisitoSpillo | null {
  let dati: unknown;
  try { dati = JSON.parse(r.dati_json); } catch { return null; }
  return dati && typeof dati === 'object' ? normalizzaRequisitoSpillo({ ...(dati as Record<string, unknown>), tipo: r.tipo }) : null;
}

/** I dati di una condizione come li scrive `requisitiConfidentiService` (senza `tipo`). */
function datiDi(c: RequisitoSpillo): string {
  const { tipo: _tipo, ...dati } = c as RequisitoSpillo & Record<string, unknown>;
  return JSON.stringify(dati);
}

type RigaRequisito = { rango: number; indice: number; tipo: string; dati_json: string; testo: string };
const righeDelRango = (db: AppDatabase, t: Tabella, confidente: string, rango: number): RigaRequisito[] =>
  db.prepare(`SELECT rango, indice, tipo, dati_json, testo FROM main.${t} WHERE confidente_chiave = ? AND rango = ? ORDER BY indice`).all(confidente, rango) as RigaRequisito[];

/** L'impronta di tutto lo schema `utente` (ogni tabella, ogni riga): alla fine deve essere identica. */
function improntaPartite(db: AppDatabase): string {
  const h = createHash('sha256');
  for (const t of (db.prepare("SELECT name FROM utente.sqlite_master WHERE type = 'table' ORDER BY name").all() as Array<{ name: string }>).map((x) => x.name)) {
    h.update(`#${t}\n`);
    for (const r of db.prepare(`SELECT * FROM utente."${t}"`).iterate()) h.update(JSON.stringify(r) + '\n');
  }
  return h.digest('hex');
}

// ---- (a) i testi del rango 1 ----

function testiRango1(db: AppDatabase): Esito[] {
  const esiti: Esito[] = [];
  for (const r of RANGO_1) {
    const dato = JSON.stringify({ dal: r.dal });
    const nuovo = descriviRequisitoSpillo({ tipo: 'data', dal: r.dal });
    for (const t of TABELLE) {
      const chiave = `${t}:${r.confidente}:1`;
      const righe = righeDelRango(db, t, r.confidente, 1).filter((x) => x.tipo === 'data');
      if (righe.length !== 1) { esiti.push({ punto: 'a', chiave, esito: `righe «data» del rango 1: ${righe.length}, non una: non toccate` }); continue; }
      const riga = righe[0]!;
      if (riga.testo === nuovo && canonica(riga.dati_json) === dato) { esiti.push({ punto: 'a', chiave, esito: 'testo già generato dal dato' }); continue; }
      if (riga.testo !== r.testo || canonica(riga.dati_json) !== dato) { esiti.push({ punto: 'a', chiave, esito: 'testo o dato diversi da quelli letti (cambiati dall’utente o già toccati): non toccata', prima: riga }); continue; }
      if (db.prepare(`UPDATE main.${t} SET testo = ? WHERE confidente_chiave = ? AND rango = 1 AND indice = ? AND tipo = 'data' AND testo = ? AND dati_json = ?`)
        .run(nuovo, r.confidente, riga.indice, riga.testo, riga.dati_json).changes !== 1) errore(`il testo del rango 1 di ${r.confidente} in ${t} non si aggiorna`);
      esiti.push({ punto: 'a', chiave, esito: `testo generato dal dato (${FONTI[r.confidente]}: ${r.citazione})`, prima: riga.testo, dopo: nuovo });
    }
  }
  return esiti;
}

// ---- (b), (c) i requisiti nuovi ----

/** Aggiunge in coda al rango, nelle due tabelle, il requisito dato, dove il rango non ne ha già uno uguale (`gia` dice quando c'è già). */
function aggiungiInCoda(db: AppDatabase, punto: string, confidente: string, rango: number, condizione: RequisitoSpillo, testo: string, gia: (c: RequisitoSpillo) => boolean, fonte: string): Esito[] {
  return TABELLE.map((t): Esito => {
    const chiave = `${t}:${confidente}:${rango}`;
    const righe = righeDelRango(db, t, confidente, rango);
    if (righe.some((r) => { const c = condizioneDellaRiga(r); return !!c && gia(c); })) return { punto, chiave, esito: 'il rango ha già il requisito' };
    const indice = righe.reduce((m, r) => Math.max(m, Number(r.indice)), -1) + 1;
    db.prepare(`INSERT INTO main.${t} (confidente_chiave, rango, indice, tipo, dati_json, testo) VALUES (?, ?, ?, ?, ?, ?)`).run(confidente, rango, indice, condizione.tipo, datiDi(condizione), testo);
    return { punto, chiave, esito: `requisito aggiunto in coda (indice ${indice}; ${fonte})`, dopo: { indice, tipo: condizione.tipo, dati_json: datiDi(condizione), testo } };
  });
}

/** La fotografia di «Ripristina» di un Confidente (testo grezzo), se c'è. */
const fotografia = (db: AppDatabase, c: string): string | undefined =>
  db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(SEED(c)) as string | undefined;

function futaba(db: AppDatabase): Esito[] {
  const condizione = normalizzaRequisitoSpillo(FUTABA.condizione) ?? errore('la condizione «non deve piovere» non è del vocabolario');
  const esiti: Esito[] = FUTABA.ranghi.flatMap((rango) => aggiungiInCoda(db, 'b', FUTABA.confidente, rango, condizione, FUTABA.testo, richiedeNonPioggia, FONTI.futaba));
  // la riga `pioggia` delle eccezioni: esce solo se le eccezioni sono esattamente quelle lette
  const r = db.prepare('SELECT eccezioni_json FROM main.confidente_disponibilita WHERE confidente_chiave = ?').get(FUTABA.confidente) as { eccezioni_json: string } | undefined;
  const chiave = `disponibilita:${FUTABA.confidente}`;
  if (!r) esiti.push({ punto: 'b', chiave, esito: 'riga assente: niente da fare' });
  else if (canonica(r.eccezioni_json) === '[]') esiti.push({ punto: 'b', chiave, esito: 'eccezioni già senza la pioggia' });
  else if (canonica(r.eccezioni_json) !== FUTABA.eccezioniLette) esiti.push({ punto: 'b', chiave, esito: 'eccezioni diverse da quelle lette (cambiate dall’utente): non toccate', prima: r.eccezioni_json });
  else {
    if (db.prepare('UPDATE main.confidente_disponibilita SET eccezioni_json = ? WHERE confidente_chiave = ? AND eccezioni_json = ?').run('[]', FUTABA.confidente, r.eccezioni_json).changes !== 1) errore('le eccezioni di Futaba non si aggiornano');
    esiti.push({ punto: 'b', chiave, esito: 'riga «pioggia» tolta: la dicono i requisiti di ogni rango', prima: r.eccezioni_json, dopo: '[]' });
  }
  // la fotografia di «Ripristina», se c'è (stesso metodo della 306 (a))
  const seed = fotografia(db, FUTABA.confidente);
  if (seed !== undefined) {
    let foto: Record<string, unknown> | null;
    try { foto = JSON.parse(seed) as Record<string, unknown>; } catch { foto = null; }
    const ecc = foto && typeof foto.eccezioni_json === 'string' ? canonica(foto.eccezioni_json) : null;
    if (!foto || ecc === null) esiti.push({ punto: 'b', chiave: `fotografia:${FUTABA.confidente}`, esito: 'fotografia illeggibile: non toccata' });
    else if (ecc === FUTABA.eccezioniLette) {
      if (db.prepare('UPDATE main.dati_guida SET json = ? WHERE chiave = ? AND json = ?').run(JSON.stringify({ ...foto, eccezioni_json: '[]' }), SEED(FUTABA.confidente), seed).changes !== 1) errore('la fotografia di Futaba non si aggiorna');
      esiti.push({ punto: 'b', chiave: `fotografia:${FUTABA.confidente}`, esito: 'riga «pioggia» tolta dalla fotografia di «Ripristina»', prima: foto.eccezioni_json, dopo: '[]' });
    } else if (ecc !== '[]') esiti.push({ punto: 'b', chiave: `fotografia:${FUTABA.confidente}`, esito: 'eccezioni della fotografia diverse da quelle lette: non toccate', prima: foto.eccezioni_json });
  }
  return esiti;
}

/** Il requisito del 7.5 come condizione del vocabolario (un dato che il normalizzatore rifiuta ferma la migrazione). */
const requisito75 = (): RequisitoSpillo => normalizzaRequisitoSpillo(TAKEMI_75.condizione) ?? errore('il requisito del 7.5 di Takemi non è del vocabolario');
const eRequisito75 = (c: RequisitoSpillo): boolean => c.tipo === 'gruppo' && datiDi(c) === datiDi(requisito75());

function takemi75(db: AppDatabase): Esito[] {
  const condizione = requisito75();
  if (!db.prepare('SELECT 1 FROM main.richiesta WHERE chiave = ?').get(TAKEMI_75.richiesta)) {
    return [{ punto: 'c', chiave: `requisito:${TAKEMI_75.confidente}:${TAKEMI_75.rango}`, esito: `la Richiesta «${TAKEMI_75.richiesta}» non c’è: requisito non aggiunto` }];
  }
  return aggiungiInCoda(db, 'c', TAKEMI_75.confidente, TAKEMI_75.rango, condizione, TAKEMI_75.testo, eRequisito75, FONTI.takemi);
}

/** Il requisito del 7.5 c'è nella tabella dei requisiti (la nota di Takemi esce solo allora). */
const conRequisito75 = (db: AppDatabase): boolean => righeDelRango(db, 'confidente_requisito', TAKEMI_75.confidente, TAKEMI_75.rango)
  .some((r) => { const c = condizioneDellaRiga(r); return !!c && eRequisito75(c); });

// ---- (c), (d), (f) le colonne in prosa, con lo storico dell'editor delle informazioni come la 307 ----

/** Le otto colonne in prosa della riga, nell'ordine dello storico dell'editor. */
const COLONNE = ['giorni_json', 'fasce_json', 'luogo', 'sblocco_data', 'sblocco_requisiti', 'note', 'note_generali', 'fonti_json'] as const;
type Raw = Record<typeof COLONNE[number], string>;
type Revisione = { id: number; azione: string; data: string; motivo: string; operazioneId: string; richiesta: string; prima: unknown; dopo: unknown };
type Registro = Record<string, unknown> & { revisioni: Revisione[]; iniziale: unknown };

/** Come l'impronta dello storico dell'editor (`disponibilitaConfidentiService`): JSON canonico, SHA-256. */
function canonico(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonico).join(',')}]`;
  if (v !== null && typeof v === 'object') return `{${Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => `${JSON.stringify(k)}:${canonico(x)}`).join(',')}}`;
  return JSON.stringify(v);
}
const impronta = (v: unknown) => createHash('sha256').update(canonico(v)).digest('hex');
const ugualiRaw = (a: unknown, b: Raw): boolean => !!a && typeof a === 'object' && Object.keys(a).length === COLONNE.length
  && COLONNE.every((c) => (a as Record<string, unknown>)[c] === b[c]);

/** Lo storico dell'editor della riga, se c'è; `coerente` = finisce sulla riga di adesso. */
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

function prosa(db: AppDatabase, adesso: string): Esito[] {
  const esiti: Esito[] = [];
  for (const p of PROSA) {
    const chiave = `${p.colonna}:${p.confidente}`;
    if (p.punto === 'c' && !conRequisito75(db)) { esiti.push({ punto: p.punto, chiave, esito: 'il requisito del 7.5 non c’è nei requisiti: la nota resta' }); continue; }
    const r = db.prepare(`SELECT ${COLONNE.join(', ')} FROM main.confidente_disponibilita WHERE confidente_chiave = ?`).get(p.confidente) as Record<string, unknown> | undefined;
    if (!r) { esiti.push({ punto: p.punto, chiave, esito: 'riga assente: niente da fare' }); continue; }
    if (COLONNE.some((c) => typeof r[c] !== 'string')) { esiti.push({ punto: p.punto, chiave, esito: 'riga con colonne non testuali: saltata' }); continue; }
    const prima = Object.fromEntries(COLONNE.map((c) => [c, r[c] as string])) as Raw;
    if (prima[p.colonna] === p.nuovo) { esiti.push({ punto: p.punto, chiave, esito: 'già senza la frase' }); continue; }
    if (prima[p.colonna] !== p.atteso) { esiti.push({ punto: p.punto, chiave, esito: 'testo diverso da quello letto (cambiato dall’utente o già toccato): saltato', prima: prima[p.colonna] }); continue; }
    const dopo: Raw = { ...prima, [p.colonna]: p.nuovo };
    const storico = leggiStorico(db, p.confidente, prima);
    if (storico && (!storico.coerente || !storico.registro)) { esiti.push({ punto: p.punto, chiave, esito: 'lo storico dell’editor non finisce sulla riga di adesso: saltato', prima: prima[p.colonna] }); continue; }
    if (db.prepare(`UPDATE main.confidente_disponibilita SET ${p.colonna} = ? WHERE confidente_chiave = ? AND ${p.colonna} = ?`).run(p.nuovo, p.confidente, p.atteso).changes !== 1) errore(`${p.colonna} di ${p.confidente} non si aggiorna`);
    if (storico?.registro) {
      const reg = storico.registro;
      const operazioneId = `migrazione-317-${p.confidente}`;
      if (reg.revisioni.some((x) => x.operazioneId === operazioneId)) errore(`lo storico di ${p.confidente} ha già la revisione della 317`);
      reg.revisioni.push({ id: reg.revisioni.length + 1, azione: 'migrazione', data: adesso,
        motivo: `Migrazione 317: dalla guida (${p.fonte}) esce la frase «${p.tolta}».`, operazioneId, richiesta: impronta({ chiave: p.confidente, migrazione: 317 }), prima, dopo });
      if (db.prepare('UPDATE main.dati_guida SET json = ? WHERE chiave = ?').run(JSON.stringify(reg), STORICO + p.confidente).changes !== 1) errore(`lo storico di ${p.confidente} non si aggiorna`);
    }
    esiti.push({ punto: p.punto, chiave, esito: `tolta la frase «${p.tolta}» (${p.fonte}: ${p.perche})${storico?.registro ? '; storico dell’editor con la revisione «migrazione»' : ''}`, prima: p.atteso, dopo: p.nuovo });
  }
  return esiti;
}

// ---- audit ----

/** Da quale voce del Diario la partita riceve lo sblocco di «Medicina amara» (sola lettura, per l'audit: un'anomalia da segnalare, non da toccare). */
function vociDelloSblocco(db: AppDatabase): unknown[] {
  if (!esisteTabella(db, 'voce_effetto') || !esisteTabella(db, 'voce_giornata')) return [];
  return db.prepare("SELECT v.uid, v.data, v.fascia, v.azione FROM main.voce_effetto e JOIN main.voce_giornata v ON v.uid = e.voce_uid WHERE e.tipo = 'sblocco' AND e.chiave = ? ORDER BY v.data, v.ordine")
    .all(`richiesta:${TAKEMI_75.richiesta}`);
}

/** L'audit: la prima esecuzione sempre, le successive solo se hanno cambiato qualcosa. */
function scriviAudit(db: AppDatabase, esecuzione: Record<string, unknown>, cambiato: boolean): void {
  const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(AUDIT) as string | undefined;
  if (vecchio && !cambiato) return;
  let esecuzioni: unknown[] = [];
  if (vecchio) { try { const v = JSON.parse(vecchio) as { esecuzioni?: unknown }; esecuzioni = Array.isArray(v.esecuzioni) ? v.esecuzioni : []; } catch { esecuzioni = []; } }
  db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
    .run(AUDIT, JSON.stringify({
      migrazione: 317, lotto: 'O8-3', richiesta: RICHIESTA, fonti: Object.values(FONTI),
      regola: 'dove la guida dice si struttura o si corregge, dove tace si lascia e si scrive; ogni scrittura sul valore letto (righe diverse: saltate); requisiti in coda nelle due tabelle (requisiti e copia della guida); note e fasce col metodo della 307; le partite non si toccano',
      punti: {
        a: RANGO_1.map((r) => ({ confidente: r.confidente, fonte: FONTI[r.confidente], citazione: r.citazione, testoLetto: r.testo, dato: r.dal })),
        b: { fonte: FONTI.futaba, citazione: FUTABA.citazione, requisito: FUTABA.condizione, testo: FUTABA.testo, eccezioneTolta: FUTABA.eccezioniLette },
        c: { fonte: FONTI.takemi, citazione: TAKEMI_75.citazione, rango: TAKEMI_75.rango, requisito: TAKEMI_75.condizione, testo: TAKEMI_75.testo },
        d: { fonte: FONTI.yusuke, citazione: PROSA.find((p) => p.punto === 'd')!.perche },
        f: { fonte: FONTI.kasumi, citazione: PROSA.find((p) => p.punto === 'f')!.perche },
      },
      nonModificati: NON_MODIFICATI,
      anomalie: [{ che: 'lo sblocco di «Medicina amara» lo dà una voce che non è di Takemi (da correggere in un altro lotto, non qui)', voci: vociDelloSblocco(db) }],
      chiude: 'audit-306-disponibilita-fonte-unica, inAttesa 1-3; decisione 14 (b) e (d), superata dalla decisione 24',
      esecuzioni: [...esecuzioni, { il: new Date().toISOString(), ...esecuzione }],
    }));
}

export const migration317: Migration = {
  id: 317,
  name: 'confidenti_dalla_guida',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['confidente_disponibilita', ...TABELLE, 'dati_guida', 'richiesta']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 317, tabella: t }, 'tabella assente: niente da fare'); return; }
    }
    if (!haColonna(db, 'confidente_disponibilita', 'eccezioni_json')) { logger.warn({ migrazione: 317 }, 'disponibilità strutturata assente: niente da fare'); return; }
    const adesso = new Date().toISOString();
    const partiteAttaccate = (db.prepare('PRAGMA database_list').all() as Array<{ name: string }>).some((s) => s.name === 'utente');
    const partitePrima = partiteAttaccate ? improntaPartite(db) : null;
    const esiti: Esito[] = [...testiRango1(db), ...futaba(db), ...takemi75(db), ...prosa(db, adesso)];
    if (partiteAttaccate && improntaPartite(db) !== partitePrima) errore('le partite risultano cambiate');
    const scritto = (e: Esito) => /^(testo generato|requisito aggiunto|riga «pioggia» tolta|tolta la frase)/.test(e.esito);
    const conteggi = {
      testiRango1: esiti.filter((e) => e.punto === 'a' && scritto(e)).length,
      requisitiFutaba: esiti.filter((e) => e.punto === 'b' && e.esito.startsWith('requisito aggiunto')).length,
      eccezioniPioggiaTolte: esiti.filter((e) => e.punto === 'b' && e.esito.startsWith('riga «pioggia» tolta')).length,
      requisitiTakemi75: esiti.filter((e) => e.punto === 'c' && e.esito.startsWith('requisito aggiunto')).length,
      frasiTolte: esiti.filter((e) => e.esito.startsWith('tolta la frase')).length,
    };
    const cambiato = esiti.some(scritto);
    if (cambiato) invalidaCacheDiGioco();
    scriviAudit(db, { conteggi, esiti }, cambiato);
    logger.info({ migrazione: 317, ...conteggi }, 'Confidenti dalla guida: rango 1 di Takemi e Ohya, Futaba e la pioggia, il 7.5 di Takemi, note e fasce');
  },
};
