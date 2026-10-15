// ============================================================
// 103 — Le copie dei pezzi delle planimetrie: un ritaglio definito una volta, posato in più punti della mappa
// ============================================================
//
// Richiesta dell'utente (2026-10-15): «vorrei poter usare un pezzo una volta recuperato e definito per inserirlo più volte nella
// mappa.» Scelte dell'utente (AskUserQuestion): «Ritaglio con copie» (non un «Duplica» che crea pezzi indipendenti); le condizioni
// «Per copia»; eliminando l'ultima copia «Se ne va il ritaglio» (e la zona d'origine torna visibile); «Nome + etichetta copia».
//
// Il pezzo della 102 teneva insieme due cose: il **ritaglio** (la zona d'origine, sempre cancellata dall'immagine, e il nome) e
// la **posa** (dove sta, ruotato e specchiato come, e quando si vede). Qui si separano:
//   - `pezzo_mappa` resta il ritaglio: `uid`, `mappa_chiave`, `nome`, la zona (`sorgente_x`, `sorgente_y`, `larghezza`,
//     `altezza`), `ordine` fra i pezzi della mappa, `updated_at`. Le colonne della posa se ne vanno (ricostruzione della tabella:
//     gli `id` e gli `uid` restano quelli di prima);
//   - `copia_pezzo` tiene le copie posate di un ritaglio: `uid` proprio, `etichetta` facoltativa (vuota = «Nome · copia N» nella
//     vista), `x`, `y` (angolo in alto a sinistra dell'ingombro dopo la rotazione), `rotazione`, `specchio_orizzontale`,
//     `specchio_verticale`, `condizioni_json` (le condizioni dei pin, per copia), `ordine` fra le copie del ritaglio.
// Ogni pezzo esistente diventa un ritaglio con una copia: la posa che aveva, con le sue condizioni. Niente si perde.
// Eliminando il ritaglio (o la planimetria) se ne vanno le sue copie (ON DELETE CASCADE); un ritaglio senza copie non resta
// (lo garantisce il servizio, `pezziMappa.ts`).
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const migration103: Migration = {
  id: 103,
  name: 'copie_dei_pezzi',
  up(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS copia_pezzo (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      uid                  TEXT NOT NULL UNIQUE,
      pezzo_id             INTEGER NOT NULL REFERENCES pezzo_mappa(id) ON DELETE CASCADE,
      etichetta            TEXT NOT NULL DEFAULT '',
      x                    INTEGER NOT NULL CHECK (x >= 0),
      y                    INTEGER NOT NULL CHECK (y >= 0),
      rotazione            INTEGER NOT NULL DEFAULT 0 CHECK (rotazione IN (0, 90, 180, 270)),
      specchio_orizzontale INTEGER NOT NULL DEFAULT 0 CHECK (specchio_orizzontale IN (0, 1)),
      specchio_verticale   INTEGER NOT NULL DEFAULT 0 CHECK (specchio_verticale IN (0, 1)),
      condizioni_json      TEXT NULL,
      ordine               INTEGER NOT NULL DEFAULT 0,
      updated_at           TEXT NOT NULL
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_copia_pezzo_pezzo ON copia_pezzo(pezzo_id, ordine)');
    // Le colonne della posa ci sono ancora (la 102 senza la 103): ogni pezzo diventa un ritaglio con la sua posa come prima copia.
    const colonne = (db.prepare('PRAGMA table_info(pezzo_mappa)').all() as Array<{ name: string }>).map((c) => c.name);
    if (!colonne.includes('x')) return;
    db.exec(`INSERT INTO copia_pezzo (uid, pezzo_id, etichetta, x, y, rotazione, specchio_orizzontale, specchio_verticale, condizioni_json, ordine, updated_at)
      SELECT lower(hex(randomblob(16))), id, '', x, y, rotazione, specchio_orizzontale, specchio_verticale, condizioni_json, 0, updated_at FROM pezzo_mappa ORDER BY id`);
    // Il ritaglio senza le colonne della posa (le chiavi esterne sono spente durante le migrazioni: il runner le ricontrolla prima
    // di chiudere la transazione, e `copia_pezzo` torna a puntare a `pezzo_mappa` col nome di sempre).
    db.exec(`CREATE TABLE pezzo_mappa_nuovo (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      uid                  TEXT NOT NULL UNIQUE,
      mappa_chiave         TEXT NOT NULL REFERENCES mappa(chiave) ON DELETE CASCADE,
      nome                 TEXT NOT NULL DEFAULT '',
      sorgente_x           INTEGER NOT NULL CHECK (sorgente_x >= 0),
      sorgente_y           INTEGER NOT NULL CHECK (sorgente_y >= 0),
      larghezza            INTEGER NOT NULL CHECK (larghezza > 0),
      altezza              INTEGER NOT NULL CHECK (altezza > 0),
      ordine               INTEGER NOT NULL DEFAULT 0,
      updated_at           TEXT NOT NULL
    )`);
    db.exec(`INSERT INTO pezzo_mappa_nuovo (id, uid, mappa_chiave, nome, sorgente_x, sorgente_y, larghezza, altezza, ordine, updated_at)
      SELECT id, uid, mappa_chiave, nome, sorgente_x, sorgente_y, larghezza, altezza, ordine, updated_at FROM pezzo_mappa`);
    // AUTOINCREMENT: il contatore della tabella vecchia (anche gli id dei pezzi eliminati) passa alla nuova, così un id già usato
    // non torna (nota F6 del validatore).
    const contatore = db.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'pezzo_mappa'").pluck().get() as number | undefined;
    db.exec('DROP TABLE pezzo_mappa; ALTER TABLE pezzo_mappa_nuovo RENAME TO pezzo_mappa;');
    if (contatore !== undefined) {
      db.prepare("UPDATE sqlite_sequence SET seq = MAX(seq, ?) WHERE name = 'pezzo_mappa'").run(contatore);
      db.prepare("INSERT INTO sqlite_sequence (name, seq) SELECT 'pezzo_mappa', ? WHERE NOT EXISTS (SELECT 1 FROM sqlite_sequence WHERE name = 'pezzo_mappa')").run(contatore);
    }
    db.exec('CREATE INDEX IF NOT EXISTS idx_pezzo_mappa_mappa ON pezzo_mappa(mappa_chiave, ordine)');
  },
};
