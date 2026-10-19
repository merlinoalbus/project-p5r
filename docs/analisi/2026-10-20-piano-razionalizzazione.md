# Piano di razionalizzazione P5R

> Copia del piano del 19 ottobre 2026 (https://claude.ai/artifact/SWLetSorHYyBiLqVCPu7jZ), riportata nel repository il
> 2026-10-20 come riferimento del branch `newreview` (istanza parallela https://p5s.nasmerlinoalbus.cloud). L'analisi AS-IS da
> cui parte è https://claude.ai/artifact/3jwzuzsqKQq8vqu1PimcLS. Lo stato di avanzamento dei lotti sta in `docs/ROADMAP.md`
> (fase «Razionalizzazione»), le scelte in `docs/DECISIONI.md`.

Come portare la guida e l'app a un modello unico: ogni cosa del gioco ha una sola identità, una sola fonte per ogni
informazione, una sola pagina e un solo modo di essere creata e modificata. Il piano parte dalle gerarchie indicate
dall'utente e dall'AS-IS. Si procede lotto per lotto.

## Le regole del modello

- **Una identità** — Ogni cosa del gioco ha una chiave sua e tutto il resto la cita per chiave, mai per nome. Oggi Persona,
  oggetti, regali e richieste si collegano per nome.
- **Una fonte** — Ogni informazione (nome, orari, sblocco, debolezze, prezzo) vive in un solo posto. Le copie spariscono; dove
  servono, si leggono dalla fonte.
- **Una casa** — Ogni oggetto ha una pagina sua, con un indirizzo stabile. Ogni link verso quell'oggetto porta lì. L'indietro
  è uno solo.
- **Un modo di gestire** — Creare, modificare ed eliminare una cosa si fa da un punto solo, dentro la sua pagina, con le stesse
  regole. Tutto passa dal cestino.
- **Lo stato sull'oggetto** — Lo stato di partita sta sull'oggetto (luogo, voce, Persona, articolo). Il pin mostra lo stato di
  ciò che rappresenta.
- **Un vocabolario di condizioni** — Disponibilità, sblocchi e requisiti usano un solo linguaggio strutturato e un solo
  valutatore. La prosa resta solo come nota.
- **Un'immagine** — L'immagine caricata è l'immagine di quell'oggetto ovunque. Le icone base valgono solo dove non ce n'è una.
- **Tutto modificabile** — Ogni dato di gioco si corregge dall'app, dalla pagina del suo oggetto, con «Ripristina» al valore
  della guida. Nessun dato resta solo nel pacchetto.
- **Si gioca da Partita** — Il giocatore sta in Partita: il diario del giorno aggiorna gli stati. Le schede di dettaglio si
  aprono ogni tanto, per consultare o correggere, e riportano al diario.

## Il flusso di gioco

1. **Partita › Oggi è la casa.** Il diario del giorno con le sue voci, la fascia, il meteo, la mappa e cosa è disponibile
   adesso.
2. **La spunta aggiorna tutto.** Spuntare una voce applica ciò che produce (fatti, attività, letture, rango, acquisti,
   domande, voci del Palazzo, Doti secondo D6); togliere la spunta lo annulla.
3. **Il dettaglio si apre dalla voce.** Ogni voce cita i suoi oggetti (Confidente, luogo, Palazzo, libro…): toccandoli si apre
   la loro scheda in un pannello sopra il diario, con lo stato di partita. Chiudendo si torna alla stessa voce.
4. **Nella scheda si consulta e si corregge.** Lo stato si può correggere a mano, e il diario lo mostra; i dati di gioco si
   modificano con «Modifica».
5. **Le pagine di guida restano per consultare** fuori dalla partita, con gli stessi indirizzi delle schede.
6. **Nel Metaverso il gioco passa alla scheda del posto.** Quando la voce del giorno è un'infiltrazione in un Palazzo o una
   visita ai Memento, «Entra» apre la sua scheda come vista di gioco: per il Palazzo gli step dell'infiltrazione in corso
   accanto alla mappa del Palazzo, interattiva (si segna dalla voce o dal pin, è la stessa cosa); per i Memento il menù del
   Dedalo, con aree, Ombre da catturare (dal compendio), Richieste e timbri. Gli avanzamenti si tracciano lì. «Esci» riporta al
   diario, e la voce del giorno risulta fatta con il riepilogo di cosa è avanzato.

| Dove sei | Vista di gioco | Cosa si traccia |
|---|---|---|
| Giornata normale | Partita › Oggi (diario) | Voci del giorno e i loro effetti |
| Infiltrazione in un Palazzo | Scheda del Palazzo, sull'infiltrazione in corso | Step dell'infiltrazione e pin sulla mappa delle sue aree; permanenti e rigenerabili |
| Visita ai Memento | Menù del Dedalo | Aree, catture (compendio), Richieste, timbri |

## Tutto modificabile

Oggi si modificano dall'app solo negozi, articoli, libri, film, attività, luoghi (in parte), domande, cruciverba, Palazzi e
voci della guida, richieste, mappe, voci del diario, requisiti dei Confidenti e traduzioni. Restano solo nel pacchetto:

| Area | Dati oggi non modificabili |
|---|---|
| Calendario | Eventi (storia, sblocco, scadenza, festa, esame), meteo e trama dei giorni, allerte meteo, settimane |
| Confidenti | Anagrafica, giorni e fasce, luogo, sblocco, punti per rango, abilità, risposte ai dialoghi, regali graditi, luoghi del Confidente |
| Persona e compendio | Persona, affinità, skill imparate, skill, ricette speciali, tesori, DLC |
| Ombre e battaglia | Ombre, debolezze, negoziazione, Mietitore, Ombre sciagura |
| Oggetti | Equipaggiamento, consumabili, materiali, chiave, fabbricazione, abiti, scambi (Jose compreso) |
| Città | Quartieri (nome, descrizione, sblocco), regole di sblocco di quartieri e luoghi, sblocco, piatti e Confidenti dei luoghi, sblocco dei negozi |
| Scuola | Esami (date, domande, premi) |
| Altro | Personaggi, sfide, trofei e completamento, ranghi delle Doti |

Ogni oggetto prende «Modifica» nella sua pagina, con lo stesso modulo per tutti: campi strutturati (condizioni, giorni, effetti
con i loro editor), testo libero solo per le note, «Ripristina» al valore della guida. Le correzioni restano dopo gli
aggiornamenti del pacchetto, come oggi per il catalogo.

## Registro dei dati: una fonte, un punto di modifica

Il cuore del piano. Per ogni informazione che oggi ha più di una copia: quante copie esistono (misurate su codice e dati),
quale diventa la fonte unica, l'unico punto in cui si modifica e chi la legge da lì. Tutte le altre copie si eliminano o
diventano un riferimento letto dal vivo. Le divergenze sono quelle misurate il 19 ottobre.

### Mondo e catalogo

| Informazione | Copie | Divergenze oggi | Fonte unica | Si modifica da | La leggono |
|---|---:|---|---|---|---|
| Nome di un luogo | 11 | Etichette dei libri 13/13, dei film 17/35 | Luogo | Pagina Luogo | Pin, scheda del quartiere, libri, film, negozio, attività, Confidente (le frasi «Shibuya, Central Street» spariscono: si leggono dalla sede) |
| Nome di un quartiere | 8 | Frasi dei negozi 27/57 | Quartiere | Pagina Quartiere | Metro, mappa del quartiere, posizioni, negozi, attività |
| Sblocco di un quartiere | 7 | 13 quartieri sempre «rossi» nelle condizioni; 3 libri ignorati | Condizione strutturata del quartiere | Pagina Quartiere | Città, metro, condizione «quartiere», calendario (derivato), libro (mostra cosa sblocca) |
| Prezzo di un oggetto | 7 | Regali 12/116, guida 5/100 | Articolo (prezzo in quel negozio) | Pagina Luogo › listino | Oggetto, regalo, libro, videogioco, popup della mappa, spesa del grado cliente |
| Immagine di una planimetria o di un quartiere | 7 | Indice con icona fissa; 332 asset calcolati inesistenti | Immagine della mappa | Pagina Area/Quartiere › immagine | Visore, indice, miniature, schede, metro |
| Confidente in un luogo (giorni, fasce) | 7 | 4 Confidenti senza luogo; prosa contraddittoria (Kawakami, Yusuke) | Disponibilità del Confidente (luogo + giorni + fasce) | Pagina Confidente | Scheda del luogo, «Dove si trova», disponibilità, diario (avviso se una voce è fuori giorno) |
| Nome di un articolo | 7 | 3 cataloghi senza chiave comune | Oggetto | Pagina Oggetto | Listini, regali, ricompense, forzieri, scambi, diario |
| Nome di un negozio | 6 | Voci del diario 11/16 | Negozio | Pagina Luogo › negozio | Diario (dal vivo), libri, regali, scambi |
| Orari e presenza | 5 | Scheda e visore diversi in 23/57 | Presenza del luogo | Pagina Luogo | Negozio, attività, pin, scheda del quartiere |
| Posizione di un luogo | 4 | 46 luoghi senza pin, 48 pin senza luogo | Pin sulla planimetria | Pagina Luogo › posiziona | Visore, «Dove si trova», scheda |
| Descrizione di un luogo | 4 | Pin nativi 40/40 diversi | Luogo | Pagina Luogo | Pin, scheda |
| Posizione dei quartieri sulla metro | 3 | 23/23 diverse fra server e interfaccia | Una sola tabella | Pagina Città (modifica) | Metro, mappa di Tokyo |
| Dove si trova un libro | 4 | 2 posizioni senza articolo | Articoli e posizioni per chiave | Pagina Oggetto | Libri, suggerimenti |
| Scambi (Jose, Tanaka, Sakai…) | 3 | Jose 24/37, Tanaka 4/20 | Listino del venditore | Pagina Luogo › listino | Oggetti, Richieste (Jose) |

### Palazzi, Memento, Persona e Ombre

| Informazione | Copie | Divergenze oggi | Fonte unica | Si modifica da | La leggono |
|---|---:|---|---|---|---|
| Nome italiano di una Persona | 9 | Rinominare spezza i collegamenti | Persona (nome italiano) | Pagina Persona | Ombre, voci, dedali, Tesori, party, diario: tutti per chiave |
| Apertura e scadenza di un Palazzo | 8 | Kamoshida 3 date; Madarame 3 scadenze; testi copiati 7/10 | Finestra del Palazzo | Pagina Palazzo | Scheda, metro, condizioni «arco», calendario (derivato), pin d'ingresso |
| Nome del Palazzo | 7 | Battaglia 4/10 | Palazzo | Pagina Palazzo | Mappa radice, condizioni, Battaglia, pin d'ingresso |
| Nome del dedalo | 6 | Richieste 6/33 | Dedalo | Menù del Dedalo | Richieste, Battaglia, scheda Persona |
| Debolezze di un'Ombra | 5 | 12/210 e 27/210 rispetto al compendio | Affinità della Persona | Pagina Persona | Ombra, dedalo, Battaglia, voci dei Palazzi |
| Nome italiano di un'Ombra | 5 | 145/183 rispetto alla negoziazione | Ombra | Pagina Ombra | Battaglia, dedali, voci, negoziazione |
| Personalità di un'Ombra | 5 | Valori fuori dalle 4 | Ombra | Pagina Ombra | Battaglia, negoziazione |
| Nome di un'area del Palazzo | 4 | Nome della mappa vince su quello dell'area | Area | Pagina Palazzo › area | Mappa, Battaglia, infiltrazioni |
| Timbri di un dedalo | 4 | Totale impostato 0/95; prosa 153, Jose 123 | Area del dedalo | Menù del Dedalo | Dedalo, Jose |
| Dove si atterra / ingresso | 4 | 6 Palazzi su «Tokyo» in un posto e altrove nell'altro | Regole d'atterraggio | Pagina Palazzo | Metro, diario |
| Dove si incontra una Persona | 3 | 25 Persona diverse | Ombra ↔ area (Palazzo o dedalo) | Pagina Ombra | Scheda Persona, dedali, Battaglia |
| Contenuto di un forziere | 4 | 11 nomi con parentesi sbagliate | Voce → oggetto per chiave | Voce della guida | Pagina Oggetto («dove si trova») |
| Nome di una Richiesta | 4 | Requisiti per nome 11/11 | Richiesta | Menù del Dedalo | Requisiti, condizioni, diario: per chiave |
| Nome, descrizione, tipo di una voce con scheda | 3 | Copie aggiornate a mano | Voce | Infiltrazione | Mappa, contenuti della guida |

### Confidenti, attività, scuola e tempo

| Informazione | Copie | Divergenze oggi | Fonte unica | Si modifica da | La leggono |
|---|---:|---|---|---|---|
| Giorni, fasce e luogo di un Confidente | 9 | 25 voci fuori giorno, 13 fuori fascia | Disponibilità del Confidente | Pagina Confidente | Luogo, diario (avviso), condizioni, «Dove si trova» |
| Data di sblocco di un Confidente | 7 | 9/23 | Requisito del rango 1 | Pagina Confidente | Semafori, calendario e avvisi (derivati) |
| Dote data da un'attività | 7 | 13/23; 7 non registrano nulla | Effetti dell'attività | Pagina Attività | Turno, diario, promemoria |
| Meteo di un giorno | 7 | 12/12 fra le due tabelle | Giorno (meteo + allerte) | Pagina del giorno | Calendario, diario, condizioni «piove», semafori |
| Data di una domanda o di un esame | 6 | 7 domande senza voce, 4 voci senza domanda | Domanda | Pagina Domande | Diario (voce collegata), calendario, Oggi |
| Cruciverba | 6 | 5 senza voce, 3 voci senza cruciverba | Cruciverba | Pagina Cruciverba | Diario (voce collegata), Oggi |
| Nome del Confidente | 6 | Diario 80/445 con nomi vecchi | Confidente | Pagina Confidente | Diario (dal vivo), calendario, personaggi |
| Giorno della settimana | 6 | 5 formati | Calcolato dalla data | — | Tutti |
| Ricompensa di una domanda | 5 | 3/55 | Effetto della domanda | Pagina Domande | Diario, promemoria |
| Formula dei punti dei Confidenti | 5 | Bonus esami: 7, 6 o tutti | Un solo modulo condiviso | — | Server, anteprime |
| Libro che sblocca un posto | 5 | 1/12 | Condizione del posto sbloccato | Pagina Quartiere / Luogo | Libro (mostra cosa sblocca) |
| Paga di un lavoro | 5 | 0/4 | Paga dell'attività | Pagina Attività | Turno, yen (D8) |
| Dote per incontro | 5 | 1/32 | Dote del rango | Pagina Confidente | Incontro, diario |
| Requisito Richiesta di un Confidente | 4 | 0/21 identici | Requisito per chiave | Pagina Confidente | Semafori, Richieste |
| Risposte ottimali e loro note (punti legame) | 3 | 812 scelte, 293 senza punti numerici; nel diario frasi a mano («Capito» vale 3 punti), 10/25 citazioni non trovate; alla spunta le note si indicano a mano | Dialoghi del Confidente (rango → scelte → note) | Pagina Confidente | Voce del diario: mostra le risposte del suo incontro e la spunta applica le note della risposta scelta (o di quella ottimale), senza testo ricopiato |
| Abilità per rango | 3 | 21/101 | Abilità del rango | Pagina Confidente | Diario (dal vivo) |
| Eventi di storia | 3 | Solo a mano | Elenco degli eventi (dato, non codice) | Pagina Eventi | Requisiti, diario (effetto «evento») |

### Stato della partita

| Stato | Copie | Punti di scrittura | Divergenze oggi | Fonte unica | Si aggiorna da |
|---|---:|---:|---|---|---|
| Doti date dal gioco | 6 | 1 | Storico «+2 Fascino», Doti a 0 | Effetto della voce + elenco «da applicare» | Spunta del diario (D6) |
| Libri e film | 5 | 4 | Due definizioni di «letto» | Avanzamento | Spunta, correzione nella scheda |
| Punti del Confidente | 4 | 4 | «Annulla» si perde ricaricando | Punti | Spunta, correzione nella scheda |
| Turni e attività svolte | 4 | 3 | Due contatori | Registro dei turni | Spunta, correzione |
| Giorno corrente | 4 | 6 | 2 strade senza controlli | Giorno della partita | Una regola per tutte le strade |
| Rango del Confidente | 3 | 1 | Passaggi senza rango | Rango | Spunta del passaggio, correzione |
| Pin raccolto e voce | 3 | 12 | Divergenze voce/pin | Stato dell'oggetto (§5) | Voce o pin, stessa azione |
| Persona registrata e posseduta | 3 | 9 | Istantanea che invecchia | Persona della partita | Scorta, «Registra», cattura |
| Acquisti, richieste, cruciverba, domande | 2 | 1–4 | Storico con fatti che lo stato non ha | Stato dell'oggetto | Spunta del diario, correzione |
| Storico | — | 20 | Non segue gli annullamenti | Registro derivato | Ogni cambio di stato, anche all'indietro |

> Le copie in prosa (frasi «Come trovarlo», «sblocco», «giorni», note che ripetono dati) non si cancellano alla cieca:
> diventano campi strutturati dove esprimono un dato, restano come nota dove aggiungono contesto. L'elenco dei casi dubbi
> passa dall'utente prima della migrazione.

## 1. Le gerarchie

**Mondo**
1. **Città** — Tokyo, il menu della metro
2. **Quartiere** — Shibuya; ha un'illustrazione e un'area d'ingresso
3. **Area** — Central Street, Sottopasso, Vicoli
4. **Planimetria** — le immagini dell'area: una o più versioni («inquadratura orientale», «planimetria completa»)
5. **Luogo** — Untouchable, Diner, distributore: un'attività posizionata con un pin su una planimetria

**Palazzi**
1. **Città** — Tokyo
2. **Palazzo** — Madarame; ha lo stemma
3. **Area** — Museo 1P, Giardino centrale (oggi le «stanze»)
4. **Planimetria** — le versioni dell'area
5. **Infiltrazione** — trasversale: tocca più Aree; contiene le voci della guida, posizionate con pin sulle planimetrie

**Memento**
1. **Città** — Tokyo
2. **Memento** — l'ingresso, con i suoi dedali
3. **Dedalo** — Qimranut, Aiyatsbus, …, Da'at
4. **Area** — le aree del dedalo, con Persona e Ombre, Richieste, timbri
5. **Planimetrie** — nessuna: si generano a caso a ogni visita

Nei Memento quindi niente pin né mappe: gli elementi (Ombre da catturare, Richieste, timbri) appartengono all'area del dedalo
e lo stato sta sull'elemento. Oggi il modello è già questo, ristrutturato di recente: lo stato del dedalo deriva da quello
delle sue aree, e le Persona catturabili di un'area leggono lo stato dal compendio, con il tocco collegato al compendio stesso.

> **I Memento sono il modello di riferimento** e non si toccano: è il resto che si allinea a loro. Stesso schema per le
> Persona dei Palazzi (oggi 44 voci con stato proprio), per Iweleth registrato anche come Palazzo (le stesse 9 Persona con un
> secondo stato) e per le Ombre di Battaglia (dati copiati): tutte leggeranno il compendio come fanno i dedali.

Le parole hanno un solo significato. Luogo è solo l'attività. Area è solo la zona fisica, nel quartiere o nel Palazzo.
Planimetria è solo l'immagine di un'area. Mappa resta il nome tecnico del contenitore d'immagine, e non compare più
nell'interfaccia.

## 2. Modello, entità per entità

| Dominio | Modello di destinazione | Cosa si fonde o sparisce |
|---|---|---|
| Quartiere | `quartiere` con illustrazione, area d'ingresso (area + punto) e sblocco come condizione | Sparisce la terza copia del legame (colonne `entita_*`); le posizioni della metro passano in un solo file; sblocco in un'unica forma |
| Area del mondo | Nuova entità `area` (quartiere, nome, ordine, planimetria predefinita) | Le mappe di tipo «luogo» diventano planimetrie di un'area. A Shibuya 7 mappe → 6 aree (Sottopasso Speciale diventa versione del Sottopasso) |
| Planimetria | Una mappa con `area` obbligatoria, versione ed etichetta; il ruolo dell'immagine si deduce | Cinque regole di ruolo → una; «stanze» e gruppi di immagini → l'area stessa |
| Luogo | `luogo` con quartiere, area, tipo, orari, presenza e sblocco; posizione = pin sulla planimetria | Il pin non copia più nome e descrizione; orari solo sul luogo (oggi 23 su 57 divergono dal negozio); marcatori vecchi via |
| Negozio | Il listino di un luogo: `negozio` legato a un solo luogo (sede) | Quattro modi di dire «dove» → uno; frasi di orari e sblocco migrate; le sedi con più negozi li mostrano tutti |
| Oggetto | Un catalogo unico `oggetto` (equipaggiamento, consumabili, materiali, regali, libri, DVD, chiave) | Tre cataloghi (223 + 355 + 576) → uno. L'articolo diventa «oggetto X venduto da Y a prezzo Z». Regali, ricompense, forzieri e scambi citano l'oggetto per chiave. Doppioni come «Kogatana nera» o «Black Robe» si fondono |
| Palazzo | `dungeon` con aree, planimetrie, infiltrazioni | La griglia del Palazzo sparisce; la pianta nativa (Covo, Iweleth) va decisa (D2, D3) |
| Infiltrazione | `dungeon_area` rinominata nell'interfaccia; legame molti a molti con le Aree | Il legame passa dalla planimetria all'Area; il nome in `guida_mappa` sparisce |
| Voce della guida | Una voce per elemento, con tipo permanente o rigenerabile, in una o più infiltrazioni | Le copie dei permanenti (forzieri, porte, scorciatoie) si fondono; schede senza mappa → voci |
| Persona | `persona` resta l'identità; nuova entità `ombra` (nome italiano, Persona, dove si incontra) | Ombre della battaglia, voci dei Memento, tabella di Kamoshida e voci Persona dei Palazzi → `ombra`. Debolezze solo dal compendio (oggi 4 copie, 20 divergenze). Dove si incontra: una sola fonte (oggi 3) |
| Confidente | `confidente` con disponibilità strutturata (giorni, fasce, luogo) e requisiti di rango | Giorni oggi in 3 posti, sblocco in 4 (7 divergenze); nome sbagliato «Junichi Iwai» corretto; luoghi del Confidente modificabili |
| Attività | `attivita` con sede (luogo), fascia, condizioni, effetti strutturati | Effetti solo strutturati (oggi 7 attività non registrano nulla); descrizioni ripetute via; giorni del quiz in un posto |
| Libri, film, videogiochi | Sono oggetti del catalogo unico, con lettura e sblocchi strutturati | «Sblocca quartiere» valutato davvero (oggi Odaiba e Asakusa lo ignorano) |
| Calendario | Un solo giorno (`giorno`): meteo, settimana, trama, vincoli; eventi legati alle entità per chiave | Due tabelle da 346 giorni → una; la copia morta delle azioni via; esami in una sola tabella (oggi 31 domande doppie) |
| Condizioni | Un vocabolario (unione dei 27 + 12 tipi, con «avviso») e un valutatore | Richieste citate per chiave ovunque; «quartiere aperto» con un solo significato; frasi di sblocco migrate o tenute come nota |
| Immagini | Un risolutore: caricata → asset → icona base; vale per tutte le viste | Lo stemma fisso di Tokyo e Covo sull'immagine caricata sparisce; sagome e Palazzi passano dal risolutore |

## 3. Una casa per ogni oggetto

| Oggetto | La sua pagina | Cosa mostra | Cosa sparisce |
|---|---|---|---|
| Città | `/guida/citta` | La metro; ogni fermata apre il quartiere | Il visore di Tokyo e la riga «Tokyo» dell'indice |
| Quartiere | `/guida/citta/shibuya` | Illustrazione con i pin delle aree, elenco delle aree con miniatura, elenco dei luoghi filtrabile, ingresso | Le altre due «Shibuya» (planimetria d'ingresso aperta direttamente, nodo illustrazione nell'indice) |
| Area | `/guida/citta/shibuya/central-street` | Il visore sulla planimetria predefinita, selettore delle versioni, luoghi presenti, aree vicine | Il selettore «Planimetrie» che cambiava luogo; le miniature al posto del visore |
| Luogo | `/guida/luogo/untouchable` | Scheda completa: orari, sblocco, Confidente, listino, attività, dove si trova (planimetria incorporata) | L'ancora dentro la pagina del quartiere; i link «scheda» che portavano a elenchi generici |
| Palazzo | `/guida/dungeon/madarame` | Aree con planimetrie, infiltrazioni, raccolta, completamento | La griglia del Palazzo in `/guida/mappe` |
| Infiltrazione | `/guida/dungeon/madarame/infiltrazione/…` | Le sue aree, la sua guida, la mappa sulle aree toccate | La seconda vista con l'area aperta nella griglia |
| Persona | `/compendio/persona/:id` | Più dove si incontra (Ombre, Palazzi, Memento) e se è registrata | — |
| Ombra | `/guida/ombra/:chiave` | Nome, Persona, debolezze dal compendio, dove si incontra, negoziazione | Le copie in Battaglia, dedali e voci dei Palazzi diventano link |
| Oggetto | `/guida/oggetto/:chiave` | Effetto, dove si compra (negozi e prezzi), regali a chi piace, ricompense, forzieri | Le tre pagine-catalogo separate diventano filtri di una |
| Negozio | Sezione della pagina del luogo | Listino con acquisti | La pagina negozio separata (resta come indirizzo che rimanda al luogo) |
| Confidente | `/confidenti/:chiave` | Guida e stato di partita insieme | Il secondo elenco in «Personaggi»; il link rotto `/confidenti` |
| Attività, libro, film, richiesta | `/guida/attivita/:k`, `/guida/libro/:k`… | Scheda singola con indirizzo proprio | La selezione locale che non entrava nell'indirizzo |

Regole di navigazione: la metro, le briciole, i pin di passaggio, «Dove si trova», le schede e la ricerca portano tutti alla
stessa pagina. Le briciole seguono la gerarchia (Tokyo › Shibuya › Central Street); l'indietro risale la gerarchia. L'indice
«Mappe» diventa l'albero della gerarchia, con le planimetrie visibili sotto ogni area. Una ricerca globale copre tutti gli
oggetti.

## 4. Come si gestisce

Ogni livello si gestisce dalla pagina del livello sopra, sempre nello stesso modo: «Aggiungi», «Modifica», «Elimina» (nel
cestino).

| Dove sei | Cosa aggiungi | La finestra chiede |
|---|---|---|
| Quartiere | Area | Nome, posizione sull'illustrazione del quartiere (crea il pin di passaggio), prima planimetria con immagine |
| Area (mondo o Palazzo) | Planimetria | Immagine (obbligatoria), etichetta della versione, se diventa la predefinita. Il ruolo si deduce |
| Planimetria | Luogo | Un luogo esistente o nuovo, poi il punto sulla planimetria. Il pin nasce collegato |
| Palazzo | Area, Infiltrazione | Area: come sopra. Infiltrazione: nome, aree toccate, ordine |
| Infiltrazione | Voce | Tipo (permanente o rigenerabile dedotto dal tipo, modificabile), testo, dettagli, pin sulle planimetrie delle sue aree |
| Quartiere | Ingresso | L'area d'ingresso da un elenco, poi il punto: in una finestra propria, non più in fondo alla pagina |

- L'editor delle mappe resta per pin, ritagli e passaggi; non crea più mappe «sciolte». «Nuova mappa» generica sparisce; le
  mappe senza posto si sistemano da una lista «da collocare».
- L'immagine caricata dalla sezione «Mappa» è l'immagine di quella planimetria, del quartiere o della città, e si vede uguale
  nel visore, nelle miniature, nell'indice e nelle schede.
- Correggere un oggetto (luogo, negozio, Confidente, oggetto, Ombra) si fa da un solo modulo, nella sua pagina; i pin non
  hanno più testo proprio da correggere.

## 5. Avanzamento e stati

| Cosa | Dove sta lo stato | Regola |
|---|---|---|
| Luogo del mondo (raccolta, visita) | Sul luogo, per partita | Il pin mostra lo stato del luogo; un pin senza luogo ha uno stato suo |
| Elemento permanente del Palazzo (forziere, porta, scorciatoia, Safe Room, meccanismo, tesoro, boss) | Sulla voce, per partita | Fatto in un'infiltrazione, resta fatto in tutte |
| Elemento rigenerabile (oggetto, nemico) | Sulla voce, per partita e infiltrazione | Ogni infiltrazione lo ripropone; il pin mostra lo stato nell'infiltrazione che guardi |
| Persona e Ombre | Registrazione nel compendio | Catturare un'Ombra, in un Palazzo o nei Memento, registra la sua Persona: una sola strada |
| Completamento di area, infiltrazione, Palazzo | Calcolato | Dai soli permanenti più il tesoro e il boss; i rigenerabili non bloccano il 100% |

Spuntare il pin o la voce è la stessa azione. Le divergenze di oggi spariscono per costruzione: togliere la spunta riapre la
voce e quindi tutti i suoi pin; collegare o copiare non rimette più «da fare» un pin già fatto, perché lo stato non sta sul pin.

## 6. La parte partita

| Azione | Oggi | Domani |
|---|---|---|
| Cambiare il giorno | 6 strade, 2 senza controlli | Una sola regola (giorno esistente, fascia a «giorno», suggerimenti aggiornati, storico) per tutte le strade |
| Rango del Confidente | Solo dalla pagina; la spunta registra il passaggio ma non il rango | Il passaggio (da diario o pagina) alza il rango; togliendolo torna indietro |
| Regalo | Due pulsanti che non si parlano | Un'azione: scegli l'oggetto, dà i punti, lo registra, se serve lo segna comprato |
| Registrare una Persona | 4 strade con contenuti diversi | Una: istantanea completa; aggiunta alla scorta e cattura la usano |
| Letture, turni | Due contatori ciascuno | Uno, da cui si calcola il resto |
| Acquisto | Dal negozio o dal diario, separati; non tocca i yen | La spunta del diario segna l'articolo; i yen restano a parte (scelta D8) |
| Storico | Non segue gli annullamenti | Togliere un segno toglie l'evento |
| Eliminare | Cestino per 4 tipi, il resto per sempre | Tutto nel cestino, con «Rimossi» unito al cestino |
| Oggi | Identica in Home e Partita | Un solo componente; la Home la incorpora, con la stessa mappa e lo stesso centro |
| Scorta e compendio | Legate solo alla nascita: aggiungere registra, modificare no; due schede separate | Una vista «Persona della partita»: per ogni Persona se è in scorta, se è registrata e se la registrazione è più vecchia dell'esemplare, con «Registra» accanto |
| Letture e giochi | Completato in due tabelle (letture e progressi), scheda e condizioni leggono fonti diverse | Solo l'avanzamento; «completato» si calcola |
| Punti negozio | Solo a mano, per un solo negozio | Calcolati dagli acquisti dove il gioco li dà per spesa; a mano solo dove il gioco li dà per altro |

### Il diario come motore degli aggiornamenti

Oggi una spunta del diario può produrre solo tre effetti: Dote, lettura, turno. Per questo eventi di storia, attività svolte e
molti fatti restano da segnare a mano anche quando la voce del diario esiste già. Esempi: «Inizia a pulire» la mansarda il
04-09, la Pietra Sacra il 06-28, il duello con Akechi l'11-04. Su 952 voci, solo 9 producono un turno.

Ogni voce del diario dichiara cosa produce; la spunta lo applica e togliendola lo annulla. Gli effetti diventano:

| Effetto | Cosa aggiorna | Esempi |
|---|---|---|
| Evento di storia | Il fatto, e quindi i requisiti che lo chiedono | Mansarda pulita, Caffè al Leblanc (Sojiro 3), Pietra Sacra (Chihaya 1), Chiamata a Kawakami, Oratore di Shibuya (Yoshida 1), Duello con Akechi (Akechi 8), primo strumento creato, biliardo rango 3 |
| Attività svolta | Il contatore dell'attività (sempre, non solo per i lavori) | Biliardo, bagni, palestra, studio, pesca |
| Turno di lavoro | Contatore e paga | Triple Seven, Rafflesia, Ore no Beko |
| Lettura o visione | L'avanzamento | Libri, film, DVD, videogiochi |
| Incontro o rango del Confidente | Punti e, al passaggio, il rango | «Sojiro rango 3» |
| Acquisto | L'articolo comprato | Pietra Sacra, regali, libri |
| Richiesta, domanda, esame | Lo stato collegato: la domanda risulta fatta in «Domande in classe, esami e quiz in TV» | Richieste dei Mementos; le 70 voci «Rispondere alla domanda in classe…», oggi senza collegamento: 71 domande su 78 hanno la voce nello stesso giorno, quindi si abbinano per data. Stesso caso per i cruciverba: 36 voci «Cruciverba (…)» senza collegamento, 33 cruciverba su 38 hanno la voce nello stesso giorno; la voce cumulativa del 02-01 («completare tutti i cruciverba rimanenti») segna quelli ancora aperti |
| Dote | Secondo la decisione D6 | Studio, bagni |

### Censimento: cosa aggiorna oggi il diario, area per area

| Area della guida | Voci | Collegate | La spunta aggiorna l'area? |
|---|---:|---:|---|
| Domande in classe ed esami | 70 | 0 | No: danno solo la Dote. 71 domande su 78 si abbinano per data |
| Cruciverba | 36 | 0 | No: solo la Dote. 33 su 38 si abbinano per data |
| Attività (biliardo, bagni, palestra, pesca…) | 95 | 0 | No: 20 danno la Dote, nessuna conta l'attività |
| Acquisti | 82 | 9 | No: 9 portano al negozio, nessuna all'articolo |
| Palazzi | 58 | 46 | No: il collegamento serve solo a navigare |
| Stanza di Velluto | 18 | 0 | No: fusioni ed esecuzioni non toccano la scorta |
| Richieste dei Mementos | 14 | 3 | No: la richiesta resta da segnare |
| Videogiochi | 3 | 0 | No |
| Trofei e sfide | 5 | 0 | No |
| Lavori part-time | 10 | 3 | In parte: 9 contano il turno |
| Confidenti | 272 | 266 | In parte: incontro e punti sì, rango no |
| Libri | 62 | 60 | Sì, 54 avanzano la lettura |
| Film e DVD | 22 | 18 | Sì, 15 avanzano la visione |

### Calendario: la stessa fonte del diario

Oggi i tag del Calendario (Storia, Sblocco, Scadenza, Festa, Esame) vengono da una tabella a parte: 173 eventi caricati con il
pacchetto, che nessuna pagina modifica e che non citano Palazzi, quartieri o Confidenti. Il diario prevede voci di tipo evento,
scadenza e promemoria, ma ne ha zero: le sue 952 voci sono tutte azioni. Le date si contraddicono: Madarame ha tre scadenze
(«entro il 5 giugno», lettera il 31 maggio, «ultimo giorno» il 5 giugno) oltre alla finestra del Palazzo.

- Gli eventi del calendario diventano voci del diario di tipo evento, sblocco o scadenza, collegate per chiave all'oggetto
  (Palazzo, quartiere, Confidente, attività).
- Scadenze e sblocchi non si scrivono a mano: si ricavano dalla finestra del Palazzo e dalle condizioni di sblocco, così
  coincidono sempre con la guida.
- Il Calendario è la vista mensile del diario; un tag si modifica dallo stesso modulo delle voci del diario.

### Attività, lavori e compensi

«Attività e Doti sociali» è oggi un terzo livello di gestione: lavori, paghe e contatori separati dal diario. La paga non arriva
mai ai soldi della partita.

- Ogni attività ha la sua pagina (catalogo: dove, quando, sblocco, effetti, paga).
- Il turno nasce dalla spunta del diario e conta l'attività; la paga si propone come entrata, secondo D8.
- In Progressi resta solo la vista dei contatori, con la voce del diario da cui vengono e la correzione a mano.

In tutto 952 voci: 196 danno una Dote, 72 avanzano una lettura, 9 contano un turno. Ogni altro stato della guida oggi si segna
a mano, anche quando la voce del diario c'è.

> La migrazione abbina le voci del diario ai fatti che producono (evento, attività, acquisto, richiesta). Gli abbinamenti
> sicuri si applicano; quelli dubbi arrivano all'utente in un elenco da approvare prima di scriverli. In Progressi i fatti
> restano visibili, con la voce del diario che li ha fatti scattare, e si possono ancora segnare a mano.

## 7. Migrazione dei dati

Ogni passaggio è una migrazione con copia di sicurezza, provata prima su una copia dei dati dell'istanza dell'utente e con un
confronto prima/dopo. I conteggi sono quelli misurati.

| Passaggio | Da | A | Righe |
|---|---|---|---:|
| Aree del mondo | Mappe di tipo «luogo» sotto i quartieri | Aree + planimetrie (versioni dai gruppi di immagini) | 26 |
| Quartieri senza aree | Quartieri con sola illustrazione | Restano senza aree finché non se ne aggiungono | 15 |
| Aree dei Palazzi | Stanze (gruppi di versioni) e planimetrie sciolte | Aree del Palazzo | ≈ 220 |
| Infiltrazioni ↔ Aree | Legami infiltrazione ↔ planimetria | Legami infiltrazione ↔ area | 126 |
| Voci permanenti copiate | Copie di Madarame su forzieri, porte, scorciatoie | Una voce in più infiltrazioni, con stato unito | ≈ 20 |
| Schede senza mappa | Spilli senza mappa delle aree | Voci o pin, secondo il riferimento | 187 |
| Ombre | Battaglia, dedali, tabelle, voci Persona | Entità `ombra` | 217 + 131 + 44 |
| Oggetti | Tre cataloghi | Catalogo unico, articoli per chiave | 223 + 355 + 576 |
| Orari e sblocco | Frasi e copie su luogo e negozio | Condizioni strutturate sul luogo | 57 + 35 |
| Calendario | Due tabelle giornaliere ed esami doppi | Un giorno, esami in una tabella | 346 + 31 |
| Dati morti | Marcatori, piante vecchie, colonne frase, tabelle storiche | Eliminati dopo la migrazione | ≈ 600 |

### Lavoro da preservare

Vincolo per ogni migrazione: il lavoro di validazione del diario fino al 1° giugno e quello sui Palazzi di Kamoshida e Madarame
non si perde né si altera.

| Lavoro | Quantità | Garanzia |
|---|---:|---|
| Diario dal 1° aprile al 1° giugno | 254 voci | Testo, ordine, giorno, fascia, uid e spunte invariati; i collegamenti nuovi si aggiungono senza riscrivere la voce. Le voci prendono un segno «validata» così il lavoro resta riconoscibile |
| Kamoshida | 169 voci, 359 pin | Voci, pin, posizioni, collegamenti e stati invariati; il passaggio ad aree e infiltrazioni sposta legami, non contenuti |
| Madarame | 196 voci, 250 pin | Come Kamoshida; le fusioni delle copie permanenti si applicano solo voce per voce dopo il sì dell'utente |

Per questi dati ogni migrazione si prova su una copia della produzione e produce un confronto prima/dopo voce per voce e pin
per pin. Nessuna rigenerazione dal pacchetto.

### Deve funzionare anche dopo la conversione

Conservare i dati non basta: dopo ogni lotto quel lavoro si usa come prima, o meglio. Sulla copia della produzione, prima del
rilascio, si verifica:

| Lavoro | Prova di funzionamento |
|---|---|
| Diario fino al 1° giugno | Ogni giorno si apre con le stesse voci nello stesso ordine; le spunte già date restano; spuntare e togliere la spunta applica e annulla gli stessi effetti di prima, più quelli nuovi; il giorno avanza come prima; i collegamenti portano alla scheda giusta |
| Kamoshida e Madarame | Ogni infiltrazione mostra le stesse voci; ogni pin sta sulla stessa planimetria nella stessa posizione e apre la stessa voce; gli stati delle partite risultano uguali; percentuali e completamenti uguali, o diversi solo dove una fusione approvata lo spiega voce per voce; collegare, segnare e togliere segni funzionano dalla guida e dalla mappa |
| Navigazione | Dalla metro, dal diario e dalla ricerca si arriva agli stessi Palazzi, infiltrazioni e voci |

La prova si fa con la partita reale copiata (stati inclusi) e con una partita di prova nuova; l'esito è un elenco voce per voce
consegnato insieme alla richiesta di rilascio.

> Le corrispondenze per nome (Persona, oggetti, regali, Ombre) non si fanno alla cieca: per ogni dominio si produce un elenco
> degli abbinamenti dubbi da approvare prima della migrazione.

## 8. Lotti di lavoro

Ogni lotto chiude le righe del registro del suo dominio: per ognuna la copia unica, il punto di modifica e il passaggio di
tutti i consumatori, con le copie vecchie eliminate. In quest'ordine, perché ogni lotto si appoggia sul precedente. Ogni lotto
chiude con: migrazione provata su copia, interfaccia ai tre formati, test del punto, documenti, validazione, pipeline verde.

| Lotto | Titolo | Dipende da | Contenuto | Fatto quando |
|---|---|---|---|---|
| L0 | Vocabolario e testi | — | Nomi dell'interfaccia secondo le gerarchie: «Infiltrazione» nei Palazzi, «Area» e «Planimetria» nel mondo, «Luogo» solo per le attività. Nessun cambio di dati | Nessun testo usa una parola con il significato di un'altra; i Memento restano «area» |
| L1 | Immagini | L0 | Un risolutore d'immagine per tutte le viste; il ruolo dell'immagine si deduce dal posto nella gerarchia | Tokyo, i quartieri e ogni planimetria mostrano la stessa immagine in visore, indice, schede e miniature |
| L2 | Mondo: aree e planimetrie | L1 | Entità Area; migrazione delle 26 mappe; pagine Quartiere e Area; ingresso come area predefinita in una finestra propria; «Aggiungi area» e «Aggiungi planimetria» | Shibuya si apre in un solo modo da ogni punto; Sottopasso Speciale è una versione; il Covo sta nel suo posto (D2) |
| L3 | Palazzi: aree e infiltrazioni | L1 | Aree del Palazzo dalle stanze; legame infiltrazione ↔ area; pagina del Palazzo con tutte le aree; griglia rimossa; «Aggiungi area / planimetria / infiltrazione» | Una stanza aggiunta compare subito nel Palazzo e nel visore, senza «scegli una planimetria»; la prova è il caso di Madarame |
| L4 | Avanzamento unico | L3 | Stato sull'oggetto; permanenti e rigenerabili; fusione delle copie permanenti di Madarame; schede senza mappa migrate | Voce e pin non possono più divergere; un forziere aperto nella 2 è aperto nella 4, un oggetto si ripropone; il 100% si raggiunge |
| L5 | Luoghi, negozi, orari | L2 | Luogo come fonte unica di presenza; negozio come listino del luogo; pin senza testo proprio; pagina del Luogo; «Aggiungi luogo» crea anche il pin | Scheda e visore dicono la stessa cosa sugli orari; nessun pin della città senza luogo, salvo i passaggi |
| L6 | Condizioni uniche | L5 | Un vocabolario e un valutatore; riferimenti per chiave; frasi migrate con elenco dei casi dubbi | Ogni sblocco ha una sola forma; Odaiba e Asakusa seguono il libro; la Clinica ha una data sola |
| L7 | Oggetti | L6 | Catalogo unico; articoli, regali, ricompense, forzieri e scambi per chiave; pagina Oggetto | Un oggetto ha una pagina che dice dove si compra, a chi piace, dove si trova |
| L8 | Persona e Ombre | L4 | Entità Ombra; debolezze dal compendio; una strada di cattura, la stessa dei Memento (stato dal compendio, tocco sul compendio), estesa a Palazzi e Battaglia; pagina Ombra. I dedali dei Memento restano come sono | Nessuna debolezza ricopiata; catturare un'Ombra registra la Persona ovunque, Iweleth compreso |
| L9 | Confidenti, attività, calendario | L6 | Disponibilità strutturata in un posto; un calendario; esami in una tabella; effetti delle attività solo strutturati | Le date di sblocco dei Confidenti coincidono in ogni vista; le 7 attività registrano le loro Doti |
| L10 | Partita e diario | L7, L9 | Regole uniche per giorno, rango, regalo, registrazione, letture, storico, cestino. Il diario come motore: effetti nuovi (evento di storia, attività svolta, incontro e rango, acquisto, richiesta, domanda) con abbinamento delle 952 voci; vista unica di scorta e compendio; automatismi delle Doti secondo D6 | Ogni azione ha una sola regola, da qualunque pagina parta; spuntare «Inizia a pulire» segna la mansarda pulita e togliere la spunta la riapre; Progressi mostra da quale voce è scattato ogni fatto |
| L11 | Pulizia e ricerca | alla fine | Dati e codice morti eliminati; ricerca globale; indice delle Mappe come albero della gerarchia; documenti riscritti. «Modifica» con «Ripristina» su ogni oggetto ancora senza (ogni lotto lo aggiunge per i suoi oggetti; qui si chiude il resto dell'elenco) | Nessuna tabella o colonna senza lettore; ogni oggetto si trova dalla ricerca |

## 9. Decisioni ancora dell'utente

Puntuali, servono prima del lotto indicato. Su mandato dell'utente del 2026-10-20 si applica l'opzione consigliata, registrata
in `docs/DECISIONI.md` come «scelta consigliata applicata, da confermare».

| Decisione | Lotto | Opzioni (la prima è la consigliata) |
|---|---|---|
| D1 Ordine dei lotti | subito | **Come proposto, L0 → L11** · Prima i Palazzi (L3 e L4 subito dopo L1) |
| D2 Covo dei Ladri | L2 | **Area di Yongen-Jaya** (le 5 planimetrie diventano le sue versioni) · Luogo a sé sulla metro, come oggi la sua fermata |
| D3 Iweleth | L3, L8 | **Solo come dedalo dei Memento** (le 12 aree del «Palazzo» confluiscono nel dedalo) · Solo come Palazzo · Entrambi, con stato condiviso |
| D4 Tipi permanenti e rigenerabili | L4 | **Rigenerabili: oggetto, nemico, ombra-sciagura; tutto il resto permanente** (modificabile voce per voce) · Elenco diverso |
| D5 Negozio come pagina | L5 | **Sezione della pagina del luogo** · Pagina propria collegata al luogo, come oggi |
| D6 Automatismi del diario | L10 | **La spunta aggiorna ciò che la voce collega; Doti proposte con «Applica»** · Doti automatiche e annullabili · Doti sempre a mano, come scelto il 30 settembre, con elenco in sospeso |
| D7 Persona del party | L8 | **Collegarle al compendio per chiave** (oggi 2 su 29 coincidono) · Lasciarle come testo |
| D8 Acquisti e yen | L10 | Acquisti e paghe muovono i yen, annullabili · **Proposti da confermare** (l'acquisto segna l'articolo e propone l'uscita, il turno propone l'entrata) · Yen sempre a mano |
