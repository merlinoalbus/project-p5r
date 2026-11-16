// ============================================================
// partiteVuote — il file delle partite di un'istanza nuova nasce dal modello `pacchetto/partite-vuoto.db`
// ============================================================
//
// `pacchetto/partite-vuoto.db` è un file fisso del repository: la struttura delle partite alla versione che il codice legge
// (`VERSIONE_PARTITE`), senza partite, con le sole righe iniziali (il marcatore dell'archivio storico degli acquisti e l'istante da
// cui gli yen si muovono da soli). Quando lo schema `utente` della connessione non ha tabelle (primo avvio, `partite.db` tolto,
// database in memoria dei test) la sua struttura si riproduce da lì: tabelle, indici e trigger con lo stesso testo di creazione,
// righe iniziali, versione. Un file delle partite che ha già le sue tabelle non si tocca mai.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import type Database from 'better-sqlite3';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { VERSIONE_PARTITE } from './versioneSchema.js';

/** Il nome del modello dentro la cartella del pacchetto. */
export const FILE_MODELLO_PARTITE = 'partite-vuoto.db';

/** Il nome con cui il modello si attacca alla connessione per il tempo della copia. */
const ALIAS_MODELLO = 'modello_partite';

/** Il percorso del modello del file delle partite (`PACCHETTO_DIR/partite-vuoto.db`). */
export function percorsoModelloPartite(): string {
  return path.join(config.pacchettoDir, FILE_MODELLO_PARTITE);
}

/** Un oggetto di `sqlite_master` con il suo testo di creazione. */
interface OggettoSchema { type: string; name: string; sql: string }

/** Un nome fra virgolette doppie, con le virgolette interne raddoppiate. */
const virgolette = (nome: string): string => `"${nome.replaceAll('"', '""')}"`;

/**
 * Il testo di creazione di un oggetto del modello, con il nome qualificato dallo schema `utente`.
 *
 * In `sqlite_master` il testo è senza schema («CREATE TABLE partita (…)», «CREATE TABLE "partita" (…)»): eseguito così com'è
 * creerebbe l'oggetto in `main`. Lo schema si inserisce subito prima del nome, lasciando il resto del testo identico carattere per
 * carattere (l'impronta dello schema si calcola su quel testo). Il nome può essere nudo o fra virgolette doppie, parentesi quadre,
 * accenti gravi o apici, e può seguire un `IF NOT EXISTS`. Un testo che non comincia così non si indovina: errore.
 */
function qualificaConUtente(oggetto: OggettoSchema): string {
  const inizio = /^\s*CREATE\s+(?:UNIQUE\s+)?(?:TABLE|INDEX|TRIGGER|VIEW)\s+(?:IF\s+NOT\s+EXISTS\s+)?/i.exec(oggetto.sql);
  const resto = inizio ? oggetto.sql.slice(inizio[0].length) : '';
  const traDelimitatori = [virgolette(oggetto.name), `[${oggetto.name}]`, `\`${oggetto.name.replaceAll('`', '``')}\``, `'${oggetto.name.replaceAll("'", "''")}'`];
  // il nome nudo deve finire lì: «partita» non è l'inizio di «partita_x»
  const nudo = resto.startsWith(oggetto.name) && !/^[\p{L}\p{N}_$]/u.test(resto.slice(oggetto.name.length));
  if (!inizio || !(nudo || traDelimitatori.some((forma) => resto.startsWith(forma)))) {
    throw new Error(`Il modello del file delle partite ha un oggetto con un testo di creazione non riconosciuto (${oggetto.type} «${oggetto.name}»): la struttura non si può riprodurre.`);
  }
  return `${inizio[0]}utente.${resto}`;
}

/** Vero se lo schema `utente` della connessione non ha nessuna tabella (escluse quelle interne di SQLite). */
export function partiteSenzaTabelle(db: Database.Database): boolean {
  return !db.prepare("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' LIMIT 1").get();
}

/**
 * Se lo schema `utente` della connessione non ha tabelle, lo crea dal modello: tabelle con le righe iniziali, poi indici, trigger e
 * viste, la versione del modello in `utente.user_version` e l'istante attuale come inizio degli yen automatici. Vale per un file su
 * disco e per `:memory:`. Tutto in una transazione, con le chiavi esterne spente attorno: o lo schema nasce intero o non nasce.
 * Restituisce vero se ha creato lo schema, falso se le tabelle c'erano già (e allora non tocca niente).
 *
 * Lancia se il modello manca o se un suo oggetto non si può riprodurre.
 */
export function creaPartiteDalModelloSeMancano(db: Database.Database, modello: string = percorsoModelloPartite()): boolean {
  if (!partiteSenzaTabelle(db)) return false;
  if (!fs.existsSync(modello)) {
    throw new Error(`Il modello del file delle partite manca (${modello}): senza non si può creare ${config.partiteFileName}. Il file fa parte del repository (cartella del pacchetto, PACCHETTO_DIR).`);
  }
  db.prepare(`ATTACH DATABASE ? AS ${ALIAS_MODELLO}`).run(modello);
  let versione = 0;
  let tabelle = 0;
  try {
    db.pragma('foreign_keys = OFF');
    db.transaction(() => {
      versione = db.pragma(`${ALIAS_MODELLO}.user_version`, { simple: true }) as number;
      // un modello di un'altra versione non deve diventare il file delle partite: l'errore dice che è il modello a non andare
      if (versione !== VERSIONE_PARTITE) {
        throw new Error(`Il modello del file delle partite (${modello}) è alla versione ${versione}, questa versione dell'app vuole la ${VERSIONE_PARTITE}: il modello nel pacchetto va rigenerato insieme alla struttura.`);
      }
      const oggetti = db.prepare(`SELECT type, name, sql FROM ${ALIAS_MODELLO}.sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%'
        ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 ELSE 2 END, rowid`).all() as OggettoSchema[];
      const tabelleDelModello = oggetti.filter((o) => o.type === 'table');
      // prima le tabelle e le loro righe, poi indici, trigger e viste: i trigger che vietano le modifiche non vedono la copia
      for (const t of tabelleDelModello) {
        db.exec(qualificaConUtente(t));
        const colonne = (db.prepare(`SELECT name FROM pragma_table_info(?, '${ALIAS_MODELLO}')`).all(t.name) as Array<{ name: string }>).map((c) => virgolette(c.name)).join(', ');
        db.prepare(`INSERT INTO utente.${virgolette(t.name)} (${colonne}) SELECT ${colonne} FROM ${ALIAS_MODELLO}.${virgolette(t.name)}`).run();
      }
      tabelle = tabelleDelModello.length;
      // i contatori delle chiavi automatiche del modello (la tabella nasce da sé con la prima tabella AUTOINCREMENT)
      const sequenze = (nomeSchema: string): boolean => !!db.prepare(`SELECT 1 FROM ${nomeSchema}.sqlite_master WHERE name = 'sqlite_sequence'`).get();
      if (sequenze(ALIAS_MODELLO) && sequenze('utente')) {
        db.prepare('DELETE FROM utente.sqlite_sequence').run();
        db.prepare(`INSERT INTO utente.sqlite_sequence (name, seq) SELECT name, seq FROM ${ALIAS_MODELLO}.sqlite_sequence`).run();
      }
      // gli yen si muovono da soli da quando questo file esiste, non da quando è stato fatto il modello
      if (tabelleDelModello.some((t) => t.name === 'yen_automatico_inizio')) {
        db.prepare('UPDATE utente.yen_automatico_inizio SET dal = ? WHERE id = 1').run(new Date().toISOString());
      }
      for (const o of oggetti) if (o.type !== 'table') db.exec(qualificaConUtente(o));
      db.pragma(`utente.user_version = ${versione}`);
    })();
  } finally {
    db.pragma('foreign_keys = ON');
    db.prepare(`DETACH DATABASE ${ALIAS_MODELLO}`).run();
  }
  // Normale al primo avvio; su un'istanza già usata vuol dire che `partite.db` è sparito e quello nuovo nasce vuoto: nel log deve vedersi.
  logger.warn({ versione, tabelle }, `${config.partiteFileName} senza tabelle: struttura creata dal modello`);
  return true;
}
