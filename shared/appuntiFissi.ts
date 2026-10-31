// ============================================================
// Appunti fissi del Diario — le voci che si ripetono, tenute a portata di mano in una finestra fluttuante (2026-10-31, C7)
// ============================================================
//
// Richiesta dell'utente: «mi farebbe comodo avere una sorta di clipboard su finestra fluttuante dove possa io inserire e mantenere salvati
// delle voci che tendono a ripetersi nel diario... per averli a portata di mano quando voglio inserirne una nuova occorrenza»; «deve essere
// possibile spostare la finestra di clipboard, ridurla a icona o riportarla a dimensione originaria, e al click su una voce deve mettermi in
// memoria CTRL+C la relativa voce». Proposta approvata: «Sì, sul server».
//
// Un appunto è un titolo («DOMANDA IN CLASSE», «TELEVENDITA», «STUDIA») e il testo intero, di norma quello che «Copia» del Diario scrive
// negli appunti di sistema (compreso il blocco delle voci in fondo, che Ctrl+V nel Diario riconosce). Vive nei dati utente (`partite.db`,
// migrazione utente 058) e NON è di una partita: gli stessi appunti su PC, tablet e telefono. Solo nell'istanza di preparazione.
// I limiti stanno qui, una volta sola: li leggono lo schema zod del server, il vincolo della tabella (scritto con gli stessi numeri nella
// migrazione, che è congelata) e i campi del modulo nel frontend.
// ============================================================

/** Il titolo: da 1 a 80 caratteri, senza spazi ai capi. */
export const LIMITE_TITOLO_APPUNTO = 80;
/** Il testo: da 1 a 200.000 caratteri (un blocco di molte voci del Diario ci sta con margine). */
export const LIMITE_TESTO_APPUNTO = 200_000;
/** Quanti appunti si tengono al massimo (il riordino manda l'elenco intero). */
export const LIMITE_APPUNTI = 500;

/** Un appunto fisso. */
export interface AppuntoFissoDto {
  id: number;
  titolo: string;
  testo: string;
  /** Il posto nell'elenco, da 0. */
  ordine: number;
  creatoIl: string;
  aggiornatoIl: string;
}

/** Un appunto nuovo: va in fondo all'elenco. */
export interface NuovoAppuntoFisso {
  titolo: string;
  testo: string;
}

/** La modifica di un appunto: almeno uno dei due campi. */
export interface ModificaAppuntoFisso {
  titolo?: string;
  testo?: string;
}

/** Il nuovo ordine: TUTTI gli id dell'elenco, ognuno una volta, nell'ordine voluto. */
export interface OrdineAppuntiFissi {
  ids: number[];
}
