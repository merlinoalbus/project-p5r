# L4: FUN3-3 sulla linea `newreview-l4` = aac70e23 (Collaudo, 2026-10-20 17:53–17:56Z)

| File | Contenuto | Esito |
|---|---|---|
| `0-cherry-pick-e-documenti.txt` | cherry-pick di cb5d74a5 a server fermi, poi `git checkout 35ae1911 -- docs` (newreview attuale) | base identica, patch-id uguale → bc2ee751; documenti → aac70e23, `docs/` identico a newreview; nessuna immagine, nessun indirizzo del server, nessuna email dell'utente |
| `1-git.txt` | HEAD, log, diff, migrazioni, 42b34243, grep, alberi | da c93e3d7d cambiano fuori da `docs/` solo `InfiltrazioniVoce.tsx` e il suo test; nessuna migrazione, `server/` e `shared/` invariati; nessun file di 42b34243; nessuna data 2026-10-21 nel codice |
| `2-typecheck.txt`, `2-tsc-full-force.txt`, `2-lint.txt` | typecheck, tsc `--force`, lint | EXIT=0 |
| `3-vitest.txt` | InfiltrazioniVoce, GiornoGuida, PropostaDallaVoce e i test dei file che li importano (DungeonDettaglioPage, PercorsoPage) | 5 file, **126/126**, EXIT=0 |
| `4-rosso-FUN3-3.txt` | test FUN3-3 sul codice di bc2ee751 e su quello di prima (worktree temporaneo, poi tolto) | controllo 11/11 EXIT=0; **sul codice di prima 2 rossi (i due test FUN3-3), EXIT=1** |
| `5-dati-prima.txt`, `5-istanza.txt` | dati prima del cambio e avvio | dati **IDENTICI** alla base 1741Z prima e dopo, senza ripristino; 0 migrazioni, nessun errore |
| `6-push.txt` | push di sicurezza | avanzamento rapido c93e3d7d..aac70e23, nessun workflow, `newreview` non toccato |
