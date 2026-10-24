# L5 — riscontro delle 127 voci «da-riscontrare» (nomi e note dei pin, pin aggiuntivo)

Analisi dati, 2026-10-23, sola lettura. Incarico del PM: riscontrare le 32 voci `L5-NOME-PIN-*`, le 94 `L5-NOTA-PIN-*` e `L5-PIN-PERSONALE-UNICO`
(`stato.json` → `pianoAtomico.voci`, criterio e fonte di ogni voce).

## 1. Esito in una riga

| Voci | Coincide | Diverso | Non decidibile |
|---|---:|---:|---:|
| `L5-NOME-PIN-*` (32) | **29** | **1** (pin 1584) | **2** (pin 1548 e 1769) |
| `L5-NOTA-PIN-*` (94) | **94** | 0 | 0 |
| `L5-PIN-PERSONALE-UNICO` (1) | **1** | 0 | 0 |
| **Totale 127** | **124** | **1** | **2** |

Nessuna nota è perduta o alterata, e nessun nome proprio di un pin è stato cambiato: le tre voci non chiuse riguardano il **collegamento** del pin
a un negozio, non il nome né la nota. Nessuna scrittura su dati o servizi; le migrazioni 139–141 sono state provate solo su una copia.

## 2. Dati, metodo e limiti

- **Dati**: copia di p5s `dati-p5s/p5s-2026-10-23-1935Z/` (gioco schema 138, partite 30), copiata nella scratchpad e aperta con better-sqlite3 `readonly`.
- **Riferimento pubblico**: `pacchetto/gioco.db` (schema 93), copiato e aperto in sola lettura. Serve a sapere che cosa c'era in nome e nota prima delle
  migrazioni di L5–L7 e degli ordini dell'utente.
- **Inventario**: `inventario-atomico-L5.json` (specifica `43ad8889`, schema 137). Il mio calcolo riproduce le sue cifre: 94 pin con luogo, **32** nomi
  discordanti (gli stessi 32 id), 0 pin con luogo non risolto, 0 luoghi o negozi nascosti fra i bersagli.
- **Che cosa significa «coincide»**:
  - **Nome** (`L5-NOME-PIN`): la differenza tra il nome del pin e quello mostrato (Luogo o negozio) è solo etichetta generica contro nome proprio;
    il nome del pin è **identico a quello del pacchetto pubblico** e l'app lo mostra come «Nota del pin» (`luogoDelPin`,
    `server/services/luoghiService.ts:206-223`; visore `VisoreMappa.tsx:1027`); il collegamento è coerente per quartiere e per Area della mappa;
    il tipo dell'icona nativa del gioco (`nativo_json.nomeNativo`, fonte Royal) è coerente con il tipo di luogo. Le traduzioni delle icone giapponesi
    sono mie (termini comuni, certezza alta).
  - **Nota** (`L5-NOTA-PIN`): la descrizione del pin è, riga per riga, uguale a quella del pacchetto pubblico **dopo** le uniche due modifiche
    ordinate dall'utente (la frase fissa «Pin nativo del gioco.» tolta, migrazioni 116 e 117); il bersaglio esiste ed è visibile; il testo è
    raggiungibile dall'app. **Non certifico la correttezza semantica del testo**: solo conservazione e accesso.
- **Limiti**: non ho consultato la guida online per i nomi dei luoghi; le fonti sono il Luogo (DB), l'icona nativa di Royal e i documenti già agli atti
  (G-014, `proposta-residui-29.md`). Nessun testo di descrizione è riportato qui: solo categorie, lunghezze e confronti.

## 3. Effetto delle migrazioni 139, 140 e 141 (lette nei sorgenti e provate su una copia)

Prova: `runMigrations` del codice di `newreview` su una copia di p5s-1935Z nella scratchpad (mai su `data/` né su p5s). Da gioco 138 a **141**, partite
30 invariate, nessun errore.

| Migrazione | Che cosa fa | Effetto sui pin dei 127 |
|---|---|---|
| **139** `note_storiche` | crea `nota_storica` e `nota_storica_legame`: la nota sul prezzo di Homunculus (G-034) e i suoi 2 legami (offerta e oggetto del catalogo) | **nessuno**: non tocca `spillo` |
| **140** `aree_dei_luoghi` | scrive `luogo.area_chiave` dove è NULL: **21** collocati, **23** restano senza Area (44 prima), nessun luogo saltato | nessuno su nomi e note; cambia solo la geografia di 9 pin (§5): 293, 1536, 1538, 1540, 1541, 1542, 1587 e 1589 da «luogo senza Area» a «stessa Area» della mappa; 215 da «luogo senza Area» a «pin sull'illustrazione del quartiere» |
| **141** `decisione_tanaka` | crea il registro (vuoto) della decisione unitaria su Tanaka | **nessuno** |

Verifica a hash: `spillo`, `negozio`, `area`, `mappa`, `spillo_voce`, `negozio_sede_spillo` sono **identiche** prima e dopo (stesso sha256 delle righe senza
`updated_at`); le 94 righe dei pin sono identiche; cambia solo `luogo` (le 21 Aree). L'intestazione di `140_aree_dei_luoghi.ts` dice ancora «ne colloca 23 … ne
esclude 21»: sono i totali invertiti che `proposta-aree-44-luoghi.md` ha già corretto (21 collocati, 23 esclusi). Il codice e la tabella sono giusti, il commento no.

## 4. `L5-NOME-PIN-*`: i 32 nomi

Per ognuno il nome del pin è conservato (identico al pacchetto) e diventa la «Nota del pin». I nomi cambiati dall'utente (seed ≠ nome attuale: 292, 346, 1537,
1539, 1540, 1542, 1584) sono suoi e restano.

| Pin | Nome del pin | Nome mostrato (fonte) | Icona nativa di Royal | Collegamento e geografia | Esito |
|---|---|---|---|---|---|
| 268 | Ferramenta | Negozio di elettronica Akiba (luogo) | 工具店 negozio di attrezzi | Electric Town, stessa Area | **Coincide** |
| 269 | Distributori di capsule | Gachapon di Akihabara (luogo) | カチャガチャ gachapon | Electric Town, stessa Area | **Coincide** |
| 290 | Distributore di bevande | Distributore Edificio Scolastico (negozio) | 自販機 distributore | Shujin, listino dell'edificio; luogo aggregato senza Area (esclusione approvata) | **Coincide** |
| 291 | Distributore di bevande | Distributore Edificio Scolastico (negozio) | 自販機 | come 290 | **Coincide** |
| 292 | Distributore Cortile | Distributore del cortile (negozio) | 自販機 | Shujin, listino del cortile | **Coincide** |
| 293 | Panetteria | Negozio scolastico Shujin (negozio) | パン屋 panetteria | Shujin; dopo la 140 stessa Area | **Coincide** |
| 334 | Libreria | Biblioteca (attività) | 本屋 libreria | pin sulla planimetria del 3° piano, luogo nell'Area Biblioteca; doppio pin con 346 | **Coincide** |
| 346 | Biblioteca Scolastica | Biblioteca (luogo) | 移動先アイコン icona di spostamento (era «Punto di spostamento»: scelta dell'utente) | planimetria Biblioteca, stessa Area | **Coincide** |
| 360 | Panini al vapore | Street food cinese Houraku (luogo) | 中華マン屋 negozio di nikuman | Kichijoji, stessa Area | **Coincide** |
| 363 | Alimentari importati | Verdura d'importazione MealPort (luogo) | 輸入食品 alimentari importati | Kichijoji, stessa Area | **Coincide** |
| 1466 | Lotteria | Banco della lotteria di Shibuya (luogo) | 宝くじ lotteria | Piazza della stazione, stessa Area | **Coincide** |
| 1486 | Chiosco dei succhi | Chiosco dei succhi del Sottopasso (luogo) | ジューサーバー juice bar | Sottopasso, stessa Area | **Coincide** |
| 1494 | Distributore di bevande | Distributore del sottopasso (negozio) | 自販機 | Sottopasso, stessa Area | **Coincide** |
| 1526 | Cinema | Cinema di Shibuya (luogo) | 映画館 cinema | Central Street, stessa Area | **Coincide** |
| 1527 | Distributore di bevande | Distributore Edificio Scolastico (negozio, set condiviso) | 自販機 | Central Street, sede confermata del pin `shibuya/distributori-central-street`; coerente col gioco (G-014) | **Coincide** |
| 1530 | Venditore di accessori nel vicolo | Venditore ambulante (luogo) | 路地アクセサリー売り venditore di accessori nel vicolo | Central Street, stessa Area | **Coincide** |
| 1536 | Gioielleria | Tsurukame Diamond (negozio) | 宝石店 gioielleria | Centro comm. sotterraneo; dopo la 140 stessa Area | **Coincide** |
| 1537 | Fiorista | Fiorista Rafflesia (luogo) | 花屋 fiorista | Centro comm. sotterraneo, stessa Area | **Coincide** |
| 1538 | Accessori | 37 Gradi Celsius (negozio) | アクセサリー accessori | Centro comm. sotterraneo; dopo la 140 stessa Area | **Coincide** |
| 1539 | Cosmetici | Body Chop (luogo) | コスメ cosmetici | Centro comm. sotterraneo, stessa Area | **Coincide** |
| 1540 | Articoli Locali | High Sense (negozio) | 和風雑貨 articoli di stile giapponese | Centro comm. sotterraneo; dopo la 140 stessa Area | **Coincide** |
| 1541 | Articoli sportivi | Articoli Sportivi Shibuya (negozio) | スポーツ用品 articoli sportivi | Centro comm. sotterraneo; dopo la 140 stessa Area | **Coincide** |
| 1542 | Supermercato di Lusso | Taisho Store (negozio) | スーパー（小） piccolo supermercato | Centro comm. sotterraneo; dopo la 140 stessa Area | **Coincide** |
| 1547 | Distributore di bevande | Distributore Edificio Scolastico (negozio, set condiviso) | 自販機 | Tornello Ginza, sede confermata `shibuya/distributore-tornello-ginza`; coerente (G-014) | **Coincide** |
| 1548 | Distributore di bevande | Distributore del tabaccaio (negozio di Yongen-Jaya) | 自販機 | pin a **Shibuya** (Tornello Ginza), negozio con sede a **Yongen-Jaya**, nessuna sede confermata | **Non decidibile** |
| 1561 | Casalinghi | Negozio di articoli vari Mran Mran (luogo) | 雑貨屋 negozio di articoli vari | Quartiere a luci rosse, stessa Area | **Coincide** |
| 1562 | Fioraio | Fioraio Sukebe (luogo) | 花屋 fiorista | Quartiere a luci rosse, stessa Area | **Coincide** |
| 1584 | Distributore automatico | Distributore del cortile (negozio della Shujin) | 自販機 | pin a **Yongen-Jaya** (Vicoli), negozio con sede alla **Shujin** | **Diverso** |
| 1759 | Distributore di bevande | Distributore Edificio Scolastico (negozio) | — (pin dell'utente, senza dati nativi) | Shujin, listino dell'edificio | **Coincide** |
| 1760 | Distributore Cancello | Distributore del cancello (negozio) | — | Shujin, listino del cancello | **Coincide** |
| 1768 | Distributore di bevande | Distributore del cancello (negozio, set condiviso) | — | Central Street, sede confermata `shibuya/distributori-central-street`; coerente (G-014) | **Coincide** |
| 1769 | Distributore di bevande | Distributore del cancello (negozio) | — | pin a **Shibuya**, negozio con sede alla **Shujin**, nessuna sede confermata; gemello di 1768 | **Non decidibile** |

### 4.1 Le tre voci non chiuse

- **`L5-NOME-PIN-1584` — Diverso.**
  - **Prova**: il pin sta sulla planimetria dei Vicoli di Yongen-Jaya e cita `distributore-shujin-cortile`, il cui luogo è alla Shujin: nel gioco il cortile della Shujin non è
    a Yongen-Jaya. Sulla stessa planimetria 1585 è già «Distributore automatico (Tabaccaio)» (luogo `yongen-jaya/distributore-tabaccaio`) e 1590 è il bagno pubblico.
  - **Valore corretto proposto**: negozio `distributore-yongen-bagno` e luogo `yongen-jaya/distributore-bagno-pubblico`, per esclusione (le macchine di Yongen sono due:
    bagno e tabaccaio). Dopo la 140 il luogo proposto è nell'Area `citta/yongen-jaya/vicoli`, la stessa del pin.
  - **Certezza**: media-alta, come `proposta-residui-29.md` §2, che dà la stessa conclusione con altre fonti. L'identità seed del pin diceva «Tabaccaio», ma 1585 lo è già.
  - **Pin dell'utente**: solo con il suo sì. È la stessa decisione della voce `L5-LISTINO-PIN-1584`.
- **`L5-NOME-PIN-1769` — Non decidibile.** Il pin e il gemello 1768 citano lo stesso listino (Joylent); 1768 ha la sede confermata a Central Street, 1769 no. Le fonti dicono che le
  macchine vicino alla libreria hanno assortimenti diversi, ma non quale dei due pin sia l'altra macchina. Resta la decisione aperta dell'utente (`proposta-residui-29.md` §7,
  voce `L5-LISTINO-PIN-1769`).
- **Aggiornamento del PM (23/10 sera):** il 1548 è chiuso come «coincide» (certezza media). Samurai Gamers mette al varco della linea Ginza di Shibuya un distributore con l'assortimento Nastea, 1UP, Starvicks, lo stesso del listino collegato. Il 1584 e il 1769 li ha decisi l'utente: 1584 → distributore del bagno di Yongen, 1769 → Nastea.
- **`L5-NOME-PIN-1548` — Non decidibile** (prima della ricerca). Il pin sta sul Tornello Ginza di Shibuya e cita il negozio del tabaccaio di Yongen-Jaya (Nastea, 1UP, Starvicks), senza una sede confermata
  (non è fra le righe di `negozio_sede_spillo`). Il suo assortimento potrebbe ripetersi a Shibuya, come i set condivisi di G-014 («Central Street destra vende Nastea/1UP/Starvicks»),
  ma G-014 non giudica questo pin. Serve una risposta dell'Esperto: se il set è lo stesso, basta confermare la sede del pin (come 1527, 1547, 1768); altrimenti è un secondo caso come 1584.
  Non è nell'inventario (che segnala solo 1584 e 1769): lo segnalo come terzo caso.

## 5. `L5-NOTA-PIN-*`: le 94 note

**Conservazione: 94 su 94 identiche all'atteso.**

| Categoria della descrizione nel pacchetto pubblico | Pin | Ora | Esito |
|---|---:|---|---|
| testo proprio | 43 | **uguale** al pacchetto | conservata |
| solo la frase fissa «Pin nativo del gioco.» | 37 | vuota: la frase è stata tolta per ordine dell'utente (migrazione 116) | nessun testo proprio da conservare |
| frase fissa in testa, poi testo | 13 | solo il testo, senza la frase (migrazione 117) | conservata |
| già vuota | 1 | vuota | — |
**Accesso**: nessun bersaglio è nascosto o mancante. Per un pin di luogo l'app mostra il nome e la descrizione del luogo; il nome del pin, se diverso, e la descrizione,
se diversa da quella del luogo, restano «Nota del pin». Per un pin di negozio la descrizione propria resta la descrizione del pin e il nome diverso è la «Nota del pin».

| Modo di accesso | Pin |
|---|---:|
| «Nota del pin» (descrizione propria diversa da quella del luogo, e/o nome) | 16 (+ i nomi diversi, §4) |
| descrizione del pin di negozio | 16 |
| descrizione uguale a quella del luogo (già visibile come descrizione del luogo) | 24 |
| nessun testo da mostrare | 38 |
**Geografia** (dopo la 140): stessa Area 61; pin sull'illustrazione del quartiere (nessuna Area sulla mappa) 11; luogo senza Area nello stesso quartiere 18; planimetria del piano con luogo
nell'Area Biblioteca 1 (pin 334); quartiere diverso 3 (1548, 1584, 1769, già in §4.1). La 140 porta 8 pin (293, 1536, 1538, 1540, 1541, 1542, 1587, 1589) da «luogo senza Area» a «stessa Area» e il pin 215 a
«illustrazione del quartiere»; prima della 140: 53 stessa Area, 27 luogo senza Area, 10 illustrazione, 1 planimetria del piano, 3 quartiere diverso (94 in tutto). Le tre voci di quartiere diverso restano **Coincide per la nota**: la loro nota è conservata e
raggiungibile; il collegamento è oggetto delle voci `NOME-PIN` e `LISTINO-PIN`.

Una riga per pin (tutte **Coincide**):

| Pin | Tipo | Collegamento | Descrizione nel pacchetto → ora | Dove si vede la nota | Geografia |
|---|---|---|---|---|---|
| 208 | attivita | luogo → `shinjuku/cinema-cult9` | testo intatto | come la descrizione del luogo | illustrazione del quartiere |
| 209 | confidente | luogo → `shinjuku/crossroads` | testo intatto | come la descrizione del luogo | illustrazione del quartiere |
| 210 | negozio | luogo → `shinjuku/fioraio-sukebe` | testo intatto | come la descrizione del luogo | illustrazione del quartiere |
| 211 | negozio | luogo → `shinjuku/hinokuniya` | testo intatto | come la descrizione del luogo | illustrazione del quartiere |
| 212 | negozio | luogo → `shinjuku/mran-mran` | testo intatto | come la descrizione del luogo | illustrazione del quartiere |
| 213 | negozio | luogo → `akihabara/akiba-electronics` | testo intatto | come la descrizione del luogo | illustrazione del quartiere |
| 214 | negozio | luogo → `akihabara/akindo` | testo intatto | come la descrizione del luogo | illustrazione del quartiere |
| 215 | distributore | luogo → `akihabara/distributori-akihabara` | testo intatto | come la descrizione del luogo | illustrazione del quartiere (dopo la 140; prima luogo senza Area) |
| 216 | ristorante | luogo → `akihabara/maid-cafe-akihabara` | testo intatto | come la descrizione del luogo | illustrazione del quartiere |
| 217 | confidente | luogo → `akihabara/sala-giochi-akihabara` | testo intatto | come la descrizione del luogo | illustrazione del quartiere |
| 218 | negozio | luogo → `akihabara/tokobushiya` | testo intatto | come la descrizione del luogo | illustrazione del quartiere |
| 220 | negozio | luogo → `kanda-jinbocho/nagiuri` | testo intatto | come la descrizione del luogo | luogo senza Area, stesso quartiere |
| 221 | nota | luogo → `harajuku/harajuku-hangout` | testo intatto | come la descrizione del luogo | luogo senza Area, stesso quartiere |
| 222 | nota | luogo → `ueno/museo-ueno` | testo intatto | come la descrizione del luogo | luogo senza Area, stesso quartiere |
| 225 | nota | luogo → `shinagawa/shinagawa-acquario` | testo intatto | come la descrizione del luogo | luogo senza Area, stesso quartiere |
| 226 | ristorante | luogo → `ogikubo/ogikubo-ramen` | testo intatto | come la descrizione del luogo | luogo senza Area, stesso quartiere |
| 227 | nota | luogo → `yokohama-chinatown/chinatown-hangout` | testo intatto | come la descrizione del luogo | luogo senza Area, stesso quartiere |
| 228 | nota | luogo → `maihama/destinyland` | testo intatto | come la descrizione del luogo | luogo senza Area, stesso quartiere |
| 229 | nota | luogo → `roppongi/okumura-foods-hq` | testo intatto | come la descrizione del luogo | luogo senza Area, stesso quartiere |
| 230 | ristorante | luogo → `tsukishima/tsukishima-monjayaki` | testo intatto | come la descrizione del luogo | luogo senza Area, stesso quartiere |
| 231 | nota | luogo → `meiji-shrine/meiji-shrine-hangout` | testo intatto | come la descrizione del luogo | luogo senza Area, stesso quartiere |
| 232 | attivita | luogo → `ichigaya/laghetto-ichigaya` | testo intatto | come la descrizione del luogo | luogo senza Area, stesso quartiere |
| 233 | nota | luogo → `suidobashi/dome-town` | testo intatto | come la descrizione del luogo | luogo senza Area, stesso quartiere |
| 234 | nota | luogo → `asakusa/asakusa-hangout` | testo intatto | come la descrizione del luogo | luogo senza Area, stesso quartiere |
| 265 | negozio | luogo → `akihabara/tokobushiya` | solo frase fissa → vuota (116) | nessun testo | stessa Area |
| 266 | ristorante | luogo → `akihabara/maid-cafe-akihabara` | solo frase fissa → vuota (116) | nessun testo | stessa Area |
| 267 | negozio | luogo → `akihabara/akindo` | solo frase fissa → vuota (116) | nessun testo | stessa Area |
| 268 | negozio | luogo → `akihabara/akiba-electronics` | frase in testa tolta, resto intatto (117); nome → nota | «Nota del pin» | stessa Area |
| 269 | negozio | luogo → `akihabara/gachapon-akihabara` | frase in testa tolta, resto intatto (117); nome → nota | «Nota del pin» | stessa Area |
| 270 | negozio | luogo → `akihabara/super-baron` | solo frase fissa → vuota (116) | nessun testo | stessa Area |
| 271 | sala-giochi | luogo → `akihabara/sala-giochi-akihabara` | solo frase fissa → vuota (116) | nessun testo | stessa Area |
| 290 | distributore | negozio → `shujin-academy/distributori-shujin` | frase in testa tolta, resto intatto (117); nome → nota | descrizione del pin | luogo senza Area, stesso quartiere |
| 291 | distributore | negozio → `shujin-academy/distributori-shujin` | frase in testa tolta, resto intatto (117); nome → nota | descrizione del pin | luogo senza Area, stesso quartiere |
| 292 | distributore | negozio → `shujin-academy/distributori-shujin` | testo intatto; nome → nota | descrizione del pin | luogo senza Area, stesso quartiere |
| 293 | negozio | negozio → `shujin-academy/negozio-scolastico` | frase in testa tolta, resto intatto (117); nome → nota | descrizione del pin | stessa Area (dopo la 140) |
| 334 | negozio | attività → `shujin-academy/biblioteca-shujin` | testo intatto; nome → nota | «Nota del pin» | planimetria del piano, luogo nell'Area Biblioteca |
| 346 | negozio | luogo → `shujin-academy/biblioteca-shujin` | frase in testa tolta, resto intatto (117); nome → nota | «Nota del pin» | stessa Area |
| 351 | negozio | luogo → `kichijoji/stoneon` | solo frase fissa → vuota (116) | nessun testo | stessa Area |
| 352 | negozio | luogo → `kichijoji/mitsubachi` | solo frase fissa → vuota (116) | nessun testo | stessa Area |
| 353 | negozio | luogo → `kichijoji/mantra-ganda` | solo frase fissa → vuota (116) | nessun testo | stessa Area |
| 354 | negozio | luogo → `kichijoji/vestiti-usati-kichijoji` | solo frase fissa → vuota (116) | nessun testo | stessa Area |
| 355 | culto | luogo → `kichijoji/vecchio-tempio-kichijoji` | solo frase fissa → vuota (116) | nessun testo | stessa Area |
| 356 | attivita | luogo → `kichijoji/jazz-jin` | solo frase fissa → vuota (116) | nessun testo | stessa Area |
| 357 | attivita | luogo → `kichijoji/penguin-sniper` | solo frase fissa → vuota (116) | nessun testo | stessa Area |
| 358 | ristorante | luogo → `kichijoji/hagoromo` | solo frase fissa → vuota (116) | nessun testo | stessa Area |
| 360 | ristorante | luogo → `kichijoji/houraku` | frase in testa tolta, resto intatto (117); nome → nota | «Nota del pin» | stessa Area |
| 363 | negozio | luogo → `kichijoji/mealport` | frase in testa tolta, resto intatto (117); nome → nota | «Nota del pin» | stessa Area |
| 1466 | attivita | luogo → `shibuya/u-banco-della-lotteria-di-shibuya` | testo intatto; nome → nota | «Nota del pin» | stessa Area |
| 1486 | distributore | luogo → `shibuya/u-chiosco-dei-succhi-del-sottopasso` | testo intatto; nome → nota | «Nota del pin» | stessa Area |
| 1487 | negozio | luogo → `shibuya/kiyasuku` | solo frase fissa → vuota (116) | nessun testo | stessa Area |
| 1494 | distributore | luogo → `shibuya/distributore-sottopasso` | frase in testa tolta, resto intatto (117); nome → nota | «Nota del pin» | stessa Area |
| 1515 | sala-giochi | luogo → `shibuya/sala-giochi-shibuya` | solo frase fissa → vuota (116) | nessun testo | stessa Area |
| 1516 | ristorante | luogo → `shibuya/ore-no-beko` | solo frase fissa → vuota (116) | nessun testo | stessa Area |
| 1517 | negozio | luogo → `shibuya/untouchable` | testo intatto | «Nota del pin» | stessa Area |
| 1518 | attivita | luogo → `shibuya/protein-lovers` | solo frase fissa → vuota (116) | nessun testo | stessa Area |
| 1519 | negozio | luogo → `shibuya/scarlet` | già vuota | nessun testo | stessa Area |
| 1520 | negozio | luogo → `shibuya/rocinante` | solo frase fissa → vuota (116) | nessun testo | stessa Area |
| 1521 | negozio | luogo → `shibuya/aohige` | solo frase fissa → vuota (116) | nessun testo | stessa Area |
| 1522 | ristorante | luogo → `shibuya/diner` | solo frase fissa → vuota (116) | nessun testo | stessa Area |
| 1523 | ristorante | luogo → `shibuya/big-bang-burger` | solo frase fissa → vuota (116) | nessun testo | stessa Area |
| 1524 | negozio | luogo → `shibuya/taiheido` | solo frase fissa → vuota (116) | nessun testo | stessa Area |
| 1525 | negozio | luogo → `shibuya/triple-seven` | solo frase fissa → vuota (116) | nessun testo | stessa Area |
| 1526 | cinema | luogo → `shibuya/u-cinema-di-shibuya` | frase in testa tolta, resto intatto (117); nome → nota | «Nota del pin» | stessa Area |
| 1527 | distributore | negozio → `shibuya/distributori-central-street` (sede confermata) | testo intatto; nome → nota | descrizione del pin | stessa Area |
| 1530 | negozio | luogo → `shibuya/venditore-ambulante` | frase in testa tolta, resto intatto (117); nome → nota | «Nota del pin» | stessa Area |
| 1536 | negozio | negozio → `shibuya/tsurukame` | testo intatto; nome → nota | descrizione del pin | stessa Area (dopo la 140) |
| 1537 | negozio | luogo → `shibuya/rafflesia` | testo intatto; nome → nota | «Nota del pin» | stessa Area |
| 1538 | negozio | negozio → `shibuya/37-gradi` | testo intatto; nome → nota | descrizione del pin | stessa Area (dopo la 140) |
| 1539 | negozio | luogo → `shibuya/body-chop` | testo intatto; nome → nota | «Nota del pin» | stessa Area |
| 1540 | negozio | negozio → `shibuya/high-sense` | testo intatto; nome → nota | descrizione del pin | stessa Area (dopo la 140) |
| 1541 | negozio | negozio → `shibuya/prossimo-asso` | testo intatto; nome → nota | descrizione del pin | stessa Area (dopo la 140) |
| 1542 | negozio | negozio → `shibuya/taisho-store` | testo intatto; nome → nota | descrizione del pin | stessa Area (dopo la 140) |
| 1546 | negozio | luogo → `shibuya/yon-germain` | solo frase fissa → vuota (116) | nessun testo | stessa Area |
| 1547 | distributore | negozio → `shibuya/distributore-tornello-ginza` (sede confermata) | testo intatto; nome → nota | descrizione del pin | stessa Area |
| 1548 | distributore | negozio → `yongen-jaya/distributore-tabaccaio` | testo intatto; nome → nota | descrizione del pin | **quartiere diverso** (§4.1) |
| 1560 | ristorante | luogo → `shinjuku/crossroads` | solo frase fissa → vuota (116) | nessun testo | stessa Area |
| 1561 | negozio | luogo → `shinjuku/mran-mran` | frase in testa tolta, resto intatto (117); nome → nota | «Nota del pin» | stessa Area |
| 1562 | negozio | luogo → `shinjuku/fioraio-sukebe` | frase in testa tolta, resto intatto (117); nome → nota | «Nota del pin» | stessa Area |
| 1563 | negozio | luogo → `shinjuku/hinokuniya` | solo frase fissa → vuota (116) | nessun testo | stessa Area |
| 1567 | cinema | luogo → `shinjuku/cinema-cult9` | solo frase fissa → vuota (116) | nessun testo | stessa Area |
| 1584 | distributore | negozio → `shujin-academy/distributori-shujin` | solo frase fissa → vuota (116); nome → nota | nessun testo | **quartiere diverso** (§4.1) |
| 1585 | distributore | luogo → `yongen-jaya/distributore-tabaccaio` | solo frase fissa → vuota (116) | nessun testo | stessa Area |
| 1586 | lavanderia | luogo → `yongen-jaya/lavanderia-yongen` | solo frase fissa → vuota (116) | nessun testo | stessa Area |
| 1587 | attivita | attività → `yongen-jaya/batting-cage-yongen` | solo frase fissa → vuota (116) | nessun testo | stessa Area (dopo la 140) |
| 1588 | casa | luogo → `yongen-jaya/leblanc` | solo frase fissa → vuota (116) | nessun testo | stessa Area |
| 1589 | negozio | negozio → `yongen-jaya/super-muramasa` | solo frase fissa → vuota (116) | nessun testo | stessa Area (dopo la 140) |
| 1590 | terme | luogo → `yongen-jaya/bagno-pubblico` | solo frase fissa → vuota (116) | nessun testo | stessa Area |
| 1591 | negozio | luogo → `yongen-jaya/negozio-usato-yumenoshima` | solo frase fissa → vuota (116) | nessun testo | stessa Area |
| 1592 | negozio | luogo → `yongen-jaya/clinica-takemi` | solo frase fissa → vuota (116) | nessun testo | stessa Area |
| 1593 | cinema | luogo → `yongen-jaya/cinema-yongen` | solo frase fissa → vuota (116) | nessun testo | stessa Area |
| 1759 | distributore | negozio → `shujin-academy/distributori-shujin` | testo intatto; nome → nota | descrizione del pin | luogo senza Area, stesso quartiere |
| 1760 | distributore | negozio → `shujin-academy/distributori-shujin` | testo intatto; nome → nota | descrizione del pin | luogo senza Area, stesso quartiere |
| 1768 | distributore | negozio → `shibuya/distributori-central-street` (sede confermata) | testo intatto; nome → nota | descrizione del pin | stessa Area |
| 1769 | distributore | negozio → `shujin-academy/distributori-shujin` | testo intatto; nome → nota | descrizione del pin | **quartiere diverso** (§4.1) |

## 6. `L5-PIN-PERSONALE-UNICO` — Coincide

Identità e contenuti restano fuori da Git; l'individuazione è nel censimento locale (copia 1935Z). Riscontrato, solo con indicatori strutturali:
- nella copia c'è **un solo** pin del mondo che non esiste nel pacchetto pubblico (295 pin del mondo contro 294 pubblici), ed è un pin dell'utente: l'inventario ne dice 1 («pinAggiuntivoNonPubblico»);
- ha un riferimento a un negozio con sede nella stessa Area della sua mappa (Central Street); nessun altro pin cita quel negozio;
- 0 voci della guida collegate, 0 stati di partita, nessuna condizione;
- la sua riga è **identica** prima e dopo le migrazioni 139–141 (stesso sha256 della riga); nome e descrizione propri sono conservati e il nome, diverso da quello del negozio, resterebbe «Nota del pin».
Nessuna conversione né modifica.

## 7. Proposta per le voci non chiuse

| Voce | Esito | Proposta | Chi decide |
|---|---|---|---|
| `L5-NOME-PIN-1584` | Diverso | collegare il pin al negozio `distributore-yongen-bagno` (luogo `yongen-jaya/distributore-bagno-pubblico`), pin dell'utente; stessa decisione di `L5-LISTINO-PIN-1584` | utente |
| `L5-NOME-PIN-1769` | Non decidibile | nessuna: le fonti non dicono quale fra 1768 e 1769 sia l'altra macchina; stessa decisione di `L5-LISTINO-PIN-1769` | utente |
| `L5-NOME-PIN-1548` | Non decidibile | chiedere all'Esperto se il set del tabaccaio si ripete al Tornello Ginza: se sì confermare la sede del pin (`negozio_sede_spillo`); se no, come 1584 | Esperto, poi utente |

Voci da chiudere come **coincide**: 29 `NOME-PIN` (tutte tranne 1548, 1584, 1769), tutte le 94 `NOTA-PIN` e `PIN-PERSONALE-UNICO`: **124**.
