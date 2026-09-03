// ============================================================
// NotFoundPage — 404 applicativo
// ============================================================

import { Link } from 'react-router-dom';
import { EmptyState } from '../components/shared/PageState';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

/** Pagina mostrata per le route non riconosciute. */
export function NotFoundPage() {
  useDocumentTitle('Pagina non trovata');
  return (
    <EmptyState
      title="Pagina non trovata"
      hint="L'indirizzo richiesto non corrisponde a nessuna sezione dell'app."
      action={
        <Link to="/home" className="btn btn-primary no-underline">
          Torna alla home
        </Link>
      }
    />
  );
}
