// ============================================================
// API immagini — elenco, caricamento file, import da URL, rimozione
// ============================================================

import type { ImmagineDto, ManifestImmaginiDto } from '../../types';
import { API_BASE_URL } from '../../utils/constants';
import { apiDelete, apiGet, apiPost, inviaFile, queryString } from './_helpers';

import type { AmbitoImmagine } from '../../../shared/immagini';
export type { AmbitoImmagine };

/** La grafica predefinita che vive nel database (mappe, Confidenti, sfondi…), nella forma del manifest degli asset. */
export const getManifestoImmagini = (): Promise<ManifestImmaginiDto> => apiGet('/immagini/manifest');

/** Metadati (con URL del file, mai i byte) delle immagini di un ambito, o di tutti gli ambiti di caricamento se omesso. */
export const getImmagini =(ambito?: AmbitoImmagine): Promise<ImmagineDto[]> => apiGet(`/immagini${queryString({ ambito })}`);

/** Scarica nell'istanza la mappa del quartiere dalla fonte collegata (immagine mai nel repository). Le piante delle aree dei Palazzi
 *  non si scaricano più dalla guida (rotta tolta il 2026-09-18, «la pianta della guida esce di scena»). */
export const scaricaPiantaQuartiere = (quartiere: string): Promise<{ quartiere: string; mime: string; byte: number; fonte: string; url: string }> => apiPost(`/mappe/piante-citta/${encodeURIComponent(quartiere)}/scarica`, {}, { timeoutMs: 60_000, maxRetries: 0 });

/** URL del file di un'immagine. */
export function urlImmagine(ambito: AmbitoImmagine, chiave: string): string {
  return `${API_BASE_URL}/immagini/${encodeURIComponent(ambito)}/${encodeURIComponent(chiave)}/file`;
}

/** Carica un file immagine come corpo grezzo (Content-Type = tipo del file). */
export const caricaImmagine = (ambito: AmbitoImmagine, chiave: string, file: File): Promise<ImmagineDto> =>
  inviaFile('PUT', `/immagini/${encodeURIComponent(ambito)}/${encodeURIComponent(chiave)}`, file);

/** Fa scaricare al server l'immagine dall'URL indicato e la salva come `ambito`/`chiave` (timeout esteso, nessun nuovo tentativo). */
export const importaImmagineDaUrl =(ambito: AmbitoImmagine, chiave: string, url: string): Promise<ImmagineDto> =>
  apiPost(`/immagini/${encodeURIComponent(ambito)}/${encodeURIComponent(chiave)}/da-url`, { url }, { timeoutMs: 60_000, maxRetries: 0 });

/** Rimuove una singola immagine caricata (404 se non esiste). */
export const eliminaImmagine =(ambito: AmbitoImmagine, chiave: string): Promise<void> =>
  apiDelete(`/immagini/${encodeURIComponent(ambito)}/${encodeURIComponent(chiave)}`);

/** Rimuove tutte le immagini caricate di un ambito (o di tutta l'istanza). */
export const eliminaImmagini = (ambito?: AmbitoImmagine): Promise<{ eliminate: number }> => apiDelete(`/immagini${queryString({ ambito })}`);
