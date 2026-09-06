import { apiGet } from './_helpers';
import type { AccessoMondoDto, TipoAccessoMondo } from '../../../shared/accessoMondo';

export const getAccessoMondo = (tipo: TipoAccessoMondo, chiave: string): Promise<AccessoMondoDto> =>
  apiGet(`/mappe/accesso/${tipo}/${encodeURIComponent(chiave)}`);
