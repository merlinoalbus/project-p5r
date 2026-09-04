// ============================================================
// PannelloEredita — skill ereditabili in una fusione A + B: slot, bacino per ingrediente, compatibilità, tratti
// ============================================================

import { getEredita } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { ElementoChip } from '../compendio/ElementoChip';
import { Spinner } from '../shared/PageState';

interface Props {
  a: number;
  b: number;
  partitaId: number | null;
}

/** Analisi dell'eredità per la coppia scelta nel calcolatore. */
export function PannelloEredita({ a, b, partitaId }: Props) {
  const { dati, caricamento, errore } = useCarica(() => getEredita(a, b, { partita: partitaId ?? undefined }), [a, b, partitaId]);
  if (errore) return <p className="m-0 text-[13px] text-text-muted">{errore}</p>;
  if (!dati) return caricamento ? <div className="flex justify-center py-3"><Spinner /></div> : null;
  const ereditabili = dati.candidate.filter((c) => c.ereditabile && !c.giaAppresa);
  const escluse = dati.candidate.filter((c) => !c.ereditabile || c.giaAppresa);
  return (
    <div className="flex flex-col gap-2" aria-label="Eredità delle skill">
      <div className="flex items-baseline gap-3 flex-wrap">
        <h3 className="m-0 text-[14px] font-semibold">Eredità delle skill</h3>
        <span className="text-[13px] text-text-secondary">
          Tipo <strong className="text-text">{dati.tipoNome ?? '—'}</strong> · skill dei genitori {dati.totaleSkillGenitori} → <strong className="text-text">{dati.slot}</strong> slot ({dati.slotScelti} a scelta, 1 casuale)
        </span>
      </div>
      <div className="text-[12px] text-text-muted">
        {dati.ingredienti.map((i) => `${i.persona.nomeIt}: ${i.skill.length} skill${i.daScorta ? ' (dalla scorta)' : ` (al livello ${i.livello})`}`).join(' · ')}
      </div>
      {ereditabili.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {ereditabili.map((c) => (
            <span key={c.id} title={`Portata da: ${c.da.map((id) => dati.ingredienti.find((i) => i.persona.id === id)?.persona.nomeIt ?? id).join(', ')}`}>
              <ElementoChip elemento={c.elemento} nome={c.nomeIt} piccolo />
            </span>
          ))}
        </div>
      ) : (
        <p className="m-0 text-[13px] text-text-muted">Nessuna skill ereditabile da questi ingredienti.</p>
      )}
      {escluse.length > 0 && (
        <details className="text-[12px] text-text-muted">
          <summary className="cursor-pointer touch flex items-center">Non ereditabili ({escluse.length})</summary>
          <ul className="m-0 mt-1 pl-4">
            {escluse.map((c) => <li key={c.id}>{c.nomeIt}: {c.motivo}</li>)}
          </ul>
        </details>
      )}
      {dati.tratti.length > 0 && (
        <div className="text-[13px]">
          <span className="text-text-secondary">Tratto (uno a scelta): </span>
          {dati.tratti.map((t, i) => (
            <span key={t.id} title={t.effettoNome}>
              {i > 0 && <span className="text-text-muted"> · </span>}
              <strong>{t.nomeIt}</strong>
              <span className="text-text-muted"> ({t.da === null ? 'proprio' : `da ${dati.ingredienti.find((x) => x.persona.id === t.da)?.persona.nomeIt ?? ''}`})</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
