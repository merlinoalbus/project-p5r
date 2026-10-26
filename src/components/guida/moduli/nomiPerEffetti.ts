// ============================================================
// nomiPerEffetti — quartieri, attività e (a richiesta) Confidenti, per scrivere le frasi degli effetti con i nomi e non con le chiavi
// ============================================================
//
// Ondata 5, lotto F (RG-03): gli editor degli effetti non usano più i Confidenti (servivano solo alla famiglia «regalo» con `graditoA`,
// tolta: a chi piace un regalo si legge da `confidente_regalo`). Li carica solo il modulo dell'attività, che sceglie il Confidente
// (`{ confidenti: true }`); libri e film non li chiedono più. L'errore è un messaggio che dice che cosa non si è caricato, mostrato una
// volta sola dal modulo (`AvvisoNomiPerEffetti`).

import { useCarica } from '../../../hooks/useCarica';
import { getAttivita, getConfidenti, getQuartieri } from '../../../services/api';
import type { NomiPerEffetti } from '../../../utils/effetti';

/** Che cosa caricare: niente con `attivo` falso; i Confidenti solo con `confidenti`. */
export interface OpzioniNomiPerEffetti { attivo?: boolean; confidenti?: boolean }

/** «i quartieri», «i quartieri e le attività», «i quartieri, le attività e i Confidenti». */
function elenco(voci: string[]): string {
  return voci.length < 2 ? voci.join('') : `${voci.slice(0, -1).join(', ')} e ${voci[voci.length - 1]}`;
}

/**
 * Carica quartieri, attività e, se richiesti, Confidenti (solo chiave e nome) per i moduli con effetti; con `attivo` falso non chiede nulla
 * e restituisce elenchi vuoti. `erroreNomi` dice quali elenchi non si sono caricati; `riprovaNomi` ripete solo quelli.
 */
export function useNomiPerEffetti({ attivo = true, confidenti: conConfidenti = false }: OpzioniNomiPerEffetti = {}): Required<Omit<NomiPerEffetti, 'erroreNomi' | 'riprovaNomi'>> & Pick<NomiPerEffetti, 'erroreNomi' | 'riprovaNomi'> {
  const quartieri = useCarica(() => (attivo ? getQuartieri() : Promise.resolve([])), [attivo]);
  const attivita = useCarica(async () => (attivo ? (await getAttivita()).attivita.map((a) => ({ chiave: a.chiave, nome: a.nome })) : []), [attivo]);
  const confidenti = useCarica(async () => (attivo && conConfidenti ? (await getConfidenti()).map((c) => ({ chiave: c.chiave, nome: c.nome })) : []), [attivo, conConfidenti]);
  const falliti = [
    ...(quartieri.errore ? [{ nome: 'i quartieri', ricarica: quartieri.ricarica }] : []),
    ...(attivita.errore ? [{ nome: 'le attività', ricarica: attivita.ricarica }] : []),
    ...(conConfidenti && confidenti.errore ? [{ nome: 'i Confidenti', ricarica: confidenti.ricarica }] : []),
  ];
  return {
    quartieri: quartieri.dati ?? [], attivita: attivita.dati ?? [], confidenti: confidenti.dati ?? [],
    erroreNomi: falliti.length ? `Impossibile caricare ${elenco(falliti.map((f) => f.nome))}.` : null,
    riprovaNomi: () => { for (const f of falliti) void f.ricarica(); },
  };
}
