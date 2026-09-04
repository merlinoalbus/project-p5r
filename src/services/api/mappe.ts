// ============================================================
// API mappe a livelli e spilli (Fase 13): albero, dettaglio con stato della partita, editor, esportazione/importazione
// ============================================================

import type { EsportazioneMappeDto, MappaDto, MappaRiassuntoDto, SpilloDto } from '../../types';
import type { TipoMappa, TipoRiferimento, TipoSpillo } from '../../../shared/spilli';
import { API_BASE_URL } from '../../utils/constants';
import { httpFetch } from './_httpClient';
import { ApiError, apiDelete, apiGet, apiPost, apiPut, queryString } from './_helpers';

export interface DatiMappaApi { nome?: string; tipo?: TipoMappa; genitore?: string | null; ordine?: number; asset?: string | null; larghezza?: number | null; altezza?: number | null; entita?: { tipo: string; chiave: string } | null; note?: string }
export interface DatiSpilloApi { tipo?: TipoSpillo; nome?: string; descrizione?: string; x?: number; y?: number; riferimento?: { tipo: TipoRiferimento; chiave: string } | null; collezionabile?: boolean; ordine?: number; mappa?: string }

/** Albero completo (riassunti piatti con genitore). */
export const getAlberoMappe = (): Promise<MappaRiassuntoDto[]> => apiGet('/mappe/albero');

/** Mappa con percorso, figli e spilli; con `partita` include lo stato «raccolto» e i dettagli della partita (articoli comprati, punti). */
export const getMappa = (chiave: string, partita?: number): Promise<MappaDto> => apiGet(`/mappe/${encodeURIComponent(chiave)}${queryString({ partita })}`);

/** Mappa collegata a un'entità della guida (quartiere, area, dungeon); errore 404 se non esiste. */
export const getMappaPerEntita = (tipo: string, chiave: string): Promise<MappaRiassuntoDto> => apiGet(`/mappe/entita/${encodeURIComponent(tipo)}/${encodeURIComponent(chiave)}`);

export const creaMappa = (dati: DatiMappaApi & { chiave: string; nome: string; tipo: TipoMappa }): Promise<MappaDto> => apiPost('/mappe', dati);
export const aggiornaMappa = (chiave: string, dati: DatiMappaApi): Promise<MappaDto> => apiPut(`/mappe/${encodeURIComponent(chiave)}`, dati);
export const eliminaMappa = (chiave: string): Promise<void> => apiDelete(`/mappe/${encodeURIComponent(chiave)}`);

/** Carica l'immagine di base della mappa (file dell'utente, mai nel repository): corpo grezzo `image/*`. */
export async function caricaImmagineMappa(chiave: string, file: File): Promise<MappaDto> {
  const res = await httpFetch(
    `${API_BASE_URL}/mappe/${encodeURIComponent(chiave)}/immagine`,
    { method: 'PUT', body: file, headers: { 'Content-Type': file.type || 'application/octet-stream' } },
    { maxRetries: 0, timeoutMs: 120_000 },
  );
  const body = await res.json();
  if (!res.ok) throw new ApiError(res.status, body?.error?.code ?? 'http-error', body?.error?.message ?? `Caricamento fallito (${res.status})`, body?.error?.details, body?.requestId);
  return body.data as MappaDto;
}

export const creaSpillo = (mappa: string, dati: DatiSpilloApi & { tipo: TipoSpillo; nome: string; x: number; y: number }): Promise<SpilloDto> => apiPost(`/mappe/${encodeURIComponent(mappa)}/spilli`, dati);
export const aggiornaSpillo = (id: number, dati: DatiSpilloApi): Promise<SpilloDto> => apiPut(`/mappe/spilli/${id}`, dati);
export const eliminaSpillo = (id: number): Promise<void> => apiDelete(`/mappe/spilli/${id}`);

/** Segna uno spillo come raccolto (o non raccolto) nella partita. */
export const impostaSpilloRaccolto = (partitaId: number, spilloId: number, raccolto: boolean): Promise<SpilloDto> => apiPut(`/partite/${partitaId}/spilli/${spilloId}`, { raccolto });

/** Pacchetto JSON con mappe, spilli e immagini dell'istanza (base64). */
export const esportaMappe = (): Promise<EsportazioneMappeDto> => apiGet('/mappe/esporta', { timeoutMs: 120_000 });
export const importaMappe = (pacchetto: EsportazioneMappeDto, sovrascrivi: boolean): Promise<{ mappe: number; spilli: number; immagini: number; saltate: string[] }> => apiPost('/mappe/importa', { pacchetto, sovrascrivi }, { timeoutMs: 120_000 });
