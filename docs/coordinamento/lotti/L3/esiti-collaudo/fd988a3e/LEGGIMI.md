# Collaudo di L3 (passo A2) sulla linea di rilascio `newreview-l3` = fd988a3e (Collaudo, 2026-10-20 09:45–10:00Z)

Il worktree `p5s-sviluppo-l2` è passato a `newreview-l3` con `git switch`, senza merge né cherry-pick. Controlli: `git branch --show-current` = newreview-l3, HEAD fd988a3e, checkout pulito. I server erano fermi; prima del cambio ho salvato `BE.log` e fatto la foto dei dati di L2.

| File | Contenuto | Esito |
|---|---|---|
| `1-git.txt` | HEAD, `diff --stat c8338fd0 fd988a3e`, `merge-base --is-ancestor`, commit da b28bade7 | solo `docs/coordinamento` (3 file); newreview-l3 è antenato di newreview (EXIT=0); 18 commit da b28bade7, nessuna migrazione nuova; alberi server `093595e4`, shared `affd664c`, src `be2547a6` |
| `2-typecheck.txt`, `2-tsc-full-force.txt`, `2-lint.txt` | typecheck, `tsc -b tsconfig.full.json --force`, lint | EXIT=0 tutti e tre |
| `3-vitest.txt` | Vitest verbose: i test toccati in d73e7027..c8338fd0, i test accanto ai sorgenti toccati, openapi e areeScorrevoli | 12 file, **267/267**, EXIT=0 |
| `4-istanza.txt` | installazione della copia di p5s 0948Z e avvio | health ok, userVersion 113, 0 migrazioni, nessun errore nel log, impronte dopo l'avvio identiche alla copia |
| `5-difetti-lettura.md` (+ `5-difetti-controllo.txt`, `difetti-fd988a3e.md`) | hash e test nelle righe «corretto, da verificare» | **nessuna riga della ripresa cita il suo hash**; mancano anche FE c8338fd0 per E2, i test di LAY3-1 e una riga per R3-41 |
| `impronta-base-L3.json` | impronta della foto di base `L3-base-p5s-20261020-0948Z` | — |
| `BE-prima-del-cambio-L2.log` | `BE.log` dell'istanza su L2 prima del cambio | — |

## Istanza per i tester
- **FE http://localhost:5473**, **BE http://localhost:3301** (`/api/health`), cartella `C:\Repository\project-p5r\.claude\worktrees\p5s-sviluppo-l2`.
- Codice: fd988a3e, cioè L3 più il lavoro di L4 già su p5s, senza l'integrazione «Guida nel visore».
- Dati: `dati-produzione/p5s-2026-10-20-0948Z/`. Ogni prova che scrive passa da foto e ripristino (`collaudo/PROCEDURA-DATI.md`).
- Le GET con `?l=` scrivono la cache `immagine_miniatura`.
- L'anteprima 3302/5474 è un'altra istanza (istantanea di pensive) e non è stata toccata.

## Migrazioni
p5s è già a 113 e utente 024: con fd988a3e all'avvio non si applica nessuna migrazione e non c'è nessun errore. La 114 non c'è su questa linea, perché la cartella `migrations` finisce alla 113. La catena 109–113 su una base a 108 era già stata provata sull'anteprima, base 0533Z (`collaudo/anteprima/LEGGIMI.md`), e su p5s stesso.

I dati di L2 di prima del cambio sono nella foto `L2-finale-prima-di-L3`, nello scratchpad del Collaudo.
