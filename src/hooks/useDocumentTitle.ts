// ============================================================
// useDocumentTitle — titolo documento per pagina
// ============================================================

import { useEffect } from 'react';
import { APP_NAME } from '../utils/constants';
import { useInPannello } from '../components/scheda/contestoScheda';
import { useTitoloPaginaStore } from '../stores/titoloPaginaStore';

/** Imposta il titolo della scheda e ripristina il nome dell'app allo smontaggio. Nel pannello della scheda sopra il diario (R10-27) non
 *  tocca il titolo: la pagina è sempre quella del diario. Il titolo va anche alle briciole della Topbar (`titoloPaginaStore`). */
export function useDocumentTitle(title: string): void {
  const nelPannello = useInPannello();
  useEffect(() => {
    if (nelPannello) return;
    document.title = title ? `${title} — ${APP_NAME}` : APP_NAME;
    const { imposta, togli } = useTitoloPaginaStore.getState();
    imposta(title);
    return () => {
      document.title = APP_NAME;
      togli(title);
    };
  }, [title, nelPannello]);
}
