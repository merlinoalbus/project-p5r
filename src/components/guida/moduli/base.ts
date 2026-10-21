// ============================================================
// base — il contratto di un modulo del catalogo e le letture elementari dei valori
// ============================================================
//
// `ModuloCatalogo` è il guscio (finestra, Salva, Ripristina, Nascondi); ogni tipo ha il suo
// modulo, che dichiara tre cose: con quali valori parte (`iniziali`), quando è salvabile
// (`valido`) e che cosa manda all'API (`prepara`). Lo stato è un solo oggetto con i nomi delle
// colonne, com'è nell'API: i valori temporanei (l'oggetto collegato, la via «a mano») stanno
// sotto chiavi che iniziano con `_` e `prepara` li toglie. Le definizioni sono in
// `definizioni.ts` (funzioni pure), i componenti nei file `Modulo*.tsx`.
// ============================================================

import type { ComponentType } from 'react';
import type { ElementoCatalogoDto } from '../../../types';
import type { RequisitoSpillo } from '../../../../shared/condizioniSpillo';

export type Dati = Record<string, unknown>;

export interface PropsModulo {
  dati: Dati;
  /** Aggiorna alcuni campi (fusione con i valori correnti). */
  imposta: (patch: Dati) => void;
  /** Le condizioni appartengono al guscio: un gesto esplicito può aggiornarle insieme ai campi. */
  impostaCondizioni?: (condizioni: RequisitoSpillo[]) => void;
  elemento: ElementoCatalogoDto | null;
  nuovo: boolean;
  disabilitato: boolean;
  /** Per un articolo nuovo: il negozio a cui appartiene. */
  negozioChiave?: string;
}

export interface DefinizioneModulo {
  iniziali: (elemento: ElementoCatalogoDto | null, negozioChiave?: string) => Dati;
  valido: (dati: Dati) => boolean;
  prepara: (dati: Dati) => Dati;
  /** Il modulo scrive `condizioni_json`: il guscio mostra l'editor delle condizioni. */
  conCondizioni: boolean;
  /** La tabella ha `verificato`: il guscio offre la spunta «Confermato». */
  conVerificato: boolean;
}

export interface ModuloCompleto extends DefinizioneModulo { Componente: ComponentType<PropsModulo> }

/** Il valore di un campo come stringa da mostrare (null e undefined = vuoto). */
export const testoDi = (v: unknown): string => (v === null || v === undefined ? '' : String(v));
/** Un numero dal campo, o null se vuoto. */
export const numeroDi = (v: unknown): number | null => (v === null || v === undefined || v === '' ? null : Number(v));
/** Un testo ripulito, o null se vuoto. */
export const testoOnull = (v: unknown): string | null => { const t = testoDi(v).trim(); return t ? t : null; };
/** Legge un JSON salvato nella riga (stringa) o già oggetto. */
export function jsonDi<T>(v: unknown, altrimenti: T): T {
  if (v === null || v === undefined || v === '') return altrimenti;
  if (typeof v !== 'string') return v as T;
  try { return JSON.parse(v) as T; } catch { return altrimenti; }
}
/** Un editor normalizzato non deve cancellare parti del RAW senza una scelta esplicita. */
export function jsonSenzaPerdite(raw: unknown, normalizza: (v: unknown) => unknown): boolean {
  if (raw == null) return true;
  const canonico = (v: unknown) => JSON.stringify(v, (_k, x: unknown) => x && typeof x === 'object' && !Array.isArray(x)
    ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x);
  try {
    const v: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return canonico(v) === canonico(normalizza(v));
  } catch { return false; }
}
/** Toglie i valori temporanei (`_…`). */
export function senzaTemporanei(dati: Dati): Dati {
  return Object.fromEntries(Object.entries(dati).filter(([k]) => !k.startsWith('_')));
}
/** Il booleano `verificato` come arriva dalla riga (1/0) o dal modulo (true/false). */
export const verificatoDi = (e: ElementoCatalogoDto | null): boolean => e?.dati.verificato === 1 || e?.dati.verificato === true;
