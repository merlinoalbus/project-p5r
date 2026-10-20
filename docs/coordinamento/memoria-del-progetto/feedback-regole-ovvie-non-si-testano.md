---
name: feedback-regole-ovvie-non-si-testano
description: "Quando l'utente chiede «è corretto che…» su una cosa che viola una sua regola, è una domanda retorica: si apre il difetto e si corregge, senza commissionare misure o test"
metadata:
  node_type: memory
  type: feedback
  originSessionId: cffd8da6-5996-4013-b5ec-2c69430948db
  modified: 2026-10-20T06:04:19.022Z
---

Se l'utente chiede «è corretto che…?» su qualcosa che va palesemente contro una sua regola già scritta, per esempio le due barre di scorrimento contro la regola degli scroll annidati, la domanda è retorica. Si apre subito il difetto e lo si assegna a chi corregge. Non si fanno fare misure o test per «verificare» prima.

**Why:** il 2026-10-20 il PM ha mandato Test UX a misurare le due barre di Mappe. L'utente ha risposto: «era una domanda retorica... ovviamente non va bene non serve nessun test».

**How to apply:** confronto la segnalazione con le regole in memoria (per esempio [[feedback-scroll-annidati]]). Se la viola, è un difetto e lo si corregge; il test serve solo dopo la correzione.
