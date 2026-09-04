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

| tipo | icona (asset §18, riserva SVG) | colore | collezionabile per default | riferimento tipico |
|---|---|---|---|---|
| passaggio | spillo-passaggio | blu | no | mappa |
| negozio | spillo-negozio | verde | no | negozio |
| forziere | spillo-forziere | oro | sì | punto |
| tesoro | spillo-tesoro | viola | sì | punto |
| boss / miniboss | spillo-boss / spillo-miniboss | rosso / arancio | sì (sconfitto) | punto |
| sicura | spillo-sicura | azzurro | no | punto |
| scorciatoia | spillo-scorciatoia | grigio | no | punto |
| confidente | spillo-confidente | rosa | no | confidente |
| attivita | spillo-attivita | giallo | no | attivita / luogo |
| ristorante | spillo-ristorante | marrone | no | luogo |
| distributore | spillo-distributore | ciano | no | luogo |
| treno | spillo-treno | verde scuro | no | mappa (quartiere) |
| nota | spillo-nota | bianco | no | — |

I 12 tipi dei punti di dungeon esistenti (`utils/dungeon.ts`) si mappano su questi (persona → nota con riferimento al punto, puzzle → nota,
volontà → tesoro, ombra-sciagura → miniboss, forziere-chiuso → forziere, oggetto → tesoro).

## 5. API (`/api/mappe`, sostituisce le rotte attuali mantenendo `scarica` come sorgente opzionale dell'immagine)

| Metodo | Rotta | Uso |
|---|---|---|
| GET | `/api/mappe` | albero delle mappe (chiave, nome, tipo, genitore, miniatura, conteggi degli spilli) |
| GET | `/api/mappe/:chiave?partita=` | mappa con spilli e stato raccolto/ottenuto della partita, articoli dei negozi collegati |
| POST/PUT/DELETE | `/api/mappe`, `/api/mappe/:chiave` | editor: crea, rinomina, sposta nell'albero, elimina (con conferma se ha figli) |
| PUT | `/api/mappe/:chiave/immagine` | immagine di base (corpo grezzo `image/*`, come `/api/immagini`), larghezza/altezza calcolate |
| POST/PUT/DELETE | `/api/mappe/:chiave/spilli`, `/api/mappe/spilli/:id` | editor: spilli (tipo, nome, descrizione, x/y, riferimento, collezionabile) |
| PUT | `/api/partite/:id/spilli/:spilloId` | `{ raccolto }` in uso normale (punto 9) |
| GET | `/api/mappe/esporta` | ZIP con `mappe.json` (mappe + spilli + tipi) e `immagini/<chiave>.<ext>` (punto 1) |
| POST | `/api/mappe/importa` | ZIP (stesso formato): unione per chiave, con `sovrascrivi` |

Validazione zod come per le altre rotte; le scritture dell'editor sono negate se la richiesta non ha `modalita=editor` (difesa in
profondità del punto 10, oltre all'interfaccia).

## 6. Formato di esportazione e seed del repository (punto 1)

Stato: il pacchetto JSON (versione 1) è quello descritto sotto; per il repository l'editor produce inoltre uno ZIP per luogo (radice + discendenti) con `data/seed/mappe/<chiave>.json` e gli asset in `public/asset/mappe/` (e `public/asset/spilli/` per le schermate degli spilli), scritto da `server/utils/zip.ts` senza dipendenze; il seed carica `mappe-editor.json` e poi `data/seed/mappe/*.json`. Decisione dell'utente (2026-09-04 sera): il pacchetto è completo, immagini di base e schermate degli spilli comprese, puntate come asset; l'utente lo consegna e viene caricato come dato preimpostato dell'app (supera la precedente esclusione delle piante scaricate).

`mappe.json` esportato = `{ versione: 1, mappe: [{ chiave, nome, tipo, genitore, ordine, immagine: 'immagini/<chiave>.png' | asset, larghezza,
altezza, entita, note, spilli: [{ tipo, nome, descrizione, x, y, riferimento, collezionabile, ordine }] }] }`. Lo stesso file, con le
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
  spillo nel punto); **Elimina** è un pulsante nel pannello dello spillo selezionato (non uno strumento a parte); pannello proprietà dello spillo selezionato: tipo, nome, descrizione, collezionabile, riferimento con ricerca
  fra negozi, punti di dungeon, luoghi, Confidenti, richieste, mappe; «Crea mappa collegata» (crea la mappa figlia e collega lo spillo).
- Immagine di base: caricamento o sostituzione (trascina il file o scegli), oppure «Scarica dalla guida» dove esiste il vecchio
  collegamento (`pianta_*`), oppure asset del repository (§19). Cambiare immagine mantiene gli spilli (percentuali).
- Gestione dell'albero: crea mappa (tipo, nome, genitore), rinomina, sposta, elimina; anteprima delle miniature.
- Esporta (ZIP per luogo, JSON di tutto) e Importa dalla stessa schermata; schermate di riferimento per spillo (una o più, con didascalia); passaggi automatici verso le mappe figlie da trascinare; nessuno stato «non salvato»: ogni modifica è salvata subito.

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
