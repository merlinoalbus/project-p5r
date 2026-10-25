// ============================================================
// PulsanteStandby — l'interruttore «Schermo sempre acceso» della barra superiore (L12, R12-03)
// ============================================================
//
// Sta nella `Topbar`, che si vede su ogni pagina e a ogni larghezza: durante la partita si accende e si spegne con un tocco, senza andare
// nelle Impostazioni. È un interruttore (`aria-pressed`), con la preferenza ricordata sul dispositivo (`preferenzeStore`). Non compare dove
// il browser non ha lo Screen Wake Lock (vedi `useBloccoStandby`): un comando che non può funzionare non si mostra. Il blocco vero lo
// installa `useBloccoStandby` in `MainLayout`; qui c'è solo l'interruttore, uguale nelle due istanze (preparazione e rilascio).
// ============================================================

import { usePreferenzeStore } from '../../stores/preferenzeStore';
import { bloccoStandbySupportato } from '../../hooks/useBloccoStandby';
import { notifica } from '../../stores/notificationStore';
import { IconSun } from '../shared/icons';

/** Interruttore del blocco dello standby; nullo se il browser non lo supporta. */
export function PulsanteStandby() {
  const attivo = usePreferenzeStore((s) => s.bloccoStandby);
  const imposta = usePreferenzeStore((s) => s.impostaBloccoStandby);
  if (!bloccoStandbySupportato()) return null;
  return (
    <button
      type="button"
      className={`touch flex shrink-0 cursor-pointer items-center justify-center rounded-md border-none ${attivo ? 'bg-primary-bg text-primary-testo' : 'bg-transparent text-text-secondary hover:text-text'}`}
      aria-label="Schermo sempre acceso"
      aria-pressed={attivo}
      title={attivo ? 'Schermo sempre acceso: attivo' : 'Schermo sempre acceso: spento'}
      onClick={() => {
        imposta(!attivo);
        // la regione `status` dei toast annuncia il cambio anche a chi non vede il colore dell'icona
        notifica('info', attivo ? 'Lo schermo può spegnersi da solo.' : 'Lo schermo resta acceso mentre giochi.', 2500);
      }}
    >
      <IconSun size={22} />
    </button>
  );
}
