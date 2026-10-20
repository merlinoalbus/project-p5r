# L4 «Avanzamento unico» — test funzionali

Stato: **pezzo 3 (linea aac70e23, FE e ciclo del Collaudo) fatto, 2026-10-20**: tutti i casi FE verdi; un rilievo da decidere (FUN4-1)
e un'osservazione (O4-4). Pezzi 1 e 2 (BE sul 3201) verdi. Basi «prima» prese
(schema 109, prima della 111 e della utente 022).

> **Base dei pezzi 1 e 2: i dati VECCHI di `data/` del 3201** (prima della copia della produzione del 2026-10-20 04:40 UTC). Correzione
> dell'utente via PM (2026-10-20): non si lavora sui dati vecchi. Quindi:
> - **valgono per il codice** i comportamenti provati (propagazione dell'oggetto, contesto dei rigenerabili, `voce-non-esauribile`, stato
>   proprio, Enigmi, 100%, effetti, nessuna divergenza nuova, impronte identiche, Vitest);
> - **non valgono come esito sui dati** i conteggi e gli stati: F4-01 (conteggi per carattere), F4-15 (le 4 divergenze), F4-16, F4-18 (le 5
>   schede), F4-19 (completamenti di p1 e p2), F4-23 (confronto con le basi «prima», prese anch'esse sui dati vecchi) e i numeri citati
>   negli altri casi (Madarame ora ha 227 voci e i pin 2300 e 2301). **Da rifare sulla copia nuova** quando Collaudo e BE avvisano che è
>   installata su 3201 e 3301, comprese basi «prima» nuove. O4-1 resta da ricontrollare sui dati nuovi.
>
> **Base nuova (decisione dell'utente, ~05:05Z): `dati-produzione/p5s-2026-10-20-0503Z`** (p5s, con Kamoshida chiuso dall'utente: partita 1
> 169/169 voci, +36 voci e +45 pin rispetto alla 0440Z). Sull'anteprima 3302 dalle 05:09Z: la utente 022 trova **0 divergenze**, quindi
> per F4-15 l'atteso «4 divergenze di Kamoshida p1» non vale più. I gesti «Segna la voce» e «Togli il fatto al pin» si provano costruendo
> una divergenza su una partita di prova (pin fatto con la voce da fare), da concordare col Collaudo. Kamoshida p1 risulta completato 71/71 e
> Madarame p1 82/82 (§8.10).
- **Fonti:** `requisiti.md` (R4-01…R4-25 e R4-14b, criteri F), `modifiche.md` §0 (modello), §1 (regole), §2.4 (attesi), §3 (rotte),
  §6.3 (piano), `dati.md`.
- **Valori attesi** che dipendono dal gioco (quali voci sono lo stesso forziere, quale infiltrazione è «in corso»): si verificano con
  l'Esperto della guida.

## Basi «prima» (2026-10-20)
- **Stato delle voci**, partite 1 e 2: `L3/esiti-funzionali/base-prima/dungeon-<k>-p1|p2.json`, risposte dei dettagli dei Palazzi.
- **Stato dei pin**, partite 1 e 2, per ogni planimetria di Kamoshida e Madarame: `esiti-funzionali/base-prima/pin-<k>-p<n>.json`, con
  `GET /api/mappe/<chiave>?partita=` (campo `raccolto` e voci del pin).
  - Kamoshida: 27 planimetrie, 369 pin; con uno stato 211 nella partita 1 e 257 nella 2.
  - Madarame: 18 planimetrie, 258 pin; con uno stato 199 nella partita 1 e 0 nella 2.
- Servono per l'atteso di §2.4: lo stato visibile di ogni voce e di ogni pin è identico, salvo i pin «da verificare» (stesso stato più
  l'avviso) e i pin di sole voci descrittive.

## Dove si prova (regole del PM)
- **Stati di partita** (`punto_partita`, `spillo_partita`, `divergenza_partita`): su una **partita di prova** «Prova funzionali L4», creata e
  poi eliminata. Si può fare sul 3201, perché scrive solo in `partite.db` sulla partita di prova. Prima va verificato che la creazione non
  cambi la partita attiva.
- **Scritture sui dati di gioco dei Palazzi** (carattere di una voce `PUT /api/compendio/punti/:k`, collega, copia, sposta, cestino):
  **solo sul Collaudo** (3301/5473), con la foto prima e il ripristino dopo chiesti al Collaudo.
- **Le 8 divergenze di Kamoshida p1** (R4-14b): stanno sulla partita reale, quindi si provano **solo sul Collaudo** (copia della produzione),
  con foto e ripristino. Mai sulla partita 1 di sviluppo.

## Casi (atteso dai documenti; esito e prova grezza all'esecuzione)
| id | Criterio | Passi | Atteso |
|---|---|---|---|
| F4-01 | R4-01 | `GET` di una voce per tipo (forziere, porta, scorciatoia, sicura, meccanismo, puzzle, volonta, boss, miniboss, oggetto, ombra-sciagura, storia, altro, persona; una voce di un dedalo) | `carattere` sempre risolto: permanente, rigenerabile o descrittiva; `null` per persona e dedali. Conteggi per carattere uguali al log della 111 (Kamoshida 71/47/49 + 2 persona; Madarame 99/82/44) |
| F4-02 | R4-01, R4-08 (Collaudo) | `PUT /api/compendio/punti/:k { carattere }` su una voce segnata nella partita di prova; poi `carattere: null` («Ripristina») | il segno resta; la propagazione cambia come dichiarato; con `null` torna la regola |
| F4-03 | R4-02 | partita di prova: segnare e togliere una voce `storia` | il segno si dà e si toglie; percentuale e completamento non cambiano |
| F4-04 | R4-03, R4-18 | Madarame, partita di prova: segnare nella 2ª infiltrazione una voce permanente il cui pin è condiviso con una voce della 4ª (uno dei 17 pin di dati §6.0) | la voce della 4ª risulta fatta, nella guida e sul pin in tutte le planimetrie |
| F4-05 | R4-04, R4-18 | partita di prova: raccogliere nella 2ª un oggetto rigenerabile che c'è anche nella 4ª | nella 4ª la voce è «da fare»; guardando la 2ª resta segnata |
| F4-06 | R4-05 | un pin con voci rigenerabili di più infiltrazioni (uno dei 40 di Madarame): `GET /api/mappe/<k>?partita=&infiltrazione=2` e `=4`, e senza parametro | lo stato è quello dell'infiltrazione di contesto; senza parametro, quello dell'infiltrazione in corso; il popup lo dice («Raccolto nella 2ª infiltrazione») |
| F4-07 | R4-06, R4-11 | togliere la spunta a un pin di un oggetto permanente | riapre l'oggetto intero, su tutte le planimetrie; l'interfaccia avvisa prima con «Riapre anche: …» |
| F4-08 | R4-07 | «esaurito» su una voce esauribile e su una non esauribile | il primo si propaga come «ottenuto»; il secondo dà 400 `voce-non-esauribile` |
| F4-09 | R4-09 | pin con voci non descrittive: segnare tutte le voci | il pin risulta fatto senza scrivere `spillo_partita`; nessuna riga nuova in `spillo_partita` per quel pin |
| F4-10 | R4-10 | pin senza voci, o con sole descrittive: segnare | stato proprio in `spillo_partita`, come oggi |
| F4-11 | R4-11 | pin con più voci: spunta, poi la si toglie | segna tutte le voci ancora da fare; togliendo la spunta le riapre tutte, «esaurito» compreso |
| F4-12 | R4-12 (Collaudo) | collegare, scollegare, copiare e spostare un pin o una voce già fatti | nulla torna «da fare» |
| F4-13 | R4-13 | Enigma con passi: segnarli tutti, poi toglierne uno | l'Enigma è fatto solo coi passi tutti fatti; togliendone uno si riapre |
| F4-14 | R4-14 (Collaudo) | sequenza di gesti misti (§6.1.5) sulla partita di prova, poi controllo dei dati in sola lettura | 0 divergenze voce/pin nuove |
| F4-15 | R4-14b (Collaudo) | partita 1 della copia: `GET /api/partite/1/divergenze?dungeon=kamoshida`; guida, visore e scheda; «Segna la voce» su una, «Togli il fatto al pin» su un'altra | il numero esatto della 022 (≤ 8, solo Kamoshida p1, elencati in noreg.md), con «Da verificare» su voce e pin nelle tre viste; ciascuno dei due gesti chiude la sua divergenza; poi ripristino del Collaudo |
| F4-16 | R4-15, R4-15b | `GET /api/compendio/dungeon/madarame/copie` | `[]` (0 copie a Madarame); le voci con lo stesso testo ma pin diversi restano distinte |
| F4-17 | R4-16, R4-17 | non applicabile in L4 (nessuna fusione, §7.2) | da segnare come «non applicabile» con il riferimento alla decisione |
| F4-18 | R4-19, R4-20 | dettaglio di Kamoshida e Madarame e `contenutiMappa` delle planimetrie | le 149 schede assorbite nella voce (la posizione viene dal marcatore); le 5 senza riferimento in «Schede da sistemare»; nessuna API le dà come elementi a sé |
| F4-19 | R4-21, R4-22 | completamento: Kamoshida p2, Madarame p1 e Kamoshida p1 (risposte in sola lettura) | Kamoshida p2 completato; a Madarame p1 manca il Tesoro (pin 811); Kamoshida p1 non completato per le 15 permanenti; differenze di percentuale spiegate voce per voce |
| F4-20 | R4-23 | partita di prova: segnare tutti i permanenti di un Palazzo, il Tesoro e il boss, lasciando i rigenerabili | Palazzo al 100% e completato |
| F4-21 | R4-24 | area con più planimetrie e una voce permanente su più planimetrie | la voce conta una volta sola |
| F4-22 | R4-25 | con la partita di prova completata (F4-20): metro di Tokyo, ingresso del Palazzo, requisiti «Completare il Palazzo», condizioni «Voce della guida» e «Pin di una mappa» | seguono la regola nuova (ingresso chiuso, requisito soddisfatto, condizioni vere) |
| F4-23 | §2.4 | confronto con le basi «prima» delle risposte per voce e per pin, p1 e p2 | identico, salvo gli avvisi «da verificare» e i pin di sole descrittive (spiegati) |
| F4-24 | Vitest mirati | §6.1 e §6.2 per i file pronti | verdi, output grezzo |

## Esiti a pezzi

### Pezzo 3 — linea di rilascio `newreview-l4` = aac70e23 sul collaudo (FE 5473, BE 3301, base `L4-base-p5s-20261020-1741Z`), 2026-10-20
Prove in `esiti-funzionali/aac70e23/`: `letture-browser.txt` (sola lettura, partita 1, 17:57–18:05Z, 0 scritture), `ciclo1-gesti.txt` e
`ciclo1-partita.txt`. Il ciclo 1 è del Collaudo: foto 18:02:05Z, mie scritture dalle **18:02:49 alle 18:12:03Z**. Le divergenze le ha costruite il
Collaudo a BE fermo, sulla partita di prova 3, creata ed eliminata. Gesti dall'interfaccia in un iframe 1280×800, con le chiamate registrate.
**Ripristinato dal Collaudo alle 18:12:37Z**: impronta identica alla foto e alla base 1741Z; 27 scritture nei BE.log, nessun 5xx; differenze prima del
ripristino solo dei gesti dichiarati (`esiti-collaudo/aac70e23/ciclo1/LEGGIMI.md`).
Solo testo.

| Caso (§) | Esito | Prova |
|---|---|---|
| Due livelli «Concluso / Completato» (§8.10) | ✅ | Partita 1: Kamoshida e Madarame «Completato» (71/71, 82/82) nell'elenco e nella scheda. Partita di prova: boss finale («Sconfiggi Kamoshida») e Tesoro (pin 614) → chip **«Concluso»** («Concluso: Tesoro raccolto, boss finale sconfitto»), anello «1 … su 71», API `completato: null`; nell'elenco «1% · Concluso» |
| Anello sugli oggetti permanenti (§1.5) | ✅ | «Avanzamento in Palazzo di Madarame: 82 oggetti permanenti fatti su 82»; sulla prova cresce con le permanenti e l'«esaurito», non con i rigenerabili né con i Racconti |
| «Da verificare» nelle tre viste (§4.1–4.3, F4-15) | ✅ | Su due divergenze vere (voci con 3 e 2 pin, uno fatto): intestazione «2 da verificare», sezione «Da verificare (2)», chip sulla voce con «Sistema…», pin `--da-verificare` nel visore con chip nel popup. «Togli il fatto al pin» (dal popup) → `DELETE …/divergenze/<uid>` 204, pin da fare, voce invariata (0/2). «Segna la voce» (dalla sezione) → `PUT …/punti` 200, voce 3/3, divergenze 0, sezione sparita. Vedi O4-4 |
| Contesto del pin e «Stato nella» (§4.2, §1.4) | ✅ | Popup con il gruppo «Infiltrazione dello stato» e il selettore (44 px) solo per i pin con voci in più infiltrazioni. La scelta rilegge `GET /api/mappe/…?partita=&infiltrazione=` senza cambiare l'indirizzo della pagina. Segnata la voce di «Scopri», la voce omonima della 4ª resta da fare (0/2) |
| k/N, «Segna» / «Riapri», «Riapre anche», «Segnate anche» (§8.11) | ✅ | Un pin da «Da raccogliere» → «In corso · 1/4». «Ottenuto» su una voce da 8 pin → 8/8. Lucernario: «Ottenuto» → notifica «Segnate anche: Lucernario Aperto — 4ª…, — 2ª…»; «Riapri» → conferma «Riapre anche: …» (Annulla non scrive, provato in lettura) → «Riapri» → «Riaperte anche: …», e la voce torna da fare in tutte e tre le infiltrazioni |
| Conferma dell'Enigma (§8.6) | ✅ | «Incontro con Morgana» risolto → «Riapri» sul passo → «Riapre anche l'Enigma «Incontro con Morgana».» → l'Enigma si riapre. Con l'Enigma non risolto nessuna conferma. «Annulla» non scrive (lettura su partita 1) |
| Schede da sistemare (§4.3) | ✅ con **FUN4-1** | Solo «Crea la voce» e «Collega a una voce» (44 px), mai «Elimina». «Crea la voce» → `POST /schede/1/voce` 201, voce «Stanze sicure» in fondo a «Vecchio Castello», schede 4→3. «Collega a una voce» → `PUT /schede/14/voce` 200, schede 3→2. Rilievo FUN4-1: la voce nuova è permanente e la partita 1 perde il «Completato» di Kamoshida (71/72) |
| Carattere della voce (§4.1, F4-02) | ✅ | Chip «Permanente», «Si ripropone», «Racconto» («letto»). «Modifica › Carattere» → «Si ripropone»: il segno resta, l'oggetto esce dal conteggio (5→4). «Ripristina» → `carattere: null`, di nuovo «Permanente» (5) |
| «Esaurito» (§4.1) | ✅ | Chip proprio «Esaurito» (`chip--bloccata`), riga a opacity 0.4 contro 0.6 di «ottenuto»; conta nel completamento |
| «Anche nella Nª infiltrazione» (§4.1) | ✅ | «Anche nella 2ª e 4ª infiltrazione» sotto «Lucernario aperto»; il tocco sulla «4ª» apre `?infiltrazione=madarame-nelle-profondita-del-museo` |
| F4-14 (gesti misti, parte UI) | ✅ | Dopo tutti i gesti: 0 divergenze sulla partita di prova e sulla partita 1 |
| FUN3-3 di L3 | ✅ | Con l'atterraggio la finestra «Infiltrazioni della voce» descrive la planimetria d'arrivo (04-11, 04-12, 04-20, 04-22); a Madarame resta la proposta (05-20) |

**O4-4 (osservazione):** una divergenza su una voce con **un solo** pin, come la scriverebbe la 022 o come arriva da un pacchetto importato con
stati incoerenti, dopo il §8.11 mostra la voce già «ottenuto · 1/1». Accanto c'è il chip «Da verificare» con «Il pin risulta fatto ma la voce no».
Conta già nel completamento e sparisce al primo gesto qualsiasi della partita (`pulisciDivergenzeRisolte`). Visto nella prima costruzione: «Segna la
voce» su una ha tolto anche l'altra. Oggi non ci sono divergenze nei dati (0 in p1 e p2), quindi nessun effetto. Se la tabella resta «per i casi
futuri» (§8.11 punto 6), per le voci da un solo pin il testo non regge.

### Pezzo 1 — BE di L4 sul 3201 (migrazioni 111 e utente 022 su `data/`), sole letture (2026-10-20)
Prova grezza: `esiti-funzionali/l4-letture-1.txt` (script `esiti-funzionali/l4-letture.cjs`, solo `GET`).

| id | Esito | Prova |
|---|---|---|
| F4-01 | ✅ | Kamoshida p1: permanente 71, rigenerabile 47, descrittiva 49, `null` 2 (le Persona); Madarame: 99 / 82 / 44, nessun `null`; Mementos: 164 voci, campo `carattere` **assente** (R4-30, risposta identica). Uguali al log della 111 e a `be.md` §2 |
| F4-15 (sola lettura) | ✅ in parte | `GET /api/partite/1/divergenze?dungeon=kamoshida` → **4** divergenze, pin 583 (Seme lussuria verde), 615, 1992, 1993, come la 022 e `be.md` §2; p2 `[]`; Madarame `[]` in p1 e p2. I gesti «Segna la voce» / «Togli il fatto al pin» restano al Collaudo |
| F4-16 | ✅ | `GET /api/compendio/dungeon/madarame/copie` → `[]`; Kamoshida `[]` |
| F4-18 (dettaglio) | ✅ in parte | «Schede da sistemare»: Kamoshida 4 (1 «Cancello del Castello» sicura, 14 miniboss, 15 forziere, 16 seme-bramosia), Madarame 1 (28 forziere) = **5**, come atteso. Le 149 assorbite e `contenutiMappa` si controllano nel pezzo FE |
| F4-19 | ✅ | Kamoshida p1 `{oggetti 71, fatti 56, tesoro ✓, boss ✓, completato ✗}` (prima «raccolto tutto (107/107)»: le 15 permanenti non segnate); Kamoshida p2 completato «Tesoro, boss finale e tutti gli oggetti permanenti (71/71)»; Madarame p1 80/80, tesoro ✗ (pin 811), boss ✗; Madarame p2 0/80. Vedi O4-1 |
| F4-23 | ✅ | Stato delle voci contro `L3/base-prima` (schema 109): Kamoshida 169/169, Madarame 225/225, Mementos 164/164, in p1 e p2, **0 diverse**. Stato dei pin contro `L4/base-prima`: Kamoshida 369/369 e Madarame 258/258, in p1 e p2, **0 diversi**, nessun assente |

**O4-1 (osservazione, non difetto di L4):** Madarame non ha né una voce né un pin `boss` (tutte le voci di tipo boss assenti; `bossFinali()`
non lo trova), quindi `boss` resta ✗ e il Palazzo **non può completarsi** in nessuna partita. È così anche prima di L4 (`be.md` §2: «come
prima»). È un dato di gioco mancante: da girare all'Esperto della guida (owner dei dati), non a BE.

### Pezzo 2 — partita di prova sul 3201 (2026-10-20, 05:22–05:25)
Partita «Prova funzionali L4» (id 3) creata **non attiva** (`POST /api/partite {nome}` → 201, `attiva: false`; la partita 1 è rimasta
attiva prima, durante e dopo), eliminata alla fine (`DELETE /api/partite/3` → 204; 0 righe residue in `punto_partita`, `spillo_partita`,
`divergenza_partita`). **Impronte prima/dopo: `partite.db` NESSUNA DIFFERENZA, `gioco.db` NESSUNA DIFFERENZA.** Nessuna scrittura sui dati
di gioco. Script `esiti-funzionali/l4-prova.cjs`; uscite `l4-prova-crea|madarame|extra|kamoshida|completa|enigmi-completamento|effetti|pulizia.txt`;
impronte `impronta-partite|gioco-prima|dopo.json`.

| id | Esito | Prova |
|---|---|---|
| F4-03 | ✅ | `kamoshida-15-torre-centrale-esci-dal-castello` (storia, descrittiva): segnata → `ottenuto`, tolta → `null`; `completamento` 0/71 prima, durante e dopo |
| F4-04 | ✅ | Madarame, pin 2159 condiviso: `PUT …/punti` sulla voce della 2ª `…scopri-dove-il-tesoro-visita-ai-bagni` → anche `…nelle-profondita-del-museo-visita-ai-bagni-2` `ottenuto`; pin 2159 `raccolto: true`; **una sola** riga in `punto_partita` (quella segnata), nessuna in `spillo_partita`; `fatti` 0 → 1 (oggetto contato una volta). Pin 777 (4 voci di 3 infiltrazioni) → anche il pin 806 (stesso oggetto, altra planimetria) risulta fatto |
| F4-05 | ✅ | Pin 2090 (rigenerabili di 1ª, 2ª, 4ª): raccolta la voce della 2ª → la voce della 4ª e della 1ª restano `null` |
| F4-06 | ✅ (API) | `GET /api/mappe/nativo-rmap-153-1-0?partita=3&infiltrazione=…`: 2ª → `raccolto: true`, `contestoInfiltrazione` «Scopri dov'è il Tesoro»; 4ª → `false` («Nelle profondità del Museo»); 1ª → `false`; **senza parametro** → contesto «Prima Infiltrazione al Museo» (l'infiltrazione in corso: la prima non completata), `false`. `PUT spilli/2090 {raccolto:true, infiltrazione: 4ª}` segna solo la voce della 4ª. Il testo del popup («Raccolto nella 2ª infiltrazione») va col pezzo FE |
| F4-07 | ✅ (API) | `PUT spilli/2159 {raccolto:false}` → entrambe le voci dell'oggetto `null`, pin `false`, 0 righe; pin 777 → riaperte le 4 voci e il pin 806 dell'altra planimetria. L'avviso «Riapre anche: …» va col pezzo FE |
| F4-08 | ✅ | «esaurito» su `…lucernario-aperto` (non esauribile) → **400** `voce-non-esauribile` ««Lucernario Aperto» non è esauribile: si segna «ottenuto».»; su `madarame-06-sala-del-tesoro-atrio/2` (forziere permanente esauribile) → 200, conta come fatta (`fatti` +1) e i suoi 3 pin 786, 2203, 2204 risultano `raccolto: true` |
| F4-09 | ✅ | Pin 737 (3 voci permanenti, stesso oggetto): segnata una voce → tutte e 3 `ottenuto`, pin `raccolto: true`, `statoProprio: false`, **0 righe** `spillo_partita` per il suo uid |
| F4-10 | ✅ | Pin 2102 (sola voce descrittiva) e pin 2085 (senza voci): `PUT spilli … true` → `statoProprio: true`, `raccolto: true`, una riga `spillo_partita` `raccolto=1` ciascuno |
| F4-11 | ✅ | Pin 777 (4 permanenti): spunta → 4 righe `punto_partita`, tutte `ottenuto`; tolta → tutte `null`. Pin misto 2181 (scorciatoia permanente della 2ª + oggetto rigenerabile della 4ª, contesto 4ª): spunta → entrambe `ottenuto`; tolta → entrambe `null`. Pin 2201 (due ombre esauribili di 4ª e 5ª): `atrio/0` `esaurito`, spunta → resta `esaurito` (la voce della 5ª non è del contesto: §3.2 «rigenerabili: solo quella del contesto»); tolta → `atrio/0` **`null`** («esaurito» compreso). Vedi O4-3 |
| F4-13 | ✅ | Enigma `…attraversa-la-sala-da-pranzo` (10 passi): 9 passi → Enigma `null`; il 10° → `ottenuto`; tolto il 1° → `null`; rimesso → `ottenuto` |
| F4-14 (parziale, 3201) | ✅ | Dopo tutti i gesti misti di questo pezzo (punti, spilli con e senza contesto, esaurito, Enigmi, 100%): `GET /api/partite/3/divergenze` → `[]` per Kamoshida e Madarame. La sequenza §6.1.5 sul Collaudo resta da fare |
| F4-20 | ✅ | Kamoshida: tolti i segni non permanenti, segnati i 64 permanenti ancora da fare (64 × 200) → `{71/71, boss ✓, tesoro ✗, completato ✗}`; Tesoro `PUT spilli/614 true` (pin di sola voce descrittiva: stato proprio) → `{71/71, tesoro ✓, boss ✓, completato ✓}`, «Tesoro, boss finale e tutti gli oggetti permanenti (71/71)», uguale nell'elenco dei Palazzi. Le 12 voci non permanenti segnate alla fine sono **tutte passi di Enigmi** (segnati con l'Enigma). Vedi O4-2 |
| F4-21 | ✅ | `…raccogli-forziere-raro` (permanente, pin 572 su 151-5-1, 1897 e 1901 su 151-5-2): segnata → `fatti` 8 → **9** (+1, non +3), i 3 pin `raccolto: true`; tolta → 8. Con un rigenerabile su 3 planimetrie (`…la-rivincita-sui-nemici`, 8 pin) `fatti` resta invariato e i pin seguono la voce |
| F4-22 | ✅ (API) | Con la prova completata: ingresso 1656 e punto 1616 della Shujin `bloccato` con il requisito `palazzo` «completato (…71/71), non ci si entra più», come p2; in p1 (non completato) solo il requisito di data (l'ingresso torna «dentro la sua finestra», `be.md` §4). Sojiro rango 1 «Aver completato il Palazzo di Kamoshida» **verde** in p3 come in p2. Condizioni: Mona 2155 (3 condizioni «Pin di una mappa» — 2143 e 2149 fatti **dalle voci**, senza righe in `spillo_partita`; 2152 di sole descrittive, stato proprio — più una «Voce della guida») da `bloccato` a **`disponibile`**, tutte verdi; Tesoro 614 e «Ombra di Kamoshida» 2077 («Voce della guida» + «Pin» del Tesoro) `bloccato` → `disponibile` segnando la voce. Mappa `tokyo`: 3 pin, nessuno dipende dai Palazzi (nessuna differenza p1/p2/p3) |
| F4-24 | ✅ | `npx vitest run` con `DATA_DIR` su cartella vuota: `caratteriVoce`, `completamentoGuida`, `111_…`, `022_…`, `avanzamento-unico`, `guida-pin`, `enigmi-guida`, `palazzo-completato` → **8 file, 70 test, EXIT=0** (`f4-24-vitest.txt`) |

**O4-2 (domanda per il PM / Stesura, non difetto):** con la scelta 6 di `be.md` §3 («i passi contano come prima: tutti i passi con uno
stato, Storia compresa») l'Enigma permanente `…ogni-libro-al-suo-posto` è fatto solo se è segnato anche il suo passo **rigenerabile**
`…sconfiggi-i-nemici-2` (ombra). Prova: con Kamoshida completato, tolto quel passo → Enigma `null`, `fatti` 70/71, **completato ✗**; rimesso →
completato ✓. Quindi un rigenerabile (o una «Storia») decide del 100% attraverso un Enigma. R4-13 lo vuole («fatto solo coi passi tutti
fatti»); R4-23 dice «tutti i permanenti… lasciando i rigenerabili». Le due regole insieme vanno confermate dall'utente.
**Esito O4-2 (Stesura modifiche, 2026-10-20, d'accordo il PM): coerente, nessun cambio di regola** (`modifiche.md` §8.6). L'Enigma conta come
voce permanente e i suoi passi dicono solo se è risolto (R4-13). R4-23 regge: segnare l'Enigma segna i suoi passi, quindi «tutti i permanenti,
rigenerabili lasciati» dà il 100%. Il 70/71 è il passo tolto **dopo**, la riapertura voluta da R4-13; è coerente col gioco, perché il passo
rigenerabile resta della sua infiltrazione e non si azzera da solo. Unica aggiunta, di FE: togliere il segno a un passo di un Enigma risolto
chiede conferma con «Riapre anche l'Enigma «…»». Da riprovare: la conferma compare solo con l'Enigma risolto e «Annulla» non cambia nulla.

**O4-3 (osservazione):** R4-11 dice «spuntare un pin con più voci segna tutte le voci ancora da segnare»; `modifiche.md` §3.2 restringe le
rigenerabili a quella del contesto (R4-05/R4-06). Il codice segue §3.2 (pin 2201: la voce della 5ª non si segna con il contesto della 4ª). È
coerente con il documento di progetto; lo segnalo perché il testo di R4-11 da solo dice di più.

**Restano** — col pezzo FE: F4-06 (testo del popup), F4-07 (avviso «Riapre anche: …»), F4-15 e i «Da verificare» nelle tre viste, F4-18
(`contenutiMappa` e le 149 assorbite), segnare e togliere da guida, visore e «Da raccogliere». Sul Collaudo (foto e ripristino): F4-02,
F4-12, F4-14 (§6.1.5), F4-15 (gesti sulla partita 1). F4-17 non applicabile (nessuna fusione, decisione dell'utente del 2026-10-20, §7.2).
