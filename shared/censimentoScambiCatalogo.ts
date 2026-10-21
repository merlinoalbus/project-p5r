export type StatoSezioneScambi = 'assente' | 'null' | 'vuoto' | 'valido' | 'malformato' | 'non-supportato';
export interface CampoScambioCensimento {
  stato: 'assente' | 'null' | 'valido' | 'non-supportato';
  valore: string | number | null;
}
export interface NodoScambioCensimento {
  percorso: string;
  uid: string | null;
  stato: 'valido' | 'non-supportato';
  campi: Record<string, CampoScambioCensimento>;
}
export interface SezioneScambiCensimento {
  percorso: string;
  stato: StatoSezioneScambi;
  motivo: string | null;
  righe: NodoScambioCensimento[];
}
export interface VenditoreScambiCensimento extends NodoScambioCensimento {
  offerte: SezioneScambiCensimento;
}
export interface CensimentoScambiCatalogoDto {
  versione: 1;
  completo: true;
  significatoCompletezza: 'nessun-taglio-delle-righe-proiettate';
  jose: SezioneScambiCensimento;
  guida: Omit<SezioneScambiCensimento, 'righe'> & { righe: VenditoreScambiCensimento[] };
}
