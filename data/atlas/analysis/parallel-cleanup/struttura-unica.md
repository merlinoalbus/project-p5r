# Struttura unica: esito del censimento read-only

Il problema principale e strutturale: le 116 aree legacy sono sezioni editoriali della guida, tutte senza immagine e senza asset. Sono state promosse automaticamente a mappe e affiancate alle planimetrie native. Non sono 116 immagini da deduplicare.

## Copertura

- 465 nodi mappa censiti individualmente, ogni chiave una volta.
- 301 planimetrie native; 12 contenitori tecnici; 35 contenitori geografici; 116 aree editoriali; una mappa legacy con immagine tramite asset.
- 387 pin contabilizzati: 187 su aree editoriali, 116 passaggi sulle radici dungeon verso le aree, gli altri su citta e mappe.
- Nessuna associazione area editoriale/planimetria e registrata. I candidati riportati sono soltanto l'ambito del palazzo, MAI destinazioni approvate.
- Ogni riga del JSON conserva nome, genitore, immagini, pin completi, alias, ingressi e contenuti della guida. I controlli coverage sono tutti veri.

## Soluzione strutturale proposta, da validare prima di implementare

1. Separare il ruolo editoriale dal ruolo geografico senza distruggere le identita: una sezione dungeon_area resta contenuto della guida; una planimetria resta immagine fisica. La relazione e molti-a-molti, con fonte e precisione esplicite. Una seconda visita o una sezione che comprende piu stanze non diventa una seconda mappa.
2. Introdurre una relazione esplicita fra contenuto guida e mappe fisiche (con fonte); mantenere i contenuti non ancora localizzati nell'elenco del rispettivo palazzo, senza disegnarli in coordinate inventate. Per la transizione conservare i nodi editoriali nello storage con ruolo distinto, escludendoli dal selettore di planimetrie, ma lasciandoli raggiungibili come contenuti e alias. Questo preserva spillo IDs, immagini e stato finche ogni pin non e localizzato realmente.
3. Aggiornare elenco mappe, dettaglio palazzo, accessoMondo e vecchi URL in modo coerente: la vecchia area apre i suoi contenuti nel luogo unico; un punto localizzato apre il pin preciso. Non deviare un vecchio URL verso una stanza arbitraria. Il selettore non deve offrire un contenuto editoriale come una planimetria.
4. Modificare sincronizzaMappe: dungeon_area non deve creare un nodo fisico, e il ciclo che genera i 116 passaggi a griglia deve cessare per i contenitori convertiti. Anche ricostruzione da seed e nuova installazione devono avere lo stesso modello. Le vecchie griglie non sono connessioni del gioco.
5. Accorpare subito, dopo gate, i contenitori tecnici Shibuya e Shujin nei rispettivi quartieri: identita native concordi, figli e alias conservati. Gli altri 10 archivi richiedono una decisione sul loro ambito, non una cancellazione in blocco. L'archivio 011 non e un quartiere: le sue risorse sono banchine di localita diverse.
6. Rivalidare schema, build e runtime; import/export, nuova installazione e reseed; vecchi alias e accessi da citta/palazzi/negozi/inventario; stato partita e pin; completezza e assenza di duplicati di ruolo nell'intero atlante.

## Scuola

Sono presenti sette risorse, tre planimetrie dei piani, cancello, tetto, Aula e Biblioteca. Cinque sotto il quartiere e due sotto l'archivio tecnico. Non mancano i piani dalla raccolta: la navigazione li divide fra due rami. Le tre immagini sono denominate edificio principale/laboratori insieme; non creare altri piani solo per dividere le etichette. L'agente nomi deve verificare il significato delle due risorse Aula/Biblioteca, poiche il campo F002_006_00 rimanda ai candidati ROADMAP dei piani e del tetto.

## Limite esplicito

Il censimento completo non e una riconciliazione completa: tutte le 116 aree hanno il proprio caso documentato, ma i legami alle immagini devono essere provati attraverso contenuto, geometria e fonti. Nascondere questi casi o rinominarli non equivale a completarli. Nessuna modifica e stata eseguita su codice o database.

## Piano implementabile aggiornato: rimozione reale dei nodi editoriali

La proposta di semplice ruolo transitorio non basta come stato finale. Nel JSON implementationPlan specifica una migrazione reale: spillo conserva ogni ID ma ammette proprietario alternativo area_guida_chiave, mutuamente esclusivo con mappa_chiave; le coordinate storiche rimangono archiviate e non vengono emesse come posizioni. Si migrano 187 POI e separatamente i 116 link editoriali generati sulle radici. Le FK di stato e immagini continuano a riferirsi allo stesso ID. Gli alias diventano destinazioni controllate mappa oppure sezione guida. Solo dopo la migrazione si eliminano le 116 righe mappa, mantenendo dungeon_area e punto_interesse.

Una relazione mappa_entita molti-a-molti registra solo associazioni certificate, con fonte. Il dettaglio del palazzo presenta le planimetrie fisiche e i contenuti guida nello stesso luogo; i contenuti non localizzati rimangono leggibili senza un finto punto sulla pianta. L'accesso a un contenuto non e spacciato per arrivo geografico. Nuova installazione e reseed usano lo stesso modello.

Il piano e falsificabile: dopo questa sola migrazione 349 mappe, tutti i 387 ID pin conservati, tutte le 116 sezioni raggiungibili dai vecchi URL, zero mappe editoriali ricreate dopo reseed, tutti i contenuti e stati invariati. Totale mappe puo diminuire ulteriormente per accorpamenti radici validati separatamente.
