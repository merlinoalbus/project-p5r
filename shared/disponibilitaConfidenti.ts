/** Informazioni descrittive: non sono requisiti operativi né un calendario di incontri. */
export interface InformazioniConfidente {
  giorni: string[];
  fasce: string[];
  luogo: string;
  sbloccoData: string;
  sbloccoRequisiti: string;
  note: string;
  noteGenerali: string;
  fonti: string[];
}

export const CAMPI_INFORMAZIONI_CONFIDENTE = ['giorni', 'fasce', 'luogo', 'sbloccoData', 'sbloccoRequisiti', 'note', 'noteGenerali', 'fonti'] as const;
export type CampoInformazioniConfidente = typeof CAMPI_INFORMAZIONI_CONFIDENTE[number];
export const ETICHETTE_INFORMAZIONI_CONFIDENTE: Record<CampoInformazioniConfidente, string> = {
  giorni: 'Giorni (informazioni)', fasce: 'Fasce orarie (informazioni)', luogo: 'Luoghi degli incontri',
  sbloccoData: 'Data indicata nella guida', sbloccoRequisiti: 'Requisiti descritti nella guida',
  note: 'Note sulla disponibilità', noteGenerali: 'Note generali', fonti: 'Fonti',
};

/** Le stringhe JSON restano grezze per non normalizzare campi non selezionati o fotografie storiche. */
export interface InformazioniConfidenteRaw {
  giorni_json: string;
  fasce_json: string;
  luogo: string;
  sblocco_data: string;
  sblocco_requisiti: string;
  note: string;
  note_generali: string;
  fonti_json: string;
}

export type AzioneInformazioniConfidente =
  | { azione: 'applica-proposta'; proposta: 'makoto-calendario-v1'; revisioneAttesa: string }
  | { azione: 'modifica-manuale'; valori: Partial<InformazioniConfidente>; motivo: string; revisioneAttesa: string }
  | { azione: 'crea-informazioni'; valori: InformazioniConfidente; motivo: string; revisioneAttesa: string }
  | { azione: 'ripristina-versione'; versione: number; revisioneAttesa: string };
export type SalvaInformazioniConfidente = AzioneInformazioniConfidente & { anteprimaAttesa: string; operazioneId: string };

export interface VersioneInformazioniConfidente {
  id: number;
  data: string | null;
  azione: string;
  motivo: string;
  raw: InformazioniConfidenteRaw;
  errori: string[];
}
export interface EditorInformazioniConfidenteDto {
  confidente: { chiave: string; nome: string };
  correnteRaw: InformazioniConfidenteRaw | null;
  valori: Partial<InformazioniConfidente>;
  errori: string[];
  revisioneAttesa: string;
  proposta: { id: 'makoto-calendario-v1'; titolo: string; fonti: string[]; applicabile: boolean; motivo: string } | null;
  bonifica: { esito: 'applicata' | 'esclusa' | 'assente'; motivo: string } | null;
  versioni: VersioneInformazioniConfidente[];
}
export interface AnteprimaInformazioniConfidenteDto {
  primaRaw: InformazioniConfidenteRaw | null;
  dopoRaw: InformazioniConfidenteRaw;
  campiCambiati: CampoInformazioniConfidente[];
  avvertenze: string[];
  anteprimaAttesa: string;
}
export interface EsitoInformazioniConfidenteDto {
  esito: 'salvata' | 'invariata' | 'gia-eseguita';
  versione: number | null;
  corrente: EditorInformazioniConfidenteDto;
}
