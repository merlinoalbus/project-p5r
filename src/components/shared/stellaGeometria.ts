// ============================================================
// stellaGeometria — geometria del grafico a stella (radar) a N assi, in percentuale del riquadro 100×100
// ============================================================

export const CENTRO = 50;
export const RAGGIO = 34;

/** Coordinate (in percentuale del riquadro) del punto a distanza `raggio` sull'asse `indice` di `n`; il primo asse punta in alto. */
export function puntoStella(indice: number, n: number, raggio: number): [number, number] {
  const angolo = -Math.PI / 2 + (2 * Math.PI * indice) / n;
  return [CENTRO + raggio * Math.cos(angolo), CENTRO + raggio * Math.sin(angolo)];
}

/** Numero con al massimo due decimali, come testo per gli attributi SVG. */
export const arrotonda = (v: number): string => (Math.round(v * 100) / 100).toString();

/** Stringa `points` di un poligono con un raggio per asse. */
export function poligonoStella(raggi: number[]): string {
  return raggi.map((r, i) => puntoStella(i, raggi.length, r).map(arrotonda).join(',')).join(' ');
}
