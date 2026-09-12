import type { TipoMappa, TipoRiferimento, TipoSpillo } from './spilli.js';
import type { GiornoChiave } from './orariNegozio.js';
import type { TipoLuogo } from './tipiLuogo.js';
import type { RequisitoSpillo } from './condizioniSpillo.js';
import type { OrariNegozio } from './orariNegozio.js';
import type { VoceEffetto } from './effettiCatalogo.js';
// ============================================================
// Tipi condivisi FE/BE — dominio Persona 5 Royal (DTO delle API)
// ============================================================
//
// Questo modulo è importato sia dal server (NodeNext) sia dal client
// (bundler): SOLO tipi e costanti pure, nessun import di runtime Node.
// I campi `*Nome` sono la resa italiana risolta dal backend tramite la
// tabella `traduzione`; i campi senza suffisso sono le chiavi canoniche.
// ============================================================

/** Risposta di salute del backend. */
export interface HealthDto {
  status: 'ok' | 'degraded';
  timestamp: string;
  db: { ok: boolean; userVersion?: number; error?: string };
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

export interface StatisticheDto {
  forza: number;
  magia: number;
  resistenza: number;
  agilita: number;
  fortuna: number;
}

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

/** Skill appresa da una Persona (con livello di apprendimento). */
export interface SkillAppresaDto extends SkillRiassuntoDto {
  livello: number;
}

export interface RicettaSpecialeDto {
  risultato: { id: number; nome: string; nomeIt: string };
  ingredienti: Array<{ id: number; nome: string; nomeIt: string }>;
}

/** Scheda completa di una Persona. */
export interface PersonaDettaglioDto extends PersonaRiassuntoDto {
  /** Testo originale sull'origine della figura (mai il testo del gioco), con fonte sintetica. */
  descrizione: string;
  fonteDescrizione: string;
  nota: string | null;
  notaNome: string | null;
  oggetto: string;
  oggettoAllarme: string;
  oggettoECarta: boolean;
  oggettoDescrizione: string | null;
  oggettoAllarmeDescrizione: string | null;
  /** Nomi italiani degli oggetti da esecuzione (dalla guida), null se non abbinati. */
  oggettoNomeIt: string | null;
  oggettoAllarmeNomeIt: string | null;
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
  persone: Array<{ id: number; nome: string; arcana: string; arcanaNome: string; livelloPersona: number; livello: number }>;
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
  nome: string;
  dove: string | null;
  costo: string | null;
  effetto: string | null;
}

/** Scheda completa di un Confidente (Fase 6.1). */
export interface ConfidenteDettaglioDto extends ConfidenteDto {
  abilita: Array<{ rango: number; nome: string; descrizione: string }>;
  dialoghi: DialogoConfidenteDto[];
  regali: RegaloConfidenteDto[];
  regaliSconsigliati: string[];
  disponibilita: { giorni: string[]; fasce: string[]; luogo: string; sbloccoData: string; sbloccoRequisiti: string; note: string };
  noteGenerali: string;
  fonti: string[];
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
  /** Moltiplicatore ×1,5 (lettura della fortuna di Chihaya), arrotondato per difetto. */
  fortuna?: boolean;
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
}

export interface SemaforiRangoDto {
  rango: number;
  requisiti: SemaforoRequisitoDto[];
  /** Tutti i requisiti verdi (o confermati). */
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
  /** Blocco del rango successivo: requisiti non verdi (né confermati) del semaforo; null se libero. Il server rifiuta gli aumenti di rango bloccati. */
  bloccato: { rango: number; motivi: string[] } | null;
  /** Regali già consegnati in questa partita (nomi). */
  regaliFatti: string[];
  note: string;
  /** Semafori dei ranghi superiori a quello attuale (Fase 12.3), in ordine di rango. */
  semafori: SemaforiRangoDto[];
  updatedAt: string | null;
}

/** Bonus agli esami: primo del corso ×1,5, fra i primi dieci ×1,2. */
export type BonusEsame = 'primo' | 'top10';

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
  esame?: BonusEsame;
  invito?: boolean;
  note?: string;
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
export interface OsservazioneStatisticheDto extends StatisticheDto {
  livello: number;
}

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
}

export interface DomandeDto {
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

export interface OggettiGuidaDto {
  /** `articolo` e `negozi` vengono dal crosswalk versionato: sono le chiavi con cui la riga arriva alla mappa. Un oggetto venduto in più posti li elenca tutti, perché sceglierne uno vorrebbe dire mandare l'utente nel posto sbagliato più spesso che in quello giusto. */
  consumabili: Array<{ nome: string; nomeEn: string | null; categoria: 'cura' | 'sp' | 'stato' | 'battaglia' | 'esplorazione' | 'altro'; effetto: string; dove: string; prezzo: number | null; fonte: string; verificato: boolean; articolo?: string; negozi?: string[] }>;
  chiaveEMateriali: Array<{ nome: string; nomeEn: string | null; tipo: 'chiave' | 'materiale'; uso: string; dove: string; fonte: string; verificato: boolean; articolo?: string; negozi?: string[] }>;
  fabbricazione: { introduzione: string; sblocco: string; regole: string[]; fonte: string; ricette: Array<{ attrezzo: string; effetto: string; materiali: Array<{ nome: string; quantita: number | null }>; prodotti: number | null; sblocco: string | null; fonte: string; verificato: boolean }> };
  personalizzazioneArmi: { introduzione: string; requisiti: string; costi: string; effetti: Array<{ nome: string; effetto: string; costo: string | null }>; progressioneConfidente: unknown[]; note: string | null; fonte: string };
  abiti: { introduzione: string; elenco: Array<{ nome: string; per: string; dove: string; fonte: string }>; lavanderia: { dove: string; costo: string; regole: string[]; fonte: string } };
  scambi: Array<{ venditore: string; dove: string; quando: string; offerte: Array<{ ricevi: string; dai: string; note: string | null }>; fonte: string; verificato: boolean }>;
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
  covo: { introduzione: string; medaglie: string; sfide: Array<{ nome: string; requisito: string; medaglie: number | null }>; premi: Array<{ nome: string; costo: number | null; sblocco: string | null; effetto: string | null }>; fonte: string };
  dlc: Array<{ nome: string; contenuto: string; note: string | null; fonte: string }>;
  meteo: Array<{ condizione: string; effetti: string[]; fonte: string }>;
  nuovaPartitaPlus: { trasferito: string[]; nonTrasferito: string[]; note: string; fonte: string };
  differenzeRoyal: string[];
  tempo: { fasce: string[]; regole: string[]; fonte: string };
}

// ---- Guida giorno per giorno (Fase 7.5b) ----

export interface EffettiAzioneDto {
  /** `delta` sono i punti applicati; `note` le note della guida da cui derivano (1–3); `cinema` se «Anima da cineasta» ha alzato lo scalino. */
  doti: Array<{ chiave: string; nome: string; delta: number; note?: number; cinema?: boolean }>;
  confidente: { chiave: string; nome: string; noteRisposta: 1 | 2 | 3; punti: number; bonusArcano: boolean } | null;
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

export interface AzionePercorsoDto {
  indice: number;
  fascia: 'giorno' | 'sera';
  azione: string;
  tipo: 'confidente' | 'dote' | 'palazzo' | 'richiesta' | 'acquisto' | 'lavoro' | 'libro' | 'dvd' | 'attivita' | 'esame' | 'trama' | 'velluto' | 'altro';
  riferimento: RiferimentoAzioneDto | null;
  riferimentoTesto: string | null;
  rangoAtteso: number | null;
  note: string | null;
  /** Fatta nella partita. */
  fatta: boolean;
  /** Punti applicati alla spunta (Fase 12.3): Doti «+N» dalle note della guida e note del Confidente; annullati togliendo la spunta. */
  effetti: EffettiAzioneDto | null;
  /** Stato rispetto alla partita (solo con partita): consigliata/bloccata/neutra con motivo. */
  stato: StatoAzioneDto | null;
  /** Mappa (e spillo) collegati al luogo dell'azione: Palazzo, Mementos, negozio, luogo del Confidente. */
  mappa: { chiave: string; spilloId: number | null } | null;
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

export interface PercorsoGiornoDto {
  /** 'MM-GG' del calendario di gioco. */
  giorno: string;
  giornoSettimana: string;
  fase: string;
  trama: string;
  vincoli: string[];
  meteo: string | null;
  azioni: AzionePercorsoDto[];
  avvisi: string[];
  fonte: string;
  coperto: boolean;
  precedente: string | null;
  successivo: string | null;
  dataCorrente: string | null;
  fatte: number;
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
}

/** Disponibilità nella partita alla data corrente: «bloccato» con almeno un requisito rosso, «ignoto» se resta del grigio, altrimenti disponibile. */
export interface DisponibilitaDto {
  stato: 'disponibile' | 'bloccato' | 'ignoto';
  requisiti: SemaforoRequisitoDto[];
}

export interface ArticoloDto {
  condizioni?: CondizioneSpilloDto[];
  chiave: string;
  negozioChiave: string;
  negozioNome: string;
  nome: string;
  nomeIt: string | null;
  categoria: 'arma' | 'protezione' | 'accessorio' | 'abito' | 'consumabile' | 'regalo' | 'materiale' | 'cibo' | 'cura' | 'sp' | 'battaglia' | 'stato' | 'esplorazione' | 'oggetto-chiave' | 'libro' | 'film' | 'dvd' | 'videogioco' | 'altro';
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
  condizione: string | null;
  nota: string | null;
  verificato: boolean;
  /** Solo con `partita`: valutazione di `disponibileDal` e `condizione` alla data corrente (stessi requisiti dei semafori). */
  disponibilita?: DisponibilitaDto;
  /** Acquistato/ottenuto nella partita. */
  acquistato: boolean;
}

export interface NegozioDettaglioDto extends NegozioRiassuntoDto {
  note: string | null;
  articoliElenco: ArticoloDto[];
  acquistati: number;
}

export interface RicercaArticoliDto {
  articoli: ArticoloDto[];
  totale: number;
}

// ---- Cruciverba di Leblanc (Fase 7.5) ----

export interface CruciverbaDto {
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

export type DoteChiave = 'conoscenza' | 'fascino' | 'coraggio' | 'gentilezza' | 'perizia';

export interface IngressoQuartiereDto { mappa:string; nome:string; x:number; y:number; zoom:number }
export interface QuartiereRiassuntoDto {
  mappaChiave?:string;
  ingresso?:IngressoQuartiereDto|null;
  sbloccoData?:string|null;
  chiave: string;
  nome: string;
  sblocco: string | null;
  descrizione: string;
  luoghi: number;
  verificati: number;
  /** Il quartiere è già nel mondo, al punto in cui è la partita?
   *
   * Vero anche senza partita: senza non c'è niente da decidere. Le regole stanno in
   * `sblocco-quartieri.json` e non solo nella data: sette quartieri su ventitré ne hanno una, gli
   * altri si aprono col rango di un Confidente, con un libro letto o durante un Palazzo — e sono
   * chiusi lo stesso. La mappa di Tokyo mostra solo i quartieri disponibili. */
  disponibile?: boolean;
  /** Perché è chiuso, nelle parole del valutatore: «Yusuke: rango 1 di 3». Null se è aperto. */
  bloccoMotivo?: string | null;
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
  /** Posizione dello spillo sulla mappa del quartiere (percentuali), se fissato. */
  marcatore: { x: number; y: number } | null;
  /** La regola di **presenza** del luogo, quando ce n'è una scritta in `sblocco-luoghi.json`.
   *
   * `sblocco` qui sopra è la prosa della guida — «lettura del libro “Shitamachi rinato”» — e
   * nessuno la valutava: trentasette luoghi su ottantaquattro portavano una condizione che l'app
   * non guardava mai, e si vedevano tutti sempre. Questa è la stessa cosa nella forma che il
   * valutatore capisce. Null dove la guida non pone condizioni, o dove la condizione riguarda
   * l'**uso** e non l'esistenza (un lavoro che chiede Fascino 2: il posto c'è lo stesso). */
  condizioni: CondizioneSpilloDto[] | null;
  /** Se il luogo, al punto in cui è la partita, è già nel mondo. Null senza partita. */
  disponibilita: DisponibilitaDto | null;
}

export interface QuartiereDettaglioDto {
  mappaChiave?:string;
  ingresso?:IngressoQuartiereDto|null;
  sbloccoData?:string|null;
  chiave: string;
  nome: string;
  sblocco: string | null;
  descrizione: string;
  fonte: string;
  luoghi: LuogoDto[];
  /** Immagine della mappa presente nell'istanza (ambito «mappa», chiave `citta-<quartiere>`). */
  mappa: boolean;
  /** Collegamento alla mappa pubblicata (null se nessuna fonte la offre). */
  pianta: PiantaAreaDto | null;
  piantaAssente: string | null;
}

export interface AttivitaDto {
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
  altriEffetti: string | null;
  regole: string;
  premi: string | null;
  paga: string | null;
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
  /** Il luogo della città dove si svolge (migrazione 072). */
  sedeChiave: string | null;
  sedeNome: string | null;
  verificato: boolean;
  /** La disponibilità scritta dalla guida, tradotta in regola (migrazione 052): «dal 18 aprile»,
   *  «dal 24 aprile», «5 giugno, evento con Ryuji». Null dove la guida non dice niente. */
  condizioni: CondizioneSpilloDto[] | null;
  /** Se la riga, al punto in cui è la partita, è già disponibile. Null senza partita. */
  disponibilita: DisponibilitaDto | null;
}

export interface LibroDto {
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
  tipo: 'videogioco';
  /** Dove si compra: gli articoli collegati (migrazione 073). */
  negozi: Array<{ articolo: string; negozio: string; negozioNome: string; prezzo: number | null }>;
  totaleRound: number;
  progresso: number;
  iniziato: boolean;
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
  personaCollegata: { id: number; nome: string; nomeIt: string } | null;
}

export interface BattagliaDto {
  fonti: { principale: string; note: string };
  sistema: { urlFonte: string; avvioScontro: string; comandi: string[]; esitiColpo: { debole: string; critico: string; tecnico: string; block: string; resiste: string }; unoMore: string; statiAlterati: Array<{ stato: string; effetto: string }>; notaFineBattaglia: string };
  assaltoEHoldUp: { urlFonte: string; rapina: string; assalto: string; holdUp: string };
  tecnico: { urlFonte: string; stati: Array<{ stato: string; elementi: string[] }> };
  staffetta: { urlFonte: string; cosaE: string; disponibilita: string; effetto: string; livelli: string; indicatoriVisivi: string; ranghi: Array<{ rango: number; bonus: string }>; moltiplicatori: string; effettoSpeciale: string };
  speciali: { urlFonte: string; meccanica: string; attivazione: string; proprietaDanno: string; elenco: Array<{ nome: string; personaggi: string[]; sblocco: string }> };
  negoziazione: { urlFonti: string[]; quandoSiPuoNegoziare: string; opzioniHoldUp: Array<{ opzione: string; effetto: string }>; comeVerificarePersonalita: string; personalita: Array<{ nome: string; descrizione: string; risposteEfficaci: string[]; risposteDaEvitare: string[] }>; regole: string[]; incertezze: string };
  ombreSciagura: { nomeOriginale: string; urlFonte: string; cosaSono: string; comeRiconoscerle: string; caratteristiche: string[]; comportamentoInBattaglia: { turnoProprio: string; quandoAttaccate: string; comeNeutralizzarle: string }; effettiStati: { immobilizzanti: string[]; soggiogamento: string; furia: string }; esplosioneAllaSconfitta: { descrizione: string; potenza: string; eccezioni: string }; ricompense: string; doveCompaiono: string; elenco: string[] | null; incertezze: string };
  mietitore: { categoria: string; urlFonte: string; dove: string; comeSiManifesta: string; livelloConsigliato: string; abilita: string[]; immunita: string[]; debolezze: string[] | null; strategia: string[]; ricompense: string };
  demoniTesoro: { categoria: string; urlFonte: string; cosaSono: string; comeCompaiono: string; primaComparsa: string; comportamento: string; resistenzeGenerali: string; tecnicheConsigliate: string[]; elenco: Array<{ nome: string; livello: number; arcano: string; dove: string }> };
  ombre: OmbraDto[];
}

// ---- Richieste dei Mementos e Jose (Fase 7.2) ----

export type StatoRichiesta = 'accettata' | 'completata';

export interface RichiestaDto {
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
}

export interface RichiesteDto {
  richieste: RichiestaDto[];
  jose: JoseDto | null;
  /** I dedali che hanno richieste, nell'ordine di percorrenza, con i conteggi. */
  dedali: Array<{ chiave: string; nome: string; ordine: number; totale: number; completate: number }>;
  completate: number;
  totale: number;
}

// ---- Dungeon: Palazzi e Dedali (Fase 7.1) ----

export type StatoPunto = 'ottenuto' | 'esaurito';

export interface PuntoInteresseDto {
  chiave: string;
  ordine: number;
  tipo: 'sicura' | 'forziere' | 'forziere-chiuso' | 'volonta' | 'puzzle' | 'miniboss' | 'boss' | 'ombra-sciagura' | 'persona' | 'oggetto' | 'scorciatoia' | 'altro';
  nome: string;
  descrizione: string;
  esauribile: boolean;
  dettagli: Record<string, unknown>;
  fonte: string;
  /** Stato nella partita (null = da gestire o senza partita). */
  stato: StatoPunto | null;
  /** Posizione dello spillo sulla mappa dell'area (percentuali), se fissato. */
  marcatore: { x: number; y: number } | null;
}

export interface AreaDungeonDto {
  chiave: string;
  ordine: number;
  nome: string;
  descrizione: string;
  /** Immagine della pianta presente nell'istanza (ambito «mappa»). */
  mappa: boolean;
  /** Fonte da cui la pianta presente è stata davvero scaricata (principale o alternativa); null se caricata dall'utente o assente. */
  piantaScaricata: { url: string; fonte: string; pagina: string | null } | null;
  /** Collegamento alla pianta pubblicata (null se nessuna guida la offre). */
  pianta: PiantaAreaDto | null;
  /** Motivo dell'assenza della pianta, se noto (es. piani generati proceduralmente). */
  piantaAssente: string | null;
  /** Le planimetrie native dell'atlante legate a quest'area (`mappa_entita`), in ordine.
   *
   * Servono alla scheda del Palazzo per **mostrare la mappa invece di un rimando**. L'area della
   * guida non è un nodo dell'atlante — il risolutore, interrogato sulla sua chiave, risponde
   * «contenuto di guida» — quindi chiedergli la mappa dell'area dava sempre niente, e sulla scheda
   * al posto del visore compariva un riquadro vuoto con dentro un collegamento. Il legame però
   * c'è ed è dichiarato: 72 aree su 116 hanno una planimetria nativa. Qui viene esposto, così la
   * scheda la monta. Vuoto per le aree che non ne hanno (i piani dei Memento, per esempio). */
  mappe: Array<{ chiave: string; nome: string; /** Quanti collezionabili ha la mappa e quanti sono raccolti (null senza partita). */ n: number; presi: number | null; spilli: SpilloRaccoltaDto[] }>;
  punti: PuntoInteresseDto[];
  /** Solo per i dedali dei Memento: gli obiettivi misurabili (timbri e richieste); null se la guida non ne dichiara. */
  dedalo: DedaloDto | null;
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

/** Gli obiettivi di un dedalo dei Memento: timbri da raccogliere e richieste da completare. */
export interface DedaloDto {
  timbri: { totale: number | null; raccolti: number | null };
  richieste: Array<{ chiave: string; nome: string; stato: StatoRichiesta | null }>;
  /** totale = timbri dichiarati + richieste; fatti = timbri raccolti + richieste completate (null senza partita). */
  obiettivi: { totale: number; fatti: number | null };
}

export interface DungeonRiassuntoDto {
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
   *  senza sbagliarne qualcuna in silenzio: questa viene da `finestre-dungeon.json`, trascritto a
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
}

/** Pianta dell'area pubblicata da una guida: solo collegamento e credito; l'immagine si scarica nell'istanza al primo uso. */
export interface PiantaAreaDto {
  url: string;
  pagina: string | null;
  fonte: string;
  licenza: string;
  larghezza: number | null;
  altezza: number | null;
  /** «area» se la pianta è dell'area, «dungeon» se copre più aree, «quartiere» per le mappe della città. */
  copertura: string;
  note: string;
  alternative: Array<{ url: string; pagina: string | null; fonte: string }>;
}

export interface DungeonDettaglioDto extends Omit<DungeonRiassuntoDto, 'aree'> {
  note: string;
  fonti: string[];
  aree: AreaDungeonDto[];
  /** Tutte le planimetrie del Palazzo (l'albero sotto `dungeon-<chiave>`) che hanno collezionabili, con
   *  quanti sono e quali: la maggior parte non è legata a un'area della guida, quindi non compare in
   *  `aree[].mappe`. Vuoto per i Memento, che contano gli obiettivi dei dedali. */
  planimetrie: Array<{ chiave: string; nome: string; n: number; presi: number | null; spilli: SpilloRaccoltaDto[] }>;
}

// ---- Calendario di gioco (Fase 6.3) ----

export interface GiornoCalendarioDto {
  data: string;
  giornoSettimana: string;
  meteo: string | null;
  eventi: Array<{ id: number; tipo: 'storia' | 'scadenza' | 'sblocco' | 'esame' | 'festa' | 'vacanza' | 'consiglio' | 'meteo'; titolo: string; dettaglio: string; fonte: string }>;
  tempoLibero: { giorno: boolean; sera: boolean } | null;
  /** Numero della «Soluzione per settimana» della guida. */
  settimana: number | null;
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

export interface MappaRiassuntoDto {
  ruoloImmagine?: RuoloImmagine;
  /** Ordinale di una collezione presentativa di immagini omonime, mai numero di piano. */
  immagineCollezione?: {indice:number;totale:number;ambito:string};
  contesti?: Array<{id:string;nome:string|null;campo:string;texpack:number}>;
  gruppoImmagini?: {id:string;nome:string;ordine:number;etichetta?:string};
  nomeCompleto?: string;
  genitoreNome?: string|null;
  assetOriginale?: string|null;
  chiave: string;
  nome: string;
  tipo: TipoMappa;
  genitore: string | null;
  ordine: number;
  /** Immagine di base caricata nell'istanza (null se assente). */
  immagineUrl: string | null;
  /** Asset del repository usato come immagine di base quando manca quella dell'istanza (es. `mappe/citta-shibuya`). */
  asset: string | null;
  entita: { tipo: string; chiave: string } | null;
  origine: 'seed' | 'utente';
  numeroSpilli: number;
  numeroFigli: number;
  updatedAt: string;
}

export interface DettaglioSpilloDto {
  tipo: TipoRiferimento;
  /** Immagine dell'entità collegata quando esiste (mappa: sua immagine di base o asset; Confidente: ritratto caricato o asset). */
  immagine?: { url: string | null; asset: string | null } | null;
  mappa?: { chiave: string; nome: string; tipo: TipoMappa };
  punto?: { chiave: string; tipo: string; nome: string; descrizione: string; esauribile: boolean; dungeon: string; area: string; stato: string | null };
  luogo?: { chiave: string; quartiere: string; tipo: string; nome: string; cosaOffre: string; quando: string | null };
  negozio?: { chiave: string; nome: string; tipo: string; disponibilita?: DisponibilitaDto; articoli: Array<{ chiave: string; nome: string; categoria: string; prezzo: number | null; disponibileDal: string | null; comprato: boolean; disponibilita?: DisponibilitaDto }> } | null;
  confidente?: { chiave: string; nome: string; arcanaNome: string };
  richiesta?: { chiave: string; nome: string; stato: string | null };
}

/** Condizione di visibilità con il testo in italiano pronto per la scheda. */
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
  /** Raccolto nella partita (o punto già gestito nella Guida). */
  raccolto: boolean;
  dettaglio: DettaglioSpilloDto | null;
  /** Schermate di riferimento (istanza o asset del repository), in ordine. */
  immagini: ImmagineSpilloDto[];
  updatedAt: string;
}

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
  /** Dalla radice a questa mappa. */
  percorso: Array<{ chiave: string; nome: string }>;
  figli: MappaRiassuntoDto[];
  spilli: SpilloDto[];
}

/** Pacchetto di esportazione/importazione (versione 1); il seed `mappe-editor.json` usa lo stesso formato senza `immagini`. */
export interface EsportazioneMappeDto {
  ingressi?:Array<{quartiere:string;mappa:string;x:number;y:number;zoom:number}>;
  versione: 1;
  esportato?: string;
  mappe: Array<{
    ruoloImmagine?: RuoloImmagine;
    contesti?: Array<{id:string;nome:string|null;campo:string;texpack:number}>;
    gruppoImmagini?: {id:string;nome:string;ordine:number;etichetta?:string};
    assetOriginale?: string|null;
    chiave: string; nome: string; tipo: TipoMappa; genitore: string | null; ordine: number; immagine: string | null; asset: string | null; larghezza: number | null; altezza: number | null;
    entita: { tipo: string; chiave: string } | null; note: string;
    spilli: Array<{ /** Identità stabile dello spillo (067): la porta il pacchetto, così «raccolto» la ritrova. */ uid?: string; soloPosizione?: boolean; nativo?: NativoSpilloDto | null; destinazione?: DestinazionePacchetto | null; destinazioneNonDisponibile?: boolean; tipo: TipoSpillo; nome: string; descrizione: string; x: number; y: number; riferimento: { tipo: TipoRiferimento; chiave: string } | null; collezionabile: boolean; ordine: number; condizioni?: RequisitoSpillo[]; immagini?: Array<{ asset?: string | null; mime?: string; base64?: string; didascalia: string }> }>;
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
  seed: { versione: string | null; hash: string | null; caricatoIl: string | null };
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
  /** Immagini con contenuto, dentro l'uno e l'altro file. */
  immagini: { istanza: number; pacchetto: number };
  orfani: OrfanoPartiteDto[];
}

/** A che punto è l'importazione del pacchetto, mentre la si aspetta.
 *
 * Serve perché l'attesa può superare quella di chi sta davanti: un proxy (Cloudflare si ferma a cento
 * secondi) chiude la connessione mentre il server sta ancora sostituendo i dati, e il browser lo
 * leggerebbe come un fallimento. Chiedendo lo stato si sa se sta ancora lavorando, e com'è finita.
 */
export type FaseImportazionePacchetto = 'scarico' | 'verifica' | 'copia-di-sicurezza' | 'sostituzione' | 'riapertura' | 'controllo';

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

/** Esito dell'importazione: che cosa è cambiato e quali riferimenti delle partite sono rimasti orfani. */
export interface EsitoImportazionePacchettoDto {
  copiaDiSicurezza: string;
  versioneSchemaPacchetto: number;
  versioneSchema: number;
  migrazioniApplicate: number;
  /** Immagini con contenuto nei dati di gioco dopo l'importazione. */
  immagini: number;
  orfani: OrfanoPartiteDto[];
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

/** Gli stati di una partita per le condizioni: calcolati dalla partita e da segnare a mano (Partita → Progressi). */
export interface ProgressiPartitaDto {
  /** `calcolato`: dalla squadra (tre stati: sì, no, non segnato); `manuale`: la spunta. */
  eventi: Array<{ chiave: string; nome: string; origine: 'manuale' | 'calcolato'; avvenuto: boolean | null; membro?: string; membroNome?: string }>;
  /** Le sole attività che si contano per volte svolte. */
  attivita: Array<{ chiave: string; nome: string; tipo: string; volte: number }>;
  /** I negozi con programma punti manuale. */
  puntiNegozio: Array<{ negozio: string; nome: string; programma: string; unita: string; punti: number }>;
  /** I negozi con il grado cliente: dalla spesa segnata, con la prossima soglia. */
  rangoCliente: Array<{ negozio: string; nome: string; programma: string; spesa: number; rango: { chiave: string; nome: string }; prossimo: { chiave: string; nome: string; spesa: number } | null }>;
  contatori: Array<{ chiave: string; nome: string; valore: number }>;
}

/** I timbri raccolti in un dedalo dei Memento, per partita. */
export interface TimbriDedaloDto { area: string; raccolti: number; totale: number | null; completato: boolean }
export type TipoCatalogo = (typeof TIPI_CATALOGO)[number];

/** Un oggetto che l'app già conosce, offerto a chi mette un articolo in vendita.
 *
 * Serve a non ribattere a mano quel che l'archivio ha già, e soprattutto a **dire** che l'articolo
 * del negozio e l'oggetto della guida sono la stessa cosa: finora quel legame lo indovinava un
 * ponte per nome, che su 355 oggetti e 575 articoli ne aggancia 121. */
export interface OggettoSelezionabileDto {
  /** Identificatore stabile dentro la sua `fonte`: con `fonte` forma il collegamento. */
  chiave: string;
  /** La categoria d'articolo che compete all'oggetto: sceglierlo la imposta da sé. */
  categoria: string;
  nome: string;
  nomeIt: string | null;
  effetto: string | null;
  statistiche: string | null;
  /** Vincolo di equipaggiamento, che nel modulo è «Per chi». */
  per: string | null;
  prezzo: number | null;
  /** L'archivio da cui viene, mostrato a chi sceglie. */
  fonte: 'equipaggiamento' | 'guida' | 'libri' | 'film' | 'videogiochi';
}

/** Una riga del catalogo con la sua provenienza: creata dall'utente, corretta sopra il seed, o nascosta. */
export interface ElementoCatalogoDto {
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

// ---- Agenda del giorno: eventi e cose da fare dell'utente (16.1) ----

/** Evento aggiunto dall'utente a una data del calendario; senza `partita` vale per tutte le partite. */
export interface EventoUtenteDto {
  id: number;
  partitaId: number | null;
  /** Giorno del calendario di gioco ('MM-GG'). Si chiama «giorno» e non «data» perché l'envelope `{ data }` delle risposte lascia intatti gli oggetti che hanno già una chiave `data`. */
  giorno: string;
  tipo: 'evento' | 'scadenza' | 'promemoria';
  titolo: string;
  dettaglio: string;
  riferimento: { tipo: string; chiave: string } | null;
  ordine: number;
}

/** Cosa da fare aggiunta dall'utente a una data e fascia; si spunta come le azioni della guida. */
export interface AzioneUtenteDto {
  id: number;
  partitaId: number | null;
  /** Giorno del calendario di gioco ('MM-GG'); vedi la nota su EventoUtenteDto. */
  giorno: string;
  fascia: FasciaGioco;
  tipo: string;
  azione: string;
  riferimento: { tipo: string; chiave: string } | null;
  rangoAtteso: number | null;
  note: string | null;
  ordine: number;
  /** Spuntata nella partita indicata. */
  fatta: boolean;
}

export interface AgendaGiornoDto {
  giorno: string;
  eventi: EventoUtenteDto[];
  azioni: AzioneUtenteDto[];
}
