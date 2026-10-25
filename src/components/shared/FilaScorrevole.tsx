// ============================================================
// FilaScorrevole — fila di schede o filtri: una riga sola che scorre sul telefono, a capo dal tablet in su
// ============================================================
//
// Su uno schermo da 375 px una decina di schede andrebbe a capo quattro volte, mangiando mezza schermata: qui restano
// su una riga sola che scorre in orizzontale (con sfumatura sul bordo da cui continua, a segnalare che ce n'è dell'altro) e la scheda
// attiva viene portata in vista da sola. Da 768 px in su torna la disposizione a capo di prima, identica.
// Lotto C (2026-10-25): sulla sfumatura c'è anche una freccia, solo dal lato in cui la fila continua, che la fa scorrere di una
// pagina. Le frecce sono per il dito e per il mouse: ai lettori di schermo e alla tastiera non servono (la fila scorre già da sola
// seguendo il fuoco), quindi sono nascoste a loro (`aria-hidden`, `tabIndex=-1`) e non rubano il fuoco al clic.
// Per poggiarle sopra la fila (che sfuma i bordi con una maschera, e con lei tutto quello che contiene) la fila sta in una cornice:
// le classi che dicono come la fila si dispone nel genitore (`min-w-0`, `flex-1`…) passano anche alla cornice.
// Lo stile sta in `.fila-scorrevole` e `.fila-cornice` (src/tailwind.css).
// ============================================================

import { useEffect, useRef, type ComponentProps } from 'react';
import { IconChevronLeft, IconChevronRight } from './icons';

/** Le classi della fila che riguardano il suo posto nel genitore: valgono anche per la cornice, che ora è l'elemento del genitore. */
const CLASSE_DELLA_CORNICE = /^(min-w-0|flex-1|flex-auto|grow|shrink-0|w-full|self-[a-z]+)$/;

/** Contenitore della fila: passa `role`/`aria-label` come a un div normale. */
export function FilaScorrevole({ className, children, ...resto }: ComponentProps<'div'>) {
  const rif = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fila = rif.current;
    const attivo = fila?.querySelector<HTMLElement>('[aria-pressed="true"], [aria-selected="true"]');
    if (!fila || !attivo || typeof attivo.scrollIntoView !== 'function') return;
    // solo se è davvero fuori dalla parte visibile: così non si sposta nulla a ogni ridisegno
    const f = fila.getBoundingClientRect();
    const a = attivo.getBoundingClientRect();
    if (a.width === 0 || (a.left >= f.left && a.right <= f.right)) return;
    attivo.scrollIntoView({ block: 'nearest', inline: 'center' });
  });
  // Segna da che lato la fila continua (`data-prima`, `data-dopo`): il CSS sfuma solo quel bordo e vi mostra la freccia. Si scrive
  // sul DOM e non nello stato, così lo scorrimento non ridisegna la fila a ogni frame.
  useEffect(() => {
    const fila = rif.current;
    if (!fila) return;
    const segna = () => {
      // `data-scorre` dà lo spazio delle frecce ai due capi (CSS): si decide sul contenuto SENZA quello spazio, se no lo spazio
      // stesso farebbe scorrere una fila che senza starebbe intera, e l'attributo si accenderebbe e spegnerebbe da sé
      const stile = getComputedStyle(fila);
      const spazio = fila.hasAttribute('data-scorre') ? parseFloat(stile.paddingLeft) + parseFloat(stile.paddingRight) : 0;
      fila.toggleAttribute('data-scorre', fila.scrollWidth - spazio - fila.clientWidth > 1);
      // i lati dopo: con lo spazio appena dato o tolto la misura è già quella nuova
      const max = fila.scrollWidth - fila.clientWidth;
      fila.toggleAttribute('data-prima', max > 1 && fila.scrollLeft > 1);
      fila.toggleAttribute('data-dopo', max > 1 && fila.scrollLeft < max - 1);
    };
    segna();
    fila.addEventListener('scroll', segna, { passive: true });
    const dimensioni = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(segna);
    dimensioni?.observe(fila);
    // anche il contenuto cambia (schede che compaiono, testi caricati dopo): la larghezza della fila no, quella del contenuto sì
    const contenuto = typeof MutationObserver === 'undefined' ? null : new MutationObserver(segna);
    contenuto?.observe(fila, { childList: true, subtree: true, characterData: true });
    return () => { fila.removeEventListener('scroll', segna); dimensioni?.disconnect(); contenuto?.disconnect(); };
  }, []);

  /** Scorre la fila di una pagina (quasi: un pezzo dell'ultima scheda resta in vista, a dire da dove si riparte). */
  const scorri = (verso: 1 | -1) => {
    const fila = rif.current;
    if (!fila || typeof fila.scrollBy !== 'function') return;
    const ridotto = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    fila.scrollBy({ left: verso * Math.max(fila.clientWidth * 0.8, 80), behavior: ridotto ? 'auto' : 'smooth' });
  };
  const cornice = (className ?? '').split(/\s+/).filter((c) => CLASSE_DELLA_CORNICE.test(c)).join(' ');

  return (
    <div className={`fila-cornice ${cornice}`}>
      <div ref={rif} className={`fila-scorrevole ${className ?? ''}`} {...resto}>
        {children}
      </div>
      {/* dopo la fila nel DOM: il CSS le mostra con `.fila-scorrevole[data-prima] ~ .fila-freccia--prima` */}
      <button type="button" className="fila-freccia fila-freccia--prima" aria-hidden="true" tabIndex={-1}
        onMouseDown={(e) => e.preventDefault()} onClick={() => scorri(-1)}>
        <span className="fila-freccia__segno"><IconChevronLeft size={18} /></span>
      </button>
      <button type="button" className="fila-freccia fila-freccia--dopo" aria-hidden="true" tabIndex={-1}
        onMouseDown={(e) => e.preventDefault()} onClick={() => scorri(1)}>
        <span className="fila-freccia__segno"><IconChevronRight size={18} /></span>
      </button>
    </div>
  );
}
