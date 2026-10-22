# L7 — Tanaka e risoluzione dei raccordi documentali

## Riscontro distinto del21ottobre2026

Codice letto:389387be; specifica originale43ad8889, R7-13b/19/22.
Analisi autonoma `audit_documenti_originali`, sola lettura; nessuna lettura
delle87proposte live, nessun test o writer. **R7-13b non ancora soddisfatto.**
Nessuna decisione dell’utente o implementazione del piano è acquisita qui.

## Cinque lacune concrete

1. Il generatore121 produce fino a28proposte individuali,18Royal e10nascondi;
   writer e UI confermano una sola offerta per transazione. Manca una decisione
   unitaria con20correnti e18Royal affiancati.
2. `acquistiService` calcola la spesa legacy dal prezzo corrente dell’articolo.
   Cambiare Homunculus da120000a5000 sulla stessa identità altera quindi spesa
   e grado cliente pur lasciando intatta la riga RAW dell’acquisto. La sola
   conservazione della riga acquisto non soddisfa R7-22.
3. Gli snapshot121 includono condizioni_json. La124 rettifica le20offerte,
   rendendo obsolete quelle fotografie; le proposte di creazione con fonte
   assente possono invece conservare condizioni pre124. Non basta confermarle
   tutte in sequenza o ignorare il conflitto.
4. Il motivo della proposta promette la nota storica Homunculus120000, ma il
   writer non la concretizza come nota visibile: conserva soltanto seed_json.
5. I97raccordi132 forniscono destinazioni documentali, non una soluzione
   applicabile per ogni divergenza. Il servizio restituisce anche liste vuote
   di proposte; la presenza del raccordo non certifica il significato dei dati.

Riferimenti dello snapshot letto:

- `server/db/migrations/catalogoOggetti121.ts:609` — generatore18+10.
- `server/services/catalogoOggettiProposte.ts:146` e257 — conferma individuale/prezzo.
- `server/services/snapshotProposteOggetti.ts:24` e93 — fotografie/obsolescenza.
- `server/db/migrations/124_bonifica_condizioni_attivita.ts:79` —20condizioni.
- `server/services/acquistiService.ts:48` — spesa legacy.
- `src/components/catalogo/AbbinamentiDaApprovare.tsx:112` — gesto individuale.
- `server/services/censimentoScambiCatalogoService.ts:54` e188 — rinvii/proposte.
- `server/db/migrations/132_raccordi_scambi_catalogo.ts:5` — registro documentale.
- `src/components/catalogo/ScambiConFonti.tsx:92` — consultazione.

## Piano completo proposto, ancora da concretizzare e riesaminare

Una sola decisione versionata Tanaka nel Da rivedere, con anteprima20/18 e
destinazione esplicita di ogni riga:8famiglie probabili,2possibili,10senza
riscontro; prezzi, gradi, condizioni effettive e tutte le proposte pertinenti
di qualsiasi stato. Non riaprire scarti o rettifiche personali.

Conservare le20identità commerciali precedenti e i loro prezzi per gli acquisti
legacy, in un archivio consultabile con fotografia integrale privata. Le18
offerte Royal hanno identità di offerta proprie; riusare soltanto identità di
catalogo compatibili per prova. Nessun trasferimento di acquisti, fusione
dedotta dai due casi possibili o trasformazione automatica gemme→6magatama.
Chiavi occupate e proposte già gestite richiedono un piano esplicito, senza
suffissi scelti automaticamente.

Anteprima/conferma atomica con manifestRoyal, CAS di20+18, negozio, cataloghi,
legami, snapshot, Cestino, proposte e dipendenze; operationId e ricevuta.
Qualunque obsolescenza o collisione rifiuta l’intero piano prima degli effetti.
Il risultato approvato deve avere esattamente18offerte Royal attive e nessuna
modifica a righe acquisto/Diario o valori Doti/yen.

Registro decisione e beforeimage immutabili, ripristino unitario conservativo
e import/export coerenti del piano/archivio, senza rigenerare acquisti. Il
consenso unico riguarda l’elenco effettivamente mostrato. Le vecchie proposte
Tanaka rinviano al piano e sono superate soltanto dalla sua conferma riuscita,
con storia preservata; non devono consentire un listino misto pre/post124.
La UI espone la nota storica Homunculus120000 separata dal prezzoRoyal5000.

## Copertura dei97nodi letti integralmente

37Jose completi,16Sakai,10Ambulante,6Gachapon,4archiviTanaka e24Jose sintetici.
Tutti hanno un rinvio documentale; non tutti hanno una proposta applicabile.
58nodi senza codice-rilievo non equivalgono a58verificati, né39conrilievo a39bug.
Le87proposte live restano da leggere negli stati effettivi prima di applicazioni.

Per ognuno serve uno stato motivato corrente: verificato senza intervento,
piano applicabile, scelta esplicita pendente, ricerca necessaria o archivio
con rinvio verificato. La prova deve percorrere fonte→identità→costo→risultati→
condizioni. Non creare97approvazioni artificiali sui casi già corretti.

Questo dossier conserva il riscontro e il contratto proposto; non chiude L7
e non sostituisce la decisione concreta dell’utente richiesta dall’originale.
