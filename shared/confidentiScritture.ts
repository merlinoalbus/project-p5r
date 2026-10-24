// ============================================================
// Gli editor dei Confidenti (L9 R9-07/1-4) — tipi condivisi
// ============================================================

export const MODI_RANGO = ['punti', 'evento', 'automatico', 'richieste', 'velluto'] as const;
export type ModoRango = (typeof MODI_RANGO)[number];

/** Un rango del Confidente: come si sale (`modo`) e la soglia in punti (solo per «punti»); `modificato` se è stato cambiato rispetto alla guida. */
export interface RangoConfidenteDto { rango: number; modo: ModoRango; puntiNecessari: number; fonte: string | null; modificato: boolean }

/** Le abilità di un rango, nell'ordine della guida. */
export interface AbilitaRangoDto { rango: number; abilita: Array<{ nome: string; descrizione: string }>; modificato: boolean }

/** Una scelta di dialogo, con i punti che dà (nessuno = null). */
export interface SceltaDialogo { ordine: number; testo: string; punti: number | null; puntiTesto: string | null; romantica: boolean; avviso: string | null }

/** Un dialogo di rango con le sue note e le sue scelte. */
export interface DialogoModificatoDto { id: number; note: string; scelte: SceltaDialogo[]; modificato: boolean }
