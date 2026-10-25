// ============================================================
// MenuModifica — gli strumenti di modifica di una scheda, raccolti dietro un solo pulsante «Modifica ⋯» (lotto B, punto 6)
// ============================================================
//
// Sul Confidente il primo pulsante pieno era «Modifica informazioni», sull'Oggetto «Modifica | Elimina» venivano prima dell'effetto, e
// sul telefono la prima schermata del Palazzo era fatta di quattro comandi di modifica. In partita la scheda serve a giocare: l'azione di
// gioco è il pulsante primario, e gli strumenti per correggere la guida stanno qui, uno sotto l'altro.
//
// **Un menu e non una «modalità Modifica».** Una modalità cambia tutta la pagina e va ricordata (entrare, uscire, sapere in quale si
// è); qui gli strumenti sono pochi e ognuno apre già la sua finestra o il suo modulo: un menu li toglie di mezzo senza aggiungere uno
// stato alla pagina, e chi corregge la guida ci arriva con un tocco in più. I comandi contestuali (la matita di un regalo, di un
// dialogo) restano accanto al dato.
//
// Accessibilità: è un riquadro a comparsa (pulsante con `aria-expanded` e `aria-controls`), non un `role="menu"`: le voci sono pulsanti
// normali che si raggiungono con Tab (e con le frecce). All'apertura il fuoco va alla prima voce; Esc chiude e ridà il fuoco al
// pulsante; un tocco fuori o il fuoco che esce chiudono. Scelta una voce, il riquadro si chiude e il fuoco torna al pulsante, così la
// finestra che la voce apre, alla chiusura, ridà il fuoco a un elemento visibile.
// **Le voci restano montate anche a riquadro chiuso** (`hidden`): una voce come `ModificaGuida` porta con sé la sua finestra, che
// smontando il menu sparirebbe mentre la si usa.
// ============================================================

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { PulsanteVisivo } from './PulsanteVisivo';
import { IconaAzione } from './IconaAzione';
import { NienteInRilascio, type StrumentoDiModifica } from './SoloPreparazione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

/** Gli elementi del riquadro che ricevono il fuoco. */
const VOCI = 'button:not([disabled]), a[href]';

interface Props {
  /** Le voci: `PulsanteVisivo` (tono fantasma, compatto) o componenti che ne disegnano uno (`ModificaGuida`). */
  children: ReactNode;
  /** Che cosa si modifica, per il nome accessibile del pulsante («Modifica: il Confidente «Takemi»»). */
  cosa: string;
  /** Da che lato si apre il riquadro rispetto al pulsante (default: allineato al bordo destro). */
  allinea?: 'destra' | 'sinistra';
  /** Classi del pulsante (es. `btn-visivo--icona-lg`, solo icona da 1024 px nelle righe misurate al pixel). */
  classePulsante?: string;
  className?: string;
}

/** Pulsante «Modifica ⋯» con il riquadro degli strumenti di modifica. */
// L12 (passo 8): nel rilascio (sola lettura) il menu «Modifica ⋯» non esiste, con tutte le voci che porta; la condizione è costante di build
// e `MenuModificaReale` esce dal bundle. Tutti i suoi usi contengono solo strumenti di modifica (le azioni di gioco stanno fuori dal menu).
export const MenuModifica: StrumentoDiModifica<typeof MenuModificaReale> = IN_RILASCIO ? NienteInRilascio : MenuModificaReale;
function MenuModificaReale({ children, cosa, allinea = 'destra', classePulsante = '', className = '' }: Props) {
  const [aperto, setAperto] = useState(false);
  const radice = useRef<HTMLDivElement | null>(null);
  const pulsante = useRef<HTMLButtonElement | null>(null);
  const riquadro = useRef<HTMLDivElement | null>(null);
  const id = useId();

  // un tocco fuori chiude (senza spostare il fuoco: è andato dove l'utente ha toccato)
  useEffect(() => {
    if (!aperto) return;
    const fuori = (e: PointerEvent) => { if (!radice.current?.contains(e.target as Node)) setAperto(false); };
    document.addEventListener('pointerdown', fuori);
    return () => document.removeEventListener('pointerdown', fuori);
  }, [aperto]);

  // all'apertura il fuoco va alla prima voce
  useEffect(() => {
    if (aperto) riquadro.current?.querySelector<HTMLElement>(VOCI)?.focus();
  }, [aperto]);

  /** Chiude il riquadro e ridà il fuoco al pulsante. */
  const chiudi = () => { setAperto(false); pulsante.current?.focus(); };

  /** Esc chiude; frecce, Home e Fine si muovono fra le voci. */
  const tasti = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!aperto) return;
    if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); chiudi(); return; }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key) || !riquadro.current) return;
    const voci = [...riquadro.current.querySelectorAll<HTMLElement>(VOCI)];
    if (voci.length === 0) return;
    e.preventDefault();
    const i = voci.indexOf(document.activeElement as HTMLElement);
    const prossima = e.key === 'Home' ? 0 : e.key === 'End' ? voci.length - 1
      : e.key === 'ArrowDown' ? (i + 1) % voci.length : (i - 1 + voci.length) % voci.length;
    voci[prossima].focus();
  };

  return (
    <div ref={radice} className={`menu-modifica ${className}`} onKeyDown={tasti}
      // il fuoco che esce dal menu (Tab oltre l'ultima voce) lo chiude
      onBlur={(e) => { if (aperto && e.relatedTarget && !radice.current?.contains(e.relatedTarget as Node)) setAperto(false); }}>
      <PulsanteVisivo ref={pulsante} tono="fantasma" compatto className={classePulsante} icona={<IconaAzione chiave="modifica" dimensione={20} />}
        titolo={<>Modifica <span aria-hidden="true">⋯</span></>} aria-label={`Modifica: ${cosa}`} title={`Modifica ${cosa}`}
        aria-expanded={aperto} aria-controls={id} onClick={() => setAperto((a) => !a)} />
      {/* scelta una voce (il clic arriva qui dopo il suo gestore) il riquadro si chiude e il fuoco torna al pulsante. Solo i clic che
          stanno davvero nel riquadro (DOM): React fa risalire fin qui anche quelli dentro la finestra in portale che una voce apre, e
          chiudere per quelli riportava il fuoco sul pulsante, dietro la finestra, fuori dalla sua trappola del fuoco */}
      <div ref={riquadro} id={id} hidden={!aperto} className={`menu-modifica__voci ${allinea === 'sinistra' ? 'menu-modifica__voci--sinistra' : ''}`}
        onClick={(e) => { const t = e.target as Element; if (riquadro.current?.contains(t) && t.closest(VOCI)) chiudi(); }}>
        {children}
      </div>
    </div>
  );
}
