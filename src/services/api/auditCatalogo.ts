import { apiPost } from './_helpers';

export const ripristinaCostoPrecedenteRegalo = (confidente: string, ordine: number, costoAttuale: string | null): Promise<{ ripristinato: true }> =>
  apiPost(`/catalogo-oggetti/regali/${encodeURIComponent(confidente)}/${ordine}/ripristina-costo`, { costoAttuale });
