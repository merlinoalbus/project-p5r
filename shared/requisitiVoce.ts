// ============================================================
// requisitiVoce — l'elenco «da avere in scorta» di una voce del Diario (regole pure, condivise da server e client)
// ============================================================
//
// Una voce del Diario (un'azione, non un promemoria) può chiedere che prima di spuntarla si abbiano in scorta certe Persona: ogni
// requisito è un ARCANO («una Persona qualunque di quell'arcano») oppure una PERSONA SPECIFICA di un arcano. L'elenco è del canone (sta
// nel file di gioco, con la voce); la casella a spunta di ogni requisito è invece della partita ed è un promemoria manuale: non legge né
// scrive la scorta (`persona_posseduta`). La spunta di completamento della voce è consentita solo con tutte le caselle spuntate; togliere
// la spunta è sempre libero.
//
// Questo modulo non importa niente di Node, del database o del DOM: la forma del requisito, i limiti e le regole che non hanno bisogno
// dei dati di gioco (forma, doppioni, «arcano intero» insieme a una sua Persona, massimo). Che l'arcano esista e che la Persona sia di
// quell'arcano (e non del gruppo) lo verifica il servizio, che i dati li ha.
// ============================================================

/** Quanti requisiti al massimo ha una voce. */
export const MASSIMO_REQUISITI_VOCE = 30;

/** Il valore di `persona_id` nelle caselle della partita per «una Persona qualunque dell'arcano» (nel file di gioco è NULL). */
export const PERSONA_QUALUNQUE = 0;

/** Un requisito com'è letto dal server: arcano (chiave inglese e nome italiano), Persona se specifica, e con una partita la sua casella. */
export interface RequisitoVoceDto {
  /** La chiave inglese dell'arcano (`arcana.chiave`: «Chariot», «Faith», «Councillor»…). */
  arcana: string;
  /** Il nome italiano dell'arcano. */
  arcanaNome: string;
  /** L'id della Persona richiesta; null = una Persona qualunque dell'arcano. */
  persona: number | null;
  /** Il nome (italiano) della Persona richiesta; null se il requisito è l'arcano intero. */
  personaNome: string | null;
  /** La casella della partita: presente solo quando la voce è letta con una partita (`?partita=`). */
  fatto?: boolean;
}

/** Un requisito come lo scrive l'editor della voce. */
export interface RequisitoVoceInput {
  arcana: string;
  /** L'id della Persona; assente o null = l'arcano intero. */
  persona?: number | null;
}

/** Il requisito come chiave unica dentro una voce («Chariot» per l'arcano intero, «Chariot#2» per la Persona 2). */
export function chiaveRequisito(arcana: string, persona: number | null | undefined): string {
  return persona === null || persona === undefined ? arcana : `${arcana}#${persona}`;
}

/** L'esito della normalizzazione: l'elenco pulito o il motivo (una frase in italiano) per cui l'elenco non è valido. */
export type EsitoRequisitiVoce = { ok: true; requisiti: Array<{ arcana: string; persona: number | null }> } | { ok: false; motivo: string };

/**
 * L'elenco come va salvato: arcano senza spazi, Persona sempre numero intero positivo o null, nello stesso ordine. Non valido se: più del
 * massimo; un arcano vuoto; una Persona che non è un intero positivo; lo stesso requisito due volte; l'arcano intero e anche una sua
 * Persona specifica (la Persona sarebbe già compresa nell'arcano). Non guarda i dati di gioco: chi chiama verifica che arcani e Persona esistano
 * e che la Persona sia dell'arcano indicato.
 */
export function normalizzaRequisitiVoce(input: readonly RequisitoVoceInput[]): EsitoRequisitiVoce {
  if (input.length > MASSIMO_REQUISITI_VOCE) return { ok: false, motivo: `Una voce ha al massimo ${MASSIMO_REQUISITI_VOCE} requisiti in scorta.` };
  const pulito: Array<{ arcana: string; persona: number | null }> = [];
  const viste = new Set<string>();
  for (const r of input) {
    const arcana = typeof r.arcana === 'string' ? r.arcana.trim() : '';
    if (!arcana) return { ok: false, motivo: 'Ogni requisito indica un arcano.' };
    const persona = r.persona ?? null;
    if (persona !== null && (!Number.isInteger(persona) || persona <= 0)) return { ok: false, motivo: 'La Persona di un requisito è indicata dal suo numero (intero positivo).' };
    const chiave = chiaveRequisito(arcana, persona);
    if (viste.has(chiave)) return { ok: false, motivo: persona === null ? `L'arcano «${arcana}» è già fra i requisiti.` : `La Persona ${persona} è già fra i requisiti.` };
    viste.add(chiave);
    pulito.push({ arcana, persona });
  }
  for (const r of pulito) {
    if (r.persona !== null && viste.has(chiaveRequisito(r.arcana, null))) {
      return { ok: false, motivo: `L'arcano «${r.arcana}» è già richiesto per intero: non serve anche una sua Persona.` };
    }
  }
  return { ok: true, requisiti: pulito };
}
