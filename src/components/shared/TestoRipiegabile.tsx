// ============================================================
// TestoRipiegabile — testo lungo mostrato in breve con «altro»/«meno» (le schede restano leggibili, il dettaglio è a richiesta)
// ============================================================

import { useState } from 'react';
import { sintesi } from '../../utils/testoBreve';

interface Props {
  testo: string;
  /** Lunghezza massima della versione breve (default 110 caratteri). */
  massimo?: number;
  className?: string;
}

/** Paragrafo ripiegato con pulsante per espandere; senza JavaScript degrada al testo breve. */
export function TestoRipiegabile({ testo, massimo = 110, className }: Props) {
  const [aperto, setAperto] = useState(false);
  const breve = sintesi(testo, massimo);
  const ripiegabile = breve !== testo.trim();
  return (
    <p className={`m-0 ${className ?? ''}`}>
      {aperto || !ripiegabile ? testo.trim() : breve}
      {ripiegabile && (
        <>
          {' '}
          <button type="button" className="bg-transparent border-0 p-0 text-primary text-[12px] font-semibold cursor-pointer underline-offset-2 hover:underline" onClick={() => setAperto((v) => !v)} aria-expanded={aperto}>
            {aperto ? 'meno' : 'altro'}
          </button>
        </>
      )}
    </p>
  );
}
