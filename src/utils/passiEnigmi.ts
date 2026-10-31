// ============================================================
// passiEnigmi — i passi degli Enigmi (095) raggruppati sotto il loro Enigma, per la scheda del Palazzo e la guida del visore
// ============================================================

/** Quel che serve di una voce: la sua chiave e l'Enigma di cui è un passo (null se non lo è). */
interface VoceConPassi { chiave: string; contenitore?: string | null }

/**
 * Le voci di un elenco divise in due: `inCima`, le voci dell'elenco (nel loro ordine), e `passiPer`, i passi di ogni Enigma (nel loro
 * ordine), che stanno dentro di lui e non nell'elenco. Un passo il cui Enigma non è nell'elenco sta da sé, in cima: nella guida del visore
 * succede quando l'Enigma è su un'altra planimetria; nella scheda del Palazzo non succede, perché un passo sta sempre nell'infiltrazione del
 * suo Enigma (lo garantisce il server).
 */
export function raggruppaPassi<T extends VoceConPassi>(voci: readonly T[]): { inCima: T[]; passiPer: Map<string, T[]> } {
  const chiavi = new Set(voci.map((p) => p.chiave));
  const passiPer = new Map<string, T[]>();
  const inCima: T[] = [];
  for (const p of voci) {
    if (p.contenitore && chiavi.has(p.contenitore)) passiPer.set(p.contenitore, [...(passiPer.get(p.contenitore) ?? []), p]);
    else inCima.push(p);
  }
  return { inCima, passiPer };
}
