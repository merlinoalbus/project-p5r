# Project P5R — Compagno di gioco per Persona 5 Royal

Web app (frontend, backend e SQLite) da usare su tablet, telefono e desktop durante la partita a **Persona 5 Royal**. Porta in app
la guida italiana del gioco e aggiunge strumenti propri:

- compendio delle Persona e delle skill, con le rese italiane;
- motore di fusione: diretta, inversa, alberi ricorsivi, ricerca per skill, bonus della Stanza di Velluto;
- tracciamento della partita: scorta e compendio personale, Confidenti, Doti sociali, denaro, oggetti, più partite;
- guida giorno per giorno (il Diario), con gli effetti di ogni voce sulla partita;
- mappe interattive di Tokyo, dei Palazzi e dei Memento, negozi, attività, domande in classe, negoziazione con le Ombre.

Interfaccia, API, schema dei dati e documentazione sono in italiano.

## Stack

- **Frontend**: React 19, react-router 7, zustand 5, Tailwind 4, Vite 8. Porta di sviluppo **5273**.
- **Backend**: Express 5, better-sqlite3 12, zod 4, pino 10, eseguito con `tsx`. Porta **3101**.
- **Persistenza**: due file SQLite in `DATA_DIR` (predefinito `data/`): `gioco.db` (dati di gioco) e `partite.db` (dati delle
  partite, attaccato come schema `utente`). Modalità WAL, migrazioni versionate, copie di sicurezza a ogni avvio.
- **Qualità**: TypeScript ~5.9 (`tsc -b`), ESLint 10, Vitest 4.
- **Node**: `^22.23.4 || ^24.22.1 || ^26.12.1` (campo `engines` di `package.json`).

## Avvio in sviluppo

```bash
npm install
cp .env.example .env
bash scripts/start-all.sh     # backend (3101) e frontend (5273), con verifica di avvio
```

Al primo avvio, senza `data/gioco.db`, il backend copia il pacchetto iniziale `pacchetto/gioco.db` (senza immagini) e applica
le migrazioni. Il pacchetto completo, con le immagini, si carica dall'app: vedi [`pacchetto/README.md`](pacchetto/README.md).

Gestione dei server in `scripts/`: `start-be.sh`, `start-fe.sh`, `stop-be.sh`, `stop-fe.sh`, `restart-be.sh`, `restart-fe.sh`,
`start-all.sh`, `stop-all.sh`, `restart-all.sh`. I log vanno in `BE.log` e `FE.log`, i PID in `.pids/`.
Il backend gira in `tsx watch` e si riavvia da solo a ogni salvataggio in `server/`. Una migrazione nuova si applica subito ai
dati di `data/`, dopo la copia di avvio in `data/backups/`.

## Comandi

| Comando | Effetto |
|---|---|
| `npm run typecheck` | `tsc -b tsconfig.full.json` (app, node, server, test) |
| `npm run lint` | ESLint su tutto il repository |
| `npm run build` | build del frontend in `dist/` |
| `npm test` | Vitest (i test girano su richiesta, non a ogni modifica) |
| `npm run pacchetto` | rigenera `pacchetto/gioco.db` e il pacchetto completo |
| `npm run start:rilascio` | avvia il backend nella modalità di rilascio (sola lettura dei contenuti) |

Documentazione dell'API: `/api/docs` (Swagger UI) e `/api/openapi.json` (OpenAPI 3.1), anche da Impostazioni → «Documentazione
delle API». Il documento si costruisce dalle rotte e dagli schemi zod; le descrizioni in italiano stanno in
`server/openapi/descrizioni/`.

## Struttura

```
server/     Express: config, bootstrap, middleware, db (migrazioni di gioco e delle partite), routes, services, schemas, openapi
shared/     tipi e regole pure condivise fra frontend e backend (nessun accesso a DB o DOM)
src/        React: pages, components, stores, services/api, hooks, utils
vite/       plugin di Vite (manifest degli asset grafici predefiniti)
public/     asset grafici del compendio e dell'interfaccia, caratteri
pacchetto/  gioco.db iniziale (in git, senza immagini)
scripts/    gestione dei server, generazione del pacchetto, verifica del bundle di rilascio, strumenti
test/       aiuti condivisi dai test
licenze/    copie delle licenze citate in NOTICE
docs/       architettura, decisioni, roadmap, riferimenti di dominio, prompt grafici
data/       l'istanza locale: database e copie di sicurezza (fuori da git)
```

Documenti: [`docs/ARCHITETTURA.md`](docs/ARCHITETTURA.md) (com'è fatto il sistema), [`docs/DECISIONI.md`](docs/DECISIONI.md)
(regole di comportamento in vigore), [`docs/ROADMAP.md`](docs/ROADMAP.md) (cosa fa l'app e punti aperti),
[`docs/riferimenti/`](docs/riferimenti/) (meccaniche di gioco e fonti), [`docs/grafica/`](docs/grafica/) (prompt degli asset).

## Deploy

- Due immagini Docker: backend (`Dockerfile.backend`, Node 24 Alpine) e frontend (`Dockerfile.frontend`, nginx 1.30 Alpine).
  Le pubblica su GitHub Container Registry il workflow `docker-publish.yml` a ogni push su `main`, dopo il gate di `ci.yml`
  (typecheck, lint, audit).
- `docker-compose.yml` descrive l'istanza di preparazione: nessuna porta pubblicata, il frontend nginx sta sulla rete esterna del
  proxy (`PROXY_NETWORK`) e inoltra `/api/` al backend, che vive solo sulla rete interna. Il database nasce sul volume dati al primo
  avvio. La cartella d'appoggio per l'importazione è un volume NFS, con indirizzo e percorso dati dalle variabili dello stack.
- `docker-compose.rilascio.yml` e `docker-publish-rilascio.yml` (tag `rilascio-v*`) producono l'istanza pubblica in sola lettura dei
  contenuti: vedi `docs/ARCHITETTURA.md`, «Le due istanze».
- I valori reali (indirizzi, domini, credenziali) stanno solo nelle variabili dello stack, mai nel repository.

## Fonti dei dati

Il compendio Royal deriva dal dataset Apache-2.0 di `chinhodado/persona5_calculator`, con verifica incrociata su
`aqiu384/megaten-fusion-tool`; la guida è quella italiana di allgamestaff. Attribuzioni complete in [`NOTICE`](NOTICE), licenze
in [`licenze/`](licenze/), analisi delle fonti in [`docs/riferimenti/dataset-fonti.md`](docs/riferimenti/dataset-fonti.md).
Nessuna immagine ufficiale del gioco è nel repository.
