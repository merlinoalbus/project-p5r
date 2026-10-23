// ============================================================
// OggiPartita — scheda «Oggi» della Partita: la guida del giorno corrente accanto alla mappa globale navigabile (Fase 12.4 / 13.5)
// ============================================================
//
// A sinistra la guida del giorno (azioni con spunta, consigliate in oro, bloccate in grigio con motivo); a destra (sotto, su schermi
// stretti) il visore incorporato: parte da Tokyo e si sposta sulla mappa dell'azione scelta con «Sulla mappa», centrata sullo spillo.
// Nella Home le due colonne vivono in punti diversi della pagina e condividono lo stato tramite `useOggi`.
// ============================================================

import { useEffect, useRef } from 'react';
import { useOggi } from '../../hooks/useOggi';
import { PageState } from '../shared/PageState';
import { OggiGuida } from './OggiGuida';
import { OggiMappa } from './OggiMappa';
import type { PartitaDto } from '../../types';

interface Props {
  partita: PartitaDto;
  /** Occupa tutta l'altezza del contenitore (schermate senza scorrimento): la guida scorre nel suo riquadro, la mappa riempie la colonna. */
  riempi?: boolean;
  /** Riceve il giorno (MM-GG) che la scheda sta mostrando, a ogni cambio (quando il giorno nuovo è caricato, mai un vuoto di
   *  passaggio), e `null` quando la scheda si chiude: l'intestazione della Partita ci allinea le scorciatoie della scuola (`ScuolaOggi`). */
  onGiorno?: (giorno: string | null) => void;
}

/** Crea lo stato `useOggi` della partita e, a caricamento finito, affianca le colonne guida e mappa
 * (in colonna sugli schermi stretti); con `riempi` le colonne occupano l'altezza del contenitore. */
export function OggiPartita({ partita, riempi, onGiorno }: Props) {
  const oggi = useOggi(partita.id);
  const giornoMostrato = oggi.giorno?.giorno ?? null;
  // il richiamo in un ref: una funzione nuova a ogni disegno del chiamante non deve far ripartire gli avvisi
  const avvisa = useRef(onGiorno);
  useEffect(() => { avvisa.current = onGiorno; });
  // mentre il giorno nuovo si carica `useCarica` dà `null`: non si avvisa, così l'intestazione non ripiega per un attimo sulla
  // data di gioco e resta sull'ultimo giorno mostrato finché arriva quello nuovo
  useEffect(() => {
    if (giornoMostrato) avvisa.current?.(giornoMostrato);
  }, [giornoMostrato]);
  // la scheda si chiude (altra scheda, altra partita): l'intestazione torna alla data di gioco
  useEffect(() => () => avvisa.current?.(null), []);
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
