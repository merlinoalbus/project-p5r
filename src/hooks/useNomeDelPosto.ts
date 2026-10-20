// ============================================================
// useNomeDelPosto — il nome del posto di una mappa, per i gesti di navigazione (L5 §4.4b, M1 e M2)
// ============================================================
//
// Regola unica di L2/L5: il gesto porta il nome della destinazione («Tokyo», «Shibuya», «Central Street»), mai «Mappa». Il nome viene
// dall'albero delle mappe (`nomeDellaMeta`: l'Area per una planimetria, altrimenti il nome della mappa); Tokyo si sa senza leggere niente.
// ============================================================

import { getAlberoMappe } from '../services/api';
import { nomeDellaMeta } from '../utils/navigazioneMappa';
import { useCarica } from './useCarica';

/** Il nome del posto della mappa `chiave`; null finché l'albero non è arrivato (o se la mappa non c'è). */
export function useNomeDelPosto(chiave: string | null): string | null {
  const albero = useCarica(getAlberoMappe, []);
  if (!chiave) return null;
  if (chiave === 'tokyo') return 'Tokyo';
  const m = albero.dati?.find((x) => x.chiave === chiave);
  return m ? nomeDellaMeta(m) : null;
}
