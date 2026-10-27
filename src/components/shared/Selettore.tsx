// ============================================================
// Selettore — l'unico elenco chiuso dell'app
// ============================================================
//
// Al posto della tendina nativa: un pulsante che mostra etichetta e scelta, e quando lo apri un
// elenco a righe da 44 px. Da dieci voci in su compare un campo dove scrivi un pezzo del nome e
// l'elenco si restringe mentre scrivi (richiesta dell'utente: «ricerca in tutti i selettori con più
// di 10 voci», poi estesa «a tutti i selettori nell'app» per coerenza). Il testo scritto serve
// solo a filtrare — il valore è **sempre** una voce dell'elenco, mai quello che hai digitato.
//
// Le voci possono avere un gruppo (intestazione nell'elenco) e un dettaglio (in grigio a destra).
// `vuoto` aggiunge in testa la voce «nessuna scelta» con chiave ''. Da tastiera: frecce, Home/Fine, Invio, Esc, Tab.
//
// Accessibilità (WCAG 2.2, schema APG del combobox con listbox): il fuoco resta sul pulsante (o sul campo di ricerca) e la voce
// evidenziata è dichiarata con `aria-activedescendant`; le voci sono `option` senza pulsanti dentro, quindi Tab non le attraversa
// una a una e chiude la tendina. Il nome accessibile dice anche il valore quando l'etichetta non è visibile (selettore compatto).
//
// La tendina sta SOPRA il contenuto, mai dentro il suo scorrimento (segnalazione dell'utente, 2026-10-27, sulla finestra «Infiltrazioni
// della voce»: «questo è rotto... doppia barra di scorrimento verticale»). Prima era `position:absolute` dentro il pulsante: in una
// finestra o in un pannello allungava l'area scorrevole che la conteneva, e accanto alla barra dell'elenco compariva quella del corpo.
// Ora è `position:fixed`, collocata da `collocaTendina` rispetto al pulsante e dentro lo schermo: sotto il pulsante, oppure sopra se
// sotto non ci sta e sopra c'è più spazio; l'elenco si accorcia quanto serve a starci. Un elemento fisso non conta nello scorrimento di
// nessun antenato, quindi nessun contenitore si allunga né scorre: una barra sola, quella dell'elenco. Resta nel DOM del selettore (niente
// portale), così il fuoco tenuto nella finestra, il tocco fuori, Tab ed Esc funzionano come prima. Se il contenitore scorre la tendina
// segue il pulsante; se il pulsante esce dalla vista la tendina si chiude. Sul telefono (sotto 640 px) resta il foglio dal basso del CSS.
// ============================================================

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { LARGHEZZA_MASSIMA_TENDINA, LARGHEZZA_TENDINA, MEDIA_FOGLIO_TENDINA, SOGLIA_RICERCA, TETTO_VOCI } from '../../utils/selettore';
import { piatto } from '../../utils/testo';
import { testoNoteAParole } from '../../../shared/note';
import { TestoNote } from './TestoNote';

export interface OpzioneSelettore { chiave: string; nome: string; dettaglio?: string; gruppo?: string; testoRicerca?: string }

export interface PropsSelettore {
  etichetta: string;
  valore: string;
  opzioni: OpzioneSelettore[];
  onCambia: (chiave: string) => void;
  disabilitato?: boolean;
  /** Testo del pulsante quando non c'è ancora una scelta. */
  segnaposto?: string;
  /** La voce «nessuna scelta», con chiave ''. */
  vuoto?: string;
  /** `auto` = campo di ricerca da dieci voci in su; `sempre`; `mai`. */
  ricerca?: 'auto' | 'sempre' | 'mai';
  /** Stretto quanto il contenuto, senza l'etichetta sopra il valore: per i filtri in linea. */
  compatto?: boolean;
  /** LAY3-7: il nome accessibile del pulsante dice anche il valore scelto, intero («Infiltrazione 1 di 9: 1. Passaggio…»), per i
   *  selettori compatti il cui valore chiuso si accorcia coi puntini (l'elenco aperto mostra comunque i nomi interi).
   *  Dal lotto accessibilità vale già per ogni selettore `compatto` (l'etichetta non è visibile, il testo visibile è il valore: 2.5.3);
   *  per gli altri, che mostrano l'etichetta sopra il valore, il valore è nella descrizione accessibile. */
  valoreNelNome?: boolean;
  /** L13 (modelli comuni, 1): forma da CAMPO di modulo, a scelta del chiamante. Con `etichettaSopra` l'etichetta sta SOPRA il pulsante,
   *  come in ogni campo dell'app (`Campo`), e il pulsante ha bordo, fondo e altezza di un campo di testo: è per i selettori che stanno in
   *  una griglia di campi (finestre di modifica, form). Senza la prop resta la forma di sempre (maiuscoletto sopra il valore, dentro il
   *  pulsante), che non allunga le righe fitte, le barre di filtri e le righe di tabella. Il compatto non ha mai l'etichetta visibile e ignora la prop. */
  etichettaSopra?: boolean;
  /** Il messaggio d'errore del campo (modulo con la verifica dei campi): il pulsante diventa `aria-invalid` e il messaggio, scritto sotto, ne è
   *  la descrizione accessibile (3.3.1). Senza, nessun cambiamento. */
  errore?: string | null;
  className?: string;
}

/** Da che lato del pulsante si apre la tendina. */
type Verso = 'sotto' | 'sopra';
/** Distanza minima della tendina dai bordi dello schermo, in px. */
const MARGINE_SCHERMO = 8;
/** Stacco fra il pulsante e la tendina, in px. */
const STACCO = 2;
/** Altezza sotto cui l'elenco non si accorcia (due righe da 44 px): sotto, la tendina sporge piuttosto che diventare inusabile. */
const ALTEZZA_MINIMA_ELENCO = 88;

/** Vero se il rettangolo `r` di `el` è fuori dallo schermo o nascosto da un antenato che taglia il contenuto (scorrevole o con
 *  `overflow: hidden`): il corpo di una finestra scorso fin oltre il pulsante, per esempio. */
function fuoriVista(el: HTMLElement, r: DOMRect, larghezza: number, altezza: number): boolean {
  if (r.bottom <= 0 || r.top >= altezza || r.right <= 0 || r.left >= larghezza) return true;
  for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
    const stile = getComputedStyle(a);
    if (stile.overflowX === 'visible' && stile.overflowY === 'visible') continue;
    const c = a.getBoundingClientRect();
    if (r.bottom <= c.top || r.top >= c.bottom || r.right <= c.left || r.left >= c.right) return true;
  }
  return false;
}

/**
 * Colloca la tendina (`position: fixed`) rispetto al pulsante, dentro lo schermo: larga quanto il pulsante e almeno
 * `LARGHEZZA_TENDINA` (al più `LARGHEZZA_MASSIMA_TENDINA`), allineata a sinistra col pulsante o, se a destra non ci sta, al suo bordo
 * destro; sotto il pulsante o sopra, col lato `verso` dato oppure, se è `null`, scelto qui (sopra solo se sotto non ci sta e sopra c'è
 * più spazio). L'elenco si accorcia quanto serve a stare nello spazio di quel lato. Restituisce il lato usato, `'fuori'` se il pulsante
 * non è più in vista (la tendina va chiusa), `null` sul telefono, dove la colloca il CSS come foglio dal basso.
 */
function collocaTendina(pulsante: HTMLElement, tendina: HTMLElement, elenco: HTMLElement | null, verso: Verso | null): Verso | 'fuori' | null {
  const s = tendina.style;
  if (typeof window.matchMedia === 'function' && window.matchMedia(MEDIA_FOGLIO_TENDINA).matches) {
    s.left = ''; s.top = ''; s.bottom = ''; s.width = '';
    if (elenco) elenco.style.maxHeight = '';
    return null;
  }
  const r = pulsante.getBoundingClientRect();
  // la parte visibile della finestra del browser, senza la barra di scorrimento della pagina (se c'è)
  const larghezzaSchermo = document.documentElement.clientWidth || window.innerWidth;
  const altezzaSchermo = document.documentElement.clientHeight || window.innerHeight;
  // un pulsante senza misure (non disposto) non si giudica: si colloca e basta
  if ((r.width > 0 || r.height > 0) && fuoriVista(pulsante, r, larghezzaSchermo, altezzaSchermo)) return 'fuori';
  const larghezza = Math.max(0, Math.min(Math.max(r.width, LARGHEZZA_TENDINA), LARGHEZZA_MASSIMA_TENDINA, larghezzaSchermo - 2 * MARGINE_SCHERMO));
  const preferita = r.left + larghezza > larghezzaSchermo - MARGINE_SCHERMO ? r.right - larghezza : r.left;
  const sinistra = Math.max(MARGINE_SCHERMO, Math.min(preferita, larghezzaSchermo - MARGINE_SCHERMO - larghezza));
  // l'altezza naturale si misura alla larghezza vera (i nomi lunghi vanno a capo) e con l'elenco al tetto del CSS
  s.width = `${larghezza}px`;
  if (elenco) elenco.style.maxHeight = '';
  const naturale = tendina.offsetHeight;
  const spazioSotto = altezzaSchermo - r.bottom - STACCO - MARGINE_SCHERMO;
  const spazioSopra = r.top - STACCO - MARGINE_SCHERMO;
  const lato: Verso = verso ?? (naturale > spazioSotto && spazioSopra > spazioSotto ? 'sopra' : 'sotto');
  const spazio = lato === 'sopra' ? spazioSopra : spazioSotto;
  if (elenco && naturale > spazio) elenco.style.maxHeight = `${Math.max(ALTEZZA_MINIMA_ELENCO, elenco.offsetHeight - (naturale - spazio))}px`;
  // sopra si ancora col bordo inferiore: quando il filtro accorcia l'elenco, la tendina resta attaccata al pulsante
  let x = sinistra;
  let y = lato === 'sopra' ? altezzaSchermo - r.top + STACCO : r.bottom + STACCO;
  const applica = () => {
    s.left = `${x}px`;
    if (lato === 'sopra') { s.top = 'auto'; s.bottom = `${y}px`; } else { s.bottom = 'auto'; s.top = `${y}px`; }
  };
  applica();
  // Un antenato con `transform` fa da riferimento al posto dello schermo (l'animazione d'apertura di una finestra, il popup di un pin
  // dentro la mappa ingrandita): si misura dove è finita davvero e si corregge lo scarto, nella scala di quel riferimento (misure a
  // schermo divise per quelle di layout). Finita un'animazione la tendina si ricolloca (ascoltatore `animationend` del componente).
  const t = tendina.getBoundingClientRect();
  if (t.width > 0 && t.height > 0) {
    const scalaX = larghezza > 0 ? t.width / larghezza : 1;
    const scalaY = tendina.offsetHeight > 0 ? t.height / tendina.offsetHeight : 1;
    const dx = sinistra - t.left;
    const dy = lato === 'sopra' ? r.top - STACCO - t.bottom : r.bottom + STACCO - t.top;
    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
      x += dx / scalaX;
      y += (lato === 'sopra' ? -dy : dy) / scalaY;
      applica();
    }
  }
  return lato;
}

/**
 * Pulsante combobox con etichetta e voce scelta (o `segnaposto`) che apre una tendina con l'elenco delle voci,
 * eventualmente filtrabile; la scelta chiama `onCambia` con la chiave. L'elenco mostra al massimo `TETTO_VOCI`
 * voci (con l'invito a restringere se ce ne sono di più), filtra senza accenti su nome, dettaglio e gruppo, e si
 * chiude scegliendo, con Esc o toccando fuori.
 */
export function Selettore({ etichetta, valore, opzioni, onCambia, disabilitato, segnaposto = 'Scegli…', vuoto, ricerca = 'auto', compatto, valoreNelNome, etichettaSopra, errore, className }: PropsSelettore) {
  const [aperto, setAperto] = useState(false);
  const [testo, setTesto] = useState('');
  const [evidenziata, setEvidenziata] = useState(0);
  const id = useId();
  const radice = useRef<HTMLDivElement | null>(null);
  const pulsante = useRef<HTMLButtonElement | null>(null);
  const tendina = useRef<HTMLDivElement | null>(null);
  const elenco = useRef<HTMLUListElement | null>(null);
  /** Il lato scelto all'apertura: scorrendo o filtrando la tendina resta da quel lato, non salta da sopra a sotto a ogni lettera. */
  const verso = useRef<Verso | null>(null);
  /** Spazio gestito alla pressione: il rilascio non deve riattivare il pulsante (che riaprirebbe la tendina appena chiusa). */
  const spazioGestito = useRef(false);
  const tutte = useMemo(() => (vuoto === undefined ? opzioni : [{ chiave: '', nome: vuoto }, ...opzioni]), [opzioni, vuoto]);
  const scelta = tutte.find((o) => o.chiave === valore) ?? null;
  /** Il nome accessibile porta il valore quando il testo visibile è solo il valore (compatto: 2.5.3) o lo chiede il chiamante. */
  const nomeConValore = !!compatto || !!valoreNelNome;
  const conRicerca = ricerca === 'sempre' || (ricerca === 'auto' && tutte.length >= SOGLIA_RICERCA);

  const { filtrate, tagliate } = useMemo(() => {
    const q = conRicerca ? piatto(testo.trim()) : '';
    const base = q ? tutte.filter((o) => piatto(o.nome).includes(q) || (o.dettaglio ? piatto(o.dettaglio).includes(q) : false)
      || (o.gruppo ? piatto(o.gruppo).includes(q) : false) || (o.testoRicerca ? piatto(o.testoRicerca).includes(q) : false)) : tutte;
    return { filtrate: base.slice(0, TETTO_VOCI), tagliate: base.length > TETTO_VOCI };
  }, [tutte, testo, conRicerca]);

  /** Indice della voce evidenziata, riportato dentro l'elenco filtrato (-1 se l'elenco è vuoto). */
  const attiva = filtrate.length === 0 ? -1 : Math.min(evidenziata, filtrate.length - 1);
  const idVoce = (i: number) => `${id}-voce-${i}`;
  const idValore = `${id}-valore`;
  const idErrore = `${id}-errore`;
  const descrizione = [nomeConValore ? null : idValore, errore ? idErrore : null].filter(Boolean).join(' ') || undefined;

  /** Apre la tendina con il filtro vuoto e la voce scelta evidenziata (dove collocarla lo decide `colloca`, prima che si veda). */
  const apri = () => {
    setTesto('');
    setEvidenziata(Math.max(0, tutte.findIndex((o) => o.chiave === valore)));
    setAperto(true);
  };
  useEffect(() => {
    if (!aperto) return;
    /** Un tocco fuori dal selettore chiude la tendina. */
    const fuori = (e: PointerEvent) => { if (radice.current && !radice.current.contains(e.target as Node)) setAperto(false); };
    document.addEventListener('pointerdown', fuori);
    return () => document.removeEventListener('pointerdown', fuori);
  }, [aperto]);

  /** Chiude la tendina e riporta il fuoco sul pulsante. */
  const chiudi = () => { setAperto(false); pulsante.current?.focus(); };
  /** Comunica la voce scelta e chiude. */
  const scegli = (chiave: string) => { onCambia(chiave); chiudi(); };
  /**
   * Colloca la tendina aperta (vedi `collocaTendina`): con `decidi` sceglie di nuovo il lato, altrimenti tiene quello dell'apertura.
   * Se il pulsante è uscito dalla vista chiude la tendina, e il fuoco che stava nel suo campo di ricerca torna sul pulsante.
   */
  const colloca = useCallback((decidi: boolean) => {
    if (!pulsante.current || !tendina.current) return;
    const esito = collocaTendina(pulsante.current, tendina.current, elenco.current, decidi ? null : verso.current);
    if (esito !== 'fuori') { verso.current = esito; return; }
    if (tendina.current.contains(document.activeElement)) pulsante.current.focus({ preventScroll: true });
    setAperto(false);
  }, []);
  // Prima che la tendina si veda (effetto di layout, nessun fotogramma fuori posto) la si colloca; poi la si ricolloca quando scorre un
  // contenitore (la segue il pulsante), quando cambia lo schermo (rotazione, tastiera del tablet) e alla fine di un'animazione che la
  // spostava (l'apertura della finestra). Lo scorrimento del suo stesso elenco non la tocca.
  useLayoutEffect(() => {
    if (!aperto) { verso.current = null; return; }
    colloca(true);
    const suScorrimento = (e: Event) => { if (!(e.target instanceof Node && tendina.current?.contains(e.target))) colloca(false); };
    const suMisure = () => colloca(true);
    window.addEventListener('scroll', suScorrimento, true);
    window.addEventListener('resize', suMisure);
    window.visualViewport?.addEventListener('resize', suMisure);
    document.addEventListener('animationend', suMisure, true);
    return () => {
      window.removeEventListener('scroll', suScorrimento, true);
      window.removeEventListener('resize', suMisure);
      window.visualViewport?.removeEventListener('resize', suMisure);
      document.removeEventListener('animationend', suMisure, true);
    };
  }, [aperto, colloca]);
  // il filtro cambia l'altezza dell'elenco: la tendina resta dal suo lato e si riadatta allo spazio
  useLayoutEffect(() => { if (aperto) colloca(false); }, [aperto, filtrate, colloca]);
  useEffect(() => {
    if (!aperto) return;
    // la voce evidenziata entra in vista scorrendo solo l'elenco: `scrollIntoView` farebbe scorrere anche i contenitori del selettore
    const l = elenco.current;
    const voce = l?.querySelector<HTMLElement>('.selettore__voce--evidenziata');
    if (!l || !voce) return;
    const e = l.getBoundingClientRect();
    const v = voce.getBoundingClientRect();
    if (v.top < e.top) l.scrollTop -= e.top - v.top;
    else if (v.bottom > e.bottom) l.scrollTop += v.bottom - e.bottom;
  }, [aperto, evidenziata, filtrate]);
  /**
   * Tastiera nella tendina: Esc chiude, frecce spostano l'evidenziazione entro le voci filtrate (PagSu/PagGiù di dieci), Invio sceglie
   * quella evidenziata; Home/Fine portano alla prima/ultima voce solo senza campo di ricerca (nel campo spostano il cursore del testo);
   * Spazio sceglie solo senza campo (nel campo è un carattere); Tab chiude senza rubare il fuoco e lo lascia proseguire.
   */
  const tastiera = (e: React.KeyboardEvent) => {
    const ultima = Math.max(0, filtrate.length - 1);
    if (e.key === 'Escape') { e.preventDefault(); chiudi(); return; }
    if (e.key === 'Tab') {
      // dal campo di ricerca il fuoco torna prima sul pulsante: la tendina sparisce con il campo e il Tab riparte da un punto certo
      if (e.target !== pulsante.current) pulsante.current?.focus();
      setAperto(false);
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setEvidenziata(Math.min(ultima, attiva + 1)); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setEvidenziata(Math.max(0, attiva - 1)); return; }
    if (e.key === 'PageDown') { e.preventDefault(); setEvidenziata(Math.min(ultima, attiva + 10)); return; }
    if (e.key === 'PageUp') { e.preventDefault(); setEvidenziata(Math.max(0, attiva - 10)); return; }
    if (!conRicerca && e.key === 'Home') { e.preventDefault(); setEvidenziata(0); return; }
    if (!conRicerca && e.key === 'End') { e.preventDefault(); setEvidenziata(ultima); return; }
    if (e.key === 'Enter' || (!conRicerca && e.key === ' ')) {
      e.preventDefault();
      if (e.key === ' ') spazioGestito.current = true;
      const o = filtrate[attiva];
      if (o) scegli(o.chiave);
    }
  };
  /**
   * Tastiera sul pulsante: a tendina chiusa le frecce la aprono; a tendina aperta i tasti passano a `tastiera` se non
   * c'è il campo di ricerca (con il campo li gestisce la tendina stessa), Esc sempre.
   */
  const tastieraPulsante = (e: React.KeyboardEvent) => {
    if (!aperto && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); apri(); return; }
    if (aperto && (!conRicerca || e.key === 'Escape')) tastiera(e);
  };
  /** Lo Spazio già usato per scegliere non deve riattivare il pulsante al rilascio. */
  const rilascioPulsante = (e: React.KeyboardEvent) => {
    if (e.key === ' ' && spazioGestito.current) { e.preventDefault(); spazioGestito.current = false; }
  };
  /** Il fuoco è andato fuori dal selettore (tocco su altro, Maiusc+Tab, scorciatoia): la tendina si chiude. */
  const perdeFuoco = (e: React.FocusEvent) => {
    const verso = e.relatedTarget as Node | null;
    if (aperto && verso && radice.current && !radice.current.contains(verso)) setAperto(false);
  };

  return (
    <div ref={radice} onBlur={perdeFuoco} className={`selettore ${compatto ? 'selettore--compatto' : etichettaSopra ? 'selettore--con-etichetta' : ''} ${className ?? ''}`}>
      {/* etichetta sopra il pulsante (stile dei campi); il nome accessibile lo dà già `aria-label` del pulsante. Toccarla porta il fuoco
          sul pulsante, come una vera <label> */}
      {!compatto && etichettaSopra && <span className="campo__etichetta" aria-hidden="true" onClick={() => pulsante.current?.focus()}>{etichetta}</span>}
      <button ref={pulsante} type="button" role="combobox" className="selettore__scelta touch" aria-haspopup="listbox" aria-expanded={aperto} aria-controls={id} aria-activedescendant={aperto && !conRicerca && attiva >= 0 ? idVoce(attiva) : undefined} aria-label={nomeConValore ? `${etichetta}: ${scelta ? testoNoteAParole(scelta.nome) : segnaposto}` : etichetta} aria-describedby={descrizione} aria-invalid={errore ? true : undefined} disabled={disabilitato} onClick={() => (aperto ? setAperto(false) : apri())} onKeyDown={tastieraPulsante} onKeyUp={rilascioPulsante} title={scelta ? testoNoteAParole(scelta.nome) : segnaposto}>
        {!compatto && !etichettaSopra && <span className="selettore__etichetta">{etichetta}</span>}
        <span id={idValore} className={`selettore__valore ${scelta ? '' : 'selettore__valore--vuoto'}`}>{scelta ? <TestoNote testo={scelta.nome} /> : segnaposto}</span>
        <span className="selettore__freccia" aria-hidden="true">▾</span>
      </button>
      {errore && <p id={idErrore} className="m-0 mt-1 testo-12 text-error-testo">{errore}</p>}
      {aperto && (
        <div ref={tendina} className="selettore__tendina" onKeyDown={conRicerca ? tastiera : undefined}>
          {conRicerca && <input className="form-input selettore__campo" type="search" value={testo} onChange={(e) => { setTesto(e.target.value); setEvidenziata(0); }} placeholder={`Cerca ${etichetta.toLowerCase()}…`} aria-label={`Cerca ${etichetta}`} aria-controls={id} aria-activedescendant={attiva >= 0 ? idVoce(attiva) : undefined} autoComplete="off" autoFocus />}
          {/* il fuoco resta sul pulsante o sul campo: premere su una voce non deve spostarlo (toglierebbe la tendina da sotto il dito) */}
          <ul ref={elenco} id={id} role="listbox" aria-label={etichetta} className="selettore__elenco" onMouseDown={(e) => e.preventDefault()}>
            {filtrate.length === 0 && <li role="presentation" className="selettore__vuoto">Nessuna voce corrisponde.</li>}
            {filtrate.map((o, i) => {
              // Le intestazioni di gruppo compaiono solo dove il gruppo cambia, nell'ordine dell'elenco.
              const intestazione = o.gruppo && (i === 0 || filtrate[i - 1].gruppo !== o.gruppo) ? o.gruppo : null;
              return [
                intestazione ? <li key={`gruppo:${o.chiave}`} role="presentation" className="selettore__gruppo">{intestazione}</li> : null,
                // La voce è l'`option` stessa (nessun pulsante dentro): ha un id per `aria-activedescendant`, il tocco la sceglie.
                <li key={o.chiave || '__vuoto'} id={idVoce(i)} role="option" aria-selected={o.chiave === valore} onMouseEnter={() => setEvidenziata(i)} onClick={() => scegli(o.chiave)} className={`selettore__voce ${i === attiva ? 'selettore__voce--evidenziata' : ''} ${o.chiave === valore ? 'selettore__voce--scelta' : ''}`}>
                  <div className="selettore__pulsante touch">
                    <span className="min-w-0 flex-1 break-words"><TestoNote testo={o.nome} /></span>
                    {o.dettaglio && <span className="text-text-muted testo-12 shrink-0">{o.dettaglio}</span>}
                  </div>
                </li>,
              ];
            })}
            {tagliate && <li role="presentation" className="selettore__vuoto">Scrivi qualche lettera in più per restringere.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

