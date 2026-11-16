// ============================================================
// versioneSchema — le versioni dei due database che questa versione dell'app sa leggere
// ============================================================
//
// L'app apre `gioco.db` e `partite.db` così come sono: non converte niente. Ogni file porta la propria versione in
// `PRAGMA user_version`, e il codice ne legge una sola per file: quella scritta qui. Un file di un'altra versione non si apre, non
// si importa e non si ripristina: il codice leggerebbe e scriverebbe tabelle che non corrispondono al suo modello.
//
// Chi cambia la struttura o i dati di uno dei due file alza la costante corrispondente insieme al file che l'app distribuisce
// (`pacchetto/gioco.db` per i dati di gioco, `pacchetto/partite-vuoto.db` per le partite).
// ============================================================

import type Database from 'better-sqlite3';
import { config } from '../config.js';

/** La versione di `gioco.db` (schema `main`) che il codice legge. */
export const VERSIONE_GIOCO = 390;
/** La versione di `partite.db` (schema `utente`) che il codice legge. */
export const VERSIONE_PARTITE = 74;

/** Quale dei due file dell'istanza ha una versione diversa da quella attesa. */
export type FileVersionato = 'gioco' | 'partite';

/** Uno dei due database non è alla versione che il codice legge: l'apertura si ferma. */
export class ErroreVersioneDati extends Error {
  constructor(
    public readonly file: FileVersionato,
    public readonly trovata: number,
    public readonly attesa: number,
  ) {
    super(messaggioVersioneDiversa(file, trovata, attesa));
    this.name = 'ErroreVersioneDati';
  }
}

/** La frase che dice quale file, a che versione è, quale ci si aspetta e che cosa fare. La usano l'apertura, «Importa» e il ripristino. */
export function messaggioVersioneDiversa(file: FileVersionato, trovata: number, attesa: number): string {
  const [nome, cosa] = file === 'gioco' ? [config.dbFileName, 'dei dati di gioco'] : [config.partiteFileName, 'delle partite'];
  return `Il file ${cosa} (${nome}) è alla versione ${trovata}, questa versione dell'app legge solo la ${attesa}: nessuna conversione automatica. `
    + `Usa la versione dell'app che corrisponde a questi dati, oppure dati alla versione ${attesa}.`;
}

/**
 * Verifica che i due file della connessione (`main` = gioco.db, `utente` = partite.db) siano alla versione attesa. Lancia
 * `ErroreVersioneDati` al primo che non lo è; non scrive niente.
 */
export function verificaVersioni(db: Database.Database): void {
  const gioco = db.pragma('main.user_version', { simple: true }) as number;
  if (gioco !== VERSIONE_GIOCO) throw new ErroreVersioneDati('gioco', gioco, VERSIONE_GIOCO);
  const partite = db.pragma('utente.user_version', { simple: true }) as number;
  if (partite !== VERSIONE_PARTITE) throw new ErroreVersioneDati('partite', partite, VERSIONE_PARTITE);
}
