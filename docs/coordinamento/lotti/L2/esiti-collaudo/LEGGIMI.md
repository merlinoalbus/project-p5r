# L2 · esiti del Collaudo — commit 75894664, poi 8e75abbb (solo documenti)

Istanza di collaudo: cartella `p5s-sviluppo-l2`, branch locale `newreview-l2`, portata con due fast-forward da 9634bbb5:
prima a **75894664** (merge di L1 pubblicato + L2: BE 1db43bd8, d66cf5f5; FE aed23dee), poi a **8e75abbb** (ROADMAP, DECISIONI,
ARCHITETTURA: +43 −1). **BE http://localhost:3301, FE http://localhost:5473.** HEAD: `8e75abbb42e2bbeb430fbabc7cabd70e0312f8d8`.

| File | Contenuto (output grezzo) | Esito |
|---|---|---|
| `git.txt` | a 75894664: rev-parse, branch, status, `--ignored`, `git diff --stat 9634bbb5 HEAD` (91 file), log; a 8e75abbb: rev-parse, status, `git diff --stat 75894664 HEAD`, riepilogo da 9634bbb5 (94 file, +4140 −474), log | albero pulito in entrambi i casi |
| `impronta.txt` | sha256 di `git diff 9634bbb5 HEAD -- server/ shared/ src/`, sha256 per file; ricalcolata a 8e75abbb | `18c4d350075ac57667d21534512f4ef737b0bb42f78b34b8f8bea618ad6d3ee0`, identica sui due commit |
| `typecheck.txt` | `npm run typecheck` e `npx tsc -b tsconfig.full.json --force` a 75894664 | EXIT=0, EXIT=0 |
| `lint.txt` | `npm run lint` a 75894664 | EXIT=0 |
| `ambiente.txt` | health 3301 e via 5473, migrazione 109, cosa è cambiato nei dati, lavoro da preservare | ok, userVersion 109 |
| `BE-avvio-75894664.log` | BE.log dell'avvio con la migrazione 109 | — |

Typecheck e lint valgono anche per 8e75abbb: quel commit cambia solo documenti, e l'impronta del codice è identica.

**Dati.** Prima del riavvio: server fermi e foto `L2-prima-migr109-9634bbb5` (gioco 108, identica alla foto del ciclo 4 di L1).
All'avvio la migrazione 109 ha scritto: aree 23, planimetrie 29, etichette 9, ingressi 2, da verificare 1, senza area 0, covo spostato 5,
cestino ricopiato 0. Impronta completa contro la foto: user_version 108 → 109, schema diverso, nuova tabella `area`; cambia il contenuto
di `mappa` (317 righe) e di `quartiere_ingresso` (2 righe). Tutto il resto, `partite.db` compreso, è identico.
Lavoro da preservare (`impronta.cjs`, sola lettura) **identico** alla base di produzione `impronta-prod-20261020.json`: diario 254,
spunte 338, Kamoshida 7 aree, 169 voci, 373 pin; Madarame 5 aree, 225 voci, 261 pin.
Foto base dell'istanza su L2: `L2-base-8e75abbb`. Cicli di foto e ripristino: `cicli-dati.md`.
