import { useSearchParams } from 'react-router-dom';
import manifest from '../../../shared/tanakaConfronto.json';
import { getConfrontoTanaka } from '../../services/api/catalogoOggetti';
import { useCarica } from '../../hooks/useCarica';
import { PageState } from '../shared/PageState';
import { descriviRequisitoSpillo } from '../../../shared/condizioniSpillo';

const yen = (n: unknown) => typeof n !== 'number' ? 'Prezzo non indicato' : `${n.toLocaleString('it-IT')} ¥`;
const gradi: Record<string, string> = { iniziale: 'Nessun grado', nero: 'Nero', oscuro: 'Oscurità', caos: 'Caos' };
const esiti = { coincidente: 'Fonte coincidente con la fotografia', 'rettifica-124-provata': 'Differenza attribuita alla bonifica 124',
  'creazione-da-riconciliare': 'Creazione: vecchie condizioni da riconciliare', conflitto: 'Differenza da risolvere' };
const testo = (v: unknown) => typeof v === 'string' ? v : JSON.stringify(v, null, 2) ?? 'Dato assente';
function Dettaglio({ titolo, valore }: { titolo: string; valore: unknown }) {
  return <details><summary className="touch">{titolo}</summary><pre className="m-0 whitespace-pre-wrap break-all text-[12px]">{testo(valore)}</pre></details>;
}

/** Unica fotografia coerente; nessun comando di applicazione commerciale. */
export function ConfrontoTanaka() {
  const [params, setParams] = useSearchParams();
  const aperto = params.get('tanaka') === '1';
  const cambiaApertura = () => setParams(prima => {
    const dopo = new URLSearchParams(prima);
    if (aperto) dopo.delete('tanaka'); else dopo.set('tanaka', '1');
    return dopo;
  }, { replace: true });
  return <section className="flex min-w-0 flex-col gap-2" aria-label="Confronto unitario Tanaka">
    <button type="button" className="chip touch self-start" aria-expanded={aperto} onClick={cambiaApertura}>Tanaka · confronto unitario 20 / 18</button>
    {aperto && <DatiConfronto />}
  </section>;
}

function DatiConfronto() {
  const dati = useCarica(getConfrontoTanaka, []);
  const c = dati.dati;
  return <PageState isLoading={dati.caricamento && !c} error={dati.errore} onRetry={() => void dati.ricarica()}>
    {c && <div className="card flex min-w-0 flex-col gap-3">
      <h2 className="m-0 text-[18px]">Tanaka · preparazione di una sola decisione</h2>
      <p className="m-0">Questo confronto non applica proposte. Le conferme individuali e la scelta alternativa sono bloccate. La spesa storica è protetta; prima del consenso unico restano nota Homunculus, transazione atomica, ricevuta, ripristino e importazione.</p>
      <p className="m-0 text-warning">Fonte: gradi oltre 10.000 / 50.000 / 100.000 ¥. L’app valuta attualmente anche la soglia esatta: questo confine resta da risolvere. Gemme elementali e sei Magatama non sono sei identità automaticamente equivalenti.</p>
      <p className="m-0">Proposta originale: conservare 10 chiavi, nascondere 10 offerte e aggiungerne 8, dopo il consenso. Stati già gestiti, personalizzazioni e collisioni richiedono una risoluzione esplicita. Nessuna fotografia o proposta originale viene aggiornata.</p>
      {!c.negozio && <p className="m-0 text-warning">Negozio assente: nessuna ricreazione automatica.</p>}
      <Dettaglio titolo="Sblocco corrente del negozio, separato dai gradi delle offerte" valore={c.negozio?.sblocco_json} />
      <Dettaglio titolo="Altre condizioni correnti del negozio" valore={c.negozio?.condizioni_json} />
      <Dettaglio titolo="Negozio corrente: provenienza, orari ed eccezioni" valore={c.negozio} />
      <button type="button" className="btn btn-ghost touch self-start" disabled={dati.caricamento} onClick={() => void dati.ricarica()}>Rileggi tutto il confronto</button>
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <section className="min-w-0"><h3>Offerte correnti · {c.offerte.filter(a => a.corrente?.negozio_chiave === manifest.negozio).length}</h3>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">{c.offerte.map(a => <li key={a.chiave} className="min-w-0 border-t border-border pt-2">
            <strong>{testo(a.corrente?.nome_it ?? a.corrente?.nome ?? 'Offerta assente')}</strong> · {yen(a.corrente?.prezzo)}
            <code className="block break-all text-[11px]">{a.chiave}</code>
            {a.rilievi.map(r => <p key={r} className="m-0 text-[12px] text-warning">{r}</p>)}
            <Dettaglio titolo="Condizioni correnti dell’offerta" valore={a.corrente?.condizioni_json} />
            <Dettaglio titolo="Fonte corrente e collegamenti" valore={{ fonte: a.corrente, collegamenti: a.collegamenti }} />
          </li>)}</ul>
        </section>
        <section className="min-w-0"><h3>Listino Royal proposto · {c.royal.length}</h3><ul className="m-0 flex list-none flex-col gap-2 p-0">{c.royal.map(r => <li key={r.chiave} className="min-w-0 border-t border-border pt-2">
          <strong>{r.nome}</strong> · {yen(r.prezzo)} · {gradi[r.grado]}<code className="block break-all text-[11px]">{r.chiave}</code>
          <p className="m-0 text-[12px]">{r.rapporto}</p><span className="break-all text-[11px]">Catalogo proposto: {r.catalogo}</span>
          <Dettaglio titolo="Identità corrente del catalogo proposta" valore={r.catalogoCorrente} />
          <p className="m-0 text-[12px]">Condizioni proprie aggiornate: {r.condizioni.length ? r.condizioni.map(v => descriviRequisitoSpillo(v)).join(' · ') : 'Nessun grado'}. Lo sblocco si legge dal negozio corrente.</p>
          {r.rilievi.map(v => <p key={v} className="m-0 text-[12px] text-warning">{v}</p>)}
        </li>)}</ul></section>
      </div>
      <details><summary className="touch">Proposte collegate in tutti gli stati · {c.proposte.length}</summary><ul className="m-0 flex list-none flex-col gap-2 p-0">{c.proposte.map(p => <li key={JSON.stringify(p.tuple)} className="min-w-0 border-t border-border pt-2">
        <strong>{p.stato} · {esiti[p.riconciliazione]}</strong><code className="block break-all text-[11px]">{JSON.stringify(p.tuple)}</code>
        {p.rilievi.map(r => <p key={r} className="m-0 text-[12px] text-warning">{r}</p>)}
        <Dettaglio titolo="Proposta originale 121, conservata" valore={p.modificaRaw} />
        <Dettaglio titolo="Fotografia originale 121, conservata" valore={p.fotografiaRaw} />
        <Dettaglio titolo="Fonte corrente confrontata nella stessa lettura" valore={p.fonteCorrente} />
      </li>)}</ul></details>
      <Dettaglio titolo="Rendiconto della bonifica 124" valore={c.rapporto124} />
      <p className="m-0 break-all text-[11px]">Revisione della lettura: {c.revisione}. Non è una ricevuta, un consenso o una conferma applicabile.</p>
      <p className="m-0 text-[12px]">Fonte documentale: {manifest.fonte}. Le candidate Royal sono proposte documentali separate dallo storico: nessuna formula personalizzata viene semplificata o sostituita.</p>
    </div>}
  </PageState>;
}
