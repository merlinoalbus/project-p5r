// ============================================================
// impostazioniService — backup e ripristino dell'istanza (Fase 15.29)
// ============================================================
//
// Esportazione: il file SQLite completo (`getDb().backup()`, l'unica API consistente con il WAL attivo, la stessa del backup di avvio)
// oppure l'ISTANZA COMPLETA in uno ZIP (database + immagini caricate + caratteri), perché immagini e caratteri vivono su disco in
// DATA_DIR e non dentro il database: un backup del solo database lascerebbe righe `immagine` senza file.
// Reimportazione: il file caricato SOSTITUISCE l'istanza. Prima si valida (intestazione SQLite, integrity_check, schema riconoscibile),
// poi si salva una copia di sicurezza di ciò che c'è ora, si chiude la connessione, si scrivono i file, si riapre e si rieseguono
// migrazioni e seed. Se qualcosa fallisce dopo la chiusura, la copia di sicurezza viene ripristinata e l'app resta utilizzabile.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { httpErrors } from '../utils/httpError.js';
import { closeDb, getDb, initDb, resolveDbPath } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { caricaSeed } from './seed/caricaSeed.js';
import { invalidaCacheTraduzioni } from './traduzioniService.js';
import { invalidaMotoreFusione } from './fusione/motoreFusione.js';
import { invalidaEredita } from './fusione/eredita.js';
import { creaZip, leggiZip, type VoceZip } from '../utils/zip.js';
import type { EsitoRipristinoDto, StatoIstanzaDto } from '../../shared/types.js';

/** Limite del file accettato in ripristino (database + immagini di una istanza reale stanno ampiamente sotto). */
export const MAX_BYTE_RIPRISTINO = 512 * 1024 * 1024;
/** Intestazione di ogni file SQLite 3. */
const FIRMA_SQLITE = 'SQLite format 3\0';
const NOME_DB_NELLO_ZIP = 'database/project-p5r.db';

function cartella(nome: 'immagini' | 'font' | 'backups'): string {
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
  const inMemoria = !fs.existsSync(dbPath);
  const immagini = fileDellaCartella(cartella('immagini'));
  const caratteri = fileDellaCartella(cartella('font'));
  const partite = (() => {
    try { return (getDb().prepare('SELECT COUNT(*) AS n FROM partita').get() as { n: number }).n; } catch { return 0; }
  })();
  // snapshot di avvio (file .db) e copie di ripristino (cartelle): l'utente le vede come un'unica riserva
  const copie = fs.existsSync(cartella('backups')) ? fs.readdirSync(cartella('backups'), { withFileTypes: true }).filter((v) => (v.isFile() && v.name.endsWith('.db')) || (v.isDirectory() && v.name.startsWith('prima-del-ripristino-'))).length : 0;
  return {
    versioneSchema: getDb().pragma('user_version', { simple: true }) as number,
    versioneApp: config.appVersion,
    seed: { versione: meta('versione'), hash: meta('hash'), caricatoIl: meta('caricatoIl') },
    database: { nome: config.dbFileName, byte: inMemoria ? 0 : fs.statSync(dbPath).size, inMemoria },
    immagini: { file: immagini.length, byte: immagini.reduce((s, f) => s + f.byte, 0) },
    caratteri: { file: caratteri.length, byte: caratteri.reduce((s, f) => s + f.byte, 0) },
    partite,
    copieDiSicurezza: copie,
  };
}

function cartellaTemporanea(): string {
  const dir = path.join(config.dataDir, 'tmp');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const timbro = (): string => new Date().toISOString().replace(/[:.]/g, '-');

/**
 * Copia consistente del database in un file temporaneo: chi chiama deve leggerlo e poi cancellarlo.
 * Usa l'online backup di better-sqlite3, sicuro con il WAL attivo e senza bloccare le scritture.
 */
export async function copiaDatabase(): Promise<{ percorso: string; nome: string }> {
  const percorso = path.join(cartellaTemporanea(), `esporta-${timbro()}.db`);
  await getDb().backup(percorso);
  return { percorso, nome: `project-p5r-${timbro()}.db` };
}

/** Istanza completa in uno ZIP: database, immagini caricate, caratteri e un manifesto leggibile. */
export async function copiaIstanza(): Promise<{ contenuto: Buffer; nome: string }> {
  const copia = await copiaDatabase();
  const adesso = new Date();
  const stato = statoIstanza();
  try {
    const voci: VoceZip[] = [{ nome: NOME_DB_NELLO_ZIP, contenuto: fs.readFileSync(copia.percorso), data: adesso }];
    for (const f of fileDellaCartella(cartella('immagini'))) voci.push({ nome: `immagini/${f.relativo}`, contenuto: fs.readFileSync(f.assoluto), data: adesso });
    for (const f of fileDellaCartella(cartella('font'))) voci.push({ nome: `font/${f.relativo}`, contenuto: fs.readFileSync(f.assoluto), data: adesso });
    voci.push({ nome: 'manifest.json', contenuto: Buffer.from(JSON.stringify({ esportatoIl: adesso.toISOString(), ...stato }, null, 1), 'utf-8'), data: adesso });
    voci.push({ nome: 'LEGGIMI.txt', contenuto: Buffer.from([
      'Copia completa dell\'istanza di project-p5r.',
      '',
      `Esportata il ${adesso.toISOString()} — app ${stato.versioneApp}, schema ${stato.versioneSchema}.`,
      '',
      'Contenuto:',
      `- ${NOME_DB_NELLO_ZIP}: il database SQLite (partite, tracking, catalogo caricato dal seed)`,
      '- immagini/: le immagini caricate nell\'istanza (mappe, Confidenti, Persona, spilli…)',
      '- font/: i caratteri caricati',
      '- manifest.json: versioni e conteggi al momento dell\'esportazione',
      '',
      'Per ripristinare: Impostazioni → Backup e ripristino → «Ripristina da file» e scegli questo ZIP.',
      'Il ripristino SOSTITUISCE l\'istanza corrente; prima viene salvata una copia di sicurezza in data/backups.',
      '',
    ].join('\n'), 'utf-8'), data: adesso });
    return { contenuto: creaZip(voci), nome: `project-p5r-istanza-${timbro()}.zip` };
  } finally {
    fs.rmSync(copia.percorso, { force: true });
  }
}

/** Il file è un database SQLite riconoscibile? Solo controlli sul contenuto, nessun effetto. Esportata per i test. */
export function verificaDatabase(contenuto: Buffer): void {
  if (contenuto.length < 100 || contenuto.toString('utf-8', 0, 16) !== FIRMA_SQLITE) {
    throw httpErrors.badRequest('file-non-valido', 'Il file non è un database SQLite: carica il file .db esportato dall\'app oppure lo ZIP dell\'istanza.');
  }
  const prova = path.join(cartellaTemporanea(), `verifica-${timbro()}.db`);
  fs.writeFileSync(prova, contenuto);
  try {
    const db = new Database(prova, { readonly: true });
    try {
      const esito = db.pragma('integrity_check', { simple: true }) as string;
      if (esito !== 'ok') throw httpErrors.badRequest('database-danneggiato', `Il database caricato non supera il controllo di integrità: ${esito}.`);
      const tabelle = (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>).map((r) => r.name);
      if (!tabelle.includes('partita') || !tabelle.includes('persona')) {
        throw httpErrors.badRequest('database-estraneo', 'Il database caricato non è un\'istanza di project-p5r: mancano le tabelle di base.');
      }
      const versione = db.pragma('user_version', { simple: true }) as number;
      if (versione < 1) throw httpErrors.badRequest('database-estraneo', 'Il database caricato non ha uno schema riconoscibile (nessuna migrazione applicata).');
    } finally {
      db.close();
    }
  } finally {
    fs.rmSync(prova, { force: true });
  }
}

/** Il file caricato è uno ZIP (firma «PK\x03\x04»)? */
function eZip(contenuto: Buffer): boolean {
  return contenuto.length > 4 && contenuto.readUInt32LE(0) === 0x04034b50;
}

function svuotaCartella(dir: string): void {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

/** Copie di ripristino conservate in `data/backups` (le più recenti). */
const COPIE_DI_RIPRISTINO = 3;

/** Copia di sicurezza dell'istanza attuale prima di sostituirla (database + immagini + caratteri); tiene solo le ultime copie. */
async function copiaDiSicurezza(): Promise<string> {
  const dir = path.join(cartella('backups'), `prima-del-ripristino-${timbro()}`);
  fs.mkdirSync(dir, { recursive: true });
  await getDb().backup(path.join(dir, config.dbFileName));
  for (const nome of ['immagini', 'font'] as const) {
    const base = cartella(nome);
    if (fs.existsSync(base)) fs.cpSync(base, path.join(dir, nome), { recursive: true });
  }
  const vecchie = fs.readdirSync(cartella('backups'), { withFileTypes: true })
    .filter((v) => v.isDirectory() && v.name.startsWith('prima-del-ripristino-')).map((v) => v.name).sort().reverse();
  for (const stale of vecchie.slice(COPIE_DI_RIPRISTINO)) fs.rmSync(path.join(cartella('backups'), stale), { recursive: true, force: true });
  return dir;
}

/** Rimette l'istanza salvata prima del ripristino: database (con i suoi giornali) e cartelle dei file. */
function ripristinaCopiaDiSicurezza(dir: string): void {
  const dbSalvato = path.join(dir, config.dbFileName);
  if (fs.existsSync(dbSalvato)) scriviDatabase(fs.readFileSync(dbSalvato));
  for (const nome of ['immagini', 'font'] as const) {
    svuotaCartella(cartella(nome));
    const salvata = path.join(dir, nome);
    if (fs.existsSync(salvata)) fs.cpSync(salvata, cartella(nome), { recursive: true });
  }
}

/** Scrive il database sostituendo i file dell'istanza; i giornali WAL della vecchia connessione vanno rimossi. */
function scriviDatabase(contenuto: Buffer): void {
  const dbPath = resolveDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.writeFileSync(dbPath, contenuto);
  for (const coda of ['-wal', '-shm']) fs.rmSync(`${dbPath}${coda}`, { force: true });
}

/** Riapre la connessione e riporta l'app in servizio: migrazioni, seed e cache in memoria. */
function riapriIstanza(): void {
  const db = initDb();
  runMigrations(db);
  caricaSeed(db);
  invalidaCacheTraduzioni();
  invalidaMotoreFusione();
  invalidaEredita();
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
 * Sostituisce l'istanza con il file caricato (database `.db` o ZIP dell'istanza) e riapre l'app sui dati nuovi:
 * migrazioni e seed vengono rieseguiti, le cache in memoria invalidate. In caso di errore si ripristina la copia di sicurezza.
 */
export async function ripristinaIstanza(contenuto: Buffer): Promise<EsitoRipristinoDto> {
  if (!fs.existsSync(resolveDbPath())) {
    throw httpErrors.badRequest('istanza-in-memoria', 'Questa istanza tiene il database in memoria: il ripristino da file non è disponibile.');
  }
  const zip = eZip(contenuto);
  let database: Buffer | null = null;
  let immagini: VoceZip[] = [];
  let caratteri: VoceZip[] = [];
  if (zip) {
    let voci: VoceZip[];
    try {
      voci = leggiZip(contenuto);
    } catch (err) {
      throw httpErrors.badRequest('zip-non-valido', `Lo ZIP caricato non è leggibile: ${err instanceof Error ? err.message : 'formato non riconosciuto'}.`);
    }
    const voceDb = voci.find((v) => v.nome === NOME_DB_NELLO_ZIP) ?? voci.find((v) => v.nome.startsWith('database/') && v.nome.endsWith('.db'));
    if (!voceDb) throw httpErrors.badRequest('zip-senza-database', 'Lo ZIP caricato non contiene il database dell\'istanza.');
    database = voceDb.contenuto;
    // le voci che porterebbero fuori dalla cartella dati vengono scartate, con qualunque separatore
    immagini = voci.filter((v) => v.nome.startsWith('immagini/') && destinazioneSicura('immagini', v.nome) !== null);
    caratteri = voci.filter((v) => v.nome.startsWith('font/') && destinazioneSicura('font', v.nome) !== null);
  } else {
    database = contenuto;
  }
  verificaDatabase(database);

  const salvataggio = await copiaDiSicurezza();
  closeDb();
  try {
    scriviDatabase(database);
    // lo ZIP è una copia completa dell'istanza: immagini e caratteri vengono sostituiti in blocco, anche quando il backup non ne aveva
    if (zip) {
      for (const [prefisso, voci] of [['immagini', immagini], ['font', caratteri]] as const) {
        svuotaCartella(cartella(prefisso));
        for (const v of voci) {
          const destinazione = destinazioneSicura(prefisso, v.nome);
          if (!destinazione) continue;
          fs.mkdirSync(path.dirname(destinazione), { recursive: true });
          fs.writeFileSync(destinazione, v.contenuto);
        }
      }
    }
    riapriIstanza();
  } catch (err) {
    logger.error({ err, salvataggio }, 'ripristino fallito: si torna alla copia di sicurezza');
    // prima si rimette in servizio il database (senza connessione l'app sarebbe morta fino al riavvio), poi i file
    let ripristinoFile: unknown = null;
    try {
      closeDb();
    } catch {
      // connessione già chiusa o in errore: la riapertura qui sotto la ricrea comunque
    }
    try {
      ripristinaCopiaDiSicurezza(salvataggio);
    } catch (err2) {
      ripristinoFile = err2;
      logger.error({ err: err2, salvataggio }, 'ripristino dei file della copia di sicurezza fallito: la copia resta su disco');
    }
    riapriIstanza();
    const dettaglio = ripristinoFile ? ` I file non sono tornati tutti al loro posto: la copia è in data/backups/${path.basename(salvataggio)}.` : ' L\'istanza precedente è stata rimessa com\'era.';
    throw httpErrors.badRequest('ripristino-fallito', `Ripristino non riuscito (${err instanceof Error ? err.message : 'errore sconosciuto'}).${dettaglio}`);
  }
  logger.info({ formato: zip ? 'istanza' : 'database', salvataggio }, 'istanza ripristinata da file');
  return {
    formato: zip ? 'istanza' : 'database',
    database: true,
    immagini: immagini.length,
    caratteri: caratteri.length,
    copiaDiSicurezza: path.basename(salvataggio),
    stato: statoIstanza(),
  };
}
