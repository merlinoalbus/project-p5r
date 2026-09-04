// ============================================================
// API compendio — arcani, glossario, Persona, skill, oggetti, Confidenti, regole
// ============================================================

import type {
  ArcanaDto, CalendarioDto, ConfidenteDettaglioDto, AttivitaTutteDto, BattagliaDto, CompletamentoDto, CruciverbaTuttiDto, NegozioDettaglioDto, NegozioRiassuntoDto, PercorsoGiornoDto, PercorsoIndiceDto, RicercaArticoliDto, SfideDto, DungeonDettaglioDto, QuartiereDettaglioDto, QuartiereRiassuntoDto, DungeonRiassuntoDto, RichiesteDto, ConfidenteDto, DomandeDto, GlossarioDto, OggettoDto, PersonaDettaglioDto, PersonaRiassuntoDto, RegoleFusioneDto, SkillDettaglioDto, SkillRiassuntoDto, TermineDto,
} from '../../types';
import { apiGet, queryString } from './_helpers';

/** Filtri dell'elenco Persona (stessi nomi della query API). */
export interface FiltriPersona {
  q?: string;
  arcana?: string;
  livelloMin?: number;
  livelloMax?: number;
  dlc?: boolean;
  rara?: boolean;
  speciale?: boolean;
  skill?: string;
}

export const getArcani = (): Promise<ArcanaDto[]> => apiGet('/compendio/arcani');
export const getGlossario = (): Promise<GlossarioDto> => apiGet('/compendio/glossario');
export const getTermini = (): Promise<TermineDto[]> => apiGet('/compendio/termini');

export const getRegoleFusione = (): Promise<RegoleFusioneDto> => apiGet('/compendio/fusione/regole');
export const getPersone = (f: FiltriPersona = {}): Promise<PersonaRiassuntoDto[]> => apiGet(`/compendio/persona${queryString(f)}`);
export const getPersona = (id: number): Promise<PersonaDettaglioDto> => apiGet(`/compendio/persona/${id}`);
export const getSkills = (f: { q?: string; elemento?: string } = {}): Promise<SkillRiassuntoDto[]> => apiGet(`/compendio/skill${queryString(f)}`);
export const getSkill = (id: number): Promise<SkillDettaglioDto> => apiGet(`/compendio/skill/${id}`);
export const getOggetti = (f: { q?: string; categoria?: string } = {}): Promise<OggettoDto[]> => apiGet(`/compendio/oggetti${queryString(f)}`);
/** Battaglie Sfida, boss segreti, Magnate e tratti. */
export const getSfide = (): Promise<SfideDto> => apiGet('/compendio/sfide');
/** Trofei (con ottenuti della partita se indicata), finali, Covo dei Ladri, DLC, meteo, Nuova Partita+, tempo. */
export const getCompletamento = (partita?: number): Promise<CompletamentoDto> => apiGet(`/compendio/completamento${queryString({ partita })}`);
/** Indice della guida giorno per giorno (con azioni fatte e giorno corrente della partita se indicata). */
export const getPercorsoIndice = (partita?: number): Promise<PercorsoIndiceDto> => apiGet(`/compendio/percorso${queryString({ partita })}`);
/** Scheda di un giorno del percorso. */
export const getPercorsoGiorno = (data: string, partita?: number): Promise<PercorsoGiornoDto> => apiGet(`/compendio/percorso/${data}${queryString({ partita })}`);
/** Negozi con conteggi degli articoli. */
export const getNegozi = (): Promise<NegozioRiassuntoDto[]> => apiGet('/compendio/negozi');
/** Scheda di un negozio con gli articoli (acquisti della partita se indicata). */
export const getNegozio = (chiave: string, partita?: number): Promise<NegozioDettaglioDto> => apiGet(`/compendio/negozi/${encodeURIComponent(chiave)}${queryString({ partita })}`);
/** Ricerca degli articoli in tutti i negozi. */
export const ricercaArticoli = (filtro: { q?: string; categoria?: string; per?: string }, partita?: number): Promise<RicercaArticoliDto> => apiGet(`/compendio/articoli${queryString({ ...filtro, partita })}`);
/** Cruciverba di Leblanc (con risolti della partita se indicata). */
export const getCruciverba = (partita?: number): Promise<CruciverbaTuttiDto> => apiGet(`/compendio/cruciverba${queryString({ partita })}`);
/** Quartieri della città con conteggi. */
export const getQuartieri = (): Promise<QuartiereRiassuntoDto[]> => apiGet('/compendio/citta');
/** Scheda di un quartiere con i luoghi. */
export const getQuartiere = (chiave: string): Promise<QuartiereDettaglioDto> => apiGet(`/compendio/citta/${encodeURIComponent(chiave)}`);
/** Attività, lavori, libri e film (con letture della partita se indicata). */
export const getAttivita = (partita?: number): Promise<AttivitaTutteDto> => apiGet(`/compendio/attivita${queryString({ partita })}`);
/** Aiuto in battaglia: sezioni della guida e indice delle Ombre. */
export const getBattaglia = (): Promise<BattagliaDto> => apiGet('/compendio/battaglia');
/** Richieste dei Mementos e dati di Jose (stato per partita se indicata). */
export const getRichieste = (partita?: number): Promise<RichiesteDto> => apiGet(`/compendio/richieste${queryString({ partita })}`);
/** Palazzi e Dedali con punti di interesse (stato e avanzamento se c'è la partita). */
export const getDungeons = (partita?: number): Promise<DungeonRiassuntoDto[]> => apiGet(`/compendio/dungeon${queryString({ partita })}`);
export const getDungeon = (chiave: string, partita?: number): Promise<DungeonDettaglioDto> => apiGet(`/compendio/dungeon/${encodeURIComponent(chiave)}${queryString({ partita })}`);
/** Calendario di gioco (con oggi e scadenze se c'è la partita). */
export const getCalendario = (partita?: number, mese?: string): Promise<CalendarioDto> => apiGet(`/compendio/calendario${queryString({ partita, mese })}`);
/** Domande in classe ed esami (con stato «fatta» e prossime se c'è la partita). */
export const getDomande = (partita?: number): Promise<DomandeDto> => apiGet(`/compendio/domande${queryString({ partita })}`);
export const getConfidenteDettaglio = (chiave: string): Promise<ConfidenteDettaglioDto> => apiGet(`/compendio/confidenti/${encodeURIComponent(chiave)}`);
export const getConfidenti = (): Promise<ConfidenteDto[]> => apiGet('/compendio/confidenti');
