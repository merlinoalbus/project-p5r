// ============================================================
// Il carattere di una voce della guida dei Palazzi (L4 «Avanzamento unico», lotti/L4/modifiche.md §1.1): un posto solo
// ============================================================
//
// - **permanente**: si fa una volta per sempre (forziere, porta, scorciatoia, Safe Room, meccanismo, Enigma, Seme, boss, miniboss, …);
//   è fatta se è segnata lei o una voce permanente dello stesso «oggetto» (le voci permanenti unite da pin in comune, a catena);
// - **rigenerabile**: si ripropone a ogni infiltrazione (oggetti a terra, Ombre sciagura; un tipo «nemico», se un giorno nascesse,
//   G-005): lo stato è quello della sua voce, che appartiene a una sola infiltrazione;
// - **descrittiva**: racconto (storia, altro): tiene il segno, ma non conta nel completamento (decisione dell'utente, 2026-10-20).
// Le voci dei dedali dei Memento e le Persona (L8) non hanno carattere (null): restano come sono.
// Una voce «Altro» è descrittiva (si legge, non si segna) finché l'utente non le dà «permanente» o «rigenerabile» (`CARATTERI_CON_STATO`):
// allora si segna e conta come le altre (2026-10-31), con la regola unica `puntoDescrittivo` di `shared/spilli.ts`.
// Il carattere scelto dall'utente (`punto_interesse.carattere`, migrazione 111) vince sulla regola; NULL vuol dire «vale la regola»,
// così una correzione della regola vale per tutte le voci non scelte a mano e «Ripristina» è rimettere NULL.
// Server e interfaccia usano queste funzioni: nessuno ricalcola il carattere a modo suo.
// ============================================================

export const CARATTERI = ['permanente', 'rigenerabile', 'descrittiva'] as const;
export type CarattereVoce = (typeof CARATTERI)[number];

/** Il nome del carattere per l'interfaccia (vocabolario di L4, §4.5). */
export const NOME_CARATTERE: Record<CarattereVoce, string> = {
  permanente: 'Permanente',
  rigenerabile: 'Si ripropone',
  descrittiva: 'Racconto',
};

/** I tipi che si ripropongono a ogni infiltrazione (D4; «nemico» non esiste oggi, G-005: se nasce, è rigenerabile). */
export const TIPI_RIGENERABILI: readonly string[] = ['oggetto', 'ombra-sciagura', 'nemico'];
/** I tipi di racconto. */
export const TIPI_DESCRITTIVI: readonly string[] = ['storia', 'altro'];
/** I tipi senza carattere (le Persona dei Palazzi arrivano con L8). */
export const TIPI_SENZA_CARATTERE: readonly string[] = ['persona'];

/** Vero se il valore è un carattere ammesso. */
export function eCarattere(v: unknown): v is CarattereVoce {
  return typeof v === 'string' && (CARATTERI as readonly string[]).includes(v);
}

/**
 * I caratteri che danno uno stato a una voce di un tipo descrittivo («Altro», `puntoDescrittivo` in `shared/spilli.ts`): una voce «Altro»
 * a cui l'utente ha dato «Permanente» o «Si ripropone» si segna e conta come le altre (2026-10-31). Senza carattere, o con «Racconto», resta
 * descrittiva: si legge e basta. Il valore può essere la scelta dell'utente o il carattere effettivo: per «Altro» coincidono.
 */
export const CARATTERI_CON_STATO: readonly CarattereVoce[] = ['permanente', 'rigenerabile'];

/** Vero se il carattere (scelto o effettivo) dà uno stato a una voce di tipo descrittivo (`CARATTERI_CON_STATO`). */
export function carattereConStato(carattere: string | null | undefined): boolean {
  return eCarattere(carattere) && CARATTERI_CON_STATO.includes(carattere);
}

/**
 * Il carattere che la regola dà a una voce, dal tipo e dall'area del dedalo (obbligatoria, come in `puntoDescrittivo`: chi la
 * dimenticasse ricadrebbe in silenzio nella regola dei Palazzi). Null per le voci dei dedali e per le Persona.
 */
export function carattereDaTipo(tipo: string, areaDedalo: string | null): CarattereVoce | null {
  if (areaDedalo) return null;
  if (TIPI_SENZA_CARATTERE.includes(tipo)) return null;
  if (TIPI_RIGENERABILI.includes(tipo)) return 'rigenerabile';
  if (TIPI_DESCRITTIVI.includes(tipo)) return 'descrittiva';
  return 'permanente';
}

/** Ciò che serve di una voce per sapere il suo carattere: tipo, area del dedalo e l'eventuale scelta dell'utente. */
export interface VoceConCarattere { tipo: string; areaDedalo: string | null; carattere?: string | null }

/**
 * Il carattere effettivo di una voce: la scelta dell'utente se c'è (fuori dai dedali e dalle Persona, che non ne hanno), altrimenti
 * la regola.
 */
export function carattereDellaVoce(v: VoceConCarattere): CarattereVoce | null {
  const regola = carattereDaTipo(v.tipo, v.areaDedalo);
  if (regola === null) return null;
  return eCarattere(v.carattere) ? v.carattere : regola;
}

/**
 * La stessa regola in SQL, per la voce con l'alias dato (colonne `tipo`, `area_dedalo_chiave` e, se c'è, `carattere`): il carattere
 * effettivo o NULL. `conColonna` falso per uno schema di prima della 111.
 */
export function sqlCarattereVoce(alias: string, conColonna = true): string {
  const lista = (tipi: readonly string[]) => tipi.map((t) => `'${t}'`).join(', ');
  const regola = `CASE WHEN ${alias}.tipo IN (${lista(TIPI_RIGENERABILI)}) THEN 'rigenerabile' WHEN ${alias}.tipo IN (${lista(TIPI_DESCRITTIVI)}) THEN 'descrittiva' ELSE 'permanente' END`;
  return `(CASE WHEN ${alias}.area_dedalo_chiave IS NOT NULL OR ${alias}.tipo IN (${lista(TIPI_SENZA_CARATTERE)}) THEN NULL ${conColonna ? `WHEN ${alias}.carattere IS NOT NULL THEN ${alias}.carattere ` : ''}ELSE ${regola} END)`;
}
