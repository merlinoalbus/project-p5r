# L8 — Contratto dei dati di negoziazione

Data: 2026-10-21. Stato: analisi statica e censimento delle fonti conclusi; contratto P3 approvato tecnicamente dal revisore distinto, non implementato. I conteggi sono misure dell'autore, non una certificazione autonoma del revisore; nessuna consegna di L8 approvata. Prima del codice L8 si completano i residui L5/L6, come richiesto dall'utente.

Base del codice: `e0ea995e`, ramo `newreview`. Specifica originale: R8-07a…f, M8 §1.4 e piano B4/F4 alla revisione `43ad8889`, precedente all'implementazione L8. G-021 e gli allegati recuperati sono confrontati con le fonti effettive, non assunti come conteggi infallibili. Il mandato richiede tutte le domande, risposte, attestazioni e note, una fonte operativa unica, provenienza e discordanze dichiarate, consultazione per umore/Ombra e accesso rapido dal telefono.

## Perimetro e metodo

Lettura dei sorgenti, del JSON originale dell'app, di G-021, degli allegati `neg-mappa.json`, `neg-diff.json` e del workbook `royal.xlsx`, foglio `output`. Workbook aperto con `openpyxl`, `read_only=True`, `data_only=True`; analisi delle righe in memoria. Nessun test, migrazione, avvio di servizi o scrittura DB.

Il pacchetto pubblico `pacchetto/gioco.db` e il DB locale `data/gioco.db` del worktree sono stati aperti con SQLite URI `mode=ro`. Sono state eseguite soltanto la lettura di `dati_guida` per la chiave `battaglia` e la lettura di `PRAGMA user_version`. Valori osservati: pacchetto 93; locale 122. Il cambiamento rispetto a una precedente osservazione locale a 120 non è attribuito a una causa: questa analisi non ha eseguito migrazioni. **Il DB locale non è prova del contenuto di p5s.** Nessun dato personale o percorso privato degli allegati viene riprodotto qui.

## Ingressi e coordinate

| Ingresso | Coordinate conservabili | Contenuto osservato |
|---|---|---|
| `server/db/dati/negoziazione-domande.json` | `A<indice domanda>/risposta/<indice>/verdetto/<indice>` | 230 domande, 691 risposte, 642 attestazioni, 7 con `incerto` |
| Workbook Royal, foglio `output` | `R<indice dati>` e indirizzo Excel | 277 domande, 831 posizioni risposta, 3.324 celle per umore |
| JSON runtime `dati_guida.battaglia.negoziazione` | Percorso nella fotografia d'ingresso, distinta per provenienza | 225 domande, 680 risposte, 618 attestazioni sia nel pacchetto letto sia nel DB locale letto |
| `neg-mappa.json` | `a`, `r`, `ordine`, `certezza`, `nota` | 230 righe: 219 alta, 10 media, 1 bassa; A156 senza Royal |
| `neg-diff.json` | Coordinate A/R delle righe | 86 righe `errori`, 58 domande `mancanti`; manca una matrice delle 979 aggiunte |
| G-021 | Sezione e coordinate A/R | Rese italiane, correzioni, note, riferimenti e conteggi da riconciliare |

Gli indici A/R sono a base zero. La riga fisica Excel della domanda R è `R + 2`, per l'intestazione e la numerazione Excel. Il campo `ordine` è indicizzato sulle risposte dell'app e contiene l'indice della risposta Royal, oppure `null`; non va applicato al contrario. A125 e A135 hanno quattro risposte nell'app: nessun ciclo può presumere sempre tre risposte app.

| Risposta Royal | Testo | Cupa (`Gl`) | Irritabile (`Ir`) | Timida (`Ti`) | Giocosa (`Up`) |
|---|---|---|---|---|---|
| 1 | E | F | G | H | I |
| 2 | J | K | L | M | N |
| 3 | O | P | Q | R | S |

Le altre colonne sono Flag, Shadow, Question e Q Sorter. `GOOD` → buona, `OK` → passabile, `BAD` → cattiva. `-` significa esito non documentato, non esito neutro. Il significato del flag `X` non è stato accertato da questa analisi: non va trasformato in certificazione. Il nome Shadow resta un'attestazione della fonte, non una regola automatica di collegamento per somiglianza alle Ombre dell'app.

## Duplicati e varianti

Cinque gruppi hanno lo stesso testo italiano della domanda: A23/A223 → R181; A44/A206 → R70; A88/A168 → R184; A133/A192 → R104; A160/A162 → R54. Sono i gruppi gestiti dalla normalizzazione 083/084, che raggruppa domanda e risposta per testo e sceglie il peggiore fra gli esiti discordanti.

Le corrispondenze verso la stessa domanda Royal comprendono invece nove gruppi e dieci righe eccedenti:

| Royal | App |
|---|---|
| R181 | A23, A223 |
| R15 | A32, A194 |
| R70 | A44, A206 |
| R146 | A87, A150 |
| R184 | A88, A168 |
| R104 | A124, A133, A192 |
| R156 | A125, A126 |
| R240 | A128, A208 |
| R54 | A160, A162 |

La corrispondenza A87 → R146 ha certezza bassa: la domanda «Ti trasformerò in zuppa» non coincide con la domanda Royal. A150 → R146 è alta. La coincidenza della destinazione non autorizza a fondere A87 e A150.

Le nove Royal che G-021 chiama «doppioni o varianti già nell'app, da non aggiungere» devono comunque restare coperte dalla conversione:

| Coppia/variante | Evidenza concreta |
|---|---|
| R18/R17 | Risposte differenti: «I can certainly try / No can do / What's veneration?» contro «I can / I can't / I don't adore him» |
| R41/R188 | Risposte corrispondenti con attestazioni complementari, non una riga interamente ridondante |
| R98/R99 | Attestazioni differenti e complementari; nessuna delle due copre l'altra |
| R163/R162 | Terza risposta differente: «I'll buy it for you» contro «Be more persistent» |
| R165/R164 | Stesso testo domanda normalizzato, attestazioni complementari |
| R195/R116 | Attestazioni differenti e complementari |
| R266/R106 | «I'm sorry»: Irritabile OK contro GOOD, Giocosa OK contro BAD |
| R196/A101 | A101 incorpora R196 e R216 nelle risposte separate da `/` |
| R103/A218 | A218 incorpora R102 e R103, con testi domanda/risposte differenti |

Anche R125/R126 ha testo domanda identico ma risposte differenti. Né il testo della domanda né il suo testo normalizzato è una chiave di identità sufficiente. Gli abbinamenti possono collegare le varianti; non possono cancellare la copertura delle righe sorgente.

A101 contiene, per esempio, «Chi cammina piano./I permalosi.»: il primo segmento corrisponde a R196 e il secondo a R216. La fonte app non consente di attribuire automaticamente ogni suo verdetto a uno dei segmenti. A218 presenta un problema analogo. Il testo app completo e le sue attestazioni devono restare riconoscibili anche quando le varianti Royal vengono mostrate separatamente.

## Celle multi-esito e testo non disponibile

Il workbook ha 1.714 celle con esito singolo, 1.606 celle vuote e quattro celle multi-esito:

| Cella | Coordinate | Valore originale |
|---|---|---|
| G32 | R30/A155, risposta 1 Irritabile | `GOOD / OK?` |
| F92 | R90/A38, risposta 1 Cupa | `GOOD / OK` |
| N120 | R118/A198, risposta 2 Giocosa | `GOOD / OK` |
| I205 | R203/A138, risposta 1 Giocosa | `OK/BAD?` |

Sono quindi 1.718 celle documentate; scomporre le quattro celle in due alternative produce 1.722 alternative atomiche. Va conservato anche il valore originale della cella, senza eliminare il punto interrogativo né attribuirgli una precisione non documentata.

La PK proposta da M8, `(risposta_chiave, umore, fonte)`, impedisce di salvare più esiti della stessa fonte. Il problema riguarda sia queste celle Royal sia le contraddizioni app. Occorre identificare ciascuna attestazione per posizione sorgente e alternativa, mantenendo fonte, localizzatore, valore originale, esito, incertezza e ruolo principale.

R230 ha effettivamente due testi `[…]` nel workbook. Sono testi non disponibili nella fonte: conservare il valore grezzo e dichiararne l'assenza nella presentazione. Non inventare risposte, non presentare le parentesi come testo italiano di gioco e non confonderle con segnaposto introdotti dall'applicazione.

## Riconciliazione dei conteggi

### Provenienza delle celle Royal: rettifica esplicita di G-021

G-021 storico afferma che gli esiti ereditati dal gioco originale non sono distinguibili nel foglio. Il successivo censimento ha invece letto gli stili delle celle: il convertitore pubblico `tableConverter.py` usa `fill.start_color.index` per produrre la classe HTML `unconfirmed`. La legenda di `royal.md` descrive tale classe come esiti ereditati da P5 e non confermati; le altre celle documentate sono attribuite a segnalazioni o alla partita dell'autore. Questo è uno stato dichiarato dalla fonte, non una certificazione indipendente della verità nel gioco.

| Celle Royal | Colore Excel originale | Presentazione della fonte |
|---|---|---|
| 1.414 documentate | `FFFFFF00` | Raccolta Royal, senza `unconfirmed` |
| 304 documentate | 298 `00000000`, 5 `FFFF0000`, 1 `FFFFC000` | `unconfirmed`, ereditate da P5/non confermate |
| 1.606 senza esito | `00000000`, valore `-` | Assenza di dato, senza `unconfirmed` |

Metodo: censimento in memoria delle righe del workbook aperto in sola lettura, estrazione delle 277 tabelle di `royal.md`, confronto per posizione delle 3.324 celle, dei valori grezzi e della classe derivante dalla regola del convertitore. Nessuna differenza trovata fra questi ingressi recuperati. Il convertitore non è stato eseguito: è stato letto come fonte della codifica. Questa è riconciliazione delle sorgenti, non un test dell'applicazione. I conteggi sono misure dell'autore del censimento, non misure indipendenti del revisore.

Il payload pianificato conserva valore grezzo, colore originale, coordinata e versione della fonte, oltre alla provenienza dichiarata per cella. Hash SHA-256 del workbook pubblico recuperato: `f162cc865dc016789d46b0d79584135cd30ed9c6cf4d4330eefc5cbf90f1398e`. Nessuna proprietà personale del workbook o percorso locale deve essere esportato. G-021 originale resta invariato come documento storico; la divergenza è registrata qui.

Le cifre seguenti usano il mapping recuperato senza correggerne gli abbinamenti; descrivono quel confronto, non certificano tutti gli abbinamenti semantici.

- 49 risposte non abbinate all'interno di domande abbinate, più le tre di A156: 52 `null` nel mapping complessivo.
- 24 celle app contraddittorie; 22 hanno una cella Royal con esito singolo. Le due senza dato Royal sono A16 risposta 3 Giocosa e A81 risposta 2 Timida, entrambe buona/passabile. Questo non elimina l'ambiguità di attribuzione alle varianti incorporate, come A101.
- `neg-diff.errori` ha 86 casi; manca A19 «Non ho tempo./Chiedo scusa.», Cupa: app passabile+buona contro Royal cattiva. Il testo G-021 cita già questo caso. Il confronto per cella con nessun esito app coincidente restituisce quindi 87, senza contare come ulteriore correzione ogni alternativa di una contraddizione.
- Royal è vuoto su 53 celle con attestazioni app, pari a 55 attestazioni atomiche. Non confondere i due conteggi né assumere 51 come inventario completo.
- Le 957 celle Royal assenti sulle risposte effettivamente abbinate non hanno lo stesso denominatore del numero 979 riportato nel resoconto. L'allegato non contiene la matrice di dettaglio delle 979: la completezza deve derivare dall'inventario per cella, non dall'uguaglianza a un totale storico.
- G-021 riporta 218 corrispondenze alte; il JSON recuperato ne contiene 219. Le rimanenti sono 10 medie e una bassa. «Alta» su A156 indica certezza dell'assenza di corrispondenza, non un abbinamento Royal.

Riconciliazione atomica delle 642 attestazioni app:

| Umore | Totale app | Uguali a Royal | Diverse | Royal vuoto | Risposta non abbinata | Domanda non abbinata |
|---|---:|---:|---:|---:|---:|---:|
| Cupa | 161 | 113 | 31 | 9 | 8 | 0 |
| Irritabile | 207 | 133 | 34 | 23 | 16 | 1 |
| Timida | 128 | 94 | 16 | 13 | 5 | 0 |
| Giocosa | 146 | 104 | 28 | 10 | 4 | 0 |

Due esiti contraddittori sono due attestazioni della stessa cella: questa tabella non conta correzioni. Le quattro celle Royal multi-esito non trovano attestazioni app sulle medesime coordinate del mapping usato; rimangono comunque parte dell'inventario Royal.

Inventario delle celle Royal per umore:

| Umore | GOOD | OK | BAD | Multi-esito | Vuote | Totale |
|---|---:|---:|---:|---:|---:|---:|
| Cupa | 239 | 139 | 97 | 1 | 355 | 831 |
| Irritabile | 243 | 114 | 104 | 1 | 369 | 831 |
| Timida | 212 | 86 | 53 | 0 | 480 | 831 |
| Giocosa | 253 | 115 | 59 | 2 | 402 | 831 |

## Soluzione proposta al gate

1. Fotografare separatamente file originale, Royal, mapping/G-021 e JSON runtime prima della conversione. Una fotografia locale non sostituisce l'inventario dell'istanza effettivamente migrata. Snapshot e provenienze storiche restano immutabili.
2. Importare tutte le righe Royal, comprese le nove varianti. Usare identità stabili di domanda, variante e risposta; nessuna identità costruita solo dal testo visualizzato. Il numero finale delle schede dipende dai raggruppamenti dimostrati, non dal traguardo approssimativo «274».
3. Conservare tutte le 642 attestazioni originali e tutte le righe runtime. Le 083/084 comprimono le contraddizioni scegliendo il peggiore: il loro risultato non può ricostruire l'originale. Le differenze runtime dalla normalizzazione conosciuta non vanno sovrascritte né etichettate automaticamente come errori o modifiche utente senza prova.
4. Separare identità, testo e attestazioni. Conservare lingua originale, resa italiana e `testo_origine` (`gioco`, `resa-app`, `resa-esperto`). Non trasferire gli esiti fra segmenti di una frase con varianti concatenate senza corrispondenza dimostrata.
5. Royal è principale sulle corrispondenze attestate; gli esiti app restano come altra provenienza. Royal vuoto lascia visibili gli esiti app come non verificati in Royal. Royal multiplo mostra alternative e disaccordo; niente scelta automatica del migliore o del peggiore. La classe «solo P5» indica assenza di riscontro Royal, non prova dell'inesistenza dell'esito in Royal.
6. Mapping basso o ambiguo resta esplicito e consultabile. A87 non viene fusa automaticamente con A150. A101/A218 richiedono relazioni fra varianti conservando anche la fonte app aggregata.
7. Preservare note generali e precedenti esempi delle schede umore. Le correzioni previste da G-021 conservano provenienza e motivo. Le nuove traduzioni dell'Esperto non diventano testo del gioco. Per esempio «In realtà sono un ragazzino» è passabile per Timida in R20; «Senza impegno?» non ha esito Irritabile documentato in R101: non mantenerli come esempi di risposta buona senza discordanza.
8. Generare il rapporto dall'importazione effettiva, per ciascuna posizione sorgente: destinazione, relazione, trasformazione, conservazione, discordanza o assenza di testo/esito. Separare conteggi di domande, varianti, risposte, celle e attestazioni. Nessuna completezza attestata dai soli totali 49/86/979.

Il rapporto deve consentire di ritrovare ciascuna delle 642 attestazioni app, ciascuna cella e posizione risposta Royal, le 49 domande rese in G-021 e anche le nove varianti escluse dal suo elenco delle nuove; deve includere le note e le righe runtime aggiuntive. Le corrispondenze non dimostrate restano dichiarate, senza bloccare la conservazione della relativa fonte.

## Consumatori e contratto API

Percorso corrente: `dati_guida.battaglia` → `server/services/battagliaService.ts:13` → `GET /api/compendio/battaglia` in `server/routes/compendio.ts:224` → `src/pages/BattagliaPage.tsx` → `src/components/guida/RisposteNegoziazione.tsx`.

- `shared/types.ts`, blocco `NegoziazioneDomandaDto` presso riga 1982, non rappresenta identità, varianti, provenienze e alternative principali.
- `RisposteNegoziazione` ordina tramite il primo verdetto trovato per tratto: con più attestazioni sceglierebbe in funzione dell'ordine dei dati. Il nuovo contratto deve esporre la valutazione presentabile e tutte le sue attestazioni, distinguendo esito singolo, discordanza e assenza di dato.
- Le chiavi React basate sul testo collidono con varianti legittime. Usare le identità stabili.
- `src/utils/negoziazione.ts` cerca solo testo domanda e risposte: estendere alle varianti linguistiche conservate senza usarle come criterio di fusione.
- La vista per umore deve rendere esplicita l'assenza di esito documentato; non far sparire una domanda per tutte le personalità cui la fonte non assegna esiti.
- Battaglia, Ombra e pagina negoziazione devono usare lo stesso lettore delle tabelle. Il JSON precedente può restare fotografia storica; non deve essere una seconda fonte operativa concorrente.
- Prevedere `GET /api/compendio/negoziazione` e `GET /api/compendio/negoziazione/verifica` come nel piano, con provenienza, discordanze e copertura per umore. L'indirizzo di consultazione deve mantenere umore/Ombra e ricerca; il percorso telefono resta umore → domanda o ricerca diretta, con esiti immediatamente leggibili.
- Il link dall'Ombra deriva dalla sua personalità valida; personalità sconosciuta e Ombre non negoziabili non devono ricevere una personalità dedotta da un nome del workbook.

## Limiti e seguito

La lettura ha coperto tutte le celle del workbook e tutti gli elementi del JSON originale e degli allegati recuperati. Non è stata eseguita una nuova certificazione linguistica di ogni abbinamento semantico di `neg-mappa`: le corrispondenze medie/basse e le varianti restano evidenza da trattare esplicitamente. Nessuna prova runtime, migrazione, verifica layout o certificazione dei dati live. Le quantità oggi osservate descrivono gli ingressi letti; l'istanza migrata dovrà produrre il proprio inventario senza perdere righe aggiuntive.

Il passo successivo è il riesame distinto del piano integrato L8, inclusi cardinalità delle attestazioni, varianti e matrice delle provenienze. Questo documento non autorizza l'implementazione e non dichiara soddisfatti R8-07a…f.

## Addendum operativo — preparazione successiva al rilascio `1de1ccba`

Stato dell'addendum: disegno concreto proposto al revisore, nessun codice L8 scritto. Il gate tecnico P3 già ricevuto approva conservazione delle attestazioni/versioni/celle, alternative, priorità Royal, varianti e gestione R230; non certifica una futura implementazione. L'avvio resta subordinato al via libera del coordinatore dopo i residui precedenti.

### A. Ingressi disponibili, derivati ancora da produrre

Disponibilità dei seguenti file riconfermata dopo il rilascio. Gli allegati recuperati sono presenti nell'area di lavoro privata, i cui percorsi non sono riprodotti nel repository.

| Ingresso | Disponibile | Trattamento previsto |
|---|---|---|
| `server/db/dati/negoziazione-domande.json` | Sì, già versionato | Conservare identico; ingresso app originale, non sostituirlo con le righe normalizzate |
| `guida/G-021-negoziazione.md` | Sì, già versionato | Conservare il documento storico; estrarre rese, esempi, coordinate e note nei derivati con provenienza |
| `royal.xlsx` | Sì, 69.197 byte | Sorgente prioritaria delle celle Royal, inclusi stili; esportare il contenuto pubblico, non proprietà del file o percorsi locali |
| `royal.md` | Sì, 456.058 byte | Evidenza della legenda e della corrispondenza delle 277 tabelle; non necessario come duplicato operativo completo |
| `tableConverter.py` | Sì, 8.569 byte | Evidenza della codifica dei colori; non eseguirlo né importarlo nel backend |
| `neg-mappa.json` | Sì, 21.580 byte | Conservare tutte le associazioni, ordini, null, certezze e note come ingresso storico |
| `neg-diff.json` | Sì, 53.580 byte sul file recuperato | Conservare il resoconto originale; A19 e altre rettifiche sono registrate separatamente, non riscritte come se appartenessero all'originale |
| JSON runtime di negoziazione | Da leggere sulla connessione della futura migrazione | Ingresso privato distinto; nessun contenuto o impronta privata esportato in git |

Nuovi file di dati previsti, non ancora generati:

- `server/db/dati/negoziazione-royal.json`: versione del formato, attribuzione/URL pubblico, hash del workbook e tutte le 277 righe. Ogni risposta conserva indice e testo originale; ogni cella conserva coordinata, valore grezzo, colore e provenienza indicata dalla fonte. Anche le celle vuote restano nell'inventario di copertura. Le alternative normalizzate sono derivate dal grezzo, non lo sostituiscono.
- `server/db/dati/negoziazione-abbinamenti.json`: copia pubblicabile del mapping e del diff recuperati, con le rispettive identità di fonte; sezione separata delle rettifiche/riserve documentate in questo contratto. Nessuna applicazione automatica dell'abbinamento basso A87, dei segmenti ambigui A101/A218 o di valori `ordine=null`.
- `server/db/dati/negoziazione-rese-it.json`: testi italiani per identità della variante/risposta, con autore/origine della resa e coordinate della fonte. Le 49 rese già in G-021 vengono attribuite a G-021; eventuali nuove rese prodotte nel lotto sono `resa-app` con provenienza L8, non attribuite retroattivamente all'Esperto o al gioco. Per R230 i due testi assenti rimangono assenti, non traduzioni delle parentesi.

Nessun derivato deve contenere `data/gioco.db`, dati di partita, metadati personali del workbook o copie di altri blocchi della guida. Gli hash ammessi nei dati pubblici identificano soltanto gli ingressi pubblici. L'estrazione di celle è preparazione di dati: nessuno script riscrive file TypeScript/TSX o modifica sorgenti esistenti. La composizione dei nuovi file di dati avverrà soltanto dopo il via libera e con inventario riga per riga riesaminabile.

### B. Tabelle proposte e cardinalità

La separazione fra famiglia e variante evita di fondere risposte incompatibili sotto una sola domanda. È un affinamento del disegno M8 necessario per R125/R126 e per le varianti incorporate dell'app; non introduce un secondo catalogo operativo. Il revisore distinto ha approvato questo disegno, mantenendo fermo l'avvio L8 fino al via libera del coordinatore.

Vincoli precisati dal gate: i campi `fonte`, `versione_fonte`, `localizzatore` e `alternativa` del vincolo univoco delle attestazioni sono tutti `NOT NULL`; l'alternativa ha indice deterministico anche per l'esito singolo. Un esito principale proveniente dalle 304 celle `unconfirmed` rimane etichettato ereditato da P5/non confermato, mai «verificato Royal»: la priorità della raccolta non cancella lo stato della fonte o il conflitto. Per raggruppare duplicati si confrontano anche insieme delle risposte e corrispondenze documentate, non il solo testo della domanda.

| Tabella | Identità e campi essenziali | Responsabilità |
|---|---|---|
| `negoziazione_domanda` | `chiave` PK, `ordine` | Famiglia di domande dimostrate equivalenti. La semplice somiglianza non assegna la famiglia; una variante senza relazione dimostrata ha una famiglia autonoma |
| `negoziazione_variante` | `chiave` PK, `domanda_chiave` FK, `testo`, `testo_originale`, `testo_origine`, `fonte`, `versione_fonte`, `localizzatore`, `ordine`, `note_json` | Una versione concreta della domanda, con il proprio insieme ordinato di risposte. Testi e note sorgente non vengono persi nella famiglia |
| `negoziazione_risposta` | `chiave` PK, `variante_chiave` FK, `testo` nullable, `testo_originale`, `testo_origine`, `testo_disponibile`, `ordine`, `corrispondenze_json` | Una posizione risposta. Corrispondenze esplicite verso altre risposte per chiave, certezza e fonte; nessuna identità per solo testo e nessuna inferenza dalla posizione |
| `negoziazione_verdetto` | `chiave` PK, `risposta_chiave` FK, `umore`, `esito`, `incerto`, `fonte`, `versione_fonte`, `localizzatore`, `alternativa`, `valore_grezzo`, `colore_grezzo`, `origine_indicata_fonte` | Un'attestazione atomica. Vincolo univoco su fonte/versione/localizzatore/alternativa; non su risposta/umore/fonte. Il servizio calcola principali/alternative senza cancellare attestazioni |
| `negoziazione_umore` | `umore` PK, `nome`, `descrizione`, `esempi_json`, `da_evitare_json`, `fonte`, `versione_fonte` | Le quattro carte con esempi collegati quando attestati; i contenuti precedenti restano nella fotografia d'importazione e nel dettaglio delle rettifiche |
| `negoziazione_importazione` | `chiave` PK, `versione_formato`, `fonti_json`, `input_runtime_json`, `rapporto_json` | Fotografia e riconciliazione dell'importazione effettiva, immutabili. L'ingresso runtime resta soltanto nel DB; questa tabella non alimenta le risposte al posto delle tabelle operative |

`corrispondenze_json` contiene oggetti con chiavi risposta esplicite, non testi usati come puntatori. Import e lettore verificano che tutte le destinazioni esistano. Nel perimetro P3 non è prevista una API di cancellazione/fusione di domande: se sarà introdotta, deve trattare questi riferimenti e la fotografia storica separatamente.

I cinque gruppi di duplicati app esatti confluiscono nella stessa famiglia visibile, conservando le versioni e le coordinate dei loro verdetti. Tutte le 277 righe Royal rimangono varianti identificabili, comprese le nove non elencate fra le nuove domande. Una relazione dubbia non impone una famiglia comune. Il numero di famiglie non è usato come soglia artificiale di conformità.

Le corrispondenze di risposta attestano quali alternative sono confrontabili. Il calcolo dell'esito principale raccoglie solo Royal realmente collegato a quella risposta/variante; non raccoglie tutte le risposte di una famiglia e non applica un esito di R196 a un testo esclusivo di R216. Con più esiti Royal restituisce discordanza; senza Royal documentato conserva gli esiti app. Il DTO separa sempre identità della risposta mostrata, attestazioni pertinenti e testo dell'eventuale risposta corrispondente. Per i testi app compositi non attribuibili mantiene la discordanza e le varianti consultabili, senza scegliere un segmento.

### C. File di implementazione e ownership

| File | Intervento previsto |
|---|---|
| `shared/negoziazione.ts` nuovo | Contratti degli ingressi, umori/esiti, provenienze, domanda/famiglia/variante, risposta, attestazione, valutazione e rapporto di copertura |
| `server/db/migrations/schemaNegoziazione.ts` nuovo | DDL delle sei tabelle e vincoli, chiamato dalla futura migrazione L8 dentro il suo perimetro transazionale |
| `server/db/migrations/importaNegoziazione.ts` nuovo | Preflight degli ingressi, conversione conservativa, scrittura operativa e fotografia/rapporto; nessuna connessione propria né migrazione lanciata durante lo sviluppo |
| `server/db/migrations/fontiNegoziazione.ts` nuovo | Lettura dei soli file pubblici versionati e adattamento tipizzato; nessun riferimento all'area privata recuperata |
| `server/services/negoziazioneService.ts` nuovo | Unico lettore per corpus, umori e valutazioni principali/alternative; rapporto readonly dalla fotografia e dai riferimenti operativi |
| `server/schemas/negoziazione.ts` nuovo | Parametri di umore/Ombra/ricerca con vocabolario esplicito; nessuna scelta di umore sconosciuto |
| `src/services/api/negoziazione.ts` nuovo | Client dei due endpoint dedicati, tipizzato sul contratto condiviso |
| `src/components/guida/RisposteNegoziazione.tsx` esistente | Consultazione per umore/Ombra, ricerca su tutto il corpus/varianti, identità React stabili, esiti immediati e fonti discordanti visibili |
| `src/components/guida/RapportoNegoziazione.tsx` nuovo | Consultazione readonly di copertura, rettifiche e discordanze senza esportazione automatica dei dati runtime |
| `src/utils/negoziazione.ts` esistente | Ricerca e presentazione sul nuovo contratto; rimozione della selezione del primo verdetto tramite `find` |
| `src/pages/BattagliaPage.tsx`, sola sezione negoziazione | Collegamento al corpus unico e parametri URL, senza toccare la sezione Ombre assegnata all'altro esecutore |
| `server/services/battagliaService.ts`, solo proiezione negoziazione | Le vecchie domande JSON non sono più restituite come catalogo operativo; note e sezioni generali rimangono, integrate con il lettore unico |
| `shared/types.ts`, solo tipi negoziazione | Sostituzione del vecchio contratto e import dei tipi condivisi; nessun cambiamento ai tipi Ombra senza coordinamento |

Integrazioni condivise da concordare prima dell'edit: `server/routes/compendio.ts`, descrizioni/registrazione OpenAPI, registrazione della migrazione L8, export dei client se richiesto dal barrel, `NOTICE`, pagina Ombra e suoi collegamenti. Il numero della migrazione non viene assunto dal nome degli helper: il coordinatore compone lo schema/import dopo aver verificato la sequenza effettiva. La modifica della personalità/negoziabilità delle Ombre appartiene al relativo esecutore; P3 consuma quel contratto senza dedurlo dai nomi Shadow del foglio.

### D. Ordine concreto della conversione e della consegna

1. Preparare gli ingressi pubblici e le rese mancanti; riesaminare copertura e attribuzioni prima di usarli come dati di migrazione. Conservare gli originali e distinguere rettifiche nuove.
2. Definire tipi e schema; riconoscere lo schema atteso. In presenza di tabelle omonime parziali/incompatibili interrompere prima delle scritture, senza DROP o riparazione automatica. Nessun helper si attiva importando il modulo.
3. Sulla connessione della futura migrazione, leggere la sola sezione runtime di negoziazione e costruire in memoria l'inventario completo. Abbinare al baseline soltanto righe la cui identità/contenuto è dimostrato; conservare autonomamente modifiche o righe nuove, con provenienza runtime e senza presumere che siano erronee.
4. Costruire tutte le chiavi di famiglia/variante/risposta/attestazione e la matrice delle corrispondenze prima degli INSERT. Verificare riferimenti, ordini e copertura di ogni posizione/cella, comprese assenze e multi-esito. Non usare i vecchi totali come sostituto della matrice.
5. Creare e popolare le tabelle nella transazione della migrazione; salvare fotografia e rapporto nella stessa transazione. Nessun contenuto runtime nei log o file pubblici. Conservare il precedente JSON guida come fonte storica e far cessare la sua lettura operativa delle domande tramite il servizio unico.
6. Integrare API, pagina Battaglia e pagina Ombra sullo stesso lettore. `umore`, `ombra`, ricerca e variante devono mantenere un'identità nella navigazione; il cambio Ombra aggiorna la selezione, senza dipendere soltanto dallo stato iniziale del componente.
7. Tre riesami statici propri: preservazione e roundtrip/import; semantica delle fonti e varianti; contratto/consumatori/layout. Typecheck, lint e build centralizzati; nessun test, migrazione locale o avvio di servizi da parte dell'esecutore P3. Riesame distinto end-to-end prima della consegna integrata.

La paginazione eventuale riguarda la presentazione, non la ricerca né la copertura del corpus. Le varianti necessarie per distinguere una risposta discordante sono visibili insieme alla domanda; non si nascondono dietro una scelta automatica. La vista principale richiede umore → domanda oppure ricerca diretta, senza aggiungere un passaggio obbligatorio per ottenere l'esito. Le informazioni di provenienza possono essere approfondite senza togliere l'avviso di discordanza immediato.
