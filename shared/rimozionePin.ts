/** La precondizione riguarda l'identità originale, anche se l'ID numerico venisse riutilizzato. */
export interface RichiestaRimozionePin { spilloUid: string; revisioneRimozioneAttesa: string }
export interface PrecondizioneRimozionePinDto {
  spillo: { id: number; uid: string; nome: string; mappa: { chiave: string; nome: string } | null; areaGuida: string | null };
  contenuti: {
    immagini: number; voci: number; destinazioniEntranti: number; atterraggi: number; sedi: number;
    stati: number; divergenze: number; statiInfiltrazione: number; condizioniRiferite: number; riallineamento: boolean;
  };
  revisioneRimozioneAttesa: string;
}
