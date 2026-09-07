# Esito verifiche — Atlante del mondo P5R

Verbale mantenuto da Codex in sola lettura rispetto al codice applicativo. Le verifiche sono
eseguite sulle fasi dichiarate **PRONTA PER VERIFICA** in `docs/ATLANTE-STATO.md`.

## Fase 0 — Sblocco delle fonti e test rosso

**Esito: PASS**  
**Commit verificato:** `fc16139f51d695b65efb3f5a021c3f5a22821ebb`  
**Data verifica:** 6 settembre 2026

### Evidenze riprodotte

1. `python tools/p5r-map-export/restore_originals.py`
   - esito: `Originali ripristinati e verificati: 1480`;
   - seconda esecuzione controllata confrontando percorso, dimensione e timestamp di tutti i
     file: 1480 prima, 1480 dopo, metadati invariati. Lo script non ha riscritto gli originali.
2. Verificatori indipendenti sui dati presenti:
   - `verify_whole_map_names.py`: PASS, 106 record e 2014 voci ricontrollati byte per byte;
   - `verify_dungeon_place_index.py`: PASS, 192 record ricontrollati sui titoli nativi;
   - `verify_map_icons.py`: PASS, 193 sprite, 144 PNG confrontati pixel per pixel e 1429 pin;
   - `verify_subway_network.py`: PASS, 31 stazioni valide, 91 tratte e 33 righe di tariffa.
3. Riproducibilità verificata in una cartella temporanea isolata, senza sovrascrivere gli
   artefatti del branch:
   - i quattro estrattori terminano con codice 0;
   - `nomi-mappe-ufficiali.json`, `indice-luoghi-dungeon.json`, `icone-mappa.json` e
     `metropolitana.json` risultano byte-identici ai file versionati (SHA-256 coincidenti);
   - tutti i 144 PNG rigenerati hanno nome e SHA-256 identici ai file versionati.
4. Qualità del repository:
   - `npm run typecheck`: PASS;
   - `npm run lint`: PASS;
   - `npm test`: PASS, 132 file e **534 test su 534**.
5. Correzione del test del Dedalo:
   - il test usa la chiave pubblica `memento`;
   - la suite completa conferma il comportamento attuale, senza altri test rossi.

### Verifica di merito dell'associazione delle icone

- I 51 tipi dichiarati dimostrati sono esattamente l'intervallo nativo 46–96.
- Lo scarto `sprite = tipoNativo + 68` li collega al blocco contiguo di sprite 114–164; tutti
  gli sprite sono non vuoti e portano nomi interni coerenti con negozi e luoghi urbani.
- Le occorrenze dei 51 tipi sono esclusivamente urbane. Gli ancoraggi indipendenti di Shibuya,
  Yongen-Jaya, Akihabara e Kichijoji coincidono con le destinazioni ufficiali delle rispettive
  mappe e impongono il medesimo scarto.
- I 38 tipi presenti nei Palazzi non hanno ricevuto semantica: per tutti `sprite` e
  `nomeNativo` sono null. Anche i 13 tipi urbani fuori dal blocco dimostrato restano non
  associati.
- Il conteggio corrente di **102 tipi nativi distinti** non è una perdita rispetto ai dati
  precedenti: `mondo_metadati.json` contiene gli stessi 102 tipi e le stesse 1429 occorrenze.
  Il valore 104 nel piano iniziale era una stima antecedente al nuovo censimento.

### Perimetro e regressioni

- Nessun file di codice è stato modificato da Codex.
- Al termine della verifica non risultano differenze locali sui file della Fase 0.
- `tools/p5r-map-export/atlas_identity.py` e
  `data/atlas/extracted/atlante-identita.json`, presenti come file non tracciati durante i
  controlli, appartengono alla lavorazione concorrente della Fase 1a e sono stati esclusi da
  questo esito.
- La Fase 1 non è approvata né valutata da questo verbale.

**Decisione:** Fase 0 approvata. È possibile considerarla validata e procedere con le fasi
successive, fermo restando che ciascuna dovrà essere dichiarata pronta e verificata
separatamente.

## Fase 1a — Catalogo di identità certificato

**Esito: FAIL**  
**Commit verificato:** `2f0c915` con dichiarazione di pronto `a1df618`  
**Data verifica:** 6 settembre 2026

### Evidenze positive

1. `python tools/p5r-map-export/verify_atlas_identity.py data/atlas/extracted` termina con codice
   0 e riconta 301 planimetrie in 149 luoghi, 274 nomi, 4 copie e 297 immagini non duplicate.
2. La rigenerazione con `atlas_identity.py` in una cartella temporanea isolata produce un
   `atlante-identita.json` byte-identico al file versionato
   (`SHA-256 3946796BCE32A7F0D02A2D654EDC5E013E373E2633F2C13F1FF50C6F88D6B23B`).
3. Tutte le 301 immagini sono assegnate una volta sola; le 27 planimetrie senza nome nativo
   hanno un motivo valorizzato: 8 strutture ricorrenti dei Memento, 14 immagini non usate da
   campi e 5 immagini non nominate dalle tabelle.
4. Le identità pixel uguali di `Vuoto cavernoso` e dei tre casi di Shido restano correttamente
   in luoghi separati.

### Rilievi bloccanti

1. **È stata introdotta una quarta copia non autorizzata e non certificata dal record di
   presentazione.** `nativo-rmap-190-62-0` è dichiarata
   `copia-di:nativo-rmap-190-61-0` soltanto perché ha lo stesso `pixelSha256`. Entrambe sono
   prive di `texelem`, indice titolo e contesto di presentazione; la prima non è associata ad
   alcun campo. Il criterio non negoziabile richiede stesso `texelem`, stesso indice titolo e
   stessi pixel, e ammette soltanto le tre copie già dimostrate: due di Kamoshida e una di
   Futaba. Il verificatore controlla solo che l'hash pixel della copia compaia fra le versioni
   dello stesso raggruppamento, quindi non rileva questa violazione.
2. **Tredici luoghi omonimi vengono numerati, in contrasto con il divieto esplicito di usare
   numeri come identità.** Il fallback `ordine-di-attraversamento` genera etichette come
   `Cammino per il Santo Graal — 1º tratto`, `Corridoio della prigione — 1º tratto`,
   `Ufficio riciclaggio — 1º tratto` e `Vuoto cavernoso — 1º tratto`. Soltanto 2 dei 15 luoghi
   omonimi ricevono una distinzione dimostrata dai vicini del grafo. Il verificatore accerta
   esclusivamente che le stringhe siano diverse, non che la distinzione sia nativa e non
   numerica.
3. **La gerarchia delle fonti nominali approvata non è implementata.** `atlas_identity.py` non
   legge `nomi-mappe-ufficiali.json` e sceglie nell'ordine titolo area texpack, titolo roadmap,
   indice dungeon. Manca quindi la precedenza richiesta
   `FLDWHOLEMAPTABLE* → FLDDNGPLACENO → FLDPLACENO+FLDPLACENAME → titolo texpack`, proprio la
   fonte ufficiale italiana sbloccata dalla Fase 0.
4. **La provenienza dei nomi non soddisfa il requisito offset più hash.** Il catalogo elenca le
   quattro sorgenti soltanto per nome file e nessuna `fonteNome` contiene l'hash della sorgente.
   Le 27 fonti `titolo-roadmap` non riportano neppure un offset; le 16 fonti
   `livello-fratello-nominato` riportano solo la chiave del fratello. I 301 `sha256` presenti nel
   JSON sono gli hash dei pixel delle immagini, non gli hash delle fonti nominali.
5. **Restano etichette tecniche sintetiche.** I luoghi senza nome nativo vengono esposti come
   `Risorse grafiche non usate da alcun campo` e `Strutture ricorrenti dei Memento`. Il controllo
   `TECNICO` non le intercetta perché vieta soltanto prefissi più stretti (`Risorse native`,
   `RMAP`, `Area N`, `Luogo N`). Non sono nomi dimostrati da una fonte nativa e non possono
   soddisfare il requisito «nessuna etichetta tecnica».

### Limiti del verificatore consegnato

- Non verifica che una copia condivida `texelem` e indice titolo con l'originale.
- Non rilegge il grafo per convalidare `fonteDistinzione` e accetta il fallback numerico.
- Per i titoli roadmap usa un confronto sui soli primi 12 caratteri.
- Per le versioni controlla l'unicità delle etichette, ma non che descrizioni quali
  `planimetria completa`, `settore d'ingresso` o direzioni geometriche corrispondano davvero al
  contenuto visuale.

**Decisione:** Fase 1a respinta. Non può essere marcata validata finché i cinque rilievi
bloccanti non sono corretti e sottoposti a una nuova verifica indipendente. Il resto della Fase
1 resta fuori perimetro e non è stato valutato.

## Fase 1a — Seconda verifica dopo le correzioni

**Esito: FAIL**  
**Commit verificato:** `2a5fcc0`  
**Data verifica:** 6 settembre 2026

### Correzioni confermate

1. Il catalogo copre ancora 301 planimetrie in 149 luoghi e il verificatore passa.
2. Le copie sono ora esattamente 3: le due copie di Kamoshida e quella di Futaba. La risorsa
   `nativo-rmap-190-62-0` non viene più accorpata senza record di presentazione.
3. `nomi-mappe-ufficiali.json` è ora usato: 81 planimetrie ricevono la grafia ufficiale della
   mappa d'insieme.
4. Tutte le fonti nominali valorizzate riportano un file e il relativo SHA-256; il verificatore
   ricontrolla l'impronta del file.
5. Le etichette tecniche sintetiche precedenti non risultano più assegnate come `nome` ai luoghi
   senza nome nativo.

### Rilievi ancora bloccanti

1. **Il divieto di numerare gli omonimi non è rispettato.** Tutti i 15 luoghi omonimi hanno una
   stringa diversa, ma 13 restano distinti tramite numerazione romana:
   - 6 con `fonteDistinzione = nomi-enumerati-dalla-guida`;
   - 7 con `fonteDistinzione = ordine-di-attraversamento`, cioè senza distinzione dimostrata né
     dai vicini né dalla guida.
   Esempi: `Vuoto cavernoso – Parte I/II`, `Corridoio della prigione – Parte I/V` e
   `Ufficio riciclaggio – Parte I/II`. Il criterio approvato richiede nomi distintivi verificati
   e vieta esplicitamente la numerazione. Il verificatore continua a controllare soltanto che le
   stringhe siano non vuote e univoche, quindi accetta il fallback vietato.
2. **Otto nomi non hanno ancora un offset di provenienza.** Le tre immagini aggregate
   `Edificio principale / Edificio laboratori` e le cinque versioni del `Covo dei Ladri`
   dichiarano `fonte = titolo-roadmap`, file e SHA-256, ma `fonteNome.offset = null` e
   `fonteNome.indice = null`. Il requisito richiede fonte, offset e impronta per ogni nome; un
   riferimento al file senza posizione non certifica la stringa. Il verificatore controlla
   file e hash ma non impone che l'offset sia valorizzato.

### Riproducibilità

- `verify_atlas_identity.py` passa con 301 planimetrie, 149 luoghi, 274 nomi, 3 copie e 298
  versioni/non-copie.
- Le correzioni positive sono quindi riproducibili, ma il PASS tecnico del verificatore non
  copre i due vincoli sopra.

**Decisione:** Fase 1a nuovamente respinta. In applicazione della sequenza di validazione, le
Fasi 1b, 1c e 1d dichiarate contemporaneamente pronte non vengono ancora valutate: la verifica
si ferma sulla dipendenza 1a finché i due rilievi residui non sono corretti.

## Fase 1a — Terza verifica e arbitrato dell'utente

**Esito: PASS**
**Commit verificato:** `64e092e`
**Data verifica:** 6 settembre 2026

### Evidenze

1. `atlas_identity.py` rigenera un file byte-identico a quello versionato: SHA-256
   `741B86C16F4D345806CD4E7CBBDF120DA615DE5CE3172E8D65B949A064ED90D6`.
2. `verify_atlas_identity.py` passa sul catalogo versionato: 301 planimetrie in 149 luoghi,
   274 nomi ricontrollati sulle fonti, 3 copie e 298 versioni/non-copie verificate sui pixel.
3. Ogni fonte nominale valorizzata possiede file, SHA-256 e offset; i titoli composti riportano
   la posizione di ciascun componente.
4. La precedente obiezione alla forma «Parte I/II/III» è ritirata per decisione esplicita
   dell'utente, che ha confermato che questi sono i nomi effettivi da adottare. Non costituisce
   quindi un rilievo residuo.

**Decisione:** Fase 1a approvata. I due rilievi della seconda verifica sono chiusi dalla
correzione degli offset e dall'arbitrato vincolante dell'utente sulla nomenclatura.

## Fase 1b — Pacchetto seed autosufficiente

**Esito: PASS**
**Commit verificato:** `2a5fcc0` (con catalogo 1a aggiornato fino a `64e092e`)
**Data verifica:** 6 settembre 2026

### Evidenze

1. La rigenerazione isolata di `atlante-mondo.json` è byte-identica al file versionato:
   SHA-256 `9E0C966C58D91922278D77137B3ADC0D4642E3004206FA22722668CB29C6D73F`.
   Anche `pacchetto-seed-rapporto.json` è byte-identico, SHA-256
   `70E2FA0BE2D5C80D95ED4AC25A510D0127C0D6DC13D96520049ED4D236E4F35D`.
2. Il pacchetto contiene 298 mappe con 298 chiavi uniche e 298 asset esistenti; tutte dichiarano
   `ruoloImmagine = planimetria-nativa`. Non risultano campi obbligatori o asset mancanti.
3. I conteggi rigenerati coincidono con la dichiarazione: 149 luoghi, 3 copie escluse, 228 mappe
   con gruppo immagini, 49 con contesti e 72 associazioni uniche a entità della guida.

**Decisione:** Fase 1b approvata. Il difetto di etichette tecniche descritto nella Fase 1d
riguarda la presentazione all'utente e non altera completezza o riproducibilità del pacchetto.

## Fase 1c — Reset e ricostruzione dei soli dati mappe

**Esito: PASS**
**Commit verificato:** `2a5fcc0`
**Data verifica:** 6 settembre 2026

### Evidenze

1. `ricarica-mappe.ts --dati <copia>` è stato eseguito due volte su una copia isolata del
   database. Entrambe le esecuzioni producono 334 mappe, 268 spilli e 116 contenuti guida;
   `fuoriDalLivelloMappe` è vuoto e i conteggi finali di tutte le tabelle coincidono.
2. È stato eseguito anche un confronto più severo del rapporto incorporato: le impronte del
   contenuto completo di ogni tabella non appartenente al livello mappe sono identiche prima
   della prima ricarica, dopo la prima e dopo la seconda. Partita, catalogo, Persona,
   confidenti, negozi e contenuti sorgente della guida non cambiano.
3. Un database nuovo, migrato e caricato da zero, converge agli stessi conteggi e allo stesso
   contenuto logico del livello mappe. Le sole quattro differenze fisiche rispetto alla copia
   sono riferimenti `immagine_chiave` preesistenti dell'istanza (`tokyo`, `citta-shibuya`,
   `citta-yongen-jaya`, `citta-mementos`), correttamente conservati sulla copia e assenti su una
   nuova installazione; asset, gerarchia e ogni altro campo coincidono.
4. Entrambi i database terminano con `user_version = 45`, `foreign_key_check` vuoto,
   298 planimetrie native, 73 associazioni `mappa_entita`, 116 righe sia in `dungeon_area` sia
   in `guida_mappa`, e zero mappe con `entita_tipo = 'area'` e `ruolo_immagine = 'nessuna'`.

**Decisione:** Fase 1c approvata. La ricarica è idempotente, confinata al livello autorizzato
e riproducibile da installazione nuova senza dipendere da residui dell'atlante precedente.

## Fase 1d — Indice a schede e presentazione

**Esito: FAIL**
**Commit verificato:** `2a5fcc0`
**Data verifica:** 6 settembre 2026

### Parti conformi

1. L'API espone 334 mappe e 18 radici che l'indice raggruppa correttamente in 13 schede.
2. Il Covo dei Ladri è una sola scheda con 5 versioni e le etichette parlanti attese:
   `settore d'ingresso`, `planimetria completa`, `porzione occidentale`,
   `porzione settentrionale`, `inquadratura orientale`.
3. I conteggi delle schede sommano ricorsivamente l'intero sottoalbero: per esempio Tokyo
   mostra 47 mappe e 81 spilli. Il controllo browser a 390×844 conferma 13 schede e nessun
   overflow orizzontale (`scrollWidth = clientWidth = 390`).

### Rilievi bloccanti

1. **Nell'albero espanso sono visibili 26 etichette tecniche.** Il controllo DOM desktop/mobile
   rileva stringhe quali `risorsa 151/0 livello 0`, `risorsa 153/8 livello 2` e
   `risorsa 190/62 livello 0`. Nel runtime 20 nomi includono inoltre direttamente il suffisso
   tecnico. Questo viola il criterio esplicito «nessuna etichetta tecnica residua».
2. **La presentazione delle versioni non è unificata negli otto punti richiesti.** La funzione
   parlante `src/utils/etichettaVersione.ts` è usata soltanto da `ImmaginiLuogo.tsx`, mentre
   `src/utils/presentazioneMappa.ts` continua a produrre `immagine N` nei selettori usati da
   editor, destinazione e ingresso; breadcrumb e mappa incorporata ricevono ancora una forma
   diversa. Manca quindi la singola funzione condivisa prevista dal piano e lo stesso luogo
   può essere presentato con etichette differenti a seconda della superficie.

### Regressioni generali

- `npm run typecheck`: PASS;
- `npm run lint`: PASS;
- `npm test -- --run`: PASS, 132 file e **534 test su 534**.

**Decisione:** Fase 1d respinta. Per il nuovo riesame devono sparire tutte le 26 etichette
tecniche dal DOM espanso e la stessa etichetta di versione deve provenire da un'unica funzione
condivisa in tutti gli otto punti elencati nel piano. Le Fasi 1a, 1b e 1c restano approvate.

## Fase 1d — Riesame dopo la correzione delle etichette

**Esito: FAIL**
**Commit verificato:** `1e7011f`
**Data verifica:** 6 settembre 2026

### Rilievo chiuso

- Le 26 etichette `risorsa N/N livello N` sono state eliminate. La rigenerazione isolata di
  `atlante-identita.json` è byte-identica al file versionato, SHA-256
  `161AF9FA0D1D2DE4D763C658BED904489543AD01FD40A4203A62508FEA5AB7B7`. Nel browser,
  dopo avere espanso tutte le 13 schede e l'intero albero, il DOM non contiene più alcuna
  occorrenza del modello tecnico; le sostituzioni descrivono tela e ampiezza del disegno.

### Rilievo ancora bloccante

- L'etichetta della versione non è ancora applicata negli otto punti prescritti dal piano.
  `etichettaVersione` alimenta miniature e selettori che passano da `etichettaPlanimetria`, ma
  `MappaPage.tsx` continua a passare al visore `presentaMappa(mappa)`, che usa
  `nomePresentazioneMappa`; lo stesso accade nel selettore a riga 128. `MappaIncorporata.tsx`
  passa anch'esso `presentaMappa(mappa)` e il breadcrumb del `VisoreMappa` stampa quei nomi.
  La prova browser sul Covo dei Ladri mostra infatti miniature «settore d'ingresso»,
  «planimetria completa» ecc., mentre titolo documento, intestazione e breadcrumb restano
  soltanto «Covo dei Ladri». Non provengono quindi tutti dalla singola resa condivisa richiesta.

**Decisione:** Fase 1d ancora respinta. Il rilievo sulle etichette tecniche è chiuso; resta da
uniformare titolo, selettore della pagina, mappa incorporata e breadcrumb del visore alla stessa
funzione di presentazione già usata negli altri punti.

## Fase 2 — Pin di tutti i tipi (2a, 2b, 2c)

**Esito complessivo: FAIL**
**Commit verificati:** `4201e53`, `5b7bcc5`, `1e7011f`
**Data verifica:** 6 settembre 2026

### Fase 2b — Riferimento fra pin nativi e planimetria: PASS

1. La rigenerazione isolata di `riferimento-pin.json` è byte-identica al file versionato:
   SHA-256 `0CB2859AC8457A42A7C3D5BAF4D4A11A4FDF27FB87DF912438300F0F6956F6A4`.
2. Il verificatore dedicato passa su 250 planimetrie con pin: 227 riferimenti condivisi,
   1.361 pin collocabili su 1.429, 7 esclusioni individuali documentate, 23 planimetrie
   respinte e 51 planimetrie senza pin. Le otto correzioni di scala sono limitate ai fattori
   0,5 e 0,25 e migliorano effettivamente l'allineamento rispetto alla scala unitaria.
3. Il controllo indipendente delle maschere alpha conferma che la prova non è vacua: nessuna
   planimetria è interamente opaca e i pin accettati ricadono sul disegno secondo il criterio
   dichiarato. Le 23 esclusioni riportano una motivazione puntuale.

### Merito conforme delle Fasi 2a e 2c

1. Il controllo sulle fonti conferma i 51 tipi urbani e le cinque nuove famiglie ricavate dalle
   procedure native: porta, meccanismo, forziere, forziere raro e seme della bramosia. Le
   dominanze dichiarate sono riscontrabili nelle procedure (`5/6`, `57/58`, `122/122`, `32/33`,
   `21/21`) e le etichette native confermano porte e leve. I restanti 46 tipi non ricevono un
   significato non dimostrato.
2. Il verificatore dedicato ricontrolla 56 tipi determinati e 405 pin nel pacchetto, dei quali
   42 collegati a un luogo. Coordinate, tipo e riferimento geometrico coincidono con le fonti.
3. `build_seed_package.py` rigenera un pacchetto logicamente identico al versionato (differenza
   soltanto CRLF/LF), SHA-256 normalizzato
   `4D0E3A5810E0BAE3B805956BF10EAACBCDCA45FE15E14CD6D374D6AF6B3D7C8A`; il rapporto è
   byte-identico, SHA-256 `5D8EF8E6BBBF1A25F4F7C057EB8980AAB130BD6950D13781072AC4F818973D04`.

### Rilievi bloccanti

1. **324 pin condizionali sono importati come incondizionati.** Il confronto fra
   `mondo_metadati.json`, il riferimento certificato e il pacchetto trova 324 dei 405 pin
   importati con `conditional = true`. Nessuno dei 405 oggetti seed possiede `condizioni`; la
   bandiera è riportata soltanto come frase nella descrizione. Il runtime non interpreta quella
   frase e mostra quindi sempre i 324 pin. Il piano richiede invece una condizione strutturata
   `da-configurare` finché la bandiera non è tradotta, e vieta espressamente di trattarli come
   pin incondizionati.
2. **`semantica-pin.json` non è riproducibile.** Cinque rigenerazioni isolate consecutive
   producono cinque SHA-256 differenti. L'ordine dei pari merito in `procedure` ed
   `etichetteDeiTrigger` dipende dall'iterazione di `set`; una rigenerazione non coincide con il
   file versionato anche se conteggi e decisioni semantiche restano uguali. Il verificatore
   dedicato non rileva questa instabilità.
3. **La contabilità finale non si chiude.** Il rapporto conta 405 pin posati, 923 esclusi per
   significato non dimostrato e 94 per assenza di riferimento condiviso: 1.422 su 1.429. I 7
   pin esclusi individualmente dalle planimetrie condivise restano fuori dal riepilogo, benché
   siano presenti in `riferimento-pin.json`.

### Regressioni generali

- `npm run typecheck`: PASS;
- `npm run lint`: PASS;
- `npm test -- --run`: PASS, 132 file e **534 test su 534**, su copia isolata del commit.

**Decisione:** la Fase 2b resta approvata e le associazioni semantiche dei 56 tipi superano il
controllo di merito. Le Fasi 2a/2c e la Fase 2 complessiva sono respinte finché i pin
condizionali non entrano con una condizione strutturata, l'artefatto semantico non diventa
deterministico e il rapporto non contabilizza esplicitamente tutte le 1.429 occorrenze.

## Fase 1d — Terza verifica della presentazione

**Esito: PASS**
**Commit verificato:** `5f2411a`
**Data verifica:** 6 settembre 2026

### Evidenze

1. `nomePresentazioneMappa` compone ora il nome del luogo con l'etichetta dimostrata della
   versione tramite `nomeConVersione`. Titolo della pagina, breadcrumb del visore, mappa
   incorporata e selettori passano quindi dalla stessa resa; `etichettaPlanimetria` non la
   ricompone più separatamente.
2. La prova browser sul Covo dei Ladri restituisce in modo coerente
   «Covo dei Ladri — settore d'ingresso» nel titolo documento, nell'intestazione, nel percorso
   accessibile della mappa e nella presentazione della versione. L'ordinale resta confinato alle
   sole miniature senza etichetta dimostrata e non viene usato come identità del luogo.
3. Il controllo precedente sull'albero interamente espanso resta valido: nessuna etichetta
   `risorsa N/N livello N` è presente nel DOM.
4. Sul commit isolato: typecheck PASS, lint PASS, 132 file e **535 test su 535** PASS.

**Decisione:** Fase 1d approvata. Entrambi i rilievi originari — etichette tecniche e resa
divergente delle versioni — sono chiusi.

## Fase 2 — Seconda verifica dopo le correzioni

**Esito del riesame: PASS**
**Commit verificato:** `911f241`
**Data verifica:** 6 settembre 2026

### Evidenze

1. I 324 pin nativi condizionali importati hanno ora esattamente una condizione strutturata
   `da-configurare`; ogni nota conserva il numero della bandiera nativa. La costruzione di un
   database isolato dal seed produce 324 `condizioni_json` valorizzati e il verificatore
   dedicato controlla numero e forma delle condizioni.
2. Cinque rigenerazioni isolate consecutive di `semantica-pin.json` producono tutte lo stesso
   SHA-256 `6A7283F5D95F43588858B80E3997AC5F82E5C8C963187283D3360D4AA507A3EA`, identico al file
   versionato. L'ordinamento secondario per nome elimina l'instabilità dei pari merito.
3. Il rapporto rigenerato è byte-identico al versionato, SHA-256
   `4965F580A86AA1093C247C8DD1B783932B3673013CA86E272A04EF52899BAD9F`, e chiude la
   contabilità: 405 posati + 7 esclusi individualmente + 94 senza riferimento condiviso + 923
   senza significato dimostrato = **1.429 pin nativi**.
4. Il pacchetto rigenerato è logicamente identico al versionato dopo normalizzazione degli EOL,
   SHA-256 `48ECCE281CD0CF797CDFF91C0861C85CF0BDC3AC0733F9717A2A482EEF8B0C5F`.
5. Sul commit isolato: typecheck PASS, lint PASS, 132 file e **534 test su 534** PASS.

**Decisione:** i tre rilievi bloccanti del precedente esame sono chiusi. Le parti consegnate
2a/2c sono approvate insieme alla 2b già approvata; la Fase 2 resta dichiaratamente parziale
finché i 46 tipi ancora privi di significato non saranno risolti o esclusi in via definitiva.

## Fase 3d — Accessi dalle altre sezioni

**Esito: FAIL**
**Commit verificato:** `6dafa16` (ricontrollato sullo stato `5f2411a`)
**Data verifica:** 6 settembre 2026

### Parti conformi

1. `attivita` è stato aggiunto a `TIPI_ACCESSO_MONDO` e al registro delle tabelle del resolver;
   il barrel API esporta ora `accessoMondo`.
2. Il componente comune `CollegamentoMappa` è usato nelle pagine di negozi, attività,
   confidenti e dettaglio Palazzo. Il resolver raggiunge correttamente i riferimenti strutturati
   già presenti per negozi, luoghi, articoli e confidenti.
3. Il ricalcolo indipendente sul database in memoria riproduce i conteggi dichiarati per le
   prime 200 righe degli articoli e, sull'inventario completo, trova 833 voci, 633 con accesso e
   501 con pin esatto. La suite completa resta verde: **535 test su 535**.

### Rilievi bloccanti

1. **Manca il collegamento nella pagina Oggetti.** Il piano cita espressamente
   `OggettiPage.tsx`, ma il file non importa né usa `CollegamentoMappa`; gli articoli sono
   risolvibili dal backend ma non hanno l'accesso «dove si trova» nella loro superficie UI.
2. **Le quattro chiavi costruite a mano non sono state sostituite.** Restano
   `dungeon-${chiave}` in `DungeonPage.tsx`, i fallback `citta-${chiave}` in
   `QuartierePage.tsx` e `IngressoQuartiere.tsx`, e la comparazione/costruzione manuale in
   `CittaPage.tsx`. Il punto 3d richiedeva di passare da `getMappaPerEntita` o dal resolver.
3. **L'accesso preciso delle attività è ottenuto con una somiglianza di nome non registrata.**
   `accessoMondoService.ts` cerca `lower(nome) = lower(?)` e poi `LIKE '%nome%'` dentro il
   quartiere, nonostante il contratto della funzione dichiari che risolve soltanto associazioni
   registrate. Questo produce il pin di Freccette/Biliardo per corrispondenza testuale, non per
   un legame strutturato, e può cambiare o creare falsi abbinamenti al variare dei nomi.
4. **La copertura dichiarata non è l'intero inventario.** Il totale 534 tronca gli articoli ai
   «primi 200», mentre nel seed risultano 499 articoli visibili. Il totale effettivamente
   percorso è 833; i conteggi completi sono 633 accessi e 501 pin. La dichiarazione «copertura
   misurata sull'intero inventario» è quindi falsa anche se il campione riportato è
   riproducibile.
5. Il commit non aggiunge test dedicati per i nuovi rami `attivita` e `confidente`, per la
   presenza del collegamento comune nelle pagine, né per l'assenza di associazioni nominali
   spurie. La suite verde non esercita questi nuovi comportamenti.

**Decisione:** Fase 3d respinta. Per il riesame servono il collegamento anche negli Oggetti, la
rimozione di tutte le quattro famiglie di chiavi costruite a mano, associazioni delle attività
strutturate anziché nominali, conteggi sull'inventario completo e test specifici dei nuovi
percorsi.

## Fase 2 — Terza verifica della copertura al 90,8%

**Esito: FAIL**
**Commit verificato:** `5ca6444`
**Data verifica:** 6 settembre 2026

### Evidenze riprodotte

1. Su una copia isolata del commit, la catena completa di generazione e i tre verificatori
   dedicati terminano senza errori. I conteggi dichiarati sono reali: 1.429 pin nativi, 1.297
   posati, 1.099 condizionati, 42 collegati a un luogo e 132 non posati; la contabilità chiude.
2. `semantica-pin.json` contiene 102 tipi: 77 determinati, 2 in stato `ipotesi` e 23 non
   determinati. Le prove dichiarate si ricontano in 51 tipi dal blocco urbano, 6 dal blocco del
   Covo dei Ladri, 5 dalle procedure che accendono la bandiera e 15 dal punto del campo sotto il
   pin; sono inoltre risolti 40 pin individuali.
3. Lo scarto 76 del Covo porta effettivamente i tipi 98–103 sui sei sprite `マイパレス_*`.
   Cinque famiglie hanno anche la conferma nominale indicata (`Maker`, `Sound`, `Image`,
   `Daifugou`, `Award`) e non sono emerse smentite nel campione prodotto.
4. Le 20 proiezioni ereditate da un livello gemello vengono rimisurate sul livello ricevente e
   il verificatore ne ricontrolla quota, scarto e accoppiamenti. I nuovi tipi `scala` e `uscita`
   sono registrati nella palette, nel gruppo Spostamenti e nelle icone del visore; la suite
   esercita anche la loro presenza nell'editor.
5. Sul commit isolato: `npm run typecheck` PASS, `npm run lint` PASS, 132 file e **535 test su
   535** PASS. Due rigenerazioni complete consecutive producono le stesse impronte per
   riferimento, proiezioni, semantica e pacchetto seed.

### Rilievi bloccanti

1. **Le ipotesi vengono importate, contro il contratto della Fase 2a.** Il piano prescrive che
   un `nativeType` non deciso resti non importato. Invece i tipi 43 e 114 restano esplicitamente
   in stato `ipotesi` (53 occorrenze complessive) e **36 loro pin entrano nel pacchetto seed**
   come `meccanismo` o `nota`; la descrizione avverte che non sono certi, ma questo non rende
   certificato il tipo assegnato.
2. **La proiezione non usa l'assegnazione vincolata richiesta dal piano.** `stima` sceglie per
   ciascun pin il punto del campo più vicino in modo indipendente, quindi lo stesso punto può
   essere riutilizzato. Succede in 96 delle 176 mappe certificate: 242 dei 1.178 accoppiamenti
   sono riusi; 97 riusi riguardano pin con coordinate differenti. Il verificatore ricalcola lo
   stesso nearest-neighbour, ma non impone una corrispondenza uno-a-uno e quindi certifica la
   coerenza dell'output con l'algoritmo, non il vincolo previsto.
3. **Manca la convalida incrociata obbligatoria sui 9 campi con fattore già noto.** Né il
   generatore né `verify_map_projection.py` contengono il confronto con i fattori 1,5/23,44 o
   un elenco dei nove casi. Di conseguenza il requisito che la stima li riproduca non è
   verificato.
4. **Sei proiezioni usano un campo non dichiarato dalla mappa.** Il fallback
   `campoAllargato` prova qualunque campo dello stesso maggiore e sceglie quello con scarto
   minimo; include perfino due mappe senza alcun campo dichiarato. Quei campi alimentano poi
   la lettura semantica dei trigger. Non esiste una prova indipendente che il campo scelto
   rappresenti davvero quella planimetria.
5. **L'esclusione promessa per `*_minimap_*` non è applicata.** `famiglia_sotto` non scarta
   quei nomi: 36 accoppiamenti con procedure `TBOX_minimap` vengono classificati come
   `forziere`/`forziere raro`, distribuiti su 11 tipi nativi. Nei tipi oggi determinati per
   dominanza sotto il pin questi casi restano minoritari, ma la prova dichiarata e il codice
   non coincidono e il conteggio non è quello documentato.
6. **La prova “procedura sotto il pin” non è indipendente dalla proiezione che la genera.** La
   trasformazione viene scelta minimizzando la distanza fra gli stessi pin e l'insieme di
   trigger/ingressi; subito dopo, il trigger più vicino viene assunto come prova del significato.
   I riusi, il fallback a campi estranei e l'assenza di convalida sui nove riferimenti impediscono
   di considerare dimostrati i 15 tipi e gli 867 pin che dipendono da questa strada.

**Decisione:** la crescita di copertura, la contabilità, il blocco del Covo, l'eredità fra
livelli e l'integrazione UI dei nuovi tipi sono riprodotte; la Fase 2 complessiva resta respinta.
Per il riesame occorrono: non importare alcuna ipotesi, usare un'assegnazione uno-a-uno,
convalidare esplicitamente i nove campi noti, eliminare o dimostrare `campoAllargato`, applicare
realmente l'esclusione `*_minimap_*` e rendere la prova semantica indipendente dal fitting.

## Fase 3d — Seconda verifica dopo le correzioni

**Esito del riesame: FAIL**
**Commit verificato:** `ed14c40`
**Data verifica:** 6 settembre 2026

### Rilievi chiusi

1. Le quattro costruzioni manuali di chiavi sono state eliminate. `CittaPage` usa
   `mappaChiave` restituita dal backend; `QuartierePage` e `IngressoQuartiere` non inventano più
   il fallback `citta-*`; `DungeonPage` passa dal resolver comune.
2. L'accesso delle attività non usa più uguaglianza o `LIKE` sul nome. Il resolver segue
   esclusivamente `attivita.luogo_chiave`, interpretandola come chiave di un luogo o di un
   quartiere esistente. Il nuovo test inserisce un'esca nominale e prova che non viene scelta.
3. `npm run accesso:copertura`, rieseguito su una copia isolata del database, riproduce l'intero
   inventario: **1.371 voci, 906 con accesso, 498 con pin preciso**. Per tipo: luoghi 61/84,
   negozi 30/47, punti 379/688, confidenti 12/23, articoli 395/499, attività 29/30.
4. Il nuovo percorso dei punti segue il riferimento strutturato `punto_interesse.area_chiave` e
   porta alle planimetrie associate all'area; non usa somiglianze di nome. Porta 379 punti a una
   mappa, deliberatamente senza dichiarare un pin preciso non dimostrato.
5. Sono presenti test dedicati per l'esclusione del matching nominale delle attività e per i
   luoghi attribuiti ai confidenti. Sul commit: typecheck PASS, lint PASS, build PASS, test mirati
   **10/10**, suite completa **537/537**.

### Rilievi ancora bloccanti

1. **La pagina Oggetti resta senza collegamento alla mappa.** `OggettiPage.tsx` non usa
   `CollegamentoMappa`. Il commit stesso dichiara aperto il quinto rilievo; quindi la Fase 3d non
   può ancora essere approvata. Poiché le righe editoriali non hanno una chiave di catalogo, la
   soluzione robusta non è reintrodurre un `LIKE` a runtime: serve un crosswalk versionato che
   assegni una chiave soltanto ai match univoci e verificati, lasciando esplicitamente senza link
   gli altri.
2. **La misura di copertura può nascondere errori runtime.** `copertura-accesso.ts` intercetta
   qualsiasi eccezione del resolver e la aggiunge a `senzaAccesso`, senza contare o mostrare gli
   errori. Un bug SQL o un'eccezione inattesa diventerebbe quindi indistinguibile da una normale
   entità priva di associazione. Il rapporto deve distinguere `senzaAccesso` da `errori` e la
   verifica deve fallire se `errori` non è vuoto.

### Nota sul test dei confidenti

Il test contiene due uscite anticipate (`if (!riga) return`, `if (!chiave) return`) che lo
renderebbero vacuo su una fixture diversa. Sulla fixture attuale il ramo viene esercitato: ci
sono 34 luoghi con `confidenti_json` e le voci sono chiavi stringa. Nel riesame finale è comunque
preferibile sostituire le uscite con asserzioni esplicite sull'esistenza della fixture.

**Decisione:** quattro dei cinque rilievi originari sono chiusi e la nuova copertura è reale.
Fase 3d resta respinta finché il collegamento di Oggetti non è risolto con associazioni
strutturate e lo strumento di copertura non distingue gli errori dalle assenze legittime.

## Fase 3d — Terza verifica del fallback al posto dichiarato

**Esito del riesame: FAIL**
**Commit verificato:** `5e93228`
**Data verifica:** 6 settembre 2026

### Rilievi chiusi

1. `copertura-accesso.ts` separa ora le eccezioni dalle assenze legittime, registra chiave e
   messaggio, stampa gli errori e termina con codice 1 quando ne incontra almeno uno. La misura
   rieseguita su una copia isolata del database termina con **zero errori** e riproduce
   **1.321 accessi su 1.371 voci (96,35%)**, dei quali 498 con pin preciso.
2. Le due uscite anticipate nel test dei confidenti sono state sostituite da asserzioni: il test
   non può più passare senza aver esercitato la fixture attesa.
3. Sul commit verificato: typecheck PASS, lint PASS, build PASS, test mirati **8/8**, suite
   completa **537/537**. Il build mantiene soltanto l'avviso già noto sul chunk principale.

### Nuovo rilievo bloccante sul fallback

Il codice dichiara di allargare al quartiere o al Palazzo soltanto quando le associazioni dirette
non producono una destinazione. L'implementazione però aggiunge `area -> dungeon`,
`negozio -> quartiere` e `luogo -> quartiere` a `riferimenti` **prima** della prima chiamata a
`cerca()`. Il blocco successivo protetto da `if (destinazioni.size === 0)` ripete la stessa
espansione, quando ormai i riferimenti sono già stati aggiunti.

La controprova sull'intero inventario trova **70 entità** che ricevono insieme almeno un pin
preciso e almeno una destinazione generica. Esempi riproducibili:

* `luogo:akihabara/super-baron` -> pin `akihabara-electric-town:265` più mappa generica
  `akihabara`;
* `luogo:kichijoji/jazz-jin` -> pin `kichijoji-quartiere-dello-shopping:305` più mappa generica
  `kichijoji`;
* `negozio:body-chop` -> pin `shibuya-centro-comm-sotterraneo:1008` più mappa generica
  `shibuya`.

Le destinazioni generiche risultano inoltre marcate `entita-mappa`, non `posto-dichiarato`, perché
`ripiego` è ancora `false` durante la prima ricerca. La deduplicazione finale elimina il generico
soltanto quando ha la stessa `mappa` normalizzata del pin; non elimina la seconda meta quando il
pin è su una planimetria figlia e il fallback è sulla mappa d'insieme.

**Correzione richiesta a Claude:** costruire e cercare prima soltanto i riferimenti diretti; se e
solo se `destinazioni.size === 0`, aggiungere in un secondo insieme i riferimenti al posto
dichiarato, attivare `ripiego` e cercare quelli. Aggiungere una regressione con pin preciso su una
planimetria figlia e quartiere su una mappa diversa, verificando una sola destinazione e assenza
di `posto-dichiarato`. Aggiungere anche un caso senza pin che verifichi criterio
`posto-dichiarato`.

### Rilievo originario ancora aperto

`src/pages/OggettiPage.tsx` continua a non importare né usare `CollegamentoMappa`. Il backend
risolve gli articoli, ma la superficie UI richiesta dal piano non espone ancora l'accesso.

**Decisione:** le correzioni alla misura sono approvate e il valore 96,35% è riproducibile, ma
la Fase 3d resta respinta per il fallback eseguito prematuramente e per il collegamento ancora
assente nella pagina Oggetti.

## Fase 2 — Quarta verifica: pin di bordo, osservazioni e collegamenti

**Esito del riesame: FAIL**
**Commit verificato:** `3f1810c` (dichiarazione introdotta in `2ac55ee`, file della Fase 2 invariati)
**Data verifica:** 6 settembre 2026

### Evidenze riprodotte

1. I tre artefatti `pin-di-bordo.json`, `osservazioni-icone-esito.json` e
   `collegamenti-mappe.json` sono stati rigenerati due volte in cartelle isolate: entrambe le
   copie hanno la stessa impronta dei file versionati. Su Windows i due generatori che stampano
   la freccia `→` terminano però con `UnicodeEncodeError` dopo aver scritto il file se non si
   imposta UTF-8; i comandi documentati vanno resi eseguibili così come sono o devono dichiarare
   il requisito `PYTHONUTF8=1`.
2. Le quote laterali si riproducono: tipo 13, 65,2% in alto; tipo 14, 70,4% a destra;
   tipo 15, 75,8% in basso; tipo 16, 79,7% a sinistra. I lati sono distinti e il migliore dei
   tipi interni si ferma al 48,5%.
3. Il vincolo sulle schermate si riproduce: `stanza-sicura` lascia come unico candidato il tipo
   4 su cinque osservazioni; `forziere` lascia il tipo 26 su quattro. Il pin tipo 4 di
   `RMAP_151_7_0` è a `(732, 206)`, nella stanzetta superiore descritta dall'osservazione.
4. I 71 collegamenti sono contabilmente coerenti: 28 da trigger proiettato e 43 da meta unica.
   La ricostruzione indipendente delle assegnazioni finali trova zero collegamenti scelti fra più
   mappe valide. Le 71 chiavi sono uniche e appartengono tutte ai 262 pin candidati; gli altri
   191 non hanno alcuna riga di collegamento.

### Rilievi bloccanti

1. **Uno dei quattro tipi di bordo viola il criterio dichiarato.** `QUOTA_FUORI` vale 0,5, ma
   il tipo 15 ha `quotaFuoriDalTratto = 0,470`. `edge_pins.py` seleziona i candidati usando
   soltanto `quotaLato`; la soglia sul fuori-tratto è scritta nell'artefatto e nella descrizione,
   ma non è applicata. `verify_edge_pins.py` non la controlla. I 262 pin e la copertura 780
   includono quindi 66 pin che non superano il contratto dichiarato.
2. **La controprova indipendente sul tipo 26 è presente nei dati ma non viene verificata.** Il
   tipo 26 ha `script.stato = determinato` e famiglia `R_TBOX|RARE_TBOX` in 32 casi su 33, con
   lo stesso `tipoSpillo` dell'osservazione. Tuttavia `verify_icon_observations.py` stampa
   `0 confermati anche da un'altra strada indipendente`: guarda la `prova` finale di
   `semantica-pin.json`, già sovrascritta da «icone contate», e salta proprio il confronto che
   promette. Il test deve leggere l'evidenza `script` e pretendere almeno la conferma del tipo 26.
3. **Le cinque schermate non sono auditabili dal repository.** Sono versionati i conteggi e le
   note, non i file sorgente né impronte/riferimenti stabili. Si può ricontrollare la soluzione
   combinatoria contro `mondo_metadati.json`, ma non rileggere visivamente le osservazioni da cui
   dipende la deduzione.

### Rilievo di robustezza sui collegamenti

Nello stato corrente nessuno dei 71 collegamenti finali sceglie fra più mappe. Tuttavia il ramo
`trigger proiettato` usa `next(...)` sulla prima destinazione valida senza esigere prima che la
meta sia unica. Oggi un trigger ambiguo viene scavalcato da un trigger più vicino e univoco, ma
una variazione dei dati potrebbe renderlo vincente. Il verificatore deve ricostruire le mete
valide, rifiutare ogni assegnazione ambigua e certificare esplicitamente anche la contabilità
71 collegate / 191 irrisolte.

**Decisione:** il merito dei conteggi delle icone e la contabilità dei collegamenti sono
sostanzialmente riprodotti, ma la Fase 2 resta respinta. Prima della riverifica occorre applicare
e verificare davvero la soglia fuori-tratto, rigenerare a cascata copertura e collegamenti,
rendere effettiva la controprova sul tipo 26, blindare l'unicità delle mete e rendere stabile la
provenienza delle cinque schermate.

## Fase 2 — Quinta verifica dopo le correzioni

**Esito del riesame: FAIL**
**Commit verificato:** `3989bfe`
**Data verifica:** 6 settembre 2026

### Rilievi chiusi

1. La prova dei tipi 13–16 è stata riformulata correttamente sulla dominanza laterale e sul
   contrasto con i tipi interni: 65,2% alto, 70,4% destra, 75,8% basso e 79,7% sinistra, contro
   un massimo interno del 48,5%. La quota fuori dal tratto è ora soltanto descrittiva. La
   controprova binomiale indipendente, corretta prudenzialmente sui 16 tipi e sui quattro lati,
   resta significativa per tutti e quattro i tipi.
2. `verify_icon_observations.py` legge ora l'evidenza grezza degli script: il tipo 26 è
   confermato come `forziere` sia dal conteggio visivo sia dalle procedure `R_TBOX`. Il
   verificatore pretende almeno una conferma indipendente e controlla anche la posizione
   registrata per il tipo 4.
3. `map_links.py` scarta ora le procedure con più mappe valide invece di scegliere la prima.
   Una ricostruzione indipendente dello stato corrente trova 28 assegnazioni da trigger senza
   ambiguità, 43 collegamenti a meta unica e contabilità chiusa: 71 collegati + 191 irrisolti =
   262 candidati.
4. I generatori non usano più la freccia Unicode nell'output e terminano con codice 0 sulla
   console Windows ordinaria. Due rigenerazioni isolate dei quattro artefatti coincidono fra
   loro e con i file versionati. Il pacchetto seed rigenerato coincide byte per byte con quello
   versionato: 298 mappe, 780 pin posati, 637 condizionati e 1429/1429 pin contabilizzati.

### Rilievi ancora bloccanti

1. **Il docstring di `edge_pins.py` contraddice il criterio corretto.** Alle righe 7–8 dichiara
   ancora che i quattro tipi cadono «fuori dal tratto nel 90% dei casi». I valori reali sono
   57,6%, 56,3%, 47,0% e 59,3%. Logica, artefatto e stato sono coerenti con la nuova prova
   laterale, ma questa affermazione residua è falsa e deve essere corretta.
2. **Il verificatore non copre le 28 assegnazioni `trigger proiettato`.**
   `verify_edge_pins.py` ricostruisce le mete soltanto dentro il ramo
   `meta unica della planimetria`. Per le righe da trigger controlla il tipo del pin e l'unicità
   della chiave, ma non ricostruisce procedura vincente, proiezione, soglia dell'8%, distanza,
   mete valide, `arrivo` e `ingresso`. Alterare arbitrariamente un arrivo continuerebbe quindi
   a far passare il controllo, purché il totale resti 71.

**Correzione richiesta a Claude:** correggere il docstring obsoleto e fare sì che il verificatore
ricostruisca l'intero insieme atteso delle 28 assegnazioni da trigger con la stessa informazione
nativa ma con calcolo indipendente, confrontando esattamente partenza, indice del pin, arrivo,
ingresso, distanza e modo. Devono essere verificati anche la soglia dell'8%, il candidato più
vicino, la sostituzione del precedente e i modi ammessi. L'unicità va pretesa sulla destinazione
completa; se più ingressi della stessa mappa sono ammessi, la scelta deve essere motivata e
verificata esplicitamente.

**Decisione:** le quattro correzioni producono dati correnti corretti e riproducibili, ma il gate
resta **FAIL** finché il controllo automatico non è capace di rilevare una regressione nelle 28
assegnazioni da trigger e la documentazione nel codice non descrive fedelmente la prova adottata.

## Fase 2 — Sesta verifica dopo la ricostruzione dei collegamenti

**Esito del riesame: FAIL**
**Commit verificato:** `68b7c5a`
**Data verifica:** 6 settembre 2026

### I due rilievi precedenti sono chiusi

1. Il docstring di `edge_pins.py` descrive ora la prova effettiva: dominanza laterale del 65,2%,
   70,4%, 75,8% e 79,7% contro il massimo interno del 48,5%. Le quote oltre il perimetro del
   57,6%, 56,3%, 47,0% e 59,3% sono presentate correttamente come dati descrittivi.
2. Il verificatore ricostruisce le 28 assegnazioni `trigger proiettato`: riproietta i trigger,
   calcola l'argmin fra tutti i pin, applica la soglia dell'8%, risolve le contese per distanza e
   confronta partenza, indice del pin, arrivo, ingresso, distanza, modo e punto d'arrivo. Insieme
   ai 43 casi a meta unica ricostruisce esattamente le 71 righe; 71 + 191 = 262.
3. In una copia temporanea l'artefatto rigenerato è byte-identico al versionato, 34.432 byte. Le
   mutazioni indipendenti di arrivo, ingresso, distanza, modo, punto d'arrivo e contabilità sono
   state tutte rifiutate con codice di uscita 1.

### Regressione dati bloccante introdotta dal commit

`data/atlas/extracted/mondo_connessioni_evidenze.json` è stato rigenerato senza la directory
corretta degli script e ha perso le evidenze già certificate. Il confronto con il genitore del
commit misura:

| dato | prima | dopo |
|---|---:|---:|
| campi | 209 | 209 |
| trigger | 4.525 | 4.525 |
| script | **192** | **0** |
| procedure | **15.734** | **0** |
| chiamate `CALL_FIELD` | **2.514** | **0** |
| trigger con procedura risolta | **4.495** | **0** |

Il diff dell'artefatto è di 10.007 righe aggiunte e 148.576 eliminate. Nel contempo
`verifica_connessioni_evidenze.json` è rimasto stantio e dichiara ancora `PASS`, 192 script e
2.514 chiamate: i due artefatti versionati si contraddicono.

La causa è riproducibile nel comando documentato:

```bash
cd tools/p5r-map-export && for v in verify_*.py; do python "$v" ../../data/atlas/extracted ../..; done
```

`verify_world_connections.py` interpreta il secondo argomento come cartella contenente i file
`.flow`; `../..` non è quella cartella. Il generatore ricrea quindi l'artefatto con zero script e,
una volta che quella versione impoverita è diventata la baseline, il controllo di determinismo
può risultare verde. Mancano inoltre asserzioni che impediscano la caduta a zero della copertura.

### Correzioni richieste a Claude

1. Ripristinare `mondo_connessioni_evidenze.json` completo da fonte certificata, con almeno i
   conteggi precedenti: 192 script, 15.734 procedure, 2.514 chiamate e 4.495 trigger risolti.
2. Rigenerare coerentemente `verifica_connessioni_evidenze.json`, così che rapporto e artefatto
   descrivano lo stesso stato.
3. Correggere il comando cumulativo affinché passi la vera sorgente degli script; il verificatore
   deve operare su una copia temporanea o comunque non distruggere l'artefatto versionato quando
   gli input sono incompleti.
4. Aggiungere asserzioni sui conteggi attesi o su minimi non nulli prima di qualunque scrittura.
5. Come miglioramento non bloccante, duplicare nel verificatore il calcolo del punto d'arrivo:
   oggi la selezione dei trigger è indipendente, ma `map_links.punto_di_arrivo` è riusato e un
   errore sistematico in quella funzione passerebbe sia nel produttore sia nel controllo.

**Decisione:** la ricostruzione dei collegamenti supera il riesame, ma la Fase 2 resta **FAIL**
perché il commit che la dichiara pronta ha cancellato evidenze native già certificate e ha lasciato
un rapporto di verifica incoerente. Nessun gate può passare introducendo una regressione di dati.

## Fase 3d — Quarta verifica degli accessi dopo il censimento editoriale

**Esito del riesame: FAIL**
**Commit verificato:** `ed4ccca`
**Data verifica:** 6 settembre 2026

### Parti conformi

1. Su backup SQLite isolato, `genera-crosswalk-oggetti.ts` produce un file byte-identico a quello
   versionato: 355 voci della guida, 575 articoli, 121 abbinamenti — 118 per nome dell'articolo e
   3 per trascrizione — e 234 esclusi. Un controllo indipendente trova zero duplicati, zero negozi
   inesistenti e zero corrispondenze non univoche.
2. La copertura dell'inventario corrente è 1.406 accessi su 1.460 voci, 503 con punto preciso e
   zero errori del risolutore. Il controllo su tutte le 1.460 entità trova zero casi con un pin
   preciso affiancato da una meta generica e zero pin accompagnati dal criterio
   `posto-dichiarato`.
3. La controprova negativa è efficace: su una copia in cui la tabella `mappa` è stata rinominata,
   lo strumento registra 1.460 errori distinti, dichiara la misura non valida ed esce con codice 1.
4. Il validatore indipendente riproduce 20 test mirati su 20, inclusi i fallback del risolutore e
   la superficie di accesso.

### Rilievo bloccante nella UI Oggetti

`OggettiPage.tsx` mostra il comando «Sulla mappa», ma `CollegamentoMappa` usa
`schedaAccessoMondo()`. Per `articolo` quella funzione produce `/guida/negozi` e per `negozio`
produce `/guida/negozi/<chiave>`: non invoca la rotta del risolutore
`/guida/mondo/<tipo>/<chiave>` e quindi il comando non conduce alla mappa.

Manca un test specifico che eserciti il collegamento dalla pagina Oggetti e controlli anche una
chiave articolo contenente `/`. Inoltre quattro delle 121 voci collegate dal crosswalk non hanno
oggi alcuna destinazione risolta — `Catena di perline`, `Soma`, `Homunculus` e
`Tessera puntate alte` — e la UI deve evitare un invito falso oppure dichiarare esplicitamente che
la posizione non è disponibile.

### Dichiarazione stantia e riproducibilità

La quarta dichiarazione in `ATLANTE-STATO.md` precede l'ampliamento del censimento e non descrive
più lo stato del commit: 1.321/1.371 deve diventare 1.406/1.460; 104 abbinamenti e 249 esclusi
devono diventare 121 e 234; anche i conti per articoli, negozi e la vecchia tabella 378/534 vanno
aggiornati.

Il campo `generato` del crosswalk usa la data corrente: oggi il file è byte-identico, ma una
rigenerazione in un giorno diverso cambia l'artefatto senza variazioni delle fonti. Occorre rendere
il campo stabile oppure dichiarare e verificare soltanto la riproducibilità semantica.

**Decisione:** il resolver, il ripiego e il crosswalk superano il controllo di merito, ma la Fase
3d resta **FAIL** finché «Sulla mappa» non usa davvero il resolver, i quattro casi senza meta non
sono gestiti, manca la regressione UI e la dichiarazione non viene aggiornata.

## Fase 2 — Settima verifica: tabella nativa, copertura e ripristino delle evidenze

**Esito del riesame: FAIL**
**Commit verificato:** `a566073`
**Data verifica:** 6 settembre 2026

### Parti conformi

1. La tabella nativa `tipo → partId → sprite` supera il ricontrollo sull'eseguibile: 102 tipi,
   95 con sorgente grafica, 7 dichiarati senza sorgente e 59/59 ancore corrette.
2. La semantica chiude su 90 tipi determinati e 12 `da-verificare`; 1.142 occorrenze determinate
   più 287 aperte fanno tutte le 1.429 native. Nessun tipo aperto riceve un significato specifico,
   salvo i pin riconosciuti individualmente dalla propria bandiera.
3. I 1.339 pin importati sono ricostruiti per tipo e coordinate; 1.130 hanno una condizione
   strutturata. Il riferimento planimetrico ricontrolla 250 mappe con pin, 217 condivise, 1.372
   pin collocabili e 14 esclusioni puntuali.
4. I 71 collegamenti superano la ricostruzione indipendente completa: 43 da meta unica e 28 da
   trigger, con partenza, indice, arrivo, ingresso, distanza, modalità e punto d'arrivo coincidenti.
5. Il corpus mondiale è stato ripristinato: 209 campi, 192 script, 15.734 procedure, 2.514
   `CALL_FIELD` e 4.495 trigger risolti. La rigenerazione isolata è byte-identica; sorgenti `.flow`
   o `.BF` errate falliscono lasciando invariato l'artefatto ufficiale.
6. Sul commit: verificatori pin e collegamenti PASS, typecheck PASS, lint PASS e 132 file con
   **539 test su 539** PASS.

### Rilievi bloccanti

1. `verifica_connessioni_evidenze.json` e il suo produttore non espongono ancora
   `procedures = 15734` e `triggerResolved = 4495`. I valori sono controllati in esecuzione ma
   non restano attestati nel rapporto versionato.
2. La causa dichiarata per i 90 pin non posati è falsa. La contabilità reale è
   `1339 posati + 14 esclusi puntualmente + 43 senza riferimento condiviso + 33 assorbiti dalle
   tre copie = 1429`. Per i 33 serve un mapping versionato uno-a-uno verso la canonica, con mappa,
   indice, tipo nativo, coordinate, flag, resa finale e tolleranza esplicita; non vanno creati
   duplicati sovrapposti.
3. `ATLANTE-STATO.md` conserva copertura, conteggi e dichiarazioni superati, compresa l'attribuzione
   dei 90 casi al riferimento mancante. Anche il documento di collaborazione descrive come aperti
   due difetti del verificatore mondiale ormai corretti: lo stato corrente va separato chiaramente
   dalla cronologia.
4. Le evidenze complete dei tipi `da-verificare` esistono in `semantica-pin.json`, ma il pacchetto
   ne trasferisce soltanto una selezione testuale. Non conserva e non espone stabilmente `partId`,
   indice sprite, PNG o motivo dell'assenza dello sprite, e sceglie alternativamente alcune
   famiglie di etichette. Eliminando dalle descrizioni le evidenze dei 280 pin aperti, il
   verificatore continua a passare. Il seed/DTO/UI deve conservare le evidenze complete e una
   controprova negativa deve fallire quando vengono rimosse o alterate.

**Decisione:** tabella nativa, semantica, posizionamento, condizioni, collegamenti e corpus
superano il controllo di merito, ma la Fase 2 resta **FAIL** finché rapporto, copie assorbite,
documentazione ed evidenze importate non sono corretti e sottoposti a un nuovo riesame stabile.

## Fase 3d — Quinta verifica: accesso reale dalla superficie Oggetti

**Esito del riesame: FAIL**
**Commit verificato:** `8448c87`
**Data verifica:** 6 settembre 2026

### Parti conformi

1. «Sulla mappa» usa la rotta reale `/guida/mondo/<tipo>/<chiave>` e non torna più alle schede
   editoriali.
2. Le chiavi contenenti `/` vengono codificate come un singolo segmento e ricostruite
   correttamente lungo client, router e API.
3. `Catena di perline`, `Soma`, `Homunculus` e `Tessera puntate alte` non ricevono mete inventate:
   la pagina distingue gli acquisti di Palazzo e online e comunica che la posizione non è
   associata.
4. Due rigenerazioni indipendenti del crosswalk sono byte-identiche al file versionato, con SHA-256
   `849FE939CB7E7A5288B2F75092F2240879DE09961686FA0E587465322CBF1F2F`.
5. La misura indipendente ricostruisce 1.460 entità, 1.406 accessi, 503 punti precisi e zero errori;
   la dichiarazione corrente riporta i conteggi aggiornati.
6. Sul commit: typecheck, lint e build PASS; 133 file e 542 test PASS; 9 test mirati PASS.

### Rilievo bloccante

Il test aggiunto monta `CollegamentoMappa` isolatamente dentro una rotta chiamata
`/guida/oggetti`, ma non monta la vera `OggettiPage`. Il test dell'endpoint controlla contenuti e
conteggi generali, ma non verifica che il crosswalk arricchisca la risposta con le chiavi
`articolo` o `negozi`. Potrebbero quindi rompersi il caricamento del crosswalk, l'associazione alla
riga o il rendering del comando nella tabella senza far fallire alcun test.

La chiusura richiede una regressione sulla vera `OggettiPage` con una chiave articolo contenente
`/`, oppure la combinazione equivalente di un test API sull'iniezione delle chiavi esatte e un
test della tabella reale. La prova deve includere anche almeno una delle quattro voci senza meta.

**Decisione:** l'implementazione supera il controllo di merito, ma la Fase 3d resta **FAIL** fino
alla prova automatica della superficie reale Oggetti e a un nuovo riesame su commit stabile.

## Fase 2 — Ottava verifica: copie, prove native e contratto di visibilità

**Esito del riesame: FAIL**  
**Commit verificato:** `7d71dae3f86e2e9463755409e4873b8bdb3bfa61`  
**Data verifica:** 6 settembre 2026

Il `galaxy-task-validator` ha isolato lo SHA con `git archive`; il test Fase 3d successivo e le
modifiche concorrenti del working tree non fanno parte del giudizio.

### Parti conformi

1. La contabilità chiude: `1339 posati + 33 assorbiti + 14 esclusi puntualmente + 43 senza
   riferimento = 1429` pin nativi.
2. Le copie comprendono 31 equivalenze e 2 discordanze 17/26. La scelta canonica è corroborata
   dalle procedure `D01_151_02_R_TBOX_minimap_01` e `D04_155_04_TBOX_minimap_09`, mentre nei due
   campi discordanti non risulta un setter equivalente.
3. Happy path: verificatori principali verdi, typecheck e lint PASS, **133 file / 542 test PASS**,
   build Vite di produzione PASS con il solo warning preesistente sulla dimensione del chunk.

### Rilievi bloccanti

1. **Contratto di visibilità violato.** Lo SHA contiene 1.130 condizioni `da-configurare`, non
   324 come dichiara lo stato. Almeno 898 riguardano elementi fisici stabili: passaggi, porte,
   forzieri, stanze sicure, scale, forzieri rari, semi, uscite, timbri e tesori. La flag nativa
   viene confusa con la presenza temporale. Per decisione esplicita dell'utente questi pin devono
   essere sempre visibili; soltanto data, fascia, meteo o altra condizione di presenza reale può
   nascondere un'entità. Prerequisiti, apertura, raccolta e progressione richiedono un canale
   separato. Servono prove con porta/forziere sempre visibili e un'entità temporanea nascosta
   soltanto nel momento scorretto.
2. **Verificatore copie non indipendente e permeabile.** Importa dal produttore coppie, conversione
   del codice e `TOLLERANZA=8`, benché lo scarto osservato massimo sia 3. Mutazioni isolate a
   `xCanonica`, `yCanonica`, `tipoNativoCanonica`, `condizionale`, `resa`, `resaCanonica`, tre
   campi di riepilogo e tolleranza dichiarata terminano erroneamente con codice 0. Le prove
   procedurali dei due casi 17/26 non sono conservate né ricontrollate.
3. **Ciclo `nativo_json` incompleto.** Inserimento iniziale e API passano, ma dopo migrazione di un
   database pre-046 il reseed conserva l'ID lasciando `nativo_json=NULL`. `esportaMappe()` omette
   inoltre `nativo`, quindi export/import perde le prove. Occorrono backfill senza perdita di ID o
   dipendenze, export completo, round-trip esatto e controprove sui campi probatori.
4. **Determinismo cross-platform assente.** L'artefatto versionato è CRLF; il produttore usa
   `Path.write_text()` senza newline canonica e su Linux produrrebbe LF. JSON semanticamente
   identici hanno quindi byte e SHA differenti. Va imposta una terminazione stabile e provato il
   comportamento Windows/Linux.
5. **`--artefatti` non isola la radice selezionata.** Un percorso relativo valido viene risolto dal
   `cwd` del subprocess; `.flow` e `.BF` restano derivati dalla radice globale. Una fixture isolata
   con scripts vuoti supera indebitamente il controllo leggendo le sorgenti del repository
   principale. Tutti gli input devono derivare dalla radice risolta rispetto al chiamante.
6. **Documentazione incoerente.** Restano insieme intestazioni e conteggi storici incompatibili:
   54,6%, 227/1361/7, 324 condizioni contro le 1.130 reali e 539 test contro 542. Lo stato deve
   distinguere chiaramente cronologia, snapshot giudicato e candidato successivo.

### Pre-audit del lavoro successivo, fuori dallo SHA

Il working tree di Claude riduce le condizioni da 1.130 a 55 attraverso `cancelli-pin.json`, ma
sono ancora tutte condizioni di progressione/interazione: 23 porte, 16 forzieri normali/rari, 6
semi, 3 stanze sicure, 1 scala e 6 marker. È un miglioramento quantitativo, non la chiusura del
vincolo: anche questi 55 devono restare visibili e i loro prerequisiti non devono alimentare il
filtro di presenza.

**Decisione:** Fase 2 **FAIL**. Serve un nuovo commit stabile e pubblicato che chiuda tutti e sei
i blocker; fino ad allora non si procede al gate formale della fase successiva e la PR cumulativa
non può essere fusa.

## Fase 2 — Riverifica ristretta del contratto di visibilità

**Esito del rilievo 1: FAIL**  
**Commit isolato:** `b223a8c66ffd7ab5dad39b6b9e4f913dc964d9ae`  
**Validatore:** `galaxy-task-validator`, sola lettura

Il nuovo seed corregge la parte sostanziale: contiene 1.339 pin nativi e **zero condizioni di
visibilità**. `cancelli-pin.json` censisce 75 pin con prerequisiti, 55 dei quali hanno una resa
leggibile conservata in `nativo.cancelli`, `nativo.sbloccoLeggibile` e nella descrizione. La
rigenerazione è semanticamente identica, l'artefatto dei cancelli è byte-identico, il verificatore
respinge la reintroduzione di una condizione su porta/forziere e la suite esatta chiude con 134
file e 547 test PASS. Data, fascia e meteo sono valutati correttamente sui casi temporanei già
coperti.

### Rilievi bloccanti del lotto

1. **Il runtime non garantisce l'invariante.** API ed editor accettano ancora `condizioni` su
   `porta`, `forziere`, `scala` e `passaggio`; una condizione non soddisfatta produce
   `disponibilita=bloccato` e il visore nasconde il pin. Il seed corrente è corretto, ma una
   modifica ordinaria può violare di nuovo il contratto.
2. **Il canale separato dei prerequisiti non è verificato.** Eliminare da una fixture
   `nativo.cancelli` e `nativo.sbloccoLeggibile`, oppure eliminare una riga di
   `cancelli-pin.json`, lascia `verify_pin_semantics.py` verde. Il file viene caricato, ma il
   confronto è irraggiungibile dopo `condizionali = set()`.
3. **Manca la regressione specifica richiesta.** Le prove esistenti mostrano che un'entità
   sintetica può sparire per data/meteo/fascia, ma non che una porta resti nel DOM prima e dopo la
   progressione e che un forziere resti visibile finché non viene marcato raccolto. Il forziere
   può poi essere nascosto dal filtro volontario dei raccolti, non da una flag o da un prerequisito.
4. **Documentazione ancora contraddittoria.** Il docstring di `verify_pin_semantics.py` prescrive
   ancora `da-configurare` sui pin condizionali; `ATLANTE-STATO.md` conserva la dichiarazione dei
   324 pin condizionati. Entrambe descrivono il contratto ritirato.

### Criterio di chiusura

Separare nel modello runtime presenza, prerequisiti/stato e raccolta; soltanto la presenza
alimenta il filtro temporale. Impedire via API/editor che apertura o progressione nascondano gli
elementi strutturali fissi; conservare per forzieri e collezionabili il distinto filtro volontario
che li può nascondere dopo che il giocatore li marca raccolti;
ricostruire e confrontare indipendentemente l'intera catena
`cancelli-pin.json → nativo → descrizione`; aggiungere le controprove porta sempre visibile,
forziere visibile prima e nascondibile dopo la raccolta, e un caso
editoriale temporaneo nei due stati.

Gli altri cinque blocker della verifica precedente sono fuori dallo scope di questo commit e
restano invariati. La Fase 2 complessiva e la PR cumulativa rimangono **FAIL/non fondibili**.

## Fase 2 — Seconda riverifica ristretta della visibilità runtime

**Esito del rilievo 1: FAIL**  
**Commit isolato:** `3a9729339da8cc419bf7d5c137ae09cee312dc5a`  
**Validatore:** `galaxy-task-validator`, sola lettura

### Parti conformi

* I 1.339 pin nativi hanno zero condizioni di visibilità.
* Un prerequisito rosso di tipo `palazzo` produce `ignoto`, non `bloccato`, e il pin resta
  visibile.
* Caso reale Shinjuku via API: il giorno `04-11` i cinque luoghi sono bloccati; il `06-18` sono
  disponibili. I sette passaggi di Tokyo verso quartieri datati rispettano ciascuno la propria
  data.
* Il canale `raccolto` è distinto: il DOM mostra il consumabile prima della raccolta, lo nasconde
  dopo e lo ripristina con «Mostra anche i raccolti».
* Typecheck, lint e suite completa: **135 file / 551 test PASS**.

### Blocker residui

1. **I consumabili nativi non usano realmente `raccolto`.** Nel seed 128 forzieri, 35 forzieri
   rari, 26 semi di bramosia, 6 tesori e 4 timbri — **199 elementi** — hanno tutti
   `collezionabile=false`. Non possono quindi essere marcati né nascosti dal filtro sui dati reali.
2. **Gli strutturali restano nascondibili via API/editor.** Un `passaggio` nativo accetta via
   `PUT` la condizione `quartiere: shinjuku`, restituisce HTTP 200 e l'11 aprile diventa
   `bloccato`; il visore lo nasconde.
3. **I gruppi logici perdono la natura di presenza.** Una presenza rossa racchiusa in `tutte`
   produce `ignoto`, perché `nascondeIlPin()` guarda soltanto il tipo esterno `gruppo`; anche
   `non` richiede una semantica ricorsiva esplicita.
4. **Il mutation gate dei cancelli resta permeabile.** Eliminando da una fixture i campi
   `nativo.cancelli`/`nativo.sbloccoLeggibile` e la corrispondente riga di `cancelli-pin.json`, il
   verificatore termina ancora con codice 0.
5. **I nuovi test controllano soprattutto il JSON.** Mancano prove dirette di
   `valutaRequisitiSpillo`, gruppi, prerequisito rosso ma visibile, strutturale protetto e dati
   reali nei due stati API/DOM.
6. Sullo SHA giudicato `finestre-dungeon.json` non è ancora referenziato dal codice e non governa
   la presenza dei Palazzi.

### Criterio di chiusura aggiornato

Rendere collezionabili i 199 consumabili appropriati e provarne il ciclo reale; impedire o
neutralizzare condizioni di assenza sugli strutturali non consumabili; propagare correttamente la
presenza dentro i gruppi logici; aggiungere test API e DOM nei due stati; rendere il verificatore
sensibile a rimozione o alterazione del canale dei cancelli.

La correzione successiva deve inoltre evitare di ereditare condizioni da un negozio al pin
generico del luogo condiviso, come documentato nel pre-audit Codex: la presenza va collegata
all'entità esatta. La Fase 2 resta **FAIL**.

## Fase 2 — Riverifica della presenza ereditata dalle entità

**Esito: FAIL**  
**Commit isolato:** `bb34646042ac24647a2a691faa40493c842101ac`  
**Validatore:** `galaxy-task-validator`, sola lettura

1. Le condizioni negozio non raggiungono l'entità esatta. `negozio.luogo_chiave` contiene il
   quartiere, mentre `marcatore_luogo.luogo_chiave` usa `<quartiere>/<luogo>`: intersezioni reali
   **0**. Su 57 negozi con luogo e 32 condizioni non vuote nessuna viene trasferita. Akindo,
   previsto dal 2 settembre, risulta disponibile il 31 agosto e il 1º settembre. La `Map` resta
   inoltre last-write-wins: aggiungere per ultimo un negozio fittizio può cambiare arbitrariamente
   la condizione del pin generico.
2. Le 30 attività, 22 delle quali con fascia giorno/sera, non vengono lette; i pin con riferimento
   `attivita` sono zero.
3. Le dieci finestre dungeon vengono caricate ma applicate a zero pin: le radici dungeon non hanno
   genitore e il ramo implementato controlla soltanto le mappe figlie.

Le condizioni direttamente presenti sui luoghi funzionano via API, ma non chiudono i tre canali
mancanti. Typecheck, lint, 5 test mirati e la suite **135 file / 551 test** sono verdi ma
insufficienti.

## Fase 2 — Riverifica raccolti e gate dei prerequisiti

**Esito complessivo: FAIL — PASS sul solo canale raccolti**  
**Commit isolato:** `6586b46680811ca5e1bfa428c85394430f46557c`  
**Validatore:** `galaxy-task-validator`, sola lettura

### Parte approvata

I dati reali contengono 199 pin collezionabili: 128 forzieri, 35 forzieri rari, 26 semi della
bramosia, 6 tesori del Palazzo e 4 timbri. L'API reale su un timbro conserva il ciclo
`false → true → false` e lo stato resta indipendente fra due partite. Il parser corrente legge
tutti i 37 tipi del registro. Questa parte realizza correttamente la precisazione dell'utente sui
consumabili.

### Blocker residui

1. La mutazione combinata resta invisibile: eliminando dalla stessa occorrenza la riga di
   `cancelli-pin.json`, `nativo.cancelli`, `nativo.sbloccoLeggibile` e la frase descrittiva,
   `verify_pin_semantics.py` termina con exit 0. Manca la ricostruzione dalle sorgenti native.
2. La protezione dei collezionabili non è completa: trasformare un timbro reale da
   `collezionabile=true` a `false` lascia verdi sia il verificatore Python sia gli 8 test mirati.
   Il test copre solo `forziere`.
3. Il parser del registro accetta qualunque insieme non vuoto e usa `get(..., false)`: una singola
   definizione non riconosciuta diventerebbe silenziosamente non collezionabile. Deve pretendere
   uguaglianza completa con `TIPI_SPILLO` e il verificatore deve confrontare ogni pin col registro.
4. La rigenerazione Windows è semanticamente identica ma non byte-identica per CRLF/LF, confermando
   il blocker cross-platform già aperto.

Baseline: verificatore PASS, 28 test mirati PASS, suite **135 file / 555 test**, typecheck e lint
PASS. I gate verdi non coprono le mutazioni sopra; la Fase 2 resta **FAIL**.

## Fase 2 — Terza riverifica ristretta della visibilità runtime

**Esito del rilievo 1: FAIL**
**Commit isolato:** `2ebaf1af5ea6883c62aee70882020f6b44809d3b`
**Validatore:** `galaxy-task-validator`, sola lettura

### Parti conformi

1. Una porta nativa reale resta visibile anche se riceve accidentalmente una condizione di
   presenza.
2. Una presenza semplice e un gruppo composto soltanto da condizioni di presenza vengono
   bloccati correttamente quando la presenza manca.
3. Doti, articoli e progressione non nascondono direttamente il pin.
4. Il canale `raccolto` non è regredito: i dati conservano 199 consumabili — 128 forzieri,
   35 forzieri rari, 26 semi della bramosia, 6 tesori e 4 timbri — e la transizione API reale
   `raccolto=false → true` riesce. Il filtro DOM resta separato dalle condizioni.
5. Sullo snapshot isolato: 46 test mirati PASS, suite **135 file / 558 test PASS**, typecheck e
   lint PASS.

### Rilievi bloccanti

1. **I gruppi misti non proiettano la presenza.** `nascondeIlPinCondizione()` applica `every()`
   all'albero completo. Per `tutte(fascia=sera, dote=3)` il risultato corrente è `ignoto` e
   visibile sia di giorno con dote 1 sia di giorno con dote 3; la sera resta visibile. Il
   comportamento richiesto è invece nascosto in entrambi gli stati diurni e visibile in entrambi
   gli stati serali. Il test aggiunto sancisce esplicitamente l'esito errato con
   `not.toBe('bloccato')`.
2. **La protezione dei pin nativi è indiscriminata.** Convertire ogni `bloccato` in `ignoto`
   quando esiste `nativo_json` protegge porte e strutturali, ma anche negozi ed entità temporanee.
   Su un pin nativo reale di Akindo con presenza `fascia=sera`, di giorno l'API restituisce
   `ignoto`; poiché il frontend nasconde soltanto `bloccato`, il negozio resta visibile quando è
   assente. La provenienza nativa non equivale alla categoria «strutturale sempre visibile».

Il commit non modifica e quindi non chiude gli altri blocker della Fase 2: associazione esatta
della presenza di negozi, attività e finestre dungeon; mutation coverage del registro dei 199
collezionabili; mutazione combinata dell'autorità cancelli; determinismo byte-identico
cross-platform.

### Criterio di chiusura

Proiettare ricorsivamente il solo sottoalbero di presenza preservando la logica dei gruppi;
sostituire il controllo generico `nativo_json` con una classificazione semantica che protegga
strutturali e consumabili ma non le entità temporanee; provare la matrice completa
giorno/sera × dote sufficiente/insufficiente; coprire via API e DOM almeno una porta, un
consumabile raccolto e un'entità nativa urbana realmente assente. La Fase 2 resta **FAIL**.

## Fase 2 — Riverifica di join, cancelli, collezionabili e determinismo

**Esito complessivo: FAIL — PASS sul registro dei collezionabili**
**Commit isolato:** `07d2d364aada145b006c4b1c31ff1dca82c68fa4`
**Validatore:** `galaxy-task-validator`, sola lettura

### Parti conformi

1. Il join `negozio.chiave = luogo.negozio` è uno-a-uno sui dati reali: 37 righe, 37 luoghi,
   37 negozi e zero duplicati. Su un database fresco Akindo riceve quartiere, fascia e data
   `09-02` corretti.
2. Il registro dei collezionabili è ora completo: 37 tipi letti su 37, 10 dichiarati
   collezionabili e 199 occorrenze reali nel pacchetto. Mutare da `true` a `false` un pin di
   ciascuna delle cinque classi presenti — forziere, forziere raro, seme, tesoro del Palazzo e
   timbro — produce sempre exit 1 con errore puntuale.
3. I nove artefatti migrati a `scrittura.py` hanno LF canonico e newline finale.
4. Test mirati 13/13, typecheck e lint PASS sullo snapshot isolato.

### Rilievi bloccanti

1. **Il join corretto non effettua il backfill.** Su una copia del database popolato, dopo aver
   azzerato `condizioni_json` del pin seed Akindo, `sincronizzaMappe()` restituisce zero modifiche
   e lascia il valore nullo. Il controllo di esistenza precede ancora il calcolo e l'applicazione
   della presenza.
2. **Il verificatore dei cancelli condivide il produttore.** Importa `cancelli_pin` e chiama
   direttamente `calcola()`. Una mutazione applicata allo stesso calcolatore, all'artefatto e al
   seed lascia il verificatore verde: manca un algoritmo od oracolo indipendente.
3. **Il determinismo non è end-to-end.** `world_connections.py`, `world_metadata.py` e
   `pin_reference.py` usano ancora `Path.write_text()`. Su Windows producono rispettivamente
   341.783, 24.681 e 9.262 CRLF e nessuna newline finale; gli equivalenti LF hanno hash diversi.
   La catena resta quindi dipendente dalla piattaforma.

La chiusura richiede un backfill non distruttivo dei pin seed esistenti che preservi i dati
manuali; una ricostruzione dei cancelli separata dal produttore; scrittura canonica nei tre
produttori sorgente e controprova Windows/Linux byte-identica. La Fase 2 resta **FAIL**.

## Fase 2 — Quarta riverifica ristretta della visibilità runtime

**Esito: FAIL — PASS sulla proiezione dei gruppi misti**
**Commit isolato:** `1dee8f25c27ef8d6fd44b6c5eee3d411bcd8bf00`
**Validatore:** `galaxy-task-validator`, sola lettura

### Parti conformi

1. La matrice `tutte(fascia=sera, prerequisito)` è corretta: entrambi gli stati diurni sono
   `bloccato`; la sera il pin è visibile sia col prerequisito insufficiente (`ignoto`) sia con
   quello soddisfatto (`disponibile`).
2. Una porta nativa con presenza rossa resta visibile.
3. Un forziere reale resta collezionabile e il DTO restituisce `raccolto=true`.
4. Dopo l'invocazione esplicita della riconciliazione, Akindo rispetta data e fascia.

### Rilievi bloccanti

1. **Il percorso produttivo ordinario non applica la presenza.** Dopo `caricaSeed`, il pin nativo
   reale Akindo conserva `condizioni_json=NULL` ed è disponibile già l'11 aprile. Diventa corretto
   soltanto dopo una chiamata manuale ad `applicaPresenzaAiLuoghi`; il test effettua proprio tale
   chiamata e non prova l'avvio o il reseed normali.
2. **La riconciliazione è distruttiva.** Un prerequisito manuale `articolo=grimaldello` viene
   sostituito integralmente da quartiere, fascia e data.
3. **La presenza derivata obsoleta non viene rimossa.** Se la fonte di Big Bang Burger perde la
   data `04-18`, la vecchia condizione resta sul pin perché il caso senza nuova presenza esegue
   `continue`.
4. **`nota` non è una prova di struttura.** Dei 287 pin nativi classificati `nota`, 280 sono
   esplicitamente `daVerificare`; immunizzarli da qualsiasi futura presenza temporale non è
   giustificato.
5. **La tassonomia unisce concetti distinti.** `TIPI_STRUTTURALI` include anche consumabili quali
   forzieri, semi, tesori e timbri. Il canale raccolto funziona, ma strutturali non consumabili e
   consumabili devono restare categorie esplicite separate.
6. **Copertura entità incompleta.** Fra i nativi, 14 negozi su 35 e 10 attività su 15 non hanno
   riferimento; non esiste un canale dedicato alla presenza delle attività.
7. **Manca la prova end-to-end.** I test controllano classificazioni o invocano manualmente il
   backfill; non dimostrano l'assenza reale del pin temporaneo via API e DOM dopo il percorso
   produttivo normale.

La chiusura richiede una riconciliazione non distruttiva e idempotente nel percorso ordinario,
capace di sostituire soltanto la presenza derivata; categorie separate; contabilità esplicita
degli elementi senza riferimento; canale attività; prove API e DOM senza preparazione manuale.
La Fase 2 resta **FAIL**.

## Fase 2 — Riverifica delle finestre dei Palazzi

**Esito: FAIL**
**Commit isolato:** `9cffd65c4aa86f54672d80a99ec4d62b303fe5c9`
**Validatore:** `galaxy-task-validator`, sola lettura

### Parti conformi

1. `finestre-dungeon.json` contiene dieci finestre coerenti con le date del catalogo. Dopo
   l'invocazione manuale di `collegaPalazziAiLuoghi`, ciascun ingresso è bloccato prima,
   disponibile durante e — per gli otto intervalli chiusi — bloccato dopo; Iweleth e Mementos
   restano disponibili dopo poiché non hanno data finale.
2. L'inserzione isolata è idempotente: la prima chiamata crea dieci pin, la seconda zero.
3. Il filtro esistente degli spilli propaga `disponibilita` all'API e al visore, che nasconde i
   pin bloccati salvo l'opt-in dell'utente. Lint PASS; suite 135 file / 561 test PASS; test
   mirati mappa, visibilità e DOM 37/37 PASS. Il typecheck non è stato valutabile nello snapshot
   per `EPERM` sulla junction `node_modules/.tmp`, non per un errore TypeScript.

### Rilievi bloccanti

1. **La migrazione 047 non entra nel ciclo reale.** `migrations/index.ts` termina alla 046:
   su database precedente `runMigrations` resta a `user_version=46` e `mappa` non riceve
   `condizioni_json`.
2. **La condizione della mappa non ha lifecycle.** Anche presupponendo la colonna, essa non
   attraversa DTO, query, export/import o valutatore: l'URL diretto `/api/mappe/dungeon-*`
   restituisce la destinazione prima della finestra. Nascondere il solo pin di ingresso non
   implementa l'assenza temporale della mappa.
3. **Il percorso ordinario non crea gli ingressi.** Su `runMigrations + caricaSeed` fresco gli
   ingressi `dungeon-*` sono zero; esistono soltanto dopo una chiamata manuale, perché il
   collegamento è invocato dal reset distruttivo e non dall'avvio/reseed normale.
4. **Il backfill non ripara i dati esistenti e il reset non li preserva.** Un pin Kamoshida con
   `condizioni_json` azzerato resta tale dopo la sincronizzazione. Il solo percorso che crea i
   pin cancella invece mappe, spilli, destinazioni, immagini e `spillo_partita`, senza backup o
   ripristino: non è ammesso per una partita esistente.
5. **Le coordinate sono una griglia simulata.** Tutti i dieci pin usano il fallback
   `posizionePassaggio`, senza una prova 3D→2D. Okumura e Mementos coincidono a `90,90` su Tokyo:
   questi non sono punti geografici certificati.
6. **Le provenienze non sostengono i luoghi dichiarati.** La prova Kamoshida sostiene
   Shujin↔Palazzo, non una coordinata; quella Madarame punta a Piazza della stazione, non a
   Central Street. Kaneshiro, Futaba e i sei fallback Tokyo sono auto-attribuiti a una presunta
   decisione utente senza evidenza nel commit genitore; possono al più essere accessi generici,
   dichiarati non localizzati, mai pin precisi. Iweleth da Sheriruth non equivale a Tokyo.
7. **Mancano test dei requisiti introdotti.** Il commit non prova registrazione 047, avvio e
   backfill ordinari, URL diretto, coordinate/provenienza certificate o conservazione dei dati
   utente; la suite verde non intercetta queste regressioni.

### Criterio di chiusura

Registrare e testare 047 su database vecchio e fresco; scegliere e realizzare la semantica
completa della presenza della mappa (DTO, export/import, API e accesso diretto), oppure eliminare
il campo morto; creare e riconciliare gli ingressi nel percorso ordinario preservando ID, stati e
contenuti utente; usare soltanto coordinate e provenienze certificate e rappresentare gli altri
casi come destinazioni non collocate; aggiungere prove API, DOM e URL diretto prima/durante/dopo,
più mutation test di backfill e conservazione. La Fase 2 resta **FAIL**.

### Arbitrato dell'utente — 6 settembre 2026

L'utente dispone che le coordinate in griglia degli ingressi e le rispettive provenienze puntuali
non siano blocker: sono ancoraggi di navigazione autorizzati, non affermazioni di una coordinata
2D nativa certificata. I rilievi 5 e 6 della sezione precedente non impediscono quindi la chiusura.

L'utente dispone inoltre che il database iniziale venga formato una sola volta e rimanga immutabile:
non è richiesto alcun backfill o riconciliazione a ogni avvio. Di conseguenza i requisiti di
reseed periodico e di mutation test del backfill non sono parte del gate runtime; rimane necessario
soltanto dimostrare la correttezza della creazione iniziale su database fresco.

I «cancelli» citati nelle verifiche sono requisiti di gioco (porta, forziere, leva e simili),
conservati in `cancelli-pin.json`; non sono trigger applicativi. La verifica della loro
generazione, se eseguita, appartiene al solo processo esplicito di costruzione del seed e non deve
essere invocata dall'applicazione a ogni avvio. Il rilievo sull'indipendenza di tale verificatore
non è un blocker del runtime immutabile.

## Fase 2 — Candidato di convergenza, bootstrap e determinismo

**Esito: FAIL**
**Commit isolato:** `0fe873463fc23c27b91d51e4869fe2b8ec9543bd`
**Validatore:** `galaxy-task-validator`, sola lettura
**Perimetro:** i cinque criteri del protocollo Codex; coordinate/provenienze degli ancoraggi,
backfill periodico e cancelli runtime esclusi per arbitrato utente.

### Meriti accertati

1. Su database fresco `runMigrations + caricaSeed` crea realmente 10/10 ingressi `dungeon-*`
   con le rispettive condizioni, senza reset distruttivo.
2. Le finestre dei dieci ingressi sono corrette via API: prima bloccati, durante disponibili,
   dopo bloccati per gli otto intervalli chiusi; Iweleth e Mementos restano disponibili senza
   data finale.
3. I verificatori sorgente principali passano: metadata 209 campi/301 mappe/1429 pin;
   connessioni 209 campi, 192 script, 15.734 procedure, 2.514 `CALL_FIELD`, 4.495 trigger;
   riferimento 250 mappe con pin, 217 condivise e 1.372 pin collocabili. Tre produttori sono
   già corretti a LF con newline finale.
4. I quattro typecheck separati e lint passano.

### Rilievi bloccanti e sanamento richiesto

1. **L'avvio muta un database già formato.** Con hash invariato, la seconda `caricaSeed` esegue
   sincronizzazione, collegamento Palazzi e presenza: `total_changes()` cresce di 829 pur
   restituendo `caricato:false`. Sanamento: separare bootstrap su DB fresco e avvio; nel secondo
   caso zero `INSERT`/`UPDATE`, mentre un hash differente segnala un aggiornamento pendente senza
   applicarlo.
2. **La finestra è aggirabile dall'URL diretto.** La migrazione 047 non è registrata, il campo
   non attraversa DTO/query/export/import/valutatore e tutte le 30 richieste dirette
   `/api/mappe/dungeon-*` riescono prima, durante e dopo. Sanamento: registrare la migrazione,
   conservare la presenza della mappa nel DTO e valutare la medesima condizione nel risolutore e
   nella rotta diretta; in stato assente la rotta deve restituire un esito non navigabile coerente
   con il visore, non il contenuto della mappa.
3. **Manca la prova DOM reale del bootstrap.** Il filtro generico è verde, ma nessun test apre
   i dieci ingressi creati dal bootstrap nelle finestre prima/durante/dopo. Sanamento: una sola
   matrice end-to-end DB fresco → API → DOM → URL diretto sui dieci record, con gli otto intervalli
   chiusi e i due senza termine.
4. **Il determinismo resta parziale.** Cinque produttori importano ma non usano `scrivi_json`;
   gli artefatti hanno CRLF/no newline finale, tra cui `identita.json` (23.430 CRLF),
   `inventario.json` (309.878), candidati/evidenze scuola, evidenze urbane e
   `verifica_metadati.json`. Sanamento: usare realmente la scrittura canonica in tutti i
   produttori e un unico test che rigeneri due directory e pretenda byte identici, UTF-8, LF e
   newline finale per tutto il corpus del lotto.
5. **Il gate pertinente è rosso.** Quattro test su 49 falliscono: due in
   `visibilitaCondizionale` (Yongen e 31 pin nativi condizionati) e due in `mappe-editor`
   (passaggi Tokyo estranei e presenza Yongen). Sanamento: non aggiornare le aspettative per
   renderle verdi; isolare la presenza degli elementi temporanei dall'eredità sui pin nativi o
   luoghi generici, quindi ripristinare l'invariante che i pin fissi non ricevono condizioni.

La Fase 2 resta **FAIL**. Il candidato successivo deve correggere soltanto questi cinque rilievi
e pubblicare il tag concordato.

### Chiarimento di semantica concordato — scheda leggibile, ingresso temporale

La presenza temporale governa il pin di ingresso e la navigazione operativa, non la leggibilità
della guida. Un Palazzo fuori finestra non deve comparire come luogo raggiungibile sulla mappa,
ma la sua scheda può restare consultabile anche via URL diretto: impedire al lettore di studiare
una guida non evita il problema indicato dall'utente, cioè raggiungere un luogo che non esiste.

Di conseguenza il rilievo 2 della sezione precedente viene ritirato nella parte che richiedeva
di bloccare URL e dettaglio o di mantenere `mappa.condizioni_json`: eliminare la migrazione 047 è
coerente con questa separazione. Il rilievo 3 resta limitato alla prova DOM dei dieci **pin**
reali; non richiede di negare la scheda. I soli blocker del prossimo candidato sono quindi:
immutabilità dopo bootstrap, DOM dei pin temporali, determinismo end-to-end e zero test rossi.

## Fase 2 — Pre-verifica del commit `14738b3`

**Stato: merito parzialmente confermato, non ancora verdetto formale.** Il commit è pubblicato sul
branch condiviso ma non reca il tag immutabile `candidato/fase-2-10`; applico quindi il protocollo
concordato e non lo promuovo a PASS/FAIL di fase.

### Evidenza riprodotta da Codex

Sul commit esatto `14738b3f8090c6a6614cefd3902d4c5d33eea39b`, senza modifiche al working tree:

1. `npx vitest run server/services/mappe/avvioImmutabile.test.ts server/services/mappe/finestreDungeon.test.ts` — **8/8 PASS**;
2. `npm run typecheck` — **PASS**;
3. `npm run lint` — **PASS**;
4. `npm test -- --run` — **137 file / 569 test PASS**;
5. `npm run build` — **PASS**. Resta il solo warning Vite preesistente sul chunk oltre 500 kB.

Il commit chiude materialmente due aspetti: su un DB fresco crea i dieci ingressi dei Palazzi nel
percorso d'avvio e, per un DB appena formato con `mappeFormate`, secondo e terzo avvio non mutano
l'impronta delle tabelle testate. È altresì corretta la rimozione della migrazione 047: la
presenza appartiene agli ingressi, mentre la scheda guida resta consultabile.

### Requisiti ancora non dimostrati per il candidato Fase 2

1. **DB già formato storico e seed cambiato.** L'assenza di `mappeFormate` fa ancora eseguire
   `sincronizzaMappe`, `collegaPalazziAiLuoghi` e `applicaPresenzaAiLuoghi`; un hash seed diverso
   percorre ancora l'upsert completo. Per il contratto utente entrambi i casi devono restare
   immutabili, segnalando nel secondo `aggiornamento seed pendente`. Servono le due prove di
   impronta completa già richieste.
2. **Catena API e DOM dei pin temporali.** `finestreDungeon.test.ts` valuta il servizio e la
   leggibilità della scheda, ma non monta il visore con una partita prima/durante/fuori finestra.
   Serve la matrice reale dei dieci ingressi: pin assente fuori finestra, presente nella finestra,
   URL guida leggibile in entrambi gli stati.
3. **Determinismo end-to-end.** Restano scritture JSON con `Path.write_text()` in
   `field_identities.py`, `global_world_audit.py`, `school_candidates.py`,
   `school_projection.py` e `urban_projection.py`; non esiste ancora la doppia rigenerazione
   byte-identica richiesta.

### Rilievo non bloccante — regex dell'oracolo dei cancelli

In `verify_pin_semantics.py` il pattern generico per `SWITCH` contiene due caratteri U+0008
invece dei confini regex `\b`; non riconosce quindi una procedura generica come previsto.
Poiché i cancelli restano fuori dal gate runtime per arbitrato utente, non riapro la Fase 2 per
questo punto. Il sanamento è circoscritto: sostituire il pattern con
`r'\bSWITCH\b|_SWITCH'` e aggiungere un caso positivo `SWITCH` al test dell'oracolo.

### Prossimo passo di collaborazione

Claude completa soltanto i tre requisiti sopra, esegue i relativi gate e pubblica il tag annotato
`candidato/fase-2-10`. Codex eseguirà allora una sola riverifica formale isolata su tag e SHA;
fino a quel momento questa sezione non autorizza merge né avanzamento della Fase 2.

### Preflight sul lotto di determinismo in corso

La modifica non pubblicata dei cinque produttori è corretta nella direzione: i quattro artefatti
rigenerati (`inventario.json`, candidati/evidenze scuola, evidenze urbane) hanno già zero CRLF e
newline finale. Restano però due omissioni da includere prima del commit candidato:

1. `data/atlas/extracted/campi-completi/identita.json`, prodotto da `field_identities.py`, non è
   stato ancora rigenerato: conserva **23.430 CRLF** e nessuna newline finale. Dopo l'adozione di
   `scrivi_json` deve cambiare insieme allo script.
2. `verify_world_metadata.py` continua a produrre `verifica_metadati.json` con `write_text()`;
   l'artefatto conserva **12 CRLF** e nessuna newline finale. È nominato esplicitamente nel
   perimetro deterministico e va portato allo stesso helper, poi rigenerato.

Infine il candidato deve aggiungere il comando/test che rigenera due directory temporanee e ne
confronta tutti gli output byte per byte: la normalizzazione osservata in una sola directory non
dimostra ancora la riproducibilità end-to-end.

### Integrazione al preflight — output testuali non JSON

La conversione in corso copre i JSON, ma quattro output testuali continuano a passare da
`Path.write_text()` e quindi restano dipendenti dal sistema operativo: `console.txt` in
`full_field_sources.py` e `scheduler_evidence.py`, `index.html`/`componenti.html` in
`render_maps.py`, `LEGGIMI.md` in `app_package.py`. Per chiudere il determinismo multipiattaforma
la soluzione robusta è usare `scrivi_testo()` anche in questi punti e includerli nella doppia
rigenerazione. Se qualcuno non fa parte degli artefatti versionati del lotto, va escluso con un
elenco motivato e il test deve fallire se un file non dichiarato sfugge al confronto.

### Preflight `rigenera_tutto.py` — produttore dichiarato ma non eseguito

Nella bozza non pubblicata di `rigenera_tutto.py`, `SPECIALI` definisce gli argomenti necessari a
`world_connections.py`, ma `world_connections.py` non compare in `ORDINE`. L'entry di `SPECIALI`
è dunque morta e `mondo_connessioni_evidenze.json` non viene rigenerato: un confronto fra due
directory può lasciare identico un file obsoleto e dichiarare falsamente il lotto completo.

**Sanamento:** inserire `world_connections.py` in `ORDINE` con gli argomenti `SPECIALI` e aggiungere
una prova che l'insieme dei produttori dichiarati in `ORDINE`, quelli speciali e gli output attesi
sia coerente e completo. La prova deve fallire sia togliendo `world_connections.py` dall'ordine,
sia aggiungendo una voce a `SPECIALI` senza produttore eseguibile.

### Preflight `verify_determinismo.py` — confronto nella stessa directory

La bozza del nuovo verificatore non realizza ancora la doppia rigenerazione richiesta. Il parametro
`out` viene passato a `rigenera_tutto.py`, ma `artefatti_del_lotto(out)` ignora `out` e costruisce
gli hash dai file della radice Git; `prima` e `dopo` confrontano quindi la **stessa** directory
prima e dopo una riscrittura. Questo trova una non-idempotenza semplice, ma non prova due build
indipendenti e non isola output residui, cache o input nascosti.

Il fatto che sia comparsa la directory non versionata `tools/p5r-map-export/data/atlas/...` durante
il lavoro conferma il rischio di percorsi relativi: un controllo che riscrive la radice può anche
scrivere fuori dal corpus previsto.

**Sanamento richiesto:** il verificatore crea due directory temporanee A/B, vi prepara lo stesso
insieme di ingressi, esegue il rigeneratore separatamente in A e B e confronta gli output relativi
attesi byte per byte. `artefatti_del_lotto` deve ricevere e usare la radice della singola build,
mentre la lista dei percorsi attesi può provenire da Git ma va tradotta in A/B. Il test deve
asserire che la working tree non cambia e che nessun output è creato sotto
`tools/p5r-map-export/data/`; la directory già generata va rimossa solo da Claude dopo averne
individuato il chiamante.

### Risposta alla dichiarazione Claude «PRONTO PER VERIFICA»

**Stato: non ancora candidabile.** Sul working tree dichiarato pronto Codex ha riprodotto
`npm run typecheck`, `npm run lint` e
`python tools/p5r-map-export/verify_determinismo.py data/atlas/extracted --senza-rigenerare`:
tutti PASS. Quest'ultimo prova soltanto censimento e forma; dichiara esplicitamente
«determinismo non misurato», quindi non supera il requisito di doppia build indipendente.

Restano inoltre invariati due requisiti funzionali, non opzionali:

1. `caricaSeed()` con DB storico senza `mappeFormate` effettua ancora l'allineamento una volta, e
   con hash differente entra ancora nell'upsert. Entrambi contraddicono il bootstrap immutabile
   deciso dall'utente; servono il comportamento `aggiornamento seed pendente` e le due prove di
   impronta già richieste.
2. La prova DOM dei dieci ingressi non è un optional «se serve»: è il criterio 3 del protocollo.
   Deve dimostrare pin assente fuori finestra, presente durante, e scheda guida leggibile in tutti
   gli stati per il percorso API→visore reale.

Il prossimo passo non è ancora il tag: Claude applica questi tre sanamenti (DB storico/hash,
DOM, doppia A/B) e soltanto allora pubblica `candidato/fase-2-10`; Codex avvierà il validator sullo
SHA congelato.

### Risposta Codex al commit `225018e` e al patto di collaborazione

Il commit `225018e` chiude con merito la **normalizzazione** del corpus: il controllo statico e la
forma dei 68 artefatti ora sono una base utile. Non cambia però i due requisiti funzionali aperti
(database storico/hash diverso e matrice DOM dei dieci ingressi), né produce un candidato
immutabile; non può quindi ancora ricevere una certificazione di Fase 2.

Sul terzo requisito, la prova dichiarata nel commit non è ancora una doppia build indipendente.
In `verify_determinismo.py`, `artefatti_del_lotto(out)` ignora `out`, enumera i file con
`git ls-files` e restituisce percorsi sotto `RADICE`. Perciò `controlla_determinismo()` calcola
`prima` e `dopo` sui medesimi file nel repository, anche quando passa `--artefatti` al
rigeneratore. Questo misura l'idempotenza della working tree, non due build A/B isolate, e non
protegge da output residui o da scritture relative fuori destinazione.

**Sanamento esatto del requisito 4:** il verificatore deve creare due directory temporanee A e B,
preparare per entrambe i medesimi ingressi dichiarati, rigenerare separatamente in A e B,
confrontare l'insieme e i byte di ogni output relativo atteso, e asserire che la working tree non
sia cambiata né siano comparsi output sotto `tools/p5r-map-export/data/`. Solo questo sostituisce
la prova corrente. Se alcuni produttori non supportano una destinazione isolata, il rigeneratore
deve correggere esplicitamente quell'interfaccia: non è ammesso confrontare la radice come
surrogato.

Accolgo la proposta dei tag: ogni dichiarazione pronta deve creare un **tag annotato**
`candidato/fase-2-10` sullo SHA completo. Codex giudicherà esclusivamente quel tag, non la
working tree che potrebbe avanzare nel frattempo. Il tag va pubblicato solo dopo questi tre
sanamenti, con i relativi test verdi.

Non propongo di trasformare i residui Fase 2 in debito per avanzare formalmente: immutabilità del
database, presenza temporale dimostrata sul visore e riproducibilità dei dati sono invarianti del
prodotto, non rifiniture di impalcatura. Possono invece essere preparati in parallelo materiali
documentali o prompt grafici di Fase 6, purché non siano dichiarati completamento o avanzamento
formale finché il validator non approva il candidato Fase 2.

### Preflight sulla modifica non pubblicata di `caricaSeed.ts`

La direzione è corretta, ma il controllo va spostato **prima** dell'attuale guardia
`if (!forza && leggiMeta(db, 'hash') === seed.hash)`. Nella forma corrente,
`statoDelMondo()` è chiamato solo quando l'hash coincide; un hash differente non può quindi
restituire `aggiornamento-pendente` e continua a raggiungere il reseed/upsert completo. È il caso
che il contratto deve proteggere.

Inoltre il ramo pendente invoca `scriviMeta(..., 'aggiornamentoSeedPendente', ...)`: anche se non
tocca le mappe, muta un DB storico al normale avvio. Il requisito concordato è impronta invariata
per **tutte** le tabelle, inclusa `seed_meta`; il segnale deve perciò essere solo nell'oggetto di
ritorno/log dell'avvio, oppure essere scritto esclusivamente da un comando esplicito di
manutenzione autorizzato, non da `caricaSeed()` ordinaria.

**Sanamento minimale e completo:** se `forza` è falso e una mappa esiste già, `caricaSeed()`
restituisce senza alcuna scrittura `caricato:false` e `aggiornamentoSeedPendente:true` quando
l'hash corrente non coincide o il marcatore storico manca; costruisce mappe/presenza/ingressi solo
su DB senza righe in `mappa`. I test devono esercitare separatamente DB storico senza marcatore e
seed intenzionalmente diverso, confrontando prima/dopo l'impronta completa inclusa `seed_meta`.

### Verifica del rilievo non bloccante cancelli — `f960fda`

**PASS circoscritto.** Sul commit pubblicato `f960fda091f12789d9f207e8647a943427082989`,
`python tools/p5r-map-export/verify_pin_semantics.py data/atlas/extracted` termina con esito 0.
La nuova matrice `LETTURE_DI_PROVA` esercita sia `SWITCH` (riconosciuto) sia `SWITCHBOARD`
(escluso): il pattern usa ora i confini regex reali invece dei due backspace U+0008. Il fix non
modifica la semantica runtime né riapre i cancelli utente; chiude il solo rilievo diagnostico.

## Passaggio operativo alle Fasi 5–7 — decisione utente recepita

Prendo atto della chiusura di Fase 2 dichiarata nel commit `e4cd8d2`. Lo stato corretto nel
registro Codex è **chiusa per decisione dell'utente, senza certificazione tecnica PASS**: non
avvierò `galaxy-task-validator` su Fase 2 e non riaprirò i tre residui come blocker, salvo nuova
richiesta esplicita dell'utente.

### Patto operativo

- **Fase 5:** Claude implementa per lotti di pagine; Codex verifica ogni lotto pubblicato su SHA
  congelato, con test, build e ispezione responsive/accessibile proporzionata alla pagina.
- **Fase 6:** Codex genera esclusivamente gli asset richiesti; Claude li integra e verifica. Il
  primo input necessario è un lotto di prompt, non codice.
- **Fase 7:** per ogni pezzo vale la separazione implementatore/verificatore già concordata.

### Formato concordato per un lotto di prompt Fase 6

Claude consegna una singola tabella Markdown in `docs/grafica/` per lotto, con una riga per file:
`id`, percorso finale esatto sotto `public/asset/`, dimensioni, alfa/sfondo, ruolo UI, palette,
prompt positivo completo, prompt negativo, vincoli testuali italiani e criteri di accettazione
visiva. Codex genererà solo le righe marcate `DA_GENERARE`; Claude ne controlla soggetto,
integrazione e uso nell'app.

Il registro corrente `docs/grafica/stato-generazione-asset.md` dichiara **684/684** file completati
e vieta di rigenerare o sostituire quelli `COMPLETATO` senza richiesta esplicita dell'utente.
Prima di un nuovo lotto, Claude deve quindi fornire un inventario-delta che dimostri per ogni riga
un asset mancante, non conforme al requisito nuovo o non usato da alcuna UI. Non genererò una
seconda versione di asset già approvati sulla sola base dell'indicazione generale «tutti gli
spilli»: serve la lista puntuale autorizzata.

### Preflight lotto collegamenti mappa non ancora pubblicato

La working tree di Claude modifica `map_links.py` e
`data/atlas/extracted/collegamenti-mappe.json` per conservare le distanze oltre soglia. Preflight
Codex: `git diff --check` pulito e
`python tools/p5r-map-export/verify_edge_pins.py data/atlas/extracted` **PASS**: 262 pin
verificati, 71 collegamenti ricostruiti indipendentemente (43 da meta unica, 28 da trigger
proiettato), nessuna meta/entrata ambigua. È un riscontro positivo sul contenuto corrente, non un
PASS formale: il verdetto di lotto verrà registrato sul commit e SHA che Claude pubblicherà.

### Verdetto formale — collegamenti mappa `08392d5`

**PASS — galaxy-task-validator.** Il commit
`08392d5ef91fb69d74036ea309261d6c0c89785d` supera la validazione indipendente:

1. diff pulito e limitato a `map_links.py` e `collegamenti-mappe.json`;
2. `verify_edge_pins.py` PASS: 71 collegamenti (43 meta unica, 28 trigger proiettati), 262 pin,
   191 irrisolti e zero ambiguità;
3. rigenerazione in checkout temporaneo identica al file pubblicato dopo due esecuzioni
   (SHA-256 invariato);
4. le 71 righe di collegamento e il summary restano identici al commit padre;
5. calcolo indipendente: 82 distanze scartate, 43 entro `2 × 0,08`, 2 con margine netto — tutti
   i valori coincidono con l'artefatto.

**Nota non bloccante e sanamento proposto:** uno scarto è realmente
`0,080000857587` ma viene mostrato come `0,08` a quattro decimali, pur essendo correttamente
escluso dalla condizione reale `> 0,08`. In un lotto successivo, per rendere l'audit leggibile,
conservare la precisione completa oppure aggiungere un campo booleano `oltreSogliaReale`; non
alterare soglia né collegamenti già validati.

### Preflight Fase 5.3 — fondazione `DoveSiTrova` in `c3df8bf`

**Non ancora certificabile come lotto Fase 5.** `npm run typecheck` passa e il componente ha una
separazione sensata fra esito unico, multiplo e assente; tuttavia non è ancora adottato da alcuna
pagina e non esiste un test del suo contratto API→DOM. Il commit è quindi una fondazione pronta a
ricevere prove, non il completamento del requisito 5.3.

**Sanamento/test richiesti a Claude prima della candidatura del componente:** aggiungere una suite
`DoveSiTrova.test.tsx` che mocki `getAccessoMondo` e `MappaIncorporata`, e dimostri:

1. esito `unica`: mappa incorporata con `mappa`, `spilloIniziale` e `centro` esatti, più link
   all'URL prodotto da `urlDestinazioneMondo`;
2. esito `multipla`: nessuna mappa scelta arbitrariamente e un link per ogni destinazione;
3. esito `assente`: testo informativo e nessun link/visore inventato;
4. `soloCollegamento`: non monta il visore ma conserva l'ancora corretta;
5. errore API: non rompe la scheda ospite.

L'adozione nelle pagine resta un lotto successivo e deve avere almeno una prova di pagina reale:
un riferimento alla mappa deve rendere questa area visibile, non soltanto un pulsante. Solo dopo
queste prove si richiamerà il validator formale del punto 5.3.

## Censimento Lotto B Fase 5 — inventari e attività

Accetto la divisione per dominio proposta in `docs/PIANO-FASI-5-7.md`; per i prompt Fase 6 scelgo
**una tabella Markdown unica per lotto**, con una riga per asset e i campi già fissati nel patto
operativo. Il censimento read-only del codice corrente produce questa base di lavoro:

| area | stato attuale | lacuna per requisiti 5.1–5.3 / 5.2 |
|---|---|---|
| `NegoziPage` | elenco per quartiere, ricerca, filtri e card responsive | link al risolutore ma nessuna posizione visibile; decidere una vista mappa per quartiere, non un visore per ogni card |
| `NegozioPage` | scheda con disponibilità, filtri, acquisti e `CollegamentoMappa` | primo candidato per `DoveSiTrova`: deve mostrare il luogo del negozio e l'ancora reale nella pagina |
| `OggettiPage` | consumabili, chiave/materiali, fabbricazione, armi, abiti, scambi | le righe hanno solo link testuali; mancano categorie guida esplicitamente richieste (armi da mischia/distanza, protezioni, accessori, carte abilità, regali, libri e DVD come sezioni consultabili dedicate o collegamenti strutturati) |
| `AttivitaPage` | attività, lavori, libri e film/DVD con filtri Doti | alcuni dati `dove` restano testo; va mappato il luogo per attività/lavori e per le sedi di libri, film/DVD quando esiste un'ancora |
| Covo dei Ladri | è una scheda dentro `CompletamentoPage` | manca una pagina/rotta propria nel dominio Lotto B, come richiesto dal piano |

Le rotte attuali confermano il perimetro: `/guida/negozi`, `/guida/negozi/:chiave`,
`/guida/oggetti`, `/guida/attivita` e il Covo sotto `/guida/completamento`; non c'è ancora una
rotta dedicata al Covo né integrazione di `DoveSiTrova` in queste pagine.

**Primo lotto consigliato:** completare e validare prima `DoveSiTrova`, poi integrarlo in
`NegozioPage` con una prova di pagina reale. È il caso più netto (entità singola → ancora singola),
riduce il rischio dell'API/componente comune e diventa il modello per le destinazioni multiple di
Oggetti e per i luoghi condizionati delle Attività. Nessun fabbisogno grafico è ancora registrato:
si apre `docs/grafica/fabbisogno.md` solo con asset realmente mancanti scoperti durante ciascuna
pagina, senza rigenerare i 684 file già approvati.

### Baseline prima dei lotti Fase 5

Sul ramo condiviso dopo `b63252f`, `npm test -- --run` è **PASS: 137 file, 569 test**. Questa è la
baseline di regressione per le fondamenta condivise e per i lotti A/B: ogni candidatura Fase 5
deve riportare il delta dei test aggiunti e mantenere verde la suite completa, oltre ai test
dedicati alla pagina o componente che modifica.

### Correzione del criterio Fase 6.1 — spilli

**Ritiro la parte incompatibile del criterio precedente.** Il divieto di rigenerare asset
`COMPLETATO` valeva per il contratto grafico allora approvato, ma non prevale sulla nuova richiesta
esplicita dell'utente: **tutti** gli spilli devono diventare PNG RGBA con la sola figura,
senza cornice, goccia o ombra; la forma/stato del pin è responsabilità dell'app.

L'inventario corrente in `shared/spilli.ts` contiene **37** tipi. Il registro esistente prova che
almeno quindici asset già approvati portano ancora una goccia nel requisito descrittivo
(`spillo-dialogo` e i quattordici spilli aggiunti il 6 settembre); quindi il registro 684/684 non
è una prova di conformità al requisito 6.1 nuovo. La Fase 6.1 resta aperta e non richiede una
nuova autorizzazione elemento-per-elemento.

**Input necessario da Claude:** una tabella unica di 37 righe, una per tipo di
`TIPI_SPILLO`, con percorso di sostituzione `public/asset/ui/spillo-<tipo>.png`, dimensione,
palette, soggetto, prompt positivo/negativo e vincoli `RGBA`, sfondo trasparente, **sola figura**.
Codex genererà quel lotto; Claude verificherà soggetto, assenza della sagoma di pin e integrazione.
Gli altri asset restano soggetti al censimento-delta della Fase 6.2.

### Preflight della suite `DoveSiTrova` non ancora pubblicata

La nuova `src/components/mappe/DoveSiTrova.test.tsx` passa con
`npx vitest run src/components/mappe/DoveSiTrova.test.tsx`: **1 file, 5 test PASS**. Copre tutti i
cinque requisiti richiesti da Codex (unica con pin/centro/URL, multipla senza scelta, assente,
`soloCollegamento`, errore API non distruttivo). Dopo commit più tag candidato, il punto 5.3
fondazione passa al validator formale; questa nota non è ancora un PASS di lotto.

### Verdetto formale — fondazione Fase 5.3 `candidato/fase-5-3-componente`

**FAIL — galaxy-task-validator.** Il tag punta correttamente a
`5f634e6a7132d10b143724a77238d5d5fd2b6583`; typecheck, lint e quattro rami del contratto sono
verdi. Il blocker è circoscritto alla quinta prova: il test «errore API non rompe la scheda» può
terminare mentre `useCarica` è ancora in loading, perché sia l'ospite sia l'assenza del visore sono
già veri prima del rifiuto. Passerebbe quindi anche se il ramo `esito.errore` non fosse mai preso.

**Sanamento obbligatorio a Claude:** usare una Promise controllata, montare e verificare il loading,
invocare esplicitamente `reject`, poi attendere un segnale possibile solo dopo il rifiuto (per
esempio la scomparsa dello spinner/card del componente) e soltanto allora asserire che la scheda
ospite è intatta. Nella prova `unica` aggiungere anche
`expect(getAccessoMondo).toHaveBeenCalledWith('negozio', 'untouchable')`.

La suite totale non può ancora essere la prova globale del lotto: il validator ha osservato
571/574 con fallimenti estranei in editor mappe/immagini, e un controllo sul padre ha rivelato un
fallimento preesistente diverso. Il prossimo candidato deve riprodurre i test mirati e separare
esplicitamente gli eventuali rossi preesistenti dalla modifica della fondazione.

### Rilievo di integrazione Fase 6.1 — figure degli spilli (post-validazione utente)

**Asset:** la validazione dell'utente chiude il lotto grafico: i 37 file
`public/asset/ui/spillo-<tipo>.png` sono a 128×128 con RGBA e alfa reale. Questo rilievo non
rimette in discussione soggetti, stile o trasparenza dei PNG.

**Integrazione attuale:** `SpilloGrafico` in `src/components/mappe/IconaSpillo.tsx` restituisce,
quando l'asset esiste, soltanto `<img className="spillo-mappa__figura">`. Il commento e le regole
CSS corrispondenti lo trattano ancora come «spillo completo», mentre il nuovo contratto dice che
il PNG è la sola figura e che forma, punto di ancoraggio e stati sono responsabilità dell'app.
Quindi un pin caricato non riceve più il contenitore-pin dell'applicazione.

**Sanamento proposto a Claude (proprietario dell'integrazione):** mantenere per l'asset il
contenitore semantico `spillo-mappa__goccia` (o un contenitore-pin equivalente), collocare al suo
interno l'immagine RGBA con `object-fit: contain`, e applicare a quel contenitore ancoraggio,
hover/selezione, raccolto ed evidenza suggerita. Le riserve SVG devono restare nello stesso
contenitore. Aggiornare commenti/CSS e il test di `SpilloGrafico`: con asset presente deve esistere
sia il contenitore-pin sia la figura, non un'immagine nuda. La controprova è visiva nel visore a
dimensione reale e automatica sul componente.

### Riverifica — Mappa dei Memento, commit `95b95f7`

**FAIL funzionale, sanamento a Claude.** La composizione grafica è una base leggibile e usa gli
elementi estratti presenti in `public/asset/mappe/lmap/memento/`, ma il contratto di presenza nel
momento di gioco non è collegato:

1. `DungeonDettaglioPage` monta `MappaMemento` soltanto con `aree={d.aree}`. Non passa mai la
   prop `sbloccati`; il componente quindi interpreta sempre ogni Dedalo come aperto
   (`!sbloccati || sbloccati.size === 0`).
2. Anche con una prop popolata, l'elenco finale `ol` mappa tutte le aree senza filtrare o
   disabilitare quelle non aperte. Risultano quindi ancora navigabili dal lettore, in contrasto
   con il punto grafico nascosto.
3. Il nuovo componente non ha test: il claim di suite verde non prova i due rami di presenza.

**Sanamento richiesto:** esporre dal dato della partita un insieme esplicito di Dedali disponibili
(derivato da stato di storia realmente tracciato, non da parsing della prosa), passarlo alla mappa
e usare la stessa sorgente sia per i nodi grafici sia per l'elenco/accessibilità. Se lo stato non
è disponibile, non va simulata una partita avanzata: va dichiarata la vista completa e resa
esplicitamente consultativa. Aggiungere test per: nessun dato di partita, un Dedalo disponibile,
un Dedalo non disponibile non cliccabile/navigabile e ordine stabile dei nove Dedali.

### Verifica prompt Fase 6.2 — asset Memento proposti in `fabbisogno.md` §2–3

**WARN — non generare ancora.** I prompt ora definiscono bene stile, misure, RGBA e soggetto, ma
non definiscono una consegna integrabile:

1. `MappaMemento.tsx` non riferisce né `dedalo-1.png`…`dedalo-9.png` né `catena.png`; generare
   ora dieci file produrrebbe asset non consumati.
2. I nove nodi del renderer seguono una spirale, hanno posizioni non contigue e scale diverse.
   Nove generazioni indipendenti non possono soddisfare la prova «unica figura senza tagli»:
   il prompt descrive bordi che continuano sopra/sotto, mentre il layout non impila i nodi in quel
   modo.

**Proposta concreta a Claude prima di cambiare lo stato in `pronto`:** fissare prima il contratto
di composizione nel renderer. Per mantenere la presenza per Dedalo, generare una singola
composizione-master trasparente con tutti i nove pezzi coerenti, poi ricavarne nove ritagli RGBA
deterministici (maschera/ritaglio documentati) da posare alle coordinate effettive; ciascun
ritaglio si può così mostrare o celare senza rompere lo stile complessivo. `catena.png` va
generata solo dopo che il renderer la usa davvero, oppure va esplicitamente eliminata dal
fabbisogno in favore della polilinea SVG esistente. Dopo mapping file→posizione/scala e consumo
nel componente, Codex può generare e verificare alfa, figura complessiva e resa alla scala reale.

### Riverifica condivisa — fondamenta 5.3 e integrazione, stato del 6 settembre

**`DoveSiTrova`: PASS limitato alla fondazione.** La suite mirata corrente passa: `1 file, 5 test`.
La prova copre effettivamente il ramo unico (mappa, spillo, centro e URL), multiplo senza scelta,
assente, `soloCollegamento` e rifiuto API; typecheck e lint del worktree condiviso sono verdi.

**Ma il requisito 5.3 non e' ancora integrato nelle pagine.** Una ricerca sull'albero `src/`,
escludendo componente e test, non trova alcun montaggio di `<DoveSiTrova>`: la base e' corretta,
ma Negozi, inventari, attivita', Covo e pagine del mondo non possono ancora mostrare la posizione
in pagina ne' portare l'utente all'ancora dell'atlante tramite questo componente. Non e' quindi un
PASS della richiesta utente, soltanto della sua fondazione riusabile.

**Restano aperti e non sostituiti dalla modifica grafica Memento:**

1. `DungeonDettaglioPage` continua a montare `MappaMemento` senza `sbloccati`, percio' ogni
   Dedalo resta aperto;
2. `SpilloGrafico` continua a rendere un PNG RGBA nudo anziche' nel contenitore-pin dell'app;
3. non esiste ancora un adottante di `DoveSiTrova`.

Il worktree contiene inoltre una modifica non pubblicata di `MappaMemento.tsx`; non e' stata
oggetto di verdetto finale. Il suo layout puo' proseguire, ma non chiude i tre punti funzionali
elencati sopra.

### Stabilita' della suite — rosso intermittente da chiudere prima della riverifica finale

Il primo `npm test` parallelo sul worktree ha dato `137 file, 573 test PASS; 1 test FAIL`:
`MappaPage.test.tsx`, caso «il contesto URL cambia il titolo del visore». Il visore aveva gia'
reso `Mappa: Museo, 1P`, ma l'asserzione immediata riceveva ancora `document.title = "Mappa —
Project P5R"`.

Non e' un difetto riproducibile del layout Memento: il file mirato passa tre volte consecutive
(`8/8` ogni volta) e la suite completa seriale passa (`138 file, 574 test`). E' comunque una
prova concorrente fragile, dunque la suite parallela non e' ancora un gate affidabile.

**Sanamento proposto al proprietario del test:** nel caso URL attendere esplicitamente il titolo
con `waitFor(() => expect(document.title).toContain('Museo, 1P'))` dopo il rendering del visore,
o isolare il titolo dalla concorrenza fra file. Ripetere almeno una suite parallela e una seriale;
il verde di entrambe e' il criterio di chiusura. Questo rilievo e' separato dai tre requisiti
funzionali dell'Atlante, che restano aperti.

### Osservazione immediata sul worktree Memento — non ancora un verdetto di lotto

La lavorazione non pubblicata separa `stratiMemento.ts` e rende gli strati pulsanti, ma prima di
un candidato deve chiudere tre dettagli deterministici:

1. `urlStratoDedalo` e' esportata da `stratiMemento.ts`, mentre `DungeonDettaglioPage` la importa
   ancora da `MappaMemento.tsx`; con il file corrente l'import non esiste e typecheck/build non
   possono passare. Importarla dal modulo nuovo oppure riesportarla esplicitamente dal componente.
2. `MappaMemento` espone `selezionata` e `onSeleziona`, ma il chiamante monta solo
   `aree={d.aree}`. I pulsanti della mappa non cambiano quindi l'area della scheda, e la scheda
   non illumina lo strato corrente: il requisito «stessa selezione» non e' ancora vero.
3. Il chiamante continua a non costruire/passare `sbloccati`; l'espressione del componente tratta
   l'assenza come «tutti aperti». Il sanamento di presenza temporale resta quindi indipendente dal
   rifacimento grafico e ancora necessario.

Questa e' una lettura del worktree non pubblicato, non un FAIL sul commit `7894cc3`. Il prossimo
candidato deve includere i tre rami di test: selezione scheda↔strato, Dedalo non disponibile non
interattivo/non navigabile, e una prova di import/build.

### Decisione utente — separazione Palazzi / Dedali dei Memento (6 settembre)

Questa decisione **sostituisce** il requisito precedente che portava i nove Dedali dei Memento
nella pagina «Palazzi e Dedali» e rende non pertinente il completamento grafico Memento in quel
percorso.

- la pagina e la navigazione diventano **«Palazzi»**, non «Palazzi e Dedali»;
- vi restano i nove Palazzi e il solo **Dedalo di Iweleth**, con le sue mappe;
- i nove Dedali dei Memento non devono comparire, essere navigabili o essere suggeriti da quella
  pagina/routing; la loro rappresentazione non e' un criterio per chiudere il lotto Palazzi;
- gli asset Memento gia' estratti non vanno cancellati ne' rigenerati in questa decisione: restano
  fuori da questo lotto finche' l'utente non assegna loro un percorso autonomo.

**Sanamento richiesto a Claude:** adeguare titolo, liste, filtri, contatori, collegamenti e test
di `DungeonPage`/`DungeonDettaglioPage` alla tassonomia sopra. La prova di chiusura deve mostrare
che i nove Palazzi e Iweleth sono raggiungibili con le mappe previste e che `mementos` non e'
esposto dal percorso Palazzi. Questa decisione prevale sui rilievi precedenti relativi a
`MappaMemento` e `sbloccati` per questo lotto.

### Specifica di sanamento UX — dettaglio radice «Dedalo di Iweleth»

**Input osservato:** la schermata corrente `MappaPage` per una radice senza planimetria mostra
una grande card quasi vuota, un elenco di luoghi a testo e miniature 112×96; la gerarchia non
porta lo sguardo alla prossima area, le planimetrie sembrano allegati e non un percorso, e le
piccole immagini grigie non consentono di capire quale carta si sta aprendo. E' il contrario della
consultazione rapida che serve davanti al gioco.

**Obiettivo:** fare del dettaglio Iweleth una pagina-editoriale di percorso, moderna e P5R,
senza inventare mappe: le planimetrie restano quelle reali gia' presenti, ogni voce deve aprire
la sua ancorata sullo stesso atlante, e «Dedalo di Iweleth» resta l'unico Dedalo dentro il percorso
Palazzi.

#### Struttura obbligatoria desktop

1. **Hero compatto, non una card vuota.** Breadcrumb `Mappe / Palazzi / Dedalo di Iweleth`,
   emblema Iweleth gia' disponibile, titolo display, riga di contesto «12 aree · N planimetrie ·
   N punti di interesse» e due azioni leggibili: `Apri atlante` e `Scheda del Dedalo`.
   Il fondo puo' usare texture/rosso/nero gia' nel sistema, ma non un'immagine inventata.
2. **Navigatore di percorso persistente.** Colonna sinistra (desktop) o barra scorrevole
   (tablet/mobile) numerata 01–12: ogni area ha stato mappa disponibile/non disponibile,
   nome completo e link. Nessun semplice elenco a pallini; l'area attiva e' immediatamente
   distinguibile e la tastiera la percorre nell'ordine reale.
3. **Pannello centrale “area selezionata”.** Titolo/contesto dell'area, una CTA primaria
   `Apri mappa interattiva` e la griglia delle sue planimetrie reali. La prima carta e' grande
   (preview 16:9), le altre sono carte secondarie; ciascuna porta nome, copertura e numero punti.
   Non usare icone/glyph come sostituti di preview quando la planimetria e' disponibile.
4. **Colonna di orientamento.** Mostra solo metadati utili: collegamento al Palazzo/Dedalo,
   presenza di piano, punti e stato della partita. Nessun blocco vuoto, nessuna ripetizione del
   titolo, nessun testo di amministrazione in prima lettura.

#### Comportamento e responsive

- Desktop: griglia `minmax(210px, 280px) / minmax(0,1fr) / 240px`, hero massimo 220 px;
  il navigatore resta visibile mentre si scorrono le planimetrie.
- Tablet: navigatore orizzontale sopra al pannello, preview primaria seguita da due colonne.
- Mobile: una colonna, navigatori a chip numerati con label troncata, preview a larghezza piena,
  controlli almeno 44×44 px; mai miniature illeggibili o una card che lasci meta' viewport vuota.
- Ogni carta planimetria e link deve avere nome accessibile, focus P5R ad alto contrasto e stato
  attivo; immagini decorative con `alt=""`, planimetrie con alt descrittivo.

#### Vincoli dati e criteri di accettazione

- `AlberoLuoghi` diventa una presentazione di percorso: mantiene ordine/catalogo, non deduce
  planimetrie e non elimina aree senza immagine; per queste mostra uno stato esplicito, non una
  finta anteprima.
- `ImmaginiLuogo` riceve varianti `hero` / `card` oppure un componente dedicato: non deve piu'
  imporre globalmente `w-28 h-24` al dettaglio Iweleth.
- Il click su area e planimetria conserva URL e ancora reali; `MappaPage` continua a usare
  `haPlanimetria`, `urlMappa` e i dati della partita.
- Test richiesti: ordine delle 12 aree; una area con tre planimetrie rende una hero e tre link;
  una senza planimetria e' dichiarata tale ma resta raggiungibile; ogni link usa la sua chiave;
  mobile non perde le azioni principali.

**Proprietario dell'implementazione:** Claude (`MappaPage.tsx`, `AlberoLuoghi.tsx`,
`ImmaginiLuogo.tsx` e CSS proprietario). Codex riverifica il candidato pubblicato su gerarchia,
responsivita', semantica dei link, build e regressioni; nessuna modifica diretta ai suoi file.

### Sanamento obbligatorio — indice Palazzi e doppia destinazione incoerente

Le due schermate confermano che la decisione «solo Palazzi, con il solo Iweleth» non e' stata
ancora applicata nel codice pubblicato. Non e' un problema di cache ne' di styling:

- `src/components/guida/sezioniGuida.tsx` espone ancora la piastrella `Palazzi e Dedali`;
- `src/pages/DungeonPage.tsx` usa ancora titolo/document title/sottotitolo `Palazzi e Dedali` e
  itera l'intero `getDungeons`, incluso `mementos`;
- `src/pages/MappaPage.tsx` descrive ancora le mappe come Tokyo, Palazzi e Dedali.

Nella stessa `DungeonPage` c'e' inoltre il difetto visivo segnalato dall'utente: ogni `<li>`
contiene una card-link verso l'arrivo in mappa e, **fuori dalla card**, un secondo
`CollegamentoVisivo` «Scheda del Palazzo» verso la scheda editoriale. Le due destinazioni non
sono distinguibili dalla card, il secondo elemento rompe il perimetro e appare come un'azione
fantasma quando il layout ricalcola. Non e' ammesso mantenere questo doppio target ambiguo.

**Implementazione richiesta a Claude:**

1. rinominare ovunque il percorso editoriale in **Palazzi** e aggiornare le descrizioni;
2. filtrare la pagina a `tipo === 'palazzo'` (che gia' comprende Iweleth nel catalogo) e
   conservare Iweleth come unico Dedalo raggiungibile con le sue mappe;
3. fare della card un solo target primario, la **scheda del Palazzo**;
4. se l'arrivo sull'atlante serve, renderlo come azione secondaria *dentro il footer della stessa
   card*, con etichetta `Apri sulla mappa`, visibile e stabile; se non ha una destinazione unica,
   non mostrarlo;
5. aggiornare test di `DungeonPage`, `GuidaPage`, testi di `MappaPage` e snapshot/accessibilita':
   nessun testo «Palazzi e Dedali», nessuna card Mementos, una sola CTA primaria per card e nessun
   elemento azione fuori dal suo perimetro.

## Lotto B — candidato NegozioPage con posizione contestuale (7 settembre 2026)

**Proprietario implementazione:** Codex. **Verificatori richiesti:** Opus e
`galaxy-task-validator`, entrambi in sola lettura sul tag candidato.

### Modifica

- `NegozioPage` sostituisce il collegamento compatto nell'intestazione con una sola istanza di
  `DoveSiTrova`, alimentata da `tipo="negozio"` e dalla chiave della scheda.
- Il componente condiviso conserva il contratto gia' verificato: mappa incorporata per una
  destinazione unica, scelta esplicita per destinazioni multiple, messaggio informativo per una
  voce senza luogo e degradazione silenziosa se il risolutore non risponde.
- Il test di pagina impedisce regressioni su numero di istanze, tipo, chiave e altezza, oltre a
  mantenere le prove esistenti su filtri, disponibilita' e acquisti.

### Evidenze dell'implementatore

- tre cicli: `typecheck` PASS, `lint` PASS, build Vite PASS e 8/8 test mirati PASS;
- controllo runtime reale su desktop 1440x900, tablet 900x900 e mobile 390x844: nessuno sbordo,
  controlli e prodotti restano leggibili, una sola sezione `Dove si trova`;
- suite completa ripetuta tre volte: risultato stabile 572/574. I due fallimenti sono esterni al
  diff e gia' nella base `github/main` (`citta.test.ts`: 84 attesi, 82 reali;
  `mappe-editor.test.ts`: attesa obsoleta del Dedalo Memento nell'albero). Non vengono sanati nel
  Lotto B e sono consegnati a Opus come rilievi della base/Lotto A.

### Rilievo di integrazione per Opus

Untouchable risolve oggi due ancore gerarchiche, Shibuya e Central Street, entrambe etichettate
`Untouchable`. Il ramo `multipla` di `DoveSiTrova` le presenta quindi come due pulsanti omonimi.
La pagina non inventa quale sia la destinazione corretta; il Lotto A deve distinguere le etichette
oppure eliminare la duplicazione nel risolutore/dati, mantenendo un solo proprietario dei file.

## Lotto B — candidato NegoziPage con inventario contestuale (7 settembre 2026)

**Proprietario implementazione:** Codex. **Verificatori richiesti:** Opus e
`galaxy-task-validator`, entrambi in sola lettura sul tag candidato.

### Modifica

- Ogni scheda negozio apre come destinazione primaria la rotta canonica
  `/guida/negozi/:chiave`; la posizione e' un comando separato, esplicito e richiudibile.
- La pagina monta al massimo una sola `DoveSiTrova`: scegliendo un altro negozio la sostituisce;
  cambiando ricerca o filtri la nasconde se la selezione non appartiene piu' ai risultati correnti.
- Con una partita attiva, negozi e articoli con `disponibilita.stato === 'bloccato'` sono assenti
  da elenco, ricerca, conteggi e comandi di posizione. Compaiono soltanto quando il motore li
  restituisce disponibili.
- Le condizioni alternative restano valutate dal motore come OR tramite `gruppo` con
  `modo: 'almeno-una'`: una qualunque condizione soddisfatta rende la voce visibile. La suite
  completa include la prova del valutatore; la pagina consuma esclusivamente lo stato finale.
- L'azione `Aggiungi un negozio` e' separata dall'intestazione per non comprimere il sottotitolo
  su mobile; catalogo, filtri, acquisti e suggerimenti restano invariati.

### Evidenze dell'implementatore

- tre cicli mirati: 12/12 test PASS, `typecheck` PASS, `lint` PASS e build Vite PASS;
- runtime reale con partita al giorno 11 aprile: API 60 negozi, 12 bloccati, UI 48 visibili;
  la ricerca `37 Gradi` non rende ne' il negozio bloccato ne' una posizione residua;
- controllo a schermo desktop, tablet 900x900 e mobile 390x844: griglie e controlli leggibili,
  una sola mappa contestuale, apertura/chiusura corretta e nessuno sbordo osservato;
- suite completa ripetuta tre volte: risultato stabile 575/577. Restano esclusivamente i due
  fallimenti gia' riprodotti sulla base (`citta.test.ts`: 84 attesi, 82 reali;
  `mappe-editor.test.ts`: vecchia attesa del Dedalo Memento nell'albero).

### Vincolo di integrazione e ripartizione aggiornata

Per decisione successiva dell'utente, la gestione progressiva di libri, film/DVD e videogiochi e'
parte del Lotto B: saranno tre nuove sezioni autonome della Guida, con progresso per parti/sessioni
e completamento che alimenta gli sblocchi. Opus integra soltanto lo stato risultante nelle pagine
del mondo di sua proprieta'. Fino al completamento l'entita' collegata deve restare assente anche
da pin, ricerca e collegamenti indiretti; se lo sblocco ammette alternative, basta una qualsiasi
condizione vera. I Palazzi compaiono in mappa soltanto nella rispettiva finestra di apertura e
sono assenti fuori periodo.

### Esito del `galaxy-task-validator` sul tag v1: FAIL

Il tag immutabile `candidato/lotto-b-negozi-contesto-v1` resta respinto. Il client nascondeva le
righe rosse, ma il backend calcolava `articoli`, `verificati` e `totale` sul catalogo completo:
intestazione e card dichiaravano quindi come disponibili anche articoli bloccati. La ricerca,
inoltre, applicava prima `LIMIT 300` e soltanto dopo il filtro client, quindi il totale visibile
non era dimostrabile per cataloghi oltre 300 righe. Il tag non viene spostato ne' riutilizzato.

### Correzione preparata per il candidato v2

- `elencaNegozi` calcola per ogni negozio `articoli` e `verificati` dopo la valutazione della
  partita ed elimina i negozi con stato finale `bloccato`;
- `dettaglioNegozio` risponde 404 per un negozio bloccato ed elimina gli articoli bloccati prima
  di restituire elenco e conteggi;
- `ricercaArticoli` valuta l'intero insieme, calcola `totale` sui soli disponibili e applica il
  limite 300 soltanto alla risposta;
- l'acquisto diretto di un articolo bloccato risponde 404; la scheda non contiene piu' il vecchio
  interruttore che permetteva di riaprire gli articoli non ancora disponibili;
- il frontend usa il totale restituito dal backend e conserva un filtro difensivo contro risposte
  obsolete, senza offrire comandi di rivelazione.

Prove mirate: 23/23 PASS su servizio, rotte, elenco e dettaglio. Una fixture rende disponibile
soltanto `untouchable/kogatana-nera` e blocca gli altri 217 articoli, verificando 1/1 in elenco,
scheda e ricerca. Una seconda fixture rende disponibili tutte le righe e verifica `totale=575`
con 300 risultati restituiti. Runtime isolato reale sulla porta 3102, database nuovo: il 9 aprile
48 negozi e 380 articoli visibili, ricerca `totale=380`, 300 restituiti, zero bloccati; la Kogatana
e' assente e l'acquisto diretto risponde 404, poi compare il 1 agosto. Frontend isolato 5276
controllato a schermo: il 9 aprile intestazione 48/380, ricerca Kogatana con due risultati e nessun
Untouchable; il 1 agosto tre risultati incluso Untouchable. La scheda Untouchable passa da 161 a
162 articoli e non offre alcun comando per rivelare i bloccati. La prova sul 5274 dell'utente
resta da riallineare dopo la finestra concordata sul backend condiviso 3101.

Le suite complete sequenziali restituiscono 578/580 con i due difetti esterni gia' noti. Una
tornata ha mostrato anche un fallimento temporaneo sul titolo di `MappaPage`, immediatamente
passato 8/8 in isolamento e non collegato al diff; viene dichiarato invece di essere occultato.

### Verdetto indipendente `galaxy-task-validator`: PASS

Il validatore ha giudicato in sola lettura il tag remoto annotato
`candidato/lotto-b-negozi-contesto-v2` (oggetto `c972be7a`, commit `4bacca68`) e non ha modificato
file. Ha riprodotto 23/23 test mirati, typecheck, lint e build PASS; suite completa 578/580 con i
soli due difetti della base gia' separati. Ha verificato specificamente:

- conteggi `articoli`/`verificati` sui soli stati finali non bloccati;
- 404 per dettaglio negozio e acquisto diretto bloccati;
- totale ricerca calcolato prima di `slice(0, 300)`;
- fixture 1/218 coerente su elenco, scheda e ricerca e fixture 575/300;
- catalogo senza partita invariato a 60 negozi e 575 articoli;
- rimozione del toggle di riapertura e conservazione dell'OR `almeno-una`.

Nessuna richiesta correttiva. Il gate procedurale e' chiuso; resta il verdetto incrociato di Opus
previsto dalla collaborazione alla pari.
### Chiarimento vincolante sul WIP Memento

Il WIP corrente di `cittaService`/`mappeService` rimuove la radice Memento da Citta' e indice
Mappe, ma la documentazione del codice conserva la pagina `/guida/dungeon/mementos` come sua
destinazione. Questo **non soddisfa** la decisione utente: il percorso `/guida/dungeon` e' ora
Palazzi, e l'unico Dedalo che vi resta con mappe e' Iweleth.

Quindi non va introdotto alcun nuovo invito, link o fallback pubblico verso
`/guida/dungeon/mementos` nelle pagine Citta', Mappe, Richieste o Palazzi. Le Richieste dei
Mementos possono restare una sezione editoriale autonoma con i loro dati, ma non devono riaprire
la navigazione alle mappe/dedali esclusi. Il filtro dell'API/pagina e le route devono produrre un
esito esplicito e non navigabile per `mementos`, mentre Iweleth continua a puntare alle sue mappe
reali. Aggiornare anche commenti e test: non basta nascondere la radice dall'albero.

### Regressione riprodotta nel WIP di esclusione Memento

La suite mirata `server/routes/citta.test.ts server/routes/mappe-editor.test.ts` non e' verde:
`16/17 PASS`, con fallimento di `mappe-editor.test.ts` nel passaggio Tokyo → Memento. L'albero
ora filtra `dungeon-mementos`, ma il dato di Tokyo conserva ancora uno spillo/passaggio verso
quella chiave; il test lo dimostra cercando ogni passaggio di Tokyo fra le figlie o le radici
esposte e ottenendo `false` per Memento.

Non si deve semplicemente aggiornare l'asserzione a `false`: sarebbe accettare un link orfano nel
visore. Il sanamento completo deve far sparire/non rendere navigabile il passaggio Tokyo →
`dungeon-mementos` nello stesso perimetro in cui la mappa e' esclusa, oppure renderlo un elemento
editoriale senza destinazione se deve restare come riferimento narrativo. La prova corretta e':
nessun passaggio navigabile da Tokyo o Richieste porta a Memento, nessuna chiave nascosta resta
come target del visore, Iweleth resta risolubile e i test del nuovo contratto passano.

### Regressione UX — La Citta' mostra Tokyo due volte

`src/pages/CittaPage.tsx` monta in sequenza sia `MappaTokyo` (la visuale costruita con la rete e
gli elementi nativi) sia `MappaIncorporata chiave="tokyo"` (il visore dell'atlante). Sono due
mappe della stessa citta' nello stesso percorso, con due interazioni e due gerarchie visive: il
secondo blocco e' ridondante e trasforma la pagina in un pastrocchio.

**Correzione della specifica:** `MappaTokyo` non e' una mappa primaria accanto a un atlante
separato: **e' la mappa canonica di Tokyo** che l'utente ha chiesto di costruire. Non deve dunque
esistere alcuna CTA verso un secondo «atlante Tokyo» che ne riproponga una diversa versione.

**Sanamento richiesto a Claude:** rimuovere `MappaIncorporata chiave="tokyo"` e il relativo
codice di navigazione da Citta'. Ogni quartiere/Palazzo attivo nella `MappaTokyo` canonica deve
continuare a portare alla propria mappa/ancora reale. Anche il percorso `Mappe → Tokyo`, se
mantiene una voce Tokyo, deve montare o reindirizzare alla stessa `MappaTokyo`, mai al precedente
visore duplicato. Aggiornare test affinche' contino una sola rappresentazione di Tokyo e
verifichino i link dei nodi della mappa canonica. Nessuna duplicazione desktop, tablet o mobile.

### Regressione UX — miniature delle schede quartiere disallineate dalla mappa canonica

Le piastrelle dei quartieri sotto la `MappaTokyo` canonica non devono caricare la vecchia
anteprima del nodo-atlante `citta-<quartiere>` tramite `MiniaturaMappa`: e' una sorgente diversa,
puo' essere assente e non corrisponde alla sagoma che il lettore ha appena selezionato sulla mappa
composta. Ogni scheda deve invece riutilizzare il medesimo asset nativo `lmap/tokyo` gia' usato da
`MappaTokyo`, cioe' `/asset/mappe/lmap/tokyo/<chiave>.png` (con `shujin-academy.png` per
Shujin). Il contenitore puo' ritagliare con `object-contain`, ma non deve ridisegnare, ricampionare
o sostituire la figura con una miniatura generica.

Serve un solo resolver condiviso fra `MappaTokyo` e le card di `CittaPage` (per esempio
`assetTokyoQuartiere(chiave)`), cosi' chiave, fallback e gestione `onError` non divergono. Il
fallback e' ammesso soltanto quando il corrispondente asset della mappa composta manca davvero;
deve restare trasparente/neutral e non mostrare un'immagine estranea. Test richiesti: ogni
quartiere renderizzato usa la sorgente canonica; Shibuya e Shujin usano i rispettivi file; non
resta alcun `MiniaturaMappa`/`citta-...` nella griglia; la mappa composta compare una sola volta.

### Esito della riverifica WIP — filtro Memento ancora incoerente

Esecuzione reale: `npm test -- --run server/routes/citta.test.ts
server/routes/mappe-editor.test.ts server/services/mappe/finestreDungeon.test.ts` => **22/23
PASS, 1 FAIL**. Il fallimento e' in `mappe-editor.test.ts`: `tokyo.numeroFigli` e' `25`, mentre
i nodi pubblicati con `genitore === 'tokyo'` sono `24`. Il filtro di `elencaMappe()` rimuove
`citta-mementos`, ma `riassunto()` continua a calcolare `numeroFigli` direttamente dal database,
quindi pubblica un conteggio che include il figlio nascosto.

Il sanamento non e' allentare il test: il contratto della risposta deve restare internamente
coerente. Il conteggio dei figli va calcolato sul medesimo insieme filtrato che viene restituito
(o sovrascritto dopo il filtro), e la prova deve richiedere `numeroFigli === figli esposti`.
Inoltre i commenti WIP che indicano `/guida/dungeon/mementos` e le Richieste come percorso
pubblico sono incompatibili con la decisione vincolante gia' sopra: vanno rimossi insieme ai
target navigabili, non lasciati come documentazione del comportamento futuro.

### Seconda causa riprodotta — spilli seed Memento preesistenti

La successiva esecuzione della stessa suite conferma il conteggio corretto ma fallisce ancora sul
contratto dei passaggi: `passaggio da Tokyo verso entrata-dei-memento`. Ispezione diretta del DB:
Tokyo conserva **due** spilli seed verso destinazioni escluse, `citta-mementos` (Entrata dei
Memento) e `dungeon-mementos` (Memento). Il WIP salta la creazione futura dell'ingresso Memento,
ma non rimuove gli spilli gia' generati: il reseed idempotente li conserva, cosi' il visore
continua a ricevere un target senza nodo pubblico.

Sanamento richiesto: nella sincronizzazione/reseed riconciliare e rimuovere soltanto gli spilli
`origine='seed'` con `riferimento_tipo='mappa'` e riferimento `citta-mementos` o
`dungeon-mementos` (compresi eventuali alias storici risolti dal seed), senza toccare spilli
utente. La prova di accettazione e': nessun passaggio Tokyo punta ai due nodi esclusi, il test
dei passaggi e' verde, Iweleth e ogni Palazzo restano raggiungibili, e un secondo reseed non
reintroduce il collegamento.

#### Stato dopo la correzione di creazione

La suite sul DB fresco e' ora verde: **3 file, 23/23 test PASS**. La modifica che salta
`citta-mementos` nella sincronizzazione risolve la creazione iniziale. Non conclude pero' il
sanamento dell'istanza gia' esistente: controllo read-only del DB operativo rileva ancora gli
spilli seed `id=258` (Tokyo → `citta-mementos`) e `id=1626` (Tokyo → `dungeon-mementos`). Resta
necessaria la riconciliazione idempotente indicata sopra, con test su DB preesistente dopo reseed;
solo allora il risultato e' valido sia per installazioni nuove sia per quella in uso.

### Riverifica commit `ec74bce` — esito parziale, non approvato per lo scope utente

Il commit rende verde il caso di DB fresco, ma non realizza ancora l'intera decisione: commenti e
contratto del codice dichiarano che Mementos restano raggiungibili dalla loro pagina e dalle
Richieste. L'istruzione utente e' invece piu' netta: nel percorso **Palazzi** deve rimanere il
solo Dedalo di Iweleth con le sue mappe, e Mementos/altri Dedali non devono essere esposti o
navigabili da Citta', Mappe, Richieste o Palazzi. Finche' quegli ingressi/route restano pubblici
il commit e' solo un passo di pulizia, non la chiusura del requisito.

La ricerca del frontend corrente conferma inoltre che nessuno dei lavori UX e' ancora entrato nel
candidato: `DungeonPage` e `sezioniGuida` espongono ancora «Palazzi e Dedali»; `MappaPage` lo
descrive ancora; `CittaPage` importa ancora `MiniaturaMappa` per le card. Il prossimo candidato
deve includere queste modifiche insieme ai loro test; non e' lecito dichiarare il lavoro concluso
in base alla sola suite backend verde.

#### Rettifica di ambito dopo lettura del piano aggiornato

Il piano aperto aggiornato da Claude precisa correttamente il confine: **Mementos mantiene la sua
pagina autonoma**. Non deve pero' ricomparire come Dedalo nel percorso `Palazzi`, come quartiere
in `Citta'`, ne' come radice nell'indice Mappe generico. Le precedenti note di questa verifica che
parlavano di rimuovere ogni route/pubblico ingresso Mementos sono quindi sostituite da questo
contratto: la sua pagina dedicata e le Richieste possono puntarvi; non possono esistere passaggi
orfani da Tokyo o una seconda navigazione nell'atlante generico. Il commit `ec74bce` resta
valutabile positivamente per questo perimetro backend dopo la pulizia degli spilli seed esistenti.

---

## Ripartenza Fasi 5-7 — gate di soluzione del punto 1 (7 settembre 2026)

**Validatore:** `galaxy-task-validator`, sola lettura
**Stato:** **WARN sulla soluzione complessiva; PASS funzionale condizionato a un candidato**

Il contratto dati risolve senza euristiche il confine della pagina: `iweleth` e' registrato con
`tipo: 'palazzo'`, mentre `mementos` e' l'unico record con `tipo: 'mementos'`. La selezione robusta
per il percorso editoriale «Palazzi» e' quindi **positiva** (`d.tipo === 'palazzo'`), non il WIP
`d.tipo !== 'mementos'`: la seconda forma ammetterebbe in futuro qualsiasi nuovo tipo estraneo.
Il risultato atteso sul seed corrente e' di nove schede, Iweleth incluso e Mementos escluso.

Il filtro appartiene alle viste `Palazzi`, Citta'/Tokyo e all'indice Mappe generico. Non deve
impoverire l'API/catalogo dei dungeon ne' eliminare la route autonoma
`/guida/dungeon/mementos`: la pagina dei Mementos e le CTA delle Richieste restano operative,
come stabilito dal piano aggiornato. L'indice Mappe deve invece escludere radice e discendenza
Mementos senza lasciare spilli o target navigabili orfani.

### Criteri del candidato del punto 1

1. document title, intestazione e descrizioni/etichette accessibili di `DungeonPage` diventano
   «Palazzi»;
2. la piastrella e la descrizione in `sezioniGuida.tsx` e il sottotitolo di `MappaPage` sono
   coerenti; non si sostituiscono globalmente diciture di dominio corrette come «Palazzi e
   Mementos»;
3. un dataset di prova misto dimostra nove risultati, tutti `tipo === 'palazzo'`, Iweleth presente
   e Mementos assente;
4. route Mementos e CTA delle Richieste restano funzionanti; Citta', Tokyo e indice Mappe non
   espongono Mementos e non producono collegamenti orfani;
5. typecheck, lint, suite completa e verifica browser desktop/tablet/mobile passano nei tre cicli
   prescritti.

Il WIP sporco non e' una consegna e non e' stato giudicato. Il punto 1 e l'intero Lotto A restano
di proprieta' di Opus; Codex verifichera' soltanto il tag candidato e scrivera' qui l'esito.

### Rilievo operativo post-merge

`github/main` punta al merge finale `7d38607`; il ramo remoto `lavoro/atlante-mondo` e' stato
cancellato intenzionalmente e non va ricreato. Il ramo locale omonimo e' fermo al secondo genitore
`16440a6`, ha upstream `[gone]` e contiene WIP non committato: non va riallineato finche' l'autore
non lo ha messo in sicurezza.

Per i prossimi punti il protocollo durevole diventa: nuovo ramo di lavoro creato da
`github/main`, tag `candidato/<nome-univoco>` non spostabile sul commit esatto, push di ramo e tag,
verifica del tag in worktree isolato, integrazione via PR. `ATLANTE-STATO` ed
`ESITOVERIFICHE` restano i registri autoritativi; il filesystem condiviso permette notifiche
immediate, ma non sostituisce il candidato immutabile. I riferimenti al vecchio ramo in
`RIPARTENZA`, `ATLANTE-STATO` e `PIANO-FASI-5-7` vanno aggiornati da Opus, proprietario di quei
documenti, nel prossimo ramo.

---

## Censimento e proposta Lotto B — inventari (7 settembre 2026)

Questa sezione e' **analisi preliminare**, non una dichiarazione di completamento. E' stata
prodotta leggendo codice, seed e asset e osservando le pagine reali nel browser prima di
progettare modifiche.

### Evidenza corrente

- `NegoziPage` rende 60 punti di acquisto e 575 articoli nell'istanza corrente. La griglia e'
  gia' coerente col linguaggio P5R; la posizione resta pero' solo un collegamento.
- `NegozioPage` puo' contenere oltre 200 articoli. Desktop e mobile sono leggibili, ma la scheda
  monta ancora `CollegamentoMappa`, non `DoveSiTrova`.
- `OggettiPage` espone 247 consumabili, 108 oggetti chiave/materiali, 10 ricette, 55 abiti e
  cinque gruppi di scambi. Il catalogo separato contiene anche 223 equipaggiamenti: 36 armi da
  mischia, 32 armi da fuoco, 30 protezioni e 125 accessori. Non e' ancora provato che questi
  insiemi coprano tutti i tipi individuati dalle guide.
- `AttivitaPage` espone 30 attivita', 46 libri e 21 film/DVD. Le card sono adattive, ma mostrano
  solo la CTA alla mappa.
- il Covo dei Ladri non ha una route propria: e' una scheda di `CompletamentoPage`, con 52 sfide e
  36 premi. Su mobile l'apertura e' un muro di testo e la navigazione mescola il Covo con trofei,
  finali, DLC, meteo e Nuova Partita+.
- gli asset approvati `public/asset/guida/negozi.png`, `attivita.png` e `oggetti.png` esistono
  gia'. La ricerca iniziale negli originali ha trovato anche
  `IT/FIELD/PANEL/P5_MEMENTOS_SHOP.SPD`, da catalogare prima di qualunque prompt relativo al
  negozio di Jose.

### Soluzione proposta, per pezzi verificabili

1. **NegozioPage:** primo adottante di `DoveSiTrova`; hero compatto e griglia
   contenuto/posizione su desktop, posizione sotto la scheda su tablet/mobile, filtri sempre
   raggiungibili e una sola mappa. Gli esiti unica/multipla/assente restano quelli del componente.
2. **NegoziPage:** riepilogo utile, barra ricerca/filtri chiara e sezioni per quartiere. Le card
   restano accessi al dettaglio: non si montano decine di mappe nell'indice. Si riusano asset,
   `IconaCategoria`, `ChipDisponibilita` e token condivisi.
3. **OggettiPage e 5.2:** prima una matrice guide → categorie/seed/UI che identifichi le lacune
   reali; poi nuova gerarchia delle sei schede senza perdere ricerca, fonti, stato secondario e
   destinazioni multiple. Nelle righe fitte resta il collegamento; la posizione incorporata va
   nel dettaglio o nel riquadro selezionato, non una mappa per ogni riga.
4. **AttivitaPage:** hero e riepilogo per Doti, filtri e card piu' scansionabili; la selezione
   mostra `DoveSiTrova` nell'area dedicata, preservando spunte e condizioni.
5. **Covo dei Ladri:** route e pagina autonome, mantenendo un ingresso da `CompletamentoPage`;
   hero dedicato, riepilogo Medaglie P, sfide e premi filtrabili. Il deep link
   `?scheda=covo` resta compatibile tramite reindirizzamento o CTA esplicita.
6. **Gate:** test di comportamento/accessibilita', typecheck, lint, suite completa e browser
   desktop/tablet/mobile; tre cicli e tag candidato immutabile. Opus verifica il Lotto B: Codex
   non certifica il proprio codice.

Prima dell'implementazione il `galaxy-task-validator` deve approvare questa soluzione. Ogni nuovo
fabbisogno grafico entra in `docs/grafica/fabbisogno.md` solo dopo ricerca negli originali e
osservazione del riferimento; gli asset esistenti vengono riusati per primi.

### Rettifiche richieste dal gate Lotto B

**Verdetto iniziale:** WARN. L'ordine dei cinque pezzi e' approvato; la soluzione viene precisata
come segue prima di implementare.

1. `NegoziPage` non monta 60 mappe, ma offre **un solo pannello contestuale** `DoveSiTrova`
   collegato al negozio selezionato; la card conserva il dettaglio come destinazione primaria.
2. La matrice del 5.2 e' un deliverable e gate autonomo, precedente a modifiche di DTO, seed o UI.
   Non assume che le sei schede attuali siano definitive. Censisce almeno armi da mischia, armi da
   fuoco, protezioni, accessori, abiti, libri, DVD, carte abilita', regali, oggetti chiave e
   materiali. Per ogni famiglia registra fonte guida, seed/API corrente, conteggio, destinazione
   UI, aggancio mappa, lacuna e decisione contro duplicazioni.
3. `/guida/completamento?scheda=covo` reindirizza **automaticamente con `replace`** alla nuova
   route canonica del Covo. `CompletamentoPage` conserva anche un ingresso esplicito. I test
   coprono apertura diretta, refresh e back.
4. Gli originali pertinenti al Covo esistono gia': le cinque viste
   `public/asset/mappe/native/nativo-rmap-022-1-0..4.png`, registrate come gruppo Covo. La pagina
   autonoma le riusa tramite l'atlante/collezione esistente, una vista per volta, prima di
   qualsiasi prompt. `P5_MEMENTOS_SHOP.SPD` riguarda invece il negozio di Jose e non sostituisce
   questa ricerca.
5. `MappaTokyo` oggi collega il Covo a `/guida/completamento`, ma e' Lotto A: Codex non la
   modifica. Dopo la route B scrive un rilievo a Opus per aggiornare quel collegamento e le
   eventuali piastrelle globali. Ogni file mantiene un solo proprietario.

Ogni pezzo ha un proprio candidato immutabile, verifica di Opus e gate
`galaxy-task-validator`; non si accumulano i cinque lavori per una sola verifica finale.

### Gate della soluzione Lotto B

**Verdetto:** PASS del `galaxy-task-validator` in sola lettura (7 settembre 2026).

Il validatore conferma che le cinque rettifiche sono recepite senza ambiguita': pannello
contestuale unico in `NegoziPage`; matrice 5.2 autonoma e completa prima di DTO/seed/UI; redirect
storico del Covo con `replace`; riuso una vista per volta degli originali
`nativo-rmap-022-1-0..4.png` prima di qualunque prompt; ownership di `MappaTokyo` mantenuta nel
Lotto A con rilievo a Opus. Confermati anche candidato e gate separati per ciascun pezzo.

La soluzione del Lotto B e' quindi approvata a partire da `NegozioPage`, ma l'implementazione
resta subordinata alla chiusura verificata dei punti precedenti nell'ordine globale concordato.

---

## Rivalidazione corretta — `candidato/lotto-a-mondo` (7 settembre 2026)

**Verdetto:** **PASS con WARN non bloccanti** sul tag annotato immutabile
`candidato/lotto-a-mondo` (`f7a8ce0`, oggetto tag `8092ce6`). La precedente ipotesi di FAIL e'
ritirata: l'utente ha ribadito che quartieri e Palazzi bloccati devono essere assenti come figure
attive sulla mappa di Tokyo, mentre catalogo informativo, nomi, schede/deep link, selettori e
comando «Mostra anche i non ancora disponibili» devono restare consultabili.

### Evidenze indipendenti

- il giorno 11 aprile la mappa rende soltanto Yongen-Jaya, Shibuya e Shujin Academy e nessun
  Palazzo; le schede informative degli altri quartieri restano correttamente presenti;
- tutte le nove finestre dei Palazzi sono uniche e complete: ciascun Palazzo e' presente agli
  estremi inclusivi e assente subito prima; Iweleth resta aperto dal 24 dicembre;
- le condizioni alternative usano `modo: 'almeno-una'` e diventano verdi quando almeno una
  condizione e' soddisfatta;
- Mementos e' escluso da Citta', indice Palazzi e indice Mappe, ma conserva correttamente la pagina
  autonoma e i collegamenti dalle Richieste;
- Citta' monta una sola `MappaTokyo`; `/guida/mappe/tokyo` reindirizza a `/guida/citta`; card e
  mappa riusano le sagome originali `asset/mappe/lmap/tokyo/<chiave>.png`;
- la scheda Palazzo usa layout adattivo, navigatore aree e planimetrie native collegate; l'API
  restituisce sempre `mappe` come array;
- checkout temporaneo del tag: 47/47 test mirati, typecheck, lint e build PASS; suite completa
  **583/583 PASS**.

### WARN non bloccanti

1. Nel tag verificato `soloPalazzi` usa ancora il filtro negativo `tipo !== 'mementos'`: sui dati
   correnti e' corretto, ma un futuro terzo tipo entrerebbe impropriamente. Il ramo successivo di
   Opus contiene gia' la forma positiva `tipo === 'palazzo'`.
2. `MappaTokyo` mostra un futuro Palazzo privo di record finestra (`!f`): sui nove dati correnti
   non accade. Preferibile fail-closed o un vincolo di completezza del seed.
3. Il badge del navigatore aree guarda i campi legacy `mappa/pianta` e non `mappe.length`; le
   planimetrie native si aprono comunque, ma il simbolo puo' non annunciarle.

Il validatore non ha modificato file. Il candidato e' approvato per il perimetro dichiarato; il
prossimo candidato Lotto A dovra' inoltre ripristinare i toggle/deep link informativi rimossi per
errore su mia precedente richiesta, mantenendo il filtro positivo.
