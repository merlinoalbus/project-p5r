// ============================================================
// ErrorePagina — l'errore di una pagina, senza cancellare l'app (UI-ASSET-01, strato S6)
// ============================================================
//
// Senza un `ErrorBoundary` sulle route, React Router mostra la sua pagina inglese «Unexpected Application Error!» al posto di tutto il layout,
// e il nostro `ErrorBoundary` (sopra il router) non lo vede mai. Qui:
// - `ErrorePagina` è l'`ErrorBoundary` delle route: dentro `MainLayout` lascia menu e barra, alla radice sta da solo;
// - `ErroreInRiquadro` è il boundary compatto di un riquadro (il pannello scheda sopra il diario): l'errore resta nel riquadro e la pagina
//   sotto, con le sue bozze, non si tocca.
// Se l'errore è di caricamento di un file dell'app (rilascio durante l'uso) lo dice, propone «Aggiorna l'app» (con il controllo delle bozze
// non salvate) e «Torna indietro»; gli altri errori «Riprova», «Torna indietro» e «Torna alla home». L'aspetto è quello di tutti gli errori
// (VistaErrore). Mai un ricaricamento automatico, mai testo in inglese.
// ============================================================

import { Component, type ReactNode } from 'react';
import { isRouteErrorResponse, useLocation, useNavigate, useRouteError } from 'react-router-dom';
import { eErroreDiChunk, senzaRete } from '../../utils/pagineLazy';
import { useVersioneStore } from '../../stores/versioneStore';
import { PulsanteAggiornaApp } from './AggiornaApp';
import { IconaAzione } from './IconaAzione';
import { AzioneHome, AzioneIndietro, AzioneRiprova, TITOLO_ERRORE, VistaErrore } from './VistaErrore';
import { ceUnaPaginaPrima } from '../../hooks/useIndietro';

interface PropsContenuto {
  errore: unknown;
  /** Il riquadro: vista compatta, titolo h2 (la pagina sotto ha il suo h1), niente «Torna alla home». */
  compatto?: boolean;
  /** «Torna indietro» (solo per chi sa tornare). */
  onIndietro?: () => void;
  /** «Riprova»: ripete il caricamento della pagina o ridisegna il riquadro. Mai per un file dell'app sparito (resta caduto fino all'aggiornamento). */
  onRiprova?: () => void;
}
/** Il messaggio dell'errore, in chiaro (mai la pagina inglese di React Router). */
function messaggioDi(errore: unknown): string | null {
  if (isRouteErrorResponse(errore)) return errore.status === 404 ? 'La pagina cercata non esiste.' : `Errore ${errore.status}.`;
  if (errore instanceof Error && errore.message) return errore.message;
  return null;
}

/** Il corpo del messaggio d'errore (VistaErrore): titolo, spiegazione, dettaglio e pulsanti. */
function ContenutoErrore({ errore, compatto = false, onIndietro, onRiprova }: PropsContenuto) {
  const offline = eErroreDiChunk(errore) && senzaRete();
  const chunk = eErroreDiChunk(errore) && !offline;
  return (
    <VistaErrore
      livello={compatto ? 2 : 1}
      compatta={compatto}
      titolo={offline ? 'Sei offline' : chunk ? "L'app è stata aggiornata" : TITOLO_ERRORE}
      spiegazione={offline
        ? 'Sei offline: questa pagina non si può caricare ora. Riprova quando torna la connessione; i dati che hai in corso nelle altre schede restano dove sono.'
        : chunk
          ? "L'app è stata aggiornata mentre la usavi: questa pagina non si può caricare. Le modifiche che hai in corso nelle altre schede restano dove sono finché non aggiorni."
          : 'Si è verificato un errore nella pagina. I dati salvati non sono stati persi.'}
      dettaglio={chunk || offline ? null : messaggioDi(errore)}
      azioni={<>
        {chunk
          ? <PulsanteAggiornaApp icona={<IconaAzione chiave="ricalcola" dimensione={20} />}>Aggiorna l'app</PulsanteAggiornaApp>
          : onRiprova && <AzioneRiprova onClick={onRiprova} />}
        {onIndietro && <AzioneIndietro onClick={onIndietro} />}
        {/* un file dell'app sparito può mancare anche alla Home: lì si aggiorna; nel riquadro la pagina sotto c'è già */}
        {!chunk && !compatto && <AzioneHome />}
      </>}
    />
  );
}

/** `ErrorBoundary` delle route di React Router (`useRouteError`). */
export function ErrorePagina() {
  const errore = useRouteError();
  const navigate = useNavigate();
  const posizione = useLocation();
  // senza una pagina dell'app prima (link diretto, scheda nuova) «Torna indietro» uscirebbe dall'app: resta «Torna alla home».
  // Stessa regola dell'«Indietro» delle schede (`ceUnaPaginaPrima`): `history.length` conta anche le pagine di altri siti
  const puoiTornare = ceUnaPaginaPrima();
  return (
    <ContenutoErrore
      errore={errore}
      onIndietro={puoiTornare ? () => void navigate(-1) : undefined}
      // il loader della route si riesegue navigando di nuovo alla stessa posizione (sostituendo la voce di cronologia)
      onRiprova={() => void navigate(posizione.pathname + posizione.search + posizione.hash, { replace: true })}
    />
  );
}

interface PropsRiquadro { children: ReactNode }
interface StatoRiquadro { errore: unknown; presente: boolean }

/** Boundary compatto di un riquadro: l'errore di un figlio (anche il rifiuto di una pagina `lazy`) resta qui dentro. */
export class ErroreInRiquadro extends Component<PropsRiquadro, StatoRiquadro> {
  state: StatoRiquadro = { errore: null, presente: false };

  static getDerivedStateFromError(errore: unknown): StatoRiquadro {
    return { errore, presente: true };
  }

  componentDidCatch(errore: unknown) {
    console.error('[ErroreInRiquadro] Errore catturato:', errore);
    // da offline un `import()` fallito non prova che l'app sia stata aggiornata: nessuna segnalazione «nuova versione»
    if (eErroreDiChunk(errore) && !senzaRete()) useVersioneStore.getState().segnala('chunk');
  }

  render() {
    if (!this.state.presente) return this.props.children;
    const chunk = eErroreDiChunk(this.state.errore);
    // un errore di caricamento non si riprova: la pagina `lazy` caduta resta caduta fino al ricaricamento; gli altri errori sì
    return <ContenutoErrore errore={this.state.errore} compatto onRiprova={chunk ? undefined : () => this.setState({ errore: null, presente: false })} />;
  }
}
