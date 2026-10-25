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
  /** Solo visiva: non entra nelle regioni live della coda, perché chi la crea annuncia lui un testo più completo (lotto C:
   *  il cambio di rango delle Doti si annunciava due volte, dalla regione `status` della pagina e dal toast). */
  silenziosa?: boolean;
}

/** Opzioni di una notifica. */
export interface OpzioniNotifica {
  /** Vedi `Notification.silenziosa`. */
  silenziosa?: boolean;
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (type: NotificationType, message: string, duration?: number, opzioni?: OpzioniNotifica) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

let counter = 0;

/** Coda Zustand dei toast, con aggiunta e rimozione automatica. */
export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],

  addNotification: (type, message, duration = 4000, opzioni) => {
    const id = `notif-${++counter}-${Date.now()}`;
    const notification: Notification = { id, type, message, duration, createdAt: Date.now(), ...(opzioni?.silenziosa ? { silenziosa: true } : {}) };
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
export function notifica(type: NotificationType, message: string, duration?: number, opzioni?: OpzioniNotifica): void {
  useNotificationStore.getState().addNotification(type, message, duration, opzioni);
}
