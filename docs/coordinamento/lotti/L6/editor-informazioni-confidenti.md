# Editor delle informazioni dei Confidenti e rettifica Makoto

## Specifica e soluzione approvata

Originali `43ad8889`, R6-18/19 e M6§4.3: le informazioni descrittive sono modificabili, distinte dai requisiti operativi. Il revisore distinto ha approvato soluzione, firma pubblica e codice131; non è una chiusura di L6.

Otto campi informativi, con API indipendente dal dettaglio: giorni, fasce, luogo, data, requisiti descritti, note, note generali e fonti. L'editor è raggiungibile anche quando il dettaglio fallisce decodificando un JSON. Usa la finestra e il selettore del progetto.

- GET e anteprima non scrivono. Salvataggio con revisione corrente e anteprima attese; una modifica concorrente dà409 e conserva la bozza.
- Modifica manuale dei soli campi selezionati: gli altri valori RAW restano identici. Creazione esplicita distinta, con tutti gli otto campi.
- Registro versionato in `dati_guida`, prefisso `confidente-disponibilita-editor-v1:`: fotografia iniziale e revisioni append-only con prima/dopo esatti. Identità, sequenza e catena incoerenti bloccano le scritture, senza reinizializzazioni.
- Replay riconosciuto prima del CAS: stesso identificativo e richiesta restituiscono l'esito senza riscrivere modifiche successive; identificativo riutilizzato diversamente dà409. Nessuna nuova revisione per una modifica senza differenze.
- Ripristino di una versione con anteprima e CAS, conservando lo storico. Un JSON storico illeggibile viene segnalato esplicitamente; il ripristino non lo dichiara validato.

## Makoto131

La [guida AGS di Makoto](https://www.allgamestaff.it/persona-5-royal/guida-rango-confidente-di-makoto-papessa/) distingue disponibilità e itinerario; la Persona Papessa in scorta migliora l'affinità. Non si richiede che sia equipaggiata. Giorni informativi martedì/giovedì/sabato/domenica, di giorno; Conoscenza3. Non si attribuisce una prima data possibile dal solo itinerario del26luglio. Le eccezioni di pioggia dei ranghi2/9 restano nelle note.

La migrazione confronta tutti gli otto RAW con la base pubblica93, verificata indipendentemente dal revisore. Solo una firma integralmente identica riceve la rettifica. Le varianti vengono escluse e restano modificabili tramite proposta esplicita che conserva il loro testo corrente, non il testo pubblico. Riga assente non ricreata.

Le note conservano obbligatoriamente giorni/fasce/data/requisiti precedenti, esplicitamente storici, e il testo precedente integrale. Gli otto RAW rimangono anche nel registro. La proposta non offre una casella per omettere la conservazione. Requisiti del rango1, semafori, incontri, Doti, Diario e progressi non sono scritti da questo servizio.

## Esito prima del rilascio,21ottobre15:53Z

Tre riesami del worker e tre del coordinatore: firma/conservazione; transazione/CAS/replay; percorsi UI/errori/consumatori. Gate statico distinto APPROVATO dopo correzione del selettore e della frase sulla prima data. Typecheck24689 e lint51330 verdi; build62824 verde dopo le correzioni finali131. Nessun test, simulazione o migrazione locale.

Lettura reale prima131 conservata solo in memoria:23righe informative e4requisiti Makoto. Gli otto RAW Makoto coincidono con la base pubblica. Restano pubblicazione, pipeline, rendiconto effettivo131, confronto prima/dopo e osservazione dell'editor su p5s; il codice approvato non costituisce già prova runtime.
