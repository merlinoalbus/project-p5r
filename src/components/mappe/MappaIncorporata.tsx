// ============================================================
// MappaIncorporata — visore a altezza fissa dentro una pagina (Città, quartiere, area di un Palazzo, home della Partita) — Fase 13.4
// ============================================================
//
// Stesso visore dello schermo intero: navigazione fra i livelli apre la pagina a schermo intero; «Modifica mappa» apre l'editor.
// ============================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePartitaStore } from '../../stores/partitaStore';
import { useMappaPartita } from '../../hooks/useMappaPartita';
import { VisoreMappa } from './VisoreMappa';
import { CollegamentoVisivo, PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { Spinner } from '../shared/PageState';

interface Props {
  chiave: string;
  /** Cambia per forzare un nuovo caricamento (es. dopo un'azione della pagina ospite). */
  versione?: string | number;
  /** Avvisa la pagina ospite dopo un'azione salvata dal visore (raccolto, punto della Guida, acquisto). */
  onCambiato?: () => void;
  /** Altezza del riquadro (numero in px o espressione CSS, es. `calc(100vh - 220px)`); predefinita 560 px. */
  altezza?: number | string;
  className?: string;
  /** Spillo da selezionare e centrare all'apertura. */
  spilloIniziale?: number | null;
  /** Partita per lo stato degli spilli (predefinita: quella attiva). */
  partitaId?: number | null;
}

export function MappaIncorporata({ chiave, versione, onCambiato, altezza, className, spilloIniziale, partitaId: partitaEsplicita }: Props) {
  const navigate = useNavigate();
  const attiva = usePartitaStore((s) => s.attiva);
  const partitaId = partitaEsplicita !== undefined ? partitaEsplicita : attiva?.id ?? null;
  const { mappa, caricamento, errore, ricarica, raccolto, statoPunto, acquisto } = useMappaPartita(chiave, partitaId, { versione, onCambiato });
  // Schermo intero in pagina: stessa istanza del visore (zoom e selezione restano), «Torna alla pagina» o Esc per rientrare
  const [intero, setIntero] = useState(false);
  useEffect(() => {
    if (!intero) return;
    const suTasto = (e: KeyboardEvent) => { if (e.key === 'Escape') setIntero(false); };
    window.addEventListener('keydown', suTasto);
    return () => window.removeEventListener('keydown', suTasto);
  }, [intero]);
  if (!mappa && caricamento) return <div className="flex items-center justify-center py-10 text-text-muted" aria-busy="true"><Spinner /></div>;
  if (!mappa) {
    return (
      <div className="card flex flex-col gap-2 text-[13px] text-text-secondary" role="status">
        <span>{errore ? `Mappa «${chiave}» non disponibile: ${errore}` : `Nessuna mappa «${chiave}».`}</span>
        <div className="flex gap-1.5"><CollegamentoVisivo to="/guida/mappe" tono="secondario" compatto icona={<IconaAzione chiave="mappa" dimensione={20} />} titolo="Tutte le mappe" />{errore && <button type="button" className="visore-mappa__azione-testo" onClick={() => void ricarica()}>Riprova</button>}</div>
      </div>
    );
  }
  return (
    <div className={className} style={altezza !== undefined ? { height: altezza } : className ? undefined : { height: 560 }}>
      <VisoreMappa
        key={`${mappa.chiave}-${spilloIniziale ?? ''}`}
        mappa={mappa}
        partitaId={partitaId}
        selezioneIniziale={spilloIniziale ?? null}
        incorporato={!intero}
        onNaviga={(k) => navigate(`/guida/mappe/${encodeURIComponent(k)}`)}
        onRaccolto={raccolto}
        onStatoPunto={statoPunto}
        onAcquisto={acquisto}
        onChiudi={intero ? () => setIntero(false) : undefined}
        etichettaChiudi="Torna alla pagina"
        azioni={<>
          {!intero && <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="ingrandisci" dimensione={20} />} titolo="Schermo intero" onClick={() => setIntero(true)} />}
          <CollegamentoVisivo to={`/guida/mappe/${encodeURIComponent(mappa.chiave)}/modifica`} tono="fantasma" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica mappa" />
        </>}
      />
    </div>
  );
}
