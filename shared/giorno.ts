// ============================================================
// Il giorno di gioco modificabile (R9-19) — tipi condivisi dell'editor del giorno
// ============================================================

export const METEO_GIORNO = ['Sereno', 'Nuvoloso', 'Pioggia', 'Neve'] as const;
export type MeteoGiorno = (typeof METEO_GIORNO)[number];

/** Il giorno com'è adesso, con quel che l'editor cambia: meteo nelle due fasce, nota e flag, trama, vincoli. */
export interface GiornoModificabileDto {
  data: string;
  meteoGiorno: MeteoGiorno | null;
  meteoSera: MeteoGiorno | null;
  notaMeteo: string | null;
  /** Il meteo del giorno è una divergenza fra le fonti, da verificare in gioco (il 24 maggio). */
  meteoDaVerificare: boolean;
  trama: string;
  vincoli: string[];
  /** Vero se qualcosa è stato cambiato rispetto alla guida: «Ripristina» lo riporta com'era. */
  modificato: boolean;
}

/** Le sole voci che l'editor cambia; un campo omesso resta com'è. */
export interface ModificaGiorno {
  meteoGiorno?: MeteoGiorno | null;
  meteoSera?: MeteoGiorno | null;
  notaMeteo?: string | null;
  meteoDaVerificare?: boolean;
  trama?: string;
  vincoli?: string[];
}
