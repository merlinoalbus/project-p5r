// ============================================================
// PartitaPage — tracking della partita attiva: riepilogo, Doti, Confidenti, scorta, compendio
// ============================================================

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { PageState, EmptyState } from '../components/shared/PageState';
import { NuovaPartitaModal } from '../components/partita/NuovaPartitaModal';
import { RiepilogoPartita } from '../components/partita/RiepilogoPartita';
import { DotiSociali } from '../components/partita/DotiSociali';
import { ConfidentiPartita } from '../components/partita/ConfidentiPartita';
import { ScortaPersona } from '../components/partita/ScortaPersona';
import { CompendioPersonale } from '../components/partita/CompendioPersonale';

type Scheda = 'riepilogo' | 'doti' | 'confidenti' | 'scorta' | 'compendio';

const SCHEDE: Array<{ k: Scheda; l: string }> = [
  { k: 'doti', l: 'Doti sociali' },
  { k: 'confidenti', l: 'Confidenti' },
  { k: 'scorta', l: 'Scorta' },
  { k: 'compendio', l: 'Compendio personale' },
  { k: 'riepilogo', l: 'Riepilogo' },
];

/** Pagina della partita attiva con schede; senza partite propone la creazione. */
export function PartitaPage() {
  useDocumentTitle('Partita');
  const { attiva, caricamento, caricata, errore, carica } = usePartitaStore();
  const [nuova, setNuova] = useState(false);
  const [params, setParams] = useSearchParams();
  const richiesta = params.get('scheda');
  const scheda: Scheda = SCHEDE.some((s) => s.k === richiesta) ? (richiesta as Scheda) : 'doti';

  return (
    <PageState isLoading={caricamento && !caricata} error={errore} onRetry={() => void carica()}>
      {!attiva ? (
        <EmptyState
          title="Nessuna partita attiva"
          hint="Crea la tua prima partita: potrai tracciare Doti sociali, Confidenti, Persona possedute e compendio. Puoi gestire più partite e passare dall'una all'altra dalla barra in alto."
          action={<button type="button" className="btn btn-primary" onClick={() => setNuova(true)}>Crea partita</button>}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="m-0 text-2xl font-bold">{attiva.nome}</h1>
            <span className="chip">Liv. {attiva.livelloProtagonista}</span>
            {attiva.dataGioco && <span className="chip">{attiva.dataGioco}</span>}
            {attiva.nuovaPartitaPlus && <span className="chip">NG+</span>}
            {attiva.allarmeAttivo && <span className="chip chip--attivo">ALLARME</span>}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {SCHEDE.map((s) => (
              <button key={s.k} type="button" className={`chip touch ${scheda === s.k ? 'chip--attivo' : ''}`} onClick={() => setParams({ scheda: s.k })} aria-pressed={scheda === s.k}>{s.l}</button>
            ))}
          </div>
          {scheda === 'riepilogo' && <RiepilogoPartita key={attiva.id} partita={attiva} />}
          {scheda === 'doti' && <DotiSociali partitaId={attiva.id} />}
          {scheda === 'confidenti' && <ConfidentiPartita partitaId={attiva.id} />}
          {scheda === 'scorta' && <ScortaPersona partitaId={attiva.id} />}
          {scheda === 'compendio' && <CompendioPersonale partitaId={attiva.id} />}
        </div>
      )}
      <NuovaPartitaModal aperta={nuova} onChiudi={() => setNuova(false)} />
    </PageState>
  );
}
