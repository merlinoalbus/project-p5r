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

Le conversioni delle singole voci del periodo validato (fino al 05-31) restano da approvare riga per riga.
