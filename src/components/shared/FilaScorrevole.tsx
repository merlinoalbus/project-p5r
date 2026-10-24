// ============================================================
// FilaScorrevole — fila di schede o filtri: una riga sola che scorre sul telefono, a capo dal tablet in su
// ============================================================
//
// Su uno schermo da 375 px una decina di schede andrebbe a capo quattro volte, mangiando mezza schermata: qui restano
// su una riga sola che scorre in orizzontale (con sfumatura sul bordo da cui continua, a segnalare che ce n'è dell'altro) e la scheda
// attiva viene portata in vista da sola. Da 768 px in su torna la disposizione a capo di prima, identica.
// Lo stile sta in `.fila-scorrevole` (src/tailwind.css).
// ============================================================

import { useEffect, useRef, type ComponentProps } from 'react';

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
  // Segna da che lato la fila continua (`data-prima`, `data-dopo`): il CSS sfuma solo quel bordo. Si scrive sul DOM e non nello
  // stato, così lo scorrimento non ridisegna la fila a ogni frame.
  useEffect(() => {
    const fila = rif.current;
    if (!fila) return;
    const segna = () => {
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
  return (
    <div ref={rif} className={`fila-scorrevole ${className ?? ''}`} {...resto}>
      {children}
    </div>
  );
}
