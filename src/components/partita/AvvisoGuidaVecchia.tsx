// ============================================================
// AvvisoGuidaVecchia — la guida del giorno mostrata è l'ultima lettura buona, perché la rete (o il server) non risponde
// ============================================================

import { AzioneRiprova } from '../shared/VistaErrore';
import type { CausaErrore } from '../../hooks/useCarica';

interface Props {
  /** L'ora (ms) in cui la guida mostrata fu letta. */
  alle: number;
  /** Perché la guida è vecchia: «Senza rete» solo se offline, altrimenti il server non risponde. */
  causa: CausaErrore;
  onRiprova: () => void;
}

/** Una riga sopra la guida: dice da quando è la lettura e offre «Riprova». Con la rete di nuovo, la rilettura la sostituisce e la riga sparisce. */
export function AvvisoGuidaVecchia({ alle, causa, onRiprova }: Props) {
  const ora = new Date(alle).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  return (
    <div role="status" className="flex flex-wrap items-center gap-2 mb-1.5 rounded-md border border-border px-3 py-1.5 testo-13 text-text-secondary">
      <span>{causa === 'offline' ? 'Senza rete' : 'Il server non risponde'}: guida letta alle {ora}.</span>
      <AzioneRiprova tono="secondario" onClick={onRiprova} />
    </div>
  );
}
