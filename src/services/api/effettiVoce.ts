import type { RichiestaSalvaEffettiVoce, StatoEffettiVoceDto } from '../../../shared/effettiVoce';
import type { FiltroProposte, PropostaConversioneDto, RichiestaApplicaProposta, RichiestaScartaProposta } from '../../../shared/proposteConversione';
import type { AzionePercorsoDto } from '../../types';
import { apiGet, apiPost, apiPut, queryString } from './_helpers';

const percorso = (uid: string) => `/compendio/percorso/voci/${encodeURIComponent(uid)}/effetti`;
export const salvaEffettiVoce = (uid: string, dati: RichiestaSalvaEffettiVoce): Promise<StatoEffettiVoceDto> =>
  apiPut(percorso(uid), dati, { maxRetries: 0 });

// ---- L13 (ondata 4a): proposte «da completare» sulle voci del Diario (solo preparazione: i chiamanti escludono il ramo nel rilascio) ----
const proposte = '/compendio/proposte-conversione';
/** Le proposte del periodo (giorni «MM-GG», estremi compresi) e dello stato (aperte, se non indicato). */
export const getProposteConversione = (f: FiltroProposte = {}): Promise<PropostaConversioneDto[]> => apiGet(`${proposte}${queryString({ da: f.da, a: f.a, stato: f.stato })}`);
/** Applica una proposta (con gli effetti completati, o con la voce della finestra da «Modifica»): una sola volta, nessun nuovo tentativo. */
export const applicaPropostaConversione = (id: string, r: RichiestaApplicaProposta, partita?: number): Promise<{ proposta: PropostaConversioneDto; voce: AzionePercorsoDto }> =>
  apiPost(`${proposte}/${encodeURIComponent(id)}/applica${queryString({ partita })}`, r, { maxRetries: 0 });
/** Scarta una proposta: la voce non cambia. */
export const scartaPropostaConversione = (id: string, r: RichiestaScartaProposta): Promise<PropostaConversioneDto> =>
  apiPost(`${proposte}/${encodeURIComponent(id)}/scarta`, r, { maxRetries: 0 });
