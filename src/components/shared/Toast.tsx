// ============================================================
// Toast — sistema di notifiche
// ============================================================

import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useShallow } from 'zustand/react/shallow';
import { useNotificationStore, type Notification, type NotificationType } from '../../stores/notificationStore';
import { MARGINE, postoDellaCoda, type PostoCoda } from '../../utils/postoCoda';
import { PulsanteVisivo } from './PulsanteVisivo';
import { IconaAzione } from './IconaAzione';

/** Il tipo detto a parole, davanti al messaggio, per chi non vede il colore del bordo. */
const TIPO_TESTO: Record<NotificationType, string> = {
  success: 'Fatto',
  error: 'Errore',
  warning: 'Attenzione',
  info: 'Avviso',
};

const TOAST_BORDER: Record<NotificationType, string> = {
  success: 'border-l-success',
  error: 'border-l-error',
  warning: 'border-l-warning',
  info: 'border-l-info',
};

/** Rende e anima la coda globale delle notifiche temporanee.
 *
 * Sta in un portale su `body` (2026-10-01): il layout è `isolate`, un contesto di sovrapposizione suo, e dentro di lui lo
 * `z-[9999]` non bastava a stare sopra a quel che vive su `body` — il foglio dal basso del popup di una mappa, che la copriva.
 * Con un popup di spillo aperto la coda non lo copre (`postoDellaCoda`): sopra un foglio dal basso, di lato o sopra un popup
 * ancorato che scende nella sua zona. In basso coprirebbe i pulsanti («Riapri» subito dopo «Ottenuto»), in alto la barra della
 * mappa: dove va copre solo la mappa, per qualche secondo. */
export function ToastContainer() {
  const { notifications, removeNotification, chiudiPersistenti } = useNotificationStore(useShallow((s) => ({ notifications: s.notifications, removeNotification: s.removeNotification, chiudiPersistenti: s.chiudiPersistenti })));
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
  // Due regioni live **distinte e sempre nel DOM**, anche a coda vuota (una regione che nasce insieme al suo testo spesso non
  // viene letta), mai una dentro l'altra: `status` (cortese) per conferme e informazioni, `alert` (assertiva) per errori e avvisi.
  // Prima l'`alert` stava dentro lo `status` e poteva essere annunciato due volte o per niente.
  // le «silenziose» (lotto C) stanno solo nella coda visiva, fuori dalle regioni: chi le crea annuncia da sé lo stesso fatto
  const silenziose = notifications.filter((n) => n.silenziosa);
  const comuni = notifications.filter((n) => n.type !== 'error' && !n.silenziosa);
  const errori = notifications.filter((n) => n.type === 'error' && !n.silenziosa);
  // errori e avvisi non si chiudono da soli: con più di uno a schermo un solo gesto li chiude tutti
  const persistenti = notifications.filter((n) => (n.duration ?? 0) <= 0).length;
  return createPortal(
    <div>
      {/* tanti errori ancora aperti non devono uscire dallo schermo: la coda scorre dentro se stessa (più bassa sul telefono, dove lo schermo è poco) */}
      <div ref={coda} className="coda-notifiche fixed bottom-20 lg:bottom-5 right-5 flex flex-col z-[9999] max-h-[45vh] md:max-h-[70vh] overflow-y-auto overscroll-contain" style={stile}>
        {silenziose.length > 0 && <div className="flex flex-col gap-2 mb-2">{silenziose.map((n) => <Notifica key={n.id} n={n} chiudi={removeNotification} />)}</div>}
        <div role="status" aria-live="polite" className="flex flex-col gap-2">
          {comuni.map((n) => <Notifica key={n.id} n={n} chiudi={removeNotification} />)}
        </div>
        <div role="alert" className={`flex flex-col gap-2${errori.length > 0 && comuni.length > 0 ? ' mt-2' : ''}`}>
          {errori.map((n) => <Notifica key={n.id} n={n} chiudi={removeNotification} />)}
        </div>
        {persistenti > 1 && (
          <PulsanteVisivo tono="secondario" compatto className="self-end mt-2 shrink-0" icona={<IconaAzione chiave="chiudi" dimensione={20} />}
            titolo={`Chiudi tutti (${persistenti})`} onClick={chiudiPersistenti} />
        )}
      </div>
    </div>,
    document.body,
  );
}

/** Una notifica della coda, con la × per chiuderla: gli errori e gli avvisi restano finché non si chiudono. */
function Notifica({ n, chiudi }: { n: Notification; chiudi: (id: string) => void }) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-md bg-surface border border-border shadow-[0_4px_12px_rgba(0,0,0,0.4)] min-w-[280px] max-w-[420px] animate-[toast-in_0.2s_ease-out] motion-reduce:animate-none border-l-[3px] ${TOAST_BORDER[n.type]}`}
    >
      <span className="flex-1 testo-14"><span className="sr-only">{TIPO_TESTO[n.type]}: </span>{n.message}</span>
      <button
        className="touch bg-transparent border-none text-text-muted cursor-pointer testo-20 px-1 py-0 hover:text-text"
        onClick={() => chiudi(n.id)}
        aria-label="Chiudi notifica"
      >
        ×
      </button>
    </div>
  );
}
