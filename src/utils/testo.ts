// ============================================================
// testo — normalizzazione per la ricerca (implementazione condivisa in shared/testo.ts)
// ============================================================

export { normalizzaTesto, corrispondeRicerca } from '../../shared/testo';

/**
 * Il testo «piatto» per i filtri delle pagine: senza accenti e minuscolo, con la punteggiatura che resta (non è `normalizzaTesto`,
 * che la toglie). Era copiato in Cruciverba, Domande, Richieste, articoli e Selettore (rilievo R4‴): in italiano
 * `toLocaleLowerCase('it')` e `toLowerCase()` danno lo stesso risultato, quindi la versione del Selettore è la stessa.
 */
export function piatto(s: string | null | undefined): string {
  return (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('it');
}
