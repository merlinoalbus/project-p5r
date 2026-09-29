// ============================================================
// SceltaAreePlanimetria — le aree della guida che una planimetria contiene, da spuntare
// ============================================================
//
// **Una planimetria può contenere più aree della guida** (richiesta dell'utente, 2026-09-29): la
// tavola del primo piano del castello mostra insieme corridoio, sala e scalone, che la guida
// racconta come tre aree. Si spuntano tutte quelle che la tavola contiene, nell'ordine della guida.
//
// Resta vero che **un'area ha una sola planimetria** (decisione del 2026-09-18): un'area già legata a
// un'altra tavola lo dice accanto al nome, e spuntarla la sposta qui — lo fa il server, e il riepilogo
// in cima lo scrive prima di salvare, così nessun legame sparisce senza che lo si sia visto.
//
// Vive dentro la scheda della planimetria (`SchedaPlanimetria`, 2026-09-30): è un pezzo del modulo,
// non una finestra a sé.
// ============================================================

interface Props {
  /** Tutte le aree del Palazzo, in ordine di guida. */
  aree: Array<{ chiave: string; nome: string; ordine: number }>;
  spuntate: ReadonlySet<string>;
  onCambia: (spuntate: Set<string>) => void;
  /** Per ogni area legata a **un'altra** planimetria, il nome di quella. */
  altrove: ReadonlyMap<string, string>;
}

export function SceltaAreePlanimetria({ aree, spuntate, onCambia, altrove }: Props) {
  const cambia = (k: string) => { const n = new Set(spuntate); if (n.has(k)) n.delete(k); else n.add(k); onCambia(n); };
  const spostate = aree.filter((a) => spuntate.has(a.chiave) && altrove.has(a.chiave));
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0">
      <legend className="mb-1 p-0 text-[12px]">Aree della guida che contiene</legend>
      {/* Sopra l'elenco e sempre montato: si vede senza scorrere, e un lettore di schermo annuncia la regione viva. */}
      <p className="m-0 text-[12px] text-text-secondary empty:hidden" role="status">
        {spostate.length > 0 && <>{spostate.length === 1 ? 'Un’area lascia la planimetria dove stava' : `${spostate.length} aree lasciano la planimetria dove stavano`}: {spostate.map((a) => a.nome).join(', ')}.</>}
      </p>
      <ul className="m-0 flex list-none flex-col gap-1 p-0" aria-label="Aree del Palazzo">
        {aree.map((a) => {
          const dove = altrove.get(a.chiave);
          const qui = spuntate.has(a.chiave);
          return (
            <li key={a.chiave}>
              <label className={`touch flex cursor-pointer items-start gap-2.5 rounded-md border px-2.5 py-2 ${qui ? 'border-primary bg-primary-bg' : 'border-border-light'}`}>
                <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0" checked={qui} onChange={() => cambia(a.chiave)} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold leading-tight">{a.ordine + 1}. {a.nome}</span>
                  {dove && <span className="block text-[11px] leading-tight text-text-muted">{qui ? `si sposta qui da «${dove}»` : `ora su «${dove}»`}</span>}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
