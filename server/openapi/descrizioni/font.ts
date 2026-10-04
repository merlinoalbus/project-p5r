// ============================================================
// descrizioni/font — le rotte di /api/font: i caratteri dell'utente per i ruoli tipografici (display, menu, decor)
// ============================================================

import type { DescrizioniArea } from '../tipi.js';

/** Le descrizioni delle rotte di `server/routes/font.ts` (servizio `fontService`: un file per ruolo in `DATA_DIR/font`, nessuna tabella). */
export const DESCRIZIONI_FONT: DescrizioniArea = {
  'GET /api/font': {
    sommario: 'Stato dei tre ruoli tipografici: font caricato o predefinito',
    descrizione: 'Per ognuno dei ruoli `display`, `menu` e `decor` dice se l\'utente ha caricato un carattere (file `<ruolo>.<formato>` nella cartella `font` dei dati dell\'istanza) con formato, dimensione, data di modifica e indirizzo del file. Un ruolo senza file usa il font predefinito incluso nel frontend. I caratteri non stanno nel database: non viaggiano con il pacchetto di gioco, ma entrano nello ZIP dell\'istanza.',
    risposta: 'Elenco di tre `FontDto` (ruolo, presente, formato, byte, aggiornato, url; senza file: presente false, formato e url null)',
  },
  'GET /api/font/:ruolo/file': {
    sommario: 'Il file del carattere caricato per un ruolo',
    descrizione: 'Manda il file così com\'è, con il tipo MIME del suo formato (`font/ttf`, `font/otf`, `font/woff`, `font/woff2`) e `Cache-Control: private, no-cache`, così una sostituzione si vede subito. 404 se per quel ruolo non c\'è nessun file caricato.',
    risposta: 'Il file del carattere',
    rispostaBinaria: 'font/*',
    errori: [[404, 'font-non-caricato']],
  },
  'PUT /api/font/:ruolo': {
    sommario: 'Carica o sostituisce il carattere di un ruolo',
    descrizione: 'Il corpo è il file grezzo, con qualunque `Content-Type`: il formato si riconosce dai primi quattro byte (TTF, OTF, WOFF, WOFF2), non dall\'intestazione dichiarata. Massimo 4 MB: oltre, il corpo è rifiutato con 413 (`corpo-troppo-grande`). Il file si scrive in un temporaneo e poi si rinomina; i file dello stesso ruolo in altri formati vengono tolti, quindi per ruolo resta un solo carattere.',
    risposta: 'Lo stato del ruolo dopo il caricamento, `FontDto`',
    corpoBinario: 'application/octet-stream',
    errori: [[400, 'corpo-non-font'], [400, 'font-vuoto'], [400, 'font-troppo-grande'], [400, 'formato-font-non-ammesso'], [413, 'corpo-troppo-grande']],
  },
  'DELETE /api/font/:ruolo': {
    sommario: 'Rimuove il carattere caricato per un ruolo (torna il predefinito)',
    descrizione: 'Cancella il file del ruolo dalla cartella `font` dei dati dell\'istanza; da quel momento il frontend usa il font predefinito incluso. 404 se per quel ruolo non c\'era nessun file caricato.',
    risposta: 'Nessun contenuto (204)',
    errori: [[404, 'font-non-caricato']],
  },
};
