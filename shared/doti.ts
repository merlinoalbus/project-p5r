// ============================================================
// doti — le cinque Doti sociali: chiavi, nomi e ordine, una sola fonte per schemi, servizi e interfaccia
// ============================================================
//
// L'ordine è quello di `dote_sociale.ordine` nel database di gioco e della scheda «Doti sociali». Prima le stesse cinque voci
// erano scritte in sei posti (schemi del catalogo e delle azioni, condizioni, effetti, semafori, suggerimenti), non sempre nello
// stesso ordine (rilievo F16/R1"–R8" della verifica completa, 2026-10-03).
// ============================================================

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
