// ============================================================
// API immagini — elenco, caricamento file, import da URL, rimozione
// ============================================================

import type { ImmagineDto } from '../../types';
import { API_BASE_URL } from '../../utils/constants';
import { httpFetch } from './_httpClient';
import { ApiError, apiDelete, apiGet, apiPost, queryString } from './_helpers';

export type AmbitoImmagine = 'arcana' | 'confidente' | 'persona' | 'skill' | 'altro';

export const getImmagini = (ambito?: AmbitoImmagine): Promise<ImmagineDto[]> => apiGet(`/immagini${queryString({ ambito })}`);

/** URL del file di un'immagine. */
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
