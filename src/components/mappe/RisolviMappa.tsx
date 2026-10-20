// ============================================================
// RisolviMappa — risolve una chiave di mappa: alias della guida reindirizzati, mappe passate ai figli con la loro casa
// ============================================================

import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { risolviMappa } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { PageState } from '../shared/PageState';
/** Gli alias editoriali aprono contenuti, mai coordinate geografiche inventate. Una mappa passa ai figli con la sua chiave vera e la
 *  sua **casa** (L2): l'indirizzo dell'unica pagina che la mostra, calcolato dal server. */
export function RisolviMappa({ chiave, children }: { chiave: string; children: (mappa: string, casa: string) => ReactNode }) {
  const esito = useCarica(() => risolviMappa(chiave), [chiave]);
  // L3 (§4.1): la sezione si apre sulla sua casa calcolata dal server (la scheda del Palazzo sull'infiltrazione, `?infiltrazione=`);
  // senza casa (dati di prima) la mappa del Palazzo con `?area=`, come prima
  if (esito.dati?.tipo === 'guida') return <Navigate replace to={esito.dati.casa ?? `/guida/mappe/${encodeURIComponent(esito.dati.mappaPalazzo)}?area=${encodeURIComponent(esito.dati.area)}`} />;
  return <PageState isLoading={esito.caricamento} error={esito.errore} onRetry={esito.ricarica}>{esito.dati?.tipo === 'mappa' && children(esito.dati.mappa, esito.dati.casa)}</PageState>;
}
