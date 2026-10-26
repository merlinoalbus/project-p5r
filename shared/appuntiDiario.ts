// ============================================================
// Appunti del Diario — il formato delle voci copiate o tagliate negli appunti di sistema, il piano dell'incolla e gli esiti (2026-10-26)
// ============================================================
//
// Richiesta dell'utente: «Vorrei poter selezionare uno o più elementi del diario con ctrl+C e poterli incollare da un'altra parte con ctrl+v»,
// con «Sì, anche Taglia», «Quella della voce selezionata» (incolla dopo la voce selezionata), «e deve prendere anche quello che succede...»
// (tutto ciò che il modulo della voce mostra, effetti compresi) e «però deve usare la clipboard del sistema non dentro l'app... così da poter
// anche usare windows V per gestire eventuali copie precedenti».
//
// Il contenuto degli appunti è un'**istantanea** costruita dal server (`POST /compendio/percorso/voci/appunti`): le righe della voce come
// sono nel file di gioco, gli effetti con i loro valori, le infiltrazioni, e l'origine (giorno, fascia, posto) che serve al taglio. Non
// contiene MAI spunte, ricevute o yen delle partite. Viaggia negli appunti in due forme (vedi `src/utils/appuntiDiario.ts`): il testo
// leggibile e l'HTML con il blocco marcato e versionato, che la cronologia degli appunti di Windows (Win+V) conserva.
//
// Incollando, il server rilegge tutto: forma, formato, versione e limiti (zod), effetti riconosciuti integralmente, riferimenti che esistono
// ancora. Un taglio sposta le stesse voci (stesso uid) solo se sono ancora dove erano al momento del taglio; un taglio vecchio non fa danni.
// ============================================================

import type { FasciaGioco } from './types.js';

/** Il nome del formato: lo riconosce chi legge gli appunti, mai un testo qualsiasi. */
export const FORMATO_APPUNTI_DIARIO = 'p5r-diario-voci';
/** La versione del formato: un contenuto di un'altra versione non si incolla (lo dice il messaggio). */
export const VERSIONE_APPUNTI_DIARIO = 1;
/** Quante voci al massimo in un solo blocco (come il trasferimento delle voci). */
export const MASSIMO_VOCI_APPUNTI = 200;

/** Copia (voci nuove, uid nuovi) o taglia (le stesse voci si spostano: spunte e ricevute delle partite le seguono). */
export type ModoAppunti = 'copia' | 'taglia';

/** Dove stava la voce quando è stata copiata o tagliata: il taglio la sposta solo se è ancora lì. */
export interface OrigineVoceAppunti {
  giorno: string;
  fascia: FasciaGioco;
  /** Il posto nella fascia (0 = la prima). */
  posto: number;
  /** La posizione nella guida di quel giorno (`indice_guida`), se la voce viene dalla guida. */
  indiceGuida: number | null;
}

/** Un effetto della voce com'è nella fonte unica (`voce_effetto`): uid, l'effetto con tutti i suoi valori, l'origine. */
export interface EffettoAppunti {
  uid: string;
  effetto: unknown;
  origine: 'seed' | 'regola' | 'utente';
}

/** Gli effetti della spunta della voce («Spuntando succede»): la fonte com'è, anche una fonte storica ancora da correggere. */
export interface EffettiAppunti {
  stato: 'convertita' | 'legacy-da-correggere';
  elementi: EffettoAppunti[];
  /** Il testo storico conservato dalla fonte (`raw_json`). */
  rawLegacy: string;
  motivo: string | null;
}

/**
 * Una voce negli appunti: tutti i campi del modulo della voce, gli effetti e le infiltrazioni. Ciò che la lega ad altro e che una copia
 * non eredita (eventi del calendario, proposte «da completare», proposta d'infiltrazioni salvata) e le spunte delle partite NON viaggiano:
 * il piano dell'incolla li rilegge dal file per uid e li dice prima (`RilievoIncolla`). Il vecchio campo `produce_json` non si legge né si
 * scrive più (la fonte è `effetti`): non viaggia.
 */
export interface VoceAppunti {
  /** L'uid della voce copiata o tagliata. */
  uid: string;
  origine: OrigineVoceAppunti;
  genere: string;
  azione: string;
  note: string | null;
  tipo: string;
  riferimento: { tipo: string; chiave: string } | null;
  /** Il nome del collegamento com'è scritto nella voce (la guida lo scrive a modo suo). */
  riferimentoTesto: string | null;
  rangoAtteso: number | null;
  effetti: EffettiAppunti;
  /** L'insieme ordinato delle infiltrazioni della voce (chiavi di `dungeon_area`). */
  infiltrazioni: string[];
  /** Lo stato «da rivedere» della voce (L3 §1.4): la copia nasce senza, e lo si dice prima. */
  daRivedere: boolean;
}

/** Il blocco intero negli appunti. */
export interface AppuntiDiario {
  formato: typeof FORMATO_APPUNTI_DIARIO;
  versione: typeof VERSIONE_APPUNTI_DIARIO;
  modo: ModoAppunti;
  /** L'identità del taglio (32 cifre esadecimali): lo stesso taglio incollato due volte non sposta più niente. Assente per la copia. */
  taglio?: string;
  /** Quando il server ha fotografato le voci (ISO). */
  creatoIl: string;
  /** Le voci nell'ordine della giornata (giorno, poi giorno prima di sera, poi posto). */
  voci: VoceAppunti[];
}

/** La richiesta delle voci da mettere negli appunti. */
export interface RichiestaAppuntiDiario { uid: string[] }

/** Dove incollare: il giorno aperto; con `dopoUid` (la voce selezionata) subito dopo di lei e nella sua fascia, altrimenti ogni voce in
 *  fondo alla fascia da cui viene. */
export interface RichiestaIncollaVoci {
  appunti: AppuntiDiario;
  giorno: string;
  dopoUid?: string;
}

/** L'esecuzione dell'incolla: come l'anteprima, più la conferma dei rilievi del piano mostrato (`impronta`). */
export interface RichiestaEseguiIncolla extends RichiestaIncollaVoci {
  /** Vero dopo che l'utente ha visto e confermato i rilievi; senza rilievi da confermare può mancare. */
  conferma?: boolean;
  /** L'impronta del piano confermato: se nel frattempo è cambiato, l'incolla si ferma (409 `piano-cambiato`). */
  impronta?: string;
  /** «Incolla senza gli effetti segnalati» (solo copia): gesto esplicito, mai predefinito. */
  senzaSegnalati?: boolean;
}

/** I tipi di rilievo del piano d'incolla. */
export type CodiceRilievoIncolla =
  | 'diario-validato'
  | 'data-fissa'
  | 'fortuna'
  | 'disponibilita'
  | 'effetto-non-valido'
  | 'riferimento-non-valido'
  | 'voce-non-valida'
  | 'infiltrazioni-non-applicabili'
  | 'effetti-da-correggere'
  | 'eventi-calendario'
  | 'proposte-aperte'
  | 'proposta-infiltrazioni'
  | 'da-rivedere'
  | 'spunte-seguono'
  | 'gia-spostata'
  | 'eliminata';

/**
 * Un rilievo: `conferma` va visto e confermato prima di incollare (la finestra lo mostra, il server rifiuta senza conferma); `info` si
 * mostra nella finestra se si apre per altro. `effettoUid`: l'effetto della voce di cui si parla (per «Incolla senza gli effetti
 * segnalati»). `voceIndice`: la posizione della voce nel blocco.
 */
export interface RilievoIncolla {
  codice: CodiceRilievoIncolla;
  gravita: 'conferma' | 'info';
  voceIndice: number | null;
  effettoUid?: string;
  testo: string;
}

/** Che cosa succederà a ogni voce del blocco. */
export type StatoVoceIncolla = 'pronta' | 'con-rilievi' | 'non-incollabile' | 'gia-spostata' | 'eliminata';

/** Il piano dell'incolla: lo stesso calcolo per l'anteprima e per l'esecuzione. */
export interface PianoIncollaDto {
  modo: ModoAppunti;
  giorno: string;
  /** La fascia della voce selezionata, se l'incolla va dopo di lei; null = ogni voce nella sua fascia d'origine, in fondo. */
  fascia: FasciaGioco | null;
  voci: Array<{ indice: number; uid: string; azione: string; fascia: FasciaGioco; stato: StatoVoceIncolla }>;
  rilievi: RilievoIncolla[];
  /** Vero se qualche rilievo va confermato prima di incollare. */
  daConfermare: boolean;
  /** Quante voci si incolleranno (con «Incolla comunque»). */
  daIncollare: number;
  /** L'impronta del piano: l'esecuzione la confronta con quella confermata. */
  impronta: string;
}

/** Una voce del blocco che l'incolla non ha toccato, con il perché. */
export interface VoceSaltataIncolla { indice: number; uid: string; azione: string; motivo: string }

/** L'esito dell'incolla: le voci arrivate (uid nuovi della copia o gli stessi del taglio) e l'operazione registrata, da annullare. */
export interface EsitoIncollaDto {
  operazioneId: string;
  modo: ModoAppunti;
  giorno: string;
  uid: string[];
  saltate: VoceSaltataIncolla[];
  /** Gli effetti segnalati lasciati fuori («Incolla senza gli effetti segnalati»). */
  effettiTolti: number;
}

/** L'esito dell'annullo di un incolla: le voci rimesse com'erano e quelle che non si potevano rimettere, col perché. */
export interface EsitoAnnulloIncollaDto {
  operazioneId: string;
  modo: ModoAppunti;
  rimesse: string[];
  nonRimesse: Array<{ uid: string; azione: string; motivo: string }>;
}
