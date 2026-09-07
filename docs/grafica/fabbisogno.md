# Fabbisogno grafico — quel che manca, scoperto rifacendo le pagine

Registro della **Fase 6.2**. Si riempie strada facendo: ogni pagina rifatta ci scrive le proprie
voci mancanti, invece di fare un censimento a parte alla fine. È la risposta all'osservazione
dell'utente — non si sa quali elementi grafici servono finché le pagine non sono rifatte — quindi
lo si scrive mentre lo si scopre.

**Chi fa cosa:** i prompt li scrive chi ha rifatto la pagina che ne ha bisogno, li verifica
l'altro, e **la generazione è di Codex**. Un prompt sbagliato costa una generazione buttata;
verificarlo costa una lettura.

| stato | significato |
|---|---|
| `da verificare` | il prompt è scritto, l'altro deve leggerlo prima che si generi |
| `pronto` | prompt verificato, Codex può generare |
| `consegnato` | il file è in `public/asset/` e la pagina lo usa |

---

## 1. Shujin Academy — sagoma per la mappa di viaggio

| | |
|---|---|
| **file** | `public/asset/mappe/lmap/tokyo/shujin-academy.png` |
| **misura** | 760 × 620 px |
| **sfondo** | trasparente, **alfa reale** che segue la sagoma (non un rettangolo opaco) |
| **stato** | **`consegnato`** — generata da Codex il 6 settembre 2026, verificata e in uso |
| **serve a** | `src/components/mappe/MappaTokyo.tsx` |

**Perché serve.** La mappa di viaggio disegna ogni quartiere con la propria sagoma originale,
estratta da `P5_MAPDATA.SPD`. Shujin Academy non ce l'ha, perché nel gioco non è una destinazione
del treno: al suo posto compariva la fotografia del quartiere, che in mezzo a venti sagome in
bianco e nero era una macchia. Codex l’ha disegnata apposta nello stesso stile.

**Il riferimento è già nel repository**, ed è la cosa più importante di questo prompt: prima di
generare, guardare `public/asset/mappe/lmap/tokyo/shibuya.png`, `shinjuku.png`, `akihabara.png` e
`asakusa.png`. La resa deve stare in mezzo a quelle senza distinguersi.

**Prompt**

> Illustrazione di un edificio scolastico giapponese in stile Persona 5 Royal, resa come **sagoma
> nera piatta** su fondo trasparente: nessun grigio, nessuna sfumatura, nessun contorno — solo nero
> pieno, con i dettagli ricavati in **negativo bianco** dentro la massa nera (finestre, vetrate,
> gradini).
>
> Il soggetto: il corpo principale di una scuola superiore giapponese vista **di tre quarti
> dall'alto**, largo e basso, con la lunga facciata a fasce di finestre regolari, l'ingresso
> centrale sporgente con la pensilina, e il cortile davanti. Accanto, più arretrato, il volume più
> alto della palestra. Un albero o due sul davanti, ridotti a massa nera.
>
> Il taglio è **grafico e spigoloso**, da xilografia o da stencil: linee dritte, angoli netti,
> prospettiva forzata e leggermente instabile, come un edificio disegnato di corsa con un
> pennarello grosso. Le finestre non sono un reticolo regolare: sono tacche bianche irregolari,
> alcune piene, alcune vuote.
>
> Nessuna cornice, nessun riquadro, nessuna targa, nessun testo, nessuna scritta giapponese.
> Nessun colore: solo nero e trasparente. Il bianco deve essere trasparente, non bianco pieno —
> l'immagine viene ritagliata sul suo contorno e appoggiata su un fondo rosso.
>
> La sagoma deve occupare quasi tutta la tela, centrata, con un margine minimo.

**Come si verifica quando arriva**

1. l'alfa è reale: `alfaMinima` deve essere 0, e il bianco intorno all'edificio deve essere
   trasparente, non bianco — l'estrattore `lmap_sprites.py` lo controlla per gli originali e lo
   stesso vale qui;
2. messa accanto a `shinjuku.png` e `akihabara.png` alla stessa altezza, non si distingue per
   tratto, peso o densità di nero;
3. nella mappa, con il contorno bianco applicato, la sagoma resta leggibile a 5,5% di larghezza —
   è la misura con cui i cartellini vengono disegnati.

**Esito della verifica**

| prova | esito |
|---|---|
| alfa reale | **passa** — canale 0..255, angolo `(0,0,0,0)`, 64,6% di pixel trasparenti. Gli originali stanno al 44-48%: la scuola è più sparsa perché ha il cortile, non perché l'alfa sia finta |
| stile accanto agli originali | **passa** — messa fra Harajuku e Aoyama-Itchōme non si distingue per tratto né per peso del nero |
| leggibilità alla misura reale | **passa** — resa a 74 px di larghezza sulla mappa, l'edificio, la pensilina e gli alberi restano riconoscibili |

Shujin è tornata in `QUARTIERI_TOKYO` a `x: 40, y: 40`, con la linea `Aoyama–Shujin` che la lega ad
Aoyama-Itchōme. È **l'unica sagoma della mappa che non viene dal gioco**, e sta scritto lì accanto:
il resto dell'atlante è estratto e dimostrato, e un disegno fatto apposta non deve poter passare
per originale.

---

## 2 e 3 — RITIRATE: i pezzi dei Memento c'erano già

Avevo scritto due prompt per Codex — nove grappoli di città divelta e le catene del cratere — e
**erano sbagliati da chiedere**: quelle immagini stanno già negli originali estratti, in
`IT/FIELD/PANEL/MEMENTOS/MEMENTOS.SPD`, e hanno pure i nomi.

Gli otto `第N層` — «strato N» — sono i grappoli che compongono l'imbuto scendendo, l'ultimo con la
punta a trivella del fondo. `街並み` è il profilo della città sopra il pozzo, `鎖` sono le catene,
i `血管` («vasi sanguigni») sono le venature rosse che solcano il cratere, e il terzo semestre ha i
suoi dieci strati a parte perché lì il pozzo cambia. In tutto **73 elementi**, estratti da
`lmap_sprites.py` in `public/asset/mappe/lmap/memento/`.

**La lezione, scritta perché non si ripeta:** prima di scrivere un prompt si guarda se la cosa
esiste già fra gli originali. Un asset generato al posto di uno del gioco non è solo lavoro
sprecato — è una differenza di tratto che si vede, ed è un pezzo di mappa che smette di essere
autentico. La sagoma di Shujin (voce 1) resta legittima perché quella nel gioco **non c'è**: la
scuola non è una destinazione del treno, e l'ho verificato nel foglio degli sprite prima di
chiedere il disegno.

---

## 4. Covo dei Ladri — sagoma per la mappa di viaggio

| | |
|---|---|
| **file** | `public/asset/mappe/lmap/tokyo/covo-dei-ladri.png` |
| **misura** | 700 × 620 px |
| **sfondo** | trasparente, **alfa reale** che segue la sagoma (non un rettangolo opaco) |
| **stato** | **`da verificare`** — prompt scritto da Claude il 7 settembre 2026, tocca a Codex leggerlo |
| **serve a** | `src/components/mappe/MappaTokyo.tsx`, `COVO_TOKYO` |

**Perché serve, e come l'ho scoperto.** Rifacendo la mappa di Tokyo ho spostato il Covo dei Ladri
nell'angolo libero in basso a sinistra, perché addosso a Yongen-Jaya copriva Chinatown. Spostandolo
si vede quel che prima passava inosservato: **è l'unico elemento della mappa senza figura.** Ogni
quartiere ha la sua sagoma, ogni Palazzo la sua illustrazione, e il Covo è una targa nera con
dentro delle parole. In mezzo a venti disegni, una scritta sola sembra un errore di caricamento.

**Prima ho cercato fra gli originali**, che è la regola imparata sbagliando con i Memento: i 160
elementi nominati di `P5_MAPDATA.SPD` sono in `data/atlas/extracted/elementi-mappe-lmap.json`, e
nessuno è il Covo — né in caratteri latini, né in giapponese (`隠れ家`, `アジト`). È coerente col
gioco: il Covo dei Ladri è una schermata del menu di Royal, non una fermata della metropolitana,
quindi sul foglio della mappa di viaggio non c'è e non ci può essere. Come Shujin Academy: il
disegno va fatto perché nel gioco **non esiste**, non perché non l'abbiamo trovato.

**Il riferimento è già nel repository.** Prima di generare, guardare
`public/asset/mappe/lmap/tokyo/shibuya.png`, `shinjuku.png`, `asakusa.png` e soprattutto
`yongen-jaya.png` — il Covo è la soffitta del Leblanc, che sta lì. E `shujin-academy.png`, che è
l'altra sagoma non originale: la nuova deve stare in mezzo a tutte senza distinguersi.

**Prompt**

> Illustrazione di una piccola caffetteria giapponese a due piani in stile Persona 5 Royal, resa
> come **sagoma nera piatta** su fondo trasparente: nessun grigio, nessuna sfumatura, nessun
> contorno esterno — solo nero pieno, con i dettagli ricavati in **negativo bianco** dentro la
> massa nera (la vetrina, la porta, la finestra della soffitta, le tegole).
>
> Il soggetto: un edificio stretto e alto due piani, visto **di tre quarti dal basso**, con la
> vetrina del locale al piano terra, la tenda sopra l'ingresso, e al piano di sopra una finestra
> illuminata sotto uno spiovente. Sul tetto, una piccola insegna verticale. Accanto all'edificio,
> appoggiata, una **maschera** da ladro gentiluomo — occhi allungati, profilo spigoloso — larga
> circa un quarto dell'edificio: è il segno che quella soffitta è il covo, e senza di lei la
> sagoma è solo un bar.
>
> Il taglio è **grafico e spigoloso**, da xilografia o da stencil: linee dritte, angoli netti,
> prospettiva forzata e leggermente instabile, come un edificio disegnato di corsa con un
> pennarello grosso. Le tacche bianche delle finestre sono irregolari, alcune piene, alcune vuote.
>
> Nessuna cornice, nessun riquadro, nessuna targa, nessun testo, nessuna scritta giapponese.
> Nessun colore: solo nero e trasparente. Il bianco intorno all'edificio deve essere
> **trasparente**, non bianco pieno — l'immagine viene ritagliata sul suo contorno e appoggiata su
> un fondo rosso.
>
> La sagoma deve occupare quasi tutta la tela, centrata, con un margine minimo.

**Come si verifica quando arriva**

1. **alfa reale**: canale alfa 0..255, l'angolo `(0,0)` completamente trasparente, e la quota di
   pixel trasparenti nella fascia degli originali (44-65%). È la prova che il bianco è vuoto e non
   dipinto;
2. **stile**: messa fra `yongen-jaya.png` e `shujin-academy.png` alla stessa altezza, non si
   distingue per tratto, peso o densità di nero;
3. **leggibilità alla misura vera**: sulla mappa il Covo è disegnato a **4,6% di larghezza** della
   tela (`COVO_TOKYO.scala`), cioè circa 47 px a 1020 px di tela. A quella misura l'edificio e la
   maschera devono restare due cose distinte;
4. **niente sovrapposizioni**: dopo averla messa, rifare la prova di `docs/MAPPE.md`. Il Covo
   passerà da una targa larga 13,3% a una figura più stretta con la targa sotto, quindi il riquadro
   cambia e va rimisurato a 375, 768, 1280 e 1440 px. **Atteso: 0.**

---

## Non serve un disegno, serve un colore — gli otto spilli troppo chiari

Non è una voce di fabbisogno grafico e sta qui perché è emersa nello stesso lavoro: montando i 37
spilli nuovi uno accanto all'altro si vede che otto hanno una tinta troppo chiara per reggere una
figura anch'essa chiara — `forziere-raro` (#fde047), `terme` (#67e8f9), `casa` (#fdba74),
`lavanderia` (#c4b5fd), `nemico` (#b0b0c0), `porta` (#a3a3a3), `nota` (#9ca3af), `scala` (#2dd4bf).

Si leggono, ma sono il caso peggiore. Si sarebbe risolto in `shared/spilli.ts`, scurendo quegli
otto senza toccare la grafica: le figure vanno bene, è il fondo che non fa da fondo.

**Chiuso: l'utente ha deciso di lasciarli come sono**, ed è registrato in `docs/DECISIONI.md` alla
data del 7 settembre 2026. Resta scritto qui perché non venga «corretto» d'iniziativa da chi
rivede gli spilli fra sei mesi e li trova chiari: è una scelta, non una dimenticanza.

### La metà dell'app è già pronta, e non aspetta la generazione

Scritta il 7 settembre 2026, **prima** che il file esista: `MappaTokyo` disegna già il Covo come un
cartellino come tutti gli altri, con `assetCovoLadri()` che punta a
`public/asset/mappe/lmap/tokyo/covo-dei-ladri.png`. Finché quel file non c'è, l'immagine si toglie
da sola — `display: none`, non `visibility: hidden`, perché uno spazio riservato a un'immagine che
non c'è si vede come un buco — e resta la sola targa, che è esattamente quel che c'era prima.

**Quando Codex genera il file, il Covo diventa una figura senza che nessuno tocchi il codice.**
Nessuna delle due parti aspetta l'altra per finire, che è il punto.

La geometria è già verificata **nei due stati**, simulando l'arrivo della sagoma con una figura
vera della stessa famiglia:

| stato | 1280 px | 375 px |
|---|---|---|
| senza sagoma (oggi) | 0 sovrapposizioni, 0 fuori tela | 0 e 0 |
| con la sagoma (domani) | 0 sovrapposizioni, 0 fuori tela | 0 e 0 |

Il Covo è stato alzato da `y: 92` a `y: 89.5`: con la sola targa il margine dal fondo era di
17 px, che una figura più alta avrebbe mangiato. Ora sono 35, e c'è spazio per una sagoma un po'
più generosa di quella di prova.

**Resta comunque da rifare la prova di `docs/MAPPE.md` quando il file vero arriva**: la simulazione
usa la sagoma di Yongen-Jaya, e una figura con proporzioni diverse cambia i numeri. Ma se cambiano,
cambiano di poco, e non si parte da zero.

---

## 5. Covo dei Ladri — illustrazione per la piastrella della Guida

| | |
|---|---|
| **file** | `public/asset/guida/covo.png` |
| **misura** | 256 × 256 px |
| **sfondo** | trasparente, **alfa reale** attorno alla figura (come le altre sedici) |
| **stato** | **`da verificare`** — prompt scritto da Claude il 7 settembre 2026, tocca a Codex leggerlo |
| **serve a** | `src/components/guida/sezioniGuida.tsx`, chiave `guida/covo` |

**Perché serve, e come l'ho scoperto.** Il Covo dei Ladri era la terza linguetta della pagina dei
trofei e ora ha una pagina sua, quindi l'indice della Guida ha **diciassette** piastrelle. Le
illustrazioni in `public/asset/guida/` sono **sedici**: manca esattamente questa, ed è la voce che
il rifacimento ha creato. Senza il file la piastrella non si rompe — mostra la riserva vettoriale,
la maschera — ma è l'unica dell'indice a non avere un disegno, e in una griglia si vede subito.

**È una voce diversa dalla 4 e non la sostituisce.** La 4 è la *sagoma* per la mappa di Tokyo:
nera piatta, ritagliata, appoggiata su fondo rosso. Questa è l'*illustrazione* della piastrella:
a colori, con il contorno spesso, in mezzo alle altre sedici. Stesso soggetto, due mestieri
diversi; generarne una sola lascerebbe l'altro posto vuoto.

**Il riferimento è nel repository, e va guardato prima di generare.** È la regola che questo
progetto ha imparato sbagliando: `public/asset/guida/dungeon.png` (la maschera sulla pietra
spaccata), `public/asset/guida/completamento.png` (la coppa nell'alloro) e
`public/asset/guida/citta.png` (il treno sotto il sole rosso). La resa deve stare in mezzo a
quelle senza distinguersi: **contorno nero spesso e uniforme, campiture bianche, un solo accento
rosso, nessuno sfondo, figura centrata con un piccolo margine e un sottile alone bianco esterno,
come un adesivo ritagliato.**

**Il soggetto.** Il Covo è la sala del menu di Royal dove i Ladri Fantasma tengono i trofei e
spendono le Medaglie P. Le due cose che lo dicono a colpo d'occhio sono **la poltrona alta** dove
siede Joker e **la medaglia**. Non la maschera: quella è già la piastrella dei Palazzi, e due
piastrelle con lo stesso segno si confondono in una griglia — che è precisamente il difetto da
evitare.

**Prompt**

> Illustrazione a icona in stile Persona 5 Royal, **contorno nero spesso e uniforme, campiture
> bianche, un solo accento rosso**, su fondo completamente trasparente.
>
> Il soggetto: una **poltrona alta con lo schienale a ventaglio**, vista di tre quarti da davanti,
> del tipo che sta in una sala da gioco — braccioli pieni, seduta imbottita, piedini corti. Sullo
> schienale, in alto, una **medaglia rotonda** con un nastro corto, appoggiata come un fregio.
> Dietro la poltrona, appena accennata, una **mensola con due o tre coppe e una cornice**, ridotte
> a sagome semplici: si devono leggere come «trofei», non come oggetti distinti.
>
> **L'accento rosso è solo sulla medaglia e sul cuscino della seduta.** Tutto il resto è bianco
> con il contorno nero. Nessun grigio, nessuna sfumatura, nessuna ombreggiatura morbida: le
> ombre, se servono, sono macchie nere piatte.
>
> Il taglio è **grafico e spigoloso**, da adesivo: linee dritte, angoli netti, prospettiva forzata,
> il tratto più spesso sul contorno esterno e più sottile nei dettagli interni.
>
> Nessuna cornice, nessun riquadro, nessun testo, nessuna scritta, nessuna maschera da ladro,
> nessun personaggio. La figura occupa quasi tutta la tela, centrata, con un margine di poche
> decine di pixel e un sottile alone bianco che la stacca dal fondo.

### La metà dell'app è già pronta

La piastrella esiste già in `sezioniGuida.tsx` con la chiave `covo` e la riserva vettoriale: quando
il file arriva in `public/asset/guida/covo.png` il plugin lo mette nel manifest e la piastrella lo
usa **senza che nessuno tocchi il codice**, esattamente come per le altre sedici. C'è una prova che
lo garantisce, in `src/pages/GuidaPage.test.tsx`: monta l'indice con e senza manifest e conta le
riserve, quindi si accorge se una piastrella smettesse di accettare la propria illustrazione.
