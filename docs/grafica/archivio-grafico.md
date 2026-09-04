# Archivio grafico — prompt, riferimenti e registro degli asset già consegnati

Materiale spostato qui il 2026-09-04 su richiesta dell'utente: i documenti operativi (`prompt-immagini.md`, `riferimenti-visivi.md`,
`stato-generazione-asset.md`) contengono solo il lavoro ancora da fare. Qui restano, per storia e per rigenerazioni, le specifiche
degli asset consegnati e approvati.


## Prompt degli asset consegnati (da `prompt-immagini.md`)

### 1. Identità dell'app

### 1.1 Logo principale — `identita/logo.png` (1024×1024, trasparente) e `identita/logo-orizzontale.png` (1600×500)
Testo nell'immagine: **P5R** sopra e **COMPAGNO DI GIOCO** sotto (varianti senza testo: `identita/logo-senza-testo.png`, `identita/logo-orizzontale-senza-testo.png`).
```
[blocco di stile] Logo originale per un'app compagno di gioco: una maschera da ladro stilizzata, bianca con
bordi neri, tagliata in diagonale da una fiamma rossa a forma di cuore rovesciato; sotto, il lettering
"P5R" grande e "COMPAGNO DI GIOCO" piccolo, lettere di altezze diverse, bianche su tasselli neri e rossi
ruotati, stile ritaglio di giornale. Composizione centrata su sfondo trasparente. Ispirazione per l'emblema (NON copiare):
https://static.wikia.nocookie.net/megamitensei/images/2/28/Phantom_Thieves_Logo.png/revision/latest?cb=20170528120634
```

### 1.2 Favicon / icona app — `identita/icona-512.png`, `icona-192.png`, `icona-32.png` (quadrate, angoli pieni)
Nessun testo.
```
[blocco di stile] Icona app quadrata: sfondo nero, una fascia diagonale rossa, al centro la sola maschera bianca
stilizzata del logo (punto 1.1) in forma semplificata leggibile anche a 32 px. Nessun testo, nessun dettaglio fine.
```

### 1.3 Splash / schermata di caricamento — `identita/splash-verticale.webp` (1536×2048) e `identita/splash-orizzontale.webp` (2048×1536)
Testo: **PRENDIAMO IL TUO CUORE** in piccolo in basso (varianti senza testo: `identita/splash-verticale-senza-testo.webp`, `identita/splash-orizzontale-senza-testo.webp`).
```
[blocco di stile] Schermata di apertura: esplosione di forme rosse e nere a ritaglio che convergono al centro,
dove campeggia la maschera del logo; retino a punti sui bordi, stelle bianche a quattro punte come accenti.
In basso, piccolo, il lettering "PRENDIAMO IL TUO CUORE" a ritagli bianchi su nero.
Ispirazione: https://static.wikia.nocookie.net/megamitensei/images/1/1b/P5R_LetUsStartTheGame.png/revision/latest?cb=20191027172059
```

### 2. Sfondi

### 2.1 Sfondo generale — `sfondi/pattern-nero.webp` (2048×2048, ripetibile)
```
[blocco di stile] Texture ripetibile (tile senza giunzioni): nero #0b0b0e con sottili schizzi e graffi grigio
scuro #1c1c24, rari frammenti rossi a ritaglio, retino a punti molto leggero. Contrasto basso: deve restare
leggibile il testo bianco sopra. Nessun soggetto, nessun testo.
```

### 2.2 Sfondo "Stanza di Velluto" (pagine di fusione) — `sfondi/stanza-velluto.webp` (2560×1440)
```
[blocco di stile] Interno di una prigione circolare in velluto blu profondo (#1b2a6b) con celle a sbarre nere,
un lampadario centrale, pavimento a scacchi in prospettiva, luce fredda; atmosfera onirica, nessun personaggio.
Zona centrale leggermente più scura per ospitare l'interfaccia. Ispirazione (NON copiare):
https://static.wikia.nocookie.net/megamitensei/images/0/07/P5_Velvet_Room_title_screen.jpg/revision/latest?cb=20170617175011
```

### 2.3 Sfondo "Allarme delle fusioni" — `sfondi/stanza-velluto-allarme.webp` (2560×1440)
```
Stessa scena del punto 2.2 ma virata in rosso sangue (#7a0e0e → #2a0303), luci rotanti d'allarme, ombre dure,
retino rosso sui bordi. Ispirazione: https://static.wikia.nocookie.net/megamitensei/images/0/0e/P5R_RedAlert.jpg/revision/latest?cb=20200610202410
```

### 2.4 Sfondo "Mementos" (compendio/dungeon) — `sfondi/mementos.webp` (2560×1440)
```
[blocco di stile] Tunnel della metropolitana distorto, binari che si perdono nel buio, pareti rosse pulsanti
con venature nere, nebbia bassa; nessun personaggio, nessun testo.
```

### 3. Carte degli Arcani (24) — `arcani/<chiave>.png` (768×1344, trasparente, angoli vivi)

Stile comune delle carte (ispirato alle carte del gioco, che riportano i titoli in francese; qui in **italiano**):
```
[blocco di stile] Carta dei tarocchi in stile Persona 5: cornice nera spessa con bordo interno bianco irregolare,
illustrazione centrale in due soli colori (bianco e nero) più rosso come accento, tratto spesso e silhouette
piatte, retino a punti nelle ombre; in alto il numero romano, in basso su una fascia nera il titolo in maiuscolo
bianco a lettere sbilenche: "<TITOLO>". Ispirazione di impostazione (NON copiare):
https://static.wikia.nocookie.net/megamitensei/images/0/0b/P5_Fool_arcana_cooperation.png/revision/latest?cb=20160915143157
```
Variante senza testo per ogni carta: `arcani/<chiave>-senza-testo.png` (senza titolo E senza numero romano: l'app sovrappone entrambi).

| File | Numero | Titolo (testo in carta) | Soggetto dell'illustrazione |
|---|---|---|---|
| `fool.png` | 0 | IL MATTO | giovane di spalle con fagotto sulla spalla, un passo oltre l'orlo di un precipizio, cane che abbaia |
| `magician.png` | I | IL MAGO | figura con cappello a tesa e mano alzata verso una stella, tavolo con calice, spada, moneta, bastone |
| `priestess.png` | II | LA PAPESSA | figura seduta fra due colonne (una bianca, una nera) con un libro chiuso in grembo, luna ai piedi |
| `empress.png` | III | L'IMPERATRICE | figura in trono con corona di stelle, campo di grano, scudo con simbolo di Venere |
| `emperor.png` | IV | L'IMPERATORE | figura in trono di pietra con teste di ariete, scettro, montagne alle spalle |
| `hierophant.png` | V | L'IEROFANTE | figura con triregno e chiavi incrociate, due accoliti inginocchiati |
| `lovers.png` | VI | GLI AMANTI | due figure sotto un angelo con ali spiegate, sole in alto |
| `chariot.png` | VII | IL CARRO | guerriero su un carro trainato da due sfingi (una bianca, una nera) |
| `justice.png` | VIII | LA GIUSTIZIA | figura in trono con spada alzata e bilancia |
| `hermit.png` | IX | L'EREMITA | vecchio incappucciato con lanterna e bastone su una vetta |
| `fortune.png` | X | LA FORTUNA | grande ruota con simboli, sfinge in cima, figure che salgono e cadono |
| `strength.png` | XI | LA FORZA | figura che chiude con calma le fauci di un leone, simbolo dell'infinito sul capo |
| `hanged.png` | XII | L'APPESO | figura appesa a testa in giù per una caviglia a un albero a T, aureola |
| `death.png` | XIII | LA MORTE | scheletro in armatura a cavallo con stendardo nero, sole all'orizzonte |
| `temperance.png` | XIV | LA TEMPERANZA | angelo che versa acqua fra due calici, un piede nell'acqua |
| `devil.png` | XV | IL DIAVOLO | figura cornuta su un piedistallo con due prigionieri incatenati |
| `tower.png` | XVI | LA TORRE | torre colpita da un fulmine, corona che cade, due figure precipitano |
| `star.png` | XVII | LA STELLA | figura inginocchiata che versa acqua sotto una grande stella e sette piccole |
| `moon.png` | XVIII | LA LUNA | luna con volto fra due torri, cane e lupo che ululano, gambero che esce dall'acqua |
| `sun.png` | XIX | IL SOLE | sole con volto e raggi, bambino su cavallo bianco, girasoli |
| `judgement.png` | XX | IL GIUDIZIO | angelo con tromba, figure che si alzano dalle tombe |
| `world.png` | XXI | IL MONDO | figura danzante dentro una corona d'alloro, quattro creature agli angoli |
| `faith.png` | — | LA FEDE | (arcano Royal) figura papale incappucciata in trono con tiara e croce a tre bracci, mano alzata in benedizione, due accoliti incatenati in basso; ispirazione (NON copiare): https://static.wikia.nocookie.net/megamitensei/images/e/e6/Faith.png/revision/latest?cb=20200508064816 (carta ufficiale "LA FOI"); motivo a stelle dell'icona di Kasumi: https://static.wikia.nocookie.net/megamitensei/images/b/bf/Persona_5_Confidant_Guides_Icon_%28Faith%29_-_Kasumi_Yoshizawa.png/revision/latest?cb=20241201203857 |
| `councillor.png` | — | IL CONSIGLIERE | (arcano Royal) figura seduta di tre quarti con un libro aperto e una mano tesa in gesto di aiuto, sole velato alle spalle; ispirazione: https://static.wikia.nocookie.net/megamitensei/images/5/5b/P5_Royal_Consultant_Arcana.png/revision/latest?cb=20200508064739 |

Prompt di esempio (Matto):
```
[blocco di stile] [stile carta] Numero "0" in alto, titolo "IL MATTO" in basso. Illustrazione: giovane di
spalle con fagotto sulla spalla, un passo oltre l'orlo di un precipizio, un cane che abbaia; sole a raggi
stilizzati in alto. Bianco e nero con accento rosso sul fagotto. Sfondo trasparente fuori dalla carta.
```

### 3.1 Icone arcano piccole (24) — `arcani/icona/<chiave>.png` (256×256, trasparente)
Nessun testo. Usate anche come icona-arcano dei Confidenti (§9).
```
[blocco di stile] Icona tonda nera con bordo bianco irregolare; dentro, in bianco piatto con un accento rosso,
il solo simbolo indicato, leggibile a 32 px. Nessun testo.
```
| File | Simbolo |
|---|---|
| `fool.png` | fagotto legato a un bastone |
| `magician.png` | stella a cinque punte con bacchetta |
| `priestess.png` | luna crescente su un libro chiuso |
| `empress.png` | corona con spiga di grano |
| `emperor.png` | scettro con testa di ariete |
| `hierophant.png` | due chiavi incrociate |
| `lovers.png` | due cuori intrecciati |
| `chariot.png` | ruota con ala |
| `justice.png` | bilancia a due piatti |
| `hermit.png` | lanterna |
| `fortune.png` | ruota a otto raggi |
| `strength.png` | testa di leone frontale |
| `hanged.png` | figura capovolta stilizzata (una gamba piegata) |
| `death.png` | falce |
| `temperance.png` | due calici con un filo d'acqua fra loro |
| `devil.png` | corna con catena |
| `tower.png` | torre spezzata da un fulmine |
| `star.png` | stella a otto punte |
| `moon.png` | luna con volto di profilo |
| `sun.png` | sole a raggi ondulati |
| `judgement.png` | tromba con stendardo |
| `world.png` | corona d'alloro chiusa |
| `faith.png` | tre stelle a quattro punte in spirale |
| `councillor.png` | libro aperto con una mano tesa |

### 4. Icone degli elementi (16) — `elementi/<chiave>.png` (256×256, trasparente)
Nessun testo. Colore di riferimento fra parentesi.
```
[blocco di stile] Icona di un elemento di attacco per un gioco: forma piatta a due toni sul colore indicato con
contorno nero spesso e un riflesso bianco a ritaglio, dentro un tondo nero irregolare. Nessun testo, nessuna
sfumatura. Ispirazione della famiglia di icone (NON copiare):
https://static.wikia.nocookie.net/megamitensei/images/a/ac/Fire_Icon_P5.png/revision/latest?cb=20160818040732
```
| File | Soggetto |
|---|---|
| `phys.png` | esplosione d'impatto a stella (Fisico, #c9a227) |
| `gun.png` | foro di proiettile con schegge (Arma da fuoco, #8f8f9a) |
| `fire.png` | fiamma a tre lingue (Fuoco, #f0552b) |
| `ice.png` | cristallo esagonale (Ghiaccio, #5ec8f2) |
| `electric.png` | fulmine a zig-zag (Elettricità, #f2d94e) |
| `wind.png` | vortice a spirale con tre code (Vento, #5fd67a) |
| `psy.png` | onde concentriche con un occhio al centro (Psichico, #e06bd6) |
| `nuclear.png` | trifoglio radioattivo (Nucleare, #4dd7c9) |
| `bless.png` | anello luminoso con raggi (Sacro, #f5f0c8) |
| `curse.png` | teschio stilizzato (Oscurità, #a05cf0) |
| `almighty.png` | raggiera bianca a otto punte (Quasi-divino, #ffffff) |
| `healing.png` | goccia con croce (Guarigione, #7fe0a5) |
| `ailment.png` | spirale con punto esclamativo (Alterazione, #d9a066) |
| `support.png` | freccia in su dentro uno scudo (Supporto, #8ab4f8) |
| `passive.png` | ingranaggio (Passiva, #b0b0c0) |
| `trait.png` | maschera piccola (Tratto, #ececf1 = `--color-el-tratto`) |

### 5. Icone delle affinità (6) — `affinita/<codice>.png` (256×256, trasparente)
Testo nell'immagine: la sigla italiana indicata, maiuscola, bianca a ritaglio. Variante senza testo per
ciascuna: `affinita/<codice>-senza-testo.png`. La chiave `-` del dataset (Normale) corrisponde al file `normale.png`.
```
[blocco di stile] Tassello quadrato nero ruotato di 6°, bordo bianco; dentro il simbolo nel colore indicato e
sotto la sigla in bianco.
```
| File | Sigla | Simbolo | Colore |
|---|---|---|---|
| `wk.png` | DEB | freccia spezzata verso il basso | rosso `#e5352b` |
| `rs.png` | RES | scudo | grigio chiaro `#a3a3b3` |
| `nu.png` | ANN | cerchio barrato | bianco `#ececf1` |
| `rp.png` | RIF | freccia che rimbalza | giallo `#f2d94e` |
| `ab.png` | ASS | goccia che entra in un cerchio | verde `#5fd67a` |
| `normale.png` | — | trattino | grigio `#6f6f80` |

### 6. Doti sociali (5) — `doti/<chiave>.png` (512×256, trasparente)
Testo nell'immagine: il nome italiano indicato; variante senza testo `doti/<chiave>-senza-testo.png`.
```
[blocco di stile] Targhetta orizzontale dorata (#c9a227) con bordo nero e riflesso bianco a ritaglio: a sinistra il
simbolo, a destra il nome in maiuscolo nero. Ispirazione (NON copiare):
https://static.wikia.nocookie.net/megamitensei/images/e/ea/P5_Icon_Knowledge.png/revision/latest?cb=20220719095505
```
| File | Testo | Simbolo |
|---|---|---|
| `conoscenza.png` | CONOSCENZA | libro aperto con lampadina |
| `fascino.png` | FASCINO | stella con scia |
| `coraggio.png` | CORAGGIO | pugno chiuso con fiamma |
| `gentilezza.png` | GENTILEZZA | cuore fra due mani |
| `perizia.png` | PERIZIA | chiave inglese e pennello incrociati |

Variante "grafico a stella" — `doti/stella-vuota.png` (1024×1024): pentagono a cinque assi con etichette
CONOSCENZA, FASCINO, CORAGGIO, GENTILEZZA, PERIZIA ai vertici, griglia a 5 livelli, sfondo trasparente
(variante `doti/stella-vuota-senza-testo.png` con i soli assi e la griglia); ispirazione
https://static.wikia.nocookie.net/megamitensei/images/f/fe/P5_SocialStats.png/revision/latest?cb=20220530130911

### 7. Navigazione e interfaccia

### 7.1 Icone di navigazione (6) — `ui/nav-<chiave>.png` (256×256, trasparente, bianco su trasparente + variante rossa `-attiva.png`)
Nessun testo.
```
[blocco di stile] Icona di navigazione monocromatica (bianco pieno #ececf1; variante attiva in rosso #e5352b),
contorno netto, angoli tagliati in diagonale, leggibile a 24 px, sfondo trasparente. Soggetto: <vedi tabella>.
Ispirazione per il taglio delle forme: https://static.wikia.nocookie.net/megamitensei/images/3/34/Persona_5_menu.png/revision/latest?cb=20161221113959
```
| File | Soggetto |
|---|---|
| `nav-home.png` | casa a ritaglio con stella |
| `nav-compendio.png` | libro chiuso con maschera in copertina |
| `nav-skill.png` | fulmine dentro un tondo |
| `nav-fusione.png` | due frecce che convergono in una ghigliottina stilizzata |
| `nav-partita.png` | maschera da ladro |
| `nav-impostazioni.png` | ingranaggio con angoli tagliati |

### 7.2 Badge rango Confidente (10) — `ui/rango-<n>.png` (256×256, trasparente)
Testo: il numero da 1 a 9 (`rango-1.png` … `rango-9.png`); il rango 10 è `rango-max.png` con il testo "MAX" (come nel gioco, non esiste `rango-10`); variante senza testo `ui/rango-senza-testo.png` (tassello vuoto, il numero lo scrive l'app).
```
[blocco di stile] Tassello nero a forma di ritaglio con bordo bianco, numero enorme bianco sbilenco "<n>",
un piccolo lampo rosso dietro. Ispirazione del lettering "RANK":
https://static.wikia.nocookie.net/megamitensei/images/e/e8/Goro-Royal-Confidant-Screen.png/revision/latest?cb=20191129205848
```

### 7.3 Badge di stato — `ui/badge-allarme.png`, `ui/badge-dlc.png`, `ui/badge-tesoro.png`, `ui/badge-speciale.png`, `ui/badge-nuova-partita.png` (512×192, trasparente)
Testi: **ALLARME**, **DLC**, **TESORO**, **SPECIALE**, **NUOVA PARTITA +**; varianti senza testo `ui/badge-senza-testo.png` (etichetta nera vuota) e `ui/badge-allarme-senza-testo.png` (etichetta rossa vuota).
```
[blocco di stile] Etichetta a parallelogramma nera con bordo rosso, testo bianco maiuscolo a ritaglio "<TESTO>";
per ALLARME sfondo rosso pulsante e testo nero.
```

### 7.4 Pulsanti azione (sprite) — `ui/pulsante-primario.png`, `ui/pulsante-secondario.png` (9-slice, 600×160)
Nessun testo.
```
[blocco di stile] Pulsante a forma di parallelogramma con angoli tagliati: primario rosso con bordo nero e
riflesso bianco; secondario nero con bordo bianco. Bordi netti, nessuna ombra morbida.
```

### 7.5 Cornice scheda Persona — `ui/cornice-scheda.png` (1600×1000, trasparente al centro)
```
[blocco di stile] Cornice irregolare nera con tagli diagonali e bordo bianco, angolo in alto a sinistra con
un'area rossa per il titolo; interno trasparente. Ispirazione della composizione:
https://static.wikia.nocookie.net/megamitensei/images/8/8b/Arsene_P5R.jpg/revision/latest?cb=20200429000427
```

### 7.6 Icone delle statistiche (5) — `ui/stat-<chiave>.png` (256×256, trasparente)
Nessun testo (la sigla FR/MA/RS/AG/FO la scrive l'app).
```
[blocco di stile] Icona monocromatica bianca con contorno nero e accento rosso, stessa famiglia di §7.1. Soggetto: <tabella>.
```
| File | Statistica | Soggetto |
|---|---|---|
| `stat-forza.png` | Forza | pugno |
| `stat-magia.png` | Magia | stella con scia |
| `stat-resistenza.png` | Resistenza | scudo |
| `stat-agilita.png` | Agilità | piuma con linee di velocità |
| `stat-fortuna.png` | Fortuna | quadrifoglio |

### 7.7 Badge Demone del Tesoro (9) — `ui/tesoro-<slug>.png` (256×256, trasparente)
Nessun testo. Slug: `crystal-skull`, `koh-i-noor`, `queens-necklace`, `regent`, `stone-of-scone`, `orlov`, `emperors-amulet`, `hope-diamond`, `orichalcum`.
```
[blocco di stile] Gemma stilizzata a sfaccettature piatte in due toni (bianco e un colore: teschio di cristallo
azzurro, diamante bianco, collana d'oro, corona d'oro con rubino, pietra grigia, diamante bianco-azzurro,
amuleto d'oro, diamante blu, lingotto arancione), contorno nero, sfondo trasparente, nessun testo.
```

Le icone dei **tipi di eredità** riusano le icone degli elementi (§4) con questa mappatura (chiave eredità → file): Physical → `phys`, Fire → `fire`, Ice → `ice`, Electric → `electric`, Wind → `wind`, Psy → `psy`, Nuclear → `nuclear`, Bless → `bless`, Curse → `curse`, Healing → `healing`, Ailment → `ailment`, Almighty → `almighty`.

### 8. Stati vuoti e messaggi (4) — `illustrazioni/<nome>.png` (1200×800, trasparente)
Per ogni illustrazione con testo esiste la variante `illustrazioni/<nome>-senza-testo.png` (consigliata: il testo
"QUALCOSA È ANDATO STORTO" contiene una lettera accentata, spesso resa male dai generatori).
```
[blocco di stile] Illustrazione a due colori (bianco e nero) più rosso, tratto a inchiostro, retino nelle ombre,
sfondo trasparente, composizione centrata con molto spazio vuoto intorno; in basso, se richiesto, il testo in
maiuscolo a ritaglio bianco su tasselli neri: "<TESTO>". Scena: <vedi tabella>.
```
| File | Testo nell'immagine | Scena |
|---|---|---|
| `vuoto-persona.png` | NESSUNA PERSONA | maschera bianca capovolta su un tavolo con una lampada, ombra lunga |
| `vuoto-partita.png` | NESSUNA PARTITA | sedia vuota nella Stanza di Velluto, cella aperta |
| `errore.png` | QUALCOSA È ANDATO STORTO | ghigliottina inceppata con un lampo rosso e un teschio stilizzato che ride |
| `caricamento.png` | — | maschera del logo con tre stelle che ruotano (per animazione a fotogrammi, 8 fotogrammi 256×256 in `illustrazioni/caricamento-<n>.png`) |

### 9. Confidenti (23) — `confidenti/<chiave>.png` (768×1024, trasparente); l'icona dell'arcano è quella di §3.1 (`arcani/icona/<arcano>.png`), nessun file aggiuntivo

Stile comune del ritratto (ispirato alla schermata Confidente: ritratto bianco e nero a retino con accento rosso):
```
[blocco di stile] Ritratto a mezzo busto in bianco e nero ad alto contrasto con retino a punti, sfondo trasparente,
un'unica campitura rossa dietro la testa a forma di ritaglio, tratto a inchiostro spesso. Personaggio ispirato
alla descrizione seguente (reinterpretazione originale nello stile, non copia dell'illustrazione ufficiale).
Ispirazione per impostazione e resa a retino: https://static.wikia.nocookie.net/megamitensei/images/e/e8/Goro-Royal-Confidant-Screen.png/revision/latest?cb=20191129205848
e le icone Confidente del wiki, es. https://static.wikia.nocookie.net/megamitensei/images/5/57/Persona_5_Confidant_Guides_Icon_%28Magician%29_-_Morgana.png/revision/latest?cb=20241201203706
```
| Chiave file | Confidente | Arcano | Descrizione da inserire nel prompt |
|---|---|---|---|
| `igor` | Igor | Matto | anziano dal naso lunghissimo e sorriso enigmatico, smoking scuro, mani giunte su una scrivania |
| `morgana` | Morgana | Mago | gatto antropomorfo bianco e nero con grandi occhi azzurri, fazzoletto giallo al collo, cintura |
| `ryuji` | Ryuji | Carro | ragazzo con capelli biondi decolorati e ciuffo, sorriso sfacciato, giacca da atleta, postura sciolta |
| `ann` | Ann | Amanti | ragazza con lunghi capelli biondi a due code, occhi chiari, espressione vivace, felpa rossa |
| `yusuke` | Yusuke | Imperatore | ragazzo alto e magro con capelli blu scuro a caschetto, sguardo assorto, sciarpa, pennello in mano |
| `makoto` | Makoto | Papessa | ragazza con capelli castani corti e fascia, sguardo deciso, colletto ordinato |
| `futaba` | Futaba | Eremita | ragazza minuta con lunghi capelli arancioni, grandi occhiali, cuffie al collo, sguardo timido |
| `haru` | Haru | Imperatrice | ragazza con capelli ricci castano chiaro, espressione dolce, maglione elegante con fiocco |
| `akechi` | Akechi | Giustizia | ragazzo con capelli castano chiaro ondulati, sorriso da detective, guanti, giacca beige |
| `kasumi` | Kasumi | Fede | ragazza con capelli rossi raccolti e fiocco, portamento da ginnasta, espressione determinata |
| `sojiro` | Sojiro | Ierofante | uomo maturo con pizzetto e capelli brizzolati pettinati all'indietro, occhiali, grembiule da caffetteria, espressione burbera e gentile |
| `takemi` | Takemi | Morte | dottoressa con caschetto nero e frangia, camice bianco, collarino, sguardo indagatore |
| `kawakami` | Kawakami | Temperanza | insegnante con capelli castani raccolti, aria stanca ma affettuosa, cardigan |
| `yoshida` | Yoshida | Sole | uomo anziano robusto con occhiali, giacca di tweed, megafono, sorriso paterno |
| `mishima` | Mishima | Luna | ragazzo esile con capelli neri spettinati e cerotto sul viso, espressione ansiosa, telefono in mano |
| `ohya` | Ohya | Diavolo | giornalista con capelli neri corti, camicia sbottonata, taccuino e bicchiere, sguardo sveglio |
| `hifumi` | Hifumi | Stella | ragazza con lunghi capelli neri e frangia, kimono leggero, pezzo di shogi fra le dita, espressione concentrata |
| `chihaya` | Chihaya | Fortuna | cartomante con lunghi capelli biondo cenere, abito bianco, carte dei tarocchi a ventaglio |
| `iwai` | Iwai | Appeso | uomo burbero con cappello, lecca-lecca in bocca, tatuaggio sul collo, giubbotto |
| `shinya` | Shinya | Torre | bambino con berretto girato, cuffie, joystick, sguardo di sfida |
| `gemelle` | Gemelle Custodi (Caroline e Justine) | Forza | due bambine gemelle in uniforme blu da guardiana con berretto, una con benda sull'occhio destro e manganello, l'altra con benda sull'occhio sinistro e cartellina |
| `sae` | Sae | Giudizio | donna con lunghi capelli argentati, tailleur scuro, sguardo severo, fascicolo |
| `maruki` | Maruki | Consigliere | uomo giovane con capelli castani scomposti, occhiali, camice da consulente, sorriso gentile |

Icona dell'arcano del Confidente: l'app usa `arcani/icona/<arcano>.png` di §3.1 (nessun file da produrre qui).

### 10. Persona del compendio (232) — `persona/<slug>.png` (768×768, trasparente) — template

Prompt template (sostituire {NOME} e {DESCRIZIONE}). Regola dello slug: minuscolo, accenti rimossi, apostrofi eliminati,
spazi sostituiti da trattini, trattini doppi compressi — es. `jack-frost`, `arsene`, `jack-o-lantern`, `izanagi-no-okami-picaro`, `kikuri-hime`, `queens-necklace` (stessa regola dei tesori in §7.7):
```
[blocco di stile] Illustrazione originale di una creatura mitologica per un compendio, ispirata a {NOME}
({DESCRIZIONE} — mitologia di origine, attributi iconici). Posa dinamica a tre quarti, silhouette leggibile,
massimo tre colori più nero, retino nelle ombre, sfondo trasparente. Nessun testo. Non riprodurre il design
ufficiale del gioco.
```
Esempi:
- Jack Frost: pupazzo di neve folletto con cappello a punta blu e sciarpa, sorriso beffardo (folclore inglese).
- Pixie: fatina minuscola con ali di libellula e vestitino azzurro (folclore celtico).
- Arsène: gentiluomo ladro con cilindro, mantello rosso, ali nere spinate e stivali con tacco (romanzo francese, Arsène Lupin).
Consiglio: generare per prime le 30 Persona di livello più basso (le prime che si incontrano).

### 11. Calendario e meteo (per la fase 6) — `meteo/<chiave>.png` (256×256, trasparente)
Nessun testo.
```
[blocco di stile] Icona meteo piatta bianca con contorno nero e un accento azzurro #5ec8f2 o giallo #f2d94e,
angoli tagliati, leggibile a 24 px, sfondo trasparente. Soggetto: <vedi tabella>. Ispirazione dell'HUD data/meteo:
https://static.wikia.nocookie.net/megamitensei/images/1/1e/P5_CalendarSwitch.png/revision/latest?cb=20220530115406
```
| File | Soggetto |
|---|---|
| `sereno.png` | sole a raggi netti |
| `nuvoloso.png` | nuvola con angolo tagliato |
| `pioggia.png` | nuvola con gocce diagonali |
| `temporale.png` | nuvola con fulmine |
| `neve.png` | fiocco a sei punte |
| `nebbia.png` | tre linee ondulate |
| `caldo.png` | sole con onde di calore |
| `freddo.png` | termometro con cristallo |
| `polline.png` | fiore con particelle |
| `tifone.png` | spirale con frecce |

Etichette del giorno (sprite testo) — `meteo/fascia-<chiave>.png` (600×160), chiavi `mattina`, `pausa-pranzo`, `dopo-la-scuola`, `sera`, `notte`, `giornata`: testi **MATTINA**, **PAUSA PRANZO**, **DOPO LA SCUOLA**, **SERA**, **NOTTE**, **GIORNATA** in lettering a ritaglio bianco su nero (variante `meteo/fascia-senza-testo.png`: sola targhetta vuota); ispirazione HUD:
https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1687950/ss_663171dc3afce8fe987e57e8659f91b69faa39bc.1920x1080.jpg

### 13. Guida, Palazzi e stati vuoti (Fase 11.6, richiesti il 2026-09-04)
Chiavi già cablate nell'app: appena i file compaiono in `public/asset/` sostituiscono le riserve vettoriali.

### 13.1 Icona di navigazione della Guida — `ui/nav-guida.png` + `ui/nav-guida-attiva.png` (256×256, trasparente)
Stesse regole di §7.1 (bianco su trasparente; variante rossa `-attiva`). Soggetto: libro aperto con una stella a ritaglio che spunta dalle pagine.

### 13.2 Icone delle sezioni della Guida (15) — `guida/<chiave>.png` (256×256, trasparente)
Nessun testo, nessun personaggio (senza spoiler).
```
[blocco di stile] Icona piatta bianca con contorno nero e un accento rosso #e5352b, angoli tagliati, leggibile a 48 px,
sfondo trasparente. Soggetto: <vedi tabella>.
```
| File | Soggetto |
|---|---|
| `percorso.png` | foglio di calendario con una stella e una freccia in avanti |
| `domande.png` | banco di scuola con un punto interrogativo a ritaglio |
| `cruciverba.png` | griglia di cruciverba con una matita |
| `calendario.png` | calendario con nuvola e sole |
| `dungeon.png` | maschera dei Ladri davanti a un portale |
| `richieste.png` | busta chiusa con sigillo rosso |
| `battaglia.png` | due spade incrociate con un lampo |
| `citta.png` | skyline di Tokyo con torre e treno |
| `negozi.png` | sacchetto della spesa con il simbolo dello yen |
| `attivita.png` | manubrio, libro e videocassetta impilati |
| `completamento.png` | coppa con corona d'alloro |
| `sfide.png` | scudo con fiamma |
| `personaggi.png` | tre sagome con maschera |
| `oggetti.png` | zaino aperto con attrezzi |
| `confidenti.png` | due mani che si stringono con un cuore |

### 13.3 Emblemi dei Palazzi e dei Dedali (10) — `palazzi/<chiave>.png` (512×512, trasparente)
Stemmi araldici a ritaglio in bianco, nero e rosso; NESSUN personaggio né volto (senza spoiler). Nessun testo.
```
[blocco di stile] Stemma araldico a ritaglio, bianco e nero con un accento rosso #e5352b, retino nelle ombre, forma a scudo
irregolare con tagli diagonali, sfondo trasparente. Soggetto: <vedi tabella>.
```
| File | Soggetto |
|---|---|
| `kamoshida.png` | castello con torri e una corona |
| `madarame.png` | cornice dorata di un quadro con un pennello |
| `kaneshiro.png` | caveau di banca con un lucchetto |
| `futaba.png` | piramide con un occhio in cima |
| `okumura.png` | razzo e stazione spaziale con un ingranaggio |
| `niijima.png` | fiche da casinò con una carta da gioco |
| `shido.png` | nave da crociera su un'onda |
| `iweleth.png` | grata di un pozzo con catene e una croce |
| `maruki.png` | provetta di laboratorio con un fiore e un caduceo |
| `mementos.png` | treno della metropolitana in un tunnel |

### 13.4 Icone giorno e sera (2) — `ui/giorno.png`, `ui/sera.png` (256×256, trasparente)
Nessun testo (le fasce testuali della giornata sono in §11). Stile di §4: `giorno.png` sole a raggi netti; `sera.png` luna crescente con una stella.

### 13.5 Stati vuoti dedicati (4, con variante senza testo) — `illustrazioni/<nome>.png` (1200×800, trasparente)
Stile e regole di §8 (testo in maiuscolo a ritaglio, variante `-senza-testo`).
| File | Testo nell'immagine | Scena |
|---|---|---|
| `vuoto-obiettivi.png` | NESSUN OBIETTIVO | bersaglio con una freccia e una maschera appesa a un chiodo |
| `vuoto-piani.png` | NESSUN PIANO | mappa arrotolata con una bussola |
| `vuoto-cicli.png` | NESSUN CICLO | due frecce che si inseguono attorno a una maschera |
| `vuoto-storico.png` | NESSUN EVENTO | orologio da parete con una pagina strappata |

### 12. Ordine di produzione consigliato
1. Identità (1.1–1.3) e sfondi (2.1–2.2) → l'app diventa riconoscibile subito.
2. Icone elementi (4), affinità (5), navigazione (7.1) → usate in ogni scheda.
3. Carte degli Arcani (3) e icone arcano (3.1) → compendio e Confidenti.
4. Doti sociali (6), badge (7.2–7.3), stati vuoti (8).
5. Confidenti (9), poi le Persona (10) a lotti, infine meteo (11).
6. Guida, Palazzi e stati vuoti (13): chiavi già cablate, l'app li mostra appena consegnati.

Consegna: caricare i file in `public/asset/…` rispettando i nomi; l'app li sostituisce ai segnaposto vettoriali
attuali (`src/components/shared/icons.tsx`) man mano che arrivano.


## Riferimenti visivi degli asset consegnati (da `riferimenti-visivi.md`)

### 2. Stanza di Velluto / fusione
- ✔ https://static.wikia.nocookie.net/megamitensei/images/0/0e/P5R_RedAlert.jpg/revision/latest?cb=20200610202410 — menu Stanza di Velluto con **Allarme rosso**, bottoni a ritaglio bianchi su rosso scuro, Justine. **Riferimento primario**.
- ✔ https://static.wikia.nocookie.net/megamitensei/images/5/5f/P5_velvet_room.jpg/revision/latest?cb=20150917145453 — prigione circolare blu con celle e lampadario.
- ✔ https://static.wikia.nocookie.net/megamitensei/images/0/07/P5_Velvet_Room_title_screen.jpg/revision/latest?cb=20170617175011 — stessa sala senza HUD (sfondo).
- ✔ https://static.wikia.nocookie.net/megamitensei/images/9/99/P5-Prisoner.gif/revision/latest?cb=20161212203607 — protagonista dietro le sbarre.
- ✔ https://static.wikia.nocookie.net/megamitensei/images/d/d1/P5_Fusion1.gif/revision/latest?cb=20220611072007 · ✔ https://static.wikia.nocookie.net/megamitensei/images/6/69/P5_Fusion2.gif/revision/latest?cb=20220611072244 — esecuzione alla ghigliottina.
- ✔ https://static.wikia.nocookie.net/megamitensei/images/9/9b/P5_Caroline_and_Justine.png/revision/latest?cb=20160820081904 — Caroline e Justine.
- ✔ https://static.wikia.nocookie.net/megamitensei/images/a/a0/Igor_%28Persona_5%29.png/revision/latest?cb=20160819124205 — Igor.
- ✔ https://static.wikia.nocookie.net/megamitensei/images/b/b3/Velvet_Room_Concept_Art_P5.jpg/revision/latest?cb=20170220191238 — concept art della prigione.
- ✔ https://static.wikia.nocookie.net/megamitensei/images/6/65/Persona_5_Royal_Fusion_Chart.png/revision/latest?cb=20191218153431 — tabella di fusione P5R (dati, non stile).

### 4. Carte degli Arcani (stile P5: titoli in francese sulla carta, es. "LE MAT"; categoria https://megamitensei.fandom.com/wiki/Category:Persona_5_Cards)
| Arcano (IT) | Riferimento |
|---|---|
| Matto | ✔ https://static.wikia.nocookie.net/megamitensei/images/0/0b/P5_Fool_arcana_cooperation.png/revision/latest?cb=20160915143157 |
| Mago | ✔ https://static.wikia.nocookie.net/megamitensei/images/e/e6/P5_Magician_arcana_cooperation.png/revision/latest?cb=20160915143227 |
| Papessa | ✔ https://static.wikia.nocookie.net/megamitensei/images/c/c2/P5_Priestess_arcana_cooperation.png/revision/latest?cb=20160915143305 |
| Imperatrice | ✔ https://static.wikia.nocookie.net/megamitensei/images/5/52/P5_Empress_arcana_cooperation.png/revision/latest?cb=20160915143515 |
| Imperatore | ✔ https://static.wikia.nocookie.net/megamitensei/images/8/86/P5_Emperor_arcana_cooperation.png/revision/latest?cb=20160915143531 |
| Ierofante | ✔ https://static.wikia.nocookie.net/megamitensei/images/d/d8/P5_Hierophant_Arcana.png/revision/latest?cb=20221219114835 |
| Amanti | ✔ https://static.wikia.nocookie.net/megamitensei/images/4/4b/P5_Lover_arcana_cooperation.png/revision/latest?cb=20160915143551 |
| Carro | ✔ https://static.wikia.nocookie.net/megamitensei/images/e/eb/P5_Chariot_arcana_cooperation.png/revision/latest?cb=20160915143624 |
| Giustizia | ✔ https://static.wikia.nocookie.net/megamitensei/images/2/26/P5_Justice_Arcana.png/revision/latest?cb=20160916144454 |
| Eremita | ✔ https://static.wikia.nocookie.net/megamitensei/images/5/57/P5_Hermit_Arcana.png/revision/latest?cb=20160916144512 |
| Fortuna | ✔ https://static.wikia.nocookie.net/megamitensei/images/6/6a/P5_Wheel_of_Fortune_Arcana.png/revision/latest?cb=20160728020952 |
| Forza | ✔ https://static.wikia.nocookie.net/megamitensei/images/0/02/P5_Strength_Arcana.png/revision/latest?cb=20160916144526 |
| Appeso | ✔ https://static.wikia.nocookie.net/megamitensei/images/a/a1/P5_Hanged-Man_Arcana.png/revision/latest?cb=20160728021156 |
| Morte | ✔ https://static.wikia.nocookie.net/megamitensei/images/a/a2/P5_Death_Arcana.png/revision/latest?cb=20160728021302 |
| Temperanza | ✔ https://static.wikia.nocookie.net/megamitensei/images/f/f4/P5_Temperance_Arcana.png/revision/latest?cb=20160728021415 |
| Diavolo | ✔ https://static.wikia.nocookie.net/megamitensei/images/5/55/P5_Devil_Arcana.png/revision/latest?cb=20160728021505 |
| Torre | ✔ https://static.wikia.nocookie.net/megamitensei/images/3/3e/P5_Tower_Arcana.png/revision/latest?cb=20160728021547 |
| Stella | ✔ https://static.wikia.nocookie.net/megamitensei/images/f/f0/P5_Star_Arcana.png/revision/latest?cb=20161104022713 |
| Luna | ✔ https://static.wikia.nocookie.net/megamitensei/images/3/3d/P5_Moon_Arcana.png/revision/latest?cb=20160728021655 |
| Sole | ✔ https://static.wikia.nocookie.net/megamitensei/images/3/38/P5_Sun_Arcana.png/revision/latest?cb=20160728021736 |
| Giudizio | ✔ https://static.wikia.nocookie.net/megamitensei/images/a/ab/P5_Judgement_Arcana.png/revision/latest?cb=20160916144550 |
| Mondo | ✔ https://static.wikia.nocookie.net/megamitensei/images/2/2b/P5_World_Arcana.png/revision/latest?cb=20160916144637 |
| Consigliere (P5R) | ✔ https://static.wikia.nocookie.net/megamitensei/images/5/5b/P5_Royal_Consultant_Arcana.png/revision/latest?cb=20200508064739 |
| Fede (P5R) | ✔ https://static.wikia.nocookie.net/megamitensei/images/e/e6/Faith.png/revision/latest?cb=20200508064816 (carta "LA FOI"; `FaithArcana.png` è la variante alterata). Ispirazione secondaria, icona Confidente di Kasumi in stile carta: ✔ https://static.wikia.nocookie.net/megamitensei/images/b/bf/Persona_5_Confidant_Guides_Icon_%28Faith%29_-_Kasumi_Yoshizawa.png/revision/latest?cb=20241201203857 (Consigliere analoga: ✔ https://static.wikia.nocookie.net/megamitensei/images/8/80/Persona_5_Confidant_Guides_Icon_%28Councillor%29_-_Takuto_Maruki.png/revision/latest?cb=20210309075901) |

### 8. Calendario e HUD data/meteo
- ✔ https://static.wikia.nocookie.net/megamitensei/images/3/34/P5_CalendarMenu.png/revision/latest?cb=20220530155054 — calendario del menu: griglia con numeri enormi rossi/bianchi/azzurri, "COMMAND" in diagonale. **Riferimento primario calendario**.
- ✔ https://static.wikia.nocookie.net/megamitensei/images/1/1e/P5_CalendarSwitch.png/revision/latest?cb=20220530115406 — transizione di data con icone meteo e skyline b/n.
- HUD in alto a sinistra (data, giorno, fascia oraria, meteo): ✔ https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1687950/ss_663171dc3afce8fe987e57e8659f91b69faa39bc.1920x1080.jpg · ✔ https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1687950/ss_ddcc016b8e5c434ccbd1a89c0157ce73acf905ae.1920x1080.jpg · ✔ https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1687950/ss_56f354736174fdb01b7b295b587ca72ca9254df7.1920x1080.jpg
- ✔ https://www.rpgfan.com/wp-content/uploads/2020/06/Persona-5-Royal-Screenshot-140.jpg · ✔ https://www.rpgfan.com/wp-content/uploads/2020/06/Persona-5-Royal-Screenshot-163.jpg — minimappa, cartiglio del luogo, icona pioggia. Galleria: https://www.rpgfan.com/gallery/persona-5-royal-screenshots/

### Buchi residui
- Carta dell'arcano **Fede** reperita in seguito sulla pagina wiki "Faith Arcana" (vedi §4): figura papale in trono con due accoliti incatenati, titolo "LA FOI"; il prompt in `prompt-immagini.md` va allineato a questo riferimento.
- Screenshot con la tabella statistiche FR/MA/RS/AG/FO ben leggibile: solo nella Game UI Database (✋).


## Registro degli asset consegnati (da `stato-generazione-asset.md`)

### persona
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/arsene.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/jack-o-lantern.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/pixie.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/agathion.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/mandrake.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/bicorn.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/cait-sith.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/incubus.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/kelpie.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/saki-mitama.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/silky.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/genbu.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/succubus.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/obariyon.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/angel.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/berith.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/hua-po.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/koropokkuru.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/mokoi.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/regent.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/slime.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/apsaras.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/jack-frost.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/kodama.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/koppa-tengu.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/orpheus-f.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/kushi-mitama.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/onmoraki.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/ame-no-uzume.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/ippon-datara.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/orpheus-f-picaro.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/archangel.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/inugami.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/makami.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/queens-necklace.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/shiisaa.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/eligor.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/high-pixie.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/kaguya.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/suzaku.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/matador.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/nekomata.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/orobas.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/sudama.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/black-ooze.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/shiki-ouji.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/flauros.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/leanan-sidhe.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/izanagi.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/nue.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/oni.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/stone-of-scone.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/yaksini.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/orthrus.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/phoenix.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/jikokuten.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/nigi-mitama.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/fuu-ki.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/izanagi-picaro.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/sandman.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/naga.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/rakshasa.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/sui-ki.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/anzu.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/kaguya-picaro.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/kin-ki.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/koh-i-noor.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/setanta.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/isis.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/lamia.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/orpheus.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/take-minakata.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/andras.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/clotho.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/tam-lin.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/choronzon.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/pisaca.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/orpheus-picaro.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/principality.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/ara-mitama.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/ariadne.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/neko-shogun.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/orlov.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/kurama-tengu.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/zouchouten.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/decarabia.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/lilim.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/mitra.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/mothman.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/anubis.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/thunderbird.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/arahabaki.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/emperors-amulet.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/lachesis.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/kaiwan.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/thoth.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/belphegor.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/hell-biker.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/legion.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/white-rider.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/atropos.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/mithras.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/unicorn.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/daisoujou.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/hariti.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/hope-diamond.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/kikuri-hime.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/power.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/red-rider.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/ariadne-picaro.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/hecatoncheires.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/kumbhanda.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/kushinada.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/ose.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/girimehkala.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/queen-mab.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/yurlungur.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/ananta.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/magatsu-izanagi.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/valkyrie.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/byakko.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/pazuzu.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/athena.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/fortuna.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/horus.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/magatsu-izanagi-picaro.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/narcissus.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/rangda.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/bugs.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/koumokuten.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/athena-picaro.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/crystal-skull.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/dakini.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/sarasvati.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/tsukiyomi.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/jatayu.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/seth.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/barong.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/garuda.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/mishaguji.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/norn.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/ganesha.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/skadi.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/okuninushi.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/pale-rider.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/cerberus.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/raja-naga.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/tsukiyomi-picaro.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/asterius.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/parvati.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/titania.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/yatagarasu.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/baphomet.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/melchizedek.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/black-rider.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/trumpeter.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/lilith.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/moloch.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/orichalcum.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/king-frost.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/asterius-picaro.png` — 768×768
- [x] **COMPLETATO — approvato da galaxy_task_validator** — `public/asset/persona/chernobog.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/seiryu.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/forneus.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/kali.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/hanuman.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/thor.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/yamata-no-orochi.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/atavaka.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/thanatos.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/oberon.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/quetzalcoatl.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/bishamonten.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/black-frost.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/dominion.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/vasuki.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/lakshmi.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/thanatos-picaro.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/byakhee.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/loa.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/dionysus.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/mot.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/throne.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/macabre.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/mara.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/chimera.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/nebiros.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/abaddon.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/sandalphon.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/asura.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/cu-chulainn.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/kohryu.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/raoul.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/gabriel.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/scathach.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/raphael.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/izanagi-no-okami.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/sraosha.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/vohu-manah.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/zaou-gongen.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/alilat.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/messiah.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/uriel.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/attis.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/baal.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/belial.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/shiva.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/alice.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/cybele.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/surt.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/vishnu.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/ardha.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/hastur.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/odin.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/siegfried.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/ishtar.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/mother-harlot.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/fafnir.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/futsunushi.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/beelzebub.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/michael.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/yoshitsune.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/chi-you.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/izanagi-no-okami-picaro.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/metatron.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/ongyo-ki.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/mada.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/messiah-picaro.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/satan.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/lucifer.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/maria.png` — 768×768
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/persona/satanael.png` — 768×768
Alias localizzato aggiuntivo richiesto dall'utente: `public/asset/persona/wakinyan.png`, identico a `thunderbird.png`; non altera il totale di 232 Persona canoniche del seed.

### ui — Fase 13
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/ui/nav-guida.png` — 256×256 (§13.1)
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/ui/nav-guida-attiva.png` — 256×256 (§13.1)
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/ui/giorno.png` — 256×256 (§13.4)
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/ui/sera.png` — 256×256 (§13.4)

### illustrazioni — Fase 13
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/illustrazioni/vuoto-obiettivi.png` — 1200×800 (§13.5)
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/illustrazioni/vuoto-obiettivi-senza-testo.png` — 1200×800 (§13.5)
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/illustrazioni/vuoto-piani.png` — 1200×800 (§13.5)
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/illustrazioni/vuoto-piani-senza-testo.png` — 1200×800 (§13.5)
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/illustrazioni/vuoto-cicli.png` — 1200×800 (§13.5)
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/illustrazioni/vuoto-cicli-senza-testo.png` — 1200×800 (§13.5)
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/illustrazioni/vuoto-storico.png` — 1200×800 (§13.5)
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/illustrazioni/vuoto-storico-senza-testo.png` — 1200×800 (§13.5)

### guida — Fase 13
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/guida/percorso.png` — 256×256 (§13.2)
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/guida/domande.png` — 256×256 (§13.2)
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/guida/cruciverba.png` — 256×256 (§13.2)
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/guida/calendario.png` — 256×256 (§13.2)
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/guida/dungeon.png` — 256×256 (§13.2)
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/guida/richieste.png` — 256×256 (§13.2)
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/guida/battaglia.png` — 256×256 (§13.2)
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/guida/citta.png` — 256×256 (§13.2)
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/guida/negozi.png` — 256×256 (§13.2)
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/guida/attivita.png` — 256×256 (§13.2)
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/guida/completamento.png` — 256×256 (§13.2)
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/guida/sfide.png` — 256×256 (§13.2)
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/guida/personaggi.png` — 256×256 (§13.2)
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/guida/oggetti.png` — 256×256 (§13.2)
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/guida/confidenti.png` — 256×256 (§13.2)

### palazzi — Fase 13
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/palazzi/kamoshida.png` — 512×512 (§13.3)
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/palazzi/madarame.png` — 512×512 (§13.3)
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/palazzi/kaneshiro.png` — 512×512 (§13.3)
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/palazzi/futaba.png` — 512×512 (§13.3)
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/palazzi/okumura.png` — 512×512 (§13.3)
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/palazzi/niijima.png` — 512×512 (§13.3)
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/palazzi/shido.png` — 512×512 (§13.3)
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/palazzi/iweleth.png` — 512×512 (§13.3)
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/palazzi/maruki.png` — 512×512 (§13.3)
- [x] **COMPLETATO — approvato dall'utente** — `public/asset/palazzi/mementos.png` — 512×512 (§13.3)
