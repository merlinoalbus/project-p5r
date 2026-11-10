// ============================================================
// 356 — via `negozio.orari_json` (L4-02; risposta dell'utente a Q6: la raccomandazione)
// ============================================================
//
// Gli orari di un punto vendita con sede sono quelli del luogo, salvo l'eccezione del punto vendita (`eccezione_orari_json`, R5-12b): la
// colonna `orari_json` del negozio non si leggeva più per nessuno di loro (H §1.2). Si leggeva solo per chi non ha sede: oggi il negozio del
// Palazzo di Niijima («solo durante l'esplorazione del Palazzo»). Q6, con la raccomandazione: gli orari inerti dell'Untouchable (giovedì,
// sabato e domenica sera «nei giorni di incontro con il Confidente») vanno in archivio; quelli del Big Bang Burger (una nota sulle sfide di
// sera, che è già il prezzo della sera delle sfide) e del Mercante Sakai (una settimana sì e una no, che sono già le finestre di date di ogni
// suo scambio) sarebbero diventati orari del luogo solo se la guida li avesse confermati come orari: le pagine dei negozi e degli scambi non
// lo fanno, e vanno in archivio come gli altri.
//
// Passi, in una transazione: (1) ogni valore della colonna va in `dati_guida.archivio-frasi-l11` («negozio.orari_json», senza mai riscrivere
// un valore già archiviato); (2) chi non ha sede e non ha ancora un'eccezione riceve i suoi orari come eccezione (gli stessi orari, letti
// prima e dopo dalla stessa funzione: Niijima resta identico); (3) la colonna si toglie. Impronta di `negozio` senza le due colonne identica.
// Idempotente: senza la colonna non fa nulla. `server/db/fontiTolte.ts` riceve la voce. Verbale: `dati_guida.audit-l4-02-orari-negozio`.
// Nessun import da `server/services/`; non si scrive in `utente`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna, improntaTabella, righeConValore } from './pulizieL11.js';
import { archiviaSenzaSovrascrivere, registraAudit, righeArchiviate } from './archivioL1.js';

const errore = (motivo: string): never => { throw new Error(`356: ${motivo}; nessuna modifica applicata.`); };
const MIGRAZIONE = 'L4-02 · 356';

export const migration356: Migration = {
  id: 356,
  name: 'orari_del_negozio_tolti',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!['negozio', 'dati_guida'].every((t) => esisteTabella(db, t)) || !haColonna(db, 'negozio', 'orari_json')) return;
    if (!haColonna(db, 'negozio', 'eccezione_orari_json')) errore('manca la colonna eccezione_orari_json (migrazione 115)');
    const prima = improntaTabella(db, 'negozio', ['orari_json', 'eccezione_orari_json']);

    // (1) l'archivio: tutti i valori non vuoti, righe archiviate = righe con valore
    const righe = righeConValore(db, 'negozio', 'orari_json');
    const nuove = archiviaSenzaSovrascrivere(db, MIGRAZIONE, 'negozio.orari_json', righe);
    const salvate = righeArchiviate(db, 'negozio.orari_json');
    if (!Object.keys(righe).every((k) => k in salvate)) errore('l’archivio non ha tutte le righe');

    // (2) chi non sta sulla mappa tiene i suoi orari come eccezione
    const senzaSede = db.prepare('SELECT chiave FROM main.negozio WHERE sede_chiave IS NULL AND orari_json IS NOT NULL AND eccezione_orari_json IS NULL ORDER BY chiave').pluck().all() as string[];
    for (const k of senzaSede) {
      if (db.prepare('UPDATE main.negozio SET eccezione_orari_json = orari_json WHERE chiave = ? AND eccezione_orari_json IS NULL').run(k).changes !== 1) errore(`l’eccezione di ${k} non è stata scritta`);
    }
    const spostati = db.prepare('SELECT chiave FROM main.negozio WHERE sede_chiave IS NULL AND orari_json IS NOT NULL AND eccezione_orari_json = orari_json').pluck().all() as string[];
    if (senzaSede.some((k) => !spostati.includes(k))) errore('un negozio senza sede ha orari diversi dalla sua eccezione');

    // (3) la colonna
    db.exec('ALTER TABLE main.negozio DROP COLUMN "orari_json"');
    if (haColonna(db, 'negozio', 'orari_json')) errore('la colonna negozio.orari_json esiste ancora');
    if (improntaTabella(db, 'negozio', ['eccezione_orari_json']) !== prima) errore('il negozio è cambiato fuori dagli orari');

    const dettagli = { archiviate: Object.keys(righe).length, nuoveNellArchivio: nuove, eccezioniDaiPropriOrari: senzaSede,
      inArchivioSenzaTrasferimento: ['untouchable', 'big-bang-burger', 'mercante-sakai'].filter((k) => k in righe),
      motivo: 'Q6: Untouchable in archivio; Big Bang Burger e Mercante Sakai non confermati come orari dalla guida (nota sulle sfide serali; finestre di date degli scambi)' };
    registraAudit(db, 'audit-l4-02-orari-negozio', { migrazione: MIGRAZIONE, ...dettagli });
    logger.info({ migrazione: 'L4-02-356', archiviate: dettagli.archiviate, eccezioni: senzaSede }, 'orari del negozio tolti');
  },
};
