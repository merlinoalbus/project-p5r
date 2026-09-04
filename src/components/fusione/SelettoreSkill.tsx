// ============================================================
// SelettoreSkill — scelta di più skill (fino a un massimo) con ricerca per nome italiano, canonico o effetto
// ============================================================

import { useMemo, useState } from 'react';
import { CampoRicerca } from '../shared/CampoRicerca';
import { ElementoChip } from '../compendio/ElementoChip';
import type { SkillRiassuntoDto } from '../../types';

interface Props {
  skill: SkillRiassuntoDto[];
  scelte: SkillRiassuntoDto[];
  onCambia: (s: SkillRiassuntoDto[]) => void;
  massimo?: number;
  etichetta?: string;
  /** Escludi i tratti (non si propagano come skill). */
  senzaTratti?: boolean;
}

/** Chip delle skill scelte (tocco = rimuovi) più campo di ricerca con elenco a discesa. */
export function SelettoreSkill({ skill, scelte, onCambia, massimo = 4, etichetta = 'Skill desiderate', senzaTratti = true }: Props) {
  const [q, setQ] = useState('');
  const candidate = useMemo(() => {
    const testo = q.trim().toLowerCase();
    if (!testo) return [];
    const ids = new Set(scelte.map((s) => s.id));
    return skill
      .filter((s) => (!senzaTratti || s.elemento !== 'trait') && !ids.has(s.id) && (s.nomeIt.toLowerCase().includes(testo) || s.nome.toLowerCase().includes(testo) || s.effettoNome.toLowerCase().includes(testo)))
      .slice(0, 10);
  }, [q, skill, scelte, senzaTratti]);
  return (
    <div className="card flex flex-col gap-2">
      <span className="text-[12px] uppercase tracking-wide text-text-muted">{etichetta} ({scelte.length}/{massimo})</span>
      <div className="flex flex-wrap gap-1.5">
        {scelte.map((s) => (
          <button key={s.id} type="button" className="chip chip--attivo touch" onClick={() => onCambia(scelte.filter((x) => x.id !== s.id))} aria-label={`Rimuovi ${s.nomeIt}`} title="Tocca per rimuovere">
            {s.nomeIt} ×
          </button>
        ))}
        {scelte.length === 0 && <span className="text-[13px] text-text-muted">Nessuna skill scelta: cerca qui sotto.</span>}
      </div>
      {scelte.length < massimo && (
        <>
          <CampoRicerca valore={q} onCambia={setQ} segnaposto="Cerca una skill (nome o effetto)…" />
          {candidate.length > 0 && (
            <ul className="m-0 p-0 list-none flex flex-col divide-y divide-border-light max-h-[260px] overflow-y-auto" role="listbox" aria-label="Skill trovate">
              {candidate.map((s) => (
                <li key={s.id} role="option" aria-selected={false}>
                  <button type="button" className="w-full text-left flex items-center gap-2 py-2 bg-transparent border-none text-text cursor-pointer hover:text-primary touch" onClick={() => { onCambia([...scelte, s]); setQ(''); }}>
                    <ElementoChip elemento={s.elemento} nome={s.elementoNome} piccolo />
                    <span className="font-semibold">{s.nomeIt}</span>
                    <span className="text-[12px] text-text-secondary truncate flex-1">{s.effettoNome}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
