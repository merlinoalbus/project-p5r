// ============================================================
// NotaPuntiDote — le Doti si segnano a mano: che cosa fa il «+» di Film, Libri e Videogiochi
// ============================================================
//
// Le pagine di Film, Libri e Videogiochi mostrano «Effetto: Coraggio ♪♪♪» e un pulsante «+ Visione».
// Scelta dell'utente (2026-09-30): «i punti Doti Sociali li sposto solo io manualmente e non
// automaticamente». Il «+» segna che l'hai visto, letto o giocato; il conseguimento **dice** le Doti che
// il gioco dà con un avviso («Da segnare nelle Doti: Coraggio +5»), e le segni tu nella scheda Doti.
// Questa riga lo dice una volta per pagina, perché chi vede «Effetto: Coraggio ♪♪♪» non si aspetti
// di trovarle già segnate.
// ============================================================

import { Link } from 'react-router-dom';
import { IconaAzione } from './IconaAzione';

/** L'avviso, una volta per pagina: che cosa fa il «+» e dove si segnano le Doti.
 *
 * `dettaglio` aggiunge quel che è specifico della pagina — per i film, che la prima visione e le
 * successive valgono diverso. */
export function NotaPuntiDote({ cosa, dettaglio }: { cosa: string; dettaglio?: string }) {
  return (
    <p className="m-0 flex items-start gap-2 rounded-md border border-border bg-bg-secondary px-3 py-2 text-[13px] text-text-secondary" role="note">
      <span className="mt-0.5 shrink-0"><IconaAzione chiave="note" dimensione={18} /></span>
      <span>
        Qui segni <strong>{cosa}</strong>. Le Doti te le ricorda un avviso: le segni tu nella{' '}
        <Link to="/partita?scheda=doti">scheda Doti</Link>.
        {dettaglio ? ` ${dettaglio}` : ''}
      </span>
    </p>
  );
}
