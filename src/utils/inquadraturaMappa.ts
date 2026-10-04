// ============================================================
// inquadraturaMappa — inquadratura iniziale di una mappa: area visibile dell'immagine, spilli, zoom e spostamento
// ============================================================

export interface AreaMappa { x: number; y: number; w: number; h: number }

/**
 * Limiti dei pixel visibili, senza modificare l'immagine o le sue coordinate.
 *
 * Si cerca dai bordi verso l'interno e ci si ferma al primo pixel visibile (rilievo P2" della verifica completa): la prima riga
 * dall'alto e dal basso, poi la prima colonna da sinistra e da destra, guardando solo fra quelle due righe. Il risultato è lo
 * stesso del giro su ogni pixel, che girava sincrono al caricamento di ogni planimetria; ora si leggono solo i margini
 * trasparenti, e per un'immagine piena una riga e una colonna per lato.
 */
export function areaAlpha(data: Uint8ClampedArray, w: number, h: number): AreaMappa | null {
  if (!Number.isInteger(w) || !Number.isInteger(h) || w <= 0 || h <= 0 || data.length !== w * h * 4) return null;
  /** Il pixel ha alfa diverso da zero. */
  const visibile = (x: number, y: number) => data[(y * w + x) * 4 + 3] !== 0;
  /** La riga contiene almeno un pixel visibile. */
  const rigaVisibile = (y: number) => { for (let x = 0; x < w; x++) if (visibile(x, y)) return true; return false; };
  let y0 = 0;
  while (y0 < h && !rigaVisibile(y0)) y0++;
  if (y0 === h) return null;
  let y1 = h - 1;
  while (!rigaVisibile(y1)) y1--;
  /** La colonna contiene almeno un pixel visibile fra le righe y0 e y1. */
  const colonnaVisibile = (x: number) => { for (let y = y0; y <= y1; y++) if (visibile(x, y)) return true; return false; };
  let x0 = 0;
  while (!colonnaVisibile(x0)) x0++;
  let x1 = w - 1;
  while (!colonnaVisibile(x1)) x1--;
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** Immagini non leggibili (es. CORS) mantengono l'inquadratura dell'intero canvas. */
export function areaImmagine(img: HTMLImageElement): AreaMappa | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return areaAlpha(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
  } catch { return null; }
}

/**
 * Zoom e spostamento iniziali perché nel riquadro `viewport` stiano l'area visibile dell'immagine (tutta l'immagine
 * di dimensioni `nat` se l'area manca) e tutti gli spilli (coordinate in percentuale; quelli non finiti si ignorano).
 * Il rettangolo che li contiene viene centrato nello spazio che resta tolti i margini, con lo zoom più grande che
 * lo fa entrare per intero; i margini sono spiegati qui sotto.
 */
export function inquadraturaMappa(nat: { w: number; h: number }, viewport: { w: number; h: number }, area: AreaMappa | null, pin: ReadonlyArray<{ x: number; y: number }>) {
  let x0 = area?.x ?? 0, y0 = area?.y ?? 0;
  let x1 = x0 + (area?.w ?? nat.w), y1 = y0 + (area?.h ?? nat.h);
  for (const p of pin) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    const x = p.x * nat.w / 100, y = p.y * nat.h / 100;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  // Margine in pixel dello schermo, indipendente dallo zoom e dal canvas DDS.
  //
  // Quando ci sono pin il margine non serve all'estetica ma al **bersaglio**: la goccia è ancorata
  // alla punta e si alza di 41 px sopra il punto (38 di disegno più i 3 dell'area del tocco), e si
  // allarga di 22 per lato. Con i soli 24 px di prima — e con zero, quando l'alfa dell'immagine non
  // era leggibile — un pin sul bordo restava tagliato dal ritaglio della tela e riceveva 27 px
  // invece di 44 (rilievo del validatore, 2026-09-13). I margini sono asimmetrici perché lo è la
  // goccia: sopra serve più spazio che sotto.
  //
  // Quel che serve è 22 ai lati, 41 sopra e 3 sotto; quel che si applica è **24, 44 e 24**, cioè
  // il requisito arrotondato in eccesso (il margine dei 24 c'era già e vale anche senza pin).
  // Con un viewport ancora da misurare (0×0) non c'è margine che abbia senso: si resta neutri. E su
  // una tela molto piccola i margini si riducono in proporzione, altrimenti mangerebbero la mappa.
  const degenere = !(viewport.w > 0 && viewport.h > 0);
  const conPin = pin.length > 0;
  const base = degenere ? 0 : conPin || area ? 24 : 0;
  const sopraBase = degenere ? 0 : conPin ? 44 : base;
  const scala = degenere ? 1 : Math.min(1, base > 0 ? (viewport.w * 0.4) / (base * 2) : 1, sopraBase + base > 0 ? (viewport.h * 0.4) / (sopraBase + base) : 1);
  const mx = base * scala;
  const mSopra = sopraBase * scala;
  const mSotto = base * scala;
  const larghezza = viewport.w - mx * 2;
  const altezza = viewport.h - mSopra - mSotto;
  const zoom = degenere ? 1 : Math.min(Math.max(1, larghezza) / Math.max(1, x1 - x0), Math.max(1, altezza) / Math.max(1, y1 - y0));
  return { zoom, pan: { x: mx + larghezza / 2 - (x0 + x1) * zoom / 2, y: mSopra + altezza / 2 - (y0 + y1) * zoom / 2 } };
}
