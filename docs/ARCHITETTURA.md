# Architettura — project-p5r

Aggiornato allo step **0.1 (scaffold)**. Le sezioni marcate *(previsto)* descrivono ciò che gli step successivi
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
| Test | Vitest 4 (+ jsdom e Testing Library per i componenti), supertest per le route (`server/bootstrap.test.ts`, `server/db/migrationRunner.test.ts`) |
| Qualità | ESLint 9 flat config, `tsc -b` su 4 progetti (app / node / server / test) |

## 3. Struttura del repository
```
server/
  index.ts            boot: initDb → runBootBackup → runMigrations → (caricaSeed, previsto) → listen; SIGINT/SIGTERM → server.close + closeDb
  bootstrap.ts        factory Express: middleware in ordine, router, health/config, 404, errorHandler
  config.ts           unica lettura delle env (BE_PORT/PORT, DATA_DIR, LOG_LEVEL, SEED_DIR)
  middleware/         requestContext (requestId + logger), responseShape ({data}), validate (zod), errorHandler
  db/                 dbService (connessione + pragma + cache statement), migrationRunner (user_version), backupService (7 copie)
  db/migrations/      NNN_nome.ts append-only, registrate in index.ts
  routes/             (previsto) route sottili per area: compendio, skill, fusione, partita, traduzioni
  services/           (previsto) logica: motore di fusione puro, servizi DB
  schemas/            (previsto) schemi zod condivisi da route e validate()
  utils/              logger, httpError
shared/types.ts       tipi/costanti pure condivise FE/BE (nessun import Node)
src/
  main.tsx            boot bloccante su GET /api/config → schermata d'errore HTML se il BE non risponde
  router.tsx          react-router (createBrowserRouter)
  tailwind.css        tema P5R: token colore (bg/surface/primary rosso #e5352b, colori elemento), classi .btn/.touch/.tabella/.card/.chip
  components/layout/  MainLayout, Topbar, Sidebar (≥lg), BottomNav (<lg), navigazione.tsx (voci condivise)
  components/shared/  ErrorBoundary, PageState/EmptyState/Spinner, Toast, icons
  pages/              HomePage, NotFoundPage (+ Compendio/Skill/Fusione/Partita/Impostazioni previste)
  stores/             configStore, notificationStore (zustand)
  services/api/       _httpClient (timeout+retry), _helpers (envelope, ApiError, queryString), sistema.ts, index.ts barrel
  hooks/, utils/      useDocumentTitle, constants
data/seed/            (previsto) dataset Royal normalizzato in JSON, versionato, incluso nell'immagine Docker
scripts/              gestione server (bash) + (previsto) pipeline seed: scarica / normalizza / verifica incrociata
docs/                 documentazione di bordo e riferimenti di dominio
```

## 4. Flusso di una richiesta API
1. `requestContextMiddleware`: genera/propaga `X-Request-Id`, crea child logger, access log a fine risposta.
2. `responseShapeMiddleware`: monkey-patch di `res.json` → `{ data }` (idempotente su envelope già formati).
3. `cors()` + `express.json({ limit: '5mb' })`.
4. *(previsto)* Router di area (`/api/...`) con `validate({ params, query, body })` zod prima dell'handler (Express 5: `req.query` è
   un getter, quindi il middleware fa shadowing sull'istanza).
5. `/api/health` (stato DB + `user_version`), `/api/config` (valori pubblici per il boot FE).
6. 404 JSON per `/api/*` sconosciute; `errorHandler` ultimo: `HttpError` → status+codice; JSON malformato → 400; altro → 500 con stack nel log.

## 5. Persistenza
- Connessione unica better-sqlite3, pragma `journal_mode=WAL`, `synchronous=NORMAL`, `busy_timeout=5000`, `foreign_keys=ON`.
- Migrazioni versionate su `PRAGMA user_version`, ogni migrazione in una transazione, `foreign_key_check` dopo ogni applicazione.
- Backup online (`db.backup`) prima delle migrazioni a ogni boot, rotazione a 7 copie in `data/backups/`.
- *(previsto, step 0.3)* Schema in due famiglie:
  - **dati di gioco** (`arcana`, `persona`, `persona_affinita`, `persona_skill`, `skill`, `tratto`, `fusione_arcana`,
    `fusione_speciale`, `fusione_rara`, `eredita_matrice`, `oggetto`, `traduzione`) caricati dal seed in modo idempotente,
    con `seed_versione` per aggiornamenti futuri;
  - **dati utente** (`partita`, `compendio_partita`, `persona_posseduta`, `persona_posseduta_skill`, `confidente_partita`,
    `dote_sociale_partita`, `obiettivo`, `piano_fusione`) sempre con `partita_id` e ON DELETE CASCADE; una sola partita "attiva".

## 6. Motore di fusione *(previsto, fasi 1–4)*
Modulo TypeScript puro in `server/services/fusione/` senza I/O, alimentato da un'istantanea in memoria del compendio:
`tabellaArcana` (24×24 + casi impossibili del Giudizio), `fusioneDiretta` (speciale → rara → normale; stesso arcana verso
il basso, arcana diversi verso l'alto, livello `floor((a+b)/2)+1`), `fusioneInversa` (indici per arcana, ricerca binaria sui
livelli), `alberoFusione` (branch-and-bound su costo `27L²+126L+2147`, profondità, cap livello protagonista), `eredita`
(matrice tipo-eredità × elemento, slot ereditabili), `catene` (propagazione skill multi-step, bonus Confidente, Allarme, Potenziamento).

## 7. Frontend
- Layout tablet-first: `MainLayout` con `Sidebar` visibile da `lg` (1024px) e `BottomNav` fissa sotto (5 voci, 64px).
- Stato remoto per pagina con `useEffect` + `PageState`; stato globale minimo in zustand.
- Tema Persona 5: nero profondo, rosso `#e5352b`, bianco; token per ogni elemento di gioco (`--color-el-*`).

## 8. Build, test, deploy
- Dev: `scripts/start-all.sh` (BE con `tsx watch`, FE con `vite --host`), log `BE.log`/`FE.log`, PID in `.pids/`.
  Stop (`termina_server` in `scripts/_comuni.sh`): individua il listener sulla porta (deve essere `node`), risale i padri fino alla
  radice del pidfile o all'ultimo runtime nostro (mai oltre un `bash` diverso dal pidfile), poi termina l'albero — Linux: SIGTERM,
  attesa ≤5 s, SIGKILL ai superstiti; Windows: `taskkill //T` sul WINPID (tradotto dal PID MSYS). Provato su Windows e WSL Ubuntu.
- CI (`.github/workflows/ci.yml`): typecheck, lint strict su `server/`, lint informativo, test, audit.
- Immagini (`docker-publish.yml`): dopo il gate `verify`, build & push su GHCR `merlinoalbus/project-p5r-{backend,frontend}` con tag `latest` e `sha`.
- Il backend in Docker gira come `node --import tsx server/index.ts` (PID 1 = node, riceve SIGTERM da `docker stop`).
- Runtime (`docker-compose.yml`, stack Portainer dal repo): nessuna porta pubblicata; FE nginx sulla rete esterna `PROXY_NETWORK` (default `proxy`) raggiunto da cloudflared come `http://project_p5r_fe:80`, BE solo su rete interna (3101, proxato da nginx su `/api/`),
  volume `project_p5r_data` su `/data` (DB creato al primo boot, seed nell'immagine), label watchtower per l'aggiornamento automatico.
