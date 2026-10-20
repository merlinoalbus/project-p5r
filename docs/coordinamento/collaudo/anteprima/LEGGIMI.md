# Istanza di ANTEPRIMA del Collaudo — BE http://localhost:3302, FE http://localhost:5474

Decisione del PM (~05:05Z): il 3201 è l'istanza di lavoro di BE e FE e si riavvia a ogni salvataggio. Le prove dei tester sul lavoro in
corso (L3, L4) si fanno qui. Le gestisce il Collaudo, con le stesse regole dell'istanza di collaudo 3301/5473: le prove che scrivono
passano da una foto e da un ripristino (`collaudo/PROCEDURA-DATI.md`).

## Istantanea attuale — 2026-10-20 04:55:01 UTC
- **Codice:** copia dei file della cartella di lavoro di pensive (`pensive-burnell-b50941`, HEAD `fcff89e3`) **con tutto il lavoro non
  committato di L3 e L4** (98 file modificati, cancellati o nuovi secondo `git status`), esclusi `node_modules`, `data`, `.git`, log e `.env`.
  Si trova nello scratchpad della sessione Collaudo (`…/scratchpad/anteprima/codice`). `node_modules` è una copia di quelli dell'istanza di
  collaudo: `package.json` e `package-lock.json` sono identici a quelli di pensive.
- **Impronta del codice:** sha256 dell'elenco ordinato degli sha256 di `server/ shared/ src/ scripts/ pacchetto/ vite.config.ts index.html
  package.json` (990 file) = **`d14f40cfdef24f8b351e3df6bb079c54622dda9821ef4e7430b9bd850999ff83`**. Elenco in
  `istantanea-20261020T0455Z-file-sha256.txt`. Ricontrollata subito dopo su pensive: era cambiato un solo file, di test
  (`server/routes/avanzamento-unico.test.ts`), che non conta per l'esecuzione (`istantanea-vs-pensive-dopo-la-copia.txt`).
- **Dati:** copia della produzione `dati-produzione/2026-10-20-0440Z` (sha256 verificati). All'avvio si applicano:

| Migrazione | Esito (log in `BE-avvio-20261020T0455Z.log`) |
|---|---|
| 107 | 1 mappa (`yongen-java-banchina-della-metropolitana` → planimetria nativa) |
| 108 | applicata |
| 109 Aree del mondo | aree 23, planimetrie 29, etichette 9, ingressi 2, da verificare 1, senza area 0, covo spostato 5 |
| 110 Aree dei Palazzi | aree 117, planimetrie 245, etichette 203, legami 105 (da regola 0: la coppia del pin 777 l'ha dichiarata l'utente), proposte 102, corrette 6, segnalate 1, nuove 1, senza area 0 |
| 111 Carattere delle voci (L4) | conteggi per Palazzo (descrittiva/permanente/rigenerabile/senza), es. Madarame 44/101/82, Kamoshida 49/71/47/2 |
| utente 022 Divergenze da verificare | 4 divergenze, 4 pin (partita 1, Kamoshida) |
| utente 023 Stato del pin per infiltrazione | 40 pin condivisi, 90 righe, nessuna incoerenza |

- `/api/health` → ok, **userVersion 111**; FE 200.
- **Foto della base:** `anteprima-base-20261020T0455Z` (gioco 111/80/20 182, partite 23/36/3 306).
- **Lavoro da preservare** (`impronta.cjs` contro la copia di produzione): diario 255 voci, **identico nei campi di prima**; si aggiungono solo
  le 4 colonne nuove di L3 (`da_rivedere`, `aggiunta_da`, `testo_precedente_json`, `motivo_revisione`). Kamoshida e Madarame: voci, pin e stati
  dei pin identici. Spunte 342 identiche.

## Aggiornamento
Quando BE o FE avvisano che un pezzo è pronto: nuova istantanea, nuova impronta e riavvio. I dati restano quelli dell'anteprima, salvo
richiesta: per le prove che scrivono servono foto e ripristino. Il 3201 e la cartella di pensive non si toccano.

## Cicli dei dati sull'anteprima
Strumento: `collaudo-dati.cjs` con `PORTA_BE=3302` per il controllo «BE fermo» del ripristino (provato: rifiuta se 3302 è in ascolto).
- **Ciclo 1 — Test funzionali, prove di L3 che scrivono:** F3-19…F3-27, diario «Conferma/Modifica/Entra/Da rivedere», correzioni BE
  §3.6.1 (`area-si-svuota`, `gia-area-a-se`, `/stanza`), import con `idCambiati`. Foto `anteprima-ciclo1-funzionali-L3` alle 05:00:32Z;
  rispetto alla base cambia solo `immagine_miniatura` 68 → 69 (cache); `preserva.json` salvato. BE.log precedente in
  `BE-prima-ciclo1.log`. Avvisati Test UX e Test layout. In attesa della fine.
  - Test layout: serie R3-41 (solo letture) partita alle ~05:02Z, sovrapposta al ciclo 1. La tiene come prova e rimisura la base dopo il «ripristinato».
  - **Chiuso alle 05:09Z** (dettaglio in `ciclo1.txt`, BE.log in `BE-ciclo1.log`). Scritture dalle 05:03:37 alle 05:08:43Z: aree, planimetrie e infiltrazione di prova su Okumura, legami, cestino, diario, partite di prova id 3. Il lavoro da preservare è rimasto identico anche prima del ripristino. `ripristina` con `PORTA_BE=3302` → `RIPRISTINO OK`.

## Base dei dati dal 2026-10-20 05:09Z: copia di p5s `dati-produzione/p5s-2026-10-20-0503Z` (decisione dell'utente: la fonte è p5s)
- Installata al posto del riavvio sulla foto del ciclo 1; i dati di prima sono in `data/backups/anteprima-prima-di-p5s-*`. Il codice è invariato (istantanea delle 04:55:01Z).
- Migrazioni all'avvio (la 107 e la 108 erano già applicate su p5s), log in `BE-avvio-base-p5s.log`:
  - 109: 23 aree e 29 planimetrie;
  - 110: 117 aree, 245 planimetrie, 105 legami, 102 proposte;
  - 111;
  - utente 022: **0 divergenze**, contro le 4 di Kamoshida sulla 0440Z, risolte dall'utente;
  - utente 023: 40 pin condivisi.
- Health userVersion 111. Nuova foto della base: `anteprima-base-p5s-20261020-0503Z`.
- Lavoro da preservare contro la copia di p5s: diario identico nei campi di prima; Kamoshida e Madarame identici per voci, pin, stati delle voci e stati dei pin; spunte 342 identiche (`base-p5s.txt`).

## Istantanea 2 — 2026-10-20 05:23:40 UTC (richiesta di BE: L4 pronto da provare)
- Codice: pensive con HEAD `2f9e6c7f` (L3 committato: casa unica dei Palazzi, AP3-3) più il lavoro non committato di L4:
  - migrazione 112 `voce_boss_finale`;
  - «Modifica › Boss finale» e «Ripristina»;
  - AP4-1 (niente `concluso` per i Memento);
  - il test della 023.
  Stesso metodo della prima istantanea (`tar` senza `node_modules`, `data`, `.git`, log e `.env`); `node_modules` e `data` spostati dalla cartella di prima, che resta in `anteprima/codice-istantanea-1`. Dipendenze identiche.
- **Impronta del codice:** `880498824cbe456d77c1e078358fed110c451356526f6a005500f57e7bbf9b88` (996 file, elenco in
  `istantanea-2-20261020T0523Z-file-sha256.txt`). Ricontrollata su pensive subito dopo la copia: identica.
- Dati: quelli dell'anteprima, cioè la base p5s-0503Z già a 111. La foto prima del cambio (`anteprima-prima-istantanea-2`) va presa a server fermi
  dalla cartella giusta: il primo tentativo era partito dalla cartella sbagliata e non aveva trovato `better-sqlite3`. Rifatta prima dell'avvio, **IDENTICHE** alla base.
- Avvio (`BE-avvio-istantanea-2.log`):
  - **112** applicata: tutte e 8 le voci del boss finale impostate, `mancanti: {}`;
  - nessun errore;
  - userVersion **112**.
  Rispetto alla foto cambia solo la tabella `dungeon` (più lo schema).
- Foto della base: `anteprima-base-istantanea-2`. Lavoro da preservare identico alla copia di p5s.
- Dal vivo, partita 1: **Kamoshida 71/71, concluso e completato**; **Madarame 82/82, concluso e completato**
  (`GET /api/compendio/dungeon/<k>?partita=1`).
- **Ciclo 2 — Test UX, gestione di L3 (U6) su Madarame, solo dati di prova:** aggiungi area con immagine collegata all'infiltrazione aperta, aggiungi planimetria, aggiungi infiltrazione con «Aree toccate», modifica aree, elimina area e infiltrazione di prova fino al cestino. Foto `anteprima-ciclo2-ux-L3`, con `preserva.json`; BE.log precedente in `BE-prima-ciclo2.log`. In attesa della fine.
  - **Chiuso alle 05:31Z** (`ciclo2.txt`, `BE-ciclo2.log`). 6 scritture dalle 05:27:13 alle 05:30:33Z, tutte quelle dichiarate. Prima del ripristino, contro la foto: `cestino` 0 → 2, `immagine_miniatura` 68 → 70 e **`area` con contenuto diverso a parità di righe** (140), segnalato a Test UX. Lavoro da preservare identico. `ripristina` → `RIPRISTINO OK`, dopo il riavvio identico alla base `anteprima-base-istantanea-2`.
- **Ciclo 3 — Test funzionali, P3 di L3:** partita di prova al 04-15 attiva, arrivo di /guida/mondo/dungeon/kamoshida, poi partita 1 attiva e prova eliminata; scritture solo in partite.db. Foto `anteprima-ciclo3-funzionali-P3` con `preserva.json`. In attesa della fine.
- **Ciclo 3 chiuso alle 05:35:38Z** (`ciclo3.txt`, `BE-ciclo3.log`): 3 scritture solo in partite.db (POST partita, partita 1 attiva, DELETE partita 3); prima del ripristino cambiava solo `partita.updated_at` della partita 1. `RIPRISTINO OK`.

## Istantanea 3 — commit b83c30ac (L4 committato da BE, via del PM), base p5s-2026-10-20-0533Z (05:36Z)
- Codice: `git archive b83c30ac` (L4 sopra d1664295 UX3-1 e 2f9e6c7f di L3), verificato con gli hash git: 981 file di server/ shared/ src/ scripts/ pacchetto/
  identici al commit. Impronta della cartella `cb345f4c…72a8` (`istantanea-3-b83c30ac-file-sha256.txt`). `node_modules` riusato (dipendenze identiche).
- Dati: copia fresca **p5s-2026-10-20-0533Z** (con la planimetria di prova dell'utente); i dati dell'istantanea 2 sono in `anteprima/dati-istantanea-2`.
- Avvio (`BE-avvio-istantanea-3.log`), nessun errore, userVersion 112:
  - 109: 23 aree e 29 planimetrie;
  - **110: 118 aree e 246 planimetrie**, una in più per la planimetria di prova dell'utente, che diventa l'Area `dungeon/kamoshida/prova`; legami 105 (0 da regola), proposte 102;
  - 111;
  - 112: 8 voci impostate, mancanti {};
  - utente 022: 0 divergenze;
  - utente 023: 40 pin condivisi.
- Foto della base `anteprima-base-istantanea-3`; lavoro da preservare identico alla copia di p5s. Partita 1: Kamoshida 71/71 e Madarame 82/82, conclusi e completati.
- **Ciclo 4 — Analisi app, AP4-2 (casi d'errore del boss finale):** foto `anteprima-ciclo4-analisi-AP4-2`, con `preserva.json`. In attesa della fine.
- In coda dopo il ciclo 4: **ciclo 5 di Test funzionali**, con il residuo di «Elimina area» su Okumura (riga di `area` cambiata, come nel ciclo 2 di UX) e la base «prima» di L6 (partita di prova alle 6 date, solo GET). Da fare su b83c30ac **senza L6**: l'anteprima non si aggiorna a L6 finché il ciclo non è chiuso.
- In coda, prima del ciclo 5: **istantanea 4 su 71378325** (correzioni di L4: gioco 113 `dungeon.regola_boss`, utente 024 con ON DELETE CASCADE), richiesta da BE; sulla stessa base dell'anteprima.
- L'istantanea 4 passa a **12484305** (L3 O3-1: l'export di un Palazzo porta anche le aree senza planimetrie con i loro legami), sopra 71378325 e b83c30ac (BE, ~05:46Z). Resta senza L6, come chiede Test funzionali.
- **Ciclo 4 chiuso alle 05:43:07Z** (`ciclo4.txt`): 5 richieste d'errore di Analisi app (400, 400, 404, 400, 409). Prima del ripristino cambiava solo la cache delle miniature, nessuna tabella di gioco o di partita: AP4-2 confermato senza scritture. `RIPRISTINO OK`.

## Istantanea 4 — commit 12484305 (L3 O3-1, sopra 71378325 correzioni di L4, a7fe0aee, b83c30ac) — 05:43Z
- Codice: `git archive 12484305`, verificato con gli hash git: 985 file identici al commit (`istantanea-4-12484305-hash-git.txt`). Dipendenze invariate.
- Dati: quelli dell'anteprima (base p5s-0533Z già a 112); foto `anteprima-prima-istantanea-4` identica alla base dell'istantanea 3.
- Avvio (`BE-avvio-istantanea-4.log`), nessun errore, userVersion 113/24:
  - **113**: regola del boss, Iweleth con la regola dei Memento (`memento: ["iweleth"]`);
  - **utente 024**: cascata sulla partita, `spillo_partita_infiltrazione` 90 righe copiate e 0 orfane tolte, `divergenza_partita` 0.
- Rispetto alla foto cambiano solo `dungeon` (113) e `spillo_partita_infiltrazione`. Per quest'ultima il contenuto ordinato per tutte le colonne è **identico**: cambia solo l'ordine fisico (rowid) dopo la ricostruzione della tabella.
- Foto `anteprima-base-istantanea-4`; lavoro da preservare identico alla copia di p5s. Partita 1: Kamoshida 71/71 e Madarame 82/82, conclusi e completati con la regola `voce-finale`; Iweleth con la regola `memento`, 0/29.
- **Ciclo 5 — Test funzionali:** residuo di «Elimina area» su Okumura e base «prima» di L6 (partita di prova alle 6 date). Foto `anteprima-ciclo5-funzionali`, con `preserva.json`. In attesa della fine. Dopo: ciclo 6 per O3-1 (export e import di Okumura con un'area vuota).
  - **Chiuso alle 05:46:13Z** (`ciclo5.txt` con le differenze riga per riga, `BE-ciclo5.log`). 18 scritture fra 05:44:28 e 05:45:20Z: residuo, O3-1 (export e import di Okumura) e base «prima» di L6. Lavoro da preservare identico anche prima del ripristino. Residuo di «Elimina area»: solo `area.updated_at` di `dungeon/okumura/caserma`, scritto da «Modifica aree» (come trovato da Test funzionali). `mappa_entita`: 0 righe diverse per chiave, solo l'ordine dopo l'import. `RIPRISTINO OK`, identico alla base dell'istantanea 4. Il ciclo 6 (O3-1) non serve: l'ha fatto Test funzionali in questo ciclo.
