// ============================================================
// passaggioVersione — l'unico passaggio automatico: dalla versione immediatamente precedente a quella che il codice legge
// ============================================================
//
// Una versione rilasciata deve partire sui dati che l'istanza ha già, senza che nessuno intervenga a mano. Per questo, e solo per
// questo, l'avvio porta ciascun file dalla versione IMMEDIATAMENTE PRECEDENTE a quella attuale (`PASSAGGI`):
//   - ADDITIVO: crea gli oggetti che mancano (tabelle e indici). Non modifica, non toglie e non converte niente di ciò che c'è;
//   - IDENTICO ai file distribuiti: il testo di creazione di ogni oggetto si legge da `pacchetto/gioco.db` e da
//     `pacchetto/partite-vuoto.db` (`sqlite_master.sql`), mai riscritto qui, e dopo la creazione si confronta con l'originale:
//     l'impronta della struttura (`improntaSchema`) deve restare quella dei file distribuiti;
//   - IDEMPOTENTE: un file già alla versione attesa non si tocca (nessuna scrittura, nessun log);
//   - CAUTO: una versione diversa dalla precedente non si tocca e la verifica che segue (`verificaVersioni`) ferma l'avvio come sempre;
//     un oggetto che esiste già in un file ancora alla versione precedente è un errore (mai sovrascritto);
//   - ATOMICO: tabelle, indici e versione entrano in una sola transazione, quindi un passaggio che non riesce non lascia traccia;
//   - COPIA DI SICUREZZA solo dove servono i dati: prima di toccare le partite (piccolo, insostituibile) se ne fa una copia in
//     `config.backupDir`, con un nome fuori dalla rotazione delle copie periodiche; se non riesce, non si scrive. I dati di gioco non hanno
//     copia (sono grandi per le immagini e il passaggio aggiunge solo strutture vuote, in una transazione).
//   - Dopo il passaggio un'immagine dell'app della versione precedente non riparte sui file passati: serve ripristinare la copia delle
//     partite e togliere le strutture aggiunte (o rimettere i file di prima).
//
// Non è un sistema di migrazioni: ogni cambio di struttura porta il proprio passaggio additivo nello stesso cambiamento che alza
// `VERSIONE_GIOCO` o `VERSIONE_PARTITE`, e toglie quello della versione prima (si passa solo dalla precedente). Solo l'avvio della
// preparazione lo chiama (`server/index.ts`): «Importa», anteprima, ripristino, edizione di rilascio e script aprono un file esterno
// e lo rifiutano se non è alla versione attesa. I dati non si convertono mai.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { percorsoPacchettoDb } from '../services/pacchetto/pacchettoGioco.js';
import { percorsoModelloPartite, qualificaConSchema, type OggettoSchema } from './partiteVuote.js';
import { VERSIONE_GIOCO, VERSIONE_PARTITE, type FileVersionato } from './versioneSchema.js';

/** Il passaggio non è riuscito (o non si può fare): l'avvio si ferma, e il file non è stato modificato. */
export class ErrorePassaggioVersione extends Error {
  constructor(messaggio: string, opzioni?: { cause?: unknown }) {
    super(messaggio, opzioni);
    this.name = 'ErrorePassaggioVersione';
  }
}

/** Il passaggio di un file: da quale versione, a quale, con quali oggetti e da quale file distribuito se ne leggono i testi. */
interface Passaggio {
  file: FileVersionato;
  schema: 'main' | 'utente';
  /** La versione da cui si parte: sempre `a - 1`. */
  da: number;
  /** La versione a cui si arriva: sempre quella che il codice legge. */
  a: number;
  /** Il file distribuito (alla versione `a`) da cui si leggono i testi di creazione. */
  origine: () => string;
  /** Gli oggetti da creare, nell'ordine di creazione: prima le tabelle, poi gli indici (le chiavi automatiche nascono con la tabella). */
  oggetti: readonly string[];
  /** Se prima di scrivere si fa la copia di sicurezza del file (le partite sì, i dati di gioco no). */
  conCopia: boolean;
}

/**
 * I passaggi in vigore: quelli di questa versione, da 390→391 (dati di gioco) e da 74→75 (partite). Chi alza una costante di
 * `versioneSchema.ts` riscrive qui l'elenco con gli oggetti nuovi di quel cambiamento.
 */
const PASSAGGI: readonly Passaggio[] = [
  {
    file: 'gioco',
    schema: 'main',
    da: 390,
    a: VERSIONE_GIOCO,
    origine: percorsoPacchettoDb,
    oggetti: ['voce_requisito_scorta', 'voce_requisito_scorta_unico', 'voce_requisito_scorta_persona'],
    conCopia: false,
  },
  {
    file: 'partite',
    schema: 'utente',
    da: 74,
    a: VERSIONE_PARTITE,
    origine: percorsoModelloPartite,
    oggetti: ['spunta_requisito_voce_partita', 'spunta_requisito_voce_partita_voce'],
    conCopia: true,
  },
];

/** Che cosa ha fatto il passaggio di un file. */
export interface EsitoPassaggio {
  file: FileVersionato;
  da: number;
  a: number;
  oggettiCreati: string[];
  /** Il percorso della copia di sicurezza fatta prima di scrivere (null se per quel file non si fa). */
  copia: string | null;
}

/** Le opzioni di `portaAllaVersioneAttuale` (i valori di serie sono quelli dell'istanza). */
export interface OpzioniPassaggio {
  /** Dove si scrivono le copie di sicurezza (`config.backupDir`). */
  cartellaCopie?: string;
}

/** Un testo fra apici SQL (il percorso di `VACUUM INTO`). */
const apiciSql = (testo: string): string => `'${testo.replaceAll("'", "''")}'`;

/** Il momento nel nome della copia, nella stessa forma delle copie periodiche dell'avanzamento (`rilascio/backupUtente.ts`). */
const timbroCopia = (): string => new Date().toISOString().replace(/[:.]/g, '-');

/**
 * I testi di creazione degli oggetti del passaggio, letti dal file distribuito in sola lettura. Lancia se il file manca, non è alla
 * versione di arrivo o non contiene uno degli oggetti: il pacchetto e le costanti vanno aggiornati insieme.
 */
function leggiDefinizioni(passaggio: Passaggio): OggettoSchema[] {
  const percorso = passaggio.origine();
  if (!fs.existsSync(percorso)) {
    throw new ErrorePassaggioVersione(`Il file distribuito (${path.basename(percorso)}) da cui si leggono le strutture nuove manca (${percorso}): senza non si può portare ${nomeFile(passaggio)} alla versione ${passaggio.a}.`);
  }
  const sorgente = new Database(percorso, { readonly: true, fileMustExist: true });
  try {
    const versione = sorgente.pragma('user_version', { simple: true }) as number;
    if (versione !== passaggio.a) {
      throw new ErrorePassaggioVersione(`Il file distribuito ${path.basename(percorso)} è alla versione ${versione}, questa versione dell'app vuole la ${passaggio.a}: va rigenerato insieme alla struttura.`);
    }
    const cerca = sorgente.prepare('SELECT type, name, sql FROM sqlite_master WHERE name = ?');
    return passaggio.oggetti.map((nome) => {
      const trovato = cerca.get(nome) as { type: string; name: string; sql: string | null } | undefined;
      if (!trovato?.sql) {
        throw new ErrorePassaggioVersione(`Il file distribuito ${path.basename(percorso)} non contiene la struttura «${nome}» che il passaggio alla versione ${passaggio.a} deve creare: il file e l'elenco in passaggioVersione.ts non corrispondono.`);
      }
      return { type: trovato.type, name: trovato.name, sql: trovato.sql };
    });
  } finally {
    sorgente.close();
  }
}

/** Il nome del file dell'istanza, per i messaggi. */
function nomeFile(passaggio: Passaggio): string {
  return passaggio.file === 'gioco' ? config.dbFileName : config.partiteFileName;
}

/** La copia di sicurezza di uno schema, intera e consistente (`VACUUM INTO`, fuori da ogni transazione). Lancia se non riesce. */
function copiaDiSicurezza(db: Database.Database, passaggio: Passaggio, cartella: string): string {
  // il nome non comincia per `partite-`: le copie periodiche dell'avanzamento (`rilascio/backupUtente.ts`) scelgono e ruotano i file con quel prefisso
  const destinazione = path.join(cartella, `prima-del-passaggio-${passaggio.file}-${passaggio.a}-${timbroCopia()}.db`);
  try {
    fs.mkdirSync(cartella, { recursive: true });
    db.exec(`VACUUM ${passaggio.schema} INTO ${apiciSql(destinazione)}`);
    // la copia deve aprirsi ed essere alla versione di partenza: una copia che non si legge non è una copia
    const copia = new Database(destinazione, { readonly: true, fileMustExist: true });
    try {
      const versione = copia.pragma('user_version', { simple: true }) as number;
      if (versione !== passaggio.da) throw new Error(`la copia è alla versione ${versione} invece che alla ${passaggio.da}`);
    } finally {
      copia.close();
    }
  } catch (err) {
    // una copia a metà non deve restare fra quelle buone
    for (const coda of ['', '-wal', '-shm']) fs.rmSync(`${destinazione}${coda}`, { force: true });
    throw new ErrorePassaggioVersione(
      `La copia di sicurezza di ${nomeFile(passaggio)} prima del passaggio alla versione ${passaggio.a} non è riuscita (${err instanceof Error ? err.message : String(err)}): il file non è stato modificato.`,
      { cause: err },
    );
  }
  return destinazione;
}

/** Il passaggio di un file, già riconosciuto alla versione di partenza: controlli, copia di sicurezza, creazione in una transazione. */
function eseguiPassaggio(db: Database.Database, passaggio: Passaggio, cartellaCopie: string): EsitoPassaggio {
  if (passaggio.da !== passaggio.a - 1) {
    throw new ErrorePassaggioVersione(`Il passaggio di ${nomeFile(passaggio)} (da ${passaggio.da} a ${passaggio.a}) non parte dalla versione immediatamente precedente: passaggioVersione.ts non è stato aggiornato insieme alla versione.`);
  }
  const definizioni = leggiDefinizioni(passaggio);
  const esiste = db.prepare(`SELECT 1 FROM ${passaggio.schema}.sqlite_master WHERE name = ?`);
  for (const o of definizioni) {
    if (esiste.get(o.name)) {
      throw new ErrorePassaggioVersione(`${nomeFile(passaggio)} è alla versione ${passaggio.da} ma contiene già «${o.name}»: non si sovrascrive. Il file non è stato modificato; serve un intervento a mano sui dati.`);
    }
  }
  const copia = passaggio.conCopia ? copiaDiSicurezza(db, passaggio, cartellaCopie) : null;
  try {
    db.transaction(() => {
      for (const o of definizioni) db.exec(qualificaConSchema(o, passaggio.schema));
      // il testo registrato deve essere quello del file distribuito, carattere per carattere (l'impronta della struttura lo usa)
      const registrato = db.prepare(`SELECT sql FROM ${passaggio.schema}.sqlite_master WHERE name = ?`).pluck();
      for (const o of definizioni) {
        if (registrato.get(o.name) !== o.sql) throw new Error(`il testo di «${o.name}» creato non coincide con quello del file distribuito`);
      }
      db.pragma(`${passaggio.schema}.user_version = ${passaggio.a}`);
    }).immediate();
  } catch (err) {
    throw new ErrorePassaggioVersione(
      `Il passaggio di ${nomeFile(passaggio)} dalla versione ${passaggio.da} alla ${passaggio.a} non è riuscito (${err instanceof Error ? err.message : String(err)}): nessuna modifica è stata applicata.${copia ? ` Copia di sicurezza: ${copia}.` : ''}`,
      { cause: err },
    );
  }
  return { file: passaggio.file, da: passaggio.da, a: passaggio.a, oggettiCreati: definizioni.map((o) => o.name), copia };
}

/**
 * Porta alla versione attuale i file della connessione (`main` = gioco.db, `utente` = partite.db) che sono alla versione
 * immediatamente precedente; gli altri non si toccano (la verifica delle versioni che segue ferma l'avvio se non sono quella attesa).
 * Per ogni passaggio fatto scrive un log a livello info; se non c'è niente da fare non scrive niente, né sul file né nel log.
 * Restituisce i passaggi fatti. Lancia `ErrorePassaggioVersione` al primo che non riesce.
 */
export function portaAllaVersioneAttuale(db: Database.Database, opzioni: OpzioniPassaggio = {}): EsitoPassaggio[] {
  const cartellaCopie = opzioni.cartellaCopie ?? config.backupDir;
  const fatti: EsitoPassaggio[] = [];
  for (const passaggio of PASSAGGI) {
    const letta = db.pragma(`${passaggio.schema}.user_version`, { simple: true }) as number;
    if (letta !== passaggio.da) continue;
    const esito = eseguiPassaggio(db, passaggio, cartellaCopie);
    logger.info(
      { file: nomeFile(passaggio), da: esito.da, a: esito.a, oggettiCreati: esito.oggettiCreati, copia: esito.copia },
      `${nomeFile(passaggio)} portato dalla versione ${esito.da} alla ${esito.a}: strutture nuove aggiunte, dati intatti`,
    );
    fatti.push(esito);
  }
  return fatti;
}
