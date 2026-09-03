// ============================================================
// Percorsi della pipeline seed
// ============================================================

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const QUI = path.dirname(fileURLToPath(import.meta.url));

/** Radice del repository. */
export const RADICE = path.resolve(QUI, '..', '..');
/** Cartella del seed versionato (copiata nell'immagine Docker). */
export const DIR_SEED = path.join(RADICE, 'data', 'seed');
/** File grezzi scaricati dalle fonti, per id fonte. */
export const DIR_SORGENTI = path.join(DIR_SEED, 'sorgenti');
/** Manifest dei download (URL, hash, data). */
export const FILE_MANIFEST = path.join(DIR_SORGENTI, 'manifest.json');

/** Percorso locale di un file grezzo di una fonte. */
export function percorsoSorgente(idFonte: string, percorsoRepo: string): string {
  return path.join(DIR_SORGENTI, idFonte, percorsoRepo.replace(/\//g, path.sep));
}
