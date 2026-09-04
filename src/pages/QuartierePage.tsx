// ============================================================
// QuartierePage — luoghi di un quartiere: cosa offrono, quando, sblocco, Confidenti, piatti (Fase 8.1)
// ============================================================

import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getQuartiere, impostaMarcatoreLuogo, scaricaPiantaQuartiere, urlImmagine } from '../services/api';
import { notifica } from '../stores/notificationStore';
import { ImmagineEntita } from '../components/shared/ImmagineEntita';
import { MappaInterattiva } from '../components/guida/MappaInterattiva';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { PageState } from '../components/shared/PageState';
import { IconChevronLeft } from '../components/shared/icons';
import { COLORE_TIPO_LUOGO, NOME_TIPO_LUOGO } from '../utils/citta';
import type { LuogoDto } from '../types';

function Luogo({ l, selezionato, onSeleziona, mappaPronta, onPosiziona, onTogliSpillo }: { l: LuogoDto; selezionato: boolean; onSeleziona: () => void; mappaPronta: boolean; onPosiziona: () => void; onTogliSpillo: () => void }) {
  return (
    <li className={`card flex flex-col gap-1 text-[13px] ${selezionato ? 'ring-2 ring-primary' : ''}`} onClick={onSeleziona}>
      <div className="flex flex-wrap items-center gap-2">
        <strong className="text-[15px]">{l.nome}</strong>
        <span className="chip">{NOME_TIPO_LUOGO[l.tipo] ?? l.tipo}</span>
        {l.quando && <span className="chip">{l.quando === 'entrambe' ? 'giorno e sera' : l.quando}</span>}
        {!l.verificato && <span className="chip text-[11px]" title="Dato da fonte secondaria, non confermato sulla guida italiana">da fonte secondaria</span>}
        {l.marcatore && <span className="text-[12px] text-text-muted">📍 sulla mappa</span>}
        {mappaPronta && (l.marcatore
          ? <button type="button" className="btn btn-ghost btn-sm ml-auto" onClick={(e) => { e.stopPropagation(); onTogliSpillo(); }}>Togli spillo</button>
          : <button type="button" className="btn btn-ghost btn-sm ml-auto" onClick={(e) => { e.stopPropagation(); onPosiziona(); }}>Posiziona sulla mappa</button>)}
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
  const [selezionato, setSelezionato] = useState<string | null>(null);
  const [posizionamento, setPosizionamento] = useState(false);
  const [mappaVersione, setMappaVersione] = useState(0);
  // Mappa pubblicata ma non ancora nell'istanza: scaricata appena il quartiere è aperto
  const download = useCarica(() => (q && !q.mappa && q.pianta ? scaricaPiantaQuartiere(q.chiave) : Promise.resolve(null)), [q?.chiave, q?.mappa, q?.pianta?.url]);
  const scaricata = !!q && !!download.dati && download.dati.quartiere === q.chiave;
  const mappaPronta = !!q && (q.mappa || mappaVersione > 0 || scaricata);
  const chiaveImmagine = q ? `citta-${q.chiave}` : '';
  const aggiornaLuogo = (nuovo: LuogoDto) => { if (q) dati.imposta({ ...q, luoghi: q.luoghi.map((l) => (l.chiave === nuovo.chiave ? nuovo : l)) }); };
  const posiziona = async (luogoChiave: string, x: number, y: number) => {
    const l = q?.luoghi.find((z) => z.chiave === luogoChiave);
    if (!l) return;
    try { aggiornaLuogo({ ...l, marcatore: await impostaMarcatoreLuogo(luogoChiave, { x, y }) }); notifica('success', `Spillo di «${l.nome}» posizionato.`); } catch (err) { notifica('error', err instanceof Error ? err.message : 'Posizionamento fallito.'); }
  };
  const togliSpillo = async (l: LuogoDto) => {
    try { await impostaMarcatoreLuogo(l.chiave, null); aggiornaLuogo({ ...l, marcatore: null }); } catch (err) { notifica('error', err instanceof Error ? err.message : 'Rimozione fallita.'); }
  };
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
            {q.fonte && <a href={q.fonte} target="_blank" rel="noreferrer" className="credito">fonte</a>}
          </div>
          {tipi.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              <button type="button" className={`chip touch ${tipo === '' ? 'chip--attivo' : ''}`} onClick={() => setTipo('')} aria-pressed={tipo === ''}>Tutti ({q.luoghi.length})</button>
              {tipi.map((t) => <button key={t} type="button" className={`chip touch ${tipo === t ? 'chip--attivo' : ''}`} onClick={() => setTipo(t)} aria-pressed={tipo === t}>{NOME_TIPO_LUOGO[t] ?? t}</button>)}
            </div>
          )}
          <section className="card flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <ImmagineEntita key={`${chiaveImmagine}-${mappaVersione}-${scaricata ? 's' : 'n'}`} ambito="mappa" chiave={chiaveImmagine} etichetta={`Mappa: ${q.nome}`} dimensione={96} forma="orizzontale" modificabile />
              <span className="text-[12px] text-text-muted flex-1 min-w-[200px]">
                {q.pianta ? (
                  <>Mappa da <a href={q.pianta.pagina ?? q.pianta.url} target="_blank" rel="noreferrer" className="credito">{q.pianta.fonte}</a>, scaricata nella tua istanza al primo uso{download.caricamento && !scaricata ? ' (scaricamento in corso…)' : ''}{download.errore ? '. Scaricamento non riuscito: riprova o importa un’immagine tua.' : '.'} Gli spilli dei luoghi si fissano in modalità «posiziona».</>
                ) : (
                  <>Nessuna mappa pubblicata per questo quartiere{q.piantaAssente ? `: ${q.piantaAssente}` : ''}. Puoi importare una tua immagine (file o URL); resta nella tua istanza.</>
                )}
              </span>
              {download.errore && q.pianta && <button type="button" className="btn btn-secondary btn-sm" onClick={() => void download.ricarica()}>Riprova</button>}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMappaVersione((v) => v + 1)}>Ricarica mappa</button>
            </div>
            {mappaPronta ? (
              <MappaInterattiva
                key={`${chiaveImmagine}-${mappaVersione}-${scaricata ? download.dati?.byte ?? 0 : 0}`}
                src={`${urlImmagine('mappa', chiaveImmagine)}?v=${mappaVersione}-${scaricata ? download.dati?.byte ?? 0 : 0}`}
                punti={visibili.map((l) => ({ chiave: l.chiave, nome: l.nome, tipo: l.tipo, stato: null, marcatore: l.marcatore }))}
                selezionato={selezionato}
                onSeleziona={setSelezionato}
                posizionamento={posizionamento}
                onPosiziona={(k, x, y) => void posiziona(k, x, y)}
                mostraGestiti
                nomeTipo={NOME_TIPO_LUOGO}
                coloreTipo={COLORE_TIPO_LUOGO}
              />
            ) : (
              <p className="m-0 text-[13px] text-text-muted">{download.caricamento ? 'Scaricamento della mappa in corso…' : 'Nessuna mappa per questo quartiere: l’elenco dei luoghi resta comunque disponibile.'}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 text-[12px]">
              <button type="button" className={`chip touch ${posizionamento ? 'chip--attivo' : ''}`} onClick={() => setPosizionamento((v) => !v)} aria-pressed={posizionamento} disabled={!mappaPronta}>Modalità posiziona spilli</button>
              {selezionato && <span className="text-text-muted">Selezionato: {q.luoghi.find((l) => l.chiave === selezionato)?.nome}</span>}
            </div>
          </section>
          <ul className="m-0 p-0 list-none flex flex-col gap-2" aria-label="Luoghi">
            {visibili.map((l) => <Luogo key={l.chiave} l={l} selezionato={selezionato === l.chiave} onSeleziona={() => setSelezionato(l.chiave)} mappaPronta={mappaPronta} onPosiziona={() => { setSelezionato(l.chiave); setPosizionamento(true); }} onTogliSpillo={() => void togliSpillo(l)} />)}
          </ul>
        </div>
      )}
    </PageState>
  );
}
