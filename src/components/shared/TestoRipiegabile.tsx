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
    // Il comando sta **sotto** il testo, non dentro la riga: appeso in coda al paragrafo restava un
    // bersaglio di 26×18 px — col dito si prende la parola accanto — e portarlo a 44 px lì dentro
    // avrebbe allargato l'interlinea di tutto il testo. Su una riga propria vale 44 px e si vede.
    <div className={`flex flex-col items-start ${className ?? ''}`}>
      <p className="m-0">{aperto || !ripiegabile ? testo.trim() : breve}</p>
      {ripiegabile && (
        <button type="button" className="touch bg-transparent border-0 px-0 py-1 text-primary text-[12px] font-semibold cursor-pointer underline underline-offset-2" onClick={() => setAperto((v) => !v)} aria-expanded={aperto}>
          {aperto ? 'Mostra meno' : 'Mostra tutto'}
        </button>
      )}
    </div>
  );
}
