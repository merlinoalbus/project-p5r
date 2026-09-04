// ============================================================
// PageState / EmptyState / Spinner — stati di pagina uniformi (Fase 11.1: sempre illustrati quando gli asset esistono)
// ============================================================

import type { ReactNode } from 'react';
import { IconAlert } from './icons';
import { AssetImg } from './AssetImg';
import { useAssetMulti } from '../../stores/assetStore';

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
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-center" role="alert">
        <AssetImg nome="illustrazioni/errore-senza-testo" alt="" decorativa className="max-h-[150px] w-auto object-contain" fallback={<IconAlert size={32} className="text-error" />} />
        <h3 className="m-0 font-display uppercase tracking-wide text-[22px] text-error">Qualcosa è andato storto</h3>
        <p className="m-0 text-text-secondary max-w-[420px]">{error}</p>
        {onRetry && (
          <button type="button" className="btn btn-secondary" onClick={onRetry}>
            Riprova
          </button>
        )}
      </div>
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
        fallback={icon ? <div className="text-text-muted text-[40px] leading-none">{icon}</div> : null}
      />
      <h3 className="m-0 font-display uppercase tracking-wide text-[24px] text-text">{title}</h3>
      {hint && <p className="m-0 text-[14px] text-text-muted max-w-[420px]">{hint}</p>}
      {action && <div className="mt-2 flex gap-2">{action}</div>}
    </div>
  );
}
