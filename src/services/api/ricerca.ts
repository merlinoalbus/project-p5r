// ============================================================
// API ricerca — la ricerca globale per nome in tutta la guida (L11, B4)
// ============================================================

import type { RicercaGlobaleDto, TipoRicerca } from '../../../shared/ricerca';
import { apiGet, queryString } from './_helpers';

/** Opzioni della ricerca: i tipi da cercare (tutti se mancano), i risultati per gruppo e la partita (per lo stato «Chiuso adesso» dei posti). */
export interface OpzioniRicerca { tipi?: readonly TipoRicerca[]; limite?: number; partita?: number }

/** La ricerca globale (`GET /api/ricerca`). Non mostra avvisi da sola e non ritenta: l'errore lo dice la finestra della ricerca, con «Riprova».
 *  Il client non ha un segnale di annullamento: le risposte superate le scarta chi chiama. */
export const cercaGlobale = (q: string, o: OpzioniRicerca = {}): Promise<RicercaGlobaleDto> =>
  apiGet(`/ricerca${queryString({ q, tipi: o.tipi?.join(','), limite: o.limite, partita: o.partita })}`, { silent: true, maxRetries: 0 });
