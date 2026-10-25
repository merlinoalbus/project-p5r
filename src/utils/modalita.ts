// ============================================================
// modalita — la modalità fissata nella build del frontend e il suo confronto con quella del backend (L12, passo 1)
// ============================================================
//
// `VITE_MODALITA` si scrive al momento della build (`ARG` del Dockerfile, passo 9) e Vite la sostituisce con una costante: con
// `rilascio` le condizioni su `MODALITA_BUILD` diventano costanti e i blocchi di modifica (editor delle mappe, componenti di
// modifica) escono dal bundle. Senza valore è `preparazione`, l'istanza di oggi: sviluppo, test e build attuali non cambiano.
// Un valore presente ma sconosciuto (un refuso nella pipeline) NON ricade in silenzio sulla preparazione: la build di rilascio non deve
// poter diventare un'istanza con le modifiche aperte per un errore di battitura, quindi qui si lancia un errore subito.
//
// I componenti leggono le capacità con `useCapacita()` / `<SoloPreparazione>`; il codice fuori da React (router, utilità) importa
// `CAPACITA_BUILD` da qui. Il controllo contro `/api/config` è `verificaCoerenzaModalita`, chiamato da `main.tsx` prima di montare l'App.
// ============================================================

import {
  MODALITA_PREDEFINITA,
  capacitaDi,
  capacitaUguali,
  eModalita,
  type Capacita,
  type Modalita,
} from '../../shared/capacita';

/** Legge `VITE_MODALITA`: assente o vuota = preparazione; presente ma sconosciuta = errore (vedi sopra). */
function leggiModalitaBuild(): Modalita {
  const grezza: unknown = import.meta.env.VITE_MODALITA;
  if (grezza === undefined || grezza === '') return MODALITA_PREDEFINITA;
  if (!eModalita(grezza)) {
    throw new Error(`VITE_MODALITA non valida: "${String(grezza)}" (valori ammessi: preparazione, rilascio)`);
  }
  return grezza;
}

/** La modalità di questa build del frontend. */
export const MODALITA_BUILD: Modalita = leggiModalitaBuild();

/** Le capacità di questa build (derivate dalla modalità: stessa fonte del backend, `shared/capacita.ts`). */
export const CAPACITA_BUILD: Readonly<Capacita> = capacitaDi(MODALITA_BUILD);

/**
 * Confronta la costante di build con ciò che dichiara il backend in `/api/config`. Restituisce `null` se coincidono, altrimenti il
 * motivo leggibile per la schermata d'errore bloccante (testo senza valori del server interpolati, se non modalità già riconosciute).
 *
 * Un backend più vecchio, che non conosce ancora il campo `modalita`, è per definizione un backend di preparazione: il backend di
 * rilascio nasce con il campo. Perciò l'assenza equivale a `preparazione` (e le capacità, se mancano, si derivano dalla modalità).
 */
export function verificaCoerenzaModalita(config: { modalita?: unknown; capacita?: unknown }): string | null {
  const dichiarata = config.modalita ?? MODALITA_PREDEFINITA;
  if (!eModalita(dichiarata)) return 'Il backend dichiara una modalità che questa versione dell\'app non riconosce';
  if (dichiarata !== MODALITA_BUILD) {
    return `Questa app è stata costruita per l'istanza di ${MODALITA_BUILD}, ma il backend risponde come istanza di ${dichiarata}`;
  }
  // stessa modalità, ma il codice dei due lati potrebbe essere di versioni diverse: contano anche i singoli flag
  const capacitaBackend = config.capacita;
  if (capacitaBackend !== undefined) {
    if (typeof capacitaBackend !== 'object' || capacitaBackend === null) return 'Il backend dichiara capacità illeggibili';
    if (!capacitaUguali(CAPACITA_BUILD, capacitaBackend as Capacita)) {
      return `Le funzioni dell'istanza di ${MODALITA_BUILD} dichiarate dal backend non coincidono con quelle di questa app (versioni diverse)`;
    }
  }
  return null;
}
