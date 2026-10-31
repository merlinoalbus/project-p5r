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
| Qualità | ESLint 10 flat config, `tsc -b` su 4 progetti (app / node / server / test) |
| Deploy | Immagini `node:24.22.1-alpine` (backend) e `nginx:1.30-alpine` (frontend); GitHub Actions su Node 24 |

## 3. Struttura del repository
```
server/
  index.ts            boot: assicuraPacchettoIniziale → initDb (gioco.db + partite.db attaccato come «utente») → runBootBackup → runMigrations (due sequenze) → regoleAllAvvio → listen; SIGINT/SIGTERM → server.close + closeDb
  bootstrap.ts        factory Express: middleware in ordine, router di area (`routes/index.ts`, `ROUTER_DI_AREA`), health/config, documentazione (`/api/openapi.json`, `/api/docs`), 404, errorHandler
  config.ts           unica lettura delle env (BE_PORT/PORT, DATA_DIR, PACCHETTO_DIR, LOG_LEVEL)
  middleware/         requestContext (requestId + logger), responseShape ({data}), validate (zod; gli schemi restano leggibili con `schemiDiValidazione`), errorHandler
  openapi/            documentazione dell'API: rotte.ts (rotte lette dalla pila dei router), documento.ts (OpenAPI 3.1 dagli schemi zod), descrizioni/ (registro in italiano, un file per area), pagina.ts (Swagger UI da `swagger-ui-dist`), openapi.test.ts (copertura e validità)
  db/                 dbService (gioco.db + ATTACH partite.db, pragma, cache statement, copiaSchema), migrationRunner (user_version per file), backupService (7 copie di avvio di entrambi i file), schemaUtente.ts (DDL di base delle tabelle delle partite; le successive vengono dalle migrazioni utente), colonne.ts (haTabella/haColonna/aggiungiColonna per le migrazioni), fontiTolte.ts (registro delle strutture eliminate, §5 ter), acquistiLegacy.ts e conversioneEffettiAzione.ts (conversioni dei dati di prima), dati/
  db/migrations/      dati di gioco: 001 … 333 (registro in index.ts, append-only; `index.test.ts` pretende id consecutivi); i manifesti e i dati congelati delle migrazioni stanno accanto ai file (`*Manifest.ts`, `*.json`, `dati/`)
  db/migrazioniUtente/ partite: 001 … 063 (registro in index.ts, sequenza separata, `PRAGMA utente.user_version`)
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
   (`payloadDellaBusta`) legge la chiave `data`, non il suo valore: `{ data: null }` vale `null`.
3. `express.json({ limit: '5mb' })` (64 MB solo per `POST /api/mappe/importa`). **Niente CORS** (DECISIONI 2026-10-03): il
   frontend è sulla stessa origine (proxy Vite in sviluppo, nginx in produzione) e l'API non ha autenticazione, quindi un'altra
   origine non deve poterla chiamare dal browser dell'utente.
4. Router di area (`ROUTER_DI_AREA` in `server/routes/index.ts`, 20 montaggi: elenco in §3) con `validate({ params, query, body })` zod
   prima dell'handler (Express 5: `req.query` è un getter, quindi il middleware fa shadowing sull'istanza).
5. `/api/health` (stato DB + `user_version`; **503** se il DB non risponde, perché l'HEALTHCHECK di Docker guarda solo il codice),
   `/api/config` (valori pubblici per il boot FE), `/api/openapi.json` e `/api/docs` (documentazione, §5 bis).
6. 404 JSON per `/api/*` sconosciute; `errorHandler` ultimo: `HttpError` → status+codice; errori 4xx di Express/body-parser (JSON malformato 400, corpo oltre il limite 413, percorso non decodificabile 400) e di `sendFile`/`download` (404 `not-found`, 403, 416) → envelope in italiano, con le intestazioni di una risposta JSON anche se la rotta stava per mandare un file; altro → 500 `internal-error` con un **messaggio fisso** (il dettaglio resta nel log, col `requestId`).
7. Client (`src/services/api/_httpClient.ts`): timeout e tentativi sui 5xx e sugli errori di rete **solo per i metodi
   idempotenti**; POST e PATCH non si ripetono (una scrittura già avvenuta verrebbe raddoppiata), salvo `maxRetries` esplicito.
   Anche un PUT **relativo** non si ripete, con `{ maxRetries: 0 }` nella sua funzione: lo spostamento di una voce della giornata
   (`spostaVoceGiornata`) o di un punto (`spostaPunto`) di un posto e i punti di un Confidente (`aggiornaConfidente`, che li somma)
   ripetuti dopo una risposta persa sposterebbero o sommerebbero due volte.

## 5. Persistenza
- **Due file, una connessione**: `DATA_DIR/gioco.db` è `main` (compendio, guida, catalogo, mappe, immagini) e `DATA_DIR/partite.db` è attaccato come schema `utente` (le tabelle delle partite: DDL di base in `server/db/schemaUtente.ts`, le successive nelle migrazioni utente). Le query restano senza prefisso (SQLite risolve il nome cercando in `main` e poi in `utente`); solo migrazioni e backup nominano lo schema. I vincoli fra i due file non sono applicati da SQLite: i riferimenti utente→gioco usano chiavi stabili (`spillo.uid`, migrazione 067: impronta SHA-256 dell'identità dello spillo — mappa, tipo, nome, posizione, riferimento — così un'istanza migrata in proprio e il pacchetto danno lo stesso uid allo stesso spillo; `spillo_partita.spillo_uid`). Chi elimina uno spillo pulisce anche i suoi «raccolto». Al primo avvio senza `gioco.db` il file arriva dal pacchetto (`pacchetto/gioco.db`).
- Connessione better-sqlite3, pragma `journal_mode=WAL` (su entrambi i file), `synchronous=NORMAL`, `busy_timeout=5000`, `foreign_keys=ON`.
- Migrazioni versionate su `PRAGMA main.user_version` e `PRAGMA utente.user_version` (due sequenze append-only, `server/db/migrations/index.test.ts` pretende id consecutivi), ogni migrazione in una transazione, con `foreign_key_check` **dentro** la transazione prima di avanzare `user_version`. Il controllo si fa prima e dopo `up`: solo le violazioni **nuove**, introdotte da quella migrazione, la annullano (resta da applicare); quelle già presenti nel file si scrivono nel log come avviso e non bloccano l'avvio, che altrimenti si fermerebbe per sempre su un dato vecchio che nessuna migrazione tocca.
- `prepared(sql)` tiene in cache uno statement per testo SQL, condiviso da tutto il server: chi lo prende lo rimette ogni volta in modalità normale (`pluck(false)`, `raw(false)`, `expand(false)` sugli statement di lettura), perché un `.pluck()` fatto da un chiamante cambiava lo statement anche per tutti gli altri.
- Backup online (`copiaSchema`) di entrambi i file prima delle migrazioni a ogni boot, rotazione a 7 coppie in `data/backups/`; la copia dell'istanza (Impostazioni) porta `database/gioco.db` e `database/partite.db`.
- Due famiglie di dati (333 migrazioni di gioco e 63 delle partite):
  - **dati di gioco** in `main` (`arcana`, `persona` + `persona_affinita` + `persona_skill`, `skill`, `oggetto`, tabelle di fusione, `confidente` + `confidente_rango`, `dote_sociale` + `dote_sociale_rango`, `traduzione` con `fonte` `seed` o `utente`, e tutto il mondo e la guida di §5 ter). Le immagini stanno nella tabella `immagine` di `gioco.db` (079);
  - **dati utente** in `utente` (`partita` con indice parziale «una sola attiva» e le impostazioni dei contenuti, `dlc_posseduti_json` — i set di `dlc_set` posseduti, letti dalla Fusione e dalla condizione `dlc-posseduto` — e `salvataggio_p5` (utente 061), scritte dalla finestra «Modifica» della partita, `RiepilogoPartita`, con `PUT /partite/:id`, `compendio_partita`, `persona_posseduta` + `persona_posseduta_skill`, `confidente_partita`, `dote_sociale_partita` e le tabelle delle migrazioni utente: inviti, acquisti e proposte, pesca, Fortuna, piazzamento agli esami, punti cronologici…), sempre con `partita_id` e ON DELETE CASCADE.
- Statistiche per livello: `shared/statistiche.ts` — +3 punti per livello ripartiti in proporzione alle statistiche base; il BE espone per ogni Persona posseduta `statistiche` (registrate dall'utente oppure stimate al livello) e `statisticheBaseLivello`.
- Testi canonici (nomi Persona/skill, chiavi arcana/elementi, effetti, descrizioni) restano in inglese Royal nelle tabelle di gioco; la resa italiana si legge da `traduzione(ambito, chiave)`; i DTO espongono `nomeIt` per skill e Persona (fallback al canonico) e per l'equipaggiamento (`null` se la guida non lo nomina); la ricerca del compendio confronta nome canonico e nome italiano senza accenti né punteggiatura (`shared/testo.ts`).

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
| Pin | `spillo` (027), con `uid` = impronta dell'identità (067, `mappe/identitaSpillo.ts`) | `mappeService.ts`; legami alle voci in `spillo_voce` (098) |
| Palazzo | `dungeon` (013), le infiltrazioni in `dungeon_area`; le Aree del Palazzo sono righe di `area` con `dungeon_chiave` (110); legame infiltrazione↔Area in `infiltrazione_area` (110) | `palazziService.ts`, `mappe/legamiInfiltrazioni.ts`; pagina `DungeonDettaglioPage`; la voce del boss finale `dungeon.voce_boss_finale` (112) si sceglie da «Modifica ⋯ › Boss finale» (`PUT /api/compendio/dungeon/:chiave`, «Ripristina» `POST …/ripristina`), e senza voce la scheda di preparazione mostra il segno «Boss finale da dichiarare» (`bossFinaleDaDichiarare`) che apre lo stesso modulo |
| Memento e dedalo | `area_dedalo` (099); Iweleth esiste come dedalo: `dedalo_confluenza` e `infiltrazione_dedalo` (175); condizione d'apertura del Dedalo `dungeon_area.condizioni_json` (305: Palazzo concluso o data della guida) | `dungeonService.ts`; aperture dei Dedali calcolate in `condizioni/valutatore.ts` (`esitoAperturaDedalo`, letta da `condizioneEffettiva.condizioneAperturaDedalo`), mai dichiarate nelle visite; ramo dell'albero in `mappe/gerarchiaMappe.ts` |
| Luogo | `luogo` (015): `area_chiave`, `orari_json`, `solo_eventi_confidente` (115); gli orari scritti come frase sono tolti (184, 193) | `luoghiService.ts` (`presenzaDelLuogo` è la sola regola di presenza), `luoghiScritture.ts`; pagina `LuogoPage` |
| Negozio e offerta | `negozio` e `articolo` (017); la sede è `negozio.sede_chiave` e `attivita.sede_chiave` (072); condizioni in `condizioni_json`; listini condivisi (121) | `negoziService.ts`, `listiniCondivisi.ts` |
| Oggetto | `catalogo_oggetto` (121), unica identità; nota storica in `nota_storica` + `nota_storica_legame` (139) | `catalogoOggettiService.ts`, `catalogoOggettiScritture.ts`, `noteStoricheService.ts`; rotte `/api/catalogo-oggetti` |
| Confidente | `confidente` + `confidente_rango` (con `modo` e `fonte`, 161); requisiti in `confidente_requisito` (copia della guida in `confidente_requisito_guida`, 119); disponibilità strutturata in `confidente_disponibilita` (163); inviti in `confidente_invito` (118); dalla 324-325 `confidente.romanzabile` (scelta romantica nel dialogo del rango 9) e l'eccezione di disponibilità `con-relazione` (le fasce con la relazione romantica, al posto delle generali e di quelle del rango: Takemi solo di sera); la relazione della partita in `utente.confidente_partita.relazione_romantica` (utente 059), letta e scritta solo da `relazioneRomanticaService.ts` (scheda, semafori, Diario con la mappa dei Confidenti della partita; vale per gli incontri dopo il rango 9, `relazioneAlRango`), segnata dalla scheda (`PUT /partite/:id/confidenti/:chiave` `relazioneRomantica`) o dalla scelta alla spunta del passaggio al rango 9 (`relazioneRomantica` del corpo di `PUT /partite/:id/percorso`, ricevuta `relazione: {confidente, nome, prima, dopo}`, annullo solo se vale ancora `dopo`) | `compendioService.ts`, `requisitiConfidentiService.ts`, `disponibilitaStrutturataService.ts`, `confidentiScritture.ts`, `relazioneRomanticaService.ts` |
| Giorno | `giorno` (168): meteo in due fasce, tempo libero, settimana, trama, fase, vincoli; il giorno della settimana si calcola dalla data | `giorniService.ts`, `calendarioService.ts`, `giornoPartitaService.ts`; `shared/giorno.ts`, `shared/date.ts` |
| Evento del calendario | `evento_calendario` (012) collegato per chiave alle voci del Diario in `evento_calendario_voce` (164) | `calendarioService.ts` (`eventiDellaVoce`) |
| Voce del Diario | `voce_giornata` (092): `uid`, `data`, `fascia`, `ordine`, `genere`, azione; dalla 320 `condizioni_json` («Si fa solo se», NULL = sempre: valutata allo stato della partita al giorno della voce da `voceDovuta.ts`; falsa → «Non dovuta», 409 `voce-non-dovuta` alla spunta, vale come fatta per l'avanzamento) | `giornataService.ts` (scrittura), `percorsoService.ts` (lettura), `motoreDiario.ts` (effetti) |
| Persona (anche del gruppo) | `persona` (con `del_party`, `personaggio`, `forma`, `chiave_forma`: 169, 170) | `compendioService.ts`, `personeDelGruppo.ts` |
| Ombra | `ombra`, `ombra_luogo`, `ombra_voce` (166) | `ombreService.ts`, `negoziazioneService.ts`; `shared/ombre.ts`, `shared/negoziazione.ts` |
| Esame e domanda | `esame`, `esame_premi`, `domanda` (011); il piazzamento della partita in `utente.esame_piazzamento_partita` (utente 040) | `domandeService.ts`, `piazzamentoEsamiService.ts` |
| Regola di pesca | `regola_pesca` (138); le visite della partita in `utente.pesca_*` (utente 029) | `regolePescaService.ts`, `pescaService.ts`, `profiliPescaService.ts` |
| Correzione ai blocchi della guida | `correzione_dati_guida` (178); le righe correggibili tengono `origine`, `seed_json`, `updated_at` | `ripristinoService.ts` con il registro in `ripristino/registro.ts` e `ripristino/righe.ts`; rotte `/api/correzioni` |

Regola trasversale: un dato ha **un** punto di modifica, letto da tutte le viste (nessuna copia a frase); le condizioni di
disponibilità e visibilità sono sempre il vocabolario unico (sotto). Il dato di gioco vale per tutte le partite; quello di una
partita sta in `utente` con `partita_id`.

### Gerarchia del mondo e «casa»
- Tre alberi, costruiti in una lettura sola da `mappe/gerarchiaMappe.ts` (`GET /api/mappe/gerarchia`): **Città › Quartiere › Area › Planimetrie**, **Città › Palazzo › Area › Planimetrie** (con le infiltrazioni accanto, `infiltrazione_area`) e **Memento › Dedalo › Area** (le aree del dedalo non hanno planimetrie). Iweleth sta una volta sola, come dedalo; le Aree e le planimetrie del suo vecchio Palazzo sono l'«Archivio del Palazzo» dentro il dedalo.
- Ogni nodo porta la sua **casa**, l'indirizzo dell'unica pagina che lo mostra, calcolata dal server (`mappe/casaMappa.ts`: `casaDellaMappa`, `casaDellArea`, `casaDelPalazzo`, `casaDelDedalo`, `casaDeiMemento`) e trasportata nei DTO: il client non la ricostruisce. Le mappe dei Memento senza Area (l'entrata `citta-mementos` e ogni figlia della radice `dungeon-mementos` senza Area: la regola è strutturale, mai il nome) sono foglie del nodo Memento, con il visore come casa: oggi resta solo l'entrata (gli otto fogli delle «aree fisse» dei Memento sono stati tolti dalla migrazione 322 e stanno nel Cestino). L'atterraggio dalla mappa di Tokyo (`atterraggioDelPalazzo`) segue la regola del Diario per tipo (`destinazioneDellaVoce`): un Palazzo la sua destinazione unica, i Memento solo una regola d'atterraggio o uno spillo d'ingresso veri, altrimenti nessuno e si apre la scheda dei Memento.
- L'indice `/guida/mappe` mostra quell'albero (`IndiceLuoghi` → `AlberoGerarchia`); `GET /api/aree/da-collocare` elenca le planimetrie senza posto, che si assegnano con `PUT /api/aree/colloca`.

### Mappe: spilli, visore ed editor
- **Registro dei tipi di spillo** (`shared/spilli.ts`, condiviso da server e frontend): 41 tipi (`TIPI_SPILLO`) in quattro categorie
  (`CATEGORIE_SPILLO`: spostamento, città, consumabile, informativo), che sono anche i gruppi della tavolozza dell'editor. La categoria
  decide cosa chiede uno spillo oltre a nome, tipo e descrizione: lo spostamento porta a un'altra mappa (e, se indicato, a uno spillo
  di quella mappa); il tipo di città mostra cosa offre adesso; il consumabile si segna (raccolto, aperto, sconfitto, parlato…) per
  partita; l'informativo è solo un segno. I tipi della città seguono le etichette della mappa del gioco («Bevande», «Sigarette»,
  «Cercalavoro»…). L'icona è l'asset `ui/spillo-<tipo>` con riserva SVG in codice (`IconaSpillo`); i colori sono quelli del registro.
- **Posizioni** in percentuale dell'immagine, valide a ogni zoom e schermo; cambiare l'immagine di base mantiene gli spilli.
- **Visore** (`VisoreMappa`): zoom da «adatta» (calcolato dall'area visibile) fino a 8 volte, con rotellina, pulsanti, pinch e
  doppio clic per tornare ad «adatta»; spilli a dimensione costante, raggruppati quando si sovrappongono, legenda con filtri per tipo e
  ricerca. Un tocco apre il popup ancorato allo spillo, che diventa un foglio dal basso quando non c'è spazio (sempre sotto i 768 px).
  I raccolti sono nascosti salvo «Mostra anche i raccolti». Le condizioni di visibilità sono assolute: con una partita attiva uno
  spillo con una condizione falsa sparisce (salvo «Mostra anche i non ancora disponibili»). In uso normale nessun tocco sulla mappa
  modifica dati.
- **Guida del visore** (`GuidaNelVisore`, pulsante «Guida» della barra): l'unica guida di ogni visore, a schermo intero (`MappaPage`) e
  incorporato (`MappaIncorporata`), su ogni mappa che può avere voci della guida (una planimetria di un Palazzo, o una mappa con un pin
  collegato a una voce). Legge `GET /api/mappe/:chiave/guida` (le voci della planimetria per infiltrazione, con lo stato della partita) e
  segna con `PUT /api/partite/:id/punti` come la scheda del Palazzo: casella ottenuto/riapri, dettagli e pin centrabili nella voce
  aperta, voci fatte nascoste salvo «Anche le fatte», le Persona da catturare come piastrelle; finestra spostabile da 768 px, foglio dal
  basso sotto. Con la scheda del Palazzo (`GuidaDellArea`, `DungeonDettaglioPage`) condivide:
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
  dei contenuti (`ContenutiGuidaMappa`, `GET /api/mappe/contenuti/:chiave`) non è montata da nessuna pagina: restano il componente e la
  rotta, usati solo dai loro test. Una sezione chiesta alla radice di un Palazzo o dei Memento (`?area=`) si apre nella sua scheda, che
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
| `/confidenti` | `/guida/personaggi` | `src/router.tsx` |
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
- **Miniature delle carte dei Luoghi**: ambito di caricamento `dungeon` (`shared/immagini.ts`, `AMBITO_MINIATURA_LUOGO`), chiave = `dungeon.chiave` di un Palazzo, `dungeon_area.chiave` di un Dedalo dei Memento (le righe di `dungeon_area` del dungeon di tipo `mementos`) o `area_dedalo.chiave` di un'area di un Dedalo; la rotta unica `PUT/DELETE /api/immagini/dungeon/:chiave` verifica l'entità (`verificaEntitaDellImmagine`: 404 `luogo-non-trovato`, 400 `luogo-senza-miniatura` per la radice dei Memento e le infiltrazioni dei Palazzi). `gerarchiaMappe` legge le caricate una volta (`immaginiCaricateDi`, `urlCaricataDi`) e i nodi `palazzo`, `dedalo` e `area-dedalo` portano `immagine` (URL versionato, o null) e `miniatura` (dove caricarla); il riscaldamento delle miniature le prepara come quelle delle schede. Client: `GrigliaLuoghi` mostra la caricata in 16:9 con `srcset` (senza: l'emblema del Palazzo o la lettera del Dedalo, nessuna immagine per l'area del Dedalo); il comando «Miniatura» apre `FinestraCaricaImmagine` (file, Ctrl+V, «Incolla dagli appunti» con `navigator.clipboard.read`, anteprima, Salva/Rimuovi/Annulla), che dopo un cambio allinea `immaginiCache` e fa rileggere la gerarchia (`RicaricaLuoghi`). Finestra e comando sono fuori dal rilascio (costante di build); la lettura del file sì (`GET /api/immagini/:ambito/:chiave/file` è nell'elenco del giocatore).
- **Pezzi**: `mappe/pezziMappa.ts` (`confermaPezzi`, 409 `mappa-con-pezzi`).

### Vocabolario unico
- **Condizioni** (`shared/condizioniSpillo.ts`): il tipo `RequisitoSpillo` (alias `Condizione`) è un'unione discriminata per `tipo` (per esempio `data`, `intervallo`, `fascia`, `meteo`, `giorno-settimana`, `quartiere`, `invito`, `palazzo`, `dote`, `confidente`, `richiesta`, `lettura`, `articolo`, `attivita`, `evento`, `contatore`, `pesca-sessione`, `persona-arcano`, `spillo`, `voce-guida`, `salvataggio-p5`, `dlc-posseduto`, più `gruppo` e `non` per le combinazioni). `salvataggio-p5` e `dlc-posseduto` (`set` = `dlc_set.id`) leggono le impostazioni della partita da `semaforiService.contenutiDellaPartita` (`StatoPartitaSemafori.contenutiPartita`); i nomi dei set vengono da `setDlcService.setDlcConPersone` (il nome di un set sono le sue Persona, servito anche da `GET /api/compendio/set-dlc` e da `GET /api/condizioni/elenchi` → `setDlc`). Un'unica funzione le descrive in italiano (`descriviRequisitoSpillo`) e un unico valutatore le valuta sul server (`server/services/condizioni/valutatore.ts`, `POST /api/condizioni/valuta`, esiti `vero`, `falso`, `avviso`, `grigio`); `condizioneEffettiva.ts`, `nomiCondizioni.ts`, `finestrePalazzi.ts` e `importazione.ts` stanno nella stessa cartella. Gli eventi di storia (`EVENTI_STORIA`) sono la fonte delle aperture dei dedali.
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
- **Letture:**
  - `shared/riepilogoEffetti.ts`: gruppo «Uno a scelta, o nessuno · negozio» (la regola è `REGOLA_ALTERNATIVE` di `shared/effettiVoce.ts`, la stessa dell'editor e della spunta), senza totale e con la nota degli yen di quello che si sceglie; a voce fatta mostra il set comprato, «Nessuno dei due comprato», o le alternative da scegliere se sono state aggiunte dopo la spunta;
  - `SceltaAcquistoAlternativo.tsx`: la scelta alla spunta;
  - `AcquistiNegozioVoce.tsx`: il riquadro nell'editor della voce.

### Scorta dei negozi e registro degli acquisti
- **Regola in un punto solo:** `articolo.rifornimento_json` (gioco 242) dice quando l'offerta torna (`giorno`, `settimana`+giorno, `mese`, `pioggia`, `mai`, `consegna`+giorni, `restituzione`) e da dove viene la regola (`guida`, oppure `fallback-utente` dove la guida tace: il segno vale fino al cambio di giornata, senza limite); `articolo.quantita` sono i pezzi per ciclo. Le funzioni pure stanno in `shared/rifornimento.ts` (`statoScorta`, `descriviRifornimento`, `descriviStatoScorta`), usate dal server e dal modulo dell'articolo.
- **Registro:** `utente.registro_acquisti` (utente 051) ha una riga per acquisto: giorno e fascia di gioco, pezzi, fonte (`negozio`, oppure `voce` con voce ed effetto), `ottenuto_qui` (la riga che porta il segno «ottenuto»), `sede_chiave` (il luogo in cui si è comprato; NULL = la sede principale del negozio della chiave). Ogni riga porta la chiave con cui l'acquisto è segnato, la stessa di `acquisto_partita`, che resta il segno «ottenuto almeno una volta» letto da condizioni, televendite, regali e dalla barratura del pezzo unico. È tra i `RIFERIMENTI_PARTITE` verso i dati di gioco (articolo, voce, effetto, sede).
- **Scorta in lettura:** `scorteService.scortaDellArticolo` calcola il ciclo dalla data della partita e dalle righe dell'offerta e delle vecchie chiavi del suo listino condiviso, senza scritture al cambio di giornata. La scorta è della sede in cui si guarda l'offerta (`negozio_sede` dopo `conSede`): le sedi aggiuntive di un listino condiviso sono distributori diversi, ognuno con la sua scorta. Il DTO (`ScortaArticoloDto`) porta tutti gli acquisti (`nelCiclo` per quelli che contano ora, `altraSede` per quelli di un'altra sede, `dopoLaData` per quelli con un giorno dopo la data della partita, `negozioNome` per le vecchie chiavi) e le chiavi con il segno «ottenuto» che nessuna riga porta (`senzaGiorno`). Tanaka: un ordine di un giorno precedente ancora in viaggio blocca tutto il negozio (`consegnaDelNegozio`). Esaurita la scorta, la disponibilità ha il requisito rosso «Scorta del negozio»; il pezzo unico già comprato non ne ha.
- **Scritture:** `negoziService.impostaAcquisto` (un acquisto = una riga; togliere = una riga sola; `soloPresenza` per il segno senza giorno), `annullaRigaDelRegistro` (`DELETE /api/partite/:id/registro-acquisti/:rigaId`), `registraCopiaDaVoce`/`togliCopiaDaVoce` per la voce che compra di nuovo un articolo già ottenuto (`effettiDiStatoService`). L'Aojiru resta con il suo registro delle consumazioni (`acquisto_registrato`).
- **Interfaccia:** `AcquistiOfferta.tsx` («Compra», gli acquisti del ciclo, «Acquisti precedenti», «In altre sedi», «Dopo la data di gioco», «Ottenuto senza un giorno registrato», ognuno con «Annulla»), usato da `ArticoliTabella.tsx`, `OfferteDellOggetto.tsx` e dalla merce del pin nel visore (`VisoreMappa.tsx`, `AcquistoDellaMerce`: popup e scheda); il riquadro «Rifornimento» del modulo dell'articolo (`ModuloArticolo.tsx`). Filtro «Acquistati / Da acquistare» e contatore del negozio usano `compratoNelCiclo` (`shared/rifornimento.ts`): ciò che si rifornisce è acquistato solo nel ciclo in corso. Si barra solo il pezzo unico (regola «mai», `ePezzoUnico`): i servizi (Penguin Sniper, Tempio di Kichijoji) hanno la regola dell'utente dalla gioco 259 e ciò che non ha una regola non si presenta come posseduto per sempre.
- **Sconto del negozio dal rango di un Confidente** (gioco 254 e 269): `negozio.sconto_json` = `{ confidente, rango, percentuale }` (la Clinica di Takemi: 50% dal rango 7). Il prezzo resta quello dell'offerta; il prezzo scontato si calcola (`shared/scontiNegozi.ts`) e lo applica `prezziArticoli.prezzoDellArticolo(articolo, fascia, partita, voce?)`, che leggono la spunta della voce (`motoreDiario`), l'anteprima dell'elenco del passato (`sfideDellaVoce`), i turni con l'articolo dell'esito (`attivitaService.yenDelTurno`, con la voce che li registra), l'evento d'acquisto e il listino della partita (`ArticoloDto.prezzoScontato`). Con la voce del Diario vale lo sconto del suo momento (`scontoAllaVoce`: prima del primo passaggio del Confidente al rango dello sconto nel registro dei passaggi, `utente.incontro_confidente_partita` con `passaggio = 1`, scritto dal Diario, dalle azioni dell'utente e dalla pagina Confidenti, prezzo pieno; l'ordine dentro la fascia viene dalla voce spuntata che porta al rango, un passaggio segnato dalla pagina vale dall'inizio della fascia; senza un passaggio con il suo giorno registrato, il rango di adesso). Il prezzo scontato arriva anche al pin della mappa (`SpilloDto.dettaglio.negozio.articoli[].prezzoScontato`) e a «Dove si compra» (`OffertaOggettoDto.prezzoScontato` e `.sconto`), e l'interfaccia lo dice con un solo componente (`src/components/catalogo/PrezzoScontato.tsx`: «Con lo sconto del 50%: 1.700 ¥», o la regola del negozio senza sconto attivo); `NegozioRiassuntoDto.sconto` lo dice nella scheda del negozio e il modulo del negozio lo modifica (`erroriSconto` per i messaggi di campo; il server verifica che il Confidente esista).

### Esiti delle attività con trofeo e oggetti
- **Dato in un punto solo:** `attivita.esiti_json` (`shared/esitiAttivita.ts`). Oltre a nome, prova, articolo, condizioni, Doti e premi in parole, un esito può dire il `trofeo` che fa ottenere (chiave di `trofeo`) e gli `oggetti` del catalogo che dà (`[{ oggetto, quantita }]`, al più 5, copie 1–999). Tutti e due facoltativi: gli esiti scritti prima si rileggono identici. `articolo` è anche l'acquisto che l'esito comporta (estrazione della lotteria: «Non vinto, ricompri il Lotto R»): il prezzo si scala registrando il turno (`yenDelTurno`).
- **Scritture:** solo da `attivitaService.registraTurno` (la spunta della voce del Diario e il + del contatore passano di lì) e `togliTurno`, nella stessa transazione del turno:
  - `trofeiDegliEsitiService.ts`: il trofeo si segna con `impostaTrofeo` e il «prima» va in `utente.trofeo_esito_turno` (utente 053; `gia` = c'era già, `evento_id` = l'evento dello storico); togliendo il turno torna com'era, oppure il segno passa a un altro turno o a una voce spuntata con l'effetto «trofeo» (e al contrario, `effettiDiStatoService.decidiAnnullo` → `cediTrofeoAUnTurno`);
  - `oggettiDegliEsitiService.ts`: gli oggetti vanno in `utente.oggetto_esito_turno` (utente 053), una riga per oggetto del turno con copie ed esito; togliendo il turno se ne vanno. Un oggetto che il catalogo non ha non entra.
- **Letture:** `oggettiOttenutiService` (origine `turno`: attività ed esito) e `copieOggetti` (copie possedute, per i regali) sommano le righe dei turni a quelle delle voci e delle Richieste. Le due tabelle sono nei `RIFERIMENTI_PARTITE` del pacchetto (attività, trofeo, oggetto) e hanno un'etichetta nel cestino. I turni registrati prima non si riscrivono.
- **Interfaccia:** `EditorEsiti.tsx` (trofeo, oggetti con copie dal catalogo, premi solo in parole per il resto), `SceltaEsito.tsx` e la scheda dell'attività (`AttivitaPage.tsx`): trofeo, oggetti e prezzo dell'esito senza prova; «nessuna Dote» e «Senza punti» solo se gli esiti dell'attività danno Doti.
- **Doti delle attività e promemoria «Applica»:** le Doti di un'attività stanno in `effetti_json` (valore fisso) o negli esiti (valore scelto alla spunta), mai in `doti_json`, che resta per la sola prosa delle attività corrette dall'utente (oggi il Triple Seven, dove ripete gli effetti). Una Dote a caso senza note documentate è un esito per Dote e note, raggruppato per Dote (gioco 333: biliardo e sala giochi Gun About, «Conoscenza · 2 note», mai la Gentilezza); le note variabili sono un esito per numero di note (freccette ♪–♪♪♪). La Dote di un'attività legata a un Confidente sta nel Confidente (`confidente_dote_incontro`: i test di Takemi). La spunta della voce con l'effetto `turno` registra il turno con le Doti dell'esito (`registraTurno`), la ricevuta le porta (`turni[].doti` → `beneficiLegacy`) e la voce mostra «Applica» (`DaApplicare`), come ogni altra Dote. Il + del contatore (`impostaVolteAttivita`) dà al turno con Doti la sua identità (`turno_partita.uid`) e una proposta con la causa `turno` (utente 062: `utente.da_applicare.causa_tipo = 'turno'`, `causa_chiave` = «<attività>:<uid>»; `promemoriaDelTurno` → `riconciliaBeneficiTurno`): i benefici sono i punti del turno in `effetto_lettura_partita`, attivi finché il turno c'è (`targetCausa`). Il − (`togliTurno`) riallinea la causa: la proposta aperta si chiude (`non-piu-dovuta`), quella applicata ha la sua inversa. Partita → Progressi mostra `DaApplicare attivita=…` sotto la riga (`ProgressiPartitaDto.attivita[].conProposteDeiTurni`); `daSegnare` della risposta dice solo i turni tolti senza proposte (registrati da una voce o prima del registro).

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

### Ricerca globale
`GET /api/ricerca` (`routes/ricerca.ts`, `ricercaService.ts`): cerca nei nomi (mostrato, originale, sinonimi) di un indice in memoria (`ricerca/indiceRicerca.ts`, un costruttore per ognuno dei 25 tipi di `TIPI_RICERCA` in `shared/ricerca.ts`), raggruppa per tipo e restituisce percorso, casa e immagine. Le cose nascoste non entrano; i luoghi chiusi sì, con il loro stato (`ricerca/statoRicerca.ts`). L'indice si ricostruisce quando un dato di gioco cambia (registro `cacheDiGioco.ts`).

### Catalogo degli oggetti
Il catalogo è separato dall'equipaggiamento storico `oggetto`, citato dalle Persona per nome inglese. L'identità di un oggetto è la riga di `catalogo_oggetto` (migrazione 121, utente 026); le offerte (`articolo`), i regali dei Confidenti, i contenuti e le ricompense la citano per chiave. Letture: `catalogoOggettiLetture.ts` (base, senza dipendere dai consumatori) e `catalogoOggettiService.ts` (aggrega offerte, regali, contenuti); scritture: `catalogoOggettiScritture.ts` (identità), `catalogoOggettiProposte.ts` (proposte di abbinamento, conferme, legami) e `catalogoOggettiFusione.ts` (fusione reversibile tramite il cestino). Router `/api/catalogo-oggetti` (`routes/catalogoOggetti.ts`); pagine `OggettiPage` (catalogo) e `OggettoPage`, componenti in `src/components/catalogo/`. Le note storiche (`nota_storica`, 139) dicono una discordanza della guida senza cambiare prezzi o acquisti e si correggono con Ripristina (`noteStoricheService.ts`).
- **Listini condivisi**: `listiniCondivisi.ts` legge i legami fra negozi (`negozio.listino_condiviso`, `articolo.articolo_condiviso`, migrazione 121) per negozi, luoghi, mappe, disponibilità e acquisti.
- **Regali**: `regaliPartita.ts` separa l'identità dalla consegna storica: il comando accetta `catalogo` (chiave dell'oggetto) oppure il vecchio `regalo` per nome, risolto solo se univoco; nomi e date salvati non si riscrivono; il DTO conserva `regaliFatti` e affianca `regaliFattiCatalogo`. Il regalo con punti e acquisto è l'azione `POST /api/partite/:id/regali` (utente 035).
  - **Regali con reazione e copie (gioco 255-258, utente 052):** `confidente_regalo.reazione` (+3/+2/+1) e `confidente.regalabile` sono dati; ogni oggetto regalo si dà a un Confidente regalabile già incontrato (+1 fuori elenco), la Cartolina si spedisce (`shared/regali.ts`). **`utente.regalo_partita` ha per chiave `id`**: ogni consegna è una riga, anche lo stesso oggetto ridato, con `copia_consumata`, `registro_id`, `modo` (consegna/cartolina) e `causa_yen` propria. Le consegne arrivano alle pagine come `ConfidentePartitaDto.consegne` e `OggettoDettaglioDto.partita.consegne` e si annullano per `id`. Le copie possedute si leggono in `copieOggetti.ts` (registro degli acquisti, set comprati, oggetti ricevuti, meno le consegne che le hanno usate). Il Cestino riconosce le fotografie di `regalo_partita` di prima della 052 con la chiave di allora più `fatto_at` (`chiaveDellaFotografia` in `cestinoService.ts`).
- **Quantità ignota**: la resa non dichiarata di una ricetta resta `null`; `RicompensaOggettoDto` la distingue da `ContenutoOggettoDto`, che ha quantità nota positiva.
- **Costo**: appartiene all'offerta (yen oppure fiori/oggetti per chiave e quantità) ed è reso da `CostoDellOggetto` (`src/components/catalogo/`), condiviso da listino, pagina Oggetto e visore.
- **Sezioni della guida collegate**: `OggettiCollegati` è la resa comune delle ricompense e dei contenuti nelle schede, nella guida del visore, nelle Richieste e nelle ricette; i contenuti delle voci si modificano con `ContenutoDellaVoce`.

### Pacchetto, import ed export
- Il pacchetto di gioco è `gioco.db` (`pacchettoGiocoService.ts`). «Importa» passa dall'anteprima, fa una **copia di sicurezza** (`prima-del-ripristino-<timbro>` in `data/backups`, conservate le ultime `COPIE_DI_RIPRISTINO = 3` in `impostazioniService.ts`), **sostituisce** `gioco.db` e riapre l'istanza (le migrazioni portano avanti un file più vecchio); non unisce e non tocca `partite.db`. I file passano dalla cartella d'appoggio (`depositoService.ts`, `DEPOSITO_DIR`); una sola sostituzione alla volta (`lucchettoIstanza.ts`); le cache di gioco si svuotano insieme (`cacheDiGioco.ts`).
- Le correzioni dell'utente stanno nel database, quindi nell'export e nelle copie di sicurezza; dopo l'import di un file più vecchio le correzioni successive a quel file non sono nel DB ma restano nella copia di sicurezza. Tre import di fila fanno scorrere via la copia più vecchia.
- Il backup di avvio (`backupService.ts`) copia i due file prima delle migrazioni e tiene le ultime 7.

### Migrazioni
- **Gioco**: 333 migrazioni registrate in `server/db/migrations/index.ts`, l'ultima è la 333 (`333_effetti_attivita_e_voci_collegate`). **Utente**: 63 registrate in `server/db/migrazioniUtente/index.ts`, l'ultima è la 063 (`063_turno_della_voce`). Il numero cresce: fa fede il registro. Registri append-only; `index.test.ts` pretende id consecutivi; ogni migrazione gira in una transazione con `foreign_key_check` prima di avanzare `user_version`.
- Punti di svolta (gioco): 099 aree dei dedali · 104 cestino · 107 ruolo dalla gerarchia · 108 miniature · 109 aree del mondo · 110 aree dei Palazzi e infiltrazioni · 115 luoghi fonte unica · 118 condizioni uniche · 121 catalogo degli oggetti · 138 pesca · 139 note storiche · 161 ranghi con modo · 162 vocabolario degli elementi · 163 disponibilità strutturata · 164 eventi↔voci · 166 Ombra · 168 giorno unico · 169–170 Persona del gruppo · 175 Iweleth nei Memento · 176–177 marcatori, piante e legami delle mappe tolti · 178 correzioni · 184–194 frasi e copie tolte · 195–197 correzioni ai dati Royal del Diario (cruciverba «Hacker» nel Cestino, voce del 13/11, Hagoromo) · 198–199 `origine` e `seed_json` su esame e calendario, per Modifica e Ripristina · 240 registro append-only delle copie e degli spostamenti delle voci del Diario (`operazione_voci_diario`, appunti del Diario) · 242 rifornimento degli articoli · 295, 327, 329 e 332 regole dei doni dei Confidenti · 315 premi delle domande in classe dalla guida · 324–325 Confidenti romanzabili e disponibilità con la relazione · 328 sblocco di «Se scomparissero i gatti» dalla voce dell'indagine · 330 effetti con condizioni dello Scaffale con lo scatolone del Leblanc · 331 San Valentino scelto alla spunta (attività `san-valentino` con gli esiti) · 333 Doti delle attività scelte alla spunta (biliardo, Gun About, freccette, Frui-te) e voci del Diario collegate alle loro attività (delle 38 lasciate dalla 312: 7 collegate, 4 già collegate, 27 senza collegamento con il motivo in `dati_guida.audit-333-attivita-e-voci`).
- Punti di svolta (utente): 021 cestino delle partite · 025 inviti · 028 acquisti e proposte · 029 pesca · 030 continuità degli acquisti · 032 Fortuna · 036 effetti di stato della voce · 040 piazzamento agli esami · 041 punti cronologici · 043 `lettura_partita` tolta · 050 censimento degli stati delle voci · 051 registro degli acquisti · 052 regali per consegna · 053 trofei e oggetti degli esiti · 054–055 consumi e uscite di oggetti · 058 appunti fissi del Diario · 059–060 relazione romantica e suo giorno d'inizio · 061 salvataggio di Persona 5 della partita · 062 proposte «Applica» dai turni del contatore delle attività · 063 legame esplicito turno → voce del Diario (`turno_voce_partita`).

### Appunti del Diario
- **Copia, Taglia, Incolla**: copiare, tagliare e incollare voci passa da un solo servizio, `server/services/appuntiDiarioService.ts` (istantanea per gli appunti, piano con i rilievi, incolla in una transazione, annullo; anche «Copia in…» / «Sposta in…»), con il writer dell'ordine di `giornataService` (`collocaInFascia`, `compatta`, `ripristinaOrdineVoce`) e la copia degli effetti di `motoreDiario.scriviEffettiDaIstantanea` (registrata in `operazione_effetti_voce`). Nel frontend `useSelezioneVoci` (selezione), `useAppuntiDiario` (eventi `copy`/`cut`/`paste` del documento, appunti di sistema) e `utils/appuntiDiario.ts` (testo leggibile + HTML col blocco `p5r-diario-voci` versionato); solo preparazione, esclusi dal bundle di rilascio con la costante di build.
- **Appunti fissi**: le voci che si ripetono, salvate con titolo e testo intero in `utente.appunto_fisso` (utente 058, NON di una partita) da `server/services/appuntiFissiService.ts` (rotte `/api/appunti-fissi`, solo preparazione: fuori dall'elenco del giocatore). Nel frontend la finestra fluttuante non modale `components/appunti/FinestraAppuntiFissi.tsx` (montata in `MainLayout`, aperta da `PulsanteAppuntiFissi` nella `Topbar`; posto, misura e stato per dispositivo in `localStorage`), lo store `appuntiFissiStore` (`@__PURE__`, esce dal rilascio) e la scrittura comune negli appunti di sistema `utils/scritturaAppunti.ts` (anche di `useAppuntiDiario`). Il testo salvato dal Diario è quello di «Copia» (`scriviAppunti`), quindi Ctrl+V nel Diario lo riconosce.

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
| `utente.lettura_partita` | utente 043 | `progresso_libro_partita`, `progresso_film_partita` |

## 6. Motore di fusione
- `server/services/fusione/motoreFusione.ts`: snapshot in memoria del compendio (invalidato con le altre cache di gioco, `cacheDiGioco`, quando il pacchetto cambia) e contesti memoizzati per insieme di DLC posseduti;
  regole di chinhodado (speciale a due → Demone del Tesoro + normale con modificatore di rango → arcani diversi: prima Persona con livello
  ≥ 1+⌊(La+Lb)/2⌋ → stesso arcano: la più alta con livello ≤, esclusi gli ingredienti); ricette inverse per enumerazione delle coppie di arcani
  che producono l'arcano del target + fusioni con Demone del Tesoro; costo Σ(27L²+126L+2147). `fusioneService.ts` produce i DTO con nomi
  italiani e i motivi in italiano quando la fusione non è possibile.
- API pubblica del motore: `creaContesto(dlcPosseduti)`, `fondi(a, b, ctx)`, `ricettePer(target, ctx)`, `fusioniCon(persona, ctx)`,
  `ricettaSpeciale`, `costoFusione`, `livelloFusione`, `arcanaRisultato`, `personaFusione(id)`, `invalidaMotoreFusione`.
- `server/services/fusione/alberoFusione.ts`: `pianiFusione(target, ctx, disponibilita, opzioni)` → piani ordinati per costo; foglie
  `scorta` (0 yen, un esemplare per volta), `registro` (prezzo di evocazione), `cattura` (Persona normale ≤ livelloMax); nodi `fusione` con
  2 ingredienti (o N per le ricette speciali). Stima ottimistica memoizzata + ricerca in profondità con potatura (branch-and-bound sulle N migliori),
  ampiezza per nodo 12; `pianoCoerente` verifica ogni nodo col motore. La disponibilità viene da `persona_posseduta` e `compendio_partita` della partita.
- `server/services/fusione/eredita.ts`: snapshot skill/apprese/tratti/tipi/matrice; `slotEreditabili(totale)`, `elementoEreditabile(tipo, elemento)`,
  `skillAlLivello`, `skillPosseduta`, `analisiEredita(risultato, ingredienti)` (candidate con motivo, slot, tratti), `copre(analisi, skillIds)`.
  `fusioneService.ereditaDto` (bacino dalla scorta se posseduta) e `cercaPerSkillDto` (filtri rapidi per tipo e bacino, poi analisi completa).
- Propagazione delle skill a catena (in `alberoFusione.ts`): `opzioni.skill` richiede che il bersaglio abbia le skill; a ogni nodo
  `ripartisciSkill` assegna le richieste agli ingredienti che le possono portare, verifica compatibilità (tipo, non esclusive) e slot; le foglie
  devono possedere le skill (scorta reale, innate al livello base) o apprenderle salendo di livello (`skillDaLivello`). I nodi espongono `skillPortate`.
- Bonus della Stanza di Velluto: `shared/bonusVelluto.ts` (sconti del Registro, moltiplicatore EXP del Confidente, moltiplicatori della Forca,
  tabella incensi/giorni/tier di resistenza dell'Isolamento, sblocchi delle Gemelle, effetti dell'Allarme) — regole in `docs/riferimenti/bonus-velluto.md`;
  `fusioneService.vellutoDto`; i costi di ricette e piani sono scontati quando c'è la partita.

## 7. Frontend
- Layout tablet-first: `MainLayout` con `Sidebar` visibile da `lg` (1024px) e `BottomNav` fissa sotto; bersagli touch ≥ 44px (classe `.touch`).
- Schede di dettaglio: intestazione comune `IntestazioneScheda` (barra con «Indietro» e azioni, figura, h1 `TitoloScheda`, chip); «Indietro» = `useIndietro` (`navigate(-1)` se c'è una pagina dell'app prima, altrimenti la rotta di ripiego con sostituzione); titoli di sezione `TitoloSezione` (`display` 17 px o `sans`); strumenti di modifica nel menu `MenuModifica` («Modifica ⋯»), l'azione di gioco come pulsante primario.
- Dati remoti per pagina con `useCarica` (caricamento derivato dalle dipendenze) + `PageState`; stato globale in zustand: config, notifiche, glossario (rese italiane), partite (elenco + attiva, cambio dalla Topbar).
- Errori e conferme: un solo aspetto per gli errori, `VistaErrore` (titolo, spiegazione, dettaglio, «Riprova» / «Torna alla home»), usato da `PageState`, `ErrorePagina`/`ErroreInRiquadro` ed `ErrorBoundary` (variante `autonoma` a colori fissi, senza tema). Nessun `window.confirm`: `conferma({ titolo, testo, etichetta })` (`stores/confermaStore`) apre il `DialogoConferma` montato una volta in `MainLayout` (fuoco iniziale su «Annulla», tono «pericolo») e risponde con una Promise. `index.html` contiene un'anteprima statica d'avvio (logo «P5», «Caricamento…», CSS in linea) che React sostituisce al montaggio; `SchermataAvvio` ne riusa le classi `.avvio*`.
- Le pagine si caricano alla prima visita con un `loader` di precarico (`pagina` in `src/router.tsx`): se il file non arriva, si resta dove si era e si segnala la «nuova versione» (`versioneStore`).
- Immagini: una regola sola per le mappe (§5 ter); per le entità `ImmagineEntita` mostra il file caricato per (ambito, chiave), altrimenti l'asset predefinito, altrimenti le iniziali. Grafica predefinita: `public/asset/` → manifest generato dal plugin Vite → `assetStore` → `AssetImg`/`useAsset` con la preferenza `graficaPredefinita`; ogni punto ha un fallback, l'app funziona senza alcun asset.
- Tema Persona 5: nero profondo, rosso `#e5352b`, bianco; token per ogni elemento di gioco (`--color-el-*`); `overflow-wrap: anywhere` sul body.
- Meccaniche di gioco nel tracker: Doti = note→punti con soglie dei 5 ranghi; Confidenti = note→punti verso il rango successivo (`docs/riferimenti/confidenti-punti.md`); `src/utils/punti.ts` replica la formula per l'anteprima.

## 7 bis. Le due istanze: preparazione e rilascio
Lo stesso codice gira in due istanze con stack, volumi e immagini separati. Le capacità di ciascuna sono dichiarate in un punto solo,
`shared/capacita.ts`, letto da backend e frontend.
- **Preparazione** (`server/index.ts`, `docker-compose.yml`): l'istanza di sempre, dove l'autore scrive e corregge i contenuti. Un solo utente (il proprietario unico); se `CF_ACCESS_TEAM` e `CF_ACCESS_AUD` sono impostate vale anche lì il controllo d'identità. Da qui, con «Prepara edizione» (`server/services/edizioneService.ts`), si produce l'edizione.
- **Rilascio** (`server/rilascio.ts`, `docker-compose.rilascio.yml`, stage `rilascio` di `Dockerfile.backend`, workflow `docker-publish-rilascio.yml`): l'istanza pubblica, con i contenuti in sola lettura e le partite di più giocatori.
- **La modalità sta nella build, non in una variabile**: il backend di rilascio ha un altro punto d'avvio, il frontend si costruisce con `VITE_MODALITA=rilascio` (condizioni costanti nello stesso modulo: gli editor escono dal bundle; `scripts/verifica-bundle-rilascio.ts` lo controlla). All'avvio il frontend confronta modalità e capacità con `/api/config` (`shared/capacita.ts`).
- **Sola lettura su tre livelli**: (1) il volume dell'edizione (`EDIZIONE_DIR`) è montato `:ro` e `gioco.db` è 0444, senza giornale WAL; (2) all'avvio una scrittura di prova su `gioco.db` deve fallire (`server/rilascio/solaLettura.ts`); (3) si montano solo le rotte dell'elenco del giocatore (`server/rilascio/rotteGiocatore.ts`: `/api/partite/…`, le letture dei contenuti, la valutazione e il tracciamento delle condizioni), controllato contro le rotte vere a ogni avvio. Il frontend è il quarto livello, di sola presentazione.
- **Volumi e variabili**: `EDIZIONE_DIR` (contenuti e caratteri, `:ro`), `PARTITE_DIR` (`partite.db`, l'unico file scrivibile), `BACKUP_DIR` (copie dell'avanzamento, all'avvio e ogni 6 ore); `CF_ACCESS_TEAM` e `CF_ACCESS_AUD` obbligatorie. I valori reali vivono solo nelle variabili dello stack.
- **Identità**: ogni richiesta `/api` (tranne `GET /api/health`) porta il token del proxy di accesso (Cloudflare Access), verificato dal backend (`server/middleware/identita.ts`); il proprietario delle partite è il `sub` del token. Cestino personale, partite e avanzamento sono per utente (`/api/partite/…`, compreso `/api/partite/cestino`).
- **Nessuna migrazione nel rilascio**: non ci sono né il runner né le cartelle delle migrazioni. «Prepara edizione» produce, in una cartella con `gioco.db`, `partite-vuoto.db`, `font/` e `manifesto.json`; il manifesto porta le versioni degli schemi e l'impronta della struttura delle partite (`server/db/improntaSchema.ts`, un'unica funzione usata dai due lati). A ogni avvio il rilascio (`server/rilascio/edizione.ts`) confronta versioni e impronta col manifesto e, se non coincidono, si ferma: una struttura diversa richiede una nuova edizione e una conversione una tantum su copia, dopo il sì dell'utente.

## 8. Build, test, deploy
- Test (Vitest). Aiuti comuni in `test/`: `dbDiProva()` (`test/dbDiProva.ts`, DB del backend in memoria con il pacchetto iniziale caricato e migrato); `test/supertest.ts` (alias di `supertest` in `vitest.config.ts`, chiuso a fine file da `test/setup.ts`); `moduloApi` / `moduloNotifiche` (`test/mockModuli.ts`) per i `vi.mock` del frontend. Il frontend gira in jsdom.
- Dev: `scripts/start-all.sh` (`npm run dev:server` = `tsx watch`, che **si riavvia da solo** a ogni salvataggio in `server/` e applica subito le migrazioni nuove ai dati di `data/`; `npm run dev:client` = `vite --host`), log `BE.log`/`FE.log`, PID in `.pids/`. Le porte vengono da `.env` (`BE_PORT`/`PORT`, `FE_PORT`).
- CI (`.github/workflows/ci.yml`, anche riusabile con `workflow_call`): typecheck, lint, audit. I test non girano a ogni push: si lanciano su richiesta sul solo percorso indicato, in locale `npx vitest run <percorso>` o con `test-su-richiesta.yml` (`workflow_dispatch`, input `percorso`).
- Immagini della preparazione (`docker-publish.yml`): a ogni push su `main`, dopo il gate `verify` (lo stesso `ci.yml`), build & push su GitHub Container Registry di `project-p5r-backend` e `project-p5r-frontend` con tag `latest` e `sha`.
- Immagini del rilascio (`docker-publish-rilascio.yml`): solo con un tag `rilascio-vX.Y.Z` raggiungibile da `main`, dopo lo stesso gate; immagini distinte (`project-p5r-rilascio-backend`, `project-p5r-rilascio-frontend`) con la versione fissa, mai `latest`, e nessun aggiornamento automatico.
- Il backend in Docker gira come `node --import tsx server/index.ts` (PID 1 = node, riceve SIGTERM da `docker stop`).

## 9. Regole per chi scrive codice
**Server**
- **Cache dei dati di gioco in un registro unico** (`server/services/cacheDiGioco.ts`): ogni modulo che tiene in memoria letture di
  `gioco.db` registra la propria invalidazione con `registraCacheDiGioco`; chi sostituisce o ricarica il DB chiama solo
  `invalidaCacheDiGioco()`.
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
- Client HTTP: tentativi solo sui metodi idempotenti (§4); gli invii di file passano da `inviaFile` (`src/services/api/_helpers.ts`),
  che trasforma un rifiuto del proxy in HTML in un `ApiError` leggibile.
- `useCarica`: un aggiornamento locale dopo un `await` usa la forma con funzione (`imposta(d => …)`), mai i dati del render.
- Store con richieste che si sovrappongono (`partitaStore`, `suggerimentiStore`): vale solo la risposta dell'ultima richiesta.
- Progressi a pressioni rapide (libri, film, videogiochi): `useCodaProgresso`, una richiesta per volta per elemento.
- Elenchi modificabili con stato per riga: chiavi da `useIdStabili`, mai l'indice né il contenuto.
- Finestre (`Modal`): il fuoco entra nella finestra, Tab resta dentro, alla chiusura torna a chi l'ha aperta; nessuna chiusura dallo
  sfondo. Lo spostamento (barra trascinata, frecce sulla maniglia ⠿, sempre per intero nello schermo) è `useSpostamentoFinestra`, lo
  stesso della guida del visore.
- Accessibilità: un `div`/`span` con `aria-label` ha sempre un `role` (lo controlla `src/accessibilita.test.ts`).
- Runtime (`docker-compose.yml`): nessuna porta pubblicata; FE nginx sulla rete esterna `PROXY_NETWORK`, BE solo su rete interna (3101, proxato da nginx su `/api/`), volume `project_p5r_data` su `/data` (DB creato al primo boot dal pacchetto iniziale nell'immagine). La cartella d'appoggio è un volume NFS: lo stack deve definire `NAS_ADDR` e `NAS_PATH`, senza valori predefiniti. I container della preparazione portano la label di Watchtower per l'aggiornamento automatico; quelli del rilascio no.
- `nginx.conf`: il backend si risolve per nome a ogni richiesta (`resolver 127.0.0.11`, variabile `$backend`), così un container ricreato non lascia nginx sul vecchio indirizzo; `/api/mappe/importa` ha un limite proprio (`client_max_body_size` più largo del resto dell'API; Express lo ferma a 64 MB); `immutable` solo sui file con hash di `/assets/`, gli altri statici si rivalidano.
