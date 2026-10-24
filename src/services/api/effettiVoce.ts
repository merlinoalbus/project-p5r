import type { RichiestaSalvaEffettiVoce, StatoEffettiVoceDto } from '../../../shared/effettiVoce';
import { apiPut } from './_helpers';

const percorso = (uid: string) => `/compendio/percorso/voci/${encodeURIComponent(uid)}/effetti`;
export const salvaEffettiVoce = (uid: string, dati: RichiestaSalvaEffettiVoce): Promise<StatoEffettiVoceDto> =>
  apiPut(percorso(uid), dati, { maxRetries: 0 });
