// ============================================================
// Punti dei Confidenti — il modulo unico (R9-08)
// ============================================================
//
// Un solo calcolo per il server e per le anteprime (le copie in `partiteService.puntiConfidente` e `src/utils/punti.ts` passano da qui nel
// blocco D, R9-08/3-4). Regola del gioco: ogni risposta vale 5/10/15 punti base (1-3 note), un regalo gradito 50, un'uscita senza salto di
// rango 10; moltiplicatore ×1,5 con una Persona dello stesso arcano nell'elenco della partita. Il ×1,2 dell'invito accettato via SMS
// NON si applica (da verificare in G-020). L'eccedenza dopo un passaggio di rango è del motore dei punti (R10-11), non di questo modulo.
// ============================================================

/** Punti base di una risposta, per ogni nota (1-3). */
export const PUNTI_PER_NOTA = 5;
/** Punti base di un regalo gradito. */
export const PUNTI_REGALO = 50;
/** Punti base di un'uscita che non fa salire di rango. */
export const PUNTI_USCITA = 10;
/** Moltiplicatore con una Persona dello stesso arcano. */
export const MOLTIPLICATORE_ARCANO = 1.5;

/** Come si calcolano i punti di un incontro; il Confidente conta solo per il bonus degli esami. */
export interface IngressoPuntiConfidente {
  noteRisposta?: 1 | 2 | 3;
  regalo?: boolean;
  uscita?: boolean;
  bonusArcano?: boolean;
}

const arrotonda2 = (n: number): number => Math.round(n * 100) / 100;

/** I punti base: il regalo vale più dell'uscita, l'uscita più delle note di risposta; senza nulla, zero. */
export function puntiBase(i: IngressoPuntiConfidente): number {
  return i.regalo ? PUNTI_REGALO : i.uscita ? PUNTI_USCITA : i.noteRisposta !== undefined ? i.noteRisposta * PUNTI_PER_NOTA : 0;
}

/** I punti di un incontro, ai centesimi. */
export function puntiConfidente(i: IngressoPuntiConfidente): number {
  return arrotonda2(puntiBase(i) * (i.bonusArcano ? MOLTIPLICATORE_ARCANO : 1));
}
