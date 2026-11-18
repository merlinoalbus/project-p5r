// ============================================================
// requisitiVoce — piccoli helper dell'elenco «In scorta» di una voce (usati da `RequisitiVoce` e dalla casella di completamento)
// ============================================================

import type { RequisitoVoceDto } from '../../shared/requisitiVoce';

/** L'id del contatore «n/N» di una voce (letto dalla casella di completamento con `aria-describedby`). */
export const idContatoreScorta = (uid: string): string => `scorta-${uid}`;

/** Il nome di un requisito: l'arcano, con la Persona fra parentesi se è specifica. */
export const nomeRequisito = (r: Pick<RequisitoVoceDto, 'arcanaNome' | 'personaNome'>): string => (r.personaNome ? `${r.arcanaNome} (${r.personaNome})` : r.arcanaNome);
