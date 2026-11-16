// ============================================================
// backupUtente — la copia periodica dell'avanzamento, nelle due istanze (L12, passo 4; progetto §6)
// ============================================================
//
// Quello che non si rifà è `partite.db`, l'avanzamento di chi gioca. Si copia solo lo schema `utente` (API di backup online, sicura
// con il WAL) all'avvio e ogni 6 ore, in `config.backupDir`, tenendo le ultime `COPIE_DA_TENERE`. Una copia fallita è un errore nel
// log e non ferma l'istanza: giocare è più importante.
//   - Rilascio: `gioco.db` è un file dell'edizione, uguale a quello che si ripubblica, e non c'è nulla da salvare; le copie vanno in
//     un volume a parte (`BACKUP_DIR`): se si perde quello delle partite restano.
//   - Preparazione: le copie vanno in `DATA_DIR/backups`, accanto a quelle fatte prima di «Importa» e del ripristino; `gioco.db` si
//     salva a mano dal backup dell'istanza. Un giro non comincia mentre una sostituzione dei file è in corso (`salta`); uno già
//     avviato quando la sostituzione chiude la connessione fallisce, toglie il suo file a metà e lo dice nel log. La copia
//     dell'avvio si salta se l'ultima è recente (`recenteMs`): in sviluppo il backend riparte a ogni salvataggio, e senza questo le
//     copie di pochi minuti scaccerebbero quelle dei giorni scorsi.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { copiaSchema, getDb } from '../db/dbService.js';
import { logger } from '../utils/logger.js';

/** Ogni quanto si copia l'avanzamento. */
export const INTERVALLO_COPIA_MS = 6 * 60 * 60 * 1000;
/** Quante copie si tengono: 7 giorni a 4 al giorno, più qualche riavvio. */
export const COPIE_DA_TENERE = 40;
const PREFISSO = 'partite-';

/** Toglie le copie più vecchie (e i giornali che hanno lasciato) oltre `COPIE_DA_TENERE`. Esportata per chi la collauda. */
export function ruotaCopieUtente(cartella: string, tenere: number = COPIE_DA_TENERE): void {
  const copie = fs.readdirSync(cartella).filter((f) => f.startsWith(PREFISSO) && f.endsWith('.db')).sort().reverse();
  for (const vecchia of copie.slice(tenere)) {
    for (const coda of ['', '-wal', '-shm']) fs.rmSync(path.join(cartella, `${vecchia}${coda}`), { force: true });
  }
}

/** Fa una copia di `utente` ora. Non lancia: restituisce il percorso della copia o null (l'errore è nel log). */
export async function copiaUtente(cartella: string = config.backupDir): Promise<string | null> {
  const timbro = new Date().toISOString().replace(/[:.]/g, '-');
  const destinazione = path.join(cartella, `${PREFISSO}${timbro}.db`);
  try {
    fs.mkdirSync(cartella, { recursive: true });
    await copiaSchema(getDb(), destinazione, 'utente');
  } catch (err) {
    // una copia a metà non deve restare fra quelle buone
    for (const coda of ['', '-wal', '-shm']) fs.rmSync(`${destinazione}${coda}`, { force: true });
    logger.error({ err, cartella }, 'copia dell\'avanzamento non riuscita: l\'istanza continua, ma l\'avanzamento non è al sicuro finché non riesce');
    return null;
  }
  logger.info({ destinazione }, 'copia dell\'avanzamento completata');
  try {
    ruotaCopieUtente(cartella);
  } catch (err) {
    // la copia c'è: la rotazione che non riesce non è un motivo per segnalare un fallimento
    logger.warn({ err }, 'rotazione delle copie dell\'avanzamento non riuscita');
  }
  return destinazione;
}

/** Da quanti millisecondi è stata fatta l'ultima copia della cartella; `Infinity` se non ce ne sono o la cartella non si legge. */
function etaUltimaCopiaMs(cartella: string): number {
  try {
    const ultima = fs.readdirSync(cartella).filter((f) => f.startsWith(PREFISSO) && f.endsWith('.db')).sort().at(-1);
    return ultima ? Date.now() - fs.statSync(path.join(cartella, ultima)).mtimeMs : Infinity;
  } catch {
    return Infinity;
  }
}

/**
 * Copia subito e poi ogni 6 ore. Il timer non tiene vivo il processo (`unref`) e salta il giro se la copia precedente è ancora in
 * corso o se `salta` risponde vero (la connessione sta per essere chiusa e riaperta: il giro dopo copierà i file nuovi). Con
 * `recenteMs` maggiore di zero la copia dell'avvio non si fa se l'ultima ha meno di quei millisecondi. Restituisce la funzione che
 * lo ferma.
 */
export function avviaCopieUtente(cartella: string = config.backupDir, salta: () => boolean = () => false, recenteMs = 0): () => void {
  let incorso = false;
  const giro = async (): Promise<void> => {
    if (incorso || salta()) return;
    incorso = true;
    try { await copiaUtente(cartella); } finally { incorso = false; }
  };
  const lanciaGiro = (): void => { giro().catch((err: unknown) => logger.error({ err }, 'giro della copia dell\'avanzamento non riuscito')); };
  if (!(recenteMs > 0 && etaUltimaCopiaMs(cartella) < recenteMs)) lanciaGiro();
  const timer = setInterval(lanciaGiro, INTERVALLO_COPIA_MS);
  timer.unref();
  return () => clearInterval(timer);
}
