// ============================================================
// descrizioni/traduzioni — le rotte di /api/traduzioni: le rese italiane delle chiavi canoniche (tabella `traduzione`)
// ============================================================

import type { DescrizioniArea } from '../tipi.js';

/** Le descrizioni delle rotte di `server/routes/traduzioni.ts` (servizio `traduzioniService`). */
export const DESCRIZIONI_TRADUZIONI: DescrizioniArea = {
  'GET /api/traduzioni': {
    sommario: 'Elenco delle rese italiane, filtrabile per ambito, testo e voci modificate',
    descrizione: 'Legge la tabella `traduzione` dei dati di gioco, ordinata per ambito e chiave. `ambito` restringe a un solo ambito (es. `persona`, `skill`, `arcana`); `q` cerca il testo sia nella chiave canonica sia nella resa italiana (contiene, senza distinzione fra maiuscole e minuscole per le lettere ASCII); `soloUtente` tiene solo le voci modificate dall\'utente (`fonte = "utente"`). Senza filtri restituisce tutte le voci.',
    risposta: 'Elenco di `TraduzioneDto` (ambito, chiave, testo, extra, fonte `seed` | `utente`, updatedAt)',
  },
  'GET /api/traduzioni/ambiti': {
    sommario: 'Gli ambiti delle traduzioni con il numero di voci e di voci modificate',
    descrizione: 'Raggruppa la tabella `traduzione` per ambito, in ordine alfabetico: per ognuno quante voci ci sono e quante l\'utente ne ha modificate (`fonte = "utente"`). Serve a costruire il filtro per ambito della pagina delle traduzioni.',
    risposta: 'Elenco di `{ ambito, voci, modificate }`',
  },
  'PUT /api/traduzioni/:ambito/:chiave': {
    sommario: 'Modifica la resa italiana di una voce esistente',
    descrizione: 'Imposta il testo italiano della voce (ambito, chiave), che passa a `fonte = "utente"` con la data di modifica aggiornata. Si modificano solo voci che esistono già: la rotta non ne crea di nuove. La cache in memoria delle traduzioni viene invalidata, quindi ogni risposta successiva del compendio e delle altre aree usa subito la resa nuova. La modifica sta nei dati di gioco: un\'importazione del pacchetto di gioco la sostituisce.',
    risposta: 'La voce aggiornata, `TraduzioneDto`',
    errori: [[404, 'traduzione-non-trovata']],
  },
  'DELETE /api/traduzioni/:ambito/:chiave': {
    sommario: 'Ripristina la resa originale di una voce dal pacchetto di gioco del repository',
    descrizione: 'Non cancella la voce: rilegge in sola lettura la resa della stessa (ambito, chiave) dal pacchetto di gioco iniziale (`gioco.db` nella cartella del pacchetto, nel repository `pacchetto/gioco.db`) e la rimette, con `fonte = "seed"`. Risponde 404 se la voce non esiste nell\'istanza (`traduzione-non-trovata`) oppure se il pacchetto non la contiene o non è presente (`traduzione-seed-assente`). Invalida la cache in memoria delle traduzioni.',
    risposta: 'La voce ripristinata, `TraduzioneDto`',
    errori: [[404, 'traduzione-non-trovata'], [404, 'traduzione-seed-assente']],
  },
};
