// ============================================================
// Migrazione 247 — due offerte doppie nei listini: Foglio d'alluminio (Akiba) e L'ABC dell'artigianato (Hinokuniya) (Ondata 5, Lotto B)
// ============================================================
//
// Censimento della rigenerazione (ondata 5): «`akiba` ha "Foglio di alluminio" due volte; `hinokuniya` ha "ABC dell'artigianato" due volte».
// La guida italiana (Elenco dei negozi) ne elenca uno solo per negozio: «Foglio d'alluminio», 4.400 ¥, 2 pezzi, giorno successivo;
// «L'ABC dell'artigianato», 2.800 ¥, «dopo aver creato strumenti una volta», 1 pezzo.
//   - Akiba: resta `akiba/foglio-d-alluminio`, collegata all'oggetto della guida `materiale/foglio-dalluminio` (quello delle ricette); si
//     nasconde `akiba/foglio-di-alluminio` con la sua identità nata dal solo listino (`materiale/foglio-di-alluminio`, fonte «listino»);
//   - Hinokuniya: resta `hinokuniya/l-abc-dell-artigianato`, collegata al libro (`libro/labc-dellartigianato`), e riceve la condizione della
//     guida che aveva solo il doppione («Primo strumento di infiltrazione creato»); si nasconde `hinokuniya/abc-dell-artigianato` con la sua
//     identità nata dal solo listino (`altro/abc-dell-artigianato`).
// Nascondere è reversibile (le righe restano, `nascosto = 1`). Conservativa: una riga si nasconde solo se nessun dato la cita (acquisti delle
// partite, registro, voci del Diario, contenuti, ricette, regali, altre offerte): altrimenti resta e l'audit lo dice. Le condizioni si
// correggono solo se sono quelle attese. Idempotente. Nessuna voce del Diario cambia. Audit in `dati_guida.audit-247-doppioni`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { improntaDiario, scriviAudit } from './rifornimentoOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-247-doppioni';
const errore = (motivo: string): never => { throw new Error(`247: ${motivo}; nessuna modifica applicata.`); };

interface Doppione { tiene: string; nasconde: string; identita: string; condizioniPrima?: string; condizioniDopo?: string }
const DOPPIONI: readonly Doppione[] = [
  { tiene: 'akiba/foglio-d-alluminio', nasconde: 'akiba/foglio-di-alluminio', identita: 'materiale/foglio-di-alluminio' },
  { tiene: 'hinokuniya/l-abc-dell-artigianato', nasconde: 'hinokuniya/abc-dell-artigianato', identita: 'altro/abc-dell-artigianato',
    condizioniPrima: JSON.stringify([{ tipo: 'quartiere', quartiere: 'shinjuku' }]),
    condizioniDopo: JSON.stringify([{ tipo: 'quartiere', quartiere: 'shinjuku' }, { tipo: 'evento', evento: 'primo-strumento-creato' }]) },
];

/** Le righe che citano la chiave, per tabella e colonna (le tabelle che mancano non contano). */
function citazioni(db: AppDatabase, chiave: string, dove: ReadonlyArray<[schema: 'main' | 'utente', tabella: string, colonna: string]>): string[] {
  const out: string[] = [];
  for (const [schema, tabella, colonna] of dove) {
    if (!db.prepare(`SELECT 1 FROM ${schema}.sqlite_master WHERE type = 'table' AND name = ?`).get(tabella)) continue;
    const n = db.prepare(`SELECT COUNT(*) FROM ${schema}."${tabella}" WHERE "${colonna}" = ?`).pluck().get(chiave) as number;
    if (n) out.push(`${tabella}.${colonna}: ${n}`);
  }
  return out;
}

export const migration247: Migration = {
  id: 247,
  name: 'doppioni_dei_listini',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'articolo')) { logger.warn({ migrazione: 247 }, 'articoli assenti: nessun doppione toccato'); return; }
    const diarioPrima = improntaDiario(db);
    const esiti: Array<{ riga: string; esito: string }> = [];
    let nascoste = 0;
    for (const d of DOPPIONI) {
      const tiene = db.prepare('SELECT nascosto, condizioni_json FROM main.articolo WHERE chiave = ?').get(d.tiene) as { nascosto: number; condizioni_json: string | null } | undefined;
      const doppione = db.prepare('SELECT nascosto, catalogo_chiave FROM main.articolo WHERE chiave = ?').get(d.nasconde) as { nascosto: number; catalogo_chiave: string | null } | undefined;
      if (!tiene || tiene.nascosto) { esiti.push({ riga: d.nasconde, esito: `l'offerta che resta (${d.tiene}) manca o è nascosta: niente da unire` }); continue; }
      // la condizione della guida passa all'offerta che resta
      if (d.condizioniPrima && d.condizioniDopo) {
        if (tiene.condizioni_json === d.condizioniDopo) esiti.push({ riga: d.tiene, esito: 'condizioni già corrette' });
        else if (tiene.condizioni_json === d.condizioniPrima) {
          if (db.prepare('UPDATE main.articolo SET condizioni_json = ? WHERE chiave = ? AND condizioni_json = ?').run(d.condizioniDopo, d.tiene, d.condizioniPrima).changes !== 1) errore(`${d.tiene} non si aggiorna`);
          esiti.push({ riga: d.tiene, esito: `condizioni: ${d.condizioniDopo}` });
        } else esiti.push({ riga: d.tiene, esito: `condizioni diverse da quelle attese (${tiene.condizioni_json}): non toccate` });
      }
      if (!doppione) { esiti.push({ riga: d.nasconde, esito: 'doppione assente' }); continue; }
      if (doppione.nascosto) { esiti.push({ riga: d.nasconde, esito: 'doppione già nascosto' }); continue; }
      const usiOfferta = citazioni(db, d.nasconde, [['utente', 'acquisto_partita', 'articolo_chiave'], ['utente', 'registro_acquisti', 'articolo_chiave'], ['utente', 'acquisto_registrato', 'articolo_chiave'],
        ['main', 'voce_effetto', 'chiave'], ['main', 'voce_giornata', 'riferimento_chiave'], ['main', 'ricompensa_oggetto', 'fonte_chiave'], ['main', 'nota_storica_legame', 'chiave']]);
      if (usiOfferta.length) { esiti.push({ riga: d.nasconde, esito: `citato (${usiOfferta.join(', ')}): non nascosto` }); continue; }
      db.prepare('UPDATE main.articolo SET nascosto = 1 WHERE chiave = ? AND nascosto = 0').run(d.nasconde);
      nascoste++;
      esiti.push({ riga: d.nasconde, esito: `nascosto: resta ${d.tiene}` });
      // l'identità nata dal solo listino, se non la usa nient'altro
      if (doppione.catalogo_chiave === d.identita && esisteTabella(db, 'catalogo_oggetto')) {
        const usiIdentita = citazioni(db, d.identita, [['main', 'articolo', 'catalogo_chiave'], ['main', 'ricompensa_oggetto', 'catalogo_chiave'], ['main', 'ricetta_materiale', 'catalogo_chiave'],
          ['main', 'confidente_regalo', 'catalogo_chiave'], ['main', 'libro', 'catalogo_chiave'], ['main', 'voce_effetto', 'chiave'], ['main', 'nota_storica_legame', 'chiave'],
          ['utente', 'oggetto_ottenuto_partita', 'catalogo_chiave'], ['utente', 'regalo_partita', 'catalogo_chiave']]);
        // la sola citazione ammessa è il doppione appena nascosto
        if (usiIdentita.length === 1 && usiIdentita[0] === 'articolo.catalogo_chiave: 1') {
          const n = db.prepare("UPDATE main.catalogo_oggetto SET nascosto = 1 WHERE chiave = ? AND nascosto = 0 AND fonte_tipo = 'listino'").run(d.identita).changes;
          esiti.push({ riga: d.identita, esito: n ? 'identità del solo listino nascosta' : 'identità già nascosta o non del solo listino: non toccata' });
        } else esiti.push({ riga: d.identita, esito: `identità citata (${usiIdentita.join(', ')}): resta` });
      }
    }
    if (improntaDiario(db) !== diarioPrima) errore('le voci del Diario sono cambiate');
    if (nascoste) invalidaCacheDiGioco();
    scriviAudit(db, AUDIT, 247, { conteggi: { doppioni: DOPPIONI.length, nascoste }, esiti });
    logger.info({ migrazione: 247, nascoste }, 'Negozi: offerte doppie nascoste');
  },
};
