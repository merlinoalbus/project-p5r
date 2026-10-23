// ============================================================
// tanakaDecisione — lo stato del listino di Tanaka in un file di gioco (L7-TANAKA-IMPORT)
// ============================================================
//
// Il listino di Tanaka è portato ai dati Royal dalla migrazione 142 (BON-08); la decisione unitaria con consenso dell'utente non c'è più.
// Resta il tipo con cui import ed export dicono che listino porta un file di gioco e se il suo registro è integro.

/** IMPORT: lo stato del listino di Tanaka e del registro delle decisioni in un file di gioco (istanza o pacchetto). */
export interface StatoTanakaFileDto {
  /** Il registro (migrazione 141) c'è. */
  registro: boolean;
  decisioni: number;
  attiva: string | null;
  listino: 'precedente' | 'royal' | 'misto' | 'assente';
  noteStoriche: number;
  /** Fotografie leggibili, versione nota, al più una decisione attiva, ripristini di decisioni esistenti. */
  registroIntegro: boolean;
  problemi: string[];
}
