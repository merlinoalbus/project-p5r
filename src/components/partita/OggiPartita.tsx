// ============================================================
// OggiPartita — scheda «Oggi» della Partita: la guida del giorno corrente accanto alla mappa globale navigabile (Fase 12.4 / 13.5)
// ============================================================
//
// A sinistra la guida del giorno (azioni con spunta, consigliate in oro, bloccate in grigio con motivo); a destra (sotto, su schermi
// stretti) il visore incorporato: parte da Tokyo e si sposta sulla mappa dell'azione scelta con «Sulla mappa», centrata sullo spillo.
// Nella Home le due colonne vivono in punti diversi della pagina e condividono lo stato tramite `useOggi`.
// ============================================================

import { useOggi } from '../../hooks/useOggi';
import { PageState } from '../shared/PageState';
import { OggiGuida } from './OggiGuida';
import { OggiMappa } from './OggiMappa';
import type { PartitaDto } from '../../types';

interface Props {
  partita: PartitaDto;
  /** Occupa tutta l'altezza del contenitore (schermate senza scorrimento): la guida scorre nel suo riquadro, la mappa riempie la colonna. */
  riempi?: boolean;
}

export function OggiPartita({ partita, riempi }: Props) {
  const oggi = useOggi(partita.id);
  return (
    <PageState isLoading={oggi.caricamento} error={oggi.errore} onRetry={() => void oggi.ricarica()}>
      {oggi.indice && oggi.giorno && (
        <div className={`grid grid-cols-1 gap-4 ${riempi ? 'md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:h-full md:min-h-0 items-stretch' : 'xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start'}`}>
          <OggiGuida oggi={oggi} riempi={riempi} />
          <OggiMappa oggi={oggi} riempi={riempi} />
        </div>
      )}
    </PageState>
  );
}
