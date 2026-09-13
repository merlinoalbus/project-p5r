# Verifica e ottimizzazione dei tre formati — tutta l'app, 2026-09-13

Passata su **65 schermate** — tutte le rotte del router **e tutte le viste interne** (le 13 schede
della Partita, le 11 viste della Fusione, gli elenchi filtrati, la pagina non trovata) — a **375,
768 e 1280 px**: **195 verifiche**. Per ciascuna si misurano scorrimento orizzontale, bersagli del
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
| Compendio personale (210 voci), Personaggi, scheda Persona | nomi cliccabili in elenco | 18–23 px | voci da 44 px |
| Ovunque: crediti, «la loro pagina», nomi di luoghi dentro le frasi | collegamenti dentro il testo | 16–17 px | `padding-block` di 15 px: l'area arriva a 44 senza allargare l'interlinea |
| Cruciverba, Storico, azioni del giorno (Home, Partita, Percorso) | caselle di spunta senza etichetta avvolgente | 20×20 px | etichetta toccabile attorno |
| Confidenti (righe dei ranghi), Storico | «Rango 1» e «0 scelte» incolonnati lettera per riga | 16×135 px | `shrink-0` sui lati, `min-w-0` sulla parte elastica |
| Ogni pagina con mappa | briciole, elenco figlie, zoom, azioni, categorie | 30–40 px | 44 px |
| Doti sociali | pulsanti delle note, premuti decine di volte per partita | 30 px col mouse | 44 px a ogni larghezza |
| Tutta l'app | selettore della partita, campi `editor-mappa__campo` | 36–40 px | 44 px a ogni larghezza |
| Home, Partita (mappa di Tokyo) | targhe dei luoghi | **5,46 px**, illeggibili; a misura leggibile si sovrapponevano | sotto i 520 px di tela le targhe lasciano il posto a una legenda toccabile |
| Mappa di Tokyo, Memento, spilli, miniature | disegni che non possono crescere senza coprire la mappa | 15×17–40×40 px | area del tocco estesa a 44 px, verificata con l'hit-testing del browser |
| Compendio, Personaggi, tessere compatte | nomi ed etichette troncate con le ellissi | «Conoscen…» | vanno a capo |
| Palazzi, Covo | il comando che apre il testo ripiegato | 26×18 px in coda al paragrafo | «Mostra tutto» su una riga propria, 44 px |

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
