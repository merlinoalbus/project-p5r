// ============================================================
// Ripiegabile — una sezione che si apre e si chiude dal titolo, con il riepilogo di ciò che contiene a sezione chiusa
// ============================================================
//
// Nasce per l'editor della voce del Diario (L6-06): effetti, condizioni e posto occupavano più schermate anche quando non si toccavano.
// Chiusa, la sezione mostra una riga sola (titolo + riepilogo); aperta, mostra tutto il suo contenuto. Il contenuto resta montato anche
// a sezione chiusa (`hidden`): ciò che vi si è scritto, la scheda di un effetto aperta, un campo modificato non si perdono richiudendo.
// Schema ARIA dell'accordion: il titolo è un pulsante con `aria-expanded` e `aria-controls`; bersaglio ≥ 44 px (`.touch`).
// `forzaAperta` tiene la sezione aperta (e il pulsante spento) finché c'è qualcosa da completare: un campo obbligatorio non resta nascosto.
// ============================================================

import { useId, useState, type ReactNode } from 'react';
import { IconGiu } from './iconeGuida';

interface Props {
  titolo: string;
  /** Che cosa contiene, in una riga: compare solo a sezione chiusa (aperta, il contenuto parla da sé). */
  riepilogo?: ReactNode;
  /** Parte aperta (default: chiusa). Conta solo al primo disegno: poi decide chi usa la sezione. */
  apertaDiPartenza?: boolean;
  /** Resta aperta e non si può chiudere (c'è qualcosa da completare). */
  forzaAperta?: boolean;
  /** `riquadro`: il riquadro colorato di «Spuntando succede»; `semplice`: titolo e filetto. */
  variante?: 'riquadro' | 'semplice';
  children: ReactNode;
}

/** Sezione ripiegabile: titolo-pulsante, riepilogo a sezione chiusa, contenuto sempre montato. */
export function Ripiegabile({ titolo, riepilogo, apertaDiPartenza = false, forzaAperta = false, variante = 'semplice', children }: Props) {
  const [apertaPerScelta, setAperta] = useState(apertaDiPartenza);
  // aperta perché c'era da completare, resta aperta anche completato l'ultimo campo: non si chiude sotto le dita (la richiude chi vuole)
  if (forzaAperta && !apertaPerScelta) setAperta(true);
  const aperta = apertaPerScelta || forzaAperta;
  const idCorpo = useId();
  return (
    <section className={`ripiegabile ripiegabile--${variante}`} aria-label={titolo}>
      <h3 className="m-0 ripiegabile__titolo">
        <button type="button" className="ripiegabile__interruttore touch" aria-expanded={aperta} aria-controls={idCorpo} disabled={forzaAperta}
          title={forzaAperta ? `${titolo}: c’è qualcosa da completare` : aperta ? `Chiudi: ${titolo}` : `Apri: ${titolo}`} onClick={() => setAperta((a) => !a)}>
          <span className="ripiegabile__freccia" aria-hidden="true"><IconGiu size={18} /></span>
          <span className="ripiegabile__nome">{titolo}</span>
          {!aperta && riepilogo && <span className="ripiegabile__riepilogo">{riepilogo}</span>}
        </button>
      </h3>
      <div id={idCorpo} hidden={!aperta} className="ripiegabile__corpo">{children}</div>
    </section>
  );
}
