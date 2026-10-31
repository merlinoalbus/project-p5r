// ============================================================
// API degli appunti fissi del Diario (2026-10-31, C7) — solo preparazione: chi le usa sta dietro la costante di build del rilascio
// ============================================================

import type { AppuntoFissoDto, ModificaAppuntoFisso, NuovoAppuntoFisso } from '../../../shared/appuntiFissi';
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from './_helpers';

const BASE = '/appunti-fissi';

/** Tutti gli appunti fissi, nel loro ordine. */
export const getAppuntiFissi = (): Promise<AppuntoFissoDto[]> => apiGet(BASE);
/** Un appunto nuovo, in fondo all'elenco (mai ripetuto da solo: un secondo invio lo aggiungerebbe due volte). */
export const creaAppuntoFisso = (d: NuovoAppuntoFisso): Promise<AppuntoFissoDto> => apiPost(BASE, d, { maxRetries: 0 });
/** Cambia titolo e/o testo. */
export const modificaAppuntoFisso = (id: number, d: ModificaAppuntoFisso): Promise<AppuntoFissoDto> => apiPatch(`${BASE}/${id}`, d);
/** Elimina un appunto (204). */
export const eliminaAppuntoFisso = (id: number): Promise<void> => apiDelete(`${BASE}/${id}`, { maxRetries: 0 });
/** Il nuovo ordine: tutti gli id, ognuno una volta (409 `ordine-cambiato` se l'elenco è cambiato altrove). */
export const riordinaAppuntiFissi = (ids: number[]): Promise<AppuntoFissoDto[]> => apiPut(`${BASE}/ordine`, { ids });
