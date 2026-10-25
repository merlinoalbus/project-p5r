// ============================================================
// AvvisoPartiteNonCaricate — la striscia «elenco delle partite non caricato» con «Riprova» (R12-01/4)
// ============================================================
//
// Se `/partite` non risponde (backend appena riavviato, rete instabile) le pagine lavorano come senza partita: la striscia lo dice a
// ogni schermata, finché la lettura non riesce, invece di lasciar credere che non ci sia alcuna partita. Una riga alta quanto un
// bersaglio touch, come `AvvisoNuovaVersione`, così l'intestazione resta entro il 30% dell'altezza anche sul telefono.
// ============================================================

import { usePartitaStore } from '../../stores/partitaStore';
import { AzioneRiprova } from '../shared/VistaErrore';

/** La striscia, visibile solo quando l'ultima lettura dell'elenco delle partite è fallita. */
export function AvvisoPartiteNonCaricate() {
  const errore = usePartitaStore((s) => s.errore);
  const caricamento = usePartitaStore((s) => s.caricamento);
  const carica = usePartitaStore((s) => s.carica);
  if (!errore) return null;
  return (
    <div className="flex items-center gap-3 px-3 py-1 lg:px-5 min-h-[44px] shrink-0 bg-bg-secondary border-b border-error testo-14" role="alert">
      <span className="flex-1 min-w-0 line-clamp-2 break-words leading-tight text-text">
        Partite non caricate: {errore}. Quel che vedi potrebbe non essere la tua partita.
      </span>
      <span className="shrink-0"><AzioneRiprova tono="secondario" inCorso={caricamento} onClick={() => { if (!caricamento) void carica(); }} /></span>
    </div>
  );
}
