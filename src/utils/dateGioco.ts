// ============================================================
// Date di gioco «MM-GG» (anno scolastico aprile → marzo): formattazione e ordinamento condivisi
// ============================================================
//
// I mesi e la data leggibile vengono da `shared/condizioniSpillo` (rilievo R4" della verifica completa): prima qui c'era una
// seconda tabella dei mesi, con lo stesso nome e un'altra forma, e una seconda «MM-GG → GG mese».
// ============================================================

import { MESI_GIOCO, dataConArticolo, dataLeggibile } from '../../shared/condizioniSpillo';

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

/** La data con l'articolo davanti («il 12 aprile», «dell'11 aprile»): la stessa resa che usa il server, da `shared/condizioniSpillo`. */
export const dataGiocoConArticolo = (data: string, preposizione: '' | 'di' | 'a' | 'da' = ''): string => dataConArticolo(data, preposizione);
