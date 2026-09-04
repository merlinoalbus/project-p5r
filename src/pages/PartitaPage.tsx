// ============================================================
// PartitaPage — tracking della partita attiva: riepilogo, Doti, Confidenti, scorta, compendio, storico
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
import { StoricoPartita } from '../components/partita/StoricoPartita';
import { ObiettiviPartita } from '../components/partita/ObiettiviPartita';
import { PianiSalvati } from '../components/partita/PianiSalvati';
import { CicliSalvati } from '../components/partita/CicliSalvati';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { AssetImg } from '../components/shared/AssetImg';
import { IconAppunti, IconBersaglio, IconCarte, IconCiclo, IconLibro, IconOrologio, IconPersone, IconRiepilogo, IconStella } from '../components/shared/iconeGuida';
import type { ReactNode } from 'react';

type Scheda = 'riepilogo' | 'doti' | 'confidenti' | 'scorta' | 'compendio' | 'obiettivi' | 'piani' | 'cicli' | 'storico';

const SCHEDE: Array<{ k: Scheda; l: string; icona: ReactNode }> = [
  { k: 'doti', l: 'Doti sociali', icona: <IconStella size={15} /> },
  { k: 'confidenti', l: 'Confidenti', icona: <IconPersone size={15} /> },
  { k: 'scorta', l: 'Scorta', icona: <IconCarte size={15} /> },
  { k: 'compendio', l: 'Compendio personale', icona: <IconLibro size={15} /> },
  { k: 'obiettivi', l: 'Obiettivi', icona: <IconBersaglio size={15} /> },
  { k: 'piani', l: 'Piani salvati', icona: <IconAppunti size={15} /> },
  { k: 'cicli', l: 'Cicli', icona: <IconCiclo size={15} /> },
  { k: 'storico', l: 'Storico', icona: <IconOrologio size={15} /> },
  { k: 'riepilogo', l: 'Riepilogo', icona: <IconRiepilogo size={15} /> },
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
          <IntestazionePagina titolo={attiva.nome} compatta>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="chip">Liv. {attiva.livelloProtagonista}</span>
              {attiva.dataGioco && <span className="chip">{attiva.dataGioco}</span>}
              {attiva.nuovaPartitaPlus && <span className="chip">NG+</span>}
              {attiva.allarmeAttivo && <span className="chip chip--attivo">ALLARME</span>}
            </div>
          </IntestazionePagina>
          <div className="flex gap-1.5 flex-wrap">
            {SCHEDE.map((s) => (
              <button key={s.k} type="button" className={`chip chip--icona touch ${scheda === s.k ? 'chip--attivo' : ''}`} onClick={() => setParams({ scheda: s.k })} aria-pressed={scheda === s.k}><AssetImg nome={`ui/scheda-${s.k}`} alt="" decorativa className="h-4 w-4 object-contain" fallback={s.icona} />{s.l}</button>
            ))}
          </div>
          {scheda === 'riepilogo' && <RiepilogoPartita key={attiva.id} partita={attiva} />}
          {scheda === 'doti' && <DotiSociali partitaId={attiva.id} />}
          {scheda === 'confidenti' && <ConfidentiPartita partitaId={attiva.id} />}
          {scheda === 'scorta' && <ScortaPersona partitaId={attiva.id} />}
          {scheda === 'compendio' && <CompendioPersonale partitaId={attiva.id} />}
          {scheda === 'obiettivi' && <ObiettiviPartita key={attiva.id} partitaId={attiva.id} />}
          {scheda === 'piani' && <PianiSalvati key={attiva.id} partitaId={attiva.id} />}
          {scheda === 'cicli' && <CicliSalvati key={attiva.id} partitaId={attiva.id} />}
          {scheda === 'storico' && <StoricoPartita key={attiva.id} partitaId={attiva.id} />}
        </div>
      )}
      <NuovaPartitaModal aperta={nuova} onChiudi={() => setNuova(false)} />
    </PageState>
  );
}
