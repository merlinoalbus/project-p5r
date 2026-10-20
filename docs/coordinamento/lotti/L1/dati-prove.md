# L1 — prove sui dati F8 e F11 (Analisi dati, 2026-10-20)

Sola lettura. «Prima» = copia di produzione `…\cffd8da6-…\scratchpad\prod-20261020\` (prima della 107: Banchina `illustrazione-editoriale`).
«Dopo» = `data/` della cartella di sviluppo (107 applicata) e API del BE di sviluppo (http://localhost:3201).
Script (scratchpad di questa sessione `…\161706c7-6e2c-47d6-bdb7-618347ce218c\scratchpad\`): `collezioni.ts` (chiama il modulo vero
`server/services/mappe/collezioniImmagini.ts` con le stesse righe di `contestoMappe()`, `mappeService.ts:100`), `cerca.cjs` (cerca una
stringa in tutte le colonne testuali di tutte le tabelle di gioco.db e partite.db), `q.cjs` del PM per le SELECT.

## F8 — etichette delle mappe sorelle di Yongen-Jaya prima e dopo la 107

### Le sorelle (figlie di `citta-yongen-jaya`), dal DB — prima
```
[{"chiave":"yongen-java-banchina-della-metropolitana","nome":"Banchina della metropolitana","tipo":"area","genitore_chiave":"citta-yongen-jaya","ruolo_immagine":"illustrazione-editoriale","asset":"mappe/yongen-java-banchina-della-metropolitana","immagine_chiave":null,"ordine":0},
 {"chiave":"nativo-rmap-009-2-0","nome":"Vicoli","tipo":"area","genitore_chiave":"citta-yongen-jaya","ruolo_immagine":"planimetria-nativa","asset":"mappe/native/nativo-rmap-009-2-0","immagine_chiave":null,"ordine":100},
 {"chiave":"citta-yongen-jaya","nome":"Yongen-Jaya","tipo":"quartiere","genitore_chiave":"tokyo","ruolo_immagine":"illustrazione-editoriale","asset":"mappe/citta-yongen-jaya","immagine_chiave":"citta-yongen-jaya","ordine":0}]
```
### Dopo (data/)
```
[{"chiave":"yongen-java-banchina-della-metropolitana","nome":"Banchina della metropolitana","tipo":"area","genitore_chiave":"citta-yongen-jaya","ruolo_immagine":"planimetria-nativa","asset":"mappe/yongen-java-banchina-della-metropolitana","immagine_chiave":null,"ordine":0},
 {"chiave":"nativo-rmap-009-2-0","nome":"Vicoli","tipo":"area","genitore_chiave":"citta-yongen-jaya","ruolo_immagine":"planimetria-nativa","asset":"mappe/native/nativo-rmap-009-2-0","immagine_chiave":null,"ordine":100},
 {"chiave":"citta-yongen-jaya","nome":"Yongen-Jaya","tipo":"quartiere","genitore_chiave":"tokyo","ruolo_immagine":"illustrazione-editoriale","asset":"mappe/citta-yongen-jaya","immagine_chiave":"citta-yongen-jaya","ordine":0}]
```

### Numerazione delle collezioni («Immagine N di M», `immagineCollezione`) col modulo vero
```
citta-yongen-jaya
 prima {"genitore":"tokyo","nome":"Yongen-Jaya","ruolo":"illustrazione-editoriale","contesti":null,"gruppo":null,"collezione":null,"ambito":null}
 dopo  {"genitore":"tokyo","nome":"Yongen-Jaya","ruolo":"illustrazione-editoriale","contesti":null,"gruppo":null,"collezione":null,"ambito":null}
yongen-java-banchina-della-metropolitana
 prima {"genitore":"citta-yongen-jaya","nome":"Banchina della metropolitana","ruolo":"illustrazione-editoriale","contesti":null,"gruppo":null,"collezione":null,"ambito":null}
 dopo  {"genitore":"citta-yongen-jaya","nome":"Banchina della metropolitana","ruolo":"planimetria-nativa","contesti":null,"gruppo":null,"collezione":null,"ambito":null}
nativo-rmap-009-2-0
 prima {"genitore":"citta-yongen-jaya","nome":"Vicoli","ruolo":"planimetria-nativa","contesti":null,"gruppo":null,"collezione":null,"ambito":null}
 dopo  {"genitore":"citta-yongen-jaya","nome":"Vicoli","ruolo":"planimetria-nativa","contesti":null,"gruppo":null,"collezione":null,"ambito":null}
```
Confronto su tutte le mappe (stesso script, tutte le chiavi):
```
DIFF yongen-java-banchina-della-metropolitana
 prima {"genitore":"citta-yongen-jaya","nome":"Banchina della metropolitana","ruolo":"illustrazione-editoriale","contesti":null,"gruppo":null,"collezione":null,"ambito":null}
 dopo  {"genitore":"citta-yongen-jaya","nome":"Banchina della metropolitana","ruolo":"planimetria-nativa","contesti":null,"gruppo":null,"collezione":null,"ambito":null}
mappe prima 317 dopo 317 differenze 1
mappe numerate prima 0 dopo 0
```

### Dopo, dall'API (chiavi pubbliche) — `GET /api/mappe/albero`, righe di Yongen-Jaya
```
{"chiave":"yongen-jaya","nome":"Yongen-Jaya","genitore":"tokyo","ruolo":"illustrazione-editoriale","img":true,"asset":"mappe/citta-yongen-jaya"}
{"chiave":"yongen-jaya-banchina-della-metropolitana","nome":"Banchina della metropolitana","genitore":"yongen-jaya","ruolo":"planimetria-nativa","img":false,"asset":"mappe/yongen-java-banchina-della-metropolitana"}
{"chiave":"yongen-jaya-vicoli","nome":"Vicoli","genitore":"yongen-jaya","ruolo":"planimetria-nativa","img":false,"asset":"mappe/native/nativo-rmap-009-2-0"}
```
(`immagineCollezione` assente in tutte e tre: nessuna numerazione.) `GET /api/mappe/yongen-jaya-banchina-della-metropolitana` (estratto):
`"ruoloImmagine":"planimetria-nativa","immagineUrl":null,"asset":"mappe/yongen-java-banchina-della-metropolitana","larghezza":750,"altezza":625,"numeroSpilli":4`.

### Esito F8
- La famiglia di una collezione è `[genitore, titolo]` (`collezioniImmagini.ts:20-23`): Banchina («Banchina della metropolitana») e Vicoli
  («Vicoli») hanno titoli diversi, quindi la Banchina che entra fra le `fisica` forma una famiglia da 1 e non riceve numerazione
  (`righe.length<2`, riga 27). Prima e dopo: **nessuna etichetta «Immagine N di M»** su Yongen-Jaya; anzi, su tutta la base 0 mappe numerate
  sia prima sia dopo.
- Il selettore delle sorelle (`MappaPage.tsx:393`) filtra con `immagineUrl || asset` ed etichetta con `nomePresentazioneMappa` (nome,
  contesti, nome rivisto, gruppo: nessuno dipende dal ruolo). Le due sorelle hanno l'asset prima e dopo e gli stessi nomi/contesti/gruppo: le
  opzioni restano «Banchina della metropolitana» e «Vicoli», nello stesso ordine (ordine 0, 100).
- Unico cambio della 107 su tutte le 317 mappe: il ruolo della Banchina. Effetto: `haPlanimetria` resta vero (`ruoloConVisore` accetta sia
  `illustrazione-editoriale` sia `planimetria-nativa`, `shared/immaginiMappa.ts:38-40`), quindi il visore si apre come prima.

## F11 — `nativo-archivio-022`

```
-- prima (copia di produzione)
SELECT chiave FROM mappa WHERE chiave LIKE '%archivio-022%'                      → []
SELECT count(*) FROM mappa WHERE chiave LIKE '%archivio%'                         → [{"n":0}]
SELECT * FROM mappa_alias WHERE chiave LIKE '%archivio%' OR chiave LIKE '%022%'
  OR mappa_chiave LIKE '%022%' OR mappa_chiave LIKE '%archivio%'                  →
[{"chiave":"covo-dei-ladri","mappa_chiave":"nativo-rmap-022-1-1"},{"chiave":"covo-dei-ladri-inquadratura-orientale","mappa_chiave":"nativo-rmap-022-1-4"},{"chiave":"covo-dei-ladri-porzione-occidentale","mappa_chiave":"nativo-rmap-022-1-2"},{"chiave":"covo-dei-ladri-porzione-settentrionale","mappa_chiave":"nativo-rmap-022-1-3"},{"chiave":"covo-dei-ladri-settore-dingresso","mappa_chiave":"nativo-rmap-022-1-0"},{"chiave":"nativo-rmap-022-1-0","mappa_chiave":"nativo-rmap-022-1-0"},{"chiave":"nativo-rmap-022-1-1","mappa_chiave":"nativo-rmap-022-1-1"},{"chiave":"nativo-rmap-022-1-2","mappa_chiave":"nativo-rmap-022-1-2"},{"chiave":"nativo-rmap-022-1-3","mappa_chiave":"nativo-rmap-022-1-3"},{"chiave":"nativo-rmap-022-1-4","mappa_chiave":"nativo-rmap-022-1-4"}]
SELECT count(*) FROM mappa_alias                                                  → [{"n":690}]
cerca.cjs «archivio-022» in ogni colonna testuale di gioco.db + partite.db        → totale righe con "archivio-022" 0

-- dopo (data/)
SELECT chiave FROM mappa WHERE chiave LIKE '%archivio-022%'                      → []
SELECT count(*) FROM mappa WHERE chiave LIKE '%archivio%'                         → [{"n":0}]
mappa_alias (stesso filtro)                                                       → le stesse 10 righe di prima (identiche)
SELECT count(*) FROM mappa_alias                                                  → [{"n":690}]
cerca.cjs «archivio-022»                                                          → totale righe con "archivio-022" 0
GET /api/mappe/albero (307 mappe, chiavi pubbliche): chiavi con «archivio»        → []

-- pacchetto iniziale in git (pacchetto/gioco.db)
mappa LIKE '%archivio-022%' → []   mappa_alias LIKE '%archivio-022%' → []
```
Storia: la stringa compare nel codice dai commit `f6cbd063`, `50aa5c20`, `b645ef2a`, `c86f9b8b` e se ne va con `bd20ed72` (`git log -S`).

### Esito F11
Nessuna mappa, alias (chiave pubblica) o riferimento in nessuna tabella contiene `archivio-022`, né in produzione né in sviluppo né nel
pacchetto iniziale. Il Covo dei Ladri vive oggi come gruppo di immagini `nativo-rmap-022-1-0` (5 planimetrie `nativo-rmap-022-1-0..4`,
genitore NULL, chiavi pubbliche `covo-dei-ladri*`). Il ramo rimosso in `AlberoLuoghi` non poteva più scattare.
