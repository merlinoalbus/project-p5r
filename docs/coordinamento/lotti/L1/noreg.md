# L1 «Immagini» — test no-reg

Sessione «Test no-reg — team p5s». Stato: **FATTA** (giro 2 del 2026-10-20 sul codice fermo `97323731…`, nessuna regressione: §6).

## 1. Base di confronto (2026-10-20)

Copia fresca della produzione, presa dalla copia del PM in sola lettura e verificata bit per bit:

| file | sha256 | user_version |
|---|---|---|
| gioco.db | `bf147547c245fbcebf3c816fa0315bcb23eb9573e0676ec2114c1bee65cb3db1` | 106 |
| partite.db | `780ea60e3fb17e8b71b0c6c027157785466fc6eea7b5842d256a404c5f56c441` | 21 |

Strumenti (tutti in sola lettura sui DB, nel mio scratchpad `…\79867d53-4ec1-4b44-8379-bf96cb5de1df\scratchpad\`):
- `impronta.cjs` del PM → `base\out\impronta.json`: **identico byte per byte** a `impronta-prod-20261020.json` del PM.
- `impronta-estesa.cjs` (mio) → indicizzata per uid/chiave, regge le rinumerazioni: segno `validata` del diario (se la colonna esiste),
  destinazioni degli spilli, pezzi e copie, atterraggi, mappe dei Palazzi (immagine, asset, ruolo), marcatori, **tutte** le tabelle di partite.db.
- `fotografia.cjs` + `confronta.cjs` (miei) → fotografia riga per riga di tutte le 111 tabelle (BLOB come sha256, schema compreso) e confronto
  aggiunte/tolte/cambiate colonna per colonna.
- `prova-funzionamento.cjs` (mio) → contro un'istanza avviata **sulla copia** (porta 3291, mai 3201/data/): per la partita reale e per una partita di
  prova creata lì, spunta/toglie una voce del diario (doti invariate), segna/toglie una voce di Kamoshida e una di Madarame (conteggio «gestiti»
  +1/−1), raccoglie/toglie un pin di ciascun Palazzo («presi» +1/−1), dettaglio dei Palazzi leggibile.

Conteggi della base:
- Diario 04-01..06-01: **254** voci, **338** spunte; segno `validata`: colonna non ancora presente (0).
- Palazzi in **due perimetri** (richiesta del PM; calcolati da `impronta-estesa.cjs`, sezione `perimetri`):

  | | Kamoshida | Madarame | definizione |
  |---|---|---|---|
  | **utente** — voci | **169** | **225** (fotografia del 19/10: 196) | voci della guida del Palazzo: `punto_interesse` delle sue `dungeon_area`, contenute comprese |
  | **utente** — pin | **359** | **252** (fotografia del 19/10: 250) | spilli con `origine='utente'` nell'albero delle mappe `dungeon-<k>` |
  | **impronta** — voci | 169 | 225 | come sopra (`impronta.cjs`: voci per area) |
  | **impronta** — pin | 373 | 261 | spilli dell'albero di ogni origine (369 / 258, di cui seed 10 / 6) **più** quelli senza mappa legati per `area_guida_chiave` (4 / 3) |
  | stati di voci / di pin (tutte le partite) | 302 / 472 | 221 / 276 | righe di `punto_partita` / `spillo_partita` per quelle voci e quei pin |

  Le cifre di Madarame della memoria (196 voci, 250 pin) non si ricavano con nessuna definizione sui dati del 20/10. Ho provato voci di primo
  livello (176), con fonte «utente» (214), con pin (195), senza «/» (214), non scorciatoie (189). Sono la fotografia del 19/10: 23 pin dell'utente di
  Madarame sono stati modificati il 19/10 (stessa conclusione di Analisi dati in lotti/L3/dati.md). Kamoshida torna esatto: 169 voci e 359 pin.
  **Base ufficiale, confermata dall'utente** (via PM, 2026-10-20): la copia del 20/10 nel perimetro «utente», cioè Kamoshida 169 voci e
  359 pin, Madarame 225 voci e 252 pin. Lo scarto di Madarame rispetto al 19/10 è l'ultima infiltrazione del Palazzo, inserita
  dall'utente il 20/10. Accanto riporto sempre il perimetro «impronta».
  Nei confronti di ogni lotto riporto i due perimetri con la loro definizione. Il confronto prima/dopo resta voce per voce e pin per pin, per chiave e uid.
- Destinazioni 223, pezzi 24, copie 42, atterraggi 3, mappe Kamoshida 27, Madarame 18, marcatori 196.
- Partite: 2 (1 «Partita Roberto» attiva al 06-01, 2 «Tutorial»); spillo_partita 748, punto_partita 525, evento_partita 1273.

Procedura per ogni lotto: copia fresca della base → boot reale del server (`npx tsx server/index.ts`, DATA_DIR = copia, porta 3291: backup di avvio,
migrazioni, regole all'avvio, come in produzione) → impronta, estesa e fotografia → confronto con la base → prove di funzionamento → fotografia dopo le prove
(differenze ammesse: solo righe della partita di prova, eventi del registro e `updated_at`) → test Vitest mirati con output grezzo.

## 1-bis. Base «Sulla mappa» del diario validato (per L2 e L3; richiesta del PM da lotti/L2/app.md §3)

Fonte: `GET /api/compendio/percorso/<giorno>?partita=1` per i 54 giorni 04-01..06-01, campo `mappa` di ogni azione (il pulsante
«Sulla mappa» apre `/guida/mappe/<chiave>?spillo=<id>`, `PercorsoPage.tsx:81`). Script `sulla-mappa.cjs` (sola lettura). Dati completi
(con url, nome della mappa, percorso, spillo per id e per **uid**) in `lotti/L1/base-sulla-mappa-20261020.json`.

- **254 voci, 75 con «Sulla mappa»**. Uguale sulla copia di produzione migrata (istanza 3291) e sull'istanza condivisa (3201, data/ a 108): 75 su 75 identiche, anche negli id.
- Per mappa: Central Street `001-3-0` 26, `citta-ogikubo` 9, `citta-tsukishima` 9, Vicoli `009-2-0` 8, `citta-shujin-academy` 6,
  Shujin 1P `002-0-0` 4, Centro comm. `001-4-0` 1 (= **63 verso il mondo**); Palazzi `153-1-0` 7 e `152-1-0` 3; Memento `190-1-0` 2.
  Le 6 di Shujin sono voci del Palazzo di Kamoshida: portano allo spillo d'ingresso in città.
- Ogni spillo indicato sta sulla mappa indicata. 9 voci non hanno spillo: 7 di Madarame e 2 dei Memento aprono la prima planimetria
  (`ingressoDelPalazzo`), senza spillo.
- **Prova nel browser** (FE 5373 → BE 3201, partita attiva 1 al 06-01, giorno; ognuno dei 19 indirizzi distinti aperto in un riquadro
  1280×800). Si guarda il titolo della pagina, il pin con `spillo-mappa--selezionato` e la scheda aperta (`role=dialog`) col nome dello spillo:
  - **49 voci** (15 indirizzi): mappa giusta, spillo evidenziato, scheda aperta;
  - **9 voci** (Madarame e Memento): mappa giusta, nessuno spillo;
  - **17 voci** (4 indirizzi): mappa giusta, ma lo spillo **non si vede** perché nella partita al 06-01 di giorno non è disponibile. Il visore
    lo nasconde («Mostra anche i non ancora disponibili» è spento), quindi niente evidenza e niente scheda:
    - Shujin 1656 «Palazzo di Kamoshida», intervallo 04-11 (1 voce);
    - Shujin 1616 «Palazzo di Kamoshida», intervallo 04-12..05-02 (5 voci);
    - Central Street 1517 Untouchable, la sera di giovedì, sabato e domenica (4 voci);
    - Vicoli 1588 Café Leblanc, solo la sera (7 voci).
    Comportamento di oggi, preesistente, non di un lotto. L'ho segnalato al PM come possibile tema di UX: dal diario di un giorno passato il
    pulsante porta a un punto che non si vede.
- **Come si prova in ogni lotto (L2, L3…)**: si rilancia `sulla-mappa.cjs` col confronto sulla base. Si confronta per uid della voce e per
  **uid dello spillo**, perché chiavi di mappa e id possono cambiare. Se cambia la chiave della mappa, deve restare lo stesso spillo, oppure
  la nuova Area/Quartiere che lo contiene, come prevede il lotto. Poi si rifà la prova nel browser con la stessa partita e la stessa fascia.
  Atteso: le stesse 49 voci evidenziate, le stesse 9 senza spillo, le stesse 17 nascoste per disponibilità.

| giorno | voce (uid) | riferimento | mappa di oggi | spillo id | spillo uid | spillo | esito di oggi |
|---|---|---|---|---|---|---|---|
| 04-11 giorno | f3d6ddf19b62f76616e3de65ac00f2b9 | dungeon:kamoshida | citta-shujin-academy (Shujin Academy) | 1656 | 552fe35369f31e660cdf9c0339f9fae5 | Palazzo di Kamoshida | mappa giusta, spillo nascosto: intervallo 04-11 |
| 04-12 giorno | e4290542b3376439f92c71b76e18b64e | dungeon:kamoshida | citta-shujin-academy (Shujin Academy) | 1616 | e1e1c93f6d728e15c55714e0ccf7d474 | Palazzo di Kamoshida | mappa giusta, spillo nascosto: intervallo 04-12..05-02 |
| 04-12 giorno | 13c631e03c8cb988f4d6da57c7b52e92 | confidente:ryuji | citta-ogikubo (Ogikubo) | 226 | e391fa8e4c1a1ed230c1a9a441f4e0b2 | Ristorante di ramen di Ogikubo | OK, evidenziato |
| 04-15 giorno | 6fd5031403067e22f9306de902cf57a6 | dungeon:kamoshida | citta-shujin-academy (Shujin Academy) | 1616 | e1e1c93f6d728e15c55714e0ccf7d474 | Palazzo di Kamoshida | mappa giusta, spillo nascosto: intervallo 04-12..05-02 |
| 04-15 giorno | 3a1bfca2ba3cc6ff5f08759d30014ee1 | confidente:ann | nativo-rmap-001-3-0 (Central Street) | 1518 | e35be70aca8f6c5694c28babf23d012f | Palestra Protein Lovers | OK, evidenziato |
| 04-15 sera | facb16e6353e1aa8b09790829685812f | confidente:morgana | nativo-rmap-152-1-0 (Prigione sotterranea - Tutorial) | 1667 | 48e4a0ded674ade68acc2b24224a860a | Morgana | OK, evidenziato |
| 04-16 giorno | 92228393531757698705e5c4c07c725e | confidente:takemi | citta-tsukishima (Tsukishima) | 230 | 46340f110463d8149fc265fb343810f2 | Ristorante di monjayaki | OK, evidenziato |
| 04-18 giorno | 225dcbea63fa93599b5197e583b8692a | negozio:triple-seven | nativo-rmap-001-3-0 (Central Street) | 1525 | d3da3e007e1020adb816f39429171558 | Triple Seven | OK, evidenziato |
| 04-18 giorno | 402239f2465b3a075aa7271a6e5f2093 | confidente:takemi | citta-tsukishima (Tsukishima) | 230 | 46340f110463d8149fc265fb343810f2 | Ristorante di monjayaki | OK, evidenziato |
| 04-19 giorno | a23f1d80397aa8315af64e911c3cdf5e | confidente:ryuji | citta-ogikubo (Ogikubo) | 226 | e391fa8e4c1a1ed230c1a9a441f4e0b2 | Ristorante di ramen di Ogikubo | OK, evidenziato |
| 04-20 giorno | a513390589dcbc75a7ae4ef1aa798d06 | dungeon:kamoshida | citta-shujin-academy (Shujin Academy) | 1616 | e1e1c93f6d728e15c55714e0ccf7d474 | Palazzo di Kamoshida | mappa giusta, spillo nascosto: intervallo 04-12..05-02 |
| 04-21 giorno | 854d79fc18c6f19dc2a653dfb0bfb2ba | dungeon:kamoshida | citta-shujin-academy (Shujin Academy) | 1616 | e1e1c93f6d728e15c55714e0ccf7d474 | Palazzo di Kamoshida | mappa giusta, spillo nascosto: intervallo 04-12..05-02 |
| 04-22 giorno | cdc7e3a818e612b94efe7853135f7617 | dungeon:kamoshida | citta-shujin-academy (Shujin Academy) | 1616 | e1e1c93f6d728e15c55714e0ccf7d474 | Palazzo di Kamoshida | mappa giusta, spillo nascosto: intervallo 04-12..05-02 |
| 04-22 giorno | 0c4dfcf2769bd6c8104fe25327dec13f | confidente:morgana | nativo-rmap-152-1-0 (Prigione sotterranea - Tutorial) | 1667 | 48e4a0ded674ade68acc2b24224a860a | Morgana | OK, evidenziato |
| 04-23 giorno | 2ddbe4c2896e1ed13eb12b6c803d4184 | negozio:untouchable | nativo-rmap-001-3-0 (Central Street) | 1517 | e0ba38d4af4b9e0869f482a315cbe38e | Untouchable | mappa giusta, spillo nascosto: sera, gio/sab/dom |
| 04-23 giorno | 84ede5808ffdc89c3d93dbf8f8f2fbd3 | negozio:libreria-taiheido | nativo-rmap-001-3-0 (Central Street) | 1524 | 1bb2eb4ad1f9ca9d5eaf38facfd0ba9a | Libreria Taiheido | OK, evidenziato |
| 04-23 giorno | 170682887a6ab33e1b6dd07eaa0f0df4 | confidente:ryuji | citta-ogikubo (Ogikubo) | 226 | e391fa8e4c1a1ed230c1a9a441f4e0b2 | Ristorante di ramen di Ogikubo | OK, evidenziato |
| 04-23 sera | fdc77152bf8a86d9e594540d8e2cde5f | confidente:sojiro | nativo-rmap-009-2-0 (Vicoli) | 1588 | 78cdcd31833e3489fa3e5d21e811dfbd | Café Leblanc | mappa giusta, spillo nascosto: solo sera |
| 04-25 giorno | c554129b8ffd2be194a80b295c57c966 | confidente:takemi | citta-tsukishima (Tsukishima) | 230 | 46340f110463d8149fc265fb343810f2 | Ristorante di monjayaki | OK, evidenziato |
| 04-26 giorno | a15b63cdc169d4f9b2635f12c46748ce | negozio:fiorista-rafflesia | nativo-rmap-001-4-0 (Centro comm. sotterraneo) | 1537 | 8fb6439228f402c49636d5892e5bdd65 | Fiorista | OK, evidenziato |
| 04-26 sera | 2452c2f5cabc2a5848d8850f05375b74 | confidente:sojiro | nativo-rmap-009-2-0 (Vicoli) | 1588 | 78cdcd31833e3489fa3e5d21e811dfbd | Café Leblanc | mappa giusta, spillo nascosto: solo sera |
| 04-27 giorno | 952a633fdc723b71212596c1c2f15031 | confidente:ryuji | citta-ogikubo (Ogikubo) | 226 | e391fa8e4c1a1ed230c1a9a441f4e0b2 | Ristorante di ramen di Ogikubo | OK, evidenziato |
| 04-27 sera | 20449887b636d5a3168b14cb8c1ea7d9 | confidente:sojiro | nativo-rmap-009-2-0 (Vicoli) | 1588 | 78cdcd31833e3489fa3e5d21e811dfbd | Café Leblanc | mappa giusta, spillo nascosto: solo sera |
| 04-28 giorno | 3d33931ee2a8e28ad69f5ce7248d63e5 | confidente:ryuji | citta-ogikubo (Ogikubo) | 226 | e391fa8e4c1a1ed230c1a9a441f4e0b2 | Ristorante di ramen di Ogikubo | OK, evidenziato |
| 04-28 sera | 9a5349e0e798b99ce64f9f1d89d573fc | confidente:sojiro | nativo-rmap-009-2-0 (Vicoli) | 1588 | 78cdcd31833e3489fa3e5d21e811dfbd | Café Leblanc | mappa giusta, spillo nascosto: solo sera |
| 04-29 giorno | 8a3e3ceb0688893254d388e26003686d | confidente:takemi | citta-tsukishima (Tsukishima) | 230 | 46340f110463d8149fc265fb343810f2 | Ristorante di monjayaki | OK, evidenziato |
| 04-30 sera | 1f60857f775875f813d98f3d62af6964 | confidente:sojiro | nativo-rmap-009-2-0 (Vicoli) | 1588 | 78cdcd31833e3489fa3e5d21e811dfbd | Café Leblanc | mappa giusta, spillo nascosto: solo sera |
| 05-01 giorno | 71875b8dc0c047ad764741a6ca6aa49a | negozio:distributore-shibuya-sala-giochi | nativo-rmap-001-3-0 (Central Street) | 1515 | 9f17173a30379b04a06e6d4998916f62 | Sala giochi (Central Street) | OK, evidenziato |
| 05-04 giorno | aeb2d2e8e418d3b7418893b4472cc5d0 | negozio:untouchable | nativo-rmap-001-3-0 (Central Street) | 1517 | e0ba38d4af4b9e0869f482a315cbe38e | Untouchable | mappa giusta, spillo nascosto: sera, gio/sab/dom |
| 05-04 sera | f7e59f3b0f0a428c0d698aa17dd0d310 | confidente:ann | nativo-rmap-001-3-0 (Central Street) | 1518 | e35be70aca8f6c5694c28babf23d012f | Palestra Protein Lovers | OK, evidenziato |
| 05-06 giorno | 419ee48be0f88671ae34670067e3e306 | confidente:mishima | nativo-rmap-001-3-0 (Central Street) | 1519 | 35365b5ad91bed1731af603df2f635c5 | Videonoleggio Scarlet | OK, evidenziato |
| 05-06 giorno | e24ed2a444abb68bcfc8fa2909ea182e | confidente:ann | nativo-rmap-001-3-0 (Central Street) | 1518 | e35be70aca8f6c5694c28babf23d012f | Palestra Protein Lovers | OK, evidenziato |
| 05-06 sera | 8422adb6363761e2ff146665f7032ea2 | confidente:ann | nativo-rmap-001-3-0 (Central Street) | 1518 | e35be70aca8f6c5694c28babf23d012f | Palestra Protein Lovers | OK, evidenziato |
| 05-07 giorno | e7adb0bcac77591a2d811cc5cce4519d | dungeon:mementos | nativo-rmap-190-1-0 (Memento - aree fisse) | — | — | — (si apre la planimetria, senza spillo) | OK, mappa aperta |
| 05-08 giorno | 7e57bd30904dfd8a2e59a8dd7e9a57d9 | confidente:mishima | nativo-rmap-001-3-0 (Central Street) | 1519 | 35365b5ad91bed1731af603df2f635c5 | Videonoleggio Scarlet | OK, evidenziato |
| 05-09 giorno | 84750a563733527a0c65acbdcb7c5d2b | dungeon:mementos | nativo-rmap-190-1-0 (Memento - aree fisse) | — | — | — (si apre la planimetria, senza spillo) | OK, mappa aperta |
| 05-09 giorno | 397837f2e58a1abfcf0ae9bd0c3b11fd | confidente:ryuji | citta-ogikubo (Ogikubo) | 226 | e391fa8e4c1a1ed230c1a9a441f4e0b2 | Ristorante di ramen di Ogikubo | OK, evidenziato |
| 05-09 sera | 21884ede0c011dee7ebfff5917c8642b | confidente:yoshida | nativo-rmap-001-3-0 (Central Street) | 1516 | 94e5ccab33cab8dd0d8be3d99ae16637 | Ore no Beko (Gyudon) | OK, evidenziato |
| 05-10 giorno | 9f2e94d4763cd4c31f51d8a0fd6b726b | negozio:distributore-shujin-cortile | nativo-rmap-002-0-0 (Edificio principale 1P / Edificio laboratori 1P) | 292 | 4f09aeb32069759f1d62f21dac842bba | Distributore Cortile | OK, evidenziato |
| 05-10 giorno | 0b37e645127776b0e5e8ddf60debf680 | negozio:distributore-shibuya-sala-giochi | nativo-rmap-001-3-0 (Central Street) | 1515 | 9f17173a30379b04a06e6d4998916f62 | Sala giochi (Central Street) | OK, evidenziato |
| 05-10 giorno | da894e6588150279969562429207f250 | confidente:ryuji | citta-ogikubo (Ogikubo) | 226 | e391fa8e4c1a1ed230c1a9a441f4e0b2 | Ristorante di ramen di Ogikubo | OK, evidenziato |
| 05-10 sera | 39965e251eb93ff3da77b9e0c67bd556 | confidente:yoshida | nativo-rmap-001-3-0 (Central Street) | 1516 | 94e5ccab33cab8dd0d8be3d99ae16637 | Ore no Beko (Gyudon) | OK, evidenziato |
| 05-16 giorno | 445731a85c54f6d1fa541f10ee8c64d1 | dungeon:madarame | nativo-rmap-153-1-0 (Entrata del Museo) | — | — | — (si apre la planimetria, senza spillo) | OK, mappa aperta |
| 05-16 sera | bc4ee27dd69a84a6ef298024ddc36a88 | confidente:ryuji | citta-ogikubo (Ogikubo) | 226 | e391fa8e4c1a1ed230c1a9a441f4e0b2 | Ristorante di ramen di Ogikubo | OK, evidenziato |
| 05-18 giorno | 989ec15a917e69e787e907deb2895464 | negozio:distributore-shujin-cortile | nativo-rmap-002-0-0 (Edificio principale 1P / Edificio laboratori 1P) | 292 | 4f09aeb32069759f1d62f21dac842bba | Distributore Cortile | OK, evidenziato |
| 05-18 giorno | 651fab949e5c708964a1b5db57e7f14f | negozio:distributore-shibuya-sala-giochi | nativo-rmap-001-3-0 (Central Street) | 1515 | 9f17173a30379b04a06e6d4998916f62 | Sala giochi (Central Street) | OK, evidenziato |
| 05-18 giorno | ffa20a4c3b2d4076e9bdc1f8e85c5bef | confidente:takemi | citta-tsukishima (Tsukishima) | 230 | 46340f110463d8149fc265fb343810f2 | Ristorante di monjayaki | OK, evidenziato |
| 05-19 giorno | cea365dae255a9787afdf99661e5aa0f | dungeon:madarame | nativo-rmap-153-1-0 (Entrata del Museo) | — | — | — (si apre la planimetria, senza spillo) | OK, mappa aperta |
| 05-20 giorno | 464ccfe40659a41b6b201947ed776312 | dungeon:madarame | nativo-rmap-153-1-0 (Entrata del Museo) | — | — | — (si apre la planimetria, senza spillo) | OK, mappa aperta |
| 05-21 giorno | a920c1bb939c24a23d598b7dcdd8ff9f | confidente:ann | nativo-rmap-001-3-0 (Central Street) | 1518 | e35be70aca8f6c5694c28babf23d012f | Palestra Protein Lovers | OK, evidenziato |
| 05-21 giorno | 450615930d64d4d13c7ce8bcde74b8ba | confidente:ann | nativo-rmap-001-3-0 (Central Street) | 1518 | e35be70aca8f6c5694c28babf23d012f | Palestra Protein Lovers | OK, evidenziato |
| 05-21 sera | 2267efe9623181552b83b87f764ee2d9 | confidente:sojiro | nativo-rmap-009-2-0 (Vicoli) | 1588 | 78cdcd31833e3489fa3e5d21e811dfbd | Café Leblanc | mappa giusta, spillo nascosto: solo sera |
| 05-22 giorno | dd09f8eabd9747cf39adb40ccdc92d5f | confidente:takemi | citta-tsukishima (Tsukishima) | 230 | 46340f110463d8149fc265fb343810f2 | Ristorante di monjayaki | OK, evidenziato |
| 05-22 sera | 0c85aee40878e0b1b52badfe14ee8ae5 | negozio:clinica-takemi | nativo-rmap-009-2-0 (Vicoli) | 1592 | 92f3dbd016dcbb3fd7ddaf8af98b745d | Clinica Medica Takemi | OK, evidenziato |
| 05-22 sera | d1ac527b4a930f13b8e8c05570b80832 | confidente:yoshida | nativo-rmap-001-3-0 (Central Street) | 1516 | 94e5ccab33cab8dd0d8be3d99ae16637 | Ore no Beko (Gyudon) | OK, evidenziato |
| 05-23 giorno | c24d835b473b826274c75cb06b375e46 | confidente:yusuke | citta-tsukishima (Tsukishima) | 230 | 46340f110463d8149fc265fb343810f2 | Ristorante di monjayaki | OK, evidenziato |
| 05-23 giorno | 0d1f1318757c0119a6407810ad3a245e | negozio:triple-seven | nativo-rmap-001-3-0 (Central Street) | 1525 | d3da3e007e1020adb816f39429171558 | Triple Seven | OK, evidenziato |
| 05-23 sera | 8bdc0a9fc464a11e04b3898d8140b0c3 | negozio:distributore-shibuya-sala-giochi | nativo-rmap-001-3-0 (Central Street) | 1515 | 9f17173a30379b04a06e6d4998916f62 | Sala giochi (Central Street) | OK, evidenziato |
| 05-24 giorno | fe9c3fc7031fd1afbabece0d8555bf8d | confidente:ann | nativo-rmap-001-3-0 (Central Street) | 1518 | e35be70aca8f6c5694c28babf23d012f | Palestra Protein Lovers | OK, evidenziato |
| 05-25 giorno | 5d42bb3ccd79e0398a64209cb263c905 | confidente:takemi | citta-tsukishima (Tsukishima) | 230 | 46340f110463d8149fc265fb343810f2 | Ristorante di monjayaki | OK, evidenziato |
| 05-25 sera | e71d57b12a2399d474644a33b3e5f829 | confidente:ryuji | citta-ogikubo (Ogikubo) | 226 | e391fa8e4c1a1ed230c1a9a441f4e0b2 | Ristorante di ramen di Ogikubo | OK, evidenziato |
| 05-26 giorno | 3db7636b34a050c0eec2f987a5ec1b41 | confidente:ann | nativo-rmap-001-3-0 (Central Street) | 1518 | e35be70aca8f6c5694c28babf23d012f | Palestra Protein Lovers | OK, evidenziato |
| 05-27 giorno | 18d5cfd8ad3f5dfbc15d5c4d55cbb65c | negozio:negozio-scolastico | nativo-rmap-002-0-0 (Edificio principale 1P / Edificio laboratori 1P) | 293 | 4b0335e1c877dbe4691bda9d9e0b2203 | Panetteria | OK, evidenziato |
| 05-27 giorno | faff017a6f660faaf0f9170768d401d3 | negozio:distributore-shujin-cortile | nativo-rmap-002-0-0 (Edificio principale 1P / Edificio laboratori 1P) | 292 | 4f09aeb32069759f1d62f21dac842bba | Distributore Cortile | OK, evidenziato |
| 05-27 giorno | c2547d02f288c1af3b8bf425cada0818 | negozio:untouchable | nativo-rmap-001-3-0 (Central Street) | 1517 | e0ba38d4af4b9e0869f482a315cbe38e | Untouchable | mappa giusta, spillo nascosto: sera, gio/sab/dom |
| 05-27 giorno | 6ebb178b6fc4009d3335635446a2c864 | dungeon:madarame | nativo-rmap-153-1-0 (Entrata del Museo) | — | — | — (si apre la planimetria, senza spillo) | OK, mappa aperta |
| 05-27 giorno | e2312ec57c58764c58184ac6c860a822 | dungeon:madarame | nativo-rmap-153-1-0 (Entrata del Museo) | — | — | — (si apre la planimetria, senza spillo) | OK, mappa aperta |
| 05-28 giorno | e10bf1a42113ba7b0989bd89bfe4c98f | confidente:takemi | citta-tsukishima (Tsukishima) | 230 | 46340f110463d8149fc265fb343810f2 | Ristorante di monjayaki | OK, evidenziato |
| 05-28 sera | 19f03ef3b2a6b5bf0b6880858f71e5b0 | confidente:sojiro | nativo-rmap-009-2-0 (Vicoli) | 1588 | 78cdcd31833e3489fa3e5d21e811dfbd | Café Leblanc | mappa giusta, spillo nascosto: solo sera |
| 05-29 giorno | 9254eba5a15ee14c99d7afc1f8b30fda | negozio:untouchable | nativo-rmap-001-3-0 (Central Street) | 1517 | e0ba38d4af4b9e0869f482a315cbe38e | Untouchable | mappa giusta, spillo nascosto: sera, gio/sab/dom |
| 05-29 giorno | 2476ffa179261f362310915765e6e2a3 | negozio:triple-seven | nativo-rmap-001-3-0 (Central Street) | 1525 | d3da3e007e1020adb816f39429171558 | Triple Seven | OK, evidenziato |
| 05-29 sera | 862cc4bd2f3ebb5a2e37c92dbb3e029a | confidente:yoshida | nativo-rmap-001-3-0 (Central Street) | 1516 | 94e5ccab33cab8dd0d8be3d99ae16637 | Ore no Beko (Gyudon) | OK, evidenziato |
| 05-31 giorno | fa2b6c8b9e1397c05ed9ce3c042ca299 | dungeon:madarame | nativo-rmap-153-1-0 (Entrata del Museo) | — | — | — (si apre la planimetria, senza spillo) | OK, mappa aperta |
| 06-01 giorno | b9371f8061aedd71262a200b98d18bd0 | dungeon:madarame | nativo-rmap-153-1-0 (Entrata del Museo) | — | — | — (si apre la planimetria, senza spillo) | OK, mappa aperta |
| 06-01 sera | 826b3d7a82184f63248ffcece670abdc | confidente:morgana | nativo-rmap-152-1-0 (Prigione sotterranea - Tutorial) | 1667 | 48e4a0ded674ade68acc2b24224a860a | Morgana | OK, evidenziato |

## 2. Giro di prova del banco (stato della cartella di sviluppo al 2026-10-20 01:42: commit bd20ed72 + modifiche non committate di BE)

Non è il collaudo di L1 (BE/FE non sono «fatte»): serve a provare il banco. Esito grezzo:

```
migrazione 107: ruolo dell'immagine dedotto dalla gerarchia — mappe: 1,
  cambiate: yongen-java-banchina-della-metropolitana  illustrazione-editoriale → planimetria-nativa
versioni prima {"gioco.db":106,"partite.db":21} dopo {"gioco.db":107,"partite.db":21}
# gioco.db:mappa: righe 317 → 317; aggiunte 0, tolte 0, cambiate 1
  ~ yongen-java-banchina-della-metropolitana
      ruolo_immagine: "illustrazione-editoriale" → "planimetria-nativa"
tabelle invariate: 110 su 111
IMPRONTA-IDENTICA   ESTESA-IDENTICA
```

Prove di funzionamento: **22 OK, 0 KO** (partita 1 e partita di prova 3; Kamoshida della partita 1 ha già tutti i pin raccolti, 107/107).
Dopo le prove, le sole differenze sono quelle attese: partita 3 (con i suoi 23 confidenti e 5 doti iniziali), 7 eventi del registro, `partita.updated_at`
della 1, e 10 righe `spillo_partita` con `raccolto=0`.

Osservazione (comportamento preesistente, non di L1): togliere una voce o un pin lascia la riga `spillo_partita` con `raccolto=0` invece di cancellarla
(in produzione ce ne sono già 81 su 748). Equivale all'assenza per l'interfaccia, ma nei confronti per conteggio dei «stati pin» va tenuto presente.

## 3. Test Vitest per area (mirati: si eseguono solo le aree toccate e le vicine, mai la suite)

- **Migrazioni e ruolo dell'immagine (L1)**: `server/db/migrations/107_ruolo_dalla_gerarchia.test.ts`, `106_ruolo_delle_immagini_caricate.test.ts`,
  `082_nome_rivisto_mappa.test.ts`, `079_immagini_nel_database.test.ts`, `067_identita_stabile_degli_spilli.test.ts`, `103_copie_dei_pezzi.test.ts`, `index.test.ts`.
- **Immagini e mappe (server)**: `server/routes/immagine-mappa-unica.test.ts`, `mappe-editor.test.ts`, `piante-citta.test.ts`, `citta.test.ts`, `ingressi.test.ts`,
  `verifica-mappe.test.ts`, `server/services/mappe/collezioniImmagini.test.ts`, `sincronizzaMappe.test.ts`, `organizzazioneMappe.test.ts`, `alberoMappe.test.ts`, `avvioImmutabile.test.ts`.
- **Palazzi (lavoro da preservare)**: `server/routes/dungeon.test.ts`, `planimetrie-palazzo.test.ts`, `planimetrie-aree-multiple.test.ts`, `sulla-mappa-palazzo.test.ts`,
  `guida-pin.test.ts`, `posizioni-spilli.test.ts`, `destinazioni-spilli.test.ts`, `atterraggio-palazzi.test.ts`, `palazzo-completato.test.ts`, `condizioni-pin.test.ts`, `condizioni-voce.test.ts`.
- **Pezzi e pacchetto**: `server/routes/pezzi-mappa.test.ts`, `server/services/pacchetto/ricaricaPezzi.test.ts`, `server/services/pacchettoGiocoService.test.ts`,
  `server/services/pacchettoDeposito.test.ts`, `src/utils/pezziMappa.test.ts`, `src/utils/raggruppaSpilli.pacchetto.test.ts`.
- **Diario**: `server/routes/percorso.test.ts`, `src/utils/percorso.test.ts`, `src/pages/PercorsoPage.test.tsx`, `server/db/migrations/033_percorso_11_aprile.test.ts`.
- **Interfaccia delle immagini (L1)**: `src/components/mappe/ImmagineMappaUnica.test.tsx`, `MappaTokyo.test.tsx`, `VisoreMappa.test.tsx`, `IngressoQuartiere.test.tsx`,
  `OrganizzazioneMappe.test.tsx`, `CollezioniImmagini.test.tsx`, `src/pages/CittaPage.test.tsx`, `MappaPage.test.tsx`, `EditorMappaPage.test.tsx`,
  `DungeonDettaglioPage.test.tsx`, `DungeonPage.test.tsx`, `src/stores/assetStore.test.ts`, `src/utils/assetPredefiniti.test.ts`, `vite/assetPredefiniti.test.ts`,
  `src/components/shared/AssetImg.test.tsx`, `ImmagineEntita.test.tsx`, `ImmagineEntitaFedele.test.tsx`, `immaginiCache.test.ts`.
- **Vicine (guida dei Palazzi e dei Dedali, toccate dalle fixture di BE)**: `src/components/guida/AreeDelDedalo.test.tsx`, `GuidaDellArea.test.tsx`, `TramaDellArea.test.tsx`,
  `RaccoltaPlanimetrie.test.tsx`, `src/utils/dedali.test.ts`, `src/utils/palazzi.test.ts`, `src/utils/punti.test.ts`.

Comando: `npx vitest run --reporter=verbose <elenco>` dalla cartella di sviluppo, output grezzo in `l1-noreg\vitest-*.txt` del mio scratchpad.

## 4. Casi no-reg di L1 da eseguire a BE/FE «fatte» (da modifiche.md, «Piano dei test» e «Casi aggiunti»)
1. Impronta, estesa e fotografia della copia migrata vs base: unica differenza ammessa la Banchina (`ruolo_immagine`), più quel che BE dichiara in be.md.
2. Prove di funzionamento su partita reale e partita di prova.
3. Pacchetto mappe: esporta → importa sulla copia (stessa istanza) → fotografia invariata; esporta e importa **una mappa nuova** (F9: asset dichiarato solo se esiste, o null).
4. Pezzi: caricamento/sostituzione/rimozione dell'immagine su una mappa con pezzi → 409 senza conferma; pezzi e copie invariati.
5. Collezioni di Yongen-Jaya (etichette delle mappe sorelle prima/dopo la 107).
6. La metro (`MappaTokyo`) identica allo schermo «prima»; i Memento in `DungeonDettaglioPage` invariati.
7. Test Vitest delle aree del §3 con output grezzo.

## 5. Esito del collaudo L1 — giro 1 (2026-10-20, 02:05–02:16)

Codice collaudato: cartella di sviluppo `newreview` al commit bd20ed72 più le modifiche non committate di BE e FE, impronta
`569e97c9…` (sha256 di `git diff` + file nuovi, in `esiti-noreg/codice-collaudato.txt`). Esiti grezzi in `lotti/L1/esiti-noreg/`.

**Attenzione: durante il giro FE ha modificato `src/`.** I file sono `MappaTokyo.tsx` (02:12:56), `segniMappa.ts` (02:12:44),
`SagomaQuartiere.tsx` (02:13:23), `IllustrazioneConSegno.tsx` (02:14:33), `tailwind.css` (02:14:57) e `DungeonDettaglioPage.tsx`
(02:15:13): sono le correzioni di UX-1/2/3 e LAY-1. `server/` e `shared/` non sono cambiati dopo l'inizio, quindi la parte dati (A) vale.
La parte d'interfaccia (B) va **rifatta** sul codice stabile.

### A. Parte dati e server — VERDE
1. **Migrazioni su copia fresca** (boot reale, porta 3291): `migrazione 107 … mappe: 1, yongen-java-banchina-della-metropolitana
   illustrazione-editoriale → planimetria-nativa`; `id 108 miniature_delle_immagini applicata`; riscaldamento `immagini 34, generate 68`.
   Confronto con la base (`confronto-migrazione.txt`):
   ```
   versioni prima {"gioco.db":106,"partite.db":21} dopo {"gioco.db":108,"partite.db":21}
   + table|immagine_miniatura          + TABELLA NUOVA gioco.db:immagine_miniatura (68 righe)
   ~ mappa yongen-java-banchina-della-metropolitana  ruolo_immagine: "illustrazione-editoriale" → "planimetria-nativa"
   tabelle invariate: 109 su 112      IMPRONTA-IDENTICA      ESTESA-IDENTICA
   ```
   I due perimetri sono invariati. Perimetro utente: Kamoshida 169 voci, 359 pin; Madarame 225 voci, 252 pin. Perimetro impronta: 169/373 e
   225/261. Diario: 254 voci, 338 spunte, uguali voce per voce. Partite: tutte le tabelle identiche.
2. **Prove di funzionamento** (partita reale 1 e partita di prova 3): **22 OK, 0 KO** (diario, voci e pin di Kamoshida e Madarame, dettaglio).
3. **«Sulla mappa» (API)**: 75 su 75 identiche alla base in tutti i campi, id compresi, sulla copia migrata. Identiche anche su
   3201/data/ (108).
4. **Pacchetto mappe, esporta → importa con «sovrascrivi»** su Kamoshida (27 mappe, 369 spilli, 10 pezzi, 10 copie) e Madarame (18 mappe,
   258 spilli, 14 pezzi, 32 copie). Stesso giro, sulla stessa base, col **codice L1** (3292) e col **codice di prima di L1** (6b3dfb99,
   estratto nello scratchpad, 3293):
   - impronta del PM **identica** dopo il giro con entrambi i codici; estesa identica in pezzi, copie, atterraggi, marcatori, partite
     (tolti `updated_at`); destinazioni identiche per uid;
   - i due giri differiscono **solo** in: (a) `palazzo-di-madarame-il-labirinto-contorto.asset` `"mappe/…"` → `null`. È F9 voluto: quella riga
     della grafica predefinita non esiste; immagine mostrata, ruolo, dimensioni, 1 pezzo, 3 copie e 17 spilli invariati. (b) il rinnovo delle
     4 miniature delle immagini reimportate (108). Diff in `giro-diff.txt`;
   - comportamenti **già presenti prima di L1** (identici nei due giri, non regressioni). Li segnalo al PM perché toccano il lavoro
     dell'utente se un giorno reimporta un pacchetto:
     - `nome_rivisto` 1 → 0 su 38 planimetrie dei due Palazzi (voluto dalla 082, `mappeService.ts:1725`). I nomi restano gli stessi, ma la
       presentazione della stanza torna a usare il nome del gruppo;
     - i 16 spilli `seed` dell'albero diventano `utente` (l'importazione da Impostazioni marca tutto «utente»). Il perimetro utente dei
       pin passerebbe da 359/252 a 369/258;
     - `mappa_entita.fonte_json.dichiarata` «editor» → «pacchetto», più 2 legami `dungeon` dichiarati;
     - `spillo_partita.updated_at` riscritto su 725 righe (gli stati `raccolto` restano uguali);
     - gli id interni di spilli, pezzi e copie sono rinumerati; un atterraggio passa da `spillo_id` 1657 a 2354 con lo stesso uid.
     → Il PM (2026-10-20) ha assegnato i quattro comportamenti dell'importazione a **L3**, che riscrive il pacchetto mappe. Nel no-reg di L3
       rifaccio lo stesso giro esporta → importa: impronta ed estesa identiche, campi compresi (`nome_rivisto`, origine dei pin,
       `mappa_entita`, `updated_at`).
5. **F9 e pezzi** (`f9-pezzi.txt`): **13 OK, 0 KO**. Mappa nuova senza asset → `asset null`, ruolo «nessuna»; esportata con
   `asset`/`assetOriginale` null; eliminata e reimportata → ancora null. Su `palazzo-di-madarame-il-labirinto-contorto` (1 pezzo, 3 copie) e
   `nativo-rmap-153-6-0` (6 pezzi, 21 copie): sostituzione PUT, da-url (409 prima dello scarico), DELETE singola e DELETE in blocco
   dell'ambito → tutte **409 `mappa-con-pezzi`** con i conteggi. Pezzi e copie invariati; fotografia prima/dopo: cambiano solo le 2 righe
   del cestino delle mie mappe di prova.

### B. Parte d'interfaccia — DA RIFARE sul codice stabile (risultati del giro 1, solo indicativi)
- **75 «Sulla mappa» nel browser** (FE 5373 → 3201, partita 1 al 06-01, giorno): 75/75 come la base (49 evidenziati, 9 senza spillo,
  17 nascosti per disponibilità).
- **Metro** (La città; FE di prima su 3293 e FE L1 su 3292, stessi dati, grafica predefinita **accesa**): 10 fermate con lo stesso nome,
  indirizzo, posizione e collegamento; immagini identiche byte per byte; DOM del blocco identico (sha256 `1061b932…`), tolto il solo
  `?v=` di versione che L1 aggiunge agli indirizzi. Con la grafica **spenta** la metro non è identica a prima: è **UX-2**, già aperto da
  UX, che non riapro.
- **Memento** (`/guida/dungeon/mementos`): DOM uguale a prima tranne lo stemma da 48 px della fascia `lg`, diviso in `lg:block xl:hidden` +
  `xl:block`, entrambi da 48 px. Normalizzato quel blocco, l'sha256 coincide (`77da3b70…`). Il visore `/guida/mappe/memento` è identico.
- **Vitest mirati** (70 file, `--reporter=verbose`, `vitest-noreg.txt`): `Test Files 1 failed | 69 passed (70)`, `Tests 1 failed | 587 passed (588)`,
  `EXIT=1`. Il fallito è `src/components/mappe/ImmagineMappaUnica.test.tsx:101` («con la grafica predefinita spenta non c'è»): la sagoma ora
  c'è (`src="/sagoma-shibuya.png"`), perché `SagomaQuartiere.tsx` è stato cambiato alle 02:13 per UX-2 mentre il test era già in corsa. Non è
  un difetto da aprire: è il lavoro di FE in corso. Da rieseguire a correzione chiusa.

## 6. Esito del collaudo L1 — giro 2, sul codice fermo (2026-10-20, 02:29–02:36) — **FATTA, nessun difetto**

Partito dopo l'avviso di FE «correzioni di UX-1/2/3 e LAY-1 finite, src/ fermo». Rifatto **tutto**, parte A compresa, perché anche `server/`
era cambiato durante il giro 1 (FUN-1/O2 di BE: `immagineMappa.ts`, `mappeService.ts`, 02:15–02:16). Esiti grezzi in
`lotti/L1/esiti-noreg/giro2/`.

Codice collaudato: impronta `5a72f748…` (inizio del giro: migrazione, browser, pacchetto, F9, pezzi, funzionamento). Alle 02:34:45 FE ha
tolto da `src/stores/assetStore.ts` la funzione `useRisolviAsset`, che nessuno usava più (`grep` vuoto; `MappaTokyo.tsx` fermo dalle 02:12:56):
codice morto, senza effetto su ciò che avevo già provato. Impronta finale `97323731…`, **invariata** durante l'ultimo giro dei Vitest.

**A. Dati e server (copie fresche della base, boot reale)**
1. Migrazioni (`confronto-migrazione.txt`): 107 → solo la Banchina (`ruolo_immagine` illustrazione-editoriale → planimetria-nativa);
   108 → tabella `immagine_miniatura` (68 righe); `tabelle invariate: 109 su 112`; **IMPRONTA-IDENTICA, ESTESA-IDENTICA**.
   Perimetro utente: Kamoshida 169 voci, 359 pin; Madarame 225 voci, 252 pin. Perimetro impronta: 169/373 e 225/261. Diario: 254 voci,
   338 spunte. Partite identiche.
2. «Sulla mappa» (API): 75/75 identiche alla base in tutti i campi (copia migrata) e uguali sull'istanza condivisa 3201.
3. Pacchetto mappe, esporta → importa su Kamoshida e Madarame, **codice L1 contro codice di prima** (6b3dfb99): impronta identica dopo il
   giro con entrambi; destinazioni 0/223 diverse per uid; pezzi, copie, atterraggi, marcatori e partite identici. Il diff fra i due giri
   (`giro-diff.txt`) è lo stesso del giro 1: solo F9 su `palazzo-di-madarame-il-labirinto-contorto.asset` (`"mappe/…"` → null) e il rinnovo
   di 4 miniature. I comportamenti preesistenti dell'importazione sono identici nei due codici e sono assegnati a L3 (§5.A.4).
4. F9 e pezzi: **13/13 OK**. Fotografia prima/dopo: solo le 2 righe del cestino delle mie mappe di prova.
5. Prove di funzionamento (partita reale e partita di prova): **22/22 OK**.

**B. Interfaccia**
1. **Metro** (`/guida/citta`, FE di prima su 3293 contro FE L1 su 3292, stessi dati):
   - grafica **accesa**: DOM identico (sha256 `1061b932…`, tolto il solo `?v=` di versione); 10 fermate con lo stesso nome, indirizzo,
     posizione e collegamento; le 10 immagini identiche byte per byte;
   - grafica **spenta**: DOM **identico a prima**, lo stesso `1061b932…`, con le stesse 10 sagome e stemmi. **UX-2 sulla metro risulta
     risolto.** Lo chiude chi l'ha aperto (UX).
2. **Memento** (`/guida/dungeon/mementos`): con la grafica accesa e con quella spenta il DOM è uguale a prima, tranne lo stemma da 48 px della
   fascia `lg`, diviso in `hidden lg:block xl:hidden` + `hidden xl:block` (sempre 48 px, quindi stessa resa a ogni larghezza). Normalizzato
   quel blocco, gli sha256 coincidono con quelli di prima: accesa `77da3b70…`, spenta `56194877…`.
3. **75 «Sulla mappa» nel browser** (FE 5373 → 3201, partita 1 al 06-01, giorno): **75/75 come la base**: 49 evidenziati con la scheda,
   9 senza spillo, 17 nascosti per disponibilità.
4. **Vitest mirati** (70 file, `--reporter=verbose`). Primo lancio (`vitest-noreg.txt`): 594/594, EXIT=0, ma partito 11 s prima del cambio
   di `assetStore.ts`. Secondo lancio sul codice fermo (`vitest-noreg-2.txt`): `Test Files 70 passed (70)`, `Tests 594 passed (594)`, `EXIT=0`.
   `ImmagineMappaUnica.test.tsx:101` è verde nella versione riscritta da FE per UX-2.

### Esito del giro 2
**Nessuna regressione, nessun difetto aperto dal no-reg.** Il lavoro dell'utente è intatto e funzionante dopo 107 e 108 e dopo il giro del
pacchetto: diario validato, Kamoshida, Madarame, pin, pezzi, copie, destinazioni, atterraggi, stati delle partite. La metro e i Memento
sono identici a prima di L1. Fase noreg di L1: **fatta**. Se BE o FE cambiano ancora `server/`, `shared/` o `src/` prima della
validazione, il giro va rifatto: l'impronta del codice di riferimento è `97323731…`.

## 7. Giro sul collaudo e9fb4871 (2026-10-20, 02:56–03:02) — VERDE

Richiesta del PM per G7 del validatore: provare che il codice collaudato è il commit. Esiti grezzi in `esiti-noreg/collaudo-e9fb4871/`.

**Codice.** Collaudo: cartella `p5s-sviluppo-l2`, HEAD `e9fb48719bcf…`, albero pulito. Impronta del codice
`git diff bd20ed72 HEAD -- server/ shared/ src/ | sha256sum` = **`77a017dab975f3e27f5eae7a65127ad8a10c09f26927df84a004258d6d67b654`**:
calcolata da me sul Collaudo e sul commit, coincide con `esiti-collaudo/impronta.txt`. Per le prove sui dati ho estratto il commit con
`git archive e9fb4871` nello scratchpad; `diff -rq` di `src/`, `server/` e `shared/` contro la cartella del Collaudo: nessuna differenza.
Rispetto ad ab3b1053 il commit cambia `QuartierePage.tsx` (G6, scarico della pianta), aggiunge `QuartierePage.scarico.test.tsx` e tocca
NOTICE, GPL-3.0 e DECISIONI (non codice).

1. **Impronte su copia fresca** (base di produzione, boot reale del codice e9fb4871, porta 3296): 107 → solo la Banchina; 108 → `immagine_miniatura`
   (68 righe); `tabelle invariate: 109 su 112`; **IMPRONTA-IDENTICA, ESTESA-IDENTICA** (diario 254/338; Kamoshida 169 voci, 359 pin utente;
   Madarame 225 voci, 252 pin utente; perimetro impronta 169/373 e 225/261; partite identiche).
2. **Prove di funzionamento: 22/22 OK** (partita reale 1 e partita di prova 3: diario, voci e pin di Kamoshida e Madarame, dettaglio).
3. **«Sulla mappa»**: API 75/75 identiche alla base. Nel **browser del Collaudo** (FE 5473 → BE 3301, partita 1 al 06-01, giorno, `userVersion` 108)
   tutti i 19 indirizzi sono uguali alla base: **49 evidenziati, 9 senza spillo, 17 nascosti**.
4. **Metro** (FE 5473): DOM del blocco con sha256 **`1061b932…`**, lo stesso del codice di prima di L1, sia con la grafica **accesa** sia
   **spenta**; le 10 immagini identiche byte per byte. La preferenza del browser del Collaudo l'ho trovata vuota e l'ho lasciata vuota.
5. **Vitest mirati nella cartella del Collaudo** (i 70 file di §3 + `src/pages/QuartierePage.scarico.test.tsx`, `--reporter=verbose`):
   `Test Files 71 passed (71)`, `Tests 596 passed (596)`, `EXIT=0`. `git status --porcelain` del Collaudo dopo i test: vuoto.

6. **`data/` del Collaudo**, letto in sola lettura dopo il giro: `impronta.cjs` **identica** alla base di produzione, estesa identica
   (`collaudo-data.txt`). Effetto collaterale delle mie GET nel browser: **2 righe di cache** in `immagine_miniatura` (immagini 390 e 391,
   Sottopasso `001-2-0`/`001-2-1`, larghezza 160, `2026-10-20T00:58:47.995Z`), generate dalle anteprime alla prima richiesta. Le ho segnalate al
   Collaudo: erano le righe 72 → 74 del suo ciclo 1, che il ripristino delle 00:59:52Z ha già tolto (verificato alle 01:00:41Z: 72 righe, nessuna
   delle due; `lotti/L1/esiti-collaudo/cicli-dati.md`). Nessun'altra scrittura; la preferenza del browser di 5473 è
   rimessa com'era (vuota).

**Esito:** il commit e9fb4871 (impronta `77a017da…`) non ha regressioni sul lavoro da preservare né su metro, Memento (codice invariato da
ab3b1053 in quei file) e «Sulla mappa». Nessun difetto.

## 8. Giro sul collaudo e2cc3ca8 (2026-10-20, 03:13–)

Commit da validare `e2cc3ca897d5…` (branch `newreview-l2`, padre e9fb4871). Rispetto a e9fb4871 cambiano solo commenti, nomi dei test
e documenti: 14 file, +18/−17. Esiti grezzi in `esiti-noreg/collaudo-e2cc3ca8/`.

**Codice.** `git diff bd20ed72 HEAD -- server/ shared/ src/ | sha256sum` = **`d6c658574aaa1e9e9c1fb4daef13830d238e6765ec91996d2f6a1d9da72b09ce`**:
è lo stesso valore calcolato sul Collaudo e sul commit dalla cartella di sviluppo, e coincide con quello dichiarato dal PM. Il Collaudo è
pulito (`git status --porcelain` vuoto). `git archive e2cc3ca8` è uguale alla cartella del Collaudo per `src/`, `server/` e `shared/` (`diff -rq` vuoto).

1. **Impronte su copia fresca** (base di produzione, boot reale del codice estratto da e2cc3ca8, porta 3296): 107 → solo la Banchina;
   108 → `immagine_miniatura` (68); `tabelle invariate: 109 su 112`; **IMPRONTA-IDENTICA, ESTESA-IDENTICA** (diario 254/338;
   Kamoshida 169/359; Madarame 225/252; partite identiche).
2. **Prove di funzionamento: 22/22** (0 errori; 25 righe OK con salute, creazione della partita di prova e «tutto raccolto» di Kamoshida).
   Per errore le ho lanciate due volte sulla mia copia: anche il secondo lancio 0 errori. L'unico effetto è una partita di prova in più nella
   copia usa e getta.
3. **«Sulla mappa» (API)**: 75/75 identiche alla base.
4. **Vitest mirati nella cartella del Collaudo** (70 file + `QuartierePage.scarico.test.tsx`, `--reporter=verbose`): `Test Files 71 passed (71)`,
   `Tests 596 passed (596)`, `EXIT=0`; `git status --porcelain` dopo i test: vuoto; nessun «2026-10-21» nei titoli.
5. **Browser del Collaudo** (ciclo 3 del Collaudo `L1-ciclo3-noreg-e2cc3ca8`, foto delle 03:14, mie prove 03:15–03:19 ora italiana;
   FE 5473 → BE 3301, `userVersion` 108, partita 1 al 06-01, giorno):
   - **75 «Sulla mappa»: 75/75 come la base** (49 evidenziati con la scheda, 9 senza spillo, 17 nascosti), tutti rimasti su `/guida/mappe/…`,
     senza aprire nessun quartiere (avvertenza del Collaudo sullo scarico automatico della pianta);
   - **metro** (`/guida/citta`): sha256 del DOM **`1061b932…`**, lo stesso di prima di L1, con la grafica **accesa** e **spenta**; le 10 immagini
     identiche byte per byte. La preferenza del browser, trovata vuota, è rimessa vuota;
   - solo GET; fine prove comunicata al Collaudo per il confronto e il ripristino del ciclo.

6. **Nota N1 del validatore** — esito grezzo della parte nel browser: `browser-5473.txt` (stato, riepilogo dei 75, metro accesa e spenta con
   sha256 e byte). La tabella dei 75 riga per riga con la destinazione aperta, che nel ciclo 3 non avevo stampato, l'ho prodotta nel
   **ciclo 4** del Collaudo (checkout 84165da5 = e2cc3ca8 più la sola ROADMAP, stessa impronta del codice; 03:24–03:25:46):
   `sulla-mappa-75-righe.txt`, 19 righe, **75/75 uguali alla base** (49 ok, 17 nascosti, 9 senza spillo), tutte rimaste su `/guida/mappe/…`.

**Esito:** il commit e2cc3ca8 (impronta del codice `d6c65857…`) è **verde** in tutte le prove no-reg di L1. Nessun difetto.

### Esito del giro 1
Nessun difetto nuovo. La fase noreg restava **in corso** (superato dal giro 2, §6). Alla fine delle correzioni FE (UX-1, UX-2, UX-3, LAY-1) rifaccio la parte B: i 75 nel
browser, la metro (accesa e spenta, contro il codice di prima), i Memento e i Vitest mirati. Rifaccio anche la parte A se nel frattempo
cambiano `server/` o `shared/`.
