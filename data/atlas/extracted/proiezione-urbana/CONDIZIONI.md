# Condizioni degli accessi urbani

Le sei schede in `condizioni.json` descrivono il percorso nello script fino alla specifica chiamata di trasferimento. Non sono ancora regole applicative: i flag originali non sono stati associati integralmente allo stato della partita dell'app.

| Accesso nativo | Distinzione da conservare |
| --- | --- |
| Convenience store | Il ramo di saluto finale ammette un'alternativa legata al contatore66 e a un flag di un banco distinto. Non basta bloccare sempre quando il flag1039 è attivo. Il nome commerciale Triple Seven resta da confermare. |
| Big Bang Burger | La chiamata ordinaria è nel ramo successivo ai blocchi narrativi96,1039,1008. |
| Palestra | Il trasferimento diretto all'interno è narrativo. L'allenamento ordinario richiede consenso e2000yen, avvia l'evento762/701 e poi prosegue al calendario o a un'altra destinazione prevista dal codice. |
| Freccette e biliardo | Il trasferimento conserva i blocchi narrativi e il flag2116; lo scarto spaziale dell'accesso è documentato separatamente. |
| Jazz Club | Controlli su rango nativo9, fascia5, denaro, scelta e invito sono distinti. La lettura del denaro non equivale a una detrazione nella procedura esaminata. |
| Gabbie di battuta | Conserva flag di sblocco, esclusione esplicita del17aprile e consenso del primo ingresso, oltre ai blocchi narrativi comuni. |

Ogni scheda conserva anche i flag HTB, la procedura completa e tutte le procedure locali del campo. I riferimenti allo scheduler conservano le scritture originali e la provenienza; il nome di una procedura non viene trasformato automaticamente in una data applicativa.

Il generatore ripetibile è `tool/urban_conditions.py`, da eseguire indicando la cartella dell'export. Le verifiche delle formule e la successiva associazione allo stato della partita rimangono passaggi distinti.
