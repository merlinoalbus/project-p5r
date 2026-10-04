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

/** Dall'indirizzo del cartellino alla chiave della mappa, per scendere senza cambiare pagina.
 *
 * I cartellini portano a `/guida/mappe/<chiave>` (a volte con `?x&y&zoom`) oppure a
 * `/guida/mondo/...` e `/guida/covo` per i pochi che un nodo d'atlante non ce l'hanno. Solo i
 * primi si possono aprire qui dentro: per gli altri si lascia fare al collegamento. Un `?spillo=` (il pin d'arrivo
 * dell'atterraggio di un Palazzo) passa con la chiave, per aprire la planimetria centrata su quel pin. */
function mappaDaHref(href: string): { chiave: string; spillo: number | null } | null {
  const m = /^\/guida\/mappe\/([^/?#]+)(?:\?spillo=(\d+))?/.exec(href);
  return m ? { chiave: decodeURIComponent(m[1]), spillo: m[2] ? Number(m[2]) : null } : null;
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

  return (
    <div className={`flex flex-col gap-1.5 min-w-0 ${riempi ? 'md:min-h-0' : ''}`}>
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
          onApri={(href) => { const m = mappaDaHref(href); if (!m) return false; oggi.apriMappa(m.chiave, m.spillo); return true; }}
        />
      ) : (
        <MappaIncorporata
          chiave={mappa.chiave}
          spilloIniziale={mappa.spilloId}
          partitaId={oggi.partitaId}
          altezza={riempi ? undefined : 'max(560px, calc(100vh - 300px))'}
          className={riempi ? 'md:flex-1 md:min-h-0 h-[420px] md:h-auto' : undefined}
        />
      )}
    </div>
  );
}
