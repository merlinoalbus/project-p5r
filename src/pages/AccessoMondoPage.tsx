import { Link, Navigate, useParams } from 'react-router-dom';
import { TIPI_ACCESSO_MONDO, urlDestinazioneMondo, type TipoAccessoMondo } from '../../shared/accessoMondo';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getAccessoMondo } from '../services/api/accessoMondo';
import { PageState } from '../components/shared/PageState';
import { schedaAccessoMondo } from '../utils/accessoMondo';

/** Accesso al luogo comune; conserva le alternative e le schede della guida. */
export function AccessoMondoPage() {
  const { tipo, chiave } = useParams();
  if (!chiave || !TIPI_ACCESSO_MONDO.includes(tipo as TipoAccessoMondo)) return <div role="alert">Luogo non valido. <Link to="/guida/mappe">Apri le mappe</Link></div>;
  return <Accesso tipo={tipo as TipoAccessoMondo} chiave={chiave} />;
}

function Accesso({ tipo, chiave }: { tipo: TipoAccessoMondo; chiave: string }) {
  useDocumentTitle('Apri luogo');
  const carica = useCarica(() => getAccessoMondo(tipo, chiave), [tipo, chiave]);
  const dati = carica.dati;
  const guide = dati?.guide ?? [];
  if (!carica.caricamento && !carica.errore && dati?.esito === 'unica' && dati.destinazioni.length === 1 && guide.length === 0) {
    return <Navigate to={urlDestinazioneMondo(dati.destinazioni[0])} replace />;
  }
  return <div className="flex flex-col gap-4">
    <h1 className="titolo-display m-0">Apri luogo</h1>
    <PageState isLoading={carica.caricamento} error={carica.errore} onRetry={carica.ricarica}>
      {/* Qualche voce non ha una posizione. Oggi sono quattro articoli: tre del negozio dentro il
          Palazzo di Niijima e uno del sito di Tanaka, che si apre dal laptop e non è un posto.
          Il comando «Sulla mappa» resta al suo posto — un comando che a volte sparisce è peggio —
          ma qui va detto chiaramente, invece di aprire una pagina che non mostra niente. */}
      {dati?.esito === 'assente' && guide.length === 0 && <div role="status" className="card flex flex-col gap-2">
        <p className="m-0">Questa voce non ha una posizione sulla mappa: nel catalogo c’è, ma non è collocata su nessuna planimetria.</p>
        <p className="m-0 text-text-secondary text-[13px]">Succede per la merce dei negozi che stanno dentro un Palazzo e per quella che si compra online, che nel mondo non hanno un punto.</p>
      </div>}
      {dati && dati.destinazioni.length > 0 && (dati.esito === 'multipla' || guide.length > 0) && <>
        <p>Il luogo è presente in più posizioni. Scegli quale aprire.</p>
        <ul className="m-0 p-0 list-none flex flex-col gap-2" aria-label="Posizioni del luogo">
          {dati.destinazioni.map(d => <li key={`${d.mappa}:${d.spillo ?? ''}`}>
            <Link className="card touch flex no-underline text-text" to={urlDestinazioneMondo(d)}>{d.nomeMappa}{d.nomeSpillo ? ` — ${d.nomeSpillo}` : ''}</Link>
          </li>)}
        </ul>
      </>}
      {guide.length > 0 && <section aria-label="Contenuti della guida"><h2 className="text-lg">Contenuti della guida</h2>
        <ul className="list-none p-0 flex flex-col gap-2">{guide.map(g => <li key={`${g.dungeon}:${g.area}`}><Link className="card touch flex no-underline text-text" to={`/guida/mappe/${encodeURIComponent(g.mappaPalazzo)}?area=${encodeURIComponent(g.area)}`}>{g.nome}</Link></li>)}</ul>
      </section>}
    </PageState>
    <div className="flex flex-wrap gap-3">
      <Link className="btn btn-secondary touch" to={schedaAccessoMondo(tipo, chiave)}>Apri scheda e informazioni</Link>
      <Link className="btn btn-ghost touch" to="/guida/mappe">Tutte le mappe</Link>
    </div>
  </div>;
}
