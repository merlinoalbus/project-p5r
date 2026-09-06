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
