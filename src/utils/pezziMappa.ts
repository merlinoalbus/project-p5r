// ============================================================
// pezziMappa — come il visore disegna i pezzi delle planimetrie (102): zone cancellate, pezzi posati, visibilità
// ============================================================
//
// Richiesta dell'utente (2026-10-14): i pezzi che il gioco disegna a parte (i muri mobili in fondo al Museo 2P di Madarame) tolti
// dalla vista ordinaria e posati sulla mappa con le condizioni che li mostrano. Scelte: la zona d'origine è «sempre cancellata»;
// un pezzo senza le sue condizioni è «nascosto, in trasparenza a richiesta»; rotazione a 90° e specchio.
// Tutto in pixel dell'immagine: il livello del visore è grande quanto l'immagine e lo zoom lo scala intero, pezzi compresi.
// Dal 2026-10-15 (103) un pezzo è il ritaglio e si posa in più copie: la zona si cancella una volta per ritaglio, si disegna
// ogni copia, con posizione, rotazione, specchio e condizioni proprie.
// ============================================================

import type { CSSProperties } from 'react';
import type { CopiaPezzoDto, PezzoMappaDto } from '../types';
import { ingombroPezzo } from '../../shared/pezziMappa';
import type { AreaMappa } from './inquadraturaMappa';

/** Una copia da disegnare con la zona del suo ritaglio: la forma che usano `stilePezzo` e `areaConPezzi`. */
export type PosaPezzo = Pick<PezzoMappaDto, 'sorgente'> & Pick<CopiaPezzoDto, 'posizione' | 'rotazione' | 'specchio'>;

/** Una copia posata con il suo ritaglio e il suo posto fra le copie (da 0). */
export interface CopiaPosata { pezzo: PezzoMappaDto; copia: CopiaPezzoDto; indice: number }

/** Tutte le copie posate dei pezzi di una mappa, nell'ordine dei pezzi e poi delle copie. */
export function copiePosate(pezzi: readonly PezzoMappaDto[]): CopiaPosata[] {
  return pezzi.flatMap((pezzo) => pezzo.copie.map((copia, indice) => ({ pezzo, copia, indice })));
}

/** La forma da disegnare di una copia: la zona del ritaglio con la posa della copia. */
export const posaDi = (pezzo: Pick<PezzoMappaDto, 'sorgente'>, copia: Pick<CopiaPezzoDto, 'posizione' | 'rotazione' | 'specchio'>): PosaPezzo =>
  ({ sorgente: pezzo.sorgente, posizione: copia.posizione, rotazione: copia.rotazione, specchio: copia.specchio });

/** Il nome di una copia: la sua etichetta o, vuota, «Nome · copia N» (scelta dell'utente del 2026-10-15; N da 1). */
export function nomeCopia(pezzo: Pick<PezzoMappaDto, 'nome'>, copia: Pick<CopiaPezzoDto, 'etichetta'>, indice: number): string {
  return copia.etichetta.trim() || `${pezzo.nome} · copia ${indice + 1}`;
}

/** Lo scarto di una copia nuova da quella di partenza, in pixel dell'immagine: quanto basta a vederla accanto, non sopra. */
export const SCARTO_NUOVA_COPIA = 24;

/**
 * Dove posare una copia nuova: accanto a quella di partenza (in basso a destra di `SCARTO_NUOVA_COPIA`), con l'ingombro tutto
 * dentro l'immagine; se lì non c'è spazio, dall'altra parte. Senza dimensioni dell'immagine solo in avanti (lo controlla il server).
 */
export function posizioneNuovaCopia(sorgente: PezzoMappaDto['sorgente'], copia: Pick<CopiaPezzoDto, 'posizione' | 'rotazione'>, immagine: { larghezza: number; altezza: number } | null): { x: number; y: number } {
  const ingombro = ingombroPezzo(sorgente.larghezza, sorgente.altezza, copia.rotazione);
  const asse = (da: number, misura: number, totale: number | undefined): number => {
    if (totale === undefined) return da + SCARTO_NUOVA_COPIA;
    const massimo = Math.max(0, totale - misura);
    if (da + SCARTO_NUOVA_COPIA <= massimo) return da + SCARTO_NUOVA_COPIA;
    return Math.max(0, Math.min(massimo, da - SCARTO_NUOVA_COPIA));
  };
  return { x: asse(copia.posizione.x, ingombro.larghezza, immagine?.larghezza), y: asse(copia.posizione.y, ingombro.altezza, immagine?.altezza) };
}

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
export function stilePezzo(p: PosaPezzo, src: string, nat: { w: number; h: number }): { esterno: CSSProperties; interno: CSSProperties } {
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
 * Come si vede una copia (103: le condizioni sono per copia): senza filtro delle condizioni (nessuna partita, o l'editor con
 * «Giorno corrente» spento) sempre; con il filtro, se le condizioni valgono; se no nascosta, o in trasparenza con «Mostra anche i
 * non ancora disponibili» (come i pin).
 */
export function statoPezzo(p: Pick<CopiaPezzoDto, 'disponibilita'>, filtraBloccati: boolean, mostraNonDisponibili: boolean): 'visibile' | 'trasparente' | 'nascosto' {
  if (!filtraBloccati || !p.disponibilita || p.disponibilita.stato === 'disponibile') return 'visibile';
  return mostraNonDisponibili ? 'trasparente' : 'nascosto';
}

/** Le zone d'origine dei pezzi come aree (escluse dall'area visibile dell'immagine). */
export function zoneDeiPezzi(pezzi: ReadonlyArray<Pick<PezzoMappaDto, 'sorgente'>>): AreaMappa[] {
  return pezzi.map((p) => ({ x: p.sorgente.x, y: p.sorgente.y, w: p.sorgente.larghezza, h: p.sorgente.altezza }));
}

/**
 * L'area da inquadrare: quella visibile dell'immagine (senza le zone cancellate) più l'ingombro delle copie posate. Senza un'area
 * (immagine non leggibile) resta null: si inquadra l'immagine intera, non i soli pezzi.
 */
export function areaConPezzi(area: AreaMappa | null, pezzi: ReadonlyArray<Omit<PosaPezzo, 'specchio'>>): AreaMappa | null {
  if (!area || pezzi.length === 0) return area;
  let x0 = area.x, y0 = area.y, x1 = area.x + area.w, y1 = area.y + area.h;
  for (const p of pezzi) {
    const ing = ingombroPezzo(p.sorgente.larghezza, p.sorgente.altezza, p.rotazione);
    x0 = Math.min(x0, p.posizione.x); y0 = Math.min(y0, p.posizione.y);
    x1 = Math.max(x1, p.posizione.x + ing.larghezza); y1 = Math.max(y1, p.posizione.y + ing.altezza);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
