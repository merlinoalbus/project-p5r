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
//
// Le categorie (richiesta dell'utente del 2026-11-02: «voglio poter raggruppare per categorie (chiudibili e apribili) gli Appunti Fissi nonchè
// riordinarli con click e trascina all'interno di gruppi o della lista di Appunti fissi»; migrazione utente 067): un appunto sta in una
// categoria o nella lista senza categoria (`categoriaId` null), e il suo `ordine` è il posto dentro quel gruppo. Le categorie hanno un loro
// ordine. Eliminando una categoria i suoi appunti non si perdono: vanno in fondo alla lista senza categoria, nel loro ordine.
// I limiti stanno qui, una volta sola: li leggono lo schema zod del server, il vincolo della tabella (scritto con gli stessi numeri nella
// migrazione, che è congelata) e i campi del modulo nel frontend.
// ============================================================

/** Il titolo: da 1 a 80 caratteri, senza spazi ai capi. */
export const LIMITE_TITOLO_APPUNTO = 80;
/** Il testo: da 1 a 200.000 caratteri (un blocco di molte voci del Diario ci sta con margine). */
export const LIMITE_TESTO_APPUNTO = 200_000;
/** Quanti appunti si tengono al massimo, in tutto. */
export const LIMITE_APPUNTI = 500;
/** Il nome di una categoria: da 1 a 40 caratteri, senza spazi ai capi, unico senza distinguere le maiuscole. */
export const LIMITE_NOME_CATEGORIA = 40;
/** Quante categorie si tengono al massimo. */
export const LIMITE_CATEGORIE = 50;

/** Un appunto fisso. */
export interface AppuntoFissoDto {
  id: number;
  titolo: string;
  testo: string;
  /** La categoria, o null: la lista senza categoria. */
  categoriaId: number | null;
  /** Il posto nel suo gruppo (la categoria, o la lista senza categoria), da 0. */
  ordine: number;
  creatoIl: string;
  aggiornatoIl: string;
}

/** Una categoria degli appunti fissi. */
export interface CategoriaAppuntiDto {
  id: number;
  nome: string;
  /** Il posto fra le categorie, da 0. */
  ordine: number;
  creatoIl: string;
  aggiornatoIl: string;
}

/** Tutto quello che la finestra mostra, letto insieme: le categorie nel loro ordine e gli appunti per gruppo, ognuno nel suo ordine. */
export interface AppuntiFissiDto {
  categorie: CategoriaAppuntiDto[];
  appunti: AppuntoFissoDto[];
}

/** Un appunto nuovo: va in fondo al suo gruppo (senza `categoriaId`, o null, nella lista senza categoria). */
export interface NuovoAppuntoFisso {
  titolo: string;
  testo: string;
  categoriaId?: number | null;
}

/** La modifica di un appunto: almeno un campo. Una categoria diversa lo porta in fondo a quel gruppo. */
export interface ModificaAppuntoFisso {
  titolo?: string;
  testo?: string;
  categoriaId?: number | null;
}

/** Il posto nuovo di un appunto: il gruppo (null = senza categoria) e il posto che avrà lì, contato dopo averlo tolto dal suo. */
export interface PostoAppuntoFisso {
  categoriaId: number | null;
  indice: number;
}

/** Una categoria nuova (va in fondo alle categorie) o il suo nome nuovo. */
export interface NomeCategoriaAppunti {
  nome: string;
}

/** Il posto nuovo di una categoria fra le categorie. */
export interface PostoCategoriaAppunti {
  indice: number;
}
