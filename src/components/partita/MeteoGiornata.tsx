// ============================================================
// MeteoGiornata — il meteo di una fascia del giorno nella partita: quattro icone, un tocco lo segna
// ============================================================
//
// Scelte dell'utente (2026-09-30): il meteo si segna nella partita separato per fascia («Sereno/Pioggia» della guida =
// sereno di giorno, pioggia di sera) e finché non lo segni vale quello della guida; il cambio è **diretto** — un tocco
// sull'icona salva, niente «Cambia» né conferma; le icone stanno sulla stessa riga di «Giorno» e «Sera» e valgono per la
// fascia attiva. Le allerte del gioco (polline, ondata di calore…) non si scelgono: le mostra l'app dalle date del catalogo.
//
// Toccare l'icona già segnata toglie la scelta e torna a quello della guida; toccare quella della guida (più tenue) la
// conferma come tua.
// ============================================================

import { IconaMeteo } from '../guida/MeteoIcona';
import { METEO_PARTITA, nomeMeteo, type MeteoPartita } from '../../../shared/meteoPartita';
import { NOME_FASCIA_METEO, descriviMeteoFascia } from '../../utils/meteoFascia';
import type { FasciaGioco, MeteoFasciaDto } from '../../types';

interface Props {
  fascia: FasciaGioco;
  meteo: MeteoFasciaDto;
  onCambia: (fascia: FasciaGioco, valore: MeteoPartita | null) => void;
  occupato?: boolean;
}

/** Le quattro icone del meteo di una fascia. */
export function MeteoGiornata({ fascia, meteo: f, onCambia, occupato }: Props) {
  return (
    <div className="meteo-fascia" role="group" aria-label={descriviMeteoFascia(fascia, f)}>
      {METEO_PARTITA.map((m) => {
        const scelto = f.meteo === m.chiave;
        const mio = scelto && f.origine === 'partita';
        const stile = scelto ? (mio ? 'chip--attivo' : 'chip--dalla-guida') : '';
        const nome = `${NOME_FASCIA_METEO[fascia]}: ${m.nome}`;
        return (
          <button key={m.chiave} type="button" className={`chip chip--icona touch justify-center ${stile}`} disabled={occupato}
            aria-pressed={mio}
            aria-label={mio ? `${nome} (segnato: tocca per tornare alla guida)` : scelto ? `${nome} (dalla guida: tocca per confermarlo)` : nome}
            title={mio ? `${m.nome}: segnato da te${f.guida && f.guida !== m.chiave ? ` (la guida dice ${nomeMeteo(f.guida).toLowerCase()})` : ''} — tocca per tornare alla guida` : scelto ? `${m.nome}: dalla guida — tocca per confermarlo` : m.nome}
            onClick={() => onCambia(fascia, mio ? null : m.chiave)}>
            <IconaMeteo chiave={m.chiave} dimensione={20} />
          </button>
        );
      })}
    </div>
  );
}
