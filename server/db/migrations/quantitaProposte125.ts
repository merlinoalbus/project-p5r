import type { AppDatabase } from '../dbService.js';

const PRIMA = "(quantita IS NOT NULL AND quantita > 0) OR ((riga_tipo = 'ricetta' OR (riga_tipo = 'ricompensa' AND substr(riga_chiave,1,8) = 'ricetta/')) AND quantita IS NULL)";
const DOPO = "(quantita IS NOT NULL AND quantita > 0) OR ((riga_tipo IN ('ricetta','voce') OR (riga_tipo = 'ricompensa' AND substr(riga_chiave,1,8) = 'ricetta/')) AND quantita IS NULL)";
const TEMPORANEA = 'proposta_abbinamento_quantita_125';
const quota = (nome: string) => `"${nome.replace(/"/g, '""')}"`;

/** Nella transazione della 125: stessa tabella e stessi dati, solo NULL ammesso anche per le proposte di voce.
 * Le quantità dei legami confermati restano positive. Nessun valore viene inventato o normalizzato.
 */
export function ammettiQuantitaIgnotaVoce125(db: AppDatabase): void {
  const r = db.prepare("SELECT sql FROM main.sqlite_master WHERE type='table' AND name='proposta_abbinamento'").get() as { sql: string } | undefined;
  if (!r) throw new Error('125: tabella delle proposte assente; nessuna ricostruzione possibile.');
  const vecchie = r.sql.split(PRIMA).length - 1;
  const nuove = r.sql.split(DOPO).length - 1;
  if (nuove === 1 && vecchie === 0) return;
  const intestazione = /^CREATE TABLE\s+(?:"proposta_abbinamento"|proposta_abbinamento)\s*\(/i;
  if (vecchie !== 1 || nuove !== 0 || !intestazione.test(r.sql)) {
    throw new Error('125: schema delle proposte non riconosciuto; nessun vincolo o dato modificato.');
  }
  if (db.prepare('SELECT 1 FROM main.sqlite_master WHERE name=?').get(TEMPORANEA)) {
    throw new Error('125: nome della tabella transitoria occupato; dati preservati.');
  }
  const colonne = (db.prepare('PRAGMA main.table_info(proposta_abbinamento)').all() as Array<{ name: string }>).map(c => c.name);
  if (!colonne.length || colonne.some(c => ['rowid', '_rowid_', 'oid'].includes(c.toLowerCase()))) {
    throw new Error('125: identità fisica delle proposte non riconosciuta; dati preservati.');
  }
  const oggetti = db.prepare("SELECT sql FROM main.sqlite_master WHERE tbl_name='proposta_abbinamento' AND type IN ('index','trigger') AND sql IS NOT NULL ORDER BY type,name").all() as Array<{ sql: string }>;
  const campi = ['rowid', ...colonne.map(quota)].join(',');
  const nuovaDdl = r.sql.replace(PRIMA, DOPO).replace(intestazione, `CREATE TABLE ${quota(TEMPORANEA)} (`);
  db.exec(nuovaDdl);
  db.exec(`INSERT INTO main.${quota(TEMPORANEA)} (${campi}) SELECT ${campi} FROM main.proposta_abbinamento`);
  const conteggio = (tabella: string) => (db.prepare(`SELECT COUNT(*) AS n FROM main.${quota(tabella)}`).get() as { n: number }).n;
  const diversa = (da: string, a: string) => db.prepare(`SELECT 1 FROM (
    SELECT ${campi} FROM main.${quota(da)} EXCEPT SELECT ${campi} FROM main.${quota(a)}
  ) LIMIT 1`).get();
  if (conteggio('proposta_abbinamento') !== conteggio(TEMPORANEA)
    || diversa('proposta_abbinamento', TEMPORANEA) || diversa(TEMPORANEA, 'proposta_abbinamento')) {
    throw new Error('125: ricostruzione delle proposte non identica; la transazione deve essere annullata.');
  }
  // Non rinominare prima la vecchia: i riferimenti esterni devono conservare il nome stabile.
  db.exec(`DROP TABLE main.proposta_abbinamento;
    ALTER TABLE main.${quota(TEMPORANEA)} RENAME TO proposta_abbinamento;`);
  for (const oggetto of oggetti) db.exec(oggetto.sql);
}
