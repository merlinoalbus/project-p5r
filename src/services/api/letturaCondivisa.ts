// ============================================================
// letturaCondivisa — una sola lettura per chiave, condivisa fra tutte le istanze montate che la chiedono (L5-07)
// ============================================================
//
// Perché: un componente montato per ogni voce del Diario, per ogni domanda in classe o per ogni Richiesta (`DaApplicare`) leggeva da solo
// l'elenco completo delle proposte e le Doti della partita: a fine partita centinaia di richieste identiche. Qui la prima istanza che chiede
// una chiave avvia la lettura e le altre, nello stesso momento o dopo, ricevono la stessa promessa.
//
// Quando una lettura smette di valere (mai dati vecchi a schermo):
//   - il `token` cambia: chi chiede dichiara da che cosa dipende la lettura (per le proposte, le versioni delle mutazioni della partita
//     e della guida, `gestiPartita`); un token diverso è una lettura nuova, anche per chi era già montato;
//   - ogni scrittura riuscita o finita male (`_helpers.ts`, l'unico punto da cui passano tutte): `segnalaScritturaCondivisa()` fa salire
//     l'epoca e nessuna lettura di prima si riusa più. È il «Applica», la spunta, il contatore delle attività, il cambio di una Dote;
//   - `invalidaLetturaCondivisa(chiave)`: una `ricarica()` esplicita o un'istanza che dice di essere cambiata (vedi `useLetturaCondivisa`);
//   - una lettura fallita non resta: la prossima richiesta la rifà;
//   - nessuna istanza montata la usa più (`agganciaLetturaCondivisa`): la voce si butta, così una pagina aperta più tardi rilegge sempre.
//     Il rilascio avviene a fine microtask: un ricambio di istanze nello stesso aggiornamento (cambio di giorno del Diario, doppio effetto
//     di StrictMode) riusa la lettura invece di rifarla.
// La chiave è per partita (`proposte:<id>`): un cambio di partita è un'altra chiave, e quella di prima si butta quando le sue istanze si smontano.
// ============================================================

interface Voce {
  token: string;
  epoca: number;
  promessa: Promise<unknown>;
}

const voci = new Map<string, Voce>();
const istanzeMontate = new Map<string, number>();
/** Sale a ogni scrittura: una lettura partita in un'epoca precedente non si riusa. */
let epoca = 0;

/** Da chiamare a ogni richiesta di scrittura conclusa (riuscita o no: può essere arrivata a metà): le letture condivise di prima non valgono più. */
export function segnalaScritturaCondivisa(): void {
  epoca += 1;
}

/** Butta la lettura di quella chiave: la prossima richiesta va in rete. */
export function invalidaLetturaCondivisa(chiave: string): void {
  voci.delete(chiave);
}

/**
 * La lettura di `chiave`: quella già in corso o conclusa se vale ancora (stesso `token`, nessuna scrittura da allora), altrimenti ne parte una
 * nuova con `carica`. Una lettura fallita esce dalla memoria (chi la riceve vede l'errore, la richiesta dopo ritenta).
 */
export function leggiCondivisa<T>(chiave: string, token: string, carica: () => Promise<T>): Promise<T> {
  const esistente = voci.get(chiave);
  if (esistente && esistente.token === token && esistente.epoca === epoca) return esistente.promessa as Promise<T>;
  // `async`: anche un errore lanciato subito da `carica` diventa una promessa rifiutata, come per le altre letture
  const nuova: Voce = { token, epoca, promessa: (async () => carica())() };
  voci.set(chiave, nuova);
  nuova.promessa.catch(() => { if (voci.get(chiave) === nuova) voci.delete(chiave); });
  return nuova.promessa as Promise<T>;
}

/**
 * Dichiara che un'istanza montata usa la chiave; restituisce la funzione che lo toglie (da chiamare allo smontaggio). Quando non ne resta
 * nessuna la lettura si butta (a fine microtask, vedi sopra).
 */
export function agganciaLetturaCondivisa(chiave: string): () => void {
  istanzeMontate.set(chiave, (istanzeMontate.get(chiave) ?? 0) + 1);
  let tolta = false;
  return () => {
    if (tolta) return;
    tolta = true;
    const restano = (istanzeMontate.get(chiave) ?? 1) - 1;
    if (restano > 0) { istanzeMontate.set(chiave, restano); return; }
    istanzeMontate.delete(chiave);
    queueMicrotask(() => { if (!istanzeMontate.has(chiave)) voci.delete(chiave); });
  };
}
