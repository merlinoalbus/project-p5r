// ============================================================
// QuartierePage — luoghi di un quartiere: cosa offrono, quando, sblocco, Confidenti, piatti; mappa del quartiere con i luoghi come spilli (Fase 8.1, mappe 13.4)
// ============================================================
//
// Il posizionamento degli spilli e le immagini di base si gestiscono nell'editor delle mappe («Modifica mappa» nel visore).
// ============================================================

import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getQuartiere, scaricaPiantaQuartiere } from '../services/api';
import { MappaIncorporata } from '../components/mappe/MappaIncorporata';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { PageState } from '../components/shared/PageState';
import { IconChevronLeft } from '../components/shared/icons';
import { NOME_TIPO_LUOGO } from '../utils/citta';
import type { LuogoDto } from '../types';
import { PulsanteVisivo, CollegamentoVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione } from '../components/shared/IconaAzione';

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
            <tbody>{l.piatti.map((p) => <tr key={p.nome}><td data-etichetta="Piatto"><strong>{p.nome}</strong></td><td data-etichetta="Prezzo" className="tabular-nums">{p.prezzo !== null ? `${p.prezzo.toLocaleString('it-IT')} ¥` : '—'}</td><td data-etichetta="Effetto">{p.effetto}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      {l.negozio && <CollegamentoVisivo tono="fantasma" compatto className="self-start" icona={<IconaAzione chiave="negozio" dimensione={20} />} titolo="Articoli in vendita" to={`/guida/negozi/${l.negozio}`} />}
      {l.note && <p className="m-0 text-[12px] text-text-muted">{l.note}</p>}
      {l.fonte && <a href={l.fonte} target="_blank" rel="noreferrer" className="credito self-start">fonte</a>}
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
  // Mappa pubblicata ma non ancora nell'istanza: scaricata appena il quartiere è aperto, poi il visore la usa come immagine di base
  const download = useCarica(() => (q && !q.mappa && q.pianta ? scaricaPiantaQuartiere(q.chiave) : Promise.resolve(null)), [q?.chiave, q?.mappa, q?.pianta?.url]);
  const scaricata = !!q && !!download.dati && download.dati.quartiere === q.chiave;
  const tipi = useMemo(() => [...new Set((q?.luoghi ?? []).map((l) => l.tipo))], [q]);
  const visibili = useMemo(() => (q?.luoghi ?? []).filter((l) => !tipo || l.tipo === tipo), [q, tipo]);
  return (
    <PageState isLoading={dati.caricamento && !q} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {q && (
        <div className="flex flex-col gap-3">
          <button type="button" className="btn btn-ghost btn-sm self-start touch" onClick={() => navigate('/guida/citta')}><IconChevronLeft size={16} /> La città</button>
          <div>
            <h1 className="titolo-display m-0">{q.nome}</h1>
            {q.sblocco && <p className="m-0 mt-1 text-[13px]"><strong>Sblocco:</strong> {q.sblocco}</p>}
            {q.descrizione && <p className="m-0 mt-1 text-[13px] text-text-secondary">{q.descrizione}</p>}
            {q.fonte && <a href={q.fonte} target="_blank" rel="noreferrer" className="credito">fonte</a>}
          </div>
          <section className="flex flex-col gap-1.5">
            <MappaIncorporata chiave={`citta-${q.chiave}`} versione={scaricata ? download.dati?.byte ?? 0 : 0} altezza={520} />
            <div className="flex flex-wrap items-center gap-2 text-[12px] text-text-muted">
              {q.pianta ? (
                <span>Mappa da <a href={q.pianta.pagina ?? q.pianta.url} target="_blank" rel="noreferrer" className="credito">{q.pianta.fonte}</a>, scaricata nella tua istanza al primo uso{download.caricamento && !scaricata ? ' (scaricamento in corso…)' : ''}. Spilli e immagine si modificano dall'editor.</span>
              ) : (
                <span>Nessuna mappa pubblicata per questo quartiere{q.piantaAssente ? `: ${q.piantaAssente}` : ''}: carica una tua immagine dall'editor della mappa (resta nella tua istanza).</span>
              )}
              {download.errore && q.pianta && <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="riprova" dimensione={20} />} titolo="Riprova" onClick={() => void download.ricarica()} />}
            </div>
          </section>
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
