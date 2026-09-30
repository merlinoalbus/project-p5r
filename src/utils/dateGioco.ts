// ============================================================
// Date di gioco «MM-GG» (anno scolastico aprile → marzo): formattazione e ordinamento condivisi
// ============================================================

export const MESI_GIOCO = ['Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre', 'Gennaio', 'Febbraio', 'Marzo'];

/** Nome del mese di una data di gioco (aprile … marzo). */
export function meseGioco(data: string): string {
  const m = Number(data.split('-')[0]);
  return MESI_GIOCO[(m - 4 + 12) % 12] ?? data;
}

/** «MM-GG» → «GG mese». */
export function dataGiocoTesto(data: string): string {
  const [m, g] = data.split('-').map(Number);
  return Number.isInteger(m) && Number.isInteger(g) ? `${g} ${MESI_GIOCO[(m - 4 + 12) % 12]?.toLowerCase() ?? ''}` : data;
}

/** La data con l'articolo davanti, apostrofato davanti a «8» e «11» (che si leggono «otto», «undici»): «il 12 aprile»,
 *  «l'11 aprile»; con la preposizione: «del 12» / «dell'11», «al 12» / «all'11». */
export function dataGiocoConArticolo(data: string, preposizione: '' | 'di' | 'a' = ''): string {
  const testo = dataGiocoTesto(data);
  const vocale = /^(8|11)\s/.test(testo);
  const articolo = preposizione === 'di' ? (vocale ? 'dell’' : 'del ') : preposizione === 'a' ? (vocale ? 'all’' : 'al ') : (vocale ? 'l’' : 'il ');
  return articolo + testo;
}
