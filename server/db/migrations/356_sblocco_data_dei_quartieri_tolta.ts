// ============================================================
// 356 — via la data di sblocco accanto alla condizione del quartiere (L5-04, lotto «Mondo e mappe»)
// ============================================================
//
// Lo sblocco di un quartiere è la sua condizione (`quartiere.condizioni_json`, con gli inviti dei Confidenti). `quartiere.sblocco_data` (7 righe, ricavata
// nella 037 dalla frase della guida) era una seconda data accanto alla condizione: in 3 quartieri la condizione non ha una data (Ikebukuro, Odaiba,
// Maihama: si aprono con un luogo), a Suidobashi dice un altro giorno (06-10 contro 06-09). Vale la condizione.
//
// COSA: le righe con un valore vanno in `dati_guida.archivio-frasi-l11` (colonna `quartiere.sblocco_data`, per chiave del quartiere; righe archiviate =
// righe con valore), poi `ALTER TABLE … DROP COLUMN`. `server/db/fontiTolte.ts` ha la voce della colonna. La data di ogni riga è confrontata con le date della
// condizione nel verbale `dati_guida.audit-l5-04-sblocco-data`: coincide, la condizione non ha data, o differisce.
//
// COSA NON CAMBIA (impronte di ogni riga prima e dopo): le altre colonne di `quartiere` e per intero luoghi, pin, negozi, offerte, attività e Cestino.
// Il lettore delle migrazioni storiche `contestoConversione.quartiereDatato` resta condizionale: legge la colonna finché c'è. Idempotente: senza la colonna
// non fa niente. Nessun import da `server/services/`; non si scrive in `utente`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna, improntaTabella, righeConValore } from './pulizieL11.js';
import { archiviaSenzaSovrascrivere, righeArchiviate, registraAudit } from './archivioL1.js';

const errore = (motivo: string): never => { throw new Error(`356: ${motivo}; nessuna modifica applicata.`); };

const COLONNA_ARCHIVIO = 'quartiere.sblocco_data';
const TABELLE_INTATTE = ['luogo', 'spillo', 'negozio', 'articolo', 'attivita', 'cestino'] as const;

/** Le date (`tipo: 'data'`) di una condizione, anche dentro un gruppo. */
function dateDellaCondizione(condizione: unknown): string[] {
  if (typeof condizione !== 'object' || condizione === null) return [];
  const c = condizione as { tipo?: unknown; dal?: unknown; condizioni?: unknown };
  if (c.tipo === 'data') return typeof c.dal === 'string' ? [c.dal] : [];
  return c.tipo === 'gruppo' && Array.isArray(c.condizioni) ? c.condizioni.flatMap(dateDellaCondizione) : [];
}

/** Le date di un `condizioni_json`: nessuna se è vuoto o illeggibile. */
export function dateDelJson(json: string | null): string[] {
  if (!json) return [];
  try {
    const valore = JSON.parse(json) as unknown;
    return Array.isArray(valore) ? valore.flatMap(dateDellaCondizione) : [];
  } catch {
    return [];
  }
}

export type ConfrontoData = 'coincide con la condizione' | 'la condizione non ha data' | 'differisce dalla condizione';

/** Il confronto della vecchia data con quelle della condizione. */
export const confrontaData = (data: string, date: readonly string[]): ConfrontoData =>
  date.length === 0 ? 'la condizione non ha data' : date.includes(data) ? 'coincide con la condizione' : 'differisce dalla condizione';

/** Gli indici, le viste e i trigger che citano la colonna: `DROP COLUMN` non potrebbe toglierla (e si fallisce prima, dicendo quali). */
function dipendenzeDellaColonna(db: AppDatabase): string[] {
  return (db.prepare(`SELECT name FROM main.sqlite_master
    WHERE type IN ('index', 'view', 'trigger') AND sql LIKE '%sblocco_data%' AND (tbl_name = 'quartiere' OR (type = 'view' AND sql LIKE '%quartiere%'))`).pluck().all() as string[]);
}

export const migration356: Migration = {
  id: 356,
  name: 'sblocco_data_dei_quartieri_tolta',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'quartiere') || !haColonna(db, 'quartiere', 'sblocco_data')) return;
    if (!esisteTabella(db, 'dati_guida')) errore('manca la tabella dati_guida');
    const dipendenze = dipendenzeDellaColonna(db);
    if (dipendenze.length > 0) errore(`la colonna è citata da ${dipendenze.join(', ')}`);

    const prima = new Map<string, string>([['quartiere', improntaTabella(db, 'quartiere', ['sblocco_data'])]]);
    for (const t of TABELLE_INTATTE) if (esisteTabella(db, t)) prima.set(t, improntaTabella(db, t));

    const righe = righeConValore(db, 'quartiere', 'sblocco_data');
    const leggiCondizione = db.prepare('SELECT condizioni_json FROM main.quartiere WHERE chiave = ?').pluck();
    const date = Object.entries(righe).map(([quartiere, valore]) => {
      const data = String(valore);
      const condizioni = leggiCondizione.get(quartiere) as string | null;
      const dateCondizione = dateDelJson(condizioni);
      return { quartiere, sbloccoData: data, confronto: confrontaData(data, dateCondizione), dateDellaCondizione: dateCondizione, condizioni };
    });

    const archiviateNuove = archiviaSenzaSovrascrivere(db, 'L5-04 · 356', COLONNA_ARCHIVIO, righe);
    const presenti = righeArchiviate(db, COLONNA_ARCHIVIO);
    if (!Object.keys(righe).every((k) => k in presenti)) errore('l’archivio delle date non ha tutte le righe');

    db.exec('ALTER TABLE main.quartiere DROP COLUMN "sblocco_data"');
    if (haColonna(db, 'quartiere', 'sblocco_data')) errore('la colonna esiste ancora');

    if (improntaTabella(db, 'quartiere') !== prima.get('quartiere')) errore('le altre colonne di quartiere sono cambiate');
    for (const t of TABELLE_INTATTE) if (prima.has(t) && improntaTabella(db, t) !== prima.get(t)) errore(`la tabella ${t} è cambiata`);

    registraAudit(db, 'audit-l5-04-sblocco-data', { migrazione: 'L5-04 · 356', righeConValore: date.length, archiviateNuove, date });
    logger.info({ migrazione: 'L5-04-356', date: date.map((d) => `${d.quartiere}: ${d.sbloccoData} (${d.confronto})`) }, 'data di sblocco dei quartieri tolta: vale la condizione');
  },
};
