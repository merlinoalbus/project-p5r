// ============================================================
// DomandePage — domande in classe ed esami: risposte corrette per data, prossime rispetto alla data di gioco, spunta «fatta» (Fase 6.2)
// ============================================================

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDomande, impostaDomandaFatta } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { notifica } from '../stores/notificationStore';
import { PageState } from '../components/shared/PageState';
import { dataGiocoTesto, meseGioco } from '../utils/dateGioco';
import type { DomandaDto, DomandeDto } from '../types';

const NOME_TIPO: Record<DomandaDto['tipo'], string> = { classe: 'In classe', 'esame-medio': 'Esame di metà semestre', 'esame-finale': 'Esame di fine semestre', altro: 'Game show in TV' };

type Filtro = 'tutte' | 'da-fare' | 'fatte' | 'esami';

function RigaDomanda({ d, partitaId, onCambiata, evidenzia }: { d: DomandaDto; partitaId: number | null; onCambiata: (r: DomandeDto) => void; evidenzia?: boolean }) {
  const [occupato, setOccupato] = useState(false);
  const daConoscenza = /Conoscenza \+/.test(d.ricompensa);
  const segna = async (fatta: boolean) => {
    if (!partitaId) return;
    setOccupato(true);
    try {
      onCambiata(await impostaDomandaFatta(partitaId, d.id, fatta, fatta && daConoscenza));
      if (fatta && daConoscenza) notifica('success', 'Domanda segnata: Conoscenza +1 nota registrata nelle Doti.');
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.');
    } finally {
      setOccupato(false);
    }
  };
  return (
    <li className={`py-2 flex gap-3 text-[13px] ${evidenzia ? 'bg-primary-bg rounded-md px-2' : ''} ${d.fatta ? 'opacity-70' : ''}`}>
      {partitaId && (
        <label className="flex items-start pt-0.5 touch">
          <input type="checkbox" className="w-5 h-5" checked={d.fatta} disabled={occupato} onChange={(e) => void segna(e.target.checked)} aria-label={`Domanda del ${dataGiocoTesto(d.data)} fatta`} />
        </label>
      )}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <strong className="tabular-nums">{dataGiocoTesto(d.data)}</strong>
          <span className="text-text-muted">{d.chi}</span>
          {d.tipo !== 'classe' && <span className="chip">{NOME_TIPO[d.tipo]}</span>}
          {d.ricompensa && <span className="text-[12px] text-text-muted">{d.ricompensa}</span>}
        </div>
        <div className={d.fatta ? 'line-through' : ''}>{d.domanda}</div>
        <ol className="m-0 p-0 list-none flex flex-col gap-0.5" aria-label="Risposte corrette">
          {d.risposte.map((r, i) => <li key={i} className="text-primary font-semibold">{d.risposte.length > 1 ? `${i + 1}. ` : '→ '}{r.testo}</li>)}
        </ol>
        {d.note && <div className="text-[12px] text-text-muted">{d.note}</div>}
      </div>
    </li>
  );
}

export function DomandePage() {
  useDocumentTitle('Domande in classe ed esami');
  const attiva = usePartitaStore((s) => s.attiva);
  const partitaId = attiva?.id ?? null;
  const dati = useCarica(() => getDomande(partitaId ?? undefined), [partitaId]);
  const [filtro, setFiltro] = useState<Filtro>('tutte');
  const d = dati.dati;
  const visibili = useMemo(() => (d?.domande ?? []).filter((x) => filtro === 'tutte' || (filtro === 'da-fare' && !x.fatta) || (filtro === 'fatte' && x.fatta) || (filtro === 'esami' && x.tipo !== 'classe')), [d, filtro]);
  const perMese = useMemo(() => {
    const m = new Map<string, DomandaDto[]>();
    for (const x of visibili) {
      const mese = meseGioco(x.data);
      if (!m.has(mese)) m.set(mese, []);
      m.get(mese)!.push(x);
    }
    return [...m.entries()];
  }, [visibili]);

  return (
    <PageState isLoading={dati.caricamento && !d} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {d && (
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="m-0 text-2xl font-bold">Domande in classe ed esami</h1>
            <p className="m-0 mt-1 text-[13px] text-text-secondary">
              Risposte corrette per ogni data di gioco (guida allgamestaff). {partitaId ? `Nella partita «${attiva?.nome}» hai segnato ${d.fatte} domande su ${d.totale}; ` : 'Attiva una partita per segnare le domande fatte; '}
              {partitaId && (d.dataGioco ? `data di gioco ${dataGiocoTesto(d.dataGioco)}.` : <>imposta la <Link to="/partita?scheda=riepilogo" className="text-primary">data di gioco</Link> nel Riepilogo per vedere le prossime.</>)}
            </p>
          </div>

          {d.prossime.length > 0 && (
            <section className="card flex flex-col gap-1 border-primary">
              <h2 className="m-0 text-[15px] font-semibold">Prossime domande</h2>
              <ul className="m-0 p-0 list-none flex flex-col divide-y divide-border-light" aria-label="Prossime domande">
                {d.prossime.map((x) => <RigaDomanda key={x.id} d={x} partitaId={partitaId} onCambiata={dati.imposta} evidenzia />)}
              </ul>
            </section>
          )}

          <section className="card flex flex-col gap-2">
            <h2 className="m-0 text-[15px] font-semibold">Esami</h2>
            <ul className="m-0 p-0 list-none flex flex-col gap-2 text-[13px]">
              {d.esami.map((e) => (
                <li key={e.chiave} className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2"><strong>{e.nome}</strong><span className="text-text-muted">{e.date.map(dataGiocoTesto).join(', ')}{e.dataRisultati ? ` · risultati il ${dataGiocoTesto(e.dataRisultati)}` : ''}</span></div>
                  <ol className="m-0 p-0 pl-4 flex flex-col gap-0.5">
                    {e.domande.map((q) => <li key={q.ordine}><span className="text-text-secondary">{q.domanda}</span> → <strong className="text-primary">{q.risposta}</strong></li>)}
                  </ol>
                  {e.note && <div className="text-[12px] text-text-muted">{e.note}</div>}
                </li>
              ))}
            </ul>
            {d.premi && (
              <div className="text-[12px] text-text-secondary flex flex-col gap-0.5 pt-1 border-t border-border-light">
                <span><strong>Premi:</strong> {Object.entries(d.premi.fascinoPerPiazzamento ?? {}).map(([k, v]) => `${k.replaceAll('_', ' ')}: ${v}`).join(' · ')}</span>
                {d.premi.moltiplicatoreConfidenti && <span>{d.premi.moltiplicatoreConfidenti}</span>}
                {d.premi.requisitoConoscenza && <span>Per il primo posto: {Object.entries(d.premi.requisitoConoscenza).filter(([k]) => k !== 'fonte').map(([k, v]) => `${k.replaceAll('_', ' ')}: ${v}`).join(' · ')}</span>}
                {d.premi.trofeo && <span>{d.premi.trofeo}</span>}
              </div>
            )}
          </section>

          <div className="flex flex-wrap items-center gap-1.5">
            {([['tutte', 'Tutte'], ['da-fare', 'Da fare'], ['fatte', 'Fatte'], ['esami', 'Solo esami']] as Array<[Filtro, string]>).map(([k, l]) => (
              <button key={k} type="button" className={`chip touch ${filtro === k ? 'chip--attivo' : ''}`} onClick={() => setFiltro(k)} aria-pressed={filtro === k}>{l}</button>
            ))}
            <span className="ml-auto text-[12px] text-text-muted">{visibili.length} domande</span>
          </div>
          {perMese.map(([mese, lista]) => (
            <section key={mese} className="card flex flex-col gap-1">
              <h2 className="m-0 text-[15px] font-semibold">{mese}</h2>
              <ul className="m-0 p-0 list-none flex flex-col divide-y divide-border-light" aria-label={`Domande di ${mese}`}>
                {lista.map((x) => <RigaDomanda key={x.id} d={x} partitaId={partitaId} onCambiata={dati.imposta} />)}
              </ul>
            </section>
          ))}
        </div>
      )}
    </PageState>
  );
}
