# L6 «Condizioni uniche» — test funzionali

Stato: **casi preparati** (bozza di Analisi requisiti del 2026-10-20 07:34, rivista e completata da Test funzionali lo stesso giorno: rotte di
`modifiche.md` §1–§4, F6-04 reso eseguibile con una base «prima» degli esiti, F6-20/F6-22 legati a L10, F6-41/F6-42 aggiunti). Il file è di
Test funzionali. Esecuzione a pezzi secondo la tabella «Per i tester» di `piano.md` (B1+F2 esiti alle 6 date, B3+F3 inviti, B4+F4 Richieste e
requisiti, B5+F5 quartieri, Palazzi, libri, Clinica, B6+F6 tutto), col via del PM.

> **Da fare prima che la M6 arrivi sull'anteprima: base «prima» degli esiti (serve a F6-04, F6-33, F6-36, F6-37).** Sull'anteprima con il codice
> senza L6, in un ciclo del Collaudo: una partita di prova vuota portata alle 6 date (04-11, 04-16, 05-20, 06-09, 07-05, 10-11, fascia giorno), e
> per ogni data gli esiti letti dalle API di oggi — quartieri (`GET /api/compendio/citta`), luoghi e negozi, `disponibilita` dei pin di tutte le
> mappe del mondo, articoli, libri, film, attività, requisiti dei Confidenti (`GET /api/partite/:id/confidenti`) — salvati per chiave. Più la
> partita 1 alla sua data (06-02 giorno), senza cambiarla. Dopo la M6 si rilegge lo stesso e si confronta riga per riga.
>
> **Presa il 2026-10-20, 05:45:04–05:45:20Z** (ciclo 5 dell'anteprima, foto `anteprima-ciclo5-funzionali`), sull'anteprima su **12484305** (L4
> committato con 71378325 e O3-1, **senza L6**), base p5s-0533Z. In `esiti-funzionali/base-prima-12484305/`: `p1.json` (2098 esiti, partita 1
> al 06-02 giorno), `prova-<data>.json` per le 6 date (2131 esiti ciascuna: 23 quartieri, 53 mappe del mondo, negozi e articoli, attività,
> libri, film, videogiochi, Richieste, Palazzi, requisiti dei Confidenti), `log.txt`, `controllo-date.txt` (fra una data e l'altra cambiano
> 43, 167, 110, 40 e 169 esiti: la base distingue le date). Partita di prova 3 non attiva, eliminata alla fine; partita 1 mai toccata.
> Valori di oggi utili per gli attesi: al 06-09 Suidobashi è **chiuso** (L6 lo apre dal 06-09), Kichijoji e Odaiba aperti; la Clinica ha
> articoli che si sbloccano già fra il 04-11 e il 04-16. Lo script è `esiti-funzionali/l6-base-esiti.cjs` (estrae per chiave i campi
> `disponibilita`, `disponibile`, `sbloccato`, `aperto`, `stato`… di ogni oggetto con un'identità).

- **Fonti**: `requisiti.md` (R6-01…R6-31 con R6-01b, R6-08b…f, R6-08c2/c3, R6-16b; dubbi 0–11), `modifiche.md` (§1 vocabolario, §2 valutatore,
  §3 chiavi, §4 sblocchi, §5 migrazione M6 con le verifiche prima/dopo, §8 piano), `dati.md` (§8b quartieri da G-018), registro dell'Esperto
  (G-006, G-007, G-017, G-018, G-023, G-026, G-028, G-031).
- **Base**: `dati-produzione/p5s-2026-10-20-0503Z` (gioco user_version 108, partite 21). Misure «prima» in sola lettura su una copia della base
  (Analisi requisiti, 07:30). Gli attesi «dopo» vengono da `modifiche.md` §5 e vanno confermati da Analisi dati sulla base dopo il boot di L2–L6.
- **Partite**: p1 «Partita Roberto», attiva, al 06-02 giorno; p2 «Tutorial» al 04-29. Le scritture sulla partita si fanno solo su una
  **partita di prova** creata apposta e poi eliminata. Le scritture sui dati di gioco (condizioni, requisiti, Richieste, finestre) solo sul
  **Collaudo (foto e ripristino), anteprima 3302/5474**.
- **Le 6 date** di `modifiche.md` §5: 04-11, 04-16, 05-20, 06-09, 07-05, 10-11.

## Misure «prima» sulla base 0503Z (sola lettura)
| Misura | Valore |
|---|---|
| condizioni JSON salvate (righe non vuote) | articolo 510, spillo 173, libro 45, film 26, copia_pezzo 23, attività 21, luogo 13, negozio 0 |
| luoghi con condizione | 13: i ritrovi di Ikebukuro (Planetario), Harajuku (hangout e Takenoko Street), Odaiba (Seaside Park), Shinagawa (acquario), Nakano (Broadway), Chinatown, Maihama (Destinyland), Roppongi (Okumura Foods `data 09-15`), Meiji (hangout), Ichigaya (laghetto), Asakusa (Skytree), Memento (ingresso `data 05-09`) |
| quartieri | 24; colonne `sblocco` (frase) e `sblocco_data`; con `sblocco_data`: akihabara 08-31, ikebukuro 09-01, kichijoji 06-05, maihama 10-11, odaiba 06-01, shinjuku 06-18, suidobashi 06-10; senza frase: yongen-jaya, shibuya, shujin-academy, mementos |
| frasi da correggere (esempi) | odaiba «1 giugno oppure Ann R10»; kanda-jinbocho «Kanda: Yusuke R5; Jinbocho: Hifumi R4»; harajuku «Vague… 700¥»; ikebukuro «1 settembre … forse "Cieli notturni"»; chinatown «"Chinese Sweets" (titolo italiano non reperito)» |
| requisiti dei Confidenti | tipi: avviso 1 (Futaba R4), confidente 1, data 54, dote 17, evento 5, meteo 63, palazzo 15, persona-abilita 10, richiesta 11; **manuale 0** |
| requisiti `richiesta` | 11, **per nome** (es. «Lo zio ingordo», «Un fidanzato violento») |
| Clinica Takemi | Tae R1 `data dal 04-15`; negozio `clinica-takemi`: 11 articoli con `data dal 04-15` (più rango del Confidente), 7 con `data dal 04-16` |
| Ohya | R1 `data dal 06-18` |
| conferme manuali (`requisito_partita`) | 0 |
| `dati_guida` letti oggi | `sblocco-luoghi`, `sblocco-quartieri`, `finestre-dungeon` (oltre a battaglia, completamento, jose, …) |
| Palazzi | Kamoshida p1 concluso e completato (71/71); Madarame p1 concluso e completato (voce del boss finale «Scontro con Madarame», ordine 19) |

> **Da allineare in `modifiche.md` prima dei casi sugli inviti** (segnalato a Stesura): §1 riga 42 («dopo l'invito di Mishima del 3 agosto»)
> e §4.1 righe 128 e 131-132 («Ikebukuro, due inviti: Mishima 28/7 e Makoto 30/7»; «riga `mishima/08-03`») contraddicono G-023 e la tabella
> della stessa sezione (righe 139-148): in Royal gli inviti di Mishima non esistono; Harajuku è di Ryuji il 29/5. I casi qui sotto seguono G-023.

## Casi
| id | Criterio | Dove | Passi | Atteso |
|---|---|---|---|---|
| F6-01 | R6-01 | API, sola lettura | Elenco dei tipi del vocabolario (`GET /api/condizioni/elenchi`, e l'editor che lo legge) | Un solo elenco: 31 tipi (i 27 di oggi più quelli dei requisiti, più `da-subito`, `luogo`, `invito`), ognuno con nome italiano, campi, descrizione |
| F6-02 | R6-01b | API + browser | Editor delle condizioni; tutte le condizioni salvate | Il tipo `manuale` non c'è nell'editor; nessuna condizione salvata ha `manuale` (0 prima, 0 dopo); `requisito_partita` 0 → 0 |
| F6-03 | R6-01b, R6-22 | Collaudo (foto e ripristino), anteprima 3302/5474 | Import di un pacchetto di prova con una riga `manuale` | La riga diventa `avviso` con lo stesso testo; il riepilogo dell'import la elenca |
| F6-04 | R6-02 | API (sola lettura dopo la base «prima»), partita 1 e partita di prova | Gli esiti di ogni condizione salvata letti dalle API alle 6 date con la partita di prova, e alla data della partita 1, **contro la base «prima»** (riquadro in testa: dopo la M6 il vecchio valutatore non c'è più); in più `POST /api/condizioni/valuta {condizioni, partita, giorno}` sulle stesse condizioni | Stesso esito per ogni condizione, salvo le correzioni elencate in `modifiche.md` §5; 0 differenze non spiegate; `/valuta` dà lo stesso esito delle viste (un solo valutatore). Il test di equivalenza di BE (§8.1 punto 2) è la controprova |
| F6-05 | R6-02 | Browser, partita 1 | Metro, La città, scheda del quartiere, visore, diario alle 6 date | L'interfaccia mostra l'esito del server, senza una seconda valutazione: stessi esiti in tutte le viste (la metro non rivaluta la data) |
| F6-06 | R6-03 | API, sola lettura | Ricerca di riferimenti per nome nelle condizioni salvate | **0** dopo la migrazione; gli 11 requisiti `richiesta` citano la chiave; `persona-abilita` per chiave dove sicuro, gli altri in elenco |
| F6-07 | R6-04 | Collaudo (foto e ripristino), anteprima 3302/5474 | Rinomina della Richiesta «Lo zio ingordo»; poi eliminazione e ripristino dal cestino | Rinominata: l'esito del requisito non cambia e il testo mostra il nome nuovo. Eliminata: il requisito dice «Richiesta eliminata», grigio; rimessa dal cestino: torna com'era |
| F6-08 | R6-05 | Browser | Requisito `avviso` di Futaba al rango 4 | Esito «avviso» con l'icona, né verde né rosso; non blocca il rango |
| F6-09 | R6-06 | API | Una condizione `gruppo`/`non`/`intervallo` con ogni tipo (test del vocabolario) | Le combinazioni valgono per tutti i tipi |
| F6-10 | R6-07, R6-30 | Collaudo (foto e ripristino), anteprima 3302/5474 | Editor delle condizioni da pin, quartiere («Modifica sblocco»), luogo, negozio, requisito di un Confidente («Modifica requisiti»): scelta dell'oggetto per nome con ricerca, anteprima dell'esito, salva, «Ripristina» | Stesso editor ovunque; salvato per chiave; anteprima dal server (`POST /api/condizioni/valuta {condizioni, partita, giorno?}`: richiesta osservata nel browser, nessuna valutazione nel client); «Ripristina» torna al valore della guida; gli inviti del posto si vedono in sola lettura col link al Confidente (`modifiche.md` §1) |
| F6-11 | R6-08, R6-08b, R6-09 | API, sola lettura | `GET` dei 24 quartieri dopo la migrazione | 23 con condizione strutturata (Memento senza, finché non c'è la data) con la fonte; i 3 iniziali `da-subito`; «sempre rossi» **0**; descrizione generata dalla condizione, nessuna frase mostrata come sblocco |
| F6-12 | R6-08b | Browser | Scheda di ogni quartiere | La descrizione dello sblocco coincide con quella generata dalla condizione e mostra la fonte («Fonte: guida, certezza alta/media») |
| F6-13 | R6-08b, R6-10 | Partita di prova | Odaiba: (1) senza lettura e Ann < 10; (2) lettura di «Luoghi della movida» completata; (3) togliere la lettura con Ann 10 | (1) chiuso; (2) aperto; (3) aperto per Ann 10. La data 06-01 non c'è più nella condizione |
| F6-14 | R6-10 | Partita di prova | Asakusa con Ann al rango 6, poi 7; Skytree con e senza «Shitamachi rinato» letto | Asakusa si apre con Ann 7; lo Skytree con il libro |
| F6-15 | R6-08b | Partita di prova | Kichijoji: prima del 06-05 e senza Akechi 4; poi al 06-05; Kanda: 28/6, Hifumi 4, «Pagine ammuffite» | Kichijoji aperto dal 06-05 (o con il Jazz Club); Kanda dal 28/6; Jinbocho/Nagiuri con Hifumi 4 oppure il libro (non più «Yusuke R5») |
| F6-16 | R6-08b | Partita di prova | Suidobashi l'8/6 e il 9/6; Ikebukuro con «Cieli notturni» letto e non letto, al 09-02 | Suidobashi dal **06-09** (corretto da 06-10); Ikebukuro solo con la lettura (o l'invito, F6-19), non per la data 09-01 |
| F6-17 | R6-08c | API, partita di prova | Condizione `invito{…}` di un posto (`condizioneEffettiva` = condizioni salvate OR inviti, `modifiche.md` §1); gesto `PUT /api/partite/:id/inviti/:invito` e `DELETE` | Vera solo con l'evento «invito avvenuto» nella partita; `invito_partita` con `voce_uid` NULL per il gesto; la descrizione dice «… oppure dopo l'invito di <Confidente> del <data>» |
| F6-18 | R6-08c2 | Partita di prova | Per ognuno dei 6 inviti, gesto «Invito avvenuto» con le condizioni false e poi vere | Con le condizioni false il pulsante è disattivato con «Non ancora possibile: manca …» (es. Makoto 30/7: «manca: Palazzo di Futaba concluso»); con le condizioni vere l'invito si registra |
| F6-19 | R6-08d, R6-08e | Partita di prova (Futaba concluso prima del 30/7, Imperatore rango 1, Ikebukuro chiuso) | Gesto diretto «invito di Makoto del 30/7» dalla pagina del Confidente o del quartiere; annulla; poi leggi «Cieli notturni» | Ikebukuro si apre; annullato si richiude; la lettura lo riapre. Il gesto non crea voci del diario |
| F6-20 | R6-08c3 (la **spunta** del diario arriva in L10, `modifiche.md` §1 (b): in L6 si prova solo il gesto) | Partita di prova sul percorso del diario (Futaba concluso il 3/8) | Spunta della voce «da rivedere» del 07-30 e gesto | «Non ancora possibile: manca il Palazzo di Futaba concluso»; la spunta resta senza effetto, con la nota |
| F6-21 | R6-08d, R6-08f | Partita di prova | Harajuku senza «Vague»: gesto «invito di Ryuji del 29/5» con Madarame concluso | Harajuku si apre; nessuna voce del diario creata (diario validato) |
| F6-22 | R6-08f (parte della spunta: L10) | Partita di prova | Futaba 10-09 (Nakano): spunta della voce e poi gesto | Un solo evento registrato (non due); togliere la spunta lo toglie solo se l'aveva scritto la voce |
| F6-23 | R6-11 | Browser | Pagina di ogni libro che sblocca un posto (Vague, Luoghi della movida, Cieli notturni, Un acquario al giorno, Vedetta lacustre, Santuari di Tokyo, Esplorando Nakano, Dolci cinesi, Shitamachi rinato, Pagine ammuffite) | «Sblocca» è calcolato dalle condizioni dei posti, non dalla frase del libro; i 3 libri «ignorati» di oggi sbloccano davvero |
| F6-24 | R6-12 | API + partita di prova | Clinica Takemi al 04-15, 04-16, 04-17, 04-18 | Negozio e luogo dal **04-16** (gli 11 articoli con 04-15 passano a 04-16); Tae rango 1 dal **04-18** |
| F6-25 | R6-13, R6-18 | API, sola lettura | Luoghi e negozi | Lo sblocco viene da `luogo.condizioni_json` della sede; le regole `sblocco-luoghi` sono copiate e non più lette; le frasi restano note e nessuna vista ne deduce un esito |
| F6-26 | R6-14 | Browser | Pagina di Ohya e calendario | Rango 1 dal **07-05** (prima 06-18); la data mostrata è quella del requisito del rango 1 in ogni vista |
| F6-27 | R6-15 | API | I 21 requisiti «Richiesta» dei Confidenti | Stesso esito di prima, per chiave |
| F6-28 | R6-16, R6-16b | Partita di prova | Kamoshida: Tesoro sì e boss no; boss sì e Tesoro no; tutti e due | Solo con tutti e due: «concluso», ingresso sparito, sblocchi «dopo il Palazzo di Kamoshida» veri; negli altri casi la descrizione dice «manca: il Tesoro» o «manca: il boss finale» |
| F6-29 | R6-16b | API, partita 1 e partita «Tutorial» | Esito di `palazzo{kamoshida}` e `palazzo{madarame}` | p1: veri entrambi (Madarame con la voce in ordine 19). «Tutorial»: il pin 1657 del tutorial dell'11/04 non conclude Kamoshida |
| F6-30 | R6-16 | Browser | Scheda di Kamoshida e di Madarame; metro; calendario | Finestre dalle colonne: Kamoshida 11/4 → 2/5; Madarame 16/5 → 5/6 con «lettera entro il 2/6» come vincolo distinto |
| F6-31 | R6-17 | API + browser, partita 1 | Per i 9 Palazzi: destinazione della metro e del campo `atterraggio` della voce del diario | Stesso posto nei due; le 6 divergenze «su Tokyo» non ci sono più |
| F6-32 | R6-19 | Documento | Elenco frasi → condizioni (`lotti/L6/elenco-frasi-condizioni.md`) | Esiste; nessuna frase convertita senza il sì; abbinamenti per nome solo «sicuri» applicati |
| F6-33 | R6-20, R6-21 | API, partita 1 e partita di prova | Esito di ogni condizione alle 6 date, prima e dopo la M6; condizioni dei pin dell'utente | Uguale salvo le correzioni elencate (Suidobashi, Kanda, Odaiba, Ikebukuro, Clinica, Ohya, i 13 quartieri «rossi», le 7 date-invito dei luoghi); le condizioni dei pin dell'utente identiche byte per byte |
| F6-34 | R6-20 | Documento + browser, partita 1 | Luoghi aperti oggi per una data che diventa un invito (Harajuku hangout, Planetario, Meiji, acquario, Nakano, Ichigaya) | L'elenco per partita c'è prima del rilascio; dove la partita reale cambia esito, la pagina offre «Registra l'invito» |
| F6-35 | R6-22 | Collaudo (foto e ripristino), anteprima 3302/5474 | Export del pacchetto; import di un pacchetto vecchio con forme vecchie | Esporta il formato unico; il vecchio si importa convertito |
| F6-36 | R6-23 (NR) | Browser, partita 1 | Diario 04-01..06-01 (255 voci): semafori e avvisi | Stessi esiti, salvo le correzioni elencate; voci identiche |
| F6-37 | R6-24, R6-25, R6-27 (NR) | API + browser | Condizioni dei pin e delle voci di Kamoshida (169 voci, 359 pin dell'utente) e Madarame (227 voci, 254 pin dell'utente); mappa di Tokyo alle 6 date; Memento | Stessi esiti; stessi Palazzi negli stessi giorni salvo le date corrette; Memento invariati |
| F6-38 | R6-26 (NR) | API | Conferme manuali dei requisiti | 0 prima e 0 dopo |
| F6-39 | R6-28 (NR) | Comandi | Typecheck, lint, test mirati di `modifiche.md` §8.1 | Verdi, con output grezzo |
| F6-40 | R6-29 | Browser | Testi delle condizioni in metro, città, scheda, editor, diario | Stesso testo ovunque; rosso con «Manca: …»; «Disponibile dall'inizio»; «Avviso: …»; date in italiano («dal 18 giugno») |

| F6-41 | R6-09 (segnalazione E, `modifiche.md` §2) | Browser, partita di prova | La città aperta; cambio di giorno e di fascia della partita da un'altra scheda (o dal selettore della partita) | La pagina ricarica i quartieri: lo sblocco segue il giorno nuovo senza ricaricare a mano; la metro usa `disponibile` del server, senza ricontrollare la data nel client |
| F6-42 | R6-16 (`modifiche.md` §4.4, §5 passo 5) | API, sola lettura | Condizioni dei pin d'ingresso dei Palazzi prima e dopo la M6 | Le copie della finestra **identiche** alla finestra del Palazzo sono diventate `arco{dungeon}` (esito uguale alle 6 date); le altre restano com'erano e sono nell'elenco; `finestre-dungeon` non si legge più (le date vengono da `dungeon.finestra_dal`/`finestra_al`/`lettera_entro`) |

**UX e layout**: R6-30 e R6-31 li provano Test UX e Test layout; qui solo il controllo funzionale di F6-10.

**Vitest mirati** (`modifiche.md` §8.1 e §8.2): li lancio sui file pronti con `DATA_DIR` su una cartella vuota, output grezzo nell'esito (F6-39).

## Note per Test funzionali
- Gli attesi «dopo» di F6-01, F6-06, F6-11, F6-24, F6-26 e F6-33 vanno confermati da Analisi dati dopo il boot delle migrazioni.
- Per Maihama (data 11/10, certezza media) e Roppongi (15/9, certezza alta) la fonte va controllata nella scheda del quartiere (F6-12).
