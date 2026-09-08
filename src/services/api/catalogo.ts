// ============================================================
// API catalogo e agenda — righe aggiunte o corrette dall'utente, eventi e cose da fare del giorno (Fase 16.1)
// ============================================================

import type { AgendaGiornoDto, AzioneUtenteDto, ElementoCatalogoDto, EventoUtenteDto, OggettoSelezionabileDto, RiepilogoCatalogoDto, TipoCatalogo } from '../../types';
import { apiDelete, apiGet, apiPost, apiPut, queryString } from './_helpers';

/** Quante righe l'utente ha aggiunto, corretto o nascosto, per tipo. */
export const getRiepilogoCatalogo = (): Promise<RiepilogoCatalogoDto> => apiGet('/catalogo');

/** Righe del catalogo toccate dall'utente per un tipo. */
export const getCatalogo = (tipo: TipoCatalogo): Promise<ElementoCatalogoDto[]> => apiGet(`/catalogo/${tipo}`);

/** Una riga qualunque (anche del seed), per il modulo di modifica. */
export const getElementoCatalogo = (tipo: TipoCatalogo, chiave: string): Promise<ElementoCatalogoDto> =>
  apiGet(`/catalogo/${tipo}/${encodeURIComponent(chiave)}`);

/** Gli oggetti che l'app già conosce di una categoria, da agganciare a un negozio.
 *
 * Un elenco vuoto è una risposta valida — di regali, materiali, cibo e «altro» non c'è archivio —
 * e il modulo la sa leggere: lì si scrive a mano, come si è sempre fatto. */
export const getOggettiSelezionabili = (categoria: string): Promise<OggettoSelezionabileDto[]> =>
  apiGet(`/catalogo/oggetti-di/${encodeURIComponent(categoria)}`);

export const creaElementoCatalogo = (tipo: TipoCatalogo, dati: Record<string, unknown>): Promise<ElementoCatalogoDto> =>
  apiPost(`/catalogo/${tipo}`, dati);

export const aggiornaElementoCatalogo = (tipo: TipoCatalogo, chiave: string, dati: Record<string, unknown>): Promise<ElementoCatalogoDto> =>
  apiPut(`/catalogo/${tipo}/${encodeURIComponent(chiave)}`, dati);

/** Nasconde una riga del seed (o la rimostra) senza cancellarla: il ricaricamento dei dati la riporterebbe. */
export const nascondiElementoCatalogo = (tipo: TipoCatalogo, chiave: string, nascosta: boolean): Promise<ElementoCatalogoDto> =>
  apiPut(`/catalogo/${tipo}/${encodeURIComponent(chiave)}/nascosta`, { nascosta });

/** Elimina la riga creata dall'utente, oppure riporta ai dati della guida quella che aveva corretto. */
export const eliminaElementoCatalogo = (tipo: TipoCatalogo, chiave: string): Promise<{ esito: 'eliminata' | 'ripristinata'; elemento: ElementoCatalogoDto | null }> =>
  apiDelete(`/catalogo/${tipo}/${encodeURIComponent(chiave)}`);

// ---- Agenda del giorno ----

/** Eventi e cose da fare di un giorno: quelli di tutte le partite più quelli della partita indicata. */
export const getAgenda = (giorno: string, partita?: number): Promise<AgendaGiornoDto> =>
  apiGet(`/catalogo/agenda/${giorno}${queryString({ partita })}`);

/** Giorni che hanno qualcosa in agenda (per segnarli nel calendario). */
export const getGiorniConAgenda = (partita?: number): Promise<{ giorni: string[] }> =>
  apiGet(`/catalogo/agenda${queryString({ partita })}`);

export interface DatiEventoApi {
  data: string; tipo?: EventoUtenteDto['tipo']; titolo: string; dettaglio?: string;
  riferimento?: { tipo: string; chiave: string } | null; partitaId?: number | null; ordine?: number;
}
export interface DatiAzioneApi {
  data: string; fascia?: 'giorno' | 'sera'; tipo?: string; azione: string;
  riferimento?: { tipo: string; chiave: string } | null; rangoAtteso?: number | null; note?: string | null; partitaId?: number | null; ordine?: number;
}

export const creaEventoAgenda = (dati: DatiEventoApi): Promise<EventoUtenteDto> => apiPost('/catalogo/agenda/eventi', dati);
export const aggiornaEventoAgenda = (id: number, dati: Partial<DatiEventoApi>): Promise<EventoUtenteDto> => apiPut(`/catalogo/agenda/eventi/${id}`, dati);
export const eliminaEventoAgenda = (id: number): Promise<void> => apiDelete(`/catalogo/agenda/eventi/${id}`);

export const creaAzioneAgenda = (dati: DatiAzioneApi): Promise<AzioneUtenteDto> => apiPost('/catalogo/agenda/azioni', dati);
export const aggiornaAzioneAgenda = (id: number, dati: Partial<DatiAzioneApi>): Promise<AzioneUtenteDto> => apiPut(`/catalogo/agenda/azioni/${id}`, dati);
export const eliminaAzioneAgenda = (id: number): Promise<void> => apiDelete(`/catalogo/agenda/azioni/${id}`);
/** Spunta una cosa da fare nella partita. */
export const impostaAzioneAgendaFatta = (id: number, partita: number, fatta: boolean): Promise<AzioneUtenteDto> =>
  apiPut(`/catalogo/agenda/azioni/${id}/fatta`, { partita, fatta });
