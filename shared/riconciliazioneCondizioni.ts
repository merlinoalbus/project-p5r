import type { RequisitoSpillo } from './condizioniSpillo.js';
import type { FonteConfidenteAttivitaDto } from './types.js';

export type TabellaRiconciliazione = 'luogo' | 'negozio' | 'attivita' | 'articolo';
export type AzioneRiconciliazione = 'conferma-corrente' | 'applica-proposta' | 'mantieni-nota';
export type AnalisiRiconciliazione = 'condizioni' | 'eredita' | 'solo-nota' | 'ricerca';
export interface FonteRiconciliazione { titolo: string; url: string }
export interface DecisioneCondizioni {
  revisione: number;
  azione: AzioneRiconciliazione;
  data: string;
  improntaFonte: string;
  revisioneManifest: string;
}
export interface FormulaRiconciliazione {
  valore: RequisitoSpillo[] | null;
  testo: string[];
  errore: string | null;
}
export interface DipendenzaRiconciliazione {
  tipo: string;
  chiave: string;
  nome: string;
  campo: string;
  formula: FormulaRiconciliazione | null;
  orari: string | null;
  casa: string | null;
  mancante: boolean;
}
export interface RigaRiconciliazioneDto {
  id: string;
  gruppo: string | null;
  tabella: TabellaRiconciliazione;
  chiave: string;
  nome: string;
  casa: string | null;
  fraseStorica: string | null;
  fraseAttuale: string | null;
  origine: string | null;
  nascosto: boolean;
  notaConservata: string;
  classeStorica: 'M' | 'E' | 'R' | null;
  analisi: AnalisiRiconciliazione;
  propostaTesto: string;
  fonti: FonteRiconciliazione[];
  destinazione: { tabella: TabellaRiconciliazione; chiave: string; campo: 'condizioni_json' | 'sblocco_json' } | null;
  condizioniProprie: FormulaRiconciliazione;
  fontiEreditate: DipendenzaRiconciliazione[];
  formulaProposta: FormulaRiconciliazione | null;
  esitoFonte: 'presente-identica' | 'mutata' | 'nuova' | 'assente';
  esitoFormula: 'coincide' | 'diversa' | 'non-confrontabile' | 'da-ricercare';
  auditMigrazioni: Array<{ migrazione: number; esito: 'applicata' | 'gia-corretta' | 'esclusa'; motivo: string }>;
  /** A12: fonte corrente distinta dai due esiti storici della135. Nessuna disponibilità o bonifica inferita. */
  fonteConfidente?: FonteConfidenteAttivitaDto | null;
  statoAuditConfidente?: 'assente' | 'illeggibile' | 'leggibile';
  /** I71: compatibilità tecnica con il gesto, distinta da identità canonica, disponibilità ed esito della136. */
  informazioneAcquisto?: { tipo: 'aojiru'; regola: string; compatibilitaTecnicaRegistrazione: boolean; motivi: string[] };
  statoAuditAcquisto?: 'assente' | 'illeggibile' | 'leggibile';
  decisione: (DecisioneCondizioni & { daRiconfermare: boolean; storico: DecisioneCondizioni[] }) | null;
  azioniConsentite: AzioneRiconciliazione[];
  improntaFonte: string;
  revisioneAttesa: string;
}
export interface RiconciliazioneCondizioniDto {
  versione: 1;
  revisioneManifest: string;
  completo: true;
  totali: { storiche: number; presenti: number; mutate: number; nuove: number; assenti: number; daRicercare: number; confermate: number; daRiconfermare: number };
  righe: RigaRiconciliazioneDto[];
}
export interface DecisioneCondizioniInput { id: string; azione: AzioneRiconciliazione; revisioneAttesa: string }
