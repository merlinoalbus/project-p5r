// ============================================================
// requisitiVoce — piccoli helper dell'elenco «In scorta» di una voce (usati da `RequisitiVoce` e dalla casella di completamento)
// ============================================================

import type { RequisitoVoceDto } from '../../shared/requisitiVoce';

/** L'id della didascalia della casella di completamento («Mancano n»), letta dalla casella con `aria-describedby`. */
export const idMotivoScorta = (uid: string): string => `scorta-motivo-${uid}`;

/** Il nome completo di un requisito (titolo e nome accessibile): l'arcano, oppure la Persona specifica con l'arcano fra parentesi (comincia
 *  con il nome scritto sul chip, che per una Persona specifica mostra il ritratto e non la figura dell'arcano). */
export const nomeRequisito = (r: Pick<RequisitoVoceDto, 'arcanaNome' | 'personaNome'>): string => (r.personaNome ? `${r.personaNome} (${r.arcanaNome})` : r.arcanaNome);

/** Il nome breve sul chip: la Persona se è specifica (accanto al suo ritratto; l'arcano sta nel titolo e nel nome accessibile), altrimenti l'arcano. */
export const nomeBreveRequisito = (r: Pick<RequisitoVoceDto, 'arcanaNome' | 'personaNome'>): string => r.personaNome ?? r.arcanaNome;
