// ============================================================
// SceltaAreePlanimetria — le aree della guida che una planimetria contiene, da spuntare
// ============================================================
//
// **Una planimetria può contenere più aree della guida** (richiesta dell'utente, 2026-09-29): la
// tavola del primo piano del castello mostra insieme corridoio, sala e scalone, che la guida
// racconta come tre aree. Si spuntano tutte quelle che la tavola contiene, nell'ordine della guida.
//
// E **un'area può stare su più planimetrie** (decisione dell'utente, 2026-10-04, che supera quella del
// 2026-09-18 «un'area ha una sola planimetria»): spuntare un'area già legata a un'altra tavola la
// aggiunge anche qui, senza toglierla da lì. Accanto al nome si legge su quali altre tavole sta.
//
// Vive dentro la scheda della planimetria (`SchedaPlanimetria`, 2026-09-30): è un pezzo del modulo,
// non una finestra a sé.
// ============================================================

interface Props {
  /** Tutte le aree del Palazzo, in ordine di guida. */
  aree: Array<{ chiave: string; nome: string; ordine: number }>;
  spuntate: ReadonlySet<string>;
  onCambia: (spuntate: Set<string>) => void;
  /** Per ogni area legata ad **altre** planimetrie, i nomi di quelle. */
  altrove: ReadonlyMap<string, readonly string[]>;
}

/** Le aree del Palazzo come caselle da spuntare: accanto a quelle che stanno anche su altre planimetrie dice quali. */
export function SceltaAreePlanimetria({ aree, spuntate, onCambia, altrove }: Props) {
  /** Spunta o toglie un'area e passa al genitore un insieme nuovo (quello ricevuto non si modifica). */
  const cambia = (k: string) => { const n = new Set(spuntate); if (n.has(k)) n.delete(k); else n.add(k); onCambia(n); };
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0">
      <legend className="mb-1 p-0 text-[12px]">Aree della guida che contiene</legend>
      <ul className="m-0 flex list-none flex-col gap-1 p-0" aria-label="Aree del Palazzo">
        {aree.map((a) => {
          const dove = altrove.get(a.chiave) ?? [];
          const qui = spuntate.has(a.chiave);
          return (
            <li key={a.chiave}>
              <label className={`touch flex cursor-pointer items-start gap-2.5 rounded-md border px-2.5 py-2 ${qui ? 'border-primary bg-primary-bg' : 'border-border-light'}`}>
                <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0" checked={qui} onChange={() => cambia(a.chiave)} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold leading-tight">{a.ordine + 1}. {a.nome}</span>
                  {dove.length > 0 && <span className="block text-[11px] leading-tight text-text-muted">{qui ? 'anche' : 'ora'} su {dove.map((d) => `«${d}»`).join(', ')}</span>}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
