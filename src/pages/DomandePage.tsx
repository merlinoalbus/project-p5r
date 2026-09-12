// ============================================================
// DomandePage — domande in classe, esami e quiz in TV: risposte per data, prossimo appuntamento, spunta «fatta» (Fase 6.2)
// ============================================================
//
// Le domande stanno in una rappresentazione sola: le righe per data, con le risposte giuste (e
// per gli esami il quesito accanto a ogni risposta). Il prossimo appuntamento — le domande non
// fatte della prima data da oggi in poi — è evidenziato nel mese in cui cade, non ripetuto in un
// elenco a parte; in cima c'è solo il rimando. I filtri sono valori: la ricerca (domanda,
// risposte, chi, data), il tipo e lo stato.
// ============================================================

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDomande, impostaDomandaFatta } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { notifica } from '../stores/notificationStore';
import { PageState } from '../components/shared/PageState';
import { CampoRicerca } from '../components/shared/CampoRicerca';
import { Segmenti } from '../components/shared/Segmenti';
import { dataGiocoTesto, meseGioco } from '../utils/dateGioco';
import type { DomandaDto, DomandeDto } from '../types';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { AggiungiAlCatalogo, CorreggiElemento } from '../components/guida/AzioniCatalogo';

const NOME_TIPO: Record<DomandaDto['tipo'], string> = { classe: 'In classe', 'esame-medio': 'Esame di metà semestre', 'esame-finale': 'Esame di fine semestre', tv: 'Quiz in TV', altro: 'Altro' };
type FiltroTipo = 'tutte' | 'classe' | 'esami' | 'tv';
type FiltroStato = 'tutte' | 'da-fare' | 'fatte';
const TIPI: ReadonlyArray<{ chiave: FiltroTipo; nome: string }> = [{ chiave: 'tutte', nome: 'Tutte' }, { chiave: 'classe', nome: 'In classe' }, { chiave: 'esami', nome: 'Esami' }, { chiave: 'tv', nome: 'Quiz TV' }];
const STATI: ReadonlyArray<{ chiave: FiltroStato; nome: string }> = [{ chiave: 'tutte', nome: 'Tutte' }, { chiave: 'da-fare', nome: 'Da fare' }, { chiave: 'fatte', nome: 'Fatte' }];
const eEsame = (t: DomandaDto['tipo']) => t === 'esame-medio' || t === 'esame-finale';
const piatto = (s: string | null | undefined) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('it');
const ancoraData = (data: string) => `domande-${data}`;

function RigaDomanda({ d, partitaId, onCambiata, onCorretta, evidenzia }: { d: DomandaDto; partitaId: number | null; onCambiata: (r: DomandeDto) => void; onCorretta: () => void; evidenzia?: boolean }) {
  const [occupato, setOccupato] = useState(false);
  // Solo dove la guida scrive «Conoscenza +1 nota» (le domande in classe): gli esami «contribuiscono alla
  // classifica» e i quiz in TV parlano di «aumento», e per quelli la Dote non si accredita da qui.
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
    <li id={evidenzia ? ancoraData(d.data) : undefined} className={`py-2 flex gap-3 text-[13px] scroll-mt-20 ${evidenzia ? 'bg-primary-bg rounded-md px-2' : ''} ${d.fatta ? 'opacity-70' : ''}`}>
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
          {evidenzia && <span className="chip chip--attivo text-[11px]">Prossima</span>}
          {d.ricompensa && <span className="text-[12px] text-text-muted">{d.ricompensa}</span>}
        </div>
        <div className={d.fatta ? 'line-through' : ''}>{d.domanda}</div>
        {/* Le risposte giuste, nell'ordine; per gli esami accanto a ogni risposta c'è il suo quesito. */}
        <ol className="m-0 p-0 list-none flex flex-col gap-0.5" aria-label="Risposte corrette">
          {d.risposte.map((r, i) => <li key={i}>{r.domanda && <span className="text-text-secondary">{r.domanda} → </span>}<span className="text-primary font-semibold">{d.risposte.length > 1 && !r.domanda ? `${i + 1}. ` : !r.domanda ? '→ ' : ''}{r.testo}</span></li>)}
        </ol>
        {d.note && <div className="text-[12px] text-text-muted">{d.note}</div>}
        {d.chiave && <div className="mt-0.5"><CorreggiElemento tipo="domanda" chiave={d.chiave} onSalvato={onCorretta} /></div>}
      </div>
    </li>
  );
}

export function DomandePage() {
  useDocumentTitle('Domande in classe, esami e quiz in TV');
  const attiva = usePartitaStore((s) => s.attiva);
  const partitaId = attiva?.id ?? null;
  const dati = useCarica(() => getDomande(partitaId ?? undefined), [partitaId]);
  const [ricerca, setRicerca] = useState('');
  const [tipo, setTipo] = useState<FiltroTipo>('tutte');
  const [stato, setStato] = useState<FiltroStato>('tutte');
  const d = dati.dati;
  const q = piatto(ricerca.trim());
  const prossimeId = useMemo(() => new Set((d?.prossime ?? []).map((x) => x.id)), [d]);
  const visibili = useMemo(() => (d?.domande ?? []).filter((x) => {
    if (tipo === 'classe' && x.tipo !== 'classe') return false;
    if (tipo === 'esami' && !eEsame(x.tipo)) return false;
    if (tipo === 'tv' && x.tipo !== 'tv') return false;
    if (stato === 'da-fare' && x.fatta) return false;
    if (stato === 'fatte' && !x.fatta) return false;
    if (q && !piatto(`${x.domanda} ${x.risposte.map((r) => `${r.domanda ?? ''} ${r.testo}`).join(' ')} ${x.chi} ${dataGiocoTesto(x.data)} ${x.data}`).includes(q)) return false;
    return true;
  }), [d, tipo, stato, q]);
  const perMese = useMemo(() => {
    const m = new Map<string, DomandaDto[]>();
    for (const x of visibili) {
      const mese = meseGioco(x.data);
      if (!m.has(mese)) m.set(mese, []);
      m.get(mese)!.push(x);
    }
    return [...m.entries()];
  }, [visibili]);
  const prossima = d?.prossime[0] ?? null;
  // Il rimando in cima azzera i filtri e porta alla riga evidenziata: la riga c'è solo dopo il render, quindi si scorre al giro successivo.
  const vaiAllaProssima = () => {
    if (!prossima) return;
    setTipo('tutte'); setStato('tutte'); setRicerca('');
    setTimeout(() => document.getElementById(ancoraData(prossima.data))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  return (
    <PageState isLoading={dati.caricamento && !d} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {d && (
        <div className="flex flex-col gap-4">
          <IntestazionePagina titolo="Domande in classe, esami e quiz in TV" sottotitolo={<>Le risposte giuste per ogni data di gioco. {partitaId ? `Nella partita «${attiva?.nome}» hai segnato ${d.fatte} domande su ${d.totale}; ` : 'Attiva una partita per segnare le domande fatte; '}
              {partitaId && (d.dataGioco ? `data di gioco ${dataGiocoTesto(d.dataGioco)}.` : <>imposta la <Link to="/partita?scheda=riepilogo" className="text-primary">data di gioco</Link> nel Riepilogo per vedere il prossimo appuntamento.</>)}</>} />

          {/* Il prossimo appuntamento: un rimando, non un secondo elenco. Le righe sono evidenziate nel loro mese. */}
          {prossima && (
            <div className="card flex flex-wrap items-center justify-between gap-2 border-primary" role="status">
              <span className="text-[13px]"><strong>Prossimo appuntamento:</strong> {dataGiocoTesto(prossima.data)} · {prossima.chi}{d.prossime.length > 1 ? ` · ${d.prossime.length} domande` : ''}</span>
              <button type="button" className="btn btn-ghost btn-sm touch" onClick={vaiAllaProssima}>Vai alla domanda</button>
            </div>
          )}

          <section className="card flex flex-col gap-2">
            <h2 className="m-0 text-[15px] font-semibold">Esami</h2>
            <p className="m-0 text-[12px] text-text-muted">Date, risultati e premi. Le domande di ogni esame stanno nell’elenco per data, con il quesito accanto a ogni risposta.</p>
            <ul className="m-0 p-0 list-none flex flex-col gap-1 text-[13px]">
              {d.esami.map((e) => (
                <li key={e.chiave} className="flex flex-wrap items-center gap-2">
                  <strong>{e.nome}</strong>
                  <span className="text-text-muted">{e.date.map(dataGiocoTesto).join(', ')}{e.dataRisultati ? ` · risultati il ${dataGiocoTesto(e.dataRisultati)}` : ''}</span>
                  {e.note && <span className="text-[12px] text-text-muted">{e.note}</span>}
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

          <section className="filtri-articoli" role="search" aria-label="Filtri delle domande">
            <div className="filtri-articoli__riga">
              <CampoRicerca valore={ricerca} onCambia={setRicerca} segnaposto="Cerca domanda, risposta, chi la fa o data…" />
              <span className="text-[12px] text-text-muted">{visibili.length} domande</span>
              <AggiungiAlCatalogo tipo="domanda" titolo="Aggiungi una domanda" onSalvato={() => void dati.ricarica()} />
            </div>
            <div className="filtri-articoli__riga">
              <Segmenti etichetta="Tipo" valore={tipo} opzioni={TIPI} onCambia={setTipo} />
              {partitaId && <Segmenti etichetta="Stato" valore={stato} opzioni={STATI} onCambia={setStato} />}
            </div>
          </section>
          {perMese.length === 0 && <p className="m-0 text-[13px] text-text-muted" role="status">Nessuna domanda con questi filtri.</p>}
          {perMese.map(([mese, lista]) => (
            <section key={mese} className="card flex flex-col gap-1">
              <h2 className="m-0 text-[15px] font-semibold">{mese}</h2>
              <ul className="m-0 p-0 list-none flex flex-col divide-y divide-border-light" aria-label={`Domande di ${mese}`}>
                {lista.map((x) => <RigaDomanda key={x.id} d={x} partitaId={partitaId} onCambiata={dati.imposta} onCorretta={() => void dati.ricarica()} evidenzia={prossimeId.has(x.id)} />)}
              </ul>
            </section>
          ))}
        </div>
      )}
    </PageState>
  );
}
