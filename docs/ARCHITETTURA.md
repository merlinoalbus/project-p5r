# Architettura — project-p5r

Aggiornato allo step **0.5 (frontend)**. Le sezioni marcate *(previsto)* descrivono ciò che gli step successivi
realizzeranno secondo `docs/ROADMAP.md`.

## 1. Vista d'insieme

```
 tablet / telefono / desktop
        │  HTTP (stessa origine)
        ▼
 ┌──────────────────────┐   /api/* (proxy)   ┌──────────────────────────┐
 │ Frontend SPA React   │ ─────────────────► │ Backend Express 5        │
 │ Vite dev 5273 /      │                    │ tsx runtime, porta 3101  │
 │ nginx :80 in Docker  │ ◄───────────────── │ zod · pino · better-sqlite3
 └──────────────────────┘   { data } / { error }└─────────┬────────────────┘
                                                          │ SQLite (WAL)
                                                          ▼
                                         data/project-p5r.db  (volume /data in Docker)
                                         ├─ tabelle DATI DI GIOCO  (dal seed, rigenerabili)
                                         └─ tabelle DATI UTENTE    (per partita_id)
```

- **Un solo processo backend**, nessun DB esterno, nessuna autenticazione (app personale in LAN/Tailscale).
- Il frontend parla solo con `/api` sulla stessa origine (proxy Vite in dev, nginx in produzione).

## 2. Stack e versioni
| Livello | Tecnologia |
|---|---|
| Runtime | Node ≥ 22, TypeScript 5.9, ESM (`"type": "module"`) |
| Frontend | React 19, react-router 7, zustand 5, Tailwind 4 (plugin Vite, config CSS-first), Vite 8 |
| Backend | Express 5, better-sqlite3 12, zod 4, pino 10, tsx (esegue i `.ts` a runtime, anche in produzione) |
| Test | Vitest 4 (+ jsdom e Testing Library per i componenti), supertest per le route (`server/bootstrap.test.ts`, `server/routes/api.test.ts`), DB in memoria con seed reale (`server/services/seed/caricaSeed.test.ts`), migrazioni (`server/db/migrationRunner.test.ts`), pipeline seed (`scripts/seed/*.test.ts`) |
| Qualità | ESLint 9 flat config, `tsc -b` su 4 progetti (app / node / server / test) |

## 3. Struttura del repository
```
server/
  index.ts            boot: initDb → runBootBackup → runMigrations → caricaSeed → listen; SIGINT/SIGTERM → server.close + closeDb
  bootstrap.ts        factory Express: middleware in ordine, router, health/config, 404, errorHandler
  config.ts           unica lettura delle env (BE_PORT/PORT, DATA_DIR, LOG_LEVEL, SEED_DIR)
  middleware/         requestContext (requestId + logger), responseShape ({data}), validate (zod), errorHandler
  db/                 dbService (connessione + pragma + cache statement), migrationRunner (user_version), backupService (7 copie)
  db/migrations/      001_compendio (dati di gioco + traduzioni + seed_meta), 002_partita (dati utente, immagini); registro in index.ts
  routes/             compendio (arcani, glossario, regole di fusione, persona, skill, oggetti, confidenti), traduzioni, partite (+ doti,
                      confidenti, compendio personale, Persona possedute), immagini (PUT grezzo image/*, import da URL, file)
  services/seed/      caricaSeed.ts: carica data/seed nel DB al boot (hash in seed_meta, upsert per nome, traduzioni utente intoccabili)
  services/           traduzioniService (cache in memoria, `t(ambito, chiave)`), compendioService, partiteService, immaginiService,
                      catalogoRiferimentiService; fusione/motoreFusione.ts (motore puro su snapshot in memoria), fusione/alberoFusione.ts (piani
                      ricorsivi) e fusione/fusioneService.ts (DTO)
  schemas/            zod: comuni (id, booleani da query, livello), compendio, traduzioni, partite, immagini
  utils/              logger, httpError
shared/types.ts       tipi/costanti pure condivise FE/BE (nessun import Node)
shared/seed.ts        tipi dei JSON del seed (prodotti dagli script, letti dal backend e dal frontend)
src/
  main.tsx            boot bloccante su GET /api/config → schermata d'errore HTML se il BE non risponde
  router.tsx          react-router (createBrowserRouter)
  tailwind.css        tema P5R: token colore (bg/surface/primary rosso #e5352b, colori elemento), classi .btn/.touch/.tabella/.card/.chip
  components/layout/  MainLayout (carica glossario e partite), Topbar (+ PartitaSelettore), Sidebar (≥lg), BottomNav (<lg), navigazione.tsx
  components/shared/  ErrorBoundary, PageState/EmptyState/Spinner (illustrazione predefinita), Toast, icons, Modal (portal su body),
                      CampoRicerca, ImmagineEntita (utente → asset predefinito → iniziali; mai ritagliata, tocco = ingrandimento,
                      comandi carica/da URL/rimuovi nella finestra), AssetImg (asset con fallback)
  components/compendio/ ElementoChip, AffinitaGriglia (completa e compatta), StatisticheBarre (nome, tacche, totale, differenza dalla base)
  components/partita/ DotiSociali (note ♪/♪♪/♪♪♪, libro, ×1,5, ±1, rango e punti mancanti), ConfidentiPartita (rango ±, note ♪/♪♪/♪♪♪, regalo, uscita, bonus arcano dalla scorta,
                      esami/invito, annulla ultimo, barra verso il rango successivo, sblocco, note, immagine personaggio + carta dell'arcano), ScortaPersona (aggiunta dal compendio,
                      modifica livello/statistiche/skill), CompendioPersonale (spunte + completamento), RiepilogoPartita, NuovaPartitaModal
  components/fusione/ SelettorePersona (ricerca con elenco), Calcolatore (A + B), RicettePersona (per ottenere / con, filtri, mostra altre), RicettaRiga,
                      PianiFusione (albero ricorsivo con foglie scorta/Registro/cattura, opzioni)
  components/impostazioni/ GestionePartite, ImportaRiferimenti (catalogo link → importazione a lotti di 10 con avanzamento ed esiti), TraduzioniEditor
  pages/              Home, Compendio (232 Persona, filtri client-side), PersonaDettaglio, Glossario (termini per categoria), Skill (525, filtri), SkillDettaglio,
                      Fusione (due arcani, matrice 24×24, ricette speciali, Demoni del Tesoro), Partita (schede), Impostazioni, NotFound
  stores/             configStore, notificationStore, glossarioStore (rese italiane, caricato una volta), partitaStore (partite + attiva),
                      preferenzeStore (localStorage: grafica predefinita), assetStore (manifest /asset/manifest.json + hook useAsset)
  utils/              constants, elementi, punti (formato/anteprima punti Confidente), assetPredefiniti (chiavi manifest per entità)
vite/                 assetPredefiniti.ts — plugin: manifest degli asset in public/asset/ (dinamico in dev, emesso in build)
public/asset/         asset grafici predefiniti (vedi README.md e docs/grafica/prompt-immagini.md); vuoto nel repo finché non consegnati
data/riferimenti/     immagini.json — catalogo di SOLI LINK alle immagini ufficiali sul Megami Tensei Wiki (Arcani, Confidenti, Persona),
                      letto dal BE (`RIFERIMENTI_DIR`, nell'immagine /app/data/riferimenti); importazione nella propria istanza dalle Impostazioni
  services/api/       _httpClient (timeout+retry), _helpers (envelope, ApiError, queryString), sistema, compendio, traduzioni, partite, immagini
  hooks/, utils/      useDocumentTitle, useCarica (stato di caricamento derivato, senza setState negli effetti), constants, elementi (colori)
data/seed/            dataset Royal normalizzato in JSON (persona, skill, oggetti, fusione, traduzioni, versione), versionato,
                      incluso nell'immagine Docker; sorgenti/ = file grezzi delle fonti (fuori dall'immagine)
scripts/seed/         pipeline dataset: fonti (commit fissati) → scarica (manifest sha256) → normalizza (sandbox vm,
                      correzioni Royal documentate, gate traduzioni 100%) → verifica incrociata (report); gestione server in scripts/*.sh
docs/                 documentazione di bordo e riferimenti di dominio
```

## 4. Flusso di una richiesta API
1. `requestContextMiddleware`: genera/propaga `X-Request-Id`, crea child logger, access log a fine risposta.
2. `responseShapeMiddleware`: monkey-patch di `res.json` → `{ data }` (idempotente su envelope già formati).
3. `cors()` + `express.json({ limit: '5mb' })`.
4. Router di area (`/api/compendio`, `/api/traduzioni`, `/api/partite`, `/api/immagini`) con `validate({ params, query, body })` zod prima dell'handler (Express 5: `req.query` è
   un getter, quindi il middleware fa shadowing sull'istanza).
5. `/api/health` (stato DB + `user_version`), `/api/config` (valori pubblici per il boot FE).
6. 404 JSON per `/api/*` sconosciute; `errorHandler` ultimo: `HttpError` → status+codice; errori 4xx di Express/body-parser (JSON malformato 400, corpo oltre il limite 413, percorso non decodificabile 400) → envelope in italiano; altro → 500 con stack nel log.

## 5. Persistenza
- Connessione unica better-sqlite3, pragma `journal_mode=WAL`, `synchronous=NORMAL`, `busy_timeout=5000`, `foreign_keys=ON`.
- Migrazioni versionate su `PRAGMA user_version`, ogni migrazione in una transazione, `foreign_key_check` dopo ogni applicazione.
- Backup online (`db.backup`) prima delle migrazioni a ogni boot, rotazione a 7 copie in `data/backups/`.
- Schema in due famiglie (migrazioni 001–004; `user_version` = 4):
  - **dati di gioco** (`arcana`, `persona` + `persona_affinita` + `persona_skill`, `skill` + `skill_fonte_esecuzione`, `oggetto`,
    `fusione_arcana`, `fusione_speciale` + `_ingrediente`, `tesoro` + `tesoro_modificatore`, `eredita_matrice`, `dlc_set` + `_persona`,
    `confidente` + `confidente_rango` (punti necessari per rango, 0 = non a punti), `dote_sociale` + `dote_sociale_rango` (5 ranghi
    con nome e soglia), `traduzione` (compresi gli ambiti `skill`, `persona`, `termine` della localizzazione italiana ufficiale
    dalla guida allgamestaff, vedi `docs/riferimenti/glossario-localizzazione.md`), `seed_meta`): caricati da `caricaSeed` al boot. Hash del contenuto del seed in
    `seed_meta` → reseed solo quando il seed cambia; `persona`/`skill`/`oggetto`/`confidente` in UPSERT per chiave naturale
    (id stabili, mai cancellazioni), relazioni di gioco svuotate e ricaricate, `traduzione` con `fonte='utente'` mai sovrascritta;
  - **dati utente** (`partita` con indice parziale "una sola attiva", `compendio_partita`, `persona_posseduta` +
    `persona_posseduta_skill` (8 slot), `confidente_partita` (sbloccato, rango 0–10, punti verso il rango successivo), `dote_sociale_partita` (punti cumulativi), `immagine`
    per i file caricati in `DATA_DIR/immagini/`) sempre con `partita_id` e ON DELETE CASCADE.
  - Statistiche per livello: `shared/statistiche.ts` — +3 punti per livello (regressione sul dataset: somma ≈ 10 + 3·L) ripartiti in
  proporzione alle statistiche base; il BE espone per ogni Persona posseduta `statistiche` (registrate dall'utente oppure stimate al livello) e
  `statisticheBaseLivello`; la scheda Persona ha il cursore del livello con stima e differenza.
- Testi canonici (nomi Persona/skill, chiavi arcana/elementi, effetti, descrizioni) restano in inglese Royal nelle tabelle di
    gioco; la resa italiana si legge da `traduzione(ambito, chiave)`; i DTO espongono `nomeIt` per skill e Persona (fallback al canonico).

## 5 bis. API (step 0.4)
| Area | Endpoint principali |
|---|---|
| Compendio | `GET /api/compendio/arcani`, `/glossario`, `/termini` (glossario italiano ↔ inglese per categoria), `/fusione/regole`, `/persona?q&arcana&livelloMin&livelloMax&dlc&rara&speciale&skill`, `/persona/:id`, `/skill?q&elemento`, `/skill/:id`, `/oggetti?q&categoria`, `/confidenti` |
| Traduzioni | `GET /api/traduzioni?ambito&q&soloUtente`, `GET /ambiti`, `PUT /:ambito/:chiave {testo}` (→ fonte utente), `DELETE /:ambito/:chiave` (ripristina il seed) |
| Partite | `GET/POST /api/partite`, `GET /attiva`, `GET/PUT/DELETE /:id`, `POST /:id/attiva`; `GET /:id/doti` (punti, rango, nomeRango, sogliaProssima, mancanti, ranghi[]), `PATCH /:id/doti/:chiave {punti|delta|note 1–3 + libro/fortuna}`; `GET /:id/confidenti` (punti, puntiNecessari, mancanti, personaArcanoInScorta), `PUT /:id/confidenti/:chiave {sbloccato,rango,punti|deltaPunti|noteRisposta 1–3|regalo|uscita + bonusArcano/esame/invito,note}`; `GET /:id/compendio`, `PUT /:id/compendio/:personaId`; `GET/POST /:id/persona`, `PUT/DELETE /:id/persona/:possedutaId` |
| Fusione | `GET /api/fusione/fondi?a&b&partita|dlc` (esito con motivo), `GET /api/fusione/ricette/:personaId?partita|dlc&livelloMax&limite` (totale, totaleSenzaFiltri, ricette per costo), `GET /api/fusione/con/:personaId?…` (fusioni con la Persona come ingrediente), `GET /api/fusione/piani/:personaId?partita&profondita≤4&alternative≤10&catture&limitaLivello|livelloMax` (piani ricorsivi) |
| Immagini | `GET /api/immagini?ambito`, `GET /:ambito/:chiave`, `GET /:ambito/:chiave/file`, `PUT /:ambito/:chiave` (corpo grezzo `image/*`, max 8 MB), `POST /:ambito/:chiave/da-url {url}`, `DELETE /:ambito/:chiave`; catalogo dei riferimenti (solo link): `GET /catalogo?ambito` (voci + `presente`), `POST /catalogo/importa {ambito, chiavi ≤20, sovrascrivi}` → `{importate, saltate, fallite[{chiave, motivo}]}` |
Ogni risposta porta le chiavi canoniche più i campi `*Nome` in italiano risolti da `traduzioniService`.

## 6. Motore di fusione *(Fase 1 realizzata; fasi 2–4 previste)*
- `server/services/fusione/motoreFusione.ts`: snapshot in memoria del compendio (invalidato al reseed) e contesti memoizzati per insieme di DLC posseduti;
  regole di chinhodado (speciale a due → Demone del Tesoro + normale con modificatore di rango → arcani diversi: prima Persona con livello
  ≥ 1+⌊(La+Lb)/2⌋ → stesso arcano: la più alta con livello ≤, esclusi gli ingredienti); ricette inverse per enumerazione delle coppie di arcani
  che producono l'arcano del target + fusioni con Demone del Tesoro; costo Σ(27L²+126L+2147). `fusioneService.ts` produce i DTO con nomi
  italiani e i motivi in italiano quando la fusione non è possibile.
- API pubblica del motore: `creaContesto(dlcPosseduti)`, `fondi(a, b, ctx)`, `ricettePer(target, ctx)`, `fusioniCon(persona, ctx)`,
  `ricettaSpeciale`, `costoFusione`, `livelloFusione`, `arcanaRisultato`, `personaFusione(id)`, `invalidaMotoreFusione`.
- `server/services/fusione/alberoFusione.ts` (Fase 2): `pianiFusione(target, ctx, disponibilita, opzioni)` → piani ordinati per costo; foglie
  `scorta` (0 yen, un esemplare per volta), `registro` (prezzo di evocazione), `cattura` (Persona normale ≤ livelloMax); nodi `fusione` con
  2 ingredienti (o N per le ricette speciali). Stima ottimistica h(p, profondità) memoizzata + ricerca in profondità con potatura
  (branch-and-bound sulle N migliori), ampiezza per nodo 12; `pianoCoerente` verifica ogni nodo col motore. La disponibilità viene da
  `persona_posseduta` e `compendio_partita` della partita.
- Previsti (fasi 3–4, sullo stesso snapshot): `eredita` (matrice tipo-eredità × elemento, slot ereditabili), `catene` (propagazione skill
  multi-step, bonus del Confidente, Allarme, Potenziamento).

## 7. Frontend
- Layout tablet-first: `MainLayout` con `Sidebar` visibile da `lg` (1024px) e `BottomNav` fissa sotto (5 voci, 64px); verificato a 375/768/1280 px.
- Dati remoti per pagina con `useCarica` (chiave = dipendenze serializzate + generazione; caricamento derivato) + `PageState`;
  stato globale in zustand: config, notifiche, glossario (rese italiane), partite (elenco + attiva, cambio dalla Topbar).
- Elenchi Persona/skill caricati una volta e filtrati lato client (istantanei su tablet; ~360 KB per le 232 Persona).
- Immagini: `ImmagineEntita` mostra il file caricato per (ambito, chiave), altrimenti l'asset predefinito (`persona/<slug>`, `arcani/<chiave>` o
  `arcani/icona/<chiave>`, `confidenti/<chiave>`), altrimenti le iniziali; caricamento file (PUT grezzo) o import da URL.
- Grafica predefinita (step 0.8): `public/asset/` → manifest generato dal plugin Vite → `assetStore` (caricato in `MainLayout`, fallimento = vuoto) →
  `AssetImg`/`useAsset` con preferenza `graficaPredefinita` (localStorage, default attiva, Impostazioni → Grafica). Punti collegati: logo (Topbar),
  icone di navigazione (`ui/nav-*`, variante `-attiva`), icone elemento (`elementi/*`), icone affinità (`affinita/*-senza-testo`), targhette doti
  (`doti/*`), badge rango Confidente (`ui/rango-N`, `ui/rango-max`), sfondo (`sfondi/pattern-nero`), banner Fusione (`sfondi/stanza-velluto`),
  stati vuoti (`illustrazioni/*`), icona del sito (`identita/icona-32`). Ogni punto ha un fallback testuale/SVG: l'app funziona senza alcun asset;
  un file che non si carica viene segnato mancante per la sessione.
- Tema Persona 5: nero profondo, rosso `#e5352b`, bianco; token per ogni elemento di gioco (`--color-el-*`); classi `.touch`/`.btn`/`.btn-sm` ≥ 44px;
  `overflow-wrap: anywhere` sul body (testi di gioco con token lunghi non generano scroll orizzontale a 375 px).
- Meccaniche di gioco nel tracker: Doti = note→punti (2/3/5, libro 7, fortuna ×1,5 per difetto) con soglie dei 5 ranghi; Confidenti = note→punti (5/10/15, regalo 50, uscita 10) × bonus arcano 1,5 × esami × invito, verso
  il rango successivo con soglie per Confidente (`docs/riferimenti/confidenti-punti.md`), azzerati al cambio di rango; `src/utils/punti.ts` replica la formula per l'anteprima.

## 8. Build, test, deploy
- Test (Vitest, 20 file / 79 casi): BE su DB in memoria con seed reale (`server/routes/api.test.ts`, migrazioni, seed, `partiteService.test.ts` per le meccaniche pure),
  FE in jsdom con API simulate via `vi.mock` (`DotiSociali`, `ConfidentiPartita`, `Modal`, `ImmagineEntita`, `AffinitaGriglia`, `useCarica`, `utils/punti`).
- Dev: `scripts/start-all.sh` (BE con `tsx watch`, FE con `vite --host`), log `BE.log`/`FE.log`, PID in `.pids/`.
  Stop (`termina_server` in `scripts/_comuni.sh`): individua il listener sulla porta (deve essere `node`), risale i padri fino alla
  radice del pidfile o all'ultimo runtime nostro (mai oltre un `bash` diverso dal pidfile), poi termina l'albero — Linux: SIGTERM,
  attesa ≤5 s, SIGKILL ai superstiti; Windows: `taskkill //T` sul WINPID (tradotto dal PID MSYS). Provato su Windows e WSL Ubuntu.
- CI (`.github/workflows/ci.yml`): typecheck, lint strict su `server/`, lint informativo, test, audit.
- Immagini (`docker-publish.yml`): dopo il gate `verify`, build & push su GHCR `merlinoalbus/project-p5r-{backend,frontend}` con tag `latest` e `sha`.
- Il backend in Docker gira come `node --import tsx server/index.ts` (PID 1 = node, riceve SIGTERM da `docker stop`).
- Runtime (`docker-compose.yml`, stack Portainer dal repo): nessuna porta pubblicata; FE nginx sulla rete esterna `PROXY_NETWORK` (default `proxy`) raggiunto da cloudflared come `http://project_p5r_fe:80`, BE solo su rete interna (3101, proxato da nginx su `/api/`),
  volume `project_p5r_data` su `/data` (DB creato al primo boot, seed nell'immagine), label watchtower per l'aggiornamento automatico.
