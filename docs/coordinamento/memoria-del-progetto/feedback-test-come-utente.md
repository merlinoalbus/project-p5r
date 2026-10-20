---
name: feedback-test-come-utente
description: "nei test non si spostano dati (pin, posizioni) per aggirare un comportamento dell'app: si fa il gesto che farebbe l'utente"
metadata:
  node_type: memory
  type: feedback
  originSessionId: f878b52d-d3b9-470f-9222-0233a07e8955
  modified: 2026-10-20T16:05:33.526Z
---

I pin che si raggruppano restano dove sono: in un test non li si sposta per evitare il raggruppamento, li si apre dal gruppo («N spilli
vicini» → voce), come fa l'utente. Vale in generale: i dati di prova non si cambiano per schivare un comportamento vero dell'app.

**Why:** l'utente (2026-10-20, L4 §8.11) ha corretto «lo sposto in un punto libero»: «I pin che si raggruppano devono restare dove sono non
spostarsi al posto di raggrupparsi». Spostare il dato nasconde il comportamento che l'utente vede e rende il test meno vero.

**How to apply:** quando un test non trova un elemento perché l'app lo raggruppa, lo nasconde o lo accorcia, si percorre il gesto reale
(apri il gruppo, «Anche le segnate», apri la piega) invece di cambiare posizione o dati. Collegata a [[feedback-prove-sui-dati-reali]].
