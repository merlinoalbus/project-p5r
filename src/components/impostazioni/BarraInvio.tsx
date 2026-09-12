// ============================================================
// BarraInvio — un lavoro lungo è in corso sul server
// ============================================================
//
// Leggere un pacchetto da centinaia di MB, salvare la copia di sicurezza, applicare le migrazioni: sono
// minuti in cui l'utente non deve chiedersi se si è bloccato tutto. Non c'è una percentuale da mostrare —
// il lavoro è del backend e non riferisce quanto manca — quindi la barra scorre invece di riempirsi, e
// il testo dice che cosa sta facendo.
// ============================================================

import type { AvanzamentoInvio } from '../../services/api';

export function BarraInvio({ avanzamento, etichetta, elaborazione }: {
  avanzamento: AvanzamentoInvio | null;
  /** Che cosa si sta mandando (resta per i casi con percentuale). */
  etichetta: string;
  /** Che cosa fa il server: «Il server sta leggendo il file dalla cartella d'appoggio». */
  elaborazione: string;
}) {
  if (!avanzamento) return null;
  const { percentuale, inviato } = avanzamento;
  const testo = inviato ? `${elaborazione}…` : `${etichetta}… ${percentuale}%`;
  return (
    <div className="flex flex-col gap-1" role="status" aria-live="polite" aria-busy="true">
      <span className="text-[13px] text-text-secondary">{testo}</span>
      <div className="barra-invio" role="progressbar" aria-label={inviato ? elaborazione : etichetta} />
    </div>
  );
}
