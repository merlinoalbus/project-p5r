# Inventario globale dei collegamenti

Questo inventario riguarda l’intero insieme estratto: **209 campi, 301 immagini di mappa e 2.514 chiamate di cambio campo**. La scuola è stata un caso di verifica spaziale; la raccolta e il metodo di risoluzione degli ingressi sono globali.

| Risultato delle chiamate | Occorrenze |
| --- | ---: |
| Campo e identificativo d’ingresso risolti | 1.652 |
| Identificativo d’ingresso non trovato nel FBN disponibile | 726 |
| Argomenti dinamici, da interpretare | 114 |
| Campo noto, sorgente FBN mancante | 12 |
| Campo di destinazione assente dall’insieme corrente | 10 |

Le chiamate letterali producono 2.080 archi distinti per campo di partenza, destinazione e identificativo d’ingresso. Le occorrenze originali restano associate agli archi: la deduplicazione non elimina procedure o condizioni.

Per 778 chiamate esiste un percorso nel grafo locale delle procedure a partire da un trigger HTB. Questo dato non prova che le condizioni del percorso siano soddisfatte. Le altre chiamate restano conservate come codice la cui esecuzione deve essere verificata.

105 campi hanno una sola immagine candidata, 102 ne hanno più di una e 2 nessuna. Sono presenti anche 33 immagini senza un’associazione ai campi correnti. Non è stata selezionata arbitrariamente una planimetria nei casi ambigui.

## Problemi da risolvere con meccanismi comuni

- Gli ingressi mancanti si concentrano nei campi speciali dei Palazzi con codici che terminano in `051` o `052` e in procedure ripetute. Occorre verificare il loro meccanismo di costruzione o caricamento, prima di attribuire l’assenza a singole mappe.
- Le associazioni a più immagini richiedono la selezione del livello o della variante corretta. Il numero di variante del campo non viene assunto equivalente al livello della texture.
- Le chiamate dinamiche richiedono la risoluzione delle variabili e delle diramazioni delle procedure.
- Le 12 chiamate senza FBN puntano a `F154_012_00`. Le 10 chiamate fuori dall’insieme corrente puntano a otto campi: `F153_011_00`, `F003_010_00`, `F010_019_00`, `F010_005_00`, `F002_001_02`, `F005_002_00`, `F005_003_00`, `F009_003_00`.

`inventario.json` conserva chiamate, trigger, provenienza, ingressi e tutte le immagini candidate. `collegamenti.csv` permette di filtrare le occorrenze per luogo ed esito. `verifica.json` registra il controllo indipendente su tutte le occorrenze e sui byte dei 192 FBN disponibili.

Il validatore ha approvato la copertura dell’audit. Le proiezioni con fattore 1,5 sono ipotesi diagnostiche fuori dai casi esaminati: **1.652 arrivi risolti non significano 1.652 passaggi già navigabili nell’app**. Questo audit non ha generato pin operativi.
