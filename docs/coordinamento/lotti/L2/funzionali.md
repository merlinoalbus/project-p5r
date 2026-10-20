# L2 «Mondo: aree e planimetrie» — test funzionali

Stato: **casi preparati, basi «prima» prese; esecuzione a pezzi**: si prova ogni pezzo appena BE o FE lo segnalano.
- **Ambiente:** cartella di sviluppo, BE 3201, FE 5373. Il giro finale si fa sul commit congelato del lotto (processo.md, «BE e FE non si
  fermano per i test»).
- **Fonti:** `requisiti.md` (R2-01…R2-42, criteri F; UX, NR e L sono di altri ruoli), `modifiche.md` §2.2 (conteggi attesi), §3 (API), §4
  (pagine) e §6.3 (piano funzionale), `dati.md` §1–§3.
- **Prove grezze** in `lotti/L2/esiti-funzionali/`.

## Basi «prima» (prese il 2026-10-20, `esiti-funzionali/base-prima/`)
- **Quando sono state prese:** con `data/` già allo schema **109**: la migrazione si è applicata al riavvio del BE mentre lo script
  partiva. Il codice dei servizi era quello di prima di L2: niente `casa` nelle risposte, `risolvi` restituisce `{tipo:'mappa', mappa}`.
- **`diario-sulla-mappa-prima.json`:** il diario 04-01..06-01 della partita 1, letto con `GET /api/compendio/percorso/<data>?partita=1`, in
  sola lettura. 254 voci, **75 con `mappa`**:
  - 63 sul mondo;
  - 12 su Palazzi e Memento: il piano ne dice 10 + 2, la classificazione per dominio va ricontrollata.
  
  Per ogni voce sono annotati uid, giorno, chiave, spillo e chiave pubblica.
- **`indirizzi-mondo-prima.json`:** 166 indirizzi delle mappe del mondo (29 zone, 23 quartieri, Tokyo): 53 chiavi pubbliche e 113 alias, fra
  cui le pubbliche ripetute come alias, da togliere nel confronto. Per ognuno c'è la risoluzione di prima, e da qui si ricava l'atteso «dopo».
  Trappola del Sottopasso confermata:
  - `shibuya-sottopasso`, `shibuya-sottopasso-01` e `shibuya-sottopasso-speciale` portano a `001-2-1`;
  - `shibuya-sottopasso-1` e `shibuya-sottopasso-inquadratura-orientale` portano a `001-2-0`.
- **Da prendere prima del primo pezzo FE:** il DOM di oggi delle sette strade verso Shibuya (S1–S7 di app.md §3) e il DOM di
  `/guida/citta/shibuya`, per il confronto prima/dopo di R2-15.

## Dati e partite di prova
- **Partita di prova:** `Prova funzionali L2`, da creare all'inizio dei casi che scrivono stati di partita (R2-30) e da eliminare alla fine.
  Prima di crearla va verificato che la creazione non cambi la partita attiva; se la cambia, si ripristina subito l'attiva = 1.
  Non si scrive mai sulla partita 1 «Partita Roberto» né sulla 2 «Tutorial».
- **Dati di gioco di prova:**
  - un'area di prova `prova-funzionali-l2` in Kichijoji, il quartiere con una sola area e nessun passaggio, che non intralcia le aree vere;
  - un'immagine PNG per le planimetrie, presa dall'asset `mappe/citta-kichijoji` letto via GET.
  
  Alla fine si elimina e si toglie dal cestino.
- **Controllo delle scritture:** impronte di `gioco.db` e `partite.db` (`L1/esiti-funzionali/impronta-db.cjs`) prima e dopo ogni giro di
  scritture; le uniche differenze ammesse sono quelle della prova, e a pulizia fatta nessuna. Le righe di BE.log della finestra si copiano in
  `esiti-funzionali/`.
- **Area «da collocare» (R2-27):** dopo la 109 lo staff è un'area di Tokyo e la lista è vuota. Per provare «Colloca» serve una planimetria
  sciolta: va creata come **mappa di prova importata** (l'import resta ammesso, §2.3), e su quella si prova «Colloca». Non si usa lo staff.

## Casi (atteso dai documenti; esito e prova grezza si compilano all'esecuzione)
| id | Criterio | Passi | Atteso |
|---|---|---|---|
| F2-01 | R2-01 | `GET /api/compendio/citta/shibuya` | `aree`: 6 `AreaRiassuntoDto` ordinate (Piazza della stazione, Sottopasso, Central Street, Centro comm. sotterraneo, Tornello della linea Ginza, Banchina della metropolitana) con `chiave citta/shibuya/<slug>`, `predefinita`, `illustrazione` |
| F2-02 | R2-01b | `/guida/citta` sezione «Aree della città»; `GET /api/aree/citta/tokyo/area-riservata-allo-staff` | area con `contenitore.tipo='citta'`, `daVerificare: true`, chip «Da verificare» nella pagina dell'area e nell'indice, 2 versioni (`150-3-0` «porzione occidentale», predefinita; `150-3-1` «planimetria completa»). «Tieni» (`PUT {daVerificare:false}`) e «Rimuovi» (cestino) da provare **solo** con il ripristino del valore e il confronto delle impronte |
| F2-03 | R2-02 | albero + DB (sola lettura) | 29 planimetrie con `area_chiave`, 0 zone del mondo senza area, `GET /api/aree/da-collocare` = `[]` |
| F2-04 | R2-03 | per ognuna delle 23 aree | ≥1 planimetria; `predefinita` appartiene all'area |
| F2-05 | R2-04 | Sottopasso, Covo, staff | 9 etichette (Sottopasso 2, Covo 5, staff 2), nell'ordine di oggi (`versione_ordine` = ordine del gruppo) |
| F2-06 | R2-05 | pagina `/guida/citta/shibuya` + API | 6 aree; Sottopasso con 2 versioni |
| F2-07 | R2-06 | elenco del quartiere, indice `/guida/mappe`, ricerca | «Sottopasso Speciale» non è un'area in nessuno dei tre; c'è solo come versione «planimetria completa» del Sottopasso |
| F2-08 | R2-07 | `GET /api/aree/citta/yongen-jaya/covo-dei-ladri` | area di Yongen-Jaya (ordine 200), 5 versioni nell'ordine settore d'ingresso / planimetria completa / porzione occidentale / porzione settentrionale / inquadratura orientale; il Covo non è più una radice dell'indice; carta «Sfide e Medaglie P del Covo» → `/guida/covo`, e in `/guida/covo` la carta «Planimetrie del Covo» porta all'area |
| F2-09 | R2-08 | BE.log riga «migrazione applicata» id 109; `user_version` 109; test della 109 (`npx vitest run server/db/migrations/109_aree_del_mondo.test.ts`) | applicata una volta, idempotente (test) |
| F2-10 | R2-09 | lettura del codice indicata in app.md + API | il quartiere di un'area si legge da `area.quartiere_chiave` (`contenitore`) |
| F2-11 | R2-10 | riavvio del BE (solo se avviene da sé) e `POST /api/mappe` sotto `citta-kichijoji` di tipo `luogo` | dopo un riavvio, 23 aree, nessuna duplicata; POST → **409** `usa-aggiungi-area`; sotto un Palazzo → 201 (subito eliminata) |
| F2-12 | R2-11 | `GET /api/mappe/esporta` della radice di prova; import su… | **solo** con l'area di prova, `sovrascrivi`: stesse aree, versioni e predefinita. L'export e l'import di tutto il mondo non si fanno sui dati condivisi |
| F2-13 | R2-12 | DOM di `/guida/citta/shibuya` | intestazione con l'illustrazione L1; illustrazione del quartiere con i pin delle aree (passaggi 1630–1632); elenco «Aree» con miniature (`sizes="96px"`); luoghi filtrabili come oggi; azioni «Entra: Central Street», «Ingresso», «Aggiungi area» |
| F2-14 | R2-13 | DOM di `/guida/citta/shibuya/sottopasso` | briciole «La città › Shibuya › Sottopasso», visore sulla predefinita `001-2-0`, segmenti delle versioni, «Luoghi qui», «Aree vicine» |
| F2-15 | R2-14 | clic sul segmento «planimetria completa» | cambia solo `?planimetria=…` (`replace`); il percorso resta `/guida/citta/shibuya/sottopasso`; avviso «Su questa planimetria non ci sono pin…» con il pulsante per tornare |
| F2-16 | R2-15 | le sette strade S1–S7 (app.md §3): metro, piastrella de La città, indice, accesso al mondo, Oggi, briciole, schede (negozio, attività, libro, «scheda del quartiere» del visore) | tutte su `/guida/citta/shibuya` tranne S5, che scende sul posto dentro Oggi con il centro. S1 apre in più la finestra dell'area d'ingresso sul punto 38.29/32.67 zoom 1 (Shibuya) e 37.46/25.14 zoom 1 (Yongen-Jaya). Chiusa la finestra, `ingresso` si toglie dalla query e l'indietro non la riapre. Kichijoji dalla metro: nessuna finestra. Tabella prima/dopo per strada |
| F2-17 | R2-16 | verso Central Street: carta dell'area, pin 1631, passaggio 1501, «Dove si trova» di un luogo di Central Street, indice, briciole | tutte su `/guida/citta/shibuya/central-street` |
| F2-18 | R2-17 | briciole e «‹ Shibuya» dalla pagina Area | risalgono Area → Quartiere → Città |
| F2-19 | R2-18 | per ognuno dei 166 indirizzi in `indirizzi-mondo-prima.json`: `GET /api/mappe/risolvi/<k>` (campo `casa`) e redirect dell'FE (`/guida/mappe/<k>` in iframe, `location.pathname+search` d'arrivo) | quartiere → `/guida/citta/<q>`; zona → `/guida/citta/<q>/<slug>`, con `?planimetria=<pubblica>` se non è la predefinita. `shibuya-sottopasso` → Sottopasso con la versione «planimetria completa». `covo-dei-ladri` → area del Covo con `022-1-1`. `tokyo` → `/guida/citta`. Nessun 404, nessun giro di redirect. Script di confronto da scrivere sul formato della `casa` quando BE la espone |
| F2-20 | R2-19 | i 70 passaggi del mondo (pin `riferimento_tipo='mappa'`) | `DettaglioSpilloDto.casa` = casa della destinazione; clic nel visore → pagina dell'area |
| F2-21 | R2-20 | dalla pagina Area «Modifica planimetria» → editor → «Chiudi»/«Torna» | l'editor si apre sulla versione mostrata; il ritorno porta alla casa |
| F2-22 | R2-21 | finestra «Ingresso» di Shibuya: passo 1 area, passo 2 punto, «Annulla» | finestra `Modal`, elenco delle 6 aree; **nessun salvataggio sui quartieri veri**. Il salvataggio si prova sull'area di prova di Kichijoji (che non ha ingresso), poi «Togli l'ingresso», con il confronto delle impronte |
| F2-23 | R2-22 | `GET /api/compendio/citta/shibuya` e `/yongen-jaya` → `ingresso` | Shibuya → Central Street 38.29/32.67/1 e Yongen-Jaya → Vicoli 37.46/25.14/1, identici a `dati.md` §1.7, con `area` valorizzata; «Entra: Central Street» apre la finestra su quel punto (`puntoIniziale`) |
| F2-24 | R2-23 | «Aggiungi area» in Kichijoji: nome «Prova funzionali L2», PNG, punto 50/50 | 201 + `AreaDettaglioDto`; la carta compare nell'elenco e il pin sull'illustrazione senza ricaricare il browser; indice aggiornato. Errori: nome vuoto o immagine non valida → 400 e **nulla scritto** (impronta invariata); slug riservato `nuova` → 400; seconda «Prova funzionali L2» → slug `-2` |
| F2-25 | R2-24 | «Aggiungi planimetria» sull'area di prova, con etichetta «seconda» e «predefinita» | versione in coda, ruolo `planimetria-nativa` (non chiesto), predefinita cambiata |
| F2-26 | R2-25 | rinomina dell'area di prova, riordino delle aree di Kichijoji, cambio della predefinita | lo slug e l'indirizzo non cambiano; il nome nuovo si vede nell'elenco, nelle briciole, nell'indice e nella ricerca; il riordino si fa **solo** fra l'area di prova e quella vera di Kichijoji, poi si rimette l'ordine di prima |
| F2-27 | R2-26 | eliminazione della planimetria (l'ultima → 409 `ultima-planimetria`); eliminazione dell'area con pin → 409 `area-con-contenuti` con il riepilogo; con la conferma → cestino `area-fisica`; ripristino dal cestino | dopo il ripristino tornano area, planimetrie, pin, passaggio, predefinita e ordine come prima; poi eliminazione definitiva e voce del cestino tolta |
| F2-28 | R2-27 | «Nuova mappa» nell'editor di una planimetria del mondo; `POST /api/mappe` (F2-11); «Planimetrie da collocare» con la mappa di prova importata → «Colloca» nell'area di prova | «Nuova mappa» assente nel mondo e presente nei Palazzi; «Colloca» sposta il genitore sotto `citta-kichijoji` e la mette in coda alle versioni |
| F2-29 | R2-28 | rinomina di un'area `seed`: si sceglie **l'area di Kichijoji `quartiere-dello-shopping`**, unica del suo quartiere, e si rimette subito; poi `POST …/ripristina` | prima correzione → `seed_json`; `ripristina` → valori della guida e `seed_json` NULL; su un'area `utente` → 409. Con impronte prima e dopo |
| F2-30 | R2-30 (parte funzionale) | partita di prova: segno «raccolto» su un pin del mondo prima e dopo la navigazione nuova | lo stato si legge uguale dalla pagina Area e dal visore |
| F2-31 | R2-31 (parte funzionale) | per le 75 voci di `diario-sulla-mappa-prima.json`: (a) `/guida/percorso/<data>`, clic su «Sulla mappa» (o la navigazione `/guida/mappe/<k>?spillo=<id>`); (b) «Oggi» (`MappaIncorporata`) | (a) 63 voci del mondo → `/guida/citta/<q>/<slug>[?planimetria=…]&spillo=<id>`, con lo spillo selezionato e centrato; 12 di Palazzi e Memento → visore come prima. (b) stessa planimetria e stesso spillo. Esito voce per voce |
| F2-32 | R2-33 (parte funzionale) | `/guida/dungeon/mementos`, `GET /api/mappe/risolvi/citta-mementos` | nessuna area; `casa` resta `/guida/mappe/…` |
| F2-33 | Vitest mirati | §6.1 e §6.2 di modifiche.md, per i file pronti | verdi, output grezzo |

## Esiti a pezzi
### Pezzo 1 — migrazione 109 (BE, 2026-10-20)
- **F2-03 / F2-04 / F2-05 / F2-08 (parte dati) / F2-09: ✅** (`esiti-funzionali/pezzo-109-db.txt`, DB in sola lettura):
  - `user_version` 109; BE.log riga 15956 «migrazione applicata» id 109, preceduta dal riepilogo
    `{"aree":23,"planimetrie":29,"etichette":9,"ingressi":2,"daVerificare":1,"senzaArea":0,"covoSpostato":5,"cestinoRicopiato":0}`;
  - aree 23: Shibuya 6, Shujin 8, Yongen-Jaya 3, cinque quartieri con 1 area ciascuno, Tokyo 1 (staff `dv=1`). Ogni predefinita appartiene
    alla sua area;
  - planimetrie con area 29, con etichetta 9; aree con più versioni 3 (Sottopasso, Covo, staff), con le etichette nell'ordine dei gruppi;
  - zone del mondo senza area 0; aree dei Palazzi 0;
  - il Covo ha genitore `citta-yongen-jaya`, ordine d'area 200; lo staff resta sotto `tokyo` con la sua area;
  - ingressi 2, con `area_chiave` Vicoli e Central Street e x/y/zoom identici;
  - cestino con il CHECK `'area-fisica'`, 0 righe, contatore 20 conservato; indici presenti;
  - test `109_aree_del_mondo.test.ts` 2/2, EXIT=0 (`vitest-109.txt`).
  - **Nota UX** (non è un difetto, la regola è quella del §2.1.4): a Shujin «Banchina Aoyama Itchome» ha ordine 100, fra il 1P e il 2P,
    perché ha lo stesso `mappa.ordine` 0 del 1P e lo spareggio è per chiave.
- **Ingresso e import con ingressi (Kichijoji, poi tolto):**
  - la PUT col corpo `{mappa}` scrive l'area dedotta ✅. La GET risponde senza il campo `area`: arriva coi prossimi pezzi;
  - l'import di un pacchetto con il solo ingresso scrive l'area ✅; con `sovrascrivi` la sostituisce ✅;
  - **FUN2-1**: una planimetria di un altro quartiere è accettata ❌;
  - **FUN2-2**: l'import risincronizza i percorsi e rinomina quelli del Covo ❌.
  
  Prove in `pezzo-109-ingresso.txt`, `pezzo-109-ingresso-impronte.txt` e `pezzo-109-ingresso-BE.log`. Impronte: `partite.db` senza
  differenze; `gioco.db` diverso solo in `mappa_alias` e `mappa_percorso`, per FUN2-2. Gli ingressi sono tornati a 2.
- **Non ancora provabili:** il corpo nuovo `{area}` dà 400 (non è ancora annunciato); le API `/api/aree`, la `casa` e le pagine arrivano
  coi prossimi pezzi.

### Difetti del pezzo 1 riprovati (2026-10-20)
- **FUN2-1 verificato:** ingressi di altri quartieri rifiutati, sia con la PUT sia con l'import.
- **FUN2-2 verificato:** i percorsi del Covo restano fissi dopo gli import.

Impronte prima e dopo senza differenze (`fun2-verifica*.txt`).

### Pezzo 2 — rotte `/api/aree` e `casa` (BE, 2026-10-20): per ora solo letture (`esiti-funzionali/pezzo-aree-letture.txt`)
- **F2-01 ✅** Shibuya ha 6 aree in ordine 0–500, ciascuna con slug, predefinita, numero di planimetrie e di pin e passaggio. I passaggi
  sono 1632 (Piazza), 1631 (Central Street) e 1630 (Banchina); il Sottopasso e altre due aree non ne hanno. `casa` = `/guida/citta/shibuya/<slug>`.
  L'ingresso porta `area: {slug: central-street}`. L'elenco dei quartieri ha il numero di aree: yongen-jaya 3, shibuya 6, shujin-academy 8,
  e 1 ciascuno per shinjuku, kichijoji, akihabara, kanda-jinbocho e odaiba.
- **F2-02 (letture) ✅** Lo staff ha `contenitore {tipo: 'citta', chiave: 'tokyo'}`, `daVerificare: true` e 2 versioni (porzione
  occidentale predefinita, planimetria completa) con 0 pin. «Tieni» e «Rimuovi» non sono ancora provati: scrivono sui dati veri.
- **F2-03 ✅** `GET /api/aree/da-collocare` → `[]`.
- **F2-05 / F2-06 (API) ✅** Il Sottopasso ha 2 versioni: «inquadratura orientale» (predefinita, 16 pin) e «planimetria completa» (0 pin).
  `elementi` 2, `vicine` 4.
- **F2-08 (API) ✅** Il Covo è un'area di Yongen-Jaya con ordine 200 e 5 versioni nell'ordine atteso (pin 3, 15, 3, 1, 5); predefinita
  il settore d'ingresso.
- **Errori ✅** Slug inesistente → 404 `area-non-trovata`; quartiere inesistente → 404 `quartiere-non-trovato`.
- **F2-19 (API) ✅** I 113 indirizzi distinti di `indirizzi-mondo-prima.json` hanno tutti una `casa` di città, quartiere o area:
  66 portano a un'area, 46 a un quartiere, 1 alla città; nessuno a `/guida/mappe` né in errore (`f2-19-case.tsv`).
  - Trappola del Sottopasso: `shibuya-sottopasso`, `-01` e `-speciale` → `…/sottopasso?planimetria=shibuya-sottopasso-speciale`;
    `-1` e `-inquadratura-orientale` → `…/sottopasso`.
  - `covo-dei-ladri` → `…/covo-dei-ladri?planimetria=covo-dei-ladri`.
  - `tokyo` → `/guida/citta`.
  - Il redirect dell'interfaccia si prova quando arriva il pezzo FE.
- **Scritture** (aree di prova in Kichijoji, `esiti-funzionali/pezzo-aree-scritture.txt`, `pezzo-aree-impronte.txt`, `pezzo-aree-BE.log`):
  - **F2-24 ✅ / ❌ FUN2-3.**
    - Creazione con nome, punto 40/60 ed etichetta: 201 e `AreaDettaglioDto`, con il pin di passaggio 2300 (`passaggio`,
      riferimento alla planimetria) sull'illustrazione di Kichijoji; l'elenco del quartiere la mostra subito.
    - Stesso nome → slug `-2`, `-3`.
    - Errori: nome vuoto → 400; «Nuova» → 400 `slug-riservato`; `x` senza `y` → 400.
    - **Corpo non immagine → 201** (FUN2-3).
  - **F2-25 ✅** Planimetria in più con «predefinita»: in coda (ordine 1), ruolo `planimetria-nativa`, diventa la predefinita.
  - **F2-26 ✅** La rinomina lascia slug e indirizzo invariati (`nomeRivisto: true`); la predefinita torna alla prima; una predefinita di
    un'altra area → 400 `planimetria-di-altra-area`; il riordino al contrario e quello di ritorno danno ordini 0–300 corretti; le etichette
    delle versioni si cambiano.
  - **F2-27 ✅** (testo ❌ FUN2-4)
    - Ultima planimetria → 409 `ultima-planimetria`.
    - Area con contenuti → 409 `area-con-contenuti` con il riepilogo `{planimetrie: 2, pin: 0, passaggi: 1, ingresso: false, elementi: 0}`.
    - Con la conferma → 204 e cestino `area-fisica` (immagini, alias, percorsi, planimetrie, area).
    - **Ripristino** → tornano nome, ordine 200, predefinita, passaggio 2300 al punto 40/60, 2 versioni con le etichette.
  - **F2-11 ✅** `POST /api/mappe` sotto `citta-kichijoji` → 409 `usa-aggiungi-area`.
  - **F2-28/F2-29 (parte provata) ✅** «Ripristina» su un'area `utente` → 409 `area-dell-utente`. La rinomina di un'area `seed` e il suo
    ripristino non sono provati, per non toccare un'area vera.
  - **Pulizia:** tutte le aree di prova eliminate e tolte dal cestino (vuoto prima e dopo); pin sull'illustrazione 0 → 0; `partite.db`
    senza differenze. In `gioco.db` restano cambiati **solo due `updated_at`**, con i valori di prima:
    - `area` `citta/kichijoji/quartiere-dello-shopping`, per il riordino (ordine rimesso a 0);
    - `mappa` `citta-kichijoji`, per il pin di passaggio dell'area di prova, poi eliminato.
- **Ancora da provare:** «Tieni» e «Rimuovi» dello staff, «Colloca», l'ingresso dalla finestra, export e import con `aree`, l'etichetta nella
  ricerca dei riferimenti, e tutte le pagine (pezzo FE).

### Pezzo 3 — FUN2-3, FUN2-4 corretti; export/import con `aree`; ricerca dei riferimenti (BE completo, 2026-10-20)
Prove grezze in `esiti-funzionali/fun34-verifica.txt` e `fun34-impronte.txt`; script `l2-fun34.cjs`.
- **FUN2-3 verificato:** un contenuto non immagine è rifiutato con 400 `formato-non-ammesso` da ogni strada provata (creazione dell'area,
  aggiungi planimetria, PUT generica, editor, da-url) senza scrivere nulla. Un PNG dichiarato JPEG si salva come PNG.
- **FUN2-4 verificato:** singolare e plurale giusti. **FUN2-5 aperto** (bassa): il testo dice «da un’altra mappa».
- **F2-12 (R2-11) ✅**
  - `GET /api/mappe/esporta?radice=citta-kichijoji` porta `aree` (chiave, slug, ordine, predefinita), con `area` e `versione` per mappa.
  - Prova: si cambia un'etichetta dell'area di prova, poi si importa con `sovrascrivi` il pacchetto ridotto alla sola area di prova.
    Versioni, etichette, ordine e predefinita tornano come nel pacchetto.
  - L'import di tutto il mondo non è provato sui dati condivisi.
- **Ricerca dei riferimenti ✅** `GET /api/mappe/riferimenti?tipo=mappa&q=sottopasso` → «Shibuya › Sottopasso · inquadratura orientale»,
  «Shibuya › Sottopasso · planimetria completa».
- **Pulizia:** area di prova eliminata e tolta dal cestino; `partite.db` senza differenze. In `gioco.db` sono cambiati due elementi:
  - l'`updated_at` di `citta-kichijoji`, per il pin di passaggio dell'area di prova;
  - 5 righe nuove in `immagine_miniatura`, miniature create dalle letture delle immagini (lo stesso effetto che ha notato il Collaudo).

### Pezzo 4 — FE (5373 contro 3201, 2026-10-20): letture nel browser
Prove grezze in `esiti-funzionali/f2-19-redirect-fe.tsv` e `pezzo-fe-pagine.txt`.
- **F2-19 (R2-18) ✅** Tutti i 113 indirizzi vecchi distinti, aperti come `/guida/mappe/<k>?x=10&y=20&zoom=2`:
  - percorso d'arrivo uguale alla casa, e `?planimetria=` giusto (trappola del Sottopasso compresa): 113/113;
  - punto conservato: 112/113. L'eccezione è `tokyo` → `/guida/citta`, che non ha un visore (atteso);
  - nessuna pagina d'arrivo «non trovata».
- **F2-16 (R2-15) ✅ in parte.** Metro → `/guida/citta/<q>?ingresso=1`; schede → `/guida/citta/<q>`; accesso al mondo →
  `/guida/citta/shibuya`; briciole → `/guida/citta/shibuya`. Mancano l'indice per aree, le schede di negozi e attività e «Oggi» (S5).
- **F2-23 (R2-22) ✅** `?ingresso=1` apre la finestra:
  - Shibuya: «Central Street — ingresso di Shibuya», con «Apri l'area» → `…/central-street?x=38.29&y=32.67&zoom=1`;
  - Yongen-Jaya: «Vicoli — ingresso di Yongen-Jaya», 37.46/25.14/1;
  - «Chiudi» toglie il parametro;
  - senza parametro, o per Kichijoji (senza ingresso), nessuna finestra.
- **F2-13 (R2-12) ✅** Azioni «Entra: Central Street», «Ingresso», «Aggiungi area», «Riordina», «Segna sull'illustrazione». Sei aree,
  senza «Sottopasso Speciale» (R2-06 ✅); illustrazione con i pin di passaggio.
- **F2-14 / F2-15 / F2-18 (R2-13, R2-14, R2-17) ✅** Briciole «La città › Shibuya»; versioni con i conteggi; visore sulla predefinita.
  Il clic sulla versione cambia solo `?planimetria=` (replace, `history.length` invariato) e mostra l'avviso della versione senza pin.
  ❌ **FUN2-6** (bassa): nel pannello del visore il titolo «Aree vicine» compare due volte.
- **F2-08 (parte FE) ✅** La metro manda il Covo a `/guida/covo` con il testo «dal menu di gioco, dal 6/5»; «soffitta» non compare.
- **Vocabolario (R2-39):** nelle pagine Quartiere e Area la parola «mappa» non compare.
- **F2-31 (R2-31) ✅** 16 destinazioni distinte per le 63 voci del mondo. Tutte arrivano sulla casa giusta con lo spillo selezionato
  (popup aperto sul pin giusto). Il pin 1656 di passaggio mostra il nome della meta, come previsto dal §4.6. Palazzi e Memento restano
  nel visore.
- **Ancora da provare** (FE non ancora pronto o casi che scrivono): La città («Aree della città», «Planimetrie da collocare»), carta del
  Covo in CovoPage, indice per aree, editor, «Oggi», le finestre che scrivono (Aggiungi area, Ingresso, Modifica, Elimina) dall'interfaccia.

### Pezzo 5 — FE: FUN2-6, editor, indice (5373 contro 3201, 2026-10-20)
- **FUN2-6 verificato:** «Aree vicine» compare una volta sola.
- **F2-21 (R2-20) ✅** «Chiudi» e «Apri il visore» dell'editor portano alla casa:
  - `shibuya-sottopasso-speciale` → `/guida/citta/shibuya/sottopasso?planimetria=shibuya-sottopasso-speciale`;
  - `shibuya-central-street` → `/guida/citta/shibuya/central-street`;
  - `shibuya` → `/guida/citta/shibuya`;
  - `tokyo` → `/guida/citta`.
- **F2-28 (R2-27, parte dell'editor) ✅** Nell'editor del mondo (Tokyo, quartiere, planimetrie con area) «Nuova mappa» e «Crea mappa
  collegata» non ci sono: c'è «Aggiungi area / planimetria dalla pagina del quartiere» → `/guida/citta/shibuya` (per Tokyo → `/guida/citta`).
  Nei Palazzi «Nuova mappa figlia di …» resta. Per le planimetrie con area il modulo non mostra tipo né genitore.
- **Indice ✅ / ❌ FUN2-7** (bassa). Sotto Tokyo le aree sono voci uniche con il link alla casa: «Covo dei Ladri · 5 versioni · 27 pin»,
  «Sottopasso · 2 versioni · 16 pin». Il gruppo però si chiama «Aree e planimetrie (7)», non «Aree di …», e conta le planimetrie.
- **Nota:** dalle 03:3x il 3201 ha la 110 e la casa L3 dei Palazzi (FUN3-1, L3). Per decisione del PM il giro finale di L2, Palazzi
  compresi, si fa sul Collaudo, sul commit congelato `8e75abbb`. I risultati di L2 sui Palazzi ottenuti sul 3201 prima delle 03:3x
  (R2-31: Palazzi e Memento nel visore) si rifanno lì.

### Giro finale sul Collaudo (3301/5473, commit 8e75abbb, base L2-base-8e75abbb, 2026-10-20) — letture
Prove grezze in `esiti-funzionali/collaudo-8e75abbb/` (`db-109.txt`, `aree-letture.txt`, `f2-19-case.tsv`).
- **DB e API ✅** Stessi conteggi del §2.2 dello sviluppo:
  - 23 aree (Shibuya 6, Shujin 8, Yongen-Jaya 3, cinque quartieri con 1 area, Tokyo 1);
  - 29 planimetrie, 9 etichette, 3 aree con versioni, 0 zone senza area;
  - ingressi con l'area, 690 alias e 317 percorsi;
  - cestino col tipo nuovo, 0 righe, contatore 16.
  
  Le 113 case (`f2-19-case.tsv`) e l'intera uscita delle letture sono **identiche** a quelle dello sviluppo (diff vuoto).
- **Redirect R2-18 ✅** 109 indirizzi dal browser: percorso e versione giusti 109/109, nessuna «non trovata», punto conservato 108/109
  (Tokyo, atteso). I 4 indirizzi di Kichijoji e del Santuario Meiji non li ho aperti nel browser, perché la pagina tenta lo scarico: la loro
  casa da `risolvi` è giusta.
- **R2-15 / R2-22 ✅**
  - Metro → `?ingresso=1`; Covo → `/guida/covo` con il titolo «dal menu di gioco, dal 6/5».
  - Finestra d'ingresso di Shibuya (Central Street, 38.29/32.67/1) e di Yongen-Jaya (Vicoli, 37.46/25.14/1); «Chiudi» toglie il parametro.
- **R2-12 / R2-13 / R2-14 / R2-17 ✅**
  - Shibuya: 6 aree, azioni, nessuna «mappa» nel testo.
  - Sottopasso: briciole, versioni con `aria-pressed`, visore sulla predefinita; il clic sulla versione cambia solo `?planimetria=` con
    replace e mostra l'avviso.
  - «Aree vicine» compare una volta sola (FUN2-6 confermato).
- **Indice ✅** Covo «5 versioni · 27 pin» e Sottopasso «2 versioni · 16 pin», con il link alla casa. FUN2-7 è corretto in `de67b349`:
  lo verifico lì.
- **Editor ✅** «Chiudi»: Sottopasso Speciale → `…/sottopasso?planimetria=shibuya-sottopasso-speciale`; Shibuya → `/guida/citta/shibuya`;
  Kamoshida → visore del Palazzo. «Nuova mappa» assente nel mondo e presente nel Palazzo.
- **R2-31 ✅** 15 destinazioni su 19 aprono il pin; Palazzi e Memento restano nel visore.
  - Le altre 4 (1656, 1616 di Shujin; 1588 Café Leblanc; 1517 Untouchable) sono pin **bloccati** per la partita attiva del collaudo
    (06-01, giorno): «solo l'11 aprile», «solo dal 12 aprile al 2 maggio», «solo di sera», «solo giovedì, sabato e domenica».
  - Il visore non apre un pin bloccato da un indirizzo, per una regola che c'è dal 2026-09-07 (commit `d6c9cb63`, «i bloccati non si
    riaprono»): **come prima di L2**, quindi non è un difetto. In sviluppo si aprivano solo per lo stato diverso del FE di sviluppo.
- **Ciclo che scrive:** fatto sul commit `de67b349`, vedi la sezione seguente.

### Giro finale sul Collaudo — ciclo che scrive (commit de67b349, foto L2-ciclo2-funzionali-de67b349, 2026-10-20 02:21–02:24Z)
Prove grezze in `esiti-funzionali/collaudo-de67b349/`: `ciclo2-api.txt`, `ciclo2-interfaccia.txt`, `ciclo2-elimina-da-interfaccia.txt`,
`ciclo2-staff.txt`. Il ripristino dei dati alla foto è del Collaudo.
- **F2-24 / F2-25 / F2-26 ✅**
  - Area di prova in Kichijoji con il pin di passaggio; un corpo non immagine → 400.
  - Planimetria in più come predefinita; rinomina con lo slug invariato; riordino; etichette delle versioni.
- **F2-22 ✅** Ingresso di Kichijoji col corpo nuovo `{area}` → 200 con `area`; con l'area di un altro quartiere → 404.
- **F2-27 ✅**
  - Senza conferma → 409; il riepilogo cita anche l'ingresso: «… 2 planimetrie, 0 pin e 1 passaggio che porta qui, ed è l'ingresso del
    quartiere».
  - Con la conferma il cestino porta via area, planimetrie, passaggio e ingresso; il ripristino rimette tutto, ingresso compreso.
- **UX2-8 (R2-26) ✅ verificato:** «Elimina area» dall'interfaccia manda una sola `DELETE …?conferma=1` → 204. La finestra dice prima cosa
  porta via; dopo si torna al quartiere.
- **F2-02 ✅**
  - Dalla pagina La città, «Rimuovi» dello staff → `DELETE …?conferma=1` → 204, la sezione sparisce, e dal cestino si rimette.
  - «Tieni» → `PUT {daVerificare:false}` → 200, e scompaiono il segno «Da verificare» e i pulsanti.
- **F2-28 (R2-27) ✅ con una precisazione.** Una planimetria importata sotto Kichijoji riceve sempre un'area, anche con `aree: []` nel
  pacchetto. È la regola «nessuna zona del mondo resta senza area» (R2-10), che impedisce di creare una «da collocare». Quindi:
  - nei dati reali `da-collocare` è sempre `[]` e la sezione «Planimetrie da collocare» non compare;
  - «Colloca» l'ho provato via API con una mappa di prova senza genitore: entra in coda alle versioni con la sua etichetta e il genitore
    passa sotto `citta-kichijoji`;
  - un secondo «Colloca» dà 409 `planimetria-gia-collocata`.
  
  **Da segnalare al PM:** «Colloca» dall'interfaccia resta irraggiungibile finché non esiste una planimetria del mondo senza area.
- **F2-12 ✅** Export e import dell'area di prova con `sovrascrivi`: versioni ed etichette tornano come nel pacchetto.
- **FUN2-7 ✅ verificato:** «Aree di Yongen-Jaya (3)», «Aree di Shibuya (6)»…; il Covo è una sola voce.
- **Nota:** dopo «Elimina area» il ritorno a `/guida/citta/kichijoji` fa partire da solo lo scarico della pianta (400, LAY-2, nessuna
  scrittura).
- **Ripristino del Collaudo:** il Collaudo ha confermato 23 scritture nel BE.log fra le 02:21:08 e le 02:23:23Z, tutte quelle dichiarate.
  Dopo il ripristino l'impronta è identica alla foto. L'istanza è poi passata a `600af81c` (cherry-pick di `e9860334`), con i dati della
  base di L2.

### Ultime letture sul Collaudo (600af81c, dati di base, 2026-10-20)
- **F2-08 (Covo, punto A) ✅** In `/guida/covo` la carta «Planimetrie del Covo · un'area di Yongen-Jaya» porta a
  `/guida/citta/yongen-jaya/covo-dei-ladri`. Nell'area del Covo la carta «Sfide e Medaglie P del Covo» porta a `/guida/covo`: una visibile
  (183×44, sia a 1280 sia a 375), l'altra nascosta.
- **F2-16 S7 (schede) ✅** Dalla scheda di Untouchable (`/guida/negozi/untouchable`):
  - «Untouchable» → `/guida/citta/shibuya#luogo-shibuya-untouchable`;
  - «Shibuya» → `/guida/citta/shibuya`;
  - «Apri sull'atlante» → `/guida/mappe/shibuya-central-street?spillo=1517`, che il redirect porta a
    `/guida/citta/shibuya/central-street?spillo=1517`.
  
  Il testo «atlante» non è «mappa», ma è un nome del visore vecchio: lo segnalo a UX per il vocabolario.

## Chiusura della fase (2026-10-20)
**L2 · funzionali FATTA** (riaperta per il giro 2 del validatore: R2 e R4, vedi sotto).
- **Difetti funzionali:** FUN2-1…FUN2-7 tutti verificati e chiusi. **UX2-8** è verificato anche per l'invio.

**Copertura caso per caso** (riscritta per R4 del giro 1: prima diceva «F2-01…F2-31 coperti», e non era vero per tutti). Legenda:
- **Vivo** = provato da me nell'app (API e/o browser), con le prove grezze qui sopra;
- **Test** = coperto solo da un test automatico di BE o FE, non da me;
- **No** = non provato.

| Caso | Copertura | Cosa è provato e cosa manca |
|---|---|---|
| F2-01 (R2-01) | Vivo | API delle 6 aree di Shibuya, sviluppo e collaudo |
| F2-02 (R2-01b) | **Vivo (giro 2, f19a117f)** | API dello staff (`daVerificare`, 2 versioni); in La città il segno «Da verificare», «Rimuovi» e «Tieni» dall'interfaccia, con cestino e ripristino (ciclo 2). Su f19a117f (R1 sulla linea di rilascio), sola lettura: il segno **nell'indice** (Tokyo › «Area riservata allo staff · 2 versioni · 0 pin · Da verificare») e **nella pagina dell'Area** dello staff (sezione «Ciclo 9») |
| F2-03 / F2-04 / F2-05 | Vivo | DB in sola lettura e API, sviluppo e collaudo |
| F2-06 (R2-06) | **Vivo (giro 2)** | Elenco del quartiere e indice: solo come versione. Ricerche che esistono oggi: quella delle destinazioni dell'editor («speciale» → solo «Shibuya › Sottopasso · planimetria completa») e «Cerca uno spillo» del visore («sottopasso» → solo «Sottopasso»); «speciale» assente dalle pagine. Una ricerca globale nell'app non c'è: è di L11 (piano, riga 424), quindi non è provabile in L2 (`esiti-giro2/funzionali/residui-letture.txt`) |
| F2-07 (R2-07) / F2-08 | Vivo | API, indice, carte del Covo nei due sensi, metro |
| F2-09 (R2-08) | Vivo | BE.log, `user_version`, test della 109 |
| F2-10 (R2-09) | **Lettura del codice (giro 2)** | Nel codice di rilascio (`90137ce2`) nessun lettore ricava il quartiere di un'Area o di una sua planimetria da `mappa.entita_*`: quel quartiere si legge da `area.quartiere_chiave` (`casaMappa.ts:73-76`, `areeService.ts:145`). `entita_*` resta letto solo per la mappa del quartiere stesso (`casaMappa.ts:72`, previsto da modifiche §1.1), per i Palazzi (L3) e per un filtro sui Memento. È una proprietà del codice, non un comportamento visibile: dal vivo le due fonti oggi coincidono e una prova non direbbe di più. Che ogni Area porti al quartiere giusto è provato da F2-19 e F2-01 (dettaglio in `residui-letture.txt`) |
| F2-11 (R2-10) | **Vivo (giro 2)** | `POST /api/mappe` nel mondo → 409 `usa-aggiungi-area`; sotto la radice di un Palazzo (`palazzo-di-okumura`) → 201, poi eliminata e tolta dal cestino (ciclo 7 del Collaudo). Dopo i riavvii del BE le aree restano 23 |
| F2-12 (R2-11) | **Vivo (giro 2)** | Export e import dell'area di prova, con `sovrascrivi`. **Tutto il mondo** sul Collaudo (ciclo 8): export della radice `tokyo` (61 MB; 54 mappe, 23 aree, 2 ingressi, 22 immagini) e reimport con `sovrascrivi`. Prima e dopo sono **identici**: aree (23, tutte le colonne salvo `updated_at`), aree e versioni delle planimetrie (`area_chiave`, `versione_ordine`, `versione_etichetta`), predefinite, ingressi, 317 percorsi pubblici, 690 alias. Il round trip però riscrive anche campi che R2-11 non nomina, tutti comportamenti **già noti prima di L2** (no-reg di L1 §5) e assegnati dal PM a L3: 142 righe `origine` da `seed` a `utente`, i 298 pin con `id` nuovi (stesso `uid`), 30 `condizioni_json` da `[]` a `null`, e `nome_rivisto` da 1 a 0 su Sottopasso, Sottopasso Speciale e Banchina Aoyama Itchome. L'asset di Aoyama diventa `null` (F9 di L1: quell'asset non esiste). L'impronta completa del Collaudo (ciclo 8, `esiti-giro2/collaudo/ciclo8.txt`) mostra in più quattro differenze, nessuna nuova di L2:
- `quartiere_ingresso`: il contenuto per chiave è identico nel mio confronto, e l'impronta del Collaudo segue l'ordine delle righe, che l'import riscrive reinserendole;
- `spillo_destinazione`, 223 righe: seguono gli `id` nuovi dei pin;
- `mappa_entita` +23: 23 sono le mappe dei quartieri, per cui l'import dichiara il legame mappa del quartiere ↔ quartiere (no-reg di L1: «più legami dichiarati»; il legame che §1.1 tiene, che non dà il quartiere alle Aree, quindi R2-09 non è toccato);
- `immagine_miniatura` da 77 a 75: le miniature delle immagini salvate si cancellano e si rigenerano (108).

Le prime tre sono comportamenti dell'import assegnati a L3. Prove: `esiti-giro2/funzionali/r2-11-esito.txt`, `r2-11-differenze.txt`, `r2-11/` |
| F2-13 / F2-14 / F2-15 | Vivo | DOM della pagina Quartiere e della pagina Area, clic sulla versione |
| F2-16 (R2-15) | **Vivo (giro 2)** | Metro, piastrelle, accesso al mondo, briciole, scheda di un negozio; **S5 «Oggi»**: un clic su Shibuya nella metro di «Oggi» resta su `/partita` e apre sul posto la planimetria d'ingresso (Central Street), spostata sul punto |
| F2-17 (R2-16) | **Vivo (giro 2)** | Carte delle aree, indice, briciole, redirect delle planimetrie; il **pin 1631** sull'illustrazione di Shibuya → «Vai: Central Street» → `/guida/citta/shibuya/central-street`; il **passaggio 1501** su Central Street → `/guida/citta/shibuya/piazza-della-stazione`; **«Dove si trova»** (scheda di Untouchable) → `…/central-street?spillo=1517` |
| F2-18 (R2-17) | Vivo | Briciole «La città › Shibuya» |
| F2-19 (R2-18) | Vivo | 113 indirizzi distinti: 109 aperti nel browser, 4 controllati con `risolvi` |
| F2-20 (R2-19) | **Vivo (giro 2)** | API: per i 70 pin di passaggio delle 55 mappe del mondo `dettaglio.mappa.casa` coincide con la casa della meta (70/70), col nome della meta (il pin 1628 «Mappa» mostra «Yongen-Jaya»). Browser: i pin 1631 e 1501 portano alla pagina dell'area di arrivo (`f2-20-passaggi-api.txt`, `residui-letture.txt`) |
| F2-21 (R2-20) | Vivo | «Chiudi» e «Apri il visore» dell'editor |
| F2-22 (R2-21) | **Vivo (giro 2)** | Via API col corpo `{area}`. Dalla **finestra «Ingresso»** di Shinjuku (area «Quartiere a luci rosse», x 42, y 58, «Medio · 2.5×», «Salva») → `PUT …/ingresso {area, x, y, zoom}` → 200. Poi la finestra della metro «Quartiere a luci rosse — ingresso di Shinjuku», con «Apri l'area» sul punto salvato. «Togli l'ingresso» → `DELETE` → 204, ingresso `null` (ciclo 7) |
| F2-23 (R2-22) | Vivo | Finestra d'ingresso dalla metro, punto e zoom, «Chiudi» |
| F2-24 / F2-25 / F2-26 / F2-27 | **Vivo (giro 2), API e interfaccia** | Via API (ciclo 2), più dall'interfaccia sul Collaudo (ciclo 8). **«Aggiungi area»** su Shinjuku: nome, immagine (PNG), etichetta «prima versione» e tocco sull'illustrazione («Punto scelto…»). Parte una sola `POST /api/aree/citta/shinjuku?nome=…&etichetta=…&x=29.93&y=59.98` → 201; la carta compare subito nell'elenco del quartiere e il pin «Passaggio: Prova funzionali L2 finestra» sull'illustrazione, selezionato (`?spillo=2598`), senza ricaricare. **«Aggiungi planimetria»** sulla nuova area: immagine, etichetta «seconda», «diventa la predefinita». Parte una sola `POST …/planimetrie?etichetta=seconda&predefinita=1` → 201; la finestra si chiude, la versione «seconda» è segnata «si apre per prima» e si apre subito nel visore (`?planimetria=…-seconda`). Riscontro dall'API: 2 versioni (ordine 0 e 1), predefinita «seconda», ruolo `planimetria-nativa`, passaggio a 29.93/59.98 (`finestre-api.txt`). «Elimina area» dall'interfaccia: ciclo 2 |
| F2-28 (R2-27) | **Vivo (giro 2, f19a117f), API e interfaccia** | «Colloca» via API con una mappa senza genitore; **dall'interfaccia** sul Collaudo (ciclo 9, stato preparato dal Collaudo come nel test FUN2-9 di BE): La città › «Planimetrie da collocare (1)» › «Colloca» propone Shibuya (FUN2-9) e, confermato su «Central Street», la planimetria torna nell'area, predefinita, 24 pin, lista vuota. FUN2-8: lo spostamento nel mondo di una mappa senza Area è rifiutato (409) via API e dall'editor (sezione «Ciclo 9») |
| F2-29 (R2-28) | **Vivo (giro 2)**; prima del giro 2: No | Rinomina di un'area `seed` e «Ripristina», via API e dall'interfaccia, sul Collaudo (sezione seguente); già prima il 409 su un'area dell'utente. La conservazione dopo un import senza `sovrascrivi`: **Test** BE (R3 del giro 1) |
| F2-30 (R2-30) | **Vivo (giro 2)**; prima del giro 2: No | Partita di prova, «raccolto» sul pin 1750, letto uguale da API, pagina Area e visore, e separato dalla partita 1 (sezione seguente) |
| F2-31 (R2-31) | **Vivo (giro 2)** | Strada (a), dalla guida giorno per giorno: 16 destinazioni distinte per le 63 voci del mondo e 3 di Palazzi e Memento. **Strada (b) «Oggi»**: con una partita di prova attiva al 05-10 giorno (ciclo 7) i due «Sulla mappa» provati aprono sul posto la planimetria giusta, con il pin selezionato e il popup: «Distributore Cortile» (292, Shujin 1P) e «Sala giochi (Central Street)» (1515) |
| F2-32 (R2-33) | Vivo | Memento: casa invariata |
| F2-33 | **Vivo (giro 2), lanciati da me** | 24 file di test di L2 sul commit di rilascio (`p5s-sviluppo-l2`, `DATA_DIR` verso una cartella vuota): 234 test, EXIT=0; `data/` del collaudo non toccato (`esiti-giro2/funzionali/f2-33-vitest.txt`) |

Prove del Palazzo legate a L3: sono in L3.

**Nessun caso resta «in parte» dopo il ciclo 9 (f19a117f).** Storico della lista, prima del ciclo 9:

**Restano «in parte» (giro 2, dopo il ciclo 7):**
- **F2-02**: il segno «Da verificare» nell'indice e nella pagina dell'Area dello staff. Si prova quando R1 arriva sulla linea di rilascio:
  lo segnala il PM.
- **F2-28**: «Colloca» dall'interfaccia. Lo provo dopo che FE consegna FUN2-9 (il quartiere proposto sbagliato): lo segnala il PM.
  Via API è provato.
- Le finestre «Aggiungi area» e «Aggiungi planimetria» (F2-24, F2-25) e l'export e import di tutto il mondo (F2-12) sono provati nel
  ciclo 8 del Collaudo (vedi la tabella).

### Ciclo 9 — R1, FUN2-8, FUN2-9 e «Colloca» sul collaudo f19a117f (base p5s-2026-10-20-0503Z, 2026-10-20)
Collaudo su `f19a117fe259c9828c9e57343a26cbd2c7802417` (`newreview-l2`: 5fd97d9f parte BE riscritta sul codice di rilascio — R1, R2-28,
FUN2-8, FUN2-9 — e i cherry-pick di b0ebdad0, c43b8bc0, fcff89e3). Prove grezze in `esiti-giro2/funzionali/ciclo9/`.
- **F2-02 / R1 (sola lettura, prima del ciclo) ✅** `GET /api/aree/citta/tokyo/area-riservata-allo-staff` → `daVerificare: true`, 2 versioni
  («porzione occidentale» predefinita, «planimetria completa»). Indice `/guida/mappe`, gruppo Tokyo: «Area riservata allo staff · 2 versioni ·
  0 pin · Da verificare». Pagina dell'Area dello staff: il segno «Da verificare». `/api/aree/da-collocare` → `[]`.
- **Ciclo unico con Test layout** (foto del Collaudo `L2g2-ciclo9-funzionali-layout`, stato pronto alle 05:21Z): il Collaudo ha tolto dalla sua
  Area l'unica planimetria di Central Street (`nativo-rmap-001-3-0`), come il test FUN2-9 di BE, perché dopo FUN2-8 l'app non crea più una
  «da collocare». Prima ha misurato Test layout con sole letture (fino alle 05:22:38Z); le mie scritture vanno dalle **05:22:48 alle 05:24:44Z**.
- **FUN2-9 ✅** La città › «Planimetrie da collocare (1)» › «Colloca» su «Central Street · Shibuya · 24 pin»: la finestra «Colloca Central
  Street» propone **Quartiere: Shibuya** (il genitore) e nel menu Area le aree di Shibuya (Piazza della stazione, Sottopasso, Central Street,
  Centro comm. sotterraneo, Tornello della linea Ginza, Banchina della metropolitana, «Un'area nuova…»). Chiusa con «Annulla»: lista invariata.
- **FUN2-8 ✅** `POST /api/mappe {nome: "Prova funzionali FUN2-8", tipo: "luogo"}` → 201, senza genitore e senza area; `PUT {genitore:
  "citta-kichijoji"}` e `PUT {genitore: "tokyo"}` → **409 `usa-aggiungi-area`** («Nel mondo una planimetria sta in un'area: aggiungila con
  «Aggiungi area» nel quartiere (o «Aggiungi planimetria» in un'area), o collocala dall'elenco «Da collocare».»); la mappa resta senza genitore
  e la lista «da collocare» non cambia. **Dall'editor** (`/guida/mappe/prova-funzionali-fun2-8/modifica`, «Mappa genitore» → Kichijoji →
  «Salva mappa»): l'avviso resta scritto sopra le proprietà, con «Aggiungi area / planimetria dalla pagina del quartiere» → `/guida/citta/kichijoji`
  e «Planimetrie da collocare». Pulizia: mappa eliminata e tolta dal cestino (cestino vuoto).
- **F2-28 «Colloca» dall'interfaccia ✅** Nella stessa finestra, Area «Central Street» → «Colloca»: finestra chiusa, sezione «Planimetrie da
  collocare» sparita, `/api/aree/da-collocare` → `[]`; la planimetria `shibuya-central-street` ha genitore `shibuya`, area
  `citta/shibuya/central-street`, predefinita, 24 pin, casa `/guida/citta/shibuya/central-street`.
- Fine delle scritture comunicata al Collaudo per il ripristino.
- **Hash finale di L2 `625475322b745489e5da1a9b674b5fa7b77e795b`** (f19a117f + 25012240 «1 da verificare» sulla carta di Tokyo nell'indice, solo
  `MappaPage`, + la riga della ROADMAP). Riletto in sola lettura sul 5473 (checkout `p5s-sviluppo-l2` = 62547532): l'indice `/guida/mappe`, **senza
  aprire il pannello**, ha sulla carta di Tokyo il chip «1 da verificare» → `/guida/citta/tokyo/area-riservata-allo-staff`; il tocco apre
  l'Area dello staff con il segno «Da verificare». **F2-02 ✅ anche sull'hash finale.** Gli altri esiti del ciclo 9 non toccano `MappaPage`.

### Casi residui (giro 2, ciclo 7 del Collaudo, 03:06:48–03:08:13Z)
- **Foto e impronte:** foto L2g2-ciclo7-funzionali. Le mie impronte prima e dopo: `gioco.db` identico; `partite.db` diverso solo per
  l'`updated_at` della partita 1 riattivata.
- **Prove grezze** in `esiti-giro2/funzionali/`: `residui-letture.txt`, `f2-20-passaggi-api.txt`, `f2-33-vitest.txt`, `f2-11-palazzo.txt`,
  `f2-31b-partita.txt`, `residui-impronte.txt`, `residui-ciclo-ore.txt`, `residui-ciclo.cjs`, `f2-20.cjs`.
- Nessun difetto nuovo.

### Giro 2 del validatore — R2 (F2-29, F2-30) sul Collaudo (2026-10-20, 02:55:10–02:58:27Z)
- **Ciclo:** foto L2g2-ciclo5-funzionali del Collaudo; codice in esecuzione `2222d51f`, checkout `90137ce2`, che aggiunge solo documenti.
- **Prove grezze** in `lotti/L2/esiti-giro2/funzionali/`: `f2-30-prepara.txt`, `f2-29-rinomina-ripristina.txt`, `pulizia.txt`,
  `impronte-prima-dopo.txt`, `r2-giro2.cjs`, `ora-inizio.txt`, `ora-fine.txt`.
- **Estratti del DOM:** qui sotto, letti nel browser su 5473.

**F2-30 (R2-30) ✅ Vivo**
- **Partita di prova:** «Prova funzionali L2» (id 3, 06-01 giorno), creata attiva: la partita 1 diventa inattiva, solo sulla copia.
- **Pin:** `PUT /api/partite/3/spilli/1750 {raccolto:true}` → 200, sul pin 1750 «Uomo Minaccioso» di Central Street, collezionabile e
  disponibile. In `spillo_partita` c'è la sola riga `{partita_id: 3, raccolto: 1}`.
- **API:** `GET /api/mappe/shibuya-central-street?partita=3` → `raccolto=true`; con `?partita=1` → `raccolto=false`.
- **Pagina Area** `/guida/citta/shibuya/central-street`, con la partita di prova attiva:
  - pannello «PROGRESSO 1 di 4 raccolti · 25%»;
  - il pin sta fra i raccolti nascosti, e l'interruttore «Mostra anche i raccolti (1)» lo rivela;
  - nel visore, il popup del pin dice «Uomo Minaccioso · Dialogo · **parlato**», con il pulsante «Annulla».
  
  L'indirizzo vecchio `/guida/mappe/shibuya-central-street` porta alla stessa pagina (redirect F2-19).
- **Dopo la pulizia** (partita 1 attiva, partita 3 eliminata): con la partita 1 «PROGRESSO 0 di 4 raccolti · 0%», pin 1750
  `raccolto=false`, 0 righe residue della partita di prova.

Lo stato quindi si legge uguale da API, pagina Area e visore, e resta separato per partita.

**F2-29 (R2-28, rinomina e «Ripristina») ✅ Vivo**
- **Area seed:** `citta/kichijoji/quartiere-dello-shopping`.
- **Prima:** `nome «Quartiere dello shopping»`, `nome_rivisto 0`, `origine seed`, `seed_json NULL`; API `modificata: false`.
- **`PUT {nome: «Quartiere dello shopping (prova)»}` → 200:**
  - `nome_rivisto 1`;
  - `seed_json = {"nome":"Quartiere dello shopping","nome_rivisto":0,"planimetria_predefinita":"nativo-rmap-005-1-0"}`;
  - `origine` resta `seed`; API `modificata: true`, slug e casa invariati;
  - nell'elenco del quartiere il nome nuovo compare con `modificata`.
- **`POST …/ripristina` → 200:** la riga torna identica, salvo `updated_at`; `seed_json NULL`, `modificata: false`.
- **Secondo `ripristina` → 409 `area-non-modificata`.**
- **Dall'interfaccia:** dopo una seconda rinomina via API la pagina dell'Area mostra «Ripristina i valori della guida». La finestra dice
  «Rimettere i valori della guida in Quartiere dello shopping (prova 2)? Nome e planimetria predefinita tornano quelli della guida…»;
  «Ripristina» manda una sola `POST …/ripristina` → 200. Il titolo torna «Quartiere dello shopping» e il pulsante sparisce.
- **Non coperto da me:** la conservazione dopo un import senza «sovrascrivi» (Test BE, R3 del giro 1).

**Impronte prima e dopo** (`impronta-db.cjs`, tabella per tabella):
- `gioco.db`: diversa solo `area`, cioè l'`updated_at` di quell'area;
- `partite.db`: diversa solo `partita`, cioè l'`updated_at` della partita 1 riattivata.

Tutto il resto è identico. Il Collaudo ripristina la foto. **Nessun difetto nuovo.**

## Cose da chiedere o tenere d'occhio
- Ogni prova che crea, elimina o importa mappe risincronizza i percorsi pubblici (FUN2-2): finché FUN2-2 è aperto, le impronte di
  `mappa_alias` e `mappa_percorso` vanno lette tenendone conto.
- Lo staff (F2-02): «Tieni» e «Rimuovi» sono decisioni dell'utente sui dati veri. In prova si fanno solo con il ripristino immediato e il
  confronto delle impronte; se BE offre un'area di prova a livello di città, meglio quella.
- Il riordino (F2-26) e la rinomina di un'area `seed` (F2-29) scrivono su aree vere: si rimettono subito e si confrontano le impronte.
  Se serve, si chiede prima al PM.
