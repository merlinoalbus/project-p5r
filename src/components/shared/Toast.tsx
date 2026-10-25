// ============================================================
// Toast — sistema di notifiche
// ============================================================

import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useShallow } from 'zustand/react/shallow';
import { useNotificationStore, type NotificationType } from '../../stores/notificationStore';
import { MARGINE, postoDellaCoda, type PostoCoda } from '../../utils/postoCoda';

const TOAST_BORDER: Record<NotificationType, string> = {
  success: 'border-l-success',
  error: 'border-l-error',
  warning: 'border-l-warning',
  info: 'border-l-info',
};

/** Il tipo detto a parole, davanti al messaggio, per chi non vede il colore del bordo. */
const TIPO_TESTO: Record<NotificationType, string> = {
  success: 'Fatto',
  error: 'Errore',
  warning: 'Attenzione',
  info: 'Avviso',
};

/** Rende e anima la coda globale delle notifiche temporanee.
 *
 * Sta in un portale su `body` (2026-10-01): il layout è `isolate`, un contesto di sovrapposizione suo, e dentro di lui lo
 * `z-[9999]` non bastava a stare sopra a quel che vive su `body` — il foglio dal basso del popup di una mappa, che la copriva.
 * Con un popup di spillo aperto la coda non lo copre (`postoDellaCoda`): sopra un foglio dal basso, di lato o sopra un popup
 * ancorato che scende nella sua zona. In basso coprirebbe i pulsanti («Riapri» subito dopo «Ottenuto»), in alto la barra della
 * mappa: dove va copre solo la mappa, per qualche secondo. */
export function ToastContainer() {
  const { notifications, removeNotification } = useNotificationStore(useShallow((s) => ({ notifications: s.notifications, removeNotification: s.removeNotification })));
  const coda = useRef<HTMLDivElement | null>(null);
  const [posto, setPosto] = useState<PostoCoda>({ bottom: null, aSinistra: false });
  const visibile = notifications.length > 0;

  // Si misura solo mentre ci sono notifiche: un popup può aprirsi, chiudersi o cambiare altezza mentre la coda è in vista. Le
  // mutazioni arrivano a raffica durante il trascinamento della mappa (lo stile del livello): si misura al più una volta per frame.
  // Un popup che cresce senza mutazioni (un testo che va a capo, un'immagine) lo segue il ResizeObserver sui popup stessi.
  useLayoutEffect(() => {
    if (!visibile) return;
    let frame = 0;
    const dimensioni = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => pianifica());
    // Si osservano solo i popup nuovi e si lasciano quelli spariti: ricollegarli tutti a ogni misura farebbe ripartire ogni volta
    // l'osservazione (che notifica da 0×0), cioè una misura a ogni frame finché la notifica è in vista (rilievo del validatore).
    const osservati = new Set<Element>();
    /**
     * Ricalcola il posto della coda (aggiornando lo stato solo se cambia) e allinea l'osservatore delle dimensioni
     * ai popup di spillo presenti adesso: osserva i nuovi, smette con quelli spariti.
     */
    const misura = () => {
      frame = 0;
      const nuovo = postoDellaCoda(coda.current);
      setPosto((prima) => (prima.bottom === nuovo.bottom && prima.aSinistra === nuovo.aSinistra ? prima : nuovo));
      if (!dimensioni) return;
      const presenti = new Set<Element>(document.querySelectorAll('.spillo-popup'));
      for (const f of osservati) if (!presenti.has(f)) { dimensioni.unobserve(f); osservati.delete(f); }
      for (const f of presenti) if (!osservati.has(f)) { dimensioni.observe(f); osservati.add(f); }
    };
    /** Chiede una misura al prossimo frame, se non ce n'è già una in attesa. */
    function pianifica() { if (!frame) frame = requestAnimationFrame(misura); }
    misura();
    const osservatore = new MutationObserver(pianifica);
    osservatore.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style'] });
    window.addEventListener('resize', pianifica);
    return () => { osservatore.disconnect(); dimensioni?.disconnect(); window.removeEventListener('resize', pianifica); if (frame) cancelAnimationFrame(frame); };
  }, [visibile]);

  const stile = { ...(posto.bottom !== null ? { bottom: posto.bottom } : {}), ...(posto.aSinistra ? { left: MARGINE, right: 'auto' } : {}) };
  // Lotto C (2026-10-25): le regioni live sono due, sorelle e sempre nel DOM (una regione che nasce insieme al suo testo spesso non
  // viene letta): `status` per le notifiche normali, che si annunciano a fine lettura, e `alert` per gli errori, che interrompono.
  // Prima l'`alert` dell'errore stava annidato nella regione `status`, e i lettori di schermo lo leggevano due volte o male. Le
  // regioni hanno solo il testo, col tipo davanti («Errore: …», il colore del bordo da solo non lo dice); la coda visiva resta una
  // sola, nell'ordine d'arrivo, fuori dalle regioni. Le notifiche `silenziose` stanno solo nella coda: chi le crea annuncia lui.
  const annunci = notifications.filter((n) => !n.silenziosa);
  return createPortal(
    <div>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="false">
        {annunci.filter((n) => n.type !== 'error').map((n) => <p key={n.id}>{`${TIPO_TESTO[n.type]}: ${n.message}`}</p>)}
      </div>
      <div className="sr-only" role="alert" aria-live="assertive" aria-atomic="false">
        {annunci.filter((n) => n.type === 'error').map((n) => <p key={n.id}>{`${TIPO_TESTO[n.type]}: ${n.message}`}</p>)}
      </div>
      {visibile && (
        <div ref={coda} className="coda-notifiche fixed bottom-20 lg:bottom-5 right-5 flex flex-col gap-2 z-[9999]" style={stile}>
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-md bg-surface border border-border shadow-[0_4px_12px_rgba(0,0,0,0.4)] min-w-[280px] max-w-[420px] animate-[toast-in_0.2s_ease-out] border-l-[3px] ${TOAST_BORDER[n.type]}`}
            >
              <span className="flex-1 testo-14"><span className="sr-only">{TIPO_TESTO[n.type]}: </span>{n.message}</span>
              <button
                type="button"
                className="touch bg-transparent border-none text-text-muted cursor-pointer testo-20 px-1 py-0 hover:text-text"
                onClick={() => removeNotification(n.id)}
                aria-label="Chiudi notifica"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
