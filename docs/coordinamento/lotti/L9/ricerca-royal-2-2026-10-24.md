# L9 — Ricerca Royal sulle voci aperte (2026-10-24)

Incarico del PM: date dei Confidenti (R9-04/3, R9-04b/2), attività (R9-10/1, R9-10/2), scadenze dei Palazzi (R9-21), soglia 9→10 (requisiti.md:59).
Sola lettura: nessuna modifica a codice o dati, nessun commit. Le tabelle «per la migrazione» sono proposte, non applicate.

## 0. Come leggere questo documento

**Fonti Royal lette** (tutte in inglese; nessuna è la guida AllGameStaff su cui è costruita l'app):
- Samurai Gamers, edizione Royal: walkthrough mese per mese (aprile, maggio, giugno, luglio, settembre, novembre, dicembre, gennaio, febbraio), guide dei Palazzi, guide dei 23 Confidenti, guide delle attività (`samurai-gamers.com/persona-5/...`).
- Gfinity, tabella dei Palazzi: `gfinityesports.com/guides/persona-5-royal-palaces`.
- Push Square, TheGamer, RPG Site, GGRecon, Nightly Gaming Binge, GamersDecide (guide per Confidente e per attività).

**Non apribili:** megatenwiki.com (403), primagames.com (403, e pcinvasion.com vi rimanda), supercheats.com (403), Fandom, Steam. AllGameStaff non è stata consultata in questo incarico.

**Cautele che valgono per tutto il documento:**
1. I walkthrough di Samurai Gamers sono il percorso scelto dall'autore («lettera di sfida il 23/5»), non date imposte dal gioco. Le date imposte sono lo sblocco, la scadenza, il giorno in cui un Confidente compare. Le ho tenute separate.
2. Dove una pagina contraddice un'altra l'ho scritto. Un solo sito (Samurai Gamers) copre quasi tutto, quindi gli accordi fra due pagine dello stesso sito valgono meno di un accordo fra siti diversi.
3. I dati attuali dell'app sono quelli della copia migrata a HEAD `aa69c873` (gioco fino alla migrazione 178). Per «Royal prevale» (DECISIONI, 23/10) le date qui sotto, dove sono confermate da almeno due fonti, andrebbero a sostituire quelle dell'app; dove la fonte è una sola, propongo di non migrare senza una seconda prova.
4. Le «note» dell'app per le Doti: dove le fonti dicono «punti» uso la stessa convenzione delle righe già in `effetti_json` (1 punto = 1 nota, come `studio-leblanc`), che nel catalogo è dichiarata «non confermata».

---

## 1. Confidenti — avvio, rango 1 (R9-04/3, R9-04b/2)

**Distinzione usata.** *Sblocco/avvio* = il giorno in cui il Confidente compare o si può contattare. *Rango 1* = il primo incontro che porta al rango 1 (il requisito `data` di rango 1 nell'app).

### 1.1 Tabella: Royal contro app

| Confidente | Avvio/sblocco Royal (fonte) | Rango 1 Royal, il più presto (fonte) | App oggi: requisito rango 1 · evento calendario | Esito |
|---|---|---|---|---|
| **Kawakami** | **24/5**: «Operazione Maidwatch» con Mishima alla Central Street di sera; il giorno scuola dopo si parla con Kawakami al 2° piano (davanti alla sala professori) per avere il numero. Samurai Gamers (lista e pagina Kawakami) e le guide che il motore di ricerca elenca (RPG Site, allthings.how, NGB) dicono 24/5; un'altra dice 27/5 | **27/5 (venerdì) sera**: prima chiamata dal telefono del Leblanc, con Coraggio rango 3 e 5.000 yen (walkthrough di maggio di Samurai Gamers; il walkthrough scrive «Operation Maidwatch» il 26/5) | req. `data` **06-04** · evento **06-06** · voci del Diario 06-03 sera «Operazione Guardia MAIDica», 06-04 «Incontro con Kawakami a scuola», 06-08 sera «Chiamare Kawakami… nuovo Confidente» | **Diverge di 8–12 giorni**. Il Royal è tutto a fine maggio. Il requisito Coraggio 3 e le chiamate pagate coincidono con l'app |
| **Hifumi** | **25/6 sera**: conversazione, poi si sblocca Kanda; serve Palazzo di Kaneshiro concluso (24/6) (pagina Hifumi, lista) | **25/6 sera** al più presto; la guida chiede Fascino rango 3 per la prima visita a Kanda | req. `data` **06-28** + Fascino 3 · evento **07-02** (collegato a una voce) · voce 07-02 sera | Req. a 06-28 e evento a 07-02 divergono dal 25/6. Il 07-02 è la data consigliata dal percorso AGS, non la più presto |
| **Yusuke** | **14/6** pomeriggio, sottopasso di Shibuya (lista); guide e walkthrough di giugno | **18/6** (walkthrough di giugno, TheGamer, pagina Yusuke): rango 0→1, serve Persona dell'Imperatore | req. `data` **06-18** · evento **06-17** · voci 06-14 (parlare con Yusuke a scuola) e 06-18 (sottopasso) | Requisito giusto. L'**evento è di un giorno prima** (06-17 → 06-18) |
| **Ann** | **15/4** pomeriggio, centro commerciale sotterraneo | **15/4**: il rango 1 parte da solo dopo il Palazzo di Kamoshida (pagina Ann) | req. `data` **04-15** · **nessun evento** · voce 04-15 | Concorda. Manca l'evento di sblocco |
| **Igor** | **12/4** sera, Stanza di Velluto (lista e pagina Igor) | rango 1 il **12/4** (tabella delle abilità). Poi sale con la trama: 5/5 (2→3), 24/5 (3→4), 11/6 (4→5), 24/6 (5→6) | req. `data` **04-12** · nessun evento · voci 04-09, 04-11, 04-12 sera | Concorda. Manca l'evento |
| **Morgana** | **11/4** mattina, Leblanc, dopo che Kamoshida è liberato | rango 1 disponibile il **15/4** (tabella delle abilità); poi 24/5 (2→3), 20/6 (3→4), 24/6 (4→5) | req. `data` **04-15** · nessun evento · voce 04-15 sera | Concorda (rango 1 al 15/4). L'avvio vero è l'11/4: è un evento distinto, senza rango |
| **Futaba** | **31/8**: arrivo ad Akihabara (pomeriggio nella lista, sera nella pagina Futaba) | **31/8** sera | req. `data` **08-31** · nessun evento · voci 08-31, 09-02 | Concorda. Manca l'evento |
| **Shinya** | **4/9**, arcade di Akihabara, dopo la richiesta dei Memento «I vincenti non imbrogliano» (RPG Site, NGB, Samurai Gamers: due siti oltre al nostro) | **4/9** (stesso giorno) | req. `data` **09-05** + richiesta · nessun evento · nessuna voce | Diverge di un giorno: **09-05 → 09-04**. Il requisito «richiesta completata» resta |

Altri Confidenti incontrati nelle fonti (non richiesti, ma divergenti): **Ohya** è l'unico caso con le fonti in disaccordo fra loro (walkthrough di maggio: «Meet Ichiko Ohya» il 17/5; la sua pagina: compare al Crossroads il 25/6 e il rango 1 è «dopo il 22/6»; TheGamer: rango 1 il 23/6 sera; lista: 24/5). Nessuna dà il 18/6 né il 5/7 dell'app. Non propongo nulla su Ohya senza chiedere all'Esperto (G-017) quale fonte regge.

### 1.2 Cosa propongo per R9-04/3 e R9-04b/2

1. **Kawakami (R9-04b/2): non migrare senza decisione.** La prova Royal è doppia (Samurai Gamers e, solo come estratti dei risultati di ricerca, RPG Site, allthings.how e NGB per il 24/5; il 27/5 per la prima chiamata) ma la voce Becky/«Guardia MAIDica» del 3/6 viene dalla guida AGS e dall'Esperto (G-017). Servono due cose: dire quale delle due fonti prevale (la regola «Royal vince» dice Royal) e, se si sposta, spostare insieme requisito, voci e evento (oggi: 06-03, 06-04, 06-06, 06-08). Se Royal vince: avvio 05-24, rango 1 il 05-27 (primo venerdì con Coraggio 3).
2. **Hifumi:** requisito `data` a 06-25 (la prima data possibile), evento «rango 1» lasciato al 07-02 come data consigliata, oppure titolo dell'evento cambiato in «consigliato». Oggi evento e requisito dicono due date diverse per la stessa cosa.
3. **Yusuke:** evento 47 da 06-17 a 06-18.
4. **Shinya:** requisito `data` da 09-05 a 09-04.
5. **Ann, Igor, Futaba:** aggiungere l'evento di sblocco (04-15, 04-12, 08-31) collegato alla voce già esistente (sono sblocchi di rango 1; la regola «eventi collegati per chiave» del 24/10 vale).
6. **Morgana:** aggiungere l'evento di avvio 04-11 (voce: oggi nessuna il 04-11 per Morgana, c'è solo quella di Igor) e quello del rango 1 al 04-15.

### 1.3 Tabella per la migrazione (proposta, non applicata)

| Operazione | Oggetto | Valore ora | Valore proposto | Certezza |
|---|---|---|---|---|
| UPDATE `confidente_requisito` rango 1, tipo `data` | `shinya` | `{"dal":"09-05"}` | `{"dal":"09-04"}` | alta (3 fonti) |
| UPDATE `confidente_requisito` rango 1, tipo `data` | `hifumi` | `{"dal":"06-28"}` | `{"dal":"06-25"}` | media (1 sito; la guida dice anche Fascino 3) |
| UPDATE `evento_calendario` id 47 | Yusuke rango 1 | `06-17` | `06-18` | alta (4 fonti) |
| UPDATE `evento_calendario` id 57 | Hifumi rango 1 | `07-02` | `07-02`, titolo «… rango 1 (consigliato)» | decisione |
| INSERT `evento_calendario` tipo `sblocco` | Ann rango 1 | — | `04-15`, collegato alla voce 04-15 di Ann | alta |
| INSERT `evento_calendario` tipo `sblocco` | Igor rango 1 | — | `04-12`, collegato alla voce 04-12 | alta |
| INSERT `evento_calendario` tipo `sblocco` | Futaba rango 1 | — | `08-31`, collegato alla voce 08-31 | alta |
| INSERT `evento_calendario` tipo `sblocco` | Morgana avvio / rango 1 | — | `04-11` e `04-15` | alta |
| UPDATE requisito `data` + evento 41 + voci | Kawakami | `06-04` · `06-06` · `06-03/04/08` | `05-24` (avvio), `05-27` (rango 1) | **da decidere** |

Dopo queste modifiche, per i Confidenti con data nel requisito, nessun evento di sblocco diverge dalla data del requisito (Gemelle 05-18 / 05-19 resta voluto: avvio e rango 1 sono due cose). Restano senza data nel requisito, quindi non confrontabili, Chihaya, Iwai, Makoto, Sojiro e Yoshida, che si sbloccano con una condizione diversa da una data.

---

## 2. Attività (R9-10/1, R9-10/2)

### 2.1 Sede e sblocco (R9-10/1)

| Attività | Dato Royal | App oggi | Proposta |
|---|---|---|---|
| **Lettura in metropolitana** | La lettura si fa **sul treno** nel tragitto del mattino, a sedere («passenger's seat of the train»). Nessuna stazione né piattaforma è nominata. (`daily-activities`, `book-locations-effects`) | `sede_chiave` null | Lasciare `sede_chiave` null e dirlo: l'attività non ha un luogo (come Igor, Morgana, Sae). La condizione «seduti» resta nelle note. Se si preferisce un luogo, le uniche stazioni sono `yongen-jaya/stazione-yongen-jaya` e `shibuya/stazione-shibuya`, ma nessuna fonte dice quale |
| **Jazz Jin (Kichijoji)** | Si sblocca con il **rango 4 di Akechi**; il primo giorno possibile è il **26/6** (Samurai Gamers). TheGamer dice la stessa cosa e ricorda che Kichijoji si apre con l'uscita con Ryuji il 5/6 | `sblocco` «Rango Confidente 4 con Akechi; disponibile dal 26 giugno», `condizioni_json` vuota | `condizioni_json` = `[{"tipo":"confidente","confidente":"akechi","rango":4},{"tipo":"data","dal":"06-26"}]` (in AND). Certezza alta |
| **Palestra Protein Lovers (Shibuya)** | Nessuna fonte aperta dà la condizione di sblocco. Un risultato di ricerca web (non aperto: le pagine primagames/supercheats rispondono 403) la lega al **rango 5 di Ryuji**; nessuna fonte parla del **rango 8 di Ann**. Le pagine di Ryuji danno solo battute del dialogo («Protein Powder?» al rango 5, «How about Protein Lovers?» al 6). La pagina «map-facilities» la elenca senza condizione | `sblocco` «Rango 5 di Ryuji oppure Rango 8 di Ann», `condizioni_json` vuota | **Non migrare.** Dire all'utente: «Rango 8 di Ann» non ha alcuna prova Royal; «Rango 5 di Ryuji» ha una prova indiretta. Se si accetta, `[{"tipo":"confidente","confidente":"ryuji","rango":5}]`. Certezza bassa |

Inoltre per R9-10/1 resta: `lettura-metropolitana` e le due attività sopra sono le sole senza sede o senza condizione strutturata.

### 2.2 Effetti delle sei attività con Doti solo in `doti_json` (R9-10/2)

Convenzione: «punti» = note, come nelle righe già strutturate. La forma JSON è quella di `effetti_json` esistente (`{"effetto":{"famiglia":"dote","dote":…,"note":…},"condizioni":[…]}`).

| Attività | Effetto Royal (fonte) | Proposta `effetti_json` | Dubbi |
|---|---|---|---|
| **Bagno pubblico** (Yongen-Jaya, sera) | Fascino +2 a visita; lunedì e giovedì +1 in più (bagno medicinale); con la pioggia +1 Fascino o +1 Coraggio se si prolunga, con il rischio di svenire. (Samurai Gamers `charm-guide`; GamersDecide) | `fascino` 2; `fascino` 1 con condizione giorno della settimana lunedì o giovedì | Le fonti discordano: la guida del Coraggio dice «+2 o +3 Fascino»; GamersDecide dice +1 Coraggio sotto la pioggia; una terza dice domenica come giorno migliore. Il bonus pioggia è casuale/rischioso: lasciarlo in nota |
| **Centro battute** (Yongen-Jaya) | +1 Perizia per colpo riuscito; una fonte aggiunge +2 se si colpiscono i 5 lanci. Costi 500/1.000/3.000 yen. (`proficiency-guide`, `mini-game-batting-cage`) | **Non strutturabile come valore fisso**: dipende dal risultato della sessione | Servirebbe un effetto «a punti da segnare»; oggi la riga dice «numero di note non specificato». Decisione dell'utente |
| **Studio in biblioteca** (Shujin, giorno) | Conoscenza +1 (a volte +1 Coraggio); efficace solo dopo Kamoshida (RPG Site). Nessuna fonte Royal dà la data di fine (il 20 maggio è di AGS) | `conoscenza` 1 | Il «+1 Coraggio occasionale» è casuale: nota. Fine al 20/5 solo da AGS |
| **Caffè al Leblanc** (sera) | Fascino +1 per caffè; si sblocca con il Confidente di Sojiro, «Coffee Basics» al **rango 2** (`leblanc-coffee-brewing-and-curry-guide`) | `fascino` 1 con condizione Confidente Sojiro rango 2 | Il riferimento al rango 3 nel testo attuale va verificato: la fonte dice rango 2 per la tecnica |
| **Sfida Big Bang Burger** (Shibuya, Central Street) | Tre sfide: Comet (richiede Coraggio, Conoscenza, Perizia a rango 2), Gravity (3), Cosmo Town (4). Se riesce: **+1, +2, +3** a **Coraggio, Conoscenza, Fascino e Perizia** per le tre sfide; se fallisce: solo Coraggio (+1/+2/+3). Prezzi 1.200/1.500/1.800 yen, 500 la sera (Samurai Gamers; RPG Site conferma «anche se fallisci»). Premi: distintivi HP +10/+30/+50 e panini 3/5/10 | tre effetti per sfida con i quattro Doti e le condizioni di rango; il fallimento (Coraggio) a parte | **La riga dell'app ha solo Coraggio, Conoscenza e Perizia: manca il Fascino.** Prezzi: GamerGuides cita 500 yen di notte, Primagames 1.500 |
| **Esperimenti clinici di Takemi** | Coraggio +1 per esperimento (o per passo del Confidente); +1 in più con una Persona della Morte (`guts-guide`, RPG Site, GamersDecide). Rango 1 dopo il 18/4; rango 2 chiede Coraggio 2 | `coraggio` 1 per esperimento | Se il +1 è per rango del Confidente o per esperimento non è chiaro; l'effetto va collegato al turno solo dopo averlo deciso |

### 2.3 Per R9-11 (le 7 attività senza Doti): cosa dice il Royal

| Attività | Royal |
|---|---|
| Curry al Leblanc | Coraggio +1; i giorni sono domenica, lunedì, mercoledì e venerdì; il «Curry decente» viene dal rango 3→4 di Sojiro, il «Curry del Leblanc» dall'8→9 (pagina «maximize-sp-recovery»; la pagina caffè/curry dice invece rango 9: **le due pagine non coincidono**) |
| Tempio vecchio di Kichijoji | Non è una Dote: SP massimo +3 (visite 1-3), +5 (4-6), +8 (7-9), +12 (dalla 10ª); si sblocca il 6/6 |
| Jazz Jin | Non è una Dote: cocktail per giorno della settimana e bonus Confidente (vedi 2.1) |
| Allenamento in mansarda (sedia) | Aumenta gli HP; proteine dal Rocinante di Shibuya; nessun valore |
| Palestra Protein Lovers | HP e SP massimi; nessun valore né costo nelle fonti lette |
| Lettura in metropolitana | Gli stessi effetti dei libri (+5 alla Dote del libro: Grande ladro Conoscenza, Leggenda del pirata Coraggio, Zorro Gentilezza, Danzatrice Fascino, Donna nel buio Perizia dopo Haru); un'altra pagina dice +3 per libro |
| Sfida di pesca del guardiano di Ichigaya | Fuori da questo giro |

---

## 3. Scadenze e sblocchi dei Palazzi (R9-21)

### 3.1 Finestre dell'app contro le fonti Royal

L'app ha già in `dungeon` una finestra per Palazzo (`finestra_dal`, `finestra_al`, `lettera_entro`): è la fonte da cui derivare le scadenze. Qui sotto le date Royal accanto alla finestra.

| Palazzo | App `finestra_dal` → `finestra_al` (`lettera_entro`) | Primo ingresso Royal | Biglietto di sfida (walkthrough) | Boss (walkthrough) | «Scadenza» Gfinity |
|---|---|---|---|---|---|
| Kamoshida | 04-11 → 05-02 | 11/4 | 21/4 | 22/4 | 1/5 |
| Madarame | 05-16 → 06-05 (06-02) | 16/5 (missione dal 18/5) | 23/5 | 24/5 | 5/6 |
| Kaneshiro | 06-19 → 07-09 | 19/6 (20/6 prima infiltrazione) | 23/6 | 24/6 | 8/7 |
| Futaba | 07-25 → 08-21 | 25/7 | 27/7 | 27/7 | 20/8 |
| Okumura | 09-15 → 10-11 | 15/9 | 20/9 | 21/9 | 10/10 |
| Niijima (Sae) | 10-29 → 11-20 | 29/10 | 18/11 | 19/11 | 19/11 |
| Shido | 11-24 → 12-18 | 24/11 | 3/12 | 3/12 sera | 17/12 |
| Maruki | 01-02 → 02-03 | 2/1 | non trovato | 3/2 | 6/1 (non regge: le infiltrazioni vanno fino al 26/1) |

**Come leggerla.**
- Date di ingresso: l'app e le fonti Royal coincidono per tutti (11/4, 16/5, 19/6, 25/7, 15/9, 29/10, 24/11, 2/1).
- Scadenza: la colonna Gfinity è **un giorno prima** di quella dell'app per Kamoshida, Kaneshiro, Futaba, Okumura, Niijima e Shido (1/5 contro 2/5, 8/7 contro 9/7, 20/8 contro 21/8, 10/10 contro 11/10, 19/11 contro 20/11, 17/12 contro 18/12). Per Madarame i due coincidono (5/6). Non so dire se Gfinity intenda «ultimo giorno utile» e l'app «giorno in cui scatta»: se fosse così la scadenza di Madarame sarebbe il 6/6 secondo la stessa convenzione. **Nessuna fonte aperta dice in modo esplicito quale sia il giorno in cui il gioco chiude il Palazzo.** Questo è il punto da verificare in gioco.
- I biglietti e i boss dei walkthrough sono calendari scelti dall'autore. Non sono la scadenza e non vanno nel Calendario come scadenze. Corrispondono per lo più al «furto consigliato» che l'app tiene già nel Palazzo.
- Futaba: biglietto e boss lo stesso giorno (27/7) solo nell'unica fonte inglese; da verificare in gioco.
- Maruki esiste solo in Royal: il biglietto di sfida non è trovato nelle pagine di gennaio e febbraio.

### 3.2 Madarame: quante scadenze ha il Royal?

**Una sola, il 5 giugno**, ripetuta come «deadline» da Gfinity (Royal) e dal corpo della guida vanilla (nessuna delle due la attribuisce a un dialogo). Il «3 giugno» compare una sola volta, nell'intestazione della guida vanilla. Il walkthrough Royal non dichiara scadenze: nelle prime giornate di giugno c'è solo il trofeo «Museum of Vanity Repossessed» il 5/6 mattina. Nessuna fonte data la partenza di Ryuji e Yusuke (il primo incontro con Yusuke è il 14/5). Le altre date delle fonti sono il percorso: 16/5, 18/5, 19/5, 21/5 (20/5 in una guida), biglietto 23/5, boss 24/5.

Le tre scadenze dell'app per Madarame:

| id | Data | Titolo | Cosa è per il Royal |
|---|---|---|---|
| 32 | 05-18 | «Decisione: rubare il cuore di Madarame entro il 5 giugno» | Un annuncio, non una scadenza (la scadenza è il 5/6). Il 18/5 è però l'inizio della missione nel Royal |
| 36 | 05-31 | «Invio della lettera di sfida a Madarame (secondo la guida IT)» | Nessuna fonte Royal. Il biglietto è il 23/5 nel percorso; l'app ha già `lettera_entro` = 06-02 nella finestra. 05-31 contraddice 06-02 |
| 40 | 06-05 | «Ultimo giorno per rubare il Tesoro di Madarame» | Coincide con la scadenza Royal (5/6) e con `finestra_al` |

**Proposta:** una sola scadenza, id 40, derivata da `dungeon.finestra_al` (06-05); id 32 diventa evento di storia (inizio della missione, 05-18); id 36 esce dalle scadenze (la lettera resta nella finestra come `lettera_entro` = 06-02, che è già un dato dell'app). Certezza: media sulla data (6/5 contro la convenzione di un giorno), alta sulla riduzione a una scadenza.

### 3.3 Le 18 scadenze del Calendario: che fare di ciascuna

| id | Data | Titolo (breve) | Proposta |
|---|---|---|---|
| 21 | 05-02 | Ultimo giorno Kamoshida | **Derivata** da `finestra_al` di Kamoshida |
| 32 | 05-18 | Decisione Madarame | Diventa storia (vedi 3.2) |
| 36 | 05-31 | Lettera a Madarame (guida IT) | Esce dalle scadenze (3.2) |
| 40 | 06-05 | Ultimo giorno Madarame | **Derivata** da `finestra_al` di Madarame |
| 56 | 06-30 | Pagamento/minaccia Kaneshiro (3 milioni) | Resta come scadenza di trama, da rivedere: il ricatto è di tre settimane dal 20/6 (cioè l'11/7) e la data dell'app è il 30/6; nessuna fonte Royal letta la conferma né la smentisce |
| 60 | 07-09 | Risveglio del cuore di Kaneshiro | **Derivata** da `finestra_al` di Kaneshiro (07-09); il titolo oggi non dice «ultimo giorno» |
| 69 | 07-24 | Medjed minaccia per il 21/8 | Annuncio: diventa storia |
| 82 | 08-19 | Termine consigliato Futaba | Consiglio, non scadenza: tipo «consiglio» |
| 84 | 08-21 | Risoluzione crisi Medjed | **Derivata** da `finestra_al` di Futaba (08-21) |
| 96 | 09-18 | Scadenza fissata per Okumura: 10/10 | Annuncio: storia. **Attenzione: dice 10 ottobre, la finestra dice 11 ottobre**: stessa differenza di un giorno di Gfinity |
| 105 | 10-11 | Scadenza Okumura | **Derivata** da `finestra_al` di Okumura (10-11) |
| 116 | 10-29 | Annuncio scadenza Niijima 20/11 | Annuncio: storia |
| 119 | 11-01 | Maruki lascia la scuola il 18/11 | Resta, ma non è un Palazzo: scadenza del Confidente Maruki (rango 9, evento del 18/11 confermato da due fonti) |
| 129 | 11-20 | Scadenza finale Niijima | **Derivata** da `finestra_al` di Niijima (11-20) |
| 136 | 12-17 | Termine consigliato Shido | Consiglio |
| 139 | 12-18 | Elezioni: ultimo giorno Shido | **Derivata** da `finestra_al` di Shido (12-18) |
| 161 | 02-02 | Scadenza per assicurare il percorso verso il Palazzo finale | Scadenza di trama (scelta del finale): resta |
| 163 | 02-03 | Maruki: battaglie finali | **Derivata** da `finestra_al` di Maruki (02-03) |

Quindi, delle 18: 8 sono derivate dalle finestre (21, 40, 60, 84, 105, 129, 139, 163), 3 restano scadenze proprie (56 da rivedere, 119 del Confidente Maruki, 161 di trama), 4 annunci passano a storia (32, 69, 96, 116), 2 sono consigli (82, 136) e 1 esce (36). Per R9-21/2 (sblocchi) le date di ingresso dei Palazzi dell'app coincidono con le fonti Royal e con `finestra_dal`: gli eventi di sblocco corrispondenti si possono derivare da lì senza cambiare date.

---

## 4. Il passaggio 9→10 ha una soglia in punti? (`requisiti.md:59`)

**Risposta breve.** Le fonti Royal che ho aperto non danno soglie in punti per nessun rango, quindi non possono né confermare né smentire la frase «in generale il 9→10 non ha soglia». La tabella con i punti per passaggio nell'app viene da due fonti indipendenti già in `docs/riferimenti/confidenti-punti.md` (guida Steam e dati estratti dal gioco, 121 celle su 122 coincidono). In quella tabella **14 Confidenti su 18 hanno una soglia a punti per il 9→10**, e `confidente_rango` la conserva così com'è (la migrazione 161 dice che «la soglia in punti non cambia mai»). La frase di `requisiti.md:59` è quindi **contraddetta dai dati dell'app** e non ha prova Royal: la riga va corretta, non i dati.

Cosa dicono le pagine Royal sul 9→10 (le pagine di Samurai Gamers danno solo i «+N» di ogni scelta, mai un totale):

| Confidente | Soglia 9→10 nell'app | Cosa dicono le fonti Royal |
|---|---|---|
| Ryuji | 60 punti | nessun vincolo né punti dichiarati; il 10 è il «Secondo Risveglio» |
| Ann | 35 | nessun vincolo; il 10 ha il ramo amicizia/romanticismo |
| Yusuke | 35 | nessun vincolo |
| Makoto | 55 | nessun punto; il 9 comprende un'indagine a Shinjuku (costa giorno e sera) |
| Futaba | 35 | nessun vincolo per il 9→10 (il rango 8 è bloccato dalla richiesta «Daughter's Just a Meal Ticket») |
| Haru | 20 | nessun vincolo |
| Kasumi | 80 | il rango 9 è datato 19/1; il 10 è una telefonata senza data; massimo 5 fino alla storia successiva (Push Square) |
| Sojiro | 40 | il 9 è bloccato finché non si chiude la richiesta «Money-Grubbing Uncle» |
| Takemi | 36 | il rango 8 chiede la richiesta «Bad Medicine»; il 10 è l'ultimo rango |
| Ohya | 38 | nessun vincolo per il 9→10 |
| Hifumi | 30 | il rango 8 chiede la richiesta «Upstaging the Stage Mother» e Conoscenza 5 |
| Chihaya | 21 | il rango 8 si chiude dopo la richiesta «Debunking the Psychic» |
| Iwai | 40 | il rango 8 chiede una sidequest; il 7,5 Coraggio 5 e una richiesta |
| Shinya | 30 | il rango 9 è bloccato finché non si chiude «A Mother's Aggression» |
| **Akechi** | 0, **automatico** (storia) | niente punti: il rango 9 è l'incontro nel Palazzo di Shido, il 10 la sua sconfitta lì. Push Square: il 10 si raggiunge più avanti se si è al rango 8 |
| **Maruki** | 0, **automatico** | niente punti: **rango 9 il 24/9, rango 10 il 18/11** (due fonti); il 10 non ha scelte che contano |
| **Kawakami** | 0 (evento) | niente punti dichiarati; il rango 9 chiede la richiesta «A Teacher Maid to Suffer» |
| **Yoshida** | 0 (evento) | nessun vincolo dichiarato |
| Mishima | richieste dei Memento | niente punti; sale con le richieste; il rango 10 non ha scelte che contano |
| Igor | automatico | rango 9 il 11/10, rango 10 il 24/12; nessun punto |
| Morgana | automatico | rango 9 dopo il Palazzo di Okumura, rango 10 il 23/12 |
| Sae | automatico | il 10 dopo i finali (20/11); i ranghi 7-9 senza data |
| Gemelle (Caroline e Justine) | fusione | niente punti: rango 9 con Bugs + Samarecarm, rango 10 con Seth + High Counter |

**Conclusione per il PM.**
1. `requisiti.md:59` va riscritta: «Il 9→10 non ha soglia in punti per Akechi e Maruki (automatici), Kawakami e Yoshida (a eventi), né per Igor, Morgana, Sae, Gemelle, Mishima (non a punti). Per gli altri 14 la soglia c'è e vale quella della tabella dei punti».
2. I dati di `confidente_rango` non vanno toccati: concordano con l'unica fonte che ha i totali.
3. Residuo: nessuna pagina Royal aperta dà un totale di punti. Se si vuole una conferma indipendente servono la guida Steam originale o i dati estratti del gioco (non raggiungibili da qui).

Una pagina Samurai Gamers sui Confidenti (lista) dice che «passare del tempo con i Confidenti non basta e servono i regali»: contraddice le pagine dei singoli Confidenti. Non l'ho risolto.

---

## 5. Riepilogo delle decisioni

| Voce | Cosa si può migrare subito | Cosa serve prima |
|---|---|---|
| R9-04/3 | Yusuke evento 06-18; Shinya 09-04; eventi mancanti di Ann, Igor, Futaba, Morgana | Hifumi: quale delle due date vale come rango 1 (06-25 contro 06-28/07-02) |
| R9-04b/2 | — | Kawakami: Royal (24-27/5) contro AGS/G-017 (3-8/6): decisione dell'utente o seconda fonte |
| R9-10/1 | Jazz Jin: condizioni Akechi 4 + data 06-26 | Palestra: il «rango 8 di Ann» non ha prova; lettura in metropolitana: nessuna sede (confermare) |
| R9-10/2 | Studio biblioteca, caffè, Big Bang Burger (con il Fascino), Takemi (+1 Coraggio) | Bagno pubblico (fonti discordi), centro battute (non strutturabile), conversione punti→note |
| R9-21 | Una sola scadenza per Palazzo derivata dalla finestra; Madarame ridotta a una (06-05) | Verificare in gioco se il giorno di chiusura è il giorno `finestra_al` o quello prima (tutte le fonti Gfinity sono un giorno prima, tranne Madarame) |
| requisiti.md:59 | Correggere il testo (14 soglie a punti su 18) | — |

**Limiti.** Fonti secondarie in inglese; un solo sito per la maggior parte dei dati; tre siti non apribili; le pagine Samurai Gamers del 2019-2022 possono precedere correzioni Royal; i walkthrough Novembre-Febbraio sono in alcuni casi la «Second Edition» dell'autore (versione giapponese). Il Calendario Royal vero va verificato in gioco per Madarame e per il giorno di chiusura dei Palazzi.
