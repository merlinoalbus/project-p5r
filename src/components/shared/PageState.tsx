// ============================================================
// PageState / EmptyState / Spinner — stati di pagina uniformi
// ============================================================

import type { ReactNode } from 'react';
import { IconAlert } from './icons';
import { AssetImg } from './AssetImg';

/** Indicatore animato di caricamento con dimensione configurabile. */
export function Spinner({ size = 24 }: { size?: number }) {
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
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-center">
        <IconAlert size={32} className="text-error" />
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
  /** Nome dell'illustrazione predefinita (`illustrazioni/<nome>`), mostrata se disponibile al posto dell'icona. */
  illustrazione?: string;
}

/** Stato vuoto con messaggio, suggerimento e azione facoltativa. */
export function EmptyState({ icon, title, hint, action, illustrazione }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-center">
      <AssetImg
        nome={illustrazione ? `illustrazioni/${illustrazione}` : null}
        alt=""
        decorativa
        className="max-h-[180px] w-auto object-contain"
        fallback={icon ? <div className="text-text-muted">{icon}</div> : null}
      />
      <h3 className="m-0 text-[16px] text-text">{title}</h3>
      {hint && <p className="m-0 text-[14px] text-text-muted max-w-[420px]">{hint}</p>}
      {action && <div className="mt-2 flex gap-2">{action}</div>}
    </div>
  );
}
