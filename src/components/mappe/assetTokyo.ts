// ============================================================
// Le sagome di Tokyo: un solo posto da cui si prendono
// ============================================================
//
// Sono gli sprite `_lm` di `P5_MAPDATA.SPD`, ritagliati con l'alfa vera, nel database di gioco
// (famiglia `mappe`, chiavi `lmap/tokyo/<quartiere>`; erano in `public/asset/mappe/lmap/tokyo/`): il 105 di Shibuya, il Kabukichō di Shinjuku, la ruota di
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
import { urlImmagine } from '../../services/api';

/** La sagoma originale di un quartiere sulla mappa di viaggio. */
export function assetTokyoQuartiere(chiave: string): string {
  return urlImmagine('mappe', `lmap/tokyo/${chiave}`);
}

/** L'illustrazione di un Palazzo: i Palazzi non stanno nel foglio della mappa di viaggio — nel
 *  gioco lì non compaiono — e tengono la loro, che l'utente ha chiesto di lasciare com'è. */
export function assetPalazzo(chiave: string): string {
  return urlImmagine('palazzi', chiave);
}

/** Il Covo dei Ladri, la soffitta del Leblanc.
 *
 * È l'unico elemento della mappa senza una figura originale, e non è una dimenticanza: nel gioco
 * il Covo è una schermata del menu di Royal, non una fermata della metropolitana, quindi nel
 * foglio degli sprite non c'è e non ci può essere — verificato sui 160 elementi nominati di
 * `P5_MAPDATA.SPD`. La sagoma è la voce 4 di `docs/grafica/fabbisogno.md`, e finché non arriva
 * questo indirizzo punta a un file che non esiste: l'immagine si toglie da sola e resta la targa,
 * che è quel che c'era prima. */
export function assetCovoLadri(): string {
  return urlImmagine('mappe', 'lmap/tokyo/covo-dei-ladri');
}

/** Ripiego neutro: l'immagine sparisce **dal flusso**, non ne compare un'altra.
 *
 * `display: none` e non `visibility: hidden`, che lascerebbe il posto vuoto: sul cartellino la
 * figura sta sopra la targa, e uno spazio riservato a un'immagine che non c'è si vede come un
 * buco. Così invece la targa sale al suo posto e il cartellino resta un cartellino. */
export function nascondiSagomaAssente(e: SyntheticEvent<HTMLImageElement>): void {
  e.currentTarget.style.display = 'none';
}
