# Mappe in stile mapgenie — studio tecnico della Fase 13

Studio scritto il 2026-09-04 a partire dal requisito dell'utente (riportato qui sotto parola per parola) e dallo stato del codice.
È il riferimento per l'implementazione degli step 13.1–13.6 e di 12.4; ogni scelta rimanda al punto del requisito che soddisfa.

## 1. Requisito dell'utente

1. «Mi serve un metodo per poter creare le mappe in app e poterle poi esportare insieme ai punti di interesse (spilli)», da inserire
   nell'app di base «persistite nel repository». Le mappe attuali «sono pessime».
2. «Area di editing della mappa a schermo intero con possibilità di zoom», con «zoom minimo adattato all'area visibile».
3. «Caricare l'immagine di base».
4. «Spilli diversi (non solo per colore ma anche per icona)» per tipo di punto di interesse.
5. Spillo «negozio che al click visualizzi gli oggetti acquistabili».
6. «Diversi livelli di mappa (città → luogo → punti)», «tipo mapgenie» (https://mapgenie.io/clair-obscur-expedition-33/maps/the-continent).
7. Copre «La Città, Palazzi e Dedali ma in modo più ordinato»; «ne La Città mancano tutte le immagini delle rispettive città».
8. Nei Palazzi «i place numerati… connessi tra loro da vari punti di navigabilità… da mappa 1 raggiunto un punto si va a mappa 2»:
   «gestibile graficamente navigando direttamente sulla mappa con click sui punti di interesse».
9. «I punti collezionabili da raccogliere devono funzionare come su mapgenie: una volta raccolti devono sparire dalla mappa a meno di
   abilitare la visualizzazione “vedi anche il già raccolto”».
10. «Il posizionamento spilli deve essere attivo solo in fase di editing della mappa, non in fase di utilizzo».
11. «Dentro la home della partita un'area che visualizzi guida giorno per giorno con accanto (o comunque contestualmente in pagina) la
    mappa navigabile globale».

## 2. Stato attuale (cosa viene sostituito)

- `data/seed/mappe.json` (116 piante delle aree dei Palazzi/Mementos, 107 con URL esterno) e `mappe-citta.json` (24 mappe dei quartieri):
  solo collegamenti a immagini di terzi, scaricate nell'istanza al primo accesso (`pianta_area`, `pianta_quartiere`, immagini ambito
  `mappa`); per questo in Città le miniature mancano finché non si apre ogni quartiere (punto 7).
- Spilli: `marcatore_mappa` (punti dei dungeon, 187 preposizionati) e `marcatore_luogo` (luoghi dei quartieri, 47), coordinate in
  percentuale; `MappaInterattiva` (zoom/trascinamento, spilli colorati, modalità «posiziona» sempre disponibile — contrario al punto 10).
- Entità già catalogate e collegabili agli spilli: 688 punti dei dungeon (12 tipi), 108 luoghi (9 tipi, 39 con negozio), 47 negozi con
  499 articoli, 33 richieste dei Mementos, Confidenti, attività.

## 3. Modello dati (13.1)

Tabelle nuove (migrazione 025), dati dell'istanza condivisi fra le partite; lo stato «raccolto» è per partita.

```
mappa
  chiave           TEXT PK           es. 'tokyo', 'citta-shibuya', 'luogo-shibuya-untouchable', 'kamoshida-02-sala-centrale'
  nome             TEXT NOT NULL
  tipo             TEXT NOT NULL     'citta' | 'quartiere' | 'luogo' | 'palazzo' | 'area' | 'dedalo' | 'generica'
  genitore_chiave  TEXT NULL → mappa(chiave)   livello superiore (Tokyo → quartiere → luogo; Palazzo → area)
  ordine           INTEGER NOT NULL DEFAULT 0
  immagine_chiave  TEXT NULL         chiave dell'immagine nell'ambito «mappa» dell'istanza (caricata dall'editor) …
  asset            TEXT NULL         … oppure asset del repository (es. 'mappe/citta-shibuya'); precedenza all'immagine dell'istanza
  larghezza, altezza INTEGER NULL    dimensioni dell'immagine di base (per l'adattamento dello zoom)
  entita_tipo      TEXT NULL         'quartiere' | 'luogo' | 'dungeon' | 'area'   collegamento all'entità esistente
  entita_chiave    TEXT NULL
  origine          TEXT NOT NULL     'seed' | 'utente'
  note             TEXT NOT NULL DEFAULT ''
  updated_at       TEXT NOT NULL

spillo
  id               INTEGER PK
  mappa_chiave     TEXT NOT NULL → mappa(chiave) ON DELETE CASCADE
  tipo             TEXT NOT NULL     chiave del registro dei tipi (vedi §4)
  nome             TEXT NOT NULL
  descrizione      TEXT NOT NULL DEFAULT ''
  x, y             REAL NOT NULL     percentuale 0–100 dell'immagine (indipendente da zoom e schermo)
  riferimento_tipo TEXT NULL         'mappa' | 'negozio' | 'punto' | 'luogo' | 'confidente' | 'richiesta' | 'attivita'
  riferimento_chiave TEXT NULL       es. mappa di destinazione (passaggio), chiave del negozio, chiave del punto di dungeon…
  collezionabile   INTEGER NOT NULL DEFAULT 0   sparisce quando raccolto (punto 9)
  ordine           INTEGER NOT NULL DEFAULT 0
  origine          TEXT NOT NULL     'seed' | 'utente'
  updated_at       TEXT NOT NULL
  condizioni_json  TEXT NULL         migrazione 029 (15.22): elenco JSON delle condizioni di visibilità (`shared/condizioniSpillo.ts`);
                                     NULL = sempre visibile; con la partita lo spillo bloccato sparisce dalla mappa
  seed_identita_json TEXT NULL       migrazione 030: identità (tipo, nome, x, y, riferimento) dello spillo del seed quando l'utente lo
                                     modifica e diventa `utente`; al reseed il pacchetto salta lo spillo con quella identità (niente doppioni,
                                     modifiche e condizioni conservate)

spillo_partita  (stato per partita)
  partita_id, spillo_id PK, raccolto INTEGER NOT NULL DEFAULT 0, updated_at
```

Regole:
- Il tipo `passaggio` con `riferimento_tipo = 'mappa'` è il collegamento fra livelli (punti 6 e 8): il click apre la mappa di destinazione;
  la mappa figlia mostra il pulsante «Torna a <genitore>» e il percorso (breadcrumb) ricostruito con `genitore_chiave`.
- Uno spillo con `riferimento_tipo = 'punto'` eredita lo stato del punto di dungeon della partita (`stato_punto`: ottenuto/esaurito ⇒
  raccolto) così i forzieri già gestiti nella Guida spariscono anche sulla mappa; gli spilli senza riferimento usano `spillo_partita`.
- `riferimento_tipo = 'negozio'` ⇒ la scheda dello spillo mostra gli articoli del negozio (punto 5) con prezzo, disponibilità e stato
  d'acquisto della partita (già tracciato da `acquisto_partita`).
- Migrazione automatica dell'esistente: per ogni `pianta_area`/`pianta_quartiere` con immagine nell'istanza viene creata una `mappa`
  (origine `utente`, `immagine_chiave` esistente) e per ogni marcatore uno `spillo` con riferimento al punto/luogo: nulla va perso.

## 4. Registro dei tipi di spillo (condiviso, `shared/spilli.ts`)

34 tipi (15.24) in cinque gruppi, che sono anche i gruppi della palette dell'editor (`GRUPPI_SPILLO`). I tipi della città seguono le etichette
che la mappa del gioco dà ai punti di interesse: quando il giocatore vede «Bevande», «Sigarette» o «Cercalavoro» sulla mappa di Yongen-Jaya o
del Sottopasso trova lo stesso nome nella palette. Analisi dei punti di interesse (2026-09-05): città = negozi, ristoranti, distributori di
bevande, distributori di sigarette/tabaccaio, espositori del Cercalavoro, posti dei lavori part-time, bagno pubblico, lavanderia, cinema,
biblioteca, chiese e templi, sale giochi, abitazioni, altre attività, stazioni; Palazzi e Mementos = forzieri, tesori, Tesoro del Palazzo, Semi
della Bramosia, oggetti, Timbri dei Mementos, boss, miniboss, nemici, punti sensibili, meccanismi (leve, interruttori, pannelli), punti del
rampino, porte chiuse, stanze sicure, scorciatoie. Restano senza tipo proprio, perché coperti da un tipo esistente: chioschi e bancarelle (negozio
o Confidente), laghetto di pesca, gabbie di battuta, palestra e punti di studio (attività), Jose (negozio), bersagli delle richieste (boss/miniboss
con riferimento alla richiesta), fiori dei Mementos (compaiono a caso, non si possono spillare).

| gruppo | tipo | nome nella palette | icona (asset §18, riserva SVG) | colore | collezionabile per default | riferimento tipico |
|---|---|---|---|---|---|---|
| Spostamenti | passaggio | Passaggio | spillo-passaggio | blu | no | mappa |
| Spostamenti | treno | Stazione | spillo-treno | verde scuro | no | mappa (quartiere) |
| Città | negozio | Negozio | spillo-negozio | verde | no | negozio |
| Città | ristorante | Ristorante | spillo-ristorante | marrone | no | luogo |
| Città | distributore | Bevande (etichetta del gioco; prima «Distributore») | spillo-distributore | ciano | no | luogo |
| Città | sigarette | Sigarette (distributore di sigarette / tabaccaio) | spillo-sigarette | grigio caldo | no | luogo |
| Città | cercalavoro | Cercalavoro (riviste di annunci di lavoro) | spillo-cercalavoro | ambra scura | no | luogo |
| Città | lavoro | Lavoro part-time (dove si lavora) | spillo-lavoro | verde petrolio | no | attivita |
| Città | terme | Bagno pubblico | spillo-terme | ciano chiaro | no | luogo |
| Città | lavanderia | Lavanderia | spillo-lavanderia | lavanda | no | luogo |
| Città | cinema | Cinema | spillo-cinema | blu notte | no | luogo |
| Città | biblioteca | Biblioteca | spillo-biblioteca | bruno | no | luogo |
| Città | culto | Chiesa o tempio | spillo-culto | viola scuro | no | luogo |
| Città | sala-giochi | Sala giochi | spillo-sala-giochi | lime | no | luogo |
| Città | casa | Casa (abitazione) | spillo-casa | pesca | no | luogo |
| Città | attivita | Attività | spillo-attivita | giallo | no | attivita / luogo |
| Persone | confidente | Confidente | spillo-confidente | rosa | no | confidente |
| Persone | dialogo | Dialogo | spillo-dialogo | indaco | sì (conversazione fatta) | — (personaggio non Confidente; luogo scelto a mano se utile) |
| Palazzi e Mementos | forziere | Forziere | spillo-forziere | oro | sì | punto |
| Palazzi e Mementos | tesoro | Tesoro | spillo-tesoro | viola | sì | punto |
| Palazzi e Mementos | tesoro-palazzo | Tesoro del Palazzo | spillo-tesoro-palazzo | fucsia | sì | punto (Tesoro del Palazzo) |
| Palazzi e Mementos | seme-bramosia | Seme della bramosia | spillo-seme-bramosia | viola chiaro | sì | punto (Seme della bramosia) |
| Palazzi e Mementos | oggetto-chiave | Oggetto chiave | spillo-oggetto-chiave | ambra | sì | punto |
| Palazzi e Mementos | timbro | Timbro dei Mementos (postazione fissa per piano) | spillo-timbro | rosa lilla | sì (timbrato) | — |
| Palazzi e Mementos | boss / miniboss | Boss / Miniboss | spillo-boss / spillo-miniboss | rosso / arancio | sì (sconfitto) | punto |
| Palazzi e Mementos | nemico | Nemico | spillo-nemico | grigio-azzurro | no (sì se il punto è esauribile) | punto (Ombra della Sciagura) |
| Palazzi e Mementos | punto-sensibile | Punto sensibile | spillo-punto-sensibile | verde acqua | no | punto (enigma) |
| Palazzi e Mementos | meccanismo | Meccanismo (leva, interruttore, pannello) | spillo-meccanismo | ardesia | no | punto |
| Palazzi e Mementos | rampino | Punto del rampino (Royal) | spillo-rampino | magenta scuro | no | — |
| Palazzi e Mementos | porta | Porta chiusa (chiave, tessera, dall'altro lato) | spillo-porta | rosso scuro | no | punto |
| Palazzi e Mementos | sicura | Stanza sicura | spillo-sicura | azzurro | no | punto |
| Palazzi e Mementos | scorciatoia | Scorciatoia | spillo-scorciatoia | grigio | no | punto |
| Altro | nota | Nota | spillo-nota | bianco | no | — |

Le corrispondenze automatiche dalla guida (`spilloPerPunto`, `spilloPerLuogo`) non usano i tipi nuovi: i luoghi «servizio» restano attività e i
punti «puzzle» punti sensibili; i tipi nuovi si scelgono nell'editor. Il pacchetto `citta-yongen-jaya.json` riclassifica bagno pubblico, cinema,
lavanderia e la casa di Sojiro Sakura (prima «punto sensibile», tipo da Palazzo) con i tipi dedicati (reseed automatico via hash). I pulsanti della
palette sono alti 44 px (bersaglio touch).

I 12 tipi dei punti di dungeon esistenti (`utils/dungeon.ts`) si mappano su questi (persona → nota con riferimento al punto, puzzle → punto-sensibile,
volontà → seme-bramosia, tesoro → tesoro-palazzo, ombra-sciagura → nemico, forziere-chiuso → forziere, oggetto → oggetto-chiave). Quando la corrispondenza cambia,
`sincronizzaMappe` riclassifica a ogni avvio gli spilli di origine `seed` (tipo e collezionabilità), senza toccare quelli dell'utente né gli stati per partita.

## 5. API (`/api/mappe`, sostituisce le rotte attuali mantenendo `scarica` come sorgente opzionale dell'immagine)

| Metodo | Rotta | Uso |
|---|---|---|
| GET | `/api/mappe` | albero delle mappe (chiave, nome, tipo, genitore, miniatura, conteggi degli spilli) |
| GET | `/api/mappe/:chiave?partita=` | mappa con spilli e stato raccolto/ottenuto della partita, articoli dei negozi collegati |
| POST/PUT/DELETE | `/api/mappe`, `/api/mappe/:chiave` | editor: crea, rinomina, sposta nell'albero, elimina (con conferma se ha figli) |
| PUT | `/api/mappe/:chiave/immagine` | immagine di base (corpo grezzo `image/*`, come `/api/immagini`), larghezza/altezza calcolate |
| POST/PUT/DELETE | `/api/mappe/:chiave/spilli`, `/api/mappe/spilli/:id` | editor: spilli (tipo, nome, descrizione, x/y, riferimento, collezionabile, condizioni di visibilità) |
| PUT | `/api/partite/:id/spilli/:spilloId` | `{ raccolto }` in uso normale (punto 9) |
| GET | `/api/mappe/esporta` | ZIP con `mappe.json` (mappe + spilli + tipi) e `immagini/<chiave>.<ext>` (punto 1) |
| POST | `/api/mappe/importa` | ZIP (stesso formato): unione per chiave, con `sovrascrivi` |

Validazione zod come per le altre rotte; le scritture dell'editor sono negate se la richiesta non ha `modalita=editor` (difesa in
profondità del punto 10, oltre all'interfaccia).

## 6. Formato di esportazione e seed del repository (punto 1)

Stato: il pacchetto JSON (versione 1) è quello descritto sotto; per il repository l'editor produce inoltre uno ZIP per luogo (radice + discendenti) con `data/seed/mappe/<chiave>.json` e gli asset in `public/asset/mappe/` (e `public/asset/spilli/` per le schermate degli spilli), scritto da `server/utils/zip.ts` senza dipendenze; il seed carica `mappe-editor.json` e poi `data/seed/mappe/*.json`. Decisione dell'utente (2026-09-04 sera): il pacchetto è completo, immagini di base e schermate degli spilli comprese, puntate come asset; l'utente lo consegna e viene caricato come dato preimpostato dell'app (supera la precedente esclusione delle piante scaricate).

`mappe.json` esportato = `{ versione: 1, mappe: [{ chiave, nome, tipo, genitore, ordine, immagine: 'immagini/<chiave>.png' | asset, larghezza,
altezza, entita, note, spilli: [{ tipo, nome, descrizione, x, y, riferimento, collezionabile, ordine, condizioni }] }] }` (`condizioni` assente quando vuoto:
elenco di `RequisitoSpillo` di `shared/condizioniSpillo.ts`; all'importazione le voci non calcolabili o con chiavi assenti dalla Guida vengono scartate e contate
nell'esito). Lo stesso file, con le
immagini in `public/asset/mappe/`, è letto da `caricaSeed` come `data/seed/mappe-editor.json` (origine `seed`): un `POST /importa` dello
ZIP esportato e un commit sono l'intero flusso «creo in app → pubblico nel repository». Il pacchetto è completo: immagini di base e schermate degli spilli comprese, anche quelle scaricate dalle guide (la loro provenienza
è annotata nel LEGGIMI; decisione dell'utente del 2026-09-04 sera, registrata in `DECISIONI.md`). Le mappe `seed` sono modificabili
nell'istanza: la copia modificata diventa `utente` e prevale sulla `seed` con la stessa chiave.

## 7. Visore (13.2) — `VisoreMappa`

- Contenitore a schermo intero (`position: fixed; inset: 0`, sopra la barra, con pulsante «Chiudi» e barra superiore col percorso
  Tokyo › Shibuya › Untouchable). Zoom con rotellina, pulsanti e pinch (Pointer Events, come oggi), trascinamento; **zoom minimo =
  «adatta»** calcolato dal rapporto fra area visibile e immagine (punto 2), zoom massimo 8×; doppio click per adattare.
- Spilli: icona per tipo (`IconaSpillo`: asset §18 → SVG di riserva) su goccia colorata, dimensione costante a ogni zoom (scala inversa),
  raggruppamento («+3») quando si sovrappongono sotto lo zoom minimo, etichetta al passaggio del mouse; legenda laterale con i tipi presenti,
  conteggi e filtri per tipo; ricerca per nome.
- Click su uno spillo → popup ancorato allo spillo e scheda nel pannello: nome, descrizione, immagine dell'entità collegata (mappa e Confidente: negozi, luoghi, punti e richieste non hanno immagini nell'app; lo spillo può però avere le proprie schermate di riferimento, 13.3),
  azioni: «Apri mappa» (passaggio), «Ottenuto/Esaurito/Riapri» (punto di dungeon, stessi stati della Guida), «Raccolto» (collezionabile), articoli del negozio con acquisto
  (`negozi.json`: nome, prezzo, disponibilità, stato «comprato» della partita), «Scheda del Confidente», «Richiesta».
- Raccolti nascosti per default; interruttore «Mostra anche i raccolti» (punto 9) con conteggio; stato per partita attiva.
- In uso normale nessun posizionamento: nessun click sulla mappa modifica dati (punto 10). Il pulsante «Modifica mappa» apre l'editor.

## 8. Editor (13.3) — `EditorMappa`

- Stessa superficie del visore in modalità dedicata (barra rossa «Modifica: <mappa>» sempre visibile, uscita con conferma se ci sono
  modifiche non salvate). Strumenti: **Seleziona/sposta** (trascina uno spillo), **Aggiungi** (palette dei tipi; click sulla mappa crea lo
  spillo nel punto), **Incolla** (attivo dopo «Copia»: un tocco sulla mappa crea lo spillo copiato — stesso tipo, nome, descrizione, collezionabile, riferimento e condizioni di visibilità — nel punto toccato, poi si torna a Seleziona; gli appunti vivono in `sessionStorage` e restano per altre copie, anche su altre mappe); **Copia** ed **Elimina** sono pulsanti nel pannello dello spillo selezionato (non strumenti a parte); il tipo dello spillo si cambia dal pannello senza ricrearlo; pannello proprietà dello spillo selezionato: tipo, nome, descrizione, collezionabile, riferimento con ricerca
  fra negozi, punti di dungeon, luoghi, Confidenti, richieste, mappe; «Crea mappa collegata» (crea la mappa figlia e collega lo spillo).
- **Condizioni di visibilità** (15.22, `CondizioniSpilloEditor`): elenco delle condizioni dello spillo con «Togli» e costruttore «Nuova condizione»
  con il tipo scelto da un elenco chiuso e i parametri da selettori, mai testo libero — da una data (giorno + mese del calendario di gioco), solo in un
  periodo, dopo un Palazzo (elenco dei Palazzi della Guida), Dote almeno a un rango (1–5), Confidente almeno a un rango (1–10, elenco dei Confidenti),
  richiesta dei Mementos completata (elenco), solo con la pioggia / mai con la pioggia, solo di giorno / solo di sera (il momento della giornata
  della partita, impostato nella scheda «Oggi»: «giorno» = mattina, pranzo, pomeriggio, dopo scuola; torna a «giorno» quando cambia il giorno
  corrente), giorni della settimana (pulsanti), stagione, da quando si
  sblocca un quartiere (solo i quartieri il cui sblocco nella Guida comincia con una data, es. Shinjuku 18 giugno, Akihabara 31 agosto, Kichijoji
  5 giugno: quelli legati a Confidenti o libri non sono calcolabili e non vengono offerti né accettati). Sono le stesse condizioni che l'app sa
  calcolare per articoli e Confidenti: le condizioni non calcolabili («dopo aver pescato una volta») non esistono per gli spilli. Le condizioni viaggiano con «Copia/Incolla», con i pacchetti (campo `condizioni` dello spillo) e
  con l'esportazione JSON. Nel visore, con una partita attiva, lo spillo con una condizione rossa sparisce (chip «Mostra anche i non ancora
  disponibili (N)» nella barra laterale); popup e scheda mostrano ogni condizione con il suo semaforo e il chip «Non ancora»; senza partita le
  condizioni si leggono soltanto. Tutti gli spilli esistenti (seed e utente) sono nati senza condizioni.
- Immagine di base: caricamento o sostituzione (trascina il file o scegli), oppure «Scarica dalla guida» dove esiste il vecchio
  collegamento (`pianta_*`), oppure asset del repository (§19). Cambiare immagine mantiene gli spilli (percentuali).
- Gestione dell'albero: crea mappa (tipo, nome, genitore), rinomina, sposta, elimina; anteprima delle miniature.
- **Albero e passaggi** (15.24). L'albero dice chi contiene chi (percorso, «Su», elenco «Mappe figlie», esportazione per luogo); sulla mappa ci si
  sposta con gli spilli «passaggio» (riferimento a un'altra mappa), che sono porte disegnate sull'immagine. Le due cose restano distinte ma l'editor
  le tiene allineate: (1) «Nuova mappa» chiede se creare il passaggio sulla mappa genitore verso la nuova (preselezionato) e il passaggio di ritorno
  nella nuova mappa (a scelta) — `POST /api/mappe` con `passaggio`/`ritorno`; (2) nell'elenco «Mappe figlie» ogni figlia che nessuno spillo di
  questa mappa raggiunge porta la riga «Senza passaggio da questa mappa» con il pulsante «Crea passaggio»; (3) sotto «Su: <genitore>», se nessuno
  spillo punta al genitore, «Crea passaggio di ritorno». Entrambi i pulsanti chiamano `POST /api/mappe/:chiave/passaggi` `{ destinazione }`: il
  server crea lo spillo «passaggio» col nome della destinazione nel punto libero più vicino al centro (o in basso al centro, 50/92, quando la
  destinazione è il genitore), dove «libero» vuol dire nessuno spillo entro 5 punti percentuali su entrambi gli assi (griglia a passo 8 in ordine
  di distanza); lo spillo viene selezionato e si trascina dove sta davvero l'ingresso. 409 se la mappa ha già uno spillo verso quella
  destinazione, 400 verso sé stessa, 404 se la destinazione non esiste. I passaggi automatici del seed (radici Città/Palazzo/Dedalo, `sincronizzaMappe`)
  non cambiano.
- La palette di «Aggiungi» è a gruppi (Spostamenti, Città, Persone, Palazzi e Mementos, Altro — `GRUPPI_SPILLO`), con i 34 tipi del registro (§4).
- Esporta (ZIP per luogo, JSON di tutto) e Importa dalla stessa schermata; schermate di riferimento per spillo (una o più, con didascalia); nessuno stato «non salvato»: ogni modifica è salvata subito.

## 9. Integrazione (13.4) — sostituzione ordinata di Città, Palazzi e Dedali (punti 6, 7, 8)

- **Guida → Città**: mappa `tokyo` incorporata sopra le piastrelle dei quartieri (quartieri come spilli `passaggio`); le piastrelle mostrano
  l'immagine di base stessa ridimensionata dal browser (`MiniaturaMappa`: istanza → asset `mappe/<chiave>` → icona), senza un endpoint di
  miniature generate lato server (scelta 13.4: evita un ridimensionatore; le immagini sono già leggere); `QuartierePage` = visore incorporato
  della mappa del quartiere con i luoghi.
- **Guida → Palazzi**: `DungeonDettaglioPage` = elenco delle aree (mappe figlie in ordine) con la mappa dell'area corrente e gli spilli
  `passaggio` fra area e area; la lista dei punti resta come indice testuale accanto alla mappa.
- **Dedali (Mementos)**: piani come mappe figlie di `mementos`, con le richieste collegate.
- I dati attuali (`mappe.json`, `mappe-citta.json`, marcatori) vengono migrati nella nuova struttura; il flusso «scarica dalla guida»
  resta come sorgente opzionale dell'immagine.

## 10. Home della Partita (13.5 = 12.4, punto 11)

Stato: fatto. La scheda «Oggi» è la predefinita della Partita e compare anche nella Home; il visore incorporato parte da Tokyo e «Sulla mappa» lo sposta sulla mappa dell'azione (Palazzo, Mementos, negozio, luogo del Confidente) centrata sullo spillo.

Scheda «Oggi» nella Partita: a sinistra la guida del giorno corrente (azioni con spunta, avvisi, meteo, collegamenti al punto esatto delle
pagine), a destra (sotto, su schermi stretti) il visore della mappa globale `tokyo` in versione incorporata (stessa componente, altezza
fissa, pulsante «Schermo intero»), centrato sul quartiere dell'azione selezionata quando l'azione ha un luogo collegato.

## 11. Asset (13.6)

Icone degli spilli `ui/spillo-<tipo>.png` (§18) con riserva SVG; mappe di base illustrate `mappe/*.png` (§19, 25 file) per Tokyo e i
quartieri; per le aree dei Palazzi l'immagine di base la fornisce l'utente dall'editor (screenshot propri restano nell'istanza).

## 12. Test e verifica

- Server: migrazione 025 e migrazione automatica dei marcatori (conteggi invariati), CRUD mappe/spilli con validazione, stato raccolto per
  partita, esportazione/importazione (round trip: esporta → importa in un DB vuoto → stesse mappe e spilli), rifiuto delle scritture fuori
  dall'editor.
- Frontend: visore (adatta = zoom minimo, click su passaggio apre la figlia, raccolti nascosti/mostrati, scheda del negozio con articoli),
  editor (aggiunta e spostamento di uno spillo con coordinate in percentuale, salvataggio), integrazione in Città e Palazzi.
- Manuale: prova con una mappa reale caricata dall'utente e con il set §19.

## 13. Ordine di lavoro

Stato al 2026-09-04: **13.1 fatto** (migrazione 027, `sincronizzaMappe`, `mappeService`, rotte, schemi, seed `mappe-editor.json`, client API, test `mappe-editor.test.ts`); pacchetto di esportazione in JSON con immagini base64 (§6), non ZIP. **13.2 fatto** (`VisoreMappa`, `IconaSpillo`, `MappaPage`, rotte `/guida/mappe`): il modello di mapgenie.io è stato verificato dal vivo (barra laterale a sinistra con categorie e conteggi, popup ancorato, controlli in basso a destra, trovati tracciati) e il visore lo segue; il §7 resta valido con queste precisazioni. **13.3 fatto** (`EditorMappaPage`, schermate degli spilli con migrazione 028, riferimenti cercati, passaggi automatici, ZIP per luogo, seed `data/seed/mappe/*.json`); mappa globale di Tokyo e mappa verticale dei Mementos = immagini dell'utente nell'istanza con quartieri/Dedali come passaggi; accessi a Palazzi e Mementos = passaggi dentro le mappe dei luoghi (stazione di Shibuya per i Mementos). **13.4 fatto** (`MappaIncorporata` in Città, quartiere e Palazzo; `MappaInterattiva` rimosso; sezione «Mappe» nella Guida). **13.5 fatto** (`OggiPartita` con `GiornoGuida` e `MappaIncorporata`, nella Partita e nella Home; stato delle azioni e mappa collegata dal server). Resta 13.6 (asset: prompt §18/§19/§20 già censiti, riserve SVG in codice).

13.1 modello + API + migrazione + esportazione/importazione → 13.2 visore → 13.3 editor → 13.4 integrazione → 13.5/12.4 home «Oggi» →
13.6 asset (i prompt §18/§19 sono già censiti; l'app funziona con le riserve SVG e con le immagini caricate dall'utente).
