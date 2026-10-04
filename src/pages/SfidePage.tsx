// ============================================================
// SfidePage — Battaglie Sfida, boss segreti, Magnate e tratti delle Persona (Fase 9.2)
// ============================================================

import { useMemo, useState } from 'react';
import { Fonte, VoceTesto } from '../components/shared/VoceFonte';
import { Selettore } from '../components/shared/Selettore';
import { Link, useSearchParams } from 'react-router-dom';
import { getSfide } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { PageState } from '../components/shared/PageState';
import { FilaScorrevole } from '../components/shared/FilaScorrevole';
import { CampoRicerca } from '../components/shared/CampoRicerca';
import { normalizzaTesto } from '../utils/testo';
import type { SfideDto } from '../types';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { AssetImg } from '../components/shared/AssetImg';
import { IconaScheda } from '../components/shared/IconaAzione';

const SCHEDE = [
  ['battaglie', 'Battaglie Sfida', 'sfide-battaglia'], ['boss', 'Boss segreti', 'boss'],
  ['magnate', 'Magnate', 'magnate'], ['tratti', 'Tratti', 'tratti'],
] as const;
type Scheda = (typeof SCHEDE)[number][0];

/** Un elenco puntato con il suo titolo in grassetto; niente se le voci sono zero. */
function Elenco({ titolo, voci }: { titolo: string; voci: string[] }) {
  return voci.length > 0 ? <div><strong>{titolo}:</strong><ul className="m-0 pl-4">{voci.map((v) => <li key={v}>{v}</li>)}</ul></div> : null;
}

/** Le Battaglie Sfida: introduzione, sblocco e regole generali, poi una carta per sfida con regole, nemici, punteggi, ricompense, strategia e fonte. */
function SchedaBattaglie({ d }: { d: SfideDto }) {
  const b = d.battaglieSfida;
  return (
    <div className="flex flex-col gap-2 text-[13px]">
      <section className="card flex flex-col gap-1">
        <p className="m-0">{b.introduzione}</p>
        {b.sblocco && <VoceTesto titolo="Sblocco">{b.sblocco}</VoceTesto>}
        {b.regoleGenerali && <VoceTesto titolo="Regole generali">{b.regoleGenerali}</VoceTesto>}
        <Fonte url={b.fonte} />
      </section>
      {b.elenco.map((s) => (
        <section key={s.chiave} className="card flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2"><h2 className="m-0 text-[15px] font-semibold">{s.nomeIt ?? s.nome}</h2>{s.nomeIt && s.nomeIt !== s.nome && <span className="text-text-muted text-[12px]">({s.nome})</span>}{s.livelloConsigliato && <span className="chip">livello {s.livelloConsigliato}</span>}{!s.verificato && <span className="chip text-[11px]">da fonte secondaria</span>}</div>
          <VoceTesto titolo="Regole">{s.regole}</VoceTesto>
          <Elenco titolo="Nemici" voci={s.nemici} />
          {s.punteggi && <VoceTesto titolo="Punteggi">{s.punteggi}</VoceTesto>}
          <Elenco titolo="Ricompense" voci={s.ricompense} />
          {s.strategia && <VoceTesto titolo="Strategia">{s.strategia}</VoceTesto>}
          <Fonte url={s.fonte} />
        </section>
      ))}
    </div>
  );
}

/** I boss segreti, una carta ciascuno con il ritratto (le Gemelle Custodi ne hanno due, Caroline e Justine), dove, quando, requisiti, mosse, debolezze, resistenze, strategia, ricompense e statistiche; in fondo il rimando al Mietitore e ai Demoni del Tesoro. */
function SchedaBoss({ d }: { d: SfideDto }) {
  return (
    <div className="flex flex-col gap-2 text-[13px]">
      {d.bossSegreti.map((b) => (
        <section key={b.chiave} className="card flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">{(b.chiave === 'gemelle-custodi' ? ['caroline', 'justine'] : [b.chiave]).map((k) => <AssetImg key={k} nome={`personaggi/${k}`} alt="" decorativa className="h-16 w-auto object-contain" fallback={null} />)}<h2 className="m-0 text-[15px] font-semibold">{b.nome}</h2>{b.livelloConsigliato && <span className="chip">livello {b.livelloConsigliato}</span>}{!b.verificato && <span className="chip text-[11px]">da fonte secondaria</span>}</div>
          <VoceTesto titolo="Dove">{b.dove}</VoceTesto>
          <VoceTesto titolo="Quando">{b.quando}</VoceTesto>
          <Elenco titolo="Requisiti" voci={b.requisiti} />
          <Elenco titolo="Mosse" voci={b.mosse} />
          {b.debolezze.length > 0 && <VoceTesto titolo="Debolezze">{b.debolezze.join(', ')}</VoceTesto>}
          {b.resistenze.length > 0 && <VoceTesto titolo="Resistenze">{b.resistenze.join(', ')}</VoceTesto>}
          <Elenco titolo="Strategia" voci={b.strategia} />
          <Elenco titolo="Ricompense" voci={b.ricompense} />
          {b.statistiche && <VoceTesto titolo="Statistiche">{Object.entries(b.statistiche).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(' · ')}</VoceTesto>}
          {b.nota && <p className="m-0 text-[12px] text-text-muted">{b.nota}</p>}
          <Fonte url={b.fonte} />
        </section>
      ))}
      <p className="m-0 text-[12px] text-text-muted">Il Mietitore e i Demoni del Tesoro sono in <Link to="/guida/battaglia?scheda=nemici">Aiuto in battaglia → Nemici speciali</Link>.</p>
    </div>
  );
}

/**
 * Magnate reso in modo generico dai campi del dato (tranne fonte e verificato): il nome del campo
 * in camelCase diventa il titolo a parole, gli elenchi diventano elenchi puntati, gli oggetti
 * elenchi «chiave: valore» e i testi voci semplici; i campi vuoti si saltano.
 */
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
        return v ? <VoceTesto key={k} titolo={titolo}>{String(v)}</VoceTesto> : null;
      })}
      <Fonte url={m.fonte} />
    </section>
  );
}

/** Tabella dei tratti delle Persona con ricerca (nome italiano e inglese, effetto, personaggio) e filtro per categoria, con le categorie ricavate dai tratti stessi. */
function SchedaTratti({ d }: { d: SfideDto }) {
  const [q, setQ] = useState('');
  const [categoria, setCategoria] = useState('');
  const t = d.tratti;
  const categorie = useMemo(() => [...new Set(t.elenco.map((x) => x.categoria).filter((c): c is string => !!c))], [t]);
  const visibili = useMemo(() => { const n = normalizzaTesto(q); return t.elenco.filter((x) => (!categoria || x.categoria === categoria) && (!n || normalizzaTesto(`${x.nome} ${x.nomeEn ?? ''} ${x.effetto} ${x.personaggio ?? ''}`).includes(n))); }, [t, q, categoria]);
  return (
    <div className="flex flex-col gap-2 text-[13px]">
      {t.introduzione && <p className="m-0 text-text-secondary">{t.introduzione}</p>}
      <div className="flex flex-wrap gap-1.5 items-center">
        <div className="flex-1 min-w-[200px]"><CampoRicerca valore={q} onCambia={setQ} segnaposto="Cerca un tratto o un effetto…" /></div>
        <Selettore compatto etichetta="Categoria" valore={categoria} vuoto="Tutte le categorie" opzioni={categorie.map((c) => ({ chiave: c, nome: c }))} onCambia={setCategoria} />
      </div>
      <p className="m-0 text-[12px] text-text-muted">{visibili.length} tratti su {t.elenco.length}.</p>
      <div className="area-scorrevole-x">
        <table className="tabella tabella--adattiva text-[12px]">
          <thead><tr><th>Tratto</th><th>Effetto</th><th>Categoria</th><th>Di chi</th></tr></thead>
          <tbody>{visibili.map((x) => <tr key={x.nome}><td data-etichetta="Tratto"><strong>{x.nome}</strong>{x.nomeEn && x.nomeEn !== x.nome && <span className="text-text-muted"> ({x.nomeEn})</span>}</td><td data-etichetta="Effetto">{x.effetto}</td><td data-etichetta="Categoria">{x.categoria ?? '—'}</td><td data-etichetta="Di chi">{x.personaggio ?? '—'}</td></tr>)}</tbody>
        </table>
      </div>
      <Fonte url={t.fonte} />
    </div>
  );
}

/** Pagina delle sfide: carica una volta i dati, sceglie la scheda dal parametro `scheda` dell'URL (le Battaglie Sfida quando manca o non è valido) e mostra la barra delle quattro schede con quella attiva sotto. */
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
          <IntestazionePagina titolo="Battaglie Sfida, boss segreti e tratti" sottotitolo={<>Le {d.battaglieSfida.elenco.length} Battaglie Sfida con regole, nemici e ricompense; i boss segreti (Jose, Gemelle Custodi, Lavenza) con mosse e strategia; Magnate; i {d.tratti.elenco.length} tratti delle Persona con l'effetto in italiano. Le domande del game show in TV sono in <Link to="/guida/domande">Domande in classe ed esami</Link>.</>} />
          <FilaScorrevole role="tablist" aria-label="Sezioni">
            {SCHEDE.map(([k, l, icona]) => (
              <button key={k} type="button" role="tab" aria-selected={scheda === k} title={l}
                className={`piastrella-scheda touch ${scheda === k ? 'piastrella-scheda--attiva' : ''}`}
                onClick={() => setParams(k === 'battaglie' ? {} : { scheda: k }, { replace: true })}>
                <IconaScheda chiave={icona} dimensione={28} /><span>{l}</span>
              </button>
            ))}
          </FilaScorrevole>
          {scheda === 'battaglie' && <SchedaBattaglie d={d} />}
          {scheda === 'boss' && <SchedaBoss d={d} />}
          {scheda === 'magnate' && <SchedaMagnate d={d} />}
          {scheda === 'tratti' && <SchedaTratti d={d} />}
        </div>
      )}
    </PageState>
  );
}
