# Verifica del lavoro di Codex alla ripresa (2026-10-23, sera)

L'utente ha chiesto: «recupera lo stato attuale del progetto, verifica quanto fatto da codex, integra eventuali mancanze o elementi dubbi e procedi con il completamento dell'attività».

## Stato trovato
- `newreview` = f63f10b0, uguale su GitHub e in locale; la cartella di lavoro era pulita. È pubblicato su p5s: health 200, schema 138 di gioco e 30 utente; le ultime pipeline sono riuscite.
- Sul codice di Codex `npm run typecheck`, `npm run lint` e `npm run build` danno tutti exit 0.
- Codex si era fermato per ordine dell'utente dopo L7-TANAKA-NOTA. Il prossimo punto della Regia è L7-TANAKA-TRANSAZIONE.

## Verifica avversariale distinta (revisore indipendente, sola lettura): RIGETTATO, con questi rilievi
| # | Rilievo | Decisione o azione |
|---|---|---|
| F1 | `verificaArchivioLegacy` (archivio degli acquisti storici) gira a ogni avvio e, se fallisce, ferma il server: p5s va in 502, ed è già successo | **Utente**: «non è necessario mantenerlo... va bene che giri solo la prima volta». Il controllo resta solo dentro la migrazione → FE |
| F2 | Gli effetti delle voci del Diario hanno due fonti: `voce_effetto` (nuova) e `produce_json` (letta ancora da «Il gioco dà», dal quiz e dagli oggetti citati) | Una sola fonte, `voce_effetto` → FE |
| F3 | Una sola voce incoerente fa rispondere 409 a tutta la giornata del Diario | Errore isolato sulla voce, mostrata «da correggere» → FE. Sui dati di oggi non succede: 998 voci su 998 sono convertite |
| F4 | Le misure del lavoro da preservare non erano riconciliate con la base (611 contro 613 pin, 226 contro 227 voci di Madarame) | **Riconciliato** su una copia in sola lettura di p5s (sotto) |
| F5 | Le migrazioni 121, 122 e 132 importano da servizi vivi, quindi non sono congelate | La logica attuale viene copiata dentro `db/migrations/` → FE |
| F6 | La nota storica di Tanaka (Homunculus 120000 contro 5000 di Royal) è scritta nel codice | **Utente**: «Sì, nel DB». Diventa una nota modificabile con «Ripristina» → FE |
| F7 | Documenti superati: la riga di L7 nella ROADMAP, la tabella di STATO-ATTUALE, il mandato in CLAUDE.md, la regola del backup contraddittoria | **Utente**: «Niente backup manuale». Documenti allineati dal PM |
| F8 | Intestazioni di STATO-ATTUALE poco leggibili (parole attaccate, sigle non spiegate) | Sezione «DOVE SIAMO ADESSO» riscritta dal PM |
| F9 | `135_takemi_manifest.ts` non è una migrazione ma porta un numero | Rinominato fuori dalla numerazione → FE |
| F10 | Le migrazioni 122, 123 e 124 riscrivono il registro di elementi già nel Cestino di origine seed | Da sapere: cambia ciò che «Rimetti» ripristina per quegli elementi seed |
| F11 | `regoleAllAvvio` gira ancora a ogni avvio (rilievo che non riguarda Codex) | Resta aperto, da decidere con l'utente insieme al pacchetto superato |

## F4: misure sulla copia di p5s del 23/10, 19:35Z (sola lettura, file locale fuori dal repository)
- **Kamoshida**: 169 voci, 359 pin utente (369 totali), 27 planimetrie.
- **Madarame**: 226 voci, 254 pin utente (260 totali), 18 planimetrie.
- **Pin utente**: 359 + 254 = **613**, uguale alla base. Il «611» citato da Codex non trova riscontro.
- **La voce mancante di Madarame** è «Raccogli Installazione Artistica» (Prima Infiltrazione al Museo). È nel **Cestino** (id 18), eliminata dall'app il 2026-10-20 alle 17:59:30Z: una scrittura fatta dall'app, non da una migrazione. Si recupera con «Rimetti».
- **Diario 04-01…06-01**: 255 voci, tutte con effetti «convertita»; nessuna voce senza transizione.

## Decisioni dell'utente trovate nei documenti di Codex (valgono)
- La guida del visore mostra tutte le infiltrazioni della planimetria.
- «Importa» resta, per sostituire `gioco.db` con un backup locale scelto, dopo anteprima e conferma.
- In ogni discrepanza prevale il dato documentato di Persona 5 Royal; il dato superato resta come nota storica.
- Commit e push di codice e documenti insieme, a fine lotto.
