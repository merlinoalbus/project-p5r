// ============================================================
// bozzeSporche — il registro in memoria delle bozze non salvate (UI-ASSET-01, strato S5)
// ============================================================
//
// Un form con modifiche non salvate si segnala con `useBozzaSporca`. Finché ce n'è almeno una:
// - `beforeunload` chiede conferma prima di chiudere o ricaricare la scheda del browser;
// - «Aggiorna» (striscia «nuova versione», pagina d'errore, schermata «Ricarica app») nomina le schede sporche e chiede conferma.
// Le bozze vivono solo in memoria: se la pagina viene davvero ricaricata si perdono (la persistenza in sessionStorage non c'è,
// cambierebbe il comportamento dei form ed è una decisione dell'utente).
// ============================================================

import { useEffect, useId } from 'react';

/** chiave → etichetta mostrata all'utente. */
const sporche = new Map<string, string>();

const guardia = (e: BeforeUnloadEvent) => {
  if (sporche.size) { e.preventDefault(); e.returnValue = ''; }
};
let guardiaAttiva = false;

/**
 * Toglie la guardia `beforeunload`: si chiama subito prima di un `reload()` già confermato dall'utente (nostra finestra «Aggiorna comunque»),
 * così il browser non chiede una seconda conferma. Una bozza segnalata dopo la riattiva.
 */
export function disattivaGuardiaBozze(): void {
  if (!guardiaAttiva) return;
  window.removeEventListener('beforeunload', guardia);
  guardiaAttiva = false;
}

/**
 * Segnala che il form ha modifiche non salvate (`sporca`) e lo toglie dal registro quando si salva, si annulla o si smonta.
 * `chiave` identifica il form; due istanze con la stessa chiave non si pestano i piedi (si aggiunge un id per istanza).
 */
export function useBozzaSporca(chiave: string, etichetta: string, sporca: boolean): void {
  const istanza = useId();
  useEffect(() => {
    if (!sporca) return;
    const k = `${chiave}#${istanza}`;
    sporche.set(k, etichetta);
    if (!guardiaAttiva) { window.addEventListener('beforeunload', guardia); guardiaAttiva = true; }
    return () => {
      sporche.delete(k);
      if (!sporche.size) disattivaGuardiaBozze();
    };
  }, [chiave, etichetta, sporca, istanza]);
}

/** Le etichette delle bozze non salvate adesso (senza ripetizioni). */
export const bozzeSporche = (): string[] => [...new Set(sporche.values())];
