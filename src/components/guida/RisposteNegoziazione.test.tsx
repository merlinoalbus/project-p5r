/** @vitest-environment jsdom */
// ============================================================
// Le risposte della negoziazione: si cerca la domanda, e ogni risposta dice a chi va bene
// ============================================================

// SUPERATI da R11-03/2 e R11-03/4: il componente `RisposteNegoziazione` era orfano (nessun importatore di produzione) ed è stato eliminato,
// e con lui `cercaDomande` (`utils/negoziazione.ts`), che non aveva altri usi. Corpi originali tolti per compilare; non eseguiti (zero test).
it.skip('SUPERATO da R11-03/4: cerca nella domanda e nelle risposte, con tutte le parole scritte', () => {});
it.skip('SUPERATO da R11-03/2: la ricerca riduce l’elenco a quel che l’Ombra ha davvero chiesto', () => {});
it.skip('SUPERATO da R11-03/2: ogni risposta dice a quale carattere va bene e a quale no', () => {});
it.skip('SUPERATO da R11-03/2: scelto il carattere, la risposta buona per lui viene prima', () => {});
it.skip('SUPERATO da R11-03/2: senza risultati lo dice, e dice anche perché', () => {});
