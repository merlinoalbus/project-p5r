// ============================================================
// Response shape — envelope `{ data: ... }` su ogni res.json
// ============================================================
//
// Il FE destruttura sempre `body.data` per il payload e `body.error`
// per il fallimento (quest'ultimo lo produce `errorHandler`).
// Ogni `res.json` riuscito viene avvolto, qualunque forma abbia il corpo:
// un DTO con un campo `data` o `error` (es. `DomandaDto.data`) resta un
// payload e non viene scambiato per una busta. Solo l'errorHandler, che
// marca la risposta con `segnaRispostaFormata`, scrive il corpo così com'è.
// `res.send` NON è toccato: export testuali e streaming restano liberi.
// ============================================================

import type { Request, Response, NextFunction } from 'express';
import { prelevaAvanzamentoValido } from '../services/avanzamentoGiornataService.js';
import { partiteConAvanzamentoRichiesta } from './requestContext.js';
import type { AvanzamentoGiornataDto, AvanzamentoInIntestazioneDto } from '../../shared/types.js';

/** Chiave in `res.locals` che dice «il corpo è già la risposta finale». */
const FORMATA = Symbol('rispostaFormata');

/** Marca la risposta: il prossimo `res.json` scrive il corpo senza busta (lo usa l'errorHandler). */
export function segnaRispostaFormata(res: Response): void {
  (res.locals as Record<symbol, unknown>)[FORMATA] = true;
}

/** Intestazione di risposta con gli avanzamenti della partita che il corpo non porta (JSON, in un array di `AvanzamentoInIntestazioneDto` senza la partita, codificato come URI: i nomi hanno accenti). */
export const INTESTAZIONE_AVANZAMENTO = 'X-Avanzamento-Partita';

/** L'esito per l'intestazione: senza la `PartitaDto` (note fino a 2000 caratteri, URI-codificate: l'intestazione supererebbe il buffer del proxy, 4 KB, e darebbe un 502
 *  su un gesto riuscito). Il client rilegge la partita dal server. */
function esitoLeggero(partitaId: number, esito: AvanzamentoGiornataDto): AvanzamentoInIntestazioneDto {
  const { giornoAvanzato, fasciaAvanzata } = esito;
  const leggero: AvanzamentoInIntestazioneDto = { partitaId };
  if (giornoAvanzato) leggero.giornoAvanzato = { da: giornoAvanzato.da, a: giornoAvanzato.a, decisioniAperte: giornoAvanzato.decisioniAperte };
  if (fasciaAvanzata) leggero.fasciaAvanzata = { giorno: fasciaAvanzata.giorno, da: fasciaAvanzata.da, a: fasciaAvanzata.a, decisioniAperte: fasciaAvanzata.decisioniAperte };
  return leggero;
}

/**
 * Decisione A1 (2026-10-25): se la richiesta ha fatto avanzare la partita (alla sera, al giorno dopo) chiudendo da sola una decisione aperta (la
 * rotta non ne sa niente), la risposta lo dice come dopo una spunta, e il client si allinea. Gli avanzamenti si prelevano dal contesto della
 * richiesta per ogni partita, qualunque sia l'indirizzo. Su `/api/partite/:id/…` con un corpo oggetto l'esito di quella partita viaggia nel
 * corpo (`fasciaAvanzata` / `giornoAvanzato`); ogni altro caso (un'altra famiglia di rotte, un elenco o un valore, un esito di un'altra partita)
 * lo porta l'intestazione `X-Avanzamento-Partita`. Un corpo che li ha già resta com'è.
 */
function conAvanzamento(req: Request, res: Response, body: unknown): unknown {
  const ids = partiteConAvanzamentoRichiesta();
  if (ids.length === 0) return body;
  const b = body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : null;
  if (b && (b.giornoAvanzato !== undefined || b.fasciaAvanzata !== undefined)) return body;
  const m = /^\/api\/partite\/(\d+)(?:[/?]|$)/.exec(req.originalUrl);
  const nelCorpo = b && m ? Number(m[1]) : null;
  let corpo: unknown = body;
  const inIntestazione: AvanzamentoInIntestazioneDto[] = [];
  for (const id of ids) {
    const esito = prelevaAvanzamentoValido(id);
    if (!esito) continue;
    if (id === nelCorpo) corpo = { ...b, ...esito };
    else inIntestazione.push(esitoLeggero(id, esito));
  }
  if (inIntestazione.length > 0 && !res.headersSent) res.setHeader(INTESTAZIONE_AVANZAMENTO, encodeURIComponent(JSON.stringify(inIntestazione)));
  return corpo;
}

/** Avvolge le risposte JSON riuscite in `{ data: ... }`. */
export function responseShapeMiddleware(req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json.bind(res);

  res.json = function (body: unknown): Response {
    if ((res.locals as Record<symbol, unknown>)[FORMATA] === true) return originalJson(body);
    return originalJson({ data: conAvanzamento(req, res, body) });
  };

  next();
}
