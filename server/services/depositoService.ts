// ============================================================
// depositoService — la cartella d'appoggio condivisa (il NAS montato sul server)
// ============================================================
//
// Una condivisione di rete montata sul server (`DEPOSITO_DIR`, in Docker `/deposito` via NFS) fa da
// tramite per i file grossi: il pacchetto di gioco e il backup dell'istanza. Ci si deposita un file e
// l'app lo importa da lì, senza farlo passare dal browser — un corpo da centinaia di MB non
// attraversa nginx né un tunnel. Nella direzione opposta, ogni scaricamento lascia qui una copia:
// il file è insieme salvato e già pronto per essere rimesso.
//
// **Qui non vive nessun database.** SQLite gira in WAL, che ha bisogno di memoria condivisa fra i
// processi: su un filesystem di rete non c'è, e il file si corromperebbe. Sul deposito stanno solo
// file di scambio, che si leggono e si riscrivono per intero.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { httpErrors } from '../utils/httpError.js';
import type { DepositoFileDto, FileDepositoDto } from '../../shared/types.js';

/** Estensioni dei file che l'app riconosce come pacchetto di gioco. */
export const ESTENSIONI_PACCHETTO = ['.db', '.sqlite', '.sqlite3'];
/** Estensioni dei file che l'app riconosce come backup dell'istanza (lo ZIP completo o il solo database). */
export const ESTENSIONI_BACKUP = ['.zip', ...ESTENSIONI_PACCHETTO];

/** La cartella d'appoggio configurata (vuota = funzione disattivata). */
export function cartellaDeposito(): string {
  return config.depositoDir;
}

/**
 * Il percorso del file dentro il deposito, se il nome non porta altrove. Solo un nome, niente
 * sottocartelle: il nome arriva dall'esterno e non deve poter descrivere un percorso.
 */
export function percorsoNelDeposito(nome: string): string {
  const cartella = cartellaDeposito();
  if (!cartella) throw httpErrors.badRequest('deposito-non-configurato', 'Nessuna cartella d\'appoggio configurata su questo server (DEPOSITO_DIR).');
  if (!nome || nome.includes('/') || nome.includes('\\') || nome === '.' || nome === '..' || path.isAbsolute(nome)) {
    throw httpErrors.badRequest('file-non-valido', 'Indica il nome di un file che sta nella cartella d\'appoggio.');
  }
  const percorso = path.resolve(cartella, nome);
  const relativo = path.relative(cartella, percorso);
  if (!relativo || relativo.startsWith('..') || path.isAbsolute(relativo)) throw httpErrors.badRequest('file-non-valido', 'Il file indicato non sta nella cartella d\'appoggio.');
  if (!fs.existsSync(percorso) || !fs.statSync(percorso).isFile()) throw httpErrors.notFound('file-non-trovato', `Nella cartella d'appoggio non c'è nessun file «${nome}».`);
  return percorso;
}

/** Che cosa c'è nella cartella d'appoggio, fra i file con le estensioni date, dal più recente. */
export function elencaDeposito(estensioni: string[]): DepositoFileDto {
  const cartella = cartellaDeposito();
  if (!cartella) return { disponibile: false, cartella: '', motivo: 'Nessuna cartella d\'appoggio configurata su questo server (DEPOSITO_DIR).', file: [] };
  let voci: fs.Dirent[];
  try {
    voci = fs.readdirSync(cartella, { withFileTypes: true });
  } catch (err) {
    // cartella non montata o non leggibile: lo si dice, invece di mostrare un elenco vuoto che sembrerebbe «nessun file»
    return { disponibile: false, cartella, motivo: `La cartella d'appoggio non è leggibile: ${err instanceof Error ? err.message : String(err)}`, file: [] };
  }
  const file: FileDepositoDto[] = [];
  for (const voce of voci) {
    if (!voce.isFile() || !estensioni.includes(path.extname(voce.name).toLowerCase())) continue;
    try {
      const st = fs.statSync(path.join(cartella, voce.name));
      file.push({ nome: voce.name, byte: st.size, modificatoIl: st.mtime.toISOString() });
    } catch {
      // sparito mentre guardavamo: non è un errore dell'elenco
    }
  }
  file.sort((a, b) => b.modificatoIl.localeCompare(a.modificatoIl));
  return { disponibile: true, cartella, motivo: null, file };
}

/** Legge un file del deposito per intero (i file di scambio pesano centinaia di MB, ma si usano tutti insieme). */
export function leggiDalDeposito(nome: string): Buffer {
  const percorso = percorsoNelDeposito(nome);
  try {
    return fs.readFileSync(percorso);
  } catch (err) {
    throw httpErrors.badRequest('lettura-fallita', `Impossibile leggere «${nome}» dalla cartella d'appoggio: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Lascia nel deposito una copia di un file appena prodotto (l'esportazione). Non è un'operazione
 * critica: se la cartella manca o il NAS non risponde, lo scaricamento deve riuscire lo stesso, quindi
 * qui non si solleva nulla e si restituisce `null`.
 */
export function depositaCopia(sorgente: string, nome: string): string | null {
  const cartella = cartellaDeposito();
  if (!cartella) return null;
  try {
    const destinazione = path.join(cartella, path.basename(nome));
    fs.copyFileSync(sorgente, destinazione);
    logger.info({ destinazione, byte: fs.statSync(destinazione).size }, 'copia depositata nella cartella d\'appoggio');
    return path.basename(nome);
  } catch (err) {
    logger.warn({ err, cartella, nome }, 'copia nella cartella d\'appoggio non riuscita: lo scaricamento prosegue');
    return null;
  }
}

/** Come `depositaCopia`, ma per un contenuto già in memoria (lo ZIP dell'istanza). */
export function depositaContenuto(contenuto: Buffer, nome: string): string | null {
  const cartella = cartellaDeposito();
  if (!cartella) return null;
  try {
    const destinazione = path.join(cartella, path.basename(nome));
    fs.writeFileSync(destinazione, contenuto);
    logger.info({ destinazione, byte: contenuto.length }, 'copia depositata nella cartella d\'appoggio');
    return path.basename(nome);
  } catch (err) {
    logger.warn({ err, cartella, nome }, 'copia nella cartella d\'appoggio non riuscita: lo scaricamento prosegue');
    return null;
  }
}
