# Evidenze per la navigazione tra i piani della scuola

I 400 record di `texpack.bin`, comprese 167 sentinelle, sono conservati integralmente in `mondo_texpack_evidenze.json`. Sono verificati 383 riferimenti di livello e i relativi 766 riferimenti ai titoli.

Il valore a byte 52 è un indice di `texelem.bin`: i nomi si ottengono da questo secondo record e poi da `fld_texpack_title.ftd`. Non è un indice diretto alla tabella delle stringhe. Questa verifica non risolve i nomi che nella risorsa sono NULL o ambigui.

## Correlazione dei piani

I sei campi dei due edifici della scuola condividono il gruppo di risorse che contiene i record agli offset 26856 e 26928. Il primo associa il canvas `RMAP_002_0` a tre livelli; il secondo contiene la risorsa del tetto. Questa appartenenza non dimostra che tutti i campi abbiano la stessa trasformazione spaziale.

Nel record 26856, i valori float a byte 16 e 20 sono 360 e 720. Le quote Y degli ingressi nei corridoi del secondo e terzo piano sono circa 360,414 e 720,414; gli ingressi sulle scale hanno anche quote intermedie. La corrispondenza è compatibile con riferimenti verticali dei livelli, ma non basta a stabilire l’algoritmo di selezione del piano. Il float a byte 8 vale circa 23,44: il suo ruolo di scala non è ancora dimostrato.

## Scale e avanzamento narrativo

Nel campo `F002_002_00`, le procedure 14 e 15 corrispondono alle scale sud e nord verso il secondo piano. Conservano due rami:

- con `BIT_CHK(96) == 1` richiamano rispettivamente `SUB_KFEVT_BldgA1F_A2FSouth` e `SUB_KFEVT_BldgA1F_A2FNorth`;
- altrimenti richiamano `CALL_FIELD(2, 2, 1, 1)` e `CALL_FIELD(2, 2, 2, 1)`.

Le coordinate dei trigger sono presenti nel FBN, con associazione per indice al relativo HTB. Il significato del flag 96 per la partita dell’app deve ancora essere determinato; una semplice condizione di data non può sostituirlo senza prova. I corpi completi delle procedure, incluse le chiamate agli eventi, sono conservati nelle evidenze.

## Esito e lavoro restante

Nessun collegamento fisico è ancora certificato da questa analisi. Servono la trasformazione da XYZ a coordinate della planimetria, la verifica del punto di arrivo, i rami delle procedure richiamate e la corrispondenza tra flag originali e stato del salvataggio nell’app. Ritaglio e adattamento a schermo dovranno applicare la stessa trasformazione a immagine, passaggi e pin.
