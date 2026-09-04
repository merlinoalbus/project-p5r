// ============================================================
// OggiMappa — colonna della mappa della scheda «Oggi»: parte da Tokyo e segue l'azione scelta con «Sulla mappa» (Fase 13.5)
// ============================================================

import { MappaIncorporata } from '../mappe/MappaIncorporata';
import type { Oggi } from '../../hooks/useOggi';

interface Props {
  oggi: Oggi;
  /** Riempie l'altezza della colonna invece di usare un'altezza fissa. */
  riempi?: boolean;
}

export function OggiMappa({ oggi, riempi }: Props) {
  const { mappa } = oggi;
  return (
    <div className={`flex flex-col gap-1.5 min-w-0 ${riempi ? 'md:min-h-0' : ''}`}>
      <div className="flex items-center gap-2 flex-wrap text-[12px] text-text-muted shrink-0">
        <span>Mappa{mappa.azione !== null ? ' dell’azione scelta' : ' di Tokyo'}: tocca un quartiere o un passaggio per scendere di livello.</span>
        {mappa.chiave !== 'tokyo' && <button type="button" className="visore-mappa__azione-testo" onClick={oggi.tornaAllaMappaGlobale}>Torna a Tokyo</button>}
      </div>
      <MappaIncorporata
        chiave={mappa.chiave}
        spilloIniziale={mappa.spilloId}
        partitaId={oggi.partitaId}
        altezza={riempi ? undefined : 'max(560px, calc(100vh - 300px))'}
        className={riempi ? 'md:flex-1 md:min-h-0 h-[420px] md:h-auto' : undefined}
      />
    </div>
  );
}
