// ============================================================
// fontiTolte — il registro delle strutture eliminate dal database (L11, R11-05, R11-06)
// ============================================================
//
// Un solo elenco, aggiornato DA OGNI migrazione che toglie una tabella o una colonna: lo usano l'importazione del pacchetto (il riepilogo di
// ciò che un backup vecchio porta e questa versione non usa più) e il cestino (una riga eliminata prima del drop torna senza la colonna tolta,
// o è saltata con il motivo, invece di diventare irripristinabile). Regola: una voce NON si toglie mai da qui, nemmeno quando la migrazione che
// ha tolto la struttura è lontana: serve ai cestini e ai backup vecchi. Anche le etichette delle tabelle tolte in `cestinoService.ETICHETTE`
// restano, perché danno il nome leggibile alle righe saltate.
// ============================================================

export interface FonteTolta {
  schema: 'main' | 'utente';
  tabella: string;
  /** Null = la tabella intera. */
  colonna: string | null;
  /** Quale migrazione l'ha tolta, per esempio «L11 · migrazione 176». */
  tolta: string;
  /** Dove vive ora il dato, in italiano e per l'utente: «le planimetrie dell'Area (L2)». */
  sostituitaDa: string;
}

/** Le strutture tolte; ogni migrazione di eliminazione vi aggiunge la sua voce (mai si tolgono voci). */
export const FONTI_TOLTE: readonly FonteTolta[] = [
  {
    schema: 'main', tabella: 'marcatore_mappa', colonna: null, tolta: 'L11 · migrazione 176',
    sostituitaDa: 'i pin della guida (le schede dei punti sulle planimetrie): la posizione di una voce è quella della sua scheda',
  },
  {
    schema: 'main', tabella: 'marcatore_luogo', colonna: null, tolta: 'L11 · migrazione 176',
    sostituitaDa: 'i pin dei luoghi sulla mappa del quartiere; le posizioni di partenza restano nell’archivio «archivio-marcatori-e-piante-l11»',
  },
  {
    schema: 'main', tabella: 'pianta_area', colonna: null, tolta: 'L11 · migrazione 176',
    sostituitaDa: 'le planimetrie delle infiltrazioni (le piante non si scaricano più); URL, fonte e licenza restano nell’archivio «archivio-marcatori-e-piante-l11»',
  },
  {
    schema: 'main', tabella: 'mappa', colonna: 'entita_tipo', tolta: 'L11 · migrazione 177',
    sostituitaDa: 'la chiave e il tipo della mappa (il quartiere è «citta-…», il Palazzo o il dedalo «dungeon-…») e i legami dell’Area con le infiltrazioni',
  },
  {
    schema: 'main', tabella: 'mappa', colonna: 'entita_chiave', tolta: 'L11 · migrazione 177',
    sostituitaDa: 'la chiave e il tipo della mappa (il quartiere è «citta-…», il Palazzo o il dedalo «dungeon-…») e i legami dell’Area con le infiltrazioni',
  },
  {
    schema: 'main', tabella: 'mappa_entita', colonna: null, tolta: 'L11 · migrazione 177',
    sostituitaDa: 'i legami dell’Area con le infiltrazioni, la planimetria predefinita dell’Area per i luoghi e la chiave della mappa per quartieri e Palazzi; le righe non coperte restano nell’archivio «archivio-legami-e-presentazione-mappe-l11»',
  },
  {
    schema: 'main', tabella: 'mappa_presentazione', colonna: 'gruppo_immagini_json', tolta: 'L11 · migrazione 177',
    sostituitaDa: 'l’Area della planimetria (il nome della stanza) e la versione della mappa (etichetta e ordine); i gruppi non riproducibili restano nell’archivio «archivio-legami-e-presentazione-mappe-l11»',
  },
  {
    schema: 'main', tabella: 'guida_mappa', colonna: null, tolta: 'L11 · migrazione 177',
    sostituitaDa: 'il nome e la descrizione dell’infiltrazione (`dungeon_area`); i nomi che differivano restano nell’archivio «archivio-legami-e-presentazione-mappe-l11»; i nomi di prima delle infiltrazioni restano in `guida_alias`',
  },
  {
    schema: 'main', tabella: 'organizzazione_mappa_esito', colonna: null, tolta: 'L11 · migrazione 177',
    sostituitaDa: 'niente: la conversione delle vecchie mappe d’area in sezioni della guida è conclusa (la tabella era vuota)',
  },
  {
    schema: 'main', tabella: 'luogo', colonna: 'giorni', tolta: 'L11 · migrazione 184',
    sostituitaDa: 'gli orari del luogo (`orari_json`) e la disponibilità dei Confidenti; le frasi restano nell’archivio «archivio-frasi-l11»',
  },
  {
    schema: 'main', tabella: 'luogo', colonna: 'giorni_json', tolta: 'L11 · migrazione 184',
    sostituitaDa: 'gli orari del luogo (`orari_json`) e la disponibilità dei Confidenti; i valori restano nell’archivio «archivio-frasi-l11»',
  },
  ...(['altri_effetti', 'regole', 'premi'] as const).map((colonna): FonteTolta => ({
    schema: 'main', tabella: 'attivita', colonna, tolta: 'L9 · migrazione 203',
    sostituitaDa: 'il testo «dettagli» dell’attività (che la conteneva per intero) e gli effetti strutturati; i valori restano nell’archivio «archivio-frasi-l11»',
  })),
  {
    schema: 'main', tabella: 'attivita', colonna: 'paga', tolta: 'L9 · migrazione 203',
    sostituitaDa: 'la paga strutturata (`paga_yen`, `paga_massima`); le frasi restano nell’archivio «archivio-frasi-l11»',
  },
  {
    schema: 'main', tabella: 'articolo', colonna: 'disponibile_dal', tolta: 'L11 · migrazione 194',
    sostituitaDa: 'le condizioni dell’offerta (`condizioni_json`): il «disponibile dal» mostrato è generato da esse; i testi di prima restano nell’archivio «archivio-frasi-l11»',
  },
  {
    schema: 'main', tabella: 'luogo', colonna: 'sblocco', tolta: 'L11 · migrazione 218',
    sostituitaDa: 'le condizioni del luogo (`condizioni_json`) e gli inviti che lo aprono: la frase mostrata è generata da esse; le frasi (anche quelle con la data sbagliata) restano nell’archivio «archivio-frasi-l11», e il racconto del Confidente nella nota del luogo',
  },
  {
    schema: 'main', tabella: 'attivita', colonna: 'sblocco', tolta: 'L11 · migrazione 218',
    sostituitaDa: 'le condizioni dell’attività (`condizioni_json`): la frase mostrata è generata da esse; le frasi restano nell’archivio «archivio-frasi-l11»',
  },
  {
    schema: 'main', tabella: 'luogo', colonna: 'quando', tolta: 'L11 · migrazione 193',
    sostituitaDa: 'gli orari del luogo (`orari_json`): il visore e la scheda mostrano l’orario ricavato dai dati; i valori (anche dei luoghi che divergevano) restano nell’archivio «archivio-frasi-l11»',
  },
  {
    schema: 'main', tabella: 'negozio', colonna: 'orari', tolta: 'L11 · migrazione 184',
    sostituitaDa: 'gli orari strutturati del negozio (`orari_json`): la frase era la sua copia esatta',
  },
  {
    schema: 'main', tabella: 'negozio', colonna: 'sblocco', tolta: 'L11 · migrazione 184',
    sostituitaDa: 'le condizioni di sblocco del negozio e della sua sede (`sblocco_json`, `condizioni_json`); le frasi restano nell’archivio «archivio-frasi-l11»',
  },
  {
    schema: 'main', tabella: 'luogo', colonna: 'negozio', tolta: 'L11 · migrazione 187',
    sostituitaDa: 'i negozi della sede (`negozio.sede_chiave`): la chiave era la loro copia esatta',
  },
  {
    schema: 'main', tabella: 'luogo', colonna: 'attivita_json', tolta: 'L11 · migrazione 187',
    sostituitaDa: 'le attività della sede (`attivita.sede_chiave`); i tag liberi restano nell’archivio «archivio-frasi-l11»',
  },
  {
    schema: 'main', tabella: 'articolo', colonna: 'condizione', tolta: 'L11 · migrazione 187',
    sostituitaDa: 'le condizioni dell’offerta (`condizioni_json`); le frasi restano nell’archivio «archivio-frasi-l11»',
  },
  {
    schema: 'main', tabella: 'quartiere', colonna: 'sblocco', tolta: 'L11 · migrazione 188',
    sostituitaDa: 'la condizione di sblocco del quartiere (`condizioni_json`) con gli inviti dei Confidenti; le frasi della guida restano nell’archivio «archivio-frasi-l11»',
  },
  {
    schema: 'main', tabella: 'giorno_calendario', colonna: null, tolta: 'L11 · migrazione 189',
    sostituitaDa: 'il giorno unico (tabella `giorno`, L9): meteo in due fasce, tempo libero e settimana; il giorno della settimana si calcola dalla data',
  },
  {
    schema: 'main', tabella: 'giorno_percorso', colonna: null, tolta: 'L11 · migrazione 189',
    sostituitaDa: 'il giorno unico (tabella `giorno`, L9): fase, trama, vincoli e avvisi; le azioni del percorso sono le voci del Diario e la copia storica resta nell’archivio «archivio-giorno-percorso-azioni-l11»',
  },
  {
    schema: 'main', tabella: 'pianta_quartiere', colonna: null, tolta: 'L11 · migrazione 210',
    sostituitaDa: 'l’immagine dell’illustrazione del quartiere nel database (caricata, o la grafica predefinita «mappe/citta-…»); lo scarico dalla guida non esiste più; URL, pagina, fonte e licenza restano nell’archivio «archivio-pianta-quartiere-l11»',
  },
  ...(['libro', 'film', 'articolo'] as const).map((tabella): FonteTolta => ({
    schema: 'main', tabella, colonna: 'nome_it', tolta: 'L11 · migrazione 215',
    sostituitaDa: 'il nome del catalogo degli oggetti (`catalogo_oggetto.nome`), con l’inglese fra i nomi alternativi; i valori restano nell’archivio «archivio-frasi-l11»',
  })),
  {
    schema: 'main', tabella: 'dungeon', colonna: 'livello_consigliato', tolta: 'L8 · migrazione 335',
    sostituitaDa: 'il livello consigliato minimo e massimo del Palazzo (`livello_min`, `livello_max`), con il confronto delle fonti nella sua nota storica; i testi di prima restano nell’archivio «archivio-frasi-l11»',
  },
  {
    schema: 'main', tabella: 'richiesta', colonna: 'disponibile_dal', tolta: 'L8 · migrazione 337',
    sostituitaDa: 'le condizioni di sblocco della Richiesta (`condizioni_json`); i testi con un valore restano nell’archivio «archivio-frasi-l11»',
  },
  {
    schema: 'main', tabella: 'richiesta', colonna: 'scadenza', tolta: 'L8 · migrazione 337',
    sostituitaDa: 'la scadenza come data di gioco (`scadenza_data`) con la proroga; i testi con un valore restano nell’archivio «archivio-frasi-l11»',
  },
  {
    schema: 'main', tabella: 'richiesta', colonna: 'area', tolta: 'L8 · migrazione 337',
    sostituitaDa: 'il dedalo della Richiesta (`area_chiave`) con il suo nome; i nomi diversi da quello del dedalo restano nell’archivio «archivio-frasi-l11»',
  },
  {
    schema: 'main', tabella: 'negozio', colonna: 'luogo_chiave', tolta: 'L1 · migrazione 346',
    sostituitaDa: 'la sede del negozio (`sede_chiave`) e il quartiere della sua sede (`luogo.quartiere_chiave`): un negozio senza sede (quello del Palazzo di Niijima) non ha quartiere; i valori restano nell’archivio «archivio-frasi-l11»',
  },
  {
    schema: 'main', tabella: 'negozio', colonna: 'luogo', tolta: 'L1 · migrazione 346',
    sostituitaDa: 'la sede del negozio (`sede_chiave`) con il suo quartiere e la sua Area; ciò che il testo diceva in più (per esempio «edificio principale 1P») sta nelle note del negozio, e il testo originale resta nell’archivio «archivio-frasi-l11»',
  },
  {
    schema: 'main', tabella: 'negozio', colonna: 'condizioni_json', tolta: 'L1 · migrazione 346',
    sostituitaDa: 'lo sblocco del negozio (`sblocco_json`) e le condizioni della sua sede; la condizione propria del negozio passa nello sblocco; il valore originale resta nell’archivio «archivio-frasi-l11» (per le righe presenti quando la migrazione è girata)',
  },
  {
    schema: 'main', tabella: 'attivita', colonna: 'luogo_chiave', tolta: 'L1 · migrazione 346',
    sostituitaDa: 'la sede dell’attività (`sede_chiave`) e il quartiere della sua sede (`luogo.quartiere_chiave`); i valori restano nell’archivio «archivio-frasi-l11»',
  },
  ...(['effetto', 'statistiche', 'effetto_json'] as const).map((colonna): FonteTolta => ({
    schema: 'main', tabella: 'articolo', colonna, tolta: 'L1 · migrazione 346',
    sostituitaDa: 'l’oggetto del catalogo (`catalogo_oggetto`): l’effetto e le statistiche di un’offerta sono quelli del suo oggetto; la colonna era vuota in tutte le offerte',
  })),
  {
    schema: 'main', tabella: 'voce_giornata', colonna: 'produce_json', tolta: 'L6 · migrazione 362 (o utente 68 su un’istanza nuova)',
    sostituitaDa: 'gli effetti della voce (`voce_effetto`: un solo punto di modifica; per l’incontro dei Confidenti `confidente_dote_incontro`, per i turni le attività); il valore di prima (uid → testo) resta nell’archivio «archivio-frasi-l11», colonna «voce_giornata.produce_json», e il contenuto grezzo di allora in `voce_effetto_transizione.raw_json`',
  },
  {
    schema: 'utente', tabella: 'lettura_partita', colonna: null, tolta: 'L11 · migrazione utente 43',
    sostituitaDa: 'l’avanzamento di libri e film (`progresso_libro_partita`, `progresso_film_partita`): «letto» si calcola da lì',
  },
  {
    schema: 'utente', tabella: 'requisito_partita', colonna: null, tolta: 'L11 · migrazione utente 44',
    sostituitaDa: 'niente: le conferme a mano dei requisiti dei Confidenti non si leggevano più dalla R6-01b (la tabella era vuota)',
  },
];

export const tabellaTolta = (schema: string, tabella: string): FonteTolta | undefined =>
  FONTI_TOLTE.find((f) => f.schema === schema && f.tabella === tabella && f.colonna === null);

export const colonnaTolta = (schema: string, tabella: string, colonna: string): FonteTolta | undefined =>
  FONTI_TOLTE.find((f) => f.schema === schema && f.tabella === tabella && f.colonna === colonna);

/**
 * Un registro del cestino (o una riga) è compatibile con lo schema di oggi se ogni colonna di oggi c'è nella riga e ogni colonna in più è
 * dichiarata tolta: resta stretto per le colonne non dichiarate (una colonna aggiunta dopo la cattura continua a dare 409) e tollera solo quelle tolte.
 */
export function colonneCompatibili(schema: string, tabella: string, chiaviRiga: readonly string[], colonneOggi: readonly string[]): boolean {
  return colonneOggi.every((c) => chiaviRiga.includes(c)) && chiaviRiga.every((k) => colonneOggi.includes(k) || !!colonnaTolta(schema, tabella, k));
}
