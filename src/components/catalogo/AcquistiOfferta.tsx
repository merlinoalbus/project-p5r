import type { ArticoloDto } from '../../types';

/** La spunta è della singola offerta; lo stato condiviso conserva tutte le registrazioni originarie. */
export function AcquistiOfferta({ articolo, nome, registrati, acquistato, bloccato, occupato, onCambia }: {
  articolo: string; nome: string; registrati: NonNullable<ArticoloDto['acquistiRegistrati']>;
  acquistato: boolean; bloccato: boolean; occupato: boolean;
  onCambia: (articolo: string, fatto: boolean) => void;
}) {
  const qui = registrati.some((r) => r.articolo === articolo);
  const altri = registrati.filter((r) => r.articolo !== articolo);
  return <div className="flex flex-col gap-1">
    <label className="touch flex items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={qui}
      disabled={occupato || (!qui && bloccato)} onChange={(e) => onCambia(articolo, e.target.checked)}
      aria-label={`${nome}: acquisto su questa offerta`} />Acquistato qui</label>
    {acquistato && altri.length > 0 && <span className="text-[12px]">Già acquistato nel listino condiviso</span>}
    {altri.map((r) => <div className="flex flex-wrap items-center gap-1 text-[12px]" key={r.articolo}>
      <span>Registrazione: {r.negozioNome}</span>
      <button type="button" className="btn btn-ghost btn-sm touch" disabled={occupato}
        onClick={() => onCambia(r.articolo, false)} aria-label={`Annulla solo l'acquisto di ${nome} da ${r.negozioNome}`}>Annulla</button>
    </div>)}
  </div>;
}
