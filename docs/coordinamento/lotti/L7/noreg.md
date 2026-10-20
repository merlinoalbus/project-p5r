# L7 «Oggetti» — test no-reg

Sessione «Test no-reg — team p5s». Casi preparati il 2026-10-20 (07:55 locali) per il Manager. Fonti:
- `piano.md` («Per i tester»);
- `modifiche.md` §2 (migrazione M7 e «Verifiche prima/dopo») e §7.5;
- `requisiti.md` R7-19…R7-22;
- l'impronta «prima» di Analisi dati in `dati.md` (`impronta-l7.cjs`, sha **`b4d47371…87dcf`** sulla base 0533Z).

**Si comincia solo col via del Manager.** Esiti grezzi in `esiti-noreg/`.

## 0. Base e metodo
- **Base**: la copia di p5s `dati-produzione/p5s-2026-10-20-0533Z/` (gioco 108, partite 21), avviata su una copia mia col codice di
  newreview fino a L4 compreso (o fino a L5/L6 se arrivano prima di L7). Il «prima» è la copia dopo quell'avvio; il «dopo» è la stessa copia
  avviata col codice di L7. Mai sul 3201 né sull'anteprima del Collaudo; sull'anteprima solo letture, avvisando il Collaudo.
- **Strumenti miei**, gli stessi di L2–L5:
  - `fotografia.cjs` + `confronta-colonne-comuni.cjs`: riga per riga e campo per campo, sulle sole colonne di prima, così le colonne e le
    tabelle nuove di L7 restano fuori;
  - `impronta-estesa.cjs`, `stato-visibile.cjs`, `sulla-mappa.cjs`;
  - `l5-base.cjs` per luoghi, negozi, articoli e acquisti, con le risposte API (`/compendio/negozi`, dettaglio dei 61 negozi, `/catalogo/*`);
  - più l'impronta di Analisi dati (`impronta-l7.cjs`), rifatta da loro o da me con lo stesso script.
- **Lavoro da preservare** (base 0533Z):
  - diario 255 voci, 342 spunte;
  - Kamoshida 169 voci / 359 pin dell'utente;
  - Madarame 227 / 254;
  - impronta `ff3033cb…`; dopo la 110 vanno escluse come «validata» le 4 colonne nuove del diario.

## 1. Casi (con l'atteso)
| # | Quando (piano) | Caso | Atteso |
|---|---|---|---|
| N7-1 | B1 (M7) | Impronta di Analisi dati rifatta **escludendo** le 6 tabelle e le 4 colonne nuove | **Stessi sha riga per riga** di `b4d47371…`: `oggetto` 223, `traduzione/oggetto` 223, `articolo` 587, `negozio` 61, `confidente_regalo` 144, `libro`/`film`/`attivita` 46/30/30, `richiesta` 33, `luogo` 93, voci forziere 129, `dati_guida`, cestino 0, partite (acquisti 7, regali 0, letture 14, progressi 11+3+0, effetti 20, punti negozio 0). **Sole eccezioni dichiarate** (M §2 e G-034), da elencare riga per riga: articoli nuovi di Jose (37) e degli scambi di Sakai (16 finestre); 18 articoli nuovi di Tanaka dalla guida, senza cancellare i 20 di oggi; regalo di Shinya (ordine 1) «4.800 yen» con la nota del testo di prima; ricompensa di «Lo zio ingordo» → «Sciabola del rischio»; condizioni R5-12b; nota di `negozio.orari` di Hagoromo |
| N7-2 | B1 | Articoli esistenti | I **587** articoli hanno chiave, nome, prezzo, negozio e condizioni identici (colonne comuni); si aggiunge solo `catalogo_chiave` / `costo_json`. Le condizioni `articolo`, **40 occorrenze in 20 articoli**, puntano tutte a chiavi valide, prima e dopo |
| N7-3 | B1 | Equipaggiamento del dataset | 223 righe di `oggetto` con nome e statistiche invariati; nessuna rinomina. I 5 articoli sui 3 nomi coincidenti sono collegati a quelli |
| N7-4 | B1 | Idempotenza | Una seconda esecuzione della M7 scrive 0 righe |
| N7-5 | B1 | Partita reale p1 e partita di prova (R7-19) | `acquisto_partita` 7, `regalo_partita` 0, `lettura_partita` 14, progressi libri 11, film 3, videogiochi 0, `effetto_lettura_partita` 20, `punti_negozio_partita` 0: **identici riga per riga** (con le date). Su una partita di prova creata da me: un acquisto, una lettura e un progresso, prima e dopo la M7, con stessi effetti (punti, Doti) |
| N7-6 | B3 | Avanzamenti di libri e film (R7-20) | Le **62 voci dei libri e le 22 dei film** del diario avanzano come prima. La pagina e l'API del percorso per i giorni che le contengono (04-09..06-01) restano uguali nei testi, nelle spunte e nei collegamenti, salvo il link nuovo verso l'oggetto. Storico invariato |
| N7-7 | B3 | Listini, punti negozio, grado cliente, scambi (R7-22) | Per ogni negozio, `GET /api/compendio/negozi/<k>?partita=1` dà gli stessi totali, prezzi e grado cliente di prima (`l5-base.cjs`). Cambiano solo i campi nuovi del catalogo e i listini nuovi dichiarati (Jose, Sakai, Tanaka). I 7 acquisti di p1 restano sugli stessi articoli |
| N7-8 | B4 | Forzieri di Kamoshida e Madarame (R7-21) | Testi delle voci `forziere`/`forziere-chiuso` (129, sha `d3d88c8e…`) **invariati**; `voce_oggetto` **vuota** su Kamoshida e Madarame: solo proposte in `proposta_abbinamento`, nessuna scrittura senza la conferma dell'utente. Stato visibile p1/p2 0 voci e 0 pin diversi |
| N7-9 | B4 | Proposte e fusioni | Le proposte stanno solo in `proposta_abbinamento`; nessuna riga di articolo, voce o regalo cambia prima del «sì». Su una partita di prova: «Approva» scrive il legame, «Rifiuta» non scrive niente, un gesto annullato torna allo stato di prima |
| N7-10 | B5 | Regali della partita reale | `confidente_regalo` invariata (salvo Shinya, dichiarato); `regalo_partita` per chiave: 0 righe oggi, quindi nessuna perdita. Su una partita di prova: un regalo dato, poi cestino e ripristino, tornano allo stato di prima |
| N7-11 | B5 | Cestino dell'oggetto | Il CHECK del cestino ammette `oggetto`; le righe del cestino di prima sono identiche |
| N7-12 | B6 | Giro completo | Diario 255/342 identico. Kamoshida, Madarame, Memento e i 75 «Sulla mappa» invariati. Pacchetto mappe esporta → importa identico. Vitest mirati sui file di L7. Il «non più ottenibile» del forziere 615 (`kamoshida-15-torre-centrale-raccogli-forziere-3`) segue la regola che Stesura approverà (dati.md, anomalia): oggi è un falso positivo da non introdurre |

## 2. Osservazioni preparate
- La regola della «Prova» dell'utente (planimetria di Kamoshida, base 0533Z) non tocca L7.
- Il caso del forziere 615 (1/3 per due pin `rampino`) va provato su una partita di prova: nella p1 vera Kamoshida è chiuso al 100%.
