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
