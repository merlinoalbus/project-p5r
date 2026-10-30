// ============================================================
// Utente 057 — il piazzamento agli esami accoglie «sopra la media» (L13, ondata 7, O7-2)
// ============================================================
//
// Istruzione dell'utente: «completa il lavoro rimasto fermo... le ondate mancanti e tutto quanto non ancora gestito rispetto all'obiettivo».
// La guida (https://www.allgamestaff.it/persona-5-royal/interrogazioni-esami-risposte/) premia tre piazzamenti: i primi 10 con Fascino +3,
// «sopra la media» con Fascino +2, e «una prestazione insufficiente non comporta alcun bonus». Il piazzamento della partita
// (`utente.esame_piazzamento_partita`, utente 040) conosceva solo 'primo', 'primi-10' e 'altro': la spunta della voce dei risultati
// (effetto «esame», gioco 311) deve poter segnare anche 'sopra-media' (nessun moltiplicatore sui Confidenti, come 'altro').
//
// Il vincolo CHECK non si può allargare in SQLite: la tabella si ricostruisce con le stesse colonne, la stessa chiave e le stesse righe, poi
// si controllano conteggio e contenuto (impronta di tutte le righe, prima e dopo). Nessun valore cambia. Append-only, dentro la transazione
// della migrazione; una tabella che ha già il vincolo nuovo non si tocca (idempotente). Audit in
// `main.dati_guida.audit-utente-057-sopra-la-media` quando il file di gioco è attaccato.
// ============================================================

import type { Migration } from '../migrationRunner.js';

const AUDIT = 'audit-utente-057-sopra-la-media';
const errore = (motivo: string): never => { throw new Error(`utente 057: ${motivo}; nessuna modifica applicata.`); };

/** Tutte le righe della tabella, in ordine di chiave, come testo: prima e dopo la ricostruzione devono coincidere. */
const righe = (db: Parameters<Migration['up']>[0], tabella: string): string =>
  JSON.stringify(db.prepare(`SELECT partita_id, esame_chiave, piazzamento, updated_at FROM utente.${tabella} ORDER BY partita_id, esame_chiave`).all());

export const utente057: Migration = {
  id: 57,
  name: 'piazzamento_sopra_la_media',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    const sql = db.prepare("SELECT sql FROM utente.sqlite_master WHERE type = 'table' AND name = 'esame_piazzamento_partita'").pluck().get() as string | undefined;
    // la 040 la crea sempre; se il vincolo accoglie già il nuovo piazzamento non c'è niente da fare
    if (!sql || sql.includes('sopra-media')) return;
    if (db.prepare("SELECT 1 FROM utente.sqlite_master WHERE name = 'esame_piazzamento_partita_057'").get()) errore('nome temporaneo già occupato');
    const prima = righe(db, 'esame_piazzamento_partita');
    const quante = db.prepare('SELECT COUNT(*) FROM utente.esame_piazzamento_partita').pluck().get() as number;
    db.exec(`CREATE TABLE utente.esame_piazzamento_partita_057 (
      partita_id   INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
      esame_chiave TEXT NOT NULL,
      piazzamento  TEXT NOT NULL CHECK (piazzamento IN ('primo', 'primi-10', 'sopra-media', 'altro')),
      updated_at   TEXT NOT NULL,
      PRIMARY KEY (partita_id, esame_chiave)
    )`);
    db.exec(`INSERT INTO utente.esame_piazzamento_partita_057 (partita_id, esame_chiave, piazzamento, updated_at)
      SELECT partita_id, esame_chiave, piazzamento, updated_at FROM utente.esame_piazzamento_partita`);
    db.exec('DROP TABLE utente.esame_piazzamento_partita');
    db.exec('ALTER TABLE utente.esame_piazzamento_partita_057 RENAME TO esame_piazzamento_partita');
    if (righe(db, 'esame_piazzamento_partita') !== prima) errore('le righe del piazzamento sono cambiate nella ricostruzione');
    if (db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = 'dati_guida'").get()) {
      db.prepare('INSERT OR IGNORE INTO main.dati_guida (chiave, json) VALUES (?, ?)')
        .run(AUDIT, JSON.stringify({ data: '2026-10-31', richiesta: 'il piazzamento «sopra la media» degli esami (Fascino +2 della guida), scelto alla spunta della voce dei risultati', tabella: 'utente.esame_piazzamento_partita', righe: quante }));
    }
  },
};
