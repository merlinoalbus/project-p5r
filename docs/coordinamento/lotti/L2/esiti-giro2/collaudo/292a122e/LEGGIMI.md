# R1 — prove grezze sul commit finale 292a122e (Collaudo, 2026-10-20 ~06:40Z)

Rilascio `newreview-l2` su 292a122e, checkout pulito; istanze 3301/5473 accese (health ok, userVersion 109). Niente commit, push né scritture sui dati.

| File | Contenuto | Esito |
|---|---|---|
| `1-typecheck.txt` | `npm run typecheck` | EXIT=0 |
| `1-tsc-full-force.txt` | `npx tsc -b tsconfig.full.json --force` | EXIT=0 |
| `1-lint.txt` | `npm run lint` | EXIT=0 |
| `2-vitest.txt` | Vitest `--reporter=verbose` su immagini-miniature, OrganizzazioneMappe, MappaPage, areeScorrevoli, CittaPage | 5 file, 91/91, EXIT=0 |
| `3-git.txt` | status (vuoto), grep 2026-10-21 (nessuna), `diff --stat 62547532 HEAD` (11 file), patch-id, impronta | patch-id uguali: 115581b4=7624bdda, 0268751a=d71a1bbd, 3a056190=63b4d80e |
| `4-rosso-UX2-15.txt` | test UX2-15 committato su `MappaPage.tsx` di 0268751a | verde su 292a122e, ROSSO prima (EXIT=1) |
| `4-rosso-UX2-13-test11.txt` | test 11 committato sul codice server/shared di 4e5f55a0 | verde su 292a122e, ROSSO prima (`[160,160]` invece di `[160,83]`, EXIT=1) |
| `4-rosso-E5-E7.txt` | test E5/E7 committato su `AlberoLuoghi.tsx` di 115581b4 | verde su 292a122e, ROSSO prima (EXIT=1) |
| `5-pulizia.txt` | rimozione della copia temporanea | worktree tolto, checkout di rilascio pulito |

Impronta del codice su 292a122e:
- alberi git: server `ccdf7f0f…`, shared `99c6fb85…`, src `f6616819…`;
- sha256 di `git archive HEAD server shared src`: `b81395d3…b791`.

Rossi: copia temporanea `git worktree add --detach` su 292a122e nello scratchpad del Collaudo, `node_modules` della release collegato in sola lettura. Per ogni caso la copia è passata per quattro stati:
1. controllo verde del test committato;
2. `git checkout <commit di prima> -- <file di codice>`, con il file di test identico a 292a122e;
3. il test lanciato con `-t`;
4. ripristino dei file.

Alla fine la copia è stata tolta. Il checkout di rilascio non è mai stato toccato.
