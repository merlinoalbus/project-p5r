// ============================================================
// Migrazione 043 — che cosa è l'immagine di una mappa
// ============================================================
//
// Finora la distinzione fra «pianta del gioco» e «illustrazione disegnata per l'applicazione»
// era dedotta dal percorso dell'asset e dalle sue dimensioni, con una lista di eccezioni scritta
// nel codice per le sedici destinazioni di Tokyo che hanno un'illustrazione originale. Il
// frontend e il backend deducevano per giunta in modo diverso.
//
// Qui il ruolo diventa un dato della mappa:
//
//   planimetria-nativa        pianta estratta dal gioco
//   illustrazione-editoriale  mappa disegnata per l'applicazione: si consulta e porta spilli
//   emblema                   stemma del Palazzo: identifica il luogo, non lo rappresenta
//   nessuna                   la mappa non ha immagine propria
//
// La distinzione serve a non far passare un'illustrazione per una pianta del gioco, e a non far
// passare uno stemma per una mappa; non toglie nulla alle illustrazioni dei quartieri, che
// restano consultabili e continuano a portare i loro spilli.
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const migration043: Migration = {
  id: 43,
  name: 'ruolo_immagine',
  up: (db) => {
    db.exec(`ALTER TABLE mappa ADD COLUMN ruolo_immagine TEXT NOT NULL DEFAULT 'nessuna'
      CHECK (ruolo_immagine IN ('planimetria-nativa', 'illustrazione-editoriale', 'emblema', 'nessuna'))`);
    // ha un'immagine chi porta un asset del repository o un'immagine caricata nell'istanza
    db.exec(`UPDATE mappa SET ruolo_immagine = 'illustrazione-editoriale'
      WHERE asset IS NOT NULL OR EXISTS (
        SELECT 1 FROM immagine i WHERE i.ambito = 'mappa' AND i.chiave IN (mappa.immagine_chiave, mappa.chiave))`);
    // gli stemmi dei Palazzi non sono mappe
    db.exec("UPDATE mappa SET ruolo_immagine = 'emblema' WHERE asset LIKE 'palazzi/%'");
    // le uniche piante estratte dal gioco sono quelle dell'atlante nativo
    db.exec("UPDATE mappa SET ruolo_immagine = 'planimetria-nativa' WHERE asset LIKE 'mappe/native/%'");
  },
};
