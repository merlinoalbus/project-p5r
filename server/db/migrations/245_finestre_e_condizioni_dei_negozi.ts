// ============================================================
// Migrazione 245 — finestre e condizioni degli articoli secondo l'elenco dei negozi, e il wafer mancante del Triple Seven (Ondata 5, Lotto B)
// ============================================================
//
// Decisione 21 dell'utente (26 ottobre): le raccomandazioni del progetto si applicano, «in caso di discordanza fra pagine della guida vale il
// listino dei negozi». Guida italiana, Elenco dei negozi [N] (colonna «Disponibilità»), letta il 2026-10-26:
//   - Kogatana nera (Yumenoshima): «1° agosto», rifornimento «il 1° di ogni mese». Oggi le condizioni la fanno esistere solo il giorno 1 di
//     ogni mese, da aprile: si vende dal 1° agosto, ogni giorno, e il 1° del mese torna (regola della 243);
//   - Wafer dei ladri (KiyasuKu): «28 agosto – 10 ottobre» (oggi dal 10 agosto);
//   - Snack (Rocinante): «7 novembre» (oggi solo «dal 18 aprile»);
//   - Lotto estivo S, Maschera del ladro, Set noodle istantanei (Rocinante): «1 settembre – 10 ottobre» (oggi senza finestra);
//   - Agodashi Oden (Triple Seven): «Inverno»; Cioccolato osechi: «Dal 13 gennaio» (oggi senza);
//   - Pane autunnale (negozio scolastico): «Autunno; Venerdì», come la pagina Oggetti («solo nei venerdì di autunno»): le due condizioni;
//   - Vestiti usati: Spray detergente «1 luglio in poi», Spray supremo «1 settembre in poi» (oggi senza data);
//   - Triple Seven: manca l'offerta «Wafer dei ladri», 500 ¥, «28 agosto – 10 ottobre», 3 pezzi, rifornimento il giorno successivo: nasce,
//     collegata all'oggetto del catalogo `consumabile/wafer-dei-ladri`, con le condizioni dell'offerta gemella di Rocinante.
// Conservativa: ogni articolo si corregge solo se le condizioni sono esattamente quelle attese (confronto per contenuto); già corrette, non
// si toccano (idempotente); diverse, restano e l'audit lo dice (un dato salvato non cambia in silenzio). Le condizioni che restano valide
// («dal 18 aprile») non si tolgono. Nessuna voce del Diario e nessun dato delle partite cambia. Audit in `dati_guida.audit-245-finestre`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { GIORNO, improntaDiario, scriviAudit } from './rifornimentoOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-245-finestre';
const FONTE_NEGOZI = 'https://www.allgamestaff.it/persona-5-royal/elenco-dei-negozi/';
const errore = (motivo: string): never => { throw new Error(`245: ${motivo}; nessuna modifica applicata.`); };

type Condizione = Record<string, unknown>;
const data = (dal: string): Condizione => ({ tipo: 'data', dal });
const intervallo = (dal: string, al: string): Condizione => ({ tipo: 'intervallo', dal, al });
const quartiere = (q: string): Condizione => ({ tipo: 'quartiere', quartiere: q });
/** Il primo di ogni mese, da aprile a marzo: le condizioni di oggi della Kogatana nera. */
const PRIMO_DI_OGNI_MESE: Condizione[] = [{ tipo: 'gruppo', modo: 'almeno-una', condizioni: ['04', '05', '06', '07', '08', '09', '10', '11', '12', '01', '02', '03'].map((m) => intervallo(`${m}-01`, `${m}-01`)) }];

interface Correzione { articolo: string; prima: Condizione[]; dopo: Condizione[]; motivo: string }
const SETTEMBRE_OTTOBRE = intervallo('09-01', '10-10');
const CORREZIONI: readonly Correzione[] = [
  { articolo: 'yumenoshima/kogatana-nera', prima: PRIMO_DI_OGNI_MESE, dopo: [data('08-01')], motivo: '[N] «1° agosto», rifornimento il 1° di ogni mese' },
  { articolo: 'chiosco-kiyasuku/wafer-dei-ladri', prima: [intervallo('08-10', '10-10')], dopo: [intervallo('08-28', '10-10')], motivo: '[N] «28 agosto – 10 ottobre»' },
  { articolo: 'discount-rocinante/snack', prima: [data('04-18')], dopo: [data('04-18'), data('11-07')], motivo: '[N] «7 novembre»' },
  { articolo: 'discount-rocinante/lotto-estivo-s', prima: [data('04-18')], dopo: [data('04-18'), SETTEMBRE_OTTOBRE], motivo: '[N] «1 settembre – 10 ottobre»' },
  { articolo: 'discount-rocinante/maschera-del-ladro', prima: [data('04-18')], dopo: [data('04-18'), SETTEMBRE_OTTOBRE], motivo: '[N] «1 settembre – 10 ottobre»' },
  { articolo: 'discount-rocinante/set-noodle-istantanei', prima: [data('04-18')], dopo: [data('04-18'), SETTEMBRE_OTTOBRE], motivo: '[N] «1 settembre – 10 ottobre»' },
  { articolo: 'triple-seven/agodashi-oden', prima: [data('04-18')], dopo: [data('04-18'), { tipo: 'stagione', stagione: 'inverno' }], motivo: '[N] «Inverno»' },
  { articolo: 'triple-seven/cioccolato-osechi', prima: [data('04-18')], dopo: [data('04-18'), data('01-13')], motivo: '[N] «Dal 13 gennaio»' },
  { articolo: 'negozio-scolastico/pane-autunnale', prima: [data('04-19')], dopo: [data('04-19'), { tipo: 'stagione', stagione: 'autunno' }, { tipo: 'giorno-settimana', giorni: ['venerdi'] }],
    motivo: '[N] «Autunno; Venerdì»; [O] «solo nei venerdì di autunno»' },
  { articolo: 'vestiti-usati-kichijoji/spray-detergente', prima: [quartiere('kichijoji')], dopo: [quartiere('kichijoji'), data('07-01')], motivo: '[N] «1 luglio in poi»' },
  { articolo: 'vestiti-usati-kichijoji/spray-supremo', prima: [quartiere('kichijoji')], dopo: [quartiere('kichijoji'), data('09-01')], motivo: '[N] «1 settembre in poi»' },
];

/** Il JSON con le chiavi in ordine: due condizioni uguali per contenuto hanno lo stesso testo. */
function canonico(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonico).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v as object).sort().map((k) => `${JSON.stringify(k)}:${canonico((v as Record<string, unknown>)[k])}`).join(',')}}`;
  return JSON.stringify(v);
}

/** Il wafer del Triple Seven: l'offerta mancante, come quella di Rocinante (stesso oggetto, stesse condizioni), 3 pezzi al giorno. */
function waferDelTripleSeven(db: AppDatabase): string {
  const chiave = 'triple-seven/wafer-dei-ladri';
  if (!db.prepare("SELECT 1 FROM main.negozio WHERE chiave = 'triple-seven'").get()) return 'negozio Triple Seven assente: nessuna offerta';
  const esistente = db.prepare('SELECT nascosto FROM main.articolo WHERE chiave = ?').get(chiave) as { nascosto: number } | undefined;
  if (esistente) return esistente.nascosto ? 'offerta già presente ma nascosta: non toccata' : 'offerta già presente';
  const conCatalogo = esisteTabella(db, 'catalogo_oggetto') && !!db.prepare("SELECT 1 FROM main.catalogo_oggetto WHERE chiave = 'consumabile/wafer-dei-ladri' AND nascosto = 0").get();
  if (!conCatalogo) return 'oggetto del catalogo «consumabile/wafer-dei-ladri» assente: nessuna offerta';
  const ordine = (db.prepare("SELECT COALESCE(MAX(ordine), -1) + 1 FROM main.articolo WHERE negozio_chiave = 'triple-seven'").pluck().get() as number);
  const regola = GIORNO(3);
  db.prepare(`INSERT INTO main.articolo (chiave, negozio_chiave, ordine, nome, categoria, per, prezzo, effetto, statistiche, nota, fonte, verificato, origine, nascosto, updated_at,
      condizioni_json, catalogo_chiave, quantita, rifornimento_json)
    VALUES (?, 'triple-seven', ?, 'Wafer dei ladri', 'consumabile', NULL, 500, NULL, NULL, NULL, ?, 1, 'seed', 0, ?, ?, 'consumabile/wafer-dei-ladri', ?, ?)`)
    .run(chiave, ordine, FONTE_NEGOZI, new Date().toISOString(), JSON.stringify([data('04-18'), intervallo('08-28', '10-10')]), regola.q, JSON.stringify(regola.r));
  return `creata (ordine ${ordine}, 500 ¥, 3 pezzi al giorno, 28 agosto – 10 ottobre)`;
}

export const migration245: Migration = {
  id: 245,
  name: 'finestre_e_condizioni_dei_negozi',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'articolo') || !esisteTabella(db, 'negozio') || !haColonna(db, 'articolo', 'rifornimento_json')) {
      logger.warn({ migrazione: 245 }, 'articoli o colonna del rifornimento assenti: nessuna correzione'); return;
    }
    const diarioPrima = improntaDiario(db);
    const scrivi = db.prepare('UPDATE main.articolo SET condizioni_json = ? WHERE chiave = ? AND condizioni_json IS ?');
    const esiti: Array<{ articolo: string; esito: string; motivo?: string }> = [];
    let corrette = 0;
    for (const c of CORREZIONI) {
      const r = db.prepare('SELECT condizioni_json FROM main.articolo WHERE chiave = ?').get(c.articolo) as { condizioni_json: string | null } | undefined;
      if (!r) { esiti.push({ articolo: c.articolo, esito: 'articolo assente' }); continue; }
      let ora: unknown;
      try { ora = r.condizioni_json ? JSON.parse(r.condizioni_json) : []; } catch { esiti.push({ articolo: c.articolo, esito: 'condizioni illeggibili: non toccate' }); continue; }
      if (canonico(ora) === canonico(c.dopo)) { esiti.push({ articolo: c.articolo, esito: 'già corretta' }); continue; }
      if (canonico(ora) !== canonico(c.prima)) { esiti.push({ articolo: c.articolo, esito: `condizioni diverse da quelle attese (${r.condizioni_json}): non toccate`, motivo: c.motivo }); continue; }
      if (scrivi.run(JSON.stringify(c.dopo), c.articolo, r.condizioni_json).changes !== 1) errore(`l'articolo ${c.articolo} non si aggiorna`);
      corrette++;
      esiti.push({ articolo: c.articolo, esito: `corretta: ${JSON.stringify(c.dopo)}`, motivo: c.motivo });
    }
    const wafer = waferDelTripleSeven(db);
    esiti.push({ articolo: 'triple-seven/wafer-dei-ladri', esito: wafer, motivo: '[N] Triple Seven: Wafer dei ladri, 500 ¥, 28 agosto – 10 ottobre, 3, giorno successivo' });
    if (improntaDiario(db) !== diarioPrima) errore('le voci del Diario sono cambiate');
    if (wafer.startsWith('creata')) invalidaCacheDiGioco();
    scriviAudit(db, AUDIT, 245, { conteggi: { correzioni: CORREZIONI.length, corrette, offertaWafer: wafer }, esiti });
    logger.info({ migrazione: 245, corrette, wafer }, 'Negozi: finestre e condizioni secondo l’elenco dei negozi');
  },
};
