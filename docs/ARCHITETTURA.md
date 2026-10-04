# Architettura — project-p5r

Aggiornato alla verifica completa del 4 ottobre 2026. Le sezioni §1–§8 e quelle senza data descrivono il sistema com'è
oggi. Le sezioni intitolate con una fase («Fase 6.1», «Fase 13.2»…) o con una data sono il **registro** di quando una parte è
nata: dicono come era fatta allora e quale scelta l'ha guidata. Dove una cosa è cambiata dopo, lo dice la sezione più recente.
In particolare, quelle sezioni citano spesso i file del **seed JSON** (`data/seed/*.json`, caricati da `caricaSeed` al boot). Il
seed è stato dismesso il 12 settembre 2026: quei dati oggi stanno nelle tabelle di `gioco.db` (o nei blocchi di `dati_guida`) e
arrivano con il pacchetto di gioco. Le parole «seed» e «reseed» vanno lette come «dati della guida» e «ricarica del pacchetto».

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

- **Un solo processo backend**, nessun DB esterno, nessuna autenticazione (app personale in LAN/Tailscale).
- Il frontend parla solo con `/api` sulla stessa origine (proxy Vite in dev, nginx in produzione).

## 2. Stack e versioni
| Livello | Tecnologia |
|---|---|
| Runtime | Node ≥ 22.13 (immagini Docker e CI su Node 24 LTS), TypeScript 5.9, ESM (`"type": "module"`) |
| Frontend | React 19, react-router 7, zustand 5, Tailwind 4 (plugin Vite, config CSS-first), Vite 8 |
| Backend | Express 5, better-sqlite3 12, zod 4, pino 10, tsx (esegue i `.ts` a runtime, anche in produzione) |
| Test | Vitest 4 (+ jsdom e Testing Library per i componenti), supertest per le route (tramite `test/supertest.ts`), DB in memoria con il pacchetto iniziale (`test/dbDiProva.ts`), moduli finti dal modulo vero (`test/mockModuli.ts`), migrazioni (`server/db/migrationRunner.test.ts`, `migrations/index.test.ts`) |
| Qualità | ESLint 10 flat config, `tsc -b` su 4 progetti (app / node / server / test) |
| Deploy | Immagini `node:24-alpine` (backend) e `nginx:1.30-alpine` (frontend); GitHub Actions su Node 24 (checkout v7, setup-node v7, setup-buildx v4, build-push v7) |

## 3. Struttura del repository
```
server/
  index.ts            boot: assicuraPacchettoIniziale → initDb (gioco.db + partite.db attaccato come «utente») → runBootBackup → runMigrations (due sequenze) → regoleAllAvvio → listen; SIGINT/SIGTERM → server.close + closeDb
  bootstrap.ts        factory Express: middleware in ordine, router di area (`routes/index.ts`, `ROUTER_DI_AREA`), health/config, documentazione (`/api/openapi.json`, `/api/docs`), 404, errorHandler
  config.ts           unica lettura delle env (BE_PORT/PORT, DATA_DIR, PACCHETTO_DIR, LOG_LEVEL)
  middleware/         requestContext (requestId + logger), responseShape ({data}), validate (zod; gli schemi restano leggibili con `schemiDiValidazione`), errorHandler
  openapi/            documentazione dell'API (voce 5 della verifica completa): rotte.ts (rotte lette dalla pila dei router), documento.ts (OpenAPI 3.1 dagli schemi zod), descrizioni/ (registro in italiano, un file per area), pagina.ts (Swagger UI da `swagger-ui-dist`), openapi.test.ts (copertura e validità)
  db/                 dbService (gioco.db + ATTACH partite.db, pragma, cache statement, copiaSchema), migrationRunner (user_version per file), backupService (7 copie di entrambi i file), schemaUtente.ts (DDL delle 33 tabelle delle partite), colonne.ts (haTabella/haColonna/aggiungiColonna per le migrazioni)
  db/migrations/      dati di gioco: 001_compendio … 066 (le partite escono dal file), 067 (uid degli spilli), 068–078 (modello dati del catalogo: orari strutturati, condizioni sugli articoli, luogo catalogabile, sedi, collegamenti libri/videogiochi, effetti dichiarati, attività strutturate, programma punti, timbri dei dedali, domanda «tv»), 079 (immagini dentro gioco.db) … 095 (passi degli Enigmi), 096 (pulizia dello schema); registro in index.ts, `index.test.ts` pretende id consecutivi
  db/migrazioniUtente/ partite: 001 schema (`schemaUtente.ts`, DDL attuale) … 015 (giornata come canone), 016 (indici); registro in index.ts (sequenza separata, `PRAGMA utente.user_version`)
  routes/             compendio (arcani, glossario, regole di fusione, persona, skill, oggetti, confidenti), traduzioni, partite (+ doti,
                      confidenti, compendio personale, Persona possedute), immagini (PUT grezzo image/*, import da URL, file)
  services/pacchetto/ pacchettoGioco.ts: primo avvio dal pacchetto (`assicuraPacchettoIniziale`), `caricaPacchetto`/`ricaricaPacchetto` (test), `regoleAllAvvio`
  services/timbriService.ts  i timbri raccolti nei dedali dei Memento per partita (tetto della guida, evento al completamento; rifiutati dove la guida non dichiara il totale)
                      Nota: quando una sede ospita più negozi (i distributori di Akihabara e della Shujin), il pin del luogo e la presenza
                      del luogo seguono il **primo negozio per ordine** (`presenzaEntita.ts`, `mappeService.dettaglioRiferimento`): oggi hanno tutti gli stessi orari.
  services/mappe/identitaSpillo.ts  uid degli spilli = impronta dell'identità (stesso spillo, stesso uid in ogni file)
  services/           traduzioniService (cache in memoria, `t(ambito, chiave)`), compendioService, partiteService, immaginiService,
                      fusione/motoreFusione.ts (motore puro su snapshot in memoria), fusione/alberoFusione.ts (piani
                      ricorsivi) e fusione/fusioneService.ts (DTO)
  services/verificaPartita.ts  il 404 «partita-non-trovata» comune a tutti i servizi per partita
  schemas/            zod: comuni (id, booleani ed elenchi da query, livello, data MM-GG, uid di una voce, Dote, categoria di articolo),
                      compendio, catalogo, fusione, guidaDungeon, mappe, traduzioni, partite, immagini, font
  utils/              logger, httpError
shared/types.ts       tipi/costanti pure condivise FE/BE (nessun import Node); `RequisitoRango` = requisito di un rango di Confidente
shared/doti.ts        le cinque Doti sociali (chiave, nome, ordine di `dote_sociale`): fonte unica di schemi, servizi e interfaccia
shared/articoli.ts    le categorie di un articolo: fonte unica di tipo, schema del catalogo e ricerca degli articoli
shared/orariNegozio.ts  OrariNegozio (giorni, fasce, chiusura con la pioggia, nota): normalizza, leggi, orariComeCondizioni, descriviOrari
shared/effettiCatalogo.ts VoceEffetto (effetto dichiarato + ripetuto + condizioni) di libri, film e attività: normalizza, leggi, dotiDaEffetti, descriviVoceEffetto
shared/attivita.ts    cataloghi delle attività: TIPI_ATTIVITA, FASCE_ATTIVITA, TRACCIAMENTI_ATTIVITA (nessuno | svolta | sessioni)
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
                      PianiFusione (albero ricorsivo con foglie scorta/Registro/cattura, opzioni, skill richieste con badge per nodo),
                      PannelloEredita (slot, bacino, tratti), SelettoreSkill (scelta multi-skill con ricerca), CercaSkill (ricette valide per skill),
                      PannelloVelluto (sconto/Allarme/Gemelle/ranghi), ForcaIsolamento (calcolatori Forca e Isolamento sulla scorta)
  components/impostazioni/ GestionePartite, ImmaginiCaricate (rimozione per ambito o totale), CaratteriEditor, TraduzioniEditor
  pages/              Home, Compendio (232 Persona, filtri client-side), PersonaDettaglio, Glossario (termini per categoria), Skill (525, filtri), SkillDettaglio,
                      Fusione (due arcani, matrice 24×24, ricette speciali, Demoni del Tesoro), Partita (schede), Impostazioni, NotFound
  stores/             configStore, notificationStore, glossarioStore (rese italiane, caricato una volta), partitaStore (partite + attiva),
                      preferenzeStore (localStorage: grafica predefinita), assetStore (manifest unico: /asset/manifest.json per compendio e ui + /api/immagini/manifest per la grafica nel database; hook useAsset)
  utils/              constants, elementi, punti (formato/anteprima punti Confidente), assetPredefiniti (chiavi manifest per entità)
vite/                 assetPredefiniti.ts — plugin: manifest degli asset in public/asset/ (dinamico in dev, emesso in build)
public/asset/         asset grafici del compendio (persona, arcani) e dell'interfaccia (ui): tutto il resto della grafica vive nel database (079)
  services/api/       _httpClient (timeout+retry), _helpers (envelope, ApiError, queryString), sistema, compendio, traduzioni, partite, immagini
  hooks/, utils/      useDocumentTitle, useCarica (stato di caricamento derivato, senza setState negli effetti), constants, elementi (colori)
pacchetto/            gioco.db iniziale (in git, senza immagini: copiato in DATA_DIR al primo avvio, usato dai test) e completo/gioco.db
                      (stesso file con le immagini dentro, ~311 MB, FUORI da git: si importa dall'app e sostituisce l'istanza); README.md
                      (`--da-istanza` per farne il dato predefinito dell'app dall'istanza locale). Il seed JSON e la sua pipeline sono stati
                      dismessi il 2026-09-12; gestione server in scripts/*.sh
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
4. Router di area (`ROUTER_DI_AREA` in `server/routes/index.ts`: compendio, traduzioni, partite, immagini, fusione, mappe, font, impostazioni,
   catalogo, condizioni) con `validate({ params, query, body })` zod prima dell'handler (Express 5: `req.query` è
   un getter, quindi il middleware fa shadowing sull'istanza).
5. `/api/health` (stato DB + `user_version`; **503** se il DB non risponde, perché l'HEALTHCHECK di Docker guarda solo il codice),
   `/api/config` (valori pubblici per il boot FE), `/api/openapi.json` e `/api/docs` (documentazione, §5 bis).
6. 404 JSON per `/api/*` sconosciute; `errorHandler` ultimo: `HttpError` → status+codice; errori 4xx di Express/body-parser (JSON malformato 400, corpo oltre il limite 413, percorso non decodificabile 400) e di `sendFile`/`download` (404 `not-found`, 403, 416) → envelope in italiano, con le intestazioni di una risposta JSON anche se la rotta stava per mandare un file; altro → 500 `internal-error` con un **messaggio fisso** (il dettaglio resta nel log, col `requestId`).
7. Client (`src/services/api/_httpClient.ts`): timeout e tentativi sui 5xx e sugli errori di rete **solo per i metodi
   idempotenti**; POST e PATCH non si ripetono (una scrittura già avvenuta verrebbe raddoppiata), salvo `maxRetries` esplicito.
   Anche un PUT **relativo** non si ripete, con `{ maxRetries: 0 }` nella sua funzione: lo spostamento di una voce della giornata
   (`spostaVoceGiornata`) o di un punto (`spostaPunto`) di un posto e i punti di un Confidente (`aggiornaConfidente`, che li somma)
   ripetuti dopo una risposta persa sposterebbero o sommerebbero due volte.

## 5. Persistenza
- **Due file, una connessione** (2026-09-12): `DATA_DIR/gioco.db` è `main` (compendio, guida, catalogo, mappe, indice immagini) e `DATA_DIR/partite.db` è attaccato come schema `utente` (le 33 tabelle delle partite, DDL in `server/db/schemaUtente.ts`). Le query restano senza prefisso (SQLite risolve il nome cercando in `main` e poi in `utente`); solo migrazioni e backup nominano lo schema. I vincoli fra i due file non sono applicati da SQLite: i riferimenti utente→gioco usano chiavi stabili (`spillo.uid`, migrazione 067: impronta SHA-256 dell'identità dello spillo — mappa, tipo, nome, posizione, riferimento — così un'istanza migrata in proprio e il pacchetto danno lo stesso uid allo stesso spillo; portato dai pacchetti mappe; `spillo_partita.spillo_uid`). Chi elimina uno spillo pulisce anche i suoi «raccolto». Il vecchio file unico `project-p5r.db` viene rinominato in `gioco.db` al primo avvio e la migrazione 066 sposta le partite nel loro file. Al primo avvio senza `gioco.db` il file arriva dal pacchetto (`pacchetto/gioco.db`).
- Connessione better-sqlite3, pragma `journal_mode=WAL` (su entrambi i file), `synchronous=NORMAL`, `busy_timeout=5000`, `foreign_keys=ON`.
- Migrazioni versionate su `PRAGMA main.user_version` e `PRAGMA utente.user_version` (due sequenze append-only, `server/db/migrations/index.test.ts` pretende id consecutivi), ogni migrazione in una transazione, con `foreign_key_check` **dentro** la transazione prima di avanzare `user_version` (dal 2026-10-03, prima il controllo era dopo il commit). Il controllo si fa prima e dopo `up`: solo le violazioni **nuove**, introdotte da quella migrazione, la annullano (resta da applicare); quelle già presenti nel file si scrivono nel log come avviso e non bloccano l'avvio, che altrimenti si fermerebbe per sempre su un dato vecchio che nessuna migrazione tocca.
- `prepared(sql)` tiene in cache uno statement per testo SQL, condiviso da tutto il server: chi lo prende lo rimette ogni volta in modalità normale (`pluck(false)`, `raw(false)`, `expand(false)` sugli statement di lettura), perché un `.pluck()` fatto da un chiamante cambiava lo statement anche per tutti gli altri.
- Backup online (`copiaSchema`) di entrambi i file prima delle migrazioni a ogni boot, rotazione a 7 coppie in `data/backups/`; la copia dell'istanza (Impostazioni) porta `database/gioco.db` e `database/partite.db`, il ripristino accetta anche il vecchio `database/project-p5r.db`.
- Il seed JSON non esiste più: i dati di gioco si aggiornano sostituendo `gioco.db` (import del pacchetto). `seed_meta`, la memoria dell'ultimo caricamento del seed, è uscita con la migrazione 096 (verifica completa, R3'), e con lei il campo `seed` dello stato dell'istanza.
- Schema in due famiglie (nato con le migrazioni 001–004; oggi `main` è alla 096 e `utente` alla 016). Le righe qui sotto descrivono
  il nucleo di allora; il caricamento era `caricaSeed` con l'hash in `seed_meta`, mentre oggi i dati di gioco arrivano con il
  pacchetto (`caricaPacchetto` / importazione) e le immagini stanno nella tabella `immagine` di `gioco.db` (079):
  - **dati di gioco** (`arcana`, `persona` + `persona_affinita` + `persona_skill`, `skill` + `skill_fonte_esecuzione`, `oggetto`,
    `fusione_arcana`, `fusione_speciale` + `_ingrediente`, `tesoro` + `tesoro_modificatore`, `eredita_matrice`, `dlc_set` + `_persona`,
    `confidente` + `confidente_rango` (punti necessari per rango, 0 = non a punti), `dote_sociale` + `dote_sociale_rango` (5 ranghi
    con nome e soglia), `traduzione` (compresi gli ambiti `skill`, `persona`, `oggetto`, `termine` della localizzazione italiana ufficiale
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
    gioco; la resa italiana si legge da `traduzione(ambito, chiave)`; i DTO espongono `nomeIt` per skill e Persona (fallback al canonico) e per l'equipaggiamento (`null` se la guida non lo nomina);
    la ricerca del compendio (Persona, skill, oggetti) confronta nome canonico e nome italiano senza accenti né punteggiatura (`shared/testo.ts`).

### Storico (Fase 5.1)
Migrazione 005: `evento_partita` (partita_id, tipo, titolo, dettaglio, dati_json, persona_id, created_at) con indici per partita/tipo/Persona.
`storicoService.registraEvento` viene chiamata dentro le transazioni di `partiteService` (atomicità con la modifica); i tipi e le
etichette italiane stanno in `shared/eventi.ts` (usati anche dal frontend per i filtri per gruppo). Lettura paginata con cursore
(`prima` = id dell'ultimo evento ricevuto) e totale del filtro; eliminazione singola per correggere errori.

### Obiettivi (Fase 5.2)
Migrazione 006: `obiettivo_partita` (persona_id, skill_json, livello_min, priorita, stato, note, raggiunto_at) con indice univoco parziale
sugli obiettivi aperti per Persona. `obiettiviService` non importa `partiteService` (che invece chiama `verificaObiettivi` dentro le
transazioni di aggiunta/aggiornamento in scorta): l'avanzamento (`skillMancanti`, `livelloRaggiunto`, `soddisfatto`) è calcolato a
ogni lettura sulla scorta attuale, la chiusura automatica scrive `raggiunto_at` e un evento nello storico. `skillDto` è condiviso in
`compendioService`.

### Piani salvati (Fase 5.3)
Migrazione 007: `piano_salvato` (persona_id, obiettivo_id SET NULL, nome, note, opzioni_json, skill_json, piano_json, costo). Il piano
arriva dal client (istantanea di `PianoFusioneDto`) ed è validato strutturalmente (schema zod finito di `LIVELLI_MAX_PIANO` = 8 livelli, che ferma con un 400 un corpo annidato all'infinito, + `verificaAlbero`: modi ammessi,
fusioni con ≥2 ingredienti, foglie senza figli, Persona esistenti, profondità ≤8). `pianiSalvatiService.avanzamentoPiano` percorre l'albero
con la scorta attuale: una fusione col risultato già in scorta chiude il sottoalbero; una fusione con tutti gli ingredienti in scorta è un
«passo eseguibile». `AlberoPiano` (FE) è condiviso fra la vista «Piano di fusione» e i piani salvati.

### Operazioni della Stanza di Velluto dalla scorta (Fase 5.4)
`operazioniVellutoService`: `anteprimaFusione` riusa il motore (`fondi` / `ricettaSpeciale`) e l'eredità (`analisiEredita` sugli esemplari
posseduti con le loro skill) e aggiunge il livello suggerito (`bonusLivelliFusione`), i punti dell'Allarme (`puntiAllarmeFusione` per Persona
«cariche») e le skill innate; `eseguiFusione` valida le skill scelte fra le candidate ereditabili (≤ `slotScelti`, tutti gli slot con l'Allarme),
rimuove gli ingredienti e crea il risultato tramite `aggiungiPosseduta` (compendio, eventi, obiettivi) marcandolo «carico» se durante l'Allarme;
`eseguiForca` e `eseguiIsolamento` registrano i valori osservati (livello, skill, punti) e gli eventi; migrazione 008 aggiunge `carica`.

### Cicli di fusione (Fase 5.5)
`cicliFusione.ts`: DFS dal bersaglio con cache delle fusioni per Persona (`fusioniDa`), partner procurabili (`registro` a prezzo di evocazione,
`scorta` gratis, `cattura` se ammessa e non speciale/rara/DLC), potatura per costo parziale rispetto alla K-esima alternativa, ventaglio massimo
per anello; risultati intermedi mai rari e sotto il livello massimo. `fusioneService.cicliDto` applica lo sconto del Registro e il bonus di
livello del Confidente per anello. `cicliSalvatiService` rivalida gli anelli inviati dal client (fusioni reali, catena continua, ritorno al
bersaglio), tiene anello corrente e iterazioni: l'esecuzione dell'anello passa per `eseguiFusione` (5.4) e poi `avanzaCiclo`.

### Confidenti completi (Fase 6.1)
Seed `data/seed/confidenti-dettaglio.json` (normalizzato dalla ricerca sulla guida allgamestaff: punti «+2»/«♪♪» → numero di note, scelte
romantiche e avvisi conservati, ranghi non numerici con etichetta). Migrazione 010: `confidente_abilita`, `confidente_dialogo` (scelte in
JSON), `confidente_regalo` (graditi e sconsigliati), `confidente_disponibilita` (+ note generali e fonti) ricaricate integralmente a ogni
cambio del seed; `regalo_partita` è tracking per partita. `compendioService.dettaglioConfidente` compone la scheda; `ConfidentePartitaDto`
espone `regaliFatti`.

### Domande in classe ed esami (Fase 6.2)
Seed `data/seed/domande.json` (domande per data con risposte in ordine, sessioni d'esame, premi). Migrazione 011: `domanda` (id stabile
per `ordine` nel seed: upsert, così `domanda_partita` non si perde al reseed), `esame`, `esame_premi`, `domanda_partita`.
`domandeService.domande(partitaId?)` calcola le prossime domande dalla `data_gioco` della partita (indice aprile→marzo);
`impostaDomandaFatta` è idempotente e, alla prima spunta, può aggiungere una nota alla Dote Conoscenza (`aggiornaDote`) e registra l'evento.

### Calendario di gioco (Fase 6.3)
Seed `data/seed/calendario.json` (giorni ed eventi dalla ricerca sulla guida allgamestaff + meteo wikiwiki.jp; lacune dichiarate nel
rapporto e non colmate). Migrazione 012: `giorno_calendario` (con la settimana della guida calcolata dal periodo «GG/MM - GG/MM»),
`evento_calendario`, `settimana_guida`, ricaricate integralmente. `calendarioService.calendario(partitaId?, mese?)` restituisce i giorni
(tutti o del mese), l'«oggi» della partita (`data_gioco`), le prossime scadenze/esami con i giorni mancanti (indice aprile→marzo).

### Dungeon e mappe interattive (Fase 7.1)
Seed `data/seed/dungeon.json` (normalizzato dalle nove ricerche sui Palazzi: aree in ordine e punti tipizzati). Migrazione 013: `dungeon`,
`dungeon_area`, `punto_interesse` (chiave stabile `<area>/<ordine>`, upsert al reseed con rimozione degli orfani), `marcatore_mappa`
(spillo in percentuale dell'immagine, dato dell'utente condiviso fra le partite), `punto_partita` (ottenuto/esaurito per partita).
Le piante delle aree sono immagini dell'utente nell'ambito `mappa` (tabella `immagine`, chiave = chiave dell'area), mai nel repository.
`MappaInterattiva` (FE) fa zoom/trascinamento con trasformazioni CSS e posiziona gli spilli in percentuale.

### Mementos e Richieste (Fase 7.2)
I nove Dedali sono aree del dungeon `mementos` (stesse tabelle e mappe della 7.1; le Ombre per Dedalo sono punti «persona» con i dati
in `dettagli`). Migrazione 014: `richiesta` (chiave stabile, bersaglio e ricompense in JSON, FK opzionali ad area e Confidente),
`richiesta_partita` (accettata/completata), `dati_guida` (JSON per chiave: «jose», poi «battaglia»). `richiesteService` espone elenco con
stato, aggiornamento con evento al completamento e i dati di Jose.

### Aiuto in battaglia (Fase 7.3)
`data/seed/battaglia.json` (generato dalla ricerca su allgamestaff) è salvato in `dati_guida` con chiave «battaglia»; `battagliaService`
lo restituisce collegando ogni maschera dell'indice delle Ombre alla Persona del compendio (confronto normalizzato su nome inglese e
italiano). L'indice unisce le tabelle dei Palazzi, le tabelle di negoziazione già nei punti dei dungeon e le Ombre dei Dedali
(deduplicate per dungeon + maschera).

### Città e attività (Fase 8.1)
Migrazione 015: `quartiere`, `luogo` (chiave `<quartiere>/<luogo>`, Confidenti e attività in JSON, piatti in JSON, flag `verificato`),
`attivita` (compresi i lavori, Doti in JSON), `libro`, `film`, `lettura_partita` (libri letti / film visti). Seed `citta.json` e
`attivita.json` generati dalla ricerca (allgamestaff + fonti secondarie segnalate). `cittaService` e `attivitaService`; evento «lettura».

### Negozi e inventario (Fase 8.2)
Migrazione 017: `negozio` (FK opzionali a quartiere e Confidente), `articolo` (chiave `<negozio>/<slug>`, categoria, destinatario, prezzo,
effetto, statistiche, disponibilità, `verificato`), `acquisto_partita`. `negoziService` espone elenco, scheda con acquisti, ricerca
(LIKE su nome/effetto/negozio, filtro categoria e destinatario con «tutti», massimo 300 risultati) e spunta con evento «acquisto».

### Guida giorno per giorno (Fase 7.5b)
(Dal 2026-10-01 le voci della giornata stanno in `voce_giornata` e le spunte in `spunta_voce_partita`: vedi «La giornata è canone».)
`giorno_percorso` (data 'MM-GG', azioni in JSON con riferimento risolto in fase di build del seed) e `azione_partita` (data + indice
dell'azione). Il giorno corrente è `partita.data_gioco`. `percorsoService`: indice leggero, scheda del giorno con precedente/successivo,
spunta con evento «percorso», impostazione del giorno corrente.

### Completamento (Fase 9.1)
Migrazione 019: `trofeo` (chiave stabile, tipo, come/quando, `verificato`) e `trofeo_partita`; finali, Covo dei Ladri, DLC, meteo, Nuova Partita+,
differenze e tempo sono JSON in `dati_guida` («completamento»). `completamentoService`: elenco con ottenuti, spunta con evento «trofeo».

### Sfide (Fase 9.2)
`sfide.json` è consultazione pura in `dati_guida` («sfide»); le domande del game show in TV riusano il modello `domanda` (tipo «altro», chi «Game show in TV») e quindi la spunta per partita.

### Piante delle aree (Fase 7.4) — *superato dal 2026-09-18*
Migrazione 020: `pianta_area` (URL, pagina, fonte, licenza, alternative in JSON) e colonna `origine` su `marcatore_mappa`. Fino al
2026-09-18 la pianta della guida si scaricava nell'istanza (ambito «mappa», chiave dell'area) al primo accesso all'area; con
`f82c42cf` («la pianta della guida esce di scena») la rotta `POST /api/mappe/piante/:area/scarica` e il servizio sono stati tolti, e
dal 2026-10-03 anche la funzione del client `scaricaPianta` e il pulsante «Scarica dalla guida» sulle planimetrie d'area (O9). Le
immagini delle piante già scaricate restano in `immagine` con la chiave dell'area: un'immagine di base di mappa con la stessa chiave
non si cancella con la mappa (`eliminaImmagineDellaMappa`). «Scarica dalla guida» resta solo per i quartieri (Fase 8.3).

### Mappe della città (Fase 8.3)
Migrazione 022: `pianta_quartiere` e `marcatore_luogo` (origine seed/utente). L'immagine del quartiere vive in `immagine` (ambito «mappa»,
chiave `citta-<quartiere>`), scaricata al primo uso; `MappaInterattiva` accetta etichette e colori per tipo e viene riusata per i luoghi.

### Personaggi (Fase 10.3)
`personaggi.json` è consultazione pura in `dati_guida` («personaggi»); il campo `confidente` collega alla scheda e al ritratto del Confidente
(`ImmagineEntita` ambito «confidente», con la coppia fedele/stilizzata della 10.1).

### Oggetti della guida (Fase 10.2)
`oggetti-guida.json` è consultazione pura in `dati_guida`; distinto dal compendio `oggetti` (equipaggiamento con statistiche) e dai cataloghi dei negozi (prezzi per punto vendita).

## 5 bis. API (step 0.4)

**Documentazione consultabile (voce 5 della verifica completa, 2026-10-04).** `GET /api/docs` apre Swagger UI e `GET /api/openapi.json`
restituisce il documento OpenAPI 3.1 (anche da Impostazioni → «Documentazione delle API»). Il documento non è scritto a mano:
- le rotte si leggono dalla pila dei router montati (`server/openapi/rotte.ts`);
- parametri, query e corpi vengono dagli schemi zod di `validate` (`schemiDiValidazione`), convertiti con `z.toJSONSchema` nella
  forma d'ingresso;
- lo stato di successo (200/201/204) e il tipo di risposta (JSON o file) si leggono dal gestore finale;
- sommario, descrizione, risposta (con il tipo `…Dto` di `shared/`) e codici d'errore stanno nel registro in italiano
  `server/openapi/descrizioni/` (un file per area). Per i corpi che non passano da `validate` il registro dichiara le varianti
  (catalogo, schema scelto da `:tipo`) o il corpo binario (`express.raw`).

`openapi.test.ts` fallisce se una rotta non ha descrizione o una descrizione non ha rotta, se un tipo `…Dto` citato non esiste,
se il registro dice JSON dove il gestore manda un file (o il contrario), se un codice d'errore dichiarato non compare nel server
(fuori da `server/openapi/`), e se il documento non è un OpenAPI 3.1 valido (`@seriousme/openapi-schema-validator`). Swagger UI è
servita dall'istanza (`swagger-ui-dist`, nessuna CDN: l'app si usa anche senza internet).

«Prova» (Try it out) parla con i dati veri, quindi è spento:
- per ogni metodo che scrive (`supportedSubmitMethods: ['get']`);
- per le GET con `senzaProva` nel registro. Sono le tre GET che non sono semplici letture o pesano troppo per una pagina:
  - lo scaricamento del database e lo ZIP dell'istanza, che lasciano una copia nella cartella d'appoggio;
  - l'esportazione delle mappe, che supera i 10 MB.

  Il documento le marca con `x-senza-prova`. Un plugin di Swagger UI toglie loro il pulsante, e un `requestInterceptor` le
  rifiuta comunque. È la scelta dell'utente del 2026-10-04 (DECISIONI).

La tabella qui sotto è il riassunto storico dello step 0.4: l'elenco completo e aggiornato è quello di `/api/docs`.

| Area | Endpoint principali |
|---|---|
| Compendio | `GET /api/compendio/arcani`, `/glossario`, `/termini` (glossario italiano ↔ inglese per categoria), `/fusione/regole`, `/persona?q&arcana&livelloMin&livelloMax&dlc&rara&speciale&skill`, `/persona/:id`, `/skill?q&elemento`, `/skill/:id`, `/oggetti?q&categoria`, `/confidenti` |
| Traduzioni | `GET /api/traduzioni?ambito&q&soloUtente`, `GET /ambiti`, `PUT /:ambito/:chiave {testo}` (→ fonte utente), `DELETE /:ambito/:chiave` (ripristina il seed) |
| Font (Fase 11.1) | `GET /api/font` (stato dei ruoli display/menu/decor), `GET /api/font/:ruolo/file`, `PUT /api/font/:ruolo` (file come corpo grezzo fino a 4 MB, formato TTF/OTF/WOFF/WOFF2 riconosciuto dalla firma), `DELETE /api/font/:ruolo`; file in `DATA_DIR/font/<ruolo>.<formato>`, nessuna tabella |
| Partite | `GET/POST /api/partite`, `GET /attiva`, `GET/PUT/DELETE /:id`, `POST /:id/attiva`; `GET /:id/doti` (punti, rango, nomeRango, sogliaProssima, mancanti, ranghi[]), `PATCH /:id/doti/:chiave {punti|delta|note 1–3 + libro/fortuna}`; `GET /:id/confidenti` (punti, puntiNecessari, mancanti, personaArcanoInScorta), `PUT /:id/confidenti/:chiave {sbloccato,rango,punti|deltaPunti|noteRisposta 1–3|regalo|uscita + bonusArcano/esame/invito,note}`; `GET /:id/compendio`, `PUT /:id/compendio/:personaId`; `GET/POST /:id/persona`, `PUT/DELETE /:id/persona/:possedutaId` |
| Fusione | `GET /api/fusione/fondi?a&b&partita|dlc` (esito con motivo), `GET /api/fusione/ricette/:personaId?partita|dlc&livelloMax&limite` (totale, totaleSenzaFiltri, ricette per costo), `GET /api/fusione/con/:personaId?…` (fusioni con la Persona come ingrediente), `GET /api/fusione/piani/:personaId?partita&profondita≤4&alternative≤10&catture&limitaLivello|livelloMax&skill=id,…(≤4)&slotFortunato` (piani ricorsivi con propagazione delle skill), `GET /api/fusione/velluto?partita` (sconto, Allarme, Gemelle, ranghi per arcano), `GET /api/fusione/eredita?a&b&partita&livelloA&livelloB` (slot, candidate, tratti), `GET /api/fusione/cerca-skill?skill=id,…(≤4)&risultato&partita&livelloMax&limite` (ricette che consentono le skill) |
| Immagini | `GET /api/immagini?ambito`, `GET /:ambito/:chiave`, `GET /:ambito/:chiave/file`, `PUT /:ambito/:chiave` (corpo grezzo `image/*`, max 8 MB), `POST /:ambito/:chiave/da-url {url}`, `DELETE /api/immagini?ambito` (rimozione multipla, 12.1), `DELETE /:ambito/:chiave` |
Ogni risposta porta le chiavi canoniche più i campi `*Nome` in italiano risolti da `traduzioniService`.

## 6. Motore di fusione *(fasi 1–4 realizzate)*
- `server/services/fusione/motoreFusione.ts`: snapshot in memoria del compendio (invalidato con le altre cache di gioco, `cacheDiGioco`, quando il pacchetto cambia) e contesti memoizzati per insieme di DLC posseduti;
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
- `server/services/fusione/eredita.ts` (Fase 3): snapshot skill/apprese/tratti/tipi/matrice; `slotEreditabili(totale)`, `elementoEreditabile(tipo, elemento)`,
  `skillAlLivello`, `skillPosseduta`, `analisiEredita(risultato, ingredienti)` (candidate con motivo, slot, tratti), `copre(analisi, skillIds)`.
  `fusioneService.ereditaDto` (bacino dalla scorta se posseduta) e `cercaPerSkillDto` (filtri rapidi per tipo e bacino, poi analisi completa).
- Propagazione delle skill a catena (Fase 4.1, in `alberoFusione.ts`): `opzioni.skill` richiede che il bersaglio abbia le skill; a ogni nodo
  `ripartisciSkill` assegna le richieste agli ingredienti che le possono portare (insieme `raggiungibili(p, prof)` memoizzato: innate + scorta
  + apprese per livello + ereditabili a catena filtrate per tipo), verifica compatibilità (tipo, non esclusive) e slot (`slotEreditabili` sul totale
  delle skill degli ingredienti, slot a scelta o anche quello casuale con `slotFortunato`); le foglie devono possedere le skill (scorta reale,
  innate al livello base) o apprenderle salendo di livello (`skillDaLivello`). I nodi espongono `skillPortate`.
- Bonus della Stanza di Velluto (Fase 4.2): `shared/bonusVelluto.ts` (sconti del Registro, moltiplicatore EXP del Confidente, moltiplicatori della
  Forca con interpolazione dei ranghi non documentati, tabella incensi/giorni/tier di resistenza dell'Isolamento, sblocchi delle Gemelle, effetti
  dell'Allarme) — regole e affidabilità in `docs/riferimenti/bonus-velluto.md`; `fusioneService.vellutoDto` (completamento compendio → sconto,
  ranghi per arcano da `confidente_partita`, Allarme dalla partita); i costi di ricette e piani sono scontati quando c'è la partita.

## 7. Frontend
- Layout tablet-first: `MainLayout` con `Sidebar` visibile da `lg` (1024px) e `BottomNav` fissa sotto (5 voci, 64px); verificato a 375/768/1280 px.
  Dal 2026-09-30 la `Sidebar` è richiudibile: `.barra-laterale` tiene il posto (210 px o 64 px), il pannello le sta sopra in
  assoluto e, ridotto, si allarga sopra il contenuto al passaggio del mouse (`hover: hover` e `pointer: fine`) o col fuoco da
  tastiera; la scelta sta in `preferenzeStore.menuRidotto` (localStorage `p5r-preferenze`, con `mappaHomeChiusa` per la Home).
  Home: `.home-griglia--mappa-chiusa` (da `preferenzeStore.mappaHomeChiusa`) ridispone carta e guida senza la mappa; la mappa
  diventa `.home-mappa--a-scomparsa` (assoluta a destra, nascosta con `visibility`, esce al `:hover` della `.home-linguetta` o
  di sé stessa con puntatore vero); `HomePage` avvolge `oggi.sullaMappa` perché riapra la mappa.
  Ritorno dalle mappe: `MainLayout` chiama `utils/ritornoMappe.annotaNavigazione(paginaPrecedente, percorso)` a ogni cambio
  di pagina; `MappaPage` ed `EditorMappaPage` chiudono verso `ritornoMappe()` (sessionStorage `p5r-ritorno-mappe`).
- **Cambio di giorno** (2026-09-30): `percorsoService.avanzaSeGiornoCompleto(partita, data)` — chiamata dalla rotta della
  spunta (`PUT /api/partite/:id/percorso`, per uid dal 2026-10-01: vedi «La giornata è canone») solo alla spunta — fa passare la
  partita al giorno dopo (fascia giorno) quando il giorno corrente ha tutte le voci del genere «azione» fatte, e la risposta porta
  `giornoAvanzato` (`GiornoAvanzatoDto`). FE: `utils/giornoAvanzato.seGiornoAvanzato` (store + avviso) da `GiornoGuida`;
  `useOggi` segue `attiva.dataGioco` e rilegge la giornata a ogni `meteoStore.versione`; `MeteoAlCambioGiorno` in `MainLayout`
  apre la scelta del meteo quando la data della partita attiva cambia (`meteoStore.richiesta`).
- **Doti solo a mano** (2026-09-30): `partiteService.aggiornaDote` la chiama solo `PATCH /api/partite/:id/doti/:chiave` (scheda
  Doti). Le fonti automatiche dicono che cosa il gioco dà (`DoteDaSegnareDto`, `nomeDote`): `EffettiAzioneDto.doti` / letture /
  turni / incontro delle spunte, `daSegnare` nelle risposte di `PUT …/letture` (differenza del registro
  `effetto_lettura_partita`, `attivitaService.daSegnareFra`), del contatore dei turni, di domande e cruciverba, e
  `ConfidentePartitaDto.doteIncontro`. `annullaEffetti` restituisce solo i punti del Confidente. FE: `utils/dotiDaSegnare.ts`
  (`dotiDaSegnareDaEffetti`, `promemoriaDoti`, `avvisaDotiDaSegnare`), `utils/percorso.avvisoSpunta`.
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

### Impatto visivo — fondamenta (Fase 11.1)
- **Tipografia a tre ruoli**: token `--font-display` (titoli, numeri), `--font-menu` (navigazione, pulsanti, chip), `--font-decor`
  (tasselli decorativi) in `src/tailwind.css`; ogni lista inizia con la famiglia dell'utente («P5R Display/Menu/Decor»), poi il
  predefinito libero auto-ospitato in `public/font/` (Anton, Bebas Neue, Special Elite, Inter; licenze in `public/font/LICENZE.md`),
  poi le riserve di sistema. Il browser sostituisce per singolo carattere i glifi che un font non contiene (accentate dei font P5).
- **Font dell'utente**: `stores/fontStore.ts` legge `GET /api/font` all'avvio e scrive le regole `@font-face` in `<style id="p5r-font-utente">`
  (URL con la data di modifica come anti-cache); `components/impostazioni/CaratteriEditor.tsx` carica/sostituisce/rimuove un file per
  ruolo con anteprima immediata. I file vivono solo nell'istanza (`data/font/` è in .gitignore e .dockerignore).
- **Sfondi a tema**: `components/layout/sfondi.ts` abbina prefisso di percorso → asset (Stanza di Velluto per Compendio/Skill/Fusione,
  con variante Allarme, e per Impostazioni; Mementos per la Guida; splash dell'identità per Home, Partita e schede dei Confidenti); `MainLayout` rende un livello `.sfondo-sezione`
  (assoluto, sotto il contenuto, velo scuro) sopra il pattern ripetibile; le card sono leggermente traslucide.
- **Intestazione comune** `components/shared/IntestazionePagina.tsx`: titolo h1 a tasselli (una parola per cartiglio, colori alternati,
  inclinazione, nome accessibile intero), sottotitolo, azioni, illustrazione da asset, collegamento «indietro»; usata da tutte le pagine
  di elenco; le schede di dettaglio usano la classe `.titolo-display` in attesa della loro riprogettazione (11.2–11.5).
- **`StellaCinque`** (`components/shared/StellaCinque.tsx` + `stellaGeometria.ts`): radar SVG a N assi con griglia, poligono animato
  con requestAnimationFrame (rispetta `prefers-reduced-motion`), vertici con badge da asset o testo, opzionalmente pulsanti.
- **Stati di pagina** (`PageState.tsx`): caricamento con gli otto fotogrammi `illustrazioni/caricamento-1…8` (animazione CSS a passi,
  ritardi negativi), errore con `illustrazioni/errore-senza-testo`, stati vuoti con illustrazione dedicata → neutra → icona
  (`useAssetMulti` in `assetStore`); l'ErrorBoundary mostra la stessa illustrazione.
- **Pulsanti e chip** a taglio diagonale disegnati in CSS: il riquadro resta rettangolare (outline di focus visibile), bordo e
  riempimento sono due pseudo-elementi ritagliati con `clip-path`; il testo resta nel carattere di lettura.
- **Regola di leggibilità** (richiesta dell'utente dopo la prima verifica): i font P5 compaiono solo dove sono grandi, cioè titoli a
  tasselli e nomi in evidenza (display, ≥ 17 px: anche il menu laterale), parole brevi dei tasselli rossi (menu), titoli degli stati
  vuoti e dei messaggi (decor, ≥ 26 px); pulsanti, chip, barra in basso e testi usano sempre il sans.

### Impatto visivo — Partita (11.2) e Compendio (11.3)
- **Doti**: `utils/doti.ts` (avanzamento continuo per rango con nucleo minimo) alimenta `StellaCinque` in `DotiSociali` (vertice → scheda
  della dote) e nella Home; le schede compatte conservano note, modificatori, −1/+1 e soglie.
- **Confidenti «poster»**: ritratto a tutta altezza (`ImmagineEntita` forma carta, adatta copri), filigrana `arcani/<slug>-senza-testo`,
  badge del rango dentro `AnelloAvanzamento` (progressbar accessibile), nome in display; stessa logica di punti e moltiplicatori.
- **Compendio**: preferenza `vistaPersona` (piastrelle/elenco, localStorage) nel `preferenzeStore`; `PiastrellaPersona` (arte 150,
  `LivelloBadge` in stile P5, icona dell'arcano, `BadgeStato` da `ui/badge-*` con riserva chip, `ui/tesoro-*` per i Demoni del Tesoro,
  affinità compatte); elenco compatto come alternativa.
- **Scheda Persona**: hero a tutta larghezza con sfondo `sfondi/mementos`, arte dentro `CorniceArte` (`ui/cornice-scheda`, riserva con bordo),
  arcano, livello grande, badge, statistiche a pentagono (`StellaCinque` con `ui/stat-*`) accanto alle barre; sezioni in due colonne da `xl`;
  icone degli elementi grandi nelle skill.

### Impatto visivo — Guida (11.4) e asset richiesti (11.6)
- **Indice della Guida**: `components/guida/sezioniGuida.tsx` (percorso, titolo, descrizione, icona di riserva) → `GuidaPage` a piastrelle
  con `guida/<chiave>` (asset in arrivo) e riserva vettoriale su cartiglio rosso.
- **Palazzi e Dedali**: `EmblemaDungeon` (`palazzi/<chiave>` → icona dell'arcano del sovrano → iniziale in display), `AnelloAvanzamento`
  con la quota dei punti gestiti nella partita, date e livello in chip brevi (`utils/testoBreve.ts`: `dataBreve`, `sintesi`) con il testo
  completo nel `title`; nella scheda del Palazzo i testi lunghi sono ripiegati con `TestoRipiegabile` («altro»/«meno»).
- **Asset richiesti a Codex** (§13 di `docs/grafica/prompt-immagini.md` (solo asset da consegnare; consegnati in `docs/grafica/archivio-grafico.md`), registrati in `stato-generazione-asset.md`): `ui/nav-guida(-attiva)`,
  15 `guida/*`, 10 `palazzi/*`, `ui/giorno`/`ui/sera`, 4 illustrazioni di stato vuoto (con varianti senza testo). Le chiavi sono già usate
  dai componenti: alla consegna nessuna modifica al codice.

### Impatto visivo — Guida giorno per giorno, calendario e sezioni (11.5)
- **Data in stile P5** `components/shared/DataP5.tsx` (giorno grande su cartiglio, mese e giorno della settimana; variante compatta ed evidenza)
  nella Guida giorno per giorno e nel Calendario (scheda «Oggi» e righe dei giorni).
- **Meteo a icone** `components/guida/MeteoIcona.tsx` + `utils/meteo.ts`: il testo della guida («Sereno/Nuvoloso», «Neve (ondata di gelo)») è
  scomposto in segmenti giorno/sera con la chiave dell'icona `meteo/<chiave>` (asset §11, in arrivo) e i modificatori caldo/freddo; riserva
  vettoriale (`iconeGuida.tsx`) e testo completo nel `title`/`aria-label`.
- **Fasce della giornata** `FasciaGiornata` («Di giorno»/«Di sera» con `ui/giorno`/`ui/sera`, riserva sole/luna) e azioni del percorso con
  ritratto del Confidente, emblema del Palazzo o `IconaCategoria` del tipo.
- **Copertine e categorie**: `MiniaturaMappa` (mappa del quartiere già scaricata nell'istanza, altrimenti icona) nelle schede della città;
  `IconaCategoria` (cartiglio rosso con icona) per tipi di negozio, categorie degli oggetti e schede delle attività.
- **Battaglia**: debolezze e resistenze delle Ombre e dei boss come chip dell'elemento con icona (`utils/elementiGuida.ts` riconosce i nomi
  italiani della guida: «Tuono» → elettricità, «Maledizione (dimezza)» → oscurità, «Attacchi fisici» → fisico…), testo della guida invariato.
- **Regola di leggibilità nella data compatta**: solo il numero del giorno resta in display (20 px); mese e giorno della settimana sono nel sans.

### Correzioni dal test (Fase 12.1)
- Catalogo dei riferimenti rimosso (l'app ha la propria grafica): niente `RIFERIMENTI_DIR`, niente `data/riferimenti/`; resta il caricamento
  singolo da `ImmagineEntita` e la rimozione multipla (`DELETE /api/immagini?ambito`, sezione «Immagini caricate» in Impostazioni,
  cache di esistenza azzerata da `immaginiCache.azzeraCacheImmagini`).
- Compendio: filtri nell'URL (`q`, `arcana`, `lvMin`, `lvMax`, `ordine`, `dir`, `dlc`, `catturabili`, `el`, `aff`, `img`) così il ritorno dalla scheda
  li conserva; ricerca e ordinamento sempre visibili, il resto in un pannello «Filtri» a gruppi etichettati (`.pannello-filtri`) con chip dei
  filtri attivi rimovibili e «Azzera»; `utils/ultimaPersona.ts` ricorda in sessionStorage la Persona aperta e la lista la evidenzia (`.card--evidenza`) al ritorno.
- Scheda Persona: stella con scala unica 0–99 (default) o adattata, ingrandimento in `Modal`; storico con `POST /api/partite/:id/storico/elimina`
  (`storicoService.eliminaEventi`, transazione) e selezione multipla nel componente; `SelettorePosseduta` + `AnteprimaPersona` (miniatura
  non interattiva: immagine caricata → asset `persona/<slug>` → iniziali) al posto delle tendine di Forca e Isolamento.
- Font dell'utente con `unicode-range` al latino di base: i glifi accentati mappati ma vuoti (P5 Hatty) arrivano dal font di riserva.
- `shared/PulsanteVisivo.tsx` (`PulsanteVisivo`, `CollegamentoVisivo`): pulsante o collegamento a tassello a immagine prevalente: icona
  (`iconeGuida` SVG o asset) di 40 px (32 px compatta, 48 px con `disposizione="colonna"`, 28 px nel popup dello spillo) imposta dal CSS
  del pulsante (`--btn-visivo-icona`, riempimento `!important` perché AssetImg usa stili inline), titolo in carattere display (14 px, 13 px
  compatto, 12 px a colonna) e dettaglio nel sans (11 px); toni primario/secondario/fantasma/pericolo, `attivo` per gli interruttori; usato in tutta
  la sezione Partita al posto dei pulsanti grigi di solo testo (regola dell'utente 2026-09-04). Schede e filtri: `chip chip--icona` con icona.
  Dal 12.8 la stessa regola vale in tutte le sezioni (pagine della Guida, Compendio, Impostazioni, finestre delle immagini e delle mappe,
  selettori della Fusione, «Filtri» del Compendio, «Salva piano», «Azzera i bonus», gli «Annulla» inline): i soli pulsanti di solo testo rimasti sono
  gli «Annulla» delle finestre modali. La variante compatta (`.btn-visivo--compatto`) riduce spaziature e icona ma mantiene i 44 px di altezza minima
  richiesti dalla regola tablet-first (`.touch`).
  Le icone vengono da `shared/IconaAzione.tsx` (`IconaAzione` → asset `ui/azione-<chiave>` §17, `IconaScheda` → `ui/scheda-<chiave>` §16, riserva SVG
  di `iconeGuida`): le chiavi sono il censimento degli asset richiesti a Codex.
- `StellaCinque`: riquadro quadrato (`aspect-ratio`) con `container-type: inline-size`; i badge ai vertici hanno altezza in `cqw` (proporzione
  `badgeAltezza/dimensione`) così restano in scala su ogni schermo; `badgeSotto` (tassello del rango) sta in angolo al badge; nome dell'asse in un
  suggerimento al passaggio del mouse (`.con-suggerimento`, `data-suggerimento`).

### Statistiche con bonus e istantanea del compendio (Fase 12.2)
- `persona_posseduta.osservate_*` e `compendio_partita.osservate_*` (migrazione 032, 15.26): valori reali letti nel gioco a un livello; da lì in su la stima riparte da loro (`statisticheStimate` in `shared/statistiche.ts`), registrarli azzera i bonus, l'istantanea del compendio li conserva e l'evocazione dal Registro li ripristina.
- `persona_posseduta.bonus_*` (migrazione 023): le statistiche effettive sono `statisticheStimate(base, livelloBase, osservate, livello) + bonus` (dal 15.26; prima `statistichePerLivello(base, livelloBase, livello) + bonus`)
  (clamp 1–99) e seguono il livello; i valori assoluti registrati prima della migrazione diventano scarti rispetto alla stima
  (`convertiAssoluteInBonus`, anche negativi per non perdere nulla) e le vecchie colonne restano NULL. Forca (`puntiStatistica`) e
  Isolamento (incenso) sommano al bonus. DTO: `bonus`, `statisticheStimate`, `statisticheBase` (= nessun bonus).
- `compendio_partita` conserva l'istantanea (`livello_registrato`, `bonus_*`, `skill_ids_json`, `tratto_skill_id`, `carica`): scritta
  quando una Persona entra in scorta (ottenerla la registra, come in gioco) e con `POST /api/partite/:id/persona/:possedutaId/registra`
  («Registra» sulla carta della scorta, mostrato quando l'esemplare differisce dall'istantanea); livello e bonus NON seguono più le
  modifiche automaticamente. `POST /api/partite/:id/persona` con `daRegistro: true` (evocazione) ripristina l'istantanea (400 se non
  registrata) senza toccarla. La registrazione manuale dal compendio personale crea un'istantanea di solo livello.

### Cicli di fusione: anelli minimi/massimi e partner distinti (Fase 12.5)
- `cicliFusione` accetta `lunghezzaMin` (2–`lunghezzaMax`) e `partnerDistinti` (default true: un partner non può ripetersi lungo la catena,
  così ogni giro usa Persona diverse); `GET /api/fusione/cicli/:id?lunghezzaMin&partnerDistinti` e selettori «Anelli da … a …» + chip
  «Partner distinti» nella vista Cicli.

### Descrizioni delle Persona (Fase 12.9)
- `data/seed/descrizioni-persona.json` (232 voci `{nome, descrizione, fonte}`, nel `FILE_SEED` e quindi nell'hash) → `UPDATE persona SET descrizione,
  fonte_descrizione` dopo l'upsert delle Persona (migrazione 024 aggiunge le colonne). Testi originali sull'origine della figura, mai il testo
  del gioco. `PersonaDettaglioDto.descrizione/fonteDescrizione`; scheda con riquadro «Chi è» ad altezza fissa e scorrimento verticale.

### Mappe a livelli e spilli dell'editor (Fase 13.1)
Studio in `docs/MAPPE.md`. Migrazione 027: `mappa` (albero con `genitore_chiave`, `immagine_chiave` nell'ambito «mappa» dell'istanza oppure
`asset` del repository, `larghezza`/`altezza`, `entita_tipo`/`entita_chiave` verso quartiere/dungeon/area, `origine` seed|utente, `note`),
`spillo` (x/y in percentuale dell'immagine, `tipo` del registro `shared/spilli.ts` — 42 tipi in quattro categorie (`CATEGORIE_SPILLO`, aggiornamento del 2026-09-29), tabella in MAPPE §4 —, riferimento tipizzato mappa|negozio|punto|luogo|confidente|
richiesta|attivita, `collezionabile`), `spillo_partita` (raccolto per partita). `server/services/mappe/sincronizzaMappe.ts` è idempotente:
crea `tokyo` → `citta-<quartiere>` e `dungeon-<chiave>` → `<area>` dalle tabelle della guida e trasforma `marcatore_mappa`/`marcatore_luogo` in
spilli (riferimento `punto`/`luogo`, stessa origine). Oggi gira solo dentro la migrazione 027 (O10 della verifica completa); al tempo del seed girava anche alla fine di `caricaSeed`, seguita
dall'importazione del seed `data/seed/mappe-editor.json` (origine «seed», mai sopra le mappe modificate dall'utente).
**Il nome con cui una mappa si presenta** (2026-09-13) lo calcola `src/utils/presentazioneMappa.ts`, e ci passano tutte le schermate:
titolo del visore e dell'editor, briciole, albero, indice, selettori, miniature (`titoloGruppoImmagini` per la testata di un gruppo di
versioni). L'ordine è: titolo del contesto selezionato → `nome` se `mappa.nome_rivisto` (migrazione 082: lo accende solo il salvataggio
dell'editor quando il nome cambia, lo spegne l'importazione di un pacchetto di mappe) → nomi dei contesti → nome del gruppo di immagini di
`mappa_presentazione` con l'etichetta della versione (`nomeConVersione`) → `nome` grezzo. Contesti e gruppo sono l'istantanea
dell'estrazione, scritta solo da `importaMappe`: senza il flag, correggere il «Nome» nell'editor non cambiava il titolo mostrato.
`server/services/mappe/mappeService.ts`: albero, dettaglio (percorso, figli, spilli con `dettaglio` dell'entità: articoli del negozio con
`comprato`, stato del punto, Confidente, richiesta) e stato «raccolto» (uno spillo di un punto già ottenuto/esaurito nella Guida conta come
raccolto; `impostaRaccolto` aggiorna anche `punto_partita`), editor (CRUD con validazione dei riferimenti e dei cicli genitore), immagine di
base (`impostaImmagineMappa`, corpo grezzo `image/*`, dimensioni da `dimensioniImmagine` PNG/GIF/JPEG/WEBP), `esportaMappe`/`importaMappe`
(pacchetto JSON versione 1 con immagini in base64; nessuna dipendenza ZIP disponibile). Rotte in `server/routes/mappe.ts` (`/albero`,
`/esporta`, `/importa`, `/entita/:tipo/:chiave`, `/:chiave`, `/:chiave/immagine`, `/:chiave/spilli`, `/:chiave/passaggi` (15.24: passaggio verso un'altra mappa nel punto libero più vicino al centro, o in basso per il ritorno al genitore; `creaMappa` accetta `passaggio`/`ritorno`), `/spilli/:id`) e
`PUT /api/partite/:id/spilli/:spilloId`; schemi zod in `server/schemas/mappe.ts`; client `src/services/api/mappe.ts`. Le vecchie rotte
dei marcatori e delle piante restano per le pagine attuali finché 13.4 non le sostituisce.
`importaMappe` senza «sovrascrivi» rimpiazza solo gli spilli della stessa origine del pacchetto: il seed aggiorna i propri spilli e conserva
quelli aggiunti dall'utente su una mappa del seed; `spillo.tipo` è validato dall'applicazione (zod + registro) e non da un CHECK, perché il
registro dei tipi può crescere senza migrazioni.

### Visore delle mappe (Fase 13.2)
Modello di mapgenie.io osservato dal vivo: barra laterale a sinistra con categorie e conteggi, «Mostra tutti/Nascondi tutti», ricerca,
segnalini a dimensione costante con icona per categoria, popup ancorato al segnalino, controlli dello zoom in basso a destra, tracciamento
dei trovati. `src/components/mappe/VisoreMappa.tsx`: zoom espresso rispetto al minimo «adatta» (stato `null` = adatta, così nessun effetto
imposta lo stato: `zoom = zoomEsplicito ?? zoomMin`), rotellina non passiva registrata a mano (React registra `wheel` come passivo),
pinch con due puntatori, trascinamento, doppio click per adattare; il livello è scalato (`translate(pan) scale(zoom)`) e gli elementi
ancorati (spilli, gruppi, popup) usano `scale(1/zoom) translate(…)` con origine 0 0 per restare a dimensione costante con la punta
sulle coordinate; raggruppamento «+n» per celle di 30 px sotto 1,6× il minimo. `IconaSpillo` (asset `ui/spillo-<tipo>` → riserva
SVG); `SchedaSpillo` con le azioni per tipo di riferimento; strumenti dell'editor (13.3) passati via `editor` (seleziona/sposta,
aggiungi). Pagina `MappaPage` (`/guida/mappe`, `/guida/mappe/:chiave`) con lo stato «raccolto» della partita attiva; i raccolti
sostituiscono lo spillo nel DTO locale senza ricaricare la mappa.
Azioni per partita dal visore: «Raccolto/Riapri» (collezionabili), «Ottenuto/Esaurito/Riapri» per gli spilli collegati a un punto della
Guida (`impostaStatoPunto`, stessi stati della scheda del Palazzo) e acquisto degli articoli del negozio collegato (`impostaAcquisto`);
`DettaglioSpilloDto.immagine` porta l'immagine dell'entità collegata quando esiste (mappa, Confidente).

### Editor delle mappe (Fase 13.3)
`src/pages/EditorMappaPage.tsx` riusa `VisoreMappa` con `editor` (strumento seleziona/sposta o aggiungi, spillo selezionato, click sulla
mappa, fine trascinamento, `onVisita` per il doppio tocco) e con `pannello`/`intestazione` propri.
**Collegamenti** (2026-09-13): l'albero dice chi contiene chi, `PassaggiMappa` dice dove si va e da dove si arriva. Le uscite sono gli
spilli di spostamento della mappa (`arrivoSpillo`), gli arrivi stanno in `MappaDto.arrivi` — gli spilli di altre mappe che puntano qui,
letti sia da `spillo_destinazione` sia dal riferimento `mappa` dei passaggi vecchi. Servono perché in città i collegamenti sono laterali
(sorelle, treni fra quartieri) e l'albero non li rappresenta. Nell'editor si naviga senza uscire dalla modifica: doppio tocco sul pin,
voci dell'elenco, «Apri l'arrivo» in cima al pannello dello spillo. Ogni modifica è salvata subito via API e la mappa viene ricaricata
senza smontare il visore (`isLoading` solo senza dati: zoom e posizione restano). Riferimenti cercati con `GET /api/mappe/riferimenti`
(`cercaRiferimenti`: LIKE su nome/chiave per tipo). Schermate degli spilli: migrazione 028 `spillo_immagine` (immagine dell'istanza
nell'ambito «spillo» oppure `asset` del repository, didascalia, ordine), rotte `POST /api/mappe/spilli/:id/immagini` (corpo `image/*`),
`PUT/DELETE /api/mappe/spilli/immagini/:id`; `SpilloDto.immagini` e `GalleriaSpillo` nel visore. Condizioni di visibilità (15.22): migrazione 029
`spillo.condizioni_json` (elenco di `RequisitoSpillo`, `shared/condizioniSpillo.ts`: data, intervallo, palazzo, dote, confidente, richiesta, piove,
meteo non-piove, fascia (giorno/sera, 15.23: `partita.fascia_gioco`), giorno-settimana, stagione, quartiere — solo condizioni calcolabili, validate da `condizioneSpillo` in `server/schemas/mappe.ts` e
dall'esistenza delle chiavi nella Guida); `spilloDto` restituisce `condizioni` con il testo in italiano (`descriviRequisitoSpillo` con i nomi dal DB)
e, con `?partita=`, `disponibilita` calcolata da `disponibilitaService.valutaRequisiti` sullo stesso stato dei semafori; il visore nasconde gli spilli
`bloccato` (interruttore «Mostra anche i non ancora disponibili»; la selezione iniziale da «Sulla mappa» o `?spillo=` riaccende il filtro se
serve), l'editor le costruisce da selettori (`CondizioniSpilloEditor`: date esistenti nel calendario di gioco, periodi con fine ≥ inizio), pacchetti ed
esportazione le trasportano nel campo `condizioni` dello spillo (all'importazione le voci con chiavi assenti dalla Guida sono scartate e contate in
`EsitoImportazione.condizioniScartate`). Uno spillo del seed modificato dall'utente diventa `utente` e conserva la propria identità di allora in
`spillo.seed_identita_json` (migrazione 030): il reseed non lo reinserisce (niente doppioni, condizioni e modifiche conservate). `sincronizzaMappe` crea anche i passaggi
verso le mappe figlie (Tokyo → quartieri, Palazzo/Dedalo → aree) disposti in griglia, da trascinare nell'editor: la mappa globale di Tokyo
e la mappa verticale dei Mementos sono immagini dell'utente nell'istanza (mai nel repository) con i quartieri e i Dedali come passaggi;
gli accessi ai Palazzi e ai Mementos sono passaggi dentro le mappe dei luoghi (es. la stazione di Shibuya). Esportazione: `esportaMappe(radice)`
limita al sottoalbero e produce un pacchetto JSON (al tempo del seed `creaPacchettoRepository`, poi tolto, ne faceva uno ZIP con `data/seed/mappe/<chiave>.json`
(immagini di base come `asset: mappe/<chiave>`, schermate come `asset: spilli/<mappa>/<n>-<m>`) e i file in `public/asset/`;
`caricaSeed` importa `mappe-editor.json` e poi ogni `data/seed/mappe/*.json` (nell'hash del seed).

### Integrazione delle mappe nelle pagine (Fase 13.4)
`src/hooks/useMappaPartita.ts` (mappa con la partita attiva, azioni raccolto/punto/acquisto con aggiornamento locale, `versione` per ricaricare,
`onCambiato` per avvisare la pagina ospite) è condiviso da `MappaPage` e da `src/components/mappe/MappaIncorporata.tsx` (visore `incorporato`
ad altezza fissa — `altezza`, 560 px se non indicata — o data dalle classi di `classeVisore`, con «Schermo intero» e «Modifica mappa»). «La città» mostra la mappa `tokyo` sopra le piastrelle (`MiniaturaMappa`: immagine
dell'istanza → asset `mappe/<chiave>` → icona); la scheda del quartiere mostra `citta-<q>`; la scheda del Palazzo mostra la mappa dell'area
corrente e tiene allineati elenco dei punti e visore (l'elenco ricarica il visore con `versione`, il visore ricarica la scheda con `onCambiato`).
Il vecchio `MappaInterattiva` e le funzioni client dei marcatori sono rimossi: il posizionamento vive solo nell'editor. Le rotte server dei
marcatori (`PUT /api/mappe/marcatori`, `/marcatori-luoghi`) sono uscite con la verifica completa (O10, 2026-10-04): le chiamavano solo i
test. Le tabelle `marcatore_mappa` e `marcatore_luogo` restano e si leggono nelle schede.

### Scheda «Oggi» e stato delle azioni della guida (Fase 12.4 / 13.5)
`GiornoGuida` (`src/components/guida/GiornoGuida.tsx`) rende la scheda del giorno e le azioni (spunta con note del Confidente, collegamenti,
«Sulla mappa» quando l'azione ha una mappa collegata) ed è usato dalla pagina della guida e da `OggiPartita`
(`src/components/partita/OggiPartita.tsx`: scheda «Oggi» predefinita della Partita e sezione «Oggi» della Home) con `MappaIncorporata`
accanto (Tokyo, poi la mappa dell'azione scelta con lo spillo centrato: `VisoreMappa.selezioneIniziale`, `MappaPage` con `?spillo=`).
`percorsoService.giornoPercorso` calcola per ogni azione `stato` (con partita: `statoAzione` valuta i semafori del rango atteso del
Confidente — rossi → bloccata con motivo, tutti verdi → consigliata, grigi → neutra «da confermare») e `mappa` (`mappaAzione`: Palazzo →
`dungeon-<k>`, richiesta → `dungeon-mementos`, negozio/Confidente → spillo del luogo in città). `creaPartita` imposta il giorno corrente al
primo giorno del percorso (04-09). Home, scheda «Oggi» e «Doti sociali» della Partita stanno in una schermata senza scorrimento su
desktop e tablet (`.home`/`.scheda-riempi`: altezza della finestra meno la cornice; scorrono solo la guida del giorno e l'elenco delle Doti;
la mappa incorporata riempie la colonna); lo schermo intero della mappa si apre in pagina («Torna alla pagina» o Esc) senza cambiare
rotta. Cache delle immagini: gli URL dei file caricati sono versionati (`urlImmagineVersionata`: data di creazione dall'elenco + contatore
locale) e il server risponde con `Cache-Control: private, max-age=31536000, immutable` quando c'è `?v=`, altrimenti rivalidazione; gli
asset del repository hanno un'ora di cache piena in nginx (`stale-while-revalidate` di un giorno). Esportazione delle mappe: il pacchetto è completo (immagini di base e schermate degli spilli sempre incluse, puntate come asset);
la provenienza delle immagini scaricate dalle guide è solo annotata (`provenienze`, LEGGIMI) — decisione dell'utente del 2026-09-04 sera,
che supera la precedente esclusione.

### Semafori dei Confidenti e punti dalla guida (Fase 12.3)
- `data/seed/confidenti-requisiti.json` (estratto dalle note di `confidenti-dettaglio.json`; tipi dote, persona-arcano, palazzo, richiesta,
  confidente, data, meteo, manuale) → `confidente_requisito` (migrazione 026, ricaricata dal seed); conferme manuali in `requisito_partita`.
  Blocco (specifica 12.3): `ConfidentePartitaDto.bloccato` = requisiti non verdi del rango successivo; `aggiornaConfidente` rifiuta con 409
  `confidente-bloccato` ogni aumento di rango (e lo sblocco) verso un rango i cui semafori non sono tutti verdi o confermati; la carta è spenta
  (`poster--bloccato`) con i motivi e «+»/sblocco disattivati. Elenco dei requisiti manuali e condizionali: `docs/riferimenti/semafori-confidenti.md`.
- **Tipi di luogo** (2026-09-12, `shared/tipiLuogo.ts`: `TIPI_LUOGO`, `definizioneTipoLuogo`, `ordinaTipiLuogo`, `spilloPerLuogo`): dieci tipi con nome e icona (uno spillo dell'atlante); il colore è quello dello spillo (`DEFINIZIONI_SPILLO`) e `spilloPerLuogo` (spostata qui da `shared/spilli.ts`, usata da `sincronizzaMappe`) ne deriva; `riallineaSpilliLuoghi` (in `sincronizzaMappe.ts`, chiamata dalla sincronizzazione, in coda a `caricaSeed` e all'avvio) porta gli spilli di seed rimasti alla vecchia corrispondenza al tipo del catalogo, senza toccare i tipi più fini dei pacchetti. `LuogoDto.tipo` è tipizzato, `NOME_TIPO_LUOGO`/`COLORE_TIPO_LUOGO` del frontend ne derivano. Nella Città il cartellino sulla mappa di Tokyo apre il visore (`MappaTokyo`), la scheda apre `/guida/citta/:chiave`; `IngressoQuartiere` salva al tocco sull'immagine. I personaggi senza Confidente hanno la coppia fedele/stilizzata come i Confidenti (`chiaviAssetPredefinito`).
- **Categorie di spillo** (2026-09-12, `shared/spilli.ts`: `CATEGORIE_SPILLO`, `categoriaSpillo`, `tipiDellaCategoria`, `RIFERIMENTI_PER_CATEGORIA`, tipo nuovo `ingresso-palazzo`). Ogni tipo sta in una categoria — spostamento, città, consumabile, informativo — e la categoria decide il resto: `applicaRegoleCategoria` in `mappeService` (creazione, aggiornamento, importazione dei pacchetti e confronto «invariato nel seed») forza `collezionabile` (solo i consumabili), azzera le condizioni degli spilli di città, rifiuta con 400 `riferimento-non-ammesso` un riferimento estraneo, toglie la destinazione a chi non è uno spostamento (migrazione 065 per i dati esistenti; `sincronizzaMappe` non scrive più condizioni sui pin dei luoghi). **Destinazione** (`destinazioniSpillo.ts`): `{ mappa, spillo | null }` in API e DTO (`spillo_destinazione.spillo_arrivo_id`; `x`, `y`, `zoom` restano solo per leggere i pacchetti vecchi), nei pacchetti `{ mappa, spillo: { nome, x, y } | null }` risolto all'importazione da `risolviSpilloArrivo` (nome uguale, altrimenti il più vicino entro l'8%); `spilloDto` aggiunge `destinazioneNomi`. Frontend: `navigazioneMappa.ts` (`arrivoSpillo`, `urlMappa(mappa, { spillo })` → `?spillo=`, la mappa si adatta alla finestra e il pin è selezionato), `NavigazioneSpillo` («Vai: …»), popup di `VisoreMappa` per categoria (`MerceNelPopup`; il popup scorre di lato per restare nella tela, `--spillo-popup-freccia`; sotto i 768 px è un portale su `document.body` reso come foglio dal basso), `FormSpillo` dell'editor per categoria (`DestinazioneSpostamento`, `CollegamentoCitta` con `Selettore` su `cercaRiferimenti(tipo, '', 100)`), palette di «Aggiungi» per categoria.
- **Condizioni = stati della partita** (2026-09-11). `shared/condizioniSpillo.ts` è il vocabolario, uguale per spilli, articoli, negozi, attività, libri e film: `data`, `intervallo`, `fascia`, `piove`/`meteo`, `giorno-settimana`, `stagione`, `quartiere`, `arco` (arco della storia, dalla data di gioco e da `finestre-dungeon`), `palazzo`, `dote`, `confidente`, `squadra`, `richiesta`, `lettura`, `articolo`, `attivita` (svolta n volte), `rango-cliente` (dalla spesa nel negozio), `punti-negozio`, `evento` (catalogo `EVENTI_STORIA`), `contatore` (`CONTATORI`), `persona-arcano`, `persona-abilita`; gruppi `tutte`/`almeno-una` e `non` annidabili fino a 5 livelli. Non esistono condizioni testuali (`da-configurare` e lo `stato` a nome libero sono stati tolti dalla migrazione 064 insieme a `fatto_gioco`/`fatto_partita`). `shared/statiPartita.ts` è il catalogo che guida l'editor (stato → operatori → campi) con `costruisciCondizione`/`scomponiCondizione` l'una inversa dell'altra.
- **Prosa → stati una volta sola**: `shared/migraCondizioni.ts` (`convertiProsa` → `{ condizioni, scartate }`) converte le frasi della guida al caricamento del seed (`sincronizzaDateQuartieri` prima, poi `sincronizzaCondizioniCatalogo`/`Letture`), nella migrazione 064 e nell'esportazione del seed; ciò che non converte non diventa una condizione. Il contesto (nomi → chiavi di richieste, libri, film, articoli; quartieri datati; libri di Jinbocho; finestre dei Palazzi) lo costruisce `server/services/condizioni/contestoConversione.ts` (`contestoConversione(db)` + `contestoRiga` per negozio e gestore). Non c'è più nessuna lettura di prosa a runtime né a ogni avvio.
- `disponibilitaService`: `statoDisponibilitaPartita` = `statoPartitaSemafori` + giorno della settimana + sblocchi dei quartieri + letture, contatori, attività svolte (`attivita_svolta_partita`), spesa per negozio (somma dei prezzi degli acquisti), punti negozio (`punti_negozio_partita`), eventi (`evento_storia_partita`), `arcoCorrente`; `valutaRequisiti(condizioni, stato)` → `{ stato: disponibile | bloccato | ignoto, requisiti }` (rosso ⇒ bloccato; grigio solo quando alla partita manca il dato); `valutaRequisitiSpillo` nasconde il pin solo per le condizioni di presenza (`CONDIZIONI_DI_PRESENZA`, ora anche `arco` e `spillo`). I requisiti dei Confidenti passano da `semaforiService.valuta`.
- **Condizione «Pin di una mappa»** (2026-10-03, `{ tipo: 'spillo', spillo: uid, segnato }`): lo stato di un altro pin nella
  partita — qualunque pin con uno stato (`statoCitabile`, letto da `nomiCondizioni.pinCitato`: la parola del tipo, «parlato»,
  «incontrato», «aperto», «azionato»…, o «ottenuto» per un pin con una voce della guida non descrittiva) —, letto da
  `spilliSegnati` dello stato della partita (`spillo_partita` più i pin la cui voce della guida è segnata, la stessa regola del
  visore). In un'importazione i pin dello stesso pacchetto si accettano all'inserimento e si verificano a pacchetto inserito,
  con le voci già scritte, così l'esito non dipende dall'ordine. È di presenza e si combina con TUTTE / ALMENO
  UNA / NON. È l'unica che nasconde anche un elemento fisso del gioco (porta, meccanismo nativi): in `dettagliSpillo` un pin
  fisso nativo con condizioni che non valgono porta `disponibilita.restaInVista` (il visore lo mostra marcato invece di
  nasconderlo, `VisoreMappa.nascostoPerCondizioni`), salvo quando `bloccatoDaAltriPin` (proiezione sui soli `spillo`) è vero; il
  blocco dell'ingresso a un Palazzo completato si applica dopo e lo toglie comunque. Il riferimento è per uid, quindi
  sopravvive a reseed e pacchetti; un pin eliminato o diventato senza stato lascia la condizione grigia, e `ChipDisponibilita`
  dice «Da correggere». Validazione (`condizioniConChiaviEsistenti`): pin esistente e con stato, nel database o fra quelli
  dello stesso pacchetto in importazione (ricontrollati a pacchetto inserito); solo nelle condizioni dei pin delle mappe
  (`verificaCondizioni(…, perSpillo)`: una scheda della guida senza mappa risponde 400 `condizione-solo-pin`; il catalogo,
  effetti compresi, la rifiuta nello schema, 400 `validation-error` col motivo nei `details.issues`); nessun pin che dipende da se stesso e nessun giro (`condizioniTraPin.verificaGiro`: 400
  `condizione-su-se-stesso` / `condizioni-in-giro`, anche per un pacchetto). L'editor la offre solo con `perSpillo` e senza il
  pin aperto (`pinCorrente`, l'uid ora nel `SpilloDto`), con l'elenco `GET /api/condizioni/spilli` (pin con stato, raggruppati
  per «genitore › mappa»); i nomi per le descrizioni vengono da `nomiCondizioni().spilli` (non letti dagli elenchi del
  catalogo, `nomiCondizioniMemo`). Un NON su un gruppo misto (presenza e prerequisiti) non nasconde da solo
  (`proiezioneDiPresenza`).
- `/api/condizioni`: `/elenchi` (articoli, letture, arcani, Persona, abilità, Ladri, attività, negozi, eventi, contatori — gli elenchi chiusi dell'editor); `/partite/:id/progressi` e i `PUT .../eventi/:chiave`, `.../attivita/:chiave`, `.../punti-negozio/:chiave` (scheda **Partita → Progressi**, `ProgressiPartita.tsx`). Frontend: `guida/CondizioniEditor.tsx` (righe `[NON] [Stato ▾] [operatore] [valori]`, blocchi TUTTE/ALMENO UNA, numeri a passi) e `shared/Selettore.tsx` (2026-09-12: l'unico elenco chiuso dell'app — pulsante `combobox` + `listbox`, ricerca scrivendo da dieci voci in su o con `ricerca="sempre"`, voce `vuoto` in testa, gruppi, variante `compatto` per i filtri; `utils/selettore.ts` con `opzioniDaNomi` e la soglia; nessuna `<select>` nel frontend, vietata da ESLint e da `src/selettoriUnificati.test.ts`).
- `semaforiService`: stato della partita letto una volta (Doti, arcani in scorta, Palazzi completati — `palazziService` —, richieste completate, ranghi, giorno e meteo
  correnti, conferme, eventi di storia avvenuti) e valutazione per requisito → `SemaforoRequisitoDto` (verde/rosso/grigio, dettaglio, manuale, confermato,
  `bloccante`); `ConfidentePartitaDto.semafori` per i ranghi superiori; `PUT /api/partite/:id/confidenti/:chiave/requisiti`.
  Requisito `evento` (migrazione 090, 2026-09-30): legge `evento_storia_partita`, e il «Condizione soddisfatta» (`confermaRequisito`) scrive l'evento
  (`impostaEventoStoria`, la stessa del `PUT /api/condizioni/partite/:id/eventi/:chiave`) invece di una conferma in `requisito_partita`; Partita →
  Progressi mostra per ogni evento i ranghi che sblocca (`ranghiPerEvento` → `serveA`). Requisito `avviso`: grigio con `bloccante: false`, escluso da
  `pronto`, da `bloccoRango` e dal conto «n di m» di `SemaforiRango`, non confermabile (400 `requisito-non-confermabile`).
- **Meteo della partita** (2026-09-30): `shared/meteoPartita.ts` (`METEO_PARTITA`, `fasceDellaGuida`, `guastaLAperto`, `piove`,
  `leggiDateAllerta`, `ALLERTA_PIOGGIA`); `meteoService` (`meteoDelGiorno` fascia per fascia: scelto in `meteo_partita` —
  utente 013 —, altrimenti pioggia se c'è la pioggia torrenziale, altrimenti la guida `giorno_calendario`/`giorno_percorso`;
  `allerte` da `allerta_meteo` — migrazione 091 —; `meteoOra` per giorno e fascia correnti; `impostaMeteo`). API
  `GET|PUT /api/partite/:id/meteo/:data` (il PUT restituisce anche la partita), `PercorsoGiornoDto.meteoPartita`,
  `PartitaDto.meteoOra`. `StatoPartitaSemafori.meteoOra` sostituisce `meteoOggi` (semafori `meteo` e disponibilità `piove`).
  Frontend: riga `momento-meteo` in `OggiGuida` con `MeteoGiornata` (quattro icone, `utils/meteoFascia.ts`), `useOggi.impostaMeteo`;
  `meteoOra` nelle chiavi di ricarica di `useMappaPartita`, `ContenutiGuidaMappa`, `EditorMappaPage`, `NegozioPage`, `NegoziPage`.
- Percorso: la spunta (`giornataService.spuntaVoce` dal 2026-10-01, prima `impostaAzione`) applica gli effetti dichiarati
  della voce (`produce`, con `effettiAzioneService` dal 2026-09-30: vedi «Effetti delle azioni della Guida»; `noteRisposta` 1–3
  per gli incontri con un Confidente col bonus dell'arcano dalla scorta) e li registra in `spunta_voce_partita.effetti_json`
  (prima `azione_partita.effetti_json`, migrazione 025) per annullarli togliendo la spunta (le letture restano);
  `AzionePercorsoDto.effetti`; scelta delle note nella pagina Percorso.

### Fusione: revisione visiva (Fase 14)
- `components/fusione/PersonaChip.tsx`: tassello con `AnteprimaPersona`, nome e livello (variante `evidenza` per risultato/bersaglio, `inScorta`);
  usato in `RicettaRiga`, `AlberoPiano`, `CicliFusione`, ricette speciali e (come pulsante) nei risultati di «Cerca per skill».
- `pianiDto` restituisce `motivo` (`non-fondibile` | `skill-non-ereditabili`) calcolato con `ricettePer`, `tipoEredita` ed `elementoEreditabile`
  prima di cercare i piani; il frontend lo mostra in un riquadro dedicato.
- `FusionePage`: schede principali con `IconaScheda fusione-*`; le viste di calcolo (Due arcani, Matrice, Demoni del Tesoro) solo con `?strumenti=1`.
- Tasselli Persona (`PersonaChip`, `.persona-chip*`): taglio diagonale, cornice rossa con la figura intera (`AnteprimaPersona contieni`), nome nel carattere P5 (17/19 px), tessera «Lv N», icona dell'arcano (`arcani/icona/<slug>`), rombo dorato per le rare, spunta verde d'angolo per la scorta (classe `persona-chip--scorta` conservata per i test). Operatori `OperatoreRicetta` («+» rosso, freccia bianca) condivisi da `RicettaRiga`, `CicliFusione` e ricette speciali; righe `.ricetta-riga` con tipo a etichetta, costo P5 e barra rossa quando tutti gli ingredienti sono in scorta; anche «Fusioni speciali» della scheda Persona, «Cicli salvati», «Piani salvati» e la finestra «Esegui la fusione dalla scorta» usano gli stessi tasselli (14.11).

### Alone dorato, scuola del giorno, formati e requisiti Royal (Fase 15)

- **Suggerimenti del giorno** — `server/services/suggerimentiService.ts`, rotta `GET /api/partite/:id/suggerimenti`, DTO `SuggerimentiOggiDto` (campo `giorno`, non `data`: `responseShapeMiddleware` non avvolge un payload che ha già una chiave `data`). Dalle azioni del giorno corrente ancora da fare e **non bloccate** (`statoAzione`) ricava le chiavi da accendere: confidenti e personaggi, dungeon e aree, libri/film e gli articoli a scaffale risolti per slug (30 libri su 46), attività, richieste, negozi, luoghi, quartieri, doti (lette dal testo «Dote +N»: 250 azioni contro 2 riferimenti espliciti), mappe e spilli. Lato client `src/stores/suggerimentiStore.ts` (`useSuggerimenti()` → `evidenziato`, `motivo`), `src/utils/suggerimenti.ts` (`classiSuggerito`), `TargaSuggerito`; `GiornoGuida` invalida lo store alla spunta. CSS `.suggerito*`, `.targa-suggerito`, `.spillo-mappa--suggerito`, token `--color-oro`.
- **Scuola del giorno** — `src/components/partita/ScuolaOggi.tsx` nell'intestazione di `PartitaPage`: filtra lato client `getDomande`/`getCruciverba` sul giorno di gioco; per le date d'esame usa le domande numerate di `esami` e il riassunto dell'elenco generale solo come ripiego (nei dati reali i due elenchi non condividono mai il testo).
- **Semafori** — nuovo tipo `persona-abilita` (`RequisitoRango` in `shared/types.ts`, `semaforiService`): verde quando la scorta contiene la Persona indicata con quella skill (`persona_posseduta` × `persona_posseduta_skill` × `skill`). Seed dei requisiti ricostruito dalla guida Royal (vedi `docs/riferimenti/semafori-confidenti.md`); regola di merito: un semaforo è solo ciò che il gioco impone.
- **Spilli** — `sincronizzaMappe` riclassifica (quando gira: oggi solo nella migrazione 027) gli spilli di origine `seed` con riferimento `punto` quando `spilloPerPunto` cambia (tipo e collezionabilità), senza toccare gli spilli dell'utente né `spillo_partita`; restituisce `riclassificati`.
- **Spilli dall'asset** — `SpilloGrafico`/`PuntoSpillo` (`src/components/mappe/IconaSpillo.tsx`): se `ui/spillo-<tipo>` esiste è lo spillo intero (`.spillo-mappa__figura`, punta sul punto ancorato), altrimenti la goccia colorata col disegno di riserva; legenda, elenco e popup usano la stessa immagine in piccolo.
- **Personaggi** — ambito immagine `personaggio` (`AMBITI_IMMAGINE`, `chiaviAssetPredefinito` → `personaggi/<chiave>`): Protagonista, Stanza di Velluto e Jose usano `ImmagineEntita` come i Confidenti; `PersonaDelPersonaggio` apre la Persona in una finestra al tocco.
- **Home desktop** — da 1360 px `.home-griglia` è «carta mappa / oggi mappa» (5/12 + 7/12), senza accessi rapidi; la stella della carta è `max(230px, min(40vh, 50cqw, 420px))` (`.home-carta` è un contenitore di query).
- **Doti a scalini** — `puntiDaNote(note, libro, fortuna, cinema)` (`server/services/partiteService.ts`): scalini 2/3/5/7, libro a resa maggiorata = quarto scalino, «Anima da cineasta» +1 scalino (solo film e DVD), poi ×1,5 per difetto. Alla spunta di un'azione della guida le Doti vengono dagli **effetti dichiarati** dell'azione (`produce`, dal 2026-09-30: vedi «Effetti delle azioni della Guida»), in NOTE (1–3) convertite in punti; lo scalino del cinema scatta da solo per le azioni `dvd` e per quelle con `riferimento` di tipo `film` se `lettura_partita` contiene il libro `anima-da-cineasta`. `EffettiAzioneDto.doti[]` porta `delta` (punti applicati, usati per l'annullamento), `note` e `cinema`.
- **Formati** — `Topbar` e `PartitaSelettore` stanno in 375 px (logo e selettore restringibili); `.titolo-tasselli` scala sulla larghezza (`clamp(20px, 5.4vw, 42px)`); `FilaScorrevole` (`src/components/shared/FilaScorrevole.tsx`, CSS `.fila-scorrevole`) rende le file di schede/filtri una riga sola scorrevole sotto i 768 px, con la scheda attiva portata in vista; `.home-griglia` con aree per telefono/tablet/desktop; `.kpi-griglia` 2/3/auto colonne; `.sr-only { top:0; left:0 }` fuori dai layer perché un riquadro assoluto da 1 px in fondo a un elenco che scorre allungava il documento (seconda barra verticale); `.btn-nota` compatto col mouse e 44 px sui dispositivi a tocco.

### Backup e ripristino dell'istanza (Fase 15.29)

- `server/services/impostazioniService.ts` + `server/routes/impostazioni.ts` (`/api/impostazioni`, montato in `bootstrap.ts`): `GET /istanza` (stato: versione dello schema e dell'app, hash del seed, dimensioni di database/immagini/caratteri, partite, copie di sicurezza), `GET /istanza/database` (il file SQLite, `Content-Type: application/vnd.sqlite3`), `GET /istanza/completa.zip` (database + `DATA_DIR/immagini` + `DATA_DIR/font` + `manifest.json` + `LEGGIMI.txt`), `PUT /istanza` (corpo grezzo fino a 512 MB, `.db` o ZIP).
- L'esportazione usa `getDb().backup()`, la stessa API online del backup di avvio: consistente con il WAL attivo e senza bloccare le scritture. Le risposte binarie passano da `res.download`/`res.send`, quindi l'envelope `{ data }` di `responseShapeMiddleware` (che tocca solo `res.json`) non le incapsula.
- Il ripristino **sostituisce** l'istanza: valida il file (firma `SQLite format 3`, `integrity_check`, presenza delle tabelle di base e `user_version > 0`), salva una copia di sicurezza in `data/backups/prima-del-ripristino-<istante>/` (database + immagini + caratteri), chiude la connessione, scrive i file (rimuovendo `-wal`/`-shm` della vecchia connessione), riapre, riesegue migrazioni e seed e invalida le cache in memoria (traduzioni, motore di fusione, ereditarietà). Se qualcosa fallisce dopo la chiusura, la copia di sicurezza viene ripristinata e l'app resta utilizzabile. Le voci dello ZIP che porterebbero fuori da `DATA_DIR` non vengono scritte: il controllo è sul percorso risolto (`path.relative` dalla cartella di destinazione), non sul nome, perché su Windows anche `\` separa. Il rollback riapre il database prima di rimettere a posto le cartelle, così l'app non resta mai senza connessione; `closeDb()` azzera la connessione anche se la chiusura fallisce. Delle copie di ripristino si conservano le ultime tre.
- FE: `src/services/api/impostazioni.ts` (nome del file dal `Content-Disposition`) e `src/components/impostazioni/BackupIstanza.tsx` in fondo a Impostazioni: stato dell'istanza, «Scarica l'istanza completa», «Ripristina da file» con conferma; dopo il ripristino ricarica le partite nello store. Il solo file dei dati di gioco si scarica e si importa dalla card «Pacchetto di gioco» (voce 10).

### Immagini nel database e pacchetto di gioco (voce 10, 2026-09-12)

- **Regola (decisione dell'utente)**: in `public/asset/` restano solo compendio (persona, arcani, skill) e interfaccia (`ui/`); ogni altra immagine — mappe, spilli, Confidenti, personaggi, sfondi, identità, illustrazioni, gruppi di Persona, palazzi, icone di doti/elementi/affinità/meteo/attività/decori/guida — sta nella tabella `immagine` di `gioco.db`, colonna `contenuto BLOB` (migrazione 079). `shared/immagini.ts`: `AMBITI_CARICAMENTO` (8: una riga per entità, caricata dall'utente) e `AMBITI_PREDEFINITI` (16 famiglie, chiave = chiave del manifesto: `mappe/tokyo`, `mappe/lmap/tokyo/akasaka`, `sfondi/mementos`).
- **Migrazione 079** (`assorbiImmagini`): riempie `contenuto` dai file delle righe (`DATA_DIR/immagini`, `pacchetto/immagini`), dalle famiglie di `config.assetDir` (`public/asset`, `webp` > `png` a parità di chiave) e da `pacchetto/gioco.db` (connessione a parte in sola lettura, solo se ha già la colonna); idempotente; con un database in memoria le due sorgenti pesanti si saltano. `regoleAllAvvio` → `assorbiImmaginiSuDisco`: assorbe ciò che un backup di prima della 079 ha rimesso su disco e sposta `DATA_DIR/immagini` in `DATA_DIR/backups/immagini-su-disco-<istante>`. `caricaPacchetto` copia le righe di `immagine` senza i byte salvo `{ conImmagini: true }`.
- **Server**: `immaginiService` legge e scrive solo nel database (`nome_file` resta come nome leggibile); `GET /api/immagini/:ambito/:chiave/file` risponde dal BLOB con `ETag` (id, byte, data) e 304; `GET /api/immagini/manifest` = famiglie predefinite con contenuto, chiave → URL versionato; elenco (`GET /api/immagini`) e rimozione in blocco (`DELETE /api/immagini`) toccano solo gli ambiti di caricamento (`queryImmagini`), mentre lettura/PUT/DELETE singoli accettano ogni ambito. `backupService` fa lo snapshot di avvio solo se c'è una migrazione da applicare. `copiaIstanza` non porta più la cartella `immagini/` (i backup vecchi con quella cartella si ripristinano ancora: i file vengono assorbiti alla riapertura). Il ripristino e l'importazione leggono il file dalla cartella d'appoggio, senza un limite di dimensione proprio (la costante `MAX_BYTE_RIPRISTINO` del caricamento nel corpo è stata tolta il 2026-10-03).
- **Frontend**: `assetStore.carica` unisce `/asset/manifest.json` e `getManifestoImmagini()` (`/api/immagini/manifest`, che vince a parità di chiave): `useAsset`/`AssetImg` invariati. `assetTokyo.ts`, `stratiMemento.ts` (`urlElementoMemento`), `AlberoLuoghi` usano `urlImmagine(famiglia, chiave)` (chiave con `/` codificata: `lmap%2Ftokyo%2Fshibuya`).
- **Pacchetto di gioco = `gioco.db`** (il completo è fuori da git; il primo avvio copia l'iniziale senza immagini e la card avvisa finché il completo non è importato, `StatoIstanzaDto.completo`): `server/services/pacchettoGiocoService.ts` — l'esportazione è `copiaDatabase('gioco')` (copia consistente di `main` in un file temporaneo), `anteprimaPacchetto(percorso)` / `anteprimaPacchettoDaDeposito(nome)` (firma SQLite + `verificaDatabase` = 'gioco' sul file, aperto dov'è in sola lettura; versione ≤ ultima migrazione, conteggi per tabella, tabelle assenti, immagini con contenuto, `orfaniPartite` con `RIFERIMENTI_PARTITE`: 30 riferimenti utente→gioco valutati attaccando `partite.db` al file; una tabella di gioco assente rende orfane tutte le righe che la referenziano, con nota), `importaPacchetto(percorso)` / `importaPacchettoDaDeposito(nome)` (il file in una cartella di lavoro di `data/tmp` → copia di sicurezza → `closeDb` → `installaDatabase` → `riapriIstanza` + `regoleAllAvvio` → orfani ricalcolati; errore → `tornaAllaCopiaDiSicurezza`, 400 `importazione-fallita`). Rotte in `routes/impostazioni.ts` (nessun file nel corpo di una richiesta, dal 2026-10-03): `GET /istanza/gioco/deposito`, `POST /istanza/gioco/deposito/anteprima`, `PUT /istanza/gioco/deposito`, `GET /istanza/gioco/importazione` (stato); il download è `GET /istanza/database`, che lascia anche una copia nel deposito. DTO: `AnteprimaPacchettoDto`, `EsitoImportazionePacchettoDto`, `OrfanoPartiteDto`. UI: `src/components/impostazioni/PacchettoGioco.tsx` (anteprima obbligatoria, esito con orfani e «Ricarica l'app»).

## 8. Build, test, deploy
- Test (Vitest, 267 file / 1461 casi al 2026-10-04). Aiuti comuni in `test/`:
  - `dbDiProva()` (`test/dbDiProva.ts`): il DB del backend in memoria con il pacchetto iniziale caricato e migrato;
  - `test/supertest.ts` (alias di `supertest` in `vitest.config.ts`): un server per app con connessioni keep-alive, chiuso a fine file
    da `test/setup.ts`, contro gli `EADDRINUSE` di Windows;
  - `moduloApi` / `moduloNotifiche` (`test/mockModuli.ts`, globali da `test/setup.ts`) per i `vi.mock` del frontend: il modulo
    finto parte da quello vero, i sostituti dati dal test lo rimpiazzano, le funzioni pure restano vere, e un'API non simulata
    fallisce dicendo il suo nome.
  Il frontend gira in jsdom.
- Dev: `scripts/start-all.sh` (`npm run dev:server` = `tsx watch`, che **si riavvia da solo** a ogni salvataggio in `server/` e
  applica subito le migrazioni nuove ai dati di `data/`; `npm run dev:client` = `vite --host`), log `BE.log`/`FE.log`, PID in `.pids/`.
  Le porte vengono da `.env` (`BE_PORT`/`PORT`, `FE_PORT`) per il server, gli script e Vite.
  Stop (`termina_server` in `scripts/_comuni.sh`): individua il listener sulla porta (deve essere `node`), risale i padri fino alla
  radice del pidfile o all'ultimo runtime nostro (mai oltre un `bash` diverso dal pidfile), poi termina l'albero — Linux: SIGTERM,
  attesa ≤5 s, SIGKILL ai superstiti; Windows: `taskkill //T` sul WINPID (tradotto dal PID MSYS). Provato su Windows e WSL Ubuntu.
- CI (`.github/workflows/ci.yml`, anche riusabile con `workflow_call`): typecheck, lint (uno, bloccante), test, audit.
- Immagini (`docker-publish.yml`): dopo il gate `verify` (lo stesso `ci.yml`, audit compreso), build & push su GHCR
  `merlinoalbus/project-p5r-{backend,frontend}` con tag `latest` e `sha`; cache GHA separate per le due immagini. Il frontend
  installa senza script nativi (`npm ci --ignore-scripts`). nginx comprime testi, JSON e SVG (gzip).
- Il backend in Docker gira come `node --import tsx server/index.ts` (PID 1 = node, riceve SIGTERM da `docker stop`).
- Runtime (`docker-compose.yml`, stack Portainer dal repo): nessuna porta pubblicata; FE nginx sulla rete esterna `PROXY_NETWORK` (default `proxy`) raggiunto da cloudflared come `http://project_p5r_fe:80`, BE solo su rete interna (3101, proxato da nginx su `/api/`),
  volume `project_p5r_data` su `/data` (DB creato al primo boot dal pacchetto iniziale nell'immagine), label watchtower per
  l'aggiornamento automatico. Porta, cartella dei dati e del pacchetto stanno nell'immagine; lo stack deve definire `NAS_ADDR` e
  `NAS_PATH` della cartella d'appoggio (senza, `docker compose` si ferma con un messaggio).

### Catalogo personale e agenda (2026-09-05)
La migrazione 035 separa origine, personalizzazioni e nascondimenti. Il reseed conserva articoli personali/acquisti e riallinea le spunte soltanto su identità certe; quelle ambigue diventano azioni personali mantenendo effetti reversibili. Il quartiere dei negozi è `luogo_chiave`, distinto dalla descrizione `luogo`. La ricerca include negozi vuoti; i prodotti usano un unico elenco accessibile adattato tramite container queries.

### Condizioni procedurali (2026-09-05)
Migrazioni 036–037: regole JSON comuni a spilli, negozi e articoli; definizioni di fatti e valori separati per partita; data strutturata di sblocco dei quartieri. Il valutatore usa dati registrati: AND/OR a tre stati, blocchi solo alla radice con precedenza. Nessun testo del catalogo o del quartiere viene interpretato durante la valutazione. La conversione una tantum conserva le frasi ambigue come da configurare. Le esportazioni includono gli stati referenziati, rifiutano definizioni in conflitto e conservano vincoli non validi/mancanti come ignoti, anche oltre il limite. Un acquisto mantiene la disponibilità ereditata dal negozio.

### Percorsi delle mappe (migrazione 038)
L’identità interna resta stabile; mappa_percorso deriva chiave pubblica e nome composto dalla gerarchia, escludendo il contenitore Città. mappa_alias conserva i vecchi URL. Rinomina e spostamento aggiornano atomicamente tutto il sottoalbero; collisioni e cicli annullano l’operazione. Pin, immagini e progressi usano l’identità interna. Ricerca e ZIP usano i nomi attuali; le immagini del repository già esistenti restano leggibili tramite assetOriginale e vengono esportate con il percorso attuale.

### Editor a sezioni
Spilli, Mappa, Collegamenti e File espongono gli strumenti per attività. I contenuti delle sezioni restano montati: una bozza non si perde passando a un altro pannello. La selezione dalla mappa riapre Spilli, anche se il pin era già selezionato. Su telefono la mappa precede il pannello; comandi di sezione e campi hanno bersagli da 44 px. Ricerca riferimenti con area e quartiere leggibili su più righe.

### Ingresso dei quartieri (039)
quartiere_ingresso conserva mappa interna, x/y percentuali e fattore di ingrandimento 1–6. Il quartiere espone percorso attuale e ingresso; il menu Città e i pin di Tokyo aprono la pagina del quartiere, che centra il visore sul punto configurato. Rinomina conserva la destinazione; eliminazione della destinazione e ripristino esplicito tornano alla mappa del quartiere adattata alla finestra. Il backup completo e i pacchetti delle mappe comprendono la configurazione; importazioni senza sovrascrittura preservano ingressi esistenti.

## Atlante unico — integrazione in corso (2026-09-06)
Il servizio accessoMondoService risolve entità della guida verso mappe e pin registrati tramite GET /api/mappe/accesso/:tipo/:chiave. Restituisce destinazione unica, scelta multipla o associazione assente, con provenienza. Gli articoli passano dal negozio e dal legame strutturato luogo.negozio; gli ingressi configurati valgono soltanto per il quartiere. Le chiavi pubbliche seguono percorsi e alias esistenti. Non assegna coordinate o destinazioni per somiglianza dei nomi.

Gli accessi principali di Città, Palazzi e Dedali e Negozi e inventario usano /guida/mondo/:tipo/:chiave: destinazione unica → stesso VisoreMappa, alternative → scelta esplicita. Le schede restano approfondimenti e sono sempre raggiungibili anche in caso di associazione assente o errore. Il visore riceve spillo oppure terna valida x/y/zoom, mantenendo priorità al pin.

L’importatore JSON accetta fino a 64 MB tramite un parser montato in bootstrap sulla sola POST /api/mappe/importa prima del parser globale da 5 MB. Gli altri endpoint e metodi mantengono il limite globale. Verificati payload valido oltre 5 MB, JSON malformato e rifiuto oltre 64 MB senza inserimenti.

## Modulo del catalogo a moduli e filtri degli articoli (2026-09-12)
`src/components/guida/ModuloCatalogo.tsx` è il guscio: tiene lo stato (`Dati`, un oggetto con i
nomi delle colonne), le condizioni, la spunta «Confermato», e chiama `creaElementoCatalogo`/
`aggiornaElementoCatalogo`. `src/components/guida/moduli/` contiene `base.ts` (contratto
`DefinizioneModulo`: `iniziali(elemento, negozioChiave)`, `valido(dati)`, `prepara(dati)`, flag
`conCondizioni`/`conVerificato`), `definizioni.ts` (le definizioni di tutti i tipi, funzioni pure con
i propri test), `campi.tsx` (Campo/Griglia/Blocco), `nomiPerEffetti.ts` e un componente per tipo
(`ModuloNegozio`, `ModuloArticolo`, `ModuloLibro`, `ModuloFilm`, `ModuloAttivita` anche per i
videogiochi, `ModuloLuogo`, `ModuloGenerico` per domande e cruciverba); `index.ts` unisce
definizione e componente in `MODULI[tipo]`. I valori temporanei del modulo (l'oggetto collegato,
la via «a mano», il tipo fissato) stanno sotto chiavi `_…` e `prepara` li toglie. Editor condivisi:
`EditorEffetto` (famiglia a tessere + parametri, costanti in `src/utils/effetti.ts`), `EditorEffetti`
(elenco di voci con `ripetuto` e condizioni), `OrariEditor`, `SceltaOggetto` (archivio unico sul
`Selettore` con ricerca sempre aperta, nomi in `src/utils/oggetti.ts`), `SceltaLuogo`
(`GET /api/compendio/luoghi`, raggruppato per quartiere, voce «solo il quartiere»),
`SelettoreIcone` (`src/components/shared/`). `AggiungiAlCatalogo`/`CorreggiElemento` accettano
`TipoModulo` (i tipi del catalogo più `videogioco`, `src/utils/catalogo.ts`).

Filtri degli articoli: `src/utils/articoli.ts` definisce `FiltroArticoli` (`q`, `categorie[]`,
`per`, `stato`, `disponibilita`), `filtraArticoli` (pura, sull'elenco di un negozio) e la lettura/
scrittura dell'indirizzo (`filtroDaParametri`/`parametriDaFiltro`, con il vecchio `categoria=`
accettato); `FiltriArticoli` è il pannello (ricerca, tessere delle categorie con conteggio, «Per chi»,
segmenti con la partita). `NegoziPage` manda il filtro al server (`ricercaArticoli` con `categorie`,
`stato`, `disponibilita`); `NegozioPage` lo applica in locale. Rimossi: `ElementiRimossi` (per tipo,
opzionalmente per negozio, `GET /api/catalogo/:tipo?nascosti=1&negozio=`) e la pagina
`/guida/rimossi` (`RimossiPage`). CSS: `.selettore-icone*`, `.filtri-articoli*`, `.segmenti*`,
`.orari-editor*`, `.editor-effetti__voce`, `.rimossi-*` in `src/tailwind.css`.

## Pagine delle letture e delle attività (2026-09-12)
`src/utils/letture.ts` è il punto comune di `LibriPage`, `FilmPage`, `VideogiochiPage`, `AttivitaPage` e
`LettureEGiochi`: filtro Dote dagli effetti (`haDote`), blocco e motivo (`bloccata`, `motivoBlocco` dal
dettaglio del requisito rosso), yen (`formattaYen`, `prezzoChip`), paga dei lavori (`pagaTesto`), stati di
lettura (`STATI_LETTURA`, `passaStato`). `src/components/shared/Segmenti.tsx` è il radiogroup a pulsanti
usato dai filtri (stato, supporto, acquisto, disponibilità). Le pagine leggono `effetti`/`effettiTesto`,
`negozi`, `sedeChiave`/`sedeNome`, `pagaYen`/`pagaMassima`, `dettagli`, `condizioni`, `disponibilita`
dei DTO della voce 5; le colonne in prosa (`dove`, `periodo`, `regole`, `premi`, `altri_effetti`, `paga`,
`sblocco`, `doti_json`) non sono più lette dal frontend.

## Negoziazione con le Ombre (2026-09-18)
Le domande stanno nella riga `dati_guida` «battaglia» (`negoziazione.domande`, `negoziazione.fonteDomande`),
portate dalla migrazione 083 dal file `server/db/dati/negoziazione-domande.json` — trascrizione fedele
alla fonte — e normalizzate da `normalizzaDomande` (un solo verdetto per carattere, il peggiore e
marcato incerto quando la fonte si contraddice; domande ripetute fuse), che la 084 riapplica alle
istanze già migrate. Servite con il resto
di `GET /api/compendio/battaglia`: la ricerca avviene nel browser. `shared/types.ts` definisce
`TrattoOmbra` (`giocosa|timida|irritabile|cupa`), `EsitoRisposta` (`buona|passabile|cattiva`) e
`NegoziazioneDomandaDto`; `src/utils/negoziazione.ts` tiene colori, segni, ordine degli esiti e
`cercaDomande` (tutte le parole, su domanda e risposte, via `normalizzaTesto`);
`src/components/guida/RisposteNegoziazione.tsx` è la scheda con ricerca, interruttori dei caratteri e
pastiglie di esito per risposta.

## Scheda del Palazzo, Richieste, domande e cruciverba (2026-09-12)
`src/components/guida/RaccoltaPlanimetrie.tsx` elenca planimetrie con collezionabili (`{chiave, nome, n,
presi, spilli[]}`) e segna «Raccolto» con `impostaSpilloRaccolto` (`src/services/api/mappe.ts`); la pagina
aggiorna `planimetrie`, `aree[].mappe` e `raccolta` in locale (`segnaRaccolto`) e bumpa la versione del
visore. `src/components/guida/CorrezioneGuida.tsx` è la matita accanto al testo: apre i campi di quel pezzo
e salva con `aggiornaDungeon` / `aggiornaArea` / `creaPunto` / `aggiornaPunto` / `eliminaPunto`
(`src/services/api/compendio.ts` → `PUT /api/compendio/dungeon/:chiave`, `PUT /api/compendio/aree/:chiave`,
`POST /api/compendio/aree/:chiave/punti`, `PUT` e `DELETE /api/compendio/punti/:chiave`, schemi in
`server/schemas/guidaDungeon.ts`, servizi in `dungeonService`). I raggruppamenti si correggono con
`aggiornaPresentazioneMappa` (`PUT /api/mappe/:chiave/presentazione`): il nome della stanza si
propaga a tutte le sue tavole, l'etichetta resta della singola versione. **La pianta pubblicata
dalla guida non esiste più** per le aree dei Palazzi (resta per i quartieri): dove manca la
planimetria la scheda offre il selettore di tutte le tavole e aggiunge l'area con `impostaAreeMappa` (2026-09-30).

**La guida dell'area, modificabile e collegata ai pin** (2026-10-01). `src/components/guida/GuidaDellArea.tsx` è la parte
bassa della colonna dell'area: le voci (`punto_interesse`) sempre visibili, anche in un'area senza voci, con correzione,
eliminazione, «Su»/«Giù» (`PUT /api/compendio/punti/:chiave/sposta`, `spostaPunto`: ricompatta l'ordine dell'area) e
«Aggiungi una voce». Ogni voce si collega a uno o più pin delle planimetrie **del suo Palazzo** (`PUT` / `DELETE
/api/compendio/punti/:chiave/pin/:spillo`, `collegaPinAlPunto`): il collegamento sta sul pin, in un campo suo
(`spillo.voce_chiave`, migrazione 094; `ON DELETE SET NULL`), separato dal riferimento, che resta la destinazione o il Confidente
del pin; la regola unica di lettura è `VOCE_DEL_PIN` / `voceDelPin` (`mappe/voceDelPin.ts`, senza dipendenze: il campo, o il riferimento «punto»
degli elementi della guida senza mappa, lasciati com'erano) e il DTO del pin la porta in `SpilloDto.voce`; le regole del collegamento
sono una funzione sola, `erroreVoceDelPin` (`collegamentiGuida.ts`), per la guida, l'editor delle mappe e il pacchetto. Un pin già di un'altra
voce si rifiuta (409 `pin-gia-collegato`, col nome della voce), uno fuori dal Palazzo pure
(400). I pin si scelgono **sulla mappa, dentro la voce**: `MappaIncorporata`/`VisoreMappa` con la prop `scelta`
(`SceltaPin`: senza testata, tocco = `onScegli` invece del popup, tutti i pin visibili, i collegati con `.spillo-mappa--scelto`,
ricerca passata dalla voce); l'altezza della mappa si **misura** sul contenitore che scorre. `PuntoInteresseDto.pin`
(`PinDelPuntoDto`) porta i pin collegati; la riga dice «N pin» o «da collegare» (`shared/spilli.ts`: `pinDelPunto`,
`puntoDaCollegare` — il tipo ha di solito un pin; `puntoDescrittivo` — solo «Altro», senza pin né stato). I tipi delle voci (2026-10-01): Stanze sicure, Porta, Meccanismo, Forziere normale, Forziere raro, Semi della bramosia, Enigma, Mini-boss, Boss, Nemico, Persona, Oggetto, Scorciatoia, Storia, Altro (`NOME_TIPO`; le chiavi dei dati restano `sicura`, `forziere-chiuso`, `volonta`, `ombra-sciagura`); ogni tipo tranne «Altro» si collega a qualunque pin del Palazzo, anche a uno con una destinazione o un Confidente (dalla 094). Dall'editor delle mappe un riferimento «punto» diventa la voce del pin senza toccarne il riferimento; il pacchetto delle mappe la porta come `voce` (§6 di `MAPPE.md`). **Lo stato è uno solo** (`server/services/mappe/collegamentiGuida.ts`):
`impostaStatoPunto` raccoglie o riapre tutti i pin della voce; `impostaRaccolto` segna la voce quando sono raccolti **tutti**
i suoi pin delle planimetrie e la riapre togliendone uno; collegando, `allineaStatiPunto` unisce gli stati delle partite
(voce segnata → pin raccolti; pin tutti raccolti → voce segnata), scollegando restano come sono. La risposta del
collegamento non porta lo stato della partita: dopo ogni tocco `GuidaDellArea` rilegge la scheda (`onRicarica`, con la
partita e `versioneStati`). Le voci **descrittive** (`puntoDescrittivo`: solo «Altro») non hanno stato né pin: il server
rifiuta di segnarle e di collegarle (400 `punto-descrittivo`; azzerarle resta possibile), rifiuta di far diventare
descrittiva una voce con pin (409 `punto-con-pin`), e in lettura ignora uno stato rimasto (DTO `stato: null`, fuori da
`gestiti`) senza cancellarlo. Vale anche dal lato mappa: il dettaglio `punto` di un pin (`dettaglioRiferimento`) porta
`stato: null` per una descrittiva, `impostaRaccolto` non scrive lo stato di una descrittiva, `verificaRiferimento` rifiuta
un riferimento **nuovo** a una descrittiva (400 `punto-descrittivo`; quelli già esistenti — 4 elementi della guida senza
mappa nel canone, collegati a voci «altro» — restano e restano modificabili) e `AzioniStato` (popup, scheda laterale,
`SchedaContenutoGuida`) al posto dei pulsanti dice «Voce descrittiva della guida: si legge, non si segna.». Il popup offre
i comandi di stato anche ai pin non collezionabili collegati a una voce che si segna (una sicura, un passaggio). Un nemico collegato a una
voce si segna (Ombre sciagura). `eliminaPunto` / `eliminaArea` scollegano i pin delle planimetrie **lasciando** il loro
raccolto (cancellano solo quello degli elementi della guida senza mappa). Nessuna riconciliazione automatica dei dati
(scelta dell'utente): gli elementi della guida senza mappa (`area_guida_chiave`, 187 nel canone) restano com'erano.
**L'Enigma contiene i suoi passi** (migrazione 095, `punto_interesse.contenitore_chiave`, `ON DELETE SET NULL`): i passi sono
voci vere della stessa area, di qualunque tipo e coi loro pin, ordinate fra loro (`spostaPunto` si muove fra le voci accanto:
quelle fuori da ogni Enigma, o i passi dello stesso). Regole (`verificaEnigma` in `dungeonService`): il contenitore è un
Enigma (`puntoEnigma`) della stessa area, non è a sua volta un passo, non ha pin suoi (409 `enigma-con-pin`); un Enigma coi
passi non entra in un altro e non cambia tipo (409 `enigma-con-passi`), e non riceve pin da nessuna strada (`erroreVoceDelPin`,
400 `enigma-con-passi`). Lo stato: `mappe/statiGuida.ts` (senza dipendenze dai servizi, riesportato da `collegamentiGuida.ts`: `scriviStatoVoce`, `segnaPassiDellEnigma`, `allineaEnigma`, `allineaEnigmaDellaVoce`,
`allineaEnigmaInOgniPartita`) — l'Enigma con passi da segnare (le voci descrittive non contano) è risolto quando lo sono
tutti, e il suo stato in `punto_partita` segue i passi a ogni scrittura (stato dalla guida, pin raccolto, collegamento che
unisce gli stati, boss finale segnato dal Tesoro raccolto); segnarlo segna i passi ancora da fare e i loro pin (quelli già
segnati restano come sono), riaprirlo li riapre; un passo nuovo ancora da fare riapre l'Enigma risolto (scelta dell'utente).
Eliminato l'Enigma, i passi tornano voci dell'area, in fondo e nel loro ordine, col loro stato. `PuntoInteresseDto.contenitore`
porta l'Enigma; `GuidaDellArea` mostra i passi dentro l'Enigma («N/M passi», «Aggiungi un passo», «Passo di» nella modifica),
e i contenuti della guida di una planimetria (`contenutiMappa`, `conPassiDentro`) li mettono subito sotto di lui.
Con un'area scelta la colonna mostra la raccolta **di quell'area** (o dice che non ce n'è); il resto del Palazzo sta solo
nella piega chiusa.

**Nuova area della guida** (2026-10-01): `creaArea` in `dungeonService` (`POST /api/compendio/dungeon/:chiave/aree`,
`bodyNuovaArea`): chiave `<dungeon>-<slug del nome>` (unica anche rispetto a `guida_alias`; lo slug si tronca perché la chiave, suffisso «-N» compreso, stia nei 200 caratteri delle route delle aree; senza lettere né cifre vale «area»), posto `dopo` un'area /
`null` in cima / assente in fondo, ordine del Palazzo riscritto 0…n-1, e con `planimetria` l'area si aggiunge a quelle della
tavola via `impostaAreeMappa` nella stessa transazione. Interfaccia: `src/components/guida/ModuloNuovaArea.tsx`, nella
scheda della planimetria (`SchedaPlanimetria`, sezione «Nuova area della guida») e nella colonna del Palazzo
(`PlanimetriePalazzo`, pulsante «Nuova area»); creata, `onScegliArea` la apre. Nella scheda il modulo aspetta (`bloccato`, con il perché) finché ci sono modifiche non salvate o la conferma d'eliminazione è aperta: creando, la finestra si chiude.

`src/components/guida/PlanimetriePalazzo.tsx` è la colonna «Il Palazzo» della scheda: elenca **tutte** le planimetrie
dell'albero `dungeon-<chiave>` che `DungeonDettaglioDto.planimetrie` porta con `ordine` e `aree` (in ordine di guida),
raggruppate per stanza, e in coda le aree della guida senza planimetria. **L'elenco serve a scegliere, la scheda a
sistemare** (ristrutturazione del 2026-09-30, vedi in fondo): si riordina trascinando la maniglia (`useRiordino`,
`riordinaMappe` → `PUT /api/mappe/ordine`), e «Gestisci» apre `SchedaPlanimetria` o `SchedaAreaGuida`. Scegliere una
riga porta il visore su quella planimetria e la colonna sui suoi soli collezionabili. Nell'editor `VisoreMappa.vistaGiornoCorrente` accende il
filtro del giorno corrente della partita attiva (di regola l'editor vede tutto).
`src/components/guida/ObiettiviDedalo.tsx` mostra `DedaloDto` (timbri, richieste, obiettivi) e
scrive con `impostaTimbri` (`src/services/api/partite.ts`, `PUT /api/partite/:id/timbri`) e
`impostaStatoRichiesta`; la pagina ricalcola `obiettivi.fatti` e `raccolta.presi`. `RichiestePage`,
`DomandePage` e `CruciverbaPage` usano `CampoRicerca` + `Segmenti`; il dedalo delle Richieste vive in
`?dedalo=`; le righe «prossime» hanno un'ancora (`#domande-<data>`, `#cruciverba-<giorno>`) a cui il
rimando in cima scorre dopo aver azzerato i filtri.

## Progressi calcolati (2026-09-12)
`shared/condizioniSpillo.ts`: `EVENTI_STORIA[].membro` e `membroDellEvento(chiave)`. `server/services/
disponibilitaService.ts` (caso `evento`): per gli eventi con `membro` legge `membriSquadra`/
`membriFuoriSquadra` dello stato dei semafori (verde / rosso / grigio), per gli altri `evento_storia_partita`.
`server/routes/condizioni.ts`: `/elenchi` (attività con `tracciamento = 'svolta'`, negozi con `programma`,
eventi con `calcolato`), `progressi()` costruito da `statoDisponibilitaPartita` (squadra, spesa per negozio,
contatori) → `ProgressiPartitaDto` (`shared/types.ts`); i PUT rifiutano eventi calcolati, attività non
conteggiabili e negozi senza programma manuale. `server/services/negoziService.leggiProgrammaPunti` è
esportata. `server/db/migrazioniUtente/004_eventi_calcolati.ts`. FE: `src/services/api/condizioni.ts`
(`ElenchiRegole.negozi[].programma`, `eventi[].calcolato`), `CondizioniEditor` filtra i negozi per
programma, `src/components/partita/ProgressiPartita.tsx` in due sezioni.

## Pulizia (voce 11, 2026-09-12)
- `server/db/migrations/080_giorni_luogo_strutturati.ts` (`giorniDallaFrase`): `luogo.giorni_json` TEXT NOT NULL DEFAULT '[]'; `cittaService` legge `giorni_json` (`giorniDiRiga`) e produce `LuogoDto.giorni`/`giorniTesto`; `presenzaEntita.giorniDaJson`; `catalogoService.CAMPI.luogo` scrive `giorni_json`; `datiLuogo.giorni_json: z.array(z.enum(GIORNI_SETTIMANA_CHIAVI))`; `ModuloLuogo` con `Interruttori` (esportato da `OrariEditor`) e `GIORNI_SETTIMANA` di `shared/condizioniSpillo`.
- DTO senza prosa: `FilmDto` senza `periodo` e `fonte`; `NegozioRiassuntoDto` senza `orari` (frase) e `sblocco`; `ArticoloDto`, `NegozioDettaglioDto`, `LibroDto`, `AttivitaDto`, `LuogoDto`, `CruciverbaDto` senza `fonte`. `catalogoService.CAMPI` non scrive più `orari` né `periodo`.
- `server/db/migrations/081_istantanee_luogo_giorni.ts` (`aggiornaIstantanea`): le istantanee `seed_json` dei luoghi con `giorni_json` e nota come la 080; le righe della guida senza istantanea vengono fotografate come nella 071. `eliminaElemento` (catalogoService) ricava `giorni_json` dalla frase se l'istantanea non lo ha; `datiLuogo.giorni_json` è salvato nell'ordine della settimana; `datiNegozio` non accetta più `orari` in prosa.
- `src/components/condizioni/SelettoreRicerca.tsx` rimosso (tutti i selettori usano `Selettore`).
- Il modulo del luogo, che nessuna pagina apriva, è raggiungibile da `QuartierePage`: «Aggiungi un luogo» (`AggiungiAlCatalogo tipo="luogo"`) nella sezione «Luoghi del quartiere» e «Correggi» (`CorreggiElemento`) in ogni card, con ricarica dopo il salvataggio; `eliminaElemento` ripristina anche le istantanee di prima della 080 ricavando `giorni_json` dalla frase `giorni`.

## Caricamento del pacchetto: tre strade e tempi lunghi (12 settembre 2026)

Un'istanza pubblicata sta dietro nginx e un tunnel: un corpo da centinaia di MB non ci passa, e il browser vede
«Failed to fetch» senza che il backend riceva nulla. Da qui:

- **La cartella d'appoggio** (strada normale per un'istanza pubblicata). Una condivisione del NAS è montata sul
  server (`DEPOSITO_DIR`, in Docker `/deposito` via NFS: vedi `docker-compose.yml`, volume `project_p5r_deposito`).
  Ci si deposita il file del pacchetto; `GET /istanza/gioco/deposito` elenca i candidati (`.db`, `.sqlite`,
  `.sqlite3`) dal più recente, `POST /istanza/gioco/deposito/anteprima` e `PUT /istanza/gioco/deposito` lavorano su
  un nome scelto in quell'elenco. Il nome non può contenere separatori né risalite e il percorso risolto deve restare
  dentro la cartella (`percorsoNelDeposito`). Se la cartella non è configurata o non è montata, l'elenco lo **dice**
  (`disponibile: false` con il motivo) invece di sembrare vuoto. **Il NAS non ospita `/data`**: SQLite gira in WAL,
  che richiede memoria condivisa e non funziona su filesystem di rete; sul NAS sta solo il file di scambio.

- *Storico (superato il 2026-10-03: oggi il file arriva solo dalla cartella d'appoggio, qui sopra; le rotte
  `PUT /istanza/gioco`, `/anteprima-da-url` e `/da-url` e l'invio con XHR non ci sono più).* Le due strade di allora:
- **Il file nel corpo** (istanza locale). `src/services/api/impostazioni.ts` inviava con **XMLHttpRequest**, non con
  `fetch`, perché solo XHR dice quanti byte sono partiti (`upload.onprogress` → `AvanzamentoInvio` → `BarraInvio`,
  percentuale e MB, poi barra indeterminata mentre lavora il server). Il timeout complessivo è sparito: resta quello
  di **inattività** (dieci minuti che ripartono a ogni evento), perché un invio lento non è un invio morto.
  `nginx.conf` aveva una `location ^~ /api/impostazioni/` con `client_max_body_size 1024m` e timeout 1800s (dal 2026-10-04 il corpo è
  tornato a 10M, rilievo D3, perché nessun file viaggia più nella richiesta; i timeout lunghi restano; il resto
  delle API resta a 10M/120s), e `server/index.ts` alza `server.requestTimeout` a 30 minuti: i 300 secondi
  predefiniti di Node troncavano la ricezione di un pacchetto grande a metà.
- **L'indirizzo** (istanza pubblicata). `POST /istanza/gioco/anteprima-da-url` e `PUT /istanza/gioco/da-url`
  ricevevano solo l'URL: il file se lo prendeva il server con `server/utils/scaricaDaUrl.ts` (che resta, per le immagini), che distingue l'attesa
  delle **intestazioni** (30s) dall'**inattività** del corpo (120s che ripartono a ogni blocco) e applica il tetto
  *mentre* scarica, così un'origine senza `Content-Length` non può far crescere la memoria. Lo usa anche
  `importaImmagineDaUrl`. La scelta consapevole: l'indirizzo lo decide chi usa l'app e può puntare alla rete privata
  (è il caso d'uso: il PC di casa in Tailscale), quindi nessuna lista di blocco.
- **L'importazione è una alla volta e osservabile**: `pacchettoGiocoService` tiene un lucchetto (409
  `importazione-in-corso`), aggiorna la fase (`lettura` dalla cartella d'appoggio, `verifica`, `copia-di-sicurezza`, `sostituzione`,
  `riapertura`, `controllo`) e conserva l'esito dell'ultima. `GET /istanza/gioco/importazione` lo espone
  (`StatoImportazionePacchettoDto`). Serve perché un tunnel chiude la connessione dopo ~100 secondi mentre il server
  sta ancora sostituendo i dati: il frontend, invece di dire «fallita», interroga lo stato, segue le fasi e mostra
  l'esito vero quando arriva. **Ogni importazione porta un identificativo** (`operazione`): il frontend fotografa
  quello dell'ultima PRIMA di partire e accetta un esito solo se è diverso, altrimenti un tentativo respinto dal
  proxy — che al server non arriva nemmeno — erediterebbe l'esito riuscito di ore prima e si direbbe riuscito. Se lo
  stato di partenza non si riesce a leggere, l'errore resta un errore. L'attesa si interrompe con «Smetti di
  attendere» e quando la card viene smontata.

## Giornata modificabile e aree che scorrono (2026-09-29)

(Superati dal 2026-10-01 i punti «Correzioni della guida» e «Interfaccia» — correzioni, rimosse, agenda del giorno, cose
da fare per partita —: vedi «La giornata è canone». Restano validi gli altri punti: aree che scorrono, mappa di Tokyo nella
schermata piena, tipi di spillo, illustrazioni dei videogiochi.)

- **Correzioni della guida**: tabella `utente.correzione_azione_guida` (PK `data, indice`; `originale_json` = l'azione
  quando l'utente l'ha toccata; `modifiche_json` = soli campi diversi fra `azione`, `note`, `fascia`; `nascosta`),
  migrazione «utente» 005 (che aggiunge anche `evento_utente.fascia`). `server/services/correzioniGuidaService.ts`
  applica le correzioni alla lettura (`guidaDelGiorno`, `correttoreGuida` per l'indice, `azioneGuida` per la spunta)
  e le scrive (`correggiAzioneGuida`, `rimuoviAzioneGuida`, `ripristinaAzioneGuida`, `riapplicaCorrezioneGuida`); una
  riga il cui `originale_json.azione` non coincide più con la guida è «superata» (`CorrezioneSuperataDto`), non si
  applica e blocca con 409 `correzione-superata` le scritture a quella posizione. Rotte:
  `PUT /api/compendio/percorso/:data/azioni/:indice` (`{ azione?, note?, fascia? }`), `PUT …/rimossa`
  (`{ rimossa }`), `PUT …/riapplica`, `DELETE …/correzione`. `percorsoService` le usa in `indicePercorso` (conteggi =
  azioni visibili + cose da fare dell'utente, `agendaService.conteggiAgenda`), `giornoPercorso` (`rimosse`,
  `correzioniSuperate`, `agenda`) e `impostaAzione`; `suggerimentiService` idem. `annullaEffetti` sta in
  `partiteService`.
- **Interfaccia**: `GiornoGuida` rende «Di giorno» e «Di sera» (eventi → azioni della guida → cose da fare), il menu per
  voce (`MenuVoce`), la finestra unica per aggiungere e modificare (`ModuloVoceGiornata`), le righe dell'utente
  (`VociAgenda`), le rimosse in fondo alla sezione e le correzioni da rivedere nella scheda del giorno. Chi lo ospita
  passa `onGiornataModificata` (ricarica giorno e indice).
- **Aree che scorrono**: `@utility area-scorrevole` (verticale: bordo, `overscroll-behavior: contain`,
  `scrollbar-gutter: stable`, barra d'accento, ombre di bordo con fondo `--area-fondo`) e `@utility area-scorrevole-x`
  (orizzontale: contenimento e barra d'accento, sfondo intatto) in `src/tailwind.css`; le regole CSS scorrevoli
  dichiarano `overscroll-behavior`. `src/test/areeScorrevoli.test.ts` vieta classi `overflow-*-auto/scroll`, classi
  arbitrarie e stili in linea che fanno scorrere (unica eccezione: `main` di `MainLayout`). Nel visore delle mappe la
  rotellina sopra `.spillo-popup` / `.area-scorrevole` resta a quell'area.
- **Mappa di Tokyo nella schermata piena**: `MappaTokyo riempi` (passato da `OggiMappa`) mette mappa e legenda in
  `.blocco-mappa-tokyo__mappa` (contenitore `mappaTokyo` delle container query) e `useLarghezzaCheSta` ne calcola la
  larghezza perché blocco, legenda e riga delle fermate chiuse stiano nell'altezza della colonna (sincrono,
  `ResizeObserver` su colonna e blocco, pavimento 240 px, 10:7 intatto); la riga «Non ancora nel mondo» diventa il
  conto con «Quali» (finestra con nome e condizione).
- **Tipi di spillo (2026-09-29)**: 42 in `shared/spilli.ts`; nuovi `oggetto` (consumabile, riferimento punto) e
  `infiltrazione` (spostamento, riferimento mappa, destinazione come gli altri spostamenti), entrambi in
  `TIPI_STRUTTURALI`. Nessuna migrazione: `spillo.tipo` non ha vincoli e zod usa `z.enum(TIPI_SPILLO)`. Tavolozza
  dell'editor e legenda del visore portano il nome del tipo anche in `title` (i nomi lunghi sono troncati).
- **Illustrazioni dei videogiochi**: `VideogiochiPage` mostra `attivita/<chiave>` (database) con riserva l'icona dei
  videogiochi; le attività di tipo «sfida» usano la figura `categoria-obiettivo` (alias in `src/utils/categorie.ts`),
  «allenamento» la sua `categoria-allenamento`.

## Più aree per planimetria; Palazzi e Memento in una schermata (2026-09-30)

- **Legame mappa ↔ aree**: vive in `mappa_entita` (righe `entita_tipo='area'`, più d'una per mappa, al più una mappa
  per area). Le colonne `mappa.entita_tipo/entita_chiave` dichiarano la prima area in ordine di guida
  (`allineaColonneArea`) oppure un legame di altro tipo, che non si tocca. In `mappeService`:
  - `impostaAreeMappa(chiave, aree)` (rotta `PUT /api/mappe/:chiave/aree`, schema `bodyAreeMappa`) sostituisce
    l'insieme, stacca ogni area dalla mappa che l'aveva (`staccaAreaDalleAltre`) e risponde con `areeDellaMappa`;
  - `sincronizzaLegameEntita` (il legame singolo `entita` di creazione e modifica) toglie solo l'area che le colonne
    dichiaravano;
  - `verificaAreePalazzo` / `palazzoDaGenitore` rifiutano (400) aree inesistenti, di un altro Palazzo o sulla radice
    `dungeon-<k>`. `aggiornaMappa` le applica a tutto il sottoalbero quando cambia il genitore.
- **Pacchetto delle mappe**: `EsportazioneMappeDto.mappe[].aree` (chiavi in ordine di guida); all'importazione le aree
  si verificano e si legano dopo il passaggio che scrive i genitori; un pacchetto senza `aree` usa `entita`.
  `dungeonService.planimetrieDelPalazzo` e `contenutiGuidaService.contenutiMappa` leggono tutte le aree in ordine.
- **Interfaccia**: `src/components/guida/SceltaAreePlanimetria.tsx` (dal 2026-09-30 un fieldset dentro `SchedaPlanimetria`); `gruppiPlanimetrie` unisce le
  aree delle versioni con `perOrdineDiGuida`; `DungeonDettaglioPage` mostra «Su questa planimetria» quando la
  planimetria a schermo ha più aree.
- **Una schermata da 1024 px** (`DungeonDettaglioPage`, Palazzi e Memento): radice `lg:flex-1 lg:min-h-0` dentro il
  `main` flessibile di `MainLayout`, intestazione `shrink-0` compatta (emblema 48 px, anello `lg:size-12!`, chip in
  `lg:contents`), griglia `lg:flex-1 lg:min-h-[280px] lg:grid-rows-[minmax(0,1fr)] lg:items-stretch`. Da 1024 a
  1279 px la colonna destra è un'unica `lg:max-xl:area-scorrevole`; da 1280 px sezione e aside sono colonne con
  `xl:area-scorrevole`. `MappaIncorporata.classeVisore` dà l'altezza al solo riquadro del visore (minimo 240 px e
  `flex-1` da 1280 px); la scheda di una mappa senza planimetria resta alta quanto il suo contenuto.
- Limite: `riconciliaAreeGuida` (`organizzazioneMappe.ts`) legge le colonne, quindi solo la prima area di una mappa
  senza geometria (vedi DECISIONI, 2026-09-30).

## Colonna del Palazzo ristrutturata; nemici; aree eliminabili (2026-09-30)

- **Colonna** (`PlanimetriePalazzo`): righe senza comandi di modifica. Ogni stanza con una sola planimetria è una riga
  (nome, «che cosa mostra · quanto resta», aree) con «Gestisci»; con più planimetrie si apre in `VersioniStanza`.
  `useRiordino(ids, blocco, onSposta)` fa il riordino: maniglia `<button>` a puntatore (cattura, indice da
  `getBoundingClientRect`, riga bersaglio con `ring-2`, scorrimento automatico del contenitore `.area-scorrevole`
  vicino ai bordi, `pointercancel`/`lostpointercapture`, solo tasto principale) e frecce su/giù, con il focus
  rimesso sulla maniglia dopo lo spostamento; `blocco` è il perché (atlante mancante o salvataggio in corso).
- **Schede in finestra** (`Modal`, conferme nel piè sempre in vista):
  - `SchedaPlanimetria`: nome della stanza (`gruppoNome`, vale per tutte le versioni), «Che cosa mostra» (`etichetta`;
    vuota = numero nella stanza), nome, aree (`SceltaAreePlanimetria`), editor, eliminazione (`eliminaMappa`). Salva
    solo ciò che cambia: `aggiornaPresentazioneMappa`, `aggiornaMappa`, `impostaAreeMappa`.
  - `SchedaAreaGuida`: collega l'area a una planimetria (elenco nella finestra con ricerca, l'area si aggiunge) o la
    elimina. Il modulo «Correggi l'area» sopra la mappa ha anch'esso «Elimina».
- **Eliminare un'area** (`DELETE /api/compendio/aree/:chiave` → `dungeonService.eliminaArea`, in transazione): punti e
  loro stati per partita, `marcatore_mappa`, spilli della guida senza mappa (vincolo RESTRICT) col loro «raccolto»,
  `timbri_dedalo_partita`, legami con le mappe (`mappeService.staccaAreaDaOgniMappa`), riferimenti nei JSON
  (`pianta_area.copre_aree_json`, `dati_guida` «battaglia» `ombre[].areaChiave` → null, «mappe-assenti»); piante,
  `guida_mappa`, `guida_alias` in cascata, `richiesta.area_chiave` a NULL; l'ordine delle aree si ricompatta.
  I dati di gioco stanno in `gioco.db`: un pacchetto importato dopo rimette l'area.
- **Nemici**: `nemico` è di categoria `informativo` (`shared/spilli.ts`, `collezionabile: false`), migrazione 085 per
  gli spilli esistenti; i punti della guida «ombra-sciagura» non risultano collezionabili in `contenutiMappa`.
- **Stato dei pin** (2026-10-03, `shared/spilli.ts` `statoDelTipo` / `statoDelPin` / `statoCitabile` / `parolaDelloStato`
  / `ritornoDelloStato`): la parola per tipo è una tabella (`STATO_PER_TIPO`, scelta dell'utente): dialogo «parlato»,
  Confidente «incontrato», forzieri «aperto», Tesoro del Palazzo «rubato», timbro «timbrato», semi e oggetti «raccolto»,
  boss e miniboss «sconfitto», meccanismo «azionato», punto sensibile «gestito», nemico «affrontato», porta chiusa
  «aperta». È lo stesso dato (`spillo_partita.raccolto` per uid), con la stessa API (`PUT /api/partite/:id/spilli/:spilloId`);
  i tipi con stato non collezionabili (meccanismo, punto sensibile, nemico, porta, Confidente) non contano nel completamento
  e il pin segnato resta sulla mappa, attenuato. Per togliere il segno: «Richiudi» (porta → «chiusa», forzieri → «chiuso»),
  «Annulla» per gli altri («non più …»); un pin collegato a una voce della guida usa gli stati della voce («Ottenuto»,
  «Esaurito», «Riapri») e ne mostra la parola. «Ha uno stato» è una regola sola (`statoCitabile`, letta sul database da
  `nomiCondizioni.pinCitato`): il tipo ha uno stato, o il pin ha una voce della guida non descrittiva («ottenuto»); la usano
  `impostaRaccolto` (400 `spillo-senza-stato` altrimenti), l'elenco dei pin citabili e le condizioni «Pin di una mappa». Dopo ogni azione `useMappaPartita` aggiorna subito il
  pin e rilegge la mappa in silenzio: vince l'ultima lettura chiesta, e ogni caricamento completo (mappa, partita,
  versione, momento della giornata, `ricarica`) rende vecchie le riletture in sospeso; le copie locali dei pin valgono
  solo sulla copia della mappa a cui si riferiscono. La visibilità che dipende dallo stato degli altri pin la calcola
  il server.
- **Stanze** (gruppo di immagini in `mappa_presentazione.gruppo_immagini_json`): `impostaStanzaMappa`
  (`PUT /api/mappe/:chiave/stanza`, `{ con, nome? }`) fa entrare una planimetria nella stanza di un'altra dello
  stesso genitore (la crea se manca, ordinale in fondo, posizione nell'ordine subito dopo l'ultima versione) o la
  rende una stanza a sé (`con: null`, id nuovo), conservando l'etichetta. `gruppoImmagini.nomeRivisto` segna un
  nome di stanza scelto da una persona (`gruppoNome`, `rinominaGruppo`, `impostaStanzaMappa`; viaggia nel pacchetto
  delle mappe) e in `titoloGruppoImmagini` vince sul `nomeRivisto` della singola mappa. `aggiornaMappa`, quando cambia
  il nome della prima planimetria (ordine, chiave) di una stanza senza nome scelto, fissa il titolo che la stanza
  mostrava (`nomeStanzaDaFissare`, con `senzaGergo` ora in `shared/nomiMappe.ts`, condiviso col frontend).
- **Testo delle aree**: `aggiornaArea` dalla scheda dell'area senza planimetria e dal modulo «Modifica testo» accanto
  al titolo dell'area aperta.
- **Palazzo completato** (2026-09-30, `server/services/palazziService.ts`): `StatoPartitaSemafori.palazziCompletati`
  (mappa Palazzo → motivo, al posto di `bossGestiti`) viene da `palazziCompletati(partita)`: il **boss finale**
  (`bossFinali`: i punti «boss» dell'ultima area, in ordine di guida, che ne ha) segnato in `punto_partita`, oppure
  sull'albero `dungeon-<k>` (`palazzoDiOgniMappa`) uno spillo `boss` finale (collegato a un punto finale, su una
  planimetria che contiene l'area finale, oppure qualunque boss del Palazzo quando `BossFinale.unico`: una sola area
  della guida ha boss — Kamoshida, Madarame, Futaba — e l'area finale può non essere legata a nessuna planimetria) o
  `tesoro-palazzo` raccolto, oppure il 100% con la regola di `raccoltaMappe` (raccolto o collegato a un punto
  gestito). La valuta il caso `palazzo` di `valuta`, e con lui disponibilità e spilli. `impostaRaccolto` chiama
  `allineaBossDellaGuida`: Tesoro o boss finale raccolti segnano il boss finale della Guida con
  `utente.punto_partita.automatico = 1` (migrazione utente 006, DDL in `schemaUtente.ts`; `ON CONFLICT DO NOTHING`,
  un segno già presente non si tocca); tolti, si cancellano **solo** le righe `automatico = 1` e solo se nient'altro
  sulla mappa completa il Palazzo. Le scritture dell'utente (`impostaStatoPunto`, il punto collegato di
  `impostaRaccolto`) mettono `automatico = 0`, e le righe preesistenti nascono 0: un segno messo a mano non si toglie
  mai da solo. `dettagliSpillo` (`senzaIngressoAPalazzoCompletato`, `palazzoDiIngresso`) blocca gli spilli che da
  fuori portano in un Palazzo completato — riconosciuti dal riferimento a una sua mappa, dalla destinazione o, come
  ultima fonte, dall'identità di seed (`seed_identita_json`) quando lo spillo è stato modificato e ha perso il
  collegamento (il 1616 della Shujin) — senza scrivere condizioni: vale anche dopo ogni sincronizzazione. Gli archi
  (`arco`) restano legati alla data. Lo stesso motivo arriva al FE in `DungeonRiassuntoDto.completato` (`elencaDungeon`
  e `dettaglioDungeon` con `?partita=`, null senza; solo per `tipo = 'palazzo'`: `palazziCompletati` non filtra per tipo
  e i Memento, una volta aperti, restano un posto dove andare): sulla **mappa di Tokyo** (`MappaTokyo`, da `CittaPage` e
  `OggiMappa`, che ora passano la partita a `getDungeons`) un Palazzo completato non ha più cartellino anche dentro
  la sua finestra di date, e nell'elenco dei luoghi assenti porta «completato: <motivo>» (2026-10-01).
  `ingressoDelPalazzo(dungeon, giorno)` usa la stessa `palazzoDiIngresso` al contrario: per «Sulla mappa» di una voce
  collegata a un Palazzo (o di una richiesta, Memento) `mappaAzione` dà lo spillo d'ingresso aperto nel giorno della voce
  (sole condizioni di data in cima), in città prima; senza ingresso la prima planimetria del Palazzo (`ruolo_immagine`
  pianta o illustrazione, ordine della scheda), senza nemmeno quella la radice `dungeon-<k>` (2026-10-01).

### Effetti delle azioni della Guida (2026-09-30)

- **Che cosa produce un'azione è un dato**, non il testo delle note: `AzionePercorsoDto.produce: EffettoAzione[]`
  (`shared/effettiAzione.ts`, normalizzato alla lettura: dal 2026-10-01 in `giornataService.voceBase`, prima in
  `correzioniGuidaService.applica`). Tre effetti:
  `dote` (Dote + note 1–3), `lettura` (libro/film/videogioco portato **almeno** a `almeno` sessioni o visioni, null =
  completato; mai indietro) e `turno` (un turno di un'attività contata per volte, con `doti` proprie facoltative al
  posto di quelle dell'attività). Le note restano testo libero.
- **Conversione una volta sola** (`server/db/conversioneEffettiAzione.ts`, migrazione 086): Doti dalle note come
  faceva la spunta, tranne dove sbagliava. Libri e film collegati: prestito, noleggio, acquisto e ritiro non leggono;
  «(n/m)» → n; «iniziare» → 1; «completare/finire/terminare» → completato; «restituire X e prendere Y» → X completato;
  «leggere/guardare X» → una sessione se più avanti un'azione lo completa, altrimenti completato; al cinema ogni azione
  vale «una visione» (`almeno: null`; la 087 corregge le azioni che la prima versione della 086 aveva scritto come «almeno
  n visioni»); i titoli si cercano solo prima del «;». Lavori con una Dote nelle note → `turno` del lavoro (dal negozio:
  `LAVORO_DEL_NEGOZIO`), con Doti proprie se diverse da quelle del lavoro. I quattro lavori ricevono in
  `attivita.effetti_json` la Dote di ogni turno (voce del primo e voce `ripetuto`). La migrazione **utente 007** dà a ogni
  correzione dell'utente che cambiava note o testo gli effetti che quel testo corretto dava (`modifiche_json.produce`; dal
  2026-10-01 la «utente» 015 scrive le correzioni direttamente nelle voci della giornata: vedi «La giornata è canone»).
- **Motore** (`server/services/effettiAzioneService.ts`): `applicaEffettiAzione` dice le Doti che il gioco dà (senza
  toccarle: dal 2026-09-30 si segnano a mano, vedi «Doti solo a mano»), porta avanti le letture con `impostaLettura`
  (le Doti sono quelle dell'elemento, ricordate una volta: `avanzamentoLettura` dice dov'è arrivato) e registra i
  turni con `attivitaService.registraTurno`. Al cinema (nessun totale) «completato» è una visione: l'obiettivo è quante
  spunte della partita (`spunta_voce_partita`; prima `azione_partita` e `azione_utente_partita`) hanno già contato una visione di quel film, più una;
  saltare una visita della guida non regala visioni, togliere e rimettere una spunta non ne aggiunge. Un errore (libro
  non ancora disponibile, 409; attività senza turni, 400) ferma la spunta invece di lasciarla senza punti: prima la
  spunta riusciva in silenzio. `annullaEffettiAzione` toglie i punti del Confidente e i turni (`togliTurno` di
  quell'`ordine`); le Doti non si toccano (si segnano solo a mano, scelta dell'utente del 2026-09-30) e le letture restano (si disfano dalla loro pagina). `EffettiAzioneDto` registra anche `letture`
  (prima → dopo, le Doti che l'elemento ha dato, `visione` al cinema) e `turni` (attività, ordine, Doti).
- **Turni** (`attivitaService`): `registraTurno` / `togliTurno` / `impostaVolteAttivita` sulle attività contate per
  volte (`tracciamento = 'svolta'`, con lo stesso ripiego sul tipo della scheda). Ogni turno registrato ha la sua riga
  in `utente.turno_partita` (migrazione utente 007) e ciò che ha dato sta in `effetto_lettura_partita` con tipo
  `attivita` e lo stesso `ordine` (il primo usa le voci non ripetute, gli altri le `ripetuto`). La spunta toglie il suo
  turno solo se c'è ancora; il contatore (`PUT /api/condizioni/partite/:id/attivita/:chiave`, ora `impostaVolteAttivita`)
  toglie l'ultimo registrato o, se non ce ne sono, uno di quelli contati prima del registro (senza punti). Entrambe le
  tabelle sono in `RIFERIMENTI_PARTITE` per gli orfani del pacchetto.
- Il pacchetto in git è stato portato alla versione corrente applicando le sole migrazioni ai suoi dati (stesse righe in
  ogni tabella): `ricaricaPacchetto` (solo test) copia i dati del pacchetto senza rifare le migrazioni.
- **Guida modificabile al 100%** (voce 2). *Superato dal 2026-10-01 per tutto ciò che riguarda le correzioni sovrapposte
  (`CorrezioneAzioneGuida`, `correzioniGuidaService`, `AzionePercorsoDto.correzione`, `correggiAzioneGuida`, correzioni
  superate, `bodyCorreggiAzioneGuida`, `percorsoService.conTesti`, le rotte delle correzioni): la voce si modifica
  direttamente, vedi «La giornata è canone». Restano validi `campiAzioneStrutturata`, `azioniStrutturateService`
  (`nomeRiferimento`, `verificaEffetti`, `nomiEffetti`, `testoEffetti`, `elenchiAzione`) e `EditorAzioneStrutturata`.*
  Com'era: `CorrezioneAzioneGuida` porta anche `tipo`, `riferimento` (null = nessun
  collegamento), `riferimentoTesto` (calcolato dal server), `rangoAtteso` e `produce`; `correzioniGuidaService` li applica,
  li tiene solo se diversi dalla guida (`scrivi`) e confronta tutto con `firma`; `AzionePercorsoDto.correzione` porta tutti
  i campi originali. La finestra rimanda tutti i campi: `correggiAzioneGuida` verifica solo il collegamento e gli effetti
  **nuovi** (diversi da quelli della guida e della correzione in vigore), così correggere una nota non fallisce se il
  catalogo ha nascosto l'elemento collegato. Il nome di un collegamento corretto si ricalcola a ogni lettura
  (`nomeAttuale`: segue le rinomine del pacchetto; se l'elemento non c'è più resta quello salvato). La riapplicazione di
  una correzione superata non rivalida collegamento ed effetti: se il pacchetto nuovo non ha più l'elemento, è la spunta
  a dire quale (409/400 con il nome) e l'utente lo cambia dalla finestra. `bodyCorreggiAzioneGuida` accetta gli elenchi chiusi di `shared/effettiAzione.ts` (`TIPI_AZIONE`,
  `TIPI_RIFERIMENTO_AZIONE`: `campiAzioneStrutturata`, riusabile). `azioniStrutturateService`: `nomeRiferimento`
  (400 `riferimento-inesistente`; per i Confidenti «Nome - Arcano» come la guida; libri, film, attività e negozi nascosti
  dal catalogo non si collegano), `verificaEffetti` (400
  `effetto-non-valido` / `effetto-inesistente`: letture su elementi esistenti, turni solo su attività contate per
  volte, Doti proprie non vuote), `nomiEffetti` + `testoEffetti` per `produceTesto` (calcolato solo dove si costruisce il
  DTO: `percorsoService.conTesti`, la scheda del giorno, la spunta e le route delle correzioni), `elenchiAzione` per
  `GET /api/compendio/percorso-elenchi` (`ElenchiAzioneDto`). FE: `EditorAzioneStrutturata` (tipo, «Collegata a» +
  «Quale», rango atteso per i Confidenti, effetti Dote/Lettura/Turno con Doti proprie) dentro `ModuloVoceGiornata` per le
  azioni della guida (finestra larga, un'unica area scorrevole); `utils/azioneStrutturata` (`campiCompleti`: a
  collegamento o effetto incompleto «Salva» è spento); ogni riga non spuntata mostra «Alla spunta: …».
  `NOME_TIPO_AZIONE` viene da `TIPI_AZIONE`.
- **Cose da fare dell'utente come azioni della guida** (voce 3). *Superato dal 2026-10-01: le cose da fare sono voci della
  giornata come le altre (`voce_giornata`, spunta `PUT /api/partite/:id/percorso` per uid, niente `azione_utente`,
  `agendaService`, `AzioneUtenteDto`, `impostaAzioneFatta`, `VoceMia` né «La mia»; `SullaMappa(mappa, voce: string | null)`;
  eliminare con effetti in una partita risponde 409 `voce-con-effetti`): vedi «La giornata è canone». Resta valido che
  `statoAzione` e `mappaAzione` stanno in `azioniStrutturateService` e che `PartiAzione` dà i pezzi della riga.*
  Com'era: `azione_utente.produce_json` (migrazione utente 008, che
  ricava gli effetti delle righe già scritte dalle loro note con `effettiDellAzione`, senza punti retroattivi);
  `bodyAzione` usa `campiAzioneStrutturata` (tipo e collegamento chiusi); `agendaService` verifica solo collegamento ed
  effetti nuovi (`strutturaDaSalvare`), e `AzioneUtenteDto` porta tipo, `riferimentoTesto`, `produce`, `produceTesto`,
  `effetti`, `stato`, `mappa` (un tipo o un collegamento fuori elenco, scritto prima, si legge «altro» / nessuno).
  `impostaAzioneFatta(partita, id, fatta, { noteRisposta })` applica gli effetti con `applicaEffettiAzione` (note del
  Confidente comprese) una volta sola, li scrive in `azione_utente_partita.effetti_json`, registra l'evento «percorso»
  («la mia») e li annulla con `annullaEffettiAzione`; `PUT /api/catalogo/agenda/azioni/:id/fatta` accetta `noteRisposta`.
  `statoAzione` e `mappaAzione` stanno ora in `azioniStrutturateService` (riesportate da `percorsoService`), e
  `agendaDelGiorno` riceve i Confidenti già calcolati dalla scheda del giorno. FE: `PartiAzione` (`ImmagineAzione`,
  `CartelliniAzione`, `SceltaNote`) condiviso da `Azione` (guida) e `VoceMia` (utente, con «La mia»); la finestra mostra
  l'editor anche per le cose da fare (nuove o da modificare); eliminare una cosa da fare spuntata con effetti chiede
  «Togli la spunta ed elimina»; `onSullaMappa(mappa, indiceGuida | null)` vale per entrambe (`useOggi`, `PercorsoPage`).
  Eliminare una cosa da fare con effetti in qualche partita risponde 400 nominando le partite in cui riaprirla.
- **Lavori e turni** (voce 4): la Dote di ogni turno è l'`effetti_json` dell'attività, modificabile in `ModuloAttivita`,
  che per le attività contate per volte offre «Vale dalla seconda volta in poi» (`EditorEffetti conRipetuto`) con la
  spiegazione dei turni. La semantica di `ripetuto` è quella di `dotiDaEffetti`: una voce senza vale solo alla prima volta,
  una con la spunta dalla seconda in poi; `descriviVoceEffetto` e le etichette lo dicono ora così («dalla seconda volta in
  poi», prima «anche alle volte successive», che faceva pensare a una somma). Il contatore di Partita → Progressi passa
  da `impostaVolteAttivita`, che restituisce le Doti da segnare per i turni aggiunti o tolti (`ProgressiPartitaDto.daSegnare`, un avviso
  dopo + o −); ogni attività porta `effettiTurno` («1° turno: Gentilezza ♪♪ · Dal 2° turno: Gentilezza ♪♪»,
  `attivitaService.effettiDelTurno`).
- **Dote a ogni incontro con un Confidente** (voce 5): un dato del Confidente, `confidente_dote_incontro`
  (confidente, `verso_rango` 1–10, `effetti_json` di voci «dote»; migrazione 088, che lo riempie dalle 31 azioni della guida
  con rango atteso e ne toglie la Dote solo dopo averla scritta; la 089 ripara i file dove girò la prima 088, che la
  scriveva in `confidente_rango` — ranghi 1–9 — perdendo il rango 10). Lettura e modifica nella scheda del Confidente
  (`ConfidenteDettaglioDto.dotiIncontro`, `PUT /api/compendio/confidenti/:chiave/doti-incontro`, `DotiIncontro.tsx` con
  `RigaDote` condivisa). `incontriService` registra gli incontri in `utente.incontro_confidente_partita` (migrazioni utente
  009, 010, 011): un incontro vale verso il rango successivo a quello della partita, o verso `rangoAtteso` se è il
  passaggio a quel rango. Regole: in un momento della giornata (giorno + fascia) un solo incontro «semplice»; il passaggio al
  rango R una volta sola; un passaggio dove c'è l'incontro semplice di quel momento lo trasforma (niente Dote in più);
  passaggi di ranghi diversi nello stesso momento sono incontri a sé. Fonti: la spunta (guida e cose da fare:
  `applicaEffettiAzione` con `momento`, `EffettiAzioneDto.incontro`), la pagina Confidenti (`aggiornaConfidenteDallaPagina`
  dalla route `PUT /api/partite/:id/confidenti/:chiave`: salire di rango = passaggi, scendere = toglie i passaggi della
  pagina oltre il nuovo rango, risposta o uscita = incontro semplice del momento della partita, «Annulla ultimo» che torna
  ai `punti_prima` = toglie quell'incontro; `ConfidentePartitaDto.doteIncontro` per l'avviso). Togliere una spunta toglie
  l'incontro che aveva creato, salvo un passaggio al rango che la partita ha comunque raggiunto dalla pagina (resta come
  incontro della pagina). `incontro_confidente_partita` è in `RIFERIMENTI_PARTITE`.

## La giornata è canone (richiesta del 2026-09-30, in vigore dal 2026-10-01)

Richieste dell'utente: le voci aggiunte finivano sempre in fondo («devo fare un ordinamento esatto»), anche le azioni
della guida si spostano, «Sposta su / giù» nel menu, niente «La mia», e «le modifiche diventano nuovo canone a tutti gli
effetti quindi non sono mai singola partita... ma tutte devono alterare i dati iniziali». Sostituisce le correzioni
sovrapposte, le rimosse e l'agenda del giorno delle sezioni «Guida giorno per giorno» e «Giornata modificabile».

- **Dati (file di gioco)**: `voce_giornata` (migrazione 092): `uid` (32 esadecimali; per le azioni della guida l'impronta di
  data, posizione d'origine e testo, così file discesi dalla stessa guida danno lo stesso uid; per le voci nuove casuale),
  `data`, `fascia`, `ordine` (0..n-1 dentro la fascia, sempre compatto), `genere` (`azione` si spunta; `evento`,
  `scadenza`, `promemoria` si mostrano), testo, note, tipo, collegamento (`riferimento_testo` salvato solo per quelli
  d'origine della guida: un collegamento scelto dall'utente si nomina alla lettura e segue le rinomine), rango atteso,
  `produce_json`, `indice_guida` (la posizione in `giorno_percorso.azioni_json`, che resta come copia storica e non si
  legge più). Canone: vale per tutte le partite ed esce col pacchetto esportato; **importare un pacchetto sostituisce
  anche la giornata**: le modifiche fatte nell'istanza e non esportate si perdono, e le spunte delle voci che il pacchetto
  non ha diventano orfani dichiarati nell'anteprima (`RIFERIMENTI_PARTITE`: `spunta_voce_partita.voce_uid` →
  `voce_giornata.uid`).
- **Dati (file delle partite)**: `spunta_voce_partita (partita_id, voce_uid, fatta_at, effetti_json)`. La migrazione
  «utente» 015 converte il modello di prima: spunte per posizione e per id → per uid; correzioni scritte nelle voci (solo
  su voci intatte dalla 092); rimosse eliminate (tranne quelle spuntate con effetti, che restano per poterli annullare);
  cose da fare ed eventi dell'utente (anche per singola partita) → voci di tutte le partite; nei giorni toccati l'ordine
  che l'utente vedeva (eventi, guida, cose da fare); rientrante accanto a un file di gioco che ha già il canone; toglie
  `azione_partita`, `azione_utente`, `azione_utente_partita`, `correzione_azione_guida`, `evento_utente` e
  `ordine_giornata` (la «utente» 014, nata e superata lo stesso giorno). Le tabelle di allora restano in
  `schemaUtente.DDL_UTENTE_STORICHE` perché la 001 e la 066 le creano e le portano per i file vecchi.
- **Server**: `giornataService` (`vociDelGiorno`, `conteggiGiornate`, `creaVoce` al posto `posizione`, `aggiornaVoce`
  anche di fascia/posto/genere, `spostaVoce` ±1, `eliminaVoce`, `spuntaVoce`); `percorsoService` (indice, scheda,
  giorno completato, giorno corrente) e `suggerimentiService` leggono le voci. Eliminare una voce, o farne un evento,
  con una spunta con effetti in qualunque partita risponde 409 `voce-con-effetti` nominando le partite. Rotte:
  `POST /api/compendio/percorso/:data/voci`, `PUT /api/compendio/percorso/voci/:uid`, `PUT …/voci/:uid/sposta`
  (`{ verso: -1 | 1 }`), `DELETE …/voci/:uid`, `PUT /api/partite/:id/percorso` (`{ uid, fatta, noteRisposta? }`); tolte le
  rotte delle correzioni per indice e `/api/catalogo/agenda*`. `AzionePercorsoDto` ha `uid`, `giorno`, `genere` (niente
  `indice` né `correzione`); `PercorsoGiornoDto.azioni` sono tutte le voci, prima di giorno poi di sera, nel loro ordine.
- **Interfaccia**: `GiornoGuida` una lista per fascia nell'ordine del server; gesti di ogni voce Modifica, Sposta su, Sposta
  giù (il menu resta aperto e il fuoco sul gesto), Sposta di giorno/di sera, Elimina (con conferma; «Togli la spunta ed
  elimina» se spuntata con effetti nella partita). `ModuloVoceGiornata`: genere, testo, note, fascia e «Posto nella
  giornata» (l'elenco numerato della fascia con la voce al suo posto, Su/Giù); tipo, collegamento, rango ed effetti per le
  azioni. Icone `ui/azione-su` e `ui/azione-giu` (riserva SVG `IconSu`/`IconGiu`, censimento §21).

## Regole trasversali dalla verifica completa del codice (2026-10-03)

Rapporto dei rilievi in `docs/analisi/verifica-completa-2026-10-03.md`; qui le regole che ne sono uscite e che valgono per chi
scrive codice nuovo.

- **Cache dei dati di gioco: un registro unico** (`server/services/cacheDiGioco.ts`). Ogni modulo che tiene in memoria letture del
  DB di gioco registra la propria invalidazione al caricamento (`registraCacheDiGioco(invalidaX)`): traduzioni, motore di
  fusione, eredità, finestre dei Palazzi, nomi delle condizioni. Chi sostituisce o ricarica `gioco.db` (`caricaPacchetto`,
  `ricaricaPacchetto`, `riapriIstanza`) chiama solo `invalidaCacheDiGioco()`. Una cache nuova si registra lì, non si aggiunge a
  mano agli elenchi dei chiamanti (le finestre dei Palazzi ne erano rimaste fuori). I semafori dei Confidenti non hanno più una
  cache fra le chiamate: lo stato si calcola una volta per `confidenti()`.
- **Una sostituzione dei file alla volta** (`server/services/lucchettoIstanza.ts`, `occupaIstanza`): la prendono l'importazione
  del pacchetto e il ripristino dell'istanza; la seconda richiesta riceve 409 `importazione-in-corso`. Il ripristino rifiuta
  anche uno schema più nuovo del codice (400 `database-troppo-nuovo`), come già l'importazione (`pacchetto-troppo-nuovo`).
- **Scrittura atomica dei database** (`installaDatabase`, prima `scriviDatabase`): il file preparato nella cartella di lavoro si
  sposta sopra il vivo (`fsync`, `rename`; su un altro disco, `EXDEV`, copia in un `.nuovo` accanto e poi `rename`). Un crash a
  metà lascia il file di prima, non un file troncato. Se dopo un errore fallisce anche la riapertura, la risposta è un
  500 che dice di riavviare e dove sta la copia di sicurezza.
- **Livello di Joker: fonte unica `partita.livello_protagonista`**. La squadra lo legge da lì; la riga `joker` di
  `membro_squadra_partita` lo ricopia (anche dal riepilogo della partita) ma non è mai letta per il livello.
- **Voci della guida gestite: una regola sola** (`VOCI_GESTITE_SQL` / `vociGestite` in `services/mappe/voceDelPin.ts`): uno stato
  su una voce descrittiva («Altro») non segna i pin, né sul visore e nelle condizioni né nella raccolta e nel completamento dei
  Palazzi.
- **Immagini che appartengono a qualcosa se ne vanno con lui**: eliminando un pin, una mappa o un'area, le schermate dei pin
  (`immagine`, ambito `spillo`) si tolgono nella stessa transazione (`eliminaImmaginiDeiPin`). L'immagine di base di una mappa
  si toglie solo se è soltanto sua: la stessa chiave può essere la pianta di un quartiere (`citta-<quartiere>`) o di un'area.
  Immagine e righe che la legano nascono in una transazione.
- **Riferimenti polimorfici**: un luogo o un negozio dell'utente eliminato stacca i pin e le mappe che lo citavano
  (`staccaDalleMappe`), come già i punti della guida.
- **Importazione delle mappe**: il genitore si scrive sempre (una mappa dichiarata radice torna radice) e i passaggi di altre
  mappe che arrivavano su un pin reinserito ritrovano lo spillo d'arrivo per uid.
- **Chiavi**: una mappa non può avere come chiave un segmento letterale delle rotte di `/api/mappe` (`CHIAVI_MAPPA_RISERVATE`,
  coperto da un test sul router); la chiave di un punto della guida sta nei 200 caratteri delle sue rotte anche in un'area con
  la chiave più lunga possibile.
- **Copie di avvio**: la rotazione toglie anche i giornali `-wal`/`-shm`, quelli rimasti senza il loro database si tolgono a ogni
  avvio (`pulisciGiornaliOrfani`), e in Impostazioni una copia (gioco + partite) si conta una volta.
- **Client HTTP e busta**: vedi §4 (tentativi solo sui metodi idempotenti, `payloadDellaBusta` per chiave). Gli invii di file
  passano tutti da `inviaFile` (`src/services/api/_helpers.ts`), che controlla lo stato prima di leggere il corpo: un rifiuto del
  proxy in HTML diventa un `ApiError` leggibile.
- **`useCarica`**: `ricarica()` si risolve quando la rilettura è arrivata (anche fallita; subito se il componente è smontato);
  `imposta` accetta una funzione che riceve i dati **correnti**. Un aggiornamento locale che arriva dopo un `await` usa sempre la
  forma con funzione: partire dai dati del render annullava un secondo gesto fatto nel frattempo.
- **Store con richieste che si sovrappongono** (`partitaStore`, `suggerimentiStore`): un contatore di generazione, vale solo la
  risposta dell'ultima richiesta; cambiando partita i suggerimenti della precedente si azzerano subito.
- **Progressi a pressioni rapide** (libri, film, videogiochi): un solo hook, `useCodaProgresso` — una richiesta per volta per
  elemento, chiave `partita:elemento`, la coda si ferma se la partita attiva cambia.
- **Elenchi modificabili con stato per riga** (condizioni, effetti): chiavi da `useIdStabili`, mai l'indice né il contenuto.
- **Finestre di dialogo** (`Modal`): il fuoco entra nella finestra (campo `autoFocus` o la finestra stessa, mai un campo a caso:
  su telefono aprirebbe la tastiera), Tab resta dentro, alla chiusura torna a chi l'ha aperta (registro unico di fuoco e clic,
  perché molte finestre nascono già aperte e un `autoFocus` prende il fuoco prima degli effetti).
- **Accessibilità**: un `div`/`span` con `aria-label` ha sempre un `role` (`group` per i contenitori, `img` per i segni); lo
  verifica `src/accessibilita.test.ts` leggendo i sorgenti.
- **Deploy (`nginx.conf`)**: il backend si risolve per nome a ogni richiesta (`resolver 127.0.0.11`, variabile `$backend`), così
  un container ricreato da Watchtower non lascia nginx sul vecchio IP (502); `/api/mappe/importa` accetta 64 MB come Express;
  `immutable` solo sui file con hash di `/assets/`, gli altri statici si rivalidano dopo un'ora.
- **Script**: `start-be.sh`/`start-fe.sh` si dichiarano «già in ascolto» solo se sulla porta c'è node (`gia_avviato_o_esci`),
  altrimenti escono con 1; `genera-pacchetto.ts` toglie la cartella di lavoro anche quando fallisce; `accesso:copertura` misura il
  `gioco.db` dell'istanza.

## Strutture comuni della verifica completa (fase 3, 4 ottobre 2026)

Le ridondanze trovate dalla verifica (`docs/analisi/verifica-completa-2026-10-03.md`, §9) sono diventate un posto solo. Chi aggiunge
codice parte da qui invece di riscriverle.

**Server**
- `server/schemas/comuni.ts`: `idParam`, `boolQuery`, `testoRicerca`, `livello`, `dataGioco` (un messaggio solo), `uidVoce`,
  `elencoInteri`, `dote`, `categoriaArticolo`.
- `server/services/verificaPartita.ts`: `verificaPartita(id)` e `partitaNonTrovata(id)`, il 404 della partita (prima ripetuto in 26
  punti).
- `server/services/datiGuida.ts`: `datiGuida(chiave)` legge una volta i blocchi di `dati_guida` e li tiene in cache, congelati e tipizzati
  `Congelato<T>` (in sola lettura a ogni livello: una modifica sul posto è un errore del compilatore, N7 della verifica);
  `finestreDungeon()` per le finestre dei Palazzi. La cache sta nel registro `cacheDiGioco`.
- `server/services/mappe/alberoMappe.ts`: `sottoalberoMappe`, `palazzoDellaMappa`, `radiceDelPalazzo`, `SQL_SOTTOALBERO`. Una regola
  per «il Palazzo di una mappa», cioè la radice `dungeon-<chiave>` senza genitore. Prima c'erano nove implementazioni e due regole.
- `server/utils/zip.ts`: ZIP a flusso (`scriviZip`, `leggiIndiceZip`, `estraiVoce`), CRC di `zlib`. Copia, ripristino e
  importazione lavorano su file in `data/tmp`, mai su buffer da centinaia di MB, e installano con `installaDatabase`.
- Caricamenti in blocco al posto di una query per riga:
  - `contestoMappe()` (mappe);
  - `possedute()` / `possedutaPerId()` (scorta);
  - `skillRiassunti()`;
  - le affinità dell'elenco Persona;
  - `confidente()` / `ranghiConfidenti()`.
- Migrazioni 096 (via `seed_meta` e un indice doppio) e utente 016 (via un indice doppio, nuovo indice su
  `spunta_voce_partita.voce_uid`).

**Condivisi**
- `shared/doti.ts` (`DOTI_SOCIALI` e nomi, nell'ordine di `dote_sociale.ordine`);
- `shared/articoli.ts` (categorie);
- `shared/statistiche.ts` (`CHIAVI_STATISTICHE`, `NOMI_STATISTICHE`; `StatisticheDto` e `OsservazioneStatisticheDto` ne sono
  alias);
- `leggiGiorni` in `shared/orariNegozio.ts`;
- i DTO `ElenchiRegoleDto`, `PinConStatoDto`, `ManifestImmaginiDto`, prima solo nel client.

**Frontend**
- le pagine si caricano alla prima visita (`router.tsx`, `lazy`), con un `Suspense` attorno all'`Outlet` del layout;
- il barrel `services/api` esporta tutti i moduli, `condizioni` compreso, e i sorgenti importano solo da lì;
- aiuti in `src/utils`:
  - `salvaFile`;
  - `cicli` (`NOME_MODO_PARTNER`);
  - `contornoSagoma`;
  - `piatto` in `testo`;
  - `dateGioco` (che usa la data leggibile condivisa);
- `components/shared/VoceFonte` (`VoceTesto`, `Fonte`);
- il raggruppamento degli spilli tiene in cache i centri delle nubi e, nel visore, sta in un `useMemo`;
- l'area visibile di una planimetria si cerca dai bordi;
- iscrizioni agli store con selettori stretti (`useShallow`).
