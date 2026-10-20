# L1 «Immagini» — test layout multi device

Sessione «Test layout multi device», 2026-10-20. FE http://localhost:5373 (cartella di sviluppo, `newreview` + correzioni non committate
di BE/FE a «fatta»). Scheda del browser mia (`tab-1`); misure dal DOM sotto emulazione di viewport, dopo `getAnimations().finish()` e uno
screenshot per forzare il fotogramma (memoria «Browser pane»). Finestra riportata a «desktop» alla fine.
Grafica predefinita **accesa** per tutte le misure, salvo dove scritto «spenta»: nel pane condiviso un'altra sessione l'aveva spenta
per qualche minuto; il turno è stato concordato con Test funzionali e le misure fatte in quel periodo sono state rifatte con la grafica accesa.

Misure: 1280×689, 1366×657, 1024×690 (barra di pagina), 768×1024 e 375×812 (colonna unica, preset tablet/mobile).
Script di misura: scorrimento orizzontale del documento, `main` scrollHeight/clientHeight, elementi oltre il bordo, bersagli < 44 px,
testi a una lettera per riga, immagini rotte, deformate (`object-fit: fill` fuori proporzione), velate (opacità effettiva < 1),
contenitori scorrevoli con overscroll e bordo, riquadri `.illustrazione-segno` (misura, immagine naturale, segno, spenta).
Schermate in `schermate-layout/`.

## Esito in breve
- Su nessuna vista e a nessuna misura c'è scorrimento orizzontale o un elemento oltre il bordo. Non ci sono immagini rotte o deformate,
  né testi a una lettera per riga (tre falsi positivi: le etichette «Schermo intero / Modifica mappa / Pannello» stanno in un contenitore
  da 1×1 px, testo solo per lettori di schermo).
- Le pagine che devono stare in una schermata ci stanno:
  - Kamoshida e Memento: `main` = altezza visibile a 1280×689, 1366×657 e 1024×690.
  - Le intestazioni dei Palazzi restano compatte: 170 px a 1280/1366 e 222 px a 1024×690, come prima.
- Le illustrazioni hanno opacità 1. Sono attenuate (0,6 + scala di grigi) solo nelle schede dei quartieri chiusi, come da progetto.
- Gli scroll annidati delle viste toccate hanno tutti `overscroll-behavior: contain` e il bordo da 1 px.
- **1 difetto** di layout: le illustrazioni in 4:3 tagliate nel riquadro 16:9 (LAY-1).
- **1 conferma** del difetto UX-1 (segno del Palazzo minuscolo fra 1024 e 1279 px), con le mie misure.
- **Preesistenti**, fuori perimetro L1: bersagli della metro e dei pin sotto i 44 px; barra di pagina de La città a 1280×689.

## La città (`/guida/citta`)
| misura | orizz. | `main` (contenuto/visibile) | intestazione | illustrazione scheda | segno | note |
|---|---|---|---|---|---|---|
| 1280×689 | no | 732 / 621 | 1020×132 | 112×63 | 56×43 | lista schede 328×504 (contenuto 4640), contain, bordo 1 px |
| 1366×657 | no | 714 / 589 | 1106×132 | 112×63 | 56×43 | lista schede 440×482 (contenuto 3473), contain, bordo 1 px |
| 1024×690 | no | 2943 / 622 | 764×132 | 128×72 | 56×43 | colonna unica: schede sotto la metro, nessuno scroll annidato |
| 768×1024 | no | 3143 / 964 | 726×132 | 128×72 | 56×43 | due colonne, schede 359×155 (205 con il timbro di sblocco) |
| 375×812 | no | 5490 / 752 | 333×146 | 128×72 | 56×43 | una colonna, schede 333×134–237 |
- 23 illustrazioni (19 caricate + 4 asset), 16 attenuate (opacità 0,6, scala di grigi): la scheda chiusa si distingue e resta leggibile
  (`citta-768x1024.jpg`, `citta-375x812.jpg`: Shinjuku, Kichijoji).
- **La barra di pagina a 1280×689 (111 px) e a 1366×657 (125 px) c'era già prima delle correzioni.** Il mio riferimento preso prima di
  BE/FE «fatta» dava `main` 732/621 a 1280×689. Non è un effetto di L1. La pagina non è nell'elenco «una schermata».
- Nelle schede le quattro illustrazioni da asset sono in 4:3 (112×84 naturali) dentro il riquadro 16:9: perdono il 25% dell'altezza → **LAY-1**.
- Preesistente: i link delle stazioni sulla metro sono larghi 28–37 px (Shujin 36×55, Memento 28×42, Covo 30×60…) a desktop e tablet,
  e 14–25 px a 375. La metro è invariata in L1 (decisione dell'utente).

## Quartiere (`/guida/citta/shibuya` con caricata, `/guida/citta/kichijoji` solo asset)
| vista · misura | orizz. | intestazione | illustrazione | immagine naturale | segno |
|---|---|---|---|---|---|
| Shibuya 1280×689 | no | 1020×147 | 200×113 a fianco | 200×112 | 76×58 |
| Shibuya 1366×657 | no | 1106×147 | 200×113 | 200×112 | 76×58 |
| Shibuya 1024×690 | no | 764×147 | 200×113 | 200×112 | 76×58 |
| Shibuya 768×1024 | no | 726×158 | 220×124 a fianco | 220×123 | 76×58 |
| Shibuya 375×812 | no | 333×345 | **299×168 in cima** | 311×174 | 76×58 |
| Kichijoji 1024×690 | no | 764×153 | 200×113 | **200×150 (4:3)** | 76×58 |
| Kichijoji 768×1024 | no | 726×158 | 220×124 | **311×233 (4:3)** | 76×58 |
| Kichijoji 375×812 | no | 333×390 | **299×168 in cima** | **311×233 (4:3)** | 76×58 |
- A 375 l'illustrazione sta in cima all'intestazione, a tutta larghezza (299 su 333 utili), senza scorrimento orizzontale (caso aggiunto dal PM).
- Le pagine del quartiere sono lunghe per natura, perché contengono le planimetrie: la barra di pagina è attesa.
- I pin delle planimetrie misurano 38×38 e i gruppi «+n» 34×34: preesistente, fuori L1.
- Kichijoji: anche nell'intestazione l'asset 4:3 è tagliato del 25% (`kichijoji-1024x690.jpg`, `kichijoji-375x812.jpg`) → **LAY-1**.

## Palazzo di Kamoshida (`/guida/dungeon/kamoshida`)
| misura | orizz. | `main` | intestazione | illustrazione | segno | scroll annidati |
|---|---|---|---|---|---|---|
| 1280×689 | no | **621 / 621** | 1030×170 | 86×48 | 28×28 | tre colonne 393 px, contain, bordo 1 px |
| 1366×657 | no | **589 / 589** | 1116×170 | 86×48 | 28×28 | tre colonne 361 px, contain, bordo 1 px |
| 1024×690 | no | **622 / 622** | 774×222 | **56×32** | 24×24 | due colonne 342 px, contain, bordo 1 px |
| 768×1024 | no | 2442 / 964 | 726×297 | 176×99 | 44×44 | elenco 714×715 (contenuto 1136), contain, bordo 1 px |
| 375×812 | no | 2739 / 752 | 333×643 | 150×84 | 38×38 | elenco 331×566 (contenuto 1313), contain, bordo 1 px |
- Fra 1024 e 1279 px il valore di FE è confermato: illustrazione da 56 px, intestazione da 222 px come prima, nessuna barra di pagina.
- L'illustrazione però misura 56×32 con lo stemma da 24×24 sopra: lo stemma copre il 75% dell'altezza della figura. Il difetto è già aperto
  come **UX-1** (Test UX) e le mie misure lo confermano; non lo duplico.
- A 375 l'intestazione è alta 643 px (79% della vista). La riga illustrazione+anello è passata da 64 a 84 px (+20 px rispetto allo stemma
  da 52 di prima); il resto dell'altezza (timbri, conteggi) è preesistente.
- Con la grafica spenta (`kamoshida-375x812-grafica-spenta.jpg`): stesse misure, al posto dello stemma il segno testuale «K», niente filigrana.

## Memento (`/guida/dungeon/mementos`)
| misura | orizz. | `main` | intestazione | scroll annidati |
|---|---|---|---|---|
| 1280×689 | no | **621 / 621** | 1030×116 | elenco dei dedali 288×254 (contenuto 461), dedalo 706×447 (contenuto 747); contain, bordo 1 px |
| 1366×657 | no | **589 / 589** | 1116×116 | 288×222 (461) e 792×415 (687); contain, bordo 1 px |
| 1024×690 | no | **622 / 622** | 774×116 | 248×280 (461) e 490×448 (1020); contain, bordo 1 px |
| 768×1024 | no | 1212 / 964 | 726×156 | fila orizzontale dei semafori 633×48 |
| 375×812 | no | 1261 / 752 | 333×168 | fila orizzontale delle Persona 311×140 |
- Nessuna illustrazione, stemma da 40 come prima. La filigrana al 7% resta: Memento invariati, come da progetto.
- Le file orizzontali hanno `overscroll-behavior: auto`. Scorrono in orizzontale e non agganciano lo scroll verticale della pagina:
  preesistente, fuori L1.

## «Dove si trova» (`AccessoMondoPage`, `sizes` nuovo) — `/guida/mondo/confidente/takemi` (2 destinazioni)
| misura | orizz. | `main` | anteprime |
|---|---|---|---|
| 1280×689 | no | 621 / 621 | 213×159 (4 colonne), `l=320` |
| 1366×657 | no | 589 / 589 | 234×175 |
| 1024×690 | no | 622 / 622 | 214×160 (3 colonne) |
| 768×1024 | no | 964 / 964 | 201×150 (3 colonne), `l=640` |
| 375×812 | no | 752 / 752 | 130×97 (2 colonne), `l=640` |
- Le anteprime sono `object-fit: contain` in 4:3, senza tagli né deformazioni. Nessun bersaglio sotto i 44 px.
- Con una sola destinazione (quartiere, Palazzo) la pagina rimanda subito al visore, come prima.

## Verifica delle correzioni (2026-10-20, dopo il messaggio di FE «LAY-1 corretto, insieme a UX-1, UX-2 e UX-3»)
Grafica accesa salvo dove scritto. Nel pane condiviso un'altra sessione ha spento di nuovo la grafica per qualche secondo: ho scartato la
lettura fatta in quel momento e ricaricato la pagina con la preferenza predefinita.

**LAY-1 — verificato.** Struttura nuova: lo spazio resta 16:9; dentro c'è `.illustrazione-segno__riquadro`, con la proporzione
dell'immagine e centrato.
| vista · misura | spazio | riquadro 4:3 (Kichijoji, Ikebukuro, Nakano, Meiji) | riquadro 16:9 (le altre 19) | taglio | titoli |
|---|---|---|---|---|---|
| La città 1280×689 | 112×63 | 84×63, centrato (dx 0, dy 0) | 112×63 | 0–1% (bordo) | stesso x in tutte le schede (1056) |
| La città 1366×657 | 112×63 | 84×63 | 112×63 | 0–1% | x 1030 |
| La città 1024×690 | 128×72 | 96×72 | 128×72 | 0–1% | x 387 / 773 (due colonne) |
| La città 768×1024 | 128×72 | 96×72 | 128×72 | 0–1% | x 173 / 540 |
| La città 375×812 | 128×72 | 96×72 | 128×72 | 0–1% | x 173 |
| Kichijoji 375×812 | 299×168 | **224×168**, in cima, intestazione 333×390 | — | 0% | — |
| Kichijoji 768×1024 | 220×124 | 165×124, intestazione 726×158 | — | 0% | — |
| Kichijoji 1024×690 · 1280×689 · 1366×657 | 200×113 | 150×113, intestazione 764×153 · 1020×159 · 1106×147 | — | 0–1% | — |
Il segno (sagoma) sta dentro il riquadro a ogni misura. La scheda chiusa resta attenuata (opacità 0,6 + scala di grigi sul riquadro).
Nessuno scorrimento orizzontale. Schermate: `corretto-citta-schede-375x812.jpg`, `corretto-kichijoji-375x812.jpg`, `corretto-kichijoji-1024x690.jpg`.

**UX-1 (verifica di layout; il merito resta a Test UX).** Intestazione di Kamoshida:
| misura | intestazione | `main` | figura |
|---|---|---|---|
| 1920×969 | 1670×137 | 901/901 | illustrazione 104×59, stemma 44×44 (40 + bordo), anello 48 sotto |
| 1440×789 | 1190×170 | 721/721 | 104×59, stemma 44, anello 48 |
| 1366×657 | 1116×170 | 589/589 | 104×59, stemma 44, anello 48 |
| 1280×689 | 1030×170 | 621/621 | 104×59, stemma 44, anello 48 |
| 1024×690 | 774×222 | 622/622 | solo stemma 48 + anello 48, come prima |
| 768×1024 | 726×297 | 2442/964 | 176×99, stemma 44, anello 64 |
| 375×812 | 333×643 | 2739/752 | 150×84, stemma 38, anello 64 |
Madarame: 1280×689 intestazione 194, `main` 621/621; 1024×690 intestazione 265, `main` 622/622. Altezze uguali a prima,
nessuna barra di pagina. Gli elementi oltre il bordo sono solo la tela del visore, ritagliata dal suo contenitore (`overflow: hidden`).
Schermate: `corretto-kamoshida-1280x689.jpg`, `corretto-kamoshida-1024x690.jpg`.

**UX-2 / UX-3 (verifica di layout).** Con la grafica spenta (impostata nella mia scheda per pochi secondi, poi rimossa):
- la metro mostra sagome e stemmi, senza scorrimento orizzontale a 375 e a 1024 (`corretto-grafica-spenta-metro-375x812.jpg`,
  `corretto-grafica-spenta-metro-1024x690.jpg`);
- Kichijoji a 375 mostra la sagoma senza riquadro vuoto (`corretto-grafica-spenta-kichijoji-375x812.jpg`);
- 19 schede con illustrazione, nessuna tagliata.

Esito: layout di L1 **fatto**. LAY-1 è verificato e non ci sono difetti di layout aperti.

## Giro sul collaudo e9fb4871 (BE 3301 / FE 5473, cartella `p5s-sviluppo-l2`, 2026-10-20)
Ultimo passo prima del validatore, richiesto dal PM. Misura in serie dentro un iframe della stessa origine, dimensionato come la finestra
(le media query leggono l'iframe; metodo controllato su Maruki, 638/621 come la misura diretta; `strumenti-layout/README.md`). Immagini
«lazy» forzate a caricare. Ogni risultato registra la preferenza della grafica: 2 misure prese mentre un'altra sessione l'aveva spenta
(La città a 1280×689 e 1366×657) sono state scartate e ripetute con la grafica predefinita. Solo letture: nessuna scrittura sui dati.
Colonne: scorrimento orizzontale · `main` (contenuto/visibile) · intestazione · illustrazioni (numero, taglio massimo) · scroll annidati
(dimensione, overscroll, bordo) · elementi oltre il bordo · testi a una lettera per riga · immagini rotte.

| vista | 1280×689 | 1366×657 | 1024×690 | 768×1024 | 375×812 |
|---|---|---|---|---|---|
| La città | no · 732/621 · 132 · 23 ill., taglio ≤1% · lista 340×506 contain, bordo 1 px | no · 714/589 · 132 · 23, ≤1% · lista 452×484 contain, bordo | no · 2943/622 · 132 · 23, ≤1% | no · 3143/964 · 132 · 23, ≤1% | no · 5490/752 · 146 · 23, ≤1% |
| Shibuya | no · 6638/621 · 147 · 1, 0% | no · 6532/589 · 147 · 1, 0% | no · 4848/622 · 147 · 1, 0% | no · 5176/964 · 158 · 1, 0% | no · 8565/752 · 345 · 1, 0% |
| Kichijoji | no · 3851/621 · 159 · 1, 0% | no · 3819/589 · 147 · 1, 0% | no · 3415/622 · 153 · 1, 0% | no · 3756/964 · 158 · 1, 0% | no · 5435/752 · 390 · 1, 0% |
| Kamoshida | no · **621/621** · 170 · 1, ≤1% · 3 colonne 395 px contain, bordo | no · **589/589** · 170 · 3 colonne 363 px | no · **622/622** · 222 · solo stemma 48 · 2 colonne 344 px | no · 2442/964 · 297 · elenco 726×717 contain | no · 2739/752 · 643 · elenco 333×568 contain |
| Memento | no · **621/621** · 116 · 2 colonne contain, bordo | no · **589/589** · 116 | no · **622/622** · 116 | no · 1212/964 · 156 · fila 633×58 (overscroll-x contain) | no · 1271/752 · 168 · fila 311×150 (overscroll-x contain) |
| Dove si trova (Takemi) | no · 621/621 · 57 | no · 589/589 · 58 | no · 622/622 · 50 | no · 964/964 · 48 | no · 752/752 · 48 |
In tutte le 30 misure: nessun elemento oltre il bordo che non sia ritagliato dal suo contenitore, nessun testo a una lettera per riga,
nessuna immagine rotta. Kamoshida a 1280×689 (misura diretta nella scheda): illustrazione 104×59, stemma 44, intestazione 170, `main` 621/621.
Bersagli sotto i 44 px, tutti preesistenti e fuori perimetro L1: le stazioni della metro (28–37 px); il link della fonte «Megami Tensei Wiki»
sotto la pianta di Kichijoji (309×14, a 375 225×32); i pulsanti 20×20 della fila dei Memento. Le icone della legenda dei pin di Kamoshida
(opacità < 1) sono preesistenti.
Le schermate di questo giro (`collaudo-e9fb4871-*`) sono uscite con la grafica spenta da un'altra sessione: valgono come caso «spenta»
(illustrazione caricata con lo stemma testuale «K», metro con sagome). Le schermate a grafica accesa dello stesso codice sono le
`corretto-*` della sezione precedente: il commit e9fb4871 contiene quelle correzioni.

**G6** (intestazione del quartiere subito dopo lo scarico della pianta) — **non verificabile dal vivo**.
- Ciclo dati con Collaudo: foto `L1-ciclo1-layout-G6` (02:56), poi ripristino chiesto.
- Grafica predefinita (chiave assente), 1280×689, quartieri con la pianta pubblicata e senza immagine (`mappa=false`): Kichijoji e Santuario Meiji.
- Aprendo la pagina, lo scarico parte da solo: `POST /api/mappe/piante-citta/kichijoji/scarica` e `…/meiji-shrine/scarica`. Entrambi
  rispondono **400 `download-fallito`**, «L'indirizzo ha risposto 403: controlla che serva l'immagine»: la fonte `static.wikia.nocookie.net`
  rifiuta il server.
- Quindi non c'è rilettura né immagine nuova. Per 20 s (una lettura ogni 2,5 s) l'intestazione resta sull'asset
  `mappe/citta-kichijoji` 200×150 e non cambia. Dopo, `GET compendio/citta/<q>` dà ancora `mappa=false` e illustrazione = solo asset.
- Pagina dopo l'errore: `main` 3851/621, nessuno scorrimento orizzontale, nessun avviso a schermo (l'errore resta silenzioso).
  È un'osservazione per Test funzionali / UX, non di layout.
- Il comportamento corretto dopo uno scarico riuscito (rilettura, intestazione = visore) resta coperto solo dal test di FE
  `QuartierePage.scarico.test.tsx` (`g6-rosso.txt` / `g6-verde.txt`). Per provarlo dal vivo serve una fonte che il server riesca a scaricare.
- Causa del 403, provata con curl: Fandom (Cloudflare) rifiuta le richieste senza `Referer`; con il Referer di fandom e un UA da browser
  risponde 200. `scaricaDaUrl.ts:80` non manda né Referer né User-Agent. Difetto **LAY-2** aperto a BE, con copia al PM.
- Collaudo ha ripristinato i dati: impronta identica alla foto. Cambiavano solo le miniature create dalle letture, 72 → 74 in `immagine_miniatura`.
  G6 si rifà dal vivo dopo la correzione di LAY-2, con un nuovo ciclo dati.
