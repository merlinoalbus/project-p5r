---
name: project-manager-team-p5s
description: "Dal 2026-10-20 05:40Z il coordinamento operativo del team p5s è di una sessione «Manager»; il vecchio PM fa solo da interfaccia con l'utente sui blocchi"
metadata:
  node_type: memory
  type: project
  originSessionId: 60a10727-a455-4d1f-a39a-9e6c02ee3194
  modified: 2026-10-20T05:45:47.463Z
---

Il 2026-10-20, dopo i cartellini gialli al PM, l'utente ha affidato il coordinamento operativo del team p5s (12 sessioni, bacheca e Regia in `~\.claude\p5s-coordinamento\`) a una sessione nuova, il **Manager** (`local_33f83fd0-322a-4dcd-b6d0-25dadb37b98f`). Il Manager decide priorità e sblocchi, assegna il lavoro in bacheca, lancia il galaxy-task-validator a fine lotto, committa la consegna e pubblica. Il vecchio PM (`local_2c53e11a…`) resta l'interfaccia con l'utente **e tiene la Regia (`stato.json`)**: l'utente glielo ha precisato («tu aggiorni lo stato della regia p5s e mi porti i blocchi»). Il Manager non scrive le note dei lotti né le righe di PM e Manager. Gli manda in una riga raggruppata i cambi di stato e i blocchi, e lo avvisa prima di ogni push su p5s, per il backup del volume `p5s_data`. I messaggi al PM contano nel limite di 10: quando è pieno, i compiti vanno in bacheca e i messaggi rimasti in `messaggi-in-attesa.md`.

**Why:** l'utente ha chiesto al Manager di «assicurarsi che ognuno faccia il suo», sbloccare il team e «tenere sempre aggiornata la Regia p5s».

**How to apply:** le consegne e i passaggi di fase vanno al Manager. Le decisioni del Manager si registrano in `decisioni-pm.md` come «Decisione del Manager». Valgono [[feedback-pm-ascoltare-i-messaggi]], [[feedback-pm-non-bloccare-team]] e [[project-dati-attuali-produzione]].
