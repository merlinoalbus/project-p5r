import type { SchedaCorrezioneDto, TipoModificabile, ValoreCampoCorrezione } from '../../types';
import { apiGet, apiPut } from './_helpers';

const percorso = (tipo: TipoModificabile, chiave: string) => `/correzioni/${encodeURIComponent(tipo)}/${encodeURIComponent(chiave)}`;

/** La scheda di modifica di un oggetto della guida: campi, valore di adesso e valore della guida. */
export const getSchedaCorrezione = (tipo: TipoModificabile, chiave: string): Promise<SchedaCorrezioneDto> => apiGet(percorso(tipo, chiave));
/** Corregge i campi indicati (chiave = indirizzo del campo nella scheda). */
export const correggiGuida = (tipo: TipoModificabile, chiave: string, campi: Record<string, ValoreCampoCorrezione>): Promise<SchedaCorrezioneDto> => apiPut(percorso(tipo, chiave), { campi });
