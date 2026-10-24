// ============================================================
// useDettaglioConfidente — la scheda del compendio (dialoghi, abilità, regali) di UN Confidente, letta quando serve e tenuta in memoria
// ============================================================
//
// Il pannello dei Confidenti della partita mostra le risposte migliori, la prossima abilità e i regali del Confidente scelto: sono dati
// del compendio (`GET /compendio/confidenti/:chiave`), non della partita. Si leggono solo per il Confidente selezionato e si ricordano
// in memoria: tornare su uno già visto non rifà la richiesta. Le richieste in corso sono condivise (due componenti che chiedono lo
// stesso Confidente fanno una sola richiesta). `svuotaDettagliConfidenti` si chiama all'apertura della scheda: le correzioni fatte
// altrove (dialoghi, abilità, regali) si rileggono al rientro, mai restano vecchie fino al ricaricamento della pagina.
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import { getConfidenteDettaglio } from '../../services/api';
import type { ConfidenteDettaglioDto } from '../../types';

const pronti = new Map<string, ConfidenteDettaglioDto>();
const inCorso = new Map<string, Promise<ConfidenteDettaglioDto>>();

/** Dimentica tutto quel che è in memoria (le richieste già partite finiscono, ma il loro esito non viene più conservato). */
export function svuotaDettagliConfidenti(): void {
  pronti.clear();
  inCorso.clear();
}

/** Legge il dettaglio di `chiave` (una sola richiesta per chiave finché non è in memoria). */
function leggi(chiave: string): Promise<ConfidenteDettaglioDto> {
  const esistente = inCorso.get(chiave);
  if (esistente) return esistente;
  const richiesta = getConfidenteDettaglio(chiave).then((d) => {
    // solo se questa richiesta è ancora quella attesa: dopo uno svuotamento il suo esito sarebbe vecchio
    if (inCorso.get(chiave) === richiesta) pronti.set(chiave, d);
    return d;
  }).finally(() => {
    if (inCorso.get(chiave) === richiesta) inCorso.delete(chiave);
  });
  inCorso.set(chiave, richiesta);
  return richiesta;
}

interface Stato {
  dati: ConfidenteDettaglioDto | null;
  caricamento: boolean;
  errore: string | null;
  /** Rilegge dal server (dopo un errore). */
  riprova: () => void;
}

/** Il dettaglio del Confidente `chiave`: dalla memoria se già letto, altrimenti lo legge; `chiave` nulla = niente da leggere. */
export function useDettaglioConfidente(chiave: string | null): Stato {
  const [esito, setEsito] = useState<{ chiave: string; dati: ConfidenteDettaglioDto | null; errore: string | null } | null>(null);
  const [tentativo, setTentativo] = useState(0);

  useEffect(() => {
    if (!chiave || pronti.has(chiave)) return;
    let annullato = false;
    leggi(chiave)
      .then((d) => { if (!annullato) setEsito({ chiave, dati: d, errore: null }); })
      .catch((err: unknown) => { if (!annullato) setEsito({ chiave, dati: null, errore: err instanceof Error ? err.message : 'Dettaglio non caricato.' }); });
    return () => { annullato = true; };
  }, [chiave, tentativo]);

  const riprova = useCallback(() => {
    setEsito(null);
    setTentativo((t) => t + 1);
  }, []);

  if (!chiave) return { dati: null, caricamento: false, errore: null, riprova };
  const inMemoria = pronti.get(chiave);
  if (inMemoria) return { dati: inMemoria, caricamento: false, errore: null, riprova };
  if (esito && esito.chiave === chiave) return { dati: esito.dati, caricamento: false, errore: esito.errore, riprova };
  return { dati: null, caricamento: true, errore: null, riprova };
}
