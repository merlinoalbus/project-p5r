// ============================================================
// Segmenti — una scelta sola fra poche voci, come pulsanti affiancati (radiogroup, bersagli da 44 px)
// ============================================================
//
// Per i filtri a tre o quattro stati (Tutti / Da fare / Completati, Cinema / DVD): si vede tutto
// senza aprire una tendina, e sul telefono la riga si allarga a tutta la larghezza.
// ============================================================

interface Props<T extends string> {
  etichetta: string;
  valore: T;
  opzioni: ReadonlyArray<{ chiave: T; nome: string }>;
  onCambia: (v: T) => void;
}

export function Segmenti<T extends string>({ etichetta, valore, opzioni, onCambia }: Props<T>) {
  return (
    <div role="radiogroup" aria-label={etichetta} className="segmenti">
      {opzioni.map((o) => (
        <button key={o.chiave} type="button" role="radio" aria-checked={valore === o.chiave} className={`segmenti__voce touch ${valore === o.chiave ? 'segmenti__voce--attiva' : ''}`} onClick={() => onCambia(o.chiave)}>{o.nome}</button>
      ))}
    </div>
  );
}
