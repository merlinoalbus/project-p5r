// ============================================================
// ricercaDiario — la ricerca fra le voci del Diario (Guida › Giorno per giorno): forma della risposta, confronto e parti da evidenziare
// ============================================================
//
// Richiesta dell'utente (2026-10-29): «mi servirebbe la possibilità di cercare nella guida giorno per giorno, tutte le voci del diario che
// contengono una parola o per tipologia... ad esempio cercando "studia" vorrei vedere tutte le voci che riportano "Yogen-Jaya. Leblanc.
// Studia sul Divanetto al piano inferiore. · Studio serale a Leblanc / Spuntando: Turno: Studio serale a Leblanc" deve essere una ricerca
// basata sui valori di che cosa fare e note.» e poi «ovviamente devo poter visualizzare i risultati del filtro/ricerca in modo comodo...».
//
// Il confronto è UNO, qui, per il server (che filtra) e per la pagina (che evidenzia le stesse parti): senza maiuscole né accenti, anche una
// parte di parola; con più parole, ognuna deve comparire nella voce («che cosa fare» o note), in qualunque ordine. La punteggiatura resta
// (non è `normalizzaTesto`): «Yogen-Jaya» si trova scrivendo «yogen-jaya» o «yogen».
// ============================================================

import type { FasciaGioco } from './types.js';
import type { TipoAzione } from './effettiAzione.js';

/** Quanti caratteri (senza spazi ai bordi) deve avere il testo cercato perché la ricerca parta: con uno solo troverebbe quasi tutto. */
export const MINIMO_CARATTERI_RICERCA_DIARIO = 2;
/** Quanti caratteri al più il testo cercato. */
export const MASSIMO_CARATTERI_RICERCA_DIARIO = 100;

/** Una voce trovata: dove sta nel calendario di gioco e che cosa dice, come la mostra il Diario. */
export interface RisultatoRicercaDiarioDto {
  /** L'uid della voce: l'ancora `#voce-<uid>` del suo giorno. */
  uid: string;
  /** Giorno del calendario di gioco ('MM-GG'). */
  giorno: string;
  fascia: FasciaGioco;
  tipo: TipoAzione;
  /** «Che cosa fare» (il testo della voce). */
  azione: string;
  /** Il nome del collegamento della voce (Confidente, attività, Palazzo…), come lo mostra il Diario; null senza collegamento. */
  riferimentoTesto: string | null;
  note: string | null;
  /** Le frasi di «Spuntando succede», dalla stessa fonte del Diario (`AzionePercorsoDto.produceTesto`); vuoto se la spunta non dà niente. */
  spuntando: string[];
  /** Con una partita, se la voce è spuntata; null senza partita. */
  fatta: boolean | null;
}

/** La risposta della ricerca: le voci trovate nell'ordine del calendario di gioco (giorno, poi di giorno prima di sera, poi il posto). */
export interface RicercaDiarioDto {
  /** Il testo cercato, com'è stato letto (senza spazi ai bordi); '' se si filtra solo per tipo. */
  q: string;
  /** Il tipo scelto, o null. */
  tipo: TipoAzione | null;
  /** Quante voci sono state trovate (tutte: la risposta non le tronca, il Diario ha circa mille voci). */
  totale: number;
  risultati: RisultatoRicercaDiarioDto[];
  /** Per ogni tipo, quante voci corrispondono al testo cercato (senza il filtro del tipo): il selettore lo dice accanto al nome. Solo i tipi
   *  con almeno una voce. */
  perTipo: Partial<Record<TipoAzione, number>>;
}

/** Il testo «piatto» per il confronto: senza accenti e minuscolo, con la punteggiatura che resta. */
export function piattoRicercaDiario(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('it');
}

/** Le parole del testo cercato, già piatte e senza doppioni; vuoto se non c'è niente da cercare. */
export function paroleRicercaDiario(q: string): string[] {
  return [...new Set(piattoRicercaDiario(q).split(/\s+/).filter((p) => p.length > 0))];
}

/** Vero se ogni parola compare in almeno uno dei testi (piatti); senza parole, vero. */
export function voceCorrispondeRicerca(parole: readonly string[], ...testi: Array<string | null | undefined>): boolean {
  if (!parole.length) return true;
  const piatti = testi.flatMap((t) => (t ? [piattoRicercaDiario(t)] : []));
  return parole.every((p) => piatti.some((t) => t.includes(p)));
}

/** Un pezzo del testo da mostrare: evidenziato se è una parola cercata. */
export interface PezzoEvidenziato { testo: string; evidenziato: boolean }

/**
 * Il testo diviso nei pezzi da evidenziare, con le stesse regole del confronto (senza maiuscole né accenti): «Studia sul Divanetto» con
 * «studia» → [«Studia» evidenziato, « sul Divanetto»]. Il testo piatto può avere una lunghezza diversa dall'originale (una lettera accentata
 * scomposta), quindi ogni carattere piatto ricorda il carattere originale da cui viene; le parti che si sovrappongono si uniscono.
 */
export function pezziEvidenziati(testo: string, parole: readonly string[]): PezzoEvidenziato[] {
  if (!testo) return [];
  if (!parole.length) return [{ testo, evidenziato: false }];
  // il testo piatto, con per ogni suo carattere l'indice del carattere (code point) originale
  const origini: number[] = [];
  const caratteri = Array.from(testo);
  const inizi: number[] = [];
  let piatto = '';
  let pos = 0;
  caratteri.forEach((c, i) => {
    inizi.push(pos);
    pos += c.length;
    const p = piattoRicercaDiario(c);
    piatto += p;
    for (let k = 0; k < p.length; k++) origini.push(i);
  });
  inizi.push(pos);
  const segnati = new Array<boolean>(caratteri.length).fill(false);
  for (const parola of parole) {
    for (let da = piatto.indexOf(parola); da >= 0; da = piatto.indexOf(parola, da + 1)) {
      const primo = origini[da]!, ultimo = origini[da + parola.length - 1]!;
      for (let i = primo; i <= ultimo; i++) segnati[i] = true;
    }
  }
  const pezzi: PezzoEvidenziato[] = [];
  let i = 0;
  while (i < caratteri.length) {
    const stato = segnati[i]!;
    let j = i;
    while (j < caratteri.length && segnati[j] === stato) j++;
    pezzi.push({ testo: testo.slice(inizi[i], inizi[j]), evidenziato: stato });
    i = j;
  }
  return pezzi;
}
