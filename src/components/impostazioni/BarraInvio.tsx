// ============================================================
// BarraInvio — l'avanzamento dell'invio di un file al server (pacchetto di gioco, ripristino)
// ============================================================
//
// Un file da centinaia di MB su una linea lenta impiega minuti: senza niente a schermo l'utente non
// sa se sta andando avanti o se è tutto fermo, e chiude la finestra. Qui si vede la percentuale con i
// MB già partiti; quando il corpo è tutto inviato la barra diventa indeterminata, perché da quel
// momento il tempo lo consuma il server (lettura del pacchetto, copia di sicurezza, migrazioni) e
// nessuno può più dire «a che punto è».
// ============================================================

import { byteTesto } from '../../utils/byte';
import type { AvanzamentoInvio } from '../../services/api';

export function BarraInvio({ avanzamento, etichetta, elaborazione }: {
  avanzamento: AvanzamentoInvio | null;
  /** Che cosa si sta mandando: «Invio del pacchetto». */
  etichetta: string;
  /** Che cosa fa il server dopo: «Lettura del pacchetto in corso». */
  elaborazione: string;
}) {
  if (!avanzamento) return null;
  const { percentuale, byteInviati, byteTotali, inviato } = avanzamento;
  const testo = inviato ? `${elaborazione}…` : `${etichetta}… ${percentuale}% · ${byteTesto(byteInviati)} di ${byteTesto(byteTotali)}`;
  return (
    <div className="flex flex-col gap-1" role="status" aria-live="polite">
      <span className="text-[13px] text-text-secondary">{testo}</span>
      <progress
        className="barra-invio"
        aria-label={inviato ? elaborazione : etichetta}
        {...(inviato ? {} : { value: percentuale, max: 100 })}
      />
    </div>
  );
}
