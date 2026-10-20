# Registro dell'Esperto della guida — team p5s

Una voce per domanda sui dati di gioco. Ogni voce dice: chi ha chiesto, la risposta in italiano, le fonti (URL e sezione, con una
citazione breve), la certezza (alta / media / bassa) e le discordanze. Fonte primaria: la guida italiana allgamestaff
(https://www.allgamestaff.it/persona-5-royal/indice/); se manca o è ambigua, guide inglesi (citate, rese in italiano).
Nota sulle fonti: il wiki Fandom (megamitensei.fandom.com) risponde HTTP 402 agli strumenti di lettura e non è stato letto; al suo posto
si usano megatenwiki.com e samurai-gamers.com. Stato: **chiusa** (risposta data) · **parziale** (risposta con buchi dichiarati) · **aperta**.

Abbreviazione: «AGS» = https://www.allgamestaff.it/persona-5-royal/

---

## G-001 · L2 · Shujin Academy: i piani sono zone distinte?
Chiesto da: Stesura modifiche, Analisi requisiti (L2 dubbio 1) · Stato: **parziale**

**Risposta.** Sì: nel gioco la scuola è divisa in zone distinte, e i piani dell'edificio sono destinazioni separate del viaggio rapido
(«Edificio Principale 2P» è una voce a sé; la guida nomina allo stesso modo «Edificio principale 1P»). Un'Area per piano è quindi
coerente col gioco. Ogni planimetria nativa `002-0-0/1/2` copre lo stesso piano di **entrambi** gli edifici (principale + laboratori,
collegati), quindi il piano è la zona e l'edificio no. L'aula 2-D **non** è una zona del viaggio rapido: si raggiunge da
«Edificio Principale 2P». Altre zone citate come voci del viaggio rapido: **Biblioteca**, **Stazione Aoyama-Itchome** (dal Cortile).
Citate come luoghi senza dire se sono voci: Cortile, Cancello della scuola, Tetto (ritrovo), Edificio Sportivo (dove si trova Maruki),
Aula del consiglio studentesco (3° piano).
Fonti:
- AGS soluzione-settimana-1/, «13 APRILE»: «“Edificio Principale 2P”, se state usando il Viaggio veloce».
- AGS soluzione-settimana-2/, «18 APRILE»: «rechiamoci nella Biblioteca»; «Ci sono 2 distributori automatici nell'Edificio principale 1P».
- AGS soluzione-settimana-2/, «18 APRILE»: «Dal Cortile, aprite il menu del Viaggio veloce e selezionate la Stazione Aoyama-Itchome».
- AGS soluzione-settimana-11/, «21 GIUGNO»: «nell'area dell'Edificio Sportivo della Shujin Academy».
Certezza: **media-alta** sul «piano = zona»; **bassa** sull'elenco completo delle voci del viaggio rapido (non c'è una tabella nella guida).
Discordanze: la guida chiama l'edificio delle aule ora «Edificio Aule» (sett. 1), ora «Edificio principale» (dalla sett. 2).
Conseguenza per i dati (non è un errore di oggi): la «Aula» `002-6-0` è una stanza (aula 2-D) e non una zona del viaggio rapido; la
Biblioteca `002-8-0` sì.
Fonte inglese: https://samurai-gamers.com/persona-5/map-facilities/, sezione «Shujin Academy», divide la scuola per piano (1F: negozio
scolastico e cancello; 2F: aula; 3F: biblioteca e aula del consiglio studentesco; altro: tetto e infermeria di Maruki, solo Royal), senza
separare edificio principale e laboratori: **concorda** con «piano = zona». La guida di Kamoshida della stessa fonte cita il tetto come
destinazione rapida. megatenwiki non leggibile (verifica Cloudflare).

## G-002 · L2 · «Area riservata allo staff» (planimetrie native 150-3-0 / 150-3-1)
Chiesto da: Stesura modifiche, Analisi requisiti (L2 dubbio 2) · Stato: **chiusa con «non risulta»**

**Risposta provvisoria.** La guida italiana non nomina mai un'«area riservata allo staff» (settimane 1–11 lette). L'unico evento che
porta il gruppo «dietro le quinte» è la **gita all'emittente televisiva del 9 giugno** (evento di trama: il gruppo aiuta la produzione e
incontra Akechi; il 10 giugno la registrazione dello show). La planimetria 150-3-1 (lunga zona di corridoi e stanze con una grande sala
scura) è compatibile con uno studio televisivo, ma **non è dimostrato**. Nessun quartiere dell'app la ospita con certezza.
Raccomandazione: resta **«da collocare»** (soluzione prudente già proposta in L2), finché la fonte non conferma il posto.
Fonti: AGS soluzione-settimana-9/, «9 GIUGNO»: «Oggi è la giornata della gita all'emittente televisiva»; «Sarete costretti ad aiutare la produzione».
Certezza: **bassa** sul legame planimetria ↔ emittente. Anche Samurai Gamers (map-facilities, vending-machine-drinks-list,
specialty-shops-guide) non nomina una zona «Staff Only»; Fandom (HTTP 402) e megatenwiki (verifica Cloudflare) non sono leggibili con gli
strumenti. Le planimetrie non hanno pin che aiutino a riconoscerle. Esito: **resta «da collocare»**; lo può riconoscere solo l'utente
guardando le due planimetrie (domanda da far passare dal PM, se serve collocarla).

## G-003 · L2 · Banchina / Stazione Aoyama-Itchome: sta sotto Shujin?
Chiesto da: Stesura modifiche, Analisi requisiti (L2 dubbio 3) · Stato: **chiusa**

**Risposta.** Sì. Aoyama-Itchome è la fermata della metro della scuola: da Shibuya si passa dal tornello della linea Ginza, si arriva ad
Aoyama-Itchome e si sale a piedi alla Shujin. È una destinazione del viaggio rapido raggiungibile dal Cortile della scuola, e Samurai
Gamers elenca «Aoyama-Itchome» fra i luoghi disponibili dall'inizio (insieme a Yongen-Jaya e Shibuya). Tenerla come Area del quartiere
Shujin Academy è coerente col gioco (la scuola sta ad Aoyama, come dice già la descrizione del quartiere nell'app).
Fonti:
- AGS soluzione-settimana-1/, «11 APRILE – Vai alla Shujin»: «Arriverete ad “Aoyama Itchome” ora, affollata di studenti».
- AGS soluzione-settimana-1/, «14 APRILE»: «Incamminatevi verso la Stazione Aoyama-Itchome e prendete la metro».
- AGS soluzione-settimana-2/, «18 APRILE» (citazione in G-001).
- https://samurai-gamers.com/persona-5/hangout-spots-list/: «Default: Yongen-Jaya, Shibuya, Aoyama-Itchome».
Certezza: **alta**. Discordanze: nessuna. Nota: panetteria e distributori del «tornello della linea Ginza» stanno nella stazione di Shibuya,
non ad Aoyama-Itchome (sett. 1); il distributore «nella nicchia» è sulla salita verso il Cancello della scuola.

## G-004 · L2 · Covo dei Ladri: dove sta e come ci si arriva (D2, fermata della metro)
Chiesto da: Stesura modifiche, Analisi requisiti (L2 dubbio 4) · Stato: **parziale**

**Risposta.** Il Covo dei Ladri (esclusivo Royal) **non è la soffitta del Leblanc** e non è un posto della città: è uno spazio cognitivo
che si apre dall'**opzione «Covo dei Ladri» del menu di gioco**, disponibile dopo il **5 maggio** (formazione dei Ladri Fantasma alla festa
del Wilton Hotel); non è accessibile dentro un dungeon né dalla Stanza di Velluto. Non risulta accessibile dalla metro né dalla mappa della
città. Il solo legame col Leblanc è che alcune ricompense arrivano nella stanza del protagonista (dato letto solo in sintesi).
Conseguenze: D2 («Area di Yongen-Jaya») è una **scelta di ordinamento dell'app**, non un dato del gioco; è ragionevole perché il Covo è
«la base» del gruppo che sta al Leblanc, ma la fonte non lo colloca in un quartiere. La fermata «Covo dei Ladri» della metro dell'app non
ha corrispondente nel gioco: la scelta prudente del dubbio 4 (la fermata continua a portare a /guida/covo) non contraddice la fonte.
Fonte: AGS covo-dei-ladri/, «Come sbloccare il Covo dei Ladri»: «selezionare l'omonima opzione dal menu di gioco per visitare quest'area».
Certezza: **alta** su accesso dal menu; **media** sull'assenza dalla mappa.
Discordanza sulla data: https://samurai-gamers.com/persona-5/my-palace-guide/, «How to Unlock»: «accessible on day 6/5 of the game»
(avviso al rientro al Leblanc). Le due fonti sono compatibili: il gruppo si forma il 5/5, il Covo si usa dal **6 maggio**.
Da portare al PM: D2 resta valida come scelta dell'app, ma la motivazione «è la soffitta del Leblanc» non va scritta (non è vera).

## G-005 · L4 · Che cosa si rigenera nei Palazzi (oggetti, Ombre sciagura, miniboss, Semi, «nemico»)
Chiesto da: Analisi requisiti (L4 dubbi 1, 3, 7) · Stato: **parziale**

**Risposta.**
1. **Forzieri non aperti** restano al loro posto da una visita all'altra (la guida torna a prenderli il giorno del colpo). Che un forziere
   **già aperto** si riempia di nuovo **non risulta** in nessuna pagina: va trattato come permanente. Forzieri **chiusi a chiave** si aprono
   solo con i Grimaldelli; il Nemico potente che li custodisce è ancora lì al ritorno se non è stato battuto. Il contenuto di urne, vasi,
   botti è **casuale**. Dopo il furto del Tesoro il Palazzo **sparisce** e ciò che è rimasto non si recupera più.
2. **Ombre sciagura**: si incontrano già prima del furto (a Kamoshida dal 20/4); la guida le dice interessanti «per il farming», il che fa
   pensare a incontri ripetuti, ma **non lo dice esplicitamente**. D4 («rigenerabili») resta plausibile, certezza bassa.
3. **Boss del Palazzo**: non si riaffronta (il Palazzo sparisce). **Miniboss**: che si riaffrontino non risulta; la stessa specie torna poi
   come Ombra comune. → «permanenti» è coerente.
4. **Semi** (la guida italiana dice **«Semi della Bramosia»**, non «Semi della volontà»): **3 per Palazzo**; ognuno ridà 10 PS a tutti; il
   terzo forma l'accessorio **Cristallo** (a Kamoshida «Cristallo della lussuria», abilità Diarama). Il gioco li conta («Semi raccolti»):
   restano raccolti → **permanenti** (certezza media: è dedotto, non scritto).
5. **Categoria «nemico»**: la guida usa «Ombre» come termine generale; «nemici» e «guardie» sono sinonimi pratici. Categorie distinte che
   la guida nomina: **Nemici feroci / Nemico potente** (aura rossa), **Ombre sciagura**, **Mini Boss**, **Boss**, **Demoni del Tesoro**,
   il **Mietitore** (solo nei Memento). Un tipo «nemico» separato dalle Ombre non esiste nel gioco.
6. **Ombre comuni**: ricompaiono cambiando stanza/area (la guida suggerisce di rientrare in una stanza per farle ricomparire).
Fonti:
- AGS palazzo-di-kamoshida/, «Dirigiti verso la Stanza del Tesoro»: «altrimenti lo scassinerete la prossima volta».
- AGS guida-esplorazione-dungeon/, «Preparare i grimaldelli»: «possono essere aperti soltanto usando questi strumenti»; «I Palazzi scompaiono
  dopo il completamento»: «Se lasciamo indietro qualcosa, non potremo più tornare a recuperarlo».
- AGS ombre-sciagura/, «Bottino e Ricompense»: «particolarmente interessanti anche dal punto di vista del farming».
- AGS palazzo-di-kamoshida/, «Infiltrati nella torre»: «Ci sono 3 Semi della Bramosia in ogni Palazzo».
- AGS palazzo-di-kamoshida/, 15/4: «visitare di nuovo questa stanza per far ricomparire i tre nemici».
Certezza: alta su 1 (non aperti, chiusi a chiave, sparizione), 4 (numero e Cristallo), 5, 6; **bassa** su 2 (rigenerazione delle Ombre
sciagura) e sui forzieri già aperti. Fonte inglese: https://samurai-gamers.com/persona-5/what-are-ishi/, «What are Will Seeds?»: un Seme
mancato si può **comprare da Jose** nei Memento («possible to purchase an extra Will Seed from Jose») → conferma che il Seme non si rigenera
nel Palazzo (permanente). Su forzieri e Ombre sciagura la fonte inglese leggibile non dice nulla.
Nota di vocabolario per l'app: «Semi della Bramosia» è la resa della guida (a Kamoshida; il nome del Seme cambia con il Palazzo).

## G-006 · L6 · Clinica di Takemi: data di sblocco
Chiesto da: Analisi requisiti (L6 dubbi 3-4) · Stato: **chiusa**

**Risposta.** La clinica è visibile dal 9/4 (prologo), ma la **prima visita è il 16 aprile**, obbligata dalla trama (Morgana impedisce gli
altri edifici): da quel giorno apre il **negozio** della clinica. Il **Confidente Morte (Tae Takemi)** si avvia dal **18 aprile**, nel
tempo libero; nessun requisito per l'avvio (il Rango 2 chiede **Coraggio Rango 2 «Audace»**, l'evento del rango 8 **Fascino Rango 4**).
Fonti:
- AGS soluzione-settimana-1/, «16 APRILE – Visita la clinica sospetta»: «dovrete visitare la “Clinica Medica Takemi”».
- AGS guida-rango-confidente-di-tae-takemi-morte/, «Rango 1»: «Giorno consigliato: 18 APRILE».
- https://samurai-gamers.com/persona-5/death-confidant-takemi-tae/, «Unlocking Takemi»: «can meet her as early as 4/18».
Certezza: **alta**. Discordanze: nessuna fra fonti. **Dato già presente nell'app:** il luogo `yongen-jaya/clinica-takemi` dice sblocco
«18 aprile»: corretto per il Confidente, ma il negozio della clinica c'è dal **16 aprile** (da distinguere in L6).
**Decisione dell'utente** (dal PM, 2026-10-20): 16/04 = prima data utile del negozio di farmaci; 18/04 = sblocco di Tae come Confidente.

## G-007 · L6 · Palazzi di Kamoshida e Madarame: apertura e scadenza
Chiesto da: Analisi requisiti (L6 dubbi 3-4) · Stato: **parziale**

**Risposta.**
- **Kamoshida**: la **prima entrata nel castello è l'11 aprile** (involontaria, il primo giorno di scuola: «Controlla nella cella»,
  «Scappa dal castello misterioso»); il **12 aprile** è il primo ingresso volontario con l'app (Ryuji); la missione
  «Ruba il cuore di Kamoshida» parte il **15/4**; il tutorial della scadenza compare il **18/4**; la guida consiglia infiltrazione il 20/4,
  lettera di sfida il 21/4, colpo il **22/4**. Il «giorno della resa dei conti» (consiglio scolastico) è il **2 maggio**: la guida italiana
  non scrive in chiaro «ultimo giorno utile», ma l'ultimo giorno coincide con il consiglio del 2/5 (dato dell'app oggi: «2 maggio»).
- **Madarame**: il Palazzo si materializza il **16 maggio**; il 18/5 la guida fissa le scadenze: **furto entro il 5 giugno, lettera di sfida
  entro il 2 giugno**; prima infiltrazione consigliata 19/5.
Fonti:
- AGS soluzione-settimana-2/, «18 APRILE»: «abbiamo diversi giorni prima di dover tornare al palazzo».
- AGS soluzione-settimana-4/: «Ci siamo…è il giorno della resa dei conti» (2/5).
- AGS soluzione-settimana-6/, «18 MAGGIO»: «completare il furto entro il 5 giugno, ma la lettera di sfida… entro il 2 giugno».
- https://samurai-gamers.com/persona-5/p5r-april-walkthrough/: «Castle of Lust infiltration mission starts» (18/4).
Certezza: **alta** per Madarame; **media** per la scadenza di Kamoshida (dedotta dal consiglio del 2/5). **Dati già presenti nell'app**
(`dungeon`): Kamoshida «11 Aprile — prima infiltrazione esplorativa», scadenza «2 maggio»; Madarame 16/5 e 5/6 (lettera entro 2/6):
tutti **coerenti** (l'11 aprile è confermato da AGS soluzione-settimana-1/, «11 APRILE (Lunedì 4/11)», e da
https://samurai-gamers.com/persona-5/p5r-kamoshida-palace-guide, «First Infiltration (4/11)»). Sulla scadenza: né AGS né Samurai Gamers
scrivono «2 maggio» come ultimo giorno; AGS dice solo «Se il tempo dovesse scadere, sarà Game Over» (palazzo-di-kamoshida/, «20 APRILE»).

## G-008 · L6 · Odaiba (Seaside Park): sblocco
Chiesto da: Analisi requisiti (L6 dubbi 3-4) · Stato: **chiusa**

**Risposta.** Si sblocca leggendo il libro **«Luoghi della movida»** (Libreria Taiheido, Central Street, Shibuya), **in vendita da mercoledì
1 giugno**: la lettura sblocca il ritrovo **Seaside Park** (la guida lo compra il 2/6 e lo legge il 15/6). Nessun invito di un Confidente
risulta sbloccarlo.
Fonti:
- AGS libri/, tabella: in vendita «da Mercoledì 6/01», effetto «Nuovo punto di ritrovo: Seaside Park».
- AGS soluzione-settimana-10/, «15 GIUGNO»: «Questa lettura sbloccherà una nuova località, Seaside Park».
Certezza: **alta**. Discordanze: Samurai Gamers lo mette sotto «Lovers Confidant – Rank 10» (Ann) senza citare il libro (il rango 10 di Ann
in versione amore si svolge sulla ruota panoramica di Odaiba: è un evento lì, non lo sblocco).
**Dato già presente nell'app da correggere** (quartiere `odaiba`): sblocco «1 giugno oppure Confidente Lovers (Ann) Rango 10»,
`sblocco_data` «06-01». Il 1° giugno è la data di **messa in vendita del libro**, non dello sblocco; lo sblocco è la **lettura** di «Luoghi
della movida». → Analisi dati/BE in L6, PM in copia.
**Decisione dell'utente** (dal PM, 2026-10-20, vedi G-018): Odaiba = lettura di «Luoghi della movida» **oppure** Ann Rango 10, condizioni
alternative; resta sbagliato solo il 1° giugno come data di sblocco.

## G-009 · L6 · Asakusa: sblocco
Chiesto da: Analisi requisiti (L6 dubbi 3-4) · Stato: **chiusa**

**Risposta.** Si sblocca col **Rango 7 del Confidente Amanti (Ann)** (giorno consigliato dalla guida: 8 luglio), rispondendo «Ti ammira»
(il ritrovo si chiama nella guida «Asakusa-Osiage», grafia della guida). **Nessun libro** sblocca Asakusa; il libro «Shitamachi rinato»
(premio della richiesta «Un intruso a Yongen-Jaya») sblocca invece lo **Skytree**.
Fonti:
- AGS guida-rango-confidente-di-ann-amanti/, «Rango 7»: «Questo sbloccherà il punto di ritrovo Asakusa-Osiage».
- https://samurai-gamers.com/persona-5/hangout-spots-list/: «Asakusa – Rank 7» (Lovers).
Certezza: **alta**. Discordanze: la pagina inglese di Takemi su Samurai Gamers attribuisce «Sky Tree (Asakusa / Oshiage)» al Rango 6 di Takemi
(contestato da un commento sotto la stessa pagina). Dato dell'app (`asakusa`: «Confidente Lovers (Ann) Rango 7»): coerente.

## G-010 · L6 · Quartieri disponibili dall'inizio e primi sblocchi
Chiesto da: Analisi requisiti (L6 dubbi 3-4) · Stato: **parziale**

**Risposta.** Dall'inizio: **Yongen-Jaya** (9/4), **Shibuya** e **Aoyama-Itchome / Shujin Academy** (11/4). Le uscite **serali** fuori da
Yongen-Jaya sono possibili solo **dal 6 maggio** (chiave del Leblanc). Primi sblocchi (guida italiana · fonte inglese):
Ogikubo 28/4 Ryuji Rango 4 · 29/4 Chariot R4 (differenza di itinerario, la regola è il rango) — Parco Inokashira Ann Rango 3 (21/5) —
Harajuku libro «Vague» (in vendita da mercoledì 18/5) o invito di Mishima del 3/8 — Kichijoji 5/6 (testo letto solo in sintesi) —
Tsukishima Ryuji Rango 7 — Suidobashi 9/6 (guida) · 10/6 (inglese) — Shinjuku 18/6 — Akihabara: la guida italiana non dà una data
(fonte inglese 31/8, certezza media).
Fonti: AGS soluzione-settimana-1/ (11/4), soluzione-settimana-4/ («potremo uscire da Yongen-Jaya di notte»), soluzione-settimana-10/
(«sbloccare un nuovo punto di ritrovo: Shinjuku»), libri/; https://samurai-gamers.com/persona-5/hangout-spots-list/.
Certezza: alta per i tre iniziali, la sera dal 6/5 e Shinjuku; media per Suidobashi (9 o 10/6) e Akihabara.
Dati dell'app: Suidobashi `sblocco_data` «06-10». **Aggiornato con G-018**: il testo integrale della settimana 9 («9 GIUGNO (Giovedì 6/09)»)
dice «sarà sbloccato anche un nuovo luogo di ritrovo: Suidobashi (Dome Town)» → lo sblocco è il **9 giugno**; il 10/6 della fonte inglese è
una discordanza. Vale la guida italiana: il dato dell'app va portato a 06-09 (elenco da approvare).

## G-011 · L5 · Orari dei negozi: regola generale ed eccezioni
Chiesto da: (proattivo, L5 dubbio 3 e R5-04/R5-05) · Stato: **parziale**

**Risposta.** La guida italiana **non** dà una regola generale «aperto giorno e sera»: segna la fascia solo per le eccezioni. Eccezioni
documentate: **Super Muramasa** (Yongen) solo giorno; **Venditore di patate dolci** (Yongen) solo giorno, dal 9 ottobre; **Fioraio Sukebe**
(Shinjuku) solo sera; **Mran Mran** (Shinjuku) solo giorno; **Jazz Jin** (Kichijoji) di sera (3.000 ¥, dal Rango 4 di Akechi, dal 26/6, con
alcuni sabati/domeniche chiusi per trama); **Crossroads** «bar notturno». Fasce dei **lavori** (non del negozio): Ore no Beko solo sera,
Rafflesia solo giorno. **Pioggia**: venditore ambulante di Shibuya e venditore di patate dolci chiusi; tre oggetti solo con la pioggia (Natto
rugiadoso al Taisho Store, Sandwich inzuppato a Yon-Germain, Frullato iperproteico a Prossimo asso). **Ondata di calore** (giorno) e **Notte
torrida** (sera): distributori vuoti. **Giorni**: Chiesa di Kanda oggetti solo la domenica; Friggitoria Hagoromo Katsu a pezzettoni la
domenica sera; Negozio scolastico Panino con yakisoba e Pane autunnale solo il venerdì. Nessun orario proprio per negozio scolastico,
biblioteca, distributore di Untouchable.
Vocabolario della guida per le fasce: «Mattina presto», «Mattina, mezzogiorno e pomeriggio», **«Dopo scuola»**, **«Sera»**; note dei negozi
«Aperto solo di giorno» / «aperto solo di sera».
Fonti: AGS elenco-dei-negozi/ (schede dei negozi citati: «Aperto solo di giorno», «aperto solo di sera»); AGS jazz-club/ («accessibile durante
la sera pagando 3.000 yen»); AGS lavori-part-time/ («disponibile esclusivamente di sera»); AGS effetti-del-meteo/ («rimangono chiusi quando
piove»); AGS gestione-del-tempo-e-vita-quotidiana/ («Ciclo giorno-notte»).
Certezza: **alta** per le eccezioni elencate; per i negozi senza nota la fonte non dice nulla (non dedurre «sempre aperto» come dato della
guida: è il comportamento del gioco ma va scritto come regola dell'app). Discordanza interna: la chiusura con la pioggia del venditore
ambulante c'è solo nella pagina del meteo, non nell'elenco dei negozi.
Per L5 dubbio 3 («negozio con orari diversi dalla sede»): i casi reali sono pochi e sono **fasce del lavoro** (Ore no Beko, Rafflesia) o
**disponibilità di un articolo** per giorno/meteo, non orari del negozio diversi dal luogo.

## G-012 · L5 · Café Leblanc: orario del luogo e del «negozio» (caffè e curry)
Chiesto da: Analisi dati (L5) · Stato: **chiusa**

**Risposta.** Sono due cose diverse e non si contraddicono. Il **locale** è aperto di giorno (Sojiro lavora al bancone); la soffitta, casa
del protagonista, si usa sia dopo scuola sia la sera. **Caffè e curry** il protagonista li **prepara la sera**, quando la macchina del caffè
e i fornelli sono liberi: di giorno e dopo scuola non si può perché il locale è aperto. Il caffè si sblocca col **Rango 2 di Sojiro**
(giorno consigliato 26/4), il curry col **Rango 4** (consigliato 2/6), e il curry solo nei giorni in cui il frigorifero ha gli ingredienti.
Il Leblanc **non** compare nell'elenco dei negozi della guida: non è un negozio con listino, è un'attività (preparare caffè o curry). Sojiro
come Confidente è disponibile solo la sera, tutti i giorni tranne il mercoledì.
→ Per L5: il «solo sera» del negozio `leblanc` è la fascia dell'**attività** (preparare), non un orario del luogo; il luogo resta «giorno e
sera». È un'eccezione dichiarata (dubbio 3), oppure va trattato come attività del luogo e non come negozio.
Fonti:
- AGS guida-rango-confidente-di-sojiro-ierofante/, «Rango 2»: «Provate a preparare il caffè di notte, quando la macchina del caffè è libera».
- AGS stessa pagina, «Rango 4»: «Cucinatelo di notte, quando i fornelli sono liberi».
- AGS gestione-del-tempo-e-vita-quotidiana/, «Café Leblanc»: «possiamo preparare caffè o curry durante la sera».
- https://samurai-gamers.com/persona-5/map-facilities/, «Yongen-Jaya > Backstreets», riga «Cafe»: «Coffee Making … Curry Making … Night»;
  riga «Attic (Leblanc)»: «After School (Day / Night)».
Certezza: **alta**. Discordanze: nessuna.

## G-013 · L5 · Chiesa di Kanda: orario del luogo, di Hifumi e del «negozio»
Chiesto da: Analisi dati (L5) · Stato: **parziale**

**Risposta.** Ci sono tre orari diversi, ognuno corretto nel suo ambito:
- **Hifumi Togo (Confidente Stella)**: solo la **sera**, **lunedì, mercoledì, sabato e domenica** (anche con la pioggia, ma i Ranghi 4 e 6 no
  con la pioggia); si sblocca dal **28 giugno** insieme a Kanda, con **Fascino Rango 3**. → È l'orario che oggi sta sul **luogo** (sera di
  dom/lun/mer/sab): è la disponibilità del Confidente, non l'apertura della chiesa.
- **Oggetti in vendita** (negozio `chiesa-kanda`): solo la **domenica**, con rifornimento la domenica dopo: Acqua battesimale 1.000 ¥ (2),
  Acqua benedetta 2.000 ¥ (2), Vino della grazia 14.000 ¥ (1), Ceneri del pentimento 12.000 ¥ (1).
- **Luogo e confessionale** (recupero delle abilità dimenticate dei compagni): fascia «dopo scuola / sera» secondo la fonte inglese. I
  **giorni di apertura** della chiesa non li dà nessuna fonte letta.
Fonti:
- AGS guida-rango-confidente-di-hifumi-stella/, «Disponibilità di Hifumi Togo»: disponibile «solo di sera» lunedì, mercoledì, sabato, domenica.
- AGS elenco-dei-negozi/, «Chiesa di Kanda»: disponibilità «Domenica», rifornimento «Domenica successiva».
- https://samurai-gamers.com/persona-5/map-facilities/, «Kanda > Kanda Catholic Church»: «Recover forgotten moves of party members»,
  «After School (Evening)».
Certezza: **alta** su Hifumi e sul negozio; **bassa** sui giorni di apertura del luogo (non risulta).
Discordanze di prezzo: Samurai Gamers (specialty-shops-guide, «Kanda Church») dà Sacramental Wine 3.000 e Repentance Ashes 4.000, la guida
italiana 14.000 e 12.000. **Vale la guida italiana** (fonte primaria); segnalato per L7.
→ Per L5: il luogo non deve prendere l'orario di Hifumi come proprio (quello va a L9, disponibilità del Confidente); il negozio ha
un'eccezione dichiarata «solo domenica».

## G-014 · L5 · Distributori di Shibuya e Yongen-Jaya legati ai listini di Shujin (pin 1527, 1547, 1584, 1768, 1769)
Chiesto da: Analisi dati (L5) · Stato: **parziale**

**Risposta.** Nel gioco ogni distributore è una macchina a sé, ma **i listini si ripetono**: pochi «set» di bevande compaiono in più
quartieri, quindi un distributore di Central Street può vendere **esattamente** le stesse bevande di uno di Shujin. I cinque pin sono
dell'utente (`origine='utente'`) e il legame sembra voluto proprio per questo. La fonte inglese elenca le macchine una per una:
- set A = Second Maid, Manta, Earl Green (+ Ultimate Amazake dal 1/9)
- set B = Joylent, Mad Bull, Muscle Tea, Udagawa Water (+ Oh! Shiruko)
- set C = Nastea, 1UP, Starvicks (+ …)
- set D = Dr. Salt NEO, Arginade, Water of Rebirth

Il confronto pin per pin:
- **1527** (Central Street → `distributore-shujin-edificio`, set A): Central Street «sinistra» = set A → **coerente**.
- **1547** (Tornello della linea Ginza → `distributore-shujin-edificio`, set A): tornello «vicino a Yon-Germain» = set A → **coerente**.
- **1768** (Central Street → `distributore-shujin-cancello-2`, set B): Central Street «centro» = set B → **coerente**.
- **1769** (Central Street → `distributore-shujin-cancello-2`, set B): il terzo distributore di Central Street («destra») vende **set C +
  Creature**, non il B → **probabile errore** (certezza bassa: dipende da quale macchina rappresenta il pin).
- **1584** (Vicoli di Yongen-Jaya → `distributore-shujin-cortile`, set D: Dr. Salt NEO, Arginade, Acqua della rinascita): a Yongen-Jaya le
  fonti danno due macchine, «vicino al bagno pubblico» (Arginade, Acqua della rinascita, a **100 ¥** invece di 300) e «accanto al tabaccaio
  / vicino alla batting cage» (Nastea, 1UP, Starvicks). **Nessuna** delle due vende Dr. Salt NEO → **non coerente**. La più simile è quella
  del bagno pubblico, che nell'app esiste già come `distributore-yongen-bagno`.
Raccomandazione (L5 dubbio 7 / L7): nessuna modifica automatica ai pin dell'utente. 1769 e 1584 vanno nell'elenco «da approvare» con la
proposta: 1584 → `distributore-yongen-bagno`; 1769 → listino C + Creatura, che oggi nell'app non ha un negozio. La guida italiana non elenca
i distributori di Central Street (solo quello della Sala giochi) né quelli del tornello: il dato macchina per macchina c'è solo nella fonte
inglese.
Fonti:
- AGS distributori-automatici/, «Distributori con inventario condiviso»: listini di Shujin, Sottopasso, Sala giochi, Yongen (bagno, tabaccaio);
  «un totale di 30 distributori automatici»; «riforniti automaticamente ogni lunedì».
- https://samurai-gamers.com/persona-5/vending-machine-drinks-list/, sezioni «Aoyama-Itchome», «Shibuya», «Yongen-Jaya»: «Each of the vending
  machines dispenses a variety of unique drinks»; «Drinks restock every Monday».
Certezza: **alta** sulla regola dei listini ripetuti; **media** su 1527, 1547, 1768 e 1584; **bassa** su 1769.
Discordanze: per il set B la guida italiana dice «Punch non filtrato, Tè energetico» dove l'inglese dice «Mad Bull, Muscle Tea» (sono le rese
italiane). L'inglese aggiunge a ogni set le bevande in arrivo dal 1° settembre; la guida italiana le elenca solo per Akihabara.

## G-015 · L5/L9 · Clinica di Takemi: orari del negozio e di Tae
Chiesto da: (proattivo, dato già presente nell'app) · Stato: **chiusa**

**Risposta.** Tae Takemi è disponibile **solo di giorno, tutti i giorni** (anche con la pioggia; i Ranghi 6, 7.5 e 9 no con la pioggia), con
al massimo un evento di rango ogni tre giorni; in relazione romantica la si vede **solo di sera**. Per il negozio della clinica la fonte
inglese dà la stessa fascia, «After School (Daytime)»; la guida italiana dà inventario per rango e sconto del 50%, ma non un orario.
Fonti: AGS guida-rango-confidente-di-tae-takemi-morte/, «Disponibilità di Tae Takemi»: «solo di giorno» tutti i giorni;
https://samurai-gamers.com/persona-5/map-facilities/, «Yongen-Jaya > Backstreets», riga «Takemi Medical Clinic»: «After School (Daytime)».
Certezza: **alta**. Dato dell'app (`yongen-jaya/clinica-takemi`: «giorno», tutti i giorni): **coerente**.

## G-016a · L9 · Meteo nei 12 giorni in cui `giorno_calendario` e `giorno_percorso` divergono
Chiesto da: Analisi requisiti (L9 dubbio 1) · Stato: **chiusa (un giorno senza fonte)**

**Risposta.** Le due tabelle in realtà **non si contraddicono**: `giorno_calendario` dà il meteo in due tempi, «giorno/sera» (es.
«Pioggia/Sereno»), mentre `giorno_percorso` ne dà uno solo, quello della fascia di cui parla la guida. La guida italiana non ha una riga
«Meteo» né un'icona: il tempo compare solo come frase nel testo del giorno, e solo quando conta per la scelta. In **11 giorni su 12** la frase
della guida conferma **la parte giusta** del valore a due tempi del calendario:
| Data | Calendario | Percorso | Guida italiana (dove) | Esito |
|---|---|---|---|---|
| 05-24 | Nuvoloso | possibile pioggia | **non risulta** (sett. 7, sezione del giorno letta per intero) | aperto: nessuna fonte |
| 06-13 | Nuvoloso/Pioggia | pioggia | «Dato che piove…», nella parte della **sera** (sett. 10) | sera pioggia ✓ calendario |
| 06-16 | Nuvoloso/Pioggia | pioggia | «Dato che piove…», nella parte della **sera** (sett. 10) | sera pioggia ✓ calendario |
| 06-21 | Pioggia | pioggia | «Visto che piove…», di **sera** (sett. 11) | ✓ entrambe |
| 08-11 | Pioggia/Sereno | pioggia | «È un altro giorno di pioggia», in **apertura** (sett. 18) | giorno pioggia ✓ calendario |
| 08-16 | Pioggia/Sereno | pioggia | «Un altro giorno di pioggia.», in apertura (sett. 19) | giorno pioggia ✓ calendario |
| 08-18 | Pioggia/Sereno | pioggia | «Ancora pioggia oggi.», in apertura (sett. 19) | giorno pioggia ✓ calendario |
| 08-27 | Sereno/Pioggia | pioggia | «Sta piovendo…», nella parte della **sera** (sett. 20) | sera pioggia ✓ calendario |
| 11-16 | Pioggia/Nuvoloso | pioggia | «…notiamo che sta piovendo», nel **pomeriggio** (sett. 31) | giorno pioggia ✓ calendario |
| 12-03 | Neve/Pioggia | neve | «Sta anche nevicando…», in apertura (sett. 33) | giorno neve ✓ calendario |
| 12-10 | Nuvoloso/Pioggia | pioggia | «La sera dovrebbe piovere.» (sett. 33) | sera pioggia ✓ calendario |
| 01-20 | Pioggia/Neve | pioggia | «Oggi è una giornata piovosa…», in apertura (sett. 38) | giorno pioggia ✓ calendario |
Raccomandazione: nel «giorno» unico tenere il meteo **in due fasce (giorno, sera)** preso da `giorno_calendario`: è più ricco e mai smentito
dalla guida. Il valore di `giorno_percorso` è una semplificazione (la fascia citata dalla guida), non un dato diverso. Per **05-24** la guida
tace: soluzione prudente «Nuvoloso» (calendario) con «possibile pioggia» come nota, nell'elenco da approvare.
Fonti: AGS soluzione-settimana-7, -10, -11, -18, -19, -20, -31, -33, -38 (sezioni dei giorni elencati; citazioni nella tabella).
Certezza: **alta** sulle frasi della guida; **media** sull'interpretazione «giorno/sera» del formato a due valori del calendario (è coerente in
tutti gli 11 casi, ma l'origine di quella tabella non l'ho verificata).

---

## G-016b · L9 · Disponibilità di Kawakami e Yusuke; Confidenti senza luogo
Chiesto da: Analisi requisiti (L9 dubbio 4) · Stato: **parziale**

**Risposta.**
- **Kawakami (Temperanza)**: disponibile **solo la sera, venerdì e sabato**, anche con la pioggia. Ci si incontra **sempre nella mansarda del
  Leblanc** (Yongen-Jaya), dopo averla chiamata dal **telefono a pagamento del Leblanc** (5.000 ¥) o dopo un suo messaggio. Prima dello sblocco
  si può chiamarla in qualunque giorno; dopo il Rango 9 si può chiamarla in qualunque giorno per il Rango 10. → Il dato dell'app («Leblanc
  (telefono a pagamento) e, più avanti, appartamento/vari luoghi») va semplificato: il luogo è la mansarda del Leblanc; «vari luoghi» non
  risulta.
- **Yusuke (Imperatore)**: disponibile **solo di giorno, tutti i giorni**, anche con la pioggia; i Ranghi 4, 6 e 9 sono all'aperto e **non**
  si fanno con la pioggia. Luogo: **Sottopasso di Shibuya**; molti ranghi partono anche rispondendo a un suo messaggio. Rango 1 il 18 giugno;
  il Rango 6 richiede Perizia 4. → Il dato dell'app in `giorni_json` (un elenco di date fisse «18/06, 23/06…») è l'**itinerario consigliato
  della guida**, non la disponibilità: la disponibilità è «tutti i giorni, di giorno». L'app dice anche che il Rango 8 «richiede la pioggia»:
  **non risulta** nella guida letta (da verificare prima di tenerlo).
- **Confidenti senza luogo**: dai dati di oggi i candidati sono quelli che non si incontrano in un posto della città: **Igor** (Matto) e
  **Gemelle custodi** (Stanza di Velluto), **Morgana** (Mago, Leblanc/Metaverso), **Sae** (Giudizio, sala interrogatori). Per le Gemelle la
  guida dice che si avviano **dal 18 maggio**, appena si entra nella Stanza di Velluto **durante** l'infiltrazione nel Palazzo di Madarame: il
  dato dell'app «accessibile dopo il completamento del Palazzo di Madarame» è **sbagliato**. Che Igor, Morgana e Sae salgano solo con la
  trama (senza incontri da scegliere) è noto ma **non l'ho letto** in questo giro: da confermare. Analisi requisiti: mandami l'elenco esatto
  dei 4 e verifico ognuno.
Fonti:
- AGS guida-rango-confidente-di-kawakami-temperanza/, «Disponibilità», «Come sbloccare Kawakami»: «prima dovremo aver raggiunto il Rango 3 di Coraggio».
- AGS guida-rango-confidente-di-yusuke-imperatore/, «Disponibilità»: «vi aspetta nel Sottopasso di Shibuya, dove si diletta osservando la gente».
- AGS guida-rango-confidente-delle-gemelle-custodi-forza/, «Come funziona…»: «Possiamo avviare questo Confidente già dal 18 MAGGIO».
- AGS persona-5-royal-guida-confidenti/ (calendario generale): Yusuke di giorno dal lunedì alla domenica.
Certezza: **alta** su Kawakami, Yusuke e Gemelle; **media** sull'elenco dei Confidenti senza luogo.
Nota di vocabolario: la guida italiana mette le Gemelle sotto **Forza** (l'app: Strength ✓); Giustizia è Akechi.

## G-016d · L9 · I 4 Confidenti senza luogo (Igor, Gemelle, Sae, Morgana)
Chiesto da: Analisi requisiti, Analisi dati (L9 R9-02, dubbio 4) · Stato: **chiusa**

**Risposta.** Nessuno dei quattro ha un luogo della città dove «si va a fare il rango»: sono giusti **senza luogo**, ma ognuno per un
motivo diverso, che va scritto. Nel calendario della disponibilità della guida non compaiono in nessun giorno: la guida li mette fra quelli
che «avanzano automaticamente o tramite condizioni specifiche».
| Confidente | Come sale | Dove avviene | Motivo da scrivere nell'app |
|---|---|---|---|
| **Igor** (Matto) | solo con la trama, date fisse: R1 12/4, R2 20/4, R3 5/5, R4 1/6, R5 11/6, R6 27/6, R7 22/8, R8 31/8, R9 11/10, R10 24/12 | Stanza di Velluto, quasi sempre in sogno la notte (il R2 dentro il Palazzo di Kamoshida) | automatico, trama |
| **Morgana** (Mago) | solo con la trama, date fisse: R1 15/4, R2 22/4, R3 1/6, R4 20/6, R5 27/6, R6 25/7, R7 29/8, R8 17/9, R9 6/10, R10 23/12 | varia: Palazzo di Kamoshida (R1-R2), soffitta/stanza del Leblanc (R3, R8, R9, R10), scene serali | automatico, trama (il pin di Confidente su 152-1-0 è coerente col R1-R2) |
| **Sae Niijima** (Giudizio) | solo con la trama: R1 9/7, R2 24/7, R3 22/8, R4 13/9, R5 12/10, R6 28/10, R7–R10 20/11 | nelle scene dell'interrogatorio «nel presente»: nessun posto da visitare, nessuna fascia | automatico, trama |
| **Gemelle custodi** (Forza) | **consegnando una Persona specifica** per rango (menu «Controlla stato lavori forzati»), **senza consumare tempo**; dal 18/5, scadenza 24/12 | Stanza di Velluto (dai Palazzi o dai cancelli in città: uno vicino al **Negozio Softair a Central Street**) | a condizioni (fusioni), non a tempo |
Le Gemelle hanno anche **uscite facoltative** (dal 6/6, es. Big Bang Burger di Shibuya; poi 7/6, 15/6, 25/6, 26/7, 28/7, settembre, ottobre-novembre,
dicembre, 13/1 con Lavenza): fanno passare il tempo e danno carte abilità, ma **non fanno salire di rango**.
Fonti:
- AGS persona-5-royal-guida-confidenti/, «Note strategiche per usare il calendario»: «avanzano automaticamente o tramite condizioni specifiche».
- AGS guida-rango-confidente-igor-matto/, «Come funziona…»: «si sviluppa esclusivamente attraverso eventi della storia».
- AGS guida-rango-confidente-di-morgana-mago/, «Come funziona…»: «si sviluppa interamente in modo automatico».
- AGS guida-rango-confidente-di-sae-giudizio/, «Come funziona…»: «i ranghi aumentano in momenti chiave della storia».
- AGS guida-rango-confidente-delle-gemelle-custodi-forza/, «Come funziona…»: «ogni rango richiede la consegna di una Persona specifica»;
  «6 Giugno»: «ce n'è uno vicino al Negozio Softair a Central Street».
Certezza: **alta**. Discordanze: la pagina di Sae, nella sezione «Rango 7-10», dice «torneremo nella Stanza di Velluto», ma altrove dice che il 20/11
la Stanza di Velluto non è accessibile (probabile refuso). Dato dell'app delle Gemelle «dopo il completamento del Palazzo di Madarame»: sbagliato (G-016b).
→ Per R9-02: i quattro restano senza luogo, con motivo «automatico (trama)» per Igor, Morgana e Sae e «Stanza di Velluto, a condizioni» per le Gemelle.
Se si vuole un posto, l'unico reale nella città è il **cancello della Stanza di Velluto a Central Street**, ed è solo per le Gemelle.

## G-016c · L9 · Bonus degli esami sui punti dei Confidenti
Chiesto da: Analisi requisiti (L9 dubbio 6) · Stato: **chiusa**

**Risposta.** Dopo un esame andato bene si ottiene un **moltiplicatore sui punti Confidente** guadagnati nelle attività con **sei Confidenti**:
**Ryuji Sakamoto, Makoto Niijima, Haru Okumura, Sojiro Sakura, Sadayo Kawakami, Kasumi Yoshizawa**. Il moltiplicatore è massimo se si arriva
**primi**, ridotto se si è nei **primi dieci**, e resta attivo **fino alla pubblicazione dei risultati dell'esame successivo**. La guida non dà
il valore numerico. In più: **Fascino +3** se nei primi 10, **+2** se sopra la media, niente se sotto; con risultati eccellenti Sojiro regala
accessori (Cintura resistente, Specchio del damerino, Pendente del Leblanc, Intimo del capo). **Ann non è fra i sei**: prende punti invece dalle
**interrogazioni** (25/4, 20/6, 7/7, 11/1), insieme al Fascino.
Fonte: AGS interrogazioni-esami-risposte/, «Ricompense degli esami: bonus e vantaggi»: «riceveremo un moltiplicatore ai punti Confidente
ottenuti durante le attività insieme a loro».
Certezza: **alta** (elenco e regola); il valore del moltiplicatore non risulta.
**Aggiornamento (G-020):** il walkthrough con i dati estratti dal gioco (aqiu384) mostra il bonus anche su **Ann** (Amanti: +26/+18 dopo
il 7/19 contro +15/+10 prima) e dà i valori **×1,2** (primi 10) e **×1,5** (primo posto). La guida italiana nomina sei Confidenti senza Ann;
`docs/riferimenti/confidenti-punti.md` ne nomina sette con Ann. → **Discordanza**: i numeri del gioco danno ragione all'elenco con Ann
(certezza media, perché è una deduzione dai valori).

## G-017 · L6 · Date di avvio di Ohya, Kawakami, Gemelle; libri che sbloccano un ritrovo
Chiesto da: Analisi dati (L6) · Stato: **chiusa**

**Risposta.**
1. **Ohya (Diavolo)**: **Rango 1 il 5 luglio** (giorno consigliato). Il 18 giugno c'è il primo incontro di trama al Crossroads, che non dà
   ranghi (quel giorno si sblocca anche Shinjuku). Disponibile solo la sera, tutti i giorni; i Ranghi 4 e 10 non con la pioggia. → Il 18/6
   è l'**incontro**, il 5/7 l'**avvio**: i due dati dell'app non si contraddicono, ma il requisito del Rango 1 va scritto 5 luglio.
   **Kawakami (Temperanza)**: **3 giugno** = evento «Becky» a Central Street (nessun rango); **4 giugno** = ci dà il contatto; **Rango 1
   consigliato l'8 giugno**, telefonando dal Leblanc, con **Coraggio Rango 3**. Né «3-4» né «4» sono l'avvio: il 4/6 è la **data di sblocco**
   (da quando si può chiamare), l'8/6 il primo giorno consigliato. Discordanza interna della guida: la pagina degli esami mette «3 giugno –
   Rango 1» nel calendario delle risposte in classe.
   **Gemelle custodi (Forza)**: **dal 18 maggio** (Stanza di Velluto durante il Palazzo di Madarame), Rango 1 consigliato il 19 maggio
   (mostrare un Jack Frost con Mabufu); salire di rango non consuma tempo; scadenza 24 dicembre. «Subito dopo Madarame» non è scritto da
   nessuna parte → vale il **18 maggio**.
2. e 3. **Libri.** La guida scrive per ogni libro «Nuovo **punto di ritrovo**: …», cioè sblocca **un ritrovo** (un posto dove portare i
   Confidenti), non dice «il quartiere intero». Nel gioco il ritrovo coincide con l'unica zona visitabile di quel quartiere, per cui in
   pratica il libro apre quella destinazione della mappa:
   | Libro | Sblocca (testo della guida) | Dove si compra / da quando |
   |---|---|---|
   | Vague | Takenoko Street ad Harajuku | Libreria Taiheido (Shibuya), 1.800 ¥, dal 18/5 |
   | Luoghi della movida | Seaside Park (Odaiba) | Taiheido, 1.800 ¥, dal 1/6 |
   | Cieli notturni | Planetario di Ikebukuro | Taiheido, 1.800 ¥, dal 1/9 |
   | Pagine ammuffite | Jinbocho | Libreria Hinokuniya (Shinjuku), 1.800 ¥, dal 1/9 |
   | Shitamachi rinato | Tokyo Skytree | premio della richiesta «Un intruso a Yongen-Jaya» (non in vendita) |
   Regola utile: se il posto è già stato scoperto in un altro modo, il libro si completa da solo senza consumare tempo. **Vie alternative** (la
   stessa destinazione si apre anche in un altro modo): Asakusa-Oshiage con **Ann Rango 7** (G-009); Jinbocho con **Hifumi Rango 4** e
   Ikebukuro con l'**invito di Mishima del 28/7**, Harajuku con l'**invito di Mishima del 3/8**, Seaside Park con **Ann Rango 10**: questi
   ultimi solo da Samurai Gamers, che mescola P5 e P5R (certezza media); l'invito di Makoto per Ikebukuro e lo «sblocco il 1° settembre» **non
   risultano**: il 1/9 è solo la data in cui il libro va in vendita.
   → Per i dati: lo sblocco del quartiere dev'essere «libro X **oppure** altra via», mai la data di messa in vendita del libro (vale per
   Odaiba «1 giugno», G-008, e per Ikebukuro «1 settembre»).
Fonti:
- AGS guida-rango-confidente-di-ohya-diavolo/, «Rango 1»: «Giorno consigliato: 5 LUGLIO (Martedì 7/5)».
- AGS guida-rango-confidente-di-kawakami-temperanza/, «Come sbloccare Kawakami», «Rango 1».
- AGS guida-rango-confidente-delle-gemelle-custodi-forza/, «Rango 1» (citazione in G-016b).
- AGS libri/, «Tabella completa dei libri».
- https://samurai-gamers.com/persona-5/hangout-spots-list/ (vie alternative).
Certezza: **alta** sulle date e sui libri (guida italiana); **media** sulle vie alternative prese solo da Samurai Gamers.
Discordanze: Samurai Gamers fa partire Ohya il 25/6 («She first appears in a Shinjuku Crossroads Bar on June 25») e nella sua tabella
dice «After 6/22»: si contraddice da sola; vale la guida italiana. Per Ikebukuro dà il libro «Museum of Stars» (titolo di P5 originale).

## G-018 · L6 · Evento di sblocco di ogni quartiere (23 quartieri della città + Memento)
Chiesto da: Project manager (richiesta dell'utente: «i quartieri hanno sempre un evento sbloccante»), Analisi dati, Analisi requisiti · Stato: **chiusa (3 a certezza media)**

**Regola del gioco.** Ogni quartiere si apre con un **evento**, di uno di questi tipi: **iniziale** (aperto dal primo giorno), **data di trama**
(evento fisso della storia), **rango di un Confidente**, **lettura di un libro** (il libro si compra da una data o si ottiene da una Richiesta).
Più vie per lo stesso posto sono un «oppure» (si apre con la prima che accade). Il libro **non** si apre alla data di messa in vendita, ma
**quando si finisce di leggerlo**; se il posto è già stato scoperto in un altro modo, il libro si completa da solo senza consumare tempo.
Secondo la guida l'evento sblocca **un ritrovo** (la destinazione della mappa: «Nuovo punto di ritrovo: X»): per i quartieri con più ritrovi
(Kanda/Jinbocho, Asakusa/Skytree, Kichijoji/Jazz Club) gli eventi sono distinti e vanno sul ritrovo, e il quartiere è aperto quando è
aperto almeno uno dei suoi ritrovi.

Legenda delle condizioni (tipi già presenti nelle condizioni JSON): `data` · `confidente{rango}` · `lettura{libro}` · `richiesta` (premio di una
Richiesta, che dà il libro) · «oppure» = gruppo «almeno-una».

| # | Quartiere (chiave) | Evento di sblocco (condizione strutturata) | Dettagli dalla guida | Fonte | Certezza |
|---|---|---|---|---|---|
| 1 | Yongen-Jaya (`yongen-jaya`) | **iniziale** (9/4) | arrivo del protagonista | AGS soluzione-prologo/; Samurai «Default» | alta |
| 2 | Shibuya (`shibuya`) | **iniziale** (9/4) | — | AGS soluzione-prologo/, soluzione-settimana-1/; Samurai «Default» | alta |
| 3 | Shujin Academy / Aoyama-Itchome (`shujin-academy`) | **iniziale** (11/4) | primo giorno di scuola | AGS soluzione-settimana-1/, «11 APRILE»; Samurai «Default» | alta |
| 4 | Ogikubo (`ogikubo`) | `confidente{ryuji, 4}` | Rango 4 di Ryuji, consigliato 28/4: ritrovo «Ogikubo Ramen» | AGS guida-rango-confidente-di-ryuji-carro/, «Rango 4»: «sbloccherà il luogo d'incontro "Ogikubo Ramen"» | alta |
| 5 | Parco Inokashira (`inokashira-park`) | `confidente{ann, 3}` | Rango 3 di Ann, consigliato 21/5 | AGS guida-rango-confidente-di-ann-amanti/, «Rango 3»: «la destinazione "Parco Inokashira"» | alta |
| 6 | Harajuku (`harajuku`) | `lettura{vague}` | «Vague», Libreria Taiheido (Central Street), 1.800 ¥, in vendita da mer 18/5 → Takenoko Street | AGS libri/: «Nuovo punto di ritrovo: Takenoko Street ad Harajuku» | alta |
| 7 | Kichijoji (`kichijoji`) | `data{06-05}` | dopo la confessione di Madarame Ryuji propone le freccette; si sblocca raggiungendo la linea Inogami nel Sottopasso (solo Royal) | AGS soluzione-settimana-8/, «5 GIUGNO»: «e sbloccherete la località Kichijoji» | alta |
| 7b | ↳ Jazz Club (ritrovo di Kichijoji) | `confidente{akechi, 4}` | Rango 4 di Akechi | AGS guida-rango-confidente-di-goro-akechi-giustizia/, «Rango 4»: «sblocca il Jazz club di Kichijoji come luogo di ritrovo» | alta |
| 8 | Suidobashi (`suidobashi`) | `data{06-09}` | gita all'emittente TV (Dome Town) | AGS soluzione-settimana-9/, «9 GIUGNO»: «un nuovo luogo di ritrovo: Suidobashi (Dome Town)» | alta |
| 9 | Odaiba / Seaside Park (`odaiba`) | `lettura{luoghi-della-movida}` **oppure** `confidente{ann, 10}` — **deciso dall'utente** | Taiheido, 1.800 ¥, in vendita da mer 1/6; Ann R10 da Samurai Gamers | AGS libri/: «Nuovo punto di ritrovo: Seaside Park»; Samurai «Lovers Rank 10» | alta (decisione dell'utente) |
| 10 | Shinjuku (`shinjuku`) | `data{06-18}` | appuntamento con Ohya al Crossroads, con Ryuji | AGS soluzione-settimana-10/, «18 GIUGNO»: «sbloccare un nuovo punto di ritrovo: Shinjuku» | alta |
| 11 | Kanda (`kanda-jinbocho`, ritrovo chiesa) | `data{06-28}` | messaggio di gruppo sulla giocatrice di shogi (Hifumi) | AGS soluzione-settimana-12/, «28 GIUGNO»: «sbloccheremo Kanda come nuova destinazione» | alta |
| 11b | ↳ Jinbocho (secondo ritrovo dello stesso quartiere) | `confidente{hifumi, 4}` **oppure** `lettura{pagine-ammuffite}` | Rango 4 di Hifumi (consigliato 24/9); il libro si compra alla Libreria Hinokuniya (Shinjuku), 1.800 ¥, da gio 1/9 | AGS guida-rango-confidente-di-hifumi-stella/, «Rango 4»: «sbloccheremo l'area Jinbocho»; AGS libri/ | alta |
| 12 | Ueno (`ueno`) | `confidente{yusuke, 3}` | Rango 3 di Yusuke, consigliato 30/6 (mostra «Desiderio») | AGS guida-rango-confidente-di-yusuke-imperatore/, «Rango 3»: «un nuovo punto di ritrovo: Ueno» | alta |
| 13 | Asakusa (`asakusa`, ritrovo Asakusa-Oshiage) | `confidente{ann, 7}` — **deciso dall'utente** | Rango 7 di Ann, consigliato 8/7, risposta «Ti ammira» | AGS guida-rango-confidente-di-ann-amanti/, «Rango 7»: «sbloccherà il punto di ritrovo Asakusa-Osiage» | alta |
| 13b | ↳ Tokyo Skytree (secondo ritrovo di Asakusa) | `lettura{shitamachi-rinato}` (libro da `richiesta{un-intruso-a-yongen-jaya}`) | non in vendita: premio della Richiesta «Un intruso a Yongen-Jaya» | AGS libri/: «Nuovo punto di ritrovo: Tokyo Skytree» | alta |
| 14 | Shinagawa (`shinagawa`) | `lettura{un-acquario-al-giorno}` | Taiheido, 2.000 ¥, in vendita da dom 17/7 | AGS libri/: «Nuovo punto di ritrovo: Shinagawa» | alta |
| 15 | Ichigaya (`ichigaya`) | `lettura{vedetta-lacustre}` | Taiheido, 1.800 ¥, in vendita da dom 17/7 (la guida lo finisce il 24/9) | AGS libri/; AGS soluzione-settimana-23/, «24 SETTEMBRE»: «La fine di questo libro sbloccherà Ichigaya» | alta |
| 16 | Tsukishima (`tsukishima`) | `confidente{ryuji, 7}` | Rango 7 di Ryuji: messaggio serale (consigliato 25/5), accettare di andare subito; ritrovo «Tsukishima Monja» | AGS guida-rango-confidente-di-ryuji-carro/, «Rango 7»: «un nuovo luogo di ritrovo: il "Tsukishima Monja"» | alta |
| 17 | Akihabara (`akihabara`) | `data{08-31}` (= `confidente{futaba, 1}`) | messaggio di Futaba, poi Rango 1 dell'Eremita | AGS soluzione-settimana-20/, «31 AGOSTO» e guida di Futaba, «Rango 1»: «Questo sbloccherà la posizione di Akihabara» | alta |
| 18 | Ikebukuro (`ikebukuro`, Planetario) | `lettura{cieli-notturni}` | Taiheido, 1.800 ¥, in vendita da gio 1/9 | AGS libri/: «Nuovo punto di ritrovo: Planetario di Ikebukuro» | alta |
| 19 | Santuario Meiji (`meiji-shrine`) | `lettura{santuari-di-tokyo}` | Taiheido, 1.800 ¥, in vendita da gio 1/9 (la guida lo legge il 13/10) | AGS libri/; AGS soluzione-settimana-26/, «13 OTTOBRE»: «rivelerà la posizione del Santuario Meiji» | alta |
| 20 | Roppongi (`roppongi`) | ~~`data{09-19}`~~ → **`data{09-15}`** (corretto in G-031: prima visita alla sede Okumura Foods, AGS sett. 22) | si apre con lo sblocco del Palazzo di Okumura («Spaceport of Greed») | https://samurai-gamers.com/persona-5/hangout-spots-list/, «Story»: «Unlock Spaceport of Greed Palace 9/19» | **media** (la guida italiana, sett. 22–24 lette, non lo nomina) |
| 21 | Nakano (`nakano`) | `lettura{esplorando-nakano}` | Taiheido, 2.000 ¥, in vendita da sab 1/10 → «Zona complesso commerciale, Nakano» | AGS libri/: «Nuovo punto di ritrovo: Zona complesso commerciale, Nakano» | alta |
| 22 | Maihama (`maihama`, Destinyland) | `data{10-11}` **oppure** `lettura{parchi-divertimento}` (libro da `richiesta{non-siamo-i-tuoi-schiavi}`) | il libro non è in vendita: premio della Richiesta «Non siamo i tuoi schiavi»; il 13/10 la guida lo legge senza consumare tempo «perché siamo già stati» a Destinyland, il che conferma una visita precedente | AGS libri/: «Nuovo punto di ritrovo: Parco divertimenti Maihama»; Samurai «Story»: «10/11» | **media** per la data (solo Samurai Gamers), alta per il libro |
| 23 | Chinatown (`yokohama-chinatown`) | `lettura{dolci-cinesi}` (libro da `richiesta{un-part-time-infernale}`) | non in vendita: premio della Richiesta «Un part-time infernale» (Ombra di Odo, rispondere «Finalmente l'hai capito»); la guida lo legge il 12/10 | AGS libri/: «Nuovo punto di ritrovo: Chinatown»; AGS soluzione-settimana-26/, «12 OTTOBRE»: «rivelerà Chinatown sulla nostra mappa» | alta |
| — | Entrata dei Memento (`mementos`) | **data di trama**: la prima discesa nei Memento (non un ritrovo) | da verificare in un giro dedicato se serve la data | — | non cercata |

**Vie che NON sono sblocchi** (oggi scritte nell'app come «oppure»): gli **inviti dei Confidenti** (Ryuji per Ichigaya, Mishima per Ikebukuro e
Harajuku, Ann per il Santuario Meiji, Akechi per Shinagawa, Futaba per Nakano) li riporta **solo** Samurai Gamers come alternativa al libro,
in parte da P5 originale; la guida italiana non li descrive mai come sblocco (per Akechi del 28/7 c'è l'invito all'acquario, ma la guida non
dice che apra il ritrovo). Il Seaside Park col Rango 10 di Ann lo dice solo Samurai Gamers (il testo del Rango 10 sulla guida non lo nomina):
**l'utente ha deciso di tenerlo** come via alternativa (vedi sotto).
→ Prudente per gli inviti: **non** metterli nelle condizioni (o metterli come via alternativa marcata «da confermare» nell'elenco da approvare).

**Decisioni dell'utente** (riportate dal PM il 2026-10-20; valgono sulle fonti):
- **Odaiba**: si sblocca al **completamento della lettura di «Luoghi della movida» OPPURE quando Ann raggiunge il Rango 10**; le due condizioni
  sono alternative; il 1/6 è solo la messa in vendita del libro.
- **Asakusa**: **Ann al Rango 7**.
- **Clinica di Takemi** (G-006): **16/04** è la prima data utile del **negozio di farmaci**; **18/04** è la data in cui **Tae si sblocca come
  Confidente**.

**«Oppure» da portare all'utente** (vie alternative che oggi l'app scrive, o che cita la fonte inglese, ma che la guida italiana **non** dà come
sblocco; regola proposta: fuori dalle condizioni finché l'utente non decide):
**Decisione dell'utente su O-1…O-7** (dal PM, 2026-10-20): gli inviti dei Confidenti sono **eventi del diario che sbloccano luoghi e aree**, quindi
**restano come sblocchi alternativi** («oppure») — **deciso dall'utente**. Resta da verificare sulle fonti data e luogo di ogni invito (in coda,
dopo G-022). O-8…O-10 restano come scritti sotto.
| # | Quartiere | Via alternativa in dubbio | Chi la riporta | Cosa dice la guida italiana |
|---|---|---|---|---|
| O-1 | Harajuku | invito di **Mishima del 3/8** | app oggi; Samurai Gamers «accept Mishima's invitation on 8/3» | settimana 17: nessun invito di Mishima nelle parti lette (il 3/8 è giorno di Palazzo) |
| O-2 | Ikebukuro | invito di **Mishima del 28/7** | Samurai Gamers | settimana 16: il 28/7 solo Akechi e Kasumi (letto in sintesi) |
| O-3 | Ikebukuro | invito di **Makoto del 30/7** | app oggi | non risulta in nessuna fonte |
| O-4 | Santuario Meiji | invito di **Ann del 5/8** | app oggi; Samurai Gamers | settimana 17: il 5/8 solo Tae e Yusuke |
| O-5 | Shinagawa | invito di **Akechi del 28-29/7** (acquario) | app oggi | settimana 16: l'invito c'è, ma la guida non dice che apra il ritrovo |
| O-6 | Nakano | invito di **Futaba del 9/10** | app oggi | settimana 25: nessun invito verso Nakano (parte dall'8/10 non letta) |
| O-7 | Ichigaya | invito di **Ryuji del 3/7** (l'app dice 6/7) | app oggi; Samurai Gamers «7/3» | settimana 12: il 2/7 Ryuji propone un piano per il giorno dopo, la guida fa rifiutare e non nomina Ichigaya |
| O-8 | Jinbocho | **libro «Pagine ammuffite»** in alternativa a Hifumi R4 | guida italiana (libri/) | **è una via vera** della guida: la elenco solo perché oggi l'app dice solo Hifumi R4 |
| O-9 | Maihama | **data 11/10** in alternativa al libro «Parchi divertimento» | app oggi; Samurai Gamers «10/11» | la guida il 13/10 dice «siamo già stati» a Destinyland (indizio di una visita prima), data non scritta |
| O-10 | Kanda | **Yusuke Rango 5** (oggi nell'app al posto della data) | app oggi; Samurai Gamers «Kanda — Rank 5» | la guida apre Kanda il 28/6 col messaggio di gruppo; il Rango 5 porta alla chiesa già aperta |

**Differenze con i dati di oggi** (`quartiere.sblocco` / `sblocco_data`, elenco per Analisi dati e BE, PM in copia):
- `kanda-jinbocho`: oggi «Kanda: Yusuke Rango 5; Jinbocho: Hifumi Rango 4» → Kanda è la **data 28/6** (il Rango 5 di Yusuke porta alla chiesa,
  ma la chiesa è già aperta); Jinbocho è Hifumi R4 **oppure** il libro «Pagine ammuffite».
- `harajuku`: prezzo di «Vague» 700 ¥ → **1.800 ¥**; invito di Mishima del 3/8: non risulta nella guida.
- `shinagawa`: invito di Akechi del 28-29/7: non risulta come sblocco.
- `nakano`: invito di Futaba del 9/10: non risulta.
- `yokohama-chinatown`: titolo italiano trovato, **«Dolci cinesi»**, premio della Richiesta «Un part-time infernale».
- `meiji-shrine`: invito di Ann del 5/8: non risulta.
- `ichigaya`: invito di Ryuji (6/7 o 3/7): solo Samurai Gamers (7/3); la guida italiana il 2/7 fa rifiutare il piano di Ryuji e non nomina Ichigaya.
- `roppongi`: «circa 19 settembre» → `data{09-19}` (certezza media).
- `odaiba`: 06-01 e «Ann Rango 10» → **lettura del libro oppure Ann R10** (deciso dall'utente; 06-01 è la messa in vendita, non uno sblocco).
- `ikebukuro`: 09-01 e «invito di Makoto del 30/7» → **lettura del libro** (09-01 è la messa in vendita; l'invito non risulta).
- `suidobashi`: 06-10 → **06-09**.
- `maihama`: 10-11 → resta, **oppure** il libro «Parchi divertimento».
- `akihabara` 08-31, `shinjuku` 06-18, `kichijoji` 06-05, `ogikubo`, `inokashira-park`, `ueno`, `tsukishima`, `asakusa`: **coerenti**.
Fonti generali: AGS libri/, «Tabella completa dei libri»; pagine dei Confidenti e soluzioni settimanali citate in tabella; Samurai Gamers
hangout-spots-list/ (sezioni «Default», «Story», «Confidants», «Books»).
Certezza complessiva: **alta** per 20 quartieri su 23; **media** per Roppongi e per la data di Maihama (solo fonte inglese).
Lettura parziale dichiarata: alcune settimane (3–7, 11, 13–19, dalla 27 in poi) non sono state lette: un invito o un evento che anticipi
uno sblocco in quelle settimane non si può escludere, ma nessuna fonte letta ne cita.

## G-019 · L8 · Debolezze e resistenze delle Ombre: Battaglia (guida) contro compendio contro dati del gioco
Chiesto da: Project manager (L8, R8-08, dubbio 2) · Stato: **chiusa**

**Metodo.** Ho ricostruito in sola lettura sulla copia di produzione l'elenco completo delle differenze, con la stessa regola di abbinamento
maschera → Persona di `server/services/maschere.ts`. I numeri tornano con `lotti/L8/dati.md`: **37 Ombre** della Battaglia diverse dal
compendio (**9** con debolezze diverse, **31** con resistenze diverse) e **45 voci** dei dungeon con debolezze proprie diverse. Fonte di
verifica: i **dati estratti dal gioco Royal** di aqiu384/megaten-fusion-tool (già fonte di verifica incrociata nel NOTICE), che distinguono
l'**Ombra nemica** (`roy-enemy-data.json`, nome inglese dell'Ombra, area, affinità) dalla **Persona** (`roy-demon-data.json`). Il compendio
dell'app viene da chinhodado: le due fonti di dati sono indipendenti. La guida italiana non ha una scheda per Ombra oltre a quella usata dalla
Battaglia, quindi non c'è una terza lettura in italiano. Copie di lavoro e script nel mio scratchpad (`deb-out.json`, `verifica-out.json`).
Legenda: deb = debole · — = neutro · res = resiste · ann = annulla · resp = respinge · ass = assorbe.

**Esito in breve.**
- Il **compendio coincide con i dati del gioco della Persona in tutti i casi tranne uno** (Potestà/Power, Armi da fuoco).
- In **3 Ombre** l'Ombra nemica ha affinità **diverse dalla sua Persona**, e lì la **guida ha ragione**: per queste la regola «per le Ombre con
  Persona vince il compendio» (dubbio 2 di L8) darebbe un dato **sbagliato** per la battaglia. → Serve una via per le affinità proprie
  dell'Ombra quando il gioco le differenzia (solo in questi casi).
- In tutti gli altri casi la **guida sbaglia o è imprecisa** (scrive «resiste» dove il gioco annulla/respinge, inverte elementi, aggiunge
  resistenze inesistenti, oppure omette voci).

### A. Ombre con affinità proprie diverse dalla Persona (la guida è giusta per l'Ombra)
| Ombra (guida) | Persona | Dove | Elemento | Battaglia | Compendio | Gioco: Ombra | Gioco: Persona |
|---|---|---|---|---|---|---|---|
| Vendicatore sconfitto | Take-Minakata | Kaneshiro; Memento (Kaitul) | Tuono | resp | res | **resp** («Defeated Avenger», Bank) | res |
| Sole oscuro | Mithras | Okumura; Memento (Adyeshach) | Nucleare | resp | ann | **resp** («Dark Sun», Spaceport) | ann |
| Orsacchiotto assassino | Bugs | Maruki | Fuoco | deb | — | **deb** («Killer Teddy Bear», Laboratory) | — |
| Orsacchiotto assassino | Bugs | Maruki | Psicocinesi | — | res | **—** | res |
| Orsacchiotto assassino | Bugs | Maruki | Maledizione | — | ann | **—** | ann |
Valore giusto: per l'**Ombra** quello della Battaglia; per la **Persona** (compendio, fusione) quello del compendio. Entrambi corretti nel loro ambito.

### B. Compendio da verificare (la guida e i dati del gioco concordano contro il compendio)
| Ombra | Persona | Dove | Elemento | Battaglia | Compendio | Gioco: Ombra | Gioco: Persona |
|---|---|---|---|---|---|---|---|
| Guerriero divino / Potestà | Power | Niijima (Battaglia e voce del Casinò); Memento (Sheriruth) | Armi da fuoco | — | **deb** | — («Divine Warrior», Casino) | — |
Valore giusto secondo due fonti su tre: **neutro**. Certezza **media** (il compendio viene da un'altra estrazione dei dati: va guardato dall'utente
o con una terza fonte prima di cambiarlo; il compendio non è oggetto di L8).
**Correzione (stesso giorno)**: la terza fonte c'è già nel repository. `docs/riferimenti/dataset-fonti.md` registra la verifica incrociata del seed con
la Megami Tensei Wiki: la **Persona** Power è debole all'Arma da fuoco e «è l'Ombra a non averla» (aqiu384 toglie la debolezza alla Persona per
errore). Quindi il caso B **non è un errore del compendio**: è un **quarto caso della tabella A**. Valore giusto: per l'**Ombra** «Guerriero divino /
Potestà» **neutro** all'Arma da fuoco (come la Battaglia); per la **Persona** Power **debole** (come il compendio). Niente da portare all'utente.

### C. La guida sbaglia (vale il compendio, confermato dai dati del gioco)
| Ombra (guida) | Persona | Dove | Differenza (Battaglia → valore giusto) |
|---|---|---|---|
| Maestra degli scherzi | High Pixie | Memento (Kaitul) | **elementi invertiti**: Armi da fuoco res → **deb**; Tuono deb → **res**; Vento deb → **res**; Nucleare res → **deb** |
| Spiritello degli alberi | Kodama | Memento (Aiyatsbus) | **invertiti**: Fuoco res → **deb**; Ghiaccio deb → **res** |
| Reggente | Regent | Madarame; Memento (Aiyatsbus, Chemdah) | Psicocinesi deb → **—**; Fuoco, Ghiaccio, Tuono, Vento, Sacro, Maledizione res → **—** (resta solo res a Fisico e Armi da fuoco) |
| Norna (stanza delle slot 2) | Norn | Niijima | Ghiaccio e Nucleare deb → **—** (Norn non ha debolezze; la voce del piano terra la dà giusta) |
| Ninfa dell'acqua | Apsaras | Memento (Chemdah) | Fuoco — → **deb** (debolezza omessa) |
| Teschio dei sogni | Loa | Maruki | Psicocinesi — → **deb** (debolezza omessa) |
| Vecchietto della foglia | Koropokkuru | Madarame; Memento (Chemdah) | Armi da fuoco res → **—** |
| Fantasma fuso | Legion | Memento (Adyeshach) | Armi da fuoco res → **—** |
| Ladro delle tavole / Anzu | Anzu | Futaba (voce) | Tuono resp → **res** |
| Anubis (voce di Futaba) | Anubis | Futaba | Armi da fuoco ann → **res** |
| Donna dell'albero funesto | Hua Po | Madarame; Memento (Chemdah) | Fuoco res → **resp** |
| Portatore di disgrazie | Shiki-Ouji | Madarame | Fisico, Armi da fuoco, Sacro res → **ann** |
| Babbuino cantilenante | Thoth | Futaba | Nucleare, Sacro res → **ann** |
| Donna serpente strisciante | Lamia | Futaba | Maledizione res → **ann** |
| Giudice delle anime | Anubis | Futaba | Sacro, Maledizione res → **ann** |
| Ladro delle tavole | Anzu | Futaba | Vento res → **resp** |
| Signora del passaggio | Isis | Futaba | Sacro res → **ann** |
| Uomo serpente | Naga | Futaba | Tuono res → **ann** |
| Uomogufo minaccioso | Andras | Futaba | Maledizione res → **ann** |
| Generale necromante | Nebiros | Maruki | Psicocinesi res → **ann**; Maledizione resp → **res** |
| Malvagio drago vorace | Fafnir | Maruki | Fisico, Armi da fuoco ann → **resp** |
| Skadi (Pavida signora dell'ombra) | Skadi | Niijima | Ghiaccio res → **resp**; Maledizione res → **ann** |
Nota: la guida usa spesso «resiste» senza grado dove il gioco annulla o respinge (la Battaglia legge «senza suffisso» come «dimezza»).

### D. La guida omette una resistenza (nessun conflitto: vale il compendio, confermato dai dati del gioco)
- **Battaglia e Memento**: Demone Acque Furibondo/Sui-Ki (Armi da fuoco res), Agile re delle scimmie/Hanuman (Armi da fuoco res), Bestia
  inespressiva/Unicorn (Sacro ann), Fabbro amareggiato/Ippon-Datara (Armi da fuoco res), Fantasma di cane/Inugami (Armi da fuoco ann), Giudice
  delle anime/Anubis nei Memento (Psicocinesi res).
- **Voci dei Palazzi che riportano solo le debolezze** (la guida non elenca le resistenze, quindi non c'è contrasto): Collana della Regina;
  Anzu (Vento resp); al Casinò di Niijima Ganesha, Jatayu, Kikuri-Hime, Kushinada, Norna, Orlov, Potestà, Regina Mab, Rangda, Skadi (anche
  nell'area riservata allo staff), Unicorno, Valchiria; a Iweleth Melchizedek, Moloch, Lilith, Chernobog, Thor, Yamata-no-Orochi, Diamante
  Hope, Abaddon, Teschio di Cristallo. In tutte, le debolezze scritte dalla guida coincidono con il compendio e con il gioco.
- La voce «Skadi x2» (area riservata allo staff, parte II) non si abbina a una Persona per il nome: è Skadi (stesso Casinò).

**Raccomandazione per L8.**
1. Per le Ombre con Persona leggere dal compendio **salvo i 4 casi** (i 3 della tabella A più Power del caso B, vedi la correzione), dove
   l'Ombra ha affinità sue (da tenere sull'Ombra, marcate «diverse dalla Persona nel gioco»).
2. Il caso B (Power, Armi da fuoco): compendio giusto per la Persona, Battaglia giusta per l'Ombra; il compendio non si tocca.
3. Le tabelle C e D si risolvono applicando il compendio: sono errori o lacune della guida, non dati da preservare.
Fonti:
- AGS, pagine dei Palazzi e dei Dedali (copiate in `dati_guida.battaglia.ombre` e nelle voci dei dungeon; URL nel campo `fonte` di ogni Ombra).
- https://github.com/aqiu384/megaten-fusion-tool, `src/app/p5/data/roy-enemy-data.json` (Ombre nemiche di Royal: nome, area, «resists») e
  `roy-demon-data.json` (Persona); codici da `comp-config.json` → «resistCodes» (w/W/x/z deb, -/a/A neutro, s/S res, n/N/_ ann, r/R resp, d/D ass).
Certezza: **alta** per A, C e D (dati estratti dal gioco, concordi con il compendio, che è un'altra estrazione); **media** per B.

## G-020 · L9/L10 · Regole dei punti legame dei Confidenti
Chiesto da: Project manager; Analisi requisiti (R9-07b, R10-11c..g: punti in ordine cronologico, eccedenza verso il rango successivo) · Stato: **parziale (2 regole senza fonte esplicita)**

**Fonti.** Guida italiana (pagina generale dei Confidenti, regali, esami, pagine dei singoli Confidenti); **walkthrough con i dati estratti dal
gioco** di aqiu384 (https://aqiu384.github.io/megaten-database/p5r/ace-walkthrough.html), che per ogni evento scrive i punti di ogni scelta e la
notazione «(x/y to rank up)» (x = punti presi nell'evento di quel rango, y = punti che servono per il successivo); il riferimento del repository
`docs/riferimenti/confidenti-punti.md` (soglie da guida Steam + walkthrough, 121/122 celle concordi). La guida Steam ha risposto HTTP 429 e non
è stata riletta in questo giro.

**1. Valore di una risposta** (deduzione dai valori del walkthrough, coerente col riferimento del repository): 1 nota = **5**, 2 = **10**,
3 = **15** punti di base; esistono risposte da **0** (nessuna nota). Le note mostrate seguono il valore **finale**, non la base (+7 appare come ♪♪).
La guida italiana chiama le note «1/2/3 Punti». — Certezza media.

**2. Moltiplicatori** (si moltiplicano fra loro):
- **Persona dello stesso Arcano: ×1,5**, arrotondato per difetto (5→7, 10→15, 15→22). Basta averla **nell'elenco** («non necessariamente
  equipaggiata», pagina generale della guida), anche se alcune pagine dei singoli Confidenti scrivono «in equipaggiamento» (contraddizione interna
  della guida). Il livello non risulta contare. Per Kasumi R3 la guida avverte che **senza** la Persona Fede l'evento può non partire.
- **Esami: ×1,2** (primi 10) e **×1,5** (primo posto), dalla pubblicazione dei risultati fino a quella dell'esame successivo; vale per **Ryuji, Ann,
  Makoto, Haru, Sojiro, Kawakami, Kasumi** secondo i numeri del gioco. La guida italiana omette Ann: vedi G-016c (discordanza).
- **Invito accettato subito (SMS): ×1,2** — riportato dal riferimento del repository; nel walkthrough gli inviti danno punti tramite le scelte, il
  ×1,2 non l'ho potuto verificare in questo giro (certezza bassa).
**3. Regali e uscite.** Regalo gradito: **+75 con la Persona dell'Arcano** nel walkthrough (Castella a Sojiro), quindi **50 di base** (deduzione).
Si regala **solo** in un ritrovo avviato da noi che **non** porta a un salto di rango (la guida: «solo durante un evento di ritrovo da noi avviato
che non porta a un aumento di Rango»); al rango massimo il suggerimento del regalo appare sempre. Uscita senza salto di rango: **+7** con la
Persona (Sojiro, Ryuji), +15 per Kawakami e Chihaya. Altre fonti minori (guida): freccette/biliardo «1 Punto», cartolina «1 Punto».
Discordanza: Samurai Gamers dice che passare il tempo non basta e servono regali — contraddice tutte le altre fonti, si scarta.

**4. Punti in eccesso dopo un salto di rango** (domanda (c)).
- Nessuna fonte lo scrive esplicitamente.
- I **numeri del walkthrough indicano che l'eccedenza si conserva**: Ann al Rango 4 prende 103 punti con una soglia di 20 per il 5; il Rango 5
  ha soglia 35 e il Rango 6 arriva dopo un solo ritrovo da +15, cosa possibile solo se i punti in più sono stati portati avanti. I punti presi
  **durante l'evento di salto** (scelte e telefonata finale) contano per il rango successivo.
- **Discordanza**: `docs/riferimenti/confidenti-punti.md` scrive «l'eccedenza non si riporta». La regola chiesta dall'utente (punti in ordine
  cronologico, quelli dopo un salto verso il rango successivo) è **coerente con i numeri del gioco**.
- Certezza: **media-bassa** (deduzione da una sequenza; da far confermare).
**5. Soglia raggiunta: si accumula ancora? Il salto alla visita dopo?** (domanda (d)). **Non risulta** in nessuna fonte. Indizi: il suggerimento
del regalo compare solo se la soglia non è ancora raggiunta; Ryuji e Akechi mandano un messaggio la sera quando l'evento è pronto. Il salto ha
spesso requisiti propri oltre ai punti (data, meteo, dote, richiesta dei Memento), già nei 177 requisiti dell'app. — Prudente: trattare la soglia
come «evento pronto», con i punti successivi conservati (coerente col punto 4), finché l'utente non decide.

**6. Soglie per rango** (domanda (b)). La tabella `confidente_rango` dell'app (= `docs/riferimenti/confidenti-punti.md` §3) **coincide** con il
walkthrough sui casi controllati: Ryuji 20/30/20/30/45/45/60/60, Ann 35/25/20/35/45/30/67/35. La **discordanza aperta Akechi 6→7 è risolta: 55**
(«Rank 6 … (88/55 to rank up)»); il 7→8 vale 0. Nessun Confidente ha una soglia per il **9→10**: il Rango 10 arriva all'evento successivo (scelta
amore/amicizia dal 9 per le Confidenti romanzabili); il Rango «11» dei membri del gruppo richiede il 13/1.

**7. Ranghi non a punti, per Confidente** (domanda (a)); fonte: walkthrough e guida, coerenti con i requisiti dell'app.
| Confidente | Ranghi a evento / trama / altra condizione (gli altri ranghi sono a punti) |
|---|---|
| Igor, Morgana, Sae | **tutti automatici** con la trama (G-016d) |
| Gemelle custodi | **tutti a fusione** (una Persona per rango), senza tempo (G-016d) |
| Mishima | R1–R2 automatici; dal R3 **richieste dei Memento completate**: R3=1, R4=2, R5=3, R6=4, R7=5, R8=7, R9=8, R10=10 |
| Yoshida | **nessuna soglia**: ogni discorso è un rango; sblocco dopo 2 turni al Beef Bowl (Ore no Beko); i ranghi cadono anche in giorni diversi dalla domenica (la guida italiana dice «solo la domenica sera»: discordanza) |
| Akechi | R1 automatico (10/6); R3 Fascino 3 + Conoscenza 3; R6 dal 28/8; R7 dopo la lettera di sfida del Casinò + Conoscenza 4; R8 dopo il duello; **R9 e R10 automatici** nel Palazzo di Shido (3/12); R5 e R7→8 senza punti |
| Maruki | R1–R2 il 13/5; niente oltre il R5 prima del 20/9; R9 entro il 17/11; **R10 automatico** il 18/11 |
| Kasumi | R1 il 30/5; R5 entro il 22/12; **R6 dal 13/1** (bloccata prima); Persona Fede necessaria al R3 |
| Ryuji, Ann | R1 automatico (12/4, 15/4); Ann R2 Gentilezza 2; R2 e altri dal 6/5 dove indicato |
| Makoto | R1 dopo il Palazzo della banca + Conoscenza 3; R6 Fascino 5 |
| Haru | R4 Perizia 5 |
| Yusuke | R6 Perizia 4 |
| Futaba | R1 il 31/8; R2 Gentilezza 4; R8 richiesta dei Memento |
| Sojiro | R3 dopo aver preparato il caffè una volta; R5 dal 22/8; R7 Gentilezza 5; R9 richiesta dei Memento |
| Takemi | R2 Coraggio 2; R7 (evento 7.5) Fascino 4; R8 richiesta dei Memento |
| Kawakami | R1 Coraggio 3; R9 richiesta dei Memento |
| Ohya, Hifumi, Iwai, Chihaya, Shinya | R8 (Shinya R9) **richiesta dei Memento**; R1: Hifumi Fascino 3, Iwai Coraggio 4, Chihaya dopo una richiesta, Shinya dopo la trama con Futaba; R7 (evento 7.5): Iwai Coraggio 5, Hifumi Conoscenza 5 |
| Tutti | **R1 e R1→R2 non chiedono punti**; un «0» nella tabella delle soglie = rango a evento/condizione |
Fonti: walkthrough aqiu384 (sezioni per data, es. «Chariot Rank 2» del 4/19: «I'm counting on you. +15 ♪♪♪»; 7/19: «School-related Confidant
Bonus x1.2 unlocked»; 10/24: «… x1.5 unlocked»); AGS persona-5-royal-guida-confidenti/ («avere in elenco (non necessariamente equipaggiata)
una Persona dell'Arcano»); AGS guida-regali-confidenti/ (frase citata al punto 3); AGS interrogazioni-esami-risposte/; AGS pagine di Akechi
(«I Ranghi 9 e 10 vengono attivati automaticamente durante il Palazzo di Shido»), Kasumi, Maruki, Ryuji.
Certezza: **alta** sui ranghi a evento/condizione e sulle soglie; **media** su valori delle note e moltiplicatori; **media-bassa** sull'eccedenza;
**non risulta** sull'accumulo a soglia raggiunta.
**Da correggere nel riferimento del repository** (`docs/riferimenti/confidenti-punti.md`, per chi lo aggiorna): Akechi 6→7 = 55 confermato;
eccedenza «non si riporta» smentita dai numeri; Ann nell'elenco degli esami confermata dai numeri (la guida italiana la omette).

## G-021 · L8 · Negoziazione di P5R: domande, risposte ed esiti per personalità; personalità delle Ombre
Chiesto da: Project manager (segnalazione dell'utente: la negoziazione non contiene tutte le domande e risposte per umore), Analisi app (L8 app §1),
Analisi dati (L8 dati §10) · Stato: **chiusa** · **Dettaglio completo nell'allegato `guida/G-021-negoziazione.md`**

**Risposta in breve.**
- La fonte di oggi è la raccolta di joyce-chen per **Persona 5 base**, tradotta dall'app. La fonte giusta è il foglio **Royal** della stessa
  raccolta (https://github.com/joyce-chen/persona5-negotiation, `data/persona-5-royal-questions.xlsx`): **277 domande**, 3 risposte ciascuna,
  esito per le 4 personalità; **1.714** esiti noti.
- Abbinate domanda per domanda 229 delle 230 domande dell'app. Esiti: **423 uguali**, **86 diversi** (vale Royal), **979 che mancano** nell'app,
  51 solo nell'app (da tenere, marcati «solo P5»), **24 contraddittori** già nell'app (21 risolti da Royal). Mancano **49 domande** di Royal (più 9
  doppioni o varianti già presenti); l'app ha **9 doppioni**. Le domande senza nessuna risposta buona scendono da **52** (oggi) a **10** (Royal).
  (Correzione del 2026-10-20: prima avevo scritto 443/88/957/53 e 55, per un errore di conteggio sulle risposte contraddittorie.)
- **Testo italiano del gioco**: nessuna fonte italiana ha le domande della negoziazione (la guida allgamestaff non ne ha un elenco). Le 49 domande
  nuove hanno nell'allegato una **resa fedele marcata «resa dell'Esperto, non testo del gioco»**; le frasi già nell'app restano come rese dell'app.
- **Le 8 frasi delle carte** vengono dalla guida italiana, quindi **sono testo del gioco**: 5 sono confermate da Royal, compresa «Non ho preoccupazioni»,
  che per Cupa è buona (manca l'esito nell'app, non è sbagliata la carta). Una è sbagliata: «In realtà sono un ragazzino» per Timida è passabile.
  Due non sono verificabili. L'allegato propone le sostituzioni.
- **Personalità delle 75 Ombre della Battaglia che ne sono prive**: dai dati estratti dal gioco (aqiu384, campo «trait»). Ne ho trovate 69, più
  2 corrette per nome (Fango pulsante, Maestra degli scherzi: oggi Ombra e maschera scambiate). I 4 Servobot di Okumura non risultano negoziabili.
  Per i Demoni del Tesoro va verificato se si negoziano.
- **Regole** (guida italiana, AGS sistema-di-battaglia/): personalità «giocose, timide, irritabili, cupe»; la guida dice solo che apprezzano o
  detestano certe risposte; se la trattativa fallisce si riprende dal turno avversario. Le **Ombre sciagura** non si negoziano (AGS ombre-sciagura/).
  Il documento di joyce-chen e GooberSD spiega i tre esiti: buona (note dorate), passabile (gocce azzurre), cattiva (trattini rossi); la seconda
  domanda è quella decisiva.
Certezza: **alta** sull'elenco e sull'abbinamento (218 abbinate con certezza alta); **media** sui singoli esiti (la fonte avverte che parte degli
esiti di Royal viene ancora dall'originale); **alta** sulle personalità (dati del gioco).

## G-022 · L3/L4 · Le 45 voci del diario che riferiscono un Palazzo → infiltrazioni in ordine
Chiesto da: Project manager (incarico dell'utente: «trovare tutte le voci corrette e validarle… rendendole in italiano»), per `lotti/L3/dati.md` §8 ·
Stato: **chiusa** · Proposte per il campo «Infiltrazione» che l'utente conferma; **nessuna scrittura**.

**Fonti.** Guida italiana, soluzioni settimanali (l'indice di ogni pagina elenca, sotto ogni data, le sezioni del Palazzo fatte quel giorno) e pagine
dei Palazzi (https://www.allgamestaff.it/persona-5-royal/soluzione-settimana-N/, …/palazzo-di-<sovrano>/). Le pagine dei Palazzi della guida sono
divise **per data** («12 APRILE – Parte I», «20 APRILE»…), non con i nomi dell'app: i nomi qui sotto sono quelli dell'**app** (numero = ordine
dell'infiltrazione nel Palazzo). Dove la guida usa un altro nome lo scrivo in nota.
Legenda: **=** proposta di Analisi dati confermata · **✎** corretta · **+** completata (era «?») · n/a = la voce non è un'infiltrazione.

| # | Data · fascia* | uid | Voce (inizio) | Infiltrazioni in ordine (nome nell'app) | Esito | Fonte (AGS) · citazione | Certezza |
|---|---|---|---|---|---|---|---|
| K1 | 04-11 | f3d6ddf19b62f76616e3de65ac00f2b9 | Prima infiltrazione tutorial | 0 Tutorial Palazzo 11/04 | = | sett. 1, «11 APRILE»: «Scappa dal castello misterioso» | alta |
| K2 | 04-12 | e4290542b3376439f92c71b76e18b64e | Seconda infiltrazione tutorial | 1 Tutorial Palazzo 12/04 | = | palazzo-di-kamoshida, «12 APRILE»: «Parte I» | alta |
| K3 | 04-15 | 6fd5031403067e22f9306de902cf57a6 | terza incursione, tutorial cattura | 2 Tutorial Palazzo 15/04 | = | palazzo-di-kamoshida, «15 APRILE» | alta |
| K4 | 04-20 | a513390589dcbc75a7ae4ef1aa798d06 | infiltrazione completa in un unico viaggio | 3 Vecchio Castello → 4 Tetto del Vecchio Castello → 5 Ispeziona l'interno della torre | = | sett. 2, «20 APRILE»: «recuperare il tesoro del Palazzo con un unico viaggio» | alta |
| K5 | 04-21 | 854d79fc18c6f19dc2a653dfb0bfb2ba | lettera di sfida | n/a (solo Palazzo) | = | sett. 2, «21 APRILE»: «Manda la lettera di sfida» | alta |
| K6 | 04-22 | cdc7e3a818e612b94efe7853135f7617 | Sala del trono e Stanza del Tesoro, boss | 6 Rubare i desideri del Cuore | = | palazzo-di-kamoshida, «22 APRILE»: «Ruba il Tesoro materializzato» | alta |
| K7 | 04-23 | 2ddbe4c2896e1ed13eb12b6c803d4184 | Negozio Softair: vendere il tesoro | n/a | = (non riletta) | sett. 2, «23 APRILE» (nessuna sezione di Palazzo) | media |
| K8 | 04-18 | 9f51cb2f8df6830f4c01bd740de4492b | «Saluta Kamoshida e Kawakami» | n/a — **falso positivo**: è il professore, non il Palazzo; il riferimento al Palazzo va tolto | = | sett. 2, «18 APRILE»: «Salutate Kamoshida con "Buongiorno"» | alta |
| M1 | 05-16 | 3fb31dded3f9581173037ce9d1ec9535 | Primo accesso al Palazzo | 0 Prima Infiltrazione al Museo | = | sett. 6, «16 MAGGIO»: «Entrata del museo» | alta |
| M2 | 05-16 | 445731a85c54f6d1fa541f10ee8c64d1 | infiltrazione iniziale | 0 Prima Infiltrazione al Museo (stessa visita di M1) | = | come sopra: «Infiltrati nel museo» | alta |
| M3 | 05-19 | cea365dae255a9787afdf99661e5aa0f | Scopri dov'è il Tesoro | 1 Scopri dov'è il Tesoro | = | sett. 6, «19 MAGGIO» | alta |
| M4 | 05-20 | 08f2338c556be7188e48d0746a280bd2 | messaggio di Ryuji sul piano di Morgana | n/a (lo stesso giorno l'infiltrazione è M5) | = | sett. 6, «20 MAGGIO» | alta |
| M5 | 05-20 | 464ccfe40659a41b6b201947ed776312 | Terza visita al Palazzo | 2 Disabilita i sistemi di sicurezza | = | sett. 6, «20 MAGGIO»: «Disabilita i sistemi di sicurezza» | alta |
| M6 | 05-27 | 6ebb178b6fc4009d3335635446a2c864 | Nelle profondità del Museo | 3 Nelle profondità del Museo | = | sett. 7, «27 MAGGIO» | alta |
| M7 | 05-27 | e2312ec57c58764c58184ac6c860a822 | Sosta nella Stanza di Velluto | n/a (Velluto all'uscita dello stesso viaggio) | = | sett. 7, «27 MAGGIO» (letto in sintesi) | media |
| M8 | 05-29 | 9254eba5a15ee14c99d7afc1f8b30fda | Negozio Softair: vendere gli oggetti | n/a | = | sett. 7, «29 MAGGIO» (letto in sintesi) | media |
| M9 | 05-31 | fa2b6c8b9e1397c05ed9ce3c042ca299 | invio della lettera di sfida | n/a | = | sett. 7, «31 MAGGIO»: «Manda la lettera di sfida» | alta |
| M10 | 06-01 | b9371f8061aedd71262a200b98d18bd0 | raccolta dei tesori e boss finale | 4 Il furto del Cuore di Madarame | = | sett. 8, «1 GIUGNO»: «il giorno in cui ruberemo il Cuore di Madarame» | alta |
| B1 | 06-20 | 65fdbeab5101e6068310fea982553d22 | prima esplorazione | 0 Sala d'ingresso | = (con riserva) | sett. 11, «20 GIUGNO»: «solo un rapido sopralluogo» — la guida chiama la visita «Cerca il boss della mala» | media |
| B2 | 06-25 | 5796b127c3400b50853375829f8cf548 | esplorazione completa | 0 Sala d'ingresso → 1 Corridoio dei banchieri → 2 Ufficio riciclaggio → 3 Caveau sotterraneo | = | sett. 11, «25 GIUGNO»: «dall'inizio del Palazzo fino al Tesoro» | alta |
| B3 | 06-26 | 80914911db15067f54372fd85e724f27 | Giornata libera: proseguire o allenarsi | **n/a** (nessuna sezione di Palazzo quel giorno) | + | sett. 11, «26 GIUGNO» | alta |
| B4 | 06-27 | 5fa87613387914bfcd9c03f664602169 | boss finale Kaneshiro | 3 Caveau sotterraneo (l'app non ha un'infiltrazione «furto» per Kaneshiro) | = | sett. 12, «27 GIUGNO»: «troverete Kaneshiro ad attendervi» | alta |
| B5 | 07-03 | 62f794fef617c3d855db62215e64b1b0 | vendere i tesori | n/a | = | sett. 12, «3 LUGLIO» (letto in sintesi) | media |
| F1 | 07-25 | ac258051782e4ec99dc9ab4ac25df650 | entrata della piramide e corridoio principale | 0 Entrata della piramide → 1 Corridoio principale – prima sezione | = | sett. 16, «25 LUGLIO» | alta |
| F2 | 08-01 | f5e781ca22e5ea7a33e5fcf4872f0108 | esplorazione del dungeon, forzieri, Ombre | **0 → 1 → 2 Città nel deserto → 3 Caverna/Passaggio sotterraneo → 4 Camera dei sarcofagi** | + | sett. 17, «1 AGOSTO»: «completare l'intero dungeon in una volta sola» | alta (la divisione F2/F3 è mia) |
| F3 | 08-01 | 62284ab35f052e4dc2bb16daf3b09233 | proseguire l'esplorazione in sessione prolungata | **5 Corridoio principale – sezione centrale → 6 Camera del rigetto → 7 Camera del rimorso → 8 Camera del santuario** | + | sett. 17, indice del 1/8 | alta (divisione mia) |
| F4 | 08-03 | c9efdb83a3eeb29a6ceea9a6f6cc2ea2 | Camera del Rigetto e Camera del Rimorso | **9 Santuario Interno / Camera del Vuoto** | ✎ | sett. 17, «3 AGOSTO»: «Attraversa la porta cognitiva» / «Camera della vacuità» | alta |
| O1 | 09-15 | fd2a7b29e9906cabc4d03848d332d5ba | ingresso laterale | 0 Entrata Laterale → **1 Corridoi del Complesso** | ✎ (aggiunta la 1) | sett. 22, «15 SETTEMBRE»: «ci porterà ai Corridoi del complesso» | alta |
| O2 | 10-04 | c66a02b66d02f21793e1f8e0d2f08798 | infiltrazione estesa | 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 Produzione Armamenti (tutte, nell'ordine dell'app) | = | sett. 25, «4 OTTOBRE»: «raggiungere l'area finale: la Produzione armamenti» | alta |
| O3 | 10-06 | 8d8588deeea8d17f6279c5c26651d08c | rubare il Tesoro materializzato | 9 Produzione Armamenti (Tesoro **e** boss lo stesso giorno) | = | sett. 25, «6 OTTOBRE»: «l'ultima Safe Room (Produzione armamenti)» | alta |
| O4 | 10-11 | ec7d9d6c95f57a5f6a7a8d46b78d3f61 | battaglia finale contro l'Ombra di Okumura | **n/a**: quel giorno non c'è infiltrazione (solo scene; il boss si batte il 6/10) | ✎ | sett. 26, «11 OTTOBRE»: «trofeo… per aver sconfitto l'Ombra di Okumura» | alta |
| N1 | 10-29 | 7dd92df212b81bb87aba6e7a2fa8c874 | ingresso iniziale nel Casinò | 0 Entrata del Casinò → 1 Piano terra | = | sett. 28, «29 OTTOBRE»: «la nostra prima Safe Room» | alta |
| N2 | 11-14 | dece90bfb20d9d3328f2a6b0ca417590 | Lobby Puntate Alte, Arena, Oscura Dimora | 10 Lobby piano puntate alte → 11 Arena combattimenti → 12 Oscura dimora → **11 Arena (seconda parte)** → **13 Direzione** | ✎ | sett. 31, indice 1.1.1–1.1.5: «Arena combattimenti – Parte II» / «Direzione» | alta |
| N3 | 11-19 | 589d82e823703ee879d72f974fd51139 | battaglia contro l'Ombra di Sae | 13 Direzione (sala del boss) | = | sett. 31, «19 NOVEMBRE» (contenuto letto in sintesi) | media |
| S1 | 11-24 | 527cf9832e94e93e855436191e06f8b6 | Ponte Anteriore, Sala d'ingresso, Corridoio centrale | 0 Passaggio Centrale / Sala d'Ingresso (la guida: «Ponte anteriore» → «Sala d'ingresso» → «Passaggio centrale») | = | sett. 32, «24 NOVEMBRE» | alta |
| S2 | 12-11 | 746682faca7287278d592da846383d15 | fino alla Sala Intrattenimento | 0 → 1 → 2 → … → **14 Passaggio Centrale (Uscita)** (tutte tranne la 15) | ✎ (non si ferma alla 7) | sett. 33, indice 11.1.1–11.1.15 | alta |
| S3 | 12-12 | b7122251a674682657fe627319d36d91 | sequenza di boss multipli | 15 Aula Magna (Tesoro e boss finali) | = | sett. 34, «12 DICEMBRE»: «dirigiamoci verso l'Aula Magna» | alta |
| R1 | 01-09 | cdf1af20cff42ec521e2b4620f6f84a3 | esplorazione con Akechi, verso l'Auditorium | 0 Ingresso → 1 Sala d'ingresso → 3 Corridoio → 4 Auditorium (**senza la 2**: il Percorso di prova è del 2/1) | ✎ | sett. 37, indice 2.1–2.4 | alta |
| R2 | 01-12 | 6e28e155072a065d80a68a72ae5be9bb | Ripostiglio e Sala di controllo | **0 Ingresso → 4 Auditorium** → 5 Ripostiglio → 6 Sala di controllo | ✎ | sett. 37, indice 5.1.1–5.1.4 | alta |
| R3 | 01-26 | cf66b722af0a5fb76d1906e89b66bb64 | Sala controllo … Corridoio Crepuscolo | 6 → 7 Ala ricerca → 8 Sala visite → 9 Sala di supporto → 10 Corridoio del Crepuscolo | = | sett. 39, indice 4.1.1–4.1.5 | alta |
| R4 | 01-27 | 105bf9ede1747bcd6a18491d478163e6 | proseguire ed eventualmente completare | **n/a** (nessuna sezione di Palazzo quel giorno) | + | sett. 39, indice del 27 GENNAIO | alta |
| R5–R8 | 02-03 | 3db90a97fcbc510f8fb97ca5aa142dd2, c3aff3d5cc749a1452814d60bd576b83, ccbbc79f7f8ecf2423794dc9e9683cc6, 525ed37ba675f84dee6178c4e473365e | Fasi 1–4 del boss | 11 Eden (si parte dalla Safe Room della 10 e si sale in ascensore) | = | sett. 40, «3 FEBBRAIO»: «salire fino al Modello psi-cognitivo Eden» | alta |
\* La fascia è quella delle voci (giorno); invariata.

**Riepilogo.** 45 voci: **confermate 32**, **corrette 7** (F4, O1, O4, N2, S2, R1, R2), **completate 3** (B3, R4 → n/a; F2/F3 → infiltrazioni).
Voci senza infiltrazione (restano col solo Palazzo): K5 lettera, K7 vendita, M4 messaggio, M7 Velluto, M8 vendita, M9 lettera, B3, B5 vendita,
O4, R4, e il **falso positivo K8** (il professore: va tolto anche il Palazzo).
**Le 3 voci di Niijima** (N1, N2, N3): sono infiltrazioni del Palazzo di Niijima (Casinò di Sae): il riferimento giusto è **`dungeon:niijima`**, non
`confidente:makoto` (la guida: sezioni «Palazzo di Niijima», obiettivi «Ruba il cuore di Sae Niijima», «Insegui l'Ombra di Sae»).
**Nota sul testo di F4**: dice «Camera del Rigetto e Camera del Rimorso», che la guida fa il 1/8; il 3/8 è la Camera della vacuità. Il testo della
voce non si tocca senza il sì dell'utente: la proposta riguarda solo il campo «Infiltrazione».
**Giorni d'infiltrazione che non hanno una voce** (da proporre come voci nuove, se l'utente vuole):
- **Niijima, 13/11**: 0 → 1 → 2 Area riservata allo staff I → 5 Lobby piano riservato ai soci → 6 Area dadi I → 3 Staff II → 7 Area dadi II → 4 Staff III →
  8 Slot 1 → 9 Slot 2 → 10 Lobby puntate alte (sett. 30, indice 7.1.1–7.1.11).
- **Maruki, 3/10**: 0 Ingresso → 1 Sala d'ingresso, con Kasumi (sett. 25). **Maruki, 2/1**: 0 → 1 → 2 Percorso di prova (sett. 36, «Palazzo sconosciuto»).
- ~~Kaneshiro, 25/6: la lettera di sfida~~ → **corretto: la lettera si manda il 26/6** (vedi sotto, «Seguito di G-022»).
**Nomi**: dove la guida chiama diversamente una visita (Kaneshiro 20/6 «Cerca il boss della mala»; Shido 24/11 «Ponte anteriore»), propongo di tenere
il nome dell'app e di aggiungere il nome della guida come nota della voce.
Certezza complessiva: **alta** (34 voci su 45 lette sul testo integrale degli indici e dei giorni); **media** per K7, M7, M8, B1, B5, N3 (lette in
sintesi o con riserva).

### Seguito di G-022 (richiesta di Stesura modifiche)
**Lettera di sfida a Kaneshiro: 26/6, non 25/6.** Nella guida la sottosezione «Manda la lettera di sfida» del 25/6 è solo un promemoria: tornati al
Leblanc arriva il messaggio dei compagni e **la sera** si costruiscono i grimaldelli (Perizia +3). La lettera si invia **il 26/6 (domenica), di giorno,
al Ritrovo**: scena di Makoto e Ryuji che preparano il loro attacco Speciale, poi l'opzione «Invia lettera di sfida»; più tardi un messaggio dice che
la consegnano **Ryuji e Makoto**.
Fonte: AGS soluzione-settimana-11/, sezione 6.2 («stasera passeremo il nostro tempo a crearne degli altri») e «26 GIUGNO (Domenica 6/26)»
(«selezionate l'opzione "Invia lettera di sfida"»; «Ryuji e Makoto se ne stanno occupando»). Certezza: **alta**.
**Voce nuova proposta** (nello stile delle lettere di Kamoshida e Madarame; nessuna scrittura):
| Data | Fascia | Tipo | Testo | Riferimento |
|---|---|---|---|---|
| 06-26 | giorno | palazzo | «Ritrovo: invio della lettera di sfida a Kaneshiro (la consegnano Ryuji e Makoto)» | dungeon: kaneshiro (n/a: nessuna infiltrazione) |
Nota: lo stesso giorno c'è già B3 (`80914911…`, «Giornata libera: proseguire il Palazzo o allenarsi»), che resta n/a. Il 26/6 è dopo il 06-01: non tocca
il diario validato.
**Voci già esistenti nei giorni senza voce di Palazzo** (decisione del PM: ricevono la proposta, nessuna voce nuova). Oggi hanno tutte un riferimento
a un Confidente: il riferimento giusto è il **Palazzo**.
| uid | Data · fascia | Voce (inizio) | Riferimento giusto | Infiltrazioni in ordine | Certezza |
|---|---|---|---|---|---|
| ebe00e6b2fe3f80a827f88f5503165fc | 11-13 · giorno | «Palazzo di Sae: infiltrazione nel casino, Tessera socio… area staff e piano riservato ai soci» | dungeon: niijima (oggi confidente: makoto) | 0 Entrata del Casinò → 1 Piano terra → 2 Area riservata allo staff — Parte I → 5 Lobby piano riservato ai soci → 6 Area dadi — Parte I → 3 Staff — Parte II → 7 Area dadi — Parte II → 4 Staff — Parte III → 8 Stanza slot machine 1 → 9 Stanza slot machine 2 → 10 Lobby piano puntate alte | alta (sett. 30, indice 7.1.1–7.1.11) |
| 7c0814176b193cad29d15ec00ffe891c | 11-13 · sera | «Completare l'infiltrazione del palazzo» | dungeon: niijima (oggi confidente: makoto) | **n/a**: nella guida l'infiltrazione del 13/11 è un solo viaggio di giorno; la sera non si entra nei Palazzi. Il testo della voce (non validata) andrà rivisto dall'utente | media |
| 8742bcf962a80c28b81ab272ee5d5014 | 10-03 · giorno | «Dungeon sconosciuto: ingresso e sala d'ingresso, ricerca di Kasumi…» | dungeon: maruki (oggi confidente: kasumi) | 0 Ingresso → 1 Sala d'ingresso | alta (sett. 25) |
| 09e38fddc12a2cce9d5abec6ffc6e7aa | 01-02 · giorno | «Palazzo sconosciuto: obiettivo Trova il signore del Palazzo…» | dungeon: maruki (oggi confidente: maruki) | 0 Ingresso → 1 Sala d'ingresso → 2 Percorso di prova | alta (sett. 36, «Palazzo sconosciuto») |

## G-026 · L4 · Palazzo «concluso» e Palazzo «completato al 100%»: ingressi, sblocchi, oggetti persi
Chiesto da: Stesura modifiche (L4, regola di completamento) · Data: 2026-10-20 · Stato: **chiusa** (un punto senza fonte)

**Risposta.**
1. **Dopo il furto del Tesoro (boss battuto) nel Palazzo non si entra più, in nessun modo**: la guida dice che il Palazzo «sparirà
   definitivamente e non sarà più accessibile». Vale per l'app di navigazione e per il punto d'ingresso in città: il Palazzo non esiste più.
   Confermata la riga di G-005.
2. **Gli sblocchi «dopo il Palazzo di X» dipendono dal furto**, cioè dal boss battuto, che è l'unico modo di concludere un Palazzo. Se la scadenza
   passa senza furto la partita finisce («Se il tempo dovesse scadere, sarà Game Over»), quindi non esiste un ramo «dopo la scadenza». I requisiti
   dell'app sono già scritti così: tipo `palazzo`, «Aver sconfitto il boss…». **Nessuna fonte lega uno sblocco alla raccolta completa** di forzieri,
   porte o Semi: la guida consiglia di raccogliere tutto prima del colpo solo perché dopo è irrecuperabile. L'unico premio «per averli tutti» che la
   guida nomina riguarda i **Timbri dei Memento**, non i Palazzi.
3. **Forzieri e oggetti non presi prima del furto sono persi per sempre** («Se lasciamo indietro qualcosa, non potremo più tornare a recuperarlo»).
   Per i **Semi** c'è un'eccezione, ma solo da fonte inglese: Jose vende **il Seme mancante**, non il Cristallo («possible to purchase an extra Will
   Seed from Jose if you have missed»), e i 3 Semi fusi si portano a Jose per l'accessorio. Prezzo, valuta e data **non risultano**; il listino di Jose
   della guida italiana (pagato in Fiori, sbloccato per Dedalo) non elenca Semi né Cristalli. La guida dice però che Jose **trasforma i Cristalli
   in Anelli** «soltanto dopo la distruzione del Palazzo collegato».
→ Per la proposta all'utente: «**Palazzo concluso**» (Tesoro e boss) = fine degli ingressi e condizione degli sblocchi; «**completato al 100%**» =
solo un indicatore di raccolta, che nel gioco non sblocca nulla. Un Seme mancante si può recuperare da Jose, quindi non va trattato come perso.
Fonti: AGS guida-esplorazione-dungeon/, «I Palazzi scompaiono dopo il completamento»; AGS palazzo-di-kamoshida/, «20 APRILE» (Game Over);
AGS negozi-speciali/, «Negozio di Jose» («trasforma automaticamente anche i Cristalli ottenuti nei Palazzi nelle rispettive versioni Anello»);
AGS persona-5-royal-guida-ai-memento/, «Jose: Fiori e Timbri nei Memento»; https://samurai-gamers.com/persona-5/what-are-ishi/, «What are Will Seeds?».
Certezza: **alta** su 1, 2 e sui forzieri persi; **media** sull'acquisto del Seme da Jose (una fonte inglese, senza prezzo né data).

## G-027 · L4 · Il boss finale di Madarame manca; il boss finale di ogni Palazzo
Chiesto da: Project manager (difetto O4-1 di Test funzionali) · Data: 2026-10-20 · Stato: **chiusa** · Proposta: **nessuna scrittura** (le voci di
Madarame sono lavoro dell'utente da preservare: la voce nuova si aggiunge solo col suo sì)

**CORREZIONE (2026-10-20, copia fresca di produzione `dati-produzione/2026-10-20-0440Z`): il boss c'è già, inserito dall'utente** nell'ultima
infiltrazione di Madarame, proprio dopo «Cerca una via d'uscita»: ordine 18 `madarame-il-furto-del-cuore-di-madarame-scontro-con-madarame`
«Scontro Madarame a pezzi» (tipo boss: la fase dei dipinti) e ordine 19 `…-scontro-con-madarame-2` «Scontro con Madarame» (tipo boss: Madarame).
Posizione e due fasi coincidono con la guida. **La voce proposta sotto è ritirata**; il **boss finale** di Madarame per la regola «concluso» è
l'**ordine 19** («Scontro con Madarame»). La mia analisi aveva letto i dati di sviluppo, più vecchi. La tabella dei boss finali degli altri Palazzi resta
valida.
**Pin** (copia fresca): la voce dell'ordine 19 è collegata (`spillo_voce`) a due pin dell'utente sulla planimetria `nativo-rmap-153-5-0` (Giardino
centrale, cioè il cortile in cui la guida colloca lo scontro): **2301 «Madarame»** (tipo boss) e **2300 «La vera Sayuri Originale»** (tipo
tesoro-palazzo). La voce dell'ordine 18 non ha pin. → `voce_boss_finale` di Madarame = `madarame-il-furto-del-cuore-di-madarame-scontro-con-madarame-2`;
nessuna domanda all'utente.

**Madarame.** Nella guida il 1° giugno è: «Ruba il cuore di Madarame» → **«Ruba il Tesoro materializzato»** (sotto-obiettivi «Raggiungi la sala
principale», «Raggiungi i comandi della gru» con la leva del cavo e la risposta «Come sempre», «Riunisciti con Morgana») → **«Fuggi dal Palazzo»**
(«Cerca una strada per l'uscita»: finestra illuminata di blu, porta rossa, **cortile**) → scene → **BOSS: ICHIRYUSAI AZAZEL MADARAME** nel cortile →
crollo del Palazzo e fuga. Il boss viene **dopo** «Riunisciti con Morgana» e «Cerca una via d'uscita»: nelle voci di oggi (ultima infiltrazione
`madarame-il-furto-del-cuore-di-madarame`, ordini 0–17) è l'ultimo passo, che manca.
**Voce proposta** (stesso formato di «Sconfiggi Kamoshida»):
| Campo | Valore |
|---|---|
| Infiltrazione | `madarame-il-furto-del-cuore-di-madarame` (Il furto del Cuore di Madarame), dopo «Cerca una via d'uscita» (ordine 18) |
| Tipo | **boss** (permanente) |
| Nome | **Sconfiggi Madarame** |
| Descrizione | «BOSS: ICHIRYUSAI AZAZEL MADARAME — nel cortile, durante la fuga dal Palazzo. **Fase 1, i dipinti** (occhio destro, occhio sinistro, naso, bocca): livello 18, 300 HP / 280 SP ciascuno; gli occhi assorbono Fuoco, Ghiaccio, Elettricità e Vento, il naso Psicocinesi, Nucleare, Sacro e Maledizione, la bocca gli attacchi fisici e con arma da fuoco; «Grazia dell'artista» rende il gruppo debole a tutto per un turno (difendersi con Guardia). Colpire prima il naso con attacchi fisici, poi gli occhi; dopo tre ricomposizioni compaiono i barattoli di vernice nera: al segnale di Mona usarli (meglio Fox) e i dipinti diventano deboli a tutto. **Fase 2, Madarame**: livello 18, 2.400 HP / 1.800 SP, nessuna debolezza; con «Vero falso» evoca quattro cloni da 250 HP resistenti agli attacchi fisici — Finta Furia (debole al Ghiaccio), Finta Gioia (debole al Vento), Finta Allegria (debole all'Elettricità), Finto Rammarico (debole al Fuoco) — e li rievoca ogni turno. Colpire le debolezze dei cloni e passare il turno (Staffetta) a Fox per Colpo sleale su Madarame. PE 1.750, 15.000 yen. Squadra consigliata: Joker, Skull, Mona, Fox.» |
| Fonte | https://www.allgamestaff.it/persona-5-royal/soluzione-settimana-8/, «1 GIUGNO (Mercoledì 6/01)» («BOSS: ICHIRYUSAI AZAZEL MADARAME»); stessa scheda nella pagina del Palazzo (letta in sintesi) |
Facoltativa, per completezza: una voce di **storia** «Ruba il Tesoro materializzato» prima di «Raggiungi i comandi della gru»; non serve alla regola.
Note: la guida scrive «Cerca una strada per l'uscita» dove la voce dell'utente dice «Cerca una via d'uscita»: il testo dell'utente non si tocca.

**Gli altri Palazzi: il boss c'è, ma la regola deve guardare il boss *finale*.** Più Palazzi hanno più voci «boss» (anche mini-boss marcati boss, o
boss intermedi): la conclusione va legata **a una sola voce per Palazzo**.
| Palazzo | Voce del boss finale (oggi) | Note |
|---|---|---|
| Kamoshida | `kamoshida-rubare-i-desideri-del-cuore-sconfiggi-kamoshida` «Sconfiggi Kamoshida» (Suguru Asmodeus Kamoshida) | unica |
| Madarame | `madarame-il-furto-del-cuore-di-madarame-scontro-con-madarame-2` «Scontro con Madarame» (ordine 19; l'ordine 18 è la fase dei dipinti) | 2 voci boss, inserite dall'utente (copia fresca) |
| Kaneshiro | `kaneshiro-04-caveau-sotterraneo/16` «Shadow Kaneshiro (Bael / Piggytron)» | unica; nome in inglese: in italiano «Ombra di Kaneshiro» (resa da confermare) |
| Futaba | `futaba-10-…/0` «La Sfinge / Wakaba Isshiki (Cognizione…)» | unica (boss del 3/8, G-022) |
| Okumura | `okumura-10-produzione-armamenti/6` «Kunikazu Mammon Okumura» | unica (6/10, G-022) |
| Niijima | `niijima-14-direzione-sala-del-boss/1` «Sae Niijima Leviathan — Fase 2» | 2 voci boss: la finale è la Fase 2 |
| Shido | `shido-16-aula-magna-tesoro-e-boss-finali/4` «Vero Masayoshi Samael Shido» | 9 voci boss: anche Akechi e il Sacrificio umano |
| Maruki | `maruki-12-eden-…/3` «Adam Kadmon (forma finale)» | 6 voci boss: **Sumire e Cenerentola del 9/1 sono mini-boss** (Auditorium), marcati boss |
| Iweleth | `iweleth-12-…/5` «Yaldabaoth, Dio del Controllo» | dedalo dei Memento, non un Palazzo (D3) |
Fonti: le soluzioni settimanali e le pagine dei Palazzi già citate in G-022 (giorni del furto: Kamoshida 22/4, Madarame 1/6, Kaneshiro 27/6, Futaba 3/8,
Okumura 6/10, Niijima 19/11, Shido 12/12, Maruki 3/2). Certezza: **alta**.

## G-028 · L3/L10 · Le voci «da rivedere» controllate prima che l'utente le riveda
Chiesto da: Project manager · Data: 2026-10-20 · Stato: **chiusa** · Errori trovati: **2** (mandati a Stesura modifiche)
Ricontrollata sulla copia fresca di produzione (`dati-produzione/2026-10-20-0440Z`): nei giorni interessati il diario è identico a quello letto, a parte le
due modifiche del team già in sviluppo (voce del 06-26, testo di F4); il Palazzo di Futaba si chiude il 3/8 anche lì → l'errore 1 resta.

**Fonti.** Walkthrough coi dati estratti dal gioco Royal (https://aqiu384.github.io/megaten-database/p5r/ace-walkthrough.html: per ogni giorno l'invito
e le sue condizioni, es. «Priestess Invite Ikebukuro» / «Pyramid Palace completion required»); guida italiana (soluzioni settimanali 12, 16, 17, 25, 30, 36
e 11, già lette in G-022 e G-023); il diario stesso (dati di sviluppo), per controllare che le condizioni siano vere **sul percorso del diario**, che è
quello della guida italiana.

### A. Le 8 voci degli inviti (L10, dopo il 06-01)
| Data · fascia | Voce (testo di G-023) | Confidente → luogo (sblocca) | Condizioni nel gioco | Sul percorso del diario | Sovrapposizione col diario | Esito |
|---|---|---|---|---|---|---|
| 07-02 · sera | «Ricevi il messaggio di Ryuji che ti propone di uscire domani» | Ryuji | — | — | sera: Hifumi in chiesa | **ok** (AGS sett. 12, 2/7: il messaggio a letto; la guida fa rifiutare) |
| 07-03 · giorno | «Rispondi all'invito di Ryuji ed esci con lui a Ichigaya (sblocca il luogo di ritrovo Ichigaya)» | Ryuji (Carro) → Ichigaya | Palazzo della banca completato; Temperanza Rango 1 | ✓ banca 27/6; Kawakami R1 8/6 | giorno: Ann al Buffet Wilton (la guida sceglie Ann) | **ok** — alternativa all'uscita con Ann |
| 07-28 · sera | «Ricevi il messaggio di Akechi che ti chiede se vuoi andare all'acquario con lui domani» | Akechi | — | — | sera: Kawakami | **ok** (AGS sett. 16, 28/7: «se vogliamo andare all'acquario con lui»; la guida risponde dopo) |
| 07-29 · giorno | «Rispondi all'invito di Akechi ed esci con lui all'acquario di Shinagawa (sblocca il luogo di ritrovo Shinagawa)» | Akechi (Giustizia) → Shinagawa | Diavolo Rango 1 | ✓ Ohya R1 5/7 | giorno: Takemi | **ok** — alternativa a Takemi |
| 07-30 · giorno | «Rispondi all'invito di Makoto ed esci con lei a Ikebukuro (sblocca il luogo di ritrovo Ikebukuro)» | Makoto (Papessa) → Ikebukuro | **Palazzo della piramide (Futaba) completato**; Imperatore Rango 1 | ✗ **sul percorso del diario la piramide si completa il 3/8**: il 30/7 l'invito **non arriva** (nel walkthrough arriva perché lì il Tesoro si prende il 27/7) | giorno: Ann | **ERRORE 1** (vedi sotto) |
| 08-06 · giorno | «Rispondi all'invito di Ann ed esci con lei al Santuario Meiji (sblocca il luogo di ritrovo Santuario Meiji)» | Ann (Amanti) → Santuario Meiji | piramide completata; Morte Rango 1 | ✓ piramide 3/8; Takemi R1 18/4 | nessuna voce quel giorno | **ok** |
| 10-08 · sera | «Ricevi il messaggio di Futaba che ti chiede di uscire con lei domani» | Futaba | — | — | nessuna voce | **ok** (AGS sett. 25, 8/10, letto in sintesi) |
| 10-09 · giorno | «Rispondi all'invito di Futaba ed esci con lei a Nakano (sblocca il luogo di ritrovo Nakano)» | Futaba (Eremita) → Nakano | Appeso Rango 1 (Iwai) | ✓ Iwai R1 15/8 | nessuna voce | **ok** |
**ERRORE 1 — invito di Makoto del 30/7.** L'invito è condizionato al Palazzo di Futaba **già completato**. Il diario segue la guida italiana, che ruba il
Tesoro il 3/8, quindi su questo percorso il 30/7 Makoto non invita. Proposta: (a) la voce resta, ma con la condizione scritta («solo se il Palazzo di Futaba è
già completato») e il motivo nel campo «da rivedere»; oppure (b) la voce non si aggiunge, e l'invito resta come **evento con condizioni** (in
`confidente_invito`: piramide completata + Imperatore R1), che si registra con il gesto diretto se accade. Consiglio (b): una voce del diario che sul suo stesso
percorso non può accadere confonde. Il caso di prova R10-11k (Makoto 30/7) va scritto con la partita di prova che ha completato la piramide prima del 30/7.
Fonte: walkthrough, «7/30 Sat · Daytime · Priestess Invite Ikebukuro (Ikebukuro Location unlocked) · Pyramid Palace completion required · Emperor Rank 1
required»; «7/27 … Pyramid Palace > Take treasure». Certezza: **alta**.
Le **condizioni** di tutti gli inviti (righe sopra) vanno nella riga di `confidente_invito`: oggi il progetto le ha solo per alcune.

### B. Le voci di Palazzo «da rivedere» (L3, dopo il 06-01)
| Data · fascia | uid | Voce | Proposta | Verifica | Esito |
|---|---|---|---|---|---|
| 06-26 · giorno | nuova | «Ritrovo: invio della lettera di sfida a Kaneshiro (la consegnano Ryuji e Makoto)», `dungeon:kaneshiro`, nessuna infiltrazione | — | AGS sett. 11, «26 GIUGNO»: «selezionate l'opzione "Invia lettera di sfida"»; «Ryuji e Makoto se ne stanno occupando» | **ok** |
| 08-03 · giorno | c9efdb83a3eeb29a6ceea9a6f6cc2ea2 | F4, testo corretto in «… Camera del Vuoto» | 9 Santuario Interno / Camera del Vuoto | la guida chiama la stanza **«Camera della vacuità»** (AGS sett. 17, «3 AGOSTO»: «Attraversa la porta cognitiva» / «Camera della vacuità»); «Camera del Vuoto» è il nome dell'app, non della guida | **ERRORE 2** (vedi sotto) |
| 10-03 · giorno | 8742bcf962a80c28b81ab272ee5d5014 | «Dungeon sconosciuto: ingresso e sala d'ingresso, ricerca di Kasumi…» | Maruki 0 Ingresso → 1 Sala d'ingresso | AGS sett. 25, «??? Ingresso» / «??? Sala d'ingresso», con Kasumi | **ok** |
| 11-13 · giorno | ebe00e6b2fe3f80a827f88f5503165fc | «Palazzo di Sae: infiltrazione nel casino…» | Niijima 0 → 1 → 2 → 5 → 6 → 3 → 7 → 4 → 8 → 9 → 10 | AGS sett. 30, indice 7.1.1–7.1.11 | **ok** |
| 11-13 · sera | 7c0814176b193cad29d15ec00ffe891c | «Completare l'infiltrazione del palazzo» | nessuna (da rivedere) | la guida fa tutto il 13/11 in un solo viaggio di giorno; la sera non si entra nei Palazzi | **ok** come «da rivedere»: motivo per l'utente: «la guida completa l'infiltrazione nel viaggio di giorno; questa voce serale non ha un'infiltrazione» |
| 01-02 · giorno | 09e38fddc12a2cce9d5abec6ffc6e7aa | «Palazzo sconosciuto: obiettivo Trova il signore del Palazzo…» | Maruki 0 → 1 → 2 Percorso di prova | AGS sett. 36, «Palazzo sconosciuto», 2.1.1–2.1.3 | **ok** |
| N1–N3 | 7dd92df2…, dece90bf…, 589d82e8… | voci di Niijima con riferimento `confidente:makoto` → `dungeon:niijima` | come in G-022 | sezioni «Palazzo di Niijima» | **ok** |
**ERRORE 2 — nome nel testo corretto di F4.** Il testo corretto deve usare il nome della guida, che è quello del gioco: **«Camera della vacuità»**, non
«Camera del Vuoto». Proposta di testo: «Palazzo di Futaba: esplorazione della Camera della vacuità…» (il resto invariato), col testo precedente
conservato. Il nome dell'infiltrazione nell'app («Santuario Interno / Camera del Vuoto (area finale) - dato parzialmente non-allgamestaff») è a sua volta
da rivedere, per la stessa ragione: proposta «Camera della vacuità» (nome della guida). Certezza: **alta** (titolo della sotto-sezione della guida).

## G-029 · L5 · Sblocco strutturato e orari di 56 luoghi
Chiesto da: Analisi dati (richiesta dell'utente via PM: ogni luogo ha uno sblocco strutturato, mai una frase) · Data: 2026-10-20 · Stato: **chiusa**
Base controllata sulla copia fresca di produzione (`dati-produzione/2026-10-20-0440Z`): i 93 luoghi sono identici a quelli dei dati di sviluppo.

**Principio di Analisi dati: confermato.** Lo sblocco del **luogo** è separato da quello del Confidente o del lavoro che ci si svolge (vanno in L9). Dove la
frase di oggi parla del Confidente, il luogo si apre col quartiere: `quartiere{q}`. Eccezioni: i luoghi che hanno **un evento proprio**, nella tabella A.
Sigle delle fonti: **AGS** = guida italiana allgamestaff; **SG** = https://samurai-gamers.com/persona-5/map-facilities/ (colonna «Time»);
**NEG** = AGS elenco-dei-negozi/; **SC** = AGS scambi-oggetti-curiosi-venditori-nascosti/.

### A. I 26 luoghi con lo sblocco solo come frase
| Luogo | Proposta di Analisi dati | Esito | Sblocco giusto | Fonte · certezza |
|---|---|---|---|---|
| asakusa-hangout | confidente{ann,7} | ✓ | confidente{ann,7} | deciso dall'utente; G-009 · alta |
| inokashira-hangout | ann,3 | ✓ | confidente{ann,3} | G-018 · alta |
| ogikubo-ramen | ryuji,4 | ✓ | confidente{ryuji,4} | G-018 · alta |
| tsukishima-monjayaki | ryuji,7 | ✓ | confidente{ryuji,7} | G-018 · alta |
| museo-ueno | yusuke,3 | ✓ | confidente{yusuke,3} | G-018 · alta |
| jazz-jin | akechi,4 | ✓ | confidente{akechi,4} | AGS guida di Akechi, «Rango 4»: «sblocca il Jazz club di Kichijoji come luogo di ritrovo» · alta |
| mantra-ganda | gemelle,3 | ✓ | confidente{gemelle,3} | NEG, «Mantra Ganda»: «dal raggiungimento del Rango 3 con le Gemelle custodi» · alta |
| protein-lovers | ryuji,5 oppure ann,8 | ✓ | confidente{ryuji,5} **oppure** confidente{ann,8} | AGS allenamento-casa-e-palestra/, «Allenamento in palestra» · alta |
| dome-town | data 06-09 | ✓ | data{06-09} | G-018 (AGS sett. 9) · alta |
| clinica-takemi | data 04-16 | ✓ | data{04-16} | deciso dall'utente; G-006 · alta |
| venditore-patate-dolci | data 10-09 | ✓ | data{10-09} | NEG: «Aperto solo di giorno a partire dal 9 Ottobre» · alta |
| chiesa-kanda | data 06-28 | ✓ | data{06-28} (data di Kanda; Hifumi e Fascino 3 vanno al Confidente) | G-018 · alta |
| negozio-jose | ? | **compilata** | richiesta{«Un ex piuttosto appiccicoso»} completata (Jose compare dopo la prima richiesta dei Memento) | AGS persona-5-royal-guida-ai-memento/, «Jose: Fiori e Timbri nei Memento» · media |
| untouchable | quartiere oppure «dal Palazzo di Kamoshida» | **né l'uno né l'altro** | **data{04-17}**: il negozio si apre visitandolo con Ryuji («Entra nel negozio softair»); Iwai (Coraggio 4) va al Confidente | AGS sett. 1, «17 APRILE (Domenica 4/17)»; SC: distributore militare «4/17 – 6/6» · alta |
| sala-giochi-akihabara | quartiere | ✓ | quartiere{akihabara} | (Shinya e le richieste vanno al Confidente) · alta |
| kichijoji-galleria-kasumi | quartiere | ✓ | quartiere{kichijoji} | Kasumi vi si incontra dal Rango 6 (dal 13/1): Confidente · alta |
| rafflesia | quartiere | ✓ | quartiere{shibuya} | il Fascino 2 è del lavoro · alta |
| scarlet | quartiere | ✓ | quartiere{shibuya} | alta |
| triple-seven | quartiere | ✓ | quartiere{shibuya} | presente già il 18/4 nelle offerte di lavoro (AGS sett. 2) · alta |
| ore-no-beko | quartiere | ✓ | quartiere{shibuya} | alta |
| stazione-piazza-shibuya | quartiere | ✓ | quartiere{shibuya} | (Yoshida al Confidente) · alta |
| crossroads | quartiere | ✓ | quartiere{shinjuku} (18/6) | (Ohya e il lavoro al Confidente/lavoro) · alta |
| chihaya-stand | quartiere | ✓ | quartiere{shinjuku} | alta |
| hinokuniya | quartiere | ✓ | quartiere{shinjuku} | alta |
| cancello-shujin | quartiere | ✓ | quartiere{shujin-academy} | (Makoto al Confidente) · alta |
| corridoio-2-piano-shujin | quartiere | ✓ | quartiere{shujin-academy} | (Kawakami al Confidente) · alta |
Note sulle frasi di oggi che vanno tolte o spostate: `untouchable` cita Iwai (Confidente); `harajuku-hangout`, `meiji-shrine-hangout`, `shinagawa-acquario`,
`nakano-broadway`, `laghetto-ichigaya`, `odaiba-seaside-park` hanno ancora date d'invito vecchie o inesatte: valgono G-018 e G-023 (Ann 6/8, Akechi 29/7,
Futaba 9/10, Ryuji 3/7; l'invito di Mishima del 3/8 non esiste).

### B. I 30 luoghi senza sblocco e senza orari
Sblocco: **quartiere{q}** per tutti, **salvo** quelli segnati. Orari: dove la guida italiana non dice nulla vale la regola dell'app (G-011: «giorno e sera»).
Riporto la fascia di SG solo come conferma, e la guida dove la dà.
| Luogo | Sblocco | Fascia | Fonte · certezza |
|---|---|---|---|
| akihabara/distributori-akihabara | quartiere{akihabara} (31/8) | giorno e sera (regola) | — |
| akihabara/maid-cafe-akihabara | quartiere{akihabara} | giorno e sera | SG «After School (Day / Night)» · media |
| akihabara/gachapon-akihabara | quartiere{akihabara} | giorno e sera | SG «Capsule Vending Machine» Day/Night · media |
| kichijoji/penguin-sniper | quartiere{kichijoji} (5/6) | giorno e sera | SG Day/Night · media |
| kichijoji/vestiti-usati-kichijoji | quartiere{kichijoji} | **giorno** | SG «6/6», «Daytime» · media |
| kichijoji/stoneon, mitsubachi, houraku, mealport, vecchio-tempio-kichijoji | quartiere{kichijoji} | giorno e sera (regola) | non risulta né in AGS né in SG |
| kichijoji/mercante-sakai | quartiere{kichijoji} **e** finestre settimanali | — | SC, «Il mercante Sakai»: «disponibile soltanto per una settimana, a partire dalla domenica», con la tabella delle finestre (dal 12/6–17/6 al 22/1–2/2); la pagina non dice che sia a Kichijoji · media → condizione `intervallo` per ogni finestra, luogo da verificare |
| shibuya/diner, big-bang-burger, sala-giochi-shibuya | quartiere{shibuya} | giorno e sera | SG Day/Night · media |
| shibuya/underground-mall-lovers | quartiere{shibuya} | giorno e sera | (Ann al Confidente) |
| shibuya/stazione-shibuya | quartiere{shibuya} | giorno e sera | — |
| shibuya/taisho-store | quartiere{shibuya} | giorno e sera (regola) | NEG senza orari · media |
| shibuya/venditore-ambulante | quartiere{shibuya} | **solo sera, dal lunedì al venerdì; chiuso con la pioggia** | SC, «Venditore ambulante»: «esclusivamente di sera, dal lunedì al venerdì»; AGS effetti-del-meteo/: chiuso con la pioggia · alta |
| shibuya/distributore-sottopasso | quartiere{shibuya} | giorno e sera; vuoto con Ondata di calore (giorno) e Notte torrida (sera) | G-011 · alta |
| shinjuku/cinema-cult9 | quartiere{shinjuku} | giorno e sera | SG Day/Night · bassa |
| shujin-academy/infermeria-shujin | **data{05-13}** | **solo giorno**, lunedì, martedì, mercoledì, venerdì | AGS guida di Maruki, «Come funziona»: avvio «automaticamente il 13 MAGGIO», «esclusivamente durante il giorno» (sono gli orari di Maruki, che coincidono con l'infermeria) · alta |
| shujin-academy/distributori-shujin | quartiere{shujin-academy} | giorno (a scuola) | — |
| shujin-academy/negozio-scolastico | quartiere{shujin-academy} | **giorno** (dopo scuola); articoli del venerdì (Panino con yakisoba, Pane autunnale) | SG «After School (Daytime)»; NEG · media |
| yongen-jaya/bagno-pubblico | **lettura{esplorando-yoncha-4}** | **sera**; effetto maggiore con pioggia e neve | AGS gabbie-di-battuta/, «Come sbloccare» (il libro sblocca bagno e gabbie; si ottiene pulendo la mensola il 18/4); SG «Night» · alta per lo sblocco, media per la fascia |
| yongen-jaya/batting-cage-yongen | **lettura{esplorando-yoncha-4}** | **sera** (di giorno solo con il Coupon) | AGS gabbie-di-battuta/, «Orari di accesso»: «All'inizio possiamo visitare le Gabbie di battuta soltanto di sera» · alta (SG dice «Daytime»: vale la guida) |
| yongen-jaya/cinema-yongen | quartiere{yongen-jaya} | giorno | SG «After School (Daytime)» · bassa |
| yongen-jaya/lavanderia-yongen | quartiere{yongen-jaya} | sera | SG «Night» · bassa |
| yongen-jaya/sakura-residence | **nessun accesso libero**: è il luogo di eventi di Futaba (dal Rango 6, 16/10 «ci ritroveremo nella sua stanza») | — | AGS guida di Futaba · media → proposta: luogo senza sblocco proprio, «solo durante gli eventi di Futaba» (va in L9) |
| yongen-jaya/stazione-yongen-jaya | quartiere{yongen-jaya} | giorno e sera | — |
| yongen-jaya/distributore-bagno-pubblico | quartiere{yongen-jaya} | giorno e sera | G-014 · alta |
Discordanze fra fonti: gabbie di battuta (AGS sera, SG giorno → vale AGS); Rafflesia (AGS: il **lavoro** è di giorno; SG: il negozio di sera → il negozio
resta «giorno e sera» per regola, il lavoro di giorno).
Fonti: oltre a quelle in tabella, AGS persona-5-royal-guida-ai-memento/ (Jose), AGS soluzione-settimana-1/ e -2/ (17/4 e 18/4; parti lette in sintesi
dichiarate), AGS guida-rango-confidente-di-maruki-consigliere/, AGS guida-rango-confidente-di-futaba-eremita/, AGS allenamento-casa-e-palestra/.

## G-030 · L4 · Madarame: i due pin «tesoro del Palazzo» (811 e 2300) — doppione?
Chiesto da: Project manager (Analisi dati, L4 §11.7) · Data: 2026-10-20 · Stato: **chiusa** · Esito: **non è un doppione**, nessun elenco da approvare

**I due pin** (copia fresca `dati-produzione/2026-10-20-0440Z`, entrambi dell'utente):
| Pin | Planimetria | Nome | Voce collegata | Che cosa rappresenta nel gioco |
|---|---|---|---|---|
| **811** | `nativo-rmap-153-9-0` Sala Principale – Livello 0 | «Tesoro del Palazzo» | «Riunisciti con Morgana» (storia) | il Tesoro materializzato preso **con la gru** nella Sala principale (1° giugno, «Ruba il Tesoro materializzato»): è il dipinto che si porta via, e che poi si rivela **un falso, un'esca** |
| **2300** | `nativo-rmap-153-5-0` Giardino centrale | «La vera Sayuri Originale» | «Scontro con Madarame» (boss finale) | nel **cortile** Madarame rivela che il dipinto rubato era un'esca e mostra il vero Tesoro, il **«Sayuri» autentico** (il ritratto della madre di Yusuke); dopo il boss il gruppo lo recupera e il quadro finisce **appeso al Café Leblanc** |
Sono **due momenti e due luoghi diversi** della stessa giornata: nessun doppione. Proposta (nessuna scrittura): lasciarli come sono. Se l'utente vuole, al pin 811
si può aggiungere una nota «il dipinto preso qui è un'esca» (il nome resta il suo). Per la regola «concluso» conta la voce del boss finale (G-027), non i pin.
Fonti:
- AGS soluzione-settimana-8/, «1 GIUGNO»: «Ruba il Tesoro materializzato» (gru, «leva di controllo del cavo») e poi «Fuggi dal Palazzo» → cortile, «dove
  si attiveranno diverse scene», con «rivelazioni molto importanti, specialmente per Yusuke»; la guida non racconta il falso.
- https://samurai-gamers.com/persona-5/p5r-madarame-palace-guide/, «Acquiring the Treasure»: «Examine the crane controls and trigger a cutscene».
- Trama (falso ed esca, «Sayuri» autentico, quadro al Leblanc): sintesi di una ricerca web su wiki e guide di storia (pagina Megami Tensei Wiki
  «Ichiryusai Madarame», Gamer Guides «Investigating the Fraud»), che non ho potuto leggere direttamente: Fandom risponde 402 agli strumenti.
Certezza: **alta** sui due luoghi e momenti distinti (guide); **media** sul dettaglio dell'esca e del quadro al Leblanc (fonti di trama lette solo in sintesi).

## G-031 · L5 · Quattro luoghi rimasti aperti: Sakura Residence, Mercante Sakai, Jinbocho, Okumura Foods
Chiesto da: Analisi dati (L5 §10, su richiesta del PM) · Data: 2026-10-20 · Stato: **chiusa**

1. **Sakura Residence** (`yongen-jaya/sakura-residence`): nessuna fonte la presenta come luogo visitabile liberamente. La stanza di Futaba compare **solo
   dentro gli eventi del Confidente**: Rango 6 (16/10, «ci ritroveremo nella sua stanza»), Rango 7 (2/11), Rango 10 amore, 15/1; negli altri ranghi Futaba
   si incontra fuori dal Leblanc. Non è nell'elenco dei negozi né nella mappa delle strutture.
   → Proposta: **luogo senza sblocco proprio**, segnato «solo durante gli eventi di Futaba». Gli eventi stanno nel Confidente (L9); non `data{10-16}` né
   `confidente{futaba,6}` come sblocco del luogo, perché il luogo non diventa mai visitabile da solo. Certezza: **media** (non ho riletto l'operazione di fine luglio).
   Fonte: AGS guida-rango-confidente-di-futaba-eremita/.
2. **Mercante Sakai** (`kichijoji/mercante-sakai`): sta a **Kichijoji**, nei vicoli della parte centro-occidentale. La fascia oraria non risulta (si
   trova in libera esplorazione). Finestre (AGS, colonna «Disponibilità»; formato mese-giorno → `intervallo{dal,al}`):
   06-12→06-17 · 06-26→07-02 · 07-11→07-12 · 07-26→07-30 · 08-07→08-13 · 08-22→08-27 · 09-04→09-06 · 09-19→09-24 · 10-02→10-08 · 10-16→10-22 ·
   10-30→11-05 · 11-13→11-17 · 11-27→12-03 · 12-11→12-17 · 01-13→01-14 · 01-22→02-02.
   Ogni finestra ha il suo scambio (oggetto chiesto → ricompensa), per esempio la Razione militare per «La fattorizzazione» dal 26 al 30 luglio: è un dato
   per L7. **Discordanze**: l'ultima finestra per Samurai Gamers finisce il 1/28 (vale la guida: 2/2); il testo della guida dice «una settimana, a partire
   dalla domenica», ma la sua tabella ha finestre più brevi (vale la tabella).
   Fonti: AGS libri/, «La fattorizzazione»: «Scambiando una Razione militare con Sakai (il mercante) a Kichijoji»; AGS scambi-oggetti-curiosi-venditori-
   nascosti/, «Il mercante Sakai»; https://samurai-gamers.com/persona-5/kichijoji-merchant-trading-guide/: «found in the back alleys of Kichijoji's
   middle western area». Certezza: **alta** (luogo e date).
3. **Jinbocho**: è un'**area a sé**, distinta da Kanda, non un negozio. L'unico negozio della guida è la **Libreria Nagiuri** («Negozi di Jinbocho»).
   Il ritrovo che si sblocca (Hifumi R4, oppure il libro «Pagine ammuffite») è l'area intera: «sbloccheremo l'area Jinbocho, in cui potremo viaggiare in
   futuro». → Il ritrovo va sul quartiere/area (`kanda-jinbocho`, parte Jinbocho), e `kanda-jinbocho/nagiuri` si apre con lui: sblocco
   `confidente{hifumi,4}` **oppure** `lettura{pagine-ammuffite}`. **Discordanza**: dove si compra «Pagine ammuffite» la guida lo scrive due volte in modo
   diverso, Libreria Hinokuniya (pagina Libri) e Libreria Taiheido (elenco dei negozi), sempre dal 1/9: da verificare in gioco.
   Fonti: AGS guida-rango-confidente-di-hifumi-stella/, «Rango 4»; AGS elenco-dei-negozi/, «Negozi di Jinbocho»; AGS libri/. Certezza: **alta**.
4. **Okumura Foods** (`roppongi/okumura-foods-hq`): la prima visita è il **15 settembre** (giovedì): «il gruppo si riunirà dopo la scuola fuori dal
   quartier generale di Okumura», e si entra subito nel Palazzo. **Il 9/19 di G-018 è sbagliato → `data{09-15}`** (G-018 corretto). Dopo non risulta
   visitabile liberamente: gli ingressi successivi al Palazzo passano dal Ritrovo nella mansarda del Leblanc. La guida italiana non nomina «Roppongi».
   Fonte: AGS soluzione-settimana-22/, «15 SETTEMBRE»; AGS palazzo-di-okumura/ (stesse date). Certezza: **alta** per la data, **bassa** per la visita libera.

## G-032 · L5 · Orario del negozio Untouchable (non quello di Iwai)
Chiesto da: Analisi requisiti (L5) · Data: 2026-10-20 · Stato: **chiusa** (certezza media)

**Risposta.** Gli orari oggi nell'app («sera, giovedì, sabato, domenica») sono quelli del **Confidente Iwai**, non del negozio: vanno a L9. La guida italiana
**non dà un orario del negozio** (armi, protezioni, vendita dei tesori, modifiche): nella pagina dei negozi speciali c'è solo l'inventario per rango.
L'unico orario che dà è quello del distributore militare interno, usabile «in qualsiasi momento» (dal 4/17 al 6/6). La fonte inglese separa le due cose:
negozio «After School (Weapon Shop, Gun Customization, and Sell Treasures)», Confidente «Evening (Hanged Man Confidant)».
→ Proposta: il **luogo/negozio** Untouchable ha l'orario della regola dell'app, «giorno e sera», come la Chiesa di Kanda (G-013); la sera del giov/sab/dom è
la **disponibilità di Iwai**. Il «dopo scuola» di Samurai Gamers non basta a dire che il negozio sia chiuso la sera (la tabella dà una sola fascia per
attività). Sblocco del luogo: `data{04-17}` (G-029).
Fonti: AGS negozi-speciali/, «Negozio softair Untouchable» (nessun orario); AGS scambi-oggetti-curiosi-venditori-nascosti/ (distributore militare:
«in qualsiasi momento»); https://samurai-gamers.com/persona-5/map-facilities/, «Shibuya > Central Street», riga «Untouchable». Certezza: **media**
(guida silenziosa sul negozio).

## G-033 · L5 · Orari del luogo o del Confidente/lavoro? Nove luoghi
Chiesto da: Analisi dati (L5 R5-12b, richiesta di Stesura) · Data: 2026-10-20 · Stato: **chiusa**
Regola usata (come G-013 e G-032): resta sul **luogo** solo un orario che la fonte dà **per il luogo** (apertura del locale o della zona); l'orario di un
Confidente va a L9, quello di un lavoro al lavoro, quello di un articolo all'articolo; altrimenti vale la regola dell'app «giorno e sera».
| Luogo | Oggi | Orario del **luogo** secondo le fonti | Classificazione | Dove vanno gli orari di oggi | Fonte · certezza |
|---|---|---|---|---|---|
| shinjuku/crossroads | sera · tutti i giorni | **solo sera**, tutti i giorni: è «il bar notturno» | **luogo** (orario proprio) | resta sul luogo; Ohya (sera, tutti i giorni; R4 e R10 no con la pioggia) a L9; lavoro serale (7.200 ¥, 12.000 la domenica) al lavoro | AGS lavori-part-time/, «Bar Crossroads»; SG «After School (Evening)» · alta |
| shinjuku/chihaya-stand | sera · mar/gio/sab/dom | zona visitabile giorno e sera | Confidente | **Chihaya** a L9: sera, mar/gio/sab/dom, mai con la pioggia; dopo il R1 le letture si fanno di giorno (attività) | AGS guida di Chihaya, «Disponibilità» e «Rango 2»; SG «Fortune-telling Stand» Day/Night · media |
| shujin-academy/cancello-shujin | giorno · mar/gio/sab/dom | zona della scuola: **giorno** (dopo scuola) | Confidente | **Makoto** a L9: solo giorno, mar/gio/sab/dom (R2 e R9 no con la pioggia); per R6, R8, R10 amicizia sta fuori dalla Biblioteca (3° piano) | AGS guida di Makoto, «Disponibilità»; SG Shujin «After School (Daytime)» · media |
| shujin-academy/corridoio-2-piano-shujin | sera · ven/sab | zona della scuola: giorno | Confidente | **Kawakami** a L9: sera, ven/sab, **al telefono a pagamento del Leblanc**; il corridoio serve solo per il primo incontro del 4/6 → luogo del Confidente da correggere (Leblanc, non il corridoio) | AGS guida di Kawakami, «Come sbloccare», «Disponibilità» · alta |
| shibuya/stazione-piazza-shibuya | sera · domenica e festivi | piazza visitabile giorno e sera | Confidente | **Yoshida** a L9: domenica sera **e festivi**, non con la pioggia; ultimo giorno utile 13/11; prima dello sblocco gli si parla ogni giorno | AGS guida di Yoshida, «Disponibilità» · alta |
| shibuya/ore-no-beko | sera | locale giorno e sera | lavoro | **lavoro** solo di sera; il locale alla regola | AGS lavori-part-time/: «disponibile esclusivamente di sera»; SG «Beef Bowl Shop» Day/Night · alta (lavoro), media (locale) |
| kichijoji/jazz-jin | sera | **solo sera** (3.000 ¥), tutti i giorni salvo alcuni sabati e domeniche «Evento di trama» | **luogo** (orario proprio) e attività | resta sul luogo; i cocktail per giorno, le abilità della domenica e la cantante (mai nel weekend) all'attività; sblocco Akechi R4 | AGS jazz-club/, «Come funziona il Jazz Club»: «accessibile durante la sera pagando 3.000 yen» · alta |
| akihabara/sala-giochi-akihabara | giorno · lun/mar/gio/sab | sala giochi giorno e sera (la guida gioca alla gru di giorno) | Confidente | **Shinya** a L9: solo giorno, lun/mar/gio/sab (R7, R8, R9 no con la pioggia) | AGS guida di Shinya, «Disponibilità»; SG «Akihabara Arcade» · media |
| kichijoji/hagoromo | sera · domenica | **non risulta** un orario del negozio | articolo | il «Domenica sera» è del **Katsu a pezzettoni** (l'unico articolo); il negozio alla regola | NEG, «Friggitoria Macelleria Hagoromo» (disponibilità dell'articolo: «Domenica sera»; nessuna nota sul negozio, a differenza di «aperto solo di sera» del Fioraio Sukebe) · bassa |
Avvertenza: la colonna «Time» di Samurai Gamers vale in parte per P5 originale (per esempio dà Rafflesia di sera, mentre la guida italiana, per Royal,
dice che il lavoro è solo di giorno): la uso solo come conferma.

## G-034 · L7 · Rilettura dei dati di gioco di L7 contro la guida
Chiesto da: Manager · Data: 2026-10-20 · Stato: **chiusa** · Base: `lotti/L7/dati.md` (e `l7-prod.json` di Analisi dati), copia fresca di produzione

| # | Dato di L7 | Esito | Valore giusto / nota | Fonte · certezza |
|---|---|---|---|---|
| 1 | **Listino di Tanaka**: 20 articoli con nomi **inglesi** (Nirvana Ring, Black Stone, Five-Inch Nail, Condenser Lens, Inspired Hand Mirror, Gemme elementali, Hercules Anklet, Heros Eyepatch, Black Robe, Magic Rosary, Black Kogatana, Atom Match, Retribution Mirror, Holy Cloth, Ouija Board, Dispel Ring, Model Gun, Roland Medal, Homunculus, Crown of Salvation) | **non corrisponde a Royal** | La guida, per Royal, elenca **18 articoli** diversi, in italiano: Spec. senso spirit. 5.000; Chiodo ossidato 5.000; Magatama infernale / ciclonico / del gelo / elettrico 6.000 (nessun grado); Magatama divino / esplosivo 6.000, Veste nera 500, Spec. spirit. oscuro 5.000 (grado Nero); Kogatana nera 1.000, Sacra Sindone 10.000, Tavola Ouija 10.000, Fotocamera spirituale 5.000 (Oscurità); Replica d'arma 1.000, Homunculus 5.000, Maschera sorridente 5.000, Corona della salvezza 990.000 (Caos). Gradi: Nero > 10.000 ¥ spesi, Oscurità > 50.000, Caos > 100.000. **10 nomi dell'app non sono nel listino di Royal** (Nirvana Ring, Black Stone, Condenser Lens, Hercules Anklet, Heros Eyepatch, Magic Rosary, Atom Match, Retribution Mirror, Dispel Ring, Roland Medal): probabilmente di un'altra versione. Abbinamenti probabili (deduzione dal nome): Black Robe → Veste nera, Black Kogatana → Kogatana nera, Model Gun → Replica d'arma, Ouija Board → Tavola Ouija, Holy Cloth → Sacra Sindone, Homunculus, Crown of Salvation → Corona della salvezza, «Gemme elementali» → i 6 Magatama; possibili: Five-Inch Nail → Chiodo ossidato, Inspired Hand Mirror → Spec. senso spirit. → **proposta**: il listino di Tanaka si **rifà** sulla guida (18 articoli italiani), con l'elenco dei 20 di oggi da approvare | AGS negozi-speciali/, «Affari loschi di Tanaka» (è un sito di shopping online, dopo aver riparato il laptop) · alta (listino), media (abbinamenti) |
| 2 | Homunculus (Tanaka) | la guida si contraddice | 5.000 (negozi speciali) contro 120.000 (pagina Oggetti); vince il listino: **5.000**, nota | AGS negozi-speciali/; AGS oggetti/ · media |
| 3 | Dango lunare: guida 640 · listino 800 | la guida si contraddice | listino Super Muramasa **800** («Autunno», 1 a settimana); la pagina Oggetti dice 640 → vince il listino, 640 in nota | AGS elenco-dei-negozi/, «Super Muramasa»; AGS oggetti/ · media |
| 4 | Agodashi Oden: guida 800 · listino 900 | la guida si contraddice | listino Triple Seven **900** («Inverno»); la pagina Oggetti dice 800 → vince il listino | AGS elenco-dei-negozi/, «Triple Seven»; AGS oggetti/ · media |
| 5 | Modellino di moto (regalo di Shinya): «3.600-4.800 (fonti discordanti)» · listino 4.800 | **errore nei regali** | **4.800** ovunque nella guida (Tokobushiya, e nei regali di Makoto, Futaba, Shinya); 3.600 è il prezzo del «Set di mascotte locali» dello stesso negozio | AGS elenco-dei-negozi/, «Negozio Otaku Tokobushiya»; AGS guida-regali-confidenti/ · alta |
| 6 | Braccialetto d'argento 78.000 / 68.000 | (G-024) | vince il listino 68.000 | G-024 · bassa |
| 7 | **Jose**: 37 righe (`dati_guida.jose.scambi`) contro 24 (`oggetti-guida.scambi`) | **le 37 sono giuste** | la guida ha **37 articoli**, stessi nomi e stessi prezzi in Fiori, nello stesso ordine; la copia da 24 è incompleta. Unica nota: la guida usa l'apostrofo curvo (’) | AGS negozi-speciali/, «Negozio di Jose»; AGS persona-5-royal-guida-ai-memento/, «Jose: Fiori e Timbri» · alta |
| 8 | Ricompense delle Richieste «non trovate» (20) | nomi **corretti**, salvo uno | **Lo zio ingordo → «Sciabola del rischio»** (arma per Mona), non «Venture Saber / Spadone dell'impresa». Tipi confermati: carte abilità Annulla att. fisici, Termopili, Rimonta, Crescita 3; Corona del tumulto (accessorio); per Mediarama, Carica, Recupero 3 la tabella della guida non scrive «carta» (sono nomi di abilità: carte abilità) | AGS richieste-nei-memento/, «Tutte le Richieste dei Memento»; AGS soluzione-settimana-25/, «8 OTTOBRE»: «prendiamo la Sciabola del rischio… Un'arma per Mona»; AGS dedalo-di-akzeriyyuth/, -adyeshach/, -sheriruth/ · alta |
| 9 | Contenuti dei forzieri «non trovati» (campione di 15) | nomi **tutti corretti** | Batterie portatili, Tirapugni, Giubbotto dorato (Kaneshiro); Ofuda invincibile, Fiala disperazione S ×3, Pane sacramentale ×3 (Futaba); Ascia Big Bang, Bastone apocalittico, Muschio FR-FO, Tuta spaziale (Okumura); Tirapugni da baccarat, Pugnale reale (Niijima: la pagina della guida è `palazzo-di-sae/`). «Non trovati» vuol dire solo che mancano nel catalogo, non che il nome sia sbagliato | AGS palazzo-di-kaneshiro/, -futaba/, -okumura/, -sae/ · alta |
| 10 | Libro «La fattorizzazione» senza articolo, posizione mercante-sakai | ✓ | si ottiene scambiando una Razione militare con Sakai a Kichijoji, dal 26 al 30/7 (G-031) | AGS libri/ · alta |
Per Stesura/Analisi dati: (1) è l'unica correzione strutturale (listino di Tanaka da rifare); (5) e (8) sono due nomi/cifre da correggere; il resto conferma i
dati o applica la regola «vince il listino».

## G-035 · L8 · Rilettura dei dati di gioco di L8 contro la guida (oltre a G-019, G-021, G-025)
Chiesto da: Manager · Data: 2026-10-20 · Stato: **chiusa** · Base: `lotti/L8/dati.md`, copia fresca di produzione

| # | Dato di L8 | Esito | Valore giusto / nota | Fonte · certezza |
|---|---|---|---|---|
| 1 | «7 Ombre non reclutabili» (§2): Melma nera / «Fango pulsante», Pixie superiore / «Maestra degli scherzi», 4 Servobot, Straziato re dei desideri | **2 sono errori dei dati** | nel **Palazzo di Kaneshiro** le due righe hanno **Ombra e maschera scambiate**: l'Ombra è «Fango pulsante» (Persona **Black Ooze = Melma nera**, liv. 18, Timida) e «Maestra degli scherzi» (Persona **High Pixie = Pixie superiore**, liv. 16, Irritabile); nei Memento le stesse righe sono scritte giuste. Sono **reclutabili** → le non reclutabili sono **5**: i 4 Servobot di Okumura (assenti dalle Ombre dei dati di gioco) e lo Straziato re dei desideri | dati di gioco aqiu384 `roy-enemy-data.json` («Pulsing Mud» → Black Ooze, «Prankster Leader» → High Pixie, area Bank); traduzione dell'app: Black Ooze «Melma nera», High Pixie «Pixie superiore» · alta |
| 2 | «Straziato re dei desideri» (Memento, Da'at): senza maschera, «Non reclutabile» | ✓ con una nota | nei dati di gioco è «Torn King of Desire», maschera **Mara**, liv. 60, Irritabile, area «Qliphoth». È l'obiettivo di una richiesta: non si negozia → «non reclutabile» regge; la maschera si può segnare (Mara) | aqiu384 `roy-enemy-data.json` · media |
| 3 | Nomi italiani di Ombra doppi | **due nomi per la stessa Ombra** | High Pixie: «Maestra degli scherzi» (Battaglia, dalla guida) contro «Capo dei burloni» (`traduzione` della negoziazione); Mara: «Straziato re dei desideri» contro «Re lacerato dei desideri». Vale il nome della **guida** (Battaglia); l'altro va fra i nomi alternativi | dati dell'app; AGS pagine dei Palazzi e dei Dedali · alta |
| 4 | Personalità «null» 74 / «-» / «Non reclutabile» (§5) | completate | in G-021 (allegato §5): 71 dai dati di gioco (69 + 2 corrette per nome), Orlov «-» → **Giocosa**; i 4 Servobot non negoziabili | G-021 · alta |
| 5 | «Dove si incontra»: 90 Persona con fonti diverse, «quasi sempre per copertura» | ✓ | conferma il metodo (unione delle fonti): i dati di gioco danno per ogni Ombra l'area (Castle, Museum, Bank, Pyramid, Spaceport, Casino, Cruiser, Laboratory, Depths, nomi dei Dedali), coerente con l'unione | aqiu384 `roy-enemy-data.json` (campo «areas») · alta |
| 6 | Iweleth: 9 Persona doppie fra il «Palazzo» e il dedalo | ✓ | sono le stesse Ombre (dati di gioco: area «Depths»); il collegamento proposto è giusto | aqiu384 · alta |
| 7 | Debolezze contro compendio (§3) | (G-019) | 4 Ombre con affinità proprie: Take-Minakata, Mithras, Bugs, Power | G-019 · alta |
| 8 | Persona del gruppo (§7) e nomi degli elementi (§7.1) | (G-025) | confermati | G-025 · alta |
Per Stesura/Analisi dati: (1) va corretto nella migrazione delle Ombre (le due righe di Kaneshiro diventano reclutabili, con Persona e personalità giuste; i
«non reclutabili» sono 5); (3) è una scelta di nome (vale la guida).

## G-036 · L9 · Rilettura dei dati di gioco di L9 (Confidenti, attività, calendario) contro la guida
Chiesto da: Manager (bacheca) · Data: 2026-10-20 · Stato: **chiusa** · Base: `lotti/L9/dati.md`, copia fresca di produzione

### A. Disponibilità dei Confidenti (`confidente_disponibilita`): la guida in giorni e fasce
Fonte comune: AGS, pagine «guida-rango-confidente-di-…», sezione «Disponibilità di …», e il calendario
https://www.allgamestaff.it/persona-5-royal-guida-confidenti/ («Disponibilità settimanale – Giorno/Sera»), che coincide con le schede.
| Confidente | Oggi | Guida | Esito | Certezza |
|---|---|---|---|---|
| ryuji | frase | **giorno, tutti i giorni**; R2, R3, R6, R8 all'aperto (no pioggia); R7 di sera, a date fisse dopo un suo messaggio; R5 dal 6/5; luogo: corridoio fuori dall'aula | da strutturare | alta |
| ann | lun/mar/mer/ven/dom, «giorno; anche sera nei giorni di pioggia (secondo fonti…)» | **solo giorno**, lun/mar/mer/ven/dom; R3, R4, R5, R7, R9, R10 no con la pioggia; luogo: **Centro commerciale sotterraneo** (l'Aula 2-D solo il 6/5) | togliere «anche sera con la pioggia» (non è nella guida); luogo da correggere | alta |
| haru | date fisse dell'itinerario | **solo giorno, da lunedì a sabato**, mai con la pioggia; luogo: Tetto della Shujin | da strutturare | alta |
| makoto | date fisse dell'itinerario | **solo giorno**, mar/gio/sab/dom; R2 e R9 no con la pioggia; luogo: Cancello della scuola (R6, R8, R10 amicizia: fuori dalla Biblioteca, 3° piano) | da strutturare | alta (G-033) |
| yusuke | date fisse dell'itinerario | **solo giorno, tutti i giorni**; R4, R6, R9 no con la pioggia; luogo: Sottopasso di Shibuya | da strutturare (G-016b) | alta |
| futaba | date fisse dell'itinerario | **solo giorno**, mer/gio/sab/dom, mai con la pioggia; si incontra fuori dal Leblanc | da strutturare | alta |
| kasumi | vuoto | **nessun giorno fisso**: si avanza solo dopo un suo messaggio o incontrandola a Kichijoji (Galleria) lo stesso giorno; bloccata al R5 (da raggiungere entro il 22/12), sblocco il 12/1 con Maruki al massimo; R6–R9 dal 13/1, 14/1, 16/1, 18/1 | da strutturare come «su messaggio» | alta |
| gemelle | «sempre accessibile… dopo il completamento del Palazzo di Madarame» | **nessun limite di calendario**, senza consumare tempo; **dal 18/5** (durante Madarame), scadenza 24/12 | correggere «dopo il completamento» (G-016b) | alta |
| kawakami | ven/sab sera | ✓ giorni e fascia; **luogo: telefono a pagamento del Leblanc** («appartamento/vari luoghi» non risulta) | correggere il luogo (G-016b, G-033) | alta |
| yoshida | domenica sera | ✓, **più i festivi**; no con la pioggia; ultimo giorno utile 13/11 | aggiungere i festivi | alta (G-033) |
| mishima | sera tutti i giorni | ✓; R3, R6, R7, R8, R10 no con la pioggia; **non disponibile nei due giorni dopo ogni salto di rango**; prima servono le sue richieste nei Memento | aggiungere l'eccezione | alta |
| akechi | lun–sab sera | ✓; R4 no con la pioggia; la guida dà il R6 **dal 3/9** (il walkthrough dei dati di gioco «8/28+»: discordanza, G-020) | ✓ (nota) | alta / media sul R6 |
| iwai, ohya, chihaya, shinya, sojiro, takemi, maruki, hifumi | — | coincidono con la guida (G-013, G-015, G-033) | ✓ | alta |
| igor, morgana, sae | date di trama | automatici (G-016d) | ✓ | alta |

### B. Altri dati
| # | Dato | Esito | Fonte · certezza |
|---|---|---|---|
| 1 | Voci del diario di **Lavenza** e delle Gemelle legate a **igor** (sono **4**: 165b8cb3… 06-08, 85cce8fc… 09-06, d26ea049… 11-06 «Gemelle Custodi - Forza»; 5cb911c7… 01-11 «Lavenza - Il Matto»; consegnate ad Analisi dati per l'elenco «Da approvare») | la guida tratta Lavenza dentro il Confidente **Forza** (le Gemelle: «13 Gennaio (Lavenza)» nelle loro scelte di dialogo); per Igor è solo il risultato della fusione delle Gemelle → riferimento giusto **gemelle**, non igor (elenco da approvare; se nel validato, solo col sì) | AGS guida delle Gemelle (indice) e di Igor, «Rango 10» · media |
| 2 | «**Junichi** Iwai» (2 testi) | il nome è **Munehisa Iwai**; «Junichi» non compare nella guida | AGS guida-rango-confidente-di-iwai-appeso/ · alta |
| 3 | Paga dei 4 lavori (Triple Seven 3.500/7.400, Rafflesia 3.200/7.800, Ore no Beko 3.600/8.800, Crossroads 7.200/12.000) | ✓ tutte coincidono (Crossroads: 12.000 è la **domenica**, non un massimo per il quiz) | AGS lavori-part-time/ · alta |
| 4 | Quiz del Triple Seven: 7, 17, 27 | ✓ «Il 7, 17 e 27 di ogni mese» | AGS lavori-part-time/ · alta |
| 5 | Esami: 4 sessioni da 3 giorni (05-11/13, 07-13/15, 10-17/19, 12-20/22), risultati 05-20, 07-19, 10-24, 12-24 | ✓ (la tabella della guida dice 4 giorni: 11–14/5, 13–16/7, 17–20/10, 20–23/12, ma le domande coprono 3 giorni: vale la scelta dell'app, con nota) | AGS interrogazioni-esami-risposte/, «Periodi d'esame» · alta |
| 6 | Calendario: scadenze di Madarame (05-18, 05-31, 06-05) | ✓ (G-007) | — |
| 7 | Meteo 05-24 | da approvare (G-016a) | — |
| 8 | Bonus degli esami | 7 Confidenti, con Ann (G-020) | — |
Per Stesura/Analisi dati: A è la correzione principale (8 Confidenti da strutturare in giorni e fasce, più luoghi ed eccezioni); B1 e B2 sono due correzioni
di riferimento/nome.

## G-037 · L10 · Rilettura dei dati di gioco di L10 (diario dopo il 06-01, inviti, eventi, domande, cruciverba)
Chiesto da: Manager (bacheca) · Data: 2026-10-20 · Stato: **chiusa** · Base: `lotti/L10/dati.md`, copia fresca di produzione

| # | Dato di L10 | Esito | Valore giusto / proposta | Fonte · certezza |
|---|---|---|---|---|
| 1 | 38 cruciverba (data di disponibilità = risposta) | ✓ tutte e 38 coincidono | — (la data è quella della prima comparsa; se non si risolve, il cruciverba si ripropone dopo) | AGS cruciverba/, «Elenco completo delle soluzioni dei 38 Cruciverba» · alta |
| 2 | Voci del diario 08-16 «Cruciverba (Ustione)» `889aefc1…` e 08-29 «Cruciverba (Hacker)» `a67565bf…` | **giorno sbagliato nel diario** | Ustione è del **17/8**, Hacker del **30/8** (il 29/8 è la gita in spiaggia). L'abbinamento per risposta di L10 è giusto; la data della voce è da rivedere con l'utente (fuori dal validato, ma voci della guida: nessuno spostamento senza sì) | AGS cruciverba/: «Data di disponibilità: 17 AGOSTO» / «30 AGOSTO»; AGS soluzione-settimana-19/, -20/ · alta |
| 3 | Voce 07-07 `b9e2763b…` «domande in classe Via Lattea / Somen» senza domanda | **manca la domanda** nella tabella `domanda` | il 7/7 c'è davvero una domanda in classe (si aiuta Ann): «La Via Lattea» e poi «Somen»; premio Fascino +1 e 2 punti con Ann → **domanda da aggiungere** (07-07, classe, due risposte) | AGS soluzione-settimana-13/, «7 LUGLIO»: «dovremo nuovamente aiutare Ann a rispondere ad alcune domande» · alta |
| 4 | Voce 10-15 `6c8e3422…` «schivare il gesso, prova di Perizia» (tipo esame) | non è una domanda | è il **gesso del Prof. Ushimaru**: si schiva in base alla Perizia (1: 33%, 3: 66%, 5: 100%), se lo schivi Fascino +2 → effetto della voce, non una domanda | AGS soluzione-settimana-26/, «15 OTTOBRE»; AGS interrogazioni-esami-risposte/, «Curiosità: il gesso del Prof. Ushimaru» · alta |
| 5 | Voce 10-31 `09077817…` «cruciverba scolastico» (tipo esame) | **non esiste** | il 31/10 c'è il **tempo libero in classe** con Kawakami (Rango 5) e la sera il cruciverba normale «Stand»; un «cruciverba scolastico» la guida non lo nomina → voce da rivedere (testo e tipo) | AGS soluzione-settimana-28/, «31 OTTOBRE»: «avremo del tempo libero in classe, grazie a Kawakami!» · alta |
| 6 | Domande 09-06 (cronostasi) e 10-06 (ghigliottina) senza voce | date ✓ | 6/9 Prof. Maruki «Cronostasi»; 6/10 Prof. Inui: la guida chiede «chi ha inventato questo congegno?» → «Joseph-Ignace Guillotin» (la domanda dell'app è riformulata: nota) | AGS interrogazioni-esami-risposte/, «Prof. Maruki → 6 Settembre», «Prof. Inui → 6 Ottobre» · alta |
| 7 | 8 voci d'invito dopo il 06-01 | ✓ | G-023 e G-028 (Makoto 07-30 con la condizione scritta) | — |
| 8 | Inviti vecchi del diario (11-16 «Possibile invito da Akechi», 01-28 Futaba ad Akihabara, 01-29 Kasumi a Maihama, 01-01 Kasumi al Santuario Meiji) | non sono sblocchi | sono uscite dei Confidenti (i posti sono già aperti): nessuna condizione di sblocco da collegare | G-018, G-023 · alta |
Per Stesura/Analisi dati: (3) è un dato mancante da aggiungere; (2), (4) e (5) sono voci da rivedere con l'utente (data o tipo/testo); il resto conferma.

## G-038 · L11 · Rilettura dei dati di gioco di L11 (nomi, sinonimi di ricerca, elenco «Da rivedere»)
Chiesto da: Manager (bacheca) · Data: 2026-10-20 · Stato: **chiusa** · Base: `lotti/L11/dati.md` §3 e §6

**A. Elenco «Da rivedere» (R11-10c): i dati di gioco delle voci di oggi.**
- (2) Voci boss di Madarame con «Gelo» e «respinge»: la scheda del boss **nella guida stessa** scrive «Fuoco, Gelo, Elettricità, Vento». La proposta
  (Ghiaccio, Riflette) segue il nome unico degli elementi di G-025: è un'uniformazione, non una correzione della fonte. Il motivo per l'utente dovrebbe dirlo:
  «La guida scrive "Gelo" in questa scheda e "Ghiaccio" nel resto; proposta: "Ghiaccio" ovunque.» Certezza alta.
- (3) Il forziere di Kamoshida «non più ottenibile»: è un'anomalia dello **stato** della partita (L7 §11), non un dato di gioco: niente da verificare sulla guida.
- (6) Le voci dell'Esperto (Sakura Residence, «Pagine ammuffite», pin 811) e (7) Hagoromo: già scritte da me (G-030, G-031, G-033) ✓.
- (9) Tanaka: G-034 ✓.
- Da aggiungere dopo G-036 e G-037: le **4 voci di Lavenza e delle Gemelle** su igor (consegnate ad Analisi dati con i motivi), le voci dei **cruciverba** 08-16 e
  08-29 (giorno sbagliato), le voci **10-15** e **10-31** (tipo e testo).

**B. Sinonimi per la ricerca globale (`nomiAltri`)**: i nomi che l'utente può cercare e che oggi non sono tutti nella `traduzione`. Proposta, dalla guida:
| Oggetto | Nome principale (guida) | Sinonimi da aggiungere | Fonte |
|---|---|---|---|
| Persona del gruppo (27) | Ecate, Mercurio, Ioanna, Prometeo, Ervardo, Cenerentola… | Hecate, Mercurius, Johanna, Prometheus, Hereward, Cendrillon, Célestine/Celestine | G-025 |
| Membri del gruppo | Ryuji, Ann, Morgana, Yusuke, Makoto, Futaba, Haru, Akechi, Kasumi | i nomi in codice che la guida usa: **Skull, Panther, Mona, Fox, Queen, Oracle, Noir, Crow**, Joker (protagonista); **Sumire** per Kasumi | AGS (es. «arma per Queen», «per Noir», «per Skull», «Un'arma per Mona»); G-036 (Kasumi/Sumire) |
| Persona del compendio | nome della guida (58 diversi dall'inglese, es. Reggente, Collana della Regina, Babau) | nome inglese (già in `traduzione`); varianti di grafia della guida: **Koropokguru**/Koropokkuru, **Norna**/Norn, Jack-o'-Lantern con apostrofo dritto e curvo | glossario-localizzazione.md; G-019 |
| Ombre | nome della guida (Battaglia) | il nome della `traduzione` della negoziazione dove è diverso (es. «Capo dei burloni» per Maestra degli scherzi, «Re lacerato dei desideri» per Straziato re dei desideri) e il nome inglese | G-035 |
| Oggetti | nome della guida, anche abbreviato | la forma estesa delle abbreviazioni del menu (Portaf. → Portafortuna, Amul. → Amuleto, Spec. → Specchio) e il nome inglese | G-024 |
| Luoghi e Palazzi | nome della guida | Palazzo di **Niijima** / di **Sae**; Palazzo di **Maruki** / «**Palazzo sconosciuto**»; **Memento**/Mementos; Stanza di Velluto/Velvet Room; Covo dei Ladri/Thieves Den; Jinbocho/Kanda | G-022, G-004, G-031 |
Certezza: alta per i nomi tratti dalla guida e da G-019…G-036; i nomi in codice sono quelli che la guida usa nel testo (forma inglese anche nella versione italiana).

## G-024 · L7 · Nome italiano dell'equipaggiamento; prezzo del Braccialetto d'argento
Chiesto da: Project manager (L7 modifiche §8, punti 2 e 6) · Stato: **chiusa** per i nomi, **non risolta** per il prezzo

**1. Nomi dell'equipaggiamento: non ci sono due traduzioni dello stesso pezzo.**
- I nomi della `traduzione` del dataset (ambito `oggetto`, 223) **vengono anch'essi dalla guida italiana**. Il commit a6afb365 del 2026-09-04
  («10.4 nomi italiani completi di skill, Persona ed equipaggiamento dalla guida») li ha abbinati alla guida per statistiche, effetto ed
  esecuzione: 220 certi, 3 probabili.
- Le due serie sono **oggetti diversi**: i 223 del dataset sono l'equipaggiamento che si ottiene con l'**itemizzazione** (Sedia elettrica:
  «Apocalisse», «Gran frusta del Nakara», «Contratto mortale»…); i 277 dei listini sono l'equipaggiamento **in vendita** nei negozi (Untouchable,
  Stoneon…: «Kogatana nera», «Pugnale della tormenta», «Kukri»…). Per questo coincidono solo 3 nomi (5 oggetti); nessuna coppia nel campione
  abbina per statistiche (es. armi da mischia di Untouchable: Attacco 50–184; armi del dataset: Attacco 130–350).
- **Regola**: il nome italiano del gioco è **quello della guida allgamestaff**, che riporta i nomi del menu del gioco **comprese le abbreviazioni**
  («Portaf. guarigione», «Portaf. del supporto», «Fascia capel. nera R», «Amul. dell'Imperatore»). È già una **decisione dell'utente**
  (DECISIONI 2026-09-04: «i nomi degli oggetti… restano quelli della guida italiana»).
- **Eccezioni**:
  - la guida a volte scrive lo stesso oggetto per esteso e abbreviato. In quel caso si mostra la forma estesa e l'abbreviata va fra i «nomi
    altri», come già deciso per «Amuleto dell'Imperatore» (glossario-localizzazione.md);
  - i 3 probabili del dataset: il nome resta quello della guida, con la certezza segnata.
- **Conseguenza per L7 §8.2**: non serve scegliere fra due nomi. Articolo del listino e oggetto del dataset sono **due oggetti**, salvo i 3 nomi
  uguali. La proposta «il nome AGS del listino entra nei nomi altri» non serve, perché il nome è già lo stesso o l'oggetto è un altro.
Fonti: `git show a6afb365` (messaggio del commit); `docs/DECISIONI.md` (2026-09-04, fedeltà dei nomi); `docs/riferimenti/glossario-localizzazione.md`
(abbreviazioni); AGS armi-da-mischia/ (fonte dei listini); `docs/analisi/verifica-percorso-grezza.json` («Portaf. guarigione», citazione della guida).
Certezza: **alta** sull'origine dei nomi e sulla regola; **media** sul fatto che le due serie non si sovrappongano oltre i 3 nomi (verificato per
statistiche sulle armi; per gli accessori l'effetto è scritto in modo diverso e il confronto non è possibile).

**2. Braccialetto d'argento: 78.000 o 68.000?** La guida italiana si contraddice da sola:
- pagina dei regali (AGS guida-regali-confidenti/, 7 tabelle: Ryuji, Yusuke, Sojiro, Akechi, Iwai, Shinya, Maruki): «78.000 Yen», negozio
  Tsurukame Diamond (Centro comm. sotterraneo di Shibuya), +3;
- elenco dei negozi (AGS elenco-dei-negozi/, «Tsurukame Diamond»): «68.000 ¥», quantità 1, rifornimento «Il 1° del mese successivo».
Una delle due è un refuso, ma **nessuna terza fonte leggibile** lo dice: Samurai Gamers non risponde (connessione rifiutata), il walkthrough di
aqiu384 non cita l'oggetto, Fandom e megatenwiki non sono leggibili. La tabella del negozio è più dettagliata (quantità, rifornimento) e nello
stesso negozio l'Anello del cuore (88.000) coincide fra le due pagine.
→ Prudente: si applica la regola già scelta in L7 (**vince il listino: 68.000**) e 78.000 resta come nota «la pagina dei regali della guida dice
78.000». Da riverificare in gioco o con Samurai Gamers quando torna raggiungibile. Certezza: **bassa**.

## G-025 · L8 · Le 27 Persona del gruppo; nome italiano unico degli elementi
Chiesto da: Project manager (L8 modifiche) · Stato: **chiusa** (2 punti a certezza media) · **Dettaglio nell'allegato `guida/G-025-persona-del-gruppo.md`**

**Risposta in breve.**
- Le 27 Persona sono **9 membri × 3 forme**: Captain Kidd → Seiten Taisei → William; Carmen → **Ecate** → Célestine; Zorro → **Mercurio** → Diego;
  Goemon → Kamu Susano-o → Gorokichi; **Ioanna** → Anat → Agnes; Necronomicon → **Prometeo** → Al Azif; Milady → Astarte → Lucy; Robin Hood →
  Loki → **Ervardo**; **Cenerentola** → Vanadis → Ella. In grassetto i nomi che la guida italiana scrive diversi dall'inglese.
- Per ogni Persona l'allegato dà l'arcano (quello del membro), il livello di partenza, le affinità prima e dopo il risveglio e tutte le skill col livello
  (dati estratti dal gioco, aqiu384 `roy-party-data.json`, nomi italiani dalla traduzione dell'app). Dà anche data e condizione della 2ª e 3ª forma e i
  tratti (guida italiana, pagine dei Confidenti e dei tratti).
- Il tratto cambia solo alla 3ª forma. Le resistenze migliorano alla 2ª: un elemento passa da resiste ad annulla e se ne aggiunge uno resistito.
  Per la 3ª forma nessuna fonte dà resistenze diverse dalla 2ª: **non risulta**.
- **Elementi** (forma della guida = gioco in italiano): Fisico, Arma da fuoco, Fuoco, Ghiaccio, **Elettricità**, Vento, **Psicocinesi**, Nucleare,
  **Sacro**, **Maledizione**, **Divino**; tipi: **Alterazioni**, **Recupero**, Supporto, Passive, Tratti; esiti: Debole, Resiste, Annulla, **Riflette**,
  Assorbe. **Da correggere nell'app**:
  - «Psichico» → Psicocinesi, «Oscurità» → Maledizione, «Quasi-divino» → Divino, «Guarigione» → Recupero;
  - nella Battaglia «Tuono» → Elettricità, «Gelo» → Ghiaccio, «respinge» → Riflette.
Certezza: **alta** per nomi, date, tratti, affinità e skill delle forme di partenza e della 2ª forma; **media** per la data di Loki e per Ella del 2/2
(guida letta in sintesi su quel punto).
### Seguito di G-025 (richiesta di Stesura modifiche)
- **Nessuna skill manca.** Tutte le skill e i tratti delle 27 forme (88 nomi distinti, compresi Laevateinn, Hyakka Ryouran, Masquerade, Agneyastra,
  le skill di navigazione di Futaba e i tratti della 3ª forma) sono già nella tabella `skill` per **nome canonico** (copia di produzione, 525 righe):
  controllo per nome esatto sui dati di Royal. Non servono schede nuove.
- **Dati strutturati delle 27 forme**: `guida/G-025-persona-del-gruppo.json`. Per ogni forma: membro, numero della forma, nome canonico, nome italiano,
  arcano, livello, quando si ottiene, tratto, affinità per elemento (chiavi phys…curse, codici wk/rs/nu/rp/ab/-), statistiche iniziali e massime
  ([forza, magia, resistenza, agilità, fortuna]), elemento d'eredità, skill con livello e «come si impara». Il file è **un dato da portare nel
  repository**: lo mette l'Implementazione BE in `server/db/migrations/dati/` (l'Esperto non scrive nel repository).
- **Come si impara una skill senza livello** (lettura dei codici dei dati, certezza media): codice 516 = **2ª forma** (sempre le «Evita…», più le
  skill di navigazione Egida suprema e Acchiappa-tesori per Futaba); 517 = **3ª forma** (il tratto nuovo e una skill propria: Spirito combattivo,
  Super-energia, Sprint miracoloso, Hyakka Ryouran, Scacco matto, Supporto definitivo, Muro della vita, Lama della ribellione, Masquerade); altri valori
  = **ranghi del Confidente** (le 6 skill di navigazione di Necronomicon, già nella 1ª forma).
- **Akechi**: Robin Hood e Loki sono due Persona distinte nei dati (livello 45 e 75); Ervardo deriva da Loki.

## G-023 · L6/L10 · Gli inviti dei Confidenti che sbloccano un quartiere (O-1…O-7): data, fascia, luogo, voce del diario
Chiesto da: Project manager, Analisi dati (L10 dati §8: 7 voci evento nuove da far approvare), Analisi requisiti (L6 R6-08d) · Stato: **chiusa (con 3 correzioni)**

**Fonte principale**: il walkthrough con i dati estratti dal gioco Royal (https://aqiu384.github.io/megaten-database/p5r/ace-walkthrough.html),
che elenca gli inviti giorno per giorno («<Arcano> Invite <posto> (<posto> Location unlocked)») con i requisiti; la guida italiana per il messaggio
della sera prima dove lo racconta. **Samurai Gamers** (hangout-spots-list, sezione «Books») è del 2020, vale insieme per P5 e P5R e le sue date per
Mishima e Ann **non** coincidono con i dati di Royal: dove discorda, vale il walkthrough.

| # | Invito (come oggi in G-018) | **Dato verificato (Royal)** | Data e fascia | Messaggio | Requisiti | Luogo | Fonte · citazione | Certezza |
|---|---|---|---|---|---|---|---|---|
| O-1 | Mishima → Harajuku, 3/8 | **Ryuji** (Carro) → Harajuku | **29/5, giorno** | non indicato | Palazzo del museo (Madarame) completato | Harajuku (Takenoko Street) | walkthrough 5/29 «Chariot Invite Harajuku (Harajuku Location unlocked)» | alta (l'invito di Mishima non esiste in Royal) |
| O-2 | Mishima → Ikebukuro, 28/7 | **non esiste** in Royal (il 28/7: Ryuji al Leblanc di giorno, Makoto al cinema la sera) | — | — | — | — | walkthrough 7/28 | alta |
| O-3 | Makoto → Ikebukuro, 30/7 | **Makoto** (Papessa) → Ikebukuro | **30/7 (sabato), giorno** | non indicato | Palazzo della piramide (Futaba) completato; Imperatore Rango 1 | Ikebukuro | walkthrough 7/30 «Priestess Invite Ikebukuro (Ikebukuro Location unlocked)» | alta |
| O-4 | Ann → Santuario Meiji, 5/8 | **Ann** (Amanti) → Santuario Meiji | **6/8 (sabato), giorno** (non il 5/8) | non indicato | Palazzo della piramide completato; Morte Rango 1 (Takemi) | Santuario Meiji | walkthrough 8/06 «Lovers Invite Meiji-Shrine (Meiji-Shrine Location unlocked)» | alta |
| O-5 | Akechi → Shinagawa, 28-29/7 | **Akechi** (Giustizia) → Shinagawa (acquario) | **29/7 (venerdì), giorno** | la **sera del 28/7**, prima di dormire | Diavolo Rango 1 (Ohya) | Shinagawa, acquario | walkthrough 7/29 «Justice Invite Shinagawa (Shinagawa Location unlocked)»; AGS soluzione-settimana-16/, 28 luglio: «se vogliamo andare all'acquario con lui» | alta |
| O-6 | Futaba → Nakano, 9/10 | **Futaba** (Eremita) → Nakano | **9/10 (domenica), giorno** | la **sera dell'8/10** | Appeso Rango 1 (Iwai) | Nakano | walkthrough 10/09 «Hermit Invite Nakano (Nakano Location unlocked)»; AGS soluzione-settimana-25/ (letto in sintesi) | alta |
| O-7 | Ryuji → Ichigaya, 6/7 o 3/7 | **Ryuji** (Carro) → Ichigaya | **3/7 (domenica), giorno** | la **sera del 2/7**, a letto | Palazzo della banca (Kaneshiro) completato; Temperanza Rango 1 (Kawakami) | Ichigaya (laghetto) | walkthrough 7/03 «Chariot Invite Ichigaya (Ichigaya Location unlocked)»; Samurai «accept Ryuji's invitation on 7/3» | alta |
In più, il walkthrough ha un solo invito di Mishima: «Moon Invite Suidobashi - Optional» il **3/11, giorno** (Torre Rango 1), che non sblocca nulla
(Suidobashi è già aperto dal 9/6).

**Voci del diario proposte** (stile delle voci di oggi: messaggio la sera prima, uscita il giorno; `genere` azione, `tipo` confidente; testi in
italiano; **nessuna scrittura**, sono proposte da approvare):
| Data | Fascia | Testo della voce | Riferimento |
|---|---|---|---|
| 05-29 | giorno | «Rispondi all'invito di Ryuji ed esci con lui a Harajuku (sblocca il luogo di ritrovo Harajuku)» | confidente: ryuji |
| 07-02 | sera | «Ricevi il messaggio di Ryuji che ti propone di uscire domani» | confidente: ryuji |
| 07-03 | giorno | «Rispondi all'invito di Ryuji ed esci con lui a Ichigaya (sblocca il luogo di ritrovo Ichigaya)» | confidente: ryuji |
| 07-28 | sera | «Ricevi il messaggio di Akechi che ti chiede se vuoi andare all'acquario con lui domani» | confidente: akechi |
| 07-29 | giorno | «Rispondi all'invito di Akechi ed esci con lui all'acquario di Shinagawa (sblocca il luogo di ritrovo Shinagawa)» | confidente: akechi |
| 07-30 | giorno | «Rispondi all'invito di Makoto ed esci con lei a Ikebukuro (sblocca il luogo di ritrovo Ikebukuro)» | confidente: makoto |
| 08-06 | giorno | «Rispondi all'invito di Ann ed esci con lei al Santuario Meiji (sblocca il luogo di ritrovo Santuario Meiji)» | confidente: ann |
| 10-08 | sera | «Ricevi il messaggio di Futaba che ti chiede di uscire con lei domani» | confidente: futaba |
| 10-09 | giorno | «Rispondi all'invito di Futaba ed esci con lei a Nakano (sblocca il luogo di ritrovo Nakano)» | confidente: futaba |
Avvertenze:
- **05-29 sta dentro il diario validato dall'utente (04-01..06-01)**: aggiungere quella voce tocca il lavoro da preservare → solo con il sì esplicito
  dell'utente (il PM lo porta a lui). Le altre sono tutte dopo il 06-01.
- Per O-3, O-4, O-1 il walkthrough non dice quando arriva il messaggio: non propongo la voce della sera prima.
- Gli inviti arrivano solo se si hanno i requisiti indicati; che spariscano se il posto è già stato aperto con il libro non lo dice nessuna fonte.
**Effetto su G-018**: le condizioni alternative da tenere (decisione dell'utente) diventano: Harajuku = libro «Vague» **oppure invito di Ryuji (29/5)**;
Ikebukuro = libro «Cieli notturni» **oppure invito di Makoto (30/7)**; Santuario Meiji = libro **oppure invito di Ann (6/8)**; Shinagawa = libro **oppure
invito di Akechi (29/7)**; Nakano = libro **oppure invito di Futaba (9/10)**; Ichigaya = libro **oppure invito di Ryuji (3/7)**. Gli inviti di Mishima
(O-1, O-2) non esistono in Royal e vanno tolti.
