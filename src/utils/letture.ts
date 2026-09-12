// ============================================================
// letture — quel che libri, film, videogiochi e attività hanno in comune nelle pagine: Dote dagli effetti, blocco, yen, paga
// ============================================================

import type { DisponibilitaDto, VoceEffettoDto } from '../types';

/** Vero se fra gli effetti dichiarati c'è la Dote indicata (il filtro «Dote» delle pagine). */
export function haDote(effetti: VoceEffettoDto[], dote: string): boolean {
  return effetti.some((v) => v.effetto.famiglia === 'dote' && v.effetto.dote === dote);
}

/** Vero se la riga, al punto in cui è la partita, non è ancora disponibile. */
export function bloccata(d: DisponibilitaDto | null | undefined): boolean {
  return d?.stato === 'bloccato';
}

/** Il motivo del blocco, in una riga (vuoto se non è bloccata): il dettaglio del requisito rosso («Disponibile dal 18 aprile, oggi è l'11»), o il suo testo se non c'è. */
export function motivoBlocco(d: DisponibilitaDto | null | undefined): string {
  if (!bloccata(d)) return '';
  const rossi = d!.requisiti.filter((r) => r.stato === 'rosso');
  return (rossi.length ? rossi : d!.requisiti).map((r) => r.dettaglio || r.testo).join(' · ');
}

export const formattaYen = (n: number): string => `${n.toLocaleString('it-IT')} ¥`;
/** Il prezzo accanto al nome di un negozio: «· 700 ¥», «· Gratis», niente se non dichiarato. */
export const prezzoChip = (n: number | null): string => (n === null ? '' : n === 0 ? ' · Gratis' : ` · ${formattaYen(n)}`);

/** La paga di un lavoro: «3500 ¥ a turno (fino a 7400 ¥)» (it-IT raggruppa le cifre solo da cinque in su: «12.000 ¥»). Vuoto se non dichiarata. */
export function pagaTesto(pagaYen: number | null, pagaMassima: number | null): string {
  if (pagaYen === null && pagaMassima === null) return '';
  if (pagaYen === null) return `fino a ${formattaYen(pagaMassima!)}`;
  return `${formattaYen(pagaYen)} a turno${pagaMassima !== null && pagaMassima !== pagaYen ? ` (fino a ${formattaYen(pagaMassima)})` : ''}`;
}

export type StatoLettura = 'tutti' | 'da-iniziare' | 'in-corso' | 'completati';
export const STATI_LETTURA: ReadonlyArray<{ chiave: StatoLettura; nome: string }> = [
  { chiave: 'tutti', nome: 'Tutti' }, { chiave: 'da-iniziare', nome: 'Da iniziare' }, { chiave: 'in-corso', nome: 'In corso' }, { chiave: 'completati', nome: 'Completati' },
];

/** Vero se una riga con quel progresso passa il filtro di stato. */
export function passaStato(stato: StatoLettura, progresso: number, fatto: boolean): boolean {
  if (stato === 'da-iniziare') return progresso === 0;
  if (stato === 'in-corso') return progresso > 0 && !fatto;
  if (stato === 'completati') return fatto;
  return true;
}
