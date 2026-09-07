// ============================================================
// puntiDungeon — che cosa conta come «collezionabile» in un Palazzo
// ============================================================
//
// La percentuale di un Palazzo diceva «punti gestiti su punti totali», e fra i punti totali ci
// sono le sicure, le scorciatoie, gli enigmi, i mini-boss, il boss e gli incontri casuali: roba
// che si attraversa o si affronta, non roba che si raccoglie. Con quel conto, a Kamoshida, il
// 100% chiedeva di spuntare anche «Cancello del Castello» e «Suguru Asmodeus Kamoshida», e la
// percentuale non rispondeva alla domanda per cui la si guarda — «quanto mi manca da prendere qui
// dentro?».
//
// Restano quindi i quattro tipi che si raccolgono davvero sulla planimetria: i forzieri, i
// forzieri chiusi (che si aprono col grimaldello), gli oggetti a terra e i Semi della Bramosia.
// Gli altri punti non spariscono da nessuna parte — restano nell'elenco, coi loro filtri e le loro
// spunte — semplicemente non entrano nella percentuale.
//
// Sta in `shared/` perché la stessa definizione serve al conto del server e alle etichette del
// frontend: due elenchi paralleli sarebbero due verità che prima o poi divergono.
// ============================================================

import type { PuntoInteresseDto } from './types.js';

export type TipoPunto = PuntoInteresseDto['tipo'];

/** I tipi che si raccolgono: entrano nella percentuale di completamento del Palazzo. */
export const TIPI_COLLEZIONABILI: readonly TipoPunto[] = ['forziere', 'forziere-chiuso', 'oggetto', 'volonta'];

const INSIEME = new Set<string>(TIPI_COLLEZIONABILI);

/** True se il punto è qualcosa che si porta via dalla mappa. */
export function eCollezionabile(tipo: string): boolean {
  return INSIEME.has(tipo);
}
