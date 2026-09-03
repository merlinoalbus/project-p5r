// ============================================================
// useDocumentTitle — titolo documento per pagina
// ============================================================

import { useEffect } from 'react';
import { APP_NAME } from '../utils/constants';

/** Imposta il titolo della scheda e ripristina il nome dell'app allo smontaggio. */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title ? `${title} — ${APP_NAME}` : APP_NAME;
    return () => {
      document.title = APP_NAME;
    };
  }, [title]);
}
