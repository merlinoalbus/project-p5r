# Decisione sulle tre famiglie con pixel e nome uguali

Analisi read-only, senza nuovi backup o modifica dei dati. Fonti riutilizzate: `outputs/documenti-mondo/duplicati-pixel-identici.json`, `work/parallel-cleanup/nomi-varianti.json`. Verificati i sette record nel database attivo in sola lettura. Dati completi e dipendenze in `pixel-duplicate-merge-evidence.json`.

**Proponibili tre accorpamenti di risorse di planimetria; il quarto non è dimostrato.** Non basta uguaglianza grafica e lessicale per dichiarare uguali due luoghi. La distinzione decisiva è l'identità del record nativo di presentazione, oltre ai pixel.

## Kamoshida: due accorpamenti proponibili

| Risorsa | Texpack | Texelem | Indice titolo | Campi selettori |
|---|---|---|---|---|
|1512_1|5|7|16|F15100200, F15100300, F15101400|
|1513_0|6;137|7;0|16;0|F15101500; F15105100 e F15205100 nel contesto137|
|1514_0|7|7|16|F15100400|

Il titolo ordinario è sempre «Vecchio castello2P». Le tre risorse usano esattamente lo stesso record texelem7, stesso contenuto binario, indice16 a offset1664 e stesso gruppo nominale. Non è soltanto una stringa ripetuta in record differenti. Tutti i pixelRGBA e le dimensioni2048×2048 coincidono; SHA256pixel `b74fa932397c378c69d4ad0e37c55f64fca2fda45c43c5c168ddd1a94a715a82`.

Proposta: `nativo-rmap-151-3-0` e `nativo-rmap-151-4-0` confluiscono nella risorsa canonica `nativo-rmap-151-2-1`. Conservare nel modello tutti i campi e il contesto137, il cui titolo è ???: non attribuirgli implicitamente il titolo ordinario. Il texpack137 è una raccolta di più texture e non prova che l'intero campo sia questa sola planimetria.

## Futaba: un accorpamento proponibile

| Risorsa | Texpack | Texelem | Indice titolo | Campi selettori |
|---|---|---|---|---|
|1554_0|47;140|75;0|80;0|F15500400; F15505100 nel contesto140|
|1556_0|49|75|80|F15500600|

Entrambe hanno titolo «Camera del Santuario1P», stesso record texelem75 e indice80 a offset4224. Pixel e dimensioni2048×2048 coincidono; SHA256pixel `c9bc708bc181d36a8a56ad787aa5cdacb9a1c38efba14c82645f4bb4bd223433`.

Proposta: `nativo-rmap-155-6-0` confluisce in `nativo-rmap-155-4-0`. Le trasformazioni dei texpack47/49 e i cursori dei campi sono differenti: conservarli per campo, senza sostituirli con quelli del canonico. Il contesto140 conserva titolo non risolto; non ereditare silenziosamente quello ordinario.

Queste due famiglie consentono una sola risorsa geografica di rappresentazione con più binding nativi. Non dimostrano che tutti i rispettivi campi3D siano un solo campo, né autorizzano la fusione dei loro stati o collegamenti. La deduplicazione dell'immagine deve essere separata dalla conservazione delle identità dei campi.

## Profondità: accorpamento non dimostrato

1614_0: F16100400, texpack109, texelem143, titolo indice153 offset7120.1617_0: F16100700, texpack112, texelem146, titolo indice156 offset7248. Entrambi hanno testo «Vuoto cavernoso», ma provengono da record nominali e texelem distinti. L'immagine512×512 e il cursore206/206 sono uguali; SHA256pixel `d51c1dc3fe271edf62b42bfdea10da3de5fe72ecbff5a7bb64a3d13809bb7dc1`.

Le evidenze sono compatibili con riuso della stessa sagoma per stanze diverse. Non provano che F161004 e F161007 siano lo stesso luogo. Non proporre `1617_0→1614_0` come merge geografico; mantenere entrambe le identità finché una prova di struttura/connessioni o nome più specifico risolve il rapporto. La deduplicazione del solo file fisico sarebbe possibile, ma non soddisfa né giustifica la rimozione di un nodo geografico.

## Guardie operative per i tre merge proposti

Tutti i sette nodi, alla verifica, hanno zero spilli proprietari, zero riferimenti entranti da spilli, zero destinazioni, zero figli e zero ingressi di quartiere. Kamoshida/Futaba hanno tre alias per nodo, Profondità quattro. Nessuna associazione `mappa_entita` preesistente. Non confondere zero pin applicati con i conteggi di icone nelle fonti native, che non sono dati operativi.

Prima dell'applicazione il gate deve richiedere:

1. Ricontrollo esatto di pixel, dimensioni e record nativi sopra indicati. Nessuna deduzione dal solo nome.
2. Conservazione della risorsa canonica senza cambiamenti di bitmap o sistema di coordinate. Gli altri file non devono essere cancellati dall'archivio delle fonti.
3. Trasferimento di tutti gli alias, inclusi vecchio URL corrente e chiave stabile della risorsa rimossa. Una collisione verso un'altra identità annulla il merge.
4. Unione senza perdita dei binding campo/texpack/record/offset/cursore/trasformazioni, mantenendo anche la chiave della risorsa originaria. Se uno stesso campo ha più binding conservarli tutti, non selezionare il primo. Salvare anche la provenienza e gli hash originali. I contesti senza titolo rimangono esplicitamente tali.
5. Eventuali note o personalizzazioni divergenti rilevate al momento dell'operazione impediscono la cancellazione finché non sono preservate integralmente. La sola verifica di assenza pin non basta.
6. Reseed del pacchetto ripulito non ricrea i tre nodi rimossi; tutti i vecchi URL risolvono alla risorsa canonica e le identità dei campi rimangono interrogabili separatamente.

Esclusi esplicitamente i gruppi pixelidentici Shido e190, con titoli/contesti differenti. Non fanno parte della proposta.
