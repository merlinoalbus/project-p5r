// ============================================================
// API immagini — elenco, caricamento file, import da URL, rimozione
// ============================================================

import type { ImmagineDto } from '../../types';
import { API_BASE_URL } from '../../utils/constants';
import { httpFetch } from './_httpClient';
import { ApiError, apiDelete, apiGet, apiPut, apiPost, queryString } from './_helpers';

export type AmbitoImmagine = 'arcana' | 'confidente' | 'persona' | 'skill' | 'mappa' | 'spillo' | 'altro';

/** Spillo di un punto sulla mappa della sua area (x, y in percentuale; null rimuove). */
export const impostaMarcatore = (punto: string, posizione: { x: number; y: number } | null): Promise<{ x: number; y: number } | null> =>
  apiPut<{ punto: string; marcatore: { x: number; y: number } | null }>('/mappe/marcatori', { punto, x: posizione?.x ?? null, y: posizione?.y ?? null }).then((r) => r.marcatore);

export const getImmagini = (ambito?: AmbitoImmagine): Promise<ImmagineDto[]> => apiGet(`/immagini${queryString({ ambito })}`);

/** URL del file di un'immagine. */
/** Scarica nell'istanza la mappa del quartiere dalla fonte collegata (immagine mai nel repository). */
export const scaricaPiantaQuartiere = (quartiere: string): Promise<{ quartiere: string; mime: string; byte: number; fonte: string; url: string }> => apiPost(`/mappe/piante-citta/${encodeURIComponent(quartiere)}/scarica`, {}, { timeoutMs: 60_000, maxRetries: 0 });
/** Fissa (o rimuove con null) lo spillo di un luogo sulla mappa del quartiere. */
export const impostaMarcatoreLuogo = (luogo: string, pos: { x: number; y: number } | null): Promise<{ x: number; y: number } | null> => apiPut<{ luogo: string; marcatore: { x: number; y: number } | null }>('/mappe/marcatori-luoghi', { luogo, x: pos?.x ?? null, y: pos?.y ?? null }).then((r) => r.marcatore);

/** Scarica nell'istanza la pianta dell'area dalla guida collegata (immagine mai nel repository). */
export const scaricaPianta = (area: string): Promise<{ area: string; mime: string; byte: number; fonte: string; url: string }> => apiPost(`/mappe/piante/${encodeURIComponent(area)}/scarica`, {}, { timeoutMs: 60_000, maxRetries: 0 });

export function urlImmagine(ambito: AmbitoImmagine, chiave: string): string {
  return `${API_BASE_URL}/immagini/${encodeURIComponent(ambito)}/${encodeURIComponent(chiave)}/file`;
}

/** Carica un file immagine come corpo grezzo (Content-Type = tipo del file). */
export async function caricaImmagine(ambito: AmbitoImmagine, chiave: string, file: File): Promise<ImmagineDto> {
  const res = await httpFetch(
    `${API_BASE_URL}/immagini/${encodeURIComponent(ambito)}/${encodeURIComponent(chiave)}`,
    { method: 'PUT', body: file, headers: { 'Content-Type': file.type || 'application/octet-stream' } },
    { maxRetries: 0, timeoutMs: 120_000 },
  );
  const body = await res.json();
  if (!res.ok) throw new ApiError(res.status, body?.error?.code ?? 'http-error', body?.error?.message ?? `Caricamento fallito (${res.status})`, body?.error?.details, body?.requestId);
  return body.data as ImmagineDto;
}

export const importaImmagineDaUrl = (ambito: AmbitoImmagine, chiave: string, url: string): Promise<ImmagineDto> =>
  apiPost(`/immagini/${encodeURIComponent(ambito)}/${encodeURIComponent(chiave)}/da-url`, { url }, { timeoutMs: 60_000, maxRetries: 0 });



export const eliminaImmagine = (ambito: AmbitoImmagine, chiave: string): Promise<void> =>
  apiDelete(`/immagini/${encodeURIComponent(ambito)}/${encodeURIComponent(chiave)}`);

/** Rimuove tutte le immagini caricate di un ambito (o di tutta l'istanza). */
export const eliminaImmagini = (ambito?: AmbitoImmagine): Promise<{ eliminate: number }> => apiDelete(`/immagini${queryString({ ambito })}`);
