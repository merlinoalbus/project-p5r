// ============================================================
// conseguimentiLettura — QUANDO una lettura dà le sue Doti: l'unica regola, per server e interfaccia
// ============================================================
//
// Che cosa dà un libro, un film o un videogioco lo dicono gli effetti dichiarati (`effettiCatalogo.ts`); qui si dice **quante volte**
// lo dà, dall'avanzamento:
//   - un libro al completamento, una volta sola (la guida: le Doti arrivano a lettura finita);
//   - un DVD a ogni sessione, fino alle sessioni che lo completano (la guida, «DVD a noleggio»: «Ogni visione garantisce punti a una
//     specifica dote sociale»; un DVD si completa in due sessioni);
//   - un videogioco a ogni round completato, fino ai round che lo completano (la guida: «a ogni partita»);
//   - un film al cinema a ogni visione, senza tetto: la prima con le voci senza `ripetuto`, le altre con quelle `ripetuto`.
// DVD e videogiochi usano a ogni sessione le voci senza `ripetuto` (la spunta «vale dalla seconda volta in poi» c'è solo al cinema e
// nei turni delle attività). I modificatori che cambiano i punti di una sessione («Anima da cineasta» per film e DVD) li applica chi
// converte le note in punti (`server/services/puntiDoti.ts`), a ogni registrazione.
// Il registro dei conseguimenti (`effetto_lettura_partita`) ha una riga per ogni conseguimento (`ordine`); l'evento «Libro letto», «Film
// visto», «Videogioco completato» resta al completamento, che è un'altra cosa. Regole pure: niente Node, DB o DOM.
// ============================================================

import type { TipoLettura } from './types.js';

/** Quante volte una lettura dà le sue Doti: al completamento (libri), a ogni sessione fino al totale (DVD, videogiochi), a ogni visione (cinema). */
export type RegolaConseguimento = 'completamento' | 'ogni-sessione' | 'ogni-visione';

/** La regola di una lettura dal suo tipo e, per un film, da dove si vede. */
export function regolaConseguimento(tipo: TipoLettura, dove?: 'cinema' | 'dvd' | null): RegolaConseguimento {
  if (tipo === 'libro') return 'completamento';
  if (tipo === 'film' && dove === 'cinema') return 'ogni-visione';
  return 'ogni-sessione';
}

/** Quanti conseguimenti vale un avanzamento: 1 o 0 per un libro (completo o no), le sessioni fino al totale per DVD e videogiochi,
 *  tutte le visioni al cinema. Un avanzamento non intero o negativo vale come zero; un totale sotto uno vale uno. */
export function conseguimentiDellAvanzamento(regola: RegolaConseguimento, avanzamento: number, totale: number): number {
  const fatto = Number.isFinite(avanzamento) ? Math.max(Math.floor(avanzamento), 0) : 0;
  const tetto = Math.max(Number.isFinite(totale) ? Math.floor(totale) : 1, 1);
  if (regola === 'completamento') return fatto >= tetto ? 1 : 0;
  if (regola === 'ogni-sessione') return Math.min(fatto, tetto);
  return fatto;
}

/** Vero se il conseguimento numero `n` (dal primo, 1) conta le voci `ripetuto` invece di quelle senza: solo le visioni al cinema dopo la prima. */
export const conseguimentoSuccessivo = (regola: RegolaConseguimento, n: number): boolean => regola === 'ogni-visione' && n > 1;

/** Quando una lettura dà le Doti, in parole, per le frasi dell'interfaccia e dello storico: «al completamento», «a ogni sessione»,
 *  «a ogni round completato», «a ogni visione». */
export function quandoDaLeDoti(tipo: TipoLettura, dove?: 'cinema' | 'dvd' | null): string {
  const regola = regolaConseguimento(tipo, dove);
  if (regola === 'completamento') return 'al completamento';
  if (regola === 'ogni-visione') return 'a ogni visione';
  return tipo === 'videogioco' ? 'a ogni round completato' : 'a ogni sessione';
}
