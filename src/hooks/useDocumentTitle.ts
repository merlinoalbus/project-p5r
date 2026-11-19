// ============================================================
// useDocumentTitle — titolo documento per pagina
// ============================================================

import { useEffect } from 'react';
import { APP_NAME } from '../utils/constants';
import { useInPannello } from '../components/scheda/contestoScheda';
import { useTitoloPaginaStore } from '../stores/titoloPaginaStore';

/** Imposta il titolo della scheda e ripristina il nome dell'app allo smontaggio. Nel pannello della scheda sopra il diario (R10-27) non
 *  tocca il titolo: la pagina è sempre quella del diario. Il titolo va anche alle briciole della Topbar (`titoloPaginaStore`).
 *  Se un errore occupa la pagina (`useTitoloErrore`: «Non trovato» di una scheda che non c'è) il titolo della scheda del browser è il suo. */
export function useDocumentTitle(title: string): void {
  const nelPannello = useInPannello();
  const errore = useTitoloPaginaStore((s) => s.errore);
  useEffect(() => {
    if (nelPannello) return;
    const mostrato = errore ?? title;
    document.title = mostrato ? `${mostrato} — ${APP_NAME}` : APP_NAME;
    const { imposta, togli } = useTitoloPaginaStore.getState();
    imposta(title);
    return () => {
      document.title = APP_NAME;
      togli(title);
    };
  }, [title, nelPannello, errore]);
}

/**
 * Il titolo di un errore che occupa tutta la pagina (la scheda che non c'è, la route caduta): finché è montato, il titolo della scheda del
 * browser è «<errore> — <app>» e non quello generico della pagina. L'effetto del figlio gira prima di quello della pagina, che legge
 * l'errore dallo store (`useDocumentTitle`); allo smontaggio (un «Riprova» riuscito, un'altra pagina) l'errore si toglie e la pagina
 * riscrive il suo titolo. Una route caduta non ha la pagina sotto: il titolo lo scrive da sé. `null`: nessun errore. Nel pannello sopra il
 * diario non tocca niente (la pagina è quella del diario).
 */
export function useTitoloErrore(titolo: string | null): void {
  const nelPannello = useInPannello();
  useEffect(() => {
    if (nelPannello || titolo === null) return;
    const { impostaErrore } = useTitoloPaginaStore.getState();
    impostaErrore(titolo);
    document.title = `${titolo} — ${APP_NAME}`;
    return () => {
      // solo se è ancora il suo: un errore nuovo montato nel frattempo resta
      if (useTitoloPaginaStore.getState().errore === titolo) impostaErrore(null);
    };
  }, [titolo, nelPannello]);
}
