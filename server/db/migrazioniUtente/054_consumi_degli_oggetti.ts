// ============================================================
// Utente 054 — il registro dei consumi degli oggetti posseduti (Ondata 5, lotto F-bis; decisioni 21 e 22 dell'utente)
// ============================================================
//
// Decisione 21, precisazione dell'utente: «Ovviamente esula dalla decisione 1 se esistono oggetti con effetti che incidono su cose rilevanti
// per l'app». Gli oggetti che si USANO e che l'app conta (comprati nel registro degli acquisti, utente 051; ricevuti dalle voci, utente 046, e
// dagli esiti, utente 053) devono anche uscire quando si usano: il concime della pianta, i materiali della fabbricazione, l'incenso
// dell'Isolamento. Un registro solo per tutti i consumi che non sono un regalo, una riga per consumo:
//   - `fonte` «turno»: il turno di un'attività registrato con un esito che consuma (`attivita.esiti_json`, campo `consuma`): la riga ricorda
//     attività, numero del turno ed esito, si scrive registrando il turno e si toglie togliendolo (`consumiOggettiService`);
//   - `fonte` «isolamento»: l'incenso bruciato in un ciclo di Isolamento nella Stanza di Velluto (`operazioniVellutoService.eseguiIsolamento`),
//     con l'evento dello storico che lo racconta (`evento_id`).
// Il regalo consegnato resta nel suo registro (`regalo_partita.copia_consumata`, utente 052): la consegna È il consumo, copiarla qui sarebbe un
// secondo punto dello stesso dato. La lettura delle copie (`copieOggetti`) somma i due: possedute − regalate − consumate.
//
// Solo lo schema, vuoto: nessun turno o Isolamento di prima consumava, e nessuna partita salvata si riscrive. Append-only e idempotente (IF NOT
// EXISTS). Audit in `main.dati_guida.audit-utente-054-consumi` quando il file di gioco è attaccato.
// ============================================================

import type { Migration } from '../migrationRunner.js';

const AUDIT = 'audit-utente-054-consumi';

export const utente054: Migration = {
  id: 54,
  name: 'consumi_degli_oggetti',
  up(db) {
    if (!db.inTransaction) throw new Error('utente 054: manca la transazione della migrazione; nessuna modifica applicata.');
    const prima = !!db.prepare("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name = 'consumo_oggetto_partita'").get();
    db.exec(`CREATE TABLE IF NOT EXISTS utente.consumo_oggetto_partita (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      partita_id      INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
      catalogo_chiave TEXT NOT NULL CHECK (length(catalogo_chiave) BETWEEN 1 AND 120),
      quantita        INTEGER NOT NULL CHECK (quantita BETWEEN 1 AND 999),
      fonte           TEXT NOT NULL CHECK (fonte IN ('turno', 'isolamento')),
      attivita_chiave TEXT CHECK (attivita_chiave IS NULL OR length(attivita_chiave) BETWEEN 1 AND 200),
      ordine          INTEGER CHECK (ordine IS NULL OR ordine >= 1),
      esito_chiave    TEXT CHECK (esito_chiave IS NULL OR length(esito_chiave) BETWEEN 1 AND 60),
      evento_id       INTEGER,
      creato_il       TEXT NOT NULL,
      CHECK ((fonte = 'turno') = (attivita_chiave IS NOT NULL AND ordine IS NOT NULL AND esito_chiave IS NOT NULL))
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS utente.consumo_oggetto_partita_catalogo ON consumo_oggetto_partita (partita_id, catalogo_chiave)');
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS utente.consumo_oggetto_partita_turno ON consumo_oggetto_partita (partita_id, attivita_chiave, ordine, catalogo_chiave) WHERE fonte = 'turno'");
    if (db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = 'dati_guida'").get()) {
      db.prepare('INSERT OR IGNORE INTO main.dati_guida (chiave, json) VALUES (?, ?)')
        .run(AUDIT, JSON.stringify({ data: '2026-10-26', decisioni: ['L13-21', 'L13-22'], tabella: 'utente.consumo_oggetto_partita', creata: !prima, righe: 0 }));
    }
  },
};
