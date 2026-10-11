// ============================================================
// dedali — quando un'area di un dedalo dei Memento, e il dedalo, sono completati (099)
// ============================================================
//
// Richiesta dell'utente (2026-10-11): «ogni elemento deve avere uno stato... solo quando tutti gli elementi di un'area sono in
// stato completato l'area deve risultare completata. un dedalo diventa completato se tutte le sue aree sono completate.»
// Scelte dell'utente:
//   - gli elementi di un'area sono le sue voci della guida, le sue Richieste e i suoi timbri; le Persona no (2026-10-11);
//   - una voce è completata quando è Ottenuta o Esaurita; una Richiesta quando è «Completata»; i timbri quando sono tutti;
//   - nella percentuale i timbri contano uno per timbro («Uno per timbro»);
//   - un'area senza elementi è completata («Sì, completata»); per coerenza un dedalo senza aree lo è.
// Lo stesso calcolo lo fanno il server (scheda del Memento, anello) e l'interfaccia (aggiornamenti immediati dopo un gesto):
// una sola regola, scritta una volta.
// ============================================================

/**
 * I tipi delle voci di un dedalo (2026-10-11, richiesta dell'utente: «elementi Trama... unico tipo visto che nei memento è tutto
 * random quindi è impossibile segnare Stanze, porte, meccanismi forzieri o altro»): le Persona che vi si incontrano e la Trama.
 * Trama c'è solo nei Memento.
 */
export const TIPI_VOCE_DEDALO = ['persona', 'trama'] as const;
/** Vero se una voce di questo tipo può stare in un dedalo dei Memento. */
export const tipoDelDedalo = (tipo: string): boolean => (TIPI_VOCE_DEDALO as readonly string[]).includes(tipo);
/** Vero se la voce conta nel completamento della sua area: le Persona no («Le persone catturate o meno non influiscono sulla
 *  percentuale di completamento del memento», 2026-10-11), si segnano «catturata» e basta. */
export const contaNelDedalo = (tipo: string): boolean => tipo !== 'persona';

/** Gli elementi di un'area del dedalo, ridotti a quel che serve per contarli. */
export interface ElementiDiArea {
  /** Il tipo e lo stato di ogni voce della guida dell'area (null = da fare); le Persona non contano (`contaNelDedalo`). */
  voci: ReadonlyArray<{ tipo: string; stato: string | null }>;
  /** Lo stato di ogni Richiesta dell'area (completata solo con «completata»). */
  richieste: ReadonlyArray<{ stato: string | null }>;
  /** I timbri dell'area, o null se non ne ha; `raccolti` null senza partita. */
  timbri: { totale: number; raccolti: number | null } | null;
}

/** Quanti elementi conta un'area, quanti sono fatti e se è completata; senza partita `fatti` e `completata` sono null. */
export function contoAreaDedalo(a: ElementiDiArea, conPartita: boolean): { totale: number; fatti: number | null; completata: boolean | null } {
  const totaleTimbri = a.timbri?.totale ?? 0;
  const voci = a.voci.filter((v) => contaNelDedalo(v.tipo));
  const totale = voci.length + a.richieste.length + totaleTimbri;
  if (!conPartita) return { totale, fatti: null, completata: null };
  const timbriFatti = Math.min(a.timbri?.raccolti ?? 0, totaleTimbri);
  const fatti = voci.filter((v) => v.stato !== null).length + a.richieste.filter((r) => r.stato === 'completata').length + timbriFatti;
  return { totale, fatti, completata: fatti >= totale };
}

/** Il conteggio di un dedalo dalle sue aree: somma degli elementi, completato quando lo sono tutte (anche nessuna). */
export function contoDedalo(aree: ReadonlyArray<{ elementi: { totale: number; fatti: number | null }; completata: boolean | null }>, conPartita: boolean): { totale: number; fatti: number | null; completato: boolean | null } {
  const totale = aree.reduce((s, a) => s + a.elementi.totale, 0);
  if (!conPartita) return { totale, fatti: null, completato: null };
  return { totale, fatti: aree.reduce((s, a) => s + (a.elementi.fatti ?? 0), 0), completato: aree.every((a) => a.completata === true) };
}
