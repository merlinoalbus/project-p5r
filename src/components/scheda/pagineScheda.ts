// ============================================================
// pagineScheda — le pagine che il pannello scheda mostra, caricate alla prima apertura (UI-ASSET-01)
// ============================================================
//
// Stanno in un modulo a parte perché `main.tsx` ne importa i `precarica` in tempo morto, come per le pagine del router: così anche una
// scheda mai aperta resta apribile se il server perde il file durante un rilascio.
// ============================================================

import { pigra } from '../../utils/pagineLazy';

/** Le pagine che mostrano un elemento di un elenco (libri, film, attività, Richieste) ricevono la chiave dell'elemento. */
export interface PropsElemento { soloChiave?: string }

export const ConfidenteDettaglioPage = pigra(() => import('../../pages/ConfidenteDettaglioPage'), 'ConfidenteDettaglioPage');
export const DungeonDettaglioPage = pigra(() => import('../../pages/DungeonDettaglioPage'), 'DungeonDettaglioPage');
export const NegozioPage = pigra(() => import('../../pages/NegozioPage'), 'NegozioPage');
export const LuogoPage = pigra(() => import('../../pages/LuogoPage'), 'LuogoPage');
export const OggettoPage = pigra(() => import('../../pages/OggettoPage'), 'OggettoPage');
export const LibriPage = pigra<typeof import('../../pages/LibriPage'), PropsElemento>(() => import('../../pages/LibriPage'), 'LibriPage');
export const FilmPage = pigra<typeof import('../../pages/FilmPage'), PropsElemento>(() => import('../../pages/FilmPage'), 'FilmPage');
export const AttivitaPage = pigra<typeof import('../../pages/AttivitaPage'), PropsElemento>(() => import('../../pages/AttivitaPage'), 'AttivitaPage');
export const RichiestePage = pigra<typeof import('../../pages/RichiestePage'), PropsElemento>(() => import('../../pages/RichiestePage'), 'RichiestePage');

/** Il bivio «Dove si trova» come vista del cassetto del Confidente (parametri: `tipo` e `chiave` dell'indirizzo `/guida/mondo/:tipo/:chiave`). */
export interface PropsDoveSiTrova { tipo: string; chiave: string }
export const DoveSiTrovaNelCassetto = pigra<typeof import('../../pages/AccessoMondoPage'), PropsDoveSiTrova>(() => import('../../pages/AccessoMondoPage'), 'AccessoMondoNelCassetto');

/** I `precarica` delle pagine del pannello scheda (il modulo importato resta in memoria: la promessa riuscita è in cache). */
export const precaricaPagineScheda: ReadonlyArray<() => Promise<void>> = [
  ConfidenteDettaglioPage, DungeonDettaglioPage, NegozioPage, LuogoPage, OggettoPage, LibriPage, FilmPage, AttivitaPage, RichiestePage, DoveSiTrovaNelCassetto,
].map((p) => p.precarica);
