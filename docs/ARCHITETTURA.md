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
                      fusione/motoreFusione.ts (motore puro su snapshot in memoria), fusione/alberoFusione.ts (piani
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
                      PianiFusione (albero ricorsivo con foglie scorta/Registro/cattura, opzioni, skill richieste con badge per nodo),
                      PannelloEredita (slot, bacino, tratti), SelettoreSkill (scelta multi-skill con ricerca), CercaSkill (ricette valide per skill),
                      PannelloVelluto (sconto/Allarme/Gemelle/ranghi), ForcaIsolamento (calcolatori Forca e Isolamento sulla scorta)
  components/impostazioni/ GestionePartite, ImmaginiCaricate (rimozione per ambito o totale), CaratteriEditor, TraduzioniEditor
  pages/              Home, Compendio (232 Persona, filtri client-side), PersonaDettaglio, Glossario (termini per categoria), Skill (525, filtri), SkillDettaglio,
                      Fusione (due arcani, matrice 24×24, ricette speciali, Demoni del Tesoro), Partita (schede), Impostazioni, NotFound
  stores/             configStore, notificationStore, glossarioStore (rese italiane, caricato una volta), partitaStore (partite + attiva),
                      preferenzeStore (localStorage: grafica predefinita), assetStore (manifest /asset/manifest.json + hook useAsset)
  utils/              constants, elementi, punti (formato/anteprima punti Confidente), assetPredefiniti (chiavi manifest per entità)
vite/                 assetPredefiniti.ts — plugin: manifest degli asset in public/asset/ (dinamico in dev, emesso in build)
public/asset/         asset grafici predefiniti (vedi README.md e docs/grafica/prompt-immagini.md); vuoto nel repo finché non consegnati
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
arriva dal client (istantanea di `PianoFusioneDto`) ed è validato strutturalmente (schema zod ricorsivo + `verificaAlbero`: modi ammessi,
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
`giorno_percorso` (data 'MM-GG', azioni in JSON con riferimento risolto in fase di build del seed) e `azione_partita` (data + indice
dell'azione). Il giorno corrente è `partita.data_gioco`. `percorsoService`: indice leggero, scheda del giorno con precedente/successivo,
spunta con evento «percorso», impostazione del giorno corrente.

### Completamento (Fase 9.1)
Migrazione 019: `trofeo` (chiave stabile, tipo, come/quando, `verificato`) e `trofeo_partita`; finali, Covo dei Ladri, DLC, meteo, Nuova Partita+,
differenze e tempo sono JSON in `dati_guida` («completamento»). `completamentoService`: elenco con ottenuti, spunta con evento «trofeo».

### Sfide (Fase 9.2)
`sfide.json` è consultazione pura in `dati_guida` («sfide»); le domande del game show in TV riusano il modello `domanda` (tipo «altro», chi «Game show in TV») e quindi la spunta per partita.

### Piante delle aree (Fase 7.4)
Migrazione 020: `pianta_area` (URL, pagina, fonte, licenza, alternative in JSON) e colonna `origine` su `marcatore_mappa`. Le immagini non
entrano mai nel repository: `scaricaPianta` le importa nell'istanza (ambito «mappa») al primo accesso all'area, provando le fonti
alternative; gli spilli del seed hanno `origine = 'seed'` e il reseed non tocca quelli fissati dall'utente.

### Mappe della città (Fase 8.3)
Migrazione 022: `pianta_quartiere` e `marcatore_luogo` (origine seed/utente). L'immagine del quartiere vive in `immagine` (ambito «mappa»,
chiave `citta-<quartiere>`), scaricata al primo uso; `MappaInterattiva` accetta etichette e colori per tipo e viene riusata per i luoghi.

### Personaggi (Fase 10.3)
`personaggi.json` è consultazione pura in `dati_guida` («personaggi»); il campo `confidente` collega alla scheda e al ritratto del Confidente
(`ImmagineEntita` ambito «confidente», con la coppia fedele/stilizzata della 10.1).

### Oggetti della guida (Fase 10.2)
`oggetti-guida.json` è consultazione pura in `dati_guida`; distinto dal compendio `oggetti` (equipaggiamento con statistiche) e dai cataloghi dei negozi (prezzi per punto vendita).

## 5 bis. API (step 0.4)
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
- `shared/PulsanteVisivo.tsx` (`PulsanteVisivo`, `CollegamentoVisivo`): pulsante o collegamento a tassello con icona (`iconeGuida` SVG o asset),
  titolo in carattere display (17 px) e dettaglio nel sans; toni primario/secondario/fantasma/pericolo, `attivo` per gli interruttori; usato in tutta
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
- `persona_posseduta.bonus_*` (migrazione 023): le statistiche effettive sono `statistichePerLivello(base, livelloBase, livello) + bonus`
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
`spillo` (x/y in percentuale dell'immagine, `tipo` del registro `shared/spilli.ts`, riferimento tipizzato mappa|negozio|punto|luogo|confidente|
richiesta|attivita, `collezionabile`), `spillo_partita` (raccolto per partita). `server/services/mappe/sincronizzaMappe.ts` è idempotente:
crea `tokyo` → `citta-<quartiere>` e `dungeon-<chiave>` → `<area>` dalle tabelle della guida e trasforma `marcatore_mappa`/`marcatore_luogo` in
spilli (riferimento `punto`/`luogo`, stessa origine); gira nella migrazione (istanze esistenti) e alla fine di `caricaSeed`, seguita
dall'importazione del seed `data/seed/mappe-editor.json` (origine «seed», mai sopra le mappe modificate dall'utente).
`server/services/mappe/mappeService.ts`: albero, dettaglio (percorso, figli, spilli con `dettaglio` dell'entità: articoli del negozio con
`comprato`, stato del punto, Confidente, richiesta) e stato «raccolto» (uno spillo di un punto già ottenuto/esaurito nella Guida conta come
raccolto; `impostaRaccolto` aggiorna anche `punto_partita`), editor (CRUD con validazione dei riferimenti e dei cicli genitore), immagine di
base (`impostaImmagineMappa`, corpo grezzo `image/*`, dimensioni da `dimensioniImmagine` PNG/GIF/JPEG/WEBP), `esportaMappe`/`importaMappe`
(pacchetto JSON versione 1 con immagini in base64; nessuna dipendenza ZIP disponibile). Rotte in `server/routes/mappe.ts` (`/albero`,
`/esporta`, `/importa`, `/entita/:tipo/:chiave`, `/:chiave`, `/:chiave/immagine`, `/:chiave/spilli`, `/spilli/:id`) e
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
mappa, fine trascinamento) e con `pannello`/`intestazione` propri. Ogni modifica è salvata subito via API e la mappa viene ricaricata
senza smontare il visore (`isLoading` solo senza dati: zoom e posizione restano). Riferimenti cercati con `GET /api/mappe/riferimenti`
(`cercaRiferimenti`: LIKE su nome/chiave per tipo). Schermate degli spilli: migrazione 028 `spillo_immagine` (immagine dell'istanza
nell'ambito «spillo» oppure `asset` del repository, didascalia, ordine), rotte `POST /api/mappe/spilli/:id/immagini` (corpo `image/*`),
`PUT/DELETE /api/mappe/spilli/immagini/:id`; `SpilloDto.immagini` e `GalleriaSpillo` nel visore. `sincronizzaMappe` crea anche i passaggi
verso le mappe figlie (Tokyo → quartieri, Palazzo/Dedalo → aree) disposti in griglia, da trascinare nell'editor: la mappa globale di Tokyo
e la mappa verticale dei Mementos sono immagini dell'utente nell'istanza (mai nel repository) con i quartieri e i Dedali come passaggi;
gli accessi ai Palazzi e ai Mementos sono passaggi dentro le mappe dei luoghi (es. la stazione di Shibuya). Esportazione: `esportaMappe(radice)`
limita al sottoalbero; `creaPacchettoRepository` produce lo ZIP (scrittore «store» in `server/utils/zip.ts`) con `data/seed/mappe/<chiave>.json`
(immagini di base come `asset: mappe/<chiave>`, schermate come `asset: spilli/<mappa>/<n>-<m>`) e i file in `public/asset/`;
`caricaSeed` importa `mappe-editor.json` e poi ogni `data/seed/mappe/*.json` (nell'hash del seed).

### Integrazione delle mappe nelle pagine (Fase 13.4)
`src/hooks/useMappaPartita.ts` (mappa con la partita attiva, azioni raccolto/punto/acquisto con aggiornamento locale, `versione` per ricaricare,
`onCambiato` per avvisare la pagina ospite) è condiviso da `MappaPage` e da `src/components/mappe/MappaIncorporata.tsx` (visore `incorporato`
ad altezza fissa con «Schermo intero» e «Modifica mappa»). «La città» mostra la mappa `tokyo` sopra le piastrelle (`MiniaturaMappa`: immagine
dell'istanza → asset `mappe/<chiave>` → icona); la scheda del quartiere mostra `citta-<q>`; la scheda del Palazzo mostra la mappa dell'area
corrente e tiene allineati elenco dei punti e visore (l'elenco ricarica il visore con `versione`, il visore ricarica la scheda con `onCambiato`).
Il vecchio `MappaInterattiva` e le funzioni client dei marcatori sono rimossi: il posizionamento vive solo nell'editor; le rotte server dei
marcatori (`PUT /api/mappe/marcatori`, `/marcatori-luoghi`) restano perché alimentano la sincronizzazione iniziale degli spilli e i test.

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
- `semaforiService`: stato della partita letto una volta (Doti, arcani in scorta, boss segnati, richieste completate, ranghi, giorno e meteo
  correnti, conferme) e valutazione per requisito → `SemaforoRequisitoDto` (verde/rosso/grigio, dettaglio, manuale, confermato);
  `ConfidentePartitaDto.semafori` per i ranghi superiori; `PUT /api/partite/:id/confidenti/:chiave/requisiti`.
- Percorso: `impostaAzione` applica alla spunta gli effetti della guida (`dotiDalleNote`: «Perizia +2» = 2 punti; `noteRisposta` 1–3 per gli
  incontri con un Confidente col bonus dell'arcano dalla scorta) e li registra in `azione_partita.effetti_json` (migrazione 025) per annullarli
  togliendo la spunta; `AzionePercorsoDto.effetti`; scelta delle note nella pagina Percorso.

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
- **Semafori** — nuovo tipo `persona-abilita` (`shared/seed.ts`, `semaforiService`): verde quando la scorta contiene la Persona indicata con quella skill (`persona_posseduta` × `persona_posseduta_skill` × `skill`). Seed dei requisiti ricostruito dalla guida Royal (vedi `docs/riferimenti/semafori-confidenti.md`); regola di merito: un semaforo è solo ciò che il gioco impone.
- **Spilli** — `sincronizzaMappe` riclassifica a ogni avvio gli spilli di origine `seed` con riferimento `punto` quando `spilloPerPunto` cambia (tipo e collezionabilità), senza toccare gli spilli dell'utente né `spillo_partita`; restituisce `riclassificati`.
- **Spilli dall'asset** — `SpilloGrafico`/`PuntoSpillo` (`src/components/mappe/IconaSpillo.tsx`): se `ui/spillo-<tipo>` esiste è lo spillo intero (`.spillo-mappa__figura`, punta sul punto ancorato), altrimenti la goccia colorata col disegno di riserva; legenda, elenco e popup usano la stessa immagine in piccolo.
- **Personaggi** — ambito immagine `personaggio` (`AMBITI_IMMAGINE`, `chiaviAssetPredefinito` → `personaggi/<chiave>`): Protagonista, Stanza di Velluto e Jose usano `ImmagineEntita` come i Confidenti; `PersonaDelPersonaggio` apre la Persona in una finestra al tocco.
- **Home desktop** — da 1360 px `.home-griglia` è «carta mappa / oggi mappa» (5/12 + 7/12), senza accessi rapidi; la stella della carta è `max(230px, min(40vh, 50cqw, 420px))` (`.home-carta` è un contenitore di query).
- **Formati** — `Topbar` e `PartitaSelettore` stanno in 375 px (logo e selettore restringibili); `.titolo-tasselli` scala sulla larghezza (`clamp(20px, 5.4vw, 42px)`); `FilaScorrevole` (`src/components/shared/FilaScorrevole.tsx`, CSS `.fila-scorrevole`) rende le file di schede/filtri una riga sola scorrevole sotto i 768 px, con la scheda attiva portata in vista; `.home-griglia` con aree per telefono/tablet/desktop; `.kpi-griglia` 2/3/auto colonne; `.sr-only { top:0; left:0 }` fuori dai layer perché un riquadro assoluto da 1 px in fondo a un elenco che scorre allungava il documento (seconda barra verticale); `.btn-nota` compatto col mouse e 44 px sui dispositivi a tocco.

## 8. Build, test, deploy
- Test (Vitest, 95 file / 290 casi al 2026-09-04): BE su DB in memoria con seed reale (`server/routes/api.test.ts`, migrazioni, seed, `partiteService.test.ts` per le meccaniche pure),
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
