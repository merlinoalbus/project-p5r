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

import { Suspense, useCallback, useMemo, useState } from 'react';
import { resolvePath, useNavigate, type NavigateOptions, type To } from 'react-router-dom';
import { SchedaCorrenteContext, type SchedaCorrente } from '../scheda/contestoScheda';
import { ConfidenteDettaglioPage } from '../scheda/pagineScheda';
import { Spinner } from '../shared/PageState';

interface Props {
  chiave: string;
  /** I parametri con cui aprire la scheda (es. `?requisiti=5` da «Correggi» dei requisiti). */
  searchIniziale?: string;
}

/** La pagina del Confidente dentro il cassetto, con la sua posizione virtuale `/confidenti/<chiave>`. */
export function SchedaNelCassetto({ chiave, searchIniziale = '' }: Props) {
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
  return (
    <SchedaCorrenteContext.Provider value={corrente}>
      <Suspense fallback={<div className="flex justify-center py-10"><Spinner size={36} /></div>}>
        <ConfidenteDettaglioPage.Componente />
      </Suspense>
    </SchedaCorrenteContext.Provider>
  );
}
