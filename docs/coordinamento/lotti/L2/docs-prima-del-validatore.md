# L2 — riga della ROADMAP prima del validatore (da applicare nella cartella di Collaudo `p5s-sviluppo-l2`, branch `newreview-l2`)

Solo documenti. Edit diretto, testo esatto.

## docs/ROADMAP.md, riga di L2 (comincia con `| L2 | Mondo: aree e planimetrie.`)
Sostituire la parte finale, da `Team per ruoli (2026-10-20): BE 1db43bd8, d66cf5f5, FE aed23dee | ⏳ test finali sul collaudo |` alla fine, con:

`Team per ruoli (2026-10-20): BE 1db43bd8 e d66cf5f5, FE aed23dee, documenti 8e75abbb, correzioni del collaudo de67b349 (Elimina area con conferma, pannello chiuso sotto i 1280 px, nomi dei passaggi al tocco), 600af81c (etichette dei passaggi a 375, carta del Covo; cherry-pick di e9860334) e 2222d51f (testi del Cestino; cherry-pick di 227937b7). Collaudo sul commit esatto (istanza separata 3301/5473, migrazione 109 applicata all'avvio, dati identici alla base): typecheck e lint verdi; test funzionali FUN2-1…FUN2-7 verificati, 109 indirizzi vecchi verso la casa, scritture con foto e ripristino (area di prova, versioni, ingresso, Colloca via API, export/import, Elimina area, Tieni e Rimuovi dello staff); UX: 12 difetti, 11 corretti e verificati, UX2-11 («Apri sull'atlante») spostato in L5; layout: LAY2-1…LAY2-6 e LAY-2 verificati, pagine Area in una schermata a 1366×657, 1280×689, 1024×690; no-reg: impronte dei dati identiche, Vitest 823/823, 75 «Sulla mappa» riga per riga come la base, metro identica a grafica accesa e spenta salvo i collegamenti voluti | ⏳ in validazione |`

## Dopo
- Commit su `newreview-l2`: `docs(L2): riga della ROADMAP con il collaudo del lotto` + riga Co-Authored-By.
- Output grezzo in `lotti/L2/esiti-collaudo/docs/`: `git rev-parse HEAD`, `git diff --stat 2222d51f HEAD` (solo docs/ROADMAP.md, +1 −1), `git status --porcelain` (vuoto), grep di «2026-10-21» su `src/ server/ shared/ docs/` (vuoto).
- Avvisare il PM con l'hash.
