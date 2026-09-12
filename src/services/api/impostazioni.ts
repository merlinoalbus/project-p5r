// ============================================================
// API impostazioni — stato dell'istanza, backup e ripristino (Fase 15.29), pacchetto di gioco (voce 10)
// ============================================================

import type { AnteprimaPacchettoDto, EsitoImportazionePacchettoDto, EsitoRipristinoDto, StatoIstanzaDto } from '../../types';
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

/** Scarica l'istanza completa: database, immagini caricate, caratteri, manifesto. */
export const scaricaIstanza = (): Promise<{ nome: string; blob: Blob }> => scarica('/impostazioni/istanza/completa.zip', 'project-p5r-istanza.zip');

/** Invia un file grezzo (ZIP o database) e restituisce il `data` della risposta. */
async function inviaFile<T>(percorso: string, metodo: 'PUT' | 'POST', file: File, azione: string): Promise<T> {
  const tipo = file.name.toLowerCase().endsWith('.zip') ? 'application/zip' : 'application/octet-stream';
  const res = await httpFetch(`${API_BASE_URL}${percorso}`, { method: metodo, body: file, headers: { 'Content-Type': tipo } }, { maxRetries: 0, timeoutMs: 300_000 });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, body?.error?.code ?? 'http-error', body?.error?.message ?? `${azione} (${res.status})`, body?.error?.details, body?.requestId);
  }
  return body.data as T;
}

/** Sostituisce l'istanza con il file scelto (database `.db` o ZIP dell'istanza): il corpo è il file grezzo. */
export const ripristinaIstanza = (file: File): Promise<EsitoRipristinoDto> => inviaFile('/impostazioni/istanza', 'PUT', file, 'Ripristino fallito');

// ---- Pacchetto di gioco (voce 10) ----

/** Scarica il pacchetto di gioco: il file gioco.db, immagini comprese, senza le partite. */
export const scaricaPacchettoGioco = (): Promise<{ nome: string; blob: Blob }> => scarica('/impostazioni/istanza/database', 'project-p5r-gioco.db');

/** Che cosa cambierebbe importando il pacchetto: il server legge il file senza sostituire nulla. */
export const anteprimaPacchettoGioco = (file: File): Promise<AnteprimaPacchettoDto> => inviaFile('/impostazioni/istanza/gioco/anteprima', 'POST', file, 'Anteprima fallita');

/** Sostituisce i dati di gioco con il pacchetto; le partite restano. */
export const importaPacchettoGioco = (file: File): Promise<EsitoImportazionePacchettoDto> => inviaFile('/impostazioni/istanza/gioco', 'PUT', file, 'Importazione fallita');
