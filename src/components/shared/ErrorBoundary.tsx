// ============================================================
// ErrorBoundary — fallback autonomo per errori React runtime
// ============================================================
// Palette self-contained: deve funzionare anche se il tema non è caricato.
// ============================================================

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { useAssetStore } from '../../stores/assetStore';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/** Intercetta errori React non gestiti e mostra un recupero leggibile all'utente. */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  /** Un errore di render nei figli fa passare allo stato d'errore, conservando l'errore da mostrare. */
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  /** Scrive in console l'errore con le informazioni sullo stack dei componenti, per la diagnosi. */
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Errore catturato:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleDismiss = () => {
    this.setState({ hasError: false, error: null });
  };

  /**
   * Senza errori mostra i figli. Con un errore mostra la schermata di recupero a colori fissi (indipendente dal tema):
   * l'illustrazione d'errore se il manifest degli asset la contiene, il messaggio dell'errore, «Riprova» (azzera lo
   * stato e ridisegna i figli) e «Ricarica app».
   */
  render() {
    if (this.state.hasError) {
      const illustrazione = useAssetStore.getState().manifest?.file['illustrazioni/errore-senza-testo'] ?? null;
      return (
        <div className="flex flex-col items-center justify-center h-screen p-8 font-sans bg-[#0b0b0e] text-[#ececf1]">
          <div className="max-w-[520px] text-center p-8 rounded-lg bg-[#14141a] border border-[#e5352b] shadow-[0_4px_24px_rgba(229,53,43,0.2)]">
            {illustrazione && <img src={illustrazione} alt="" className="max-h-[150px] w-auto object-contain mx-auto mb-4" draggable={false} />}
            <h2 className="text-[#e5352b] m-0 mb-4 text-[1.3rem] font-display uppercase tracking-wide">Qualcosa è andato storto</h2>
            <p className="text-[#a3a3b3] m-0 mb-4 text-[0.95rem] leading-normal">
              Si è verificato un errore nell'applicazione. I dati salvati non sono stati persi.
            </p>
            {this.state.error && (
              <pre className="text-left p-3 rounded-[6px] [--area-fondo:#1c1c24] text-[#ff6b6b] text-[0.75rem] area-scorrevole whitespace-pre-wrap break-words max-h-[120px] m-0 mb-6">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleDismiss}
                className="px-5 py-3 rounded-[8px] border border-[#a3a3b3] bg-transparent text-[#a3a3b3] cursor-pointer text-[0.9rem]"
              >
                Riprova
              </button>
              <button
                onClick={this.handleReload}
                className="px-5 py-3 rounded-[8px] border-none bg-[#e5352b] text-white cursor-pointer text-[0.9rem]"
              >
                Ricarica app
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
