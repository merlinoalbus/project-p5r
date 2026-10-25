// ============================================================
// backupUtente — la copia dell'avanzamento nell'istanza di rilascio (L12, passo 4; progetto §6)
// ============================================================
//
// Nel rilascio `gioco.db` è un file dell'edizione, uguale a quello che si ripubblica: non c'è nulla da salvare. Quello che non si
// rifà è `partite.db`, l'avanzamento di chi gioca. Si copia solo lo schema `utente` (API di backup online, sicura con il WAL)
// all'avvio e ogni 6 ore, in `config.backupDir` (un volume a parte: se si perde quello delle partite le copie restano), tenendo
// le ultime `COPIE_DA_TENERE`. A differenza del backup di avvio della preparazione (`backupService`) non ha niente da proteggere
// prima di una migrazione, perciò una copia fallita è un errore nel log e non ferma l'istanza: giocare è più importante.
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

/**
 * Copia subito e poi ogni 6 ore. Il timer non tiene vivo il processo (`unref`) e salta il giro se la copia precedente è ancora in
 * corso. Restituisce la funzione che lo ferma.
 */
export function avviaCopieUtente(cartella: string = config.backupDir): () => void {
  let incorso = false;
  const giro = async (): Promise<void> => {
    if (incorso) return;
    incorso = true;
    try { await copiaUtente(cartella); } finally { incorso = false; }
  };
  void giro();
  const timer = setInterval(() => { void giro(); }, INTERVALLO_COPIA_MS);
  timer.unref();
  return () => clearInterval(timer);
}
