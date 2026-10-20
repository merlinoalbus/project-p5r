# No-reg di L3 su 48d7a958 (linea di rilascio newreview-l3) — passo A3 — VERDE

Test no-reg, 2026-10-20, dalle 12:03Z alle 12:18Z. Esito: **VERDE**. NR3-4 risulta verificato e non ci sono difetti nuovi.

## Che cosa ho confrontato
- **Dati**: la copia di p5s `p5s-2026-10-20-0948Z` (gioco `51b4847e…`, versione 113; partite `29dbd770…`, versione 24). Ho fatto tre copie
  e le ho avviate davvero: «prima» con `b28bade7` (BE 3287, FE 5287), «dopo» con `48d7a958` (BE 3286, FE 5286), «L2» con `bff237e0`
  (BE 3285, FE 5285; serve solo per l'intestazione).
- All'avvio nessuna delle tre applica migrazioni: i dati sono già alla versione 113 e utente 024.
- **Browser**: l'istanza del Collaudo 5473 → 3301 su `48d7a958` (ho verificato il `git log` della sua cartella), con dati identici alla
  0948Z. Solo letture, dalle 12:06Z alle 12:18Z.
- Le miniature `?l=` scrivono la cache `immagine_miniatura` del Collaudo; è l'unica scrittura.

## 1. NR3-4: 640 indirizzi `/guida/mappe/<k>` dei Palazzi su 5473 → VERIFICATO
- Elenco identico a quello del giro precedente: 640 indirizzi, ricalcolati con `risolvi` sulla 0948Z.
- **Primo giro** (12:06:11Z–12:11:40Z): **640/640** arrivano alla casa giusta.
  - Radici: 18/18 → `/guida/dungeon/<k>`, con il nome del Palazzo.
  - Alias della guida: 83/83 → `?infiltrazione=<i>`, con quell'infiltrazione aperta.
  - Planimetrie: 539/539 con l'immagine del visore uguale a quella della mappa a cui l'indirizzo porta, cioè la stessa di prima di L3.
- **Secondo giro sulle 539 planimetrie** (12:12:48Z–12:17:51Z): ho letto la versione mostrata. Qui non è più un segmento premuto ma il
  pulsante con il nome della versione e «versione k di N».
  - **539/539** con indirizzo e immagine giusti.
  - **379** indirizzi in Aree con più versioni (72 Aree): nome **e** numero della versione uguali all'atteso, 379/379. Per i 144 senza
    `?planimetria=` si apre la predefinita, 144/144.
  - **160** indirizzi in Aree con una sola versione: immagine giusta, 160/160.
- **Gli 80 indirizzi sbagliati del giro precedente** (37 Aree, `../fe-5373/indirizzi-640.txt`): **80/80 aprono ora la planimetria giusta**.
  - Esempi: Kamoshida Tetto «Scala», v1/5 (151-6-0); Madarame Sala del Tesoro – Galleria «Livello -2», v3/3 (153-7-0).
  - In 68 il nome e il numero della versione coincidono con l'atteso.
  - Negli altri 12, cioè 6 Aree (Futaba Corridoio principale; Shido Ponte piscina, Sala d'ingresso, Sala intrattenimento 2P; Maruki
    Ripostiglio, Sala d'ingresso), la riga «versione k di N» non c'è. Sono le 6 Aree in cui la predefinita non ha pin, già viste da Test UX.
    L'immagine è comunque quella giusta, 12/12.

## 2. Lavoro da preservare → identico
- Ho fotografato tutte le tabelle, riga per riga. La base intatta, «prima» e «dopo» sono **identiche: 118 tabelle su 118**
  (`foto-48d7a958-vs-base.txt`, `foto-48d7a958-vs-b28bade7.txt`). Anche l'estesa è identica.
- Diario 04-01..06-01: 255 voci, 342 spunte. Kamoshida 169 voci, 359 pin dell'utente (impronta 373). Madarame 227 voci, 254 pin (impronta 263).
- **Stato visibile p1/p2, «dopo» contro «prima»: 0 differenze** voce per voce e pin per pin.
  - Kamoshida p1: completato 71/71, 107/107 raccolti.
  - Madarame p1: completato 82/82, 88/88.
- Contatore k/N p1 89/89, p2 39·0·50: uguale agli attesi.
- «Sulla mappa»: 255 voci del diario, 75 con mappa, 0 destinazioni diverse.
- Indirizzi: 115 del mondo, 0 diversi; 667 dei Palazzi e dei Memento, risoluzione identica prima e dopo (`indirizzi-palazzi-*.json`).
- I file con gli stati della partita (stato visibile, k/N) stanno nella cartella di coordinamento locale, non nel repository pubblico.

## 3. Metro, indice delle Mappe, pagine di L2 → invariati, salvo E2
- 48 pagine aperte nel browser, «prima» (5287) contro «dopo» (5286), con testo, immagini e link: `/guida/mappe`, `/guida/citta` (con la
  metro), i 19 quartieri e le 28 Aree del mondo (Area e Città).
- **47/48 identiche**: testo, immagini e link uguali. La metro è uguale (`5a633ee2…`, markup normalizzato).
- L'unica diversa è **`/guida/mappe`**: cambiano solo i conteggi, con immagini e link uguali. È **E2** (`c8338fd0`, «l'indice delle Mappe
  conta i pin di contenuto»). Prima: «307 mappe con 1742 spilli», «Tokyo · 298 spilli»; ora: «307 mappe con 767 pin · più 747 passaggi
  e 228 note», «Tokyo · 159 pin». 767 + 747 + 228 = 1742.
- API, 38 endpoint, «dopo» contro «prima», tutti 200: l'unica differenza è il campo nuovo `conteggiPin` nell'albero (307 righe), la stessa E2
  (`api-48d7a958-vs-b28bade7.txt`).

## 4. Intestazione della scheda del Palazzo a 375×812 → nessuna regressione di L3
*Nota del PM, arrivata dopo la misura: il punto non serve più. Per decisione dell'utente l'intestazione occupa al massimo il 30% della
schermata a ogni dispositivo; è il difetto LAY3-5 e lo corregge FE. Le misure qui sotto restano solo come riferimento.*
Ho misurato `main header.card` col metodo di Test layout, sui 9 Palazzi, alla pagina `/guida/dungeon/<k>`, altezza in px:

| Palazzo | L2 `bff237e0` (prima di L3) | `b28bade7` | `48d7a958` |
|---|---:|---:|---:|
| Kamoshida | 643 | 622 | 622 |
| Madarame | 651 | 661 | 661 |
| Kaneshiro | 658 | 637 | 637 |
| Futaba | 583 | 562 | 562 |
| Okumura | 693 | 609 | 609 |
| Niijima | 614 | 562 | 562 |
| Shido | 611 | 559 | 559 |
| Iweleth | 547 | 526 | 526 |
| Maruki | 761 | 740 | 740 |

- `48d7a958` contro `b28bade7`: **identica**, 9/9, stessa altezza e stesso testo.
- Contro prima di L3: l'intestazione era già alta 547–761 px. Con L3 scende in 8 Palazzi su 9 (da 21 a 84 px in meno); sale di 10 px solo
  a Madarame, che ha in più la riga «Completato · Tesoro ✓ · Boss ✓».
- Quindi l'altezza di 526–740 px **non è una regressione di L3**: c'era già prima ed è leggermente diminuita.
- Nota: il codice di L2 qui gira sui dati 113.
