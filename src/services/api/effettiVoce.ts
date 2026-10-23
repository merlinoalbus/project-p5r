import type { RichiestaDecisioneEffettoVoce, RichiestaSalvaEffettiVoce, StatoEffettiVoceDto } from '../../../shared/effettiVoce';
import { apiGet, apiPost, apiPut } from './_helpers';

const percorso = (uid: string) => `/compendio/percorso/voci/${encodeURIComponent(uid)}/effetti`;
export const getEffettiVoce = (uid: string): Promise<StatoEffettiVoceDto> => apiGet(percorso(uid));
export const salvaEffettiVoce = (uid: string, dati: RichiestaSalvaEffettiVoce): Promise<StatoEffettiVoceDto> =>
  apiPut(percorso(uid), dati, { maxRetries: 0 });

const proposte = '/compendio/percorso/effetti/proposte';
export const decidiEffettoVoce = (id: string, dati: RichiestaDecisioneEffettoVoce): Promise<unknown> =>
  apiPost(`${proposte}/${encodeURIComponent(id)}/decisione`, dati, { maxRetries: 0 });
