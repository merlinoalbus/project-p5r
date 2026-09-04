// ============================================================
// OggettiPage — consumabili, oggetti chiave e materiali, fabbricazione, personalizzazione delle armi, abiti e lavanderia, scambi (Fase 10.2)
// ============================================================

import { useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getOggettiGuida } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { PageState } from '../components/shared/PageState';
import { CampoRicerca } from '../components/shared/CampoRicerca';
import { normalizzaTesto } from '../utils/testo';
import type { OggettiGuidaDto } from '../types';

const SCHEDE = [['consumabili', 'Consumabili'], ['chiave', 'Chiave e materiali'], ['fabbricazione', 'Fabbricazione'], ['armi', 'Personalizzazione armi'], ['abiti', 'Abiti e lavanderia'], ['scambi', 'Scambi']] as const;
type Scheda = (typeof SCHEDE)[number][0];
const NOME_CATEGORIA: Record<string, string> = { cura: 'Cura HP', sp: 'Recupero SP', stato: 'Stati alterati', battaglia: 'Battaglia', esplorazione: 'Esplorazione', altro: 'Altro' };

function Fonte({ url }: { url: string | null | undefined }) {
  return url ? <a href={url.split(' ;')[0]} target="_blank" rel="noreferrer" className="credito self-start">fonte</a> : null;
}
function Voce({ titolo, children }: { titolo: string; children: ReactNode }) {
  return <p className="m-0"><strong>{titolo}:</strong> {children}</p>;
}
function Secondaria({ v }: { v: boolean }) {
  return v ? null : <span className="chip text-[11px]" title="Dato da fonte secondaria, non dalla guida italiana">da fonte secondaria</span>;
}

function SchedaConsumabili({ d }: { d: OggettiGuidaDto }) {
  const [q, setQ] = useState('');
  const [categoria, setCategoria] = useState('');
  const visibili = useMemo(() => { const n = normalizzaTesto(q); return d.consumabili.filter((x) => (!categoria || x.categoria === categoria) && (!n || normalizzaTesto(`${x.nome} ${x.nomeEn ?? ''} ${x.effetto} ${x.dove}`).includes(n))); }, [d, q, categoria]);
  return (
    <div className="flex flex-col gap-2 text-[13px]">
      <div className="flex flex-wrap gap-1.5 items-center">
        <div className="flex-1 min-w-[200px]"><CampoRicerca valore={q} onCambia={setQ} segnaposto="Cerca un oggetto, un effetto o dove si trova…" /></div>
        <select className="form-input w-auto" value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Categoria">
          <option value="">Tutte le categorie</option>
          {Object.entries(NOME_CATEGORIA).filter(([k]) => d.consumabili.some((x) => x.categoria === k)).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
        </select>
      </div>
      <p className="m-0 text-[12px] text-text-muted">{visibili.length} oggetti su {d.consumabili.length}.</p>
      <div className="overflow-x-auto">
        <table className="tabella tabella--adattiva text-[12px]">
          <thead><tr><th>Oggetto</th><th>Categoria</th><th>Effetto</th><th>Dove</th><th>Prezzo</th></tr></thead>
          <tbody>{visibili.map((x) => <tr key={`${x.nome}-${x.categoria}`}><td data-etichetta="Oggetto"><strong>{x.nome}</strong>{x.nomeEn && x.nomeEn !== x.nome && <span className="text-text-muted"> ({x.nomeEn})</span>} <Secondaria v={x.verificato} /></td><td data-etichetta="Categoria">{NOME_CATEGORIA[x.categoria] ?? x.categoria}</td><td data-etichetta="Effetto">{x.effetto}</td><td data-etichetta="Dove">{x.dove || '—'}</td><td data-etichetta="Prezzo" className="tabular-nums whitespace-nowrap">{x.prezzo !== null ? `${x.prezzo.toLocaleString('it-IT')} ¥` : '—'}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

function SchedaChiave({ d }: { d: OggettiGuidaDto }) {
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState('');
  const visibili = useMemo(() => { const n = normalizzaTesto(q); return d.chiaveEMateriali.filter((x) => (!tipo || x.tipo === tipo) && (!n || normalizzaTesto(`${x.nome} ${x.nomeEn ?? ''} ${x.uso} ${x.dove}`).includes(n))); }, [d, q, tipo]);
  return (
    <div className="flex flex-col gap-2 text-[13px]">
      <div className="flex flex-wrap gap-1.5 items-center">
        <div className="flex-1 min-w-[200px]"><CampoRicerca valore={q} onCambia={setQ} segnaposto="Cerca un oggetto chiave o un materiale…" /></div>
        <select className="form-input w-auto" value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo">
          <option value="">Chiave e materiali</option>
          <option value="chiave">Oggetti chiave</option>
          <option value="materiale">Materiali</option>
        </select>
      </div>
      <p className="m-0 text-[12px] text-text-muted">{visibili.length} voci su {d.chiaveEMateriali.length}.</p>
      <div className="overflow-x-auto">
        <table className="tabella tabella--adattiva text-[12px]">
          <thead><tr><th>Oggetto</th><th>Tipo</th><th>Uso</th><th>Dove</th></tr></thead>
          <tbody>{visibili.map((x) => <tr key={`${x.nome}-${x.tipo}`}><td data-etichetta="Oggetto"><strong>{x.nome}</strong>{x.nomeEn && x.nomeEn !== x.nome && <span className="text-text-muted"> ({x.nomeEn})</span>} <Secondaria v={x.verificato} /></td><td data-etichetta="Tipo">{x.tipo === 'chiave' ? 'Oggetto chiave' : 'Materiale'}</td><td data-etichetta="Uso">{x.uso}</td><td data-etichetta="Dove">{x.dove || '—'}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

function SchedaFabbricazione({ d }: { d: OggettiGuidaDto }) {
  const f = d.fabbricazione;
  return (
    <div className="flex flex-col gap-2 text-[13px]">
      <section className="card flex flex-col gap-1">
        <p className="m-0">{f.introduzione}</p>
        {f.sblocco && <Voce titolo="Sblocco">{f.sblocco}</Voce>}
        {f.regole.length > 0 && <ul className="m-0 pl-4">{f.regole.map((r) => <li key={r}>{r}</li>)}</ul>}
        <Fonte url={f.fonte} />
      </section>
      <div className="overflow-x-auto">
        <table className="tabella tabella--adattiva text-[12px]">
          <thead><tr><th>Attrezzo</th><th>Effetto</th><th>Materiali</th><th>Prodotti</th><th>Sblocco</th></tr></thead>
          <tbody>{f.ricette.map((r) => <tr key={r.attrezzo}><td data-etichetta="Attrezzo"><strong>{r.attrezzo}</strong> <Secondaria v={r.verificato} /></td><td data-etichetta="Effetto">{r.effetto}</td><td data-etichetta="Materiali">{r.materiali.map((m) => `${m.nome}${m.quantita !== null ? ` ×${m.quantita}` : ''}`).join(', ') || '—'}</td><td data-etichetta="Prodotti" className="tabular-nums">{r.prodotti ?? '—'}</td><td data-etichetta="Sblocco">{r.sblocco ?? '—'}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

function SchedaArmi({ d }: { d: OggettiGuidaDto }) {
  const p = d.personalizzazioneArmi;
  return (
    <div className="flex flex-col gap-2 text-[13px]">
      <section className="card flex flex-col gap-1">
        <p className="m-0">{p.introduzione}</p>
        {p.requisiti && <Voce titolo="Requisiti">{p.requisiti}</Voce>}
        {p.costi && <Voce titolo="Costi">{p.costi}</Voce>}
        {p.note && <p className="m-0 text-text-muted">{p.note}</p>}
        <Fonte url={p.fonte} />
      </section>
      {p.effetti.length > 0 && (
        <div className="overflow-x-auto">
          <table className="tabella tabella--adattiva text-[12px]">
            <thead><tr><th>Modifica</th><th>Effetto</th><th>Costo</th></tr></thead>
            <tbody>{p.effetti.map((e) => <tr key={e.nome}><td data-etichetta="Modifica"><strong>{e.nome}</strong></td><td data-etichetta="Effetto">{e.effetto}</td><td data-etichetta="Costo">{e.costo ?? '—'}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      {p.progressioneConfidente.length > 0 && (
        <section className="card flex flex-col gap-1">
          <h2 className="m-0 text-[15px] font-semibold">Progressione con il Confidente (Iwai)</h2>
          <ul className="m-0 pl-4">{p.progressioneConfidente.map((x) => <li key={typeof x === 'string' ? x : JSON.stringify(x)}>{typeof x === 'string' ? x : Object.entries(x as Record<string, unknown>).map(([k, v]) => `${k}: ${String(v)}`).join(' · ')}</li>)}</ul>
        </section>
      )}
    </div>
  );
}

function SchedaAbiti({ d }: { d: OggettiGuidaDto }) {
  const [q, setQ] = useState('');
  const visibili = useMemo(() => { const n = normalizzaTesto(q); return d.abiti.elenco.filter((x) => !n || normalizzaTesto(`${x.nome} ${x.per} ${x.dove}`).includes(n)); }, [d, q]);
  return (
    <div className="flex flex-col gap-2 text-[13px]">
      {d.abiti.introduzione && <p className="m-0 text-text-secondary">{d.abiti.introduzione}</p>}
      <section className="card flex flex-col gap-1">
        <h2 className="m-0 text-[15px] font-semibold">Lavanderia</h2>
        <Voce titolo="Dove">{d.abiti.lavanderia.dove}</Voce>
        <Voce titolo="Costo">{d.abiti.lavanderia.costo}</Voce>
        {d.abiti.lavanderia.regole.length > 0 && <ul className="m-0 pl-4">{d.abiti.lavanderia.regole.map((r) => <li key={r}>{r}</li>)}</ul>}
        <Fonte url={d.abiti.lavanderia.fonte} />
      </section>
      <CampoRicerca valore={q} onCambia={setQ} segnaposto="Cerca un abito o un personaggio…" />
      <p className="m-0 text-[12px] text-text-muted">{visibili.length} abiti su {d.abiti.elenco.length}.</p>
      <div className="overflow-x-auto">
        <table className="tabella tabella--adattiva text-[12px]">
          <thead><tr><th>Abito</th><th>Per</th><th>Dove</th></tr></thead>
          <tbody>{visibili.map((x) => <tr key={`${x.nome}-${x.per}`}><td data-etichetta="Abito"><strong>{x.nome}</strong></td><td data-etichetta="Per">{x.per}</td><td data-etichetta="Dove">{x.dove}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

function SchedaScambi({ d }: { d: OggettiGuidaDto }) {
  return (
    <div className="flex flex-col gap-2 text-[13px]">
      {d.scambi.map((s) => (
        <section key={s.venditore} className="card flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2"><h2 className="m-0 text-[15px] font-semibold">{s.venditore}</h2><span className="chip">{s.dove}</span><Secondaria v={s.verificato} /></div>
          {s.quando && <Voce titolo="Quando">{s.quando}</Voce>}
          <div className="overflow-x-auto">
            <table className="tabella tabella--adattiva text-[12px]">
              <thead><tr><th>Ricevi</th><th>Dai</th><th>Note</th></tr></thead>
              <tbody>{s.offerte.map((o, i) => <tr key={i}><td data-etichetta="Ricevi"><strong>{o.ricevi}</strong></td><td data-etichetta="Dai">{o.dai}</td><td data-etichetta="Note">{o.note ?? '—'}</td></tr>)}</tbody>
            </table>
          </div>
          <Fonte url={s.fonte} />
        </section>
      ))}
    </div>
  );
}

export function OggettiPage() {
  useDocumentTitle('Oggetti, materiali e fabbricazione');
  const dati = useCarica(() => getOggettiGuida(), []);
  const [params, setParams] = useSearchParams();
  const scheda = (SCHEDE.some(([k]) => k === params.get('scheda')) ? params.get('scheda') : 'consumabili') as Scheda;
  const d = dati.dati;
  return (
    <PageState isLoading={dati.caricamento && !d} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {d && (
        <div className="flex flex-col gap-3">
          <div>
            <h1 className="m-0 text-2xl font-bold">Oggetti, materiali e fabbricazione</h1>
            <p className="m-0 mt-1 text-[13px] text-text-secondary">{d.consumabili.length} consumabili, {d.chiaveEMateriali.length} oggetti chiave e materiali, {d.fabbricazione.ricette.length} ricette degli attrezzi da infiltrazione, la personalizzazione delle armi da Iwai, {d.abiti.elenco.length} abiti con la lavanderia e gli scambi dei venditori speciali. Le armi, le protezioni e gli accessori sono nel Compendio; i prezzi dei negozi in Negozi e inventario.</p>
          </div>
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Sezioni">
            {SCHEDE.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={scheda === k} className={`chip touch ${scheda === k ? 'chip--attivo' : ''}`} onClick={() => setParams(k === 'consumabili' ? {} : { scheda: k }, { replace: true })}>{l}</button>)}
          </div>
          {scheda === 'consumabili' && <SchedaConsumabili d={d} />}
          {scheda === 'chiave' && <SchedaChiave d={d} />}
          {scheda === 'fabbricazione' && <SchedaFabbricazione d={d} />}
          {scheda === 'armi' && <SchedaArmi d={d} />}
          {scheda === 'abiti' && <SchedaAbiti d={d} />}
          {scheda === 'scambi' && <SchedaScambi d={d} />}
        </div>
      )}
    </PageState>
  );
}
