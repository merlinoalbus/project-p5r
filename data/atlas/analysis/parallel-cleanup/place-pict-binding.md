# Binding delle etichette grafiche PLACE_PICT

Esito: **nessun nuovo nome certificabile** con il corpus già estratto. Non è escluso il binding nel gioco: manca la sua dimostrazione nelle fonti disponibili.

## Prova circoscritta

Censiti tutti i 227 FlowScript disponibili: 40 chiamate FLD_PLACENAME_TEX, tutte con argomenti letterali, soltanto gruppi 1, 151, 152 e 157. Nessuna chiamata per 190 o 192. Il JSON conserva ogni chiamata con file, riga, procedura e hash di tutti i sorgenti.

- **Sala del Graal** è leggibile in PLC_192_062_00. Per collegarla a F192062 serve il loader nativo predefinito o una tabella esplicita: il nome file non basta. Lo script F192062 contiene CALL_AT_DUNGEON, che seleziona un dungeon ma non dimostra quale immagine del titolo venga caricata.
- **Dedalo di Chomranut / Area 1** è leggibile in PLC_190_001_01. F19000100 ha divisione00; le carte01,02,03 indicano selettori ulteriori. Senza mapping sezione/area Memento→carta non si può attribuire Chomranut alla planimetria RMAP1901_0.
- Il controllo D_AREA_NAME_EFFECT in 151_006_00.flow mostra una vera espressione FLD_PLACENAME_TEX(151,16,0,-1), condizionata da major/minor/posizione. Tuttavia nel sorgente il helper non ha chiamanti nominali: non scambiare espressione presente per codice eseguito né estenderla per analogia agli altri gruppi.

## Classificazione di tutte le 17 risorse

|Risorsa|Campi ROADMAP|Carte con stesso major/minor|Esito|
|---|---|---|---|
|RMAP_152_5_0|F152_005_00|PLC_152_005_00 = Vecchio castello / Canale sotterraneo|Binding non dimostrato|
|RMAP_154_13_0|F154_013_00|Nessuna nel corpus estratto|Nessuna candidata per identità del campo|
|RMAP_154_13_1|F154_013_00|Nessuna nel corpus estratto|Nessuna candidata per identità del campo|
|RMAP_154_13_2|F154_013_00|Nessuna nel corpus estratto|Nessuna candidata per identità del campo|
|RMAP_157_17_0|F157_017_00|Nessuna nel corpus estratto|Nessuna candidata per identità del campo|
|RMAP_157_3_0|F157_003_00|Nessuna nel corpus estratto|Nessuna candidata per identità del campo|
|RMAP_157_3_1|F157_003_00|Nessuna nel corpus estratto|Nessuna candidata per identità del campo|
|RMAP_157_5_1|F157_051_00, F157_052_00|PLC_157_051_00 = Casinò / Safe Room|Binding non dimostrato|
|RMAP_160_10_0|F160_010_00|Nessuna nel corpus estratto|Nessuna candidata per identità del campo|
|RMAP_160_10_1|F160_010_00|Nessuna nel corpus estratto|Nessuna candidata per identità del campo|
|RMAP_190_1_0|F190_001_00|PLC_190_001_01 = Dedalo di Chomranut / Area 1; PLC_190_001_02 (non letta); PLC_190_001_03 (non letta)|Binding non dimostrato|
|RMAP_190_2_0|F191_011_00|Nessuna nel corpus estratto|Nessuna candidata per identità del campo|
|RMAP_190_3_0|F191_061_00, F192_011_00, F193_011_00, F193_061_00, F194_011_00, F194_061_00|Nessuna nel corpus estratto|Nessuna candidata per identità del campo|
|RMAP_190_51_0|F191_065_00, F192_015_00, F193_015_00, F193_065_00, F194_015_00, F194_065_00, F195_015_00|Nessuna nel corpus estratto|Nessuna candidata per identità del campo|
|RMAP_190_61_0|F192_061_00|Nessuna nel corpus estratto|Nessuna candidata per identità del campo|
|RMAP_192_62_0|F192_062_00|PLC_192_062_00 = Sala del Graal|Binding non dimostrato|
|RMAP_195_11_0|F195_011_00|Nessuna nel corpus estratto|Nessuna candidata per identità del campo|

Letti visivamente anche PLC15200500 (**Vecchio castello / Canale sotterraneo**) e PLC15705100 (**Casinò / Safe Room**). Sono indizi utili, ma non rinomine autorizzate: per la seconda risorsa il contesto F157052 rimane inoltre senza carta corrispondente.

La classificazione riguarda 17 risorse, non 17 campi: alcune planimetrie sono condivise da più campi. L’assenza di carta numericamente corrispondente non dimostra l’assenza di una carta alternativa selezionata dal motore.

## Limite concreto da risolvere

Occorre codice del loader nativo che costruisce il percorso PLACE_PICT, oppure una traccia di caricamento nel gioco con campo/sezione/area e nome della carta; in alternativa una tabella esplicita di selezione ancora non presente nelle prove consultate. Il decompilato FlowScript mostra chiamate native, non la loro implementazione. Nessuna decompilazione massiva, nessuna nuova estrazione, nessuna modifica a mappe o dati app. I 190 record già validati sono stati riutilizzati senza ripetere il lavoro.
