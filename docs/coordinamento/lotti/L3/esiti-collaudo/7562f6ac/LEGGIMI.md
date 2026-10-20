# Collaudo di L3: LAY3-5 su `newreview-l3` = 7562f6ac (Collaudo, 2026-10-20 12:34–12:36Z)

Ho portato con cherry-pick, a server fermi, sei commit partendo da 48d7a958. L'ordine è quello di `git log` su newreview (a4ba5f4c, 8347d76b, 2e22264f, 2831f884, d1fbbf3a, f89afdea) e non quello del messaggio del PM: a4ba5f4c (14:02:01) viene prima di 8347d76b (14:11:11), e 8347d76b modifica `esiti-layout/48d7a958/esito.md`, che a4ba5f4c crea. Nessun conflitto, basi identiche, patch-id 6/6 uguali.

| File | Contenuto | Esito |
|---|---|---|
| `0-cherry-pick.txt` | ordine, basi e hash nuovi | b5ac5666, ebcaca29, 6b61bc66, 0fed5f5c, a09beb8e, 7562f6ac (LAY3-5) |
| `1-git.txt` | HEAD, log, diff da c8338fd0, patch-id, file di 42b34243, grep, alberi | fuori da `docs/` gli stessi 6 file `src/`; da 48d7a958 cambiano solo `DungeonDettaglioPage.tsx` e il suo test; nessuna migrazione, `server/` e `shared/` invariati; `src` `4598be7c`; nessun file di 42b34243; nessuna data 2026-10-21 nel codice e nessun indirizzo del server nei commit |
| `2-typecheck.txt`, `2-tsc-full-force.txt`, `2-lint.txt` | typecheck, tsc `--force`, lint | EXIT=0 |
| `3-vitest.txt` | DungeonDettaglioPage, MappaPage, InfiltrazioniVoce, areeScorrevoli | 4 file, **118/118**, EXIT=0 |
| `4-dati-prima.txt` | dati prima del cambio contro la base | **IDENTICI**; nessuna scrittura nel BE.log |
| `4-istanza.txt` | avvio, health, impronta | dati **IDENTICI** alla base 0948Z; 0 migrazioni, nessun errore; BE 3301 e FE 5473 accesi |
