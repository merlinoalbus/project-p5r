# Collaudo di L3: UX3-12 e UX3-13 su `newreview-l3` = 2df44d30 (Collaudo, 2026-10-20 15:07–15:10Z)

Ho portato con cherry-pick, a server fermi e nell'ordine di `git log`, i commit 1e7a4514, cf86a0d1, 7f44149c, d74e2976, a32b2537 e dbc4d1e8, partendo da 08da0557. Nessun conflitto, basi identiche, patch-id 6/6 uguali.

| File | Contenuto | Esito |
|---|---|---|
| `0-cherry-pick.txt` | ordine, basi e hash nuovi | 7f44db73, c173b8a1, 9c4f4cb3, 682e9db3, d3c97ac9 (UX3-12), 2df44d30 (UX3-13) |
| `1-git.txt` | HEAD, log, diff da c8338fd0, patch-id, 42b34243, grep, alberi | fuori da `docs/` i 12 file noti; da 08da0557 cambiano solo `AreePalazzo.tsx` e `DungeonDettaglioPage.tsx` con il suo test; nessuna migrazione, `server/` e `shared/` invariati; `src` `b7e25211`; nessun file di 42b34243, nessuna data 2026-10-21, nessun indirizzo del server. `AreePalazzo` lo importa solo `DungeonDettaglioPage` |
| `2-typecheck.txt`, `2-tsc-full-force.txt`, `2-lint.txt` | typecheck, tsc `--force`, lint | EXIT=0 |
| `3-vitest.txt` | DungeonDettaglioPage, AreePalazzo, SelettoreVersioni, Selettore, MappaPage, areeScorrevoli | 6 file, **140/140**, EXIT=0 |
| `4-dati-prima.txt`, `4-istanza.txt` | dati prima del cambio, ripristino, avvio | prima del cambio c'era solo `immagine_miniatura` 93 → 94 (cache delle letture, nessuna scrittura); dopo il ripristino della base e l'avvio, dati **IDENTICI** alla base 0948Z; 0 migrazioni, nessun errore |
| `5-push.txt` | push di sicurezza | avanzamento rapido 08da0557..2df44d30, EXIT=0; nessun workflow sul ramo; `newreview` non toccato |
