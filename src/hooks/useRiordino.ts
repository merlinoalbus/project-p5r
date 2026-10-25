// ============================================================
// useRiordino — riordinare un elenco trascinando la maniglia (o con le frecce su/giù quando la maniglia ha il focus)
// ============================================================
//
// Nato in `PlanimetriePalazzo` (2026-09-30: «trascina ⠿ per l'ordine in cui percorri il Palazzo»), spostato qui con L3 (2026-10-20),
// quando l'elenco delle planimetrie è diventato quello delle Aree del Palazzo (`AreePalazzo`, §4.2: «↑/↓ 44 px e trascinamento come oggi»).
// Il trascinamento è a puntatore, perché l'HTML5 drag-and-drop col dito non parte, e la colonna scorre da sola vicino ai bordi.
// ============================================================

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';

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

// ============================================================
// useRiordinoCollegato — riordinare voci che stanno in PIÙ elenchi collegati (il diario: «Di giorno» e «Di sera»)
// ============================================================
//
// Come `useRiordino`, ma una voce si può rilasciare anche in un altro elenco. Gli id sono unici fra tutti gli elenchi: dall'id il hook
// ricava l'elenco e il posto della voce. Il posto di rilascio è `{ lista, indice }`, con l'indice che la voce avrebbe nell'elenco di
// arrivo dopo essere stata tolta dal suo (la stessa semantica di `posizione` dell'API della giornata): è il numero di righe, esclusa la
// trascinata, il cui centro sta sopra il puntatore. La colonna che scorre è il primo antenato scorrevole della maniglia, altrimenti la finestra.
// Da tastiera, sulla maniglia: ↑/↓ di un posto; dal primo (ultimo) posto si passa in fondo all'elenco prima (in cima al successivo); Esc annulla.
// ============================================================

export interface ElencoRiordino { nome: string; ids: string[] }
export interface PostoRiordino { lista: string; indice: number }

/** Col dito il trascinamento parte solo dopo una pressione lunga ferma: un tocco o uno scorrimento sopra la maniglia non spostano la voce. */
const PRESSIONE_LUNGA_MS = 350;
const TOLLERANZA_PRESSIONE = 10;

/** Il primo antenato che scorre in verticale davvero (con altro contenuto da mostrare); null = scorre la finestra. */
function antenatoScorrevole(el: HTMLElement | null): HTMLElement | null {
  for (let p = el?.parentElement ?? null; p; p = p.parentElement) {
    const o = window.getComputedStyle(p).overflowY;
    if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight) return p;
  }
  return null;
}

/**
 * Il riordino di voci in elenchi collegati: `riga(id)` registra la riga, `lista(nome)` il contenitore dell'elenco (anche vuoto: è lì che si
 * rilascia), `maniglia(id)` dà i gestori della maniglia. Durante il trascinamento `rilascio` è il posto in cui la voce andrebbe.
 * `onSposta` può restituire una promessa: a salvataggio finito il fuoco torna alla maniglia (la riga può essere rimontata dal ricaricamento).
 */
export function useRiordinoCollegato(liste: ReadonlyArray<ElencoRiordino>, blocco: string | null, onSposta: (id: string, lista: string, indice: number) => void | Promise<unknown>) {
  const bloccato = blocco !== null;
  const righe = useRef(new Map<string, HTMLElement>());
  const maniglie = useRef(new Map<string, HTMLButtonElement>());
  const contenitori = useRef(new Map<string, HTMLElement>());
  const daRifocalizzare = useRef<string | null>(null);
  const [, setGiro] = useState(0);
  useLayoutEffect(() => {
    const id = daRifocalizzare.current;
    if (!id) return;
    const el = maniglie.current.get(id);
    if (el && document.activeElement !== el) el.focus();
    if (el) daRifocalizzare.current = null;
  });
  const [trascinato, setTrascinato] = useState<string | null>(null);
  const [rilascio, setRilascio] = useState<PostoRiordino | null>(null);
  const ultimoY = useRef(0);
  const scorrevole = useRef<HTMLElement | null>(null);
  const velocita = useRef(0);
  const corrente = useRef(liste);
  const inCorso = useRef<string | null>(null);
  // la pressione lunga in attesa (dito appoggiato sulla maniglia, trascinamento non ancora partito)
  const attesa = useRef<{ timer: number; x: number; y: number } | null>(null);
  // il blocco del momento, letto dal timer della pressione lunga
  const bloccatoOra = useRef(bloccato);
  useLayoutEffect(() => { corrente.current = liste; bloccatoOra.current = bloccato; });
  const annullaAttesa = () => { if (attesa.current) { window.clearTimeout(attesa.current.timer); attesa.current = null; } };
  useEffect(() => () => { if (attesa.current) window.clearTimeout(attesa.current.timer); }, []);
  // Col dito la maniglia lascia scorrere la pagina finché il trascinamento non parte; da lì lo scorrimento si ferma (`touchmove`
  // annullato), così il dito sposta la voce e non la pagina. Il listener NON passivo sta sulla maniglia fin da quando compare (vedi
  // `rifManiglia`): il browser deve saperlo già al primo tocco, altrimenti può dichiarare non annullabili i `touchmove` del gesto.
  const bloccaScorrimento = useCallback((ev: TouchEvent) => { if (inCorso.current && ev.cancelable) ev.preventDefault(); }, []);

  /** L'elenco e il posto in cui rilascerebbe un puntatore all'altezza `y`. Legge solo riferimenti. */
  const postoSotto = useCallback((y: number): PostoRiordino | null => {
    let scelto: ElencoRiordino | undefined;
    let distanza = Infinity;
    for (const l of corrente.current) {
      const el = contenitori.current.get(l.nome);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const d = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
      if (d < distanza) { distanza = d; scelto = l; }
    }
    if (!scelto) return null;
    let indice = 0;
    for (const id of scelto.ids) {
      if (id === inCorso.current) continue;
      const el = righe.current.get(id);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (y > r.top + r.height / 2) indice++;
    }
    return { lista: scelto.nome, indice };
  }, []);
  const imposta = useCallback((y: number) => {
    const n = postoSotto(y);
    setRilascio((p) => (p && n && p.lista === n.lista && p.indice === n.indice ? p : n));
  }, [postoSotto]);

  // lo scorrimento automatico continua anche a puntatore fermo vicino al bordo, finché dura il trascinamento
  useEffect(() => {
    if (!trascinato) return;
    const timer = window.setInterval(() => {
      if (!velocita.current) return;
      if (scorrevole.current) scorrevole.current.scrollTop += velocita.current; else window.scrollBy(0, velocita.current);
      imposta(ultimoY.current);
    }, 30);
    return () => window.clearInterval(timer);
  }, [trascinato, imposta]);

  const fine = () => { setTrascinato(null); setRilascio(null); velocita.current = 0; scorrevole.current = null; inCorso.current = null; };
  /** Dove sta ora la voce: la posizione del suo elenco fra gli elenchi (`k`), il suo posto (`i`) e quante voci ha l'elenco (`n`). */
  const postoDi = (id: string) => {
    for (let k = 0; k < liste.length; k++) {
      const i = liste[k].ids.indexOf(id);
      if (i >= 0) return { k, i, n: liste[k].ids.length };
    }
    return null;
  };
  /** Esegue lo spostamento e, a salvataggio finito, rimette a fuoco la maniglia (la riga può essere stata rimontata). */
  const sposta = (id: string, lista: string, indice: number) => {
    void Promise.resolve(onSposta(id, lista, indice)).catch(() => undefined).finally(() => { daRifocalizzare.current = id; setGiro((g) => g + 1); });
  };
  /**
   * Fa partire il trascinamento della voce dalla sua maniglia (subito col mouse, dopo la pressione lunga col dito). Legge gli elenchi e
   * la maniglia correnti (`corrente`, `maniglie`): dal timer della pressione lunga quelli del disegno di 350 ms prima possono essere vecchi.
   */
  const avvia = (el: HTMLButtonElement, pointerId: number, y: number, id: string) => {
    const maniglia = maniglie.current.get(id) ?? el;
    try { maniglia.setPointerCapture?.(pointerId); } catch { /* senza cattura il rilascio fuori dalla maniglia lo chiude la perdita del puntatore */ }
    scorrevole.current = antenatoScorrevole(maniglia);
    ultimoY.current = y;
    inCorso.current = id;
    const elenchi = corrente.current;
    const k = elenchi.findIndex((l) => l.ids.includes(id));
    setTrascinato(id);
    setRilascio(k >= 0 ? { lista: elenchi[k].nome, indice: elenchi[k].ids.indexOf(id) } : null);
  };

  return {
    trascinato,
    rilascio,
    blocco,
    /** La maniglia col dito chiede la pressione lunga: lascia scorrere la pagina (`touch-pan-y`) invece di bloccarla subito. */
    pressioneLunga: true as const,
    riga: (id: string) => (el: HTMLElement | null) => { if (el) righe.current.set(id, el); else righe.current.delete(id); },
    lista: (nome: string) => (el: HTMLElement | null) => { if (el) contenitori.current.set(nome, el); else contenitori.current.delete(nome); },
    rifManiglia: (id: string) => (el: HTMLButtonElement | null) => {
      const prima = maniglie.current.get(id);
      if (prima) prima.removeEventListener('touchmove', bloccaScorrimento);
      if (el) { maniglie.current.set(id, el); el.addEventListener('touchmove', bloccaScorrimento, { passive: false }); } else maniglie.current.delete(id);
    },
    maniglia: (id: string) => ({
      onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
        // solo il tasto principale (o il dito): il destro apre il menu, non trascina
        if (bloccato || e.button !== 0) return;
        const el = e.currentTarget;
        if (e.pointerType !== 'mouse') {
          // col dito (o la penna) si aspetta la pressione lunga ferma: intanto la pagina può scorrere e un tocco non sposta niente.
          // Limite noto: la penna non genera `touchmove`, quindi a trascinamento partito lo scorrimento non si ferma come col dito.
          annullaAttesa();
          const { pointerId, clientX: x, clientY: y } = e;
          ultimoY.current = y;
          attesa.current = { x, y, timer: window.setTimeout(() => {
            attesa.current = null;
            // nei 350 ms il riordino può essersi fermato (si sta salvando un altro spostamento): allora niente trascinamento
            if (bloccatoOra.current) return;
            navigator.vibrate?.(15);
            avvia(el, pointerId, ultimoY.current, id);
          }, PRESSIONE_LUNGA_MS) };
          return;
        }
        e.preventDefault();
        avvia(el, e.pointerId, e.clientY, id);
      },
      onPointerMove: (e: PointerEvent<HTMLButtonElement>) => {
        const a = attesa.current;
        if (a) {
          // il dito si è mosso prima della pressione lunga: è uno scorrimento, non un trascinamento
          if (Math.abs(e.clientX - a.x) > TOLLERANZA_PRESSIONE || Math.abs(e.clientY - a.y) > TOLLERANZA_PRESSIONE) annullaAttesa();
          else ultimoY.current = e.clientY;
          return;
        }
        if (trascinato !== id) return;
        ultimoY.current = e.clientY;
        const r = scorrevole.current?.getBoundingClientRect();
        const alto = r ? r.top : 0;
        const basso = r ? r.bottom : window.innerHeight;
        velocita.current = e.clientY < alto + BORDO_SCORRIMENTO ? -PASSO_SCORRIMENTO : e.clientY > basso - BORDO_SCORRIMENTO ? PASSO_SCORRIMENTO : 0;
        imposta(e.clientY);
      },
      onPointerUp: () => {
        // dito alzato prima della pressione lunga: era un tocco, niente da spostare
        if (attesa.current) { annullaAttesa(); return; }
        const p = postoDi(id);
        const dove = rilascio;
        const cambia = trascinato === id && p !== null && dove !== null && (dove.lista !== liste[p.k].nome || dove.indice !== p.i);
        fine();
        if (cambia && dove) sposta(id, dove.lista, dove.indice);
      },
      // annullato dal browser (lo scorrimento della pagina è partito): niente attesa né trascinamento
      onPointerCancel: () => { annullaAttesa(); fine(); },
      // la cattura può perdersi senza pointerup (finestra che perde il fuoco…): il trascinamento finisce lì
      onLostPointerCapture: () => { if (trascinato === id) fine(); },
      // la pressione lunga non apre il menu contestuale del browser sulla maniglia
      onContextMenu: (e: MouseEvent<HTMLButtonElement>) => { if (attesa.current || trascinato === id) e.preventDefault(); },
      onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => {
        if (e.key === 'Escape' && trascinato === id) { e.preventDefault(); fine(); return; }
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        e.preventDefault();
        const p = postoDi(id);
        if (bloccato || !p) return;
        if (e.key === 'ArrowUp') {
          if (p.i > 0) sposta(id, liste[p.k].nome, p.i - 1);
          else if (p.k > 0) sposta(id, liste[p.k - 1].nome, liste[p.k - 1].ids.length);
        } else if (p.i < p.n - 1) sposta(id, liste[p.k].nome, p.i + 1);
        else if (p.k < liste.length - 1) sposta(id, liste[p.k + 1].nome, 0);
      },
    }),
  };
}

export type RiordinoCollegato = ReturnType<typeof useRiordinoCollegato>;
