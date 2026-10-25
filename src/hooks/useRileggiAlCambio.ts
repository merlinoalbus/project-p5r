// ============================================================
// useRileggiAlCambio — rilegge una lettura di `useCarica` quando cambia un valore, senza azzerarla
// ============================================================

import { useEffect, useRef } from 'react';

/**
 * Chiama `ricarica` ogni volta che `valore` cambia (confronto per contenuto), mai al montaggio.
 *
 * Serve quando la risposta dipende da uno stato che si aggiorna sotto la pagina (la partita attiva: giorno, fascia, rango…): metterlo
 * fra le dipendenze di `useCarica` cambierebbe la chiave della lettura e azzererebbe i dati (spinner al posto della pagina, editor
 * aperti smontati a ogni «+» di un livello o a ogni meteo segnato). `ricarica()` invece tiene a schermo i dati mentre arrivano
 * quelli nuovi.
 */
export function useRileggiAlCambio(ricarica: () => Promise<void>, valore: unknown): void {
  const firma = JSON.stringify(valore ?? null);
  const ultima = useRef(firma);
  useEffect(() => {
    if (ultima.current === firma) return;
    ultima.current = firma;
    void ricarica();
  }, [firma, ricarica]);
}
