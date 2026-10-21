---
name: feedback-zero-test
description: "Dal 2026-10-20 sera, «zero test, i test poi li faccio io»: niente sessioni di prova, niente cicli dei tester né validatore; si implementa tutto, typecheck e lint verdi, si pubblica su p5s e l'utente prova"
metadata:
  node_type: memory
  type: feedback
  originSessionId: cffd8da6-5996-4013-b5ec-2c69430948db
  modified: 2026-10-20T18:28:58.102Z
---

**Aggiornamento 2026-10-21:** l'utente richiede ora un agente distinto che verifichi ogni consegna accedendo alla specifica originale in modo avversariale. Il divieto storico di verificatori sotto è superato da [questa disposizione](feedback-verifica-avversariale.md); resta il divieto di scrivere/eseguire test. Non riattivare cicli di collaudo o prove sui dati.

L'utente, il 2026-10-20 verso le 18:35Z, dopo i ritardi e gli errori nella chiusura di L3: «finisci di implementare tutto», «zero test», «i test poi li faccio io».

**Why:** il giro collaudo → quattro tester → validatore rallentava molto, e non ha comunque intercettato la mancanza che l'utente ha trovato da solo. L'utente preferisce provare lui sull'app pubblicata.

**How to apply:**
- Niente sessioni di prova (funzionali, UX, layout, no-reg), niente cicli del Collaudo, niente galaxy-task-validator, niente test Vitest nuovi o lanciati. Gli implementatori non scrivono test.
- Restano obbligatori: **typecheck e lint verdi**, che la pipeline controlla, e l'analisi del codice esistente prima di cambiarlo.
- Restano anche i vincoli sui dati: p5s non si sovrascrive, `main` e la produzione non si toccano, le migrazioni non distruggono il lavoro da preservare.
- Si implementa tutto il richiesto, si pubblica su `newreview` (p5s) e si avvisa l'utente di cosa provare.
- Supera, per la parte dei test, CLAUDE.md §2–3 e [[feedback-validare-alla-fine]].
