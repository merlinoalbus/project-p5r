// ============================================================
// gestiVoce — le altre voci toccate da un gesto su una voce o su un pin, a parole (L4 §8.11, §1.6)
// ============================================================
//
// Ogni pin tiene il suo stato e la voce lo calcola dai suoi pin: «Segna» su una voce segna tutti i suoi pin, e le altre voci che li
// condividono possono diventare fatte («Segnate anche: …»); «Riapri» li toglie, e le altre voci si riaprono («Riapre anche: …»). Il
// server dice quali (`condivise` prima del gesto, `effetti` nella risposta); qui si scrivono «Forziere — 4ª infiltrazione».
// ============================================================

import type { AvanzamentoVoceDto, PuntoInteresseDto, VoceDelGestoDto } from '../types';

/**
 * L4 §8.6 (O4-2): gli Enigmi **risolti** che si riaprono togliendo il segno a delle voci — quelle di cui le voci sono passi. Un Enigma è
 * risolto quando i suoi passi sono fatti (R4-13), quindi togliere il segno a un suo passo lo riapre: prima lo si dice. Un Enigma non risolto
 * non c'è (niente da riaprire, nessuna conferma). `tutte`: le voci in cui cercare gli Enigmi (quelle del Palazzo).
 */
export function enigmiCheSiRiaprono(voci: readonly Pick<PuntoInteresseDto, 'contenitore'>[], tutte: readonly PuntoInteresseDto[]): PuntoInteresseDto[] {
  const chiavi = new Set(voci.map((v) => v.contenitore).filter((c): c is string => !!c));
  return tutte.filter((e) => chiavi.has(e.chiave) && e.stato !== null);
}

/** Le voci che contengono il pin dato (togliendogli il segno si riaprono tutte, §8.11 punto 4). */
export const vociDelPin = (pin: number, tutte: readonly PuntoInteresseDto[]): PuntoInteresseDto[] => tutte.filter((v) => v.pin.some((x) => x.id === pin));

/** Le righe della conferma di una riapertura: «Riapre anche: …» per le voci che condividono i pin (§8.11), «Riapre anche l'Enigma «…»» per
 *  ogni Enigma risolto che si riapre (§8.6). Vuoto = niente da confermare. */
export function righeRiapertura(condivise: string | null, enigmi: readonly Pick<PuntoInteresseDto, 'nome'>[]): string[] {
  return [...(condivise ? [`Riapre anche: ${condivise}.`] : []), ...enigmi.map((e) => `Riapre anche l’Enigma «${e.nome}».`)];
}

/** Il contatore dei pin fatti di una voce con più pin: «In corso · k/N» se ne è fatta una parte, «k/N» altrimenti; null con un pin solo o
 *  senza contatore (voci senza pin, senza partita, dedali). */
export function testoAvanzamento(a: AvanzamentoVoceDto | null | undefined): string | null {
  if (!a || a.totale < 2) return null;
  return inCorso(a) ? `In corso · ${a.fatti}/${a.totale}` : `${a.fatti}/${a.totale}`;
}

/** Vero se della voce è fatta una parte dei pin (né nessuno né tutti). */
export const inCorso = (a: AvanzamentoVoceDto | null | undefined): boolean => !!a && a.fatti > 0 && a.fatti < a.totale;

/** Una voce toccata dal gesto, col numero d'ordine della sua infiltrazione se lo si conosce («Forziere — 4ª infiltrazione»), altrimenti
 *  col nome dell'infiltrazione. */
export function testoVoceDelGesto(v: VoceDelGestoDto, infiltrazioni?: ReadonlyArray<{ chiave: string; ordine: number }>): string {
  const i = infiltrazioni?.find((x) => x.chiave === v.infiltrazione.chiave);
  return i ? `${v.nome} — ${i.ordine + 1}ª infiltrazione` : `${v.nome} — ${v.infiltrazione.nome}`;
}

/** Le voci toccate dal gesto, a parole, separate da virgole. */
export function testoVociDelGesto(voci: readonly VoceDelGestoDto[], infiltrazioni?: ReadonlyArray<{ chiave: string; ordine: number }>): string {
  return voci.map((v) => testoVoceDelGesto(v, infiltrazioni)).join(', ');
}
