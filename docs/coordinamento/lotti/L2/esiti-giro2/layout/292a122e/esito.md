# L2, giro 2 — correzioni del validatore R2 (layout), R3, R4 sul commit finale 292a122e (Test layout, 2026-10-20)

Collaudo BE 3301 / FE 5473 su **292a122e**, base p5s-0533Z. Sopra 872ac976 ci sono:
- 115581b4: UX2-13;
- 0268751a: E4, E5, E7;
- 3a056190: UX2-15;
- 292a122e: ROADMAP.

Solo letture. Unica scrittura sui dati: la cache `immagine_miniatura`, che le letture `?l=` riempiono.
Misure nell'iframe della stessa origine, grande quanto la finestra, con le animazioni finite.

Preferenze trovate nel browser e lasciate invariate:
`{"graficaPredefinita":true,"vistaPersona":"piastrelle","menuRidotto":true,"mappaHomeChiusa":false}`.
Per R3 e R4 ho rifatto da 1024 in su anche le misure col menu pieno, la configurazione predefinita della barra laterale. Ho messo
`menuRidotto:false` solo per quel blocco e poi ho rimesso la stringa originale, identica (controllata).

## R3 — UX2-15, una sola barra in `/guida/mappe`: **verde**
Ogni misura in quattro stati: indice chiuso, Tokyo aperto, Madarame aperto, «Elenco completo» di Tokyo aperto. Misure: 1366×657,
1280×689, 1024×690, 1920×1080, 768×1024, 375×812, 1280×800. In tutto 48: 28 col menu ridotto e 20 col menu pieno.
- Una sola barra: quella di `main`. Nessun altro elemento scorre in verticale o in orizzontale, e il documento resta grande quanto la finestra.
- Nessuno scorrimento orizzontale.
- In fondo alla pagina si raggiunge sempre l'ultimo elemento: «Mostra le planimetrie senza spilli · 4», l'ultima carta di Madarame,
  «Area riservata allo staff» nell'Elenco.
- `main` con Tokyo aperto, col menu ridotto: 2342/589 a 1366×657, 2764/622 a 1024×690, 3131/752 a 375×812. Con l'Elenco aperto: 3968,
  4390 e 4779. Valori completi in `R3-misure-grezze.json`.
- **Schermata scartata.** `SCARTATA-tokyo-aperto-cattura-in-transizione.jpg` mostra le carte tagliate a destra: l'utente l'ha
  segnalato, e ha ragione sulla schermata. La cattura è avvenuta mentre il pane cambiava misura: il quadro è 800×600 con la pagina
  impaginata a 1280. Nello stesso momento il DOM dava `scrollWidth` 1280/1280 e 0 elementi oltre il bordo.
- Controlli fatti dopo la segnalazione, tutti con 0 elementi oltre il bordo:
  - larghezze intermedie 800, 900 e 1000 px con Tokyo aperto (doc 800/800, 900/900, 1000/1000);
  - scheda reale a 1024×768 senza emulazione;
  - scheda a 1280×689 di nuovo, con schermata buona `tokyo-aperto-1280x689.jpg`: tre colonne di carte, «Apri Tokyo» e il selettore
    della partita dentro lo schermo.

## R4 — carta di Tokyo col testo di E4 ed Elenco di Tokyo: **verde**
- «Città · 298 spilli · 23 quartieri · 23 aree» è intero a tutte le misure e senza puntini:
  - 157/157 su due righe da 1280 in su;
  - 149/149 a 1024×690 col menu pieno, 182/182 su una riga col menu ridotto;
  - 118/118 a 768;
  - 87/87 su tre righe a 375.
- Chip «1 da verificare» invariato: 91×44, `rgb(229, 53, 43)`, stessa destinazione, riceve il tocco.
- Carta di Tokyo: 300×133 da 1280 in su (le altre 90), 86 a 1024 e 768, 99 a 375.
- Indice **622/622 a 1024×690** (con entrambi i menu) e **964/964 a 768×1024**.
- «Elenco completo» di Tokyo, 92 righe:
  - nessun testo troncato, nessun testo a una lettera per riga, nessun bersaglio sotto i 44 px;
  - le forme dei conteggi sono solo «N spilli», «N versioni · N spilli» e «N spillo»;
  - nessuno scorrimento orizzontale.
- Valori in `R4-misure-grezze.json`. LAY2-7 è chiuso sull'hash 292a122e.

## R2, parte layout — La città, quartieri e Palazzi dopo UX2-13: **verde**
Pagine: `/guida/citta`, Shibuya, Odaiba, Yongen-Jaya, Kamoshida, Madarame. Misure: 1366×657, 1280×689, 1024×690, 1280×800, 768×1024,
375×812. In tutto 36.
- Nessuno scorrimento orizzontale, nessun testo troncato e nessun bersaglio sotto i 44 px nelle intestazioni, nessuna immagine rotta.
- Kamoshida e Madarame restano in una schermata a 1366×657, 1280×689, 1024×690 e 1280×800.
- Gli elementi oltre il bordo che la misura elenca sono il disegno ingrandito e gli spilli **dentro** il visore delle mappe, che li
  taglia. Non sono difetti.
- **Miniature ritagliate dal server (UX2-13): 10.** Tutte stanno nel riquadro 94×70 con `object-fit: contain`, quindi il disegno si
  vede intero.

  | pagina | miniature ritagliate |
  |---|---|
  | La città | rmap-150-3-0 |
  | Shibuya | rmap-001-1-0, 001-2-0, 001-3-0, 001-4-0, 001-5-0, 001-12-0 |
  | Odaiba | rmap-012-29-0 |
  | Yongen-Jaya | rmap-009-2-0, 022-1-0 |

  Nessuna miniatura dei Palazzi risulta ritagliata.
- Da guardare con Test UX: rmap-001-12-0 di Shibuya diventa una striscia 96×19 (scarto 60% sulle proporzioni dell'originale 2048×1024).

Schermate: `indice-mappe-1280x689.jpg` (indice chiuso), `tokyo-aperto-1280x689.jpg` (Tokyo aperto). Misure grezze: `R3-misure-grezze.json`,
`R4-misure-grezze.json`, `R2-misure-grezze.md`. La finestra del browser è tornata alla misura desktop.
