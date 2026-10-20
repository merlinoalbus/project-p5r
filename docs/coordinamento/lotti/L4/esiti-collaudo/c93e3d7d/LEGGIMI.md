# Rilascio di L4: linea `newreview-l4` = c93e3d7d (Collaudo, 2026-10-20 17:41–17:50Z)

Ho creato `newreview-l4` da 91ef6128 (L3 pubblicato su `newreview`) con `git switch -c`; `newreview-l3` non è toccato. 42b34243 (integrazione, migrazione 114) resta fuori. Il BE di L4 (111–113, utente 022–024) è già nella base.

## Strada (b) del PM, per un conflitto sui documenti
Il primo cherry-pick (c4e9f74e) aveva un conflitto solo su `docs/coordinamento/lotti/L4/fe.md`, che tutti e 7 i commit toccano. L'ho annullato. Il PM ha scelto la strada (b):
- per ogni commit si porta il solo codice (`src server shared`), con `git apply --index` sulla base identica, e il messaggio originale con una nota;
- alla fine `git checkout 2e5c64e8 -- docs`, in un commit di soli documenti.

| originale | sulla linea | base del codice | patch-id del codice (originale = linea) |
|---|---|---|---|
| c4e9f74e §8.11 | c438ff27 | identica | b5710ca6… = b5710ca6… |
| d60bf046 §8.6 | 5cb98018 | identica | 90e9551a… = 90e9551a… |
| 9edb1dc3 §4.2 | 672b184d | identica | 8293ae52… = 8293ae52… |
| 0219db62 §4.3 | c2c6d0d2 | identica | 4ea8d317… = 4ea8d317… |
| 51c5f1a9 §4.1 carattere | f6a6d13e | identica | 09c4f6a1… = 09c4f6a1… |
| 43303bc5 §4.1 Esaurito | c0bbce1c | identica | e1c57347… = e1c57347… |
| e058918c §4.1 Anche nella Nª | 24bf025a | identica | d1fc9e9d… = d1fc9e9d… |
| documenti da 2e5c64e8 | c93e3d7d | — | — |

Patch-id integrali in `0-codice-dei-7-commit.txt`.

## Prove
| File | Esito |
|---|---|
| `1-git.txt` | Fuori da `docs/` solo i 16 file `src/` dei 7 commit, gli stessi degli originali, identici byte per byte a e058918c. Nessuna migrazione e nessun file di 42b34243; `server/` e `shared/` invariati. `docs/` uguale a 2e5c64e8, senza immagini, indirizzi del server o «robertomirabella». Nessuna data 2026-10-21 nel codice; `newreview-l3` resta a 91ef6128 |
| `2-typecheck.txt`, `2-tsc-full-force.txt`, `2-lint.txt` | EXIT=0. Il codice non dipende da 42b34243: le rotte che il FE chiama (`/compendio/schede/:id/voce`, `infiltrazione` in `GET /mappe/:k`, `carattere`) sono già sulla linea |
| `3-vitest.txt` | **28 file, 408/408**, EXIT=0. Sono i test toccati dai 7 commit, quelli dei file che importano i sorgenti toccati, `palazzo-completato`, `avanzamento-unico`, `mappe-editor`, `disponibilitaService`, `caratteriVoce`, `completamentoGuida`, le migrazioni 111–113 e utente 022–024, DungeonPage, InfiltrazioniVoce e areeScorrevoli. I moduli API cambiano solo per aggiunte facoltative, quindi i 117 file che importano il barrel `services/api` sono esclusi |
| `4-rossi/` | **7/7 rossi** sul codice di prima, tutti verdi nel controllo. §4.3 è rosso dell'intero file: il test simula `creaVoceDallaScheda` e `collegaSchedaAllaVoce`, che prima non esistono. Worktree temporaneo tolto |
| `5-istanza.txt` | Copia fresca di p5s `p5s-2026-10-20-1741Z`, **identica byte per byte alla 0948Z**: l'utente non ha scritto e L3 non ha migrazioni. Avvio su c93e3d7d: health ok, 0 migrazioni, nessun errore, impronta e lavoro da preservare identici alla copia. Nuova base `L4-base-p5s-20261020-1741Z`, uguale alla base di L3 |
| `6-push.txt` | `newreview-l4` nuovo su github, nessun workflow, `newreview` non toccato |
