// ============================================================
// CalendarioPage — calendario di gioco: mese per mese, meteo ed eventi, oggi nella partita, scadenze, consigli della settimana (Fase 6.3)
// ============================================================

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { aggiornaPartita, getCalendario } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { notifica } from '../stores/notificationStore';
import { PageState } from '../components/shared/PageState';
import { MESI_GIOCO, dataGiocoTesto } from '../utils/dateGioco';
import type { GiornoCalendarioDto } from '../types';

const NOME_TIPO: Record<string, string> = { storia: 'Storia', scadenza: 'Scadenza', sblocco: 'Sblocco', esame: 'Esame', festa: 'Festa', vacanza: 'Vacanza', consiglio: 'Consiglio', meteo: 'Meteo' };
const CLASSE_TIPO: Record<string, string> = { scadenza: 'chip--attivo', esame: 'chip--attivo' };
const MESI_CHIAVE = ['04', '05', '06', '07', '08', '09', '10', '11', '12', '01', '02', '03'];

function Giorno({ g, oggi, aperto, onToggle, onImposta }: { g: GiornoCalendarioDto; oggi: boolean; aperto: boolean; onToggle: () => void; onImposta?: () => void }) {
  const festivo = g.giornoSettimana === 'Domenica' || g.eventi.some((e) => e.tipo === 'festa' || e.tipo === 'vacanza');
  return (
    <li className={`rounded-lg border ${oggi ? 'border-primary bg-primary-bg' : 'border-border-light'}`}>
      <button type="button" className="w-full text-left px-3 py-2 flex flex-wrap items-center gap-2 touch" onClick={onToggle} aria-expanded={aperto} aria-label={`${dataGiocoTesto(g.data)}, ${g.giornoSettimana}`}>
        <strong className="tabular-nums w-[110px]">{dataGiocoTesto(g.data)}</strong>
        <span className={`text-[12px] ${festivo ? 'text-primary' : 'text-text-muted'}`}>{g.giornoSettimana}</span>
        {g.meteo && <span className="text-[12px] text-text-secondary">{g.meteo}</span>}
        {g.tempoLibero && !g.tempoLibero.giorno && !g.tempoLibero.sera && <span className="chip text-[11px]">Nessun tempo libero</span>}
        {oggi && <span className="chip chip--attivo">Oggi nella partita</span>}
        <span className="ml-auto flex flex-wrap gap-1">
          {g.eventi.slice(0, 3).map((e) => <span key={e.id} className={`chip text-[11px] ${CLASSE_TIPO[e.tipo] ?? ''}`}>{e.titolo.length > 40 ? `${e.titolo.slice(0, 40)}…` : e.titolo}</span>)}
          {g.eventi.length > 3 && <span className="chip text-[11px]">+{g.eventi.length - 3}</span>}
        </span>
      </button>
      {aperto && (
        <div className="px-3 pb-3 flex flex-col gap-2 text-[13px]">
          {g.eventi.length === 0 && <span className="text-text-muted">Nessun evento documentato per questo giorno.</span>}
          {g.eventi.map((e) => (
            <div key={e.id} className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2 flex-wrap"><span className={`chip text-[11px] ${CLASSE_TIPO[e.tipo] ?? ''}`}>{NOME_TIPO[e.tipo] ?? e.tipo}</span><strong>{e.titolo}</strong></div>
              {e.dettaglio && <span className="text-text-secondary">{e.dettaglio}</span>}
              {e.fonte && <a href={e.fonte} target="_blank" rel="noreferrer" className="credito">fonte</a>}
            </div>
          ))}
          {g.tempoLibero && <span className="text-[12px] text-text-muted">Tempo libero: giorno {g.tempoLibero.giorno ? 'sì' : 'no'}, sera {g.tempoLibero.sera ? 'sì' : 'no'}.</span>}
          {onImposta && !oggi && <button type="button" className="btn btn-secondary btn-sm self-start" onClick={onImposta}>Imposta come data di gioco della partita</button>}
        </div>
      )}
    </li>
  );
}

export function CalendarioPage() {
  useDocumentTitle('Calendario di gioco');
  const attiva = usePartitaStore((s) => s.attiva);
  const aggiornaLocale = usePartitaStore((s) => s.aggiornaLocale);
  const partitaId = attiva?.id ?? null;
  const dati = useCarica(() => getCalendario(partitaId ?? undefined), [partitaId, attiva?.dataGioco]);
  const d = dati.dati;
  const [meseScelto, setMeseScelto] = useState<string | null>(null);
  const [aperto, setAperto] = useState<string | null>(null);
  const mese = meseScelto ?? (d?.dataGioco ? d.dataGioco.slice(0, 2) : '04');
  const giorniMese = useMemo(() => (d?.giorni ?? []).filter((g) => g.data.startsWith(mese)), [d, mese]);
  const settimanaDi = (g: GiornoCalendarioDto | null) => (g?.settimana !== null && g?.settimana !== undefined ? d?.settimane.find((s) => s.numero === g.settimana) ?? null : null);
  const settimanaOggi = settimanaDi(d?.oggi ?? null);

  const imposta = async (data: string) => {
    if (!attiva) return;
    try {
      aggiornaLocale(await aggiornaPartita(attiva.id, { dataGioco: data }));
      notifica('success', `Data di gioco impostata al ${dataGiocoTesto(data)}.`);
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.');
    }
  };

  return (
    <PageState isLoading={dati.caricamento && !d} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {d && (
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="m-0 text-2xl font-bold">Calendario di gioco</h1>
            <p className="m-0 mt-1 text-[13px] text-text-secondary">Giorno per giorno dal 9 aprile: meteo previsto, eventi della storia, scadenze dei Palazzi, esami, sblocchi e feste (guida allgamestaff, meteo da wikiwiki.jp). {partitaId ? (d.dataGioco ? `Oggi nella partita è ${dataGiocoTesto(d.dataGioco)}.` : 'Apri un giorno e imposta la data di gioco della partita.') : 'Attiva una partita per seguire la data di gioco.'}</p>
          </div>

          {d.oggi && (
            <section className="card flex flex-col gap-2 border-primary">
              <h2 className="m-0 text-[15px] font-semibold">Oggi: {dataGiocoTesto(d.oggi.data)}, {d.oggi.giornoSettimana}{d.oggi.meteo ? ` · ${d.oggi.meteo}` : ''}</h2>
              {d.oggi.eventi.length > 0 ? (
                <ul className="m-0 p-0 list-none flex flex-col gap-1 text-[13px]" aria-label="Eventi di oggi">
                  {d.oggi.eventi.map((e) => <li key={e.id}><span className={`chip text-[11px] ${CLASSE_TIPO[e.tipo] ?? ''}`}>{NOME_TIPO[e.tipo] ?? e.tipo}</span> <strong>{e.titolo}</strong>{e.dettaglio ? <span className="text-text-secondary"> — {e.dettaglio}</span> : null}</li>)}
                </ul>
              ) : <p className="m-0 text-[13px] text-text-muted">Nessun evento documentato oggi.</p>}
              {settimanaOggi && (
                <div className="text-[13px] flex flex-col gap-0.5 pt-1 border-t border-border-light">
                  <div className="flex items-center gap-2 flex-wrap"><strong>{settimanaOggi.titolo}</strong><span className="text-text-muted">{settimanaOggi.periodo}</span>{settimanaOggi.url && <a href={settimanaOggi.url} target="_blank" rel="noreferrer" className="credito">guida</a>}</div>
                  <span className="text-text-secondary">{settimanaOggi.riassunto}</span>
                  {settimanaOggi.incertezze && <span className="text-[12px] text-text-muted">Incertezze: {settimanaOggi.incertezze}</span>}
                </div>
              )}
              {d.prossimeScadenze.length > 0 && (
                <div className="text-[13px] flex flex-col gap-0.5 pt-1 border-t border-border-light">
                  <div className="text-[12px] uppercase tracking-wide text-text-muted">Prossime scadenze ed esami</div>
                  <ul className="m-0 p-0 list-none flex flex-col gap-0.5" aria-label="Prossime scadenze">
                    {d.prossimeScadenze.map((s, i) => <li key={i}><strong className="tabular-nums">{dataGiocoTesto(s.data)}</strong> <span className="text-text-muted">({s.giorniMancanti === 0 ? 'oggi' : s.giorniMancanti === 1 ? 'domani' : `fra ${s.giorniMancanti} giorni`})</span> · {s.titolo}</li>)}
                  </ul>
                </div>
              )}
              <Link to="/guida/domande" className="text-[12px] text-primary self-start">Domande in classe della data →</Link>
            </section>
          )}

          <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Mesi">
            {MESI_CHIAVE.filter((m) => d.mesi.includes(m)).map((m, i) => (
              <button key={m} type="button" role="tab" className={`chip touch ${mese === m ? 'chip--attivo' : ''}`} onClick={() => setMeseScelto(m)} aria-selected={mese === m}>{MESI_GIOCO[MESI_CHIAVE.indexOf(m)] ?? m}{i === 0 ? '' : ''}</button>
            ))}
          </div>
          <ul className="m-0 p-0 list-none flex flex-col gap-1.5" aria-label={`Giorni di ${MESI_GIOCO[MESI_CHIAVE.indexOf(mese)] ?? mese}`}>
            {giorniMese.map((g) => (
              <Giorno key={g.data} g={g} oggi={g.data === d.dataGioco} aperto={aperto === g.data} onToggle={() => setAperto((a) => (a === g.data ? null : g.data))} onImposta={partitaId ? () => void imposta(g.data) : undefined} />
            ))}
          </ul>
        </div>
      )}
    </PageState>
  );
}
