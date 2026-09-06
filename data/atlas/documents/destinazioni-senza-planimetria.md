# Destinazioni senza planimetria verificata

**I16 asset esistono, ma la provenienza dichiarata è di illustrazioni editoriali originali.** Il documento repo docs/grafica/prompt-immagini.md:281–284 specifica che non sono ricalcate da mappe ufficiali né screenshot. Lo stato di generazione elenca ciascuno dei16 file. Non basta che il percorso inizi con mappe/ per classificarli come planimetrie del gioco.

|Destinazione|Chiave API attuale|Dimensioni file|Pin conservati|
|---|---|---|---:|
|Ikebukuro|ikebukuro|2048×1536|0|
|Harajuku|harajuku|2048×1536|0|
|Ueno|ueno|2048×1536|0|
|Parco Inokashira|parco-inokashira|2048×1536|0|
|Shinagawa|shinagawa|2048×1536|0|
|Nakano|nakano|2048×1536|0|
|Ogikubo|ogikubo|2048×1536|0|
|Chinatown (Yokohama)|chinatown-yokohama|2048×1536|0|
|Maihama|maihama|2048×1536|0|
|Roppongi|roppongi|2048×1536|0|
|Tsukishima|tsukishima|2048×1536|0|
|Santuario Meiji|santuario-meiji|2048×1536|0|
|Ichigaya|ichigaya|2048×1536|0|
|Suidobashi (Dome Town)|suidobashi-dome-town|2048×1536|0|
|Asakusa|asakusa|2048×1536|0|
|Mementos (ingresso)|mementos-ingresso|2048×1536|0|

Il JSON contiene API e riga DB attuali, nomefonte catalogo, hash di ogni PNG e pin da conservare. Gli alias storici citta-* possono risolvere a chiavi nuove: non inferire assenza interrogando soltanto la vecchia chiave sul DB.

## Proposta

Classificare esplicitamente il ruolo dell’immagine. Queste destinazioni aprono una scheda con illustrazione e contenuti, indicando che non è disponibile una planimetria del gioco verificata. Conservare file, immagini utente, spilli e dati delle schede; non cancellare o riposizionare pin per ottenere una UI diversa. Gli eventuali pin restano accessibili in elenco/editor con i loro dati originali.

La verifica è sulla provenienza degli asset attuali, non dimostra che il gioco non contenga mai una mappa di tali luoghi. Il caricamento visuale tramite tool non è riuscito; tutti16 PNG sono validi secondo verifica del decoder. Non viene dichiarata un’ispezione visiva non effettuata.

Nessuna modifica applicata.
