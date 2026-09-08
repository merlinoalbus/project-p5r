// ============================================================
// NotaPuntiDote — dove si prendono davvero i punti di una Dote
// ============================================================
//
// Le pagine di Film, Libri e Videogiochi mostrano «Effetto: Coraggio ♪♪♪» e, subito sotto, un
// pulsante «+ Visione». Chi lo preme cinque volte si aspetta cinque avanzamenti **e i punti**, e
// invece i punti non arrivano: nel codice ci sono soltanto tre posti che li toccano — i pulsanti
// della pagina Doti, la risposta giusta a una domanda in classe, e la spunta di un'azione nella
// guida del giorno. Il «+» di queste pagine registra che l'hai visto, e nient'altro.
//
// Non è una svista di una pagina: sono **due tracciamenti che non si parlano**, e non si parlano in
// nessuna delle due direzioni — spuntare l'azione nella guida dà i punti ma non fa avanzare le
// visioni del film. Unirli è una modifica di modello che va decisa, non improvvisata: applicare i
// punti anche da qui, senza toglierli di là, li conterebbe due volte in una partita vera.
//
// Finché quella decisione non è presa, la cosa peggiore è **lasciar credere** che i punti arrivino.
// Questa riga dice come stanno le cose e dove andare, che è quanto una guida può fare.
// ============================================================

import { Link } from 'react-router-dom';
import { IconaAzione } from './IconaAzione';

/** L'avviso, una volta per pagina: dove si prendono i punti, e che cosa fa invece il «+».
 *
 * `dettaglio` aggiunge quel che è specifico della pagina — per i film, che la prima visione e le
 * successive valgono diverso — perché è proprio quel dettaglio a far pensare che il conto lo tenga
 * l'app. */
export function NotaPuntiDote({ cosa, dettaglio }: { cosa: string; dettaglio?: string }) {
  return (
    <p className="m-0 flex items-start gap-2 rounded-md border border-border bg-bg-secondary px-3 py-2 text-[13px] text-text-secondary" role="note">
      <span className="mt-0.5 shrink-0"><IconaAzione chiave="note" dimensione={18} /></span>
      <span>
        Qui segni <strong>{cosa}</strong>, non i punti: le Doti si alzano spuntando l’azione nella{' '}
        <Link to="/guida/percorso">guida giorno per giorno</Link>, o a mano dalla{' '}
        <Link to="/partita?scheda=doti">scheda Doti</Link>.
        {dettaglio ? ` ${dettaglio}` : ''}
      </span>
    </p>
  );
}
