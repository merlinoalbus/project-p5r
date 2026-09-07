// ============================================================
// AttivitaPage — attività del tempo libero, lavori, libri e film con effetti sulle Doti e spunta per partita (Fase 8.1)
// ============================================================

import { useMemo, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { getAttivita } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { PageState } from '../components/shared/PageState';
import { FilaScorrevole } from '../components/shared/FilaScorrevole';
import { NOME_DOTE, NOME_FASCIA, NOME_TIPO_ATTIVITA } from '../utils/citta';
import type { AttivitaDto } from '../types';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { IconaCategoria } from '../components/guida/IconaCategoria';
import { useSuggerimenti } from '../stores/suggerimentiStore';
import { classiSuggerito } from '../utils/suggerimenti';
import { TargaSuggerito } from '../components/shared/Suggerito';
import { CollegamentoMappa } from '../components/mappe/CollegamentoMappa';
import { DoveSiTrova } from '../components/mappe/DoveSiTrova';

const SCHEDE = [['attivita', 'Attività'], ['lavori', 'Lavori']] as const;
type Scheda = (typeof SCHEDE)[number][0];

function Doti({ doti }: { doti: AttivitaDto['doti'] }) {
  if (doti.length === 0) return null;
  return <span className="flex flex-wrap gap-1">{doti.map((d, i) => <span key={i} className="chip chip--attivo" title={d.condizione ?? undefined}>{d.dote ? NOME_DOTE[d.dote] : 'Dote variabile'}{d.note !== null ? ` ${'♪'.repeat(Math.min(3, d.note))}` : ''}</span>)}</span>;
}

function Attivita({ a }: { a: AttivitaDto }) {
  const [aperta, setAperta] = useState(false);
  const sugg = useSuggerimenti();
  return (
    <li className={`card flex flex-col gap-1 text-[13px] ${classiSuggerito(sugg.evidenziato('attivita', a.chiave))}`}>
      <button type="button" className="text-left flex flex-wrap items-center gap-2 touch" onClick={() => setAperta((x) => !x)} aria-expanded={aperta}>
        <strong className="text-[15px]">{a.nome}</strong>
        <span className="chip">{NOME_TIPO_ATTIVITA[a.tipo] ?? a.tipo}</span>
        {sugg.evidenziato('attivita', a.chiave) && <TargaSuggerito motivo={sugg.motivo('attivita', a.chiave)} compatta />}
        {a.fascia && <span className="chip">{NOME_FASCIA[a.fascia] ?? a.fascia}</span>}
        <Doti doti={a.doti} />
        {!a.verificato && <span className="chip text-[11px]" title="Dato da fonte secondaria">da fonte secondaria</span>}
      </button>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-text-secondary">
        {a.luogo && <span><strong className="text-text">Dove:</strong> {a.luogoChiave ? <Link to={`/guida/citta/${a.luogoChiave}`}>{a.luogo}</Link> : a.luogo}</span>}
        <CollegamentoMappa tipo="attivita" chiave={a.chiave} compatto />
        {a.costo !== null && <span><strong className="text-text">Costo:</strong> {a.costo.toLocaleString('it-IT')} ¥</span>}
        {a.paga && <span><strong className="text-text">Paga:</strong> {a.paga}</span>}
        {a.sblocco && <span><strong className="text-text">Sblocco:</strong> {a.sblocco}</span>}
      </div>
      {aperta && (
        <div className="flex flex-col gap-1">
          {a.luogoChiave && <DoveSiTrova tipo="attivita" chiave={a.chiave} titolo={a.nome} altezza={240} />}
          {a.doti.some((d) => d.condizione) && <ul className="m-0 pl-4">{a.doti.filter((d) => d.condizione).map((d, i) => <li key={i}><strong>{d.dote ? NOME_DOTE[d.dote] : 'Dote variabile'}:</strong> {d.condizione}</li>)}</ul>}
          {a.altriEffetti && <p className="m-0"><strong>Altri effetti:</strong> {a.altriEffetti}</p>}
          {a.regole && <p className="m-0"><strong>Come funziona:</strong> {a.regole}</p>}
          {a.premi && <p className="m-0"><strong>Premi:</strong> {a.premi}</p>}
          {a.fonte && <a href={a.fonte} target="_blank" rel="noreferrer" className="credito self-start">fonte</a>}
        </div>
      )}
    </li>
  );
}

export function AttivitaPage() {
  useDocumentTitle('Attività e Doti sociali');
  const attiva = usePartitaStore((s) => s.attiva);
  const partitaId = attiva?.id ?? null;
  const dati = useCarica(() => getAttivita(partitaId ?? undefined), [partitaId]);
  const [params, setParams] = useSearchParams();
  const scheda = (SCHEDE.some(([k]) => k === params.get('scheda')) ? params.get('scheda') : 'attivita') as Scheda;
  const [dote, setDote] = useState('');
  const d = dati.dati;
  const attivitaVisibili = useMemo(() => (d?.attivita ?? []).filter((a) => !dote || a.doti.some((x) => x.dote === dote)), [d, dote]);
  const lavoriVisibili = useMemo(() => (d?.lavori ?? []).filter((a) => !dote || a.doti.some((x) => x.dote === dote)), [d, dote]);
  if (params.get('scheda') === 'libri') return <Navigate to="/guida/libri" replace />;
  if (params.get('scheda') === 'film') return <Navigate to="/guida/film" replace />;
  return (
    <PageState isLoading={dati.caricamento && !d} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {d && (
        <div className="flex flex-col gap-3">
          <IntestazionePagina titolo="Attività e Doti sociali" sottotitolo={<>Mini-giochi, lavori e studio con le note (♪) delle Doti che alzano, dove e quando farli.</>} />
          <div className="flex flex-wrap items-center gap-1.5">
            <FilaScorrevole role="tablist" aria-label="Sezioni">
              {SCHEDE.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={scheda === k} className={`chip touch ${scheda === k ? 'chip--attivo' : ''}`} onClick={() => setParams(k === 'attivita' ? {} : { scheda: k }, { replace: true })}><IconaCategoria categoria={k === 'attivita' ? 'minigiochi' : k} dimensione={18} />{l}</button>)}
            </FilaScorrevole>
            <select className="form-input w-auto ml-auto" value={dote} onChange={(e) => setDote(e.target.value)} aria-label="Dote">
              <option value="">Tutte le Doti</option>
              {Object.entries(NOME_DOTE).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
            </select>
          </div>
          {scheda === 'attivita' && <ul className="m-0 p-0 list-none flex flex-col gap-2" aria-label="Attività">{attivitaVisibili.map((a) => <Attivita key={a.chiave} a={a} />)}</ul>}
          {scheda === 'lavori' && <ul className="m-0 p-0 list-none flex flex-col gap-2" aria-label="Lavori">{lavoriVisibili.map((a) => <Attivita key={a.chiave} a={a} />)}</ul>}
        </div>
      )}
    </PageState>
  );
}
