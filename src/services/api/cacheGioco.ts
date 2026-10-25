// ============================================================
// cacheGioco — cache in memoria delle letture dei DATI DI GIOCO (mai dell'avanzamento della partita)
// ============================================================
//
// Perché: ogni ritorno a una pagina (Compendio, Skill, Glossario…) rifaceva la fetch con lo spinner anche se i dati di gioco cambiano
// solo quando si modifica il canone. Qui si tiene l'ultima lettura per indirizzo; `useCarica` (opzione `cacheUrl`) la mostra subito e,
// nella preparazione, la rilegge in silenzio (stale-while-revalidate).
//
// Che cosa si mette in cache (regole che tengono fuori ogni dato di un'altra partita):
//   - solo GET fatte con `apiGetGioco`, scelto a mano per le letture che NON dipendono dalla partita (persone, skill, glossario, regole…);
//   - mai un indirizzo con `partita=`: se per errore ci arriva, non si memorizza (la chiave è l'indirizzo, quindi due partite non si
//     confondono comunque, ma l'avanzamento non deve restare in memoria dopo un cambio di partita).
//
// Invalidazione (segnale lato client, equivalente a quello dell'indice di ricerca lato server):
//   - ogni scrittura riuscita fuori da `/partite` (compendio, mappe, traduzioni, catalogo, importazioni, caricamento immagini…) chiama
//     `svuotaCacheGioco()` da `_helpers.ts`: l'unico punto da cui passano tutte le scritture. Una lettura già in volo quando la scrittura
//     arriva NON scrive il suo risultato (generazione `epoca`): niente dato vecchio che riemerge dopo una modifica;
//   - nel rilascio i contenuti sono fissi (volume dell'edizione in sola lettura): la cache vive finché vive la pagina, e una nuova
//     edizione cambia la versione dell'app, che fa ricaricare la pagina (`avviaControlloVersione`) e quindi svuota la memoria;
//   - nella preparazione un'altra scheda o un altro dispositivo può modificare i contenuti: la rilettura silenziosa a ogni montaggio
//     corregge il dato mostrato.
// ============================================================

/** Quante letture al massimo si tengono: oltre, esce la più vecchia (le schede di dettaglio per id non devono crescere senza limite). */
const MAX_VOCI = 200;

const voci = new Map<string, unknown>();
/** Cresce a ogni svuotamento: una lettura partita in un'epoca precedente non può più scrivere. */
let epoca = 0;

/** Un indirizzo con l'avanzamento di una partita non è un dato di gioco: non si memorizza mai. */
function memorizzabile(url: string): boolean {
  return !/[?&]partita=/.test(url);
}

/** L'epoca corrente: chi avvia una lettura la cattura e la passa a `scriviCacheGioco`. */
export function epocaCacheGioco(): number {
  return epoca;
}

/** Una copia indipendente (i dati sono JSON): chi riceve la lettura può ordinarla o modificarla sul posto senza toccare la cache. */
function copia<T>(dati: T): T {
  return structuredClone(dati);
}

/** L'ultima lettura riuscita di quell'indirizzo (una copia), o `undefined`. Fa una copia a ogni chiamata: chi la usa la legge una volta. */
export function leggiCacheGioco<T>(url: string | null | undefined): T | undefined {
  if (!url || !voci.has(url)) return undefined;
  return copia(voci.get(url) as T);
}

/** Memorizza (una copia di) una lettura riuscita, salvo che nel frattempo la cache sia stata svuotata (`epocaAvvio` ≠ epoca corrente). */
export function scriviCacheGioco(url: string, dati: unknown, epocaAvvio: number): void {
  if (epocaAvvio !== epoca || !memorizzabile(url) || dati === undefined) return;
  let tenuta: unknown;
  try { tenuta = copia(dati); } catch { return; } // un valore non clonabile (non JSON) non si memorizza
  // riscrivere sposta la voce in fondo (Map mantiene l'ordine d'inserimento): in testa resta la meno recente
  voci.delete(url);
  voci.set(url, tenuta);
  if (voci.size > MAX_VOCI) {
    const piuVecchia = voci.keys().next();
    if (!piuVecchia.done) voci.delete(piuVecchia.value);
  }
}

/** Svuota tutto: da chiamare dopo ogni scrittura riuscita sui contenuti (la fa `_helpers.ts`, non le pagine). */
export function svuotaCacheGioco(): void {
  epoca += 1;
  voci.clear();
}
