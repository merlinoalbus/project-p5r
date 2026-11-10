// ============================================================
// 383 — il Palazzo che serve per completare le Richieste, secondo le pagine dei Dedali (L10-03, risposta dell'utente Q9 A)
// ============================================================
//
// Le pagine dei Dedali mettono sotto molte Richieste un «Requisito: aver completato il Palazzo di …». La pagina «Richieste nei Memento»
// (colonna «Disponibile da», r.109-129) dà invece solo date e ranghi, quelli dell'app: è una contraddizione della guida, e l'utente ha scelto
// le pagine dei Dedali (Q9 A). Con il CRITERIO unico descritto sotto, `REQUISITI_383` elenca 17 Richieste: 15 ricevono il Palazzo fra le
// condizioni per completarle, 2 lo hanno già («Bullismo sui bulli» e la parte 2 di «I vincenti non imbrogliano»). Le otto di G-M1b (rapporto
// N) sono le prime; le altre nove vengono dalla stessa regola applicata a tutte le righe «Requisito:».
//
// DOVE va la condizione: fra le condizioni per COMPLETARLA (`completamento_condizioni_json`, 310), non fra quelle di sblocco. La guida lega il
// Palazzo al raggiungere il bersaglio, non al ricevere la Richiesta: «per addentrarci più in profondità e completare alcune richieste, dovremo
// aver completato il Palazzo di Kaneshiro» («dedalo-di-chemdah» r.93); «Il primo obiettivo che incontreremo dopo aver completato il Palazzo
// di Kaneshiro» («dedalo-di-aiyatsbus» r.258). Il modello fa lo stesso per «Bullismo sui bulli» (Kaneshiro) e per la parte 2 di «I vincenti
// non imbrogliano» (Okumura), che lo hanno già: una Richiesta si riceve prima che il suo bersaglio sia raggiungibile, e si completa dopo.
//
// Le otto, con la riga della pagina del dedalo:
//   «Bullismo sui bulli», Kaneshiro («dedalo-di-aiyatsbus» r.256): già nelle condizioni per completarla, nulla da aggiungere;
//   «Un part-time infernale», Kaneshiro («dedalo-di-chemdah» r.119); «Medicina amara», Kaneshiro (r.137); «Le fatiche di una maid in
//   cattedra», Kaneshiro (r.231);
//   «Smascheriamo i ciarlatani», Futaba («dedalo-di-kaitul» r.175); «Non siamo i tuoi schiavi», Futaba (r.245); «Lottare per la libertà di
//   stampa», Futaba (r.263);
//   «I vincenti non imbrogliano»: la parte 1 chiede Futaba («dedalo-di-akzeriyyuth» r.175), già coperto dall'apertura del Dedalo di
//   Akzeriyyuth (Futaba); la parte 2 chiede Okumura (r.195). Il modello ha una Richiesta sola per le due parti: lo sblocco è la parte 1 (la si
//   riceve e la si affronta, «dopo 3 turni si viene espulsi»), il completamento è la parte 2, e Okumura sta già fra le condizioni per
//   completarla (con il Confidente Torre): nulla da aggiungere.
// CRITERIO, uno solo per tutte le righe «Requisito:» delle pagine dei Dedali (tabella completa nell'evidenza del lotto): il Palazzo è coperto
// solo da una condizione che BLOCCA IL COMPLETAMENTO, cioè una condizione `palazzo` fra quelle per completarla, oppure l'apertura del suo dedalo
// (completarla chiede il dedalo aperto, `richiesteService.completamento`) quando l'apertura chiede quel Palazzo. Le condizioni di sblocco e le
// date non lo garantiscono: non fermano il completamento, e una data non dice che il Palazzo sia concluso. Così, oltre alle otto, altre nove:
// «Un fidanzato violento» (Kaneshiro, «dedalo-di-chemdah» r.157); «Giustizia per i gatti», «Chi è l'aggressore?», «Un intruso a Yongen-Jaya»
// (Futaba, «dedalo-di-kaitul» r.157, 223, 283) e «Affari loschi nell'ombra» (Okumura, r.201), che stanno in Kaitul, aperto da Kaneshiro;
// «Mille volti e mille…debiti», «La mamma manager», «Il "Netturbino"» (Okumura, «dedalo-di-akzeriyyuth» r.153, 213, 237), in Akzeriyyuth, aperto
// da Futaba; «Raggirare gli anziani? Non si fa!» (Sae, cioè Niijima, «dedalo-di-adyeshach» r.184), in Adyeshach, aperto da Okumura. Molte avevano
// già il Palazzo fra le condizioni di SBLOCCO: lì resta, e il completamento lo chiede ora anche lui. Coperte dall'apertura del dedalo, e quindi
// non toccate: le Richieste di Qimranut (Kamoshida), di Aiyatsbus e Chemdah che chiedono Madarame, «È una figlia o un buono pasto?» e «Una madre
// aggressiva» (Okumura, Adyeshach), «La ballata del rubacuori» e «Il capoccia dello show business» (Shido, Sheriruth), la parte 1 di «I vincenti».
//
// Guardia per identità: si aggiunge `{ tipo: 'palazzo', dungeon }` solo se le condizioni per completarla sono quelle attese (vuote, nei dati di
// oggi) e la Richiesta è nel dedalo atteso; se ci sono già con quel Palazzo non si tocca niente; altrimenti si salta e il verbale lo dice.
// Nessuna scrittura su `partite.db`: cambia quando una Richiesta si può segnare completata (il comando lo dice col motivo), non il suo stato.
// Idempotente. Verbale: `dati_guida.audit-l10-03-requisiti-di-palazzo`. Nessun import da `server/services/`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna, improntaTabella } from './pulizieL11.js';
import { registraAudit } from './archivioL1.js';

const MIGRAZIONE = 'L10-03 · 383';
const errore = (motivo: string): never => { throw new Error(`383: ${motivo}; nessuna modifica applicata.`); };

/** Le 17 Richieste del criterio unico (le otto di G-M1b, poi le nove trovate con la stessa regola): il dedalo atteso, il Palazzo del requisito,
 *  la riga della guida e le condizioni per completarla attese. */
export const REQUISITI_383: ReadonlyArray<{ richiesta: string; dedalo: string; dungeon: string; fonte: string; attese: string | null }> = [
  { richiesta: 'bullismo-sui-bulli', dedalo: 'mementos-02-aiyatsbus', dungeon: 'kaneshiro', fonte: '«Dedalo di Aiyatsbus», riga 256', attese: '[{"tipo":"palazzo","dungeon":"kaneshiro"}]' },
  { richiesta: 'un-part-time-infernale', dedalo: 'mementos-03-chemdah', dungeon: 'kaneshiro', fonte: '«Dedalo di Chemdah», riga 119', attese: null },
  { richiesta: 'medicina-amara', dedalo: 'mementos-03-chemdah', dungeon: 'kaneshiro', fonte: '«Dedalo di Chemdah», riga 137', attese: null },
  { richiesta: 'le-fatiche-di-una-maid-in-cattedra', dedalo: 'mementos-03-chemdah', dungeon: 'kaneshiro', fonte: '«Dedalo di Chemdah», riga 231', attese: null },
  { richiesta: 'smascheriamo-i-ciarlatani', dedalo: 'mementos-04-kaitul', dungeon: 'futaba', fonte: '«Dedalo di Kaitul», riga 175', attese: null },
  { richiesta: 'non-siamo-i-tuoi-schiavi', dedalo: 'mementos-04-kaitul', dungeon: 'futaba', fonte: '«Dedalo di Kaitul», riga 245', attese: null },
  { richiesta: 'lottare-per-la-liberta-di-stampa', dedalo: 'mementos-04-kaitul', dungeon: 'futaba', fonte: '«Dedalo di Kaitul», riga 263', attese: null },
  { richiesta: 'i-vincenti-non-imbrogliano', dedalo: 'mementos-05-akzeriyyuth', dungeon: 'okumura', fonte: '«Dedalo di Akzeriyyuth», riga 195 (parte 2)', attese: '[{"tipo":"palazzo","dungeon":"okumura"},{"tipo":"confidente","confidente":"shinya","rango":1}]' },
  // fuori dalle otto di G-M1b, con lo stesso criterio (vedi sopra): nessuna condizione che blocca il completamento garantisce il Palazzo
  { richiesta: 'un-fidanzato-violento', dedalo: 'mementos-03-chemdah', dungeon: 'kaneshiro', fonte: '«Dedalo di Chemdah», riga 157', attese: null },
  { richiesta: 'giustizia-per-i-gatti', dedalo: 'mementos-04-kaitul', dungeon: 'futaba', fonte: '«Dedalo di Kaitul», riga 157', attese: null },
  { richiesta: 'affari-loschi-nellombra', dedalo: 'mementos-04-kaitul', dungeon: 'okumura', fonte: '«Dedalo di Kaitul», riga 201', attese: null },
  { richiesta: 'chi-e-laggressore', dedalo: 'mementos-04-kaitul', dungeon: 'futaba', fonte: '«Dedalo di Kaitul», riga 223', attese: null },
  { richiesta: 'un-intruso-a-yongen-jaya', dedalo: 'mementos-04-kaitul', dungeon: 'futaba', fonte: '«Dedalo di Kaitul», riga 283', attese: null },
  { richiesta: 'mille-volti-e-mille-debiti', dedalo: 'mementos-05-akzeriyyuth', dungeon: 'okumura', fonte: '«Dedalo di Akzeriyyuth», riga 153', attese: null },
  { richiesta: 'la-mamma-manager', dedalo: 'mementos-05-akzeriyyuth', dungeon: 'okumura', fonte: '«Dedalo di Akzeriyyuth», riga 213', attese: null },
  { richiesta: 'il-netturbino', dedalo: 'mementos-05-akzeriyyuth', dungeon: 'okumura', fonte: '«Dedalo di Akzeriyyuth», riga 237', attese: null },
  { richiesta: 'raggirare-gli-anziani-non-si-fa', dedalo: 'mementos-06-adyeshach', dungeon: 'niijima', fonte: '«Dedalo di Adyeshach», riga 184 («Palazzo di Sae»)', attese: null },
];

/** Le condizioni salvate come elenco (null se il JSON non si legge). */
function elenco(json: string | null): Array<Record<string, unknown>> | null {
  if (json === null || json.trim() === '') return [];
  try { const v = JSON.parse(json) as unknown; return Array.isArray(v) ? v as Array<Record<string, unknown>> : null; } catch { return null; }
}

export const migration383: Migration = {
  id: 383,
  name: 'requisiti_di_palazzo_delle_richieste',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'richiesta') || !haColonna(db, 'richiesta', 'completamento_condizioni_json')) return;
    if (!esisteTabella(db, 'dati_guida')) errore('manca la tabella dati_guida');
    const impronta = improntaTabella(db, 'richiesta', ['completamento_condizioni_json']);
    const primaDi = new Map((db.prepare('SELECT chiave, completamento_condizioni_json AS c FROM main.richiesta').all() as Array<{ chiave: string; c: string | null }>).map((r) => [r.chiave, r.c]));

    const aggiunte: Array<{ richiesta: string; dungeon: string; fonte: string }> = [];
    const giaPresenti: Array<{ richiesta: string; dungeon: string; fonte: string }> = [];
    const saltate: Array<{ richiesta: string; motivo: string }> = [];
    const scrivi = db.prepare('UPDATE main.richiesta SET completamento_condizioni_json = ? WHERE chiave = ? AND completamento_condizioni_json IS ?');
    for (const q of REQUISITI_383) {
      const r = db.prepare('SELECT chiave, area_chiave, completamento_condizioni_json AS c FROM main.richiesta WHERE chiave = ?').get(q.richiesta) as { chiave: string; area_chiave: string | null; c: string | null } | undefined;
      if (!r) { saltate.push({ richiesta: q.richiesta, motivo: 'la Richiesta non c’è' }); continue; }
      const condizioni = elenco(r.c);
      if (condizioni === null) { saltate.push({ richiesta: q.richiesta, motivo: 'condizioni per completarla illeggibili' }); continue; }
      if (condizioni.some((c) => c.tipo === 'palazzo' && c.dungeon === q.dungeon)) { giaPresenti.push({ richiesta: q.richiesta, dungeon: q.dungeon, fonte: q.fonte }); continue; }
      if (r.area_chiave !== q.dedalo) { saltate.push({ richiesta: q.richiesta, motivo: `è nel dedalo ${r.area_chiave ?? 'nessuno'}, non in ${q.dedalo}` }); continue; }
      // attese vuote: `null`, '' e '[]' sono la stessa cosa (nessuna condizione per completarla)
      const vuote = (c: string | null): boolean => c === null || ['', '[]'].includes(c.trim());
      if (q.attese === null ? !vuote(r.c) : r.c !== q.attese) { saltate.push({ richiesta: q.richiesta, motivo: 'le condizioni per completarla non sono quelle attese' }); continue; }
      if (!db.prepare("SELECT 1 FROM main.dungeon WHERE chiave = ? AND tipo = 'palazzo'").get(q.dungeon)) { saltate.push({ richiesta: q.richiesta, motivo: `il Palazzo ${q.dungeon} non c’è` }); continue; }
      const nuove = [...condizioni, { tipo: 'palazzo', dungeon: q.dungeon }];
      if (scrivi.run(JSON.stringify(nuove), q.richiesta, r.c).changes !== 1) errore(`le condizioni di ${q.richiesta} non si aggiornano`);
      aggiunte.push({ richiesta: q.richiesta, dungeon: q.dungeon, fonte: q.fonte });
    }

    // i controlli: cambiano solo le condizioni per completare le Richieste dichiarate
    if (improntaTabella(db, 'richiesta', ['completamento_condizioni_json']) !== impronta) errore('le altre colonne di richiesta sono cambiate');
    const toccate = new Set(aggiunte.map((a) => a.richiesta));
    for (const r of db.prepare('SELECT chiave, completamento_condizioni_json AS c FROM main.richiesta').all() as Array<{ chiave: string; c: string | null }>) {
      if ((primaDi.get(r.chiave) !== r.c) !== toccate.has(r.chiave)) errore(`le condizioni per completare ${r.chiave} sono cambiate in modo non dichiarato`);
    }

    if (aggiunte.length === 0 && saltate.length === 0) return;
    registraAudit(db, 'audit-l10-03-requisiti-di-palazzo', { migrazione: MIGRAZIONE, aggiunte, giaPresenti, saltate });
    if (saltate.length > 0) logger.warn({ migrazione: 'L10-03-383', saltate }, 'requisiti di Palazzo delle Richieste: alcune saltate');
    logger.info({ migrazione: 'L10-03-383', aggiunte: aggiunte.map((a) => a.richiesta), giaPresenti: giaPresenti.map((a) => a.richiesta) }, 'requisiti di Palazzo delle Richieste');
  },
};
