# Confronto visivo delle planimetrie urbane

Analisi read-only del 6 settembre2026. Nessuna decompilazione ripetuta, nessuna modifica a immagini, sorgenti o database. Consultato `work/parallel-cleanup/suffissi-urbani-evidenze.md`; osservati direttamente i sette PNG originali tramite visore immagini. Misure RGBA e hash SHA256 completi in `urban-visual-matrix.json`.

## Risultato

Le immagini scolastiche dette «Aula» e «Biblioteca» non rappresentano stanze autonome. Sono rappresentazioni degli stessi corridoi delle planimetrie0020_1 e0020_2, con elementi grafici differenti. È sufficiente per proporre un'organizzazione come **immagini alternative della stessa planimetria**, conservando risorse e identificativi separati. Non è prova della condizione con cui il gioco sceglie la rappresentazione.

| Immagine | Corrispondenza visiva | Supporto visibile coincidente, Jaccard | Maschera scura, Jaccard |
|---|---|---|---|
|0026_0, oggi Aula|0020_1|99,9448%|99,9833%|
|0028_0, oggi Biblioteca|0020_2|100%|99,9902%|

Tutti i PNG scolastici hanno canvas1024×1024: confronto senza ridimensionamento, traslazione o rotazione. Supporto visibile = alpha>0. Maschera scura = alpha>0 e almeno un canaleRGB<128; è un controllo numerico della sagoma, non un algoritmo di ricostruzione della percorribilità.

0026_0 e0020_1 differiscono in39 pixel del supporto visibile su70592 pixel di unione.0028_0 e0020_2 hanno supporto esattamente identico,69644 pixel. Non sono file duplicati: differiscono rispettivamente4321 e1932 pixelRGBA visibili. È quindi scorretto eliminare una delle immagini come copia byte-identica.

Le coppie non corrispondenti sono nettamente peggiori: Jaccard maschera scura59–79%, rispetto al99,98–99,99% delle coppie individuate.0020_0 ha il collegamento trasversale superiore e ingresso inferiore caratteristici, assenti dalle immagini0026/0028.

Osservazione diretta:0026_0 conserva i due corridoi verticali, passaggio centrale, scale e porte di0020_1 e aggiunge l'indicazione2-D eWC.0028_0 conserva quelli di0020_2 e aggiunge libro eWC. L'icona del libro identifica un punto della rappresentazione, non l'intera superficie come stanza Biblioteca.

## Sottopasso

0012_0 e0012_1 hanno entrambe canvas2048×1024 e la stessa disposizione riconoscibile: scala settentrionale, seconda scala laterale, nucleo di collegamento centrale, corridoio orizzontale inferiore, rientranza rettangolare e scale inferiori. La seconda immagine presenta un'estensione maggiore a sinistra e destra, elimina/rappresenta diversamente i pilastri e aggiunge simboli yen/bevanda e colore alle scale.

Supporto visibile Jaccard72,0277%;54183 pixel divergono nel supporto,86422 pixelRGBA visibili sono diversi. Questi numeri confermano che non sono duplicati eliminabili e non autorizzano una trasformazione automatica delle coordinate.

Proposta: **un solo elemento Sottopasso con due immagini selezionabili**, entrambe conservate, senza presentarle come due luoghi distinti. La somiglianza visiva è prova del rapporto grafico; non attribuire0012_1 alla divisioneF00100201, perché quest'ultima seleziona inveceRMAP00112_0. Non dedurre stagione, stato narrativo o selettore dinamico dall'aspetto differente.

## Integrazione proposta al gate

- Collegare0026_0 al gruppo immagini di0020_1; collegare0028_0 al gruppo immagini di0020_2. Usare i titoli già verificati della planimetria di riferimento, conservandone tutte le alternative: oggi0020_1 è «Edificio principale2P / Edificio laboratori2P» e0020_2 «Edificio principale3P / Edificio laboratori3P». Non scegliere arbitrariamente solo uno dei due edifici.
- Rimuovere «Aula» e «Biblioteca» come nomi autonomi di mappa. I termini possono restare nelle evidenze dei punti indicati, non diventare automaticamente pin o nomi di locali.
- Mostrare ciascuna coppia come un gruppo con miniature «Immagine1 di2» / «Immagine2 di2». L'ordine è di presentazione e non di piani o cronologia.
- Il gruppo non deve comportare copia dei bindingROADMAP, assegnazione delle condizioni di visualizzazione o trasferimento di pin, coordinate e stato. Texpack156/157 rimangono senza campo selettore dimostrato; la prova è qui grafica.
- Conservare tutti i sette file e gli URL storici. Tre gruppi proposti: sottopasso0012_0/1, planimetria0020_1/0026_0, planimetria0020_2/0028_0.0020_0 resta autonomo.

Chiusura verificabile: le tre coppie appaiono una volta ciascuna nel catalogo come gruppi di immagini; ogni immagine resta raggiungibile; nessun nome di stanza usato per un intero corridoio; identità, immagini, alias e dati utente invariati; nessuna nuova condizione di gioco inventata. L'assenza di binding per le immagini alternative resta rendicontata nella provenienza.
