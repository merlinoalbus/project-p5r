# Mondo unificato P5R — documenti raccolti e stato reale

Questa cartella raccoglie copie fedeli dei rapporti già prodotti. Non è una dichiarazione di completamento: l'integrazione del mondo navigabile è ancora incompleta. Le copie sono una fotografia; il manifest riporta percorso e hash di ogni fonte originale.

## Pin: dove posizionarli

[Coordinate e icone native per planimetria](C:/Users/rober/Documents/Codex/2026-09-05/al/outputs/documenti-mondo/coordinate-pin-native.json)

Il campo maps contiene le risorse estratte; ogni elemento pins conserva nativeType, x, y, offset, flag ed effect. Coordinate nei pixel dell'immagine originale DDS, origine in alto a sinistra, x verso destra e y verso il basso. Per l'app percentuale: x_app=100*x/larghezza_originale; y_app=100*y/altezza_originale. Questa conversione si applica solo quando pin e immagine condividono la fonte e il riferimento verificati, senza ritaglio o ridimensionamento distruttivo. L'inquadratura del visore non modifica le coordinate salvate.

**Limite:** questi dati non costituiscono una lista completa di negozi, confidenti e attività già identificati. I tipi numerici e i flag devono essere interpretati; una posizione nota non prova la disponibilità dell'attività.

[I cinque pin effettivamente applicati, con prima/dopo ed evidenze](C:/Users/rober/Documents/Codex/2026-09-05/al/outputs/documenti-mondo/cinque-pin-applicati.json)

## Collegamenti: origine, destinazione e condizioni

[Rapporto leggibile sui collegamenti globali](C:/Users/rober/Documents/Codex/2026-09-05/al/outputs/documenti-mondo/collegamenti-globali.md) — [Dati analitici del rapporto](C:/Users/rober/Documents/Codex/2026-09-05/al/outputs/documenti-mondo/collegamenti-globali.json) — [Inventario completo delle chiamate di cambio campo](C:/Users/rober/Documents/Codex/2026-09-05/al/outputs/documenti-mondo/chiamate-cambio-campo.json)

Censite 2546 occorrenze, conservati 2109 archi letterali. 263 occorrenze hanno campo/ingresso risolti, una sola immagine candidata ai due estremi e un percorso locale da trigger. **Non sono 263 passaggi operativi certificati o importati.** Le chiamate condivise delle safe room non possono diventare indiscriminatamente collegamenti sulla mappa.

Il collegamento finale deve riportare mappa e posizione di origine, tipo di pin, mappa e punto di arrivo, eventuale contesto/variante, requisiti effettivamente verificati e fonte. Non dedurre il collegamento inverso: va provato separatamente. Presenza del campo, omonimia o somiglianza grafica non bastano. In app il supporto a destinazione mappa/x/y/zoom esiste; nell'ultimo controllo del runtime risultano zero destinazioni configurate.

## Decisioni richieste dall'utente

- Un solo mondo: Mappe, Città, Palazzi e Dedali, negozi e inventario restano sezioni distinte con accesso diretto ai medesimi luoghi.
- Prima completare organizzazione, nomi e raggruppamenti; poi tutti i tipi di pin; poi collegamenti e disponibilità narrativa globale.
- Passaggio per spostamenti; Stazione per la metropolitana; Attività per eventi narrativi, eventualmente con arrivo sulla mappa dell'evento. Conservare anche rampino, scorciatoie e gli altri tipi pertinenti.
- Disponibilità secondo giorno, momento della giornata, meteo e stato del salvataggio: confidenti, ranghi, Persona o altri livelli soltanto quando sono davvero requisiti del gioco.
- Tokyo mostra le destinazioni secondo gli sblocchi; non inventare planimetrie per luoghi che non ne hanno. Non rappresentare i Memento procedurali come una pianta fissa universale.
- Lavoro sul pacchetto base; import/export conservati per future integrazioni. Non eliminare le sezioni di negozi, beni o guide.
- Conservare coordinate, immagini, personalizzazioni, ID e vecchi collegamenti durante la riorganizzazione.

## Nomi, doppioni e luoghi senza planimetria

[Elenco dei problemi di organizzazione ancora aperti](C:/Users/rober/Documents/Codex/2026-09-05/al/outputs/documenti-mondo/organizzazione-da-completare.md) — [Censimento per nodo](C:/Users/rober/Documents/Codex/2026-09-05/al/outputs/documenti-mondo/censimento-organizzazione.json)

[Confronto diretto delle immagini della scuola e del Sottopasso](C:/Users/rober/Documents/Codex/2026-09-05/al/outputs/documenti-mondo/confronto-scuola-sottopasso.md) — [Misure del confronto](C:/Users/rober/Documents/Codex/2026-09-05/al/outputs/documenti-mondo/confronto-immagini-misure.json)

[Verifica delle sedici destinazioni indicate dall’utente](C:/Users/rober/Documents/Codex/2026-09-05/al/outputs/documenti-mondo/destinazioni-senza-planimetria.md)

[Nomi ricostruiti e nomi ancora irrisolti](C:/Users/rober/Documents/Codex/2026-09-05/al/outputs/documenti-mondo/nomi-residui.md)

[Proposta di presentazione delle immagini omonime](C:/Users/rober/Documents/Codex/2026-09-05/al/outputs/documenti-mondo/proposta-raggruppamenti.md)

Le ultime proposte non sono tutte già applicate. Le 62 famiglie omonime del censimento non equivalgono a 62 duplicati eliminabili; occorre distinguere immagini alternative, porzioni diverse e copie identiche. Il raggruppamento visivo non dimostra una relazione geografica.

## Stato dell'app e ripresa

Repository attivo: C:/Repository/project-p5r-main, ramo codex/atlante-mondo. Runtime locale: frontend5275/backend3103, database work/runtime-atlante/project-p5r.db nella cartella di questo lavoro. Non usare per l'app il database privato delle prove.

Ultimo controllo: 344 nodi, 301 immagini native caricate e confrontate con gli originali, 116 sezioni guida conservate, 387 pin totali; soltanto5 pin su3 mappe native, zero destinazioni configurate. Ripristino dell'indice a schede verificato desktop/mobile e approvato. Nove nomi e quattro refusi verificati su copia con due reseed: applicazione al runtime ancora da completare al momento di questa fotografia. Raggruppamenti globali in lavorazione.

Il checkpoint operativo dettagliato è work/RIPRESA-ATLANTE.md. Gli originali, le fonti e il tool di estrazione sono in outputs/mappe-p5r; le analisi di lavoro in work/parallel-cleanup e work/backend-organization. Non rieseguire alla cieca gli script di applicazione: alcuni sono monouso e i rapporti distinguono copie di prova e runtime.

**Manca ancora un pacchetto completo e verificato di tutti i pin e collegamenti operativi del mondo. Questi documenti permettono di riprendere il lavoro, non sostituiscono quel risultato.**
