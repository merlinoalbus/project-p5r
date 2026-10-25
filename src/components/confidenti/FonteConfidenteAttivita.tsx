import { Link } from 'react-router-dom';
import type { FonteConfidenteAttivitaDto } from '../../../shared/types';
import { ChipDisponibilita } from '../guida/ChipDisponibilita';

function Requisito({ testo, descrizione }: { testo: string; descrizione: string }) {
  return <li>
    <span>{descrizione || 'Descrizione del requisito strutturato non disponibile.'}</span>
    {testo && testo !== descrizione && <p className="m-0 whitespace-pre-line text-xs text-text-secondary"><strong>Testo salvato nella fonte (informativo; non modifica il requisito strutturato):</strong> {testo}</p>}
  </li>;
}

/** La scheda legge la stessa progressione del Confidente; non offre un secondo conteggio. */
export function FonteConfidenteAttivita({ fonte }: { fonte: FonteConfidenteAttivitaDto }) {
  const d = fonte.disponibilitaFonte;
  return <section className="flex min-w-0 flex-col gap-2 rounded-md border border-border p-3" aria-label="Progressione del Confidente">
    <Link to={fonte.casa} className="touch inline-flex items-center self-start text-primary-testo">
      Apri {fonte.nome ?? fonte.chiave}{fonte.arcanaNome ? ` · ${fonte.arcanaNome}` : ''}
    </Link>
    <p className="m-0 text-text-secondary">Incontri, ranghi e Doti si registrano nella progressione del Confidente.</p>
    {d && <>
      {(d.giorni.length > 0 || d.fasce.length > 0) && <p className="m-0"><strong>Disponibilità della guida:</strong> {[d.giorni.join(', '), d.fasce.join(', ')].filter(Boolean).join(' · ')}</p>}
      {d.luogo && <p className="m-0"><strong>Luogo:</strong> {d.luogo}</p>}
      {d.note && <p className="m-0 whitespace-pre-line">{d.note}</p>}
    </>}
    {fonte.avvio && <div>
      <strong>Avvio del Confidente</strong>
      {fonte.avvio.requisiti.length > 0
        ? <ul className="m-0 pl-5">{fonte.avvio.requisiti.map((r) => <Requisito key={r.indice} testo={r.testo} descrizione={r.descrizione} />)}</ul>
        : <p className="m-0 text-text-secondary">Nessun requisito strutturato aggiuntivo.</p>}
    </div>}
    {fonte.rangoAttuale !== null && <p className="m-0"><strong>Rango registrato:</strong> {fonte.rangoAttuale}</p>}
    {fonte.prossimoPasso && <div className="flex flex-col gap-1">
      <strong>Requisiti per il rango {fonte.prossimoPasso.rango}</strong>
      {fonte.prossimoPasso.requisiti.length > 0
        ? <ul className="m-0 pl-5">{fonte.prossimoPasso.requisiti.map((r) => <Requisito key={r.indice} testo={r.testo} descrizione={r.descrizione} />)}</ul>
        : <p className="m-0 text-text-secondary">Nessun requisito strutturato aggiuntivo.</p>}
      <ChipDisponibilita disponibilita={fonte.prossimoPasso.disponibilitaRequisiti ?? undefined} />
    </div>}
    {fonte.dotiPerPassaggio.length > 0 && <div>
      <strong>Doti degli incontri</strong>
      <ul className="m-0 pl-5">{fonte.dotiPerPassaggio.map((r) => <li key={r.rango}>Verso il rango {r.rango}: {r.testo || 'Nessuna Dote dichiarata per questo passaggio.'}</li>)}</ul>
    </div>}
    {fonte.avvisi.map((a, i) => <p key={i} className="m-0 whitespace-pre-line text-warning">{a}</p>)}
    {fonte.stato !== 'collegato' && <p role="alert" className="m-0 text-warning">{fonte.stato === 'non-risolto' ? 'Il Confidente collegato non è disponibile.' : 'La fonte presenta un conflitto: consulta gli avvisi e correggi i dati indicati.'}</p>}
  </section>;
}
