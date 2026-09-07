// ============================================================
// DoveSiTrova — la posizione, non solo il collegamento alla posizione
// ============================================================
//
// La richiesta dell'utente è in due parti, e finora ne era coperta una sola: *«Qualsiasi
// riferimento alla mappa deve puntare al relativo punto di ancoraggio sull'atlante unificato,
// riportandolo anche già in pagina visibile in un'area opportuna.»*
//
// `CollegamentoMappa` fa la prima metà: porta all'ancora giusta. Ma un collegamento chiede di
// andarsene dalla pagina per sapere dove sta una cosa, e chi consulta una guida col tablet in mano
// mentre gioca non vuole perdere la scheda del negozio per vedere in che angolo di Shibuya si
// trova. La seconda metà è mostrarlo lì, subito, e lasciare il collegamento a chi vuole aprire
// l'atlante intero.
//
// I tre esiti del risolutore diventano tre rese diverse, e la differenza conta:
//
// - **una sola destinazione** → la mappa è lì, centrata sul pin, con il collegamento sotto;
// - **più destinazioni** → non si sceglie per il lettore. Un negozio che sta in tre quartieri ha
//   tre posti veri, e indovinarne uno vuol dire mandarlo nel posto sbagliato due volte su tre:
//   si elencano, e sceglie lui;
// - **nessuna** → lo si dice. Le quattro voci acquistabili solo online o dentro un Palazzo non
//   hanno un posto sulla mappa, e scrivere «posizione non disponibile» è un'informazione;
//   inventarne una è un danno.
//
// La mappa incorporata resta bassa apposta: è un riferimento, non il visore. Chi vuole il visore
// ha il collegamento, che porta all'ancora con pin, coordinate e ingrandimento.
// ============================================================

import { getAccessoMondo } from '../../services/api';
import { urlDestinazioneMondo, type TipoAccessoMondo } from '../../../shared/accessoMondo';
import { useCarica } from '../../hooks/useCarica';
import { Link } from 'react-router-dom';
import { IconaAzione } from '../shared/IconaAzione';
import { MappaIncorporata } from './MappaIncorporata';
import { Spinner } from '../shared/PageState';

interface Props {
  tipo: TipoAccessoMondo;
  chiave: string;
  /** Altezza del riquadro della mappa; predefinita 260 px — un riferimento, non il visore. */
  altezza?: number | string;
  /** Nasconde la mappa e lascia il solo collegamento: per le tabelle e le liste fitte. */
  soloCollegamento?: boolean;
  titolo?: string;
  className?: string;
}

export function DoveSiTrova({ tipo, chiave, altezza = 260, soloCollegamento = false,
  titolo = 'Dove si trova', className = '' }: Props) {
  const esito = useCarica(() => getAccessoMondo(tipo, chiave), [tipo, chiave]);

  if (esito.caricamento) return <div className={`card ${className}`}><Spinner /></div>;
  // Un errore del risolutore non deve rovinare la scheda che lo ospita: la posizione è un di più,
  // e la pagina vale anche senza. Si tace invece di mostrare un rosso che non aiuta nessuno.
  if (esito.errore || !esito.dati) return null;

  const { esito: quante, destinazioni } = esito.dati;

  if (quante === 'assente' || destinazioni.length === 0) {
    return <section className={`card flex flex-col gap-1 ${className}`} aria-label={titolo}>
      <h3 className="m-0 text-base">{titolo}</h3>
      <p className="m-0 text-sm text-text-secondary">
        Nessun posto sulla mappa: questa voce non si trova in un luogo del mondo.
      </p>
    </section>;
  }

  if (quante === 'multipla' || destinazioni.length > 1) {
    return <section className={`card flex flex-col gap-2 ${className}`} aria-label={titolo}>
      <h3 className="m-0 text-base">{titolo}</h3>
      <p className="m-0 text-sm text-text-secondary">
        In {destinazioni.length} posti diversi. Scegli quale aprire.
      </p>
      {/* A distinguere due posti è **la mappa**, non lo spillo: qui lo spillo si chiama quasi
          sempre come la cosa che si sta cercando, e Untouchable sta in due punti di Shibuya —
          venivano fuori due pastiglie identiche, e sceglierne una era tirare a indovinare.
          Rilievo di Codex, ed era codice mio. Il nome dello spillo resta accanto, ma solo quando
          aggiunge qualcosa a quello della mappa. */}
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {destinazioni.map((d) => <li key={`${d.mappa}-${d.spillo ?? 'x'}`}>
          <Link to={urlDestinazioneMondo(d)} className="chip touch inline-flex items-center gap-1 no-underline">
            <IconaAzione chiave="mappa" dimensione={14} />
            {d.nomeMappa}
            {d.nomeSpillo && d.nomeSpillo !== d.nomeMappa && <>{' '}<span className="text-text-muted">· {d.nomeSpillo}</span></>}
          </Link>
        </li>)}
      </ul>
    </section>;
  }

  const d = destinazioni[0];
  return <section className={`card flex flex-col gap-2 ${className}`} aria-label={titolo}>
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h3 className="m-0 text-base">{titolo}</h3>
      <span className="text-sm text-text-secondary">{d.nomeSpillo ? `${d.nomeSpillo} · ${d.nomeMappa}` : d.nomeMappa}</span>
    </div>
    {/* Senza l'editor: qui il visore è **citato**, non è la pagina. Chi legge dove si compra un
        libro non sta curando l'atlante, e «Modifica mappa» in mezzo alla scheda di un libro
        invita a modificarlo da un posto dove nessuno se ne accorgerebbe. Difetto trovato
        verificando i Libri di Codex — ma il pulsante veniva da `MappaIncorporata`, cioè da me. */}
    {!soloCollegamento && <MappaIncorporata
      chiave={d.mappa}
      spilloIniziale={d.spillo}
      puntoIniziale={d.centro}
      altezza={altezza}
      conEditor={false}
    />}
    <Link to={urlDestinazioneMondo(d)} className="btn btn-ghost btn-sm touch self-start inline-flex items-center gap-1.5">
      <IconaAzione chiave="mappa" dimensione={16} />Apri sull’atlante
    </Link>
  </section>;
}
