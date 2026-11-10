// ============================================================
// cacheDiGiocoDopoScritture — dopo una scrittura riuscita sui dati di gioco, le memorie in processo si svuotano (L11, B3; L13-02)
// ============================================================
//
// `invalidaCacheDiGioco` da sola non basta: la chiamano solo alcuni scrittori (catalogo, aree, luoghi, cestino, impostazioni, pacchetto), mentre
// il dungeon, le mappe, i legami delle infiltrazioni, le Richieste, l'atterraggio dei Palazzi, le traduzioni e la città scrivono senza
// chiamarla. Invece di chiedere a ogni scrittore di ricordarsene, un punto solo: ogni scrittura HTTP riuscita sulle aree che toccano i
// dati di gioco svuota TUTTE le memorie registrate in `services/cacheDiGioco.ts` (l'indice della ricerca è una di loro: vi si registra da
// sé). Le scritture di partita (`/api/partite…`, pesca, fusione) non toccano i dati di gioco e non svuotano niente. Le importazioni e i
// ripristini dell'istanza chiamano il registro direttamente.
// Limite dichiarato: una scrittura fuori dall'API (uno script, un accesso diretto al file) non si vede finché non si riavvia il server
// o non si fa un'altra scrittura. Una nuova area che scrive dati di gioco va aggiunta a `AREE_CHE_SCRIVONO`.
// ============================================================

import type { NextFunction, Request, Response } from 'express';
import { invalidaCacheDiGioco } from '../services/cacheDiGioco.js';

/** Le aree dell'API (percorso senza `/api`) che scrivono dati di gioco. */
// `correzioni`: le domande (e gli esami) si correggono da lì e dal 25 ottobre sono indicizzate (tipo `domanda`)
const AREE_CHE_SCRIVONO = /^\/(compendio|traduzioni|immagini|mappe|impostazioni|catalogo|catalogo-oggetti|aree|luoghi|correzioni)(\/|$)/;

/** Da montare su `/api` prima dei router di area: dopo ogni scrittura riuscita su un'area che tocca i dati di gioco svuota le cache di gioco. */
export function cacheDiGiocoDopoScritture(req: Request, res: Response, next: NextFunction): void {
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS' && AREE_CHE_SCRIVONO.test(req.path)) {
    // Un rifiuto (4xx) non ha scritto; un errore del server (5xx) può arrivare dopo il commit, e svuotare una cache in più non costa dati.
    res.on('finish', () => { if (res.statusCode < 400 || res.statusCode >= 500) invalidaCacheDiGioco(); });
    // Una connessione chiusa prima della fine della risposta può aver già scritto: anche qui si svuota.
    res.on('close', () => { if (!res.writableFinished) invalidaCacheDiGioco(); });
  }
  next();
}
