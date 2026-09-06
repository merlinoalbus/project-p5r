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

## 2. I nove grappoli dei dedali dei Memento

| | |
|---|---|
| **file** | `public/asset/mappe/lmap/memento/dedalo-1.png` … `dedalo-9.png` |
| **misura** | 900 × 700 px ciascuno |
| **sfondo** | trasparente, **alfa reale** |
| **stato** | `da verificare` — prompt di Claude, verifica a Codex |
| **serve a** | `src/components/mappe/MappaMemento.tsx` |

**Perché servono.** I Memento nel gioco sono un imbuto che sprofonda sotto Tokyo, e ogni dedalo è
un **grappolo di edifici** aggrovigliati che scende lungo la spirale, legato al successivo da un
filo rosso. Il cratere, le crepe, lo skyline e il filo sono già disegnati; al posto dei grappoli
oggi c'è la sola targa col nome, e senza di essi la mappa è una struttura senza corpo.

Nel foglio degli sprite non ci sono: `P5_MAPDATA.SPD` contiene solo i livelli dell'effetto animato
dell'ingresso — una nuvola, dei nastri, degli aloni — che nella mappa fanno l'atmosfera.

**Prompt** (uno per dedalo, variando come detto sotto)

> Grappolo di edifici aggrovigliati in stile Persona 5 Royal, visto **dall'alto e di sbieco**, come
> un pezzo di città strappato e sospeso nel vuoto. Palazzi, scale, tubature e passerelle
> incastrati fra loro senza logica, che si avvitano verso il basso; sotto, il grappolo si assottiglia
> e sfrangia in tralicci e detriti, come se fosse stato divelto dal terreno.
>
> Resa a **due soli valori**: bianco sporco per le facciate illuminate e nero pieno per le ombre e i
> fianchi, con un contorno nero spesso e irregolare tutto attorno. Nessun grigio intermedio, nessuna
> sfumatura, nessun colore. Il taglio è da xilografia: linee dritte, angoli netti, prospettiva
> forzata e volutamente instabile.
>
> Nessuna cornice, nessun riquadro, nessun testo, nessuna scritta. Fondo trasparente.
>
> Il grappolo occupa quasi tutta la tela, più largo in alto e più stretto in basso.

**Come variarli.** Devono somigliarsi come nove pezzi dello stesso crollo, non essere nove disegni
diversi. Scendendo dal primo al nono: sempre più **piccoli e fitti**, sempre più **contorti**, e con
sempre meno finestre illuminate — il nono è quasi tutto nero, con qualche taglio bianco. Il primo è
il più largo e riconoscibile come città; l'ultimo è quasi solo struttura.

**Come si verifica quando arrivano**

1. alfa reale: canale 0..255, angolo trasparente;
2. messi in fila dal primo al nono si legge una progressione, non nove disegni scollegati;
3. sulla mappa, alle misure con cui vengono disegnati — dal 20% al 11% della larghezza scendendo —
   la sagoma resta leggibile e non diventa una macchia.

---

## 3. Le catene del cratere dei Memento

| | |
|---|---|
| **file** | `public/asset/mappe/lmap/memento/catena.png` |
| **misura** | 1200 × 200 px, pensata per essere ripetuta e ruotata |
| **sfondo** | trasparente, **alfa reale** |
| **stato** | `da verificare` — prompt di Claude, verifica a Codex |
| **serve a** | `src/components/mappe/MappaMemento.tsx` |

**Prompt**

> Una catena a maglie grosse, vista di lato, che attraversa l'immagine da sinistra a destra
> seguendo una curva molto ampia e appena ondulata. Maglie ovali spesse, disegnate come **sagoma
> nera piatta** con un taglio bianco sottile a suggerire il volume di ciascuna: nessun grigio,
> nessuna sfumatura, nessun colore.
>
> Il tratto è irregolare, da xilografia, con il contorno che ispessisce e si assottiglia. Le maglie
> non sono tutte identiche: qualcuna più stretta, qualcuna più aperta.
>
> La catena entra da un bordo ed esce dall'altro, senza estremi visibili. Fondo trasparente,
> nessuna cornice, nessun testo.
