// ============================================================
// VoceFonte — un dato con la sua etichetta, e il collegamento alla fonte, per le schede della guida
// ============================================================
//
// Erano ridefiniti in Completamento, Oggetti, Sfide e (la sola fonte) Battaglia, tre volte uguali e una quasi (rilievo R3‴
// della verifica completa). La «voce» di Battaglia resta sua: è un riquadro con l'etichetta sopra, un'altra forma.
// ============================================================

import type { ReactNode } from 'react';
import { urlHttp } from '../../../shared/urlHttp';

/** «**Titolo:** testo», in una riga. */
export function VoceTesto({ titolo, children }: { titolo: string; children: ReactNode }) {
  return <p className="m-0"><strong>{titolo}:</strong> {children}</p>;
}

/** Nel rilascio la provenienza dei dati non si mostra (D10, L7-01): costante di build, come in ogni modulo (`utils/modalita.ts`). */
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

/**
 * Il collegamento alla pagina della fonte, se c'è. Un campo che ne porta più d'una («url ;url») apre la prima. `allineato`
 * (predefinito) lo tiene alla sua larghezza dentro una colonna flessibile. Serve a chi prepara e corregge i dati: nel rilascio non
 * c'è, e le fonti stanno in un punto solo (Impostazioni → Informazioni). Solo un indirizzo http o https diventa un collegamento
 * (`urlHttp`, L9-05): un testo a parole o un altro schema no.
 */
export function Fonte({ url, etichetta = 'fonte', allineato = true }: { url: string | null | undefined; etichetta?: string; allineato?: boolean }) {
  if (!url || IN_RILASCIO) return null;
  const href = urlHttp(url.split(' ;')[0]);
  if (!href) return null;
  return <a href={href} target="_blank" rel="noreferrer" className={allineato ? 'credito touch inline-flex items-center self-start' : 'credito touch inline-flex items-center'}>{etichetta}</a>;
}
