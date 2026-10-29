// ============================================================
// useRicercaDiario — la lettura della ricerca nel Diario (`GET /compendio/percorso-ricerca`), per testo, tipo e partita (2026-10-29)
// ============================================================

import { useEffect, useState } from 'react';
import { cercaVociDiario } from '../services/api';
import { testoSufficiente } from '../utils/ricercaDiario';
import type { TipoAzione } from '../../shared/effettiAzione';
import type { RicercaDiarioDto } from '../../shared/ricercaDiario';

interface StatoLettura { chiave: string; dati: RicercaDiarioDto | null; errore: string | null }

/** Ciò che la vista dei risultati legge. */
export interface RicercaDiario {
  /** I risultati da mostrare (quelli di prima finché arrivano i nuovi); null senza ricerca valida o prima della prima risposta. */
  dati: RicercaDiarioDto | null;
  /** Vero mentre la risposta della ricerca attuale non è ancora arrivata. */
  inCorso: boolean;
  /** Il messaggio della ricerca attuale non riuscita, o null. */
  errore: string | null;
  /** Vero se c'è da cercare: un testo di almeno due caratteri o un tipo (un testo più corto non conta). */
  valida: boolean;
  riprova: () => void;
}

/**
 * La ricerca dal server. Parte solo con un testo di almeno due caratteri o con un tipo; mentre arriva la risposta nuova restano i risultati
 * di prima (`inCorso` vero), così la vista non lampeggia a ogni lettera. Una risposta arrivata tardi, per una ricerca già cambiata, si scarta.
 */
export function useRicercaDiario(q: string, tipo: TipoAzione | null, partitaId: number | null): RicercaDiario {
  // un testo troppo corto non si cerca (con il tipo scelto valgono tutte le voci di quel tipo): la stessa regola del server
  const testo = testoSufficiente(q) ? q.trim() : '';
  const valida = testo !== '' || tipo !== null;
  const chiave = valida ? JSON.stringify([testo, tipo, partitaId]) : null;
  const [stato, setStato] = useState<StatoLettura | null>(null);
  const [tentativo, setTentativo] = useState(0);
  useEffect(() => {
    if (!valida) return;
    let attivo = true;
    const k = JSON.stringify([testo, tipo, partitaId]);
    cercaVociDiario(testo, tipo ?? undefined, partitaId ?? undefined)
      .then((dati) => { if (attivo) setStato({ chiave: k, dati, errore: null }); })
      .catch((e: unknown) => { if (attivo) setStato({ chiave: k, dati: null, errore: e instanceof Error ? e.message : 'Ricerca non riuscita.' }); });
    return () => { attivo = false; };
  }, [valida, testo, tipo, partitaId, tentativo]);
  const inCorso = chiave !== null && stato?.chiave !== chiave;
  return {
    dati: chiave === null ? null : stato?.dati ?? null,
    inCorso,
    errore: chiave !== null && !inCorso ? stato?.errore ?? null : null,
    valida,
    riprova: () => setTentativo((t) => t + 1),
  };
}
