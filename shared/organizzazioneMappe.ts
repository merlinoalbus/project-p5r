// ============================================================
// organizzazioneMappe — DTO delle schede della guida senza mappa e della risoluzione di un percorso
// ============================================================

import type { SpilloDto } from './types.js';
export type SchedaContenutoGuidaDto = Omit<SpilloDto, 'x' | 'y' | 'mappaChiave' | 'destinazione' | 'destinazioneNonDisponibile'> & { areaGuida: string };
/** Le sezioni della guida non sono planimetrie. */
export interface DestinazioneGuidaDto { area: string; dungeon: string; mappaPalazzo: string; nome: string;
  /** L3: la casa della sezione, la scheda del Palazzo sull'infiltrazione (`/guida/dungeon/<k>?infiltrazione=<i>`). Il server la manda
   *  sempre; è facoltativa solo per i dati di prova scritti prima di L3. */
  casa?: string }
/** Che cosa apre un percorso: una mappa, con la sua casa (L2: l'unica pagina che la mostra — La città, il quartiere, l'Area con la
 *  versione, o il visore), oppure una sezione della guida di un Palazzo. */
export type RisoluzioneMappaDto = { tipo: 'mappa'; mappa: string; casa: string } | ({ tipo: 'guida' } & DestinazioneGuidaDto);
