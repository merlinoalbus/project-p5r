# Verifica completa del codice — 3 ottobre 2026

Branch `ottimizzazione/verifica-completa`, voce 1 della sezione «Verifica completa del codice, commenti e Swagger» (ROADMAP).

**Metodo.** Cinque verifiche in sola lettura, una per area (API del server; servizi mappe e guida; altri servizi e database;
condivisi e stato del frontend; pagine e componenti), poi cinque **controverifiche indipendenti** che hanno ripreso ogni rilievo
dal codice cercando di smentirlo (grep su `server/`, `shared/`, `src/`, `scripts/` e test; database aperti in sola lettura). I
rilievi più gravi li ho riletti io sul codice. Qui restano solo i rilievi confermati (o confermati in parte, con la parte vera);
la gravità è quella corretta dalla controverifica. Dopo la prima validazione sono state aggiunte due verifiche: script, deploy,
configurazione e test (§5-bis, con l'elenco di cosa è stato guardato), e commenti e documenti che descrivono codice che non
esiste più (§5-ter). Nessun rilievo è risultato del tutto falso; le correzioni proposte che la
controverifica ha smentito sono riportate già corrette.

Legenda: **G** gravità (A alta, M media, B bassa) · **C** la correzione cambia un comportamento osservabile (sì/no) ·
**Fase** dove si corregge (2 bug e criticità, 3 ridondanze e ottimizzazioni, 4 commenti e documenti) · **Decide** chi deve scegliere (U = l'utente).

## 1. API del server (`server/index.ts`, `bootstrap.ts`, `middleware/`, `routes/`, `schemas/`, `utils/`)

187 rotte (partite 58, compendio 52, mappe 27, catalogo 9, impostazioni 9, fusione 8, immagini 8, condizioni 6, font 4,
traduzioni 4, cioè 185 nei router, più `/api/health` e `/api/config` in `bootstrap.ts`; la ROADMAP conta le 185 dei router).

| ID | G | Rilievo | Correzione | C | Fase |
|----|---|---------|------------|---|------|
| F01 | M | `bootstrap.ts:46` `cors()` aperto: qualunque sito aperto nel browser può chiamare l'API (che non ha autenticazione) anche con PUT/DELETE; il frontend non ne ha bisogno (stessa origine: proxy Vite / nginx) | togliere `cors()` | sì | 2 · **U** |
| F02 | M | `errorHandler.ts:85` restituisce `err.message` nei 500 e `/api/health` lo restituisce in `db.error` di una risposta 200 (messaggi SQLite, percorsi assoluti) | messaggio fisso, dettaglio solo nel log col `requestId` | sì | 2 |
| F03 | B (M se pubblicata) | `scaricaDaUrl.ts:43-52,76` scarica qualunque URL http(s) con redirect seguiti: l'importazione di un'immagine da URL (unico chiamante, vedi §6) può interrogare host interni | rifiutare indirizzi locali/privati e rivalidare i redirect | sì | 2 · **U** |
| F04 | M | `/api/health` risponde 200 anche con il DB rotto: l'HEALTHCHECK Docker non se ne accorge | 503 quando il DB non risponde (`getHealth` del frontend non è usato) | sì | 2 |
| F05 | M | `impostazioni.ts:42` `res.download(…, () => rmSync)`: in Express 5 l'errore va solo alla callback (richiesta appesa) e un'eccezione di `rmSync` fa cadere il processo | callback con `try/catch` e `next(err)` | sì (solo su errore) | 2 |
| F06 | B | una mappa radice chiamata «Albero», «Esporta», «Ordine», «Riferimenti», «Marcatori»… prende una chiave che le rotte letterali oscurano | chiavi riservate rifiutate in `creaMappa` e `importaMappe` | sì | 2 |
| F07 | B | `schemas/catalogo.ts:52` accetta `condizioni_json` sul negozio ma il servizio lo scarta in silenzio; commento orfano | togliere il campo e il commento | sì | 2 |
| F08 | B | gli errori 4xx di Express senza caso (es. 404 ENOENT di `sendFile`) diventano «richiesta non valida» | gestire 404/403/416 | sì | 2 |
| F09 | B | `catalogo.ts:20` usa il codice `dati-non-validi` dove il resto usa `validation-error` | uniformare | sì | 2 |
| F10 | B | `condizioni.ts:116-117,136-137` due scritture fuori transazione | transazione | no | 2 |
| F11 | B | `nodoPiano` ricorsivo senza limite di profondità (`profondita` del piano senza massimo) | limite di profondità | sì (input patologici) | 2 |
| F12 | B | 6 rotte usano `req.params` senza schema (`compendio.ts:197,246,250`, `catalogo.ts:39`, `mappe.ts:23,24`) | `validate({ params })` | no | 2 |
| F13 | B | `queryCicli.dlc` stringa libera interpretata a mano; booleani diversi da `queryPiani` | schemi comuni | sì | 3 |
| F14 | B | `responseShape` riconosce la busta dalla presenza di `data`/`error`; `condizioni.ts:70` la costruisce a mano | marcatore esplicito; `res.json(array)` | no | 2 |
| F15 | B | IIFE `void (async () => …)()` in `impostazioni.ts` (Express 5 propaga già le promise) | handler `async` | no | 3 |
| F16 | B | schemi e costanti duplicati (categorie articolo, doti ×3, regex data ×7, id intero ×3, `booleano`=`boolQuery`, elenchi di numeri) | `schemas/comuni.ts` e `shared/` | no | 3 |
| F17 | B | export superflui (`httpErrors.internal` mai usato; altri da togliere solo come `export`) | togliere (`httpErrors.internal` resta: dalla fase 2 lo usa C5) | no | 3 |
| F18 | B | il controllo «la partita esiste» ripetuto (vedi K4) | un helper | no | 3 |
| F19 | M | `depositaCopia`/`depositaContenuto` sincroni su centinaia di MB; ZIP con CRC in JS e doppio buffer | I/O asincrono, `zlib.crc32`, ZIP a flusso | no | 3 |
| F20 | B | `/condizioni/elenchi` e `progressi` rifanno 7 query a ogni chiamata | cache invalidata dalle scritture (facoltativo) | no | 3 |
| F21 | B | PUT requisiti calcola tutti i Confidenti per restituirne uno | funzione per un solo Confidente (vedi P1 servizi) | no | 3 |
| F22 | B | `datiGuida` rifà `JSON.parse` dei blob a ogni GET | cache per chiave, clonata (la rotta la modifica) | no | 3 |

## 2. Servizi mappe e guida (`services/mappe/`, `dungeonService`, `palazziService`, `disponibilitaService`, `semaforiService`, `condizioni/`, `catalogoService`, `cittaService`)

| ID | G | Rilievo | Correzione | C | Fase |
|----|---|---------|------------|---|------|
| B1 | M | `creaPunto` (`dungeonService.ts:563`) non limita la chiave: un nome lungo crea un punto che le rotte (max 200) non sanno più modificare; uno slug vuoto dà una chiave che finisce con `-` | la stessa regola di `creaArea` | sì | 2 |
| B2 | B | `invalidaFinestreDungeon` non è mai chiamata: dopo un pacchetto le finestre dei Palazzi restano vecchie fino al riavvio | invalidarla con le altre cache (vedi R1) | sì | 2 |
| B3 | M | `importaMappe` (con `sovrascrivi`) non riporta a radice una mappa il cui genitore nel pacchetto è nullo | scrivere sempre `genitore_chiave` (NULL compreso) | sì | 2 |
| B4 | M | reimportando una mappa i pin vengono reinseriti con id nuovi: i passaggi di **altre** mappe che arrivavano su quei pin perdono lo spillo d'arrivo (`ON DELETE SET NULL`) | rimappare `spillo_arrivo_id` per uid | sì | 2 |
| B5 | M | eliminando un pin, una mappa o un'area le immagini (ambito `spillo` e, per la mappa, ambito `mappa`) restano in `gioco.db` | cancellarle nella stessa transazione | no (spazio) | 2 |
| B6 | B | nelle condizioni annidate (gruppi, NON) il dettaglio mostra le chiavi grezze invece dei nomi | passare i nomi | sì (testo) | 2 |
| B7 | B | la regola «pin segnato tramite la voce» è scritta tre volte; due non escludono le voci descrittive | una query condivisa | sì (dati legacy) | 2 |
| B8 | B | `dettaglioMappa` elenca fra i figli di Tokyo anche i Memento, che `conteggi` esclude (24 contati, 25 mostrati) | filtrare come `elencaMappe` | sì | 2 |
| B9 | B | immagine di pin e di mappa salvate fuori da una transazione comune | transazione | no | 2 |
| B10 | B | `negozioDettaglio` inghiotte ogni errore | intercettare solo «negozio non trovato» | no | 2 |
| B11 | B | `aggiornaPunto(x, {})` usata per leggere: UPDATE inutile e riallineamento degli Enigmi | `leggiPunto` | no | 3 |
| B12 | B | a parità di `ordine` alcune viste ordinano per nome, altre per chiave | `ordine, chiave` ovunque | sì (pareggi) | 2 |
| B13 | B | due regole per «il Palazzo di una mappa» (oggi coincidono sui dati) | una sola (vedi R3) | no | 3 |
| B14 | B | eliminando un luogo/negozio/attività dell'utente restano pin e legami di mappa che lo citano | 409 se citato, oppure azzerare i riferimenti | sì | 2 |
| P1 | A | per ogni pin con un negozio si ricalcola tutto lo stato della partita (`dettaglioNegozio`), già calcolato nel contesto | passare lo stato | no | 3 |
| P2 | M | `percorsiMappe` compila gli statement a ogni chiamata (anche nei cicli) | statement preparati una volta | no | 3 |
| P3 | M | `elencaMappe` fa decine di query per mappa (333 mappe) | caricamenti in blocco | no | 3 |
| P4 | M | `contenutiMappa` calcola le schede di **tutti** i 187 contenuti guida per ogni mappa | filtrare per le aree della mappa | no | 3 |
| P5 | B | `importaMappe` rilegge colonne e uid a ogni pin | una volta per importazione | no | 3 |
| P6 | B | condizioni valutate due volte (tre per i fissi) e `pinCitato` interrogato a ogni valutazione | memoizzare per richiesta (non sostituire con `nomi.spilli`) | no | 3 |
| P7 | B | `dettaglioDungeon` calcola due volte la raccolta; `elencaDungeon` rilegge i segni per ogni Palazzo | calcolo unico | no | 3 |
| P8 | B | parse ripetuti di `nativo_json`, `includes` in un ciclo, nome del genitore due volte, `collezioniImmagini` intera per una mappa | piccole correzioni | no | 3 |
| R1 | B | la lettura di `finestre-dungeon` è scritta cinque volte | una funzione con cache invalidabile | no | 3 |
| R2 | B | `semaforiService` riscrive `ordineGioco` e i nomi dei Palazzi | importare | no | 3 |
| R3 | B | nove implementazioni di «sottoalbero / Palazzo di una mappa» | una CTE condivisa | no | 3 |
| R4 | B | `eliminaArea` ripete riga per riga la pulizia di `eliminaPunto` | `staccaPunto` | no | 3 |
| R5 | B | cinque ricerche di un gruppo di immagini in JS dove una usa `json_extract` | `json_extract` | no | 3 |
| R6 | B | il nome della richiesta tradotto due volte | toglierne una | no | 3 |
| R7 | B | `creaMappa` legge tre volte il genitore | una lettura | no | 3 |
| R8 | B | parse di `giorni_json` duplicato (le uscite differiscono) | helper per il solo parse | no | 3 |
| R9 | B | codice morto: `luoghiDungeon`, `soloPresenza`, `reimpostaDatiMappe`/`TABELLE_MAPPE` (e lo script citato nei documenti che non esiste); export solo interni | togliere | no | 3 |

## 3. Altri servizi e database (`services/` restanti, `db/`)

| ID | G | Rilievo | Correzione | C | Fase |
|----|---|---------|------------|---|------|
| C1 | M | `ripristinaIstanza` non prende il lucchetto dell'importazione: due ripristini, o un ripristino e un'importazione, si possono sovrapporre | lucchetto comune, 409 | sì | 2 |
| C2 | M | il ripristino accetta un database con schema **più nuovo** del codice | rifiutarlo come fa l'importazione | sì | 2 |
| C3 | M | `scriviDatabase` scrive direttamente sul file vivo (~300 MB): un crash a metà lo lascia troncato | file temporaneo + `rename` | no | 2 |
| B1' | M | dopo un'importazione o un ripristino restano vecchie le finestre dei Palazzi e la cache dello stato dei semafori | invalidarle | sì | 2 |
| B2' | M | la cache dei semafori ha come chiave `partita.updated_at`, che i collegamenti alla guida non aggiornano: semafori vecchi | togliere la cache, calcolo unico in `confidenti()` | sì | 2 |
| B3' | M | il livello di Joker sta in due posti e il riepilogo ne aggiorna uno solo: Squadra e Fusione mostrano livelli diversi | fonte unica `partita.livello_protagonista` (è sempre la più recente: la migrazione proposta nel rapporto copiava nel verso sbagliato) | sì | 2 |
| B4' | B | `verificaDatabase` lascia in `data/tmp` i file `-wal`/`-shm` (14 trovati) | cancellarli | no | 2 |
| B5' | B | la rotazione delle copie di sicurezza lascia `-wal`/`-shm` (30 trovati) | cancellarli | no | 2 |
| B6' | B | il numero delle copie di sicurezza mostrato è il doppio | contare solo i `.db` di gioco | sì | 2 |
| C4 | B | il controllo delle chiavi esterne delle migrazioni avviene dopo il commit: una violazione si vede una volta sola | dentro la transazione | sì | 2 |
| C5 | B | se riaprire l'istanza fallisce durante il ritorno alla copia di sicurezza, l'errore non è gestito | `try/catch` con dettaglio (rimettere anche `partite.db` è corretto) | no | 2 |
| C6 | B | scritture e `updated_at` della partita fuori transazione (meteo, obiettivi, piani, cicli) | transazione | no | 2 |
| R1' | B | indice `idx_effetto_lettura_partita` duplicato dalla chiave primaria | migrazione utente che lo toglie (e DDL aggiornata) | no | 3 |
| R2' | B | indice `idx_traduzione_ambito` duplicato dalla chiave primaria | migrazione 096 | no | 3 |
| R3' | B | tabella `seed_meta` che nessuno scrive (valori fermi al 9 settembre); campo `seed` dello stato dell'istanza | togliere tabella e campo | sì (DTO) | 3 |
| R4' | B | `giorno_percorso.azioni_json` non più letta dai servizi | **nessuna azione**: serve a convertire un `partite.db` vecchio | — | — |
| R5' | B | nessun indice su `spunta_voce_partita.voce_uid` | indice (facoltativo) | no | 3 |
| R6' | B | `libro.effetto_json` vuoto ovunque ma letto come ripiego | togliere il ripiego | no | 3 |
| K1–K5 | B | `haAnimaDaCineasta` e `rangoArcana` duplicate; letture di `dati_guida` copiate; «la partita esiste» ripetuto 25 volte; export mai usati | condividere / togliere | no | 3 |
| P1' | M | `confidenti()` fa una query regali per Confidente e calcola tutto più volte per una sola richiesta | query raggruppate, calcolo unico, funzione per uno | no | 3 |
| P2' | M | `possedutaDto` ~100 query per una scorta di 12 Persona | JOIN unica | no | 3 |
| P3' | M | importazione dal deposito e copia dell'istanza tengono in memoria e riscrivono più volte ~300 MB | file temporaneo unico, ZIP a flusso | no | 3 |
| P4'–P6' | B | `elencaPersona` una query per Persona; doppi calcoli in `attivitaService`; meteo per ogni partita dell'elenco | caricamenti in blocco, calcolo unico (P6' facoltativo) | no | 3 |

## 4. Condivisi e stato del frontend (`shared/`, `src/services`, `stores`, `hooks`, `utils`)

| ID | G | Rilievo | Correzione | C | Fase |
|----|---|---------|------------|---|------|
| B1" | A | `descriviGiorni([])` restituisce «` e undefined`»: ogni luogo senza giorni mostra «Giorni:  e undefined»; inoltre «dal lunedì **al** domenica» | caso vuoto, `congiunzione` condivisa, «alla domenica» | sì | 2 |
| B2" | M | il client ritenta in automatico **anche POST e PATCH**: dopo un 5xx o un timeout a scrittura avvenuta si raddoppiano yen, fusioni, creazioni | ritentare solo GET/HEAD/PUT/DELETE | sì | 2 |
| B3" | M-B | due spunte ravvicinate nella giornata (anche in `PercorsoPage`) annullano a schermo la prima | aggiornamento funzionale (`imposta(d => …)`) | sì | 2 |
| B4" | B | `suggerimentiStore`: una risposta vecchia può sovrascrivere una nuova | contatore di generazione | sì | 2 |
| B5" | B | `partitaStore.carica()` non ordina le risposte | contatore di generazione | sì | 2 |
| B6" | M | `useCarica.ricarica()` si risolve subito: chi la attende (molte pagine) crede di avere dati freschi | promessa risolta a rilettura avvenuta (anche se fallisce) | sì | 2 |
| B7" | B | busta `{ data: null }` restituita intera dal client; il server non imbusta oggetti con chiave `data` (latente) | entrambi i lati | no oggi | 2 |
| B8" | B | quattro upload leggono il JSON prima di controllare `res.ok`: un 413/502 in HTML dà un errore incomprensibile | un `uploadRaw` condiviso | sì (messaggio) | 2 |
| B9" | B | `normalizzaVociEffetto` controlla solo la famiglia: un effetto malformato fa cadere le descrizioni | normalizzazione per famiglia | no (dati validi) | 2 |
| B10" | B | cambiando partita si vedono per un attimo i suggerimenti della partita precedente | azzerarli | sì | 2 |
| B11" | B | righe irraggiungibili nel client HTTP; `externalSignal` mai usato (annullare non fermerebbe comunque il server) | togliere il codice morto | no | 3 |
| R1"–R8" | B | statistiche, doti, `formattaYen`, date di gioco, `congiunzione`, forme di tipo duplicate (`ElenchiRegole` solo nel client, rotte non tipizzate); export morti e un file vuoto (`src/services/api/guida.ts`) | una sola fonte in `shared/`, tipi condivisi, togliere i morti (`MESI` di `migraCondizioni` e i due costruttori di URL **non** sono duplicati veri) | no | 3 |
| R9" | B | `chiaveAllerta` simile a `slug` | **nessuna azione**: la usa la migrazione 091 | — | — |
| P1"–P5" | B-M | raggruppamento degli spilli ricalcolato a ogni frame; analisi della planimetria a piena risoluzione; nessun caricamento differito delle pagine; iscrizioni troppo larghe agli store; `useOggi` ricrea tutto a ogni render | memo, tela ridotta, `lazy`, selettori, `useCallback` | no | 3 |

## 5. Pagine e componenti (`src/pages/`, `src/components/`, `src/tailwind.css`)

| ID | G | Rilievo | Correzione | C | Fase |
|----|---|---------|------------|---|------|
| A1 | A | `VideogiochiPage.tsx:126-166`: la coda dei progressi ha come chiave solo il gioco e la guardia `partitaId !== id` confronta la closure con sé stessa (non scatta mai); la pagina non si rimonta al cambio di partita: dopo il cambio «+» scrive nella partita B il valore della partita A +1 e sostituisce il gioco con i dati di A | chiave `partita:gioco` e riferimento alla partita corrente, nell'hook comune di R1 | sì | 2 |
| A2 | M-B | `tailwind.css:1366-1668` sta fuori da ogni `@layer`: `.selettore{min-width:0}` batte le utility `min-w-[…]` (EditorAzioneStrutturata, RigaDote, TraduzioniEditor) | spostare in `@layer components` **solo** le regole `.selettore*` (spostare tutto il blocco cambierebbe la cascata di `.immagine-entita`, `.spillo-*`, 44 px…); poi verifica visiva | sì (larghezze) | 2 |
| A3 | B-M | righe con stato locale e chiave = indice: `CondizioniEditor.tsx:211` (`opScelto`), i sottogruppi `Blocco` (`aperto`, `:240`), `EditorEffetti.tsx:63` (`condizioniAperte`): eliminando una riga lo stato passa alla successiva | **id stabile** tenuto in parallelo nello stato del blocco (una chiave per contenuto non va: ogni modifica crea un oggetto nuovo e rimonterebbe la riga perdendo `opScelto`) | sì | 2 |
| A4 | M | `VisoreMappa.tsx:283-307` azzera zoom e centro a ogni ridimensionamento (rotazione del tablet, tastiera) | azzerare solo al cambio di mappa/centro | sì | 2 |
| A5 | M | `Modal.tsx` (30 usi): nessun focus iniziale, nessuna trappola del Tab, focus non restituito alla chiusura | gestione del focus; il salvataggio di `activeElement` in un effetto che dipende solo da `aperta` | sì | 2 |
| A6 | B-M | `immaginiCache.ts:17` conserva anche una richiesta fallita: le immagini restano assenti fino alla rimozione multipla | togliere la promessa fallita solo se è ancora quella registrata | sì | 2 |
| A7 | B-M | `aria-label` su `div`/`span` senza ruolo (VisoreMappa, PersonaChip, LivelloBadge, CondizioniEditor, Libri, Film, Videogiochi): i lettori di schermo non lo leggono | `role="img"`/`role="group"` o testo nascosto | no (visivo) | 2 |
| A8 | B | `ConfidenteDettaglioPage.tsx:188` `new URL(f)` nel render: un valore non valido fa cadere la pagina | `try/catch` | no (dati validi) | 2 |
| A9 | B | `SquadraPartita.tsx:123` campo del livello non controllato: dopo un errore o una normalizzazione («5.7») mostra un valore diverso da quello salvato | campo controllato | sì | 2 |
| A10 | B | `CondizioniEditor.tsx` costruisce la classe `condizioni-blocco--${modo}`, contro la regola in testa a `tailwind.css` («mai classi interpolate») | mappa statica modo → classe | no | 3 |
| R1‴ | M | la coda dei progressi è copiata in Libri, Film e Videogiochi (questa divergente, vedi A1) | hook `useCodaProgresso` | no | 2 (con A1) |
| R2‴ | B | `BackupIstanza.tsx:26-33` e `PacchettoGioco.tsx:31-38` identici | helper comune | no | 3 |
| R3‴ | B | `Voce`/`Fonte` copiati in Completamento, Oggetti, Sfide (Battaglia diversa) | componente comune | no | 3 |
| R4‴ | B | `piatto` copiata quattro volte (Cruciverba, Domande, Richieste, `utils/articoli.ts`) | `utils/testo.ts` | no | 3 |
| R5‴ | B | `yen` duplica `formattaYen`; `NOME_MODO` doppio; `contorno` doppio (Tokyo con ombra); `Numero` solo simile | condividere i primi tre; `Numero` resta | no | 3 |
| R6‴ | B | codice morto: `MiniaturaMappa.tsx`, `IconCheck`, `IconPlus`, `segnaImmaginePresente`, `mappaVersione` sempre 0 | togliere | no | 3 |
| R7‴ | B | otto classi CSS mai usate in `tailwind.css` | togliere | no | 3 |
| R8‴ | B | regole sovrascritte (`tailwind.css:384`, `:514` da `:1625-1631`) e commento `:1621` che spiega male il motivo | togliere le regole vinte, correggere il commento | no | 3 |
| P1‴ | M | `VisoreMappa.tsx:421,451,459` ricalcola filtri e `raggruppaSpilli` (O(n³)) a ogni movimento di pan/zoom | `useMemo` e centri precalcolati | no | 3 |

## 5-bis. Script, deploy, configurazione e test

Aree aggiunte su richiesta del validatore.

**Cosa è stato controllato:**
- i 15 file tracciati in `scripts/` e i due file `*.tmp.*` nella radice;
- `Dockerfile.backend` e `Dockerfile.frontend`, `docker-compose.yml`, `nginx.conf`, `.dockerignore`, i due workflow in `.github/`;
- `server/config.ts`, tutti i `process.env`, `.env.example`;
- i sei `tsconfig*.json` (con `--listFilesOnly`), `vite.config.ts`, `vitest.config.ts`, `eslint.config.js`;
- ogni dipendenza di `package.json` (tutte risultano usate);
- i 247 file di test con 1229 casi: `.skip`, `.only` e `.todo`, test senza asserzioni, mock, setup, pragma jsdom.

**Risultati senza rilievi:**
- le porte 3101 e 5273 sono coerenti ovunque;
- non ci sono test saltati né test senza asserzioni (l'unico segnalato era un falso positivo);
- tutti i file DOM hanno il pragma jsdom;
- `test/setup.ts` è corretto;
- `font-italiano.py` e `verifiche/prova-stop-linux.sh` sono a posto.

| ID | G | Rilievo | Correzione | C | Fase |
|----|---|---------|------------|---|------|
| S1 | M | `scripts/copertura-accesso.ts:41` (`npm run accesso:copertura`) apre `data/project-p5r.db`, il vecchio nome. Crea quindi un DB vuoto e ci fa girare le migrazioni, poi gli attacca il `partite.db` vero: la misura è falsa e in `data/` resta un file spurio | `resolveDbPath()` e `config.dataDir` | sì (solo lo script) | 2 |
| S2 | B | `genera-24.tmp.mjs` e `blocco-24.tmp.md` sono tracciati nella radice: uno script usa e getta con un percorso che non esiste più | togliere | no | 3 |
| S3 | B | `scripts/atlas-organization.ts` è uno script una tantum che nessuno invoca, legge `spillo_partita` senza lo schema `utente` ed è ancora sotto typecheck | togliere | no | 3 |
| S4 | M | `CLAUDE.md:56` dice «non c'è hot reload lato BE», ma `start-be.sh:10` avvia `tsx watch`, che si riavvia da solo (17 «Restarting» in BE.log) | allineare la documentazione del progetto | no | 3 |
| S5 | B | gli script e Vite ignorano `BE_PORT` di `.env` (porte scritte a mano in `_comuni.sh:28-29` e `vite.config.ts:14,18`) | leggere `.env` / `loadEnv` | no | 3 |
| S6 | B | `start-be.sh` e `start-fe.sh` dichiarano riuscito l'avvio anche se la porta è occupata da un processo che non è node | controllare il processo e uscire con 1 | sì (messaggio) | 2 |
| S7 | B | `genera-pacchetto.ts` lascia in `tmpdir` fino a ~600 MB se fallisce a metà; i commenti parlano ancora del «seed» | `try/finally` e commenti | no | 2 |
| S8 | B | il comando di avvio è scritto in quattro posti e non sempre uguale (`vite` con o senza `--host`) | gli script chiamano `npm run` | no | 3 |
| D1 | M | `nginx.conf:26,42` risolve il nome del BE una sola volta: quando Watchtower ricrea il container, il FE risponde 502 finché non viene riavviato anche lui | `resolver 127.0.0.11` + variabile | sì (niente 502) | 2 |
| D2 | M | nginx limita `/api/` a 10M (`nginx.conf:54`), Express accetta 64 MB su `/api/mappe/importa`: in produzione un pacchetto di mappe oltre 10 MB dà 413 | `location = /api/mappe/importa` a 64m | sì (solo produzione) | 2 |
| D3 | B | il blocco `/api/impostazioni/` a 1024m presuppone upload di DB e un'importazione da indirizzo che non esistono più | 10M, commento aggiornato (timeout invariati) | no | 3 |
| D4 | B | `immutable` per 7 giorni anche su `favicon.svg` e `/font/*.woff2`, che non hanno l'hash nel nome | `immutable` solo su `/assets/` | sì (cache) | 2 |
| D5 | B | nessuna compressione (né gzip in nginx né `compression` in Express) | `gzip on` per JS, CSS, JSON, SVG | sì (prestazioni) | 3 |
| D6 | B | `lint` e `lint:ci` sono identici e girano due volte in CI, con commenti falsi | unificare | no | 3 |
| D7 | B | `docker-publish.yml` rifà la verifica della CI al push su main, senza `npm audit`, mentre `ci.yml` dice che non serve | workflow riusabile oppure commento corretto | no | 3 |
| D8 | B | le due build Docker condividono la stessa cache GHA e se la sovrascrivono a vicenda | `scope` separati | no | 3 |
| D9 | B | `Dockerfile.frontend` installa anche `better-sqlite3`, che il FE non usa | install mirato o toolchain | no | 3 |
| D10 | B | variabili ripetute fra compose e Dockerfile; HEALTHCHECK con la porta scritta a mano | una sola fonte, `process.env.PORT` | no | 3 |
| D11 | B | `pino-pretty` sta fra le dipendenze di produzione ma in produzione non viene caricato | `devDependencies` | no | 3 |
| D12 | B | `docker-compose.yml:15,93-94` ha come valori predefiniti l'IP e il percorso del NAS personale | nessun default, errore se manca | no | 3 |
| D13 | B | `.dockerignore` non esclude `.codex-temp/`, `.pids/`, `data/tmp/`, `test/` | aggiungerli | no | 3 |
| K1‴ | B | `.env.example`: `SEED_DIR` e `RIFERIMENTI_DIR` non sono più letti; mancano `PACCHETTO_DIR` e `ASSET_DIR` | allineare | no | 3 |
| K2‴ | B | `config.logLevel` non è usato; `logger.ts:17` rilegge `LOG_LEVEL` con `??` invece di `\|\|` | usare `config.logLevel` | no | 3 |
| K3‴ | — | `cors()` aperto | è F01 (stessa decisione, §6) | — | — |
| K4‴ | M | `vite/assetPredefiniti.test.ts` non viene type-checkato da nessun progetto (escluso da `tsconfig.node.json`, assente da `tsconfig.test.json`) | includerlo in `tsconfig.test.json` | no | 2 |
| K5‴ | B | `tsconfig.test.json` ricontrolla tutto il sorgente (760 file) e non ha `noUnusedLocals`/`noUnusedParameters` | solo i test, flag allineati | no | 3 |
| K6‴ | B | ESLint ignora `test/**` (`test/selettore.ts` è usato da 14 test) | aggiungerlo al blocco Node | no | 3 |
| K7‴ | B | in `vitest.config.ts` l'alias `@shared` (0 usi) e l'include `scripts/**/*.test.ts` (0 file) sono morti | togliere | no | 3 |
| K8‴ | B | `README.md:37,47` e `.gitignore`/`.gitattributes` citano `data/seed/`, `data/atlas`, `tools/…`, che non esistono più; `.codex-temp/` è ripetuto | allineare | no | 3 |
| T1 | M | mock di `services/api` riscritti a mano in 62 file; `urlImmagine` (funzione pura) finta in 18 file con 5 varianti; `notificationStore` mockato in 33 file | `test/mockApi.ts` con `importOriginal`, `test/mockNotifiche.ts` | no | 3 |
| T2 | B | 98 file ricostruiscono il DB di prova con lo stesso blocco; in 43 c'è un `invalidaCacheTraduzioni()` che `caricaPacchetto` fa già; 7 file ricaricano il pacchetto a ogni test | `test/dbDiProva.ts`, togliere i doppioni, `beforeAll` dove i test non scrivono | no | 3 |
| T3 | B | 15 sorgenti importano i sottomoduli API invece del barrel (contro la convenzione), quindi i test devono mockare due cose | import dal barrel | no | 3 |
| T4 | B | `raggruppaSpilli.pacchetto.test.ts:52` salterebbe in silenzio senza il pacchetto e non chiude il DB | fallire, `afterAll(close)` | no | 3 |

## 5-ter. Commenti e documenti che descrivono codice che non esiste più

**Metodo.**
- **Documenti** (CLAUDE.md, README, `pacchetto/README.md`, ARCHITETTURA, MAPPE, i 9 file di `docs/riferimenti/`): estratti gli identificatori in backtick (1.565 occorrenze, ~1.100 voci distinte) e cercati nel codice. Ripetuta poi la ricerca sul codice senza commenti, per trovare i nomi che sopravvivono solo lì.
- **Commenti di 760 file `.ts`/`.tsx`:** 1.350 identificatori (719 distinti).
- **Rotte:** le 102 rotte citate nei documenti e le ~196 chiamate del client, confrontate con le 185 dei router.
- **Database:** tabelle e colonne confrontate con `gioco.db` e con `schemaUtente.ts`.
- **Ricerca mirata:** ~60 termini delle funzioni dismesse.
- **Esclusi:** ROADMAP e DECISIONI (registri storici), più le sezioni che si dichiarano superate.
- **Verificati di persona:** O9, O4 e O12.

| ID | G | Rilievo | Correzione | C | Fase |
|----|---|---------|------------|---|------|
| O9 | M | **difetto funzionale**: la rotta `POST /api/mappe/piante/:area/scarica` è stata tolta con `f82c42cf` (18 settembre, «la pianta della guida esce di scena»), ma `scaricaPianta` (`src/services/api/immagini.ts:23`) e `EditorMappaPage.tsx:172` la chiamano ancora: «Scarica dalla guida» su una mappa di un'area dà 404. Restano anche il commento orfano `routes/mappe.ts:36` e i passaggi ARCHITETTURA 187, 226-228, 445-446, MAPPE 155, 262 | togliere `scaricaPianta` e il ramo `area` (il pulsante resta per i quartieri), il commento e i documenti | sì (sparisce un pulsante che fallisce sempre) | 2 |
| O4 | B | la fase `'scarico'` (`shared/types.ts:2141`) e la sua etichetta (`PacchettoGioco.tsx:51`) non vengono mai impostate dal server; i commenti a `:126,132` parlano di file del dispositivo e di indirizzi | togliere la fase e l'etichetta, aggiornare i commenti | no | 3 |
| O12 | B | `shared/seed.ts`: 32 tipi su 33 non sono usati (resta `RequisitoSeed`); il commento a `:2-3` dice il contrario | tenere solo `RequisitoSeed` (spostato in `types.ts`) e togliere il file | no | 3 |
| O1–O3, O5–O8 | B | importazione del pacchetto: commenti e documenti descrivono ancora il file nel corpo e lo scaricamento da indirizzo (`scaricaDaUrl.ts:5-9,23`, `pacchettoGiocoService.ts:18-22,263`, `impostazioni.ts:66-69`, `nginx.conf:21-24`, `index.ts:28-32`, `impostazioniService.ts:8-10,30-31`, `BackupIstanza.tsx:40`, `pacchetto/README.md:8,11`, `pacchettoGioco.ts:11-12`, `.gitignore:51-52`, ARCHITETTURA 595, 606, 809-823). `MAX_BYTE_RIPRISTINO` è esportata ma non usata | riscrivere sulla cartella d'appoggio, togliere la costante | no | 4 |
| O10 | B | ARCHITETTURA 431, 500-501, 526, 586 e MAPPE 151: `sincronizzaMappe` «a ogni avvio». Oggi la chiama solo la migrazione 027 (`sincronizzaMappe.ts:10-11`); le rotte `/marcatori` e `/marcatori-luoghi` le usano solo i test | aggiornare i passaggi; le due rotte vanno nella fase 3 come codice morto | no | 3-4 |
| O11, O13–O16, O19–O21 | B | residui del seed JSON dismesso il 12 settembre: ARCHITETTURA (19-21, 33, 112-122, 421, 429-432, 447, 486, 490-492, 529, 597, 609, 619), `migraCondizioni.ts:7-9`, `catalogoService.ts:12-15`, `src/services/api/catalogo.ts:38`, `genera-pacchetto.ts:2`, `reimpostaDatiMappe.ts:2,5` (senza chiamanti, vedi R9), README 12, 38, 39, 46, `.env.example`, `.gitignore`, una ventina di commenti `data/seed/*.json` (oggi righe di `dati_guida`) | riscrivere al presente, sezioni di fase marcate come storiche | no | 4 |
| O17 | B | `zip.ts:2` dice che serve alle mappe: lo usa solo l'istanza completa | commento | no | 4 |
| O18 | B | MAPPE.md: `GET /api/mappe` (è `/albero`), esportazione «ZIP» (è JSON), difesa `modalita=editor` inesistente, `CondizioniSpilloEditor` (oggi `CondizioniEditor`), `stato_punto` (oggi `punto_partita`) | aggiornare | no | 4 |
| O22–O24 | B | ARCHITETTURA 999 (`annullaEffettiAzione` toglie le Doti: non è vero), 1060 (`cambioDoti` non esiste, ora `daSegnare`), 107 («32 tabelle», sono 33), 45-46 (migrazioni ferme alla 078 e alla 003), 3 («aggiornato allo step 0.5»); `partiteService.ts:182,193` `DotiDaSegnare` (è `DoteDaSegnareDto`) | aggiornare | no | 4 |
| O25–O26 | B | `docs/riferimenti/`: percorsi `data/seed/…`, `scripts/seed/…`, `data/riferimenti/…` e tabelle proposte mai create (`confidente_bonus_fusione`, `scontoCompendio`) | indicare dove vivono oggi i dati, marcare come storico | no | 4 |

Fuori dal perimetro, segnalati soltanto: `docs/ATLANTE-STATO.md` (577, 630, 764) e `docs/ESITOVERIFICHE.md:2634` citano script npm che non esistono più. Sono resoconti storici.

## 6. Decisioni che spettano all'utente

Tutte le altre correzioni ripristinano il comportamento atteso, oppure non cambiano nulla di visibile. Restano due scelte di comportamento:

1. **CORS (F01).** Opzioni:
   - togliere `cors()`. Il frontend non ne ha bisogno: usa la stessa origine tramite proxy Vite o nginx.
   - in alternativa, limitarlo alle origini di sviluppo, configurabili da `.env`.

   Raccomandato: togliere. Nessun client legittimo lo usa, e un sito qualsiasi aperto nel browser oggi può chiamare tutte le API, comprese quelle che cancellano.
2. **Scaricamento da URL (F03).** Opzioni:
   - rifiutare gli indirizzi locali e privati (loopback, 10/8, 172.16/12, 192.168/16, link-local), con controllo anche dopo ogni redirect;
   - oppure lasciarlo così.

   Oggi `scaricaDaUrl` ha un solo chiamante, `importaImmagineDaUrl`, che è usato da `POST /api/immagini/:ambito/:chiave/da-url` e da `cittaService.ts:172` (immagine di un quartiere da URL). L'importazione del pacchetto da URL non esiste più: dal 12 settembre il pacchetto arriva dalla cartella d'appoggio sul NAS (DECISIONI.md:446). Il blocco quindi toccherebbe **solo le immagini prese da un indirizzo**: non si potrebbe più incollare l'URL di un'immagine ospitata su una macchina della rete di casa o di Tailscale. Il caricamento del file resta disponibile.

   Va ricordata la scelta già documentata in ARCHITETTURA.md:816-821 («nessuna lista di blocco»): era motivata dal caso d'uso del pacchetto scaricato dal PC di casa via Tailscale, e quel presupposto non c'è più.

   Raccomandato: bloccare. L'app non ha autenticazione, e un indirizzo interno dato per sbaglio o da una pagina incollata non deve diventare una richiesta del server verso la rete locale.

## 7. Riepilogo

- **Rilievi confermati:** 22 sull'API; 31 su mappe e guida; 29 su servizi e DB; 25 condivisi/FE; 19 pagine e componenti (A10 trovato dalla controverifica); 32 script, deploy, configurazione e test (K3‴ coincide con F01 e non è contato); 26 commenti e documenti obsoleti (O1–O26). Totale 184.
- **Falsi:** nessuno.
- **Sette correzioni proposte riviste dalla controverifica** (P6 servizi, B2' semafori, B3' Joker, A2, A3, A6, C5).
- **Due voci senza azione:** `giorno_percorso.azioni_json` (R4', conteggiata fra i servizi) e `chiaveAllerta` (R9"). Servono alle migrazioni.
- **Fase 2 (bug e criticità):** ogni correzione con un test e la sua variante rossa.
- **Fase 3 (ridondanze e ottimizzazioni):** comportamento invariato, protetto dai test esistenti più quelli nuovi della fase 2.
- **Fase 4 (commenti):** oltre ai commenti nuovi, si correggono quelli e i documenti obsoleti di §5-ter.

## 8. Fase 2 — correzioni fatte (voce 2 della ROADMAP)

Tutti i rilievi segnati «2» nelle tabelle sono corretti:
- F01, F02, F04–F12, F14;
- B1–B10, B12, B14;
- C1–C6, B1'–B6';
- B1"–B10";
- A1–A9 con R1‴;
- S1, S6, S7, D1, D2, D4, K4‴, O9.

**Varianti rosse.** Ogni correzione verificabile con un test automatico è stata tolta di nuovo, una alla volta, per vedere
fallire il suo test; poi i file sono tornati identici al confronto byte per byte. Script e output nella cartella di lavoro della
sessione (`rossi-*.sh` / `rossi-*.out`):

| Script | Varianti | Che cosa tolgono |
|--------|---------:|------------------|
| `rossi-api` | 16 | lotto API (F01–F14, B2", B7") |
| `rossi-mappe-servizi` | 24 | lotto mappe e servizi (F10, B1–B14, C1–C6 meteo, B2'–B6') |
| `rossi-fe` | 24 | condivisi, stato, pagine e componenti, K4 (rossa come errore di `tsc`, non come test) |
| `rossi-modal` | 7 | fuoco delle finestre (A5): ingresso, ritorno, `autoFocus`, StrictMode, registro dei clic, Tab |
| `rossi-validazione2` | 21 | correzioni chieste dalla prima validazione (F2, F6, F7, F8, N1, N2, `prepared`, B1', B5', B14 negozio, C6 piani e cicli) |
| `rossi-strutturale` | 15 | il test strutturale di B3"/F2: ognuno dei 15 file torna alla versione di `main` e il test nomina le sue righe |
| `rossi-b3` | 8 | i test «due gesti ravvicinati» delle 8 pagine e hook di B3": ogni sorgente torna alla versione di `main` (14 test rossi) |

In totale **115 varianti, tutte rosse**, più le prove rosse manuali del paragrafo «Prove fuori dai test».

Le tre varianti di F7 sono state rieseguite una per una con `rossi-f7.sh` (output in `rossi-f7.out`). In `rossi-validazione2` la
terza era girata con `compendio.ts` non ancora ripristinato. Lo script nuovo si ferma se i file non sono identici al commit prima
della variante, se l'altro file cambia, o se il ripristino fallisce.

**Correzioni senza test automatico** (solo prova manuale, verde con il codice e rossa con quello di `main`, output grezzo
salvato): A2 (CSS, misura nel browser), S1, S6, S7 (script), D1, D2, D4 (`nginx.conf`, con Docker). Tutte le altre hanno un test e
una variante rossa.

**Test per lotto:**

| Lotto | Test |
|-------|------|
| API | `server/routes/verifica-api.test.ts`, `server/routes/download-database.test.ts`, `src/services/api/_httpClient.test.ts` |
| Mappe e guida | `server/routes/verifica-mappe.test.ts`, `server/routes/negozio-del-pin.test.ts` |
| Servizi e DB | `server/services/verifica-servizi.test.ts` |
| Condivisi e stato | `shared/verifica-condivisi.test.ts`, `src/hooks/useCarica.test.tsx`, `src/stores/verifica-store.test.ts` |
| Pagine e componenti | `src/hooks/useCodaProgresso.test.tsx`, `src/hooks/useCarica.test.tsx`, `src/components/shared/Modal.test.tsx`, `src/components/shared/immaginiCache.test.ts`, `src/accessibilita.test.ts`, `src/components/guida/EditorEffetti.test.tsx` |
| Aggiornamenti locali (B3", F2) | `src/aggiornamentiLocali.test.ts` (strutturale), `src/hooks/useOggi.test.tsx`, `src/components/impostazioni/TraduzioniEditor.test.tsx` |

Casi nuovi nei test esistenti:
- pagine e componenti: VideogiochiPage, CondizioniEditor, VisoreMappa, ConfidenteDettaglioPage, SquadraPartita, EditorMappaPage;
- «due gesti ravvicinati» (B3", F2): CompletamentoPage, CruciverbaPage, RichiestePage, NegozioPage, NegoziPage, PercorsoPage,
  DungeonDettaglioPage, DotiSociali, ConfidentiPartita, ScortaPersona, ObiettiviPartita, PianiSalvati, CicliSalvati;
- servizi: `verifica-servizi` (C6 piani e cicli, rotazione B5', `prepared`, B1', violazioni già presenti); `verifica-mappe`
  (B14 negozio); `download-database` (pulizia fallita, N1); `_httpClient` (PUT relativi, F7).

Nei 22 test preesistenti modificati (`git diff main..fd75ca78`) le righe tolte sono 18. L'unica asserzione tolta è il test CORS:
è stato tolto per decisione dell'utente, e F01 verifica il contrario, cioè che gli header non ci siano. Le altre righe tolte sono:
- sette import o `vi.hoisted` riscritti con nomi in più;
- il mock di `scaricaPianta` (funzione tolta con O9);
- un commento riscritto.

Elenco riga per riga in `prove-voce2/N4-nota.txt`.

**Prove fuori dai test** (output grezzi nella cartella di lavoro della sessione, `prove-voce2/`):
- **nginx (D1, D2, D4)**, con Docker su un backend finto (`nginx-prova.sh`, `F1-nginx-docker.txt`):
  - configurazione nuova: importazione da 20 MB 200, altra API da 20 MB 413, API dopo la ricreazione del backend con un altro IP
    200; `/assets/` `immutable`, `/favicon.svg` `max-age=3600, stale-while-revalidate`;
  - configurazione di `main`: 413, 413, **502**; anche `/favicon.svg` `immutable` per 7 giorni.
- **S1** (`F1-S1.txt`, `F1-S1-main.txt`): sul `gioco.db` vero 1470 voci misurate, SHA-256 di `gioco.db` e `partite.db` uguali
  prima e dopo; lo script di `main`, su una copia dei dati, crea un `project-p5r.db` vuoto e misura 0 voci.
- **S6** (`F1-S6.txt`): con la porta tenuta da `powershell.exe`, `start-be.sh` esce con 1 e lo dice; quello di `main` esce con 0
  («già in ascolto»); con la porta tenuta dal BE (node) esce con 0.
- **S7** (`F1-S7.txt`): con un pacchetto che non è un database lo script fallisce (`SQLITE_NOTADB`) e non lascia cartelle
  `p5r-pacchetto-*`; quello di `main` ne lascia una. `pacchetto/` e `data/` invariati.
- **Browser** (`F1-browser.txt`), a 1280×689, 768×1024 e 375×812:
  - A2: il selettore con `min-w-[220px]` misura 220 px (299 a 375); con la regola fuori dal layer, come su `main`, `min-width`
    vale 0 e il selettore misura 71 px a 1280 e 111 a 375;
  - A5: la finestra «Nuova partita» prende il fuoco all'apertura e lo ridà al pulsante alla chiusura;
  - nessuno scorrimento orizzontale.
- **Suite, typecheck, lint** (`F1-vitest.txt`, `F1-tsc.txt`, `F1-lint.txt`): output integrali sullo stato finale.

**Emerso durante le correzioni e corretto nello stesso lotto:**
- **F05:** un errore dopo che la rotta aveva dichiarato un file (`Content-Type: application/vnd.sqlite3`) partiva con quel tipo.
  Ora `errorHandler` rimette le intestazioni JSON.
- **B5:** l'immagine di base di una mappa non si toglie se la stessa chiave è anche la pianta di un quartiere o di un'area. Le 9
  immagini «senza mappa» del DB vivo sono piante d'area, non orfane.
- **B1:** un'area con la chiave più lunga possibile ora contiene punti raggiungibili (prima la correzione li rifiutava).
- **B3":** lo stesso errore (dati presi dal render dopo un `await`) era in 15 file:
  - nel primo giro, Completamento, Cruciverba, Richieste, DungeonDettaglio, NegozioPage, NegoziPage, PercorsoPage, `useOggi` e una
    riga di ObiettiviPartita;
  - dopo la prima validazione (F2), le altre righe di ObiettiviPartita, PianiSalvati, CicliSalvati, ConfidentiPartita,
    ScortaPersona, DotiSociali e TraduzioniEditor.

  Ora usano tutte la forma funzionale di `imposta`. Ogni file ha un test con due gesti ravvicinati, rosso con la sua versione di
  `main`. Il test strutturale `src/aggiornamentiLocali.test.ts` impedisce che la forma vecchia torni.
- **B6":** con `ricarica()` che ora aspetta la rilettura, l'editor delle mappe passa alla mappa nuova solo con l'albero già
  riletto; il test che dava per scontata la navigazione immediata ora la aspetta.
- **B9":** `articolo.effetto_json` e `libro.effetto_json` avevano la stessa validazione apparente: ora usano lo stesso
  normalizzatore. I 109 effetti salvati nel DB vivo e nel pacchetto lo superano identici.
- **A4:** la chiave dell'inquadratura usa le dimensioni effettive dell'immagine (`nat` non è mai zero).
- **A5:** la finestra ridà il fuoco a chi l'ha aperta anche quando:
  - nasce già aperta;
  - ha un campo `autoFocus`;
  - è in StrictMode;
  - il documento non ha il fuoco del sistema.
- **A7:** i `div`/`span` con `aria-label` senza ruolo erano 20, non 7. Un test sui sorgenti impedisce che tornino.
- **A2:** si sposta nel livello dei componenti solo la regola di base `.selettore`. Il resto del blocco fuori dai layer è voluto,
  e spostarlo cambierebbe `width` e `display` dei selettori compatti.

**Prima validazione (rigettata) e correzioni:**
- **F1:** gli output grezzi ora sono salvati (paragrafo «Prove fuori dai test»).
- **F2:** le righe di B3" rimaste (sopra) sono corrette, ognuna con il suo test.
- **F3:** i conteggi sono quelli della tabella delle varianti; le varianti del fuoco sono nello script `rossi-modal`.
- **F4:** aggiunti test e varianti per C6 (piani e cicli), B5' (rotazione), B14 (ramo del negozio), B1' e B3"; per le correzioni
  senza test vale l'elenco «Correzioni senza test automatico».
- **F5:** ARCHITETTURA (piante delle aree, superate dal 2026-09-18) e MAPPE.md dicono che «Scarica dalla guida» resta solo per i
  quartieri.
- **F6:** `PRAGMA foreign_key_check` sui due file vivi e su `pacchetto/gioco.db` dà 0 righe (`F6-foreign_key_check.txt`). Il
  controllo ora è per schema, prima e dopo la migrazione: solo le violazioni nuove la annullano, e quelle già presenti vanno nel
  log. Così un dato vecchio, non toccato da nessuna migrazione, non blocca l'avvio per sempre.
- **F7:** `spostaVoceGiornata`, `spostaPunto` e `aggiornaConfidente` (PUT relativi) non si ripetono più.
- **F8:** il 500 della riapertura fallita non porta più il messaggio interno; il dettaglio resta nel log.
- **N1:** il test della pulizia fallita ora verifica il messaggio nel log.
- **N2:** `useCodaProgresso` toglie il valore chiesto quando la coda si ferma, anche al cambio di partita.
- **N3:** il commento di `eliminaElemento` è tornato sopra la sua funzione.
- **N4:** il diff dei test preesistenti è salvato (`N4-test-preesistenti.diff`, con la nota `N4-nota.txt`).

Emerso durante queste correzioni:
- **`prepared`:** uno statement in cache cambiato da `.pluck()` restava cambiato per tutti; ora torna in modalità normale a ogni
  presa. È stato trovato scrivendo il test di B1'.
- **A5:** il registro dei clic (documento senza il fuoco del sistema) non aveva un test; ora ce l'ha (varianti 5 e 7 di
  `rossi-modal`).

**Da segnalare, non toccati:**
- in `%TEMP%` c'è una cartella `p5r-pacchetto-Kty6zZ` lasciata da un'esecuzione fallita di `genera-pacchetto` di prima (il
  difetto S7); va tolta a mano;
- in `data/backups` i giornali orfani delle copie di avvio sono stati tolti al riavvio del backend, come previsto da B5'.

## 9. Fase 3 — ridondanze e ottimizzazioni (voce 3 della ROADMAP)

Tutti i rilievi segnati «3» nelle tabelle sono stati trattati in sette lotti, un commit ciascuno (due per A e per B). Le cartelle
citate sono nella cartella di lavoro della sessione.

| Lotto | Commit | Rilievi |
|-------|--------|---------|
| A — API | `a99451ae`, `54cddd30` | F13, F15–F19, F21, F22 (con P1', P3', K1/K3 dei servizi, R1, R9, O12) |
| B — mappe e Palazzi | `620fdab4`, `491bff57` | P1–P8, R2–R8, B11, B13 (con R3) |
| C — servizi e database | `0ddbc826` | R1'–R3', R5', R6', K1, K2, K5, P2', P4', P5' |
| D — condivisi e stato del frontend | `361c8e02` | B11", R1"–R8", P1"–P5" |
| E — pagine e componenti | `e353432c` | A10, R2‴–R8‴ (P1‴ coincide con P1") |
| F — script, deploy, configurazione, test | `c86f9b8b` | S2–S5, S8, D3, D5–D13, K1‴, K2‴, K5‴–K8‴, T1–T4 |
| G — codice morto residuo | `bb4cfaf8` | O4, O10 (la parte di codice; i documenti sono della voce 4) |

### Come si è provato che il comportamento non cambia

- **Fotografia delle risposte.** Prima del lotto B, su una copia dei dati veri, le impronte SHA di 1831 risposte GET di mappe, guida,
  Palazzi, negozi, quartieri e Confidenti (`fotografia.mts`, `lotto-b/prima-1.txt`). Dopo ogni passo (`lotto-b/dopo-2…7`) e dopo il
  lotto C (`lotto-c/foto-dopo.txt`, con le migrazioni 096/016 applicate): **identiche**.
- **Confronti diretti con l'implementazione di prima,** sullo stesso ingresso:
  - raggruppamento degli spilli (P1"): 12.300 casi (le mappe del pacchetto × 3 formati × 5 zoom × 2 pan × visore/editor), stesso
    JSON (`p1/`);
  - area visibile di una planimetria (P2"): 20.000 immagini a caso (vuote, piene, sparse), stesso risultato (`p2/`);
  - scorta delle Persona (P2'), compendio e regole di fusione (P4'), Confidenti (F21), stato della disponibilità: impronte uguali
    (`lotto-c/`, `misura-*.txt`);
  - `importaMappe` (P5): impronta del database dopo l'importazione `5f9f0873f9c28f1f`, uguale prima e dopo.
- **Test nuovi con la loro variante rossa:**
  - P5' (`effetti-azioni.test.ts`): il contatore dei turni registra le stesse Doti di un turno alla volta, con una voce che dipende
    dalle volte svolte. Con l'aggiornamento dello stato spostato dopo il calcolo il test fallisce («expected [4] to deeply equal
    [3, 4]»);
  - T1 (`test/mockModuli.ts`): un sostituto con un nome sbagliato fa fallire il file («getProgressiPartitaRefuso non esiste nel modulo
    vero»);
  - `alberoMappe.test.ts` (R3/B13): sottoalbero, Palazzo di ogni mappa con le due strade, ciclo nei genitori.
- **Nel browser** (scheda nuova, console pulita): home, partita, fusione, impostazioni, mappe, scheda di una Persona, calendario,
  città, completamento, battaglia, oggetti, sfide, cruciverba; una planimetria con i gruppi «+n» a 768 px, la scheda di una Persona a
  375 px. R8‴: dimensioni dei comandi del visore misurate prima e dopo, identiche (44 px).
- **Docker** (lotto F): le due immagini costruite e avviate su una rete di prova. Il backend risulta `healthy` con il nuovo
  HEALTHCHECK, `nginx -t` passa, gzip è attivo su pagina, bundle (113 kB) e API, e il proxy risponde. `docker compose config` si
  ferma senza `NAS_ADDR`/`NAS_PATH` e passa con le due variabili.
- **Script** (lotto F): restart, stop e start di FE e BE con i comandi nuovi. Resta un albero per lato, nessun processo orfano, e
  `/api/health` risponde attraverso il proxy di Vite.

### Misure

| Che cosa | Prima | Dopo |
|----------|------:|-----:|
| dettaglio di una mappa (senza / con partita) | 8,61 / 9,75 ms | 1,71 / 2,78 ms |
| contenuti di una mappa | 5,92 ms | 0,47 ms |
| albero delle mappe | 52 ms | 9,6 ms |
| dettaglio di un Palazzo | 5,97 ms | 1,62 ms |
| `importaMappe` | 210 ms | 140 ms |
| un Confidente / `statoDisponibilitaPartita` | 1,10 / 2,09 ms | 0,66 / 0,95 ms |
| `battaglia()` / `completamento()` | 1,22 / 0,16 ms | 0,20 / 0,05 ms |
| scorta di 12 Persona con 8 skill | 0,569 ms | 0,212 ms |
| elenco Persona / filtro per arcano / regole di fusione | 3,58 / 0,275 / 1,20 ms | 2,95 / 0,227 / 0,60 ms |
| area visibile di una planimetria 4096² (piena / con margini) | 59,5 / 42,3 ms | 0,0 / 8,7 ms |
| bundle iniziale del frontend | 1.214,7 kB (324,5 gzip) | 367,0 kB (113,0 gzip) |

### Non fatti, o fatti in parte, e perché

- **F20** (cache di `/condizioni/elenchi`): 1,7 ms con l'HTTP, chiamato all'apertura dell'editor. Una cache da invalidare a ogni
  scrittura del catalogo costa più rischio (elenchi vecchi) di quanto risparmia.
- **P6'** (meteo nell'elenco delle partite): 0,011 ms per l'intero elenco. Toglierlo avrebbe cambiato il DTO.
- **K5‴**, parte «solo i test»: il progetto dei test è `composite` e deve elencare ogni file che i test importano (provato: 491 errori
  TS6307). I flag `noUnusedLocals`/`noUnusedParameters` sono stati allineati.
- **K5** (servizi): tolto l'alias `esportaPacchetto`. Restano `importaPacchetto` e `anteprimaPacchetto` da file: sono le entrate
  locali del nucleo comune con quelle dal deposito, e i test del nucleo passano di lì.
- **P2"**: invece della tela ridotta proposta (qualche pixel di precisione in meno), un bordo esatto cercato dai lati verso
  l'interno. Il risultato è lo stesso di prima.
- **P5"**: `useOggi` restituisce lo stesso oggetto finché i suoi ingressi non cambiano. Le righe della giornata si ridisegnano
  comunque, perché `GiornoGuida` passa a ognuna oggetti nuovi (`gesti`, `menuDi`). Non era nel perimetro del rilievo.
- **T2**: i `beforeEach` che ricaricano il pacchetto restano dove i test scrivono (creano partite, spostano ed eliminano spilli),
  perché è l'isolamento che li tiene indipendenti.
- Nessuna azione per piano: R4', R9" (servono alle migrazioni), R7" (i due costruttori di URL non sono duplicati veri), `Numero` di
  R5‴.

### Cambiamenti visibili, tutti voluti

- Negli editor di condizioni e azioni le Doti sono nell'ordine di `dote_sociale.ordine`, come nelle altre schede (F16).
- `/fusione/cicli` con un `dlc` non numerico risponde 400, come `/fusione/piani` (F13).
- Messaggi unici per la data di gioco e per la partita che non esiste (F16, F18).
- «Il Palazzo di una mappa» ha una regola sola (B13); sui dati le due regole coincidevano (10 Palazzi su 10).
- `StatoIstanzaDto` non ha più il campo `seed`, che leggeva valori fermi al 9 settembre (R3', migrazione 096).
- Le pagine si caricano alla prima visita (P3"): la prima apertura di una sezione mostra l'attesa per un attimo.
- **Deploy:** lo stack deve definire `NAS_ADDR` e `NAS_PATH` (D12). Il gate CI gira anche prima della pubblicazione, audit
  compreso (D7).

### Test preesistenti toccati

Fra `b0939456` (voce 2 approvata) e `bb4cfaf8` i file di test cambiati sono 173 (1074 righe aggiunte, 696 tolte). Le righe
`expect` tolte sono 36, quelle aggiunte 134:
- 10 provavano le due rotte dei marcatori tolte con O10. Al loro posto, la lettura dei marcatori dal database nelle schede, e le regole
  dell'avvio che non toccano quelli dell'utente;
- 1 leggeva `seed.hash`: ora il test verifica che il campo non ci sia;
- 1 cercava l'avviso «copia temporanea del database non rimossa»: il messaggio è cambiato con F15/F19, e il test cerca quello nuovo;
- 24 lavoravano su buffer in memoria (`creaZip`/`leggiZip`, `verificaDatabase(Buffer)`, `scriviDatabase`, `importaPacchetto(Buffer)`).
  Con F19/P3' l'interfaccia è a file e a flusso, e le stesse proprietà si provano sui file: firma, CRC, voci, pulizia,
  scrittura atomica, 409 durante un'importazione.

Il resto delle modifiche ai test è T1–T3: moduli finti costruiti dal vero e DB di prova comune. Non cambia che cosa si prova.

### Da segnalare

- **Migrazione applicata ai dati veri prima del merge.** Il backend di sviluppo gira in `tsx watch` (il CLAUDE.md del progetto
  diceva il contrario, ora corretto con S4). Alle 01:16:53 del 2026-10-04 si è riavviato da solo quando sono stati scritti i file
  delle migrazioni, e ha portato `data/gioco.db` a 96 e `data/partite.db` a 16. Prima ha fatto la sua copia di avvio, regolare:
  `data/backups/project-p5r-2026-10-03T23-16-53-814Z.db` (95) e `.partite.db` (15). Il contenuto non cambia: escono `seed_meta`, mai
  scritta, e due indici. Il codice di `main` legge `seed_meta` dentro un `try/catch` e funziona anche sul file migrato.
- **Docker:** pulendo la prova del lotto F è stato eseguito anche `docker volume prune -f`. Toglie i volumi anonimi che nessun
  container usa, anche se non sono di questo progetto: non era necessario.

Le tre decisioni chieste all'utente dopo il primo esame (H2, H3, H4) sono in DECISIONI, 2026-10-04: cambi visibili approvati, dati
migrati tenuti, presa d'atto del `prune`.

### Prove del secondo esame

Sono nella cartella `prove-voce3/` della sessione e sono state prodotte su `72e23d70`, con il working tree pulito.

- **H1 — output grezzi:**
  - contesto (`h1-contesto.txt`): commit, stato del working tree, ramo;
  - `h1-typecheck-force.txt`: `tsc -b --force`, exit 0;
  - `h1-lint.txt`: exit 0;
  - `h1-test.txt`: 267 file, 1461 test, exit 0;
  - `h1-docker.txt`: build delle due immagini, BE `healthy`, `nginx -t`, gzip su pagina, bundle e API, `compose config` con e senza
    `NAS_ADDR`/`NAS_PATH`, pulizia mirata con `docker rm -f -v` e nessun `prune`;
  - `h1-script.txt`: stop, start e restart, una sola istanza per lato, `/api/health` dal proxy;
  - `h1-browser.txt`: 28 pagine con titolo giusto, nessun errore a schermo, console senza errori.
- **H2 — volumi rimasti** (`h2-volumi-ora.txt`): tutti i volumi con nome ci sono ancora. Il registro eventi del daemon non
  conserva più quelli del `prune`.
- **H3 — `main` sui file migrati** (`h3-main-su-migrati.txt`, `h3-main-be.log`): il codice di `main` (`15ea5ee9`), su una copia
  di `data/` a 96/16, risponde 200 su salute, stato dell'istanza, deposito, anteprima del pacchetto, compendio (232 Persona),
  partite e albero delle mappe. Nel log non ci sono errori.
- **H5 — compatibilità con i file di `main`** (`h5-esito.txt`, `h5-confronto.txt`, `h5-impronta-*.txt`):
  - `main` produce lo ZIP dell'istanza (con un carattere di prova) e i due `.db` dalla copia di avvio 95/15;
  - HEAD li ripristina, e importa `gioco.db` come pacchetto, partendo da un'istanza diversa (il pacchetto iniziale, che differisce
    dal riferimento in 23 voci su 104);
  - le impronte tabella per tabella di `gioco.db` e `partite.db`, più i caratteri, coincidono con il riferimento (gli stessi dati
    migrati da HEAD) in tutti e tre i casi;
  - l'importazione lascia invariate le partite.
- **H6 — test preesistenti** (`h6-diff-modificati.diff`, `h6-stat-modificati.txt`, `h6-test-aggiunti.txt`, `h6-test-tolti.txt`):
  - 168 file modificati, 5 aggiunti, nessuno tolto;
  - le 36 righe `expect` tolte, una per una con il loro sostituto, sono in `h6-expect-tolti.md`.
- **H7 — fotografia completa** (`h7/h7-esito.txt`, `h7/foto-*.txt`, `h7/corpi-*`):
  - tutte le GET di tutti i router con i parametri presi dai dati, 4625 risposte, tutte 200 nelle due versioni;
  - confronto fra `b0939456` e `72e23d70` sugli stessi dati di partenza: differiscono 3 risposte;
  - `/impostazioni/istanza` cambia per la versione dello schema e il campo `seed` tolto (R3', dal piano);
  - `/immagini/manifest` e `/mappe/esporta` cambiano solo nel campo con l'ora di generazione.

## 10. Fase 4 — commenti in italiano e documenti obsoleti (voce 4 della ROADMAP)

Commit: `8d2d048a` (documenti obsoleti O1–O8, O10, O11, O18, O22–O26), `bda3182e` (intestazioni e commenti di funzione),
`451ccacc` (difetto trovato commentando, residuo di A9), `368ad6bf` (revisione dei commenti scritti in parallelo e residui O
nel codice), `9e85196a` (N7); dopo il primo esame, rigettato (I1–I4): `e54ccf10` e `0d329d69`; dopo il secondo, rigettato (I5): `689e0cd1`. Prove grezze dell'ultimo stato in `scratchpad/voce4/prove-esame3/`.

### Che cosa si è fatto

- **Intestazione su ogni file e commento su ogni funzione con nome.** Otto gruppi di lavoro sul codice di server, condivisi,
  frontend, script e helper di test (`test/`), poi quattro sui file `*.test.ts(x)`. Ogni commento dice che cosa fa la
  funzione e la logica interna dove non è ovvia.
  - Il primo censimento (`censimento.mts`) contava come commento qualunque commento sopra la dichiarazione, anche un
    divisorio di sezione staccato da una riga vuota, ed escludeva i `*.test.ts(x)`: il suo «0 senza commento» era falso
    (rilievi I1 e I2 del primo esame).
  - Il censimento severo (`scratchpad/voce4/censimento-severo.mts`, compilatore TypeScript):
    - vuole un commento attaccato alla dichiarazione, senza righe vuote, che non sia un divisorio (`// ----`, `// ====`) né
      una direttiva (`eslint-`, `@ts-`, `@vitest-environment`…);
    - vuole un'intestazione che non sia solo il docblock `@vitest-environment`;
    - comprende i test.
  - Prima della correzione trovava 12 funzioni dei sorgenti, 360 funzioni di supporto e 23 intestazioni nei test
    (`severo-iniziale.txt`). Reso rigoroso anche sul docblock `@vitest-environment`, ha trovato altre 8 intestazioni
    mancanti (`severo-3.txt`, `severo-4.txt`): in totale 31. Tutte sono state scritte.
    - In `MappaPage.test.tsx` due import finiti sopra il docblock jsdom sono tornati sotto l'intestazione unica.
    - Per controllare ciò che il censimento non vede (un commento attaccato che parla d'altro), le 23 funzioni dei
      sorgenti il cui commento attaccato è solo una riga `//` sono state rilette a mano (`solo-riga.txt`). Una sola
      (`lungo` in `raggruppaSpilli.ts`) aveva un commento che non diceva che cosa fa la funzione, e ora lo dice.
  - Esito (`prove-esame2/05-censimento-severo.txt`): 793 file, **0 senza intestazione**; 2489 funzioni con nome,
    **0 senza commento**.
- **Revisione dei commenti scritti in parallelo.** Un secondo passaggio ha cercato commenti falsi o fuori posto: 47 voci.
  - Intestazioni doppie unite: bootstrap, registro delle migrazioni, rotte mappe e impostazioni, `shared/types.ts`, visori,
    `mappeService`.
  - Commenti orfani tolti o riportati sopra la funzione giusta: per esempio quelli di `getNegozi`, del riordino delle mappe,
    di `costoDto`, di `eliminaPunto`.
  - Frasi che descrivevano altro corrette:
    - `costoFoglia` restituisce `null`, non infinito;
    - `skillPosseduta`;
    - le chiavi controllate da `condizioniConChiaviEsistenti`;
    - le pagine Fusione, Completamento, Compendio, Covo, Quartiere ed Editor delle mappe (campi «asset» che non esistono più);
    - un commento in inglese tradotto.
- **Commenti obsoleti nel codice (§5-ter):**
  - **O1–O3, O5–O8**: nessun file viaggia più nel corpo né arriva da un indirizzo. Riscritti `scaricaDaUrl.ts` (oggi solo
    per le immagini), le rotte di `impostazioni.ts`, `server/index.ts` (`requestTimeout`), `impostazioniService.ts`,
    `BackupIstanza.tsx` e `pacchettoGioco.ts`. `MAX_BYTE_RIPRISTINO` non esisteva già più.
  - **O11**: i riferimenti a `data/seed/*.json` ora nominano la voce di `dati_guida` (`finestre-dungeon`,
    `sblocco-quartieri`, `sblocco-luoghi`). Il formato di `mappe-editor.json` è quello del file dell'editor, la pianta
    del quartiere viene da `pianta_quartiere`, e `migraCondizioni` è usato nei tre momenti reali (migrazioni, salvataggio
    in prosa, ripristino di un'istantanea).
    - «seed» resta dove indica l'origine `origine = 'seed'` delle righe (il dato della guida), spiegata in testa a
      `catalogoService.ts`.
    - I riferimenti a `metropolitana.json` sono all'estrazione dell'atlante (`data/atlas/extracted/`), non al seed: ora lo
      dicono.
  - **O17**: `zip.ts` diceva già, dal lotto A della voce 3 (`a99451ae`), che serve alla copia completa dell'istanza: niente da cambiare (il messaggio di `368ad6bf` lo elenca fra i residui per errore).
  - **O22–O24**: `DotiDaSegnare` → `DoteDaSegnareDto` in `partiteService.ts`.
  - **O18** (residui trovati al primo esame, I3): in `MAPPE.md` lo stato dei punti è `punto_partita` (non `stato_punto`).
    L'esportazione dell'editor è un JSON di tutte le mappe; l'API accetta `radice`, ma non c'è un pulsante. L'asset delle
    nuove mappe lo pone il server (`assetPredefinitoMappa`), non la finestra «Nuova mappa».
  - **O18, secondo esame (I5).** `MAPPE.md:53` citava ancora il pulsante «Esporta questo luogo», che non esiste. Poi ogni
    testo «…» e ogni rotta `/api/…` di MAPPE.md è stato cercato nel codice (`scratchpad/voce4/mappe-etichette.sh`), e i
    casi sono classificati uno per uno in `prove-esame3/03-classificazione.md`. Corretti:
    - «Torna a» → «Su:»; «Apri mappa» → «Vai:»; «Nuova condizione» → «+ condizione» / «+ gruppo TUTTE»;
    - «Richiude» → «Richiudi»;
    - la barra «Modifica: <mappa>» (è una targhetta più il titolo della scheda);
    - due frasi false sui salvataggi: non c'è una conferma all'uscita, e i form di spillo e mappa hanno il loro «Salva»;
    - nel codice, il commento di `MappaPage.tsx:38`.
- **N7** (osservazione del validatore alla voce 3): `datiGuida` restituisce oggetti congelati, ora tipizzati
  `Congelato<T>` (in sola lettura a ogni livello).
  - Il tipo ha fatto emergere cinque punti in cui il dato congelato entrava in un DTO mutabile: battaglia, completamento,
    richieste, il test di `datiGuida` e `personaggiDiConfidente`.
  - Lì il tipo dichiarato è diventato `Congelato<…>`, senza cast. In `personaggiDiConfidente` c'è una guardia `eElenco`,
    perché `Array.isArray` non esclude un array in sola lettura dall'altro ramo; a runtime equivale ad `Array.isArray`.

### Difetti trovati commentando

- **`SchedaContenutoGuida.tsx`**: tre righe `// …` scritte dentro il JSX del modulo erano testo, e comparivano a schermo nel
  modulo di un contenuto della guida. Diventate `{/* … */}`, con un test che fallisce sul testo di prima. La scansione di
  tutti i 283 file `.tsx` (`jsx-commenti.mts`) non trova altri testi JSX con `//` o `/*`.
- **`SquadraPartita.tsx`** (residuo di A9): `riallineaPartite` partiva anche dopo un errore. Ora parte solo se l'operazione
  riesce, con test.
- `ContenutiGuidaMappa.tsx:40` (`p.scheda!.id` contro `p.id`), segnalato come possibile difetto, non lo è: `p.scheda` viene
  da `schede.get(s.id)`, quindi i due id coincidono.

### Come si è provato che il resto non cambia

Gli output grezzi su `0d329d69`, con il working tree pulito, sono in `scratchpad/voce4/prove-esame2/`. Lo script che li
produce è `scratchpad/voce4/prove.sh`.

- `01-contesto.txt`: HEAD, ramo e `git status` vuoto.
- `06-solo-commenti-da-e1b0cd49.txt`: stampa ogni file senza commenti, compilato dal TypeScript, e confronta prima e dopo.
  - 443 file toccati; il codice cambia in 10, tutti voluti: i due difetti qui sopra con i loro test, e i sei file di N7.
  - Exit 1 proprio per quei 10.
- `07-jsx-commenti.txt`: 283 file `.tsx`, nessun testo JSX con `//` o `/*`.
- `02-typecheck.txt`, `03-lint.txt`, `04-test.txt`: exit 0; 267 file e 1463 test.
- `08-runtime.txt`: battaglia, completamento, richieste, personaggi e suggerimenti della partita 1 rispondono 200, con i
  byte e l'inizio del corpo. I suggerimenti contengono il personaggio collegato al Confidente.

### Da segnalare

- `server/index.ts` alza ancora `requestTimeout` a 30 minuti. Serviva al caricamento nel corpo, che non c'è più; il
  commento ora lo dice. Il valore è rimasto: toglierlo cambierebbe un comportamento, e la voce 4 riguarda i commenti.
