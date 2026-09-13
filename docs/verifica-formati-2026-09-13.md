# Verifica e ottimizzazione dei tre formati — tutta l'app, 2026-09-13

Passata su **68 schermate** (una riga per schermata nella tabella qui sotto) — tutte le rotte del
router **e le viste interne**: le 13 schede della Partita, le 11 viste della Fusione, gli elenchi
filtrati, le radici di un Palazzo e di un Dedalo nell'atlante, la pagina non trovata — a **375, 768
e 1280 px**: **204 verifiche**. Per ciascuna si misurano scorrimento orizzontale, bersagli del
tocco sotto i 44 px, testo che sborda dal contenitore, testo incolonnato lettera per riga, testo
sotto i 9 px e **spazio usato** rispetto a quello disponibile.

**Oltre alla tabella** — e a colmare ciò che la tabella non copriva (rilievo del validatore,
2026-09-13) — sono state misurate ai tre formati anche:
- le **finestre modali**, che si aprono con un gesto e nessuna passata sulle rotte può incontrare:
  nuova partita, immagine di un'entità, scelta della Persona per un obiettivo, risposta di un
  Confidente, modulo del catalogo (libri e negozi). Tutte dentro lo schermo, nessun bersaglio sotto
  i 44 px, nessun testo sotto i 9. **Attenzione al metodo**: col pannello del browser nascosto
  l'animazione d'apertura resta ferma al primo fotogramma (`scale-in`, 0,95), quindi ogni misura va
  divisa per quella scala — senza, ogni bersaglio sembra 42 px e si dichiarano venti difetti che non
  esistono;
- le **rotte parametriche con più di un valore**: tre Persona, due skill, due Confidenti, due
  quartieri, una data del percorso, e **tutti e dieci** i tipi di `/guida/mondo/:tipo/:chiave`
  (mappa, quartiere, dungeon, area, luogo, negozio, punto, confidente, articolo, attività).

## Esito per schermata

`ok NN%` = nessun difetto; NN è la quota di larghezza occupata dal contenuto (il resto sono i
margini di pagina). Le schermate a `0%` sono i visori a schermo intero: il contenitore di pagina è
vuoto perché il visore occupa la finestra (a 1280×900: tela 940 + pannello 340), quindi usano
tutto. L'editor della mappa supera il 100% perché il pannello laterale esce dalla colonna di
contenuto, per scelta.

**Ripassata completa del 13 settembre, a valle di tutte le correzioni** (1280×900, 768×1024,
375×812; 54 rotte per larghezza, misurate con l'hit-testing di `elementFromPoint` e non col
rettangolo, escludendo i falsi positivi accertati: il bersaglio di una casella è l'etichetta che la
avvolge, un collegamento dentro una frase non è un comando a sé, e gli elementi sotto la piega non
si misurano). Esito: **nessun traboccamento orizzontale**, **nessun bersaglio sotto i 44 px**,
**nessun testo sotto i 9 px**, uso della larghezza 93% su telefono e 97-98% su tablet e monitor.
Gli elementi che escono dalla colonna sono tutti dentro `.fila-scorrevole`, cioè strisce di filtri
che scorrono apposta. Restano fuori da questa misura, e vanno viste col pannello del browser
**visibile**: gli spilli delle mappe incorporate, il cui bersaglio qui risulta ritagliato perché il
visore non riceve mai le dimensioni della tela (vedi «Errori del metodo di misura»).

Per quelli, però, la prova non è più a campione: la regola che decide chi si vede sulla mappa e dove
sta è una funzione a sé (`src/utils/raggruppaSpilli.ts`) e il suo invariante — **due bersagli non
distano mai meno di 46 px** — è verificato da un test sulle **mappe vere del pacchetto**
(`raggruppaSpilli.pacchetto.test.ts`): 302 mappe con dimensioni, tre larghezze, quattro
ingrandimenti, e nell'editor ogni spillo a turno come pin trascinato. È lì perché quella regola è
stata rifatta sei volte, e ogni volta il difetto è emerso da una misura fatta a mano sul pacchetto:
rifarla a mano a ogni giro è il modo per sbagliarla.

Due difetti che questa passata **non** avrebbe trovato, e che sono emersi cercando nel codice:
un campo con l'altezza forzata a 36 px (`h-9`, la rinomina di un piano) e l'unica casella dell'app
senza etichetta avvolgente (la merce nel popup del negozio, 20×20). La misura a campione vede
quel che è in pagina; il codice dice anche quel che manca.

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
| `/guida/mappe/citta-shibuya` | **rimisurata**: visore a schermo intero, nessun traboccamento, nessun bersaglio sotto i 44, distanza minima fra i centri degli spilli 574 px | rimisurata: ok | rimisurata: ok |
| `/guida/mappe/palazzo-di-kamoshida` | **rimisurata** (col pannello «Contenuti della guida» aperto): uso 93%, nessun bersaglio sotto i 44 | rimisurata: uso 97% | rimisurata: uso 97% |
| `/guida/mappe/palazzo-di-futaba-corridoio-principale` | **nuova riga**: è la mappa con tre gruppi di spilli **coincidenti**. Il gruppo si apre a elenco e nomina i suoi tre spilli, si sceglie e il popup si apre; distanza minima fra i centri 108 px. L'elenco è un foglio dal basso, 359×247, tutto visibile; il tasto di chiusura è 44×44 (era 28, ed è l'unica uscita del foglio) | l'elenco scorre in orizzontale e si ribalta sotto il gruppo quando sopra non c'è posto: prima l'intestazione e il tasto di chiusura finivano fuori dal ritaglio della tela | idem |
| `/guida/mappe/dedalo-di-iweleth` | ok (idem) | ok | ok |
| `/guida/mappe/citta-shibuya/modifica` | **rimisurata**: uso 93%, nessun traboccamento, nessun bersaglio sotto i 44; i pin vicini si raggruppano come nel visore e il pin selezionato esce per essere trascinato | rimisurata: uso 109% (il visore a schermo intero sborda nel ritaglio della tela, non nella pagina) | rimisurata: uso 100% |
| `/guida/citta` | **rimisurata**: uso 93%, nessun traboccamento; i cartellini di Tokyo, alti 15–23 px di disegno, ricevono 45×45, 45×45, 44×45 all'hit-testing | rimisurata: uso 97% | rimisurata: uso 97% |
| `/guida/citta/akihabara` | **rimisurata** dopo il raggruppamento per distanza: uso 93%, nessun traboccamento orizzontale, 4 spilli e 1 gruppo, distanza minima fra i centri 74 px; l'unico bersaglio sotto i 44 è il credito della fonte, che è un link **dentro la frase** «Mappa da …, scaricata nella tua istanza» — escluso dal criterio | rimisurata: uso 97%, idem | rimisurata: uso 97%, idem |
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
| Mappa di Tokyo, Memento, spilli, miniature | disegni che non possono crescere senza coprire la mappa | 15×17–40×40 px | area del tocco estesa a 44 px, verificata con l'hit-testing del browser. Sulla torre dei Mementos, dove i dedali si toccano fra loro, l'area utile di ciascuno resta minore: a coprirla è la sagoma del dedalo accanto, cioè un altro bersaglio, non un disegno |
| Visore delle mappe, spilli e gruppi «+n» (quartieri, palazzi, mappe incorporate) | due spilli più vicini di un bersaglio si toglievano pixel a vicenda: il gruppo si fermava a 40, e sulle mappe di città capitava che a fermare il sondaggio fosse un *altro* spillo. Il raggruppamento era una griglia di celle da 30 px — più piccole del bersaglio, e senza alcuna garanzia di distanza: due spilli a due pixel restavano separati se cadevano a cavallo del bordo — e per giunta attiva solo sotto zoomMin × 1,6, così appena si ingrandiva un po' due pin potevano stare a venti pixel l'uno dall'altro | gruppo 34+6 = **40 px**; singoli fino a **38 px** dove un vicino li tagliava | raggruppamento **per distanza**, a ogni ingrandimento: si fondono finché due centri distano meno di 46 px, confrontando i centri dei bersagli e non i punti ancorati (la goccia ha la punta sul punto, la pastiglia del gruppo è centrata; confrontare i punti lasciava 44,3 px). Ingrandendo, le distanze crescono e i gruppi si sciolgono da soli (misurato: da 5 gruppi a 0 in quattro scatti di zoom, con il minimo sempre sopra i 46). Misurato su `/guida/citta/shibuya` (19 spilli, 5 gruppi), `/guida/citta/akihabara`, `/guida/mappe/citta-shibuya`, la mappa della Shujin e `/guida/mappe/palazzo-di-futaba-corridoio-principale` a 375/768/1280: distanza minima fra centri 49 / 74 / 574 / 51 / 108 px, e l'hit-testing dei bersagli **non tagliati dal bordo della tela** dà 44×49, 44×50, 45×45. **Le misure sono prese col pannello del browser nascosto**, dove il `ResizeObserver` non consegna mai e il visore resta a `scale(1)` invece dell'inquadratura adattata: la geometria resa è coerente e l'hit-testing è valido, ma il ritaglio della tela non è quello che vede un dispositivo vero. Ciò che vale a ogni zoom è la garanzia per costruzione, non queste cifre |
| Visore delle mappe, gruppo «+n» | il gruppo non si apriva: la sua unica azione era ingrandire di 2,2×, e nel pacchetto **228 coppie di spilli su 74 mappe hanno le stesse coordinate** — distanza zero, che resta zero a qualunque ingrandimento. Su `/guida/mappe/palazzo-di-futaba-corridoio-principale` restavano tre gruppi anche a 800% e il tocco non faceva niente | un bersaglio da 45 px inerte | il tocco apre l'elenco degli spilli del gruppo, che non dipende dallo zoom: si sceglie il nome e si apre il suo popup. «Ingrandisci qui» resta nell'elenco, ma solo quando lo zoom non è già al massimo. E la nube **non si scorpora più** quando uno dei suoi spilli è aperto: prima i compagni tornavano gocce singole alla distanza appena dichiarata inammissibile — su spilli coincidenti, tre gocce sovrapposte, due senza un pixel di bersaglio |
| Visore delle mappe, elenco del gruppo | l'elenco vive dentro la tela, che ritaglia, e non aveva né lo scorrimento orizzontale né il ribaltamento che il popup dello spillo ha proprio per questo: a 1280 usciva di 153 px dall'alto — intestazione e tasto di chiusura compresi — e a 768 due gruppi su tre erano tagliati sopra e uno anche a sinistra. In più un tocco sulla mappa non lo chiudeva, e il suo «×» misurava 28 px | elenco illeggibile e a volte non chiudibile; «×» 28×28 | stesso trattamento del popup: scorre quanto basta e si ribalta sotto il gruppo (due test con la tela misurata: `scale(0.864)`, scostamento positivo a sinistra e negativo a destra); si chiude col tocco sulla mappa e con Esc (due test); il «×» è 44×44 |
| Editor delle mappe | era l'unica pagina esentata dal raggruppamento, e per dichiarazione | pin sotto i 44 px | **scelta dell'utente (2026-09-13)**: il gruppo c'è anche qui e dall'elenco si sceglie quale pin modificare; il pin *selezionato* esce dalla nube e si mostra da solo, perché lì il gesto è trascinare proprio quello. Il compagno rimasto **resta una pastiglia anche se è uno solo** («1 spillo vicino»): se tornasse goccia si troverebbe a meno di 46 px dal selezionato, e sulle nove coppie a coordinate identiche del pacchetto esattamente sotto, irraggiungibile e senza più il «+n» da cui riaprirlo. E la pastiglia **si scosta**, ma di quanto lo dice il pin: restando sul punto lei e il pin si toglievano spazio a vicenda (misurati 38×38 e 38×34, coi centri a 19 px), e un primo rimedio che la spostava di 46 px *a destra* funzionava solo quando pin e residuo coincidono — l'unico caso che avevo provato — mentre nel 23-31% degli altri la spingeva **verso** il pin, fino a 13 px (misurato dal validatore su tutto il pacchetto). Ora si allontana dal pin nella direzione opposta, quanto basta a stare sopra i 46, e fra otto direzioni sceglie quella che resta più lontana anche dalle altre nubi e dentro la tela. Provato su sei configurazioni diverse, non solo su quella coincidente. Con «Aggiungi» o «Incolla» in mano gruppo **e** pin singolo si fanno da parte, così il tocco posa lo spillo dove si vuole, e chiude l'elenco |
| Visore delle mappe, elenco con molte voci | l'elenco cresceva senza limite: `max-height` e scorrimento c'erano **solo** sotto i 768 px. Un gruppo può avere molte voci — sul Corridoio del Crepuscolo, alla vista d'insieme, arriva a 17, cioè 858 px chiesti — e allora non ci sta né sopra né sotto, e la tela taglia le ultime voci **e** «Ingrandisci qui». 17 mappe su 206 hanno un gruppo con più di 5 voci. Il primo rimedio sbagliava a sua volta in due punti: preventivava 92 px di contorno dove ce ne sono **118** (bordo 2, padding 16, intestazione 44, due stacchi da 6, comando 44), così il riquadro sforava comunque di 18 px — e proprio dal lato dell'intestazione; e applicava il tetto **anche sul telefono**, dove il riquadro è un foglio dal basso e il punto sulla mappa non c'entra: su una tela da 240 px l'elenco si strozzava a 88, cioè due voci, dove prima scorreva tutto | fino a 858 px in una tela da 500; poi 88 px di foglio sul telefono | il contorno è contato, non stimato; il tetto non si applica al foglio; e quando **nessun lato** basta neppure per una voce il riquadro diventa un foglio dal basso a qualunque larghezza, che scorre e si vede tutto. Tre test: schermo stretto, tela bassa, e il riquadro intero — contorno compreso — dentro il lato scelto |
| Condizioni (modulo del catalogo, contenuti della guida, editor) | l'innalzamento a 44 px era scritto **solo** dentro `.visore-mappa--editor`: `CondizioniEditor` lo usano anche il modulo del catalogo e la scheda dei contenuti, e lì i comandi restavano bassi a tutte e tre le larghezze | operatore 36 px, date 36, campo di ricerca del selettore 40 | 44 px sempre, sulla classe e non sul contenitore |
| Ogni mappa, pin sul bordo | l'inquadratura «adatta» lasciava 24 px di margine, e nessuno quando l'alfa dell'immagine non era leggibile: il bersaglio di un pin sul bordo veniva tagliato dal ritaglio della tela | 27×50 px | il fit lascia il posto al **bersaglio**, non al punto. Il requisito è 22 px ai lati, 41 sopra (la goccia è ancorata alla punta) e 3 sotto; il margine applicato è **24, 44 e 24**, cioè il requisito arrotondato in eccesso, ridotto in proporzione su tele minuscole e neutro finché la tela non è misurata. Verificato con un test che prova pin sui quattro spigoli a tre larghezze di tela, con e senza area alfa |
| Compendio, Personaggi, tessere compatte | nomi ed etichette troncate con le ellissi | «Conoscen…» | vanno a capo |
| Palazzi, Covo | il comando che apre il testo ripiegato | 26×18 px in coda al paragrafo | «Mostra tutto» su una riga propria, 44 px |
| Videogiochi (14 etichette), e le altre sei liste etichetta/valore | «C h e   c o s a   f a» incolonnato: il chip dentro il valore imponeva alla colonna elastica una larghezza minima enorme e schiacciava quella dell'etichetta | 32×100 px | `dt { white-space: nowrap }` e `dd { min-width: 0 }` sulla classe `dl-scheda`: la stessa regola dei flex, scritta per la griglia |
| Confidenti | un rango senza scelte, aperto, era una striscia di 12 px di solo padding | — | lo dice: «Nessuna scelta da fare in questo rango» |
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
  un'immagine caricata;
- `PianiSalvati.tsx`, il campo per rinominare un piano (aveva `h-9`, cioè 36 px forzati): con i dati
  dell'istanza la scheda dice «Nessun piano salvato», quindi il campo non compare mai;
- `VisoreMappa.tsx`, la casella «comprato» della merce nel popup del negozio (era l'unica dell'app
  senza etichetta avvolgente, quindi 20×20): i negozi dell'istanza mostrano «0 articoli adesso», e
  senza merce la riga non esiste. **Da guardare quando comparirà**: l'etichetta da 44 px sta in una
  riga con `align-items: flex-start`, e la casella si centra a metà dei 44 mentre il nome
  dell'articolo parte in alto — una decina di pixel di disallineamento verticale.

Sono corretti per coerenza — è la stessa forma di comando, nello stesso pannello — e andranno
misurati la prima volta che quei rami compaiono. Gli ultimi due non li avrebbe trovati **nessuna**
passata a campione, per lo stesso motivo per cui non si possono misurare: non sono in pagina. Sono
emersi cercando nel codice, ed è la ragione per cui la ricerca statica resta parte del metodo.

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
  targhe da 5,46 px della mappa di Tokyo;
- col **pannello del browser nascosto** il visore delle mappe non riceve mai la misura della tela
  (il `ResizeObserver` notifica tramite rAF, che a pannello nascosto non gira) e resta a `scale(1)`
  invece dell'inquadratura adattata: cambiando la larghezza da 375 a 768 la tela passa da 331 a
  724 px e il `transform` non si muove di un pixel. La geometria resa è coerente — l'hit-testing su
  di essa vale — ma il **ritaglio** della tela non è quello di un dispositivo vero, e le distanze
  non cambiano con la larghezza. Le misure prese così vanno dichiarate tali: per gli spilli la
  garanzia che regge a ogni zoom è quella per costruzione (nessuna coppia di bersagli più vicina di
  46 px), non le cifre di una singola inquadratura;
- un bersaglio **tagliato dal bordo** della tela non è un bersaglio piccolo: lì la correzione non
  sta nel disegno ma nell'inquadratura, che deve lasciare posto al bersaglio e non al punto.

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
- La regola «chi non deve stringersi non si stringe, chi è elastico porta `min-width: 0`» vale anche
  per le **griglie**, non solo per i flex: in un `dl` a due colonne il valore lungo schiaccia
  l'etichetta esattamente come farebbe in una riga flex.
- **Misurare a pannello nascosto falsa i risultati.** Se il pannello del browser non è visibile,
  `requestAnimationFrame` e `ResizeObserver` non vengono consegnati: ogni visore di mappa resta a
  0×0, la planimetria finisce fuori dalla tela e tutti gli spilli risultano irraggiungibili. Come
  per `innerWidth === 0`, in quello stato le misure sulle mappe non valgono.
