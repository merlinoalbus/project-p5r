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

import type { DoteChiave } from './doti.js';

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
/** L13 (O10-2/O10-3): il rango in cui la guida fa scegliere la relazione romantica (lo stesso per tutti i Confidenti romanzabili, la regola
 *  della migrazione 325). Un solo punto per il server (`relazioneRomanticaService`) e per l'interfaccia (scheda del Confidente, spunta). */
export const RANGO_DELLA_SCELTA_ROMANTICA = 9;

/**
 * L13 (O10-3, rilievo del revisore): il rango dell'evento che una voce di Confidente con rango atteso fa giocare davvero nella partita. È
 * quello del rango atteso, salvo quando il Confidente nella partita è altrove: allora è il suo prossimo (rango della partita + 1), non
 * oltre il 10, e non quando è già al rango atteso (l'evento appena giocato è quello della voce). Senza rango atteso la voce non prevede
 * una salita di rango: null. Un solo criterio per il dialogo della voce (`giornataService.campoDialogo`, `dialogoPartita`), per la casella
 * della relazione alla spunta (`GiornoGuida`) e per il server che la accetta (`effettiAzioneService`).
 */
export function rangoDellEventoGiocato(rangoAtteso: number | null, rangoPartita: number | null | undefined): number | null {
  if (rangoAtteso === null) return null;
  if (rangoPartita === null || rangoPartita === undefined || rangoPartita >= 10 || rangoPartita === rangoAtteso) return rangoAtteso;
  return rangoPartita + 1;
}

/** La voce fa giocare l'evento del rango della scelta romantica: lì, e solo lì, alla spunta si sceglie la relazione romantica. */
export const giocaLaSceltaRomantica = (rangoAtteso: number | null, rangoPartita: number | null | undefined): boolean =>
  rangoDellEventoGiocato(rangoAtteso, rangoPartita) === RANGO_DELLA_SCELTA_ROMANTICA;

/** I sette Confidenti che ricevono il moltiplicatore dell'esame (G-016c, corretta da G-020 con Ann): gli altri non lo hanno mai. */
export const CONFIDENTI_CON_BONUS_ESAME: readonly string[] = ['ryuji', 'ann', 'makoto', 'haru', 'sojiro', 'kawakami', 'kasumi'];
/** Dove ci si è piazzati all'ultimo esame; vale fino ai risultati dell'esame successivo. L13 (ondata 7, O7-2): anche «sopra la media», il
 *  piazzamento che la guida premia con Fascino +2 (migrazione utente 057). */
export type PiazzamentoEsame = 'primo' | 'primi-10' | 'sopra-media' | 'altro';
/** I piazzamenti in ordine, con il nome che l'interfaccia mostra: l'unico elenco (scelta alla spunta, Partita, premi degli esami, zod). */
export const PIAZZAMENTI_ESAME: ReadonlyArray<{ chiave: PiazzamentoEsame; nome: string }> = [
  { chiave: 'primo', nome: 'Primo' }, { chiave: 'primi-10', nome: 'Primi 10' }, { chiave: 'sopra-media', nome: 'Sopra la media' }, { chiave: 'altro', nome: 'Nella media o sotto' },
];
export const CHIAVI_PIAZZAMENTO_ESAME = ['primo', 'primi-10', 'sopra-media', 'altro'] as const satisfies readonly PiazzamentoEsame[];
export const ePiazzamentoEsame = (x: unknown): x is PiazzamentoEsame => typeof x === 'string' && (CHIAVI_PIAZZAMENTO_ESAME as readonly string[]).includes(x);
/** Il nome di un piazzamento («Primi 10»). */
export const nomePiazzamentoEsame = (p: PiazzamentoEsame): string => PIAZZAMENTI_ESAME.find((x) => x.chiave === p)!.nome;
/** Un esame con il piazzamento segnato nella partita (null = non segnato). */
export interface PiazzamentoEsameDto { esame: string; nome: string; dataRisultati: string | null; piazzamento: PiazzamentoEsame | null }
/** Moltiplicatore per piazzamento: primo in classifica ×1,5, nei primi 10 ×1,2, sopra la media e altrove nessuno. Insieme a
 *  `CONFIDENTI_CON_BONUS_ESAME` è la regola che la pagina delle domande descrive (`DomandeDto.moltiplicatore`), mai un testo a parte. */
export const MOLTIPLICATORE_ESAME: Readonly<Record<PiazzamentoEsame, number>> = { primo: 1.5, 'primi-10': 1.2, 'sopra-media': 1, altro: 1 };

/**
 * L13 (ondata 7, O7-2): il premio di un piazzamento a un esame (`esame.premi_json`, uno per piazzamento premiato): le Doti in note e, per il
 * primo posto, il trofeo (`trofeo.chiave`) quando la scheda del trofeo lo conferma. Un piazzamento senza riga non dà niente («una prestazione
 * insufficiente non comporta alcun bonus»). La spunta della voce con l'effetto «esame» li applica (`shared/effettiVoce.ts`).
 */
export interface PremioPiazzamentoEsame { piazzamento: PiazzamentoEsame; doti: Array<{ dote: DoteChiave; note: 1 | 2 | 3 }>; trofeo?: string }
/** L13 (ondata 7, O7-2): il requisito di Conoscenza per il primo posto (`esame.requisito_conoscenza`): il rango minimo e se servono tutte le risposte giuste. */
export interface RequisitoConoscenzaEsame { rango: number; tutteCorrette: boolean }

const leggiJson = (raw: string | null | undefined): unknown => { if (!raw) return null; try { return JSON.parse(raw) as unknown; } catch { return undefined; } };
/** I premi di un esame letti dalla colonna: null se la colonna è vuota o non riconoscibile (un dato storto non diventa un premio a caso). */
export function leggiPremiEsame(raw: string | null | undefined, eDote: (x: unknown) => x is DoteChiave): PremioPiazzamentoEsame[] | null {
  const x = leggiJson(raw);
  if (!Array.isArray(x)) return null;
  const out: PremioPiazzamentoEsame[] = [];
  for (const r of x) {
    if (!r || typeof r !== 'object' || Array.isArray(r)) return null;
    const o = r as Record<string, unknown>;
    if (Object.keys(o).some((k) => k !== 'piazzamento' && k !== 'doti' && k !== 'trofeo') || !ePiazzamentoEsame(o.piazzamento) || out.some((p) => p.piazzamento === o.piazzamento) || !Array.isArray(o.doti)) return null;
    const doti: PremioPiazzamentoEsame['doti'] = [];
    for (const d of o.doti) {
      const v = d && typeof d === 'object' ? d as Record<string, unknown> : null;
      if (!v || Object.keys(v).some((k) => k !== 'dote' && k !== 'note') || !eDote(v.dote) || (v.note !== 1 && v.note !== 2 && v.note !== 3) || doti.some((y) => y.dote === v.dote)) return null;
      doti.push({ dote: v.dote, note: v.note });
    }
    if (o.trofeo !== undefined && (typeof o.trofeo !== 'string' || !/^[a-z0-9][a-z0-9-]{0,119}$/.test(o.trofeo))) return null;
    if (!doti.length && o.trofeo === undefined) return null;
    out.push({ piazzamento: o.piazzamento, doti, ...(typeof o.trofeo === 'string' ? { trofeo: o.trofeo } : {}) });
  }
  // nell'ordine dei piazzamenti, una forma sola
  return out.sort((a, b) => CHIAVI_PIAZZAMENTO_ESAME.indexOf(a.piazzamento) - CHIAVI_PIAZZAMENTO_ESAME.indexOf(b.piazzamento));
}
/** Il requisito di Conoscenza letto dalla colonna: null se vuoto o non riconoscibile. */
export function leggiRequisitoConoscenza(raw: string | null | undefined): RequisitoConoscenzaEsame | null {
  const x = leggiJson(raw);
  if (!x || typeof x !== 'object' || Array.isArray(x)) return null;
  const o = x as Record<string, unknown>;
  if (Object.keys(o).some((k) => k !== 'rango' && k !== 'tutteCorrette') || !Number.isSafeInteger(o.rango) || (o.rango as number) < 1 || (o.rango as number) > 5 || typeof o.tutteCorrette !== 'boolean') return null;
  return { rango: o.rango as number, tutteCorrette: o.tutteCorrette };
}

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
