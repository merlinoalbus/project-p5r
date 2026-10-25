// ============================================================
// 235 — Richieste dei Mementos con sblocco, scadenza e ricompense strutturati; candidatura ai lavori (L13, ondata 3)
// ============================================================
//
// Richiesta dell'utente (2026-10-25): lo sblocco delle Richieste non esisteva («Disponibile dal» e «Scadenza» in testo libero, «Accetta»
// sempre attivo) e nessun effetto poteva sbloccare una Richiesta. Decisioni approvate: 1 (effetto «sblocco»), 3 (le ricompense le applica
// solo la Richiesta completata), 17 (candidatura = sblocco del lavoro; Ore no Beko dal 05-06, inversione giorno/mese).
//
// Schema (append-only, colonne nuove nullable, idempotente):
//   richiesta.condizioni_json            «Quando si sblocca»: il vocabolario unico delle condizioni (`shared/condizioniSpillo.ts`);
//   richiesta.scadenza_data              la scadenza come data di gioco (MM-GG);
//   richiesta.proroga_data / proroga_condizioni_json   la proroga, valida solo con le sue condizioni (per esempio il terzo semestre);
//   richiesta.ombra_chiave               il bersaglio come Ombra del compendio (livello e affinità si leggono da lì);
//   richiesta.yen / richiesta.esperienza ricompense in yen e PE come numeri (gli oggetti stanno in `ricompensa_oggetto`).
//
// Conversione CONSERVATIVA dei testi (la tabella non ha `origine`/`seed_json`: il criterio è il testo atteso, carattere per carattere,
// letto il 2026-10-25 sulla copia dei dati reali). Una Richiesta si converte solo se il suo testo è uno di quelli della tavola qui
// sotto; il testo convertito si svuota (il dato vive in un solo punto, l'originale resta nell'audit). Il rango del Confidente che il testo
// cita entra nelle condizioni e `confidente_rango` si svuota solo se coincide (stesso Confidente, stesso rango). Gli altri testi restano
// com'erano e l'audit li elenca con il motivo («Dopo aver parlato con Chihaya», le due parti di «I vincenti non imbrogliano», l'avvio in
// anticipo dello zio ingordo, «il giorno dopo» il Palazzo finale, le cinque scadenze con il bersaglio che si sposta nel Dedalo di Da'at).
// Ricompense: solo «485 PE» e «6.500 Yen» di «Un ex piuttosto appiccicoso» diventano numeri (gli altri testi sono oggetti già nel catalogo).
//
// Lavori (decisione 17): la condizione «sblocco ricevuto» si aggiunge a Fioraio Rafflesia e a Ore no Beko, e la data di Ore no Beko passa
// da 06-05 a 05-06; solo se l'attività è della guida mai corretta (`origine = 'seed'`, `seed_json IS NULL`) e le condizioni sono quelle
// attese. Il Triple Seven è stato corretto dall'utente (`origine = 'utente'`): non si tocca, l'audit lo dice (la condizione si aggiunge
// dall'editor dell'attività). Finché nessuna voce del Diario dà lo sblocco la condizione non blocca (valutatore): nessuna partita in corso
// perde un lavoro; nessuna voce del Diario e nessuna partita salvata si tocca qui.
// Audit in `dati_guida.audit-235-richieste-e-candidature`; controlli finali: impronta identica di tutte le altre righe e colonne.
// ============================================================

import { createHash } from 'node:crypto';
import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { normalizzaCondizioniSpillo, type RequisitoSpillo } from '../../../shared/condizioniSpillo.js';

const AUDIT = 'audit-235-richieste-e-candidature';
const errore = (motivo: string): never => { throw new Error(`235: ${motivo}; nessuna modifica applicata.`); };

const data = (dal: string): RequisitoSpillo => ({ tipo: 'data', dal });
const conf = (confidente: string, rango: number): RequisitoSpillo => ({ tipo: 'confidente', confidente, rango });
const palazzo = (dungeon: string): RequisitoSpillo => ({ tipo: 'palazzo', dungeon });
const TERZO_SEMESTRE: RequisitoSpillo = { tipo: 'evento', evento: 'terzo-semestre-avviato' };

/** Testo atteso di «Disponibile dal» → condizioni; `rango` = il rango del Confidente collegato che il testo ripete (si svuota la colonna). */
const DISPONIBILITA: Record<string, { testo: string; condizioni: RequisitoSpillo[]; rango?: { confidente: string; rango: number } }> = {
  'un-ex-piuttosto-appiccicoso': { testo: '7 maggio', condizioni: [data('05-07')] },
  'un-bullo-che-abbaia-e-morde': { testo: '9 maggio', condizioni: [data('05-09')] },
  'bullismo-sui-bulli': { testo: "Dopo aver completato 'Un bullo che abbaia e morde', Rango Confidente Luna 3, e il Palazzo di Kaneshiro",
    condizioni: [{ tipo: 'richiesta', richiesta: 'un-bullo-che-abbaia-e-morde' }, conf('mishima', 3), palazzo('kaneshiro')], rango: { confidente: 'mishima', rango: 3 } },
  'se-scomparissero-i-gatti': { testo: '23 maggio', condizioni: [data('05-23')] },
  'il-senso-della-vita-nella-terza-eta': { testo: '5 giugno', condizioni: [data('06-05')] },
  'ladri-fantasma-vs-ladri-e-basta': { testo: '18 giugno', condizioni: [data('06-18')] },
  'il-sadismo-e-un-gesto-damore': { testo: '6 giugno', condizioni: [data('06-06')] },
  'un-part-time-infernale': { testo: '6 giugno, Rango Confidente Luna 4', condizioni: [data('06-06'), conf('mishima', 4)], rango: { confidente: 'mishima', rango: 4 } },
  'medicina-amara': { testo: 'Rango Confidente Morte 7', condizioni: [conf('takemi', 7)], rango: { confidente: 'takemi', rango: 7 } },
  'le-fatiche-di-una-maid-in-cattedra': { testo: 'Rango Confidente Temperanza 8', condizioni: [conf('kawakami', 8)], rango: { confidente: 'kawakami', rango: 8 } },
  'la-stalker-informatica': { testo: '10 luglio', condizioni: [data('07-10')] },
  'giustizia-per-i-gatti': { testo: '4 agosto, Rango Confidente Luna 3', condizioni: [data('08-04'), conf('mishima', 3)], rango: { confidente: 'mishima', rango: 3 } },
  'smascheriamo-i-ciarlatani': { testo: 'Rango Confidente Fortuna 7', condizioni: [conf('chihaya', 7)], rango: { confidente: 'chihaya', rango: 7 } },
  'affari-loschi-nellombra': { testo: 'Rango Confidente Appeso 7, dopo il Palazzo di Okumura', condizioni: [conf('iwai', 7), palazzo('okumura')], rango: { confidente: 'iwai', rango: 7 } },
  'chi-e-laggressore': { testo: '3 agosto', condizioni: [data('08-03')] },
  'non-siamo-i-tuoi-schiavi': { testo: '2 agosto', condizioni: [data('08-02')] },
  'lottare-per-la-liberta-di-stampa': { testo: 'Rango Confidente Diavolo 7', condizioni: [conf('ohya', 7)], rango: { confidente: 'ohya', rango: 7 } },
  'un-intruso-a-yongen-jaya': { testo: '30 agosto', condizioni: [data('08-30')] },
  'mille-volti-e-mille-debiti': { testo: '19 settembre, Rango Confidente Luna 8, dopo il Palazzo di Okumura', condizioni: [data('09-19'), conf('mishima', 8), palazzo('okumura')], rango: { confidente: 'mishima', rango: 8 } },
  'la-mamma-manager': { testo: 'Rango Confidente Stella 7, dopo il Palazzo di Okumura', condizioni: [conf('hifumi', 7), palazzo('okumura')], rango: { confidente: 'hifumi', rango: 7 } },
  'il-netturbino': { testo: '14 ottobre, dopo il Palazzo di Okumura', condizioni: [data('10-14'), palazzo('okumura')] },
  'e-una-figlia-o-un-buono-pasto': { testo: 'Rango Confidente Eremita 7, dopo il Palazzo di Okumura', condizioni: [conf('futaba', 7), palazzo('okumura')], rango: { confidente: 'futaba', rango: 7 } },
  'una-madre-aggressiva': { testo: 'Rango Confidente Torre 8, dopo il Palazzo di Okumura', condizioni: [conf('shinya', 8), palazzo('okumura')], rango: { confidente: 'shinya', rango: 8 } },
  'raggirare-gli-anziani-non-si-fa': { testo: '25 novembre, dopo il Palazzo di Sae (Niijima)', condizioni: [data('11-25'), palazzo('niijima')] },
  'la-ballata-del-rubacuori': { testo: '10 dicembre, dopo il Palazzo di Shido', condizioni: [data('12-10'), palazzo('shido')] },
  'il-capoccia-dello-show-business': { testo: '3 dicembre, dopo il Palazzo di Shido', condizioni: [data('12-03'), palazzo('shido')] },
  'una-piccola-richiesta-daiuto': { testo: '13 gennaio, dopo aver raggiunto il terzo semestre', condizioni: [data('01-13'), TERZO_SEMESTRE] },
  'per-il-mio-bene': { testo: '14 gennaio, dopo aver raggiunto il terzo semestre', condizioni: [data('01-14'), TERZO_SEMESTRE] },
};
/** Testo atteso di «Scadenza» → data e proroga (con la sua condizione: il terzo semestre avviato). */
const SCADENZE: Record<string, { scadenza: string; proroga: string | null }> = {
  '23 dicembre': { scadenza: '12-23', proroga: null },
  '23 dicembre, estesa al 1 febbraio': { scadenza: '12-23', proroga: '02-01' },
  '23 dicembre, estesa al 1 febbraio (terzo semestre)': { scadenza: '12-23', proroga: '02-01' },
  '1 febbraio': { scadenza: '02-01', proroga: null },
};
const RICOMPENSE = { chiave: 'un-ex-piuttosto-appiccicoso', prima: ["Perla dell'attaccamento", '485 PE', '6.500 Yen'], dopo: ["Perla dell'attaccamento"], yen: 6500, esperienza: 485 };

const SBLOCCO = (chiave: string): RequisitoSpillo => ({ tipo: 'sblocco', bersaglio: 'attivita', chiave });
const LAVORI: Array<{ chiave: string; prima: string; dopo: RequisitoSpillo[] }> = [
  { chiave: 'lavoro-rafflesia', prima: '[{"tipo":"dote","dote":"fascino","rango":2}]', dopo: [{ tipo: 'dote', dote: 'fascino', rango: 2 }, SBLOCCO('lavoro-rafflesia')] },
  { chiave: 'lavoro-ore-no-beko', prima: '[{"tipo":"data","dal":"06-05"},{"tipo":"dote","dote":"perizia","rango":2}]', dopo: [data('05-06'), { tipo: 'dote', dote: 'perizia', rango: 2 }, SBLOCCO('lavoro-ore-no-beko')] },
  { chiave: 'lavoro-triple-seven', prima: '[]', dopo: [SBLOCCO('lavoro-triple-seven')] },
];

const colonne = (db: AppDatabase, t: string): string[] => (db.prepare(`PRAGMA main.table_info("${t}")`).all() as Array<{ name: string }>).map((c) => c.name);
/** Impronta di una tabella senza le colonne indicate. */
function impronta(db: AppDatabase, t: string, senza: readonly string[]): string {
  const cols = colonne(db, t).filter((c) => !senza.includes(c));
  const h = createHash('sha256');
  for (const r of db.prepare(`SELECT ${cols.map((c) => `"${c}"`).join(',')} FROM main."${t}" ORDER BY rowid`).iterate()) h.update(`${JSON.stringify(r)}\n`);
  return h.digest('hex');
}
const NUOVE = ['condizioni_json', 'scadenza_data', 'proroga_data', 'proroga_condizioni_json', 'ombra_chiave', 'yen', 'esperienza'] as const;
const TOCCATE_RICHIESTA = ['disponibile_dal', 'scadenza', 'confidente_rango', 'ricompense_json', ...NUOVE];

export const migration235: Migration = {
  id: 235,
  name: 'richieste_strutturate_e_candidature',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    const cr = colonne(db, 'richiesta');
    if (!cr.length) errore('la tabella richiesta non c’è');
    const tipi: Record<(typeof NUOVE)[number], string> = { condizioni_json: 'TEXT', scadenza_data: 'TEXT', proroga_data: 'TEXT', proroga_condizioni_json: 'TEXT',
      ombra_chiave: 'TEXT REFERENCES ombra(chiave) ON DELETE SET NULL', yen: 'INTEGER', esperienza: 'INTEGER' };
    for (const c of NUOVE) if (!cr.includes(c)) db.exec(`ALTER TABLE main.richiesta ADD COLUMN ${c} ${tipi[c]}`);
    if (db.prepare('SELECT 1 FROM main.dati_guida WHERE chiave = ?').get(AUDIT)) return;

    const misura = () => ({ richiesta: impronta(db, 'richiesta', TOCCATE_RICHIESTA), attivita: impronta(db, 'attivita', ['condizioni_json']), ricompensa: impronta(db, 'ricompensa_oggetto', []), voci: impronta(db, 'voce_giornata', []), effetti: impronta(db, 'voce_effetto', []) });
    const altre = misura();
    const rapporto: Record<string, unknown> = { quando: new Date().toISOString(), regola: 'testo atteso letto il 2026-10-25; attività solo origine seed e seed_json nullo' };
    const righe = db.prepare('SELECT chiave, disponibile_dal, scadenza, confidente_chiave, confidente_rango, ricompense_json, condizioni_json, scadenza_data FROM main.richiesta').all() as Array<{ chiave: string; disponibile_dal: string; scadenza: string; confidente_chiave: string | null; confidente_rango: number | null; ricompense_json: string; condizioni_json: string | null; scadenza_data: string | null }>;
    const disponibilita: Record<string, unknown> = {}, scadenze: Record<string, unknown> = {};
    for (const r of righe) {
      const d = DISPONIBILITA[r.chiave];
      if (r.condizioni_json !== null) disponibilita[r.chiave] = { saltata: 'condizioni già scritte' };
      else if (!d || d.testo !== r.disponibile_dal) disponibilita[r.chiave] = { saltata: d ? 'testo diverso da quello atteso' : 'testo non convertibile con certezza', testo: r.disponibile_dal };
      else {
        const condizioni = normalizzaCondizioniSpillo(d.condizioni);
        if (condizioni.length !== d.condizioni.length) errore(`condizioni di ${r.chiave} non valide`);
        const svuotaRango = !!d.rango && r.confidente_chiave === d.rango.confidente && r.confidente_rango === d.rango.rango;
        db.prepare(`UPDATE main.richiesta SET condizioni_json = ?, disponibile_dal = ''${svuotaRango ? ', confidente_rango = NULL' : ''} WHERE chiave = ?`).run(JSON.stringify(condizioni), r.chiave);
        disponibilita[r.chiave] = { prima: r.disponibile_dal, rangoPrima: r.confidente_rango, condizioni, rangoSpostato: svuotaRango };
      }
      const s = SCADENZE[r.scadenza];
      if (r.scadenza_data !== null) scadenze[r.chiave] = { saltata: 'scadenza già scritta' };
      else if (!s) scadenze[r.chiave] = { saltata: 'testo non convertibile con certezza', testo: r.scadenza };
      else {
        db.prepare("UPDATE main.richiesta SET scadenza_data = ?, proroga_data = ?, proroga_condizioni_json = ?, scadenza = '' WHERE chiave = ?")
          .run(s.scadenza, s.proroga, s.proroga ? JSON.stringify([TERZO_SEMESTRE]) : null, r.chiave);
        scadenze[r.chiave] = { prima: r.scadenza, ...s };
      }
    }
    rapporto.disponibilita = disponibilita; rapporto.scadenze = scadenze;
    const ex = righe.find((r) => r.chiave === RICOMPENSE.chiave);
    if (ex && ex.ricompense_json === JSON.stringify(RICOMPENSE.prima)) {
      db.prepare('UPDATE main.richiesta SET ricompense_json = ?, yen = ?, esperienza = ? WHERE chiave = ?').run(JSON.stringify(RICOMPENSE.dopo), RICOMPENSE.yen, RICOMPENSE.esperienza, RICOMPENSE.chiave);
      rapporto.ricompense = { [RICOMPENSE.chiave]: { prima: RICOMPENSE.prima, dopo: RICOMPENSE.dopo, yen: RICOMPENSE.yen, esperienza: RICOMPENSE.esperienza } };
    } else rapporto.ricompense = { [RICOMPENSE.chiave]: { saltata: ex ? 'testo diverso da quello atteso' : 'Richiesta assente' } };

    const lavori: Record<string, unknown> = {};
    for (const l of LAVORI) {
      const a = db.prepare('SELECT origine, seed_json, condizioni_json FROM main.attivita WHERE chiave = ?').get(l.chiave) as { origine: string; seed_json: string | null; condizioni_json: string | null } | undefined;
      if (!a) { lavori[l.chiave] = { saltata: 'attività assente' }; continue; }
      if (a.origine !== 'seed' || a.seed_json !== null) { lavori[l.chiave] = { saltata: 'attività corretta dall’utente: la condizione «sblocco ricevuto» si aggiunge dal suo editor', condizioni: a.condizioni_json }; continue; }
      if (a.condizioni_json !== l.prima) { lavori[l.chiave] = { saltata: 'condizioni diverse da quelle attese', condizioni: a.condizioni_json }; continue; }
      const dopo = normalizzaCondizioniSpillo(l.dopo);
      if (dopo.length !== l.dopo.length) errore(`condizioni di ${l.chiave} non valide`);
      db.prepare('UPDATE main.attivita SET condizioni_json = ? WHERE chiave = ?').run(JSON.stringify(dopo), l.chiave);
      lavori[l.chiave] = { prima: l.prima, dopo };
    }
    rapporto.lavori = lavori;

    // ---- controlli finali: nulla è cambiato oltre ai campi dichiarati, le condizioni scritte si rileggono valide
    const dopo = misura();
    for (const k of Object.keys(altre) as Array<keyof typeof altre>) if (altre[k] !== dopo[k]) errore(`${k} è cambiato oltre ai campi dichiarati`);
    for (const r of db.prepare('SELECT chiave, condizioni_json FROM main.richiesta WHERE condizioni_json IS NOT NULL').all() as Array<{ chiave: string; condizioni_json: string }>) {
      const v = JSON.parse(r.condizioni_json) as unknown[];
      if (normalizzaCondizioniSpillo(v).length !== v.length) errore(`condizioni di ${r.chiave} illeggibili dopo la scrittura`);
    }
    db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?)').run(AUDIT, JSON.stringify(rapporto));
    const conta = (o: Record<string, unknown>) => Object.values(o).filter((x) => !(x as { saltata?: string }).saltata).length;
    logger.info({ migrazione: 'L13-235', disponibilita: conta(disponibilita), scadenze: conta(scadenze), lavori: conta(lavori) }, 'Richieste strutturate e candidature ai lavori');
  },
};
