// ============================================================
// Utente 045 — il proprietario delle partite (L12 · passi 2-3 del progetto delle due istanze, §4)
// ============================================================
//
// Nell'istanza pubblica di rilascio ogni utente riconosciuto da Cloudflare Access vede e modifica solo le SUE partite. Questa è l'ultima
// migrazione dello schema delle partite prima del congelamento: dopo il rilascio non ne esistono altre (la pubblica non ha il runner).
//
// Che cosa fa (idempotente, solo schema «utente», niente dati di gioco):
//   1. `partita.proprietario TEXT NOT NULL DEFAULT 'proprietario-unico'`: le partite di oggi (e quelle create in preparazione, dove
//      l'identità non è verificata) hanno il proprietario unico; in rilascio vale il `sub` del token di Cloudflare Access.
//   2. `partita.proprietario_email TEXT`: l'email del token alla creazione (solo per riconoscere a chi appartiene una partita
//      durante un'assistenza; non entra in nessuna risposta dell'API). Nulla con il proprietario unico.
//   3. L'indice unico «una sola partita attiva» passa da GLOBALE (`idx_partita_attiva ON partita(attiva) WHERE attiva = 1`) a PER
//      PROPRIETARIO (`idx_partita_attiva_proprietario ON partita(proprietario) WHERE attiva = 1`): ogni utente ha la sua attiva.
//      Con un solo proprietario (preparazione) l'indice nuovo vincola esattamente come il vecchio.
//   4. `cestino_partite.proprietario` (stesso predefinito): il cestino personale (partite eliminate, fonti di acquisto, pesca, scorta)
//      è di chi ha eliminato; senza questa colonna una partita eliminata non avrebbe più un padre da cui risalire al proprietario.
//
// GUARDIA: se ci fossero due partite attive (impossibile col vecchio indice unico, ma un file ripristinato a mano potrebbe averle) la
// creazione dell'indice per proprietario fallirebbe e la migrazione si annulla per intero: nessuna partita viene toccata in silenzio.
// Le righe esistenti ricevono il predefinito: nessuna partita cambia contenuto né visibilità nella preparazione.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

/** Le colonne di una tabella dello schema «utente». */
function colonneDi(db: Parameters<Migration['up']>[0], tabella: string): Set<string> {
  return new Set((db.prepare(`PRAGMA utente.table_info(${tabella})`).all() as Array<{ name: string }>).map((c) => c.name));
}

export const utente045: Migration = {
  id: 45,
  name: 'proprietario_delle_partite',
  up(db) {
    if (!db.inTransaction) throw new Error('utente 045: manca la transazione della migrazione; nessuna modifica applicata.');

    const partita = colonneDi(db, 'partita');
    if (!partita.has('proprietario')) db.exec("ALTER TABLE utente.partita ADD COLUMN proprietario TEXT NOT NULL DEFAULT 'proprietario-unico'");
    if (!partita.has('proprietario_email')) db.exec('ALTER TABLE utente.partita ADD COLUMN proprietario_email TEXT');

    // L'indice globale lascia il posto a quello per proprietario. Il nuovo si crea PRIMA di togliere il vecchio: se la creazione
    // fallisce (due attive dello stesso proprietario) l'intera migrazione si annulla e il vecchio indice resta.
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS utente.idx_partita_attiva_proprietario ON partita(proprietario) WHERE attiva = 1');
    db.exec('DROP INDEX IF EXISTS utente.idx_partita_attiva');

    // Il cestino personale: la colonna esiste solo se la tabella è quella della 021+ (sempre, a questo punto della sequenza).
    const cestino = colonneDi(db, 'cestino_partite');
    if (cestino.size > 0 && !cestino.has('proprietario')) {
      db.exec("ALTER TABLE utente.cestino_partite ADD COLUMN proprietario TEXT NOT NULL DEFAULT 'proprietario-unico'");
    }

    // Verifica finale: le due colonne e l'indice nuovo ci sono, quello vecchio no.
    const dopo = colonneDi(db, 'partita');
    if (!dopo.has('proprietario') || !dopo.has('proprietario_email')) throw new Error('utente 045: le colonne del proprietario non esistono; nessuna modifica applicata.');
    if (!db.prepare("SELECT 1 FROM utente.sqlite_master WHERE type = 'index' AND name = 'idx_partita_attiva_proprietario'").get()) {
      throw new Error('utente 045: l\'indice della partita attiva per proprietario non esiste; nessuna modifica applicata.');
    }
    if (db.prepare("SELECT 1 FROM utente.sqlite_master WHERE type = 'index' AND name = 'idx_partita_attiva'").get()) {
      throw new Error('utente 045: l\'indice globale della partita attiva esiste ancora; nessuna modifica applicata.');
    }
    logger.info({ migrazione: 'utente-045' }, 'proprietario delle partite aggiunto (predefinito: proprietario-unico)');
  },
};
