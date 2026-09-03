// ============================================================
// Toast — sistema di notifiche
// ============================================================

import { useNotificationStore, type NotificationType } from '../../stores/notificationStore';

const TOAST_BORDER: Record<NotificationType, string> = {
  success: 'border-l-success',
  error: 'border-l-error',
  warning: 'border-l-warning',
  info: 'border-l-info',
};

/** Rende e anima la coda globale delle notifiche temporanee. */
export function ToastContainer() {
  const { notifications, removeNotification } = useNotificationStore();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-5 right-5 flex flex-col gap-2 z-[9999]">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-md bg-surface border border-border shadow-[0_4px_12px_rgba(0,0,0,0.4)] min-w-[280px] max-w-[420px] animate-[toast-in_0.2s_ease-out] border-l-[3px] ${TOAST_BORDER[n.type]}`}
        >
          <span className="flex-1 text-[14px]">{n.message}</span>
          <button
            className="touch bg-transparent border-none text-text-muted cursor-pointer text-[20px] px-1 py-0 hover:text-text"
            onClick={() => removeNotification(n.id)}
            aria-label="Chiudi notifica"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
