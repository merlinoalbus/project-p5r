# Collaudo di L3: LAY3-8 su `newreview-l3` = 08da0557 (Collaudo, 2026-10-20 14:01–14:04Z)

Ho portato con cherry-pick, a server fermi, i commit 24b655cd, de06c8ad e b49c28b0, partendo da db7d0423. Le basi erano identiche, de06c8ad compreso, e i patch-id sono uguali. **4614c443 e le righe della Regia non sono portati**: `stato.json` è uguale a db7d0423.

| File | Contenuto | Esito |
|---|---|---|
| `0-cherry-pick.txt` | basi e hash nuovi | c2a75bc8, 37f72c2b, 08da0557 (LAY3-8) |
| `1-git.txt` | HEAD, log, diff da c8338fd0, patch-id, 42b34243, grep, alberi | fuori da `docs/` i file noti più `SelettoreVersioni.tsx` (12 file); da db7d0423 cambiano solo `SelettoreVersioni.tsx` e il suo test; nessuna migrazione, `server/` e `shared/` invariati; `src` `76e51769`; nessun file di 42b34243, nessuna data 2026-10-21, nessun indirizzo del server |
| `2-typecheck.txt`, `2-tsc-full-force.txt`, `2-lint.txt` | typecheck, tsc `--force`, lint | EXIT=0 |
| `3-vitest.txt` | SelettoreVersioni, DungeonDettaglioPage, AreePalazzo, Selettore, MappaPage, areeScorrevoli | 6 file, **138/138**, EXIT=0. `SelettoreVersioni` è importato solo da `DungeonDettaglioPage`, il cui test è già fra questi |
| `4-dati-prima.txt`, `4-istanza.txt` | dati prima del cambio e dopo l'avvio | **IDENTICI** alla base 0948Z prima e dopo, senza ripristino; 0 migrazioni, nessun errore |
| `5-push.txt` | `git push github newreview-l3:refs/heads/newreview-l3` | avanzamento rapido db7d0423..08da0557, EXIT=0; nessun workflow parte sul ramo (`docker-publish-newreview` solo su `newreview`); `gh run list --branch newreview-l3` vuoto |

Il `newreview` remoto è a 49858485; quello locale, b49c28b0, ha 54 commit in più. Non è stato toccato.
