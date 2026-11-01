// ============================================================
// LivelloBadge — numero di livello in stile Persona 5: cartiglio rosso a taglio diagonale, carattere display
// ============================================================

interface Props {
  livello: number;
  /** Dimensione: piccola per piastrelle ed elenchi, grande per la scheda. */
  grande?: boolean;
  className?: string;
  /** true: il livello lo dice già il nome di chi lo contiene (il collegamento della piastrella): niente ruolo né etichetta, per non farlo leggere due volte; il suggerimento al passaggio resta. */
  decorativo?: boolean;
}

/** Cartiglio con il livello (etichetta accessibile «Livello N», salvo `decorativo`). */
export function LivelloBadge({ livello, grande, className, decorativo }: Props) {
  return (
    <span className={`livello-p5 ${grande ? 'livello-p5--grande' : ''} ${className ?? ''}`} {...(decorativo ? { 'aria-hidden': true } : { role: 'img', 'aria-label': `Livello ${livello}` })} title={`Livello ${livello}`}>
      <span className="livello-p5__etichetta" aria-hidden="true">Liv.</span>
      <span className="tabular-nums">{livello}</span>
    </span>
  );
}
