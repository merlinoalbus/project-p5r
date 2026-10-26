// ============================================================
// TestoNote — le note delle Doti come simboli (♪, ♪♪, ♪♪♪) per chi guarda, a parole («2 note») per chi ascolta
// ============================================================
//
// Richiesta dell'utente (2026-10-26): «Ovunque dove si tratta di note va messo l'equivalente simbolo /numero di simboli». I simboli e le
// parole vengono da `shared/note.ts` (l'unico punto che li scrive); qui si mostrano: la fila di ♪ è un'immagine di testo (`role="img"`)
// il cui nome sono le parole («2 note», «nessuna nota»), così il lettore di schermo non dice il nome del simbolo ripetuto, il testo
// copiato resta «♪♪» e il contenuto testuale non cambia. Dentro un pulsante o un'opzione senza `aria-label` il nome entra nel loro
// (per esempio l'opzione «♪♪» si chiama «2 note»). `TestoNote` prende un testo qualunque (frasi del server, riepilogo, storico, avvisi) e
// tratta allo stesso modo ogni fila di ♪ che contiene; senza simboli è il testo e basta.
// ============================================================

import { Fragment } from 'react';
import { noteAParole, noteInSimboli, pezziTestoNote, simboliNote } from '../../../shared/note';

/** Una fila di note: i simboli a vista, le parole come nome per i lettori di schermo. */
export function SimboliNote({ simboli, parole }: { simboli: string; parole: string }) {
  return <span role="img" aria-label={parole} className="whitespace-nowrap">{simboli}</span>;
}

/** `n` note (1–4): «♪♪» a vista, «2 note» a voce. */
export function Note({ n }: { n: number }) {
  return <SimboliNote simboli={simboliNote(n)} parole={noteAParole(n)} />;
}

/**
 * Un testo con le sue file di ♪ rese accessibili; senza simboli, il testo così com'è. `daParole`: il testo è libero (scritto nella guida
 * o registrato prima dei simboli) e le sue note a parole si mostrano prima come simboli (`noteInSimboli`, solo vista); va usato soltanto
 * sui campi che parlano delle Doti. `'conteggi'`: solo i conteggi con la parola «nota»/«note» («+1 nota», «fino a 3 note»), per i
 * campi dove un «Dote +N» può essere in punti (storico, oggetti, attività, letture). `'guida'`: anche «Dote +N» senza unità, per i
 * testi della guida che con «+N» intendono le note (note delle voci, ricompense delle domande, premi degli esami).
 */
export function TestoNote({ testo: dato, daParole }: { testo: string; daParole?: 'conteggi' | 'guida' }) {
  const testo = daParole ? noteInSimboli(dato, { guida: daParole === 'guida' }) : dato;
  const pezzi = pezziTestoNote(testo);
  if (pezzi.length === 1 && 'testo' in pezzi[0]) return <>{testo}</>;
  return <>{pezzi.map((p, i) => ('testo' in p ? <Fragment key={i}>{p.testo}</Fragment> : <SimboliNote key={i} simboli={p.simboli} parole={p.parole} />))}</>;
}
