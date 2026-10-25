// ============================================================
// Notification Store — notifiche toast
// ============================================================

import { create } from 'zustand';

/** Livello visivo e semantico di una notifica temporanea. */
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

/** Messaggio temporaneo mostrato dal sistema di toast. */
export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
  createdAt: number;
  /** Solo nella coda visiva, non nelle regioni live: chi la crea annuncia da sé lo stesso fatto in un testo più completo (lotto C, es.
   *  il cambio di rango delle Doti), così il lettore di schermo non lo sente due volte. */
  silenziosa?: boolean;
  /** Un collegamento a una pagina dell'app, mostrato come pulsante nella notifica (es. dal passaggio alla sera al giorno con le decisioni ancora aperte). */
  collegamento?: CollegamentoNotifica;
}

/** Dove porta il pulsante di una notifica: un percorso interno dell'app (react-router). */
export interface CollegamentoNotifica {
  etichetta: string;
  verso: string;
}

/** Opzioni di una notifica. */
export interface OpzioniNotifica {
  /** Vedi `Notification.silenziosa`. */
  silenziosa?: boolean;
  /** Vedi `Notification.collegamento`. */
  collegamento?: CollegamentoNotifica;
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (type: NotificationType, message: string, duration?: number, opzioni?: OpzioniNotifica) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  /** Chiude tutti gli errori e gli avvisi rimasti a schermo (quelli senza chiusura automatica); conferme e informazioni seguono il loro timer. */
  chiudiPersistenti: () => void;
}

let counter = 0;

/** Quante notifiche persistenti (errori e avvisi senza chiusura automatica) restano al massimo a schermo: oltre, la più vecchia cede il
 *  posto alla nuova. Con testi diversi (un errore per endpoint, una raffica di letture fallite) la coda non deve coprire il telefono. */
export const MAX_PERSISTENTI = 5;

/** Timer di chiusura automatica per notifica: serve a rinnovarlo quando la stessa conferma si ripete e ad annullarlo se si chiude a mano. */
const timer = new Map<string, ReturnType<typeof setTimeout>>();

/** Annulla il timer di una notifica, se ne ha uno. */
function annullaTimer(id: string): void {
  const t = timer.get(id);
  if (t !== undefined) clearTimeout(t);
  timer.delete(id);
}

/** Durata (ms) di default per tipo; 0 = resta finché l'utente non la chiude con ×. Errori e avvisi non scompaiono da soli: chi
 *  guarda altrove nel momento sbagliato non deve credere che un salvataggio sia riuscito. Conferme e informazioni durano poco. */
const DURATA_PREDEFINITA: Record<NotificationType, number> = { success: 4000, info: 4000, error: 0, warning: 0 };

/** Fa partire (o riparte da capo) il conto alla rovescia che toglie la notifica `id` dopo `durata` ms. */
function programmaChiusura(set: (f: (s: NotificationState) => Partial<NotificationState>) => void, id: string, durata: number): void {
  annullaTimer(id);
  timer.set(id, setTimeout(() => {
    timer.delete(id);
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }));
  }, durata));
}

/** Coda Zustand dei toast, con aggiunta e rimozione automatica. */
export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],

  addNotification: (type, message, duration = DURATA_PREDEFINITA[type], opzioni) => {
    // la stessa notifica ancora a schermo non si ripete (un errore segnalato dal client HTTP e poi dal chiamante, o un gesto
    // ripetuto che fallisce di nuovo): resta quella già visibile. Se però ha una chiusura automatica (una conferma ripetuta, es. «+»
    // alla stessa Dote) se ne rinnova il timer: la seconda conferma non deve sparire insieme alla prima
    const esistente = get().notifications.find((n) => n.type === type && n.message === message);
    if (esistente) {
      if (duration > 0 && (esistente.duration ?? 0) > 0) programmaChiusura(set, esistente.id, duration);
      return;
    }
    const id = `notif-${++counter}-${Date.now()}`;
    const notification: Notification = { id, type, message, duration, createdAt: Date.now(), ...(opzioni?.silenziosa ? { silenziosa: true } : {}), ...(opzioni?.collegamento ? { collegamento: opzioni.collegamento } : {}) };
    set((s) => {
      let notifications = [...s.notifications, notification];
      if (duration <= 0) {
        // tetto alle persistenti: oltre `MAX_PERSISTENTI` si toglie la più vecchia (le temporanee non contano)
        const persistenti = notifications.filter((n) => (n.duration ?? 0) <= 0);
        const inEccesso = new Set(persistenti.slice(0, Math.max(0, persistenti.length - MAX_PERSISTENTI)).map((n) => n.id));
        notifications = notifications.filter((n) => !inEccesso.has(n.id));
      }
      return { notifications };
    });

    if (duration > 0) programmaChiusura(set, id, duration);
  },

  removeNotification: (id) => {
    annullaTimer(id);
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }));
  },

  clearAll: () => {
    for (const id of [...timer.keys()]) annullaTimer(id);
    set({ notifications: [] });
  },

  chiudiPersistenti: () => set((s) => ({ notifications: s.notifications.filter((n) => (n.duration ?? 0) > 0) })),
}));

/** Scorciatoia imperativa per mostrare un toast fuori dai componenti. */
export function notifica(type: NotificationType, message: string, duration?: number, opzioni?: OpzioniNotifica): void {
  useNotificationStore.getState().addNotification(type, message, duration, opzioni);
}
