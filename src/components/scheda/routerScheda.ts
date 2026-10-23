// ============================================================
// routerScheda — gli hook del router, con lo stesso nome e le stesse firme, che dentro il pannello leggono la scheda e non l'indirizzo vero
// ============================================================
//
// Le pagine mostrate nel pannello sopra il diario (R10-27) importano da qui `useNavigate`, `useParams`, `useSearchParams` e `useLocation`
// al posto di react-router-dom. Fuori dal pannello fanno esattamente ciò che fanno quelli di react-router. Dentro, la «posizione» è
// l'indirizzo della scheda mostrata (che sta nel parametro `?pannello=`), così la pagina funziona come se fosse a tutto schermo ma ogni
// suo spostamento (un'altra infiltrazione, un'altra scheda) resta nel pannello e la pagina sotto non cambia.
// ============================================================

import { useCallback, useContext, useMemo } from 'react';
import {
  createSearchParams, useLocation as useLocationReale, useNavigate as useNavigateReale, useParams as useParamsReale,
  useSearchParams as useSearchParamsReale,
  type Location, type NavigateFunction, type NavigateOptions, type To,
} from 'react-router-dom';
import { SchedaCorrenteContext } from './contestoScheda';

/** La posizione della pagina: nel pannello, quella della scheda mostrata. */
export function useLocation(): Location {
  const reale = useLocationReale();
  const scheda = useContext(SchedaCorrenteContext);
  return scheda ? scheda.posizione : reale;
}

/** I parametri del percorso della pagina: nel pannello, quelli della scheda mostrata. */
export function useParams(): Readonly<Record<string, string | undefined>> {
  const reale = useParamsReale();
  const scheda = useContext(SchedaCorrenteContext);
  return scheda ? scheda.params : reale;
}

/** La funzione per spostarsi: nel pannello resta nel pannello (se la meta è una scheda) o lascia il diario (se è una pagina vera). */
export function useNavigate(): NavigateFunction {
  const reale = useNavigateReale();
  const scheda = useContext(SchedaCorrenteContext);
  const naviga = scheda?.naviga;
  const vai = useCallback((a: To | number, opzioni?: NavigateOptions) => {
    if (naviga) { naviga(a, opzioni); return; }
    if (typeof a === 'number') void reale(a); else void reale(a, opzioni);
  }, [naviga, reale]);
  return vai as NavigateFunction;
}

/** I parametri di ricerca della pagina e il modo di cambiarli: nel pannello quelli della scheda mostrata, cambiati restando nel pannello. */
export function useSearchParams(...argomenti: Parameters<typeof useSearchParamsReale>): ReturnType<typeof useSearchParamsReale> {
  const reale = useSearchParamsReale(...argomenti);
  const scheda = useContext(SchedaCorrenteContext);
  const pathname = scheda?.posizione.pathname;
  const search = scheda?.posizione.search;
  const naviga = scheda?.naviga;
  const params = useMemo(() => (scheda ? new URLSearchParams(search) : null), [scheda, search]);
  const imposta = useCallback<ReturnType<typeof useSearchParamsReale>[1]>((prossimo, opzioni) => {
    if (!naviga || !params || pathname === undefined) return;
    const nuovi = createSearchParams(typeof prossimo === 'function' ? prossimo(params) : prossimo);
    const testo = nuovi.toString();
    naviga({ pathname, search: testo ? `?${testo}` : '' }, opzioni);
  }, [naviga, params, pathname]);
  return params ? [params, imposta] : reale;
}
