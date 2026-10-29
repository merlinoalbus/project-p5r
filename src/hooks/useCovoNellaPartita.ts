// ============================================================
// useCovoNellaPartita — se il Covo dei Ladri c'è già nella partita (richiesta dell'utente del 2026-10-29)
// ============================================================
//
// «Il covo dei ladri si sblocca il 5 maggio» e deve comparire «in mappa solo da quella data in poi». La data non sta qui: sta una volta
// nei dati, come condizione dell'Area del Covo (`area.condizioni_json`, migrazione 303), e il server dice per la partita se l'Area è
// già nel mondo (`disponibile`, `bloccoMotivo`), come per ogni altro posto datato. Qui si legge solo quell'esito, per la fermata della
// mappa di Tokyo e per i collegamenti fra la pagina del Covo e la sua Area. Senza partita il server dice «disponibile», come per tutti.
// ============================================================

import { useMemo } from 'react';
import { getAreeDelQuartiere } from '../services/api';
import { useCarica } from './useCarica';
import { useRileggiAlCambio } from './useRileggiAlCambio';
import { COVO_AREA } from '../utils/covo';

/** Lo stato del Covo nella partita: c'è o no e, se non ancora, perché (il testo del server); aperto, `quando` è null. */
export interface CovoNellaPartita { disponibile: boolean; quando: string | null }

/**
 * L'esito dell'Area del Covo per la partita: `undefined` finché non è arrivato (o se la lettura non è riuscita: meglio non disegnare
 * la fermata che disegnarla a torto), `null` se l'Area non c'è più (nessuna data da rispettare), altrimenti l'esito. Si rilegge quando
 * cambia lo stato della partita (`dipendenza`, di norma la partita attiva: il giorno avanza).
 */
export function useCovoNellaPartita(partitaId: number | null | undefined, dipendenza: unknown, attivo = true): CovoNellaPartita | null | undefined {
  const dati = useCarica(async () => {
    if (!attivo) return { area: undefined };
    const aree = await getAreeDelQuartiere(COVO_AREA.quartiere, partitaId ?? undefined);
    return { area: aree.find((a) => a.chiave === COVO_AREA.chiave) ?? null };
  }, [partitaId ?? null, attivo]);
  useRileggiAlCambio(dati.ricarica, dipendenza);
  const area = dati.dati?.area;
  // un oggetto stabile finché l'esito non cambia: chi lo riceve (la mappa di Tokyo) ci calcola sopra i suoi segni
  const esito = area === undefined ? 'attesa' : area === null ? 'assente' : area.disponibile !== false ? 'aperto' : 'chiuso';
  // il perché serve solo finché il Covo non c'è («dal 5 maggio», dal valutatore): aperto, la fermata porta il solo nome
  const quando = area && esito === 'chiuso' ? area.bloccoMotivo ?? area.sblocco?.manca ?? area.sblocco?.testo ?? null : null;
  return useMemo(() => esito === 'attesa' ? undefined : esito === 'assente' ? null : { disponibile: esito === 'aperto', quando }, [esito, quando]);
}
