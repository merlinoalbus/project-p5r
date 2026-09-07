// ============================================================
// AccessoMondoPage — il bivio: questa cosa, dov'è?
// ============================================================
//
// È la pagina di passaggio del risolutore unico. Quando la risposta è una sola non la si vede
// nemmeno: si viene mandati dritti sulla mappa. Si vede solo quando c'è **da scegliere** —
// Untouchable sta in due punti di Shibuya — o quando la risposta è che un posto non c'è.
//
// Proprio perché è un bivio deve dire tre cose insieme: che cosa si sta cercando, quante strade ci
// sono, e che differenza c'è fra loro. Diceva «Apri luogo», che non nomina la cosa, ed elencava
// carte con dentro una riga di testo: due scelte si distinguevano leggendo, e a volte nemmeno,
// perché il nome dello spillo è quasi sempre il nome della cosa cercata.
//
// Ora ogni scelta porta **l'anteprima della planimetria**: due posti si distinguono guardandoli,
// che è il gesto giusto quando la domanda è «dove».
// ============================================================

import { Link, Navigate, useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { TIPI_ACCESSO_MONDO, urlDestinazioneMondo, type TipoAccessoMondo } from '../../shared/accessoMondo';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getAccessoMondo } from '../services/api/accessoMondo';
import { getAlberoMappe } from '../services/api';
import { PageState } from '../components/shared/PageState';
import { CollegamentoVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione } from '../components/shared/IconaAzione';
import { AnteprimaMappa } from '../components/mappe/AnteprimaMappa';
import { schedaAccessoMondo } from '../utils/accessoMondo';

/** Accesso al luogo comune; conserva le alternative e le schede della guida. */
export function AccessoMondoPage() {
  const { tipo, chiave } = useParams();
  if (!chiave || !TIPI_ACCESSO_MONDO.includes(tipo as TipoAccessoMondo)) return <div role="alert">Luogo non valido. <Link to="/guida/mappe">Apri le mappe</Link></div>;
  return <Accesso tipo={tipo as TipoAccessoMondo} chiave={chiave} />;
}

/** Come si chiama il tipo di cosa che si sta cercando, in italiano e al singolare. */
const NOME_TIPO_CERCATO: Record<string, string> = {
  negozio: 'Negozio', quartiere: 'Quartiere', dungeon: 'Palazzo', confidente: 'Confidente',
  luogo: 'Luogo', articolo: 'Articolo', attivita: 'Attività', area: 'Area', punto: 'Punto di interesse',
};

function Accesso({ tipo, chiave }: { tipo: TipoAccessoMondo; chiave: string }) {
  useDocumentTitle('Dove si trova');
  const carica = useCarica(() => getAccessoMondo(tipo, chiave), [tipo, chiave]);
  // L'albero serve solo alle anteprime: se non arriva, le carte restano col riquadro vuoto e la
  // pagina funziona lo stesso. Per questo non passa da `PageState` e non blocca niente.
  const albero = useCarica(getAlberoMappe, []);
  const perChiave = useMemo(() => new Map((albero.dati ?? []).map((m) => [m.chiave, m])), [albero.dati]);
  const anteprima = (mappa: string, nome: string) => perChiave.get(mappa) ?? { immagineUrl: null, asset: null, assetOriginale: null, nome };
  const dati = carica.dati;
  const guide = dati?.guide ?? [];
  // Il nome per esteso non c'è nel DTO del risolutore: si prende dalla prima destinazione, che per
  // un negozio è il nome dello spillo. Quando manca resta la chiave, che è comunque leggibile.
  const nomeCercato = `${NOME_TIPO_CERCATO[tipo] ?? 'Voce'}: ${dati?.destinazioni[0]?.nomeSpillo ?? chiave}`;
  if (!carica.caricamento && !carica.errore && dati?.esito === 'unica' && dati.destinazioni.length === 1 && guide.length === 0) {
    return <Navigate to={urlDestinazioneMondo(dati.destinazioni[0])} replace />;
  }
  return <div className="flex flex-col gap-4">
    <header className="flex flex-col gap-1">
      <h1 className="titolo-display m-0">Dove si trova</h1>
      {/* Il nome della cosa cercata: «Apri luogo» non lo diceva, e su una pagina di passaggio
          arrivata da un clic altrove è la prima cosa da confermare. */}
      <p className="m-0 text-[13px] text-text-secondary">{nomeCercato}</p>
    </header>
    <PageState isLoading={carica.caricamento} error={carica.errore} onRetry={carica.ricarica}>
      {/* Qualche voce non ha una posizione. Oggi sono quattro articoli: tre del negozio dentro il
          Palazzo di Niijima e uno del sito di Tanaka, che si apre dal laptop e non è un posto.
          Il comando «Sulla mappa» resta al suo posto — un comando che a volte sparisce è peggio —
          ma qui va detto chiaramente, invece di aprire una pagina che non mostra niente. */}
      {dati?.esito === 'assente' && guide.length === 0 && <div role="status" className="card flex flex-col gap-2">
        <p className="m-0">Questa voce non ha una posizione sulla mappa: nel catalogo c’è, ma non è collocata su nessuna planimetria.</p>
        <p className="m-0 text-text-secondary text-[13px]">Succede per la merce dei negozi che stanno dentro un Palazzo e per quella che si compra online, che nel mondo non hanno un punto.</p>
      </div>}
      {dati && dati.destinazioni.length > 0 && (dati.esito === 'multipla' || guide.length > 0) && <section className="flex flex-col gap-2" aria-label="Posizioni del luogo">
        <p className="m-0 text-[13px] text-text-secondary">
          {dati.destinazioni.length === 1 ? 'Una posizione sulla mappa.' : `In ${dati.destinazioni.length} posti diversi: scegli quale aprire.`}
        </p>
        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 xl:grid-cols-4">
          {dati.destinazioni.map(d => <li key={`${d.mappa}:${d.spillo ?? ''}`} className="flex">
            <Link className="card card--cliccabile group flex w-full flex-col gap-2 no-underline text-text" to={urlDestinazioneMondo(d)}>
              <AnteprimaMappa mappa={anteprima(d.mappa, d.nomeMappa)} className="aspect-[4/3] w-full" />
              <span className="flex flex-col gap-0.5">
                <span className="text-[13px] font-semibold leading-tight group-hover:text-primary">{d.nomeMappa}</span>
                {/* Il nome dello spillo solo se aggiunge qualcosa: quasi sempre è il nome della
                    cosa che si sta già cercando, scritto nell'intestazione. */}
                {d.nomeSpillo && d.nomeSpillo !== d.nomeMappa && <span className="text-[11px] text-text-muted">{d.nomeSpillo}</span>}
              </span>
            </Link>
          </li>)}
        </ul>
      </section>}
      {guide.length > 0 && <section className="flex flex-col gap-2" aria-label="Contenuti della guida">
        <h2 className="m-0 font-display text-[17px] uppercase leading-none">Contenuti della guida</h2>
        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 xl:grid-cols-4">
          {guide.map(g => <li key={`${g.dungeon}:${g.area}`} className="flex">
            <Link className="card card--cliccabile group flex w-full flex-col gap-2 no-underline text-text" to={`/guida/mappe/${encodeURIComponent(g.mappaPalazzo)}?area=${encodeURIComponent(g.area)}`}>
              <AnteprimaMappa mappa={anteprima(g.mappaPalazzo, g.nome)} className="aspect-[4/3] w-full" />
              <span className="text-[13px] font-semibold leading-tight group-hover:text-primary">{g.nome}</span>
            </Link>
          </li>)}
        </ul>
      </section>}
    </PageState>
    <div className="flex flex-wrap gap-2">
      <CollegamentoVisivo to={schedaAccessoMondo(tipo, chiave)} tono="secondario" compatto icona={<IconaAzione chiave="scheda" dimensione={20} />} titolo="Scheda e informazioni" />
      <CollegamentoVisivo to="/guida/mappe" tono="fantasma" compatto icona={<IconaAzione chiave="mappa" dimensione={20} />} titolo="Tutte le mappe" />
    </div>
  </div>;
}
