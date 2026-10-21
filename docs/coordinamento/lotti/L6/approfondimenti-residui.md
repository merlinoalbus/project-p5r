# Approfondimenti dei residui L6

**21ottobre15:40Z — rettifica L26 conclusa nel perimetro della data:** `8d0a80bc`, pipeline73SUCCESS, p5s130/27. Audit130 `rettificata`; confronto RAW prima/dopo in memoria: sole due colonne `condizioni_json` e `seed_json`, nello snapshot18 solo data05-09→05-07. Quartiere e altri campi invariati. GET corrente/seed formula `esatta-05-07`, copertura leggibile3registri1280passi0pertinenti. Browser coordinatore e riscontro autonomo revisore: «dal7maggio», mentre resta «Non ancora nel mondo» per quartiere senza data. Gate finale distinto APPROVATO soltanto per questa rettifica; non certifica calendario visite libere, quartiere o L6 completo. Confronto dopo130: Diario255/54giorni, Kamoshida169, Madarame226,611pin/43mappe identici nei campi rilevati. Nessun test, migrazione locale o dati privati su git. Le note precedenti sotto sono cronologia.

**Aggiornamento 21ottobre,15:24Z:** il disegno L26 è implementato nella130, ancora da rilasciare. Manifest effettivo18proprietà del pubblico93 e RAW snapshot verificati autonomamente dal revisore; corrente live e fotografia coincidono, nuovi4campiNULL. Correzione09→07maggio nelle sole colonne necessarie (`condizioni_json` e/o `seed_json`), indipendenti: entrambe già07 senzaUPDATE, seedNULL preservato. Altri17valori dello snapshot e tutti gli altri campi della riga conservati; nessuna modifica a quartiere, Jose, cestino, eventi o Diario. Copertura cestino rafforzata su sequenze/tabelle/identità e riutilizzata sulDBiniettato nella stessa transazione; qualsiasi fotografia pertinente o struttura incerta impedisce la bonifica. Lettura reale prima del rilascio:3registri/1280passi,0errori e0latiL26. Esiti distinti nel rendiconto130. Tre riesami propri e typecheck32111/lint38823/build92466 exit0, gate codice/manifest/registro distinto approvato; nessun test o migrazione locale. Esito effettivo e confronto prima/dopo ancora necessari per chiudere L26. Le analisi originarie sotto restano la motivazione, non uno stato di implementazione corrente.

21 ottobre 2026. Analisi documentale e statica, senza implementazione, test o scritture DB. Le letture correnti sono attribuite alla Regia; questo documento conserva soltanto conclusioni, chiavi pubbliche e proposte. Non certifica l'intero lotto e non sostituisce la riconciliazione corrente.

## L26 — ingresso dei Memento

### Specifica e prova

- Originale `43ad8889`, `L6/modifiche.md`, §9 punto 6: i Memento restano senza una condizione finché non viene fornita la data dall'Esperto. La specifica non autorizza a dedurre l'accesso dal giorno in cui il giocatore termina Kamoshida.
- Originale `43ad8889`, `L6/requisiti.md`: R6-02 richiede un unico valutatore per partita/giorno; R6-03 riferimenti per chiave; R6-27 preservazione degli esiti dei Memento. Questi vincoli impongono di motivare la differenza, senza aggiungere prerequisiti non dimostrati.
- La [guida AGS dei Memento](https://www.allgamestaff.it/persona-5-royal-guida-ai-memento/) e la [pagina del Dedalo di Qimranut](https://www.allgamestaff.it/persona-5-royal/dedalo-di-qimranut/) descrivono il primo ingresso guidato il **7 maggio**. La seconda pagina distingue il requisito narrativo di Kamoshida, l'ingresso con Morgana e il successivo ritorno da cui diventano possibili le visite libere. Sono fonti redazionali basate sul percorso del gioco, non una lettura dei flag nativi.
- Il calendario delle occasioni in cui il giocatore può pianificare una visita libera è diverso dall'esistenza dell'ingresso. Il 7 maggio prova il primo accesso fisico; non prova che ogni fascia di ogni giorno successivo sia libera da vincoli del Diario.

### Stato corrente riferito dalla Regia

La lettura corrente sulla versione 122 conferma:

| Entità | Condizioni e contesto pertinenti |
| --- | --- |
| Quartiere `mementos` | Condizioni correnti e guida NULL; nessuna data o condizione di sblocco ereditata. Fonte pubblica: pagina delle Richieste nei Memento. |
| Luogo `mementos/ingresso-mementos` | Seed visibile, tipo trasporto, quartiere `mementos`, Area NULL; formula intera `[DATA(05-09)]`; sblocco narrativo «dopo il primo Palazzo (Kamoshida)». Orari e note assenti, nessuna restrizione di giorno. |
| Luogo `mementos/negozio-jose` | Stesso quartiere, formula propria `RICH(un-ex-piuttosto-appiccicoso)`; sblocco commerciale distinto dall'ingresso. |

Il ritardo di due giorni non deriva dal quartiere e non richiede modificare Jose. Nessun payload personale o fotografia del DB è incluso nel documento.

### Codice e conseguenze

- `server/services/sbloccoLuoghi.ts`, `condizioniDiSblocco`: presenza fisica = quartiere AND (condizioni proprie OR inviti). Una rettifica solo del luogo raggiunge i lettori della presenza senza una seconda data di quartiere da correggere.
- `shared/condizioniSpillo.ts`, `APERTURE_DEDALI`: l'evento `dedalo-qimranut-aperto` esiste già; non occorre inventarne uno.
- `server/services/apertureDedaliService.ts`: le aperture sono dichiarazioni delle visite del Diario; `eVisitaMemento` richiede il riferimento strutturato ai Memento, `eventiEffettivi` unisce i contributi delle spunte agli eventi registrati. Il fatto non viene dedotto dal calendario o da Kamoshida.
- `server/services/condizioni/valutatore.ts`, ramo `evento`: l'evento non segnato rende rossa una condizione ordinaria. Sostituire automaticamente la data del luogo con tale evento introdurrebbe quindi un obbligo di dichiarazione prima inesistente, anche dopo il primo accesso.
- `server/services/disponibilitaService.ts`, `statoAlGiorno`: l'anteprima cambia data e contesto temporale, mantenendo i fatti correnti della partita. L'evento non è una data storica ricostruita. La proposta non estende né modifica questo contratto.

### Soluzione concreta proposta al gate

**Correggere esclusivamente la data attestata del luogo, da 9 a 7 maggio.** Conservare l'apertura dichiarativa di Qimranut per i consumer che già la richiedono, senza trasformarla in un nuovo requisito dell'ingresso e senza segnarla automaticamente.

La successiva eventuale bonifica deve:

1. Verificare in transazione la chiave pubblica, origine seed, visibilità, tipo trasporto, quartiere, Area, formula intera `[DATA(05-09)]`, frase e fonte attestate; verificare il contesto ereditato ancora privo di sblocco. Nessun riconoscimento dal solo nome.
2. Cambiare soltanto `luogo.condizioni_json` in `[DATA(05-07)]`, accompagnando il rendiconto con la fonte della data. Non cambiare testo del Diario, progressi, inviti, eventi o Kamoshida; non toccare Jose.
3. Esaminare le fotografie ripristinabili del luogo e le relative righe del cestino prima di stabilire il payload della bonifica: una data corretta non deve essere annullata accidentalmente da un ripristino ordinario. Le fotografie personali non si riscrivono per supposizione. Snapshot non esposti nella lettura corrente: **prerequisito ancora da soddisfare**, non prova già acquisita.
4. Non ricreare il luogo se eliminato e non sovrascrivere formule personali o composte. Differenze di firma producono una proposta o conflitto motivato secondo il flusso di riconciliazione già in preparazione, non una seconda interpretazione automatica.
5. Rendicontare distintamente già corretto, rettificato, assente, personale e conflitto. Nessuna migrazione si può dire riuscita soltanto perché avanza la versione dello schema.

Controesempi statici da coprire nel riesame della futura implementazione: prima del 7 maggio resta chiuso; il 7 e l'8 non risultano più bloccati dalla data errata; dopo il 9 conserva lo stesso esito a parità degli altri dati. Kamoshida concluso anticipatamente non apre l'ingresso in aprile. Nessuna dichiarazione di Qimranut viene aggiunta o cancellata.

**Gate distinto: APPROVATO il disegno circoscritto**, dopo lettura diretta del revisore delle due fonti AGS. Il censimento delle fotografie/cestino e il manifest integrale restano prerequisiti del codice. Il gate non certifica la completezza di tutti i prerequisiti narrativi, né si estende al quartiere o a Jose. Non si propone una regola universale delle visite libere né si certificano tutte le finestre successive dei Memento. Nessuna modifica al prodotto in questo approfondimento.

### Proiezione delle fotografie L26

Il censimento corrente esclude intenzionalmente `seed_json`. Il servizio R6-31 riguarda inventario e decisioni; non viene esteso implicitamente a restituire fotografie. Si propone una lettura mirata `GET /api/condizioni/censimento/fotografie-ingresso-memento`, senza parametri di tabella, chiave o percorso: il server usa soltanto la chiave pubblica fissa `mementos/ingresso-mementos` e il contesto `mementos`.

**Contratto della risposta:** versione 1, versione schema letta, ambito L26 e i tre gruppi `corrente`, `seed`, `cestino`. Non restituisce righe raw, prosa, note, nomi personali, immagini, impronte, UID del cestino o dati di partita. La risposta e gli errori hanno `Cache-Control: no-store`; nessun contenuto nei log. Una transazione di sole letture assicura che tutti i gruppi descrivano lo stesso momento.

- `corrente`: presenza della riga e, per ciascun campo della firma già definita sopra, stato `coincide`, `diverso`, `assente`, `null` o `non-supportato`. La firma confronta la chiave, origine, visibilità, tipo, quartiere, Area, frase e fonte attestate, giorni, orari e note assenti, oltre al contesto del quartiere. Il valore diverso non è esposto. Non si presenta una sola coincidenza di data come firma integrale.
- `seed`: `stato` distingue colonna assente, SQL NULL, JSON malformato, radice non oggetto e oggetto valido. Per l'oggetto valido si riportano soltanto presenza e stato di confronto dei campi consentiti della firma; le proprietà sconosciute vengono contate, senza restituirne nomi o valori. La condizione distingue campo assente, NULL, formula esatta 9 maggio, formula esatta 7 maggio, altra formula valida, JSON malformato e formato non supportato. La formula esatta ammette soltanto l'array con il singolo nodo `data` e `dal` atteso, senza operandi o proprietà ulteriori; una formula personale composta resta altra. Nessuna normalizzazione della fotografia.
- `cestino`: vengono esaminati esclusivamente i registri `main.cestino`, mai `utente.cestino_partite`. L'identificazione passa dai passi strutturati `tabella = luogo` e dalla chiave della riga `prima` o `dopo`, anche se il record radice del cestino appartiene a un'altra entità. Non basta filtrare `cestino.tipo/chiave`, né cercare il nome nella stringa del registro. Per ogni lato pertinente si riportano operazione D/U/I, locatore ordinale effimero del registro e del passo, lato prima/dopo, firma e classificazione della condizione; l'eventuale `seed_json` annidato riceve la stessa proiezione minima. L'ordinale serve a distinguere più riscontri nella singola risposta, non diventa un'identità persistente o un token di scrittura.
- `copertura`: conteggi dei registri esaminati, passi pertinenti, lati pertinenti, radici illeggibili e strutture non riconoscibili. Una radice malformata o non supportata non equivale a «nessuna fotografia L26»: rende la copertura incerta e impedisce una bonifica automatica basata sull'assenza. Per le radici valide il server filtra i nodi prima di proiettarli; nessun registro intero arriva al client. La completezza significa assenza di righe omesse nella misura, non approvazione semantica dei dati.

`seed_json` creato da `aggiornaElemento` può non contenere la chiave: l'appartenenza della fotografia deriva dalla riga proprietaria identificata, e viene dichiarata come tale; non si inventa una chiave interna mancante. In `cestinoService.ripristinaDalCestino`, D reinserisce `prima`, U ripristina soltanto le colonne ancora uguali a `dopo`, I annulla l'inserimento: perciò il rapporto separa i lati e le operazioni. Un lato `dopo` che contiene la data errata non viene automaticamente classificato come futuro valore ripristinato.

La futura bonifica dovrà rileggere e verificare in transazione queste medesime condizioni: il rapporto informativo non autorizza a usare una fotografia diventata vecchia. Restano aperte la scelta puntuale sui registri personali e la preservazione dei conflitti del cestino. Questa proiezione non modifica né ripristina alcuna riga.

### Manifest della proiezione e provenienza dei confronti

Prima dell'implementazione del GET è stato letto in sola lettura il file **pubblico e tracciato** `pacchetto/gioco.db`, versione 93. Nessuna migrazione è stata eseguita e nessun database corrente è stato copiato. La Regia ha confermato che il censimento corrente di confronto risale alla versione 122 **prima del rilascio `61ccb6ef`**: non costituisce una lettura successiva a quel rilascio. Ogni campo della risposta indica quale delle due fonti ha fornito l'atteso.

| Ambito | Atteso attestato dal pacchetto pubblico 93 | Atteso soltanto dalla baseline Regia 122 |
| --- | --- | --- |
| Luogo | Chiave `mementos/ingresso-mementos`; origine `seed`; nascosto 0; tipo `trasporto`; quartiere `mementos`; sblocco «dopo il primo Palazzo (Kamoshida)»; fonte `https://www.allgamestaff.it/persona-5-royal/richieste-nei-memento/`; quando/giorni/note NULL; giorni_json `[]`; condizioni_json con il solo nodo data dal `05-09`. | area_chiave, orari_json e fonte_condizioni_json NULL. Queste colonne non esistevano nel pacchetto 93. |
| Quartiere | Chiave `mementos`; sblocco e sblocco_data NULL; medesima fonte pubblica. | condizioni_json, condizioni_guida_json, fonte_condizioni_json e fonte_condizioni_guida_json NULL. Queste colonne non esistevano nel pacchetto 93. |

Il nome non viene usato come criterio di riconoscimento. La fotografia seed **pubblica** è un oggetto parziale: conserva la chiave e la data del 9 maggio, ma non ha origine, nascosto, Area, orari o fonte_condizioni. Questa misura dimostra la necessità di distinguere i campi assenti; non prova la forma della fotografia corrente. Non si presume `origine = seed` all'interno di una fotografia che omette il campo.

Il revisore distinto ha approvato il manifest e il contratto prima del codice. Ha precisato che la chiave interna contraddittoria va segnalata anche quando la riga proprietaria è identificata, e che un lato necessario mancante o una chiave illeggibile nei passi del cestino rende la copertura incerta. Il confronto **non è una firma già approvata per mutazioni**.

Implementazione locale: `shared/fotografieIngressoMemento.ts`, `server/services/fotografieIngressoMementoService.ts`, GET fisso nelle rotte condizioni e relativa descrizione OpenAPI. Il servizio confronta esattamente i valori raw con il manifest, senza restituirli; separatamente riconosce la forma delle condizioni. La data esatta richiede un solo nodo con le sole due proprietà `tipo` e `dal`. «Altra formula supportata» significa soltanto che il riconoscitore esistente la comprende, non che il valore raw sia identico a una versione normalizzata. Il servizio non salva una normalizzazione.

Tre riesami propri: (1) proiezione e privacy — solo allowlist, nessun UID/nome/nota/raw nell'output, nessun accesso al cestino delle partite; (2) fotografie e controesempi — NULL atteso diverso dall'assente, chiave interna contraddittoria, proprietario assente, lati D/U/I e registri illeggibili; (3) integrazione — transazione di sole letture, nessun taglio, route fissa con no-store prima del servizio, descrizione API e DTO coerenti. **Gate distinto sul codice: APPROVATO STATICAMENTE**, dopo lettura completa del servizio, DTO, route e descrizione API; nessun blocker emerso nel perimetro. I controlli centrali restano alla Regia. Il GET non è stato eseguito dall'autore né dal revisore; la bonifica della data e la lettura delle fotografie correnti restano aperte.

## A10 — Guardiano e Boss della pesca

### Prove distinte e limite delle fonti

**Aggiornamento21/10, lettura browser riuscita:** la [pagina AGS specifica di Royal](https://www.allgamestaff.it/persona-5-royal/pesca-laghetto-ichigaya/) è ora leggibile nel browser ordinario, mentre il recupero web continua a fallire. Distingue l'esca speciale, la cattura precedente del Guardiano per il Boss e le differenze di fascia/meteo/gennaio. Rimane una tensione interna da risolvere: indica sia lanci pari a Perizia+2 sia settimo lancio con soglia4. Non se ne ricava una formula universale «Perizia4 basta». Il codice non registra ancora l'esito della cattura: un'attività svolta non lo prova. Questa lettura supera la precedente indisponibilità della pagina, non chiude A10 e non autorizza eventi o progressi presunti.

La frase censita per la chiave pubblica `sfida-pesca-guardiano-ichigaya` riunisce Guardiano, Perizia 4, cattura precedente e Boss con Perizia 5. La presenza di questa frase nel catalogo non prova che tutti i suoi dettagli siano regole universali di Royal. La specifica originale L6 richiede condizioni fedeli e progressi preservati; non autorizza a completare una meccanica non attestata con una soglia scelta dall'esecutore.

La [soluzione AGS di Royal, settimana 32](https://www.allgamestaff.it/persona-5-royal/soluzione-settimana-32/), nel tutorial della pesca, documenta il rapporto tra Perizia e numero di lanci disponibili per visita. Distingue inoltre attrezzatura, cattura e punti premio. Quella sezione non dimostra che i ranghi 4 e 5 siano da soli condizioni necessarie e sufficienti dei due pesci. La pagina specifica AGS sulla pesca non è stata leggibile con il recupero web: non viene citata come prova acquisita.

La [guida Royal di Lukaight](https://gamefaqs.gamespot.com/pc/370658-persona-5-royal/faqs/82271/guide), nella giornata del 26 gennaio, descrive il Kingpin al primo tentativo e un'esca dedicata. È un percorso concreto, non una tabella completa dei prerequisiti; l'autore segnala esplicitamente un dubbio sulla compresenza del Guardiano nella stessa visita. Non se ne deduce una formula generale. Le indicazioni di wiki e discussioni su ranghi, maltempo e cattura precedente rimangono piste da verificare, non sostituiscono la prova della meccanica Royal.

### Difformità statica accertata

`shared/migraCondizioni.ts`, ramo `guardiano: perizia rango …; boss: …`, restituisce soltanto `DOTE(perizia, primo rango)`. `converti` accetta quel risultato per la frase intera prima di separarla; la seconda clausola non appare nemmeno negli scarti. Quindi un criterio parziale viene presentato come conversione completa. Il difetto è dimostrabile senza eseguire il convertitore e senza affermare che la riga corrente abbia già quella formula.

`shared/attivita.ts` distingue il conteggio delle attività svolte dalle sessioni dei videogiochi; una sfida ricade nel primo. `server/services/attivitaService.ts`, `attivitaConTurni` e `volteSvolte`, conta le esecuzioni tramite `attivita_svolta_partita`. Non registra quale pesce sia stato catturato né distingue un tentativo fallito da una cattura. Perciò `ATTIVITA(almeno 1)` non può essere usata come prova di «Guardiano catturato» e i conteggi esistenti non possono essere trasferiti a un nuovo successo.

### Proposta circoscritta sottoposta al gate

1. Per gli ingressi futuri del convertitore, riconoscere la frase composita come **non completamente convertibile** prima della separazione; conservare la frase intera tra gli scarti motivati. La sola rimozione del ramo speciale non basta: la separazione potrebbe recuperare le due soglie e unirle erroneamente in AND.
2. Non trasformare gli scarti in una formula vuota dichiarata completa. Il chiamante deve esporre la necessità di riconciliazione attraverso il flusso già previsto, mantenendo la fonte e distinguendo apertura dell'attività, possibilità di incontrare un pesce e cattura effettiva. I percorsi vivi di creazione e ripristino in `catalogoService.ts` usano `migraTestiCondizioni`, che restituisce soltanto le condizioni e perde gli scarti: una correzione del solo helper sarebbe insufficiente. Il futuro piano eseguibile deve includere entrambi i chiamanti, con esito incompleto esplicito; non riapplicare le migrazioni storiche 036/052/064/070 che usavano il convertitore.
3. Prima di bonificare la riga corrente, acquisire formula, fonte, tracciamento e fotografie pertinenti; distinguere conversione seed dimostrata da modifica personale. Nessuna rimozione automatica di condizioni personali, ricreazione o ripartizione dei turni già segnati.
4. La soluzione completa della pesca richiede ancora attestazione dei requisiti Royal dei due pesci e un gesto esplicito per registrare la cattura, se il fatto è realmente necessario. Non creare adesso eventi, contatori di successo o due attività sostitutive. Non assumere né che i ranghi 4/5 siano falsi né che costituiscano l'intera regola.

Controesempi da preservare: una visita senza cattura non sblocca automaticamente il Boss; la soglia 4 da sola non certifica la disponibilità di entrambe le sfide; una frase non compresa resta visibile nella riconciliazione; i progressi della vecchia attività non diventano successi di una nuova. Questa proposta corregge la perdita silenziosa di informazione, **non chiude A10**. Nessuna modifica al prodotto eseguita.

### Contratto concreto dei chiamanti — proposta al gate, non implementata

Il revisore ha approvato il confine del disegno e confermato il difetto del parser; ha richiesto di definire l'esito dei chiamanti vivi. Si sceglie **rifiuto atomico motivato**, senza nuovo registro nascosto di conversioni. L'errore HTTP proposto è `409 condizioni-da-definire`; porta operazione, campi interessati e motivi classificati, mai il testo completo della fonte nei log. Il messaggio spiega che non è stato salvato o ripristinato nulla e che occorrono condizioni strutturate deliberate. Non viene invocata di nuovo una migrazione storica.

| Ingresso | Creazione | Ripristino della fotografia |
| --- | --- | --- |
| Formula strutturata valida, anche array vuoto | Si usa la formula esplicitamente inviata e validata; non si rigenera dalla prosa. | Si conserva la formula della fotografia secondo il normale ripristino; l'esistenza di un array storico non prova da sola chi lo abbia scelto. A10 resta una voce di ricerca. |
| Campo assente | Si tenta la conversione completa della prosa; se esistono scarti, 409 prima di INSERT e creazione dell'identità collegata. | Fotografia storica senza campo: conversione completa o 409 prima di qualsiasi UPDATE. |
| SQL NULL storico | Non diventa una scelta «nessuna condizione». Lo schema HTTP della creazione accetta array o campo omesso, non NULL; un eventuale chiamante interno con NULL va trattato come formula assente, non come bypass. | Come campo assente: si tenta una conversione completa, senza trasformare lo storico NULL in `[]` se la frase non è compresa. |
| Formula malformata/non supportata | Errore di validazione, nessuna conversione sostitutiva silenziosa. | 409, nessun ripristino parziale e fotografia conservata integralmente. |
| Prosa assente/vuota o interamente riconosciuta come non restrittiva | Conversione completa secondo il contratto già esistente; può produrre `[]`, con origine dell'esito distinta da una scelta esplicita. | Stesso criterio; non confondere frase non interpretata con assenza di frase. |

**Creazione:** `creaElemento` deve usare `convertiProsa` quando manca una formula deliberata, verificarne `scartate` e le chiavi delle condizioni prima dell'INSERT. Calcolo della chiave, controlli dei riferimenti e scrittura con `assicuraIdentitaLettura` devono condividere la transazione: nessuna identità orfana in caso di errore. Il conflitto lascia la bozza nel modulo; la chiamata non crea una riga da riconciliare perché non è stata accettata alcuna scrittura. L'utente può correggere la formula o il testo nella bozza e salvare nuovamente; non viene proposto automaticamente `[]` come soluzione.

**Distinzione necessaria nel modulo:** `ModuloCatalogo.tsx` oggi inizializza le condizioni mancanti con `[]` e le invia sempre. Questo non prova una scelta esplicita. Per le nuove righe, la futura implementazione deve omettere il campo finché l'utente non modifica l'editor delle condizioni oppure sceglie esplicitamente «Nessuna condizione propria». Una formula inserita e poi svuotata costituisce una scelta deliberata. Le normali modifiche di righe esistenti non rientrano in questa modifica del contratto. Non introdurre un nuovo flag persistente né trasformare silenziosamente una bozza non toccata in una decisione.

**Ripristino:** leggere riga e `seed_json`, convertire se necessario e validare dentro la transazione del ripristino, prima di qualsiasi mutazione. Quando la frase è incompleta, conservare riga corrente, snapshot raw, origine, visibilità, collegamenti e progressi; non azzerare `seed_json`, non invalidare cache come se fosse avvenuta una scrittura e non notificare successo. Il modulo già mostra l'errore e rimane aperto. La correzione manuale resta un'azione distinta: modificare la formula corrente non rende automaticamente completa la vecchia fotografia e non autorizza un ripristino parziale nascosto. Anche `eliminaElemento`, che per alcune righe corrette delega a `ripristinaElemento`, deve propagare lo stesso conflitto senza eliminare nulla.

**Perimetro futuro completo:** parser, `creaElemento`, `ripristinaElemento` e chiamante DELETE delegante; schema/descrizioni API degli errori; `ModuloCatalogo` per distinguere la scelta della formula e mantenere la bozza. La pagina di riconciliazione R6-31 continua a mostrare A10 come ricerca e non riceve una falsa decisione di conferma dal fallimento del salvataggio. Non sono richiesti nuovi eventi di cattura, modifiche ai turni o una tabella di conversioni. Restano da approvare il codice futuro e la soluzione fattuale completa della pesca.

## Altri sottoblocchi assegnati

### Consegna locale successiva al recupero di p5s

A10: codice del contratto di rifiuto atomico implementato e approvato staticamente dal revisore distinto dopo tre correzioni: messaggio di ripristino distinto dalla modifica corrente, errore persistente anche per ripristino/DELETE delegante e JSONnull storico distinto da SQLNULL. Parser, transazioni, scelta esplicita nel modulo e OpenAPI riesaminati. Non è una bonifica della formula corrente della pesca né prova delle sue regole nel gioco.

GET L26: servizio/DTO/route/OpenAPI approvati staticamente, con manifest pubblico93 e baseline122 pre61 distinti. La proiezione preserva NULL/assente/parziale e copertura incerta senza esporre valori privati. Il codice non modifica la data dell'ingresso. Controlli integrati e osservazione dopo rilascio al coordinatore; nessun test o gesto di scrittura eseguito per questi due interventi.

- **N14 — negozio del Palazzo di Niijima:** ancora da approfondire; distinguere le lobby e la loro progressione dalla finestra generale del Palazzo.
- **I71 — Aojiru:** ancora da approfondire; il pin 1486 del chiosco dei succhi è distinto dal 1487 KiyasuKu. Non spostare listini o acquisti per somiglianza nominale. La rotazione deve essere confrontata con gli acquisti effettivi, senza trasformare le date di un percorso esemplificativo in calendario assoluto.
