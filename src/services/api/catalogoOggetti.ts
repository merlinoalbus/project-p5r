import type { CategoriaOggetto } from '../../../shared/catalogo';
import type { CensimentoScambiCatalogoDto } from '../../../shared/censimentoScambiCatalogo';
import type { ConfrontoTanakaDto } from '../../../shared/tanakaSnapshot';
import type { AnteprimaPianoTanakaDto, RicevutaTanakaDto } from '../../../shared/tanakaDecisione';
import type { CatalogoOggettoDto, DatiLegameOggettoDto, DatiNuovoOggettoDto, NotaStoricaOfferta, OggettoDettaglioDto, PropostaAbbinamentoDto, SceltaAbbinamentoOggettoDto, TipoPropostaOggetto } from '../../types';
import { apiDelete, apiGet, apiPost, apiPut, queryString } from './_helpers';

const percorso = (chiave: string) => `/catalogo-oggetti/${chiave.split('/').map(encodeURIComponent).join('/')}`;

export const getScambiConFonti = (): Promise<CensimentoScambiCatalogoDto> => apiGet('/catalogo-oggetti/censimento-scambi');
export const getConfrontoTanaka = (): Promise<ConfrontoTanakaDto> => apiGet('/catalogo-oggetti/confronto-tanaka');

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
/** L7-TANAKA: l'anteprima della decisione unitaria (sola lettura). */
export const getPianoTanaka = (): Promise<AnteprimaPianoTanakaDto> => apiGet('/catalogo-oggetti/tanaka/piano');
/** L7-TANAKA: la conferma dell'utente, con le revisioni dell'anteprima mostrata e un identificativo dell'operazione (idempotente). */
export const confermaPianoTanaka = (dati: { operazioneId: string; revisioneConfronto: string; revisionePiano: string }): Promise<RicevutaTanakaDto> =>
  apiPost('/catalogo-oggetti/tanaka/piano/conferma', dati);
/** L7-TANAKA: le decisioni registrate, con ricevuta e archivio. */
export const getDecisioniTanaka = (): Promise<RicevutaTanakaDto[]> => apiGet('/catalogo-oggetti/tanaka/decisioni');
/** L7-TANAKA: il ripristino unitario di una decisione, con la revisione dello stato letta nella ricevuta. */
export const ripristinaDecisioneTanaka = (decisione: string, dati: { operazioneId: string; revisioneStato: string }): Promise<RicevutaTanakaDto> =>
  apiPost(`/catalogo-oggetti/tanaka/decisioni/${encodeURIComponent(decisione)}/ripristina`, dati);
/** F6: modifica una nota storica della fonte; `testoAttuale` è quello mostrato (409 se nel frattempo è cambiato). */
export const modificaNotaStorica = (chiave: string, dati: { testo: string; fonte: string; testoAttuale: string }): Promise<NotaStoricaOfferta> =>
  apiPut(`/catalogo-oggetti/note-storiche/${encodeURIComponent(chiave)}`, dati);
/** F6: la nota torna come la dà la guida. */
export const ripristinaNotaStorica = (chiave: string, testoAttuale: string): Promise<NotaStoricaOfferta> =>
  apiPost(`/catalogo-oggetti/note-storiche/${encodeURIComponent(chiave)}/ripristina`, { testoAttuale });
