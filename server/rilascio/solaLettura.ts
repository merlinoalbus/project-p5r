// ============================================================
// solaLettura — il terzo livello di difesa di `gioco.db` nell'istanza di rilascio (L12, passo 4; progetto §2)
// ============================================================
//
// I tre livelli: (1) il volume dell'edizione montato `:ro`, il file 0444 e il processo non root; (2) l'edizione prodotta con
// `VACUUM INTO` e `journal_mode = DELETE`, senza WAL; (3) questo controllo, all'avvio: una scrittura di prova su `main` DEVE fallire
// con `SQLITE_READONLY`. Se riesce, qualcuno ha sbagliato il montaggio e l'istanza non parte: meglio un contenitore fermo di
// un'istanza pubblica che può riscrivere i contenuti.
//
// La prova sta in un SAVEPOINT che si annulla comunque, e passa da una `CREATE TABLE` (che non esiste in nessuno schema vero):
// se per assurdo riuscisse, il `ROLLBACK TO` la disfa prima che chiunque la veda.
// ============================================================

import type { AppDatabase } from '../db/dbService.js';

/** L'errore di una prova di sola lettura non superata: l'avvio si ferma. */
export class ErroreSolaLettura extends Error {
  constructor(messaggio: string, opzioni?: ErrorOptions) {
    super(messaggio, opzioni);
    this.name = 'ErroreSolaLettura';
  }
}

/**
 * Verifica che `main` (gioco.db) sia in sola lettura e senza WAL. Lancia `ErroreSolaLettura` se il giornale non è `delete` o se
 * una scrittura di prova riesce o fallisce per un motivo diverso da `SQLITE_READONLY` (un errore diverso non prova nulla).
 */
export function verificaSolaLettura(db: AppDatabase): void {
  // un file in WAL non si apre su un volume in sola lettura e un'edizione deve averlo tolto (`journal_mode = DELETE`)
  const giornale = String(db.pragma('main.journal_mode', { simple: true })).toLowerCase();
  if (giornale !== 'delete') {
    throw new ErroreSolaLettura(`l'edizione di gioco ha il giornale «${giornale}» invece di «delete»: va prodotta con VACUUM INTO e journal_mode=DELETE (Prepara edizione).`);
  }

  let riuscita = false;
  let codice: string | undefined;
  let causa: unknown;
  db.exec('SAVEPOINT prova_sola_lettura');
  try {
    db.exec('CREATE TABLE main.prova_sola_lettura_p5r (x INTEGER)');
    riuscita = true;
  } catch (err) {
    causa = err;
    codice = (err as { code?: string }).code;
  } finally {
    // qualunque cosa sia successa, la prova non lascia niente: ROLLBACK TO annulla, RELEASE chiude il savepoint
    try {
      db.exec('ROLLBACK TO prova_sola_lettura');
      db.exec('RELEASE prova_sola_lettura');
    } catch {
      // se anche questo fallisce, la connessione è in uno stato che l'avvio non deve usare: lo decide il controllo qui sotto
    }
  }

  if (riuscita) {
    throw new ErroreSolaLettura('gioco.db è scrivibile: la scrittura di prova è riuscita (annullata). Monta il volume dell\'edizione in sola lettura (:ro), file 0444, processo non root.');
  }
  if (!codice?.startsWith('SQLITE_READONLY')) {
    throw new ErroreSolaLettura(`la scrittura di prova su gioco.db è fallita per un motivo inatteso (${codice ?? 'senza codice'}), non per la sola lettura: ${causa instanceof Error ? causa.message : String(causa)}`, { cause: causa });
  }
}
