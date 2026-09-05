// ============================================================
// OggiGuida — colonna della guida del giorno: navigazione fra i giorni, «Segna come giorno corrente» e le azioni (Fase 12.4 / 13.5)
// ============================================================

import { GiornoGuida } from '../guida/GiornoGuida';
import { PulsanteVisivo, CollegamentoVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { AssetImg } from '../shared/AssetImg';
import { IconChevronLeft, IconChevronRight } from '../shared/icons';
import { IconLuna, IconSole } from '../shared/iconeGuida';
import { dataGiocoTesto } from '../../utils/dateGioco';
import type { Oggi } from '../../hooks/useOggi';
import type { FasciaGioco } from '../../types';

/** Icona della fascia: asset `ui/giorno` / `ui/sera` con riserva sole / luna (come nelle intestazioni della guida). */
function IconaFascia({ fascia }: { fascia: FasciaGioco }) {
  const sera = fascia === 'sera';
  return <AssetImg nome={`ui/${fascia}`} alt="" decorativa className="w-5 h-5 object-contain" fallback={<span className={`inline-flex ${sera ? 'text-info' : 'text-warning'}`}>{sera ? <IconLuna size={20} /> : <IconSole size={20} />}</span>} />;
}

interface Props {
  oggi: Oggi;
  /** Scorre nel proprio riquadro invece di allungare la pagina (schermate senza scorrimento). */
  riempi?: boolean;
}

export function OggiGuida({ oggi, riempi }: Props) {
  const { giorno: g, indice } = oggi;
  if (!g || !indice) return null;
  return (
    <div className={`flex flex-col gap-2 min-w-0 ${riempi ? 'md:min-h-0' : ''}`}>
      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
        <button type="button" className="btn btn-secondary btn-sm touch" disabled={!g.precedente} onClick={() => oggi.vaiAlGiorno(g.precedente)} aria-label="Giorno precedente"><IconChevronLeft size={16} /></button>
        <span className="font-display text-[19px] uppercase">{dataGiocoTesto(g.giorno)}</span>
        <button type="button" className="btn btn-secondary btn-sm touch" disabled={!g.successivo} onClick={() => oggi.vaiAlGiorno(g.successivo)} aria-label="Giorno successivo"><IconChevronRight size={16} /></button>
        {g.dataCorrente === g.giorno
          ? <span className="chip chip--attivo">Oggi nella partita</span>
          : <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="calendario" dimensione={20} />} titolo="Segna come giorno corrente" disabled={oggi.occupato} onClick={() => void oggi.segnaCorrente()} />}
        {indice.dataCorrente && indice.dataCorrente !== g.giorno && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="calendario" dimensione={20} />} titolo="Vai a oggi" onClick={() => oggi.vaiAlGiorno(indice.dataCorrente)} />}
        <CollegamentoVisivo to={`/guida/percorso/${g.giorno}`} tono="fantasma" compatto className="ml-auto" icona={<IconaAzione chiave="libro" dimensione={20} />} titolo="Guida completa" />
      </div>
      {!indice.dataCorrente && <p className="m-0 text-[12px] text-text-muted shrink-0">Nessun giorno corrente impostato: scegli il giorno e premi «Segna come giorno corrente».</p>}
      <div className="flex flex-wrap items-center gap-1.5 shrink-0" role="group" aria-label="Momento della giornata nella partita">
        <span className="text-[12px] text-text-muted">Momento della giornata:</span>
        <PulsanteVisivo tono="secondario" compatto attivo={oggi.fascia === 'giorno'} icona={<IconaFascia fascia="giorno" />} titolo="Giorno" dettaglio="mattina, pranzo, pomeriggio, dopo scuola" disabled={oggi.occupato} onClick={() => void oggi.impostaFascia('giorno')} />
        <PulsanteVisivo tono="secondario" compatto attivo={oggi.fascia === 'sera'} icona={<IconaFascia fascia="sera" />} titolo="Sera" dettaglio="dopo il tramonto" disabled={oggi.occupato} onClick={() => void oggi.impostaFascia('sera')} />
      </div>
      <div className={riempi ? 'md:min-h-0 md:overflow-y-auto md:pr-1' : ''}>
        <GiornoGuida g={g} partitaId={oggi.partitaId} onAggiorna={oggi.aggiornaAzione} onSullaMappa={oggi.sullaMappa} azioneEvidenziata={oggi.mappa.azione} compatto />
      </div>
    </div>
  );
}
