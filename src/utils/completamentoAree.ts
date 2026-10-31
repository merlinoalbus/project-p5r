// ============================================================
// completamentoAree — quando un'area della guida di un Palazzo è «completata» nella partita
// ============================================================
//
// Regola scelta dall'utente (2026-10-04): un'area è completata quando **tutte le sue voci da segnare** sono segnate, cioè
// Ottenute o Esaurite. Le voci descrittive («Altro» senza il carattere «Permanente» o «Si ripropone», `puntoDescrittivo`) non hanno
// uno stato e non contano; un'area che non ha voci da segnare
// non è mai completata (non c'è niente da completare). Gli Enigmi non chiedono un caso a parte: quando i passi sono fatti è
// il server a segnare l'Enigma (`allineaEnigma`), quindi lo stato dell'Enigma è già quello dei suoi passi.
//
// Senza partita le voci non hanno stato (`stato` è null), quindi nessuna area risulta completata.
// La spunta compare nella lista «Il Palazzo» (aree, stanze) e nei chip «Su questa planimetria».
// ============================================================

import { puntoDescrittivo } from '../../shared/spilli';
import type { AreaDungeonDto } from '../types';

/** Quante voci da segnare ha un'area, quante sono segnate, e se è completata (almeno una voce, e tutte segnate).
 *  L4 (§1.5, segnalazione D): quando il server manda `completamento` (le infiltrazioni dei Palazzi), «completata» è la sua — la
 *  funzione unica, sugli oggetti permanenti — e qui non si ricalcola; senza (dati di prima) vale la regola di prima. */
export function completamentoArea(area: Pick<AreaDungeonDto, 'punti'> & Partial<Pick<AreaDungeonDto, 'completamento'>>): { daSegnare: number; segnate: number; completata: boolean } {
  const voci = area.punti.filter((p) => !puntoDescrittivo(p.tipo, p.areaDedalo, p.carattere));
  const segnate = voci.filter((p) => p.stato !== null).length;
  if (area.completamento) return { daSegnare: voci.length, segnate, completata: area.completamento.completata === true };
  return { daSegnare: voci.length, segnate, completata: voci.length > 0 && segnate === voci.length };
}

/** Le chiavi delle aree completate, per sapere in un colpo solo quali righe e chip portano la spunta. */
export function areeCompletate(aree: ReadonlyArray<Pick<AreaDungeonDto, 'chiave' | 'punti'> & Partial<Pick<AreaDungeonDto, 'completamento'>>>): ReadonlySet<string> {
  return new Set(aree.filter((a) => completamentoArea(a).completata).map((a) => a.chiave));
}

/** Vero se un insieme di aree (una stanza, una planimetria) ne ha almeno una e sono tutte completate. */
export function tutteCompletate(chiavi: ReadonlyArray<string>, completate: ReadonlySet<string>): boolean {
  return chiavi.length > 0 && chiavi.every((k) => completate.has(k));
}
