// ============================================================
// pacchettoGiocoService — esportazione, anteprima e importazione del pacchetto di gioco (voce 10)
// ============================================================
//
// Il pacchetto di gioco è UN SOLO FILE: `gioco.db`, i dati di gioco dell'istanza con dentro anche le
// immagini (decisione dell'utente del 2026-09-12, migrazione 079). Le partite (`partite.db`) non ne
// fanno parte e l'importazione non le tocca: è la ragione dei due file. Lo stesso file, copiato in
// `pacchetto/gioco.db`, è ciò che ogni nuova installazione riceve al primo avvio.
//
// L'importazione passa sempre dall'anteprima, che legge il file senza sostituire nulla: versione
// dello schema (un pacchetto più nuovo del codice non si importa, perché il codice non saprebbe
// leggerlo; uno più vecchio sì, le migrazioni lo portano avanti), conteggi per tabella a confronto
// con l'istanza, immagini, e i riferimenti delle partite che non troverebbero più la loro riga
// (orfani). Poi, alla conferma: copia di sicurezza, chiusura della connessione, sostituzione di
// gioco.db, riapertura con migrazioni e regole dell'avvio, orfani ricalcolati sui dati nuovi. Se
// qualcosa fallisce a connessione chiusa, si torna alla copia di sicurezza.
//
// **Il pacchetto può anche NON passare dal browser.** Un'istanza pubblicata sta dietro un proxy (nginx,
// un tunnel) che rifiuta i corpi grandi: 311 MB non attraversano quella strada, e il browser vede solo
// «Failed to fetch». Con `scaricaPacchettoDaUrl` è il server a prendersi il file da un indirizzo che
// raggiunge lui (la stessa rete privata, un file server interno): dal browser parte solo l'indirizzo,
// poche decine di byte, e il limite del proxy non c'entra più.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { logger } from '../utils/logger.js';
import { httpErrors } from '../utils/httpError.js';
import { closeDb, getDb, resolveDbPath, resolvePartitePath } from '../db/dbService.js';
import { migrations } from '../db/migrations/index.js';
import { regoleAllAvvio } from './pacchetto/pacchettoGioco.js';
import { MAX_BYTE_RIPRISTINO, cartellaTemporanea, copiaDatabase, copiaDiSicurezza, riapriIstanza, scriviDatabase, statoIstanza, timbro, tornaAllaCopiaDiSicurezza, verificaDatabase } from './impostazioniService.js';
import { scaricaDaUrl } from '../utils/scaricaDaUrl.js';
import type { AnteprimaPacchettoDto, EsitoImportazionePacchettoDto, FaseImportazionePacchetto, OrfanoPartiteDto, StatoImportazionePacchettoDto } from '../../shared/types.js';

/** Intestazione di ogni file SQLite 3. */
const FIRMA_SQLITE = 'SQLite format 3\0';

/** La versione dello schema dei dati di gioco che il codice sa leggere: l'ultima migrazione. */
export function versioneSchemaCodice(): number {
  return migrations.reduce((max, m) => Math.max(max, m.id), 0);
}

/**
 * I riferimenti delle partite verso i dati di gioco. Le foreign key fra i due file non sono applicate
 * da SQLite: questo elenco è il vincolo, e serve a dire quali righe delle partite resterebbero senza
 * la loro entità dopo una sostituzione. I videogiochi sono righe di `attivita` con `tipo = 'videogioco'`.
 * Le chiavi che non stanno in una tabella (eventi di storia in `shared/condizioniSpillo`, Ladri della squadra
 * in `dati_guida`) non si verificano qui.
 */
interface Riferimento {
  tabella: string; colonna: string; entita: string; tabellaGioco: string; colonnaGioco: string;
  /** Condizione sulle righe delle partite (es. il tipo di lettura). */
  filtro?: string;
  /** Condizione sulle righe di gioco che valgono come destinazione (es. le attività che sono videogiochi). */
  filtroGioco?: string;
  /** Espressione SQL della partita quando la tabella non ha `partita_id` (le abilità di una Persona posseduta). */
  partita?: string;
}
export const RIFERIMENTI_PARTITE: Riferimento[] = [
  { tabella: 'acquisto_partita', colonna: 'articolo_chiave', entita: 'articolo', tabellaGioco: 'articolo', colonnaGioco: 'chiave' },
  { tabella: 'punti_negozio_partita', colonna: 'negozio_chiave', entita: 'negozio', tabellaGioco: 'negozio', colonnaGioco: 'chiave' },
  { tabella: 'progresso_libro_partita', colonna: 'libro_chiave', entita: 'libro', tabellaGioco: 'libro', colonnaGioco: 'chiave' },
  { tabella: 'progresso_film_partita', colonna: 'film_chiave', entita: 'film', tabellaGioco: 'film', colonnaGioco: 'chiave' },
  { tabella: 'progresso_videogioco_partita', colonna: 'videogioco_chiave', entita: 'videogioco', tabellaGioco: 'attivita', colonnaGioco: 'chiave', filtroGioco: "tipo = 'videogioco'" },
  { tabella: 'lettura_partita', colonna: 'chiave', entita: 'libro', tabellaGioco: 'libro', colonnaGioco: 'chiave', filtro: "tipo = 'libro'" },
  { tabella: 'lettura_partita', colonna: 'chiave', entita: 'film', tabellaGioco: 'film', colonnaGioco: 'chiave', filtro: "tipo = 'film'" },
  { tabella: 'effetto_lettura_partita', colonna: 'chiave', entita: 'libro', tabellaGioco: 'libro', colonnaGioco: 'chiave', filtro: "tipo = 'libro'" },
  { tabella: 'effetto_lettura_partita', colonna: 'chiave', entita: 'film', tabellaGioco: 'film', colonnaGioco: 'chiave', filtro: "tipo = 'film'" },
  { tabella: 'effetto_lettura_partita', colonna: 'chiave', entita: 'videogioco', tabellaGioco: 'attivita', colonnaGioco: 'chiave', filtro: "tipo = 'videogioco'", filtroGioco: "tipo = 'videogioco'" },
  { tabella: 'effetto_lettura_partita', colonna: 'dote_chiave', entita: 'Dote sociale', tabellaGioco: 'dote_sociale', colonnaGioco: 'chiave' },
  { tabella: 'dote_sociale_partita', colonna: 'dote_chiave', entita: 'Dote sociale', tabellaGioco: 'dote_sociale', colonnaGioco: 'chiave' },
  { tabella: 'attivita_svolta_partita', colonna: 'attivita_chiave', entita: 'attività', tabellaGioco: 'attivita', colonnaGioco: 'chiave' },
  { tabella: 'spillo_partita', colonna: 'spillo_uid', entita: 'spillo', tabellaGioco: 'spillo', colonnaGioco: 'uid' },
  { tabella: 'punto_partita', colonna: 'punto_chiave', entita: 'punto della guida', tabellaGioco: 'punto_interesse', colonnaGioco: 'chiave' },
  { tabella: 'richiesta_partita', colonna: 'richiesta_chiave', entita: 'richiesta', tabellaGioco: 'richiesta', colonnaGioco: 'chiave' },
  { tabella: 'timbri_dedalo_partita', colonna: 'area_chiave', entita: 'area dei Memento', tabellaGioco: 'dungeon_area', colonnaGioco: 'chiave' },
  { tabella: 'domanda_partita', colonna: 'domanda_id', entita: 'domanda', tabellaGioco: 'domanda', colonnaGioco: 'id' },
  { tabella: 'cruciverba_partita', colonna: 'data', entita: 'cruciverba', tabellaGioco: 'cruciverba', colonnaGioco: 'data' },
  { tabella: 'trofeo_partita', colonna: 'trofeo_chiave', entita: 'trofeo', tabellaGioco: 'trofeo', colonnaGioco: 'chiave' },
  { tabella: 'confidente_partita', colonna: 'confidente_chiave', entita: 'Confidente', tabellaGioco: 'confidente', colonnaGioco: 'chiave' },
  { tabella: 'regalo_partita', colonna: 'confidente_chiave', entita: 'Confidente', tabellaGioco: 'confidente', colonnaGioco: 'chiave' },
  { tabella: 'requisito_partita', colonna: 'confidente_chiave', entita: 'Confidente', tabellaGioco: 'confidente', colonnaGioco: 'chiave' },
  { tabella: 'persona_posseduta', colonna: 'persona_id', entita: 'Persona', tabellaGioco: 'persona', colonnaGioco: 'id' },
  { tabella: 'persona_posseduta', colonna: 'tratto_skill_id', entita: 'abilità', tabellaGioco: 'skill', colonnaGioco: 'id' },
  { tabella: 'persona_posseduta_skill', colonna: 'skill_id', entita: 'abilità', tabellaGioco: 'skill', colonnaGioco: 'id', partita: '(SELECT p.partita_id FROM "utente"."persona_posseduta" p WHERE p.id = posseduta_id)' },
  { tabella: 'compendio_partita', colonna: 'persona_id', entita: 'Persona', tabellaGioco: 'persona', colonnaGioco: 'id' },
  { tabella: 'compendio_partita', colonna: 'tratto_skill_id', entita: 'abilità', tabellaGioco: 'skill', colonnaGioco: 'id' },
  { tabella: 'obiettivo_partita', colonna: 'persona_id', entita: 'Persona', tabellaGioco: 'persona', colonnaGioco: 'id' },
  { tabella: 'evento_partita', colonna: 'persona_id', entita: 'Persona', tabellaGioco: 'persona', colonnaGioco: 'id' },
  { tabella: 'ciclo_salvato', colonna: 'persona_id', entita: 'Persona', tabellaGioco: 'persona', colonnaGioco: 'id' },
  { tabella: 'piano_salvato', colonna: 'persona_id', entita: 'Persona', tabellaGioco: 'persona', colonnaGioco: 'id' },
];

function tabelleDi(db: Database.Database, schema: string): string[] {
  return (db.prepare(`SELECT name FROM "${schema}".sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`).all() as Array<{ name: string }>).map((r) => r.name);
}

/** Righe per tabella di uno schema. */
function conteggiTabelle(db: Database.Database, schema: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of tabelleDi(db, schema)) out[t] = (db.prepare(`SELECT COUNT(*) AS n FROM "${schema}"."${t}"`).get() as { n: number }).n;
  return out;
}

/** Quante immagini con contenuto ha uno schema (zero se la tabella non ha ancora la colonna: schema di prima della 079). */
function immaginiPiene(db: Database.Database, schema: string): number {
  const colonne = (db.prepare(`PRAGMA "${schema}".table_info(immagine)`).all() as Array<{ name: string }>).map((c) => c.name);
  if (!colonne.includes('contenuto')) return 0;
  return (db.prepare(`SELECT COUNT(*) AS n FROM "${schema}".immagine WHERE contenuto IS NOT NULL`).get() as { n: number }).n;
}

/**
 * I riferimenti delle partite (schema `utente`) che non risolvono nei dati di gioco (schema `gioco`)
 * della stessa connessione. Una tabella delle partite assente (schema più vecchio) si salta; una
 * tabella di gioco assente rende orfane tutte le righe che la referenziano, con la nota.
 */
export function orfaniPartite(db: Database.Database, schemaGioco = 'main', schemaUtente = 'utente'): OrfanoPartiteDto[] {
  const gioco = new Set(tabelleDi(db, schemaGioco));
  const utente = new Set(tabelleDi(db, schemaUtente));
  const out: OrfanoPartiteDto[] = [];
  for (const r of RIFERIMENTI_PARTITE) {
    if (!utente.has(r.tabella)) continue;
    const dove = `"${schemaUtente}"."${r.tabella}" WHERE "${r.colonna}" IS NOT NULL${r.filtro ? ` AND ${r.filtro}` : ''}`;
    const manca = !gioco.has(r.tabellaGioco);
    const condizione = manca ? '' : ` AND "${r.colonna}" NOT IN (SELECT "${r.colonnaGioco}" FROM "${schemaGioco}"."${r.tabellaGioco}" WHERE "${r.colonnaGioco}" IS NOT NULL${r.filtroGioco ? ` AND ${r.filtroGioco}` : ''})`;
    const conteggio = db.prepare(`SELECT COUNT(*) AS righe, COUNT(DISTINCT ${r.partita ?? 'partita_id'}) AS partite FROM ${dove}${condizione}`).get() as { righe: number; partite: number };
    if (conteggio.righe === 0) continue;
    const esempi = (db.prepare(`SELECT DISTINCT CAST("${r.colonna}" AS TEXT) AS v FROM ${dove}${condizione} ORDER BY v LIMIT 5`).all() as Array<{ v: string }>).map((x) => x.v);
    out.push({ tabella: r.tabella, colonna: r.colonna, entita: r.entita, righe: conteggio.righe, partite: conteggio.partite, esempi, nota: manca ? `la tabella «${r.tabellaGioco}» non c'è nel pacchetto` : null });
  }
  return out;
}

/**
 * Scarica il pacchetto dall'indirizzo indicato: solo http/https, tetto del ripristino applicato mentre
 * arriva, attesa della risposta separata dall'inattività (`scaricaDaUrl`). Il contenuto lo verifica poi
 * chi lo importa. È la strada per le istanze pubblicate, dove un corpo così grande non passa dal proxy.
 */
export async function scaricaPacchettoDaUrl(indirizzo: string): Promise<Buffer> {
  const { contenuto, url } = await scaricaDaUrl(indirizzo, {
    maxByte: MAX_BYTE_RIPRISTINO,
    cosa: 'il pacchetto di gioco',
    codiceScaricoFallito: 'scarico-fallito',
    codiceTroppoGrande: 'pacchetto-troppo-grande',
    accept: 'application/vnd.sqlite3,application/octet-stream,*/*;q=0.8',
  });
  logger.info({ host: url.host, byte: contenuto.length }, 'pacchetto di gioco scaricato dall\'indirizzo indicato');
  return contenuto;
}

/** Il pacchetto di gioco dell'istanza: la copia consistente di gioco.db (immagini comprese), da leggere e poi cancellare. */
export function esportaPacchetto(): Promise<{ percorso: string; nome: string }> {
  return copiaDatabase('gioco');
}

/** Il file è un pacchetto di gioco: SQLite integro, con i dati di gioco e senza partite. */
function verificaPacchetto(contenuto: Buffer): void {
  if (contenuto.length < 100 || contenuto.toString('utf-8', 0, 16) !== FIRMA_SQLITE) {
    throw httpErrors.badRequest('pacchetto-non-valido', 'Il file non è un pacchetto di gioco: carica il file gioco.db scaricato da «Scarica il pacchetto di gioco».');
  }
  const cosa = verificaDatabase(contenuto);
  if (cosa !== 'gioco') throw httpErrors.badRequest('pacchetto-con-partite', cosa === 'partite' ? 'Il file contiene solo partite: un pacchetto di gioco porta i dati di gioco.' : 'Il file contiene anche le partite (vecchio file unico): un pacchetto di gioco porta solo i dati di gioco. Per quel file usa «Backup e ripristino».');
}

/** Il file temporaneo del gioco.db del pacchetto, aperto a parte con le partite dell'istanza attaccate per il confronto. */
function conDatabaseDelPacchetto<T>(gioco: Buffer, fn: (db: Database.Database) => T): T {
  const prova = path.join(cartellaTemporanea(), `anteprima-${timbro()}.db`);
  fs.writeFileSync(prova, gioco);
  try {
    const db = new Database(prova);
    try {
      db.pragma('journal_mode = DELETE');
      db.prepare('ATTACH DATABASE ? AS utente').run(resolvePartitePath());
      return fn(db);
    } finally {
      db.close();
    }
  } finally {
    for (const coda of ['', '-wal', '-shm']) fs.rmSync(`${prova}${coda}`, { force: true });
  }
}

/** Che cosa cambierebbe importando il pacchetto. Legge il file e non sostituisce nulla. */
export function anteprimaPacchetto(contenuto: Buffer): AnteprimaPacchettoDto {
  verificaPacchetto(contenuto);
  return conDatabaseDelPacchetto(contenuto, (db) => {
    const versioneSchema = db.pragma('main.user_version', { simple: true }) as number;
    const codice = versioneSchemaCodice();
    const istanza = getDb();
    const attuali = conteggiTabelle(istanza, 'main');
    const nelPacchetto = conteggiTabelle(db, 'main');
    const differenze = Object.keys(nelPacchetto).filter((t) => t in attuali && attuali[t] !== nelPacchetto[t]).map((t) => ({ tabella: t, istanza: attuali[t], pacchetto: nelPacchetto[t] }));
    const tabelleAssenti = Object.keys(attuali).filter((t) => !(t in nelPacchetto));
    const importabile = versioneSchema <= codice;
    return {
      versioneSchema,
      versioneSchemaCodice: codice,
      versioneSchemaIstanza: istanza.pragma('main.user_version', { simple: true }) as number,
      databaseByte: contenuto.length,
      importabile,
      motivo: importabile ? null : `Il pacchetto ha lo schema ${versioneSchema}, più nuovo di quello che questa versione dell'app sa leggere (${codice}): aggiorna l'app prima di importarlo.`,
      differenze,
      tabelleAssenti,
      immagini: { istanza: immaginiPiene(istanza, 'main'), pacchetto: immaginiPiene(db, 'main') },
      orfani: orfaniPartite(db, 'main', 'utente'),
    };
  });
}

// ---- Una importazione alla volta, e osservabile ----
//
// Sostituire i dati di gioco dura: scarico, copia di sicurezza, scrittura di centinaia di MB, migrazioni.
// Chi sta davanti può stancarsi prima (un proxy chiude a cento secondi) e l'utente vedrebbe un errore
// mentre il lavoro procede: se ritentasse, partirebbe una seconda sostituzione sopra la prima. Qui una
// richiesta per volta (409 alle altre), la fase corrente è interrogabile e l'esito resta a disposizione
// anche quando la connessione che l'aveva chiesta non c'è più.

/** Identificativo di un'importazione: l'avvio del processo più un contatore, così non si ripete nemmeno fra riavvii. */
const AVVIO = Math.random().toString(36).slice(2, 8);
let contatore = 0;
let inCorso: { operazione: string; iniziataIl: string; fase: FaseImportazionePacchetto } | null = null;
let ultima: StatoImportazionePacchettoDto['ultima'] = null;

/** Prende il lucchetto; rifiuta se un'altra importazione è già in corso. */
function impegna(fase: FaseImportazionePacchetto): string {
  if (inCorso) throw httpErrors.conflict('importazione-in-corso', `Un'importazione è già in corso da ${inCorso.iniziataIl} (fase: ${inCorso.fase}): attendi che finisca.`);
  contatore += 1;
  inCorso = { operazione: `${AVVIO}-${contatore}`, iniziataIl: new Date().toISOString(), fase };
  return inCorso.operazione;
}

function avanza(fase: FaseImportazionePacchetto): void {
  if (inCorso) inCorso.fase = fase;
}

function libera(operazione: string, riuscita: boolean, messaggio: string, esito: EsitoImportazionePacchettoDto | null): void {
  inCorso = null;
  ultima = { operazione, riuscita, conclusaIl: new Date().toISOString(), messaggio, esito };
}

/** A che punto è l'importazione, e com'è finita l'ultima. */
export function statoImportazione(): StatoImportazionePacchettoDto {
  return { inCorso: inCorso !== null, operazione: inCorso?.operazione ?? null, fase: inCorso?.fase ?? null, iniziataIl: inCorso?.iniziataIl ?? null, ultima };
}

/** Sostituisce i dati di gioco con il pacchetto già in mano (corpo della richiesta). */
export async function importaPacchetto(contenuto: Buffer): Promise<EsitoImportazionePacchettoDto> {
  const operazione = impegna('verifica');
  try {
    const esito = await sostituisciDatiDiGioco(contenuto);
    libera(operazione, true, `Dati di gioco sostituiti (schema ${esito.versioneSchema}).`, esito);
    return esito;
  } catch (err) {
    libera(operazione, false, err instanceof Error ? err.message : String(err), null);
    throw err;
  }
}

/** Sostituisce i dati di gioco con il pacchetto che sta a un indirizzo: lo scarico è parte dell'operazione. */
export async function importaPacchettoDaUrl(indirizzo: string): Promise<EsitoImportazionePacchettoDto> {
  const operazione = impegna('scarico');
  try {
    const contenuto = await scaricaPacchettoDaUrl(indirizzo);
    avanza('verifica');
    const esito = await sostituisciDatiDiGioco(contenuto);
    libera(operazione, true, `Dati di gioco sostituiti (schema ${esito.versioneSchema}).`, esito);
    return esito;
  } catch (err) {
    libera(operazione, false, err instanceof Error ? err.message : String(err), null);
    throw err;
  }
}

/**
 * Il lavoro vero: copia di sicurezza, chiusura, scrittura di gioco.db, riapertura con migrazioni e regole
 * dell'avvio. Le partite restano. Chiamata solo con il lucchetto in mano.
 */
async function sostituisciDatiDiGioco(contenuto: Buffer): Promise<EsitoImportazionePacchettoDto> {
  if (!fs.existsSync(resolveDbPath())) throw httpErrors.badRequest('istanza-in-memoria', 'Questa istanza tiene il database in memoria: l\'importazione del pacchetto non è disponibile.');
  // l'anteprima si rifà qui (il file arriva di nuovo dal browser: quella mostrata all'utente non è vincolante), quindi il file
  // passa due volte dalla cartella temporanea; in locale è il costo di qualche secondo su ~300 MB
  const anteprima = anteprimaPacchetto(contenuto);
  if (!anteprima.importabile) throw httpErrors.badRequest('pacchetto-troppo-nuovo', anteprima.motivo ?? 'Il pacchetto non è importabile.');
  avanza('copia-di-sicurezza');
  const salvataggio = await copiaDiSicurezza();
  closeDb();
  try {
    avanza('sostituzione');
    scriviDatabase(contenuto, resolveDbPath());
    avanza('riapertura');
    riapriIstanza();
    // le stesse regole dell'avvio sui dati nuovi (l'assorbimento delle immagini su disco, già fatto da riapriIstanza, qui non trova nulla)
    regoleAllAvvio(getDb());
  } catch (err) {
    tornaAllaCopiaDiSicurezza(salvataggio, err, 'importazione-fallita', 'Importazione del pacchetto');
  }
  avanza('controllo');
  const db = getDb();
  const versioneSchema = db.pragma('main.user_version', { simple: true }) as number;
  const orfani = orfaniPartite(db, 'main', 'utente');
  const immagini = immaginiPiene(db, 'main');
  logger.info({ versionePacchetto: anteprima.versioneSchema, versioneSchema, immagini, orfani: orfani.length, salvataggio }, 'pacchetto di gioco importato');
  return {
    copiaDiSicurezza: path.basename(salvataggio),
    versioneSchemaPacchetto: anteprima.versioneSchema,
    versioneSchema,
    migrazioniApplicate: migrations.filter((m) => m.id > anteprima.versioneSchema && m.id <= versioneSchema).length,
    immagini,
    orfani,
    stato: statoIstanza(),
  };
}
