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
  /** Regali già consegnati in questa partita (nomi). */
  regaliFatti: string[];
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
  opzioni: { lunghezzaMax: number; alternative: number; catture: boolean; livelloMax: number | null };
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
  /** Data di gioco «MM-GG». */
  data: string;
  tipo: 'classe' | 'esame-medio' | 'esame-finale' | 'altro';
  chi: string;
  domanda: string;
  /** Risposte corrette in ordine (più passi per le domande a catena). */
  risposte: Array<{ ordine: number | null; testo: string }>;
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
  /** Prossime domande non fatte a partire dalla data di gioco della partita (massimo 5). */
  prossime: DomandaDto[];
  fatte: number;
  totale: number;
}

// ---- Oggetti della guida (Fase 10.2) ----

export interface OggettiGuidaDto {
  consumabili: Array<{ nome: string; nomeEn: string | null; categoria: 'cura' | 'sp' | 'stato' | 'battaglia' | 'esplorazione' | 'altro'; effetto: string; dove: string; prezzo: number | null; fonte: string; verificato: boolean }>;
  chiaveEMateriali: Array<{ nome: string; nomeEn: string | null; tipo: 'chiave' | 'materiale'; uso: string; dove: string; fonte: string; verificato: boolean }>;
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

export interface RiferimentoAzioneDto {
  tipo: 'confidente' | 'dungeon' | 'richiesta' | 'libro' | 'film' | 'attivita' | 'negozio' | 'dote';
  chiave: string;
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
  chiave: string;
  nome: string;
  luogo: string;
  luogoChiave: string | null;
  quartiereNome: string | null;
  tipo: 'armi' | 'protezioni' | 'accessori' | 'oggetti' | 'regali' | 'abiti' | 'cibo' | 'online' | 'distributore' | 'materiali' | 'misto' | 'altro';
  gestore: string | null;
  confidente: { chiave: string; nome: string } | null;
  orari: string | null;
  sblocco: string | null;
  articoli: number;
  verificati: number;
}

export interface ArticoloDto {
  chiave: string;
  negozioChiave: string;
  negozioNome: string;
  nome: string;
  nomeIt: string | null;
  categoria: 'arma' | 'protezione' | 'accessorio' | 'abito' | 'consumabile' | 'regalo' | 'materiale' | 'cibo' | 'altro';
  /** Personaggio destinatario, «tutti», «party» o null se non indicato. */
  per: string | null;
  prezzo: number | null;
  effetto: string | null;
  statistiche: string | null;
  disponibileDal: string | null;
  condizione: string | null;
  nota: string | null;
  fonte: string;
  verificato: boolean;
  /** Acquistato/ottenuto nella partita. */
  acquistato: boolean;
}

export interface NegozioDettaglioDto extends NegozioRiassuntoDto {
  note: string | null;
  fonte: string;
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
  indizio: string;
  risposta: string;
  rispostaEn: string | null;
  fonte: string;
  /** Risolto nella partita. */
  fatto: boolean;
}

export interface CruciverbaTuttiDto {
  cruciverba: CruciverbaDto[];
  risolti: number;
  totale: number;
}

// ---- Città, attività, libri e film (Fase 8.1) ----

export type DoteChiave = 'conoscenza' | 'fascino' | 'coraggio' | 'gentilezza' | 'perizia';

export interface QuartiereRiassuntoDto {
  chiave: string;
  nome: string;
  sblocco: string | null;
  descrizione: string;
  luoghi: number;
  verificati: number;
}

export interface LuogoDto {
  chiave: string;
  ordine: number;
  tipo: 'negozio' | 'ristorante' | 'attivita' | 'confidente' | 'servizio' | 'distributore' | 'punto-interesse' | 'scuola' | 'trasporto' | 'altro';
  nome: string;
  cosaOffre: string;
  quando: 'giorno' | 'sera' | 'entrambe' | null;
  giorni: string | null;
  sblocco: string | null;
  confidenti: Array<{ chiave: string; nome: string }>;
  attivita: string[];
  negozio: string | null;
  piatti: Array<{ nome: string; prezzo: number | null; effetto: string }> | null;
  note: string | null;
  fonte: string;
  /** false = dato da fonte secondaria, non confermato sulla guida italiana. */
  verificato: boolean;
  /** Posizione dello spillo sulla mappa del quartiere (percentuali), se fissato. */
  marcatore: { x: number; y: number } | null;
}

export interface QuartiereDettaglioDto {
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
  /** `dote` nulla = effetto su una Dote variabile/non confermata, spiegato in `condizione`. */
  doti: Array<{ dote: DoteChiave | null; note: number | null; condizione: string | null }>;
  altriEffetti: string | null;
  regole: string;
  premi: string | null;
  paga: string | null;
  fonte: string;
  verificato: boolean;
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
  sessioni: number | null;
  dettagli: string | null;
  fonte: string;
  verificato: boolean;
  /** Letto nella partita. */
  fatto: boolean;
}

export interface FilmDto {
  chiave: string;
  nome: string;
  nomeIt: string | null;
  dove: 'cinema' | 'dvd';
  periodo: string;
  dote: DoteChiave | null;
  note: number | null;
  prezzo: number | null;
  dettagli: string | null;
  fonte: string;
  verificato: boolean;
  /** Visto nella partita. */
  fatto: boolean;
}

export type TipoLettura = 'libro' | 'film';

export interface AttivitaTutteDto {
  attivita: AttivitaDto[];
  lavori: AttivitaDto[];
  libri: LibroDto[];
  film: FilmDto[];
  libriLetti: number;
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
  punti: PuntoInteresseDto[];
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
  livelloConsigliato: string;
  aree: number;
  punti: number;
  esauribili: number;
  /** Punti con uno stato nella partita (null senza partita). */
  gestiti: number | null;
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

/** Voce del catalogo dei riferimenti (solo link) con lo stato nella propria istanza. */
export interface VoceCatalogoDto {
  ambito: 'arcana' | 'confidente' | 'persona' | 'skill' | 'mappa' | 'altro';
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
  /** Indirizzo da cui l'immagine è stata scaricata (import da URL, piante delle guide); null per i file caricati. */
  origineUrl: string | null;
}
