// ============================================================
// Le sagome di Tokyo: un solo posto da cui si prendono
// ============================================================
//
// Sono gli sprite `_lm` di `P5_MAPDATA.SPD`, ritagliati con l'alfa vera ed estratti in
// `public/asset/mappe/lmap/tokyo/`: il 105 di Shibuya, il Kabukichō di Shinjuku, la ruota di
// Odaiba, il Kaminarimon di Asakusa. La chiave del file **è** la chiave del quartiere nel seed
// (`shujin-academy` compresa), quindi non serve una tabella di corrispondenza: serve che a
// chiederli sia una funzione sola.
//
// Perché una sola: le schede dei quartieri nella Città caricavano l'anteprima del nodo d'atlante
// `citta-<quartiere>`, cioè un'immagine **diversa** da quella che il lettore aveva appena toccato
// sulla mappa composta — e per la maggior parte dei quartieri quell'anteprima non esiste, così le
// miniature erano vuote. Due sorgenti per la stessa cosa: una delle due era destinata a mancare.
//
// Il ripiego è **niente**. Se la sagoma manca davvero, l'immagine si nasconde e resta il nome:
// mostrare al suo posto la planimetria del quartiere metterebbe una figura estranea dove il
// lettore si aspetta la stessa sagoma di un attimo prima, che è peggio di uno spazio vuoto.
// ============================================================

import type { SyntheticEvent } from 'react';

const BASE_TOKYO = '/asset/mappe/lmap/tokyo';

/** La sagoma originale di un quartiere sulla mappa di viaggio. */
export function assetTokyoQuartiere(chiave: string): string {
  return `${BASE_TOKYO}/${encodeURIComponent(chiave)}.png`;
}

/** L'illustrazione di un Palazzo: i Palazzi non stanno nel foglio della mappa di viaggio — nel
 *  gioco lì non compaiono — e tengono la loro, che l'utente ha chiesto di lasciare com'è. */
export function assetPalazzo(chiave: string): string {
  return `/asset/palazzi/${encodeURIComponent(chiave)}.png`;
}

/** Ripiego neutro: l'immagine sparisce, non ne compare un'altra. */
export function nascondiSagomaAssente(e: SyntheticEvent<HTMLImageElement>): void {
  e.currentTarget.style.visibility = 'hidden';
}
