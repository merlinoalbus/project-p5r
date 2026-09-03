# Project P5R — Compagno di gioco per Persona 5 Royal

Web app locale (FE + BE + SQLite) da usare **su tablet durante la partita**: compendio Persona/Skill,
motore di fusione (diretta, inversa, alberi, catene), tracking della partita (Persona possedute,
Confidenti, Doti sociali) e moduli di "risposta immediata" (domande in classe, scelte migliori nei dialoghi).
Interfaccia e dati interamente in italiano.

## Stack

- **Frontend**: React 19 + Vite + Tailwind 4 + zustand + react-router (porta dev **5273**)
- **Backend**: Express 5 + better-sqlite3 + zod + pino, runtime `tsx` (porta **3101**)
- **Persistenza**: SQLite su disco in `data/project-p5r.db` (WAL), migrazioni versionate, backup rotante al boot
- **Test**: Vitest (BE + FE + shared)

Le porte sono diverse da `project-jira` (5173/3001) per far convivere i due progetti sulla stessa macchina.

## Avvio in sviluppo

```bash
npm install
cp .env.example .env
bash scripts/start-all.sh     # BE (3101) + FE (5273), con verifica di avvio
```

Script disponibili in `scripts/`: `start-be.sh`, `start-fe.sh`, `stop-be.sh`, `stop-fe.sh`,
`restart-be.sh`, `restart-fe.sh`, `start-all.sh`, `stop-all.sh`, `restart-all.sh`.
Log in `BE.log` / `FE.log`. Il backend **non** si ricarica da solo: dopo modifiche in `server/` usare `restart-be.sh`.

Altri comandi: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.

## Struttura

```
server/        Express: config, bootstrap, middleware, db (migrazioni); routes/services/schemas dallo step 0.4
src/           React: pages, components (layout tablet-first), stores, services/api, hooks
shared/        tipi condivisi FE/BE (solo tipi e costanti pure)
data/seed/     dataset Persona 5 Royal normalizzato (versionato, caricato al boot — dallo step 0.2)
scripts/       gestione server (+ pipeline di acquisizione/verifica del dataset dallo step 0.2)
docs/          riferimenti di dominio, decisioni, prompt grafici
```

## Deploy (Portainer + GHCR + watchtower esterno)

- `docker-compose.yml`: stack `project_p5r` con frontend nginx (host **13820**, target del tunnel Cloudflare) e backend
  raggiungibile solo dalla rete interna via proxy `/api/` del frontend;
  DB creato dal backend sul volume `project_p5r_data` al primo avvio (migrazioni + seed inclusi nell'immagine).
- `.github/workflows/docker-publish.yml`: a ogni push su `main`, dopo il gate CI, pubblica
  `ghcr.io/merlinoalbus/project-p5r-backend` e `…-frontend` con tag `:latest` e `:sha`.
- I container portano la label `com.centurylinklabs.watchtower.enable=true` per il watchtower globale dell'host.

## Fonti dei dati

Il compendio Royal è derivato dal dataset Apache-2.0 di [chinhodado/persona5_calculator](https://github.com/chinhodado/persona5_calculator)
con verifica incrociata su [aqiu384/megaten-fusion-tool](https://github.com/aqiu384/megaten-fusion-tool).
Il dataset normalizzato e il file `NOTICE` con le attribuzioni arrivano con lo step 0.2 (`docs/ROADMAP.md`).
