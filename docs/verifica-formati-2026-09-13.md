# Verifica e ottimizzazione dei tre formati — tutta l'app, 2026-09-13

Passata su **67 schermate** — tutte le rotte del router **e tutte le viste interne** (le 13 schede
della Partita, le 11 viste della Fusione, gli elenchi filtrati, le radici di un Palazzo e di un
Dedalo nell'atlante, la pagina non trovata) — a **375, 768 e 1280 px**: **201 verifiche**. Per ciascuna si misurano scorrimento orizzontale, bersagli del
tocco sotto i 44 px, testo che sborda dal contenitore, testo incolonnato lettera per riga, testo
sotto i 9 px e **spazio usato** rispetto a quello disponibile.

## Esito per schermata

`ok NN%` = nessun difetto; NN è la quota di larghezza occupata dal contenuto (il resto sono i
margini di pagina). Le schermate a `0%` sono i visori a schermo intero: il contenitore di pagina è
vuoto perché il visore occupa la finestra (a 1280×900: tela 940 + pannello 340), quindi usano
tutto. L'editor della mappa supera il 100% perché il pannello laterale esce dalla colonna di
contenuto, per scelta.

| Schermata | 375 px | 768 px | 1280 px |
|---|---|---|---|
| `/home` | ok 91% | ok 96% | ok 96% |
| `/compendio` | ok 91% | ok 96% | ok 96% |
| `/compendio?arcana=matto` | ok 91% | ok 96% | ok 96% |
| `/compendio/persona/1` | ok 91% | ok 96% | ok 96% |
| `/compendio/glossario` | ok 91% | ok 96% | ok 96% |
| `/skill` | ok 91% | ok 96% | ok 96% |
| `/skill?elemento=fuoco` | ok 91% | ok 96% | ok 96% |
| `/skill/1` | ok 91% | ok 96% | ok 96% |
| `/fusione?vista=calcolatore` | ok 91% | ok 96% | ok 96% |
| `/fusione?vista=ricette` | ok 91% | ok 96% | ok 96% |
| `/fusione?vista=piani` | ok 91% | ok 96% | ok 96% |
| `/fusione?vista=skill` | ok 91% | ok 96% | ok 96% |
| `/fusione?vista=cicli` | ok 91% | ok 96% | ok 96% |
| `/fusione?vista=forca` | ok 91% | ok 96% | ok 96% |
| `/fusione?vista=con` | ok 91% | ok 96% | ok 96% |
| `/fusione?vista=coppia` | ok 91% | ok 96% | ok 96% |
| `/fusione?vista=matrice` | ok 91% | ok 96% | ok 96% |
| `/fusione?vista=speciali` | ok 91% | ok 96% | ok 96% |
| `/fusione?vista=tesori` | ok 91% | ok 96% | ok 96% |
| `/partita?scheda=oggi` | ok 91% | ok 96% | ok 96% |
| `/partita?scheda=riepilogo` | ok 91% | ok 96% | ok 96% |
| `/partita?scheda=doti` | ok 91% | ok 96% | ok 96% |
| `/partita?scheda=squadra` | ok 91% | ok 96% | ok 96% |
| `/partita?scheda=confidenti` | ok 91% | ok 96% | ok 96% |
| `/partita?scheda=letture` | ok 91% | ok 96% | ok 96% |
| `/partita?scheda=progressi` | ok 91% | ok 96% | ok 96% |
| `/partita?scheda=scorta` | ok 91% | ok 96% | ok 96% |
| `/partita?scheda=compendio` | ok 91% | ok 96% | ok 96% |
| `/partita?scheda=obiettivi` | ok 91% | ok 96% | ok 96% |
| `/partita?scheda=piani` | ok 91% | ok 96% | ok 96% |
| `/partita?scheda=cicli` | ok 91% | ok 96% | ok 96% |
| `/partita?scheda=storico` | ok 91% | ok 96% | ok 96% |
| `/confidenti/akechi` | ok 91% | ok 96% | ok 96% |
| `/guida` | ok 91% | ok 96% | ok 96% |
| `/guida/domande` | ok 91% | ok 96% | ok 96% |
| `/guida/calendario` | ok 91% | ok 96% | ok 96% |
| `/guida/dungeon` | ok 91% | ok 96% | ok 96% |
| `/guida/dungeon/kamoshida` | ok 91% | ok 96% | ok 96% |
| `/guida/dungeon/mementos` | ok 91% | ok 96% | ok 96% |
| `/guida/richieste` | ok 91% | ok 96% | ok 96% |
| `/guida/battaglia` | ok 91% | ok 96% | ok 96% |
| `/guida/mappe` | ok 91% | ok 96% | ok 96% |
| `/guida/mappe/citta-shibuya` | ok (visore a schermo intero) | ok | ok |
| `/guida/mappe/palazzo-di-kamoshida` | ok (col pannello «Contenuti della guida» aperto) | ok | ok |
| `/guida/mappe/dedalo-di-iweleth` | ok (idem) | ok | ok |
| `/guida/mappe/citta-shibuya/modifica` | ok | ok | ok |
| `/guida/citta` | ok 91% | ok 96% | ok 96% |
| `/guida/citta/akihabara` | ok 91% | ok 96% | ok 96% |
| `/guida/mondo/quartiere/shibuya` | ok (visore a schermo intero) | ok | ok |
| `/guida/attivita` | ok 91% | ok 96% | ok 96% |
| `/guida/libri` | ok 91% | ok 96% | ok 96% |
| `/guida/film` | ok 91% | ok 96% | ok 96% |
| `/guida/videogiochi` | ok 91% | ok 96% | ok 96% |
| `/guida/cruciverba` | ok 91% | ok 96% | ok 96% |
| `/guida/completamento` | ok 91% | ok 96% | ok 96% |
| `/guida/covo` | ok 91% | ok 96% | ok 96% |
| `/guida/sfide` | ok 91% | ok 96% | ok 96% |
| `/guida/personaggi` | ok 91% | ok 96% | ok 96% |
| `/guida/oggetti` | ok 91% | ok 96% | ok 96% |
| `/guida/percorso` | ok 91% | ok 96% | ok 96% |
| `/guida/percorso/04-15` | ok 91% | ok 96% | ok 96% |
| `/guida/negozi` | ok 91% | ok 96% | ok 96% |
| `/guida/negozi?categoria=armi` | ok 91% | ok 96% | ok 96% |
| `/guida/negozi/37-gradi-celsius` | ok 91% | ok 96% | ok 96% |
| `/guida/rimossi` | ok 91% | ok 96% | ok 96% |
| `/impostazioni` | ok 91% | ok 96% | ok 96% |
| `/pagina-che-non-esiste` | ok 91% | ok 96% | ok 96% |

## Che cosa è stato corretto

| Dove | Difetto | Prima | Correzione |
|---|---|---|---|
| Denaro e squadra | riga con sei elementi in `flex-wrap`: nome spezzato lettera per riga, «Livello» ripetuto, casella 20 px | scheda alta 400 px | rifatta in due fasce, comandi «−1»/«+1», interruttore da 44 px |
| Oggetti (95), Attività, Confidenti | chip-link: bassi, compressi a 53 px dall'etichetta della cella e stirati fino a 108 px dall'allineamento `stretch` | 23–108 px | 44 px d'altezza, `width: max-content`, `align-self: start` |
| Compendio personale (210), Battaglia (228), Negozi (300), Personaggi, scheda Persona | nomi cliccabili in elenco | 18–23 px | voci da 44 px |
| Crediti «fonte»/«guida», «Tutto lo storico», «scheda Persona», «Tutte le ricette →» | collegamenti che sono comandi a sé, non parole in una frase | 17–23 px | 44 px (classe `touch`) |
| Cruciverba, Storico, azioni del giorno (Home, Partita, Percorso) | caselle di spunta senza etichetta avvolgente | 20×20 px | etichetta toccabile attorno |
| Confidenti (righe dei ranghi), Storico | «Rango 1» e «0 scelte» incolonnati lettera per riga | 16×135 px | `shrink-0` sui lati, `min-w-0` sulla parte elastica |
| Ogni pagina con mappa | briciole, elenco figlie, zoom, azioni, categorie | 30–40 px | 44 px |
| Doti sociali | pulsanti delle note, premuti decine di volte per partita | 30 px col mouse | 44 px a ogni larghezza |
| Tutta l'app | selettore della partita, campi `editor-mappa__campo` | 36–40 px | 44 px a ogni larghezza |
| Home, Partita (mappa di Tokyo) | targhe dei luoghi | **5,46 px**, illeggibili; a misura leggibile si sovrapponevano | sotto i 545 px di tela — il punto in cui il corpo scenderebbe sotto i 9 px — le targhe lasciano il posto a una legenda toccabile |
| Mappa di Tokyo, Memento, spilli, miniature | disegni che non possono crescere senza coprire la mappa | 15×17–40×40 px | area del tocco estesa a 44 px, verificata con l'hit-testing del browser |
| Compendio, Personaggi, tessere compatte | nomi ed etichette troncate con le ellissi | «Conoscen…» | vanno a capo |
| Palazzi, Covo | il comando che apre il testo ripiegato | 26×18 px in coda al paragrafo | «Mostra tutto» su una riga propria, 44 px |
| Compendio | freccia che inverte l'ordinamento | 35 px di larghezza col mouse, 44 col dito | 44 px a ogni larghezza (`.btn-sm`) |
| Compendio (filtri), Partita → Scorta | campi «compatti» — livello minimo e massimo, statistiche | 34 px col mouse, 44 col dito | 44 px a ogni larghezza: compatto vuol dire stretto, non basso |
| Libri | il luogo che il libro apre, unico contenuto della sua riga | 17 px | 44 px: è un comando a sé, non una parola in una frase |
| Mappa di Tokyo | area del tocco delle sagome | 44 px solo col dito, e **dietro** la rete ferroviaria disegnata sopra: non riceveva niente | 44 px a ogni larghezza, davanti alla rete (trasparente: non copre nulla) |
| Personaggi | il credito della fonte, l'unico degli otto rimasto indietro | 27×17 px | 44×44 |
| Visore delle mappe | briciole, voci, azioni e categorie con etichetta corta | 41 px di larghezza | `min-width: 44px` oltre all'altezza |
| Palazzi e quartieri su telefono | il pannello del visore, aperto, era una fessura di 21 px con 417 px di contenuto | comandi alti 44 px ma toccabili per 21 | il visore incorporato smette di essere alto quanto gli è stato detto **quando il pannello è aperto** |
| Atlante, radici di Palazzo e Dedalo | i comandi del pannello «Contenuti della guida»: planimetrie, nomi degli elementi, «Apri la scheda del palazzo o dedalo» | 19–22 px, misurati | 44 px. Sono l'unico contenuto della loro riga, non parole dentro una frase |
| Scheda di un contenuto della guida → «Modifica contenuto» | casella «Collezionabile» (etichetta 22 px), campo «Aggiungi immagine», «Rimuovi immagine» senza forma di pulsante | 22 px, misurati | 44 px |

## Corretti senza poterli misurare

Tre comandi hanno ricevuto la stessa correzione degli altri, ma **non sono comparsi sullo schermo**
con i dati attuali, quindi la misura non c'è e non viene dichiarata:

- `ContenutiGuidaMappa.tsx`, «Dettagli della sezione» e il pulsante del collegamento: si rendono
  solo quando un'area della guida ha `collegamenti`, che nel pacchetto di oggi è sempre vuoto;
- `MappaIncorporata.tsx`, il riquadro per una mappa **senza planimetria**: «Apri il luogo e i
  contenuti della guida» e l'elenco delle mappe figlie. Tutte le mappe che le pagine incorporano
  hanno una planimetria, quindi quel ramo non si vede;
- `SchedaContenutoGuida.tsx`, «Rimuovi immagine»: serve un contenuto della guida che abbia già
  un'immagine caricata.

Sono corretti per coerenza — è la stessa forma di comando, nello stesso pannello — e andranno
misurati la prima volta che quei rami compaiono.

## Il criterio dei bersagli, scritto per intero

**44 px a ogni larghezza**, mouse compreso, per ogni comando: pulsanti, chip, voci di elenco,
caselle di spunta (misurate sull'etichetta che le avvolge, che è ciò che si tocca), campi, selettori,
comandi del visore. Nessuna misura doppia fra tocco e puntatore: un comando basso lo è anche col
mouse.

La misura vale **anche dentro i pannelli che si aprono** (i filtri del Compendio, i livelli minimo e
massimo): fanno parte della schermata, e la passata li apre prima di misurare.

**Due sole forme di comando non misurano 44 px nel loro riquadro, e per ciascuna c'è una ragione
verificabile, non una deroga:**

1. **I collegamenti dentro una frase** — il nome di una Persona in mezzo a un testo, «la loro
   pagina», le fonti separate da virgole. Sono alti quanto la riga di testo in cui vivono, e il
   criterio 2.5.8 li esclude proprio per questo: *«inline targets… the target is in a sentence, or
   its size is otherwise constrained by the line-height of non-target text»*. Allargarli vorrebbe
   dire allargare l'interlinea del paragrafo. Il primo tentativo — `padding-block` su tutti i link
   della pagina — è stato tolto perché sui link **a blocco** i 30 px erano veri e le tessere delle
   Doti passavano da 42 a 72 px. I collegamenti che invece sono comandi a sé (il credito della
   fonte, «Tutto lo storico», «scheda Persona», il nome del negozio in elenco) portano la classe
   `touch` e valgono 44 px come gli altri.
2. **I disegni ancorati a un punto della mappa** — spilli, sagome di Tokyo, dedali dei Memento,
   miniature nelle righe. Crescere vorrebbe dire coprire la mappa o spostare la riga: cresce l'area
   che riceve il tocco, fino a 44 px, e si verifica **col tocco** (`elementFromPoint`) invece che
   col righello. È così che si è scoperto che il primo tentativo sulle miniature era inerte, perché
   `overflow: hidden` ritagliava anche l'area del tocco.

## Errori del metodo di misura, corretti strada facendo

Tre cose che sembravano difetti e non lo erano, e una che lo era e non si vedeva:

- il bersaglio di una **casella di spunta** è l'etichetta che la avvolge, non il quadratino (da sola
  contava 78 falsi difetti nelle Domande);
- gli elementi **nascosti** (sr-only, `clip-path`, larghezza 1 px) e i **`<title>` degli SVG**
  sembrano sbordare o incolonnarsi: non si vedono;
- un elemento con **area del tocco estesa** ha il riquadro piccolo e il bersaglio grande: va
  verificato con `elementFromPoint`, non con la misura del riquadro. È così che si è scoperto che
  il primo tentativo sulle miniature era inerte, perché `overflow: hidden` ritagliava anche l'area
  del tocco;
- il **testo troppo piccolo** non era fra le misure iniziali: aggiungendolo sono saltate fuori le
  targhe da 5,46 px della mappa di Tokyo.

## Regole che restano valide per il lavoro futuro

- 44 px è il bersaglio minimo **a ogni larghezza**, non solo sul tocco: due misure diverse per lo
  stesso comando sono due difetti invece di uno.
- Quando un elemento non può crescere (uno spillo su una mappa, una miniatura in una riga), si
  allarga l'area che riceve il tocco — e la si verifica col tocco, non col righello.
- In un `flex`, gli elementi laterali portano `shrink-0` e la parte elastica `min-w-0`: è la causa
  di ogni testo incolonnato lettera per riga trovato in questa passata.
- Un testo che scala con il contenitore ha bisogno di un minimo leggibile; se al minimo non ci sta
  più, cambia forma (la legenda al posto delle targhe), non dimensione.
- Due regole che decidono la stessa cosa devono interrogare **lo stesso contenitore, per nome**:
  targhe e legenda ne leggevano due diversi, e fra 521 e 522 px la mappa restava senza nomi.
- Un bersaglio è **quadrato**: 44 px di alto e 41 di largo resta un bersaglio da 41. Vale per ogni
  regola che fissa solo `min-height`.
- Un'area del tocco estesa va messa **davanti**, non dietro: dietro finisce sotto il primo disegno
  sovrapposto e non riceve niente. È trasparente, quindi non copre nulla di ciò che si vede.
- Una percentuale in una griglia (`minmax(0, 42%)`) è una percentuale **del contenitore**: in un
  riquadro basso vale zero. Dove la riga deve contenere qualcosa, `auto`.
- La misura va fatta **con i pannelli aperti** e sondando il lato che manca (a sinistra se
  l'elemento è stretto, sopra se è basso): metà dei difetti di questa passata erano invisibili
  altrimenti — e metà dei falsi allarmi venivano da tendine che il metodo stesso apriva.
- «Bersaglio in linea dentro una frase» vuol dire che sulla **sua riga** c'è dell'altro testo. Un
  collegamento che è l'unico contenuto del suo `li`, del suo `strong` o del suo `dd` è un comando a
  sé e vale 44 px: confondere le due cose ha prodotto tre falsi «ok» nel pannello dei contenuti
  della guida.
- Una rotta con parametro va campionata con **più di un valore**: `/guida/mappe/:chiave` misurata
  su un quartiere non mostra nemmeno il pannello che sulle radici dei Palazzi portava i difetti.
