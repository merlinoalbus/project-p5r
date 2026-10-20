# L1 — correzioni del terzo verdetto (date e documenti), da applicare nella cartella di Collaudo `p5s-sviluppo-l2`

Il validatore (3° giro) chiede di correggere date e documenti. Tutto il lavoro di L1 e le risposte dell'utente sono del **2026-10-20**
(reflog: bd20ed72 01:11, ab3b1053 02:37, e9fb4871 02:47 del 20; risposta dell'utente su G1/G2 alle 02:47 del 20). Le correzioni si fanno
nella cartella di Collaudo perché la cartella di sviluppo ha già lavoro di L2 negli stessi file. Solo commenti, nomi di test e documenti:
nessun comportamento cambia. Ogni sostituzione con Edit diretto, testo esatto.

## Commenti e nomi dei test: «2026-10-21» → «2026-10-20» in queste righe (e solo qui)
- src/components/mappe/IllustrazioneConSegno.tsx:13
- src/components/mappe/MappaTokyo.tsx:351
- src/components/mappe/SagomaQuartiere.tsx:42
- src/components/mappe/segniMappa.ts:13
- src/pages/DungeonDettaglioPage.tsx:376 e :394
- server/services/miniatureService.ts:2
- server/db/migrations/108_miniature_delle_immagini.ts:2
- server/routes/immagini-miniature.test.ts:2
- shared/miniature.ts:2
- src/components/mappe/ImmagineMappaUnica.test.tsx:97 e :115
- src/components/mappe/MappaTokyo.test.tsx:63
- src/pages/QuartierePage.scarico.test.tsx:28 (il valore `v=2026-10-21T10%3A00%3A00.000Z` della fixture → `v=2026-10-20T10%3A00%3A00.000Z`)

## docs/DECISIONI.md
1. Riga 2131: `**confermata dall'utente** il 2026-10-21` → `**confermata dall'utente** il 2026-10-20`.
2. Dopo la riga 2132 `(domanda: «va bene o vuoi l'illustrazione anche lì?» — risposta: «Per la prima dico sì»).` aggiungere la riga:
   `  In quella fascia, nei Palazzi con illustrazione, non c'è nemmeno la filigrana dello stemma (prima di L1 c'era).`
3. Righe 2135-2136: `NOTICE e \`licenze/\` con la LGPL-3.0\n  di libvips, scaricata da gnu.org con il permesso dell'utente)` →
   `NOTICE e \`licenze/\` con la LGPL-3.0\n  di libvips e la GPL-3.0 che la integra, scaricate da gnu.org con il permesso dell'utente)`.

## docs/ROADMAP.md, riga 1295 (riga di L1)
1. `**2° giro (team per ruoli, 2026-10-21):**` → `**2° giro (team per ruoli, 2026-10-20):**`
2. La parte finale `Vitest 594/594) | ⏳ in validazione (RIGETTATO al 1°) |` →
   `Vitest 594/594). **3° giro (2026-10-20):** dopo lo scarico automatico della pianta il quartiere si rilegge e intestazione e visore mostrano la stessa immagine (G6, test QuartierePage.scarico visto rosso); `licenze/GPL-3.0.txt` accanto alla LGPL; DECISIONI e date corrette; collaudo sul commit esatto (istanza separata 3301/5473): status pulito, typecheck e lint verdi, Vitest 596/596, F-03/F-06/F-10/F-28 e G6 superati a 375, 768, 1024×690, 1280×689, impronte dei dati identiche, 22/22, 75 «Sulla mappa», metro identica | ⏳ in validazione (RIGETTATO al 1° e al 2°) |`

## Dopo le modifiche (Collaudo)
- `npm run typecheck`, `npm run lint`, `npx vitest run src/components/mappe/ImmagineMappaUnica.test.tsx src/components/mappe/MappaTokyo.test.tsx server/routes/immagini-miniature.test.ts src/pages/QuartierePage.scarico.test.tsx --reporter=verbose` con EXIT, in `lotti/L1/esiti-collaudo/giro3/`.
- `grep -rn "2026-10-21"` su src/ server/ shared/ docs/DECISIONI.md docs/ROADMAP.md: vuoto (output grezzo).
- Commit sul branch `newreview-l2` (autorizzato dal PM in via eccezionale, perché la cartella di sviluppo non è separabile):
  messaggio `docs(L1): terzo verdetto — date corrette (2026-10-20), ROADMAP del terzo giro, GPL citata in DECISIONI` più la riga
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Poi `git rev-parse HEAD`, `git status --porcelain`, `git diff --stat e9fb4871 HEAD` e la nuova impronta di server/ shared/ src/ (come 77a017da…,
  rispetto a bd20ed72) in `esiti-collaudo/giro3/`. Avvisare il PM con l'hash.
