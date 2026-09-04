// ============================================================
// PercorsoPage — guida giorno per giorno: cosa fare oggi (giorno e sera), dove, con chi, avvisi; azioni spuntabili e giorno corrente della partita (Fase 7.5b)
// ============================================================

import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getPercorsoGiorno, getPercorsoIndice, impostaAzionePercorso, impostaGiornoCorrente } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { notifica } from '../stores/notificationStore';
import { PageState } from '../components/shared/PageState';
import { IconChevronLeft, IconChevronRight } from '../components/shared/icons';
import { dataGiocoTesto, meseGioco } from '../utils/dateGioco';
import { NOME_TIPO_AZIONE, collegamentoAzione } from '../utils/percorso';
import type { AzionePercorsoDto } from '../types';

function Azione({ a, data, partitaId, onCambiata }: { a: AzionePercorsoDto; data: string; partitaId: number | null; onCambiata: (a: AzionePercorsoDto) => void }) {
  const [occupato, setOccupato] = useState(false);
  const cambia = async (fatta: boolean) => {
    if (!partitaId) return;
    setOccupato(true);
    try { onCambiata(await impostaAzionePercorso(partitaId, data, a.indice, fatta)); } catch (err) { notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.'); } finally { setOccupato(false); }
  };
  const link = collegamentoAzione(a);
  return (
    <li className={`flex items-start gap-2 py-1.5 ${a.fatta ? 'opacity-60' : ''}`}>
      {partitaId && <input type="checkbox" className="w-5 h-5 mt-0.5 shrink-0" checked={a.fatta} disabled={occupato} onChange={(e) => void cambia(e.target.checked)} aria-label={`Fatto: ${a.azione.slice(0, 60)}`} />}
      <div className="flex flex-col gap-0.5 text-[13px] min-w-0">
        <span className={a.fatta ? 'line-through' : ''}>{a.azione}</span>
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="chip text-[11px]">{NOME_TIPO_AZIONE[a.tipo] ?? a.tipo}</span>
          {link ? <Link to={link} className="chip chip--attivo no-underline text-[11px]">{a.riferimentoTesto ?? link}</Link> : a.riferimentoTesto && <span className="chip text-[11px]">{a.riferimentoTesto}</span>}
          {a.rangoAtteso !== null && <span className="text-[12px] text-text-muted">rango atteso {a.rangoAtteso}</span>}
          {a.note && <span className="text-[12px] text-text-secondary">{a.note}</span>}
        </span>
      </div>
    </li>
  );
}

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
      await impostaGiornoCorrente(partitaId, g.giorno);
      giorno.imposta({ ...g, dataCorrente: g.giorno });
      if (indice.dati) indice.imposta({ ...indice.dati, dataCorrente: g.giorno });
      notifica('success', `Giorno corrente: ${dataGiocoTesto(g.giorno)}.`);
    } catch (err) { notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.'); } finally { setOccupatoGiorno(false); }
  };
  const vai = (d: string | null) => { if (d) navigate(`/guida/percorso/${d}`); };
  const azioniGiorno = (g?.azioni ?? []).filter((a) => a.fascia === 'giorno');
  const azioniSera = (g?.azioni ?? []).filter((a) => a.fascia === 'sera');
  return (
    <PageState isLoading={(indice.caricamento && !indice.dati) || (giorno.caricamento && !g)} error={indice.errore ?? giorno.errore} onRetry={() => { void indice.ricarica(); void giorno.ricarica(); }}>
      {indice.dati && g && (
        <div className="flex flex-col gap-3">
          <div>
            <h1 className="m-0 text-2xl font-bold">Guida giorno per giorno</h1>
            <p className="m-0 mt-1 text-[13px] text-text-secondary">Percorso al 100% dalla soluzione allgamestaff: trama del giorno, cosa fare di giorno e di sera, con chi e dove, avvisi sulle scadenze. {indice.dati.giorniCoperti} giorni con azioni su {indice.dati.totaleGiorni}.{partitaId ? (indice.dati.dataCorrente ? ` Giorno corrente della partita «${attiva?.nome}»: ${dataGiocoTesto(indice.dati.dataCorrente)}.` : ' Imposta il giorno corrente per ritrovare subito il punto in cui sei.') : ' Attiva una partita per spuntare le azioni e fissare il giorno corrente.'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" className="btn btn-secondary btn-sm touch" disabled={!g.precedente} onClick={() => vai(g.precedente)} aria-label="Giorno precedente"><IconChevronLeft size={16} /></button>
            <select className="form-input w-auto" value={g.giorno.slice(0, 2)} onChange={(e) => { const primo = indice.dati?.giorni.find((x) => x.giorno.slice(0, 2) === e.target.value); vai(primo?.giorno ?? null); }} aria-label="Mese">
              {mesi.map((m) => <option key={m} value={m}>{meseGioco(`${m}-01`)}</option>)}
            </select>
            <select className="form-input w-auto" value={g.giorno} onChange={(e) => vai(e.target.value)} aria-label="Giorno">
              {giorniDelMese.map((x) => <option key={x.giorno} value={x.giorno}>{dataGiocoTesto(x.giorno)} ({x.giornoSettimana}){x.azioni ? ` · ${x.fatte}/${x.azioni}` : ''}</option>)}
            </select>
            <button type="button" className="btn btn-secondary btn-sm touch" disabled={!g.successivo} onClick={() => vai(g.successivo)} aria-label="Giorno successivo"><IconChevronRight size={16} /></button>
            {indice.dati.dataCorrente && indice.dati.dataCorrente !== g.giorno && <button type="button" className="btn btn-ghost btn-sm touch" onClick={() => vai(indice.dati?.dataCorrente ?? null)}>Vai a oggi</button>}
            {partitaId && g.dataCorrente !== g.giorno && <button type="button" className="btn btn-primary btn-sm touch ml-auto" disabled={occupatoGiorno} onClick={() => void segnaCorrente()}>Segna come giorno corrente</button>}
            {partitaId && g.dataCorrente === g.giorno && <span className="chip chip--attivo ml-auto">Oggi nella partita</span>}
          </div>
          <section className="card flex flex-col gap-1 text-[13px]">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="m-0 text-[17px] font-semibold">{dataGiocoTesto(g.giorno)} <span className="text-text-muted font-normal">({g.giornoSettimana})</span></h2>
              <span className="chip">{g.fase}</span>
              {g.meteo && <span className="chip">{g.meteo}</span>}
            </div>
            {g.trama ? <p className="m-0">{g.trama}</p> : <p className="m-0 text-text-muted">Nessun evento di trama annotato.</p>}
            {g.vincoli.length > 0 && <p className="m-0 text-text-secondary"><strong className="text-text">Vincoli:</strong> {g.vincoli.join(' · ')}</p>}
            {g.avvisi.length > 0 && <ul className="m-0 pl-4 text-primary">{g.avvisi.map((v) => <li key={v}>{v}</li>)}</ul>}
            {!g.coperto && <p className="m-0 text-text-muted">Giorno non coperto dalle fonti: nessuna azione consigliata.</p>}
            {g.fonte && <a href={g.fonte} target="_blank" rel="noreferrer" className="text-[12px] text-primary self-start">fonte</a>}
          </section>
          {azioniGiorno.length > 0 && (
            <section className="card flex flex-col gap-1">
              <h2 className="m-0 text-[15px] font-semibold">Di giorno</h2>
              <ul className="m-0 p-0 list-none divide-y divide-border-light" aria-label="Azioni di giorno">{azioniGiorno.map((a) => <Azione key={a.indice} a={a} data={g.giorno} partitaId={partitaId} onCambiata={aggiorna} />)}</ul>
            </section>
          )}
          {azioniSera.length > 0 && (
            <section className="card flex flex-col gap-1">
              <h2 className="m-0 text-[15px] font-semibold">Di sera</h2>
              <ul className="m-0 p-0 list-none divide-y divide-border-light" aria-label="Azioni di sera">{azioniSera.map((a) => <Azione key={a.indice} a={a} data={g.giorno} partitaId={partitaId} onCambiata={aggiorna} />)}</ul>
            </section>
          )}
          {partitaId && g.azioni.length > 0 && <p className="m-0 text-[12px] text-text-muted">{g.fatte} azioni fatte su {g.azioni.length}.</p>}
        </div>
      )}
    </PageState>
  );
}
