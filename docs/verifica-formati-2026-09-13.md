# Verifica e ottimizzazione dei tre formati — tutta l'app, 2026-09-13

Passata su **tutte le 36 schermate** dell'applicazione (ogni rotta del router, con le chiavi reali
del database) a **375, 768 e 1280 px**: 108 verifiche. Per ciascuna si misurano scorrimento
orizzontale, bersagli del tocco sotto i 44 px, testo che sborda dal contenitore, testo incolonnato
lettera per riga, testo troppo piccolo per leggerlo e **spazio usato** rispetto a quello
disponibile.

La verifica dei lotti precedenti aveva coperto solo le schermate toccate da ciascun lotto. Questo
documento è il censimento completo che mancava, con le correzioni che ne sono seguite.

## Esito finale

| Larghezza | Schermate | Scorrimento orizzontale | Bersagli < 44 px | Testo spezzato o che sborda | Spazio usato |
|---|---|---|---|---|---|
| 375 px (telefono) | 36 | 0 | 0 | 0 | 91% (margini di 16 px) |
| 768 px (tablet) | 36 | 0 | 0 | 0 | 96% |
| 1280 px (monitor) | 36 | 0 | 0 | 0 | 96% |

Nessuna eccezione dichiarata: i tre casi che nella prima stesura avevo lasciato aperti sono stati
corretti (in fondo, «I residui della prima stesura»). Le pagine del visore a schermo intero
risultano «0%» sul contenitore di pagina perché il visore occupa la finestra intera (1280×900:
tela 940 + pannello 340): usano tutto lo spazio, non poco.

## Metodo

Misura eseguita nel browser sulle pagine vere: per ogni rotta si scorre in cima, si attende il
caricamento e si misurano gli elementi resi. Tre precisazioni hanno cambiato i numeri, ed erano
errori del mio metodo di misura, non difetti dell'app:

- il bersaglio di una **casella di spunta** è l'etichetta che la avvolge, non il quadratino: una
  casella di 20 px dentro una `<label>` alta 44 px è già a norma (da sola contava 78 falsi difetti
  nelle Domande);
- gli elementi **nascosti** (sr-only, `clip-path`, larghezza 1 px) hanno un riquadro che sembra
  sbordare e un testo che sembra incolonnato: non si vedono. Ci ricadevano le etichette dei
  pulsanti del visore, che la barra stretta nasconde di proposito;
- i **`<title>` degli SVG** sono tooltip, non testo visibile.

## Difetti trovati e corretti

| Schermate | Difetto | Prima | Correzione |
|---|---|---|---|
| Denaro e squadra | riga con sei elementi in `flex-wrap`: nome spezzato lettera per riga, «Livello» ripetuto due volte, casella 20 px, campi 36 px | scheda alta 400 px | scheda rifatta in due fasce, comandi «−1»/«+1», interruttore da 44 px |
| Oggetti (95), Attività (19), Confidenti | chip-link toccabili | 23 px | 44 px **a ogni larghezza**, mouse compreso |
| Cruciverba (38), Home, Partita, Percorso | caselle di spunta senza etichetta avvolgente | 20×20 px | etichetta toccabile attorno, aspetto invariato |
| Confidenti (ogni riga di rango), Storico | «Rango 1» e «0 scelte» incolonnati lettera per riga | 16×135 px | `shrink-0` sui lati, `min-w-0 flex-1` sulla parte elastica |
| Ogni pagina con mappa | briciole, elenco delle figlie, zoom, «Mostra tutti», categorie | 30–40 px | 44 px a ogni larghezza |
| Ogni pagina con mappa | spilli sulla mappa | 38×38 px | area del tocco estesa a 44 px: il disegno resta 38 e non copre la mappa |
| Tutta l'app | selettore compatto (sceglie la partita, filtra le pagine) | 40 px | 44 px |
| Tutta l'app | campi `editor-mappa__campo` | 36 px | 44 px sotto i 1024 px e su puntatore grosso |
| Home, Partita (mappa di Tokyo) | targhe dei luoghi illeggibili sul telefono | **5,46 px**, e portate a una misura leggibile si sovrapponevano | sotto i 520 px di tela le targhe spariscono e i nomi diventano una legenda toccabile da 44 px sotto la mappa |

## I residui della prima stesura, ora chiusi

1. **Il link «altro»** del testo ripiegabile (Palazzi, Covo) era 26×18 px perché appeso in coda al
   paragrafo. Ora è un comando su una riga propria, «Mostra tutto» / «Mostra meno», alto 44 px.
2. **La miniatura di un'entità** (40×40 px in Home e Partita) apre l'ingrandimento: il riquadro
   resta 40 px — ingrandirlo sposterebbe la riga — ma l'area che riceve il tocco è 44 px.
3. **Le etichette troncate con le ellissi**: i nomi delle Persona nel Compendio e in Personaggi e
   le etichette delle tessere compatte («Conoscen…») ora vanno a capo invece di sparire. Una
   tessera cresce di una riga; il dato resta leggibile.

## Regole che restano valide per il lavoro futuro

- 44 px è il bersaglio minimo **a ogni larghezza**, non solo sul tocco: due misure diverse per lo
  stesso comando sono due difetti invece di uno.
- Quando un elemento non può crescere (uno spillo su una mappa, una miniatura in una riga), si
  allarga l'area che riceve il tocco, non il disegno.
- In un `flex`, gli elementi laterali portano `shrink-0` e la parte elastica `min-w-0`: è la causa
  di ogni testo incolonnato lettera per riga trovato in questa passata.
- Un testo che scala con il contenitore ha bisogno di un minimo leggibile; se al minimo non ci sta
  più, cambia forma (la legenda al posto delle targhe), non dimensione.
