# L7-TANAKA-STORICO — contratto conservativo da implementare

23 ottobre 2026, 07:53 italiana. **STORICO chiuso con PASS finale circoscritto** dopo correzioneST-R01, rilascio030, conservazione completa e osservazione readonly. Il contratto sotto e i checkpoint intermedi restano la storia verificabile dell'implementazione.

## Difetto accertato e fonti

Specifica originale `43ad8889`, L7 R7-22; G034 e R7-13b per il successivo piano Tanaka. `server/services/acquistiService.ts`, `righeLegacy` e `leggiAcquistiPartita`, leggono le tuple personali `(partita_id, articolo_chiave, updated_at)` ma calcolano il contributo dal prezzo e negozio correnti di `main.articolo`. Una rettifica del listino può cambiare retroattivamente spesa e grado senza cambiare la tuple personale. Homunculus 120000→5000 è il controesempio concreto del piano ancora non applicato.

Il fatto Aojiru già registrato ha prezzo fotografato; la presenza legacy che lo rappresenta va esclusa dal conteggio come oggi. Non trasformare una vecchia spunta in quantità, data o prezzo realmente pagato mai registrati.

## Soluzione proposta, senza restringere R7-22

1. Archivio personale separato e immutabile della valutazione, con UUID di generazione, RAW e firma della tuple completa, identità commerciale e negozio fotografati, contributo monetario e origine della prova. Nessuna modifica alle tre colonne originarie; nessuna FK verso il catalogo di gioco che cancelli la prova quando sparisce l'offerta.
2. Associazione attiva alla generazione. Nuova spunta: fotografia e associazione nella stessa transazione della presenza. Spunta già presente: idempotenza senza aggiornare la fotografia. Togli/risegna: nuova generazione, anche se coincidono chiave o timestamp. Non riusare una prova vecchia per mera PK libera.
3. Backfill prima di qualsiasi cambio prezzi: conserva il contributo che il lettore calcolava nel contesto precedente, dichiarandolo come valutazione di continuità, mai come prezzo pagato. Orfano e prezzo NULL restano distinti; l'eventuale contributo precedente zero non diventa prova di gratuità. Coprire tutte le partite e i contenuti pertinenti del Cestino.
4. Lettura della spesa legacy dalla fotografia, mantenendo la deduplicazione I71 fra presenza e fatto attivo. Fotografie e associazioni entrano nella revisione/CAS di `StatoAcquistiDto`, usata anche da `rimuoviPresenzaLegacy`.
5. Rimozione di presenza, articolo, negozio o partita: associazione e prova trattate insieme al registro di rimozione. Archivio immutabile distinto dalle righe ripristinabili del Cestino. Restore solo sulla generazione esatta; conflitto della prova o una generazione successiva impediscono il ripristino, senza ricostruire dal prezzo attuale. I vecchi registri privi di prova sufficiente richiedono riconciliazione esplicita.
6. Backup/esportazione/importazione: trasportare e validare prova e associazione. Import di soli dati personali anteriori: nessuna promessa di recuperare un prezzo storico assente; eventuale continuità dichiarata rispetto al contesto di import, oppure riconciliazione esplicita. Sostituzione del solo gioco: congelare il contesto precedente prima della sostituzione, non quello entrante. Non limitarsi ad aggiungere una tabella all'elenco storico.
7. Prima del piano Tanaka: copertura completa delle presenze e dei registri interessati, confronti conservativi di tuple, contributi, totali e grado col valutatore invariato. Nessuna rettifica del confine `oltre`/`>=` in questo punto.

## Callgraph da integrare

- `server/services/negoziService.ts`, `impostaAcquisto`: INSERT/DELETE della presenza legacy.
- `server/services/acquistiService.ts`: lettura, revisione/CAS, rimozione e riconciliazione I71.
- `server/services/luoghiScritture.ts`: cancellazione delle presenze dei negozi rimossi.
- `server/services/partiteService.ts`, `eliminaPartita`: rimozione privata con Cestino.
- `server/services/cestinoService.ts`: distinzione fra tabelle durevoli e ripristinabili, confronto prima del ripristino e riconciliazione dopo.
- `server/services/impostazioniService.ts`: backup/ripristino dell'istanza e riapertura con migrazioni; completare l'analisi dei formati prima di implementare.
- `server/services/pacchettoGiocoService.ts`: sostituzione del solo gioco e diagnosi degli orfani; `partite.db` resta distinto.
- `server/db/backupService.ts`, `copiaSchema`: backup degli schemi interi prima delle migrazioni; non confonderlo con la validazione semantica dell'importazione.
- `server/db/schemaUtente.ts` e `server/db/migrazioniUtente/index.ts`: schema e migrazione successiva alla 029, ancora da scrivere e registrare.

## Gate e stato

Il revisore distinto ha proposto questa architettura in sola lettura e ha richiesto esplicitamente CAS sulle prove, distinzione archivio/associazione nel Cestino e gestione delle generazioni successive. Dopo lettura integrale del contratto ha dato **PASS della sola soluzione architetturale**, con obbligo di completare l'analisi dei formati e il gate concreto di schema/migrazione/import prima della relativa implementazione/applicazione. Non è un PASS del punto: codice, migrazione, conservazione, controlli e pubblicazione restano da completare. Zero test scritti o eseguiti.

## Implementazione al gate di rilascio

- `server/db/acquistiLegacy.ts`: quattro strutture personali, prove immutabili, marcatore durevole del bootstrap, associazione alla presenza e raccordo del fatto alla generazione. Nessuna cascata dalla partita sugli archivi; associazione in cascata dalla presenza. DDL, indici, trigger, formato, firme e copertura verificati prima dell'adozione.
- Prima di qualsiasi migrazione main, soltanto se030 è nel registro richiesto ed è pending: transazione append-only con fotografia iniziale. Fonte per tabella come066: utente se contiene acquisti, altrimenti main legacy; nessuna fusione. Nessun bump anticipato. Ripresa dopo errore: riuso della sola prova già persistita, senza rivalutazione sul main cambiato.
- `030_continuita_acquisti`: adotta la copertura esatta, crea associazioni/raccordi senza modificare le tuple originarie o i fatti. Sostituisce l'indice unico sulla firma RAW con indice di ricerca non unico; l'unicità semantica è `UNIQUE(valutazione_id)` sul raccordo, anche per fatti inattivi. Necessario per generazioni distinte con identico timestamp/RAW; soluzione approvata dal revisore. Possibile eliminazione della statistica tecnica del solo indice sostituito; nessun dato di avanzamento coinvolto.
- Lettore: contributo e negozio fotografati; presenza rappresentata da un fattoI71 attivo esclusa per generazione, contando il fatto una sola volta. Revisione/CAS comprende prove e raccordi. Vecchie richieste senza prova generazionale non vengono applicate; replay di operazioni già concluse resta compatibile.
- Writer: nuova spunta e fotografia nella stessa transazione; spunta idempotente invariata. Rimozione effettiva normale e rimozione esplicita registrano presenza e associazione nel Cestino privato. Nessun registro quando la presenza è già assente.
- Cestino: non registra e non riavvolge archivi immutabili, neppure per la partita; restore esige prova esatta e ultima generazione. Vecchi registri senza prova richiedono riconciliazione esplicita e restano conservati. Nessun prezzo fotografato durante il restore.
- Backup SQLite e ZIP trasportano tutte le nuove strutture. Validazione prima dell'esportazione e della sostituzione del solo gioco, dopo il backup di sicurezza e prima di close/install; all'importazione provenienza dichiarata e validazione dopo riapertura. Valutazioni già conservate non cambiano col catalogo entrante.
- UI e payload del consenso, incluso riepilogo differito del Diario: prova completa con UUID, generazione, origine e contributo. Distinzione esplicita dal prezzo pagato e fra ignoto, gratuito e offerta assente.

Tre riesami propri completati: callgraph e fonte066; percorsi di rimozione/ripristino/import e generazioni; freeze, regressioni statiche e controlli finali. Typecheck63945, lint28604 e build1052 exit0. Nessun test, avvio locale o prova in scrittura.

Riesame avversariale: **ST-F01** confronto «ulteriore» senza generazione; **ST-F02** prova non esposta nel consenso/preselezione; **ST-F03** rimozione normale senza Cestino. Tutti corretti e chiusi staticamente da Galaxy, PASS statico finale ricevuto. Non è un PASS globaleL7 o consensoTanaka.

Baseline reale readonly05:29:23–27Z: main138/utente29,100/59 tabelle incluse quelle di sistema,7presenze,0fatti attivi,0Cestini con acquisti,FK0/0. Impronte e tuple solo in memoria privata. Rilascio e confronto dopo030 ancora necessari prima di chiudere STORICO.

## Incidente del primo rilascio — ST-R01

a2038c83, pipeline39906575442 SUCCESS. All'aggiornamento automatico il backend rifiuta le fotografie e p5s mostra502: il confronto dell'allowlist usava `articolo,catalogo,nome,negozio,negozioNome`, mentre l'ordine effettivo di `Object.keys().sort()` è `articolo,catalogo,negozio,negozioNome,nome`. Il solo letterale viene corretto, mantenendo esattamente gli stessi cinque campi e tutte le altre guardie. Soluzione e delta esatto approvati staticamente da Galaxy; il difetto era sfuggito anche al suo gate precedente, che non costituiva copertura runtime.

Diagnostica readonly isolata:7foto, tutte le firme di prova/tuple valide, prezzi e generazione1 coerenti; solo il confronto errato delle chiavi era falso. Confronto completo05:43:32–36Z con baseline05:29: tutte100tabelle main e59utente preesistenti identiche, incluse quelle di sistema,FK0/0. Utente resta29: la030è annullata, associazioni assenti, bootstrap append-only durevole conservato. Nessun restore, cancellazione o rigenerazione della prova. STORICO resta aperto fino al correttivo pubblicato e al riscontro reale riuscito.

## Chiusura verificata

Correttivo49c036c8, pipeline39907548119 SUCCESS; CI verificata autonomamente da Galaxy. Watchtower avvia backend05:49:05Z efrontend05:49:06Z, running/0riavvii; health200 e hash del sorgente attivo uguale al freeze corretto. Schema138/30.

Confronti readonly05:49:30–34Z e finale dopo i browser05:52:50–54Z: tutte100tabelle main e59utente preesistenti identiche alla baseline05:29, comprese quelle di sistema. Main senza alcun cambio di schema o dato. Nel solo utente: quattro nuove tabelle, sei trigger di immutabilità e relativi indici; rimosso soltanto l'indice unico RAW e aggiunto l'indice di ricerca previsto. Nessun vecchio DDL diverso. Sette tuple personali identiche, sette fotografie e marcatore identici al bootstrap precedente al fallimento, sette associazioni esatte; identità, contributi e provenienza conformi al prima. Totali per negozio identici con contributi congelati, valutatore dei gradi invariato;FK0/0. Impronte e dati personali soloRAM del coordinatore; nessuna prova attribuita al revisore che non l'abbia acquisita.

Entrambi osservano readonly il registro con sette presenze e generazione1, provenienza di continuità e distinzione esplicita dal prezzo pagato; il prezzo ignoto con contributozero non è dichiarato gratuito. Console del coordinatore dopo ripresa e del revisore senza warn/error. Galaxy emette **PASS finale circoscrittoSTORICO**. Limiti: nessun writer, ripristino, import o replay esercitato; screenshot del revisore indisponibili per timeout, nessuna sua certificazione in pixel o globale del layout. Nessuna modifica del listinoTanaka o consenso commerciale; non chiudeL7.
