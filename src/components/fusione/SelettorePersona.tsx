// ============================================================
// SelettorePersona — scelta di una Persona con ricerca (nome italiano, canonico o arcano)
// ============================================================

import { useMemo, useState } from 'react';
import { CampoRicerca } from '../shared/CampoRicerca';
import { ImmagineEntita } from '../shared/ImmagineEntita';
import type { PersonaRiassuntoDto } from '../../types';

interface Props {
  etichetta: string;
  persone: PersonaRiassuntoDto[];
  scelta: PersonaRiassuntoDto | null;
  onScegli: (p: PersonaRiassuntoDto | null) => void;
  /** Escludi i Demoni del Tesoro (non fondibili come risultato). */
  senzaRare?: boolean;
  /** Id delle Persona in scorta, evidenziate nell'elenco. */
  inScorta?: Set<number>;
}

/** Campo di ricerca con elenco a discesa; la Persona scelta è mostrata con immagine, arcano e livello. */
export function SelettorePersona({ etichetta, persone, scelta, onScegli, senzaRare, inScorta }: Props) {
  const [q, setQ] = useState('');
  const candidate = useMemo(() => {
    const testo = q.trim().toLowerCase();
    if (!testo) return [];
    return persone
      .filter((p) => (!senzaRare || !p.rara) && (p.nome.toLowerCase().includes(testo) || p.nomeIt.toLowerCase().includes(testo) || p.arcanaNome.toLowerCase().includes(testo)))
      .sort((a, b) => a.livello - b.livello)
      .slice(0, 12);
  }, [q, persone, senzaRare]);

  if (scelta) {
    return (
      <div className="card flex items-center gap-3">
        <ImmagineEntita ambito="persona" chiave={scelta.nome} etichetta={scelta.nomeIt} dimensione={64} />
        <div className="flex-1 min-w-0">
          <div className="text-[12px] uppercase tracking-wide text-text-muted">{etichetta}</div>
          <div className="font-semibold text-[15px]">{scelta.nomeIt}{scelta.nomeIt !== scelta.nome && <span className="text-[12px] font-normal text-text-muted"> {scelta.nome}</span>}</div>
          <div className="text-[12px] text-text-secondary">{scelta.arcanaNome} · livello {scelta.livello}{scelta.rara ? ' · Demone del Tesoro' : ''}{scelta.speciale ? ' · speciale' : ''}{scelta.dlc ? ' · DLC' : ''}</div>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onScegli(null)} aria-label={`Cambia ${etichetta}`}>Cambia</button>
      </div>
    );
  }

  return (
    <div className="card flex flex-col gap-2 relative">
      <span className="text-[12px] uppercase tracking-wide text-text-muted">{etichetta}</span>
      <CampoRicerca valore={q} onCambia={setQ} segnaposto="Cerca per nome o arcano…" />
      {candidate.length > 0 && (
        <ul className="m-0 p-0 list-none flex flex-col divide-y divide-border-light max-h-[280px] overflow-y-auto" role="listbox" aria-label={`Risultati per ${etichetta}`}>
          {candidate.map((p) => (
            <li key={p.id} role="option" aria-selected={false}>
              <button type="button" className="w-full text-left flex items-center gap-3 py-2 bg-transparent border-none text-text cursor-pointer hover:text-primary touch" onClick={() => { onScegli(p); setQ(''); }}>
                <span className="w-9 text-right text-[12px] text-text-muted">Liv. {p.livello}</span>
                <span className="font-semibold flex-1 truncate">{p.nomeIt}{p.nomeIt !== p.nome && <span className="text-[12px] font-normal text-text-muted"> {p.nome}</span>}</span>
                <span className="chip">{p.arcanaNome}</span>
                {inScorta?.has(p.id) && <span className="chip chip--attivo" title="Nella scorta">Scorta</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {q.trim() && candidate.length === 0 && <span className="text-[13px] text-text-muted">Nessuna Persona trovata.</span>}
    </div>
  );
}
