// ============================================================
// 102 — I pezzi delle planimetrie: ritagli dell'immagine posati sulla mappa, con le condizioni che li mostrano
// ============================================================
//
// Richiesta dell'utente (2026-10-14): «in alcune mappe ci sono dei pezzi che sono previsti originariamente per posizionarli sopra
// il resto come parti mobili soggette a condizioni... mi chiedevo se potessi tu permettermi di selezionarle con il mouse
// (toglierle dalla visualizzazione ordinaria e gestirle con le condizioni come i pin in punti specifici della mappa occupando lo
// stesso spazio originale...)». Scelte dell'utente: la zona d'origine è «sempre cancellata»; un pezzo senza le sue condizioni è
// «nascosto, in trasparenza a richiesta»; il pezzo si può ruotare di 90° e specchiare.
//
// `pezzo_mappa` tiene i pezzi di una planimetria, in **pixel dell'immagine** (non in percentuali come gli spilli, arrotondati allo
// 0,1%: un muro deve combaciare al pixel):
//   - la zona d'origine: `sorgente_x`, `sorgente_y` (angolo in alto a sinistra), `larghezza`, `altezza`. Nell'immagine di base è
//     sempre cancellata, che il pezzo sia visibile o no;
//   - dove sta: `x`, `y`, l'angolo in alto a sinistra dell'ingombro del pezzo posato (dopo la rotazione: a 90° e 270° larghezza e
//     altezza si scambiano);
//   - come: `specchio_orizzontale` / `specchio_verticale` (prima) e `rotazione` in senso orario attorno al centro (poi);
//   - quando: `condizioni_json`, le stesse condizioni dei pin (`RequisitoSpillo[]`), valutate per la partita come i pin.
// Sono dati di gioco: stanno in `gioco.db`, viaggiano col pacchetto e con l'esportazione delle mappe, valgono per tutte le partite.
// `uid` li riconosce fra un'esportazione e l'altra. Eliminando la planimetria se ne vanno anche i suoi pezzi.
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const migration102: Migration = {
  id: 102,
  name: 'pezzi_delle_mappe',
  up(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS pezzo_mappa (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      uid                  TEXT NOT NULL UNIQUE,
      mappa_chiave         TEXT NOT NULL REFERENCES mappa(chiave) ON DELETE CASCADE,
      nome                 TEXT NOT NULL DEFAULT '',
      sorgente_x           INTEGER NOT NULL CHECK (sorgente_x >= 0),
      sorgente_y           INTEGER NOT NULL CHECK (sorgente_y >= 0),
      larghezza            INTEGER NOT NULL CHECK (larghezza > 0),
      altezza              INTEGER NOT NULL CHECK (altezza > 0),
      x                    INTEGER NOT NULL CHECK (x >= 0),
      y                    INTEGER NOT NULL CHECK (y >= 0),
      rotazione            INTEGER NOT NULL DEFAULT 0 CHECK (rotazione IN (0, 90, 180, 270)),
      specchio_orizzontale INTEGER NOT NULL DEFAULT 0 CHECK (specchio_orizzontale IN (0, 1)),
      specchio_verticale   INTEGER NOT NULL DEFAULT 0 CHECK (specchio_verticale IN (0, 1)),
      condizioni_json      TEXT NULL,
      ordine               INTEGER NOT NULL DEFAULT 0,
      updated_at           TEXT NOT NULL
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_pezzo_mappa_mappa ON pezzo_mappa(mappa_chiave, ordine)');
  },
};
