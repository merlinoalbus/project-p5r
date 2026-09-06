export interface AreaMappa { x: number; y: number; w: number; h: number }

/** Limiti dei pixel visibili, senza modificare l'immagine o le sue coordinate. */
export function areaAlpha(data: Uint8ClampedArray, w: number, h: number): AreaMappa | null {
  if (!Number.isInteger(w) || !Number.isInteger(h) || w <= 0 || h <= 0 || data.length !== w * h * 4) return null;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (data[(y * w + x) * 4 + 3] === 0) continue;
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
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

export function inquadraturaMappa(nat: { w: number; h: number }, viewport: { w: number; h: number }, area: AreaMappa | null, pin: ReadonlyArray<{ x: number; y: number }>) {
  let x0 = area?.x ?? 0, y0 = area?.y ?? 0;
  let x1 = x0 + (area?.w ?? nat.w), y1 = y0 + (area?.h ?? nat.h);
  for (const p of pin) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    const x = p.x * nat.w / 100, y = p.y * nat.h / 100;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  // Margine in pixel dello schermo, indipendente dallo zoom e dal canvas DDS.
  const margin = area ? 24 : 0;
  const zoom = viewport.w > 0 && viewport.h > 0
    ? Math.min(Math.max(1, viewport.w - margin * 2) / Math.max(1, x1 - x0), Math.max(1, viewport.h - margin * 2) / Math.max(1, y1 - y0)) : 1;
  return { zoom, pan: { x: viewport.w / 2 - (x0 + x1) * zoom / 2, y: viewport.h / 2 - (y0 + y1) * zoom / 2 } };
}
