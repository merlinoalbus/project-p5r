// ============================================================
// CorniceArte — arte della scheda Persona dentro la cornice `ui/cornice-scheda` (riserva: pannello con bordo)
// ============================================================

import type { ReactNode } from 'react';
import { useAsset } from '../../stores/assetStore';

interface Props {
  children: ReactNode;
  className?: string;
}

/** Riquadro 16:10 con la cornice irregolare in stile P5 come sfondo e il contenuto centrato nell'area trasparente. */
export function CorniceArte({ children, className }: Props) {
  const cornice = useAsset('ui/cornice-scheda');
  return (
    <div className={`cornice-arte ${cornice ? '' : 'cornice-arte--riserva'} ${className ?? ''}`} style={cornice ? { backgroundImage: `url("${cornice}")` } : undefined}>
      <div className="cornice-arte__interno">{children}</div>
    </div>
  );
}
