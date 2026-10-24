// ============================================================
// FilaScelta — una scelta sola fra poche voci brevi in fila (note ♪, rango atteso, «almeno N sessioni»), bersagli da 44 px
// ============================================================

import type { ReactNode } from 'react';

export interface VoceFila { chiave: string; nome: string; /** Contenuto al posto del nome (per esempio la cifra del rango); `nome` resta il nome accessibile. */ contenuto?: ReactNode }

interface Props {
  etichetta: string;
  valore: string;
  opzioni: ReadonlyArray<VoceFila>;
  onCambia: (chiave: string) => void;
  disabilitato?: boolean;
}

/** Gruppo radio di tasti affiancati che vanno a capo: quello di chiave `valore` è acceso. */
export function FilaScelta({ etichetta, valore, opzioni, onCambia, disabilitato }: Props) {
  return (
    <div role="radiogroup" aria-label={etichetta} className="fila-scelta">
      {opzioni.map((o) => (
        <button key={o.chiave} type="button" role="radio" aria-checked={valore === o.chiave} aria-label={o.nome} title={o.nome} disabled={disabilitato}
          className={`fila-scelta__voce touch ${valore === o.chiave ? 'fila-scelta__voce--attiva' : ''}`} onClick={() => onCambia(o.chiave)}>
          {o.contenuto ?? o.nome}
        </button>
      ))}
    </div>
  );
}
