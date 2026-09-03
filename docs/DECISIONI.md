# Registro delle decisioni — project-p5r

Formato: data · decisione · motivazione · chi (U = utente, IA = assistente su proposta validata dall'utente).

| Data | Decisione | Motivazione | Chi |
|---|---|---|---|
| 2026-09-03 | Nuovo repo separato `C:\Repository\project-p5r`, stesso stack/convenzioni di project-jira | isolamento totale, nessun rischio di regressione, riuso di pattern collaudati | U |
| 2026-09-03 | Versione del gioco: **Persona 5 Royal** (non vanilla) | dataset `*Royal` (Faith, Councillor, tratti, allarme, Kichijoji…) | U |
| 2026-09-03 | Tutto in italiano (UI, API, schema, commenti); nomi Persona originali; skill con chiave canonica EN + resa IT in tabella `traduzione` editabile | localizzazione italiana ufficiale non disponibile come dataset; serve restare agganciati alle fonti aggiornabili | U/IA |
| 2026-09-03 | Dataset: import dal repo Apache-2.0 chinhodado/persona5_calculator **+ verifica incrociata** con aqiu384/megaten-fusion-tool, attribuzione in `NOTICE` | dati completi subito, massima affidabilità | U |
| 2026-09-03 | Fase 0 ampia: scaffold + compendio consultabile + tracking partita | app subito utile in gioco | U |
| 2026-09-03 | "Catene di fusione cicliche" = TUTTI i bonus attuabili: propagazione skill a catena, bonus EXP arcana del Confidente, Allarme delle fusioni, Potenziamento/Forca, Addestramento, altri | richiesta esplicita dell'utente | U |
| 2026-09-03 | Uso da tablet durante la partita → layout tablet-first, **anche mobile** (375px) e desktop; bersagli touch ≥ 44px | l'app sostituisce la guida cartacea/online mentre si gioca | U |
| 2026-09-03 | Obiettivo di prodotto: trasformare la guida allgamestaff.it in app (Doti sociali con pulsanti, Confidenti con rango e risposte migliori, domande in classe, calendario…) | richiesta esplicita; mappa in `docs/riferimenti/mappa-moduli-guida.md` | U |
| 2026-09-03 | Partite multiple: ogni dato utente ha `partita_id`, una partita attiva selezionabile | l'utente vuole passare fra set di gioco diversi | U |
| 2026-09-03 | Porte dev 5273 (FE) / 3101 (BE); in Docker NESSUNA porta pubblicata: FE sulla rete esterna del tunnel (`PROXY_NETWORK`, default `proxy`), BE solo su rete interna proxato da nginx su `/api/` | il tunnel Cloudflare (gestito dall'utente) raggiunge il FE per nome sulla rete del proxy; nessuna esposizione pubblica | U |
| 2026-09-03 | Repository GitHub pubblico `merlinoalbus/project-p5r`, push autorizzato all'assistente | immagini GHCR pubbliche senza credenziali per Portainer/watchtower | U |
| 2026-09-03 | Deploy: docker-compose per Portainer che punta al repo GitHub; immagini su GHCR da GitHub Actions (gate CI → build); watchtower ESTERNO globale (solo label) | infrastruttura già in uso dall'utente | U |
| 2026-09-03 | DB SQLite creato dal backend sul volume `/data` al primo avvio; dataset seed dentro l'immagine backend, caricamento idempotente | nessun passo manuale al deploy; dati utente sopravvivono agli update | U/IA |
| 2026-09-03 | Documentazione di bordo obbligatoria (`CLAUDE.md`, `docs/ARCHITETTURA.md`, `docs/ROADMAP.md`, `docs/DECISIONI.md`) aggiornata a ogni step | qualsiasi IA/persona deve capire progetto, architettura e stato dal solo repo | U |
| 2026-09-03 | Prompt per la generazione degli asset grafici in stile P5R con link di riferimento (`docs/grafica/`) | coerenza visiva con il gioco | U |
| 2026-09-03 | Procedura: ogni step validato dal galaxy-task-validator (agent verifica-only, emulato con agent general-purpose) | CLAUDE.md globale dell'utente | U |
| 2026-09-03 | Elementi visivi: nessuna immagine protetta (Atlus) nel repo; caricamento dall'app + import da URL + asset originali generati da IA grafica, **con ogni testo in italiano**; serve un prompt per OGNI asset (`docs/grafica/prompt-immagini.md`) | vincolo di lingua e di licenza | U/IA |
| 2026-09-03 | Sezione Confidenti: immagine dell'arcano e del personaggio, rango raggiunto, prossime risposte ottimali per massimizzare i punti | richiesta esplicita | U |
| 2026-09-03 | Nomi canonici delle skill = localizzazione inglese di **Royal** (es. `Drain Fire`, non `Absorb Fire`); correzioni al dataset primario tracciate in `scripts/seed/correzioniRoyal.json` con fonte | la fonte primaria conserva nomi della versione base; l'app è per Royal | U/IA |
| 2026-09-03 | Step 0.6 (prompt grafici) anticipato prima di 0.3–0.5 per far partire la produzione degli asset | richiesta dell'utente | U |
