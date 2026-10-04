// ============================================================
// API accesso al mondo — da un elemento della guida alle mappe dell'atlante che lo mostrano
// ============================================================

import { apiGet } from './_helpers';
import type { AccessoMondoDto, TipoAccessoMondo } from '../../../shared/accessoMondo';

/** GET `/mappe/accesso/:tipo/:chiave`: le destinazioni sulle mappe (unica, multiple o assente) registrate per l'elemento `tipo`/`chiave`. */
export const getAccessoMondo = (tipo: TipoAccessoMondo, chiave: string): Promise<AccessoMondoDto> =>
  apiGet(`/mappe/accesso/${tipo}/${encodeURIComponent(chiave)}`);
