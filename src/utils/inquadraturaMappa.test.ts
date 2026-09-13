import { describe, it, expect } from 'vitest';
import { areaAlpha, inquadraturaMappa } from './inquadraturaMappa';

describe('inquadratura delle planimetrie senza cambiare coordinate', () => {
  it('considera anche pixel semitrasparenti e ripiega su canvas vuoto o dati invalidi', () => {
    const data = new Uint8ClampedArray(4 * 3 * 4);
    data[(1 * 4 + 2) * 4 + 3] = 1;
    expect(areaAlpha(data, 4, 3)).toEqual({ x: 2, y: 1, w: 1, h: 1 });
    expect(areaAlpha(new Uint8ClampedArray(48), 4, 3)).toBeNull();
    expect(areaAlpha(data, 2, 3)).toBeNull();
  });
  it('mantiene almeno 24 pixel sullo schermo e centra il contenuto decentrato', () => {
    const fit = inquadraturaMappa({ w: 1024, h: 1024 }, { w: 600, h: 400 }, { x: 100, y: 200, w: 200, h: 400 }, []);
    expect(fit.zoom).toBeCloseTo(.88);
    expect(200 * fit.zoom + fit.pan.y).toBeCloseTo(24);
    expect(600 * fit.zoom + fit.pan.y).toBeCloseTo(376);
    expect(200 * fit.zoom + fit.pan.x).toBeCloseTo(300);
  });
  it('include tutti i pin anche fuori dai pixel visibili senza cambiarne la posizione percentuale', () => {
    const pin = [{ x: 95, y: 90 }];
    const fit = inquadraturaMappa({ w: 1000, h: 1000 }, { w: 500, h: 500 }, { x: 100, y: 100, w: 50, h: 50 }, pin);
    expect(950 * fit.zoom + fit.pan.x).toBeLessThanOrEqual(476.000001);
    expect(900 * fit.zoom + fit.pan.y).toBeLessThanOrEqual(476.000001);
    expect(pin).toEqual([{ x: 95, y: 90 }]);
  });
  it('fallback senza alpha conserva il vecchio fit e le coordinate di un arrivo restano reversibili', () => {
    const fit = inquadraturaMappa({ w: 1000, h: 500 }, { w: 600, h: 400 }, null, []);
    expect(fit).toEqual({ zoom: .6, pan: { x: 0, y: 50 } });
    const z = fit.zoom * 2.5, pan = 300 - .65 * 1000 * z;
    expect((300 - pan) / (1000 * z) * 100).toBeCloseTo(65);
  });
});

// Il fit deve lasciare posto non al *punto* del pin ma al suo **bersaglio**: la goccia è ancorata
// alla punta, quindi si alza di 41 px sopra il punto (38 di disegno più i 3 dell'area del tocco) e
// si allarga di 22 per lato. Senza questo margine un pin sul bordo veniva tagliato dal ritaglio
// della tela e riceveva 27 px invece di 44 (rilievo del validatore, 2026-09-13).
describe('margine per il bersaglio dei pin', () => {
  it('lascia 22 px ai lati, 41 sopra e 3 sotto a ogni pin, anche a quelli sugli spigoli', () => {
    const pin = [{ x: 0, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }, { x: 100, y: 0 }, { x: 50, y: 50 }];
    for (const viewport of [{ w: 331, h: 417 }, { w: 724, h: 600 }, { w: 1100, h: 800 }]) {
      for (const area of [null, { x: 10, y: 10, w: 900, h: 900 }]) {
        const fit = inquadraturaMappa({ w: 1000, h: 1000 }, viewport, area, pin);
        for (const p of pin) {
          const x = p.x * 10 * fit.zoom + fit.pan.x, y = p.y * 10 * fit.zoom + fit.pan.y;
          expect(x - 22).toBeGreaterThanOrEqual(-0.001);
          expect(x + 22).toBeLessThanOrEqual(viewport.w + 0.001);
          expect(y - 41).toBeGreaterThanOrEqual(-0.001);
          expect(y + 3).toBeLessThanOrEqual(viewport.h + 0.001);
        }
      }
    }
  });
});
