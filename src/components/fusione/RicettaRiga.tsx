// ============================================================
// RicettaRiga — una ricetta di fusione: ingredienti (con evidenza della scorta), risultato, tipo, costo
// ============================================================

import { PersonaChip } from './PersonaChip';
import type { RicettaFusioneDto } from '../../types';
import { formattaYen } from '../../utils/punti';

const NOME_TIPO: Record<RicettaFusioneDto['tipo'], string> = {
  normale: 'Normale',
  'stesso-arcano': 'Stesso arcano',
  tesoro: 'Demone del Tesoro',
  speciale: 'Speciale',
};

/** Riga compatta; se `mostraRisultato` è false si mostrano solo gli ingredienti (elenco "per ottenere X"). */
export function RicettaRiga({ ricetta, inScorta, mostraRisultato = true }: { ricetta: RicettaFusioneDto; inScorta?: Set<number>; mostraRisultato?: boolean }) {
  const scorta = inScorta ?? new Set<number>();
  const tuttiInScorta = ricetta.ingredienti.every((i) => scorta.has(i.id));
  return (
    <li className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-2 text-[13px] ${tuttiInScorta ? 'bg-primary-bg -mx-2 px-2 rounded-md' : ''}`}>
      <span className="flex flex-wrap items-center gap-1.5 min-w-0">
      {ricetta.ingredienti.map((p, idx) => (
        <span key={p.id} className="flex items-center gap-1.5">
          <PersonaChip p={p} inScorta={scorta.has(p.id)} />
          {idx < ricetta.ingredienti.length - 1 && <span className="text-text-muted">+</span>}
        </span>
      ))}
      {mostraRisultato && (
        <>
          <span className="text-text-muted mx-1">→</span>
          <PersonaChip p={ricetta.risultato} evidenza inScorta={scorta.has(ricetta.risultato.id)} />
        </>
      )}
      </span>
      <span className="flex items-center justify-end gap-2 whitespace-nowrap">
        <span className="text-[12px] text-text-muted">{NOME_TIPO[ricetta.tipo]}</span>
        <span className="text-[12px] font-semibold tabular-nums w-[84px] text-right">{formattaYen(ricetta.costo)}</span>
        {tuttiInScorta && <span className="chip chip--attivo text-[11px]" title="Hai tutti gli ingredienti nella scorta">Pronta</span>}
      </span>
    </li>
  );
}
