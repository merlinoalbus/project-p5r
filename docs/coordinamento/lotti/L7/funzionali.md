# L7 «Oggetti» — test funzionali

Stato: **casi preparati** (bozza di Analisi requisiti del 2026-10-20 07:45, rivista e completata da Test funzionali lo stesso giorno: rotte
di `modifiche.md` §4, F7-15 sui forzieri, F7-30…F7-32 aggiunti, due cifre di `modifiche.md` §2 da allineare). Il file è di Test funzionali.
Esecuzione a pezzi secondo la tabella «Per i tester» di `piano.md`, col via del Manager.

> **Cifre da allineare in `modifiche.md` §2 «Verifiche prima/dopo»** (segnalate a Stesura): letture ed effetti delle letture della partita
> 13 e 19 contro **14 e 20** misurati sulla base (qui sotto, e `modifiche.md` §5.1 che cita Analisi dati §11): vale la misura sulla base
> corrente. Le condizioni `articolo` invece tornano: **40 condizioni su 20 articoli** (alcuni ne hanno due; Analisi requisiti, ricontate sulla 0533Z).

- **Fonti**: `requisiti.md` (R7-01…R7-26, R7-03b, R7-11b; dubbi 1–7), `modifiche.md` (§1 modello, §2 migrazione M7 con le verifiche, §3 letture,
  §4 API e DTO, §5 interfaccia, §7 piano, §8 da approvare), `dati.md`, registro dell'Esperto (G-013, G-014, G-018, G-024, G-026).
- **Base**: `dati-produzione/p5s-2026-10-20-0533Z` (gioco 108, partite 21; uguale alla 0503Z più la planimetria di prova
  `palazzo-di-kamoshida-prova` dell'utente, che resta). Misure «prima» in sola lettura su una copia della base (Analisi requisiti, 07:40 ora locale). Gli attesi
  «dopo» vengono da `modifiche.md` §2 e §5.1 e vanno confermati da Analisi dati dopo il boot di L2–L7.
- **Partite**: p1 «Partita Roberto» (attiva, 06-02 giorno), p2 «Tutorial» (04-29). Scritture sulla partita solo su una **partita di prova**
  creata apposta e poi eliminata; scritture sui dati di gioco (catalogo, conferme delle proposte, fusioni, cestino) solo sul **Collaudo (foto e
  ripristino), anteprima 3302/5474**.

## Misure «prima» sulla base 0533Z (sola lettura)
| Misura | Valore |
|---|---|
| `oggetto` (equipaggiamento del dataset) | 223 |
| articoli | 587: arma 143, consumabile 101, accessorio 72, protezione 62, regalo 50, libro 41, altro 39, cibo 37, materiale 35, videogioco 7 (equipaggiamento dei listini 277) |
| regali dei Confidenti (`confidente_regalo`) | 144, per nome |
| libri / film / videogiochi | 46 / 30 / 7 |
| articoli di Tanaka | 20 (nomi in inglese) |
| condizioni di tipo `articolo` | **40 condizioni su 20 articoli** (alcuni ne hanno due), tutte su articoli (0 su pin, libri, film, luoghi, requisiti) |
| prezzi citati nei casi | Braccialetto d'argento 68.000 (Tsurukame Diamond); Chiesa di Kanda: Vino della grazia 14.000, Ceneri del pentimento 12.000, Acqua battesimale 1.000, Acqua benedetta 2.000 |
| partite | acquisti p1 7; letture 14 (p1 11, p2 3); progressi libri 11 (9 + 2), film 3 (2 + 1), videogiochi 0; effetti delle letture 20 (16 + 4); regali 0; punti negozio 0 |
| copie di dati della guida | `dati_guida.oggetti-guida` (consumabili, chiave, materiali, scambi) e `dati_guida.jose` (37 scambi) |
| Palazzi | Kamoshida p1 concluso e completato (71/71); Madarame p1 concluso e completato |

## Casi
| id | Criterio | Dove | Passi | Atteso |
|---|---|---|---|---|
| F7-01 | R7-01 | API, sola lettura | `GET /api/catalogo-oggetti?categoria=` per ogni gruppo | Un solo catalogo con chiave `<categoria>/<slug>`, nome italiano, nome originale, categoria, effetto, descrizione. Totale = 661 (223 + 355 + 46 + 30 + 7) + gli oggetti promossi dai listini e i regali non in vendita, con il numero esatto del test della migrazione |
| F7-02 | R7-02 | API, sola lettura | Righe dei tre cataloghi di oggi (223 + 355 + 587) | Ognuna è collegata a un oggetto oppure ha una proposta in «Abbinamenti da approvare»; nessuna riga persa |
| F7-03 | R7-03, R7-03b | API, sola lettura | Equipaggiamento del dataset e dei listini | I 223 del dataset e i 277 dei listini restano oggetti **distinti**; solo i 5 articoli dei 3 nomi uguali sono collegati all'oggetto del dataset; **0** proposte di fusione per l'equipaggiamento dei listini; nessun oggetto del dataset rinominato |
| F7-04 | R7-03b | Browser | Un oggetto con la forma estesa e l'abbreviata nella guida (es. «Amuleto dell'Imperatore» / «Amul. dell'Imperatore») | Si mostra l'estesa; la ricerca trova anche l'abbreviata |
| F7-05 | R7-03 | Collaudo (foto e ripristino), anteprima 3302/5474 | Conferma di una proposta di fusione «catalogo» fra due oggetti (`POST /api/catalogo-oggetti/proposte/conferma {riga_tipo: 'catalogo', riga_chiave, catalogo_chiave}`), poi ripristino dal cestino (`POST /api/impostazioni/cestino/:id/ripristina`) | Gli articoli e i legami del secondo passano al primo, il secondo va nel cestino; rimesso, torna con i suoi legami |
| F7-06 | R7-04 | Collaudo (foto e ripristino), anteprima 3302/5474 | Rinomina di un oggetto collegato (es. Medicina) | Il nome cambia in listino, ricerca, condizioni, popup del pin, diario; un articolo **non** collegato mostra ancora il suo nome; lo storico già scritto («Acquistato: …») non cambia |
| F7-07 | R7-05 | Browser | Pagina di un libro, di un film e di un videogioco | Hanno la pagina dell'oggetto con la sezione di lettura/visione/gioco di oggi; `/guida/libri`, `/guida/film`, `/guida/videogiochi` restano con l'avanzamento e il nome porta all'oggetto |
| F7-08 | R7-06, R7-07 | API + browser | Prezzi di un oggetto venduto in più negozi; Braccialetto d'argento; Chiesa di Kanda | Il prezzo viene solo dall'articolo; la pagina dice «Da X ¥ a Y ¥» con i negozi; Braccialetto **68.000** con la nota «78.000 nella pagina dei regali»; Chiesa di Kanda 14.000 e 12.000; **dubbio 3 (G-034)**: Modellino di moto **4.800 ovunque**, regali compresi; Dango lunare **800** con 640 in nota; Agodashi Oden **900** con 800 in nota; le copie (`libro.prezzo`, `film.prezzo`, `confidente_regalo.costo`, `oggetti-guida.prezzo`) non si mostrano come prezzo dove c'è un articolo |
| F7-09 | R7-08 | Browser, partita 1 | Pagina dell'oggetto Medicina (o un consumabile venduto in più negozi) | «Dove si compra» elenca tutti i negozi con prezzo, condizioni, «aperto adesso?» (L5) e il link alla sezione del negozio nella pagina del luogo |
| F7-10 | R7-09 | API | «Dove si trova» dei 46 libri | Da articoli e posizioni per chiave; le 2 posizioni senza articolo di oggi hanno un oggetto o sono in elenco |
| F7-11 | R7-10 | Browser, partita di prova | Pagina di un regalo gradito; «Regala» (`PUT /api/partite/<prova>/confidenti/:k/regali {catalogo, fatto}`), poi lo stesso con il nome (`{regalo: <nome>, fatto}`) | «A chi piace» elenca i Confidenti con il gradimento e il link; costo e «dove» dall'articolo; il regalo si registra per chiave (`regalo_partita.catalogo_chiave`) e per nome (compatibilità) nella **stessa riga** (nessun doppione); togliendolo si toglie |
| F7-12 | R7-11 | API, sola lettura | Contenuti dei forzieri | Voci dei Palazzi non dell'utente (Kaneshiro…Maruki, Iweleth): contenuti certi collegati (53); **Kamoshida e Madarame: `voce_oggetto` vuota**, contenuti solo come proposte da confermare; testo `dettagli.contenuto` invariato |
| F7-13 | R7-11 | Collaudo (foto e ripristino), anteprima 3302/5474 | Conferma di una proposta di contenuto su un forziere di Kamoshida, dalla voce (chip «Contenuto: proposta») | Il legame si scrive; il forziere compare in «Dove si trova» dell'oggetto con Palazzo › infiltrazione › area; il testo della voce non cambia. Ripristino |
| F7-14 | R7-11b | Partita di prova | Palazzo concluso con un forziere non preso; un forziere con il pin forziere raccolto e i pin di percorso no (caso di `kamoshida-15-torre-centrale-raccogli-forziere-3`, pin 615 sì, 2010 e 2016 no) | Il primo è «Non più ottenibile»; il secondo è «Preso» (conta il pin forziere, non i rampini); con il Palazzo non concluso è «Da prendere». Un Seme mancante dice «Si compra da Jose» |
| F7-15 | R7-11b | API, partita 1 | `forzieri[].stato` nelle pagine degli oggetti contenuti nei forzieri di Kamoshida e Madarame (`GET /api/catalogo-oggetti/:categoria/:slug?partita=1`) | Kamoshida p1: tutti i forzieri «preso», **0 «non più ottenibile»** (21 sulla 0440Z con la regola del pin forziere, `modifiche.md` §5.1; sulla 0533Z, con Kamoshida chiuso dall'utente, da rimisurare); Madarame p1 19/19. Il 71/71 è il completamento di L4 (oggetti permanenti), non questo conteggio. Calcolo nel server, mai nel client |
| F7-16 | R7-12, R7-12b (G-034) | Browser + API | Pagina di un oggetto ricompensa di una Richiesta e di un libro premio («Shitamachi rinato»); ricompense di «Lo zio ingordo»; le carte abilità ricompensa; la Corona del tumulto | «Dove si trova» cita la Richiesta per chiave; il libro premio non ha listino; «Lo zio ingordo» → **«Sciabola del rischio»** (non «Venture Saber»); carte abilità con i nomi italiani: Annulla att. fisici, Termopili, Rimonta, Crescita 3, Mediarama, Carica, Recupero 3; la **Corona del tumulto è un accessorio** (categoria) |
| F7-17 | R7-13 | API + browser | Listino di Jose; Mercante Sakai in una finestra (es. 07-26→07-30) e fuori | Jose: 37 scambi con il costo in fiori e i requisiti; Sakai: lo scambio della finestra (per es. Razione militare → «La fattorizzazione»), nessuno fuori finestra; Tanaka (**R7-13b, G-034**): prima del sì dell'utente il listino di oggi (20 articoli) è **invariato** e la voce di Tanaka è nell'elenco «Da rivedere» (R11-10c) con i **18 articoli di Royal** (nomi italiani, gradi di spesa) affiancati ai 20 di oggi, con gli abbinamenti probabili e possibili e i **10 nomi senza corrispondenza**. Dopo il sì (solo sulla partita di prova, Collaudo con foto e ripristino): 18 articoli ai prezzi della guida, Homunculus **5.000** |
| F7-18 | R7-14 | API | Ricette di fabbricazione del Covo | I materiali citati per chiave, dove l'abbinamento è esatto; gli altri in proposta |
| F7-19 | R7-15 | API, partita 1 e partita di prova | Le **40 condizioni `articolo` su 20 articoli**: esito per articolo prima (base «prima» del tipo di quella di L6) e dopo la M7 | Stesso esito prima e dopo, per ognuna delle 40 |
| F7-20 | R7-16 | Browser | Link a un oggetto da listino (`ArticoliTabella`), regali del Confidente, forziere, ricompensa, popup del pin, libri/film/videogiochi, ricerca | Tutti portano a `/guida/oggetto/<categoria>/<slug>`; `/guida/oggetti`, `/guida/libri`, `/guida/film` restano senza 404 |
| F7-21 | R7-17 | Collaudo (foto e ripristino), anteprima 3302/5474 | Modifica di un oggetto (`PUT /api/catalogo-oggetti/:categoria/:slug`), «Ripristina»; import del pacchetto; eliminazione (`DELETE`, cestino tipo `oggetto`) e ripristino dal cestino | La correzione resta dopo l'import; «Ripristina» torna alla guida; nel cestino va con i legami, gli articoli tornano senza catalogo; rimesso, tutto torna |
| F7-22 | R7-18 | Collaudo (foto e ripristino), anteprima 3302/5474 | Export e reimport del pacchetto | Catalogo e legami per chiave uguali; un pacchetto vecchio si importa |
| F7-23 | R7-02, R7-03 | Collaudo (foto e ripristino), anteprima 3302/5474 | «Abbinamenti da approvare» (`GET /api/catalogo-oggetti/proposte?riga_tipo=&stato=`): «Conferma» (`…/proposte/conferma`), «Scegli un altro oggetto» (`PUT /api/catalogo-oggetti/legami`), «Scarta» (`…/proposte/scarta`) | Ogni gesto agisce sulla sola riga; la scartata resta scartata; chip «Da approvare · N» solo con N > 0 |
| F7-24 | R7-19 (NR) | API, partita 1 | Acquisti, regali, letture, visioni, progressi | Uguali: acquisti 7, letture 14, progressi libri 11 / film 3, effetti delle letture 20, regali 0 |
| F7-25 | R7-20 (NR) | Browser, partita 1 | Diario 04-01..06-01 (255 voci); voci di libri e film | Voci identiche; i link portano all'oggetto giusto; le letture avanzano come prima |
| F7-26 | R7-21 (NR) | API | Testi delle voci dei forzieri di Kamoshida (169 voci) e Madarame (227) | Invariati; solo legami in più dopo una conferma |
| F7-27 | R7-22 (NR) | API, partita 1 | Totali di listini, punti negozio, grado cliente, scambi | Uguali a prima (punti negozio 0) |
| F7-28 | R7-23 (NR) | Comandi | Typecheck, lint, test mirati di `modifiche.md` §7.1 | Verdi, con output grezzo |
| F7-29 | R7-24 (controllo funzionale) | Browser 375, partita 1 | Ricerca di «Medicina» | In un colpo: dove comprarla oggi (negozio aperto, prezzo) e a chi regalarla, se è un regalo |

| F7-30 | R7-08 (`modifiche.md` §5.1, §7.3) | Browser, partita di prova | Pagina della Medicina › «Dove si compra» › acquisto con la spunta su un negozio; poi la si toglie | L'acquisto si registra nella partita di prova come dalla sezione del negozio (stessa riga, stesso prezzo); il grado cliente e la spesa seguono; tolto, tutto torna; la partita 1 non cambia |
| F7-31 | R7-21 (`modifiche.md` §5.1, Analisi app §9) | Collaudo (foto e ripristino), anteprima 3302/5474 | Su un forziere di un Palazzo senza lavoro dell'utente: (1) modificare il testo `dettagli.contenuto` dalla voce; (2) «Collega a un oggetto» / «Togli» dalla riga «Contenuto» | (1) il legame `voce_oggetto` non cambia; (2) il testo non cambia: nessuna sincronizzazione nei due sensi. Ripristino |
| F7-32 | R7-21, L4 §8.10 (`modifiche.md` §5.1) | Collaudo (foto e ripristino) + API | Conferma della proposta di contenuto di un forziere (F7-13), poi `GET /api/compendio/dungeon/<k>?partita=` | `completamento` (oggetti, fatti, tesoro, boss, concluso, completato), `carattere` e stato delle voci **identici** a prima: `voce_oggetto` non tocca il conteggio di L4 |

**UX e layout**: R7-25 e R7-26 li provano Test UX e Test layout; qui solo il controllo funzionale di F7-29.

**Vitest mirati** (`modifiche.md` §7.1 e §7.2): sui file pronti, con `DATA_DIR` su una cartella vuota, output grezzo nell'esito (F7-28).

## Note per Test funzionali
- Gli attesi «dopo» di F7-01, F7-02, F7-03, F7-12 e F7-17 vanno confermati da Analisi dati: `modifiche.md` §2 rimanda ai numeri esatti del test
  della migrazione sulla copia.
- I distributori a set condivisi (`negozio_luogo_extra`, dubbio 7) e il set C della Creatura si provano solo dopo il sì dell'utente.
