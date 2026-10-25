// ============================================================
// useSchede — il ruolo «schede» completo (tablist, tab, tabpanel) per una fila di schede a selezione automatica (lotto C)
// ============================================================
//
// Nove pagine avevano `role="tablist"` e `role="tab"` con `aria-selected`, ma senza il resto del ruolo: nessun pannello
// (`tabpanel`) collegato, niente `aria-controls`, ogni scheda una fermata di Tab, nessuna freccia. Il modello completo era
// `AreeDelDedalo`; qui sta una volta sola, come vuole il ruolo (WAI-ARIA APG, «Tabs with automatic activation»):
//   - Tab entra sulla scheda aperta (le altre hanno `tabIndex=-1`: il «tabindex mobile») ed esce verso il pannello;
//   - ← e → passano alla scheda precedente o successiva (in giro), Inizio e Fine alla prima e all'ultima, e la aprono subito;
//   - ogni scheda ha `aria-controls` verso il suo pannello e il pannello `aria-labelledby` verso la sua scheda.
// Le pagine mostrano un solo pannello per volta (quello della scheda aperta): `pannello(chiave)` dà gli attributi del contenitore.
// Dentro una `FilaScorrevole` la scheda raggiunta con le frecce viene portata in vista dalla fila stessa (e dal fuoco).
// ============================================================

import { useId, type KeyboardEvent } from 'react';

interface Opzioni<K extends string> {
  /** Le chiavi delle schede, nell'ordine in cui compaiono. */
  chiavi: readonly K[];
  /** La scheda aperta; `null` (o una chiave che non c'è) quando nessuna lo è: allora Tab entra sulla prima. */
  attiva: K | null;
  /** Apre una scheda (dal tocco, dal clic o dalle frecce). */
  onScegli: (chiave: K) => void;
}

/** Attributi e gestori del ruolo «schede»: `lista` va sul contenitore `tablist`, `scheda(k)` su ogni pulsante, `pannello(k)` sul
 *  contenuto della scheda aperta. */
export function useSchede<K extends string>({ chiavi, attiva, onScegli }: Opzioni<K>) {
  const base = useId();
  const indice = (k: K) => chiavi.indexOf(k);
  const idScheda = (k: K) => `${base}-scheda-${indice(k)}`;
  const idPannello = (k: K) => `${base}-pannello-${indice(k)}`;
  const aperta = attiva !== null && chiavi.includes(attiva) ? attiva : null;
  /** La scheda che riceve il fuoco con Tab: l'aperta o, se nessuna lo è, la prima. */
  const conFuoco = aperta ?? chiavi[0] ?? null;

  /** Frecce, Inizio e Fine: solo quando il fuoco sta su una scheda di questa fila (non su un comando annidato). */
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (chiavi.length === 0 || e.altKey || e.ctrlKey || e.metaKey) return;
    const bersaglio = e.target as HTMLElement;
    if (bersaglio.getAttribute('role') !== 'tab' || !bersaglio.id.startsWith(`${base}-scheda-`)) return;
    const i = Number(bersaglio.id.slice(`${base}-scheda-`.length));
    const n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? chiavi.length - 1 : null;
    if (n === null || Number.isNaN(i)) return;
    e.preventDefault();
    const k = chiavi[(n + chiavi.length) % chiavi.length];
    onScegli(k);
    document.getElementById(idScheda(k))?.focus();
  };

  return {
    /** Sul contenitore della fila. */
    lista: { role: 'tablist' as const, onKeyDown },
    /** Su ogni pulsante della fila. */
    scheda: (k: K) => ({
      role: 'tab' as const,
      id: idScheda(k),
      'aria-selected': k === aperta,
      'aria-controls': idPannello(k),
      tabIndex: k === conFuoco ? 0 : -1,
      onClick: () => onScegli(k),
    }),
    /** Sul contenuto della scheda `k` (di solito l'aperta). */
    pannello: (k: K) => ({ role: 'tabpanel' as const, id: idPannello(k), 'aria-labelledby': idScheda(k) }),
    /** La scheda aperta, se c'è. */
    aperta,
  };
}
