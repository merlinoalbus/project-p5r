# L2 giro 2 — modifiche BE per la linea di rilascio (su 90137ce2)

Autore: Implementazione BE, 2026-10-20. Destinatario: Collaudo, che le applica con Edit **alla lettera** nel worktree
`C:\Repository\project-p5r\.claude\worktrees\p5s-sviluppo-l2` (HEAD 90137ce2).

Contenuto: le righe di L2 dei commit `1cd41876` (R1, R2-28, FUN2-8) e `b6f3dd9a` (FUN2-9) di newreview, **ricalcolate sul contenuto di
90137ce2**, senza nessuna riga di L3 (niente `infiltrazione_area`, niente Aree dei Palazzi, niente `planimetria-senza-area`). Il commit
`a1def232` (docs, R5) è già in 90137ce2. Le modifiche di FE del giro 2 (c43b8bc0, b0ebdad0, fcff89e3) non sono qui: le porta FE.

## Come applicarle
- Un file per file da toccare: `01`…`07`. In ogni file, ogni modifica ha un **TESTO VECCHIO** e un **TESTO NUOVO** fra righe `~~~~`.
  Il testo vecchio è unico nel file. Applicare nell'ordine indicato; se un testo vecchio non corrisponde, fermarsi.
- Prova fatta da BE: le stesse Edit applicate a una copia estratta di 90137ce2 (`git archive`) nello scratchpad di BE, con i
  `node_modules` del worktree di rilascio: `tsc -p tsconfig.server.json`, `tsc -p tsconfig.test.json`, `eslint server shared` puliti;
  `aree-mondo` + `openapi` 33/33; aree, mappe-editor, citta, verifica-mappe ecc. 8 file / 83 test verdi.

## Test mirati da lanciare dopo
```bash
npx tsc -p tsconfig.server.json --noEmit
npx tsc -p tsconfig.test.json --noEmit
npx eslint server shared
npx vitest run server/routes/aree-mondo.test.ts server/openapi/openapi.test.ts
```
Attesi in `aree-mondo`: i quattro casi nuovi «R1 (giro 2)», «R3 (giro 2), R2-28», «FUN2-8 (giro 2)», «FUN2-9 (giro 2)» verdi, e tutti
gli altri come prima.

## File
| # | File | Modifiche | Punto |
|---|---|---|---|
| 01 | `server/openapi/descrizioni/mappe.ts` | 1 | FUN2-8 |
| 02 | `server/openapi/descrizioni/aree.ts` | 1 | FUN2-9 |
| 03 | `server/services/mappe/casaMappa.ts` | 1 | R1 |
| 04 | `server/services/mappe/mappeService.ts` | 2 | FUN2-8, R2-28 |
| 05 | `server/services/mappe/areeService.ts` | 1 | FUN2-9 |
| 06 | `shared/types.ts` | 2 | R1, FUN2-9 |
| 07 | `server/routes/aree-mondo.test.ts` | 2 | test R1, R3/R2-28, FUN2-8, FUN2-9 |

Messaggio di commit proposto (il Collaudo lo adatta):
`fix(L2): giro 2 — «da verificare» nell'indice delle mappe (R1), Area corretta conservata dal seed (R2-28), niente mappe senza Area nel
mondo dall'editor (FUN2-8), chiave del genitore delle planimetrie da collocare (FUN2-9)`.
