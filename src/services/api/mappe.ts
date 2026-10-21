// ============================================================
// API mappe a livelli e spilli (Fase 13): albero, dettaglio con stato della partita, editor, esportazione/importazione
// ============================================================

import type { ConteggiAlberoDto, CopiaPezzoDto, DatiAggiornaCopiaPezzo, DatiCopiaPezzo, DatiNuovoPezzoMappa, DatiPezzoMappa, DestinazioneSpillo, EsportazioneMappeDto, GuidaDellaPlanimetriaDto, MappaDto, MappaRiassuntoDto, PezzoMappaDto, SpilloDto, VoceCollegabileDto } from '../../types';
import type { RequisitoSpillo } from '../../../shared/condizioniSpillo';
import type { TipoMappa, TipoRiferimento, TipoSpillo } from '../../../shared/spilli';
import type { PrecondizioneRimozionePinDto, RichiestaRimozionePin } from '../../../shared/rimozionePin';
import { apiDelete, apiDeleteConCorpo, apiGet, apiPost, apiPut, inviaFile, queryString } from './_helpers';

/** `passaggio`/`ritorno` valgono solo alla creazione con un genitore: spillo «passaggio» nel genitore verso la nuova mappa e viceversa (15.24). */
export interface DatiMappaApi { nome?: string; tipo?: TipoMappa; genitore?: string | null; ordine?: number; asset?: string | null; larghezza?: number | null; altezza?: number | null; entita?: { tipo: string; chiave: string } | null; note?: string; passaggio?: boolean; ritorno?: boolean }
export interface DatiSpilloApi { soloPosizione?: boolean; destinazione?: DestinazioneSpillo | null; tipo?: TipoSpillo; nome?: string; descrizione?: string; x?: number; y?: number; riferimento?: { tipo: TipoRiferimento; chiave: string } | null; collezionabile?: boolean; ordine?: number; mappa?: string; condizioni?: RequisitoSpillo[] | null }

/** Albero completo (riassunti piatti con genitore). */
export const getAlberoMappe = (partita?: number): Promise<MappaRiassuntoDto[]> => apiGet(`/mappe/albero${queryString({ partita })}`);
/** E2 (L3): i pin di tutto l'albero nei tre gruppi (contenuto, passaggi, note), contati dal server: il totale dell'indice delle Mappe. */
export const getConteggiAlbero = (): Promise<ConteggiAlberoDto> => apiGet('/mappe/albero/conteggi');

/** Mappa con percorso, figli e spilli; con `partita` include lo stato «raccolto» e i dettagli della partita (articoli comprati, punti). */
export const getMappa = (chiave: string, partita?: number, infiltrazione?: string): Promise<MappaDto> =>
  // L4 §1.4: con `infiltrazione` lo stato dei pin condivisi dalle voci di più infiltrazioni si legge in quella (il contesto)
  apiGet(`/mappe/${encodeURIComponent(chiave)}${queryString({ partita, infiltrazione })}`);
/** L3 RG-1: le voci della guida che stanno sulla planimetria (con un pin su di lei, o senza pin e con lei come planimetria effettiva), per
 *  infiltrazione, con lo stato della partita. */
export const getGuidaMappa = (chiave: string, partita?: number): Promise<GuidaDellaPlanimetriaDto> =>
  apiGet(`/mappe/${encodeURIComponent(chiave)}/guida${queryString({ partita })}`);

/** Crea una mappa (chiave facoltativa, nome e tipo obbligatori); risponde con la mappa creata. */
export const creaMappa = (dati: DatiMappaApi & { chiave?: string; nome: string; tipo: TipoMappa }): Promise<MappaDto> => apiPost('/mappe', dati);
/** Modifica i dati di una mappa (nome, tipo, genitore, ordine, entità collegata, note…); risponde con la mappa aggiornata. */
export const aggiornaMappa = (chiave: string, dati: DatiMappaApi): Promise<MappaDto> => apiPut(`/mappe/${encodeURIComponent(chiave)}`, dati);
/** Elimina una mappa con i suoi spilli e le loro immagini; le mappe figlie restano, senza genitore. */
export const eliminaMappa =(chiave: string, opz: { conferma?: boolean } = {}): Promise<void> =>
  // L2: la planimetria che l'ingresso del quartiere usa chiede conferma (409 `planimetria-d-ingresso`); l'ultima di un'Area non si
  // elimina da sola (409 `ultima-planimetria`: si elimina l'Area)
  apiDelete(`/mappe/${encodeURIComponent(chiave)}${queryString({ conferma: opz.conferma ? '1' : undefined })}`);
/** Le aree della guida contenute in una planimetria: si passa l'insieme, torna in ordine di guida. */
export const impostaAreeMappa = (chiave: string, aree: string[]): Promise<{ aree: Array<{ chiave: string; nome: string; ordine: number }> }> =>
  apiPut(`/mappe/${encodeURIComponent(chiave)}/aree`, { aree });
/** Raggruppamento di una planimetria: la stanza a cui appartiene e che cosa mostra la sua versione. */
export const aggiornaPresentazioneMappa = (chiave: string, dati: { gruppoId?: string | null; gruppoNome?: string; etichetta?: string | null }): Promise<MappaDto> =>
  apiPut(`/mappe/${encodeURIComponent(chiave)}/presentazione`, dati);
/** La stanza di una planimetria: entra in quella di un'altra (`con`, con il nome da dare alla stanza se non ne ha uno) o diventa una stanza a sé (`con: null`). */
export const impostaStanzaMappa = (chiave: string, dati: { con: string | null; nome?: string }): Promise<MappaDto> =>
  apiPut(`/mappe/${encodeURIComponent(chiave)}/stanza`, dati);
/** Nuovo ordine delle mappe figlie di `genitore` (null = radici): l'elenco di chiavi è l'ordine; risponde con i riassunti riordinati. */
export const riordinaMappe =(genitore: string | null, chiavi: string[]): Promise<MappaRiassuntoDto[]> => apiPut('/mappe/ordine', { genitore, chiavi });

/** Carica l'immagine di base della mappa (file dell'utente, mai nel repository): corpo grezzo `image/*`. Su una mappa con dei pezzi
 *  (102) il server risponde 409 `mappa-con-pezzi` finché non si conferma con `eliminaPezzi` (i pezzi se ne vanno con l'immagine). */
export const caricaImmagineMappa = (chiave: string, file: File, opz: { eliminaPezzi?: boolean } = {}): Promise<MappaDto> =>
  inviaFile('PUT', `/mappe/${encodeURIComponent(chiave)}/immagine${queryString({ eliminaPezzi: opz.eliminaPezzi ? '1' : undefined })}`, file);

/** Ritaglia un pezzo dalla zona scelta (102), in pixel dell'immagine, con la sua prima copia (103): senza posizione resta dove stava. */
export const creaPezzoMappa = (mappa: string, dati: DatiNuovoPezzoMappa): Promise<PezzoMappaDto> => apiPost(`/mappe/${encodeURIComponent(mappa)}/pezzi`, dati);
/** Corregge il ritaglio di un pezzo (nome, zona, ordine): i campi assenti restano. */
export const aggiornaPezzoMappa = (id: number, dati: DatiPezzoMappa): Promise<PezzoMappaDto> => apiPut(`/mappe/pezzi/${id}`, dati);
/** Elimina un pezzo con tutte le sue copie: la sua zona torna visibile nell'immagine di base. */
export const eliminaPezzoMappa = (id: number): Promise<void> => apiDelete(`/mappe/pezzi/${id}`);
/** Aggiunge una copia di un pezzo (103): un'altra posa dello stesso ritaglio, con posizione, rotazione, specchio e condizioni proprie. */
export const creaCopiaPezzoMappa = (pezzoId: number, dati: DatiCopiaPezzo): Promise<CopiaPezzoDto> => apiPost(`/mappe/pezzi/${pezzoId}/copie`, dati);
/** Corregge una copia (con `nomePezzo` anche il nome del ritaglio, insieme): i campi assenti restano. */
export const aggiornaCopiaPezzoMappa = (id: number, dati: DatiAggiornaCopiaPezzo): Promise<CopiaPezzoDto> => apiPut(`/mappe/pezzi/copie/${id}`, dati);
/** Elimina una copia: con l'ultima se ne va anche il pezzo (`pezzoEliminato`), e la sua zona torna visibile. */
export const eliminaCopiaPezzoMappa = (id: number): Promise<{ pezzoEliminato: boolean }> => apiDelete(`/mappe/pezzi/copie/${id}`);

/** Aggiunge uno spillo alla mappa (tipo, nome e posizione obbligatori); risponde con lo spillo creato. */
export const creaSpillo =(mappa: string, dati: DatiSpilloApi & { tipo: TipoSpillo; nome: string; x: number; y: number }): Promise<SpilloDto> => apiPost(`/mappe/${encodeURIComponent(mappa)}/spilli`, dati);
/** Spillo «passaggio» da `mappa` verso `destinazione` in un punto libero scelto dal server (al centro; in basso se la destinazione è il genitore): poi si trascina. 409 se esiste già. */
export const creaPassaggio = (mappa: string, destinazione: string): Promise<SpilloDto> => apiPost(`/mappe/${encodeURIComponent(mappa)}/passaggi`, { destinazione });
/** Modifica uno spillo (anche solo la posizione o la mappa di appartenenza); risponde con lo spillo aggiornato. */
export const aggiornaSpillo = (id: number, dati: DatiSpilloApi): Promise<SpilloDto> => apiPut(`/mappe/spilli/${id}`, dati);
/** Fotografia fresca del pin e delle conseguenze della rimozione recuperabile. */
export const precondizioneRimozionePin = (id: number): Promise<PrecondizioneRimozionePinDto> => apiGet(`/mappe/spilli/${id}/precondizione-rimozione`, { maxRetries: 0, silent: true });
/** Conserva il pin nel Cestino. I client nuovi inviano identità e fotografia, senza retry. */
export const eliminaSpillo = (id: number, richiesta?: RichiestaRimozionePin): Promise<void> => richiesta
  ? apiDeleteConCorpo(`/mappe/spilli/${id}`, richiesta, { maxRetries: 0 })
  : apiDelete(`/mappe/spilli/${id}`, { maxRetries: 0 });

/** Segna uno spillo come raccolto (o non raccolto) nella partita. */
/** Segna o toglie un pin nella partita. L4 (§1.4, §8.11): per un pin condiviso da voci rigenerabili di più infiltrazioni, `infiltrazione`
 *  dice in quale (il contesto); senza, il server usa quello che la lettura ha mostrato (guardata, altrimenti in corso). */
export const impostaSpilloRaccolto = (partitaId: number, spilloId: number, raccolto: boolean, infiltrazione?: string): Promise<SpilloDto> =>
  apiPut(`/partite/${partitaId}/spilli/${spilloId}`, infiltrazione ? { raccolto, infiltrazione } : { raccolto });

export interface RiferimentoTrovatoApi { tipo: TipoRiferimento; chiave: string; nome: string; dettaglio: string }
/** Entità collegabili a uno spillo (editor): per tipo e testo. */
export const cercaRiferimenti = (tipo: TipoRiferimento, q: string, limite = 30): Promise<RiferimentoTrovatoApi[]> => apiGet(`/mappe/riferimenti${queryString({ tipo, q, limite })}`);

/** Le voci della guida che si possono collegare allo spillo (098: un pin può averne più d'una); si collegano con `collegaPinAlPunto`. */
export const getVociCollegabili = (spilloId: number): Promise<VoceCollegabileDto[]> => apiGet(`/mappe/spilli/${spilloId}/voci-collegabili`);

/** Pacchetto JSON con mappe, spilli e immagini dell'istanza (base64); con `radice` solo quella mappa e le discendenti. */
export const esportaMappe = (radice?: string): Promise<EsportazioneMappeDto> => apiGet(`/mappe/esporta${queryString({ radice })}`, { timeoutMs: 120_000 });

/** Schermata di riferimento di uno spillo (file dell'utente, resta nell'istanza). */
export const aggiungiImmagineSpillo = (spilloId: number, file: File, didascalia = ''): Promise<SpilloDto> =>
  inviaFile('POST', `/mappe/spilli/${spilloId}/immagini${queryString({ didascalia: didascalia || undefined })}`, file);
/** Cambia didascalia o ordine di una schermata dello spillo; risponde con lo spillo aggiornato. */
export const aggiornaImmagineSpillo = (id: number, dati: { didascalia?: string; ordine?: number }): Promise<SpilloDto> => apiPut(`/mappe/spilli/immagini/${id}`, dati);
/** Toglie una schermata dallo spillo; risponde con lo spillo aggiornato. */
export const eliminaImmagineSpillo = (id: number): Promise<SpilloDto> => apiDelete(`/mappe/spilli/immagini/${id}`);
/** Importa un pacchetto nel formato dell'esportazione (con `sovrascrivi` le mappe già presenti si sostituiscono, altrimenti si saltano); risponde con i conteggi e con ciò che è stato saltato o scartato. */
export const importaMappe =(pacchetto: EsportazioneMappeDto, sovrascrivi: boolean): Promise<{ mappe: number; spilli: number; pezzi: number; copie: number; pezziScartati: number; copieScartate: number; pezziEliminati: number; copieEliminate: number; immagini: number; saltate: string[]; condizioniScartate: number; vociScartate: number; condizioniConvertite?: string[] }> => apiPost('/mappe/importa', { pacchetto, sovrascrivi }, { timeoutMs: 120_000 });
