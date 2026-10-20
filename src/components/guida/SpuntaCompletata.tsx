// ============================================================
// SpuntaCompletata — la spunta verde di un'area, di un'infiltrazione o di un dedalo completati (dal 2026-10-04)
// ============================================================
//
// Stava in `PlanimetriePalazzo`, che L3 toglie (2026-10-20): qui da sola, la usano le aree del Palazzo, i dedali e le loro aree.
// ============================================================

import { IconSpunta } from '../shared/iconeGuida';

/**
 * La spunta di completamento (scelta dell'utente, 2026-10-04): verde e solo visiva, davanti o dopo il nome di quel che è completato.
 * Chi usa un lettore di schermo sente invece `TestoCompletata`, sempre dopo il nome.
 */
export function SpuntaCompletata({ dimensione = 12 }: { dimensione?: number }) {
  return <span aria-hidden className="inline-flex shrink-0 align-[-2px] text-success" data-completata=""><IconSpunta size={dimensione} /></span>;
}

/** Il «completata» per i lettori di schermo, dopo il nome. */
export function TestoCompletata() {
  // lo spazio sta fuori dallo span nascosto: dentro, il calcolo del nome accessibile lo scarterebbe («Cancello(completata)»)
  return <>{' '}<span className="sr-only">(completata)</span></>;
}
