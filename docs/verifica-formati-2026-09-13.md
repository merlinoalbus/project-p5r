# Verifica dei tre formati su tutta l'app — 2026-09-13

Passata su **35 schermate** (tutte le rotte del router, con le chiavi reali del database) a **375,
768 e 1280 px**, misurando per ciascuna: scorrimento orizzontale, bersagli del tocco sotto i 44 px,
testo che sborda dal contenitore, testo incolonnato lettera per riga.

La verifica dei lotti precedenti aveva coperto **solo le schermate toccate da ciascun lotto**; il
resto dell'app non era mai stato misurato. Questo documento è il censimento che mancava.

## Metodo

Misura eseguita nel browser sulle pagine vere, non sui componenti isolati: per ogni rotta si
scorre in cima, si attende il caricamento e si misurano gli elementi resi. Due precisazioni che
hanno cambiato i numeri, ed erano errori del primo giro di misura:

- il bersaglio di una **casella di spunta** è l'etichetta che la avvolge, non il quadratino: una
  casella di 20 px dentro una `<label>` alta 44 px è già a norma (prima contavo 78 falsi difetti
  nelle sole Domande);
- gli elementi **nascosti con la tecnica sr-only** (clip-path) hanno un riquadro che sembra
  sbordare e un testo che sembra incolonnato: non si vedono, non sono difetti. Le etichette dei
  pulsanti del visore, che la barra stretta nasconde di proposito, ricadevano qui.

## Difetti trovati e corretti

| Schermate | Difetto | Prima | Correzione |
|---|---|---|---|
| Oggetti (95 occorrenze), Attività (19), Confidenti | chip-link toccabili troppo bassi | 23 px | `a.chip`, `button.chip` a 44 px sotto i 1024 px e su puntatore grosso |
| Cruciverba (38) | casella di spunta senza etichetta avvolgente | 20×20 px | etichetta toccabile attorno, aspetto invariato |
| Home, Partita, Percorso (caselle «Fatto» delle azioni del giorno) | idem | 20×20 px | idem, in `AgendaGiorno` e `GiornoGuida` |
| Confidenti (ogni riga di rango) | «Rango 1» e «0 scelte» incolonnati lettera per riga | 16×135 px | `shrink-0` + `whitespace-nowrap` sui lati, `min-w-0 flex-1` sulla nota |
| Storico della partita | stesso impianto, stesso rischio | — | stessa correzione, preventiva |
| Ogni pagina con mappa | briciole del visore | 32 px | 44 px su touch |
| Ogni pagina con mappa | elenco delle mappe figlie, comandi di zoom, «Mostra tutti», categorie | 34–40 px | 44 px su touch |
| Ogni pagina con mappa | spilli sulla mappa | 38×38 px | area del tocco estesa a 44 px con un rettangolo invisibile: il disegno resta 38, la mappa non viene coperta |
| Denaro e squadra | riga con sei elementi in `flex-wrap`, nome spezzato lettera per riga, «Livello» ripetuto, casella 20 px, campi 36 px | — | scheda rifatta in due fasce (PR #86) |
| Tutta l'app | campi `editor-mappa__campo` | 36 px | 44 px sotto i 1024 px e su puntatore grosso (PR #86) |

## Residui dichiarati, non corretti

1. **Il link «altro»** che apre un testo ripiegato (Palazzi, Covo): 26×18 px. È un collegamento
   **dentro un paragrafo**, non un comando isolato: portarlo a 44 px spezzerebbe la riga di testo.
2. **La miniatura di un'entità** (`ImmagineEntita`, 40×40 px in Home e Partita): il tocco apre
   l'ingrandimento, che è un di più — l'immagine si vede comunque, e la misura la decide il
   chiamante per stare nella riga.
3. **Etichette troncate con le ellissi** dove lo spazio non basta (nomi delle Persona nel Compendio,
   «Conoscenza» nelle tessere compatte): il troncamento è gestito e voluto, non un difetto di
   impaginazione.

## Stato finale

A 375 e 768 px, su tutte le 35 schermate: **nessuno scorrimento orizzontale**, **nessun testo
incolonnato**, **nessun testo che sborda** oltre i troncamenti voluti, e nessun bersaglio sotto i
44 px al di fuori dei tre residui dichiarati qui sopra.
