// ============================================================
// pezziMappa — come il visore disegna i pezzi delle planimetrie (102): zone cancellate, pezzi posati, visibilità
// ============================================================
//
// Richiesta dell'utente (2026-10-14): i pezzi che il gioco disegna a parte (i muri mobili in fondo al Museo 2P di Madarame) tolti
// dalla vista ordinaria e posati sulla mappa con le condizioni che li mostrano. Scelte: la zona d'origine è «sempre cancellata»;
// un pezzo senza le sue condizioni è «nascosto, in trasparenza a richiesta»; rotazione a 90° e specchio.
// Tutto in pixel dell'immagine: il livello del visore è grande quanto l'immagine e lo zoom lo scala intero, pezzi compresi.
// ============================================================

import type { CSSProperties } from 'react';
import type { PezzoMappaDto } from '../types';
import { ingombroPezzo } from '../../shared/pezziMappa';
import type { AreaMappa } from './inquadraturaMappa';

/**
 * La maschera CSS che cancella dall'immagine di base le zone d'origine dei pezzi: un SVG grande quanto l'immagine, opaco ovunque
 * tranne le zone (una `<mask>` interna, così le zone che si sovrappongono restano cancellate). Null senza pezzi o senza misure.
 */
export function mascheraZone(nat: { w: number; h: number }, pezzi: ReadonlyArray<Pick<PezzoMappaDto, 'sorgente'>>): string | null {
  if (pezzi.length === 0 || !(nat.w > 0 && nat.h > 0)) return null;
  const { w, h } = nat;
  const zone = pezzi.map((p) => `<rect x='${p.sorgente.x}' y='${p.sorgente.y}' width='${p.sorgente.larghezza}' height='${p.sorgente.altezza}' fill='black'/>`).join('');
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'><defs><mask id='m' maskUnits='userSpaceOnUse' x='0' y='0' width='${w}' height='${h}'>`
    + `<rect width='${w}' height='${h}' fill='white'/>${zone}</mask></defs><rect width='${w}' height='${h}' fill='white' mask='url(#m)'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Lo stile dell'immagine di base con le zone cancellate (maschera alfa a tutta immagine), o nessuno. */
export function stileImmagineMascherata(maschera: string | null): CSSProperties | undefined {
  if (!maschera) return undefined;
  return { maskImage: maschera, WebkitMaskImage: maschera, maskSize: '100% 100%', WebkitMaskSize: '100% 100%', maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat' };
}

/**
 * Lo stile di un pezzo posato: il contenitore è il suo ingombro nel punto scelto; dentro, la zona d'origine ritagliata dalla stessa
 * immagine (sfondo grande quanto l'immagine, spostato sulla zona), centrata, specchiata e poi ruotata attorno al centro.
 * (In CSS le trasformazioni si applicano da destra: `rotate(…) scale(…)` specchia prima e ruota poi.)
 */
export function stilePezzo(p: Pick<PezzoMappaDto, 'sorgente' | 'posizione' | 'rotazione' | 'specchio'>, src: string, nat: { w: number; h: number }): { esterno: CSSProperties; interno: CSSProperties } {
  const s = p.sorgente;
  const ingombro = ingombroPezzo(s.larghezza, s.altezza, p.rotazione);
  return {
    esterno: { position: 'absolute', left: p.posizione.x, top: p.posizione.y, width: ingombro.larghezza, height: ingombro.altezza, pointerEvents: 'none' },
    interno: {
      position: 'absolute', left: (ingombro.larghezza - s.larghezza) / 2, top: (ingombro.altezza - s.altezza) / 2, width: s.larghezza, height: s.altezza,
      backgroundImage: `url(${JSON.stringify(src)})`, backgroundPosition: `${-s.x}px ${-s.y}px`, backgroundSize: `${nat.w}px ${nat.h}px`, backgroundRepeat: 'no-repeat',
      transform: `rotate(${p.rotazione}deg) scale(${p.specchio.orizzontale ? -1 : 1}, ${p.specchio.verticale ? -1 : 1})`, transformOrigin: 'center',
    },
  };
}

/**
 * Come si vede un pezzo: senza filtro delle condizioni (nessuna partita, o l'editor con «Giorno corrente» spento) sempre; con il
 * filtro, se le condizioni valgono; se no nascosto, o in trasparenza con «Mostra anche i non ancora disponibili» (come i pin).
 */
export function statoPezzo(p: Pick<PezzoMappaDto, 'disponibilita'>, filtraBloccati: boolean, mostraNonDisponibili: boolean): 'visibile' | 'trasparente' | 'nascosto' {
  if (!filtraBloccati || !p.disponibilita || p.disponibilita.stato === 'disponibile') return 'visibile';
  return mostraNonDisponibili ? 'trasparente' : 'nascosto';
}

/** Le zone d'origine dei pezzi come aree (escluse dall'area visibile dell'immagine). */
export function zoneDeiPezzi(pezzi: ReadonlyArray<Pick<PezzoMappaDto, 'sorgente'>>): AreaMappa[] {
  return pezzi.map((p) => ({ x: p.sorgente.x, y: p.sorgente.y, w: p.sorgente.larghezza, h: p.sorgente.altezza }));
}

/**
 * L'area da inquadrare: quella visibile dell'immagine (senza le zone cancellate) più l'ingombro dei pezzi posati. Senza un'area
 * (immagine non leggibile) resta null: si inquadra l'immagine intera, non i soli pezzi.
 */
export function areaConPezzi(area: AreaMappa | null, pezzi: ReadonlyArray<Pick<PezzoMappaDto, 'sorgente' | 'posizione' | 'rotazione'>>): AreaMappa | null {
  if (!area || pezzi.length === 0) return area;
  let x0 = area.x, y0 = area.y, x1 = area.x + area.w, y1 = area.y + area.h;
  for (const p of pezzi) {
    const ing = ingombroPezzo(p.sorgente.larghezza, p.sorgente.altezza, p.rotazione);
    x0 = Math.min(x0, p.posizione.x); y0 = Math.min(y0, p.posizione.y);
    x1 = Math.max(x1, p.posizione.x + ing.larghezza); y1 = Math.max(y1, p.posizione.y + ing.altezza);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
