# L1 · esiti del Collaudo — commit e9fb4871

Istanza di collaudo: cartella `C:\Repository\project-p5r\.claude\worktrees\p5s-sviluppo-l2`, branch locale `newreview-l2`,
HEAD `e9fb48719bcf1be6a85529c202e8e066654284cb` (fast-forward da ab3b1053 su `newreview`). **BE http://localhost:3301, FE http://localhost:5473.**

| File | Contenuto (output grezzo) | Esito |
|---|---|---|
| `git.txt` | `git rev-parse HEAD`, branch, `git status --porcelain` (vuoto), `--ignored` (solo .env, data/, node_modules/), `git diff --stat bd20ed72 HEAD`, log | HEAD = e9fb4871, albero pulito |
| `impronta.txt` | sha256 di `git diff bd20ed72 HEAD -- server/ shared/ src/` e sha256 di ogni file toccato a HEAD | `77a017dab975f3e27f5eae7a65127ad8a10c09f26927df84a004258d6d67b654` |
| `typecheck.txt` | `npm run typecheck` e `npx tsc -b tsconfig.full.json --force` | EXIT=0, EXIT=0 |
| `lint.txt` | `npm run lint` | EXIT=0 |
| `ambiente.txt` | dati usati, `/api/health` su 3301 e via proxy 5473, migrazioni applicate | ok, userVersion 108 |

Dati: `data/` è una copia, fatta con l'API di backup di better-sqlite3 (sorgente aperta in sola lettura), della base pulita di produzione
`prod-20261020` (gioco user_version 106, partite 21, integrity ok); all'avvio si sono applicate le migrazioni 107 e 108 del commit.
I dati della cartella di sviluppo non sono stati usati perché hanno già la migrazione 109 di L2.
