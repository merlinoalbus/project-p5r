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

/** Un rettangolo nel riquadro della mappa, in pixel dall'angolo in alto a sinistra (per esempio i comandi dello zoom). */
export interface Ostacolo { x: number; y: number; w: number; h: number }
/** Un cartellino singolo con la posizione a cui disegnarlo, in percentuale della tela. */
export interface CartellinoCollocato { chiave: string; x: number; y: number }

/** Metà dell'area di tocco (22 px) più 2 px di arrotondamento: un centro più vicino di così a un bordo o a un comando ne perde una parte. */
export const MARGINE_TOCCO = 24;

/**
 * Sposta un punto (percentuali della tela) del minimo necessario perché la sua area di tocco stia tutta nel riquadro e fuori dagli
 * ostacoli: almeno `margine` px dai bordi e da ogni ostacolo. Fra le uscite possibili da un ostacolo vale la più corta che resta nel
 * riquadro. Un punto già in regola non si muove.
 */
export function allontanaDaBordiEComandi(p: { x: number; y: number }, larghezza: number, altezza: number, ostacoli: Ostacolo[], margine = MARGINE_TOCCO): { x: number; y: number } {
  if (larghezza <= 2 * margine || altezza <= 2 * margine) return { x: p.x, y: p.y };
  const dentro = (v: number, max: number) => Math.min(max - margine, Math.max(margine, v));
  let x = dentro((p.x / 100) * larghezza, larghezza);
  let y = dentro((p.y / 100) * altezza, altezza);
  for (const o of ostacoli) {
    const sx = o.x - margine, dx = o.x + o.w + margine, su = o.y - margine, giu = o.y + o.h + margine;
    if (x <= sx || x >= dx || y <= su || y >= giu) continue;
    const uscite = [
      { x: sx, y }, { x: dx, y }, { x, y: su }, { x, y: giu },
    ].filter((c) => c.x >= margine && c.x <= larghezza - margine && c.y >= margine && c.y <= altezza - margine);
    if (!uscite.length) continue;
    const migliore = uscite.reduce((a, b) => (Math.hypot(a.x - x, a.y - y) <= Math.hypot(b.x - x, b.y - y) ? a : b));
    x = migliore.x; y = migliore.y;
  }
  return { x: (x / larghezza) * 100, y: (y / altezza) * 100 };
}

/**
 * Con la mappa non ingrandita: ogni cartellino si allontana del minimo dai bordi e dai comandi (`allontanaDaBordiEComandi`), poi quelli
 * troppo vicini si raggruppano; il centro di un gruppo si riporta anch'esso in regola, e se così tocca un altro segno i due si uniscono, finché
 * nessuna coppia resta più vicina di `DISTANZA_MINIMA_SPILLI`. `larghezza` e `altezza` sono quelle del riquadro (px).
 */
export function collocaCartellini(punti: PuntoCartellino[], larghezza: number, altezza: number, ostacoli: Ostacolo[]): { singoli: CartellinoCollocato[]; gruppi: GruppoCartellini[] } {
  if (larghezza <= 0 || altezza <= 0) return { singoli: punti.map((p) => ({ chiave: p.chiave, x: p.x, y: p.y })), gruppi: [] };
  const sposta = (p: { x: number; y: number }) => allontanaDaBordiEComandi(p, larghezza, altezza, ostacoli);
  const collocati = new Map(punti.map((p) => [p.chiave, { chiave: p.chiave, ...sposta(p) }]));
  // ogni segno è un insieme di membri; si parte dai singoli e si uniscono gli insiemi finché nessuna coppia si tocca
  let insiemi: string[][] = punti.map((p) => [p.chiave]);
  const centro = (membri: string[]) => sposta({
    x: membri.reduce((s, k) => s + collocati.get(k)!.x, 0) / membri.length,
    y: membri.reduce((s, k) => s + collocati.get(k)!.y, 0) / membri.length,
  });
  for (let giro = 0; giro < punti.length; giro++) {
    // la chiave del segno è il suo indice fra gli insiemi (dopo la posizione: il collocato porta la chiave del cartellino)
    const segni = insiemi.map((m, i) => {
      const { x, y } = m.length === 1 ? collocati.get(m[0])! : centro(m);
      return { chiave: String(i), x, y };
    });
    const { gruppi } = raggruppaCartellini(segni, larghezza, altezza, true);
    if (!gruppi.length) break;
    const uniti = new Set(gruppi.flatMap((g) => g.chiavi));
    insiemi = [...insiemi.filter((_, i) => !uniti.has(String(i))), ...gruppi.map((g) => g.chiavi.flatMap((k) => insiemi[Number(k)]))];
  }
  const singoli: CartellinoCollocato[] = [];
  const gruppi: GruppoCartellini[] = [];
  for (const m of insiemi) {
    if (m.length === 1) { singoli.push(collocati.get(m[0])!); continue; }
    const c = centro(m);
    gruppi.push({ chiave: m.join('|'), x: c.x, y: c.y, chiavi: m });
  }
  return { singoli, gruppi };
}

/**
 * Divide i cartellini in singoli e gruppi.
 *
 * `larghezza` e `altezza` sono la misura **a schermo** della tela (px, già moltiplicata per l'ingrandimento): da lì
 * si ricavano le distanze fra i centri. Con una misura non positiva (tela non ancora misurata) nessuno si raggruppa.
 */
export function raggruppaCartellini(punti: PuntoCartellino[], larghezza: number, altezza: number, aree = false): { singoli: string[]; gruppi: GruppoCartellini[] } {
  // Di norma la distanza fra i centri; con `aree` quella fra le aree di tocco quadrate (la più grande delle due differenze), perché anche
  // in diagonale le aree non si sovrappongano.
  const troppoVicini = (a: { x: number; y: number }, b: { x: number; y: number }) => (aree
    ? Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) < DISTANZA_MINIMA_SPILLI
    : Math.hypot(a.x - b.x, a.y - b.y) < DISTANZA_MINIMA_SPILLI);
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
        if (troppoVicini(a, b)) { coppia = [i, j]; break; }
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
