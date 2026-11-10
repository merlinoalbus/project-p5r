// ============================================================
// Cache dei dati di gioco — un registro unico, svuotato quando il DB di gioco cambia sotto l'app
// ============================================================
//
// Alcuni servizi tengono in memoria letture costose del DB di gioco (traduzioni, motore di fusione,
// eredità delle skill, finestre dei Palazzi, nomi delle condizioni). Quando il file di gioco viene
// sostituito o ricaricato a runtime (importazione del pacchetto, ripristino di una copia, `caricaPacchetto`
// nei test) quelle copie diventano vecchie. Prima ogni chiamante elencava a mano le cache da svuotare e
// una (`invalidaFinestreDungeon`) era rimasta fuori da tutti e tre gli elenchi.
//
// Ogni modulo con una cache vi registra la propria funzione di invalidazione al caricamento
// (`registraCacheDiGioco`); chi cambia il DB chiama `invalidaCacheDiGioco()`. Il registro non importa
// nessun servizio, quindi non crea cicli fra moduli: un modulo non ancora caricato non ha una cache
// da svuotare.
//
// La politica di invalidazione è questa, una sola:
//   - il file di gioco cambia sotto l'app (importazione, ripristino, `caricaPacchetto`): chi lo cambia chiama `invalidaCacheDiGioco()`;
//   - una scrittura HTTP riuscita sulle aree che toccano i dati di gioco: lo fa `middleware/cacheDiGiocoDopoScritture`, per tutte le cache
//     registrate (e non solo per l'indice della ricerca), così uno scrittore che se ne dimentica non lascia letture vecchie;
//   - uno scrittore che sa di cambiare dati di gioco può chiamarla da sé.
// Oltre all'invalidazione, due cache si CONVALIDANO ogni volta che si leggono, perché non dipendono da chi scrive: `db/schemaMemo.ts`
// (la struttura: `schema_version`) e il modello di avanzamento dei Palazzi (`mappe/statiGuida.ts`: `data_version`, `schema_version`,
// `total_changes()`), che devono vedere anche le migrazioni e le scritture fuori dall'API. I nomi delle condizioni
// (`condizioni/nomiCondizioni.ts`) si rileggono comunque dopo un secondo: la memoria serve solo a non rileggerli per ogni riga di un elenco.
// ============================================================

import { logger } from '../utils/logger.js';

const invalidatori = new Set<() => void>();

/** Registra la funzione che svuota una cache di dati di gioco; restituisce la stessa funzione, per poterla anche esportare. */
export function registraCacheDiGioco(invalida: () => void): () => void {
  invalidatori.add(invalida);
  return invalida;
}

/** Svuota tutte le cache registrate: va chiamata ogni volta che il DB di gioco viene sostituito o ricaricato. */
export function invalidaCacheDiGioco(): void {
  // Una cache che non si svuota non deve lasciare vecchie le altre, né fermare il processo: qui si arriva anche dopo una risposta già inviata.
  for (const invalida of invalidatori) {
    try { invalida(); } catch (err) { logger.error({ err, cache: invalida.name || 'anonima' }, 'una cache di gioco non si è svuotata'); }
  }
}
