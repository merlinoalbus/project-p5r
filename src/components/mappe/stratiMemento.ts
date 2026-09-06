// ============================================================
// Gli strati con cui il gioco disegna il pozzo dei Memento
// ============================================================
//
// Stanno in un file loro e non dentro il componente per una ragione noiosa e reale: un modulo che
// esporta insieme componenti e funzioni rompe il ricaricamento a caldo di Vite, e lo dice il lint.
//
// Gli otto `第N層` — «strato N» — vengono da `IT/FIELD/PANEL/MEMENTOS/MEMENTOS.SPD` e sono i
// grappoli di città divelta che compongono l'imbuto scendendo; l'ultimo porta la punta a trivella
// del fondo. Il nono dedalo, Da'at, appartiene al terzo semestre, dove il gioco disegna un pozzo
// diverso: si usa il pezzo più grande di quella serie.
// ============================================================

export const BASE_MEMENTO = '/asset/mappe/lmap/memento';

export const STRATI_MEMENTO = ['strato-1', 'strato-2', 'strato-3', 'strato-4', 'strato-5',
  'strato-6', 'strato-7', 'strato-8', 'terzo-semestre-10'];

/** Lo strato che il gioco disegna per il dedalo in questa posizione della discesa.
 *
 * I piani dei Memento sono generati a ogni visita e nessuna guida ne pubblica una pianta: la
 * scheda di un dedalo restava senza immagine. Questa non è una pianta e non pretende di esserlo —
 * è il pezzo con cui il gioco lo disegna nel pozzo, che è l'unica raffigurazione che quel dedalo
 * abbia davvero.
 */
export function urlStratoDedalo(ordine: number): string {
  const i = Math.min(Math.max(ordine, 0), STRATI_MEMENTO.length - 1);
  return `${BASE_MEMENTO}/${STRATI_MEMENTO[i]}-elemento.png`;
}
