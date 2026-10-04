// ============================================================
// RimossiPage — tutte le righe nascoste dagli elenchi, per tipo, con il ripristino in un tocco
// ============================================================

import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { ElementiRimossi } from '../components/guida/ElementiRimossi';
import { TIPI_CATALOGO } from '../../shared/types';

/** Pagina dei rimossi: un blocco di elementi nascosti per ogni tipo del catalogo, mostrato sempre (anche vuoto), ciascuno con il suo ripristino. */
export function RimossiPage() {
  useDocumentTitle('Rimossi');
  return (
    <div className="flex flex-col gap-3">
      <IntestazionePagina titolo="Rimossi" sottotitolo="Le righe della guida che hai nascosto dagli elenchi: restano nei dati e tornano visibili con un tocco." />
      <div className="rimossi-griglia">
        {TIPI_CATALOGO.map((tipo) => <ElementiRimossi key={tipo} tipo={tipo} sempre />)}
      </div>
    </div>
  );
}
