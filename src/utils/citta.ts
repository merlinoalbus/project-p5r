// ============================================================
// citta — etichette dei tipi di luogo, attività e Doti (Fase 8.1)
// ============================================================

import { TIPI_LUOGO } from '../../shared/tipiLuogo';

/** Etichette dei tipi di luogo: derivate dal catalogo condiviso (shared/tipiLuogo). */
export const NOME_TIPO_LUOGO: Record<string, string> = Object.fromEntries(TIPI_LUOGO.map((t) => [t.chiave, t.nome]));

export const NOME_TIPO_ATTIVITA: Record<string, string> = {
  'mini-gioco': 'Mini-gioco',
  lavoro: 'Lavoro',
  studio: 'Studio',
  lettura: 'Lettura',
  film: 'Film',
  dvd: 'DVD',
  videogioco: 'Videogioco',
  allenamento: 'Allenamento',
  cibo: 'Cibo',
  sfida: 'Sfida',
  altro: 'Altro',
};

export const NOME_DOTE: Record<string, string> = {
  conoscenza: 'Conoscenza',
  fascino: 'Fascino',
  coraggio: 'Coraggio',
  gentilezza: 'Gentilezza',
  perizia: 'Perizia',
};

/** Colori degli spilli dei luoghi sulla mappa del quartiere: dal catalogo condiviso. */
export const COLORE_TIPO_LUOGO: Record<string, string> = Object.fromEntries(TIPI_LUOGO.map((t) => [t.chiave, t.colore]));

export const NOME_FASCIA: Record<string, string> = { giorno: 'giorno', sera: 'sera', entrambe: 'giorno e sera' };
