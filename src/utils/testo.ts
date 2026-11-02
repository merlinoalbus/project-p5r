// ============================================================
// testo — normalizzazione e ricerca per parole (implementazione condivisa in shared/testo.ts)
// ============================================================
//
// `piatto` (senza accenti e minuscolo, con la punteggiatura) era copiato in Cruciverba, Domande, Richieste, articoli e Selettore (rilievo
// R4‴); ora vive in `shared/testo.ts` accanto alla ricerca per parole (`filtroRicerca`, `corrispondeRicerca`), che lo usa.

export { normalizzaTesto, corrispondeRicerca, filtroRicerca, paroleRicerca, piatto } from '../../shared/testo';
