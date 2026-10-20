---
name: feedback-test-non-a-ogni-run
description: i test restano nel repo ma non si eseguono a ogni modifica né nella pipeline; mai cancellarli
metadata:
  node_type: memory
  type: feedback
  originSessionId: e607dac6-f330-471d-b336-bd3dc2c5c00f
  modified: 2026-10-17T23:35:23.730Z
---

I file di test NON si cancellano, ma non si eseguono a ogni modifica né a ogni run della pipeline (il passo «Tests» è stato tolto da `ci.yml` il 2026-10-18). Si lanciano su richiesta, solo sul punto o sull'area in sviluppo (`npx vitest run <percorso>` o il workflow «Test su richiesta», `.github/workflows/test-su-richiesta.yml`), mai su tutto («devono essere lanciati on demand su singoli punti e aree... non cross su tutto»). Niente varianti rosse, niente giri ripetuti.

**Why:** l'utente (2026-10-18): «troppi test troppi giri», «1800 test per un fe fatto male», «non devi cancellare i file di test devi evitare che i test vengano eseguiti ad ogni run e ad ogni modifica», «voglio che le cose le fai e basta».

**How to apply:** dopo una modifica: typecheck + lint (+ i test del file toccato, se servono) e via a commit/push. Vedi [[feedback-validare-alla-fine]].
