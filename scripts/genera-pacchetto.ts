// ============================================================
// genera-pacchetto — rifà `pacchetto/gioco.db` dai dati di gioco dell'istanza
// ============================================================
//
//   npm run pacchetto
//
// Il pacchetto è il file che ogni nuova installazione copia al primo avvio, e ciò che i test caricano. Nasce dai dati di gioco
// dell'istanza che si cura (`DATA_DIR/gioco.db`, la cartella dati della configurazione): è il modo in cui le correzioni fatte
// nell'app diventano dato predefinito. È una fotografia: quello che l'istanza ha tolto resta tolto e quello che ha aggiunto resta
// aggiunto; nessuna sincronizzazione con la guida ricrea spilli o mappe.
//
// Che cosa fa, senza mai scrivere nell'istanza:
//   1. verifica che `gioco.db` dell'istanza sia alla versione che il codice legge (`VERSIONE_GIOCO`): un pacchetto di un'altra
//      versione non servirebbe a nessuna installazione;
//   2. ne fa una copia consistente in una cartella di lavoro (backup in linea di SQLite, sicuro anche con il server acceso);
//   3. sulla copia: applica le regole sui dati dell'avvio (il pacchetto nasce già a posto), svuota il cestino e le miniature (sono
//      dell'istanza, non dato predefinito) e toglie il contenuto delle immagini (restano le righe: l'app sa che cosa manca; le
//      immagini arrivano con un backup completo importato dall'app);
//   4. `VACUUM INTO`, giornale classico e controllo di integrità → `pacchetto/gioco.db`.
//
// Le partite non c'entrano: stanno in un altro file, e il loro modello (`pacchetto/partite-vuoto.db`) è un file fisso del
// repository che questo script non genera.
// ============================================================

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { resolveDbPath } from '../server/db/dbService.js';
import { VERSIONE_GIOCO, messaggioVersioneDiversa } from '../server/db/versioneSchema.js';
import { percorsoPacchettoDb, regoleAllAvvio } from '../server/services/pacchetto/pacchettoGioco.js';

const sorgente = resolveDbPath();
const destinazione = percorsoPacchettoDb();
const lavoro = fs.mkdtempSync(path.join(os.tmpdir(), 'p5r-pacchetto-'));
const copia = path.join(lavoro, 'gioco.db');
const compatto = path.join(lavoro, 'gioco.compatto.db');

/** La versione (`user_version`) di un database aperto. */
const versioneDi = (db: Database.Database): number => db.pragma('user_version', { simple: true }) as number;

// La cartella di lavoro tiene la copia dei dati di gioco (centinaia di MB): si toglie anche se un passo fallisce a metà.
try {
  if (!fs.existsSync(sorgente)) throw new Error(`Nessun file dei dati di gioco in ${sorgente}: il pacchetto si genera dall'istanza (DATA_DIR).`);

  // 1-2. versione attesa e copia consistente: l'istanza si apre in sola lettura e non viene mai scritta
  const istanza = new Database(sorgente, { readonly: true, fileMustExist: true });
  try {
    const versione = versioneDi(istanza);
    if (versione !== VERSIONE_GIOCO) throw new Error(`Il pacchetto non si può generare. ${messaggioVersioneDiversa('gioco', versione, VERSIONE_GIOCO)}`);
    await istanza.backup(copia);
  } finally {
    istanza.close();
  }

  // 3-4. sulla copia: regole, cestino e miniature vuoti, immagini senza contenuto, poi il file compatto
  const db = new Database(copia);
  let tabelle = 0;
  let immagini = 0;
  try {
    db.pragma('foreign_keys = ON');
    if (db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = 'partita'").get()) {
      throw new Error('Il file dei dati di gioco contiene la tabella «partita»: non è un file di soli dati di gioco.');
    }
    // le stesse regole sui dati dell'avvio: un'istanza nuova non cambia nulla al primo avvio
    console.log('regole applicate:', JSON.stringify(regoleAllAvvio(db)));
    // il cestino è dell'istanza da cui viene il pacchetto: le sue eliminazioni non diventano dato predefinito di un'installazione nuova
    console.log('elementi del cestino tolti:', db.prepare('DELETE FROM main.cestino').run().changes);
    // le miniature sono dati derivati dell'istanza: si rigenerano al primo uso
    console.log('miniature tolte:', db.prepare('DELETE FROM main.immagine_miniatura').run().changes);
    immagini = db.prepare('UPDATE main.immagine SET contenuto = NULL WHERE contenuto IS NOT NULL').run().changes;
    console.log('immagini senza più il contenuto:', immagini);
    tabelle = (db.prepare("SELECT COUNT(*) AS n FROM main.sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").get() as { n: number }).n;
    // il pacchetto è un file solo, senza giornali accanto
    db.pragma('wal_checkpoint(TRUNCATE)');
    db.prepare('VACUUM INTO ?').run(compatto);
  } finally {
    db.close();
  }

  // il file compatto si controlla prima di metterlo al posto del pacchetto; giornale classico, così chi lo apre non gli crea giornali WAL accanto
  const finito = new Database(compatto, { fileMustExist: true });
  try {
    const giornale = finito.pragma('journal_mode = DELETE', { simple: true });
    if (giornale !== 'delete') throw new Error(`Il pacchetto generato è in modalità «${String(giornale)}» invece di «delete».`);
    if (versioneDi(finito) !== VERSIONE_GIOCO) throw new Error('La versione dei dati non è sopravvissuta alla compattazione.');
    const integrita = finito.pragma('integrity_check', { simple: true }) as string;
    if (integrita !== 'ok') throw new Error(`Il pacchetto generato non supera il controllo di integrità: ${integrita}.`);
  } finally {
    finito.close();
  }
  fs.mkdirSync(path.dirname(destinazione), { recursive: true });
  fs.copyFileSync(compatto, destinazione);
  console.log(`Pacchetto scritto in ${destinazione}: versione ${VERSIONE_GIOCO}, ${tabelle} tabelle, ${(fs.statSync(destinazione).size / 1024 / 1024).toFixed(2)} MB, senza il contenuto delle immagini.`);
} finally {
  try {
    fs.rmSync(lavoro, { recursive: true, force: true });
  } catch (err) {
    console.warn(`Cartella di lavoro non rimossa (${lavoro}): ${err instanceof Error ? err.message : String(err)}`);
  }
}
