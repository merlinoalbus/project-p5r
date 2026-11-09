// ============================================================
// archivioL1 — gli attrezzi d'archivio e d'audit delle migrazioni del lotto L1 «Un solo dove» (344, 345, 346)
// ============================================================
//
// Due cose che le migrazioni che tolgono testi e colonne devono fare e che `pulizieL11.archiviaFrasi` non fa da sola:
//   - `archiviaSenzaSovrascrivere`: aggiunge righe a una colonna del blocco `dati_guida.archivio-frasi-l11` SENZA mai riscrivere una riga già
//     archiviata (vince la prima copia, che è il testo originale): una seconda esecuzione, o una colonna che due migrazioni toccano, non
//     sostituisce l'originale con un testo già ripulito;
//   - `registraAudit`: scrive in `dati_guida` il verbale di una migrazione (che cosa ha cambiato, con le prove) in un blocco proprio, accodando
//     una voce per ogni esecuzione che ha cambiato qualcosa.
// Nessun import da `server/services/`; non si scrive in `utente`.
// ============================================================

import type { AppDatabase } from '../dbService.js';
import { ARCHIVIO_FRASI, archiviaFrasi, type RigheArchiviate } from './pulizieL11.js';

/** Il blocco d'archivio com'è ora (vuoto se non c'è ancora). */
function leggiArchivio(db: AppDatabase): { colonne?: Record<string, RigheArchiviate> } {
  const json = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(ARCHIVIO_FRASI) as string | undefined;
  return json ? JSON.parse(json) as { colonne?: Record<string, RigheArchiviate> } : {};
}

/** Le righe di una colonna d'archivio già presenti (chiave della riga → valore), prima di aggiungerne. */
export function righeArchiviate(db: AppDatabase, colonna: string): RigheArchiviate {
  return leggiArchivio(db).colonne?.[colonna] ?? {};
}

/**
 * Aggiunge `righe` alla colonna d'archivio. Una riga già archiviata con la stessa chiave NON si tocca. Restituisce quante righe sono nuove.
 * Senza righe nuove non scrive nulla.
 */
export function archiviaSenzaSovrascrivere(db: AppDatabase, migrazione: string, colonna: string, righe: RigheArchiviate): number {
  const presenti = righeArchiviate(db, colonna);
  const nuove = Object.fromEntries(Object.entries(righe).filter(([chiave]) => !(chiave in presenti)));
  if (Object.keys(nuove).length === 0) return 0;
  archiviaFrasi(db, migrazione, { [colonna]: { ...presenti, ...nuove } }, {});
  return Object.keys(nuove).length;
}

/** Quante righe ha la colonna d'archivio (per il controllo «righe archiviate = righe tolte»). */
export function conteggioArchivio(db: AppDatabase, colonna: string): number {
  return Object.keys(righeArchiviate(db, colonna)).length;
}

/**
 * Accoda una voce al verbale `chiave` di `dati_guida` (`{ versione, voci: [...] }`). Il verbale è l'audit della migrazione: che cosa è stato
 * cambiato, con quali prove. Va chiamata solo se la migrazione ha cambiato qualcosa, così una seconda esecuzione non aggiunge voci.
 */
export function registraAudit(db: AppDatabase, chiave: string, voce: Record<string, unknown>): void {
  const esistente = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(chiave) as string | undefined;
  const blocco = esistente ? JSON.parse(esistente) as { voci?: unknown[] } : {};
  const nuovo = { versione: 1, voci: [...(blocco.voci ?? []), voce] };
  db.prepare('INSERT OR REPLACE INTO main.dati_guida (chiave, json) VALUES (?, ?)').run(chiave, JSON.stringify(nuovo));
}
