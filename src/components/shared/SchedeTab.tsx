// ============================================================
// SchedeTab — la fila di schede con il ruolo completo (tablist, tab, tabpanel) per le schede della Partita (L6-01)
// ============================================================
//
// Le tre file di schede della Partita (viste del Confidente, progressi, categorie di libri/film/giochi) avevano `role="tab"` e
// `aria-selected` ma non le frecce, il «tabindex mobile» né Inizio e Fine. Qui il ruolo sta una volta sola, sul modello di
// `AreeDelDedalo`, appoggiandosi a `useSchede` (WAI-ARIA APG, «Tabs with automatic activation»): Tab entra sulla scheda aperta e
// esce verso il pannello, ← e → passano alla precedente e alla successiva (in giro), Inizio e Fine alla prima e all'ultima.
//
// Il componente non disegna nulla di suo: il contenitore della fila prende `className`, ogni scheda la disegna chi lo usa (`scheda`,
// con gli attributi da spargere sul pulsante) e il pannello è disegnato da `children`, che riceve gli attributi del pannello di una
// chiave. Esce un frammento (fila + contenuto, fratelli come prima): il DOM visibile è identico a quello senza il ruolo.
// Serve un componente e non il solo hook perché alcune viste disegnano le schede in una funzione chiamata a condizione, dove un
// hook non si può usare.
// ============================================================

import { Fragment, type ReactNode } from 'react';
import { useSchede } from '../../hooks/useSchede';

/** Gli attributi del pulsante di una scheda (ruolo, id, selezione, pannello collegato, tabindex mobile, apertura al tocco). */
export interface AttributiScheda {
  role: 'tab';
  id: string;
  'aria-selected': boolean;
  'aria-controls': string;
  tabIndex: number;
  onClick: () => void;
}

/** Gli attributi del contenitore del contenuto di una scheda (ruolo, id, scheda che lo nomina). */
export interface AttributiPannello {
  role: 'tabpanel';
  id: string;
  'aria-labelledby': string;
}

interface Props<K extends string> {
  /** Le chiavi delle schede, nell'ordine in cui compaiono. */
  chiavi: readonly K[];
  /** La scheda aperta. */
  attiva: K;
  /** Apre una scheda (dal tocco, dal clic o dalle frecce). */
  onScegli: (chiave: K) => void;
  /** Il nome della fila di schede, per il lettore di schermo. */
  etichetta: string;
  /** Le classi del contenitore della fila (la stessa di prima del ruolo). */
  className?: string;
  /** Disegna la scheda `chiave`: `attributi` va sparso sul suo pulsante (la `key` di React la mette il componente). */
  scheda: (chiave: K, attributi: AttributiScheda) => ReactNode;
  /** Il contenuto: `pannello(k)` dà gli attributi del contenitore del contenuto della scheda `k` (di solito l'aperta). */
  children: (pannello: (chiave: K) => AttributiPannello) => ReactNode;
}

/** La fila di schede con frecce, Inizio e Fine, e il contenuto collegato: tutto in un frammento (la fila, poi `children`). */
export function SchedeTab<K extends string>({ chiavi, attiva, onScegli, etichetta, className, scheda, children }: Props<K>) {
  const schede = useSchede<K>({ chiavi, attiva, onScegli });
  return (
    <>
      <div {...schede.lista} aria-label={etichetta} className={className}>
        {chiavi.map((k) => <Fragment key={k}>{scheda(k, schede.scheda(k))}</Fragment>)}
      </div>
      {children(schede.pannello)}
    </>
  );
}
