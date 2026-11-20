// ============================================================
// passaggioVersione — l'unico passaggio automatico: dalla versione immediatamente precedente a quella che il codice legge
// ============================================================
//
// Una versione rilasciata deve partire sui dati che l'istanza ha già, senza che nessuno intervenga a mano. Per questo, e solo per
// questo, l'avvio porta ciascun file dalla versione IMMEDIATAMENTE PRECEDENTE a quella attuale (`PASSAGGI`). Un passaggio fa due cose:
//   - CREA gli oggetti che mancano (tabelle e indici nuovi, `crea`): additivo, ciò che crea nasce vuoto;
//   - RICOSTRUISCE una tabella che ha cambiato struttura (`ricostruisce`): è l'ECCEZIONE SCRITTA alla regola «niente migrazioni», decisa
//     dall'utente perché un registro resti uno solo (partite 75→76: `consumo_oggetto_partita` accetta il modo «usato» delle uscite dalle
//     voci). La tabella rinasce con il testo nuovo, con tutte le sue righe copiate colonna per colonna e senza conversioni (le colonne
//     devono essere le stesse, con gli stessi tipi), con i suoi indici e trigger e con il contatore della chiave automatica com'era. Prima e
//     dopo si contano le righe e se ne calcola un'impronta (SHA-256 di ogni riga resa da `quote()`, in ordine stabile): devono coincidere.
//     Poi `foreign_key_check` e `integrity_check` dello schema. Una tabella ricostruita esige la copia di sicurezza.
// In entrambi i casi:
//   - IDENTICO ai file distribuiti: il testo di creazione di ogni oggetto si legge da `pacchetto/gioco.db` e da
//     `pacchetto/partite-vuoto.db` (`sqlite_master.sql`; nel rilascio, che non ha il pacchetto, dal `partite-vuoto.db` dell'edizione),
//     mai riscritto qui, e dopo la creazione si confronta con l'originale: l'impronta della struttura (`improntaSchema`) deve restare
//     quella dei file distribuiti;
//   - IDEMPOTENTE: un file già alla versione attesa non si tocca (nessuna scrittura, nessun log);
//   - CAUTO: una versione diversa dalla precedente non si tocca e la verifica che segue (`verificaVersioni`) ferma l'avvio come sempre;
//     un oggetto nuovo che esiste già, o una tabella da ricostruire che ha già il testo nuovo, colonne diverse o indici e trigger diversi da
//     quelli del file distribuito, in un file ancora alla versione precedente, è un errore (mai sovrascritto) e nulla si scrive;
//   - ATOMICO: tabelle, righe, indici, trigger, controlli e versione stanno in una sola transazione (con le chiavi esterne spente attorno,
//     perché la tabella tolta e rifatta non tocchi le righe che la citano), quindi un passaggio che non riesce non lascia traccia;
//   - COPIA DI SICUREZZA solo dove servono i dati: prima di toccare le partite (piccolo, insostituibile) se ne fa una copia in
//     `config.backupDir`, con un nome fuori dalla rotazione delle copie periodiche; se non riesce, non si scrive. I dati di gioco non hanno
//     copia (sono grandi per le immagini; un loro passaggio può solo aggiungere strutture vuote, in una transazione).
//   - Dopo il passaggio un'immagine dell'app della versione precedente non riparte sui file passati: serve ripristinare la copia delle
//     partite (o rimettere i file di prima).
//
// Non è un sistema di migrazioni: ogni cambio di struttura porta il proprio passaggio nello stesso cambiamento che alza
// `VERSIONE_GIOCO` o `VERSIONE_PARTITE`, e toglie quello della versione prima (si passa solo dalla precedente). In vigore: partite 75→76;
// i dati di gioco restano alla 391 e non hanno passaggio (un `gioco.db` a un'altra versione ferma l'avvio). Lo chiamano solo i due avvii:
// la preparazione (`server/index.ts`) per i due file, il rilascio (`server/rilascio.ts`) per le sole partite, con i testi letti
// dall'edizione (il suo `gioco.db` è l'edizione stessa, in sola lettura, e deve già essere alla versione del codice).
// «Importa», anteprima, ripristino, «Prepara edizione» e script aprono un file esterno e lo rifiutano se non è alla versione attesa:
// un backup di prima del passaggio non si importa né si ripristina.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import Database from 'better-sqlite3';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { percorsoModelloPartite, qualificaConSchema, type OggettoSchema } from './partiteVuote.js';
import { VERSIONE_PARTITE, type FileVersionato } from './versioneSchema.js';

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
  /** Gli oggetti nuovi da creare, nell'ordine di creazione: prima le tabelle, poi gli indici (le chiavi automatiche nascono con la tabella). */
  crea: readonly string[];
  /** Le tabelle che cambiano struttura: si ricostruiscono con il testo del file distribuito, con tutte le righe, gli indici e i trigger. */
  ricostruisce: readonly string[];
  /** Se prima di scrivere si fa la copia di sicurezza del file (le partite sì, i dati di gioco no). Obbligatoria se si ricostruisce. */
  conCopia: boolean;
}

/**
 * I passaggi in vigore: quelli di questa versione, da 75→76 (partite: `consumo_oggetto_partita` con il modo «usato»). Chi alza una costante
 * di `versioneSchema.ts` riscrive qui l'elenco con gli oggetti di quel cambiamento.
 */
const PASSAGGI: readonly Passaggio[] = [
  {
    file: 'partite',
    schema: 'utente',
    da: 75,
    a: VERSIONE_PARTITE,
    origine: percorsoModelloPartite,
    crea: [],
    ricostruisce: ['consumo_oggetto_partita'],
    conCopia: true,
  },
];

/** La versione da cui il passaggio in vigore porta un file alla versione attuale (null se per quel file non ce n'è). */
export function versioneDaCuiSiPassa(file: FileVersionato): number | null {
  return PASSAGGI.find((p) => p.file === file)?.da ?? null;
}

/** Che cosa ha fatto il passaggio di un file. */
export interface EsitoPassaggio {
  file: FileVersionato;
  da: number;
  a: number;
  oggettiCreati: string[];
  /** Le tabelle ricostruite, con le righe copiate (uguali prima e dopo, per numero e impronta). */
  tabelleRicostruite: Array<{ tabella: string; righe: number }>;
  /** Il percorso della copia di sicurezza fatta prima di scrivere (null se per quel file non si fa). */
  copia: string | null;
}

/** Le opzioni di `portaAllaVersioneAttuale` (i valori di serie sono quelli dell'istanza di preparazione). */
export interface OpzioniPassaggio {
  /** Dove si scrivono le copie di sicurezza (`config.backupDir`). */
  cartellaCopie?: string;
  /**
   * Quali file si possono portare (di serie tutti e due). L'istanza di rilascio passa solo `['partite']`: il suo `gioco.db` è l'edizione,
   * in sola lettura, e deve già essere alla versione del codice.
   */
  file?: readonly FileVersionato[];
  /**
   * Da quale file distribuito si leggono i testi di creazione, per file (di serie `pacchetto/gioco.db` e `pacchetto/partite-vuoto.db`).
   * L'immagine di rilascio non ha il pacchetto: legge le strutture delle partite dal `partite-vuoto.db` dell'edizione, lo stesso file da
   * cui il manifesto ha preso l'impronta, così dopo il passaggio `verificaSchemaUtente` ritrova la stessa impronta.
   */
  origini?: Partial<Record<FileVersionato, string>>;
}

/** Una tabella da ricostruire, come la dà il file distribuito: il suo testo, le colonne e gli indici e trigger che le appartengono. */
interface TabellaDaRicostruire {
  tabella: OggettoSchema;
  /** Le colonne (`pragma_table_xinfo`): nome, tipo, vincolo NOT NULL, valore di serie, posto nella chiave, colonna nascosta. */
  colonne: ColonnaTabella[];
  /** Indici (prima) e trigger (poi) con un testo di creazione; gli indici automatici nascono con la tabella. */
  figli: OggettoSchema[];
}

interface ColonnaTabella { name: string; type: string; notnull: number; dflt_value: string | null; pk: number; hidden: number }

/** Le definizioni lette dal file distribuito per un passaggio. */
interface Definizioni { nuovi: OggettoSchema[]; ricostruzioni: TabellaDaRicostruire[] }

/** Un testo fra apici SQL (il percorso di `VACUUM INTO`). */
const apiciSql = (testo: string): string => `'${testo.replaceAll("'", "''")}'`;

/** Un nome fra virgolette doppie, con le virgolette interne raddoppiate. */
const virgolette = (nome: string): string => `"${nome.replaceAll('"', '""')}"`;

/** Il momento nel nome della copia, nella stessa forma delle copie periodiche dell'avanzamento (`rilascio/backupUtente.ts`). */
const timbroCopia = (): string => new Date().toISOString().replace(/[:.]/g, '-');

/** Le colonne di una tabella di uno schema, per il confronto (forma stabile, senza il numero d'ordine che `name` già implica). */
function colonneDi(db: Database.Database, schema: string, tabella: string): ColonnaTabella[] {
  return (db.prepare(`SELECT name, type, "notnull", dflt_value, pk, hidden FROM pragma_table_xinfo(?, ?) ORDER BY cid`).all(tabella, schema) as ColonnaTabella[])
    .map((c) => ({ name: c.name, type: c.type, notnull: c.notnull, dflt_value: c.dflt_value, pk: c.pk, hidden: c.hidden }));
}

/** Gli indici (prima) e i trigger (poi) di una tabella con un testo di creazione, in ordine di nome. */
function figliDi(db: Database.Database, schema: string, tabella: string): OggettoSchema[] {
  return db.prepare(`SELECT type, name, sql FROM ${schema}.sqlite_master WHERE tbl_name = ? AND type IN ('index', 'trigger') AND sql IS NOT NULL
    ORDER BY CASE type WHEN 'index' THEN 0 ELSE 1 END, name`).all(tabella) as OggettoSchema[];
}

/**
 * I testi di creazione degli oggetti del passaggio, letti dal file distribuito in sola lettura. Lancia se il file manca, non è alla
 * versione di arrivo o non contiene uno degli oggetti: il pacchetto e le costanti vanno aggiornati insieme.
 */
function leggiDefinizioni(passaggio: Passaggio, percorso: string): Definizioni {
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
    const trova = (nome: string, tipo?: string): OggettoSchema => {
      const trovato = cerca.get(nome) as { type: string; name: string; sql: string | null } | undefined;
      if (!trovato?.sql || (tipo && trovato.type !== tipo)) {
        throw new ErrorePassaggioVersione(`Il file distribuito ${path.basename(percorso)} non contiene ${tipo === 'table' ? 'la tabella' : 'la struttura'} «${nome}» che il passaggio alla versione ${passaggio.a} deve creare: il file e l'elenco in passaggioVersione.ts non corrispondono.`);
      }
      return { type: trovato.type, name: trovato.name, sql: trovato.sql };
    };
    return {
      nuovi: passaggio.crea.map((nome) => trova(nome)),
      ricostruzioni: passaggio.ricostruisce.map((nome) => ({ tabella: trova(nome, 'table'), colonne: colonneDi(sorgente, 'main', nome), figli: figliDi(sorgente, 'main', nome) })),
    };
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

/**
 * I controlli sul file dell'istanza prima di scrivere: un oggetto nuovo non deve esistere già; una tabella da ricostruire deve esistere con il
 * testo di prima (non quello nuovo), con le stesse colonne del file distribuito e con gli stessi indici e trigger (per nome). Lancia al primo
 * che non torna: il file non è stato toccato.
 */
function controllaPrimaDiScrivere(db: Database.Database, passaggio: Passaggio, def: Definizioni): void {
  const s = passaggio.schema;
  const leggi = db.prepare(`SELECT type, sql FROM ${s}.sqlite_master WHERE name = ?`);
  const fermo = (motivo: string): never => {
    throw new ErrorePassaggioVersione(`${nomeFile(passaggio)} è alla versione ${passaggio.da} ma ${motivo}: non si sovrascrive. Il file non è stato modificato; serve un intervento a mano sui dati.`);
  };
  for (const o of def.nuovi) if (leggi.get(o.name)) fermo(`contiene già «${o.name}»`);
  for (const r of def.ricostruzioni) {
    const nome = r.tabella.name;
    const attuale = leggi.get(nome) as { type: string; sql: string | null } | undefined;
    if (attuale?.type !== 'table') fermo(`non ha la tabella «${nome}» da ricostruire`);
    if (attuale?.sql === r.tabella.sql) fermo(`ha già la tabella «${nome}» con la struttura nuova`);
    if (JSON.stringify(colonneDi(db, s, nome)) !== JSON.stringify(r.colonne)) fermo(`ha la tabella «${nome}» con colonne diverse da quelle del file distribuito (le righe non si copiano senza convertirle)`);
    const nomi = (xs: OggettoSchema[]): string => xs.map((x) => `${x.type}:${x.name}`).sort().join(',');
    if (nomi(figliDi(db, s, nome)) !== nomi(r.figli)) fermo(`ha la tabella «${nome}» con indici o trigger diversi da quelli del file distribuito`);
  }
  // gli stessi controlli che chiudono la ricostruzione, sul file com'è: un difetto che c'era già si dice per quello, prima di scrivere
  if (def.ricostruzioni.length > 0) {
    try {
      controllaSchema(db, s);
    } catch (err) {
      fermo(`non supera già i controlli (${err instanceof Error ? err.message : String(err)})`);
    }
  }
}

/** Numero di righe e impronta (SHA-256) del contenuto di una tabella: ogni riga resa da `quote()` colonna per colonna (tipo e valore), in ordine stabile. */
function contenutoDi(db: Database.Database, schema: string, tabella: string, colonne: readonly string[]): { righe: number; impronta: string } {
  const riga = colonne.map((c) => `quote(${virgolette(c)})`).join(` || ',' || `);
  const hash = createHash('sha256');
  let righe = 0;
  for (const r of db.prepare(`SELECT ${riga} FROM ${schema}.${virgolette(tabella)} ORDER BY 1`).pluck().iterate() as IterableIterator<string>) {
    hash.update(`${r}\n`);
    righe += 1;
  }
  return { righe, impronta: hash.digest('hex') };
}

/**
 * Il contatore della chiave automatica della tabella (`sqlite_sequence`), o null se non c'è. Letto come intero a 64 bit (`bigint`): rimesso
 * così resta un intero (un numero di JavaScript si legherebbe come reale, e `sqlite_sequence` non ha un tipo che lo riporti a intero).
 */
function contatoreDi(db: Database.Database, schema: string, tabella: string): bigint | null {
  if (!db.prepare(`SELECT 1 FROM ${schema}.sqlite_master WHERE name = 'sqlite_sequence'`).get()) return null;
  const seq = db.prepare(`SELECT seq FROM ${schema}.sqlite_sequence WHERE name = ?`).pluck().safeIntegers(true).get(tabella) as bigint | number | undefined;
  return seq === undefined ? null : BigInt(seq);
}

/**
 * Ricostruisce una tabella dentro la transazione del passaggio (chiavi esterne spente da chi chiama): le righe in una tabella d'appoggio
 * temporanea senza tipi (i valori restano quelli, byte per byte), la tabella tolta (con i suoi indici e trigger) e rifatta con il testo del file
 * distribuito, le righe rimesse colonna per colonna, il contatore della chiave automatica com'era, indici e trigger rifatti; poi il confronto di
 * righe, impronta e contatore. Lancia se qualcosa non torna (la transazione si annulla).
 */
function ricostruisciTabella(db: Database.Database, schema: 'main' | 'utente', r: TabellaDaRicostruire): number {
  const nome = r.tabella.name;
  const t = `${schema}.${virgolette(nome)}`;
  const nomiColonne = r.colonne.map((c) => c.name);
  const colonne = nomiColonne.map(virgolette).join(', ');
  const appoggio = `temp.${virgolette(`passaggio_${nome}`)}`;
  const prima = contenutoDi(db, schema, nome, nomiColonne);
  const contatorePrima = contatoreDi(db, schema, nome);
  db.exec(`DROP TABLE IF EXISTS ${appoggio}`);
  db.exec(`CREATE TABLE ${appoggio} (${colonne})`);
  db.exec(`INSERT INTO ${appoggio} (${colonne}) SELECT ${colonne} FROM ${t}`);
  const copiate = db.prepare(`SELECT COUNT(*) FROM ${appoggio}`).pluck().get() as number;
  if (copiate !== prima.righe) throw new Error(`le righe di «${nome}» copiate nell'appoggio sono ${copiate} invece di ${prima.righe}`);
  db.exec(`DROP TABLE ${t}`);
  const registrato = db.prepare(`SELECT sql FROM ${schema}.sqlite_master WHERE name = ?`).pluck();
  db.exec(qualificaConSchema(r.tabella, schema));
  if (registrato.get(nome) !== r.tabella.sql) throw new Error(`il testo di «${nome}» ricostruita non coincide con quello del file distribuito`);
  db.exec(`INSERT INTO ${t} (${colonne}) SELECT ${colonne} FROM ${appoggio} ORDER BY rowid`);
  // la tabella tolta ha portato via il suo contatore, e le righe rimesse l'hanno rifatto sul massimo: torna quello di prima (righe tolte comprese)
  if (contatoreDi(db, schema, nome) !== null || contatorePrima !== null) {
    db.prepare(`DELETE FROM ${schema}.sqlite_sequence WHERE name = ?`).run(nome);
    if (contatorePrima !== null) db.prepare(`INSERT INTO ${schema}.sqlite_sequence (name, seq) VALUES (?, ?)`).run(nome, contatorePrima);
  }
  for (const f of r.figli) {
    db.exec(qualificaConSchema(f, schema));
    if (registrato.get(f.name) !== f.sql) throw new Error(`il testo di «${f.name}» rifatto non coincide con quello del file distribuito`);
  }
  db.exec(`DROP TABLE ${appoggio}`);
  const dopo = contenutoDi(db, schema, nome, nomiColonne);
  if (dopo.righe !== prima.righe) throw new Error(`«${nome}» aveva ${prima.righe} righe, dopo la ricostruzione ne ha ${dopo.righe}`);
  if (dopo.impronta !== prima.impronta) throw new Error(`il contenuto di «${nome}» dopo la ricostruzione non coincide con quello di prima (impronta diversa)`);
  if (contatoreDi(db, schema, nome) !== contatorePrima) throw new Error(`il contatore della chiave automatica di «${nome}» non è tornato com'era`);
  return dopo.righe;
}

/** I controlli finali dello schema dentro la transazione: nessuna chiave esterna rotta, integrità del file. Lancia se non tornano. */
function controllaSchema(db: Database.Database, schema: 'main' | 'utente'): void {
  const rotte = db.prepare(`PRAGMA ${schema}.foreign_key_check`).all() as Array<{ table: string }>;
  if (rotte.length > 0) throw new Error(`${rotte.length} righe con una chiave esterna rotta (tabelle: ${[...new Set(rotte.map((x) => x.table))].join(', ')})`);
  const integrita = db.prepare(`PRAGMA ${schema}.integrity_check`).pluck().all() as string[];
  if (integrita.length !== 1 || integrita[0] !== 'ok') throw new Error(`il controllo di integrità non è «ok»: ${integrita.slice(0, 3).join('; ')}`);
}

/** Il passaggio di un file, già riconosciuto alla versione di partenza: controlli, copia di sicurezza, scrittura in una transazione. */
function eseguiPassaggio(db: Database.Database, passaggio: Passaggio, cartellaCopie: string, origine: string): EsitoPassaggio {
  if (passaggio.da !== passaggio.a - 1) {
    throw new ErrorePassaggioVersione(`Il passaggio di ${nomeFile(passaggio)} (da ${passaggio.da} a ${passaggio.a}) non parte dalla versione immediatamente precedente: passaggioVersione.ts non è stato aggiornato insieme alla versione.`);
  }
  if (passaggio.ricostruisce.length > 0 && !passaggio.conCopia) {
    throw new ErrorePassaggioVersione(`Il passaggio di ${nomeFile(passaggio)} ricostruisce delle tabelle senza la copia di sicurezza: passaggioVersione.ts non è coerente.`);
  }
  const def = leggiDefinizioni(passaggio, origine);
  controllaPrimaDiScrivere(db, passaggio, def);
  const copia = passaggio.conCopia ? copiaDiSicurezza(db, passaggio, cartellaCopie) : null;
  const ricostruite: Array<{ tabella: string; righe: number }> = [];
  // le chiavi esterne si spengono fuori dalla transazione (dentro non cambiano): la tabella tolta e rifatta non deve toccare chi la cita
  const chiaviPrima = db.pragma('foreign_keys', { simple: true }) as number;
  db.pragma('foreign_keys = OFF');
  try {
    db.transaction(() => {
      for (const r of def.ricostruzioni) ricostruite.push({ tabella: r.tabella.name, righe: ricostruisciTabella(db, passaggio.schema, r) });
      for (const o of def.nuovi) db.exec(qualificaConSchema(o, passaggio.schema));
      // il testo registrato deve essere quello del file distribuito, carattere per carattere (l'impronta della struttura lo usa)
      const registrato = db.prepare(`SELECT sql FROM ${passaggio.schema}.sqlite_master WHERE name = ?`).pluck();
      for (const o of def.nuovi) {
        if (registrato.get(o.name) !== o.sql) throw new Error(`il testo di «${o.name}» creato non coincide con quello del file distribuito`);
      }
      if (def.ricostruzioni.length > 0) controllaSchema(db, passaggio.schema);
      db.pragma(`${passaggio.schema}.user_version = ${passaggio.a}`);
    }).immediate();
  } catch (err) {
    throw new ErrorePassaggioVersione(
      `Il passaggio di ${nomeFile(passaggio)} dalla versione ${passaggio.da} alla ${passaggio.a} non è riuscito (${err instanceof Error ? err.message : String(err)}): nessuna modifica è stata applicata.${copia ? ` Copia di sicurezza: ${copia}.` : ''}`,
      { cause: err },
    );
  } finally {
    db.pragma(`foreign_keys = ${chiaviPrima ? 'ON' : 'OFF'}`);
  }
  return { file: passaggio.file, da: passaggio.da, a: passaggio.a, oggettiCreati: def.nuovi.map((o) => o.name), tabelleRicostruite: ricostruite, copia };
}

/**
 * Porta alla versione attuale i file della connessione (`main` = gioco.db, `utente` = partite.db) che sono alla versione
 * immediatamente precedente, fra quelli ammessi (`opzioni.file`); gli altri non si toccano (la verifica delle versioni che segue ferma
 * l'avvio se non sono quella attesa). Per ogni passaggio fatto scrive un log a livello info; se non c'è niente da fare non scrive niente,
 * né sul file né nel log. Restituisce i passaggi fatti. Lancia `ErrorePassaggioVersione` al primo che non riesce.
 */
export function portaAllaVersioneAttuale(db: Database.Database, opzioni: OpzioniPassaggio = {}): EsitoPassaggio[] {
  const cartellaCopie = opzioni.cartellaCopie ?? config.backupDir;
  const fatti: EsitoPassaggio[] = [];
  for (const passaggio of PASSAGGI) {
    if (opzioni.file && !opzioni.file.includes(passaggio.file)) continue;
    const letta = db.pragma(`${passaggio.schema}.user_version`, { simple: true }) as number;
    if (letta !== passaggio.da) continue;
    const esito = eseguiPassaggio(db, passaggio, cartellaCopie, opzioni.origini?.[passaggio.file] ?? passaggio.origine());
    logger.info(
      { file: nomeFile(passaggio), da: esito.da, a: esito.a, oggettiCreati: esito.oggettiCreati, tabelleRicostruite: esito.tabelleRicostruite, copia: esito.copia },
      `${nomeFile(passaggio)} portato dalla versione ${esito.da} alla ${esito.a}: strutture nuove aggiunte${esito.tabelleRicostruite.length ? ', tabelle ricostruite con le stesse righe' : ''}, dati intatti`,
    );
    fatti.push(esito);
  }
  return fatti;
}
