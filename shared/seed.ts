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
/** Aiuto in battaglia (guida allgamestaff): sezioni testuali e indice delle Ombre; stessa forma del DTO senza il collegamento alle Persona. */
export type BattagliaSeed = Record<string, unknown> & { ombre: Array<{ dungeonChiave: string; persona: string | null; ombra: string | null }> };

/** Cruciverba di Leblanc (guida allgamestaff). */
export interface CruciverbaSeed { cruciverba: Array<{ data: string; ordine: number; indizio: string; risposta: string; rispostaEn: string | null; fonte: string }> }

/** Città: quartieri e luoghi (guida allgamestaff + fonti secondarie segnalate da `verificato`). */
export interface CittaSeed {
  quartieri: Array<{ chiave: string; ordine: number; nome: string; sblocco: string | null; descrizione: string; fonte: string;
    luoghi: Array<{ chiave: string; ordine: number; tipo: string; nome: string; cosaOffre: string; quando: string | null; giorni: string | null; sblocco: string | null; confidenti: string[]; attivita: string[]; negozio: string | null; piatti: Array<{ nome: string; prezzo: number | null; effetto: string }> | null; note: string | null; fonte: string; verificato: boolean }> }>;
}

/** Attività del tempo libero (compresi i lavori), libri e film. */
export interface AttivitaSeed {
  attivita: Array<{ chiave: string; ordine: number; nome: string; tipo: string; luogo: string; luogoChiave: string | null; fascia: string | null; costo: number | null; sblocco: string | null; doti: Array<{ dote: string; note: number | null; condizione: string | null }>; altriEffetti: string | null; regole: string; premi: string | null; paga: string | null; fonte: string; verificato: boolean }>;
  libri: Array<{ chiave: string; ordine: number; nome: string; nomeIt: string | null; dove: string; prezzo: number | null; disponibileDal: string | null; dote: string | null; note: number | null; sblocca: string | null; sessioni: number | null; dettagli: string | null; fonte: string; verificato: boolean }>;
  film: Array<{ chiave: string; ordine: number; nome: string; nomeIt: string | null; dove: 'cinema' | 'dvd'; periodo: string; dote: string | null; note: number | null; prezzo: number | null; dettagli: string | null; fonte: string; verificato: boolean }>;
}

/** Richieste dei Mementos e Jose (guida allgamestaff). */
export interface MementosSeed {
  richieste: Array<{ chiave: string; nome: string; committente: string; disponibileDal: string; scadenza: string; area: string; areaChiave: string | null; piano: string; bersaglio: { nome: string; livello: number | null; formaDemoniaca: string; debolezze: string[]; resistenze: string[]; vulnerabileConfusione: boolean }; ricompense: string[]; confidente: { chiave: string; rango?: number | null } | null; note: string; fonte: string }>;
  jose: Record<string, unknown>;
}

/** Dungeon (Palazzi e Dedali) con aree e punti di interesse (guida allgamestaff). */
export interface DungeonSeed {
  chiave: string;
  tipo: 'palazzo' | 'mementos';
  ordine: number;
  nome: string;
  sovrano: string;
  arcanaSovrano: string;
  date: { sblocco: string; scadenza: string; furtoConsigliato: string };
  livelloConsigliato: string;
  note: string;
  aree: Array<{ chiave: string; ordine: number; nome: string; descrizione: string; punti: Array<{ ordine: number; tipo: string; nome: string; descrizione: string; esauribile: boolean; dettagli: Record<string, unknown>; fonte: string }> }>;
  fonti: string[];
}

/** Calendario di gioco (guida allgamestaff; meteo da wikiwiki.jp). */
export interface CalendarioSeed {
  giorni: Array<{ data: string; giornoSettimana: string; meteo: string | null; eventi: Array<{ tipo: string; titolo: string; dettaglio: string; fonte: string }>; tempoLibero: { giorno: boolean; sera: boolean } | null }>;
  settimane: Array<{ numero: number; titolo: string; periodo: string; url: string; riassunto: string; incertezze: string }>;
}

/** Domande in classe ed esami (guida allgamestaff). */
export interface DomandeSeed {
  domande: Array<{ data: string; tipo: 'classe' | 'esame-medio' | 'esame-finale' | 'altro'; chi: string; domanda: string; risposte: Array<{ ordine: number | null; testo: string }>; ricompensa: string; note: string; fonte: string }>;
  esami: Array<{ chiave: string; nome: string; date: string[]; dataRisultati: string | null; domande: Array<{ data: string; ordine: number; domanda: string; risposta: string }>; note: string }>;
  premi: Record<string, unknown>;
}

/** Dettaglio di un Confidente (guida allgamestaff): abilità, dialoghi con le risposte migliori, regali, disponibilità. */
export interface ConfidenteDettaglioSeed {
  chiave: string;
  abilita: Array<{ rango: number; nome: string; descrizione: string }>;
  dialoghi: Array<{ rango: number | null; etichetta: string; note: string; scelte: Array<{ ordine: number | null; testo: string; punti: number | null; puntiTesto: string | null; romantica: boolean; avviso?: string | null }> }>;
  regali: Array<{ nome: string; dove: string | null; costo: string | null; effetto: string | null }>;
  regaliSconsigliati: string[];
  disponibilita: { giorni: string[]; fasce: string[]; luogo: string; sbloccoData: string; sbloccoRequisiti: string; note: string };
  noteGenerali: string;
  fonti: string[];
}

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
