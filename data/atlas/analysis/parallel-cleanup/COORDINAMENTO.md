# Atlante — lavoro distribuito

Obiettivo invariato: un unico mondo navigabile completo, con luoghi, attività, condizioni della partita e accessi dalle sezioni della guida. Non dichiarare completa la pulizia delle mappe finché le aree legacy restano affiancate alle risorse native.

Capacità della sessione: quattro agenti contemporanei, root compreso. Tre agenti operativi attivi; verificatore indipendente già disponibile, da attivare appena si libera una posizione. Nessun agente può modificare i file di competenza degli altri.

| Punto aperto | Responsabile attuale | Risultato richiesto |
|---|---|---|
| Nomi e identità di tutte le risorse | atlante_nomi_varianti | Censimento completo, nomi dimostrati e irrisolti espliciti |
| Doppioni, varianti e struttura unica | atlante_struttura_unica | Ogni nodo riconciliato, contenuti e stato conservati, prevenzione reseed |
| Connessioni globali e punti di arrivo | atlante_connessioni_globali | Ogni arco coperto, tipi e geometria verificati, impedimenti risolti per categoria |
| Pin di luoghi e attività | root | Riferimenti univoci e coordinate dimostrate; separazione posizione/disponibilità |
| Condizioni narrative e partita | root, successiva assegnazione libera | Requisiti effettivi ricondotti ai dati disponibili, nessun flag interpretato per supposizione |
| Tokyo, quartieri e Mementos | successiva assegnazione libera | Sblocco quartieri e distinzione luoghi fissi/procedurali; nessuna mappa fissa inventata |
| Accessi da città, palazzi, negozi e inventario | root + analisi struttura | Stesso luogo/planimetria/pin, eliminazione percorsi paralleli |
| Verifica globale, regressioni e consegna | galaxy_task_validator dopo risultati | Copertura completa contro inventario, riavvio, vecchi riferimenti, UI e comportamento |

Priorità di integrazione richiesta dall'utente: completare pulizia struttura e nomi prima di passare alle altre modifiche. Le analisi indipendenti possono procedere in parallelo. Piano validato prima di implementare; ciascun risultato verificato prima del successivo.

Stato verificato 06/09: runtime isolato 3103, frontend 5275, repo C:/Repository/project-p5r-main. 465 mappe, 387 pin. Nove radici dei palazzi fuse e 199 titoli nativi ripuliti; passaggio validato, pulizia globale NON conclusa. Tutte le 116 aree legacy dei dungeon sono nodi senza immagine/asset: analisi in corso per conservare i contenuti senza trattarle come planimetrie.

Cinque pin di localizzazione inseriti/trasferiti sulle tre mappe urbane verificate; nessuna disponibilità di attività dichiarata dal campo soloPosizione. Verifica di integrazione finale ancora da completare. Nessuna connessione nativa operativa aggiunta.

## Ordine vincolante più recente

1. COMPLETARE organizzazione mappe nell'app: tutti i raggruppamenti, gerarchia, riconciliazione duplicati, nomi puliti, luoghi e varianti. Tutti gli agenti lavorano esclusivamente a questa attività fino a risultato globale verificato.
2. SOLO DOPO: pin e gestione di tutti i tipi di pin.
3. SOLO DOPO: resto dell'integrazione (navigabilità operativa, attività, condizioni narrative e accessi).

Il parallelismo divide la prima attività; non autorizza ad avanzare nelle successive. Agent connessioni sospende gli archi e salva il parziale, poi analizza organizzazione UI. Agent struttura si occupa dati/gerarchia. Censimento nomi concluso, in verifica; le 83 identità irrisolte restano lavoro aperto della prima attività. Root coordina implementazione e verifica. Cinque pin già applicati prima di questa precisazione rimangono conservati, ma nessun ulteriore lavoro pin finché fase1 incompleta.