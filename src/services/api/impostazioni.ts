// ============================================================
// API impostazioni — stato dell'istanza, backup e ripristino (Fase 15.29)
// ============================================================

import type { EsitoRipristinoDto, StatoIstanzaDto } from '../../types';
import { API_BASE_URL } from '../../utils/constants';
import { httpFetch } from './_httpClient';
import { ApiError, apiGet } from './_helpers';

/** Versioni, dimensioni su disco e conteggi dell'istanza locale. */
export const getStatoIstanza = (): Promise<StatoIstanzaDto> => apiGet('/impostazioni/istanza');

/** Nome del file proposto dal server (intestazione `Content-Disposition`), con ripiego. */
function nomeDalContentDisposition(res: Response, ripiego: string): string {
  const intestazione = res.headers.get('Content-Disposition') ?? '';
  return /filename="?([^";]+)"?/.exec(intestazione)?.[1] ?? ripiego;
}

async function scarica(percorso: string, ripiego: string): Promise<{ nome: string; blob: Blob }> {
  const res = await httpFetch(`${API_BASE_URL}${percorso}`, { method: 'GET' }, { maxRetries: 0, timeoutMs: 300_000 });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.error?.code ?? 'http-error', body?.error?.message ?? `Esportazione fallita (${res.status})`, body?.error?.details, body?.requestId);
  }
  return { nome: nomeDalContentDisposition(res, ripiego), blob: await res.blob() };
}

/** Scarica il solo database SQLite dell'istanza. */
export const scaricaDatabase = (): Promise<{ nome: string; blob: Blob }> => scarica('/impostazioni/istanza/database', 'project-p5r.db');

/** Scarica l'istanza completa: database, immagini caricate, caratteri, manifesto. */
export const scaricaIstanza = (): Promise<{ nome: string; blob: Blob }> => scarica('/impostazioni/istanza/completa.zip', 'project-p5r-istanza.zip');

/** Sostituisce l'istanza con il file scelto (database `.db` o ZIP dell'istanza): il corpo è il file grezzo. */
export async function ripristinaIstanza(file: File): Promise<EsitoRipristinoDto> {
  const tipo = file.name.toLowerCase().endsWith('.zip') ? 'application/zip' : 'application/octet-stream';
  const res = await httpFetch(`${API_BASE_URL}/impostazioni/istanza`, { method: 'PUT', body: file, headers: { 'Content-Type': tipo } }, { maxRetries: 0, timeoutMs: 300_000 });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, body?.error?.code ?? 'http-error', body?.error?.message ?? `Ripristino fallito (${res.status})`, body?.error?.details, body?.requestId);
  }
  return body.data as EsitoRipristinoDto;
}
