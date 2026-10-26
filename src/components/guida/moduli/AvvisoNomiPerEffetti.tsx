// ============================================================
// AvvisoNomiPerEffetti — il caricamento dei nomi (quartieri, attività, Confidenti) è fallito: lo dice una volta per modulo, con «Riprova»
// ============================================================
//
// Ondata 5, lotto F (rilievo della revisione): prima l'avviso compariva dentro ogni editor d'effetto e, nell'attività, anche accanto al
// selettore del Confidente: due avvisi uguali, ognuno con il suo «Riprova». Ora c'è un posto solo, in cima al modulo; senza errore non
// c'è niente.

import { PulsanteVisivo } from '../../shared/PulsanteVisivo';
import { IconaAzione } from '../../shared/IconaAzione';

/** L'avviso del caricamento fallito, con «Riprova» (bersaglio touch del pulsante condiviso); nulla se non c'è errore. */
export function AvvisoNomiPerEffetti({ errore, riprova, disabilitato }: { errore?: string | null; riprova?: () => void; disabilitato?: boolean }) {
  if (!errore) return null;
  return (
    <p role="alert" className="m-0 flex flex-wrap items-center gap-2 testo-13 text-error-testo">
      {errore}
      {riprova && <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="riprova" dimensione={20} />} titolo="Riprova" disabled={disabilitato} onClick={riprova} />}
    </p>
  );
}
