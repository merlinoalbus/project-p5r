# L3 «Palazzi: aree e infiltrazioni» — stesura delle modifiche

Autore: sessione «Stesura modifiche» (2026-10-20). Ingressi: `requisiti.md` (R3-01…R3-41, dubbi 1–11), `dati.md` (§1–§7, compreso il §7
diario → infiltrazione), `app.md` (§0–§12), `decisioni-pm.md` (L3 a, b, c; fonti vecchie fino a L11), i punti del PM (1 metro e «Mappa del
Palazzo», 2 diario, 3 alias del Museo 1P, 5 progetto comune con L2, 6 nomi e `?area=`), e **L2** (`lotti/L2/modifiche.md`): la tabella `area`,
le colonne `mappa.area_chiave`/`versione_*`, il cestino `area-fisica`, la «casa» delle mappe, le API `/api/aree/:contenitore/…` e i
componenti delle versioni nascono lì e qui si **riusano**. L3 si implementa dopo L2 (migrazione 109) con la **110**.

**Principio**: si spostano i legami, non i contenuti. Nessuna chiave di mappa, voce, pin o infiltrazione cambia; nessun pin cambia mappa,
posizione o riferimento; nessuna voce cambia infiltrazione, ordine o testo; nessuna fusione (L4); nessuna rigenerazione dal pacchetto.
Le fonti vecchie (`mappa_entita` di tipo area, `mappa.entita_*='area'`, `gruppo_immagini_json`) **restano** fino a L11 ma nessuno le legge più
(decisione del PM, R3-09).

## 0. Nomi nel contratto (punto 6 del PM) — dichiarazione esplicita
| Cosa | Nell'interfaccia | Nel codice e nei contratti | Note |
|---|---|---|---|
| L'infiltrazione (`dungeon_area`) | «Infiltrazione» (L0) | **invariato**: `AreaDungeonDto`, `DungeonDettaglioDto.aree`, rotte `/api/compendio/dungeon/:k/aree` e `/api/compendio/aree/:k`, cestino tipo `area` | I Memento usano gli stessi nomi per i dedali: non si toccano (R3-12). Si aggiunge solo l'alias di tipo `export type InfiltrazioneDto = AreaDungeonDto` per leggibilità del codice nuovo |
| L'area fisica del Palazzo (ex «stanza») | «Area» | tabella `area` (L2) con `dungeon_chiave`; DTO `AreaRiassuntoDto`/`AreaDettaglioDto` di L2 (contenitore `{ tipo: 'dungeon' }`); campo nuovo **`DungeonDettaglioDto.areePalazzo`**; cestino `area-fisica` (L2) | Mai «area» da sola in un nome nuovo del contratto dei Palazzi: sempre `areePalazzo`/`areaPalazzo` |
| Parametri dell'indirizzo | — | `?area=<infiltrazione>` **resta accettato** con il significato di oggi (R3-18: indirizzi salvati, diario, `ContenutiGuidaMappa`); il nuovo nome è `?infiltrazione=<chiave>`, che i link nuovi usano; se ci sono tutti e due vince `infiltrazione`. L'area del Palazzo sta nel **percorso**: `/guida/dungeon/<k>/area/<slug>` | Nessun indirizzo esistente cambia significato |

## 1. Modello

### 1.1 Aree del Palazzo nella tabella `area` di L2
Nessuna tabella nuova per le aree: righe di `area` con `dungeon_chiave` (CHECK di L2: una sola fra quartiere e dungeon). Chiave
`dungeon/<palazzo>/<slug>` (dubbio 3: chiavi nuove, mai gli id dei gruppi; gli id `utente:nativo-rmap-151-{2,7,9}-0` non compaiono in alcun
indirizzo, quindi non serve una tabella di corrispondenza: i redirect passano da mappa → area, §4.1). `nome_rivisto`, `origine`, `seed_json`,
`planimetria_predefinita` come in L2. Le planimetrie usano `mappa.area_chiave`, `versione_etichetta`, `versione_ordine` di L2.

### 1.2 Legame infiltrazione ↔ area (molti a molti)
```sql
CREATE TABLE infiltrazione_area (
  infiltrazione_chiave TEXT NOT NULL REFERENCES dungeon_area(chiave) ON DELETE CASCADE,
  area_chiave          TEXT NOT NULL REFERENCES area(chiave) ON DELETE CASCADE,
  ordine               INTEGER NOT NULL DEFAULT 0,          -- ordine delle aree dentro l'infiltrazione (mappa dell'infiltrazione)
  planimetria_iniziale TEXT REFERENCES mappa(chiave) ON DELETE SET NULL,  -- la versione da aprire per quest'infiltrazione
  origine              TEXT NOT NULL DEFAULT 'utente' CHECK (origine IN ('seed', 'utente', 'regola')),
  PRIMARY KEY (infiltrazione_chiave, area_chiave)
);
CREATE INDEX infiltrazione_area_area ON infiltrazione_area (area_chiave);
```
- `planimetria_iniziale` conserva la granularità di oggi (dubbio 1): dove l'infiltrazione era legata a una sola versione dell'area, si apre
  quella; le altre versioni sono raggiungibili dal selettore, perché l'infiltrazione tocca l'area intera (R3-07).
- Una regola sola per «le planimetrie di un'infiltrazione»: tutte le planimetrie delle sue aree, in ordine `infiltrazione_area.ordine`,
  poi `versione_ordine`.

### 1.3 Diario → infiltrazione (punto 2, R3-37, dati.md §7)
Una voce può descrivere **più infiltrazioni** («esplorazione completa»: 11 delle 45 voci di Palazzo, `dati.md` §8): il legame è un **insieme
ordinato** (decisione del PM sulla proposta di Analisi dati, 2026-10-20), in una tabella propria — un collegamento **in più**, che non riscrive
testo, ordine, giorno, fascia, uid né spunte della voce (piano §7):
```sql
CREATE TABLE voce_infiltrazione (
  voce_uid             TEXT NOT NULL,                 -- uid della voce del diario (voce_giornata.uid)
  ordine               INTEGER NOT NULL,              -- posizione nell'insieme (0, 1, 2…), scelta dall'utente
  infiltrazione_chiave TEXT NOT NULL REFERENCES dungeon_area(chiave) ON DELETE CASCADE,
  PRIMARY KEY (voce_uid, ordine)
);
CREATE INDEX voce_infiltrazione_infiltrazione ON voce_infiltrazione (infiltrazione_chiave);
```
(`voce_giornata` è nello stesso file `gioco.db`; la chiave è l'uid perché è l'identità stabile della voce, la stessa che usano le spunte.)
**La stessa infiltrazione può comparire due volte nell'insieme** (G-022 dell'Esperto: il 14/11 di Niijima l'Arena si attraversa prima e dopo
l'Oscura dimora, sequenza 10, 11, 12, 11, 13): per questo la chiave è la **posizione**, non la coppia voce-infiltrazione. Si rifiuta solo la stessa
infiltrazione in due posizioni **consecutive** (non descrive un percorso; §7.12). Una voce può anche partire dall'inizio del Palazzo con l'obiettivo
più avanti (Maruki 12/1 = 0, 4, 5, 6): l'insieme è quello scritto, senza riempire i buchi. Cancellare un'infiltrazione (cascata) toglie le sue
posizioni e **ricompatta** gli ordini rimasti (0…n-1) nella stessa transazione; il cestino la rimette nelle posizioni salvate nel suo riepilogo.

### 1.4 Voci «da rivedere» e testo precedente (decisioni del PM su `dati.md` §8.1, 2026-10-20; meccanismo unico con L10)
Le colonne che L10 usa per le voci aggiunte dal team nascono **qui** (L3 viene prima), e L10 le riusa senza ricrearle:
```sql
ALTER TABLE voce_giornata ADD COLUMN da_rivedere INTEGER NOT NULL DEFAULT 0;  -- voce aggiunta o corretta dal team, da rivedere con l'utente
ALTER TABLE voce_giornata ADD COLUMN aggiunta_da TEXT;                        -- 'team' per le voci nuove del team, NULL per le altre
ALTER TABLE voce_giornata ADD COLUMN testo_precedente_json TEXT;              -- {azione, note, riferimento_tipo, riferimento_chiave, riferimento_testo,
                                                                             --  data?, fascia?, ordine?} (gli ultimi tre solo se una correzione sposta la voce, L10 G-037)
                                                                             -- com'erano prima della prima correzione del team; NULL se mai corretta
ALTER TABLE voce_giornata ADD COLUMN motivo_revisione TEXT;                   -- perché è da rivedere (frase dell'Esperto o del team), mostrata col chip;
                                                                             -- non tocca `note`, che resta il testo della voce
```
Regola unica: **nessuna** di queste scritture tocca il diario validato 04-01..06-01 (255 voci sulla copia 0440Z: 254 + una voce del 06-01 sera aggiunta dall'utente); la migrazione si ferma con un errore leggibile se
un uid da correggere o segnalare ha data fra il 1° aprile e il 1° giugno del calendario di gioco (`data BETWEEN '04-01' AND '06-01'`: il
formato è `MM-DD` e l'anno di gioco va da aprile a marzo, quindi un `<=` prenderebbe anche gennaio–marzo). Una correzione del team: salva in
`testo_precedente_json` i campi com'erano (solo se è NULL: la prima versione resta), scrive i campi nuovi, mette `da_rivedere = 1`. L'utente, sulla
voce, vede il chip «Da rivedere» e, se c'è un testo precedente, «Testo precedente» (apribile) con **«Tieni il nuovo»** (`da_rivedere = 0`) e **«Rimetti il
precedente»** (rimette i campi, `da_rivedere = 0`; il testo precedente resta). Una voce può essere solo **segnalata** (`da_rivedere = 1` con `motivo_revisione`, nessun campo cambiato,
`testo_precedente_json` NULL): il pannello mostra il motivo e il solo «Fatto» (`da_rivedere = 0`). `impronta.cjs` esclude le quattro colonne nuove
(come `validata` di L10). La migrazione 110 aggiunge le colonne solo se mancano.

## 2. Migrazione 110 `110_aree_dei_palazzi.ts` (gioco.db)
La regola sta dentro la migrazione (come 107 e 109). Il calcolo del **nome** riproduce quello che l'interfaccia mostra oggi
(`titoloGruppoImmagini` / `nomePresentazioneMappa` in `src/utils/presentazioneMappa.ts:44-58, 66-76, 86-110`, `senzaGergo` di
`shared/nomiMappe.ts`): l'algoritmo si copia nella migrazione e un test dorato lo confronta con l'uscita `l3aree-dev.json` di Analisi dati
(117 nomi uguali uno per uno).

### 2.1 Passi (una transazione)
1. Crea `infiltrazione_area`, `voce_infiltrazione` e `proposta_infiltrazione_voce` (solo se mancano).
2. **Aree**: per ogni dungeon tranne `mementos` (R3-12), le mappe del sottoalbero di `dungeon-<k>` esclusa la radice (profondità 1, tutti i
   tipi: `area` e la `generica` di Madarame, dubbio 8) con `area_chiave IS NULL`. Raggruppamento per `gruppo_immagini_json.id` (compresi i 3
   `utente:…`), le sciolte una per area. Per ogni gruppo:
   - `nome` = titolo della **versione predefinita** come lo mostra oggi la pagina (dati §5.1, dubbio 10); i titoli diversi delle altre versioni
     restano come nome della versione (`mappa.nome` invariato). Nomi tecnici e «???» di Maruki passano **invariati** (decisione PM c) e vanno
     nell'elenco «da rinominare» del §7;
   - `nome_rivisto` = 1 se il titolo viene da `gruppo.nomeRivisto` o dal `nome_rivisto` della predefinita;
   - `slug` = `slug(nome)` con suffisso `-2`, `-3` sulle collisioni dello stesso Palazzo (ordine di mappa); `chiave` = `dungeon/<k>/<slug>`;
   - `ordine` = `mappa.ordine` minimo delle sue planimetrie (l'ordine della colonna di oggi);
   - `planimetria_predefinita` = la versione con `gruppo.ordine = 0` (sciolte: l'unica) — per 153-7-0 è «Livello -2», ultima nell'elenco;
   - `origine` = `utente` se una planimetria è `utente`, ha `nome_rivisto`, o il gruppo ha id `utente:`; altrimenti `seed`;
   - **152-1-0 di Kamoshida resta un'area sola** (decisione PM a), con le 5 planimetrie.
3. **Planimetrie**: `area_chiave`; `versione_ordine` = posizione nell'**ordine di mappa** (`mappa.ordine`, poi chiave) dentro l'area (decisione
   PM b: quello della pagina del Palazzo, lo stesso nel selettore del visore); `versione_etichetta` = `gruppo.etichetta` dove c'è (187 negli 8
   Palazzi, 203 con Iweleth), NULL per le sciolte.
4. **Legami**: per ogni riga `mappa_entita(entita_tipo='area')` di una planimetria con area → `INSERT OR IGNORE INTO infiltrazione_area`
   (infiltrazione, area della planimetria), `origine='seed'` se la riga `mappa_entita` viene dal seed, altrimenti `utente`; `ordine` = ordine
   minimo delle planimetrie legate (poi `area.ordine`); `planimetria_iniziale` = la planimetria con ordine minore fra quelle **già legate** a
   quell'infiltrazione in quell'area. Risultato atteso **92** (+12 Iweleth).
5. **Pin 777** (dubbio 2): la coppia (`madarame-il-furto-del-cuore-di-madarame`, area di `nativo-rmap-153-5-0`) con `origine='regola'`,
   `planimetria_iniziale` = 153-5-0, solo se entrambe esistono e la coppia manca → **93**. Unica coppia dedotta in tutta la base (dati §2).
   **Sulla copia 0440Z la coppia è già dichiarata dall'utente** (`mappa_entita` area 131, Analisi dati 2026-10-20): il passo 4 la crea con
   `origine` dell'utente e questo passo non scrive niente (la condizione «la coppia manca» è falsa). Il totale resta **93** (105 con Iweleth),
   tutte da legami dichiarati. Il passo resta per le basi vecchie (pacchetto iniziale).
6. **Diario** (decisione dell'utente, 2026-10-20: «non deve essere nascosta ma selezionabile… attingendo alle infiltrazioni già esistenti nel
   palazzo»; poi estesa a **tutte** le voci di Palazzo, di ogni Palazzo e ogni giorno; poi **insieme ordinato**): **nessuna migrazione scrive
   legami** (`voce_infiltrazione` resta vuota). La 110 crea la tabella delle **proposte**:
   ```sql
   CREATE TABLE proposta_infiltrazione_voce (
     voce_uid             TEXT NOT NULL,              -- uid completo della voce del diario
     infiltrazione_chiave TEXT NOT NULL REFERENCES dungeon_area(chiave) ON DELETE CASCADE,
     ordine               INTEGER NOT NULL,           -- posizione nell'insieme proposto (la stessa infiltrazione può tornare: N2)
     infiltrazione_chiave TEXT NOT NULL REFERENCES dungeon_area(chiave) ON DELETE CASCADE,
     regola               TEXT NOT NULL CHECK (regola IN ('nome-nel-testo', 'data-nel-nome', 'ordine', 'orari-dei-segni', 'inizio-fine', 'boss-finale', 'letta-voce-per-voce')),
     motivo               TEXT NOT NULL,              -- la frase mostrata all'utente («La data è nel nome del tutorial»)
     certezza             TEXT NOT NULL CHECK (certezza IN ('certa', 'multipla', 'probabile')),
     PRIMARY KEY (voce_uid, ordine)
   );
   ```
   Una proposta **non è** un legame: si mostra accanto al campo e diventa legame solo con «Conferma». **Fonte delle proposte** (decisione del
   PM, 2026-10-20, su richiesta dell'utente di validarle sulle fonti): la tabella **G-022 dell'Esperto della guida** (`guida/registro.md`), che
   parte dal censimento voce per voce di `dati.md` §8 (`l3diario-prod.json`) e lo verifica sulle fonti; il censimento è solo il punto di partenza.
   La 110 vi scrive le righe di G-022 (uid completi e chiavi delle infiltrazioni già risolte — mai per prefisso né per «ordini 0–3» interpretati a
   mano) con la certezza che G-022 assegna (**certa**, **multipla** con l'insieme ordinato, **probabile**); nessuna per le ambigue né per le n/a.
   **Se G-022 non è pronta quando BE implementa la 110**, la 110 crea la tabella vuota e le proposte entrano con una migrazione dedicata (il primo
   numero libero) quando G-022 arriva: il campo funziona lo stesso (senza proposte) e nessun legame si scrive. Ogni riga controlla che uid e
   infiltrazione esistano e che l'infiltrazione sia del Palazzo citato; altrimenti la migrazione si ferma con un errore leggibile. Per le voci
   di Palazzo **nuove** (scritte dopo) le proposte si calcolano **a richiesta** con le due regole certe (§3.4: nome dell'infiltrazione nel testo; data
   nel nome dell'infiltrazione).
   **G-022 in cifre** (registro, righe K1…R8): 45 voci, 34 con infiltrazioni, 11 senza (K5, K7, M4, M7, M8, M9, B3, B5, O4, R4, K8: campo vuoto,
   nessuna proposta). Casi che il modello deve reggere: N2 (11-14, `dece90bf…`) = 10, 11, 12, **11**, 13 (ripetizione); R2 (01-12) = 0, 4, 5, 6
   (parte dall'inizio, salta); B4 (06-27) = 3 Caveau sotterraneo (il furto di Kaneshiro, che non ha un'infiltrazione «furto»); R5–R8 (02-03) = 11 su
   quattro voci. Le chiavi si risolvono per **numero d'ordine dell'infiltrazione nel suo Palazzo** come li elenca G-022 («0 Entrata del Casinò»),
   controllando che il **nome** coincida con `dungeon_area.nome`: una differenza ferma la migrazione (mai un abbinamento a occhio).
   **Correzioni del team sul diario dopo il 06-01** (decisioni del PM, 2026-10-20, regola dell'utente «aggiungile poi le rivedo insieme al resto»;
   meccanismo del §1.4: `testo_precedente_json`, `da_rivedere = 1`; il diario validato 04-01..06-01 non si tocca):
   - **(a) F4, 08-03** (`c9efdb83a3eeb29a6ceea9a6f6cc2ea2`): nell'`azione` «Camera del Rigetto e della Camera del Rimorso» diventa «Camera della
     vacuità» — il nome che usa la guida (G-028 dell'Esperto, 2026-10-20, che corregge il «Camera del Vuoto» di prima); testo risultante
     «Palazzo di Futaba: esplorazione della Camera della vacuità, risoluzione di puzzle…» (la sostituzione esatta del pezzo: il resto del testo
     resta; se il pezzo non si trova com'è scritto, la migrazione si ferma); `motivo_revisione` = «Il 3/8 la guida esplora la Camera della
     vacuità; Rigetto e Rimorso sono del 1/8 (G-022, G-028)». La proposta resta l'infiltrazione 9, oggi chiamata nell'app «Santuario Interno /
     Camera del Vuoto»: anche quel **nome** è da rivedere (la guida dice «Camera della vacuità»), ma è un dato curato e **non si rinomina** in
     migrazione: va nell'elenco «da rinominare» del §7.3.
   - **(b) N1, N2, N3** (`7dd92df2…`, `dece90bf…`, `589d82e8…`, uid completi nel registro): `riferimento_tipo/chiave` da `confidente:makoto` a
     `dungeon:niijima`; il campo «Infiltrazioni» compare e mostra la proposta di G-022. `riferimento_testo` invariato.
   - **(c) Nomi della guida come nota** (G-022, «Nomi»; R3 dei requisiti aggiornati): B1 06-20 (`65fdbeab…`) → in `note` si aggiunge, dopo il testo
     di oggi, «Nella guida: Cerca il boss della mala»; S1 11-24 (`527cf983…`) → «Nella guida: Ponte anteriore». Il nome della voce resta quello
     dell'app.
   - **(d) Voci nuove nei giorni d'infiltrazione senza voce** (decisione PM c), `aggiunta_da='team'`, `da_rivedere = 1`, uid nuovo, in fondo alla
     fascia, testi in italiano dall'Esperto (seguito di G-022): **Kaneshiro 06-26, giorno** (la lettera si invia la domenica 26/6 al
     Ritrovo; il 25/6 arriva solo il promemoria e la sera si fanno i grimaldelli — correzione dell'Esperto, che sostituisce il 25/6),
     «Ritrovo: invio della lettera di sfida a Kaneshiro (la consegnano Ryuji e Makoto)», `tipo` palazzo, riferimento `dungeon:kaneshiro`, nessuna
     infiltrazione (n/a); in fondo alla fascia del giorno, dopo B3 (`80914911…`, «Giornata libera»), che resta com'è. **Per Niijima 11-13, Maruki 10-03 e Maruki 01-02 la premessa non regge**: lettura di
     `data/gioco.db` di oggi — quei giorni **hanno già** le loro voci d'infiltrazione, ma con riferimento a un Confidente e per questo fuori dalle 45:
     11-13 `ebe00e6b2fe3f80a827f88f5503165fc` («Palazzo di Sae: infiltrazione nel casino, ottenimento della Tessera socio…», `confidente:makoto`) e
     11-13 sera `7c0814176b193cad29d15ec00ffe891c` («Completare l'infiltrazione del palazzo», `confidente:makoto`); 10-03
     `8742bcf962a80c28b81ab272ee5d5014` («Dungeon sconosciuto: ingresso e sala d'ingresso, ricerca di Kasumi…», `confidente:kasumi`); 01-02
     `09e38fddc12a2cce9d5abec6ffc6e7aa` («Palazzo sconosciuto: obiettivo Trova il signore del Palazzo…», `confidente:maruki`). Aggiungere una voce
     nuova le **duplicherebbe**. Scelta prudente applicata (§7.13, chiesta al PM): **nessuna voce nuova** in quei tre giorni; tre delle quattro voci
     ricevono la **proposta** con l'insieme di G-022 (11-13 giorno: 0, 1, 2, 5, 6, 3, 7, 4, 8, 9, 10; 10-03: 0, 1; 01-02: 0, 1, 2). La **11-13
     sera** (`7c0814176b193cad29d15ec00ffe891c`, «Completare l'infiltrazione del palazzo») è sospetta — la sera non si entra nei Palazzi (seguito
     di G-022) — e, per decisione del PM del 2026-10-20, si **segnala** soltanto: testo, riferimento e ogni altro campo invariati, nessuna proposta,
     `da_rivedere = 1` con `motivo_revisione` = «La sera non si entra nei Palazzi: il testo va rivisto (Esperto della guida)». Per tutte e quattro il **riferimento al Confidente resta invariato** (confermato dal PM il 2026-10-20: la voce
     parla anche del Confidente e il campo «Infiltrazioni» è indipendente dal riferimento; la decisione (b) vale solo per N1–N3).
   **Su quali voci compare il campo** (regola unica, `palazzoDellaVoce(voce)` in `giornataService.ts`): il Palazzo è quello del riferimento
   `dungeon:<k>`; altrimenti quello delle infiltrazioni già nell'insieme della voce; altrimenti quello della sua proposta. Nessuno dei tre → niente
   campo. Così le 3 voci con la proposta (11-13 giorno, 10-03, 01-02) mostrano il campo senza toccare il riferimento; la 11-13 sera, senza
   proposta, non lo mostra (§7.13); il controllo «solo
   infiltrazioni del Palazzo della voce» usa lo stesso Palazzo.
   Ogni scrittura controlla prima l'uid, la data (mai fra 04-01 e 06-01 — il formato è `MM-DD` e l'anno di gioco va da aprile a marzo, quindi il
   controllo è `data BETWEEN '04-01' AND '06-01'`, non un `<=`) e il valore atteso di oggi; un valore diverso ferma la migrazione.
   **Anomalie che restano senza scrittura**: 6 voci che nominano il Palazzo solo nel testo (2 Kaneshiro, 3 Madarame, 1 Kamoshida: quelle del
   validato restano come sono; il campo compare quando l'utente ne corregge il riferimento); K8 04-18 («Saluta Kamoshida e Kawakami», il
   professore): G-022 dice di togliere il riferimento al Palazzo, ma è nel diario validato → **nessuna scrittura**, resta nell'elenco per l'utente.
7. Nessuna cancellazione: `mappa_entita`, `mappa.entita_*`, `gruppo_immagini_json` restano (L11). Log `info` con i conteggi.

### 2.2 Verifiche prima/dopo (test della migrazione + prova sulla copia di produzione migrata a 109)
| Misura | Atteso dopo |
|---|---|
| aree dei Palazzi | **101** (117 con Iweleth): 10/8/13/18/11/13/16/12 (+16) — R3-03 |
| planimetrie dei Palazzi con area / senza | **219** (245) / **0** — R3-02 |
| planimetrie con etichetta | 187 (203) |
| `infiltrazione_area` | **93** = 92 + pin 777 (105) — R3-06 |
| infiltrazioni senza aree / aree senza infiltrazione | 15 / 31 (35) |
| voci del diario con infiltrazioni | **0** (`voce_infiltrazione` vuota: il legame nasce solo dalla scelta dell'utente); `proposta_infiltrazione_voce` = le righe di G-022 per le 34 voci con infiltrazioni (N2 con 5 posizioni e l'11 due volte) + le 3 voci del §2.1.6(d) (11-13 giorno, 10-03, 01-02) |
| voci del diario corrette dal team | **6**, tutte dopo il 06-01, con `da_rivedere = 1` e `testo_precedente_json` uguale ai valori di prima: F4 (`azione`), N1–N3 (riferimento), B1 e S1 (`note`); ogni altra colonna di `voce_giornata` invariata; le 255 voci 04-01..06-01 identiche (impronta di riferimento `ff3033cb…`, base 0503Z) |
| voci solo segnalate | **1**: 11-13 sera `7c081417…`, `da_rivedere = 1` con `motivo_revisione` dell'Esperto, `testo_precedente_json` NULL, nessuna proposta, ogni altra colonna invariata |
| voci nuove | **1** (Kaneshiro 06-26 giorno, lettera di sfida al Ritrovo), `aggiunta_da='team'`, `da_rivedere = 1`, in fondo alla fascia; nessuna voce esistente cambia `ordine` |
| `mappa_entita` area / `entita_*='area'` / gruppi | 130 / 105 / invariati |
| aree del mondo (109) | invariate (22); `gruppo_immagini_json` del mondo invariato |
| Memento | nessuna area, nessun legame; risposta di `GET /api/compendio/dungeon/mementos` identica byte per byte (R3-12) |
| voci, pin, `spillo_voce`, destinazioni, pezzi, copie, atterraggi, `punto_partita`, `spillo_partita` | invariati uno per uno |
| impronta `impronta.cjs` | identica per Kamoshida e Madarame; per il diario identica sui campi dell'impronta (il campo nuovo è fuori) |
| radice `dungeon-kamoshida` | spilli 1735, 1816 e il riferimento di 1815 invariati (dubbio 6) |
Idempotenza (R3-10): seconda esecuzione = 0 righe toccate.

### 2.3 Regole che impediscono il ritorno a planimetrie sciolte (R3-26) e pacchetto (R3-11)
- `POST /api/mappe` con genitore `dungeon-<k>` (o una sua discendente) → 409 `usa-aggiungi-area` (come il mondo in L2). L'editor resta per
  pin, ritagli, pezzi e passaggi.
- Pacchetto delle mappe: i campi di L2 (`aree` in testa con `dungeon`, `area` e `versione` per mappa) più `legami?: Array<{ infiltrazione, area,
  ordine, planimetriaIniziale, origine }>`; il campo vecchio per mappa `aree?: string[]` (le infiltrazioni) si **continua a scrivere** come
  «infiltrazioni dell'area della planimetria» per i lettori di pacchetti vecchi, e un pacchetto vecchio senza `legami` si importa traducendo
  `aree` in legami all'area (`INSERT OR IGNORE`), dopo aver assegnato le aree con `assegnaAreePalazzi(db)` (copia della regola §2.1.2-3).
  Round-trip esporta→importa su copia: stesse aree, versioni, legami.
- **Andata e ritorno identica, campo per campo** (difetti trovati da Test no-reg, `lotti/L1/noreg.md` §5, già presenti prima di L1; L3 riscrive
  il pacchetto e li corregge qui):
  1. `mappa.nome_rivisto` (082) si azzerava su 38 planimetrie → il pacchetto porta `nomeRivisto` per mappa e l'import lo scrive;
  2. i **16 pin seed** dei Palazzi diventavano `origine='utente'` → il pacchetto porta `origine` per pin (e per mappa e area) e l'import la
     conserva (con `origine` forzata solo se il chiamante la chiede esplicitamente, come oggi per i pacchetti di seme);
  3. la fonte di `mappa_entita` diventava «pacchetto» → `fonte_json` viaggia e si conserva (finché la tabella esiste, L11), e così
     `infiltrazione_area.origine`;
  4. `updated_at` degli stati dei pin (`spillo_partita`) riscritto all'import anche a valori uguali → si scrive solo se il valore cambia
     (confronto prima dell'`UPDATE`/`INSERT OR REPLACE`), e lo stesso per `updated_at` di mappe e pin.
  Regola generale per BE: ogni colonna esportata si reimporta identica; ogni colonna non esportata non si tocca.

## 3. API e DTO

### 3.1 DTO (`shared/types.ts`, BE)
**Regola per i Memento** (R3-12; decisione del PM su NR3-1, strada (a), 2026-10-20): ogni campo **nuovo** di questo paragrafo è **facoltativo**
nel tipo (`campo?:`) e il server lo **emette solo per i Palazzi**; per i Memento (radice `dungeon-mementos`, i suoi dedali e le planimetrie) il
campo è **assente**, non vuoto, così la risposta delle API dei Memento resta **identica byte per byte** a prima del lotto (test di confronto
sul JSON serializzato: `GET /api/compendio/dungeon/mementos`, i dedali, le loro planimetrie e le voci con riferimento `dungeon:mementos`). Il FE
tratta l'assenza come «nessuna area». Dove sotto si legge «vuoto per i Memento» vale «assente per i Memento».
- `AreaRiassuntoDto`/`AreaDettaglioDto` di L2 valgono per i Palazzi (contenitore `dungeon`). In più, per i Palazzi:
  `AreaRiassuntoDto.infiltrazioni: Array<{ chiave: string; nome: string; ordine: number }>` (vuoto nel mondo) e
  `AreaRiassuntoDto.raccolta: { n: number; presi: number | null }` (somma dei collezionabili delle sue planimetrie, dalla `raccoltaMappe` di oggi).
- `DungeonDettaglioDto` (`shared/types.ts:1934`): campo nuovo **`areePalazzo?: AreaRiassuntoDto[]`** (assente per i Memento); `planimetrie`
  (1943) resta e ogni elemento prende `area?: string` (chiave) e `versioneEtichetta?` (assenti per i Memento); il suo `aree` per planimetria (le infiltrazioni) si
  calcola dai legami dell'area (per compatibilità dei lettori finché il FE non è passato).
- `AreaDungeonDto` (1801): `mappe` = le planimetrie delle aree legate (§1.2), ciascuna con `area?: string`; campo nuovo
  `areePalazzo?: Array<{ chiave: string; slug: string; nome: string; planimetriaIniziale: string | null }>` (assente per i dedali dei Memento).
  Per i Memento `mappe` resta come oggi, senza campi nuovi.
- `AzionePercorsoDto` (1139), per le voci che hanno un Palazzo secondo `palazzoDellaVoce` (§2.1.6, mai i Memento): `infiltrazioni?: Array<{
  chiave: string; nome: string }>` (l'insieme scelto, **in ordine**, ripetizioni comprese; vuoto = nessuna), `infiltrazioniDelPalazzo?: Array<{
  chiave: string; nome: string; ordine: number }>` (le opzioni, già esistenti nel Palazzo), `propostaInfiltrazioni?: { infiltrazioni: Array<{
  chiave; nome }>; motivo: string; certezza: 'certa' | 'multipla' | 'probabile' } | null` (solo se l'insieme è vuoto), `infiltrazioneDaAprire?:
  string`. Per le altre voci (Memento comprese) i campi sono assenti. I campi del §1.4/§4.4 (`daRivedere?`, `aggiuntaDa?`, `motivoRevisione?`,
  `testoPrecedente?`) si emettono solo quando valorizzati (`daRivedere` vero o testo precedente presente): una voce mai toccata dal team ha la
  risposta di prima.
- `MappaRiassuntoDto.area` / `casa` (L2) valgono anche per le planimetrie dei Palazzi; per quelle dei Memento `area` resta assente (la `casa`
  di L2 c'è già per tutte le mappe e non cambia: `/guida/mappe/<pubblica>`).

### 3.2 Casa e risoluzione (estende `casaMappa.ts` di L2)
| Mappa | Casa |
|---|---|
| radice `dungeon-<k>` di un Palazzo (non Memento) | `/guida/dungeon/<k>` |
| planimetria con area di un Palazzo | `/guida/dungeon/<k>/area/<slug>` + `?planimetria=<pubblica>` se non è la predefinita |
| Memento (radice e planimetrie) | `/guida/mappe/<pubblica>` (invariata, R3-12) |
- `risolviPercorsoMappa` (`contenutiGuidaService.ts:34-43`): per un `guida_alias` (80 nei Palazzi) la destinazione diventa la casa
  dell'infiltrazione: `/guida/dungeon/<k>?infiltrazione=<i>` (prima `mappaPalazzo` + `?area=`); `destinazioneGuida` (22-28) dà anche `casa`.
- **Alias che puntano a una versione secondaria** (punto 3: `palazzo-di-madarame-museo-1p` → `153-2-1`, 3 pin): il redirect **conserva** la
  versione a cui l'alias porta oggi (si apre l'area Museo 1P con `?planimetria=…-153-2-1`), con l'avviso delle versioni senza pin/poche e i
  conteggi del selettore che rendono la predefinita (153-2-0, 52 pin) a un tocco. Motivo: è la stessa regola di L2 (un indirizzo salvato
  apre ciò che apriva), l'alias è un dato storico che il redirect non deve correggere in silenzio, e l'utente ottiene comunque l'area giusta.
  Alternativa (da approvare §7): portare gli alias sulla predefinita dell'area.

### 3.3 Rotte
- **Riusate da L2** con `:contenitore = dungeon` (nessuna rotta nuova per le aree): `GET /api/aree/dungeon/:k/:slug`, `POST /api/aree/dungeon/:k`
  (immagine grezza; query `nome`, `etichetta`, `infiltrazioni` = chiavi separate da virgola; niente `x`/`y`: nei Palazzi non c'è
  un'illustrazione con passaggi), `PUT …/:slug`, `PUT /api/aree/dungeon/:k/ordine`, `POST …/:slug/ripristina`, `DELETE …/:slug?conferma=1`,
  `POST …/:slug/planimetrie`, `PUT …/:slug/planimetrie`, `GET /api/aree/da-collocare` (anche dei Palazzi), `PUT /api/aree/colloca` (con
  `dungeon` al posto di `quartiere`).
- **Nuove**: `PUT /api/aree/dungeon/:k/:slug/infiltrazioni` `{ infiltrazioni: string[] }` (dall'area) e
  `PUT /api/compendio/aree/:infiltrazione/aree-palazzo` `{ aree: string[] /* slug, in ordine */, planimetrieIniziali?: Record<string, string> }`
  (dall'infiltrazione): una sola funzione di servizio `impostaLegamiInfiltrazione`, un gesto solo, non sposta voci né pin (R3-23). Errori:
  409 `area-di-un-altro-palazzo`, 404 per chiavi inesistenti.
- **Cambiate**: `POST /api/compendio/dungeon/:k/aree` (crea infiltrazione, `compendio.ts:239`, `bodyNuovaArea` `guidaDungeon.ts:70-73`):
  campo facoltativo `areePalazzo: string[]` (R3-22). `DELETE /api/aree/dungeon/:k/:slug` sui Palazzi: il riepilogo del 409 conta anche le
  **voci con pin** sulle sue planimetrie (le voci restano nelle loro infiltrazioni; i pin vanno nel cestino con l'area) e le infiltrazioni legate.
- **Rotte vecchie dei gruppi e dei legami** (`PUT /api/mappe/:k/aree` 93, `/presentazione` 101, `/stanza` 105): riscritte sul modello nuovo,
  così i client vecchi (e i test) non scrivono più dati che nessuno legge: `/aree` = legami dell'area della planimetria; `/stanza { con: null }`
  = la planimetria diventa un'area a sé (`colloca` con area nuova), `{ con: X }` = va nell'area di X; `/presentazione { etichetta }` =
  `versione_etichetta`, `{ gruppoNome }` = nome dell'area. Restano documentate come «vecchie» nell'OpenAPI; il FE nuovo non le usa.
- Documentazione: `server/openapi/descrizioni/aree.ts` (L2) con il contenitore `dungeon`, `compendio.ts` (aree-palazzo, infiltrazione nel
  diario), `mappe.ts` (rotte vecchie).

### 3.4 Servizi (BE)
- `server/services/mappe/areeService.ts` (L2): contenitore `dungeon`; `assegnaAreePalazzi`; `impostaLegamiInfiltrazione`; raccolta per area.
- `server/services/dungeonService.ts`: `mappeDelleAree` (92-106) e `planimetrieDelPalazzo` (281-304) leggono `infiltrazione_area` + `mappa.area_chiave`
  (non più `mappa_entita`); `dettaglio` aggiunge `areePalazzo`; `creaArea` (597-622) scrive i legami nuovi invece di `impostaAreeMappa` (618);
  `eliminaAreaInTransazione` (519-540): via i legami nuovi (cascata) invece di `staccaAreaDaOgniMappa` (535); `raccoltaMappe` (135-160) invariata
  (conta per planimetria e per Palazzo come oggi: R3-31).
- `server/services/palazziService.ts`: `areeDelleMappe` (63-72) dai legami nuovi; `ingressoDelPalazzo` (188-209) invariato nella scelta, la
  casa la dà il redirect.
- `server/services/mappe/contenutiGuidaService.ts`: `destinazioneGuida` (22-28), `contenutiMappa` (51-67: infiltrazioni della planimetria = quelle
  della sua area; nome dell'infiltrazione da `dungeon_area.nome`, non più `COALESCE(guida_mappa.nome, …)`, R3-09).
- `server/services/mappe/accessoMondoService.ts` (129-146): entità della planimetria dall'area (infiltrazioni dell'area), non da `entita_*`.
- `server/services/mappe/mappeService.ts`: tutti i lettori di `mappa_entita` area / `entita_*='area'` / gruppi elencati in app.md §5
  passano al modello nuovo (`mappaPerEntita` 454, `sincronizzaLegameEntita` 484-507, `verificaAreePalazzo`, `allineaColonneArea`,
  `areeDellaMappa`, `staccaAreaDaOgniMappa`, `areePerPacchetto`, `impostaAreeMappa`, `aggiornaPresentazioneMappa`, `nomeStanzaDaFissare`,
  `impostaStanzaMappa`, `aggiornaMappa` 921/923, export/import); le **scritture** sulle fonti vecchie si tolgono (restano solo i dati di ieri).
- `server/services/azioniStrutturateService.ts` / `giornataService.ts` (97, 99): i campi del §3.1 sulla voce; `impostaInfiltrazioniVoce(uid,
  chiavi[])` (insieme ordinato, anche vuoto; solo infiltrazioni del Palazzo della voce, altrimenti 400 `infiltrazione-di-un-altro-palazzo`;
  la stessa infiltrazione ripetuta è ammessa, ma non in due posizioni consecutive → 400 `infiltrazione-ripetuta-di-seguito`; scrive **solo** `voce_infiltrazione`, sostituendo l'insieme in una transazione); `propostaInfiltrazioni(voce)`: prima le righe
  di `proposta_infiltrazione_voce` (in ordine); altrimenti le regole certe a richiesta —
  (a) il nome di una sola infiltrazione del Palazzo compare nel testo della voce (confronto senza maiuscole, accenti e punteggiatura) → «Il nome
  dell'infiltrazione è nel testo», certa; (b) la data della voce (`gg/mm`) compare nel nome di una sola infiltrazione → «La data è nel nome
  dell'infiltrazione», certa; più candidati o nessuno → nessuna proposta. Rotta: il `PUT` della voce della giornata esistente accetta il campo
  `infiltrazioni` (array ordinato di chiavi, anche vuoto), da solo. Eliminare un'infiltrazione la toglie dagli insiemi (cascata; il cestino la
  rimette con i legami).
- `server/services/catalogoService.ts:312`, `cestinoService.ts:73-77` (etichette): «legame infiltrazione-area» per `infiltrazione_area`.

### 3.6 Scelte di BE dove il progetto taceva (`lotti/L3/be.md` §3), valutate il 2026-10-20
1. **«Sposta la versione» dell'unica versione di un'area** fonde le aree: accolta **con due condizioni**, perché l'area di partenza sparirebbe
   in silenzio e la sua riga (nome, `nome_rivisto`, `seed_json`, `origine`, ordine) non sarebbe più recuperabile.
   - **Cestino**: l'area rimasta vuota non si cancella, va nel cestino come `area-fisica` (stesso `conCestino` del §4.3/L2), con il contesto
     «fusa in <area d'arrivo>»; rimetterla dal cestino ricrea l'area vuota (la versione resta dov'è stata spostata: si riporta con un altro
     «Sposta la versione»). Infiltrazioni legate all'area di partenza (`infiltrazione_area`): passano all'area d'arrivo con `INSERT OR IGNORE`
     (stesso `ordine` e `planimetria_iniziale`, che è la versione spostata) e le righe vecchie vanno nel cestino con l'area, così il ripristino le
     rimette.
   - **Conferma esplicita**: senza `?conferma=1` la rotta risponde 409 `area-si-svuota` con il riepilogo («<Area> resta senza planimetrie: la
     versione si sposta in <Area d'arrivo>, <Area> va nel cestino con N legami a infiltrazioni»); la finestra «Sposta la versione» lo mostra e
     chiede «Sposta e metti <Area> nel cestino». Con più versioni nessuna conferma in più (come oggi).
   «Rendila un'area a sé» sull'unica versione → 400 `gia-area-a-se`: accolta (non cambierebbe nulla).
   Rotte vecchie `/stanza` con `con` + `nome`: l'area d'arrivo con una sola planimetria prende quel nome — accolta solo come **correzione**
   (`correggi` con `seed_json` alla prima modifica di un'area `seed`, così «Ripristina» la riporta) e mai su un'area con `nome_rivisto = 1`
   dell'utente (lì il nome resta e la rotta risponde col nome attuale).
2. **`entita: null` dall'editor non stacca le infiltrazioni**: accolta. Dal L3 i legami stanno sull'**area**, non sulla versione; l'editor di
   una versione non può toglierli all'area intera senza dirlo. Si staccano da «Modifica aree» dell'infiltrazione o da «Infiltrazioni in
   quest'area» (§4.3). La rotta risponde 200 con i legami invariati; OpenAPI lo documenta.
3. **Pin, pezzi e copie reimportati riprendono il loro id**: accolta, è la regola del round-trip identico (§2.3: ogni colonna esportata si
   reimporta identica). Condizione: l'id del pacchetto si riusa solo se è libero o appartiene alla stessa riga (stessa chiave naturale); se è
   occupato da un'altra riga, la riga importata prende un id nuovo e i riferimenti (`spillo_voce`, `spillo_partita`, pezzi, copie, passaggi) si
   rimappano nella stessa transazione, con l'elenco nel riepilogo dell'import. Test: import su base con un id occupato da un altro pin.
   (Implementato in `ae764470`: riferimenti seguiti per uid, elenco nel campo `idCambiati` dell'esito; test «§3.6.3» in palazzi-aree. **Confermato da
   BE** (2026-10-20): senza «sovrascrivi» la mappa presente si salta e i pin non si toccano; con «sovrascrivi» il pin si toglie e torna con lo
   stesso uid riprendendo il suo id appena liberato; l'id cambia solo se nello stesso import un'altra riga l'ha preso. Test «8» (esporta →
   importa con e senza sovrascrivi: tabelle identiche colonna per colonna, id compresi) e seconda reimportazione di «§3.6.3» (`idCambiati`
   assente).)
4. **`server/services/mappe/legamiInfiltrazioni.ts`** (nuovo, per non avere giri di import fra `areeService` e `mappeService`): accolto, in
   elenco al §5 passo 3.

## 4. Interfaccia

### 4.1 Rotte e link
- `src/router.tsx`: `guida/dungeon/:chiave/area/:slug` → `DungeonDettaglioPage` (stessa pagina, area aperta). Query: `infiltrazione` (o `area`,
  vecchio), `planimetria`, `spillo`, `x`/`y`/`zoom`.
- Redirect della casa (L2, `MappaPage` + `RisolviMappa`): `/guida/mappe/palazzo-di-<k>` → scheda (la **griglia** `LuogoSenzaPlanimetria` non si
  raggiunge più per i Palazzi; resta il componente per i casi residui fuori dai Palazzi), `/guida/mappe/<planimetria>` → area e versione
  giuste con `spillo` conservato (R3-15). `RisolviMappa.tsx:13` e `MappaIncorporata.tsx:65` usano la `casa` della guida.
- Metro (punto 1): `MappaTokyo.tsx:391-393` — senza atterraggio `href = /guida/dungeon/<k>` (non più `/guida/mondo/dungeon/<k>`, che finiva
  nella griglia); con atterraggio `urlMappa(planimetria, { spillo })` → redirect all'area con lo spillo (R3-35: stesso posto di oggi).
  `AccessoMondoPage`: `dungeon` → `<Navigate>` alla scheda.
- Scheda (punto 1): il pulsante «Mappa del Palazzo» (`DungeonDettaglioPage.tsx:~435`, `CollegamentoMappa tipo="dungeon"`) **si toglie**: il
  visore è nella scheda stessa.
- Diario (punto 2): `collegamentoAzione` (`src/utils/percorso.ts:36-38`): con `a.infiltrazione` → `/guida/dungeon/<k>?infiltrazione=<i>`;
  senza, e senza atterraggio → `infiltrazioneDaAprire` (prima della proposta, se c'è: §4.4, UX3-1), altrimenti
  `/guida/dungeon/<k>?infiltrazione=in-corso` (§4.4). «Sulla mappa» (10 voci: 153-1-0 ×7, 152-1-0 ×3) invariato
  nel server: in «Oggi» `MappaIncorporata` per chiave (invariato), dalla guida giorno per giorno il redirect porta all'area con lo spillo.
- Altri link alla casa: `ContenutiGuidaMappa.tsx:41` (`?infiltrazione=`), `BattagliaPage.tsx:122`, `RaccoltaPlanimetrie.tsx:75-76`,
  `SchedaPlanimetria.tsx:222`, `PlanimetriePalazzo.tsx:507`, `MappaPage` (indice: sotto un Palazzo le **aree**, come i quartieri in L2), `AlberoLuoghi`.
  `RichiestePage.tsx:146` (Memento) **non** si tocca (R3-16).
- Pin 1656 (Shujin → `152-2-0`): la sua destinazione ha ora un'area (Prigione sotterranea – Tutorial, versione non predefinita): il passaggio
  porta a `/guida/dungeon/kamoshida/area/<slug>?planimetria=…152-2-0` senza cambiare posizione né riferimento (R3-33b).

### 4.2 Pagina del Palazzo (`src/pages/DungeonDettaglioPage.tsx`) — R3-13, R3-14, R3-17, R3-39, R3-41
Lo stato della pagina ha due scelte: l'**infiltrazione** (I) e l'**area** (A).
- Arrivo con `?infiltrazione=I` (o `?area=I`) e senza area → A = la prima area di I (`infiltrazione_area.ordine`), aperta sulla sua
  `planimetria_iniziale`; I senza aree → visore sostituito da «Quest'infiltrazione non tocca ancora aree» con «Collega aree».
- Arrivo su `/area/<slug>` senza infiltrazione → A; I = la prima infiltrazione che tocca A, altrimenti quella di prima/la prima del Palazzo.
- Nessun parametro → come oggi (prima infiltrazione, `DungeonDettaglioPage.tsx:138`) e la sua prima area.
- **Dalla metro** (**Decisione del PM, 2026-10-20**, UX3-4 di Test UX): il cartellino del Palazzo sulla mappa di Tokyo (`MappaTokyo.tsx`) e
  l'arrivo dalla metro senza atterraggio portano a `/guida/dungeon/<k>?infiltrazione=in-corso`, cioè la prima infiltrazione **non completata**
  della partita attiva, come dal diario; se sono tutte completate, o senza partita, la **prima**. Con un atterraggio valido resta la regola
  dell'atterraggio (§4.1). Gli altri arrivi senza parametro (indice, briciole, schede) restano «come oggi».
- Cambiare I non nasconde le aree: le aree toccate da I sono **evidenziate** nell'elenco, le altre restano apribili. Un'area appena aggiunta
  si apre subito nel visore anche senza legami (R3-14, R3-20: sparisce «— scegli una planimetria —», 584, e «Collega una planimetria», ~638-648).
Struttura (stessa grafica di oggi; intestazione con stemma e illustrazione L1 **compatta da 1024 px**):
1. **Intestazione** (≈366-460): invariata nei contenuti (percentuale, finestra, `AtterraggioTokyo`, conteggi), senza «Mappa del Palazzo»; i
   conteggi dicono «N aree · M planimetrie».
2. **Colonna sinistra «Aree · N»** (sostituisce `PlanimetriePalazzo`, ≈525-532): per area numero, nome, chip delle infiltrazioni che la toccano,
   raccolta (n/presi), spunta di completamento = `tutteCompletate(infiltrazioni dell'area)` (`completamentoAree.ts`: stessa regola di oggi per la
   stanza, perché le infiltrazioni dell'area sono l'unione di quelle delle sue planimetrie), «N versioni» se più d'una, maniglia di riordino
   (↑/↓ 44 px e trascinamento come oggi, `PlanimetriePalazzo.tsx:285-289` → `PUT /api/aree/dungeon/:k/ordine`), «Aggiungi area». In coda le
   **infiltrazioni senza aree** (oggi `PlanimetriePalazzo.tsx:420-436`, R3-08) con «Collega aree». Area scorrevole propria con confine evidente.
3. **Centro**: riga dell'infiltrazione (titolo, «infiltrazione N di M», «Modifica testo» come oggi, chip **«Aree toccate»** cliccabili +
   «Modifica aree», selettore compatto delle infiltrazioni); fila delle **versioni** dell'area (componente `VersioniArea` di L2, con conteggi e
   avviso della versione senza pin); visore `MappaIncorporata` sulla versione scelta (≈623), con `contenutiPannello` (L2): «Infiltrazioni in
   quest'area» (chip, tocco = cambia I) e «Modifica planimetria» (editor). Al posto dei chip «Su questa planimetria» (≈598-614) i chip «In
   quest'area»: l'insieme è quello dell'area (accettato: dubbio 1; i conteggi della raccolta restano per planimetria).
4. **Destra «Da raccogliere»** (`RaccoltaPlanimetrie`, ≈653-666): invariata nei numeri (per planimetria e Palazzo, R3-31); i link alla casa.
5. **Sotto**: `GuidaDellArea` (≈670) invariata (voci dell'infiltrazione, filtri, copia/sposta, aggiungi voce).
Formati e altezze (R3-41, memoria «Altezze realistiche»): ≥1280 tre colonne come oggi, colonne laterali con scorrimento proprio, centro con
riga dell'infiltrazione + versioni + visore che riempie l'altezza utile (`calc(100dvh - intestazione compatta - righe)`, minimo 420 px): a
1366×657 e 1280×689 visore e versioni stanno nella prima schermata (oggi il visore è sotto, app.md §10). 768–1279: aree in una fila scorrevole
orizzontale sopra il visore (confine evidente, `overscroll-behavior: contain`), raccolta sotto. <768: intestazione compatta, selettore
dell'infiltrazione, aree in un foglio dal basso («Aree · N»), versioni in fila scorrevole, visore `min(64dvh, 560px)`, raccolta e guida sotto.

**Visore entro metà altezza** (**Decisione del PM, 2026-10-20**, variante R3-41 aperta da FE). Oggi a 1366×657 il visore di Madarame comincia a
y=512 e si vedono solo 145 px di mappa: per chi gioca è il punto più debole della scheda.
- **Obiettivo misurabile**: alle altezze realistiche 1366×657, 1280×689 e 1024×690 il **bordo superiore del visore è ≤ metà dell'altezza
  della finestra** (≤ 328, 344, 345 px dall'alto, misurati dal DOM a animazioni finite). Vale su tutti i Palazzi, con l'infiltrazione più
  lunga di ognuno: Madarame, Kamoshida, Maruki, Shido.
- **Intestazione del Palazzo più compatta** da 1024 px:
  - lo stemma come la variante G1 di L1 (stemma piccolo accanto al titolo, non in riquadro alto);
  - i dati secondari (finestra del Palazzo, atterraggio, conteggi «N aree · M planimetrie», percentuale) su **una riga** sotto il titolo,
    con i chip che vanno a capo solo se la riga non basta;
  - l'illustrazione L1 resta come sfondo dell'intestazione o miniatura, non come blocco alto.
- **Riga dell'infiltrazione più bassa**: titolo, «infiltrazione N di M», selettore compatto e chip «Aree toccate» su una riga sola, scorrevole
  in orizzontale se serve (con confine evidente); «Modifica testo» e «Modifica aree» nel menu della riga.
- **Grafica dell'originale**: stessi colori, caratteri, stemma e chip, solo più compatti; nessun elemento tolto.
- **A 768 e a 375 non peggiora nulla**: le misure di oggi sono la soglia (Test layout le confronta prima e dopo); da 1024 in giù valgono le
  regole sopra solo dove migliorano.
- **Test layout**: la misura del bordo del visore sulle tre altezze per i quattro Palazzi; nessuna barra di pagina (§6.6, «ogni Palazzo in una
  schermata»); bersagli ≥ 44 px.

### 4.3 Gestione (R3-20…R3-27)
- **«Aggiungi area»** (Palazzo): finestra di L2 (`FinestraAggiungiArea`) con contenitore `dungeon`: nome, immagine (obbligatoria), etichetta,
  **infiltrazioni da collegare** (caselle, preselezionata quella aperta). Dopo il salvataggio l'area si apre nel visore (prova su Madarame su
  una copia: criterio del piano). Sostituisce «Aggiungi» di `PlanimetriePalazzo.tsx:349`/490-513 (che creava una mappa sciolta e apriva l'editor).
- **«Aggiungi planimetria»** (area): finestra di L2; la nuova versione si apre nel visore (DECISIONI 2026-10-18).
- **«Aggiungi infiltrazione»**: `ModuloNuovaArea` di oggi (`PlanimetriePalazzo.tsx:483-488`) + «Aree toccate» (caselle) → `areePalazzo`.
- **«Modifica area»** (finestra di L2): nome, predefinita, versioni (etichetta, ↑/↓, elimina, editor) e **infiltrazioni** (caselle) →
  `PUT …/infiltrazioni`. Sostituisce `SchedaPlanimetria` («Gestisci»: nome dell'area, «Che cosa mostra», «Rendila un'area a sé», «Sposta in
  un'altra area»): «Sposta in un'altra area» diventa «Sposta la versione in un'altra area» (`PUT /api/aree/colloca`), «Rendila un'area a sé»
  = colloca in un'area nuova. Spostare l'**unica** versione chiede la conferma del §3.6.1 («Sposta e metti <Area> nel cestino»).
- **«Modifica aree»** dell'infiltrazione: caselle delle aree del Palazzo + ordine → `PUT /api/compendio/aree/:i/aree-palazzo`.
- **Elimina**: area → cestino `area-fisica` (L2) con il riepilogo («3 planimetrie, 52 pin di cui 40 collegati a voci, 2 infiltrazioni»: le voci
  restano); planimetria → cestino `mappa` (regole di L2: non l'ultima, ingressi/atterraggi elencati); infiltrazione → cestino `area` come oggi.
  `NOME_TIPO_CESTINO` (`src/utils/cestino.ts:16-21`) con «Area» per `area-fisica` (L2).
- **Da collocare**: la sezione di L2 elenca anche le planimetrie dei Palazzi senza area (0 dopo la migrazione).
- **Ripristina** (R3-27): come L2 sulle aree `seed`.

### 4.4 Diario: il campo «Infiltrazione» e «Entra» (R3-37, decisione dell'utente)
- **Campo visibile** su **ogni** voce del diario che ha un Palazzo secondo `palazzoDellaVoce` (§2.1.6: riferimento `dungeon`, oppure insieme o
  proposta di infiltrazioni — le 3 voci con riferimento a un Confidente e una proposta comprese; ogni Palazzo, ogni giorno), sia nella vista del diario
  (`GiornoGuida` / `PartiAzione.tsx`, accanto al cartellino del Palazzo) sia nel modulo di modifica della voce: «Infiltrazioni:» seguito dai chip
  dell'insieme **in ordine** (ognuno con ↑/↓ da 44 px e «togli») e «Aggiungi infiltrazione» (selettore con le infiltrazioni **già esistenti** di
  quel Palazzo, comprese quelle già nell'insieme perché un percorso può tornare in un'infiltrazione — G-022, N2; le ripetute hanno accanto
  «(di nuovo)»; esclusa solo l'ultima dell'insieme, per non ripeterla di seguito); vuoto di partenza = «nessuna». Ogni cambio salva subito (`PUT` della voce con il solo campo
  `infiltrazioni`) e non tocca nient'altro della voce. Su telefono il campo si apre come foglio dal basso.
- **Proposta**: se la voce ha una proposta (§2.1.6) e l'insieme è vuoto: «Proposta: Vecchio Castello, Tetto del Vecchio Castello, Ispeziona
  l'interno della torre — la voce descrive più infiltrazioni» (o «… — la data è nel nome del tutorial») con la certezza e **«Conferma»** (scrive
  l'insieme proposto, nell'ordine). Con l'insieme valorizzato la proposta non si mostra; svuotato, torna.
- **Pulsante della voce** («Entra», collegamento al Palazzo, `collegamentoAzione` `src/utils/percorso.ts:36-38`): con l'insieme valorizzato →
  `/guida/dungeon/<k>?infiltrazione=<prima non completata dell'insieme>` (calcolata dal server per la partita attiva: campo
  `infiltrazioneDaAprire` nel DTO; se sono tutte completate, l'ultima dell'insieme). **Insieme vuoto con una proposta** (**Decisione del PM,
  2026-10-20**, UX3-1 di Test UX, R3-37: la voce porta alla sua infiltrazione) → la **prima infiltrazione della proposta**, qualunque sia la
  certezza: il server la mette in `infiltrazioneDaAprire` e il collegamento è `/guida/dungeon/<k>?infiltrazione=<i>&daVoce=<uid>`. Se la proposta
  **non è «certa»** (multipla o probabile), la scheda del Palazzo, arrivando con `daVoce`, mostra sopra il visore la riga «Aperta dalla proposta
  della voce del <data>: <infiltrazioni> (<certezza>)» con **«Conferma»** (scrive l'insieme proposto, come nel diario) e «Chiudi»; con la proposta
  «certa» nessuna riga. Insieme vuoto **senza** proposta → `?infiltrazione=in-corso`: la **prima infiltrazione non completata** del Palazzo,
  altrimenti la prima. Il parametro `daVoce` non cambia nient'altro e la scheda lo toglie con `replace` dopo «Conferma» o «Chiudi».
- Il pulsante «Entra» del piano (Metaverso → scheda come vista di gioco) usa lo stesso indirizzo; in L3 il collegamento della voce **è** l'«Entra».
- **«Da rivedere»** (§1.4; lo stesso componente che L10 usa per le sue 8 voci): chip accanto alla voce con `da_rivedere = 1`; toccato apre «Aggiunta
  dal team, da rivedere» (voce nuova), «Corretta dal team» con «Testo precedente» (i campi di prima, in grigio) e i due pulsanti da 44 px «Tieni il
  nuovo» / «Rimetti il precedente», oppure «Segnalata dal team» con il motivo e «Fatto»; il motivo (`motivo_revisione`) si mostra in tutti e tre i
  casi quando c'è. DTO della voce: `daRivedere: boolean`, `aggiuntaDa: 'team' | null`, `motivoRevisione: string | null`, `testoPrecedente: {
  azione, note, riferimento } | null`; rotta `POST /api/compendio/percorso/voci/:uid/rivista` `{ esito: 'tieni' | 'rimetti' | 'fatto' }` ('rimetti'
  solo con un testo precedente, altrimenti 400) accanto al `PUT /percorso/voci/:uid`
  (`server/routes/compendio.ts:137`; servizio in `giornataService.ts`, schema zod accanto a `bodyAggiornaVoce`).

### 4.5 Testi (vocabolario L0)
«Aree · N» · «N aree · M planimetrie» · «Aree toccate» · «Modifica aree» · «Infiltrazioni in quest'area» · «In quest'area» · «Collega aree» ·
«Quest'infiltrazione non tocca ancora aree» · «Aggiungi area» · «Aggiungi planimetria» · «Aggiungi infiltrazione» · «Modifica area» ·
«Sposta la versione in un'altra area» · «Infiltrazione» (selettore della voce del diario) · i testi di L2 per versioni e finestre.
Spariscono: «— scegli una planimetria —», «Collega anche a», «Collega una planimetria», «Scollega questa planimetria», «Mappa del Palazzo»,
«Questa mappa non ha una pianta sua: raccoglie le mappe qui sotto» (per i Palazzi).

## 5. File e ordine (senza sovrapposizioni)
**BE** (dopo L2 consegnato):
1. `shared/types.ts` (§3.1, `InfiltrazioneDto`), `shared/organizzazioneMappe.ts` (destinazione della guida con `casa`).
2. `server/db/migrations/110_aree_dei_palazzi.ts` + test (dorato sui 117 nomi di `l3aree-dev.json`; conteggi §2.2; idempotenza) + `index.ts`.
3. `server/services/mappe/areeService.ts`, `legamiInfiltrazioni.ts` (nuovo, §3.6), `casaMappa.ts` (estensioni), `dungeonService.ts`, `palazziService.ts`, `contenutiGuidaService.ts`,
   `accessoMondoService.ts`, `mappeService.ts` (lettori e scritture del §3.4, export/import), `azioniStrutturateService.ts`, `giornataService.ts`,
   `catalogoService.ts`, `cestinoService.ts`.
4. `server/schemas/aree.ts`, `server/schemas/guidaDungeon.ts` (70-73), schema della voce della giornata; `server/routes/aree.ts`, `compendio.ts`
   (239, rotta nuova `aree-palazzo`), `mappe.ts` (rotte vecchie riscritte).
5. OpenAPI; test BE (§6.1); typecheck; lint.
**FE** (non tocca `server/` né `shared/`):
1. `src/services/api` (aree-palazzo, voce con infiltrazione); `src/utils/percorso.ts`; `src/utils/completamentoAree.ts` (funzione per area).
2. `src/router.tsx`; `src/pages/DungeonDettaglioPage.tsx`; `src/pages/AccessoMondoPage.tsx`; `src/pages/MappaPage.tsx`; `src/pages/BattagliaPage.tsx`.
3. `src/components/guida/`: nuovo `AreePalazzo.tsx` (al posto di `PlanimetriePalazzo.tsx`, che si toglie con i suoi usi), `FinestraLegamiInfiltrazione.tsx`,
   `SchedaPlanimetria.tsx` (tolta, sostituita dalle finestre di L2), `RaccoltaPlanimetrie.tsx`, `ModuloNuovaArea` (aree toccate), `GiornoGuida.tsx`
   (selettore dell'infiltrazione); `src/components/mappe/`: `MappaTokyo.tsx`, `ContenutiGuidaMappa.tsx`, `RisolviMappa.tsx`, `MappaIncorporata.tsx`,
   `AlberoLuoghi.tsx`, `ImmaginiLuogo.tsx` (non più usato per Palazzi e mondo; resta solo se ha altri lettori, altrimenti L11).
4. `src/utils/gruppiPlanimetrie.ts`, `presentazioneMappa.ts`, `etichettaVersione.ts`: le funzioni sui gruppi non servono più a Palazzi e mondo;
   si lasciano finché hanno lettori (L11), nessuna vista nuova le usa.
5. Stili; test FE (§6.2); typecheck; lint.

## 6. Piano dei test

### 6.1 BE
1. Migrazione 110 su copia ridotta (Kamoshida con 152-1-0, 151-6-0 e i 3 gruppi `utente:`; Madarame con 153-5-0/pin 777, 153-7-0 e il labirinto;
   un Palazzo con infiltrazioni senza planimetria; Iweleth; Memento): conteggi §2.2, nomi dorati, versioni nell'ordine di mappa con predefinita #0
   di gruppo, legami 92+1, nessuna voce del diario toccata (colonna nuova tutta NULL), Memento senza aree, fonti vecchie intatte, idempotenza.
2. `GET /api/compendio/dungeon/madarame`: `areePalazzo` (8) con infiltrazioni e raccolta; `aree` (infiltrazioni) con le stesse voci di prima in
   ordine; `mappe` = planimetrie delle aree legate; percentuali, `raccolta`, `planimetrie` (n/presi), completamenti identici alla risposta di prima
   (confronto JSON sui campi comuni, partita 1 e 2).
3. `GET /api/compendio/dungeon/mementos`: identico a prima.
4. Casa e redirect: radice, predefinita, versione secondaria, Memento invariati; `risolvi/palazzo-di-madarame-museo-1p` → Museo 1P con `153-2-1`;
   un `guida_alias` → `?infiltrazione=`.
5. Legami: `PUT …/infiltrazioni` e `PUT …/aree-palazzo` (stesso esito dai due lati); area di un altro Palazzo → 409; nessuna voce/pin toccati.
6. Aggiungi area con infiltrazioni; aggiungi planimetria; elimina area (409 con riepilogo, poi cestino e ripristino completo); crea infiltrazione
   con `areePalazzo`; elimina infiltrazione (cestino `area` come oggi) → legami spariti e tornati col ripristino.
7. `POST /api/mappe` sotto `dungeon-<k>` → 409; rotte vecchie `/aree`, `/stanza`, `/presentazione` sul modello nuovo.
8. Pacchetto: round-trip; pacchetto vecchio con `aree` per mappa → legami all'area. **Esporta → importa (con e senza `sovrascrivi`) su
   una copia della produzione: impronta identica** su `mappa` (tutte le colonne, `nome_rivisto` e `updated_at` compresi), `spillo` (`origine`,
   `updated_at`), `spillo_partita` (`updated_at`), `mappa_entita` (`fonte_json`), `area`, `infiltrazione_area`, `spillo_voce`, destinazioni,
   pezzi, copie: confronto colonna per colonna, nessuna differenza ammessa (i quattro difetti di `lotti/L1/noreg.md` §5 coperti uno per uno).
9. Voce del diario: campi del §3.1 per una voce di Palazzo e assenti per le altre; `palazzoDellaVoce` sulle voci con riferimento a un Confidente
   (11-13 giorno, 10-03, 01-02: campo presente con la proposta, riferimento invariato; 11-13 sera: senza proposta, quindi senza campo); **scelta**, **aggiunta**, **riordino**, **togli**,
   **«nessuna»** (insieme vuoto); ripetizione non consecutiva accettata (N2: 10, 11, 12, 11, 13 salvata e riletta uguale), consecutiva → 400;
   eliminare un'infiltrazione presente due volte toglie entrambe le posizioni e ricompatta l'ordine; il cestino le rimette nelle posizioni di prima;
   migrazione: le 6 correzioni del team (valori, `testo_precedente_json`, `da_rivedere`), la voce solo segnalata dell'11-13 sera (`motivo_revisione`,
   nessun campo cambiato, «Fatto» la toglie), la voce nuova del 06-26, l'arresto su un uid del 04-01..06-01 e su un
   valore di oggi diverso dall'atteso; «Tieni il nuovo» e «Rimetti il precedente» (§1.4); proposta mostrata solo con l'insieme vuoto; «Conferma» scrive l'insieme proposto nell'ordine
   proposto; infiltrazione di un altro Palazzo → 400; infiltrazione eliminata → tolta dall'insieme (e rimessa dal cestino); `infiltrazioneDaAprire`
   = prima non completata dell'insieme, poi l'ultima; le proposte uguali alle righe certe/multiple/probabili della tabella G-022 dell'Esperto
   e nessuna per le ambigue e le n/a (tabella vuota se G-022 non è ancora arrivata, migrazione dedicata dopo); regole (a) e (b) su voci costruite (un candidato, più candidati, nessuno); **impronta della voce invariata**
   dopo ogni gesto (testo, ordine, giorno, fascia, uid, spunte).
10. Test esistenti da allineare (attese, non cancellati): `dungeon.test.ts` (55), `planimetrie-palazzo`, `stanze-planimetrie`,
    `planimetrie-aree-multiple`, `sulla-mappa-palazzo`, `palazzo-completato`, `nuova-area`, `aree-eliminabili`, `cestino`, `atterraggio-palazzi`,
    `copia-voci-area`, `sposta-voce-area`, `guida-pin`, `guida-modificabile` (74-110), `enigmi-guida` (47, 233), `mappe-editor`,
    `organizzazioneMappe.test.ts`, `avvioImmutabile.test.ts:36`.

### 6.2 FE
1. `DungeonDettaglioPage.test.tsx`: aree con infiltrazioni e versioni; arrivo con `?area=` (vecchio) e `?infiltrazione=`; `/area/<slug>`;
   `?infiltrazione=in-corso`; area nuova aperta subito senza «scegli una planimetria»; chip «In quest'area»; infiltrazione senza aree; riordino;
   completamento delle aree come prima; atterraggio; i blocchi esistenti (453-510, 541, 564-624, 636-702, 715-770, 771-831, 869-1002, 1108-1180,
   1182-1220) riscritti sulle attese nuove, senza perdere i casi.
2. `AreePalazzo.test.tsx` (nuovo); `FinestraLegamiInfiltrazione.test.tsx` (nuovo).
3. `MappaPage.test.tsx` (griglia 99-124 → redirect alla scheda; indice 141), `OrganizzazioneMappe.test.tsx` (30-34, 56-60), `AccessoMondoPage.test.tsx`
   (75-80), `percorso.test.ts` (32-43: `?infiltrazione=`), `MappaTokyo.test.tsx` (49-56), `BattagliaPage.test.tsx:53`, `RaccoltaPlanimetrie.test.tsx`,
   `completamentoAree.test.ts`, `presentazioneMappa.test.ts`; `RichiestePage.test.tsx:58` **invariato**.

### 6.3 Funzionali
- R3-13/14/20 (criterio del piano) su una copia: Madarame, «Aggiungi area» con immagine → compare nell'elenco e nel visore subito, senza «scegli
  una planimetria»; poi eliminata e rimessa dal cestino.
- R3-15/16: ogni strada di app.md §3 (P1–P12) prima/dopo: metro senza atterraggio (Madarame) → scheda; con atterraggio (Kamoshida il 04-15+) →
  area di 151-1-0 col pin d'arrivo; «Mappa del Palazzo» assente; griglia → scheda; indice; alias; Battaglia; P13 (Richieste) invariato.
- R3-18/34/37: `?area=` salvati; le 45 voci di Palazzo di `dati.md` §8: il campo «Infiltrazioni» è visibile e vuoto su quelle con riferimento
  `dungeon`; le certe/multiple/probabili mostrano la proposta (la 04-20 con l'insieme di tre infiltrazioni), le ambigue e le n/a no; una voce
  multipla confermata apre la prima non completata dell'insieme; con una **partita di prova** e la copia dei dati: confermare una proposta, sceglierne un'altra, rimettere «nessuna» —
  il pulsante della voce apre l'infiltrazione scelta, oppure la prima non completata; nessuna alterazione della voce (testo, ordine, giorno,
  fascia, uid, spunte) e ripristino del campo a fine prova; il campo c'è anche sulle voci di Palazzo fuori dal 04-01..06-01 e di altri Palazzi;
  le 10 «Sulla mappa» (153-1-0 ×7, 152-1-0 ×3) e le 2 dei Memento sullo stesso pin di prima (dalla guida giorno per giorno e da Oggi).
- R3-22/23/24/25/27: aggiungi infiltrazione con aree; collega/scollega dai due lati; rinomina/riordina/predefinita/etichetta; elimina e rimetti
  (area, planimetria, infiltrazione); ripristina. Con una **partita di prova** creata e poi rimossa (R3-32): segnare e togliere da guida e mappa.
- R3-33/33b: spilli 1735, 1816, 1815 e pin 1656 portano dove portavano.

### 6.4 UX
- Dal tablet durante un'infiltrazione: dalla voce del diario si arriva alla scheda sull'infiltrazione giusta con la mappa delle sue aree, senza griglia
  né scelte di planimetria (R3-37). Le aree si capiscono come «stanze» del Palazzo; versioni comprensibili; testi di L0 (R3-38).
- Grafica della scheda come oggi: stemma, illustrazione al 100%, visore nel suo spazio (R3-39). Il cambio da «Gestisci» alle finestre di L2 è chiaro.

### 6.5 No-reg
- Impronte di Kamoshida e Madarame identiche; per ogni infiltrazione le stesse voci nello stesso ordine; per ogni pin stessa planimetria,
  posizione, voci; `punto_partita`/`spillo_partita` di p1 e p2 identici; percentuali e completamenti identici (R3-28…R3-31) — elenco voce per voce
  e pin per pin consegnato con la richiesta di rilascio.
- Memento: API **identiche byte per byte** (JSON serializzato prima/dopo di `GET /api/compendio/dungeon/mementos`, dei dedali, delle loro
  planimetrie e delle voci con riferimento `dungeon:mementos`: nessun campo nuovo, nemmeno vuoto — §3.1, NR3-1) e pagina identica (R3-12), Richieste e dedali invariati. Metro e atterraggi (R3-35). Aree del mondo di L2 invariate.
- Diario: impronta del validato 04-01..06-01 identica (255 voci sulla copia 0440Z, riferimento `impronta-0440Z.json`); dopo il 06-01 cambiano solo le 6 voci del §2.1.6 nei soli campi elencati e la 11-13 sera nelle sole colonne di segnalazione, più
  la voce nuova del 06-26; `voce_infiltrazione` vuota dopo la migrazione (il legame nasce solo dalla scelta dell'utente).

### 6.6 Layout
- **Ogni Palazzo in una schermata** (memoria «Altezze realistiche»): le schede di **tutti** i Palazzi (Kamoshida, Madarame, Kaneshiro, Futaba,
  Okumura, Niijima, Shido, **Maruki**, Iweleth) a 1366×657, 1280×689 e 1024×690 senza barra di pagina (`main.scrollHeight <= clientHeight`, misurato
  dal DOM con le animazioni finite). Maruki oggi a 1280×689 ha già la barra (main 638/621, rilievo di FE, presente prima di L1): L3 la toglie.
- Scheda di Madarame, Kamoshida (152-1-0 con 5 versioni), un Palazzo con infiltrazioni senza aree (Futaba), Iweleth: a 1280, 768, 375, 1366×657,
  1280×689, 1024×690; visore e versioni nella prima schermata a 1366×657 e 1280×689 (R3-41); colonne/file scorrevoli con confine evidente e
  overscroll contenuto; bersagli ≥44 px; finestre (aggiungi area/planimetria/infiltrazione, modifica area, modifica aree) senza scorrimento orizzontale.

## 7. Da approvare (scelta prudente applicata)
1. **152-1-0 di Kamoshida un'area sola** (decisione PM a): Prigione -1P/-2P, Sala Centrale, Passaggio sotterraneo, Palestra restano versioni di
   un'area; separarle è «Sposta la versione in un'altra area».
2. **Ordine delle versioni = ordine di mappa** (decisione PM b), predefinita = #0 del gruppo: per 153-7-0 la predefinita («Livello -2») è l'ultima
   del selettore.
3. **Nomi tecnici e «???» invariati** (decisione PM c), elenco da rinominare: «Palazzo di Kaneshiro — Zona che nessuna tabella nativa nomina»,
   «Palazzo di Niijima — Zona che nessuna tabella nativa nomina», l'infiltrazione 9 di Futaba «Santuario Interno / Camera del Vuoto» (la guida:
   «Camera della vacuità», G-028), «Palazzo di Futaba — Planimetria non attribuita», «Palazzo di Shido — Planimetria
   non attribuita», «Palazzo di Niijima» (157-17-0), «Central Street» (Kaneshiro, 154-15-0), le 5 aree di Maruki con «???»; più i titoli diversi
   per versione di 152-1-0, 151-1-0, 151-6-0, 151-7-0 (dati §5.1: l'area prende il titolo della predefinita).
   **E9 (analisi dell'Elenco delle mappe, `lotti/L2/analisi-elenco-mappe.md`, 2026-10-20)**: nomi delle Aree diversi da quelli delle loro
   planimetrie.
   - Due casi, due esiti:
     - «Sala del Tesoro - Atrio» contro «Sala del Tesoro - Atrio - Livello 0» **non è un difetto**: l'Area ha il nome comune e la versione
       tiene il suo titolo con il livello (§2.1 passo 2);
     - «Museo, 1P» e «Museo, 2P» con la virgola, contro «Museo 1P» della planimetria, è **solo punteggiatura**: l'Area ha preso il titolo del
       gruppo come lo mostrava la pagina.
   - Regola: il nome dell'Area **non si corregge in migrazione** (decisione PM c: nomi invariati, un dato curato). Va nell'elenco «da
     rinominare» e quindi nell'elenco «Da rivedere» di L11, con la proposta del nome della planimetria predefinita e il gesto «Rinomina come la
     planimetria» / «Tieni».
   - **Controllo completo, fatto** (Analisi dati, `dati.md` §9, sulla base 0533Z con la 110 applicata, la stessa del 3302): **118 Aree**
     (101 dei Palazzi, 16 di Iweleth e la Prova dell'utente).
     - **Uguali**: 60.
     - **Solo punteggiatura**: 1, `dungeon/madarame/museo-1p`, Area «Museo, 1P» contro la planimetria «Museo 1P». Per coerenza ci va anche
       `museo-2p` («Museo, 2P» → «Museo 2P»). Tutti e due i nomi sono già rivisti dall'utente, quindi vanno nell'elenco «Da rivedere» con
       la proposta.
     - **Diverse nel testo**: 57, solo segnalate.
       - 49 hanno sulla planimetria il suffisso di versione o di inquadratura («— settore d'ingresso»…): è la regola della 110.
       - 2 sono le «Planimetria non attribuita» di Futaba e Shido, già nell'elenco «da rinominare».
       - 5 hanno nomi rivisti dall'utente: la sala del trono della torre di Kamoshida e 4 di Madarame.
       - 1 è a Okumura: «Fabbrica centrale / Linea di smaltimento» contro «Fabbrica centrale».
     Nessuna scrittura.
   **E3 (stessa analisi)**: la carta di un Palazzo nell'indice (`MappaPage.tsx:89-97, 147-173`) dice «17 mappe» contando una per versione. Va
   detto «N aree · M planimetrie», come la scheda del Palazzo (§4.5), con N = Aree del Palazzo e M = planimetrie: per Madarame
   «8 aree · 17 planimetrie». È un pezzo di FE; i conteggi arrivano già dal DTO dell'albero (`area`).
   **E2, deciso dall'utente (Manager, 2026-10-20 06:00Z)**: l'indice `/guida/mappe` mostra i **pin di contenuto** e, accanto, passaggi e note.
   Va nel **rilascio di L3** insieme a E3, E9 e UX3-7: l'indice dei Palazzi si sistema in un colpo solo.
   - **Che cosa si conta**: tre gruppi, con **una sola regola** in `shared/spilli.ts` (`gruppoConteggioSpillo(tipo)`), letta dalla categoria del
     tipo in `DEFINIZIONI_SPILLO`:
     - **passaggi**: i tipi di movimento (passaggio, ingresso, uscita, salita, discesa e gli altri della categoria «movimento»);
     - **note**: le note e le annotazioni senza contenuto di gioco;
     - **contenuto**: tutto il resto, cioè luoghi, negozi, voci, collezionabili, nemici e boss.
     Sui dati misurati da Analisi app i gruppi sono 819 + 695 + 228 = 1742. Se la regola, applicata ai tipi, dà numeri diversi, vale la regola
     (che è una e documentata) e la differenza va spiegata tipo per tipo nel test.
   - **BE**: l'albero (`GET /api/mappe/albero`) porta per ogni nodo e per la radice `conteggiPin: { contenuto, passaggi, note }`, calcolato nel
     server. `numeroSpilli` resta per compatibilità.
   - **FE** (`MappaPage.tsx:122` e le carte `:147-173`):
     - l'intestazione dice «**819 pin** · più 695 passaggi e 228 note», con i numeri dal vivo;
     - le carte di Tokyo e dei Palazzi dicono «N pin», solo di contenuto, accanto a «N aree · M planimetrie» (E3);
     - nessuna somma calcolata nel client.
   - **UX3-7** (stesso rilascio): il titolo «Elenco completo, con tutti i livelli» promette versioni che sotto non ci sono. Scelta prudente
     applicata: (a), il titolo diventa «**Elenco delle aree**». La (b), cioè mostrare le versioni sotto ogni Area con il link, cambia il
     contenuto e si fa solo se FE la propone e si aggiunge qui.
   - **Casi per i tester**:
     - **Test funzionali**: sui dati di 3302, l'intestazione vale 819 / 695 / 228 (o i numeri della regola, con la spiegazione) e la somma è
       uguale al totale degli spilli; Madarame «8 aree · 17 planimetrie · N pin»; aggiungere un pin di passaggio su una copia di prova cambia
       solo «passaggi», e un pin di luogo solo «pin».
     - **Test UX**: la parola «pin» indica le cose del gioco; passaggi e note si capiscono come dettaglio.
     - **Test layout**: l'intestazione sta su una riga a 1280 e va a capo bene a 375.
     - **Test no-reg**: i pin sono gli stessi di prima (cambia solo come si contano).
   **UX3-8 (decisione del Manager, 2026-10-20; segnalazione dell'utente: «ho aggiunto una planimetria di prova» e non la trovava)**, stesso
   rilascio. Oggi la griglia di un Palazzo in `/guida/mappe` (`GriglieDelLuogo`, `MappaPage.tsx:376-415`) nasconde **ogni** planimetria
   senza pin dietro «Mostra le planimetrie senza spilli · N», anche le Aree vere appena aggiunte (la «Prova» di Kamoshida, 0 pin).
   - **Regola**: ogni **Area** o planimetria con un **nome vero** resta **nella griglia**, anche senza pin, con l'etichetta «**nessun pin**» al
     posto del numero. Il gruppo chiuso vale **solo** per i fogli dell'estrazione **senza nome vero**, e si chiama «**Fogli dell'estrazione
     senza nome · N**».
   - **Nome vero**: una sola funzione, `nomeTecnicoMappa(m)` in `src/utils/presentazioneMappa.ts`, cioè lo stesso controllo di oggi
     (`senzaNomeVero`, `MappaPage.tsx:399`: «nessun campo usa») più «Planimetria non attribuita». Un'Area con un nome dato dall'utente non è
     mai tecnica.
   - **Ordine**: prima le Aree con nome vero, nell'ordine dell'Area (con o senza pin); poi i fogli tecnici con pin; il gruppo chiuso con i fogli
     tecnici senza pin. I numeri dei pin sono quelli di E2 (`conteggiPin.contenuto`).
   - Vale per Palazzi e quartieri, perché `GriglieDelLuogo` è lo stesso componente.
   - **Casi per i tester**:
     - **Test funzionali**: la «Prova» di Kamoshida (0 pin) si vede nella griglia di Kamoshida con «nessun pin», senza aprire nulla;
       un'Area aggiunta su una copia di prova (con immagine, 0 pin) compare subito nella griglia del suo Palazzo; le «Planimetria non
       attribuita» di Futaba e Shido senza pin stanno nel gruppo «Fogli dell'estrazione senza nome»; nessuna Area con nome finisce nel gruppo.
     - **Test UX**: dopo aver aggiunto una planimetria la si trova dove la si aspetta.
     - **Test layout**: carte con «nessun pin» uguali alle altre (stessa altezza); gruppo chiuso a 375 e 1280.
     - **Test no-reg**: tutte le planimetrie raggiungibili come prima: nessuna sparisce, cambia solo dove stanno.
4. **Legame all'area intera** (dubbio 1): le 95 coppie implicite si accettano; `planimetria_iniziale` conserva la versione legata di oggi; i
   numeri della raccolta restano per planimetria.
5. **Coppia del pin 777** aggiunta (dubbio 2), `origine='regola'` — sulla copia 0440Z non serve più: l'utente l'ha dichiarata (§2.1 passo 5).
6. **Iweleth migrato come gli altri Palazzi** (dubbio 7, D3 in L8): 16 aree, 26 planimetrie, 12 legami; nessun dato perso.
7. **Labirinto Contorto di Madarame** area a sé (dubbio 8).
8. **Alias verso versioni secondarie conservati** (punto 3): `palazzo-di-madarame-museo-1p` apre Museo 1P sulla versione `153-2-1` come oggi;
   alternativa: riportarli alla predefinita.
9. **Diario** — deciso dall'utente (e dal PM per l'insieme ordinato): campo «Infiltrazioni» visibile e selezionabile su tutte le voci di
   Palazzo, a selezione multipla con ordine; nessun legame scritto da migrazioni; proposte del censimento voce per voce (`dati.md` §8) con
   «Conferma»; per le voci nuove proposte a richiesta con le sole regole certe; «Entra» apre la prima non completata dell'insieme, o del Palazzo se
   l'insieme è vuoto. Proposte = G-022. Dopo il 06-01, decisioni del PM (§2.1.6): F4 corretto, N1–N3 su `dungeon:niijima`, nomi della guida in
   nota, voce nuova del 06-26, tutto «da rivedere» col testo precedente conservato. **Nessuna scrittura** nel validato: 6 voci che nominano il
   Palazzo solo nel testo; K8 04-18 (il professore) resta col suo riferimento, segnalato all'utente.
12. **Ripetizioni nell'insieme**: ammesse (G-022, N2), rifiutate solo se consecutive (non descrivono un percorso). Alternativa: ammettere anche
    quelle.
13. **Giorni «senza voce» che una voce ce l'hanno** (Niijima 11-13, Maruki 10-03 e 01-02; riferimento a un Confidente): nessuna voce nuova
    (sarebbe un doppione), solo la proposta di G-022 sulle voci esistenti (11-13 giorno, 10-03, 01-02; la 11-13 sera non ne ha), con il
    riferimento al Confidente invariato e il campo visibile per `palazzoDellaVoce` — **confermato dal PM** il 2026-10-20. Resta la voce nuova di Kaneshiro 06-26 (lettera di sfida, data corretta dall'Esperto), che davvero manca. La 11-13
    sera solo segnalata «da rivedere» col motivo dell'Esperto, senza proposta né modifiche (PM, 2026-10-20). L'Esperto proponeva anche di spostare
    le 4 voci dal Confidente al Palazzo: non applicato, il PM ha mantenuto la sua decisione.
10. **Rotte vecchie dei gruppi riscritte** sul modello nuovo invece di toglierle (client e test vecchi non scrivono dati morti).
11. **Pulsante «Mappa del Palazzo» tolto** dalla scheda (il visore è già lì); la griglia dei Palazzi non si raggiunge più.
