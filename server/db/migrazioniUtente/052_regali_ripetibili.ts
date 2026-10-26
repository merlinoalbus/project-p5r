// ============================================================
// Utente 052 — il regalo si può ridare e consuma una copia; la Cartolina spedita (ondata 5, lotto D2; decisione 21 dell'utente)
// ============================================================
//
// Decisione 21 (c) dell'utente (26/10/2026): «regalo ripetibile con consumo di copie e oggetti dei set posseduti». Fino a qui
// `regalo_partita` aveva per chiave (partita, Confidente, nome del regalo): lo stesso oggetto si poteva consegnare una volta sola allo stesso
// Confidente (D2 del censimento), e nessuna consegna diceva se aveva usato una copia posseduta (D3). Nel gioco l'oggetto si consuma e si
// può ridare.
//
// La tabella si ricostruisce con le stesse righe (nessuna si perde né cambia valore) e:
//   - `id` (chiave): ogni consegna è una riga, anche la seconda dello stesso oggetto allo stesso Confidente;
//   - `copia_consumata` (0/1): la consegna ha usato una copia posseduta (comprata, ricevuta o di un set). Le consegne di prima che avevano
//     segnato anche l'acquisto (`acquisto_articolo`) avevano usato la copia comprata per loro: 1; le altre 0 (non si data niente alla cieca);
//   - `registro_id`: la riga del registro degli acquisti (utente 051) che la consegna ha creato segnando l'acquisto, per toglierla esatta
//     annullando il regalo; null per le consegne di prima;
//   - `modo`: «consegna» (a un ritrovo) o «cartolina» (spedita dalla cassetta di Yongen-Jaya, guida dei regali): la sfida «Benefattore» conta
//     solo le consegne. Le righe di prima sono consegne;
//   - `causa_yen`: la causa del movimento automatico degli yen di questa consegna (decisione 18). Per le righe di prima è quella di sempre,
//     «Confidente:nome storico»; null vale quella (una riga rimessa dal Cestino senza la colonna). Le consegne nuove ne hanno una propria con
//     il loro `id`, così due regali dello stesso oggetto non si restituiscono a vicenda.
// Append-only e idempotente: se la tabella ha già `id` non si tocca. Le righe si contano prima e dopo: un conto diverso annulla tutto.
// Audit in `main.dati_guida.audit-utente-052-regali` quando il file di gioco è attaccato.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';

const AUDIT = 'audit-utente-052-regali';

const tabella = (db: AppDatabase, schema: 'main' | 'utente', nome: string): boolean =>
  !!db.prepare(`SELECT 1 FROM ${schema}.sqlite_master WHERE type = 'table' AND name = ?`).get(nome);

const COLONNE_DI_PRIMA = ['partita_id', 'confidente_chiave', 'regalo', 'fatto_at', 'catalogo_chiave', 'punti_dati', 'rango_al_regalo', 'acquisto_articolo', 'data_gioco', 'fascia_gioco'] as const;

export const utente052: Migration = {
  id: 52,
  name: 'regali_ripetibili',
  up(db) {
    if (!db.inTransaction) throw new Error('utente 052: manca la transazione della migrazione; nessuna modifica applicata.');
    if (!tabella(db, 'utente', 'regalo_partita')) return;
    const colonne = (db.prepare("SELECT name FROM pragma_table_info('regalo_partita', 'utente')").pluck().all() as string[]);
    if (colonne.includes('id')) return;
    const mancanti = COLONNE_DI_PRIMA.filter((c) => !colonne.includes(c));
    if (mancanti.length) throw new Error(`utente 052: a regalo_partita mancano le colonne ${mancanti.join(', ')}; nessuna modifica applicata.`);
    const prima = db.prepare('SELECT COUNT(*) FROM utente.regalo_partita').pluck().get() as number;
    db.exec(`CREATE TABLE utente.regalo_partita_052 (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      partita_id        INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
      confidente_chiave TEXT NOT NULL,
      regalo            TEXT NOT NULL,
      fatto_at          TEXT NOT NULL,
      catalogo_chiave   TEXT,
      punti_dati        REAL,
      rango_al_regalo   INTEGER,
      acquisto_articolo TEXT,
      data_gioco        TEXT,
      fascia_gioco      TEXT,
      registro_id       INTEGER,
      copia_consumata   INTEGER NOT NULL DEFAULT 0 CHECK (copia_consumata IN (0, 1)),
      modo              TEXT NOT NULL DEFAULT 'consegna' CHECK (modo IN ('consegna', 'cartolina')),
      causa_yen         TEXT CHECK (causa_yen IS NULL OR length(causa_yen) BETWEEN 1 AND 800)
    )`);
    const elenco = COLONNE_DI_PRIMA.join(', ');
    db.exec(`INSERT INTO utente.regalo_partita_052 (${elenco}, copia_consumata, modo, causa_yen)
      SELECT ${elenco}, CASE WHEN acquisto_articolo IS NOT NULL THEN 1 ELSE 0 END, 'consegna', confidente_chiave || ':' || regalo
      FROM utente.regalo_partita ORDER BY fatto_at, rowid`);
    const dopo = db.prepare('SELECT COUNT(*) FROM utente.regalo_partita_052').pluck().get() as number;
    if (dopo !== prima) throw new Error(`utente 052: ${dopo} consegne copiate su ${prima}; nessuna modifica applicata.`);
    db.exec('DROP TABLE utente.regalo_partita');
    db.exec('ALTER TABLE utente.regalo_partita_052 RENAME TO regalo_partita');
    db.exec('CREATE INDEX IF NOT EXISTS utente.regalo_partita_confidente ON regalo_partita (partita_id, confidente_chiave)');
    db.exec('CREATE INDEX IF NOT EXISTS utente.regalo_partita_catalogo ON regalo_partita (partita_id, catalogo_chiave)');
    if (tabella(db, 'main', 'dati_guida')) {
      const esecuzione = {
        il: new Date().toISOString(), consegne: dopo,
        conCopiaConsumata: db.prepare('SELECT COUNT(*) FROM utente.regalo_partita WHERE copia_consumata = 1').pluck().get() as number,
        partite: db.prepare('SELECT COUNT(DISTINCT partita_id) FROM utente.regalo_partita').pluck().get() as number,
      };
      const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(AUDIT) as string | undefined;
      const esecuzioni = vecchio ? (JSON.parse(vecchio) as { esecuzioni?: unknown[] }).esecuzioni ?? [] : [];
      db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
        .run(AUDIT, JSON.stringify({ migrazione: 'utente-052', decisione: 'L13-21', esecuzioni: [...esecuzioni, esecuzione] }));
    }
  },
};
