// Descrizioni L11 · B11: correggere e rimettere com'era ciò che la guida dice (quartieri, trofei, Doti, trasformazioni di Jose, personaggi, sfide, completamento, oggetti della guida, Jose).
import type { DescrizioniArea } from '../tipi.js';

export const DESCRIZIONI_CORREZIONI: DescrizioniArea = {
  'GET /api/correzioni': {
    sommario: 'Elenca le correzioni attive ai dati della guida',
    descrizione: 'Solo gli oggetti in cui almeno un campo è diverso dalla guida, con i campi corretti e l’ultimo aggiornamento. tipo filtra per tipo di oggetto. Una correzione a un blocco della guida che la guida di oggi non accoglie più (l’elemento è sparito o il valore ha cambiato tipo) compare con orfana=true: non si applica e non si cancella.',
    risposta: 'Elenco di RiepilogoCorrezioneDto',
    errori: [[404, 'tipo-non-modificabile']],
  },
  'GET /api/correzioni/:tipo/:chiave': {
    sommario: 'Scheda di modifica di un oggetto della guida',
    descrizione: 'I campi che si possono correggere con il valore che le pagine mostrano adesso, il valore della guida e se il campo è corretto. La chiave è quella dell’oggetto nella sua pagina (con le barre codificate); per le sezioni a chiave fissa (fabbricazione, armi, abiti, Magnate, Covo, jose…) è il nome della sezione. I campi che la guida non ha per quell’oggetto non compaiono. guidaCambiata elenca i campi la cui guida è cambiata dopo la correzione.',
    risposta: 'SchedaCorrezioneDto',
    errori: [[404, 'tipo-non-modificabile'], [404, 'elemento-della-guida-non-trovato'], [409, 'guida-non-disponibile'], [409, 'elemento-ambiguo']],
  },
  'PUT /api/correzioni/:tipo/:chiave': {
    sommario: 'Corregge i campi inviati di un oggetto della guida',
    descrizione: 'campi ha per chiave l’indirizzo del campo nella scheda. Un valore uguale a quello della guida toglie la correzione di quel campo. Le identità (chiavi che altre tabelle usano), gli ordinamenti e i campi di altre parti non si correggono da qui (400 campo-non-modificabile). I testi si ripuliscono dagli spazi ai capi; il vuoto vale null dove il campo lo ammette. Per i quartieri il nome si propaga alla mappa e ai percorsi (gli indirizzi vecchi restano come alias). Per le Doti le soglie devono crescere dal primo rango a zero punti. La prima correzione di una riga conserva la fotografia della guida per Ripristina; i blocchi JSON della guida non si riscrivono mai.',
    risposta: 'SchedaCorrezioneDto aggiornata',
    errori: [[400, 'campo-non-modificabile'], [400, 'valore-non-valido'], [404, 'tipo-non-modificabile'], [404, 'elemento-della-guida-non-trovato'], [409, 'soglie-non-valide'], [409, 'guida-non-disponibile'], [409, 'elemento-ambiguo'], [409, 'nome-mappa-duplicato']],
  },
  'POST /api/correzioni/:tipo/:chiave/ripristina': {
    sommario: 'Rimette i valori della guida di un oggetto',
    descrizione: 'Rimette il valore della guida per tutti i campi corretti dell’oggetto, o solo per quelli indicati in campi. Non elimina nulla, non crea voci da rivedere e non legge pacchetti esterni: il valore della guida è quello che il dato aveva prima della prima correzione. Il corpo è {} per rimettere tutto. 409 nessuna-correzione se non c’è niente da rimettere. Una trasformazione di Jose si rimette solo se i due oggetti della guida esistono ancora nel catalogo.',
    risposta: 'EsitoRipristinoCorrezioneDto',
    errori: [[400, 'campo-non-modificabile'], [404, 'tipo-non-modificabile'], [404, 'elemento-della-guida-non-trovato'], [409, 'nessuna-correzione'], [409, 'oggetto-originale-mancante'], [409, 'guida-non-disponibile'], [409, 'elemento-ambiguo'], [409, 'nome-mappa-duplicato']],
  },
};
