// ============================================================
// SfidePage — Battaglie Sfida, boss segreti, Magnate e tratti delle Persona (Fase 9.2)
// ============================================================

import { useMemo, useState } from 'react';
import { Fonte, VoceTesto } from '../components/shared/VoceFonte';
import { Selettore } from '../components/shared/Selettore';
import { Link, useSearchParams } from 'react-router-dom';
import { getSfide } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useSchede } from '../hooks/useSchede';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useElementoDaIndirizzo } from '../hooks/useElementoDaIndirizzo';
import { PageState } from '../components/shared/PageState';
import { FilaScorrevole } from '../components/shared/FilaScorrevole';
import { CampoRicerca } from '../components/shared/CampoRicerca';
import { normalizzaTesto } from '../utils/testo';
import type { SfideDto } from '../types';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { AssetImg } from '../components/shared/AssetImg';
import { IconaScheda } from '../components/shared/IconaAzione';
import { OggettiCollegati } from '../components/catalogo/OggettiCollegati';
import { ModificaGuida } from '../components/guida/ModificaGuida';
import { TitoloSezione } from '../components/shared/TitoloSezione';

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
function SchedaBattaglie({ d, onModificato }: { d: SfideDto; onModificato: () => void }) {
  const b = d.battaglieSfida;
  return (
    <div className="flex flex-col gap-2 testo-13">
      <section className="card flex flex-col gap-1">
        <div className="flex items-start gap-2">
          <p className="m-0 min-w-0 flex-1">{b.introduzione}</p>
          <ModificaGuida tipo="sfide-battaglie" chiave="battaglie" cosa="l’introduzione delle Battaglie Sfida" soloIcona onSalvato={onModificato} />
        </div>
        {b.sblocco && <VoceTesto titolo="Sblocco">{b.sblocco}</VoceTesto>}
        {b.regoleGenerali && <VoceTesto titolo="Regole generali">{b.regoleGenerali}</VoceTesto>}
        <Fonte url={b.fonte} />
      </section>
      {b.elenco.map((s) => (
        <section key={s.chiave} id={`elemento-${s.chiave}`} className="card flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2"><TitoloSezione>{s.nomeIt ?? s.nome}</TitoloSezione>{s.nomeIt && s.nomeIt !== s.nome && <span className="text-text-muted testo-12">({s.nome})</span>}{s.livelloConsigliato && <span className="chip">livello {s.livelloConsigliato}</span>}{!s.verificato && <span className="chip testo-12">da fonte secondaria</span>}<ModificaGuida tipo="battaglia-sfida" chiave={s.chiave} cosa={`la Battaglia Sfida «${s.nomeIt ?? s.nome}»`} soloIcona className="ml-auto" onSalvato={onModificato} /></div>
          <VoceTesto titolo="Regole">{s.regole}</VoceTesto>
          <Elenco titolo="Nemici" voci={s.nemici} />
          {s.punteggi && <VoceTesto titolo="Punteggi">{s.punteggi}</VoceTesto>}
          {!!s.oggettiRicompensa?.length && <OggettiCollegati oggetti={s.oggettiRicompensa} />}
          <Elenco titolo={s.oggettiRicompensa?.length ? 'Indicazioni della guida' : 'Ricompense'} voci={s.ricompense} />
          {s.strategia && <VoceTesto titolo="Strategia">{s.strategia}</VoceTesto>}
          <Fonte url={s.fonte} />
        </section>
      ))}
    </div>
  );
}

/** I boss segreti, una carta ciascuno con il ritratto (le Gemelle Custodi ne hanno due, Caroline e Justine), dove, quando, requisiti, mosse, debolezze, resistenze, strategia, ricompense e statistiche; in fondo il rimando al Mietitore e ai Demoni del Tesoro. */
function SchedaBoss({ d, onModificato }: { d: SfideDto; onModificato: () => void }) {
  return (
    <div className="flex flex-col gap-2 testo-13">
      {d.bossSegreti.map((b) => (
        <section key={b.chiave} id={`elemento-${b.chiave}`} className="card flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">{(b.chiave === 'gemelle-custodi' ? ['caroline', 'justine'] : [b.chiave]).map((k) => <AssetImg key={k} nome={`personaggi/${k}`} alt="" decorativa className="h-16 w-auto object-contain" fallback={null} />)}<TitoloSezione>{b.nome}</TitoloSezione>{b.livelloConsigliato && <span className="chip">livello {b.livelloConsigliato}</span>}{!b.verificato && <span className="chip testo-12">da fonte secondaria</span>}<ModificaGuida tipo="boss-segreto" chiave={b.chiave} cosa={`il boss segreto «${b.nome}»`} soloIcona className="ml-auto" onSalvato={onModificato} /></div>
          <VoceTesto titolo="Dove">{b.dove}</VoceTesto>
          <VoceTesto titolo="Quando">{b.quando}</VoceTesto>
          <Elenco titolo="Requisiti" voci={b.requisiti} />
          <Elenco titolo="Mosse" voci={b.mosse} />
          {b.debolezze.length > 0 && <VoceTesto titolo="Debolezze">{b.debolezze.join(', ')}</VoceTesto>}
          {b.resistenze.length > 0 && <VoceTesto titolo="Resistenze">{b.resistenze.join(', ')}</VoceTesto>}
          <Elenco titolo="Strategia" voci={b.strategia} />
          {!!b.oggettiRicompensa?.length && <OggettiCollegati oggetti={b.oggettiRicompensa} />}
          <Elenco titolo={b.oggettiRicompensa?.length ? 'Indicazioni della guida' : 'Ricompense'} voci={b.ricompense} />
          {b.statistiche && <VoceTesto titolo="Statistiche">{Object.entries(b.statistiche).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(' · ')}</VoceTesto>}
          {b.nota && <p className="m-0 testo-12 text-text-muted">{b.nota}</p>}
          <Fonte url={b.fonte} />
        </section>
      ))}
      <p className="m-0 testo-12 text-text-muted">Il Mietitore e i Demoni del Tesoro sono in <Link to="/guida/battaglia?scheda=nemici">Aiuto in battaglia → Nemici speciali</Link>.</p>
    </div>
  );
}

/**
 * Magnate reso in modo generico dai campi del dato (tranne fonte e verificato): il nome del campo
 * in camelCase diventa il titolo a parole, gli elenchi diventano elenchi puntati, gli oggetti
 * elenchi «chiave: valore» e i testi voci semplici; i campi vuoti si saltano.
 */
function SchedaMagnate({ d, onModificato }: { d: SfideDto; onModificato: () => void }) {
  const m = d.magnate;
  if (!m) return <p className="m-0 testo-13 text-text-muted">Nessun dato su Magnate.</p>;
  // le sfide di Magnate sono un elenco di oggetti: si leggono (e si correggono) una per una, non come testo
  const sfideMagnate = Array.isArray(m.sfide) ? (m.sfide as Array<{ nome: string; condizione: string; ricompensa: string }>) : [];
  const campi: Array<[string, unknown]> = Object.entries(m).filter(([k]) => !['fonte', 'verificato', 'sfide'].includes(k));
  return (
    <section className="card flex flex-col gap-1 testo-13">
      <div className="flex items-start gap-2">
        <TitoloSezione className="min-w-0 flex-1">Magnate (gioco di carte)</TitoloSezione>
        <ModificaGuida tipo="sfide-magnate" chiave="magnate" cosa="le regole di Magnate" soloIcona onSalvato={onModificato} />
      </div>
      {sfideMagnate.length > 0 && (
        <div>
          <strong>Sfide:</strong>
          <ul className="m-0 flex list-none flex-col gap-1 p-0 pt-1">
            {sfideMagnate.map((s) => (
              <li key={s.nome} className="flex items-start gap-2">
                <span className="min-w-0 flex-1"><strong>{s.nome}</strong>: {s.condizione} → {s.ricompensa}</span>
                <ModificaGuida tipo="magnate-sfida" chiave={s.nome} cosa={`la sfida di Magnate «${s.nome}»`} soloIcona onSalvato={onModificato} />
              </li>
            ))}
          </ul>
        </div>
      )}
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
function SchedaTratti({ d, onModificato }: { d: SfideDto; onModificato: () => void }) {
  const [q, setQ] = useState('');
  const [categoria, setCategoria] = useState('');
  const t = d.tratti;
  const categorie = useMemo(() => [...new Set(t.elenco.map((x) => x.categoria).filter((c): c is string => !!c))], [t]);
  const visibili = useMemo(() => { const n = normalizzaTesto(q); return t.elenco.filter((x) => (!categoria || x.categoria === categoria) && (!n || normalizzaTesto(`${x.nome} ${x.nomeEn ?? ''} ${x.effetto} ${x.personaggio ?? ''}`).includes(n))); }, [t, q, categoria]);
  return (
    <div className="flex flex-col gap-2 testo-13">
      <div className="flex items-start gap-2">
        <p className="m-0 min-w-0 flex-1 text-text-secondary">{t.introduzione}</p>
        <ModificaGuida tipo="sfide-tratti" chiave="tratti" cosa="l’introduzione dei tratti" soloIcona onSalvato={onModificato} />
      </div>
      <div className="flex flex-wrap gap-1.5 items-center">
        <div className="flex-1 min-w-[200px]"><CampoRicerca valore={q} onCambia={setQ} segnaposto="Cerca un tratto o un effetto…" /></div>
        <Selettore compatto etichetta="Categoria" valore={categoria} vuoto="Tutte le categorie" opzioni={categorie.map((c) => ({ chiave: c, nome: c }))} onCambia={setCategoria} />
      </div>
      <p className="m-0 testo-12 text-text-muted">{visibili.length} tratti su {t.elenco.length}.</p>
      <div className="area-scorrevole-x">
        <table className="tabella tabella--adattiva testo-12">
          <thead><tr><th>Tratto</th><th>Effetto</th><th>Categoria</th><th>Di chi</th></tr></thead>
          <tbody>{visibili.map((x) => <tr key={x.nome}><td data-etichetta="Tratto"><div className="flex items-start gap-1"><span className="min-w-0 flex-1"><strong>{x.nome}</strong>{x.nomeEn && x.nomeEn !== x.nome && <span className="text-text-muted"> ({x.nomeEn})</span>}</span><ModificaGuida tipo="tratto" chiave={x.nome} cosa={`il tratto «${x.nome}»`} soloIcona onSalvato={onModificato} /></div></td><td data-etichetta="Effetto">{x.effetto}</td><td data-etichetta="Categoria">{x.categoria ?? '—'}</td><td data-etichetta="Di chi">{x.personaggio ?? '—'}</td></tr>)}</tbody>
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
  /** Dopo una correzione o un ripristino dei testi della guida (L11 · B11): la pagina rilegge i suoi dati. */
  const ricarica = () => void dati.ricarica();
  // L11 B4 (R11-07/3): `?scheda=<scheda>&elemento=<chiave>` (la «casa» di una sfida nella ricerca globale) porta in vista la carta e la evidenzia
  useElementoDaIndirizzo(!!d, scheda);
  const schede = useSchede({ chiavi: SCHEDE.map(([k]) => k), attiva: scheda, onScegli: (k) => setParams(k === 'battaglie' ? {} : { scheda: k }, { replace: true }) });
  return (
    <PageState isLoading={dati.caricamento && !d} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {d && (
        <div className="flex flex-col gap-3">
          <IntestazionePagina titolo="Battaglie Sfida, boss segreti e tratti" sottotitolo={<>Le {d.battaglieSfida.elenco.length} Battaglie Sfida con regole, nemici e ricompense; i boss segreti (Jose, Gemelle Custodi, Lavenza) con mosse e strategia; Magnate; i {d.tratti.elenco.length} tratti delle Persona con l'effetto in italiano. Le domande del game show in TV sono in <Link to="/guida/domande">Domande in classe ed esami</Link>.</>} />
          <FilaScorrevole {...schede.lista} aria-label="Sezioni">
            {SCHEDE.map(([k, l, icona]) => (
              <button key={k} type="button" {...schede.scheda(k)} title={l}
                className={`piastrella-scheda touch ${scheda === k ? 'piastrella-scheda--attiva' : ''}`}>
                <IconaScheda chiave={icona} dimensione={28} /><span>{l}</span>
              </button>
            ))}
          </FilaScorrevole>
          <div {...schede.pannello(scheda)} className="flex min-w-0 flex-col gap-3">
            {scheda === 'battaglie' && <SchedaBattaglie d={d} onModificato={ricarica} />}
            {scheda === 'boss' && <SchedaBoss d={d} onModificato={ricarica} />}
            {scheda === 'magnate' && <SchedaMagnate d={d} onModificato={ricarica} />}
            {scheda === 'tratti' && <SchedaTratti d={d} onModificato={ricarica} />}
          </div>
        </div>
      )}
    </PageState>
  );
}
