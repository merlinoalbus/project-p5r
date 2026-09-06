# Unicità dell’identità seed dello spillo389

Verifica read-only sul DB reale3103 `work/runtime-atlante/project-p5r.db`. La fixture3104 è esclusa.

Esito: **una sola sorgente seed e un solo erede utente (389)**. Nessuna collisione nell’intero insieme dei pacchetti correnti.

|Pacchetto|Mappe|Spilli|
|---|---:|---:|
|data/seed/mappe-editor.json|0|0|
|data/seed/mappe/atlante-base.json|308|0|
|data/seed/mappe/citta-yongen-jaya.json|1|17|
|data/seed/mappe/yongen-java-banchina-della-metropolitana.json|1|2|

Totali: 310 mappe, 19 spilli, 19 identità distinte. Il JSON riporta tutti gli spilli, non soltanto il match.

La sorgente unica è `citta-yongen-jaya.json`, mappa `citta-yongen-jaya`, Gabbie di Battuta, coordinate50.6/54.9 e riferimento `luogo:yongen-jaya/batting-cage-yongen`. Il389 mantiene questa identità storica pur trovandosi ora in `nativo-rmap-009-2-0` con nome/coordinate aggiornati. La ricerca limitata alla mappa corrente perderebbe questa corrispondenza.

Il DB contiene un solo erede con la medesima identità storica. Il397 risulta già assente alla lettura.

**Limite strutturale:** la mappa non fa parte della chiave. Due spilli con medesimi tipo/nome/coordinate/riferimento in mappe diverse sarebbero indistinguibili. Negli attuali pacchetti non ce ne sono; il fallback deve comunque contare globalmente tutti i pacchetti e rifiutare sorgenti o eredi ambigui. Non basta verificare una sola esportazione alla volta.

Nessuna modifica di codice o database. Tutti gli hash dei pacchetti sono nel report. Non è stato rieseguito caricaSeed né modificato il runtime.
