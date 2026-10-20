# L2 · UX2-12 (testi del Cestino) — commit 2222d51f, cherry-pick di 227937b7

Autorizzazione del PM: `git cherry-pick 227937b7` sul branch `newreview-l2` (padre 600af81c), a server fermi, a istanza libera, con i dati
uguali alla base `L2-base-8e75abbb` (impronta delle 04:34:57). **HEAD: `2222d51f52352de838c5247dee5abae1cd014ce2`**, nessun push.

**Verifica preliminare, nessun legame con L3** (output in `git.txt`):
- 227937b7 tocca 3 file: `src/utils/cestino.ts`, `src/components/impostazioni/Cestino.tsx`, `Cestino.test.tsx`;
- `git diff 600af81c 227937b7^` su quei file è vuoto, e nessun commit fra 600af81c e 227937b7^ (caf7b511, L3 BE) li tocca;
- i tipi che il diff usa (`ContenutoCestinoDto`, `VoceCestinoDto`, `'area-fisica'`) esistono già in `shared/types.ts` a 600af81c.

| File | Contenuto (output grezzo) | Esito |
|---|---|---|
| `git.txt` | verifica preliminare, rev-parse, branch, status (vuoto), `git diff --stat 600af81c HEAD` (3 file, +88 −18), confronto con 227937b7 (vuoto), log | albero pulito, contenuto identico all'originale |
| `impronta.txt` | sha256 di `git diff 9634bbb5 HEAD -- server/ shared/ src/`, del solo cherry-pick e dell'originale, sha256 per file | L2 `4a38faa0f0c69b5a7adf25904854e9d5868adf343b823f7017d4281eb0a3dfd2`; cherry-pick `15ac47f0…fef8`, **uguale** all'originale |
| `typecheck.txt`, `lint.txt` | `npm run typecheck`, `npx tsc -b … --force`, `npm run lint` | EXIT=0, EXIT=0, EXIT=0 |
| `ambiente.txt` | health, nessuna migrazione all'avvio, impronta dei dati | ok, userVersion 109, IDENTICHE alla base |
