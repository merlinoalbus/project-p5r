// ============================================================
// API compendio — arcani, glossario, Persona, skill, oggetti, Confidenti, regole
// ============================================================

import type {
  ArcanaDto, CalendarioDto, ConfidenteDettaglioDto, AttivitaTutteDto, BattagliaDto, CompletamentoDto, CruciverbaTuttiDto, FilmDvdDto, LibriDto, NegozioDettaglioDto, NegozioRiassuntoDto, PercorsoGiornoDto, PercorsoIndiceDto, OggettiGuidaDto, PersonaggiDto, RicercaArticoliDto, SfideDto, DungeonDettaglioDto, QuartiereDettaglioDto, QuartiereRiassuntoDto, DungeonRiassuntoDto, RichiesteDto, ConfidenteDto, DomandeDto, GlossarioDto, OggettoDto, PersonaDettaglioDto, PersonaRiassuntoDto, RegoleFusioneDto, SkillDettaglioDto, SkillRiassuntoDto, TermineDto, LuogoOpzioneDto } from '../../types';
import { apiDelete, apiPut, apiGet, queryString } from './_helpers';
import type { VideogiochiDto } from '../../types';

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
/** Oggetti della guida: consumabili, chiave e materiali, fabbricazione, personalizzazione armi, abiti, scambi. */
export const getOggettiGuida = (): Promise<OggettiGuidaDto> => apiGet('/compendio/oggetti-guida');
/** Personaggi senza spoiler con gruppi. */
export const getPersonaggi = (): Promise<PersonaggiDto> => apiGet('/compendio/personaggi');
/** Battaglie Sfida, boss segreti, Magnate e tratti. */
export const getSfide = (): Promise<SfideDto> => apiGet('/compendio/sfide');
/** Trofei (con ottenuti della partita se indicata), finali, Covo dei Ladri, DLC, meteo, Nuova Partita+, tempo. */
export const getCompletamento = (partita?: number): Promise<CompletamentoDto> => apiGet(`/compendio/completamento${queryString({ partita })}`);
/** Indice della guida giorno per giorno (con azioni fatte e giorno corrente della partita se indicata). */
export const getPercorsoIndice = (partita?: number): Promise<PercorsoIndiceDto> => apiGet(`/compendio/percorso${queryString({ partita })}`);
/** Scheda di un giorno del percorso. */
export const getPercorsoGiorno = (data: string, partita?: number): Promise<PercorsoGiornoDto> => apiGet(`/compendio/percorso/${data}${queryString({ partita })}`);
/** Negozi con conteggi degli articoli. */
/** Elenco dei negozi; con `partita` ogni negozio porta la disponibilità alla data corrente (sblocco del negozio). */
export const getNegozi = (partita?: number): Promise<NegozioRiassuntoDto[]> => apiGet(`/compendio/negozi${queryString({ partita })}`);
/** Scheda di un negozio con gli articoli (acquisti della partita se indicata). */
export const getNegozio = (chiave: string, partita?: number): Promise<NegozioDettaglioDto> => apiGet(`/compendio/negozi/${encodeURIComponent(chiave)}${queryString({ partita })}`);
/** Ricerca degli articoli in tutti i negozi. */
export const ricercaArticoli = (filtro: { q?: string; categorie?: string[]; per?: string; stato?: 'acquistati' | 'da-acquistare'; disponibilita?: 'disponibili' | 'bloccati' }, partita?: number): Promise<RicercaArticoliDto> =>
  apiGet(`/compendio/articoli${queryString({ ...filtro, categorie: filtro.categorie?.length ? filtro.categorie.join(',') : undefined, partita })}`);
/** Cruciverba di Leblanc (con risolti della partita se indicata). */
export const getCruciverba = (partita?: number): Promise<CruciverbaTuttiDto> => apiGet(`/compendio/cruciverba${queryString({ partita })}`);
/** Quartieri della città con conteggi; con la partita, anche se sono già nel mondo. */
export const getQuartieri = (partita?: number): Promise<QuartiereRiassuntoDto[]> => apiGet(`/compendio/citta${queryString({ partita })}`);
/** Scheda di un quartiere con i luoghi. */
export const getQuartiere = (chiave: string, partita?: number): Promise<QuartiereDettaglioDto> =>
  apiGet(`/compendio/citta/${encodeURIComponent(chiave)}${partita ? `?partita=${partita}` : ''}`);
/** Attività, lavori, libri e film (con letture della partita se indicata). */
export const getAttivita = (partita?: number): Promise<AttivitaTutteDto> => apiGet(`/compendio/attivita${queryString({ partita })}`);
/** Catalogo dei libri con avanzamento per sessioni nella partita. */
export const getLibri = (partita?: number): Promise<LibriDto> => apiGet(`/compendio/libri${queryString({ partita })}`);
/** Catalogo cinema e DVD con visioni e avanzamento per partita. */
export const getFilm = (partita?: number): Promise<FilmDvdDto> => apiGet(`/compendio/film${queryString({ partita })}`);
export const getVideogiochi = (partita?: number): Promise<VideogiochiDto> => apiGet(`/compendio/videogiochi${queryString({ partita })}`);
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
/** Tutti i luoghi della città, come voci da scegliere (la sede di un negozio o di un'attività). */
export const getLuoghi = (): Promise<LuogoOpzioneDto[]> => apiGet('/compendio/luoghi');

export const salvaIngressoQuartiere=(chiave:string,dati:{mappa:string;x:number;y:number;zoom:number}|null):Promise<import('../../../shared/types').IngressoQuartiereDto|null>=>dati===null?apiDelete('/compendio/citta/'+encodeURIComponent(chiave)+'/ingresso').then(()=>null):apiPut('/compendio/citta/'+encodeURIComponent(chiave)+'/ingresso',dati);
