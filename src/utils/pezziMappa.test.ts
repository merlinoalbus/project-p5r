// ============================================================
// Test pezziMappa — zone cancellate, pezzi posati (rotazione e specchio), visibilità e inquadratura (102, 2026-10-14); le copie
// di un pezzo: elenco, nome e posto della copia nuova (103, 2026-10-15)
// ============================================================

import { describe, it, expect } from 'vitest';
import { areaConPezzi, copiePosate, mascheraZone, nomeCopia, posaDi, posizioneNuovaCopia, SCARTO_NUOVA_COPIA, statoPezzo, stileImmagineMascherata, stilePezzo, zoneDeiPezzi, type PosaPezzo } from './pezziMappa';
import { areaAlpha } from './inquadraturaMappa';
import type { CopiaPezzoDto, PezzoMappaDto } from '../types';

const SORGENTE = { x: 100, y: 900, larghezza: 120, altezza: 40 };
/** Una posa di prova (zona del ritaglio + posa della copia); `extra` sovrascrive. */
const posa = (extra: Partial<PosaPezzo> = {}): PosaPezzo => ({ sorgente: SORGENTE, posizione: { x: 500, y: 300 }, rotazione: 0, specchio: { orizzontale: false, verticale: false }, ...extra });
/** Una copia di prova; `extra` sovrascrive. */
const copia = (extra: Partial<CopiaPezzoDto> = {}): CopiaPezzoDto => ({
  id: 1, uid: 'c'.repeat(32), pezzoId: 1, etichetta: '', posizione: { x: 500, y: 300 }, rotazione: 0, specchio: { orizzontale: false, verticale: false }, condizioni: [], ordine: 0, updatedAt: '', ...extra,
});
/** Un pezzo di prova con le sue copie; `extra` sovrascrive. */
const pezzo = (extra: Partial<PezzoMappaDto> = {}): PezzoMappaDto => ({ id: 1, uid: 'a'.repeat(32), nome: 'Muro', sorgente: SORGENTE, ordine: 0, updatedAt: '', copie: [copia()], ...extra });

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
    const s = stilePezzo(posa(), '/img.png', { w: 2048, h: 1024 });
    expect(s.esterno).toMatchObject({ position: 'absolute', left: 500, top: 300, width: 120, height: 40, pointerEvents: 'none' });
    expect(s.interno).toMatchObject({ left: 0, top: 0, width: 120, height: 40, backgroundImage: 'url("/img.png")', backgroundPosition: '-100px -900px', backgroundSize: '2048px 1024px', transform: 'rotate(0deg) scale(1, 1)' });
  });

  it('a 90° l\'ingombro si scambia e il ritaglio sta al centro; lo specchio si applica prima della rotazione', () => {
    const s = stilePezzo(posa({ rotazione: 90, specchio: { orizzontale: true, verticale: false } }), '/img.png', { w: 2048, h: 1024 });
    expect(s.esterno).toMatchObject({ left: 500, top: 300, width: 40, height: 120 });
    // 120 × 40 centrato in 40 × 120: (40 − 120) / 2 = −40, (120 − 40) / 2 = 40
    expect(s.interno).toMatchObject({ left: -40, top: 40, width: 120, height: 40, transformOrigin: 'center' });
    // in CSS si applica da destra: prima lo specchio (scale), poi la rotazione
    expect(s.interno.transform).toBe('rotate(90deg) scale(-1, 1)');
    expect(stilePezzo(posa({ rotazione: 180, specchio: { orizzontale: false, verticale: true } }), '/i', { w: 10, h: 10 }).interno.transform).toBe('rotate(180deg) scale(1, -1)');
  });
});

describe('la visibilità (per copia)', () => {
  const bloccata = copia({ disponibilita: { stato: 'bloccato', requisiti: [] } });
  const ignota = copia({ disponibilita: { stato: 'ignoto', requisiti: [] } });
  const libera = copia({ disponibilita: { stato: 'disponibile', requisiti: [] } });
  it('senza filtro sempre visibile; con il filtro nascosta senza le sue condizioni, in trasparenza a richiesta', () => {
    expect(statoPezzo(bloccata, false, false)).toBe('visibile');
    expect(statoPezzo(copia(), true, false)).toBe('visibile');
    expect(statoPezzo(libera, true, false)).toBe('visibile');
    expect(statoPezzo(bloccata, true, false)).toBe('nascosto');
    expect(statoPezzo(ignota, true, false)).toBe('nascosto');
    expect(statoPezzo(bloccata, true, true)).toBe('trasparente');
  });
});

describe('l\'inquadratura', () => {
  it('le zone cancellate non contano nell\'area visibile; le copie posate sì; senza area si resta sull\'immagine intera', () => {
    // immagine 10 × 10: un blocco in alto (righe 1-2) e un «pezzo» in fondo (riga 8)
    const data = new Uint8ClampedArray(10 * 10 * 4);
    for (const [x, y] of [[2, 1], [5, 2], [1, 8], [6, 8]]) data[(y * 10 + x) * 4 + 3] = 255;
    expect(areaAlpha(data, 10, 10)).toEqual({ x: 1, y: 1, w: 6, h: 8 });
    const zone = zoneDeiPezzi([pezzo({ sorgente: { x: 0, y: 8, larghezza: 10, altezza: 1 } })]);
    expect(zone).toEqual([{ x: 0, y: 8, w: 10, h: 1 }]);
    expect(areaAlpha(data, 10, 10, zone)).toEqual({ x: 2, y: 1, w: 4, h: 2 });
    // la copia posata a (4,4) larga 3 e alta 1, ruotata di 90°: ingombro 1 × 3, l'area si allarga fino alla riga 6
    expect(areaConPezzi({ x: 2, y: 1, w: 4, h: 2 }, [posa({ sorgente: { x: 0, y: 8, larghezza: 3, altezza: 1 }, posizione: { x: 4, y: 4 }, rotazione: 90 })])).toEqual({ x: 2, y: 1, w: 4, h: 6 });
    // due copie dello stesso ritaglio: contano tutte e due
    const lontana = posa({ sorgente: { x: 0, y: 8, larghezza: 3, altezza: 1 }, posizione: { x: 0, y: 0 } });
    expect(areaConPezzi({ x: 2, y: 1, w: 4, h: 2 }, [posa({ sorgente: { x: 0, y: 8, larghezza: 3, altezza: 1 }, posizione: { x: 4, y: 4 }, rotazione: 90 }), lontana])).toEqual({ x: 0, y: 0, w: 6, h: 7 });
    expect(areaConPezzi(null, [posa()])).toBeNull();
    expect(areaConPezzi({ x: 0, y: 0, w: 1, h: 1 }, [])).toEqual({ x: 0, y: 0, w: 1, h: 1 });
  });
});

describe('le copie di un pezzo (103)', () => {
  it('l\'elenco delle copie posate segue l\'ordine dei pezzi e poi delle copie, col posto di ognuna; la posa unisce zona e copia', () => {
    const a = pezzo({ id: 1, copie: [copia({ id: 11 }), copia({ id: 12, posizione: { x: 1, y: 2 }, rotazione: 270 })] });
    const b = pezzo({ id: 2, nome: 'Ponte', sorgente: { x: 0, y: 0, larghezza: 5, altezza: 5 }, copie: [copia({ id: 21 })] });
    expect(copiePosate([a, b]).map((x) => [x.pezzo.id, x.copia.id, x.indice])).toEqual([[1, 11, 0], [1, 12, 1], [2, 21, 0]]);
    expect(copiePosate([])).toEqual([]);
    expect(posaDi(a, a.copie[1])).toEqual({ sorgente: SORGENTE, posizione: { x: 1, y: 2 }, rotazione: 270, specchio: { orizzontale: false, verticale: false } });
  });

  it('il nome di una copia è la sua etichetta; vuota, «Nome · copia N» (anche quando è l\'unica)', () => {
    expect(nomeCopia({ nome: 'Muro' }, { etichetta: 'Ala est' }, 0)).toBe('Ala est');
    expect(nomeCopia({ nome: 'Muro' }, { etichetta: '' }, 0)).toBe('Muro · copia 1');
    expect(nomeCopia({ nome: 'Muro' }, { etichetta: '   ' }, 2)).toBe('Muro · copia 3');
  });

  it('la copia nuova sta accanto a quella di partenza, dentro l\'immagine; dove non c\'è spazio va dall\'altra parte', () => {
    const immagine = { larghezza: 1000, altezza: 500 };
    expect(posizioneNuovaCopia(SORGENTE, { posizione: { x: 100, y: 100 }, rotazione: 0 }, immagine)).toEqual({ x: 100 + SCARTO_NUOVA_COPIA, y: 100 + SCARTO_NUOVA_COPIA });
    // 120 × 40 a x 870: 870 + 24 + 120 > 1000, quindi a sinistra; a y 455: 455 + 24 + 40 > 500, quindi in su
    expect(posizioneNuovaCopia(SORGENTE, { posizione: { x: 870, y: 455 }, rotazione: 0 }, immagine)).toEqual({ x: 870 - SCARTO_NUOVA_COPIA, y: 455 - SCARTO_NUOVA_COPIA });
    // ruotata di 90° l'ingombro è 40 × 120: a y 370 in giù non ci sta (370 + 24 + 120 > 500)
    expect(posizioneNuovaCopia(SORGENTE, { posizione: { x: 0, y: 370 }, rotazione: 90 }, immagine)).toEqual({ x: SCARTO_NUOVA_COPIA, y: 370 - SCARTO_NUOVA_COPIA });
    // un pezzo grande quasi quanto l'immagine: resta dentro, al più a 0
    expect(posizioneNuovaCopia({ x: 0, y: 0, larghezza: 990, altezza: 490 }, { posizione: { x: 5, y: 5 }, rotazione: 0 }, immagine)).toEqual({ x: 0, y: 0 });
    // senza dimensioni dell'immagine solo in avanti (lo controlla il server)
    expect(posizioneNuovaCopia(SORGENTE, { posizione: { x: 900, y: 900 }, rotazione: 0 }, null)).toEqual({ x: 900 + SCARTO_NUOVA_COPIA, y: 900 + SCARTO_NUOVA_COPIA });
  });
});
