# L5 — traccia della riconciliazione corrente

Stato: **IN ATTESA del censimento corrente letto dalla Regia**. Preparazione documentale del 21 ottobre 2026; nessuna conformità dei dati dichiarata, nessuna proposta applicata. Questo documento contiene requisiti, chiavi già pubbliche e criteri di confronto. Non contiene una copia dei dati dell'istanza, dei salvataggi o dei database.

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
| `tanaka-affari-loschi` | M§1.2.5 / §7.5: proposta di sede `yongen-jaya/leblanc` per l'acquisto dal portatile | Sede attuale, eventuale modifica esplicita, listino e condizioni proprie. Il servizio commerciale online non autorizza a inventare un pin dedicato o ad assimilare gli orari dell'attività a quelli del locale | **IN ATTESA** |
| `home-shopping-tv` | Stessa fonte: proposta di sede `yongen-jaya/leblanc` per il televisore | Sede, condizioni di disponibilità, percorso dalla pagina del luogo al listino; preservare articoli e riferimenti del diario | **IN ATTESA** |
| `negozio-palazzo-niijima` | Stessa fonte: nessuna sede nel mondo proposta; pagina autonoma mantenuta in M§7.11 | Non assegnare Leblanc o un luogo cittadino. Verificare se esiste una decisione successiva o una sede esplicita nel dominio Palazzo; NULL da solo non è un bug | **IN ATTESA** |
| `prossimo-asso` → `shibuya/prossimo-asso` | M§1.2.5: sede dedotta esplicitamente prevista, implementata dalla 115 solo se mancante | Esistenza del luogo e sede corrente; un valore personale differente non va sovrascritto perché diverso dal riferimento pubblico | **IN ATTESA** |

Nel pacchetto pubblico 93 le quattro chiavi sono presenti e senza sede; questa è esclusivamente un'osservazione sulla base pubblica precedente alla 115. La proposta Tanaka/TV non diventa approvata perché è tecnicamente esprimibile.

## 4. Distributori e pin nominati dalla specifica

Fonte: M§7.6, `dati.md` §4 righe 58–62 e §7.6, G-014 richiamato da quei documenti. Le annotazioni storiche «probabilmente sbagliato» e «non coerente» sono motivazioni per una proposta, non autorizzazioni a cambiare un pin dell'utente.

| ID storico già pubblico | Chiave negozio nella base pubblica 93 | Mappa pubblica | Criterio di confronto / proposta originale | Stato corrente |
|---|---|---|---|---|
| 1527 | `distributore-shujin-edificio` | `nativo-rmap-001-3-0` | Caso dichiarato coerente: un listino condiviso può comparire a Central Street. Conservare; verificare sede specifica e legami L7 | **IN ATTESA** |
| 1547 | `distributore-shujin-edificio` | `nativo-rmap-001-5-0` | Caso dichiarato coerente al Tornello Ginza; stesso controllo | **IN ATTESA** |
| 1768 | `distributore-shujin-cancello-2` | `nativo-rmap-001-3-0` | Caso dichiarato coerente; non estendere a 1769 soltanto perché cita lo stesso negozio | **IN ATTESA** |
| 1769 | `distributore-shujin-cancello-2` | `nativo-rmap-001-3-0` | La specifica segnala il distributore destro di Central Street e la composizione del listino come dubbio. Cercare l'offerta corretta nei dati/fonti attuali; nessuna sostituzione automatica della chiave | **IN ATTESA** |
| 1584 | `distributore-shujin-cortile` | `nativo-rmap-009-2-0` | Proposta originale da sottoporre: `distributore-yongen-bagno`, con luogo pubblico `yongen-jaya/distributore-bagno-pubblico`; verificare che sia davvero quella macchina e quel listino | **IN ATTESA** |

Per tutti e cinque confrontare il listino risolto, la sede specifica del pin, le sedi aggiuntive e il contesto. Conservare nome/descrizione, condizioni, coordinate, planimetria e stati. L7 può avere introdotto una sede strutturata senza cambiare il riferimento storico al listino: ciò non equivale di per sé né a errore né a soluzione semantica di 1769/1584.

## 5. Tredici proposte di Area: chiavi pubbliche da cercare

M§1.2.2 e §7.2 indicano Shinjuku 3, Kichijoji 4, Akihabara 3, Kanda 2, Odaiba 1. La lista seguente è ricostruita dal pacchetto pubblico 93: nei cinque quartieri si selezionano i luoghi senza pin diretto su planimetria nativa né legame `mappa_entita`; i pin sulle illustrazioni del quartiere non provano l'Area fisica. Il risultato coincide numericamente con 13, ma **non è una copia certificata dell'originario `l5-prod.json`**. Serve a cercare e confrontare i casi correnti.

| Quartiere pubblico | Chiavi pubbliche candidate | Proposta originaria da riesaminare | Valori correnti |
|---|---|---|---|
| `shinjuku` | `shinjuku/chihaya-stand`; `shinjuku/fioraio-sukebe`; `shinjuku/mran-mran` | L'unica Area del quartiere, soltanto come suggerimento finché manca prova o approvazione | **IN ATTESA** |
| `kichijoji` | `kichijoji/houraku`; `kichijoji/kichijoji-galleria-kasumi`; `kichijoji/mealport`; `kichijoji/mercante-sakai` | Stessa regola; nessun punto inventato sulla planimetria | **IN ATTESA** |
| `akihabara` | `akihabara/akiba-electronics`; `akihabara/distributori-akihabara`; `akihabara/gachapon-akihabara` | Stessa regola; separare il luogo dai molteplici listini dei distributori | **IN ATTESA** |
| `kanda-jinbocho` | `kanda-jinbocho/chiesa-kanda`; `kanda-jinbocho/nagiuri` | Riesaminare l'attuale distinzione Kanda/Jinbocho: il presupposto storico «una sola Area» può essere superato. Non proporre automaticamente la stessa Area per entrambi | **IN ATTESA** |
| `odaiba` | `odaiba/odaiba-seaside-park` | Stessa regola: l'esistenza di un solo luogo non prova una posizione | **IN ATTESA** |

Ricercare anche tutti gli altri luoghi correnti con `area_chiave=NULL`, compresi quelli nuovi rispetto a queste chiavi: i 13 non esauriscono R5-01. Se un luogo è già collocato, verificare origine della scelta e contesto senza cancellarla per ripristinare il conteggio storico. Area assegnata e pin posizionato sono due fatti diversi. La rimozione autorizzata del riquadro UI «Da posizionare» non elimina l'obbligo di riconciliare l'inventario.

## 6. Pin del mondo senza luogo: popolazione completa e casi pubblici

M§7.9 separa annotazioni, dialoghi, punti sensibili, terme e passaggi senza destinazione dai pin di negozio/ristorante/distributore/attività/cinema/lavoro da proporre come luoghi. Le eccezioni devono avere una motivazione per riga; nessun pin va eliminato per far tornare il numero.

Nel pacchetto pubblico 93, il filtro riproducibile «discendente di `tokyo`, `riferimento_tipo IS NULL`, tipo fra i sei sopra» restituisce **21** pin. Ulteriori **10** pin degli stessi tipi sono sulla radice separata `nativo-rmap-022-1-1` (Covo). Questi due insiemi non vengono forzati nel circa 30 storico, che appartiene a una fotografia e a un perimetro da ricostruire. Il censimento attuale dovrà classificare anche i pin con riferimenti presenti ma non risolti, le mappe senza quartiere e gli altri tipi: questo filtro pubblico è un elenco iniziale, non la prova di copertura corrente.

| Mappa pubblica | ID pubblici iniziali da cercare | Valore corrente |
|---|---|---|
| `nativo-rmap-007-1-0` | 268, 269, 272, 273, 274, 275 | **IN ATTESA** |
| `nativo-rmap-002-1-0` | 339 | **IN ATTESA** |
| `nativo-rmap-002-8-0` | 346 | **IN ATTESA** |
| `nativo-rmap-005-1-0` | 359, 360, 363 | **IN ATTESA** |
| `nativo-rmap-001-1-0` | 1466 | **IN ATTESA** |
| `nativo-rmap-001-2-0` | 1486 | **IN ATTESA** |
| `nativo-rmap-001-3-0` | 1526, 1530 | **IN ATTESA** |
| `nativo-rmap-006-1-0` | 1561, 1562, 1564, 1565, 1566 | **IN ATTESA** |
| `yongen-java-banchina-della-metropolitana` | 1636 | **IN ATTESA** |
| `nativo-rmap-022-1-1` — Covo, ambito separato da classificare | 375–383, 386 | **IN ATTESA** |

Per ogni riga corrente da riconciliare: riconoscere prima se è un luogo concreto, un listino condiviso, un'attività localizzata, un passaggio o un'annotazione. Cercare i luoghi esistenti nel contesto, con prova della corrispondenza; se non esiste un luogo, formulare una proposta nominativa e motivata. Nessun luogo nuovo o cambio dei riferimenti personali senza la decisione richiesta dalle specifiche. I passaggi senza destinazione hanno un problema distinto dalla mancanza di un luogo e non vanno convertiti in luoghi.

## 7. Undici pin seed e note dei pin

Per M§1.2.6/§7.8 cercare gli ID pubblici 221, 222, 223, 224, 225, 227, 228, 229, 231, 233, 234 e le chiavi previste dalla 115: `harajuku/harajuku-hangout`, `ueno/museo-ueno`, `inokashira-park/inokashira-hangout`, `odaiba/odaiba-seaside-park`, `shinagawa/shinagawa-acquario`, `yokohama-chinatown/chinatown-hangout`, `maihama/destinyland`, `roppongi/okumura-foods-hq`, `meiji-shrine/meiji-shrine-hangout`, `suidobashi/dome-town`, `asakusa/asakusa-hangout`. Valori correnti: **IN ATTESA**. La 115 richiedeva origine seed, nessun riferimento precedente e corrispondenza di nome/quartiere: una riga attuale diversa va riconciliata, non riscritta automaticamente.

M§7.7 conserva 38 descrizioni e 3 nomi discordanti come note, lasciando all'utente il gesto di trasferirli o toglierli. Questi numeri sono storici. L'endpoint non esporta le descrizioni dei pin né le descrizioni dei luoghi: non può chiudere questa parte con un confronto dei testi. Qualsiasi eventuale verifica ulteriore rimane in memoria nell'app e non pubblica i contenuti personali. Stato: **IN ATTESA**, nessuna nota dichiarata rimossa o riconciliata.

## 8. Resoconto corrente da ricevere e criteri di chiusura

| Gruppo | Risultato corrente | Proposte da presentare | Approvazione / applicazione |
|---|---|---|---|
| Tanaka / TV / Niijima / Prossimo Asso | **IN ATTESA** | **IN ATTESA** | Nessuna dichiarata |
| Pin 1769 / 1584 e tre casi coerenti di confronto | **IN ATTESA** | **IN ATTESA** | Nessuna dichiarata |
| Tredici candidati storici e tutti gli altri luoghi senza Area | **IN ATTESA** | **IN ATTESA** | Nessuna dichiarata |
| Intera popolazione dei pin del mondo, con eccezioni motivate | **IN ATTESA** | **IN ATTESA** | Nessuna dichiarata |
| Undici seed omonimi e note personali dei pin | **IN ATTESA** | **IN ATTESA** | Nessuna dichiarata |

Il resoconto della Regia dovrà indicare fonte e momento della lettura, copertura per gruppo, conteggi per esito e sole decisioni realmente necessarie, senza riportare payload o testi privati. Una decisione già documentata va rispettata; una divergenza dalla base pubblica può essere un lavoro dell'utente valido. Si chiude ogni riga soltanto con evidenza della riconciliazione, decisione quando necessaria e verifica distinta della consegna. La sola disponibilità dell'endpoint, l'assenza di anomalie strutturali o l'approvazione statica del codice non chiudono L5.
