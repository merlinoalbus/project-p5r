// ============================================================
// useProposteDaCompletare — le proposte «da completare» del giorno e gli elenchi per le loro schede (L13, ondata 4a; solo preparazione)
// ============================================================
//
// Nel rilascio il meccanismo non esiste: la costante di build sceglie la funzione che non legge nulla, e la lettura esce dal bundle.
// ============================================================

import { useMemo } from 'react';
import { useCarica } from './useCarica';
import { getElenchiAzione, getElenchiEffettiVoce, getProposteConversione } from '../services/api';
import { nomiEffettiDa, type NomiEffetti } from '../utils/effettoAutomatico';
import type { ElenchiVoce } from '../utils/opzioniEffetti';
import type { PropostaConversioneDto } from '../../shared/proposteConversione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

const NESSUNA: ReadonlyMap<string, PropostaConversioneDto[]> = new Map();

/** Gli elenchi (per i nomi delle frasi e i campi da completare), caricati una volta per chi mostra le schede. */
export function useElenchiProposte(giorno: string): { elenchi: ElenchiVoce | null; nomi: NomiEffetti | null; errore: string | null } {
  const azione = useCarica(getElenchiAzione, []);
  const effetti = useCarica(getElenchiEffettiVoce, []);
  const elenchi = useMemo<ElenchiVoce | null>(() => (azione.dati && effetti.dati ? { azione: azione.dati, effetti: effetti.dati, giorno } : null), [azione.dati, effetti.dati, giorno]);
  const nomi = useMemo(() => (elenchi ? nomiEffettiDa(elenchi.azione, elenchi.effetti) : null), [elenchi]);
  return { elenchi, nomi, errore: azione.errore ?? effetti.errore };
}

/** Le proposte aperte del giorno, per voce; `versione` le fa rileggere dopo una modifica della giornata. */
function useProposteDelGiornoReale(giorno: string, versione: number): { perVoce: ReadonlyMap<string, PropostaConversioneDto[]>; ricarica: () => Promise<void> } {
  const p = useCarica(() => getProposteConversione({ da: giorno, a: giorno }), [giorno, versione]);
  const perVoce = useMemo(() => {
    const m = new Map<string, PropostaConversioneDto[]>();
    for (const x of p.dati ?? []) m.set(x.voceUid, [...(m.get(x.voceUid) ?? []), x]);
    return m;
  }, [p.dati]);
  return { perVoce, ricarica: p.ricarica };
}
const ricaricaNulla = () => Promise.resolve();
const useNessunaProposta: typeof useProposteDelGiornoReale = () => ({ perVoce: NESSUNA, ricarica: ricaricaNulla });
/** Le proposte aperte del giorno, per voce (nel rilascio sempre nessuna, senza chiamate). */
export const useProposteDelGiorno: typeof useProposteDelGiornoReale = IN_RILASCIO ? useNessunaProposta : useProposteDelGiornoReale;
