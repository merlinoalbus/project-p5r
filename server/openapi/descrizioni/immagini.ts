// ============================================================
// descrizioni/immagini — le rotte di /api/immagini: immagini dell'istanza nel database (tabella `immagine`)
// ============================================================

import type { DescrizioniArea } from '../tipi.js';

/**
 * Le descrizioni delle rotte di `server/routes/immagini.ts` (servizio `immaginiService`). Due gruppi di ambiti (`shared/immagini.ts`):
 * quelli di caricamento (arcana, confidente, personaggio, persona, skill, mappa, spillo, altro) e quelli della grafica predefinita
 * (mappe, sfondi, confidenti…), tutti con il contenuto dentro il database di gioco.
 */
export const DESCRIZIONI_IMMAGINI: DescrizioniArea = {
  'GET /api/immagini': {
    sommario: 'Elenco delle immagini caricate, di un ambito o di tutti gli ambiti di caricamento',
    descrizione: 'Solo metadati, mai i byte: per i file c\'è `/api/immagini/{ambito}/{chiave}/file`. Con `ambito` (uno degli ambiti di caricamento) elenca quell\'ambito ordinato per chiave; senza, tutte le immagini degli ambiti di caricamento, per ambito e chiave. La grafica predefinita non compare qui: è nel manifesto.',
    risposta: 'Elenco di `ImmagineDto` (id, ambito, chiave, mime, byte, url del file, createdAt, origineUrl)',
  },
  'GET /api/immagini/manifest': {
    sommario: 'Il manifesto della grafica predefinita nel database (chiave → URL versionato)',
    descrizione: 'Le immagini degli ambiti predefiniti che hanno contenuto, con chiave «ambito/chiave» (es. `mappe/tokyo`) e URL del file con `?v=` uguale alla data di salvataggio: ogni sostituzione cambia l\'URL, così il file può stare in cache a lungo. Risposta con `Cache-Control: no-store`, perché il manifesto cambia a ogni sostituzione o importazione del pacchetto.',
    risposta: '`ManifestImmaginiDto` (`{ generato, totale, file }`)',
  },
  'DELETE /api/immagini': {
    sommario: 'Rimuove in blocco le immagini caricate di un ambito o di tutti gli ambiti di caricamento',
    descrizione: 'Con `ambito` toglie tutte le immagini di quell\'ambito di caricamento; senza, quelle di tutti gli ambiti di caricamento. La grafica predefinita non si tocca mai (la query accetta solo gli ambiti di caricamento). La cancellazione è definitiva: le immagini stanno solo nel database di gioco.',
    risposta: '`{ eliminate }`: il numero di immagini rimosse',
  },
  'GET /api/immagini/:ambito/:chiave': {
    sommario: 'I metadati di un\'immagine',
    descrizione: 'Vale per ogni ambito, anche per quelli della grafica predefinita. Per l\'ambito `mappa` la chiave si riconduce all\'identità della mappa (alias e chiavi native portano alla stessa immagine). 404 se per (ambito, chiave) non c\'è nessuna riga.',
    risposta: '`ImmagineDto`',
    errori: [[404, 'immagine-non-trovata']],
  },
  'GET /api/immagini/:ambito/:chiave/file': {
    sommario: 'Il file di un\'immagine, letto dal database',
    descrizione: 'Manda il contenuto con il suo tipo MIME (PNG, JPEG, WEBP, GIF o SVG) e un `ETag` stabile finché la riga non cambia; con `If-None-Match` uguale risponde 304 senza corpo. Con un parametro `v` non vuoto (URL versionato del manifesto) la risposta è `private, max-age=31536000, immutable`; senza, `private, no-cache`, così una sostituzione si vede subito. Per l\'ambito `mappa` la chiave si riconduce all\'identità della mappa. 404 se la riga manca o se è registrata senza contenuto.',
    risposta: 'Il file dell\'immagine',
    rispostaBinaria: 'image/*',
    errori: [[404, 'immagine-non-trovata'], [404, 'immagine-file-mancante']],
  },
  'PUT /api/immagini/:ambito/:chiave': {
    sommario: 'Carica o sostituisce l\'immagine di (ambito, chiave)',
    descrizione: 'Il corpo è il file grezzo con `Content-Type` `image/*`: con un altro tipo il corpo non viene letto e la richiesta è rifiutata (`corpo-non-immagine`). Formati ammessi PNG, JPEG, WEBP, GIF e SVG, fino a 8 MB (oltre, 413 `corpo-troppo-grande`). Una sola immagine per (ambito, chiave): il caricamento sostituisce quella che c\'era, anche della grafica predefinita, e azzera l\'indirizzo d\'origine. Per l\'ambito `mappa` la chiave si riconduce all\'identità della mappa.',
    risposta: 'I metadati dell\'immagine salvata, `ImmagineDto`',
    corpoBinario: 'image/*',
    errori: [[400, 'corpo-non-immagine'], [400, 'formato-non-ammesso'], [400, 'immagine-vuota'], [400, 'immagine-troppo-grande'], [413, 'corpo-troppo-grande']],
  },
  'POST /api/immagini/:ambito/:chiave/da-url': {
    sommario: 'Scarica un\'immagine da un indirizzo web e la salva per (ambito, chiave)',
    descrizione: 'Il server scarica l\'indirizzo indicato (solo http/https, redirect seguiti, al più 20 secondi di attesa della risposta e 120 secondi di trasferimento fermo) con il tetto di 8 MB applicato mentre i dati arrivano, poi la salva come un caricamento: il tipo dichiarato dal sito deve essere PNG, JPEG, WEBP, GIF o SVG, e l\'immagine sostituisce quella che c\'era. L\'indirizzo indicato resta in `origineUrl`. Un sito che non risponde, risponde con un errore o senza contenuto dà 400 `download-fallito`.',
    risposta: 'I metadati dell\'immagine salvata, `ImmagineDto`',
    errori: [[400, 'url-non-valido'], [400, 'download-fallito'], [400, 'immagine-troppo-grande'], [400, 'formato-non-ammesso']],
  },
  'DELETE /api/immagini/:ambito/:chiave': {
    sommario: 'Elimina l\'immagine di (ambito, chiave)',
    descrizione: 'Toglie la riga dal database di gioco, contenuto compreso; vale per ogni ambito, anche per la grafica predefinita. Per l\'ambito `mappa` la chiave si riconduce all\'identità della mappa. 404 se non c\'era nessuna immagine.',
    risposta: 'Nessun contenuto (204)',
    errori: [[404, 'immagine-non-trovata']],
  },
};
