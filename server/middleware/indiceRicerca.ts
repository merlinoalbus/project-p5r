// ============================================================
// indiceRicerca — dopo una scrittura riuscita sui dati di gioco, l'indice della ricerca si ricostruisce alla prossima ricerca (L11, B3)
// ============================================================
//
// `invalidaCacheDiGioco` non basta: la chiamano solo alcuni scrittori (catalogo, aree, luoghi, cestino, impostazioni, pacchetto), mentre
// il dungeon, le mappe, i legami delle infiltrazioni, le Richieste, l'atterraggio dei Palazzi, le traduzioni e la città scrivono senza
// chiamarla. Invece di chiedere a ogni scrittore di ricordarsene, un punto solo: ogni scrittura HTTP riuscita sulle aree che toccano i
// dati indicizzati svuota l'indice. Le scritture di partita (`/api/partite…`, pesca, fusione) non lo toccano. Le importazioni e i
// ripristini passano anche dal registro comune delle cache di gioco (`invalidaIndiceRicerca` vi è registrata).
// Limite dichiarato: una scrittura fuori dall'API (uno script, un accesso diretto al file) non si vede finché non si riavvia il server
// o non si fa un'altra scrittura. Una nuova area che scrive dati indicizzati va aggiunta a `AREE_CHE_SCRIVONO`.
// ============================================================

import type { NextFunction, Request, Response } from 'express';
import { invalidaIndiceRicerca } from '../services/ricerca/indiceRicerca.js';

/** Le aree dell'API (percorso senza `/api`) che scrivono dati di gioco indicizzati. */
// `correzioni`: le domande (e gli esami) si correggono da lì e dal 25 ottobre sono indicizzate (tipo `domanda`)
const AREE_CHE_SCRIVONO = /^\/(compendio|traduzioni|immagini|mappe|impostazioni|catalogo|catalogo-oggetti|aree|luoghi|correzioni)(\/|$)/;

/** Da montare su `/api` prima dei router di area: dopo ogni scrittura riuscita su un'area che tocca i dati di gioco svuota l'indice. */
export function indiceRicercaDopoScritture(req: Request, res: Response, next: NextFunction): void {
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS' && AREE_CHE_SCRIVONO.test(req.path)) {
    res.on('finish', () => { if (res.statusCode < 400) invalidaIndiceRicerca(); });
  }
  next();
}
