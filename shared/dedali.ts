// ============================================================
// dedali — quando un'area di un dedalo dei Memento, e il dedalo, sono completati (099)
// ============================================================
//
// Richiesta dell'utente (2026-10-11): «ogni elemento deve avere uno stato... solo quando tutti gli elementi di un'area sono in
// stato completato l'area deve risultare completata. un dedalo diventa completato se tutte le sue aree sono completate.»
// Scelte dell'utente:
//   - gli elementi di un'area sono le sue voci della guida e le sue Richieste; le Persona no (2026-10-11);
//   - una voce è completata quando è Ottenuta o Esaurita; una Richiesta quando è «Completata»; i timbri quando sono tutti;
//   - nella percentuale i timbri contano uno per timbro («Uno per timbro»);
//   - un'area senza elementi è completata («Sì, completata»); per coerenza un dedalo senza aree lo è.
// L10-02 (Q8 A, migrazione 382): la guida dà i timbri per dedalo, non per area. Il totale sta nel dedalo (`dungeon_area.timbri_totale`) e i
// timbri contano una volta sola, nel dedalo, uno per timbro: l'area non li conta più. Un dedalo è completato quando lo sono tutte le sue aree
// e i suoi timbri sono tutti raccolti.
// Lo stesso calcolo lo fanno il server (scheda del Memento, anello) e l'interfaccia (aggiornamenti immediati dopo un gesto):
// una sola regola, scritta una volta.
// ============================================================

/**
 * I tipi delle voci di un dedalo (2026-10-11, richiesta dell'utente: «elementi Trama... unico tipo visto che nei memento è tutto
 * random quindi è impossibile segnare Stanze, porte, meccanismi forzieri o altro»): le Persona che vi si incontrano e la Trama.
 * Trama c'è solo nei Memento. Sono i tipi che si possono scegliere: l'eccezione sono i forzieri e i mini-boss di Iweleth (migrazione 378), un dedalo
 * nato da un Palazzo, che tengono il tipo di prima; si correggono senza cambiarlo e contano come la Trama (`contaNelDedalo`).
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
}

/** I timbri di un dedalo (L10-02): il totale della guida e quanti ne ha raccolti la partita (null senza partita); null = niente da contare. */
export type TimbriDelDedalo = { totale: number; raccolti: number | null } | null;

/** Quanti elementi conta un'area, quanti sono fatti e se è completata; senza partita `fatti` e `completata` sono null. */
export function contoAreaDedalo(a: ElementiDiArea, conPartita: boolean): { totale: number; fatti: number | null; completata: boolean | null } {
  const voci = a.voci.filter((v) => contaNelDedalo(v.tipo));
  const totale = voci.length + a.richieste.length;
  if (!conPartita) return { totale, fatti: null, completata: null };
  const fatti = voci.filter((v) => v.stato !== null).length + a.richieste.filter((r) => r.stato === 'completata').length;
  return { totale, fatti, completata: fatti >= totale };
}

/**
 * Il conteggio di un dedalo: la somma degli elementi delle aree più i suoi timbri (uno per timbro, contati una volta sola qui, entro il
 * totale); completato quando lo sono tutte le aree (anche nessuna) e i timbri sono tutti raccolti.
 */
export function contoDedalo(aree: ReadonlyArray<{ elementi: { totale: number; fatti: number | null }; completata: boolean | null }>, timbri: TimbriDelDedalo, conPartita: boolean): { totale: number; fatti: number | null; completato: boolean | null } {
  const totaleTimbri = timbri?.totale ?? 0;
  const totale = aree.reduce((s, a) => s + a.elementi.totale, 0) + totaleTimbri;
  if (!conPartita) return { totale, fatti: null, completato: null };
  const timbriFatti = Math.min(timbri?.raccolti ?? 0, totaleTimbri);
  return { totale, fatti: aree.reduce((s, a) => s + (a.elementi.fatti ?? 0), 0) + timbriFatti, completato: aree.every((a) => a.completata === true) && timbriFatti >= totaleTimbri };
}
