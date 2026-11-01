// ============================================================
// useEsitiNellaPartita — gli esiti nella partita attiva dei gruppi di condizioni di una pagina della guida (L8-03)
// ============================================================

import { useMemo } from 'react';
import { valutaGruppiCondizioni } from '../services/api';
import { useCarica } from './useCarica';
import { usePartitaStore } from '../stores/partitaStore';
import { normalizzaCondizioniSpillo } from '../../shared/condizioniSpillo';
import type { CondizioneSpilloDto, RispostaValutaCondizioniDto } from '../types';

/** Un gruppo di condizioni da valutare, con la chiave con cui la pagina ne ritrova l'esito. */
export interface GruppoCondizioni { chiave: string; condizioni: readonly CondizioneSpilloDto[] }

/**
 * Gli esiti dei gruppi nella partita attiva, per chiave, dal valutatore unico del server in una richiesta (`valutaGruppiCondizioni`); una
 * mappa vuota senza partita, in caricamento o con la lettura fallita (le pagine mostrano allora la sola frase). I gruppi senza condizioni
 * non si chiedono. Si rilegge quando cambiano la partita, il suo giorno, le sue impostazioni o i gruppi.
 */
export function useEsitiNellaPartita(gruppi: readonly GruppoCondizioni[]): ReadonlyMap<string, RispostaValutaCondizioniDto> {
  const attiva = usePartitaStore((s) => s.attiva);
  // la normalizzazione tiene i soli campi della condizione: la frase (`testo`, del server) non si rimanda al valutatore
  const richiesta = useMemo(() => gruppi.filter((g) => g.condizioni.length > 0)
    .map((g) => ({ chiave: g.chiave, condizioni: normalizzaCondizioniSpillo([...g.condizioni]) })), [gruppi]);
  const esiti = useCarica(
    () => (attiva && richiesta.length ? valutaGruppiCondizioni(richiesta, attiva.id) : Promise.resolve(null)),
    [attiva?.id, attiva?.dataGioco, attiva?.livelloProtagonista, attiva?.nuovaPartitaPlus, richiesta],
  );
  return useMemo(() => new Map(Object.entries(esiti.dati?.gruppi ?? {})), [esiti.dati]);
}
