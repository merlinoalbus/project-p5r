// ============================================================
// 141 — il registro della decisione unitaria Tanaka (L7-TANAKA-TRANSAZIONE, RICEVUTA, RIPRISTINO; lotti/L7/tanaka-decisione-unitaria.md)
// ============================================================
//
// Il listino di Tanaka passa dalle 20 offerte correnti alle 18 Royal (G-034) con una sola decisione dell'utente: 10 chiavi conservate e
// aggiornate, 8 offerte nuove, 10 offerte nascoste (mai cancellate). Questa migrazione crea soltanto il registro, vuoto: nessuna offerta,
// proposta, acquisto, Diario, Dote o yen cambia qui. La decisione la applica l'utente dall'app.
//   - `decisione_tanaka`: una riga per decisione confermata, con l'identificativo dell'operazione (idempotenza), le revisioni del confronto
//     e del piano su cui l'utente ha dato il consenso, il piano mostrato, la fotografia integrale di prima (beforeimage: offerte, legami,
//     negozio, cataloghi, proposte, note storiche) e quella di dopo. Le 20 righe di prima sono l'archivio consultabile delle identità
//     commerciali precedenti, con i loro prezzi.
//   - `decisione_tanaka_ripristino`: il ripristino unitario di una decisione, con la fotografia letta prima di ripristinare.
// Entrambe immutabili (trigger): una decisione ripristinata resta nel registro, ripristinata.
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const migration141: Migration = {
  id: 141,
  name: 'decisione_tanaka',
  up(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS main.decisione_tanaka (
      operazione_id       TEXT PRIMARY KEY CHECK (length(operazione_id) BETWEEN 8 AND 80),
      versione            INTEGER NOT NULL CHECK (versione = 1),
      negozio_chiave      TEXT NOT NULL,
      revisione_confronto TEXT NOT NULL,
      revisione_piano     TEXT NOT NULL,
      piano_json          TEXT NOT NULL CHECK (json_valid(piano_json)),
      prima_json          TEXT NOT NULL CHECK (json_valid(prima_json)),
      dopo_json           TEXT NOT NULL CHECK (json_valid(dopo_json)),
      confermata_il       TEXT NOT NULL
    )`);
    db.exec(`CREATE TABLE IF NOT EXISTS main.decisione_tanaka_ripristino (
      operazione_id   TEXT PRIMARY KEY CHECK (length(operazione_id) BETWEEN 8 AND 80),
      decisione_id    TEXT NOT NULL UNIQUE REFERENCES decisione_tanaka(operazione_id),
      prima_json      TEXT NOT NULL CHECK (json_valid(prima_json)),
      ripristinata_il TEXT NOT NULL
    )`);
    for (const t of ['decisione_tanaka', 'decisione_tanaka_ripristino']) {
      db.exec(`CREATE TRIGGER IF NOT EXISTS main.${t}_immutabile_u BEFORE UPDATE ON ${t} BEGIN SELECT RAISE(ABORT, '${t}: registro immutabile'); END`);
      db.exec(`CREATE TRIGGER IF NOT EXISTS main.${t}_immutabile_d BEFORE DELETE ON ${t} BEGIN SELECT RAISE(ABORT, '${t}: registro immutabile'); END`);
    }
  },
};
