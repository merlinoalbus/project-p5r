// ============================================================
// Migrazione 045 — ripristina `mappa_presentazione` dove manca
// ============================================================
//
// La 042 crea `mappa_presentazione` insieme alle altre tabelle dell'organizzazione, ma esistono
// istanze che segnano quella migrazione come applicata e non hanno la tabella. L'importazione
// del pacchetto delle mappe la salta in silenzio quando non la trova, quindi contesti e gruppi
// di immagini sparivano senza un errore: l'indice mostrava le versioni di uno stesso luogo come
// luoghi separati.
//
// Qui la tabella viene creata se manca, con lo stesso schema della 042. Dove c'è già, la
// migrazione non fa nulla.
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const migration045: Migration = {
  id: 45,
  name: 'presentazione_mancante',
  up: (db) => {
    db.exec(`CREATE TABLE IF NOT EXISTS mappa_presentazione (
      mappa_chiave         TEXT PRIMARY KEY REFERENCES mappa(chiave) ON DELETE CASCADE,
      contesti_json        TEXT NOT NULL DEFAULT '[]',
      gruppo_immagini_json TEXT
    )`);
  },
};
