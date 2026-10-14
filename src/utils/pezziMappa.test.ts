// ============================================================
// Test pezziMappa — zone cancellate, pezzi posati (rotazione e specchio), visibilità e inquadratura (102, 2026-10-14)
// ============================================================

import { describe, it, expect } from 'vitest';
import { areaConPezzi, mascheraZone, statoPezzo, stileImmagineMascherata, stilePezzo, zoneDeiPezzi } from './pezziMappa';
import { areaAlpha } from './inquadraturaMappa';
import type { PezzoMappaDto } from '../types';

const pezzo = (extra: Partial<PezzoMappaDto> = {}): PezzoMappaDto => ({
  id: 1, uid: 'a'.repeat(32), nome: 'Muro', sorgente: { x: 100, y: 900, larghezza: 120, altezza: 40 }, posizione: { x: 500, y: 300 }, rotazione: 0,
  specchio: { orizzontale: false, verticale: false }, condizioni: [], ordine: 0, updatedAt: '', ...extra,
});

describe('la maschera delle zone d\'origine', () => {
  it('nessuna senza pezzi o senza misure; con i pezzi un SVG grande quanto l\'immagine, opaco salvo le zone', () => {
    expect(mascheraZone({ w: 2048, h: 1024 }, [])).toBeNull();
    expect(mascheraZone({ w: 0, h: 0 }, [pezzo()])).toBeNull();
    const m = mascheraZone({ w: 2048, h: 1024 }, [pezzo(), pezzo({ sorgente: { x: 110, y: 905, larghezza: 50, altezza: 10 } })])!;
    expect(m.startsWith('url("data:image/svg+xml,')).toBe(true);
    const svg = decodeURIComponent(m.slice('url("data:image/svg+xml,'.length, -2));
    expect(svg).toContain("viewBox='0 0 2048 1024'");
    // il fondo bianco (opaco) e le due zone nere (trasparenti) dentro una <mask>: le sovrapposte restano cancellate
    expect(svg).toContain("<mask id='m'");
    expect(svg).toContain("<rect x='100' y='900' width='120' height='40' fill='black'/>");
    expect(svg).toContain("<rect x='110' y='905' width='50' height='10' fill='black'/>");
    expect(svg).toContain("mask='url(#m)'");
    expect(stileImmagineMascherata(m)).toMatchObject({ maskImage: m, WebkitMaskImage: m, maskSize: '100% 100%', maskRepeat: 'no-repeat' });
    expect(stileImmagineMascherata(null)).toBeUndefined();
  });
});

describe('il pezzo posato', () => {
  it('senza rotazione: ingombro = zona, ritaglio dalla stessa immagine spostato sulla zona', () => {
    const s = stilePezzo(pezzo(), '/img.png', { w: 2048, h: 1024 });
    expect(s.esterno).toMatchObject({ position: 'absolute', left: 500, top: 300, width: 120, height: 40, pointerEvents: 'none' });
    expect(s.interno).toMatchObject({ left: 0, top: 0, width: 120, height: 40, backgroundImage: 'url("/img.png")', backgroundPosition: '-100px -900px', backgroundSize: '2048px 1024px', transform: 'rotate(0deg) scale(1, 1)' });
  });

  it('a 90° l\'ingombro si scambia e il ritaglio sta al centro; lo specchio si applica prima della rotazione', () => {
    const s = stilePezzo(pezzo({ rotazione: 90, specchio: { orizzontale: true, verticale: false } }), '/img.png', { w: 2048, h: 1024 });
    expect(s.esterno).toMatchObject({ left: 500, top: 300, width: 40, height: 120 });
    // 120 × 40 centrato in 40 × 120: (40 − 120) / 2 = −40, (120 − 40) / 2 = 40
    expect(s.interno).toMatchObject({ left: -40, top: 40, width: 120, height: 40, transformOrigin: 'center' });
    // in CSS si applica da destra: prima lo specchio (scale), poi la rotazione
    expect(s.interno.transform).toBe('rotate(90deg) scale(-1, 1)');
    expect(stilePezzo(pezzo({ rotazione: 180, specchio: { orizzontale: false, verticale: true } }), '/i', { w: 10, h: 10 }).interno.transform).toBe('rotate(180deg) scale(1, -1)');
  });
});

describe('la visibilità', () => {
  const bloccato = pezzo({ disponibilita: { stato: 'bloccato', requisiti: [] } });
  const ignoto = pezzo({ disponibilita: { stato: 'ignoto', requisiti: [] } });
  const libero = pezzo({ disponibilita: { stato: 'disponibile', requisiti: [] } });
  it('senza filtro sempre visibile; con il filtro nascosto senza le sue condizioni, in trasparenza a richiesta', () => {
    expect(statoPezzo(bloccato, false, false)).toBe('visibile');
    expect(statoPezzo(pezzo(), true, false)).toBe('visibile');
    expect(statoPezzo(libero, true, false)).toBe('visibile');
    expect(statoPezzo(bloccato, true, false)).toBe('nascosto');
    expect(statoPezzo(ignoto, true, false)).toBe('nascosto');
    expect(statoPezzo(bloccato, true, true)).toBe('trasparente');
  });
});

describe('l\'inquadratura', () => {
  it('le zone cancellate non contano nell\'area visibile; i pezzi posati sì; senza area si resta sull\'immagine intera', () => {
    // immagine 10 × 10: un blocco in alto (righe 1-2) e un «pezzo» in fondo (riga 8)
    const data = new Uint8ClampedArray(10 * 10 * 4);
    for (const [x, y] of [[2, 1], [5, 2], [1, 8], [6, 8]]) data[(y * 10 + x) * 4 + 3] = 255;
    expect(areaAlpha(data, 10, 10)).toEqual({ x: 1, y: 1, w: 6, h: 8 });
    const zone = zoneDeiPezzi([pezzo({ sorgente: { x: 0, y: 8, larghezza: 10, altezza: 1 } })]);
    expect(zone).toEqual([{ x: 0, y: 8, w: 10, h: 1 }]);
    expect(areaAlpha(data, 10, 10, zone)).toEqual({ x: 2, y: 1, w: 4, h: 2 });
    // il pezzo posato a (4,4) largo 3 e alto 1, ruotato di 90°: ingombro 1 × 3, l'area si allarga fino alla riga 6
    expect(areaConPezzi({ x: 2, y: 1, w: 4, h: 2 }, [pezzo({ sorgente: { x: 0, y: 8, larghezza: 3, altezza: 1 }, posizione: { x: 4, y: 4 }, rotazione: 90 })])).toEqual({ x: 2, y: 1, w: 4, h: 6 });
    expect(areaConPezzi(null, [pezzo()])).toBeNull();
    expect(areaConPezzi({ x: 0, y: 0, w: 1, h: 1 }, [])).toEqual({ x: 0, y: 0, w: 1, h: 1 });
  });
});
