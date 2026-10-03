// ============================================================
// API font — font dell'utente per i ruoli tipografici (display, menu, decor)
// ============================================================

import type { FontDto, RuoloFont } from '../../types';
import { apiDelete, apiGet, inviaFile } from './_helpers';

/** Stato dei tre ruoli tipografici nell'istanza. */
export const getFont = (): Promise<FontDto[]> => apiGet('/font');

/** Carica il file di un font (TTF, OTF, WOFF o WOFF2) per un ruolo; il formato è riconosciuto dal contenuto. */
export const caricaFont = (ruolo: RuoloFont, file: File): Promise<FontDto> => inviaFile('PUT', `/font/${encodeURIComponent(ruolo)}`, file);

/** Rimuove il font di un ruolo: l'app torna al predefinito. */
export const eliminaFont = (ruolo: RuoloFont): Promise<void> => apiDelete(`/font/${encodeURIComponent(ruolo)}`);
