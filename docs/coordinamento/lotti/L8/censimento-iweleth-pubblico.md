# L8 — censimento pubblico e proposta di confluenza Iweleth

Stato: **proposta da revisionare, nessuna conversione applicata**. Lettura SQLite `mode=ro` del solo `pacchetto/gioco.db` tracciato in git; SHA-256 `113d09a15ba62127e6cc93b291605bf8fe5db6db641a16aefd635f76a539d5ba`, `user_version=93`, codice di riferimento `e0ea995e`. Nessun dato d'istanza, stato personale, DB allegato o screenshot. I nomi sotto sono titoli già pubblici del pacchetto.

## 1. Cosa è stato letto

- 12 righe `dungeon_area` del dungeon `iweleth`, cioè infiltrazioni della guida, non 16 aree fisiche.
- 47 voci: 9 Persona; 38 altre (4 altro, 3 boss, 9 forzieri, 6 miniboss, 4 oggetti, 1 ombra-sciagura, 7 puzzle, 4 sicure).
- 26 mappe discendenti da `dungeon-iweleth`, oltre alla radice; 55 pin seed sulle mappe. Altri 12 pin guida seed riferiscono voci di Iweleth e hanno `mappa_chiave=NULL` in questa base: non sono dodici posizioni da inventare.
- 16 voci del dedalo `mementos-08-iweleth`, di cui nove Persona. Il pacchetto 93 **non ha `area_dedalo`**: le 13 destinazioni qui proposte vengono dalla lettura del codice pubblico delle migrazioni 099/101, non da una loro esecuzione.
- La 109 introduce la tabella delle aree fisiche e la 110 assegna le aree dei Palazzi dai gruppi delle immagini. I 16 gruppi fisici, le 12 infiltrazioni e le 13 aree del dedalo sono strutture diverse. Non identificarle mediante il loro ordine.

Per riprodurre il perimetro: `punto_interesse JOIN dungeon_area` con `dungeon_chiave='iweleth'`; per le mappe chiusura ricorsiva di `mappa.genitore_chiave` da `dungeon-iweleth`; per i pin conteggi separati fra riferimenti alle voci e posizioni sulle mappe. Nessuna query su `data/` o partite è stata usata.

## 2. Infiltrazioni e destinazioni proposte

Abbreviazioni usate nelle tabelle successive: A01…A12 identificano esattamente le chiavi della seconda colonna. Dn significa `mementos-08-iweleth-area-n`, secondo `101_aree_reali_dei_dedali.ts:45–46` e `chiaveAreaDedalo`; tutte da verificare sull'istanza prima dell'uso. «Corrispondenza nominale» non autorizza a sovrascrivere un'area rinominata o spostata dall'utente.

| ID | Chiave infiltrazione pubblica | Destinazione proposta | Fondamento |
|---|---|---|---|
| A01 | `iweleth-01-entrata-profondita-dei-memento` | D1 Entrata | Corrispondenza nominale |
| A02 | `iweleth-02-corridoio-della-prigione-parte-i` | D2 Corridoio della prigione I | Corrispondenza nominale |
| A03 | `iweleth-03-vuoto-cavernoso-parte-i` | D5 Vuoto cavernoso I | Corrispondenza nominale; nessuna voce nella fonte |
| A04 | `iweleth-04-corridoio-della-prigione-parte-ii` | D3 Corridoio della prigione II | Corrispondenza nominale |
| A05 | `iweleth-05-vuoto-cavernoso-parte-ii` | D6 Vuoto cavernoso II | Corrispondenza nominale; nessuna voce nella fonte |
| A06 | `iweleth-06-corridoio-della-prigione-parte-iii` | D4 Corridoio della prigione III | Corrispondenza nominale; non prova dove stiano le sezioni IV/V delle immagini |
| A07 | `iweleth-07-santuario` | D7 Santuario | Corrispondenza nominale; distinguere il santuario iniziale dall'entrata finale |
| A08 | `iweleth-08-piazza-stazione-shibuya-mondo-del-clifoto` | D9 Piazza stazione Shibuya | Corrispondenza nominale; il Mondo del Clifoto complessivo non si riduce alla piazza |
| A09 | `iweleth-09-cammino-per-il-santo-graal-parte-i` | D10 Cammino per il Santo Graal I | Corrispondenza nominale |
| A10 | `iweleth-10-cammino-per-il-santo-graal-parte-ii` | D11 Cammino per il Santo Graal II | Corrispondenza nominale |
| A11 | `iweleth-11-cammino-per-il-santo-graal-parte-iii` | D12 Cammino per il Santo Graal III | Voce→area nominale; conflitto mappe I1 sotto |
| A12 | `iweleth-12-cammino-per-il-santo-graal-parte-iv` | D13 Cammino per il Santo Graal IV | Voce→area nominale; conflitto mappe I1 sotto |

D8 conserva la chiave `mementos-08-iweleth-area-8` e il titolo originale `???`. La lettura successiva della [guida primaria Allgamestaff](https://www.allgamestaff.it/persona-5-royal/dedalo-di-iweleth/) identifica questa sezione: dopo il Santuario, i compagni vengono recuperati dalle celle presso la Stanza di Velluto, prima del Clifoto. Proposta al gate: aggiungere la precisazione «Prigione della Stanza di Velluto — salvataggio dei compagni», conservando stati e legami. Il successivo approfondimento degli script originali ha identificato un raccordo documentato con la famiglia `160-10`, descritto nel §7: supera la precedente assenza di prova, senza attribuire mappe sulla sola base del titolo editoriale.

## 3. Nove Persona: associazioni determinate dalla fonte

La chiave completa di ogni riga è A02 seguito dal suffisso; la destinazione è una voce esistente del dedalo, non una nuova Persona. Stessa maschera, stato letto dal Compendio; note e riferimenti della riga storica conservati. Non attribuire la presenza esclusivamente a D2: le righe A02 sono una tabella generale delle Persona del dungeon; le aree d'incontro operative restano quelle della relazione del dedalo.

| Voce sorgente | Maschera pubblica | Voce canonica proposta |
|---|---|---|
| A02/5 | Melchizedek | `mementos-08-iweleth/7` |
| A02/6 | Moloch | `mementos-08-iweleth/8` |
| A02/7 | Lilith | `mementos-08-iweleth/9` |
| A02/8 | Chernobog | `mementos-08-iweleth/10` |
| A02/9 | Thor | `mementos-08-iweleth/11` |
| A02/10 | Yamata-no-Orochi | `mementos-08-iweleth/12` |
| A02/11 | Diamante Hope | `mementos-08-iweleth/13` |
| A02/12 | Abaddon | `mementos-08-iweleth/14` |
| A02/13 | Teschio di Cristallo | `mementos-08-iweleth/15` |

## 4. Le altre 38 voci, una per una

**Tutte sono proposte, non conversioni approvate.** `storia` è il tipo tecnico della Trama dei Memento. Conservare titolo, descrizione, dettagli, contenuti L7, chiave e stati; il tipo precedente rimane nella provenienza. Convertire a Trama non significa cancellare oggetti/premi, soluzioni, affinità o combattimenti. Una somiglianza con una voce generale del dedalo non permette di eliminarne una delle due.

| Voce | Titolo pubblico | Tipo attuale | Tipo proposto | Area proposta / nota |
|---|---|---|---|---|
| A01/0 | Piccola gabbia | oggetto | storia | D1; conserva pluralità e descrizione |
| A01/1 | Caroline | altro | storia | D1; servizio narrativo, nessuna cattura |
| A02/0 | Sciabola oscura | forziere | storia | D2; conserva contenuto e pin |
| A02/1 | Piccola gabbia | oggetto | storia | D2 |
| A02/2 | Enigma piattaforme blu n.1 | puzzle | storia | D2; conserva soluzione |
| A02/3 | Primo sacerdote x2 | miniboss | storia | D2; combattimento distinto da cattura Melchizedek |
| A02/4 | Corridoio superiore | sicura | storia | D2; conserva informazione viaggio veloce |
| A04/0 | Piccola gabbia | oggetto | storia | D3 |
| A04/1 | Sacra sindone | forziere | storia | D3; conserva contenuto e pin |
| A04/2 | Enigma piattaforme blu n.2 | puzzle | storia | D3; conserva soluzione |
| A04/3 | Re abissale dell'avarizia | ombra-sciagura | da decidere I3 | D3; possibile Persona Abaddon, ma incontro potente e cattura non equivalenti |
| A06/0 | Roccia nera | forziere | storia | D4; conserva contenuto |
| A06/1 | Piccola gabbia | oggetto | storia | D4 |
| A06/2 | Passaggio inferiore | sicura | storia | D4 |
| A06/3 | Enigma piattaforme blu n.3 | puzzle | storia | D4; conserva soluzione |
| A06/4 | Enigma piattaforme blu n.4 | puzzle | storia | D4; conserva soluzione |
| A06/5 | Enigma piattaforme blu n.5 | puzzle | storia | D4; conserva soluzione |
| A06/6 | Enigma piattaforme blu n.6 | puzzle | storia | D4; conserva piattaforme invisibili |
| A06/7 | Enigma piattaforme blu n.7 | puzzle | storia | D4; conserva rientranza/soluzione |
| A06/8 | Inquisitore crudele x3 | miniboss | storia | D4; conserva imboscata e pin |
| A06/9 | Disco vermiglio (primo) | altro | storia | D4; non inventare un oggetto inventariabile |
| A06/10 | Disco vermiglio (secondo) | altro | storia | D4; voce distinta dal primo |
| A07/0 | Tesoro dei Memento? | boss | storia | D7; combattimento narrativo non vincibile, non conclusione Palazzo |
| A08/0 | Gilet della vita | forziere | storia | D9; conserva contenuto |
| A08/1 | Ascia mortale | forziere | storia | D9; conserva contenuto |
| A08/2 | Lavenza | altro | storia | D9; conserva servizio di cura |
| A08/3 | Araldo di Morte | miniboss | storia | D9; nessuna cattura inferita |
| A08/4 | Safe Room automatica post-battaglia | sicura | storia | D9 |
| A09/0 | Catena di perline | forziere | storia | D10; conserva contenuto |
| A10/0 | Purificatore del Paradiso | miniboss | storia | D11; conserva pin |
| A11/0 | Pane per l'anima | forziere | storia | D12; conserva contenuto/pin, I1 |
| A11/1 | Messaggero del Tormento | miniboss | storia | D12; conserva pin, I1 |
| A12/0 | Soma | forziere | storia | D13; conserva contenuto/pin, I1 |
| A12/1 | Sciarpa della pietà | forziere | storia | D13; conserva contenuto/pin, I1 |
| A12/2 | Condottiero apocalittico | miniboss | storia | D13; nessuna cattura inferita |
| A12/3 | Entrata del Santuario | sicura | storia | D13; non spostare automaticamente a D7 per il nome |
| A12/4 | Santo Graal | boss | storia | D13; conserva fasi/premi/pin, nessun effetto Palazzo |
| A12/5 | Yaldabaoth, Dio del Controllo | boss | storia | D13; riferimento al boss della guida da riconciliare con `/6` del dedalo |

Voci generali già nel dedalo, da conservare e confrontare senza fusione automatica: `/0` Nessuna Richiesta; `/1` Corridoio superiore / Corridoio inferiore; `/2` Piattaforme blu/gialle; `/3` Primo sacerdote x2; `/4` Tesoro dei Memento?; `/5` Santo Graal (rivincita); `/6` Dio del controllo Yaldabaoth. Le migrazioni storiche cambiano già i tipi di queste voci: il loro tipo runtime va letto, non riportato alla versione 93.

## 5. Tutte le 26 mappe e la proposta di accesso

Prefisso completo `nativo-rmap-` per tutte le chiavi abbreviate nella tabella. Le parentesi descrivono la fonte, non una nuova collocazione. Le varianti restano distinte con la propria immagine e i propri pin; nessuna copia delle immagini in git.

| Mappa | Nome/gruppo pubblico | Accesso proposto dal dedalo |
|---|---|---|
| 161-1-0 | Entrata | D1 |
| 161-2-0 | Corridoio I, inquadratura occidentale | D2 |
| 161-2-1 | Corridoio I, variante grafica | D2 |
| 161-2-2 | Corridoio I, completa | D2 |
| 161-3-0 | Corridoio II | D3 |
| 161-4-0 | Vuoto cavernoso I, inquadratura occidentale | D5 |
| 161-4-1 | Vuoto cavernoso I, completa | D5 |
| 161-4-2 | Vuoto cavernoso I, variante grafica | D5 |
| 161-5-0 | Corridoio III | D4 |
| 161-6-0 | Corridoio IV, inquadratura settentrionale | I2: manca area omonima nel dedalo |
| 161-6-1 | Corridoio IV, completa | I2 |
| 161-7-0 | Vuoto cavernoso II | D6 |
| 161-8-0 | Corridoio V, inquadratura settentrionale più ampia | I2: manca area omonima nel dedalo |
| 161-9-0 | Corridoio V, inquadratura settentrionale più ristretta | I2 |
| 161-10-0 | Corridoio V, completa | I2 |
| 161-11-0 | Santuario | D7, corrispondenza nominale |
| 160-1-0 | Piazza Stazione Shibuya | D9 |
| 160-2-0 | Cammino per il Santo Graal I | D10 |
| 160-3-0 | Cammino per il Santo Graal II | D11 |
| 160-4-0 | Cammino per il Santo Graal III | I1: nome III, legame pubblico A12/IV |
| 160-4-1 | Cammino III, inquadratura settentrionale | I1: stessa famiglia di 160-4-0 |
| 160-4-2 | Cammino III, inquadratura meridionale | I1: stessa famiglia di 160-4-0 |
| 160-5-0 | Cammino per il Santo Graal IV | I1: nome IV, legame pubblico A11/III |
| 160-6-0 | Entrata del santuario | I2: legame pubblico A07; possibile fase finale distinta |
| 160-10-0 | Mondo del Clifoto, porzione settentrionale | I2: titolo editoriale da correggere; binding e script sostengono D8, §7 |
| 160-10-1 | Mondo del Clifoto, completa | I2: stessa famiglia di 160-10-0; D8, §7 |

Le posizioni dei 55 pin seed non vengono ripubblicate né ricalcolate. I 12 pin guida riferiscono esattamente A02/0, A02/3, A04/1, A06/8, A07/0, A10/0, A11/0, A11/1, A12/0, A12/1, A12/4, A12/5. Il trasferimento delle voci deve conservare quelle chiavi e risolvere il contesto dell'area senza rompere le FK.

## 6. Risoluzioni richieste prima della conversione

| ID | Evidenza e problema | Lavoro concreto / decisione |
|---|---|---|
| I1 | `160-4-0` è chiamata III ma riferisce A12/IV; `160-5-0` è chiamata IV ma riferisce A11/III. I titoli nativi sono entrambi generici; binding, sequenza degli script e forzieri distinguono le due zone (§7) | Proposta ora sostenuta dalla fonte originaria: famiglia 160-4 → D12 e 160-5 → D13, correggendo il raccordo editoriale e mantenendo coordinate/immagini/pin. L'abbinamento dei singoli contenuti ai pin non è dimostrato dal solo numero dei forzieri e va verificato separatamente |
| I2 | D8 identifica il recupero dei compagni e gli script della famiglia 160-10 ne contengono gli eventi; 160-6 appartiene alla sequenza finale 160-5→160-6. I Corridoi IV/V restano senza raccordo editoriale completo | Proporre 160-10→D8 con titolo corretto e un'area finale distinta per 160-6, senza riusare il Santuario iniziale A07. Restano da ricostruire i Corridoi IV/V e la granularità fra area fisica e sezione narrativa. Nessuna cancellazione o riallocazione dei legami runtime senza riconciliazione |
| I3 | A04/3 descrive Abaddon catturabile ma è `ombra-sciagura`, mentre il dedalo ha già Abaddon `/14` | Proposta preferita: conservare l'incontro come Trama con riferimento all'Ombra e cattura tramite la sua Persona, senza equiparare «combattimento completato» a «Persona registrata». Se si richiede invece convertirlo in Persona, definire esplicitamente come conservare l'eventuale stato del combattimento e non duplicare la piastrella |

Gli originali M §3 e R8-17/19 richiedono un elenco approvato per queste conversioni. Il censimento lo rende concreto ma **non lo dichiara approvato**. L'archivio delle mappe può preservare la consultazione durante il lavoro; non costituisce chiusura di R8-16/17/19. Prima della migrazione finale occorre anche riconciliare eventuali differenze dell'istanza, senza pubblicare dati personali né sovrascriverle in base a questo pacchetto.

La stessa lettura della guida evidenzia possibili collocazioni storiche da approfondire: Gilet/Ascia/Araldo sono descritti nel Cammino I, Catena di perline nel II, mentre il pacchetto li raggruppa prima. Le tabelle sopra sono quindi **mapping del pacchetto**, non certificazione di ogni posizione nel gioco. Queste differenze richiedono confronto puntuale prima di correggere collocazioni reali; non sono state applicate in questo censimento. Fonte: [guida Allgamestaff, sezioni del Cammino](https://www.allgamestaff.it/persona-5-royal/dedalo-di-iweleth/).

## 7. Approfondimento cartografico dalle fonti native conservate

Ricognizione in sola lettura del 21 ottobre 2026. Sono stati ritrovati gli export originali dell'estrattore citato da `docs/ATLANTE-CONSEGNA.md`: `mondo_metadati.json`, `mappe_indice.json` e gli script decompilati già presenti in `campi-completi/scripts`. Nessuna nuova estrazione del gioco, download di immagini, migrazione o scrittura dei DB. I percorsi privati dell'archivio non vengono pubblicati. Gli export sono evidenze locali consultate, non file che questo documento dichiara presenti nel checkout corrente.

Le immagini 160-4-0, 160-5-0 e 160-6-0 lette dall'archivio grafico locale risultano byte per byte identiche ai PNG pubblicati nel commit `f6cbd063`, percorso `public/asset/mappe/native/nativo-rmap-<codice>.png`. È stata osservata anche 160-10-1 recuperata direttamente da quel commit. La forma grafica è un riscontro, non una prova sufficiente di collocazione.

| Evidenza nativa | Conseguenza sostenuta | Limite |
|---|---|---|
| `mondo_metadati`: RMAP_160_4_0 ↔ F160_004_00 e RMAP_160_5_0 ↔ F160_005_00. `mappe_indice` assegna a entrambe il titolo originale «Cammino per il Santo Graal», provenienza tabella ROADMAP, texpack 102/103 | III/IV sono distinzioni editoriali, non testo originale dell'immagine | Non scegliere quale riferimento correggere soltanto dal titolo o dal numero |
| `160_004_00.flow`: uscite 160-3/160-5 (righe 21,30,172,197), procedura `D08_160_04_TBOX_minimap_07` (140), boss 67 (216). `160_005_00.flow`: uscite 160-4/160-6 (21,30,96,121), due procedure TBOX (52,64), boss 68 (140) | Sequenza dei campi 3→4→5→6 e un forziere contro due; concorda con le sezioni III/IV della guida. La proposta 160-4→D12, 160-5→D13 ha una prova indipendente dalla rinomina | Gli ID 67/68 non sono stati decodificati qui nei nomi del nemico; i contenuti specifici dei tre forzieri non sono letti dallo script esaminato |
| `mondo_metadati`: RMAP_160_10_0 e RMAP_160_10_1 ↔ F160_010_00. `160_010_00.flow`: sei procedure `PRISON_PC02/04/05/06/07/08` (102–188), eventi 453/101–106, controllo congiunto delle sei bandiere in `PRISON_PARTY_CHECK` (192–207); caricamento del gruppo e uscita verso F160_001_00 (249–251) | È la sezione della prigione con recupero dei compagni prima di Shibuya; proposta 160-10→D8. Il precedente titolo editoriale «Mondo del Clifoto» non prova che sia una panoramica del mondo | Conservare le due immagini e i loro contesti; nessun trasferimento delle coordinate tra varianti per somiglianza |
| `160_006_00.flow`: ritorno a F160_005_00 (21,107), boss 69 (53); `mondo_metadati` associa RMAP_160_6_0 a F160_006_00, oltre al contesto condiviso F161_051_00 | L'ingresso finale è distinto dal Santuario iniziale F161_011_00; il raccordo pubblico ad A07 non può essere conservato come equivalenza narrativa | Il contesto condiviso va mantenuto; proposta area finale dedicata, non sostituzione indiscriminata dei riferimenti ad A07 |
| RMAP_161_6_0 ↔ F161_006_00; RMAP_161_8/9/10 ↔ F161_008/009/010_00, con contesti condivisi in F161_051_00. Titolo nativo comune «Corridoio della prigione»; 161-6-1 non ha binding diretto nell'export | I numeri IV/V sono organizzazione editoriale; non sono destinazioni deducibili dalla sola omonimia | Resta da ricostruire quali sezioni narrative e voci appartengano ai campi, senza inventare aree per riempire D8 |

Impronte SHA-256 degli export consultati, per rendere ripetibile il confronto senza pubblicare percorsi o archivi:

| Artefatto | SHA-256 |
|---|---|
| `mondo_metadati.json` | `080e569dbcb203e01ae1d6d325831ada3e2e7dbc6e4701ec1e755784808df2f6` |
| `mappe_indice.json` | `d5deac796c75e063567f6ab638162c3dbb537f4923f497af91c75e6fee6e231f` |
| `160_004_00.flow` | `552daa99abef4e772b692eb4743197b4ff7caeea6ecc77e176c2b29dfeed7121` |
| `160_005_00.flow` | `ee43f8a95e2effd2fd3c80e07b16a17de65b3814e1f64fe33f2cb21528a450cf` |
| `160_006_00.flow` | `726bcda81591d4bbab9cbe9fe45a2f28936565fa80ce6e46f95f1171c28689bf` |
| `160_010_00.flow` | `41908ce61f757e4627a86537a43bd57bfd730497139c736d22933a5a503a638e` |

Non si richiede all'utente di decidere quale mappa sia vera: quello resta un problema di fonti. La decisione editoriale da presentare, dopo il gate e il completamento del raccordo dei Corridoi, è l'approvazione dell'elenco di confluenza richiesto da M §3: conservazione della chiave D8 con precisazione, area finale distinta, gestione della voce Abaddon e collocazioni puntuali. Il censimento non dichiara ancora approvata o conclusa la conversione.
