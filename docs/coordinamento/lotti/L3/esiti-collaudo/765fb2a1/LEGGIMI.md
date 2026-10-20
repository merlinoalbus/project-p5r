# Collaudo di L3: UX3-9, UX3-10, UX3-11 su `newreview-l3` = 765fb2a1 (Collaudo, 2026-10-20 10:35–10:37Z)

Ho portato con cherry-pick, a server fermi, i cinque commit a32e2f04, 0c6567a6, 890ef6ca, 22af7649 e bcb8f57e, partendo da d5eb9650. Le basi erano identiche e i patch-id sono uguali.

| File | Contenuto | Esito |
|---|---|---|
| `0-cherry-pick.txt` | basi e hash nuovi | d3e065c8, df5b8b99, 7b5e8f07, c5a0ccd3, 765fb2a1 |
| `1-git.txt` | HEAD, log, `diff --stat c8338fd0 newreview-l3`, patch-id, file di 42b34243, grep, alberi | fuori da `docs/` solo i 6 file `src/` di UX3-9/10/11; nessuna migrazione, `server/` e `shared/` invariati (alberi `093595e4`, `affd664c`); `src` `ef715af2`; nessun file di 42b34243; patch-id 5/5 uguali; «2026-10-21» assente dal codice e presente solo come citazione storica in `docs/coordinamento` di L1/L2 |
| `2-typecheck.txt`, `2-tsc-full-force.txt`, `2-lint.txt` | typecheck, tsc `--force`, lint | EXIT=0 |
| `3-vitest.txt` | InfiltrazioniVoce, MappaPage, DungeonDettaglioPage, areeScorrevoli | 4 file, **115/115**, EXIT=0 |
| `4-dati-prima.txt` | dati prima del cambio contro la base 0948Z | solo `immagine_miniatura` 93 → 119, la cache delle letture; nel BE.log nessuna scrittura dopo il ciclo 1 |
| `4-istanza.txt` | ripristino della base, avvio, health, impronta | dati **IDENTICI** alla base 0948Z; 0 migrazioni, nessun errore; BE 3301 e FE 5473 accesi |
| `BE-prima-del-cambio.log` | BE.log su d5eb9650 | — |

Prima del cambio ho fatto la foto dei dati, compresa la cache: `foto/L3-prima-UX3-9-11` nello scratchpad del Collaudo.
