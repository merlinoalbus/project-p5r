# L2 · correzioni FE del collaudo — commit de67b349 (solo src/, sopra 8e75abbb)

Istanza di collaudo `p5s-sviluppo-l2`, branch `newreview-l2`, **HEAD `de67b349f702850cbdb299de82967e18d81396d6`**. BE 3301, FE 5473.

| File | Contenuto (output grezzo) | Esito |
|---|---|---|
| `git.txt` | rev-parse, branch, status (vuoto), `--ignored`, `git diff --stat 8e75abbb HEAD` (17 file, +240 −40, solo src/), riepilogo da 9634bbb5 (95 file), log | albero pulito |
| `impronta.txt` | sha256 di `git diff 9634bbb5 HEAD -- server/ shared/ src/` e delle sole correzioni (`8e75abbb..HEAD`), sha256 per file | L2 completo `01138ad04a762a7b34dc1b5b7817a27f876b34e657970872c713f72128e8071b`; correzioni `cc28a0d6…5618` |
| `typecheck.txt`, `lint.txt` | `npm run typecheck`, `npx tsc -b … --force`, `npm run lint` | vedi i file |
| `ambiente.txt` | health, nessuna migrazione all'avvio, impronta dei dati identica alla base `L2-base-8e75abbb` | ok, userVersion 109 |

## Incidente del Collaudo (04:18–04:19), corretto
Per portare l'istanza su de67b349 ho eseguito `git merge --ff-only newreview` invece del merge sul commit indicato. `newreview` era già avanzato a
**caf7b511** (L3 BE, migrazione 110): l'istanza è arrivata su caf7b511 e all'avvio delle 02:19:01Z la migrazione 110 si è applicata ai dati del
collaudo (aree 117, planimetrie 245, legami 105…). Log dell'avvio: `BE-avvio-errato-caf7b511.log`. Nessun tester ha lavorato su quello stato:
il ciclo 2 non era ancora aperto.
Correzione: server fermati; `git reset --hard de67b349` sul branch locale `newreview-l2` (caf7b511 resta su `newreview`, niente perso);
`ripristina foto/L2-base-8e75abbb data` → `RIPRISTINO OK` (user_version 109). Al riavvio su de67b349 nessuna migrazione è stata applicata e
l'impronta dei dati è `IDENTICHE` alla base. In `data/backups/` resta la copia di avvio di quel giro (02-19-00), che è ignorata da git.
Da qui in poi i fast-forward si fanno sull'hash indicato dal PM (`git merge --ff-only <hash>`), mai sul nome del branch.
