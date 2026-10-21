# L8 — piano operativo sottoposto a revisione

Stato: **piano tecnico riesaminato, non implementato**. Il revisore distinto ha approvato P1–P3/P6 nel perimetro documentato; P4 favorevole nel modello, con gate sul DDL di ricostruzione ancora necessario; P5 conservativo nel disegno, con conversioni e raccordi cartografici ancora da risolvere e approvare. Non è approvazione di completamento/rilascio L8 e non supera l'ordine dell'utente: prima vanno completati gli inventari correnti L5/L6. Preparato il 21 ottobre 2026 sul codice `e0ea995e` di `newreview`; questa attività ha scritto soltanto piano e [censimento pubblico Iweleth](censimento-iweleth-pubblico.md). Nessun codice L8, migrazione, test o scrittura DB.

## 1. Autorità, fonti e limiti

- Specifica originale: `requisiti.md`, `modifiche.md`, `piano.md`, `app.md`, `dati.md`, `funzionali.md`, `noreg.md`, `ux.md` di L8 a `43ad8889`; piano generale a `3ff21b4a`. Letti anche G-019, G-021 e allegato, G-025 e JSON, G-026/G-035 nel registro e decisioni successive.
- Il mandato corrente richiede di completare il lotto, senza restringerlo. Le vecchie prescrizioni di test, partite di prova, tester e collaudo sono superate dal divieto esplicito: **zero test**. Restano typecheck, lint, build e riesame avversariale distinto su fonti originali. Le prove funzionali spettano all'utente.
- `decisioni-pm.md:84` assegna E1/E6/E8 della revisione dell'indice a L11; non elimina R8-16…19. La confluenza dei contenuti/stati di Iweleth è L8; il riassetto generale dell'indice resta L11.
- R8-21 è già assegnato a L10 da `modifiche.md` §8.6: non è un rinvio nuovo. Nessun altro requisito viene spostato.
- Il censimento allegato usa esclusivamente `pacchetto/gioco.db` già tracciato, schema 93. **Non è lo stato di p5s**, non è una fonte da importare sopra i dati dell'utente. Schema corrente, righe nuove/modificate/eliminate e stati si censiscono durante la futura migrazione sulla sua connessione, senza pubblicarne i contenuti personali.
- Le letture statiche non certificano runtime, layout o conservazione effettiva dei dati dopo una migrazione non eseguita.

## 2. Discordanze da risolvere nel disegno

| Fonte | Riscontro | Risoluzione proposta |
|---|---|---|
| R8-02/12: 44 voci dei Palazzi; `dati.md` §1–2: 41, di cui 38 abbinate | Sono basi diverse; il pacchetto pubblico precede le modifiche dell'utente | Censire tutte le righe runtime, non imporre 44/41/38 come soglia né ricreare le voci eliminate |
| M §1.4/§6: 53 esiti solo P5; G-021/neg-diff: 51 | Il nuovo contratto ricostruisce 53 celle Royal vuote con 55 attestazioni app; unità diverse dai totali del resoconto | Riconciliare per identità sorgente e unità; né 51 né 53 è un traguardo da forzare |
| M §1.2: 88 skill/tratti | G-025 JSON e `dati.md` §7: 175 skill + 18 tratti distinti; tutti i 193 nomi trovati nel pacchetto pubblico | Risolvere ciascun nome canonico, arresto motivato se manca; nessuna skill vuota |
| M §1.2 `forma_di` punta alla prima forma; R8-20b richiede Ervardo da Loki | Radice della catena e derivazione non sono lo stesso dato | `forma_di INTEGER` per la radice e `deriva_da INTEGER` per il predecessore effettivo; Ervardo ha radice Robin Hood e deriva da Loki |
| M §1.1 PK di `ombra_luogo` contiene colonne nullable | Una PK composita SQLite con NULL non impedisce tutti i duplicati | Identità propria del legame, CHECK dei riferimenti e indici univoci parziali per sede generica, area fisica e area del dedalo |
| M §1.4 PK verdetto `(risposta,umore,fonte)` | Due attestazioni contraddittorie della medesima fonte colliderebbero | Identità dell'attestazione con versione/riga/cella; conservare entrambe |
| R8-16/17/19: confluenza/conversione/risoluzione; M §3 e F8-21: archivio ed elenco | L'archivio non realizza da solo la confluenza o le conversioni | Mapping allegato, proposta concreta e approvazione delle sole ambiguità; non segnare questi requisiti completi con il solo archivio |
| N8-8 parla di convertire quattro stati; M §2/F8-29 li attribuisce a due eventi di Kamoshida | Quelle voci non sono catture | Non convertirle; eventuali altre catture runtime si trattano singolarmente, preservando registrazioni già presenti |
| N8-7 pretende le stesse debolezze; R8-08/10 impone quelle del Compendio | Le copie divergenti devono cambiare resa | Invariante è la fonte canonica e la tutela dei dati, non la riproduzione dell'errore visibile |
| Vecchia UI Memento 84 px e fila mobile orizzontale | R8-30 impone almeno 88 px e nessuno scorrimento orizzontale | Stesso componente/aspetto e gesto, griglia adattiva comune anche ai Memento; nessun cambiamento ai loro dati/stati |

## 3. Sequenza e gate

P0 prepara gli input e gli elenchi; P1 definisce schema/contratti; P2–P5 dipendono da P1; P6 integra tutte le viste; P7 chiude. Ogni passo ha tre riesami propri (logica e casi limite; consumatori e compatibilità; omissioni e regressioni) e il revisore distinto accede alle fonti originali. Nessuna implementazione prima del gate di questo piano. La chiusura avviene solo dopo risoluzione dei rilievi e copertura requisito per requisito. I numeri delle migrazioni si assegnano all'integrazione: **123 è ipotetico, non riservato**.

### P0 — input completi, provenienza e decisioni concrete

Requisiti: R8-02,03b,04,07b,07e,17,19,23,24,25.

- Preparare dati di migrazione versionati da `server/db/dati/negoziazione-domande.json`, G-021 e G-025. I JSON recuperati `neg-mappa.json`/`neg-diff.json` sono input primari; il foglio Royal integra la matrice che quei JSON non contengono per intero. In git soltanto dati della fonte pubblica e attribuzioni, nessun percorso privato o dump d'istanza.
- Negoziazione: sorgente app 230 domande/691 risposte/642 verdetti, 7 incerti; mappa recuperata 230 associazioni, 219 indici Royal distinti e una domanda senza corrispondenza; 58 righe Royal non abbinate comprendono le 49 nuove e le 9 varianti/duplicati descritti da G-021. Conservare gli indici originali, non deduplicare solo per testo.
- Letto e integrato il [contratto di negoziazione](contratto-negoziazione.md) del collega: R18/R17 hanno risposte differenti, R266/R106 esiti discordi; R125/R126 condividono il testo ma non le risposte. A101 comprende R196/R216 e A218 R102/R103. Il diff numerico non esaurisce l'evidenza: manca A19/Cupa già descritto nell'allegato G-021. Il contratto distingue 87 celle discordanti, 957 celle mancanti sulle risposte abbinate e le unità dei vecchi 86/979: copertura da inventario, non dal solo totale. Ogni variante conserva le proprie attestazioni; «non aggiungere una domanda doppia» non autorizza a scartarle.
- Foglio Royal letto: 277 domande, 1.714 celle con esito singolo, 1.606 `-`, quattro celle ambigue (`GOOD / OK?`, due `GOOD / OK`, `OK/BAD?`). Trattare `-` come assenza di attestazione, le quattro ambigue come alternative incerte con testo originale. Non produrre un esito neutro di default. La copertura richiesta è quella documentata da G-021, non un'inventata matrice completa dove la fonte tace.
- Conservare anche domanda, risposta, verdetto e nota runtime preesistenti; le migrazioni 083/084 hanno già compresso le contraddizioni, dunque il solo JSON runtime non basta a ricostruire il patrimonio originale. Gli input runtime privati rimangono nel DB.
- Censire ogni riga sorgente e ogni risultato, con stati collegato, variante conservata, non abbinato, fonte invalida, decisione necessaria. Non considerare una riga multi-contenuto coperta perché ne è stato collegato un elemento. Riutilizzare il principio del rapporto L7 senza modificarne la fotografia storica.
- Iweleth: allegato pubblico con 47 voci, 26 mappe e corrispondenze. Prima della scrittura confrontare le impronte/campi delle singole righe effettive; un nome uguale non autorizza a sovrascrivere una voce editata. Costruire elenco dei delta runtime nella sola app.

### P1 — modello unico e contratti

Requisiti: R8-01,02,03,03b,04,05,08,08b,09,10,20c.

File nuovi: `shared/elementi.ts`, `shared/maschere.ts`, `server/services/ombreService.ts`, `server/schemas/ombre.ts`; integrazione in `shared/types.ts`, `server/routes/compendio.ts`, schemi OpenAPI, `server/services/cestinoService.ts`, import/export e snapshot pertinenti.

- `ombra`: chiave stabile, nome canonico italiano, alias cercabili, riferimento nullable alla Persona canonica, personalità valida/sconosciuta, differenze di affinità, note/fonti/origine/seed. Abbinamento, catturabilità e negoziabilità sono tre dati distinti: `persona_id=NULL` da solo non significa non reclutabile e un riferimento presente non autorizza la cattura. La maschera descrittiva Mara resta conservata nella fonte della sua Ombra non reclutabile; non crea un gesto di cattura né cambia la Persona Mara.
- Babau/Bugs mantiene il riferimento alla Persona e le differenze di affinità documentate, ma non è catturabile neppure negli incontri normali. Il Compendio e la fusione continuano a poterlo registrare; l'incontro non espone il gesto di cattura. Non diventa una sesta riga con FK NULL. Fonte: [Allgamestaff, settimana 40, nota della tabella Ombre](https://www.allgamestaff.it/persona-5-royal/soluzione-settimana-40/).
- La negoziabilità è un dato distinto da personalità, affinità e reclutabilità: Demoni del Tesoro con personalità e Ombre Sciagura non ricevono automaticamente il normale percorso di negoziazione. Per queste ultime il combattimento rigenerabile resta distinto dalla registrazione della Persona.
- Abbinamento per chiave quando già disponibile; altrimenti indice normalizzato a insiemi, con alias approvati. Se più candidati rimangono non scegliere l'ultimo. L'identità distingue varianti di incontro e reclutabilità; non fondere il boss di una Richiesta con un'Ombra catturabile solo perché condivide nome/maschera.
- `punto_interesse.ombra_chiave`, riferimenti alle righe Battaglia e alle singole righe delle tabelle annidate (Kamoshida compreso se presenti). Conservare testi, ordine e JSON originali, ma i lettori canonici non leggono più copie del nome/affinità. Nessuna tabella Kamoshida eliminata dall'utente viene ricreata dal pacchetto.
- Incontri dei Palazzi per chiave di area fisica, con collegamento all'infiltrazione fonte; le molte aree toccate da un'infiltrazione non equivalgono automaticamente a luoghi esatti di ogni nemico. Se la fonte dice soltanto il Palazzo, mantenere quella precisione e dichiararla.
- Nei dedali `persona_area_dedalo` resta la relazione operativa, letta attraverso una vista verso Ombra. Il dato storico «tutte le aree perché il piano non è noto» conserva questa precisione dichiarata: non diventa nuova certezza. Aggiornamenti/cancellazione/ripristino attraversano la stessa relazione.
- Affinità canoniche dal Compendio e differenze soltanto per Take-Minakata, Mithras, Bugs, Power; cinque non reclutabili con fonte propria. Distinguere elemento neutro esplicito da valore assente. Correggere le due associazioni Kaneshiro tramite identità e provenienza, non sostituzione globale di stringhe.
- Le 13 etichette degli elementi si aggiornano soltanto quando coincidono con le rese seed note; rese personali divergenti in elenco. Nessuna sostituzione nei testi liberi di Madarame. La modifica delle affinità nella pagina Persona richiesta da R8-10 comprende endpoint/editor se assenti, validazione di elementi/codici e invalidazione delle letture, non soltanto una query del nuovo servizio.
- CRUD Ombra, ripristino seed e cestino: rimozione scollega le fonti senza eliminarle; il registro permette di ripristinare i legami salvo conflitti successivi dichiarati. Vecchi snapshot senza colonne nuove non azzerano i legami correnti. Tutte le mutazioni atomiche e con controllo delle FK.

### P2 — una registrazione, tutti i consumatori

Requisiti: R8-11,12,13,14,15,15b,23,26.

File: `catturePersona.ts`, `partiteService.ts`, `operazioniVellutoService.ts`, `dungeonService.ts`, `disponibilitaService.ts`, `condizioni/valutatore.ts`, `mappe/statiGuida.ts`, `mappe/collegamentiGuida.ts`, `mappe/mappeService.ts`, schemi/API partite, componenti di cattura.

- `registraPersona(partita,id,{istantanea?})`: senza istantanea inserisce solo se necessario e non modifica livello/bonus/skill/tratto/carica esistenti; con istantanea valida sostituisce l'istantanea completa. Eventi scritti una volta, nella stessa transazione. Togliere la registrazione conserva la conferma esplicita della perdita.
- Instradare Compendio personale, dedali, Palazzi, Battaglia, aggiunta scorta, registrazione scorta e risultato fusione. Gli endpoint rifiutano Persona del gruppo come esemplari di Joker.
- Il gesto proveniente da un incontro controlla anche la catturabilità dell'Ombra; la sola FK alla Persona non basta. Il controllo non vieta la registrazione autonoma dal Compendio o della Persona ottenuta per fusione: il caso Babau/Bugs deve attraversare questi percorsi distinti senza essere catturabile dall'incontro.
- Oggi `partiteService.ts:503–505` azzera il livello sul conflitto; `catturePersona.ts:21–43` riconosce solo i Memento. Separare «voce catturabile da Compendio» da «Persona dei Memento non collegabile a pin»: il secondo divieto non si estende ai Palazzi.
- Le condizioni che citano una voce catturabile leggono il Compendio; le due voci narrative di Kamoshida conservano i propri stati. Anche disponibilità e avanzamento usano la distinzione. Le catture non entrano nel completamento.
- Migrazione delle partite soltanto per catture storiche effettive identificate e autorizzate: inserimento se assenti, nessuna sovrascrittura e nessun evento fittizio di nuova cattura. Non cancellare uno stato ambiguo o irrisolto. Censire separatamente gli stati fuori dal vecchio campione.
- Raggiungibilità incontri: applicare lo stato concluso L4 ai Palazzi, mai a Iweleth; mostrare tutte le alternative note. «Solo per fusione» soltanto con Persona fondibile e nessun altro incontro disponibile, senza promettere una cattura quando la collocazione è ignota.

### P3 — negoziazione per personalità, senza perdite

Requisiti: R8-04,07a,07b,07c,07d,07e,07f.

File nuovi: servizio/schema negoziazione e dati Royal normalizzati con attribuzione; aggiornamenti `battagliaService.ts`, DTO/route/OpenAPI, `RisposteNegoziazione.tsx`, `src/utils/negoziazione.ts`, `BattagliaPage.tsx` e Ombra.

- Domande e risposte hanno chiavi canoniche e varianti testuali ricercabili, con `testo_origine` e origine della resa italiana (`resa-app`, `resa-esperto`, testo verificato quando lo è). Mappa app→Royal esplicita; le varianti G-021 sono relazioni, non cancellazioni.
- Ogni attestazione conserva fonte/versione/coordinate, umore, esito e incertezza. Un verdetto principale Royal non cancella l'altra fonte; contraddizioni della stessa fonte restano entrambe. Non usare il vecchio criterio «nel dubbio il peggiore» né `.find()` per nascondere attestazioni.
- Carte dei quattro umori e personalità delle Ombre da G-021, con collegamenti bidirezionali. Per personalità sconosciuta non preselezionare un umore arbitrario.
- G-021 R230 contiene due risposte `[…]`, presenti così anche nel workbook completo verificato dal collega: conservare la posizione e il grezzo, dichiarare testo non disponibile; non inventare una risposta né rendere le parentesi come testo del gioco. Le carte conservano la tracciatura: «In realtà sono un ragazzino» è passabile per Timida e le due vecchie risposte Irritabile non sono verificate per quell'umore. Le sostituzioni suggerite da G-021 sono rese dichiarate, non citazioni italiane certificate del gioco.
- Endpoint `negoziazione/verifica` con copertura per fonte/umore e riconciliazione puntuale dei 49/86/979/52/24, distinguendo conteggi storici da eventuali righe runtime ulteriori. Nessun limite di risultati semanticamente esclusivo; eventuale caricamento progressivo deve permettere la ricerca nell'intero corpus.
- UI: prima umore o Ombra, poi ricerca; selezione riflessa nei parametri URL, aggiornata cambiando Ombra. Esiti principali immediati e alternative visibili; chiavi React da identità, non testo. Mancanza della fonte dichiarata senza affermare che nessuno l'abbia mai documentata.

### P4 — le 27 forme del gruppo

Requisiti: R8-20,20b,20c,26.

File: dati G-025 con NOTICE, migrazione dedicata, `compendioService.ts`, `fusione/{motoreFusione,fusioneService,eredita}.ts`, `obiettiviService.ts`, `operazioniVellutoService.ts`, `partiteService.ts`, `squadraService.ts`, DTO/schemi, `CompendioPage`, `PersonaDettaglioPage`, `PersonaggiPage`, `PersonaDelPersonaggio` e selettori.

- 27 righe nuove, nove catene, legami dei personaggi per chiave; Joker collega Arsène/Satanael già esistenti e ancora fondibili. Identità dedicata `chiave_forma` univoca per membro/forma, distinta dal nome canonico. Preflight completo prima degli INSERT: nomi/arcani/skill/tratti/affinità e collisioni; nessun dato vuoto sostitutivo. Nel pacchetto 93 non vi è Loki e nessuno dei 27 nomi collide, ma questa assenza non è estesa al runtime: un eventuale Loki fondibile non viene adottato o marcato del gruppo per nome. Una chiave di forma già occupata da dati diversi ferma la preparazione prima delle scritture, come prescrive M §1.2.
- Adeguamento di schema necessario da approvare nel gate: oggi `persona.nome` è UNIQUE e `oggetto`/`oggetto_allarme` sono NOT NULL. Per non inventare oggetti di esecuzione del gruppo, quei due campi devono poter essere NULL solo per `del_party=1`; le Persona ordinarie conservano il vincolo. L'unicità del nome ordinario diventa un indice parziale per `del_party=0`, le forme sono univoche per `chiave_forma` e membro/numero. Così un nome omonimo del gruppo non richiede di rinominare o adottare una Persona fondibile. SQLite richiede una ricostruzione controllata della tabella per cambiare quei vincoli: evoluzione conservativa, **non descriverla come sole aggiunte di colonne**. Copia esplicita di tutte le colonne, ID invariati, ripristino di indici/vincoli, controllo dei riferimenti entranti prima e dopo, nessun DELETE delle dipendenze né `INSERT OR REPLACE`. Il disegno esatto della ricostruzione deve passare il revisore prima dell'implementazione.
- Procedura proposta della ricostruzione: acquisire SQL della tabella, elenco colonne, indici e **trigger** da `sqlite_master`; verificare puntualmente il vecchio schema e ogni trasformazione DDL ammessa, altrimenti interrompere prima di scrivere. Creare la nuova tabella con tutte le colonne esistenti e le aggiunte, copiare tutte le righe con colonne nominate, verificare uguaglianza delle colonne preesistenti e conteggi, sostituire la tabella e ricreare indici/trigger con SQL conservato (salvo l'indice del nome sostituito dal vincolo esplicito). Il precedente 044 conserva gli indici ma non basta per i trigger: non copiarlo alla cieca. Il runner attuale (`migrationRunner.ts:44–66`) disattiva le FK fuori dalla transazione, confronta `foreign_key_check` prima/dopo al suo interno e ripristina le FK in `finally`; usare quel perimetro, preservando e ripristinando anche l'eventuale impostazione `legacy_alter_table`. Nessuna cascata sulle tabelle dipendenti, nessun ricalcolo dei valori preesistenti. Verificare anche i riferimenti logici delle partite, che SQLite non controlla fra due file.
- Ogni ricerca di Persona per nome nei consumatori operativi va limitata alle Persona ordinarie o sostituita dall'ID; i personaggi usano `chiave_forma`. Anche le immagini del gruppo usano identità/asset del gruppo prima dell'eventuale omonimo del Compendio. Non si risolve la collisione soltanto nella migrazione lasciando ambigui i lettori.
- Radice e predecessore come §2. Conservare i numeri iniziali documentati con provenienza; per forme successive le colonne compatibili ripetono i valori iniziali come M §1.2, ma il DTO distingue livello/statistiche ereditati da valori propri e non li presenta come statistiche della trasformazione. Loki conserva il suo livello iniziale 75 e la fonte Loki per Ervardo.
- Skill con `modo` e eventuale requisito di rango/forma separato dal livello: le skill senza livello non si trasformano in apprendimenti a livello 0. Lettori delle skill, ordinamento e scheda spiegano come si imparano. Affinità della terza forma come seconda con la nota della fonte, non come nuova misura.
- Anche `persona_skill.livello` è oggi NOT NULL: renderlo nullable con CHECK coerente col modo (`livello`/`iniziale` richiedono il numero; `risveglio`/`rango`/`terza-forma` richiedono NULL). Ricostruzione mirata con le stesse cautele della tabella Persona; valori e legami ordinari preesistenti immutati. Censimento del JSON pubblico G-025: nessuna skill ripetuta dentro la stessa forma; 45 righe senza livello (18 risveglio, 18 rango, 9 terza forma). La PK `(persona_id,skill_id)` copre quindi questa fonte senza perdita; una futura fonte con più modalità per la stessa coppia deve fermare il preflight, non essere sovrascritta. Mappare i nomi del modo dalla fonte a un enum esplicito, non usare un numero zero fittizio.
- Condizioni L6: rango/date G-025, scelte di Ervardo come avviso non bloccante; certezze medie restano esplicite. Non inventare nuovi interruttori manuali.
- Helper unico per Persona utilizzabili da Joker/fondibili applicato ai motori, ingredienti/risultati, suggerimenti skill, alberi/cicli, obiettivi, conteggi/sconti del Compendio, Isolamento e Stanza di Velluto. Guardie BE anche su ID passati direttamente. Schede e filtri mostrano invece il gruppo, senza azioni incompatibili.
- Oggi il motore legge tutte le Persona (`motoreFusione.ts:73`), il denominatore conta tutte le non-DLC (`fusioneService.ts:44`) e i suggerimenti skill leggono anche futuri membri del gruppo (`:256–258`): coprire ciascun percorso, non solo il filtro FE.

### P5 — confluenza Iweleth

Requisiti: R8-16,17,18,19,19b,22. Dipende da P1/P2 e dalle risoluzioni I1–I3 del censimento.

- Il [censimento](censimento-iweleth-pubblico.md) enumera ogni voce e mappa pubblica. Destinazioni proposte verso le chiavi di `area_dedalo` già prodotte da 099/101, senza eseguire quelle migrazioni nel censimento. Nella migrazione futura verificare che appartengano davvero al dedalo e non siano state riorganizzate dall'utente.
- Trasferire le voci non-Persona alle aree del dedalo conservandone le chiavi, contenuti L7, descrizioni, ordine relativo e stati; tipo `storia` per le proposte narrative approvate. Non confondere un miniboss con la cattura della sua Persona.
- Le nove copie Persona diventano riferimenti alla stessa Ombra/Persona e alla voce canonica del dedalo, con note proprie conservate. La UI mostra una cattura per Persona, le vecchie URL risolvono; nessun secondo stato. Conservare la provenienza e gli ID delle fonti, non duplicare in un'altra tabella modificabile il rapporto di incontro.
- Le righe tecniche `dungeon`/`dungeon_area` necessarie alle FK e ai pin restano; un raccordo esplicito area storica→area del dedalo risolve i vecchi riferimenti. Le mappe si consultano dal dedalo come archivio in sola lettura: non diventano un secondo percorso operativo del Palazzo. Conservare pin, UID, coordinate, condizioni, immagini e collegamenti delle voci; nessuna cancellazione a cascata per liberare una FK.
- Conservare la classificazione tecnica di Iweleth con `regola_boss='memento'` finché i lettori la richiedono. Oggi cambiare semplicemente `dungeon.tipo` in `mementos` farebbe entrare `palazziService.ts:177–185` senza `senzaEffetti`, mentre il ramo Iweleth `:186–203` lo imposta: il boss segnato potrebbe allora riattivare effetti di Palazzo. La nuova casa visibile si ottiene col raccordo, non con quel cambio isolato.
- Per le mappe senza destinazione certa, conservazione e proposta visibile non equivalgono a collocazione completata. L'approfondimento nativo del §7 dell'allegato sostiene 160-4→III e 160-5→IV tramite binding, successione degli script e forzieri. Inoltre identifica 160-10 come la prigione del recupero compagni: proposta di raccordo a D8 con precisazione documentata, correggendo il titolo editoriale «Mondo del Clifoto». 160-6 appartiene alla fase finale e richiede un'area distinta dal Santuario iniziale. I Corridoi IV/V restano da raccordare; nessuna assegnazione dal solo nome. Proposte ancora da gate e dall'approvazione dell'elenco richiesta in M §3.
- Aggiornare `DungeonPage`, `DungeonDettaglioPage`, `sezioniGuida`, `utils/palazzi`, `collocazioneTokyo`, `MappaMemento`, i lettori di `palazziService`/`dungeonService`, i link di Battaglia/Diario, il vocabolario e valutatore condizioni. Le migrazioni storiche restano immutate.
- Le condizioni strutturate di Palazzo concluso riferite a Iweleth richiedono censimento ricorsivo e proposta equivalente di fatto del dedalo/boss, inclusi OR/NON, snapshot e ripristini. Includere anche `finestra-palazzo` introdotto dalla 122, il distinto `arco`, le finestre originali e tutti i callsite di ingresso/importazione: non equiparare una finestra temporale alla sconfitta del boss. Non eliminare un operando né sostituirlo con vero. Se non è dimostrabile l'equivalenza, decisione esplicita prima di scrivere. Il selector non propone più Iweleth come Palazzo concluso.

### P6 — viste, accessi e compatibilità

Requisiti: R8-06,07,07c,07d,07f,15b,28,29,30; completa i consumatori dei passi precedenti.

- Nuova pagina Ombra, carte Battaglia con debolezze e registrazione visibili, link da dedali/Palazzi/Richieste; scheda Persona con incontri e registrazione, immagini/cattura del componente comune. Richieste con Ombra leggono le affinità canoniche; bersagli non abbinati conservano la propria fonte.
- Sezione negoziazione raggiungibile con umore preselezionato, due tocchi secondo i percorsi originali; nessuna finestra aggiuntiva necessaria per leggere il verdetto.
- Layout a 1366×657, 1280×689, 1024×690, 1920×1080, 768 e 375: una sola barra di scorrimento, intestazione ≤30%, opacità 100%, nessuno scorrimento orizzontale, piastrelle ≥88 px e bersagli ≥44 px. Non duplicare i pannelli/intestazioni. Il riesame statico delle classi non viene dichiarato prova visiva.
- Importa backup resta sostituzione esplicita: le nuove migrazioni lavorano dopo quelle storiche; backup/schema recenti non perdono riferimenti o attestazioni. JSON mappe/snapshot/cestino mantengono chiavi e vocabolario; nessuna normalizzazione generica di prose o fotografie di audit.

### P7 — invarianti, riscontro e rilascio

Requisiti: R8-22,23,24,25,26,27 e tutti i precedenti per la chiusura integrale.

- Migrazioni append-only, transazioni e preflight prima delle mutazioni. Separare M8 Ombre/negoziazione, M8b gruppo e migrazione delle partite quando necessaria; ordine dei registri stabilito con il coordinatore. Nuove entità e collegamenti sono additivi; l'adeguamento dei vincoli di `persona` e `persona_skill` richiede le ricostruzioni conservative esplicitate in P4, da approvare. Per snapshot/ripristini rispettare schema e dati effettivi, non soltanto il pacchetto pubblico.
- Diario fino al 1° giugno, Kamoshida/Madarame e stato Compendio/scorta preservati per colonne e righe, con sole variazioni autorizzate elencate. Non usare 53/7 o altri numeri storici come autorizzazione a cancellare nuove righe. Tutte le eccezioni sono nel rapporto runtime privato; git contiene regole e fonti pubbliche.
- Memento diversi da Iweleth: struttura, testi, timbri, Richieste e stati invariati; soli campi DTO aggiuntivi e resa canonica prevista da R8-08/20c. Nessun pin operativo nei dedali e nessuna nuova regolazione dei timbri.
- Tre riesami propri e revisore distinto su implementazione effettiva e specifiche originali; typecheck/lint/build verdi dopo l'ultima correzione. Nessun test o collaudo. Non attribuire ai controlli statici una prova runtime.
- Aggiornare copertura, difetti, richieste aperte, Regia/STATO e documenti strutturali; commit/push unico del lotto con il coordinatore, pipeline fino all'esito e osservazione browser autorizzata. Nessuna chiusura integrale finché un requisito o decisione sostanziale rimane pendente.

## 4. Matrice di copertura prevista

| ID enumerati | Passi | Criterio di uscita |
|---|---|---|
| R8-01, R8-02, R8-03, R8-03b, R8-04, R8-05 | P0, P1 | Identità/fonti/corrispondenze interamente censite; incertezze esplicite |
| R8-06, R8-07 | P1, P6 | Scheda e tutti gli accessi previsti |
| R8-07a, R8-07b, R8-07c, R8-07d, R8-07e, R8-07f | P0, P3, P6 | Corpus riconciliato per attestazione, fonti/alternative conservate, percorsi previsti |
| R8-08, R8-08b, R8-09, R8-10 | P1 | Una lettura canonica con sole eccezioni documentate; modifica propagata |
| R8-11, R8-12, R8-13, R8-14, R8-15, R8-15b | P2, P6 | Stato unico e snapshot conservati; completamento e raggiungibilità corretti |
| R8-16, R8-17, R8-18, R8-19, R8-19b | P0, P5 | Confluenza, conversioni e anomalie risolte; nessuna perdita/FK spezzata |
| R8-20, R8-20b, R8-20c | P1, P4, P6 | 27 schede complete, legami per chiave, lessico unico |
| R8-21 | L10, assegnazione originale | Tracciato in L10, non dichiarato implementato in L8 |
| R8-22, R8-23, R8-24, R8-25, R8-26, R8-27 | P2, P4, P5, P7 | Invarianti e controlli dichiarati con limiti; zero test |
| R8-28, R8-29, R8-30 | P6 | Percorsi e vincoli dimensionali; prove effettive dell'utente distinte |

## 5. Decisioni e lavoro ancora necessario prima della scrittura

1. Sottoporre al revisore la soluzione completa e i casi I1–I3 dell'allegato. Preparare le verifiche documentali delle mappe originali prima di chiedere all'utente la sola scelta che restasse non deducibile.
2. Approvazione delle conversioni Iweleth indicate dagli originali come elenco da approvare, soprattutto la voce Abaddon `ombra-sciagura` e le voci di combattimento. Non cambiare le due voci personali di Kamoshida; non è necessario chiedere un'altra approvazione per lasciarle intatte.
3. Il mapping pubblico non autorizza sovrascritture runtime: eventuali righe mutate, aree riorganizzate, catture o condizioni ambigue devono diventare proposte concrete. Non è un'autorizzazione a lasciare incompleta L8 e dichiararla consegnata.
4. Nessuna nuova decisione generale su 27 forme, quattro eccezioni, Royal principale, lessico, registrazione unica o ordine L8–L11: le fonti hanno già definito questi punti. Numerazione migrazioni e dettagli tecnici si risolvono nel gate.
