// ============================================================
// scontiNegozi — lo sconto di un negozio legato al rango di un Confidente (chiusura dell'ondata 5, decisione 21)
// ============================================================
//
// Il caso della guida: la Clinica di Takemi vende tutto a metà prezzo quando il Confidente della Morte arriva al rango indicato. Il prezzo
// resta uno solo, quello dell'offerta (`articolo.prezzo`); lo sconto è un dato del negozio (`negozio.sconto_json`, migrazione 254) e il prezzo
// scontato si calcola, non si scrive: prima della migrazione 269 era copiato a mano nelle descrizioni del catalogo («sconto 1.700¥»), e gli
// yen automatici (decisione 18) non lo applicavano. Un solo punto lo legge per tutti: il server per gli yen e per i listini, l'interfaccia
// per dirlo accanto al prezzo.
// ============================================================

export interface ScontoNegozio {
  /** Il Confidente il cui rango attiva lo sconto (chiave). */
  confidente: string;
  /** Il rango dal quale vale lo sconto (1-10). */
  rango: number;
  /** La percentuale tolta dal prezzo (1-99). */
  percentuale: number;
}

/** Lo sconto letto dal JSON del negozio; null se assente o non valido (un dato illeggibile non sconta niente). */
export function normalizzaSconto(raw: unknown): ScontoNegozio | null {
  let v = raw;
  if (typeof v === 'string') { try { v = JSON.parse(v) as unknown; } catch { return null; } }
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const s = v as Record<string, unknown>;
  if (typeof s.confidente !== 'string' || !s.confidente.trim()) return null;
  if (typeof s.rango !== 'number' || !Number.isInteger(s.rango) || s.rango < 1 || s.rango > 10) return null;
  if (typeof s.percentuale !== 'number' || !Number.isInteger(s.percentuale) || s.percentuale < 1 || s.percentuale > 99) return null;
  return { confidente: s.confidente, rango: s.rango, percentuale: s.percentuale };
}

/** Vero se con il rango del Confidente nella partita lo sconto vale (rango sconosciuto: no). */
export const scontoAttivo = (sconto: ScontoNegozio, rango: number | null | undefined): boolean => typeof rango === 'number' && rango >= sconto.rango;

/** Il prezzo con lo sconto applicato, in yen interi (arrotondato: la guida dà sempre la metà esatta di prezzi pari). */
export const prezzoScontato = (prezzo: number, sconto: ScontoNegozio): number => Math.round((prezzo * (100 - sconto.percentuale)) / 100);

/** Come si dice lo sconto: «Sconto del 50% dal rango 10 di Takemi». */
export const testoSconto = (sconto: ScontoNegozio, nomeConfidente: string): string =>
  `Sconto del ${sconto.percentuale}% dal rango ${sconto.rango} di ${nomeConfidente}`;
