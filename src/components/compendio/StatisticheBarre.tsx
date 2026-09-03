// ============================================================
// StatisticheBarre — FR/MA/RS/AG/FO con barre proporzionali (cap 99)
// ============================================================

import type { StatisticheDto } from '../../types';
import { useGlossarioStore } from '../../stores/glossarioStore';
import { ORDINE_STATISTICHE, SIGLA_STATISTICA } from '../../utils/elementi';

interface Props {
  statistiche: StatisticheDto;
  /** Statistiche base da confrontare (mostra la differenza). */
  base?: StatisticheDto;
}

/** Cinque barre orizzontali con sigla, valore e differenza rispetto alla base. */
export function StatisticheBarre({ statistiche, base }: Props) {
  const glossario = useGlossarioStore((s) => s.glossario);
  return (
    <div className="flex flex-col gap-1.5">
      {ORDINE_STATISTICHE.map((k) => {
        const voce = glossario?.statistiche.find((s) => s.chiave === k);
        const valore = statistiche[k];
        const diff = base ? valore - base[k] : 0;
        return (
          <div key={k} className="flex items-center gap-2 text-[13px]">
            <span className="w-8 font-bold text-text-secondary" title={voce?.nome}>{voce?.sigla ?? SIGLA_STATISTICA[k]}</span>
            <div className="flex-1 h-2.5 rounded-full bg-bg-tertiary overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (valore / 99) * 100)}%` }} />
            </div>
            <span className="w-8 text-right font-semibold tabular-nums">{valore}</span>
            {base && diff !== 0 && <span className={`w-9 text-[11px] ${diff > 0 ? 'text-success' : 'text-error'}`}>{diff > 0 ? `+${diff}` : diff}</span>}
          </div>
        );
      })}
    </div>
  );
}
