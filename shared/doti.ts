// ============================================================
// doti — le cinque Doti sociali: chiavi, nomi e ordine, una sola fonte per schemi, servizi e interfaccia
// ============================================================
//
// L'ordine è quello di `dote_sociale.ordine` nel database di gioco e della scheda «Doti sociali». Prima le stesse cinque voci
// erano scritte in sei posti (schemi del catalogo e delle azioni, condizioni, effetti, semafori, suggerimenti), non sempre nello
// stesso ordine (rilievo F16/R1"–R8" della verifica completa, 2026-10-03).
// ============================================================

import { moltiplicaFortuna } from './fortuna.js';

export const DOTI_SOCIALI = [
  { chiave: 'conoscenza', nome: 'Conoscenza' },
  { chiave: 'fascino', nome: 'Fascino' },
  { chiave: 'coraggio', nome: 'Coraggio' },
  { chiave: 'gentilezza', nome: 'Gentilezza' },
  { chiave: 'perizia', nome: 'Perizia' },
] as const;

export type DoteChiave = (typeof DOTI_SOCIALI)[number]['chiave'];

/** Le chiavi, come tupla non vuota: pronta per `z.enum`. */
export const CHIAVI_DOTI = DOTI_SOCIALI.map((d) => d.chiave) as [DoteChiave, ...DoteChiave[]];

/** Chiave → nome, per chi deve solo scrivere il nome di una Dote. */
export const NOMI_DOTI: Readonly<Record<DoteChiave, string>> = Object.fromEntries(DOTI_SOCIALI.map((d) => [d.chiave, d.nome])) as Record<DoteChiave, string>;

/** Il nome di una Dote; una chiave sconosciuta resta com'è (dati vecchi o scritti a mano). */
export function nomeDote(chiave: string): string {
  return (NOMI_DOTI as Record<string, string>)[chiave] ?? chiave;
}

/** Vero se `chiave` è una delle cinque Doti. */
export function eDote(chiave: unknown): chiave is DoteChiave {
  return typeof chiave === 'string' && Object.prototype.hasOwnProperty.call(NOMI_DOTI, chiave);
}

/** Punti per scalino: 1 nota = 2, 2 note = 3, 3 note = 5, quarto scalino (libri a resa maggiorata) = 7. */
const PUNTI_SCALINO = [2, 3, 5, 7] as const;

/**
 * La regola unica dei punti per numero di note: la leggono il server (che li registra) e la scheda Doti (che li anticipa sui pulsanti),
 * così il numero mostrato è quello che si ottiene. Il libro a resa maggiorata porta le 3 note al quarto scalino (7); «Anima da cineasta»
 * (Royal) alza di UNO scalino i punti di film e DVD (2→3, 3→5, 5→7); la Fortuna della Dote (stato della partita) moltiplica per 1,5 per
 * difetto (`moltiplicaFortuna`), dopo il cinema (2→3, 3→4, 5→7, 7→10).
 */
export function puntiDaNote(note: 1 | 2 | 3, libro = false, fortuna = false, cinema = false): number {
  let scalino = note === 3 && libro ? 4 : note;
  if (cinema) scalino = Math.min(4, scalino + 1);
  const base = PUNTI_SCALINO[scalino - 1];
  return fortuna ? moltiplicaFortuna(base) : base;
}
