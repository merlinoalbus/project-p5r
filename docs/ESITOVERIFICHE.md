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
