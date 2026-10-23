// ============================================================
// useElementoDaIndirizzo — evidenzia e porta in vista l'elemento citato da `?elemento=<chiave>` (L11, B4, R11-07/3)
// ============================================================
//
// La ricerca globale porta trofei e sfide alla loro pagina con `?elemento=<chiave>`: la pagina elenca tutto, e questo hook, a dati
// arrivati, porta in vista la carta che ha `id="elemento-<chiave>"` e le dà per qualche secondo l'evidenza temporanea già in uso
// (`card--evidenza`, la stessa del ritorno alla Persona vista; non l'alone dorato dei suggerimenti, che dice «da fare oggi»).
// Se l'elemento non c'è (scheda diversa, chiave superata) non succede niente: la pagina resta com'è.
// ============================================================

import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PARAMETRO_ELEMENTO } from '../../shared/ricerca';

/** Quanto resta l'evidenza sulla carta, in millisecondi (l'animazione dura 3 secondi). */
const DURATA_MS = 3500;

/** Porta in vista e evidenzia l'elemento `#elemento-<chiave>` quando `pronto` (i dati sono arrivati). `ancora` cambia quando cambia ciò che la
 *  pagina mostra (la scheda): l'elemento si cerca di nuovo. */
export function useElementoDaIndirizzo(pronto: boolean, ancora = ''): void {
  const [params] = useSearchParams();
  const chiave = params.get(PARAMETRO_ELEMENTO);
  useEffect(() => {
    if (!pronto || !chiave) return;
    const el = document.getElementById(`elemento-${chiave}`);
    if (!el) return;
    const ridotto = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    el.scrollIntoView({ block: 'center', behavior: ridotto ? 'auto' : 'smooth' });
    el.classList.add('card--evidenza');
    const timer = window.setTimeout(() => el.classList.remove('card--evidenza'), DURATA_MS);
    return () => { window.clearTimeout(timer); el.classList.remove('card--evidenza'); };
  }, [pronto, chiave, ancora]);
}
