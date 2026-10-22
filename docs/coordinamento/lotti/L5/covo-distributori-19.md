# L5 — contratto dei 19 residui: distributori, servizi del Covo e Jose

## Stato e gate richiesto

Proposta del 21 ottobre 2026, ricostruita sulle specifiche originali L5 a
`43ad8889` e sul codice `389387be`. **Richiesto il gate distinto di SOLUZIONE ad
`audit_documenti_originali` prima di modificare sorgenti o applicare dati.**
Nessuna soluzione di questo documento è già implementata o approvata.
La rimozione del pin1636 è una consegna separata: non viene riaperta e non se
ne anticipa il gate finale. Qui il perimetro è 9 distributori + 9 servizi Covo
+ Jose = 19, non l'intero residuo L5 e non un totale deduplicato dei difetti.

La proposta conserva tutte le identità e non risolve una mancanza di prova
commerciale attraverso un collegamento scelto per ordine o nome. Le scritture
proposte richiedono anche l'elenco approvato previsto da M5 §7.9; il gate
tecnico non sostituisce quel consenso specifico.

## 1. Requisiti originali e vincoli

- R5-01/02/03/14/15/17: luogo per chiave, Area, fonte unica del nome e della
  descrizione, posizione sul pin esistente e pagina canonica del luogo.
- M5 §7.9: annotazioni e passaggi restano tali; i candidati commerciali o di
  attività diventano luoghi o si collegano a quelli esistenti dopo
  approvazione dell'elenco. Non eliminare pin per chiudere il censimento.
- M5 §7.10 e G-014: nessun nuovo luogo per rappresentare soltanto i set di
  inventario A/B/C/D. Un set commerciale non è la prova di una macchina.
- R5-12c: in assenza di orari attestati, soltanto la regola dell'app dichiarata
  come tale, senza convertirla in un dato della guida.
- R5-22…27: conservare posizione, identità, condizioni, note, immagini,
  collegamenti e progressi; nessuna modifica a Diario, Palazzi o acquisti.
- D2/L2: le cinque planimetrie del Covo sono ordinate nell'Area
  `citta/yongen-jaya/covo-dei-ladri`. È un ordinamento dell'app: nel gioco il
  Covo si apre dal menu, fuori dai dungeon e dalla Stanza di Velluto.

Per aderire a R5-15 si propone di rappresentare i nove punti funzionali come
**luoghi di tipo `servizio`**, già presente in `shared/tipiLuogo.ts`. Non nove
negozi, non nuove attività conteggiabili e non un'eccezione silenziosa al
requisito. Non serve un nuovo tipo di luogo o un nuovo tipo di riferimento
per questi nove pin: il riferimento rimane `luogo`.

## 2. Matrice dei 19 e prova disponibile

Lettura mirata di `pacchetto/gioco.db` pubblico93 con
`readonly:true,fileMustExist:true`, senza copie o scritture. I metadati nativi
riportano tipo/indice/sprite/bandiera, non un'identità SHOP o un inventario.

| Pin | Prova e contesto | Esito dell'istruttoria |
|---|---|---|
| 272 | Electric Town, nativo46/indice14 | Macchina attestata, listino non identificato |
| 273 | Electric Town, nativo46/indice15 | Come sopra, mantenendo il pin distinto |
| 274 | Electric Town, nativo46/indice16 | Come sopra |
| 275 | Electric Town, nativo46/indice17 | Come sopra; quattro punti non selezionano quattro dei sei listini |
| 339 | Cancello Shujin, nativo46/indice4 | Due assortimenti possibili; nel pubblico origine utente, nessun raccordo senza consenso |
| 359 | Shopping Kichijoji, nativo46/indice9 | Nessun luogo/listino dedicato identificato nella fonte pubblica letta |
| 1564 | Luci rosse Shinjuku, nativo46/indice11 | Macchina attestata, identità commerciale non provata |
| 1565 | Stessa planimetria, indice12 | Come sopra, senza fusione |
| 1566 | Stessa planimetria, indice13 | Come sopra |
| 375 | Covo, nativo98/indice3, Palace Maker | Funzione riconoscibile; luogo-servizio e destinazione da implementare |
| 376 | Covo, nativo99/indice4, Musica | Come sopra |
| 377 | Covo, nativo100/indice5, Televisione | Funzione Film, distinta da Leblanc/home-shopping |
| 378 | Covo, nativo101/indice6, Galleria | Distinta dalla galleria cittadina |
| 379 | Covo, nativo102/indice7, Area giochi | Accesso alla scheda Magnate esistente |
| 380 | Covo, nativo103/indice8, Premi | Punto distinto, categoria individuale non attestata |
| 381 | Covo, nativo103/indice9, Premi | Come sopra |
| 382 | Covo, nativo103/indice10, Premi | Come sopra |
| 383 | Covo, nativo103/indice11, Premi | Come sopra |
| 386 | Covo, nativo108/indice14, Jose | Punto informativo: classificazione `negozio` impropria, nessun legame commerciale attivo provato |

### Distributori: blocco di prova, non associazione da inventare

I sei listini pubblici Akihabara hanno soltanto ordinali e assortimenti; i
due del Cancello non sono associati agli indici nativi. Il luogo aggregato dei
distributori non dimostra l'identità della singola macchina e quello Shujin
non può ricevere un'Area unica che assorba tutte le Aree scolastiche.

Il coordinatore riferisce la lettura integrale del 21/10 alle20:32Z di
[AGS — distributori automatici](https://www.allgamestaff.it/persona-5-royal/distributori-automatici/):
Akihabara92–129 elenca sei inventari senza posizioni singole; Cancello53–59
distingue due assortimenti senza destra/sinistra; mancano Kichijoji e
l'identificazione delle tre macchine Shinjuku. È una conferma della lacuna,
non una nuova prova di nove raccordi. L'esploratore riferisce che gli
artefatti Atlante cercati qui e nelle cinque worktree non sono presenti; il
vecchio verbale non contiene una prova SHOP.

Per chiudere i nove occorre un raccordo attestato punto nativo → interazione
SHOP → inventario nelle quattro zone. Dopo quella prova si riusano il modello
dei listini condivisi e le sedi già esistenti, oppure si presenta un luogo
fisico nuovo realmente necessario; nessun nuovo luogo-set. Il codice non può
colmare l'assenza della fonte. L'elenco rimane aperto senza falsi abbinamenti.

## 3. Nove luoghi-servizio proposti, con nomi e identità

Tutti i nove punti sono sulla planimetria `nativo-rmap-022-1-1`, nell'Area
`citta/yongen-jaya/covo-dei-ladri`, quartiere di ordinamento `yongen-jaya`.
Il codice corrente dichiara questa Area in `src/utils/covo.ts` e la gerarchia
deriva dalla109. **L'anteprima deve leggerne la FK effettiva e confrontarla**:
se è diversa/assente, 409, senza imporla o spostare il pin.

| Pin / indice nativo | Nome informativo proposto | `servizio_covo` | Chiave tecnica proposta del luogo |
|---|---|---|---|
| 375 / 3 | Creatore del Palazzo del Covo | `creatore-palazzo` | `yongen-jaya/u-covo-creatore-palazzo` |
| 376 / 4 | Lettore musicale del Covo | `musica` | `yongen-jaya/u-covo-musica` |
| 377 / 5 | Film del Covo | `film` | `yongen-jaya/u-covo-film` |
| 378 / 6 | Galleria del Covo | `galleria` | `yongen-jaya/u-covo-galleria` |
| 379 / 7 | Area giochi del Covo | `area-giochi` | `yongen-jaya/u-covo-area-giochi` |
| 380 / 8 | Premi del Covo | `premi` | `yongen-jaya/u-covo-premi-punto-8` |
| 381 / 9 | Premi del Covo | `premi` | `yongen-jaya/u-covo-premi-punto-9` |
| 382 / 10 | Premi del Covo | `premi` | `yongen-jaya/u-covo-premi-punto-10` |
| 383 / 11 | Premi del Covo | `premi` | `yongen-jaya/u-covo-premi-punto-11` |

Gli ultimi quattro hanno intenzionalmente **lo stesso nome e la stessa
funzione**, ma quattro luoghi/pin distinti. Il suffisso tecnico conserva
l'indice nativo del punto, senza assegnare una categoria di premio o inventare
un diverso esercizio. La pagina/anteprima mostra anche la posizione del pin
selezionato; il titolo non diventa «nord», «Battaglia» o «Premio1» per deduzione.
Nessuna fusione di pin o condivisione implicita dell'identità del luogo.

Le chiavi sono parte dell'elenco proposto, non scelte dal client né create ora.
Collisione con una chiave o identità corrente: conflitto motivato, senza
suffissi automatici, overwrite o riuso nominale. L'anteprima mostra tutti i
luoghi correnti del quartiere, anche nascosti. La sola uguaglianza del nome è
un segnale da esaminare; l'eccezione per i quattro nomi uguali riguarda
esclusivamente i quattro punti esplicitamente approvati, non il flusso generico.

### Descrizioni proposte e contenuti reali

| Funzione | `cosa_offre` proposto | Dati già disponibili da mostrare |
|---|---|---|
| Creatore del Palazzo | Decorazioni e ambientazioni del Covo acquistabili con Medaglie P | Gruppi decorativi delle36 voci `completamento.covo.premi`, con costi/sblocchi/oggetti L7 già collegati |
| Musica | Consultazione delle tracce sbloccabili del lettore musicale del Covo | Voce musicale aggregata, fascia costi e condizioni già dichiarate; nessun catalogo individuale inventato |
| Film | Consultazione dei filmati sbloccabili del Covo | Gruppi filmati principali/speciali esistenti, costi e sblocchi disponibili |
| Galleria | Illustrazioni, fotografie e concept art sbloccabili del Covo | Gruppi immagini esistenti e ricompense collegate, mantenendo esplicita la natura aggregata |
| Area giochi | Regole e ricompense del gioco di carte Magnate | `SfideDto.magnate`, già reso da `SchedaMagnate` |
| Premi | Consultazione delle sfide e dei premi del Covo | Le52 sfide e i relativi requisiti, senza assegnare una categoria al singolo punto |

I quattro punti Premi ricevono la medesima descrizione proposta. La fonte
[AGS — Covo](https://www.allgamestaff.it/persona-5-royal/covo-dei-ladri/), letta
direttamente nell'analisi, documenta funzioni e ruolo introduttivo di Jose;
non assegna le quattro categorie alle quattro coordinate. I contenuti non
richiedono un player musicale, un gioco di carte o file multimediali nuovi:
sono destinazioni consultabili della guida, con i dati reali disponibili.

## 4. Schema, DTO e sei destinazioni

### Dati

Proprietà nuova `luogo.servizio_covo TEXT NULL`, valori ammessi esatti:
`creatore-palazzo`, `musica`, `film`, `galleria`, `area-giochi`, `premi`.
Nessun vincolo UNIQUE sul valore: quattro luoghi distinti possono offrire
`premi`. NonNULL soltanto se `tipo='servizio'` e l'Area effettiva è quella del
Covo; tutti i writer, import e ripristini devono applicare la stessa guardia.
Un valore sconosciuto non viene ripulito o sostituito silenziosamente.

Un unico catalogo tipizzato condiviso definisce le sei chiavi e le destinazioni;
`completamento.covo` riceve metadati versionati dei gruppi visualizzabili per
servizio. L'attribuzione dei gruppi usa un manifest pubblico esatto dei record
riconosciuti e chiavi stabili, non un filtro runtime per nome o posizione.
I testi/costi/ricompense restano nella loro fonte attuale. Nessuna copia dei
contenuti dentro i nove luoghi e nessun bilancio Medaglie P inventato.

`LuogoDto`/dettaglio aggiungono `servizioCovo:null|{chiave,nome,casa}`; il
dettaglio del pin espone lo stesso dato risolto dal luogo. Nome e descrizione
del posto restano letti da `luogo`, note proprie del pin separate. Anche Area,
visore, scheda e link inversi devono consumare lo stesso DTO.

| Chiave | Destinazione concreta | Stato e UI prevista |
|---|---|---|
| `creatore-palazzo` | `/guida/covo?servizio=creatore-palazzo#servizio-creatore-palazzo` | Nuovo parametro/ancora sulla route esistente: gruppi decorativi reali della tabella sopra |
| `musica` | `/guida/covo?servizio=musica#servizio-musica` | Nuova sezione: voce musicale aggregata reale, fonte/costi/sblocchi |
| `film` | `/guida/covo?servizio=film#servizio-film` | Nuova sezione: gruppi filmati reali |
| `galleria` | `/guida/covo?servizio=galleria#servizio-galleria` | Nuova sezione: gruppi immagini reali |
| `area-giochi` | `/guida/sfide?scheda=magnate` | Route e parametro già implementati e letti nel codice |
| `premi` | `/guida/covo?servizio=premi#servizio-premi` | Nuovo parametro/ancora: le52 sfide già presenti, senza categoria imposta dal pin |

I primi link non sono spacciati per funzionalità già esistenti. `CovoPage`
deve implementare il parametro tipizzato, evidenziare/aprire la sezione,
gestire focus/scroll e rendere le ancore realmente raggiungibili; la visita
senza parametro conserva la pagina completa. Magnate mantiene il contenuto
esistente e aggiunge il ritorno al luogo/pin del Covo senza perdere contesto.
La pagina canonica del luogo continua a usare `casaDelLuogo`, senza nuovi
indirizzi paralleli per lo stesso luogo.

### Orari e disponibilità

`orari_json=NULL`: nessun orario attestato viene inventato. Scheda e visore
espongono l'origine `regola-app`, secondo R5-12c, e spiegano che l'Area sotto
Yongen-Jaya è un ordinamento dell'app e che l'accesso del gioco è dal menu.
Non aggiungere giorni, prezzi, requisiti di Confidenti o un calendario nuovo.
Le condizioni effettive del pin rimangono identiche; nessun progresso nasce
dalla consultazione del servizio. La disponibilità del Covo non viene dedotta
dall'essere raggiungibile a piedi nel quartiere o da una funzione acquistata.

## 5. Scritture atomiche, CAS e opposizione alle varianti

Il flusso ordinario `luogoDaPinService` pubblicato è per pin personali e
genera chiavi dal nome: **non può essere riusato invariato per nove seed e
quattro nomi uguali**. Non allargare globalmente quella guardia. Si propone
un adattatore Covo circoscritto che riusa la fotografia e il writer canonico
del catalogo, con chiavi interne già mostrate nell'anteprima e limitate al
manifest dei nove punti. Il catalogo deve avere un ingresso interno tipizzato
per quella chiave deliberata, senza esporre una chiave arbitraria nell'API
generica o aggirare validazioni/normalizzazione.

### Anteprima e applicazione

- Nuovi `POST /api/luoghi/covo/anteprima` e `POST /api/luoghi/covo/applica`.
  Anteprima readonly, `no-store`; applicazione soltanto dopo elenco approvato.
- Richiesta strict: `{operazioneId,luoghi,jose?}`, con `operazioneId` UUID e
  `luoghi:[{pinId,spilloUid,nome,cosaOffre,servizioCovo}]`; ammessi un singolo
  punto oppure l'intero insieme dei nove, senza ID ripetuti. `jose`, quando
  presente, è esattamente `{pinId:386,spilloUid,guidaCovo:'jose'}`: manifesta
  la rettifica informativa del §6, senza modifiche commerciali. La lista
  `luoghi` può essere vuota soltanto per un gesto Jose esplicito. Quartiere,
  Area, chiave del luogo, coordinate, condizioni e tipo non sono input liberi.
- Anteprima: richiesta normalizzata, identità complete dei bersagli, FK reali,
  chiavi e dati previsti per i soli punti richiesti, luoghi correnti inclusi nascosti, operazioni
  proposte ed esclusioni; token SHA-256 di gruppo. Ogni elemento espone anche
  la sua revisione, per l'eventuale gesto singolo riletto separatamente.
- Applica: stessa richiesta immutabile e token `revisioneAttesa`; nuova
  fotografia e validazione nella stessa TX IMMEDIATE, file utente collegato.
  Un conflitto in un elemento annulla **tutto il gruppo**, senza applicare i
  restanti. L'esclusione richiede una nuova anteprima di un diverso gesto.
- Il manifest confronta identità nativa completa, mappa/Area effettiva,
  origine/identità seed, riferimento corrente, relazioni, immagini, condizioni,
  stati e Cestino. Varianti personali, foto incoerenti o identità non provate
  producono409; nessuna cancellazione, adozione o ricreazione degli assenti.
- Crea soltanto i luoghi espliciti, origine utente, fotografia seedNULL,
  tipo servizio e Area/quartiere letti dalle FK. Sul pin aggiorna soltanto
  riferimento a luogo e `updated_at`, con CAS ID+UID e `changes===1`.
  Mappa, x/y, tipo/icona originale, native, nome/descrizione RAW, origine,
  condizioni, note, voci, immagini e stati rimangono invariati.
- Ricevuta 201 minima costruita dentro la TX:
  `{operazioneId,esito:'applicata',luoghi:[{chiave,nome,spillo:{id,uid,mappaChiave}}],
  jose:null|{spillo:{id,uid,mappaChiave},guidaCovo:'jose'}}`.
  Le chiavi mappa sono quelle pubbliche dei normali DTO. Riletture del dettaglio
  successive e fallimenti di refresh sono separati dal successo acquisito.

Per non perdere proprietà/replay e prima-immagini si propone una piccola
tabella privata `utente.operazione_raccordi_covo`: `operazione_id TEXT PRIMARY
KEY`, `formato INTEGER CHECK(formato=1)`, `richiesta_json TEXT`,
`prima_json TEXT`, `dopo_json TEXT`, `ricevuta_json TEXT`, `creato_il TEXT`,
tutti NOT NULL. Nessun numero di migrazione viene riservato qui. Registro
immutabile scritto nella medesima transazione; assenza/incoerenza blocca la
scrittura, non la rende non tracciata. Replay con stesso ID verifica prima
identità e intero payload originale, **prima del CAS ormai stale**, e torna la
ricevuta storica senza modificare lo stato corrente; ID/payload diverso409.
Un `GET /api/luoghi/covo/operazioni/:operazioneId` readonly e `no-store`
restituisce la sola ricevuta validata, oppure 404 se non esiste; un registro
presente ma illeggibile produce conflitto esplicito. La ricevuta prova il gesto
storico, non che il dopo sia ancora lo stato corrente. Il GET non espone le
fotografie private e non genera scritture o nuove operazioni.

Tutte le fotografie, UID correnti, note, immagini e progressi rimangono
nell'istanza privata. Nel repository soltanto manifest pubblico e contratto;
nessun RAW live, token, file DB, schermata o copia di backup.

Il client conserva ID/payload/token prima della rete e mantiene la ricevuta
anche se cambia il contesto; non aggiorna un altro pin selezionato. Errori409
preservano la bozza e richiedono rilettura. Incertezza non equivale a fallimento:
rilettura esplicita dell'operazione o stato corrente, nessun retry cieco con
un nuovo ID. Nessun consenso è inferito da una bozza o dal gate tecnico.

## 6. Jose: classificazione informativa, nessuno scollegamento

Il coordinatore ha confermato readonly sul corrente: pin386
`tipo=negozio`, riferimento_tipo/chiaveNULL, nessuna sede perUID in
`negozio_sede_spillo`; `negozio.jose.luogo_chiave=NULL`.
Il pubblico93 coincide sui riferimenti. La vecchia dicitura «falso raccordo
commerciale» va letta come classificazione impropria: **nessun legame attivo
da scollegare è provato**.

Proposta esplicita nell'anteprima: conservare pin386 e la sua icona nativa108,
correggere il tipo applicativo in `nota` e aggiungere un rimando informativo
«Jose — introduzione al Covo». Nome, descrizione personale e note non sono
sovrascritti. Nessun luogo commerciale, articolo, valuta, sede o acquisto.

Proprietà circoscritta nuova `spillo.guida_covo TEXT NULL`, valore ammesso
unico `jose`; ammesso soltanto per pin informativo con riferimento primarioNULL
nel contesto Covo. Il dato persiste esplicitamente, senza riconoscere nomi o
ID al rendering. `SpilloDto.guidaCovo` risolve
`{chiave:'jose',nome:'Jose — introduzione al Covo',casa:'/guida/covo#come-funziona'}`
dal medesimo catalogo tipizzato. Ancora nuova `come-funziona` sulla sezione
introduttiva già esistente; mostra il ruolo di guida e l'accesso dal menu,
senza sostituire la scheda del negozio Jose dei Memento.

La modifica Jose ha proprio CAS ID+UID+fotografia, può essere inclusa nella
TX di gruppo soltanto se esplicitamente presente nel payload e usa lo stesso
journal privato. Sono modificabili soltanto tipo, `guida_covo` e `updated_at`;
le altre colonne e le tabelle commerciali rimangono identiche. Il parametro
guida diventa visibile nell'editor del pin come collegamento informativo,
con rimozione esplicita e conservazione della provenienza nativa.

## 7. Editor, lettori, import/export, ripristino e Cestino

| Superficie reale | Adeguamento previsto |
|---|---|
| `shared/tipiLuogo.ts` | Riusare servizio; nessun tipo nuovo |
| Catalogo tipizzato Covo / `shared/types.ts` | Sei funzioni, rimando Jose e DTO additivi validati |
| `catalogoService.ts`, schemi catalogo, `ModuloLuogo.tsx` / `CampiLuogoL5` | Campo servizioCovo selezionabile, nullable, guardia tipo/Area; nome/descrizione modificati nel solo modulo canonico |
| `luoghiService.ts`, `LuogoPage.tsx` | Proprietà canonica, link al contenuto reale, nota sull'accesso dal menu e regola app degli orari |
| `mappeService.ts` dettaglio/spillo, `areeService.ts`, `VisoreMappa.tsx`, `SchedaContenutoGuida.tsx` | Stesso servizio risolto e navigazione; nessuna merce del negozio Jose sul punto informativo |
| `CovoPage.tsx`, `completamentoService.ts` | Sei destinazioni reali, metadati per chiave e fonte singola dei contenuti esistenti |
| `SfidePage.tsx` | Riusare `?scheda=magnate`, ritorno al contesto Covo |
| `luogoDaPinService.ts` / fotografia | Riuso delle invarianti, adattatore Covo separato; niente ampliamento indiscriminato ai seed |
| `EditorMappaPage.tsx` / modulo pin | Visualizzare il rimando Jose e l'eventuale servizio derivato dal luogo; anteprima senza salvare bozze estranee |
| `mappeService` import/export, schemi e DTO pacchetto | Trasportare `guida_covo`; campi sconosciuti/malformati non vengono scartati come successo completo |
| `pacchettoGiocoService.ts` | Gioco esporta proprietà/definizioni pubbliche, mai il journal privato; import vecchio inizializza soltanto metadati assenti, senza applicare i nove raccordi |
| `catalogoService` ripristino e `cestinoService.ts` | Fotografie nuove conservano proprietà; fotografie vecchie con campo assente non cancellano una decisione successiva. Conflitto su identità/riferimento/schema, senza reset |

Spostare un luogo-servizio fuori dall'Area Covo o cambiare tipo richiede
rimuovere esplicitamente la proprietà nella stessa richiesta; non eliminarla
silenziosamente. Cambio nome non rompe la funzione, perché citata per chiave.
La correzione dei testi di guida non deve duplicare le descrizioni dei pin.

Eliminare un nuovo luogo usa il Cestino ordinario luogo con il suo pin e i
legami; ripristina soltanto con le guardie correnti, conservando modifiche
successive. Eliminare un pin usa il Cestino pin137: la fotografia integrale
include la nuova proprietà, senza restauri parziali di schema. Jose non viene
cancellato per correggerne la classificazione. Il journal descrive l'operazione
storica ma non autorizza overwrite dopo eliminazione, restore o import.
Una richiesta esplicita di annullare il raccordo deve confrontare integralmente
il dopo registrato; se è cambiato,409 e nessuna inversione cieca.

## 8. Consenso, blocchi e criteri del gate

La tabella dei nove nomi/servizi/pin/Area e la rettifica informativa Jose sono
l'elenco concreto da riesaminare. Dopo PASS tecnico si presenta il consenso
richiesto da M5 §7.9, distinto dagli otto raccordi precedenti e dalle tre
schede già applicate. Non si chiede all'utente di inventare categorie Premi,
identità commerciali o regole tecniche. Nessuna scrittura è ancora autorizzata
da questo dossier e nessuna migrazione applicherà automaticamente l'elenco.

Richiesto al revisore: coerenza col requisito luogo/fonte unica, necessità e
limiti delle due proprietà, identità dei quattro Premi senza fusione,
contenuti/route effettivi, collisioni chiavi e nomi, CAS/replay di gruppo,
privacy, Cestino e compatibilità delle fotografie. Eventuali variazioni di
questo contratto devono essere riesaminate prima degli edit.

Restano blocchi finiti distinti: prova SHOP dei nove distributori; gate di
soluzione e poi consenso dell'elenco Covo/Jose; codice futuro, tre riesami,
controlli integrati, rilascio e riscontri distinti. Non si dichiara completo
alcun gruppo o lotto soltanto perché esiste questo documento.

Nessun test, API writer, scrittura DB, modifica ai sorgenti, commit o push
eseguito dall'autore per questa consegna documentale.
