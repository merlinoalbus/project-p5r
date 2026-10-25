// ============================================================
// AvvisoNuovaVersione — la striscia «nuova versione dell'app» (UI-ASSET-01, strato S4)
// ============================================================
//
// Una sola riga fra l'intestazione e il contenuto, alta quanto un bersaglio touch: così l'intestazione resta ben sotto il 30% dell'altezza
// anche sul telefono. Non ricarica da sola: «Aggiorna» passa dal controllo delle bozze non salvate (`PulsanteAggiornaApp`).
// ============================================================

import { useVersioneStore } from '../../stores/versioneStore';
import { PulsanteAggiornaApp } from '../shared/AggiornaApp';
import { IconaAzione } from '../shared/IconaAzione';

/** La striscia, visibile solo quando sul server c'è un'app più nuova o una pagina non si può più caricare. */
export function AvvisoNuovaVersione() {
  const motivo = useVersioneStore((s) => (s.nuovaVersione ? s.motivo : null));
  if (!motivo) return null;
  return (
    <div className="flex items-center gap-3 px-3 py-1 lg:px-5 min-h-[44px] shrink-0 bg-bg-secondary border-b border-warning testo-14" role="status">
      <span className="flex-1 min-w-0 line-clamp-2 break-words leading-tight text-text">
        {motivo === 'chunk'
          ? "L'app è stata aggiornata: questa pagina non si apre finché non aggiorni."
          : "È disponibile una nuova versione dell'app."}
      </span>
      <span className="shrink-0"><PulsanteAggiornaApp icona={<IconaAzione chiave="ricalcola" dimensione={20} />}>Aggiorna</PulsanteAggiornaApp></span>
    </div>
  );
}
