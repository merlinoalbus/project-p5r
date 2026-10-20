# L2 · cicli foto/ripristino dei dati dell'istanza di collaudo

Procedura: `p5s-coordinamento/collaudo/PROCEDURA-DATI.md`. Istanza su 8e75abbb. Codice identico a 75894664.

## Base
- 04:01:03 server fermi, foto `L2-prima-migr109-9634bbb5` (prima della migrazione 109).
- 04:02:46 foto `L2-base-8e75abbb` (dopo la 109): gioco.db user_version 109, 77 tabelle, 19 857 righe; partite.db user_version 21, 34 tabelle, 3 186 righe.

## Ciclo 1 — Test UX: Aggiungi area con immagine e punto, Aggiungi planimetria, Colloca, Tieni / Rimuovi dell'area dello staff; grafica spenta (solo localStorage)
- Foto `L2-ciclo1-ux`, identica alla base. «foto fatta» inviato a Test UX. In attesa della fine del blocco.
- Test UX dichiara: blocco 02:03:35Z–02:06:53Z. Area «Prova UX — Galleria» a Kichijoji con planimetria e pin 2300, seconda planimetria, rinomina, DELETE → 409 area-con-contenuti (difetto FE segnalato da loro), «Tieni» dell'Area riservata allo staff; grafica solo nel localStorage, rimessa com'era.
- 04:07:07 impronta dopo le prove contro la foto: `area` 23 → 24, `immagine` 807 → 809, `immagine_miniatura` 77 → 85, `mappa` 317 → 319, `mappa_alias` 690 → 692, `mappa_percorso` 317 → 319, `spillo` 1913 → 1914; partite.db identico. EXIT=2.
- Scritture nel BE.log (copiato in `BE-ciclo1-ux.log`):
  - 02:03:31Z `POST /api/mappe/piante-citta/kichijoji/scarica` → 400. Non è nella dichiarazione: è lo scarico automatico della pagina del quartiere, fallito per LAY-2, senza scrittura;
  - 02:04:10Z `POST /api/aree/citta/kichijoji` → 201;
  - 02:05:04Z `POST …/prova-ux-galleria/planimetrie` → 201;
  - 02:05:25Z `PUT …/prova-ux-galleria` → 200;
  - 02:05:47Z `DELETE …/prova-ux-galleria` → 409;
  - 02:06:13Z `PUT /api/aree/citta/tokyo/area-riservata-allo-staff` → 200.
- `stop-be.sh` → `ripristina foto/L2-ciclo1-ux data` → `RIPRISTINO OK`, EXIT=0 → `start-be.sh` → health ok, userVersion 109 → impronta `IDENTICHE` alla foto e alla base `L2-base-8e75abbb` (04:07:14). **Ciclo 1 chiuso.**

## Coda
1. Test funzionali, letture del giro finale di L2 (23 aree, conteggi, 113 redirect, ingresso, pagine, diario, Palazzi nel visore). Partono dopo il ripristino del ciclo 1.
1b. Test no-reg, circa 10 minuti di sola lettura: i 19 indirizzi dei 75 «Sulla mappa» e /guida/citta con la grafica accesa e spenta nel localStorage. Insieme al punto 1, perché nessuno dei due scrive; si controlla con l'impronta prima del ciclo 2.
   - Test no-reg, prima parte fatta: 02:07:54Z–02:08:54Z, solo GET, localStorage non toccato. Resta circa 1 minuto di metro a grafica spenta, dopo le letture di Test funzionali e prima del ciclo 2.
   - Test funzionali: letture finite, nessuna scrittura, Kichijoji e Santuario Meiji non aperti. Chiede la foto per il ciclo 2, che resta in attesa di Test layout e della metro di Test no-reg; via libera a Test no-reg per la metro.
   - Test no-reg, seconda parte fatta: grafica spenta 02:13:57Z, una GET di /guida/citta, preferenza rimessa vuota 02:14:12Z. Giro di Test no-reg finito.
1c. Test layout, giro finale di sola lettura: 79 pagine in iframe, 15–20 minuti, Kichijoji compreso, che fa partire da sola la POST di scarico, oggi fallita con 400. Ripartito dopo il ripristino del ciclo 1; il ciclo 2 aspetta che finisca.
   - Test layout: pagine di Kichijoji finite alle 02:14Z; restano circa 8 minuti (/guida/mappe, editor, /guida/covo, Kamoshida, Memento, due pagine de La città) fino alle 02:23Z circa. Il ciclo 2 tocca quelle pagine, quindi aspetta. Test layout ha notato la grafica spenta tra le 02:12 e le 02:14Z: era Test no-reg (02:13:57–02:14:12Z), che l'aveva concordato solo con Test funzionali; spiegato a Test layout.
3. Decisione del PM: il ciclo 2 parte direttamente su de67b349, perché su 8e75abbb «Elimina area» è rotto (UX2-8) e lo staff con «Rimuovi» non si può provare. Nuovo ordine: fine di Test layout → fast-forward a de67b349, prove, riavvio → foto → ciclo 2. Testo precedente: (dopo i punti 1c e 2) Fast-forward a de67b349: correzioni FE dei difetti del collaudo, solo src/, 17 file. Poi prove, riavvio e avviso ai quattro tester per la verifica delle correzioni e il giro breve.
   - Test layout ha finito alle 02:18:22Z: 78 viste, sola lettura, e 6 POST di scarico di Kichijoji (02:12:02–02:12:37Z, tutte 400) partite dalle sue visite. 04:18:41 impronta contro la base: cambia solo `immagine_miniatura` 77 → 84 (cache). BE.log in `BE-letture-8e75abbb.log`.
   - 04:18–04:19 incidente del Collaudo: fast-forward sul nome del branch, istanza su caf7b511 (L3) con la migrazione 110 applicata ai dati. Corretto con reset del branch locale a de67b349 e ripristino alla base `L2-base-8e75abbb`. Dettagli in `de67b349/LEGGIMI.md`.
   - 04:19:48 istanza su de67b349: nessuna migrazione, dati `IDENTICHE` alla base.

## Ciclo 2 — Test funzionali su de67b349: area di prova a Kichijoji (crea, planimetria, rinomina, riordino, etichette, elimina, ripristino dal cestino), ingresso di Kichijoji, «Tieni» e «Rimuovi» dello staff con ripristino, mappa di prova importata e «Colloca», export e import dell'area; niente partite
- 04:19:55 foto `L2-ciclo2-funzionali-de67b349`, identica alla base.
- Test funzionali dichiara: scritture fra 02:21:08 e 02:23:40Z, fine 02:24:20Z.
  - Via API: area prova-funzionali-l2 con planimetria, rinomina, riordino ed etichette, ingresso di Kichijoji, import di una planimetria sciolta, POST /api/mappe, Colloca, export e import, DELETE e ripristino dal cestino.
  - Dall'interfaccia: Elimina area (cestino 18, ripristinato), «Rimuovi» dello staff (cestino 19, ripristinato), «Tieni» dello staff.
  - Una POST di scarico di Kichijoji partita da sola dopo «Elimina area» (400). Niente partite.
- 04:24:41 impronta dopo le prove contro la foto: `area` 23 → 25, `immagine` 807 → 809, `immagine_miniatura` 77 → 83, `mappa` 317 → 321, `mappa_alias` 690 → 697, `mappa_percorso` 317 → 321, `mappa_presentazione` (contenuto), `quartiere_ingresso` 2 → 3, `spillo` 1913 → 1914; partite.db identico. EXIT=2.
- BE.log in `BE-ciclo2-funzionali.log`: 23 scritture fra 02:21:08.643Z e 02:23:23.234Z, che corrispondono alla dichiarazione. Risposte: 201/200/204, più quattro rifiuti attesi dai casi di prova (400, 404, 409, 409) e la POST di scarico con 400.
- `stop-all.sh` → `ripristina foto/L2-ciclo2-funzionali-de67b349 data` → `RIPRISTINO OK`, EXIT=0. **Ciclo 2 chiuso.**
- 04:25 cherry-pick di e9860334 → **600af81c**: diff identico all'originale (stesso sha256). Riavvio senza migrazioni; dati `IDENTICHE` alla base. Esiti in `600af81c/`.

## Ciclo 3 — Test UX su 600af81c: Aggiungi area a Kichijoji con immagine e punto (UX2-9 d), Elimina la stessa area con conferma (UX2-8), «Rimuovi» dello staff
- 04:25:20 foto `L2-ciclo3-ux-600af81c`, identica alla base.
- Test UX dichiara: 02:26:34–02:28:00Z. Area «Prova UX ciclo 3» a Kichijoji con immagine e pin 2300, DELETE con conferma (nel cestino), «Rimuovi» dello staff (nel cestino), più le POST automatiche di scarico (400). Nessun «Rimetti».
- 04:28:12 impronta dopo le prove contro la foto: `area` 23 → 22, `cestino` 0 → 2, `immagine_miniatura` 77 → 79, `mappa` 317 → 315, `mappa_alias` 690 → 686, `mappa_percorso` 317 → 315, `mappa_presentazione` 227 → 225; partite.db identico. EXIT=2.
- BE.log in `BE-ciclo3-ux.log`, 5 scritture che corrispondono alla dichiarazione:
  - 02:26:53Z scarico (400);
  - 02:26:59Z POST area (201);
  - 02:27:22Z DELETE prova-ux-ciclo-3 (204);
  - 02:27:22Z scarico (400);
  - 02:27:54Z DELETE dell'area dello staff (204).
- `stop-be.sh` → `ripristina foto/L2-ciclo3-ux-600af81c data` → `RIPRISTINO OK`, EXIT=0 → `start-be.sh` → health ok → impronta `IDENTICHE` alla base `L2-base-8e75abbb` (04:28:17). **Ciclo 3 chiuso.** Via libera alle letture di Test no-reg.

## Letture di Test no-reg su 600af81c
- Dichiarate: 02:28:55Z–02:30:10Z, solo GET (19 indirizzi dei 75 «Sulla mappa» e /guida/citta 3 volte); grafica spenta 02:29:58–02:30:10Z, dopo aver avvisato Test layout, poi rimessa vuota. Esito: 75/75, metro identica.
- 04:30:21 impronta contro la base `L2-base-8e75abbb` → `IDENTICHE`, EXIT=0. Nessuna scrittura nel BE.log dal riavvio delle 02:28:16Z. Nessun ripristino necessario.

## In coda dopo il ciclo 2
- Ciclo 3, Test UX, circa 5 minuti di scritture: Aggiungi area a Kichijoji con immagine e punto (UX2-9 d), Elimina la stessa area con conferma (UX2-8), «Rimuovi» dell'Area riservata allo staff. Grafica non spenta. Parte dopo il ripristino del ciclo 2 e una foto nuova.
- Poi Test no-reg, circa 10 minuti di sola lettura: i 19 indirizzi dei 75 «Sulla mappa» e la metro con la grafica accesa e spenta, avvisando prima chi legge. Parte dopo il ripristino del ciclo 3, perché i «Sulla mappa» aprono le pagine Area e Quartiere che il ciclo 3 modifica.
- **Nuovo ordine (PM):** ripristino del ciclo 2 → cherry-pick di e9860334, prove e riavvio → ciclo 3 di Test UX → ripristino → letture di Test no-reg. Così UX e no-reg provano una volta sola il codice finale di L2.
- Il cherry-pick, autorizzato dal PM: `git cherry-pick e9860334` su `newreview-l2` (UX2-10, LAY2-6; 5 file di src/: VisoreMappa e il suo test, CovoPage e il suo test, tailwind.css). Su `newreview` quel commit sta sopra caf7b511 (L3 BE), che non tocca i 5 file: il cherry-pick dà lo stesso contenuto. Poi prove, riavvio e avviso a Test layout e Test UX.

2. Test funzionali, ciclo 2 che scrive su un'area di prova in Kichijoji: aggiungi area e planimetria, rinomina, riordino, elimina con ripristino dal cestino, ingresso dalla finestra, «Tieni» e «Rimuovi» dello staff, «Colloca» con una planimetria di prova, carta del Covo; nessuna scrittura sulle partite. Parte dopo le letture, con una foto nuova.

## Ciclo 4 — Test UX su 2222d51f, verifica di UX2-12: «Rimuovi» dell'Area riservata allo staff (nel cestino), poi lettura del Cestino; niente «Rimetti», grafica non spenta
- 04:36:57 foto `L2-ciclo4-ux-2222d51f`, identica alla base. «foto fatta» inviato. In attesa della fine della prova.
- Test no-reg ha annunciato l'inizio delle sue letture (giro breve) mentre il ciclo 4 era aperto: gli ho chiesto di aspettare il ripristino.
- Test UX dichiara: 02:37:15–02:37:22Z, una sola scrittura (02:37:16Z «Rimuovi» dello staff, nel cestino), poi la lettura del Cestino.
- 04:37:42 impronta dopo le prove contro la foto: `area` 23 → 22, `cestino` 0 → 1, `mappa` 317 → 315, `mappa_alias` 690 → 686, `mappa_percorso` 317 → 315, `mappa_presentazione` 227 → 225. EXIT=2. BE.log in `BE-ciclo4-ux.log`: una sola scrittura, `DELETE /api/aree/citta/tokyo/area-riservata-allo-staff` → 204 alle 02:37:16.262Z, come dichiarato.
- GET registrate dalle 02:37:12 alle 02:37:28Z (58), alcune dopo la fine di Test UX: probabilmente letture di Test no-reg, che ha annunciato l'inizio durante il ciclo. Fra 02:37:16 e 02:37:47Z lo staff era nel cestino. Segnalato a Test no-reg perché ripeta le letture fatte prima del ripristino.
- `stop-be.sh` → `ripristina foto/L2-ciclo4-ux-2222d51f data` → `RIPRISTINO OK` → `start-be.sh` → health ok → impronta `IDENTICHE` alla base (04:37:47). **Ciclo 4 chiuso.**
- Correzione: Test no-reg dichiara letture fra 02:37:43 e 02:38:34Z, quindi le GET fino alle 02:37:28Z erano di Test UX (lettura del Cestino). Le letture di no-reg cadono quasi tutte dopo il ripristino (02:37:47Z): solo i primi 4 secondi coincidono con il BE fermo. Per pulizia le ripete, con la metro a grafica spenta.

## Giro breve di Test no-reg su 2222d51f
- Dichiarato: 02:40:03Z–02:41:11Z, solo GET (19 indirizzi dei 75 «Sulla mappa», /guida/citta 3 volte); grafica spenta 02:40:56–02:41:11Z con il via di Test layout, poi rimessa vuota. Esito: 75/75, metro identica.
- Impronta dopo il giro contro la base `L2-base-8e75abbb`: vedi la riga seguente; scritture nel BE.log dal riavvio delle 02:37:47Z.
- 04:41:24 impronta → `IDENTICHE`, EXIT=0; 0 scritture nel BE.log dal riavvio delle 02:37:47Z. Nessun ripristino necessario.

# Giro 2 di L2 (dopo il RIGETTATO su 5ae62692) — esiti in `lotti/L2/esiti-giro2/collaudo/`
- R5 committato: 90137ce2, solo docs/DECISIONI.md (prove in `esiti-giro2/collaudo/R5.txt`). Il codice in esecuzione resta quello di 2222d51f.

## Ciclo 5 — Test funzionali, R2: F2-30 (partita di prova «Prova funzionali L2», «raccolto» su un pin del mondo, lettura da pagina Area e visore, poi eliminazione della partita); F2-29 (rinomina dell'area seed Kichijoji › Quartiere dello shopping, poi «Ripristina»)
- 04:54:10 foto `L2g2-ciclo5-funzionali`, identica alla base, con anche `preserva.json` (impronta.cjs). BE.log fino a qui in `esiti-giro2/collaudo/BE-prima-ciclo5.log`. «foto fatta» inviato.
- In coda: ciclo 6, Test layout, R6 + R7 in un solo ciclo. R7: un'area di prova eliminata, cioè una voce `area-fisica` nel Cestino. R6: lista «Planimetrie da collocare» non vuota e finestra Colloca. Stati preparati dal tester dall'interfaccia dopo la foto; per R6, se serve, chiamata API eseguita dal Collaudo dentro il ciclo.
- Ciclo 6, aggiornamento: Test layout fa solo misure, quindi gli stati li prepara il Collaudo via API dentro il ciclo.
  - R7: POST area di prova a Kichijoji, poi DELETE con conferma.
  - R6: `mappeDaCollocare` (`areeService.ts:426`) vuole genitore città o quartiere e `area_chiave` nulla; `creaMappa` rifiuta il mondo (409 `usa-aggiungi-area`). Strada prevista: POST /api/mappe senza genitore (ammesso), poi PUT con genitore `citta-kichijoji` (in `aggiornaMappa` non si vede assegnazione dell'area). Da verificare con GET /api/aree/da-collocare.
- Ciclo 5, chiusura: 9 scritture fra 02:55:11 e 02:58:04Z, tutte corrispondenti alla dichiarazione. Impronta prima del ripristino: cambiano solo `area` e `partite.partita`. Ripristino a BE fermo, poi impronta `IDENTICHE` alla base e `impronta.cjs` identica a quella della foto (04:58:58). Dettagli in `esiti-giro2/collaudo/ciclo5.txt`. **Ciclo 5 chiuso.**

## Ciclo 6 — Test layout, R6 + R7 (stati preparati dal Collaudo via API)
- 04:59:09 foto `L2g2-ciclo6-layout`, identica alla base. BE.log precedente in `esiti-giro2/collaudo/BE-prima-ciclo6.log`.
- R7: POST area «Prova collaudo cestino» a Kichijoji (201, immagine `public/asset/ui/allerta-notte-torrida.png`), poi DELETE con conferma (204). Nel Cestino ora c'è la voce id 17, `area-fisica`.
- R6: POST /api/mappe {Planimetria di prova collaudo, luogo} senza genitore (201), poi PUT con genitore `citta-kichijoji` (200, area null). `da-collocare` passa da `[]` a 1 voce. Osservazione segnalata al PM: lo spostamento dall'editor lascia una zona del mondo senza area.
- Comandi ed esiti in `esiti-giro2/collaudo/ciclo6-stati.txt`. «stati pronti» inviato a Test layout alle 05:00.
- Test layout ha finito alle 03:03:24Z: solo misure. Colloca aperto 7 volte e chiuso con Annulla, nel Cestino niente «Rimetti» né «Elimina per sempre».
- 05:03:51 impronta dopo le prove contro la foto: `cestino` 0 → 1, `immagine_miniatura` 77 → 78, `mappa` 317 → 318, `mappa_alias` 690 → 691, `mappa_percorso` 317 → 318. Le uniche scritture nel BE.log sono le 4 chiamate del Collaudo per preparare gli stati.
- `stop-be.sh` → `ripristina foto/L2g2-ciclo6-layout data` → `RIPRISTINO OK` → `start-be.sh` → health ok → impronta `IDENTICHE` alla base; `da-collocare` e cestino tornati `[]` (05:03:58). Dettagli in `esiti-giro2/collaudo/ciclo6.txt`. **Ciclo 6 chiuso.** FUN2-8 aperto in `difetti.md`.

## Ciclo 7 — Test funzionali, casi di L2 da provare dal vivo
- Prove previste:
  - F2-11: POST /api/mappe sotto la radice di un Palazzo (201), poi DELETE e voce tolta dal cestino;
  - F2-22: «Ingresso» di Shinjuku dall'interfaccia, poi ingresso tolto;
  - F2-31(b): partita di prova al 05-10, «Sulla mappa» dal diario, poi partita 1 attiva e partita di prova eliminata.
- 05:05:06 foto `L2g2-ciclo7-funzionali`, identica alla base, con `preserva.json`. BE.log precedente in `esiti-giro2/collaudo/BE-prima-ciclo7.log`. «foto fatta» inviato.
- Test funzionali dichiara: fine 03:08:13Z, scritture dalle 03:06:48 alle 03:08:10Z, con le impronte loro (gioco.db identico, partite.db diverso solo in `partita.updated_at`).
- 05:08:29 impronta contro la foto: cambia solo `partite.db.partita`; gioco.db identico, anche dopo la creazione e cancellazione della mappa e la voce tolta dal cestino. EXIT=2.
- BE.log, 9 scritture, tutte quelle dichiarate:
  - F2-11: POST /api/mappe 201 e 409, DELETE della mappa 204, DELETE cestino/17 204;
  - F2-22: PUT e DELETE dell'ingresso di Shinjuku;
  - F2-31b: POST partita 201, partita 1 attiva, DELETE partita 3.
  L'ultima è alle 03:08:12.2Z, contro le 03:08:10 dichiarate: differenza di orologio, fine dichiarata alle 03:08:13.
- `stop-be.sh` → `ripristina foto/L2g2-ciclo7-funzionali data` → `RIPRISTINO OK` → `start-be.sh` → health ok → impronta `IDENTICHE` alla base, lavoro da preservare identico (05:08:35). Dettagli in `esiti-giro2/collaudo/ciclo7.txt`. **Ciclo 7 chiuso.**
- Via del PM per il ciclo 8 di Test funzionali: finestre «Aggiungi area» e «Aggiungi planimetria» dall'interfaccia, export e import di tutto il mondo (R2-11). La foto si fa alla loro richiesta. Dopo i cherry-pick di FE e BE servirà un altro ciclo per «Colloca» e F2-02.

## Ciclo 8 — Test funzionali: «Aggiungi area» e «Aggiungi planimetria» dall'interfaccia su Shinjuku; export di tutto il mondo (`radice=tokyo`) e reimport con sovrascrivi (R2-11); niente partite
- 05:10 foto `L2g2-ciclo8-funzionali`, identica alla base, con `preserva.json`. BE.log precedente in `esiti-giro2/collaudo/BE-prima-ciclo8.log`. «foto fatta» inviato, con il suggerimento di fare l'import prima delle finestre.
- Test funzionali dichiara: fine 03:14:10Z. Export `radice=tokyo` (61 MB) e import con sovrascrivi (54 mappe, 298 spilli, 22 immagini); area «Prova funzionali L2 finestra» a Shinjuku (pin 2598) e la sua seconda planimetria.
- 05:14:25 impronta dopo le prove contro la foto: `area` 23 → 24, `immagine` 807 → 809, `immagine_miniatura` 77 → 75, `mappa` 317 → 319, `mappa_alias` 690 → 692, **`mappa_entita` 134 → 157**, `mappa_percorso` 317 → 319, `quartiere_ingresso` (contenuto), `spillo` 1913 → 1914, `spillo_destinazione` (contenuto); partite.db identico. `impronta.cjs` già identica prima del ripristino: il lavoro da preservare non è toccato dall'import del mondo.
- BE.log, 3 scritture:
  - 03:10:49Z `POST /api/mappe/importa` 200;
  - 03:13:23Z `POST /api/aree/citta/shinjuku` 201;
  - 03:13:58Z `POST …/planimetrie` 201 (dentro la fine dichiarata).
- `stop-be.sh` → `ripristina foto/L2g2-ciclo8-funzionali data` → `RIPRISTINO OK` → `start-be.sh` → health ok → impronta `IDENTICHE` alla base, lavoro da preservare identico (05:14:32). Dettagli in `esiti-giro2/collaudo/ciclo8.txt`. **Ciclo 8 chiuso.**
- Valutazione di Test funzionali sulle differenze dell'import (annotata in F2-12 di `funzionali.md`), tutte note e nessun difetto nuovo:
  - `quartiere_ingresso`: identico per chiave. La mia impronta segue l'ordine delle righe (rowid) e l'import le reinserisce;
  - `spillo_destinazione`: segue la rinumerazione dei pin, nota da L1 e assegnata a L3;
  - `mappa_entita` +23: legame mappa del quartiere ↔ quartiere, dichiarato all'import (L1 no-reg, L3);
  - `immagine_miniatura` 77 → 75: cache della 108.
- 06:33 cherry-pick delle correzioni del giro 2 (1cd41876, b6f3dd9a, b0ebdad0, c43b8bc0, fcff89e3) a server fermi: **conflitto al primo** (1cd41876, `server/openapi/descrizioni/mappe.ts`), perché il commit è scritto sopra il codice di L3. `git cherry-pick --abort`, checkout pulito su 90137ce2, server riavviati, dati `IDENTICHE` alla base. Riportato al PM, con la proposta che BE e FE rifacciano i commit sul codice di rilascio. Dettaglio in `esiti-giro2/collaudo/cherry-pick-conflitto.txt`.
- Strada decisa dal PM per le correzioni BE del giro 2:
  1. BE prepara in `esiti-giro2/be/rilascio/` le modifiche esatte (testo vecchio → nuovo) calcolate su 90137ce2, solo righe di L2.
  2. Il Collaudo le applica con Edit alla lettera; se un testo vecchio non corrisponde si ferma e lo segnala a BE.
  3. Typecheck, lint, test mirati indicati da BE, impronta; commit «fix(L2): giro 2 — R1, R2-28, FUN2-8, FUN2-9 parte BE (preparato da BE sul codice di rilascio)».
  4. Cherry-pick di b0ebdad0, c43b8bc0, fcff89e3 (FE); se uno va in conflitto, stessa procedura con FE.
  5. Riavvio, hash al PM, cicli di Test funzionali e Test layout.
  a1def232 non serve (R5 identico a 90137ce2). In attesa dell'avviso di BE.

# Nuova base dalla produzione (richiesta dell'utente, 2026-10-20 06:40)
- Copia della produzione in `p5s-coordinamento/dati-produzione/2026-10-20-0440Z/`, installata sull'istanza a server fermi; i dati di prima sono in `data/backups/collaudo-prima-di-prod-*`. Migrazioni 107-109 all'avvio.
- **Nuova base: `L2-base-prod-20261020`** (gioco 109/77/19 857, partite 21/34/3 212), con `preserva.json` identico alla copia di produzione. Da qui in poi ogni ciclo si confronta con questa base. Esiti in `dati-prod-20261020/`.

# Giro 2 — commit finale f19a117f (07:16)
- Modifiche BE (`esiti-giro2/be/rilascio/`) applicate alla lettera → 5fd97d9f. Cherry-pick FE b0ebdad0, c43b8bc0, fcff89e3 (base identica, contenuto identico) → 4e6119a6, 98e3cc1c, **f19a117f**. Typecheck, lint e Vitest mirati 127/127 verdi. Esiti in `esiti-giro2/collaudo/f19a117f/`.
- Riavvio: nessuna migrazione, dati `IDENTICHE` alla base `L2-base-p5s-20261020-0503Z`; R1 dal vivo (staff `daVerificare=true`); `da-collocare` vuoto. Con FUN2-8 l'editor non crea più una «da collocare»: per FUN2-9 e «Colloca» dall'interfaccia lo stato si prepara in un ciclo (UPDATE come nel test FUN2-9 di BE), su richiesta dei tester.
- Hash mandato a Test funzionali, Test layout e Test no-reg (07:17).

## Ciclo 9 (giro 2, f19a117f) — Test funzionali (FUN2-8, FUN2-9, «Colloca» confermato) e Test layout («Colloca» chiuso con Annulla, ai tre formati)
- F2-02 già verificato da Test funzionali in sola lettura (indice: «Area riservata allo staff · 2 versioni · 0 pin · Da verificare»; `da-collocare` vuoto).
- Stato da preparare dal Collaudo dopo la misura di R1 di Test layout: `nativo-rmap-001-3-0`, l'unica planimetria di Central Street (genitore `citta-shibuya`, 24 pin), tolta dalla sua Area con lo stesso UPDATE del test FUN2-9 di BE (predefinita dell'Area a NULL; `area_chiave`, `versione_ordine`, `versione_etichetta` a NULL).
- Ordine: foto e stato → Test funzionali FUN2-8 e FUN2-9 (finestra aperta) e Test layout («Colloca» con Annulla) → per ultimo «Colloca» confermato da Test funzionali → ripristino.
- 05:19Z Test no-reg comincia il giro breve §4-octies su 5473 (75 «Sulla mappa» e metro, solo GET). Il ciclo 9 aspetta anche la sua fine, perché lo stato toglie la planimetria di Central Street.
- Test no-reg ha finito alle 05:20:31Z, solo GET. Esito dichiarato del giro breve su f19a117f: **VERDE**. Impronte del codice uguali; 6 file FE identici; dati 108 → 109; API con R1 come unica differenza; Vitest 11 file 167/167; metro e 75/75 «Sulla mappa». Dettagli in `noreg.md` §4-novies.
- 05:21:08Z foto `L2g2-ciclo9-funzionali-layout` (con `preserva.json`), dopo il «R1 finito» di Test layout e la fine di Test no-reg. BE fermo, poi `stato-ciclo9.cjs` (copia in `esiti-giro2/collaudo/`): lo stesso UPDATE del test FUN2-9 di BE su `nativo-rmap-001-3-0`; BE riavviato. `da-collocare` → `[{shibuya-central-street, genitore: "shibuya", 24 pin}]`. Rispetto alla foto cambiano solo `area` e `mappa` (contenuto). «stato pronto» inviato a Test layout e Test funzionali.
- Test layout: «finito» alle 05:22:38Z, nessuna scrittura («Colloca» chiuso sempre con Annulla, `da-collocare` invariata). Passa a Test funzionali e aspetta il ripristino per tornare alla base «prima» di L5 su 5473.
- Test funzionali ha finito: scritture dalle 05:22:48 alle 05:24:44Z. Esiti dichiarati: FUN2-8 ✅ (409 da API e da editor), FUN2-9 ✅, «Colloca» confermato ✅ (Central Street rimessa nella sua Area, predefinita, 24 pin), F2-02 ✅ in sola lettura.
- 05:25:20 impronta dopo le prove contro la foto: `immagine_miniatura` 88 → 91 e `mappa` (contenuto, per «Colloca»). BE.log: 7 scritture, tutte quelle dichiarate (`esiti-giro2/collaudo/ciclo9.txt`, `BE-ciclo9.log`).
- `ripristina` → `RIPRISTINO OK`; dopo il riavvio impronta `IDENTICHE` alla foto, e contro la base p5s solo `immagine_miniatura` (cache delle letture); lavoro da preservare identico; `da-collocare` vuota (05:25:28). **Ciclo 9 chiuso.**
- Riprove del giro 2 su f19a117f: Test no-reg VERDE, Test funzionali ✅; Test layout: «finito» senza scritture, esito di R1 e FUN2-9 chiesto (05:25).
- Test layout su f19a117f: FUN2-9 **verde** (`esiti-giro2/layout/FUN2-9-esito.md`); R1 verde per quanto c'è sul commit (chip nell'«Elenco completo»), ma **aperto** per la decisione del PM: chip «1 da verificare» sulla carta di Tokyo, che FE deve ancora fare (`esiti-giro2/layout/R1-esito.md`). La riga della ROADMAP e l'hash al validatore aspettano quel commit; PM e FE avvisati.
- Decisione del PM: niente validatore su f19a117f, perché R1 rischierebbe un altro RIGETTATO. Si aspetta il chip di FE, dopo UX3-6. Sequenza:
  1. cherry-pick, o modifiche alla lettera;
  2. typecheck, lint e test mirati;
  3. rimisura di R1 da parte di Test layout;
  4. giro breve di no-reg sui soli file toccati;
  5. riga della ROADMAP con l'hash finale, poi l'hash al PM.
- 05:37 il collaudo passa alla base **p5s-2026-10-20-0533Z** (planimetria di prova dell'utente sotto Kamoshida): solo la 109 all'avvio, lavoro da preservare identico, foto `L2-base-p5s-20261020-0533Z` (`esiti-collaudo/dati-p5s-20261020-0533Z/`).
- 05:38 cherry-pick del chip R1 di FE (a7fe0aee, base identica, contenuto identico) → **25012240**. Typecheck e lint verdi, Vitest mirati 6 file 151/151, impronta 9634bbb5..HEAD `4ec3badc…9d29`; riavvio senza migrazioni, dati `IDENTICHE` alla base 0533Z (`esiti-giro2/collaudo/25012240/`). Hash a Test layout (rimisura di R1) e a Test no-reg (giro breve sui file toccati).
- Test layout, R1 su 25012240: **verde** (~05:55Z, solo letture). Il chip «1 da verificare» sulla carta di Tokyo misura 96×44 a tutte le misure e porta all'area dello staff; carta alta 86, indice a 1024×690 622/622 (`esiti-giro2/layout/R1-esito.md`). Aperto **LAY2-7** (bassa, non bloccante): i conteggi della carta di Tokyo si troncano in «Città · …» a 1280 e 1366.
- Test no-reg: giro breve su 25012240 in corso dalle ~05:40Z (solo GET). È l'ultima riprova prima della riga della ROADMAP.
- Test no-reg, giro breve su 25012240: **VERDE** (05:40:02–05:41:09Z, solo GET; 146/146, 75/75, metro identica; `noreg.md` §4-decies). Dati del collaudo dopo le letture identici alla base 0533Z, nessuna scrittura.
- **Riga della ROADMAP** da `docs-giro2.md` → commit **62547532** (solo docs/ROADMAP.md). Segnaposto riempiti con 5fd97d9f e con i Vitest «167/167 su f19a117f e 146/146 sul commit finale». Due integrazioni dichiarate al PM: a7fe0aee fra i commit FE (chip «1 da verificare») e la base «0503Z, poi 0533Z». Output in `esiti-giro2/collaudo/docs/git.txt`. **Hash 625475322b745489e5da1a9b674b5fa7b77e795b al PM per il validatore (giro 2)** e ai tre tester.
- Decisione del **Manager**, che dal 2026-10-20 coordina il team: prima del validatore si correggono anche LAY2-7, E4, E5 ed E7 (carta di Tokyo ed «Elenco completo», `lotti/L2/analisi-elenco-mappe.md`). FE ha mandato 126168a0 (LAY2-7, solo MappaPage.tsx, base identica al rilascio); per E4, E5 ed E7 ho chiesto a FE se sono dentro. Il cherry-pick andrà sopra 62547532, poi un nuovo commit della riga ROADMAP; le riprove si fanno sul commit finale.
