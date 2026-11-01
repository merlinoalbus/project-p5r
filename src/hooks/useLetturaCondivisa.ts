// ============================================================
// useLetturaCondivisa — `useCarica` su una lettura condivisa fra tutte le istanze montate (L5-07)
// ============================================================
//
// Per i componenti che si montano a centinaia con la stessa lettura (`DaApplicare`: uno per voce del Diario, per domanda, per Richiesta).
// Stessa forma di ritorno di `useCarica`; cambia solo da dove arrivano i dati (vedi `services/api/letturaCondivisa.ts` per le regole di
// validità) e che `ricarica()` rilegge sempre dalla rete.
// ============================================================

import { useCallback, useEffect, useRef } from 'react';
import { useCarica } from './useCarica';
import { agganciaLetturaCondivisa, invalidaLetturaCondivisa, leggiCondivisa } from '../services/api/letturaCondivisa';

/**
 * @param chiave identifica la lettura per tutte le istanze (di norma tipo e partita: `proposte:3`)
 * @param token da che cosa dipende la lettura in comune (per esempio le versioni delle mutazioni): se cambia, si rilegge
 * @param carica la lettura vera
 * @param dipendenze quelle di `useCarica`: includono `chiave` e `token`, più ciò che riguarda solo questa istanza
 * @param versioneIstanza un contatore di questa sola istanza (per esempio le volte di un'attività): se cambia, la lettura in comune non vale più
 */
export function useLetturaCondivisa<T>(
  chiave: string,
  token: string,
  carica: () => Promise<T>,
  dipendenze: unknown[],
  versioneIstanza = 0,
): ReturnType<typeof useCarica<T>> {
  // prima di `useCarica`: l'istanza è dichiarata montata prima che la sua lettura parta
  useEffect(() => agganciaLetturaCondivisa(chiave), [chiave]);
  const versioneVista = useRef(versioneIstanza);
  const stato = useCarica(() => {
    if (versioneVista.current !== versioneIstanza) {
      versioneVista.current = versioneIstanza;
      invalidaLetturaCondivisa(chiave);
    }
    return leggiCondivisa(chiave, token, carica);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- le dipendenze sono quelle del chiamante (con `chiave` e `token`), passate così come sono
  }, dipendenze);
  const { ricarica: ricaricaBase } = stato;
  const ricarica = useCallback(() => {
    invalidaLetturaCondivisa(chiave);
    return ricaricaBase();
  }, [chiave, ricaricaBase]);
  return { ...stato, ricarica };
}
