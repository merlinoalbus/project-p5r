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
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (type: NotificationType, message: string, duration?: number) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

let counter = 0;

/** Durata (ms) di default per tipo; 0 = resta finché l'utente non la chiude con ×. Errori e avvisi non scompaiono da soli: chi
 *  guarda altrove nel momento sbagliato non deve credere che un salvataggio sia riuscito. Conferme e informazioni durano poco. */
const DURATA_PREDEFINITA: Record<NotificationType, number> = { success: 4000, info: 4000, error: 0, warning: 0 };

/** Coda Zustand dei toast, con aggiunta e rimozione automatica. */
export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],

  addNotification: (type, message, duration = DURATA_PREDEFINITA[type]) => {
    // la stessa notifica ancora a schermo non si ripete (un errore segnalato dal client HTTP e poi dal chiamante, o un gesto
    // ripetuto che fallisce di nuovo): resta quella già visibile
    if (get().notifications.some((n) => n.type === type && n.message === message)) return;
    const id = `notif-${++counter}-${Date.now()}`;
    const notification: Notification = { id, type, message, duration, createdAt: Date.now() };
    set((s) => ({ notifications: [...s.notifications, notification] }));

    if (duration > 0) {
      setTimeout(() => {
        set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }));
      }, duration);
    }
  },

  removeNotification: (id) =>
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),

  clearAll: () => set({ notifications: [] }),
}));

/** Scorciatoia imperativa per mostrare un toast fuori dai componenti. */
export function notifica(type: NotificationType, message: string, duration?: number): void {
  useNotificationStore.getState().addNotification(type, message, duration);
}
