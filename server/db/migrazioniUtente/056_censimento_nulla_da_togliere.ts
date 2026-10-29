// ============================================================
// Utente 056 — il registro del censimento accoglie l'esito «nulla-da-togliere» (2026-10-29)
// ============================================================
//
// Segnalazione dell'utente: nell'elenco delle operazioni da completare due decisioni «Non è stata accettata. «La leggenda dei pirati» non è
// fra le copie della partita: non esce niente.». Erano proposte dell'elenco del passato (decisione 19) per un effetto «oggetto restituito o
// venduto» di un libro preso in prestito prima che l'inventario si tracciasse: la partita non ne ha copie, quindi «Applica» non può toglierne
// nessuna e il server la rifiuta. Da qui il censimento (`statiMancantiService.proponiStatiMancanti`) non propone più l'uscita di un oggetto senza
// copie abbastanza: lo scrive nel suo registro con il nuovo esito «nulla-da-togliere» (una decisione presa una volta sola, come «gia-presente»)
// e chiude la proposta aperta di prima con la nota `motivo_chiusura = 'nulla-da-togliere'` (al primo avvio dopo questa migrazione).
//
// Il vincolo `esito IN ('proposta', 'gia-presente')` della 050 non si può allargare in SQLite: la tabella si ricostruisce con le stesse righe
// (stesse colonne, stessa chiave), poi si controlla il conteggio. Nessuna riga cambia. Append-only, dentro la transazione della migrazione;
// un file che ha già la forma nuova non si tocca. Audit in `main.dati_guida.audit-utente-056-nulla-da-togliere` quando il file di gioco è
// attaccato.
// ============================================================

import type { Migration } from '../migrationRunner.js';

const AUDIT = 'audit-utente-056-nulla-da-togliere';

export const utente056: Migration = {
  id: 56,
  name: 'censimento_nulla_da_togliere',
  up(db) {
    if (!db.inTransaction) throw new Error('utente 056: manca la transazione della migrazione; nessuna modifica applicata.');
    const sql = db.prepare("SELECT sql FROM utente.sqlite_master WHERE type = 'table' AND name = 'censimento_stato_voce'").pluck().get() as string | undefined;
    // la 050 non ha creato la tabella (non succede: la crea sempre), o il vincolo accoglie già il nuovo esito: niente da fare
    if (!sql || sql.includes('nulla-da-togliere')) return;
    if (db.prepare("SELECT 1 FROM utente.sqlite_master WHERE name = 'censimento_stato_voce_056'").get()) throw new Error('utente 056: nome temporaneo già occupato; nessuna modifica applicata.');
    const prima = db.prepare('SELECT COUNT(*) FROM utente.censimento_stato_voce').pluck().get() as number;
    db.exec(`CREATE TABLE utente.censimento_stato_voce_056 (
      partita_id INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
      voce_uid TEXT NOT NULL CHECK (length(voce_uid) BETWEEN 1 AND 64),
      effetto_uid TEXT NOT NULL CHECK (length(effetto_uid) BETWEEN 1 AND 64),
      tipo TEXT NOT NULL CHECK (length(tipo) BETWEEN 1 AND 40),
      chiave TEXT,
      esito TEXT NOT NULL CHECK (esito IN ('proposta', 'gia-presente', 'nulla-da-togliere')),
      rilevato_il TEXT NOT NULL,
      PRIMARY KEY (partita_id, voce_uid, effetto_uid)
    )`);
    db.exec(`INSERT INTO utente.censimento_stato_voce_056 (partita_id, voce_uid, effetto_uid, tipo, chiave, esito, rilevato_il)
      SELECT partita_id, voce_uid, effetto_uid, tipo, chiave, esito, rilevato_il FROM utente.censimento_stato_voce`);
    db.exec('DROP TABLE utente.censimento_stato_voce');
    db.exec('ALTER TABLE utente.censimento_stato_voce_056 RENAME TO censimento_stato_voce');
    const dopo = db.prepare('SELECT COUNT(*) FROM utente.censimento_stato_voce').pluck().get() as number;
    if (dopo !== prima) throw new Error(`utente 056: righe del censimento ${prima} prima e ${dopo} dopo la ricostruzione; nessuna modifica applicata.`);
    if (db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = 'dati_guida'").get()) {
      db.prepare('INSERT OR IGNORE INTO main.dati_guida (chiave, json) VALUES (?, ?)')
        .run(AUDIT, JSON.stringify({ data: '2026-10-29', richiesta: 'uscita di un oggetto senza copie nella partita: nulla da togliere, non si propone', tabella: 'utente.censimento_stato_voce', righe: prima }));
    }
  },
};
