// ============================================================
// cestinoService — il cestino: ciò che si elimina dalla guida e dalle mappe si può rimettere (migrazioni 104 e utente 021)
// ============================================================
//
// Richiesta dell'utente (2026-10-16), dopo che tre aree del Palazzo di Madarame eliminate per errore si sono dovute ricostruire a
// mano dal WAL di produzione: «Cestino con ripristino», per le aree dei Palazzi, le voci della guida, le planimetrie e le aree dei
// dedali; il cestino sta in Impostazioni e si svuota solo a mano.
//
// **Come si registra un'eliminazione** (`conCestino`). Le eliminazioni toccano molte tabelle, in due file, con cascate e
// riallineamenti (le spunte, i pin, i legami con le planimetrie, l'ordine delle aree che seguono, …), e cambiano col tempo:
// un elenco scritto a mano delle righe da salvare resterebbe indietro. Si fa invece come SQLite stesso col WAL: per la durata
// della transazione dell'eliminazione, trigger temporanei su **ogni** tabella dei due file chiamano una funzione che annota la
// riga com'era prima e com'è diventata (DELETE, UPDATE, INSERT, cascate comprese: i trigger scattano anche sulle righe tolte da
// `ON DELETE CASCADE`), con i BLOB intatti. A transazione chiusa il registro sta in `main.cestino` (righe del file di gioco) e in
// `utente.cestino_partite` (righe delle partite), e i trigger non ci sono più. `recursive_triggers` è acceso per la durata:
// senza, una `INSERT OR REPLACE` che toglie una riga non farebbe scattare il trigger della cancellazione.
//
// **Come si rimette** (`ripristinaDalCestino`). Il registro si riapplica al contrario, in una transazione: le righe tolte si
// reinseriscono (prima i genitori: nelle cascate il figlio è annotato prima del genitore), quelle cambiate tornano com'erano,
// quelle aggiunte se ne vanno. Quel che è successo **dopo** l'eliminazione vince:
//   - di una riga cambiata dall'eliminazione tornano com'erano le sole colonne che l'eliminazione aveva cambiato e nessuno ha
//     toccato dopo (una mappa figlia rinominata dopo torna sotto la sua mappa, col nome nuovo); una colonna toccata di nuovo
//     resta com'è, e l'esito lo dice; una riga aggiunta dall'eliminazione e toccata dopo resta;
//   - una riga del file di gioco da reinserire con la chiave ormai presa da un'altra riga blocca tutto (409, con l'elenco):
//     rimetterla vorrebbe dire sovrascrivere qualcosa di nuovo; nelle partite, invece, lo stato di dopo resta e l'esito lo dice;
//     così anche nelle tabelle che l'app ricalcola da sé (`DERIVATE`: i percorsi delle mappe), che poi si ricalcolano;
//   - una riga che punta a qualcosa che non c'è più (un pin o una planimetria eliminati dopo) non si rimette, e l'esito lo dice.
// Se alla fine l'elemento stesso non c'è (la sua riga non è tornata), non si rimette niente. Dopo, il servizio dell'elemento
// può rimettere a posto ciò che dipende da lui (`registraRipristinoCestino`: l'ordine delle aree, i percorsi delle mappe) e le
// cache dei dati di gioco si svuotano. Per l'ordine conta dove stava: l'eliminazione annota le chiavi dei suoi **vicini**
// (`ElementoCestino.vicini`), perché il vecchio numero d'ordine non dice più niente se nel frattempo altre righe si sono spostate.
// ============================================================

import { randomBytes } from 'node:crypto';
import { getDb, nowIso, type AppDatabase } from '../db/dbService.js';
import { ARCHIVI_LEGACY_IMMUTABILI, verificaArchivioLegacy, verificaCestinoLegacy } from '../db/acquistiLegacy.js';
import { httpErrors } from '../utils/httpError.js';
import { getProprietario } from '../middleware/requestContext.js';
import { colonnaTolta, colonneCompatibili, tabellaTolta } from '../db/fontiTolte.js';
import { invalidaCacheDiGioco } from './cacheDiGioco.js';
import { modelloAvanzamento, riallineaStati } from './mappe/statiGuida.js';
import { verificaRegistroCestinoPin } from './mappe/registroCestinoPin.js';
import { eBloccoGuidaCatalogo, ripristinaPuntatoriGuida } from '../../shared/riferimentiCatalogoGuida.js';
import { normalizzaCostoScambio } from '../../shared/catalogo.js';
import { verificaAttivitaConfidente } from './vincoliAttivitaConfidente.js';
import { preparaRipristinoAcquisti, verificaRipristinoAcquisti, riconciliaAcquistiDopoRipristino } from './acquistiService.js';
import { radiceCestinoPesca, riconciliaPescaDopoRipristino, TIPI_CESTINO_PESCA } from './pescaRipristino.js';
import { verificaAttivitaPesca } from './vincoliAttivitaPesca.js';
import { eventoPescaMarcato } from './pescaStorico.js';
import { riconciliaEffettiDopoRipristino } from './motoreDiario.js';
import { riconciliaBeneficiRichiesta } from './propostePartitaService.js';
import { riallineaYenRichiesta, rimettiYenDellaVoceRipristinata } from './yenAutomaticiService.js';
import { ripristinaOrdineVoce } from './giornataService.js';
import { azioneEventoAcquistoV1 } from './storicoService.js';
import type { ContenutoCestinoDto, EsitoRipristinoCestinoDto, MotivoSaltataCestinoDto, SaltataCestinoDto, TipoCestino, VoceCestinoDto, VoceCestinoUnificatoDto } from '../../shared/types.js';

type Schema = 'main' | 'utente';
type Operazione = 'D' | 'U' | 'I';
/** Un valore com'è salvato nel registro: i BLOB in base64, il resto com'è. */
type Valore = string | number | null | { $blob: string };
type Riga = Record<string, Valore>;
/** Un passo del registro: la riga com'era (`prima`, per D e U) e com'è diventata (`dopo`, per U e I). */
interface Passo { seq: number; tabella: string; op: Operazione; prima?: Riga; dopo?: Riga }

/** Le chiavi di ciò che stava subito prima e subito dopo l'elemento nel suo elenco (null se era il primo, o l'ultimo). */
export interface ViciniCestino { prima: string | null; dopo: string | null }

/** I tipi di elemento che il server mette nel cestino (da L5, migrazione 115, anche il luogo e il negozio). */
export type TipoElementoCestino = Exclude<TipoCestino, 'partita' | 'fonte-acquisto'|'fonte-pesca'|'sessione-pesca'|'osservazione-pesca'|'persona-scorta'>;

/** L'elemento che si elimina, per l'elenco del cestino; `vicini` per rimetterlo al suo posto (aree, voci). */
export interface ElementoCestino { tipo: TipoElementoCestino; chiave: string; nome: string; contesto?: string; vicini?: ViciniCestino }
export interface ElementoCestinoPrivato { tipo: 'partita' | 'fonte-acquisto'|'fonte-pesca'|'sessione-pesca'|'osservazione-pesca'|'persona-scorta'; chiave: string; nome: string; contesto?: string; partitaId: number }

/** Le tabelle del cestino stesso non si registrano. */
const ESCLUSE: Record<Schema, ReadonlySet<string>> = { main: new Set(['cestino']), utente: new Set(['cestino_partite', ...ARCHIVI_LEGACY_IMMUTABILI]) };

/** La riga che è l'elemento: se dopo il ripristino non c'è, non si è rimesso niente. */
const RADICE: Record<TipoElementoCestino, { tabella: string; colonna: string }> = {
  area: { tabella: 'dungeon_area', colonna: 'chiave' },
  voce: { tabella: 'punto_interesse', colonna: 'chiave' },
  mappa: { tabella: 'mappa', colonna: 'chiave' },
  'area-dedalo': { tabella: 'area_dedalo', colonna: 'chiave' },
  // un'Area del mondo con le sue planimetrie (L2, migrazione 109)
  'area-fisica': { tabella: 'area', colonna: 'chiave' },
  // L5 (migrazione 115): un luogo con i suoi pin, un negozio con articoli, acquisti e punti
  luogo: { tabella: 'luogo', colonna: 'chiave' },
  negozio: { tabella: 'negozio', colonna: 'chiave' },
  // L6 (R6-04): una Richiesta dei Mementos; le condizioni che la citano restano (per chiave) e danno «Richiesta eliminata»
  richiesta: { tabella: 'richiesta', colonna: 'chiave' },
  oggetto: { tabella: 'catalogo_oggetto', colonna: 'chiave' },
  // R10-23/3: le righe del catalogo create dall'utente (articoli, libri, film, attività, domande, cruciverba) non si cancellano più a mano
  articolo: { tabella: 'articolo', colonna: 'chiave' },
  libro: { tabella: 'libro', colonna: 'chiave' },
  film: { tabella: 'film', colonna: 'chiave' },
  attivita: { tabella: 'attivita', colonna: 'chiave' },
  domanda: { tabella: 'domanda', colonna: 'chiave' },
  cruciverba: { tabella: 'cruciverba', colonna: 'chiave' },
  // R9-07c/1: un invito di un Confidente creato dall'utente
  invito: { tabella: 'confidente_invito', colonna: 'chiave' },
  'voce-diario': { tabella: 'voce_giornata', colonna: 'uid' },
  pin: { tabella: 'spillo', colonna: 'uid' },
};

/**
 * Come si chiamano per l'utente le righe che un'eliminazione si porta via, al singolare e al plurale («1 infiltrazione»,
 * «7 voci della guida»); le altre tabelle col loro nome.
 */
const ETICHETTE: Record<string, readonly [uno: string, molti: string]> = {
  catalogo_oggetto: ['oggetto', 'oggetti'], voce_oggetto: ['contenuto collegato', 'contenuti collegati'],
  ricompensa_oggetto: ['ricompensa collegata', 'ricompense collegate'], ricetta_materiale: ['materiale collegato', 'materiali collegati'],
  proposta_abbinamento: ['proposta di abbinamento', 'proposte di abbinamento'],
  negozio_luogo_extra: ['sede del listino', 'sedi del listino'], negozio_sede_spillo: ['sede confermata di un pin', 'sedi confermate dei pin'],
  dungeon_area: ['infiltrazione', 'infiltrazioni'], punto_interesse: ['voce della guida', 'voci della guida'],
  marcatore_mappa: ['segnaposto di una voce', 'segnaposto delle voci'], spillo: ['pin', 'pin'], spillo_voce: ['collegamento pin-voce', 'collegamenti pin-voce'],
  spillo_immagine: ['schermata di un pin', 'schermate dei pin'], spillo_destinazione: ['destinazione di un pin', 'destinazioni dei pin'],
  immagine: ['immagine', 'immagini'], mappa: ['planimetria', 'planimetrie'], mappa_entita: ['legame planimetria-infiltrazione', 'legami planimetria-infiltrazione'],
  mappa_alias: ['nome di prima di una mappa', 'nomi di prima delle mappe'], mappa_percorso: ['percorso di una mappa', 'percorsi delle mappe'],
  mappa_presentazione: ['presentazione di una mappa', 'presentazioni delle mappe'], pezzo_mappa: ['pezzo di una planimetria', 'pezzi delle planimetrie'],
  copia_pezzo: ['copia di un pezzo', 'copie dei pezzi'], pianta_area: ['pianta di un’infiltrazione', 'piante delle infiltrazioni'],
  guida_mappa: ['scheda di guida di un’infiltrazione', 'schede di guida delle infiltrazioni'], guida_alias: ['nome di prima di un’infiltrazione', 'nomi di prima delle infiltrazioni'],
  area_dedalo: ['area di un dedalo', 'aree dei dedali'], area: ['area', 'aree'], quartiere_ingresso: ['ingresso di un quartiere', 'ingressi dei quartieri'], persona_area_dedalo: ['Persona di un’area di un dedalo', 'Persona delle aree dei dedali'],
  // L3 (migrazione 110)
  infiltrazione_area: ['legame infiltrazione-area', 'legami infiltrazione-area'], voce_infiltrazione: ['infiltrazione di una voce del diario', 'infiltrazioni delle voci del diario'],
  proposta_infiltrazione_voce: ['proposta d’infiltrazione di una voce del diario', 'proposte d’infiltrazione delle voci del diario'],
  richiesta: ['Richiesta', 'Richieste'], dati_guida: ['dato della guida', 'dati della guida'],
  punto_partita: ['spunta di una voce nelle partite', 'spunte delle voci nelle partite'], spillo_partita: ['stato di un pin nelle partite', 'stati dei pin nelle partite'],
  timbri_dedalo_partita: ['conteggio dei timbri nelle partite', 'conteggi dei timbri nelle partite'],
  spunta_voce_partita: ['spunta del diario nelle partite', 'spunte del diario nelle partite'],
  // L8 (migrazione 166): le Ombre
  ombra_luogo: ['luogo d’incontro di un’Ombra', 'luoghi d’incontro delle Ombre'], ombra_voce: ['collegamento voce-Ombra', 'collegamenti voce-Ombra'],
  // L4 (utente 022)
  divergenza_partita: ['divergenza da verificare nelle partite', 'divergenze da verificare nelle partite'],
  // L4 (§8.11, utente 023)
  spillo_partita_infiltrazione: ['stato di un pin in un’infiltrazione nelle partite', 'stati dei pin per infiltrazione nelle partite'],
  // L5 (migrazione 115): luoghi e negozi
  luogo: ['luogo', 'luoghi'], negozio: ['negozio', 'negozi'], articolo: ['articolo', 'articoli'], attivita: ['attività', 'attività'],
  marcatore_luogo: ['segnaposto di un luogo', 'segnaposto dei luoghi'],
  acquisto_partita: ['acquisto nelle partite', 'acquisti nelle partite'], punti_negozio_partita: ['punti di un negozio nelle partite', 'punti dei negozi nelle partite'],
  sessione_videogioco_partita: ['dichiarazione di sessione giocata', 'dichiarazioni di sessione giocata'],
  voce_giornata: ['voce del Diario', 'voci del Diario'], voce_effetto: ['effetto della voce', 'effetti della voce'],
  voce_effetto_transizione: ['provenienza degli effetti', 'provenienze degli effetti'],
  proposta_effetto_voce: ['raccordo degli effetti', 'raccordi degli effetti'], operazione_effetti_voce: ['decisione sugli effetti', 'decisioni sugli effetti'],
  // L13 (migrazione 236)
  proposta_conversione_voce: ['proposta da completare di una voce del Diario', 'proposte da completare delle voci del Diario'],
  acquisto_registrato: ['consumazione registrata', 'consumazioni registrate'], acquisto_provenienza: ['fonte di acquisto', 'fonti di acquisto'],
  acquisto_operazione: ['ricevuta di acquisto', 'ricevute di acquisto'], effetto_applicato: ['ricevuta di un effetto', 'ricevute degli effetti'],
  da_applicare: ['proposta personale', 'proposte personali'], movimento_yen: ['movimento di denaro', 'movimenti di denaro'],
  // L13 (decisione 18, utente 048)
  yen_automatico: ['movimento automatico di denaro', 'movimenti automatici di denaro'],
  proposta_operazione: ['decisione personale', 'decisioni personali'], beneficio_ciclo: ['stato del beneficio', 'stati dei benefici'],
  // R11-06: nomi leggibili per le righe saltate di tabelle tolte o recenti (le etichette delle tabelle tolte non si ripuliscono mai)
  lettura_partita: ['lettura completata nelle partite', 'letture completate nelle partite'], requisito_partita: ['requisito confermato nelle partite', 'requisiti confermati nelle partite'],
  giorno_calendario: ['giorno del calendario', 'giorni del calendario'], giorno_percorso: ['giorno del percorso', 'giorni del percorso'],
  pianta_quartiere: ['pianta di un quartiere', 'piante dei quartieri'],
  ombra: ['Ombra', 'Ombre'], giorno: ['giorno del gioco', 'giorni del gioco'], evento_calendario_voce: ['collegamento evento-voce', 'collegamenti evento-voce'],
  fortuna_partita: ['stato della Fortuna nelle partite', 'stati della Fortuna nelle partite'], effetto_stato_voce: ['stato segnato da una voce nelle partite', 'stati segnati dalle voci nelle partite'],
  esame_piazzamento_partita: ['piazzamento a un esame nelle partite', 'piazzamenti agli esami nelle partite'],
  confidente_invito: ['invito del Confidente', 'inviti dei Confidenti'],
  oggetto_ottenuto_partita: ['oggetto ricevuto nelle partite', 'oggetti ricevuti nelle partite'], sblocco_partita: ['sblocco ricevuto nelle partite', 'sblocchi ricevuti nelle partite'],
};

/** Il nome per l'utente di `quante` righe di una tabella (al singolare per una sola). */
export function etichettaTabella(tabella: string, quante = 2): string {
  const e = ETICHETTE[tabella];
  return e ? e[quante === 1 ? 0 : 1] : tabella.replace(/_/g, ' ');
}

/**
 * Ciò che riceve chi rimette a posto dopo un ripristino: la chiave dell'elemento, i suoi vicini quando fu eliminato, e le righe
 * non rimesse (per tabella): se il registro è tornato tutto, i dati sono già com'erano e spesso non c'è niente da fare.
 */
export type DopoRipristinoCestino = (chiave: string, vicini: ViciniCestino | null, saltate: readonly SaltataCestinoDto[]) => void;

/** Dopo un ripristino, ciò che dipende dall'elemento (ordine delle aree, percorsi delle mappe): lo registra il servizio del tipo. */
const dopoRipristino = new Map<TipoElementoCestino, DopoRipristinoCestino>();

/** Registra ciò che va rimesso a posto dopo il ripristino di un elemento di un tipo (una funzione per tipo). */
export function registraRipristinoCestino(tipo: TipoElementoCestino, fn: DopoRipristinoCestino): void {
  dopoRipristino.set(tipo, fn);
}

// ---- Le colonne e le chiavi delle tabelle ----

const virgolette = (nome: string): string => `"${nome.replace(/"/g, '""')}"`;

/** Un valore della fotografia conta se non è vuoto: né NULL né '', '[]', '{}', '0', 'null' (una colonna tolta con un valore così non è una perdita). */
const valoreInformativo = (v: Valore | undefined): boolean => v !== undefined && v !== null && !['', '[]', '{}', '0', 'null'].includes(typeof v === 'object' ? 'blob' : String(v));
const stringa = (testo: string): string => `'${testo.replace(/'/g, "''")}'`;

/** Le tabelle di uno schema da registrare. */
function tabelle(db: AppDatabase, schema: Schema): string[] {
  return (db.prepare(`SELECT name FROM ${schema}.sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`).all() as Array<{ name: string }>)
    .map((r) => r.name).filter((t) => !ESCLUSE[schema].has(t));
}

/** Le colonne di una tabella e quelle della sua chiave primaria (nell'ordine della chiave); null se la tabella non c'è più. */
function strutturaTabella(db: AppDatabase, schema: Schema, tabella: string): { colonne: string[]; chiave: string[] } | null {
  if (!db.prepare(`SELECT 1 FROM ${schema}.sqlite_master WHERE type='table' AND name=?`).get(tabella)) return null;
  const info = db.prepare('SELECT name, pk FROM pragma_table_info(?, ?) ORDER BY cid').all(tabella, schema) as Array<{ name: string; pk: number }>;
  if (info.length === 0) return null;
  const chiave = info.filter((c) => c.pk > 0).sort((a, b) => a.pk - b.pk).map((c) => c.name);
  // tutte le tabelle dei due file hanno una chiave primaria (verificato sullo schema, 2026-10-16); senza, il rowid si registra
  // come una colonna (i trigger leggono `old."rowid"`) e fa da chiave
  if (chiave.length === 0) return { colonne: ['rowid', ...info.map((c) => c.name)], chiave: ['rowid'] };
  return { colonne: info.map((c) => c.name), chiave };
}

// ---- Valori ----

function serializza(v: unknown): Valore {
  if (v === null || v === undefined) return null;
  if (Buffer.isBuffer(v)) return { $blob: v.toString('base64') };
  if (typeof v === 'bigint') return Number(v);
  return v as string | number;
}

function deserializza(v: Valore): unknown {
  return v !== null && typeof v === 'object' ? Buffer.from(v.$blob, 'base64') : v;
}

/** Lo stesso valore (BLOB compresi, già serializzati). */
const stesso = (a: Valore | undefined, b: Valore | undefined): boolean => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const uguali = (a: Riga, b: Riga, colonne: readonly string[]): boolean => colonne.every((c) => stesso(a[c], b[c]));

/**
 * Le tabelle che l'app ricalcola da sé (i percorsi delle mappe e i loro nomi di prima, da `sincronizzaPercorsiMappe`): una loro riga
 * cambiata dopo l'eliminazione, o con la chiave ormai presa, non blocca il ripristino. Si salta, e chi rimette a posto il tipo le
 * ricalcola (`registraRipristinoCestino`).
 */
const DERIVATE: ReadonlySet<string> = new Set(['mappa_percorso', 'mappa_alias']);

// ---- Registrare un'eliminazione ----

/** Vero mentre un'eliminazione si sta registrando: una dentro l'altra la registra quella di fuori. */
let registrando = false;

/** Lettura del contesto: le eliminazioni aggregate mantengono un solo registro esterno. */
export function registrazioneCestinoInCorso(): boolean { return registrando; }

/**
 * Esegue `opera` (l'eliminazione) in una transazione registrando ogni riga che tocca nei due file, e mette nel cestino il
 * registro con l'elemento. Se `opera` fallisce non resta niente (né l'eliminazione né il registro). Chiamata dentro un'altra
 * registrazione, esegue solo `opera`: le sue righe finiscono nel registro di quella di fuori.
 */
export function conCestino<T>(elemento: ElementoCestino | ElementoCestinoPrivato, opera: () => T): T {
  if (registrando) return opera();
  const db = getDb();
  const passi: Array<Omit<Passo, 'seq'> & { schema: Schema }> = [];
  const colonne = new Map<string, string[]>();
  db.function('cestino_registra', { varargs: true }, (...argomenti: unknown[]) => {
    const [schema, tabella, op] = argomenti as [Schema, string, Operazione];
    const nomi = colonne.get(`${schema}.${tabella}`)!;
    const riga = (da: number): Riga => Object.fromEntries(nomi.map((c, i) => [c, serializza(argomenti[da + i])]));
    if (op === 'D') passi.push({ schema, tabella, op, prima: riga(3) });
    else if (op === 'I') passi.push({ schema, tabella, op, dopo: riga(3) });
    else {
      const prima = riga(3), dopo = riga(3 + nomi.length);
      // un UPDATE che lascia la riga com'era (es. `SET ordine = ordine` o un allineamento che non cambia nulla) non serve
      if (!uguali(prima, dopo, nomi)) passi.push({ schema, tabella, op, prima, dopo });
    }
    return null;
  });
  const ricorsivi = db.pragma('recursive_triggers', { simple: true }) as number;
  db.pragma('recursive_triggers = ON');
  registrando = true;
  try {
    return db.transaction(() => {
      const trigger: string[] = [];
      try {
        for (const schema of ['main', 'utente'] as const) {
          tabelle(db, schema).forEach((tabella, i) => {
            const nomi = strutturaTabella(db, schema, tabella)!.colonne;
            colonne.set(`${schema}.${tabella}`, nomi);
            const vecchie = nomi.map((c) => `old.${virgolette(c)}`).join(', ');
            const nuove = nomi.map((c) => `new.${virgolette(c)}`).join(', ');
            const su = `${schema}.${virgolette(tabella)}`;
            const chiama = (op: Operazione, valori: string) => `SELECT cestino_registra(${stringa(schema)}, ${stringa(tabella)}, '${op}', ${valori});`;
            for (const [op, quando, valori] of [['D', 'DELETE', vecchie], ['U', 'UPDATE', `${vecchie}, ${nuove}`], ['I', 'INSERT', nuove]] as const) {
              const nome = `cestino_${schema}_${i}_${op}`;
              db.exec(`CREATE TEMP TRIGGER ${nome} AFTER ${quando} ON ${su} BEGIN ${chiama(op, valori)} END`);
              trigger.push(nome);
            }
          });
        }
        const esito = opera();
        for (const nome of trigger.splice(0)) db.exec(`DROP TRIGGER temp.${nome}`);
        salvaNelCestino(db, elemento, passi);
        return esito;
      } finally {
        // con un errore la transazione si annulla e i trigger con lei; si tolgono comunque, per non lasciarli mai attivi
        for (const nome of trigger) db.exec(`DROP TRIGGER IF EXISTS temp.${nome}`);
      }
    })();
  } finally {
    registrando = false;
    db.pragma(`recursive_triggers = ${ricorsivi ? 'ON' : 'OFF'}`);
  }
}

/** La registrazione usa lo stesso writer dei trigger, ma i metadati personali restano soltanto in utente. */
export function conCestinoPrivato<T>(elemento: ElementoCestinoPrivato, opera: () => T): T {
  return conCestino(elemento, opera);
}

/** Mette nel cestino l'elemento con il suo registro, diviso fra i due file (stesso `uid`). */
function salvaNelCestino(db: AppDatabase, elemento: ElementoCestino | ElementoCestinoPrivato, passi: ReadonlyArray<Omit<Passo, 'seq'> & { schema: Schema }>): void {
  if (elemento.tipo === 'pin') verificaRegistroCestinoPin(db, passi, elemento.chiave);
  const uid = randomBytes(16).toString('hex');
  const adesso = nowIso();
  const numerati = passi.map((p, seq) => ({ ...p, seq }));
  const diSchema = (schema: Schema): Passo[] => numerati.filter((p) => p.schema === schema).map(({ schema: _s, ...p }) => p);
  const gioco = diSchema('main'), partite = diSchema('utente');
  if ('partitaId' in elemento) {
    if (gioco.length) throw httpErrors.conflict('cestino-privato-schema', 'Una rimozione personale ha coinvolto dati di gioco: transazione annullata.');
    if (!partite.length) return;
    // L12: il cestino personale è di chi ha eliminato (il proprietario della richiesta; in preparazione l'unico)
    db.prepare('INSERT INTO utente.cestino_partite(uid,registro_json,eliminato_il,tipo,chiave,nome,contesto,partita_id,riepilogo_json,formato,proprietario) VALUES (?,?,?,?,?,?,?,?,?,1,?)')
      .run(uid, JSON.stringify(partite), adesso, elemento.tipo, elemento.chiave, elemento.nome, elemento.contesto ?? '', elemento.partitaId, JSON.stringify(riepilogo(db, 'utente', partite)), getProprietario());
    return;
  }
  db.prepare('INSERT INTO main.cestino (uid, tipo, chiave, nome, contesto, riepilogo_json, registro_json, con_partite, vicini_json, eliminato_il) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(uid, elemento.tipo, elemento.chiave, elemento.nome, elemento.contesto ?? '', JSON.stringify(riepilogo(db, 'main', gioco)), JSON.stringify(gioco), partite.length ? 1 : 0,
      elemento.vicini ? JSON.stringify(elemento.vicini) : null, adesso);
  if (partite.length) db.prepare('INSERT INTO utente.cestino_partite (uid, registro_json, eliminato_il) VALUES (?, ?, ?)').run(uid, JSON.stringify(partite), adesso);
}

/**
 * Quante righe di ogni tabella se ne sono andate davvero: una riga cancellata e poi reinserita con la stessa chiave (i percorsi delle
 * mappe, che il ricalcolo riscrive tutti) non è tolta. La chiave è quella della tabella di adesso.
 */
function riepilogo(db: AppDatabase, schema: Schema, passi: readonly Passo[]): Record<string, number> {
  const via = new Map<string, Map<string, boolean>>();
  for (const p of passi) {
    if (p.op === 'U') continue;
    const s = strutturaTabella(db, schema, p.tabella);
    const riga = (p.op === 'D' ? p.prima : p.dopo)!;
    const chiave = (s?.chiave ?? Object.keys(riga)).map((c) => JSON.stringify(riga[c] ?? null)).join('|');
    if (!via.has(p.tabella)) via.set(p.tabella, new Map());
    via.get(p.tabella)!.set(chiave, p.op === 'D');
  }
  const conti: Record<string, number> = {};
  for (const [tabella, righe] of via) {
    const n = [...righe.values()].filter(Boolean).length;
    if (n) conti[tabella] = n;
  }
  return conti;
}

// ---- L'elenco ----

interface RigaCestino { id: number; uid: string; tipo: TipoElementoCestino; chiave: string; nome: string; contesto: string; riepilogo_json: string; registro_json: string; con_partite: number; vicini_json: string | null; eliminato_il: string }

/** Gli elementi del cestino, dal più recente, con quel che contengono (dati di gioco e partite). */
export function elencoCestino(): VoceCestinoDto[] {
  const db = getDb();
  const righe = db.prepare('SELECT id, uid, tipo, chiave, nome, contesto, riepilogo_json, con_partite, length(registro_json) AS byte_gioco, eliminato_il FROM main.cestino ORDER BY eliminato_il DESC, id DESC')
    .all() as Array<Omit<RigaCestino, 'registro_json'> & { byte_gioco: number }>;
  const partite = db.prepare('SELECT registro_json FROM utente.cestino_partite WHERE uid = ?');
  return righe.map((r) => {
    const conti: Record<string, number> = { ...(JSON.parse(r.riepilogo_json) as Record<string, number>) };
    const p = partite.get(r.uid) as { registro_json: string } | undefined;
    if (p) for (const [t, n] of Object.entries(riepilogo(db, 'utente', JSON.parse(p.registro_json) as Passo[]))) conti[t] = (conti[t] ?? 0) + n;
    const contenuto: ContenutoCestinoDto[] = Object.entries(conti).map(([tabella, quante]) => ({ tabella, etichetta: etichettaTabella(tabella, quante), quante }))
      .sort((a, b) => b.quante - a.quante || a.etichetta.localeCompare(b.etichetta));
    const statoPartite = !r.con_partite ? 'nessuna' : p ? 'presente' : 'mancante';
    return { id: r.id, tipo: r.tipo as TipoCestino, chiave: r.chiave, nome: r.nome, contesto: r.contesto, eliminatoIl: r.eliminato_il, contenuto, partite: statoPartite, byte: r.byte_gioco + (p?.registro_json.length ?? 0) };
  });
}

interface RigaCestinoPrivato { uid: string; registro_json: string; eliminato_il: string; tipo: ElementoCestinoPrivato['tipo']; chiave: string; nome: string; contesto: string | null; partita_id: number; riepilogo_json: string; formato: number }
function verificaMetadatiPrivati(r: RigaCestinoPrivato): void {
  if (r.formato !== 1 || !['partita', 'fonte-acquisto', 'persona-scorta', ...TIPI_CESTINO_PESCA].includes(r.tipo) || typeof r.chiave !== 'string' || typeof r.nome !== 'string'
    || !Number.isSafeInteger(r.partita_id) || r.partita_id < 1 || !/^[0-9a-f]{32}$/.test(r.uid)
    || typeof r.registro_json !== 'string' || typeof r.riepilogo_json !== 'string' || typeof r.eliminato_il !== 'string'
    || !(r.contesto === null || typeof r.contesto === 'string')
    || (r.tipo === 'partita' ? r.chiave !== String(r.partita_id) : r.tipo === 'persona-scorta' ? !/^[1-9]\d{0,14}$/.test(r.chiave) : TIPI_CESTINO_PESCA.includes(r.tipo as typeof TIPI_CESTINO_PESCA[number]) ? !radiceCestinoPesca(r.tipo,r.chiave) : !/^[0-9a-f]{32}$/.test(r.chiave) && !(r.chiave.startsWith('legacy:') && r.chiave.length > 7))) {
    throw httpErrors.conflict('cestino-privato-illeggibile', 'I metadati del cestino personale non sono riconoscibili: dati conservati.');
  }
}
/**
 * Le voci del cestino PERSONALE del proprietario della richiesta (L12): solo le sue, e con `partitaId` solo quelle di quella partita.
 * Le voci di una partita eliminata (tipo `partita`) hanno il suo id anche se la riga non c'è più: si trovano con lo stesso filtro.
 */
function vociCestinoPrivate(partitaId?: number): VoceCestinoUnificatoDto[] {
  const righe: VoceCestinoUnificatoDto[] = [];
  const filtro = partitaId === undefined ? '' : ' AND partita_id = ?';
  const parametri: unknown[] = partitaId === undefined ? [getProprietario()] : [getProprietario(), partitaId];
  for (const r of getDb().prepare(`SELECT * FROM utente.cestino_partite WHERE tipo IS NOT NULL AND proprietario = ?${filtro}`).iterate(...parametri) as Iterable<RigaCestinoPrivato>) {
    verificaMetadatiPrivati(r);
    let conti: unknown;
    try { conti = JSON.parse(r.riepilogo_json) as unknown; } catch { conti = null; }
    if (!conti || typeof conti !== 'object' || Array.isArray(conti) || Object.values(conti).some(n => !Number.isSafeInteger(n) || Number(n) < 0)) {
      throw httpErrors.conflict('cestino-privato-illeggibile', 'Il riepilogo del cestino personale non è riconoscibile: dati conservati.');
    }
    const contenuto = Object.entries(conti).map(([tabella, quante]) => ({ tabella, quante: Number(quante), etichetta: etichettaTabella(tabella, Number(quante)) }));
    righe.push({ id: null, riferimento: { schema: 'utente', uid: r.uid }, tipo: r.tipo, chiave: r.chiave, nome: r.nome,
      contesto: r.contesto ?? '', eliminatoIl: r.eliminato_il, contenuto, partite: 'presente', byte: Buffer.byteLength(r.registro_json, 'utf8') });
  }
  return righe;
}

/** Il cestino della preparazione: voci di gioco e voci personali del proprietario, dalla più recente. */
export function elencoCestinoUnificato(): VoceCestinoUnificatoDto[] {
  const righe: VoceCestinoUnificatoDto[] = elencoCestino().map(r => ({ ...r, riferimento: { schema: 'main' as const, id: r.id } }));
  righe.push(...vociCestinoPrivate());
  return righe.sort((a, b) => b.eliminatoIl.localeCompare(a.eliminatoIl));
}

/**
 * Il cestino PERSONALE del proprietario (L12, rotte `/api/partite/…/cestino`): solo le sue voci, mai quelle di gioco (che in
 * rilascio non esistono), dalla più recente. Con `partitaId` solo le voci di quella partita.
 */
export function elencoCestinoPersonale(partitaId?: number): VoceCestinoUnificatoDto[] {
  return vociCestinoPrivate(partitaId).sort((a, b) => b.eliminatoIl.localeCompare(a.eliminatoIl));
}

// ---- Rimettere ----

/** Un errore di vincolo di SQLite, per codice. */
function codiceSqlite(err: unknown): string | null {
  return err && typeof err === 'object' && 'code' in err && typeof (err as { code: unknown }).code === 'string' ? (err as { code: string }).code : null;
}

/** Un registro illeggibile non autorizza un reverse parziale o un reset. */
function leggiPassiCestino(raw: string, schema: Schema): Passo[] {
  const errore = () => httpErrors.conflict('cestino-registro-illeggibile', 'Il registro del cestino non è riconoscibile: nessun dato è stato rimesso o cancellato.');
  let x: unknown;
  try { x = JSON.parse(raw) as unknown; } catch { throw errore(); }
  if (!Array.isArray(x)) throw errore();
  const valore = (v: unknown): v is Valore => v === null || typeof v === 'string' || (typeof v === 'number' && Number.isFinite(v))
    || (!!v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 1 && '$blob' in v && typeof v.$blob === 'string'
      && Buffer.from(v.$blob, 'base64').toString('base64') === v.$blob);
  const riga = (v: unknown): v is Riga => !!v && typeof v === 'object' && !Array.isArray(v) && Object.values(v).every(valore);
  for (const p of x) {
    if (!p || typeof p !== 'object' || Array.isArray(p)) throw errore();
    const o = p as Record<string, unknown>;
    if (!Number.isSafeInteger(o.seq) || Number(o.seq) < 0 || typeof o.tabella !== 'string' || !o.tabella.length
      || typeof o.op !== 'string' || !['D','U','I'].includes(o.op) || Object.keys(o).some(k => !['seq','tabella','op','prima','dopo'].includes(k))) throw errore();
    if (o.op === 'D' ? !riga(o.prima) || 'dopo' in o : o.op === 'I' ? !riga(o.dopo) || 'prima' in o : !riga(o.prima) || !riga(o.dopo)) throw errore();
    const s = strutturaTabella(getDb(), schema, o.tabella);
    for (const lato of [o.prima, o.dopo]) if (riga(lato) && s) {
      for (const chiave of s.chiave) if (!(chiave in lato) || (typeof lato[chiave] === 'number' && !Number.isSafeInteger(lato[chiave]))) throw errore();
    }
  }
  return x as Passo[];
}

/**
 * Rimette un elemento del cestino com'era (vedi l'intestazione): 404 se non c'è, 409 se una chiave da reinserire nel file di gioco
 * è ormai presa da un'altra riga o se l'elemento non torna. Riuscito, l'elemento esce dal cestino.
 */
export function ripristinaDalCestino(id: number): EsitoRipristinoCestinoDto {
  const db = getDb();
  const r = db.prepare('SELECT * FROM main.cestino WHERE id = ?').get(id) as RigaCestino | undefined;
  if (!r) throw httpErrors.notFound('cestino-non-trovato', 'L’elemento non è più nel cestino.');
  const parteP = db.prepare('SELECT registro_json FROM utente.cestino_partite WHERE uid = ?').get(r.uid) as { registro_json: string } | undefined;
  return ripristinaRegistro({ ...r, tipo: r.tipo as TipoCestino }, parteP);
}

/** L'identità dei cestini personali è l'UID del file utente, mai un ID del file di gioco. */
export function ripristinaCestinoPrivato(uid: string, partitaId?: number): EsitoRipristinoCestinoDto {
  const db = getDb();
  // L12: solo una voce del proprietario della richiesta (e, se indicata, di quella partita); un'altra voce è «non più nel cestino»
  const r = db.prepare('SELECT * FROM utente.cestino_partite WHERE uid=? AND tipo IS NOT NULL AND proprietario=?').get(uid, getProprietario()) as RigaCestinoPrivato | undefined;
  if (!r || (partitaId !== undefined && r.partita_id !== partitaId)) throw httpErrors.notFound('cestino-non-trovato', 'L’elemento personale non è più nel cestino.');
  verificaMetadatiPrivati(r);
  return ripristinaRegistro({ id: null, uid: r.uid, tipo: r.tipo, chiave: r.chiave, nome: r.nome,
    registro_json: '[]', con_partite: 1, vicini_json: null, partitaId: r.partita_id }, r);
}

// L13 (decisione 18): anche i movimenti automatici degli yen (`yen_automatico`) sono storia durevole del saldo: un ripristino che non sia di una
// partita intera non li riapre né li richiude, e non rimette il saldo (`partita.yen`, qui sotto); la Richiesta rimessa li riallinea da sé e la
// voce rimessa rifà i movimenti che la sua eliminazione aveva chiuso (`rimettiYenDellaVoceRipristinata`), con nuove righe
const DURATURE_ACQUISTI = new Set(['da_applicare', 'movimento_yen', 'yen_automatico', 'acquisto_operazione', 'proposta_operazione', 'effetto_applicato', 'beneficio_ciclo','pesca_operazione','pesca_quota_storica','movimento_punti_pesca','punti_pesca_partita']);
interface IdentitaRipristino { id: number | null; uid: string; tipo: TipoCestino; chiave: string; nome: string; registro_json: string; con_partite: number; vicini_json: string | null; partitaId?: number }
function ripristinaRegistro(r: IdentitaRipristino, parteP?: { registro_json: string }): EsitoRipristinoCestinoDto {
  const db = getDb();
  const fontePrivataUuid = r.id === null && r.tipo === 'fonte-acquisto' && !r.chiave.startsWith('legacy:');
  const radicePesca=r.id===null?radiceCestinoPesca(r.tipo,r.chiave):null;
  // R10-23/2: la Persona della scorta ha per radice la sua riga di `persona_posseduta` (chiave = id numerico, nella partita indicata)
  const radiceScorta = r.id === null && r.tipo === 'persona-scorta' ? { tabella: 'persona_posseduta', id: Number(r.chiave) } : null;
  const passi = [
    ...leggiPassiCestino(r.registro_json, 'main').map((p) => ({ ...p, schema: 'main' as Schema })),
    ...(parteP ? leggiPassiCestino(parteP.registro_json, 'utente').map((p) => ({ ...p, schema: 'utente' as Schema })) : []),
  ].sort((a, b) => b.seq - a.seq);
  if (new Set(passi.map(p => p.seq)).size !== passi.length) throw httpErrors.conflict('cestino-registro-illeggibile', 'Il registro contiene posizioni duplicate: nessun reverse è stato eseguito.');
  if (r.id === null) {
    const radici = passi.filter(p => p.schema === 'utente' && p.op === 'D' && (
      r.tipo === 'partita' ? p.tabella === 'partita' && p.prima?.id === r.partitaId
        : r.chiave.startsWith('legacy:') ? p.tabella === 'acquisto_partita' && p.prima?.partita_id === r.partitaId && p.prima?.articolo_chiave === r.chiave.slice(7)
          : radiceScorta ? p.tabella === radiceScorta.tabella && p.prima?.id === radiceScorta.id && p.prima?.partita_id === r.partitaId
          : radicePesca ? p.tabella===radicePesca.tabella&&p.prima?.id===radicePesca.id&&p.prima?.partita_id===r.partitaId
          : p.tabella === 'acquisto_provenienza' && p.prima?.id === r.chiave && p.prima?.partita_id === r.partitaId));
    if (radici.length !== 1) throw httpErrors.conflict('cestino-identita-privata-incoerente', 'Il registro non descrive un’unica eliminazione dell’identità personale indicata: dati conservati.');
    for (const p of passi) for (const lato of [p.prima, p.dopo]) if (lato && typeof lato.partita_id === 'number' && lato.partita_id !== r.partitaId) {
      throw httpErrors.conflict('cestino-partita-diversa', 'Il registro personale contiene dati di un’altra partita: ripristino annullato.');
    }
    for (const p of passi) if (p.tabella === 'partita' && (p.prima ?? p.dopo)?.id !== r.partitaId) {
      // La sola promozione dell'altra partita avvenuta durante DELETE è nota:
      // rimettendo l'eliminata non modifica chi è attivo adesso.
      if (r.tipo !== 'partita' || p.op !== 'U' || !p.prima || !p.dopo || p.prima.id !== p.dopo.id
        || Object.keys(p.prima).some(c => c !== 'attiva' && !stesso(p.prima![c], p.dopo![c]))) {
        throw httpErrors.conflict('cestino-partita-diversa', 'Una modifica a un’altra partita non appartiene a questo ripristino.');
      }
    }
  }
  // l'eliminazione aveva una parte nelle partite che non c'è più (file delle partite sostituito dopo): si rimettono i dati di gioco
  const partiteMancanti = !!r.con_partite && !parteP;

  const strutture = new Map<string, { colonne: string[]; chiave: string[] } | null>();
  const struttura = (schema: Schema, tabella: string) => {
    const k = `${schema}.${tabella}`;
    if (!strutture.has(k)) strutture.set(k, strutturaTabella(db, schema, tabella));
    return strutture.get(k)!;
  };
  let rimesse = 0;
  const saltate = new Map<string, SaltataCestinoDto>();
  const salta = (tabella: string, motivo: MotivoSaltataCestinoDto, chiave: string, colonne?: string[], sostituitaDa?: string | null) => {
    const k = `${tabella}|${motivo}`;
    const s = saltate.get(k) ?? { tabella, etichetta: etichettaTabella(tabella), motivo, quante: 0, esempi: [] };
    s.quante++;
    if (chiave !== '' && s.esempi.length < 5) s.esempi.push(chiave);
    if (colonne?.length) s.colonne = [...new Set([...(s.colonne ?? []), ...colonne])];
    if (sostituitaDa) s.sostituitaDa = sostituitaDa;
    saltate.set(k, s);
  };
  const occupate: string[] = [];
  const daVerificare: Array<{ schema: Schema; tabella: string; riga: Riga }> = [];
  const attivitaPrecedenti = new Map<string, Record<string, unknown> | null>();

  db.transaction(() => {
    if (r.tipo === 'pin') verificaRegistroCestinoPin(db, passi, r.chiave);
    verificaCestinoLegacy(db, passi);
    const partitaIds = new Set<number>(), acquistoIds = new Set<string>(), voceUids = new Set<string>();
    for (const p of passi) for (const lato of [p.prima, p.dopo]) if (lato) {
      if (p.schema === 'utente') {
        if (typeof lato.partita_id === 'number') partitaIds.add(lato.partita_id);
        if (p.tabella === 'partita' && typeof lato.id === 'number') partitaIds.add(lato.id);
        if (p.tabella === 'acquisto_registrato' && typeof lato.id === 'string') acquistoIds.add(lato.id);
        if (typeof lato.acquisto_id === 'string') acquistoIds.add(lato.acquisto_id);
      }
      if (typeof lato.voce_uid === 'string') voceUids.add(lato.voce_uid);
      if (p.schema === 'main' && p.tabella === 'voce_giornata' && typeof lato.uid === 'string') voceUids.add(lato.uid);
    }
    if (r.id === null && !fontePrivataUuid && !radicePesca && !radiceScorta) {
      const tabella = r.tipo === 'partita' ? 'partita' : 'acquisto_provenienza';
      const presente = r.tipo === 'fonte-acquisto' && r.chiave.startsWith('legacy:')
        ? db.prepare('SELECT 1 FROM utente.acquisto_partita WHERE partita_id=? AND articolo_chiave=?').get(r.partitaId, r.chiave.slice(7))
        : db.prepare(`SELECT 1 FROM utente.${tabella} WHERE id=?`).get(r.chiave);
      if (presente) throw httpErrors.conflict('cestino-chiave-personale-occupata',
        'L’identità personale da ripristinare è già presente: nessuna fusione o sovrascrittura è stata eseguita.');
    }
    // la partita rimessa non toglie l'attiva a nessuno: se il suo proprietario ne ha già una, torna non attiva (l'attiva è una per proprietario)
    const attivaPrima = r.tipo === 'partita' ? db.prepare('SELECT id FROM utente.partita WHERE attiva=1 AND proprietario=?').get(getProprietario()) as { id: number } | undefined : undefined;
    const contestoAcquisti = r.tipo === 'pin' ? null : preparaRipristinoAcquisti({ tipoCestino: r.tipo, partitaIds: [...partitaIds], acquistoIds: [...acquistoIds] });
    for (const p of passi) {
      // La storia dei delta avvenuti dopo l'eliminazione vince. Il dominio ricalcola
      // T−B dopo aver rimesso identità e fonti, senza rieseguire movimenti o premi.
      if (r.tipo !== 'partita' && p.schema === 'utente' && DURATURE_ACQUISTI.has(p.tabella)) continue;
      if (p.schema === 'main' && p.tabella === 'attivita') {
        const fonte = p.prima ?? p.dopo;
        if (typeof fonte?.chiave === 'string' && !attivitaPrecedenti.has(fonte.chiave)) {
          const ora = db.prepare('SELECT * FROM main.attivita WHERE chiave=?').get(fonte.chiave) as Record<string, unknown> | undefined;
          attivitaPrecedenti.set(fonte.chiave, ora ?? (fonte.confidente_chiave != null ? fonte : null));
        }
      }
      const s = struttura(p.schema, p.tabella);
      const riferimento = p.prima ?? p.dopo!;
      const identitaImmutabile = fontePrivataUuid && p.schema === 'utente' && p.op === 'D'
        && ['acquisto_registrato', 'acquisto_provenienza'].includes(p.tabella)
        || !!radicePesca&&p.schema==='utente'&&p.op==='D'&&p.tabella.startsWith('pesca_');
      const eventoAcquisto = p.schema === 'utente' && p.op === 'D' && p.tabella === 'evento_partita'
        && (azioneEventoAcquistoV1(riferimento.dati_json) !== null || eventoPescaMarcato(riferimento.dati_json));
      const radicePin = r.tipo === 'pin' && p.schema === 'main' && p.tabella === 'spillo';
      // L'eccezione UUID non può usare una proiezione parziale né valori di default:
      // anche JSON, legami e metadati devono coincidere esattamente con la fotografia.
      // R11-06: resta stretto per le colonne non dichiarate; tollera solo quelle dichiarate tolte (registro delle fonti tolte)
      if ((identitaImmutabile || eventoAcquisto || radicePin) && (!s || !colonneCompatibili(p.schema, p.tabella, Object.keys(riferimento), s.colonne))) {
        if (radicePin) throw httpErrors.conflict('cestino-pin-registro-incoerente', 'La fotografia integrale del pin non coincide con lo schema corrente: ripristino annullato, cestino conservato.');
        throw httpErrors.conflict('cestino-fotografia-acquisto-incompleta', 'Lo schema e la fotografia integrale personale non coincidono: ripristino annullato, cestino conservato.');
      }
      const descrivi = (riga: Riga) => s ? s.chiave.map((c) => String(riga[c] ?? '')).join(' · ') : '';
      if (!s) {
        // R11-06: una tabella dichiarata tolta (o sparita) non è un errore, nemmeno nel blocco di una partita: la riga non torna e il motivo lo dice
        const tolta = tabellaTolta(p.schema, p.tabella);
        if (tolta) { salta(p.tabella, 'tabella-rimossa', '', undefined, tolta.sostituitaDa); continue; }
        if (r.tipo === 'partita') throw httpErrors.conflict('cestino-schema-partita-incompleto', 'Una tabella del blocco personale non esiste più: il ripristino completo è stato annullato.');
        // una tabella sparita senza dichiarazione è comunque «la tabella non c'è più», non una riga cambiata dopo: stesso motivo, senza «ora:»
        salta(p.tabella, 'tabella-rimossa', ''); continue;
      }
      // solo le colonne che la tabella ha ancora (una migrazione dopo l'eliminazione può averne tolte)
      const colonne = s.colonne.filter((c) => c in riferimento);
      // R11-06: si segnala solo la perdita reale delle colonne tolte: con un valore (eliminazione di una riga), o che l'eliminazione aveva cambiato (modifica);
      // e solo quando la riga è tornata davvero (`esegui` andato a buon fine): una riga già presente, sparita o con un legame mancante non è «tornata senza»
      const perse = Object.keys(riferimento).filter((c) => !s.colonne.includes(c) && (p.op === 'D' ? valoreInformativo(riferimento[c]) : p.op === 'U' ? !stesso(p.prima?.[c], p.dopo?.[c]) : false));
      const sostituite = [...new Set(perse.flatMap((c) => colonnaTolta(p.schema, p.tabella, c)?.sostituitaDa ?? []))].join('; ');
      const segnalaPerse = () => { if (perse.length) salta(p.tabella, 'colonna-rimossa', descrivi(riferimento), perse, sostituite || null); };
      const su = `${p.schema}.${virgolette(p.tabella)}`;
      const dove = s.chiave.map((c) => `${virgolette(c)} IS ?`).join(' AND ');
      const leggi = (riga: Riga): Riga | null => {
        const v = db.prepare(`SELECT ${colonne.map(virgolette).join(', ')} FROM ${su} WHERE ${dove}`).get(...s.chiave.map((c) => deserializza(riga[c] ?? null))) as Record<string, unknown> | undefined;
        return v ? Object.fromEntries(colonne.map((c) => [c, serializza(v[c])])) : null;
      };
      const esegui = (sql: string, valori: unknown[], riga: Riga): boolean => {
        try {
          db.prepare(sql).run(...valori); rimesse++; segnalaPerse();
          if (p.prima) daVerificare.push({ schema: p.schema, tabella: p.tabella, riga: p.prima });
          if (p.dopo) daVerificare.push({ schema: p.schema, tabella: p.tabella, riga: p.dopo });
          return true;
        } catch (err) {
          const codice = codiceSqlite(err);
          if (codice === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
            if (r.tipo === 'partita'||radicePesca||radiceScorta) throw httpErrors.conflict('cestino-legami-partita-incompleti', 'Un legame del blocco personale non è ripristinabile: intera transazione annullata.');
            if (p.schema === 'main' && p.tabella === 'attivita' && riga.confidente_chiave != null) throw httpErrors.conflict('cestino-confidente-mancante', 'Il Confidente dell’attività da ripristinare non è presente: nessun dato è stato rimesso.');
            salta(p.tabella, 'legame-mancante', descrivi(riga)); return false;
          }
          if (codice === 'SQLITE_CONSTRAINT_PRIMARYKEY' || codice === 'SQLITE_CONSTRAINT_UNIQUE') {
            if ((p.schema === 'main' && !DERIVATE.has(p.tabella)) || r.tipo === 'partita' || radicePesca || radiceScorta || (p.schema === 'utente' && ['acquisto_registrato','acquisto_provenienza'].includes(p.tabella))) occupate.push(`${etichettaTabella(p.tabella)}: ${descrivi(riga)}`);
            else salta(p.tabella, 'cambiata-dopo', descrivi(riga));
            return false;
          }
          throw err;
        }
      };
      if (p.op === 'D') {
        const prima = r.tipo === 'partita' && p.schema === 'utente' && p.tabella === 'partita' && attivaPrima
          ? { ...p.prima!, attiva: 0 } : p.prima!;
        const ora = leggi(prima);
        if (ora) {
          if (uguali(ora, prima, colonne)) continue;
          if (identitaImmutabile) throw httpErrors.conflict('cestino-uuid-acquisto-divergente', 'Lo stesso UUID personale ha identità o contenuto immutabile diverso: nessuna fusione o sovrascrittura, intero ripristino annullato.');
          if (eventoAcquisto) throw httpErrors.conflict('cestino-evento-acquisto-divergente', 'L’ID dell’evento di acquisto contiene uno storico diverso: nessuna sovrascrittura, intero ripristino annullato.');
          if ((p.schema === 'main' && !DERIVATE.has(p.tabella)) || r.tipo === 'partita' || radiceScorta || (p.schema === 'utente' && ['acquisto_registrato','acquisto_provenienza'].includes(p.tabella))) occupate.push(`${etichettaTabella(p.tabella)}: ${descrivi(prima)}`);
          else salta(p.tabella, 'cambiata-dopo', descrivi(prima));
          continue;
        }
        esegui(`INSERT INTO ${su} (${colonne.map(virgolette).join(', ')}) VALUES (${colonne.map(() => '?').join(', ')})`, colonne.map((c) => deserializza(prima[c])), prima);
      } else if (p.op === 'U') {
        const prima = p.prima!, dopo = p.dopo!;
        const ora = leggi(dopo);
        if(radicePesca&&(!ora||!uguali(ora,dopo,colonne)&&!uguali(ora,prima,colonne)))throw httpErrors.conflict('pesca-cestino-cambiato','Il blocco della pesca è cambiato dopo la rimozione: nessun ripristino parziale o sovrascrittura.');
        if (!ora) { if (!leggi(prima)) salta(p.tabella, 'non-esiste-piu', descrivi(dopo)); continue; }
        // colonna per colonna: torna com'era ciò che l'eliminazione aveva cambiato e nessuno ha toccato dopo; il resto della riga
        // (anche cambiato dopo) resta com'è. Una colonna cambiata dall'eliminazione e poi di nuovo da altro resta, e si dice.
        // L13 (decisione 18): fuori dal ripristino di una partita intera il saldo yen non si rimette: lo hanno mosso i movimenti automatici
        // (durevoli, non riaperti né richiusi: `DURATURE_ACQUISTI`), e rimetterlo da solo lo staccherebbe dal loro registro
        const cambiate = colonne.filter((c) => !stesso(prima[c], dopo[c]) && !(r.tipo === 'partita' && p.schema === 'utente' && p.tabella === 'partita' && c === 'attiva')
          && !(r.tipo !== 'partita' && p.schema === 'utente' && p.tabella === 'partita' && c === 'yen'));
        const daRimettere = cambiate.filter((c) => stesso(ora[c], dopo[c]));
        // Una fusione cambia puntatori nel JSON della guida, non il testo. Un edit successivo
        // di un altro campo non deve impedire il ripristino del solo riferimento interessato.
        let jsonGestito = false;
        if (r.tipo === 'oggetto' && p.tabella === 'dati_guida' && eBloccoGuidaCatalogo(prima.chiave) && cambiate.includes('json')
          && typeof prima.json === 'string' && typeof dopo.json === 'string' && typeof ora.json === 'string'
          && !stesso(ora.json, dopo.json)) {
          let esito: ReturnType<typeof ripristinaPuntatoriGuida> | undefined;
          try { esito = ripristinaPuntatoriGuida(JSON.parse(prima.json) as unknown, JSON.parse(dopo.json) as unknown, JSON.parse(ora.json) as unknown); }
          catch { salta(p.tabella, 'cambiata-dopo', descrivi(dopo)); }
          if (esito) {
            const ripristinato = JSON.stringify(esito.valore);
            if (ripristinato !== ora.json) esegui(`UPDATE ${su} SET json = ? WHERE ${dove}`,
              [ripristinato, ...s.chiave.map((c) => deserializza(dopo[c] ?? null))], dopo);
            if (esito.conflitti) salta(p.tabella, 'cambiata-dopo', descrivi(dopo));
          }
          jsonGestito = true;
        }
        if (cambiate.some((c) => !(jsonGestito && c === 'json') && !stesso(ora[c], dopo[c]) && !stesso(ora[c], prima[c]))) salta(p.tabella, 'cambiata-dopo', descrivi(dopo));
        if (daRimettere.length) {
          esegui(`UPDATE ${su} SET ${daRimettere.map((c) => `${virgolette(c)} = ?`).join(', ')} WHERE ${dove}`,
            [...daRimettere.map((c) => deserializza(prima[c])), ...s.chiave.map((c) => deserializza(dopo[c] ?? null))], dopo);
        }
      } else {
        const dopo = p.dopo!;
        const ora = leggi(dopo);
        if (!ora) continue;
        if (!uguali(ora, dopo, colonne)) { salta(p.tabella, 'cambiata-dopo', descrivi(dopo)); continue; }
        esegui(`DELETE FROM ${su} WHERE ${dove}`, s.chiave.map((c) => deserializza(dopo[c] ?? null)), dopo);
      }
    }
    if (occupate.length) {
      throw httpErrors.conflict('cestino-chiavi-occupate',
        `Non si può rimettere «${r.nome}»: ${occupate.length === 1 ? 'una riga ha' : `${occupate.length} righe hanno`} la chiave ormai presa da qualcosa creato dopo (${occupate.slice(0, 5).join('; ')}${occupate.length > 5 ? '; …' : ''}).`,
        { occupate });
    }
    for (const [chiave, prima] of attivitaPrecedenti) {
      const ora = db.prepare('SELECT * FROM main.attivita WHERE chiave=?').get(chiave) as Record<string, unknown> | undefined;
      if (ora) verificaAttivitaConfidente(db, ora, prima);
      if (ora) verificaAttivitaPesca(db,ora,prima);
    }
    // Controllo finale della transazione: tutti gli oggetti del registro sono ormai tornati.
    // I JSON e i puntatori fra i due database non hanno foreign key SQLite; in errore
    // l'intero gesto torna indietro e il registro resta recuperabile nel cestino.
    if (db.prepare("SELECT 1 FROM main.sqlite_master WHERE type='table' AND name='catalogo_oggetto'").get()) {
      const esiste = db.prepare('SELECT 1 FROM main.catalogo_oggetto WHERE chiave = ?');
      const richiedi = (chiave: unknown) => {
        if (typeof chiave === 'string' && !esiste.get(chiave)) throw httpErrors.conflict('cestino-oggetto-mancante',
          'Un riferimento da ripristinare cita un oggetto non più presente. Ripristina prima quell’oggetto: questo elemento resta nel cestino.', { oggetto: chiave });
      };
      const costo = (valore: unknown) => {
        if (valore == null) return;
        const c = normalizzaCostoScambio(valore);
        if (!c) throw httpErrors.conflict('cestino-costo-non-valido', 'Un costo da ripristinare non è leggibile. L’elemento resta nel cestino.');
        if (c.tipo === 'oggetti') for (const o of c.oggetti) richiedi(o.chiave);
      };
      const parseJson = (v: unknown): unknown => {
        if (v == null) return null;
        try { if (typeof v === 'string') return JSON.parse(v) as unknown; }
        catch { /* l'errore non cancella il registro */ }
        throw httpErrors.conflict('cestino-json-non-valido', 'Un riferimento strutturato da ripristinare non è leggibile. L’elemento resta nel cestino.');
      };
      const parse = (v: unknown): Record<string, unknown> => {
        const o = parseJson(v);
        if (o == null) return {};
        if (typeof o === 'object' && !Array.isArray(o)) return o as Record<string, unknown>;
        throw httpErrors.conflict('cestino-json-non-valido', 'Un riferimento strutturato da ripristinare non è leggibile. L’elemento resta nel cestino.');
      };
      const nodiGuida = (v: unknown): void => {
        if (!v || typeof v !== 'object') return;
        if (Array.isArray(v)) { for (const x of v) nodiGuida(x); return; }
        const o = v as Record<string, unknown>; richiedi(o.catalogoChiave);
        for (const x of Object.values(o)) nodiGuida(x);
      };
      for (const v of daVerificare) {
        if (!['articolo', 'regalo_partita', 'dati_guida', 'proposta_abbinamento'].includes(v.tabella)) continue;
        const s = struttura(v.schema, v.tabella); if (!s) continue;
        const ora = db.prepare(`SELECT * FROM ${v.schema}.${virgolette(v.tabella)} WHERE ${s.chiave.map((c) => `${virgolette(c)} IS ?`).join(' AND ')}`)
          .get(...s.chiave.map((c) => deserializza(v.riga[c] ?? null))) as Record<string, unknown> | undefined;
        if (!ora) continue;
        richiedi(ora.catalogo_chiave);
        if (v.tabella === 'articolo') { costo(ora.costo_json); const seed = parse(ora.seed_json); richiedi(seed.catalogo_chiave); costo(seed.costo_json); }
        if (v.tabella === 'dati_guida' && eBloccoGuidaCatalogo(ora.chiave)) nodiGuida(parseJson(ora.json));
        if (v.tabella === 'proposta_abbinamento') {
          const modifica = parse(ora.modifica_json); costo(modifica.costo);
          if (Array.isArray(modifica.ricevuti)) for (const x of modifica.ricevuti) {
            if (!x || typeof x !== 'object' || typeof (x as Record<string, unknown>).chiave !== 'string') throw httpErrors.conflict('cestino-json-non-valido', 'Un risultato da ripristinare non è leggibile. L’elemento resta nel cestino.');
            richiedi((x as Record<string, unknown>).chiave);
          }
          if (modifica.prima && typeof modifica.prima === 'object') { const prima = modifica.prima as Record<string, unknown>; richiedi(prima.catalogo_chiave); costo(prima.costo_json); }
        }
      }
    }
    const radice = r.tipo === 'partita' ? { schema: 'utente', tabella: 'partita', colonna: 'id' }
      : r.tipo === 'fonte-acquisto' ? { schema: 'utente', tabella: 'acquisto_provenienza', colonna: 'id' }
      : radiceScorta ? { schema: 'utente', tabella: radiceScorta.tabella, colonna: 'id' }
      : radicePesca?{schema:'utente',tabella:radicePesca.tabella,colonna:'id'}
        : { schema: 'main', ...RADICE[r.tipo as TipoElementoCestino] };
    const radicePresente = r.tipo === 'fonte-acquisto' && r.chiave.startsWith('legacy:')
      ? db.prepare('SELECT 1 FROM utente.acquisto_partita WHERE partita_id=? AND articolo_chiave=?').get(r.partitaId, r.chiave.slice(7))
      : db.prepare(`SELECT 1 FROM ${radice.schema}.${virgolette(radice.tabella)} WHERE ${virgolette(radice.colonna)} = ?`).get(radiceScorta?.id??radicePesca?.id??r.chiave);
    if (!radicePresente) {
      throw httpErrors.conflict('cestino-non-ripristinabile', `Non si può rimettere «${r.nome}»: ciò che la conteneva non c'è più.`);
    }
    if (contestoAcquisti) verificaRipristinoAcquisti(contestoAcquisti);
    verificaArchivioLegacy(db);
    if(r.tipo==='partita'&&r.partitaId!==undefined)riconciliaPescaDopoRipristino(r.partitaId,true);
    if (r.tipo !== 'partita' && r.tipo !== 'pin') for (const partita of partitaIds) {
      if (!db.prepare('SELECT 1 FROM utente.partita WHERE id=?').get(partita)) continue;
      riconciliaAcquistiDopoRipristino(partita, [...acquistoIds]);
      // N1: i Confidenti i cui valori il ripristino NON ha rimesso (cambiati dopo l'eliminazione): le righe `confidente_partita` saltate, «partita · Confidente»
      const confidentiNonRimessi = new Set([...saltate.values()].filter((s) => s.tabella === 'confidente_partita' && s.motivo === 'cambiata-dopo')
        .flatMap((s) => s.esempi.map((e) => e.split(' · ')).filter((x) => x.length >= 2).map(([p, c]) => `${p}|${c}`)));
      riconciliaEffettiDopoRipristino(partita, [...voceUids], confidentiNonRimessi);
      // L13 (decisione 18): la voce rimessa torna spuntata con i suoi stati; gli yen che la sua eliminazione aveva restituito si muovono di
      // nuovo dove lo stato è tornato (articolo comprato, turno, Richiesta completata). Gli altri effetti tornano con la proposta di raccordo
      for (const v of voceUids) rimettiYenDellaVoceRipristinata(partita, v);
      riconciliaPescaDopoRipristino(partita);
      // L13 (decisione 3): una Richiesta rimessa torna completata dove lo era: i suoi yen si riallineano. Decisione 18: rientrano da soli dove
      // l'eliminazione li aveva tolti; una proposta «Applica» di prima si riallinea nel suo registro (o niente se già nel saldo)
      if (r.tipo === 'richiesta') { riallineaYenRichiesta(partita, r.chiave, 'ripristino'); riconciliaBeneficiRichiesta(partita, r.chiave); }
    }
    const vicini = r.vicini_json ? JSON.parse(r.vicini_json) as ViciniCestino : null;
    if (r.tipo === 'voce-diario') ripristinaOrdineVoce(r.chiave, vicini);
    else if (r.tipo !== 'partita' && r.tipo !== 'fonte-acquisto'&&!radicePesca&&!radiceScorta) dopoRipristino.get(r.tipo as TipoElementoCestino)?.(r.chiave, vicini, [...saltate.values()]);
    // L4 (§8.11): lo specchio delle voci con pin si rifà con la funzione unica — quel che è cambiato dopo l'eliminazione (un pin
    // segnato o tolto) vince, come per le altre righe delle partite
    const pinRipristinato = r.tipo === 'pin' ? db.prepare('SELECT id FROM main.spillo WHERE uid=?').get(r.chiave) as { id: number } | undefined : undefined;
    if (r.tipo !== 'pin' || (pinRipristinato && modelloAvanzamento(db).pin.has(pinRipristinato.id))) riallineaStati(db, null, nowIso());
    if (r.id !== null) db.prepare('DELETE FROM main.cestino WHERE id = ?').run(r.id);
    db.prepare('DELETE FROM utente.cestino_partite WHERE uid = ?').run(r.uid);
  })();
  invalidaCacheDiGioco();
  // il nome delle righe saltate col numero giusto (al singolare per una sola), ora che si sa quante sono
  const elencoSaltate = [...saltate.values()].map((s) => ({ ...s, etichetta: etichettaTabella(s.tabella, s.quante) }));
  return { tipo: r.tipo as TipoCestino, chiave: r.chiave, nome: r.nome, rimesse, saltate: elencoSaltate, partiteMancanti };
}

// ---- Svuotare ----

/** Toglie per sempre un elemento dal cestino (404 se non c'è). */
export function eliminaDalCestino(id: number): void {
  const db = getDb();
  const r = db.prepare('SELECT uid FROM main.cestino WHERE id = ?').get(id) as { uid: string } | undefined;
  if (!r) throw httpErrors.notFound('cestino-non-trovato', 'L’elemento non è più nel cestino.');
  db.transaction(() => {
    db.prepare('DELETE FROM main.cestino WHERE id = ?').run(id);
    db.prepare('DELETE FROM utente.cestino_partite WHERE uid = ?').run(r.uid);
  })();
}

/** Svuota il cestino (anche le parti delle partite rimaste senza la loro riga di gioco); restituisce quanti elementi c'erano. */
export function svuotaCestino(): { eliminati: number } {
  const db = getDb();
  return db.transaction(() => {
    const eliminati = db.prepare('DELETE FROM main.cestino').run().changes;
    db.prepare('DELETE FROM utente.cestino_partite WHERE tipo IS NULL').run();
    return { eliminati };
  })();
}

export function eliminaCestinoPrivato(uid: string, partitaId?: number): void {
  const filtro = partitaId === undefined ? '' : ' AND partita_id=?';
  const parametri: unknown[] = partitaId === undefined ? [uid, getProprietario()] : [uid, getProprietario(), partitaId];
  if (!getDb().prepare(`DELETE FROM utente.cestino_partite WHERE uid=? AND tipo IS NOT NULL AND proprietario=?${filtro}`).run(...parametri).changes) {
    throw httpErrors.notFound('cestino-non-trovato', 'L’elemento personale non è più nel cestino.');
  }
}

/** Svuota il cestino personale del proprietario (o solo quello di una partita); restituisce quante voci ha tolto. Non tocca il cestino di gioco. */
export function svuotaCestinoPersonale(partitaId?: number): { eliminati: number } {
  const filtro = partitaId === undefined ? '' : ' AND partita_id=?';
  const parametri: unknown[] = partitaId === undefined ? [getProprietario()] : [getProprietario(), partitaId];
  return { eliminati: getDb().prepare(`DELETE FROM utente.cestino_partite WHERE tipo IS NOT NULL AND proprietario=?${filtro}`).run(...parametri).changes };
}

export function svuotaCestinoUnificato(): { eliminati: number } {
  const db = getDb();
  return db.transaction(() => {
    const legacy = svuotaCestino();
    const privati = svuotaCestinoPersonale();
    return { eliminati: legacy.eliminati + privati.eliminati };
  })();
}
