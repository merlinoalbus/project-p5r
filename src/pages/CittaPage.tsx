import { urlMappa } from '../utils/navigazioneMappa';
// ============================================================
// CittaPage — la città: mappa globale di Tokyo navigabile (quartieri come passaggi) e piastrelle dei quartieri (Fase 8.1, mappe 13.4)
// ============================================================

import { Link, useNavigate } from 'react-router-dom';
import { getDungeons, getQuartieri } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { PageState } from '../components/shared/PageState';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { MiniaturaMappa } from '../components/guida/MiniaturaMappa';
import { MappaIncorporata } from '../components/mappe/MappaIncorporata';
import { MappaTokyo } from '../components/mappe/MappaTokyo';
import { usePartitaStore } from '../stores/partitaStore';
import { useSuggerimenti } from '../stores/suggerimentiStore';
import { classiSuggerito } from '../utils/suggerimenti';
import { TargaSuggerito } from '../components/shared/Suggerito';
import { soloPalazzi } from '../utils/palazzi';

export function CittaPage() {
  const navigate=useNavigate();
  const sugg = useSuggerimenti();
  useDocumentTitle('La città');
  const dati = useCarica(() => getQuartieri(), []);
  const attiva = usePartitaStore((s) => s.attiva);
  // I Palazzi servono alla mappa disegnata: portano la finestra in cui esistono, ed è quella a
  // decidere se compaiono. Senza partita non decide nulla e si vedono tutti. `soloPalazzi` tiene
  // fuori i Memento: non sono un luogo di Tokyo e non hanno un ingresso sulla mappa di viaggio.
  const dungeon = useCarica(async () => soloPalazzi(await getDungeons()), []);
  const q = dati.dati;
  return (
    <PageState isLoading={dati.caricamento && !q} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {q && (
        <div className="flex flex-col gap-4">
          <IntestazionePagina titolo="La città" sottotitolo="La mappa di Tokyo con i quartieri come passaggi: tocca un quartiere per aprirne la mappa con negozi, ristoranti, attività e Confidenti. Sotto, le schede dei quartieri con luoghi, orari e sblocchi." />
          {/* Tokyo disegnata con gli elementi originali del gioco, viva col calendario: i
              quartieri compaiono quando si sbloccano, i Palazzi quando esistono. Sotto resta il
              visore della planimetria, per chi vuole i pin e lo zoom. */}
          <MappaTokyo quartieri={q} dungeon={dungeon.dati ?? []} dataGioco={attiva?.dataGioco ?? null} />
          <MappaIncorporata onNaviga={(k,arrivo)=>{if(arrivo){navigate(urlMappa(k,arrivo));return;}const quartiere=q.find(v=>v.mappaChiave===k);navigate(quartiere?`/guida/mondo/quartiere/${encodeURIComponent(quartiere.chiave)}`:`/guida/mappe/${encodeURIComponent(k)}`);}} chiave="tokyo" altezza="max(420px, calc(100vh - 320px))" />
          <ul className="m-0 p-0 list-none grid gap-2 sm:grid-cols-2 xl:grid-cols-3" aria-label="Quartieri">
            {q.map((x) => (
              <li key={x.chiave}>
                <Link to={`/guida/mondo/quartiere/${encodeURIComponent(x.chiave)}`} className={`card card--cliccabile piastrella no-underline text-text flex gap-3 h-full ${classiSuggerito(sugg.evidenziato('quartieri', x.chiave))}`}>
                  <MiniaturaMappa chiave={x.mappaChiave ?? ''} etichetta={x.nome} larghezza={112} altezza={84} className="shrink-0" />
                  <span className="flex flex-col gap-1 min-w-0">
                  <span className="font-display uppercase text-[20px] leading-none">{x.nome}</span>
                  {sugg.evidenziato('quartieri', x.chiave) && <TargaSuggerito motivo={sugg.motivo('quartieri', x.chiave)} compatta />}
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
