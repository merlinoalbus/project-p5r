// ============================================================
// PromemoriaLibri — gli effetti dei libri letti nella partita, dove valgono (Ondata 5, lotto F-bis; decisione 21)
// ============================================================
//
// Dodici libri non danno Doti ma cambiano un'altra attività (raddoppiano la lettura o la fabbricazione, aumentano i punti dei film e dello
// studio, sbloccano una capacità in un minigioco o in combattimento). Il server dice quali valgono lì (`server/services/modificatoriLibri.ts`);
// qui si mostrano con la stessa forma ovunque: «Dai libri letti: …». Niente se la lista è vuota (un'etichetta si vede solo se dice qualcosa).
// Elementi in linea con i ruoli di elenco: il promemoria sta anche dentro le righe dei contatori, che sono `span`.
// ============================================================

/** Le frasi dei libri letti che valgono in questo punto; niente se non ce ne sono. `compatto`: testo da 12 px (righe dei contatori). */
export function PromemoriaLibri({ promemoria, compatto = false, className = '' }: { promemoria?: readonly string[] | null; compatto?: boolean; className?: string }) {
  if (!promemoria?.length) return null;
  return (
    <span role="list" aria-label="Dai libri letti" className={`flex min-w-0 flex-col gap-0.5 text-text-muted text-pretty ${compatto ? 'testo-12' : 'testo-13'} ${className}`}>
      {promemoria.map((p) => <span role="listitem" key={p} className="block">Dai libri letti: {p}</span>)}
    </span>
  );
}
