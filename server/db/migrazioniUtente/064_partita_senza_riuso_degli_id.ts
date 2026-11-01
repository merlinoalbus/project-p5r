// ============================================================
// Utente 064 — l'id di una partita non si riusa più (L11-04)
// ============================================================
//
// `partita.id` era `INTEGER PRIMARY KEY` senza AUTOINCREMENT. `partiteService.creaPartita` sceglie già un id oltre il massimo delle partite
// e del Cestino, ma un id torna libero quando il suo posto nel Cestino si svuota (o la partita è stata tolta prima del Cestino), e allora:
//   - la partita eliminata e il suo id: una partita nuova con lo stesso id prende il posto di quella che si voleva ripristinare
//     (il ripristino si ferma sulle righe «già presenti»);
//   - l'archivio immutabile `acquisto_legacy_valutazione` non ha una chiave esterna verso la partita (le sue righe non si cancellano mai):
//     una partita nuova con lo stesso id si ritrova accanto le righe d'archivio di quella eliminata.
// Da qui `creaPartita` mette nel massimo anche il contatore di SQLite, che non scende mai.
//
// La tabella si ricostruisce con AUTOINCREMENT (in SQLite è l'unico modo: si dichiara solo in CREATE TABLE), con la procedura di SQLite per
// cambiare una tabella: la tabella nuova con la stessa definizione (presa dallo schema reale, colonne aggiunte dopo comprese, nello stesso
// ordine) e AUTOINCREMENT sull'id, le righe copiate con i loro id, la vecchia tolta, la nuova rinominata, gli indici rifatti. Le chiavi
// esterne delle tabelle figlie citano «partita» per nome e restano collegate: il runner tiene `foreign_keys` spento durante la migrazione
// (niente cascate al DROP) e annulla tutto se alla fine c'è una violazione nuova. Nessuna riga di nessuna tabella delle partite cambia;
// fanno eccezione le tabelle interne di SQLite: `sqlite_sequence` riceve la riga del contatore di `partita`, e le righe di `sqlite_stat1`
// della partita (statistiche dell'ottimizzatore) si tolgono col DROP e si rimettono uguali.
//
// AUTOINCREMENT da solo non basta: il contatore (`sqlite_sequence`) partirebbe dal massimo degli id PRESENTI, e un id più alto già
// eliminato (nel Cestino, o rimasto nelle righe senza chiave esterna) si riuserebbe ancora. Il contatore parte quindi dal più alto id di
// partita che il file conosca: le partite, ogni colonna `partita_id` di ogni tabella (anche quelle senza chiave esterna, come l'archivio
// degli acquisti) e le righe della tabella `partita` nei registri del Cestino. Da lì SQLite non scende mai.
//
// Idempotente: se `partita` ha già AUTOINCREMENT la tabella non si tocca e il contatore si alza solo se serve. Conteggi nel log.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';

/** Il testo di CREATE TABLE della partita come lo scrive SQLite, o null se la tabella non c'è. */
const ddlPartita = (db: AppDatabase): string | null =>
  (db.prepare("SELECT sql FROM utente.sqlite_master WHERE type = 'table' AND name = 'partita'").pluck().get() as string | undefined) ?? null;

/** Le righe della partita, tutte le colonne, in ordine di id: il confronto prima/dopo. */
const righePartita = (db: AppDatabase, tabella: string): string => JSON.stringify(db.prepare(`SELECT * FROM utente.${tabella} ORDER BY id`).raw().all());

/** Il più alto id di partita che il file conosca: partite, ogni colonna `partita_id`, le righe della partita nei registri del Cestino. */
function idPiuAltoConosciuto(db: AppDatabase): number {
  let massimo = 0;
  const alza = (v: unknown): void => { if (typeof v === 'number' && Number.isSafeInteger(v) && v > massimo) massimo = v; };
  alza(db.prepare('SELECT MAX(id) FROM utente.partita').pluck().get());
  const tabelle = db.prepare("SELECT name FROM utente.sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").pluck().all() as string[];
  for (const t of tabelle) {
    const colonne = db.prepare("SELECT name FROM pragma_table_info(?, 'utente')").pluck().all(t) as string[];
    if (colonne.includes('partita_id')) alza(db.prepare(`SELECT MAX(partita_id) FROM utente."${t}" WHERE typeof(partita_id) = 'integer'`).pluck().get());
  }
  if (tabelle.includes('cestino_partite')) {
    alza(db.prepare(`SELECT MAX(CAST(COALESCE(json_extract(p.value, '$.prima.id'), json_extract(p.value, '$.dopo.id')) AS INTEGER))
      FROM utente.cestino_partite c, json_each(c.registro_json) p
      WHERE json_valid(c.registro_json) AND json_extract(p.value, '$.tabella') = 'partita'`).pluck().get());
  }
  // il vecchio cestino del file di gioco (tipo «partita», la chiave è l'id), come lo legge `partiteService.creaPartita`
  if (db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = 'cestino'").get()) {
    alza(db.prepare("SELECT MAX(CAST(chiave AS INTEGER)) FROM main.cestino WHERE tipo = 'partita'").pluck().get());
  }
  return massimo;
}

export const utente064: Migration = {
  id: 64,
  name: 'partita_senza_riuso_degli_id',
  up(db) {
    if (!db.inTransaction) throw new Error('utente 064: manca la transazione della migrazione; nessuna modifica applicata.');
    const ddl = ddlPartita(db);
    if (!ddl) return;
    let ricostruita = false;
    const righe = db.prepare('SELECT COUNT(*) FROM utente.partita').pluck().get() as number;
    if (!/\bAUTOINCREMENT\b/i.test(ddl)) {
      // la definizione reale con il nome nuovo e AUTOINCREMENT sull'id: una sola occorrenza di ciascuna, o non si tocca niente
      const intestazione = /^CREATE TABLE\s+"?partita"?\s*\(/i;
      const chiave = /\bid(\s+)INTEGER(\s+)PRIMARY KEY\b/gi;
      const chiavi = ddl.match(chiave)?.length ?? 0;
      if (!intestazione.test(ddl) || chiavi !== 1) throw new Error('utente 064: la definizione di partita non è quella attesa (CREATE TABLE partita con «id INTEGER PRIMARY KEY»); nessuna modifica applicata.');
      const nuova = ddl.replace(intestazione, 'CREATE TABLE utente.partita_064 (').replace(chiave, 'id$1INTEGER$2PRIMARY KEY AUTOINCREMENT');
      const indici = db.prepare("SELECT sql FROM utente.sqlite_master WHERE type = 'index' AND tbl_name = 'partita' AND sql IS NOT NULL").pluck().all() as string[];
      const inneschi = db.prepare("SELECT sql FROM utente.sqlite_master WHERE type = 'trigger' AND tbl_name = 'partita'").pluck().all() as string[];
      const colonne = (db.prepare("SELECT name FROM pragma_table_info('partita', 'utente')").pluck().all() as string[]).map((c) => `"${c}"`).join(', ');
      const prima = righePartita(db, 'partita');
      // le statistiche dell'ottimizzatore (`PRAGMA optimize`) della tabella e dei suoi indici se ne andrebbero con il DROP: si rimettono uguali
      const conStatistiche = !!db.prepare("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name = 'sqlite_stat1'").get();
      const statistiche = conStatistiche ? db.prepare("SELECT tbl, idx, stat FROM utente.sqlite_stat1 WHERE tbl = 'partita'").all() as Array<{ tbl: string; idx: string | null; stat: string }> : [];
      db.exec(nuova);
      db.exec(`INSERT INTO utente.partita_064 (${colonne}) SELECT ${colonne} FROM utente.partita ORDER BY id`);
      if (righePartita(db, 'partita_064') !== prima) throw new Error('utente 064: le partite copiate non coincidono con quelle di prima; nessuna modifica applicata.');
      db.exec('DROP TABLE utente.partita');
      db.exec('ALTER TABLE utente.partita_064 RENAME TO partita');
      // gli indici e gli inneschi se ne vanno con la tabella tolta: si rifanno uguali, nello schema delle partite
      for (const sql of [...indici, ...inneschi]) db.exec(sql.replace(/^CREATE\s+(UNIQUE\s+)?(INDEX|TRIGGER)\s+(IF NOT EXISTS\s+)?/i, (m) => `${m}utente.`));
      if (statistiche.length) {
        db.prepare("DELETE FROM utente.sqlite_stat1 WHERE tbl = 'partita'").run();
        const rimetti = db.prepare('INSERT INTO utente.sqlite_stat1 (tbl, idx, stat) VALUES (?, ?, ?)');
        for (const s of statistiche) rimetti.run(s.tbl, s.idx, s.stat);
      }
      if (righePartita(db, 'partita') !== prima) throw new Error('utente 064: le partite dopo la ricostruzione non coincidono con quelle di prima; nessuna modifica applicata.');
      ricostruita = true;
    }
    // il contatore parte dal più alto id conosciuto (anche di partite eliminate): da lì SQLite non riusa più un id
    const alto = idPiuAltoConosciuto(db);
    const contatore = db.prepare("SELECT seq FROM utente.sqlite_sequence WHERE name = 'partita'").pluck().get() as number | undefined;
    if (contatore === undefined) db.prepare("INSERT INTO utente.sqlite_sequence (name, seq) VALUES ('partita', ?)").run(alto);
    else if (contatore < alto) db.prepare("UPDATE utente.sqlite_sequence SET seq = ? WHERE name = 'partita'").run(alto);
    const dopo = db.prepare("SELECT seq FROM utente.sqlite_sequence WHERE name = 'partita'").pluck().get() as number;
    logger.info({ migrazione: 'utente 064', partite: righe, ricostruita, idPiuAltoConosciuto: alto, contatore: dopo }, 'partita con AUTOINCREMENT: gli id non si riusano');
  },
};
