# L5 — traccia della riconciliazione corrente

Stato: **primo censimento corrente ricevuto dalla Regia; riconciliazione semantica ancora aperta**. Preparazione documentale del 21 ottobre 2026; nessuna conformità complessiva dei dati dichiarata, nessuna proposta applicata. Questo documento contiene requisiti, chiavi già pubbliche e aggregati attribuiti alla lettura del coordinatore. Non contiene una copia dei dati dell'istanza, dei salvataggi o dei database.

Fonte corrente: resoconto del coordinatore dalla lettura in memoria dell'endpoint in sola lettura del **21 ottobre 2026, ore 09:35 UTC**, schema 122. Il redattore non ha eseguito una seconda lettura dell'istanza. Sono riferiti **51 luoghi senza Area**, tutti seed e non nascosti, e **zero `anomalieLegami` sui 1913 pin censiti**. Quest'ultimo dato riguarda soltanto le anomalie strutturali riconosciute dall'endpoint: non certifica geografia, correttezza dei listini, visibilità o assenza di altri difetti.

## 1. Fonti e differenze da non confondere

- Specifica originale: `modifiche.md` alla revisione `43ad8889`, §1.2 passi 2/5/6, §1.3 e §7 punti 2/5/6/7/8/9/10/11; `dati.md` alla stessa revisione, §4 e §7.1–8, §8. Nella revisione originale `modifiche.md` termina con il §7: il §8 dei conteggi è in `dati.md`, mentre il punto 8 di M§7 riguarda gli undici pin seed omonimi.
- Requisiti pertinenti: R5-01, R5-05, R5-08, R5-12/12b/12c, R5-14/15/16/18/20, R5-22/23/24/25/26/27. La conservazione del lavoro dell'utente resta vincolante.
- Riferimento pubblico per le chiavi: `pacchetto/gioco.db`, schema 93, SHA-256 `113d09a15ba62127e6cc93b291605bf8fe5db6db641a16aefd635f76a539d5ba`, letto soltanto con SQLite `mode=ro`. È anteriore alle migrazioni L5–L7; non rappresenta lo stato corrente e non ricostruisce integralmente la fotografia storica citata dai requisiti.
- Lettura statica del codice: `115_luoghi_fonte_unica.ts` per le regole già implementate; `shared/censimentoLuoghiCondizioni.ts` e `server/services/censimentoLuoghiCondizioniService.ts` per il contratto del nuovo inventario in sola lettura. La disponibilità dell'endpoint pubblicato e la sua risposta devono essere attestate dalla Regia, non dedotte dai file locali.

I numeri 93 luoghi, 42 assegnazioni certe, 13 proposte, 38 altri luoghi da collocare, 58 negozi con sede, 3 senza sede e circa 30 pin candidati descrivono una fotografia storica. Non sono quantità da ottenere modificando i dati correnti. Inoltre `dati.md` §8 scrive 42+13=55 come prospettiva dopo approvazione; M§1.2/§1.3/§7.2 stabilisce invece 42 assegnati e 51 da collocare, finché i 13 non sono approvati. Il censimento dovrà mantenere distinti i due stati.

## 2. Come leggere il censimento corrente

La Regia legge la risposta in memoria e restituisce un resoconto minimizzato. Nessun salvataggio del payload, dei testi personali, delle condizioni personali o degli UID dell'istanza in git. Le chiavi pubbliche sotto sono soltanto ancore di ricerca; una riga rimossa o sostituita non si ricrea automaticamente.

1. Registrare versione del contratto, versione dello schema e completezza dichiarata, distinguendo tabelle/colonne assenti da righe assenti e da NULL SQL. Un JSON malformato è diverso da un valore NULL valido o da una colonna non disponibile.
2. Per ogni caso confrontare chiave, origine e contesto attuale, legame diretto e legami aggiuntivi. Per i pin verificare anche che ID e identità corrispondano: l'ID storico da solo non autorizza una correzione.
3. `luogoRisolto` è una **risoluzione strutturale**. Non certifica che il pin sia visibile, aperto, raggiungibile o corretto nel visore. NULL non implica un difetto: passaggi, annotazioni e altri tipi possono non avere un luogo. `riferimento.esiste=null` significa che quel tipo non è risolto dal censimento, non che il riferimento sia inesistente.
4. `luoghiAssociati` non sceglie la sede di un pin. Controllare `sediExtra`, `sediPin`, catena `listino_condiviso`, Area della planimetria e Area del luogo. Un listino presente in più quartieri è ammesso: non correggere il riferimento al negozio soltanto perché il suo nome o la sede principale appartengono a un altro quartiere.
5. Separare anomalie strutturali accertate, lacune semantiche ancora da studiare, decisioni dell'utente ed esclusioni motivate. Non ridurre tutti i pin senza luogo a un unico numero di errori.
6. L'inventario non espone coordinate, snapshot o stati delle partite: da questa risposta non si può certificare la conservazione prima/dopo di posizione, diario, acquisti, Kamoshida o Madarame. Non dichiarare superate quelle invarianti per inferenza.

## 3. Negozi senza sede: proposte originali da riconciliare

| Chiave pubblica | Fonte originale e proposta | Confronto necessario | Valore corrente / decisione |
|---|---|---|---|
| `tanaka-affari-loschi` | M§1.2.5 / §7.5: proposta di sede `yongen-jaya/leblanc` per l'acquisto dal portatile | Sede attuale, eventuale modifica esplicita, listino e condizioni proprie. Il servizio commerciale online non autorizza a inventare un pin dedicato o ad assimilare gli orari dell'attività a quelli del locale | Sede NULL, nessuna sede extra; proposta ancora aperta |
| `home-shopping-tv` | Stessa fonte: proposta di sede `yongen-jaya/leblanc` per il televisore | Sede, condizioni di disponibilità, percorso dalla pagina del luogo al listino; preservare articoli e riferimenti del diario | Sede NULL, nessuna sede extra; proposta ancora aperta |
| `negozio-palazzo-niijima` | Stessa fonte: nessuna sede nel mondo proposta; pagina autonoma mantenuta in M§7.11 | Non assegnare Leblanc o un luogo cittadino. Verificare se esiste una decisione successiva o una sede esplicita nel dominio Palazzo; NULL da solo non è un bug | Sede NULL, nessuna sede extra; non equivale a errore |
| `prossimo-asso` → `shibuya/prossimo-asso` | M§1.2.5: sede dedotta esplicitamente prevista, implementata dalla 115 solo se mancante | Esistenza del luogo e sede corrente; un valore personale differente non va sovrascritto perché diverso dal riferimento pubblico | Sede `shibuya/prossimo-asso`, nessuna sede extra: corrisponde al raccordo previsto |

Nel pacchetto pubblico 93 le quattro chiavi sono presenti e senza sede; questa è esclusivamente un'osservazione sulla base pubblica precedente alla 115. La proposta Tanaka/TV non diventa approvata perché è tecnicamente esprimibile.

## 4. Distributori e pin nominati dalla specifica

Fonte: M§7.6, `dati.md` §4 righe 58–62 e §7.6, G-014 richiamato da quei documenti. Le annotazioni storiche «probabilmente sbagliato» e «non coerente» sono motivazioni per una proposta, non autorizzazioni a cambiare un pin dell'utente.

| ID storico già pubblico | Chiave negozio nella base pubblica 93 | Mappa pubblica | Criterio di confronto / proposta originale | Stato corrente |
|---|---|---|---|---|
| 1527 | `distributore-shujin-edificio` | `nativo-rmap-001-3-0` | Caso dichiarato coerente: un listino condiviso può comparire a Central Street. Conservare; verificare sede specifica e legami L7 | Risoluzione `sede-pin` a Central Street, coerente col contesto riferito |
| 1547 | `distributore-shujin-edificio` | `nativo-rmap-001-5-0` | Caso dichiarato coerente al Tornello Ginza; stesso controllo | Risoluzione `sede-pin` a Ginza, coerente col contesto riferito |
| 1768 | `distributore-shujin-cancello-2` | `nativo-rmap-001-3-0` | Caso dichiarato coerente; non estendere a 1769 soltanto perché cita lo stesso negozio | Risoluzione `sede-pin` a Central Street, coerente col contesto riferito |
| 1769 | `distributore-shujin-cancello-2` | `nativo-rmap-001-3-0` | La specifica segnala il distributore destro di Central Street e la composizione del listino come dubbio. Cercare l'offerta corretta nei dati/fonti attuali; nessuna sostituzione automatica della chiave | Riferimento ancora alla chiave storica; sede risolta a Shujin su pin di Central Street. Discordanza semantica aperta, nessuna `anomaliaLegami` rilevata |
| 1584 | `distributore-shujin-cortile` | `nativo-rmap-009-2-0` | Proposta originale da sottoporre: `distributore-yongen-bagno`, con luogo pubblico `yongen-jaya/distributore-bagno-pubblico`; verificare che sia davvero quella macchina e quel listino | Riferimento ancora alla chiave storica; sede risolta a Shujin su pin dei Vicoli di Yongen. Discordanza semantica aperta, nessuna `anomaliaLegami` rilevata |

Per tutti e cinque confrontare il listino risolto, la sede specifica del pin, le sedi aggiuntive e il contesto. Conservare nome/descrizione, condizioni, coordinate, planimetria e stati. L7 può avere introdotto una sede strutturata senza cambiare il riferimento storico al listino: ciò non equivale di per sé né a errore né a soluzione semantica di 1769/1584.

## 5. Tredici proposte di Area: chiavi pubbliche da cercare

M§1.2.2 e §7.2 indicano Shinjuku 3, Kichijoji 4, Akihabara 3, Kanda 2, Odaiba 1. La lista seguente è ricostruita dal pacchetto pubblico 93: nei cinque quartieri si selezionano i luoghi senza pin diretto su planimetria nativa né legame `mappa_entita`; i pin sulle illustrazioni del quartiere non provano l'Area fisica. Il risultato coincide numericamente con 13, ma **non è una copia certificata dell'originario `l5-prod.json`**. Serve a cercare e confrontare i casi correnti.

| Quartiere pubblico | Chiavi pubbliche candidate | Proposta originaria da riesaminare | Valori correnti |
|---|---|---|---|
| `shinjuku` | `shinjuku/chihaya-stand`; `shinjuku/fioraio-sukebe`; `shinjuku/mran-mran` | L'unica Area del quartiere, soltanto come suggerimento finché manca prova o approvazione | Tutti NULL; Area corrente «Quartiere a luci rosse», proposta da verificare |
| `kichijoji` | `kichijoji/houraku`; `kichijoji/kichijoji-galleria-kasumi`; `kichijoji/mealport`; `kichijoji/mercante-sakai` | Stessa regola; nessun punto inventato sulla planimetria | Tutti NULL; Area corrente «Quartiere dello shopping», proposta da verificare |
| `akihabara` | `akihabara/akiba-electronics`; `akihabara/distributori-akihabara`; `akihabara/gachapon-akihabara` | Stessa regola; separare il luogo dai molteplici listini dei distributori | Tutti NULL; Area corrente «Electric Town», proposta da verificare |
| `kanda-jinbocho` | `kanda-jinbocho/chiesa-kanda`; `kanda-jinbocho/nagiuri` | Riesaminare l'attuale distinzione Kanda/Jinbocho. Non proporre automaticamente la stessa Area per entrambi | Entrambi NULL; unica Area corrente «Cappella». Non dedurne Nagiuri→Cappella |
| `odaiba` | `odaiba/odaiba-seaside-park` | L'esistenza di un solo luogo o di una sola Area non prova una posizione | NULL; unica Area corrente «Cantiere dello stadio». Non dedurne Seaside Park→Cantiere |

Ricercare anche tutti gli altri luoghi correnti con `area_chiave=NULL`, compresi quelli nuovi rispetto a queste chiavi: i 13 non esauriscono R5-01. Se un luogo è già collocato, verificare origine della scelta e contesto senza cancellarla per ripristinare il conteggio storico. Area assegnata e pin posizionato sono due fatti diversi. La rimozione autorizzata del riquadro UI «Da posizionare» non elimina l'obbligo di riconciliare l'inventario.

### 5.1 Tutte le 51 chiavi correnti senza Area e classi di lavoro

L'elenco è comunicato dal coordinatore dalla stessa lettura; tutte le 51 chiavi sono state poi confrontate con il pacchetto pubblico 93: **51 uniche, 51 già pubbliche**. Si pubblicano solo queste chiavi seed e le classi di lavoro, senza dati personali. Non sono 51 bug accertati.

| Classe | Chiavi pubbliche | Proposta o dato mancante |
|---|---|---|
| 13 candidati storici | Le 13 chiavi del §5 | Esiti sopra; Kanda e Odaiba richiedono distinzione semantica, non assegnazione alla sola Area disponibile |
| 5 sedi risolte da listino a un'unica Area coerente | `shibuya/37-gradi`; `shibuya/high-sense`; `shibuya/prossimo-asso`; `shibuya/taisho-store`; `shibuya/tsurukame` | Proposta corrente: Centro commerciale sotterraneo. Il riscontro passa dalla sede del listino al pin, non da un riferimento diretto luogo: riconciliare prima di assegnare |
| 1 sede scolastica risolta da listino | `shujin-academy/negozio-scolastico` | Proposta corrente: Edificio principale 1P / Edificio laboratori 1P. Stessa cautela sul legame indiretto |
| 2 sedi di Yongen risolte tramite riferimenti indiretti | `yongen-jaya/batting-cage-yongen`; `yongen-jaya/super-muramasa` | Proposta corrente: Vicoli; nessun nuovo pin o coordinata dedotta |
| Distribuzione su più Aree e riferimenti controversi | `shujin-academy/distributori-shujin` | Più Aree valide nella scuola, oltre ai due pin controversi 1584/1769 fuori quartiere: nessuna Area unica da scegliere automaticamente |
| Luogo solo durante eventi | `yongen-jaya/sakura-residence` | `solo_eventi_confidente=futaba`; il NULL Area non si tratta come un normale negozio da posizionare |
| 19 casi di quartieri/ambiti la cui Area pertinente resta da accertare | `asakusa/asakusa-hangout`; `asakusa/tokyo-skytree`; `harajuku/harajuku-hangout`; `harajuku/takenoko-street`; `ichigaya/laghetto-ichigaya`; `ikebukuro/planetario-ikebukuro`; `inokashira-park/inokashira-hangout`; `maihama/destinyland`; `meiji-shrine/meiji-shrine-hangout`; `mementos/ingresso-mementos`; `mementos/negozio-jose`; `nakano/nakano-broadway`; `ogikubo/ogikubo-ramen`; `roppongi/okumura-foods-hq`; `shinagawa/shinagawa-acquario`; `suidobashi/dome-town`; `tsukishima/tsukishima-monjayaki`; `ueno/museo-ueno`; `yokohama-chinatown/chinatown-hangout` | Non inventare planimetrie, Aree o sedi fisse per luoghi narrativi/casuali. La mancanza dell'Area va motivata caso per caso con gerarchia e fonte |
| 9 ulteriori luoghi in contesti con più possibili sedi | `shibuya/stazione-shibuya`; `shibuya/underground-mall-lovers`; `shibuya/venditore-ambulante`; `shujin-academy/aula-shujin`; `shujin-academy/corridoio-2-piano-shujin`; `shujin-academy/infermeria-shujin`; `yongen-jaya/distributore-bagno-pubblico`; `yongen-jaya/stazione-yongen-jaya`; `yongen-jaya/venditore-patate-dolci` | Ricercare collocazione effettiva e riferimenti dei pin; il solo nome non dimostra il piano o l'Area |

Copertura: 13+5+1+2+1+1+19+9 = 51. Le otto proposte ricavate dai legami indiretti sono ancora **non applicate**. Gli altri casi richiedono approfondimento o esclusione motivata: questa classificazione non restringe R5-01.

## 6. Pin del mondo senza luogo: popolazione completa e casi pubblici

M§7.9 separa annotazioni, dialoghi, punti sensibili, terme e passaggi senza destinazione dai pin di negozio/ristorante/distributore/attività/cinema/lavoro da proporre come luoghi. Le eccezioni devono avere una motivazione per riga; nessun pin va eliminato per far tornare il numero.

Nel pacchetto pubblico 93, il filtro riproducibile «discendente di `tokyo`, `riferimento_tipo IS NULL`, tipo fra i sei sopra» restituisce **21** pin. Ulteriori **10** pin degli stessi tipi sono sulla radice separata `nativo-rmap-022-1-1` (Covo). Questi due insiemi non vengono forzati nel circa 30 storico, che appartiene a una fotografia e a un perimetro da ricostruire. Il censimento attuale dovrà classificare anche i pin con riferimenti presenti ma non risolti, le mappe senza quartiere e gli altri tipi: questo filtro pubblico è un elenco iniziale, non la prova di copertura corrente.

| Mappa pubblica | ID pubblici iniziali da cercare | Valore corrente |
|---|---|---|
| `nativo-rmap-007-1-0` | 268, 269, 272, 273, 274, 275 | Tutti senza riferimento né associazione |
| `nativo-rmap-002-1-0` | 339 | Senza riferimento né associazione |
| `nativo-rmap-002-8-0` | 346 | Senza riferimento né associazione |
| `nativo-rmap-005-1-0` | 359, 360, 363 | Tutti senza riferimento né associazione |
| `nativo-rmap-001-1-0` | 1466 | Senza riferimento né associazione |
| `nativo-rmap-001-2-0` | 1486 | Senza riferimento né associazione |
| `nativo-rmap-001-3-0` | 1526, 1530 | Entrambi senza riferimento né associazione |
| `nativo-rmap-006-1-0` | 1561, 1562, 1564, 1565, 1566 | Tutti senza riferimento né associazione |
| `yongen-java-banchina-della-metropolitana` | 1636 | Senza riferimento né associazione |
| `nativo-rmap-022-1-1` — Covo | 375–383, 386 | Tutti senza riferimento né associazione; nel corrente il Covo è nel ramo Tokyo |

Per ogni riga corrente da riconciliare: riconoscere prima se è un luogo concreto, un listino condiviso, un'attività localizzata, un passaggio o un'annotazione. Cercare i luoghi esistenti nel contesto, con prova della corrispondenza; se non esiste un luogo, formulare una proposta nominativa e motivata. Nessun luogo nuovo o cambio dei riferimenti personali senza la decisione richiesta dalle specifiche. I passaggi senza destinazione hanno un problema distinto dalla mancanza di un luogo e non vanno convertiti in luoghi.

### 6.1 Riscontro corrente e proposte nominative per tutti i 31 candidati

Il coordinatore comunica il completamento del censimento: **296 pin** su discendenti di Tokyo oppure mappe con Area di un quartiere, **84 con luogo risolto e 212 senza**. I 31 candidati dei sei tipi coincidono esattamente con le 21+10 righe pubbliche sopra; gli altri **181** appartengono a classi da motivare distintamente, non a luoghi mancanti da creare in blocco. La sola planimetria Covo `022-1-1` conta oggi 15 pin, dieci dei quali candidati. Il suo essere una radice separata descrive soltanto il pubblico 93, non la gerarchia corrente.

Completamento comunicato dal coordinatore il 21 ottobre 2026: confronto canonico dei campi `id`, `tipo`, `nome`, `mappa_chiave`, `riferimento_tipo`, `riferimento_chiave` con il pubblico 93, **31/31 identici**. Nomi e contesti delle proposte sono dunque riconciliati su questi campi, non soltanto dedotti dagli ID; ciò non approva automaticamente le associazioni proposte né comprende descrizioni personali.

Le proposte seguenti usano nomi e contesti della base pubblica, non testi personali dell'istanza. Le chiavi esistenti sono state cercate nella tabella pubblica `luogo`; quelle indicate come candidate non diventano abbinamenti certi per somiglianza lessicale. I nomi di nuovi luoghi sono proposte, non chiavi già esistenti. Tutti i collegamenti sono ancora da approvare/applicare.

| ID pubblici | Nome pubblico / contesto | Proposta concreta | Prova ancora necessaria o esclusione |
|---|---|---|---|
| 268 | Ferramenta / Electric Town | Proposta `luogo` → `akihabara/akiba-electronics`, senza creare una seconda ferramenta | Il tipo nativo81 è un negozio di utensili; il listino pubblico Akiba vende materiali e strumenti da PC. La fonte giapponese distingue il negozio di utensili Akiba Electronics dagli altri negozi di elettronica: identità sostenuta, dettaglio fonti nel §6.3 |
| 269 | Distributori di capsule / Electric Town | Collegare al candidato `akihabara/gachapon-akihabara` e proporne l'Area Electric Town | Stesso servizio e contesto; verificare identità e assenza di un altro punto omonimo corrente |
| 272, 273, 274, 275 | Quattro distributori di bevande / Electric Town | Candidato luogo `akihabara/distributori-akihabara`; conservare quattro pin e distinguere i listini prima del raccordo | Esistono sei listini pubblici `distributore-akihabara-1`…`-6`: non assegnare i primi quattro per ordine. Luogo aggregato e singola macchina non sono automaticamente equivalenti |
| 339 | Distributore di bevande / Cancello della scuola | Candidato `shujin-academy/distributori-shujin`; ricercare quale dei due listini del cancello appartiene alla macchina | Non attribuire un'Area unica al luogo aggregato di tutte le macchine scolastiche; mantenere la posizione del singolo pin |
| 346 | Biblioteca Scolastica / Biblioteca | Collegare a `shujin-academy/biblioteca-shujin` | Nome, funzione e planimetria corrispondono; confrontare il luogo corrente e gli eventuali pin già esistenti prima di aggiungere il riferimento |
| 359 | Distributore di bevande / Quartiere dello shopping | Proporre nuovo luogo «Distributore del Quartiere dello shopping» a Kichijoji, con questo pin esistente | Nessun luogo pubblico di distributori di Kichijoji; cercare eventuale luogo corrente già creato e accertare il listino senza riusare macchine di altro quartiere |
| 360 | Panini al vapore / Quartiere dello shopping | Proposta `luogo` → `kichijoji/houraku`, con il listino esistente `street-food-houraku` | Tipo nativo106 negozio di panini cinesi, luogo Houraku e sue offerte Nikuman concordano; non è Hagoromo |
| 363 | Alimentari importati / Quartiere dello shopping | Proposta `luogo` → `kichijoji/mealport`, con il listino esistente `mealport` | Tipo nativo107 alimentari importati, luogo e listino di importazione MealPort concordano |
| 1466 | Lotteria / Piazza della stazione | Proporre luogo «Banco della lotteria di Shibuya» con il pin esistente | Nessun luogo pubblico dedicato. La descrizione pubblica documenta acquisto biglietti e verifica vincite; non assorbire l'intera piazza come sede commerciale equivalente |
| 1486 | Chiosco dei succhi / Sottopasso | **Ritirato il candidato KiyasuKu.** Proporre luogo distinto «Chiosco dei succhi del Sottopasso», collegato al solo pin1486 esistente | Nella stessa mappa il pin1487 è già KiyasuKu in altra posizione; tipo nativo49 Juice Bar e nota pubblica della bottega distinguono i due esercizi. Il coordinatore conferma entrambi correnti e personali: serve il sì specifico al nuovo collegamento; nessuno spostamento automatico dell'offerta Aojiru o dei suoi acquisti |
| 1526 | Cinema / Central Street | Proporre luogo «Cinema di Shibuya» con il pin esistente | Il pubblico ha cinema di Yongen e Shinjuku ma nessun cinema di Shibuya: non riusarli per nome generico. Cercare prima l'eventuale nuovo luogo corrente |
| 1530 | Venditore di accessori nel vicolo / Central Street | Proposta `luogo` → `shibuya/venditore-ambulante`, con listino esistente `venditore-ambulante` | Tipo nativo111 venditore di accessori nel vicolo; nota del listino colloca la bancarella in Central Street e le offerte sono accessori/specchi. Identità sostenuta da funzione, merce e posizione, non dal solo nome |
| 1561 | Casalinghi / Quartiere a luci rosse | Proposta `luogo` → `shinjuku/mran-mran` | Tipo nativo75 articoli vari; luogo/listino di Shinjuku vendono tazza, strumenti da cucina e altri regali. Coerenza di dominio e merce; conservare il nome proprio del luogo e la nota del pin |
| 1562 | Fioraio / Quartiere a luci rosse | Proposta `luogo` → `shinjuku/fioraio-sukebe` | Tipo nativo63 fioraio e luogo/listino Sukebe di Shinjuku con fiori, piante e fertilizzante. Non spostare Rafflesia da Shibuya né trasferirne requisiti lavorativi |
| 1564, 1565, 1566 | Tre distributori / Quartiere a luci rosse | Proporre tre sedi di macchina distinte sul pin esistente, con denominazioni riferite alla posizione solo dopo lettura della planimetria | Nessun luogo pubblico di distributori di Shinjuku; non accorpare le tre macchine né assegnare listini scolastici senza prova. I nomi posizionali non sono inventati qui |
| 1636 | Lavoro part-time / Banchina della metropolitana | Ricercare se rappresenta un annuncio/servizio informativo: in quel caso conservare come pin informativo senza nuovo luogo; se è un'attività fisica, proporre la sua sede effettiva | Nome generico e descrizione pubblica vuota non provano un posto di lavoro in banchina. Esclusione proposta ma non ancora dimostrata |
| 375 | Creatore del Palazzo / Covo | Proporre sede funzionale «Creatore del Palazzo del Covo» nel dominio Covo, con il pin esistente | Nessun luogo pubblico corrispondente; prima verificare come il modello rappresenta sedi interne al Covo, senza assegnare un quartiere cittadino fittizio |
| 376 | Musica / Covo | Proporre sede funzionale «Musica del Covo» con il pin esistente | Stesso vincolo di dominio; non è un negozio di musica di Tokyo |
| 377 | Televisione / Covo | Proporre sede funzionale «Televisione del Covo» con il pin esistente | Non collegare al televisore/Leblanc o al servizio home-shopping per omonimia |
| 378 | Galleria / Covo | Proporre sede funzionale «Galleria del Covo» con il pin esistente | Non collegare alla galleria di Kichijoji |
| 379 | Area giochi / Covo | Proporre sede funzionale «Area giochi del Covo» con il pin esistente | Non collegare alle sale giochi cittadine |
| 380, 381, 382, 383 | Quattro punti Premi / Covo | Conservare tutti e quattro i pin; censire le quattro funzioni prima di proporre sedi separate o un'unica sede funzionale con quattro accessi | Il nome uguale non prova duplicazione. Nessuna rimozione né fusione automatica |
| 386 | Jose / Covo | Proposta di eccezione motivata: mantenere il pin come guida/tutorial del Covo, con rimando alla sua scheda, senza luogo commerciale | La fonte AGS Covo identifica Jose all'ingresso come guida delle funzioni. Non è il negozio dei Memento: la precedente alternativa «nuova sede commerciale Jose» è ritirata |

Il perimetro pubblico ampliato a tutte le cinque mappe Covo aggiunge dodici righe: **369, 370, 371, 387, 388, 389, 390, 391, 392, 393** sono note pubbliche tipo 104 relative al posizionamento di oggetti, **394 e 395** sono passaggi. Sono escluse dalla creazione di luoghi per la funzione annotativa/di transito, conservando i pin. La base Tokyo + sola `022-1-1` contiene **285** ID; le altre dodici righe portano il riferimento pubblico a **297**. La Regia riferisce 296 correnti: due seed rimossi (223/224) e un nuovo pin dell'utente già risolto, del quale qui non sono pubblicati identità o contenuti. L'ID pubblico 1657 appartiene già nella base al tutorial di Kamoshida e non fa parte di questo confronto.

### 6.2 Classificazione completa dei 181 residui pubblici

Il coordinatore ha fornito solo gli ID già pubblici delle 181 righe correnti senza luogo; tutti sono presenti nel pacchetto 93. I tipi sotto provengono dalla base pubblica e motivano il trattamento proposto; non attestano una seconda lettura del tipo corrente. Le eccezioni non vengono eliminate. La mancanza di una destinazione di navigazione, quando esiste, rimane un problema distinto dal legame a un luogo.

| Tipo pubblico / numero | ID pubblici | Trattamento motivato |
|---|---|---|
| Passaggio / 67 | 258, 259, 262, 263, 264, 289, 336, 337, 345, 347, 361, 365, 367, 368, 384, 385, 394, 395, 1457, 1460, 1461, 1463, 1464, 1477, 1478, 1480, 1482, 1483, 1501, 1502, 1544, 1545, 1550, 1553, 1554, 1556, 1557, 1559, 1569, 1572, 1614, 1615, 1625, 1626, 1630, 1631, 1632, 1633, 1634, 1635, 1646, 1649, 1651, 1654, 1709, 1713, 1714, 1715, 1716, 1761, 1763, 1764, 1765, 1770, 1773, 1774, 1775 | Conservare come collegamenti/transiti; non creare un luogo per il solo passaggio |
| Dialogo / 35 | 1637, 1638, 1639, 1640, 1642, 1643, 1644, 1650, 1652, 1674, 1685, 1686, 1710, 1725, 1726, 1727, 1728, 1729, 1730, 1731, 1747, 1748, 1749, 1750, 1751, 1752, 1754, 1755, 1756, 1757, 1758, 1762, 1766, 1771, 1772 | Conservare come incontri/dialoghi; non trasformare il personaggio o la conversazione in sede |
| Nota / 32 | 260, 261, 344, 348, 350, 362, 364, 366, 369, 370, 371, 373, 374, 387, 388, 389, 390, 391, 392, 393, 1555, 1558, 1675, 1700, 1701, 1702, 1703, 1704, 1705, 1706, 1707, 1708 | Conservare la funzione annotativa; nessun testo personale è pubblicato qui. Le dieci note tipo104 del Covo restano esplicitamente da identificare nella loro funzione, senza luogo inventato |
| Scala / 18 | 285, 304, 1669, 1670, 1671, 1677, 1687, 1688, 1689, 1690, 1691, 1692, 1693, 1694, 1695, 1696, 1711, 1712 | Collegamenti fra piani, non sedi di attività |
| Punto sensibile / 6 | 315, 1616, 1682, 1683, 1684, 1699 | Eccezione di M§7.9: conservare punti di interazione, senza dedurre luoghi ordinari dalle aule/uffici o dal riferimento al Palazzo |
| Terme / 6 | 1672, 1673, 1680, 1681, 1697, 1698 | Nomi pubblici «Bagno» nel contesto scolastico; eccezione prevista da M§7.9, non sei nuove attività termali né raccordo alle terme di Yongen |
| Treno / 5 | 1645, 1647, 1648, 1653, 1655 | Trasporto verso destinazioni, non nuovo luogo per ciascun collegamento |
| Uscita / 4 | 372, 1627, 1628, 1629 | Navigazione/uscita mappa; non sede |
| Cercalavoro / 2 | 1488, 1489 | Bacheche dei lavori: funzione informativa, distinta dalle sedi di lavoro proposte |
| Confidente / 2 | 1753, 1767 | Pin di Ann e Yoshida: non luoghi autonomi; preservare visibilità e legame del Confidente |
| Casa / 1 | 1641 | Casa di Sojiro a Yongen: candidato `yongen-jaya/sakura-residence`, da riconciliare mantenendo `solo_eventi_confidente=futaba`. Non escludere automaticamente e non rendere il luogo sempre visitabile |
| Culto / 1 | 349 | Chiesa sulla mappa Cappella a Kanda: candidato `kanda-jinbocho/chiesa-kanda`. Confrontare identità e orari; non escludere solo perché fuori dai sei tipi commerciali |
| Ingresso Palazzo / 1 | 1656 | Ingresso Kamoshida: mantenere il dominio ingresso/Palazzo e le sue condizioni, senza creare una sede cittadina |
| Velluto / 1 | 2022 | Accesso alla Stanza di Velluto in Central Street: riconciliare il collegamento al servizio, non inventare un negozio o un quartiere. Caso ancora aperto |

Totale 181/181 ID pubblici, senza ripetizioni. Questa classificazione completa l'inventario e le motivazioni, **non chiude** i raccordi Casa/Chiesa/Velluto né prova il corretto funzionamento di ogni passaggio. I 31 candidati del §6.1 e i tre casi qui esplicitati richiedono ancora riconciliazione puntuale.

### 6.3 Prove aggiuntive e decisioni concrete, senza applicazione

Lettura aggiuntiva del solo pacchetto pubblico93: esaminati `spillo.nativo_json` (tipo nativo e indice), luoghi, note dei negozi e articoli dei listini. Non sono state scaricate immagini né lette descrizioni personali dell'istanza. I raccordi sostenuti da queste prove sono268→Akiba,269→Gachapon,346→Biblioteca,360→Houraku,363→MealPort,1530→Venditore ambulante,1561→Mran Mran,1562→Sukebe; le chiavi esatte sono nella tabella precedente. L'esistenza attuale della destinazione e l'assenza di una modifica concorrente devono diventare guardie della proposta, non domande all'utente su fatti già determinati dal catalogo.

Per268, la [fonte giapponese su Akihabara](https://wikiwiki.jp/persona5r/%E7%A7%8B%E8%91%89%E5%8E%9F) distingue Akiba Electronics come negozio di utensili, separato da elettrodomestici e merchandising; i materiali e gli strumenti da PC concordano col listino pubblico `akiba`. La proposta non si basa sul nome generico «elettronica».

Riscontro corrente aggiuntivo attribuito al coordinatore:268/269/360/363/1561/1562 sono seed senza riferimento, con destinazioni seed visibili e Area NULL;346 e1530 sono personali senza riferimento, e anche la Biblioteca è personale con Area già corrispondente. **La provenienza seed non costituisce consenso alla conversione:** M5 §7.9 richiede l'approvazione specifica dell'elenco, distinta dall'eccezione degli undici pin enumerati. Tutti gli otto raccordi restano proposte; per i sei seed il coordinatore prepara una bonifica inattiva, mentre i due personali richiedono il sì specifico e lo scrittore ordinario. Nessuna associazione o collocazione è stata applicata da questo documento.

**1486 è distinto da1487:** nel pubblico93 il primo ha icona nativa49 dei succhi, il secondo è già collegato a KiyasuKu in altra posizione della medesima planimetria. La nota pubblica KiyasuKu distingue il chiosco dei succhi nella stessa zona. Il coordinatore ha confermato i due pin correnti, entrambi personali. Scheda da presentare all'utente: prima1486 senza riferimento; dopo1486 collegato a un nuovo luogo «Chiosco dei succhi del Sottopasso», Area Sottopasso, preservando posizione, nome, descrizione, condizioni e stato. Certezza alta della distinzione dei due esercizi; il sì serve a modificare il pin personale e creare il luogo. L'offerta storica `chiosco-kiyasuku/succo-aojiru` e i suoi acquisti rimangono invariati finché non esiste un piano separato per il raccordo commerciale, con guardie e conservazione della storia. Non è una ragione per collegare i due pin allo stesso negozio.

**Jose nel Covo:** la [guida AGS del Covo](https://www.allgamestaff.it/persona-5-royal/covo-dei-ladri/) lo identifica come guida delle funzioni all'ingresso. Propongo quindi l'eccezione informativa per386, senza sede commerciale dei Memento. La stessa fonte distingue le funzioni Palace Maker, musica, film, galleria e gioco di carte e quattro categorie di premi. I tipi nativi98…103 concordano con375…383, ma non associano ciascuno dei quattro pin Premi a una categoria specifica. Nessuna categoria viene assegnata per semplice ordine degli ID.

Scheda Covo da decidere sul modello, non sui fatti del gioco: mantenere375…383 come servizi interni distinti dell'Area Covo, collegati alle rispettive sezioni della scheda Covo, oppure introdurre luoghi interni al Covo con ambito esplicito. Il modello corrente `luogo` appartiene a un quartiere; inventare un quartiere cittadino per ospitare questi servizi sarebbe scorretto. La proposta preferita è il raccordo ai servizi del Covo, conservando tutti i pin e motivando l'eccezione rispetto al raccordo commerciale cittadino; richiede approvazione della resa nell'app prima di sostituire la precedente proposta di nuovi luoghi. I quattro pin Premi restano quattro accessi distinti alla sezione Premi finché manca la corrispondenza delle categorie, senza fusione dei pin.

Gli altri casi non diventano decisioni dell'utente per mancanza di ricerca: distributori272…275/339/359/1564…1566 richiedono ancora l'identità dei listini;1636 manca di metadati nativi e la descrizione pubblica è vuota, quindi il nome «Lavoro part-time» non prova una bacheca. La proposta di esclusione1636 resta non dimostrata.1584/1769 hanno un problema di listino distinto dalla posizione: nel pubblico, cortile Shujin vende anche Dr. Salt NEO, mentre bagno Yongen ha Arginade e Acqua della rinascita; il listino Cancello2 comprende Joylent, Punch non filtrato, Tè energetico e Acqua di Udagawa. Questi dati rendono confrontabile la scelta, ma non dimostrano da soli quale inventario abbia la macchina del pin. Non chiedere all'utente di approvare una sostituzione ancora priva della prova geografica/merceologica richiesta.

## 7. Undici pin seed e note dei pin

Per M§1.2.6/§7.8 cercare gli ID pubblici 221, 222, 223, 224, 225, 227, 228, 229, 231, 233, 234 e le chiavi previste dalla 115: `harajuku/harajuku-hangout`, `ueno/museo-ueno`, `inokashira-park/inokashira-hangout`, `odaiba/odaiba-seaside-park`, `shinagawa/shinagawa-acquario`, `yokohama-chinatown/chinatown-hangout`, `maihama/destinyland`, `roppongi/okumura-foods-hq`, `meiji-shrine/meiji-shrine-hangout`, `suidobashi/dome-town`, `asakusa/asakusa-hangout`. Il coordinatore riferisce nove presenti e coerenti (221, 222, 225, 227, 228, 229, 231, 233, 234); **223 e 224 assenti**, da non ricreare. La 115 richiedeva origine seed, nessun riferimento precedente e corrispondenza di nome/quartiere: una riga attuale diversa va riconciliata, non riscritta automaticamente.

M§7.7 conserva 38 descrizioni e 3 nomi discordanti come note, lasciando all'utente il gesto di trasferirli o toglierli. Questi numeri sono storici. L'endpoint non esporta le descrizioni dei pin né le descrizioni dei luoghi: non può chiudere questa parte con un confronto dei testi. Qualsiasi eventuale verifica ulteriore rimane in memoria nell'app e non pubblica i contenuti personali. Stato: **IN ATTESA**, nessuna nota dichiarata rimossa o riconciliata.

Lettura separata delle mappe riferita dal coordinatore: 26 mappe con pin risolti, 23 `notaPin` non vuote nel DTO. Attesta la presentazione di quelle 23 note nel perimetro letto; non la conservazione integrale delle 38 descrizioni storiche, la correttezza di ogni trasferimento o il consenso dell'utente a trasferirle. La copertura precedente resta aperta.

## 8. Resoconto corrente da ricevere e criteri di chiusura

| Gruppo | Risultato corrente | Proposte da presentare | Approvazione / applicazione |
|---|---|---|---|
| Tanaka / TV / Niijima / Prossimo Asso | Tre sedi NULL; Prossimo Asso collegato al luogo previsto | Tanaka/TV ancora da decidere dopo confronto; Niijima senza sede cittadina | Nessuna nuova applicazione |
| Pin 1769 / 1584 e tre casi coerenti di confronto | Tre `sede-pin` coerenti; due casi ancora risolti geograficamente a Shujin | Identità delle macchine e listini corretti ancora da accertare | Nessuna nuova applicazione |
| Tredici candidati storici e tutti gli altri luoghi senza Area | 51 chiavi censite; tredici candidati ancora NULL | Otto collocazioni sostenute da legami indiretti, altre classi da approfondire | Nessuna nuova applicazione |
| Intera popolazione dei pin del mondo, con eccezioni motivate | 296 correnti, 84 risolti, 212 senza luogo; 31 candidati pubblici esatti e 181 residui classificati | Proposte per tutti i 31; fra i 181 rimangono raccordi Casa/Chiesa/Velluto da approfondire | Nessuna nuova applicazione |
| Undici seed omonimi e note personali dei pin | Nove coerenti, due assenti da non ricreare; note non confrontate | Nessuna ricreazione; note **IN ATTESA** | Nessuna nuova applicazione |

Il resoconto della Regia dovrà indicare fonte e momento della lettura, copertura per gruppo, conteggi per esito e sole decisioni realmente necessarie, senza riportare payload o testi privati. Una decisione già documentata va rispettata; una divergenza dalla base pubblica può essere un lavoro dell'utente valido. Si chiude ogni riga soltanto con evidenza della riconciliazione, decisione quando necessaria e verifica distinta della consegna. La sola disponibilità dell'endpoint, l'assenza di anomalie strutturali o l'approvazione statica del codice non chiudono L5.
