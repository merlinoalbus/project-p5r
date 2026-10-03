// ============================================================
// useIdStabili — chiavi stabili per le righe di un elenco modificabile che hanno uno stato loro
// ============================================================
//
// Con `key={indice}` togliere la riga 2 fa ereditare alla riga 3 lo stato della 2 (l'operatore appena
// scelto in una condizione, le condizioni aperte di un effetto). Una chiave fatta dal contenuto non va
// meglio: ogni modifica crea un oggetto nuovo, quindi la riga si rimonterebbe a ogni tasto e perderebbe
// proprio quello stato (rilievo A3 della verifica completa, 2026-10-03). Qui un identificativo per riga,
// tenuto in parallelo all'elenco: si toglie e si aggiunge insieme alla riga, e si riallinea da solo se
// l'elenco cambia lunghezza da fuori.
// ============================================================

import { useState } from 'react';

let contatore = 0;
const nuovoId = (): number => ++contatore;

export interface IdStabili {
  /** Un id per riga, nell'ordine dell'elenco: da usare come `key`. */
  ids: number[];
  /** Da chiamare insieme alla rimozione della riga `i`. */
  togli: (i: number) => void;
  /** Da chiamare insieme all'aggiunta di una riga in fondo. */
  aggiungi: () => void;
}

/** Id stabili per un elenco di `lunghezza` righe. */
export function useIdStabili(lunghezza: number): IdStabili {
  const [ids, setIds] = useState<number[]>(() => Array.from({ length: lunghezza }, nuovoId));
  let correnti = ids;
  if (ids.length !== lunghezza) {
    // l'elenco è cambiato da fuori (un'altra riga caricata, un ripristino): si tengono gli id delle righe rimaste al loro posto
    correnti = Array.from({ length: lunghezza }, (_, i) => ids[i] ?? nuovoId());
    setIds(correnti);
  }
  return {
    ids: correnti,
    togli: (i) => setIds(correnti.filter((_, j) => j !== i)),
    aggiungi: () => setIds([...correnti, nuovoId()]),
  };
}
