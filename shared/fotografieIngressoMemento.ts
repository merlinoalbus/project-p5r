/** Proiezione informativa L26: non contiene valori delle fotografie né autorizza una bonifica. */
export type CampoFotografiaL26 = 'chiave' | 'origine' | 'nascosto' | 'tipo' | 'quartiere_chiave'
  | 'area_chiave' | 'sblocco' | 'fonte' | 'quando' | 'giorni' | 'giorni_json' | 'condizioni_json'
  | 'orari_json' | 'note' | 'fonte_condizioni_json' | 'sblocco_data'
  | 'condizioni_guida_json' | 'fonte_condizioni_guida_json';

export interface CampoConfrontatoL26Dto {
  campo: CampoFotografiaL26;
  stato: 'coincide' | 'diverso' | 'assente' | 'null' | 'non-supportato';
  /** Permette di distinguere un NULL atteso da un NULL difforme, senza esporre il valore. */
  attesoNull: boolean;
  fonteAtteso: 'pacchetto-pubblico-93' | 'baseline-regia-122';
}

export type FormulaFotografiaL26 = 'assente' | 'null' | 'esatta-05-09' | 'esatta-05-07'
  | 'altra-formula-supportata' | 'json-malformato' | 'non-supportata';

export interface SeedIngressoMementoDto {
  stato: 'campo-assente' | 'null' | 'json-malformato' | 'radice-non-oggetto' | 'tipo-non-supportato' | 'oggetto';
  identitaDa: 'riga-proprietaria' | 'proprietario-non-disponibile';
  chiaveInterna: 'non-esaminabile' | 'assente' | 'coincide' | 'contraddittoria' | 'non-supportata';
  campi: CampoConfrontatoL26Dto[];
  formula: FormulaFotografiaL26;
  proprietaNonProiettate: number;
}

export interface RigaIngressoMementoDto {
  stato: 'tabella-assente' | 'schema-non-supportato' | 'riga-assente' | 'presente';
  campi: CampoConfrontatoL26Dto[];
  formula: FormulaFotografiaL26;
}

export interface LatoCestinoIngressoMementoDto {
  /** Ordinali effimeri, validi solo dentro questa risposta. Non sono ID del cestino. */
  registro: number;
  passo: number;
  operazione: 'D' | 'U' | 'I';
  lato: 'prima' | 'dopo';
  campi: CampoConfrontatoL26Dto[];
  formula: FormulaFotografiaL26;
  seed: SeedIngressoMementoDto;
}

export interface FotografieIngressoMementoDto {
  versione: 1;
  versioneSchemaGioco: number;
  ambito: 'L26';
  /** La baseline è precedente al rilascio 61ccb6ef: non viene spacciata per lettura corrente. */
  confronto: 'pubblico-93-e-baseline-122-pre-61ccb6ef';
  corrente: { luogo: RigaIngressoMementoDto; quartiere: RigaIngressoMementoDto };
  seed: SeedIngressoMementoDto;
  cestino: {
    stato: 'presente' | 'tabella-assente' | 'schema-non-supportato';
    lati: LatoCestinoIngressoMementoDto[];
  };
  copertura: {
    stato: 'leggibile' | 'incerta';
    /** Completezza della scansione, non conformità semantica né autorizzazione alla correzione. */
    righeTroncate: false;
    registriEsaminati: number;
    passiEsaminati: number;
    passiPertinenti: number;
    latiPertinenti: number;
    radiciIlleggibili: number;
    passiNonRiconoscibili: number;
    fotografieIlleggibili: number;
    fotografieParziali: number;
  };
}
