// ============================================================
// SfidePage — Battaglie Sfida, boss segreti, Magnate e tratti delle Persona (Fase 9.2)
// ============================================================

import { useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getSfide } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { PageState } from '../components/shared/PageState';
import { CampoRicerca } from '../components/shared/CampoRicerca';
import { normalizzaTesto } from '../utils/testo';
import type { SfideDto } from '../types';

const SCHEDE = [['battaglie', 'Battaglie Sfida'], ['boss', 'Boss segreti'], ['magnate', 'Magnate'], ['tratti', 'Tratti']] as const;
type Scheda = (typeof SCHEDE)[number][0];

function Fonte({ url }: { url: string | null | undefined }) {
  return url ? <a href={url} target="_blank" rel="noreferrer" className="text-[12px] text-primary self-start">fonte</a> : null;
}
function Voce({ titolo, children }: { titolo: string; children: ReactNode }) {
  return <p className="m-0"><strong>{titolo}:</strong> {children}</p>;
}
function Elenco({ titolo, voci }: { titolo: string; voci: string[] }) {
  return voci.length > 0 ? <div><strong>{titolo}:</strong><ul className="m-0 pl-4">{voci.map((v) => <li key={v}>{v}</li>)}</ul></div> : null;
}

function SchedaBattaglie({ d }: { d: SfideDto }) {
  const b = d.battaglieSfida;
  return (
    <div className="flex flex-col gap-2 text-[13px]">
      <section className="card flex flex-col gap-1">
        <p className="m-0">{b.introduzione}</p>
        {b.sblocco && <Voce titolo="Sblocco">{b.sblocco}</Voce>}
        {b.regoleGenerali && <Voce titolo="Regole generali">{b.regoleGenerali}</Voce>}
        <Fonte url={b.fonte} />
      </section>
      {b.elenco.map((s) => (
        <section key={s.chiave} className="card flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2"><h2 className="m-0 text-[15px] font-semibold">{s.nomeIt ?? s.nome}</h2>{s.nomeIt && s.nomeIt !== s.nome && <span className="text-text-muted text-[12px]">({s.nome})</span>}{s.livelloConsigliato && <span className="chip">livello {s.livelloConsigliato}</span>}{!s.verificato && <span className="chip text-[11px]">da fonte secondaria</span>}</div>
          <Voce titolo="Regole">{s.regole}</Voce>
          <Elenco titolo="Nemici" voci={s.nemici} />
          {s.punteggi && <Voce titolo="Punteggi">{s.punteggi}</Voce>}
          <Elenco titolo="Ricompense" voci={s.ricompense} />
          {s.strategia && <Voce titolo="Strategia">{s.strategia}</Voce>}
          <Fonte url={s.fonte} />
        </section>
      ))}
    </div>
  );
}

function SchedaBoss({ d }: { d: SfideDto }) {
  return (
    <div className="flex flex-col gap-2 text-[13px]">
      {d.bossSegreti.map((b) => (
        <section key={b.chiave} className="card flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2"><h2 className="m-0 text-[15px] font-semibold">{b.nome}</h2>{b.livelloConsigliato && <span className="chip">livello {b.livelloConsigliato}</span>}{!b.verificato && <span className="chip text-[11px]">da fonte secondaria</span>}</div>
          <Voce titolo="Dove">{b.dove}</Voce>
          <Voce titolo="Quando">{b.quando}</Voce>
          <Elenco titolo="Requisiti" voci={b.requisiti} />
          <Elenco titolo="Mosse" voci={b.mosse} />
          {b.debolezze.length > 0 && <Voce titolo="Debolezze">{b.debolezze.join(', ')}</Voce>}
          {b.resistenze.length > 0 && <Voce titolo="Resistenze">{b.resistenze.join(', ')}</Voce>}
          <Elenco titolo="Strategia" voci={b.strategia} />
          <Elenco titolo="Ricompense" voci={b.ricompense} />
          <Fonte url={b.fonte} />
        </section>
      ))}
      <p className="m-0 text-[12px] text-text-muted">Il Mietitore e i Demoni del Tesoro sono in <Link to="/guida/battaglia?scheda=nemici">Aiuto in battaglia → Nemici speciali</Link>.</p>
    </div>
  );
}

function SchedaMagnate({ d }: { d: SfideDto }) {
  const m = d.magnate;
  if (!m) return <p className="m-0 text-[13px] text-text-muted">Nessun dato su Magnate.</p>;
  const campi: Array<[string, unknown]> = Object.entries(m).filter(([k]) => !['fonte', 'verificato'].includes(k));
  return (
    <section className="card flex flex-col gap-1 text-[13px]">
      <h2 className="m-0 text-[15px] font-semibold">Magnate (gioco di carte)</h2>
      {campi.map(([k, v]) => {
        const titolo = k.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/^./, (c) => c.toUpperCase());
        if (Array.isArray(v)) return <Elenco key={k} titolo={titolo} voci={v.map((x) => (typeof x === 'string' ? x : JSON.stringify(x)))} />;
        if (v && typeof v === 'object') return <div key={k}><strong>{titolo}:</strong><ul className="m-0 pl-4">{Object.entries(v as Record<string, unknown>).map(([kk, vv]) => <li key={kk}><strong>{kk}:</strong> {typeof vv === 'string' ? vv : JSON.stringify(vv)}</li>)}</ul></div>;
        return v ? <Voce key={k} titolo={titolo}>{String(v)}</Voce> : null;
      })}
      <Fonte url={m.fonte} />
    </section>
  );
}

function SchedaTratti({ d }: { d: SfideDto }) {
  const [q, setQ] = useState('');
  const [categoria, setCategoria] = useState('');
  const t = d.tratti;
  const categorie = useMemo(() => [...new Set(t.elenco.map((x) => x.categoria).filter((c): c is string => !!c))], [t]);
  const visibili = useMemo(() => { const n = normalizzaTesto(q); return t.elenco.filter((x) => (!categoria || x.categoria === categoria) && (!n || normalizzaTesto(`${x.nome} ${x.nomeEn ?? ''} ${x.effetto}`).includes(n))); }, [t, q, categoria]);
  return (
    <div className="flex flex-col gap-2 text-[13px]">
      {t.introduzione && <p className="m-0 text-text-secondary">{t.introduzione}</p>}
      <div className="flex flex-wrap gap-1.5 items-center">
        <div className="flex-1 min-w-[200px]"><CampoRicerca valore={q} onCambia={setQ} segnaposto="Cerca un tratto o un effetto…" /></div>
        <select className="form-input w-auto" value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Categoria">
          <option value="">Tutte le categorie</option>
          {categorie.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <p className="m-0 text-[12px] text-text-muted">{visibili.length} tratti su {t.elenco.length}.</p>
      <div className="overflow-x-auto">
        <table className="tabella tabella--adattiva text-[12px]">
          <thead><tr><th>Tratto</th><th>Effetto</th><th>Categoria</th></tr></thead>
          <tbody>{visibili.map((x) => <tr key={x.nome}><td data-etichetta="Tratto"><strong>{x.nome}</strong>{x.nomeEn && <span className="text-text-muted"> ({x.nomeEn})</span>}</td><td data-etichetta="Effetto">{x.effetto}</td><td data-etichetta="Categoria">{x.categoria ?? '—'}</td></tr>)}</tbody>
        </table>
      </div>
      <Fonte url={t.fonte} />
    </div>
  );
}

export function SfidePage() {
  useDocumentTitle('Battaglie Sfida, boss segreti e tratti');
  const dati = useCarica(() => getSfide(), []);
  const [params, setParams] = useSearchParams();
  const scheda = (SCHEDE.some(([k]) => k === params.get('scheda')) ? params.get('scheda') : 'battaglie') as Scheda;
  const d = dati.dati;
  return (
    <PageState isLoading={dati.caricamento && !d} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {d && (
        <div className="flex flex-col gap-3">
          <div>
            <h1 className="m-0 text-2xl font-bold">Battaglie Sfida, boss segreti e tratti</h1>
            <p className="m-0 mt-1 text-[13px] text-text-secondary">Le {d.battaglieSfida.elenco.length} Battaglie Sfida con regole, nemici e ricompense; i boss segreti (Jose, Gemelle Custodi, Lavenza) con mosse e strategia; Magnate; i {d.tratti.elenco.length} tratti delle Persona con l'effetto in italiano. Le domande del game show in TV sono in <Link to="/guida/domande">Domande in classe ed esami</Link>.</p>
          </div>
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Sezioni">
            {SCHEDE.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={scheda === k} className={`chip touch ${scheda === k ? 'chip--attivo' : ''}`} onClick={() => setParams(k === 'battaglie' ? {} : { scheda: k }, { replace: true })}>{l}</button>)}
          </div>
          {scheda === 'battaglie' && <SchedaBattaglie d={d} />}
          {scheda === 'boss' && <SchedaBoss d={d} />}
          {scheda === 'magnate' && <SchedaMagnate d={d} />}
          {scheda === 'tratti' && <SchedaTratti d={d} />}
        </div>
      )}
    </PageState>
  );
}
