# Architettura — project-p5r

Com'è fatto il sistema oggi. Ogni affermazione cita un file reale; dove documento e codice dissentono, vale il codice. La storia
di come ogni parte è nata sta nella cronologia di git.

La fonte dei dati è il DB dell'istanza; «Importa» sostituisce esplicitamente il DB di gioco con un backup locale scelto dall'utente
(nessuna unione). Non esiste un seed JSON: i dati di gioco vivono in `gioco.db` e si correggono con l'app o con le migrazioni.

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
                                         data/  (volume /data in Docker)
                                         ├─ gioco.db    DATI DI GIOCO  (dal pacchetto, sostituibile)
                                         └─ partite.db  DATI UTENTE    (per partita_id, schema «utente»)
```

- **Un solo processo backend**, nessun DB esterno. Nell'istanza di preparazione c'è un solo proprietario e nessun login proprio;
  nell'istanza di rilascio l'identità arriva dal token del proxy di accesso (§7 bis).
- Il frontend parla solo con `/api` sulla stessa origine (proxy Vite in dev, nginx in produzione).

## 2. Stack e versioni
| Livello | Tecnologia |
|---|---|
| Runtime | Node `^22.23.4 \|\| ^24.22.1 \|\| ^26.12.1` (`engines`; immagini Docker e CI su Node 24), TypeScript ~5.9, ESM (`"type": "module"`) |
| Frontend | React 19, react-router 7, zustand 5, Tailwind 4 (plugin Vite, config CSS-first), Vite 8 |
| Backend | Express 5, better-sqlite3 12, zod 4, pino 10, tsx (esegue i `.ts` a runtime, anche in produzione) |
| Test | Vitest 4 (+ jsdom e Testing Library per i componenti), supertest per le route (tramite `test/supertest.ts`), DB in memoria con il pacchetto iniziale (`test/dbDiProva.ts`), moduli finti dal modulo vero (`test/mockModuli.ts`), migrazioni (`server/db/migrationRunner.test.ts`, `migrations/index.test.ts`) |
| Qualità | ESLint 10 flat config (`eslint.config.js`: nel frontend `react-hooks`, con `exhaustive-deps` esteso a `useCarica`, e `jsx-a11y` raccomandato), `tsc -b` su 4 progetti (app / node / server / test) |
| Deploy | Immagini `node:24.22.1-alpine` (backend) e `nginx:1.30-alpine` (frontend); GitHub Actions su Node 24 |

## 3. Struttura del repository
```
server/
  index.ts            boot: assicuraPacchettoIniziale → initDb (gioco.db + partite.db attaccato come «utente») → runBootBackup → runMigrations (due sequenze) → avvisaCensimentoPartite (`services/censimentoPartite.ts`, solo un avviso nel log) → regoleAllAvvio → listen; SIGINT/SIGTERM → server.close + closeDb
  bootstrap.ts        factory Express: middleware in ordine, router di area (`routes/index.ts`, `ROUTER_DI_AREA`), health/config, documentazione (`/api/openapi.json`, `/api/docs`), 404, errorHandler
  config.ts           unica lettura delle env (BE_PORT/PORT, DATA_DIR, PACCHETTO_DIR, LOG_LEVEL)
  middleware/         requestContext (requestId + logger), responseShape ({data}), validate (zod, tipizzato: il gestore riceve `req.body`, `req.params` e `req.query` col tipo dell'uscita degli schemi; `corpoDelServizio<T>()` per i corpi che il servizio completa da sé; gli schemi restano leggibili con `schemiDiValidazione`), errorHandler
  openapi/            documentazione dell'API: rotte.ts (rotte lette dalla pila dei router), documento.ts (OpenAPI 3.1 dagli schemi zod), descrizioni/ (registro in italiano, un file per area), pagina.ts (Swagger UI da `swagger-ui-dist`), openapi.test.ts (copertura e validità)
  db/                 dbService (gioco.db + ATTACH partite.db, pragma, cache statement, copiaSchema), migrationRunner (user_version per file), backupService (copie di avvio di entrambi i file: al più 7 e 2 GiB), schemaMemo.ts (presenza di tabelle e colonne ricordata per `schema_version`), schemaUtente.ts (DDL di base delle tabelle delle partite; le successive vengono dalle migrazioni utente), colonne.ts (haTabella/haColonna/aggiungiColonna per le migrazioni), fontiTolte.ts (registro delle strutture eliminate, §5 ter), acquistiLegacy.ts e conversioneEffettiAzione.ts (conversioni dei dati di prima), dati/
  db/migrations/      dati di gioco: 001 … 371 (registro in index.ts, append-only; `index.test.ts` pretende id consecutivi); i manifesti e i dati congelati delle migrazioni stanno accanto ai file (`*Manifest.ts`, `*.json`, `dati/`)
  db/migrazioniUtente/ partite: 001 … 069 (registro in index.ts, sequenza separata, `PRAGMA utente.user_version`; la 015 cita `main.voce_giornata.produce_json`, tolta dalla 357 solo a 015 passata: altrimenti la toglie la 069, e il runner la rimette vuota per la 015 se un file delle partite nuovo sta accanto a un gioco che non l'ha più)
  routes/             20 montaggi in `routes/index.ts` (`ROUTER_DI_AREA`): compendio, disponibilitaStrutturata e confidentiScritture (stesso prefisso del compendio), traduzioni, partite, immagini, fusione, mappe, font, impostazioni, catalogo, catalogoOggetti, condizioni, aree, luoghi, ricerca, regolePesca (`/api/pesca`), pesca (`/api/partite/:id/pesca`), correzioni, appuntiFissi (`/api/appunti-fissi`, solo preparazione)
  services/           un servizio per dominio (`*Service.ts`) e sei cartelle: `condizioni/` (valutatore unico), `fusione/` (motore), `mappe/` (gerarchia, case, immagini, pin), `pacchetto/` (primo avvio, `regoleAllAvvio`), `ricerca/` (indice e stato), `ripristino/` (registro dei blocchi correggibili)
  services/verificaPartita.ts  il 404 «partita-non-trovata» comune a tutti i servizi per partita
  schemas/            zod condivisi dalle rotte (`validate({ params, query, body })`), uno per area
  utils/              logger, httpError, nodeRuntime
shared/               tipi e regole pure condivise FE/BE (nessun import Node): `types.ts` (DTO), `condizioniSpillo.ts` (vocabolario delle condizioni), `elementi.ts` (vocabolario degli elementi), `doti.ts`, `giorno.ts`, `date.ts`, `ricerca.ts`, `immaginiMappa.ts`, `miniature.ts`, `pesca.ts`, `ombre.ts`, `negoziazione.ts`, `effettiVoce.ts`, `propostePartita.ts`, `confidentiScritture.ts`…
src/
  main.tsx            boot bloccante su GET /api/config → schermata d'errore HTML se il BE non risponde
  router.tsx          react-router (createBrowserRouter): tabella delle pagine in §5 ter
  tailwind.css        tema P5R: token colore (bg/surface/primary rosso #e5352b, colori elemento), classi .btn/.touch/.tabella/.card/.chip
  components/         catalogo, compendio, confidenti, fusione, guida, impostazioni, layout (MainLayout, Topbar, Sidebar ≥lg, BottomNav <lg), mappe, negozi, partita, pesca, ricerca, scheda, shared
  pages/              una per rotta (elenco in §5 ter)
  stores/             configStore, notificationStore, glossarioStore, partitaStore (partite + attiva), preferenzeStore, assetStore (manifest unico: /asset/manifest.json + /api/immagini/manifest), fontStore, meteoStore, ricercaStore, suggerimentiStore, versioneStore
  services/api/       client HTTP (`_httpClient`, `_helpers`) e una funzione per rotta, raccolte nel barrel `index.ts`
  hooks/, utils/      useCarica, useDocumentTitle, useImmagineMappa, useNomeDelPosto, useScorciatoiaRicerca…; funzioni pure di presentazione
vite/                 assetPredefiniti.ts — plugin: manifest degli asset in public/asset/ (dinamico in dev, emesso in build)
public/asset/         asset grafici del compendio (persona, arcani) e dell'interfaccia (ui): tutto il resto della grafica vive nel database (079)
pacchetto/            gioco.db iniziale (in git, senza immagini: copiato in DATA_DIR al primo avvio, usato dai test) e completo/gioco.db
                      (stesso file con le immagini dentro, ~311 MB, FUORI da git: si importa dall'app e sostituisce l'istanza); README.md
                      (`--da-istanza` per farne il dato predefinito dell'app dall'istanza locale); gestione server in scripts/*.sh
docs/                 documentazione di bordo e riferimenti di dominio
```

## 4. Flusso di una richiesta API
1. `requestContextMiddleware`: genera/propaga `X-Request-Id`, crea child logger, access log a fine risposta.
2. `responseShapeMiddleware`: monkey-patch di `res.json` → `{ data }` per **ogni** corpo, anche un DTO con un campo `data` o
   `error` (es. `DomandaDto.data`); solo l'`errorHandler`, con `segnaRispostaFormata`, scrive il corpo senza busta. Il client
   (`payloadDellaBusta`) legge la chiave `data`, non il suo valore: `{ data: null }` vale `null`. Gli avanzamenti di fascia o di
   giorno avvenuti durante la richiesta (registrati nel contesto, `partiteConAvanzamentoRichiesta`) viaggiano nel corpo per
   `/api/partite/:id` con un corpo oggetto (l'esito completo, con la partita); per le altre rotte e i corpi che non sono oggetti
   nell'intestazione `X-Avanzamento-Partita`, ridotti (`AvanzamentoInIntestazioneDto`: id della partita, giorno e fascia, decisioni
   aperte, senza la partita, così l'intestazione resta piccola). Il client la legge in `_helpers.ts` e la passa al gestore registrato in
   `main.tsx` (`impostaGestoreAvanzamento` → `seAvanzamentoInIntestazione`), che rilegge l'elenco delle partite e avvisa.
3. `express.json({ limit: '5mb' })` (512 MB solo per `POST /api/mappe/importa`; nel rilascio 256 kB per tutto, `LIMITE_CORPO_RILASCIO`). **Niente CORS** (DECISIONI 2026-10-03): il
   frontend è sulla stessa origine (proxy Vite in sviluppo, nginx in produzione) e l'API non ha autenticazione, quindi un'altra
   origine non deve poterla chiamare dal browser dell'utente.
4. Router di area (`ROUTER_DI_AREA` in `server/routes/index.ts`, 20 montaggi: elenco in §3) con `validate({ params, query, body })` zod
   prima dell'handler (Express 5: `req.query` è un getter, quindi il middleware fa shadowing sull'istanza). Il middleware porta i tipi
   dell'uscita degli schemi (`GestoreValidato`), che Express passa al gestore della stessa rotta: nelle rotte non c'è nessun
   `req.body as`, `req.query as` o `req.params as`. Dove lo schema verifica solo la forma esterna e il servizio completa la verifica
   (effetti delle voci, `produce`, appunti incollati, pacchetto delle mappe, campi del pin, piano salvato) la rotta dichiara il tipo del
   servizio con `corpoDelServizio<T>()(schema)`: stesso schema, stessa validazione e stessa documentazione; il compilatore rifiuta un
   `T` che non sta dentro l'uscita dello schema (tolta la parte aperta degli oggetti `passthrough`). Nelle rotte non c'è SQL: le letture
   e le scritture stanno nei servizi (`condizioniService` per `/api/condizioni`).
5. `/api/health` (stato DB + `user_version`; **503** se il DB non risponde, perché l'HEALTHCHECK di Docker guarda solo il codice),
   `/api/config` (valori pubblici per il boot FE), `/api/openapi.json` e `/api/docs` (documentazione, §5 bis).
6. 404 JSON per `/api/*` sconosciute; `errorHandler` ultimo: `HttpError` → status+codice; errori 4xx di Express/body-parser (JSON malformato 400, corpo oltre il limite 413, percorso non decodificabile 400) e di `sendFile`/`download` (404 `not-found`, 403, 416) → envelope in italiano, con le intestazioni di una risposta JSON anche se la rotta stava per mandare un file; altro → 500 `internal-error` con un **messaggio fisso** (il dettaglio resta nel log, col `requestId`).
7. Client (`src/services/api/_httpClient.ts`): timeout e tentativi sui 5xx e sugli errori di rete **solo per le letture** (GET,
   HEAD, OPTIONS); ogni scrittura (POST, PATCH, PUT, DELETE) parte con 0 tentativi in più, salvo `maxRetries` esplicito dove il
   servizio è provato idempotente: una PUT può aggiungere una riga al registro (`PUT /acquisti`), una DELETE ripetuta risponde 404 su
   un'azione riuscita, una PUT in ritardo sovrascrive un valore più nuovo. I guasti di rete diventano `ErroreRete` (offline, rete,
   tempo scaduto) con un messaggio in italiano; le risposte senza busta d'errore diventano `http-error` con un messaggio in italiano e
   il dettaglio tecnico in `details.dettaglioTecnico`; una risposta 200 che non è JSON diventa `risposta-non-valida`.

## 5. Persistenza
- **Due file, una connessione**: `DATA_DIR/gioco.db` è `main` (compendio, guida, catalogo, mappe, immagini) e `DATA_DIR/partite.db` è attaccato come schema `utente` (le tabelle delle partite: DDL di base in `server/db/schemaUtente.ts`, le successive nelle migrazioni utente). Le query restano senza prefisso (SQLite risolve il nome cercando in `main` e poi in `utente`); solo migrazioni e backup nominano lo schema. I vincoli fra i due file non sono applicati da SQLite: i riferimenti utente→gioco usano chiavi stabili (`spillo.uid`, migrazione 067: impronta SHA-256 dell'identità dello spillo — mappa, tipo, nome, posizione, riferimento — così un'istanza migrata in proprio e il pacchetto danno lo stesso uid allo stesso spillo; `spillo_partita.spillo_uid`). Chi elimina uno spillo pulisce anche i suoi «raccolto». Al primo avvio senza `gioco.db` il file arriva dal pacchetto (`pacchetto/gioco.db`). Di norma girano prima le migrazioni di gioco e poi quelle delle partite; con un `partite.db` nuovo (mai migrato e senza tabelle) accanto a un file di gioco dalla 066 in poi l'ordine si inverte, perché alcune migrazioni di gioco leggono le tabelle delle partite (`migrationRunner.ts`, `fileDellePartiteNuovo`).
- Connessione better-sqlite3, pragma `journal_mode=WAL` (su entrambi i file), `synchronous=NORMAL`, `busy_timeout=5000`, `foreign_keys=ON`,
  `journal_size_limit` a 64 MiB (in rilascio solo su `utente`). `ottimizzaDb` (`PRAGMA optimize` e checkpoint PASSIVE) gira un minuto
  dopo l'avvio e poi ogni 6 ore, non in rilascio; l'optimize alla chiusura resta.
- Migrazioni versionate su `PRAGMA main.user_version` e `PRAGMA utente.user_version` (due sequenze append-only, `server/db/migrations/index.test.ts` pretende id consecutivi), ogni migrazione in una transazione, con `foreign_key_check` **dentro** la transazione prima di avanzare `user_version`. Il controllo si fa prima e dopo `up`: solo le violazioni **nuove**, introdotte da quella migrazione, la annullano (resta da applicare); quelle già presenti nel file si scrivono nel log come avviso e non bloccano l'avvio, che altrimenti si fermerebbe per sempre su un dato vecchio che nessuna migrazione tocca.
- `prepared(sql)` tiene in cache uno statement per testo SQL, condiviso da tutto il server: chi lo prende lo rimette ogni volta in modalità normale (`pluck(false)`, `raw(false)`, `expand(false)` sugli statement di lettura), perché un `.pluck()` fatto da un chiamante cambiava lo statement anche per tutti gli altri.
- Backup online (`copiaSchema`) di entrambi i file prima delle migrazioni a ogni boot in `data/backups/`, con rotazione a 7 coppie e a
  `TETTO_BYTE_COPIE` = 2 GiB fra gioco, partite e giornali (`backupService.ts`): le 2 copie più recenti con il file di gioco non vuoto
  restano sempre; fra le altre, la prima che sfora toglie anche le più vecchie (una serie continua, salvo una copia vuota o fuori tetto
  che precede una protetta). La copia dell'istanza (Impostazioni)
  porta `database/gioco.db` e `database/partite.db`.
- Due famiglie di dati (371 migrazioni di gioco e 69 delle partite):
  - **dati di gioco** in `main` (`arcana`, `persona` + `persona_affinita` + `persona_skill`, `skill`, `oggetto`, tabelle di fusione, `confidente` + `confidente_rango`, `dote_sociale` + `dote_sociale_rango`, `traduzione` con `fonte` `seed` o `utente`, e tutto il mondo e la guida di §5 ter). Le immagini stanno nella tabella `immagine` di `gioco.db` (079);
  - **dati utente** in `utente` (`partita` con indice parziale «una sola attiva» e le impostazioni dei contenuti, `dlc_posseduti_json` — i set di `dlc_set` posseduti, letti dalla Fusione e dalla condizione `dlc-posseduto` — e `salvataggio_p5` (utente 061), scritte dalla finestra «Modifica» della partita, `RiepilogoPartita`, con `PUT /partite/:id`, `compendio_partita`, `persona_posseduta` + `persona_posseduta_skill`, `confidente_partita`, `dote_sociale_partita` e le tabelle delle migrazioni utente: inviti, acquisti e proposte, pesca, Fortuna, piazzamento agli esami, punti cronologici…), sempre con `partita_id` e ON DELETE CASCADE.
- Statistiche per livello: `shared/statistiche.ts` — +3 punti per livello ripartiti in proporzione alle statistiche base; il BE espone per ogni Persona posseduta `statistiche` (registrate dall'utente oppure stimate al livello) e `statisticheBaseLivello`.
- Testi canonici (nomi Persona/skill, chiavi arcana/elementi, effetti, descrizioni) restano in inglese Royal nelle tabelle di gioco; la resa italiana si legge da `traduzione(ambito, chiave)`; i DTO espongono `nomeIt` per skill e Persona (fallback al canonico) e per l'equipaggiamento (`null` se la guida non lo nomina); la ricerca del compendio confronta nome canonico e nome italiano con la ricerca comune dell'app (`shared/testo.ts`, qui sotto).
- **Ricerca per parole, una sola** (`shared/testo.ts`): `filtroRicerca(q)` divide il testo cercato in parole agli spazi e vale per una voce se ogni parola compare, anche come pezzo di parola, in almeno uno dei suoi testi, in qualunque ordine; ogni parola si confronta «piatta» (minuscola, senza accenti, punteggiatura compresa) o senza punteggiatura (`normalizzaTesto`). La usano tutte le ricerche dentro le pagine e i selettori del frontend (`Selettore`, `SceltaQuale`, elenchi del compendio, della Partita, della guida, dei negozi, del visore delle mappe, degli appunti fissi; via `utils/testo.ts`) e i filtri `q` del server (compendio, catalogo degli oggetti, articoli dei negozi, Ombre, negoziazione, traduzioni, riferimenti delle mappe), che filtrano le righe dopo la lettura invece di un `LIKE` sulla frase. La ricerca del Diario (`shared/ricercaDiario.ts`) tiene le parole per evidenziarle nell'estratto e le confronta con `corrispondonoParole`, la stessa regola; la ricerca globale (`ricercaService`) ha il suo indice per parole senza punteggiatura (`normalizzaTesto`).

## 5 bis. API

**Documentazione consultabile.** `GET /api/docs` apre Swagger UI e `GET /api/openapi.json` restituisce il documento OpenAPI 3.1
(anche da Impostazioni → «Documentazione delle API»). Il documento non è scritto a mano:
- le rotte si leggono dalla pila dei router montati (`server/openapi/rotte.ts`);
- parametri, query e corpi vengono dagli schemi zod di `validate` (`schemiDiValidazione`), convertiti con `z.toJSONSchema` nella forma d'ingresso;
- lo stato di successo (200/201/204) e il tipo di risposta (JSON o file) si leggono dal gestore finale;
- sommario, descrizione, risposta (con il tipo `…Dto` di `shared/`) e codici d'errore stanno nel registro in italiano `server/openapi/descrizioni/` (un file per area). Per i corpi che non passano da `validate` il registro dichiara le varianti (catalogo, schema scelto da `:tipo`) o il corpo binario (`express.raw`).

`openapi.test.ts` fallisce se una rotta non ha descrizione o una descrizione non ha rotta, se un tipo `…Dto` citato non esiste, se il registro dice JSON dove il gestore manda un file (o il contrario), se un codice d'errore dichiarato non compare nel server (fuori da `server/openapi/`), e se il documento non è un OpenAPI 3.1 valido. Swagger UI è servita dall'istanza (`swagger-ui-dist`, nessuna CDN).

«Prova» (Try it out) parla con i dati veri, quindi è spento per ogni metodo che scrive (`supportedSubmitMethods: ['get']`) e per le GET con `senzaProva` nel registro: lo scaricamento del database e lo ZIP dell'istanza (lasciano una copia nella cartella d'appoggio) e l'esportazione delle mappe (oltre 10 MB). Il documento le marca con `x-senza-prova`.

L'elenco completo delle rotte è quello di `/api/docs`. Le aree (tag) sono quelle di `AREE` in `server/openapi/descrizioni/index.ts`: compendio e guida, traduzioni, partite, immagini, fusione, mappe, caratteri, impostazioni e istanza, catalogo, catalogo degli oggetti, condizioni, Aree del mondo, luoghi, ricerca, regole della pesca, pesca della partita, correzioni alla guida e sistema. Gli indirizzi **del frontend** che reindirizzano non sono rotte API e non compaiono nel documento: sono nella sezione «Indirizzi vecchi e redirect» di §5 ter. Ogni risposta porta le chiavi canoniche più i campi `*Nome` in italiano risolti da `traduzioniService`.

## 5 ter. Il modello dei dati

Ogni riga cita il file che la prova. Dove una tabella è «tolta», il dato vive nella struttura indicata in «Strutture tolte» (sotto).

### Entità e fonti uniche
| Entità | Fonte unica | Chi la legge e la scrive |
|---|---|---|
| Quartiere | `quartiere` (migrazione 015); ingresso in `quartiere_ingresso` (039) | `cittaService.ts`; pagine `CittaPage`, `QuartierePage` |
| Area del mondo | `area` (109): contenitore `quartiere_chiave`, `dungeon_chiave` o `citta_chiave`; planimetria predefinita e `da_verificare`; dalla 303 la condizione propria `condizioni_json` (in AND con il quartiere, ereditata dai luoghi dell'Area: il Covo dei Ladri dal 5 maggio; `condizioneEffettivaArea`, `PUT /api/aree/…/sblocco`) | `mappe/areeService.ts`, rotte `/api/aree` (`routes/aree.ts`); la casa in `mappe/casaMappa.ts` |
| Planimetria | riga di `mappa` (027) con `area_chiave`, `versione_etichetta`, `versione_ordine` (109); immagine nell'ambito `mappa` di `immagine` | `mappeService.ts`, `areeService.ts`; il ruolo dell'immagine si deduce dal posto (§ risolutore d'immagine) |
| Pin | `spillo` (027), con `uid` = impronta dell'identità (067, `mappe/identitaSpillo.ts`); un pin di città punta a un `negozio` (il punto vendita, per le macchine), a un `luogo` o a un Confidente: il riferimento `attivita` non si offre né si scrive più (344 porta a `luogo` i due che lo avevano), e un pacchetto vecchio che lo porta si importa come `luogo` | `mappeService.ts`; legami alle voci in `spillo_voce` (098) |
| Palazzo | `dungeon` (013), con il livello consigliato minimo e massimo `livello_min`/`livello_max` (335, null = la fonte non lo dice; il confronto delle fonti è la nota storica del Palazzo, `DungeonDettaglioDto.noteLivello`, visibile solo nella preparazione); le infiltrazioni in `dungeon_area`; le Aree del Palazzo sono righe di `area` con `dungeon_chiave` (110); legame infiltrazione↔Area in `infiltrazione_area` (110) | `palazziService.ts`, `mappe/legamiInfiltrazioni.ts`; pagina `DungeonDettaglioPage`; la voce del boss finale `dungeon.voce_boss_finale` (112) si sceglie da «Modifica ⋯ › Boss finale» (`PUT /api/compendio/dungeon/:chiave`, «Ripristina» `POST …/ripristina`), e senza voce la scheda di preparazione mostra il segno «Boss finale da dichiarare» (`bossFinaleDaDichiarare`) che apre lo stesso modulo |
| Memento e dedalo | `area_dedalo` (099); Iweleth esiste come dedalo: `dedalo_confluenza` e `infiltrazione_dedalo` (175); condizione d'apertura del Dedalo `dungeon_area.condizioni_json` (305: Palazzo concluso o data della guida) | `dungeonService.ts`; aperture dei Dedali calcolate in `condizioni/valutatore.ts` (`esitoAperturaDedalo`, letta da `condizioneEffettiva.condizioneAperturaDedalo`), mai dichiarate nelle visite; ramo dell'albero in `mappe/gerarchiaMappe.ts` |
| Luogo | `luogo` (015): `area_chiave`, `orari_json`, `solo_eventi_confidente` (115); gli orari scritti come frase sono tolti (184, 193) | `luoghiService.ts` (`presenzaDelLuogo` è la sola regola di presenza), `luoghiScritture.ts`; pagina `LuogoPage` |
| Negozio e offerta | `negozio` e `articolo` (017); il «dove» di un negozio e di un'attività è solo `sede_chiave` (072): il quartiere si ricava dal luogo della sede (`luogo.quartiere_chiave`; `NegozioRiassuntoDto.quartiereChiave`, `AttivitaDto.quartiereChiave`), senza colonna propria; senza sede nessun quartiere (oggi solo il negozio del Palazzo di Niijima). Condizioni del negozio in `negozio.sblocco_json`, quelle dell'offerta in `articolo.condizioni_json`; effetto e statistiche dell'offerta vengono dall'oggetto del catalogo (346). Una macchina documentata è un punto vendita: una riga `negozio` di tipo `distributore` con le sue righe `articolo` e la sua scorta, in un luogo che può averne più d'una (347-351); il pin indica la macchina se si sa quale, altrimenti resta sul luogo. Gli invarianti del modello valgono per le scritture nuove (`shared/puntoVendita.ts`) | `negoziService.ts`, `services/invariantiPuntoVendita.ts` |
| Oggetto | `catalogo_oggetto` (121), unica identità; nota storica in `nota_storica` + `nota_storica_legame` (139; dalla 335 il legame può essere anche un Palazzo, tipo `dungeon`) | `catalogoOggettiService.ts`, `catalogoOggettiScritture.ts`, `noteStoricheService.ts`; rotte `/api/catalogo-oggetti` |
| Confidente | `confidente` + `confidente_rango` (con `modo` e `fonte`, 161); requisiti in `confidente_requisito` (`testo` è la sola nota dal 359, la frase si genera dalla condizione; copia della guida in `confidente_requisito_guida`, 119; salvataggio di più ranghi in una transazione con `PUT /compendio/confidenti/:chiave/requisiti`); disponibilità strutturata in `confidente_disponibilita` (163; dal 358 senza prosa né `dal`, la data di avvio è il requisito di rango 1; eccezione `solo-date-rango` dalla 361); inviti in `confidente_invito` (118); dalla 324-325 `confidente.romanzabile` (scelta romantica nel dialogo del rango 9) e l'eccezione di disponibilità `con-relazione` (le fasce con la relazione romantica, al posto delle generali e di quelle del rango: Takemi solo di sera); la relazione della partita in `utente.confidente_partita.relazione_romantica` (utente 059), letta e scritta solo da `relazioneRomanticaService.ts` (scheda, semafori, Diario con la mappa dei Confidenti della partita; vale per gli incontri dopo il rango 9, `relazioneAlRango`), segnata dalla scheda (`PUT /partite/:id/confidenti/:chiave` `relazioneRomantica`) o dalla scelta alla spunta del passaggio al rango 9 (`relazioneRomantica` del corpo di `PUT /partite/:id/percorso`, ricevuta `relazione: {confidente, nome, prima, dopo}`, annullo solo se vale ancora `dopo`) | `compendioService.ts`, `requisitiConfidentiService.ts`, `disponibilitaStrutturataService.ts`, `confidentiScritture.ts`, `relazioneRomanticaService.ts` |
| Giorno | `giorno` (168): meteo in due fasce, tempo libero, settimana, trama, fase, vincoli, avvisi (`avvisi_json`, modificabili dall'editor del giorno come i vincoli, L8-02; la fotografia di «Ripristina» li conserva, e una fotografia di prima li riceve al primo cambio degli avvisi); il giorno della settimana si calcola dalla data | `giorniService.ts`, `calendarioService.ts`, `giornoPartitaService.ts`; `shared/giorno.ts`, `shared/date.ts` |
| Evento del calendario | `evento_calendario` (012) collegato per chiave alle voci del Diario in `evento_calendario_voce` (164) | `calendarioService.ts` (`eventiDellaVoce`) |
| Voce del Diario | `voce_giornata` (092): `uid`, `data`, `fascia`, `ordine`, `genere`, azione; dalla 320 `condizioni_json` («Si fa solo se», NULL = sempre: valutata allo stato della partita al giorno della voce da `voceDovuta.ts`; falsa → «Non dovuta», 409 `voce-non-dovuta` alla spunta, vale come fatta per l'avanzamento) | `giornataService.ts` (scrittura), `percorsoService.ts` (lettura), `motoreDiario.ts` (effetti) |
| Persona (anche del gruppo) | `persona` (con `del_party`, `personaggio`, `forma`, `chiave_forma`: 169, 170); la cattura è una regola sola con tre stati (`catturePersona.sqlStatoCattura` → `PersonaRiassuntoDto.statoCattura`: `esclusa` se speciale, rara, DLC o del gruppo; `provata` con un'Ombra catturabile o `aree_mementos_json` non vuoto; altrimenti `da-verificare`), e «catturabile» = non `esclusa` (`sqlPersonaCatturabile`), letta da `PersonaRiassuntoDto.catturabile` (filtro del Compendio) e da `PersonaFusione.catturabile` (foglie «da catturare» di alberi e cicli); «dove si incontra» è un servizio solo, `ombreService.doveSiIncontraPersona` (`GET /api/compendio/persona/:id/dove-si-incontra` → `DoveSiIncontraDto`: le Ombre della guida e i dedali di `aree_mementos_json`/`piani_mementos` che le Ombre non dicono, o che hanno un dettaglio fra parentesi sul piano), letto da `DoveSiIncontra`; la scheda Persona non ha più la riga «Mementos» a parte | `compendioService.ts`, `personeDelGruppo.ts` |
| Ombra | `ombra`, `ombra_luogo`, `ombra_voce` (166) | `ombreService.ts`, `negoziazioneService.ts`; `shared/ombre.ts`, `shared/negoziazione.ts` |
| Esame e domanda | `esame`, `esame_premi`, `domanda` (011); il piazzamento della partita in `utente.esame_piazzamento_partita` (utente 040) | `domandeService.ts`, `piazzamentoEsamiService.ts` |
| Regola di pesca | `regola_pesca` (138); le visite della partita in `utente.pesca_*` (utente 029) | `regolePescaService.ts`, `pescaService.ts`, `profiliPescaService.ts`; nel frontend `RegistroPesca.tsx`, il foglio in tre passi `RegistraVisitaPesca.tsx` con le regole pure `visitaPesca.ts` (L10-09), usato anche da «Da applicare» (`DaApplicare.tsx`) per la pesca di una voce del Diario con la prop `voce` (giorno e fascia della voce, la richiesta firmata passata alla decisione `applica-effetto`), mentre `PreparazioneSessionePesca.tsx` tiene solo `RiepilogoSessionePreparata`, il riepilogo della finestra «Confermi?»; l'elenco dei pesci (`SPECIE_PESCA`) e le osservazioni incompatibili (`incoerenzeOsservazionePesca`) in `shared/pesca.ts` |
| Correzione ai blocchi della guida | `correzione_dati_guida` (178); le righe correggibili tengono `origine`, `seed_json`, `updated_at` | `ripristinoService.ts` con il registro in `ripristino/registro.ts` e `ripristino/righe.ts`; rotte `/api/correzioni` |

Regola trasversale: un dato ha **un** punto di modifica, letto da tutte le viste (nessuna copia a frase); le condizioni di
disponibilità e visibilità sono sempre il vocabolario unico (sotto). Il dato di gioco vale per tutte le partite; quello di una
partita sta in `utente` con `partita_id`.

### Gerarchia del mondo e «casa»
- Tre alberi, costruiti in una lettura sola da `mappe/gerarchiaMappe.ts` (`GET /api/mappe/gerarchia`): **Città › Quartiere › Area › Planimetrie**, **Città › Palazzo › Area › Planimetrie** (con le infiltrazioni accanto, `infiltrazione_area`) e **Memento › Dedalo › Area** (le aree del dedalo non hanno planimetrie). Iweleth sta una volta sola, come dedalo; le Aree e le planimetrie del suo vecchio Palazzo sono l'«Archivio del Palazzo» dentro il dedalo.
- Ogni nodo porta la sua **casa**, l'indirizzo dell'unica pagina che lo mostra, calcolata dal server (`mappe/casaMappa.ts`: `casaDellaMappa`, `casaDellArea`, `casaDelPalazzo`, `casaDelDedalo`, `casaDeiMemento`) e trasportata nei DTO: il client non la ricostruisce. Le mappe dei Memento senza Area (l'entrata `citta-mementos` e ogni figlia della radice `dungeon-mementos` senza Area: la regola è strutturale, mai il nome) sono foglie del nodo Memento, con il visore come casa: oggi resta solo l'entrata (gli otto fogli delle «aree fisse» dei Memento sono stati tolti dalla migrazione 322 e stanno nel Cestino). L'atterraggio dalla mappa di Tokyo (`atterraggioDelPalazzo`) segue la regola del Diario per tipo (`destinazioneDellaVoce`): un Palazzo la sua destinazione unica, i Memento solo una regola d'atterraggio o uno spillo d'ingresso veri, altrimenti nessuno e si apre la scheda dei Memento.
- L'indice `/guida/mappe` mostra quell'albero (`IndiceLuoghi` → `AlberoGerarchia`); `GET /api/aree/da-collocare` elenca le planimetrie senza posto, che si assegnano con `PUT /api/aree/colloca`.
- Con la partita i nodi `palazzo` e `dedalo` portano `avanzamento` `{ segnati, totale }` (L10-03), che non si ricalcola nella
  gerarchia: lo dà `dungeonService.avanzamentoDeiLuoghi`, con `elencaDungeon` per i Palazzi (`gestiti` su `punti`, i numeri dell'indice dei
  Palazzi) e `dedaloDto` per i dedali (`obiettivi`: timbri, Richieste e Trama, i numeri della pagina del dedalo). Le carte e la testata del
  livello lo mostrano con `AvanzamentoNodo` (barra e «N su M punti segnati», con «· completato» solo quando N = M); senza partita, o con M = 0, non c'è. La percentuale di un dedalo, dei Memento
  e dei Palazzi nelle loro pagine viene da una regola sola, `shared/avanzamento.ts` (`percentualeSegnati`, per difetto; nel client
  `utils/dedali.percentualeDedalo`).

### Mappe: spilli, visore ed editor
- **Registro dei tipi di spillo** (`shared/spilli.ts`, condiviso da server e frontend): 41 tipi (`TIPI_SPILLO`) in quattro categorie
  (`CATEGORIE_SPILLO`: spostamento, città, consumabile, informativo), che sono anche i gruppi della tavolozza dell'editor. La categoria
  decide cosa chiede uno spillo oltre a nome, tipo e descrizione: lo spostamento porta a un'altra mappa (e, se indicato, a uno spillo
  di quella mappa); il tipo di città mostra cosa offre adesso; il consumabile si segna (raccolto, aperto, sconfitto, parlato…) per
  partita; l'informativo è solo un segno. I tipi della città seguono le etichette della mappa del gioco («Bevande», «Sigarette»,
  «Cercalavoro»…). L'icona è l'asset `ui/spillo-<tipo>` con riserva SVG in codice (`IconaSpillo`); i colori sono quelli del registro.
- **Posizioni** in percentuale dell'immagine, valide a ogni zoom e schermo; cambiare l'immagine di base mantiene gli spilli.
- **Pannello del visore e dell'editor**: l'`aside` è l'unica area che scorre (l'elenco dei pin e la merce nel foglio non hanno un
  proprio scorrimento). Nell'editor il piè del modulo del pin («Salva spillo», «Elimina») resta fisso in fondo al pannello a ogni formato, anche scorrendo; «Copia» sta nel corpo del modulo e, scelto un pin, il pannello si porta sulla sua scheda.
- **Visore** (`VisoreMappa`): zoom da «adatta» (calcolato dall'area visibile) fino a 8 volte, con rotellina, pulsanti, pinch (anche
  con un dito su uno spillo; finito il pinch il dito rimasto sposta) e doppio clic sulla tela per tornare ad «adatta» (su spilli e
  gruppi il doppio tocco non tocca la vista); durante trascinamento e pinch la vista si muove senza ridisegnare la mappa, e lo stato
  si aggiorna a fine gesto; spilli a dimensione costante, raggruppati quando si sovrappongono, legenda con filtri per tipo e ricerca.
  Sotto i 768 px il visore incorporato in una pagina, a vista «adatta», lascia scorrere la pagina al dito. Un tocco apre il popup
  ancorato allo spillo, che diventa un foglio dal basso quando non c'è spazio (sempre sotto i 768 px); da 768 px il foglio sta nella
  colonna del visore; lo spillo toccato si centra nella fascia libera sopra il foglio; con la Guida aperta come foglio il riquadro le
  si impila sopra.
  Attraversando un pin di spostamento il visore annota il passaggio (`src/utils/passaggioMappe.ts`: mappa, nome e pin di partenza); il
  visore che mostra la mappa d'arrivo lo consuma e mette nella barra il ritorno col nome della mappa di partenza (più il nome del pin se
  le due mappe si chiamano allo stesso modo), che riporta a quel pin con la navigazione del suo ospite (pagina della mappa, scheda del
  Palazzo, pagina dell'Area). Entrando da un'altra strada, o dopo un ricaricamento, il ritorno non c'è.
  I raccolti sono nascosti salvo «Mostra anche i raccolti». Le condizioni di visibilità sono assolute: con una partita attiva uno
  spillo con una condizione falsa sparisce (salvo «Mostra anche i non ancora disponibili»). In uso normale nessun tocco sulla mappa
  modifica dati.
- **Guida del visore** (`GuidaNelVisore`, pulsante «Guida» della barra): l'unica guida di ogni visore, a schermo intero (`MappaPage`) e
  incorporato (`MappaIncorporata`), su ogni mappa che può avere voci della guida (una planimetria di un Palazzo, o una mappa con un pin
  collegato a una voce). Legge `GET /api/mappe/:chiave/guida` (le voci della planimetria per infiltrazione, con lo stato della partita) e
  segna con `PUT /api/partite/:id/punti` come la scheda del Palazzo: casella ottenuto/riapri, dettagli e pin centrabili nella voce
  aperta, voci fatte nascoste salvo «Anche le fatte», le Persona da catturare come piastrelle; finestra spostabile da 1024 px, foglio dal
  basso sotto (telefono e tablet); lo spillo scelto dalla Guida si centra sopra il foglio e il suo riquadro si apre al tocco. Con la scheda del Palazzo (`GuidaDellArea`, `DungeonDettaglioPage`) condivide:
  - il salvataggio dello stato con le notifiche delle altre voci toccate (`salvaStatoVoce`) e la cattura nel compendio
    (`catturaNelCompendio`), in `services/gestiGuida.ts` (la cattura anche con `useCatturaPersona`);
  - la conferma di «Riapri» (`useConfermaRiapertura`, `components/guida/ConfermaRiapertura.tsx`);
  - le regole pure: descrittiva (`voceDescrittiva`), conteggio delle segnate (`quanteSegnate`) e voce segnata in vista (`segnataInVista`)
    di `utils/vociDellaGuida.ts` (il conteggio delle da segnare, `quanteDaSegnare`, lo usa solo il visore), passi sotto
    il loro Enigma (`raggruppaPassi`, `utils/passiEnigmi.ts`), voce da catturare e catturate del compendio (`voceDaCatturare`,
    `personeRegistrate`, `utils/piastrelleCattura.ts`);
  - i componenti `PersoneDelPalazzo` (le piastrelle di cattura) e `DettagliPunto`.

  Con le modali condivide lo spostamento (`useSpostamentoFinestra`). Si rilegge in silenzio quando cambiano gli stati dei pin della mappa
  o la `versione` della pagina ospite (`MappaIncorporata`: la scheda la cambia anche a ogni cattura con le piastrelle). La vecchia lista
  dei contenuti della guida non c'è più, né componente né rotta. Una sezione chiesta alla radice di un Palazzo o dei Memento (`?area=`) si apre nella sua scheda, che
  mostra dedali, descrizioni e voci (la radice dei Memento non ha collegamenti, schede dei pin né fogli dei dedali).
- **Editor** (`EditorMappaPage`, `/guida/mappe/:chiave/modifica`): aggiungi, sposta, copia e incolla spilli (appunti di sessione in
  `sessionStorage`, mai quelli di sistema), condizioni di visibilità dal vocabolario unico (anche lo stato di un altro pin e di una
  voce della guida, con il rifiuto dei giri), passaggi fra mappe (`POST /api/mappe/:chiave/passaggi` crea lo spillo nel punto libero
  più vicino al centro), pezzi delle planimetrie e loro copie (`/api/mappe/:chiave/pezzi`). I collegamenti fra mappe sono un grafo:
  l'albero dice chi contiene chi, i passaggi dicono come ci si sposta.
- **Esportazione e importazione** (`GET /api/mappe/esporta?radice=`, `POST /api/mappe/importa`): pacchetto JSON con mappe, spilli,
  condizioni, voci della guida collegate e immagini; l'importazione unisce per chiave e scarta (contandole) le voci e le condizioni che
  non reggono.
- **Mappa di Tokyo** (`MappaTokyo`, `collocazioneTokyo.ts`): le sagome dei quartieri vengono dagli originali del gioco; la
  collocazione dei Palazzi e dei luoghi senza un posto in città è calcolata per non sovrapporsi alle tre larghezze di verifica.
  Gesti: pulsanti, pinch a due dita, rotellina solo con la mappa ingrandita o con Ctrl/Cmd; a ingrandimento 1 il dito e la rotellina
  fanno scorrere la pagina. I cartellini che alla misura e all'ingrandimento di quel momento distano meno di
  `DISTANZA_MINIMA_SPILLI` diventano una pastiglia «+n» con l'elenco dei nomi (`src/utils/raggruppaCartellini.ts`, la stessa regola
  dei bersagli di `raggruppaSpilli`; acceso nella Città e nella Home, spento nella scheda «Oggi» della pagina Partita, `raggruppaVicini`, perché quella pagina non cambia disposizione); l'area di tocco di 44 px dei cartellini è divisa per lo zoom (`--zoom-tokyo`), così a ogni
  ingrandimento resta di 44 px sullo schermo.

### Pagine (tabella delle rotte del frontend, `src/router.tsx`)
| Indirizzo | Pagina |
|---|---|
| `/home` | `HomePage` |
| `/compendio`, `/compendio/persona/:id`, `/compendio/glossario` | `CompendioPage`, `PersonaDettaglioPage`, `GlossarioPage` |
| `/skill`, `/skill/:id` | `SkillPage`, `SkillDettaglioPage` |
| `/fusione` | `FusionePage` |
| `/partita` | `PartitaPage` |
| `/confidenti/:chiave` | `ConfidenteDettaglioPage` |
| `/guida` | `GuidaPage` (indice) |
| `/guida/percorso`, `/guida/percorso/:data` | `PercorsoPage` (guida giorno per giorno, il Diario) |
| `/guida/calendario`, `/guida/domande` | `CalendarioPage`, `DomandePage` |
| `/guida/citta`, `/guida/citta/:chiave`, `/guida/citta/:chiave/:area` | `CittaPage`, `QuartierePage`, `AreaPage` |
| `/guida/luogo/:quartiere/:luogo` | `LuogoPage` |
| `/guida/dungeon`, `/guida/dungeon/:chiave`, `/guida/dungeon/:chiave/area/:slug` | `DungeonPage` (Palazzi), `DungeonDettaglioPage` (scheda del Palazzo o dei Memento, con il visore) |
| `/guida/mappe`, `/guida/mappe/:chiave`, `/guida/mappe/:chiave/modifica` | `MappaPage` (indice o visore), `EditorMappaPage` |
| `/guida/mondo/:tipo/:chiave` | `AccessoMondoPage` («Dove si trova») |
| `/guida/richieste`, `/guida/battaglia`, `/guida/ombra/:chiave` | `RichiestePage`, `BattagliaPage`, `OmbraPage` |
| `/guida/attivita`, `/guida/libri`, `/guida/film`, `/guida/videogiochi`, `/guida/cruciverba` | `AttivitaPage`, `LibriPage`, `FilmPage`, `VideogiochiPage`, `CruciverbaPage` |
| `/guida/negozi`, `/guida/negozi/:chiave` | `NegoziPage`, `NegozioPage` |
| `/guida/oggetti`, `/guida/oggetto/:categoria/:slug` | `OggettiPage` (catalogo), `OggettoPage` |
| `/guida/completamento`, `/guida/covo`, `/guida/sfide`, `/guida/personaggi` | `CompletamentoPage`, `CovoPage`, `SfidePage`, `PersonaggiPage` |
| `/impostazioni` | `ImpostazioniPage` |
| qualunque altro | `NotFoundPage` |

La ricerca globale non è una pagina: `RicercaGlobale` è montata in `MainLayout` e `PulsanteCerca` sta nella `Topbar`.

### Indirizzi vecchi e redirect
Sono indirizzi **del frontend** (non rotte API: nessun redirect lato server). Il redirect esiste nel codice indicato; la tabella dice dove.

| Indirizzo vecchio | Destinazione | Dove sta |
|---|---|---|
| `/` | `/home` | `src/router.tsx` |
| `/confidenti` (l'indirizzo unico dei Confidenti: indice della Guida, pin Confidente non collegato) | con una partita attiva `/partita?scheda=confidenti`, senza `/guida/personaggi`; si sceglie dopo che l'elenco delle partite è arrivato | `src/components/layout/VersoIConfidenti.tsx` |
| `/guida/dungeon/iweleth` e `/guida/dungeon/iweleth/area/:slug` | `/guida/dungeon/mementos?area=mementos-08-iweleth` (Iweleth è solo un dedalo) | `src/router.tsx` |
| `/guida/rimossi` | `/impostazioni#nascosti` (i «Nascosti dalla guida» del Cestino) | `src/router.tsx` |
| `/guida/mappe/tokyo` | `/guida/citta` | `src/pages/MappaPage.tsx` |
| `/guida/mappe/<chiave>` quando la casa della mappa è un'altra pagina (quartiere, Area, scheda del Palazzo) | la casa, conservando `spillo`, `x`, `y`, `zoom`, `contesto`, `area` | `MappaPage.tsx` (`casaEQuesta`, `casaConArrivo` in `src/utils/navigazioneMappa.ts`) |
| `/guida/mappe/<alias della guida>` (risposta `tipo: 'guida'` del risolutore) | la casa data dal server; senza casa, `/guida/mappe/<mappaPalazzo>?area=<area>` | `src/components/mappe/RisolviMappa.tsx`, che chiama `GET /api/mappe/risolvi/:chiave` |
| `/guida/mondo/quartiere/<q>` | `/guida/citta/<q>` | `src/pages/AccessoMondoPage.tsx` |
| `/guida/mondo/dungeon/<k>` | `/guida/dungeon/<k>?infiltrazione=in-corso` (per `mementos`, senza parametro) | `AccessoMondoPage.tsx` |
| `/guida/mondo/<altro>/<chiave>` con una sola destinazione e senza contenuti della guida | `/guida/mappe/<mappa>` con `spillo` e coordinate (`urlDestinazioneMondo`, `shared/accessoMondo.ts`); altrimenti resta la pagina «Dove si trova» | `AccessoMondoPage.tsx` (`GET /api/mappe/accesso/:tipo/:chiave`) |
| `/guida/dungeon/<k>?area=<infiltrazione>` | la stessa infiltrazione; se c'è anche `?infiltrazione=`, vince `infiltrazione` | `src/pages/DungeonDettaglioPage.tsx` (nei Memento `?area=` resta il dedalo) |
| `/guida/negozi/<chiave>` di un negozio con sede | `/guida/luogo/<quartiere>/<luogo>#negozio-<chiave>` (`sedeCasa`); i negozi senza sede restano sulla loro pagina | `src/pages/NegozioPage.tsx` |
| `/guida/attivita?scheda=libri` e `?scheda=film` | `/guida/libri`, `/guida/film` | `src/pages/AttivitaPage.tsx` |
| `/guida/oggetti?scheda=consumabili`, `equipaggiamento`, `chiave` | non è un redirect: il catalogo si apre sul gruppo `consumabili`, `equipaggiamento`, `materiali` | `src/pages/OggettiPage.tsx` (`GRUPPO_STORICO`) |

### Risolutore d'immagine
- **Quale immagine**: una regola sola, nell'interfaccia `useImmagineMappa` (`src/hooks/useImmagineMappa.ts`): quella **caricata** nell'istanza vince ovunque, poi l'asset dichiarato della mappa, poi l'icona. Sul server `caricataDellaMappa` e `urlCaricata` (`mappe/immagineMappa.ts`) scelgono l'immagine caricata e danno l'URL sempre versionato (`?v=<data>`).
- **Quale ruolo**: dedotto dal posto nella gerarchia, in `shared/immaginiMappa.ts` (`sqlRuoloDaGerarchia`): la radice (senza genitore) di tipo `palazzo` o `dedalo` ha l'`emblema`; senza immagine, `nessuna`; città e quartieri, `illustrazione-editoriale`; il resto, `planimetria-nativa`. `ruoloConVisore` dice se il visore si apre (planimetria e illustrazione sì, emblema e nessuna no). Ogni scrittura di un'immagine di mappa passa da `dopoImmagineMappa`, che riallinea chiave, dimensioni e ruolo; la migrazione 107 ha applicato la regola una volta.
- **Miniature**: `shared/miniature.ts` (`LARGHEZZE_MINIATURA`, `urlMiniatura`, `srcsetMiniature`) e `server/services/miniatureService.ts`, con cache nella tabella `immagine_miniatura` (108); rotta `GET /api/immagini/:ambito/:chiave/file?l=`.
- **Illustrazioni dei posti**: `IllustrazioneDto` nei DTO di quartiere e Palazzo (`illustrazioneDellaMappa`), mostrate da `IllustrazioneConSegno`.
- **Miniature delle carte dei Luoghi**: ambito di caricamento `dungeon` (`shared/immagini.ts`, `AMBITO_MINIATURA_LUOGO`), chiave = `dungeon.chiave` di un Palazzo o dei Memento (tipo `mementos`), `dungeon_area.chiave` di un Dedalo dei Memento (le righe di `dungeon_area` del dungeon di tipo `mementos`) o `area_dedalo.chiave` di un'area di un Dedalo; la rotta unica `PUT/DELETE /api/immagini/dungeon/:chiave` verifica l'entità (`verificaEntitaDellImmagine`: 404 `luogo-non-trovato`, 400 `luogo-senza-miniatura` per le infiltrazioni dei Palazzi). `gerarchiaMappe` legge le caricate una volta (`immaginiCaricateDi`, `urlCaricataDi`) e i nodi `palazzo`, `memento`, `dedalo` e `area-dedalo` portano `immagine` (URL versionato, o null) e `miniatura` (dove caricarla); il riscaldamento delle miniature le prepara come quelle delle schede. Client: `GrigliaLuoghi` mostra la caricata in 16:9 con `srcset` (senza: l'emblema del Palazzo o dei Memento o la lettera del Dedalo, nessuna immagine per l'area del Dedalo); il comando «Miniatura» apre `FinestraCaricaImmagine` (file, Ctrl+V, «Incolla dagli appunti» con `navigator.clipboard.read`, anteprima, Salva/Rimuovi/Annulla), che dopo un cambio allinea `immaginiCache` e fa rileggere la gerarchia (`RicaricaLuoghi`). Finestra e comando sono fuori dal rilascio (costante di build); la lettura del file sì (`GET /api/immagini/:ambito/:chiave/file` è nell'elenco del giocatore).
- **Pezzi**: `mappe/pezziMappa.ts` (`confermaPezzi`, 409 `mappa-con-pezzi`).

### Vocabolario unico
- **Condizioni** (`shared/condizioniSpillo.ts`): il tipo `RequisitoSpillo` (alias `Condizione`) è un'unione discriminata per `tipo` (per esempio `data`, `intervallo`, `fascia`, `meteo`, `giorno-settimana`, `quartiere`, `invito`, `palazzo`, `dote`, `confidente`, `richiesta`, `lettura`, `articolo`, `attivita`, `evento`, `contatore`, `pesca-sessione`, `persona-arcano`, `spillo`, `voce-guida`, `salvataggio-p5`, `nuova-partita-plus`, `dlc-posseduto`, più `gruppo` e `non` per le combinazioni). `salvataggio-p5`, `nuova-partita-plus` (`partita.nuova_partita_plus`) e `dlc-posseduto` (`set` = `dlc_set.id`) leggono le impostazioni della partita da `semaforiService.contenutiDellaPartita` (`StatoPartitaSemafori.contenutiPartita`); i nomi dei set vengono da `setDlcService.setDlcConPersone` (il nome di un set sono le sue Persona, servito anche da `GET /api/compendio/set-dlc` e da `GET /api/condizioni/elenchi` → `setDlc`). Un'unica funzione le descrive in italiano (`descriviRequisitoSpillo`) e un unico valutatore le valuta sul server (`server/services/condizioni/valutatore.ts`, `POST /api/condizioni/valuta`, esiti `vero`, `falso`, `avviso`, `grigio`; `POST /api/condizioni/valuta-gruppi` dà gli stessi esiti per più gruppi in una richiesta, per le pagine della guida); `condizioneEffettiva.ts`, `nomiCondizioni.ts`, `finestrePalazzi.ts` e `importazione.ts` stanno nella stessa cartella. Gli eventi di storia (`EVENTI_STORIA`) sono la fonte delle aperture dei dedali.
- **Date di gioco nei testi**: una sola resa, da `shared/condizioniSpillo.ts`: `dataLeggibile` («12 aprile») e `dataConArticolo` («il 12
  aprile», «dell'11 aprile», «dal…», «al…»), usate dal frontend (`utils/dateGioco.ts`) e dai testi che scrive il server (titoli e dettagli dello
  storico, avvisi, messaggi d'errore, motivi delle condizioni e della disponibilità dei Confidenti); la regola dell'elisione davanti a «8» e
  «11» sta solo in `dataConArticolo`. I titoli e i dettagli dello Storico registrati prima del formato unico si rendono in lettura
  (`dateDiGiocoNelTesto`, chiamata da `storicoService.eventoDto`), senza toccare `evento_partita`. `dataGiocoBreve` («22 apr») resta solo per i
  chip stretti. I moltiplicatori mostrati («×1,5») si scrivono con `testoMoltiplicatore` dalle costanti (`MOLTIPLICATORE_ESAME`,
  `MOLTIPLICATORE_INVITO`, `MOLTIPLICATORE_ARCANO` in `shared/puntiConfidenti.ts`, `MOLTIPLICATORE_FORTUNA` in `shared/fortuna.ts`).
- **Elementi** (`shared/elementi.ts`): le chiavi stabili (`phys`, `gun`, `fire`, `ice`, `electric`, `wind`, `psy`, `nuclear`, `bless`, `curse`, `almighty`) e i nomi italiani della guida (`ELEMENTI`, `NOME_ELEMENTO`), i tipi di skill (`TIPI_SKILL`), gli esiti delle affinità (`ESITI_AFFINITA`) e le personalità delle Ombre (`PERSONALITA_OMBRA`, `UMORI`). Le forme vecchie («Psichico», «Oscurità», «Quasi-divino», «Guarigione», «Tuono», «Gelo», «respinge») si riconoscono in lettura ma si mostrano col nome canonico; la migrazione 162 ha portato le etichette di `traduzione`.

### Il Diario come motore
La voce del Diario (`voce_giornata`) è l'unico gesto che produce effetti sulla partita: `server/services/motoreDiario.ts` legge gli effetti dichiarati (`shared/effettiVoce.ts`) e li trasforma in proposte da confermare (`propostePartitaService.ts`, `shared/propostePartita.ts`), acquisti con fonte `diario` (`acquistiService.ts`), Fortuna (`fortunaService.ts`), effetti di stato (`effettiDiStatoService.ts`), punti dei Confidenti per generazione (`puntiCronologici.ts`), inviti registrati dalla voce (`registraInvito` in `inviti.ts`) e visite di pesca (`pescaService.ts`). Ciò che una voce ha applicato si toglie togliendo la voce o la spunta (`annullaEffettiDiStato`, `togliEventiDellaVoce`, `annullaInvito` con `voceUid`). Gli yen delle voci spuntate si muovono da soli (`yenAutomaticiService.ts`: le spese scalano il saldo
mai sotto zero, togliendo la spunta torna solo quanto scalato; i guadagni legati a voci ed eventi entrano da soli); le Doti restano un
promemoria con «Applica». Nel riepilogo della voce (`shared/riepilogoEffetti.ts`) la frase del costo di un turno compare solo se la spunta
scala davvero qualcosa: lo dice `attivitaService.costoDelTurno`, con la stessa regola `yenDelTurno` che scala il costo dell'attività o il
prezzo della sfida; la sfida che un articolo della voce paga già non la ripete (prima della spunta gli articoli non in alternativa, dopo
quelli con il movimento degli yen in vigore, come `motoreDiario.scartaYenDeiTurni`). In Partita → Progressi ogni elemento nato da una voce spuntata dice da quale voce viene (`vociDeiProgressi.ts`: eventi di
storia da `effetto_stato_voce`, turni dal legame esplicito `utente.turno_voce_partita` (utente 063: scritto da `registraTurno` con la voce
e la stessa `created_at` del turno, tolto da `togliTurno`; il «+» del contatore non ne ha), letture dei contatori dalla ricevuta
`spunta_voce_partita.effetti_json`; i contatori hanno una
definizione sola, `disponibilitaService.elementiDeiContatori`).
Un effetto di stato salvato su una voce già spuntata vale subito in ogni partita con la spunta (`motoreDiario.riallineaStatiDellaVoce`: per effetto, `annullaEffettoDiStato` della versione di prima e `applicaUnEffettoDiStato` della nuova, ognuno in un savepoint; un rifiuto del dominio diventa una proposta dell'elenco invece di fermare il salvataggio). Gli effetti di stato delle spunte di prima mai applicati li censisce `statiMancantiService.proponiStatiMancanti` (all'avvio, dopo le regole, e dopo l'importazione) come proposte «da applicare» con `dati.passato` (registro: utente 050 `censimento_stato_voce`); l'approvazione passa da `applica-effetto` → `motoreDiario.applicaStatoDelPassato`. L'uscita di un oggetto («uscitaOggetto») che la partita non possiede in copie abbastanza (`effettiDiStatoService.copiePerUscita`, la lettura di `applicaUscita`) non si propone: il registro la segna `nulla-da-togliere` (vincolo dell'esito in utente 056; decisione presa una volta sola) e la proposta aperta di prima si chiude con `motivo_chiusura = 'nulla-da-togliere'`. Gli effetti di stato che nella partita non valgono (`statiNonApplicati` del DTO della voce: da approvare o non applicati) si leggono da `effetto_stato_voce` e dalle proposte aperte, senza copie; quelli segnati stanno in `applicatoDallaSpunta`, «era già vero» non si dice, e gli articoli in alternativa (`alternativeAcquistiService.effettiInAlternativa`) li sceglie solo la spunta: né il salvataggio né il censimento né l'approvazione li segnano. Il riallineamento gira dentro `conYenInOrdine` (ogni savepoint con `conCodaRipristinabile`, così una scrittura tornata indietro non lascia movimenti in coda); gli yen di un articolo segnato su una voce già spuntata li decidono `yenDellEffetto` (come alla spunta) e `sfideDellaVoce` (sfida di un turno della voce, acquisto ripetuto, anteprima `yenPrevistiApprovando`). L'esito per partita torna nella risposta del salvataggio (`StatoEffettiVoceDto.applicazioni`, `AzionePercorsoDto.applicazioniEffetti`) e la finestra della voce lo notifica (`src/utils/applicazioniEffetti.ts`).
Tre effetti di stato seguono le stesse vie: `personaTolta` (stato sì/no: l'esemplare esce dalla scorta con riga e skill nel «prima» di `effetto_stato_voce`, e torna togliendo la spunta solo se la Persona non è rientrata nel frattempo; evento `persona-rimossa` legato alla voce), `puntiConfidente` (l'effetto dà `note` 1–3 come una risposta nei dialoghi; alla spunta è una riga che somma nel registro cronologico `punti_confidente_voce`, tipo «punti» con `parametri_json` `{noteRisposta, bonusArcano, invito, piazzamento, effetto}` — gli stessi ingressi della risposta dell'incontro, invito = effetto «invito» di quel Confidente nella voce, `inviti.voceConInvitoDi` — e i punti del calcolo unico `shared/puntiConfidenti.ts`; la forma di prima con `punti` fissi resta leggibile, `{fissi, effetto}`, e la migrazione di gioco 301 la porta in note solo con 5/10/15 punti, elencando le altre in `dati_guida.audit-301-note-di-rango`; conta dove il rango sale a punti, si toglie con `togliPuntiDellEffetto` e non registra incontri) e `uscitaOggetto` (riga che somma nel registro unico delle uscite `consumo_oggetto_partita`, fonte `voce`, utente 055, mai oltre le copie di `dettaglioCopie`; «restituito» libera il prestito per la regola `restituzione` dal giorno della voce, «venduto» con `prezzo` muove il ricavo da solo). Le righe che sommano (`eEffettoCheSomma`: oggetto ricevuto, punti, uscite) non sono mai «già vere» e non hanno eredi fra voci.
**Effetti con condizioni** (`CondizioniEffetto` in `shared/effettiVoce.ts`): gli yen e gli effetti di stato «oggetto», «persona», «trofeo» e «sblocco» (`TIPI_EFFETTO_CON_CONDIZIONE`) possono dire `condizioni`, nel JSON dell'effetto (`voce_effetto.dati_json`: copie, appunti, cestino e pacchetto le portano senza colonne nuove), con il vocabolario unico; `normalizzaEffettoVoce` le valida tutte (un elenco vuoto non si scrive). Le valuta `voceDovuta.valutatoreEffettiCondizionati` / `effettiFuoriCondizione`, come «Si fa solo se» della voce (valutatore unico, stato della partita al giorno e alla fascia della voce; un grigio non nega). Un effetto con condizioni false: non si applica alla spunta (`applicaEffettiVoce`: fuori dagli effetti di stato e dagli yen, quindi senza ricevuta né stato da annullare), non si segna al salvataggio su una voce già spuntata (`riallineaStatiDellaVoce`: esito `non-applicato` con il motivo), non diventa proposta (`creaPropostaEffettoStorico` la chiude come non più dovuta; `applicaEffettoStorico` rifiuta con 409 `effetto-fuori-condizione`), non entra nell'elenco del passato (`statiMancantiService`, conteggio `fuoriCondizione`, senza registro: le impostazioni possono cambiare) e non si dice «non applicato» (`statiNonApplicati`). Diventato vero dopo la spunta, entra nell'elenco da approvare con la via unica degli effetti nati dopo la spunta: gli stati come elenco del passato, gli yen senza ricevuta come proposta «Applica» (`proponiStatiMancanti`, conteggi `yenProposti`/`yenChiusi`/`yenInvariati`; approvando, `applicaEffettoStorico` muove gli yen da soli). Il censimento gira all'avvio e quando cambiano le impostazioni dei contenuti della partita (`partiteService.aggiornaPartita`). Il riepilogo «Il gioco dà» (`riepilogoEffettiVoce`) nella partita mostra solo quelli che valgono; senza partita li mostra tutti con la riga «Solo se: …» (`fraseCondizioniEffetto`, `RigaRiepilogoEffettiDto.condizione`). Nell'editor della voce (`ElencoEffettiVoce`) «Vale solo se» usa `CondizioniEditor`; le condizioni restano se l'editor del tipo riscrive l'effetto.
Effetto «Persona registrata», solo nel Compendio o anche nella scorta: `{tipo:'persona', persona, scorta?:true, livello?}`. Con `scorta` l'effetto ha una seconda parte, l'esemplare in scorta (`aggiungiPosseduta`, dopo il compendio), ricordato come stato a sé (riga `<uid>:scorta`, tipo `persona-scorta` in `utente.effetto_stato_voce`) e tolto solo se intatto (`effettiDiStatoService.decidiAnnullo`, l'unica regola dell'annullo per spunta tolta, cestino ed effetto tolto o cambiato). Passa per lo stesso meccanismo degli effetti su voci già spuntate (nessuna via a parte): `applicaUnEffettoDiStato` scrive le due parti, `annullaEffettoDiStato(…, resta)` toglie solo le parti superate (la Persona cambiata, la scorta tolta) e lascia con il loro «prima» quelle che la versione nuova dice ancora; `statoSegnatoDallaVoce` dice al censimento, all'elenco della partita e alla finestra della voce che una Persona «anche nella scorta» con il solo compendio segnato manca ancora. La scorta piena non ferma niente: l'avviso «oltre la capienza n/N» arriva con la spunta (`AzionePercorsoDto.avvisiSpunta`), con il salvataggio (`ApplicazioneStatoPartitaDto.avvisi`) e nell'anteprima dell'elenco (`dati.avvisoScorta`); togliendo la spunta o eliminando la voce, l'esemplare modificato dopo resta e lo si dice (`avvisiSpunta`, `DELETE` con 200 `{ avvisi }`).

### Alternative d'acquisto (le televendite)
- **Modello:** due o più articoli della stessa voce legati da una condizione «non: articolo ottenuto» (`articoliIncompatibili`, `shared/condizioniSpillo.ts`) formano un gruppo di alternative (`gruppiAlternativi`, `shared/effettiVoce.ts`). Se ne compra uno, o nessuno. Le alternative si dichiarano solo nel catalogo: la voce tiene effetti «articolo» piatti. Ogni «non» + articolo è letto come alternativa (vedi `DECISIONI.md`, «Televendite»).
- **Server:** `server/services/alternativeAcquistiService.ts`:
  - `mappaIncompatibili`: tiene la mappa in memoria per un secondo e la svuota con `cacheDiGioco`;
  - `scelteAlternativeDellaVoce`: la scelta «alternativa» fra le scelte della spunta;
  - `risolviAlternativeAcquisti`: 409 `alternativa-da-scegliere`, 400 `scelta-alternativa-non-valida`, 409 `articolo-non-disponibile`, sempre prima di ogni scrittura;
  - `alternativeDellaVoceFatta`: a voce spuntata, gli articoli segnati e quelli aggiunti dopo la spunta, presi dal registro `operazione_effetti_voce` tramite `effettiAggiuntiDopo` di `yenAutomaticiService.ts`.
- **Spunta** (`motoreDiario.applicaEffettiVoce`):
  - gli effetti non scelti restano fuori da `applicaEffettiDiStato` e dagli yen automatici;
  - solo per il set scelto la disponibilità si valuta al giorno della voce (`statoAlMomento`).
- **Annullo:** `annullaEffettiAzione` è il punto unico anche per le letture delle ricevute: ognuna torna a `prima` se l'avanzamento vale ancora `dopo`, altrimenti resta con un avviso (spunta tolta, raccordi, eliminazione della voce).
- **Letture:**
  - `shared/riepilogoEffetti.ts`: gruppo «Uno a scelta, o nessuno · negozio» (la regola è `REGOLA_ALTERNATIVE` di `shared/effettiVoce.ts`, la stessa dell'editor e della spunta), senza totale e con la nota degli yen di quello che si sceglie; a voce fatta mostra il set comprato, «Nessuno dei due comprato», o le alternative da scegliere se sono state aggiunte dopo la spunta;
  - `SceltaAcquistoAlternativo.tsx`: la scelta alla spunta;
  - `AcquistiNegozioVoce.tsx`: il riquadro nell'editor della voce.

### Scorta dei negozi e registro degli acquisti
- **Regola in un punto solo:** `articolo.rifornimento_json` (gioco 242) dice quando l'offerta torna (`giorno`, `settimana`+giorno, `mese`, `pioggia`, `mai`, `consegna`+giorni, `restituzione`) e da dove viene la regola (`guida`, oppure `fallback-utente` dove la guida tace: il segno vale fino al cambio di giornata, senza limite); `articolo.quantita` sono i pezzi per ciclo. Le funzioni pure stanno in `shared/rifornimento.ts` (`statoScorta`, `descriviRifornimento`, `descriviStatoScorta`), usate dal server e dal modulo dell'articolo.
- **Registro:** `utente.registro_acquisti` (utente 051) ha una riga per acquisto: giorno e fascia di gioco, pezzi, fonte (`negozio`, oppure `voce` con voce ed effetto), `ottenuto_qui` (la riga che porta il segno «ottenuto»). Ogni riga porta la chiave con cui l'acquisto è segnato, la stessa di `acquisto_partita`, che resta il segno «ottenuto almeno una volta» letto da condizioni, televendite, regali e dalla barratura del pezzo unico. È tra i `RIFERIMENTI_PARTITE` verso i dati di gioco (articolo, voce, effetto).
- **Scorta in lettura:** `scorteService.scortaDellArticolo` calcola il ciclo dalla data della partita e dalle righe della sola offerta, senza scritture al cambio di giornata: ogni macchina è un punto vendita e ha la sua scorta perché ha le sue righe `articolo`. Il DTO (`ScortaArticoloDto`) porta tutti gli acquisti (`nelCiclo` per quelli che contano ora, `dopoLaData` per quelli con un giorno dopo la data della partita) e le chiavi con il segno «ottenuto» che nessuna riga porta (`senzaGiorno`). Tanaka: un ordine di un giorno precedente ancora in viaggio blocca tutto il negozio (`consegnaDelNegozio`). Esaurita la scorta, la disponibilità ha il requisito rosso «Scorta del negozio»; il pezzo unico già comprato non ne ha.
- **Scritture:** `negoziService.impostaAcquisto` (un acquisto = una riga; togliere = una riga sola; `soloPresenza` per il segno senza giorno), `annullaRigaDelRegistro` (`DELETE /api/partite/:id/registro-acquisti/:rigaId`), `registraCopiaDaVoce`/`togliCopiaDaVoce` per la voce che compra di nuovo un articolo già ottenuto (`effettiDiStatoService`). L'Aojiru resta con il suo registro delle consumazioni (`acquisto_registrato`).
- **Interfaccia:** `AcquistiOfferta.tsx` («Compra», gli acquisti del ciclo, «Acquisti precedenti», «Dopo la data di gioco», «Ottenuto senza un giorno registrato», ognuno con «Annulla»), usato da `ArticoliTabella.tsx`, `OfferteDellOggetto.tsx` e dalla merce del pin nel visore (`VisoreMappa.tsx`, `AcquistoDellaMerce`: popup e scheda); il riquadro «Rifornimento» del modulo dell'articolo (`ModuloArticolo.tsx`). Filtro «Acquistati / Da acquistare» e contatore del negozio usano `compratoNelCiclo` (`shared/rifornimento.ts`): ciò che si rifornisce è acquistato solo nel ciclo in corso. Si barra solo il pezzo unico (regola «mai», `ePezzoUnico`): i servizi (Penguin Sniper, Tempio di Kichijoji) hanno la regola dell'utente dalla gioco 259 e ciò che non ha una regola non si presenta come posseduto per sempre.
- **Sconto del negozio dal rango di un Confidente** (gioco 254 e 269): `negozio.sconto_json` = `{ confidente, rango, percentuale }` (la Clinica di Takemi: 50% dal rango 7). Il prezzo resta quello dell'offerta; il prezzo scontato si calcola (`shared/scontiNegozi.ts`) e lo applica `prezziArticoli.prezzoDellArticolo(articolo, fascia, partita, voce?)`, che leggono la spunta della voce (`motoreDiario`), l'anteprima dell'elenco del passato (`sfideDellaVoce`), i turni con l'articolo dell'esito (`attivitaService.yenDelTurno`, con la voce che li registra), l'evento d'acquisto e il listino della partita (`ArticoloDto.prezzoScontato`). Con la voce del Diario vale lo sconto del suo momento (`scontoAllaVoce`: prima del primo passaggio del Confidente al rango dello sconto nel registro dei passaggi, `utente.incontro_confidente_partita` con `passaggio = 1`, scritto dal Diario, dalle azioni dell'utente e dalla pagina Confidenti, prezzo pieno; l'ordine dentro la fascia viene dalla voce spuntata che porta al rango, un passaggio segnato dalla pagina vale dall'inizio della fascia; senza un passaggio con il suo giorno registrato, il rango di adesso). Il prezzo scontato arriva anche al pin della mappa (`SpilloDto.dettaglio.negozio.articoli[].prezzoScontato`) e a «Dove si compra» (`OffertaOggettoDto.prezzoScontato` e `.sconto`), e l'interfaccia lo dice con un solo componente (`src/components/catalogo/PrezzoScontato.tsx`: «Con lo sconto del 50%: 1.700 ¥», o la regola del negozio senza sconto attivo); `NegozioRiassuntoDto.sconto` lo dice nella scheda del negozio e il modulo del negozio lo modifica (`erroriSconto` per i messaggi di campo; il server verifica che il Confidente esista).

### Esiti delle attività con trofeo e oggetti
- **Dato in un punto solo:** `attivita.esiti_json` (`shared/esitiAttivita.ts`). Oltre a nome, prova, articolo, condizioni, Doti e premi in parole, un esito può dire il `trofeo` che fa ottenere (chiave di `trofeo`) e gli `oggetti` del catalogo che dà (`[{ oggetto, quantita }]`, al più 5, copie 1–999). Tutti e due facoltativi: gli esiti scritti prima si rileggono identici. `articolo` è anche l'acquisto che l'esito comporta (estrazione della lotteria: «Non vinto, ricompri il Lotto R»): il prezzo si scala registrando il turno (`yenDelTurno`).
- **Scritture:** solo da `attivitaService.registraTurno` (la spunta della voce del Diario e il + del contatore passano di lì) e `togliTurno`, nella stessa transazione del turno:
  - `trofeiDegliEsitiService.ts`: il trofeo si segna con `impostaTrofeo` e il «prima» va in `utente.trofeo_esito_turno` (utente 053; `gia` = c'era già, `evento_id` = l'evento dello storico); togliendo il turno torna com'era, oppure il segno passa a un altro turno o a una voce spuntata con l'effetto «trofeo» (e al contrario, `effettiDiStatoService.decidiAnnullo` → `cediTrofeoAUnTurno`);
  - `oggettiDegliEsitiService.ts`: gli oggetti vanno in `utente.oggetto_esito_turno` (utente 053), una riga per oggetto del turno con copie ed esito; togliendo il turno se ne vanno. Un oggetto che il catalogo non ha non entra.
- **Letture:** `oggettiOttenutiService` (origine `turno`: attività ed esito) e `copieOggetti` (copie possedute, per i regali) sommano le righe dei turni a quelle delle voci e delle Richieste. Le due tabelle sono nei `RIFERIMENTI_PARTITE` del pacchetto (attività, trofeo, oggetto) e hanno un'etichetta nel cestino. I turni registrati prima non si riscrivono.
- **Interfaccia:** `EditorEsiti.tsx` (trofeo, oggetti con copie dal catalogo, premi solo in parole per il resto), `SceltaEsito.tsx` e la scheda dell'attività (`AttivitaPage.tsx`): trofeo, oggetti e prezzo dell'esito senza prova; «nessuna Dote» e «Senza punti» solo se gli esiti dell'attività danno Doti.
- **Doti delle attività e promemoria «Applica»:** le Doti di un'attività stanno in `effetti_json` (valore fisso) o negli esiti (valore scelto alla spunta). Una Dote a caso senza note documentate è un esito per Dote e note, raggruppato per Dote (gioco 333: biliardo e sala giochi Gun About, «Conoscenza · 2 note», mai la Gentilezza); le note variabili sono un esito per numero di note (freccette ♪–♪♪♪). La Dote di un'attività legata a un Confidente sta nel Confidente (`confidente_dote_incontro`: i test di Takemi). La spunta della voce con l'effetto `turno` registra il turno con le Doti dell'esito (`registraTurno`), la ricevuta le porta (`turni[].doti` → `beneficiLegacy`) e la voce mostra «Applica» (`DaApplicare`), come ogni altra Dote. Il + del contatore (`impostaVolteAttivita`) dà al turno con Doti la sua identità (`turno_partita.uid`) e una proposta con la causa `turno` (utente 062: `utente.da_applicare.causa_tipo = 'turno'`, `causa_chiave` = «<attività>:<uid>»; `promemoriaDelTurno` → `riconciliaBeneficiTurno`): i benefici sono i punti del turno in `effetto_lettura_partita`, attivi finché il turno c'è (`targetCausa`). Il − (`togliTurno`) riallinea la causa: la proposta aperta si chiude (`non-piu-dovuta`), quella applicata ha la sua inversa. Partita → Progressi mostra `DaApplicare attivita=…` sotto la riga (`ProgressiPartitaDto.attivita[].conProposteDeiTurni`); `daSegnare` della risposta dice solo i turni tolti senza proposte (registrati da una voce o prima del registro).
- **Doti da segnare nella notifica (L8-12, D7):** le risposte con `daSegnare` (letture di libri, film e videogiochi, cruciverba, domande, incontri della pagina Confidenti, turni tolti) danno l'avviso «Da segnare nelle Doti: …» (`src/utils/dotiDaSegnare.avvisaDotiDaSegnare`) con il pulsante «Applica» della notifica: premuto, segna i punti detti con `PATCH /partite/:id/doti/:chiave` (`delta`), Dote per Dote. Niente promemoria persistente e niente automatismo: chiusa la notifica, le Doti si segnano dalla scheda. Se una Dote non si segna, l'errore dice quali sono già segnate e quali no (si riprova solo con quelle).
- **Modificatori della scheda Doti (L8-11):** `GET /partite/:id/doti/modificatori` → `ModificatoriDotiDto` (`animaDaCineasta`, `libroAnimaDaCineasta` = il nome del libro nel catalogo): la scheda accende l'interruttore «Anima da cineasta» con la lettura della partita e, senza il libro letto, lo tiene spento e disattivato con il suggerimento «Serve il libro «…»»; `puntiDote` applica lo scalino di film e DVD solo con il libro letto (`haAnimaDaCineasta`), qualunque cosa mandi il client. L'interruttore «Libro» resta a mano (nessuna lettura dice da dove vengono le note segnate a mano).
- **Capienza della scorta (L8-05):** un solo dato, `dati_guida.capienza-scorta` (`posti` di partenza, `gradini: [{ rango, posti }]` dalla 336), letto da `capienzaScortaService`; le descrizioni delle abilità di Igor sono solo testo.
- **Requisiti, date e livelli della guida (L8-03, migrazione 340):** gli elementi dei blocchi tengono accanto ai testi i campi che la partita sa valutare: `condizioniJson` (JSON di un elenco di condizioni del vocabolario unico) negli Speciali (`battaglia.speciali.elenco`, tipo di correzione `speciale`), nei boss segreti, nei finali (con `entro`, il giorno «MM-GG») e nelle ricette; `livelloMinimo` nelle Battaglie Sfida, nei boss e nel Mietitore; `conteggio` (`ConteggioSfidaCovo`: `regali-consegnati`, `attivita`, `attivita-del-tipo`, `contatore`, `confidenti-al-massimo`, `richieste-completate`, `compendio-registrato`, `cruciverba-risolti`, `timbri-raccolti`, `spesa-negozio`, `persona-livello`) nelle sfide del Covo: `completamentoService.progressoDelConteggio` li conta dallo stato delle condizioni o dalla tabella della partita, e senza `obiettivo` («tutti») ricava il totale dal DB a ogni lettura (attività `videogioco`, tutti i Confidenti al rango massimo `RANGO_MASSIMO_CONFIDENTE`, Richieste, Persona del Compendio con `fusioneService.registrazioniCompendio`, la stessa regola dello sconto del Registro); cruciverba e timbri si leggono con `cruciverbaService.fattiPartita` e `timbriService.timbriPartita`. Il rango massimo dei Confidenti è una costante sola, `RANGO_MASSIMO_CONFIDENTE` = 10 in `shared/puntiConfidenti.ts` (modulo leggero, nel file d'ingresso già con le condizioni). La leggono:
  - le regole condivise: condizioni (`condizioniSpillo`, `statiPartita`, `migraCondizioni`), sconti dei negozi (`scontiNegozi`), limiti delle Richieste (`limitiGuida.richiesta.rango`), moltiplicatori e bonus della Velluto (`bonusVelluto`), evento giocato (`puntiConfidenti.rangoDellEventoGiocato`);
  - gli schemi e le rotte: `schemas/catalogo` (sconto), `schemas/partite` (rango e requisito), `schemas/compendio` (rango atteso, Doti per rango), `schemas/guidaDungeon` (requisiti), `routes/confidentiScritture`, `routes/compendio`, `routes/disponibilitaStrutturata`;
  - i servizi: partite, punti cronologici, regali, catalogo degli oggetti, effetti di azione e di stato, fonte delle attività, requisiti, abilità, Doti degli incontri, incontri, operazioni della Velluto (Igor al massimo), compendio (ranghi di Iwai) e i conteggi del Covo;
  - l'interfaccia: `SceltaRegalo`, `DettaglioConfidente`, `RigaConfidente`, `regoleConfidente`, `InfoSalitaRango`, `DotiIncontro`, `ForcaIsolamento`, `RanghiConfidente`, `ModificaAbilita`, `DisponibilitaStrutturata`, `SceltaDaCatalogo`, `CondizioniEditor`, `EditorAzioneStrutturata`, `ModuloNegozio`, `ConfidenteDettaglioPage`, `RisposteMigliori`.

  Restano numeri scritti, perché non sono il rango massimo: le tabelle della Velluto con le loro righe (`MOLTIPLICATORE_EXP_CONFIDENTE`, `FORCA_RANGHI_DOCUMENTATI`, i giorni di `giorniIsolamento` e `RANGO_GEMELLE_TRATTAMENTO_VIP`, gradini delle fonti); il numero massimo di requisiti di un rango (10); il `CHECK` dello schema `utente.confidente_partita` (SQL); i testi della documentazione delle API. Nel registro delle correzioni `CampoDef.formato` (`condizioni`, `giorno`) dice la forma del testo: `ripristinoService` la ricontrolla (`normalizzaCondizioniSpillo` e `verificaCondizioni`, `dataValida`) e `ModificaGuida` usa `CondizioniEditor`. I servizi (`battagliaService`, `sfideService`, `completamentoService`, `compendioService.oggettiGuida`) aggiungono le condizioni con la frase (`condizioniDellaGuida` in `condizioni/fraseCondizioni.ts`), la frase dello sblocco degli Speciali (`sbloccoFrase`) e, con la partita, il progresso delle sfide del Covo dallo stato della disponibilità (`statoDisponibilitaPartita`) e i giorni che restano fino a `entro` dei finali (`giorniAllEntro`). La personalizzazione delle armi porta `confidente` (Iwai): le condizioni del rango 1 da `confidente_requisito` e la condizione di ogni rango della progressione. Le pagine mostrano gli esiti nella partita attiva con `useEsitiNellaPartita` (una richiesta a `valuta-gruppi` per pagina) e i componenti di `CondizioniNellaPartita.tsx` (`CondizioniGuida`, `LivelloNellaPartita` col livello della partita, `ScadenzaNellaPartita` con i giorni dati dal server). `CondizioniNellaPartita.tsx` non importa `shared/date`: in un modulo comune a più pagine caricate a richiesta portava i pezzi condivisi nel file d'ingresso.
- **Tratti:** l'effetto ha un testo solo, la descrizione della guida (blocco `dati_guida.sfide`, `tratti.elenco[].effetto`, con le correzioni del tipo `tratto` dalla riga delle Sfide e «Ripristina» al valore della guida). La leggono la scheda «Tratti» delle Sfide e la ricerca dal blocco, e la scheda Persona, le pagine delle skill e la fusione da `trattiGuida.trattoDellaGuida` (per nome canonico = `nomeEn`, solo skill `trait`): `compendioService.effettoMostrato` e `fusioneService` danno `effettoNome` dalla guida e `SkillRiassuntoDto.trattoGuida` (la riga delle Sfide, dove porta «Effetto del tratto» della pagina della skill). Le rese `traduzione/effettoSkill` delle skill dei tratti non si leggono, non compaiono in Traduzioni e non si scrivono né ripristinano (409 `effetto-di-un-tratto`); le righe restano nella tabella, senza effetto.
- **Proposta di infiltrazione per giorno (L8-06):** con l'insieme vuoto e senza righe di G-022, oltre al nome nel testo (certa) vale un'altra voce dello stesso giorno legata a una sola infiltrazione del Palazzo (`voce_infiltrazione`, probabile): il giorno di un'infiltrazione è quello delle sue voci, non una data scritta nel nome.
- **Richieste (L8-09):** sblocco = `condizioni_json`, scadenza = `scadenza_data` (con la proroga), dedalo = `area_chiave` col suo nome; le colonne di testo `disponibile_dal`, `scadenza` e `area` sono tolte (337). Lo stato «da verificare» del DTO non nasce più (restava solo da quei testi).

### Oggetti consumati, doni dei Confidenti e modificatori dei libri
- **Consumi:** un esito può dire gli oggetti che CONSUMA (`consuma`, stessa forma di `oggetti`; il prezzo non si ripaga). Un registro solo, `utente.consumo_oggetto_partita` (utente 054), una riga per consumo: fonte `turno` (scritta da `consumiOggettiService.segnaConsumiDelTurno` in `registraTurno`, tolta in `togliTurno`) o `isolamento` (`operazioniVellutoService.eseguiIsolamento` con un incenso del catalogo, con l'evento dello storico). Il regalo resta nel suo registro (`regalo_partita.copia_consumata`). Le copie (`copieOggetti`) sono possedute − regalate − consumate, dove le consumate comprendono anche le copie cedute negli scambi (offerte con `costo_json` di tipo «oggetti»: Sakai, Gachapon, Super Baron), lette dall'acquisto e dal costo dell'offerta. `oggettiOttenutiService` dà `totali[].consumate` e l'elenco `consumi`. Tabella nei `RIFERIMENTI_PARTITE` e nel cestino. C'è anche la fonte `voce` (utente 055) (effetto «oggetto restituito o venduto»: `voce_uid`, `effetto_uid`, `modo`, `prezzo`, `giorno`; si annulla togliendo la spunta), letta da `scorteService` per la regola «restituzione» (`copieRestituite`).
- **Doni dei Confidenti:** `ricompensa_oggetto.condizioni_json` (gioco 295, 327, 329 e 332) è la regola di un dono: 60 doni su 63 l'hanno (con il Rampino di Morgana: il passo «Ricevi Rampino da Morgana» del Palazzo di Kamoshida segnato, condizione `voce-guida`, valutata sullo stato completo della disponibilità e detta con i nomi delle voci) (i 19 del rango massimo, rango 10 e dal 19 marzo; i 9 pegni del 24 dicembre e i 10 cioccolati del 14 febbraio «se fidanzata», con le condizioni `relazione-romantica` con il Confidente e `relazioni-romantiche` al più 1, entro il giorno; i 10 dolci «se fidanzata», con la sola `relazione-romantica`; gli 11 giri choco del 15 febbraio, rango 10 e dal 15 febbraio, e per i Confidenti romanzabili `non` `relazione-romantica` entro il 15 febbraio, «si è scelto di restare amici»). `doniConfidenti.ts` la valuta con il valutatore unico sullo stato essenziale della partita (`statoPartitaSemafori`: ranghi, Doti, giorno, relazioni con il giorno d'inizio, `utente.confidente_partita.relazione_romantica_dal`, utente 060) e il dono entra fra gli oggetti ottenuti (origine `confidente`) e fra le copie, finché la regola vale. I cioccolatini di Ryuji e Sojiro non hanno una regola del dono: arrivano come oggetti degli esiti dell'attività `san-valentino` (gioco 331), scelti alla spunta della voce del 14 febbraio fra quelli che le relazioni romantiche della partita permettono (con l'unica fidanzata, con una di più fidanzate → Sojiro, con nessuna ignorando le richieste → Ryuji e Sojiro, senza fidanzata). Resta senza regola il Sacchetto di carta di Iwai, effetto delle voci del 4 e del 6 maggio (periodo validato). La scheda del Confidente legge la regola in parole (`condizioneDelDono`, `fraseDellaRegola` in `condizioni/fraseCondizioni.ts`).
- **Libri che cambiano un'altra attività:** `libro.effetti_json` con le famiglie `moltiplica`, `aumenta-punti`, `sblocca-funzione` (gioco 288); `modificatoriLibri.ts` li legge per i libri letti nella partita e li dà come promemoria: `EsitiAttivitaDto.promemoria` (scheda, contatore e scelta alla spunta: fabbricazione, studio, l'attività nominata) e `FilmDvdDto.promemoria` (film). Nessun importo: la guida non lo dà.
- **Incensi:** `INCENSI` (regola delle famiglie, senza prezzi) e `INCENSI_DEL_CATALOGO` (oggetto → famiglia e statistiche) in `shared/bonusVelluto.ts`; `GET /api/partite/:id/velluto/incensi` (`incensiDellaPartita`: prezzo dall'offerta, copie possedute); `POST …/velluto/isolamento` accetta `oggetto`.
- **Fusioni con un oggetto:** `persona.richiede_oggetto` (gioco 296) → `PersonaRiassuntoDto.richiedeOggetto` (oggetto e Richiesta che lo dà): solo l'etichetta «Richiede l'oggetto», il motore di fusione non la usa.
- **DVD:** il prestito `restituzione` vale anche per i noleggi di Scarlet (`articolo.oggetto_fonte = 'film'`): `scorteService` lo considera restituito quando il DVD è visto per intero.

### Correzioni, ripristino e cestino
- Ogni dato correggibile ha «Modifica» e «Ripristina»: `ripristinoService.ts` (`elencaCorrezioni`, `schedaCorrezione`, `correggi`, `ripristina`) con `TIPI_MODIFICABILI` (`shared/types.ts`). Per le righe il valore della guida è la fotografia `seed_json` presa alla prima correzione; per i blocchi JSON di `dati_guida` il blocco non si riscrive e le correzioni stanno in `correzione_dati_guida`, applicate in lettura (`datiGuidaCorretti`).
- Il **cestino** (`cestinoService.ts`; tabella `cestino` 104, utente 021 per le partite) registra le eliminazioni con trigger temporanei su ogni tabella dei due file; un registro catturato prima di un drop torna senza la colonna tolta (`colonneCompatibili` in `fontiTolte.ts`).
  Le voci del cestino di gioco (aree, voci, planimetrie, per id) stanno sotto `/api/impostazioni/cestino`, solo in preparazione; le voci
  personali (partite, fonti d'acquisto, pesca, Persone della scorta, per uid) hanno una sola serie di rotte, `/api/partite/cestino…`, in
  preparazione e in rilascio, tutte filtrate per proprietario nello stesso servizio. L'elenco unificato `/api/impostazioni/cestino?partite=1`
  somma le due famiglie, ma le voci personali si rimettono e si tolgono dalle rotte `/api/partite/cestino/:uid`.
- L'id di una partita nuova (`partiteService.creaPartita`) è oltre il massimo delle partite, del Cestino delle partite, del vecchio cestino
  di gioco (tipo `partita`) e del contatore di `partita` (`sqlite_sequence`, AUTOINCREMENT dalla utente 064): non torna mai quello di una
  partita eliminata, nemmeno svuotato il Cestino, quindi né il ripristino né l'archivio senza chiave esterna (`acquisto_legacy_valutazione`)
  incontrano una partita nuova con lo stesso id.

### Ricerca globale
`GET /api/ricerca` (`routes/ricerca.ts`, `ricercaService.ts`): cerca nei nomi (mostrato, originale, sinonimi) di un indice in memoria (`ricerca/indiceRicerca.ts`, un costruttore per ognuno dei 29 tipi di `TIPI_RICERCA` in `shared/ricerca.ts`, fra cui personaggi, tratti delle Persona, cruciverba e termini del glossario), raggruppa per tipo e restituisce percorso, casa e immagine. La casa di un elemento di un elenco è la sua pagina con `?elemento=<chiave>` (vedi Frontend). Le cose nascoste non entrano; i luoghi chiusi sì, con il loro stato (`ricerca/statoRicerca.ts`). L'indice si ricostruisce quando un dato di gioco cambia (registro `cacheDiGioco.ts`).

### Catalogo degli oggetti
Il catalogo è separato dall'equipaggiamento storico `oggetto`, citato dalle Persona per nome inglese. L'identità di un oggetto è la riga di `catalogo_oggetto` (migrazione 121, utente 026); le offerte (`articolo`), i regali dei Confidenti, i contenuti e le ricompense la citano per chiave. Letture: `catalogoOggettiLetture.ts` (base, senza dipendere dai consumatori) e `catalogoOggettiService.ts` (aggrega offerte, regali, contenuti); scritture: `catalogoOggettiScritture.ts` (identità), `catalogoOggettiProposte.ts` (proposte di abbinamento, conferme, legami) e `catalogoOggettiFusione.ts` (fusione reversibile tramite il cestino). Router `/api/catalogo-oggetti` (`routes/catalogoOggetti.ts`); pagine `OggettiPage` (catalogo) e `OggettoPage`, componenti in `src/components/catalogo/`. Le note storiche (`nota_storica`, 139) dicono una discordanza della guida senza cambiare prezzi o acquisti e si correggono con Ripristina (`noteStoricheService.ts`). I Tesori da vendere della guida (140) sono righe `altro/…` con `fonte_tipo` `guida` e `fonte_chiave` `tesori/<nome>` (126 dalla 368; i 13 premi delle Sfide e il Diamante c'erano già); prezzo di vendita e reperibilità stanno nella descrizione. L'elenco delle Ombre sciagura e l'oggetto raro di ognuna stanno in `dati_guida.battaglia.ombreSciagura` (`elenco`, `ricompenseElenco`, dalla 369) e la pagina `/guida/battaglia` li mostra.
- **Macchine**: «Dove si compra» (`OfferteDellOggetto.tsx`) ha una riga per macchina, raggruppate per quartiere; ogni macchina resta distinta perché ha la sua scorta. Un punto vendita senza pin esiste con offerte e scorta e compare nel suo luogo e in «Dove si compra», senza segno in mappa.
- **Regali**: `regaliPartita.ts` separa l'identità dalla consegna storica: il comando accetta `catalogo` (chiave dell'oggetto) oppure il vecchio `regalo` per nome, risolto solo se univoco; nomi e date salvati non si riscrivono; il DTO conserva `regaliFatti` e affianca `regaliFattiCatalogo`. Il regalo con punti e acquisto è l'azione `POST /api/partite/:id/regali` (utente 035).
  - **«Annulla ultimo» del cassetto del Confidente (L10-05):** l'ultima registrazione annullabile si legge dallo storico, non dallo stato della
    pagina, e resta dopo un ricaricamento. I punti aggiunti dalla pagina senza cambio di rango (una risposta, un'uscita) scrivono l'evento
    `confidente-punti` (`incontriService.aggiornaConfidenteDallaPagina`: `punti`, `rango`, `puntiDopo`, `data`, `fascia`); l'evento `regalo` di
    «Regala» porta anche `rango` e `puntiDopo`. `ultimoAnnullabileConfidente.ts` prende per Confidente l'evento più recente fra `confidente-punti`,
    `regalo` e `confidente-rango` e lo dà come `ConfidentePartitaDto.ultimoAnnullabile` solo se rango e punti sono ancora quelli di subito dopo
    (per un regalo, se la consegna c'è ancora); un cambio di rango, un'altra variazione dei punti o un evento di prima di L10-05 non ne danno.
    `POST /api/partite/:id/confidenti/:chiave/annulla-ultimo` {evento, creatoIl} (`annullaUltimoConfidente.ts`; l'id da solo non basta, gli id
    di `evento_partita` si riusano) annulla solo se è ancora quell'evento (409
    `niente-da-annullare` altrimenti, e il cassetto rilegge i Confidenti): i punti con `aggiornaConfidenteDallaPagina` (`deltaPunti` negativo, con
    il momento dell'evento per togliere l'incontro delle risposte) e l'evento tolto dallo storico, il regalo con `annullaRegalo` sulla sua
    consegna. Tolto l'evento, torna annullabile la registrazione di prima.
  - **Regali con reazione e copie (gioco 255-258, utente 052):** `confidente_regalo.reazione` (+3/+2/+1) e `confidente.regalabile` sono dati; ogni oggetto regalo si dà a un Confidente regalabile già incontrato (+1 fuori elenco), la Cartolina si spedisce (`shared/regali.ts`). **`utente.regalo_partita` ha per chiave `id`**: ogni consegna è una riga, anche lo stesso oggetto ridato, con `copia_consumata`, `registro_id`, `modo` (consegna/cartolina) e `causa_yen` propria. Le consegne arrivano alle pagine come `ConfidentePartitaDto.consegne` e `OggettoDettaglioDto.partita.consegne` e si annullano per `id`. Le copie possedute si leggono in `copieOggetti.ts` (registro degli acquisti, set comprati, oggetti ricevuti, meno le consegne che le hanno usate). Il Cestino riconosce le fotografie di `regalo_partita` di prima della 052 con la chiave di allora più `fatto_at` (`chiaveDellaFotografia` in `cestinoService.ts`).
- **Quantità ignota**: la resa non dichiarata di una ricetta resta `null`; `RicompensaOggettoDto` la distingue da `ContenutoOggettoDto`, che ha quantità nota positiva.
- **Costo**: appartiene all'offerta (yen oppure fiori/oggetti per chiave e quantità) ed è reso da `CostoDellOggetto` (`src/components/catalogo/`), condiviso da listino, pagina Oggetto e visore.
- **Sezioni della guida collegate**: `OggettiCollegati` è la resa comune delle ricompense e dei contenuti nelle schede, nella guida del visore, nelle Richieste e nelle ricette; i contenuti delle voci si modificano con `ContenutoDellaVoce`.

### Pacchetto, import ed export
- Il pacchetto di gioco è `gioco.db` (`pacchettoGiocoService.ts`). «Importa» passa dall'anteprima, fa una **copia di sicurezza** (`prima-del-ripristino-<timbro>` in `data/backups`, conservate le ultime `COPIE_DI_RIPRISTINO = 3` in `impostazioniService.ts`), **sostituisce** `gioco.db` e riapre l'istanza (le migrazioni portano avanti un file più vecchio); non unisce e non tocca `partite.db`. I file passano dalla cartella d'appoggio (`depositoService.ts`, `DEPOSITO_DIR`); una sola sostituzione alla volta (`lucchettoIstanza.ts`); le cache di gioco si svuotano insieme (`cacheDiGioco.ts`).
- Gli orfani dell'anteprima vengono da `RIFERIMENTI_PARTITE` (`pacchettoGiocoService.ts`): ogni colonna delle partite che cita una riga di
  gioco, con il filtro sul tipo per le chiavi polimorfe. Il censimento (`censimentoPartite.ts`, `CENSIMENTO_PARTITE`) classifica ogni
  tabella dello schema `utente` e ogni colonna dal nome di riferimento (`…_chiave`, `…_uid`, `…_id`, `chiave`, `data`, `dote`, `da_voce`,
  `acquisto_articolo`) che non è un riferimento, con il motivo; una tabella o una colonna non classificata dà un avviso nel log
  (`avvisaCensimentoPartite`) all'avvio della preparazione e in «Prepara edizione», senza bloccarli (decisione dell'utente del 01/11). I
  valori delle colonne di tipo delle chiavi polimorfe non sono censiti.
- Le correzioni dell'utente stanno nel database, quindi nell'export e nelle copie di sicurezza; dopo l'import di un file più vecchio le correzioni successive a quel file non sono nel DB ma restano nella copia di sicurezza. Le copie di sicurezza tenute sono le ultime 3: quella di un import se ne va al terzo import successivo.
- Il backup di avvio (`backupService.ts`) copia i due file prima delle migrazioni e ne tiene al più 7, entro il tetto in byte di §5.

### Migrazioni
- **Gioco**: 371 migrazioni registrate in `server/db/migrations/index.ts`, l'ultima è la 371 (`371_vincolo_del_primo_giugno`). **Utente**: 69 registrate in `server/db/migrazioniUtente/index.ts`, l'ultima è la 069 (`069_produce_json_tolta_se_resta`). `runMigrations` applica prima tutte le migrazioni di gioco e poi quelle delle partite, nella stessa chiamata: una migrazione delle partite può contare sui dati di gioco della stessa versione. Il numero cresce: fa fede il registro. Registri append-only; `index.test.ts` pretende id consecutivi; ogni migrazione gira in una transazione con `foreign_key_check` prima di avanzare `user_version`.
- Punti di svolta (gioco): 099 aree dei dedali · 104 cestino · 107 ruolo dalla gerarchia · 108 miniature · 109 aree del mondo · 110 aree dei Palazzi e infiltrazioni · 115 luoghi fonte unica · 118 condizioni uniche · 121 catalogo degli oggetti · 138 pesca · 139 note storiche · 161 ranghi con modo · 162 vocabolario degli elementi · 163 disponibilità strutturata · 164 eventi↔voci · 166 Ombra · 168 giorno unico · 169–170 Persona del gruppo · 175 Iweleth nei Memento · 176–177 marcatori, piante e legami delle mappe tolti · 178 correzioni · 184–194 frasi e copie tolte · 195–197 correzioni ai dati Royal del Diario (cruciverba «Hacker» nel Cestino, voce del 13/11, Hagoromo) · 198–199 `origine` e `seed_json` su esame e calendario, per Modifica e Ripristina · 240 registro append-only delle copie e degli spostamenti delle voci del Diario (`operazione_voci_diario`, appunti del Diario) · 242 rifornimento degli articoli · 295, 327, 329 e 332 regole dei doni dei Confidenti · 315 premi delle domande in classe dalla guida · 324–325 Confidenti romanzabili e disponibilità con la relazione · 328 sblocco di «Se scomparissero i gatti» dalla voce dell'indagine · 330 effetti con condizioni dello Scaffale con lo scatolone del Leblanc · 331 San Valentino scelto alla spunta (attività `san-valentino` con gli esiti) · 333 Doti delle attività scelte alla spunta (biliardo, Gun About, freccette, Frui-te) e voci del Diario collegate alle loro attività (delle 38 lasciate dalla 312: 7 collegate, 4 già collegate, 27 senza collegamento con il motivo in `dati_guida.audit-333-attivita-e-voci`) · 334 indici del registro degli effetti delle voci (`operazione_effetti_voce(voce_uid, creata_il)`) e delle destinazioni dei pin (`spillo_destinazione(mappa_chiave)`) · 335 livello consigliato dei Palazzi come `dungeon.livello_min`/`livello_max`, il testo di prima nella nota storica `livello-dungeon-<chiave>` legata al Palazzo (`nota_storica_legame.tipo` accetta `dungeon`), colonna `livello_consigliato` tolta · 336 gradini della capienza della scorta in `dati_guida.capienza-scorta.gradini` · 337 `richiesta.disponibile_dal`, `scadenza` e `area` tolte · 338 refuso «Tongen-Java» della voce del 9 aprile (per uid, solo col testo di prima) · 339 avvisi del giorno: 181 doppioni tolti e 11 riscritti dall'elenco approvato (`avvisiDelGiorno339.ts`), archiviati in `archivio-frasi-l11` · 340 requisiti, date e livelli strutturati accanto ai testi della guida (`condizioniJson`, `entro`, `livelloMinimo`, `conteggio` nei blocchi `battaglia`, `sfide`, `completamento`, `oggetti-guida`; audit in `dati_guida.audit-340-campi-guida`) · 341–343 decisioni del 01/11 sul censimento degli avvisi, con gli attrezzi comuni in `decisioniDati0111.ts` (impronte per riga, audit): 341 voci del rango 1 di Akechi e del rango 10 di Igor (uid da un seme), «Impeto dell'Arcano superiore», sblocco di «Medicina amara» sulla voce del rango 7 di Takemi e della maid su quella del rango 8 di Kawakami con `convertiVoce` (registri di transizione e delle operazioni sugli effetti; senza scritture nelle partite) (`audit-341-voci-e-impeto`); 342 date di Kaneshiro, Medjed, Niijima (anche nei riassunti delle settimane, nella trama del 21/06 e nella nota del Palazzo di Kaneshiro), lettera a Kamoshida (21/04) e furto del Tesoro (evento nuovo del 22/04, con il collegamento alla voce del furto), condizione del Biliardo (`audit-342-date-e-testi`); 343 avvisi del giorno decisi, cercati per testo, archiviati in `archivio-frasi-l11` con la chiave «MM-GG #numero» accanto alle righe della 339; 344 i due pin con riferimento `attivita` passano a `luogo` (audit `audit-l1-02-pin-attivita`); 345 note d'archivio dei negozi venditore-ambulante, mercante-sakai, jose, gachapon-akihabara e tanaka-affari-loschi ripulite dei testi già strutturati (54 note di offerta di Mercante Sakai, Jose e Tanaka tolte o ridotte), con il termine del 30 gennaio di Tanaka in `sblocco_json`, gli indirizzi nelle `fonte` del negozio e ciò che resta come frasi della nota, senza il blocco d'archivio (`audit-l1-06-note-darchivio`); 346 un solo «dove»: via le sette colonne (`negozio.luogo_chiave`, `negozio.luogo`, `negozio.condizioni_json`, `attivita.luogo_chiave`, `articolo.effetto`, `articolo.statistiche`, `articolo.effetto_json`), con il testo «Come trovarlo» classificato in archivio o in nota e le condizioni storiche di `negozio.condizioni_json` di Lotteria di Shibuya e Chihaya in `sblocco_json` (Mantra Ganda era già sul luogo), con la sede data per identità ai tre elementi che nei backup vecchi avevano il solo quartiere (`lotteria-shibuya`, `chiosco-bevande-sottopasso`, attività `estrazione-lotteria`): i due luoghi creati dai pin 1466 e 1486 si ricreano com'erano, e i pin si ricollegano, se il backup non li ha e i pin sono ancora scollegati (mai se il luogo è nel Cestino) (`audit-l1-07-11-un-solo-dove`; tutto in `archivio-frasi-l11`); 347-354 le macchine (attrezzi in `attrezziL2.ts`, verbali `audit-l2-*`): 347 un luogo dei distributori per Area alla Shujin, 348 Central Street con tre macchine, 349 macchine della Shujin (`edificio-2`, `cortile-destra` senza pin, `cancello-1` visibile), 350 Tornello con due macchine, 351 Shinjuku con tre macchine (prezzi incerti senza valore, pin sul luogo), 352 nomi dei pin di Kichijoji, 353 testi di `cosa_offre` e `note` che ripetevano le offerte tolti con archivio, 354 listino condiviso e sedi aggiuntive tolti.
- Punti di svolta (utente): 021 cestino delle partite · 025 inviti · 028 acquisti e proposte · 029 pesca · 030 continuità degli acquisti · 032 Fortuna · 036 effetti di stato della voce · 040 piazzamento agli esami · 041 punti cronologici · 043 `lettura_partita` tolta · 050 censimento degli stati delle voci · 051 registro degli acquisti · 052 regali per consegna · 053 trofei e oggetti degli esiti · 054–055 consumi e uscite di oggetti · 058 appunti fissi del Diario · 059–060 relazione romantica e suo giorno d'inizio · 061 salvataggio di Persona 5 della partita · 062 proposte «Applica» dai turni del contatore delle attività · 063 legame esplicito turno → voce del Diario (`turno_voce_partita`) · 064 `partita` con AUTOINCREMENT e contatore oltre il più alto id · 065 le 15 righe d'archivio degli acquisti della partita 3, che non c'è più, tolte (blocco `acquisto_legacy_valutazione_no_delete` tolto e rimesso uguale nella stessa transazione, `verificaArchivioLegacy` prima e dopo) · 066 lo sblocco di «Medicina amara» (effetto della gioco 341) nelle partite con la voce del 28/05 spuntata, scritto come dalla spunta (`sblocco_partita` e il «prima» in `effetto_stato_voce`) · 067 categorie degli appunti fissi (`categoria_appunti`, `appunto_fisso.categoria_id`; gli appunti di prima restano senza categoria, nel loro ordine)
  conosciuto (partite, ogni `partita_id`, Cestino): un id di partita non si riusa più.

### Appunti del Diario
- **Copia, Taglia, Incolla**: copiare, tagliare e incollare voci passa da un solo servizio, `server/services/appuntiDiarioService.ts` (istantanea per gli appunti, piano con i rilievi, incolla in una transazione, annullo; anche «Copia in…» / «Sposta in…»), con il writer dell'ordine di `giornataService` (`collocaInFascia`, `compatta`, `ripristinaOrdineVoce`) e la copia degli effetti di `motoreDiario.scriviEffettiDaIstantanea` (registrata in `operazione_effetti_voce`). Nel frontend `useSelezioneVoci` (selezione), `useAppuntiDiario` (eventi `copy`/`cut`/`paste` del documento, appunti di sistema) e `utils/appuntiDiario.ts` (testo leggibile + HTML col blocco `p5r-diario-voci` versionato); solo preparazione, esclusi dal bundle di rilascio con la costante di build.
- **Appunti fissi**: le voci che si ripetono, salvate con titolo e testo intero in `utente.appunto_fisso` (utente 058, NON di una partita) da `server/services/appuntiFissiService.ts` (rotte `/api/appunti-fissi`, solo preparazione: fuori dall'elenco del giocatore). Le categorie stanno in `utente.categoria_appunti` (utente 067: nome unico senza maiuscole né accenti, ordine fra le categorie) e `appunto_fisso.categoria_id` (NULL = la lista senza categoria); `ordine` è il posto dentro il gruppo. `GET` dà categorie e appunti insieme (`AppuntiFissiDto`); lo spostamento è per un elemento con il posto d'arrivo (`PUT /:id/posto` con gruppo e indice, `PUT /categorie/:id/posto`) e nella stessa transazione ricompatta il gruppo di partenza; eliminando una categoria i suoi appunti vanno in fondo alla lista senza categoria. Nel frontend la finestra fluttuante non modale `components/appunti/FinestraAppuntiFissi.tsx` (montata in `MainLayout`, aperta da `PulsanteAppuntiFissi` nella `Topbar`; posto, misura e stato per dispositivo in `localStorage`, come le categorie chiuse), con la lista senza categoria in cima e le categorie apribili, riordinati trascinando la maniglia ⠿ con `useRiordinoCollegato` (un elenco per gruppo, uno per le categorie); lo store `appuntiFissiStore` (`@__PURE__`, esce dal rilascio; uno spostamento si vede subito, poi vale la risposta del server) e la scrittura comune negli appunti di sistema `utils/scritturaAppunti.ts` (anche di `useAppuntiDiario`). Il testo salvato dal Diario è quello di «Copia» (`scriviAppunti`), quindi Ctrl+V nel Diario lo riconosce.

### Strutture tolte
`server/db/fontiTolte.ts` (`FONTI_TOLTE`) è il registro di ogni tabella o colonna eliminata da una migrazione; una voce non si toglie mai (serve ai cestini e ai backup vecchi), e `tabellaTolta`/`colonnaTolta`/`colonneCompatibili` lo leggono. Elenco delle voci di oggi (la fonte è il file):

| Struttura tolta | Migrazione | Dove vive ora il dato |
|---|---|---|
| `marcatore_mappa`, `marcatore_luogo`, `pianta_area` | 176 | i pin della guida (le schede dei punti sulle planimetrie); archivio `archivio-marcatori-e-piante-l11` |
| `mappa.entita_tipo`, `mappa.entita_chiave`, `mappa_entita`, `mappa_presentazione.gruppo_immagini_json` | 177 | chiave e tipo della mappa, legami Area↔infiltrazioni, Area della planimetria, versione della mappa; archivio `archivio-legami-e-presentazione-mappe-l11` |
| `guida_mappa`, `organizzazione_mappa_esito` | 177 | nome e descrizione dell'infiltrazione (`dungeon_area`); nomi di prima in `guida_alias` |
| `luogo.giorni`, `luogo.giorni_json`, `negozio.orari`, `luogo.quando` | 184, 193 | `orari_json` del luogo e del negozio, disponibilità dei Confidenti; archivio `archivio-frasi-l11` |
| `negozio.sblocco`, `quartiere.sblocco`, `articolo.condizione`, `articolo.disponibile_dal` | 184, 187, 188, 194 | le condizioni (`sblocco_json`, `condizioni_json`); il «disponibile dal» mostrato è generato dalle condizioni |
| `luogo.negozio`, `luogo.attivita_json` | 187 | `negozio.sede_chiave`, `attivita.sede_chiave` |
| `giorno_calendario`, `giorno_percorso` | 189 | il giorno unico (`giorno`); le azioni del percorso sono le voci del Diario, copia storica in `archivio-giorno-percorso-azioni-l11` |
| `attivita.altri_effetti`, `attivita.regole`, `attivita.premi`, `attivita.paga` | 203 | il testo `dettagli` dell'attività, gli effetti strutturati e la paga strutturata (`paga_yen`, `paga_massima`); archivio `archivio-frasi-l11` |
| `pianta_quartiere` | 210 | l'illustrazione del quartiere nel database; archivio `archivio-pianta-quartiere-l11` |
| `libro.nome_it`, `film.nome_it`, `articolo.nome_it` | 215 | il nome del catalogo degli oggetti (`catalogo_oggetto.nome`); archivio `archivio-frasi-l11` |
| `luogo.sblocco`, `attivita.sblocco` | 218 | le condizioni (`condizioni_json`) e gli inviti che aprono il luogo; archivio `archivio-frasi-l11` |
| `negozio.luogo_chiave`, `attivita.luogo_chiave` | 346 | la sede (`sede_chiave`) e il quartiere del suo luogo; archivio `archivio-frasi-l11` |
| `negozio.luogo` | 346 | la sede e, dove portava un'informazione in più, la nota del negozio; testo originale in `archivio-frasi-l11` |
| `negozio.condizioni_json` | 346 | `negozio.sblocco_json` (Lotteria di Shibuya dal 18 aprile, Chihaya dal 23 giugno; Mantra Ganda era già sul luogo della sede); valore originale in `archivio-frasi-l11` |
| `articolo.effetto`, `articolo.statistiche`, `articolo.effetto_json` | 346 | l'oggetto del catalogo (`catalogo_oggetto`); erano vuote in tutte le offerte |
| `negozio.listino_condiviso`, `articolo.articolo_condiviso`, tabelle `negozio_luogo_extra`, `negozio_sede_spillo`, `negozio_sede_foto` | 354 | ogni macchina è un punto vendita con le sue offerte; contenuto in archivio, voci in `FONTI_TOLTE` |
| `utente.registro_acquisti.sede_chiave` | utente 068 | l'offerta (`articolo_chiave`), che ha una sola sede; i valori eventuali (la sede principale, scritta di default dagli acquisti in negozio) restano nella copia di avvio e non li legge nessuno |
| `confidente_disponibilita.giorni_json`, `.fasce_json`, `.luogo`, `.sblocco_data`, `.sblocco_requisiti` | 358 | la disponibilità strutturata e i requisiti di rango; i fatti che dicevano in più stanno nella nota; archivio `dati_guida` |
| `confidente_disponibilita.dal` | 358 | il requisito di rango 1 di tipo data |
| `attivita.luogo`, `attivita.doti_json` | 362 | la sede dell'attività; le Doti in `effetti_json` o negli esiti; archivio `dati_guida` |
| `libro.prezzo`, `.dote`, `.note`, `.disponibile_dal`, `.sblocca`, `.effetto_json` | 363 | offerta del catalogo, condizioni ed effetti del libro; vuote sui dati reali, i valori rimasti in una copia (la riga di Zorro del pacchetto iniziale) vanno in `archivio-frasi-l11` prima della rimozione |
| `film.note_successive`, `trofeo.quando` | 363 | gli effetti del film e le condizioni del trofeo (`condizioni_json`); erano vuote in tutte le righe |
| `regola_pesca.fonti_json` | 363 | `dati_json.fonti`, di cui era la copia esatta |
| `quartiere.sblocco_data` | 356 | la condizione di sblocco del quartiere (`condizioni_json`) con gli inviti; le 7 date in `archivio-frasi-l11` |
| `voce_giornata.produce_json` | 357 (o utente 069 su un'istanza nuova) | gli effetti della voce (`voce_effetto`); valori di prima in `archivio-frasi-l11`, il grezzo in `voce_effetto_transizione.raw_json` |
| `dungeon.livello_consigliato` | 335 | `livello_min`, `livello_max` e la nota storica del Palazzo; archivio `archivio-frasi-l11` |
| `richiesta.disponibile_dal`, `richiesta.scadenza`, `richiesta.area` | 337 | `condizioni_json`, `scadenza_data` con la proroga, `area_chiave`; archivio `archivio-frasi-l11` |
| `utente.lettura_partita` | utente 043 | `progresso_libro_partita`, `progresso_film_partita` |
| `utente.requisito_partita` | utente 044, solo se la tabella è vuota (con righe resta e il log lo avvisa) | niente: le conferme a mano dei requisiti dei Confidenti non si leggono più |

## 6. Motore di fusione
- `server/services/fusione/motoreFusione.ts`: snapshot in memoria del compendio (invalidato con le altre cache di gioco, `cacheDiGioco`, quando il pacchetto cambia) e contesti memoizzati per insieme di DLC posseduti;
  regole di chinhodado (speciale a due → Demone del Tesoro + normale con modificatore di rango → arcani diversi: prima Persona con livello
  ≥ 1+⌊(La+Lb)/2⌋ → stesso arcano: la più alta con livello ≤, esclusi gli ingredienti); ricette inverse per enumerazione delle coppie di arcani
  che producono l'arcano del target + fusioni con Demone del Tesoro; costo = somma dei prezzi di evocazione dal Registro degli ingredienti
  (`prezzoEvocazioneRegistro`, 27L²+126L+2147, in `shared/bonusVelluto.ts`). `fusioneService.ts` produce i DTO con nomi italiani e i motivi
  in italiano quando la fusione non è possibile. Nell'interfaccia (`Calcolatore`, `RicettaRiga`) il costo si chiama «evocazione dal Registro» e
  gli ingredienti in scorta valgono 0 (`costoRicettaConScorta`, che ripartisce il costo scontato del server sugli ingredienti da evocare).
- API pubblica del motore: `creaContesto(dlcPosseduti)`, `fondi(a, b, ctx)`, `ricettePer(target, ctx)`, `fusioniCon(persona, ctx)`,
  `ricettaSpeciale`, `costoFusione`, `livelloFusione`, `arcanaRisultato`, `personaFusione(id)`, `invalidaMotoreFusione`.
- Pagina `FusionePage` (`/fusione?vista=…`): otto viste per tutti, in una fila di piastrelle da 768 px e in un selettore sotto; «Ricette speciali» (`speciali`) contiene anche la tabella dei Demoni del
  Tesoro (D19; `?vista=tesori`, la vista interna di prima, porta lì). «Due arcani» (`coppia`) e «Matrice completa» (`matrice`) sono viste
  interne con `?strumenti=1`, solo nella preparazione: con `IN_RILASCIO` escono dal bundle di rilascio, e la guardia del bundle ne vieta le
  etichette.
- `server/services/fusione/alberoFusione.ts`: `pianiFusione(target, ctx, disponibilita, opzioni)` → piani ordinati per costo; foglie
  `scorta` (0 yen, un esemplare per volta), `registro` (prezzo di evocazione), `cattura` (Persona catturabile secondo `sqlPersonaCatturabile`, ≤ livelloMax); nodi `fusione` con
  2 ingredienti (o N per le ricette speciali). Stima ottimistica memoizzata per Persona e profondità + ricerca in profondità con potatura (branch-and-bound sulle N migliori), con un tetto deterministico di visite oltre il quale restituisce i migliori piani trovati (`troncata`),
  ampiezza per nodo 12 (almeno 40 con skill richieste); `pianoCoerente` verifica ogni nodo col motore. La disponibilità viene da `persona_posseduta` e `compendio_partita` della partita.
- `server/services/fusione/eredita.ts`: snapshot skill/apprese/tratti/tipi/matrice; `slotEreditabili(totale)`, `elementoEreditabile(tipo, elemento)`,
  `skillAlLivello`, `skillPosseduta`, `analisiEredita(risultato, ingredienti)` (candidate con motivo, slot, tratti), `copre(analisi, skillIds)`.
  `fusioneService.ereditaDto` (bacino dalla scorta se posseduta) e `cercaPerSkillDto` (filtri rapidi per tipo e bacino, poi analisi completa).
- Propagazione delle skill a catena (in `alberoFusione.ts`): `opzioni.skill` richiede che il bersaglio abbia le skill; a ogni nodo
  `ripartisciSkill` assegna le richieste agli ingredienti che le possono portare, verifica compatibilità (tipo, non esclusive) e slot; le foglie
  devono possedere le skill (scorta reale, innate al livello base) o apprenderle salendo di livello (`skillDaLivello`). I nodi espongono `skillPortate`.
- Bonus della Stanza di Velluto: `shared/bonusVelluto.ts` (sconti del Registro, moltiplicatore EXP del Confidente, moltiplicatori della Forca,
  tabella incensi/giorni/tier di resistenza dell'Isolamento, sblocchi delle Gemelle, effetti dell'Allarme) — regole in `docs/riferimenti/bonus-velluto.md`;
  i fattori della Forca (`FORCA_STESSO_ARCANO`, `FORCA_TESORO`, `FORCA_ALLARME`, `FORCA_PENALITA_LIVELLO`, `FORCA_SKILL_TRASFERITE`) e dell'Isolamento
  (`RANGO_GEMELLE_*` per ogni sblocco delle Gemelle, letti anche da `fusioneService.vellutoDto` e `PannelloVelluto`, `GIORNI_PER_APPLICAZIONE`, `INCENSO_ALLARME`, `LIVELLO_RESISTENZA_COPRE`) sono costanti lette sia dal calcolo sia dai testi
  (`ForcaIsolamento`, `EFFETTI_ALLARME`); i punti dell'Allarme dei cicli (`puntiAllarmeFusione`) e prezzo, note e punti dell'Aojiru (`shared/acquisti`,
  `puntiDaNote`) idem (L8-10);
  `fusioneService.vellutoDto`; i costi di ricette e piani sono scontati quando c'è la partita.

## 7. Frontend
- Layout tablet-first: `MainLayout` con `Sidebar` visibile da `lg` (1024px) e `BottomNav` fissa sotto; bersagli touch ≥ 44px (classe `.touch`).
- Schede di dettaglio: intestazione comune `IntestazioneScheda` (barra con «Indietro» e azioni, figura, h1 `TitoloScheda`, chip). Da
  640 px la barra si scioglie in una griglia (`.intestazione-scheda`): ritorno, corpo e azioni su una riga sola; con le briciole
  (`percorso`, in una `FilaScorrevole` di una riga che si apre sull'ultima tappa visibile, con la sfumatura dai due lati e la freccia
  solo a destra, perché accanto a «Indietro» due «‹» sembravano lo stesso comando) la prima riga è ritorno, briciole e azioni e il corpo
  va sotto; sul telefono l'ultima tappa di un luogo non c'è, la dice il titolo. Le righe lunghe di un luogo (orari, eccezioni,
  sblocco) e di un negozio (sede, orari, gestore, articoli) stanno in una carta subito sotto, non nella testata; da 1280 px la testata
  del luogo occupa le due colonne. Le testate proprie dell'Area e del Palazzo (con `IndietroScheda` e `TitoloScheda`) sotto i 640 px:
  nell'Area briciole e comandi solo icona (`.area-testata__comandi`) su una riga e il titolo accanto alla freccia sotto; nel Palazzo la
  riga di date, chip riassuntivo e «Dettagli dalla guida» (`rigaDati`) sta subito sotto l'intestazione. Ogni testata resta entro il 30%
  dell'altezza a 1366×657, 1280×689, 1024×690, 768×1024 e 375×812; «Indietro» = `useIndietro` (`navigate(-1)` se c'è una pagina dell'app prima, altrimenti la rotta di ripiego con sostituzione); titoli di sezione `TitoloSezione` (`display` 17 px o `sans`); strumenti di modifica nel menu `MenuModifica` («Modifica ⋯»), l'azione di gioco come pulsante primario.
- Dati remoti per pagina con `useCarica` (caricamento derivato dalle dipendenze) + `PageState`; stato globale in zustand: config, notifiche, glossario (rese italiane), partite (elenco + attiva, cambio dalla Topbar).
- Errori e conferme: un solo aspetto per gli errori, `VistaErrore` (titolo, spiegazione, dettaglio, «Riprova» / «Torna alla home»), usato da `PageState`, `ErrorePagina`/`ErroreInRiquadro` ed `ErrorBoundary` (variante `autonoma` a colori fissi, senza tema). Nessun `window.confirm`: `conferma({ titolo, testo, etichetta })` (`stores/confermaStore`) apre il `DialogoConferma` montato una volta in `MainLayout` (fuoco iniziale su «Annulla», tono «pericolo») e risponde con una Promise. `index.html` contiene un'anteprima statica d'avvio (logo «P5», «Caricamento…», CSS in linea) che React sostituisce al montaggio; `SchermataAvvio` ne riusa le classi `.avvio*`.
- Le pagine si caricano alla prima visita con un `loader` di precarico (`pagina` in `src/router.tsx`): se il file non arriva, si resta dove si era e si segnala la «nuova versione» (`versioneStore`).
- Immagini: una regola sola per le mappe (§5 ter); per le entità `ImmagineEntita` mostra il file caricato per (ambito, chiave), altrimenti l'asset predefinito, altrimenti le iniziali. Grafica predefinita: `public/asset/` → manifest generato dal plugin Vite → `assetStore` → `AssetImg`/`useAsset` con la preferenza `graficaPredefinita`; ogni punto ha un fallback, l'app funziona senza alcun asset.
- Tema Persona 5: nero profondo, rosso `#e5352b`, bianco; token per ogni elemento di gioco (`--color-el-*`); `overflow-wrap: anywhere` sul body.
- Pagina Partita in una schermata (`PartitaPage`): «Oggi» e «Doti sociali» riempiono l'altezza da 768 px (`scheda-riempi`, `riempi-figli`);
  Letture e giochi, Denaro e squadra, Confidenti, Compendio personale, Persona della partita e Storico da 1024 px (`RIEMPIONO_DA_1024`,
  `scheda-riempi-lg` / `riempi-figli-lg`): la radice della scheda è alta quanto il contenitore (`lg:h-full lg:min-h-0`), comandi e testate
  restano fermi (`lg:shrink-0`) e l'elenco scorre in un'area `lg:area-scorrevole` (in Denaro e squadra la colonna sinistra di 340 px con
  denaro e oggetti, che scorre tutta per scelta dell'utente del 01/11, e l'area della squadra, con ritratti resi a 64 px (l'utente li ha chiesti «un po' più grandi») e righe da almeno 76 px che a 1024 vanno su
  due linee perché la colonna è stretta; in Confidenti un'area per gruppo aperto). Le etichette nascoste a vista con
  `lg:sr-only` stanno in una riga posizionata (`lg:relative`): un assoluto fuori dall'area allungherebbe il documento (la regola globale
  `.sr-only { top: 0; left: 0 }` non vale per la variante). Sotto quelle larghezze i contenitori aggiunti sono neutri (`contents` o
  senza classi attive) e scorre la pagina. Le regole del telefono della scheda «Oggi» (L10-02) valgono solo dentro `.oggi-partita`, la radice
  di `OggiPartita`: la Home usa la stessa `OggiGuida` senza cambiare. `Modal` ha una `fascia` facoltativa, ferma fra intestazione e corpo:
  il cassetto del Confidente la usa per l'invito SMS acceso (`ConfidentiPartita`, `fascia-invito` dentro un contenitore `role="status"`
  sempre presente, che la annuncia all'accensione), col moltiplicatore da `MOLTIPLICATORE_INVITO` / `testoMoltiplicatore`; «Spegni» riporta
  il fuoco all'interruttore «Invito SMS» (`interruttore-invito-sms`) o, nella Scheda completa, alla finestra del cassetto; `DettaglioConfidente` riceve `invito` per il segno «×1,2» sui pulsanti dei punti.
- Meccaniche di gioco nel tracker: Doti = note→punti con soglie dei 5 ranghi; Confidenti = note→punti verso il rango successivo (`docs/riferimenti/confidenti-punti.md`); `src/utils/punti.ts` replica la formula per l'anteprima.

## 7 bis. Le due istanze: preparazione e rilascio
Lo stesso codice gira in due istanze con stack, volumi e immagini separati. Le capacità di ciascuna sono dichiarate in un punto solo,
`shared/capacita.ts`, letto da backend e frontend.
- **Preparazione** (`server/index.ts`, `docker-compose.yml`): l'istanza di sempre, dove l'autore scrive e corregge i contenuti. Un solo utente (il proprietario unico); se `CF_ACCESS_TEAM` e `CF_ACCESS_AUD` sono impostate vale anche lì il controllo d'identità. Da qui, con «Prepara edizione» (`server/services/edizioneService.ts`), si produce l'edizione.
- **Rilascio** (`server/rilascio.ts`, `docker-compose.rilascio.yml`, stage `rilascio` di `Dockerfile.backend`, workflow `docker-publish-rilascio.yml`): l'istanza pubblica, con i contenuti in sola lettura e le partite di più giocatori.
- **La modalità sta nella build, non in una variabile**: il backend di rilascio ha un altro punto d'avvio, il frontend si costruisce con `VITE_MODALITA=rilascio` (condizioni costanti nello stesso modulo: gli editor escono dal bundle; `scripts/verifica-bundle-rilascio.ts` lo controlla). All'avvio il frontend confronta modalità e capacità con `/api/config` (`shared/capacita.ts`).
- **Sola lettura su tre livelli**: (1) il volume dell'edizione (`EDIZIONE_DIR`) è montato `:ro` e `gioco.db` è 0444, senza giornale WAL; (2) all'avvio una scrittura di prova su `gioco.db` deve fallire (`server/rilascio/solaLettura.ts`); (3) si montano solo le rotte dell'elenco del giocatore (`server/rilascio/rotteGiocatore.ts`: `/api/partite/…`, le letture dei contenuti, la valutazione e il tracciamento delle condizioni), controllato contro le rotte vere a ogni avvio. Il frontend è il quarto livello, di sola presentazione.
- **Testi del rilascio** (D10): con la stessa costante di build `IN_RILASCIO` il frontend del rilascio non mostra la provenienza dei dati né
  le note per chi li corregge (collegamenti `Fonte`, «da fonte secondaria», «Da verificare» delle aree, incertezze delle fonti di calendario e
  battaglia, provenienze della negoziazione, affidabilità delle regole della Stanza di Velluto, comandi e filtri di chi prepara i contenuti).
  Le fonti stanno in un punto solo, visibile in entrambe le istanze: Impostazioni → Informazioni.
- **Volumi e variabili**: `EDIZIONE_DIR` (contenuti e caratteri, `:ro`), `PARTITE_DIR` (`partite.db`, l'unico file scrivibile), `BACKUP_DIR` (copie dell'avanzamento, all'avvio e ogni 6 ore); `CF_ACCESS_TEAM` e `CF_ACCESS_AUD` obbligatorie. I valori reali vivono solo nelle variabili dello stack.
- **Identità**: ogni richiesta `/api` (tranne `GET /api/health`) porta il token del proxy di accesso (Cloudflare Access), verificato dal backend (`server/middleware/identita.ts`); il proprietario delle partite è il `sub` del token. Cestino personale, partite e avanzamento sono per utente (`/api/partite/…`, compreso `/api/partite/cestino`).
- **Nessuna migrazione nel rilascio**: non ci sono né il runner né le cartelle delle migrazioni. «Prepara edizione» produce, in una cartella con `gioco.db`, `partite-vuoto.db`, `font/` e `manifesto.json`; il manifesto porta le versioni degli schemi e l'impronta della struttura delle partite (`server/db/improntaSchema.ts`, un'unica funzione usata dai due lati). A ogni avvio il rilascio (`server/rilascio/edizione.ts`) confronta versioni e impronta col manifesto e, se non coincidono, si ferma: una struttura diversa richiede una nuova edizione e una conversione una tantum su copia, dopo il sì dell'utente.

## 7 ter. Sicurezza ed esercizio
Oltre al bordo di Cloudflare, un secondo livello di difesa nell'app e nei container.
- **Immagini SVG** (`server/routes/immagini.ts`, `intestazioniDelFile`): il file di un'immagine SVG caricata esce con
  `Content-Security-Policy: default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox` e
  `Content-Disposition: attachment`. Dentro `<img>` e negli sfondi CSS si vede come prima (lì gli script non girano mai); aperto da solo non
  esegue nulla e si scarica. Gli altri formati e le miniature WebP non cambiano.
- **«Scarica da URL»** (`server/utils/scaricaDaUrl.ts`, `server/utils/reteInterna.ts`, solo nella preparazione): `http`/`https` di Node con
  una risoluzione DNS propria, non `fetch`. Si controllano tutti gli indirizzi del nome e ci si connette a quello controllato; un IP scritto
  nell'URL si controlla prima. Vietati i blocchi a uso speciale dell'IANA: privati, loopback, link-local (metadati del cloud), CGNAT,
  multicast, riservati, e in IPv6 loopback, ULA, link-local, site-local, multicast e le forme che contengono un IPv4 (mappato, NAT64, 6to4,
  Teredo). I redirect si seguono a mano, al più `MAX_REDIRECT = 5`, ognuno controllato come il primo e solo verso http/https. Errore
  400 `indirizzo-non-ammesso`. Lo User-Agent è `project-p5r/<versione> (guida personale di gioco per Persona 5 Royal)`.
- **Collegamenti alle fonti**: `shared/urlHttp.ts` è l'unica regola (solo URL assoluti http/https), usata da `Fonte`
  (`src/components/shared/VoceFonte.tsx`, schede di Battaglia, Completamento, Oggetti e Sfide), dai collegamenti in linea del Diario, del
  Calendario, del Covo, dei Personaggi e delle trasformazioni di Jose, dalle fonti della pesca, dalla scheda del Confidente
  (`src/utils/fonti.ts`) e da `urlValido` del server. Un testo che non è un indirizzo http/https non diventa un collegamento. I
  collegamenti in linea non passano da `Fonte` apposta: `urlHttp` è un modulo puro che il bundle di rilascio elimina, mentre importare
  `VoceFonte` nei moduli dell'avvio aggiungeva un file da precaricare.
- **Intestazioni del rilascio** (`nginx.rilascio-intestazioni.conf`, incluso in ogni `location` con un suo `add_header`): `nosniff`,
  `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, una CSP applicata ristretta (`frame-ancestors`, `base-uri`, `object-src`,
  `form-action`) e la CSP completa in solo rapporto (`Content-Security-Policy-Report-Only`: `default-src`, `script-src`, `style-src`,
  `img-src`, `font-src`, `connect-src`, `manifest-src`, `media-src`, `worker-src`, `frame-src`, tutte sulla stessa origine, con
  `'unsafe-inline'` per gli stili e `data:` per le immagini). L'nginx della preparazione non ha intestazioni di sicurezza (D11).
- **Container**: limiti di memoria e di processi in entrambi i compose (preparazione: backend 4 GiB e 256 processi, frontend 256 MiB e
  128; rilascio: backend 1 GiB e 256, frontend 256 MiB e 128), motivati nei commenti dei compose. Nel rilascio backend e frontend hanno il
  filesystem in sola lettura (il frontend con le tmpfs `/var/cache/nginx`, `/run`, `/tmp`) e `no-new-privileges`.
- **Guardia del bundle di rilascio**: `scripts/verifica-bundle-rilascio.ts` gira nel gate CI (con il confronto con la preparazione) e nello
  stage di build di `Dockerfile.frontend` con `VITE_MODALITA=rilascio`, sul bundle che entra davvero nell'immagine: una stringa vietata
  ferma la costruzione.

## 8. Build, test, deploy
- Test (Vitest). Aiuti comuni in `test/`: `dbDiProva()` (`test/dbDiProva.ts`, DB del backend in memoria con il pacchetto iniziale caricato e migrato); `test/supertest.ts` (alias di `supertest` in `vitest.config.ts`, chiuso a fine file da `test/setup.ts`); `moduloApi` / `moduloNotifiche` (`test/mockModuli.ts`) per i `vi.mock` del frontend. Il frontend gira in jsdom.
- Dev: `scripts/start-all.sh` (`npm run dev:server` = `tsx watch`, che **si riavvia da solo** a ogni salvataggio in `server/` e applica subito le migrazioni nuove ai dati di `data/`; `npm run dev:client` = `vite --host`), log `BE.log`/`FE.log`, PID in `.pids/`. Le porte vengono da `.env` (`BE_PORT`/`PORT`, `FE_PORT`).
- CI (`.github/workflows/ci.yml`, anche riusabile con `workflow_call`): typecheck, lint, build del frontend di rilascio e di
  preparazione con il controllo del bundle di rilascio, audit delle dipendenze di produzione (`npm audit --omit=dev --audit-level=high`). I test non girano a ogni push: si lanciano su richiesta sul solo percorso indicato, in locale `npx vitest run <percorso>` o con `test-su-richiesta.yml` (`workflow_dispatch`, input `percorso`).
- Immagini della preparazione (`docker-publish.yml`): a ogni push su `main`, dopo il gate `verify` (lo stesso `ci.yml`), build & push su GitHub Container Registry di `project-p5r-backend` e `project-p5r-frontend` con tag `latest` e `sha`.
- Immagini del rilascio (`docker-publish-rilascio.yml`): solo con un tag `rilascio-vX.Y.Z` raggiungibile da `main`, dopo lo stesso gate; immagini distinte (`project-p5r-rilascio-backend`, `project-p5r-rilascio-frontend`) con la versione fissa, mai `latest`, e nessun aggiornamento automatico.
- Il backend in Docker gira come `node --import tsx server/index.ts` nella preparazione e `node --import tsx server/rilascio.ts` nello
  stage `rilascio` (PID 1 = node, riceve SIGTERM da `docker stop`).

## 9. Regole per chi scrive codice
**Server**
- **Cache dei dati di gioco in un registro unico** (`server/services/cacheDiGioco.ts`): ogni modulo che tiene in memoria letture di
  `gioco.db` registra la propria invalidazione con `registraCacheDiGioco`; chi sostituisce o ricarica il DB chiama solo
  `invalidaCacheDiGioco()`; dopo ogni scrittura HTTP riuscita sulle aree che toccano i dati di gioco lo fa il middleware
  `cacheDiGiocoDopoScritture`, per tutte le cache registrate (indice della ricerca compreso). Mai in cache i dati delle partite. Ci stanno, fra gli altri, i nomi, i quiz e gli oggetti di libri, film
  e videogiochi letti dal giorno del Diario (`giornataService.ts`) e il modello di avanzamento delle voci dei Palazzi
  (`mappe/statiGuida.ts`). Il modello porta in più un gettone (`data_version`, `schema_version`, `total_changes()`), perché deve vedere
  anche le migrazioni e le scritture fuori dall'API: qualunque scrittura lo fa ricostruire. Lo stesso vale per `db/schemaMemo.ts`
  (`schema_version`); i nomi delle condizioni si rileggono comunque dopo un secondo. L'invalidazione è una sola, il resto convalida. Dentro una transazione nessuna delle due cache si
  usa né si riempie.
- **Una voce, non la giornata**: le scritture del Diario restituiscono la voce calcolata da sola (`voceDelGiorno`), con lo stesso
  contesto del giorno intero, e quindi lo stesso DTO; lo spostamento di una voce restituisce ancora la giornata.
- **Controlli di schema ricordati** (`server/db/schemaMemo.ts`): «c'è la tabella/colonna?» si ricorda per connessione fino al cambio
  di `schema_version`, mai dentro una transazione. Il DTO dei pin legge destinazioni e nomi d'arrivo in blocco per tutta la mappa.
- **Manifest delle immagini**: ETag sul solo contenuto stabile (`totale` e `file`, non `generato`) e `Cache-Control: private,
  no-cache`, così una lettura a dati fermi risponde 304.
- **Una sostituzione dei file alla volta** (`lucchettoIstanza.ts`, `occupaIstanza`): importazione, ripristino ed edizione la
  prendono; la seconda richiesta riceve 409. Un file più nuovo del codice si rifiuta.
- **Scrittura atomica dei database** (`installaDatabase` in `impostazioniService.ts`): il file preparato si sposta sopra il vivo
  (`fsync`, `rename`; fra dischi diversi copia accanto e poi `rename`). ZIP a flusso in `server/utils/zip.ts`, su file in
  `data/tmp`, mai su buffer da centinaia di MB.
- **Copie di avvio**: la rotazione toglie anche i giornali `-wal`/`-shm`; quelli rimasti senza database si tolgono a ogni avvio
  (`pulisciGiornaliOrfani`).
- **Voci della guida gestite: una regola sola** (`VOCI_GESTITE_SQL` in `services/mappe/voceDelPin.ts`): uno stato su una voce
  descrittiva non segna i pin. Chi è descrittiva lo dice solo `puntoDescrittivo(tipo, areaDedalo, carattere)` / `sqlVoceDescrittiva`
  (`shared/spilli.ts`), usati da server (modello `statiGuida`, scheda, visore, collegamenti, condizioni) e interfaccia (`GuidaDellArea`,
  `GuidaNelVisore`, `VisoreMappa`, `completamentoAree`): «Altro» fuori dai dedali senza il carattere `permanente` o `rigenerabile`
  (`CARATTERI_CON_STATO` in `shared/caratteriVoce.ts`).
- **Immagini che appartengono a qualcosa se ne vanno con lui**, nella stessa transazione (le schermate dei pin con il pin, la mappa,
  l'area); l'immagine di base di una mappa si toglie solo se è soltanto sua. Un luogo o un negozio eliminato stacca i pin e le mappe
  che lo citavano (`staccaDalleMappe`).
- **Chiavi delle mappe**: mai un segmento letterale delle rotte di `/api/mappe` (`CHIAVI_MAPPA_RISERVATE`).
- **Strutture comuni** da riusare invece di riscriverle: `server/schemas/comuni.ts` (`idParam`, `boolQuery`, `dataGioco`…),
  `server/services/verificaPartita.ts` (il 404 della partita), `server/services/datiGuida.ts` (blocchi di `dati_guida` congelati in
  cache), `server/services/mappe/alberoMappe.ts` (sottoalbero e Palazzo di una mappa); caricamenti in blocco al posto di una query
  per riga.
- Il livello del protagonista ha una sola fonte: `partita.livello_protagonista`.

**Frontend**
- Client HTTP: tentativi solo sulle letture (§4); gli invii di file passano da `inviaFile` (`src/services/api/_helpers.ts`),
  che trasforma un rifiuto del proxy in HTML in un `ApiError` leggibile.
- `useCarica`: un aggiornamento locale dopo un `await` usa la forma con funzione (`imposta(d => …)`), mai i dati del render.
- Store con richieste che si sovrappongono (`partitaStore`, `suggerimentiStore`): vale solo la risposta dell'ultima richiesta.
- Progressi a pressioni rapide (libri, film, videogiochi): `useCodaProgresso`, una richiesta per volta per elemento.
- Accessibilità comune: `SchedeTab` (file di schede con tabindex mobile, frecce, Home e Fine, sopra `useSchede`); `SegnoStato` e le classi
  `.stato-fatto` / `.stato-esaurito` (segno e barratura degli stati chiusi, mai l'opacità); `utils/movimento.ts`
  (`comportamentoScorrimento()`: 'auto' con «riduci movimento»); `useFreccePerElenco` (frecce negli elenchi dei selettori di Persona e
  skill); `accent-color` del tema sulla radice. I colori degli elementi stanno in un blocco `@theme static` di `tailwind.css`, perché il
  codice li compone (`var(--color-el-${…})`) e Tailwind toglierebbe le variabili che nessuna regola nomina per intero; per il testo dei
  chip ci sono le tinte `--color-el-*-testo` (`coloreTestoElemento`). Bersagli da 44 px senza cambiare l'aspetto: `.spillo-mappa` ha
  un'imbottitura trasparente `6px 3px 0` attorno alla goccia da 38 (punta ancorata), `.spillo-mappa--gruppo` 5 px per lato; `.fila-freccia`
  col mouse è un riquadro da 32 con un `::after` da 44 che riceve il clic, sul tocco è da 44.
- Letture condivise (`src/services/api/letturaCondivisa.ts`, `useLetturaCondivisa`): l'elenco «Da applicare» e le Doti sono una
  lettura per partita, comune a tutte le istanze montate di `DaApplicare` e a `DaApprovareStati`. Si rileggono quando cambia la
  versione delle mutazioni, dopo ogni scrittura (`segnalaScritturaCondivisa`, nel `finally` di `requestJson` e `inviaFile`), con
  `ricarica()`, dopo un errore, e quando non resta montata nessuna istanza.
- Avvio e rilasci: `index.html` precarica `/api/config` (non i caratteri: a freddo con rete lenta ritardavano il JavaScript). React,
  React Router, zustand e zod stanno in un file proprio (`vendor`, `codeSplitting.groups` di Rolldown in `vite.config.ts`), che un
  rilascio non fa riscaricare finché nessuna di loro cambia versione. Le dodici schede della Partita diverse da «Oggi» sono pagine
  pigre (`schedePartita.ts`; il cassetto del Confidente del Diario usa la stessa), fuori dal caricamento iniziale, precaricate al
  passaggio sulla piastrella e nel tempo morto; il cambio di scheda è una transizione, quindi resta a schermo la scheda di prima
  finché la nuova è pronta.
- Installazione come web app: `src/utils/installazioneApp.ts` ascolta `beforeinstallprompt` da subito (`main.tsx`, prima della lettura
  della configurazione: l'evento arriva una volta) e lo tiene per l'invito; `components/layout/InvitoInstallazione.tsx`, montato dalla
  Home, si apre una volta per dispositivo (`localStorage` `p5r-invito-installazione`), solo con `(pointer: coarse)` e fuori dall'app
  installata (`display-mode` `standalone` o `fullscreen`, `navigator.standalone` di iOS). L'evento può andare perso se il browser lo lancia
  prima che il bundle sia eseguito: allora l'invito indica la voce del menu.
- Ricerche nelle liste: il filtro usa `useDeferredValue` (Compendio personale, Glossario, Abiti); quella delle Traduzioni, che
  interroga il server, parte 300 ms dopo l'ultimo tasto.
- Filtri nell'indirizzo (L10-04): Compendio, Skill (`?q=&elemento=`), Glossario (`?q=&categoria=`; `elemento` resta della ricerca
  globale), Domande (`?q=&tipo=&stato=`) e Cruciverba (`?q=&stato=`) leggono i filtri dall'indirizzo; le ultime quattro con
  `useFiltriIndirizzo` (valore predefinito = parametro tolto, valori non ammessi = predefinito, più filtri in un aggiornamento solo). La
  ricerca sostituisce la voce della cronologia, un filtro scelto con un tocco ne aggiunge una (Indietro torna al filtro di prima).
- Compendio (L10-04): `PiastrellaPersona` è orizzontale (arte da 64 con il cartiglio del livello, nome, arcano, badge, segni,
  affinità `AffinitaGriglia piastrella` su una fila di dieci o due di cinque secondo la larghezza della piastrella, contenitore
  `.piastrella-persona`); sotto i 640 px resta la riga del telefono, la vista «Elenco» non cambia. I segni della partita («In scorta ·
  Liv. N», «Nel Registro · Liv. N», `SegniPartita`) vengono da `useSegniPersonaPartita` (scorta e compendio personale della partita
  attiva, una lettura per pagina) e stanno anche nella testa della scheda Persona; il nome del collegamento della piastrella li dice.
- Impostazioni (L10-08): `IndiceSezioni` in testa, una `FilaScorrevole` di collegamenti `#sezione` alle sezioni presenti nella pagina
  (la pagina dà le candidate con l'id della loro radice, l'indice tiene quelle che trova; nel rilascio le candidate sono quattro); da
  768 px resta ferma in cima (`.indice-sezioni`, `position: sticky`) e accende la sezione corrente leggendo lo scorrimento del `main`.
- Memento al telefono (L10-10): sotto i 768 px `AreeDelDedalo` mostra i nove dedali in una griglia 3×3 (`.griglia-dedali__voce`) con
  il pozzo come sfondo (`MappaMemento decorativo`: niente pulsanti, `aria-hidden`, non toccabile); il pozzo grande resta nella finestra
  del tablet e nel binario da 1024 px.
- Rimandi a un elemento di un elenco: `?elemento=<chiave>` (`indirizzoElemento`, `src/utils/pannelloScheda.ts`). Attività e Richieste
  mostrano quel solo elemento, come pagina e nel pannello sopra il diario; libri e film solo nel pannello (come pagina restano l'elenco, e
  le voci del Diario rimandano lì); le altre pagine (domande ed esami, sfide e boss, tratti, Covo, ricette, glossario,
  cruciverba, personaggi, trofei) lo portano in vista ed evidenziato con `useElementoDaIndirizzo`, su `id="elemento-<chiave>"`; un
  elemento più alto di metà schermo si allinea in cima invece di centrarsi. Le domande accettano anche `?data=MM-GG` (la prima da quella
  data in poi, nell'ordine dell'anno scolastico). Le case che il server dà alle ricompense degli oggetti seguono la stessa forma
  (`conElemento`, `fontiRicompenseOggetti.ts`); la pagina di un'Ombra è `casaOmbra` (`shared/ombre.ts`), letta dalla scheda Persona,
  dalla ricerca e dal servizio delle Ombre, che dà anche la casa delle voci della guida che la descrivono.
- Elenchi modificabili (righe che si tolgono, si aggiungono o si spostano): chiavi da `useIdStabili` (`togli`, anche di più righe,
  `aggiungi` in fondo, `sposta` di un posto), mai l'indice né il contenuto; l'indice resta solo negli elenchi che non cambiano forma.
- Memoria del dispositivo: le comodità ricordate in `localStorage` (preferenze, sezioni aperte, filtri, posto e stato della finestra degli
  appunti fissi, invito all'installazione) passano tutte da `utils/memoriaDispositivo.ts` (`leggiMemoria`, `leggiMemoriaJson`,
  `scriviMemoria`, `scriviMemoriaJson`, protetti: senza memoria la pagina funziona con i valori predefiniti); la memoria della scheda del
  browser (`sessionStorage`) resta nei moduli che la usano, ognuno con la sua regola.
- Le pagine grandi sono divise per responsabilità. Scheda del Palazzo e dei Memento (`DungeonDettaglioPage`): la disposizione e lo stato
  dell'indirizzo nella pagina, gli indirizzi in `useNavigazionePalazzo`, i gesti di stato nella partita (con le riletture in silenzio e
  `versioneStati`) in `useStatiPalazzo`, i moduli di modifica (finestre `FinestraModifica` aperte da `CorrezioneGuida`) in `CorrezioneSchedaPalazzo`, `ModuloBossFinale`, `ModuloInfiltrazione` e
  `MenuModificaPalazzo`, e `LineaDelTempo`, `DedaloNelBinario`, `InfiltrazioniInArea` (components/guida). Visore (`VisoreMappa`): vista,
  gesti, spilli e popup nel visore; che cosa dicono la scheda e il popup di uno spillo in `SchedaSpillo` (con `MerceNelPopup`,
  `AzioniStato`, `GalleriaSpillo`), i nomi e le parole dei pin in `utils/paroleSpillo.ts`, la posa dei nomi dei passaggi in
  `etichetteSpilli.ts`. Giorno del Diario (`GiornoGuida`): le fasce, i gesti sulle voci e gli appunti; la riga d'azione con la sua spunta
  in `AzioneGiornata`, la selezione col mouse in `useSelezioneAlClic`.
- Il fuoco rimesso da codice si ritrova da una chiave, mai dal testo o dal nome accessibile: i gesti dal loro `data-gesto` (menu della
  voce del Diario, «Su»/«Giù» del posto della voce, «Sposta su/giù» degli appunti fissi con `data-appunto`, delle abilità e delle scelte
  dei dialoghi dei Confidenti con `data-riga`, l'id stabile della riga: dopo lo spostamento il fuoco resta sul gesto o, al bordo,
  passa all'opposto, `utils/fuocoGesto.ts`), la guida del visore da `data-guida-visore`. Cambiando pagina (`useFuocoNavigazione`) un
  elemento ricreato si ritrova dalla sua chiave `data-fuoco` (le frecce dei giorni del Diario); solo un elemento senza chiave si ritrova
  ancora dal nome accessibile, perché il meccanismo vale per qualunque elemento della pagina.
- Finestre (`Modal`): il fuoco entra nella finestra, Tab resta dentro, alla chiusura torna a chi l'ha aperta; nessuna chiusura dallo
  sfondo. Lo spostamento (barra trascinata, frecce sulla maniglia ⠿, sempre per intero nello schermo) è `useSpostamentoFinestra`, lo
  stesso della guida del visore.
- Accessibilità: un `div`/`span` con `aria-label` ha sempre un `role` (lo controlla `src/accessibilita.test.ts`).
- Runtime (`docker-compose.yml`): nessuna porta pubblicata; FE nginx sulla rete esterna `PROXY_NETWORK`, BE solo su rete interna (3101, proxato da nginx su `/api/`), volume `project_p5r_data` su `/data` (DB creato al primo boot dal pacchetto iniziale nell'immagine). La cartella d'appoggio è un volume NFS: lo stack deve definire `NAS_ADDR` e `NAS_PATH`, senza valori predefiniti. I container della preparazione portano la label di Watchtower per l'aggiornamento automatico; quelli del rilascio no. Ogni servizio ha `mem_limit` e `pids_limit` (§7 ter).
- `nginx.conf`: il backend si risolve per nome a ogni richiesta (`resolver 127.0.0.11`, variabile `$backend`), così un container ricreato non lascia nginx sul vecchio indirizzo; `/api/mappe/importa` ha un limite proprio (`client_max_body_size 512m` contro i 10M del resto dell'API; Express lo ferma a 512 MB); `immutable` solo sui file con hash di `/assets/`, gli altri statici si rivalidano.
