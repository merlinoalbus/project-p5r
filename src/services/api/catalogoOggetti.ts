import type { CategoriaOggetto } from '../../../shared/catalogo';
import type { CatalogoOggettoDto, DatiLegameOggettoDto, DatiNuovoOggettoDto, OggettoDettaglioDto, PropostaAbbinamentoDto, SceltaAbbinamentoOggettoDto, TipoPropostaOggetto } from '../../types';
import { apiDelete, apiGet, apiPost, apiPut, queryString } from './_helpers';

const percorso = (chiave: string) => `/catalogo-oggetti/${chiave.split('/').map(encodeURIComponent).join('/')}`;

export const getCatalogoOggetti = (filtro: { categoria?: CategoriaOggetto; q?: string; partita?: number; nascosti?: boolean } = {}): Promise<CatalogoOggettoDto[]> =>
  apiGet(`/catalogo-oggetti${queryString({ ...filtro, nascosti: filtro.nascosti ? '1' : undefined })}`);
export const getOggettoCatalogo = (chiave: string, partita?: number): Promise<OggettoDettaglioDto> => apiGet(`${percorso(chiave)}${queryString({ partita })}`);
export const creaOggettoCatalogo = (dati: DatiNuovoOggettoDto): Promise<CatalogoOggettoDto> => apiPost('/catalogo-oggetti', dati);
export const aggiornaOggettoCatalogo = (chiave: string, dati: Partial<DatiNuovoOggettoDto>): Promise<CatalogoOggettoDto> => apiPut(percorso(chiave), dati);
export const ripristinaOggettoCatalogo = (chiave: string): Promise<CatalogoOggettoDto> => apiPost(`${percorso(chiave)}/ripristina`, {});
export const eliminaOggettoCatalogo = (chiave: string): Promise<{ eliminato: true; chiave: string }> => apiDelete(percorso(chiave));
export const getProposteOggetti = (filtro: { riga_tipo?: TipoPropostaOggetto; riga_chiave?: string; stato?: PropostaAbbinamentoDto['stato'] } = {}): Promise<PropostaAbbinamentoDto[]> =>
  apiGet(`/catalogo-oggetti/proposte${queryString(filtro)}`);
export const confermaAbbinamentoOggetto = (dati: SceltaAbbinamentoOggettoDto): Promise<{ confermata: true }> => apiPost('/catalogo-oggetti/proposte/conferma', dati);
export const scartaAbbinamentoOggetto = (dati: SceltaAbbinamentoOggettoDto): Promise<{ scartata: true }> => apiPost('/catalogo-oggetti/proposte/scarta', dati);
export const impostaLegameOggetto = (dati: DatiLegameOggettoDto): Promise<{ salvato: true }> => apiPut('/catalogo-oggetti/legami', dati);
