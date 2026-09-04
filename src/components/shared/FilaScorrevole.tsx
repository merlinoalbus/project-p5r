// ============================================================
// FilaScorrevole — fila di schede o filtri: una riga sola che scorre sul telefono, a capo dal tablet in su
// ============================================================
//
// Su uno schermo da 375 px una decina di schede andrebbe a capo quattro volte, mangiando mezza schermata: qui restano
// su una riga sola che scorre in orizzontale (con sfumatura ai bordi a segnalare che ce n'è dell'altro) e la scheda
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
  return (
    <div ref={rif} className={`fila-scorrevole ${className ?? ''}`} {...resto}>
      {children}
    </div>
  );
}
