// ============================================================
// PageState / EmptyState / Spinner — stati di pagina uniformi (Fase 11.1: sempre illustrati quando gli asset esistono)
// ============================================================

import type { ReactNode } from 'react';
import { AssetImg } from './AssetImg';
import { useAssetMulti } from '../../stores/assetStore';
import { AzioneHome, AzioneRiprova, TITOLO_ERRORE, VistaErrore } from './VistaErrore';

const FOTOGRAMMI = Array.from({ length: 8 }, (_, i) => `illustrazioni/caricamento-${i + 1}`);
const ILLUSTRAZIONE_NEUTRA = 'illustrazioni/vuoto-persona-senza-testo';

/** Indicatore di caricamento: gli otto fotogrammi animati se ci sono tutti, altrimenti l'anello. */
export function Spinner({ size = 24 }: { size?: number }) {
  const fotogrammi = useAssetMulti(FOTOGRAMMI).filter((u): u is string => u !== null);
  if (fotogrammi.length === FOTOGRAMMI.length) {
    const lato = Math.max(size, 56);
    return (
      <div className="relative shrink-0" style={{ width: lato, height: lato }} role="status" aria-label="Caricamento">
        {fotogrammi.map((url, i) => (
          <img key={url} src={url} alt="" className="fotogramma absolute inset-0 w-full h-full object-contain" style={{ animationDelay: `${-i * 0.1}s` }} draggable={false} />
        ))}
      </div>
    );
  }
  return (
    <div
      className="border-2 border-border border-t-primary rounded-full animate-[spin_0.8s_linear_infinite]"
      style={{ width: size, height: size }}
      role="status"
      aria-label="Caricamento"
    />
  );
}

interface PageStateProps {
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
  children: ReactNode;
}

/** Switch uniforme caricamento / errore / contenuto per ogni pagina. */
export function PageState({ isLoading, error, onRetry, children }: PageStateProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Spinner size={32} />
      </div>
    );
  }
  if (error) {
    // un solo aspetto per gli errori (VistaErrore); h2: sta sotto l'h1 dell'intestazione della pagina
    return (
      <VistaErrore
        titolo={TITOLO_ERRORE}
        spiegazione={error}
        azioni={<>
          {onRetry && <AzioneRiprova onClick={onRetry} />}
          <AzioneHome />
        </>}
      />
    );
  }
  return <>{children}</>;
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
  /** Nome dell'illustrazione dedicata (`illustrazioni/<nome>`); se manca si usa quella neutra, poi l'icona. */
  illustrazione?: string;
}

/** Stato vuoto illustrato con messaggio, suggerimento e azione facoltativa. */
export function EmptyState({ icon, title, hint, action, illustrazione }: EmptyStateProps) {
  const dedicata = illustrazione ? `illustrazioni/${illustrazione}` : null;
  const [urlDedicata, urlNeutra] = useAssetMulti([dedicata, ILLUSTRAZIONE_NEUTRA]);
  const nome = urlDedicata ? dedicata : urlNeutra ? ILLUSTRAZIONE_NEUTRA : null;
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-center">
      <AssetImg
        nome={nome}
        alt=""
        decorativa
        className="max-h-[200px] w-auto object-contain"
        fallback={icon ? <div className="text-text-muted testo-40 leading-none">{icon}</div> : null}
      />
      <h3 className="m-0 font-decor uppercase tracking-wide testo-28 leading-none text-text">{title}</h3>
      {hint && <p className="m-0 testo-14 text-text-muted max-w-[420px]">{hint}</p>}
      {action && <div className="mt-2 flex gap-2">{action}</div>}
    </div>
  );
}
