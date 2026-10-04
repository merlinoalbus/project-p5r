// ============================================================
// VoceFonte — un dato con la sua etichetta, e il collegamento alla fonte, per le schede della guida
// ============================================================
//
// Erano ridefiniti in Completamento, Oggetti, Sfide e (la sola fonte) Battaglia, tre volte uguali e una quasi (rilievo R3‴
// della verifica completa). La «voce» di Battaglia resta sua: è un riquadro con l'etichetta sopra, un'altra forma.
// ============================================================

import type { ReactNode } from 'react';

/** «**Titolo:** testo», in una riga. */
export function VoceTesto({ titolo, children }: { titolo: string; children: ReactNode }) {
  return <p className="m-0"><strong>{titolo}:</strong> {children}</p>;
}

/**
 * Il collegamento alla pagina della fonte, se c'è. Un campo che ne porta più d'una («url ;url») apre la prima. `allineato`
 * (predefinito) lo tiene alla sua larghezza dentro una colonna flessibile.
 */
export function Fonte({ url, etichetta = 'fonte', allineato = true }: { url: string | null | undefined; etichetta?: string; allineato?: boolean }) {
  if (!url) return null;
  return <a href={url.split(' ;')[0]} target="_blank" rel="noreferrer" className={allineato ? 'credito touch inline-flex items-center self-start' : 'credito touch inline-flex items-center'}>{etichetta}</a>;
}
