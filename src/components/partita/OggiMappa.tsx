// ============================================================
// OggiMappa — la mappa della scheda «Oggi»: la stessa Tokyo della Città, e sotto i livelli dell'atlante
// ============================================================
//
// **Al livello di Tokyo si vede la mappa disegnata**, la stessa de «La città», e non più la
// planimetria dell'atlante: erano due rappresentazioni diverse della stessa città dentro la stessa
// app, e chi imparava l'una doveva reimparare l'altra. Richiesta dell'utente, ed è la coerenza
// che mancava.
//
// Sotto Tokyo — dentro un quartiere, dentro un Palazzo — resta il visore dell'atlante, che è
// quello che sa disegnare le planimetrie e seguire l'azione scelta con «Sulla mappa».
//
// Il clic su un quartiere **non cambia pagina**: scende di livello restando qui. Uscire dalla
// scheda «Oggi» per guardare una mappa vorrebbe dire perdere il giorno che si sta guardando, che
// è tutto il motivo per cui questa colonna esiste.
// ============================================================

import { useEffect, useRef } from 'react';
import { MappaIncorporata } from '../mappe/MappaIncorporata';
import { MappaTokyo } from '../mappe/MappaTokyo';
import { getDungeons, getQuartieri } from '../../services/api';
import { radiciMetaverso } from '../../utils/palazzi';
import { useCarica } from '../../hooks/useCarica';
import { usePartitaStore } from '../../stores/partitaStore';
import type { Oggi } from '../../hooks/useOggi';

interface Props {
  oggi: Oggi;
  /** Riempie l'altezza della colonna invece di usare un'altezza fissa. */
  riempi?: boolean;
}

/** La colonna della mappa, sullo stato condiviso `oggi`: al livello di Tokyo la `MappaTokyo` della
 * città (quartieri e radici del Metaverso caricati solo lì, alla data della partita attiva), il cui
 * clic su un cartellino d'atlante scende di livello senza cambiare pagina; sotto Tokyo la
 * `MappaIncorporata` sulla mappa corrente, centrata sullo spillo scelto, con «Torna a Tokyo». */
export function OggiMappa({ oggi, riempi }: Props) {
  const { mappa } = oggi;
  const attiva = usePartitaStore((s) => s.attiva);
  const suTokyo = mappa.chiave === 'tokyo';
  // Si caricano solo quando servono davvero, cioè al livello di Tokyo.
  const quartieri = useCarica(() => (suTokyo ? getQuartieri(oggi.partitaId) : Promise.resolve([])), [suTokyo, oggi.partitaId]);
  // con la partita: un Palazzo completato sulla mappa di Tokyo non c'è più; col suo giorno, che decide dove si atterra
  // toccando un Palazzo (`atterraggio`, 2026-10-04)
  const dungeon = useCarica(async () => (suTokyo ? radiciMetaverso(await getDungeons(oggi.partitaId)) : []), [suTokyo, oggi.partitaId, attiva?.dataGioco]);

  // Una voce della giornata ha chiesto la mappa («Sulla mappa», il cartellino di un Palazzo): se la colonna è fuori dallo
  // schermo — sul telefono sta in fondo, sotto la guida — la pagina ci scorre (scelta dell'utente, 2026-10-04). Se è già in
  // vista non si muove niente. Il primo disegno non conta: nessuno l'ha chiesta.
  const colonna = useRef<HTMLDivElement>(null);
  const richiestaVista = useRef(mappa.richiesta);
  useEffect(() => {
    if (richiestaVista.current === mappa.richiesta) return;
    richiestaVista.current = mappa.richiesta;
    const r = colonna.current?.getBoundingClientRect();
    if (r && (r.top < 0 || r.top >= window.innerHeight)) colonna.current!.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [mappa.richiesta]);

  return (
    <div ref={colonna} className={`flex flex-col gap-1.5 min-w-0 ${riempi ? 'md:min-h-0' : ''}`}>
      <div className="flex items-center gap-2 flex-wrap text-[12px] text-text-muted shrink-0">
        <span>Mappa{mappa.azione !== null ? ' dell’azione scelta' : ' di Tokyo'}: tocca un quartiere o un passaggio per scendere di livello.</span>
        {!suTokyo && <button type="button" className="visore-mappa__azione-testo" onClick={oggi.tornaAllaMappaGlobale}>Torna a Tokyo</button>}
      </div>
      {suTokyo ? (
        <MappaTokyo
          riempi={riempi}
          quartieri={quartieri.dati ?? []}
          dungeon={dungeon.dati ?? []}
          dataGioco={attiva?.dataGioco ?? null}
          // La metro dice dove scendere (L2): l'area d'ingresso di un quartiere col suo centro, o la planimetria d'arrivo di un
          // Palazzo col suo pin. Prima l'indirizzo si interpretava con un'espressione regolare e il centro dell'ingresso si perdeva.
          // Dove non c'è nulla su cui scendere (il Covo) il cartellino resta un collegamento.
          onApri={(_href, d) => { if (!d) return false; oggi.apriMappa(d.mappa, d.spillo, d.centro); return true; }}
        />
      ) : (
        <MappaIncorporata
          chiave={mappa.chiave}
          spilloIniziale={mappa.spilloId}
          puntoIniziale={mappa.centro ?? null}
          partitaId={oggi.partitaId}
          altezza={riempi ? undefined : 'max(560px, calc(100vh - 300px))'}
          className={riempi ? 'md:flex-1 md:min-h-0 h-[420px] md:h-auto' : undefined}
        />
      )}
    </div>
  );
}
