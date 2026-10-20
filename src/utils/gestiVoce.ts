// ============================================================
// gestiVoce — le altre voci toccate da un gesto su una voce o su un pin, a parole (L4 §8.11, §1.6)
// ============================================================
//
// Ogni pin tiene il suo stato e la voce lo calcola dai suoi pin: «Segna» su una voce segna tutti i suoi pin, e le altre voci che li
// condividono possono diventare fatte («Segnate anche: …»); «Riapri» li toglie, e le altre voci si riaprono («Riapre anche: …»). Il
// server dice quali (`condivise` prima del gesto, `effetti` nella risposta); qui si scrivono «Forziere — 4ª infiltrazione».
// ============================================================

import type { AvanzamentoVoceDto, VoceDelGestoDto } from '../types';

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
