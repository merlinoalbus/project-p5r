// ============================================================
// genera-pacchetto — porta `pacchetto/gioco.db` alla versione del codice (e, la prima volta, lo crea dal seed)
// ============================================================
//
//   npm run pacchetto            aggiorna il pacchetto: migrazioni alla versione corrente, VACUUM
//   npm run pacchetto -- --da-istanza   sostituisce il pacchetto con i dati di gioco dell'istanza (DATA_DIR/gioco.db)
//
// Scrive lo stesso file in due posti: `pacchetto/completo/gioco.db` (con le immagini dentro, ~311 MB, FUORI da
// git: si importa dall'app) e `pacchetto/gioco.db` (senza il contenuto delle immagini, pochi MB, in git: è ciò
// che il primo avvio copia per aprire l'interfaccia, e ciò che i test caricano).
//
// Il pacchetto è il file che ogni nuova installazione copia al primo avvio; dalla migrazione 079
// porta dentro anche le immagini (mappe, Confidenti, sfondi…), quindi è un solo file. Quando una
// migrazione cambia i dati (orari strutturati, condizioni…), il pacchetto va rigenerato e
// committato: un file di gioco nuovo non deve dipendere dal vecchio seed. Con `--da-istanza` il
// pacchetto diventa una copia dei dati di gioco dell'istanza locale (senza partite: stanno in un
// altro file), che è il modo in cui le correzioni fatte nell'app diventano dato predefinito. È una fotografia: quello
// che l'istanza ha tolto resta tolto e quello che ha aggiunto resta aggiunto (decisione dell'utente,
// 2026-09-12); nessuna sincronizzazione con la guida ricrea spilli o mappe.
// ============================================================

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { config } from '../server/config.js';
import { closeDb, copiaSchema, initDb, resolveDbPath } from '../server/db/dbService.js';
import { runMigrations } from '../server/db/migrationRunner.js';
import { percorsoPacchettoCompleto, percorsoPacchettoDb, regoleAllAvvio } from '../server/services/pacchetto/pacchettoGioco.js';

const daIstanza = process.argv.includes('--da-istanza');
const destinazione = percorsoPacchettoCompleto();
const destinazioneIniziale = percorsoPacchettoDb();
const lavoro = fs.mkdtempSync(path.join(os.tmpdir(), 'p5r-pacchetto-'));
const provvisorio = path.join(lavoro, 'gioco.db');

if (daIstanza) {
  const sorgente = resolveDbPath();
  // il vecchio file unico viene rinominato da initDb: basta che esista uno dei due
  if (!fs.existsSync(sorgente) && !fs.existsSync(path.join(config.dataDir, config.dbFileNameLegacy))) throw new Error(`Nessuna istanza in ${sorgente}.`);
  const db = initDb(sorgente);
  runMigrations(db);
  await copiaSchema(db, provvisorio, 'main');
  closeDb();
} else {
  // si parte dal completo se c'è, altrimenti dall'iniziale (le immagini arriveranno dalla migrazione 079 o dall'istanza)
  const sorgente = fs.existsSync(destinazione) ? destinazione : destinazioneIniziale;
  if (!fs.existsSync(sorgente)) throw new Error(`Il pacchetto manca (${destinazione} o ${destinazioneIniziale}): usa --da-istanza per crearlo dai dati di gioco dell'istanza.`);
  fs.copyFileSync(sorgente, provvisorio);
}

// migrazioni alla versione corrente su una copia, con un file delle partite usa e getta accanto
const db = initDb(provvisorio);
runMigrations(db);
// le stesse regole sui dati dell'avvio: il pacchetto nasce già a posto, e un'istanza nuova non cambia nulla al primo avvio
console.log('regole applicate:', JSON.stringify(regoleAllAvvio(db)));
const versione = db.pragma('main.user_version', { simple: true }) as number;
const tabelle = (db.prepare("SELECT COUNT(*) AS n FROM main.sqlite_master WHERE type = 'table'").get() as { n: number }).n;
const partite = (db.prepare("SELECT COUNT(*) AS n FROM main.sqlite_master WHERE type = 'table' AND name = 'partita'").get() as { n: number }).n;
if (partite > 0) throw new Error('Il file di gioco contiene ancora la tabella partita: la migrazione 066 non è stata applicata.');
const immagini = db.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(byte), 0) AS byte FROM immagine WHERE contenuto IS NOT NULL').get() as { n: number; byte: number };
closeDb();

const compatto = new Database(provvisorio);
compatto.exec(`VACUUM INTO '${path.join(lavoro, 'gioco.compatto.db').replace(/'/g, "''")}'`);
compatto.close();
fs.mkdirSync(path.dirname(destinazione), { recursive: true });
fs.copyFileSync(path.join(lavoro, 'gioco.compatto.db'), destinazione);
// l'iniziale: lo stesso file senza il contenuto delle immagini (restano le righe: l'app sa che cosa manca)
const iniziale = new Database(provvisorio);
iniziale.exec('UPDATE immagine SET contenuto = NULL');
iniziale.exec(`VACUUM INTO '${path.join(lavoro, 'gioco.iniziale.db').replace(/'/g, "''")}'`);
iniziale.close();
fs.copyFileSync(path.join(lavoro, 'gioco.iniziale.db'), destinazioneIniziale);
fs.rmSync(lavoro, { recursive: true, force: true });
console.log(`Pacchetto completo scritto in ${destinazione}: schema ${versione}, ${tabelle} tabelle, ${(fs.statSync(destinazione).size / 1024 / 1024).toFixed(2)} MB, immagini dentro ${immagini.n} (${(immagini.byte / 1024 / 1024).toFixed(1)} MB). Iniziale (senza immagini) in ${destinazioneIniziale}: ${(fs.statSync(destinazioneIniziale).size / 1024 / 1024).toFixed(2)} MB.`);
