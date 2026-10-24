// ============================================================
// API — le Ombre e la negoziazione per umore (L8, B8)
// ============================================================

import type { NegoziazioneCompattaDto, NegoziazioneDto } from '../../../shared/negoziazione';
import type { OmbraDettaglioDto, OmbraSchedaDto } from '../../../shared/ombre';
import { apiGet, queryString } from './_helpers';

/** Le Ombre con debolezze (dal compendio), luoghi e, con la partita, se la Persona è registrata e se ogni incontro è ancora raggiungibile. */
export const getOmbre = (filtri: { q?: string; dungeon?: string; personalita?: string; persona?: number; partita?: number } = {}): Promise<OmbraSchedaDto[]> =>
  apiGet(`/compendio/ombre${queryString(filtri)}`);

/** La scheda di un'Ombra; con la partita, la registrazione e dove si cattura ancora. */
export const getOmbra = (chiave: string, partita?: number): Promise<OmbraDettaglioDto> => apiGet(`/compendio/ombre/${encodeURIComponent(chiave)}${queryString({ partita })}`);

/** La negoziazione in forma compatta per un umore (o per l'umore di un'Ombra), con la ricerca per testo sull'intero corpus. */
export const getNegoziazioneCompatta = (filtri: { umore?: string; ombra?: string; q?: string }): Promise<NegoziazioneCompattaDto> =>
  apiGet(`/compendio/negoziazione${queryString({ ...filtri, compatto: '1' })}`);

/** Una famiglia di domande con tutto il dettaglio: varianti, provenienze e attestazioni di ogni cella dell'umore. */
export const getNegoziazioneDomanda = (domanda: string, umore: string): Promise<NegoziazioneDto> =>
  apiGet(`/compendio/negoziazione${queryString({ domanda, umore })}`);
