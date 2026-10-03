// ============================================================
// API catalogo — righe aggiunte o corrette dall'utente (Fase 16.1)
// ============================================================

import type { ElementoCatalogoDto, OggettoSelezionabileDto, RiepilogoCatalogoDto, TipoCatalogo } from '../../types';
import { apiDelete, apiGet, apiPost, apiPut, queryString } from './_helpers';

/** Quante righe l'utente ha aggiunto, corretto o nascosto, per tipo. */
export const getRiepilogoCatalogo = (): Promise<RiepilogoCatalogoDto> => apiGet('/catalogo');

/** Righe del catalogo toccate dall'utente per un tipo; con `nascosti` le sole nascoste (pagina «Rimossi»), anche di un solo negozio. */
export const getCatalogo = (tipo: TipoCatalogo, filtro: { nascosti?: boolean; negozio?: string } = {}): Promise<ElementoCatalogoDto[]> =>
  apiGet(`/catalogo/${tipo}${queryString({ nascosti: filtro.nascosti ? '1' : undefined, negozio: filtro.negozio })}`);

/** Una riga qualunque (anche del seed), per il modulo di modifica. */
export const getElementoCatalogo = (tipo: TipoCatalogo, chiave: string): Promise<ElementoCatalogoDto> =>
  apiGet(`/catalogo/${tipo}/${encodeURIComponent(chiave)}`);

/** **Tutti** gli oggetti che l'app conosce, di qualunque tipo, in un elenco solo.
 *
 * Chi mette qualcosa in vendita cerca «Il magnifico ladro», non «libro»: la categoria arriva con
 * l'oggetto scelto invece di doverla indovinare prima. */
export const getTuttiGliOggetti = (): Promise<OggettoSelezionabileDto[]> => apiGet('/catalogo/oggetti');

export const creaElementoCatalogo = (tipo: TipoCatalogo, dati: Record<string, unknown>): Promise<ElementoCatalogoDto> =>
  apiPost(`/catalogo/${tipo}`, dati);

export const aggiornaElementoCatalogo = (tipo: TipoCatalogo, chiave: string, dati: Record<string, unknown>): Promise<ElementoCatalogoDto> =>
  apiPut(`/catalogo/${tipo}/${encodeURIComponent(chiave)}`, dati);

/** Nasconde una riga del seed (o la rimostra) senza cancellarla: il ricaricamento dei dati la riporterebbe. */
export const nascondiElementoCatalogo = (tipo: TipoCatalogo, chiave: string, nascosta: boolean): Promise<ElementoCatalogoDto> =>
  apiPut(`/catalogo/${tipo}/${encodeURIComponent(chiave)}/nascosta`, { nascosta });

/** Elimina la riga creata dall'utente, oppure riporta ai dati della guida quella che aveva corretto. */
export const eliminaElementoCatalogo = (tipo: TipoCatalogo, chiave: string): Promise<{ esito: 'eliminata' | 'ripristinata'; elemento: ElementoCatalogoDto | null }> =>
  apiDelete(`/catalogo/${tipo}/${encodeURIComponent(chiave)}`);

// L'agenda del giorno (eventi e cose da fare) dal 2026-09-30 è fatta di voci della giornata: `services/api/compendio.ts`.
