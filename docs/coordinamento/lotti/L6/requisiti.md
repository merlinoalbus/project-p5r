# L6 «Condizioni uniche» — requisiti

Autore: sessione «Analisi requisiti» (2026-10-20). Fonti: piano (righe 24-25, 87, 105, 113, 116, 124, 133, 136, 156-158, 211, 213, 335,
370, 402-403, 419), memoria «Un punto di modifica», DECISIONI 2026-10-04 (il Palazzo sulla mappa di Tokyo; Palazzo completato), 2026-10-09
(«Le condizioni di visibilità dei pin sono assolute»), 2026-10-11 («Condizione di visibilità dei pin "Voce della guida"»). Codice di
contesto: `shared/condizioniSpillo.ts` (`RequisitoSpillo`, 27 tipi: arco, articolo, attivita, confidente, contatore, data, dote, evento,
fascia, giorno-settimana, gruppo, intervallo, lettura, meteo, non, palazzo, persona-abilita, persona-arcano, piove, punti-negozio,
quartiere, rango-cliente, richiesta, spillo, squadra, stagione, voce-guida), `shared/migraCondizioni.ts`, requisiti dei Confidenti
(`confidente_requisito`, conferme in `requisito_partita`).

## Obiettivo
**Un vocabolario di condizioni e un valutatore.** Disponibilità, sblocchi e requisiti di ogni cosa (quartieri, luoghi, negozi, pin,
Confidenti, Palazzi, attività, libri) usano un solo linguaggio strutturato — l'unione dei 27 tipi dei pin e dei 12 degli altri
vocabolari (piano riga 213), con il tipo «avviso» — e un solo valutatore lato server e interfaccia. Ogni riferimento è **per chiave**
(Richieste, Persona, oggetti, luoghi, quartieri), mai per nome. Le **frasi** di sblocco diventano condizioni dove esprimono un dato e
restano come nota dove aggiungono contesto; i casi dubbi passano dall'utente con un elenco prima della migrazione. «Quartiere aperto» ha
un solo significato. Scadenze e sblocchi del calendario si **ricavano** dalle condizioni e dalla finestra del Palazzo, non si scrivono a
mano (preparazione per L9).

**Fatto quando** (piano, riga 419): ogni sblocco ha una sola forma; Odaiba e Asakusa seguono il libro; la Clinica ha una data sola.
(Precisazioni decise dall'utente il 2026-10-20: Odaiba si apre con la lettura di «Luoghi della movida» oppure con Ann al rango 10;
Asakusa con Ann al rango 7; la Clinica ha due date per due cose diverse, il 16/4 per il negozio e il 18/4 per il Confidente — R6-10, R6-12.)

## Perimetro (contesto, da misurare in `dati.md`)
- Sblocco di un quartiere in 7 copie: 13 quartieri sempre «rossi» nelle condizioni; 3 libri ignorati (Odaiba e Asakusa fra questi).
- Apertura e scadenza di un Palazzo in 8 copie (Kamoshida 3 date, Madarame 3 scadenze, testi copiati 7/10).
- Dove si atterra / ingresso: 6 Palazzi su «Tokyo» in un posto e altrove nell'altro.
- Data di sblocco di un Confidente: 7 copie, 9/23 divergenti; requisito Richiesta di un Confidente: 4 copie, per nome (11/11).
- Libro che sblocca un posto: 5 copie, 1/12 divergenti. Frasi di sblocco su luoghi e negozi: 57 + 35 (piano riga 370).

## Criteri di accettazione
Tipo: **F** funzionale, **UX** esperienza, **NR** no-reg, **L** layout.

### Vocabolario e valutatore
- R6-01 [F] Esiste un solo elenco dei tipi di condizione (unione dei 27 + 12, più «avviso»), definito in un posto solo condiviso da server e interfaccia; ogni tipo ha nome italiano, campi e regola di valutazione documentati.
- R6-01b [F] **Il vocabolario unico non ha il tipo `manuale`.** Le decisioni dell'utente lo escludono: il 2026-09-05 «niente condizioni "manuali"»; il 2026-09-30 i requisiti «manuali» sono diventati eventi della partita (migrazione 090), e l'unico non confermabile è un `avviso`. Misura sulla copia 0440Z: 0 requisiti di tipo `manuale` in `confidente_requisito` e 0 conferme in `requisito_partita`. Il caso «non verificabile» si esprime così:
  - con un **evento** (fatto da segnare in Progressi o dal diario);
  - con un **avviso** non bloccante;
  - con una **proprietà strutturata** dell'oggetto (per esempio `solo_eventi_confidente` della Sakura Residence, L5 R5-20f).

  Un pacchetto vecchio con righe `manuale` si importa: ogni riga diventa un `avviso` ed entra nell'elenco del riepilogo d'importazione. `requisito_partita` resta finché L11 non ne prova l'assenza di lettori. Verifica: nessuna condizione salvata ha il tipo `manuale`, e l'editor non lo offre.
- R6-02 [F] Un solo valutatore calcola ogni condizione per una partita e un giorno; server e interfaccia danno lo stesso esito per gli stessi dati (test con casi per ogni tipo).
- R6-03 [F] Ogni condizione cita le cose per chiave: Richieste, Persona, oggetti/articoli, luoghi, quartieri, Palazzi, Confidenti, voci della guida, spilli; nessuna condizione salvata contiene un riferimento per nome dopo la migrazione.
- R6-04 [F] Rinominare una cosa citata (es. una Richiesta, un quartiere) non rompe nessuna condizione: l'esito resta lo stesso e il testo mostrato usa il nome nuovo.
- R6-05 [F] Il tipo «avviso» non blocca: mostra un'indicazione (come oggi le icone «da confermare» non bloccanti) ed è distinto da «bloccato».
- R6-06 [F] Le combinazioni (gruppo, non, intervallo) valgono per tutti i tipi, ovunque.
- R6-07 [F] Un solo editor di condizioni, lo stesso per pin, quartieri, luoghi, negozi, Confidenti, attività e Palazzi, con tutti i tipi del vocabolario; le condizioni si modificano dalla pagina dell'oggetto a cui appartengono.

### Una forma per ogni sblocco
- R6-08 [F] Lo sblocco di un quartiere ha una sola forma (condizione strutturata sul quartiere); Città, metro, condizione «quartiere», calendario e libro la leggono da lì; i 13 quartieri oggi sempre «rossi» danno l'esito giusto, perché ciascuno prende la sua condizione strutturata di R6-08b (non si correggono uno per uno a mano).
- R6-08b [F] **Ogni quartiere ha una condizione di sblocco strutturata**, presa dalle fonti (tabella G-018 dell'Esperto della guida): evento, data, libro, rango di un Confidente, Palazzo oppure «da subito». Nessun quartiere resta con la sola frase di sblocco. Il testo che si legge nell'app è **la descrizione generata dalla condizione**, non una frase scritta a mano. Indicazione dell'utente, 2026-10-20 tramite il PM: «i quartieri hanno sempre un evento sbloccante... quartieri che si sbloccano con frasi testuali sono elementi non elaborati correttamente in fase di progettazione dell'app». Verifica: per ognuno dei 24 quartieri c'è una condizione strutturata con la sua fonte, e la descrizione mostrata coincide con quella generata. La fonte è la tabella **G-018** dell'Esperto (`guida/registro.md`), con le regole del gioco:
  - **Quattro tipi di evento**: iniziale, data di trama, rango di un Confidente, lettura di un libro. Il libro si compra da una data oppure si ottiene come premio di una Richiesta. Più vie per lo stesso posto formano un gruppo «oppure».
  - **Un libro sblocca quando si finisce di leggerlo**, non alla data di messa in vendita.
  - **Nei quartieri con più ritrovi** (Kanda/Jinbocho, Asakusa/Skytree, Kichijoji/Jazz Club) ogni ritrovo ha il suo evento, e il quartiere è aperto quando almeno uno dei suoi ritrovi lo è.
  - **Gli inviti dei Confidenti sono sblocchi alternativi** per decisione dell'utente, anche se la guida italiana non li descrive così (dubbio 8, R6-08c).
  - **Certezza**: alta per 20 quartieri su 23. Roppongi è corretto al **15/9** (prima visita a Okumura Foods, G-031, certezza alta; il 19/9 di G-018 era sbagliato). Resta a certezza media la data di Maihama (11/10; alta la via del libro). Le differenze con i dati di oggi elencate in G-018 vanno ad Analisi dati e a BE.
- R6-08c [F] Nel vocabolario unico esiste il tipo di condizione strutturato **«invito del Confidente avvenuto»**: Confidente per chiave, più l'invito per chiave o per data. È vero quando nella partita è registrato l'evento di quell'invito: con la spunta della sua voce del diario (R10-11i) o con il gesto diretto (R6-08f). Decisione dell'utente del 2026-10-20: gli inviti non sono frasi, sono eventi.
- R6-08c2 [F] **Ogni invito ha le sue condizioni**, quelle del gioco (G-023, G-028), scritte strutturate nella riga dell'invito del Confidente (R9-07c). L'invito si può registrare solo quando sono vere; altrimenti il gesto e la voce dicono cosa manca:
  - Ryuji 29/5, Harajuku: Palazzo di Madarame concluso;
  - Ryuji 3/7, Ichigaya: Palazzo di Kaneshiro concluso e Temperanza rango 1;
  - Akechi 29/7, Shinagawa: Diavolo rango 1;
  - Makoto 30/7, Ikebukuro: Palazzo di Futaba concluso e Imperatore rango 1;
  - Ann 6/8, Santuario Meiji: Palazzo di Futaba concluso e Morte rango 1;
  - Futaba 9/10, Nakano: Appeso rango 1.

  «Palazzo concluso» è il livello di L4 R4-22, Tesoro e boss finale dichiarato (L4 §8.14). Verifica nella partita di prova: con la piramide non ancora conclusa, l'invito di Makoto non si può registrare e dice «manca: Palazzo di Futaba concluso».
- R6-08c3 [F] **Errore 1 di G-028, l'invito di Makoto del 30/7.** Sul percorso del diario, che è quello della guida italiana, la piramide si conclude il 3/8, quindi il 30/7 l'invito non arriva. **Decisione del PM sulla bacheca (2026-10-20): strada (a).** La voce del diario del 07-30 **c'è**, con la condizione scritta («solo se il Palazzo di Futaba è già completato») e il motivo nel campo «da rivedere». La strada (b), niente voce e solo l'evento, va all'utente come scelta nell'elenco «Da rivedere» (L11 R11-10c). Le voci degli inviti dopo il 06-01 restano quindi **8** (R10-11j2). Spuntare la voce o fare il gesto registra l'evento solo se le condizioni sono vere; altrimenti compare «Non ancora possibile: manca il Palazzo di Futaba concluso». *Testo superato: «l'invito resta un evento senza voce, 7 voci» (proposta (b) dell'Esperto).*
- R6-08d [F] Gli sblocchi con un invito **restano in OR** con le altre vie del quartiere o del ritrovo, come per Odaiba. Sono:
  - Harajuku: invito di **Ryuji il 29/5**;
  - Ikebukuro: invito di **Makoto il 30/7**;
  - Santuario Meiji: invito di **Ann il 6/8**;
  - Shinagawa: invito di **Akechi il 29/7** (messaggio la sera del 28/7);
  - Nakano: invito di **Futaba il 9/10** (messaggio la sera dell'8/10);
  - Ichigaya: invito di **Ryuji il 3/7** (messaggio la sera del 2/7).

  Date verificate dall'Esperto della guida sui dati del gioco Royal (**G-023**), con i requisiti di ogni invito e la voce del diario proposta. Rispetto all'elenco con cui era arrivata la decisione ci sono tre correzioni: Harajuku è di Ryuji il 29/5, non di Mishima il 3/8; l'invito di Mishima del 28/7 per Ikebukuro in Royal non esiste; Meiji è il 6/8, non il 5/8. Da confermare con l'utente (tramite il PM). Ogni via ha la sua fonte.
- R6-08e [F] Caso di prova, nella partita di prova, **con il Palazzo di Futaba concluso prima del 30/7 e Imperatore rango 1** (le condizioni di R6-08c2), e con Ikebukuro non ancora aperto né per data né per libro:
  - **registrare con il gesto diretto** l'evento «invito di Makoto del 30/7», dalla pagina del Confidente o del quartiere, apre Ikebukuro;
  - annullarlo lo richiude, e leggere poi «Cieli notturni» lo riapre per l'altra via;
  - il gesto non crea voci del diario; la voce «da rivedere» del 07-30 registra lo stesso evento, una volta sola (R6-08c3);
  - **sul percorso del diario**, con la piramide conclusa il 3/8, spuntare la voce del 07-30 o fare il gesto dà «Non ancora possibile: manca il Palazzo di Futaba concluso».

  È stato scelto al posto di Mishima del 28/7, che in Royal non esiste (G-023). Per un invito con la sua voce «da rivedere» (per esempio Futaba 10-09, Nakano), la spunta della voce e il gesto registrano lo stesso evento, una volta sola.
- R6-08f [F] L'evento «invito avvenuto» si registra in due modi equivalenti per le condizioni: con la spunta di una voce di tipo invito (R10-11i), oppure con un **gesto diretto** dalla pagina del Confidente o del quartiere, con la data. Per l'invito del 29/5, che sta nel diario validato, il gesto è l'unico modo: lì non si aggiungono voci. Gli inviti dopo il 06-01 hanno anche la loro voce «da rivedere» (R10-11j2), compreso Makoto del 30/7, che porta la sua condizione scritta (R6-08c3). Voce e gesto registrano lo stesso evento una volta sola (decisioni dell'utente del 2026-10-20). Il caso di prova di R6-08e vale per ogni quartiere di R6-08d.
- R6-09 [F] «Quartiere aperto» ha un solo significato in tutte le viste (metro, città, condizioni dei pin, disponibilità).
- R6-10 [F] Odaiba e Asakusa seguono la condizione **decisa dall'utente (2026-10-20, tramite il PM)**, che corregge la formula del piano «Odaiba e Asakusa seguono il libro»:
  - **Odaiba / Seaside Park** si sblocca con **la lettura completata del libro «Luoghi della movida» OPPURE Ann (Amanti) al rango 10**: le due condizioni sono **in alternativa** (un gruppo «una delle due»). La data del 1° giugno è quella in cui il libro va in vendita, non lo sblocco, e non compare nella condizione. Nella partita di prova: completare la lettura apre il quartiere e togliere la lettura lo richiude, se Ann non è al rango 10; con Ann al rango 10 il quartiere è aperto anche senza la lettura.
  - **Asakusa** si sblocca con **Ann (Amanti) al rango 7**, senza libro. Nella partita di prova, salire al rango 7 lo apre e tornare sotto lo richiude.
  - Il libro «Shitamachi rinato» sblocca lo **Skytree** (luogo), non il quartiere (Esperto della guida, G-009).
- R6-11 [F] Il libro mostra cosa sblocca, letto dalla condizione del posto sbloccato (non da una frase sul libro); i 3 libri oggi ignorati sbloccano davvero.
- R6-12 [F] La Clinica (Takemi) ha **due date per due cose diverse** (decisione dell'utente, 2026-10-20, tramite il PM; Esperto della guida, G-006), ciascuna scritta in un posto solo:
  - il **16 aprile** è la prima data utile del **negozio di farmaci**, cioè lo sblocco del luogo/negozio;
  - il **18 aprile** è lo **sblocco di Tae come Confidente**, cioè il requisito del rango 1.

  Tutte le viste che le citano (luogo, negozio, Confidente, calendario, disponibilità) mostrano quella giusta e nessun'altra. Il piano diceva «una data sola»: vale una data per ciascuna cosa.
- R6-13 [F] Lo sblocco di luoghi e negozi è una condizione sul luogo (sede); le frasi di sblocco di oggi (57 + 35) sono migrate o tenute come nota secondo l'elenco approvato.
- R6-14 [F] La data di sblocco di un Confidente è il requisito del suo rango 1; semafori, calendario e avvisi la ricavano da lì; le 9/23 divergenze di oggi spariscono.
- R6-15 [F] Il requisito «Richiesta» dei Confidenti cita la Richiesta per chiave; i 21 requisiti di oggi danno lo stesso esito di prima.
- R6-16 [F] Apertura e scadenza di un Palazzo vivono nella finestra del Palazzo (pagina del Palazzo); scheda, metro, condizioni «arco», calendario e pin d'ingresso la leggono da lì; Kamoshida ha una data, Madarame una scadenza. Valori della guida (Esperto, G-007): Kamoshida prima entrata 11 aprile, scadenza 2 maggio (consiglio scolastico; certezza media: la guida non scrive «ultimo giorno»); Madarame dal 16 maggio, lettera di sfida entro il 2 giugno, furto entro il 5 giugno — sono i valori già nell'app, che restano; la lettera è un vincolo distinto dalla scadenza del furto, non una seconda scadenza.
- R6-16b [F] **Le condizioni sul Palazzo usano i due livelli di L4** (decisione dell'utente del 2026-10-20; G-026):
  - «Palazzo concluso», cioè Tesoro e boss finale dichiarato (L4 R4-22, §8.14), è la condizione di ogni sblocco «dopo il Palazzo di X», degli inviti (R6-08c2), dei requisiti «Completare il Palazzo» e della sparizione dell'ingresso;
  - «completato al 100%» non sblocca nulla: nel gioco nessuno sblocco dipende dalla raccolta completa (G-026). Esiste come condizione solo se l'utente la vuole esplicitamente;
  - le condizioni «arco» restano legate alla data (2026-09-30).

  Il boss finale è **una voce dichiarata per Palazzo** (`voce_boss_finale`, L4 §8.14, G-027), non l'euristica dell'infiltrazione più alta. Senza quella voce il Palazzo non si conclude e la condizione dice «manca: il boss finale». Per Madarame la voce è «Scontro con Madarame» (ordine 19), inserita dall'utente (dubbio 10). In concreto: `palazzo{dungeon}` = concluso, cioè tutti i pin Tesoro più la voce del boss finale fatti. La condizione di un invito si valuta sullo stato della partita al momento del gesto, non sulla data; senza le condizioni vere compare «Non ancora possibile: manca …» (`modifiche.md` di L6).

  Verifiche sulla partita reale copiata:
  - Kamoshida p1 è concluso: gli sblocchi «dopo il Palazzo di Kamoshida» sono veri, come oggi;
  - Madarame p1 è concluso, grazie alla voce «Scontro con Madarame»: gli sblocchi «dopo il Palazzo di Madarame» e la condizione dell'invito di Ryuji del 29/5 sono veri;
  - nella partita «Tutorial» il pin 1657 del tutorial dell'11/04 non conclude Kamoshida.
- R6-17 [F] Le regole d'atterraggio di un Palazzo sono una sola fonte; metro e diario atterrano nello stesso posto per tutti i Palazzi (le 6 divergenze su «Tokyo» spariscono).
- R6-18 [F] Le frasi di sblocco e disponibilità che restano dopo la migrazione sono solo note: nessuna vista ne deduce un esito.

### Migrazione e casi dubbi
- R6-19 [F] Prima della migrazione esiste un elenco approvabile delle frasi → condizioni (per ogni frase: oggetto, testo, condizione proposta, nota che resta) e degli abbinamenti per nome → chiave dubbi; si applicano solo gli abbinamenti sicuri e quelli approvati.
- R6-20 [F] La migrazione converte le condizioni salvate di oggi (pin, Confidenti, luoghi, negozi, quartieri) nel vocabolario unico senza cambiare l'esito: per ogni condizione, esito prima = esito dopo sulla partita reale copiata e su una partita di prova, a più date.
- R6-21 [F] Le condizioni create dall'utente sui pin (visibilità assoluta, 2026-10-09; «Voce della guida», 2026-10-11) restano con lo stesso significato.
- R6-22 [F] Import ed export del pacchetto portano le condizioni nel formato unico; un pacchetto vecchio si legge ancora (le forme vecchie si convertono all'import, come fa oggi `migraCondizioni`).

### Lavoro da preservare e non regressione
- R6-23 [NR] Il diario 04-01..06-01 (255 voci sulla copia di produzione 0440Z del 2026-10-20; 254 sulla copia precedente) invariato; i giorni si aprono con le stesse voci; i semafori e gli avvisi delle voci danno lo stesso esito di prima, salvo le correzioni elencate (es. un quartiere che era «rosso» per errore).
- R6-24 [NR] Kamoshida (169 voci) e Madarame (227 voci e 254 pin utente sulla copia 0440Z, impronta 263; 225/252 sulla copia precedente): condizioni dei pin e delle voci con lo stesso esito; finestre invariate; «concluso» e «completato» come risultano dopo L4 per p1 e p2. Sulla base p5s 0503Z, Kamoshida p1 è concluso e completato (71/71) e Madarame p1 è concluso e completato (Analisi dati, L4 `dati.md` §11.8). Il caso «concluso e non completato» si prova su una partita di prova (L4 R4-22).
- R6-25 [NR] La mappa di Tokyo mostra gli stessi Palazzi negli stessi giorni (regole del 2026-10-04), salvo le correzioni di date elencate.
- R6-26 [NR] Requisiti dei Confidenti già confermati a mano (`requisito_partita`) restano confermati.
- R6-27 [NR] I Memento (Richieste, dedali) danno gli stessi esiti di disponibilità.
- R6-28 [NR] Typecheck e lint verdi; test mirati (condizioniSpillo, migraCondizioni, disponibilità, accesso al mondo, condizioni-pin, condizioni-voce, requisiti dei Confidenti, migrazioni nuove) verdi con output grezzo.

### Esperienza e layout
- R6-29 [UX] Ogni condizione si legge in italiano chiaro con lo stesso testo in ogni vista («dopo aver letto "…"», «dal 12 maggio»), e un esito rosso dice cosa manca.
- R6-30 [UX] L'editor delle condizioni è usabile dal tablet: scelta del tipo, poi dell'oggetto per nome con ricerca (salvato per chiave), anteprima dell'esito sulla partita corrente.
- R6-31 [L] Editor delle condizioni e elenco delle frasi da approvare: nessuno scorrimento orizzontale a 1280, 768, 375; bersagli ≥44 px; su telefono l'editor si apre come foglio dal basso; scroll annidati con confine evidente.

## Decisioni coinvolte
Nessuna delle D1–D8 è specifica di L6. Indirettamente: D1 (ordine, L6 dopo L5); D6 e D8 non applicate qui.

## Lavoro dell'utente da preservare toccato dal lotto
- Condizioni scritte a mano dall'utente su pin (mondo e Palazzi), luoghi, negozi, Confidenti; conferme manuali dei requisiti.
- Diario 04-01..06-01: esiti dei semafori (R6-23).
- Kamoshida e Madarame: condizioni dei pin e delle voci (R6-24).

## Dipendenze
- **L5 consegnato** (luogo come sede, negozio come listino: lo sblocco va sul luogo).
- L2 (quartieri e aree per chiave), L3 (Palazzi per chiave).
- Prepara **L7** (condizioni «articolo» per chiave dell'oggetto unico), **L9** (calendario derivato: scadenze e sblocchi dalle condizioni,
  disponibilità dei Confidenti), **L10** (eventi di storia come fatti citati dalle condizioni).

## Casi dubbi da approvare (soluzione prudente proposta)
0. *(Per i quartieri non vale: R6-08b chiede una condizione strutturata per ognuno, senza frasi residue. I dubbi 1-2 valgono per luoghi,
   negozi e altri oggetti.)*
1. **Frasi che dicono più di un dato** («dopo il 12/5 se hai letto X, di sera»): si convertono in un gruppo di condizioni e la frase resta
   come nota; se la conversione è incerta, frase intatta e voce nell'elenco.
2. **Abbinamenti per nome incerti** (Richieste, oggetti con nomi simili): nessun abbinamento automatico sotto il «sicuro»; elenco con le
   proposte.
3. **Date contraddittorie** (Kamoshida 3 date, Madarame 3 scadenze, Clinica): vince la data della guida italiana; le altre restano visibili
   nell'elenco con la fonte, l'utente sceglie.
   **Esperto della guida (G-006, G-007)**: le date sono quelle in R6-12 e R6-16; i dati dell'app di Kamoshida e Madarame sono già coerenti.
   **Clinica decisa dall'utente (2026-10-20)**: due date per due cose diverse, R6-12 (chiuso). Restano le date dei Palazzi: già coerenti, nessuna scelta richiesta.
4. **I 13 quartieri «rossi»** — **chiuso per indicazione dell'utente (2026-10-20)**: non è un dubbio. Ogni quartiere ha sempre un evento
   che lo sblocca: un quartiere con la sola frase è un elemento non elaborato nella progettazione. Si risolve con R6-08b: condizione
   strutturata per ogni quartiere, dalla tabella G-018 dell'Esperto della guida, e descrizione generata dalla condizione. Le note G-010 qui
   sotto restano come primo riscontro, in attesa di G-018.
   **Esperto della guida (G-010)**: dall'inizio sono aperti Yongen-Jaya (9/4), Shibuya e Aoyama-Itchome/Shujin (11/4); le uscite serali fuori
   da Yongen-Jaya solo dal 6 maggio. Primi sblocchi: Ogikubo Ryuji R4, Parco Inokashira Ann R3, Harajuku libro «Vague» (dal 18/5) o invito
   di Mishima del 3/8, Kichijoji 5/6, Tsukishima Ryuji R7, Suidobashi 10/6 (dato dell'app, certezza media), Shinjuku 18/6, Akihabara senza
   data nella guida italiana (31/8 dalla fonte inglese, certezza media). Il confronto quartiere per quartiere con le condizioni dell'app va
   in `dati.md`. *Superato da G-018 e G-023:* per Harajuku l'invito è di Ryuji il 29/5, perché gli inviti di Mishima in Royal non esistono;
   Suidobashi è `data{06-09}` (G-018); i valori validi sono in R6-08b, R6-08d e in `modifiche.md` §4.1.
5. **Tipo «evento» e «evento storia»**: gli eventi di storia restano un elenco di dati (piano riga 139) citato per chiave; l'elenco nuovo
   di eventi è di L10; L6 garantisce solo che le condizioni li citino per chiave.
6. **Pacchetti vecchi**: le forme vecchie si accettano all'import e si convertono; non si esportano più.
7. **Sera dal 6 maggio**: la regola «uscite serali fuori da Yongen-Jaya solo dal 6/5» (G-010) è una condizione di fascia sui quartieri, da
   esprimere nel vocabolario unico; prudente: aggiungerla solo se oggi l'app la applica già in qualche forma, altrimenti elencarla come
   proposta.
8. **Inviti dei Confidenti scritti oggi come «oppure»** (Ryuji per Ichigaya, Mishima per Ikebukuro e Harajuku, Ann per il Santuario Meiji,
   Akechi per Shinagawa, Futaba per Nakano): per l'Esperto (G-018) la guida italiana non li descrive come sblocchi; li riporta solo la
   fonte inglese, in parte dal P5 originale. Prudente: non metterli nelle condizioni. Vanno in un elenco «vie alternative da confermare» con
   la fonte; l'utente li aggiunge se li vuole, come ha fatto per Ann al rango 10 a Odaiba. *Proposta superata.*
   **Deciso dall'utente (2026-10-20, tramite il PM)**: «gli inviti dei confidenti sono eventi del diario... che sbloccano i luoghi... nel
   diario ci sarà un Confidente X ti ha chiesto di uscire... e il Confidente deve poter dare anche la possibilità di sbloccare un'area».
   Gli «oppure» con un invito **restano sblocchi alternativi**, in OR come per Odaiba, espressi con il tipo strutturato «invito del
   Confidente avvenuto» (R6-08c, R6-08d). Chiuso.
10. **Boss finale di Madarame** — **risolto (PM, 2026-10-20)**. Nella copia fresca di produzione `dati-produzione/2026-10-20-0440Z` l'utente
    ha già inserito il boss di Madarame: ordine 18 «Scontro Madarame a pezzi» e ordine 19 «Scontro con Madarame»
    (`scontro-con-madarame-2`). `voce_boss_finale` di Madarame è la voce in ordine 19 (L4 §8.14 aggiornato). La proposta «Sconfiggi
    Madarame» di G-027 è ritirata dall'Esperto. Madarame p1 risulta concluso e completato: nessuna regressione per gli sblocchi «dopo
    Madarame» né per l'invito di Ryuji del 29/5. Testo della prima stesura, superato: Madarame senza voce del boss finale non si
    concludeva, e serviva il sì dell'utente alla voce di G-027.
11. **Errore 2 di G-028, «Camera della vacuità»**: riguarda il testo di una voce e il nome di un'infiltrazione di Futaba (L3, L4), non le
    condizioni. In L6 vale solo questo: le descrizioni generate dalle condizioni usano il nome dell'infiltrazione così com'è nella fonte unica,
    senza testi ricopiati.
9. **Certezza media** per la data di Maihama (11/10). Roppongi è chiuso: `data{09-15}` da G-031, con certezza alta. Si applicano come in G-018, segnati
   «da verificare» nella fonte della condizione.
