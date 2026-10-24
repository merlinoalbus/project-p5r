// ============================================================
// SchedaNelCassetto — la scheda completa del Confidente come seconda vista del cassetto della scheda «Confidenti» della partita
// ============================================================
//
// Progetto approvato dall'utente (2026-10-24, tavola 4 del canvas): le informazioni non portano fuori. La pagina del Confidente
// (`ConfidenteDettaglioPage`: abilità per rango, risposte di tutti i ranghi, regali, disponibilità e inviti, «Modifica informazioni») si
// mostra dentro il cassetto con lo stesso meccanismo del pannello sopra il diario (R10-27, `SchedaCorrenteContext`): la pagina legge la
// posizione «virtuale» della scheda al posto dell'indirizzo vero. I suoi spostamenti dentro la stessa scheda (`?informazioni=1`,
// `?requisiti=N`) restano nel cassetto; un collegamento verso un'altra pagina naviga davvero (e il cassetto si chiude con l'indirizzo).
// ============================================================

import { Suspense, useCallback, useMemo, useState, type MouseEvent } from 'react';
import { resolvePath, useNavigate, type NavigateOptions, type To } from 'react-router-dom';
import { SchedaCorrenteContext, type SchedaCorrente } from '../scheda/contestoScheda';
import { ConfidenteDettaglioPage } from '../scheda/pagineScheda';
import { Spinner } from '../shared/PageState';

interface Props {
  chiave: string;
  /** I parametri con cui aprire la scheda (es. `?requisiti=5` da «Correggi» dei requisiti). */
  searchIniziale?: string;
  /** Torna alla vista «Level up» del cassetto: la usa «Aggiorna il rango» della scheda, che fuori dal cassetto porta alla pagina dei
   *  Confidenti (dentro, quella funzione è già qui accanto). */
  onLevelUp: () => void;
}

/** La pagina del Confidente dentro il cassetto, con la sua posizione virtuale `/confidenti/<chiave>`. I collegamenti verso altre entità
 *  (la mappa del luogo, gli oggetti regalo nel catalogo) restano collegamenti veri: portano alla loro pagina, per scelta. */
export function SchedaNelCassetto({ chiave, searchIniziale = '', onLevelUp }: Props) {
  const navigate = useNavigate();
  const percorso = `/confidenti/${encodeURIComponent(chiave)}`;
  const [search, setSearch] = useState(searchIniziale);
  /** Dentro la stessa scheda cambia solo la posizione virtuale; verso un'altra pagina si naviga davvero. */
  const naviga = useCallback((a: To | number, opzioni?: NavigateOptions) => {
    if (typeof a === 'number') { void navigate(a); return; }
    const p = resolvePath(a, percorso);
    if (p.pathname === percorso) { setSearch(p.search); return; }
    void navigate(`${p.pathname}${p.search}${p.hash}`, opzioni);
  }, [navigate, percorso]);
  const corrente = useMemo<SchedaCorrente>(() => ({
    posizione: { pathname: percorso, search, hash: '', state: null, key: `${percorso}${search}` },
    params: { chiave },
    naviga,
  }), [percorso, search, chiave, naviga]);
  /** Un clic semplice su un collegamento alla scheda «Confidenti» della partita («Aggiorna il rango») torna al Level up del cassetto. */
  const intercetta = (e: MouseEvent<HTMLDivElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element).closest('a[href]');
    if (!a) return;
    const url = new URL(a.getAttribute('href') ?? '', window.location.origin);
    if (url.pathname === '/partita' && url.searchParams.get('scheda') === 'confidenti') { e.preventDefault(); onLevelUp(); }
  };
  return (
    <SchedaCorrenteContext.Provider value={corrente}>
      <div onClickCapture={intercetta}>
        <Suspense fallback={<div className="flex justify-center py-10"><Spinner size={36} /></div>}>
          <ConfidenteDettaglioPage.Componente />
        </Suspense>
      </div>
    </SchedaCorrenteContext.Provider>
  );
}
