// ============================================================
// pinArrivo — le voci del selettore del pin d'arrivo di un Palazzo sulla mappa di Tokyo (2026-10-04)
// ============================================================
//
// Le planimetrie native hanno più pin con lo stesso nome («Passaggio», «Punto di spostamento»): in un elenco di soli nomi
// non si distinguerebbero. A parità di nome si dice il posto, dall'alto in basso e da sinistra a destra.
// ============================================================

import type { SpilloDto } from '../types';

/** Un pin come serve al selettore: identità, nome, tipo e posizione (in percentuale della planimetria). */
type PinArrivo = Pick<SpilloDto, 'id' | 'nome' | 'tipoNome' | 'x' | 'y'>;

/**
 * Le voci del selettore del pin d'arrivo: in ordine di nome e, a parità di nome, dall'alto in basso e da sinistra a destra.
 * I pin con lo stesso nome si distinguono col loro posto: «Passaggio — 1° di 2 dall'alto». Un pin senza nome si chiama
 * «Pin <id>». Il tipo va nel dettaglio della voce.
 */
export function opzioniPinArrivo(spilli: readonly PinArrivo[]): Array<{ chiave: string; nome: string; dettaglio: string }> {
  /** Il nome del pin, o «Pin <id>» se non ne ha. */
  const nome = (s: PinArrivo) => s.nome || `Pin ${s.id}`;
  const ordinati = [...spilli].sort((a, b) => nome(a).localeCompare(nome(b), 'it') || a.y - b.y || a.x - b.x);
  const quanti = new Map<string, number>();
  for (const s of ordinati) quanti.set(nome(s), (quanti.get(nome(s)) ?? 0) + 1);
  const visti = new Map<string, number>();
  return ordinati.map((s) => {
    const n = nome(s);
    const tot = quanti.get(n)!;
    const posto = (visti.get(n) ?? 0) + 1;
    visti.set(n, posto);
    return { chiave: String(s.id), nome: tot > 1 ? `${n} — ${posto}° di ${tot} dall’alto` : n, dettaglio: s.tipoNome };
  });
}
