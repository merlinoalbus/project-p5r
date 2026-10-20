# L4 «Avanzamento unico» — requisiti

Autore: sessione «Analisi requisiti» (2026-10-20). Fonti: piano (righe 22-23, 52, 115, 117, 151, 207, 259-270, 366-367, 376-386, 396,
417, 437), memoria «Gerarchia del mondo» (rigenerabili/permanenti, precisazione dell'utente del 2026-10-19), «Lavoro da preservare»,
«Prove sui dati reali»; DECISIONI 2026-10-04 (spunta delle aree completate; Palazzo completato con Tesoro + boss + raccolto tutto, per gli effetti sostituita dalla decisione dell'utente del 2026-10-20 sui due livelli «concluso» e «completato», R4-22),
2026-10-09 (un pin su più voci, `spillo_voce`), 2026-10-11 (planimetria senza niente da raccogliere = completata), 2026-10-12/14/18
(spostare e copiare voci fra infiltrazioni), 2026-10-20 (D4). Contesto letto in sola lettura sulla copia `prod-20261020`.

## Obiettivo
**Lo stato sta sull'oggetto, non sul pin.** Ogni voce della guida di un Palazzo ha un tipo **permanente** (forziere, porta, scorciatoia,
Safe Room, meccanismo, tesoro, boss…: fatto una volta, fatto in tutte le infiltrazioni) o **rigenerabile** (oggetto, nemico,
ombra-sciagura: stato per partita **e** per infiltrazione). Il pin mostra lo stato di ciò che rappresenta; spuntare il pin o la voce è
la stessa azione, quindi voce e pin non possono divergere. Le **copie permanenti** di Madarame (stessi forzieri, porte, scorciatoie
ricopiati in più infiltrazioni) si fondono in **una voce in più infiltrazioni**, solo voce per voce dopo il sì dell'utente. Le
**schede senza mappa** (spilli senza planimetria) diventano voci o pin secondo il loro riferimento. Il completamento di area,
infiltrazione e Palazzo si calcola dai soli permanenti più tesoro e boss: i rigenerabili non bloccano il 100%.

**Fatto quando** (piano, riga 417): voce e pin non possono più divergere; un forziere aperto nella 2 è aperto nella 4, un oggetto si
ripropone; il 100% si raggiunge.

## Perimetro misurato (contesto, da confermare con `dati.md`)
- Tipi di voce presenti a Kamoshida/Madarame: boss, forziere, forziere-chiuso, meccanismo, miniboss, oggetto, ombra-sciagura, persona,
  porta, puzzle (Enigma), scorciatoia, sicura (Safe Room), storia, volonta, altro. **Nessuna voce di tipo «nemico»** (citato da D4).
- Madarame: 36 scorciatoie, 6 porte, 15+4 forzieri, 55 oggetti su 225 voci (copia precedente; 227 sulla 0440Z, con le due voci del boss in ordine 18 e 19). Il piano stimava ≈20 copie permanenti da fondere; con la regola dell'utente
  del 2026-10-20 (stesso testo + stessi pin + stessa infiltrazione) le copie sono 0 a Madarame e 1 in tutta la base (dubbio 8).
- Stati: `punto_partita` (stato per voce e partita: oggi solo «ottenuto», 525 righe; «esaurito» per le voci `esauribile`),
  `spillo_partita` (stato del pin), `spillo_voce` (pin↔voci, molti a molti, migrazione 098).
- Schede senza mappa: 187 (piano riga 367).

## Criteri di accettazione
Tipo: **F** funzionale, **UX** esperienza, **NR** no-reg, **L** layout.

### Permanenti e rigenerabili
- R4-01 [F] Ogni voce della guida di un Palazzo ha un carattere «permanente» o «rigenerabile», dedotto dal tipo secondo D4 e modificabile voce per voce dalla voce stessa; l'API della voce lo restituisce.
- R4-02 [F] Le voci descrittive (storia, altro) **tengono il loro segno** (lo stato già dato resta e si può dare e togliere) ma **non contano** nei completamenti (decisione dell'utente, 2026-10-20, tramite il PM; regola del 2026-10-04 sul conteggio mantenuta).
- R4-03 [F] Segnare una voce permanente in un'infiltrazione la mostra segnata in ogni altra infiltrazione che la contiene, nella guida e sui pin di tutte le planimetrie.
- R4-04 [F] Segnare una voce rigenerabile vale solo per l'infiltrazione in cui la si segna: nell'infiltrazione successiva la stessa voce si ripropone «da fare», e quella di prima resta segnata guardando la sua infiltrazione.
- R4-05 [F] Il pin di una voce rigenerabile mostra lo stato nell'infiltrazione che si sta guardando (aperta nella scheda del Palazzo o in corso nella partita).
- R4-06 [F] «Riapri» sulla voce toglie il segno a tutti i suoi pin: su tutte le planimetrie se è permanente, nell'infiltrazione guardata se è rigenerabile. I gesti sul singolo pin sono in R4-11.
- R4-07 [F] «Esaurito» (voci `esauribile`) resta un esito possibile accanto a «ottenuto», con le stesse regole di propagazione.
- R4-08 [F] Cambiare a mano il carattere di una voce (da rigenerabile a permanente o viceversa) non perde segni: la regola di conversione degli stati esistenti è dichiarata e provata (vedi dubbio 4).

### Lo stato sull'oggetto: voce e pin
- R4-09 [F] **Ogni pin tiene il suo stato**, per partita. Le voci con pin calcolano il loro stato dai pin: una voce è **fatta** quando tutti i suoi pin sono fatti, **in corso k/N** quando ne è fatta una parte, **da fare** quando nessuno lo è. Questa è la regola del difetto NR4-1, decisa dal PM (strada (a), 2026-10-20, `modifiche.md` §8.11), e sostituisce la versione precedente di questo criterio, «lo stato del pin si calcola dalle voci». Il motivo: l'utente segna gli oggetti uno a uno, e una voce con 8 pin, come «Raccogli e depreda le Installazioni Artistiche» di Madarame, non deve segnarsi intera raccogliendo un pin.
  - **Pin condivisi da voci rigenerabili di più infiltrazioni** (Madarame 40, Kamoshida 0): hanno lo stato **per infiltrazione**, letto nell'infiltrazione di contesto (R4-05). La migrazione ne crea le righe solo dove pin e voce di quell'infiltrazione sono già fatti (misura: Madarame p1, 90 righe), senza toccare le righe esistenti.
  - **Voci senza pin**: tengono il loro stato, come oggi.
  - **Oggetto permanente**: resta l'unità di conteggio (R4-24) ed è fatto quando lo sono tutte le sue voci.

  **Eccezione decisa dall'utente (2026-10-20)**: le divergenze già presenti nei dati prima della migrazione (gli 8 pin di Kamoshida p1 fatti con la voce non segnata) si conservano come sono — la migrazione non segna la voce e non toglie il «fatto» al pin — e restano finché l'utente non le risolve (R4-14b).
- R4-10 [F] Un pin senza voce (o senza oggetto) ha uno stato suo, per partita, come oggi.
- R4-11 [F] **I gesti**, allineati a `modifiche.md` §3.2 e §8.11 (rilievo O4-3 di Test funzionali):
  - **Sul pin** (popup, scheda, visore): segnare o togliere il segno agisce **solo su quel pin**. Per un pin condiviso da rigenerabili agisce solo nell'**infiltrazione di contesto**. Ogni voce del pin si ricalcola (k/N), e una voce i cui pin sono ora tutti fatti diventa fatta.
  - **Togliere il segno a un pin** toglie «fatta» a **ogni voce che lo contiene**, «esaurito» compreso: è la scelta dell'utente del 2026-10-09, mantenuta. Per le rigenerabili, solo alla voce dell'infiltrazione di contesto.
  - **Sulla voce** (elenco della guida, scheda del Palazzo): «Segna», o «Esaurito» se la voce è esauribile, segna **tutti i suoi pin**; per una rigenerabile, solo nella sua infiltrazione. Le altre voci che condividono quei pin si ricalcolano e possono diventare fatte, e l'interfaccia le elenca: «Segnate anche: …». «Riapri» toglie il segno a tutti i suoi pin, con una conferma che elenca le altre voci che si riaprono.
  - Il segno «tutte le voci del pin» della scelta del 2026-10-09 vale quindi **solo per le voci permanenti** e per le rigenerabili **dell'infiltrazione di contesto**: le rigenerabili di altre infiltrazioni sullo stesso pin non cambiano.
- R4-11b [F] **Perimetro del contatore k/N** (Analisi dati, `lotti/L4/dati.md` §11.5, misurato su sviluppo e produzione, che coincidono). Il contatore vale per le **88 voci** non descrittive con più di un pin, esclusa la voce «persona»: sono 89 contandola. Queste voci hanno **198 pin distinti**, di cui **90 collezionabili**. Sulle 89 voci i pin distinti sono 200, di cui 91 collezionabili. I numeri 237 e 117 citati altrove contano i **legami voce-pin**, non i pin: un pin condiviso da più voci conta più volte. Verifica: dopo la migrazione esattamente 88 voci mostrano il contatore k/N.

  Casi di prova (da `modifiche.md` §8.11), nella partita di prova:
  - **Installazioni Artistiche** (Madarame, 8 pin): raccoglierne 1 porta la voce a 1/8, e gli altri 7 pin restano com'erano. «Segna» sulla voce fa tutti e 8 i pin. Togliere un pin porta la voce a 7/8 e la voce non è più fatta.
  - **Pin con due voci**: toglierlo riapre entrambe.
  - **Pin condiviso di rigenerabili** raccolto nella 2ª infiltrazione: resta da fare nella 4ª, e la voce della 4ª non cambia.
  - Sulla prova NR4-1 del pin 2256 (Labirinto Contorto, Madarame): «presi» passa da 0 a 1, non a 2.
  - Lo stato visibile di p1 e p2 ha 0 differenze rispetto a prima della migrazione.
- R4-12 [F] Collegare, scollegare, copiare o spostare un pin o una voce (anche fra infiltrazioni, gesti del 2026-10-12/14/18) non rimette mai «da fare» un pin o una voce già fatti.
- R4-13 [F] I passi di un Enigma (puzzle) seguono le stesse regole: l'Enigma è fatto quando i suoi passi lo sono, e togliere un passo lo riapre.
- R4-14 [F] Nessuna strada di scrittura (guida, visore, scheda del Palazzo «Da raccogliere», editor, import, cestino) può produrre una divergenza voce/pin: un controllo sui dati dopo una serie di gesti misti trova zero divergenze **nuove** (le sole ammesse sono quelle conservate di R4-14b).
- R4-14b [F] Con la regola di R4-09 (lo stato del pin è suo e la voce lo calcola), una voce con più pin, non tutti fatti, è «in corso k/N»: non è una divergenza. Secondo `modifiche.md` §8.11 punto 6, le righe di divergenza di p1 restano marcate «da verificare» finché l'utente non fa uno dei due gesti. I due numeri contano cose diverse e sono giusti entrambi (PM, 2026-10-20). La decisione dell'utente riguarda **8 pin divergenti** di Kamoshida p1. Di questi, **4 sono pin di voci «Storia»**: tengono il loro segno e non danno divergenza (R4-02). Gli altri **4 (spilli 583, 615, 1992, 1993)** diventano righe di `divergenza_partita`: la voce è «in corso k/N» e il pin è «da verificare» fino a un gesto dell'utente. **Stato sulla base p5s 0503Z** (Analisi dati, `dati.md` §11.8): **0 divergenze**. L'utente ha segnato le voci, quindi né le 4 righe di `divergenza_partita` né gli 8 pin del §3 esistono più nei suoi dati. Kamoshida p1 è 71/71, con 0 voci in corso; k/N in p1 89 voci fatte su 89, in p2 39 fatte e 50 da fare; restano le 90 righe per infiltrazione di Madarame e i 40 pin condivisi; impronta nuova `ff3033cb…`. Il criterio si prova quindi **solo** sulla partita di prova, con una divergenza costruita (sotto). Il dettaglio che segue descrive i dati di prima, e serve a costruire il caso. Analisi dati l'aveva confermato sui dati, di sviluppo e di produzione (`dati.md` §3 e §11.2). Le **4 divergenze** sono tutte nella p1 di Kamoshida:
  - 583 «Seme lussuria verde», voce `seme-della-bramosia`, permanente;
  - 615 «Forziere», voce `raccogli-forziere-3`, permanente;
  - 1992 e 1993, i capitani delle guardie, voce `sconfiggi-i-capitani-delle-guardie`, rigenerabile: la divergenza vale nell'infiltrazione di contesto.

  I **4 pin con sole voci «Storia»** sono 1982, 1953, 1970 e 1971 (gli ultimi due sulla stessa voce `esplora-stanza-successiva`): tengono il loro stato e non danno divergenza.

  Le divergenze voce/pin conservate dalla migrazione (pin di Kamoshida p1 fatti con voce non segnata) sono mostrate dall'app come **«da verificare»** (sulla voce e sul pin, nella guida, nel visore e nella scheda del Palazzo) e si risolvono **solo con un gesto dell'utente** (segnare la voce, oppure togliere il fatto al pin); dopo il gesto valgono le regole normali e la divergenza sparisce. Nessuna scrittura automatica le risolve (decisione dell'utente, 2026-10-20). **Dove si prova**: se sulla copia di riferimento più recente le 4 divergenze di p1 non ci sono più, perché l'utente le ha risolte segnando le voci in produzione, la regola non cambia. Il criterio si prova su una **partita di prova** con una divergenza costruita (un pin fatto con la sua voce non segnata, per esempio uno dei pin 583, 615, 1992 e 1993) e con i due gesti:
  - «Segna la voce»: la voce e tutti i suoi pin risultano fatti, e il segno «da verificare» sparisce;
  - «Togli il fatto al pin»: il pin torna da fare, la voce resta com'è, e il segno sparisce.

  Su p1 reale si verifica solo che la migrazione non crei divergenze nuove e non scriva segni.

### Fusione delle copie permanenti (Madarame)
- R4-15 [F] Due voci sono **copie** solo se hanno **lo stesso testo** e sono **associate agli stessi pin nella stessa infiltrazione** (decisione dell'utente, 2026-10-20); altrimenti sono voci distinte (la stessa azione in momenti diversi e su pin diversi) e non si fondono. Esiste un elenco approvabile delle sole copie che rispondono a questa regola (per ogni gruppo: le voci, l'infiltrazione, i pin, gli stati delle due partite, la voce che resta); nessuna fusione si applica senza il sì dell'utente voce per voce.
- R4-15b [F] Le voci simili che non rispondono alla regola (stesso testo ma pin o infiltrazione diversi) restano distinte, ciascuna con il suo stato; nessun elenco le propone come fusioni.
- R4-16 [F] Una fusione approvata produce una voce in più infiltrazioni con lo stato unito (segnata se era segnata in almeno una copia, con la data più vecchia), i pin di tutte le copie collegati alla voce che resta e il testo della voce che resta invariato.
- R4-17 [F] Una fusione è reversibile dal cestino (o con un «separa») senza perdita di pin o stati.
- R4-18 [F] Il caso di prova del piano: una voce permanente (forziere) presente in più infiltrazioni, aperta nella seconda, risulta aperta nella quarta; un oggetto (rigenerabile) raccolto nella seconda si ripropone nella quarta. Due voci distinte secondo R4-15 (pin diversi) non si trascinano a vicenda. Con la regola dell'utente non ci sono copie da fondere a Madarame (0, Analisi dati): la prova si fa con una voce permanente legata a più infiltrazioni su una partita di prova (o creata sulla copia), non con una fusione.

### Schede senza mappa
- R4-19 [F] Le 187 schede senza mappa diventano voci o pin secondo il loro riferimento, con un elenco «prima → dopo» per scheda; i casi senza destinazione chiara vanno in un elenco da approvare, non si cancellano.
- R4-20 [F] Dopo la migrazione nessuna vista legge più le schede senza mappa come entità a sé (elenco dei lettori in `app.md`).

### Completamento
- R4-21 [F] Il completamento di area, infiltrazione e Palazzo si calcola dai soli permanenti più tesoro e boss; i rigenerabili non bloccano il 100%.
- R4-22 [F] Un Palazzo ha **due livelli**, calcolati da una funzione unica. Decisione dell'utente del 2026-10-20, presa sul caso concreto di Kamoshida p1 (56/71); per gli effetti **sostituisce** quella del 2026-10-04:
  - **«concluso»** = Tesoro del Palazzo raccolto **e** boss finale sconfitto (il pin del boss raccolto, oppure il boss segnato nella guida). Serve agli effetti di R4-25. Coerente con il gioco: dopo il furto il Palazzo sparisce (Esperto della guida, G-005);
  - **«completato»** = concluso **e** tutti i permanenti segnati (con «raccolto tutto» = tutti i permanenti, rigenerabili esclusi, R4-21). Serve all'anello, alla percentuale e al segno «Completato» del Palazzo.

  Restano le altre regole già scelte dall'utente: planimetria senza niente da raccogliere = completata (2026-10-11); ✓ dell'area e della stanza «per aree o per raccolta»; il boss non si segna da solo raccogliendo il Tesoro (2026-10-04). Verifiche, aggiornate al 2026-10-20: l'utente ha segnato in produzione le voci di Kamoshida, che ora è al 100%. Le regole non cambiano, cambia dove si prova il caso «concluso e non completato»:
  - **sulla partita reale copiata**, sulla copia di riferimento più recente del Collaudo: Kamoshida p1 risulta **concluso e completato** (le cifre esatte le dà Analisi dati);
  - **su una partita di prova** che riproduce lo stato di prima (Tesoro e boss fatti, 15 permanenti non segnate): il Palazzo risulta **concluso e non completato**, con l'anello a k/N senza il segno «Completato».
- R4-23 [F] Su una partita di prova si raggiunge il 100% di un Palazzo, cioè il livello «completato», segnando tutti i permanenti, il tesoro e il boss, lasciando rigenerabili non raccolti. Con solo Tesoro e boss il Palazzo è «concluso» ma non al 100%.
- R4-24 [F] Il conteggio delle aree con più planimetrie conta ogni voce una volta sola (la voce permanente su più planimetrie e più infiltrazioni non vale doppio).
- R4-25 [F] Gli effetti a valle seguono il livello **«concluso»** di R4-22 (decisione dell'utente del 2026-10-20):
  - l'ingresso al Palazzo che sparisce;
  - il cartellino sulla mappa di Tokyo;
  - i requisiti «Completare il Palazzo» e «dopo il Palazzo di X»;
  - le condizioni «Palazzo completato» (pin, Confidenti, disponibilità).

  Il livello «completato» resta solo per anello, percentuale e segno. Le condizioni «arco» restano legate alla data, non al completamento (2026-09-30). Le condizioni sui pin «Voce della guida» e «Pin di una mappa» seguono lo stato delle voci e dei pin (R4-09). Il requisito rosso dice cosa manca per «concluso» (Tesoro, boss).

  Verifica sulla **partita di prova** che riproduce lo stato di prima (Tesoro e boss fatti, 15 permanenti non segnate):
  - il Palazzo è concluso e non completato, e **non** ha l'ingresso visibile sulla metro né il cartellino sulla mappa di Tokyo;
  - i requisiti «Completare il Palazzo di Kamoshida» risultano soddisfatti;
  - l'anello mostra k/N senza il segno «Completato».

  Verifica sulla **partita reale copiata**, sulla copia più recente: Kamoshida p1 è concluso e completato, senza ingresso e con i requisiti verdi.

  Verifica sulla partita di prova: raccogliere Tesoro e boss rende il Palazzo «concluso» e toglie l'ingresso; togliere il Tesoro lo rimette.

### Lavoro da preservare e non regressione
- R4-26 [NR] Kamoshida (169 voci, pin dell'impronta) e Madarame (227 voci e 254 pin utente sulla copia 0440Z, impronta 263; 225/252 sulla copia precedente, base confermata dall'utente; 196/250 il 2026-10-19): testi, ordine, uid, tipo, dettagli, posizioni dei pin invariati, salvo le fusioni approvate, ciascuna spiegata nell'elenco.
- R4-27 [NR] Gli stati delle voci della partita reale copiata (p1) e di p2 risultano gli stessi voce per voce dopo la migrazione: la migrazione **non segna nessuna voce** che non fosse segnata. In particolare le **15 voci permanenti non segnate di Kamoshida p1 restano non segnate** e il «non completato» che ne deriva si accetta (decisione dell'utente, 2026-10-20, «1 B», sempre valida come regola). Aggiornamento del 2026-10-20: l'utente ha poi segnato queste voci in produzione, e sulla copia più recente Kamoshida è al 100%. Il criterio resta lo stesso, cioè la migrazione non segna nulla, e si verifica sulla copia di riferimento in uso: gli stati visibili dopo la migrazione sono uguali a quelli di quella copia. Dove prima un pin era fatto e la voce no (o viceversa), l'elenco delle divergenze di oggi dice come appare ciascuna dopo (vedi dubbio 2).
- R4-28 [NR] Le percentuali e i completamenti di oggi di Kamoshida e Madarame per p1 e p2: uguali, oppure diversi solo dove la regola nuova (rigenerabili esclusi, due livelli) o una fusione approvata lo spiega, voce per voce. Gli effetti visibili (ingressi, mappa di Tokyo, requisiti) restano uguali a oggi per ogni Palazzo il cui Tesoro e boss sono già fatti, perché seguono «concluso».
- R4-29 [NR] Collegare, segnare e togliere segni funzionano dalla guida, dal visore e dalla scheda del Palazzo su una partita di prova nuova, creata e poi rimossa.
- R4-30 [NR] I Memento non cambiano: stati delle aree dei dedali, timbri, Richieste, catture dal compendio identici.
- R4-31 [NR] Il diario 04-01..06-01 (255 voci sulla copia di produzione 0440Z del 2026-10-20; 254 sulla copia precedente) e le sue spunte invariati; le voci del diario che portano a un'infiltrazione aprono la stessa.
- R4-32 [NR] Il cestino rimette una voce o un pin eliminati con lo stato della partita (regola «quel che è cambiato dopo vince» del 2026-10-16).
- R4-33 [NR] Typecheck e lint verdi; test mirati (stati di voce e pin, completamento, condizioni-voce, condizioni-pin, guida-pin, migrazioni nuove) verdi con output grezzo.

### Esperienza e layout
- R4-34 [UX] Nella scheda del Palazzo e nel popup del pin si capisce a colpo d'occhio se una voce è permanente o rigenerabile e, per le rigenerabili, a quale infiltrazione si riferisce lo stato mostrato.
- R4-35 [UX] Dal tablet durante un'infiltrazione: segnare dal pin o dalla voce è un tocco; il riepilogo all'«Esci» (piano, flusso di gioco 6) può dire quanti permanenti e quanti rigenerabili si sono segnati (se il riepilogo non è di questo lotto, almeno i dati per farlo ci sono).
- R4-36 [UX] La finestra di approvazione delle fusioni è leggibile: per ogni gruppo si vedono le copie affiancate con infiltrazione, testo, pin e stato.
- R4-37 [L] Scheda del Palazzo, popup del pin, elenco delle fusioni e delle schede senza mappa: nessuno scorrimento orizzontale a 1280, 768, 375; bersagli ≥44 px; a 1366×657 e 1280×689 la scheda del Palazzo resta in una schermata con visore visibile.

## Decisioni coinvolte
| Decisione | Scelta consigliata applicata, da confermare | Effetto sui criteri |
|---|---|---|
| D4 Permanenti e rigenerabili | **Rigenerabili: oggetto, nemico, ombra-sciagura; tutto il resto permanente** (modificabile voce per voce) | R4-01..R4-08, R4-21; vedi dubbi 1 e 3 |
| D3 Iweleth | Solo come dedalo dei Memento | Le voci di Iweleth non si trattano in L4 se L3 le ha lasciate come Palazzo (dubbio 7 di L3) |

## Lavoro dell'utente da preservare toccato dal lotto
- **Kamoshida e Madarame, voci, pin e stati delle partite**: è il cuore del lotto; prova voce per voce e pin per pin sulla copia della
  produzione con la partita reale copiata e una di prova, elenco consegnato con la richiesta di rilascio.
- Le fusioni sono il solo cambio ammesso ai contenuti, e solo dopo il sì dell'utente voce per voce.
- Diario 04-01..06-01: non toccato (solo prova dei collegamenti).

## Dipendenze
- **L3 consegnato** (aree del Palazzo e legame infiltrazione↔area: lo stato per infiltrazione e il completamento dell'area si appoggiano lì).
- Prepara **L8** (Persona e Ombre: le voci di tipo persona e ombra-sciagura passano al compendio/entità Ombra; L4 non le converte) e
  **L10** (il diario come motore: «Entra»/«Esci» e il riepilogo).

## Casi dubbi da approvare (soluzione prudente proposta)
1. **Tipo «nemico» assente**: D4 lo cita ma nei dati non c'è. Prudente: la regola elenca oggetto, ombra-sciagura (e «nemico» se nascerà);
   **miniboss** e **boss** restano permanenti (il boss conta per il completamento), **persona** resta com'è fino a L8.
   **Esperto della guida (G-005, certezza alta)**: un tipo «nemico» distinto dalle Ombre non esiste nel gioco (la guida distingue Nemici
   potenti, Ombre sciagura, Mini Boss, Boss, Demoni del Tesoro; le Ombre comuni ricompaiono cambiando stanza). Boss e miniboss non si
   riaffrontano → permanenti (confermato). Forzieri già aperti non si riempiono di nuovo → permanenti; il contenuto di urne/vasi è casuale.
   Conseguenza: la regola D4 si applica come «oggetto, ombra-sciagura» (il «nemico» di D4 non ha un tipo nei dati); se l'utente vuole tracciare
   i Nemici potenti dei forzieri chiusi, sono permanenti (custodiscono il forziere).
2. **Divergenze voce/pin di oggi** — *deciso dall'utente (2026-10-20)*: le voci non si segnano in migrazione (le 15 permanenti di
   Kamoshida p1 restano «non completato»); i pin fatti con voce non segnata (8 a Kamoshida p1) tengono il fatto, la divergenza si conserva
   e l'app la mostra «da verificare» fino al gesto dell'utente (R4-09, R4-14b). Resta da confermare solo il caso inverso, se esiste nei
   dati (voce segnata, pin no): prudente, anche quello «da verificare», nessuna scrittura automatica.
3. **Ombra-sciagura rigenerabile**: per il gioco le Ombre sciagura ricompaiono? D4 dice sì; resta modificabile voce per voce.
   **Esperto della guida (G-005, certezza bassa)**: la guida le dice interessanti «per il farming» (incontri ripetuti) ma non scrive che si
   rigenerino. D4 resta plausibile: si applica «rigenerabile» come consigliato, modificabile voce per voce; da confermare con l'utente.
4. **Conversione degli stati quando si cambia carattere a una voce**: da rigenerabile a permanente → fatta se fatta in almeno
   un'infiltrazione; da permanente a rigenerabile → lo stato resta sull'infiltrazione in cui era stato segnato (se noto), altrimenti su tutte
   le sue infiltrazioni.
5. **Data e fonte dello stato unito in una fusione**: prende la data più vecchia e il flag `automatico` più prudente (manuale vince).
6. **Schede senza mappa senza riferimento**: restano come pin «da collocare», mai cancellate.
7. **Volontà (volonta), sicura, meccanismo, puzzle**: permanenti (sono nell'elenco «tutto il resto»). **Esperto della guida (G-005,
   certezza media)**: i Semi (la guida italiana dice «Semi della Bramosia», il nome cambia col Palazzo) sono 3 per Palazzo, il terzo dà il
   Cristallo, restano raccolti e uno mancato si compra da Jose → **permanenti** (chiuso). Nota di vocabolario per i testi: «Semi della
   Bramosia» a Kamoshida, non «Semi della volontà».
8. **Copie permanenti** — *deciso dall'utente (2026-10-20)*: sono copie solo voci con lo stesso testo associate agli stessi pin nella
   stessa infiltrazione (R4-15); tutte le altre sono voci distinte e non si propongono. *Conseguenza da confermare:* il caso del piano
   (R4-18, «un forziere aperto nella 2 è aperto nella 4») vale per una voce permanente che sta in più infiltrazioni (legata a più
   infiltrazioni o raggiunta dagli stessi pin); le voci distinte di oggi su pin diversi in infiltrazioni diverse restano due e si segnano
   ognuna per conto suo. **Misura con la regola nuova (Analisi dati, 2026-10-20)**: 0 copie a Madarame (la stima del piano, ≈20, non vale
   più) e 1 sola in tutta la base, «Oltrepassa le sbarre» di Kamoshida (2 voci storia senza pin). **Deciso dall'utente (2026-10-20)**: resta due voci, nessuna fusione.
   In L4 quindi non si applica alcuna fusione; l'elenco di R4-15 resta per i dati futuri.
9. **8 divergenze di Kamoshida p1** (pin fatto, voce non segnata) — **deciso dall'utente (2026-10-20)**: nessuna scrittura automatica; la
   migrazione non segna la voce e non toglie il fatto al pin; l'app le mostra «da verificare» e si risolvono solo con un gesto dell'utente
   (R4-14b).
