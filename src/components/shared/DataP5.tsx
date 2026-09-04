// ============================================================
// DataP5 — data di gioco in stile Persona 5: numero grande in carattere display su cartiglio, mese e giorno della settimana accanto
// ============================================================

import { dataGiocoTesto } from '../../utils/dateGioco';

interface Props {
  /** 'MM-GG' del calendario di gioco. */
  data: string;
  giornoSettimana?: string | null;
  /** Versione compatta per gli elenchi. */
  compatta?: boolean;
  /** Evidenzia (oggi nella partita, festivo). */
  evidenzia?: boolean;
  className?: string;
}

/** Cartiglio della data: «9» grande, «aprile» e «sabato» in piccolo; nome accessibile completo. */
export function DataP5({ data, giornoSettimana, compatta, evidenzia, className }: Props) {
  const [, g] = data.split('-').map(Number);
  const testo = dataGiocoTesto(data);
  const mese = testo.replace(/^\d+\s*/, '');
  return (
    <span className={`data-p5 ${compatta ? 'data-p5--compatta' : ''} ${evidenzia ? 'data-p5--evidenza' : ''} ${className ?? ''}`} aria-label={`${testo}${giornoSettimana ? `, ${giornoSettimana}` : ''}`} role="img">
      <span className="data-p5__giorno" aria-hidden="true">{Number.isInteger(g) ? g : data}</span>
      <span className="data-p5__testo" aria-hidden="true">
        <span className="data-p5__mese">{mese}</span>
        {giornoSettimana && <span className="data-p5__settimana">{giornoSettimana}</span>}
      </span>
    </span>
  );
}
