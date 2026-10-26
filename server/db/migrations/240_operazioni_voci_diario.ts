// ============================================================
// Migrazione 240 — il registro delle operazioni sulle voci del Diario: copie e spostamenti (appunti del Diario, 2026-10-26)
// (nata come 239 sul ramo degli appunti, mai pubblicata con quel numero: la 239 pubblicata su main è `239_televendite_set_alternativi`)
// ============================================================
//
// Richiesta dell'utente: copiare, tagliare e incollare voci del Diario con gli appunti di sistema, con «Annulla» nella notifica. Ogni
// copia e ogni spostamento di voci (dagli appunti o dalla finestra «Copia in…» / «Sposta in…») scrive qui una riga:
//
//   - `tipo`: 'copia' (voci nuove con uid nuovi) o 'sposta' (le stesse voci in un altro giorno, fascia o posto);
//   - `origine`: 'appunti' (Ctrl+C / Ctrl+X e Ctrl+V, o il menu della voce) o 'trasferimento' (la finestra «Copia in…» / «Sposta in…»);
//   - `giorno_dest`, `fascia_dest`: dove sono arrivate (la fascia è null se ogni voce è andata nella sua fascia d'origine);
//   - `richiesta_json`: che cosa ha chiesto il gesto (identità del taglio, ancora, rilievi confermati, effetti lasciati fuori);
//   - `esito_json`: per ogni voce, l'uid arrivato e, per lo spostamento, da dove veniva (giorno, fascia, posizione nella guida, uid dei vicini):
//     serve all'annullo, perché l'origine non si ricostruisce da fuori, e al diario validato, i cui spostamenti restano tracciati;
//   - `annullata_il`, `annullo_json`: l'annullo, una volta sola.
//
// Append-only come le proposte «da completare» (modello della 237): una riga non si cancella mai e il suo contenuto non cambia; si
// scrivono solo `annullata_il` e `annullo_json`, e una volta sola. Idempotente: `IF NOT EXISTS`.
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const migration240: Migration = {
  id: 240,
  name: 'operazioni_voci_diario',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS main.operazione_voci_diario (
        id             TEXT PRIMARY KEY CHECK (length(id) = 32),
        tipo           TEXT NOT NULL CHECK (tipo IN ('copia', 'sposta')),
        origine        TEXT NOT NULL CHECK (origine IN ('appunti', 'trasferimento')),
        giorno_dest    TEXT NOT NULL,
        fascia_dest    TEXT CHECK (fascia_dest IS NULL OR fascia_dest IN ('giorno', 'sera')),
        richiesta_json TEXT NOT NULL CHECK (json_valid(richiesta_json)),
        esito_json     TEXT NOT NULL CHECK (json_valid(esito_json) AND json_type(esito_json) = 'array'),
        creata_il      TEXT NOT NULL,
        annullata_il   TEXT,
        annullo_json   TEXT CHECK (annullo_json IS NULL OR json_valid(annullo_json)),
        CHECK ((annullata_il IS NULL) = (annullo_json IS NULL))
      );
      CREATE INDEX IF NOT EXISTS main.operazione_voci_diario_creata ON operazione_voci_diario (creata_il);
      CREATE TRIGGER IF NOT EXISTS main.operazione_voci_diario_contenuto_fisso
        BEFORE UPDATE OF id, tipo, origine, giorno_dest, fascia_dest, richiesta_json, esito_json, creata_il ON operazione_voci_diario
        BEGIN SELECT RAISE(ABORT, 'operazione_voci_diario: il contenuto di un''operazione non si modifica'); END;
      CREATE TRIGGER IF NOT EXISTS main.operazione_voci_diario_annullo_unico
        BEFORE UPDATE OF annullata_il, annullo_json ON operazione_voci_diario WHEN OLD.annullata_il IS NOT NULL
        BEGIN SELECT RAISE(ABORT, 'operazione_voci_diario: un''operazione si annulla una volta sola'); END;
      CREATE TRIGGER IF NOT EXISTS main.operazione_voci_diario_non_si_cancella
        BEFORE DELETE ON operazione_voci_diario
        BEGIN SELECT RAISE(ABORT, 'operazione_voci_diario: il registro delle operazioni non si cancella'); END;
    `);
  },
};
