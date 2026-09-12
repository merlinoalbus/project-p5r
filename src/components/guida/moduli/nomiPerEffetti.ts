// ============================================================
// nomiPerEffetti — quartieri e attività, per scrivere le frasi degli effetti con i nomi e non con le chiavi
// ============================================================

import { useCarica } from '../../../hooks/useCarica';
import { getAttivita, getConfidenti, getQuartieri } from '../../../services/api/compendio';
import type { NomiPerEffetti } from '../../../utils/effetti';

export function useNomiPerEffetti(attivo = true): Required<Omit<NomiPerEffetti, 'erroreNomi' | 'riprovaNomi'>> & Pick<NomiPerEffetti, 'erroreNomi' | 'riprovaNomi'> {
  const quartieri = useCarica(() => (attivo ? getQuartieri() : Promise.resolve([])), [attivo]);
  const attivita = useCarica(async () => (attivo ? (await getAttivita()).attivita.map((a) => ({ chiave: a.chiave, nome: a.nome })) : []), [attivo]);
  const confidenti = useCarica(async () => (attivo ? (await getConfidenti()).map((c) => ({ chiave: c.chiave, nome: c.nome })) : []), [attivo]);
  return {
    quartieri: quartieri.dati ?? [], attivita: attivita.dati ?? [], confidenti: confidenti.dati ?? [],
    erroreNomi: quartieri.errore ?? attivita.errore ?? confidenti.errore ?? null,
    riprovaNomi: () => { void quartieri.ricarica(); void attivita.ricarica(); void confidenti.ricarica(); },
  };
}
