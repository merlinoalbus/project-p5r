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
  nome: string;
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

export interface DoteSocialePartitaDto {
  chiave: string;
  nome: string;
  ordine: number;
  punti: number;
  updatedAt: string | null;
}

export interface ConfidentePartitaDto extends ConfidenteDto {
  sbloccato: boolean;
  rango: number;
  note: string;
  updatedAt: string | null;
}

export interface CompendioPartitaDto {
  personaId: number;
  nome: string;
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
  arcana: string;
  arcanaNome: string;
  livelloBase: number;
  livello: number;
  statistiche: StatisticheDto;
  /** true se le statistiche sono quelle base della Persona (nessun potenziamento registrato). */
  statisticheBase: boolean;
  tratto: SkillRiassuntoDto | null;
  inSquadra: boolean;
  note: string;
  skill: Array<{ slot: number } & SkillRiassuntoDto>;
  createdAt: string;
  updatedAt: string;
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
}
