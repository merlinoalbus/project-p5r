// ============================================================
// backupService — backup rotante del file SQLite a ogni boot
// ============================================================
//
// Gira PRIMA di runMigrations(): ogni migrazione di schema è preceduta
// da uno snapshot. Usa l'API online-backup di better-sqlite3, l'unica
// sicura con WAL attivo. Rotazione: ultime 7 copie e al più `TETTO_BYTE_COPIE` in tutto, ma le `COPIE_SEMPRE_TENUTE` più recenti restano
// sempre (L5-10: ogni copia pesa quanto il gioco, centinaia di MB).
// Se ci sono migrazioni da applicare e la copia fallisce, `runBootBackup` lancia: il boot si ferma (index.ts), perché le
// migrazioni non hanno marcia indietro. Senza migrazioni in arrivo non si copia nulla.
// Dalla 079 il file di gioco porta dentro le immagini (centinaia di MB): lo
// snapshot si fa solo quando c'è davvero una migrazione da applicare, non a
// ogni avvio, altrimenti sette copie riempirebbero il disco per nulla.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { copiaSchema, getDb, resolveDbPath, resolvePartitePath } from './dbService.js';
import { migrations } from './migrations/index.js';
import { migrazioniUtente } from './migrazioniUtente/index.js';

const KEEP_LAST = 7;
const PREFIX = 'project-p5r-';

/** Toglie i giornali (`-wal`/`-shm`) delle copie di avvio rimasti senza il loro database: le rotazioni di prima toglievano solo
 *  il `.db`, e in `data/backups` ne restavano a decine. Esportata per i test. */
export function pulisciGiornaliOrfani(backupsDir: string): void {
  if (!fs.existsSync(backupsDir)) return;
  for (const f of fs.readdirSync(backupsDir)) {
    const base = f.match(/^(.*\.db)-(?:wal|shm)$/)?.[1];
    if (base && f.startsWith(PREFIX) && !fs.existsSync(path.join(backupsDir, base))) fs.rmSync(path.join(backupsDir, f), { force: true });
  }
}

/** Le copie di avvio che non si tolgono mai per il peso: le più recenti con il gioco leggibile (non vuoto). Sono la rete di sicurezza dei dati. */
export const COPIE_SEMPRE_TENUTE = 2;
/** Il peso massimo delle copie di avvio conservate (gioco + partite + giornali di ognuna): oltre, le più vecchie se ne vanno (L5-10).
 *  Con `gioco.db` di ~415 MB, sette copie erano ~2,9 GB. Le `COPIE_SEMPRE_TENUTE` più recenti restano comunque, anche se da sole superano il tetto. */
export const TETTO_BYTE_COPIE = 2 * 1024 ** 3;

/** I byte di una copia di avvio: il gioco e le partite accanto con i giornali di entrambe (i file mancanti valgono 0). */
function pesoDellaCopia(backupsDir: string, nomeGioco: string): number {
  let byte = 0;
  for (const nome of [nomeGioco, nomeGioco.replace(/\.db$/, '.partite.db')]) {
    for (const coda of ['', '-wal', '-shm']) {
      try { byte += fs.statSync(path.join(backupsDir, `${nome}${coda}`)).size; } catch { /* file assente: 0 */ }
    }
  }
  return byte;
}

/** Vero se il file di gioco della copia esiste e non è vuoto: una copia vuota non è una rete di sicurezza e non protegge dalla rotazione. */
function copiaLeggibile(backupsDir: string, nomeGioco: string): boolean {
  try { return fs.statSync(path.join(backupsDir, nomeGioco)).size > 0; } catch { return false; }
}

/**
 * Tiene le copie di avvio più recenti entro due tetti: al più `KEEP_LAST` copie e al più `tettoByte` in tutto. Le prime
 * `COPIE_SEMPRE_TENUTE` copie con il file di gioco non vuoto non si toccano mai (nemmeno se pesano più del tetto); fra le altre, la prima
 * che sfora uno dei due tetti toglie anche tutte le più vecchie (una serie continua; l'unico buco possibile è una copia vuota o che sfora
 * prima di una protetta, perché le due protette valgono più della continuità). Una copia vecchia se ne va con le partite accanto e con
 * i giornali di entrambe (`-wal`/`-shm`): prima si toglieva solo il `.db`, e i giornali restavano a decine. Esportata per i test.
 */
export function ruotaCopieDiAvvio(backupsDir: string, tettoByte: number = TETTO_BYTE_COPIE): void {
  const copie = fs
    .readdirSync(backupsDir)
    .filter((f) => f.startsWith(PREFIX) && f.endsWith('.db') && !f.endsWith('.partite.db'))
    .sort()
    .reverse();
  let protette = 0;
  let conservate = 0;
  let byteConservati = 0;
  let taglia = false;
  const daTogliere: Array<{ nome: string; byte: number }> = [];
  for (const nome of copie) {
    const byte = pesoDellaCopia(backupsDir, nome);
    if (protette < COPIE_SEMPRE_TENUTE && copiaLeggibile(backupsDir, nome)) {
      protette++; conservate++; byteConservati += byte;
      continue;
    }
    if (!taglia && (conservate >= KEEP_LAST || byteConservati + byte > tettoByte)) taglia = true;
    if (taglia) daTogliere.push({ nome, byte });
    else { conservate++; byteConservati += byte; }
  }
  for (const vecchia of daTogliere) {
    for (const nome of [vecchia.nome, vecchia.nome.replace(/\.db$/, '.partite.db')]) {
      for (const coda of ['', '-wal', '-shm']) fs.rmSync(path.join(backupsDir, `${nome}${coda}`), { force: true });
    }
  }
  if (daTogliere.length > 0) logger.info({ tolte: daTogliere.map((c) => c.nome), byteTolti: daTogliere.reduce((s, c) => s + c.byte, 0), conservate, byteConservati, tettoByte }, 'rotazione delle copie di avvio');
  pulisciGiornaliOrfani(backupsDir);
}

/** Crea una copia consistente di entrambi i file e conserva gli ultimi 7 snapshot. Lancia se la copia è necessaria e non riesce. */
export async function runBootBackup(): Promise<void> {
  const dbPath = resolveDbPath();
  if (!fs.existsSync(dbPath)) {
    return;
  }
  try {
    pulisciGiornaliOrfani(path.join(config.dataDir, 'backups'));
  } catch (err) {
    logger.warn({ err }, 'pulizia dei giornali delle copie di avvio non riuscita — si prosegue');
  }
  const versioneGioco = getDb().pragma('main.user_version', { simple: true }) as number;
  const versionePartite = getDb().pragma('utente.user_version', { simple: true }) as number;
  // Entrambi i file appena creati (nessuna migrazione applicata): nulla da salvare. Se gioco.db è nuovo ma partite.db ha già
  // avanzamento, le migrazioni delle partite girano comunque e la copia serve (la versione del solo `main` non basta a deciderlo).
  if (versioneGioco === 0 && versionePartite === 0) {
    return;
  }
  // nessuna migrazione in arrivo su nessuno dei due file: lo snapshot non serve
  if (!migrations.some((m) => m.id > versioneGioco) && !migrazioniUtente.some((m) => m.id > versionePartite)) {
    logger.debug({ versioneGioco, versionePartite }, 'backup di avvio saltato: nessuna migrazione da applicare');
    return;
  }

  const backupsDir = path.join(config.dataDir, 'backups');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = path.join(backupsDir, `${PREFIX}${stamp}.db`);
  // il file delle partite accanto, con lo stesso timbro: le due copie vanno insieme
  const targetPartite = path.join(backupsDir, `${PREFIX}${stamp}.partite.db`);
  try {
    fs.mkdirSync(backupsDir, { recursive: true });
    await copiaSchema(getDb(), target, 'main');
    if (fs.existsSync(resolvePartitePath())) await copiaSchema(getDb(), targetPartite, 'utente');
  } catch (err) {
    // Le migrazioni non hanno marcia indietro (la copia di avvio è l'unica via di ritorno): senza copia non si migra. Si toglie
    // quel che la copia fallita ha lasciato a metà e si ferma l'avvio, con la causa nel messaggio.
    for (const f of [target, targetPartite]) for (const coda of ['', '-wal', '-shm']) fs.rmSync(`${f}${coda}`, { force: true });
    const motivo = err instanceof Error ? err.message : String(err);
    throw new Error(`copia di sicurezza di avvio non riuscita (${motivo}): le migrazioni in attesa non vengono applicate. Libera spazio o controlla i permessi di ${backupsDir} e riavvia.`, { cause: err });
  }
  logger.info({ target, targetPartite }, 'backup di avvio completato');
  try {
    ruotaCopieDiAvvio(backupsDir);
  } catch (err) {
    // la copia c'è: la rotazione che non riesce non deve fermare l'avvio
    logger.warn({ err }, 'rotazione delle copie di avvio non riuscita — si prosegue');
  }
}
