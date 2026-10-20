# L1 — correzioni del quarto verdetto (solo documenti), da applicare nella cartella di Collaudo `p5s-sviluppo-l2`

Il validatore (4° giro) ha rigettato per due soli documenti e ha scritto che, sanati, il lotto è approvabile senza ripetere typecheck,
lint, Vitest né no-reg (cambiano solo documenti).

## 1. docs/ROADMAP.md, riga 1295 (riga di L1) — Edit diretto, testo esatto
Sostituire la parte finale della riga, da `**3° giro (2026-10-20):**` fino alla fine, con:

`**3° giro (2026-10-20):** dopo lo scarico automatico della pianta il quartiere si rilegge e intestazione e visore mostrano la stessa immagine (G6, test QuartierePage.scarico visto rosso); `licenze/GPL-3.0.txt` accanto alla LGPL; collaudo sul commit e9fb4871 (istanza separata 3301/5473): status pulito, typecheck e lint verdi, Vitest 596/596, F-03/F-06/F-10/F-28 e G6 superati a 375, 768, 1024×690, 1280×689, impronte dei dati identiche, 22/22, 75 «Sulla mappa», metro identica. **4° giro (2026-10-20):** date corrette a 2026-10-20 in codice, nomi dei test e documenti; in DECISIONI la filigrana nella fascia 1024–1279 e la GPL-3.0 accanto alla LGPL; collaudo su e2cc3ca8: typecheck e lint verdi, Vitest 596/596, impronte dei dati identiche, 22/22, 75 «Sulla mappa», metro identica. **5° giro (2026-10-20):** questa riga della ROADMAP corretta (solo documenti) | ⏳ in validazione (RIGETTATO al 1°, al 2°, al 3° e al 4°) |`

(Lo stato dice anche il 4° rigetto, perché questo commit nasce da quel verdetto; il 5° giro è la sola correzione di questa riga.)

## 2. lotti/L1/esiti-collaudo/giro3/LEGGIMI.md, riga 19
Conteggio reale: 14 righe in 12 file di codice, più DECISIONI:2131 e ROADMAP:1295, cioè 16 righe in 14 file (diff: ImmagineMappaUnica.test e
DungeonDettaglioPage ±2 righe ciascuno, gli altri 10 file ±1). Se il censimento aveva davvero trovato righe in più, allegare l'output grezzo
del grep fatto prima delle modifiche.

## 3. (Facoltativo, nota N1) esito grezzo dei 75 «Sulla mappa» e della metro nel browser
Lo allega Test no-reg in `esiti-noreg/collaudo-e2cc3ca8/` (il PM glielo chiede).

## Dopo
- Commit su `newreview-l2`: messaggio `docs(L1): quarto verdetto — riga della ROADMAP con lo stato vero` + riga Co-Authored-By.
- Output grezzo in `esiti-collaudo/giro4/`: `git rev-parse HEAD`, `git diff --stat e2cc3ca8 HEAD` (solo docs/ROADMAP.md),
  `git status --porcelain` (vuoto), grep di «2026-10-21» su `src/ server/ shared/ docs/` (vuoto).
