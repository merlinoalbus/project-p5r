// ============================================================
// Tipi del seed (data/seed/*.json) — condivisi fra scripts/seed e server
// ============================================================
//
// Solo tipi: nessun import di runtime. Prodotti da scripts/seed/normalizzaDataset.ts,
// consumati da server/services/seed/caricaSeed.ts e dal frontend.
// ============================================================

/** Persona del compendio Royal. */
export interface PersonaSeed {
  nome: string;
  arcana: string;
  livello: number;
  /** Tipo di eredità delle skill (chiave di TIPI_EREDITA); null per i Demoni del Tesoro. */
  eredita: string | null;
  speciale: boolean;
  rara: boolean;
  dlc: boolean;
  /** Richiede il rango massimo del Confidente dell'arcano (Persona finali). */
  richiedeConfidenteMax: boolean;
  nota: string | null;
  oggetto: string;
  oggettoAllarme: string;
  /** true se l'esecuzione produce una carta abilità. */
  oggettoECarta: boolean;
  tratto: string;
  /** 10 codici (ordine ELEMENTI_AFFINITA): '-', 'wk', 'rs', 'nu', 'rp', 'ab'. */
  affinita: string[];
  statistiche: { forza: number; magia: number; resistenza: number; agilita: number; fortuna: number };
  /** Skill con livello di apprendimento (0 = innata), in ordine di livello. */
  skill: Array<{ nome: string; livello: number }>;
  /** Aree di Mementos dove si incontra (vuoto se non catturabile). */
  areeMementos: string[];
  pianiMementos: string | null;
}

/** Skill del compendio Royal. */
export interface SkillSeed {
  nome: string;
  elemento: string;
  /** Costo: SP, percentuale di HP o nessuno (passive/tratti). */
  costo: { tipo: 'sp' | 'hp' | 'nessuno'; valore: number };
  effetto: string;
  /** Persona la cui esecuzione produce la carta di questa skill. */
  fontiEsecuzione: string[];
  /** Provenienza alternativa della carta abilità (evento, negozio…). */
  fonteCarta: string | null;
  /** Ombra da cui si ottiene per negoziazione. */
  negoziazione: string | null;
  /** Fonte esclusiva (Persona di un compagno, anello, nemici…), testo libero del dataset. */
  unica: string | null;
}

/** Oggetto ottenibile per esecuzione. */
export interface OggettoSeed {
  nome: string;
  categoria: string;
  vincolo: string | null;
  descrizione: string;
}

/** Regole di fusione. */
export interface FusioneSeed {
  arcani: string[];
  tabella: Array<{ a: string; b: string; risultato: string }>;
  speciali: Array<{ risultato: string; ingredienti: string[] }>;
  tesori: { nomi: string[]; modificatori: Record<string, number[]> };
  eredita: { tipi: string[]; colonne: string[]; matrice: Record<string, boolean[]> };
  dlc: string[][];
}

/** Confidente (dato di gioco). */
export interface ConfidenteSeed {
  chiave: string;
  nome: string;
  arcana: string;
  /** Punti necessari per passare dal rango i+1 al successivo (indice 0 = 1→2); null = non documentato/da storia. */
  puntiPerRango?: Array<number | null>;
}

/** Dote sociale con i 5 ranghi. */
export interface DoteSeed {
  chiave: string;
  nome: string;
  ranghi: Array<{ rango: number; nome: string; soglia: number }>;
}

/** Glossario italiano. */
export interface TraduzioniSeed {
  arcani: Array<{ chiave: string; nome: string; numero: number | null }>;
  elementiSkill: Record<string, string>;
  elementiAffinita: Array<{ chiave: string; nome: string; sigla: string }>;
  affinita: Record<string, { nome: string; sigla: string }>;
  tipiEredita: Record<string, string>;
  colonneEredita: Array<{ chiave: string; nome: string }>;
  statistiche: Array<{ chiave: string; nome: string; sigla: string }>;
  tipiOggetto: Record<string, string>;
  vincoliOggetto: Record<string, string>;
  areeMementos: Record<string, string>;
  dotiSociali: Array<{ chiave: string; nome: string }>;
  notePersona: Record<string, string>;
  fontiEsclusive: Record<string, string>;
  /** Effetto skill EN → IT (copre il 100% degli effetti del seed). */
  effettiSkill: Record<string, string>;
  /** Descrizione oggetto EN → IT (copertura 100%). */
  descrizioniOggetti: Record<string, string>;
  /** Titolo dell'Ombra per la negoziazione EN → IT (traduzione non ufficiale, copertura 100%). */
  negoziazioni: Record<string, string>;
  /** Fonte carta del dataset → resa italiana (copertura 100%). */
  fontiCarta: Record<string, string>;
  /** Nome skill EN canonico → nome italiano ufficiale (dalla guida; copertura parziale, fallback al nome canonico). */
  skill: Record<string, string>;
  /** Nome Persona EN → nome italiano (solo quando diverso). */
  persone: Record<string, string>;
  /** Termini di gioco della localizzazione italiana. */
  termini: TermineSeed[];
}

/** Termine di gioco: chiave inglese, resa italiana ufficiale, categoria e breve definizione. */
export interface TermineSeed {
  chiave: string;
  nome: string;
  categoria: string;
  definizione?: string;
  fonte?: string;
}

/** Elenco delle stringhe prive di traduzione, per categoria. */
export interface Mancanti {
  effetti: string[];
  oggetti: string[];
  negoziazioni: string[];
  fontiCarta: string[];
  note: string[];
  fontiEsclusive: string[];
}
