// ============================================================
// Segmenti — una scelta sola fra poche voci, come pulsanti affiancati (radiogroup, bersagli da 44 px)
// ============================================================
//
// Per i filtri a tre o quattro stati (Tutti / Da fare / Completati, Cinema / DVD): si vede tutto
// senza aprire una tendina, e sul telefono la riga si allarga a tutta la larghezza.
//
// Tastiera (schema APG del radiogroup, WCAG 2.1.1): nella sequenza di Tab c'è un solo elemento, la voce scelta (roving tabindex);
// le frecce spostano il fuoco E la scelta alla voce vicina (con giro dalla fine all'inizio), Home e Fine vanno alla prima e
// all'ultima. Il tocco e il clic non cambiano.
// ============================================================

import { useRef } from 'react';
import { TestoNote } from './TestoNote';

interface Props<T extends string> {
  etichetta: string;
  valore: T;
  opzioni: ReadonlyArray<{ chiave: T; nome: string }>;
  onCambia: (v: T) => void;
}

/**
 * Gruppo di pulsanti radio affiancati: uno per voce di `opzioni`, quello di chiave `valore` evidenziato e
 * marcato `aria-checked`; il tocco su una voce chiama `onCambia` con la sua chiave. `etichetta` dà il nome
 * accessibile al gruppo. Da tastiera solo la voce scelta è raggiungibile con Tab, le frecce cambiano la scelta.
 */
export function Segmenti<T extends string>({ etichetta, valore, opzioni, onCambia }: Props<T>) {
  const pulsanti = useRef<Array<HTMLButtonElement | null>>([]);
  // la voce nella sequenza di Tab: quella scelta; se il valore non è fra le voci, la prima (il gruppo resta raggiungibile)
  const scelta = Math.max(0, opzioni.findIndex((o) => o.chiave === valore));

  /** Frecce, Home e Fine: scelgono la voce di destinazione e le portano il fuoco. */
  const tastiera = (e: React.KeyboardEvent, i: number) => {
    // con Alt, Ctrl o Meta le frecce sono scorciatoie del browser o del sistema (Alt+← indietro, Cmd+← inizio riga): lo schema APG
    // non prevede modificatori, quindi non si intercettano e non cambiano la scelta
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const n = opzioni.length;
    let verso = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') verso = (i + 1) % n;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') verso = (i - 1 + n) % n;
    else if (e.key === 'Home') verso = 0;
    else if (e.key === 'End') verso = n - 1;
    if (verso < 0) return;
    e.preventDefault();
    onCambia(opzioni[verso].chiave);
    pulsanti.current[verso]?.focus();
  };

  return (
    <div role="radiogroup" aria-label={etichetta} className="segmenti">
      {opzioni.map((o, i) => (
        <button key={o.chiave} ref={(el) => { pulsanti.current[i] = el; }} type="button" role="radio" aria-checked={valore === o.chiave} tabIndex={i === scelta ? 0 : -1} className={`segmenti__voce touch ${valore === o.chiave ? 'segmenti__voce--attiva' : ''}`} onClick={() => onCambia(o.chiave)} onKeyDown={(e) => tastiera(e, i)}><TestoNote testo={o.nome} /></button>
      ))}
    </div>
  );
}
