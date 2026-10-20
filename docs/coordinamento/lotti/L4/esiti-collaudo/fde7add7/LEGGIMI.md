# L4: FUN4-1 sulla linea `newreview-l4` = fde7add7 (Collaudo, 2026-10-20 18:17–18:21Z)

| File | Contenuto | Esito |
|---|---|---|
| `0-cherry-pick-e-documenti.txt` | cherry-pick di 8358eb14 a server fermi, poi `git checkout c1095581 -- docs` (newreview attuale) | base identica, patch-id uguale → 75177631; documenti → fde7add7, `docs/` identico a newreview; nessuna immagine, nessun indirizzo del server, email dell'utente: 0. L'unico indirizzo in `docs/` è quello noreply pubblico di GitHub dell'autore, in 2 righe «Author:» di `lotti/L2/esiti-giro2/be/07-commit.txt`, già pubblicato |
| `1-git.txt` | HEAD, log, diff, migrazioni, 42b34243, grep, alberi | da aac70e23 cambiano fuori da `docs/` solo `SchedeDaSistemare.tsx`, `DungeonDettaglioPage.tsx` e il suo test; nessuna migrazione, `server/` e `shared/` invariati; nessun file di 42b34243; nessuna data 2026-10-21 nel codice |
| `2-typecheck.txt`, `2-tsc-full-force.txt`, `2-lint.txt` | typecheck, tsc `--force`, lint | EXIT=0 |
| `3-vitest.txt` | DungeonDettaglioPage. La finestra «Crea la voce» sta in `SchedeDaSistemare.tsx`, che non ha un test proprio ed è importata solo da `DungeonDettaglioPage` | **87/87**, EXIT=0 |
| `4-rosso-FUN4-1.txt` | test sul codice del commit e su quello di prima (worktree temporaneo, poi tolto) | controllo 87/87; **sul codice di prima 2 rossi (i due test FUN4-1), EXIT=1** |
| `5-dati-prima.txt`, `5-istanza.txt` | dati prima del cambio e avvio | **IDENTICI** alla base 1741Z prima e dopo, senza ripristino; 0 migrazioni, nessun errore |
| `6-push.txt` | push di sicurezza | avanzamento rapido aac70e23..fde7add7, nessun workflow, `newreview` non toccato |
