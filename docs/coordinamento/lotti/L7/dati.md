# L7 «Oggetti» — analisi dati

Analisi dati, 2026-10-20. Sola lettura sulla copia di produzione `…\cffd8da6-…\scratchpad\prod-20261020\` e su `data/` (dev).
Script e uscite (scratchpad `…\161706c7-6e2c-47d6-bdb7-618347ce218c\scratchpad\`): `l7.cjs` → `l7-prod.json` / `l7-dev.json` (**identici**).
Requisiti: `lotti/L7/requisiti.md`. Confronto per nome: minuscole, senza accenti né punteggiatura («nome normalizzato»), come nel dubbio 1.

## 1. I tre cataloghi (il «terzo» è nei dati della guida)
| Catalogo | Dove | Righe | Contenuto |
|---|---|---:|---|
| **oggetto** | tabella `oggetto` (id, nome, categoria, vincolo, descrizione) | **223** | solo equipaggiamento, **nomi inglesi** del dataset del compendio: Accessory 125, Weapon 36, Gun 32, Protector 30. Nome italiano in `traduzione(ambito='oggetto')`: 223/223; descrizione in `traduzione(descrizioneOggetto)` 223 |
| **oggetti della guida** | `dati_guida.oggetti-guida` (JSON) | **355** = consumabili 247 + chiave e materiali 108 | consumabili: cura 80, sp 64, battaglia 59, stato 41, altro 3 (con effetto, dove, prezzo); chiave 82, materiale 26; `nomeEn` su 149. Nello stesso JSON: fabbricazione (10 ricette), personalizzazione armi, **abiti 55**, **scambi** (Sakai 16, Venditore ambulante 10, Gachapon 6, Tanaka 4, Jose 24) |
| **articolo** | tabella `articolo` (listini) | **587** (551 nomi distinti, 60 negozi) | arma 143, consumabile 101, accessorio 72, protezione 62, regalo 50, libro 41, altro 39, cibo 37, materiale 35, videogioco 7; `origine` seed 551, utente 36; `oggetto_fonte/oggetto_chiave` solo su libri (41) e videogiochi (7) |
Altri cataloghi d'oggetto: `libro` 46, `film` 30, videogiochi = 7 righe di `attivita` (`videogioco-*`), `confidente_regalo` 144, `dati_guida.jose.scambi` 37.

## 2. Abbinamenti per nome (dubbio 1: si applicano solo gli esatti)
- articolo ↔ oggetti della guida: **138** nomi articolo su 551 (137 voci della guida su 355 hanno un articolo). Coerente col «crosswalk» già nei
  dati (`dati_guida.oggetti-crosswalk`: 121 abbinamenti, 40 voci senza articolo, 40 articoli di altre sezioni).
- articolo ↔ oggetto (equipaggiamento): **solo 3 nomi** (5 oggetti) per nome italiano, 0 per nome inglese. I nomi italiani dei listini (guida AGS:
  «Kogatana nera», «Pugnale della tormenta», «Kukri»…) e quelli della `traduzione` del dataset (es. «Gran frusta del Nakara», «Contratto
  mortale») ~~sono due traduzioni diverse~~ → **correzione dell'Esperto (`guida/registro.md` G-024)**: non sono due nomi dello stesso pezzo ma **due serie
  diverse di oggetti**. I 223 nomi della `traduzione` vengono dalla guida italiana e sono l'equipaggiamento da **itemizzazione** (Stanza di Velluto); i 277
  articoli dei listini sono l'equipaggiamento **in vendita**. Coincidono solo 3 nomi (5 oggetti). Conseguenza: **niente da abbinare** fra le due serie, salvo i 3 nomi
  comuni; nel catalogo unico sono oggetti distinti (≈ 223 + 277 − 3), ciascuno con la sua origine.
- articolo senza nessun abbinamento: **410 nomi** (arma 140, accessorio 68, protezione 60, regalo 43, libro 41, altro 38, materiale 8,
  videogioco 7, cibo 6, consumabile 4). Libri e videogiochi però sono già legati per chiave (`oggetto_chiave`, §5).
- oggetto ↔ oggetti della guida: 0 (insiemi disgiunti: equipaggiamento contro consumabili/materiali).
- Stima del catalogo unico, prima delle approvazioni: 223 equipaggiamento + 355 guida + ≈ 270 articoli senza abbinamento (al netto di libri,
  videogiochi e doppioni) + 46 libri + 30 film + 7 videogiochi + ≈ 21 regali non in vendita → **≈ 950** oggetti. Con G-024 l'equipaggiamento in vendita e quello
  da itemizzazione sono serie diverse: la stima **non si riduce** con abbinamenti (solo i 3 nomi comuni); si riduce solo per i doppioni di Tanaka (§3) e per gli
  abbinamenti approvati dei regali.

## 3. Doppioni
- **Tanaka vende in inglese**: i 20 articoli di `tanaka-affari-loschi` hanno nomi inglesi (Black Kogatana, Black Robe, Nirvana Ring, Ouija Board,
  Homunculus, Crown of Salvation…), mentre gli stessi oggetti altrove sono in italiano: «Kogatana nera» (untouchable, yumenoshima) /
  «Black Kogatana» (tanaka); «Veste nera» (untouchable, mercante-sakai) / «Black Robe» (tanaka). Sono i doppioni citati dal piano; per i 20 di
  Tanaka l'abbinamento all'italiano va proposto uno per uno (elenco).
- Nessun nome ripetuto dentro `oggetto` né dentro la guida. Dentro `articolo` lo stesso nome in più negozi è normale (stesso oggetto venduto in più
  posti): 587 righe → 551 nomi.

## 4. Prezzi (R7-07)
- Guida (consumabili con prezzo) contro listino: **101 confrontabili, 2 divergenti** (piano: 5/100): Dango lunare guida 640 · articolo 800;
  Agodashi Oden guida 800 · articolo 900.
- Regali contro listino: **114 confrontabili, 8 divergenti** (piano: 12/116): «Braccialetto d'argento» 78.000 nei regali di 7 Confidenti
  (ryuji, yusuke, akechi, sojiro, iwai, shinya, maruki) contro 68.000 nel listino; «Modellino di moto» (shinya) «3.600-4.800 (fonti discordanti)»
  contro 4.800. Braccialetto d'argento (G-024): la guida si contraddice (78.000 nei regali, 68.000 nel negozio) e non c'è una terza fonte → **vince il listino,
  68.000**, con nota. Regola generale: vince il listino (dubbio 3), la cifra del regalo resta nota.
- Chiesa di Kanda (L5, G-013): vale AGS (Vino della grazia 14.000, Ceneri del pentimento 12.000).

## 5. Libri, film, videogiochi (R7-05, R7-09)
- Libri 46, articoli dei libri 41, tutti con `oggetto_chiave` valido. **Libri senza articolo: 6** — 3 sono ricompense di Richieste (dolci-cinesi,
  parchi-divertimento, shitamachi-rinato: §7), 3 da posizioni senza listino (esperto-a-biliardo, il-mago-del-biliardo, la-fattorizzazione).
  **Posizioni «negozio» senza articolo: 2** (esperto-a-biliardo@prossimo-asso, la-fattorizzazione@mercante-sakai) — tornano col piano.
  `libro_posizione`: negozio 31, luogo 13, quartiere 3, attività 1. Libri con prezzo proprio 42 (copia del prezzo dell'articolo).
- Film 30, prezzo proprio su 18, nessun articolo DVD in listino (1 articolo cita «film/dvd»); `film_posizione`: luogo 35, quartiere 7.
- Videogiochi: **non hanno una tabella**: sono 7 righe di `attivita` (`videogioco-star-forneus`, …) citate per chiave dai 7 articoli di Super Baron e
  Yumenoshima (dubbio 6: entrano nel catalogo da qui).

## 6. Scambi (R7-13)
- **Jose: due copie** — `dati_guida.jose.scambi` **37** righe (nome, effetto, costo in fiori, requisito) e `oggetti-guida.scambi[Jose]` **24** offerte
  (raggruppate per dedalo): è il «24/37» del piano. Nessun negozio né articolo di Jose nel listino (0).
- Tanaka: `oggetti-guida.scambi` 4 righe raggruppate per grado cliente contro **20 articoli** del negozio (in inglese, §3).
- Sakai 16, Venditore ambulante 10, Gachapon 6: solo nella guida; i rispettivi negozi hanno articoli propri (da confrontare voce per voce
  nell'elenco degli abbinamenti).

## 7. Forzieri e ricompense (R7-11, R7-12)
- Forzieri (`forziere`, `forziere-chiuso`) **129**: kamoshida 21, madarame 19, kaneshiro 6, futaba 4, okumura 15, niijima 11, shido 25, iweleth 9,
  maruki 19. Con `dettagli_json.contenuto` 95; con parentesi 13 (piano: 11 «con parentesi sbagliate»; nessuna parentesi aperta e non chiusa: le
  parentesi sono note dentro il nome, es. «Tirapugni (arma per Queen)», «Batterie portatili (abilità Potenzia Folgorazione)»).
  Togliendo parentesi e quantità («x3») e spezzando gli elenchi: **53 contenuti** trovati per intero nei cataloghi, **38 per nulla** (soprattutto
  equipaggiamento: lo stesso problema di traduzione del §2). Testi delle voci: invariati (R7-21); il legame per chiave si aggiunge da elenco.
  Kamoshida e Madarame: 40 forzieri, il collegamento non tocca voci né pin.
- Ricompense delle Richieste: 33 richieste, 36 righe, 34 oggetti; **10** trovati nei cataloghi, 24 no (carte abilità, armi, libri «(libro)», ecc.).
  Le carte abilità non sono in nessun catalogo (nuova categoria «carta abilità» o elenco).

## 8. Partita (R7-19)
`acquisto_partita` **7** (p1, articoli tutti esistenti), `regalo_partita` 0, `lettura_partita` 13 (libro 10, film 3), `progresso_libro_partita` 11,
`progresso_film_partita` 3, `progresso_videogioco_partita` 0, `effetto_lettura_partita` 19, `punti_negozio_partita` 0. Gli acquisti citano
`articolo_chiave`: restano validi se l'articolo mantiene la chiave e aggiunge `oggetto_chiave`.
Condizioni `articolo` (L6): 40 occorrenze in 20 articoli, tutte per chiave di articolo valida.

## 9. Regole di migrazione proposte
1. **Catalogo unico** = tabella `oggetto` estesa (chiave testuale stabile, nome italiano, nome originale, categoria, effetto/descrizione):
   - equipaggiamento: le 223 righe di oggi (nome IT da `traduzione`, nome originale = `oggetto.nome`);
   - consumabili/chiave/materiali: le 355 voci della guida (nome, `nomeEn`, categoria, effetto, uso);
   - libri 46, film 30, videogiochi 7 (dalle `attivita`): oggetti con la loro chiave di oggi, dati di lettura/visione invariati nelle loro tabelle;
   - articoli senza abbinamento e regali non in vendita: oggetti nuovi solo da elenco approvato (dubbio 1), mai per nome «quasi uguale».
2. **Articolo**: aggiunge `oggetto_chiave` dove l'abbinamento è esatto (138 con la guida, 3 con l'equipaggiamento, 41 libri e 7 videogiochi già
   valorizzati); chiave, prezzo, condizioni e negozio invariati (gli acquisti restano validi).
3. **Regali**: `confidente_regalo` acquista `oggetto_chiave` (116 righe con articolo per nome esatto); `costo`/`dove` restano note.
4. **Forzieri**: legame voce → oggetto (+ quantità) da elenco: 53 certi, 42 da approvare; testo della voce invariato.
5. **Scambi**: Jose da `jose.scambi` (37, la copia più completa) come listino del venditore; la copia in `oggetti-guida.scambi` diventa nota.
6. **Tanaka**: i 20 articoli in inglese restano con la loro chiave; l'oggetto italiano corrispondente da elenco.
7. Nessuna cancellazione dei cataloghi di oggi in L7 (si smette di leggerli; via in L11).

## 10. Conteggi attesi dopo
| Voce | Atteso |
|---|---|
| oggetti nel catalogo unico | 223 + 355 + 46 + 30 + 7 = **661** certi + articoli in vendita senza corrispondenza (equipaggiamento in vendita ≈ 270, serie distinta per G-024) e regali da elenco approvato |
| articoli con `oggetto_chiave` | 48 oggi → 48 + 138 + 3 = **189** certi (+ approvati) |
| articoli, chiavi, prezzi | 587 invariati |
| acquisti / letture / progressi della partita | 7 / 13 / 11 libri + 3 film invariati |
| impronta diario/Kamoshida/Madarame | identica (`1a71b030…bc4c`); voci dei forzieri con testo invariato — **riferimento nuovo dalla copia 0440Z: `bbd9de5d…` (§11)** |

## 11. Rimisura sulla copia fresca di produzione (`dati-produzione/2026-10-20-0440Z/`, 2026-10-20)
Sola lettura; script `l7.cjs` e `lconcluso.cjs` (uscite `*-0440Z.json` nel mio scratchpad), confronto con la copia di produzione precedente.
- **Cataloghi, articoli, regali, scambi, forzieri, ricompense (§1–§7, §9): nessuna cifra cambia.** Restano 129 forzieri, 587 articoli, 223/355 cataloghi,
  53/38 contenuti.
- **Partita (§8): cambiano due cifre**, per lavoro dell'utente del 19/10 sera:
  - `lettura_partita` passa da 13 a **14** (libro da 10 a **11**, film 3);
  - `effetto_lettura_partita` passa da 19 a **20**.
  Restano uguali: `progresso_libro_partita` 11, film 3, acquisti 7, regali 0. Nel §10 la riga «acquisti / letture / progressi» va letta **7 / 14 / 11 libri + 3 film**.
- **Impronta**: riferimento `impronta-0440Z.json` (sha256 `bbd9de5d7833f0f9…`, L4 §11.7).
- **Forzieri dopo il Palazzo concluso** (R7-11b; concluso di L4 §8.14, misurato in L6 §10). Regola di `modifiche.md` §5.1: «preso» se la voce del forziere
  è fatta (regola k/N del pin, L4 §8.11); «non più ottenibile» se il Palazzo è concluso e la voce non è fatta; altrimenti «da prendere».
  | Palazzo | forzieri | p1 | p2 |
  |---|---:|---|---|
  | Kamoshida (concluso in p1 e p2) | 21 | preso 20, **non più ottenibile 1** | preso 21 |
  | Madarame (concluso in p1) | 19 | preso 19 | da prendere 19 |
  | Kaneshiro 6, Futaba 4, Okumura 15, Niijima 11, Shido 25, Maruki 19, Iweleth 9 | 89 | da prendere (i forzieri dei 6 Palazzi non hanno pin; Iweleth non ha un `voce_boss_finale`, L4 §8.14) | da prendere |
  **Anomalia: l'unico «non più ottenibile» è un falso positivo.** È la voce `kamoshida-15-torre-centrale-raccogli-forziere-3`, «Raccogli Forziere» (Unguento fisico).
  - Ha 3 pin: il **forziere** 615 (`ac5feb061a85a46869a432280321130a`, raccolto in p1) e due pin **`rampino`** del percorso, 2010
    (`57db1b0b1c797e674d776b6c2666c106`, «Stanza del Tesoro») e 2016 (`f0631f7a69eea18af903cb2aafee9389`, «Sala del Trono»), non raccolti.
  - Il conteggio k/N dà quindi 1/3. È uno dei 3 casi «in corso» di L4 §11.5, e il pin 615 è anche fra le 4 divergenze di L4 §11.
  - Nel gioco l'Unguento è stato preso: «non più ottenibile» sarebbe falso.
  - Proposta per Stesura, **da approvare**: per lo stato «preso» del forziere conta il pin di tipo `forziere`/`forziere-chiuso` della voce; se la voce non ne ha,
    si usa la regola k/N di prima. I pin di percorso (`rampino`, `scorciatoia`…) non decidono se l'oggetto è stato preso.
  - In alternativa, il caso resta «in corso» e lo segnala L11 R11-10c.
  - La verifica di `modifiche.md` §5.1 («un forziere non preso di Kamoshida p1 risulta "Non più ottenibile"») oggi non ha un caso vero in p1: va fatta con la
    partita di prova.
- **Impronta «prima» di L7 sulla base p5s-2026-10-20-0533Z** (richiesta del Manager). Script `impronta-l7.cjs` → `impronta-l7-0533Z.json`, nel mio scratchpad
  `~\AppData\Local\Temp\claude\C--Repository-project-p5r--claude-worktrees-pensive-burnell-b50941\161706c7-6e2c-47d6-bdb7-618347ce218c\scratchpad\`.
  Per ogni tabella: righe e sha256 di tutte le righe in ordine di chiave, senza `updated_at`/`created_at`. Sha256 complessivo
  **`b4d4737129d06ab5a5f8e1fd463fb2346761a79d258042a06ddaa8e56a787dcf`**, **identico sulla 0503Z** (la Prova non tocca L7) e stabile se rieseguito.
  | Dato | Righe | sha256 (inizio) |
  |---|---:|---|
  | `oggetto` | 223 | `f9db8608…` |
  | `traduzione` ambito `oggetto` | 223 | `40a49457…` |
  | `articolo` | 587 | `c5547492…` (anche per negozio, 61 voci in `dettaglio.articoliPerNegozio`) |
  | `negozio` | 61 | `13cd19bf…` |
  | `confidente_regalo` | 144 | `73382bd6…` |
  | `libro` / `film` / `attivita` | 46 / 30 / 30 | `898e6302…` / `5c30f4b4…` / `b53a5bfc…` |
  | `richiesta` | 33 | `eb4e2163…` |
  | `luogo` | 93 | `f54ba0be…` |
  | voci `forziere`/`forziere-chiuso` | 129 | `d3d88c8e…` (anche per Palazzo, in `dettaglio.forzieriPerPalazzo`) |
  | `dati_guida` per chiave | — | `oggetti-guida` `be852121…`, `jose` `f90e4a32…` (tutte le chiavi in `dettaglio.dati_guida`) |
  | `cestino` | 0 | — |
  | partita: `acquisto_partita` / `regalo_partita` / `lettura_partita` | 7 / 0 / 14 | `777401e9…` / — / `7fddc3a7…` |
  | partita: `progresso_libro_partita` / `_film_` / `_videogioco_` | 11 / 3 / 0 | `f1f62ec6…` / `5486308a…` / — |
  | partita: `effetto_lettura_partita` / `punti_negozio_partita` | 20 / 0 | `59009083…` / — |
  Le 6 tabelle nuove di L7 (`catalogo_oggetto`, `voce_oggetto`, `ricompensa_oggetto`, `ricetta_materiale`, `proposta_abbinamento`, `negozio_luogo_extra`) **non
  esistono**. Le 4 colonne nuove (`articolo.catalogo_chiave`, `articolo.costo_json`, `confidente_regalo.catalogo_chiave`, `regalo_partita.catalogo_chiave`) **mancano**.
  **Dopo** L7, l'impronta rifatta escludendo tabelle e colonne nuove deve dare gli **stessi sha** riga per riga, perché nessun testo, prezzo, chiave o
  condizione cambia (modifiche §2.7). Le eccezioni dichiarate sono quelle di `modifiche.md` §2: il listino di Jose e gli scambi di Sakai come articoli nuovi, le condizioni degli
  articoli che mancano (R5-12b) e la nota di `negozio.orari` di Hagoromo. Le voci di Kamoshida e Madarame restano senza `voce_oggetto` finché l'utente non conferma.
- **G-034 dell'Esperto (rilettura di L7 contro la guida)**, controllato sulla base 0533Z:
  1. **Tanaka**: oggi ha **20** articoli, coi nomi inglesi. La guida di Royal ne dà **18**, in italiano, con prezzi e gradi (Nero > 10.000 ¥ spesi, Oscurità > 50.000,
     Caos > 100.000).
     - **10 nomi** di oggi non esistono in Royal: Nirvana Ring, Black Stone, Condenser Lens, Hercules Anklet, Heros Eyepatch, Magic Rosary, Atom Match,
       Retribution Mirror, Dispel Ring, Roland Medal.
     - **Proposta**: il listino si rifà sulla guida, con i 18. I 20 di oggi vanno nell'elenco da approvare, con gli abbinamenti probabili di G-034 (Black Robe →
       Veste nera, Black Kogatana → Kogatana nera, Model Gun → Replica d'arma, Ouija Board → Tavola Ouija, Holy Cloth → Sacra Sindone, Crown of Salvation → Corona
       della salvezza, «Gemme elementali» → i 6 Magatama; possibili Five-Inch Nail → Chiodo ossidato, Inspired Hand Mirror → Spec. senso spirit.).
     - Gli **acquisti** della partita non toccano Tanaka: i 7 acquisti di p1 non sono suoi, quindi nessuna chiave di articolo citata si perde.
  2. Homunculus **5.000** (vince il listino; 120.000 resta nota). Dango lunare **800** (640 nota). Agodashi Oden **900** (800 nota).
  3. **Modellino di moto = 4.800**. Il listino `tokobushiya/modellino-di-moto` ha già 4.800, e così i regali di Makoto e Futaba. **Da correggere**: il regalo di **Shinya**
     (`confidente_regalo`, Shinya, ordine 1) con costo «3.600-4.800 yen (fonti discordanti)» → «4.800 yen». Il 3.600 è il «Set di mascotte locali».
  4. **Jose**: valgono le 37 righe di `dati_guida.jose.scambi` (già la regola di modifiche §2.5).
  5. Ricompense «non trovate»: i nomi sono giusti, salvo **Lo zio ingordo** (`richiesta.lo-zio-ingordo`). Oggi `ricompense_json` = «Venture Saber / Spadone
     dell'impresa (arma) - nome italiano non confermato da Allgamestaff» → **«Sciabola del rischio»** (arma per Mona).
  6. Contenuti dei forzieri «non trovati» (campione di 15): nomi giusti. Vanno quindi abbinati per **nome nuovo nel catalogo**, non corretti.
  7. «La fattorizzazione»: si ottiene da Sakai (Razione militare, 26–30/7), confermato da G-031.
  Le correzioni dei punti 3 e 5 sono dati di gioco fuori dal lavoro da preservare: vanno in M7 con il testo precedente come nota. Tanaka va rifatto da elenco approvato.
  **Regole di migrazione e cifre attese (G-034)**:
  - `confidente_regalo` (Shinya, ordine 1): **1** riga corretta, `costo` «4.800 yen». Il testo di prima va in nota; le altre 143 righe restano identiche.
  - `richiesta.lo-zio-ingordo`: **1** riga corretta, `ricompense_json` = «Sciabola del rischio (arma per Mona)». La ricompensa si collega al catalogo con un oggetto nuovo
    «Sciabola del rischio» (categoria arma), con il testo di prima in nota. Le altre 32 richieste restano identiche.
  - Prezzi: **nessun articolo cambia**. Dango lunare 800 e Agodashi Oden 900 sono già nei listini. Homunculus segue §11.1. I valori della pagina Oggetti (640, 800, 120.000)
    restano note sull'oggetto del catalogo.
  - Jose: listino dalle **37** righe di `dati_guida.jose.scambi`, come in modifiche §2.5.
  - Fuori da queste righe e da Tanaka, i dati di gioco di L7 non cambiano: lo sha per tabella dell'impronta «prima» resta uguale. Cambiano solo `articolo` (Tanaka, Jose,
    Sakai), `confidente_regalo` (1 riga) e `richiesta` (1 riga).

### 11.1 Listino di Tanaka: elenco «da approvare» per l'utente (R11-10c), riga per riga (G-034; base 0533Z)
Negozio `tanaka-affari-loschi` («Affari loschi di Tanaka»), **20 articoli**, tutti con le condizioni `data{10-01}` + laptop riparato. **Nessun acquisto** della partita
è di Tanaka: i 7 di p1 sono di distributore-shujin-cortile, fiorista-rafflesia, leblanc e yumenoshima. Regola prudente: **nessuna cancellazione**. Un articolo che non
esiste in Royal si **nasconde** (`nascosto = 1`, ripristinabile); uno abbinato prende nome, prezzo e grado della guida, con il testo di prima come nota.
| Articolo di oggi (chiave `tanaka-affari-loschi/…`) | Oggi: nome · prezzo · grado | Proposta | Motivo per l'utente |
|---|---|---|---|
| `nirvana-ring` | Nirvana Ring · 30.000 · Iniziale | **nascondere** | «Nella guida di Royal Tanaka non vende un "Nirvana Ring": probabilmente viene da un'altra versione del gioco.» |
| `black-stone` | Black Stone · 1.000 · Iniziale | **nascondere** | idem («Black Stone») |
| `five-inch-nail` | Five-Inch Nail · 2.000 · — | → **Chiodo ossidato**, 5.000, nessun grado (abbinamento **possibile**) | «La guida di Royal ha "Chiodo ossidato" a 5.000; il nome inglese fa pensare a lui, ma non è certo.» |
| `condenser-lens` | Condenser Lens · 3.600 · Iniziale | **nascondere** | non in Royal |
| `inspired-hand-mirror` | Inspired Hand Mirror · 5.000 · — | → **Spec. senso spirit.**, 5.000, nessun grado (**possibile**) | «La guida ha "Spec. senso spirit." a 5.000; l'abbinamento viene dal nome ed è da confermare.» |
| `gemme-elementali` | Gemme elementali · 6.000 · — | → **6 Magatama**: infernale, ciclonico, del gelo, elettrico (6.000, nessun grado); divino, esplosivo (6.000, grado Nero) | «La guida non ha un articolo unico "Gemme elementali": ha sei Magatama separati, uno per elemento, a 6.000.» |
| `hercules-anklet` | Hercules Anklet · 80.000 · Nero | **nascondere** | non in Royal |
| `heros-eyepatch` | Heros Eyepatch · 60.000 · Nero | **nascondere** | non in Royal |
| `black-robe` | Black Robe · 500 · Nero | → **Veste nera**, 500, Nero (**probabile**) | «Stesso prezzo e stesso grado: è la Veste nera della guida.» |
| `magic-rosary` | Magic Rosary · 50.000 · Oscuro | **nascondere** | non in Royal |
| `black-kogatana` | Black Kogatana · 1.000 · Oscurità | → **Kogatana nera**, 1.000, Oscurità (**probabile**) | «Stesso prezzo e grado: è la Kogatana nera della guida.» |
| `atom-match` | Atom Match · 2.000 · Oscuro | **nascondere** | non in Royal |
| `retribution-mirror` | Retribution Mirror · 24.000 · Oscuro | **nascondere** | non in Royal |
| `holy-cloth` | Holy Cloth · 10.000 · Oscurità | → **Sacra Sindone**, 10.000, Oscurità (**probabile**) | «Stesso prezzo e grado: è la Sacra Sindone della guida.» |
| `ouija-board` | Ouija Board · 10.000 · Oscurità | → **Tavola Ouija**, 10.000, Oscurità (**probabile**) | idem |
| `dispel-ring` | Dispel Ring · 100.000 · Caos | **nascondere** | non in Royal |
| `model-gun` | Model Gun · 1.000 · Caos | → **Replica d'arma**, 1.000, Caos (**probabile**) | «Stesso prezzo e grado: è la Replica d'arma della guida.» |
| `roland-medal` | Roland Medal · 500.000 · Caos | **nascondere** | non in Royal |
| `homunculus` | Homunculus · **120.000** · Caos | → **Homunculus, 5.000**, Caos | «La guida si contraddice (120.000 nella pagina Oggetti, 5.000 nel negozio di Tanaka): vale il negozio, 5.000.» (G-034 punto 2) |
| `crown-of-salvation` | Crown of Salvation · 990.000 · Caos | → **Corona della salvezza**, 990.000, Caos (**probabile**) | «Stesso prezzo e grado: è la Corona della salvezza della guida.» |
**Articoli nuovi** (della guida, senza un articolo di oggi): **Spec. spirit. oscuro** 5.000 (Nero), **Fotocamera spirituale** 5.000 (Oscurità), **Maschera sorridente** 5.000 (Caos).
I 6 Magatama nascono dalla riga `gemme-elementali`: uno prende la sua chiave, gli altri 5 sono articoli nuovi.
**Cifre attese**:
- dopo il **sì** dell'utente, il listino visibile di Tanaka ha **18** articoli (guida):
  - **10** abbinati che tengono la chiave di oggi: chiodo, specchio, la riga delle gemme per il primo Magatama, veste, kogatana, sindone, tavola, replica, homunculus,
    corona;
  - **8** nuovi: 5 Magatama + 3 della guida;
- **10** articoli nascosti, che restano nel database;
- **0** acquisti toccati.
Prima del sì non cambia nulla: restano 20 articoli visibili. Gradi della guida: Nero > 10.000 ¥ spesi, Oscurità > 50.000, Caos > 100.000.
- **Base p5s** (`dati-produzione/p5s-2026-10-20-0503Z/`): `l7` è **identico** alla 0440Z (cataloghi e partita). Forzieri: Kamoshida p1 **21 presi**, 0 non più ottenibili
  (l'utente ha segnato le voci, L4 §11.8); Madarame p1 19/19. La regola «conta il pin forziere» (accolta da Stesura) resta per il caso generale. Impronta: `ff3033cb…`.
