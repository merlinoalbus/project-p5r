// ============================================================
// StatisticheBarre — Forza/Magia/Resistenza/Agilità/Fortuna con barre leggibili (scala 0–99)
// ============================================================
//
// Ogni riga: nome completo (sigla come titolo), barra piena in proporzione al tetto di 99 con
// tacche ogni 25 punti, valore grande; opzionale la differenza rispetto a una base e il totale.
// ============================================================

import type { StatisticheDto } from '../../types';
import { useGlossarioStore } from '../../stores/glossarioStore';
import { ORDINE_STATISTICHE, SIGLA_STATISTICA } from '../../utils/elementi';
import { MASSIMO_STATISTICA, totaleStatistiche } from '../../../shared/statistiche';

interface Props {
  statistiche: StatisticheDto;
  /** Statistiche da confrontare (mostra la differenza per riga). */
  base?: StatisticheDto;
  /** Didascalia sotto le barre (es. "Stimate al livello 20"). */
  didascalia?: string;
  /** Versione compatta per gli elenchi. */
  compatta?: boolean;
}

const NOMI: Record<string, string> = { forza: 'Forza', magia: 'Magia', resistenza: 'Resistenza', agilita: 'Agilità', fortuna: 'Fortuna' };

/** Cinque barre orizzontali con nome, valore, tacche e totale. */
export function StatisticheBarre({ statistiche, base, didascalia, compatta }: Props) {
  const glossario = useGlossarioStore((s) => s.glossario);
  const totale = totaleStatistiche(statistiche);
  return (
    <div className={`flex flex-col ${compatta ? 'gap-1' : 'gap-2'}`} role="table" aria-label="Statistiche">
      {ORDINE_STATISTICHE.map((k) => {
        const voce = glossario?.statistiche.find((s) => s.chiave === k);
        const nome = voce?.nome ?? NOMI[k] ?? k;
        const valore = statistiche[k];
        const diff = base ? valore - base[k] : 0;
        const quota = Math.min(100, (valore / MASSIMO_STATISTICA) * 100);
        return (
          <div key={k} className={`flex items-center gap-2 ${compatta ? 'text-[12px]' : 'text-[13px]'}`} role="row">
            <span className={`${compatta ? 'w-[68px]' : 'w-[88px]'} shrink-0 font-semibold text-text-secondary truncate`} title={`${nome} (${voce?.sigla ?? SIGLA_STATISTICA[k]})`} role="rowheader">
              {compatta ? (voce?.sigla ?? SIGLA_STATISTICA[k]) : nome}
            </span>
            <div
              className={`flex-1 ${compatta ? 'h-2' : 'h-3'} rounded-sm bg-bg-tertiary overflow-hidden relative`}
              role="cell"
              aria-label={`${nome}: ${valore} su ${MASSIMO_STATISTICA}`}
              style={{ backgroundImage: 'repeating-linear-gradient(to right, transparent 0, transparent calc(25% - 1px), var(--color-border) calc(25% - 1px), var(--color-border) 25%)' }}
            >
              <div className="h-full" style={{ width: `${quota}%`, background: 'linear-gradient(90deg, #b1261f, #e5352b)' }} />
            </div>
            <span className={`${compatta ? 'w-7 text-[13px]' : 'w-9 text-[16px]'} text-right font-black tabular-nums`} role="cell">{valore}</span>
            {base && <span className={`w-9 text-[11px] tabular-nums ${diff > 0 ? 'text-success' : diff < 0 ? 'text-error' : 'text-text-muted'}`} role="cell">{diff > 0 ? `+${diff}` : diff === 0 ? '—' : diff}</span>}
          </div>
        );
      })}
      {!compatta && (
        <div className="flex items-baseline justify-between gap-3 text-[12px] text-text-muted pt-0.5 flex-wrap">
          <span className="flex-1 min-w-[200px]">{didascalia ?? ''}</span>
          <span className="shrink-0">Totale <strong className="text-text tabular-nums">{totale}</strong> · scala 0–{MASSIMO_STATISTICA}</span>
        </div>
      )}
    </div>
  );
}
