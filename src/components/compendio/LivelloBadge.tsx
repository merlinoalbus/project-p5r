// ============================================================
// LivelloBadge — numero di livello in stile Persona 5: cartiglio rosso a taglio diagonale, carattere display
// ============================================================

interface Props {
  livello: number;
  /** Dimensione: piccola per piastrelle ed elenchi, grande per la scheda. */
  grande?: boolean;
  className?: string;
}

/** Cartiglio con il livello (etichetta accessibile «Livello N»). */
export function LivelloBadge({ livello, grande, className }: Props) {
  return (
    <span className={`livello-p5 ${grande ? 'livello-p5--grande' : ''} ${className ?? ''}`} aria-label={`Livello ${livello}`} title={`Livello ${livello}`}>
      <span className="livello-p5__etichetta" aria-hidden="true">Lv</span>
      <span className="tabular-nums">{livello}</span>
    </span>
  );
}
