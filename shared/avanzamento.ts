// ============================================================
// avanzamento — la percentuale di quanto è segnato, in una regola sola (L10-03)
// ============================================================
//
// La leggono la carta di un Palazzo o di un dedalo in «Luoghi della guida», la pagina del dedalo (la cifra accanto al nome, la barra e
// la tendina e la griglia dei dedali al telefono): la stessa coppia «segnati su totale» dà lo stesso numero ovunque. Per difetto, come
// l'anello dei Palazzi: il 100% compare solo quando è segnato tutto (199 su 200 è 99%, non 100%).
// ============================================================

/** La percentuale intera (per difetto) di `segnati` su `totale`; 0 quando non c'è niente da segnare. Si moltiplica prima di dividere:
 *  `29 / 100 * 100` in virgola mobile fa 28,999… e per difetto darebbe 28. */
export function percentualeSegnati(segnati: number, totale: number): number {
  if (totale <= 0) return 0;
  return Math.floor((Math.max(0, Math.min(segnati, totale)) * 100) / totale);
}
