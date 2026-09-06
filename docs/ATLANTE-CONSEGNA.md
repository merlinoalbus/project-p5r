# Consegna interrotta — Atlante del mondo P5R

Stato consegnato il6 settembre2026 su richiesta dell'utente. **Lo sviluppo è stato fermato prima del completamento.** Questa consegna conserva codice, mappe, dati, estrattore e analisi; non dichiara il mondo già navigabile.

## Da dove riprendere

- `data/seed/mappe/atlante-base.json`: pacchetto base attuale;301immagini native in `public/asset/mappe/native/`.
- `data/atlas/extracted/`: export completo consultabile, PNG, galleria, metadati, icone, campi, script decompilati e fonti. `index.html` è la galleria; non è l'app.
- `data/atlas/original-archives/`: tutti1480file originali estratti, compressi lossless; manifest con hash individuali. Ripristino: `python tools/p5r-map-export/restore_originals.py`.
- `tools/p5r-map-export/`: codice completo dell'estrattore e verificatori. Installare `requirements.txt`, poi usare `esporta.py --cpk <cartellaCPK> --out <cartellaOutput>`. Il compilatore e la sua configurazione giàusati sono in `vendor/atlus-script-tools`; i risultati decompilati e gli hash sono nell'export.
- `data/atlas/runtime-map-package.json`: export delle mappe dal runtime al momento della consegna. `runtime-map-configuration.json` conserva anche configurazione raw mappe, alias, spilli e sezioni guida; non è un backup dei salvataggi.
- `data/atlas/analysis/`: rapporti, proposte, piani applicati e verifiche.
- `data/atlas/history/`: script e checkpoint di lavoro. **Molti script sono monouso o contengono percorsi assoluti del computer originale: non eseguirli automaticamente.**
- `data/atlas/documents/`: documenti leggibili richiesti dall'utente. Alcuni sono fotografie precedenti: questo file prevale sul loro stato di applicazione.

## Obiettivo originario, invariato

Un solo mondo completo navigabile. Mappe, Città, Palazzi e Dedali, negozi e inventario devono restare sezioni autonome con accesso agli stessi luoghi. Prima organizzazione, rinomina e deduplicazione; poi tutti i tipi di pin; poi collegamenti e disponibilità narrativa secondo giorno, momento della giornata, meteo e salvataggio, verificando solo i requisiti realmente usati dal gioco. Passaggio per transizioni, Stazione per metropolitana, Attività per eventi anche con arrivo in altra mappa; includere rampino e scorciatoie. Non inventare piani fissi dei Memento né planimetrie di destinazioni che non ne hanno.

## Stato applicato

- Codice: migrazioni040destinazioni,041soloPosizione,042contenutiGuida; arrivo mappa/x/y/zoom, schede guida editabili e accessi alle sezioni.
- Runtime locale al fermo:344nodi,301immagini native verificate byteperbyte,116sezioni guida,387pin totali. **Solo5pin sono su3mappe native; zero destinazioni precise configurate.**
- Le116aree editoriali senza immagine sono state separate dalle planimetrie preservando contenuti; fusioni dei contenitori e rinomine parziali giàapplicate.
-9nomi di radici e4refusiYongen sono ora applicati al seed e al runtime. Rapporti in `analysis/root-name-release/`, inclusi due reseed su copia e invarianti. L'alias storico della banchina resta distinto da quello della mappa nativa.
- Indice Mappe ripristinato a schede, desktop/mobile verificati dopo regressione. Componenti di raccolte omonime e metadata169immagini/60famiglie sono implementati, ma NON risolvono semanticamente tutti i doppioni; l'integrazione uniforme in tutti i selettori non è finita.
- Trasparenza PNG e inquadratura del contenuto preservate. Supporto contesti nullable applicato a1534: Ripostiglio solo nel contestoF153004, altro contesto sconosciuto.

## Ancora incompleto / errori noti

1. Organizzazione e nomi:50risorse e radice150 non pienamente identificati; immagini omonime possono essere porzioni o contesti diversi. Il titolo uguale non prova un duplicato. Non limitarsi a numerarle se rappresentano zone differenti.
2. La lista `documents/lista-doppioni-da-ripulire.json` era un tentativo basato sui nomi: **criterio respinto dal validatore, NON applicare quelle132eliminazioni.**
3. Il confronto pixel trova5famiglie/12immagini identiche. Il piano successivo `analysis/backend-organization/pixel-duplicate-merge-plan.md` propone3accorpamenti di risorse Kamoshida/Futaba con contesti e trasformazioni preservati; NON applicato né autorizzato come reset definitivo. Le altre coppie possono essere riuso della grafica in luoghi diversi.
4. `analysis/parallel-cleanup/kamoshida-nomi-campi.json` copre36/36immagini:7proposte di nomi più specifici e3solo contestuali; NON applicate.
5. Aula0026 e Biblioteca0028 sono immagini alternative dei piani0020_1/0020_2 con icone/scritte. Sottopasso0012_1 è una rappresentazione alternativa con differenze. Rapporti visuali presenti; riorganizzazione dei3casi NON applicata.
6. Sedici destinazioni Tokyo indicate dall'utente non hanno planimetrie native: gli asset esistenti sono illustrazioni editoriali documentate. `haPlanimetria` deve ancora essere corretto per distinguerle: namespace mappe/ o dimensioni positive non certificano una pianta. Preservare immagini e contenuti, senza farle passare per planimetrie del gioco.
7. Collegamenti:2546occorrenze e2109archi letterali salvati;263candidati contrigger+immagine+ingresso. **Non sono263collegamenti operativi verificati.** Zero importati. Safe-room condivise e condizioni restano da risolvere.
8. Pin dei negozi/confidenti/eventi/rampino/altro e navigazione narrativa globale sono largamente incompleti. I387pin complessivi sono soprattutto contenuti preesistenti, non copertura delle301mappe.
9. L'utente ha chiesto reset dei dati mappe e ricaricamento deduplicato, poi ha ordinato il fermo: **il reset NON è stato eseguito.** Nessun database è stato svuotato.

## Verifiche finali di consegna

- Build: PASS.
- ESLint: PASS.
- Suite finale: **533PASS,1FAIL su534test**. Fallisce `server/routes/mappe-editor.test.ts:55`, aspettativa della vecchia chiaveMementos dopo la rinomina nativaMemento. Log in `history/handoff-final-tests.txt`. Non è stato corretto perché l'utente ha ordinato di fermare lo sviluppo e consegnare lo stato.
- I precedenti report525PASS e497PASS descrivono fotografie anteriori; non sostituiscono l'ultimo risultato.

## Coordinate e fonti

`extracted/mondo_metadati.json` contiene pin in pixel DDS originali, originealto-sinistra. Percentuali app:100*x/larghezza e100*y/altezza SOLOdopo averprovato chepin eplanimetria condividano lo stessoriferimento. Le trasformazioni3D→2D sono specifiche del binding; non trasferire coordinate tra varianti a vista. `extracted/campi-completi/manifest.json` conserva presenzaBASE/IT e hash/config del decompilatore, con precedenzaIT esplicita. L'audit iniziale209ROADMAP è stato esteso all'unione848campi; non ripetere la raccolta completa.

## Ambiente originario

Checkout attivo:C:/Repository/project-p5r-main, ramo codex/atlante-mondo prima della consegna diretta su main. App locale5275/backend3103, DATA_DIR C:/Users/rober/Documents/Codex/2026-09-05/al/work/runtime-atlante. Altri ambienti3101/5273 e3102/5274 non sono quelli di questo lavoro. I task separati aperti su richiesta e poi annullati sono stati fermati e archiviati. Non riavviare l'obiettivo automaticamente: l'utente ha affidato la prosecuzione ad altri.
