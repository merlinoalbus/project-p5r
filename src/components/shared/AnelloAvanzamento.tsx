// ============================================================
// AnelloAvanzamento — anello di avanzamento in SVG attorno a un contenuto (badge, numero, immagine)
// ============================================================

import type { ReactNode } from 'react';

interface Props {
  /** Quota 0–1. */
  quota: number;
  dimensione?: number;
  spessore?: number;
  /** Etichetta accessibile: se presente l'anello è un progressbar. */
  etichetta?: string;
  children?: ReactNode;
  className?: string;
}

/** Anello circolare con la quota in rosso sul bordo grigio; il contenuto sta al centro. */
export function AnelloAvanzamento({ quota, dimensione = 64, spessore = 4, etichetta, children, className }: Props) {
  const q = Number.isFinite(quota) ? Math.min(1, Math.max(0, quota)) : 0;
  const raggio = (dimensione - spessore) / 2;
  const circonferenza = 2 * Math.PI * raggio;
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className ?? ''}`}
      style={{ width: dimensione, height: dimensione }}
      role={etichetta ? 'progressbar' : undefined}
      aria-valuemin={etichetta ? 0 : undefined}
      aria-valuemax={etichetta ? 100 : undefined}
      aria-valuenow={etichetta ? Math.round(q * 100) : undefined}
      aria-label={etichetta}
    >
      <svg viewBox={`0 0 ${dimensione} ${dimensione}`} className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx={dimensione / 2} cy={dimensione / 2} r={raggio} fill="none" stroke="var(--color-border)" strokeWidth={spessore} />
        <circle
          cx={dimensione / 2}
          cy={dimensione / 2}
          r={raggio}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={spessore}
          strokeLinecap="round"
          strokeDasharray={`${circonferenza * q} ${circonferenza}`}
          className="transition-[stroke-dasharray] duration-500"
        />
      </svg>
      <div className="relative flex items-center justify-center">{children}</div>
    </div>
  );
}
