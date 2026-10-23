// ============================================================
// ombre — i contratti dell'entità Ombra (L8, B4)
// ============================================================
//
// L'Ombra è l'entità nuova; la Persona resta l'identità del compendio. Le debolezze si leggono dalle affinità della Persona; l'Ombra ha
// affinità proprie solo per le 4 eccezioni di G-019 e per le non reclutabili. Abbinamento alla Persona, catturabilità e negoziabilità sono
// tre dati distinti. Il vecchio `OmbraDto` (`shared/types.ts`) è la riga della guida alla Battaglia: resta finché la Battaglia non passa
// all'Ombra (B8).
// ============================================================

import type { AffinitaDto } from './types.js';
import type { PersonalitaOmbra } from './elementi.js';

/** La Persona di un'Ombra. */
export interface OmbraPersonaDto { id: number; nome: string; nomeIt: string }

/** Dove si incontra un'Ombra: un Palazzo (infiltrazione) o i Memento (dedalo, con le aree). */
export interface OmbraLuogoDto {
  dungeon: string;
  dungeonNome: string;
  /** `palazzo` o `mementos`. */
  tipo: string;
  /** L'infiltrazione del Palazzo o il dedalo dei Memento; null se la fonte dice soltanto il Palazzo. */
  infiltrazione: { chiave: string; nome: string } | null;
  /** Le aree del dedalo (solo nei Memento), da `persona_area_dedalo`: una Persona si incontra in più aree. */
  areeDedalo: Array<{ chiave: string; nome: string }>;
  /** Da dove viene il dato: la guida alla Battaglia, una voce Persona della guida (Palazzo o dedalo). */
  fonti: Array<'battaglia' | 'voce' | 'dedalo' | 'utente'>;
  /** Il link alla guida del posto. */
  casa: string;
  /**
   * Con una partita: l'incontro è ancora raggiungibile? Falso solo per un Palazzo concluso (L4 R4-22, G-026: dopo il furto sparisce);
   * i Memento e i dedali, Iweleth compreso, restano sempre raggiungibili. Null senza partita.
   */
  raggiungibile: boolean | null;
  /** Il perché di un incontro non più raggiungibile («Tesoro e boss finale»). */
  motivoNonRaggiungibile?: string;
}

/** Un'affinità che non è «normale» (resiste, annulla, riflette, assorbe) di un'Ombra. */
export interface OmbraResistenzaDto { elemento: string; codice: string }

/** Se e dove un'Ombra si cattura ancora in una partita (R8-15b, G-026). */
export interface OmbraRaggiungibilitaDto {
  /** `si` = c'è un incontro raggiungibile; `no` = tutti gli incontri sono in Palazzi conclusi e la Persona non si ottiene altrimenti; `solo-fusione` = come `no`, ma la Persona è fondibile;
   *  `ignoto` = la guida non dice dove si incontra; `non-catturabile` = l'incontro non espone la cattura (Babau/Bugs, non reclutabili). */
  stato: 'si' | 'no' | 'solo-fusione' | 'ignoto' | 'non-catturabile';
  /** La frase da mostrare. */
  testo: string;
}

/** Un'Ombra in elenco. */
export interface OmbraSchedaDto {
  chiave: string;
  nome: string;
  /** Altri nomi con cui la guida o la negoziazione la chiamano: la ricerca li trova. */
  nomiAltri: string[];
  /** La Persona del compendio; null per le non reclutabili. */
  persona: OmbraPersonaDto | null;
  /** La maschera descrittiva quando non è una Persona reclutabile (per esempio Mara per lo «Straziato re dei desideri»). */
  macheraNota: string | null;
  personalita: PersonalitaOmbra;
  /** Con una Persona e un incontro che la permette. */
  reclutabile: boolean;
  /** L'incontro espone il gesto di cattura (falso per le non reclutabili e per chi si ottiene solo con la fusione). */
  catturabile: boolean;
  /** Ha una negoziazione: null se non è verificata (Demoni del Tesoro). */
  negoziabile: boolean | null;
  livello: number | null;
  origine: 'seed' | 'utente';
  casa: string;
  /** Le chiavi degli elementi a cui è debole: le affinità della Persona con sopra le differenze dell'Ombra (R8-08); vuoto se non se ne conoscono. */
  debolezze: string[];
  /** Le altre affinità non normali (resiste, annulla, riflette, assorbe), nello stesso ordine degli elementi. */
  resistenze: OmbraResistenzaDto[];
  /** Dove si incontra: una sola fonte (R8-05), uniti per posto. */
  luoghi: OmbraLuogoDto[];
  /** La Persona è registrata nel compendio della partita (null senza partita o senza Persona). */
  registrata: boolean | null;
}

/** La scheda di un'Ombra. */
export interface OmbraDettaglioDto extends OmbraSchedaDto {
  /** Con la Persona, tutti gli elementi: quelli del compendio, con le affinità proprie dell'Ombra sopra dove differiscono. Senza Persona, solo gli elementi che la guida sa dell'Ombra (gli altri non sono noti, non sono «normali»). */
  affinita: Array<AffinitaDto & { proprie: boolean }>;
  /** Vero se l'Ombra ha affinità proprie (eccezione o non reclutabile). */
  affinitaProprie: boolean;
  /** Con una partita e una Persona catturabile: dove si cattura ancora; null altrimenti. */
  raggiungibilita: OmbraRaggiungibilitaDto | null;
  /** Le voci Persona della guida che la descrivono. */
  voci: Array<{ chiave: string; nome: string; dungeon: string; infiltrazione: string }>;
  note: string;
}

/** Il rapporto della migrazione che ha creato le Ombre: conteggi e elenco di ciò che richiede una decisione. */
export interface OmbreVerificaDto {
  /** Conteggi misurati ora sul database (non quelli scritti dalla migrazione). */
  conteggi: { ombre: number; conPersona: number; senzaPersona: number; nonCatturabili: number; luoghi: number; voci: number; areeDedalo: number; personalita: Record<PersonalitaOmbra, number> };
  /** Il rapporto della migrazione: righe corrette, varianti di personalità, possibili doppioni, voci che non sono Ombre, Ombre senza nome della guida… */
  rapporto: Record<string, unknown> | null;
}
