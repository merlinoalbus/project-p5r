# L2 «Mondo: aree e planimetrie» — test layout multi device

Sessione «Test layout multi device». Casi e base «prima»: `layout-casi.md`. Difetti: `difetti.md` (LAY2-n, LAY-2).
Metodo: misura in serie dentro un iframe della stessa origine (`strumenti-layout/README.md`, immagini lazy forzate, animazioni finite, preferenza
della grafica registrata per ogni misura) e a misura reale nella mia scheda per finestre e schermate. Finestre aperte e chiuse con «Annulla»:
nessun dato scritto. Finestra ripristinata a desktop alla fine.

## Pezzo 1 — pagine Quartiere e Area, finestre (FE 5373, 2026-10-20, segnalato da FE)
Formato: `main` contenuto/visibile (**BARRA** = barra di pagina) · testata · visore: distanza dall'alto del `main`, altezza, fondo/altezza del `main`, quota visibile.
Nessuno scorrimento orizzontale, nessun elemento oltre il bordo, nessun testo a una lettera per riga e nessuna immagine rotta in tutte le 35 misure.
Grafica predefinita in tutte.

### Pagina Area (R2-41: testata + versioni + visore nella prima schermata a 1366×657 e 1280×689)
| area | 1366×657 | 1280×689 | 1024×690 | 768×1024 | 375×812 |
|---|---|---|---|---|---|
| Sottopasso (2 versioni) | **589/589** · 66 · 168/420, fondo 588/589, 100% | **625/621 BARRA** · 103 · 205/420, 99% | **648/622 BARRA** · 126 · 228/420, 94% | 964/964 · 178 · 276/560, 100% | 1045/752 · 308 · 430/520 · versioni 333×82 (contenuto 467), overscroll-x contain, bordo 1 px |
| Central Street (nessuna versione) | **589/589** · 66 · 110/459, 100% | **621/621** · 66 · 110/491, 100% | **622/622** · 97 · 141/461, 100% | 964/964 · 178 · 218/560 | 934/752 · 278 · 318/520 |
| Covo dei Ladri (5 versioni + carta «Sfide e Medaglie P») | **745/589 BARRA** · 104 · 325/420, 63% | **744/621 BARRA** · 103 · 324/420, 71% | **767/622 BARRA** · 126 · 347/420, 66% | 1051/964 BARRA · 178 · 395/560, 100% | 1143/752 · 308 · 527/520 · versioni 333×82 (contenuto 1157), overscroll-x contain, bordo 1 px |
- Esito R2-41: **non soddisfatto** per Sottopasso a 1280×689 e per il Covo a 1366×657 e 1280×689 → **LAY2-1** (alta).
  - Causa: la testata va su due righe (briciole sopra il titolo; Modifica / Aggiungi planimetria / Elimina area a fianco). A 1024 va a capo
    anche la barra del visore.
  - Nel Covo le 5 versioni stanno su due righe e la carta delle Sfide aggiunge 53 px.
  - Central Street, senza versioni, sta in una schermata a tutte e tre le altezze.
- A 375 la fila delle versioni ha bordo evidente e `overscroll-behavior-x: contain`, come chiede §4.3.
- La carta «Sfide e Medaglie P del Covo» è alta 41 px → **LAY2-2**.
- Le briciole doppie (testata e barra del visore) sono già in UX2-5: non le duplico.
- A 1280 il pannello del visore restava chiuso (pulsante «Pannello»). Per FE era un difetto (UX2-1), ora è corretto: il visore si apre col
  pannello aperto. Ricontrollato su Sottopasso:
  - 1280×689: pannello 340×361 sopra il visore (largo 1020), nessuno scorrimento orizzontale, niente oltre il bordo;
  - 1024×690: pannello 340×361 sopra il visore (largo 764), stessi esiti;
  - le barre di pagina di LAY2-1 restano (625/621 e 648/622), in attesa della sua correzione.

### Pagina Quartiere
| quartiere | 1366×657 | 1280×689 | 1024×690 | 768×1024 | 375×812 |
|---|---|---|---|---|---|
| Shibuya | 7317/589 · 169 · illustrazione 265/420 | 7421/621 · 168 · 264/441 | 5319/622 · 182 · 278/442 | 5634/964 · 180 · 272/655 | 9399/752 · 449 · 541/520 |
| Kichijoji (1 area) | 4016/589 · 175 | 4074/621 · 213 | 3606/622 · 207 | 3940/964 · 205 | 5662/752 · 444 |
| Ikebukuro (nessuna area) | 951/589 · 175 | 971/621 · 174 | 1475/622 · 188 | 1795/964 · 186 | 2107/752 · 385 |
| Shibuya `?ingresso=1` | finestra d'ingresso 860×620 a 1280×689 (dentro la vista), visore nella finestra 818×424, «Chiudi» / «Apri l'area» | | | | |
- La pagina è lunga per natura (le liste crescono con la pagina, §4.2: nessuna area scorrevole annidata); a 1280 le colonne sono due,
  illustrazione | aree, come previsto (`quartiere-shibuya-ingresso-1280x689.jpg`).
- Bersagli piccoli: solo il link della fonte sotto la pianta (309×14; 254×32 a 375) e «pagina della fonte» di Kichijoji (93×14),
  testo di attribuzione come prima di L2 (base: 309×14).
- Rispetto alla base: la testata cresce da 147 a 168–213 px, perché ora contiene le azioni «Entra / Ingresso / Aggiungi area».

### Finestre (375×812)
| finestra | dimensione | distanza dal fondo | corpo scorrevole | bersagli < 44 |
|---|---|---|---|---|
| Ingresso di Shibuya | 343×731 | 41 | modal-body 341×575 (contenuto 959), contain | nessuno |
| Aggiungi un'area a Shibuya | 343×717 | 48 | — | nessuno |
| Aggiungi planimetria a Sottopasso | 343×451 | 181 | — | nessuno (la casella ha l'etichetta 301×44) |
| Modifica Sottopasso | 343×673 | 70 | modal-body 341×517, contain | nessuno |
- Nessuno scorrimento orizzontale. Le finestre però sono **centrate**, non «fogli dal basso» (R2-42) → **LAY2-3**.

## Pezzo 2 e verifica delle correzioni (FE 5373, 2026-10-20; BE e FE «fatta» sulla lavagna)
Serie su 8 viste a 6 misure (1366×657, 1280×689, 1024×690, 1280×800, 768×1024, 375×812), più misure a misura reale. Il BE 3201 si è riavviato tre
volte durante il giro (502 dal `tsx watch` di BE): ho scartato e ripetuto le misure di quei momenti.

**Pagina Area (LAY2-1, verificato)**
| area | 1366×657 | 1280×689 | 1024×690 | 1280×800 | 768×1024 | 375×812 |
|---|---|---|---|---|---|---|
| Sottopasso | 589/589 · 62 | 621/621 · 62 | 622/622 · 62 | 732/732 | 964/964 · 178 | 1244/752 · 258 · visore 782 (tela 240, LAY2-4) |
| Central Street | 589/589 | 621/621 | 622/622 | 732/732 | 964/964 | 1146/752 · 228 |
| Covo dei Ladri | 589/589 · 62 | 621/621 · 62 | 622/622 · 62 · fila versioni 581 su 1085 | 732/732 | 964/964 · 178 | 1213/752 · 310 |
| Piazza della stazione | 589/589 | 621/621 | 622/622 | 732/732 | 964/964 | 1178/752 |
- Testata, versioni e visore nella prima schermata a 1366×657, 1280×689 e 1024×690: **R2-41 soddisfatto**.
- Fila delle versioni del Covo: scorre in orizzontale. Il contenitore ha bordo da 1 px, sfumatura a destra e barra sottile visibile.
  «Sfide e Medaglie P del Covo» è in fondo alla fila, 183×44 (LAY2-2 verificato).
- Pannello del visore aperto all'apertura: a 1280 sta sopra il visore (340×376) con overscroll contenuto.
- **A 375 il pannello entra nel visore e la tela scende a 331×240 → LAY2-4** (`schermate-layout/area-sottopasso-375-pannello.jpg`).

**Finestre a 375 (LAY2-3, verificato).** Tutte a tutta larghezza e attaccate al fondo: Ingresso 375×788, Aggiungi area 375×716, Aggiungi
planimetria 375×425, Modifica area 375×672 (aperte dal menu della testata con «Modifica» / «Planimetria»), ingresso dalla metro 375×722
(`corretto-ingresso-foglio-375.jpg`). Nessun bersaglio < 44 px, nessuno scorrimento orizzontale. Aperte e chiuse con Annulla/Chiudi.

**Kichijoji, avviso dello scarico (LAY-2, parte FE verificata).** Riquadro 333×108 a 375 con «Scaricamento non riuscito…», link alla fonte e
«Carica dall'editor» (`corretto-kichijoji-avviso-375.jpg`). Alle sei misure: nessuno scorrimento orizzontale e nessun elemento oltre il bordo;
la pagina è lunga per natura (3606–5662 px).

**La città** (con «Aree della città» e «da collocare»): `main` 891/621 a 1280×689, 873/589 a 1366×657, 3211/622 a 1024×690, 3479/964 a 768,
6039/752 a 375. Prima di L2 era 732/621 a 1280×689: +159 px per le sezioni nuove. È una pagina lunga anche prima. Le illustrazioni sono 23,
con taglio massimo 1%. La lista delle schede scorre con contain e bordo da 1 px. La carta «Area riservata allo staff» (UX2-7, chiuso da UX)
è a posto: 359×166 a 768 e 333×166 a 375.

**Indice delle Mappe** (`/guida/mappe`): pagina lunga a 1366/1280 (1099 px), una schermata a 768 (964/964); **a 1024×690 625/622 → LAY2-5**
(3 px).

**Editor** (`/guida/mappe/shibuya-central-street/modifica`): a tutte le misure occupa la vista (589/589 … 752/752). A 375, nella scheda
«Collegamenti», il collegamento «Aggiungi area / planimetria dalla pagina del quartiere» è 355×44 e non c'è scorrimento orizzontale
(`editor-collegamenti-375.jpg`). Le 5 schede dell'editor sono 84×44.

## Giro finale sul collaudo 8e75abbb (BE 3301 / FE 5473, migrazione 109 applicata; 2026-10-20, fine 02:18:22Z)
Tutto in sola lettura, con il ritmo concordato con Collaudo: il mio giro dopo il ripristino del ciclo 1 di Test UX, il ciclo 2 di Test
funzionali dopo il mio avviso di fine. Le misure prese mentre Test UX o Test no-reg avevano spento la grafica sono state ripetute.
Risultato finale: 13 viste × 6 misure = 78 misure, tutte con la grafica predefinita e nessun errore. Le POST di scarico di Kichijoji
(400 `fonte-rifiuta`) partono dalle visite e non scrivono.
In tutte le 78 misure: nessuno scorrimento orizzontale, nessun elemento oltre il bordo, nessun testo a una lettera per riga, nessuna
immagine rotta.

| vista | 1366×657 | 1280×689 | 1024×690 | 1280×800 | 768×1024 | 375×812 |
|---|---|---|---|---|---|---|
| Area Sottopasso | **589/589** · 62 · tela 774×361 | **621/621** · tela 688×386 | **622/622** · tela 772×387 | 732/732 | 964/964 · tela 734×501 | 1244/752 · visore 782, **tela 331×240** (LAY2-4) |
| Area Central Street | **589/589** | **621/621** | **622/622** | 732/732 | 964/964 | 1146/752 · tela 331×240 (LAY2-4) |
| Area Covo dei Ladri | **589/589** | **621/621** | **622/622** | 732/732 | 964/964 | 1213/752 · tela 331×240 (LAY2-4) |
| Area Piazza della stazione | **589/589** | **621/621** | **622/622** | 732/732 | 964/964 | 1178/752 · tela 331×240 (LAY2-4) |
| Quartiere Shibuya | 7317 · 169 | 7421 · 168 | 5319 · 182 | 7421 | 5634 · 180 | 9334 · 449 |
| Quartiere Kichijoji (avviso LAY-2) | 4016 · 175 | 4074 · 213 | 3606 · 207 | 4074 | 3940 · 205 | 5597 · 444 |
| Quartiere Ikebukuro | 951 · 175 | 971 · 174 | 1475 · 188 | 1042 | 1795 · 186 | 2042 · 385 |
| La città | 873 · 112 | 891 · 112 | 3211 · 112 | 928 | 3479 · 112 | 6039 · 107 |
| Indice delle Mappe | 1099 | 1099 | **625/622** (LAY2-5) | 1099 | 964/964 | 1184 |
| Editor Central Street | 589/589 | 621/621 | 622/622 | 732/732 | 964/964 | 752/752 |
| Pagina del Covo | 4941 | 5155 | 5838 | 5155 | 7998 | 11754 · carta «Planimetrie del Covo» 352×41 da 768 in su (**LAY2-6**) |
| Kamoshida (no-reg L1) | **589/589** · 170 | **621/621** · 170 | **622/622** · 222 | 732/732 | 2442 · 297 | 2739 · 643 |
| Memento (no-reg L1) | **589/589** · 116 | **621/621** · 116 | **622/622** · 116 | 732/732 | 1212 · 156 | 1271 · 168 |
Valori: `main` contenuto/visibile (solo il contenuto quando la pagina è lunga per natura) · testata.
- **R2-41 soddisfatto** sul collaudo: le quattro pagine Area stanno in una schermata a 1366×657, 1280×689 e 1024×690, con testata da 62 px
  e visore visibile al 100%.
- Kamoshida e Memento hanno le stesse misure del giro finale di L1: nessuna regressione di layout.
- Bersagli < 44 preesistenti e invariati: stazioni della metro de La città, link della fonte sotto le piante, dedali della fila dei Memento.
- Nel collaudo restano **LAY2-4** e **LAY2-5**: FE li ha già corretti su 5373, li ho verificati lì ed entrano nel commit successivo.
  **LAY2-6** è nuovo (bassa).

### Verifica di LAY2-4 e LAY2-5 su 5373 (dopo il giro sul collaudo)
- **LAY2-4**, verificato:
  - 375×812 (Sottopasso, Central Street, Covo): visore 520, tela 331×465, pannello chiuso, «Luoghi qui» e «Aree vicine» nella pagina
    sotto il visore; nessuno scroll verticale annidato.
  - 768×1024: tela 734×501, pannello chiuso.
  - 1280×689: pannello aperto 340×386–444, pagina 621/621.
- **LAY2-5**, verificato: `/guida/mappe` a 1024×690 622/622.
- UX2-6 (di Test UX), misura per lei: a 375 il visore del quartiere Shibuya è alto 241 px, con la tela 331×186.
- UX2-7, chiuso da UX: La città a 768 e 375 senza testi schiacciati.

## Giro breve sul collaudo 600af81c (correzioni LAY2-4, LAY2-5, LAY2-6, UX2-10; 2026-10-20, fine 02:35:47Z)
Partito dopo il ripristino di Collaudo del ciclo 3 di Test UX (04:28:17), quindi sui dati di base di L2. Due misure del Covo uscite nella
finestra in cui Test no-reg aveva spento la grafica (02:29:58–02:30:10Z) sono state ripetute. Risultato: 27 misure + 6 della pagina del Covo,
tutte a grafica predefinita, nessun errore, solo letture.
- **Pagine Area** (Sottopasso, Central Street, Covo, Piazza della stazione):
  - 589/589 a 1366×657, 621/621 a 1280×689, 622/622 a 1024×690, testata 62: R2-41 regge;
  - 768×1024: 964/964, tela 734×501;
  - **375×812: visore 520, tela 331×465, pannello chiuso** (LAY2-4 ok); unico scorrimento interno la fila orizzontale delle versioni
    (overscroll-x contain).
- **Indice delle Mappe** a 1024×690: **622/622** (LAY2-5 ok).
- **Pagina del Covo** alle sei misure: nessun collegamento sotto i 44 px (LAY2-6 ok).
- Quartiere Shibuya (1280, 768, 375) e La città (768, 375): pagine lunghe come prima, nessuno scorrimento orizzontale e nessun testo a una
  lettera per riga. A 375 il visore di Shibuya è alto 241 px, con la tela 331×186 (UX2-6 / UX2-10, di Test UX).
- In tutte: nessun elemento oltre il bordo, nessuna immagine rotta.

### Stato
- **Tutti i difetti di layout di L2 sono verificati sul collaudo**: LAY2-1, LAY2-2, LAY2-3, LAY2-4, LAY2-5, LAY2-6 e LAY-2 (BE e FE).
- **Fase layout di L2: fatta.**
