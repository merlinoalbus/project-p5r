// ============================================================
// appartenenzaPartita — il controllo centrale: una partita si tocca solo se è del proprietario della richiesta (L12 · passo 3, §4)
// ============================================================
//
// Le rotte riceventi un id di partita sono decine e crescono: controllare l'appartenenza in ognuna lascerebbe sempre una porta
// dimenticata. Qui il controllo è UNO, prima dei router, e guarda DOVE l'id può stare:
//   - il percorso: `/partite/:id…` (e `/partite/:id/pesca…`) e `/condizioni/partite/:partita…`;
//   - la query: `?partita=` (mappe, aree, luoghi, fusione, ricerca, calendario, domande, disponibilità, catalogo-oggetti…);
//   - il corpo: `partita` (es. `POST /condizioni/valuta`).
// Una partita che non è del proprietario risponde 404 `partita-non-trovata`, IDENTICO a una partita che non esiste: chi prova a
// indovinare gli id non impara nulla. Una seconda difesa sta in `verificaPartita` (stessa regola, nei servizi): se una rotta futura
// riceve l'id da un posto che qui non è previsto, i servizi lo respingono comunque.
//
// L'id si legge come lo leggono le rotte (`z.coerce.number()`: decodifica del percorso e `Number()`), così `/partite/1e1` o
// `/partite/%31` non aggirano il controllo. Un valore che non è un intero positivo non si controlla qui: lo rifiuta la validazione
// della rotta (400), come sempre.
// ============================================================

import type { NextFunction, Request, Response } from 'express';
import { prepared } from '../db/dbService.js';
import { partitaNonTrovata } from '../services/verificaPartita.js';
import { getProprietario } from './requestContext.js';

/** I segmenti che seguono `/partite/` e NON sono l'id di una partita (le rotte che non appartengono a una partita). */
const SEGMENTI_RISERVATI: ReadonlySet<string> = new Set(['cestino']);

/** Un valore (stringa o numero) letto come lo legge `z.coerce.number().int().positive()`; null se non è un id plausibile. */
function comeId(valore: unknown): number | null {
  if (typeof valore !== 'string' && typeof valore !== 'number') return null;
  if (typeof valore === 'string' && valore.trim() === '') return null;
  const n = Number(valore);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** Gli id di partita che la richiesta cita (percorso, query, corpo), senza doppioni. */
export function idPartiteCitate(req: Pick<Request, 'path' | 'query' | 'body'>): number[] {
  const trovati = new Set<number>();
  const aggiungi = (valore: unknown): void => {
    const id = comeId(valore);
    if (id !== null) trovati.add(id);
  };

  // percorso: /partite/<id>/… oppure /condizioni/partite/<id>/… (il router è montato su /api: `req.path` parte da lì)
  const segmenti = req.path.split('/').filter((s) => s.length > 0);
  const posizione = segmenti[0] === 'partite' ? 1 : segmenti[0] === 'condizioni' && segmenti[1] === 'partite' ? 2 : -1;
  if (posizione > 0 && segmenti[posizione] !== undefined) {
    let grezzo = segmenti[posizione]!;
    try { grezzo = decodeURIComponent(grezzo); } catch { /* percorso non decodificabile: lo rifiuta la validazione della rotta */ }
    if (!SEGMENTI_RISERVATI.has(grezzo)) aggiungi(grezzo);
  }

  // query: `?partita=` (anche ripetuto: `?partita=1&partita=2` arriva come array e non deve nascondere un secondo id)
  const q = (req.query as Record<string, unknown> | undefined)?.partita;
  for (const v of Array.isArray(q) ? q : [q]) aggiungi(v);

  // corpo: `partita` (oggetto JSON; un corpo non-oggetto non cita partite)
  const corpo = req.body as unknown;
  if (corpo && typeof corpo === 'object' && !Array.isArray(corpo)) aggiungi((corpo as Record<string, unknown>).partita);

  return [...trovati];
}

/** Vero se la partita esiste ed è del proprietario indicato. */
export function partitaDelProprietario(partitaId: number, proprietario: string): boolean {
  return !!prepared('SELECT 1 FROM partita WHERE id = ? AND proprietario = ?').get(partitaId, proprietario);
}

/** Vero se la partita esiste, di chiunque sia. */
function partitaEsiste(partitaId: number): boolean {
  return !!prepared('SELECT 1 FROM partita WHERE id = ?').get(partitaId);
}

/**
 * Il middleware: 404 `partita-non-trovata` se una delle partite citate non è del proprietario della richiesta.
 *
 * `rigoroso` = l'identità è verificata (Cloudflare Access): ogni id che non è del proprietario è 404, anche se la partita non esiste
 * (altrimenti «non esiste» e «non è tua» si distinguerebbero dalla risposta di una rotta tollerante). Senza identità
 * (preparazione, proprietario unico) il controllo scatta solo per una partita che esiste ed è di un altro: un id inesistente passa e
 * la rotta si comporta come ha sempre fatto (alcune lo tollerano), cioè la preparazione resta identica a prima.
 */
export function controlloAppartenenzaPartite(rigoroso: boolean) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const ids = idPartiteCitate(req);
      if (ids.length > 0) {
        const proprietario = getProprietario();
        for (const id of ids) {
          if (partitaDelProprietario(id, proprietario)) continue;
          if (rigoroso || partitaEsiste(id)) throw partitaNonTrovata(id);
        }
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
