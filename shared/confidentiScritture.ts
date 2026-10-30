// ============================================================
// Gli editor dei Confidenti (L9 R9-07/1-4) — tipi condivisi
// ============================================================

export const MODI_RANGO = ['punti', 'evento', 'automatico', 'richieste', 'velluto'] as const;
export type ModoRango = (typeof MODI_RANGO)[number];

/** Un rango del Confidente: come si sale (`modo`) e la soglia in punti (solo per «punti»); `modificato` se è stato cambiato rispetto alla guida. */
export interface RangoConfidenteDto { rango: number; modo: ModoRango; puntiNecessari: number; fonte: string | null; modificato: boolean }

/** Le abilità di un rango, nell'ordine della guida. */
export interface AbilitaRangoDto { rango: number; abilita: Array<{ nome: string; descrizione: string }>; modificato: boolean }

/**
 * Una scelta di dialogo, con i punti che dà: `punti` (null = la guida non ne dà, 0 = nessun punto) e, solo dove la guida dà un valore diverso
 * nel ramo amore, `puntiAmore` (migrazione 309: i punti sono solo numerici, il testo della guida «+3»/«♪♪» non c'è più).
 */
export interface SceltaDialogo { ordine: number; testo: string; punti: number | null; puntiAmore?: number | null; romantica: boolean; avviso: string | null }

/** Una scelta letta dal JSON salvato (`confidente_dialogo.scelte_json` o la sua fotografia): i soli campi del modello, mai altro. */
export function leggiSceltaDialogo(s: Record<string, unknown>, indice: number): SceltaDialogo {
  const numero = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const testo = (v: unknown): string | null => (typeof v === 'string' ? v : null);
  const puntiAmore = numero(s.puntiAmore);
  return {
    ordine: numero(s.ordine) ?? indice + 1,
    testo: testo(s.testo) ?? '',
    punti: numero(s.punti),
    ...(puntiAmore !== null ? { puntiAmore } : {}),
    romantica: s.romantica === true,
    avviso: testo(s.avviso),
  };
}

/** Le scelte di un JSON salvato; [] se non si legge o non è un elenco. */
export function leggiScelteDialogo(json: string): SceltaDialogo[] {
  try {
    const v = JSON.parse(json) as unknown;
    return Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object').map(leggiSceltaDialogo) : [];
  } catch { return []; }
}

/** Un dialogo di rango con le sue note e le sue scelte. */
export interface DialogoModificatoDto { id: number; note: string; scelte: SceltaDialogo[]; modificato: boolean }
