import type { OpzioneSelettore } from '../components/shared/Selettore';

/** Da quante voci in su il Selettore mostra il campo di ricerca quando `ricerca` è `auto`. */
export const SOGLIA_RICERCA = 10;

/** Quante voci al massimo mostra la tendina: oltre, si chiede di scrivere qualche lettera in più. */
export const TETTO_VOCI = 200;

/** Da un dizionario chiave → nome alle voci del selettore, nell'ordine del dizionario. */
export function opzioniDaNomi(nomi: Record<string, string>): OpzioneSelettore[] {
  return Object.entries(nomi).map(([chiave, nome]) => ({ chiave, nome }));
}
