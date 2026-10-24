---
name: feedback-produzione-sola-lettura
description: "La produzione (istanza persona5royal) si guarda soltanto: niente localStorage, preferenze, gesti che scrivono, nemmeno se ripristinati subito dopo"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 2c78c14e-c71b-4b7c-877c-34bbd3e0e5d9
  modified: 2026-10-20T01:09:17.380Z
---

Nei confronti con l'istanza di produzione si fa **solo lettura**: pagine, DOM, schermate. Non si
cambia nulla, nemmeno il localStorage del browser di prova (per esempio `p5r-preferenze`, la preferenza «grafica predefinita»),
anche se lo si rimette subito com'era.

**Why:** il 2026-10-20, nel test UX di L1, ho spento la preferenza della grafica nel localStorage della produzione e poi l'ho tolta.
Sul server non è cambiato nulla, ma il Project manager l'ha segnalato come URGENTE: «La produzione vera non si tocca, nemmeno con
una preferenza ripristinata dopo».

**How to apply:** tutte le prove con impostazioni diverse si fanno sull'istanza locale (http://localhost:5373). Dalla produzione si
prende solo il «prima» così com'è. Se il confronto richiede un'impostazione diversa in produzione, si chiede prima al PM, che lo
porta all'utente. Vedi [[reference-browser-pane-p5r]] e [[feedback-prove-sui-dati-reali]].
