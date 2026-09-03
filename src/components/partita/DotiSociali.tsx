// ============================================================
// DotiSociali — le 5 doti con pulsanti grandi +1/−1 (uso da tablet in gioco)
// ============================================================

import { useState } from 'react';
import { aggiornaDote, getDoti } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { PageState } from '../shared/PageState';

interface Props {
  partitaId: number;
}

/** Elenco delle Doti sociali con incremento/decremento immediato. */
export function DotiSociali({ partitaId }: Props) {
  const { dati, caricamento, errore, ricarica, imposta } = useCarica(() => getDoti(partitaId), [partitaId]);
  const [occupata, setOccupata] = useState<string | null>(null);

  const modifica = async (chiave: string, delta: number) => {
    if (!dati) return;
    setOccupata(chiave);
    try {
      const agg = await aggiornaDote(partitaId, chiave, { delta });
      imposta(dati.map((d) => (d.chiave === chiave ? agg : d)));
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.');
    } finally {
      setOccupata(null);
    }
  };

  return (
    <PageState isLoading={caricamento} error={errore} onRetry={() => void ricarica()}>
      <ul className="m-0 p-0 list-none grid gap-2 grid-cols-1 md:grid-cols-2">
        {dati?.map((d) => (
          <li key={d.chiave} className="card flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[12px] uppercase tracking-wide text-text-muted">{d.nome}</div>
              <div className="text-3xl font-black tabular-nums">{d.punti}</div>
            </div>
            <button type="button" className="btn btn-secondary w-14 text-xl" disabled={occupata === d.chiave || d.punti === 0} onClick={() => void modifica(d.chiave, -1)} aria-label={`Togli un punto a ${d.nome}`}>−</button>
            <button type="button" className="btn btn-primary w-14 text-xl" disabled={occupata === d.chiave} onClick={() => void modifica(d.chiave, 1)} aria-label={`Aggiungi un punto a ${d.nome}`}>+</button>
          </li>
        ))}
      </ul>
    </PageState>
  );
}
