// ============================================================
// CittaPage — quartieri di Tokyo con i luoghi catalogati (Fase 8.1)
// ============================================================

import { Link } from 'react-router-dom';
import { getQuartieri } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { PageState } from '../components/shared/PageState';

export function CittaPage() {
  useDocumentTitle('La città');
  const dati = useCarica(() => getQuartieri(), []);
  const q = dati.dati;
  return (
    <PageState isLoading={dati.caricamento && !q} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {q && (
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="m-0 text-2xl font-bold">La città</h1>
            <p className="m-0 mt-1 text-[13px] text-text-secondary">Quartieri di Tokyo con negozi, ristoranti, attività, Confidenti e punti di interesse: cosa offre ogni luogo, quando è aperto e da quando è disponibile.</p>
          </div>
          <ul className="m-0 p-0 list-none grid gap-2 sm:grid-cols-2 xl:grid-cols-3" aria-label="Quartieri">
            {q.map((x) => (
              <li key={x.chiave}>
                <Link to={`/guida/citta/${x.chiave}`} className="card card--cliccabile no-underline text-text flex flex-col gap-1 h-full">
                  <strong className="text-[15px]">{x.nome}</strong>
                  <span className="text-[12px] text-text-secondary">{x.luoghi} {x.luoghi === 1 ? 'luogo' : 'luoghi'}{x.verificati < x.luoghi ? ` · ${x.luoghi - x.verificati} da fonte secondaria` : ''}</span>
                  {x.sblocco && <span className="text-[12px] text-text-muted">Sblocco: {x.sblocco}</span>}
                  {x.descrizione && <span className="text-[12px] text-text-secondary line-clamp-2">{x.descrizione}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </PageState>
  );
}
