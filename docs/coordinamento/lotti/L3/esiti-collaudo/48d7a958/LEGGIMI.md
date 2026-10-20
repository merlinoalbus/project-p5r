# Collaudo di L3: LAY3-3 e LAY3-4 su `newreview-l3` = 48d7a958 (Collaudo, 2026-10-20 11:31–11:34Z)

Ho portato con cherry-pick, a server fermi, i cinque commit fec0e292, a0292e3c, 18aed306, 5a40b46d e de5718ed, partendo da 765fb2a1. Le basi erano identiche e i patch-id sono uguali.

| File | Contenuto | Esito |
|---|---|---|
| `0-cherry-pick.txt` | basi e hash nuovi | c9c1bc90, 030b06cd, a4ed2e70, 9e8baea3 (LAY3-3), 48d7a958 (LAY3-4) |
| `1-git.txt` | HEAD, log, diff da c8338fd0, patch-id, file di 42b34243, grep, alberi | fuori da `docs/` gli stessi 6 file `src/` di prima; da 765fb2a1 cambiano solo `DungeonDettaglioPage.tsx` e il suo test; nessuna migrazione, `server/` e `shared/` invariati; `src` `b942dba4`; nessun file di 42b34243; patch-id 5/5 uguali; nessuna data 2026-10-21 nel codice |
| `2-typecheck.txt`, `2-tsc-full-force.txt`, `2-lint.txt` | typecheck, tsc `--force`, lint | EXIT=0 |
| `3-vitest.txt` | DungeonDettaglioPage, MappaPage, InfiltrazioniVoce, areeScorrevoli | 4 file, **117/117**, EXIT=0 |
| `4-dati-prima.txt` | dati prima del cambio contro la base | solo `immagine_miniatura` 93 → 127, la cache delle letture; nessuna scrittura nel BE.log |
| `4-istanza.txt` | ripristino della base 0948Z, avvio, health, impronta | dati **IDENTICI** alla base; 0 migrazioni, nessun errore; BE 3301 e FE 5473 accesi |
| `BE-prima-del-cambio.log` | BE.log su 765fb2a1 | — |

Ciclo per L3-L10 «Da collocare»: preparato in `../ciclo2-da-collocare-piano.md`, da aprire quando Test layout lo chiede.
