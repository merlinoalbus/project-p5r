// ============================================================
// descrizioni/ricerca — la rotta di /api/ricerca: la ricerca globale per nome (L11, B3, R11-07…R11-10b)
// ============================================================

import type { DescrizioniArea } from '../tipi.js';

/** Le descrizioni delle rotte di `server/routes/ricerca.ts` (servizio `ricercaService`). */
export const DESCRIZIONI_RICERCA: DescrizioniArea = {
  'GET /api/ricerca': {
    sommario: 'Cerca per nome in tutta la guida: posti, oggetti, Persona, Confidenti, voci e giorni',
    descrizione: 'Sola lettura. Confronto senza maiuscole, accenti e punteggiatura, sul nome mostrato, sul nome originale e sui sinonimi del blocco `sinonimi-ricerca`; da 2 caratteri, tutte le parole del testo devono comparire nello stesso nome. I risultati sono raggruppati per tipo (`tipi` li limita, separati da virgola) e ordinati per qualità della corrispondenza: nome uguale, nome che comincia così, parola del nome, testo contenuto; i nomi altri contano dopo il nome. Ogni risultato porta il percorso nella gerarchia, la pagina (`casa`), l\'immagine con la regola unica e, per i luoghi e i negozi con `partita`, lo stato «Chiuso adesso» o «Non ancora nel mondo» con il motivo; un\'area «da verificare» porta il suo segno anche senza partita. Le cose nascoste dall\'utente non compaiono; i luoghi chiusi sì (la ricerca è consultazione, non navigazione). `limite` vale per gruppo (8 per predefinito, 50 al massimo); `totale` di ogni gruppo dice quanti corrispondono. Non cerca nei testi lunghi (descrizioni, diario).',
    risposta: 'RicercaGlobaleDto (shared/ricerca.ts): `q`, `totale` e i gruppi `GruppoRicercaDto` con i `RisultatoRicercaDto`',
    errori: [[400, 'validation-error'], [404, 'partita-non-trovata']],
  },
};
