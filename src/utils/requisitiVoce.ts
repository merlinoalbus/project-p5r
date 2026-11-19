// ============================================================
// requisitiVoce — piccoli helper dell'elenco «In scorta» di una voce (usati da `RequisitiVoce` e dalla casella di completamento)
// ============================================================

import type { RequisitoVoceDto } from '../../shared/requisitiVoce';

/** L'id della didascalia della casella di completamento («Mancano n»), letta dalla casella con `aria-describedby`. */
export const idMotivoScorta = (uid: string): string => `scorta-motivo-${uid}`;

/** Il nome completo di un requisito (titolo e nome accessibile): l'arcano, con la Persona fra parentesi se è specifica. */
export const nomeRequisito = (r: Pick<RequisitoVoceDto, 'arcanaNome' | 'personaNome'>): string => (r.personaNome ? `${r.arcanaNome} (${r.personaNome})` : r.arcanaNome);

/** Il nome breve sul chip: la Persona se è specifica (l'arcano lo dice la figura accanto), altrimenti l'arcano. */
export const nomeBreveRequisito = (r: Pick<RequisitoVoceDto, 'arcanaNome' | 'personaNome'>): string => r.personaNome ?? r.arcanaNome;
