// ============================================================
// Modal — finestra di dialogo, chiusura con Esc o con la X, fuoco tenuto dentro la finestra
// ============================================================
//
// Lo sfondo non chiude (segnalazione e scelta dell'utente, 2026-10-17: «a volte quando con il mouse seleziono del testo
// nelle aree di testo o caselle di testo scompare la modale (annullando tutte le modifiche in essa contenute)»). Una
// selezione premuta in un campo e rilasciata fuori dalla finestra arriva come clic all'antenato comune, cioè lo sfondo,
// che chiudeva la finestra e perdeva le modifiche. Si chiude solo con la X ed Esc.
//
// Renderizzata in un portal su <body>: così resta sopra a tutto anche quando il componente che la apre
// vive dentro un contenitore con opacity/transform/overflow (che creano un contesto di sovrapposizione
// e imprigionerebbero lo z-index, facendo finire la finestra sotto le card successive).
//
// Il fuoco (rilievo A5 della verifica completa, 2026-10-03): all'apertura va dentro la finestra (sul
// campo con `autoFocus` se c'è, altrimenti sulla finestra stessa, così su tablet e telefono non si apre
// la tastiera); Tab e Maiusc+Tab girano fra gli elementi della finestra invece di uscire sulla
// pagina sotto; alla chiusura torna all'elemento che l'aveva aperta (se non c'è più, alla finestra rimasta sotto o al contenuto
// della pagina, L13). Prima restava sulla pagina, e con
// la tastiera o un lettore di schermo la finestra si raggiungeva solo per caso.
//
// Spostabile (richiesta dell'utente, 2026-10-31: «rendi spostabile nello schermo anche la schermata "Modifica la voce della giornata"»,
// «in generale tutte le modali che si possono chiudere e hanno annulla/salva»): da 768 px in su ogni finestra (non il cassetto né le
// domande di conferma) si sposta trascinando la barra del titolo (eventi pointer: mouse, penna e dito) o con le frecce sulla maniglia ⠿,
// sempre per intero dentro lo schermo (anche quando la finestra o il suo contenuto cambiano misura). A ogni apertura riparte dal centro.
// Sul telefono resta il foglio dal basso, largo e alto quanto lo schermo: non c'è dove spostarlo.
// ============================================================

import { useEffect, useRef, useState, type KeyboardEvent as KeyboardEventReact, type PointerEvent as PointerEventReact, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconClose } from './icons';
import { useMedia } from '../../hooks/useMedia';

interface ModalProps {
  titolo: string;
  aperta: boolean;
  onChiudi: () => void;
  children: ReactNode;
  azioni?: ReactNode;
  larga?: boolean;
  /** Cassetto laterale: entra da destra, alto quanto lo schermo (sul telefono resta il foglio dal basso); scorre solo il suo corpo. */
  cassetto?: boolean;
  /** `alertdialog` per le domande che interrompono (DialogoConferma); default `dialog`. */
  ruolo?: 'dialog' | 'alertdialog';
  /** Id dell'elemento che descrive la finestra (`aria-describedby`): il testo della domanda, letto subito dopo il titolo. */
  idDescrizione?: string;
}

/** Gli elementi che ricevono il fuoco con Tab. */
const ATTIVABILI = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Gli elementi raggiungibili con Tab dentro il contenitore, in ordine di documento, esclusi quelli in zone `hidden` o `inert`. */
function attivabili(contenitore: HTMLElement): HTMLElement[] {
  return [...contenitore.querySelectorAll<HTMLElement>(ATTIVABILI)].filter((el) => !el.closest('[hidden], [inert]'));
}

// ---- Chi ha aperto la finestra ----
//
// Leggere `document.activeElement` all'apertura non basta: un campo con `autoFocus` prende il fuoco durante il montaggio, prima
// degli effetti, e molte finestre nascono già aperte (il genitore le monta e le smonta). Un registro unico, installato una volta,
// tiene gli ultimi due elementi che hanno avuto il fuoco o sono stati cliccati: all'apertura, se l'ultimo sta già dentro la
// finestra appena aperta (il suo `autoFocus`), chi l'ha aperta è il penultimo. Il clic (in cattura) serve anche a un documento
// senza il fuoco del sistema — una finestra in secondo piano — che sposta il fuoco senza generare `focusin`.
let ultimo: HTMLElement | null = null;
let penultimo: HTMLElement | null = null;
/** Fa scorrere il registro: l'elemento diventa l'ultimo, il precedente ultimo il penultimo (ignora body, non-HTML e ripetizioni). */
function registra(el: Element | null | undefined): void {
  if (!(el instanceof HTMLElement) || el === document.body || el === ultimo) return;
  penultimo = ultimo;
  ultimo = el;
}
if (typeof document !== 'undefined') {
  document.addEventListener('focusin', (e) => registra(e.target as Element | null), true);
  // dal clic si risale all'elemento attivabile (il pulsante, non l'icona dentro): è quello che apre la finestra
  document.addEventListener('click', (e) => registra((e.target as Element | null)?.closest?.(ATTIVABILI)), true);
}
/**
 * L'elemento a cui ridare il fuoco alla chiusura: l'ultimo registrato, oppure il penultimo se l'ultimo sta già dentro
 * la finestra (il suo campo con `autoFocus`); nessuno se anche il candidato sta dentro la finestra.
 */
function chiHaApertoLaFinestra(finestra: HTMLElement | null): HTMLElement | null {
  const candidato = ultimo && finestra?.contains(ultimo) ? penultimo : ultimo;
  return candidato && !finestra?.contains(candidato) ? candidato : null;
}

// ---- Lo spostamento ----

/** Lo spostamento della finestra dal posto in cui la mette il layout (centrata), in pixel. */
interface Spostamento { x: number; y: number }
const FERMA: Spostamento = { x: 0, y: 0 };
/** Il margine dal bordo dello schermo. */
const MARGINE = 8;
/** Il passo delle frecce sulla maniglia (con Maiusc, quattro volte tanto). */
const PASSO = 24;
/** Da quanti pixel un gesto sulla barra è un trascinamento e non un tocco. */
const SOGLIA_TRASCINAMENTO = 4;
/** Da dove la finestra si sposta: sotto (il foglio dal basso del telefono) resta ferma. */
const SPOSTABILE_DA = '(min-width: 768px)';

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
 * si ottiene il posto del layout. Lo schermo è quello dell'overlay (`position: fixed; inset: 0`), senza la barra di scorrimento.
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

/** Finestra modale con intestazione, corpo scorrevole e piè di pagina opzionale. */
export function Modal({ titolo, aperta, onChiudi, children, azioni, larga, cassetto, ruolo = 'dialog', idDescrizione }: ModalProps) {
  const finestra = useRef<HTMLDivElement | null>(null);
  const sfondo = useRef<HTMLDivElement | null>(null);

  // lo spostamento: solo le finestre (non il cassetto né le domande di conferma), da 768 px in su
  const largaAbbastanza = useMedia(SPOSTABILE_DA);
  const spostabile = largaAbbastanza && !cassetto && ruolo === 'dialog';
  const [spostamento, setSpostamento] = useState<Spostamento>(FERMA);
  type Gesto = { id: number; px: number; py: number; da: Spostamento; mosso: boolean };
  const gesto = useRef<Gesto | null>(null);
  const [trascina, setTrascina] = useState(false);
  // a ogni apertura la finestra riparte dal centro (lo stato si azzera durante il disegno, alla chiusura, anche a metà di un trascinamento)
  const [eraAperta, setEraAperta] = useState(aperta);
  if (eraAperta !== aperta) {
    setEraAperta(aperta);
    if (!aperta) { setSpostamento(FERMA); setTrascina(false); }
  }
  // sempre per intero nello schermo: quando cambiano lo schermo (ridimensionamento, rotazione) o la finestra (il contenuto cresce o cala)
  useEffect(() => {
    const el = finestra.current;
    if (!aperta || !spostabile || !el) return;
    const rimetti = () => setSpostamento((s) => {
      if (s.x === 0 && s.y === 0) return s;
      const n = nelloSchermo(el, s);
      return n.x === s.x && n.y === s.y ? s : n;
    });
    window.addEventListener('resize', rimetti);
    const osservatore = typeof ResizeObserver === 'function' ? new ResizeObserver(rimetti) : null;
    osservatore?.observe(el);
    return () => { window.removeEventListener('resize', rimetti); osservatore?.disconnect(); };
  }, [aperta, spostabile]);

  /** L'inizio del trascinamento dalla barra del titolo: non dai suoi comandi («Chiudi»). */
  const inizia = (e: PointerEventReact<HTMLDivElement>) => {
    const el = finestra.current;
    if (!spostabile || e.button !== 0 || !el) return;
    if ((e.target as Element).closest('button:not([data-maniglia]), a, input, select, textarea')) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    gesto.current = { id: e.pointerId, px: e.clientX, py: e.clientY, da: applicato(el), mosso: false };
  };
  const muovi = (e: PointerEventReact<HTMLDivElement>) => {
    const g = gesto.current;
    const el = finestra.current;
    if (!g || g.id !== e.pointerId || !el) return;
    const dx = e.clientX - g.px, dy = e.clientY - g.py;
    if (!g.mosso && Math.hypot(dx, dy) < SOGLIA_TRASCINAMENTO) return;
    if (!g.mosso) { g.mosso = true; setTrascina(true); }
    e.preventDefault();
    setSpostamento(nelloSchermo(el, { x: g.da.x + dx, y: g.da.y + dy }));
  };
  const finisci = (e: PointerEventReact<HTMLDivElement>) => {
    const g = gesto.current;
    if (!g || g.id !== e.pointerId) return;
    gesto.current = null;
    setTrascina(false);
  };
  /** Le frecce sulla maniglia ⠿: spostano di un passo (con Maiusc di quattro). */
  const frecce = (e: KeyboardEventReact<HTMLButtonElement>) => {
    const passo = e.shiftKey ? PASSO * 4 : PASSO;
    const d = ({ ArrowLeft: [-passo, 0], ArrowRight: [passo, 0], ArrowUp: [0, -passo], ArrowDown: [0, passo] } as Record<string, [number, number]>)[e.key];
    const el = finestra.current;
    if (!d || !el) return;
    e.preventDefault();
    const s = applicato(el);
    setSpostamento(nelloSchermo(el, { x: s.x + d[0], y: s.y + d[1] }));
  };
  // `onChiudi` è spesso una funzione scritta al volo: la si legge da un ref, così gli effetti dipendono solo da `aperta`
  // e il fuoco non viene rimesso a posto a ogni render della pagina che apre la finestra
  const chiudi = useRef(onChiudi);
  useEffect(() => { chiudi.current = onChiudi; });

  useEffect(() => {
    if (!aperta) return;
    /** Esc chiude la finestra, ma solo quella più in alto: con una finestra aperta sopra un'altra (le note sopra il cassetto del
     *  Confidente) un solo Esc chiudeva tutte e due. Le finestre si aggiungono in fondo a <body>: la più in alto è l'ultima. */
    const onKey = (e: KeyboardEvent) => {
      // un Esc già usato da un controllo della finestra (la tendina aperta di un Selettore, che lo segna con `preventDefault`) chiude
      // quel controllo e non la finestra: il primo Esc chiude la tendina, il secondo la finestra
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      const aperte = document.querySelectorAll('.modal-overlay');
      if (aperte.length > 0 && aperte[aperte.length - 1] !== sfondo.current) return;
      chiudi.current();
    };
    window.addEventListener('keydown', onKey);
    // Blocca lo scorrimento della pagina sotto la finestra (ripristinato alla chiusura).
    const overflowPrecedente = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflowPrecedente;
    };
  }, [aperta]);

  // Il fuoco entra nella finestra all'apertura e torna a chi l'ha aperta alla chiusura.
  useEffect(() => {
    if (!aperta) return;
    const el = finestra.current;
    const daRidare = chiHaApertoLaFinestra(el);
    // un campo con `autoFocus` l'ha già preso (React lo dà prima degli effetti): si lascia dov'è. Altrimenti il fuoco va sulla
    // finestra stessa, non sul primo campo: su tablet e telefono un campo con il fuoco apre la tastiera a ogni apertura
    if (el && !el.contains(document.activeElement)) el.focus();
    return () => {
      // solo a finestra davvero chiusa: nello smontaggio simulato di React StrictMode (sviluppo) la finestra è ancora nel
      // documento, e ridare il fuoco al pulsante lì faceva perdere il campo con `autoFocus` al rimontaggio
      if (el?.isConnected) return;
      if (daRidare && daRidare.isConnected) { daRidare.focus(); return; }
      // chi l'ha aperta non c'è più (L13, revisione R2: il pulsante «Da approvare · N» sparisce con l'elenco vuoto): il fuoco non resta perso su
      // <body>, va alla finestra rimasta sotto (la più in alto) o al contenuto della pagina; mai se qualcosa l'ha già preso
      const attivo = document.activeElement;
      if (attivo && attivo !== document.body && attivo.isConnected) return;
      const sotto = [...document.querySelectorAll<HTMLElement>('.modal-content')].pop() ?? document.getElementById('contenuto');
      sotto?.focus({ preventScroll: true });
    };
  }, [aperta]);

  /** Tab e Maiusc+Tab restano dentro la finestra: dall'ultimo elemento si torna al primo, e viceversa. */
  const tieniIlFuoco = (e: KeyboardEventReact<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !finestra.current) return;
    const elenco = attivabili(finestra.current);
    if (elenco.length === 0) { e.preventDefault(); return; }
    const primo = elenco[0];
    const ultimo = elenco[elenco.length - 1];
    const attivo = document.activeElement;
    if (e.shiftKey && (attivo === primo || attivo === finestra.current)) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && attivo === ultimo) { e.preventDefault(); primo.focus(); }
  };

  if (!aperta) return null;
  return createPortal(
    <div ref={sfondo} className={`modal-overlay ${cassetto ? 'modal-overlay--cassetto' : ''}`} role="presentation">
      <div
        ref={finestra}
        className={`modal-content ${larga ? 'modal-content--larga' : ''} ${cassetto ? 'modal-content--cassetto' : ''}`}
        role={ruolo}
        aria-modal="true"
        aria-label={titolo}
        aria-describedby={idDescrizione}
        tabIndex={-1}
        onKeyDown={tieniIlFuoco}
        style={spostabile && (spostamento.x !== 0 || spostamento.y !== 0) ? { translate: `${spostamento.x}px ${spostamento.y}px` } : undefined}
      >
        <div className={`modal-header ${spostabile ? 'modal-header--spostabile' : ''} ${trascina ? 'modal-header--trascina' : ''}`}
          onPointerDown={spostabile ? inizia : undefined} onPointerMove={spostabile ? muovi : undefined}
          onPointerUp={spostabile ? finisci : undefined} onPointerCancel={spostabile ? finisci : undefined}>
          <div className="flex min-w-0 items-center gap-1">
            {spostabile && (
              <button type="button" data-maniglia className="touch shrink-0 flex items-center justify-center bg-transparent border-none text-text-muted hover:text-text rounded-md -ml-2"
                aria-label="Sposta la finestra (frecce)" title="Trascina la barra per spostare la finestra, o usa le frecce" onKeyDown={frecce}>
                <span aria-hidden="true" className="testo-18 leading-none">⠿</span>
              </button>
            )}
            <h2 className="m-0 testo-17 font-semibold">{titolo}</h2>
          </div>
          <button type="button" className="touch flex items-center justify-center bg-transparent border-none text-text-muted hover:text-text cursor-pointer rounded-md" onClick={onChiudi} aria-label="Chiudi">
            <IconClose size={20} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {azioni && <div className="modal-footer">{azioni}</div>}
      </div>
    </div>,
    document.body,
  );
}
