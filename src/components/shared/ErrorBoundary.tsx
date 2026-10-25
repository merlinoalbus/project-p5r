// ============================================================
// ErrorBoundary — fallback autonomo per errori React runtime
// ============================================================
// Palette self-contained: deve funzionare anche se il tema non è caricato. Per questo la vista (`VistaErrore` in variante
// `autonoma`) e i pulsanti qui sotto hanno i colori scritti a mano, con i valori dei token del tema; la struttura e i testi sono
// quelli di tutti gli errori dell'app (titolo, spiegazione, dettaglio, «Riprova» / «Ricarica l'app» / «Torna alla home»).
//
// La conferma per le bozze non salvate non usa né `window.confirm` né `DialogoConferma` (che vive in `MainLayout`, smontato
// quando si arriva qui): è una domanda dentro la schermata stessa, con «Annulla» che prende il fuoco. Esc la chiude come «Annulla»
// (lotto C) e, chiusa, il fuoco torna al pulsante che l'aveva aperta («Ricarica l'app» o «Torna alla home»).
// ============================================================

import { Component, createRef, type ReactNode, type ErrorInfo } from 'react';
import { useAssetStore } from '../../stores/assetStore';
import { bozzeSporche, disattivaGuardiaBozze } from '../../utils/bozzeSporche';
import { TITOLO_ERRORE, VistaErrore } from './VistaErrore';

interface Props {
  children: ReactNode;
}

/** Dove si va lasciando la schermata: ricaricando la pagina in cui si è, o caricando la Home. */
type Uscita = 'ricarica' | 'home';

interface State {
  hasError: boolean;
  error: Error | null;
  /** L'uscita in attesa di conferma perché ci sono bozze non salvate (con le loro etichette). */
  daConfermare: { uscita: Uscita; sporche: string[] } | null;
}

/** I pulsanti a colori fissi, alti 44 px come gli altri bersagli touch. */
const PULSANTE = 'min-h-[44px] px-5 py-2 rounded-[8px] cursor-pointer text-[0.9rem] font-semibold';
const PULSANTE_PRIMARIO = `${PULSANTE} border-none bg-[#e5352b] text-white`;
const PULSANTE_SECONDARIO = `${PULSANTE} border border-[#a3a3b3] bg-transparent text-[#ececf1]`;

/** Intercetta errori React non gestiti e mostra un recupero leggibile all'utente. */
export class ErrorBoundary extends Component<Props, State> {
  private annulla = createRef<HTMLButtonElement>();
  private ricarica = createRef<HTMLButtonElement>();
  private home = createRef<HTMLButtonElement>();

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, daConfermare: null };
  }

  /** Un errore di render nei figli fa passare allo stato d'errore, conservando l'errore da mostrare. */
  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, daConfermare: null };
  }

  /** Scrive in console l'errore con le informazioni sullo stack dei componenti, per la diagnosi. */
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Errore catturato:', error, errorInfo);
  }

  /** Aperta la domanda sulle bozze, il fuoco va su «Annulla» (come in DialogoConferma) ed Esc la chiude; chiusa, il fuoco torna al
   *  pulsante che l'aveva aperta. */
  componentDidUpdate(_: Props, prima: State) {
    if (this.state.daConfermare && !prima.daConfermare) {
      this.annulla.current?.focus();
      document.addEventListener('keydown', this.tasto);
    }
    if (!this.state.daConfermare && prima.daConfermare) {
      document.removeEventListener('keydown', this.tasto);
      if (this.state.hasError) (prima.daConfermare.uscita === 'home' ? this.home : this.ricarica).current?.focus();
    }
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.tasto);
  }

  /** Esc, con la domanda sulle bozze aperta: come «Annulla». */
  private tasto = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || !this.state.daConfermare) return;
    e.preventDefault();
    this.setState({ daConfermare: null });
  };

  /** Esce davvero: ricarica la pagina o carica la Home (la guardia `beforeunload` è già stata superata dalla conferma). */
  private esci(uscita: Uscita) {
    disattivaGuardiaBozze();
    if (uscita === 'home') window.location.assign('/home');
    else window.location.reload();
  }

  /** Stesso controllo di «Aggiorna»: se altrove ci sono bozze non salvate, prima le nomina e chiede conferma. */
  private chiedi(uscita: Uscita) {
    const sporche = bozzeSporche();
    if (sporche.length) { this.setState({ daConfermare: { uscita, sporche } }); return; }
    this.esci(uscita);
  }

  handleDismiss = () => {
    this.setState({ hasError: false, error: null, daConfermare: null });
  };

  /**
   * Senza errori mostra i figli. Con un errore mostra la vista d'errore a colori fissi (indipendente dal tema): l'illustrazione
   * d'errore se il manifest degli asset la contiene, il messaggio dell'errore, «Riprova» (azzera lo stato e ridisegna i figli),
   * «Ricarica l'app» e «Torna alla home» (entrambe con il controllo delle bozze non salvate).
   */
  render() {
    if (!this.state.hasError) return this.props.children;
    const illustrazione = useAssetStore.getState().manifest?.file['illustrazioni/errore-senza-testo'] ?? null;
    const { daConfermare } = this.state;
    return (
      <VistaErrore
        autonoma={{ illustrazione }}
        livello={1}
        titolo={TITOLO_ERRORE}
        spiegazione="Si è verificato un errore nell'applicazione. I dati salvati non sono stati persi."
        dettaglio={this.state.error?.message ?? null}
        azioni={daConfermare ? (
          <div role="group" aria-labelledby="errore-bozze-testo" className="flex flex-col items-center gap-3 max-w-[460px] p-4 rounded-[8px] border border-[#e5352b] bg-[#14141a]">
            <p id="errore-bozze-testo" className="m-0 text-[#ececf1]">
              Hai modifiche non salvate in: {daConfermare.sporche.join(', ')}. Se {daConfermare.uscita === 'home' ? 'vai alla home' : 'ricarichi'} ora si perdono.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <button ref={this.annulla} type="button" className={PULSANTE_SECONDARIO} onClick={() => this.setState({ daConfermare: null })}>Annulla</button>
              <button type="button" className={PULSANTE_PRIMARIO} onClick={() => this.esci(daConfermare.uscita)}>
                {daConfermare.uscita === 'home' ? 'Vai comunque alla home' : 'Ricarica comunque'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <button type="button" className={PULSANTE_PRIMARIO} onClick={this.handleDismiss}>Riprova</button>
            <button ref={this.ricarica} type="button" className={PULSANTE_SECONDARIO} onClick={() => this.chiedi('ricarica')}>Ricarica l'app</button>
            <button ref={this.home} type="button" className={PULSANTE_SECONDARIO} onClick={() => this.chiedi('home')}>Torna alla home</button>
          </>
        )}
      />
    );
  }
}
