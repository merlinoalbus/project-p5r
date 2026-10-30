/**
 * Informazioni descrittive del Confidente: solo note e fonti. Giorni, fasce, eccezioni, luoghi e sblocco hanno una sola sede, la
 * disponibilità strutturata e i requisiti di rango (L13, ondata 6, lotto O6-2, migrazione 307): qui non si modificano.
 */
export interface InformazioniConfidente {
  note: string;
  noteGenerali: string;
  fonti: string[];
}

export const CAMPI_INFORMAZIONI_CONFIDENTE = ['note', 'noteGenerali', 'fonti'] as const;
export type CampoInformazioniConfidente = typeof CAMPI_INFORMAZIONI_CONFIDENTE[number];
export const ETICHETTE_INFORMAZIONI_CONFIDENTE: Record<CampoInformazioniConfidente, string> = {
  note: 'Note sulla disponibilità', noteGenerali: 'Note generali', fonti: 'Fonti',
};

/**
 * La riga com'è nel database (e nelle versioni dello storico), con le stringhe JSON grezze per non normalizzare fotografie storiche.
 * Le cinque colonne in prosa di prima restano per lo storico: l'editor non le scrive più e un ripristino non le riporta.
 */
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
/** Le colonne della riga che l'editor scrive, per campo. */
export const COLONNE_INFORMAZIONI_CONFIDENTE: Record<CampoInformazioniConfidente, keyof InformazioniConfidenteRaw> = {
  note: 'note', noteGenerali: 'note_generali', fonti: 'fonti_json',
};
/** Le colonne di una versione storica che non si modificano più da qui (la loro sede è la disponibilità strutturata), con il nome da mostrare. */
export const COLONNE_STORICHE_CONFIDENTE: ReadonlyArray<{ colonna: keyof InformazioniConfidenteRaw; etichetta: string }> = [
  { colonna: 'giorni_json', etichetta: 'Giorni' }, { colonna: 'fasce_json', etichetta: 'Fasce orarie' },
  { colonna: 'luogo', etichetta: 'Luoghi degli incontri' }, { colonna: 'sblocco_data', etichetta: 'Data indicata nella guida' },
  { colonna: 'sblocco_requisiti', etichetta: 'Requisiti descritti nella guida' },
];

export type AzioneInformazioniConfidente =
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
