// ============================================================
// I segni dei posti: sagome dei quartieri, stemmi dei Palazzi, il Covo — un solo posto da cui si prendono (L1, 2026-10-20)
// ============================================================
//
// Non sono l'immagine di una mappa (quella è `useImmagineMappa`: l'immagine caricata vince ovunque): sono i **segni** con cui un
// posto si riconosce sulla mappa di Tokyo e nelle schede — gli sprite `_lm` di `P5_MAPDATA.SPD` per i quartieri (il 105 di
// Shibuya, il Kabukichō di Shinjuku), lo stemma per i Palazzi — che l'utente ha scelto di tenere com'erano. Stanno nella grafica
// predefinita del database (famiglie `mappe` e `palazzi`), e si risolvono con la regola di tutta la grafica predefinita
// (`useAsset`: manifesto e preferenza «usa grafica predefinita»). Prima erano indirizzi fissi che ignoravano manifesto e
// preferenza: con la grafica predefinita spenta la metro mostrava ancora le sagome, le schede no.
//
// La chiave del file **è** la chiave del quartiere nel seed (`shujin-academy` compresa), quindi non serve una tabella di
// corrispondenza: serve che a chiederli sia una funzione sola. Il ripiego è **niente**: se il segno manca, l'immagine non c'è e
// resta il nome (la targa); una figura estranea al suo posto sarebbe peggio di uno spazio vuoto.
// ============================================================

import type { SyntheticEvent } from 'react';

/** La sagoma originale di un quartiere sulla mappa di viaggio (chiave del manifesto). */
export const segnoQuartiere = (chiave: string): string => `mappe/lmap/tokyo/${chiave}`;

/** Lo stemma di un Palazzo (o dei Memento): i Palazzi non stanno nel foglio della mappa di viaggio e tengono il loro. */
export const segnoPalazzo = (chiave: string): string => `palazzi/${chiave}`;

/** Il Covo dei Ladri, la soffitta del Leblanc: nel gioco è una schermata del menu di Royal, non una fermata, e nel foglio degli
 *  sprite non c'è (voce 4 di `docs/grafica/fabbisogno.md`). Finché non arriva il manifesto non lo ha, e resta la targa. */
export const SEGNO_COVO = 'mappe/lmap/tokyo/covo-dei-ladri';

/** Ripiego neutro se un file risulta rotto: l'immagine sparisce **dal flusso** (`display: none`), non ne compare un'altra. */
export function nascondiSegnoAssente(e: SyntheticEvent<HTMLImageElement>): void {
  e.currentTarget.style.display = 'none';
}
