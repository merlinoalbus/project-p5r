// ============================================================
// impostazioniService — backup e ripristino dell'istanza (Fase 15.29)
// ============================================================
//
// Esportazione: il file SQLite dei dati di gioco (`getDb().backup()`, l'unica API consistente con il WAL attivo, la stessa del backup
// di avvio; dalla 079 con dentro anche le immagini) oppure l'ISTANZA COMPLETA in uno ZIP (i due database + i caratteri), perché i
// caratteri vivono su disco in DATA_DIR e le partite in un file a parte.
// Reimportazione: il file SOSTITUISCE l'istanza. Prima si valida (intestazione SQLite, integrity_check, schema riconoscibile),
// poi si salva una copia di sicurezza di ciò che c'è ora, si chiude la connessione, si mettono al loro posto i file, si riapre e si
// rieseguono migrazioni e seed. Se qualcosa fallisce dopo la chiusura, la copia di sicurezza viene ripristinata e l'app resta
// utilizzabile.
//
// **Tutto passa da file, mai da buffer interi** (rilievi F19/P3' della verifica completa, 2026-10-03). Prima un ripristino teneva in
// memoria il file letto, poi ogni voce dello ZIP, e riscriveva il database due volte (una copia per verificarlo, una per installarlo):
// con ~300 MB voleva dire più di un GB in memoria e minuti di disco. Ora il file arriva una volta sola in una cartella di lavoro
// locale (`data/tmp`), lì si estraggono le voci a flusso e si verificano, e il database verificato prende il posto di quello
// dell'istanza con un `rename` (stesso disco: atomico, nessuna copia in più).
// ============================================================

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import Database from 'better-sqlite3';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { httpErrors } from '../utils/httpError.js';
import { closeDb, copiaSchema, getDb, initDb, resolveDbPath, resolvePartitePath } from '../db/dbService.js';
import { runMigrations, type Migration } from '../db/migrationRunner.js';
import { invalidaCacheDiGioco } from './cacheDiGioco.js';
import { occupaIstanza } from './lucchettoIstanza.js';
import { migrations } from '../db/migrations/index.js';
import { migrazioniUtente } from '../db/migrazioniUtente/index.js';
import { assorbiImmaginiSuDisco } from './pacchetto/pacchettoGioco.js';
import { ESTENSIONI_BACKUP, copiaDalDeposito, elencaDeposito as elencaCartella } from './depositoService.js';
import type { DepositoFileDto } from '../../shared/types.js';
import { estraiVoce, leggiIndiceZip, scriviZip, type VoceIndiceZip, type VoceZip } from '../utils/zip.js';
import type { EsitoRipristinoDto, StatoIstanzaDto } from '../../shared/types.js';

/** Intestazione di ogni file SQLite 3. */
const FIRMA_SQLITE = 'SQLite format 3\0';
/** I due file dell'istanza dentro lo ZIP; il terzo è il vecchio file unico, che si accetta ancora in ripristino. */
const NOME_DB_NELLO_ZIP = 'database/gioco.db';
const NOME_PARTITE_NELLO_ZIP = 'database/partite.db';
const NOME_DB_LEGACY_NELLO_ZIP = 'database/project-p5r.db';

/** Che cosa contiene un file SQLite dell'app: solo dati di gioco, solo partite, o il vecchio file unico. */
export type ContenutoDatabase = 'gioco' | 'partite' | 'unico';

export function cartella(nome: 'immagini' | 'font' | 'backups'): string {
  return path.join(config.dataDir, nome);
}

/** File di una cartella dell'istanza, con percorso relativo (ricorsivo); cartella assente = nessun file. */
function fileDellaCartella(base: string, prefisso = ''): Array<{ relativo: string; assoluto: string; byte: number }> {
  if (!fs.existsSync(base)) return [];
  const out: Array<{ relativo: string; assoluto: string; byte: number }> = [];
  for (const voce of fs.readdirSync(base, { withFileTypes: true })) {
    const assoluto = path.join(base, voce.name);
    const relativo = prefisso ? `${prefisso}/${voce.name}` : voce.name;
    if (voce.isDirectory()) out.push(...fileDellaCartella(assoluto, relativo));
    else if (voce.isFile()) out.push({ relativo, assoluto, byte: fs.statSync(assoluto).size });
  }
  return out;
}

function meta(chiave: string): string | null {
  try {
    return (getDb().prepare('SELECT valore FROM seed_meta WHERE chiave = ?').get(chiave) as { valore: string } | undefined)?.valore ?? null;
  } catch {
    return null;
  }
}

/** Stato dell'istanza mostrato in Impostazioni (dimensioni, versioni, conteggi). */
export function statoIstanza(): StatoIstanzaDto {
  const dbPath = resolveDbPath();
  const partitePath = resolvePartitePath();
  const inMemoria = !fs.existsSync(dbPath);
  // le immagini stanno nel database (079): si contano le righe con contenuto
  const immagini = (() => {
    try { return getDb().prepare('SELECT COUNT(*) AS file, COALESCE(SUM(byte), 0) AS byte FROM immagine WHERE contenuto IS NOT NULL').get() as { file: number; byte: number }; } catch { return { file: 0, byte: 0 }; }
  })();
  const caratteri = fileDellaCartella(cartella('font'));
  const partite = (() => {
    try { return (getDb().prepare('SELECT COUNT(*) AS n FROM partita').get() as { n: number }).n; } catch { return 0; }
  })();
  // snapshot di avvio (file .db) e copie di ripristino (cartelle): l'utente le vede come un'unica riserva
  const copie = fs.existsSync(cartella('backups')) ? fs.readdirSync(cartella('backups'), { withFileTypes: true }).filter((v) => (v.isFile() && v.name.endsWith('.db') && !v.name.endsWith('.partite.db')) || (v.isDirectory() && v.name.startsWith('prima-del-ripristino-'))).length : 0;
  return {
    versioneSchema: getDb().pragma('main.user_version', { simple: true }) as number,
    versioneSchemaPartite: getDb().pragma('utente.user_version', { simple: true }) as number,
    versioneApp: config.appVersion,
    seed: { versione: meta('versione'), hash: meta('hash'), caricatoIl: meta('caricatoIl') },
    database: { nome: config.dbFileName, byte: inMemoria ? 0 : fs.statSync(dbPath).size, inMemoria },
    databasePartite: { nome: config.partiteFileName, byte: inMemoria || !fs.existsSync(partitePath) ? 0 : fs.statSync(partitePath).size },
    immagini: { file: immagini.file, byte: immagini.byte },
    caratteri: { file: caratteri.length, byte: caratteri.reduce((s, f) => s + f.byte, 0) },
    partite,
    copieDiSicurezza: copie,
    vuota: (() => { try { return (getDb().prepare('SELECT COUNT(*) AS n FROM persona').get() as { n: number }).n === 0; } catch { return true; } })(),
    completo: immagini.file > 0,
  };
}

export function cartellaTemporanea(): string {
  const dir = path.join(config.dataDir, 'tmp');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export const timbro = (): string => new Date().toISOString().replace(/[:.]/g, '-');

/**
 * Esegue `lavoro` con una cartella di lavoro tutta sua in `data/tmp` (stesso disco dei database: il `rename` finale è atomico) e la
 * toglie alla fine, comunque vada.
 */
export async function conCartellaDiLavoro<T>(prefisso: string, lavoro: (dir: string) => Promise<T>): Promise<T> {
  const dir = await fsp.mkdtemp(path.join(cartellaTemporanea(), `${prefisso}-`));
  try {
    return await lavoro(dir);
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
}

/**
 * Copia consistente del database in un file temporaneo: chi chiama deve leggerlo e poi cancellarlo.
 * Usa l'online backup di better-sqlite3, sicuro con il WAL attivo e senza bloccare le scritture.
 */
export async function copiaDatabase(quale: 'gioco' | 'partite' = 'gioco'): Promise<{ percorso: string; nome: string }> {
  const percorso = path.join(cartellaTemporanea(), `esporta-${quale}-${timbro()}.db`);
  await copiaSchema(getDb(), percorso, quale === 'partite' ? 'utente' : 'main');
  return { percorso, nome: `project-p5r-${quale}-${timbro()}.db` };
}

/**
 * Istanza completa in uno ZIP: i due database (le immagini stanno dentro quello di gioco), i caratteri e un manifesto leggibile.
 * L'archivio si scrive a flusso in un file temporaneo: chi chiama lo manda e poi lo cancella, come per `copiaDatabase`.
 */
export async function copiaIstanza(): Promise<{ percorso: string; nome: string }> {
  const copia = await copiaDatabase('gioco');
  const copiaPartite = await copiaDatabase('partite');
  const adesso = new Date();
  const stato = statoIstanza();
  const percorso = path.join(cartellaTemporanea(), `esporta-istanza-${timbro()}.zip`);
  try {
    const voci: VoceZip[] = [
      { nome: NOME_DB_NELLO_ZIP, file: copia.percorso, data: adesso },
      { nome: NOME_PARTITE_NELLO_ZIP, file: copiaPartite.percorso, data: adesso },
    ];
    for (const f of fileDellaCartella(cartella('font'))) voci.push({ nome: `font/${f.relativo}`, file: f.assoluto, data: adesso });
    voci.push({ nome: 'manifest.json', contenuto: Buffer.from(JSON.stringify({ esportatoIl: adesso.toISOString(), ...stato }, null, 1), 'utf-8'), data: adesso });
    voci.push({ nome: 'LEGGIMI.txt', contenuto: Buffer.from([
      'Copia completa dell\'istanza di project-p5r.',
      '',
      `Esportata il ${adesso.toISOString()} — app ${stato.versioneApp}, schema ${stato.versioneSchema}.`,
      '',
      'Contenuto:',
      `- ${NOME_DB_NELLO_ZIP}: il database SQLite dei dati di gioco (compendio, guida, catalogo, mappe, immagini)`,
      `- ${NOME_PARTITE_NELLO_ZIP}: il database SQLite delle partite (avanzamento, tracking)`,
      '- font/: i caratteri caricati',
      '- manifest.json: versioni e conteggi al momento dell\'esportazione',
      '',
      'Per ripristinare: metti lo ZIP nella cartella d\'appoggio, poi Impostazioni → Backup e ripristino → «Cerca i file disponibili»,',
      'scegli questo ZIP e «Ripristina il file scelto».',
      'Il ripristino SOSTITUISCE l\'istanza corrente; prima viene salvata una copia di sicurezza in data/backups.',
      '',
    ].join('\n'), 'utf-8'), data: adesso });
    await scriviZip(percorso, voci);
    return { percorso, nome: `project-p5r-istanza-${timbro()}.zip` };
  } finally {
    await fsp.rm(copia.percorso, { force: true });
    await fsp.rm(copiaPartite.percorso, { force: true });
  }
}

/** I backup depositati nella cartella d'appoggio (lo ZIP dell'istanza o un database). */
export function elencaDepositoBackup(): DepositoFileDto {
  return elencaCartella(ESTENSIONI_BACKUP);
}

/** Legge i primi `n` byte di un file (firme e intestazioni), senza leggerlo tutto. */
function testaDelFile(percorso: string, n: number): Buffer {
  const b = Buffer.alloc(n);
  const fd = fs.openSync(percorso, 'r');
  try {
    const letti = fs.readSync(fd, b, 0, n, 0);
    return b.subarray(0, letti);
  } finally {
    fs.closeSync(fd);
  }
}

/** Il file è un database SQLite riconoscibile? Solo controlli sul contenuto, nessun effetto sul file. Esportata per i test e per
 *  l'importazione del pacchetto. Restituisce che cosa contiene: dati di gioco, partite, o il vecchio file unico (entrambi). */
export function verificaDatabase(percorso: string): ContenutoDatabase {
  return esaminaDatabase(percorso).tipo;
}

/**
 * Come `verificaDatabase`, con in più la versione dello schema (`user_version`) del file. Il file si apre dov'è, in sola lettura:
 * prima se ne scriveva una copia in un temporaneo solo per poterlo aprire. Aprire un database in WAL può creare i suoi giornali:
 * si tolgono quelli che prima non c'erano.
 */
function esaminaDatabase(percorso: string): { tipo: ContenutoDatabase; versione: number } {
  const testa = testaDelFile(percorso, 100);
  if (testa.length < 100 || testa.toString('utf-8', 0, 16) !== FIRMA_SQLITE) {
    throw httpErrors.badRequest('file-non-valido', 'Il file non è un database SQLite: carica il file .db esportato dall\'app oppure lo ZIP dell\'istanza.');
  }
  const giornaliPrima = new Set(['-wal', '-shm'].filter((coda) => fs.existsSync(`${percorso}${coda}`)));
  try {
    const db = new Database(percorso, { readonly: true });
    try {
      const esito = db.pragma('integrity_check', { simple: true }) as string;
      if (esito !== 'ok') throw httpErrors.badRequest('database-danneggiato', `Il database caricato non supera il controllo di integrità: ${esito}.`);
      const tabelle = (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>).map((r) => r.name);
      const gioco = tabelle.includes('persona');
      const partite = tabelle.includes('partita');
      if (!gioco && !partite) {
        throw httpErrors.badRequest('database-estraneo', 'Il database caricato non è un\'istanza di project-p5r: mancano le tabelle di base.');
      }
      const versione = db.pragma('user_version', { simple: true }) as number;
      if (versione < 1) throw httpErrors.badRequest('database-estraneo', 'Il database caricato non ha uno schema riconoscibile (nessuna migrazione applicata).');
      return { tipo: gioco && partite ? 'unico' : gioco ? 'gioco' : 'partite', versione };
    } finally {
      db.close();
    }
  } finally {
    // anche i giornali: aprire un database WAL ne crea, e in data/tmp restavano a decine
    for (const coda of ['-wal', '-shm']) if (!giornaliPrima.has(coda)) fs.rmSync(`${percorso}${coda}`, { force: true });
  }
}

/** Il file è uno ZIP (firma «PK\x03\x04»)? */
function eZip(percorso: string): boolean {
  const testa = testaDelFile(percorso, 4);
  return testa.length === 4 && testa.readUInt32LE(0) === 0x04034b50;
}

function svuotaCartella(dir: string): void {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

/** Copie di ripristino conservate in `data/backups` (le più recenti). */
const COPIE_DI_RIPRISTINO = 3;

/** Copia di sicurezza dell'istanza attuale prima di sostituirla (database + immagini + caratteri); tiene solo le ultime copie. */
export async function copiaDiSicurezza(): Promise<string> {
  const dir = path.join(cartella('backups'), `prima-del-ripristino-${timbro()}`);
  fs.mkdirSync(dir, { recursive: true });
  await copiaSchema(getDb(), path.join(dir, config.dbFileName), 'main');
  await copiaSchema(getDb(), path.join(dir, config.partiteFileName), 'utente');
  for (const nome of ['immagini', 'font'] as const) {
    const base = cartella(nome);
    if (fs.existsSync(base)) fs.cpSync(base, path.join(dir, nome), { recursive: true });
  }
  const vecchie = fs.readdirSync(cartella('backups'), { withFileTypes: true })
    .filter((v) => v.isDirectory() && v.name.startsWith('prima-del-ripristino-')).map((v) => v.name).sort().reverse();
  for (const stale of vecchie.slice(COPIE_DI_RIPRISTINO)) fs.rmSync(path.join(cartella('backups'), stale), { recursive: true, force: true });
  return dir;
}

/** Rimette l'istanza salvata prima del ripristino: database (con i suoi giornali) e cartelle dei file. La copia resta dov'è. */
async function ripristinaCopiaDiSicurezza(dir: string): Promise<void> {
  const dbSalvato = path.join(dir, config.dbFileName);
  if (fs.existsSync(dbSalvato)) await installaDatabase(dbSalvato, resolveDbPath(), 'copia');
  const partiteSalvate = path.join(dir, config.partiteFileName);
  if (fs.existsSync(partiteSalvate)) await installaDatabase(partiteSalvate, resolvePartitePath(), 'copia');
  for (const nome of ['immagini', 'font'] as const) {
    svuotaCartella(cartella(nome));
    const salvata = path.join(dir, nome);
    if (fs.existsSync(salvata)) fs.cpSync(salvata, cartella(nome), { recursive: true });
  }
}

/** Porta su disco il contenuto di un file già scritto (un `rename` dopo un crash non deve lasciare un file vuoto). */
async function suDisco(percorso: string): Promise<void> {
  const fh = await fsp.open(percorso, 'r+');
  try {
    await fh.sync();
  } finally {
    await fh.close();
  }
}

/**
 * Mette il file di database `sorgente` al posto di `dbPath`, atomicamente, e toglie i giornali WAL della vecchia connessione.
 *
 * - `sposta`: il file sta nella cartella di lavoro (stesso disco, `data/tmp`): lo si porta su disco e lo si rinomina, senza copiarlo.
 *   Se il `rename` non si può fare (dischi diversi: `EXDEV`) si ripiega sulla copia.
 * - `copia`: il sorgente resta (la copia di sicurezza): si copia in un file nuovo accanto alla destinazione, lo si porta su disco e
 *   lo si rinomina sopra quello vecchio.
 *
 * In nessuno dei due casi un crash o un disco pieno a metà lasciano il file vivo troncato: il vecchio resta finché il `rename` non
 * mette il nuovo, completo, al suo posto.
 */
export async function installaDatabase(sorgente: string, dbPath: string, modo: 'sposta' | 'copia'): Promise<void> {
  await fsp.mkdir(path.dirname(dbPath), { recursive: true });
  let fatto = false;
  if (modo === 'sposta') {
    await suDisco(sorgente);
    try {
      await fsp.rename(sorgente, dbPath);
      fatto = true;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EXDEV') throw err;
    }
  }
  if (!fatto) {
    const nuovo = `${dbPath}.nuovo-${process.pid}`;
    try {
      await fsp.copyFile(sorgente, nuovo);
      await suDisco(nuovo);
      await fsp.rename(nuovo, dbPath);
    } catch (err) {
      await fsp.rm(nuovo, { force: true });
      throw err;
    }
  }
  for (const coda of ['-wal', '-shm']) await fsp.rm(`${dbPath}${coda}`, { force: true });
}

/** Toglie un file di database con i suoi giornali. */
function rimuoviDatabase(dbPath: string): void {
  for (const coda of ['', '-wal', '-shm']) fs.rmSync(`${dbPath}${coda}`, { force: true });
}

/** Riapre la connessione e riporta l'app in servizio: migrazioni, immagini rimaste su disco (backup di prima della 079), cache in memoria. */
export function riapriIstanza(): void {
  const db = initDb();
  runMigrations(db);
  assorbiImmaginiSuDisco(db);
  invalidaCacheDiGioco();
}

/**
 * Destinazione di una voce dello ZIP dentro la cartella dati, oppure null se il nome porta fuori.
 * Il controllo è sul percorso RISOLTO, non sul nome: su Windows anche «\» separa, quindi «immagini/..\..\fuori» uscirebbe.
 */
function destinazioneSicura(prefisso: 'immagini' | 'font', nome: string): string | null {
  const base = cartella(prefisso);
  const risolto = path.resolve(config.dataDir, nome.replace(/\\/g, '/'));
  const relativo = path.relative(base, risolto);
  if (!relativo || relativo.startsWith('..') || path.isAbsolute(relativo)) return null;
  return risolto;
}

/**
 * Dopo una sostituzione fallita a connessione chiusa: rimette in servizio il database (senza connessione l'app
 * sarebbe morta fino al riavvio), poi i file, e rilancia come 400 con il dettaglio. Usata dal ripristino dell'istanza
 * e dall'importazione del pacchetto di gioco.
 */
export async function tornaAllaCopiaDiSicurezza(salvataggio: string, err: unknown, codice: string, azione: string): Promise<never> {
  logger.error({ err, salvataggio }, `${azione.toLowerCase()} fallito: si torna alla copia di sicurezza`);
  let ripristinoFile: unknown = null;
  try {
    closeDb();
  } catch {
    // connessione già chiusa o in errore: la riapertura qui sotto la ricrea comunque
  }
  try {
    await ripristinaCopiaDiSicurezza(salvataggio);
  } catch (err2) {
    ripristinoFile = err2;
    logger.error({ err: err2, salvataggio }, 'ripristino dei file della copia di sicurezza fallito: la copia resta su disco');
  }
  try {
    riapriIstanza();
  } catch (err3) {
    // senza connessione l'app risponderebbe 500 a tutto senza dire perché: si dice che cosa è successo e dove sta la copia.
    // Il motivo tecnico (messaggio di SQLite o del file system, con i percorsi) resta nel log, come per ogni 500 (F02).
    logger.error({ err: err3, salvataggio }, 'riapertura dopo il ritorno alla copia di sicurezza fallita: serve un riavvio');
    throw httpErrors.internal(`${azione} non riuscito, e anche la riapertura dell'istanza è fallita: riavvia il server. La copia di sicurezza è in data/backups/${path.basename(salvataggio)}.`);
  }
  const dettaglio = ripristinoFile ? ` I file non sono tornati tutti al loro posto: la copia è in data/backups/${path.basename(salvataggio)}.` : ' L\'istanza precedente è stata rimessa com\'era.';
  throw httpErrors.badRequest(codice, `${azione} non riuscito (${err instanceof Error ? err.message : 'errore sconosciuto'}).${dettaglio}`);
}

/** Il ripristino da file non c'è per un'istanza che tiene il database in memoria (nessun file da sostituire). */
function richiediIstanzaSuDisco(): void {
  if (!fs.existsSync(resolveDbPath())) {
    throw httpErrors.badRequest('istanza-in-memoria', 'Questa istanza tiene il database in memoria: il ripristino da file non è disponibile.');
  }
}

/**
 * Sostituisce l'istanza con un file locale (database `.db` o ZIP dell'istanza) e riapre l'app sui dati nuovi: le migrazioni
 * vengono rieseguite, le cache in memoria invalidate. In caso di errore si ripristina la copia di sicurezza. Il file `sorgente`
 * resta com'è: se ne lavora una copia.
 */
export async function ripristinaIstanza(sorgente: string): Promise<EsitoRipristinoDto> {
  // lo stesso lucchetto dell'importazione del pacchetto: due sostituzioni dei file non si intrecciano (409 alla seconda)
  const rilascia = occupaIstanza("Un ripristino dell'istanza");
  try {
    richiediIstanzaSuDisco();
    return await conCartellaDiLavoro('ripristino', async (lavoro) => {
      const file = path.join(lavoro, 'sorgente');
      await fsp.copyFile(sorgente, file);
      return ripristinaDaFileDiLavoro(file, lavoro);
    });
  } finally {
    rilascia();
  }
}

/** Ripristina l'istanza da un file depositato sul NAS: lo copia il server in locale, il browser non trasporta niente. */
export async function ripristinaIstanzaDaDeposito(nome: string): Promise<EsitoRipristinoDto> {
  const rilascia = occupaIstanza("Un ripristino dell'istanza");
  try {
    richiediIstanzaSuDisco();
    return await conCartellaDiLavoro('ripristino', async (lavoro) => {
      const file = path.join(lavoro, 'sorgente');
      await copiaDalDeposito(nome, file);
      return ripristinaDaFileDiLavoro(file, lavoro);
    });
  } finally {
    rilascia();
  }
}

/** Uno schema più nuovo di quello che il codice conosce non si ripristina: le migrazioni non farebbero nulla e il codice girerebbe su
 *  tabelle che non sa leggere. È la stessa regola dell'importazione del pacchetto (`pacchetto-troppo-nuovo`). */
function schemaNonPiuNuovo(versione: number, elenco: readonly Migration[], quale: string): void {
  const codice = elenco.reduce((max, m) => Math.max(max, m.id), 0);
  if (versione > codice) throw httpErrors.badRequest('database-troppo-nuovo', `Il database ${quale} ha lo schema ${versione}, più nuovo di quello che questa versione dell'app sa leggere (${codice}): aggiorna l'app prima di ripristinarlo.`);
}

/** Estrae una voce dello ZIP; un archivio danneggiato è un errore dell'utente (400), non del server. */
async function estraiOppure400(zip: string, voce: VoceIndiceZip, destinazione: string): Promise<void> {
  try {
    await estraiVoce(zip, voce, destinazione);
  } catch (err) {
    throw httpErrors.badRequest('zip-non-valido', `Lo ZIP caricato non è leggibile: ${err instanceof Error ? err.message : 'formato non riconosciuto'}.`);
  }
}

/**
 * Il ripristino vero e proprio, con il lucchetto dell'istanza in mano e il file già nella cartella di lavoro: verifica, copia di
 * sicurezza, sostituzione, riapertura.
 */
async function ripristinaDaFileDiLavoro(file: string, lavoro: string): Promise<EsitoRipristinoDto> {
  const zip = eZip(file);
  // Che cosa arriva: il file di gioco, quello delle partite, o il vecchio file unico (che la
  // migrazione 066 divide al primo avvio: per questo il file delle partite esistente va tolto,
  // altrimenti le partite del file unico non avrebbero dove andare). Sono percorsi nella cartella di lavoro.
  let gioco: string | null = null;
  let partite: string | null = null;
  let unico: string | null = null;
  let immagini: VoceIndiceZip[] = [];
  let caratteri: VoceIndiceZip[] = [];
  if (zip) {
    let voci: VoceIndiceZip[];
    try {
      voci = await leggiIndiceZip(file);
    } catch (err) {
      throw httpErrors.badRequest('zip-non-valido', `Lo ZIP caricato non è leggibile: ${err instanceof Error ? err.message : 'formato non riconosciuto'}.`);
    }
    const voceGioco = voci.find((v) => v.nome === NOME_DB_NELLO_ZIP);
    const vocePartite = voci.find((v) => v.nome === NOME_PARTITE_NELLO_ZIP);
    const voceUnico = voci.find((v) => v.nome === NOME_DB_LEGACY_NELLO_ZIP) ?? (voceGioco || vocePartite ? undefined : voci.find((v) => v.nome.startsWith('database/') && v.nome.endsWith('.db')));
    if (!voceGioco && !vocePartite && !voceUnico) throw httpErrors.badRequest('zip-senza-database', 'Lo ZIP caricato non contiene il database dell\'istanza.');
    for (const [voce, nome] of [[voceGioco, 'gioco.db'], [vocePartite, 'partite.db'], [voceUnico, 'unico.db']] as const) {
      if (!voce) continue;
      const destinazione = path.join(lavoro, nome);
      await estraiOppure400(file, voce, destinazione);
      if (nome === 'gioco.db') gioco = destinazione; else if (nome === 'partite.db') partite = destinazione; else unico = destinazione;
    }
    // le voci che porterebbero fuori dalla cartella dati vengono scartate, con qualunque separatore
    immagini = voci.filter((v) => v.nome.startsWith('immagini/') && destinazioneSicura('immagini', v.nome) !== null);
    caratteri = voci.filter((v) => v.nome.startsWith('font/') && destinazioneSicura('font', v.nome) !== null);
  }
  if (zip) {
    if (gioco) {
      const e = esaminaDatabase(gioco);
      if (e.tipo === 'partite') throw httpErrors.badRequest('database-estraneo', 'Il file dei dati di gioco dello ZIP contiene solo partite.');
      schemaNonPiuNuovo(e.versione, migrations, 'dei dati di gioco');
    }
    if (partite) {
      const e = esaminaDatabase(partite);
      if (e.tipo === 'gioco') throw httpErrors.badRequest('database-estraneo', 'Il file delle partite dello ZIP contiene solo dati di gioco.');
      schemaNonPiuNuovo(e.versione, migrazioniUtente, 'delle partite');
    }
    // il file unico di prima della 066 segue la numerazione dei dati di gioco
    if (unico) schemaNonPiuNuovo(esaminaDatabase(unico).versione, migrations, 'dell\'istanza');
  } else {
    // un database solo: un esame decide che cosa contiene e se lo schema si può leggere
    const e = esaminaDatabase(file);
    if (e.tipo === 'gioco') { gioco = file; schemaNonPiuNuovo(e.versione, migrations, 'dei dati di gioco'); }
    else if (e.tipo === 'partite') { partite = file; schemaNonPiuNuovo(e.versione, migrazioniUtente, 'delle partite'); }
    else { unico = file; schemaNonPiuNuovo(e.versione, migrations, 'dell\'istanza'); }
  }

  const salvataggio = await copiaDiSicurezza();
  closeDb();
  try {
    if (unico) {
      await installaDatabase(unico, resolveDbPath(), 'sposta');
      rimuoviDatabase(resolvePartitePath());
    } else {
      if (gioco) await installaDatabase(gioco, resolveDbPath(), 'sposta');
      if (partite) await installaDatabase(partite, resolvePartitePath(), 'sposta');
    }
    // lo ZIP è una copia completa dell'istanza: caratteri (e immagini, nei backup di prima della 079: alla riapertura entrano nel database)
    // vengono sostituiti in blocco, anche quando il backup non ne aveva
    if (zip) {
      for (const [prefisso, voci] of [['immagini', immagini], ['font', caratteri]] as const) {
        svuotaCartella(cartella(prefisso));
        for (const v of voci) {
          const destinazione = destinazioneSicura(prefisso, v.nome);
          if (!destinazione) continue;
          await fsp.mkdir(path.dirname(destinazione), { recursive: true });
          await estraiVoce(file, v, destinazione);
        }
      }
    }
    riapriIstanza();
  } catch (err) {
    await tornaAllaCopiaDiSicurezza(salvataggio, err, 'ripristino-fallito', 'Ripristino');
  }
  logger.info({ formato: zip ? 'istanza' : 'database', gioco: !!(gioco || unico), partite: !!(partite || unico), salvataggio }, 'istanza ripristinata da file');
  return {
    formato: zip ? 'istanza' : 'database',
    database: !!(gioco || unico),
    partite: !!(partite || unico),
    immagini: immagini.length,
    caratteri: caratteri.length,
    copiaDiSicurezza: path.basename(salvataggio),
    stato: statoIstanza(),
  };
}
