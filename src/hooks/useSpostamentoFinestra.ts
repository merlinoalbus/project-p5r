// ============================================================
// useSpostamentoFinestra — una finestra che si sposta trascinandone la barra o con le frecce sulla maniglia ⠿
// ============================================================
//
// Il gesto unico delle finestre spostabili (richiesta dell'utente, 2026-10-31, per le modali; la guida del visore, 2026-10-20): la
// barra si trascina con gli eventi pointer (mouse, penna e dito; sotto i 4 px è un tocco, non un trascinamento), mai dai suoi comandi;
// la maniglia ⠿ sposta con le frecce (con Maiusc quattro volte tanto), l'alternativa al trascinamento per tastiera e lettori di schermo.
// La finestra resta sempre per intero dentro lo schermo, anche quando lo schermo o la finestra cambiano misura. Lo spostamento è un
// `translate` dal posto in cui la mette il layout: chi la usa decide dov'è quel posto (centrata la modale, in alto a destra della tela
// la guida del visore). Usato da `Modal` e da `GuidaNelVisore`.
// ============================================================

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent as EventoTastiera, type PointerEvent as EventoPuntatore, type RefObject } from 'react';

/** Lo spostamento della finestra dal posto in cui la mette il layout, in pixel. */
export interface Spostamento { x: number; y: number }
const FERMA: Spostamento = { x: 0, y: 0 };
/** Il margine dal bordo dello schermo. */
const MARGINE = 8;
/** Il passo delle frecce sulla maniglia (con Maiusc, quattro volte tanto). */
const PASSO = 24;
/** Da quanti pixel un gesto sulla barra è un trascinamento e non un tocco. */
const SOGLIA_TRASCINAMENTO = 4;

/** Il valore fra due estremi, in qualunque ordine (una finestra più grande dello schermo resta con l'angolo in alto a sinistra in vista). */
const tra = (v: number, a: number, b: number) => Math.min(Math.max(v, Math.min(a, b)), Math.max(a, b));

/**
 * Lo spostamento che la finestra ha adesso nel documento, letto dal suo stile: è quello dentro il rettangolo che si misura (lo stato di React
 * può essere già più avanti, durante un trascinamento veloce, finché il disegno nuovo non arriva).
 */
function applicato(el: HTMLElement): Spostamento {
  const [x = 0, y = 0] = el.style.translate.split(' ').map((v) => Number.parseFloat(v) || 0);
  return { x, y };
}

/**
 * Lo spostamento `voluto` corretto perché la finestra stia per intero nello schermo: togliendo dal suo rettangolo lo spostamento applicato
 * si ottiene il posto del layout. Lo schermo è quello del documento, senza la barra di scorrimento.
 */
function nelloSchermo(el: HTMLElement, voluto: Spostamento): Spostamento {
  const r = el.getBoundingClientRect();
  const ora = applicato(el);
  const sinistra = r.left - ora.x;
  const alto = r.top - ora.y;
  const { clientWidth: vw, clientHeight: vh } = document.documentElement;
  const x = tra(sinistra + voluto.x, MARGINE, vw - r.width - MARGINE) - sinistra;
  const y = tra(alto + voluto.y, MARGINE, vh - r.height - MARGINE) - alto;
  return { x: Math.round(x), y: Math.round(y) };
}

export interface SpostamentoFinestra {
  /** Lo spostamento attuale (fermo: `{ x: 0, y: 0 }`). */
  spostamento: Spostamento;
  /** Lo stile della finestra: il `translate` quando è spostata, altrimenti nulla. */
  stile: CSSProperties | undefined;
  /** Vero durante un trascinamento (la barra cambia cursore). */
  trascina: boolean;
  /** I gesti della barra: inizio, movimento, fine (anche annullata). */
  inizia: (e: EventoPuntatore<HTMLElement>) => void;
  muovi: (e: EventoPuntatore<HTMLElement>) => void;
  finisci: (e: EventoPuntatore<HTMLElement>) => void;
  /** Le frecce sulla maniglia ⠿. */
  frecce: (e: EventoTastiera<HTMLElement>) => void;
}

/**
 * Lo spostamento della finestra `finestra`. `attivo`: se si sposta (le modali da 768 px, non il cassetto né le domande di conferma; la
 * guida del visore da 768 px); `aperta`: chiudendola lo spostamento si azzera, così a ogni apertura riparte dal posto del layout.
 */
export function useSpostamentoFinestra(finestra: RefObject<HTMLElement | null>, { attivo, aperta }: { attivo: boolean; aperta: boolean }): SpostamentoFinestra {
  const [spostamento, setSpostamento] = useState<Spostamento>(FERMA);
  type Gesto = { id: number; px: number; py: number; da: Spostamento; mosso: boolean };
  const gesto = useRef<Gesto | null>(null);
  const [trascina, setTrascina] = useState(false);
  // a ogni apertura la finestra riparte dal suo posto (lo stato si azzera durante il disegno, alla chiusura, anche a metà di un trascinamento)
  const [eraAperta, setEraAperta] = useState(aperta);
  if (eraAperta !== aperta) {
    setEraAperta(aperta);
    if (!aperta) { setSpostamento(FERMA); setTrascina(false); }
  }
  // sempre per intero nello schermo: quando cambiano lo schermo (ridimensionamento, rotazione) o la finestra (il contenuto cresce o cala)
  useEffect(() => {
    const el = finestra.current;
    if (!aperta || !attivo || !el) return;
    const rimetti = () => setSpostamento((s) => {
      if (s.x === 0 && s.y === 0) return s;
      const n = nelloSchermo(el, s);
      return n.x === s.x && n.y === s.y ? s : n;
    });
    window.addEventListener('resize', rimetti);
    const osservatore = typeof ResizeObserver === 'function' ? new ResizeObserver(rimetti) : null;
    osservatore?.observe(el);
    return () => { window.removeEventListener('resize', rimetti); osservatore?.disconnect(); };
  }, [aperta, attivo, finestra]);

  /** L'inizio del trascinamento dalla barra: non dai suoi comandi («Chiudi»), salvo la maniglia. */
  const inizia = (e: EventoPuntatore<HTMLElement>) => {
    const el = finestra.current;
    if (!attivo || e.button !== 0 || !el) return;
    if ((e.target as Element).closest('button:not([data-maniglia]), a, input, select, textarea')) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    gesto.current = { id: e.pointerId, px: e.clientX, py: e.clientY, da: applicato(el), mosso: false };
  };
  const muovi = (e: EventoPuntatore<HTMLElement>) => {
    const g = gesto.current;
    const el = finestra.current;
    if (!g || g.id !== e.pointerId || !el) return;
    const dx = e.clientX - g.px, dy = e.clientY - g.py;
    if (!g.mosso && Math.hypot(dx, dy) < SOGLIA_TRASCINAMENTO) return;
    if (!g.mosso) { g.mosso = true; setTrascina(true); }
    e.preventDefault();
    setSpostamento(nelloSchermo(el, { x: g.da.x + dx, y: g.da.y + dy }));
  };
  const finisci = (e: EventoPuntatore<HTMLElement>) => {
    const g = gesto.current;
    if (!g || g.id !== e.pointerId) return;
    gesto.current = null;
    setTrascina(false);
  };
  /** Le frecce sulla maniglia ⠿: spostano di un passo (con Maiusc di quattro). */
  const frecce = (e: EventoTastiera<HTMLElement>) => {
    const passo = e.shiftKey ? PASSO * 4 : PASSO;
    const d = ({ ArrowLeft: [-passo, 0], ArrowRight: [passo, 0], ArrowUp: [0, -passo], ArrowDown: [0, passo] } as Record<string, [number, number]>)[e.key];
    const el = finestra.current;
    if (!d || !el) return;
    e.preventDefault();
    const s = applicato(el);
    setSpostamento(nelloSchermo(el, { x: s.x + d[0], y: s.y + d[1] }));
  };
  const stile = attivo && (spostamento.x !== 0 || spostamento.y !== 0) ? { translate: `${spostamento.x}px ${spostamento.y}px` } : undefined;
  return { spostamento, stile, trascina, inizia, muovi, finisci, frecce };
}
