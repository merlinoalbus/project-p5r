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
  /** Un gesto da fare dalla notifica, come pulsante (es. «Annulla» dopo aver incollato voci del Diario): premuto, la notifica si chiude. */
  azione?: AzioneNotifica;
}

/** Il pulsante d'azione di una notifica: il testo e che cosa fa. */
export interface AzioneNotifica {
  etichetta: string;
  onClick: () => void;
  /** Il nome per il lettore di schermo quando l'etichetta da sola è generica («Annulla» → «Annulla l'incolla di 3 voci»); comincia
   *  con l'etichetta, così il controllo vocale ritrova il pulsante dal testo che si vede (WCAG 2.5.3). */
  nomeAccessibile?: string;
  /** La scorciatoia da tastiera che fa lo stesso gesto, per `aria-keyshortcuts` e il suggerimento (es. `Control+Z`). */
  scorciatoia?: { aria: string; testo: string };
  /** Dove va il fuoco dopo il gesto, se era sul pulsante (che con la notifica sparisce): senza, chi usa la tastiera o un lettore di schermo
   *  si ritroverebbe in cima alla pagina (WCAG 2.4.3). Null = nessun posto adatto. */
  fuocoDopo?: () => HTMLElement | null;
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
  /** Vedi `Notification.azione`. */
  azione?: AzioneNotifica;
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (type: NotificationType, message: string, duration?: number, opzioni?: OpzioniNotifica) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  /** Chiude tutti gli errori e gli avvisi rimasti a schermo (quelli senza chiusura automatica); conferme e informazioni seguono il loro timer. */
  chiudiPersistenti: () => void;
  /** Ferma il conto alla rovescia di una notifica (puntatore sopra o fuoco dentro: WCAG 2.2.1), e lo fa ripartire da dove era. */
  pausa: (id: string) => void;
  riprendi: (id: string) => void;
}

let counter = 0;

/** Quante notifiche persistenti (errori e avvisi senza chiusura automatica) restano al massimo a schermo: oltre, la più vecchia cede il
 *  posto alla nuova. Con testi diversi (un errore per endpoint, una raffica di letture fallite) la coda non deve coprire il telefono. */
export const MAX_PERSISTENTI = 5;

/** Timer di chiusura automatica per notifica: serve a rinnovarlo quando la stessa conferma si ripete e ad annullarlo se si chiude a mano. */
const timer = new Map<string, ReturnType<typeof setTimeout>>();
/** Quando scade il timer di ogni notifica (per la pausa: quanto resta) e quanto restava a quelle in pausa. */
const scadenze = new Map<string, number>();
const inPausa = new Map<string, number>();

/** Annulla il timer di una notifica, se ne ha uno. */
function annullaTimer(id: string): void {
  const t = timer.get(id);
  if (t !== undefined) clearTimeout(t);
  timer.delete(id);
  scadenze.delete(id);
}

/** Durata (ms) di default per tipo; 0 = resta finché l'utente non la chiude con ×. Errori e avvisi non scompaiono da soli: chi
 *  guarda altrove nel momento sbagliato non deve credere che un salvataggio sia riuscito. Conferme e informazioni durano poco. */
const DURATA_PREDEFINITA: Record<NotificationType, number> = { success: 4000, info: 4000, error: 0, warning: 0 };

/** Fa partire (o riparte da capo) il conto alla rovescia che toglie la notifica `id` dopo `durata` ms. */
function programmaChiusura(set: (f: (s: NotificationState) => Partial<NotificationState>) => void, id: string, durata: number): void {
  annullaTimer(id);
  // in pausa (puntatore o fuoco sulla notifica) il conto riparte da capo quando la pausa finisce
  if (inPausa.has(id)) { inPausa.set(id, durata); return; }
  scadenze.set(id, Date.now() + durata);
  timer.set(id, setTimeout(() => {
    timer.delete(id);
    scadenze.delete(id);
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
    // una notifica con un gesto (es. «Annulla» di un incolla) non si fonde con una uguale: il gesto è di un'altra operazione
    const esistente = opzioni?.azione ? undefined : get().notifications.find((n) => n.type === type && n.message === message && !n.azione);
    if (esistente) {
      if (duration > 0 && (esistente.duration ?? 0) > 0) programmaChiusura(set, esistente.id, duration);
      return;
    }
    const id = `notif-${++counter}-${Date.now()}`;
    const notification: Notification = { id, type, message, duration, createdAt: Date.now(), ...(opzioni?.silenziosa ? { silenziosa: true } : {}), ...(opzioni?.collegamento ? { collegamento: opzioni.collegamento } : {}), ...(opzioni?.azione ? { azione: opzioni.azione } : {}) };
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
    inPausa.delete(id);
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }));
  },

  clearAll: () => {
    for (const id of [...timer.keys()]) annullaTimer(id);
    inPausa.clear();
    set({ notifications: [] });
  },

  chiudiPersistenti: () => set((s) => ({ notifications: s.notifications.filter((n) => (n.duration ?? 0) > 0) })),

  pausa: (id) => {
    if (inPausa.has(id)) return;
    const scade = scadenze.get(id);
    // le persistenti (senza timer) non hanno niente da fermare
    if (scade === undefined) return;
    annullaTimer(id);
    inPausa.set(id, Math.max(0, scade - Date.now()));
  },

  riprendi: (id) => {
    const resta = inPausa.get(id);
    if (resta === undefined) return;
    inPausa.delete(id);
    if (!get().notifications.some((n) => n.id === id)) return;
    // almeno un attimo per leggerla dopo che il puntatore se n'è andato
    programmaChiusura(set, id, Math.max(resta, 1500));
  },
}));

/** Scorciatoia imperativa per mostrare un toast fuori dai componenti. */
export function notifica(type: NotificationType, message: string, duration?: number, opzioni?: OpzioniNotifica): void {
  useNotificationStore.getState().addNotification(type, message, duration, opzioni);
}
