# Evidenze delle sequenze di gioco

Sono stati controllati i dodici nomi `SCHEDULER_01.BF` … `SCHEDULER_12.BF` negli archivi BASE e IT. I dodici script sono presenti in BASE; non risultano varianti IT. Tutti sono stati decompilati con esito positivo.

`decompilazione.json` registra risorse, hash, comandi ed esiti; `versione-decompilatore.json` registra la versione dello strumento. Per ogni script sono conservati anche i byte originali, il risultato e i log, compresi gli output della console nei byte originali.

Il censimento `riferimenti.json` distingue letture e scritture dei flag 96, 102 e 1087 e del contatore 16. Gli indirizzi mantengono il banco: per esempio `0x10000000 + 96` non viene confuso con il flag 96. Restano conservate 240 chiamate con indirizzi dinamici, che richiedono analisi dei parametri.

Il controllo indipendente ha confermato 100 riferimenti letterali: 26 attivazioni del flag 96, 12 azzeramenti dello stesso flag, 38 scritture del contatore 16, 12 azzeramenti e 12 attivazioni del flag 102. Non sono stati trovati riferimenti letterali al flag 1087 del banco zero negli script esaminati. L’assenza in questo sottoinsieme non prova l’assenza nel gioco.

La routine `MAIN_SetConquestFlag` contiene un azzeramento del flag 102 seguito da un’attivazione condizionata a `CHK_DAYS_STARTEND(4, 1, 4, 15)`. La routine `MAIN_InitFlag` azzera il flag 96 e il contatore 16; altre procedure li impostano per sequenze specifiche. Sono conservati i corpi completi e i collegamenti fra procedure per verificare l’ordine effettivo di esecuzione.

Questi dati non sono ancora regole operative dell’app. Non sono state assegnate date basandosi sul nome dei file o delle procedure, né considerata una semplice chiamata nel codice come prova della sua esecuzione nella partita corrente.
