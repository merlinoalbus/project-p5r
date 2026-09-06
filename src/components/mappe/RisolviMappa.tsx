import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { risolviMappa } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { PageState } from '../shared/PageState';
/** Gli alias editoriali aprono contenuti, mai coordinate geografiche inventate. */
export function RisolviMappa({ chiave, children }: { chiave: string; children: (mappa: string) => ReactNode }) {
  const esito = useCarica(() => risolviMappa(chiave), [chiave]);
  if (esito.dati?.tipo === 'guida') return <Navigate replace to={`/guida/mappe/${encodeURIComponent(esito.dati.mappaPalazzo)}?area=${encodeURIComponent(esito.dati.area)}`} />;
  return <PageState isLoading={esito.caricamento} error={esito.errore} onRetry={esito.ricarica}>{esito.dati?.tipo === 'mappa' && children(esito.dati.mappa)}</PageState>;
}
