// ============================================================
// Utente 053 — il trofeo e gli oggetti dati da un turno con il suo esito (Ondata 5, Lotto G; decisione 21 dell'utente)
// ============================================================
//
// Decisione 21 (26 ottobre): «lotteria con esito "vinto/non vinto" alla spunta e trofeo, yen della vincita a mano»; «Non sono d'accordo nel
// rimandare attività a fasi successive»; progetto dell'ondata 5, §7: «estendere gli esiti con un trofeo e con premi come oggetti per chiave
// con quantità; serve anche ai distintivi della Big Bang Burger». Un esito dell'attività può dire il trofeo che fa ottenere e gli oggetti del
// catalogo che dà (`shared/esitiAttivita.ts`, campi `trofeo` e `oggetti`); registrando il turno con quell'esito il trofeo si segna e gli
// oggetti entrano fra quelli ottenuti, togliendo il turno tornano com'erano. Due tabelle, una riga per turno:
//   - `trofeo_esito_turno`: il «prima» del trofeo (`server/services/trofeiDegliEsitiService.ts`): `gia` = 1 il trofeo c'era già (togliendo il
//     turno resta), 0 l'ha segnato il turno, con l'evento dello storico che ha scritto (`evento_id`);
//   - `oggetto_esito_turno`: gli oggetti ricevuti dal turno (`server/services/oggettiDegliEsitiService.ts`), una riga per oggetto con le copie
//     e l'esito che li ha dati; le copie si sommano leggendo, con quelle delle voci e delle Richieste (`oggettiOttenutiService`, `copieOggetti`).
//
// Solo lo schema, vuoto: nessun turno di prima aveva un esito con trofeo o con oggetti (nascono con le gioco 280 e 283), e i turni già
// registrati non si riscrivono (nessun oggetto si aggiunge da solo a una partita salvata). Nessun'altra tabella cambia. Append-only e
// idempotente (IF NOT EXISTS). Audit in `main.dati_guida.audit-utente-053-premi-esiti`.
// ============================================================

import type { Migration } from '../migrationRunner.js';

const AUDIT = 'audit-utente-053-premi-esiti';

const esiste = (db: Parameters<Migration['up']>[0], nome: string): boolean => !!db.prepare("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name = ?").get(nome);

export const utente053: Migration = {
  id: 53,
  name: 'premi_degli_esiti',
  up(db) {
    if (!db.inTransaction) throw new Error('utente 053: manca la transazione della migrazione; nessuna modifica applicata.');
    const trofeiPrima = esiste(db, 'trofeo_esito_turno'), oggettiPrima = esiste(db, 'oggetto_esito_turno');
    db.exec(`CREATE TABLE IF NOT EXISTS utente.trofeo_esito_turno (
      partita_id      INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
      attivita_chiave TEXT NOT NULL CHECK (length(attivita_chiave) BETWEEN 1 AND 200),
      ordine          INTEGER NOT NULL CHECK (ordine >= 1),
      trofeo_chiave   TEXT NOT NULL CHECK (length(trofeo_chiave) BETWEEN 1 AND 100),
      gia             INTEGER NOT NULL CHECK (gia IN (0, 1)),
      evento_id       INTEGER,
      creato_il       TEXT NOT NULL,
      PRIMARY KEY (partita_id, attivita_chiave, ordine)
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS utente.trofeo_esito_turno_trofeo ON trofeo_esito_turno (partita_id, trofeo_chiave)');
    db.exec(`CREATE TABLE IF NOT EXISTS utente.oggetto_esito_turno (
      partita_id      INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
      attivita_chiave TEXT NOT NULL CHECK (length(attivita_chiave) BETWEEN 1 AND 200),
      ordine          INTEGER NOT NULL CHECK (ordine >= 1),
      catalogo_chiave TEXT NOT NULL CHECK (length(catalogo_chiave) BETWEEN 1 AND 120),
      quantita        INTEGER NOT NULL CHECK (quantita BETWEEN 1 AND 999),
      esito_chiave    TEXT NOT NULL CHECK (length(esito_chiave) BETWEEN 1 AND 60),
      creato_il       TEXT NOT NULL,
      PRIMARY KEY (partita_id, attivita_chiave, ordine, catalogo_chiave)
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS utente.oggetto_esito_turno_catalogo ON oggetto_esito_turno (partita_id, catalogo_chiave)');
    if (db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = 'dati_guida'").get()) {
      db.prepare('INSERT OR IGNORE INTO main.dati_guida (chiave, json) VALUES (?, ?)')
        .run(AUDIT, JSON.stringify({ data: '2026-10-26', tabelle: { 'utente.trofeo_esito_turno': { creata: !trofeiPrima }, 'utente.oggetto_esito_turno': { creata: !oggettiPrima } }, righe: 0 }));
    }
  },
};
