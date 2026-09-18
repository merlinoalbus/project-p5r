// ============================================================
// limitiGuida — quanto può essere lungo ogni testo della guida, detto una volta sola
// ============================================================
//
// I tetti dei campi sono finiti due volte nel codice — nello schema del server e nel `maxLength`
// del modulo — e si sono subito disallineati: il campo lasciava scrivere mille caratteri dove la
// rotta ne accettava duecento, e il salvataggio tornava indietro con un 400 senza che si capisse
// quale campo fosse di troppo. Prima ancora, un tetto scelto a occhio (200 sul livello consigliato,
// dove la guida ne scrive 352) rendeva impossibile salvare la scheda di un Palazzo.
//
// Perciò i tetti stanno qui, e li leggono **sia lo schema sia il modulo**: disallinearli richiede
// di modificare questo file, e un test controlla che nessun dato di gioco li superi già.
//
// I valori vengono dai massimi osservati nel pacchetto, con margine abbondante: la prosa più lunga
// è una nota di Palazzo da 3938 caratteri, il nome di mappa più lungo ne ha 118.
// ============================================================

export const LIMITI_GUIDA = {
  dungeon: { nome: 200, sovrano: 400, data: 1000, livello: 1000, note: 8000 },
  area: { nome: 300, descrizione: 8000 },
  punto: { nome: 300, descrizione: 8000 },
  // Il nome di una mappa finisce nella chiave leggibile del percorso, che il server tiene sotto i
  // 180 caratteri **compreso il prefisso del genitore**: oltre quel tetto la rotta risponde
  // «percorso-troppo-lungo» e dice di abbreviare. Qui sta il massimo teorico; quello pratico
  // dipende da dove sta la mappa, e lo dice il server con un messaggio che si capisce.
  mappa: { nome: 180, note: 2000, gruppoNome: 200, etichetta: 200 },
  // Gli spilli non sono testi della guida, ma hanno gli stessi due posti dove scrivere un tetto —
  // lo schema della rotta e il campo dell'editor — e la stessa deriva: stanno qui per non ripeterla.
  spillo: { nome: 160, descrizione: 2000 },
} as const;
