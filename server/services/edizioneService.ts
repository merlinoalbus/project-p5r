// ============================================================
// edizioneService — «Prepara edizione»: il prodotto che l'istanza pubblica di rilascio riceve (L12, passi 7 e 9)
// ============================================================
//
// Il progetto delle due istanze (docs/coordinamento/lotti/L12/progetto-due-istanze.md, §6) vuole che il file `gioco.db` del rilascio nasca
// DALLA PREPARAZIONE con un'azione sola, senza script: questa. Si lancia dalle Impostazioni della preparazione e lavora su COPIE: i dati
// dell'utente non si toccano mai (né `gioco.db`, né `partite.db`, né la cartella dei caratteri, né la cartella di lavoro di altri servizi).
//
// Che cosa produce, in una cartella dell'edizione dentro la cartella d'appoggio (`DEPOSITO_DIR`):
//   - `gioco.db`        i dati di gioco chiusi: regole sui dati applicate e a zero, uid di tutti gli spilli, miniature di tutte le immagini a tutte
//                       le larghezze, controlli di integrità superati, `VACUUM INTO` (nessun giornale WAL: `journal_mode = DELETE`), tabella `edizione`;
//   - `partite-vuoto.db` il file delle partite con la sola struttura, ottenuto applicando le migrazioni utente a un file vuoto (nel rilascio nessun
//                       esecutore di migrazioni: la struttura è questa e basta), con l'impronta dello schema nel manifesto;
//   - `font/`            i caratteri caricati dall'utente (nel rilascio si leggono dal volume dell'edizione);
//   - `chiavi.json`      le chiavi di gioco che le partite citano (serve all'edizione SUCCESSIVA per il confronto di compatibilità);
//   - `compatibilita.json` il report di compatibilità con l'edizione precedente: le chiavi citate dalle partite che non esistono più;
//   - `manifesto.json`   file, byte, SHA-256, conteggi, versioni, impronta dello schema delle partite, esito dei controlli;
//   - `LEGGIMI.txt`      come metterla sul volume dell'istanza di rilascio.
//
// **Una preparazione per volta, osservabile.** Prepara le miniature di centinaia di immagini e compatta un database da centinaia di MB: dura
// minuti, più dei cento secondi che un proxy concede. Come per l'importazione del pacchetto, la richiesta parte e risponde subito (202); la
// fase e l'esito si leggono da `statoEdizione()`, anche se la pagina si ricarica nel frattempo. Il lavoro prende il lucchetto comune
// dell'istanza (`occupaIstanza`): non può sovrapporsi a un'importazione, a un ripristino o a un'altra edizione.
//
// **Cosa blocca l'edizione** (non viene depositata, il report dice perché): controllo di integrità o di chiavi esterne non superato, spilli senza uid,
// regole sui dati che alla seconda passata fanno ancora qualcosa, immagini rimaste su disco non assorbite, schema di gioco diverso da quello del codice.
// Tutto il resto (JSON malformati, chiavi sparite rispetto all'edizione precedente, orfani delle partite) è un avviso: lo decide l'utente.
//
// Il server resta occupato in modo sincrono per la compattazione (`VACUUM INTO` di un file grande): è una manutenzione richiesta a mano
// dall'unico utente della preparazione, non un percorso di esercizio.
// ============================================================

import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import Database from 'better-sqlite3';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { httpErrors } from '../utils/httpError.js';
import { copiaSchema, getDb, nowIso, resolveDbPath } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { migrazioniUtente } from '../db/migrazioniUtente/index.js';
import { ALGORITMO_IMPRONTA_SCHEMA, improntaSchema } from '../db/improntaSchema.js';
import { traduciNomiSpilli } from '../db/migrations/053_nomi_spilli_in_italiano.js';
import { riallineaSpilliLuoghi } from './mappe/riallineaSpilliLuoghi.js';
import { assegnaUidMancanti } from './mappe/identitaSpillo.js';
import { miniaturaDi, pulisciMiniatureOrfane } from './miniatureService.js';
import { LARGHEZZE_MINIATURA } from '../../shared/miniature.js';
import { RIFERIMENTI_PARTITE, orfaniPartite, versioneSchemaCodice } from './pacchettoGiocoService.js';
import { conCartellaDiLavoro, copiaDatabase, timbro } from './impostazioniService.js';
import { occupaIstanza } from './lucchettoIstanza.js';
import type {
  ChiaviRimosseEdizioneDto, CompatibilitaEdizioneDto, EsitoEdizioneDto, FaseEdizione, FileEdizioneDto, JsonMalformatoEdizioneDto, StatoEdizioneDto,
} from '../../shared/types.js';

/** Il prefisso delle cartelle delle edizioni dentro la cartella d'appoggio: `project-p5r-edizione-<numero a tre cifre>-<timbro>`. */
export const PREFISSO_EDIZIONE = 'project-p5r-edizione-';
/** Quante edizioni si tengono nella cartella d'appoggio: l'ultima serve al confronto di compatibilità, le altre a tornare indietro. */
const EDIZIONI_CONSERVATE = 3;
/** Il formato dei file `manifesto.json` e `chiavi.json`: si alza se la forma cambia, e il confronto con un'edizione di formato diverso si ferma con un avviso. */
const FORMATO_EDIZIONE = 1;
/** I caratteri dell'utente: un file per ruolo (`fontService`), con una delle estensioni ammesse. */
const FILE_FONT = /^(display|menu|decor)\.(ttf|otf|woff2?)$/;

// ---- L'edizione già depositata (per il numero progressivo e per il confronto) ----

/** Un'edizione trovata nella cartella d'appoggio. */
interface EdizioneTrovata { numero: number; cartella: string; percorso: string; creataIl: string }

/** La cartella d'appoggio, se è configurata, esiste ed è scrivibile; altrimenti null (non si solleva: serve anche a descrivere lo stato). */
function depositoScrivibile(): string | null {
  if (!config.depositoDir) return null;
  try {
    fs.accessSync(config.depositoDir, fs.constants.R_OK | fs.constants.W_OK);
    return config.depositoDir;
  } catch {
    return null;
  }
}

/** Le edizioni depositate, dalla più recente: cartelle con il prefisso e con un `manifesto.json` leggibile. Le `.parziale` (copia interrotta) non contano. */
function edizioniDepositate(): EdizioneTrovata[] {
  const base = depositoScrivibile();
  if (!base) return [];
  const trovate: EdizioneTrovata[] = [];
  let voci: fs.Dirent[];
  try { voci = fs.readdirSync(base, { withFileTypes: true }); } catch { return []; }
  for (const v of voci) {
    if (!v.isDirectory() || !v.name.startsWith(PREFISSO_EDIZIONE) || v.name.endsWith('.parziale')) continue;
    try {
      const m = JSON.parse(fs.readFileSync(path.join(base, v.name, 'manifesto.json'), 'utf8')) as { numero?: unknown; creataIl?: unknown };
      if (typeof m.numero === 'number' && typeof m.creataIl === 'string') trovate.push({ numero: m.numero, cartella: v.name, percorso: path.join(base, v.name), creataIl: m.creataIl });
    } catch {
      // senza manifesto leggibile non è un'edizione completa: non entra nel confronto
    }
  }
  return trovate.sort((a, b) => b.numero - a.numero);
}

// ---- Una preparazione alla volta, e osservabile ----

const AVVIO = Math.random().toString(36).slice(2, 8);
let contatore = 0;
let inCorso: { operazione: string; iniziataIl: string; fase: FaseEdizione; avanzamento: { fatte: number; totale: number } | null } | null = null;
let ultima: StatoEdizioneDto['ultima'] = null;
let rilasciaIstanza: (() => void) | null = null;

/** Cambia la fase (e l'avanzamento, se si può contare) dell'edizione in corso: è ciò che `statoEdizione` riporta. */
function avanza(fase: FaseEdizione, avanzamento: { fatte: number; totale: number } | null = null): void {
  if (inCorso) { inCorso.fase = fase; inCorso.avanzamento = avanzamento; }
  logger.info({ fase, avanzamento }, 'edizione: fase');
}

/** A che punto è la preparazione dell'edizione, com'è finita l'ultima e quale edizione c'è già nella cartella d'appoggio. */
export function statoEdizione(): StatoEdizioneDto {
  const ultimaDepositata = edizioniDepositate()[0] ?? null;
  return {
    inCorso: inCorso !== null,
    operazione: inCorso?.operazione ?? null,
    fase: inCorso?.fase ?? null,
    avanzamento: inCorso?.avanzamento ?? null,
    iniziataIl: inCorso?.iniziataIl ?? null,
    ultima,
    depositoDisponibile: depositoScrivibile() !== null,
    edizioneDepositata: ultimaDepositata ? { numero: ultimaDepositata.numero, cartella: ultimaDepositata.cartella, creataIl: ultimaDepositata.creataIl } : null,
  };
}

/**
 * Avvia la preparazione dell'edizione in background e risponde subito con l'identificativo dell'operazione.
 *
 * Rifiuta: 409 se un'altra edizione (o un'importazione, o un ripristino) è in corso; 400 se la cartella d'appoggio non c'è o non è
 * scrivibile (l'edizione si deposita lì: meglio saperlo prima di minuti di lavoro) o se l'istanza tiene il database in memoria.
 */
export function avviaPreparazioneEdizione(): { operazione: string } {
  if (inCorso) throw httpErrors.conflict('edizione-in-corso', `Una preparazione dell'edizione è già in corso dalle ${inCorso.iniziataIl} (fase: ${inCorso.fase}): attendi che finisca.`);
  if (!fs.existsSync(resolveDbPath())) throw httpErrors.badRequest('istanza-in-memoria', 'L\'istanza tiene il database in memoria: non c\'è un file da cui preparare l\'edizione.');
  if (!depositoScrivibile()) throw httpErrors.badRequest('deposito-non-configurato', 'L\'edizione si deposita nella cartella d\'appoggio, che su questo server non è configurata (DEPOSITO_DIR) o non è scrivibile.');
  rilasciaIstanza = occupaIstanza('La preparazione dell\'edizione di rilascio');
  contatore += 1;
  const operazione = `${AVVIO}-${contatore}`;
  inCorso = { operazione, iniziataIl: new Date().toISOString(), fase: 'copia', avanzamento: null };
  void lavora(operazione);
  return { operazione };
}

/** Il lavoro vero, fuori dalla richiesta: non solleva mai, chiude sempre lo stato e rilascia il lucchetto. */
async function lavora(operazione: string): Promise<void> {
  let esito: EsitoEdizioneDto | null = null;
  let riuscita = false;
  let messaggio: string;
  try {
    esito = await conCartellaDiLavoro('edizione', (dir) => produciEdizione(dir));
    riuscita = esito.depositata;
    messaggio = esito.depositata
      ? `Edizione ${esito.numero} depositata in «${esito.cartella}».`
      : `Edizione ${esito.numero} respinta: ${esito.bloccanti.length === 1 ? '1 problema' : `${esito.bloccanti.length} problemi`} da risolvere. Nulla è stato depositato.`;
  } catch (err) {
    messaggio = err instanceof Error ? err.message : String(err);
    logger.error({ err }, 'edizione: preparazione fallita');
  }
  inCorso = null;
  rilasciaIstanza?.();
  rilasciaIstanza = null;
  ultima = { operazione, riuscita, conclusaIl: new Date().toISOString(), messaggio, esito };
}

// ---- Utilità di file ----

/** SHA-256 e dimensione di un file, letto a flusso (centinaia di MB non passano per la memoria). */
async function impronta(percorso: string): Promise<{ sha256: string; byte: number }> {
  const hash = crypto.createHash('sha256');
  let byte = 0;
  for await (const pezzo of fs.createReadStream(percorso)) {
    hash.update(pezzo as Buffer);
    byte += (pezzo as Buffer).length;
  }
  return { sha256: hash.digest('hex'), byte };
}

/** Scrive un JSON leggibile; i file dell'edizione si leggono anche a occhio. */
async function scriviJson(percorso: string, valore: unknown): Promise<void> {
  await fsp.writeFile(percorso, `${JSON.stringify(valore, null, 2)}\n`, 'utf8');
}

/** Vero se la tabella (nello schema principale) ha la colonna. */
function haColonna(db: Database.Database, tabella: string, colonna: string): boolean {
  return (db.prepare(`PRAGMA main.table_info("${tabella}")`).all() as Array<{ name: string }>).some((c) => c.name === colonna);
}

/** Vero se la tabella esiste nello schema principale. */
function haTabella(db: Database.Database, tabella: string): boolean {
  return !!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = ?").get(tabella);
}

/** Righe per tabella dello schema principale. */
function conteggiTabelle(db: Database.Database): Record<string, number> {
  const out: Record<string, number> = {};
  const nomi = (db.prepare("SELECT name FROM main.sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as Array<{ name: string }>).map((r) => r.name);
  for (const n of nomi) out[n] = (db.prepare(`SELECT COUNT(*) AS n FROM main."${n}"`).get() as { n: number }).n;
  return out;
}

// ---- Le chiavi che le partite citano ----

/** Un insieme di chiavi di gioco citate dalle partite: tabella e colonna di gioco, filtro sulle righe valide, e le colonne delle partite che le citano. */
interface InsiemeChiavi { id: string; tabella: string; colonna: string; filtro?: string; citatoDa: string[] }

/** Gli insiemi distinti dei riferimenti delle partite (`RIFERIMENTI_PARTITE`): più colonne che citano la stessa colonna di gioco condividono l'insieme. */
function insiemiCitati(): InsiemeChiavi[] {
  const mappa = new Map<string, InsiemeChiavi>();
  for (const r of RIFERIMENTI_PARTITE) {
    const id = `${r.tabellaGioco}.${r.colonnaGioco}${r.filtroGioco ? ` [${r.filtroGioco}]` : ''}`;
    const insieme = mappa.get(id) ?? { id, tabella: r.tabellaGioco, colonna: r.colonnaGioco, filtro: r.filtroGioco, citatoDa: [] };
    insieme.citatoDa.push(`${r.tabella}.${r.colonna}`);
    mappa.set(id, insieme);
  }
  return [...mappa.values()];
}

/** Le chiavi di ogni insieme presenti nel database dato (ordinate); un insieme la cui tabella o colonna manca vale vuoto. */
function raccogliChiavi(db: Database.Database): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const i of insiemiCitati()) {
    if (!haTabella(db, i.tabella) || !haColonna(db, i.tabella, i.colonna)) { out[i.id] = []; continue; }
    const dove = `"${i.colonna}" IS NOT NULL${i.filtro ? ` AND ${i.filtro}` : ''}`;
    out[i.id] = (db.prepare(`SELECT DISTINCT CAST("${i.colonna}" AS TEXT) FROM main."${i.tabella}" WHERE ${dove} ORDER BY 1`).pluck().all() as string[]);
  }
  return out;
}

/** Il confronto con l'edizione precedente: le chiavi che c'erano e non ci sono più, quante ne sono nate, e se la struttura delle partite è cambiata. */
function confrontaConPrecedente(precedente: EdizioneTrovata | null, chiavi: Record<string, string[]>, improntaPartite: string, avvisi: string[]): Pick<CompatibilitaEdizioneDto, 'precedente' | 'strutturaPartiteCambiata' | 'chiaviRimosse' | 'chiaviAggiunte'> {
  if (!precedente) return { precedente: null, strutturaPartiteCambiata: false, chiaviRimosse: [], chiaviAggiunte: 0 };
  const intestazione = { numero: precedente.numero, cartella: precedente.cartella, creataIl: precedente.creataIl };
  let manifestoPrima: { formato?: number; improntaSchemaPartite?: string; algoritmoImpronta?: string } | null = null;
  let chiaviPrima: { formato?: number; insiemi?: Record<string, string[]> } | null = null;
  try { manifestoPrima = JSON.parse(fs.readFileSync(path.join(precedente.percorso, 'manifesto.json'), 'utf8')); } catch { /* sotto: avviso */ }
  try { chiaviPrima = JSON.parse(fs.readFileSync(path.join(precedente.percorso, 'chiavi.json'), 'utf8')); } catch { /* sotto: avviso */ }
  const strutturaPartiteCambiata = !!manifestoPrima && manifestoPrima.algoritmoImpronta === ALGORITMO_IMPRONTA_SCHEMA && manifestoPrima.improntaSchemaPartite !== improntaPartite;
  if (!manifestoPrima || manifestoPrima.algoritmoImpronta !== ALGORITMO_IMPRONTA_SCHEMA) avvisi.push(`L'edizione precedente (${precedente.cartella}) usa un altro algoritmo per l'impronta dello schema delle partite: il confronto della struttura non è possibile.`);
  if (!chiaviPrima?.insiemi || chiaviPrima.formato !== FORMATO_EDIZIONE) {
    avvisi.push(`L'edizione precedente (${precedente.cartella}) non ha un elenco di chiavi leggibile: il confronto delle chiavi citate dalle partite non è possibile.`);
    return { precedente: intestazione, strutturaPartiteCambiata, chiaviRimosse: [], chiaviAggiunte: 0 };
  }
  const chiaviRimosse: ChiaviRimosseEdizioneDto[] = [];
  let chiaviAggiunte = 0;
  for (const i of insiemiCitati()) {
    const prima = chiaviPrima.insiemi[i.id];
    if (!Array.isArray(prima)) continue; // insieme nato dopo l'edizione precedente: nulla da confrontare
    const adesso = new Set(chiavi[i.id] ?? []);
    const iniziali = new Set(prima);
    const rimosse = prima.filter((k) => !adesso.has(k));
    for (const k of adesso) if (!iniziali.has(k)) chiaviAggiunte++;
    if (rimosse.length > 0) chiaviRimosse.push({ insieme: i.id, rimosse: rimosse.length, esempi: rimosse.slice(0, 10), citatoDa: i.citatoDa });
  }
  return { precedente: intestazione, strutturaPartiteCambiata, chiaviRimosse, chiaviAggiunte };
}

// ---- I controlli di forma sui JSON (R12-04) ----

/** Le colonne `…_json` (e `json`) di testo con righe che non sono JSON valido. Un controllo di sola lettura, per tabella e colonna. */
function jsonMalformati(db: Database.Database, avvisi: string[]): JsonMalformatoEdizioneDto[] {
  const out: JsonMalformatoEdizioneDto[] = [];
  const tabelle = (db.prepare("SELECT name FROM main.sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as Array<{ name: string }>).map((r) => r.name);
  try {
    for (const t of tabelle) {
      const colonne = (db.prepare(`PRAGMA main.table_info("${t}")`).all() as Array<{ name: string; type: string }>).filter((c) => /(^|_)json$/i.test(c.name) && !/BLOB/i.test(c.type));
      for (const c of colonne) {
        const righe = (db.prepare(`SELECT COUNT(*) AS n FROM main."${t}" WHERE "${c.name}" IS NOT NULL AND TRIM(CAST("${c.name}" AS TEXT)) <> '' AND NOT json_valid("${c.name}")`).get() as { n: number }).n;
        if (righe > 0) out.push({ tabella: t, colonna: c.name, righe });
      }
    }
  } catch (err) {
    avvisi.push(`Il controllo dei JSON non è riuscito (${err instanceof Error ? err.message : String(err)}).`);
  }
  return out;
}

// ---- Il lavoro, passo per passo ----

/** Il testo che accompagna l'edizione: come metterla sul volume dell'istanza di rilascio. Niente indirizzi né percorsi del server. */
function testoLeggimi(numero: number, versioneSchemaGioco: number, versioneSchemaPartite: number): string {
  return [
    `Edizione ${numero} di project-p5r (schema di gioco ${versioneSchemaGioco}, schema delle partite ${versioneSchemaPartite})`,
    '',
    'Questa cartella è il prodotto della funzione «Prepara edizione» dell\'istanza di preparazione. Contiene i contenuti chiusi che l\'istanza',
    'pubblica di rilascio legge in sola lettura:',
    '',
    '  gioco.db            i dati di gioco (con le immagini e le loro miniature), senza giornale WAL',
    '  partite-vuoto.db    il file delle partite con la sola struttura: l\'istanza di rilascio lo copia al primo avvio',
    '  font/               i caratteri (se ce ne sono)',
    '  chiavi.json         le chiavi citate dalle partite (serve alla prossima edizione per il confronto di compatibilità)',
    '  compatibilita.json  il confronto con l\'edizione precedente',
    '  manifesto.json      file, dimensioni, SHA-256, conteggi e controlli',
    '',
    'Come metterla in servizio (a mano, una volta per edizione):',
    '  1. Verifica gli SHA-256 dei file con quelli del manifesto.json.',
    '  2. Copia i file nel volume dell\'edizione dello stack di rilascio (quello montato in sola lettura nel backend di rilascio).',
    '  3. Imposta la variabile VERSIONE_RILASCIO dello stack alla versione dell\'immagine che porta questa edizione e ricrea lo stack.',
    '  4. Se compatibilita.json segnala chiavi rimosse o una struttura delle partite cambiata, leggi prima il report: l\'avanzamento di chi ha già',
    '     giocato potrebbe citare voci che non esistono più.',
    '',
  ].join('\n');
}

/**
 * Prepara l'edizione dentro `dir` (cartella di lavoro locale, tolta alla fine) e, se non ci sono problemi bloccanti, la deposita.
 * Non tocca nessun dato dell'istanza: lavora sulla copia consistente di `gioco.db` e su una copia di `partite.db`.
 */
async function produciEdizione(dir: string): Promise<EsitoEdizioneDto> {
  const bloccanti: string[] = [];
  const avvisi: string[] = [];
  const creataIl = nowIso();
  const precedente = edizioniDepositate()[0] ?? null;
  const numero = (precedente?.numero ?? 0) + 1;

  // ---- 1. copia consistente di gioco.db (con i controlli che valgono anche per l'esportazione: archivio storico e registro Tanaka) ----
  avanza('copia');
  const esportata = await copiaDatabase('gioco');
  const copia = path.join(dir, 'copia.db');
  try {
    await fsp.rename(esportata.percorso, copia);
  } catch (err) {
    await fsp.rm(esportata.percorso, { force: true });
    throw err;
  }
  const versioneSchemaGioco = getDb().pragma('main.user_version', { simple: true }) as number;
  if (versioneSchemaGioco !== versioneSchemaCodice()) bloccanti.push(`Lo schema dei dati di gioco è alla versione ${versioneSchemaGioco}, il codice conosce la ${versioneSchemaCodice()}: l'edizione deve nascere da un'istanza migrata.`);

  // ---- 2. regole sui dati, sulla copia; 3. miniature di tutte le immagini ----
  let regole: EsitoEdizioneDto['regole'];
  let miniature: EsitoEdizioneDto['miniature'];
  const lavoro = new Database(copia);
  try {
    lavoro.pragma('foreign_keys = ON');
    lavoro.pragma('busy_timeout = 5000');

    avanza('regole');
    // Le stesse regole che l'avvio applica, MA una per una: `assorbiImmaginiSuDisco` guarda la cartella dati VERA dell'istanza e la sposterebbe
    // (qui non è ammesso toccare l'istanza); la sua condizione si verifica sotto, senza agire.
    const passata = () => ({
      spilliTradotti: traduciNomiSpilli(lavoro),
      spilliRiallineati: riallineaSpilliLuoghi(lavoro),
      spilliIdentificati: assegnaUidMancanti(lavoro),
      miniatureOrfane: pulisciMiniatureOrfane(lavoro),
    });
    regole = passata();
    const seconda = passata();
    if (Object.values(seconda).some((n) => n > 0)) bloccanti.push(`Le regole sui dati non sono a zero alla seconda passata (${JSON.stringify(seconda)}): i dati non sono stabili.`);
    if (Object.values(regole).some((n) => n > 0)) avvisi.push(`Le regole sui dati hanno corretto la copia (${JSON.stringify(regole)}): nella preparazione verranno rifatte al prossimo avvio.`);
    if (fs.existsSync(path.join(config.dataDir, 'immagini'))) bloccanti.push('Nella cartella dati dell\'istanza c\'è ancora la cartella «immagini» (immagini su disco non assorbite nel database): l\'edizione non le conterrebbe. Riavvia la preparazione perché le assorba.');

    avanza('miniature');
    miniature = await preparaMiniature(lavoro);
    if (miniature.immagini > 0 && miniature.generate + miniature.dallaCache === 0) bloccanti.push('Nessuna miniatura è stata generata: il generatore di immagini (sharp) non si carica su questo server. Nel rilascio nessuna miniatura si potrebbe scrivere.');

    // ---- 4. compattazione: VACUUM INTO, senza giornale WAL ----
    avanza('compattazione');
    lavoro.pragma('wal_checkpoint(TRUNCATE)');
    await fsp.rm(path.join(dir, 'gioco.db'), { force: true });
    lavoro.prepare('VACUUM INTO ?').run(path.join(dir, 'gioco.db'));
  } finally {
    lavoro.close();
    await fsp.rm(copia, { force: true });
    await fsp.rm(`${copia}-wal`, { force: true });
    await fsp.rm(`${copia}-shm`, { force: true });
  }

  const gioco = path.join(dir, 'gioco.db');
  const finale = new Database(gioco);
  try {
    finale.pragma('journal_mode = DELETE');
    const modo = finale.pragma('journal_mode', { simple: true });
    if (modo !== 'delete') bloccanti.push(`Il file dell'edizione non è in modalità «delete» (${String(modo)}): il rilascio, su un volume in sola lettura, non lo aprirebbe.`);
    if ((finale.pragma('main.user_version', { simple: true }) as number) !== versioneSchemaGioco) bloccanti.push('La versione dello schema non è sopravvissuta alla compattazione.');

    // ---- 5. partite-vuoto.db: le migrazioni utente su un file vuoto ----
    avanza('partite-vuoto');
    const vuoto = await creaPartiteVuoto(gioco, path.join(dir, 'partite-vuoto.db'));

    // ---- 6. tabella `edizione`, poi i controlli sul file finito ----
    avanza('controlli');
    finale.exec('DROP TABLE IF EXISTS main.edizione');
    finale.exec(`CREATE TABLE main.edizione (
      id                       INTEGER PRIMARY KEY CHECK (id = 1),
      numero                   INTEGER NOT NULL,
      creata_il                TEXT NOT NULL,
      versione_app             TEXT NOT NULL,
      versione_schema_gioco    INTEGER NOT NULL,
      versione_schema_partite  INTEGER NOT NULL,
      impronta_schema_partite  TEXT NOT NULL
    )`);
    finale.prepare('INSERT INTO main.edizione (id, numero, creata_il, versione_app, versione_schema_gioco, versione_schema_partite, impronta_schema_partite) VALUES (1, ?, ?, ?, ?, ?, ?)')
      .run(numero, creataIl, config.appVersion, versioneSchemaGioco, vuoto.versione, vuoto.impronta);

    const integrita = finale.pragma('integrity_check') as Array<{ integrity_check: string }>;
    const integrityCheck = integrita.length === 1 ? integrita[0].integrity_check : `${integrita.length} anomalie: ${integrita.slice(0, 3).map((r) => r.integrity_check).join('; ')}`;
    if (integrityCheck !== 'ok') bloccanti.push(`Il controllo di integrità del database non è superato: ${integrityCheck}.`);
    const violazioni = finale.pragma('foreign_key_check') as unknown[];
    if (violazioni.length > 0) bloccanti.push(`Il controllo delle chiavi esterne trova ${violazioni.length} violazioni.`);
    const spilliSenzaUid = haTabella(finale, 'spillo') && haColonna(finale, 'spillo', 'uid')
      ? (finale.prepare("SELECT COUNT(*) AS n FROM main.spillo WHERE uid IS NULL OR uid = ''").get() as { n: number }).n : 0;
    if (spilliSenzaUid > 0) bloccanti.push(`${spilliSenzaUid} spilli senza uid: nel rilascio non si potrebbero assegnare.`);
    const json = jsonMalformati(finale, avvisi);
    if (json.length > 0) avvisi.push(`Colonne JSON con righe malformate: ${json.map((j) => `${j.tabella}.${j.colonna} (${j.righe})`).join(', ')}.`);

    const chiavi = raccogliChiavi(finale);
    const conteggi = conteggiTabelle(finale);

    // le partite DELL'UTENTE come prova: quali riferimenti non troverebbero la loro voce in questa edizione (copia consistente, la vera non si apre)
    const copiaPartite = path.join(dir, 'partite-copia.db');
    await copiaSchema(getDb(), copiaPartite, 'utente');
    let orfaniPreparazione: CompatibilitaEdizioneDto['orfaniPreparazione'] = [];
    try {
      finale.prepare('ATTACH DATABASE ? AS utente').run(copiaPartite);
      orfaniPreparazione = orfaniPartite(finale);
    } finally {
      try { finale.prepare('DETACH DATABASE utente').run(); } catch { /* connessione chiusa subito dopo */ }
      for (const coda of ['', '-wal', '-shm']) await fsp.rm(`${copiaPartite}${coda}`, { force: true });
    }
    if (orfaniPreparazione.length > 0) avvisi.push(`${orfaniPreparazione.length} riferimenti delle partite della preparazione non trovano la loro voce nell'edizione.`);

    const immaginiRiga = haTabella(finale, 'immagine') && haColonna(finale, 'immagine', 'contenuto')
      ? finale.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(byte), 0) AS byte FROM main.immagine WHERE contenuto IS NOT NULL').get() as { n: number; byte: number } : { n: 0, byte: 0 };

    // ---- 7. caratteri ----
    avanza('caratteri');
    const caratteri = await copiaCaratteri(path.join(dir, 'font'));

    // ---- 8. compatibilità con l'edizione precedente ----
    avanza('compatibilita');
    const confronto = confrontaConPrecedente(precedente, chiavi, vuoto.impronta, avvisi);
    const compatibilita: CompatibilitaEdizioneDto = { ...confronto, orfaniPreparazione };
    if (compatibilita.strutturaPartiteCambiata) avvisi.push('La struttura delle partite è diversa da quella dell\'edizione precedente: l\'istanza di rilascio non ha una strada automatica per convertirla (serve una conversione una tantum su copia, dopo il tuo sì).');
    if (compatibilita.chiaviRimosse.length > 0) avvisi.push(`Rispetto all'edizione ${precedente?.numero}: chiavi citate dalle partite sparite in ${compatibilita.chiaviRimosse.length} insiemi (${compatibilita.chiaviRimosse.map((c) => `${c.insieme}: ${c.rimosse}`).join('; ')}).`);

    finale.pragma('journal_mode = DELETE');
    finale.close();

    // ---- 9. manifesto ----
    avanza('manifesto');
    await scriviJson(path.join(dir, 'chiavi.json'), { formato: FORMATO_EDIZIONE, insiemi: chiavi });
    await scriviJson(path.join(dir, 'compatibilita.json'), compatibilita);
    await fsp.writeFile(path.join(dir, 'LEGGIMI.txt'), testoLeggimi(numero, versioneSchemaGioco, vuoto.versione), 'utf8');
    const file = await elencaFile(dir);
    const manifesto = {
      formato: FORMATO_EDIZIONE,
      numero,
      creataIl,
      versioneApp: config.appVersion,
      versioneSchemaGioco,
      versioneSchemaPartite: vuoto.versione,
      algoritmoImpronta: ALGORITMO_IMPRONTA_SCHEMA,
      improntaSchemaPartite: vuoto.impronta,
      file,
      conteggi: { immagini: immaginiRiga.n, byteImmagini: immaginiRiga.byte, miniature: miniature.righe, caratteri, tabelle: conteggi },
      controlli: { integrityCheck, violazioniChiaviEsterne: violazioni.length, spilliSenzaUid, jsonMalformati: json },
      precedente: compatibilita.precedente,
      bloccanti,
      avvisi,
    };
    await scriviJson(path.join(dir, 'manifesto.json'), manifesto);

    const esito: EsitoEdizioneDto = {
      numero, creataIl, cartella: null, depositata: false, versioneSchemaGioco, versioneSchemaPartite: vuoto.versione, improntaSchemaPartite: vuoto.impronta,
      file, regole, miniature,
      controlli: { integrityCheck, violazioniChiaviEsterne: violazioni.length, spilliSenzaUid, jsonMalformati: json },
      compatibilita, conteggi: { immagini: immaginiRiga.n, byteImmagini: immaginiRiga.byte, caratteri, tabelle: conteggi }, bloccanti, avvisi,
    };

    // ---- 10. deposito (solo senza problemi bloccanti) ----
    if (bloccanti.length === 0) {
      avanza('deposito');
      esito.cartella = await depositaEdizione(dir, numero, file);
      esito.depositata = true;
    }
    return esito;
  } finally {
    if (finale.open) finale.close();
  }
}

/**
 * Genera le miniature di TUTTE le immagini a TUTTE le larghezze ammesse, sulla copia. Nel rilascio `gioco.db` è in sola lettura: una miniatura
 * non generata ora non si genererebbe mai (si servirebbe l'originale). Le immagini si leggono una alla volta: i contenuti non stanno in memoria.
 */
async function preparaMiniature(db: Database.Database): Promise<EsitoEdizioneDto['miniature']> {
  const esito = { immagini: 0, generate: 0, dallaCache: 0, originali: 0, righe: 0 };
  if (!haTabella(db, 'immagine') || !haColonna(db, 'immagine', 'contenuto')) return esito;
  const ids = db.prepare('SELECT id FROM main.immagine WHERE contenuto IS NOT NULL ORDER BY id').pluck().all() as number[];
  const leggi = db.prepare('SELECT id, mime, byte, created_at, contenuto FROM main.immagine WHERE id = ?');
  for (let i = 0; i < ids.length; i++) {
    const r = leggi.get(ids[i]) as { id: number; mime: string; byte: number; created_at: string; contenuto: Buffer | null } | undefined;
    if (!r?.contenuto) continue;
    esito.immagini++;
    for (const l of LARGHEZZE_MINIATURA) {
      const m = await miniaturaDi({ id: r.id, contenuto: r.contenuto, mime: r.mime, byte: r.byte, createdAt: r.created_at }, l, db);
      if (m.esito === 'generata') esito.generate++;
      else if (m.esito === 'cache') esito.dallaCache++;
      else esito.originali++;
    }
    if (i % 10 === 0) avanza('miniature', { fatte: i, totale: ids.length });
  }
  avanza('miniature', { fatte: ids.length, totale: ids.length });
  esito.righe = haTabella(db, 'immagine_miniatura') ? (db.prepare('SELECT COUNT(*) AS n FROM main.immagine_miniatura').get() as { n: number }).n : 0;
  return esito;
}

/**
 * Crea `partite-vuoto.db`: le migrazioni utente applicate a un file vuoto. Servono i dati di gioco accanto (alcune migrazioni li leggono), ma
 * su una COPIA scartabile dell'edizione: l'edizione stessa non viene toccata. Restituisce versione e impronta dello schema.
 */
async function creaPartiteVuoto(gioco: string, destinazione: string): Promise<{ versione: number; impronta: string }> {
  const scartabile = `${destinazione}.main.db`;
  await fsp.copyFile(gioco, scartabile);
  const db = new Database(scartabile);
  try {
    db.pragma('foreign_keys = ON');
    await fsp.rm(destinazione, { force: true });
    db.prepare('ATTACH DATABASE ? AS utente').run(destinazione);
    db.pragma('utente.journal_mode = DELETE');
    // nessuna migrazione dei dati di gioco: si applicano soltanto quelle delle partite
    runMigrations(db, [], migrazioniUtente);
    const versione = db.pragma('utente.user_version', { simple: true }) as number;
    const ultimo = migrazioniUtente.reduce((massimo, m) => Math.max(massimo, m.id), 0);
    if (versione !== ultimo) throw new Error(`Le migrazioni delle partite si sono fermate alla ${versione} su ${ultimo}.`);
    const controllo = db.pragma('utente.integrity_check') as Array<{ integrity_check: string }>;
    if (controllo.length !== 1 || controllo[0].integrity_check !== 'ok') throw new Error('Il file delle partite vuoto non supera il controllo di integrità.');
    return { versione, impronta: improntaSchema(db, 'utente') };
  } finally {
    db.close();
    await fsp.rm(scartabile, { force: true });
    await fsp.rm(`${scartabile}-wal`, { force: true });
    await fsp.rm(`${scartabile}-shm`, { force: true });
  }
}

/** Copia i caratteri dell'utente (un file per ruolo) nella cartella dell'edizione; restituisce quanti. Nessun carattere = cartella non creata. */
async function copiaCaratteri(destinazione: string): Promise<number> {
  const sorgente = path.join(config.dataDir, 'font');
  if (!fs.existsSync(sorgente)) return 0;
  const nomi = fs.readdirSync(sorgente).filter((n) => FILE_FONT.test(n));
  if (nomi.length === 0) return 0;
  await fsp.mkdir(destinazione, { recursive: true });
  for (const n of nomi) await fsp.copyFile(path.join(sorgente, n), path.join(destinazione, n));
  return nomi.length;
}

/** I file di un'edizione, per nome: la cartella di lavoro contiene anche copie scartabili (database di prova, giornali), che NON ne fanno parte. */
const FILE_FISSI = ['gioco.db', 'partite-vuoto.db', 'chiavi.json', 'compatibilita.json', 'LEGGIMI.txt'] as const;

/** I file di dati dell'edizione (quelli fissi più i caratteri; il manifesto no, perché li descrive), con byte e SHA-256, in ordine di nome. */
async function elencaFile(dir: string): Promise<FileEdizioneDto[]> {
  const nomi: string[] = [...FILE_FISSI];
  const cartellaFont = path.join(dir, 'font');
  if (fs.existsSync(cartellaFont)) for (const n of fs.readdirSync(cartellaFont)) if (FILE_FONT.test(n)) nomi.push(`font/${n}`);
  const out: FileEdizioneDto[] = [];
  for (const nome of nomi.sort()) out.push({ nome, ...(await impronta(path.join(dir, ...nome.split('/')))) });
  return out;
}

/**
 * Deposita l'edizione nella cartella d'appoggio: copia in una cartella `.parziale`, verifica gli SHA-256 dei file dalla copia, e solo allora la
 * rinomina (una copia a metà non diventa mai un'edizione). Poi toglie le edizioni oltre le ultime tre. Restituisce il nome della cartella.
 */
async function depositaEdizione(dir: string, numero: number, file: FileEdizioneDto[]): Promise<string> {
  const base = depositoScrivibile();
  if (!base) throw httpErrors.badRequest('deposito-non-configurato', 'La cartella d\'appoggio non è più scrivibile.');
  const nome = `${PREFISSO_EDIZIONE}${String(numero).padStart(3, '0')}-${timbro()}`;
  const parziale = path.join(base, `${nome}.parziale`);
  try {
    await fsp.mkdir(parziale, { recursive: true });
    for (const f of [...file.map((x) => x.nome), 'manifesto.json']) {
      const dest = path.join(parziale, ...f.split('/'));
      await fsp.mkdir(path.dirname(dest), { recursive: true });
      await fsp.copyFile(path.join(dir, ...f.split('/')), dest);
    }
    for (const f of file) {
      const letto = await impronta(path.join(parziale, ...f.nome.split('/')));
      if (letto.sha256 !== f.sha256) throw new Error(`La copia di «${f.nome}» nella cartella d'appoggio non coincide con l'originale (SHA-256 diverso).`);
    }
    for (const f of [...file.map((x) => x.nome), 'manifesto.json']) {
      try { await fsp.chmod(path.join(parziale, ...f.split('/')), 0o444); } catch { /* il filesystem di rete può non supportare i permessi */ }
    }
    await fsp.rename(parziale, path.join(base, nome));
  } catch (err) {
    await fsp.rm(parziale, { recursive: true, force: true }).catch(() => {});
    throw err;
  }
  logger.info({ cartella: nome, file: file.length }, 'edizione depositata nella cartella d\'appoggio');
  // le edizioni oltre le ultime tre se ne vanno (l'ultima serve al confronto della prossima)
  for (const vecchia of edizioniDepositate().slice(EDIZIONI_CONSERVATE)) {
    try {
      await fsp.rm(vecchia.percorso, { recursive: true, force: true });
      logger.info({ cartella: vecchia.cartella }, 'edizione vecchia rimossa dalla cartella d\'appoggio');
    } catch (err) {
      logger.warn({ err, cartella: vecchia.cartella }, 'rotazione delle edizioni nella cartella d\'appoggio non riuscita');
    }
  }
  return nome;
}
