// ============================================================
// Utente 055 — il registro dei consumi accoglie anche le uscite dalle voci: oggetto restituito o venduto (2026-10-28)
// ============================================================
//
// Richiesta dell'utente: «altra cosa non gestita la restituzione di un oggetto in prestito... Libro o DVD (l'acquisto permette di aggiungere
// l'oggetto all'inventario (e con esso gestisco il prestito in ingresso, ma non c'è un vendi prodotto/restituisci prodotto per gestire vendita,
// restituzione)». L'effetto della voce «uscitaOggetto» (`shared/effettiVoce.ts`) fa uscire le copie dalla partita: lo scrive lo stesso registro
// unico delle copie che escono (`utente.consumo_oggetto_partita`, utente 054), con la nuova `fonte` «voce»:
//   - `voce_uid` ed `effetto_uid`: la voce spuntata e l'effetto che la riga ricorda (una riga per effetto: togliendo la spunta, o cambiando o
//     togliendo l'effetto nella guida, se ne va solo quella);
//   - `modo`: «restituito» (un prestito torna: il libro della Biblioteca, il DVD a noleggio) o «venduto»;
//   - `prezzo`: il ricavo della vendita, se indicato (gli yen li muove la spunta, decisione 18: qui resta per dire che cosa è uscito);
//   - `giorno`: il giorno «MM-GG» della voce, perché la regola «restituzione» del rifornimento conti la restituzione solo da quel giorno.
// Il vincolo `fonte IN ('turno','isolamento')` della 054 non si può allargare in SQLite: la tabella si ricostruisce con le stesse righe e gli stessi
// identificativi, poi gli indici. Le righe di prima restano identiche (le colonne nuove sono NULL). Append-only, dentro la transazione della
// migrazione; un file che ha già la forma nuova non si tocca. Audit in `main.dati_guida.audit-utente-055-uscite` quando il file di gioco è attaccato.
// ============================================================

import type { Migration } from '../migrationRunner.js';

const AUDIT = 'audit-utente-055-uscite';

export const utente055: Migration = {
  id: 55,
  name: 'uscite_degli_oggetti',
  up(db) {
    if (!db.inTransaction) throw new Error('utente 055: manca la transazione della migrazione; nessuna modifica applicata.');
    const colonne = (db.prepare("SELECT name FROM pragma_table_info('consumo_oggetto_partita', 'utente')").all() as Array<{ name: string }>).map((c) => c.name);
    // la 054 non ha creato la tabella (non succede: la crea sempre), o la forma è già quella nuova: niente da fare
    if (!colonne.length || colonne.includes('voce_uid')) return;
    if (db.prepare("SELECT 1 FROM utente.sqlite_master WHERE name = 'consumo_oggetto_partita_055'").get()) throw new Error('utente 055: nome temporaneo già occupato; nessuna modifica applicata.');
    const prima = db.prepare('SELECT COUNT(*) FROM utente.consumo_oggetto_partita').pluck().get() as number;
    db.exec(`CREATE TABLE utente.consumo_oggetto_partita_055 (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      partita_id      INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
      catalogo_chiave TEXT NOT NULL CHECK (length(catalogo_chiave) BETWEEN 1 AND 120),
      quantita        INTEGER NOT NULL CHECK (quantita BETWEEN 1 AND 999),
      fonte           TEXT NOT NULL CHECK (fonte IN ('turno', 'isolamento', 'voce')),
      attivita_chiave TEXT CHECK (attivita_chiave IS NULL OR length(attivita_chiave) BETWEEN 1 AND 200),
      ordine          INTEGER CHECK (ordine IS NULL OR ordine >= 1),
      esito_chiave    TEXT CHECK (esito_chiave IS NULL OR length(esito_chiave) BETWEEN 1 AND 60),
      evento_id       INTEGER,
      creato_il       TEXT NOT NULL,
      voce_uid        TEXT CHECK (voce_uid IS NULL OR length(voce_uid) = 32),
      effetto_uid     TEXT CHECK (effetto_uid IS NULL OR length(effetto_uid) = 32),
      modo            TEXT CHECK (modo IS NULL OR modo IN ('restituito', 'venduto')),
      prezzo          INTEGER CHECK (prezzo IS NULL OR prezzo BETWEEN 1 AND 9999999),
      giorno          TEXT CHECK (giorno IS NULL OR giorno GLOB '[0-1][0-9]-[0-3][0-9]'),
      CHECK ((fonte = 'turno') = (attivita_chiave IS NOT NULL AND ordine IS NOT NULL AND esito_chiave IS NOT NULL)),
      CHECK ((fonte = 'voce') = (voce_uid IS NOT NULL AND effetto_uid IS NOT NULL AND modo IS NOT NULL)),
      CHECK (prezzo IS NULL OR modo = 'venduto')
    )`);
    db.exec(`INSERT INTO utente.consumo_oggetto_partita_055 (id, partita_id, catalogo_chiave, quantita, fonte, attivita_chiave, ordine, esito_chiave, evento_id, creato_il)
      SELECT id, partita_id, catalogo_chiave, quantita, fonte, attivita_chiave, ordine, esito_chiave, evento_id, creato_il FROM utente.consumo_oggetto_partita`);
    // la numerazione AUTOINCREMENT riprende da dove era (un id già usato e poi tolto non torna)
    const seq = db.prepare("SELECT seq FROM utente.sqlite_sequence WHERE name = 'consumo_oggetto_partita'").pluck().get() as number | undefined;
    db.exec('DROP TABLE utente.consumo_oggetto_partita');
    db.exec('ALTER TABLE utente.consumo_oggetto_partita_055 RENAME TO consumo_oggetto_partita');
    if (typeof seq === 'number') {
      db.prepare("UPDATE utente.sqlite_sequence SET seq = MAX(seq, ?) WHERE name = 'consumo_oggetto_partita'").run(seq);
      if (!db.prepare("SELECT 1 FROM utente.sqlite_sequence WHERE name = 'consumo_oggetto_partita'").get()) db.prepare("INSERT INTO utente.sqlite_sequence (name, seq) VALUES ('consumo_oggetto_partita', ?)").run(seq);
    }
    db.exec('CREATE INDEX IF NOT EXISTS utente.consumo_oggetto_partita_catalogo ON consumo_oggetto_partita (partita_id, catalogo_chiave)');
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS utente.consumo_oggetto_partita_turno ON consumo_oggetto_partita (partita_id, attivita_chiave, ordine, catalogo_chiave) WHERE fonte = 'turno'");
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS utente.consumo_oggetto_partita_voce ON consumo_oggetto_partita (partita_id, voce_uid, effetto_uid) WHERE fonte = 'voce'");
    const dopo = db.prepare('SELECT COUNT(*) FROM utente.consumo_oggetto_partita').pluck().get() as number;
    if (dopo !== prima) throw new Error(`utente 055: righe dei consumi ${prima} prima e ${dopo} dopo la ricostruzione; nessuna modifica applicata.`);
    if (db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = 'dati_guida'").get()) {
      db.prepare('INSERT OR IGNORE INTO main.dati_guida (chiave, json) VALUES (?, ?)')
        .run(AUDIT, JSON.stringify({ data: '2026-10-28', richiesta: 'oggetto restituito o venduto da una voce', tabella: 'utente.consumo_oggetto_partita', righe: prima }));
    }
  },
};
