// ============================================================
// Schemi zod comuni — parametri numerici, booleani ed elenchi da query string, date di gioco, Doti e categorie
// ============================================================
//
// I pezzi che più schemi usano stanno qui, una volta sola: prima la data MM-GG era scritta sette volte (con tre messaggi
// diversi), l'id intero tre, il booleano da query due con nomi diversi, le Doti tre e le categorie degli articoli due (rilievo
// F16 della verifica completa, 2026-10-03).
// ============================================================

import { z } from 'zod';
import { CHIAVI_DOTI } from '../../shared/doti.js';
import { CATEGORIE_ARTICOLO } from '../../shared/articoli.js';

/** Intero positivo da parametro di percorso o di query (":id", "partita=3"). */
export const idParam = z.coerce.number().int().positive();

/** Booleano da query string ('true'/'false'/'1'/'0'); undefined se assente. */
export const boolQuery = z
  .union([z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0')])
  .transform((v) => v === 'true' || v === '1')
  .optional();

/** Testo di ricerca (max 100 caratteri, spazi ai bordi rimossi). */
export const testoRicerca = z.string().trim().max(100).optional();

/** Livello di gioco 1–99. */
export const livello = z.coerce.number().int().min(1).max(99);

/** Data del calendario di gioco, «MM-GG». */
export const dataGioco = z.string().regex(/^\d{2}-\d{2}$/, 'La data del gioco è nel formato MM-GG.');

/** Identità di una voce della giornata (32 cifre esadecimali). */
export const uidVoce = z.string().regex(/^[0-9a-f]{32}$/, 'Identità della voce non valida.');

/** Elenco di interi positivi separati da virgola («1,2,3»), al più `max`; un elemento non numerico rende invalida la richiesta. */
export function elencoInteri(max: number, min = 0) {
  return z
    .string()
    .transform((s) => s.split(',').map((x) => x.trim()).filter((x) => x.length > 0).map(Number))
    .pipe(z.array(z.number().int().positive()).min(min).max(max));
}

/** Una delle cinque Doti sociali. */
export const dote = z.enum(CHIAVI_DOTI);

/** Una categoria di articolo. */
export const categoriaArticolo = z.enum(CATEGORIE_ARTICOLO);
