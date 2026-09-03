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
  risultato: { id: number; nome: string };
  ingredienti: Array<{ id: number; nome: string }>;
}

/** Scheda completa di una Persona. */
export interface PersonaDettaglioDto extends PersonaRiassuntoDto {
  nota: string | null;
  notaNome: string | null;
  oggetto: string;
  oggettoAllarme: string;
  oggettoECarta: boolean;
  oggettoDescrizione: string | null;
  oggettoAllarmeDescrizione: string | null;
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

export interface OggettoDto {
  id: number;
  nome: string;
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
  tesori: { nomi: string[]; modificatori: Record<string, number[]> };
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
}

/** Elenco di ricette (per ottenere una Persona, o con una Persona come ingrediente). */
export interface RicetteFusioneDto {
  persona: PersonaFusioneDto;
  totale: number;
  totaleSenzaFiltri: number;
  ricette: RicettaFusioneDto[];
  dlcPosseduti: number[];
  livelloMax: number | null;
}

/** Nodo di un piano di fusione ricorsivo. */
export interface NodoPianoDto {
  persona: PersonaFusioneDto;
  modo: 'scorta' | 'registro' | 'cattura' | 'fusione';
  costo: number;
  tipo?: TipoFusione;
  figli: NodoPianoDto[];
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
  opzioni: { profondita: number; alternative: number; catture: boolean; livelloMax: number | null };
  /** Esemplari in scorta e Persona nel Registro considerati (dalla partita). */
  disponibilita: { scorta: number; registro: number };
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

export interface PartitaDto {
  id: number;
  nome: string;
  note: string;
  attiva: boolean;
  livelloProtagonista: number;
  dataGioco: string | null;
  difficolta: Difficolta;
  nuovaPartitaPlus: boolean;
  dlcPosseduti: number[];
  allarmeAttivo: boolean;
  createdAt: string;
  updatedAt: string;
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
  note: string;
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
  updatedAt: string;
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
  /** Statistiche al livello attuale: registrate dall'utente oppure stimate (+3 punti per livello dalla base). */
  statistiche: StatisticheDto;
  /** true se nessun valore è stato registrato dall'utente: `statistiche` è la stima per il livello. */
  statisticheBase: boolean;
  /** Statistiche base della Persona al suo livello base (per il confronto). */
  statisticheBaseLivello: StatisticheDto;
  tratto: SkillRiassuntoDto | null;
  inSquadra: boolean;
  note: string;
  skill: Array<{ slot: number } & SkillRiassuntoDto>;
  createdAt: string;
  updatedAt: string;
}

// ---- Immagini ----

/** Voce del catalogo dei riferimenti (solo link) con lo stato nella propria istanza. */
export interface VoceCatalogoDto {
  ambito: 'arcana' | 'confidente' | 'persona' | 'skill' | 'altro';
  chiave: string;
  url: string;
  fonte: string | null;
  nota: string | null;
  /** true se nell'istanza esiste già un'immagine per l'entità (caricata o importata). */
  presente: boolean;
}

/** Esito di un lotto di importazione dal catalogo. */
export interface EsitoImportazioneCatalogoDto {
  importate: string[];
  saltate: string[];
  fallite: Array<{ chiave: string; motivo: string }>;
}

export interface ImmagineDto {
  id: number;
  ambito: string;
  chiave: string;
  mime: string;
  byte: number;
  url: string;
  createdAt: string;
}
