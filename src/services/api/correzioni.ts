import type { EsitoRipristinoCorrezioneDto, RiepilogoCorrezioneDto, SchedaCorrezioneDto, TipoModificabile, ValoreCampoCorrezione } from '../../types';
import { apiGet, apiPost, apiPut, queryString } from './_helpers';

const percorso = (tipo: TipoModificabile, chiave: string) => `/correzioni/${encodeURIComponent(tipo)}/${encodeURIComponent(chiave)}`;

/** Le correzioni attive ai dati della guida (L11 · B11), per tipo se indicato. */
export const getCorrezioni = (tipo?: TipoModificabile): Promise<RiepilogoCorrezioneDto[]> => apiGet(`/correzioni${queryString({ tipo })}`);
/** La scheda di modifica di un oggetto della guida: campi, valore di adesso e valore della guida. */
export const getSchedaCorrezione = (tipo: TipoModificabile, chiave: string): Promise<SchedaCorrezioneDto> => apiGet(percorso(tipo, chiave));
/** Corregge i campi indicati (chiave = indirizzo del campo nella scheda). */
export const correggiGuida = (tipo: TipoModificabile, chiave: string, campi: Record<string, ValoreCampoCorrezione>): Promise<SchedaCorrezioneDto> => apiPut(percorso(tipo, chiave), { campi });
/** Rimette il valore della guida, per tutto l'oggetto o solo per i campi indicati. */
export const ripristinaGuida = (tipo: TipoModificabile, chiave: string, campi?: string[]): Promise<EsitoRipristinoCorrezioneDto> => apiPost(`${percorso(tipo, chiave)}/ripristina`, campi ? { campi } : {});
