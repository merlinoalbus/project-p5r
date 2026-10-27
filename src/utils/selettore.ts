// ============================================================
// selettore — costanti e aiuti del componente Selettore (soglia della ricerca, tetto delle voci, larghezza)
// ============================================================

import type { OpzioneSelettore } from '../components/shared/Selettore';

/** Da quante voci in su il Selettore mostra il campo di ricerca quando `ricerca` è `auto`. */
export const SOGLIA_RICERCA = 10;

/** Quante voci al massimo mostra la tendina: oltre, si chiede di scrivere qualche lettera in più. */
export const TETTO_VOCI = 200;

/** Larghezza minima della tendina in px (la stessa del CSS): serve a decidere da che lato aprirla. */
export const LARGHEZZA_TENDINA = 260;

/** Larghezza massima della tendina in px: oltre, i nomi lunghi vanno a capo invece di allargarla. */
export const LARGHEZZA_MASSIMA_TENDINA = 420;

/** Sotto questa larghezza la tendina è un foglio dal basso (regola `@media (max-width: 639px)` di `.selettore__tendina` in
 *  src/tailwind.css): la colloca il CSS, non il componente. Le due soglie vanno cambiate insieme. */
export const MEDIA_FOGLIO_TENDINA = '(max-width: 639px)';

/** Da un dizionario chiave → nome alle voci del selettore, nell'ordine del dizionario. */
export function opzioniDaNomi(nomi: Record<string, string>): OpzioneSelettore[] {
  return Object.entries(nomi).map(([chiave, nome]) => ({ chiave, nome }));
}
