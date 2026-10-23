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

/** I sette Confidenti che ricevono il moltiplicatore dell'esame (G-016c, corretta da G-020 con Ann): gli altri non lo hanno mai. */
export const CONFIDENTI_CON_BONUS_ESAME: readonly string[] = ['ryuji', 'ann', 'makoto', 'haru', 'sojiro', 'kawakami', 'kasumi'];
/** Dove ci si è piazzati all'ultimo esame; vale fino ai risultati dell'esame successivo. */
export type PiazzamentoEsame = 'primo' | 'primi-10' | 'altro';
/** Moltiplicatore per piazzamento: primo in classifica ×1,5, nei primi 10 ×1,2, altrove nessuno. */
export const MOLTIPLICATORE_ESAME: Readonly<Record<PiazzamentoEsame, number>> = { primo: 1.5, 'primi-10': 1.2, altro: 1 };

/** Come si calcolano i punti di un incontro; `confidente` e `piazzamento` contano solo per il bonus degli esami. */
export interface IngressoPuntiConfidente {
  /** Chiave del Confidente: il bonus dell'esame vale solo per i sette di `CONFIDENTI_CON_BONUS_ESAME`. */
  confidente?: string;
  noteRisposta?: 1 | 2 | 3;
  regalo?: boolean;
  uscita?: boolean;
  bonusArcano?: boolean;
  /** Il piazzamento all'ultimo esame; senza (non ancora registrato) nessun moltiplicatore. */
  piazzamento?: PiazzamentoEsame | null;
}

const arrotonda2 = (n: number): number => Math.round(n * 100) / 100;

/** I punti base: il regalo vale più dell'uscita, l'uscita più delle note di risposta; senza nulla, zero. */
export function puntiBase(i: IngressoPuntiConfidente): number {
  return i.regalo ? PUNTI_REGALO : i.uscita ? PUNTI_USCITA : i.noteRisposta !== undefined ? i.noteRisposta * PUNTI_PER_NOTA : 0;
}

/** Il moltiplicatore dell'esame per quel Confidente: 1 per chi non è fra i sette o senza piazzamento registrato. */
export function moltiplicatoreEsame(confidente: string | undefined, piazzamento: PiazzamentoEsame | null | undefined): number {
  return confidente !== undefined && piazzamento && CONFIDENTI_CON_BONUS_ESAME.includes(confidente) ? MOLTIPLICATORE_ESAME[piazzamento] : 1;
}

/** I punti di un incontro, ai centesimi: base × (arcano ×1,5) × (esame, solo per i sette). */
export function puntiConfidente(i: IngressoPuntiConfidente): number {
  return arrotonda2(puntiBase(i) * (i.bonusArcano ? MOLTIPLICATORE_ARCANO : 1) * moltiplicatoreEsame(i.confidente, i.piazzamento));
}
