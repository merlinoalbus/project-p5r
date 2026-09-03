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
