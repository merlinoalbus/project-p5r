# L13 — Decisioni di modello approvate dall'utente (2026-10-25)

Risposta dell'utente: «tutte» (approva tutte le raccomandazioni). Fonte delle proposte: elenchi di conversione L13 (versione 4),
verificati sulle copie in sola lettura dei dati reali.

1. **Quattro tipi di effetto nuovi** nelle voci del diario: yen, oggetto ricevuto, trofeo, sblocco di una Richiesta (copre anche
   l'attività che sblocca una Richiesta, richiesta dell'utente dello stesso giorno).
2. **Yen già scritti in un altro dato** (film, attività, lavori, pesca, Richiesta): li muove l'elemento collegato, mai la voce.
3. **Ricompense di una Richiesta completata ripetute nella voce**: le applica solo la Richiesta completata (`richiesta.ricompense_json`).
4. **Televendite**: due articoli distinti per Set A e Set B, ciascuno con prezzo e contenuto propri.
5. **Big Bang Burger**: le voci si collegano all'articolo della sfida; il prezzo serale di 500 yen è un dato dell'articolo; i 2.000 e
   2.500 yen di giorno (14 e 15 agosto) vanno verificati in gioco.
6. **Quantità negli acquisti**: facoltativa, 1 se non indicata; per «Fai il pieno» la scrive l'utente.
7. **Voci con alternative o più elementi**: nessun riferimento unico; gli elementi restano come effetti della voce.
8. **Voce collegata a un elemento che porta già una Dote**: vale la Dote della voce; il collegamento non la raddoppia.
9. **Dote delle domande in classe**: la applica la voce; la domanda segna solo che si è risposto (`domanda.ricompensa` resta testo).
10. **Domande con ricompensa diversa dalla voce** (domande 4, 6, 30, 66): vale la voce; il testo della domanda si corregge solo dopo il
    sì dell'utente; la voce TV del 10 novembre senza Dote va verificata in gioco.
11. **Vino della grazia e Soma**: vale il catalogo e l'articolo lo legge da lì; il bersaglio va confermato in gioco.
12. **Braccialetto d'argento**: il prezzo vive solo negli articoli (68.000) e i regali lo leggono da lì; il valore va verificato in gioco.
13. **Destinatari dei 42 regali senza elenco**: ricavati da `confidente_regalo`, con le chiavi dei Confidenti.
14. **Requisiti dei Confidenti**: (a) Hifumi rango 1 dal 06-25 e Shinya dal 09-04 confermati; (b) Takemi e Ohya rango 1: il dato si
    allinea alla data che il testo attribuisce all'utente (15 aprile, 18 giugno); (c) Kawakami rango 4 e (d) pioggia di Futaba: nessuna
    modifica finché l'utente non li verifica.
15. **Power Intuition 1/3 del 12 dicembre**: da verificare in partita; nessuna modifica.
16. **Quiz TV collegati alla voce di classe** (domande 68, 69, 71, 74, 75): si spostano sulla voce TV della stessa data; per la 74
    (29 settembre) non esiste una voce TV: decide l'utente. Nel periodo validato (68 e 69) lo spostamento si applica solo con il sì
    riga per riga.

17. **Candidatura a un lavoro = sblocco del lavoro** (risposta dell'utente: «approvo»). La voce del Cercalavoro (18 aprile Triple Seven,
    26 aprile Rafflesia, 6 maggio Ore no Beko) è collegata all'attività del lavoro, non al negozio, e ha un solo effetto «sblocca il
    lavoro»: nessun turno, nessuna Dote. Il lavoro è disponibile solo dopo la spunta della candidatura; togliendola torna non disponibile.
    I turni restano voci a parte. Il turno registrato per errore nella partita 2 (26 aprile, Rafflesia) non si riscrive: va elencato a parte.
    La data di disponibilità di Ore no Beko (oggi 06-05) si allinea alla candidatura del 05-06, inversione giorno/mese segnalata dal PM e
    approvata con la proposta. Le tre voci sono nel periodo validato: entrano negli elenchi da approvare riga per riga.

18. **Yen automatici** (risposte dell'utente: «gli yen possono anche scendere da soli (senza mai andare sotto zero) ma devono restare
    cmq possibili le azioni anche se il denaro disponibile non basta o è a 0» e «ci sono ovviamente altri soldi dai combattimenti e dalle
    vendite degli oggetti dei palazzi e memento che non possono essere automatici»). Le spese delle voci spuntate (acquisti, effetto
    yen negativo) scalano da sole il saldo della partita, mai sotto zero: l'azione resta sempre possibile anche con saldo insufficiente o
    a zero, e togliendo la spunta si restituisce solo l'importo davvero scalato. I guadagni legati a voci ed eventi (paga dei lavori,
    ricompense delle Richieste, effetto «Yen ricevuti») entrano da soli. Restano manuali i soldi dei combattimenti e delle vendite di
    oggetti nei Palazzi e nei Memento.

19. **Effetti di stato aggiunti a una voce già spuntata** (26 ottobre; segnalazione dell'utente: «al momento non viene aggiornato il
    Compendio Personale»; risposte: «Subito al salvataggio» e «Elenco da approvare»). Persona, trofeo, evento di storia, domanda, cruciverba,
    Richiesta, invito, sblocco (e gli altri effetti di stato) salvati su una voce già spuntata si applicano subito alla partita, con il «prima»
    registrato: togliendo la spunta si annullano come gli altri. Per le voci spuntate in passato con effetti mai applicati si prepara un elenco
    voce per voce di ciò che manca in ogni partita; si applica solo ciò che l'utente approva.

20. **Televendite** (26 ottobre; risposte dell'utente «Uno solo o nessuno» e «Sì, aggiungile»). Ogni domenica di messa in onda si compra un
    solo set o nessuno: la scelta si fa alla spunta. Le quattro domeniche senza voce d'acquisto (26 giugno, 7 agosto, 25 settembre, 29 gennaio)
    ricevono una voce «Canale di televendite» con i due set a scelta, come le altre (fuori dal periodo validato).

21. **Ondata 5, oggetti e negozi** (26 ottobre; progetto ECC in `scratchpad/ondata5-progetto.md`, risposta dell'utente: «Gli effetti degli
    oggetti ai fini di questa app non è necessario gestirli se non come informazione testuale. Non sono d'accordo nel rimandare attività a fasi
    successive»). (a) Gli effetti degli oggetti restano testo informativo: nessuna struttura per famiglie; si tiene un solo punto per il testo
    dell'effetto (catalogo), si tolgono le copie (articoli, traduzioni, descrizioni) e si correggono i testi sbagliati. (b) Nulla si rimanda:
    Cartolina e premio «Benefattore» entrano nell'ondata. (c) Le altre raccomandazioni dell'architetto si applicano: unioni delle identità
    doppie su elenco scritto con cestino reversibile; reazione dei regali strutturata con i punti attuali finché non verificati in gioco;
    regalo ripetibile con consumo di copie e oggetti dei set posseduti; lotteria con esito «vinto/non vinto» alla spunta e trofeo, yen della
    vincita a mano; un solo chiosco della lotteria; rigenerazione per tutte le categorie, distributori a 2 pezzi da verificare; in caso di
    discordanza fra pagine della guida vale il listino dei negozi con nota storica; sconsigliati riconvertiti a +1; righe senza fonte italiana
    tenute con la fonte dichiarata; prezzi diversi fra distributori lasciati; Braccialetto di 37 Gradi Celsius nascosto. Le voci del periodo
    validato (04-18, 05-09, 05-18 sera) solo come proposte da approvare riga per riga.
    Precisazione dell'utente: «Ovviamente esula dalla decisione 1 se esistono oggetti con effetti che incidono su cose rilevanti per l'app già
    censite come effetti diretti o indiretti». Gli oggetti il cui uso incide su ciò che l'app gestisce (Doti sociali, punti dei Confidenti,
    yen, Fortuna, letture, consumazioni, sblocchi, oggetti ricevuti, tempo/fasce, ecc.) si modellano con i tipi di effetto dell'app; solo gli
    effetti di battaglia o di cura restano testo.

Le conversioni delle singole voci del periodo validato (fino al 05-31) restano da approvare riga per riga.
