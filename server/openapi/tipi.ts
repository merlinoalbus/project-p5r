// ============================================================
// tipi — la forma delle descrizioni delle rotte e delle aree per la documentazione OpenAPI
// ============================================================
//
// Lo schema di parametri, query e corpo non si scrive qui: viene dagli schemi zod dei middleware
// `validate`. Qui sta quello che il codice non dice da sé: che cosa fa la rotta, che cosa risponde, e i
// pochi casi in cui il corpo non passa da `validate` (corpo binario, schema scelto dal percorso).
// ============================================================

import type { ZodType } from 'zod';

/** La descrizione in italiano di una rotta; la chiave nel registro è «METODO /percorso» con la sintassi di Express. */
export interface DescrizioneRotta {
  /** Una riga: che cosa fa la rotta (al più 120 caratteri, senza punto finale). */
  sommario: string;
  /** Le regole che contano per chi la chiama: filtri, effetti sui dati, casi limite. */
  descrizione: string;
  /** Che cosa contiene `data` nella risposta, con il nome del tipo di `shared/` quando c'è (es. «Elenco di `PersonaRiassuntoDto`»). */
  risposta: string;
  /** Il corpo letto senza `validate`: lo schema scelto da un parametro del percorso, una variante per valore. */
  corpo?: { perParametro: string; varianti: Readonly<Record<string, ZodType>> };
  /** Il tipo MIME del corpo binario letto con `express.raw` (immagini, caratteri). */
  corpoBinario?: string;
  /** Vero per una rotta che modifica senza leggere un corpo (POST, PUT, PATCH senza dati). */
  senzaCorpo?: true;
  /** Il tipo del contenuto quando la risposta è un file e non l'involucro JSON `{ data }`. */
  rispostaBinaria?: string;
  /** I codici d'errore applicativi (`error.code`) più utili da conoscere, con lo stato HTTP. */
  errori?: ReadonlyArray<readonly [number, string]>;
}

/** Il registro delle descrizioni di un'area. */
export type DescrizioniArea = Readonly<Record<string, DescrizioneRotta>>;

/** Un'area (un tag OpenAPI): nome e descrizione in italiano. */
export interface AreaApi {
  nome: string;
  descrizione: string;
}
