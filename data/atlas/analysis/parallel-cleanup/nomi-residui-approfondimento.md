# Approfondimento dei59 nomi residui

Fonte aggiuntiva decisiva già estratta: `originali/BASE/FIELD/FTD/FLDDNGPLACENO.FTD`. Decodificati190 record di8 byte in13 blocchi, con indice blocco+150 come major del campo e indice record come minor. Gli indici BE rimandano direttamente a FLDPLACENAME. Tutti i byte, limiti, indici stringa e padding sono stati verificati. Incrocio con ROADMAP/texpack:93 titoli significativi identici, più3 corrispondenze a ???, su142 campi confrontabili. Questa è evidenza della semantica d’indicizzazione; serve gate indipendente prima dell’applicazione.

## Nuove evidenze nominali per9 immagini

|Risorsa|Campo|Titolo nativo del campo|Limite|
|---|---|---|---|
|RMAP_150_3_0|F150_003_00|Area riservata allo staff|Titolo del campo; non prova di nome distinto del layer|
|RMAP_150_3_1|F150_003_00|Area riservata allo staff|Titolo del campo; non prova di nome distinto del layer|
|RMAP_151_16_0|F151_016_00|Sala centrale|Titolo del campo; non prova di nome distinto del layer|
|RMAP_153_4_0|F153_004_00|Ripostiglio|Altro contesto senza titolo: F153_051_00|
|RMAP_154_12_0|F154_012_00|Ufficio riciclaggio|Titolo del campo; non prova di nome distinto del layer|
|RMAP_154_12_1|F154_012_00|Ufficio riciclaggio|Titolo del campo; non prova di nome distinto del layer|
|RMAP_154_12_2|F154_012_00|Ufficio riciclaggio|Titolo del campo; non prova di nome distinto del layer|
|RMAP_154_15_0|F154_015_00|Central Street|Titolo del campo; non prova di nome distinto del layer|
|RMAP_159_8_0|F159_008_00|Cabina reale|Titolo del campo; non prova di nome distinto del layer|

F153004→Ripostiglio vale nel contesto normale, ma la medesima risorsa è usata anche da F153051: il secondo contesto non ha record in questa tabella. Non eleggere Ripostiglio a titolo universale della risorsa. F154012 ha tre immagini con titolo comune Ufficio riciclaggio: non chiamarle automaticamente tre piani o tre varianti equivalenti.

## Gruppo150

F150003 è nominato **Area riservata allo staff**, indice368, record byte120. Entrambe le risorse RMAP15030/1 sono selezionate dal suo ROADMAP. Il titolo del gruppo nella medesima tabella resta ??? (indice250): questo risolve il nome del campo, non dimostra la sua appartenenza nominale al Palazzo di Niijima. D00/D06 e19novembre restano evidenze narrative accessorie. Si può proporre una denominazione di contesto Area riservata allo staff; non un’accorpamento definitivo a Niijima né nomi per i due layer.

## Copertura completa dei59

-9 risorse: nuove evidenze di titolo del campo (8 con tutti i campi associati coperti e1 con contesto parzialmente coperto).
-17 risorse: il loro indice layer eccede tutti i layerCount dichiarati dai texpack con lo stesso prefisso. Non sono quindi semplicemente prive di nome: manca un selettore della specifica immagine.
-12 risorse: nessun texpack nomina la risorsa; non è dimostrato che siano inutilizzate.
-4 risorse: un texpack esiste ma nessun campo ROADMAP lo seleziona; i titoli sono ???.
-17 risorse: hanno campo ROADMAP associato ma i titoli sono esplicitamente ???/NULL o fuori dalle tabelle nominali disponibili.

Ogni risorsa ha una riga nel JSON, con contesti, record grezzi, offset, indici e ragione del residuo. Nessuna esclusa dal conto.

## Evidenze grafiche consultate

-PLC15101600: **Vecchio castello / Sala centrale**, concorde indipendentemente con il nuovo titolo testuale Sala centrale.
-PLC19206200: **Sala del Graal**, candidato forte per F192062; non applicato perché manca la prova del selettore/loader fra il file grafico e il campo, oltre alla corrispondenza del nomefile.
-PLC19000101: **Dedalo di Chomranut / Area1**. Non trasferire il nome a RMAP19010: il suffisso del selettore differisce e la risorsa ROADMAP è associata a F19000100.

Nessun file app, seed, database o risultato altrui modificato. Nessuna nuova estrazione/decompilazione, nessuna navigazione o pin aggiunto. Il risultato è un approfondimento riutilizzabile pronto per validazione.