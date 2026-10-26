// ============================================================
// API compendio — arcani, glossario, Persona, skill, oggetti, Confidenti, regole
// ============================================================

import type {
  CalendarioDto, ConfidenteDettaglioDto, AttivitaTutteDto, BattagliaDto, CompletamentoDto, CruciverbaTuttiDto, FilmDvdDto, LibriDto, NegozioDettaglioDto, NegozioRiassuntoDto, PercorsoGiornoDto, PercorsoIndiceDto, OggettiGuidaDto, PersonaggiDto, RicercaArticoliDto, SfideDto, AreaDedaloDto, AreaDungeonDto, AtterraggioPalazzoDto, PuntoInteresseDto, DungeonDettaglioDto, QuartiereDettaglioDto, QuartiereRiassuntoDto, DungeonRiassuntoDto, CitazioniRichiestaDto, RichiestaDto, RichiesteDto, ConfidenteDto, DomandeDto, GlossarioDto, OggettoDto, PersonaDettaglioDto, PersonaRiassuntoDto, RegoleFusioneDto, SkillDettaglioDto, SkillRiassuntoDto, TermineDto, LuogoOpzioneDto } from '../../types';
import { apiDelete, apiPut, apiPost, apiGet, apiGetGioco, queryString } from './_helpers';
import type { AzionePercorsoDto, DatiVoceGiornata, ElenchiAzioneDto, ElenchiEffettiVoceDto,EsitoRevisioneVoce, PuntiCopiatiDto, PuntiSpostatiDto, SpostaPuntiInArea, TrasferisciVociGiornata, VideogiochiDto, VociTrasferiteDto } from '../../types';
import type { DoteNote } from '../../../shared/effettiAzione';
import type { DisponibilitaConfidenteDto, DisponibilitaStrutturata } from '../../../shared/disponibilitaStrutturata';
import type { GiornoModificabileDto, ModificaGiorno } from '../../../shared/giorno';
import type { ModificaAffinitaPersona } from '../../../shared/affinitaPersona';
import type { AbilitaRangoDto, DialogoModificatoDto, ModoRango, RangoConfidenteDto, SceltaDialogo } from '../../../shared/confidentiScritture';

/** I campi che il PUT accetta (tutti facoltativi) più le chiavi dei luoghi. */
export type ModificaDisponibilitaStrutturata = Partial<Pick<DisponibilitaStrutturata, 'modo' | 'giorni' | 'fasce' | 'eccezioni' | 'dal' | 'motivoSenzaLuogo'>> & { luoghi?: string[] };
import type { CarattereVoce } from '../../../shared/caratteriVoce';
import type { Condizione } from '../../../shared/condizioniSpillo';
import type { InvitoDto, RequisitiConfidenteDto } from '../../types';
import type { AnteprimaInformazioniConfidenteDto, AzioneInformazioniConfidente, EditorInformazioniConfidenteDto, EsitoInformazioniConfidenteDto, SalvaInformazioniConfidente } from '../../../shared/disponibilitaConfidenti';

export const getInformazioniConfidente = (chiave: string): Promise<EditorInformazioniConfidenteDto> => apiGet(`/compendio/confidenti/${encodeURIComponent(chiave)}/disponibilita`);
export const anteprimaInformazioniConfidente = (chiave: string, input: AzioneInformazioniConfidente): Promise<AnteprimaInformazioniConfidenteDto> =>
  apiPost(`/compendio/confidenti/${encodeURIComponent(chiave)}/disponibilita/anteprima`, input, { maxRetries: 0 });
export const salvaInformazioniConfidente = (chiave: string, input: SalvaInformazioniConfidente): Promise<EsitoInformazioniConfidenteDto> =>
  apiPut(`/compendio/confidenti/${encodeURIComponent(chiave)}/disponibilita`, input, { maxRetries: 0 });

export const getRequisitiConfidente = (chiave: string): Promise<RequisitiConfidenteDto> => apiGet(`/compendio/confidenti/${encodeURIComponent(chiave)}/requisiti`);
export const salvaRequisitiRango = (chiave: string, rango: number, requisiti: Array<{ condizione: Condizione; testo?: string }>): Promise<RequisitiConfidenteDto> =>
  apiPut(`/compendio/confidenti/${encodeURIComponent(chiave)}/requisiti/${rango}`, { requisiti });
export const ripristinaRequisitiRango = (chiave: string, rango: number): Promise<RequisitiConfidenteDto> => apiPost(`/compendio/confidenti/${encodeURIComponent(chiave)}/requisiti/${rango}/ripristina`, {});
/** Inviti e loro disponibilità calcolata dal server per la partita corrente. */
export const getInviti = (filtro: { confidente?: string; apreTipo?: 'quartiere' | 'luogo' | 'area'; apreChiave?: string; partita?: number }): Promise<InvitoDto[]> => apiGet(`/compendio/inviti${queryString(filtro)}`);
/** La chiave è composta da Confidente e data: i due segmenti si codificano separatamente. */
export const impostaInvitoAvvenuto = (partita: number, invito: string, avvenuto: boolean): Promise<InvitoDto> => {
  const percorso = `/partite/${partita}/inviti/${invito.split('/').map(encodeURIComponent).join('/')}`;
  return avvenuto ? apiPut(percorso, {}) : apiDelete(percorso);
};

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
  /** Include le forme delle Persona del gruppo: solo il compendio le mostra, i selettori della partita no. */
  delGruppo?: boolean;
}

// ---- Letture dei dati di GIOCO (senza partita) con cache in memoria (`cacheGioco.ts`) ----
// Ogni indirizzo è definito UNA volta qui: il lettore lo passa a `apiGetGioco` (che memorizza) e la pagina lo passa a
// `useCarica(…, { cacheUrl })` (che mostra subito l'ultima lettura). Un indirizzo diverso nei due punti toglierebbe la cache, non la correttezza.
export const URL_GLOSSARIO = '/compendio/glossario';
export const URL_TERMINI = '/compendio/termini';
export const URL_REGOLE_FUSIONE = '/compendio/fusione/regole';
export const URL_OGGETTI_GUIDA = '/compendio/oggetti-guida';
export const URL_PERSONAGGI = '/compendio/personaggi';
export const URL_SFIDE = '/compendio/sfide';
export const URL_BATTAGLIA = '/compendio/battaglia';
export const urlPersone = (f: FiltriPersona = {}): string => `/compendio/persona${queryString(f)}`;
export const urlPersona = (id: number): string => `/compendio/persona/${id}`;
export const urlSkills = (f: { q?: string; elemento?: string } = {}): string => `/compendio/skill${queryString(f)}`;
export const urlSkill = (id: number): string => `/compendio/skill/${id}`;

/** Glossario dei codici del compendio con la resa italiana (arcani, elementi, affinità, statistiche, Doti sociali…). */
export const getGlossario = (): Promise<GlossarioDto> => apiGetGioco(URL_GLOSSARIO);
/** Termini di gioco della localizzazione italiana, ordinati per categoria e nome. */
export const getTermini = (): Promise<TermineDto[]> => apiGetGioco(URL_TERMINI);

/** Regole di fusione: tabella degli arcani, ricette speciali, modificatori dei tesori, eredità delle skill e gruppi DLC. */
export const getRegoleFusione = (): Promise<RegoleFusioneDto> => apiGetGioco(URL_REGOLE_FUSIONE);
/** Elenco riassuntivo delle Persona, filtrato con i parametri della query. */
export const getPersone = (f: FiltriPersona = {}): Promise<PersonaRiassuntoDto[]> => apiGetGioco(urlPersone(f));
/** Scheda completa di una Persona per id. */
export const getPersona = (id: number): Promise<PersonaDettaglioDto> => apiGetGioco(urlPersona(id));
/** R8-10/1: corregge la griglia delle 10 affinità di una Persona (vale ovunque) e «Ripristina» le rimette come le dà la guida. */
export const salvaAffinitaPersona = (id: number, dati: ModificaAffinitaPersona): Promise<PersonaDettaglioDto> =>
  apiPut(`/compendio/persona/${id}/affinita`, dati, { maxRetries: 0 });
export const ripristinaAffinitaPersona = (id: number): Promise<PersonaDettaglioDto> =>
  apiPost(`/compendio/persona/${id}/affinita/ripristina`, {}, { maxRetries: 0 });
/** Elenco riassuntivo delle skill, filtrabile per testo (`q`) ed elemento. */
export const getSkills = (f: { q?: string; elemento?: string } = {}): Promise<SkillRiassuntoDto[]> => apiGetGioco(urlSkills(f));
/** Scheda completa di una skill per id. */
export const getSkill = (id: number): Promise<SkillDettaglioDto> => apiGetGioco(urlSkill(id));
/** Oggetti del compendio, filtrabili per testo (`q`) e categoria. */
export const getOggetti =(f: { q?: string; categoria?: string } = {}): Promise<OggettoDto[]> => apiGet(`/compendio/oggetti${queryString(f)}`);
/** Oggetti della guida: consumabili, chiave e materiali, fabbricazione, personalizzazione armi, abiti, scambi. */
export const getOggettiGuida = (): Promise<OggettiGuidaDto> => apiGetGioco(URL_OGGETTI_GUIDA);
/** Personaggi senza spoiler con gruppi. */
export const getPersonaggi = (): Promise<PersonaggiDto> => apiGetGioco(URL_PERSONAGGI);
/** Battaglie Sfida, boss segreti, Magnate e tratti. */
export const getSfide = (): Promise<SfideDto> => apiGetGioco(URL_SFIDE);
/** Trofei (con ottenuti della partita se indicata), finali, Covo dei Ladri, DLC, meteo, Nuova Partita+, tempo. */
export const getCompletamento = (partita?: number): Promise<CompletamentoDto> => apiGet(`/compendio/completamento${queryString({ partita })}`);
/** Indice della guida giorno per giorno (con azioni fatte e giorno corrente della partita se indicata). */
export const getPercorsoIndice = (partita?: number): Promise<PercorsoIndiceDto> => apiGet(`/compendio/percorso${queryString({ partita })}`);
/** Scheda di un giorno del percorso. */
export const getPercorsoGiorno = (data: string, partita?: number): Promise<PercorsoGiornoDto> => apiGet(`/compendio/percorso/${data}${queryString({ partita })}`);
/** Gli elenchi per classificare, collegare e dare effetti a un'azione della giornata. */
export const getElenchiAzione = (): Promise<ElenchiAzioneDto> => apiGet('/compendio/percorso-elenchi');
export const getElenchiEffettiVoce = (): Promise<ElenchiEffettiVoceDto> => apiGet('/compendio/percorso-elenchi-effetti');
// ---- Voci della giornata: canone della guida, per tutte le partite (`partita`: la risposta porta lo stato in quella partita) ----

/** Aggiunge una voce al giorno, al posto `posizione` della sua fascia (in fondo se omesso). */
export const creaVoceGiornata = (data: string, dati: DatiVoceGiornata, partita?: number): Promise<AzionePercorsoDto> =>
  apiPost(`/compendio/percorso/${data}/voci${queryString({ partita })}`, dati);
/** Modifica una voce: testo, note, genere, fascia, posto, tipo, collegamento, rango atteso, effetti. */
export const aggiornaVoceGiornata = (uid: string, dati: DatiVoceGiornata, partita?: number): Promise<AzionePercorsoDto> =>
  apiPut(`/compendio/percorso/voci/${uid}${queryString({ partita })}`, dati, { maxRetries: 0 });
/** L3 (§4.4): l'insieme ordinato delle infiltrazioni di una voce di Palazzo (anche vuoto = «nessuna»). Va da solo, senza altri campi:
 *  non tocca nient'altro della voce. */
export const impostaInfiltrazioniVoce = (uid: string, infiltrazioni: string[], partita?: number): Promise<AzionePercorsoDto> =>
  apiPut(`/compendio/percorso/voci/${uid}${queryString({ partita })}`, { infiltrazioni });
/** L3 (§4.4, UX3-1): una voce del diario dal suo uid, per la scheda del Palazzo aperta dalla voce (`?daVoce=`): la proposta e il giorno. */
export const getVocePercorso = (uid: string, partita?: number): Promise<AzionePercorsoDto> =>
  apiGet(`/compendio/percorso/voci/${encodeURIComponent(uid)}${queryString({ partita })}`);
/** L3 §1.4: l'esito di una voce «da rivedere» — tieni il nuovo, rimetti il precedente (solo con un testo precedente), fatto. */
export const rivediVoceGiornata = (uid: string, esito: EsitoRevisioneVoce, partita?: number): Promise<AzionePercorsoDto> =>
  apiPost(`/compendio/percorso/voci/${uid}/rivista${queryString({ partita })}`, { esito });
/** Sposta una voce di un passo nella sua fascia (-1 su, +1 giù); risponde con tutte le voci del giorno. È relativo (un passo da dove
 *  sta): ripetuto dopo un 5xx o un timeout a scrittura già avvenuta la sposterebbe di due, quindi nessun nuovo tentativo. */
export const spostaVoceGiornata = (uid: string, verso: -1 | 1, partita?: number): Promise<AzionePercorsoDto[]> =>
  apiPut(`/compendio/percorso/voci/${uid}/sposta${queryString({ partita })}`, { verso }, { maxRetries: 0 });
/** Copia o sposta una o più voci in un altro giorno e fascia (2026-10-12): arrivano in fondo, nel loro ordine. POST: mai ripetuta
 *  da sola, una copia ripetuta creerebbe due volte le voci. */
export const trasferisciVociGiornata = (dati: TrasferisciVociGiornata, partita?: number): Promise<VociTrasferiteDto> =>
  apiPost(`/compendio/percorso/voci/trasferisci${queryString({ partita })}`, dati);
/** Rimozione atomica nel Cestino con spunte, fonti e ricevute; nessun secondo invio automatico. Gli avvisi (un esemplare in scorta modificato dopo la spunta, che resta) se ce ne sono. */
export const eliminaVoceGiornata = (uid: string): Promise<{ avvisi: string[] } | undefined> => apiDelete(`/compendio/percorso/voci/${uid}`, { maxRetries: 0 });
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
export const aggiornaSbloccoQuartiere = (chiave: string, condizioni: unknown[]): Promise<QuartiereDettaglioDto> =>
  apiPut(`/compendio/citta/${encodeURIComponent(chiave)}/sblocco`, { condizioni });
export const ripristinaSbloccoQuartiere = (chiave: string): Promise<QuartiereDettaglioDto> =>
  apiPost(`/compendio/citta/${encodeURIComponent(chiave)}/sblocco/ripristina`);
/** Attività, lavori, libri e film (con letture della partita se indicata). */
export const getAttivita = (partita?: number): Promise<AttivitaTutteDto> => apiGet(`/compendio/attivita${queryString({ partita })}`);
/** Catalogo dei libri con avanzamento per sessioni nella partita. */
export const getLibri = (partita?: number): Promise<LibriDto> => apiGet(`/compendio/libri${queryString({ partita })}`);
/** Catalogo cinema e DVD con visioni e avanzamento per partita. */
export const getFilm = (partita?: number): Promise<FilmDvdDto> => apiGet(`/compendio/film${queryString({ partita })}`);
/** Catalogo dei videogiochi con l'avanzamento nella partita se indicata. */
export const getVideogiochi =(partita?: number): Promise<VideogiochiDto> => apiGet(`/compendio/videogiochi${queryString({ partita })}`);
/** Aiuto in battaglia: sezioni della guida e indice delle Ombre. */
export const getBattaglia = (): Promise<BattagliaDto> => apiGetGioco(URL_BATTAGLIA);
/** Richieste dei Mementos e dati di Jose (stato per partita se indicata). */
export const getRichieste = (partita?: number): Promise<RichiesteDto> => apiGet(`/compendio/richieste${queryString({ partita })}`);
/** Palazzi e Dedali con punti di interesse (stato e avanzamento se c'è la partita). */
export const getDungeons = (partita?: number): Promise<DungeonRiassuntoDto[]> => apiGet(`/compendio/dungeon${queryString({ partita })}`);
/** Scheda di un Palazzo o Dedalo con aree e punti di interesse (stato della partita se indicata). */
export const getDungeon =(chiave: string, partita?: number): Promise<DungeonDettaglioDto> => apiGet(`/compendio/dungeon/${encodeURIComponent(chiave)}${queryString({ partita })}`);

/* ---- Correzione dei testi della guida ai Palazzi: la sezione non è più in sola lettura ---- */
export interface DatiDungeonApi { nome?: string; sovrano?: string; dataSblocco?: string; dataScadenza?: string; furtoConsigliato?: string; livelloConsigliato?: string; note?: string }
export interface DatiAreaApi { nome?: string; descrizione?: string }
export interface DatiPuntoApi { nome?: string; descrizione?: string; tipo?: PuntoInteresseDto['tipo']; esauribile?: boolean; ordine?: number;
  /** L'Enigma di cui la voce è un passo (095); null = voce dell'area. */
  contenitore?: string | null;
  /** Tutti i dettagli della voce (2026-10-18): sostituiscono quelli di prima; la `maschera` di una Persona resta. */
  dettagli?: Record<string, unknown>;
  /** L'area del dedalo della voce (099): obbligatoria creando una voce di un dedalo; cambiandola la voce passa in un'altra area. */
  areaDedalo?: string;
  /** La Persona del compendio (id) di una voce «Persona» (2026-10-11): ne diventa la maschera. */
  persona?: number;
  /** Un'altra area dello stesso Palazzo (2026-10-12): la voce vi passa in fondo, coi passi se è un Enigma. Solo correggendo. */
  area?: string;
  /** Le aree del dedalo in cui si incontra una Persona di un dedalo (101): almeno una creandola; correggendola le sostituisce. */
  areeDedalo?: string[];
  /** L4 (§1.1): il carattere scelto per una voce di un Palazzo; null = «Ripristina» (vale la regola del tipo). Solo correggendo. */
  carattere?: CarattereVoce | null;
  /** L3 RG-4: la planimetria del Palazzo a cui agganciare a mano una voce senza pin; null toglie l'aggancio (torna la planimetria 1). */
  planimetria?: string | null }
/** Nome, dettagli e totale dei timbri di un'area di un dedalo (099); `timbriTotale` null = senza timbri. */
export interface DatiAreaDedaloApi { nome?: string; descrizione?: string; timbriTotale?: number | null }

/** Corregge i testi della scheda del Palazzo (nome, sovrano, date, consigli, note); risponde con la scheda aggiornata. */
export const aggiornaDungeon = (chiave: string, dati: DatiDungeonApi): Promise<DungeonDettaglioDto> => apiPut(`/compendio/dungeon/${encodeURIComponent(chiave)}`, dati);
/** Corregge nome e descrizione di un'area della guida del Palazzo; risponde con l'area aggiornata. */
export const aggiornaArea = (chiave: string, dati: DatiAreaApi): Promise<AreaDungeonDto> => apiPut(`/compendio/aree/${encodeURIComponent(chiave)}`, dati);
/** Aggiunge una voce (punto di interesse) all'area; risponde con la voce creata. */
export const creaPunto = (area: string, dati: DatiPuntoApi & { nome: string; tipo: PuntoInteresseDto['tipo'] }): Promise<PuntoInteresseDto> => apiPost(`/compendio/aree/${encodeURIComponent(area)}/punti`, dati);
/** Modifica una voce della guida dell'area; risponde con la voce aggiornata. */
export const aggiornaPunto = (chiave: string, dati: DatiPuntoApi): Promise<PuntoInteresseDto> => apiPut(`/compendio/punti/${encodeURIComponent(chiave)}`, dati);
/** L4 (§4.3) «Crea la voce» da una scheda da sistemare: voce nuova del tipo dato col nome e la descrizione della scheda, in fondo alla sua
 *  infiltrazione; risponde con la voce. */
export const creaVoceDallaScheda = (scheda: number, tipo: PuntoInteresseDto['tipo']): Promise<PuntoInteresseDto> => apiPost(`/compendio/schede/${scheda}/voce`, { tipo });
/** L4 (§4.3) «Collega a una voce»: la scheda da sistemare diventa la voce data, del suo Palazzo; risponde con la voce. */
export const collegaSchedaAllaVoce = (scheda: number, voce: string): Promise<PuntoInteresseDto> => apiPut(`/compendio/schede/${scheda}/voce`, { voce });
/** Elimina una voce della guida dell'area (204, nessun contenuto). */
export const eliminaPunto =(chiave: string): Promise<void> => apiDelete(`/compendio/punti/${encodeURIComponent(chiave)}`);
/** Una sezione nuova della guida del Palazzo: `dopo` un'area (null = in cima, assente = in fondo), e se data nella planimetria; da L3
 *  (R3-22) le Aree del Palazzo che tocca (`areePalazzo`, slug in ordine). */
export const creaArea = (dungeon: string, dati: { nome: string; descrizione?: string; dopo?: string | null; planimetria?: string; areePalazzo?: string[] }): Promise<{ chiave: string; nome: string; ordine: number }> =>
  apiPost(`/compendio/dungeon/${encodeURIComponent(dungeon)}/aree`, dati);
/** Un posto su (-1) o giù (+1) nella guida dell'area. Relativo come `spostaVoceGiornata`: nessun nuovo tentativo. */
export const spostaPunto = (chiave: string, verso: -1 | 1): Promise<PuntoInteresseDto> => apiPut(`/compendio/punti/${encodeURIComponent(chiave)}/sposta`, { verso }, { maxRetries: 0 });
/** Più voci di un Palazzo insieme in un'altra sua area (2026-10-14): in fondo, nel loro ordine, tutto o niente. */
export const spostaPuntiInArea = (dati: SpostaPuntiInArea): Promise<PuntiSpostatiDto> => apiPost('/compendio/punti/sposta-in-area', dati);
/** Le stesse voci copiate in un'altra area del Palazzo (2026-10-18): voci nuove, coi passi e le schede della guida senza mappa. */
export const copiaPuntiInArea = (dati: SpostaPuntiInArea): Promise<PuntiCopiatiDto> => apiPost('/compendio/punti/copia-in-area', dati);
/** Collega (o scollega) un pin di una planimetria del Palazzo alla voce della guida. */
export const collegaPinAlPunto = (chiave: string, spilloId: number, collega: boolean): Promise<PuntoInteresseDto> =>
  collega ? apiPut(`/compendio/punti/${encodeURIComponent(chiave)}/pin/${spilloId}`, {}) : apiDelete(`/compendio/punti/${encodeURIComponent(chiave)}/pin/${spilloId}`);
/** Quando il Palazzo compare sulla mappa di Tokyo: dal–al in MM-GG del calendario di gioco, `al` null = senza fine. */
export const impostaFinestraDungeon = (dungeon: string, dal: string, al: string | null): Promise<{ dal: string; al: string | null }> =>
  apiPut(`/compendio/dungeon/${encodeURIComponent(dungeon)}/finestra`, { dal, al });
/** Sostituisce le regole d'atterraggio dalla mappa di Tokyo (nell'ordine in cui si provano); risponde con l'elenco salvato. */
export const impostaAtterraggiDungeon = (dungeon: string, regole: Array<{ dal: string | null; al: string | null; mappa: string; spillo: number | null }>): Promise<AtterraggioPalazzoDto[]> =>
  apiPut(`/compendio/dungeon/${encodeURIComponent(dungeon)}/atterraggi`, { regole });
/** Elimina un'area della guida per tutte le partite, con i suoi punti e i suoi legami. */
export const eliminaArea = (chiave: string): Promise<void> => apiDelete(`/compendio/aree/${encodeURIComponent(chiave)}`);
/* ---- Le aree dei dedali dei Memento (099): Dedalo → Aree → Elementi ---- */
/** Un'area nuova in fondo al dedalo; risponde con l'area creata (senza stato di partita). */
export const creaAreaDedalo = (dedalo: string, dati: DatiAreaDedaloApi & { nome: string }): Promise<AreaDedaloDto> => apiPost(`/compendio/dedali/${encodeURIComponent(dedalo)}/aree`, dati);
/** Corregge nome, dettagli e totale dei timbri di un'area del dedalo. */
export const aggiornaAreaDedalo = (chiave: string, dati: DatiAreaDedaloApi): Promise<AreaDedaloDto> => apiPut(`/compendio/aree-dedalo/${encodeURIComponent(chiave)}`, dati);
/** Un posto su (-1) o giù (+1) fra le aree del dedalo. Relativo: nessun nuovo tentativo. */
export const spostaAreaDedalo = (chiave: string, verso: -1 | 1): Promise<AreaDedaloDto> => apiPut(`/compendio/aree-dedalo/${encodeURIComponent(chiave)}/sposta`, { verso }, { maxRetries: 0 });
/* ---- Le Richieste modificabili, aggiungibili ed eliminabili (2026-10-11) ---- */
/** I campi di una Richiesta che il modulo scrive; `dedalo`/`areaDedalo` null = in nessun dedalo / da collocare. */
export interface DatiRichiestaApi {
  nome?: string; committente?: string; disponibileDal?: string; scadenza?: string; dedalo?: string | null; areaDedalo?: string | null; piano?: string;
  bersaglio?: RichiestaDto['bersaglio']; ricompense?: string[]; confidente?: string | null; confidenteRango?: number | null; note?: string;
  /** L13 (ondata 3): sblocco, scadenza e proroga, Ombra del compendio, yen e PE, oggetti del catalogo con le copie. */
  condizioni?: unknown[]; scadenzaData?: string | null; proroga?: { data: string; condizioni: unknown[] } | null;
  ombra?: string | null; yen?: number | null; esperienza?: number | null; oggetti?: Array<{ chiave: string; quantita: number }>;
}
/** Una Richiesta nuova (nome e bersaglio obbligatori); risponde con la Richiesta creata. */
export const creaRichiesta = (dati: DatiRichiestaApi & { nome: string; bersaglio: RichiestaDto['bersaglio'] }): Promise<RichiestaDto> => apiPost('/compendio/richieste', dati);
/** Corregge una Richiesta (solo i campi mandati); risponde con la Richiesta aggiornata. */
export const aggiornaRichiesta = (chiave: string, dati: DatiRichiestaApi): Promise<RichiestaDto> => apiPut(`/compendio/richieste/${encodeURIComponent(chiave)}`, dati);
/** Chi cita la Richiesta: lo si dice prima di eliminarla. */
export const getCitazioniRichiesta = (chiave: string): Promise<CitazioniRichiestaDto> => apiGet(`/compendio/richieste/${encodeURIComponent(chiave)}/citazioni`);
/** Elimina la Richiesta per tutte le partite (204). */
export const eliminaRichiesta = (chiave: string): Promise<void> => apiDelete(`/compendio/richieste/${encodeURIComponent(chiave)}`);
/** Un requisito di un Confidente che cita una Richiesta passa a citarne un'altra (2026-10-11, «Requisito correggibile»). */
export const correggiRequisitoRichiesta = (confidente: string, rango: number, indice: number, richiesta: string): Promise<void> =>
  apiPut(`/compendio/confidenti/${encodeURIComponent(confidente)}/requisiti/${rango}/${indice}`, { richiesta });
/** Toglie un requisito di un Confidente che cita una Richiesta, per tutte le partite. */
export const togliRequisitoRichiesta = (confidente: string, rango: number, indice: number): Promise<void> =>
  apiDelete(`/compendio/confidenti/${encodeURIComponent(confidente)}/requisiti/${rango}/${indice}`);
/** Colloca una Richiesta in un'area di un dedalo, o la toglie dall'area (null: resta nel dedalo, da collocare). */
export const collocaRichiesta = (chiave: string, areaDedalo: string | null): Promise<RichiestaDto> => apiPut(`/compendio/richieste/${encodeURIComponent(chiave)}/area`, { areaDedalo });
/** Elimina l'area del dedalo per tutte le partite: le voci con lei, le Richieste restano da collocare. */
export const eliminaAreaDedalo = (chiave: string): Promise<void> => apiDelete(`/compendio/aree-dedalo/${encodeURIComponent(chiave)}`);
/** Calendario di gioco (con oggi e scadenze se c'è la partita). */
export const getCalendario = (partita?: number, mese?: string): Promise<CalendarioDto> => apiGet(`/compendio/calendario${queryString({ partita, mese })}`);
/** Domande in classe ed esami (con stato «fatta» e prossime se c'è la partita). */
export const getDomande = (partita?: number): Promise<DomandeDto> => apiGet(`/compendio/domande${queryString({ partita })}`);
/** Scheda di un Confidente (dati di gioco, senza lo stato di una partita). */
export const getConfidenteDettaglio =(chiave: string): Promise<ConfidenteDettaglioDto> => apiGet(`/compendio/confidenti/${encodeURIComponent(chiave)}`);
/** La Dote a ogni incontro dei ranghi indicati (gli altri restano); risponde con la scheda aggiornata. */
export const impostaDotiIncontro = (chiave: string, ranghi: Array<{ rango: number; doti: DoteNote[] }>): Promise<ConfidenteDettaglioDto> =>
  apiPut(`/compendio/confidenti/${encodeURIComponent(chiave)}/doti-incontro`, { ranghi });
/** «Ripristina» la Dote del passaggio a quel rango com'era nella guida (409 `dote-della-guida` se non è stata modificata); risponde con la scheda aggiornata. */
export const ripristinaDoteIncontro = (chiave: string, rango: number): Promise<ConfidenteDettaglioDto> =>
  apiPost(`/compendio/confidenti/${encodeURIComponent(chiave)}/doti-incontro/${rango}/ripristina`, {}, { maxRetries: 0 });

/** R9-07/1: come si sale di rango (modo e soglia in punti), con «modificato» rispetto alla guida. */
export const getRanghiConfidente = (chiave: string): Promise<RangoConfidenteDto[]> => apiGet(`/compendio/confidenti/${encodeURIComponent(chiave)}/ranghi`);
export const salvaRangoConfidente = (chiave: string, rango: number, dati: { modo: ModoRango; puntiNecessari: number }): Promise<RangoConfidenteDto[]> =>
  apiPut(`/compendio/confidenti/${encodeURIComponent(chiave)}/ranghi/${rango}`, dati, { maxRetries: 0 });
export const ripristinaRangoConfidente = (chiave: string, rango: number): Promise<RangoConfidenteDto[]> =>
  apiPost(`/compendio/confidenti/${encodeURIComponent(chiave)}/ranghi/${rango}/ripristina`, {}, { maxRetries: 0 });
/** R9-07/2: le abilità del Confidente per rango, con «modificato» rispetto alla guida. */
export const getAbilitaConfidente = (chiave: string): Promise<AbilitaRangoDto[]> => apiGet(`/compendio/confidenti/${encodeURIComponent(chiave)}/abilita`);
export const salvaAbilitaConfidente = (chiave: string, rango: number, abilita: Array<{ nome: string; descrizione: string }>): Promise<AbilitaRangoDto[]> =>
  apiPut(`/compendio/confidenti/${encodeURIComponent(chiave)}/abilita/${rango}`, { abilita }, { maxRetries: 0 });
export const ripristinaAbilitaConfidente = (chiave: string, rango: number): Promise<AbilitaRangoDto[]> =>
  apiPost(`/compendio/confidenti/${encodeURIComponent(chiave)}/abilita/${rango}/ripristina`, {}, { maxRetries: 0 });
/** R9-07/4: note e scelte (con i punti) di un dialogo del Confidente; «Ripristina» le rimette come nella guida (409 `dialogo-della-guida` se non modificato). */
export const salvaDialogoConfidente = (chiave: string, id: number, dati: { note?: string; scelte?: Array<Omit<SceltaDialogo, 'ordine'>> }): Promise<DialogoModificatoDto> =>
  apiPut(`/compendio/confidenti/${encodeURIComponent(chiave)}/dialoghi/${id}`, dati, { maxRetries: 0 });
export const ripristinaDialogoConfidente = (chiave: string, id: number): Promise<DialogoModificatoDto> =>
  apiPost(`/compendio/confidenti/${encodeURIComponent(chiave)}/dialoghi/${id}/ripristina`, {}, { maxRetries: 0 });
/** R9-07c: gli inviti del Confidente; la data (MM-GG) è la chiave, quindi sta nel percorso e non si cambia. */
export interface CorpoInvitoConfidente { apre: { tipo: 'quartiere' | 'luogo' | 'area'; chiave: string }; condizioni: Condizione[]; nota: string }
export const creaInvitoConfidente = (chiave: string, dati: CorpoInvitoConfidente & { data: string }): Promise<InvitoDto> =>
  apiPost(`/compendio/confidenti/${encodeURIComponent(chiave)}/inviti`, dati, { maxRetries: 0 });
export const modificaInvitoConfidente = (chiave: string, data: string, dati: CorpoInvitoConfidente): Promise<InvitoDto> =>
  apiPut(`/compendio/confidenti/${encodeURIComponent(chiave)}/inviti/${encodeURIComponent(data)}`, dati, { maxRetries: 0 });
export const ripristinaInvitoConfidente = (chiave: string, data: string): Promise<InvitoDto> =>
  apiPost(`/compendio/confidenti/${encodeURIComponent(chiave)}/inviti/${encodeURIComponent(data)}/ripristina`, {}, { maxRetries: 0 });
/** Toglie un invito creato dall'utente (finisce nel Cestino); uno della guida si modifica e si ripristina soltanto. */
export const eliminaInvitoConfidente = (chiave: string, data: string): Promise<void> =>
  apiDelete(`/compendio/confidenti/${encodeURIComponent(chiave)}/inviti/${encodeURIComponent(data)}`);
/** Elenco dei Confidenti del compendio. */
export const getConfidenti =(): Promise<ConfidenteDto[]> => apiGet('/compendio/confidenti');
/** R9-19: il giorno di gioco modificabile (meteo nelle due fasce, nota, trama, vincoli) e «Ripristina» com'è nella guida. */
export const getGiornoModificabile = (data: string): Promise<GiornoModificabileDto> => apiGet(`/compendio/giorni/${encodeURIComponent(data)}`);
export const salvaGiornoModificabile = (data: string, dati: ModificaGiorno): Promise<GiornoModificabileDto> =>
  apiPut(`/compendio/giorni/${encodeURIComponent(data)}`, dati, { maxRetries: 0 });
export const ripristinaGiornoModificabile = (data: string): Promise<GiornoModificabileDto> =>
  apiPost(`/compendio/giorni/${encodeURIComponent(data)}/ripristina`, {}, { maxRetries: 0 });

/** R9-01 (F4): la disponibilità strutturata di un Confidente; con la partita anche se è disponibile adesso. */
export const getDisponibilitaStrutturata = (chiave: string, partita?: number): Promise<DisponibilitaConfidenteDto> =>
  apiGet(`/compendio/confidenti/${encodeURIComponent(chiave)}/disponibilita-strutturata${queryString({ partita })}`);
/** Scrive la struttura (campi parziali: quelli assenti restano) e i luoghi del Confidente (le chiavi in più si aggiungono, quelle in meno si tolgono). */
export const salvaDisponibilitaStrutturata = (chiave: string, dati: ModificaDisponibilitaStrutturata): Promise<DisponibilitaConfidenteDto> =>
  apiPut(`/compendio/confidenti/${encodeURIComponent(chiave)}/disponibilita-strutturata`, dati, { maxRetries: 0 });
/** «Ripristina»: la struttura torna come la dà la fonte (i luoghi si ripristinano dal luogo). */
export const ripristinaDisponibilitaStrutturata = (chiave: string): Promise<DisponibilitaConfidenteDto> =>
  apiPost(`/compendio/confidenti/${encodeURIComponent(chiave)}/disponibilita-strutturata/ripristina`, {}, { maxRetries: 0 });

/** Tutti i luoghi della città, come voci da scegliere (la sede di un negozio o di un'attività). */
export const getLuoghi = (): Promise<LuogoOpzioneDto[]> => apiGet('/compendio/luoghi');

/** Imposta l'ingresso del quartiere sulla mappa (mappa, punto in percentuale e zoom) con PUT, o lo toglie con DELETE se `dati`
 *  è null; risponde con l'ingresso salvato, o null dopo la rimozione. */
/** Salva l'ingresso del quartiere (null lo toglie). L2: si sceglie l'**area** (`area` = slug) e il punto sulla sua planimetria
 *  predefinita; il corpo vecchio con la `mappa` resta accettato dal server, che ne deduce l'area. */
export const salvaIngressoQuartiere=(chiave:string,dati:({area:string}|{mappa:string})&{x:number;y:number;zoom:number}|null):Promise<import('../../../shared/types').IngressoQuartiereDto|null>=>dati===null?apiDelete('/compendio/citta/'+encodeURIComponent(chiave)+'/ingresso').then(()=>null):apiPut('/compendio/citta/'+encodeURIComponent(chiave)+'/ingresso',dati);
