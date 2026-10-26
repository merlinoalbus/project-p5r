// ============================================================
// Migrazione 287 — ricompense, armi delle Richieste e regali senza copie né etichette (chiusura dell'ondata 5, chiusura del lotto F)
// ============================================================
//
// Revisione del lotto F, terzo giro (rilievi 2 e 6, rimasti aperti) e righe «Restano» del lotto F, con la decisione 21 («si tiene un solo punto
// per il testo dell'effetto (catalogo), si tolgono le copie») e la regola dell'utente «le etichette di testo devono essere visibili solo se hanno
// senso». Censimento completo delle ricompense delle Richieste, degli esami e del Covo e delle descrizioni del catalogo (2026-10-26):
//   1. `richiesta.ricompense_json` (le «Indicazioni della guida sulle ricompense» della pagina Richieste): sei voci ripetevano l'effetto
//      dell'oggetto collegato fra parentesi (Soma «cura HP e SP al 100%», che per di più non dice «di tutti gli alleati»; Cintura eccentrica; An.
//      inferno a spirale «attiva Mamudoon»; Catena dell'invidia «alta probabilità di Disperazione»; Fascia strana «+Annulla Paura»; Fiocco di neve
//      malvagio «per fusione di Frost Nero»): resta il nome con il tipo di oggetto, l'effetto lo dice la scheda. Le fotografie delle proposte di
//      collegamento ancora da approvare di quelle Richieste si riallineano (altrimenti risulterebbero «fonte cambiata»);
//   2. `ricompensa_oggetto.nota` delle Richieste: le note che ripetevano la categoria o l'effetto dell'oggetto collegato («libro», «carta
//      abilità», «armatura», «accessorio, attiva Mamudoon», «arma per Panther», «consumabile, cura HP e SP al 100%»…) si svuotano; restano le
//      note che dicono altro («Utile per il Rango Confidente con le Gemelle», il CD di Star Lilina da ritirare da Lily-Nyan). Le note degli
//      esami di Sojiro e del Covo perdono l'etichetta finale « · accessorio» / « · oggetto chiave»;
//   3. le armi e le protezioni date dalle Richieste avevano l'effetto nella descrizione («arma per Ann, alta probabilità di Disperazione»,
//      «armatura, +Annulla Paura») e nessuna statistica: ricevono effetto e statistiche delle pagine Armi da mischia [M] e Protezioni [P] (lette
//      il 2026-10-26), la descrizione si svuota. Le carte abilità e gli oggetti con «carta abilità» / «materiale di fusione» nella descrizione la
//      perdono (è la categoria);
//   4. le descrizioni che dicevano solo da quale Richiesta viene l'oggetto («Completando la richiesta "…"», «Ricompensa della Richiesta «…»»)
//      ripetono la ricompensa collegata, che la scheda mostra già («Ricompensa di …»): si svuotano, solo se il collegamento c'è davvero;
//   5. i regali con l'effetto «Regalo» (33): era l'etichetta della categoria, e l'effetto di un regalo (l'affinità) vive nelle reazioni dei
//      Confidenti (`confidente_regalo`); la scheda e il catalogo dicono «Si regala ai Confidenti» calcolandolo dalla categoria.
//
// Conservativa: le schede si toccano solo se sono della guida e mai corrette dall'utente e se il testo è quello atteso; le Richieste e le note
// delle ricompense (senza origine) solo se il testo è esattamente quello atteso. Nessuna voce del Diario e nessun dato delle partite cambia.
// Idempotente. Audit in `dati_guida.audit-287-ricompense-e-regali`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { FONTE_ARMI_MISCHIA, FONTE_PROTEZIONI, improntaDiario, riallineaFotografieProposte, scriviAuditChiusura, scriviColonnaCatalogo, type EsitoColonna } from './chiusuraOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-287-ricompense-e-regali';

/** 1. Le voci delle Richieste che ripetevano l'effetto: Richiesta, voce attesa, voce senza l'effetto. */
const VOCI_RICHIESTE: ReadonlyArray<{ richiesta: string; prima: string; dopo: string }> = [
  { richiesta: 'bullismo-sui-bulli', prima: 'Fiocco di neve malvagio (oggetto chiave, per fusione di Frost Nero)', dopo: 'Fiocco di neve malvagio (oggetto chiave)' },
  { richiesta: 'le-fatiche-di-una-maid-in-cattedra', prima: 'Catena dell\'invidia (arma per Ann, alta probabilità di Disperazione)', dopo: 'Catena dell\'invidia (arma per Ann)' },
  { richiesta: 'affari-loschi-nellombra', prima: 'Fascia strana (armatura, +Annulla Paura)', dopo: 'Fascia strana (armatura)' },
  { richiesta: 'una-madre-aggressiva', prima: 'Soma (consumabile, cura HP e SP al 100%)', dopo: 'Soma (consumabile)' },
  { richiesta: 'una-piccola-richiesta-daiuto', prima: 'An. inferno a spirale (accessorio, attiva Mamudoon)', dopo: 'An. inferno a spirale (accessorio)' },
  { richiesta: 'falsita-in-scena', prima: 'Cintura eccentrica (aumenta le probabilità di infliggere alterazioni negative)', dopo: 'Cintura eccentrica' },
];

/** 2. Le note delle ricompense: fonte, oggetto, nota attesa, nota nuova (null = vuota). */
const NOTE_RICOMPENSE: ReadonlyArray<{ tipo: string; fonte: string; oggetto: string; prima: string; dopo: string | null }> = [
  { tipo: 'richiesta', fonte: 'bullismo-sui-bulli', oggetto: 'chiave/fiocco-di-neve-malvagio', prima: 'oggetto chiave, per fusione di Frost Nero', dopo: null },
  { tipo: 'richiesta', fonte: 'il-sadismo-e-un-gesto-damore', oggetto: 'arma/spadafrusta', prima: 'arma per Panther', dopo: null },
  { tipo: 'richiesta', fonte: 'un-part-time-infernale', oggetto: 'libro/dolci-cinesi', prima: 'libro', dopo: null },
  { tipo: 'richiesta', fonte: 'medicina-amara', oggetto: 'carta-abilita/mediarama', prima: 'carta abilità', dopo: null },
  { tipo: 'richiesta', fonte: 'un-fidanzato-violento', oggetto: 'arma/ramo-del-sonno', prima: 'arma per Skull', dopo: null },
  { tipo: 'richiesta', fonte: 'le-fatiche-di-una-maid-in-cattedra', oggetto: 'arma/catena-dellinvidia', prima: 'arma per Ann, alta probabilità di Disperazione', dopo: null },
  // la Palla peli appiccicosa: la 285 ha portato la ricompensa sulla scheda «chiave»
  { tipo: 'richiesta', fonte: 'la-stalker-informatica', oggetto: 'chiave/palla-peli-appiccicosa', prima: 'materiale di fusione', dopo: null },
  { tipo: 'richiesta', fonte: 'smascheriamo-i-ciarlatani', oggetto: 'arma/mano-del-profeta', prima: 'arma per Makoto', dopo: null },
  { tipo: 'richiesta', fonte: 'affari-loschi-nellombra', oggetto: 'protezione/fascia-strana', prima: 'armatura, +Annulla Paura', dopo: null },
  { tipo: 'richiesta', fonte: 'chi-e-laggressore', oggetto: 'carta-abilita/carica', prima: 'carta abilità', dopo: null },
  { tipo: 'richiesta', fonte: 'non-siamo-i-tuoi-schiavi', oggetto: 'libro/parchi-divertimento', prima: 'libro', dopo: null },
  { tipo: 'richiesta', fonte: 'lottare-per-la-liberta-di-stampa', oggetto: 'carta-abilita/recupero-3', prima: 'carta abilità', dopo: null },
  { tipo: 'richiesta', fonte: 'un-intruso-a-yongen-jaya', oggetto: 'libro/shitamachi-rinato', prima: 'libro', dopo: null },
  { tipo: 'richiesta', fonte: 'mille-volti-e-mille-debiti', oggetto: 'carta-abilita/termopili', prima: 'carta abilità', dopo: null },
  { tipo: 'richiesta', fonte: 'i-vincenti-non-imbrogliano', oggetto: 'carta-abilita/annulla-att-fisici', prima: 'carta abilità', dopo: null },
  { tipo: 'richiesta', fonte: 'il-netturbino', oggetto: 'carta-abilita/rimonta', prima: 'carta abilità, utile per il Rango Confidente con le Gemelle', dopo: 'Utile per il Rango Confidente con le Gemelle' },
  { tipo: 'richiesta', fonte: 'lo-zio-ingordo', oggetto: 'arma/sciabola-del-rischio', prima: 'arma per Mona', dopo: null },
  { tipo: 'richiesta', fonte: 'e-una-figlia-o-un-buono-pasto', oggetto: 'carta-abilita/crescita-3', prima: 'carta abilità', dopo: null },
  { tipo: 'richiesta', fonte: 'una-madre-aggressiva', oggetto: 'consumabile/soma', prima: 'consumabile, cura HP e SP al 100%', dopo: null },
  { tipo: 'richiesta', fonte: 'raggirare-gli-anziani-non-si-fa', oggetto: 'protezione/veste-haten', prima: 'armatura', dopo: null },
  { tipo: 'richiesta', fonte: 'la-ballata-del-rubacuori', oggetto: 'accessorio/corona-del-tumulto', prima: 'accessorio', dopo: null },
  { tipo: 'richiesta', fonte: 'il-capoccia-dello-show-business', oggetto: 'protezione/gilet-immortale', prima: 'armatura', dopo: null },
  { tipo: 'richiesta', fonte: 'una-piccola-richiesta-daiuto', oggetto: 'accessorio/an-inferno-a-spirale', prima: 'accessorio, attiva Mamudoon', dopo: null },
  { tipo: 'richiesta', fonte: 'lidol-e-lunicorno', oggetto: 'carta-abilita/centro-perfetto', prima: 'carta abilità', dopo: null },
  { tipo: 'richiesta', fonte: 'falsita-in-scena', oggetto: 'altro/cintura-eccentrica', prima: 'aumenta le probabilità di infliggere alterazioni negative', dopo: null },
];
/** 2. Le etichette in coda alle note degli esami e del Covo. */
const ETICHETTE_FINALI = [' · accessorio', ' · oggetto chiave'] as const;

/** 3. Armi e protezioni delle Richieste: effetto e statistiche di [M] e [P], e la descrizione che li ripeteva (che si svuota). */
const EQUIPAGGIAMENTO: ReadonlyArray<{ chiave: string; effetto: string; statistiche: { per: string; testo: string }; descrizione: string; fonte: string }> = [
  { chiave: 'arma/catena-dellinvidia', effetto: 'Disperazione potente', statistiche: { per: 'Ann', testo: 'Attacco 10, Precisione 95' }, descrizione: 'arma per Ann, alta probabilità di Disperazione', fonte: FONTE_ARMI_MISCHIA },
  { chiave: 'arma/ramo-del-sonno', effetto: 'Sonno medio', statistiche: { per: 'Ryuji', testo: 'Attacco 144, Precisione 88' }, descrizione: 'arma per Skull', fonte: FONTE_ARMI_MISCHIA },
  { chiave: 'arma/mano-del-profeta', effetto: 'Soggiogamento potente', statistiche: { per: 'Makoto', testo: 'Attacco 10, Precisione 95' }, descrizione: 'arma per Makoto', fonte: FONTE_ARMI_MISCHIA },
  { chiave: 'arma/sciabola-del-rischio', effetto: '+Probabilità di critico (alta)', statistiche: { per: 'Morgana', testo: 'Attacco 10, Precisione 60' }, descrizione: 'arma per Mona', fonte: FONTE_ARMI_MISCHIA },
  { chiave: 'protezione/fascia-strana', effetto: '+Annulla Paura', statistiche: { per: 'tutti', testo: 'Difesa 160, Elusione 20' }, descrizione: 'armatura, +Annulla Paura', fonte: FONTE_PROTEZIONI },
  { chiave: 'protezione/gilet-immortale', effetto: '+30 HP', statistiche: { per: 'Solo uomini', testo: 'Difesa 274, Elusione 16' }, descrizione: 'armatura', fonte: FONTE_PROTEZIONI },
];
/** 3. Le descrizioni che erano solo la categoria. */
const DESCRIZIONI_ETICHETTA: ReadonlyArray<{ chiave: string; prima: string; dopo: string }> = [
  ...['mediarama', 'carica', 'recupero-3', 'termopili', 'annulla-att-fisici', 'crescita-3', 'centro-perfetto'].map((k) => ({ chiave: `carta-abilita/${k}`, prima: 'carta abilità', dopo: '' })),
  { chiave: 'carta-abilita/rimonta', prima: 'carta abilità, utile per il Rango Confidente con le Gemelle', dopo: 'Utile per il Rango Confidente con le Gemelle' },
];

/** 4. «Completando la richiesta "X"» / «Ricompensa della Richiesta «X» (Dedalo di …)»: il nome della Richiesta, se la descrizione è solo questo. */
function richiestaDellaDescrizione(d: string): string | null {
  return /^Completando la richiesta "([^"]+)"$/.exec(d)?.[1] ?? /^Ricompensa della Richiesta «([^»]+)»(?: \(Dedalo di [^)]+\))?$/.exec(d)?.[1] ?? null;
}

function vociRichieste(db: AppDatabase): { esiti: Array<{ richiesta: string; esito: string }>; cambiate: number; fotografie: number } {
  const esiti: Array<{ richiesta: string; esito: string }> = [];
  let cambiate = 0, fotografie = 0;
  if (!esisteTabella(db, 'richiesta')) return { esiti: [{ richiesta: '*', esito: 'tabella assente' }], cambiate, fotografie };
  for (const v of VOCI_RICHIESTE) {
    const r = db.prepare('SELECT ricompense_json FROM main.richiesta WHERE chiave = ?').get(v.richiesta) as { ricompense_json: string } | undefined;
    if (!r) { esiti.push({ richiesta: v.richiesta, esito: 'Richiesta assente' }); continue; }
    let voci: unknown;
    try { voci = JSON.parse(r.ricompense_json) as unknown; } catch { esiti.push({ richiesta: v.richiesta, esito: 'ricompense illeggibili: non toccate' }); continue; }
    if (!Array.isArray(voci)) { esiti.push({ richiesta: v.richiesta, esito: 'ricompense non in elenco: non toccate' }); continue; }
    if (voci.includes(v.dopo) && !voci.includes(v.prima)) { esiti.push({ richiesta: v.richiesta, esito: 'già senza la copia' }); continue; }
    if (!voci.includes(v.prima)) { esiti.push({ richiesta: v.richiesta, esito: 'voce diversa da quella attesa: non toccata' }); continue; }
    const nuovo = JSON.stringify(voci.map((x) => (x === v.prima ? v.dopo : x)));
    if (db.prepare('UPDATE main.richiesta SET ricompense_json = ? WHERE chiave = ? AND ricompense_json = ?').run(nuovo, v.richiesta, r.ricompense_json).changes !== 1) {
      throw new Error(`287: le ricompense della Richiesta ${v.richiesta} non si aggiornano; nessuna modifica applicata.`);
    }
    cambiate++;
    fotografie += riallineaFotografieProposte(db, 'ricompensa', `richiesta/${v.richiesta}`, 'ricompense_json', r.ricompense_json, nuovo);
    esiti.push({ richiesta: v.richiesta, esito: `«${v.prima}» → «${v.dopo}»` });
  }
  return { esiti, cambiate, fotografie };
}

function noteRicompense(db: AppDatabase): { esiti: Array<Record<string, unknown>>; cambiate: number } {
  const esiti: Array<Record<string, unknown>> = [];
  let cambiate = 0;
  if (!esisteTabella(db, 'ricompensa_oggetto')) return { esiti: [{ esito: 'tabella assente' }], cambiate };
  const scrivi = db.prepare('UPDATE main.ricompensa_oggetto SET nota = ? WHERE fonte_tipo = ? AND fonte_chiave = ? AND catalogo_chiave = ? AND nota = ?');
  for (const n of NOTE_RICOMPENSE) {
    const r = db.prepare('SELECT nota FROM main.ricompensa_oggetto WHERE fonte_tipo = ? AND fonte_chiave = ? AND catalogo_chiave = ?').get(n.tipo, n.fonte, n.oggetto) as { nota: string | null } | undefined;
    if (!r) { esiti.push({ ...n, esito: 'ricompensa assente' }); continue; }
    if (r.nota === n.dopo) { esiti.push({ ...n, esito: 'già senza la copia' }); continue; }
    if (r.nota !== n.prima) { esiti.push({ ...n, esito: 'nota diversa da quella attesa: non toccata', ora: r.nota }); continue; }
    if (scrivi.run(n.dopo, n.tipo, n.fonte, n.oggetto, n.prima).changes !== 1) throw new Error(`287: la nota della ricompensa ${n.tipo}/${n.fonte} non si aggiorna; nessuna modifica applicata.`);
    cambiate++;
    esiti.push({ ...n, esito: 'nota senza la copia' });
  }
  // le etichette in coda alle note degli esami e del Covo
  const conEtichetta = db.prepare("SELECT fonte_tipo, fonte_chiave, catalogo_chiave, nota FROM main.ricompensa_oggetto WHERE fonte_tipo IN ('esame', 'covo') AND nota IS NOT NULL").all() as
    Array<{ fonte_tipo: string; fonte_chiave: string; catalogo_chiave: string; nota: string }>;
  for (const r of conEtichetta) {
    const etichetta = ETICHETTE_FINALI.find((e) => r.nota.endsWith(e));
    if (!etichetta) continue;
    const dopo = r.nota.slice(0, -etichetta.length).trimEnd() || null;
    if (scrivi.run(dopo, r.fonte_tipo, r.fonte_chiave, r.catalogo_chiave, r.nota).changes !== 1) throw new Error(`287: la nota della ricompensa ${r.fonte_tipo}/${r.fonte_chiave} non si aggiorna; nessuna modifica applicata.`);
    cambiate++;
    esiti.push({ tipo: r.fonte_tipo, fonte: r.fonte_chiave, oggetto: r.catalogo_chiave, esito: `etichetta «${etichetta.trim()}» tolta`, prima: r.nota, dopo });
  }
  return { esiti, cambiate };
}

function descrizioniDelleRichieste(db: AppDatabase): EsitoColonna[] {
  if (!esisteTabella(db, 'richiesta') || !esisteTabella(db, 'ricompensa_oggetto')) return [];
  const righe = db.prepare(`SELECT chiave, descrizione FROM main.catalogo_oggetto WHERE nascosto = 0 AND origine = 'seed' AND seed_json IS NULL
    AND (descrizione LIKE 'Completando la richiesta "%' OR descrizione LIKE 'Ricompensa della Richiesta «%') ORDER BY chiave`).all() as Array<{ chiave: string; descrizione: string }>;
  const esiti: EsitoColonna[] = [];
  for (const r of righe) {
    const nome = richiestaDellaDescrizione(r.descrizione);
    if (!nome) { esiti.push({ chiave: r.chiave, colonna: 'descrizione', esito: 'descrizione con altro testo: non toccata', prima: r.descrizione }); continue; }
    const collegata = db.prepare(`SELECT 1 FROM main.ricompensa_oggetto o JOIN main.richiesta q ON q.chiave = o.fonte_chiave
      WHERE o.fonte_tipo = 'richiesta' AND o.catalogo_chiave = ? AND q.nome = ?`).get(r.chiave, nome);
    if (!collegata) { esiti.push({ chiave: r.chiave, colonna: 'descrizione', esito: `nessuna ricompensa collegata alla Richiesta «${nome}»: non toccata`, prima: r.descrizione }); continue; }
    esiti.push(scriviColonnaCatalogo(db, r.chiave, 'descrizione', r.descrizione, ''));
  }
  return esiti;
}

export const migration287: Migration = {
  id: 287,
  name: 'ricompense_e_regali_senza_copie',
  up(db) {
    if (!db.inTransaction) throw new Error('287: manca la transazione della migrazione; nessuna modifica applicata.');
    if (!esisteTabella(db, 'catalogo_oggetto')) { logger.warn({ migrazione: 287 }, 'catalogo assente: niente da fare'); return; }
    const diarioPrima = improntaDiario(db);
    const richieste = vociRichieste(db);
    const note = noteRicompense(db);
    const equipaggiamento: Array<EsitoColonna & { fonte?: string }> = [];
    for (const e of EQUIPAGGIAMENTO) {
      equipaggiamento.push({ ...scriviColonnaCatalogo(db, e.chiave, 'effetto', '', e.effetto), fonte: e.fonte });
      equipaggiamento.push(scriviColonnaCatalogo(db, e.chiave, 'statistiche_json', null, JSON.stringify(e.statistiche)));
      equipaggiamento.push(scriviColonnaCatalogo(db, e.chiave, 'descrizione', e.descrizione, ''));
    }
    const etichette = DESCRIZIONI_ETICHETTA.map((d) => scriviColonnaCatalogo(db, d.chiave, 'descrizione', d.prima, d.dopo));
    const descrizioni = descrizioniDelleRichieste(db);
    const regali = (db.prepare("SELECT chiave FROM main.catalogo_oggetto WHERE categoria = 'regalo' AND effetto = 'Regalo' ORDER BY chiave").pluck().all() as string[])
      .map((k) => scriviColonnaCatalogo(db, k, 'effetto', 'Regalo', ''));
    if (improntaDiario(db) !== diarioPrima) throw new Error('287: le voci del Diario sono cambiate; nessuna modifica applicata.');
    const scritte = (xs: EsitoColonna[]) => xs.filter((x) => x.esito === 'scritto').length;
    const conteggi = {
      vociRichieste: richieste.cambiate, fotografieProposte: richieste.fotografie, noteRicompense: note.cambiate,
      equipaggiamento: scritte(equipaggiamento), etichette: scritte(etichette), descrizioniRichieste: scritte(descrizioni), regali: scritte(regali),
      regaliNonToccati: regali.length - scritte(regali),
    };
    const cambiate = richieste.cambiate + note.cambiate + conteggi.equipaggiamento + conteggi.etichette + conteggi.descrizioniRichieste + conteggi.regali;
    if (cambiate) invalidaCacheDiGioco();
    scriviAuditChiusura(db, AUDIT, 287, { conteggi, richieste: richieste.esiti, note: note.esiti, equipaggiamento, etichette, descrizioni, regali }, cambiate);
    logger.info({ migrazione: 287, ...conteggi }, 'Ricompense, armi delle Richieste e regali senza copie né etichette');
  },
};
