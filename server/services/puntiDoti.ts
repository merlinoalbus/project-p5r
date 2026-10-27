// ============================================================
// puntiDoti — le note (♪) di una Dote convertite nei punti della partita: l'UNICO punto del server che lo fa
// ============================================================
//
// Segnalazione dell'utente (2026-10-26): «se scelgo le note come premio poi le note vanno convertite in punti dote...». Ogni premio in note
// (esiti delle attività, Dote a valori possibili scelta alla spunta, Doti fisse delle voci, letture, turni, incontri, domande, cruciverba,
// scheda Doti) entra nella scheda Doti — o nella proposta «Applica» — in PUNTI, con la regola unica `puntiDaNote` di `shared/doti.ts`
// (1 nota = 2, 2 = 3, 3 = 5, libro a resa maggiorata 7, «Anima da cineasta» +1 scalino per film e DVD, Fortuna ×1,5 per difetto). Prima
// ogni servizio la chiamava da sé leggendo la Fortuna a modo suo, e due strade la perdevano (l'anteprima della scelta dell'esito senza
// Fortuna, la Dote di una voce di un libro senza il quarto scalino). Qui lo stato della partita (Fortuna, «Anima da cineasta») si legge
// in un posto solo; chi converte passa soltanto le note e che cosa le dà.
// ============================================================

import { puntiDaNote } from '../../shared/doti.js';
import { fortunaSu } from './fortunaService.js';
import { letturaCompletata } from './lettureCompletate.js';

/** Che cosa dà le note: un libro (le 3 note valgono il quarto scalino) o un film/DVD (con «Anima da cineasta» si sale di uno scalino). */
export interface OrigineNote { libro?: boolean; cinema?: boolean }

/** «Anima da cineasta» letto nella partita: film e DVD salgono di uno scalino. */
export function haAnimaDaCineasta(partitaId: number): boolean {
  return letturaCompletata(partitaId, 'libro', 'anima-da-cineasta');
}

/** I punti che `note` note di `dote` valgono nella partita adesso: la regola unica con la Fortuna della partita su quella Dote. */
export function puntiDote(partitaId: number, dote: string, note: 1 | 2 | 3, origine: OrigineNote = {}): number {
  return puntiDaNote(note, origine.libro === true, fortunaSu(partitaId, dote), origine.cinema === true);
}

/**
 * Che cosa dà le note di una voce del Diario (o di un'azione), dal suo tipo e dal suo collegamento: una voce di un libro («Leggere Donna
 * nell'ombra», tipo `libro` o collegata a un libro) le dà come libro; una voce di un DVD o collegata a un film come film, con «Anima da
 * cineasta» se la partita l'ha letto. La stessa regola vale per la spunta (`applicaEffettiAzione`), per la scelta delle note alla spunta
 * (`scelteEsitoDellaVoce`) e per il raccordo di un effetto nuovo su una voce già spuntata (`applicaEffettoStoricoDiario`).
 */
export function origineNoteDellaVoce(partitaId: number, voce: { tipo: string; riferimento: { tipo: string } | null }): Required<OrigineNote> {
  const libro = voce.tipo === 'libro' || voce.riferimento?.tipo === 'libro';
  const film = voce.tipo === 'dvd' || voce.riferimento?.tipo === 'film';
  return { libro, cinema: film && haAnimaDaCineasta(partitaId) };
}
