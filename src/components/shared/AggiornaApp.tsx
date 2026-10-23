// ============================================================
// AggiornaApp — il pulsante «Aggiorna» che non perde le bozze (UI-ASSET-01, strato S5)
// ============================================================
//
// Ricaricare la pagina porta all'app nuova ma perde ciò che sta solo in memoria. Se ci sono bozze non salvate (`utils/bozzeSporche`),
// il pulsante apre prima una finestra che nomina le schede sporche e chiede «Resta qui» o «Aggiorna comunque»; senza bozze ricarica subito.
// L'app non si ricarica mai da sola.
// ============================================================

import { useState, type ReactNode } from 'react';
import { Modal } from './Modal';
import { bozzeSporche } from '../../utils/bozzeSporche';

interface Props {
  className?: string;
  children?: ReactNode;
}

/** Il pulsante che ricarica l'app dopo aver chiesto conferma se ci sono modifiche non salvate. */
export function PulsanteAggiornaApp({ className = 'btn btn-primary btn-sm touch', children = 'Aggiorna' }: Props) {
  const [elenco, setElenco] = useState<string[] | null>(null);
  const aggiorna = () => {
    const sporche = bozzeSporche();
    if (sporche.length) { setElenco(sporche); return; }
    window.location.reload();
  };
  return (
    <>
      <button type="button" className={className} onClick={aggiorna}>{children}</button>
      <Modal
        aperta={elenco !== null}
        titolo="Modifiche non salvate"
        onChiudi={() => setElenco(null)}
        azioni={(
          <>
            <button type="button" className="btn btn-secondary touch" onClick={() => setElenco(null)}>Resta qui</button>
            <button type="button" className="btn btn-primary touch" onClick={() => window.location.reload()}>Aggiorna comunque</button>
          </>
        )}
      >
        <p className="m-0">
          Hai modifiche non salvate in: {(elenco ?? []).join(', ')}. Se aggiorni ora si perdono.
        </p>
      </Modal>
    </>
  );
}
