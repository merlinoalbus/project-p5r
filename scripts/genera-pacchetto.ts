// ============================================================
// genera-pacchetto — porta `pacchetto/gioco.db` alla versione del codice (e, la prima volta, lo crea dal seed)
// ============================================================
//
//   npm run pacchetto            aggiorna il pacchetto: migrazioni alla versione corrente, VACUUM
//   npm run pacchetto -- --da-istanza   sostituisce il pacchetto con i dati di gioco dell'istanza (DATA_DIR/gioco.db)
//
// Il pacchetto è il file che ogni nuova installazione copia al primo avvio. Quando una migrazione
// cambia i dati (orari strutturati, condizioni…), il pacchetto va rigenerato e committato: un
// file di gioco nuovo non deve dipendere dal vecchio seed. Con `--da-istanza` il pacchetto diventa
// una copia dei dati di gioco dell'istanza locale (senza partite: stanno in un altro file), che è
// il modo in cui le correzioni fatte nell'app diventano dato predefinito. È una fotografia: quello
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
import { percorsoPacchettoDb, percorsoPacchettoImmagini, regoleAllAvvio } from '../server/services/pacchetto/pacchettoGioco.js';

const daIstanza = process.argv.includes('--da-istanza');
const destinazione = percorsoPacchettoDb();
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
  if (!fs.existsSync(destinazione)) throw new Error(`Il pacchetto manca (${destinazione}): usa --da-istanza per crearlo dai dati di gioco dell'istanza.`);
  fs.copyFileSync(destinazione, provvisorio);
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
// le immagini referenziate dal file di gioco: dal DATA_DIR dell'istanza, se ci sono
const immagini = db.prepare('SELECT ambito, nome_file FROM immagine').all() as Array<{ ambito: string; nome_file: string }>;
closeDb();

const compatto = new Database(provvisorio);
compatto.exec(`VACUUM INTO '${path.join(lavoro, 'gioco.compatto.db').replace(/'/g, "''")}'`);
compatto.close();
fs.mkdirSync(path.dirname(destinazione), { recursive: true });
fs.copyFileSync(path.join(lavoro, 'gioco.compatto.db'), destinazione);
let copiate = 0;
for (const i of immagini) {
  const da = path.join(config.dataDir, 'immagini', i.ambito, i.nome_file);
  const a = path.join(percorsoPacchettoImmagini(), i.ambito, i.nome_file);
  if (fs.existsSync(da) && !fs.existsSync(a)) { fs.mkdirSync(path.dirname(a), { recursive: true }); fs.copyFileSync(da, a); copiate++; }
}
fs.rmSync(lavoro, { recursive: true, force: true });
console.log(`Pacchetto scritto in ${destinazione}: schema ${versione}, ${tabelle} tabelle, ${(fs.statSync(destinazione).size / 1024 / 1024).toFixed(2)} MB, immagini copiate ${copiate}/${immagini.length}.`);
