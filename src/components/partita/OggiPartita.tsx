// ============================================================
// OggiPartita — scheda «Oggi» della Partita: la guida del giorno corrente accanto alla mappa globale navigabile (Fase 12.4 / 13.5)
// ============================================================
//
// A sinistra la guida del giorno (azioni con spunta, consigliate in oro, bloccate in grigio con motivo); a destra (sotto, su schermi
// stretti) il visore incorporato: parte da Tokyo e si sposta sulla mappa dell'azione scelta con «Sulla mappa» (Palazzo, negozio, luogo
// del Confidente, Mementos), centrata sullo spillo collegato.
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPercorsoGiorno, getPercorsoIndice, impostaGiornoCorrente } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { PageState } from '../shared/PageState';
import { GiornoGuida } from '../guida/GiornoGuida';
import { MappaIncorporata } from '../mappe/MappaIncorporata';
import { PulsanteVisivo, CollegamentoVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { IconChevronLeft, IconChevronRight } from '../shared/icons';
import { dataGiocoTesto } from '../../utils/dateGioco';
import type { AzionePercorsoDto, PartitaDto } from '../../types';

interface Props { partita: PartitaDto }

export function OggiPartita({ partita }: Props) {
  const navigate = useNavigate();
  const partitaId = partita.id;
  const indice = useCarica(() => getPercorsoIndice(partitaId), [partitaId]);
  const [dataScelta, setDataScelta] = useState<string | null>(null);
  const data = dataScelta ?? indice.dati?.dataCorrente ?? indice.dati?.giorni[0]?.giorno ?? null;
  const giorno = useCarica(() => (data ? getPercorsoGiorno(data, partitaId) : Promise.resolve(null)), [data, partitaId]);
  const g = giorno.dati;
  const [mappa, setMappa] = useState<{ chiave: string; spilloId: number | null; azione: number | null }>({ chiave: 'tokyo', spilloId: null, azione: null });
  const [occupato, setOccupato] = useState(false);

  const aggiorna = (a: AzionePercorsoDto) => { if (g) { const azioni = g.azioni.map((x) => (x.indice === a.indice ? a : x)); giorno.imposta({ ...g, azioni, fatte: azioni.filter((x) => x.fatta).length }); } };
  const sullaMappa = (a: AzionePercorsoDto) => { if (a.mappa) setMappa({ chiave: a.mappa.chiave, spilloId: a.mappa.spilloId, azione: a.indice }); };
  const segnaCorrente = async () => {
    if (!g) return;
    setOccupato(true);
    try {
      await impostaGiornoCorrente(partitaId, g.giorno);
      giorno.imposta({ ...g, dataCorrente: g.giorno });
      if (indice.dati) indice.imposta({ ...indice.dati, dataCorrente: g.giorno });
      notifica('success', `Giorno corrente: ${dataGiocoTesto(g.giorno)}.`);
    } catch (err) { notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.'); } finally { setOccupato(false); }
  };

  return (
    <PageState isLoading={(indice.caricamento && !indice.dati) || (giorno.caricamento && !g)} error={indice.errore ?? giorno.errore} onRetry={() => { void indice.ricarica(); void giorno.ricarica(); }}>
      {indice.dati && g && (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 items-start">
          <div className="flex flex-col gap-3 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <button type="button" className="btn btn-secondary btn-sm touch" disabled={!g.precedente} onClick={() => setDataScelta(g.precedente)} aria-label="Giorno precedente"><IconChevronLeft size={16} /></button>
              <span className="font-display text-[19px] uppercase">{dataGiocoTesto(g.giorno)}</span>
              <button type="button" className="btn btn-secondary btn-sm touch" disabled={!g.successivo} onClick={() => setDataScelta(g.successivo)} aria-label="Giorno successivo"><IconChevronRight size={16} /></button>
              {g.dataCorrente === g.giorno
                ? <span className="chip chip--attivo">Oggi nella partita</span>
                : <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="calendario" dimensione={20} />} titolo="Segna come giorno corrente" disabled={occupato} onClick={() => void segnaCorrente()} />}
              {indice.dati.dataCorrente && indice.dati.dataCorrente !== g.giorno && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="calendario" dimensione={20} />} titolo="Vai a oggi" onClick={() => setDataScelta(indice.dati?.dataCorrente ?? null)} />}
              <CollegamentoVisivo to={`/guida/percorso/${g.giorno}`} tono="fantasma" compatto className="ml-auto" icona={<IconaAzione chiave="libro" dimensione={20} />} titolo="Guida completa" />
            </div>
            {!indice.dati.dataCorrente && <p className="m-0 text-[12px] text-text-muted">Nessun giorno corrente impostato: scegli il giorno e premi «Segna come giorno corrente».</p>}
            <GiornoGuida g={g} partitaId={partitaId} onAggiorna={aggiorna} onSullaMappa={sullaMappa} azioneEvidenziata={mappa.azione} compatto />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap text-[12px] text-text-muted">
              <span>Mappa{mappa.azione !== null ? ' dell’azione scelta' : ' di Tokyo'}: tocca un quartiere o un passaggio per scendere di livello.</span>
              {mappa.chiave !== 'tokyo' && <button type="button" className="visore-mappa__azione-testo" onClick={() => setMappa({ chiave: 'tokyo', spilloId: null, azione: null })}>Torna a Tokyo</button>}
              <button type="button" className="visore-mappa__azione-testo" onClick={() => navigate(`/guida/mappe/${encodeURIComponent(mappa.chiave)}`)}>Schermo intero</button>
            </div>
            <MappaIncorporata chiave={mappa.chiave} spilloIniziale={mappa.spilloId} partitaId={partitaId} altezza="max(560px, calc(100vh - 300px))" />
          </div>
        </div>
      )}
    </PageState>
  );
}
