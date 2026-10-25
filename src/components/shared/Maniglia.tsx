// ============================================================
// Maniglia — il pulsante ⠿ per riordinare un elenco trascinando (o con le frecce su/giù), con `useRiordino`
// ============================================================

import type { Riordino, RiordinoCollegato } from '../../hooks/useRiordino';

/** La maniglia: un pulsante vero (il focus ci arriva, le frecce spostano), largo quanto un dito; ferma, dice perché.
 *  Con `useRiordinoCollegato` (più elenchi) il posto lo ricava il hook dall'id: `i` si può omettere. */
export function Maniglia({ etichetta, id, i = 0, riordino }: { etichetta: string; id: string; i?: number; riordino: Riordino | RiordinoCollegato }) {
  const bloccato = riordino.blocco !== null;
  // col dito il diario chiede la pressione lunga: la maniglia lascia scorrere la pagina finché il trascinamento non parte
  const pressioneLunga = 'pressioneLunga' in riordino;
  return (
    <button type="button" ref={riordino.rifManiglia(id)} {...riordino.maniglia(id, i)} aria-label={etichetta} aria-keyshortcuts="ArrowUp ArrowDown" aria-disabled={bloccato || undefined}
      title={riordino.blocco ?? (pressioneLunga ? 'Trascina per spostare; col dito tieni premuto un attimo (con la tastiera: frecce su e giù)' : 'Trascina per spostare (con la tastiera: frecce su e giù)')}
      className={`touch flex w-8 shrink-0 select-none items-center justify-center rounded testo-18 leading-none text-text-muted hover:text-text [-webkit-touch-callout:none] ${pressioneLunga ? 'touch-pan-y' : 'touch-none'} ${bloccato ? 'cursor-default opacity-40' : 'cursor-grab active:cursor-grabbing'}`}>
      <span aria-hidden>⠿</span>
    </button>
  );
}
