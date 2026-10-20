# L3 «Palazzi: aree e infiltrazioni» — test no-reg

Sessione «Test no-reg — team p5s». Ritmo continuo: a ogni pezzo nuovo rilancio i confronti su una copia della produzione e mando i difetti
man mano. Esiti grezzi in `lotti/L3/esiti-noreg/`. Casi preparati: `lotti/L2/noreg.md` §5 (L3).

## 0-bis. BASE NUOVA: copia di p5s `p5s-2026-10-20-0503Z` — cifre e boot di L3+L4 (2026-10-20 07:10–07:13 locali)
La base e i dati aggiunti dall'utente sono descritti in `L2/noreg.md` §0-bis: diario 255 voci, 342 spunte; Kamoshida 169 voci / 359 pin
dell'utente; Madarame 227 / 254. Da qui in poi si confronta con questa base; le sezioni sotto valgono come storia.
Esiti in `esiti-noreg/base-p5s-0503Z/`.

**Boot sulla copia** con l'istantanea di codice dell'anteprima del Collaudo (04:55Z). La mia copia del codice ha la stessa impronta,
`d14f40cf…ff83`. Porta 3294, 108 → 111 e partite 21 → 23. Log:
- 109: aree 23 e planimetrie 29;
- 110: aree 117, planimetrie 245, legami 105 (**0 da regola**: la coppia del pin 777 l'ha dichiarata l'utente), proposte 102, corrette 6,
  segnalate 1, nuove 1;
- 111 applicata;
- utente 022: **0 divergenze**, perché l'utente ha chiuso Kamoshida su p5s;
- utente 023: 40 pin condivisi, 90 righe.

**Confronto prima/dopo sulle colonne comuni, riga per riga** (`l34-colonne-comuni.txt`). Cambiano solo valori dichiarati:
- le 5 planimetrie del Covo (109);
- in `voce_giornata`, le **6 voci corrette dalla 110**, tutte dopo il 06-01: 06-20, 08-03, 10-29, 11-14, 11-19, 11-24;
- **1 voce nuova** del team il 06-26 (`8c58ad98…`, `aggiunta_da: team`, da rivedere).

Il diario validato fino al 06-01 non cambia in nessun campo di prima. La voce di Igor (`9b4f62e2…`) e la nota di `b9371f80…` sono identiche.
Tutte le tabelle delle partite di prima sono identiche riga per riga; si aggiungono solo `divergenza_partita` e `spillo_partita_infiltrazione`.
**I dati nuovi dell'utente sono intatti**: voci 18 e 19 di Madarame, pin 2300 e 2301, legami, Igor, nota, spunte ed eventi.

**API.**
- «Sulla mappa»: 0 destinazioni diverse.
- Indirizzi del mondo: 0 su 115.
- Indirizzi dei Palazzi: 667 risolti. 254 pubblici, 253 interni e 50 alias hanno la casa dell'albero. 83 alias della guida vanno a
  `?infiltrazione=`. Nel Memento 18 indirizzi e 9 alias restano nel visore.
- Stato visibile p1/p2: **0 differenze voce per voce e pin per pin** (Kamoshida 169 voci / 369 pin, Madarame 227 / 260). Cambiano solo
  3 riepiloghi, tutti ancora completati: il motivo passa da «raccolto tutto (n/n)» a «tutti gli oggetti permanenti (n/n)» (L4 §8.10).
  Valori: Kamoshida p1 e p2 71/71, Madarame p1 82/82.
  Nota per L4: con l'istantanea delle 04:55 Madarame p1 conta **82** permanenti, mentre Analisi dati, sulla 0440Z con la regola completa
  §8.11/§8.14, ne attende 101. Lo verifico nella riprova di L4 col codice consegnato.
- NR3-4 (indirizzi che aprono un'altra planimetria) dipende dal FE e dalla regola della casa, non dai dati: va rifatto nel browser
  sull'anteprima quando FE consegna la correzione.

## 1. Giro continuo n. 1 — migrazione 110 non ancora registrata (2026-10-20 03:30)
Avviso di BE: `server/db/migrations/110_aree_dei_palazzi.ts` è scritta ma non registrata in `index.ts`. sha256 del file al momento della
prova: `1497edc405ea…` (`esiti-noreg/codice-110.txt`). Ho applicato la 110 con lo script di prova di BE (`prova-110.mts`, copia in esiti; scrive
solo sulla copia, sorgente in sola lettura). Sorgente: **la mia copia della produzione già migrata a 107-108-109** (`l2-109b`, L2/noreg.md §4),
non `data/` di sviluppo.

**Conteggi** (`prova-110.txt`): aree dei Palazzi **101** (117 con Iweleth), per Palazzo 10/8/13/18/11/13/16/12 + Iweleth 16; planimetrie con
area **219** (245), senza area **0**; etichette 187 (203); `infiltrazione_area` **93** (105), di cui 1 `regola` (madarame-il-furto…
→ `dungeon/madarame/giardino-centrale`, pin 777); infiltrazioni senza aree 15, aree senza infiltrazione 31 (35); Memento 0; aree del
mondo 23 invariate; `voce_infiltrazione` 0; proposte 37 voci / 102 righe; corrette 6, da rivedere 8, segnalate 1, nuove 1; **validato 04-01..06-01
con colonne nuove valorizzate: 0**; `mappa_entita` area 130 e `entita_*='area'` 105 invariate. Seconda esecuzione identica (idempotente),
`foreign_key_check` vuoto prima e dopo. Coincide con le misure di BE (fatte su `data/`) e con modifiche.md §2.2.

**Confronti con la copia a 109** (`110-impronte.txt`):
- `impronta.cjs` (diario 04-01..06-01, Kamoshida, Madarame): **0 differenze**, escluse le 4 colonne nuove di `voce_giornata` (`da_rivedere`,
  `aggiunta_da`, `testo_precedente_json`, `motivo_revisione`, fuori impronta per modifiche.md §1.4). Senza escluderle le differenze sono 1016 =
  254 voci × 4 chiavi nuove, ognuna 0/null. Conteggi: diario 254, spunte 338; Kamoshida 7/169/373/302/472; Madarame 5/225/261/221/276.
- Estesa: validata, destinazioni, pezzi, copie, atterraggi, marcatori, perimetri e **tutte le tabelle delle partite identici**. Nelle mappe dei
  Palazzi cambiano solo le colonne della 109 ora valorizzate.
- Impronta del mondo **identica** alla 109 (aree del mondo intatte).
- Fotografia, per i campi di prima: 108 tabelle invariate. `area` +117 righe (nessuna riga del mondo cambiata). `mappa`: 245 righe con
  `area_chiave`/`versione_ordine` (e 203 `versione_etichetta`), nessun altro campo. Tabelle nuove `infiltrazione_area` 105,
  `proposta_infiltrazione_voce` 102, `voce_infiltrazione` 0. `voce_giornata`: 4 colonne nuove, 1 riga nuova, **6 righe con campi di prima cambiati**,
  tutte dopo il 06-01:
  - 06-20 (`note`), 08-03 (`azione`), 10-29, 11-14 e 11-19 (`riferimento_tipo`/`riferimento_chiave`), 11-24 (`note`);
  - per ognuna `testo_precedente_json` ha **esattamente** i valori di prima (azione, note, riferimento_tipo, riferimento_chiave,
    riferimento_testo); nessun campo cambiato manca; `updated_at` invariato; `da_rivedere = 1`;
  - 11-13 sera: solo segnalata (`motivo_revisione`), nessun campo cambiato;
  - voce nuova `8c58ad98…` 06-26 giorno, ordine 1 (nello stesso giorno e fascia c'era solo l'ordine 0), `palazzo`, `dungeon:kaneshiro`,
    «Ritrovo: invio della lettera di sfida a Kaneshiro…», `aggiunta_da = team`, `da_rivedere = 1`. **Nessuna voce esistente cambia `ordine`.**
- Col codice di sviluppo di adesso su questi dati (porta 3297): **stato visibile p1/p2 0 differenze** voce per voce e pin per pin rispetto alla
  base «prima di L2»; «Sulla mappa» (API) 0 differenze; prove di funzionamento 0 errori; nessun errore nel log.
- **Nessun difetto.**

## 2. Giro continuo n. 2 — 110 registrata, codice di sviluppo (2026-10-20 03:39)
Codice: cartella di sviluppo con la 110 registrata (sha256 della 110 invariato, `1497edc405ea…`; impronta del codice in
`esiti-noreg/codice-110r.txt`). Copia fresca della produzione, boot reale 106 → 107 → 108 → 109 → **110** (porta 3297). Log della 110:
`aree 117, planimetrie 245, etichette 203, legami 105, legamiDaRegola 1, proposte 102, corrette 6, segnalate 1, nuove 1, senzaArea 0`.
Esiti (`110r-confronto.txt`, `110r-api.txt`):
- `impronta.cjs` contro la base «prima di L2»: **0 differenze** (escluse le 4 colonne nuove del diario).
- Estesa: **identica** alla 110 applicata a mano (§1). Fotografia: 113 tabelle identiche; in `area` (140) e nella voce nuova cambiano solo
  `updated_at`/`created_at` (gli orari dei due giri). Impronta del mondo identica alla 109.
- **Stato visibile p1/p2: 0 differenze** voce per voce e pin per pin rispetto alla base. «Sulla mappa» (API): 0. Indirizzi del mondo: 0.
  Funzionamento: 0 errori.
- API, Palazzi (contro la base prima di L2): per Kamoshida e Madarame le voci di ogni infiltrazione (chiave, stato, nome, tipo, ordine, numero
  di pin) e il riepilogo (punti, gestiti, raccolta, completato, atterraggi) sono **identici**. Cambiano solo `aree[].mappe` (le planimetrie
  delle aree legate, §1.2), `planimetrie` e `areePalazzo` (nuovo), come dichiarato da BE. L'elenco dei Palazzi è identico.
- API, Memento: **10 differenze**, tutte `areePalazzo: []` nuovi e vuoti → difetto **NR3-1** (difetti.md): R3-12 e §2.2 vogliono la risposta
  identica byte per byte, ma §3.1 prescrive quei campi. Nessun effetto a schermo; serve una decisione.
- Le altre differenze API (città, quartieri, albero, Tokyo) vengono da L2 (`casa`, `area`, `versione`, aree dei quartieri) e non dalla 110.

- **NR3-1 verificato** (03:42): dopo la correzione di BE (strada (a) decisa dal PM) la risposta dei Memento è identica byte per byte alla
  base (sha256 `8dbe3350fe420fda…`); i Palazzi mantengono `areePalazzo`; impronta, stato visibile e funzionamento invariati
  (`esiti-noreg/nr3-1-verifica-api.txt`).

## 2-bis. Giro completo dei servizi di L3 (2026-10-20 04:15–04:20)
Codice: cartella di sviluppo con tutti i servizi di L3 (impronta in `esiti-noreg/codice-l3.txt`), interruttore `CASA_SCHEDA_PALAZZI` spento.
Copia fresca della produzione, boot reale 106 → 110 (porta 3297). Esiti in `l3g-confronto.txt`, `l3g-api.txt`, `l3g-pacchetto-*.txt`.
- **Lavoro da preservare**: `impronta.cjs` 0 differenze rispetto alla base (escluse le 4 colonne nuove del diario); estesa identica alla 110
  provata nel giro n. 2; impronta del mondo identica; fotografia: 113 tabelle identiche alla 110 del giro n. 2, in `area` e nella voce nuova
  cambiano solo gli orari della migrazione.
- **Stato visibile p1/p2 0**, «Sulla mappa» (API) 0, indirizzi del mondo 0; **Memento identici** alla base; Kamoshida e Madarame: voci, stati e
  riepiloghi identici.
- **Pacchetto mappe, esporta → importa con «sovrascrivi» dalla rotta dell'app** (`POST /api/mappe/importa`) su Kamoshida e Madarame; fotografia
  prima/dopo con **tutti** i campi, `updated_at` compresi:
  - **identici**: `nome_rivisto`, `mappa_entita`, `area`, `infiltrazione_area`, id di pin, pezzi e copie, destinazioni, atterraggi, alias,
    percorsi, `spillo_partita`/`punto_partita` con i loro `updated_at`. Sono corretti i casi 1, 3 e 4 di L1 §5.A.4;
  - **NR3-2 (media)**: i 16 pin seed diventano `utente`, cioè il caso 2 di L1 non è corretto sulla rotta dell'app, che forza `origine: 'utente'`.
    La prova di BE non lo vedeva perché chiama `importaMappe` senza origine;
  - **NR3-3 (bassa)**: le 3 immagini caricate reimportate prendono `nome_file` e `created_at` nuovi, quindi 4 miniature rigenerate;
  - asset del labirinto contorto → null: è F9 di L1, voluto.
- **Osservazione O3-1** (preesistente): l'esportazione completa (103 MB) non si può reimportare dall'app (limite 64 MB, 413).
- Dopo i giri del pacchetto: stato visibile 0 differenze, funzionamento 0 errori.

## 2-ter. Verifica di NR3-2, NR3-3 e O3-1 (2026-10-20 04:34)
Codice corretto da BE (non committato, impronta `cbe6ff8d…` in `esiti-noreg/codice-l3b.txt`). Copia fresca della produzione, boot reale
106 → 110 (porta 3297). Esiti in `esiti-noreg/l3h-pacchetto.txt`.
- Prima dei giri: impronta 0 differenze rispetto alla base (escluse le 4 colonne nuove); stato visibile p1/p2 0.
- **Giro 1** — dalla rotta dell'app (`GET /api/mappe/esporta?radice=…`, `POST /api/mappe/importa` con «sovrascrivi»), Kamoshida e Madarame:
  fotografia con **tutti** i campi, `updated_at` compresi: **115 tabelle su 116 identiche**; l'unica differenza è `mappa.asset` del labirinto
  contorto (F9). I 16 pin restano `seed` (**NR3-2 verificato**); `immagine` e `immagine_miniatura` identiche (**NR3-3 verificato**).
- **Giro 2** — **esportazione completa** (103 MB, 317 mappe, 1759 spilli, 32 immagini) reimportata dalla rotta → **200** (**O3-1 verificato in
  sviluppo**; su p5s serve il `nginx.conf`). Fotografia: 115 tabelle su 116 identiche; differiscono solo i due asset F9 (labirinto e tornello di
  Aoyama Itchome). Estesa: 1 sola differenza, l'asset F9 del labirinto; perimetri invariati (359/252 pin dell'utente).
- Dopo i giri: stato visibile p1/p2 0, funzionamento 0 errori.
- **L'andata e ritorno del pacchetto mappe dalla rotta dell'app è ora identica campo per campo**, salvo la regola F9 di L1. I quattro casi
  trovati in L1 §5.A.4 sono tutti risolti.

## 2-quater. Round trip della radice `tokyo` (richiesta del PM sui casi del ciclo 8 di L2, `L2/esiti-giro2/funzionali/r2-11*`; 2026-10-20 05:15)
Codice di sviluppo (HEAD fd4bda38 + modifiche, impronta `230c08f9…` in `esiti-noreg/codice-l3c.txt`; porta già gioco 111 e partite 022 di L4).
Copia fresca della produzione, boot reale. Dall'app: `GET /api/mappe/esporta?radice=tokyo` (61 MB, 54 mappe, 23 aree, 22 immagini, 2 ingressi),
`POST /api/mappe/importa` con «sovrascrivi» → 200 (298 pin). Fotografia prima/dopo con **tutti** i campi (`l3t-tokyo.txt`):
- **116 tabelle su 117 identiche**, `updated_at` compresi; l'unica differenza è l'asset F9 del tornello di Aoyama Itchome («mappe/…» inesistente → null);
- per uid su 1913 pin: **id cambiati 0, origine cambiata 0, condizioni cambiate 0**;
- `nome_rivisto` conservato: mappe Sottopasso (001-2-0) e Sottopasso Speciale (001-2-1), tornello di Aoyama Itchome; aree `citta/shibuya/sottopasso`,
  `citta/shujin-academy/banchina-aoyama-itchome` e tutte le aree con `nome_rivisto` dei Palazzi.
- I quattro casi visti da Test funzionali nel ciclo 8 (142 origini, id di 298 pin, condizioni [] → null su 30 pin, `nome_rivisto` perso) **non si
  presentano più**.

### 2-quinquies. Approfondimenti chiesti dal PM sul round trip `tokyo` (2026-10-20, in sola lettura sulle copie `l4a` prima e `l3t` dopo; `l3t-tokyo-f2-12.txt`)
**F2-12 (quartieri e legami):**
- `quartiere_ingresso`: **stesse 2 righe, stessi valori, stesso ordine** (yongen-jaya → `nativo-rmap-009-2-0` 37.46/25.14, area
  `citta/yongen-jaya/vicoli`; shibuya → `nativo-rmap-001-3-0` 38.29/32.67, area `citta/shibuya/central-street`). Cambiano solo i rowid interni,
  da 1,2 a 3,4, perché l'import cancella e reinserisce. La tabella non ha id esposti né riferimenti entranti, quindi nessun effetto.
- `mappa_entita`: 134 righe prima e dopo, `entita_tipo=quartiere` 1 prima e dopo. **Nessuna aggiunta né perdita** (niente «23 legami» in più).
- `spillo_destinazione`: 223 righe, sha `8ddebeb04b786756` prima e dopo, **identica**.
- `spillo` del mondo: 1913 righe, id da 1 a 2299 prima e dopo, **invariato**.

**Asset F9 del tornello di Aoyama Itchome** (`shibuya-tornello-della-linea-ginza-aoyama-itchome`, l'unica differenza delle 117 tabelle):
- **Che differenza è.** Cambia solo il campo `mappa.asset`, da «mappe/shibuya-tornello-della-linea-ginza-aoyama-itchome» a null. Nessun file
  manca dopo l'import, nessun byte cambia, nessun id cambia.
- **Il riferimento era già pendente in produzione.** Nella base (schema 106) non esiste alcuna riga `immagine` con ambito `mappe` e quella chiave.
  L'ambito `mappe` è vuoto e in `public/asset` non c'è la cartella `mappe`.
- **L'immagine mostrata è identica.** È quella caricata dall'utente, `immagine` ambito `mappa`, id 762, 5097 byte, `created_at`
  2026-09-13T09:23:05.784Z, sha `b2929c7bc72fb400`. È uguale prima e dopo, quindi anche l'URL versionato (`urlCaricata`, chiave + data) è uguale.
  La regola di visualizzazione (`illustrazioneDellaMappa`, `immagineMappa.ts`) usa prima la caricata, poi l'asset: l'asset qui non entrava mai.
  Anche se l'utente togliesse la caricata, la vista resterebbe senza immagine, prima perché l'asset non esiste e dopo perché è null.
- **Non è lavoro dell'utente.** Il valore «mappe/<chiave>» è l'asset per convenzione che l'app scriveva da sola alla creazione della mappa
  (`assetPredefinitoMappa`, prima di F9). La mappa è stata creata dall'utente il 2026-09-13; l'utente ha caricato l'immagine e ha rivisto il nome.
  Questi due dati sono conservati: `immagine_chiave` uguale, `nome_rivisto` 1, `origine` utente.
- **È voluto:** è la regola F9 di L1 (un asset si dichiara solo se esiste in `immagine`), applicata dall'export.
- **Esito: non è un difetto, nessuna voce in difetti.md.**
- **Nota di completezza.** Nella base i riferimenti pendenti di questo tipo sono **2**: il tornello e il Labirinto Contorto di Madarame
  (`palazzo-di-madarame-il-labirinto-contorto`), con la caricata id 783, 4 804 655 byte, sha `6ab4f7c2469fbff2`. Il Labirinto non sta sotto
  `tokyo`, quindi conserva l'asset pendente finché non passa da un export dei Palazzi. Lì avrà lo stesso esito innocuo, già visto nel round trip
  completo (§2-ter).
- Le migrazioni 107–111 non toccano nessuno dei due: in `l4a` sono ancora 2.

## 2-sexies. Casa unica dei Palazzi: interruttore `CASA_SCHEDA_PALAZZI` tolto dal BE (2026-10-20 05:31–05:34)
Codice: cartella di sviluppo, HEAD `c43b8bc0` più le modifiche non committate (impronta delle modifiche e dei file nuovi `7c40b4f6…`,
`esiti-noreg/codice-casa.txt`). Nel codice non resta nessun riferimento a `CASA_SCHEDA_PALAZZI` né a `conCasaSchedaPalazzi`.
Copia fresca della produzione (sha gioco `bf147547…`, partite `780ea60e…`), avvio reale sulla porta 3297. I log delle migrazioni 107–111 e
utente 022 sono identici al giro di L4 (stessi conteggi, 4 divergenze). Confronto con `l4a`: stessi dati, codice di L4 con l'interruttore spento.
- **Dati: niente cambia.** Fotografia: 113 tabelle su 117 identiche. Nelle altre 4 cambiano solo gli orari scritti dalle migrazioni:
  `area.updated_at`, `immagine_miniatura.created_at`, la voce nuova del 06-26, `divergenza_partita.rilevata_il`. Nell'estesa (validata,
  destinazioni, pezzi, atterraggi, mappe dei Palazzi, marcatori, perimetri) l'unica differenza è lo stesso orario di `divergenza_partita`
  (`casa-foto.txt`, `casa-estesa.txt`).
- **Stato visibile p1/p2: 0 differenze** (`casa-stato-visibile.txt`).
- **75 «Sulla mappa»: 0 destinazioni diverse** per uid della voce e dello spillo (`casa-sulla-mappa.txt`).
  - Le 10 voci dei Palazzi puntano ancora a `nativo-rmap-152-1-0` (3) e `nativo-rmap-153-1-0` (7). Il visore le risolve ora sulla scheda:
    `/guida/dungeon/kamoshida/area/prigione-sotterranea-tutorial` e `/guida/dungeon/madarame/area/entrata-del-museo`. In entrambi i casi
    è la planimetria predefinita dell'Area, quindi senza `?planimetria=`.
- **API, 38 endpoint, tutti 200** (`casa-api.txt`, classificati con `classifica-diff.cjs`). Cambia solo questo:
  - `casa` delle mappe dei Palazzi: albero 254, `area.casa` 245, `areePalazzo[].casa` 117 nelle 9 schede (tutte le Aree dei Palazzi);
  - `area.daVerificare`, campo nuovo di L2 giro 2 (R1, commit `c43b8bc0`): `true` solo per le 2 planimetrie dell'Area riservata allo staff
    (la 150-3 da riconoscere), `false` altrove.
  - Nient'altro cambia.
- **Ogni casa nuova porta alla stessa mappa di prima** (`verifica-casa-palazzi.cjs`, `casa-verifica-albero.txt`). Sulle 307 mappe dell'albero:
  - 9 radici → `/guida/dungeon/<k>`;
  - 245 planimetrie → `/guida/dungeon/<k>/area/<slug della sua Area>`, con `?planimetria=<chiave>` esattamente quando non è la predefinita
    di quell'Area. Prima ognuna era `/guida/mappe/<la mappa stessa>`;
  - 53 invariate (mondo);
  - 0 case inattese, 0 mappe sparite o nuove, 0 altri campi cambiati.
- **Indirizzi vecchi `/guida/mappe/<k>` dei Palazzi e dei Memento: 667, tutti risolti** (`indirizzi-palazzi.cjs`,
  `casa-indirizzi-palazzi.txt`). Nessuno porta a un'altra mappa.
  - Chiavi interne 253, pubbliche 254 e alias 50: la casa è quella dell'albero per la stessa mappa.
  - Memento, 18 indirizzi: restano nel visore, `/guida/mappe/<chiave>` (R3-12).
  - Alias della guida: 83 dei Palazzi → `/guida/dungeon/<k>?infiltrazione=<i>` sulla loro infiltrazione; 9 dei Memento → visore
    `/guida/mappe/memento?area=<i>`, come prima.
- **Vitest mirati: 8 file, 175/175 verdi** (`casa-vitest.txt`): `aree-mondo`, `palazzi-aree`, `verifica-api`, `ContenutiGuidaAccesso`,
  `MappaPage`, `DungeonDettaglioPage`, `AreePalazzo`, `OrganizzazioneMappe`.
- **Esito: verde sul BE.** Resta il controllo nel browser: che la rotta FE `/guida/dungeon/<k>/area/<slug>` (con e senza `?planimetria=`) e
  `?infiltrazione=` mostrino la stessa planimetria e gli stessi stati. Lo faccio nel giro FE di L3 (§3), sul Collaudo o su un'istanza mia su copia.

## 2-septies. L3 FE nel browser, istanza di sviluppo 5373 (→ 3201, `data/` di sviluppo), sola lettura (2026-10-20 06:39–07:05)
Richiesta del PM. Uso la mia scheda del browser, mentre Test layout misura in iframe. Codice: cartella di sviluppo, HEAD `fcff89e3` con le modifiche
non committate di FE (L3) e BE (L3, L4 in corso). Partita attiva 1, 06-01. Preferenza della grafica trovata vuota e non toccata.
Avvertenze:
- Le pagine chiedono miniature (`?l=`), che scrivono la cache `immagine_miniatura` di `data/`; nient'altro è stato scritto.
- Durante il giro il BE (tsx watch) si è riavviato due volte per le modifiche di BE a `statiGuida.ts` e per ~2 minuti non è ripartito (manca un export
  mentre BE scrive). Ho messo in pausa e ripetuto tutte le righe cadute: nessun esito contato con errore.
- Esiti grezzi in `esiti-noreg/fe-5373/`.

**Esito: VERDE salvo NR3-4.**
- **Indirizzi dei Palazzi: 640, tutti portano alla scheda giusta.** Lo stato visibile dall'API su 3201 coincide con la copia fresca (0 differenze).
  - Radici: 18/18 → `/guida/dungeon/<k>`, con il nome del Palazzo.
  - Alias della guida: 83/83 → `?infiltrazione=<i>`, con quell'infiltrazione aperta.
  - Planimetrie: 539/539 arrivano alla casa del BE. 459 mostrano la stessa planimetria di prima. **80, in 37 Aree, ne mostrano un'altra →
    NR3-4** (alta), tra cui il Tetto di Kamoshida e la Galleria della Sala del Tesoro di Madarame. La scheda, senza `?planimetria=`, apre la
    planimetria iniziale della prima infiltrazione al posto della predefinita a cui l'indirizzo porta. Il calcolo sull'API dà le stesse 37 Aree
    (`predefinita-vs-iniziale.txt`).
- **75 «Sulla mappa»: 75/75 come la base** (49 ok, 17 nascosto, 9 mappa). Le due voci dei Palazzi arrivano ora sulla scheda (Prigione sotterranea
  con Morgana selezionata e scheda aperta; Entrata del Museo) con la stessa planimetria e gli stessi pin (8 e 6). Il Memento resta nel visore.
- **Metro, grafica accesa**: 10 posti, byte delle immagini identici alla base. Il markup cambia solo per modifiche volute nel codice:
  - L3 §4.1: Madarame e Memento portano alla scheda;
  - L4 §8.10, in corso: tooltip «concluso» di Kamoshida e requisito di Roppongi.

  Kamoshida resta assente come nella base. A grafica spenta non ho provato: nessun via richiesto su 5373.
- **Diario 04-09..06-01**: in 54 giorni su 54 la pagina mostra quello che dà l'API (voci, ordine, spunte). L'API contro l'impronta della base è
  identica: 254/254 voci (testo, giorno, fascia, ordine), 236/236 spunte della partita 1.
- **Kamoshida e Madarame p1 nella scheda**: per infiltrazione, pagina = API. Kamoshida 169 voci, 133 segnate, raccolta 107/107, «Tesoro ✓ · Boss ✓».
  Madarame 225 voci, 221 segnate, 85/86, «Tesoro ✗ · Boss ✗». Tutto come la base. Pin per pin: stato visibile dall'API 0 differenze, p1 e p2.
- **Memento nel visore**: `/guida/mappe/memento`, la planimetria 190-1-0 e l'alias `mementos-01-qimranut` restano nel visore. La risposta API
  differisce dal giro di L4 solo per `concluso: null` (AP4-1, L4).
- Nota sulla base: i dati di `data/` sono la copia di prima (Madarame 225/252), non la 0440Z del Collaudo (227/254, Madarame concluso). Il
  confronto qui vale contro la base di quei dati. Il giro sul Collaudo di L3 andrà fatto sulla 0440Z.

## 3. Da fare quando i servizi di L3 sono pronti (guida sulle mappe, accesso dal mondo, editor, pacchetto, diario)
I casi di `L2/noreg.md` §5 (L3): stato visibile con le pagine nuove; Memento identici byte per byte; 75 «Sulla mappa» (10 dei Palazzi verso la
casa del Palazzo); **pacchetto mappe esporta → importa con impronta ed estesa identiche campo per campo**, compresi `nome_rivisto`, origine
dei pin seed, `mappa_entita.fonte_json` e gli `updated_at` (i quattro casi di L1 §5.A.4), più `area`/`infiltrazione_area`.
