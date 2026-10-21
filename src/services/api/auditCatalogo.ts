import type { AuditCatalogo } from '../../../shared/auditCatalogo';
import { apiGet, apiPost } from './_helpers';

export const getAuditConversioneCatalogo = (): Promise<AuditCatalogo | null> => apiGet('/catalogo-oggetti/audit');
export const ripristinaCostoPrecedenteRegalo = (confidente: string, ordine: number, costoAttuale: string | null): Promise<{ ripristinato: true }> =>
  apiPost(`/catalogo-oggetti/regali/${encodeURIComponent(confidente)}/${ordine}/ripristina-costo`, { costoAttuale });
