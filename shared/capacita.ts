// ============================================================
// capacita — la modalità dell'istanza e che cosa permette (L12, passo 1 del progetto delle due istanze)
// ============================================================
//
// Fonte unica, letta da backend e frontend (docs/coordinamento/lotti/L12/progetto-due-istanze.md, §1). Il codice è uno solo; le istanze sono due:
//   - `preparazione`: l'istanza privata di oggi, con tutte le funzioni di modifica e configurazione (default ovunque);
//   - `rilascio`: l'istanza pubblica in sola lettura; si usano solo mappe, guida, diario e tracciamento dell'avanzamento.
// La modalità NON viene da una variabile d'ambiente dello stack: è fissata nella build (backend: punto d'avvio `server/rilascio.ts`;
// frontend: `VITE_MODALITA` al momento della build), così un errore di configurazione non può aprire le scritture.
// `/api/config` espone `{ modalita, capacita }` e il frontend confronta la sua costante di build con la risposta, bloccandosi se
// non coincidono (una pagina di rilascio davanti a un backend di preparazione, o viceversa, non deve funzionare a metà).
//
// Il file è puro: nessun import, nessun accesso a ambiente, rete o disco.
// ============================================================

/** La modalità di un'istanza: `preparazione` (privata, tutte le funzioni) o `rilascio` (pubblica, sola lettura). */
export type Modalita = 'preparazione' | 'rilascio';

/** Tutte le modalità valide, nell'ordine di presentazione. */
export const MODALITA: readonly Modalita[] = ['preparazione', 'rilascio'];

/** La modalità predefinita: quella dell'istanza di oggi. Chi non dichiara nulla ottiene la preparazione. */
export const MODALITA_PREDEFINITA: Modalita = 'preparazione';

/**
 * Le funzioni che una modalità apre o chiude. Ogni flag descrive UNA famiglia di funzioni, non una singola rotta: l'elenco esatto delle
 * rotte ammesse nel rilascio vive a parte (`server/rilascio/rotteGiocatore.ts`, passo 5); questi flag servono a decidere che cosa
 * mostrare nell'interfaccia e quali blocchi montare, mai a proteggere i dati (la protezione è del backend e del database).
 */
export interface Capacita {
  /** Modificare i contenuti di gioco (compendio, guida, mappe, catalogo, luoghi, correzioni), comprese le voci del diario. */
  modificaContenuti: boolean;
  /** L'editor delle mappe (planimetrie, pin, pezzi) e i componenti di modifica collegati. */
  editorMappe: boolean;
  /** Le Impostazioni dei contenuti: correzioni, cataloghi, regole, manutenzione. Restano le sole preferenze personali. */
  impostazioniContenuti: boolean;
  /** Importare ed esportare il pacchetto di gioco e le mappe, e preparare l'edizione di rilascio. */
  importaEsporta: boolean;
  /** Il deposito (cartella d'appoggio del server) e il caricamento di immagini. */
  deposito: boolean;
  /** La documentazione interattiva delle API (`/api/docs`, `/api/openapi.json`). */
  documentazioneApi: boolean;
  /** Le migrazioni dei dati all'avvio: in rilascio i contenuti sono chiusi e il runner non esiste. */
  migrazioni: boolean;
  /** Le partite appartengono a un utente riconosciuto (Cloudflare Access) e ognuno vede solo le sue; in preparazione c'è il proprietario unico. */
  partitePerUtente: boolean;
  /** Il tracciamento dell'avanzamento (partite, giorni, Persona, Confidenti, doti, acquisti): c'è in entrambe le istanze. */
  tracciamentoPartita: boolean;
}

/**
 * Le capacità di ciascuna modalità. `Record<Modalita, …>` obbliga ad aggiornare la tabella quando si aggiunge una modalità, e
 * `Capacita` obbliga a decidere ogni flag per entrambe: nessun valore dimenticato.
 */
export const CAPACITA_PER_MODALITA: Readonly<Record<Modalita, Readonly<Capacita>>> = {
  preparazione: {
    modificaContenuti: true,
    editorMappe: true,
    impostazioniContenuti: true,
    importaEsporta: true,
    deposito: true,
    documentazioneApi: true,
    migrazioni: true,
    partitePerUtente: false,
    tracciamentoPartita: true,
  },
  rilascio: {
    modificaContenuti: false,
    editorMappe: false,
    impostazioniContenuti: false,
    importaEsporta: false,
    deposito: false,
    documentazioneApi: false,
    migrazioni: false,
    partitePerUtente: true,
    tracciamentoPartita: true,
  },
};

/** I nomi dei flag, per chi deve confrontare due insiemi di capacità (il controllo di coerenza all'avvio del frontend). */
export const NOMI_CAPACITA = Object.keys(CAPACITA_PER_MODALITA.preparazione) as ReadonlyArray<keyof Capacita>;

/** Vero se `valore` è una delle modalità note (restringe il tipo: serve per leggere stringhe di build o di rete). */
export function eModalita(valore: unknown): valore is Modalita {
  return typeof valore === 'string' && (MODALITA as readonly string[]).includes(valore);
}

/** Le capacità di una modalità (funzione pura: stessa modalità, stesso oggetto). */
export function capacitaDi(modalita: Modalita): Readonly<Capacita> {
  return CAPACITA_PER_MODALITA[modalita];
}

/** Vero se due insiemi di capacità coincidono su ogni flag (non basta confrontare la modalità: il codice del backend potrebbe essere di una versione diversa). */
export function capacitaUguali(a: Readonly<Capacita>, b: Readonly<Capacita>): boolean {
  return NOMI_CAPACITA.every((nome) => a[nome] === b[nome]);
}
