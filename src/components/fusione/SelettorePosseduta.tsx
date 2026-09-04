// ============================================================
// SelettorePosseduta — scelta di una Persona della scorta con miniatura, arcano e livello (al posto di una tendina)
// ============================================================

import { AnteprimaPersona } from '../shared/AnteprimaPersona';
import type { PersonaPossedutaDto } from '../../types';

interface Props {
  etichetta: string;
  persone: PersonaPossedutaDto[];
  sceltaId: number | null;
  onScegli: (id: number | null) => void;
  /** Istanza da nascondere (es. la ricevente non può essere anche sacrificio). */
  escludiId?: number | null;
}

/** Griglia di pulsanti con miniatura; una volta scelta la Persona resta visibile con «Cambia». */
export function SelettorePosseduta({ etichetta, persone, sceltaId, onScegli, escludiId = null }: Props) {
  const scelta = persone.find((p) => p.id === sceltaId) ?? null;
  return (
    <div className="flex flex-col gap-1.5" role="group" aria-label={etichetta}>
      <span className="form-label m-0">{etichetta}</span>
      {scelta ? (
        <div className="card flex items-center gap-3 py-2">
          <AnteprimaPersona nome={scelta.nome} etichetta={scelta.nomeIt} dimensione={48} />
          <span className="min-w-0 flex-1">
            <span className="block font-display uppercase text-[18px] leading-none truncate">{scelta.nomeIt}</span>
            <span className="block text-[12px] text-text-secondary">{scelta.arcanaNome} · livello {scelta.livello}</span>
          </span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onScegli(null)} aria-label={`Cambia ${etichetta}`}>Cambia</button>
        </div>
      ) : (
        <ul className="m-0 p-0 list-none grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[260px] overflow-y-auto" aria-label={`Scelte per ${etichetta}`}>
          {persone.filter((p) => p.id !== escludiId).map((p) => (
            <li key={p.id} className="min-w-0">
              <button type="button" className="w-full text-left flex items-center gap-2 card card--cliccabile py-1.5 px-2 touch" onClick={() => onScegli(p.id)} aria-label={`${etichetta}: ${p.nomeIt}`}>
                <AnteprimaPersona nome={p.nome} etichetta={p.nomeIt} dimensione={40} />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-[13px] truncate">{p.nomeIt}</span>
                  <span className="block text-[11px] text-text-muted truncate">{p.arcanaNome} · liv. {p.livello}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
