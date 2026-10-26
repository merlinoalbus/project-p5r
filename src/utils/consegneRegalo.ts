// Le consegne dei regali della partita raggruppate per l'elenco `ElencoConsegne` (ondata 5, revisione dei lotti D e D2): lo stesso oggetto
// allo stesso Confidente è un gruppo, con le consegne dalla più vecchia; i gruppi vanno dal più recente.
import type { ConsegnaRegaloDto } from '../types';

/** Un gruppo di consegne: lo stesso oggetto allo stesso Confidente. `casa`: dove porta il nome (null = solo testo). */
export interface GruppoConsegne { chiave: string; nome: string; casa: string | null; consegne: ConsegnaRegaloDto[] }

/** Raggruppa le consegne (dalla più vecchia) con `perGruppo`; i gruppi vanno dal più recente, le consegne restano dalla più vecchia. */
export function raggruppaConsegne<T extends ConsegnaRegaloDto>(consegne: readonly T[], perGruppo: (c: T) => { chiave: string; nome: string; casa: string | null }): GruppoConsegne[] {
  const gruppi = new Map<string, { gruppo: GruppoConsegne; ultima: number }>();
  consegne.forEach((c, i) => {
    const g = perGruppo(c);
    const v = gruppi.get(g.chiave) ?? { gruppo: { ...g, consegne: [] }, ultima: i };
    v.gruppo.consegne.push(c); v.ultima = i;
    gruppi.set(g.chiave, v);
  });
  return [...gruppi.values()].sort((a, b) => b.ultima - a.ultima).map((v) => v.gruppo);
}
