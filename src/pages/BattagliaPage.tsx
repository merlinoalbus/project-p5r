// ============================================================
// BattagliaPage — Aiuto in battaglia: Ombre per area con ricerca rapida, negoziazione, danno tecnico, Staffetta e Speciali, Ombre sciagura, Mietitore e Demoni del Tesoro (Fase 7.3)
// ============================================================

import { useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getBattaglia } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { PageState } from '../components/shared/PageState';
import { CampoRicerca } from '../components/shared/CampoRicerca';
import { normalizzaTesto } from '../utils/testo';
import type { BattagliaDto, OmbraDto } from '../types';

const SCHEDE = [
  ['ombre', 'Ombre per area'],
  ['negoziazione', 'Negoziazione'],
  ['tecnico', 'Danno tecnico'],
  ['staffetta', 'Staffetta e Speciali'],
  ['nemici', 'Nemici speciali'],
] as const;
type Scheda = (typeof SCHEDE)[number][0];

function Fonte({ url }: { url: string | null | undefined }) {
  return url ? <a href={url} target="_blank" rel="noreferrer" className="text-[12px] text-primary">fonte: allgamestaff</a> : null;
}

function Voce({ titolo, children }: { titolo: string; children: ReactNode }) {
  return <p className="m-0"><strong>{titolo}:</strong> {children}</p>;
}

/** Elemento base di una debolezza/resistenza («Tuono (dimezza)» → «Tuono»). */
function elementoBase(v: string): string {
  return v.replace(/\s*\(.*\)\s*$/, '').trim();
}

function SchedaOmbre({ ombre }: { ombre: OmbraDto[] }) {
  const [q, setQ] = useState('');
  const [dungeon, setDungeon] = useState('');
  const [elemento, setElemento] = useState('');
  const [personalita, setPersonalita] = useState('');
  const dungeons = useMemo(() => [...new Map(ombre.map((o) => [o.dungeonChiave, o.dungeon])).entries()], [ombre]);
  const elementi = useMemo(() => [...new Set(ombre.flatMap((o) => o.debolezze.map(elementoBase)))].sort((a, b) => a.localeCompare(b, 'it')), [ombre]);
  const personalitaTutte = useMemo(() => [...new Set(ombre.map((o) => o.personalita).filter((p): p is string => !!p))].sort(), [ombre]);
  const visibili = useMemo(() => {
    const t = normalizzaTesto(q);
    return ombre.filter((o) => (!dungeon || o.dungeonChiave === dungeon) && (!elemento || o.debolezze.some((d) => elementoBase(d) === elemento)) && (!personalita || o.personalita === personalita)
      && (!t || normalizzaTesto(`${o.ombra ?? ''} ${o.persona ?? ''} ${o.personaCollegata?.nome ?? ''} ${o.personaCollegata?.nomeIt ?? ''} ${o.area ?? ''}`).includes(t)));
  }, [ombre, q, dungeon, elemento, personalita]);
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 text-[13px] text-text-secondary">Ricerca rapida delle Ombre di Palazzi e Dedali: scrivi il nome dell'Ombra o della Persona, oppure filtra per dungeon, debolezza e personalità (per la negoziazione).</p>
      <CampoRicerca valore={q} onCambia={setQ} segnaposto="Ombra, Persona o area…" />
      <div className="flex flex-wrap gap-1.5">
        <select className="form-input w-auto" value={dungeon} onChange={(e) => setDungeon(e.target.value)} aria-label="Dungeon">
          <option value="">Tutti i dungeon</option>
          {dungeons.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
        </select>
        <select className="form-input w-auto" value={elemento} onChange={(e) => setElemento(e.target.value)} aria-label="Debole a">
          <option value="">Qualsiasi debolezza</option>
          {elementi.map((e) => <option key={e} value={e}>Debole a {e}</option>)}
        </select>
        <select className="form-input w-auto" value={personalita} onChange={(e) => setPersonalita(e.target.value)} aria-label="Personalità">
          <option value="">Qualsiasi personalità</option>
          {personalitaTutte.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <p className="m-0 text-[12px] text-text-muted">{visibili.length} Ombre su {ombre.length}.</p>
      <ul className="m-0 p-0 list-none flex flex-col gap-1.5" aria-label="Ombre">
        {visibili.length === 0 && <li className="text-[13px] text-text-muted">Nessuna Ombra con questi filtri.</li>}
        {visibili.map((o) => (
          <li key={`${o.dungeonChiave}/${o.persona ?? o.ombra}`} className="card p-2 flex flex-col gap-0.5 text-[13px]">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <strong>{o.ombra ?? o.persona}</strong>
              {o.persona && o.ombra && <span className="text-text-secondary">maschera {o.personaCollegata ? <Link to={`/compendio/persona/${o.personaCollegata.id}`}>{o.personaCollegata.nomeIt}</Link> : o.persona}</span>}
              {o.persona && !o.ombra && o.personaCollegata && <Link to={`/compendio/persona/${o.personaCollegata.id}`} className="text-[12px]">scheda Persona</Link>}
              {o.livello !== null && <span className="chip text-[11px]">livello {o.livello}</span>}
              {o.personalita && <span className="chip text-[11px]">{o.personalita}</span>}
              <Link to={o.areaChiave ? `/guida/dungeon/${o.dungeonChiave}?area=${o.areaChiave}` : `/guida/dungeon/${o.dungeonChiave}`} className="text-[12px] text-text-muted ml-auto">{o.area ?? o.dungeon}</Link>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
              <span><strong className="text-text">Debole a:</strong> {o.debolezze.length > 0 ? o.debolezze.join(', ') : 'nessuna nota'}</span>
              {o.resistenze.length > 0 && <span className="text-text-secondary"><strong className="text-text">Resiste:</strong> {o.resistenze.join(', ')}</span>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SchedaNegoziazione({ d }: { d: BattagliaDto }) {
  const n = d.negoziazione;
  return (
    <div className="flex flex-col gap-3 text-[13px]">
      <section className="card flex flex-col gap-1">
        <h2 className="m-0 text-[15px] font-semibold">Quando e come</h2>
        <p className="m-0">{n.quandoSiPuoNegoziare}</p>
        <Voce titolo="Personalità dell'Ombra">{n.comeVerificarePersonalita}</Voce>
        <ul className="m-0 pl-4">{n.opzioniHoldUp.map((o) => <li key={o.opzione}><strong>{o.opzione}</strong>: {o.effetto}</li>)}</ul>
      </section>
      <div className="grid gap-2 sm:grid-cols-2">
        {n.personalita.map((p) => (
          <section key={p.nome} className="card flex flex-col gap-1">
            <h3 className="m-0 text-[14px] font-semibold">{p.nome}</h3>
            <p className="m-0 text-text-secondary">{p.descrizione}</p>
            <Voce titolo="Risposte efficaci">{p.risposteEfficaci.join(' · ')}</Voce>
            <Voce titolo="Da evitare">{p.risposteDaEvitare.join(' · ')}</Voce>
          </section>
        ))}
      </div>
      <section className="card flex flex-col gap-1">
        <h2 className="m-0 text-[15px] font-semibold">Regole</h2>
        <ul className="m-0 pl-4">{n.regole.map((r) => <li key={r}>{r}</li>)}</ul>
        {n.incertezze && <p className="m-0 text-text-muted text-[12px]">{n.incertezze}</p>}
        <span>{n.urlFonti.map((u) => <Fonte key={u} url={u} />).reduce<ReactNode[]>((acc, x, i) => (i ? [...acc, ' · ', x] : [x]), [])}</span>
      </section>
    </div>
  );
}

function SchedaTecnico({ d }: { d: BattagliaDto }) {
  const effetti = new Map(d.sistema.statiAlterati.map((s) => [s.stato, s.effetto]));
  return (
    <div className="flex flex-col gap-3 text-[13px]">
      <p className="m-0 text-text-secondary">{d.sistema.esitiColpo.tecnico}. Colpisci un nemico già colpito da uno stato alterato con l'elemento indicato per ottenere un colpo Tecnico (danno bonus e possibile «1 More»).</p>
      <div className="overflow-x-auto">
        <table className="tabella tabella--adattiva">
          <thead><tr><th>Stato alterato</th><th>Colpo tecnico con</th><th>Effetto dello stato</th></tr></thead>
          <tbody>{d.tecnico.stati.map((s) => <tr key={s.stato}><td data-etichetta="Stato"><strong>{s.stato}</strong></td><td data-etichetta="Tecnico con">{s.elementi.join(', ')}</td><td data-etichetta="Effetto" className="text-text-secondary">{effetti.get(s.stato) ?? '—'}</td></tr>)}</tbody>
        </table>
      </div>
      <section className="card flex flex-col gap-1">
        <h2 className="m-0 text-[15px] font-semibold">Esiti del colpo</h2>
        {Object.entries(d.sistema.esitiColpo).map(([k, v]) => <Voce key={k} titolo={k === 'block' ? 'Block' : k.charAt(0).toUpperCase() + k.slice(1)}>{v}</Voce>)}
        <Voce titolo="1 More">{d.sistema.unoMore}</Voce>
        <p className="m-0 text-text-muted text-[12px]">{d.sistema.notaFineBattaglia}</p>
        <Fonte url={d.tecnico.urlFonte} />
      </section>
    </div>
  );
}

function SchedaStaffetta({ d }: { d: BattagliaDto }) {
  const s = d.staffetta; const sp = d.speciali; const a = d.assaltoEHoldUp;
  return (
    <div className="flex flex-col gap-3 text-[13px]">
      <section className="card flex flex-col gap-1">
        <h2 className="m-0 text-[15px] font-semibold">Staffetta</h2>
        <p className="m-0">{s.cosaE}</p>
        <Voce titolo="Disponibilità">{s.disponibilita}</Voce>
        <Voce titolo="Effetto">{s.effetto}</Voce>
        <Voce titolo="Livelli">{s.livelli}</Voce>
        <ul className="m-0 pl-4">{s.ranghi.map((r) => <li key={r.rango}><strong>Rango {r.rango}</strong>: {r.bonus}</li>)}</ul>
        <Voce titolo="Moltiplicatori">{s.moltiplicatori}</Voce>
        <Voce titolo="Indicatori">{s.indicatoriVisivi}</Voce>
        <Voce titolo="Catena completa">{s.effettoSpeciale}</Voce>
        <Fonte url={s.urlFonte} />
      </section>
      <section className="card flex flex-col gap-1">
        <h2 className="m-0 text-[15px] font-semibold">Speciali</h2>
        <p className="m-0">{sp.meccanica}</p>
        <Voce titolo="Attivazione">{sp.attivazione}</Voce>
        <Voce titolo="Danno">{sp.proprietaDanno}</Voce>
        <div className="overflow-x-auto">
          <table className="tabella tabella--adattiva text-[12px]">
            <thead><tr><th>Speciale</th><th>Coppia</th><th>Sblocco</th></tr></thead>
            <tbody>{sp.elenco.map((e) => <tr key={e.nome}><td data-etichetta="Speciale"><strong>{e.nome}</strong></td><td data-etichetta="Coppia">{e.personaggi.join(' e ')}</td><td data-etichetta="Sblocco">{e.sblocco}</td></tr>)}</tbody>
          </table>
        </div>
        <Fonte url={sp.urlFonte} />
      </section>
      <section className="card flex flex-col gap-1">
        <h2 className="m-0 text-[15px] font-semibold">Rapina, Assalto e Parla</h2>
        <Voce titolo="Rapina">{a.rapina}</Voce>
        <Voce titolo="Assalto">{a.assalto}</Voce>
        <Voce titolo="Parla">{a.holdUp}</Voce>
        <Voce titolo="Avvio dello scontro">{d.sistema.avvioScontro}</Voce>
        <ul className="m-0 pl-4">{d.sistema.comandi.map((c) => <li key={c}>{c}</li>)}</ul>
        <Fonte url={a.urlFonte} />
      </section>
    </div>
  );
}

function SchedaNemici({ d }: { d: BattagliaDto }) {
  const o = d.ombreSciagura; const m = d.mietitore; const t = d.demoniTesoro;
  return (
    <div className="flex flex-col gap-3 text-[13px]">
      <section className="card flex flex-col gap-1">
        <h2 className="m-0 text-[15px] font-semibold">Ombre sciagura <span className="text-text-muted font-normal text-[12px]">({o.nomeOriginale})</span></h2>
        <p className="m-0">{o.cosaSono}</p>
        <Voce titolo="Come riconoscerle">{o.comeRiconoscerle}</Voce>
        <ul className="m-0 pl-4">{o.caratteristiche.map((c) => <li key={c}>{c}</li>)}</ul>
        <Voce titolo="Nel loro turno">{o.comportamentoInBattaglia.turnoProprio}</Voce>
        <Voce titolo="Quando attaccate">{o.comportamentoInBattaglia.quandoAttaccate}</Voce>
        <Voce titolo="Come neutralizzarle">{o.comportamentoInBattaglia.comeNeutralizzarle}</Voce>
        <Voce titolo="Stati che le immobilizzano">{o.effettiStati.immobilizzanti.join(', ')}</Voce>
        <Voce titolo="Soggiogamento">{o.effettiStati.soggiogamento}</Voce>
        <Voce titolo="Furia">{o.effettiStati.furia}</Voce>
        <Voce titolo="Esplosione alla sconfitta">{o.esplosioneAllaSconfitta.descrizione} {o.esplosioneAllaSconfitta.potenza} {o.esplosioneAllaSconfitta.eccezioni}</Voce>
        <Voce titolo="Ricompense">{o.ricompense}</Voce>
        <Voce titolo="Dove">{o.doveCompaiono}</Voce>
        <p className="m-0 text-text-muted text-[12px]">{o.incertezze}</p>
        <Fonte url={o.urlFonte} />
      </section>
      <section className="card flex flex-col gap-1">
        <h2 className="m-0 text-[15px] font-semibold">{m.categoria}</h2>
        <Voce titolo="Dove e quando">{m.dove}</Voce>
        <Voce titolo="Segnali">{m.comeSiManifesta}</Voce>
        <Voce titolo="Livello consigliato">{m.livelloConsigliato}</Voce>
        <Voce titolo="Abilità">{m.abilita.join('; ')}</Voce>
        <Voce titolo="Immunità">{m.immunita.join(', ')}</Voce>
        <Voce titolo="Debolezze">{m.debolezze && m.debolezze.length > 0 ? m.debolezze.join(', ') : 'nessuna'}</Voce>
        <ol className="m-0 pl-4">{m.strategia.map((s) => <li key={s}>{s}</li>)}</ol>
        <Voce titolo="Ricompense">{m.ricompense}</Voce>
        <Fonte url={m.urlFonte} />
      </section>
      <section className="card flex flex-col gap-1">
        <h2 className="m-0 text-[15px] font-semibold">{t.categoria}</h2>
        <p className="m-0">{t.cosaSono}</p>
        <Voce titolo="Come compaiono">{t.comeCompaiono}</Voce>
        <Voce titolo="Prima comparsa">{t.primaComparsa}</Voce>
        <Voce titolo="Comportamento">{t.comportamento}</Voce>
        <Voce titolo="Resistenze">{t.resistenzeGenerali}</Voce>
        {t.tecnicheConsigliate.length > 0 && <Voce titolo="Tecniche consigliate">{t.tecnicheConsigliate.join('; ')}</Voce>}
        <div className="overflow-x-auto">
          <table className="tabella tabella--adattiva text-[12px]">
            <thead><tr><th>Demone del Tesoro</th><th>Livello</th><th>Arcano</th><th>Dove</th></tr></thead>
            <tbody>{t.elenco.map((e) => <tr key={e.nome}><td data-etichetta="Demone"><strong>{e.nome}</strong></td><td data-etichetta="Livello" className="tabular-nums">{e.livello}</td><td data-etichetta="Arcano">{e.arcano}</td><td data-etichetta="Dove">{e.dove}</td></tr>)}</tbody>
          </table>
        </div>
        <Fonte url={t.urlFonte} />
      </section>
    </div>
  );
}

export function BattagliaPage() {
  useDocumentTitle('Aiuto in battaglia');
  const dati = useCarica(() => getBattaglia(), []);
  const [params, setParams] = useSearchParams();
  const scheda = (SCHEDE.some(([k]) => k === params.get('scheda')) ? params.get('scheda') : 'ombre') as Scheda;
  const d = dati.dati;
  return (
    <PageState isLoading={dati.caricamento && !d} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {d && (
        <div className="flex flex-col gap-3">
          <div>
            <h1 className="m-0 text-2xl font-bold">Aiuto in battaglia</h1>
            <p className="m-0 mt-1 text-[13px] text-text-secondary">Debolezze delle Ombre per area, risposte in negoziazione, danno tecnico, Staffetta, Speciali e nemici speciali dalla guida allgamestaff.</p>
          </div>
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Sezioni">
            {SCHEDE.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={scheda === k} className={`chip touch ${scheda === k ? 'chip--attivo' : ''}`} onClick={() => setParams(k === 'ombre' ? {} : { scheda: k }, { replace: true })}>{l}</button>)}
          </div>
          {scheda === 'ombre' && <SchedaOmbre ombre={d.ombre} />}
          {scheda === 'negoziazione' && <SchedaNegoziazione d={d} />}
          {scheda === 'tecnico' && <SchedaTecnico d={d} />}
          {scheda === 'staffetta' && <SchedaStaffetta d={d} />}
          {scheda === 'nemici' && <SchedaNemici d={d} />}
        </div>
      )}
    </PageState>
  );
}
