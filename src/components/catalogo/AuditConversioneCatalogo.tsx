import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { FonteAuditCatalogo, RiferimentoAuditCatalogo } from '../../../shared/auditCatalogo';
import { useCarica } from '../../hooks/useCarica';
import { getAuditConversioneCatalogo } from '../../services/api/auditCatalogo';
import { PageState } from '../shared/PageState';
import { CampoRicerca } from '../shared/CampoRicerca';
import { normalizzaTesto } from '../../utils/testo';

const ETICHETTE: Record<string, string> = {
  articolo: 'Offerta', regalo: 'Regalo', voce: 'Voce della guida', richiesta: 'Richiesta',
  equipaggiamento: 'Equipaggiamento', libro: 'Libro', film: 'Film', videogioco: 'Videogioco',
  ricetta: 'Ricetta', 'guida-consumabile': 'Consumabile', 'guida-chiave': 'Oggetto chiave o materiale',
  'guida-abito': 'Abito', 'guida-scambio': 'Scambio', 'dono-guida': 'Dono del Confidente',
  'premio-sfida': 'Premi della sfida', 'premio-covo': 'Premio del Covo', jose: 'Scambio di Jose',
  domanda: 'Domanda', esame: 'Esame', 'esame-premi': 'Indicazioni sui premi degli esami',
};
const ESITO: Record<FonteAuditCatalogo['esito'], string> = {
  collegata: 'Collegata', proposta: 'Proposta da esaminare', 'da-verificare': 'Da verificare', esclusa: 'Esclusa con motivazione',
};
const OGGETTI_PER_PAGINA = 40;
const record = (x: unknown): Record<string, unknown> => x && typeof x === 'object' && !Array.isArray(x) ? x as Record<string, unknown> : {};
const nomeFonte = (f: FonteAuditCatalogo): string => {
  const r = record(f.input);
  return (typeof r.nome === 'string' ? r.nome : typeof r.attrezzo === 'string' ? r.attrezzo : typeof r.domanda === 'string' ? r.domanda : '')
    || `${ETICHETTE[f.tipo] ?? f.tipo} · ${f.chiave}`;
};

function Riferimenti({ righe, suRisultato }: { righe: RiferimentoAuditCatalogo[]; suRisultato: (id: string) => void }) {
  return <ul className="m-0 pl-4 text-xs break-words">{righe.map((r) => <li key={r.id}>
    {r.catalogo ? <Link className="touch inline-flex items-center text-primary" to={`/guida/oggetto/${r.catalogo.split('/').map(encodeURIComponent).join('/')}`}>{r.catalogo}</Link> : <span>{r.tipo} · {r.chiave}</span>}
    {' '}<button className="btn btn-secondary btn-sm touch" type="button" onClick={() => suRisultato(r.id)}>Vedi provenienza</button>
  </li>)}</ul>;
}

function RiepilogoAudit() {
  const dati = useCarica(getAuditConversioneCatalogo, []);
  const [q, setQ] = useState('');
  const [soloDecisioni, setSoloDecisioni] = useState(true);
  const [pagina, setPagina] = useState(0);
  const [risultato, setRisultato] = useState<string | null>(null);
  const audit = dati.dati;
  const fontiConResidui = useMemo(() => new Set(audit?.residuiVoci?.map((r) => r.voce) ?? []), [audit]);
  const output = useMemo(() => risultato ? audit?.risultatiConFonti.find((r) => r.id === risultato) : undefined, [audit, risultato]);
  const fonti = useMemo(() => {
    const testo = normalizzaTesto(q);
    const ids = output ? new Set([...output.fonti, ...output.fontiContesto]) : null;
    return (audit?.fonti ?? []).filter((f) => (!ids || ids.has(f.id)) && (ids || !soloDecisioni || f.decisione || (f.tipo === 'voce' && fontiConResidui.has(f.chiave)))
      && (!testo || normalizzaTesto(`${nomeFonte(f)} ${f.tipo} ${f.chiave} ${f.motivo}`).includes(testo)));
  }, [audit, q, soloDecisioni, output, fontiConResidui]);
  const ultima = Math.max(0, Math.ceil(fonti.length / OGGETTI_PER_PAGINA) - 1);
  const corrente = Math.min(pagina, ultima);
  const scegliRisultato = (id: string) => { setRisultato(id); setQ(''); setPagina(0); };
  return <PageState isLoading={dati.caricamento && !audit} error={dati.errore} onRetry={() => void dati.ricarica()}>
    {!audit && !dati.caricamento && <p className="m-0 text-sm">La conversione del catalogo non ha ancora registrato un riepilogo.</p>}
    {audit && <div className="flex min-w-0 flex-col gap-2">
      <p className="m-0 text-sm">Fotografia della conversione iniziale: {audit.fonti.length} fonti, {audit.fonti.filter((f) => f.decisione).length} da esaminare. Le decisioni successive non riscrivono questa fotografia.</p>
      <p className="m-0 text-xs text-text-muted">Il censimento è stato ricostruito. Una fonte con più contenuti può avere risultati ancora da riconciliare singolarmente.</p>
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1 basis-48"><CampoRicerca valore={q} onCambia={(v) => { setQ(v); setPagina(0); }} segnaposto="Cerca una fonte o una motivazione…" /></div>
        <label className="touch flex items-center gap-2 text-sm"><input type="checkbox" checked={soloDecisioni} onChange={(e) => { setSoloDecisioni(e.target.checked); setPagina(0); }} />Solo da esaminare</label>
      </div>
      {risultato && <div className="flex flex-wrap items-center gap-2 text-sm">
        <span>Provenienza di {output?.catalogo ?? output?.chiave ?? risultato}</span>
        {output && !output.fonti.length && <span>Attribuzione puntuale ancora da verificare.</span>}
        <button type="button" className="btn btn-secondary btn-sm touch" onClick={() => { setRisultato(null); setPagina(0); }}>Tutte le fonti</button>
      </div>}
      <p className="m-0 text-xs" role="status">{fonti.length} fonti corrispondenti · pagina {corrente + 1} di {ultima + 1}</p>
      <ul className="m-0 p-0 list-none flex min-w-0 flex-col gap-2">{fonti.slice(corrente * OGGETTI_PER_PAGINA, (corrente + 1) * OGGETTI_PER_PAGINA).map((f) => <li key={f.id} className="min-w-0 border border-border-light rounded-lg p-2 text-sm break-words">
        <strong>{nomeFonte(f)}</strong><span className="block text-xs">{ETICHETTE[f.tipo] ?? f.tipo} · {ESITO[f.esito]}</span>
        <p className="m-0 mt-1 text-xs">{f.motivo}</p>
        {audit.residuiVoci?.filter((r) => f.tipo === 'voce' && r.voce === f.chiave).map((r) => <details key={r.voce}>
          <summary className="touch">Contenuti da verificare ({r.lacune.length})</summary>
          <p className="m-0 text-xs">La conversione ha conservato queste parti senza attribuire oggetti o quantità. Apri la voce per un collegamento esplicito.</p>
          <ul className="pl-4 text-xs">{r.lacune.map((l, i) => <li key={`${l.campo}/${i}`}><strong>{l.campo}</strong>: {l.motivo}
            {l.locatori?.map((p, j) => <span key={j} className="block break-words">{p.testo} <span className="text-text-muted">({p.inizio}–{p.fine})</span></span>)}</li>)}</ul>
        </details>)}
        {(f.nuova || f.mutata) && <p className="m-0 text-xs text-text-muted">{f.nuova ? 'Fonte aggiunta rispetto al pacchetto pubblico di riferimento.' : 'Fonte modificata rispetto al pacchetto pubblico di riferimento.'}</p>}
        {!!f.risultati.length && <details><summary className="touch">Risultati attribuiti ({f.risultati.length})</summary><Riferimenti righe={f.risultati} suRisultato={scegliRisultato} /></details>}
        {!!f.proposte.length && <details><summary className="touch">Proposte ({f.proposte.length})</summary><Riferimenti righe={f.proposte} suRisultato={scegliRisultato} /><Link className="touch inline-flex items-center text-primary" to="/guida/oggetti?scheda=catalogo">Apri gli abbinamenti da approvare</Link></details>}
        {!!f.contestoRisultati.length && <details><summary className="touch">Risultati del contesto, da attribuire ({f.contestoRisultati.length})</summary><Riferimenti righe={f.contestoRisultati} suRisultato={scegliRisultato} /></details>}
        <details><summary className="touch">Fonte della conversione</summary><code className="text-xs break-all">{f.tipo} · {f.chiave}</code><pre className="whitespace-pre-wrap break-words text-xs">{JSON.stringify(f.input, null, 2)}</pre></details>
      </li>)}</ul>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-secondary touch" disabled={corrente === 0} onClick={() => setPagina(corrente - 1)}>Precedente</button>
        <button type="button" className="btn btn-secondary touch" disabled={corrente === ultima} onClick={() => setPagina(corrente + 1)}>Successiva</button>
      </div>
      <details><summary className="touch">Risultati senza attribuzione puntuale</summary><Riferimenti righe={audit.risultatiConFonti.filter((r) => !r.fonti.length)} suRisultato={scegliRisultato} /></details>
      <details><summary className="touch">Limiti e fonti pubbliche non presenti ({audit.manifestAssenti.length})</summary><ul className="pl-4 text-xs">{audit.limiti.map((l) => <li key={l}>{l}</li>)}</ul><ul className="pl-4 text-xs break-words">{audit.manifestAssenti.map((f) => <li key={`${f.tipo}/${f.chiave}`}>{ETICHETTE[f.tipo] ?? f.tipo} · {f.chiave}</li>)}</ul></details>
    </div>}
  </PageState>;
}

/** Il report si carica soltanto all'apertura e usa lo scorrimento normale della pagina. */
export function AuditConversioneCatalogo() {
  const [aperto, setAperto] = useState(false);
  return <section className="card flex min-w-0 flex-col gap-2" aria-label="Riconciliazione iniziale del catalogo">
    <button type="button" className="btn btn-secondary touch self-start" aria-expanded={aperto} onClick={() => setAperto((v) => !v)}>{aperto ? 'Chiudi riconciliazione iniziale' : 'Riconciliazione iniziale del catalogo'}</button>
    {aperto && <RiepilogoAudit />}
  </section>;
}
