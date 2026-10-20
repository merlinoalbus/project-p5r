// ============================================================
// useRiordino — riordinare un elenco trascinando la maniglia (o con le frecce su/giù quando la maniglia ha il focus)
// ============================================================
//
// Nato in `PlanimetriePalazzo` (2026-09-30: «trascina ⠿ per l'ordine in cui percorri il Palazzo»), spostato qui con L3 (2026-10-20),
// quando l'elenco delle planimetrie è diventato quello delle Aree del Palazzo (`AreePalazzo`, §4.2: «↑/↓ 44 px e trascinamento come oggi»).
// Il trascinamento è a puntatore, perché l'HTML5 drag-and-drop col dito non parte, e la colonna scorre da sola vicino ai bordi.
// ============================================================

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

/** Di quanti pixel scorre la colonna a ogni passo quando il puntatore è vicino al bordo, e quanto è largo il bordo. */
const PASSO_SCORRIMENTO = 14;
const BORDO_SCORRIMENTO = 48;

/**
 * Il riordino di un elenco: `riga(id)` registra l'elemento della riga, `maniglia(id, i)` dà i gestori della maniglia. Durante il
 * trascinamento `sopra` è la posizione che la riga prenderebbe; vicino ai bordi della colonna che scorre, la colonna scorre da sola.
 * `blocco` (un perché, o null) ferma il riordino: per esempio mentre si salva l'ordine di prima.
 */
export function useRiordino(ids: string[], blocco: string | null, onSposta: (id: string, a: number) => void) {
  const bloccato = blocco !== null;
  const righe = useRef(new Map<string, HTMLElement>());
  const maniglie = useRef(new Map<string, HTMLButtonElement>());
  // La maniglia spostata da tastiera va rimessa a fuoco: React riordina le righe spostando nel DOM quella che scende, e un elemento
  // spostato perde il focus (con la freccia giù la seconda pressione non faceva più nulla — rilievo della revisione).
  const daRifocalizzare = useRef<string | null>(null);
  useLayoutEffect(() => {
    const id = daRifocalizzare.current;
    if (!id) return;
    const el = maniglie.current.get(id);
    if (el && document.activeElement !== el) el.focus();
    if (el) daRifocalizzare.current = null;
  });
  const [trascinato, setTrascinato] = useState<string | null>(null);
  const [sopra, setSopra] = useState<number | null>(null);
  const ultimoY = useRef(0);
  const contenitore = useRef<HTMLElement | null>(null);
  const velocita = useRef(0);
  // gli id correnti, letti anche dal timer dello scorrimento (che non si ricrea a ogni disegno)
  const elenco = useRef(ids);
  useLayoutEffect(() => { elenco.current = ids; });

  /** La posizione della riga sotto il puntatore: l'ultima il cui bordo alto è già stato superato. Legge solo riferimenti. */
  const indiceSotto = useCallback((y: number): number | null => {
    let trovato: number | null = null;
    elenco.current.forEach((id, i) => { const el = righe.current.get(id); if (el && y >= el.getBoundingClientRect().top) trovato = i; });
    return trovato ?? (elenco.current.length ? 0 : null);
  }, []);

  // lo scorrimento automatico continua anche a puntatore fermo vicino al bordo, finché dura il trascinamento
  useEffect(() => {
    if (!trascinato) return;
    const timer = window.setInterval(() => {
      if (!velocita.current || !contenitore.current) return;
      contenitore.current.scrollTop += velocita.current;
      setSopra(indiceSotto(ultimoY.current));
    }, 30);
    return () => window.clearInterval(timer);
  }, [trascinato, indiceSotto]);

  /** Chiude il trascinamento: niente riga trascinata né posizione bersaglio, scorrimento automatico fermo. */
  const fine = () => { setTrascinato(null); setSopra(null); velocita.current = 0; contenitore.current = null; };

  return {
    trascinato,
    sopra,
    blocco,
    riga: (id: string) => (el: HTMLElement | null) => { if (el) righe.current.set(id, el); else righe.current.delete(id); },
    rifManiglia: (id: string) => (el: HTMLButtonElement | null) => { if (el) maniglie.current.set(id, el); else maniglie.current.delete(id); },
    maniglia: (id: string, i: number) => ({
      onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
        // solo il tasto principale (o il dito): il destro apre il menu, non trascina
        if (bloccato || e.button !== 0) return;
        e.preventDefault();
        // la cattura tiene il trascinamento anche fuori dalla maniglia; se il puntatore non è più attivo lancia, e si va avanti senza
        try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* senza cattura il rilascio fuori dalla maniglia lo chiude la perdita del puntatore */ }
        contenitore.current = e.currentTarget.closest<HTMLElement>('.area-scorrevole');
        ultimoY.current = e.clientY;
        setTrascinato(id); setSopra(i);
      },
      onPointerMove: (e: PointerEvent<HTMLButtonElement>) => {
        if (trascinato !== id) return;
        ultimoY.current = e.clientY;
        const r = contenitore.current?.getBoundingClientRect();
        velocita.current = !r ? 0 : e.clientY < r.top + BORDO_SCORRIMENTO ? -PASSO_SCORRIMENTO : e.clientY > r.bottom - BORDO_SCORRIMENTO ? PASSO_SCORRIMENTO : 0;
        setSopra(indiceSotto(e.clientY));
      },
      onPointerUp: () => { if (trascinato === id && sopra !== null && sopra !== i) onSposta(id, sopra); fine(); },
      onPointerCancel: fine,
      // la cattura può perdersi senza pointerup (finestra che perde il fuoco…): il trascinamento finisce lì
      onLostPointerCapture: () => { if (trascinato === id) fine(); },
      onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => {
        const a = e.key === 'ArrowUp' ? i - 1 : e.key === 'ArrowDown' ? i + 1 : null;
        if (a === null) return;
        e.preventDefault();
        if (!bloccato && a >= 0 && a < ids.length) { daRifocalizzare.current = id; onSposta(id, a); }
      },
    }),
  };
}

export type Riordino = ReturnType<typeof useRiordino>;
