// ============================================================
// Punti dei Confidenti — il modulo unico (R9-08)
// ============================================================
//
// Un solo calcolo per il server e per le anteprime (le copie in `partiteService.puntiConfidente` e `src/utils/punti.ts` passano da qui nel
// blocco D, R9-08/3-4). Regola del gioco: ogni risposta vale 5/10/15 punti base (1-3 note), un regalo gradito 50, un'uscita senza salto di
// rango 10; moltiplicatore ×1,5 con una Persona dello stesso arcano nell'elenco della partita, poi quello dell'esame (solo per i sette),
// poi ×1,2 dell'invito (legato all'effetto «invito» della voce). Decisione del 24/10: i moltiplicatori si applicano in sequenza e si
// tronca all'intero a ogni passaggio (15 → ×1,5 = 22 → ×1,2 = 26). L'eccedenza dopo un passaggio di rango è del motore dei punti
// (R10-11), non di questo modulo.
// ============================================================

/** Punti base di una risposta, per ogni nota (1-3). */
export const PUNTI_PER_NOTA = 5;
/** Punti base di un regalo gradito. */
export const PUNTI_REGALO = 50;
/** La reazione del Confidente al regalo, come la colonna «Bonus affinità» della guida dei regali: +3, +2 o +1 (`confidente_regalo.reazione`). */
export type ReazioneRegalo = 1 | 2 | 3;
/** Ondata 5 (decisione 21 dell'utente, «reazione dei regali strutturata con i punti attuali finché non verificati in gioco»; D1 del censimento):
 *  i punti base per reazione. Il valore di +2 e +1 la guida non lo dà: finché non si verifica in gioco valgono tutti i 50 di sempre. Quando si
 *  saprà, si cambia solo questa tabella. */
export const PUNTI_REGALO_PER_REAZIONE: Readonly<Record<ReazioneRegalo, number>> = { 3: PUNTI_REGALO, 2: PUNTI_REGALO, 1: PUNTI_REGALO };
/** Punti base di un'uscita che non fa salire di rango. */
export const PUNTI_USCITA = 10;
/** Moltiplicatore con una Persona dello stesso arcano. */
export const MOLTIPLICATORE_ARCANO = 1.5;
/** Moltiplicatore dell'invito accettato subito (effetto «invito» della voce). */
export const MOLTIPLICATORE_INVITO = 1.2;

/** I sette Confidenti che ricevono il moltiplicatore dell'esame (G-016c, corretta da G-020 con Ann): gli altri non lo hanno mai. */
export const CONFIDENTI_CON_BONUS_ESAME: readonly string[] = ['ryuji', 'ann', 'makoto', 'haru', 'sojiro', 'kawakami', 'kasumi'];
/** Dove ci si è piazzati all'ultimo esame; vale fino ai risultati dell'esame successivo. */
export type PiazzamentoEsame = 'primo' | 'primi-10' | 'altro';
/** Un esame con il piazzamento segnato nella partita (null = non segnato). */
export interface PiazzamentoEsameDto { esame: string; nome: string; dataRisultati: string | null; piazzamento: PiazzamentoEsame | null }
/** Moltiplicatore per piazzamento: primo in classifica ×1,5, nei primi 10 ×1,2, altrove nessuno. */
export const MOLTIPLICATORE_ESAME: Readonly<Record<PiazzamentoEsame, number>> = { primo: 1.5, 'primi-10': 1.2, altro: 1 };

/** Come si calcolano i punti di un incontro; `confidente` e `piazzamento` contano solo per il bonus degli esami. */
export interface IngressoPuntiConfidente {
  /** Chiave del Confidente: il bonus dell'esame vale solo per i sette di `CONFIDENTI_CON_BONUS_ESAME`. */
  confidente?: string;
  noteRisposta?: 1 | 2 | 3;
  regalo?: boolean;
  /** La reazione al regalo (con `regalo`): i punti base della sua riga di `PUNTI_REGALO_PER_REAZIONE`; senza, quelli di +3. */
  reazioneRegalo?: ReazioneRegalo;
  uscita?: boolean;
  bonusArcano?: boolean;
  /** L'invito accettato subito: ×1,2. */
  invito?: boolean;
  /** Il piazzamento all'ultimo esame; senza (non ancora registrato) nessun moltiplicatore. */
  piazzamento?: PiazzamentoEsame | null;
}

/** Il tronco all'intero di un passaggio; il piccolo scarto assorbe l'errore binario di 1,2 e 1,5 (10 × 1,2 = 11,999…). */
const tronca = (n: number): number => Math.floor(n + 1e-9);

/** I punti base: il regalo vale più dell'uscita, l'uscita più delle note di risposta; senza nulla, zero. */
export function puntiBase(i: IngressoPuntiConfidente): number {
  return i.regalo ? PUNTI_REGALO_PER_REAZIONE[i.reazioneRegalo ?? 3] : i.uscita ? PUNTI_USCITA : i.noteRisposta !== undefined ? i.noteRisposta * PUNTI_PER_NOTA : 0;
}

/** Il moltiplicatore dell'esame per quel Confidente: 1 per chi non è fra i sette o senza piazzamento registrato. */
export function moltiplicatoreEsame(confidente: string | undefined, piazzamento: PiazzamentoEsame | null | undefined): number {
  return confidente !== undefined && piazzamento && CONFIDENTI_CON_BONUS_ESAME.includes(confidente) ? MOLTIPLICATORE_ESAME[piazzamento] : 1;
}

/** I punti di un incontro: base, poi ×1,5 (arcano), poi l'esame (solo per i sette), poi ×1,2 (invito), troncando all'intero a ogni passaggio. */
export function puntiConfidente(i: IngressoPuntiConfidente): number {
  let p = puntiBase(i);
  if (i.bonusArcano) p = tronca(p * MOLTIPLICATORE_ARCANO);
  p = tronca(p * moltiplicatoreEsame(i.confidente, i.piazzamento));
  if (i.invito) p = tronca(p * MOLTIPLICATORE_INVITO);
  return p;
}
