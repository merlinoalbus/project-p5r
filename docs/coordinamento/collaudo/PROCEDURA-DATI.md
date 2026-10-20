# Collaudo — foto e ripristino dei dati per le prove che scrivono

Richiesta del Project manager (2026-10-20): quando un tester deve fare prove che scrivono sui dati dell'istanza di collaudo
(BE 3301 / FE 5473, cartella `p5s-sviluppo-l2`), lo chiede al Collaudo (`local_8fe86a34-449c-43ad-982e-cf56a00e13f7`).
Il Collaudo fotografa `data/` prima delle prove e lo ripristina dopo, a server fermo, confrontando le impronte. Ogni ciclo
si annota in `lotti/<Lx>/esiti-collaudo/cicli-dati.md`.

Strumento: `collaudo-dati.cjs` (copia qui; l'originale è nello scratchpad della sessione Collaudo), eseguito dalla cartella dell'istanza.

| Comando | Cosa fa |
|---|---|
| `foto data <cartella>` | API di backup di better-sqlite3 (sorgente in sola lettura, anche a server acceso) di gioco.db e partite.db, `integrity_check` sulla copia, `impronta.json` accanto |
| `ripristina <cartella> data` | rifiuta se qualcosa ascolta su 3301; toglie gioco/partite `.db`, `-wal`, `-shm`, `-journal` da data/, ricopia la foto, ricalcola l'impronta e la confronta con quella della foto (EXIT 2 se diversa) |
| `impronta <cartella> <json>` / `confronta <A> <B>` | impronta e confronto a parte |

L'impronta copre **ogni** tabella dei due file: user_version, sha256 dello schema, numero di righe e sha256 delle righe in ordine
stabile (rowid, o tutte le colonne per le tabelle WITHOUT ROWID), BLOB compresi. Il confronto elenca le tabelle che cambiano.

## La fonte dei dati è p5s (decisione dell'utente, 2026-10-20 ~05:05Z) — vale più della sezione seguente
L'utente: «no l'ho fatto su p5s» e «persona5royal non lo tocco fino a quando non termini il lavoro». Quindi:
1. **La produzione (persona5royal) resta ferma alla copia 0440Z.** Il lavoro nuovo dell'utente si fa su p5s.
2. **p5s contiene dati dell'utente: non si sovrascrive mai**, né con copie della produzione né con i rilasci. Quando si pubblicano L2, L3…
   su p5s, le migrazioni si applicano sui **suoi** dati, con un backup del volume `p5s_data` prima di ogni rilascio.
3. **La base di riferimento** per anteprima, collaudo e analisi è la **copia di p5s in sola lettura**: API di backup dentro
   `project_p5r_review_be`, che non si ferma. Va in `dati-produzione/p5s-<data>-<ora>Z/`. Si rifà ogni volta che l'utente dice di aver lavorato
   su p5s, e sempre prima di ogni rilascio. Poi si aggiorna il riferimento in testa a `bacheca.md`.
4. La copia di p5s ha già le migrazioni del codice pubblicato su p5s (oggi 107-108, `user_version` 108). Collaudo e anteprima partono da lì e
   applicano solo le migrazioni successive.
5. Ogni nuova copia si confronta con la precedente e con l'ultima della produzione: le differenze attese sono solo quelle dell'utente e quelle
   delle migrazioni già applicate su p5s. Le differenze inattese si segnalano al PM.
- Prima base con questa regola: `dati-produzione/p5s-2026-10-20-0503Z/`.

## Dati della produzione (principio dell'utente, 2026-10-20)
Si lavora **sempre sui dati attuali della produzione** (persona5royal), non su copie vecchie: l'utente continua a giocare e a scrivere.
Alla fine, dopo la validazione dell'utente, i dati prodotti dal ramo newreview sostituiranno quelli principali: prima della sostituzione
serve un'**ultima copia fresca** della produzione, sulla quale si rifanno o si integrano tutte le modifiche ai dati (migrazioni e
interventi fuori dalle migrazioni, dall'inventario di BE), con il confronto delle cifre.
- Copia: `ssh … root@<server di produzione>` (indirizzo omesso: repository pubblico), container `project_p5r_be`, `/data`, API di backup di better-sqlite3 con sorgenti `readonly`
  (`dati-produzione/<data>-<ora>Z/copia-produzione.cjs`, con `NODE_PATH=/app/node_modules`), copia in `/tmp` del container, `docker cp`,
  `scp`, sha256 uguali sui due lati; container mai fermato, `/data` mai scritto, temporanei tolti.
- In `dati-produzione/<data>-<ora>Z/`: i due `.db`, `LEGGIMI.md` (sha256, user_version), impronta completa, `impronta-preservare.json`,
  differenze riga per riga con la copia precedente (`differenze-righe.cjs`).
- Installazione sull'istanza: server fermi, dati di prima in `data/backups/`, copia, avvio (migrazioni); registrare le migrazioni una per
  una con le cifre confrontate con quelle attese (`lotti/<Lx>/esiti-collaudo/dati-prod-<data>/migrazioni.txt`); nuova base `<Lx>-base-prod-<data>`.
  Avvisare subito BE (istanza di sviluppo 3201), i quattro tester e il PM.
- Prima copia con questo principio: `dati-produzione/2026-10-20-0440Z/` → base `L2-base-prod-20261020`.

## Lavoro da preservare dopo la migrazione 110
Dalla 110 `voce_giornata` ha 4 colonne nuove (`da_rivedere`, `aggiunta_da`, `testo_precedente_json`, `motivo_revisione`). Nel confronto con
`impronta.cjs` vanno escluse, come `validata` (Analisi dati, DATI-INVENTARIO.md §5). Il Collaudo confronta il diario sui soli campi di prima,
voce per voce, che dà lo stesso risultato. Con l'esclusione l'impronta del diario dopo 109–113 e utente 022–024 sulla 0533Z è `ff3033cb…`,
uguale a quella di prima.

## Cambio di commit dell'istanza
Sempre `git merge --ff-only <hash indicato dal PM>`, mai sul nome del branch: `newreview` avanza con i lotti successivi e porterebbe
migrazioni non ancora da collaudare (incidente del 2026-10-20 04:18, vedi `lotti/L2/esiti-collaudo/de67b349/LEGGIMI.md`). Prima del cambio:
server fermi, copia di BE.log e foto dei dati.

## Ciclo
1. Il tester chiede: lotto, prove, partita/aree che toccherà.
2. Collaudo: `foto` → cartella `foto/<Lx>-<etichetta>`; risponde «foto fatta, potete scrivere».
3. Il tester fa le prove e avvisa quando ha finito.
4. Collaudo: impronta «dopo le prove» (per registrare cosa è cambiato) e, per ogni tabella che cambia, le **differenze riga per riga**
   (`differenze-righe.cjs <foto> data <file.db> <tabelle>`) salvate negli esiti prima del ripristino: dopo il ripristino non si vedono più
   (aggiunto il 2026-10-20 dopo il ciclo 2 dell'anteprima, dove `area` cambiava senza che si potesse più dire quale riga); copia di `BE.log` in `lotti/<Lx>/esiti-collaudo/BE-cicloN.log`
   (`start-be.sh` lo azzera a ogni avvio), `stop-be.sh`, `ripristina`, `start-be.sh`, `/api/health`,
   impronta dopo il riavvio e `confronta` con la foto; annota tutto in `cicli-dati.md` e avvisa il tester.
Il FE (5473) resta acceso: non tocca i dati. Durante il ripristino il BE è fermo per pochi secondi.
