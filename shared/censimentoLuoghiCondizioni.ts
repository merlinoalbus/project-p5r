/** Censimento corrente: testo e JSON conservati, senza inferenze dalla prosa. */
export interface JsonCensimentoCondizioniDto {
  raw: string | null;
  stato: 'null' | 'valido' | 'malformato' | 'colonna-assente';
  /** Anche il JSON letterale null è valido; stato distingue il NULL SQL. */
  valore: unknown;
}

interface OrigineCensimentoDto {
  origine: string | null;
  fonte: string | null;
  nascosto: number | null;
}

export interface LuogoCensimentoDto extends OrigineCensimentoDto {
  chiave: string; nome: string; tipo: string | null;
  quartiere_chiave: string | null; area_chiave: string | null;
  sblocco: string | null; quando: string | null; note: string | null;
  solo_eventi_confidente: string | null;
  condizioni_json: JsonCensimentoCondizioniDto;
  orari_json: JsonCensimentoCondizioniDto;
  fonte_condizioni_json: JsonCensimentoCondizioniDto;
}

export interface NegozioCensimentoDto extends OrigineCensimentoDto {
  chiave: string; nome: string; tipo: string | null;
  luogo: string | null; luogo_chiave: string | null; sede_chiave: string | null;
  listino_condiviso: string | null;
  note: string | null;
  /** Campo storico: non è lo sblocco proprio attuale del negozio. */
  condizioni_json: JsonCensimentoCondizioniDto;
  sblocco_json: JsonCensimentoCondizioniDto;
  orari_json: JsonCensimentoCondizioniDto;
  eccezione_orari_json: JsonCensimentoCondizioniDto;
}

export interface AttivitaCensimentoDto extends OrigineCensimentoDto {
  chiave: string; nome: string; tipo: string | null;
  luogo: string | null; luogo_chiave: string | null; sede_chiave: string | null;
  sblocco: string | null; fascia: string | null;
  condizioni_json: JsonCensimentoCondizioniDto;
}

export interface ArticoloCensimentoDto extends OrigineCensimentoDto {
  chiave: string; nome: string; nome_it: string | null; negozio_chiave: string | null;
  catalogo_chiave: string | null; articolo_condiviso: string | null;
  condizione: string | null; disponibile_dal: string | null; nota: string | null;
  condizioni_json: JsonCensimentoCondizioniDto;
}

export interface QuartiereCensimentoDto {
  chiave: string; nome: string; sblocco: string | null; sblocco_data: string | null; fonte: string | null;
  condizioni_json: JsonCensimentoCondizioniDto;
  condizioni_guida_json: JsonCensimentoCondizioniDto;
  fonte_condizioni_json: JsonCensimentoCondizioniDto;
  fonte_condizioni_guida_json: JsonCensimentoCondizioniDto;
}

export interface AreaCensimentoDto {
  chiave: string; nome: string; quartiere_chiave: string | null;
  dungeon_chiave: string | null; citta_chiave: string | null; origine: string | null;
}

export interface MappaCensimentoDto {
  chiave: string; nome: string; tipo: string | null; origine: string | null;
  area_chiave: string | null; genitore_chiave: string | null;
}

export interface SedeExtraCensimentoDto { negozio_chiave: string; luogo_chiave: string }
export interface SedePinCensimentoDto extends SedeExtraCensimentoDto { spillo_uid: string }
export interface AreaGuidaCensimentoDto { chiave: string; nome: string; dungeon_chiave: string }
export interface DestinazioneSpilloCensimentoDto { spillo_id: number; mappa_chiave: string | null; spillo_arrivo_id: number | null }

export interface PinCensimentoDto {
  id: number; uid: string | null; nome: string; tipo: string | null; origine: string | null;
  mappa_chiave: string | null; area_guida_chiave: string | null; ruolo_guida: string | null;
  riferimento_tipo: string | null; riferimento_chiave: string | null;
  condizioni_json: JsonCensimentoCondizioniDto;
  contesto: { area_chiave: string | null; quartiere_chiave: string | null };
  /** dungeon_area è una sezione della guida, distinta dall'Area fisica della mappa. */
  contestoGuida: { dungeon_area_chiave: string; dungeon_chiave: string | null; nome: string | null } | null;
  /** Risoluzione strutturale, non disponibilità/visibilità nel visore. Null non significa difetto: per esempio un passaggio non deve avere un luogo. */
  luogoRisolto: { chiave: string; via: 'riferimento-luogo' | 'riferimento-attivita-luogo' | 'sede-attivita' | 'sede-negozio' | 'sede-listino' | 'sede-pin'; negozio: string | null } | null;
  /** Associazioni esplicite; più sedi non autorizzano a sceglierne una per questo pin. */
  luoghiAssociati: string[];
  riferimento: { tipo: string; chiave: string; nome: string | null; esiste: boolean | null } | null;
  /** Solo anomalie strutturali accertate, non giudizi sulla mancanza di un luogo. */
  anomalieLegami: Array<'ciclo-listino' | 'listino-assente' | 'sede-pin-incoerente'>;
}

export interface CensimentoLuoghiCondizioniDto {
  versione: 1;
  versioneSchemaGioco: number;
  /** Nessun taglio alle righe delle tabelle censite; non certifica la correttezza semantica dei dati. */
  completo: true;
  limiteRighe: null;
  schema: Array<{ tabella: string; presente: boolean; colonneAssenti: string[]; righe: number }>;
  luoghi: LuogoCensimentoDto[];
  negozi: NegozioCensimentoDto[];
  attivita: AttivitaCensimentoDto[];
  articoli: ArticoloCensimentoDto[];
  quartieri: QuartiereCensimentoDto[];
  aree: AreaCensimentoDto[];
  mappe: MappaCensimentoDto[];
  pin: PinCensimentoDto[];
  sediExtra: SedeExtraCensimentoDto[];
  sediPin: SedePinCensimentoDto[];
  areeGuida: AreaGuidaCensimentoDto[];
  destinazioniSpilli: DestinazioneSpilloCensimentoDto[];
}
