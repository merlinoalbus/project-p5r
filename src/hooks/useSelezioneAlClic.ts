// ============================================================
// useSelezioneAlClic — la selezione delle voci di un giorno del Diario col mouse: clic, Ctrl+clic, Maiusc+clic (appunti del Diario)
// ============================================================
//
// Col dito niente: su tablet e telefono si seleziona dal menu della voce («Seleziona»). Un clic sui comandi della riga è dei comandi; un
// doppio clic (per una parola del testo) rimette la selezione di prima; un clic che chiude una selezione di testo resta al testo. Dopo un
// clic semplice che seleziona la prima voce, la barra delle voci selezionate aspetta il possibile secondo clic (`ATTESA_DOPPIO_CLIC`),
// così non lampeggia per niente (rilievo del revisore UX, giro 3).
// ============================================================

import { useEffect, useRef, useState } from 'react';
import type { SelezioneRiga } from '../components/guida/MenuVoce';
import type { useSelezioneVoci } from './useSelezioneVoci';
import type { useAppuntiDiarioStore } from '../stores/appuntiDiarioStore';

/** Quanto si aspetta, dopo un clic che seleziona la prima voce, il secondo clic di un doppio clic (di solito entro 200–300 ms) prima di
 *  mostrare la barra delle voci selezionate. */
const ATTESA_DOPPIO_CLIC = 400;

/** I comandi dentro una riga: il clic lì è loro, non seleziona la voce. Il menu a tendina della voce (C9) sta in un portale ma i suoi clic
 *  risalgono nell'albero di React fino alla riga: anche il suo fondo (bordo, spazi fra le voci) è un comando, non la riga. */
const INTERATTIVI = 'a, button, input, label, select, textarea, summary, details, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"], [role="tab"], [role="menu"], [role="menuitem"], [role="menuitemcheckbox"], [role="dialog"], [contenteditable=""], [contenteditable="true"]';

interface Ingressi {
  /** La selezione delle voci del giorno (`useSelezioneVoci`). */
  sel: ReturnType<typeof useSelezioneVoci>;
  /** Senza selezione al clic (rilascio, scelta a caselle): le righe non hanno stato né gestori. */
  spenta: boolean;
  /** Le voci tagliate negli appunti, per il segno del taglio sulla riga. */
  taglio: ReturnType<typeof useAppuntiDiarioStore.getState>['taglio'];
  giorno: string;
  /** Il clic semplice seleziona (pagina del Diario); altrimenti solo Ctrl+clic e Maiusc+clic (scheda «Oggi»). */
  selezioneAlClic: boolean;
}

/** La selezione di ogni riga (`selezioneDi`) e quante voci selezionate mostrano la barra e l'annuncio (`selezionateAVista`, zero durante
 *  l'attesa del doppio clic). */
export function useSelezioneAlClic({ sel, spenta, taglio, giorno, selezioneAlClic }: Ingressi) {
  // il puntatore dell'ultimo gesto sulle righe: col mouse il clic seleziona, col dito no (su tablet e telefono si seleziona dal menu)
  const puntatore = useRef('mouse');
  /** La selezione prima dell'ultimo clic semplice: un doppio clic (per una parola del testo) la rimette, così non resta la barra delle voci. */
  const primaDelClic = useRef<string[] | null>(null);
  /** Vero subito dopo un clic semplice che ha selezionato la prima voce: finché non si sa se è un doppio clic (per una parola del testo) la
   *  barra delle voci e il loro annuncio non compaiono, così non lampeggiano per niente (rilievo del revisore UX, giro 3). Solo dal nulla:
   *  con una selezione già a schermo la barra resta e dice subito il numero vero, che è quello su cui agiscono i suoi comandi. */
  const [attesaDoppioClic, setAttesaDoppioClic] = useState(false);
  const timerDoppioClic = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fineAttesaDoppioClic = () => { if (timerDoppioClic.current) { clearTimeout(timerDoppioClic.current); timerDoppioClic.current = null; } setAttesaDoppioClic(false); };
  useEffect(() => () => { if (timerDoppioClic.current) clearTimeout(timerDoppioClic.current); }, []);
  /** Quante voci selezionate mostrano la barra e l'annuncio (zero durante l'attesa del doppio clic). */
  const selezionateAVista = attesaDoppioClic ? 0 : sel.uid.length;
  /** La selezione di una riga: stato, segno del taglio e gestori del clic (clic, Ctrl+clic, Maiusc+clic). */
  const selezioneDi = (uid: string): SelezioneRiga | undefined => (spenta ? undefined : {
    selezionata: sel.insieme.has(uid),
    inTaglio: !!taglio && taglio.giorno === giorno && taglio.uid.includes(uid),
    gestori: {
      onPointerDown: (e) => { puntatore.current = e.pointerType || 'mouse'; },
      // Maiusc+clic estenderebbe la selezione del testo: col mouse sulla riga (non sui suoi comandi) seleziona le voci
      onMouseDown: (e) => { if (e.shiftKey && puntatore.current === 'mouse' && !(e.target as Element).closest(INTERATTIVI)) e.preventDefault(); },
      onClick: (e) => {
        // tocco e penna: niente (il menu della voce); un clic da tastiera (detail 0) è dei comandi
        if (puntatore.current !== 'mouse' || e.button !== 0 || e.detail === 0 || (e.target as Element).closest(INTERATTIVI)) return;
        // doppio (o triplo) clic: è per selezionare una parola (o la riga) del testo; la selezione che il primo clic aveva cambiato torna com'era
        if (e.detail > 1) {
          const prima = primaDelClic.current;
          primaDelClic.current = null;
          if (prima) sel.imposta(prima);
          fineAttesaDoppioClic();
          return;
        }
        primaDelClic.current = null;
        fineAttesaDoppioClic();
        // un clic che chiude una selezione di testo resta al testo
        if (window.getSelection()?.toString()) return;
        if (e.shiftKey) sel.intervallo(uid);
        else if (e.ctrlKey || e.metaKey) sel.alterna(uid);
        else if (selezioneAlClic) {
          primaDelClic.current = [...sel.uid];
          sel.sostituisci(uid);
          if (primaDelClic.current.length === 0) {
            setAttesaDoppioClic(true);
            timerDoppioClic.current = setTimeout(() => { timerDoppioClic.current = null; setAttesaDoppioClic(false); }, ATTESA_DOPPIO_CLIC);
          }
        }
      },
    },
  });
  return { selezionateAVista, selezioneDi };
}
