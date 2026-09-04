// ============================================================
// CittaPage — la città: mappa globale di Tokyo navigabile (quartieri come passaggi) e piastrelle dei quartieri (Fase 8.1, mappe 13.4)
// ============================================================

import { Link } from 'react-router-dom';
import { getQuartieri } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { PageState } from '../components/shared/PageState';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { MiniaturaMappa } from '../components/guida/MiniaturaMappa';
import { MappaIncorporata } from '../components/mappe/MappaIncorporata';

export function CittaPage() {
  useDocumentTitle('La città');
  const dati = useCarica(() => getQuartieri(), []);
  const q = dati.dati;
  return (
    <PageState isLoading={dati.caricamento && !q} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {q && (
        <div className="flex flex-col gap-4">
          <IntestazionePagina titolo="La città" sottotitolo="La mappa di Tokyo con i quartieri come passaggi: tocca un quartiere per aprirne la mappa con negozi, ristoranti, attività e Confidenti. Sotto, le schede dei quartieri con luoghi, orari e sblocchi." />
          <MappaIncorporata chiave="tokyo" altezza="max(520px, calc(100vh - 260px))" />
          <ul className="m-0 p-0 list-none grid gap-2 sm:grid-cols-2 xl:grid-cols-3" aria-label="Quartieri">
            {q.map((x) => (
              <li key={x.chiave}>
                <Link to={`/guida/citta/${x.chiave}`} className="card card--cliccabile piastrella no-underline text-text flex gap-3 h-full">
                  <MiniaturaMappa chiave={`citta-${x.chiave}`} etichetta={x.nome} larghezza={112} altezza={84} className="shrink-0" />
                  <span className="flex flex-col gap-1 min-w-0">
                  <span className="font-display uppercase text-[20px] leading-none">{x.nome}</span>
                  <span className="text-[12px] text-text-secondary">{x.luoghi} {x.luoghi === 1 ? 'luogo' : 'luoghi'}{x.verificati < x.luoghi ? ` · ${x.luoghi - x.verificati} da fonte secondaria` : ''}</span>
                  {x.sblocco && <span className="text-[12px] text-text-muted">Sblocco: {x.sblocco}</span>}
                  {x.descrizione && <span className="text-[12px] text-text-secondary line-clamp-2">{x.descrizione}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </PageState>
  );
}
