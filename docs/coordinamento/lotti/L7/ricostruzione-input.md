# L7 — nuovo censimento delle fonti e riconciliazione runtime

Stato al 21 ottobre 2026, 07:17Z. Questo documento accompagna il [manifest pubblico ricostruito](../../../../shared/l7-fonti-ricostruite.json) e l'audit predisposto nella migrazione 121. **Non è il documento preliminare `l7-proposte.json`, che non è stato ritrovato, e non ne dimostra l'equivalenza.**

Il manifest deriva esclusivamente da `pacchetto/gioco.db`, già tracciato nel repository pubblico: schema 93, SHA-256 `113d09a15ba62127e6cc93b291605bf8fe5db6db641a16aefd635f76a539d5ba`. Contiene 2.430 identità sorgente e impronte, senza i testi sorgente. Le righe dichiarate di origine utente sono escluse dalla pubblicazione. La seconda revisione dei campi improntati conserva il formato `schemaVersion: 1`; «seconda revisione» non significa schema 2.

Il pacchetto schema 93 è precedente allo schema 120 osservato nella ripresa locale. Il manifest non censisce i dati correnti di p5s e i suoi conteggi non ne attestano né la completezza né la conservazione. L'inventario in sola lettura eseguito dall'esecutore L5/L6 con `censisciFontiCatalogo121` sul pacchetto aperto con `readonly: true, fileMustExist: true` ha censito 2.467 fonti: tutte le 2.430 identità del manifest, più 37 righe escluse deliberatamente dalla pubblicazione. Il comando è terminato con exit 0 e ha stampato soltanto conteggi, senza chiamare `up` o `salvaAuditCatalogo121`. Questa evidenza è dell'esecutore, non una nuova esecuzione del revisore distinto. Non è stata eseguita la migrazione né verificato il risultato della conversione sui dati dell'utente.

La funzione condivisa `inputImprontaCatalogo` applica esattamente i `campiPerTipo` del manifest: chiavi degli oggetti ordinate, ordine degli array conservato, campi selezionati mancanti rappresentati con `null`. Le stringhe contenenti JSON rimangono stringhe. Per le sorgenti JSON con `*` sono omessi ricorsivamente soltanto i puntatori `catalogoChiave`. Il resto del confronto usa SHA-256 della rappresentazione canonica. Campi e versione della canonicalizzazione sono inclusi anche nell'audit.

Quando la 121 verrà registrata ed eseguita, acquisirà gli input effettivi **prima** delle proprie scritture. Al termine raccoglierà riferimenti del catalogo, relazioni e proposte, comprese quelle senza candidato. Input runtime e risultati saranno conservati esclusivamente nell'esistente `dati_guida`, chiave `audit-catalogo-121`, nel database della singola istanza; non verranno copiati nel repository pubblico. La vista predisposta localmente nell'app presenterà questo rapporto e le decisioni da esaminare dopo l'attivazione.

Il rapporto distingue:

- fonte nuova, modificata rispetto all'impronta pubblica oppure assente dal runtime;
- riferimenti diretti, proposte e risultati del solo contesto, con indice inverso verso le fonti;
- sezioni assenti, vuote o malformate come diagnostici, senza creare oggetti fittizi;
- risultati aggregati per fonte o venditore, che **non provano** la riconciliazione dei singoli contenuti, delle quantità e delle esclusioni interne.

Una fonte aggregata resta `da-verificare`, con sottoelementi non riconciliati e decisione aperta, anche quando esistono alcuni risultati. L'assenza di un candidato non genera categoria, importo o quantità predefiniti. Un costo senza identità non rende l'articolo «collegato». I risultati non attribuiti a una fonte rimangono nell'indice; la loro presenza non diventa una prova inventata di provenienza.

Il revisore distinto ha approvato staticamente helper, aggancio alla 121 e canonicalizzazione; la vista con elenco suddiviso in pagine è approvata nel perimetro riesaminato. Nei documenti di coordinamento «elenco limitato» indica il numero di righe visualizzate per pagina, non un taglio delle fonti censite o del requisito. **A7-04 non è integralmente chiuso:** restano le riconciliazioni dei sottoelementi e le decisioni aggregate dichiarate nel rapporto. Le migrazioni gioco 121/122 e utente 026 non sono registrate; nessuna conversione, scrittura DB o prova runtime è attestata da questa consegna documentale.
