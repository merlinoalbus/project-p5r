// ============================================================
// PercorsoPage — guida giorno per giorno: cosa fare oggi (giorno e sera), dove, con chi, avvisi; azioni spuntabili e giorno corrente della partita (Fase 7.5b)
// ============================================================

import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getPercorsoGiorno, getPercorsoIndice, impostaGiornoCorrente } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { useSuggerimentiStore } from '../stores/suggerimentiStore';
import { notifica } from '../stores/notificationStore';
import { PageState } from '../components/shared/PageState';
import { IconChevronLeft, IconChevronRight } from '../components/shared/icons';
import { dataGiocoTesto, meseGioco } from '../utils/dateGioco';
import type { AzionePercorsoDto } from '../types';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { PulsanteVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione } from '../components/shared/IconaAzione';
import { GiornoGuida } from '../components/guida/GiornoGuida';

export function PercorsoPage() {
  const { data: dataParam } = useParams();
  const navigate = useNavigate();
  const attiva = usePartitaStore((s) => s.attiva);
  const partitaId = attiva?.id ?? null;
  const indice = useCarica(() => getPercorsoIndice(partitaId ?? undefined), [partitaId]);
  const data = dataParam ?? indice.dati?.dataCorrente ?? indice.dati?.giorni[0]?.giorno ?? null;
  const giorno = useCarica(() => (data ? getPercorsoGiorno(data, partitaId ?? undefined) : Promise.resolve(null)), [data, partitaId]);
  const g = giorno.dati;
  useDocumentTitle(g ? `${dataGiocoTesto(g.giorno)} — Guida giorno per giorno` : 'Guida giorno per giorno');
  const [occupatoGiorno, setOccupatoGiorno] = useState(false);
  const mesi = useMemo(() => [...new Set((indice.dati?.giorni ?? []).map((x) => x.giorno.slice(0, 2)))], [indice.dati]);
  const giorniDelMese = useMemo(() => (indice.dati?.giorni ?? []).filter((x) => data && x.giorno.slice(0, 2) === data.slice(0, 2)), [indice.dati, data]);
  const aggiorna = (a: AzionePercorsoDto) => { if (g) { const azioni = g.azioni.map((x) => (x.indice === a.indice ? a : x)); giorno.imposta({ ...g, azioni, fatte: azioni.filter((x) => x.fatta).length }); } };
  const segnaCorrente = async () => {
    if (!partitaId || !g) return;
    setOccupatoGiorno(true);
    try {
      const esito = await impostaGiornoCorrente(partitaId, g.giorno);
      giorno.imposta({ ...g, dataCorrente: g.giorno });
      if (indice.dati) indice.imposta({ ...indice.dati, dataCorrente: g.giorno });
      // la data di gioco vive in `partitaStore.attiva`: si allinea alla partita restituita dal server e i suggerimenti del giorno vengono ricaricati
      usePartitaStore.getState().aggiornaLocale(esito.partita);
      useSuggerimentiStore.getState().invalida();
      notifica('success', `Giorno corrente: ${dataGiocoTesto(g.giorno)}.`);
    } catch (err) { notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.'); } finally { setOccupatoGiorno(false); }
  };
  const vai = (d: string | null) => { if (d) navigate(`/guida/percorso/${d}`); };
  return (
    <PageState isLoading={(indice.caricamento && !indice.dati) || (giorno.caricamento && !g)} error={indice.errore ?? giorno.errore} onRetry={() => { void indice.ricarica(); void giorno.ricarica(); }}>
      {indice.dati && g && (
        <div className="flex flex-col gap-3">
          <IntestazionePagina titolo="Guida giorno per giorno" sottotitolo={<>Percorso al 100% dalla soluzione allgamestaff: trama del giorno, cosa fare di giorno e di sera, con chi e dove, avvisi sulle scadenze. {indice.dati.giorniCoperti} giorni con azioni su {indice.dati.totaleGiorni}.{partitaId ? (indice.dati.dataCorrente ? ` Giorno corrente della partita «${attiva?.nome}»: ${dataGiocoTesto(indice.dati.dataCorrente)}.` : ' Imposta il giorno corrente per ritrovare subito il punto in cui sei.') : ' Attiva una partita per spuntare le azioni e fissare il giorno corrente.'}</>} />
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" className="btn btn-secondary btn-sm touch" disabled={!g.precedente} onClick={() => vai(g.precedente)} aria-label="Giorno precedente"><IconChevronLeft size={16} /></button>
            <select className="form-input w-auto" value={g.giorno.slice(0, 2)} onChange={(e) => { const primo = indice.dati?.giorni.find((x) => x.giorno.slice(0, 2) === e.target.value); vai(primo?.giorno ?? null); }} aria-label="Mese">
              {mesi.map((m) => <option key={m} value={m}>{meseGioco(`${m}-01`)}</option>)}
            </select>
            <select className="form-input w-auto" value={g.giorno} onChange={(e) => vai(e.target.value)} aria-label="Giorno">
              {giorniDelMese.map((x) => <option key={x.giorno} value={x.giorno}>{dataGiocoTesto(x.giorno)} ({x.giornoSettimana}){x.azioni ? ` · ${x.fatte}/${x.azioni}` : ''}</option>)}
            </select>
            <button type="button" className="btn btn-secondary btn-sm touch" disabled={!g.successivo} onClick={() => vai(g.successivo)} aria-label="Giorno successivo"><IconChevronRight size={16} /></button>
            {indice.dati.dataCorrente && indice.dati.dataCorrente !== g.giorno && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="calendario" dimensione={20} />} titolo="Vai a oggi" onClick={() => vai(indice.dati?.dataCorrente ?? null)} />}
            {partitaId && g.dataCorrente !== g.giorno && <button type="button" className="btn btn-primary btn-sm touch ml-auto" disabled={occupatoGiorno} onClick={() => void segnaCorrente()}>Segna come giorno corrente</button>}
            {partitaId && g.dataCorrente === g.giorno && <span className="chip chip--attivo ml-auto">Oggi nella partita</span>}
          </div>
          <GiornoGuida g={g} partitaId={partitaId} onAggiorna={aggiorna} onSullaMappa={(a) => { if (a.mappa) navigate(`/guida/mappe/${encodeURIComponent(a.mappa.chiave)}${a.mappa.spilloId ? `?spillo=${a.mappa.spilloId}` : ''}`); }} />
        </div>
      )}
    </PageState>
  );
}
