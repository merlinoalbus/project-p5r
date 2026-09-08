// ============================================================
// 057 — il denaro del gruppo e i livelli dei Ladri Fantasma
// ============================================================
//
// Chiesto dall'utente: tenere traccia, durante la partita, dei **yen** e di **livello ed
// esperienza** del protagonista e della squadra. Di tutto questo la partita conosceva una cosa
// sola, `livello_protagonista`, e la conosceva per un altro motivo — serve al calcolatore di
// fusione per sapere quali Persona si possono evocare. Denaro ed esperienza non esistevano.
//
// **Il denaro sta sulla partita**, perché nel gioco è del gruppo, non di qualcuno: i yen sono uno
// solo e li spendono tutti. Una colonna, non una tabella.
//
// **I livelli stanno in una tabella per membro**, e non in dieci colonne, per la ragione di sempre:
// i Ladri sono dieci oggi e sono un elenco che il seed può cambiare — Kasumi arriva in Royal, e
// domani un DLC potrebbe aggiungerne un altro. Una riga per membro si aggiunge senza migrare
// niente; dieci colonne no.
//
// La riga si crea **quando serve**: nessuno la scrive alla creazione della partita. Un membro senza
// riga è un membro di cui non hai ancora segnato niente, e vale zero — che è diverso dall'averlo
// segnato a zero, e si vede: la scheda mostra «non segnato» invece di «livello 0».
//
// `livello_protagonista` resta dov'è e non si tocca: è già usata dalla fusione, e spostarla qui
// vorrebbe dire cambiare quel codice per un guadagno estetico. Il servizio la tiene allineata alla
// riga di Joker, così chi legge l'una o l'altra vede lo stesso numero.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type Database from 'better-sqlite3';

function aggiungiColonna(db: Database.Database, tabella: string, colonna: string, tipo: string): void {
  const gia = (db.prepare(`PRAGMA table_info(${tabella})`).all() as Array<{ name: string }>).some((c) => c.name === colonna);
  if (!gia) db.exec(`ALTER TABLE ${tabella} ADD COLUMN ${colonna} ${tipo}`);
}

export const migration057: Migration = {
  id: 57,
  name: 'denaro_ed_esperienza',
  up(db) {
    aggiungiColonna(db, 'partita', 'yen', 'INTEGER NOT NULL DEFAULT 0');
    db.exec(`
CREATE TABLE IF NOT EXISTS membro_squadra_partita (
  partita_id          INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
  personaggio_chiave  TEXT NOT NULL,
  livello             INTEGER NOT NULL DEFAULT 1,
  esperienza          INTEGER NOT NULL DEFAULT 0,
  updated_at          TEXT NOT NULL,
  PRIMARY KEY (partita_id, personaggio_chiave)
);
`);
  },
};
