// ============================================================
// NotFoundPage — 404 applicativo
// ============================================================

import { EmptyState } from '../components/shared/PageState';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { CollegamentoVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione } from '../components/shared/IconaAzione';

/** Pagina mostrata per le route non riconosciute. */
export function NotFoundPage() {
  useDocumentTitle('Pagina non trovata');
  return (
    <EmptyState
      illustrazione="vuoto-partita-senza-testo"
      title="Pagina non trovata"
      hint="L'indirizzo richiesto non corrisponde a nessuna sezione dell'app."
      action={
        <CollegamentoVisivo tono="primario" icona={<IconaAzione chiave="indietro" dimensione={22} />} titolo="Torna alla home" to="/home" />
      }
    />
  );
}
