// ============================================================
// Lucchetto dell'istanza — una sola sostituzione dei file del database alla volta
// ============================================================
//
// Importare il pacchetto di gioco e ripristinare l'istanza da una copia fanno la stessa cosa pericolosa:
// copia di sicurezza, chiusura della connessione, riscrittura dei file, riapertura. Fra la copia di
// sicurezza (asincrona) e la chiusura un'altra richiesta potrebbe partire, e due sostituzioni intrecciate
// lasciano i file di una e la copia di sicurezza dell'altra. Prima solo l'importazione si proteggeva; il
// ripristino poteva sovrapporsi a lei o a un altro ripristino.
//
// Senza dipendenze da altri servizi: lo prendono sia `pacchettoGiocoService` sia `impostazioniService`,
// che si importano già in un verso, e un modulo comune evita il ciclo.
// ============================================================

import { httpErrors } from '../utils/httpError.js';

let occupata: { cosa: string; dal: string } | null = null;

/** Prende il lucchetto per `cosa` (descrizione per il messaggio di rifiuto) e restituisce la funzione che lo rilascia, una volta
 *  sola. Se un'altra sostituzione è in corso risponde 409 `importazione-in-corso`, il codice che il frontend già conosce. */
export function occupaIstanza(cosa: string): () => void {
  if (occupata) throw httpErrors.conflict('importazione-in-corso', `${occupata.cosa} è già in corso dalle ${occupata.dal}: attendi che finisca.`);
  occupata = { cosa, dal: new Date().toISOString() };
  let rilasciato = false;
  return () => {
    if (rilasciato) return;
    rilasciato = true;
    occupata = null;
  };
}
