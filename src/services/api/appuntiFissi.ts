// ============================================================
// API degli appunti fissi del Diario (2026-10-31, C7) e delle loro categorie (2026-11-02) — solo preparazione: chi le usa sta dietro la
// costante di build del rilascio
// ============================================================

import type {
  AppuntiFissiDto, AppuntoFissoDto, CategoriaAppuntiDto, ModificaAppuntoFisso, NuovoAppuntoFisso, PostoAppuntoFisso,
} from '../../../shared/appuntiFissi';
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from './_helpers';

const BASE = '/appunti-fissi';

/** Le categorie e tutti gli appunti, ognuno nell'ordine del suo gruppo. */
export const getAppuntiFissi = (): Promise<AppuntiFissiDto> => apiGet(BASE);
/** Un appunto nuovo, in fondo al suo gruppo (mai ripetuto da solo: un secondo invio lo aggiungerebbe due volte). */
export const creaAppuntoFisso = (d: NuovoAppuntoFisso): Promise<AppuntoFissoDto> => apiPost(BASE, d, { maxRetries: 0 });
/** Cambia titolo, testo e/o categoria (una categoria diversa lo porta in fondo a quel gruppo). */
export const modificaAppuntoFisso = (id: number, d: ModificaAppuntoFisso): Promise<AppuntoFissoDto> => apiPatch(`${BASE}/${id}`, d);
/** Elimina un appunto (204). */
export const eliminaAppuntoFisso = (id: number): Promise<void> => apiDelete(`${BASE}/${id}`, { maxRetries: 0 });
/** Sposta un appunto in un gruppo e in un posto (404 se l'appunto o la categoria non ci sono più). */
export const spostaAppuntoFisso = (id: number, p: PostoAppuntoFisso): Promise<AppuntiFissiDto> => apiPut(`${BASE}/${id}/posto`, p);
/** Una categoria nuova, in fondo alle categorie (mai ripetuta da sola). */
export const creaCategoriaAppunti = (nome: string): Promise<CategoriaAppuntiDto> => apiPost(`${BASE}/categorie`, { nome }, { maxRetries: 0 });
/** Rinomina una categoria. */
export const rinominaCategoriaAppunti = (id: number, nome: string): Promise<CategoriaAppuntiDto> => apiPatch(`${BASE}/categorie/${id}`, { nome });
/** Sposta una categoria fra le categorie. */
export const spostaCategoriaAppunti = (id: number, indice: number): Promise<AppuntiFissiDto> => apiPut(`${BASE}/categorie/${id}/posto`, { indice });
/** Elimina una categoria: i suoi appunti vanno in fondo alla lista senza categoria. */
export const eliminaCategoriaAppunti = (id: number): Promise<AppuntiFissiDto> => apiDelete(`${BASE}/categorie/${id}`, { maxRetries: 0 });
