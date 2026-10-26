// ============================================================
// regali — le regole dei regali ai Confidenti, per il server e per la finestra «Regala» (ondata 5, lotto D; decisione 21 dell'utente)
// ============================================================
//
// Fonte: la guida italiana «Guida regali Confidenti» (https://www.allgamestaff.it/persona-5-royal/guida-regali-confidenti/):
//   - «Ogni regalo garantisce almeno 1 punto»: un oggetto regalo che non è nell'elenco del Confidente vale +1 (RG-10);
//   - si regala durante un ritrovo, quindi a un Confidente già incontrato (rango 1 o più; RG-17); al rango massimo il regalo si può dare;
//   - la Cartolina (Discount Rocinante, o nel «Set divertimento dei Ladri» delle televendite) non si consegna a un ritrovo: si spedisce dalla
//     cassetta rossa di Yongen-Jaya e vale +1. Non si spedisce nei giorni di pioggia né a un Confidente al rango massimo, e solo quando la
//     popolarità dei Ladri Fantasma è al massimo (un periodo breve, quasi sempre durante la storia di Okumura: la guida non dà le date, quindi
//     l'app lo dice e non lo valuta). Decisione 21 (b): «Nulla si rimanda: Cartolina e premio "Benefattore" entrano nell'ondata».
// La reazione di un oggetto in elenco è un dato (`confidente_regalo.reazione`); i punti per reazione stanno in `puntiConfidenti.ts`.
// ============================================================

import type { ReazioneRegalo } from './puntiConfidenti.js';

/** La reazione di un oggetto regalo che non è nell'elenco del Confidente: «ogni regalo garantisce almeno 1 punto». */
export const REAZIONE_FUORI_ELENCO: ReazioneRegalo = 1;

/** L'oggetto del catalogo della Cartolina, che si spedisce invece di consegnarla. */
export const CARTOLINA = 'regalo/cartolina';
/** La reazione della Cartolina spedita (guida: «+1 punto affinità»). */
export const REAZIONE_CARTOLINA: ReazioneRegalo = 1;
/** Le condizioni della Cartolina che l'app non può valutare: si dicono accanto, nella finestra «Regala». */
export const AVVISO_CARTOLINA = 'Si spedisce dalla cassetta rossa di Yongen-Jaya, solo quando la popolarità dei Ladri Fantasma è al massimo (di solito durante la storia di Okumura).';

/** Come si scrive la reazione: «+3», «+2», «+1». */
export const testoReazione = (r: ReazioneRegalo): string => `+${r}`;

/**
 * Revisione dei lotti D e D2: una riga dell'elenco del Confidente a +1 vale quanto ogni altro regalo (le ex «sconsigliate», decisione 21 e
 * RG-07: la guida non ha sconsigliati e dice che ogni regalo dà almeno 1 punto). Presentarla fra i «graditi» direbbe il falso, e un'etichetta
 * «gradito +1» non informa: si mostra come gradito solo ciò che vale più di +1 (o una reazione non indicata, che non si presume).
 */
export const eGradito = (r: ReazioneRegalo | null): boolean => r === null || r > REAZIONE_FUORI_ELENCO;
/** Una riga dell'elenco del Confidente si mostra fra i «graditi» se vale più di +1, se porta una nota, o se è una vecchia riga senza oggetto del
 *  catalogo (la spunta per nome, che non ha altro posto). Lo stesso criterio per la scheda del Confidente e per il riepilogo nel cassetto. */
export const fraIGraditi = (g: { catalogo?: unknown; reazione: ReazioneRegalo | null; nota?: string | null }): boolean => !g.catalogo || eGradito(g.reazione) || !!g.nota;

/** Vero se la reazione è un valore valido (1, 2 o 3). */
export const eReazione = (v: unknown): v is ReazioneRegalo => v === 1 || v === 2 || v === 3;

/** Il modo del regalo: consegnato a un ritrovo o spedito (la Cartolina). */
export type ModoRegalo = 'consegna' | 'cartolina';
export const modoDelRegalo = (catalogo: string): ModoRegalo => (catalogo === CARTOLINA ? 'cartolina' : 'consegna');
/** L'inizio della frase dell'esito: «Cartolina spedita a …» o «Regalo consegnato a …» (la Cartolina non si consegna). */
export const esitoDelRegalo = (modo: ModoRegalo | undefined, nomeConfidente: string): string =>
  `${modo === 'cartolina' ? 'Cartolina spedita' : 'Regalo consegnato'} a ${nomeConfidente}`;
/** Il verbo della consegna tolta: «Spedizione della Cartolina annullata» o «Consegna di «…» annullata». */
export const annulloDelRegalo = (modo: ModoRegalo, nome: string): string =>
  modo === 'cartolina' ? 'Spedizione della Cartolina annullata' : `Consegna di «${nome}» annullata`;
