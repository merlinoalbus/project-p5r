// ============================================================
// AttivitaPage — attività del tempo libero, lavori, libri e film con effetti sulle Doti e spunta per partita (Fase 8.1)
// ============================================================

import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getAttivita, impostaLettura } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { notifica } from '../stores/notificationStore';
import { PageState } from '../components/shared/PageState';
import { NOME_DOTE, NOME_FASCIA, NOME_TIPO_ATTIVITA } from '../utils/citta';
import type { AttivitaDto, AttivitaTutteDto, FilmDto, LibroDto } from '../types';

const SCHEDE = [['attivita', 'Attività'], ['lavori', 'Lavori'], ['libri', 'Libri'], ['film', 'Film e DVD']] as const;
type Scheda = (typeof SCHEDE)[number][0];

function Doti({ doti }: { doti: AttivitaDto['doti'] }) {
  if (doti.length === 0) return null;
  return <span className="flex flex-wrap gap-1">{doti.map((d, i) => <span key={i} className="chip chip--attivo" title={d.condizione ?? undefined}>{d.dote ? NOME_DOTE[d.dote] : 'Dote variabile'}{d.note !== null ? ` ${'♪'.repeat(Math.min(3, d.note))}` : ''}</span>)}</span>;
}

function Attivita({ a }: { a: AttivitaDto }) {
  const [aperta, setAperta] = useState(false);
  return (
    <li className="card flex flex-col gap-1 text-[13px]">
      <button type="button" className="text-left flex flex-wrap items-center gap-2 touch" onClick={() => setAperta((x) => !x)} aria-expanded={aperta}>
        <strong className="text-[15px]">{a.nome}</strong>
        <span className="chip">{NOME_TIPO_ATTIVITA[a.tipo] ?? a.tipo}</span>
        {a.fascia && <span className="chip">{NOME_FASCIA[a.fascia] ?? a.fascia}</span>}
        <Doti doti={a.doti} />
        {!a.verificato && <span className="chip text-[11px]" title="Dato da fonte secondaria">da fonte secondaria</span>}
      </button>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-text-secondary">
        {a.luogo && <span><strong className="text-text">Dove:</strong> {a.luogoChiave ? <Link to={`/guida/citta/${a.luogoChiave}`}>{a.luogo}</Link> : a.luogo}</span>}
        {a.costo !== null && <span><strong className="text-text">Costo:</strong> {a.costo.toLocaleString('it-IT')} ¥</span>}
        {a.paga && <span><strong className="text-text">Paga:</strong> {a.paga}</span>}
        {a.sblocco && <span><strong className="text-text">Sblocco:</strong> {a.sblocco}</span>}
      </div>
      {aperta && (
        <div className="flex flex-col gap-1">
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

function Lettura({ x, tipo, partitaId, onCambiata }: { x: LibroDto | FilmDto; tipo: 'libro' | 'film'; partitaId: number | null; onCambiata: (x: LibroDto | FilmDto) => void }) {
  const [occupato, setOccupato] = useState(false);
  const cambia = async (fatto: boolean) => {
    if (!partitaId) return;
    setOccupato(true);
    try { onCambiata(await impostaLettura(partitaId, tipo, x.chiave, fatto)); } catch (err) { notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.'); } finally { setOccupato(false); }
  };
  const libro = tipo === 'libro' ? (x as LibroDto) : null;
  const film = tipo === 'film' ? (x as FilmDto) : null;
  return (
    <li className={`card flex flex-col gap-1 text-[13px] ${x.fatto ? 'opacity-70' : ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        {partitaId && <input type="checkbox" className="w-5 h-5" checked={x.fatto} disabled={occupato} onChange={(e) => void cambia(e.target.checked)} aria-label={`${x.nomeIt ?? x.nome} ${tipo === 'libro' ? 'letto' : 'visto'}`} />}
        <strong className={`text-[15px] ${x.fatto ? 'line-through' : ''}`}>{x.nomeIt ?? x.nome}</strong>
        {x.nomeIt && x.nomeIt !== x.nome && <span className="text-text-muted text-[12px]">({x.nome})</span>}
        {x.dote && <span className="chip chip--attivo">{NOME_DOTE[x.dote]}{x.note !== null ? ` ${'♪'.repeat(Math.min(3, x.note))}` : ''}</span>}
        {film && <span className="chip">{film.dove === 'cinema' ? 'Cinema' : 'DVD'}</span>}
        {!x.verificato && <span className="chip text-[11px]" title="Dato da fonte secondaria">da fonte secondaria</span>}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-text-secondary">
        {libro && libro.dove && <span><strong className="text-text">Dove:</strong> {libro.dove}</span>}
        {libro && libro.disponibileDal && <span><strong className="text-text">Dal:</strong> {libro.disponibileDal}</span>}
        {film && film.periodo && <span><strong className="text-text">Periodo:</strong> {film.periodo}</span>}
        {x.prezzo !== null && <span><strong className="text-text">Prezzo:</strong> {x.prezzo === 0 ? 'gratis' : `${x.prezzo.toLocaleString('it-IT')} ¥`}</span>}
        {libro && libro.sessioni !== null && <span><strong className="text-text">Sessioni:</strong> {libro.sessioni}</span>}
        {libro && libro.sblocca && <span><strong className="text-text">Sblocca:</strong> {libro.sblocca}</span>}
      </div>
      {x.dettagli && <p className="m-0 text-[12px] text-text-muted">{x.dettagli}</p>}
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
  const aggiorna = (x: LibroDto | FilmDto, tipo: 'libro' | 'film') => {
    if (!d) return;
    const nuovo: AttivitaTutteDto = tipo === 'libro' ? { ...d, libri: d.libri.map((l) => (l.chiave === x.chiave ? (x as LibroDto) : l)) } : { ...d, film: d.film.map((f) => (f.chiave === x.chiave ? (x as FilmDto) : f)) };
    dati.imposta({ ...nuovo, libriLetti: nuovo.libri.filter((l) => l.fatto).length, filmVisti: nuovo.film.filter((f) => f.fatto).length });
  };
  const perDote = <T extends { dote: string | null }>(xs: T[]) => xs.filter((x) => !dote || x.dote === dote);
  const attivitaVisibili = useMemo(() => (d?.attivita ?? []).filter((a) => !dote || a.doti.some((x) => x.dote === dote)), [d, dote]);
  const lavoriVisibili = useMemo(() => (d?.lavori ?? []).filter((a) => !dote || a.doti.some((x) => x.dote === dote)), [d, dote]);
  return (
    <PageState isLoading={dati.caricamento && !d} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {d && (
        <div className="flex flex-col gap-3">
          <div>
            <h1 className="m-0 text-2xl font-bold">Attività e Doti sociali</h1>
            <p className="m-0 mt-1 text-[13px] text-text-secondary">Mini-giochi, lavori, studio, libri e film con le note (♪) delle Doti che alzano, dove e quando farli.{partitaId ? ` Nella partita «${attiva?.nome}»: ${d.libriLetti} libri letti, ${d.filmVisti} film visti.` : ' Attiva una partita per spuntare libri letti e film visti.'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Sezioni">
              {SCHEDE.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={scheda === k} className={`chip touch ${scheda === k ? 'chip--attivo' : ''}`} onClick={() => setParams(k === 'attivita' ? {} : { scheda: k }, { replace: true })}>{l}</button>)}
            </div>
            <select className="form-input w-auto ml-auto" value={dote} onChange={(e) => setDote(e.target.value)} aria-label="Dote">
              <option value="">Tutte le Doti</option>
              {Object.entries(NOME_DOTE).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
            </select>
          </div>
          {scheda === 'attivita' && <ul className="m-0 p-0 list-none flex flex-col gap-2" aria-label="Attività">{attivitaVisibili.map((a) => <Attivita key={a.chiave} a={a} />)}</ul>}
          {scheda === 'lavori' && <ul className="m-0 p-0 list-none flex flex-col gap-2" aria-label="Lavori">{lavoriVisibili.map((a) => <Attivita key={a.chiave} a={a} />)}</ul>}
          {scheda === 'libri' && <ul className="m-0 p-0 list-none flex flex-col gap-2" aria-label="Libri">{perDote(d.libri).map((l) => <Lettura key={l.chiave} x={l} tipo="libro" partitaId={partitaId} onCambiata={(x) => aggiorna(x, 'libro')} />)}</ul>}
          {scheda === 'film' && <ul className="m-0 p-0 list-none flex flex-col gap-2" aria-label="Film">{perDote(d.film).map((f) => <Lettura key={f.chiave} x={f} tipo="film" partitaId={partitaId} onCambiata={(x) => aggiorna(x, 'film')} />)}</ul>}
        </div>
      )}
    </PageState>
  );
}
