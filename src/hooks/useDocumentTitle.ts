// ============================================================
// useDocumentTitle — titolo documento per pagina
// ============================================================

import { useEffect } from 'react';
import { APP_NAME } from '../utils/constants';
import { useInPannello } from '../components/scheda/contestoScheda';

/** Imposta il titolo della scheda e ripristina il nome dell'app allo smontaggio. Nel pannello della scheda sopra il diario (R10-27) non
 *  tocca il titolo: la pagina è sempre quella del diario. */
export function useDocumentTitle(title: string): void {
  const nelPannello = useInPannello();
  useEffect(() => {
    if (nelPannello) return;
    document.title = title ? `${title} — ${APP_NAME}` : APP_NAME;
    return () => {
      document.title = APP_NAME;
    };
  }, [title, nelPannello]);
}
