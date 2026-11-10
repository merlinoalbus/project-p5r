// ============================================================
// raggruppaCartellini — quali cartellini della mappa di Tokyo si toccano, e come si raggruppano
// ============================================================
//
// La stessa regola dei bersagli sulla mappa dei Palazzi (`raggruppaSpilli`): **due bersagli resi non distano mai meno di
// DISTANZA_MINIMA_SPILLI**, alla larghezza e all'ingrandimento di quel momento. Un cartellino ha un'area di tocco di 44 px
// centrata sul suo punto; se due centri stanno più vicini, le due aree si sovrappongono e un tocco finisce sull'altro (o su
// nessuno, dove l'area esce dal riquadro). Quelli troppo vicini diventano un gruppo, una pastiglia «+n» che apre l'elenco
// dei loro nomi: il comando è unico e raggiungibile.
//
// Pura, senza DOM: la misura della tela (px) e l'ingrandimento le dà il componente.
// ============================================================

import { DISTANZA_MINIMA_SPILLI } from './raggruppaSpilli';

/** Un cartellino: la chiave e il centro in percentuale della tela (come in `collocazioneTokyo`). */
export interface PuntoCartellino { chiave: string; x: number; y: number }
/** Un gruppo: la chiave (le chiavi dei membri unite), il centro (media dei membri, in percentuale della tela) e i membri nell'ordine d'ingresso. */
export interface GruppoCartellini { chiave: string; x: number; y: number; chiavi: string[] }

/**
 * Divide i cartellini in singoli e gruppi.
 *
 * `larghezza` e `altezza` sono la misura **a schermo** della tela (px, già moltiplicata per l'ingrandimento): da lì
 * si ricavano le distanze fra i centri. Con una misura non positiva (tela non ancora misurata) nessuno si raggruppa.
 */
export function raggruppaCartellini(punti: PuntoCartellino[], larghezza: number, altezza: number): { singoli: string[]; gruppi: GruppoCartellini[] } {
  if (larghezza <= 0 || altezza <= 0) return { singoli: punti.map((p) => p.chiave), gruppi: [] };
  type Nube = { membri: PuntoCartellino[] };
  const nubi: Nube[] = punti.map((p) => ({ membri: [p] }));
  /** Il centro a schermo di una nube: la media dei suoi membri, in pixel. */
  const centro = (n: Nube) => ({
    x: (n.membri.reduce((s, m) => s + m.x, 0) / n.membri.length / 100) * larghezza,
    y: (n.membri.reduce((s, m) => s + m.y, 0) / n.membri.length / 100) * altezza,
  });
  // Si fonde sempre la prima coppia troppo vicina nell'ordine (i, j) finché non ce ne sono più: i cartellini sono una trentina al più.
  for (;;) {
    let coppia: [number, number] | null = null;
    for (let i = 0; i < nubi.length && !coppia; i++) {
      const a = centro(nubi[i]);
      for (let j = i + 1; j < nubi.length; j++) {
        const b = centro(nubi[j]);
        if (Math.hypot(a.x - b.x, a.y - b.y) < DISTANZA_MINIMA_SPILLI) { coppia = [i, j]; break; }
      }
    }
    if (!coppia) break;
    const [i, j] = coppia;
    nubi[i] = { membri: [...nubi[i].membri, ...nubi[j].membri] };
    nubi.splice(j, 1);
  }
  const singoli: string[] = [];
  const gruppi: GruppoCartellini[] = [];
  for (const n of nubi) {
    if (n.membri.length === 1) { singoli.push(n.membri[0].chiave); continue; }
    gruppi.push({
      chiave: n.membri.map((m) => m.chiave).join('|'),
      x: n.membri.reduce((s, m) => s + m.x, 0) / n.membri.length,
      y: n.membri.reduce((s, m) => s + m.y, 0) / n.membri.length,
      chiavi: n.membri.map((m) => m.chiave),
    });
  }
  return { singoli, gruppi };
}
