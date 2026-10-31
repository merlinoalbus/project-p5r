// ============================================================
// MenuVoce — i comandi di una voce della giornata (azione, cosa da fare, evento): Modifica ed Elimina a vista, il resto in un menu a tendina
// ============================================================
//
// C9 (2026-10-31, richiesta dell'utente: «mi servirebbe che la matitina modifica fosse direttamente disponibile accanto al pulsante che
// apre le opzioni di menu. le opzioni di menu preferisco vengano visualizzate sopra rispetto a sotto la voce... o addirittura con un menu
// a tendina. Oltre la matitina vorrei ci fosse anche il pulsantino elimina direttamente»):
// - **Modifica** (matita) ed **Elimina** (cestino) sono pulsanti a icona accanto al «⋯», 44 px, con il testo della voce nel nome accessibile
//   e il `title`. Fanno lo stesso gesto che facevano dal menu (`GestoVoce` con chiave `modifica` / `elimina`, scritto una volta sola in
//   `GiornoGuida`): un solo percorso, con la stessa conferma dell'eliminazione. Usciti dal menu, non ci restano due volte.
// - Il «⋯» apre gli **altri gesti** (Seleziona, Copia, Taglia, Incolla qui, Salva negli appunti fissi, Sposta su/giù, Sposta di fascia) in
//   un **menu a tendina** ancorato al pulsante: sta sopra il contenuto (in un portale, posizione fissa), non sposta la voce né la pagina, si
//   apre verso il basso se ci sta e altrimenti verso l'alto (dove c'è più spazio, con lo scorrimento interno solo se nemmeno lì ci sta) e
//   resta dentro lo schermo anche sul telefono. Segue la pagina che scorre.
// - Accessibilità (pattern «menu button» di WAI-ARIA): `aria-haspopup="menu"`, `aria-expanded`, `aria-controls`; il menu è `role="menu"`
//   con voci `menuitem` (Seleziona, che si accende e si spegne, è `menuitemcheckbox` con `aria-checked`). All'apertura il fuoco va alla
//   prima voce (all'ultima con Freccia su sul pulsante); frecce, Home e Fine si muovono fra le voci; Esc chiude e ridà il fuoco al «⋯»;
//   Tab chiude e prosegue dal «⋯»; un tocco fuori chiude senza spostare il fuoco. Una voce che chiude il menu lascia il fuoco al «⋯».
// - Nel rilascio (sola lettura) non c'è niente di tutto questo: `ComandiVoce` è uno strumento di modifica (costante di build) e il suo
//   codice esce dal bundle.
// ============================================================

import { useEffect, useId, useLayoutEffect, useRef, type HTMLAttributes, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { PulsanteVisivo, type TonoPulsante } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

export interface GestoVoce {
  chiave: string;
  titolo: string;
  icona: ReactNode;
  onClick: () => void;
  tono?: TonoPulsante;
  /** Un interruttore («Seleziona» la voce): acceso, tono primario e `aria-checked` (voce `menuitemcheckbox`). */
  premuto?: boolean;
  /** Il suggerimento al passaggio del puntatore (`title`), quando il titolo da solo non basta. Sul tocco non si vede: ciò che informa sta
   *  nel titolo («Taglia (3)»). */
  descrizione?: string;
}

/**
 * La selezione di una riga del Diario (appunti del Diario, 2026-10-26): se è selezionata o tagliata e i gestori del puntatore (clic,
 * Ctrl+clic, Maiusc+clic col mouse). Assente nel rilascio. Lo stato si dice anche al lettore di schermo (`TestoSelezioneRiga`).
 */
export interface SelezioneRiga {
  selezionata: boolean;
  inTaglio: boolean;
  gestori: Pick<HTMLAttributes<HTMLLIElement>, 'onClick' | 'onMouseDown' | 'onPointerDown'>;
}
/** Lo stato della riga per il lettore di schermo, solo quando c'è. */
export function TestoSelezioneRiga({ s }: { s: SelezioneRiga | undefined }) {
  if (!s || (!s.selezionata && !s.inTaglio)) return null;
  return <span className="sr-only">{s.selezionata ? ' (selezionata)' : ''}{s.inTaglio ? ' (tagliata: si sposta incollando)' : ''}</span>;
}

/** I gesti che stanno a vista accanto al «⋯», fuori dal menu. */
const A_VISTA = new Set(['modifica', 'elimina']);
/** Le voci del menu che ricevono il fuoco con le frecce. */
const VOCI_MENU = '[role="menuitem"], [role="menuitemcheckbox"]';
/** Distanza minima del menu dai bordi dello schermo e stacco dal pulsante, in px. */
const MARGINE = 8;
const STACCO = 4;
/** Sotto quest'altezza disponibile il menu non si stringe oltre (scorre al suo interno). */
const ALTEZZA_MINIMA = 132;

interface Props {
  /** Testo della voce, per i nomi accessibili. */
  voce: string;
  /** Identità della voce: chi sposta la voce ritrova il suo menu (`data-voce`) e ci rimette il fuoco. */
  uid: string;
  gesti: GestoVoce[];
  aperto: boolean;
  onCambia: (aperto: boolean) => void;
  disabled?: boolean;
}

/** Modifica, Elimina e «⋯» con il menu a tendina degli altri gesti. Nel rilascio non esiste (costante di build). */
export const ComandiVoce: StrumentoDiModifica<typeof ComandiVoceReale> = IN_RILASCIO ? NienteInRilascio : ComandiVoceReale;

function ComandiVoceReale({ voce, uid, gesti, aperto, onCambia, disabled }: Props) {
  const breve = voce.slice(0, 60);
  const modifica = gesti.find((g) => g.chiave === 'modifica');
  const elimina = gesti.find((g) => g.chiave === 'elimina');
  const nelMenu = gesti.filter((g) => !A_VISTA.has(g.chiave));
  const pulsante = useRef<HTMLButtonElement | null>(null);
  const idMenu = useId();
  /** Dove va il fuoco all'apertura: la prima voce (clic, Invio, Freccia giù) o l'ultima (Freccia su). */
  const fuocoIniziale = useRef<'prima' | 'ultima'>('prima');
  /** Chiudendo il menu il fuoco torna al «⋯» se è rimasto senza posto; non dopo un tocco fuori, dove è andato dove si è toccato. */
  const rimettiFuoco = useRef(true);
  const eraAperto = useRef(aperto);
  useEffect(() => {
    if (eraAperto.current && !aperto && rimettiFuoco.current) {
      // la voce del menu toccata è sparita con il menu: il fuoco è caduto sul documento e torna al «⋯» (WCAG 2.4.3); se una finestra o un
      // altro comando lo ha già preso, resta lì
      const ora = document.activeElement;
      if ((!ora || ora === document.body) && pulsante.current && !pulsante.current.disabled) pulsante.current.focus();
    }
    eraAperto.current = aperto;
    rimettiFuoco.current = true;
  }, [aperto]);

  /** Chiude il menu; con `fuoco` lo rimette subito sul «⋯» (Esc, Tab). */
  const chiudi = (fuoco: boolean) => {
    if (!fuoco) rimettiFuoco.current = false;
    onCambia(false);
    if (fuoco) pulsante.current?.focus();
  };

  return (
    <span className="comandi-voce">
      {modifica && (
        <button type="button" className="btn btn-sm btn-ghost touch shrink-0" disabled={disabled} aria-label={`Modifica: ${breve}`} title={modifica.descrizione ?? 'Modifica la voce'}
          onClick={modifica.onClick}>
          <span aria-hidden="true" className="inline-flex">{modifica.icona}</span>
        </button>
      )}
      {elimina && (
        <button type="button" className="btn btn-sm btn-ghost touch shrink-0 comandi-voce__elimina" disabled={disabled} aria-label={`Elimina: ${breve}`} title={elimina.descrizione ?? 'Elimina la voce'}
          onClick={elimina.onClick}>
          <span aria-hidden="true" className="inline-flex">{elimina.icona}</span>
        </button>
      )}
      {nelMenu.length > 0 && (
        // `data-menu-voce`: chi chiude il menu da un suo gesto (Copia, Taglia, Incolla qui, Esc) o chi incolla ci rimette il fuoco
        <button ref={pulsante} type="button" data-menu-voce="" className={`btn btn-sm touch shrink-0 ${aperto ? 'btn-primary' : 'btn-ghost'}`} disabled={disabled}
          aria-haspopup="menu" aria-expanded={aperto} aria-controls={aperto ? idMenu : undefined} aria-label={`Altre azioni per: ${breve}`} title="Altre azioni"
          onClick={() => { fuocoIniziale.current = 'prima'; if (aperto) chiudi(false); else onCambia(true); }}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
            e.preventDefault();
            fuocoIniziale.current = e.key === 'ArrowUp' ? 'ultima' : 'prima';
            if (!aperto) { onCambia(true); return; }
            const voci = [...(document.getElementById(idMenu)?.querySelectorAll<HTMLElement>(VOCI_MENU) ?? [])];
            (e.key === 'ArrowUp' ? voci[voci.length - 1] : voci[0])?.focus();
          }}>
          <IconaAzione chiave="dettagli" dimensione={20} />
        </button>
      )}
      {aperto && nelMenu.length > 0 && (
        <MenuGesti id={idMenu} uid={uid} gesti={nelMenu} etichetta={`Altre azioni per: ${breve}`} ancora={pulsante} disabled={disabled}
          fuocoIniziale={fuocoIniziale} onChiudi={chiudi} />
      )}
    </span>
  );
}

/**
 * Mette il menu sotto il pulsante se ci sta, altrimenti dalla parte con più spazio; allineato al bordo destro del pulsante e dentro lo
 * schermo. Se nemmeno dalla parte migliore ci sta, l'altezza si ferma lì e il menu scorre al suo interno (contenuto: non trascina la pagina).
 */
function collocaMenu(menu: HTMLElement | null, ancora: HTMLElement | null) {
  if (!menu || !ancora) return;
  const r = ancora.getBoundingClientRect();
  const larghezzaVista = document.documentElement.clientWidth || window.innerWidth;
  const altezzaVista = window.visualViewport?.height ?? window.innerHeight;
  // l'altezza naturale si misura togliendo il limite, che riporterebbe in cima lo scorrimento interno del menu: lo si conserva e lo si
  // rimette dopo aver riapplicato il limite (rilievo della verifica: altrimenti le voci in fondo di un menu che scorre non si raggiungono)
  const scorrimento = menu.scrollTop;
  menu.style.maxHeight = '';
  const altezza = menu.offsetHeight;
  const larghezza = menu.offsetWidth;
  const sotto = altezzaVista - r.bottom - STACCO - MARGINE;
  const sopra = r.top - STACCO - MARGINE;
  const giu = altezza <= sotto || sotto >= sopra;
  const spazio = Math.max(giu ? sotto : sopra, ALTEZZA_MINIMA);
  const finale = Math.min(altezza, spazio);
  if (altezza > spazio) menu.style.maxHeight = `${spazio}px`;
  menu.style.top = `${Math.max(MARGINE, giu ? r.bottom + STACCO : r.top - STACCO - finale)}px`;
  menu.style.left = `${Math.max(MARGINE, Math.min(r.right - larghezza, larghezzaVista - larghezza - MARGINE))}px`;
  menu.dataset.verso = giu ? 'giu' : 'su';
  if (scorrimento) menu.scrollTop = scorrimento;
}

interface PropsMenu {
  id: string;
  uid: string;
  gesti: GestoVoce[];
  etichetta: string;
  ancora: RefObject<HTMLButtonElement | null>;
  disabled?: boolean;
  /** Dove va il fuoco all'apertura (letto una volta, alla comparsa del menu). */
  fuocoIniziale: RefObject<'prima' | 'ultima'>;
  onChiudi: (fuoco: boolean) => void;
}

/** Il menu a tendina dei gesti, in un portale sopra la pagina. */
function MenuGesti({ id, uid, gesti, etichetta, ancora, disabled, fuocoIniziale, onChiudi }: PropsMenu) {
  const menu = useRef<HTMLDivElement | null>(null);
  const chiudi = useRef(onChiudi);
  useLayoutEffect(() => { chiudi.current = onChiudi; });

  // a ogni disegno (la voce si è spostata, un gesto è cambiato) il menu si rimette al suo posto, prima che si veda
  useLayoutEffect(() => { collocaMenu(menu.current, ancora.current); });

  // la pagina (o l'area interna) che scorre, la finestra che cambia misura o la tastiera del telefono: il menu segue il pulsante.
  // Lo scorrimento del menu stesso (in cattura arriva anche quello) non sposta il pulsante: si ignora
  useEffect(() => {
    let attesa = 0;
    const segui = (e?: Event) => {
      if (e?.type === 'scroll' && e.target instanceof Node && menu.current?.contains(e.target)) return;
      if (!attesa) attesa = requestAnimationFrame(() => { attesa = 0; collocaMenu(menu.current, ancora.current); });
    };
    window.addEventListener('scroll', segui, { capture: true, passive: true });
    window.addEventListener('resize', segui);
    window.visualViewport?.addEventListener('resize', segui);
    return () => {
      cancelAnimationFrame(attesa);
      window.removeEventListener('scroll', segui, { capture: true });
      window.removeEventListener('resize', segui);
      window.visualViewport?.removeEventListener('resize', segui);
    };
  }, [ancora]);

  // all'apertura il fuoco va alla prima voce (o all'ultima); un tocco fuori da menu e pulsante chiude senza spostare il fuoco
  useEffect(() => {
    const voci = menu.current?.querySelectorAll<HTMLElement>(VOCI_MENU);
    if (voci?.length) (fuocoIniziale.current === 'ultima' ? voci[voci.length - 1] : voci[0]).focus({ preventScroll: true });
    const fuori = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menu.current?.contains(t) && !ancora.current?.contains(t)) chiudi.current(false);
    };
    document.addEventListener('pointerdown', fuori, true);
    return () => document.removeEventListener('pointerdown', fuori, true);
  }, [ancora, fuocoIniziale]);

  /** Frecce, Home e Fine fra le voci (in giro); Esc chiude col fuoco al «⋯»; Tab chiude e prosegue dal «⋯». */
  const tasti = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onChiudi(true); return; }
    // il fuoco torna al «⋯» e il Tab, che non si ferma, prosegue da lì (avanti o indietro)
    if (e.key === 'Tab') { onChiudi(true); return; }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key) || !menu.current) return;
    const voci = [...menu.current.querySelectorAll<HTMLElement>(VOCI_MENU)];
    if (voci.length === 0) return;
    e.preventDefault();
    const i = voci.indexOf(document.activeElement as HTMLElement);
    const prossima = e.key === 'Home' ? 0 : e.key === 'End' ? voci.length - 1
      : e.key === 'ArrowDown' ? (i + 1) % voci.length : (i - 1 + voci.length) % voci.length;
    voci[prossima].focus();
  };

  return createPortal(
    <div ref={menu} id={id} role="menu" aria-label={etichetta} data-voce={uid} className="menu-voce" onKeyDown={tasti}>
      {gesti.map((g) => (
        <PulsanteVisivo key={g.chiave} compatto tono={g.premuto ? 'primario' : g.tono ?? 'fantasma'} icona={g.icona} titolo={g.titolo} title={g.descrizione}
          role={g.premuto === undefined ? 'menuitem' : 'menuitemcheckbox'} aria-checked={g.premuto === undefined ? undefined : g.premuto} tabIndex={-1}
          // fermo mentre la giornata salva (dopo «Sposta su» il menu resta aperto): la voce resta raggiungibile con le frecce e lo dice
          aria-disabled={disabled || undefined} onClick={() => { if (!disabled) g.onClick(); }} />
      ))}
    </div>,
    document.body,
  );
}
