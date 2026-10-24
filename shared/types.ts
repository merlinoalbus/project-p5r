// ============================================================
// Tipi condivisi FE/BE — dominio Persona 5 Royal (DTO delle API)
// ============================================================
//
// Questo modulo è importato sia dal server (NodeNext) sia dal client
// (bundler): SOLO tipi e costanti pure, nessun import di runtime Node.
// I campi `*Nome` sono la resa italiana risolta dal backend tramite la
// tabella `traduzione`; i campi senza suffisso sono le chiavi canoniche.
// ============================================================

import type { TipoMappa, TipoRiferimento, TipoSpillo } from './spilli.js';
import type { GiornoChiave } from './orariNegozio.js';
import type { TipoLuogo } from './tipiLuogo.js';
import type { Condizione, RequisitoSpillo } from './condizioniSpillo.js';
import type { StatoTanakaFileDto } from './tanakaDecisione.js';
import type { DisponibilitaConfidenteDto } from './disponibilitaStrutturata.js';
import type { OrariDelLuogo, OrariNegozio } from './orariNegozio.js';
import type { VoceEffetto } from './effettiCatalogo.js';
import type { DoteChiave } from './doti.js';
import type { CategoriaArticolo } from './articoli.js';
import type { CategoriaOggetto } from './catalogo.js';
import type { CategoriaLettura, DoteNote, EffettoAzione } from './effettiAzione.js';
import type { MeteoPartita } from './meteoPartita.js';
import type { CarattereVoce } from './caratteriVoce.js';
import type { CompletamentoPalazzo } from './completamentoGuida.js';
import type { QuizAttivita } from './quizAttivita.js';
import type { Osservazione, Statistiche } from './statistiche.js';
import type { StatoAcquistiArticoloDto } from './acquisti.js';
import type { StatoEffettiVoceDto, ReceiptEffettoVoceDto, RichiestaSalvaEffettiVoce } from './effettiVoce.js';

/** F6: una nota storica della fonte (discordanza documentale, G-034), non una fotografia dei prezzi pagati o dell'istanza importata. Vive
 *  in `nota_storica` (migrazione 139), si modifica dall'app e torna al valore della guida con «Ripristina». */
export interface NotaStoricaOfferta {
  id: string;
  versione: number;
  fonte: string;
  testo: string;
  /** Testo o fonte diversi da come li dà la guida (si può ripristinare). */
  modificata?: boolean;
}

// ---- Compendio ----

export interface ArcanaDto {
  chiave: string;
  ordine: number;
  numero: number | null;
  nome: string;
}

/** Codice di affinità con resa italiana. */
export interface AffinitaDto {
  elemento: string;
  elementoNome: string;
  elementoSigla: string;
  codice: string;
  codiceNome: string;
  codiceSigla: string;
}

/** Le cinque statistiche: la forma è quella di `shared/statistiche.ts`, una sola (rilievo R1" della verifica completa). */
export type StatisticheDto = Statistiche;

/** Riga di elenco del compendio. */
export interface PersonaRiassuntoDto {
  id: number;
  nome: string;
  /** Nome italiano (uguale a `nome` salvo eccezioni della localizzazione). */
  nomeIt: string;
  arcana: string;
  arcanaNome: string;
  livello: number;
  eredita: string | null;
  ereditaNome: string | null;
  speciale: boolean;
  rara: boolean;
  dlc: boolean;
  richiedeConfidenteMax: boolean;
  tratto: string;
  statistiche: StatisticheDto;
  affinita: AffinitaDto[];
  /** Forma di una Persona del gruppo dei Ladri (mai fondibile, mai nella scorta): L8, R8-20. */
  delParty: boolean;
  /** Chiave del personaggio (Joker per Arsène e Satanael, il membro per le forme del gruppo), null per le altre Persona. */
  personaggio: string | null;
  /** 1ª, 2ª o 3ª forma; null fuori dal gruppo (Arsène e Satanael non hanno forme). */
  forma: number | null;
}

export interface CostoSkillDto {
  tipo: 'sp' | 'hp' | 'nessuno';
  valore: number;
  /** Resa pronta per l'interfaccia: "4 SP", "12% HP", "—". */
  testo: string;
}

/** Riga di elenco delle skill. */
export interface SkillRiassuntoDto {
  id: number;
  /** Nome canonico (localizzazione inglese Royal). */
  nome: string;
  /** Nome italiano ufficiale (dalla guida); uguale a `nome` se non localizzato. */
  nomeIt: string;
  elemento: string;
  elementoNome: string;
  costo: CostoSkillDto;
  effetto: string;
  /** Resa italiana dell'effetto (sempre presente: il seed copre il 100%). */
  effettoNome: string;
}

/** Come una Persona impara una skill: a un livello, già dall'inizio (livello 0), con il risveglio, con i ranghi del Confidente, con la 3ª forma. */
export type ModoApprendimento = 'livello' | 'iniziale' | 'risveglio' | 'rango' | 'terza-forma';

/** Skill appresa da una Persona (con livello di apprendimento; `livello` è null per le skill che non si imparano a un livello). */
export interface SkillAppresaDto extends SkillRiassuntoDto {
  livello: number | null;
  modo: ModoApprendimento;
}

export interface RicettaSpecialeDto {
  risultato: { id: number; nome: string; nomeIt: string };
  ingredienti: Array<{ id: number; nome: string; nomeIt: string }>;
}

/** Scheda completa di una Persona. */
export interface PersonaDettaglioDto extends PersonaRiassuntoDto {
  /** R8-10/1: le affinità come le dà la guida, solo se l'utente ne ha corretta almeno una (altrimenti null): «Ripristina» le rimette. */
  affinitaGuida: AffinitaDto[] | null;
  /** Testo originale sull'origine della figura (mai il testo del gioco), con fonte sintetica. */
  descrizione: string;
  fonteDescrizione: string;
  nota: string | null;
  notaNome: string | null;
  /** Oggetti d'esecuzione: null per le forme del gruppo, che non si eseguono. */
  oggetto: string | null;
  oggettoAllarme: string | null;
  oggettoECarta: boolean;
  /** Solo forme del gruppo: la 1ª forma della catena (radice) e il predecessore diretto (Ervardo deriva da Loki). */
  formaDi: { id: number; nome: string; nomeIt: string } | null;
  derivaDa: { id: number; nome: string; nomeIt: string } | null;
  /** Solo forme 2 e 3: la condizione con cui si ottiene, nel vocabolario unico delle condizioni (JSON già interpretato). */
  formaCondizioni: unknown;
  oggettoDescrizione: string | null;
  oggettoAllarmeDescrizione: string | null;
  /** Nomi italiani degli oggetti da esecuzione (dalla guida), null se non abbinati. */
  oggettoNomeIt: string | null;
  oggettoAllarmeNomeIt: string | null;
  /** Oggetti d'esecuzione risolti per ID della fonte, senza abbinamenti per somiglianza. */
  oggettoCatalogo?: RiferimentoOggettoDto | null;
  oggettoAllarmeCatalogo?: RiferimentoOggettoDto | null;
  trattoDettaglio: SkillRiassuntoDto | null;
  skill: SkillAppresaDto[];
  areeMementos: Array<{ chiave: string; nome: string }>;
  pianiMementos: string | null;
  /** Ricetta speciale che produce questa Persona, se esiste. */
  ricettaSpeciale: RicettaSpecialeDto | null;
  /** Ricette speciali in cui questa Persona è ingrediente. */
  ingredienteDi: RicettaSpecialeDto[];
  /** Set DLC di appartenenza (indice 1-based), se DLC. */
  dlcSet: number | null;
  /** Carte abilità ottenibili eseguendo questa Persona. */
  carteDaEsecuzione: Array<{ id: number; nome: string }>;
  /** Titolo dell'Ombra per la negoziazione, se catturabile. */
  negoziazione: { titolo: string; titoloNome: string } | null;
}

/** Scheda completa di una skill. */
export interface SkillDettaglioDto extends SkillRiassuntoDto {
  fonteCarta: string | null;
  fonteCartaNome: string | null;
  negoziazione: string | null;
  negoziazioneNome: string | null;
  unica: string | null;
  unicaNome: string | null;
  persone: Array<{ id: number; nome: string; arcana: string; arcanaNome: string; livelloPersona: number; livello: number | null }>;
  fontiEsecuzione: Array<{ id: number; nome: string }>;
}

/** Ruoli tipografici dell'interfaccia: titoli/numeri, menu/pulsanti, tasselli decorativi. */
export type RuoloFont = 'display' | 'menu' | 'decor';
export type FormatoFont = 'ttf' | 'otf' | 'woff' | 'woff2';

/** Stato del font caricato dall'utente per un ruolo (file nella cartella dati dell'istanza, mai nel repository). */
export interface FontDto {
  ruolo: RuoloFont;
  presente: boolean;
  formato: FormatoFont | null;
  byte: number;
  /** Data di modifica del file (ISO), usata per invalidare la cache del browser. */
  aggiornato: string | null;
  /** URL del file (`/api/font/<ruolo>/file`), null se assente. */
  url: string | null;
}

export interface OggettoDto {
  catalogo?: RiferimentoOggettoDto | null;
  nomiAltri?: string[];
  id: number;
  nome: string;
  /** Nome italiano dell'equipaggiamento (dalla guida), null se non abbinato. */
  nomeIt: string | null;
  categoria: string;
  categoriaNome: string;
  vincolo: string | null;
  vincoloNome: string | null;
  descrizione: string;
  descrizioneNome: string;
}

/** Requisito strutturato per raggiungere un rango di un Confidente (Fase 12.3; righe di `confidente_requisito`). Era
 *  `RequisitoSeed` in `shared/seed.ts`, l'ultimo tipo vivo del seed JSON dismesso (rilievo O12 della verifica, 2026-10-03). */
export type RequisitoRango = Condizione & {
  /** La frase della guida che accompagna il requisito (nota): il testo mostrato si genera dalla condizione. */
  testo: string;
};
/* L6 (R6-01, R6-01b): un requisito è una condizione del vocabolario unico (`Condizione`, `shared/condizioniSpillo.ts`) con la sua frase;
 * niente più elenco parallelo e niente `manuale` («niente condizioni manuali», 2026-09-05; migrazione 090). Un'avvertenza da controllare
 * nel gioco è un `avviso`, che non blocca mai. */

/** L6 (§6.1): i requisiti di un Confidente per rango, per l'editor della sua pagina («Modifica requisiti», «Ripristina»). */
export interface RequisitiConfidenteDto {
  confidente: string;
  ranghi: Array<{
    rango: number;
    requisiti: Array<{ indice: number; condizione: Condizione; testo: string; descrizione: string }>;
    /** Il rango è diverso da come lo dà la guida (si può ripristinare). */
    modificato: boolean;
  }>;
}

/** L6: l'esito di una condizione valutata dal server (`POST /api/condizioni/valuta`, un solo valutatore). `avviso` non è né vero né falso
 *  e non blocca; `grigio` è una condizione che l'app non sa valutare (un riferimento eliminato: «Richiesta eliminata»). */
export type EsitoCondizione = 'vero' | 'falso' | 'avviso' | 'grigio';
export interface ValutazioneCondizioneDto {
  esito: EsitoCondizione;
  /** La condizione in italiano (`descriviRequisitoSpillo`). */
  testo: string;
  /** Con l'esito falso: che cosa manca, in italiano («Ann al rango 10 oppure leggere «Luoghi della movida»»). */
  manca?: string;
}
export interface RispostaValutaCondizioniDto {
  /** L'esito dell'insieme (tutte le condizioni insieme). */
  complessivo: ValutazioneCondizioneDto;
  /** Una valutazione per condizione, nello stesso ordine della richiesta. */
  condizioni: ValutazioneCondizioneDto[];
}

/** L6: il posto che un invito apre, con il nome e la pagina («Harajuku», `/guida/luogo/harajuku/harajuku-hangout`). */
export interface PostoApertoDto { tipo: 'quartiere' | 'luogo' | 'area'; chiave: string; nome: string; casa: string | null }
/** L6: un invito di un Confidente («X ti ha chiesto di uscire»), riga di `confidente_invito`, con lo stato nella partita. */
export interface InvitoDto {
  chiave: string;
  confidente: string;
  confidenteNome: string;
  /** MM-GG del gioco, null se non fissa. */
  data: string | null;
  apre: PostoApertoDto;
  /** Quando l'invito può arrivare nel gioco (vuoto = sempre). */
  condizioni: Condizione[];
  /** Le condizioni in italiano. */
  condizioniTesto: string[];
  /** Con partita: le condizioni sono vere adesso (il gesto «Invito avvenuto» si può fare). */
  possibile: boolean | null;
  /** Con partita: con le condizioni false, che cosa manca. */
  manca: string | null;
  /** Con partita: l'invito è registrato. */
  registrato: boolean | null;
  nota: string;
  fonte: string;
  /** R9-07c: un invito della guida cambiato dall'utente (si può «Ripristinare»). */
  modificato: boolean;
  /** R9-07c: un invito creato dall'utente (l'unico che si può togliere, dal Cestino). */
  daUtente: boolean;
}

/** L6: fonte di una condizione di sblocco (quartiere, luogo): il registro dell'Esperto della guida e la certezza. */
export interface FonteCondizioneDto { registro: string; certezza: 'alta' | 'media' | 'bassa'; nota?: string | null }
/** L6: lo sblocco di un quartiere: la condizione effettiva (salvata, in OR con gli inviti che lo aprono), da dove viene e l'esito. */
export interface SbloccoDto {
  /** La condizione salvata (null se il posto non ne ha una). */
  condizione: Condizione | null;
  /** La condizione propria salvata, senza gli inviti aggiunti in OR; serve all’editor del quartiere. */
  condizioneSalvata?: Condizione | null;
  /** In italiano, con gli inviti in OR («Dopo aver letto «Vague» oppure dopo l'invito di Ryuji del 29 maggio»). */
  testo: string | null;
  fonte: FonteCondizioneDto | null;
  /** Con partita: l'esito di adesso; senza partita null. */
  esito: EsitoCondizione | null;
  /** Con l'esito falso: che cosa manca. */
  manca: string | null;
  /** Gli inviti che lo aprono (in sola lettura qui: si gestiscono dalla pagina del Confidente). */
  inviti: InvitoDto[];
  /** La condizione salvata è diversa da quella della guida (si può ripristinare). */
  modificato: boolean;
}

export interface ConfidenteDto {
  chiave: string;
  nome: string;
  arcana: string;
  arcanaNome: string;
  ordine: number;
}

export interface SceltaDialogoDto {
  ordine: number | null;
  testo: string;
  /** Note ♪ (1–3) secondo la guida; null se non indicato. */
  punti: number | null;
  puntiTesto: string | null;
  romantica: boolean;
  avviso: string | null;
}

export interface DialogoConfidenteDto {
  id: number;
  rango: number | null;
  etichetta: string;
  note: string;
  scelte: SceltaDialogoDto[];
}

export interface RegaloConfidenteDto {
  /** Ripristina esclusivamente la rettifica storica del costo, con anteprima del valore salvato. */
  ripristinoCosto?: { ordine: number; precedente: string; attuale: string | null };
  /** Nome della guida conservato per riconoscere le consegne storiche non ancora collegate. */
  nomeStorico?: string;
  catalogo?: RiferimentoOggettoDto | null;
  prezzo?: number | null;
  prezzoMassimo?: number | null;
  listinoCollegato?: boolean;
  offerte?: OffertaOggettoDto[];
  /** Prosa storica, distinta dal prezzo attuale del listino. */
  nota?: string | null;
  nome: string;
  dove: string | null;
  costo: string | null;
  effetto: string | null;
}

/** Scheda completa di un Confidente (Fase 6.1). */
export interface ConfidenteDettaglioDto extends ConfidenteDto {
  abilita: Array<{ rango: number; nome: string; descrizione: string }>;
  /** La Dote che dà ogni incontro verso ciascun rango da 1 a 10 (`confidente_dote_incontro`), modificabile; `testo` in parole. */
  dotiIncontro: Array<{ rango: number; doti: DoteNote[]; testo: string }>;
  dialoghi: DialogoConfidenteDto[];
  regali: RegaloConfidenteDto[];
  regaliSconsigliati: string[];
  /** Oggetti ricevuti dal Confidente, distinti dai regali che gli si possono consegnare. */
  oggettiRicompensa?: RicompensaOggettoDto[];
  disponibilita: { giorni: string[]; fasce: string[]; luogo: string; sbloccoData: string; sbloccoRequisiti: string; note: string };
  /** R9-01: la disponibilità come dato strutturato (la fonte di ciò che l'app valuta), con i luoghi per chiave; il testo di `disponibilita` resta nelle note. */
  disponibilitaStrutturata?: DisponibilitaConfidenteDto;
  noteGenerali: string;
  fonti: string[];
  /** L6: gli inviti del Confidente, con ciò che aprono (senza lo stato della partita: `GET /api/compendio/inviti?confidente=&partita=`). */
  inviti?: InvitoDto[];
}

/** Glossario completo per il frontend (cache locale). */
/** Termine di gioco della localizzazione italiana ufficiale. */
export interface TermineDto {
  chiave: string;
  nome: string;
  categoria: string;
  definizione: string | null;
  fonte: string | null;
}

export interface GlossarioDto {
  arcani: ArcanaDto[];
  elementiSkill: Record<string, string>;
  elementiAffinita: Array<{ chiave: string; nome: string; sigla: string }>;
  affinita: Record<string, { nome: string; sigla: string }>;
  tipiEredita: Record<string, string>;
  statistiche: Array<{ chiave: string; nome: string; sigla: string }>;
  tipiOggetto: Record<string, string>;
  vincoliOggetto: Record<string, string>;
  areeMementos: Record<string, string>;
  dotiSociali: Array<{ chiave: string; nome: string }>;
}

/** Regole di fusione (per il calcolatore lato client e per il motore). */
export interface RegoleFusioneDto {
  arcani: string[];
  tabella: Array<{ a: string; b: string; risultato: string }>;
  speciali: RicettaSpecialeDto[];
  tesori: { nomi: string[]; nomiIt: string[]; modificatori: Record<string, number[]> };
  eredita: { tipi: string[]; colonne: string[]; matrice: Record<string, boolean[]> };
  dlc: string[][];
}

// ---- Motore di fusione ----

export type TipoFusione = 'normale' | 'stesso-arcano' | 'tesoro' | 'speciale';

/** Persona come compare nelle ricette di fusione. */
export interface PersonaFusioneDto {
  id: number;
  nome: string;
  nomeIt: string;
  arcana: string;
  arcanaNome: string;
  livello: number;
  speciale: boolean;
  rara: boolean;
  dlc: boolean;
}

export interface RicettaFusioneDto {
  ingredienti: PersonaFusioneDto[];
  risultato: PersonaFusioneDto;
  tipo: TipoFusione;
  /** Costo stimato in yen: somma sugli ingredienti di 27·L² + 126·L + 2147. */
  costo: number;
}

/** Esito della fusione diretta A+B. */
export interface EsitoFusioneDto {
  a: PersonaFusioneDto;
  b: PersonaFusioneDto;
  ricetta: RicettaFusioneDto | null;
  /** Spiegazione quando la fusione non è possibile. */
  motivo: string | null;
  dlcPosseduti: number[];
  /** Sconto del Registro applicato al costo (dalla partita). */
  sconto: number;
  /** Bonus EXP del Confidente dell'arcano del risultato (dalla partita), null senza partita o senza risultato. */
  bonusConfidente: { arcana: string; arcanaNome: string; confidenteNome: string | null; rango: number; moltiplicatoreExp: number } | null;
}

/** Elenco di ricette (per ottenere una Persona, o con una Persona come ingrediente). */
export interface RicetteFusioneDto {
  persona: PersonaFusioneDto;
  totale: number;
  totaleSenzaFiltri: number;
  ricette: RicettaFusioneDto[];
  dlcPosseduti: number[];
  livelloMax: number | null;
  /** Sconto del Registro applicato ai costi (dalla partita), 0 senza partita. */
  sconto: number;
}

/** Nodo di un piano di fusione ricorsivo. */
export interface NodoPianoDto {
  persona: PersonaFusioneDto;
  modo: 'scorta' | 'registro' | 'cattura' | 'fusione';
  costo: number;
  tipo?: TipoFusione;
  figli: NodoPianoDto[];
  /** Skill richieste che il nodo porta al genitore (propagazione a catena). */
  skillPortate: Array<{ id: number; nome: string; nomeIt: string }>;
  /** Skill richieste che il nodo apprende salendo di livello (non innate né ereditate). */
  skillDaLivello: Array<{ id: number; nome: string; nomeIt: string }>;
}

export interface PianoFusioneDto {
  radice: NodoPianoDto;
  costo: number;
  profondita: number;
  catture: number;
  evocazioni: number;
  fusioni: number;
}

export interface PianiFusioneDto {
  persona: PersonaFusioneDto;
  piani: PianoFusioneDto[];
  opzioni: { profondita: number; alternative: number; catture: boolean; livelloMax: number | null; slotFortunato: boolean };
  /** Skill richieste (propagate lungo la catena). */
  skillRichieste: Array<{ id: number; nome: string; nomeIt: string; elemento: string; elementoNome: string }>;
  /** Sconto del Registro applicato ai costi (dalla partita), 0 senza partita. */
  sconto: number;
  /** Esemplari in scorta e Persona nel Registro considerati (dalla partita). */
  disponibilita: { scorta: number; registro: number };
  /** Perché non ci può essere alcun piano (bersaglio non fondibile o skill non ereditabili), altrimenti null. */
  motivo: { codice: 'non-fondibile' | 'skill-non-ereditabili' | 'skill-senza-fonte' | 'limite-livello'; testo: string } | null;
}

/** Skill candidata all'eredità in una fusione. */
export interface SkillEreditaDto {
  id: number;
  nome: string;
  nomeIt: string;
  elemento: string;
  elementoNome: string;
  /** Ingredienti (id Persona) che la portano. */
  da: number[];
  ereditabile: boolean;
  giaAppresa: boolean;
  motivo: string | null;
}

/** Analisi dell'eredità per una fusione A + B. */
export interface EreditaFusioneDto {
  risultato: PersonaFusioneDto;
  tipo: string | null;
  tipoNome: string | null;
  ingredienti: Array<{ persona: PersonaFusioneDto; livello: number; daScorta: boolean; skill: Array<{ id: number; nome: string; nomeIt: string; elemento: string }> }>;
  totaleSkillGenitori: number;
  slot: number;
  slotScelti: number;
  candidate: SkillEreditaDto[];
  tratti: Array<{ id: number; nome: string; nomeIt: string; effettoNome: string; da: number | null }>;
}

/** Ricetta che consente un insieme di skill desiderate. */
export interface RicettaPerSkillDto {
  ricetta: RicettaFusioneDto;
  slot: number;
  slotScelti: number;
  daEreditare: number[];
  giaApprese: number[];
}

export interface RicercaSkillDto {
  skill: Array<{ id: number; nome: string; nomeIt: string; elemento: string; elementoNome: string }>;
  risultato: PersonaFusioneDto | null;
  totale: number;
  ricette: RicettaPerSkillDto[];
  /** Persona (risultati) che compaiono nelle ricette, con il numero di ricette ciascuna. */
  perRisultato: Array<{ persona: PersonaFusioneDto; ricette: number; costoMinimo: number }>;
}

/** Stato della Stanza di Velluto per una partita (bonus quantificabili). */
export interface VellutoDto {
  partitaId: number;
  compendio: { registrate: number; totale: number; percentuale: number };
  /** Sconto percentuale sui prezzi di evocazione dal Registro. */
  sconto: number;
  allarmeAttivo: boolean;
  gemelle: {
    rango: number;
    trattamentoSpeciale: boolean;
    sblocchi: Array<{ rango: number; nome: string; effetto: string; ottenuto: boolean }>;
    prossimo: { rango: number; nome: string; effetto: string } | null;
  };
  /** Per ogni arcano: Confidente, rango e moltiplicatore EXP della fusione. */
  arcani: Array<{ arcana: string; arcanaNome: string; confidenteChiave: string | null; confidenteNome: string | null; rango: number; moltiplicatoreExp: number }>;
}

// ---- Traduzioni ----

export interface TraduzioneDto {
  ambito: string;
  chiave: string;
  testo: string;
  extra: Record<string, unknown> | null;
  fonte: 'seed' | 'utente';
  updatedAt: string;
}

// ---- Partite ----

export type Difficolta = 'sicura' | 'facile' | 'normale' | 'difficile' | 'spietata';
/** Momento della giornata nella partita, le due fasce della guida: «giorno» (mattina, pranzo, pomeriggio, dopo scuola) e «sera». */
export type FasciaGioco = 'giorno' | 'sera';

export interface PartitaDto {
  id: number;
  nome: string;
  note: string;
  attiva: boolean;
  livelloProtagonista: number;
  dataGioco: string | null;
  /** Momento corrente della giornata (scheda «Oggi»); torna a «giorno» quando cambia il giorno corrente. */
  fasciaGioco: FasciaGioco;
  difficolta: Difficolta;
  nuovaPartitaPlus: boolean;
  dlcPosseduti: number[];
  allarmeAttivo: boolean;
  createdAt: string;
  updatedAt: string;
  /** Il meteo del giorno corrente nella fascia corrente (segnato nella partita o, se no, della guida): negozi, mappe e
   *  disponibilità lo usano per sapere quando ricaricarsi. `null` = nessuno dei due lo dice. */
  meteoOra: MeteoPartita | null;
}

/** Il meteo di una fascia del giorno: quello che vale (`meteo`), da dove viene, e quello della guida per confronto. */
export interface MeteoFasciaDto {
  meteo: MeteoPartita | null;
  /** «partita» = scelto dall'utente; «guida» = non scelto, vale quello della guida; null = nessuno dei due. */
  origine: 'partita' | 'guida' | null;
  guida: MeteoPartita | null;
  /** Le allerte del gioco in questa fascia (date fisse del catalogo, `allerta_meteo`): le mostra l'app, non si scelgono.
   *  Possono essere due (il 17 agosto di sera: pioggia torrenziale e notte torrida). */
  allerte: Array<{ chiave: string; nome: string; effetti: string[] }>;
}

/** Un'allerta del gioco in un giorno (date fisse del catalogo, `allerta_meteo`), una volta sola con le fasce in cui vale: il tag
 *  della giornata (richiesta dell'utente, 2026-10-12). */
export interface AllertaGiornoDto {
  chiave: string;
  nome: string;
  effetti: string[];
  /** Le fasce in cui vale, prima giorno poi sera (la notte torrida solo di sera, l'ondata di calore solo di giorno). */
  fasce: FasciaGioco[];
  /** R11-15/1: corretta dall'utente in quel giorno (si rimette con `/api/correzioni/allerta-meteo/MM-GG:chiave/ripristina`). */
  modificata: boolean;
}

/** Il meteo di un giorno nella partita, di giorno e di sera («Sereno/Pioggia» della guida = sereno di giorno, pioggia di sera). */
export interface MeteoGiornoDto {
  /** 'MM-GG'. Non si chiama `data`: una risposta con un campo `data` sarebbe presa per già imbustata (`responseShape`). */
  dataGioco: string;
  giorno: MeteoFasciaDto;
  sera: MeteoFasciaDto;
  /** Il testo della guida così com'è («Neve/Nuvoloso (ondata di gelo)»), o null. */
  testoGuida: string | null;
}

/** Un Ladro Fantasma nella partita: a che livello è, quanta esperienza ha, e se l'hai segnato.
 *
 * `segnato` separa il **non compilato** dallo zero, che sono due cose diverse: un membro senza riga
 * è uno di cui non hai ancora scritto niente, e la scheda lo dice invece di mostrare un livello 1
 * che non hai mai confermato. */
export interface MembroSquadraDto {
  chiave: string;
  nome: string;
  livello: number;
  esperienza: number;
  segnato: boolean;
  /** Se e' nel gruppo. Si dice con un interruttore: non e' piu' l'effetto collaterale di aver
   *  segnato un livello, ed e' l'unica cosa che la condizione «Ladro in squadra» guarda. */
  inSquadra: boolean;
  updatedAt: string | null;
}

/** Il denaro del gruppo e lo stato dei Ladri. I yen sono uno solo perché nel gioco sono del gruppo. */
export interface SquadraPartitaDto {
  yen: number;
  membri: MembroSquadraDto[];
}

export interface RangoDoteDto {
  rango: number;
  nome: string;
  soglia: number;
}

export interface DoteSocialePartitaDto {
  chiave: string;
  nome: string;
  ordine: number;
  punti: number;
  /** Rango attuale (1–5) e suo titolo italiano. */
  rango: number;
  nomeRango: string;
  /** Soglia del rango successivo e punti mancanti; null al rango massimo. */
  sogliaProssima: number | null;
  mancanti: number | null;
  ranghi: RangoDoteDto[];
  updatedAt: string | null;
}

/** Incremento di una dote: punti assoluti, delta, oppure note (1–3) con modificatori. */
export interface ModificaDote {
  punti?: number;
  delta?: number;
  note?: 1 | 2 | 3;
  /** 3 note da libro a resa maggiorata (7 punti invece di 5). */
  libro?: boolean;
  /** «Anima da cineasta» (Royal): film e DVD salgono di uno scalino (2→3, 3→5, 5→7), prima del ×1,5. */
  cinema?: boolean;
}

/** Semaforo di un requisito per un rango (Fase 12.3): verde soddisfatto, rosso non soddisfatto, grigio non verificabile (conferma manuale). */
export interface SemaforoRequisitoDto {
  indice: number;
  /** Il tipo della condizione valutata (`RequisitoSpillo['tipo']`), o «manuale» per i requisiti dei Confidenti che si confermano a mano. */
  tipo: string;
  testo: string;
  stato: 'verde' | 'rosso' | 'grigio';
  /** Viene dal **negozio**, non dall'articolo: l'articolo la eredita perche' a bottega chiusa non
   *  si compra niente, ma non e' un problema suo e il suo cartellino non deve dirlo. */
  daNegozio?: boolean;
  /** Spiegazione breve dello stato (es. «Coraggio rango 2 di 3»). */
  dettaglio: string;
  /** Richiede la conferma manuale dell'utente. */
  manuale: boolean;
  confermato: boolean;
  /** `false` = un'avvertenza da controllare nel gioco: grigia, ma non ferma il rango (`pronto`, `bloccoRango`).
   *  Assente = blocca, come ogni requisito. */
  bloccante?: boolean;
}

export interface SemaforiRangoDto {
  rango: number;
  requisiti: SemaforoRequisitoDto[];
  /** Tutti i requisiti bloccanti verdi (o confermati): le avvertenze (`bloccante: false`) non contano. */
  pronto: boolean;
}

export interface ConfidentePartitaDto extends ConfidenteDto {
  sbloccato: boolean;
  rango: number;
  /** Punti accumulati verso il rango successivo (possono avere decimali: 5 × 1,5 = 7,5). */
  punti: number;
  /** Punti necessari per il rango successivo e mancanti; null se non documentati o al rango massimo; 0 = passaggio non a punti. */
  puntiNecessari: number | null;
  mancanti: number | null;
  /** True se nella scorta della partita c'è almeno una Persona dello stesso arcano (bonus ×1,5 nel gioco). */
  personaArcanoInScorta: boolean;
  /** R10-11: i punti del motore contano per questo Confidente adesso (rango da 1 a 9 che sale a punti); altrove l'anteprima dà 0 e il server non somma. */
  contaPunti?: boolean;
  /** R10-11: l'esame che vale adesso (l'ultimo con i risultati usciti alla data di gioco) col piazzamento segnato nella partita, uguale per tutti i Confidenti; null prima del primo esame. Il server prende il piazzamento da qui, mai dal client. */
  piazzamentoEsame?: { esame: string; nome: string; dataRisultati: string | null; piazzamento: 'primo' | 'primi-10' | 'altro' | null } | null;
  /** Blocco del rango successivo: requisiti non verdi (né confermati) del semaforo; null se libero. Il server rifiuta gli aumenti di rango bloccati. */
  bloccato: { rango: number; motivi: string[] } | null;
  /** Regali già consegnati in questa partita (nomi). */
  regaliFatti: string[];
  /** Identità consegnate; i nomi storici sopra non vengono riscritti dopo una rinomina. */
  regaliFattiCatalogo?: string[];
  /** Il Confidente ha regali graditi collegati a un oggetto del catalogo: solo allora la finestra «Regala» ha oggetti da scegliere. */
  haRegaliCatalogo?: boolean;
  note: string;
  /** Semafori dei ranghi superiori a quello attuale (Fase 12.3), in ordine di rango. */
  semafori: SemaforiRangoDto[];
  updatedAt: string | null;
  /** Solo nella risposta a una modifica dalla pagina Confidenti: le Doti che gli incontri registrati danno (o quelli tolti
   *  davano), da segnare a mano nelle Doti — l'app non le tocca. */
  doteIncontro?: DoteDaSegnareDto[];
}

/**
 * Modifica di un Confidente. I punti si possono impostare (`punti`), variare (`deltaPunti`) oppure aggiungere
 * come nel gioco: `noteRisposta` 1–3 (5/10/15 punti base), `regalo` (50 base), `uscita` (10 base), con i
 * moltiplicatori `bonusArcano` ×1,5, `esame` ×1,5/×1,2 e `invito` ×1,2 (cumulativi).
 */
export interface ModificaConfidente {
  /** Salta il blocco dei requisiti (semafori non verdi): scelta esplicita dell'utente, registrata nello storico. */
  forza?: boolean;
  sbloccato?: boolean;
  rango?: number;
  punti?: number;
  deltaPunti?: number;
  noteRisposta?: 1 | 2 | 3;
  regalo?: boolean;
  uscita?: boolean;
  bonusArcano?: boolean;
  invito?: boolean;
  note?: string;
}

/** R10-18: l'azione unica «Regala». Si sceglie l'oggetto del catalogo (per chiave); dà i punti (50 di base, con i moltiplicatori, solo dove il
 *  Confidente ne conta), registra la consegna e, con `acquisto`, segna anche comprato l'articolo scelto (un'offerta dell'oggetto). */
export interface RichiestaRegalo {
  confidente: string;
  /** Chiave dell'oggetto nel catalogo. */
  catalogo: string;
  bonusArcano?: boolean;
  invito?: boolean;
  acquisto?: { articolo: string; sede?: string };
}

/** L'esito di «Regala»: il Confidente aggiornato, i punti dati (0 dove non contano) e l'articolo segnato comprato (null se nessuno). */
export interface EsitoRegaloDto {
  confidente: ConfidentePartitaDto;
  punti: number;
  acquistato: string | null;
}

export interface CompendioPartitaDto {
  personaId: number;
  nome: string;
  nomeIt: string;
  arcana: string;
  arcanaNome: string;
  livello: number;
  registrata: boolean;
  livelloRegistrato: number | null;
  /** Istantanea presa alla registrazione (Fase 12.2): l'evocazione dal Registro la ripristina. */
  bonus: StatisticheDto;
  /** Valori reali registrati nell'istantanea (15.26), null se non registrati. */
  osservate: OsservazioneStatisticheDto | null;
  skill: SkillRiassuntoDto[];
  tratto: SkillRiassuntoDto | null;
  carica: boolean;
  updatedAt: string;
}

/** Valori reali letti nella scheda della Persona nel gioco a un livello (15.26): da lì in su la stima riparte da questi. */
export type OsservazioneStatisticheDto = Osservazione;

export interface PersonaPossedutaDto {
  id: number;
  personaId: number;
  nome: string;
  /** Nome italiano (uguale a `nome` salvo eccezioni della localizzazione). */
  nomeIt: string;
  arcana: string;
  arcanaNome: string;
  livelloBase: number;
  livello: number;
  /** Statistiche effettive al livello attuale: stima del livello (+3 punti per livello dalla base) più il bonus per statistica. */
  statistiche: StatisticheDto;
  /** Stima del livello senza bonus. */
  statisticheStimate: StatisticheDto;
  /** Bonus per statistica (Potenziamento, Addestramento, Isolamento, Forca): resta quando la Persona sale di livello. */
  bonus: StatisticheDto;
  /** true se nessun bonus è registrato: `statistiche` coincide con la stima. */
  statisticheBase: boolean;
  /** Valori reali registrati dall'utente (livello e cinque statistiche), null se mai registrati (15.26). */
  osservate: OsservazioneStatisticheDto | null;
  /** Da dove parte la stima: dalla base del dataset oppure dai valori reali registrati (quando il livello è almeno quello registrato). */
  origineStima: 'base' | 'osservate';
  /** true quando le statistiche mostrate sono esattamente i valori reali registrati: stesso livello e nessun bonus. */
  statisticheConfermate: boolean;
  /** Statistiche base della Persona al suo livello base (per il confronto). */
  statisticheBaseLivello: StatisticheDto;
  tratto: SkillRiassuntoDto | null;
  inSquadra: boolean;
  /** Persona «carica» (nome giallo): creata durante l'Allarme delle fusioni. */
  carica: boolean;
  note: string;
  skill: Array<{ slot: number } & SkillRiassuntoDto>;
  createdAt: string;
  updatedAt: string;
}

// ---- Obiettivi (Fase 5.2) ----

export type StatoObiettivo = 'aperto' | 'raggiunto' | 'annullato';

export interface ObiettivoDto {
  id: number;
  personaId: number;
  nome: string;
  nomeIt: string;
  arcana: string;
  arcanaNome: string;
  livelloBase: number;
  speciale: boolean;
  rara: boolean;
  dlc: boolean;
  /** Skill desiderate (mai tratti). */
  skill: SkillRiassuntoDto[];
  livelloMin: number | null;
  /** 0 bassa, 1 normale, 2 alta. */
  priorita: number;
  stato: StatoObiettivo;
  note: string;
  /** Avanzamento rispetto alla scorta attuale. */
  possedutaId: number | null;
  livelloAttuale: number | null;
  skillMancanti: SkillRiassuntoDto[];
  livelloRaggiunto: boolean;
  soddisfatto: boolean;
  raggiuntoAt: string | null;
  /** Piani di fusione salvati legati all'obiettivo. */
  pianiSalvati: number;
  createdAt: string;
  updatedAt: string;
}

// ---- Cicli di fusione (Fase 5.5) ----

export interface AnelloCicloDto {
  ingrediente: PersonaFusioneDto;
  partner: PersonaFusioneDto;
  partnerModo: 'scorta' | 'registro' | 'cattura';
  partnerCosto: number;
  risultato: PersonaFusioneDto;
  tipo: TipoFusione;
  /** Livelli extra del risultato per il bonus del Confidente (stima). */
  bonusLivelli: { min: number; max: number };
  rangoArcano: number;
}

export interface CicloFusioneDto {
  anelli: AnelloCicloDto[];
  /** Costo di una iterazione (evocazioni dal Registro, sconto applicato). */
  costo: number;
  lunghezza: number;
  evocazioni: number;
  catture: number;
  dallaScorta: number;
}

export interface CicliFusioneDto {
  persona: PersonaFusioneDto;
  cicli: CicloFusioneDto[];
  opzioni: { lunghezzaMax: number; lunghezzaMin: number; partnerDistinti: boolean; alternative: number; catture: boolean; livelloMax: number | null };
  sconto: number;
  disponibilita: { scorta: number; registro: number };
  /** La Persona di partenza è nella scorta della partita. */
  inScorta: boolean;
}

export interface CicloSalvatoDto {
  id: number;
  personaId: number;
  nome: string;
  nomeIt: string;
  arcanaNome: string;
  titolo: string;
  note: string;
  anelli: AnelloCicloDto[];
  costo: number;
  lunghezza: number;
  iterazioni: number;
  anelloCorrente: number;
  avanzamento: { ingredientePossedutaId: number | null; partnerPossedutaId: number | null; partnerRegistrato: boolean; eseguibile: boolean };
  createdAt: string;
  updatedAt: string;
}

// ---- Operazioni della Stanza di Velluto dalla scorta (Fase 5.4) ----

export interface AnteprimaFusioneDto {
  risultato: PersonaFusioneDto;
  tipo: TipoFusione;
  ingredienti: Array<{ possedutaId: number; personaId: number; nome: string; nomeIt: string; livello: number; carica: boolean }>;
  /** Ingredienti «carichi» (gialli). */
  cariche: number;
  livelloBase: number;
  bonusLivelli: { min: number; max: number; rangoMatto: number; rangoArcano: number; affidabilita: 'alta' | 'media' | 'bassa' };
  livelloSuggerito: number;
  sopraProtagonista: boolean;
  allarme: boolean;
  /** Punti statistica casuali aggiunti dal gioco con l'Allarme (15/20/25 secondo le Persona cariche). */
  puntiAllarme: number;
  /** Con l'Allarme e ingredienti carichi le skill possono mutare (incidente). */
  rischioIncidente: boolean;
  slot: number;
  slotScelti: number;
  candidate: Array<SkillRiassuntoDto & { da: number[]; ereditabile: boolean; giaAppresa: boolean; motivo: string | null }>;
  tratti: Array<{ id: number; nome: string; nomeIt: string; da: number | null }>;
  skillInnate: SkillRiassuntoDto[];
}

export interface EsitoFusioneScortaDto {
  risultato: PersonaPossedutaDto;
  rimosse: Array<{ possedutaId: number; personaId: number; nomeIt: string; livello: number }>;
  anteprima: AnteprimaFusioneDto;
}

export interface EsitoForcaDto {
  ricevente: PersonaPossedutaDto;
  sacrificio: { personaId: number; nomeIt: string; livello: number; carica: boolean };
  moltiplicatore: number;
  fattori: Array<{ nome: string; valore: number; affidabilita: 'alta' | 'media' | 'bassa' }>;
  interpolato: boolean;
  incidente: boolean;
  /** Punti garantiti da un incidente con questi esemplari (5/10/15). */
  puntiGarantiti: number;
}

export interface EsitoIsolamentoDto {
  persona: PersonaPossedutaDto;
  guadagno: { applicazioni: number; puntiPerStatistica: number; totale: number };
  skillAppresa: SkillRiassuntoDto | null;
  elementoDebolezza: string | null;
}

export interface SuggerimentoIsolamentoDto {
  elemento: string | null;
  elementoNome: string | null;
  tier: string;
  skill: SkillRiassuntoDto | null;
}

// ---- Piani salvati (Fase 5.3) ----

export interface PassoPianoDto {
  risultato: PersonaFusioneDto;
  ingredienti: PersonaFusioneDto[];
  tipo: TipoFusione;
  skillPortate: Array<{ id: number; nome: string; nomeIt: string }>;
}

export interface AvanzamentoPianoDto {
  /** Il bersaglio è nella scorta. */
  completato: boolean;
  foglie: number;
  foglieInScorta: number;
  fusioni: number;
  /** Fusioni il cui risultato è già in scorta. */
  fusioniFatte: number;
  /** Fusioni eseguibili adesso (tutti gli ingredienti in scorta). */
  passi: PassoPianoDto[];
}

export interface PianoSalvatoDto {
  id: number;
  personaId: number;
  nome: string;
  nomeIt: string;
  arcana: string;
  arcanaNome: string;
  livello: number;
  /** Titolo scelto dall'utente (può essere vuoto). */
  titolo: string;
  note: string;
  obiettivoId: number | null;
  obiettivoStato: StatoObiettivo | null;
  opzioni: { profondita: number; alternative: number; catture: boolean; livelloMax: number | null; slotFortunato: boolean } | Record<string, never>;
  skill: SkillRiassuntoDto[];
  piano: PianoFusioneDto;
  costo: number;
  avanzamento: AvanzamentoPianoDto;
  createdAt: string;
  updatedAt: string;
}

// ---- Domande in classe ed esami (Fase 6.2) ----

export interface DomandaDto {
  id: number;
  /** Chiave del catalogo (il giorno): serve a correggere la riga, `null` finché la migrazione non l'ha assegnata. */
  chiave: string | null;
  /** Data di gioco «MM-GG». */
  data: string;
  tipo: 'classe' | 'esame-medio' | 'esame-finale' | 'tv' | 'altro';
  chi: string;
  domanda: string;
  /** Risposte corrette in ordine (più passi per le domande a catena). */
  /** `domanda` = il quesito, quando la riga ne raccoglie più d'uno (gli esami, migrazione 078). */
  risposte: Array<{ ordine: number | null; testo: string; domanda?: string }>;
  ricompensa: string;
  oggettiRicompensa?: RicompensaOggettoDto[];
  note: string;
  fonte: string;
  /** Segnata come fatta nella partita (false senza partita). */
  fatta: boolean;
}

export interface EsameDto {
  chiave: string;
  nome: string;
  date: string[];
  dataRisultati: string | null;
  domande: Array<{ data: string; ordine: number; domanda: string; risposta: string }>;
  note: string;
  oggettiRicompensa?: RicompensaOggettoDto[];
}

/** Una Dote che il gioco dà (o, disfacendo un conseguimento, toglie): da segnare **a mano** nella scheda Doti — l'app non
 *  la tocca (scelta dell'utente, 2026-09-30). `delta` in punti, `note` le note del gioco quando si sanno. */
export interface DoteDaSegnareDto {
  chiave: string;
  nome: string;
  delta: number;
  note?: number;
}

export interface DomandeDto {
  /** Solo nella risposta di una spunta: la nota di Conoscenza della risposta giusta, da segnare nelle Doti. */
  daSegnare?: DoteDaSegnareDto[];
  domande: DomandaDto[];
  esami: EsameDto[];
  premi: { fascinoPerPiazzamento?: Record<string, string>; moltiplicatoreConfidenti?: string; requisitoConoscenza?: Record<string, string>; trofeo?: string; fonte?: string; noteGenerali?: string } | null;
  dataGioco: string | null;
  /** Le domande non fatte della **prima** data da quella di gioco in poi (una o due): il prossimo appuntamento, non un elenco. */
  prossime: DomandaDto[];
  fatte: number;
  totale: number;
}

// ---- Oggetti della guida (Fase 10.2) ----

interface IdentitaOggettoGuida {
  catalogo?: RiferimentoOggettoDto | null;
  nomiAltri?: string[];
  notaPrezzo?: string | null;
}
export interface OggettiGuidaDto {
  /** Dopo M7 il catalogo fornisce identità e offerte per chiave; il crosswalk resta soltanto prima di M7. */
  /** L5 (M24): `posto` è il nome del posto dell'articolo (la sede del negozio che lo vende), `postiNegozi` quello di ogni negozio
   *  di `negozi` (la sede, altrimenti il nome del negozio), per il gesto che li apre. Assenti valgono come «nessun nome». */
  consumabili: Array<IdentitaOggettoGuida & { nome: string; nomeEn: string | null; categoria: 'cura' | 'sp' | 'stato' | 'battaglia' | 'esplorazione' | 'altro'; effetto: string; dove: string; prezzo: number | null; fonte: string; verificato: boolean; articolo?: string; negozi?: string[]; posto?: string | null; postiNegozi?: Record<string, string> }>;
  chiaveEMateriali: Array<IdentitaOggettoGuida & { nome: string; nomeEn: string | null; tipo: 'chiave' | 'materiale'; uso: string; dove: string; fonte: string; verificato: boolean; articolo?: string; negozi?: string[]; posto?: string | null; postiNegozi?: Record<string, string> }>;
  fabbricazione: { introduzione: string; sblocco: string; regole: string[]; fonte: string; ricette: Array<{ attrezzo: string; effetto: string; materiali: Array<{ nome: string; quantita: number | null }>; prodotti: number | null; sblocco: string | null; fonte: string; verificato: boolean; prodottiCatalogo?: RicompensaOggettoDto[]; materialiCatalogo?: ContenutoOggettoDto[] }> };
  personalizzazioneArmi: { introduzione: string; requisiti: string; costi: string; effetti: Array<{ nome: string; effetto: string; costo: string | null }>; progressioneConfidente: unknown[]; note: string | null; fonte: string };
  abiti: { introduzione: string; elenco: Array<IdentitaOggettoGuida & { nome: string; per: string; dove: string; fonte: string }>; lavanderia: { dove: string; costo: string; regole: string[]; fonte: string } };
  scambi: Array<{ venditore: string; dove: string; quando: string; offerte: Array<{ ricevi: string; dai: string; note: string | null }>; fonte: string; verificato: boolean }>;
  /** Dopo M7 gli scambi aprono il listino esistente, non una seconda tabella commerciale. Testi precedenti nelle note del negozio. */
  listiniScambi?: Array<{ chiave: string; nome: string; posto: string | null; casa: string; offerte: number }>;
}

// ---- Personaggi senza spoiler (Fase 10.3) ----

export interface PersonaggioDto {
  chiave: string;
  nome: string;
  nomeCodice: string | null;
  /** Chiave del Confidente nell'app, se esiste. */
  confidente: string | null;
  arcano: string | null;
  ruolo: string;
  presentazione: string;
  /** Persona iniziale ed evoluzioni. */
  persona: string[];
  armi: { mischia: string | null; distanza: string | null };
  battaglia: string | null;
  scuola: string | null;
  eta: string | null;
  doppiatori: { jp: string | null; en: string | null };
  giocabile: boolean;
  fonte: string;
  verificato: boolean;
  /** Campi presi da fonti secondarie (non dalla guida italiana). */
  campiDaFontiSecondarie: string[];
  fontiSecondarie: Array<{ campo: string | null; fonte: string }>;
}

export interface PersonaggiDto {
  personaggi: PersonaggioDto[];
  gruppi: Array<{ nome: string; membri: string[] }>;
}

// ---- Sfide: Battaglie Sfida, boss segreti, Magnate, tratti (Fase 9.2) ----

export interface BattagliaSfidaDto {
  chiave: string;
  nome: string;
  nomeIt: string | null;
  regole: string;
  nemici: string[];
  punteggi: string | null;
  ricompense: string[];
  oggettiRicompensa?: RicompensaOggettoDto[];
  strategia: string;
  livelloConsigliato: string | null;
  fonte: string;
  verificato: boolean;
}

export interface BossSegretoDto {
  chiave: string;
  nome: string;
  dove: string;
  quando: string;
  requisiti: string[];
  livelloConsigliato: string | null;
  mosse: string[];
  resistenze: string[];
  debolezze: string[];
  strategia: string[];
  ricompense: string[];
  oggettiRicompensa?: RicompensaOggettoDto[];
  /** Statistiche riportate dalla guida (HP, SP, PE, denaro, bottino), se note. */
  statistiche: Record<string, string | number> | null;
  /** Nota di trasparenza sull'inclusione della voce. */
  nota: string | null;
  fonte: string;
  verificato: boolean;
}

export interface SfideDto {
  battaglieSfida: { introduzione: string; sblocco: string; regoleGenerali: string; fonte: string; elenco: BattagliaSfidaDto[] };
  bossSegreti: BossSegretoDto[];
  /** Scheda di Magnate come raccolta dalla guida (campi testuali e tabelle), con `fonte`. */
  magnate: (Record<string, unknown> & { fonte: string }) | null;
  tratti: { introduzione: string; fonte: string; verificato: boolean; elenco: Array<{ nome: string; nomeEn: string | null; effetto: string; categoria: string | null; /** Compagno/Persona a cui appartiene un tratto «Alleati». */ personaggio: string | null }> };
  quizTv: { introduzione: string; numeroDomandeTotali: number | null; fonte: string; verificato: boolean };
}

// ---- Completamento: trofei, finali, Covo dei Ladri, DLC, meteo, Nuova Partita+, tempo (Fase 9.1) ----

export interface TrofeoDto {
  chiave: string;
  nome: string;
  nomeEn: string | null;
  tipo: 'bronzo' | 'argento' | 'oro' | 'platino';
  descrizione: string;
  come: string;
  mancabile: boolean | null;
  quando: string | null;
  fonte: string;
  verificato: boolean;
  /** Ottenuto nella partita. */
  ottenuto: boolean;
}

export interface CompletamentoDto {
  trofei: TrofeoDto[];
  ottenuti: number;
  finali: Array<{ chiave: string; nome: string; condizioni: string[]; date: string[]; descrizione: string; fonte: string }>;
  covo: { introduzione: string; medaglie: string; sfide: Array<{ nome: string; requisito: string; medaglie: number | null }>; premi: Array<{ nome: string; costo: number | null; sblocco: string | null; effetto: string | null; oggettiRicompensa?: RicompensaOggettoDto[] }>; fonte: string };
  dlc: Array<{ nome: string; contenuto: string; note: string | null; fonte: string }>;
  meteo: Array<{ condizione: string; effetti: string[]; fonte: string }>;
  nuovaPartitaPlus: { trasferito: string[]; nonTrasferito: string[]; note: string; fonte: string };
  differenzeRoyal: string[];
  tempo: { fasce: string[]; regole: string[]; fonte: string };
}

// ---- Guida giorno per giorno (Fase 7.5b) ----

/** Un incontro con un Confidente registrato nella partita, con la Dote che ha dato (`confidente_rango.effetti_json` del rango verso cui vale). */
export interface IncontroConfidenteDto {
  id: number | null;
  marcato: number | null;
  confidente: string;
  nome: string;
  /** Il rango verso cui vale l'incontro (quello che raggiunge, se è un passaggio). */
  verso: number;
  passaggio: boolean;
  giaContato: boolean;
  doti: Array<{ chiave: string; nome: string; delta: number; note: number }>;
  /** R10-17: presente solo se questa spunta ha alzato il rango del Confidente (da → a, con i punti e lo sblocco di prima): togliendo la
   *  spunta il rango torna a `da` e i punti a `punti`, se il Confidente è ancora al rango `a`. */
  rango?: { da: number; a: number; punti: number; sbloccato: boolean };
}

export interface EffettiAzioneDto {
  /** `delta` sono i punti applicati; `note` le note della guida da cui derivano (1–3); `cinema` se «Anima da cineasta» ha alzato lo scalino. */
  doti: Array<{ chiave: string; nome: string; delta: number; note?: number; cinema?: boolean }>;
  confidente: { chiave: string; nome: string; noteRisposta: 1 | 2 | 3; punti: number; bonusArcano: boolean } | null;
  /** Letture e visioni portate avanti dalla spunta (`prima` → `dopo`) con le Doti che l'elemento dà (`doti`, da segnare a
   *  mano: l'app non le tocca), e togliere la spunta non disfa la lettura. `visione`: una visione al cinema contata con le altre spunte. */
  letture?: Array<{ categoria: CategoriaLettura; chiave: string; nome: string; prima: number; dopo: number; doti?: Array<{ chiave: string; nome: string; delta: number }>; visione?: boolean }>;
  /** L'incontro con un Confidente che la spunta ha registrato (la Dote a ogni incontro): `id` se l'ha creato (togliendo la spunta
   *  si toglie con le sue Doti), `marcato` se ha segnato come passaggio di rango un incontro già registrato in quel momento della
   *  giornata, `giaContato` se quell'incontro (o il passaggio a quel rango) c'era già e non ha dato niente di nuovo. */
  incontro?: IncontroConfidenteDto;
  /** Turni registrati dalla spunta (`ordine` del turno nell'attività): togliendo la spunta si toglie quel turno e i suoi punti. */
  turni?: Array<{ attivita: string; nome: string; ordine: number; doti: Array<{ chiave: string; nome: string; delta: number; note: number }>;
    /** R9-12/2: la paga canonica dell'attività al momento del turno (promemoria: gli yen non si muovono da qui). */
    paga?: { yen: number; massima: number | null } | null }>;
  /** Aperture dichiarate dall'utente durante questa visita ai Memento. Valgono finché resta la spunta;
   *  altre visite o registrazioni manuali dello stesso evento restano indipendenti. Nessuna data presunta. */
  apertureDedali?: Array<{ chiave: string; nome: string }>;
}

export interface RiferimentoAzioneDto {
  tipo: 'confidente' | 'dungeon' | 'richiesta' | 'libro' | 'film' | 'attivita' | 'negozio' | 'dote';
  chiave: string;
}

/** Stato dell'azione nella partita (12.4): consigliata (requisiti del rango soddisfatti), bloccata (requisiti rossi, con motivo), neutra. */
/** Chiavi da evidenziare in oro nell'interfaccia: entità coinvolte nelle azioni ancora da fare del giorno corrente (12.4). */
export interface SuggerimentiOggiDto {
  /** Giorno corrente della partita ('MM-GG'); null se non impostato. Non si chiama `data` per non sembrare l'envelope delle risposte. */
  giorno: string | null;
  confidenti: string[];
  /** Personaggi della guida legati ai Confidenti suggeriti. */
  personaggi: string[];
  dungeon: string[];
  /** Aree del Palazzo o del dedalo suggerito. */
  aree: string[];
  libri: string[];
  film: string[];
  /** Articoli a scaffale corrispondenti ai libri e ai film suggeriti. */
  articoli: string[];
  attivita: string[];
  richieste: string[];
  negozi: string[];
  /** Chiavi dei luoghi della città («<quartiere>/<luogo>»). */
  luoghi: string[];
  quartieri: string[];
  doti: string[];
  /** Chiavi delle mappe a livelli e id degli spilli da accendere nel visore. */
  mappe: string[];
  spilli: number[];
  /** Perché una chiave è suggerita: testo dell'azione della guida. */
  motivi: Array<{ categoria: string; chiave: string; azione: string; fascia: 'giorno' | 'sera' }>;
}

export interface StatoAzioneDto {
  tipo: 'consigliata' | 'bloccata' | 'neutra';
  motivo: string | null;
}

/** Che cosa è una voce della giornata: un'azione (si spunta) o un evento, una scadenza, un promemoria (si mostrano). */
export type GenereVoce = 'azione' | 'evento' | 'scadenza' | 'promemoria';

/**
 * Una voce della giornata (`voce_giornata`, file di gioco, dalla migrazione 092): azione della guida, cosa da fare o evento
 * aggiunti dall'utente sono la stessa cosa e sono canone, per tutte le partite (richiesta dell'utente, 2026-09-30). Le voci di
 * una fascia arrivano nel loro ordine esatto.
 */
/** Il dialogo di un rango di un Confidente (`confidente_dialogo`): le scelte con le note che danno (1-3; null = nessuna nota o non documentata). */
export interface DialogoVoceDto {
  confidente: string;
  rango: number;
  note: string;
  scelte: Array<{ ordine: number; testo: string; note: 1 | 2 | 3 | null; puntiTesto: string | null; romantica: boolean; avviso: string | null }>;
}

export interface AzionePercorsoDto {
  /** Solo sulle visite strutturate ai Memento: eventi di apertura dichiarabili alla spunta, con i nomi correnti dei dedali. */
  apertureDedali?: Array<{ chiave: string; nome: string }>;
  /** Solo riferimenti strutturati già presenti: nessuna riscrittura del testo o classificazione per somiglianza. */
  oggettoRiferimento?: RiferimentoOggettoDto | null;
  oggettiCitati?: RiferimentoOggettoDto[];
  /** Solo sulle voci d'incontro con un Confidente che, al giorno o alla fascia della voce, non è disponibile (R9-03): un avviso, mai un blocco. */
  avvisiDisponibilita?: Array<{ tipo: 'fuori-giorno' | 'fuori-fascia'; testo: string }>;
  /** R9-06: il nome di adesso del Confidente, solo quando il testo salvato nella voce (`riferimentoTesto`) cita un nome diverso: da mostrare accanto al testo, che non si riscrive. */
  riferimentoNomeAttuale?: string;
  /** Identità stabile: le spunte delle partite si agganciano a questa. */
  uid: string;
  /** Giorno del calendario di gioco ('MM-GG'); «giorno» e non «data» per l'envelope `{ data }` delle risposte. */
  giorno: string;
  fascia: 'giorno' | 'sera';
  genere: GenereVoce;
  /** Il testo della voce (il titolo, per un evento). */
  azione: string;
  tipo: 'confidente' | 'dote' | 'palazzo' | 'richiesta' | 'acquisto' | 'lavoro' | 'libro' | 'dvd' | 'attivita' | 'esame' | 'trama' | 'velluto' | 'altro';
  riferimento: RiferimentoAzioneDto | null;
  riferimentoTesto: string | null;
  rangoAtteso: number | null;
  note: string | null;
  /** Che cosa produce la spunta (`shared/effettiAzione.ts`): dato strutturato e modificabile; le note sono solo testo. */
  produce: EffettoAzione[];
  /** Fonte unica ordinata degli effetti; il RAW non convertibile resta visibile e non diventa una lista vuota. */
  effettiVoce?: StatoEffettiVoceDto;
  /** Ricevute del nuovo formato, separate dalla fotografia legacy della spunta. */
  ricevuteEffetti?: ReceiptEffettoVoceDto[];
  /** Quante proposte di punti aspettano una decisione per questa voce nella partita: se > 0 la voce mostra il pulsante «Applica» (BON-01). */
  daApplicare?: number;
  /** R10-11/C: il dialogo del passaggio di rango della voce (voce di un Confidente con `rangoAtteso`), dalle scelte di L9: solo una proposta, i punti li dà la scelta dell'utente alla spunta. */
  dialogo?: DialogoVoceDto;
  /** Gli effetti di `produce` in parole, con i nomi di libri, film e attività («Zorro, il fuorilegge: completato»). */
  produceTesto: string[];
  /** Fatta nella partita. */
  fatta: boolean;
  /** Ciò che la spunta ha applicato (dagli effetti `produce` e dalle note del Confidente): Doti, punti e turni si annullano togliendola, le letture restano. */
  effetti: EffettiAzioneDto | null;
  /** Stato rispetto alla partita (solo con partita): consigliata/bloccata/neutra con motivo. */
  stato: StatoAzioneDto | null;
  /** Mappa (e spillo) collegati al luogo dell'azione: Palazzo, Mementos, negozio, luogo del Confidente. */
  /** `posto` (L5, M23): il nome del posto del pin — il luogo, altrimenti l'Area della planimetria — per il gesto che lo apre. */
  mappa: { chiave: string; spilloId: number | null; posto?: string | null } | null;
  /** Per una voce collegata a un Palazzo: dove si atterra il giorno della voce (2026-10-04); il cartellino del Palazzo porta lì. L6
   *  (R6-17): la destinazione unica `destinazionePalazzo`, la stessa della metro e del campo `mappa` (la regola d'atterraggio del giorno,
   *  o l'ingresso del Palazzo). Null senza Palazzo o se il Palazzo non ha mappe (allora porta alla sua scheda). Assente vale come null. */
  atterraggio?: { mappa: string; spillo: number | null } | null;
  /** La guida del quiz delle attività di cui la voce registra un turno o a cui è collegata (migrazione 105), con `oggi` vero
   *  se il giorno della voce è uno dei giorni del quiz. Assente o vuoto: nessun quiz. */
  quiz?: QuizVoceDto[];
  /** Solo nella risposta di una spunta: era l'ultima attività del giorno corrente e la partita è passata al giorno dopo. */
  giornoAvanzato?: GiornoAvanzatoDto;
  // ---- L3: il campo «Infiltrazioni» delle voci di Palazzo (presenti solo se la voce ha un Palazzo: riferimento `dungeon`,
  // oppure infiltrazioni già scelte, oppure una proposta — `palazzoDellaVoce`; assenti per le altre voci) ----
  /** L'insieme scelto, in ordine (la stessa infiltrazione può tornare, mai di seguito); vuoto = nessuna. */
  infiltrazioni?: Array<{ chiave: string; nome: string }>;
  /** Le infiltrazioni del Palazzo della voce, le opzioni del selettore. */
  infiltrazioniDelPalazzo?: Array<{ chiave: string; nome: string; ordine: number }>;
  /** La proposta (da G-022, o calcolata con le regole certe), solo con l'insieme vuoto; null se non c'è. */
  propostaInfiltrazioni?: { infiltrazioni: Array<{ chiave: string; nome: string }>; motivo: string; certezza: 'certa' | 'multipla' | 'probabile' } | null;
  /** L'infiltrazione che «Entra» apre per la partita: la prima non completata dell'insieme, altrimenti l'ultima; con l'insieme vuoto e
   *  una proposta la prima della proposta, qualunque sia la certezza (UX3-1, L3 §4.4); **assente** senza insieme né proposta (allora la
   *  scheda apre la prima non completata del Palazzo, `?infiltrazione=in-corso`). */
  infiltrazioneDaAprire?: string | null;
  // ---- L3 §1.4: voci «da rivedere» (meccanismo unico con L10); assenti valgono false/null ----
  /** Voce aggiunta, corretta o segnalata dal team, da rivedere con l'utente. */
  daRivedere?: boolean;
  /** 'team' per le voci aggiunte dal team. */
  aggiuntaDa?: 'team' | null;
  /** Perché è da rivedere (frase dell'Esperto o del team). */
  motivoRevisione?: string | null;
  /** I campi com'erano prima della prima correzione del team (null se mai corretta): «Rimetti il precedente» li rimette. */
  testoPrecedente?: { azione: string; note: string | null; riferimento: RiferimentoAzioneDto | null; riferimentoTesto: string | null } | null;
}

/** L'esito di «da rivedere» su una voce: tieni il nuovo, rimetti il precedente (solo con un testo precedente), fatto. */
export type EsitoRevisioneVoce = 'tieni' | 'rimetti' | 'fatto';

/** La guida del quiz di un'attività come la porta una voce della giornata. */
export interface QuizVoceDto { attivita: string; nome: string; quiz: QuizAttivita; oggi: boolean }

/** Un elemento che un'azione può collegare o nominare negli effetti. */
export interface VoceElencoAzione { chiave: string; nome: string; dettaglio?: string }

/** Gli elenchi da cui la finestra di un'azione sceglie collegamento ed effetti (`GET /api/compendio/percorso-elenchi`). */
export interface ElenchiAzioneDto {
  confidenti: VoceElencoAzione[];
  dungeon: VoceElencoAzione[];
  richieste: VoceElencoAzione[];
  libri: VoceElencoAzione[];
  film: VoceElencoAzione[];
  videogiochi: VoceElencoAzione[];
  /** `turni`: si conta per volte, quindi può essere l'attività di un effetto «turno». */
  attivita: Array<VoceElencoAzione & { turni: boolean }>;
  negozi: VoceElencoAzione[];
  doti: VoceElencoAzione[];
}

/** I campi di una voce della giornata che si scrivono (creandola o modificandola): tutti, dal testo agli effetti della spunta,
 *  più la posizione esatta nella fascia. */
export interface DatiVoceGiornata {
  genere?: GenereVoce;
  azione?: string;
  note?: string | null;
  fascia?: FasciaGioco;
  tipo?: AzionePercorsoDto['tipo'];
  /** Il collegamento (null = nessuno); il nome lo calcola il server dall'elemento. */
  riferimento?: RiferimentoAzioneDto | null;
  rangoAtteso?: number | null;
  /** Effetti della spunta (solo per un'azione). */
  produce?: EffettoAzione[];
  /** CAS della fonte unica, richiesto quando si modificano gli effetti di una voce già presente. */
  revisioneEffettiAttesa?: string;
  /** Creazione: UID null e nessun token; modifica: fonte completa e token obbligatorio. */
  effettiVoce?: { effetti: RichiestaSalvaEffettiVoce['effetti']; revisioneEffettiAttesa?: string };
  /** Posto nella fascia, da 0 (in cima); oltre l'ultimo = in fondo. Omesso: in fondo creando, dov'era modificando (in fondo alla
   *  fascia nuova se cambia fascia). */
  posizione?: number;
}

/** Copiare o spostare voci del diario in un altro giorno e fascia (richiesta dell'utente, 2026-10-12). */
export interface TrasferisciVociGiornata {
  /** Le voci, in qualunque ordine: arrivano in fondo alla fascia nel loro ordine (giorno, fascia, posto). */
  uid: string[];
  /** Il giorno di destinazione, 'MM-GG'. */
  giorno: string;
  fascia: FasciaGioco;
  /** «copia»: voci nuove con lo stesso contenuto, senza spunte; «sposta»: le stesse voci (uid e spunte restano). */
  modo: 'copia' | 'sposta';
}

/** L'esito: le voci arrivate (uid, nell'ordine) e tutte le voci del giorno di destinazione (con lo stato nella partita, se data).
 *  Il giorno si chiama `giorno`: un campo `data` farebbe prendere la risposta per già imbustata. */
export interface VociTrasferiteDto {
  giorno: string;
  fascia: FasciaGioco;
  uid: string[];
  voci: AzionePercorsoDto[];
}

/** Più voci della guida di un Palazzo da spostare (2026-10-14) o copiare (2026-10-18) insieme in un'altra sua area. */
export interface SpostaPuntiInArea {
  /** Le chiavi delle voci (non passi di un Enigma: seguono il loro Enigma). */
  chiavi: string[];
  /** L'area di destinazione, dello stesso Palazzo. */
  area: string;
}

/** L'esito: l'area di destinazione e le voci spostate (in fondo, nell'ordine); quelle che erano già lì non ci sono. */
export interface PuntiSpostatiDto {
  area: string;
  spostate: string[];
}

/** L'esito di una copia di voci in un'altra area (2026-10-18): per ogni voce, nell'ordine d'arrivo, la chiave d'origine, quella
 *  della copia e quanti passi dell'Enigma, schede della guida senza mappa e collegamenti ai pin sono stati copiati con lei. */
export interface PuntiCopiatiDto {
  area: string;
  copiate: Array<{ origine: string; copia: string; passi: number; schede: number; pin: number }>;
}

export interface PercorsoGiornoRiassuntoDto {
  /** 'MM-GG' del calendario di gioco. */
  giorno: string;
  giornoSettimana: string;
  fase: string;
  meteo: string | null;
  azioni: number;
  fatte: number;
  avvisi: number;
  coperto: boolean;
}

export interface PercorsoIndiceDto {
  giorni: PercorsoGiornoRiassuntoDto[];
  /** Giorno corrente della partita ('MM-GG'), se indicata e impostato. */
  dataCorrente: string | null;
  totaleGiorni: number;
  giorniCoperti: number;
}

/** Esito di PUT /partite/:id/giorno: il giorno impostato e la partita aggiornata (data di gioco e `updatedAt`), da riportare nello store senza ricaricare l'elenco. */
export interface GiornoCorrenteDto {
  dataCorrente: string;
  partita: PartitaDto;
}

/** Spuntata l'ultima attività del giorno corrente, la partita è passata al giorno dopo, di giorno (richiesta dell'utente,
 *  2026-09-30). Arriva nella risposta della spunta (azione della guida o cosa da fare) che l'ha fatto scattare. */
export interface GiornoAvanzatoDto {
  da: string;
  a: string;
  partita: PartitaDto;
}

export interface PercorsoGiornoDto {
  /** 'MM-GG' del calendario di gioco. */
  giorno: string;
  giornoSettimana: string;
  fase: string;
  trama: string;
  vincoli: string[];
  meteo: string | null;
  /** Tutte le voci del giorno, nel loro ordine esatto: prima quelle di giorno, poi quelle di sera. */
  azioni: AzionePercorsoDto[];
  avvisi: string[];
  fonte: string;
  coperto: boolean;
  precedente: string | null;
  successivo: string | null;
  dataCorrente: string | null;
  /** Azioni fatte nella partita (eventi, scadenze e promemoria non si spuntano e non contano). */
  fatte: number;
  /** Con una partita: il meteo del giorno nella partita, di giorno e di sera (Partita → Oggi). */
  meteoPartita: MeteoGiornoDto | null;
  /** Le allerte del gioco del giorno (anche senza partita): il tag nella scheda del giorno (2026-10-12). */
  allerte: AllertaGiornoDto[];
}

// ---- Negozi e inventario (Fase 8.2) ----

export interface NegozioRiassuntoDto {
  condizioni?: CondizioneSpilloDto[];
  chiave: string;
  nome: string;
  luogo: string;
  luogoChiave: string | null;
  quartiereNome: string | null;
  tipo: 'armi' | 'protezioni' | 'accessori' | 'oggetti' | 'regali' | 'abiti' | 'cibo' | 'online' | 'ambulante' | 'distributore' | 'materiali' | 'misto' | 'altro';
  gestore: string | null;
  confidente: { chiave: string; nome: string } | null;
  /** Gli orari come valori (migrazione 069): sono l'unica disponibilità del negozio e del suo pin. */
  orariStrutturati: OrariNegozio;
  /** La frase generata dagli orari strutturati: una sola per ogni valore uguale. */
  orariTesto: string;
  /** Il luogo della città dove sta il negozio (migrazione 072); null per chi non ha una sede (online, TV, dentro un Palazzo). */
  sedeChiave: string | null;
  sedeNome: string | null;
  /** Il programma punti dichiarato (migrazione 076), se il negozio ne ha uno. */
  programmaPunti: { nome: string; unita: string; calcolo: 'manuale' | 'rango-cliente' } | null;
  articoli: number;
  verificati: number;
  /** Solo con `partita`: la presenza del negozio alla data corrente, dagli orari. */
  disponibilita?: DisponibilitaDto;
  /** L5: la sezione del negozio nella pagina del suo luogo (`/guida/luogo/<q>/<l>#negozio-<k>`), o null senza sede. Da L5 gli orari
   *  (`orariStrutturati`, `orariTesto`, `disponibilita`) sono quelli della sede, più l'eccezione del negozio se c'è. */
  sedeCasa?: string | null;
  /** L5 (R5-12b): l'orario del solo negozio quando la guida lo distingue dal luogo (Chiesa di Kanda la domenica…), o null. */
  eccezioneOrari?: OrariNegozio | null;
}

/** Disponibilità nella partita alla data corrente: «bloccato» con almeno un requisito rosso, «ignoto» se resta del grigio, altrimenti disponibile. */
export interface DisponibilitaDto {
  stato: 'disponibile' | 'bloccato' | 'ignoto';
  requisiti: SemaforoRequisitoDto[];
}

export interface ArticoloDto {
  /** Discordanze documentali, separate dalla nota personale e dal prezzo corrente. */
  noteStoriche?: NotaStoricaOfferta[];
  /** Presenza legacy distinta dai fatti confermati e dalle loro fonti; nessuna quantità dedotta dalla spunta. */
  acquisti?: StatoAcquistiArticoloDto;
  /** Registrazioni effettive sulle singole offerte: l'annullamento riguarda solo la chiave scelta. */
  acquistiRegistrati?: Array<{ articolo: string; negozioNome: string }>;
  /** Risultati collegati di un baratto; una sola offerta/spunta, senza oggetti-bundle fittizi. */
  ricevuti?: RicompensaOggettoDto[];
  nomiAltri?: string[];
  nomeOriginale?: string | null;
  costoDaVerificare?: boolean;
  /** Sede effettiva per acquistare da un listino condiviso, senza ereditare la presenza della sede principale. */
  sedeChiave?: string | null;
  catalogo?: RiferimentoOggettoDto | null;
  costo?: CostoOggettoDto | null;
  condizioni?: CondizioneSpilloDto[];
  chiave: string;
  negozioChiave: string;
  negozioNome: string;
  nome: string;
  nomeIt: string | null;
  categoria: CategoriaArticolo;
  /** Personaggio destinatario, «tutti», «party» o null se non indicato. */
  per: string | null;
  prezzo: number | null;
  effetto: string | null;
  statistiche: string | null;
  /** Quante se ne possono comprare; `null` = nessun limite dichiarato (diverso da zero). */
  quantita: number | null;
  /** L'archivio dell'oggetto collegato, e la sua chiave: insieme sono il collegamento. */
  oggettoFonte: string | null;
  oggettoChiave: string | null;
  disponibileDal: string | null;
  /** Non più valorizzato (L11, migrazione 187): la frase dell'offerta è nell'archivio, la condizione è in `condizioni`. */
  condizione?: string | null;
  nota: string | null;
  verificato: boolean;
  /** Solo con `partita`: valutazione delle `condizioni` (e di `disponibileDal`) alla data corrente (stessi requisiti dei semafori). */
  disponibilita?: DisponibilitaDto;
  /** Acquistato/ottenuto nella partita. */
  acquistato: boolean;
}

export interface NegozioDettaglioDto extends NegozioRiassuntoDto {
  trasformazioni?: TrasformazioneOggettoDto[];
  note: string | null;
  articoliElenco: ArticoloDto[];
  acquistati: number;
  /** La guida del quiz delle attività che si svolgono nella sede del negozio (migrazione 105: il lavoro al Triple Seven), con
   *  `oggi` vero se il giorno corrente della partita è uno dei giorni del quiz. Vuoto senza sede o senza quiz. */
  quiz: QuizVoceDto[];
}

export interface RicercaArticoliDto {
  articoli: ArticoloDto[];
  totale: number;
}

// ---- Cruciverba di Leblanc (Fase 7.5) ----

export interface CruciverbaDto {
  /** Solo nella risposta di una spunta: la nota di Conoscenza del cruciverba, da segnare nelle Doti. */
  daSegnare?: DoteDaSegnareDto[];
  /** 'MM-GG' del calendario di gioco. */
  giorno: string;
  /** Chiave del catalogo (giorno e posizione): serve a correggere la riga. */
  chiave: string | null;
  indizio: string;
  risposta: string;
  rispostaEn: string | null;
  /** Risolto nella partita. */
  fatto: boolean;
}

export interface CruciverbaTuttiDto {
  cruciverba: CruciverbaDto[];
  /** Giorno corrente della partita e il primo cruciverba non risolto da quel giorno in poi (null senza partita). */
  dataGioco: string | null;
  prossimo: CruciverbaDto | null;
  risolti: number;
  totale: number;
}

// ---- Città, attività, libri e film (Fase 8.1) ----

export type { DoteChiave } from './doti.js';

/** L'ingresso di un quartiere: la planimetria (chiave pubblica e nome del percorso), il punto e lo zoom; dalla 109 (L2) anche l'Area
 *  della planimetria (slug e nome), null se la planimetria non ne ha una. */
export interface IngressoQuartiereDto { mappa:string; nome:string; x:number; y:number; zoom:number; area: { slug: string; nome: string } | null }
/** L'illustrazione di un posto (quartiere, Palazzo) presa dalla sua mappa con la regola unica di L1: prima l'immagine
 *  caricata (URL versionato), poi l'asset dichiarato. `asset` è null quando l'asset della mappa è lo stemma del posto
 *  (radici dei Palazzi), che le viste mostrano già come segno: l'illustrazione allora c'è solo se caricata. */
export interface IllustrazioneDto { immagineUrl: string | null; asset: string | null }

// ---- Le Aree (L2, migrazione 109): Città → Quartiere → Area → Planimetrie → Luoghi ----
// Un'Area è la stessa cosa nel quartiere, nella città (lo staff, da verificare) e — da L3 — nel Palazzo: i contratti sono generici
// sul contenitore da subito, così L3 non li cambia. La «casa» è l'indirizzo dell'unica pagina che mostra una mappa: la calcola il
// server (`casaMappa.ts`), l'interfaccia non ricostruisce la regola.

/** Il posto che contiene un'Area: la città (Tokyo, per le planimetrie che nessuna fonte colloca), un quartiere (L2) o un Palazzo (L3). */
export interface ContenitoreAreaDto { tipo: 'citta' | 'quartiere' | 'dungeon'; chiave: string; nome: string }
/** L'Area di una planimetria, con la sua versione dentro l'Area (null per le radici, i Memento e i Palazzi fino a L3). */
export interface AreaRifDto {
  chiave: string; contenitore: ContenitoreAreaDto; slug: string; nome: string;
  /** L'etichetta della versione («inquadratura orientale»); null nelle Aree con una planimetria sola. */
  versioneEtichetta: string | null;
  /** La posizione della versione dentro l'Area, da 0. */
  versioneOrdine: number;
  /** È la planimetria che l'Area mostra aprendola. */
  predefinita: boolean;
  /** La casa dell'Area, con la versione se non è la predefinita. */
  casa: string;
  /** L'Area è in attesa della scelta dell'utente (lo staff di Tokyo): il segno «Da verificare» anche nell'indice delle mappe (L2, R1).
   *  Il server lo manda sempre: è facoltativo solo per i dati di prova scritti prima. */
  daVerificare?: boolean;
}
/** Una planimetria (versione) di un'Area. */
export interface PlanimetriaAreaDto {
  /** Chiave pubblica della mappa. */
  chiave: string; nome: string; etichetta: string | null; ordine: number; predefinita: boolean; numeroSpilli: number;
  immagineUrl: string | null; asset: string | null; ruoloImmagine: RuoloImmagine;
}
/** Un'Area nell'elenco del suo contenitore. */
export interface AreaRiassuntoDto {
  chiave: string; contenitore: ContenitoreAreaDto; slug: string; nome: string;
  /** Il nome l'ha rivisto una persona (non è quello della guida). */
  nomeRivisto: boolean;
  ordine: number;
  /** Chiave pubblica della planimetria predefinita (null se l'Area è rimasta senza planimetrie). */
  predefinita: string | null;
  /** L'immagine della predefinita, con il risolutore unico di L1. */
  illustrazione: IllustrazioneDto;
  numeroPlanimetrie: number;
  /** I pin di tutte le planimetrie dell'Area. */
  numeroSpilli: number;
  /** Il pin di passaggio verso l'Area sull'illustrazione del contenitore (il primo, se più d'uno); null se manca. */
  passaggio: { spillo: number; x: number; y: number } | null;
  /** L'ingresso del quartiere usa una planimetria di quest'Area. */
  ingresso: boolean;
  origine: 'seed' | 'utente';
  /** L'utente ha corretto un'Area della guida (c'è una copia dei valori di prima, che «Ripristina» rimette). */
  modificata: boolean;
  /** L'Area è in attesa della scelta dell'utente: tenerla o rimuoverla (lo staff, decisione del 2026-10-20). */
  daVerificare: boolean;
  casa: string;
  /** Le infiltrazioni che toccano l'Area (`infiltrazione_area`, L3), nell'ordine del Palazzo; vuoto nel mondo. Il server lo manda
   *  sempre: è facoltativo solo per i dati di prova scritti prima di L3. */
  infiltrazioni?: Array<{ chiave: string; nome: string; ordine: number }>;
  /** I collezionabili delle sue planimetrie e quanti ne ha presi la partita, come la raccolta del Palazzo (L3). `presi` è null
   *  senza partita e sempre nel mondo (la raccolta con la partita la contano i Palazzi). Il server lo manda sempre. */
  raccolta?: { n: number; presi: number | null };
  /** L4 (§1.5): gli oggetti permanenti con un pin su una sua planimetria, quanti fatti e se è completata (senza niente da contare sì).
   *  `fatti`/`completata` null senza partita. Solo per le Aree dei Palazzi. */
  completamento?: { oggetti: number; fatti: number | null; completata: boolean | null };
  /** L6: sblocco effettivo del quartiere ereditato dall'Area del mondo. */
  sblocco?: SbloccoDto;
  /** L6: esito dello sblocco ereditato, quando la risposta è legata a una partita. */
  disponibile?: boolean;
  bloccoMotivo?: string | null;
}
/** Un luogo, negozio, attività o Confidente segnato con un pin su una planimetria dell'Area. */
export interface ElementoAreaDto { tipo: 'luogo' | 'negozio' | 'attivita' | 'confidente'; chiave: string; nome: string; spillo: number; planimetria: string;
  /** Esito delle condizioni del pin e della presenza, uguale al visore. */
  disponibilita?: DisponibilitaDto;
  /** L5: la presenza del luogo (o della sede del negozio) con la funzione unica; assente per Confidenti e attività senza sede. */
  presenza?: PresenzaLuogoDto;
  /** L5: la pagina del luogo (per un negozio con sede, la sua sezione `#negozio-<k>`), o null. */
  casa?: string | null;
  /** L5: il pin è agganciato a un negozio di un altro quartiere (da rivedere, nessun cambio senza il sì dell'utente). */
  daRivedere?: 'negozio-altro-quartiere';
  /** L5 R5-20f: luogo solo per gli eventi di un Confidente, mai in «Luoghi qui». */
  soloEventi?: boolean }
/** La pagina di un'Area. */
export interface AreaDettaglioDto extends AreaRiassuntoDto {
  /** Le versioni, nell'ordine. */
  planimetrie: PlanimetriaAreaDto[];
  elementi: ElementoAreaDto[];
  /** L5: i luoghi dell'Area (`luogo.area_chiave`), con la loro presenza. */
  luoghi?: LuogoDto[];
  /** L5: i luoghi dell'Area senza pin («Da posizionare»). */
  daPosizionare?: LuogoDto[];
  /** Dove portano i passaggi delle sue planimetrie (lei esclusa), una volta per destinazione. */
  vicine: Array<{ nome: string; quartiereNome: string | null; casa: string }>;
}
/** Una planimetria del mondo senza Area (da assegnare con «Colloca»). */
export interface MappaDaCollocareDto { chiave: string; nome: string;
  /** La chiave pubblica del genitore (FUN2-9 di L2): «Colloca» propone il quartiere con `mappaChiave` uguale. */
  genitore: string | null;
  genitoreNome: string | null; numeroSpilli: number; immagineUrl: string | null; asset: string | null }

// ---- La gerarchia dei luoghi (L11 B5): Città › Quartieri › Aree › Planimetrie e Città › Palazzi › Aree › Planimetrie ----

/** I tipi di nodo. `memento`, `dedalo` e `area-dedalo` sono il ramo Memento › Dedali › Aree (L11 B6): un'area del dedalo non ha planimetrie. */
export type TipoNodoGerarchia = 'citta' | 'quartiere' | 'area' | 'planimetria' | 'palazzo' | 'infiltrazione' | 'memento' | 'dedalo' | 'area-dedalo' | 'da-collocare';

/** Quel che un nodo contiene, contato dal server (E1, E2, E6): ogni cosa una volta sola, mai sommata dal client. I campi assenti non hanno senso per quel nodo. */
export interface ConteggiNodoDto {
  quartieri?: number; palazzi?: number; aree?: number; planimetrie?: number; infiltrazioni?: number;
  /** Ramo dei Memento (L11 B6): i dedali del Memento, e le Persona (distinte), le Trame e le Richieste di un dedalo o di un'area del dedalo. */
  dedali?: number; persone?: number; trame?: number; richieste?: number;
  /** I pin: «contenuto» sono i pin veri, «passaggi» e «note» si dicono accanto. Nell'Area ogni oggetto conta una volta (riferimento, poi voci collegate, poi pin). */
  pin: ConteggiPinDto;
}

/** Un nodo dell'albero. La `chiave` è quella del suo oggetto: il quartiere, il dungeon, l'Area (la sua chiave piena), la planimetria (chiave pubblica della mappa), l'infiltrazione. */
export interface NodoGerarchiaDto {
  tipo: TipoNodoGerarchia;
  chiave: string;
  /** Il nome da mostrare: quello del posto, mai «Mappa». */
  nome: string;
  /** La casa: l'unica pagina che mostra l'oggetto (calcolata dal server, `casaMappa.ts`). Null solo per «Da collocare», che è un contenitore. */
  casa: string | null;
  /** Solo area: lo slug (serve a «Colloca»). */
  slug?: string;
  /** Solo città, quartiere, Palazzo: la chiave pubblica della mappa che li illustra (per «Colloca»). */
  mappa?: string;
  /** La miniatura col risolutore unico di L1; null per il Palazzo (il segno lo disegna il FE) e per i contenitori. */
  immagine: IllustrazioneDto | null;
  conteggi: ConteggiNodoDto;
  /** Area in attesa della scelta dell'utente (lo staff di Tokyo). */
  daVerificare?: boolean;
  /** Quartiere e Area del mondo con una partita: già aperto? (`null` senza partita). Mai nascosto: si segna. */
  disponibile?: boolean | null;
  bloccoMotivo?: string | null;
  /** Solo planimetria: la versione dentro l'Area. */
  versione?: { etichetta: string | null; ordine: number; predefinita: boolean };
  /** I nodi sotto: quartieri, aree della città e Palazzi sotto Tokyo; aree sotto un quartiere o un Palazzo; planimetrie sotto un'Area. */
  figli: NodoGerarchiaDto[];
  /** Solo area di un Palazzo: le infiltrazioni che la toccano, accanto (tipo `infiltrazione`, senza figli). */
  accanto?: NodoGerarchiaDto[];
  /** Solo Palazzo: le infiltrazioni che non toccano nessuna Area. */
  senzaArea?: NodoGerarchiaDto[];
  /** Solo «Da collocare»: le planimetrie senza Area, nella forma che «Colloca» già usa. */
  daCollocare?: MappaDaCollocareDto[];
}

/** `GET /api/mappe/gerarchia`: le radici (Tokyo, e in fondo «Da collocare») e i totali dell'intestazione. */
export interface GerarchiaMappeDto {
  radici: NodoGerarchiaDto[];
  totali: { citta: number; quartieri: number; areeMondo: number; planimetrieMondo: number; palazzi: number; areePalazzi: number; planimetriePalazzi: number; infiltrazioni: number; daCollocare: number; pin: ConteggiPinDto;
    /** Ramo dei Memento (L11 B6): quanti dedali e quante aree dei dedali. */
    dedali?: number; areeDedali?: number };
}
export interface QuartiereRiassuntoDto {
  mappaChiave?:string;
  ingresso?:IngressoQuartiereDto|null;
  /** L'illustrazione della mappa del quartiere (`citta-<quartiere>`), sotto la sagoma nella scheda (scelta dell'utente, 2026-10-20). */
  illustrazione: IllustrazioneDto;
  /** Quante Aree ha il quartiere (L2). */
  aree: number;
  sbloccoData?:string|null;
  chiave: string;
  nome: string;
  /** Non più valorizzato (L11, migrazione 188): la frase della guida è nell'archivio, lo sblocco è `sbloccoCondizione`. */
  sblocco?: string | null;
  descrizione: string;
  luoghi: number;
  verificati: number;
  /** Il quartiere è già nel mondo, al punto in cui è la partita?
   *
   * Vero anche senza partita: senza non c'è niente da decidere. Le regole sono la condizione del quartiere (`condizioni_json`, con gli inviti):
   * sette quartieri su ventitré hanno una data, gli altri si aprono col rango di un Confidente, con un libro letto o durante un Palazzo — e sono
   * chiusi lo stesso. La mappa di Tokyo mostra solo i quartieri disponibili. */
  disponibile?: boolean;
  /** Perché è chiuso, nelle parole del valutatore: «Yusuke: rango 1 di 3». Null se è aperto. */
  bloccoMotivo?: string | null;
  /** L6 (R6-08): lo sblocco strutturato (`quartiere.condizioni_json` in OR con gli inviti), con la fonte e l'esito. */
  sbloccoCondizione?: SbloccoDto;
}

export interface LuogoDto {
  chiave: string;
  ordine: number;
  tipo: TipoLuogo;
  nome: string;
  cosaOffre: string;
  quando: 'giorno' | 'sera' | 'entrambe' | null;
  /** I giorni della settimana in cui il luogo è attivo (migrazione 080, `giorni_json`); vuoto = nessuna limitazione. */
  giorni: GiornoChiave[];
  /** La frase generata dai giorni («giovedì, sabato e domenica»); vuota quando non c'è limitazione. */
  giorniTesto: string;
  sblocco: string | null;
  confidenti: Array<{ chiave: string; nome: string }>;
  /** Le attività della guida che si svolgono qui (`attivita.sede_chiave`, migrazione 072). */
  attivita: Array<{ chiave: string; nome: string }>;
  /** I negozi che hanno qui la loro sede (`negozio.sede_chiave`). */
  negozi: Array<{ chiave: string; nome: string }>;
  /** Il primo negozio della sede, per i collegamenti che ne vogliono uno solo; null se nessuno. */
  negozio: string | null;
  /** Riga della guida o dell'utente (migrazione 071). */
  origine: 'seed' | 'utente';
  piatti: Array<{ nome: string; prezzo: number | null; effetto: string }> | null;
  note: string | null;
  /** false = dato da fonte secondaria, non confermato sulla guida italiana. */
  verificato: boolean;
  /** La regola di **presenza** del luogo, quando ce n'è una scritta in `dati_guida` (voce `sblocco-luoghi`).
   *
   * `sblocco` qui sopra è la prosa della guida — «lettura del libro “Shitamachi rinato”» — e
   * nessuno la valutava: trentasette luoghi su ottantaquattro portavano una condizione che l'app
   * non guardava mai, e si vedevano tutti sempre. Questa è la stessa cosa nella forma che il
   * valutatore capisce. Null dove la guida non pone condizioni, o dove la condizione riguarda
   * l'**uso** e non l'esistenza (un lavoro che chiede Fascino 2: il posto c'è lo stesso). */
  condizioni: CondizioneSpilloDto[] | null;
  /** Se il luogo, al punto in cui è la partita, è già nel mondo. Null senza partita. */
  disponibilita: DisponibilitaDto | null;
  // ---- L5 «Luoghi, negozi, orari» (M §3.1): il luogo è la fonte. Il server li emette sempre; opzionali nel tipo finché il FE li legge ----
  /** Il quartiere del luogo (chiave e nome). */
  quartiere?: string;
  quartiereNome?: string;
  /** L'Area di L2 in cui sta il luogo, o null se è «da collocare». */
  area?: { slug: string; nome: string; casa: string } | null;
  /** Gli orari del luogo (`luogo.orari_json`), o la regola dell'app se la guida non ne dà (`origine: 'regola-app'`, R5-12c). */
  orari?: OrariDelLuogo;
  /** La frase degli orari (`descriviOrari`): «Solo di sera, dal giovedì alla domenica», o la regola dell'app. */
  orariTesto?: string;
  /** Sbloccato e aperto adesso, con la funzione unica `presenzaDelLuogo` (§2). */
  presenza?: PresenzaLuogoDto;
  /** La pagina del luogo: `/guida/luogo/<quartiere>/<luogo>`. */
  casa?: string;
  /** Il primo pin del luogo (per id), con la planimetria e la casa dell'area aperta sullo spillo; null se il luogo non è posizionato. */
  pin?: { spillo: number; mappa: string; casa: string } | null;
  /** Quanti altri pin ha il luogo (doppio pin, R5-16). */
  altriPin?: number;
  /** R5-20f: il luogo si visita solo negli eventi di quel Confidente (Sakura Residence → Futaba): mai nei menu né in «Luoghi qui». */
  soloEventiConfidente?: { chiave: string; nome: string } | null;
}

/**
 * La presenza di un luogo (L5 §2, funzione unica `presenzaDelLuogo` letta da tutte le viste): `sbloccato` (le sue condizioni di sblocco
 * nella partita) e `aperto` (gli orari del luogo, o l'eccezione del negozio, contro giorno, fascia e meteo della partita); null senza
 * partita. `testo` dice orari e stato: «Aperto adesso», «Chiuso adesso · apre giovedì sera», «Non ancora nel mondo».
 */
export interface PresenzaLuogoDto { sbloccato: boolean | null; aperto: boolean | null; testo: string }

/** La pagina di un luogo (L5 §4.1, `GET /api/compendio/luoghi/:quartiere/:luogo`): il luogo con tutto quel che sta lì. */
export interface LuogoDettaglioDto extends LuogoDto {
  /** Un listino per ogni negozio della sede, con articoli e acquisti della partita come nella pagina del negozio. */
  listini: NegozioDettaglioDto[];
  /** Le attività che si svolgono qui, intere. */
  attivitaDettaglio: AttivitaDto[];
  /** I Confidenti che si incontrano qui, con l'arcano e la pagina. */
  confidentiDettaglio: Array<{ chiave: string; nome: string; arcanaNome: string; casa: string }>;
  /** Tutti i pin del luogo, con la planimetria, la casa dell'area aperta sullo spillo e la nota propria del pin se diversa. */
  pins: Array<{ spillo: number; mappa: string; mappaNome: string; casa: string; notaPin: string | null }>;
  /** Riga della guida corretta dall'utente (c'è un `seed_json`). */
  modificato: boolean;
  /** Il testo dello sblocco generato dalla condizione (L6, `nomiCondizioni`); null se non ce n'è. */
  sbloccoTesto: string | null;
  /** L6: gli inviti dei Confidenti che aprono il luogo, con lo stato della partita se indicata (in OR con la condizione). */
  inviti?: InvitoDto[];
}

export interface QuartiereDettaglioDto {
  mappaChiave?:string;
  ingresso?:IngressoQuartiereDto|null;
  sbloccoData?:string|null;
  chiave: string;
  nome: string;
  /** Non più valorizzato (L11, migrazione 188): la frase della guida è nell'archivio, lo sblocco è `sbloccoCondizione`. */
  sblocco?: string | null;
  descrizione: string;
  fonte: string;
  luoghi: LuogoDto[];
  /** La mappa del quartiere ha un'immagine caricata nell'istanza (registrata su `immagine_chiave` o con la chiave della mappa). */
  mappa: boolean;
  /** L'illustrazione della mappa del quartiere, sotto la sagoma nell'intestazione (scelta dell'utente, 2026-10-20). */
  illustrazione: IllustrazioneDto;
  /** Le Aree del quartiere, nel loro ordine (L2). */
  aree: AreaRiassuntoDto[];
  /** L5: i luoghi del quartiere senza Area (da collocare con «Colloca»), con l'area proposta se la migrazione ne ha dedotta una. */
  luoghiDaCollocare?: Array<LuogoDto & { areaProposta: { slug: string; nome: string } | null }>;
  /** L6: lo sblocco strutturato, come nel riassunto («Modifica sblocco» e «Ripristina» dalla pagina del quartiere). */
  sbloccoCondizione?: SbloccoDto;
}

/** Fonte unica della guida di un'attività che introduce un Confidente. I semafori valutano soltanto i
 * requisiti del prossimo rango; giorni, fasce e avvertenze non costituiscono un calendario duplicato. */
export interface FonteConfidenteAttivitaDto {
  stato: 'collegato' | 'non-risolto' | 'conflitto';
  chiave: string;
  nome: string | null;
  arcana: string | null;
  arcanaNome: string | null;
  casa: string;
  disponibilitaFonte: { giorni: string[]; fasce: string[]; luogo: string; note: string } | null;
  avvio: RequisitiConfidenteDto['ranghi'][number] | null;
  rangoAttuale: number | null;
  prossimoPasso: { rango: number; requisiti: RequisitiConfidenteDto['ranghi'][number]['requisiti']; disponibilitaRequisiti: DisponibilitaDto | null } | null;
  dotiPerPassaggio: ConfidenteDettaglioDto['dotiIncontro'];
  campiIncompatibili: string[];
  avvisi: string[];
}

export interface AttivitaDto {
  pesca?: { regola: import('./pesca.js').RegolaPescaDto; ruolo: 'visita' | 'obiettivi' } | null;
  /** Assenti soltanto nei DTO precedenti alla135; il server corrente li emette sempre, anche null. */
  confidenteChiave?: string | null;
  fonteConfidente?: FonteConfidenteAttivitaDto | null;
  /** Identità soltanto per le attività che sono videogiochi; i turni restano legati all'attività. */
  catalogo?: RiferimentoOggettoDto | null;
  nomiAltri?: string[];
  notaPrezzo?: string | null;
  chiave: string;
  nome: string;
  tipo: 'mini-gioco' | 'lavoro' | 'studio' | 'lettura' | 'film' | 'dvd' | 'videogioco' | 'allenamento' | 'cibo' | 'sfida' | 'altro';
  luogo: string;
  luogoChiave: string | null;
  fascia: 'giorno' | 'sera' | 'entrambe' | null;
  costo: number | null;
  sblocco: string | null;
  /** Round richiesti per completare un videogioco; null per le altre attività. */
  sessioni: number | null;
  /** `dote` nulla = effetto su una Dote variabile/non confermata, spiegato in `condizione`. */
  doti: Array<{ dote: DoteChiave | null; note: number | null; condizione: string | null }>;
  /** Paga in yen a turno e massimo dichiarato (migrazione 075); solo per i lavori. */
  pagaYen: number | null;
  pagaMassima: number | null;
  /** Come funziona, premi, altri effetti e note sulle Doti, in un testo solo (migrazione 075). */
  dettagli: string | null;
  /** Gli effetti dichiarati (migrazione 074) e le loro frasi. */
  effetti: VoceEffettoDto[];
  effettiTesto: string[];
  /** Come la partita conta l'attività: per niente, per volte svolte o per sessioni. */
  tracciamento: 'nessuno' | 'svolta' | 'sessioni';
  /** R10-27/3: quante volte l'attività risulta svolta nella partita (solo se contata per volte e con una partita); assente altrimenti. */
  volteSvolte?: number;
  /** La guida del quiz (migrazione 105: i codici a barre del Triple Seven); null se l'attività non ne ha. */
  quiz: QuizAttivita | null;
  /** Il luogo della città dove si svolge (migrazione 072). */
  sedeChiave: string | null;
  sedeNome: string | null;
  /** Orari ereditati dalla sede, con origine dichiarata; null senza sede risolta. */
  orariSede?: OrariDelLuogo | null;
  orariSedeTesto?: string | null;
  verificato: boolean;
  /** La disponibilità scritta dalla guida, tradotta in regola (migrazione 052): «dal 18 aprile»,
   *  «dal 24 aprile», «5 giugno, evento con Ryuji». Null dove la guida non dice niente. */
  condizioni: CondizioneSpilloDto[] | null;
  /** Se la riga, al punto in cui è la partita, è già disponibile. Null senza partita. */
  disponibilita: DisponibilitaDto | null;
}

export interface LibroDto {
  catalogo?: RiferimentoOggettoDto | null;
  nomiAltri?: string[];
  notaPrezzo?: string | null;
  /** Solo nella risposta di un avanzamento: le Doti che il conseguimento dà (o toglie), da segnare nelle Doti. */
  daSegnare?: DoteDaSegnareDto[];
  chiave: string;
  nome: string;
  nomeIt: string | null;
  dove: string;
  prezzo: number | null;
  disponibileDal: string | null;
  dote: DoteChiave | null;
  note: number | null;
  sblocca: string | null;
  /** La **chiave del quartiere** che si apre finendolo, quando il libro ne apre uno: e' un
   *  riferimento, quindi la scheda ci puo' portare invece di limitarsi a nominarlo. */
  sbloccaLuogo: string | null;
  sbloccaLuogoNome: string | null;
  /** L6 (R6-11): i posti che leggerlo apre, **calcolati** dalle condizioni dei luoghi e dei quartieri che citano `lettura{libro}` (non
   *  dalla frase `sblocca`, che resta nota, né dall'effetto «sblocca-luogo»). Vuoto se non apre niente. */
  apre?: Array<Omit<PostoApertoDto, 'tipo'> & { tipo: 'luogo' | 'quartiere' }>;
  sessioni: number | null;
  dettagli: string | null;
  /** Gli effetti dichiarati (migrazione 074) e le loro frasi: la Dote che alza, che cosa apre. */
  effetti: VoceEffettoDto[];
  effettiTesto: string[];
  /** Dove si compra: gli articoli collegati al libro (migrazione 073), con il negozio e il prezzo. */
  negozi: Array<{ articolo: string; negozio: string; negozioNome: string; prezzo: number | null }>;
  verificato: boolean;
  /** Provenienze mappabili verificate; può essere vuoto quando il premio non ha un luogo fisico. */
  posizioni: Array<{ tipo: 'quartiere' | 'luogo' | 'negozio' | 'attivita'; chiave: string; etichetta: string }>;
  /** Numero di sessioni richieste, sempre almeno uno. */
  totaleSessioni: number;
  /** Sessioni registrate nella partita, fra zero e `totaleSessioni`. */
  progresso: number;
  /** Completamento canonico nella partita: non deriva dal solo progresso. */
  fatto: boolean;
  /** La disponibilità scritta dalla guida, tradotta in regola (migrazione 052): «dal 18 aprile»,
   *  «dal 24 aprile», «5 giugno, evento con Ryuji». Null dove la guida non dice niente. */
  condizioni: CondizioneSpilloDto[] | null;
  /** Se la riga, al punto in cui è la partita, è già disponibile. Null senza partita. */
  disponibilita: DisponibilitaDto | null;
}

export interface LibriDto {
  libri: LibroDto[];
  completati: number;
  sessioniFatte: number;
  sessioniTotali: number;
  /** «Lettura rapida» è già stato letto in questa partita, quindi ogni altro libro chiede metà
   *  sessioni (arrotondate per eccesso). Va detto a chi legge: senza, i totali calerebbero da soli
   *  fra una visita e l'altra e sembrerebbe un errore dell'app. */
  letturaRapida: boolean;
}

export interface FilmDto {
  catalogo?: RiferimentoOggettoDto | null;
  nomiAltri?: string[];
  notaPrezzo?: string | null;
  negozi?: LibroDto['negozi'];
  /** Solo nella risposta di un avanzamento: le Doti che la visione dà (o toglie), da segnare nelle Doti. */
  daSegnare?: DoteDaSegnareDto[];
  chiave: string;
  nome: string;
  nomeIt: string | null;
  dove: 'cinema' | 'dvd';
  dote: DoteChiave | null;
  note: number | null;
  /** Quanto vale rivederlo: al cinema la guida lo dichiara riga per riga. Vuoto = niente. */
  noteSuccessive: number | null;
  prezzo: number | null;
  dettagli: string | null;
  /** Gli effetti dichiarati (migrazione 074): la prima visione e, con `ripetuto`, quelle successive. */
  effetti: VoceEffettoDto[];
  effettiTesto: string[];
  verificato: boolean;
  posizioni: Array<{ tipo: 'quartiere' | 'luogo' | 'negozio' | 'attivita'; chiave: string; etichetta: string; ruolo: 'cinema' | 'noleggio' | 'visione' }>;
  /** Prima visione al cinema o sessioni necessarie a completare un DVD. */
  totaleSessioni: number;
  /** Visioni registrate; al cinema può superare `totaleSessioni`, per contare le rivisioni. */
  progresso: number;
  /** Almeno una visione/sessione registrata. */
  iniziato: boolean;
  /** Fruizione completata: una visione al cinema o tutte le sessioni richieste da un DVD. */
  fatto: boolean;
  /** La disponibilità scritta dalla guida, tradotta in regola (migrazione 052): «dal 18 aprile»,
   *  «dal 24 aprile», «5 giugno, evento con Ryuji». Null dove la guida non dice niente. */
  condizioni: CondizioneSpilloDto[] | null;
  /** Se la riga, al punto in cui è la partita, è già disponibile. Null senza partita. */
  disponibilita: DisponibilitaDto | null;
}

export interface FilmDvdDto {
  film: FilmDto[];
  iniziati: number;
  completati: number;
  /** Sessioni utili al completamento, senza contare le rivisioni eccedenti al cinema. */
  sessioniCompletamentoFatte: number;
  sessioniObiettivo: number;
  /** Tutte le visioni registrate, comprese le rivisioni al cinema. */
  visioniRegistrate: number;
}

export interface VideogiocoDto extends AttivitaDto {
  catalogo?: RiferimentoOggettoDto | null;
  /** Solo nella risposta di un avanzamento: le Doti che il gioco completato dà (o toglie), da segnare nelle Doti. */
  daSegnare?: DoteDaSegnareDto[];
  tipo: 'videogioco';
  /** Dove si compra: gli articoli collegati (migrazione 073). */
  negozi: Array<{ articolo: string; negozio: string; negozioNome: string; prezzo: number | null }>;
  totaleRound: number;
  progresso: number;
  iniziato: boolean;
  /** Compatibilità dei DTO precedenti: il server attuale lo emette sempre. Non conta i round. */
  sessioneDichiarata?: boolean;
  fatto: boolean;
}

export interface VideogiochiDto {
  videogiochi: VideogiocoDto[];
  iniziati: number;
  completati: number;
  roundFatti: number;
  roundObiettivo: number;
}

export type TipoLettura = 'libro' | 'film' | 'videogioco';

export interface AttivitaTutteDto {
  attivita: AttivitaDto[];
  lavori: AttivitaDto[];
  libri: LibroDto[];
  film: FilmDto[];
  libriLetti: number;
  /** Titoli con almeno una sessione/visione registrata, anche se non ancora completati. */
  filmVisti: number;
  /** Le note comuni a una categoria di attività, per chiave di categoria (oggi `videogioco`): da mostrare una volta sopra l'elenco. */
  noteCategorie?: Record<string, string>;
}

// ---- Aiuto in battaglia (Fase 7.3) ----

export interface OmbraDto {
  dungeonChiave: string;
  dungeon: string;
  area: string | null;
  areaChiave: string | null;
  /** Nome dell'Ombra come appare in battaglia (italiano), se noto. */
  ombra: string | null;
  /** Nome della Persona/maschera come riportato dalla guida. */
  persona: string | null;
  livello: number | null;
  debolezze: string[];
  resistenze: string[];
  personalita: string | null;
  fonte: string;
  personaCollegata: PersonaDellaMascheraDto | null;
}

export type TrattoOmbra = 'giocosa' | 'timida' | 'irritabile' | 'cupa';
export type EsitoRisposta = 'buona' | 'passabile' | 'cattiva';

export interface NegoziazioneDomandaDto {
  domanda: string;
  risposte: Array<{
    testo: string;
    /** `incerto`: nemmeno la fonte l'ha verificato. */
    verdetti: Array<{ esito: EsitoRisposta; tratto: TrattoOmbra; incerto?: boolean }>;
  }>;
}

export interface BattagliaDto {
  fonti: { principale: string; note: string };
  sistema: { urlFonte: string; avvioScontro: string; comandi: string[]; esitiColpo: { debole: string; critico: string; tecnico: string; block: string; resiste: string }; unoMore: string; statiAlterati: Array<{ stato: string; effetto: string }>; notaFineBattaglia: string };
  assaltoEHoldUp: { urlFonte: string; rapina: string; assalto: string; holdUp: string };
  tecnico: { urlFonte: string; stati: Array<{ stato: string; elementi: string[] }> };
  staffetta: { urlFonte: string; cosaE: string; disponibilita: string; effetto: string; livelli: string; indicatoriVisivi: string; ranghi: Array<{ rango: number; bonus: string }>; moltiplicatori: string; effettoSpeciale: string };
  speciali: { urlFonte: string; meccanica: string; attivazione: string; proprietaDanno: string; elenco: Array<{ nome: string; personaggi: string[]; sblocco: string }> };
  negoziazione: {
    urlFonti: string[]; quandoSiPuoNegoziare: string; opzioniHoldUp: Array<{ opzione: string; effetto: string }>; comeVerificarePersonalita: string;
    personalita: Array<{ nome: string; descrizione: string; risposteEfficaci: string[]; risposteDaEvitare: string[] }>; regole: string[]; incertezze: string;
    /** Da dove vengono le domande e come sono state rese in italiano (migrazione 083). */
    fonteDomande?: { titolo: string; autori: string[]; url: string; urlOriginale: string; nota: string };
    /** Le domande dell'Ombra con, per ogni risposta, il verdetto di ciascuna personalità: una
     *  risposta può essere buona per un carattere e cattiva per un altro. Una personalità che non
     *  compare fra i verdetti non è indifferente: non è stata verificata. */
    domande?: NegoziazioneDomandaDto[];
  };
  ombreSciagura: { nomeOriginale: string; urlFonte: string; cosaSono: string; comeRiconoscerle: string; caratteristiche: string[]; comportamentoInBattaglia: { turnoProprio: string; quandoAttaccate: string; comeNeutralizzarle: string }; effettiStati: { immobilizzanti: string[]; soggiogamento: string; furia: string }; esplosioneAllaSconfitta: { descrizione: string; potenza: string; eccezioni: string }; ricompense: string; doveCompaiono: string; elenco: string[] | null; incertezze: string };
  mietitore: { categoria: string; urlFonte: string; dove: string; comeSiManifesta: string; livelloConsigliato: string; abilita: string[]; immunita: string[]; debolezze: string[] | null; strategia: string[]; ricompense: string };
  demoniTesoro: { categoria: string; urlFonte: string; cosaSono: string; comeCompaiono: string; primaComparsa: string; comportamento: string; resistenzeGenerali: string; tecnicheConsigliate: string[]; elenco: Array<{ nome: string; livello: number; arcano: string; dove: string }> };
  ombre: OmbraDto[];
}

// ---- Richieste dei Mementos e Jose (Fase 7.2) ----

export type StatoRichiesta = 'accettata' | 'completata';

export interface RichiestaDto {
  /** I testi storici restano in `ricompense`; questi sono i legami per chiave. */
  oggettiRicompensa?: RicompensaOggettoDto[];
  chiave: string;
  nome: string;
  committente: string;
  disponibileDal: string;
  scadenza: string;
  area: string;
  areaChiave: string | null;
  piano: string;
  bersaglio: { nome: string; livello: number | null; formaDemoniaca: string; debolezze: string[]; resistenze: string[]; vulnerabileConfusione: boolean };
  ricompense: string[];
  confidente: { chiave: string; nome: string; rango: number | null } | null;
  /** Il dedalo dei Memento (`dungeon_area`) in cui si svolge, e la sua posizione nel percorso. */
  areaNome: string | null;
  areaOrdine: number | null;
  /** L'area del dedalo in cui sta la Richiesta (099: è un elemento di quell'area) e il suo nome; null = da collocare. */
  areaDedalo: string | null;
  areaDedaloNome: string | null;
  note: string;
  fonte: string;
  stato: StatoRichiesta | null;
}

export interface JoseDto {
  introduzione: string;
  fiori: { descrizione: string } | string | null;
  timbri: { descrizione: string } | string | null;
  bossSegreto: { nome: string; condizione: string } | null;
  scambi: Array<{ nome: string; effetto: string; costo: number | string; requisito: string }>;
  /** Dopo M7 è il listino corrente L5; null se rimosso/nascosto. Assente soltanto prima della conversione. */
  listino?: NegozioDettaglioDto | null;
}

export interface RichiesteDto {
  richieste: RichiestaDto[];
  jose: JoseDto | null;
  /** I dedali che hanno richieste, nell'ordine di percorrenza, con i conteggi. */
  dedali: Array<{ chiave: string; nome: string; ordine: number; totale: number; completate: number }>;
  completate: number;
  totale: number;
  /** Dove si può mettere una Richiesta (modulo, 2026-10-11): tutti i dedali dei Memento, in ordine, con le loro aree (099). */
  collocazioni: Array<{ chiave: string; nome: string; aree: Array<{ chiave: string; nome: string }> }>;
}

/** Chi cita una Richiesta, detto prima di eliminarla (scelta dell'utente, 2026-10-11: «Si elimina e si avvisa»). */
export interface CitazioniRichiestaDto {
  /** Quante partite ne hanno segnato uno stato (se ne vanno con lei). */
  partite: number;
  /** I pin che la indicano (perdono il collegamento). */
  pin: string[];
  /** Le righe con una condizione che la cita («Libro: …», «Pin: …»): restano, da correggere. */
  condizioni: string[];
  /** I requisiti dei Confidenti che la citano («Futaba Sakura, rango 7»): restano, da correggere. */
  requisiti: string[];
  /** Le azioni della giornata (`voce_giornata`) che la indicano (perdono il collegamento). */
  azioni: number;
}

// ---- Dungeon: Palazzi e Dedali (Fase 7.1) ----

export type StatoPunto = 'ottenuto' | 'esaurito';

export interface PuntoInteresseDto {
  contenuto?: ContenutoOggettoDto[];
  chiave: string;
  ordine: number;
  tipo: 'sicura' | 'porta' | 'meccanismo' | 'forziere' | 'forziere-chiuso' | 'volonta' | 'puzzle' | 'miniboss' | 'boss' | 'ombra-sciagura' | 'persona' | 'oggetto' | 'scorciatoia' | 'storia' | 'trama' | 'altro';
  nome: string;
  descrizione: string;
  esauribile: boolean;
  dettagli: Record<string, unknown>;
  fonte: string;
  /** Stato nella partita (null = da gestire o senza partita). */
  stato: StatoPunto | null;
  /** I pin delle planimetrie collegati al punto (2026-10-01): lo stato del punto è il loro. Vuoto = non collegato. */
  pin: PinDelPuntoDto[];
  /** L'Enigma di cui la voce è un passo (095), o null. I passi stanno nella stessa area, ordinati fra loro; l'Enigma che ne ha
   *  è risolto quando i passi che si segnano sono tutti fatti, e non ha pin suoi. */
  contenitore: string | null;
  /** L'area del dedalo a cui la voce appartiene (099), o null fuori dai Memento. Nelle aree dei dedali ogni voce ha uno stato
   *  e conta per il completamento dell'area. Una Persona di un dedalo non ha un'area sola (null): le sue sono `areeDedalo`. */
  areaDedalo: string | null;
  /** Per una voce «Persona»: la Persona del compendio della sua maschera (`dettagli.maschera`), per l'immagine e la scheda
   *  (2026-10-11); null se la maschera manca o il compendio non la conosce, e per gli altri tipi. */
  persona: PersonaDellaMascheraDto | null;
  /** Per una Persona di un dedalo (migrazione 101): le aree del dedalo in cui si incontra, in ordine di area (una Persona sta in
   *  più aree; la sua `areaDedalo` è null). Vuoto per le altre voci. */
  areeDedalo: string[];
  /** L8 (B6): per una voce Persona collegata a un'Ombra, l'Ombra; `catturabile` falso (Babau/Bugs) = l'incontro non espone il gesto di cattura. Assente per le altre voci. */
  ombra?: { chiave: string; nome: string; catturabile: boolean };
  // ---- L4 «Avanzamento unico» (§3.1): presenti per le voci dei Palazzi, assenti per i dedali dei Memento (risposta invariata, R4-30) ----
  /** Il carattere effettivo (la scelta dell'utente o la regola, `shared/caratteriVoce.ts`); null per le Persona (L8). Con L4 `stato` è
   *  lo stato con cui la voce risulta: per una permanente anche da un'altra voce del suo oggetto (fatta nella 2 → fatta nella 4). */
  carattere?: CarattereVoce | null;
  /** Vero se il carattere l'ha scelto l'utente («Ripristina» lo riporta alla regola). */
  carattereScelto?: boolean;
  /** La chiave dell'oggetto permanente (la chiave minima delle sue voci) se la voce ne divide uno con altre voci, altrimenti null. */
  oggetto?: string | null;
  /** Vero se nella partita la voce ha un pin fatto «da verificare» (divergenza conservata dalla migrazione utente 022). */
  daVerificare?: boolean;
  /** §8.11: per una voce permanente o rigenerabile con pin, quanti dei suoi pin sono fatti (k/N, «In corso · 2/8»); null per una voce
   *  senza pin o senza partita. Il segno di ogni pin sta in `pin[].fatto`. */
  avanzamento?: AvanzamentoVoceDto | null;
  /** §8.11: le altre voci che condividono un suo pin (per i pin condivisi dai rigenerabili, nella stessa infiltrazione): quelle che
   *  «Segna» può segnare e «Riapri» riapre — l'interfaccia le elenca nella conferma («Riapre anche: …»). */
  condivise?: VoceDelGestoDto[];
  /** §8.11: solo nella risposta del gesto sulla voce (`PUT /api/partite/:id/punti`): le altre voci segnate o riaperte. */
  effetti?: EffettiDelGestoDto;
  /** §8.15 punto 6: solo nelle risposte di collegamento e modifica della voce (`PUT /api/compendio/punti/:k/pin/:id`,
   *  `PUT /api/compendio/punti/:k`), quando un pin nuovo di una voce già fatta ha preso il segno: in quale partita, quale pin, di quale voce
   *  (la voce resta fatta). Assente se nessuno. */
  segniAggiunti?: Array<{ partita: number; pin: number; voce: string }>;
  /** L3 «planimetria della voce»: la planimetria su cui sta la voce di un Palazzo, con la regola unica (dai pin; senza pin l'aggancio a
   *  mano; senza aggancio la planimetria 1 della sua infiltrazione; un Enigma con passi quella del primo passo). `aMano` vero se è
   *  l'aggancio scelto dall'utente. Null se non se ne trova nessuna; assente per le voci dei Memento. */
  planimetria?: PlanimetriaDellaVoceDto | null;
}

/** La planimetria di una voce (L3): chiave pubblica e nome con il percorso; `aMano` se l'ha scelta l'utente. */
export interface PlanimetriaDellaVoceDto { chiave: string; nome: string; aMano: boolean }

/**
 * `GET /api/mappe/:chiave/guida` (L3, «planimetria della voce»): le voci della guida che stanno sulla planimetria, cioè quelle con almeno
 * un pin su di lei e quelle senza pin la cui planimetria (aggancio a mano o planimetria 1) è lei; un Enigma se c'è almeno uno dei suoi
 * passi. Raggruppate per infiltrazione (nell'ordine delle infiltrazioni) e poi per ordine, con lo stato della partita se indicata.
 */
export interface GuidaDellaPlanimetriaDto {
  /** Chiave pubblica della planimetria. */
  mappa: string;
  /** Il Palazzo della planimetria, o null fuori dai Palazzi. */
  palazzo: string | null;
  infiltrazioni: Array<{ chiave: string; nome: string; ordine: number; voci: PuntoInteresseDto[] }>;
}

/** La Persona del compendio che corrisponde a una maschera scritta dalla guida: id della scheda, nome canonico (per l'immagine)
 *  e nome italiano. */
export interface PersonaDellaMascheraDto { id: number; nome: string; nomeIt: string }

/** Un pin di una planimetria collegato a un punto della guida. */
export interface PinDelPuntoDto { id: number; nome: string; tipo: string; mappa: string; mappaNome: string;
  /** L3: l'identità stabile del pin (per centrarlo nel visore); null per un pin che non l'ha ancora. */
  uid?: string | null;
  /** §8.11: per le voci dei Palazzi con la partita, il segno del pin letto per la voce (un pin condiviso dai rigenerabili, nella sua
   *  infiltrazione). Assente senza partita e per i dedali. */
  fatto?: boolean }

/** Una voce della guida che si può collegare a un pin dall'editor delle mappe (098): del Palazzo del pin, da segnare, non ancora sua. */
export interface VoceCollegabileDto { chiave: string; nome: string; tipo: string; area: string; areaNome: string; /** L'Enigma di cui è un passo, o null. */ enigma: string | null }

export interface AreaDungeonDto {
  chiave: string;
  ordine: number;
  nome: string;
  descrizione: string;
  /** L8 (B7): per il dedalo in cui è confluito un Palazzo (Iweleth), le sue planimetrie come archivio in sola lettura. Assente per gli altri dedali (la loro risposta non cambia). */
  archivio?: ArchivioDelPalazzoDto;
  // `mappa: boolean` (un'immagine caricata con la chiave dell'infiltrazione, la vecchia «pianta pubblicata dalla guida», tolta il
  // 2026-09-18) è uscito col lotto L1 (2026-10-20): nessuna vista lo leggeva più, e l'immagine di un posto è quella delle sue
  // planimetrie, dal risolutore unico (`immagineMappa.ts`).
  /** Le planimetrie native dell'atlante legate a quest'area (i legami `infiltrazione_area`), in ordine.
   *
   * Servono alla scheda del Palazzo per **mostrare la mappa invece di un rimando**. L'area della
   * guida non è un nodo dell'atlante — il risolutore, interrogato sulla sua chiave, risponde
   * «contenuto di guida» — quindi chiedergli la mappa dell'area dava sempre niente, e sulla scheda
   * al posto del visore compariva un riquadro vuoto con dentro un collegamento. Il legame però
   * c'è ed è dichiarato: 72 aree su 116 hanno una planimetria nativa. Qui viene esposto, così la
   * scheda la monta. Vuoto per le aree che non ne hanno (i piani dei Memento, per esempio). */
  mappe: Array<{ chiave: string; nome: string; /** Quanti collezionabili ha la mappa e quanti sono raccolti (null senza partita). */ n: number; presi: number | null; spilli: SpilloRaccoltaDto[];
    /** L3: la chiave dell'Area del Palazzo della planimetria. Da L3 le planimetrie di un'infiltrazione sono tutte quelle delle sue
     *  aree (`infiltrazione_area.ordine`, poi `versione_ordine`). */
    area?: string }>;
  /** L3: le Aree del Palazzo che l'infiltrazione tocca, in ordine, con la versione da aprire (null = la predefinita). Il server lo
   *  manda per ogni infiltrazione di un Palazzo; per i dedali dei Memento è **assente**, come `mappe[].area` (la risposta dei Memento
   *  resta quella di prima, R3-12, NR3-1). */
  areePalazzo?: Array<{ chiave: string; slug: string; nome: string; planimetriaIniziale: string | null }>;
  punti: PuntoInteresseDto[];
  /** Solo per i dedali dei Memento: le aree del dedalo con i loro elementi e il completamento (099); null per i Palazzi. */
  dedalo: DedaloDto | null;
  /** L4 (§1.5): gli oggetti permanenti delle sue voci e quanti fatti; `completata` con la regola unica (senza niente da contare mai,
   *  R4-22). Null senza partita. Per i Palazzi; assente per i dedali dei Memento. */
  completamento?: { oggetti: number; fatti: number | null; completata: boolean | null };
}
/** Un collezionabile di una planimetria (forziere, seme, tesoro…) con il suo stato nella partita. */
export interface SpilloRaccoltaDto {
  id: number;
  uid: string;
  tipo: string;
  nome: string;
  colore: string;
  /** null senza partita. */
  raccolto: boolean | null;
}

/** Una Richiesta come elemento di un'area del dedalo (o da collocare), con il suo stato nella partita. */
export interface RichiestaDelDedaloDto { chiave: string; nome: string; stato: StatoRichiesta | null }

/**
 * Un'area di un dedalo dei Memento (099, richiesta dell'utente del 2026-10-11): nome, dettagli e i suoi elementi — le voci della
 * guida (in `AreaDungeonDto.punti`, con `areaDedalo` uguale a questa chiave), le Richieste e i timbri. Completata quando tutti
 * i suoi elementi lo sono; un'area senza elementi è completata (scelta dell'utente).
 */
export interface AreaDedaloDto {
  chiave: string;
  ordine: number;
  nome: string;
  descrizione: string;
  /** I timbri dell'area, o null se l'area non ne ha; `raccolti` null senza partita. */
  timbri: { totale: number; raccolti: number | null } | null;
  richieste: RichiestaDelDedaloDto[];
  /** totale = voci + Richieste + timbri (uno per timbro, scelta dell'utente); fatti null senza partita. */
  elementi: { totale: number; fatti: number | null };
  /** null senza partita. */
  completata: boolean | null;
}

/** Un dedalo dei Memento (099): le sue aree, le Richieste ancora da collocare in un'area, il conteggio e il completamento. */
export interface DedaloDto {
  aree: AreaDedaloDto[];
  /** Le Richieste del dedalo senza area (la loro area è stata eliminata): si vedono, non contano finché non si collocano. */
  daCollocare: RichiestaDelDedaloDto[];
  /** La somma degli elementi delle aree; fatti null senza partita. */
  obiettivi: { totale: number; fatti: number | null };
  /** Completato quando tutte le sue aree lo sono (un dedalo senza aree lo è); null senza partita. */
  completato: boolean | null;
}

export interface DungeonRiassuntoDto {
  /** L6: presenza sulla metro valutata nel server (finestra e Palazzo concluso); senza partita è vero. */
  disponibile?: boolean;
  chiave: string;
  tipo: 'palazzo' | 'mementos';
  ordine: number;
  nome: string;
  sovrano: string;
  arcanaSovrano: string;
  arcanaSovranoNome: string;
  date: { sblocco: string; scadenza: string; furtoConsigliato: string };
  /** La finestra in cui il Palazzo esiste, in MM-GG del calendario di gioco. `date` qui sopra è
   *  prosa — «12 Aprile (Martedì) – prima infiltrazione» — e da una frase non si ricava una data
   *  senza sbagliarne qualcuna in silenzio: questa viene dalla voce `finestre-dungeon` di `dati_guida`, trascritta a
   *  mano una volta. Serve a mostrare il Palazzo sulla mappa **solo quando c'è**. `al` manca dove
   *  il gioco non fissa una scadenza: Iweleth e i Memento, una volta aperti, restano. */
  finestra: { dal: string; al: string | null } | null;
  livelloConsigliato: string;
  aree: number;
  punti: number;
  esauribili: number;
  /** Punti con uno stato nella partita (null senza partita). */
  gestiti: number | null;
  /** La raccolta sulle planimetrie: i collezionabili (`spillo.collezionabile`) di tutte le mappe del
   *  Palazzo e quanti ne ha presi la partita. Per i Memento i totali sono gli obiettivi dei dedali
   *  (timbri dichiarati + richieste). `presi` e `mappeComplete` sono null senza partita. */
  raccolta: { totale: number; presi: number | null; mappe: number; mappeComplete: number | null };
  /** Il Palazzo completato nella partita, col perché («Tesoro, boss finale e tutti gli oggetti permanenti (n/n)»; null per i
   *  Memento: `palazziService.statoPalazzi`); null se non lo è o senza partita. Dal 2026-10-20 (§8.10) vale solo per l'anello, la
   *  percentuale e il segno «Completato»: gli effetti seguono `concluso`. */
  completato: string | null;
  /** Il Palazzo concluso nella partita (§8.10, decisione dell'utente del 2026-10-20), col perché («Tesoro e boss finale»); null se
   *  non lo è o senza partita. Governa gli effetti: sulla mappa di Tokyo un Palazzo concluso non c'è più, come nel gioco dopo il furto,
   *  e il suo ingresso è chiuso. Per i Palazzi; assente per i Memento (AP4-1, R4-30). */
  concluso?: string | null;
  /** Dove si atterra toccando il Palazzo sulla mappa di Tokyo, per il giorno della partita (senza partita, o senza data: la
   *  regola che vale sempre): la prima regola di `dungeon_atterraggio` che lo copre (2026-10-04); L6 (R6-17) senza una regola che lo
   *  copra, l'ingresso del Palazzo (`destinazionePalazzo`, la stessa del diario). Null se il Palazzo non ha mappe. */
  atterraggio: { mappa: string; spillo: number | null } | null;
  /** L4 (§1.5): il completamento con la funzione unica — oggetti permanenti, Tesoro, boss finale (`shared/completamentoGuida.ts`); i
   *  campi della partita null senza partita. Per i Palazzi; assente per i Memento. `raccolta` resta l'elenco dei collezionabili, con lo
   *  stato del pin di L4. */
  completamento?: CompletamentoPalazzo;
  /** L4: quante divergenze «da verificare» ha il Palazzo nella partita (null senza partita). Per i Palazzi; assente per i Memento. */
  daVerificare?: number | null;
  /** L4 §8.14: la voce del boss finale dichiarata del Palazzo («Modifica › Boss finale»); null = nessuna (il Palazzo non si conclude).
   *  Per i Palazzi; assente per i Memento. */
  voceBossFinale?: { chiave: string; nome: string } | null;
  /** L4 §8.14: la voce del boss finale è stata cambiata dall'utente («Ripristina» la riporta a quella della guida). */
  bossFinaleCorretto?: boolean;
  /** L4 §8.15: la regola del boss del Palazzo — `voce-finale` (la voce dichiarata, «Modifica › Boss finale») o `memento` (il boss segnato
   *  nella Guida, come nei Memento, senza effetti di Palazzo: Iweleth). Per i Palazzi; assente per i Memento. */
  regolaBoss?: 'voce-finale' | 'memento';
  /** L4 (condizione del PM sulla 112): il Palazzo ha la regola della voce del boss finale ma nessuna voce dichiarata, quindi non si conclude:
   *  la scheda lo segna «Boss finale da dichiarare» («da verificare», porta a «Modifica › Boss finale») ed entra nell'elenco unico «da
   *  rivedere» (L11 R11-10c). Per i Palazzi; assente per i Memento. */
  bossFinaleDaDichiarare?: boolean;
}

/** L4 (§3.1): una divergenza conservata «da verificare» — un pin fatto con una sua voce non fatta, da prima dell'aggiornamento. */
export interface DivergenzaDto {
  /** Id del pin, e il suo uid (chiave della divergenza). */
  spillo: number;
  spilloUid: string;
  spilloNome: string;
  /** La planimetria del pin (chiave pubblica) e il suo nome. */
  mappa: string;
  mappaNome: string;
  /** La voce non fatta e la sua infiltrazione. */
  voce: string;
  voceNome: string;
  infiltrazione: string;
  infiltrazioneNome: string;
  /** Quando la migrazione l'ha rilevata. */
  rilevataIl: string;
}

/** L4 (§2.3, §4.3): una scheda della guida senza mappa e senza voce (i dati di prima): «Schede da sistemare» della scheda del Palazzo,
 *  con «Crea la voce» o «Collega a una voce». Mai cancellata senza cestino. */
export interface SchedaDaSistemareDto { id: number; nome: string; descrizione: string; tipo: string; infiltrazione: string; infiltrazioneNome: string; posizione: { x: number; y: number } | null }

/** L4 (§3.2): un gruppo di copie di una voce secondo la regola dell'utente (R4-15: stesso testo, stessi pin, stessa infiltrazione). */
export interface GruppoCopieDto { infiltrazione: string; voci: Array<{ chiave: string; nome: string; ordine: number }>; pin: number[] }

/**
 * Una regola di atterraggio di un Palazzo (2026-10-04): quando vale e dove si atterra toccandolo sulla mappa di Tokyo. Le regole
 * si provano nell'ordine dell'elenco; vale la prima che copre il giorno della partita.
 */
export interface AtterraggioPalazzoDto {
  /** Inizio, in MM-GG del calendario di gioco; null con `al` null = vale sempre (l'accesso standard). */
  dal: string | null;
  /** Fine compresa, in MM-GG; uguale a `dal` per un giorno solo; null = da `dal` in poi. */
  al: string | null;
  /** La planimetria del Palazzo dove si atterra (chiave pubblica, quella degli URL). */
  mappa: string;
  /** Il nome della planimetria, per l'elenco. */
  mappaNome: string;
  /** Il pin d'arrivo su cui centrarla, o null. */
  spillo: number | null;
  /** Il nome del pin d'arrivo, o null. */
  spilloNome: string | null;
}

/**
 * L8 (B7, R8-16): l'archivio del «Palazzo» di Iweleth dentro il suo dedalo. Le planimetrie del Palazzo si consultano da qui, in sola lettura, per
 * l'area del dedalo a cui appartengono (`mappa_dedalo`); quelle senza un'area certa (Corridoi IV e V) stanno in fondo, dichiarate.
 */
export interface ArchivioDelPalazzoDto {
  /** Il dungeon che confluisce (la riga tecnica `iweleth`) e il suo nome. */
  dungeon: string;
  nome: string;
  planimetrie: Array<{ chiave: string; nome: string; areaDedalo: string | null; areaNome: string | null; nota: string }>;
  /** Quante voci del Palazzo sono diventate Trama del dedalo e quante Persona doppie puntano alla voce del dedalo (nessuna si perde). */
  voci: { convertite: number; doppie: number };
}

export interface DungeonDettaglioDto extends Omit<DungeonRiassuntoDto, 'aree'> {
  /** L8 (B7): questa scheda è l'archivio di un dedalo dei Memento (Iweleth): la pagina porta al dedalo. */
  confluisceIn?: { dungeon: string; dedalo: string; nome: string };
  note: string;
  fonti: string[];
  aree: AreaDungeonDto[];
  /** Tutte le planimetrie del Palazzo (l'albero sotto `dungeon-<chiave>`, radice esclusa) nel loro
   *  ordine logico, con i collezionabili di ognuna e le aree della guida che contiene (i legami `infiltrazione_area`,
   *  in ordine di guida: una planimetria può contenerne più d'una, 2026-09-29; un'area può stare su più
   *  planimetrie, 2026-10-04). Le planimetrie senza collezionabili ci sono lo stesso, perché è da qui che si
   *  ordinano, si legano e si cancellano. Vuoto per i Memento, che contano gli obiettivi dei dedali. */
  planimetrie: Array<{ chiave: string; nome: string; ordine: number; aree: Array<{ chiave: string; nome: string; ordine: number }>; n: number; presi: number | null; spilli: SpilloRaccoltaDto[];
    /** L3: la chiave dell'Area del Palazzo e l'etichetta della versione; da L3 `aree` (le infiltrazioni) sono quelle dell'Area. */
    area?: string | null; versioneEtichetta?: string | null;
    /** L4 (§1.5): gli oggetti permanenti con un pin su questa planimetria (senza niente da contare è completata). */
    completamento?: { oggetti: number; fatti: number | null; completata: boolean | null } }>;
  /** L3: le Aree del Palazzo (tabella `area`), nell'ordine della colonna, con infiltrazioni e raccolta. Il server lo manda per ogni
   *  Palazzo; per i Memento è **assente** (la risposta resta quella di prima, R3-12, NR3-1). */
  areePalazzo?: AreaRiassuntoDto[];
  /** Le regole di atterraggio dalla mappa di Tokyo, nell'ordine in cui si provano (2026-10-04). */
  atterraggi: AtterraggioPalazzoDto[];
  /** L'illustrazione caricata sulla radice `dungeon-<chiave>`, sotto lo stemma nell'intestazione (scelta dell'utente, 2026-10-20). */
  illustrazione: IllustrazioneDto;
  /** Le Persona registrate nel compendio della partita (id): nei Memento sono le «catturate», in ogni area e in ogni dedalo
   *  (scelte dell'utente, 2026-10-12). null senza partita. */
  personeCatturate: number[] | null;
  /** L4 (§2.3, §4.3): le schede senza mappa né voce del Palazzo, da sistemare. Per i Palazzi; assente per i Memento. */
  schedeDaSistemare?: SchedaDaSistemareDto[];
}

// ---- Calendario di gioco (Fase 6.3) ----

export interface GiornoCalendarioDto {
  data: string;
  giornoSettimana: string;
  meteo: string | null;
  eventi: Array<{ id: number; tipo: 'storia' | 'scadenza' | 'sblocco' | 'esame' | 'festa' | 'vacanza' | 'consiglio' | 'meteo'; titolo: string; dettaglio: string; fonte: string;
    /** Le voci del Diario collegate all'evento (L9 R9-20): un collegamento per chiave, non una voce dell'evento. */
    voci: Array<{ uid: string; giorno: string; fascia: 'giorno' | 'sera'; azione: string; certezza: 'C' | 'D' }>;
    /** R11-15/1: dato proprio del Calendario (feste, trama, consigli, sblocchi «rango massimo»): si corregge con `/api/correzioni/evento-calendario/:id`. Gli altri si correggono dalla loro fonte. */
    modificabile: boolean;
    /** Corretto dall'utente: ha un valore della guida da rimettere. */
    modificato: boolean }>;
  tempoLibero: { giorno: boolean; sera: boolean } | null;
  /** Numero della «Soluzione per settimana» della guida. */
  settimana: number | null;
  /** Le allerte del gioco del giorno: il tag nel calendario (2026-10-12). */
  allerte: AllertaGiornoDto[];
}

export interface SettimanaGuidaDto {
  numero: number;
  titolo: string;
  periodo: string;
  url: string;
  riassunto: string;
  incertezze: string;
}

export interface CalendarioDto {
  giorni: GiornoCalendarioDto[];
  settimane: SettimanaGuidaDto[];
  dataGioco: string | null;
  oggi: GiornoCalendarioDto | null;
  prossimeScadenze: Array<{ data: string; tipo: string; titolo: string; dettaglio: string; giorniMancanti: number }>;
  /** Mesi presenti («MM»), in ordine di anno scolastico. */
  mesi: string[];
}

// ---- Storico (Fase 5.1) ----

export interface EventoPartitaDto {
  id: number;
  tipo: string;
  /** Etichetta italiana del tipo e gruppo per i filtri. */
  tipoNome: string;
  gruppo: 'partita' | 'doti' | 'confidenti' | 'persona' | 'velluto' | 'obiettivi' | 'dungeon';
  titolo: string;
  dettaglio: string;
  dati: Record<string, unknown>;
  /** Riferimenti espliciti del log, mai conteggi: eliminare un evento non annulla il fatto. */
  acquistoRegistrato?: { id: string; fonteId: string | null; operazioneId: string | null; presente: boolean; fontePresente: boolean | null };
  personaId: number | null;
  personaNome: string | null;
  personaNomeIt: string | null;
  createdAt: string;
}

export interface StoricoDto {
  eventi: EventoPartitaDto[];
  /** Cursore (`prima`) per la pagina successiva, null se non ci sono altri eventi. */
  prossimo: number | null;
  /** Totale degli eventi che soddisfano il filtro. */
  totale: number;
}

// ---- Immagini ----

export interface ImmagineDto {
  id: number;
  ambito: string;
  chiave: string;
  mime: string;
  byte: number;
  url: string;
  createdAt: string;
  /** Indirizzo da cui l'immagine è stata scaricata (import da URL, piante delle guide); null per i file caricati. */
  origineUrl: string | null;
}

// ---- Mappe a livelli e spilli (Fase 13) ----

/** Che cosa è l'immagine di una mappa. È un dato dichiarato, non una deduzione dal percorso
 * dell'asset o dalle sue dimensioni, che frontend e backend leggevano in modo diverso.
 *
 *   planimetria-nativa        pianta estratta dal gioco
 *   illustrazione-editoriale  mappa disegnata per l'applicazione: si consulta e porta spilli
 *   emblema                   stemma del Palazzo: identifica il luogo, non lo rappresenta
 *   nessuna                   la mappa non ha immagine propria
 */
export const RUOLI_IMMAGINE = ['planimetria-nativa', 'illustrazione-editoriale', 'emblema', 'nessuna'] as const;
export type RuoloImmagine = (typeof RUOLI_IMMAGINE)[number];

/**
 * I pin contati nei tre gruppi dell'indice delle Mappe (E2 di L3, decisione dell'utente): `contenuto` sono i pin veri e propri (le cose
 * del gioco), `passaggi` e `note` si dicono accanto. La regola è una, `gruppoConteggioSpillo` in `shared/spilli.ts`; i numeri li
 * calcola il server, il client non somma.
 */
export interface ConteggiPinDto { contenuto: number; passaggi: number; note: number }

/** `GET /api/mappe/albero/conteggi`: i conteggi della radice dell'indice, cioè di tutto l'albero delle mappe (Memento esclusi). */
export interface ConteggiAlberoDto { conteggiPin: ConteggiPinDto }

export interface MappaRiassuntoDto {
  ruoloImmagine?: RuoloImmagine;
  /** Ordinale di una collezione presentativa di immagini omonime, mai numero di piano. */
  immagineCollezione?: {indice:number;totale:number;ambito:string};
  contesti?: Array<{id:string;nome:string|null;campo:string;texpack:number}>;
  /** La versione della planimetria dentro la sua stanza (l'Area): etichetta e ordine (`mappa.versione_*`, L11 · B9: sostituisce il gruppo
   *  d'immagini). Null se la mappa non ha né etichetta né ordine di versione. */
  versione: { etichetta: string | null; ordine: number } | null;
  /** `nome` l'ha scritto una persona nell'editor, non l'estrazione: vince sui contesti
   * (082). Solo il salvataggio del nome lo accende; l'importazione di un pacchetto lo spegne. */
  nomeRivisto: boolean;
  nomeCompleto?: string;
  genitoreNome?: string|null;
  chiave: string;
  nome: string;
  tipo: TipoMappa;
  genitore: string | null;
  ordine: number;
  /** L'immagine caricata nell'istanza, con l'URL versionato dalla data di caricamento (null se assente). Vince ovunque (L1). */
  immagineUrl: string | null;
  /** L'asset predefinito dichiarato dalla mappa (es. `mappe/native/nativo-rmap-001-3-0`), quando manca l'immagine caricata.
   *  Prima era costruito per convenzione e la colonna viaggiava come `assetOriginale` (L1: un'immagine sola, `useImmagineMappa`). */
  asset: string | null;
  /** L'entità della guida di cui la mappa è la radice: il quartiere (`citta-<q>`) o il Palazzo/dedalo (`dungeon-<d>`), ricavata da chiave e tipo
   *  (L11 · B9: sostituisce `entita`); null per tutte le altre mappe. */
  radiceDi: { tipo: 'quartiere' | 'dungeon'; chiave: string } | null;
  origine: 'seed' | 'utente';
  /** I pin della sola mappa, tutti (resta per compatibilità: l'indice delle Mappe usa `conteggiPin`). */
  numeroSpilli: number;
  /** Solo nell'albero (`GET /api/mappe/albero`, E2 di L3): i pin della mappa **e di tutto quel che le sta sotto** nell'albero, nei
   *  tre gruppi di `gruppoConteggioSpillo`. Il totale dell'indice è in `GET /api/mappe/albero/conteggi`. */
  conteggiPin?: ConteggiPinDto;
  numeroFigli: number;
  updatedAt: string;
  /** L'Area della planimetria e la sua versione (L2); null per Tokyo, i quartieri, i Palazzi e i Memento. */
  area: AreaRifDto | null;
  /** L'indirizzo dell'unica pagina che mostra la mappa (L2): La città, il quartiere, l'Area (con la versione) o il visore. */
  casa: string;
}

export interface DettaglioSpilloDto {
  tipo: TipoRiferimento;
  /** Immagine dell'entità collegata quando esiste (mappa: sua immagine di base o asset; Confidente: ritratto caricato o asset). */
  immagine?: { url: string | null; asset: string | null } | null;
  /** La mappa di destinazione (L2): l'Area che la contiene (il nome che il pin di passaggio mostra, se c'è) e la sua casa (un passaggio
   *  porta alla pagina che la mostra). */
  mappa?: { chiave: string; nome: string; tipo: TipoMappa; area: { nome: string } | null; casa: string };
  punto?: { chiave: string; tipo: string; nome: string; descrizione: string; esauribile: boolean; dungeon: string; area: string; /** L'area del dedalo (099), o null fuori dai Memento: lì ogni voce ha uno stato. */ areaDedalo: string | null; stato: string | null;
    /** L4 (§3.1), per le voci dei Palazzi (assenti per i dedali): il carattere effettivo, l'infiltrazione della voce (lo stato di una
     *  rigenerabile è quello della sua infiltrazione), «da verificare» nella partita. Con L4 `stato` è quello con cui la voce risulta. */
    carattere?: CarattereVoce | null; infiltrazione?: { chiave: string; nome: string }; daVerificare?: boolean;
    /** §8.11: per una voce permanente o rigenerabile con pin, quanti dei suoi pin sono fatti nella partita (k/N; «in corso» se
     *  0 < k < N); null per una voce senza pin (il suo stato è il suo) o senza partita. */
    avanzamento?: AvanzamentoVoceDto | null };
  luogo?: { chiave: string; quartiere: string; tipo: string; nome: string; cosaOffre: string; quando: string | null;
    /** L5: gli orari del luogo in parole, la presenza, la pagina del luogo e tutti i negozi della sede. */
    orariTesto?: string; presenza?: PresenzaLuogoDto; casa?: string; negozi?: Array<{ chiave: string; nome: string; casa: string }> };
  negozio?: { chiave: string; nome: string; tipo: string; disponibilita?: DisponibilitaDto;
    /** L5: la sezione del negozio nella pagina della sede, o null. */
    sedeCasa?: string | null; sedeChiave?: string | null; articoli: Array<{ chiave: string; nome: string; categoria: string; prezzo: number | null; disponibileDal: string | null; comprato: boolean; acquisti?: StatoAcquistiArticoloDto; disponibilita?: DisponibilitaDto; catalogo?: RiferimentoOggettoDto | null; costo?: CostoOggettoDto | null; costoDaVerificare?: boolean; ricevuti?: RicompensaOggettoDto[] }> } | null;
  confidente?: { chiave: string; nome: string; arcanaNome: string };
  richiesta?: { chiave: string; nome: string; stato: string | null };
}

/** Una voce della guida di un pin (`SpilloDto.voci`): la stessa forma del dettaglio di un riferimento a un punto. */
export type VoceDelPinDto = NonNullable<DettaglioSpilloDto['punto']>;

/** Condizione di visibilità con il testo in italiano pronto per la scheda. */
/** Il testo descrittivo delle condizioni; per `avviso`, `testo` resta il contenuto originale (vedi `condizioneConTesto`). */
export type CondizioneSpilloDto = RequisitoSpillo & { testo: string };
/** Una voce di effetto di un libro, film o attività, con la sua frase (shared/effettiCatalogo). */
export type VoceEffettoDto = VoceEffetto & { testo: string };

/** Dove porta uno spillo di spostamento: una mappa e, se indicato, uno spillo di quella mappa (selezionato all'arrivo; la mappa si adatta alla finestra). */
export interface DestinazioneSpillo { mappa: string; spillo: number | null }
/** La destinazione in un pacchetto: gli id degli spilli non valgono fra installazioni, quindi lo spillo di arrivo si descrive per nome e posizione
 *  (e i pacchetti vecchi portano ancora `x`, `y`, `zoom`: all'importazione diventano lo spillo più vicino). */
export interface DestinazionePacchetto { mappa: string; spillo?: { nome: string; x: number; y: number } | null; x?: number; y?: number; zoom?: number }

/** Le prove native di uno spillo importato dai dati del gioco.
 *
 * `daVerificare` distingue i due casi che contano. Falso: il significato del tipo è dimostrato, e
 * questi campi sono solo tracciabilità. Vero: il gioco disegna quel pin con una certa icona ma che
 * cosa indichi non è ancora provato, e allora `prove` porta tutto ciò che si è raccolto — quante
 * volte compare e dove, quali procedure ne accendono la bandiera, quali testi il gioco mostra lì
 * vicino — perché qualcuno possa chiudere la questione guardando le schermate. */
export interface NativoSpilloDto {
  /** Identificatore del tipo nei record `ICON_*.BIN` del gioco. */
  tipoNativo: number;
  /** Posizione del pin dentro il record della sua planimetria. */
  indicePin: number;
  /** La bandiera che ne governa la comparsa, dove il pin è condizionato. */
  bandiera?: number | null;
  condizionale?: boolean;
  /** La parte grafica con cui il gioco lo disegna, e lo sprite che le corrisponde. */
  partId?: number | null;
  indiceSprite?: number | null;
  /** Il nome interno dello sprite, in giapponese: è il nome che il gioco stesso gli dà. */
  nomeNativo?: string | null;
  png?: string | null;
  /** Perché la parte grafica non ha una sorgente, dove non ce l'ha. */
  motivoSenzaSprite?: string | null;
  /** Il significato del tipo non è dimostrato: questo spillo è un segnaposto da controllare. */
  daVerificare?: boolean;
  /** Tutto ciò che si è raccolto sul tipo, per chi va a verificarlo. */
  prove?: Record<string, unknown> | null;
}

export interface SpilloDto {
  destinazione?: DestinazioneSpillo | null;
  /** A previous explicit destination was deleted; never fall back to the entity link. */
  destinazioneNonDisponibile?: boolean;
  /** I nomi di mappa e spillo d'arrivo, per il pulsante «Vai: …». */
  destinazioneNomi?: { mappa: string; spillo: string | null };
  id: number;
  /** L'identità stabile del pin (`identitaSpillo`): è quella che citano le condizioni «Pin di una mappa» (2026-10-03). */
  uid?: string;
  mappaChiave: string;
  tipo: TipoSpillo;
  tipoNome: string;
  colore: string;
  nome: string;
  descrizione: string;
  /** Percentuali dell'immagine di base. */
  x: number;
  y: number;
  riferimento: { tipo: TipoRiferimento; chiave: string } | null;
  collezionabile: boolean;
  /** Localizzazione del luogo, senza attestare la disponibilità delle attività. */
  soloPosizione?: boolean;
  /** Le prove native, per gli spilli che vengono dai dati del gioco.
   *
   * Non è un dettaglio tecnico da nascondere: per i tipi il cui significato non è ancora
   * dimostrato è ciò che permette di verificarli guardando le schermate — il nome che il gioco
   * dà allo sprite, la parte grafica con cui lo disegna e le tracce raccolte negli script. */
  nativo?: NativoSpilloDto | null;
  /** Condizioni di visibilità (vuoto = sempre visibile), con testo descrittivo. */
  condizioni: CondizioneSpilloDto[];
  /** Con la partita: esito delle condizioni alla data corrente (bloccato = nascosto sulla mappa). */
  disponibilita?: DisponibilitaDto;
  ordine: number;
  origine: 'seed' | 'utente';
  /** Fatto nella partita. Da L4 (§8.11, NR4-1) ogni pin ha il suo stato (`spillo_partita`); un pin condiviso da voci rigenerabili di più
   *  infiltrazioni l'ha per infiltrazione, letto in quella di contesto (`contestoInfiltrazione`); un pin dei dedali dei Memento resta con
   *  la regola di prima (il suo segno, o le sue voci tutte gestite). Le voci del pin calcolano il loro stato dai loro pin (k/N). */
  raccolto: boolean;
  /** L4: l'infiltrazione a cui si riferisce lo stato (pin con voci rigenerabili), o null. Con la partita, per i Palazzi. */
  contestoInfiltrazione?: { chiave: string; nome: string } | null;
  /** L4: il pin risulta fatto ma una sua voce no, da prima dell'aggiornamento (divergenza conservata): «Da verificare». */
  daVerificare?: boolean;
  /** L4: il pin ha uno stato suo (nessuna voce che conta). */
  statoProprio?: boolean;
  /** Il riferimento del pin (dove porta, il luogo, il Confidente…) risolto. Non dice le voci della guida: quelle sono `voci`. */
  dettaglio: DettaglioSpilloDto | null;
  /** L5: per un pin di luogo (o di negozio con sede) `nome` e `descrizione` sono quelli del luogo; la descrizione propria del pin, se
   *  diversa e non vuota, resta qui (mai persa). Null per gli altri pin. */
  notaPin?: string | null;
  /** L5: la presenza del luogo del pin (o della sede del negozio), con la funzione unica; assente per gli altri pin. */
  presenza?: PresenzaLuogoDto;
  /** Le voci della guida a cui il pin appartiene, ognuna col suo stato nella partita (2026-10-01; più d'una dalla 098, 2026-10-09:
   *  «Voci indipendenti»), in ordine di chiave: separate dal riferimento, così un passaggio porta alla sua mappa *e* fa parte di
   *  una voce. Vuoto = il pin non è di nessuna voce. */
  voci: VoceDelPinDto[];
  /** Schermate di riferimento (istanza o asset del repository), in ordine. */
  immagini: ImmagineSpilloDto[];
  updatedAt: string;
  /** §8.11: solo nella risposta del gesto sul pin (`PUT /api/partite/:id/spilli/:spilloId`): le voci che il gesto ha reso fatte o ha
   *  riaperto («Segnate anche: …», «Riapre anche: …»). */
  effetti?: EffettiDelGestoDto;
}

/** §8.11: il contatore di una voce con pin — quanti dei suoi pin sono fatti nella partita, su quanti. */
export interface AvanzamentoVoceDto { fatti: number; totale: number }

/** §8.11: una voce toccata da un gesto (segnata o riaperta), con la sua infiltrazione. */
export interface VoceDelGestoDto { chiave: string; nome: string; infiltrazione: { chiave: string; nome: string } }

/** §8.11: le voci che un gesto (sul pin o sulla voce) ha segnato o riaperto oltre a quella toccata. */
export interface EffettiDelGestoDto { segnate: VoceDelGestoDto[]; riaperte: VoceDelGestoDto[] }

export interface ImmagineSpilloDto {
  id: number;
  /** URL dell'immagine dell'istanza (null per gli asset del repository). */
  url: string | null;
  asset: string | null;
  didascalia: string;
  ordine: number;
}

export interface MappaDto extends MappaRiassuntoDto {
  larghezza: number | null;
  altezza: number | null;
  note: string;
  genitoreNome: string | null;
  /** Dalla radice a questa mappa. Per una planimetria con Area l'ultima tappa ha il nome dell'Area (Tokyo › Shibuya › Sottopasso):
   *  la versione la dice `area.versioneEtichetta` (L2). */
  percorso: Array<{ chiave: string; nome: string }>;
  figli: MappaRiassuntoDto[];
  spilli: SpilloDto[];
  /** Gli spilli di **altre** mappe che portano qui. Una mappa conosce da sé solo le vie d'uscita
   * (i propri spilli): senza questo elenco un collegamento a senso unico — si entra e non si torna
   * indietro — non si vede da nessuna parte, e chi cura l'atlante non sa nemmeno chi lo cita. */
  arrivi: Array<{ spilloId: number; tipo: TipoSpillo; nome: string; mappa: string; mappaNome: string }>;
  /** I pezzi della planimetria (102): zone dell'immagine scelte dall'utente, cancellate dall'immagine di base e posate altrove,
   *  ognuna in una o più copie (103). */
  pezzi: PezzoMappaDto[];
}

/** Rotazione di un pezzo, in gradi in senso orario. */
export type RotazionePezzo = 0 | 90 | 180 | 270;

/**
 * Un pezzo di una planimetria (102, richiesta dell'utente del 2026-10-14): il **ritaglio**, una zona rettangolare dell'immagine
 * scelta col mouse, sempre cancellata dall'immagine di base. Dal 2026-10-15 (103: «vorrei poter usare un pezzo una volta recuperato
 * e definito per inserirlo più volte nella mappa») si posa in una o più `copie`, ognuna con posizione, rotazione, specchio e
 * condizioni proprie. Tutto in **pixel dell'immagine**.
 */
export interface PezzoMappaDto {
  id: number;
  uid: string;
  nome: string;
  /** La zona d'origine nell'immagine: angolo in alto a sinistra e dimensioni. */
  sorgente: { x: number; y: number; larghezza: number; altezza: number };
  ordine: number;
  updatedAt: string;
  /** Le copie posate, nel loro ordine: almeno una (eliminata l'ultima se ne va il ritaglio). */
  copie: CopiaPezzoDto[];
}

/** Una copia posata di un pezzo (103): dove sta, come, quando si vede. */
export interface CopiaPezzoDto {
  id: number;
  uid: string;
  /** Il ritaglio di cui è copia. */
  pezzoId: number;
  /** Facoltativa: vuota, la vista la chiama «Nome · copia N» (N = posto fra le copie del pezzo, da 1; scelta dell'utente del 2026-10-15). */
  etichetta: string;
  /** L'angolo in alto a sinistra dell'ingombro della copia posata (a 90° e 270° larghezza e altezza si scambiano). */
  posizione: { x: number; y: number };
  rotazione: RotazionePezzo;
  /** Specchio prima della rotazione. */
  specchio: { orizzontale: boolean; verticale: boolean };
  condizioni: CondizioneSpilloDto[];
  /** Solo con la partita: l'esito delle condizioni (come i pin); senza, la copia si mostra sempre. */
  disponibilita?: DisponibilitaDto;
  ordine: number;
  updatedAt: string;
}

/** Quel che si scrive di un ritaglio (correzione: i campi assenti restano). */
export interface DatiPezzoMappa {
  nome?: string;
  sorgente?: { x: number; y: number; larghezza: number; altezza: number };
  ordine?: number;
}

/** Quel che si scrive di una copia (creazione: senza posizione sta sulla zona d'origine; correzione: i campi assenti restano). */
export interface DatiCopiaPezzo {
  etichetta?: string;
  posizione?: { x: number; y: number };
  rotazione?: RotazionePezzo;
  specchio?: { orizzontale: boolean; verticale: boolean };
  condizioni?: RequisitoSpillo[] | null;
  ordine?: number;
}

/** La creazione di un pezzo: la zona (obbligatoria) e la sua prima copia. */
export interface DatiNuovoPezzoMappa extends DatiPezzoMappa {
  sorgente: { x: number; y: number; larghezza: number; altezza: number };
  copia?: DatiCopiaPezzo;
}

/** La correzione di una copia: anche il nome del ritaglio, nella stessa transazione (il modulo dell'editor li salva insieme). */
export interface DatiAggiornaCopiaPezzo extends DatiCopiaPezzo {
  nomePezzo?: string;
}

/** Un pezzo nel pacchetto delle mappe (103): il ritaglio con le sue copie. */
export interface PezzoPacchetto {
  uid?: string; nome: string; sorgente: { x: number; y: number; larghezza: number; altezza: number }; ordine: number;
  copie: Array<{ uid?: string; etichetta?: string; posizione: { x: number; y: number }; rotazione: RotazionePezzo; specchio: { orizzontale: boolean; verticale: boolean }; condizioni?: RequisitoSpillo[]; ordine: number }>;
}

/** Un pezzo come lo scriveva il pacchetto della 102 (una posa sola, accanto alla zona): l'importazione lo legge ancora come una copia. */
export interface PezzoPacchetto102 {
  uid?: string; nome: string; sorgente: { x: number; y: number; larghezza: number; altezza: number }; posizione: { x: number; y: number }; rotazione: RotazionePezzo; specchio: { orizzontale: boolean; verticale: boolean }; condizioni?: RequisitoSpillo[]; ordine: number;
}

/** Pacchetto di esportazione/importazione delle mappe (versione 1): il file `mappe-editor.json` che l'editor scarica e reimporta. */
/** Un'Area nel pacchetto delle mappe (L2): il contenitore (uno solo fra quartiere, Palazzo e città), lo slug, il nome, l'ordine, la
 *  planimetria predefinita (chiave pubblica) e lo stato. Un pacchetto di prima della 109 non ha il campo `aree`: l'importazione allora
 *  assegna le Aree con la regola della migrazione. */
export interface AreaPacchetto { chiave: string; quartiere: string | null; dungeon: string | null; citta: string | null; slug: string; nome: string; nomeRivisto: boolean;
  ordine: number; predefinita: string | null; origine: 'seed' | 'utente'; seedJson: string | null; daVerificare: boolean;
  /** L3: l'ultima modifica, che l'import conserva (andata e ritorno identica). Un pacchetto di prima non l'ha. */
  updatedAt?: string }
/** Un legame infiltrazione ↔ area di un Palazzo nel pacchetto delle mappe (L3, `infiltrazione_area`). */
export interface LegamePacchetto { infiltrazione: string; area: string; ordine: number; /** Chiave pubblica della versione da aprire; null = la predefinita. */ planimetriaIniziale: string | null; origine: 'seed' | 'utente' | 'regola' }
/** Un legame di una mappa con un'entità (`mappa_entita`, tolta da L11 · B9): resta come tipo di sola lettura per i pacchetti di prima. */
export interface LegameEntitaPacchetto { tipo: string; chiave: string; fonte: string }
export interface EsportazioneMappeDto {
  /** Gli ingressi dei quartieri; `area` (L2) è l'Area della planimetria, informativa: all'import si deduce dalla planimetria. */
  ingressi?:Array<{quartiere:string;mappa:string;x:number;y:number;zoom:number;area?:string|null}>;
  versione: 1;
  esportato?: string;
  /** Le Aree delle planimetrie esportate (L2, migrazione 109). */
  aree?: AreaPacchetto[];
  /** L3: i legami infiltrazione ↔ area delle Aree esportate. Un pacchetto senza il campo (di prima) lega le infiltrazioni dal campo
   *  `aree` di ogni mappa all'Area della planimetria. */
  legami?: LegamePacchetto[];
  mappe: Array<{
    /** L3 (andata e ritorno identica, lotti/L3/modifiche.md §2.3): il nome rivisto a mano, l'origine, l'ultima modifica, il percorso
     *  pubblico fissato e i legami con le entità con la loro fonte. Assenti in un pacchetto di prima: l'import fa come allora. */
    nomeRivisto?: boolean; origine?: 'seed' | 'utente'; updatedAt?: string; percorsoFisso?: string | null;
    /** Solo in lettura (pacchetti di prima di L11 · B9): l'import li ignora, l'esportazione non li scrive più. */
    entitaLegami?: LegameEntitaPacchetto[];
    /** L'Area della planimetria (chiave di `aree`) e la sua versione dentro l'Area (L2). */
    area?: string | null;
    versione?: { etichetta: string | null; ordine: number };
    ruoloImmagine?: RuoloImmagine;
    contesti?: Array<{id:string;nome:string|null;campo:string;texpack:number}>;
    /** Solo in lettura (pacchetti di prima di L11 · B9): l'import lo ignora, l'esportazione non lo scrive più. */
    gruppoImmagini?: {id:string;nome:string;ordine:number;etichetta?:string;nomeRivisto?:boolean};
    assetOriginale?: string|null;
    chiave: string; nome: string; tipo: TipoMappa; genitore: string | null; ordine: number; immagine: string | null; asset: string | null; larghezza: number | null; altezza: number | null;
    /** Solo in lettura (pacchetti di prima di L11 · B9): un pacchetto senza `aree` ne ricava l'infiltrazione se è di tipo area. L'esportazione non lo scrive più. */
    entita?: { tipo: string; chiave: string } | null; note: string;
    /** Tutte le aree della guida contenute nella planimetria, in ordine di guida (2026-09-29); un pacchetto di prima non ha questo campo. */
    aree?: string[];
    /** I pezzi della planimetria (102), ognuno con le sue copie (103). Un pacchetto di prima della 102 non ha il campo: i pezzi della
     *  mappa restano com'erano; uno della 102 porta la posa accanto alla zona, e si legge come un pezzo con una copia. */
    pezzi?: Array<PezzoPacchetto | PezzoPacchetto102>;
    spilli: Array<{ /** Identità stabile dello spillo (067): la porta il pacchetto, così «raccolto» la ritrova. */ uid?: string; soloPosizione?: boolean;
      /** L3 (andata e ritorno identica): origine, ultima modifica, identità del seed e prove native com'erano salvate (`nativoJson`, il
       *  testo: `nativo` è la forma dei pacchetti del seed). Assenti in un pacchetto di prima. */
      origine?: 'seed' | 'utente'; updatedAt?: string; seedIdentita?: string | null; nativoJson?: string | null; nativo?: NativoSpilloDto | null; destinazione?: DestinazionePacchetto | null; destinazioneNonDisponibile?: boolean; tipo: TipoSpillo; nome: string; descrizione: string; x: number; y: number; riferimento: { tipo: TipoRiferimento; chiave: string } | null; /** Le voci della guida del pin (098); un pacchetto di prima porta `voce` (094), o un riferimento «punto». */ voci?: string[]; /** La voce di un pacchetto della 094-097: si legge ancora, non si scrive più. */ voce?: string | null; collezionabile: boolean; ordine: number; condizioni?: RequisitoSpillo[]; immagini?: Array<{ asset?: string | null; mime?: string; base64?: string; didascalia: string }> }>;
  }>;
  immagini?: Record<string, { mime: string; base64: string }>;
  /** Provenienza (informativa) delle immagini di base scaricate dalle guide: sono comunque incluse nel pacchetto. */
  provenienze?: Array<{ mappa: string; origineUrl: string }>;
}

// ---- Impostazioni: backup e ripristino dell'istanza (15.29) ----

/** Stato dell'istanza locale: versioni, dimensioni su disco, conteggi. */
export interface StatoIstanzaDto {
  versioneSchema: number;
  /** Versione dello schema del file delle partite (partite.db, migrazioni «utente»). */
  versioneSchemaPartite: number;
  versioneApp: string;
  /** Il file dei dati di gioco (gioco.db). */
  database: { nome: string; byte: number; inMemoria: boolean };
  /** Il file delle partite (partite.db), attaccato alla stessa connessione. */
  databasePartite: { nome: string; byte: number };
  immagini: { file: number; byte: number };
  caratteri: { file: number; byte: number };
  partite: number;
  copieDiSicurezza: number;
  /** Nessun dato di gioco (tabella `persona` vuota): l'istanza è nata senza pacchetto e aspetta l'importazione. */
  vuota: boolean;
  /** Il pacchetto completo è stato importato: almeno un'immagine con contenuto (l'iniziale del primo avvio non ne ha). */
  completo: boolean;
}

/** Esito di un ripristino da file: che cosa è stato sostituito e dove sta la copia di sicurezza. */
export interface EsitoRipristinoDto {
  /** Nome della copia lasciata nella cartella d'appoggio dallo scaricamento; null se non c'è deposito. */
  depositato?: string | null;
  formato: 'database' | 'istanza';
  /** Il file dei dati di gioco è stato sostituito. */
  database: boolean;
  /** Il file delle partite è stato sostituito. */
  partite: boolean;
  immagini: number;
  caratteri: number;
  copiaDiSicurezza: string;
  stato: StatoIstanzaDto;
}

// ---- Pacchetto di gioco: esportazione, anteprima, importazione (voce 10) ----
//
// Il pacchetto è un solo file, `gioco.db`, con dentro anche le immagini (migrazione 079): non c'è
// manifesto, la versione è `PRAGMA user_version` e i conteggi si leggono dal file stesso.

/** Un riferimento delle partite che non trova più la sua riga nei dati di gioco. */
export interface OrfanoPartiteDto {
  /** Tabella delle partite e colonna che referenzia (es. `spillo_partita.spillo_uid`). */
  tabella: string;
  colonna: string;
  /** Che cosa referenzia, in parole (articolo, libro, spillo…). */
  entita: string;
  righe: number;
  partite: number;
  /** Fino a cinque valori orfani, per riconoscerli. */
  esempi: string[];
  /** Quando l'intera tabella di destinazione manca nel pacchetto. */
  nota: string | null;
}

/** Che cosa cambierebbe importando il pacchetto: si mostra prima di sostituire. */
export interface AnteprimaPacchettoDto {
  /** `PRAGMA user_version` del file caricato. */
  versioneSchema: number;
  /** Versione dello schema che il codice sa leggere (ultima migrazione dei dati di gioco). */
  versioneSchemaCodice: number;
  versioneSchemaIstanza: number;
  databaseByte: number;
  /** Falso quando il pacchetto è più nuovo del codice: non si importa. */
  importabile: boolean;
  motivo: string | null;
  /** Le sole tabelle con conteggi diversi fra istanza e pacchetto. */
  differenze: Array<{ tabella: string; istanza: number; pacchetto: number }>;
  /** Tabelle dell'istanza assenti nel pacchetto (le migrazioni le ricreano vuote). */
  tabelleAssenti: string[];
  /** R11-05/3: le strutture del pacchetto che questa versione non usa più (sempre popolato dal server); non si importano e restano nella copia di sicurezza. */
  scarti?: ScartoPacchettoDto[];
  /** Immagini con contenuto, dentro l'uno e l'altro file. */
  immagini: { istanza: number; pacchetto: number };
  orfani: OrfanoPartiteDto[];
  /** L7-TANAKA-IMPORT: il listino di Tanaka e il registro delle decisioni nell'istanza e nel pacchetto, con gli avvisi. */
  tanaka?: { istanza: StatoTanakaFileDto; pacchetto: StatoTanakaFileDto; avvisi: string[] };
}

/** Un file depositato nella cartella d'appoggio, candidato all'importazione. */
export interface FileDepositoDto {
  nome: string;
  byte: number;
  modificatoIl: string;
}

/** La cartella d'appoggio (il NAS montato) e che cosa contiene: la usano il pacchetto di gioco e il backup. */
export interface DepositoFileDto {
  /** Falso quando nessuna cartella è configurata o non è raggiungibile: l'interfaccia lo dice invece di mostrare un elenco vuoto. */
  disponibile: boolean;
  /** Dove guarda il server, per poterlo scrivere nell'interfaccia. */
  cartella: string;
  /** Perché non è disponibile (cartella non configurata, non montata, non leggibile). */
  motivo: string | null;
  file: FileDepositoDto[];
}

/** A che punto è l'importazione del pacchetto, mentre la si aspetta.
 *
 * Serve perché l'attesa può superare quella di chi sta davanti: un proxy (Cloudflare si ferma a cento
 * secondi) chiude la connessione mentre il server sta ancora sostituendo i dati, e il browser lo
 * leggerebbe come un fallimento. Chiedendo lo stato si sa se sta ancora lavorando, e com'è finita.
 */
export type FaseImportazionePacchetto = 'lettura' | 'verifica' | 'copia-di-sicurezza' | 'sostituzione' | 'riapertura' | 'controllo';

export interface StatoImportazionePacchettoDto {
  inCorso: boolean;
  /** Identificativo dell'importazione in corso: cambia a ogni tentativo, così un esito non si confonde con un altro. */
  operazione: string | null;
  fase: FaseImportazionePacchetto | null;
  iniziataIl: string | null;
  /** Com'è finita l'ultima importazione di questo avvio; `esito` c'è solo se è riuscita.
   *
   * `operazione` serve a chi non ha ricevuto la risposta: confrontandola con quella vista PRIMA di
   * chiedere l'importazione si sa se questo esito è del proprio tentativo o di uno di prima. Senza
   * quel confronto, un tentativo respinto dal proxy (che al server non arriva nemmeno) leggerebbe
   * l'esito riuscito di ore prima e si direbbe riuscito. */
  ultima: { operazione: string; riuscita: boolean; conclusaIl: string; messaggio: string; esito: EsitoImportazionePacchettoDto | null } | null;
}

/** Una struttura del backup che questa versione non usa più: all'importazione si scarta, e resta nella copia di sicurezza (R11-05/3). */
export interface ScartoPacchettoDto {
  tipo: 'tabella' | 'colonna';
  tabella: string;
  /** Il nome leggibile della tabella (quello del cestino). */
  etichetta: string;
  colonna: string | null;
  /** Righe della tabella, o righe con un valore informativo nella colonna. */
  righe: number;
  /** Dove vive ora il dato (registro delle fonti tolte); null se la struttura non è dichiarata. */
  sostituitaDa: string | null;
  /** Falso: struttura non più nell'app senza una voce nel registro (probabilmente rinominata). */
  spiegata: boolean;
}

/** Esito dell'importazione: che cosa è cambiato e quali riferimenti delle partite sono rimasti orfani. */
export interface EsitoImportazionePacchettoDto {
  /** R11-05/3: le strutture del backup che questa versione non usa più (sempre popolato dal server). */
  scarti?: ScartoPacchettoDto[];
  /** Nome della cartella della copia di sicurezza, dove sta anche `riepilogo-scarti.json`. */
  riepilogoSalvatoIn?: string;
  copiaDiSicurezza: string;
  versioneSchemaPacchetto: number;
  versioneSchema: number;
  migrazioniApplicate: number;
  /** Immagini con contenuto nei dati di gioco dopo l'importazione. */
  immagini: number;
  orfani: OrfanoPartiteDto[];
  /** L6: righe del backup con condizioni legacy `manuale` recuperate come avvisi; nessun contenuto delle note. */
  condizioniConvertite?: string[];
  stato: StatoIstanzaDto;
}

// ---- Catalogo estensibile dall'utente (16.1) ----

/** Tipi di riga del catalogo che l'utente può aggiungere o correggere. */
/** I tipi di riga del catalogo che si possono aggiungere, correggere o nascondere dall'interfaccia.
 *
 * Erano due — negozio e articolo — perche' erano le uniche tabelle con le colonne `origine`,
 * `nascosto` e `seed_json`. Dalla migrazione 051 le hanno anche libri, film e attivita', e le
 * pagine nuove possono finalmente offrire l'aggiunta invece di essere di sola lettura.
 *
 * Dalla 055 ci sono anche le **domande in classe** e il **cruciverba**: sono le due cose che si
 * consultano mentre il gioco aspetta una risposta, e quelle in cui un errore si scopre nel modo
 * peggiore — hai risposto come diceva l'app e il gioco ti ha dato torto. Fino a ieri quell'errore
 * non si poteva correggere. */
export const TIPI_CATALOGO = ['negozio', 'articolo', 'libro', 'film', 'attivita', 'luogo', 'domanda', 'cruciverba'] as const;

/** Un luogo della città come voce da scegliere (sede di un negozio o di un'attività). */
export interface LuogoOpzioneDto { chiave: string; nome: string; tipo: string; quartiere: string; quartiereNome: string }

/**
 * Gli elenchi chiusi da cui l'editor delle condizioni prende i valori (`GET /condizioni/elenchi`). Questa forma e le due sotto
 * esistevano solo nel client, con le rotte che rispondevano senza tipo: una divergenza non si vedeva (rilievo R6").
 */
export interface ElenchiRegoleDto {
  /** L7: allerte effettivamente presenti nel calendario, per la condizione meteo «senza allerta». */
  allerte?: Array<{ chiave: string; nome: string }>;
  articoli: Array<{ chiave: string; nome: string; gruppo: string }>;
  letture: Array<{ chiave: string; nome: string; categoria: 'libro' | 'film' }>;
  arcani: Array<{ chiave: string; nome: string }>;
  persone: Array<{ chiave: string; nome: string }>;
  abilita: Array<{ chiave: string; nome: string }>;
  squadra: Array<{ chiave: string; nome: string }>;
  /** Le sole attività che si contano per volte svolte. */
  attivita: Array<{ chiave: string; nome: string }>;
  /** Con il programma punti: «punti negozio» va solo ai programmi manuali, «grado cliente» solo a chi ha il rango. */
  negozi: Array<{ chiave: string; nome: string; programma: 'manuale' | 'rango-cliente' | null }>;
  /** `calcolato`: l'evento si legge dalla squadra della partita e non si segna a mano. */
  eventi: Array<{ chiave: string; nome: string; calcolato: boolean }>;
  contatori: Array<{ chiave: string; nome: string }>;
  /** L6: i luoghi (condizione `luogo`), col quartiere come gruppo. */
  luoghi?: Array<{ chiave: string; nome: string; gruppo: string }>;
  /** L6: tutti i quartieri (condizione `quartiere`, R6-09: non solo quelli con una data). */
  quartieri?: Array<{ chiave: string; nome: string }>;
  /** L6: gli inviti dei Confidenti (in sola lettura nell'editor: si cambiano dalla pagina del Confidente), col Confidente come gruppo. */
  inviti?: Array<{ chiave: string; nome: string; gruppo: string; confidente: string }>;
}

/** Un pin con uno stato (raccolto, aperto, parlato, incontrato, azionato…, o «ottenuto» dalla voce della guida) per la condizione
 *  «Pin di una mappa» (`GET /condizioni/spilli`): `chiave` è l'uid, `gruppo` la mappa. */
export interface PinConStatoDto {
  chiave: string; nome: string; tipo: string; gruppo: string;
  /** La parola dello stato con cui si cita: quella del tipo, o «ottenuto» per un pin che la prende dalla sua voce della guida. */
  parola: string;
}

/** Una voce della guida di un Palazzo o dei Memento per la condizione «Voce della guida» (`GET /condizioni/voci`, 2026-10-11): `gruppo` è il posto
 *  («Palazzo di Kamoshida › 2. Sala Centrale»). Le descrittive («Altro») non ci sono: non hanno stato. */
export interface VoceCitabileDto { chiave: string; nome: string; tipo: string; gruppo: string }

/** La grafica predefinita che vive nel database, nella forma del manifest degli asset (`GET /immagini/manifest`). */
export interface ManifestImmaginiDto {
  generato: string;
  totale: number;
  /** «ambito/chiave» → URL versionato. */
  file: Record<string, string>;
}

/** Gli stati di una partita per le condizioni: calcolati dalla partita e da segnare a mano (Partita → Progressi). */
export interface ProgressiPartitaDto {
  /** `calcolato`: dalla squadra (tre stati: sì, no, non segnato); `manuale`: la spunta. */
  /** `serveA`: i ranghi dei Confidenti che l'evento sblocca, dai requisiti (es. «Sojiro Sakura, rango 3»). */
  eventi: Array<{ chiave: string; nome: string; origine: 'manuale' | 'calcolato'; avvenuto: boolean | null; membro?: string; membroNome?: string; serveA?: string[]; dalDiario?: boolean;
    /** Contributo manuale distinto dall'esito effettivo (che include le dichiarazioni delle visite). */
    manuale?: boolean; visiteDiario?: Array<{ uid: string; giorno: string }>;
    /** Le voci del Diario la cui spunta ha segnato l'evento (R10-22/3): giorno e testo, per la riga «da: voce del 09/04 · …». */
    daVoci?: Array<{ uid: string; giorno: string; testo: string }> }>;
  /** Le sole attività che si contano per volte svolte; `effettiTurno`: che cosa dà un turno («1° turno: Gentilezza, 2 note»). */
  attivita: Array<{ chiave: string; nome: string; tipo: string; volte: number; effettiTurno: string[] }>;
  /** Dopo un + o − del contatore: le Doti che i turni aggiunti danno (o quelli tolti davano), da segnare a mano nelle Doti. */
  daSegnare?: DoteDaSegnareDto[];
  /** I negozi con programma punti manuale. */
  puntiNegozio: Array<{ negozio: string; nome: string; programma: string; unita: string; punti: number }>;
  /** I negozi con il grado cliente: dalla spesa segnata, con la prossima soglia. */
  rangoCliente: Array<{ negozio: string; nome: string; programma: string; spesa: number; rango: { chiave: string; nome: string }; prossimo: { chiave: string; nome: string; spesa: number } | null }>;
  contatori: Array<{ chiave: string; nome: string; valore: number }>;
}

/** I timbri raccolti in un'area di un dedalo dei Memento (099; `area` è la chiave dell'area del dedalo), per partita. */
export interface TimbriDedaloDto { area: string; raccolti: number; totale: number | null; completato: boolean }
export type TipoCatalogo = (typeof TIPI_CATALOGO)[number];

/** Una riga del catalogo con la sua provenienza: creata dall'utente, corretta sopra il seed, o nascosta. */
export interface ElementoCatalogoDto {
  /** Informazioni su un ripristino che conserva campi introdotti dopo la fotografia. */
  avvisi?: string[];
  tipo: TipoCatalogo;
  chiave: string;
  nome: string;
  origine: 'seed' | 'utente';
  /** Riga del seed corretta dall'utente: «Ripristina» la riporta com'era. */
  modificata: boolean;
  nascosta: boolean;
  aggiornata: string | null;
  /** Campi editabili, con i nomi delle colonne. */
  dati: Record<string, unknown>;
}

export interface RiepilogoCatalogoDto {
  perTipo: Array<{ tipo: TipoCatalogo; creati: number; modificati: number; nascosti: number; totale: number }>;
}

// ---- Il cestino (migrazioni 104 e utente 021, 2026-10-16): ciò che si elimina dalla guida e dalle mappe si può rimettere ----

/** Che cosa è stato eliminato: un'area della guida di un Palazzo, una voce della guida, una planimetria, un'area di un dedalo, un'Area
 *  con le sue planimetrie (`area-fisica`, L2: il quartiere o la città che la contiene). */
/** `richiesta` (L6, R6-04): una Richiesta eliminata va nel cestino; le condizioni che la citano restano e danno «Richiesta eliminata». */
export type TipoCestino = 'area' | 'voce' | 'mappa' | 'area-dedalo' | 'area-fisica' | 'luogo' | 'negozio' | 'richiesta' | 'oggetto' | 'voce-diario' | 'pin' | 'partita' | 'fonte-acquisto' | 'fonte-pesca' | 'sessione-pesca' | 'osservazione-pesca' | 'persona-scorta' | 'articolo' | 'libro' | 'film' | 'attivita' | 'domanda' | 'cruciverba' | 'invito';

// ---- L7: catalogo unico. I riferimenti non contengono prezzi: il prezzo appartiene all'offerta. ----

export interface RiferimentoOggettoDto { chiave: string; nome: string; casa: string }
export interface ContenutoOggettoDto extends RiferimentoOggettoDto { quantita: number; nota: string | null }
/** La guida può nominare il prodotto di una ricetta senza dichiararne la resa. Non equivale a una unità. */
export interface RicompensaOggettoDto extends Omit<ContenutoOggettoDto, 'quantita'> { quantita: number | null }
export type CostoOggettoDto = { tipo: 'fiori'; importo: number }
  | { tipo: 'oggetti'; oggetti: Array<{ chiave: string; quantita: number; nome?: string; casa?: string }> };

export interface CatalogoOggettoDto extends RiferimentoOggettoDto {
  categoria: CategoriaOggetto;
  sottocategoria: string | null;
  nomiAltri: string[];
  nomeOriginale: string | null;
  effetto: string;
  descrizione: string;
  statistiche: Record<string, unknown> | null;
  fonte: { tipo: 'equipaggiamento' | 'guida' | 'libro' | 'film' | 'videogioco' | 'listino' | 'utente'; chiave: string | null };
  origine: 'seed' | 'utente';
  modificato: boolean;
  nascosto: boolean;
  prezzoMinimo: number | null;
}

export type DatiNuovoOggettoDto = Pick<CatalogoOggettoDto, 'categoria' | 'nome'> & Partial<Pick<CatalogoOggettoDto,
  'sottocategoria' | 'nomiAltri' | 'nomeOriginale' | 'effetto' | 'descrizione' | 'statistiche'>>;
export interface SceltaAbbinamentoOggettoDto {
  riga_tipo: TipoPropostaOggetto; riga_chiave: string; catalogo_chiave: string | null; gruppo?: string;
}
export interface DatiLegameOggettoDto extends Omit<SceltaAbbinamentoOggettoDto, 'catalogo_chiave'> {
  catalogo_chiave: string;
  quantita?: number | null; nota?: string | null; togli?: boolean;
  precedente_catalogo_chiave?: string; proposta_catalogo_chiave?: string | null;
}

export interface OffertaOggettoDto {
  noteStoriche?: NotaStoricaOfferta[];
  acquisti?: StatoAcquistiArticoloDto;
  acquistiRegistrati: Array<{ articolo: string; negozioNome: string }>;
  articolo: string;
  negozio: string;
  negozioNome: string;
  sedeCasa: string | null;
  sedeChiave: string | null;
  sedeNome: string | null;
  prezzo: number | null;
  costo: CostoOggettoDto | null;
  costoDaVerificare: boolean;
  condizioni: CondizioneSpilloDto[];
  presenza: DisponibilitaDto | null;
  disponibilita: DisponibilitaDto | null;
  disponibileOggi: boolean | null;
  acquistato: boolean;
  nota: string | null;
}

export interface OggettoDettaglioDto extends CatalogoOggettoDto {
  noteStoriche?: NotaStoricaOfferta[];
  trasformazioni: TrasformazioneOggettoDto[];
  inVendita: OffertaOggettoDto[];
  regalo: Array<{ confidente: string; nome: string; gradimento: string | null; casa: string; regalato: boolean; sconsigliato: boolean }>;
  forzieri: Array<{
    voce: string; voceNome: string; palazzo: string; palazzoNome: string;
    infiltrazione: string; infiltrazioneNome: string; area: string | null; areaNome: string | null; quantita: number;
    casa: string; stato: 'preso' | 'non-piu-ottenibile' | 'da-prendere' | 'da-jose' | 'da-verificare' | null;
    jose: { casa: string; nota: string } | null;
  }>;
  ricompense: Array<RicompensaOggettoDto & { fonteTipo: string; fonteChiave: string; fonteNome: string; fonteCasa: string | null; costo?: CostoOggettoDto | null; costoDaVerificare?: boolean; prezzo?: number | null }>;
  scambi: OffertaOggettoDto[];
  ricette: Array<{ chiave: string; nome: string; quantita: number; casa: string; prodotti: RicompensaOggettoDto[]; nomeStorico: string }>;
  lettura: { tipo: 'libro'; voce: LibroDto; letturaRapida: boolean } | { tipo: 'film'; voce: FilmDto } | { tipo: 'videogioco'; voce: VideogiocoDto } | null;
  partita: { acquistato: boolean; regalato: boolean; letto: boolean } | null;
}

export interface TrasformazioneOggettoDto {
  palazzo: string;
  palazzoNome: string;
  cristallo: RiferimentoOggettoDto | null;
  anello: RiferimentoOggettoDto | null;
  soloNuovaPartitaPlus: boolean;
  palazzoConcluso: boolean | null;
  nuovaPartitaPlus: boolean | null;
  fonte: string;
}

export const TIPI_PROPOSTA_OGGETTO = ['articolo', 'regalo', 'voce', 'ricompensa', 'ricetta', 'catalogo'] as const;
export type TipoPropostaOggetto = (typeof TIPI_PROPOSTA_OGGETTO)[number];
export interface PropostaAbbinamentoDto {
  /** Richiede il confronto completo: conferma e scelta alternativa individuali vietate. */
  decisioneUnitaria?: 'tanaka';
  rigaTipo: TipoPropostaOggetto;
  rigaChiave: string;
  /** Alternative dello stesso contenuto, non degli altri oggetti nella stessa voce/ricetta. */
  gruppo: string;
  rigaNome: string;
  testoAttuale: string;
  catalogo: RiferimentoOggettoDto | null;
  categoria: CategoriaOggetto | null;
  quantita: number | null;
  motivo: string;
  certezza: 'certa' | 'probabile' | 'da-verificare';
  /** Nota del contenuto/premio, da conservare anche confermando un'alternativa. */
  nota?: string | null;
  stato: 'da-approvare' | 'confermata' | 'scartata';
  /** Rettifiche di listino (Tanaka) visibili prima del gesto, mai applicate dalla migrazione. */
  modifica: { azione: 'collega' | 'nascondi' | 'crea'; prezzo?: number; condizioni?: Condizione[]; condizioniTesto?: string[]; ruolo?: 'costo';
    nomeOfferta?: string; costo?: CostoOggettoDto; ricevuti?: RicompensaOggettoDto[]; notaOfferta?: string } | null;
}

/** Quante righe di una tabella se ne sono andate con l'eliminazione, con il nome per l'utente. */
export interface ContenutoCestinoDto {
  tabella: string;
  etichetta: string;
  quante: number;
}

/** Un elemento del cestino, dal più recente. */
export interface VoceCestinoDto {
  id: number;
  tipo: TipoCestino;
  chiave: string;
  nome: string;
  /** Dove stava (il Palazzo, l'area, il dedalo, la mappa genitrice): vuoto se non c'è. */
  contesto: string;
  eliminatoIl: string;
  /** Le righe tolte, per tabella (dati di gioco e partite), dalla più numerosa. */
  contenuto: ContenutoCestinoDto[];
  /** La parte nelle partite (spunte, stato dei pin, timbri): nessuna, presente, o mancante (file delle partite sostituito dopo). */
  partite: 'nessuna' | 'presente' | 'mancante';
  /** Quanto pesa il registro, in byte: le immagini dei pin e delle mappe ci stanno dentro. */
  byte: number;
}

/** La risposta storica rimane invariata; il client nuovo richiede esplicitamente anche il cestino privato. */
export type VoceCestinoUnificatoDto =
  | (VoceCestinoDto & { riferimento?: { schema: 'main'; id: number } })
  | (Omit<VoceCestinoDto, 'id' | 'tipo'> & { id: null; tipo: 'partita' | 'fonte-acquisto'|'fonte-pesca'|'sessione-pesca'|'osservazione-pesca'|'persona-scorta'; riferimento: { schema: 'utente'; uid: string } });

/** Perché una riga non è stata rimessa com'era: cambiata dopo l'eliminazione, non c'è più, o punta a qualcosa che non c'è più. */
export type MotivoSaltataCestinoDto = 'cambiata-dopo' | 'non-esiste-piu' | 'legame-mancante' | 'colonna-rimossa' | 'tabella-rimossa';

/** Le righe non rimesse di una tabella, per motivo, con qualche chiave d'esempio. */
export interface SaltataCestinoDto {
  tabella: string;
  etichetta: string;
  motivo: MotivoSaltataCestinoDto;
  quante: number;
  esempi: string[];
  /** R11-06: per `colonna-rimossa`, le colonne che l'app non conserva più e che il ripristino non ha potuto rimettere. */
  colonne?: string[];
  /** R11-06: dove vive ora il dato (dal registro delle fonti tolte), se la struttura è dichiarata tolta. */
  sostituitaDa?: string | null;
}

/** Esito di un ripristino dal cestino. */
export interface EsitoRipristinoCestinoDto {
  tipo: TipoCestino;
  chiave: string;
  nome: string;
  /** Righe rimesse (reinserite o riportate com'erano). */
  rimesse: number;
  saltate: SaltataCestinoDto[];
  /** L'elemento aveva una parte nelle partite che non c'è più: rimessi solo i dati di gioco. */
  partiteMancanti: boolean;
}

// ---- Correzioni ai dati della guida e «Ripristina» senza dipendenze (L11 · B11) ----

/** Gli oggetti della guida che si correggono dalla loro pagina e si rimettono com'erano (`/api/correzioni`). */
export const TIPI_MODIFICABILI = ['quartiere', 'trofeo', 'dote', 'trasformazione',
  'personaggio', 'gruppo-personaggi',
  'sfide-battaglie', 'battaglia-sfida', 'boss-segreto', 'sfide-magnate', 'magnate-sfida', 'tratto', 'sfide-tratti', 'sfide-quiz-tv',
  'finale', 'covo', 'covo-sfida', 'covo-premio', 'dlc', 'meteo', 'completamento-sezione',
  'fabbricazione', 'ricetta', 'armi', 'arma-effetto', 'arma-progressione', 'abiti', 'abito', 'jose',
  'evento-calendario', 'allerta-meteo', 'esame', 'ombra', 'battaglia-sezione'] as const;
export type TipoModificabile = (typeof TIPI_MODIFICABILI)[number];
export type TipoCampoCorrezione = 'testo' | 'testolungo' | 'numero' | 'booleano' | 'elenco' | 'scelta' | 'oggetto';
export type ValoreCampoCorrezione = string | number | boolean | null | string[];
export interface CampoCorrezioneDto {
  /** L'indirizzo del campo dentro l'oggetto: la chiave del corpo della correzione e di `campi` nel ripristino. */
  percorso: string;
  etichetta: string;
  gruppo?: string;
  tipo: TipoCampoCorrezione;
  nullable?: boolean;
  /** Lunghezza massima di un testo o valore massimo di un numero, quando c'è. */
  max?: number;
  opzioni?: Array<{ chiave: string; nome: string }>;
  /** Il valore che le pagine mostrano adesso, e quello della guida (identici se il campo non è corretto). */
  valore: ValoreCampoCorrezione;
  valoreGuida: ValoreCampoCorrezione;
  modificato: boolean;
}
export interface SchedaCorrezioneDto {
  tipo: TipoModificabile;
  /** La chiave con cui chiamare l'oggetto adesso (se si è corretto il campo che lo identifica, è il valore nuovo). */
  chiave: string;
  nome: string;
  modalita: 'riga' | 'blocco';
  campi: CampoCorrezioneDto[];
  /** Almeno un campo è diverso dalla guida. */
  modificata: boolean;
  /** Campi la cui guida è cambiata dopo la correzione (la correzione resta, il valore nuovo della guida non si vede finché dura). */
  guidaCambiata: string[];
  aggiornata: string | null;
  nota?: string | null;
}
export interface RiepilogoCorrezioneDto {
  tipo: TipoModificabile;
  chiave: string;
  nome: string;
  campi: string[];
  aggiornata: string | null;
  /** Correzione che la guida di oggi non accoglie più (l'elemento è sparito o il valore ha cambiato tipo): non si applica e non si cancella. */
  orfana: boolean;
}
export interface EsitoRipristinoCorrezioneDto {
  tipo: TipoModificabile;
  chiave: string;
  campiRipristinati: string[];
  scheda: SchedaCorrezioneDto;
}

