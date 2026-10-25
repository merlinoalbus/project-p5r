// ============================================================
// AggiornaApp — il pulsante «Aggiorna» che non perde le bozze (UI-ASSET-01, strato S5)
// ============================================================
//
// Ricaricare la pagina porta all'app nuova ma perde ciò che sta solo in memoria. Se ci sono bozze non salvate (`utils/bozzeSporche`),
// il pulsante apre prima una finestra (DialogoConferma) che nomina le schede sporche e chiede «Annulla» o «Aggiorna comunque»; senza bozze ricarica subito.
// L'app non si ricarica mai da sola.
// ============================================================

import { useState, type ReactNode } from 'react';
import { DialogoConferma } from './DialogoConferma';
import { PulsanteVisivo } from './PulsanteVisivo';
import { bozzeSporche, disattivaGuardiaBozze } from '../../utils/bozzeSporche';

interface Props {
  className?: string;
  children?: ReactNode;
  /** Con l'icona il pulsante è un `PulsanteVisivo` primario (la vista d'errore); senza, un pulsante di testo con `className` (la striscia). */
  icona?: ReactNode;
}

/** Il pulsante che ricarica l'app dopo aver chiesto conferma se ci sono modifiche non salvate. */
export function PulsanteAggiornaApp({ className = 'btn btn-primary btn-sm touch', children = 'Aggiorna', icona }: Props) {
  const [elenco, setElenco] = useState<string[] | null>(null);
  const aggiorna = () => {
    const sporche = bozzeSporche();
    if (sporche.length) { setElenco(sporche); return; }
    window.location.reload();
  };
  return (
    <>
      {icona
        ? <PulsanteVisivo tono="primario" compatto icona={icona} titolo={children} onClick={aggiorna} />
        : <button type="button" className={className} onClick={aggiorna}>{children}</button>}
      <DialogoConferma
        aperta={elenco !== null}
        titolo="Modifiche non salvate"
        testo={`Hai modifiche non salvate in: ${(elenco ?? []).join(', ')}. Se aggiorni ora si perdono.`}
        etichetta="Aggiorna comunque"
        icona="ricalcola"
        onAnnulla={() => setElenco(null)}
        onConferma={() => { disattivaGuardiaBozze(); window.location.reload(); }}
      />
    </>
  );
}
