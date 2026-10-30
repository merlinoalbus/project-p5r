// ============================================================
// Date di gioco «MM-GG» (anno scolastico aprile → marzo): formattazione e ordinamento condivisi
// ============================================================
//
// I mesi e la data leggibile vengono da `shared/condizioniSpillo` (rilievo R4" della verifica completa): prima qui c'era una
// seconda tabella dei mesi, con lo stesso nome e un'altra forma, e una seconda «MM-GG → GG mese».
// ============================================================

import { MESI_GIOCO, dataLeggibile } from '../../shared/condizioniSpillo';

/** I nomi dei mesi dell'anno scolastico (Aprile … Marzo), con l'iniziale maiuscola, per le schede del calendario. */
export const NOMI_MESI_GIOCO: readonly string[] = MESI_GIOCO.map((m) => m.nome.charAt(0).toUpperCase() + m.nome.slice(1));

/** Nome del mese di una data di gioco (aprile … marzo). */
export function meseGioco(data: string): string {
  const m = Number(data.split('-')[0]);
  return NOMI_MESI_GIOCO[(m - 4 + 12) % 12] ?? data;
}

/** «MM-GG» → «GG mese» (una data che non è «MM-GG» resta com'è). */
export const dataGiocoTesto = (data: string): string => dataLeggibile(data);

/** «MM-GG» → «22 apr»: il giorno e le prime tre lettere del mese (che in italiano sono la sua abbreviazione), per i chip stretti come le
 *  tappe di un Palazzo (L13 O6-3). Una data che non è «MM-GG» resta com'è. */
export function dataGiocoBreve(data: string): string {
  const [m, g] = data.split('-');
  const mese = MESI_GIOCO.find((x) => x.numero === m);
  return mese && g && /^\d{2}$/.test(g) ? `${Number(g)} ${mese.nome.slice(0, 3)}` : data;
}

/** La data con l'articolo davanti, apostrofato davanti a «8» e «11» (che si leggono «otto», «undici»): «il 12 aprile»,
 *  «l'11 aprile»; con la preposizione: «del 12» / «dell'11», «al 12» / «all'11», «dal 12» / «dall'11». */
export function dataGiocoConArticolo(data: string, preposizione: '' | 'di' | 'a' | 'da' = ''): string {
  const testo = dataGiocoTesto(data);
  const vocale = /^(8|11)\s/.test(testo);
  const articolo = preposizione === 'di' ? (vocale ? 'dell’' : 'del ') : preposizione === 'a' ? (vocale ? 'all’' : 'al ') : preposizione === 'da' ? (vocale ? 'dall’' : 'dal ') : (vocale ? 'l’' : 'il ');
  return articolo + testo;
}
