// ============================================================
// datePalazzo — la regola delle date di un Palazzo, una sola per il server e per il modulo che le modifica (L13 O6-3)
// ============================================================
//
// Le date di un Palazzo (o dei Memento) sono giorni del calendario di gioco, MM-GG, da una fonte sola (migrazione 308): l'apertura e la
// scadenza (la finestra), il furto consigliato e il termine della lettera di sfida. La regola:
//   - l'apertura c'è sempre; la scadenza può mancare («senza fine») solo dove il gioco non ne fissa una (i Memento e i Palazzi col boss dei
//     Memento, Iweleth); furto e lettera possono mancare (la guida non li dà);
//   - nell'ordine del calendario di gioco: apertura ≤ furto consigliato ≤ lettera ≤ scadenza, per le date che ci sono.
// La applica `impostaFinestra` (unico scrittore delle colonne) e la mostra in anticipo il modulo «Correggi la scheda».
// ============================================================

import { dataLeggibile, dataValida, ordineGioco } from './condizioniSpillo.js';

/** Le date di un Palazzo, MM-GG; null = non c'è. */
export interface DatePalazzo { dal: string | null; al: string | null; furtoConsigliato: string | null; letteraEntro: string | null }

/** Un problema delle date: il codice dell'errore dell'API e la frase per chi le scrive. */
export interface ErroreDatePalazzo { codice: 'data-non-valida' | 'apertura-necessaria' | 'scadenza-necessaria' | 'fine-prima-di-inizio' | 'date-rovesciate'; messaggio: string }

/** Le tappe nell'ordine del calendario: come si chiama la data in apertura di frase e dopo «prima». */
const TAPPE = [
  { campo: 'dal', soggetto: 'L’apertura', complemento: 'dell’apertura' },
  { campo: 'furtoConsigliato', soggetto: 'Il furto consigliato', complemento: 'del furto consigliato' },
  { campo: 'letteraEntro', soggetto: 'Il termine della lettera di sfida', complemento: 'del termine della lettera di sfida' },
  { campo: 'al', soggetto: 'La scadenza', complemento: 'della scadenza' },
] as const satisfies ReadonlyArray<{ campo: keyof DatePalazzo; soggetto: string; complemento: string }>;

/** Il primo problema delle date, o null se vanno bene. `senzaFinePossibile`: il posto può non scadere (Memento, Iweleth). */
export function erroreDatePalazzo(d: DatePalazzo, senzaFinePossibile: boolean): ErroreDatePalazzo | null {
  if (!d.dal) return { codice: 'apertura-necessaria', messaggio: 'Manca il giorno in cui si apre.' };
  if (TAPPE.some((t) => d[t.campo] !== null && !dataValida(d[t.campo]!))) return { codice: 'data-non-valida', messaggio: 'Le date sono giorni del calendario di gioco, MM-GG.' };
  if (d.al === null && !senzaFinePossibile) return { codice: 'scadenza-necessaria', messaggio: 'Un Palazzo ha una scadenza: «Senza fine» vale solo per i Memento e per Iweleth.' };
  // la finestra rovesciata prima di tutto: è l'errore di sempre della finestra (`fine-prima-di-inizio`)
  const rovescio = (codice: ErroreDatePalazzo['codice'], prima: typeof TAPPE[number], dopo: typeof TAPPE[number], dataPrima: string, dataDopo: string): ErroreDatePalazzo =>
    ({ codice, messaggio: `${dopo.soggetto} (${dataLeggibile(dataDopo)}) viene prima ${prima.complemento} (${dataLeggibile(dataPrima)}).` });
  if (d.al && ordineGioco(d.al) < ordineGioco(d.dal)) return rovescio('fine-prima-di-inizio', TAPPE[0], TAPPE[3], d.dal, d.al);
  const presenti = TAPPE.flatMap((t) => { const data = d[t.campo]; return data ? [{ t, data }] : []; });
  for (let i = 1; i < presenti.length; i++) {
    const prima = presenti[i - 1]!, dopo = presenti[i]!;
    if (ordineGioco(dopo.data) < ordineGioco(prima.data)) return rovescio('date-rovesciate', prima.t, dopo.t, prima.data, dopo.data);
  }
  return null;
}
