# L11 R11-10c — le 13 voci chiuse consolidando i dati (nessuna sezione «Da rivedere»)

Analisi dati, 2026-10-24, sola lettura. Nessun codice, dato o migrazione toccato; nessun test. Formato: come `ondata1-2026-10-24.md` e `ondata1/*.md`.

## 0. Che cosa è cambiato e come si legge

**Decisione dell'utente (24/10, `docs/DECISIONI.md`):** «L11 R11-10c: niente sezione "Da rivedere"; le 13 voci si chiudono consolidando i dati con migrazioni».
Quindi `GET /api/da-rivedere`, la pagina `/guida/da-rivedere`, il contatore nella barra, i «fornitori» per tipo e il blocco B18 di
`preparazione-2026-10-23.md` (già «sospeso») **non si costruiscono**. Il requisito R11-10c di `requisiti.md:46-61` va riscritto in questo senso (vedi §8).
Resta valida la regola dell'utente del 23/10 (BON-11): niente nuovi pannelli di revisione senza il suo sì.

**Regola di decisione** (`project-priorita-royal.md`, `CLAUDE.md`): vince il dato Royal documentato; il dato superato resta come nota storica. All'utente va solo
ciò che le fonti non risolvono. Per ogni voce questo file separa quattro cose: *già fatto con prova*, *chiudibile dalle fonti*, *serve l'utente*, *non si fa più*.

**Come ho misurato.** Sulla copia `sim-142b` (gioco.db a versione 146, partite.db; derivata dalla copia di p5s del 23/10 19:35Z), aperta in sola lettura. Le migrazioni
147–172 **non sono nella copia**: per quelle (149, 150, 151, 157, 158, 164, 171) ho letto il codice e le intestazioni, non l'effetto sui dati; lo dico dove conta.
Nessun nome utente, nome di partita o indirizzo è citato; gli identificativi delle voci sono quelli già nei documenti di coordinamento.

## 1. Tabella di sintesi

| Voce | Stato oggi | Cosa la chiude | Chi decide |
|---|---|---|---|
| /1 voci del Diario «da rivedere» dopo il 06-01 | **Consolidabile con le fonti** (7 voci certe su 8 sulla copia, +7 inviti di 149) · 1 voce all'utente (11-13 sera) | migrazione che toglie il segno `da_rivedere` alle voci confermate da G-022/G-028 (testo precedente conservato); per le correzioni nuove (Lavenza, cruciverba, 10-15, 10-31) vedi /11 | fonti Royal (G-022, G-028); all'utente la conferma di principio sul segno (D1) e la voce 11-13 sera (D8) |
| /2 proposte d'infiltrazione da confermare | **Consolidabile con le fonti** (37 voci, 102 righe: 19 certe, 16 «multipla», 2 «probabile») | migrazione che scrive `voce_infiltrazione` dalle righe di `proposta_infiltrazione_voce` (le proposte restano come archivio) | fonti Royal (G-022, indici AGS); all'utente la conferma per le 11 voci del diario validato e per le 2 «probabile» (D2) |
| /3 divergenze «da verificare» di L4 | **Consolidata con prova**: 0 righe in `divergenza_partita` | nessuna migrazione: è stato di partita; si ricontrolla `COUNT(*)` all'avvio del lotto | nessuno |
| /4 aree e dati «da verificare» | **Roppongi e Maihama consolidate**; **Area riservata allo staff: serve l'utente** | nessuna migrazione per Roppongi/Maihama; per l'Area staff decide l'utente se tenere il segno, toglierlo o eliminare l'Area | all'utente solo l'Area staff (D3) |
| /5 correzioni dei pin dell'utente da approvare | **Consolidata con prova** (migrazioni 143, 145, 151); residuo opzionale: pin 1548 | già fatto; opzionale una riga `negozio_sede_spillo` per il 1548 | fonti Royal (certezza media) |
| /6 Sakura Residence senza sblocco proprio | **Consolidata con prova**: `luogo.solo_eventi_confidente='futaba'`, nessuna condizione | già fatto (115, 143); opzionale ripulire la nota seed obsoleta | nessuno |
| /7 negozio delle «Pagine ammuffite» | **Serve l'utente**: le fonti si contraddicono | oggi esistono due articoli visibili; chiusura = tenere i due articoli + nota storica oppure tenerne uno e nascondere l'altro | l'utente (D4) |
| /8 nota proposta per il pin 811 | **Chiudibile dalle fonti senza scrittura**: G-030 dice «non è un doppione, nessun elenco da approvare» | nessuna migrazione; il pin resta com'è (descrizione vuota, origine utente) | nessuno (la nota è una facoltà, D9) |
| /9 voci boss di Madarame con «Gelo» e «respinge» | **Serve l'utente**: è testo libero suo | tenere (PM, 20/10) oppure sostituire «Gelo»→«Ghiaccio» e «respinge»→«Riflette» in 2 voci | l'utente (D5) |
| /10 listino di Tanaka sui 18 articoli | **Consolidata con prova** (migrazione 142; copia: 18 attive, 10 nascoste, registro con 1 decisione) | già fatto | nessuno |
| /11 gli altri punti di G-028 | **Consolidabile con le fonti** (Lavenza ×4, Ustione, 10-15, 10-31, Hagoromo) · 2 punti all'utente (Museo 1P/2P, Hacker doppione) | migrazioni di correzione conservative; 3 punti già chiusi (Igor 06-01, forziere, K8) | fonti Royal; all'utente D6 e D7 |
| /12 invito di Makoto del 30/7, strada a o b | **Consolidata con prova** nella strada (a) (149 + 171); alternativa (b) = una decisione di progetto | già fatto; conferma facoltativa (D10) | PM l'ha scelta il 20/10; all'utente solo la conferma |
| /13 collegamento e gesto di chiusura per tipo | **Superata dalla decisione del 24/10** | non si costruisce niente; i gesti restano dove sono (Diario, Area, Catalogo) | nessuno |

**Conteggio.** Consolidate con prova: **6** (/3, /5, /6, /10, /12 e /8 per «nessuna scrittura»). Chiudibili dalle fonti: **3** (/1, /2, /11, ciascuna con un punto d'appoggio all'utente). Serve l'utente: **3** (/4 per la sola Area staff, /7, /9). Superata: **1** (/13). Totale 13.

Le domande all'utente sono in §5: sei vere (D3–D8, di cui D3, D4, D5 sono quelle che bloccano una voce) e quattro conferme con un default raccomandato.

## 2. Che cosa succede alle tabelle e alle colonne dopo

| Oggetto | Dopo la chiusura | Perché |
|---|---|---|
| `voce_giornata.da_rivedere`, `aggiunta_da`, `testo_precedente_json`, `motivo_revisione` | **restano**: il Diario le legge (`campiRevisione`, `giornataService.ts:300-340`) e le sue rotte «Tieni il nuovo / Rimetti il precedente / Fatto» sono nella pagina della voce, non in una sezione | sono l'archivio del testo prima della correzione; `da_rivedere=1` resta solo dove manca una decisione |
| `proposta_infiltrazione_voce` | **resta come archivio** con le sue 102 righe; il Diario la mostra solo per una voce senza legami (`InfiltrazioniVoce.tsx:43`), quindi dopo M-B non compare più | `giornataService.ts:217,419` e `legamiInfiltrazioni.ts:163` la leggono; il cestino la conosce (`cestinoService.ts:120`); la sorte finale è di R11-02 |
| `voce_infiltrazione` | si riempie (da 0 righe a 37 voci) | è il dato che la voce legge |
| `divergenza_partita` | resta (meccanismo vivo, dati di partita) | R4-14b |
| `area.da_verificare` | resta, con il chip: è un attributo reale dell'Area (R11-10b/3 vuole che compaia nei risultati) | non è una coda di revisione |
| `proposta_abbinamento`, `proposta_effetto_voce` | restano come storia (68 confermate, 14 scartate, 5 «da-approvare» sulla copia; le 5 chiuse da 150 — da verificare dopo 150) | fuori dalle 13 voci; le 15 «aperte» di `proposta_effetto_voce` le consolida la 147 |
| `decisione_tanaka`, `decisione_tanaka_ripristino`, `nota_storica`, `nota_storica_legame` | restano (immutabili, 141/139) | archivio della decisione Tanaka e delle discordanze di fonte |

## 3. Schede per voce

### /1 — Voci del Diario «da rivedere» aggiunte o corrette dopo il 06-01 (L3 R3-37c, L10 R10-11j2, R10-28d)

**Stato sulla copia (146).** 998 voci, 8 con `da_rivedere=1`, tutte dopo il 06-01; le 255 voci 04-01..06-01 sono senza segno. Le 8 sono (uid a 8 caratteri):

| Voce | Perché è segnata | Verifica Royal | Esito |
|---|---|---|---|
| 06-20 `65fdbeab` (Kaneshiro, prima esplorazione) | nome della guida in nota («Cerca il boss della mala») | G-022 B1, AGS sett. 11, 20 giugno; certezza media («con riserva») | confermata |
| 08-03 `c9efdb83` (F4) | testo corretto da L3; la 148 mette «Camera della vacuità» | G-028 errore 2, G-022 F4; alta | confermata (testo già 148) |
| 10-29 `7dd92df2`, 11-14 `dece90bf`, 11-19 `589d82e8` (Niijima N1–N3) | riferimento da `confidente:makoto` a `dungeon:niijima` | G-022 N1–N3; alta (N3 media) | confermate |
| 11-24 `527cf983` (Shido S1) | nome della guida in nota | G-022 S1, sett. 32; alta | confermata |
| 06-26 `8c58ad98` (nuova, `aggiunta_da='team'`) | voce aggiunta dal team | G-028 B, AGS sett. 11, 26 giugno; ok | confermata |
| 11-13 sera `7c081417` | «la sera non si entra nei Palazzi: il testo va rivisto» | G-022, G-028: la guida fa tutta l'infiltrazione di giorno | **non risolta dalle fonti** (D8) |

In più la 149 (non nella copia) aggiunge 8 voci d'invito con `da_rivedere=1`, `aggiunta_da='team'`: 7 senza motivo, Makoto del 30/7 con il motivo «Sul percorso della guida la piramide si completa il 3/8». G-028 A dà «ok» a sette e «errore 1» a Makoto (vedi /12).

**Che cosa significa chiuderla.** Le voci sono già *corrette* secondo Royal; resta solo il segno. Chiusura = migrazione **M-A**: `UPDATE voce_giornata SET da_rivedere = 0` per le uid elencate, con guardie: uid e data attesi, `da_rivedere = 1`, e (per F4) `azione` uguale al testo della 148. **Non si toccano** `aggiunta_da` (provenienza), `testo_precedente_json` e `motivo_revisione` (archivio: si leggono ancora con «Rimetti il precedente»). Nessun testo, ordine, uid o spunta cambia. Si salta senza errore una voce già cambiata dall'utente. Audit in `dati_guida` (chiave `da-rivedere-chiuse-NNN`) con uid e valore di prima.
- Le voci 06-20, 08-03, 10-29, 11-14, 11-19, 11-24, 06-26: **si può fare senza altre domande** salvo D1.
- I sette inviti (07-02, 07-03, 07-28, 07-29, 08-06, 10-08, 10-09): stessa chiusura, ma serve prima che la 149 sia applicata (nella copia non c'è): la guardia le trova per uid fisso derivato dal nome.
- Makoto 07-30: vedi /12. 11-13 sera: vedi D8.

**Perché D1.** L'utente il 20/10 ha scritto «le rivedo insieme al resto». Togliere il segno toglie un modo per ritrovare quelle voci nel Diario. Raccomandazione: toglierlo, perché ogni voce ha il testo precedente conservato e l'elenco è comunque deciso; ma è una conferma di principio, non un dato di gioco.

**Fonti Royal già nel repository:** G-022 (tabella K/M/B/F/O/N/S/R), G-028 A e B, G-023 per gli inviti.

### /2 — Proposte d'infiltrazione da confermare (R3-37b/c)

**Stato.** `proposta_infiltrazione_voce`: **102 righe su 37 voci** (primo giorno 01-02, ultimo 12-12): regola `data-nel-nome` certa 3 voci (3 righe); `letta-voce-per-voce` certa 16 voci (16 righe), multipla 16 voci (81 righe, insiemi ordinati), probabile 2 voci (2 righe: 06-20 `65fdbeab` e 11-19 `589d82e8`, «letta in sintesi o con riserva»). `voce_infiltrazione` ha **0 righe**: nessun legame è scritto. 11 delle 37 voci cadono nel diario validato (04-01..06-01), 26 dopo.

Tutte e 37 coincidono con la tabella di G-022 (lette sulle sezioni degli indici AGS: 34 alta, 3 media). Le voci di Palazzo senza proposta sono 22 e sono tutte «n/a» in G-022 (lettere di sfida, vendite, messaggi) oppure Memento; K8 (04-18, «Saluta Kamoshida e Kawakami») ha già `riferimento_tipo` NULL e tipo «altro» sulla copia: il falso positivo è già pulito.

**Che cosa significa chiuderla.** Migrazione **M-B** che fa lo stesso lavoro del gesto «Conferma» (`impostaInfiltrazioniVoce`, `giornataService.ts`, stessi controlli):
- per ogni `voce_uid` di `proposta_infiltrazione_voce` senza righe in `voce_infiltrazione`: `INSERT INTO voce_infiltrazione (voce_uid, ordine, infiltrazione_chiave)` copiando le righe nell'ordine;
- guardie: la voce esiste; l'infiltrazione esiste e appartiene al Palazzo della voce (`palazzoDellaVoce`); mai la stessa infiltrazione due volte di seguito (la chiave primaria `(voce_uid, ordine)` ammette il ritorno, come N2 che ripete la 11); se una guardia fallisce, **si salta quella voce** e il conteggio degli uid saltati va in `dati_guida` (`legami-infiltrazioni-voci-NNN`), mai un errore di avvio;
- **non si cancellano** le righe di proposta (restano archivio; il FE le mostra solo a voce senza legami);
- non si tocca nient'altro della voce (testo, ordine, uid, spunte, note), come dice R3-37b.
Prova a fine migrazione: `SELECT COUNT(DISTINCT voce_uid) FROM voce_infiltrazione` = 37 (meno gli eventuali saltati), 255 voci del diario validato con testo identico (impronta).

**Perché D2.** Il 20/10 l'utente aveva deciso «le conferma lui», e 11 voci sono nel diario validato. Il legame è un campo aggiunto in una tabella separata, non modifica il testo, ma è una scrittura «sul validato». Raccomandazione: sì, perché il 24/10 ha detto di chiudere le 13 voci con migrazioni e questa è una delle 13; le due «probabile» (06-20, 11-19) hanno certezza media e sono comunque ciò che la guida fa quel giorno.

### /3 — Divergenze «da verificare» di L4 (R4-14b)

**Prova.** `divergenza_partita` (in `partite.db`): **0 righe** sulla copia del 23/10; `lotti/L4/requisiti.md` R4-14b già dichiarava 0 sulla base p5s 0503Z (l'utente ha segnato le voci, quindi le 4 righe e gli 8 pin non esistono più). La tabella è il registro vivo del meccanismo (migrazione utente 022), che si conserva.
**Che cosa chiude.** Nessuna migrazione: sono dati di partita e `partite.db` non si tocca. Si ricontrolla il conteggio sull'istanza all'avvio del lotto (`SELECT COUNT(*) FROM utente.divergenza_partita`). Se per assurdo fosse > 0 sarebbe una scelta dell'utente («Segna la voce» o «Togli il fatto al pin»), non una migrazione. **Limite:** misurato su una copia, non sull'istanza viva.

### /4 — Aree e dati «da verificare» (L2 R2-01b; certezza media di Roppongi e Maihama)

- **Area riservata allo staff** (`citta/tokyo/area-riservata-allo-staff`, `area.da_verificare=1`): è l'**unica** area con il segno sulle 140. G-002 (chiusa «non risulta»): la guida italiana non la nomina; la gita all'emittente del 9/6 è compatibile ma non dimostrato; «lo può riconoscere solo l'utente guardando le due planimetrie» (150-3-0, 150-3-1). **Le fonti non la risolvono → utente (D3).** Il segno non è una coda: è un attributo con il chip e va tenuto visibile in ricerca e albero (R11-10b/3).
- **Roppongi**: già corretta. Sulla copia `quartiere.roppongi` ha `condizioni_json = [{"tipo":"data","dal":"09-15"}]` (G-031 punto 4, alta). Consolidata.
- **Maihama**: `sblocco_data=10-11`, condizione di luogo `maihama/destinyland`; G-018 dice media solo per la data (Samurai Gamers «10/11»), alta per la via del libro. Nel DB non c'è un segno «da verificare» su Maihama (nessuna colonna), quindi non c'è niente da chiudere: il dato resta com'è e la discordanza vive nella fonte (G-018, G-023 O-9). Una ricerca web che ho provato per la data non ha dato nulla: **«da verificare» in gioco**, senza effetto sui dati.

### /5 — Correzioni dei pin dell'utente da approvare (L5, dubbio 7)

**Già fatto con prova** (decisioni dell'utente del 23/10, `proposta-residui-29.md`):
- **143**: pin 1584 → `negozio:distributore-yongen-bagno`; 1641 → `luogo:yongen-jaya/sakura-residence`; 1769 → `negozio:distributore-yongen-tabaccaio` (sede Central Street). Sulla copia: 1584, 1641, 1769 hanno proprio questi riferimenti; il registro `residui-l5-143` ha 37 esiti, 36 «applicata».
- **143 aveva «saltato»** il pin 339 (listino `distributore-shujin-cancello-1` nascosto dall'utente il 21/9): lo chiude la **151** portandolo sul listino visibile con lo stesso assortimento (`distributore-shujin-edificio`). Sulla copia (146) il 339 è ancora senza riferimento: l'effetto della 151 non è osservato qui.
- **145**: pin 1753 nel Cestino.
**Residuo opzionale: pin 1548** (Tornello Ginza → tabaccaio di Yongen). Sulla copia è l'unico pin (con 1527, 1547, 1768, 1769 già coperti da una sede per pin in `negozio_sede_spillo`) che l'Area vede in un altro quartiere: porta il chip «Da rivedere · negozio di un altro quartiere» (`areeService.ts:255-258`, `AreaPage.tsx:289`). Il PM l'ha chiuso come «coincide» (Samurai Gamers: al varco Ginza c'è l'assortimento Nastea/1UP/Starvicks, certezza media). Chiusura: **M-D**, una riga `INSERT OR IGNORE INTO negozio_sede_spillo (spillo_uid, negozio_chiave, luogo_chiave)` = (`a0263bf9…` [uid del pin 1548], `distributore-yongen-tabaccaio`, `shibuya/distributore-tornello-ginza`), come per 1769. Non cambia il pin (origine utente).

### /6 — Sakura Residence senza sblocco proprio (G-031)

**Prova (copia).** `luogo yongen-jaya/sakura-residence`: `solo_eventi_confidente='futaba'`, `condizioni_json='[]'`, `area_chiave='citta/yongen-jaya/vicoli'`; il pin 1641 punta al luogo (143). Il meccanismo è quello di R5-20f, scelto per non usare una condizione «manuale» (escluse dall'utente il 5/9 e il 30/9). **Consolidata.** Resto cosmetico: la `note` seed dice «Dettagli su orari/condizioni non reperiti in modo puntuale nella fonte primaria» e `verificato=0`; si può sostituire con il testo di G-031 («la stanza compare solo negli eventi di Futaba: rango 6 del 16/10, rango 7 del 2/11, rango 10 amore, 15/1») dentro **M-E** (opzionale, solo se `note` è ancora il valore seed).

### /7 — Negozio delle «Pagine ammuffite» (G-031 punto 3)

**Stato.** Sulla copia l'oggetto `libro/pagine-ammuffite` ha **due articoli visibili**: `libreria-taiheido/pagine-ammuffite` (Shibuya, Central Street, 1.800 ¥, dal 04-18, nessun effetto) e `hinokuniya/pagine-ammuffite` (Shinjuku, 1.800 ¥, dal 09-01, «Sblocca Jinbocho», condizioni quartiere Shinjuku + data 09-01). La condizione di `kanda-jinbocho/nagiuri` è già «Hifumi 4 oppure lettura `pagine-ammuffite`».
**Fonti.** G-031: la guida AGS scrive Hinokuniya (pagina Libri) e Taiheido (elenco negozi), sempre dal 1/9: contraddizione. Una fonte esterna in portoghese (criticalhits.com.br, tabella dei libri) dà «Musty Pages, 1800, 9/1, sblocca Jinbocho» nella **libreria di Shibuya**, cioè Taiheido, e non la elenca a Shinjuku: una sola fonte, quindi certezza **media**; non l'ho confermata con una seconda.
**Perché serve l'utente.** Le fonti non decidono. Chiusura (D4): (a) **tenere i due articoli** e legare una nota storica (modello 139: `nota_storica` + `nota_storica_legame`) all'oggetto del catalogo, «la guida si contraddice tra Hinokuniya e Taiheido»; oppure (b) tenere un solo articolo e nascondere l'altro (mai cancellato; Cestino).

### /8 — Nota proposta per il pin 811 di Madarame (G-030)

**Prova.** G-030 (chiusa): i pin 811 («Tesoro del Palazzo», Sala Principale, voce «Riunisciti con Morgana») e 2300 («La vera Sayuri Originale», Giardino centrale, boss finale) sono due momenti e due luoghi, **non un doppione**; «nessuna scrittura» e nessun elenco da approvare. Copia: 811 e 2300 `origine='utente'`, `descrizione=''`. **Chiusura = non scrivere.** La nota «il dipinto preso qui è un'esca» è una facoltà, e il pin è lavoro dell'utente da preservare (il nome resta suo): solo con il suo sì (D9). Nota di certezza: alta sui due luoghi, media sul dettaglio dell'esca (trama letta in sintesi).

### /9 — Voci del boss di Madarame con «Gelo» e «respinge» (L8 R8-20c)

**Stato.** Due `punto_interesse` di tipo boss, ordine 18 e 19, scritte dall'utente: `madarame-il-furto-del-cuore-di-madarame-scontro-con-madarame` («Occhi: Fuoco, Gelo, Elettricità, Vento»: **1 «Gelo»**) e `…-scontro-con-madarame-2` («respinge»: **4 volte**). La 162 ha portato a «Ghiaccio/Riflette» i nomi generati dall'app (etichette `traduzione`) e **non ha toccato questi testi** (eccezione del PM, ~05:10Z del 20/10). G-038: la scheda della guida stessa scrive «Gelo»; la proposta «Ghiaccio ovunque» è un'**uniformazione, non una correzione**.
**Perché serve l'utente.** È testo libero e lavoro suo: nessuna fonte Royal impone una modifica. Chiusura (D5): (a) **tenere** (raccomandato: la decisione già presa dal PM; 5 sostituzioni in testi che sono suoi) oppure (b) migrazione **M-F** con sostituzioni esatte («Gelo»→«Ghiaccio» ×1, «respinge»→«Riflette» ×4), solo se il testo è ancora quello di oggi, con il testo di prima in `dati_guida`. Nota: altre 41 voci della guida contengono «Gelo»/«respinge» come testo della fonte e **non sono in perimetro**.

### /10 — Listino di Tanaka sui 18 articoli di Royal (L7 R7-13b, G-034)

**Prova.** Migrazione 142 (BON-08) applicata sulla copia: `articolo` di `tanaka-affari-loschi`: **18 attive** (prezzo valorizzato) e **10 nascoste**, tutte `origine='utente'` come scrive la 142; `decisione_tanaka`: 1 riga (fotografia di prima = archivio delle 20 identità); non esiste la riga d'avviso `tanaka-listino-royal-142` in `dati_guida` (la precondizione è passata); `acquisto_registrato` ha 0 righe (la spesa storica non cambia). Le 28 proposte Tanaka della 121 sono state chiuse (confermate o scartate) dalla 142. **Consolidata.** Resta da controllare sull'istanza viva, alla pubblicazione, che la riga d'avviso non compaia.

### /11 — Gli altri punti di G-028/G-038 per localizzatore

| Punto | Stato | Chiusura |
|---|---|---|
| Voce Igor del 06-01 sera `9b4f62e2` (Igor «notte», fuori fascia) | è nel diario validato (06-01 incluso), `da_rivedere=0` | **nessuna azione**: lavoro dell'utente da preservare |
| Forziere di Kamoshida «non più ottenibile» | stato di partita, non dato di gioco (G-038); sulla base p5s: 0 casi (`L11/dati.md` §7) | **nessuna azione**; ricontrollo del conteggio all'avvio del lotto |
| K8 04-18 (falso positivo «Palazzo») | già pulito: `riferimento_tipo` NULL, tipo «altro» | già fatto |
| **Hagoromo** (G-033, certezza bassa) | l'articolo Katsu a pezzettoni ha le condizioni (Kichijoji, dal 06-05, domenica, sera); il luogo ha `orari_json` NULL (regola giorno e sera). Restano `luogo.giorni_json=["domenica"]`/`quando="sera"` (colonne storiche non più lette), `negozio.orari_json` {domenica, sera} e la `nota` «(G-033, da verificare)» | **M-E** (opzionale): togliere «da verificare» dalla nota del negozio; **da verificare** dove si legge ancora `negozio.orari_json` (la presenza usa `eccezione_orari_json`, `luoghiService.ts:190-218`); nessuna decisione dell'utente: le fonti danno l'orario solo all'articolo |
| **Lavenza e Gemelle su Igor** (4 voci dopo il 06-01: `165b8cb3` 06-08, `85cce8fc` 09-06, `d26ea049` 11-06 alta; `5cb911c7` 01-11 media) | tutte `riferimento_chiave='igor'`, `da_rivedere=0`; `gemelle` esiste come Confidente | **M-C1**: `riferimento_chiave` igor → gemelle (G-036 B1); testo e `riferimento_testo` invariati; il riferimento di prima in `testo_precedente_json`; guardia sul valore attuale. La quarta ha certezza media (G-036): se si preferisce «voce di trama senza Confidente» serve l'utente, ma l'alternativa non ha una fonte |
| **Cruciverba Ustione** 08-16 `889aefc1` | la guida dà il 17/8; sul 17/8 non c'è un'altra voce Ustione; l'effetto `cruciverba` è collegato dalla 157 per risposta | **M-C2**: spostare la voce a 08-17 giorno in fondo alla fascia; poiché `testo_precedente_json` non conserva la data, il valore di prima va in `dati_guida` |
| **Cruciverba Hacker** 08-29 `a67565bf` | **doppione**: esiste già `50780540` «Cruciverba (Hacker)» al **08-30 sera** (stesso testo, stessa Conoscenza +1). La guida dà il 30/8 | **non si sposta**: sarebbe una copia. Fusione/eliminazione solo su elenco approvato (regola «copie di voci») → D7 |
| **10-15** `6c8e3422` «Schivare il gesso…» tipo esame | non è una domanda (G-037 punto 4, alta); ha già l'effetto dote Fascino +2 e la nota «Fascino +2 se riuscito» | **M-C3**: `tipo` da `esame` a `altro`; nota con la scala della Perizia (1: 33%, 3: 66%, 5: 100%); l'effetto non cambia. Da verificare che nessun controllo legga `tipo='esame'` per questa data (la 158 collega le 12 voci d'esame per uid e testo, 10-15 non è fra loro) |
| **10-31** `09077817` «cruciverba scolastico (Stand)» tipo esame, giorno | la guida: di giorno tempo libero con Kawakami (R5), la sera il cruciverba «Stand» (G-037 punto 5, alta). La voce ha l'effetto Conoscenza +1 | **M-C4**: testo «Cruciverba (Stand)», `tipo` dote, `fascia` sera, in fondo alla fascia sera (c'è già «Freccette a Kichijoji»); la 157 la ha lasciata scollegata di proposito: dopo la correzione, il collegamento al cruciverba Stand si fa con la regola per data (fuori dall'ambito di questa voce) |
| **Museo, 1P / 2P** | `area` si chiama «Museo, 1P» e «Museo, 2P»; le mappe «Museo 1P» e «Museo 2P - Livello N»; i nomi sono suoi (L3 §9 E9) | la fonte non decide → D6 |
| **07-07** domanda mancante (G-037 punto 3, L10) | sulla copia non c'è nessuna domanda al 07-07 (ci sono 07-04 e 07-09); la voce `b9e2763b` «domande in classe (Via Lattea / Somen)» è senza domanda | dato mancante, non revisione: serve che l'Esperto fornisca testo e risposte da AGS sett. 13 (G-037 dà solo premio Fascino +1 e 2 punti con Ann): **da verificare**, non lo scrivo a memoria |

### /12 — Invito di Makoto del 30/7: strada (a) o (b) (L6 R6-08c3)

**Stato.** La **149** crea la voce 07-30 «Invito di Makoto: uscita al Planetario di Ikebukuro, in alternativa a … — solo se il Palazzo di Futaba è già completato» con `da_rivedere=1` e il motivo sopra; la **171** le dà l'effetto di stato `invito` (`makoto/07-30`): spuntandola con il Palazzo di Futaba non concluso risponde «Non ancora possibile» e non registra niente (in G-028 sul percorso del diario la piramide si chiude il 3/8). Quindi la strada **(a) è già implementata e protetta**; la (b) (nessuna voce, solo l'evento con condizioni in `confidente_invito`) la raccomandava l'Esperto, il PM ha scelto (a) il 20/10. Le condizioni dell'invito sono già in `confidente_invito` in entrambi i casi.
**Chiusura.** Nessuna scrittura nuova; il segno `da_rivedere` e il motivo si trattano come le altre 7 voci (D1). Passare alla (b) = portare la voce nel Cestino (reversibile), ma è una scelta di progetto che le fonti non impongono: conferma facoltativa (D10). **Limite:** 149 e 171 non sono nella copia; le ho lette, non misurate.

### /13 — Collegamento e gesto di chiusura per ogni tipo di revisione

Con la decisione del 24/10 non esiste più un elenco da raggiungere: **non si fa niente**. I «gesti» restano nelle pagine d'origine, già esistenti: «Tieni il nuovo / Rimetti il precedente / Fatto» sulla voce (rotta `POST /api/compendio/percorso/voci/:uid/rivista`), «Conferma» della proposta d'infiltrazione sulla voce, il chip «Da verificare» sull'Area, «Modifica/Ripristina» del Catalogo. Va segnato in `stato.json` che R11-10c/1…13 si chiudono con le migrazioni di questo file e che R11-10c/13 è «superata dalla decisione 24/10»; ROADMAP e `L11/requisiti.md` si allineano (§8).

## 4. Migrazioni proposte (nomi di lavoro; numeri: i primi liberi al momento di scriverle, oggi 172 è l'ultima registrata)

| Sigla | Che cosa fa | Voci | Dipende da |
|---|---|---|---|
| M-A | toglie `da_rivedere` alle voci confermate (7 sulla copia + 7 inviti) | /1, /12 | D1; la 149 per gli inviti |
| M-B | scrive `voce_infiltrazione` dalle proposte (37 voci) | /2 | D2 |
| M-C1…C4 | Lavenza ×4, Ustione, 10-15, 10-31 | /11 | D7 solo per Hacker (che qui non si tocca) |
| M-D | sede per pin del 1548 | /5 | nessuna (opzionale) |
| M-E | note seed obsolete (Sakura, Hagoromo) | /6, /11 | nessuna (opzionale) |
| M-F | «Gelo»/«respinge» in 2 voci | /9 | solo se D5 = sì |
| M-G | nota storica Pagine ammuffite, o nascondere un articolo | /7 | D4 |
| M-H | area Museo 1P/2P | /11 | solo se D6 = sì |

Ogni migrazione: conservativa (valore atteso o salta), idempotente, scrive solo in `main` (mai `partite.db`), audit in `dati_guida`, mai cancellazioni (solo Cestino dove serve), `da_rivedere` non viene riacceso. Una migrazione già applicata non si riscrive; una nuova ha un numero nuovo.

## 5. Decisioni che restano all'utente

Domande vere (le fonti non risolvono):
- **D3 — Area riservata allo staff.** Tenere il segno «da verificare» (raccomandato: il dato è onesto, la guida non la nomina), toglierlo, o eliminarla (Cestino). Effetto: nessuna scrittura se «tieni».
- **D4 — Pagine ammuffite.** Hinokuniya o Taiheido? Raccomandazione: tenere i due articoli con una nota storica sulla discordanza finché non lo verifica in gioco; se preferisce chiudere subito, Taiheido (fonte esterna, media). Effetto: una nota storica, oppure un articolo nascosto.
- **D5 — «Gelo» e «respinge» nelle 2 voci del boss.** Raccomandazione: tenere come sono (suo testo, già deciso dal PM). Effetto di «sì»: 5 sostituzioni.
- **D6 — Nomi «Museo, 1P/2P».** Rinominare le Aree «Museo 1P» e «Museo 2P» (stesso nome della planimetria, senza virgola)? Raccomandazione: sì. Effetto: solo `area.nome`; le chiavi e gli indirizzi restano.
- **D7 — «Cruciverba (Hacker)» del 08-29, doppione di quello del 08-30.** Portare la voce del 08-29 nel Cestino? Raccomandazione: sì, la guida dà solo il 30/8 e le due voci hanno testo ed effetto identici. Effetto: una voce in meno nel Diario (reversibile).
- **D8 — Voce del 13/11 sera «Completare l'infiltrazione del palazzo».** La guida fa tutto di giorno, la sera non si entra nei Palazzi. Raccomandazione: Cestino (reversibile), perché la voce di giorno `ebe00e6b` contiene già l'intera infiltrazione; in alternativa riscriverla. Effetto: una voce in meno.

Conferme con un default raccomandato (non applico il default senza il suo sì):
- **D1** — togliere il segno «da rivedere» alle voci confermate dalla guida (raccomandato: sì, testo precedente conservato).
- **D2** — scrivere i legami voce→infiltrazione anche per le 11 voci del validato e le 2 «probabile» (raccomandato: sì).
- **D9** — nota sul pin 811 (raccomandato: no, non toccare un suo pin).
- **D10** — Makoto del 30/7: tenere la strada (a) (raccomandato: sì, è implementata e protetta da «Non ancora possibile»).

## 6. Ordine dei passi e file condivisi

1. Risposte dell'utente a D3–D8 e conferme D1, D2, D9, D10 (una sola volta, in chat, con questo elenco).
2. M-C1…C4, M-B, M-A (in quest'ordine: le correzioni di testo prima, poi i legami, poi il segno), M-D, M-E, M-F/M-G/M-H solo con il sì.
3. Controlli a fine: conteggi di §3 (da_rivedere residuo = solo 11-13 sera se D8 = «riscrivi»; `voce_infiltrazione` = 37 voci; 255 voci del diario 04-01..06-01 con impronta identica), come in `ondata1`: sono controlli di sola lettura, non test.
4. Allineare ROADMAP, `L11/requisiti.md` R11-10c, `L11/piano.md` B5 (da annullare), `stato.json` (R11-10c/1…13), `preparazione-2026-10-23.md` B18.

**File condivisi con altri blocchi:** `server/db/migrations/index.ts` (registro, un solo posto: serializzare con L8/L9, dove 172 e successive sono in corso); `docs/coordinamento/stato.json` e `ROADMAP.md` (R11-02/R11-06: il destino delle tabelle-archivio di §2); `shared/types.ts` e `giornataService.ts` non cambiano. Nessuna di queste migrazioni tocca il codice FE.

## 7. Rischi (lavoro dell'utente da preservare)

- **Diario 04-01..06-01** (255 voci): M-A, M-B, M-C non devono toccare testo, ordine, uid né spunte di quelle voci. M-B aggiunge righe in `voce_infiltrazione` per 11 di esse (D2). Nessuna guardia di M-C corrisponde a una data ≤ 06-01 (ricordare che il formato è `MM-DD` e l'anno parte da aprile: il controllo è `BETWEEN '04-01' AND '06-01'`, non `<=`).
- **Kamoshida e Madarame** (169 e 226 voci; 359 e 254 pin dell'utente sulla copia del 23/10): niente di qui li tocca; solo la voce boss di Madarame di D5 e il pin 811 di D9, entrambe con il sì.
- **`origine='utente'`**: M-D scrive una riga di sede per pin, non cambia il pin; le 18 offerte di Tanaka sono già `origine='utente'` dalla 142; M-F cambia testo dell'utente solo con D5.
- **Spostare una voce** (Ustione, 10-31): le spunte sono per `voce_uid`, non per data (`spunta_voce_partita`); `testo_precedente_json` non conserva la data, quindi il «prima» sta solo nell'audit.
- **Un solo giro:** nessuna migrazione deve riaccendere `da_rivedere` né rimettere in coda le proposte.
- **Repo pubblico:** nei documenti derivati niente nome utente, nome di partita o indirizzo.

## 8. Che cosa togliere dai documenti di progetto

`L11/requisiti.md:46-61` (R11-10c), `L11/modifiche.md` «Elenco unico Da rivedere» (righe 95-119), `L11/piano.md` B5 (righe 96-115), `preparazione-2026-10-23.md` B18 e §8.1: sostituire con «le 13 voci si chiudono consolidando i dati con migrazioni, `lotti/L11/ondate2-6/R11-10c-consolida.md`». Il registro `docs/DECISIONI.md` del 24/10 c'è già.

## 9. Limiti

- Copia a schema 146: gli effetti di 147–172 (inviti, 150, 151, 157, 158, 164, 171) non sono misurati; sono letti dalle intestazioni e dai guard delle migrazioni.
- La copia è del 23/10: il lavoro dell'utente dopo quella data non è visto. Ogni conteggio va rifatto sull'istanza all'avvio del lotto.
- Non ho letto le pagine AGS: i riferimenti a G-022/G-028/G-031/G-033/G-034/G-036/G-037 sono quelli già scritti nel registro dell'Esperto. Per «Pagine ammuffite» ho consultato una fonte esterna (una sola); per Maihama una ricerca senza esito.
- Non ho verificato dove si legge `negozio.orari_json` (Hagoromo) né se nessun controllo legge `tipo='esame'` sul 10-15: li ho segnati «da verificare».
- I testi delle 4 voci Lavenza e di 10-31 che propongo di correggere sono quelli del registro (G-036, G-037): la resa finale va scritta dall'Esperto, non da me.
