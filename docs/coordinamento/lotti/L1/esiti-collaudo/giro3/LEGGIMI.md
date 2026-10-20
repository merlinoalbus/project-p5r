# L1 · terzo verdetto — correzioni di date e documenti, commit e2cc3ca8

Autorizzazione: il Project manager, in via eccezionale, ha chiesto al Collaudo di applicare le correzioni di `lotti/L1/correzioni-giro3.md`
nella cartella `p5s-sviluppo-l2` e di committarle sul branch `newreview-l2`, perché la cartella di sviluppo ha già L2 negli stessi file.
Solo commenti, nomi dei test e documenti; ogni sostituzione fatta con Edit diretto, testo esatto.

**Commit: `e2cc3ca897d54ca7696aace0d631466f824969e7`** (padre e9fb4871), branch `newreview-l2`, nessun push.

| File | Contenuto (output grezzo) | Esito |
|---|---|---|
| `grep.txt` | `grep -rn "2026-10-21"` su src/ server/ shared/ docs/DECISIONI.md docs/ROADMAP.md prima del commit | vuoto (EXIT=1) |
| `typecheck.txt` | `npm run typecheck` e `npx tsc -b tsconfig.full.json --force` | EXIT=0, EXIT=0 |
| `lint.txt` | `npm run lint` | EXIT=0 |
| `vitest.txt` | i quattro file indicati, `--reporter=verbose` | 4 file, 32/32, EXIT=0 |
| `git.txt` | rev-parse, branch, status (vuoto), `--ignored`, `git diff --stat e9fb4871 HEAD` (14 file, +18 −17), log, grep a HEAD (vuoto) | ok |
| `impronta.txt` | sha256 di `git diff bd20ed72 HEAD -- server/ shared/ src/` e sha256 per file | `d6c658574aaa1e9e9c1fb4daef13830d238e6765ec91996d2f6a1d9da72b09ce` (prima 77a017da…b654) |
| `ambiente.txt` | istanza riavviata su e2cc3ca8, health 3301 e via 5473, nessuna migrazione nuova, impronta dei dati | ok, userVersion 108 |

Il censimento iniziale di «2026-10-21» coincideva esattamente con l'elenco del PM: 14 righe in 12 file di codice, più DECISIONI:2131 e
ROADMAP:1295, cioè 16 righe in 14 file. (Corretto al 4° giro: prima qui c'era scritto «16 righe in 13 file più DECISIONI e ROADMAP»,
un conteggio sbagliato; il censimento grezzo a e9fb4871 è in `../giro4/censimento-e9fb4871.txt`.)
Le tre modifiche a DECISIONI.md (data, riga della filigrana, GPL-3.0) e le due a ROADMAP.md:1295 (data del 2° giro, chiusura del 3° giro)
sono con il testo esatto delle istruzioni. Il testo del 3° giro in ROADMAP (es. «Vitest 596/596», «22/22», «75 Sulla mappa») è quello
del PM: il Collaudo ha eseguito soltanto i quattro file di Vitest richiesti.

Dati dopo il riavvio contro la foto `L1-ciclo2-funzionali-G6`: cambia solo `gioco.db.immagine_miniatura` (righe 72 → 77). Sono miniature
create dalle letture dei tester dopo le 03:00, cioè cache. Alle 01:13:10 UTC la verifica del Collaudo nel browser ha aperto
/guida/citta/kichijoji, che tenta da sola lo scarico della pianta: la POST ha risposto 400 (LAY-2) e l'impronta ripetuta subito dopo
conferma che non ha scritto nulla oltre la cache. È stato un errore di procedura del Collaudo (pagina che scrive aperta senza foto),
senza effetti sui dati.
BE.log dell'istanza fino al riavvio: `../BE-fino-a-e9fb4871.log`.
