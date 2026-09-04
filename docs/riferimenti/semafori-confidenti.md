# Semafori dei Confidenti — cosa l'app verifica da sola e cosa resta da confermare a mano

Fonte: `data/seed/confidenti-requisiti.json` (131 ranghi, 160 requisiti), ricostruito dalla guida Royal di allgamestaff (una pagina per Confidente, letta due volte da agenti indipendenti con citazione letterale obbligatoria; nel seed resta solo ciò su cui le due letture concordano o che è citato con certezza). Ogni requisito è un semaforo: verde = soddisfatto, rosso = non ancora, grigio = l'app non può saperlo e chiede la conferma. Un Confidente con almeno un semaforo non verde per il rango successivo è **bloccato**: carta grigia, «+» e sblocco disattivati; «Segna comunque» forza il rango e resta nello storico.

Regola di merito: un semaforo è solo ciò che il gioco **impone**. I consigli della guida (data consigliata, Persona dello stesso arcano per il bonus punti, regali, risposte) e le descrizioni di eventi automatici di trama non sono semafori.

## Tipi di requisito e come vengono valutati

| Tipo | Quanti | Valutazione |
|---|---|---|
| `data` | 57 | automatica: giorno corrente della partita (aprile prima di marzo); grigio se il giorno non è impostato |
| `meteo` | 43 | automatica dal calendario del giorno corrente (pioggia sì/no); grigio se il meteo del giorno non è noto |
| `dote` | 17 | automatica: rango della Dote nella partita |
| `palazzo` | 15 | automatica quando il boss del Palazzo è segnato «ottenuto» nella Guida; altrimenti grigio da confermare |
| `richiesta` | 11 | automatica quando la richiesta dei Mementos è completata nella partita; altrimenti grigio da confermare |
| `persona-abilita` | 10 | automatica: la Persona richiesta con quella skill nella scorta della partita (Gemelle Custodi) |
| `manuale` | 6 | **sempre grigio**: solo la conferma dell'utente lo rende verde |
| `confidente` | 1 | automatica: rango dell'altro Confidente nella partita |

## Requisiti manuali (non verificabili dall'app)

| Confidente | Rango | Requisito |
|---|---|---|
| Futaba Sakura | 4 | L'evento del Rango 4 richiede che la scuola sia aperta: non è disponibile durante le chiusure scolastiche. |
| Goro Akechi | 8 | Bisogna VINCERE il duello uno contro uno con Akechi nei Memento: se si perde il Confidente non avanza e occorre chiedergli la rivincita. |
| Sojiro Sakura | 3 | Aver preparato il caffè al Leblanc almeno una volta |
| Chihaya Mifune | 1 | Bisogna comprare da Chihaya la Pietra Sacra per 100.000 yen: senza l'acquisto il Confidente non si sviluppa. |
| Sadayo Kawakami | 1 | Occorre pagare i 5.000 yen della chiamata al servizio di cameriere. |
| Toranosuke Yoshida | 1 | Sbloccare il Confidente parlando in Piazza della Stazione di Shibuya con l'Oratore di strada (Yoshida) |

## Gemelle Custodi: semaforo automatico sulla scorta

| Rango | Persona | Skill |
|---|---|---|
| 1 | Jack Frost | Mabufu |
| 2 | Ame-no-Uzume | Frei |
| 3 | Flauros | Tarukaja |
| 4 | Phoenix | Counter |
| 5 | Setanta | Rakukaja |
| 6 | Neko Shogun | Dekaja |
| 7 | Lachesis | Tetraja |
| 8 | Hecatoncheires | Masukunda |
| 9 | Bugs | Samarecarm |
| 10 | Seth | High Counter |

## Requisiti che l'app verifica solo se hai segnato l'evento (altrimenti grigi da confermare)

| Confidente | Rango | Tipo | Requisito |
|---|---|---|---|
| Igor | 4 | `palazzo` | Aver sconfitto il boss finale del Palazzo di Madarame |
| Igor | 6 | `palazzo` | Aver sconfitto il boss del Palazzo di Kaneshiro |
| Morgana | 3 | `palazzo` | Sconfiggere il boss finale del Palazzo di Madarame |
| Morgana | 5 | `palazzo` | Sconfiggere il boss del Palazzo di Kaneshiro, poi andare a dormire |
| Morgana | 9 | `palazzo` | Superare il combattimento finale nel Palazzo di Okumura |
| Futaba Sakura | 8 | `richiesta` | Completare la richiesta dei Mementos "E una figlia o un buono pasto?" (sbloccata al rango 7) |
| Goro Akechi | 9 | `palazzo` | Si attiva automaticamente durante il Palazzo di Shido |
| Goro Akechi | 10 | `palazzo` | Si attiva automaticamente durante il Palazzo di Shido |
| Sojiro Sakura | 1 | `palazzo` | Aver completato il Palazzo di Kamoshida |
| Sojiro Sakura | 9 | `richiesta` | Completare la richiesta dei Mementos "Lo zio ingordo" |
| Chihaya Mifune | 1 | `richiesta` | Completare la richiesta dei Mementos "Un fidanzato violento" prima di poter far salire il Rango Confidente |
| Chihaya Mifune | 8 | `richiesta` | Completare la richiesta dei Mementos "Smascheriamo i ciarlatani" (sbloccata durante l'evento intermedio di Rango 7.5) prima di avviare il Rango 8 |
| Munehisa Iwai | 8 | `richiesta` | Aver completato la richiesta dei Mementos "Affari loschi nell'ombra" |
| Tae Takemi | 8 | `richiesta` | Completare la richiesta dei Mementos "Medicina amara" (si sblocca durante l'evento di rango 7.5) |
| Sadayo Kawakami | 9 | `richiesta` | Completare la richiesta dei Mementos "Le fatiche di una maid in cattedra" |
| Ichiko Ohya | 8 | `richiesta` | Completare la richiesta dei Mementos "Lottare per la liberta di stampa" (sbloccata al Rango 7.5 chiedendo a Ohya il nome del suo capo, Shinpei Honjo). |
| Shinya Oda | 1 | `richiesta` | Completare la richiesta dei Mementos "I vincenti non imbrogliano" |
| Shinya Oda | 9 | `richiesta` | Completare la richiesta dei Mementos "Una madre aggressiva" |
| Hifumi Togo | 8 | `richiesta` | Completare la richiesta "La mamma manager" nei Mementos |
| Sae Niijima | 1 | `palazzo` | Completare il Palazzo di Kaneshiro |
| Sae Niijima | 3 | `palazzo` | Completare il Palazzo di Futaba |
| Sae Niijima | 5 | `palazzo` | Completare il Palazzo di Okumura |
| Sae Niijima | 7 | `palazzo` | Completare il Palazzo di Niijima |
| Sae Niijima | 8 | `palazzo` | Completare il Palazzo di Niijima |
| Sae Niijima | 9 | `palazzo` | Completare il Palazzo di Niijima |
| Sae Niijima | 10 | `palazzo` | Completare il Palazzo di Niijima |

## Tutti i semafori, rango per rango

### Igor (Fool)

- Rango 1 · `data` — `04-11`: Disponibile dal 12 aprile (la guida giorno per giorno del progetto lo avvia il 11/04)
- Rango 2 · `data` — `04-20`: Non prima del 20 aprile (evento di trama fissato)
- Rango 3 · `data` — `05-05`: Non prima del 5 maggio (evento di trama fissato)
- Rango 4 · `palazzo` — `madarame`: Aver sconfitto il boss finale del Palazzo di Madarame
- Rango 5 · `data` — `06-11`: Non prima dell'11 giugno (evento di trama fissato)
- Rango 6 · `palazzo` — `kaneshiro`: Aver sconfitto il boss del Palazzo di Kaneshiro
- Rango 7 · `data` — `08-22`: Non prima del 22 agosto (evento di trama fissato)
- Rango 9 · `data` — `10-11`: Non prima dell'11 ottobre (evento di trama fissato)
- Rango 10 · `data` — `12-24`: Non prima del 24 dicembre (evento di trama fissato)

### Morgana (Magician)

- Rango 1 · `data` — `04-15`: Disponibile dal 15 aprile (data di sblocco del Confidente)
- Rango 2 · `data` — `04-22`: Non prima del 22 aprile: il rango scatta automaticamente in quella data
- Rango 3 · `data` — `06-01`: Non prima del 1 giugno: il rango scatta automaticamente in quella data
- Rango 3 · `palazzo` — `madarame`: Sconfiggere il boss finale del Palazzo di Madarame
- Rango 4 · `data` — `06-20`: Non prima del 20 giugno: il rango scatta automaticamente in quella data
- Rango 5 · `data` — `06-27`: Non prima del 27 giugno: il rango scatta automaticamente in quella data
- Rango 5 · `palazzo` — `kaneshiro`: Sconfiggere il boss del Palazzo di Kaneshiro, poi andare a dormire
- Rango 6 · `data` — `07-25`: Non prima del 25 luglio: il rango scatta automaticamente in quella data
- Rango 7 · `data` — `08-29`: Non prima del 29 agosto: il rango scatta automaticamente in quella data
- Rango 8 · `data` — `09-17`: Non prima del 17 settembre: il rango scatta automaticamente in quella data
- Rango 9 · `data` — `10-06`: Non prima del 6 ottobre: il rango scatta automaticamente in quella data
- Rango 9 · `palazzo` — `okumura`: Superare il combattimento finale nel Palazzo di Okumura
- Rango 10 · `data` — `12-23`: Non prima del 23 dicembre: il rango scatta automaticamente in quella data

### Makoto Niijima (Priestess)

- Rango 1 · `data` — `07-26`: Disponibile dal 26 luglio (sblocco del Confidente)
- Rango 1 · `dote` — `conoscenza`: Conoscenza al rango 3 (Studioso)
- Rango 2 · `meteo` — `non-piove`: Non deve piovere: l'evento del rango 2 si svolge all'aperto
- Rango 6 · `dote` — `fascino`: Fascino al rango massimo 5 (Irresistibile): senza di esso il Confidente resta bloccato al rango 5
- Rango 9 · `meteo` — `non-piove`: Non deve piovere: l'evento del rango 9 si svolge all'aperto

### Haru Okumura (Empress)

- Rango 1 · `data` — `10-31`: Disponibile dal 31 ottobre (sblocco del confidente)
- Rango 4 · `dote` — `perizia`: Perizia al rango massimo (Migliore)
- Rango 9 · `data` — `11-25`: Non avviabile prima del 25 novembre

### Yusuke Kitagawa (Emperor)

- Rango 1 · `data` — `06-18`: Disponibile dal 18 giugno: il legame si apre con il messaggio di Yusuke dopo la scuola
- Rango 4 · `meteo` — `non-piove`: Non deve piovere: l'evento del Rango 4 si svolge all'aperto (parco)
- Rango 6 · `dote` — `perizia`: Perizia al Rango 4 (Asso)
- Rango 6 · `meteo` — `non-piove`: Non deve piovere: l'evento del Rango 6 si svolge all'aperto (vecchia casa di Madarame)
- Rango 9 · `meteo` — `non-piove`: Non deve piovere: l'evento del Rango 9 si svolge all'aperto

### Sojiro Sakura (Hierophant)

- Rango 1 · `data` — `04-23`: Disponibile dal 23 aprile (sblocco automatico al Leblanc)
- Rango 1 · `palazzo` — `kamoshida`: Aver completato il Palazzo di Kamoshida
- Rango 3 · `manuale`: Aver preparato il caffè al Leblanc almeno una volta
- Rango 5 · `data` — `08-22`: Non disponibile prima del 22 agosto (scadenza del Palazzo di Futaba)
- Rango 7 · `dote` — `gentilezza`: Gentilezza al massimo (Rango 5 - Angelico)
- Rango 9 · `richiesta` — `Lo zio ingordo`: Completare la richiesta dei Mementos "Lo zio ingordo"

### Ann Takamaki (Lovers)

- Rango 1 · `data` — `04-15`: Disponibile dal 15 aprile, quando Ann entra nel gruppo dopo la sconfitta del Capitano della Guardia nel Palazzo di Kamoshida
- Rango 2 · `data` — `05-06`: Non avviabile prima del 6 maggio
- Rango 2 · `dote` — `gentilezza`: Gentilezza al Rango 2 (Gentile)
- Rango 3 · `meteo` — `non-piove`: Evento all'aperto: non disponibile nei giorni di pioggia
- Rango 4 · `meteo` — `non-piove`: Evento all'aperto: non disponibile nei giorni di pioggia
- Rango 5 · `meteo` — `non-piove`: Evento all'aperto: non disponibile nei giorni di pioggia
- Rango 7 · `meteo` — `non-piove`: Evento all'aperto: non disponibile nei giorni di pioggia
- Rango 9 · `meteo` — `non-piove`: Evento all'aperto: non disponibile nei giorni di pioggia
- Rango 10 · `meteo` — `non-piove`: Evento all'aperto: non disponibile nei giorni di pioggia

### Ryuji Sakamoto (Chariot)

- Rango 1 · `data` — `04-12`: Disponibile dal 12 aprile: il Confidente si sblocca automaticamente durante la storia principale
- Rango 2 · `meteo` — `non-piove`: Non deve piovere: l'evento di Rango 2 si svolge all'aperto
- Rango 3 · `meteo` — `non-piove`: Non deve piovere: l'evento di Rango 3 si svolge all'aperto
- Rango 5 · `data` — `05-06`: Non avviabile prima del 6 maggio
- Rango 6 · `meteo` — `non-piove`: Non deve piovere: l'evento di Rango 6 si svolge all'aperto
- Rango 8 · `meteo` — `non-piove`: Non deve piovere: l'evento di Rango 8 si svolge all'aperto

### Goro Akechi (Justice)

- Rango 1 · `data` — `06-10`: Disponibile dal 10 giugno: il Confidente si sblocca automaticamente durante l'evento della trama (programma televisivo).
- Rango 3 · `dote` — `conoscenza`: Conoscenza al rango 3 (Studioso)
- Rango 3 · `dote` — `fascino`: Fascino al rango 3 (Affascinante)
- Rango 4 · `meteo` — `non-piove`: Non deve piovere: l'avanzamento al Rango 4 non e disponibile con la pioggia.
- Rango 6 · `data` — `09-03`: Non avviabile prima del 3 settembre
- Rango 7 · `data` — `11-02`: Non avviabile prima del 2 novembre
- Rango 7 · `dote` — `conoscenza`: Conoscenza al rango 4 (Dotto)
- Rango 8 · `manuale`: Bisogna VINCERE il duello uno contro uno con Akechi nei Memento: se si perde il Confidente non avanza e occorre chiedergli la rivincita.
- Rango 9 · `palazzo` — `shido`: Si attiva automaticamente durante il Palazzo di Shido
- Rango 10 · `palazzo` — `shido`: Si attiva automaticamente durante il Palazzo di Shido

### Futaba Sakura (Hermit)

- Rango 1 · `data` — `08-31`: Disponibile dal 31 agosto: il confidente si sblocca quando Futaba invita il protagonista ad Akihabara dopo l'incontro al Leblanc con Sojiro
- Rango 2 · `dote` — `gentilezza`: Gentilezza al rango 4 (Altruista)
- Rango 4 · `manuale`: L'evento del Rango 4 richiede che la scuola sia aperta: non è disponibile durante le chiusure scolastiche.
- Rango 8 · `richiesta` — `È una figlia o un buono pasto?`: Completare la richiesta dei Mementos "E una figlia o un buono pasto?" (sbloccata al rango 7)

### Chihaya Mifune (Fortune)

- Rango 1 · `data` — `06-23`: Chihaya si incontra a Shinjuku a partire dal 23 giugno (primo incontro/sblocco del Confidente)
- Rango 1 · `richiesta` — `Un fidanzato violento`: Completare la richiesta dei Mementos "Un fidanzato violento" prima di poter far salire il Rango Confidente
- Rango 1 · `manuale`: Bisogna comprare da Chihaya la Pietra Sacra per 100.000 yen: senza l'acquisto il Confidente non si sviluppa.
- Rango 8 · `richiesta` — `Smascheriamo i ciarlatani`: Completare la richiesta dei Mementos "Smascheriamo i ciarlatani" (sbloccata durante l'evento intermedio di Rango 7.5) prima di avviare il Rango 8

### Gemelle Custodi (Caroline e Justine) (Strength)

- Rango 1 · `data` — `05-18`: Disponibile dal 18 maggio, quando si ottiene l'accesso alla Stanza di Velluto durante l'infiltrazione del Palazzo di Madarame
- Rango 1 · `persona-abilita` — `Jack Frost · Mabufu`: Consegnare alle Gemelle una Persona Jack Frost che conosca Mabufu.
- Rango 2 · `persona-abilita` — `Ame-no-Uzume · Frei`: Consegnare alle Gemelle una Persona Ame-no-Uzume che conosca Frei.
- Rango 3 · `persona-abilita` — `Flauros · Tarukaja`: Consegnare alle Gemelle una Persona Flauros che conosca Tarukaja.
- Rango 4 · `persona-abilita` — `Phoenix · Counter`: Consegnare alle Gemelle una Persona Phoenix che conosca Counter.
- Rango 5 · `persona-abilita` — `Setanta · Rakukaja`: Consegnare alle Gemelle una Persona Setanta che conosca Rakukaja.
- Rango 6 · `persona-abilita` — `Neko Shogun · Dekaja`: Consegnare alle Gemelle una Persona Neko Shogun che conosca Dekaja.
- Rango 7 · `persona-abilita` — `Lachesis · Tetraja`: Consegnare alle Gemelle una Persona Lachesis che conosca Tetraja.
- Rango 8 · `persona-abilita` — `Hecatoncheires · Masukunda`: Consegnare alle Gemelle una Persona Hecatoncheires che conosca Masukunda.
- Rango 9 · `persona-abilita` — `Bugs · Samarecarm`: Consegnare alle Gemelle una Persona Bugs che conosca Samarecarm.
- Rango 10 · `persona-abilita` — `Seth · High Counter`: Consegnare alle Gemelle una Persona Seth che conosca High Counter.

### Munehisa Iwai (Hanged)

- Rango 1 · `dote` — `coraggio`: Coraggio al rango 4 (Temerario)
- Rango 4 · `meteo` — `non-piove`: Non deve piovere: l'evento del rango 4 si svolge all'aperto
- Rango 8 · `dote` — `coraggio`: Serve Coraggio al rango massimo per superare l'evento intermedio che precede il rango 8.
- Rango 8 · `richiesta` — `Affari loschi nell'ombra`: Aver completato la richiesta dei Mementos "Affari loschi nell'ombra"
- Rango 9 · `meteo` — `non-piove`: Non deve piovere: l'evento del rango 9 si svolge all'aperto

### Tae Takemi (Death)

- Rango 1 · `data` — `04-18`: Disponibile dal 18 aprile: primo incontro alla Clinica medica Takemi di Yongen-Jaya, che sblocca la Confidente
- Rango 2 · `dote` — `coraggio`: Coraggio al rango 2 (Audace)
- Rango 6 · `meteo` — `non-piove`: L'evento di rango 6 non e disponibile quando piove
- Rango 8 · `dote` — `fascino`: Fascino al rango 4 (Carismatico)
- Rango 8 · `richiesta` — `Medicina amara`: Completare la richiesta dei Mementos "Medicina amara" (si sblocca durante l'evento di rango 7.5)
- Rango 9 · `meteo` — `non-piove`: L'evento di rango 9 non e disponibile quando piove

### Sadayo Kawakami (Temperance)

- Rango 1 · `data` — `06-04`: Confidente disponibile solo dopo l'evento di sblocco: il 3 giugno parte l'Operazione Guardia MAIDica, il 4 giugno si parla con Kawakami a scuola ottenendo i contatti
- Rango 1 · `dote` — `coraggio`: Coraggio al rango 3 (Coraggioso): senza questo livello non e possibile chiamare Kawakami
- Rango 1 · `manuale`: Occorre pagare i 5.000 yen della chiamata al servizio di cameriere.
- Rango 9 · `richiesta` — `Le fatiche di una maid in cattedra`: Completare la richiesta dei Mementos "Le fatiche di una maid in cattedra"

### Ichiko Ohya (Devil)

- Rango 1 · `data` — `07-05`: Disponibile dal 5 luglio: prima sera utile per raggiungere il Bar Crossroads a Shinjuku e incontrare Ohya.
- Rango 4 · `meteo` — `non-piove`: L'evento di Rango 4 non e disponibile se piove: serve una giornata senza pioggia.
- Rango 8 · `richiesta` — `Lottare per la libertà di stampa`: Completare la richiesta dei Mementos "Lottare per la liberta di stampa" (sbloccata al Rango 7.5 chiedendo a Ohya il nome del suo capo, Shinpei Honjo).
- Rango 10 · `meteo` — `non-piove`: L'evento di Rango 10 non e disponibile se piove: serve una giornata senza pioggia.

### Shinya Oda (Tower)

- Rango 1 · `data` — `09-05`: Disponibile dal 5 settembre
- Rango 1 · `richiesta` — `I vincenti non imbrogliano`: Completare la richiesta dei Mementos "I vincenti non imbrogliano"
- Rango 7 · `meteo` — `non-piove`: Non deve piovere: l'evento si svolge all'aperto
- Rango 8 · `meteo` — `non-piove`: Non deve piovere: l'evento si svolge all'aperto
- Rango 9 · `richiesta` — `Una madre aggressiva`: Completare la richiesta dei Mementos "Una madre aggressiva"
- Rango 9 · `meteo` — `non-piove`: Non deve piovere: l'evento si svolge all'aperto

### Hifumi Togo (Star)

- Rango 1 · `data` — `06-28`: Disponibile dal 28 giugno
- Rango 1 · `dote` — `fascino`: Fascino al rango 3 (Affascinante)
- Rango 4 · `meteo` — `non-piove`: Non deve piovere
- Rango 6 · `meteo` — `non-piove`: Non deve piovere
- Rango 8 · `dote` — `conoscenza`: Conoscenza al rango 5 (Erudito)
- Rango 8 · `richiesta` — `La mamma manager`: Completare la richiesta "La mamma manager" nei Mementos

### Yuuki Mishima (Moon)

- Rango 1 · `data` — `05-06`: Disponibile dal 6 maggio: e la data di sblocco del Confidente, quando Mishima viene a parlarci dopo uno scambio di messaggi con gli alleati
- Rango 3 · `meteo` — `non-piove`: Non deve piovere: l'evento di rango 3 si svolge all'aperto
- Rango 6 · `meteo` — `non-piove`: Non deve piovere: l'evento di rango 6 si svolge all'aperto (Parco Inokashira)
- Rango 7 · `meteo` — `non-piove`: Non deve piovere: l'evento di rango 7 si svolge all'aperto (parco di Akihabara)
- Rango 8 · `meteo` — `non-piove`: Non deve piovere: l'evento di rango 8 si svolge all'aperto
- Rango 10 · `meteo` — `non-piove`: Non deve piovere: l'evento di rango 10 si svolge all'aperto (parco)

### Toranosuke Yoshida (Sun)

- Rango 1 · `meteo` — `non-piove`: Yoshida non è disponibile se piove.
- Rango 1 · `manuale`: Sbloccare il Confidente parlando in Piazza della Stazione di Shibuya con l'Oratore di strada (Yoshida)
- Rango 2 · `meteo` — `non-piove`: Yoshida non è disponibile se piove.
- Rango 3 · `meteo` — `non-piove`: Yoshida non è disponibile se piove.
- Rango 4 · `meteo` — `non-piove`: Yoshida non è disponibile se piove.
- Rango 5 · `meteo` — `non-piove`: Yoshida non è disponibile se piove.
- Rango 6 · `meteo` — `non-piove`: Yoshida non è disponibile se piove.
- Rango 7 · `meteo` — `non-piove`: Yoshida non è disponibile se piove.
- Rango 8 · `meteo` — `non-piove`: Yoshida non è disponibile se piove.
- Rango 9 · `meteo` — `non-piove`: Yoshida non è disponibile se piove.
- Rango 10 · `meteo` — `non-piove`: Yoshida non è disponibile se piove.

### Sae Niijima (Judgement)

- Rango 1 · `data` — `07-09`: Disponibile dal 9 luglio
- Rango 1 · `palazzo` — `kaneshiro`: Completare il Palazzo di Kaneshiro
- Rango 2 · `data` — `07-24`: Non prima del 24 luglio (avanzamento automatico di trama)
- Rango 3 · `data` — `08-22`: Non prima del 22 agosto (avanzamento automatico di trama)
- Rango 3 · `palazzo` — `futaba`: Completare il Palazzo di Futaba
- Rango 4 · `data` — `09-13`: Non prima del 13 settembre (avanzamento automatico di trama)
- Rango 5 · `data` — `10-12`: Non prima del 12 ottobre (avanzamento automatico di trama)
- Rango 5 · `palazzo` — `okumura`: Completare il Palazzo di Okumura
- Rango 6 · `data` — `10-28`: Non prima del 28 ottobre (avanzamento automatico di trama)
- Rango 7 · `data` — `11-20`: Non prima del 20 novembre (interrogatorio, evento di trama)
- Rango 7 · `palazzo` — `niijima`: Completare il Palazzo di Niijima
- Rango 8 · `data` — `11-20`: Non prima del 20 novembre (interrogatorio, evento di trama)
- Rango 8 · `palazzo` — `niijima`: Completare il Palazzo di Niijima
- Rango 9 · `data` — `11-20`: Non prima del 20 novembre (interrogatorio, evento di trama)
- Rango 9 · `palazzo` — `niijima`: Completare il Palazzo di Niijima
- Rango 10 · `data` — `11-20`: Non prima del 20 novembre (interrogatorio, evento di trama)
- Rango 10 · `palazzo` — `niijima`: Completare il Palazzo di Niijima

### Kasumi Yoshizawa (Faith)

- Rango 1 · `data` — `05-30`: Disponibile dal 30 maggio (evento automatico dell'iniziativa scolastica di pulizia del parco)
- Rango 6 · `data` — `01-13`: Non avviabile prima del 13 gennaio
- Rango 6 · `confidente` — `maruki`: Il limite dei cinque ranghi cade solo se il Confidente del Consigliere, Takuto Maruki, è stato sviluppato completamente.
- Rango 7 · `data` — `01-14`: Non avviabile prima del 14 gennaio
- Rango 8 · `data` — `01-16`: Non avviabile prima del 16 gennaio
- Rango 9 · `data` — `01-18`: Non avviabile prima del 18 gennaio

### Takuto Maruki (Councillor)

- Rango 1 · `data` — `05-13`: Disponibile dal 13 maggio: il confidente si avvia automaticamente durante l'assemblea scolastica in cui Maruki viene presentato come terapista della scuola.
- Rango 3 · `meteo` — `non-piove`: Non avviabile nei giorni di pioggia (incontro nell'area dell'Edificio Sportivo della Shujin Academy).
- Rango 6 · `data` — `09-20`: Non avviabile prima del 20 settembre: con Maruki non si puo superare il rango 5 fino a quella data.
- Rango 10 · `data` — `11-18`: Si attiva automaticamente il 18 novembre, a condizione che l'evento del rango 9 sia gia stato completato.

## Note sulle date

- Igor: la pagina Royal indica il 12 aprile; la guida giorno per giorno del progetto (e il gioco) lo avvia la sera dell'11 aprile, che resta la data del requisito.
- Le altre date di rango 1 coincidono con la pagina Royal del Confidente.
