# R2 del giro 1 di L3 — Vitest grezzi sul codice della linea (Collaudo, 2026-10-20 ~16:00Z)

Lanciati nella cartella della linea `newreview-l3` = b5fd6cfe (`git status` pulito prima e dopo), con `npx vitest run --reporter=verbose <file>`, uno per volta. Un file di uscita per test, integrale, con EXIT.

| File di test | Uscita | Esito |
|---|---|---|
| `server/routes/palazzi-aree.test.ts` | `palazzi-aree.test.txt` | **19/19**, EXIT=0 |
| `server/db/migrations/110_aree_dei_palazzi.test.ts` | `110_aree_dei_palazzi.test.txt` | 6/6, EXIT=0 |
| `server/routes/cestino.test.ts` | `cestino.test.txt` | 12/12, EXIT=0 |
| `server/routes/dungeon.test.ts` | `dungeon.test.txt` | 3/3, EXIT=0 |
| `server/routes/importa-mappe-grande.test.ts` | `importa-mappe-grande.test.txt` | 2/2, EXIT=0 |
| `server/openapi/openapi.test.ts` | `openapi.test.txt` | 14/14, EXIT=0 |
