# Collaudo di L3: LAY3-6 e LAY3-7 su `newreview-l3` = db7d0423 (Collaudo, 2026-10-20 13:21–13:25Z)

Ho portato con cherry-pick, a server fermi e nell'ordine di `git log`, i commit 0ffdf403, 6f5673c2, 14d7b9e8, 5e56a266 e c5725908, partendo da 7562f6ac. Nessun conflitto, basi identiche, patch-id 5/5 uguali.

| File | Contenuto | Esito |
|---|---|---|
| `0-cherry-pick.txt` | ordine, basi e hash nuovi | b2accdce, 0a2fc834, 8535c16b (LAY3-6), 5bedd907 (LAY3-7 «Aree · N»), db7d0423 (LAY3-7 selettori) |
| `1-git.txt` | HEAD, log, diff da c8338fd0, patch-id, file di 42b34243, grep, utenti di Selettore, alberi | vedi sotto |
| `2-typecheck.txt`, `2-tsc-full-force.txt`, `2-lint.txt` | typecheck, tsc `--force`, lint | EXIT=0 |
| `3-vitest.txt` | i 7 file richiesti più i test dei file che importano `shared/Selettore` | **34 file, 339/339**, EXIT=0 |
| `4-dati-prima.txt` | dati prima del cambio contro la base | solo `immagine_miniatura` 93 → 105, la cache delle letture; nessuna scrittura nel BE.log |
| `4-istanza.txt` | ripristino della base 0948Z, avvio, health, impronta | dati **IDENTICI** alla base; 0 migrazioni, nessun errore; BE 3301 e FE 5473 accesi |

## Diff da c8338fd0 fuori da `docs/`
Gli 11 file sono:
- quelli già noti: InfiltrazioniVoce, DungeonDettaglioPage e MappaPage, ciascuno con il suo test;
- quelli attesi: `AreePalazzo.tsx`, `Selettore.tsx` e i loro test;
- **in più `src/components/mappe/SelettoreVersioni.test.tsx`**, toccato da c5725908. È solo un test: `SelettoreVersioni.tsx` non cambia e non importa Selettore.

Nessuna migrazione, `server/` e `shared/` invariati (`src` `f91a031f`), nessun file di 42b34243, nessuna data 2026-10-21 nel codice e nessun indirizzo del server.

## Chi usa Selettore
53 file importano `shared/Selettore` (elenco in `1-git.txt`); 30 di questi hanno un test accanto. Gli utenti indiretti, tramite `utils/selettore.ts` (AttivitaPage, CompletamentoPage, FilmPage, LibriPage), sono già fra i diretti.

L'insieme lanciato riunisce i 7 test richiesti e i 30 test degli utenti, senza doppioni: 34 file.
