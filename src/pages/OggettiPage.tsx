// ============================================================
// OggettiPage — catalogo unico e sezioni della guida, con gli indirizzi storici conservati
// ============================================================

import { useMemo, useState } from 'react';
import { Fonte, VoceTesto } from '../components/shared/VoceFonte';
import { Link, useSearchParams } from 'react-router-dom';
import { getOggettiGuida } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { PageState } from '../components/shared/PageState';
import { FilaScorrevole } from '../components/shared/FilaScorrevole';
import { CampoRicerca } from '../components/shared/CampoRicerca';
import { normalizzaTesto } from '../utils/testo';
import type { OggettiGuidaDto } from '../types';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { IconaCategoria } from '../components/guida/IconaCategoria';
import { IconaScheda } from '../components/shared/IconaAzione';
import { RitrattoPersonaggio } from '../components/guida/RitrattoPersonaggio';
import { OggettiCollegati } from '../components/catalogo/OggettiCollegati';
import { CatalogoOggetti } from '../components/catalogo/CatalogoOggetti';
import type { GruppoOggetto } from '../../shared/catalogo';
import { ModificaGuida } from '../components/guida/ModificaGuida';

/** Un catalogo per le identità; le sezioni della guida sulle attività restano accessibili. */
const SCHEDE = [
  ['catalogo', 'Catalogo', 'categoria', 'oggetti'],
  ['fabbricazione', 'Fabbricazione', 'categoria', 'materiali'],
  ['armi', 'Personalizzazione armi', 'scheda', 'personalizzazione'],
  ['abiti', 'Abiti e lavanderia', 'categoria', 'abiti'],
  ['scambi', 'Scambi', 'scheda', 'scambi'],
] as const;
type Scheda = (typeof SCHEDE)[number][0];
const GRUPPO_STORICO: Readonly<Record<string, GruppoOggetto>> = { consumabili: 'consumabili', equipaggiamento: 'equipaggiamento', chiave: 'materiali' };

/** Il segno «da fonte secondaria» accanto a una voce non verificata sulla guida italiana; niente se la voce è verificata. */
function Secondaria({ v }: { v: boolean }) {
  return v ? null : <span className="chip text-[11px]" title="Dato da fonte secondaria, non dalla guida italiana">da fonte secondaria</span>;
}

/** La fabbricazione degli attrezzi: introduzione, sblocco, regole e fonte, poi la tabella delle ricette con i materiali e le loro quantità. */
function SchedaFabbricazione({ d, onModificato }: { d: OggettiGuidaDto; onModificato: () => void }) {
  const f = d.fabbricazione;
  return (
    <div className="flex flex-col gap-2 text-[13px]">
      <section className="card flex flex-col gap-1">
        <div className="flex items-start gap-2">
          <p className="m-0 min-w-0 flex-1">{f.introduzione}</p>
          <ModificaGuida tipo="fabbricazione" chiave="fabbricazione" cosa="l’introduzione e le regole della fabbricazione" soloIcona onSalvato={onModificato} />
        </div>
        {f.sblocco && <VoceTesto titolo="Sblocco">{f.sblocco}</VoceTesto>}
        {f.regole.length > 0 && <ul className="m-0 pl-4">{f.regole.map((r) => <li key={r}>{r}</li>)}</ul>}
        <Fonte url={f.fonte} />
      </section>
      <div className="area-scorrevole-x">
        <table className="tabella tabella--adattiva text-[12px]">
          {/* Niente colonna «Prodotti»: la guida non la compila per **nessuna** ricetta, quindi
              era una colonna di trattini — larghezza tolta a «Materiali», che invece serve. */}
          <thead><tr><th>Attrezzo</th><th>Effetto</th><th>Materiali</th><th>Sblocco</th></tr></thead>
          <tbody>{f.ricette.map((r) => <tr key={r.attrezzo}>
            <td data-etichetta="Attrezzo">{r.prodottiCatalogo?.length ? <OggettiCollegati oggetti={r.prodottiCatalogo} /> : <><strong>Prodotto non collegato</strong><span className="block text-text-muted">Nome nella fonte: {r.attrezzo}</span></>} <Secondaria v={r.verificato} /><ModificaGuida tipo="ricetta" chiave={r.attrezzo} cosa={`la ricetta «${r.attrezzo}»`} soloIcona onSalvato={onModificato} /></td>
            <td data-etichetta="Effetto">{r.effetto}</td>
            <td data-etichetta="Materiali">{!!r.materialiCatalogo?.length && <OggettiCollegati oggetti={r.materialiCatalogo} />}
              {r.materialiCatalogo?.length ? <details><summary className="touch">Materiali indicati dalla guida</summary><span>{r.materiali.map((m) => `${m.nome}${m.quantita !== null ? ` ×${m.quantita}` : ''}`).join(', ') || '—'}</span></details>
                : r.materiali.map((m) => `${m.nome}${m.quantita !== null ? ` ×${m.quantita}` : ''}`).join(', ') || '—'}
            </td><td data-etichetta="Sblocco">{r.sblocco ?? '—'}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

/** La personalizzazione delle armi da Iwai: introduzione, requisiti, costi e note, la tabella delle modifiche e la progressione col Confidente, le cui voci possono essere testi o oggetti resi come «chiave: valore». */
function SchedaArmi({ d, onModificato }: { d: OggettiGuidaDto; onModificato: () => void }) {
  const p = d.personalizzazioneArmi;
  return (
    <div className="flex flex-col gap-2 text-[13px]">
      <section className="card flex flex-col gap-1">
        <div className="flex items-start gap-2">
          <p className="m-0 min-w-0 flex-1">{p.introduzione}</p>
          <ModificaGuida tipo="armi" chiave="armi" cosa="l’introduzione e i requisiti della personalizzazione delle armi" soloIcona onSalvato={onModificato} />
        </div>
        {p.requisiti && <VoceTesto titolo="Requisiti">{p.requisiti}</VoceTesto>}
        {p.costi && <VoceTesto titolo="Costi">{p.costi}</VoceTesto>}
        {p.note && <p className="m-0 text-text-muted">{p.note}</p>}
        <Fonte url={p.fonte} />
      </section>
      {p.effetti.length > 0 && (
        <div className="area-scorrevole-x">
          <table className="tabella tabella--adattiva text-[12px]">
            <thead><tr><th>Modifica</th><th>Effetto</th><th>Costo</th></tr></thead>
            <tbody>{p.effetti.map((e) => <tr key={e.nome}><td data-etichetta="Modifica"><div className="flex items-start gap-1"><strong className="min-w-0 flex-1">{e.nome}</strong><ModificaGuida tipo="arma-effetto" chiave={e.nome} cosa={`la modifica «${e.nome}»`} soloIcona onSalvato={onModificato} /></div></td><td data-etichetta="Effetto">{e.effetto}</td><td data-etichetta="Costo">{e.costo ?? '—'}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      {p.progressioneConfidente.length > 0 && (
        <section className="card flex flex-col gap-1">
          <h2 className="m-0 text-[15px] font-semibold">Progressione con il Confidente (Iwai)</h2>
          <ul className="m-0 pl-4">{p.progressioneConfidente.map((x) => <li key={typeof x === 'string' ? x : JSON.stringify(x)}>{typeof x === 'string' ? x : Object.entries(x as Record<string, unknown>).map(([k, v]) => `${k}: ${String(v)}`).join(' · ')}
            {typeof x === 'object' && x !== null && 'rango' in x && <ModificaGuida tipo="arma-progressione" chiave={String((x as { rango: unknown }).rango)} cosa={`il rango ${String((x as { rango: unknown }).rango)} della progressione`} soloIcona onSalvato={onModificato} />}</li>)}</ul>
        </section>
      )}
    </div>
  );
}

/** Gli abiti: introduzione, la carta della lavanderia e la tabella degli abiti con ricerca (nome, personaggio, dove) e il ritratto di chi li indossa. */
function SchedaAbiti({ d, onModificato }: { d: OggettiGuidaDto; onModificato: () => void }) {
  const [q, setQ] = useState('');
  const visibili = useMemo(() => { const n = normalizzaTesto(q); return d.abiti.elenco.filter((x) => !n || normalizzaTesto(`${x.nome} ${(x.nomiAltri ?? []).join(' ')} ${x.per} ${x.dove}`).includes(n)); }, [d, q]);
  return (
    <div className="flex flex-col gap-2 text-[13px]">
      <div className="flex items-start gap-2">
        <p className="m-0 min-w-0 flex-1 text-text-secondary">{d.abiti.introduzione}</p>
        <ModificaGuida tipo="abiti" chiave="abiti" cosa="l’introduzione e la lavanderia degli abiti" soloIcona onSalvato={onModificato} />
      </div>
      <section className="card flex flex-col gap-1">
        <h2 className="m-0 text-[15px] font-semibold">Lavanderia</h2>
        <VoceTesto titolo="Dove">{d.abiti.lavanderia.dove}</VoceTesto>
        <VoceTesto titolo="Costo">{d.abiti.lavanderia.costo}</VoceTesto>
        {d.abiti.lavanderia.regole.length > 0 && <ul className="m-0 pl-4">{d.abiti.lavanderia.regole.map((r) => <li key={r}>{r}</li>)}</ul>}
        <Fonte url={d.abiti.lavanderia.fonte} />
      </section>
      <CampoRicerca valore={q} onCambia={setQ} segnaposto="Cerca un abito o un personaggio…" />
      <p className="m-0 text-[12px] text-text-muted">{visibili.length} abiti su {d.abiti.elenco.length}.</p>
      <div className="area-scorrevole-x">
        <table className="tabella tabella--adattiva text-[12px]">
          <thead><tr><th>Abito</th><th>Per</th><th>Dove</th></tr></thead>
          <tbody>{visibili.map((x) => <tr key={x.catalogo?.chiave ?? `${x.nome}-${x.per}`}><td data-etichetta="Abito"><strong>{x.catalogo ? <Link to={x.catalogo.casa} className="touch inline-flex items-center">{x.nome}</Link> : x.nome}</strong></td><td data-etichetta="Per"><RitrattoPersonaggio chi={x.per} /></td><td data-etichetta="Dove"><div className="flex items-start gap-1"><span className="min-w-0 flex-1">{x.dove}</span>{x.catalogo && <ModificaGuida tipo="abito" chiave={x.catalogo.chiave} cosa={`dove si ottiene «${x.nome}»`} soloIcona onSalvato={onModificato} />}</div></td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

/** Gli scambi dei venditori speciali, una carta per venditore con la tabella di quel che si riceve e si dà; Jose è escluso e resta solo il rimando alle Richieste dei Mementos. */
function SchedaScambi({ d }: { d: OggettiGuidaDto }) {
  if (d.listiniScambi !== undefined) return <div className="flex min-w-0 flex-col gap-2 text-[13px]">
    <p className="m-0 text-text-secondary">Ogni venditore ha un solo listino: lì trovi oggetti, costi, requisiti e gestione. Le indicazioni della guida precedente sono conservate nelle note del negozio, non come offerte aggiuntive.</p>
    {d.listiniScambi.length ? <ul className="m-0 grid list-none gap-2 p-0 md:grid-cols-2">
      {d.listiniScambi.map((n) => <li key={n.chiave} className="card flex min-w-0 flex-col items-start gap-2">
        <h2 className="m-0 break-words text-[15px] font-semibold">{n.nome}</h2>
        {n.posto && <span className="text-text-secondary">{n.posto}</span>}
        <span className="text-[12px] text-text-muted">{n.offerte} {n.offerte === 1 ? 'offerta nel listino' : 'offerte nel listino'}</span>
        <Link to={n.casa} className="btn btn-secondary touch max-w-full whitespace-normal">Apri il listino di {n.nome}</Link>
      </li>)}
    </ul> : <p className="m-0 text-text-muted">Nessun listino visibile.</p>}
    {d.listiniScambi.some((n) => n.chiave === 'jose') && <p className="m-0 text-[12px] text-text-muted">Fiori e timbri di Jose restano consultabili nelle <Link to="/guida/richieste?foglio=jose" className="touch inline-flex items-center">Richieste dei Mementos</Link>.</p>}
  </div>;
  // **Jose sta nelle Richieste dei Mementos**, dove ha il suo foglio con i fiori, i timbri e la
  // tabella degli scambi. Ripeterlo qui era la stessa bottega scritta due volte in due pagine
  // diverse, e prima o poi due volte diverse: qui resta il rimando, che dice dov'è.
  const altrove = d.scambi.filter((s) => /jose/i.test(s.venditore));
  const venditori = d.scambi.filter((s) => !/jose/i.test(s.venditore));
  return (
    <div className="flex flex-col gap-2 text-[13px]">
      {altrove.length > 0 && (
        <p className="m-0 text-[12px] text-text-muted">
          Gli scambi di Jose stanno con le <Link to="/guida/richieste?foglio=jose" className="text-primary">Richieste dei Mementos</Link>, insieme ai fiori e ai timbri.
        </p>
      )}
      {venditori.map((s) => (
        <section key={s.venditore} className="card flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2"><h2 className="m-0 text-[15px] font-semibold">{s.venditore}</h2><span className="chip">{s.dove}</span><Secondaria v={s.verificato} /></div>
          {s.quando && <VoceTesto titolo="Quando">{s.quando}</VoceTesto>}
          <div className="area-scorrevole-x">
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

/**
 * Catalogo unico e sezioni della guida. I vecchi indirizzi delle tre liste aprono il gruppo
 * equivalente dello stesso catalogo; non si mantengono copie parallele delle identità.
 */
export function OggettiPage() {
  useDocumentTitle('Catalogo degli oggetti');
  const [params, setParams] = useSearchParams();
  const richiesta = params.get('scheda') ?? '';
  const scheda = (SCHEDE.some(([k]) => k === richiesta) ? richiesta : 'catalogo') as Scheda;
  return (
        <div className="flex min-w-0 flex-col gap-3">
          <IntestazionePagina compatta titolo="Oggetti" sottotitolo="Un solo catalogo con nomi, effetti, vendite e collegamenti. Fabbricazione, personalizzazione, lavanderia e scambi restano nelle loro sezioni." />
          <FilaScorrevole role="tablist" aria-label="Sezioni">
            {SCHEDE.map(([k, l, tipo, icona]) => (
              <button key={k} type="button" role="tab" aria-selected={scheda === k} title={l}
                className={`piastrella-scheda touch ${scheda === k ? 'piastrella-scheda--attiva' : ''}`}
                onClick={() => setParams((prima) => { const dopo = new URLSearchParams(prima); if (k === 'catalogo') dopo.delete('scheda'); else dopo.set('scheda', k); return dopo; }, { replace: true })}>
                {tipo === 'categoria' ? <IconaCategoria categoria={icona} dimensione={28} /> : <IconaScheda chiave={icona} dimensione={28} />}
                <span>{l}</span>
              </button>
            ))}
          </FilaScorrevole>
          {scheda === 'catalogo' ? <CatalogoOggetti gruppoIniziale={GRUPPO_STORICO[richiesta]} /> : <SezioniDellaGuida scheda={scheda} />}
        </div>
  );
}

/** Le sezioni conservate si caricano solo quando aperte, senza rallentare o bloccare il catalogo. */
function SezioniDellaGuida({ scheda }: { scheda: Exclude<Scheda, 'catalogo'> }) {
  const dati = useCarica(() => getOggettiGuida(), []);
  const d = dati.dati;
  /** Dopo una correzione o un ripristino dei testi della guida (L11 · B11): la sezione rilegge i suoi dati. */
  const ricarica = () => void dati.ricarica();
  return <PageState isLoading={dati.caricamento && !d} error={dati.errore} onRetry={() => void dati.ricarica()}>{d && <>
    {scheda === 'fabbricazione' && <SchedaFabbricazione d={d} onModificato={ricarica} />}
    {scheda === 'armi' && <SchedaArmi d={d} onModificato={ricarica} />}
    {scheda === 'abiti' && <SchedaAbiti d={d} onModificato={ricarica} />}
    {scheda === 'scambi' && <SchedaScambi d={d} />}
  </>}</PageState>;
}
