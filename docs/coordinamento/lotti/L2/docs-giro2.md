# L2, giro 2 — riga della ROADMAP prima del validatore (R9, F8, F9)

Il Collaudo la applica sulla linea di rilascio `newreview-l2` dopo che le riprove sul nuovo commit sono verdi. Solo documenti, con Edit diretto; autorizza il PM.

In `docs/ROADMAP.md`, nella riga di L2, sostituire la parte finale, dalla frase «Team per ruoli (2026-10-20)» fino a «| ⏳ in validazione |», con questo testo. I due segnaposto `<…>` li riempie il Collaudo con gli hash e gli esiti veri:

`Team per ruoli (2026-10-20): BE 1db43bd8 e d66cf5f5, FE aed23dee, documenti 8e75abbb, correzioni del collaudo de67b349, 600af81c (cherry-pick di e9860334) e 2222d51f (cherry-pick di 227937b7), riga della ROADMAP 5ae62692. Giro 1 del validatore RIGETTATO; correzioni del giro 2: R5 in DECISIONI 90137ce2; BE riscritto sul codice di rilascio <hash BE> (R1 daVerificare nell'indice, R2-28 Area corretta conservata dal seed, FUN2-8 409 usa-aggiungi-area allo spostamento, FUN2-9 genitore delle planimetrie da collocare); FE b0ebdad0, c43b8bc0, fcff89e3 portati con cherry-pick (Colloca propone il quartiere del genitore, segno «Da verificare» nell'indice, rifiuto dell'editor che resta scritto). Collaudo sul commit esatto (istanza 3301/5473, base dei dati p5s-2026-10-20-0503Z): typecheck e lint verdi; funzionali FUN2-1…FUN2-9 e F2-01…F2-33 dal vivo, salvo F2-10 (lettura del codice) e quanto indicato in funzionali.md; 113 indirizzi vecchi distinti verso la casa (109 aperti nel browser, 4 controllati con risolvi); UX: 12 difetti, 11 verificati, UX2-11 in L5; layout LAY2-1…6, LAY-2, R1, R6, R7 e FUN2-9 ai tre formati e alle altezze realistiche; no-reg: impronte dei dati identiche, Vitest mirati <esito>, 75 «Sulla mappa» uguali alla base, metro identica. Linea di rilascio: dopo l'APPROVATO si ricongiunge a newreview con un merge, a contenuto identico | ⏳ in validazione |`

Poi:
- commit `docs(L2): giro 2 — riga della ROADMAP con le correzioni e il collaudo`, con la riga Co-Authored-By;
- output grezzo in `lotti/L2/esiti-giro2/collaudo/docs/`: rev-parse, diff --stat (solo docs/ROADMAP.md), status vuoto, grep di 2026-10-21 vuoto;
- l'hash al PM, che lancia il validatore.
