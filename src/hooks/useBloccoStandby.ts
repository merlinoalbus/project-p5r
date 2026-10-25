// ============================================================
// useBloccoStandby — tiene lo schermo acceso mentre si gioca (L12, R12-03)
// ============================================================
//
// Con la preferenza `bloccoStandby` accesa chiede al browser lo Screen Wake Lock: telefono e tablet restano accesi senza che si tocchi
// lo schermo, e non si torna alla schermata di blocco nel mezzo di un dialogo. Il browser lo toglie da sé quando la pagina passa in
// secondo piano (cambio di scheda, schermo spento a mano, altra app): al ritorno in primo piano (`visibilitychange`) lo si chiede di nuovo.
//
// Silenzioso dove non c'è: l'API esiste solo in contesto sicuro (HTTPS o localhost) e non su tutti i browser; la richiesta può inoltre
// essere rifiutata (risparmio energetico, permesso negato dal sistema). In nessuno dei casi si mostra un errore: il pulsante della
// Topbar non compare se l'API manca (`bloccoStandbySupportato`), e un rifiuto lascia lo schermo com'è, per poi riprovare al ritorno in
// primo piano. Da montare una volta, nella cornice dell'app (`MainLayout`), così vale per ogni pagina.
// ============================================================

import { useEffect } from 'react';
import { usePreferenzeStore } from '../stores/preferenzeStore';

/** Il browser offre lo Screen Wake Lock? (Falso fuori da un contesto sicuro, e nei browser che non lo hanno: il pulsante non compare.) */
export function bloccoStandbySupportato(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator && typeof navigator.wakeLock?.request === 'function';
}

/** Installa il blocco dello standby finché la preferenza è accesa (e lo toglie allo spegnimento o allo smontaggio). */
export function useBloccoStandby(): void {
  const attivo = usePreferenzeStore((s) => s.bloccoStandby);

  useEffect(() => {
    if (!attivo || !bloccoStandbySupportato()) return;
    let sentinella: WakeLockSentinel | null = null;
    let chiuso = false;
    let richiestaInCorso = false;

    /** Chiede il blocco se serve: pagina visibile, nessun blocco già tenuto, nessuna richiesta in volo (visibilitychange può ripetersi). */
    const richiedi = async () => {
      if (chiuso || richiestaInCorso || sentinella || document.visibilityState !== 'visible') return;
      richiestaInCorso = true;
      try {
        const ottenuta = await navigator.wakeLock.request('screen');
        if (chiuso) {
          // la preferenza è stata spenta mentre la richiesta era in volo: il blocco appena arrivato non serve più
          await ottenuta.release().catch(() => undefined);
          return;
        }
        sentinella = ottenuta;
        // tolto dal browser (pagina in secondo piano): si azzera, così il ritorno in primo piano lo richiede
        ottenuta.addEventListener('release', () => {
          if (sentinella === ottenuta) sentinella = null;
        });
      } catch {
        // rifiutato (risparmio energetico, sistema): silenzio, si riprova al prossimo ritorno in primo piano
      } finally {
        richiestaInCorso = false;
      }
    };

    const alCambioVisibilita = () => {
      if (document.visibilityState === 'visible') void richiedi();
    };
    document.addEventListener('visibilitychange', alCambioVisibilita);
    void richiedi();

    return () => {
      chiuso = true;
      document.removeEventListener('visibilitychange', alCambioVisibilita);
      const daRilasciare = sentinella;
      sentinella = null;
      if (daRilasciare) void daRilasciare.release().catch(() => undefined);
    };
  }, [attivo]);
}
