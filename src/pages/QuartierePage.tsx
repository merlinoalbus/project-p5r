// ============================================================
// QuartierePage — luoghi di un quartiere: cosa offrono, quando, sblocco, Confidenti, piatti (Fase 8.1)
// ============================================================

import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getQuartiere } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { PageState } from '../components/shared/PageState';
import { IconChevronLeft } from '../components/shared/icons';
import { NOME_TIPO_LUOGO } from '../utils/citta';
import type { LuogoDto } from '../types';

function Luogo({ l }: { l: LuogoDto }) {
  return (
    <li className="card flex flex-col gap-1 text-[13px]">
      <div className="flex flex-wrap items-center gap-2">
        <strong className="text-[15px]">{l.nome}</strong>
        <span className="chip">{NOME_TIPO_LUOGO[l.tipo] ?? l.tipo}</span>
        {l.quando && <span className="chip">{l.quando === 'entrambe' ? 'giorno e sera' : l.quando}</span>}
        {!l.verificato && <span className="chip text-[11px]" title="Dato da fonte secondaria, non confermato sulla guida italiana">da fonte secondaria</span>}
      </div>
      <p className="m-0">{l.cosaOffre}</p>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-text-secondary">
        {l.giorni && <span><strong className="text-text">Giorni:</strong> {l.giorni}</span>}
        {l.sblocco && <span><strong className="text-text">Sblocco:</strong> {l.sblocco}</span>}
      </div>
      {(l.confidenti.length > 0 || l.attivita.length > 0) && (
        <div className="flex flex-wrap gap-1.5 items-center">
          {l.confidenti.map((c) => <Link key={c.chiave} to={`/confidenti/${c.chiave}`} className="chip chip--attivo no-underline">{c.nome}</Link>)}
          {l.attivita.map((a) => <span key={a} className="chip">{a}</span>)}
        </div>
      )}
      {l.piatti && l.piatti.length > 0 && (
        <div className="overflow-x-auto">
          <table className="tabella tabella--adattiva text-[12px]">
            <thead><tr><th>Piatto</th><th>Prezzo</th><th>Effetto</th></tr></thead>
            <tbody>{l.piatti.map((p) => <tr key={p.nome}><td data-etichetta="Piatto"><strong>{p.nome}</strong></td><td data-etichetta="Prezzo" className="tabular-nums">{p.prezzo !== null ? `${p.prezzo.toLocaleString('it-IT')} ¥` : '—'}</td><td data-etichetta="Effetto">{p.effetto || '—'}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      {l.negozio && <Link to={`/guida/negozi/${l.negozio}`} className="btn btn-ghost btn-sm self-start no-underline">Articoli in vendita</Link>}
      {l.note && <p className="m-0 text-[12px] text-text-muted">{l.note}</p>}
      {l.fonte && <a href={l.fonte} target="_blank" rel="noreferrer" className="text-[12px] text-primary self-start">fonte</a>}
    </li>
  );
}

export function QuartierePage() {
  const { chiave = '' } = useParams();
  const navigate = useNavigate();
  const dati = useCarica(() => getQuartiere(chiave), [chiave]);
  const q = dati.dati;
  useDocumentTitle(q?.nome ?? 'Quartiere');
  const [tipo, setTipo] = useState<string>('');
  const tipi = useMemo(() => [...new Set((q?.luoghi ?? []).map((l) => l.tipo))], [q]);
  const visibili = useMemo(() => (q?.luoghi ?? []).filter((l) => !tipo || l.tipo === tipo), [q, tipo]);
  return (
    <PageState isLoading={dati.caricamento && !q} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {q && (
        <div className="flex flex-col gap-3">
          <button type="button" className="btn btn-ghost btn-sm self-start touch" onClick={() => navigate('/guida/citta')}><IconChevronLeft size={16} /> La città</button>
          <div>
            <h1 className="m-0 text-2xl font-bold">{q.nome}</h1>
            {q.sblocco && <p className="m-0 mt-1 text-[13px]"><strong>Sblocco:</strong> {q.sblocco}</p>}
            {q.descrizione && <p className="m-0 mt-1 text-[13px] text-text-secondary">{q.descrizione}</p>}
            {q.fonte && <a href={q.fonte} target="_blank" rel="noreferrer" className="text-[12px] text-primary">fonte</a>}
          </div>
          {tipi.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              <button type="button" className={`chip touch ${tipo === '' ? 'chip--attivo' : ''}`} onClick={() => setTipo('')} aria-pressed={tipo === ''}>Tutti ({q.luoghi.length})</button>
              {tipi.map((t) => <button key={t} type="button" className={`chip touch ${tipo === t ? 'chip--attivo' : ''}`} onClick={() => setTipo(t)} aria-pressed={tipo === t}>{NOME_TIPO_LUOGO[t] ?? t}</button>)}
            </div>
          )}
          <ul className="m-0 p-0 list-none flex flex-col gap-2" aria-label="Luoghi">
            {visibili.map((l) => <Luogo key={l.chiave} l={l} />)}
          </ul>
        </div>
      )}
    </PageState>
  );
}
