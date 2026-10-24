// Il collegamento è una fonte di guida, non un secondo gesto che attribuisce premi o turni.
import type { AttivitaDto } from './types.js';

const elencoVuoto = (v: unknown): boolean => {
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v !== 'string') return v == null;
  try { const x: unknown = JSON.parse(v); return Array.isArray(x) && x.length === 0; } catch { return false; }
};
const haTesto = (v: unknown): boolean => v != null && (typeof v !== 'string' || v.trim() !== '');

/** Campi autonomi da risolvere esplicitamente prima di usare la fonte Confidente. Il RAW legacy delle Doti di
 * una riga già collegata può rimanere storico: non viene né esposto come premio né ricostruito in effetti. */
export function campiAutonomiAttivitaConfidente(d: Record<string, unknown>, conDotiStoriche = false): string[] {
  const campi: string[] = [];
  if (d.tipo === 'videogioco') campi.push('tipo');
  if (d.fascia != null) campi.push('fascia');
  if (!elencoVuoto(d.condizioni_json)) campi.push('condizioni_json');
  if (!elencoVuoto(d.effetti_json)) campi.push('effetti_json');
  if (!conDotiStoriche && !elencoVuoto(d.doti_json)) campi.push('doti_json');
  if (d.tracciamento != null && d.tracciamento !== 'nessuno') campi.push('tracciamento');
  if (d.sessioni != null && d.sessioni !== 1) campi.push('sessioni');
  if (d.quiz_json != null) campi.push('quiz_json');
  if (d.costo != null && d.costo !== 0) campi.push('costo');
  for (const c of ['paga_yen', 'paga_massima']) if (d[c] != null) campi.push(c);
  for (const c of ['sblocco']) if (haTesto(d[c])) campi.push(c);
  return campi;
}

/** La ricerca per Dote guarda i benefici canonici dei passaggi, senza copiarli negli effetti dell'attività. */
export function haDoteAttivita(a: AttivitaDto, dote: string): boolean {
  if(a.pesca)return a.pesca.regola.stato==='collegata'&&dote==='perizia';
  return a.confidenteChiave
    ? !!a.fonteConfidente?.dotiPerPassaggio.some((r) => r.doti.some((d) => d.dote === dote))
    : a.effetti.some((v) => v.effetto.famiglia === 'dote' && v.effetto.dote === dote);
}
