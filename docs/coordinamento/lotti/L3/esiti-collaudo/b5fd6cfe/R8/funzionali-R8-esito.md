# R8 (F7 del validatore, giro 1 di L3) — ciclo di scrittura su `newreview-l3` = b5fd6cfe (Test funzionali)

- **Istanza:** collaudo FE 5473 / BE 3301 (userVersion 113), base p5s 0948Z. Pagine aperte in un iframe **1280×800**.
- **Foto del Collaudo:** 17:21:59Z, identica alla base 0948Z.
- **Scritture:** dalla **17:22:49.593Z** alla **17:29:55.868Z**; ripristino affidato al Collaudo.
- **Come sono fatti i gesti:** dall'interfaccia, con i clic sui pulsanti delle finestre. I valori sono inseriti con il setter nativo e l'evento
  `input`; l'immagine è un PNG 640×400 disegnato su un canvas e messo nel campo file con `DataTransfer`.
- **Risposte API grezze:** registrate dal `fetch` della pagina (metodo, indirizzo, stato, corpo inviato, inizio della risposta).
- **Fuori dall'interfaccia, solo preparazione:** la partita di prova del 04-20 (creazione, 77 punti segnati, eliminazione) e le fotografie del DB.
  Le fotografie si prendono su una copia ottenuta con l'API di backup, in sola lettura (`funzionali-foto.cjs`).
- **GET che scrive:** la miniatura `?l=320` della planimetria nuova ha scritto la cache `immagine_miniatura`.
- Solo testo, nessuna schermata.

## 1. Aggiungi area (F3-19) — Okumura, dall'infiltrazione «Linea Esportazioni»

**Passi**
1. `/guida/dungeon/okumura?infiltrazione=okumura-05-linea-esportazioni`, pulsante «Aggiungi area».
2. Nella finestra «Aggiungi un'area a Palazzo di Okumura»: Nome «Prova R8 area», immagine, etichetta «Livello 1».
   La casella «5. Linea Esportazioni» è già spuntata (l'infiltrazione aperta).
3. Pulsante «Aggiungi area».

**Atteso:** l'area compare subito nell'elenco e nel visore, senza «scegli una planimetria».

**Ottenuto ✅**
- `POST /api/aree/dungeon/okumura?nome=Prova+R8+area&etichetta=Livello+1&infiltrazioni=okumura-05-linea-esportazioni` → **201**
  `{"data":{"chiave":"dungeon/okumura/prova-r8-area",…,"predefinita":"palazzo-di-okumura-prova-r8-area","illustrazione":{"immagineUrl":"/api/immagini/mappa/palazzo-di-okumura-prova-r8-area/file?v=2026-10-20T17%3A22%3A49.584Z~r2"},…}`.
- La pagina va subito su `/guida/dungeon/okumura/area/prova-r8-area?infiltrazione=okumura-05-linea-esportazioni`.
- Nell'elenco delle aree c'è «12. Prova R8 area», legata a «5. Linea Esportazioni».
- Nel visore c'è l'immagine caricata (640×400), senza «scegli una planimetria».
- **Osservazione per Test UX, non è un difetto funzionale:** la riga dell'area nuova, che è vuota, dice «(completata) · niente da raccogliere · completa».

## 2a. Aggiungi planimetria (F3-20)

**Passi:** sull'area nuova, «Aggiungi planimetria» → immagine, etichetta «Livello 2» → «Aggiungi».

**Atteso:** ruolo dedotto dal server; la versione nuova si apre nel visore appena caricata.

**Ottenuto ✅**
- `POST /api/aree/dungeon/okumura/prova-r8-area/planimetrie?etichetta=Livello+2` → **201** (`numeroPlanimetrie: 2`).
- La pagina va su `…/area/prova-r8-area?infiltrazione=okumura-05-linea-esportazioni&planimetria=palazzo-di-okumura-prova-r8-area-livello-2`.
- Selettore delle versioni: «Livello 2 · nessun pin · versione 2 di 2». Nel visore c'è l'immagine 640×400.
- `GET /api/mappe/palazzo-di-okumura-prova-r8-area-livello-2`: `tipo` area, `ruoloImmagine` planimetria-nativa, `versioneOrdine` 1,
  casa `…/area/prova-r8-area?planimetria=…-livello-2` (`funzionali-api-dopo-aggiunte.txt`).

## 2b. Aggiungi infiltrazione (F3-21)

**Passi**
1. «Aggiungi infiltrazione» → modulo «Nuova infiltrazione».
2. Nome «Prova R8 infiltrazione», descrizione, posto «Dopo «5. Linea Esportazioni»» (predefinito).
3. Aree toccate: Caserma e Prova R8 area.
4. «Crea l'infiltrazione».

**Atteso:** compare subito nell'elenco e sulle aree scelte.

**Ottenuto ✅**
- `POST /api/compendio/dungeon/okumura/aree`
  `{"nome":"Prova R8 infiltrazione","descrizione":"Infiltrazione di prova del ciclo R8.","dopo":"okumura-05-linea-esportazioni","areePalazzo":["caserma","prova-r8-area"]}`
  → **201** `{"data":{"chiave":"okumura-prova-r8-infiltrazione","nome":"Prova R8 infiltrazione","ordine":5}}`.
- La scheda si apre su `?infiltrazione=okumura-prova-r8-infiltrazione`, con il selettore «Infiltrazione 6 di 11: 6. Prova R8 infiltrazione».
- Il pannello «Infiltrazioni in quest'area» di Caserma elenca «3. Caserma, 6. Prova R8 infiltrazione».

## 3. «Modifica aree» di un'infiltrazione (F3-22)

**Passi**
1. Menu «Altro ▾» dell'infiltrazione → «Modifica aree».
2. Finestra «Aree toccate da «Prova R8 infiltrazione»»: prima «1. Caserma, 2. Prova R8 area».
3. «Sposta su Prova R8 area», poi «+ Interscambio» → «1. Prova R8 area, 2. Caserma, 3. Interscambio».
4. «Salva».

**Atteso:** legami e ordine salvati; voci e pin invariati.

**Ottenuto ✅**
- `PUT /api/compendio/aree/okumura-prova-r8-infiltrazione/aree-palazzo?partita=1` `{"aree":["prova-r8-area","caserma","interscambio"]}` → **200**.
- API: `areePalazzo` dell'infiltrazione = prova-r8-area, caserma, interscambio.
- Le tre aree mostrano l'infiltrazione fra le loro (`funzionali-api-dopo-aggiunte.txt`).
- Riaperta la scheda su `?infiltrazione=okumura-prova-r8-infiltrazione`, si apre la **prima** area, «Prova R8 area»
  («Livello 1 · si apre per prima · versione 1 di 2»).
- `punto_interesse` 56 e `spillo` 167 di Okumura invariati (fotografia `pre-elimina` contro `base`).

## 4. Elimina un'area e un'infiltrazione, poi «Rimetti com'era» dal cestino (F3-24)

Fotografia «prima» (`pre-elimina`) presa subito prima: le dieci tabelle sono `area`, `dungeon_area`, `infiltrazione_area`, `punto_interesse`, `mappa`,
`spillo`, `spillo_voce`, `mappa_entita`, `voce_infiltrazione` e `cestino`, per Okumura e per il diario.

**Passi**
1. `/guida/dungeon/okumura/area/caserma?infiltrazione=okumura-03-caserma` → «Elimina area».
   La finestra «Eliminare Caserma?» dice: «Si eliminano l'area, la sua planimetria con 14 pin e i legami con 2 infiltrazioni. Le voci della
   guida restano nelle loro infiltrazioni. Finisce nel cestino…». → «Elimina».
2. Infiltrazione «Caserma»: «Altro ▾» → «✎ Modifica testo» → «Elimina».
   L'avviso dice: «Se ne va dalla guida per tutte le partite, con i suoi 6 punti e quel che le partite ne avevano segnato; le aree del Palazzo
   restano… Finisce nel cestino…». → «Confermo».
3. Impostazioni → Cestino: «Rimetti com'era» sull'infiltrazione, poi sull'area.

**Atteso:** tornano versioni, legami, voci e pin.

**Ottenuto ✅**
- Area: `DELETE /api/aree/dungeon/okumura/caserma?conferma=1` → **204**.
  La scheda torna su `?infiltrazione=okumura-03-caserma` («Quest'infiltrazione non tocca ancora aree»). Caserma non è più nell'elenco.
- Infiltrazione: `DELETE /api/compendio/aree/okumura-03-caserma` → **204**. La scheda torna su `/guida/dungeon/okumura` («Infiltrazione 1 di 10»).
- Fotografia dopo le due eliminazioni (`funzionali-confronto-prima-dopo-elimina.txt`):
  - via l'area Caserma, la mappa `nativo-rmap-156-13-0`, i suoi 14 pin e il suo `mappa_entita`;
  - via i 6 punti di `okumura-03-caserma` e 2 legami;
  - le infiltrazioni successive scalano di ordine;
  - nel cestino entrano 2 elementi: «Infiltrazione di Palazzo di Okumura: Caserma con 6 voci della guida» e
    «Area di Palazzo di Okumura: Caserma con 1 planimetria e 14 pin».
- Rimetti dal cestino:
  - `POST /api/impostazioni/cestino/19/ripristina` → **200** `{"tipo":"area","chiave":"okumura-03-caserma","rimesse":33,"saltate":[],"partiteMancanti":false}`;
  - `POST /api/impostazioni/cestino/18/ripristina` → **200** `{"tipo":"area-fisica","chiave":"dungeon/okumura/caserma","rimesse":661,"saltate":[],"partiteMancanti":false}`.
- Fotografia dopo il cestino contro quella di prima (`funzionali-confronto-prima-elimina-dopo-cestino.txt`): **10 tabelle su 10 identiche riga per riga,
  `updated_at` compresi**. Tornano area, versione, 14 pin, legami (anche quello con l'infiltrazione di prova, all'ordine 1), 6 voci, `mappa_entita`
  e l'ordine delle infiltrazioni. Il cestino torna com'era: 1 elemento, la «Prova» di Kamoshida della base.
- Nell'interfaccia `?infiltrazione=okumura-03-caserma` riapre «Infiltrazione 3 di 11: 3. Caserma» con l'area Caserma.

## 5. Le 9 voci di R3-37b e il 04-20 (diario, `/guida/percorso/<giorno>`, partita 1 attiva al 06-02)

Per ogni voce:
1. stato «prima»;
2. «Conferma» della proposta;
3. il collegamento della voce, seguito fino all'arrivo («Entra»);
4. «Modifica» → «Togli» (ogni infiltrazione) → «Fatto»;
5. stato «dopo», da confrontare con quello «prima».

La partita 1 ha Kamoshida e Madarame conclusi, quindi ogni infiltrazione è completata: apre l'ultima dell'insieme, che qui coincide con quella confermata.

| giorno · voce (uid) | Conferma (PUT …/percorso/voci/<uid>?partita=1) | collegamento dopo la conferma → arrivo | «Togli» | dopo = prima |
|---|---|---|---|---|
| 04-11 «Prima infiltrazione tutorial…» (f3d6ddf1…) | 200 `{"infiltrazioni":["kamoshida-1-tutorial-palazzo-11-04"]}` | `/guida/dungeon/kamoshida?infiltrazione=kamoshida-1-tutorial-palazzo-11-04` → «Infiltrazione 1 di 7: 1. Tutorial Palazzo 11/04» | 200 `{"infiltrazioni":[]}` | ✅ (collegamento dell'atterraggio `…152-2-0?spillo=1657` e proposta di nuovo) |
| 04-12 «Seconda infiltrazione tutorial…» (e4290542…) | 200 `["kamoshida-tutorial-palazzo-12-04"]` | `?infiltrazione=kamoshida-tutorial-palazzo-12-04` → «2 di 7: 2. Tutorial Palazzo 12/04» | 200 `[]` | ✅ (`/guida/mappe/palazzo-di-kamoshida-sala-centrale`) |
| 04-15 «Palazzo di Kamoshida, terza incursione…» (6fd50314…) | 200 `["kamoshida-tutorial-palazzo-15-04"]` | `?infiltrazione=kamoshida-tutorial-palazzo-15-04` → «3 di 7: 3. Tutorial Palazzo 15/04» | 200 `[]` | ✅ (`…cancello-del-castello-nativo-rmap-151-1-0`) |
| 04-22 «Si va automaticamente al Palazzo…» (cdc7e3a8…) | 200 `["kamoshida-rubare-i-desideri-del-cuore"]` | `?infiltrazione=kamoshida-rubare-i-desideri-del-cuore` → «7 di 7: 7. Rubare i desideri del Cuore» | 200 `[]` | ✅ (`…cancello-del-castello-nativo-rmap-151-1-0`) |
| 05-16 «Palazzo di Madarame: infiltrazione iniziale.» (445731a8…) | 200 `["madarame-01-entrata-del-museo"]` | `/guida/dungeon/madarame?infiltrazione=madarame-01-entrata-del-museo` → «1 di 5: 1. Prima Infiltrazione al Museo» | 200 `[]` | ✅ (`?infiltrazione=madarame-01-entrata-del-museo&daVoce=445731a8…`) |
| 05-16 «Primo accesso al Palazzo di Madarame» (3fb31dde…, senza riferimento, quindi senza collegamento) | 200 `["madarame-01-entrata-del-museo"]` | nessun collegamento (giusto: la voce non apre il Palazzo); campo «1. Prima Infiltrazione al Museo» | 200 `[]` | ✅ (finestra: «Nessuna: la voce non dice ancora in quale infiltrazione avviene.») |
| 05-19 «Palazzo di Madarame - Scopri dov'è il Tesoro» (cea365da…) | 200 `["madarame-scopri-dove-il-tesoro"]` | → «2 di 5: 2. Scopri dov'è il Tesoro» | 200 `[]` | ✅ (`?infiltrazione=madarame-scopri-dove-il-tesoro&daVoce=…`) |
| 05-20 «Terza visita al Palazzo di Madarame…» (464ccfe4…) | 200 `["madarame-disabilita-i-sistemi-di-sicurezza"]` | → «3 di 5: 3. Disabilita i sistemi di sicurezza» | 200 `[]` | ✅ (`…&daVoce=464ccfe4…`) |
| 05-27 «Palazzo di Madarame: Nelle profondità del Museo.» (6ebb178b…) | 200 `["madarame-nelle-profondita-del-museo"]` | → «4 di 5: 4. Nelle profondità del Museo» | 200 `[]` | ✅ (`…&daVoce=6ebb178b…`) |
| 06-01 «Palazzo di Madarame: raccolta dei tesori…» (b9371f80…) | 200 `["madarame-il-furto-del-cuore-di-madarame"]` | → «5 di 5: 5. Il furto del Cuore di Madarame» | 200 `[]` | ✅ (`…&daVoce=b9371f80…`) |

Le ore delle singole chiamate vanno dalle 17:26:45Z (04-11) alle 17:28:46Z (06-01).
La 04-11 era stata confermata e tolta una prima volta alle 17:25:49Z e alle 17:26:29Z, per un arresto dello script di prova. Poi la prova è stata rifatta intera.

### 04-20 «Palazzo di Kamoshida: infiltrazione completa in un unico viaggio.» (a5133905…)

- **Prima:** campo vuoto, «Proposta: Vecchio Castello, Tetto del Vecchio Castello, Ispeziona l'interno della torre — La voce descrive più infiltrazioni:
  in quest'ordine secondo la guida italiana. (più infiltrazioni)»; collegamento dell'atterraggio `/guida/mappe/palazzo-di-kamoshida-cancello-del-castello-nativo-rmap-151-1-0`.
- **«Conferma»** (17:28:58Z): `PUT …/a513390589dcbc75a7ae4ef1aa798d06?partita=1`
  `{"infiltrazioni":["kamoshida-01-cancello-del-castello-ingresso","kamoshida-13-tetto","kamoshida-15-torre-centrale"]}` → **200**.
  Il campo mostra «1. Vecchio Castello, 2. Tetto del Vecchio Castello, 3. Ispeziona l'interno della torre», nell'ordine.
- **Partita 1** (tutte completate): collegamento `?infiltrazione=kamoshida-15-torre-centrale` → «Infiltrazione 6 di 7: 6. Ispeziona l'interno della torre»,
  cioè l'ultima, come vuole la regola «tutte completate = l'ultima».
- **Partita di prova 3**, attiva, al 04-20, senza nulla segnato. `infiltrazioneDaAprire` = `kamoshida-01-cancello-del-castello-ingresso`.
  Collegamento `?infiltrazione=kamoshida-01-cancello-del-castello-ingresso` → «Infiltrazione 4 di 7: 4. Vecchio Castello», **la prima non completata**.
- **Stessa partita con i 77 punti di «Vecchio Castello» segnati** (`completamento 34/34, completata: true`; Tetto 0/3, Torre 0/25):
  `infiltrazioneDaAprire` = `kamoshida-13-tetto`. Collegamento `?infiltrazione=kamoshida-13-tetto` → «Infiltrazione 5 di 7: 5. Tetto del Vecchio Castello».
  Salta la completata e apre la prima non completata ✅.
- **«Togli» ×3** (sulla partita 3): `PUT …?partita=3` `["kamoshida-13-tetto","kamoshida-15-torre-centrale"]` → `["kamoshida-15-torre-centrale"]` → `[]`, tutte **200**.
  Il campo torna vuoto, con la proposta e il collegamento dell'atterraggio come prima ✅.
- Pulizia: `POST /api/partite/1/attiva` → 200 (17:29:55.863Z); `DELETE /api/partite/3` → 204 (17:29:55.868Z).
  Restano partita 1 (attiva, 06-02 giorno) e partita 2 (`funzionali-partita-prova.txt`).
- `voce_infiltrazione` alla fine: **0 righe**, come alla base.

### Difetto nuovo: FUN3-3 (bassa, FE: testo)

**Dove:** la finestra «Infiltrazioni della voce», con il campo vuoto e una voce che ha un **atterraggio**. Succede con 04-11, 04-12, 04-15, 04-20 e 04-22.

**Cosa dice la finestra:** «Nessuna: il collegamento «Palazzo di Kamoshida» apre «<prima della proposta>», la prima della proposta.»

**Dove porta davvero il collegamento:** alla planimetria d'atterraggio, come vuole `modifiche.md` §4.1 («senza, e senza atterraggio → `infiltrazioneDaAprire`»).
Lì la scheda apre la prima infiltrazione che tocca l'area d'arrivo:
- **04-12** dice «Tutorial Palazzo 12/04», ma si arriva su «1. Tutorial Palazzo 11/04» (`/guida/mappe/palazzo-di-kamoshida-sala-centrale` → `/area/prigione-sotterranea-tutorial?planimetria=palazzo-di-kamoshida-sala-centrale`);
- **04-22** dice «Rubare i desideri del Cuore», ma si arriva su «3. Tutorial Palazzo 15/04» (`/area/cancello-del-castello`);
- **04-20** dice «Vecchio Castello», ma si arriva su «3. Tutorial Palazzo 15/04».

Per il 04-11 e il 04-15 l'arrivo coincide con la proposta.

**Correzione possibile:** la frase descrive l'atterraggio quando c'è, oppure il collegamento segue la proposta anche con un atterraggio.
Per la seconda strada serve una decisione del PM, perché oggi la §4.1 dà la precedenza all'atterraggio.

## Confronto finale prima del ripristino

`funzionali-confronto-base-fine.txt`, base contro fine, prima del ripristino del Collaudo.

**Differenze, solo quelle attese:**
- l'area «Prova R8 area» con le sue 2 mappe;
- l'infiltrazione «okumura-prova-r8-infiltrazione», con l'ordine delle successive spostato di uno;
- 4 legami;
- la riga di Interscambio (`updated_at`, toccata da «Modifica aree»).

**Identiche:** `punto_interesse`, `spillo`, `spillo_voce`, `mappa_entita`, `voce_infiltrazione` e `cestino`.

Il ripristino della foto lo fa il Collaudo.
