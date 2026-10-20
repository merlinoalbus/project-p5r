---
name: implementatori-non-validano
description: "Nel team p5s chi implementa (BE, FE) non lancia validatori (galaxy-task-validator compreso) e non si convalida da solo"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 365ea5e8-f698-4350-bd74-d5465a3b19f3
  modified: 2026-10-20T05:22:38.013Z
---

Nel team p5s (sessioni coordinate dal PM, bacheca in p5s-coordinamento/bacheca.md) chi implementa — BE e FE — **non lancia validatori**
(nemmeno galaxy-task-validator) e non si convalida da solo: si ferma a typecheck, lint e test mirati. Validano Analisi app, i tester e il
validatore che il PM lancia a fine lotto.

**Why:** regola dell'utente del 2026-10-20 scritta in bacheca («RUOLI»); la sessione BE ha preso un cartellino giallo per aver lanciato
galaxy-task-validator a fine L4 (l'utente ha rifiutato la chiamata).

**How to apply:** nel ruolo «Implementazione BE/FE» del team p5s, a lavoro finito avvisare Collaudo/Analisi app/tester che il pezzo è pronto
da provare, senza chiamare agenti di validazione. Vale sopra la regola generale del CLAUDE.md globale sul validatore, per questo team.
Collegato a [[validare-alla-fine]].
