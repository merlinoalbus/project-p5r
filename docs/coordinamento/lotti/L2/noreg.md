# L2 «Mondo: aree e planimetrie» — test no-reg

Sessione «Test no-reg — team p5s». Ritmo continuo (processo.md, «I tester non aspettano la fine del lotto»): a ogni pezzo nuovo
rilancio i confronti su una copia fresca della produzione e mando i difetti man mano. Esiti grezzi in `lotti/L2/esiti-noreg/`.

## 0-ter. BASE AGGIORNATA: p5s `p5s-2026-10-20-0533Z` (testata della bacheca; 07:42–07:44 locali). Vale per L2, L3 e L4
- Copia identica a quella del Collaudo: gioco `8a0c5a56…` (108), partite `f1554be9…` (identico alla 0503Z). Fotografia contro la 0503Z
  (`differenze-da-0503Z.txt` nel mio scratchpad, uguale a quella del Collaudo):
  - aggiunte dell'utente su p5s: `mappa` +1 **`palazzo-di-kamoshida-prova`** («Prova», tipo area, sotto `dungeon-kamoshida`, origine utente,
    1378×1142); `immagine` +1 (id 808, PNG di 1 353 169 byte); `mappa_alias` +1; `mappa_percorso` +1;
  - `immagine_miniatura` 68 → 149: cache;
  - nient'altro. **Lavoro da preservare invariato**: diario 255/342, Kamoshida 169/359, Madarame 227/254.
- **Migrazioni 109–112 + utente 022–023 (codice `b83c30ac`) sulla copia 0533Z** (porta 3290):
  - 110: **aree 118, planimetrie 246** (+1 e +1). La planimetria dell'utente diventa l'Area **«Prova»** di Kamoshida
    (`dungeon/kamoshida/prova`, predefinita sé stessa, senza infiltrazioni). La sua casa è `/guida/dungeon/kamoshida/area/prova`.
  - Colonne comuni contro la base: stessi soli cambi dichiarati (Covo; 6 voci dopo il 06-01 e 1 nuova il 06-26). **La planimetria
    dell'utente è identica in ogni colonna di prima e l'immagine 808 è intatta.** Partite identiche.
  - Stato visibile p1/p2 contro la stessa prova sulla 0503Z: 0 differenze per voci e pin. Cambia solo il conteggio delle planimetrie di
    Kamoshida, da 26/26 a **27/27** (la «Prova», senza pin).
  - k/N p1 89/89, p2 39·0·50: invariati.
- Le cifre e i giri precedenti sulla 0503Z restano validi: la sola differenza è questa planimetria. Da qui in poi i confronti partono dalla
  0533Z.

## 0-bis. BASE NUOVA (vale da qui in poi): copia di p5s `dati-produzione/p5s-2026-10-20-0503Z/` (2026-10-20 07:05–07:12 locali)
Regola dell'utente: si lavora sui dati attuali, la fonte è p5s e la produzione è ferma alla 0440Z (`bacheca.md`, `collaudo/PROCEDURA-DATI.md`).
I confronti sui dati vecchi di sviluppo e sulla copia delle 00:08 si fermano qui: §0 e i giri che seguono valgono solo come storia.
Esiti grezzi in `esiti-noreg/base-p5s-0503Z/`.
- **Copia**: gioco `bedab9e1…` (user_version **108**: p5s è su L1), partite `f1554be9…` (21), copiata dalla cartella del Collaudo, sha identici
  prima e dopo le mie letture.
- **Misure sui dati** (sulla copia intatta, sola lettura): fotografia di 112 tabelle. Estesa: destinazioni 223, pezzi 24, copie 42, atterraggi 3,
  mappe dei Palazzi 27 + 18, marcatori 196. Partite: `punto_partita` 564, `spillo_partita` 797, `spunta_voce_partita` **342**,
  `evento_partita` 1316.
- **Lavoro da preservare (perimetri)**: diario validato **255** voci, **342** spunte.
  - Kamoshida: utente 169 voci / **359** pin; impronta 169 / 373.
  - Madarame: utente **227** voci / **254** pin; impronta 227 / **263**.
- **Basi API** col codice di p5s (`9634bbb5`, L1), su una copia avviata da me (porta 3296, nessuna migrazione da fare).
  - 38 endpoint, tutti 200.
  - 75 «Sulla mappa» su 255 voci, destinazioni identiche alla base precedente.
  - Indirizzi: 115 del mondo e 667 dei Palazzi e dei Memento, tutti risolti.
  - Stato visibile:

    | Palazzo | Partita 1 | Partita 2 |
    |---|---|---|
    | Kamoshida | 169 gestite, 107/107, «Tesoro, boss finale e raccolto tutto (107/107)» | uguale alla partita 1 |
    | Madarame | 224 gestite, **88/88**, «… (88/88)» | 0 gestite, non completato |
- **Browser** (FE 5296 mio, stessa versione; `browser-5296.txt`):
  - metro a grafica accesa `4c686acb…`: 9 posti, Madarame assente perché concluso;
  - a grafica spenta identica (preferenza della mia origine, rimessa vuota);
  - 75 «Sulla mappa»: 75/75 come la base precedente.
- **Che cosa ha aggiunto l'utente rispetto alla base precedente** (copia delle 00:08, `bf147547…`/`780ea60e…`;
  `differenze-da-base-vecchia.txt` riga per riga):
  - gioco (19/10 22:18–22:36 UTC, Madarame finito):
    - voci nuove `madarame-il-furto-del-cuore-di-madarame-scontro-con-madarame` e `…-scontro-con-madarame-2`;
    - pin nuovi **2300** «La vera Sayuri Originale» e **2301** «Madarame»;
    - 3 legami pin-voce nuovi: 811 → riunisciti-con-morgana, 2300 e 2301 → scontro-con-madarame-2;
    - legame `mappa_entita` 153-5-0 ↔ infiltrazione «Il furto del Cuore di Madarame»;
    - `updated_at` di 153-5-0 e del pin 811;
    - diario: voce nuova `9b4f62e2…` (06-01 sera, Igor); la nota di `b9371f80…` passa da «Giorno di scadenza (deadline)» a
      «Ruba il Tesoro di Madarame».
  - Più quello che le migrazioni 107–108 hanno già fatto su p5s: ruolo della Banchina di Yongen-Jaya e tabella `immagine_miniatura`
    (68 righe).
  - partite (19/10 sera e, su p5s, 20/10 04:52–05:01 UTC, Kamoshida chiuso al 100%):
    - `punto_partita` +39;
    - `spillo_partita` +49 righe e 9 righe cambiate;
    - `spunta_voce_partita` +4;
    - `evento_partita` +43;
    - `incontro_confidente_partita` +2, `lettura_partita` +1, `effetto_lettura_partita` +1;
    - righe cambiate: confidente 2, dote 1, libro 1, partita 1.
- **Boot di L2 sulla copia** (codice del collaudo `2222d51f`, porta 3295; 108 → 109: aree 23, planimetrie 29, Covo spostato 5).
  - Confronto prima e dopo **sulle colonne comuni, riga per riga** (`confronta-colonne-comuni.cjs`, `colonne-comuni.txt`): nelle tabelle di
    prima cambiano solo i valori dichiarati, cioè `genitore_chiave` delle 5 planimetrie del Covo → `citta-yongen-jaya`. Il resto della 109 è
    aggiunto: 4 colonne di `mappa`, tabella `area`, colonna di `quartiere_ingresso`, indici.
  - **Partite: 0 differenze. Dati nuovi dell'utente (voci 18 e 19, pin 2300 e 2301, legami, Igor, nota di b9371f80, spunte, eventi):
    identici.**
  - Estesa: unica differenza le 4 colonne nuove (null) nelle mappe dei Palazzi.
  - API: stato visibile 0, «Sulla mappa» 0, indirizzi del mondo 0 su 115. Le altre risposte cambiano solo per i campi di L2 (aree, casa,
    ingresso, ordine dell'albero) come nel collaudo di L2 (`api-confronto.txt`).

## 0. Base «prima di L2»
- Codice: **L1 consegnato**, commit `ab3b1053`, estratto nello scratchpad con `git archive` (non tocca la cartella di sviluppo).
- Dati: copia fresca della produzione (gioco 106, partite 21, sha256 `bf147547…` / `780ea60e…`). Boot reale con il codice L1 → 107, 108.
- Misure (cartella `l2base/out` del mio scratchpad):
  - `impronta.cjs` (PM): sha256 **`1a71b030…`**, uguale a quella di Analisi dati e di BE. Diario 254, spunte 338; Kamoshida 7/169/373/302/472;
    Madarame 5/225/261/221/276. Perimetro utente 169 voci/359 pin e 225/252.
  - `impronta-mondo.cjs` (Analisi dati): sha256 **`619cfa37…`**, uguale alla dev di dati.md §1.10. 54 mappe, 300 pin, 115 alias, 2 ingressi,
    93 luoghi, 1 stato di pin.
  - `impronta-estesa.cjs`, `fotografia.cjs` (112 tabelle), `sulla-mappa.cjs` (75 voci), **`indirizzi-mondo.cjs`** (nuovo): 115 indirizzi
    `/guida/mappe/<k>` del mondo (54 pubbliche, 8 alias distinti, 53 chiavi interne) con la mappa a cui portano oggi.
  - **`stato-visibile.cjs`** (nuovo, serve anche a L3/L4): per p1 e p2, lo stato mostrato di ogni voce (scheda del Palazzo) e di ogni pin
    (visore: raccolto, disponibilità) di Kamoshida e Madarame, con gestiti, raccolta e completato. p1: Kamoshida 133 gestiti, 107/107,
    «Tesoro, boss finale e raccolto tutto»; Madarame 221 gestiti, 85/86, non completato. p2: Kamoshida 169, 107/107, completato; Madarame 0, 0/86.
    Due letture consecutive: 0 differenze.
  - **`api-istantanea.cjs`** (nuovo): 38 endpoint (città, quartieri, Palazzi con atterraggi, albero, Tokyo). Due letture: identiche.

## 1. Casi no-reg di L2 (modifiche.md §6.5 più il piano del PM)
1. Impronta del lavoro da preservare **identica**. Impronta del mondo uguale chiave per chiave, salvo il genitore del Covo e i campi nuovi.
   Pin 734 e 515 identici; `mappa_alias` 690 e `mappa_percorso` 317 identici.
2. Fotografia: per le tabelle esistenti cambiano solo i campi dichiarati (genitore delle 5 del Covo, colonne nuove); cestino con le stesse righe
   e lo stesso contatore.
3. Stato visibile di p1 e p2, voce per voce e pin per pin: identico (L2 non tocca i Palazzi).
4. **75 «Sulla mappa»**: API identica. Nel browser: 63 sul mondo → redirect alla casa (pagina dell'Area, `?planimetria=` se la versione non è la
   predefinita) con lo **stesso spillo selezionato**; 10 Palazzi e 2 Memento → visore come oggi. Atteso per esito: 49 evidenziati, 9 senza
   spillo, 17 nascosti per disponibilità (come la base), più l'indirizzo d'arrivo voce per voce.
5. **Redirect (R2-18)**: i 115 indirizzi del mondo portano a una casa che mostra **la stessa mappa** di prima. Sottopasso: `shibuya-sottopasso`
   → versione «planimetria completa». `covo-dei-ladri` → Area del Covo con `022-1-1`.
6. Metro e atterraggi dei Palazzi; «Dove si trova»; Memento invariati (API identica).
7. Pacchetto mappe, esporta → importa: stesse aree, versioni, predefinite e ingressi; impronte identiche. Un pacchetto senza `aree` riceve
   `assegnaAreeMondo`.
8. Cestino: i tipi di prima si rimettono come prima; `area-fisica` si rimette con planimetrie, pin, passaggi e ingresso.
9. Prove di funzionamento (partita reale e partita di prova) e Vitest mirati delle aree toccate, a fine lotto.

## 2. Giro continuo n. 1 — migrazione 109 (2026-10-20 02:45, avviso di BE)
Codice: cartella di sviluppo con la 109 registrata (impronta del codice in `esiti-noreg/codice-109.txt`); API delle aree non ancora presenti.
Copia fresca della produzione, boot reale 106 → 107 → 108 → **109** (porta 3295). Log della 109:
`aree 23, planimetrie 29, etichette 9, ingressi 2, daVerificare 1, senzaArea 0, covoSpostato 5, cestinoRicopiato 0`.

Esiti, confrontati con la base «prima di L2» (`109-confronto-dati.txt`, `109-confronto-api.txt`):
- `impronta.cjs` **IDENTICA**. Estesa identica: validata, destinazioni, pezzi, atterraggi, marcatori, perimetri, partite. Le mappe dei Palazzi
  hanno solo le 3 colonne nuove a null.
- `impronta-mondo.cjs`: **2 differenze**, solo le colonne nuove (`ingressi[0].area_chiave` → `citta/shibuya/central-street`,
  `ingressi[1].area_chiave` → `citta/yongen-jaya/vicoli`). Pin, alias, luoghi e stato identici.
- Fotografia: tabella nuova `area` (23 righe: Tokyo 1 «da verificare», Shibuya 6, Shujin 8, Yongen-Jaya 3, Akihabara, Kanda, Kichijoji, Odaiba
  e Shinjuku 1); 5 indici e colonne nuove. Nei campi di prima di `mappa` cambia **solo** `genitore_chiave` delle 5 planimetrie del Covo
  (null → `citta-yongen-jaya`). Su `quartiere_ingresso` e `cestino` 0 campi cambiati; `sqlite_sequence` del cestino 16 → 16. Planimetrie con area 29,
  con etichetta 9. Le `immagine_miniatura` hanno solo `created_at` nuovo, perché rigenerate all'avvio di un'istanza nuova (non dalla 109).
- «Sulla mappa» (API): 75/75 identiche. Indirizzi del mondo: 115/115 portano alla stessa mappa. Stato visibile p1/p2: **0 differenze**.
- API: tutti i 38 endpoint 200. `/mappe/albero`, confrontato per chiave: cambiano solo `genitore` e `genitoreNome` delle 5 del Covo e
  `numeroFigli` di Yongen-Jaya (2 → 7). `/mappe/tokyo`: `numeroFigli` di Yongen-Jaya. Tutto il resto identico.
- Prove di funzionamento: **22/22 OK**.
- Dati: nessun difetto.
- **Browser, «Sulla mappa»** sul FE condiviso (5373 → 3201, con FE al lavoro): il redirect alla casa è già attivo, ma la pagina Area non
  esiste ancora. Ne nasce il difetto **NR2-1** (difetti.md): 38 voci su «Pagina non trovata»; 24 sulla pagina del Quartiere senza spillo
  selezionato (e il §4.1 non lo prevede per il Quartiere); 1 (Fiorista) senza pin selezionato. Palazzi e Memento come la base. Esito grezzo:
  `esiti-noreg/109-sulla-mappa-browser.txt`.

## 3. FUN2-2 su `data/` — verifica prima e dopo il ripristino di BE (2026-10-20 02:51–02:55)
- **Prima** (richiesta di conferma di BE): confronto riga per riga, in sola lettura, fra la copia di avvio `00-44-16-830Z` (108) e `data/` (109).
  Esito uguale a quello di BE: schema, area 23, `genitore_chiave` delle 5 del Covo, `mappa_alias` +5 e `mappa_percorso` 5 cambiate (FUN2-2),
  ingressi con la sola colonna nuova, partite identiche, 107 tabelle invariate. Ho dato la conferma.
- **Dopo**: `data/` = copia di avvio (sha256 `7360639414a64a42…`) più la 109 corretta. `impronta.cjs` identica alla base; impronta del mondo solo
  con le 2 colonne degli ingressi; in `mappa` cambia solo il genitore delle 5 del Covo, più le colonne nuove (`percorso_fisso` valorizzato solo
  sulle 5 del Covo con i percorsi di prima); `mappa_alias` 690 e `mappa_percorso` 317 **identici riga per riga**; partite identiche
  (`esiti-noreg/fun22-dopo-ripristino.txt`).

## 4. Giro continuo n. 2 — 109 corretta (con `percorso_fisso`), copia fresca, 2026-10-20 02:54
Codice `107aaea0…` (`esiti-noreg/codice-109b.txt`). Log: `aree 23, planimetrie 29, etichette 9, ingressi 2, daVerificare 1, senzaArea 0,
covoSpostato 5`. Esiti contro la base «prima di L2» (`esiti-noreg/109b-confronto.txt`):
- `impronta.cjs` **IDENTICA**; estesa identica (le mappe dei Palazzi hanno solo le 4 colonne nuove a null); impronta del mondo con le sole 2 colonne nuove;
- fotografia: 108 tabelle con i campi di prima identici; in `mappa` cambia solo il genitore delle 5 del Covo; tabella nuova `area` (23);
- «Sulla mappa» (API) 0 differenze; 115 indirizzi alla stessa mappa; stato visibile p1/p2 0 differenze; funzionamento 0 errori.
- Nessun difetto nuovo. NR2-1 resta aperto (interfaccia).

## 4-bis. Verifica di NR2-1 — «Sulla mappa» con la pagina Area pronta (2026-10-20 ~03:17)
Su 5373 → 3201 (data/ a 109), partita 1 al 06-01 giorno: **75/75 come la base**. 49 evidenziati con la scheda: 26 Central Street, 8 Vicoli,
4 Shujin 1P e 1 Fiorista sulle pagine Area; 18 Ogikubo/Tsukishima sulle pagine Quartiere; 3 Morgana nel visore. 9 senza spillo: Madarame 7,
Memento 2. 17 nascosti per disponibilità. Gli indirizzi d'arrivo sono le case, con lo `spillo` conservato. NR2-1 → **verificato**
(`esiti-noreg/nr2-1-verifica-sulla-mappa-browser.txt`). Il Fiorista: il server dava già la casa (area `citta/shibuya/centro-comm-sotterraneo`
della 109), quindi l'ipotesi «planimetria senza area» non era corretta.

## 4-ter. Preparazione del giro sul collaudo di L2 (istanza 3301/5473 su 8e75abbb)
- Elenco dei Vitest mirati: `esiti-noreg/elenco-test-l2.txt`, **94 file**. Sono i 70 di L1, più tutti i `*.test.ts(x)` nuovi o toccati in `server/`,
  `shared/` e `src/` fra ab3b1053 e 8e75abbb (34), più i vicini del §6 di modifiche.md (aree-mondo, ingressi, accesso-mondo, percorsi-map,
  stanze-planimetrie, cestino, AreaPage, QuartierePage, AccessoMondoPage, navigazioneMappa, CovoPage, OggiMappa).
- Giro previsto, quando il Collaudo lo consente (oggi c'è un ciclo di UX che scrive): impronta del codice ricalcolata e `git archive` uguale alla
  cartella; impronte e stato visibile su copia fresca col codice del commit; prove di funzionamento; 75 «Sulla mappa» nel browser di 5473 (63 alle
  case di L2 con lo spillo selezionato); metro; Vitest dei 94 file.

## 4-quater. Giro sul collaudo 8e75abbb (2026-10-20, 04:03–)
Esiti grezzi in `esiti-noreg/collaudo-8e75abbb/`.
- **Codice**: Collaudo `p5s-sviluppo-l2` a `8e75abbb42e2…`, albero pulito. Impronta col metodo del Collaudo
  `git diff 9634bbb5 HEAD -- server/ shared/ src/ | sha256sum` = **`18c4d350075ac57667d21534512f4ef737b0bb42f78b34b8f8bea618ad6d3ee0`**, uguale a
  `esiti-collaudo/impronta.txt`. `git archive 8e75abbb` = cartella del Collaudo per `src/`, `server/` e `shared/` (`diff -rq` vuoto). `codice.txt`.
- **Dati** (copia fresca della produzione, boot reale del codice estratto, 106 → 109, porta 3296; `dati.txt`):
  - `impronta.cjs` **identica** alla base;
  - estesa: destinazioni, pezzi, atterraggi, marcatori, perimetri e partite identici; nelle mappe dei Palazzi solo le colonne nuove a null;
  - impronta del mondo: solo le 2 colonne nuove degli ingressi; fotografia: 108 tabelle con i campi di prima identici, in `mappa` solo il
    genitore delle 5 del Covo, `area` 23;
  - **stato visibile p1/p2 0**, «Sulla mappa» (API) 0, indirizzi del mondo 0, **funzionamento 0 errori**;
  - API di **Palazzi e Memento identiche** alla base prima di L2 (`api.txt`).
- **Vitest nella cartella del Collaudo** (i 94 file di `elenco-test-l2.txt`, `--reporter=verbose`): `Test Files 94 passed (94)`,
  `Tests 802 passed (802)`, `EXIT=0`; `git status --porcelain` dopo: vuoto (`vitest-collaudo.txt`).
- **Browser su 5473** (base L2-base-8e75abbb ripristinata alle 04:07:14; mie letture 04:07:54–04:08:54, in parallelo a Test funzionali;
  `browser-5473.txt`):
  - **75 «Sulla mappa» riga per riga: 75/75 come la base**. Le 63 del mondo arrivano alle case di L2 (pagine Area di Central Street, Vicoli,
    Centro comm., Shujin 1P; pagine Quartiere di Ogikubo, Tsukishima, Shujin) con lo spillo selezionato e la scheda aperta; Palazzi e Memento
    restano nel visore. 49 ok, 9 senza spillo, 17 nascosti.
  - **Metro a grafica accesa**: nomi, immagini (byte per byte), posizioni e grandezze delle 10 fermate identici a prima di L1. Il DOM differisce
    **solo** nei 14 collegamenti dei quartieri (7 cartellini + 7 chip → `/guida/citta/<q>?ingresso=1`, decisione §7.1) e nel titolo del Covo
    («dal menu di gioco, dal 6/5» al posto di «la soffitta del Leblanc», §7.2). Riportati quei 15 punti a come erano, l'sha256 è **esattamente**
    quello di prima di L1 (`1061b932…`).
  - **Metro a grafica spenta** (04:13:57–04:14:12, dopo il «finito» di Test funzionali e il mio «spengo»): **identica a quella a grafica
    accesa** (stesso sha256 `1d6d23d2…`), quindi identica a prima di L1 salvo gli stessi 15 punti voluti. Preferenza rimessa vuota.
- **Esito del collaudo 8e75abbb: VERDE**, nessun difetto. Il lavoro da preservare è intatto, i 75 «Sulla mappa» sono uguali alla base, la metro
  e le API di Palazzi e Memento sono invariate salvo i cambiamenti voluti, e i Vitest danno 802/802.

## 4-quinquies. Giro breve sul collaudo de67b349 (correzioni FE del collaudo, solo `src/`, 17 file; 2026-10-20 04:21–)
Esiti in `esiti-noreg/collaudo-de67b349/`.
- **Codice**: HEAD `de67b349f702…`, albero pulito; impronta `git diff 9634bbb5 HEAD -- server/ shared/ src/` =
  **`01138ad04a762a7b34dc1b5b7817a27f876b34e657970872c713f72128e8071b`**, uguale a quella del Collaudo; `server/` e `shared/` invariati
  rispetto a 8e75abbb (0 file); `git archive de67b349` = cartella del Collaudo (`diff -rq` vuoto).
- **Dati** (copia fresca, boot reale del codice estratto 106 → 109): `impronta.cjs` **identica** alla base; estesa identica al collaudo 8e75abbb;
  fotografia: 111 tabelle identiche al collaudo 8e75abbb, in `area` cambia solo `updated_at` (orario della migrazione); **stato visibile 0**,
  «Sulla mappa» (API) 0, indirizzi 0, **funzionamento 0 errori**; le 38 risposte API sono identiche a quelle del collaudo 8e75abbb.
- **Vitest** nella cartella del Collaudo: i 94 file più `FinestreAree.test.tsx` (nuovo), 95 file: `Test Files 95 passed (95)`,
  `Tests 813 passed (813)`, `EXIT=0`; cartella pulita dopo.
- **Browser su 5473** (75 «Sulla mappa» e metro): dopo il ripristino del ciclo 2 di Test funzionali.

## 4-sexies. Giro breve sul collaudo finale 600af81c (cherry-pick di e9860334 su de67b349, 5 file di `src/`; 2026-10-20 04:26–)
Esiti in `esiti-noreg/collaudo-600af81c/`. Sostituisce il §4-quinquies (decisione del PM: il giro breve sul codice finale di L2).
- **Codice**: HEAD `600af81c4f6e…`, albero pulito; impronta `git diff 9634bbb5 HEAD -- server/ shared/ src/` =
  **`da68d62c407212f41fa6cceb1ca42cf1eb764565a19ba7ac6522d756bfd012cc`**, uguale a quella del Collaudo; rispetto a de67b349 cambiano solo
  VisoreMappa(.test).tsx, CovoPage(.test).tsx e tailwind.css; `git archive 600af81c` = cartella del Collaudo (`diff -rq` vuoto).
- **Dati** (copia fresca, boot reale del codice estratto 106 → 109): `impronta.cjs` **identica**; estesa identica al collaudo 8e75abbb;
  fotografia: 111 tabelle identiche, in `area` solo `updated_at`; **stato visibile 0**, «Sulla mappa» (API) 0, indirizzi 0,
  **funzionamento 0 errori**; le 38 risposte API identiche al collaudo 8e75abbb.
- **Vitest** nella cartella del Collaudo (95 file, VisoreMappa e CovoPage compresi): `Test Files 95 passed (95)`, `Tests 815 passed (815)`,
  `EXIT=0`; cartella pulita dopo.
- **Browser su 5473** (finestra del Collaudo dopo il ripristino delle 04:28:17; mie letture 04:28:55–04:30:10; `browser-5473.txt`):
  **75 «Sulla mappa» 75/75 come la base** (49 ok, 9 senza spillo, 17 nascosti; le 63 del mondo sulle case di L2); **metro** a grafica accesa e
  spenta con lo stesso sha256 del collaudo 8e75abbb (`1d6d23d2…`), quindi uguale a prima di L1 salvo i 14 collegamenti ai quartieri e il titolo
  del Covo. Grafica spenta 04:29:58–04:30:10, avvisato Test layout, preferenza rimessa vuota.
- **Esito del collaudo finale 600af81c: VERDE**, nessun difetto.

## 4-septies. Giro breve sul collaudo 2222d51f (UX2-12, testi del Cestino: 3 file di `src/`; 2026-10-20 04:36–)
Esiti in `esiti-noreg/collaudo-2222d51f/`.
- **Codice**: HEAD `2222d51f5235…`, albero pulito; impronta `git diff 9634bbb5 HEAD -- server/ shared/ src/` =
  **`4a38faa0f0c69b5a7adf25904854e9d5868adf343b823f7017d4281eb0a3dfd2`**, uguale a quella del Collaudo; rispetto a 600af81c cambiano solo
  `Cestino.tsx`, `Cestino.test.tsx` e `utils/cestino.ts`; `git archive 2222d51f` = cartella del Collaudo.
- **Dati** (copia fresca, boot reale 106 → 109): impronta identica; estesa identica; 111 tabelle identiche al collaudo 8e75abbb (in `area` solo
  `updated_at`); stato visibile 0, «Sulla mappa» 0, indirizzi 0, funzionamento 0 errori, 38 API identiche al collaudo 8e75abbb.
- **Vitest** nella cartella del Collaudo (96 file, `Cestino.test.tsx` compreso): `Test Files 96 passed (96)`, `Tests 823 passed (823)`, `EXIT=0`;
  cartella pulita dopo.
- **Browser su 5473** (letture dalle 04:37:43 alle 04:38:34; `browser-5473.txt`): **75/75 come la base**; metro a grafica accesa identica al
  collaudo 8e75abbb (`1d6d23d2…`). **Attenzione**: queste letture sono cadute nel ciclo 4 di Test UX (aperto dalle 04:36:57, «Rimuovi»
  dell'Area dello staff, che non riguarda i 75 né la metro). **Ripetute** sui dati ripristinati (ripristino delle 04:37:47; mie letture
  04:40:03–04:41:11): **75/75 come la base**; metro a grafica **accesa e spenta** identica al collaudo 8e75abbb (`1d6d23d2…`); grafica spenta
  04:40:56–04:41:11 con il via di Test layout, preferenza rimessa vuota.
- **Esito del collaudo 2222d51f: VERDE**, nessun difetto.

## 4-octies. Giro breve per il nuovo commit di rilascio di L2 — PREPARATO (2026-10-20 06:50), si lancia appena il Collaudo dà l'hash
Commit di correzione del giro 2 del validatore inclusi: `1cd41876` (R1 «da verificare» nell'indice, R2-28, FUN2-8 BE), `b6f3dd9a` (FUN2-9 BE),
`b0ebdad0` (FUN2-9 «Colloca», R6), `c43b8bc0` (R1 FE), `fcff89e3` (FUN2-8 FE). File toccati: `casaMappa.ts`, `mappeService.ts`, `areeService.ts`,
`shared/types.ts`, OpenAPI `mappe`/`aree`, `AreeDellaCitta.tsx`, `AlberoLuoghi.tsx`, `EditorMappaPage.tsx`.
Passi (stessi del §4-septies):
1. **Codice**: HEAD = hash del Collaudo, albero pulito; impronta `git diff 9634bbb5 <hash> -- server/ shared/ src/ | sha256sum` uguale a quella del
   Collaudo; elenco dei file cambiati rispetto a `2222d51f` = i soli file dei 5 commit (più quelli che il Collaudo dichiara); `git archive <hash>`
   uguale alla cartella del Collaudo.
2. **Dati** (copia fresca della produzione, avvio reale 106 → 109 col codice estratto, porta mia): impronta ed estesa identiche alla base; fotografia
   contro il collaudo 2222d51f (attese solo le colonne d'orario); stato visibile 0; indirizzi del mondo 0; funzionamento 0 errori; 38 API contro il
   collaudo 2222d51f — differenza attesa **solo** `area.daVerificare` (campo nuovo di R1: `true` per le 2 planimetrie dell'Area riservata allo staff,
   `false` altrove; già misurato in sviluppo, L3 §2-sexies) ed eventuali `planimetrie` da collocare con la chiave del genitore (FUN2-9).
3. **Vitest mirati** nella copia estratta (`git archive` + junction a `node_modules`, mai la suite intera): `server/routes/aree-mondo.test.ts`,
   `server/routes/mappe-editor.test.ts`, `server/routes/ingressi.test.ts`, `server/routes/stanze-planimetrie.test.ts`,
   `server/routes/immagine-mappa-unica.test.ts`, `server/routes/verifica-api.test.ts`, `src/pages/CittaPage.test.tsx`, `src/pages/AreaPage.test.tsx`,
   `src/pages/EditorMappaPage.test.tsx`, `src/components/mappe/OrganizzazioneMappe.test.tsx`, `src/components/mappe/FinestreAree.test.tsx`.
4. **Browser su 5473** (sola lettura, avvisando il Collaudo dell'orario): 75 «Sulla mappa» come la base (`base-sulla-mappa-20261020.json`); metro a
   grafica accesa identica al collaudo 8e75abbb (`1d6d23d2…`); a grafica spenta solo col via esplicito di chi sta leggendo, preferenza rimessa com'era.
5. Esito qui e nella lavagna; difetti in `difetti.md`.

## 4-novies. Giro breve sul commit di rilascio f19a117f (newreview-l2), base p5s-0503Z (2026-10-20 07:16–07:21 locali)
Esiti in `esiti-noreg/collaudo-f19a117f/`. Esito: **VERDE, nessun difetto**.
- **Codice.**
  - Commit `f19a117fe259…`. Impronta `git diff 9634bbb5 f19a117f -- server/ shared/ src/` = **`e2821885…97c7`** e solo giro 2 (`5ae62692..`) =
    **`326da4d3…8e3f`**: uguali a quelle del Collaudo.
  - Commit da `2222d51f`: `90137ce2` (DECISIONI R5), `5fd97d9f` (BE, scritto sul codice di rilascio al posto di 1cd41876/b6f3dd9a),
    `4e6119a6`, `98e3cc1c`, `f19a117f`. I 6 file FE sono identici a quelli di b0ebdad0/c43b8bc0/fcff89e3 (`git diff fcff89e3 f19a117f` vuoto).
  - 15 file cambiati, come dichiarato.
- **Dati** (copia della base p5s-0503Z, avvio reale 108 → 109, porta 3293; 109: aree 23, planimetrie 29, Covo spostato 5).
  - Contro la base, sulle colonne comuni: cambia solo il `genitore_chiave` delle 5 planimetrie del Covo; partite e dati nuovi dell'utente
    identici.
  - Contro il collaudo `2222d51f` sulla stessa base: 112 tabelle su 113 identiche; in `area` cambia solo `updated_at`, cioè l'ora della
    migrazione. Estesa identica.
- **API.**
  - Stato visibile p1/p2: 0. «Sulla mappa»: 0. Indirizzi del mondo: 0 su 115.
  - 38 endpoint contro `2222d51f`: unica differenza `area.daVerificare` (R1), su 29 voci dell'albero e 2 figli di Tokyo.
  - Funzionamento: **0 errori**, partita 1 e partita di prova. Script adeguato: con Kamoshida p1 tutto segnato toglie lo stato a una voce e lo
    rimette. Dopo le prove la partita 1 è identica, salvo l'`updated_at` di quella voce.
- **Vitest** nella copia estratta di f19a117f: 11 file (`aree-mondo`, `mappe-editor`, `ingressi`, `stanze-planimetrie`, `immagine-mappa-unica`,
  `verifica-api`, `CittaPage`, `AreaPage`, `EditorMappaPage`, `OrganizzazioneMappe`, `FinestreAree`) → **167/167**, exit 0.
- **Browser su 5473** (Collaudo avvisato; letture dalle 05:19:2xZ alle 05:20:31Z, solo GET, preferenza della grafica vuota e non toccata;
  partita attiva 1 al 06-02).
  - Metro a grafica accesa: `8ae61b2a…`, 9 posti. **Uguale** alla lettura su `2222d51f` delle 04:57Z. Contro la base L1 (`4c686acb…`)
    cambiano solo i link dei quartieri, come voluto da L2 (`/guida/citta/<q>?ingresso=1`).
  - **75 «Sulla mappa»: 75/75** come la base, con gli arrivi alle case di L2 e le due voci dei Palazzi ancora nel visore.

## 4-decies. Giro breve su 25012240 (f19a117f + cherry-pick di a7fe0aee: chip «1 da verificare» sulla carta di Tokyo, R1) — VERDE (07:38–07:41 locali)
Il PM ha chiesto un giro breve limitato ai file toccati.

- **Codice.** Impronte `9634bbb5..25012240` = **`4ec3badc…9d29`** e `5ae62692..` = **`75969858…0be7`**, uguali a quelle del Collaudo. Diff da
  f19a117f: solo `src/pages/MappaPage.tsx` (+46/−1) e `MappaPage.test.tsx` (+20). Il diff di MappaPage è identico byte per byte a quello di
  `a7fe0aee` (sha `14ec344a…`). Server, shared e dati non cambiano, quindi i confronti sui dati del §4-novies restano validi.
- **Vitest** nella copia estratta: 6 file (`MappaPage`, `OrganizzazioneMappe`, `CittaPage`, `AreaPage`, `EditorMappaPage`, `aree-mondo`) →
  **146/146**.
- **Browser su 5473.** Collaudo avvisato; letture dalle 05:40:02Z alle 05:41:09Z, solo GET, preferenza della grafica vuota e non toccata. Dati
  del collaudo: base p5s-0533Z.
  - `/guida/mappe`: sulla carta di Tokyo «**1 da verificare**», a carta chiusa: è l'unica occorrenza nella pagina.
  - **75/75 «Sulla mappa»** come la base, con gli stessi arrivi e pin del §4-novies.
  - Metro a grafica accesa **`8ae61b2a…`**, uguale a f19a117f.

**Hash finale di L2 per il validatore: `625475322b74…`.** Verificato: da 25012240 cambia solo `docs/ROADMAP.md` (1 riga); l'impronta del codice
`9634bbb5..625475322b74 -- server/ shared/ src/` resta **`4ec3badc…9d29`**. Il no-reg del §4-decies vale anche per questo hash.

## 4-undecies. Giro breve su 872ac976 (newreview-l2: 62547532 + cherry-pick di 126168a0, LAY2-7) — VERDE (07:58–08:00 locali)
Richiesta del PM, durante lo STOP generale: solo questo compito.
- **Codice.** Diff `62547532..872ac976`: solo `src/pages/MappaPage.tsx` (+10/−8), identico byte per byte a quello di `126168a0` (sha
  `4bb7e059…`). Impronte: `9634bbb5..872ac976 -- server/ shared/ src/` = **`3b466c27…47ce`**; `5ae62692..872ac976` = **`c9c70baf…2fba`**.
- **Dati.** `server/` e `shared/` non cambiano rispetto a f19a117f/25012240, quindi valgono i confronti del §4-novies. Il Collaudo ha
  controllato i suoi dati: rispetto a `L2-base-p5s-20261020-0533Z` cambia solo `immagine_miniatura`, cioè la cache.
- **Vitest** nella copia estratta di 872ac976: `MappaPage`, `OrganizzazioneMappe`, `CittaPage`, `AreaPage` → **79/79**.
- **Browser su 5473.** Collaudo avvisato; letture dalle 05:59:02Z alle 05:59:58Z, solo GET, preferenza della grafica vuota.
  - Carta di Tokyo «Città · 298 spilli · 52 mappe» con «**1 da verificare**», a carta chiusa: un'occorrenza.
  - **75/75 «Sulla mappa»**, stessi arrivi e pin del §4-novies.
  - Metro **`8ae61b2a…`**, uguale.

## 4-duodecies. R2 del giro 2 del validatore: no-reg completo su 292a122e (newreview-l2), base p5s-0533Z — VERDE (2026-10-20 08:43–08:47 locali)
Richiesta del PM (`correzioni-giro2.md`, R2). Esiti grezzi in `esiti-giro2/noreg/292a122e/`.

**Codice.** `872ac976..292a122e`: `115581b4` (UX2-13, miniature ritagliate sul disegno, generazione `r2`), `0268751a` (E4/E5/E7, conteggi
dell'indice), `3a056190` (UX2-15, una sola barra in Mappe), più 2 righe della ROADMAP. File: `miniatureService`, `shared/miniature`,
`immagineMappa`, `immaginiService`, rotta `immagini`, `AlberoLuoghi`, `MappaPage`. Impronte `9634bbb5..292a122e -- server/ shared/ src/` =
`ae85d7f8…d79a`, `5ae62692..292a122e` = `8564aaf5…190`.

**Metodo.** Due copie identiche della base p5s-0533Z (gioco `8a0c5a56…`, partite `f1554be9…`) con avvio reale, una col codice del giro
precedente verde (`872ac976`, porta 3288) e una con `292a122e` (porta 3289); fotografie, estese e API delle due istanze a confronto. Poi
letture su 5473 (Collaudo, su `292a122e`: verificato `git log` della sua cartella).

**Lavoro da preservare: identico.**
- Colonne comuni contro la base: cambiano solo le 5 planimetrie del Covo (109) e la cache delle miniature.
- Diario 04-01..06-01 **255**, spunte **342**.
- Perimetri: Kamoshida **169/359** (impronta 169/373), Madarame **227/254** (227/263).
- **«Prova» id 808**: riga di `mappa` e immagine (1 353 169 byte) identiche.
- Partite identiche.
- Contro `872ac976`: 111 tabelle su 113 identiche; in `area` cambia solo `updated_at` (ora della migrazione) e poi `immagine_miniatura`.
  L'estesa è identica.

**Pulizia della cache delle miniature all'avvio** (UX2-13). Le «regole sui dati» di `292a122e` riportano **`miniatureOrfane: 149`**: tutte le
149 righe della base, su 80 immagini, che avevano la versione `<created_at>` della generazione di prima.
- Con `872ac976` la stessa copia tiene le 149 righe e il riscaldamento non ne genera nessuna (`generate: 0`).
- Con `292a122e`, subito dopo la pulizia, il riscaldamento ne genera **68** (34 immagini × 2 misure) con versione **`<created_at>~r2`**.
- Le altre si rigenerano alla prima richiesta con `?l=`. Prova sulla «Prova» 808 a 320: la prima volta generata (WebP 320×265, 29 416 byte,
  ETag `…-r2-l320`); la seconda dalla cache con lo stesso ETag.
- Nessun'altra tabella toccata.
- Effetto atteso: la prima apertura delle pagine con illustrazioni rigenera le miniature (~1,8 s per il riscaldamento delle schede).

**API, 38 endpoint, tutti 200.**
- Con i `?v=` normalizzati: **0 differenze** contro `872ac976`.
- Grezzi (`GREZZO=1`): **124 differenze, tutte spiegate** (`spiega-v-r2.cjs`, `v-r2-spiegazione.txt`): ciascuna è lo stesso URL con
  `?v=<stessa data>~r2`, **0 non spiegate**.
- Sono tutte immagini **caricate delle mappe** (`/api/immagini/mappa/…`), cioè quelle a cui le viste aggiungono `l`:
  - illustrazioni di città, quartieri, Aree e Palazzi (`illustrazione.immagineUrl`);
  - `immagineUrl` dell'albero (33) e di Tokyo (19 figli + 1);
  - 3 `dettaglio.immagine.url` di spilli di Tokyo.
- Gli URL della grafica predefinita e degli stemmi non cambiano.

**Altri controlli.**
- Stato visibile p1/p2 contro `872ac976`: **0 differenze**. Kamoshida p1 169 gestite, 107/107, planimetrie 27/27; Madarame p1 224, 88/88.
- «Sulla mappa» (API): 255 voci del diario, 75 con mappa, 0 destinazioni diverse.
- Indirizzi del mondo: 0 su 115.

**Browser su 5473** (letture dalle 06:45:54Z alle 06:46:58Z, solo GET).
- Il Collaudo non è stato avvisato: la sua sessione risulta archiviata e il messaggio non è stato consegnato.
- Ho trovato `p5r-preferenze` = `{"graficaPredefinita":true,"vistaPersona":"piastrelle","menuRidotto":true,"mappaHomeChiusa":false}`:
  scritta da altri, non toccata, uguale alla fine.
- Metro a grafica accesa **`8ae61b2a…`**, uguale a 872ac976 e f19a117f: 9 posti, stessi byte. L'unico `?v=` grezzo del blocco è
  `2026-09-12T14:55:14.943Z~r2` (illustrazione di Tokyo).
- **75/75 «Sulla mappa»** (49 ok, 17 nascosti, 9 mappa), stessi arrivi e pin del §4-undecies.

**Esito R2, parte no-reg: VERDE**, nessun difetto. Il layout delle sei misure è di Test layout.

## 5. Casi preparati per i lotti successivi
### L3 «Palazzi: aree e infiltrazioni» (migrazione 110)
1. `impronta.cjs` identica per Kamoshida e Madarame; per il diario identica sui campi dell'impronta (colonne nuove fuori, a NULL).
2. **Stato visibile** p1/p2 voce per voce e pin per pin (`stato-visibile.cjs`, base in `l2base/out`): identico, con le stesse percentuali e
   gli stessi completamenti (R3-28…31).
3. Per ogni infiltrazione le stesse voci nello stesso ordine. Per ogni pin stessa planimetria, posizione e voci; destinazioni, pezzi, copie e
   atterraggi invariati (estesa). `punto_partita`/`spillo_partita` identici riga per riga.
4. Memento: `GET /api/compendio/dungeon/mementos` identica **byte per byte** (`api-istantanea.cjs`); pagina e visore identici (hash del DOM come in L1).
5. Aree del mondo di L2 invariate (tabella `area` del mondo identica riga per riga); metro e atterraggi.
6. **Pacchetto mappe, esporta → importa con «sovrascrivi» su Kamoshida e Madarame: impronta ED estesa identiche campo per campo**, compresi i
   quattro casi di L1 §5.A.4: `nome_rivisto` (38 planimetrie), `origine` dei 16 pin seed, `mappa_entita.fonte_json`, `updated_at` di
   `spillo_partita` e di mappe e pin non riscritti a valori uguali. In più `area`/`infiltrazione_area` dei Palazzi. Strumenti:
   `pacchetto-mappe.cjs`, `fotografia.cjs`, `confronta-estesa.cjs` **senza** ignorare `updated_at` per questo caso.
7. Diario: le 254 voci 04-01..06-01 identiche. Le 6 voci corrette dal team sono **dopo il 06-01**, con `da_rivedere = 1` e
   `testo_precedente_json` = i valori di prima, controllati campo per campo. La voce nuova (06-25) non sposta l'`ordine` di nessuna voce esistente.
8. 75 «Sulla mappa»: le 10 dei Palazzi → casa del Palazzo con lo stesso spillo; i 2 Memento invariati.
### L4 «Avanzamento unico» (gioco 111, partite 022)
1. `impronta.cjs` identica; `punto_interesse` 959 righe con i campi di prima identici; `carattere` tutto NULL.
2. `punto_partita` 525, `spillo_partita` e `spillo_voce` identici riga per riga (nessuna scrittura sugli stati).
3. **Stato visibile** p1/p2 voce per voce (`stato-visibile.cjs`): identico (R4-27). Pin: identico salvo i «da verificare» e i pin di sole
   descrittive; ogni differenza in un elenco, voce per voce e pin per pin.
4. `divergenza_partita`: numero esatto ed elenco (≤ 8, tutte p1 Kamoshida: pin 1982, 615, 1953, 583, 1970, 1971, 1992, 1993), confrontati con
   `spillo_partita.raccolto` della base.
5. Completamenti e percentuali: Kamoshida p2 completato; Madarame p1 manca il Tesoro (pin 811); Kamoshida p1 **non** completato (15 permanenti non
   segnate) → la differenza rispetto a oggi («Tesoro, boss finale e raccolto tutto (107/107)») va spiegata voce per voce (R4-28).
6. Memento identici (R4-30); diario invariato (R4-31); cestino che rimette voci e pin con il loro stato (R4-32).
