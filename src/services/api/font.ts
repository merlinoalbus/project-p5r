// ============================================================
// API font — font dell'utente per i ruoli tipografici (display, menu, decor)
// ============================================================

import type { FontDto, RuoloFont } from '../../types';
import { API_BASE_URL } from '../../utils/constants';
import { httpFetch } from './_httpClient';
import { ApiError, apiDelete, apiGet } from './_helpers';

/** Stato dei tre ruoli tipografici nell'istanza. */
export const getFont = (): Promise<FontDto[]> => apiGet('/font');

/** Carica il file di un font (TTF, OTF, WOFF o WOFF2) per un ruolo; il formato è riconosciuto dal contenuto. */
export async function caricaFont(ruolo: RuoloFont, file: File): Promise<FontDto> {
  const res = await httpFetch(
    `${API_BASE_URL}/font/${encodeURIComponent(ruolo)}`,
    { method: 'PUT', body: file, headers: { 'Content-Type': file.type || 'application/octet-stream' } },
    { maxRetries: 0, timeoutMs: 120_000 },
  );
  const body = await res.json();
  if (!res.ok) throw new ApiError(res.status, body?.error?.code ?? 'http-error', body?.error?.message ?? `Caricamento fallito (${res.status})`, body?.error?.details, body?.requestId);
  return body.data as FontDto;
}

/** Rimuove il font di un ruolo: l'app torna al predefinito. */
export const eliminaFont = (ruolo: RuoloFont): Promise<void> => apiDelete(`/font/${encodeURIComponent(ruolo)}`);
