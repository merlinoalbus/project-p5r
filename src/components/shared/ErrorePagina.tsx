// ============================================================
// ErrorePagina — l'errore di una pagina, senza cancellare l'app (UI-ASSET-01, strato S6)
// ============================================================
//
// Senza un `ErrorBoundary` sulle route, React Router mostra la sua pagina inglese «Unexpected Application Error!» al posto di tutto il layout,
// e il nostro `ErrorBoundary` (sopra il router) non lo vede mai. Qui:
// - `ErrorePagina` è l'`ErrorBoundary` delle route: dentro `MainLayout` lascia menu e barra, alla radice sta da solo;
// - `ErroreInRiquadro` è il boundary compatto di un riquadro (il pannello scheda sopra il diario): l'errore resta nel riquadro e la pagina
//   sotto, con le sue bozze, non si tocca.
// Se l'errore è di caricamento di un file dell'app (rilascio durante l'uso) lo dice, propone «Torna indietro» e «Aggiorna l'app» (con il
// controllo delle bozze non salvate). Mai un ricaricamento automatico, mai testo in inglese.
// ============================================================

import { Component, type ReactNode } from 'react';
import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom';
import { eErroreDiChunk } from '../../utils/pagineLazy';
import { useVersioneStore } from '../../stores/versioneStore';
import { PulsanteAggiornaApp } from './AggiornaApp';
import { IconAlert } from './icons';

interface PropsContenuto {
  errore: unknown;
  compatto?: boolean;
  /** «Torna indietro» (solo per chi sa tornare). */
  onIndietro?: () => void;
  /** «Vai alla Home» o «Riprova» per gli errori che non sono di caricamento. */
  azioneAltro?: { etichetta: string; onClick: () => void };
}

/** Il messaggio dell'errore, in chiaro (mai la pagina inglese di React Router). */
function messaggioDi(errore: unknown): string | null {
  if (isRouteErrorResponse(errore)) return errore.status === 404 ? 'La pagina cercata non esiste.' : `Errore ${errore.status}.`;
  if (errore instanceof Error && errore.message) return errore.message;
  return null;
}

/** Il corpo del messaggio d'errore: titolo, spiegazione e pulsanti. */
function ContenutoErrore({ errore, compatto = false, onIndietro, azioneAltro }: PropsContenuto) {
  const chunk = eErroreDiChunk(errore);
  const messaggio = chunk ? null : messaggioDi(errore);
  return (
    <div className={`flex flex-col items-center justify-center gap-3 text-center ${compatto ? 'py-8 px-4' : 'flex-1 min-h-[60vh] p-6'}`} role="alert">
      <IconAlert size={32} className="text-error" />
      <h2 className="m-0 font-decor uppercase tracking-wide text-[22px] leading-none text-error">
        {chunk ? "L'app è stata aggiornata" : 'Qualcosa è andato storto'}
      </h2>
      <p className="m-0 text-text-secondary max-w-[460px]">
        {chunk
          ? "L'app è stata aggiornata mentre la usavi: questa pagina non si può caricare. Le modifiche che hai in corso nelle altre schede restano dove sono finché non aggiorni."
          : "Si è verificato un errore nella pagina. I dati salvati non sono stati persi."}
      </p>
      {messaggio && <p className="m-0 text-text-muted text-[13px] max-w-[460px] break-words">{messaggio}</p>}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {onIndietro && <button type="button" className="btn btn-secondary btn-sm touch" onClick={onIndietro}>Torna indietro</button>}
        {!chunk && azioneAltro && <button type="button" className="btn btn-secondary btn-sm touch" onClick={azioneAltro.onClick}>{azioneAltro.etichetta}</button>}
        {chunk && <PulsanteAggiornaApp className="btn btn-primary btn-sm touch">Aggiorna l'app</PulsanteAggiornaApp>}
      </div>
    </div>
  );
}

/** `ErrorBoundary` delle route di React Router (`useRouteError`). */
export function ErrorePagina() {
  const errore = useRouteError();
  const navigate = useNavigate();
  return (
    <ContenutoErrore
      errore={errore}
      onIndietro={() => void navigate(-1)}
      azioneAltro={{ etichetta: 'Vai alla Home', onClick: () => void navigate('/home') }}
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
    if (eErroreDiChunk(errore)) useVersioneStore.getState().segnala('chunk');
  }

  render() {
    if (!this.state.presente) return this.props.children;
    const chunk = eErroreDiChunk(this.state.errore);
    // un errore di caricamento non si riprova: la pagina `lazy` caduta resta caduta fino al ricaricamento; gli altri errori sì
    return <ContenutoErrore errore={this.state.errore} compatto azioneAltro={chunk ? undefined : { etichetta: 'Riprova', onClick: () => this.setState({ errore: null, presente: false }) }} />;
  }
}
