// ============================================================
// useFuocoNavigazione — dopo un cambio di pagina il fuoco va sul titolo della pagina nuova (lotto C, punto 10)
// ============================================================
//
// In un'app a pagina singola, cambiando pagina il fuoco restava sulla voce di menu (o, se l'elemento toccato spariva, tornava in cima al
// documento): con la tastiera si ripartiva da capo e con un lettore di schermo non si sentiva che la pagina era cambiata. Qui, quando
// cambia il **percorso** (non i parametri dopo «?»), il fuoco va sull'h1 della pagina nuova (o su `<main>` se un h1 non c'è), senza far
// scorrere niente.
//
// Quando NON si sposta il fuoco, e il cambio si annuncia soltanto (regione `status` di `MainLayout`):
// - al primo caricamento (il fuoco è già all'inizio del documento, col «Vai al contenuto» per primo);
// - se cambiano solo i parametri dopo «?» (filtri, schede di una pagina, il pannello sopra il diario `?pannello=`): `pathname` non cambia
//   e qui non succede niente, l'annuncio lo fa chi cambia (lo stesso vale per i cassetti e le finestre, che hanno il loro fuoco);
// - se il fuoco è su un elemento della pagina che c'è ancora (un selettore o le frecce che cambiano l'indirizzo restando nella stessa
//   pagina, come le infiltrazioni di un Palazzo o i giorni della Guida): chi lo sta usando non va spostato; se la pagina nuova ha
//   ricreato quell'elemento (le frecce dei giorni del Percorso), il fuoco torna sull'elemento nuovo con lo stesso nome accessibile;
// - se il fuoco è dentro una finestra (`role="dialog"`);
// - se, mentre la pagina nuova carica i dati, l'utente ha già messo il fuoco altrove.
// La pagina nuova può mostrare l'attesa prima dell'h1: lo si aspetta fino a 4 secondi, poi si ripiega su `<main>`.
// ============================================================

import { useEffect, useRef, type RefObject } from 'react';
import { useLocation } from 'react-router-dom';
import { APP_NAME } from '../../utils/constants';

/** Ogni quanto si guarda se l'h1 della pagina nuova c'è, e per quante volte (4 s in tutto). */
const PASSO_MS = 100;
const TENTATIVI = 40;

/** Il titolo della pagina da annunciare: l'h1, o il titolo della scheda del browser senza il nome dell'app. */
/** Il titolo della pagina da annunciare: quello del documento, che dice anche il giorno o la scheda («9 aprile — Guida giorno per
 *  giorno»), altrimenti l'h1. */
function titoloDa(h1: HTMLElement | null): string {
  const documento = document.title.replace(new RegExp(` — ${APP_NAME}$`), '').trim();
  if (documento && documento !== APP_NAME) return documento;
  return h1?.textContent?.trim() ?? '';
}

/** Porta il fuoco su `el` senza far scorrere; un h1 riceve `tabindex="-1"` finché lo tiene (non entra nel giro del Tab). */
function metti(el: HTMLElement) {
  if (!el.hasAttribute('tabindex')) {
    el.setAttribute('tabindex', '-1');
    el.addEventListener('blur', () => el.removeAttribute('tabindex'), { once: true });
  }
  el.focus({ preventScroll: true });
}

/** Sposta il fuoco sull'h1 della pagina dopo ogni cambio di percorso (vedi l'intestazione); `annuncia` riceve il titolo negli altri casi. */
export function useFuocoNavigazione(main: RefObject<HTMLElement | null>, annuncia: (testo: string) => void) {
  const { pathname } = useLocation();
  // il percorso di cui si è già deciso il fuoco: al primo caricamento è quello iniziale (e il doppio effetto di StrictMode non lo
  // scambia per un cambio di pagina)
  const gestito = useRef(pathname);
  /** Il titolo (h1) dell'ultima pagina gestita: serve a riconoscere un h1 rimasto quello di prima. */
  const ultimoTitolo = useRef<string | null>(null);
  const annunciaRef = useRef(annuncia);
  useEffect(() => { annunciaRef.current = annuncia; });
  /** L'ultimo elemento della pagina che ha avuto il fuoco, con il suo nome accessibile: se il cambio di percorso lo ricrea, lo si ritrova. */
  const ultimoFuoco = useRef<{ el: HTMLElement; nome: string } | null>(null);
  useEffect(() => {
    const radice = main.current;
    if (!radice) return;
    const ricorda = (e: FocusEvent) => {
      const el = e.target;
      const nome = el instanceof HTMLElement ? el.getAttribute('aria-label') : null;
      ultimoFuoco.current = el instanceof HTMLElement && nome ? { el, nome } : null;
    };
    radice.addEventListener('focusin', ricorda);
    return () => radice.removeEventListener('focusin', ricorda);
  }, [main]);

  useEffect(() => {
    if (gestito.current === pathname) return;
    gestito.current = pathname;
    const radice = main.current;
    if (!radice) return;
    const prima = document.activeElement;
    // l'elemento col fuoco è stato tolto dal ridisegno (il fuoco è tornato al documento): si cercherà quello nuovo con lo stesso nome
    const ricreato = (prima === null || prima === document.body) && ultimoFuoco.current !== null && !ultimoFuoco.current.el.isConnected
      ? ultimoFuoco.current.nome : null;
    const restaNellaPagina = (prima instanceof HTMLElement && prima !== radice && radice.contains(prima)) || ricreato !== null;
    const inFinestra = prima instanceof Element && prima.closest('[role="dialog"], [role="alertdialog"], dialog') !== null;
    const sposta = !restaNellaPagina && !inFinestra;
    // fra due pagine dello stesso componente (da una Persona all'altra) l'h1 per un momento è ancora quello di prima: l'annuncio
    // aspetta che cambi (entro lo stesso tempo massimo), per non leggere il titolo della pagina lasciata
    const titoloPrima = ultimoTitolo.current;
    let tentativi = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const prova = () => {
      // subito, a ogni tentativo: l'elemento ricreato riprende il fuoco appena c'è (l'annuncio, sotto, può aspettare il titolo nuovo)
      if (ricreato !== null && (document.activeElement === null || document.activeElement === document.body)) {
        const gemello = radice.querySelector<HTMLElement>(`[aria-label="${CSS.escape(ricreato)}"]`);
        // ricreato ma disabilitato (la freccia del primo giorno): non prende il fuoco, che va sul titolo come per una pagina nuova
        if (gemello && !gemello.matches(':disabled')) gemello.focus({ preventScroll: true });
        else if (gemello) { const h1 = radice.querySelector<HTMLElement>('h1'); if (h1) metti(h1); }
      }
      const h1 = radice.querySelector<HTMLElement>('h1');
      // si aspetta che il titolo della pagina sia quello nuovo (il documento lo cambia anche quando l'h1 resta uguale, come nel Percorso)
      const ancoraVecchio = !sposta && h1 !== null && titoloDa(h1) === titoloPrima;
      if ((!h1 || ancoraVecchio) && tentativi++ < TENTATIVI) { timer = setTimeout(prova, PASSO_MS); return; }
      ultimoTitolo.current = titoloDa(h1);
      const ora = document.activeElement;
      // nel frattempo l'utente ha messo il fuoco altrove (non è tornato in cima al documento): lo si lascia lì
      const mosso = ora !== prima && ora !== null && ora !== document.body;
      if (sposta && !mosso) {
        metti(h1 ?? radice);
        // sull'h1 il lettore di schermo legge già il titolo; su <main> no
        if (!h1) annunciaRef.current(titoloDa(null));
        return;
      }
      annunciaRef.current(titoloDa(h1));
    };
    prova();
    return () => { if (timer) clearTimeout(timer); };
  }, [pathname, main]);
}
