// ============================================================
// HomePage — cruscotto iniziale
// ============================================================

import { useEffect, useState } from 'react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getHealth } from '../services/api';
import type { HealthDto } from '../types';

/** Pagina iniziale: stato del sistema e accessi rapidi. */
export function HomePage() {
  useDocumentTitle('Home');
  const [health, setHealth] = useState<HealthDto | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch((e: unknown) => setErrore(e instanceof Error ? e.message : 'Errore sconosciuto'));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="m-0 text-2xl font-bold">Compagno di gioco — Persona 5 Royal</h1>
      <div className="flex gap-3 flex-wrap">
        <div className="kpi-tile">
          <span className="kpi-label">Backend</span>
          <span className="kpi-value" data-testid="stato-backend">
            {errore ? 'non raggiungibile' : health ? (health.status === 'ok' ? 'operativo' : 'degradato') : '…'}
          </span>
        </div>
        <div className="kpi-tile">
          <span className="kpi-label">Schema DB</span>
          <span className="kpi-value">{health?.db.userVersion ?? '—'}</span>
        </div>
      </div>
    </div>
  );
}
