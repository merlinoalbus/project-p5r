# L2 «Mondo: aree e planimetrie» — stesura delle modifiche

Autore: sessione «Stesura modifiche» (2026-10-20). Ingressi: `requisiti.md` (R2-01…R2-42, dubbi 1–9), `dati.md` (§1–§4), `app.md`
(§0–§11), i quattro punti del Project manager (A Covo, B Sottopasso, C OggiMappa, D pin 1656), la variante «miniature» di L1 (che
prende la migrazione 108). Codice letto nella cartella di sviluppo (`newreview`, L1 in correzione: le righe di `cittaService.ts`,
`QuartierePage.tsx`, `CittaPage.tsx`, `shared/types.ts` possono spostarsi a L1 chiuso: BE/FE le ritrovano per nome di funzione).

**Principio** (dati.md §2): si aggiungono i legami, non si riscrivono i contenuti. Nessuna chiave di mappa cambia; nessun pin cambia
mappa, posizione, nome o riferimento (i 70+2 passaggi compresi, 734 e 515 compresi); `mappa_alias` e `mappa_percorso` invariati. L'unica
colonna esistente che cambia valore è `mappa.genitore_chiave` delle 5 planimetrie del Covo (D2).

## 1. Modello

### 1.1 Una tabella `area` per il mondo e (da L3) per i Palazzi
L'Area è la stessa cosa nel quartiere e nel Palazzo («stessi gesti», requisiti §Dipendenze): **una tabella sola**, con il contenitore
dichiarato da due chiavi esterne di cui una sola è valorizzata. L2 crea la tabella e la riempie per il mondo; L3 la riempie per i
Palazzi senza nuove strutture (le sue colonne specifiche, come i legami con le infiltrazioni, sono di L3). Così servizio, API, cestino e
componenti delle versioni si scrivono una volta.

```sql
CREATE TABLE area (
  chiave                  TEXT PRIMARY KEY,          -- 'citta/<quartiere>/<slug>' (L3: 'dungeon/<palazzo>/<slug>')
  quartiere_chiave        TEXT REFERENCES quartiere(chiave) ON DELETE CASCADE,
  dungeon_chiave          TEXT REFERENCES dungeon(chiave) ON DELETE CASCADE,
  slug                    TEXT NOT NULL,             -- fissato alla creazione: l'indirizzo non cambia se si rinomina (dubbio 8)
  nome                    TEXT NOT NULL,
  nome_rivisto            INTEGER NOT NULL DEFAULT 0 CHECK (nome_rivisto IN (0, 1)),  -- 1 se il nome l'ha rivisto l'utente (serve a L3, R3-01)
  ordine                  INTEGER NOT NULL,
  planimetria_predefinita TEXT REFERENCES mappa(chiave) ON DELETE SET NULL,
  origine                 TEXT NOT NULL DEFAULT 'utente' CHECK (origine IN ('seed', 'utente')),
  seed_json               TEXT,                      -- valori della guida prima della prima correzione (come luogo.seed_json, 071)
  updated_at              TEXT NOT NULL,
  citta_chiave            TEXT CHECK (citta_chiave IN ('tokyo')),  -- area a livello di città (decisione dell'utente sullo staff, 2026-10-20)
  da_verificare           INTEGER NOT NULL DEFAULT 0 CHECK (da_verificare IN (0, 1)),  -- l'utente decide se tenerla o rimuoverla
  CHECK ((quartiere_chiave IS NOT NULL) + (dungeon_chiave IS NOT NULL) + (citta_chiave IS NOT NULL) = 1)
);
CREATE UNIQUE INDEX area_slug_quartiere ON area (quartiere_chiave, slug) WHERE quartiere_chiave IS NOT NULL;
CREATE UNIQUE INDEX area_slug_dungeon   ON area (dungeon_chiave, slug)   WHERE dungeon_chiave IS NOT NULL;
CREATE UNIQUE INDEX area_slug_citta     ON area (citta_chiave, slug)     WHERE citta_chiave IS NOT NULL;   -- proposta di BE, accolta

ALTER TABLE mappa ADD COLUMN area_chiave TEXT REFERENCES area(chiave) ON DELETE SET NULL;
ALTER TABLE mappa ADD COLUMN versione_etichetta TEXT;      -- «inquadratura orientale»; NULL per le aree con una planimetria (dubbio 9)
ALTER TABLE mappa ADD COLUMN versione_ordine INTEGER;      -- 0..n-1 dentro l'area
CREATE INDEX mappa_area ON mappa (area_chiave);

ALTER TABLE quartiere_ingresso ADD COLUMN area_chiave TEXT REFERENCES area(chiave) ON DELETE SET NULL;
```
- Slug riservati (non ammessi come slug d'area): `ordine`, `da-collocare`, `nuova`. Collisione nello stesso quartiere → suffisso `-2`, `-3`.
- **Tipo della mappa invariato** (`luogo` o `area`): nel mondo una mappa con `area_chiave` è una **Planimetria** per l'interfaccia, qualunque
  sia il tipo (risolve la «doppia lettura» di app.md §11 C senza toccare la colonna `tipo`, che la regola del ruolo e altri lettori usano;
  la normalizzazione del tipo è di L11).
- `mappa_presentazione.gruppo_immagini_json` del mondo resta com'è (non si cancella: L11), ma non è più letto per il mondo: versioni ed
  etichette stanno su `mappa.versione_*`.
- `mappa.entita_*` dei 24 quartieri e la riga `mappa_entita` di Yongen-Jaya restano (legame mappa-quartiere ↔ quartiere, non zona ↔
  quartiere: dati.md §2.6); il quartiere di un'Area si legge **solo** da `area.quartiere_chiave` (R2-09). Nessuna riga nuova in
  `mappa_entita`. La regola 054 (`collegaLuoghiAllePlanimetrie`, riapplicata a ogni avvio da `regoleAllAvvio`) resta: scrive legami
  luogo↔planimetria, non crea mappe né aree; il legame luogo↔Area è di L5 (R2-10 soddisfatto dalle regole del §2.3 su import e creazione).

### 1.2 La «casa» di ogni mappa: una regola, nel server
Nuovo modulo `server/services/mappe/casaMappa.ts`: `casaDellaMappa(riga, aree)` → l'indirizzo dell'unica pagina che la mostra.
| Mappa | Casa |
|---|---|
| `tokyo` | `/guida/citta` (già oggi `MappaPage.tsx:53`) |
| mappa di un quartiere (`tipo='quartiere'`, `entita_tipo='quartiere'`, tranne `citta-mementos`) | `/guida/citta/<quartiere>` |
| planimetria con `area_chiave` di un quartiere | `/guida/citta/<quartiere>/<slug>`, più `?planimetria=<chiave pubblica>` se non è la predefinita |
| planimetria con `area_chiave` di un'area della città (staff) | `/guida/citta/tokyo/<slug>` (+ `?planimetria=` se non predefinita): la stessa pagina Area, con contenitore la città (`tokyo` non è una chiave di quartiere) |
| tutto il resto (Palazzi, Memento, «da collocare») | `/guida/mappe/<chiave pubblica>` (invariato; L3 cambierà i Palazzi) |
La casa viaggia nei DTO (`casa` su `MappaRiassuntoDto` e nella risoluzione della chiave): l'interfaccia non ricostruisce la regola.

## 2. Migrazione 109 `109_aree_del_mondo.ts` (gioco.db)
La 108 è della variante «miniature» di L1: L2 prende la **109**. La regola è scritta **dentro** la migrazione (come la 107: una migrazione non
segue il codice che cambia); il servizio ne ha una copia per l'import di pacchetti vecchi (§2.3), con lo stesso test di equivalenza.

### 2.1 Passi (una transazione; copia di sicurezza all'avvio già fatta da `runBootBackup`)
1. Crea `area`, gli indici, le colonne nuove di `mappa` e `quartiere_ingresso` (solo se mancano: `PRAGMA table_info`).
2. **Cestino**: ricrea `cestino` con il CHECK esteso a `'area-fisica'` (SQLite non altera un CHECK): `cestino_nuovo` con lo stesso DDL della
   104 più il tipo, `INSERT … SELECT` di tutte le righe con lo stesso `id`, `DROP`, `RENAME`, l'indice `idx_cestino_eliminato` della 104 ricreato, e
   `sqlite_sequence` **conservata** (non riportata al massimo `id`: un `AUTOINCREMENT` non deve riusare numeri già dati; oggi il cestino è
   vuoto con contatore 16 — scostamento motivato di BE, be.md) (le chiavi esterne le spegne già `migrationRunner.ts:43-61` attorno alla transazione;
   modello di ricostruzione: 078, 098, 103).
   Prima/dopo: stesso numero di righe e stessa somma di controllo di `uid||tipo||chiave`.
3. **Covo (D2)**: `UPDATE mappa SET genitore_chiave='citta-yongen-jaya' WHERE chiave IN ('nativo-rmap-022-1-0','nativo-rmap-022-1-1',
   'nativo-rmap-022-1-2','nativo-rmap-022-1-3','nativo-rmap-022-1-4') AND genitore_chiave IS NULL` e solo se `citta-yongen-jaya` esiste;
   `ordine` delle 5 invariato (0–4: l'ordine fra le aree è `area.ordine`, non quello delle mappe). Poi `sincronizzaPercorsiMappe` **non**
   si chiama: i percorsi pubblici restano quelli di oggi (`covo-dei-ladri`, …), gli indirizzi vecchi sono garantiti dal redirect (§4).
4. **Aree**. Insieme di partenza: le mappe con `tipo IN ('luogo','area')` il cui genitore è una mappa `tipo='quartiere'` con
   `entita_tipo='quartiere'` e `entita_chiave <> 'mementos'`, e `area_chiave IS NULL`. Raggruppamento: stesso `gruppo_immagini_json.id`
   → un'area; senza gruppo → un'area per mappa. Per ogni gruppo:
   - `quartiere_chiave` = `entita_chiave` della mappa-genitore; `nome` = `gruppo.nome` se c'è il gruppo, altrimenti `mappa.nome` (con
     `nome_rivisto` rispettato perché è già nel nome: «Banchina Aoyama Itchome»); `slug` = `slug(nome)` (stessa regola di `shared/slug.ts`,
     copiata nella migrazione) con il suffisso in caso di collisione; `chiave` = `citta/<quartiere>/<slug>`;
   - `ordine` = `100·i`, con `i` la posizione nell'ordinamento per (planimetrie spostate in questa migrazione per ultime, `mappa.ordine`
     minore del gruppo, chiave): a Shujin due planimetrie hanno ordine 0, e così il Covo (spostato) va dopo le aree di Yongen-Jaya —
     Banchina 0, Vicoli 100, Covo 200 (scostamento motivato di BE, be.md: stesso risultato dei conteggi del §2.2);
   - `planimetria_predefinita` = la versione con `gruppo.ordine = 0`, altrimenti l'unica;
   - `origine` = `utente` se almeno una planimetria ha `origine='utente'` o `nome_rivisto=1`, altrimenti `seed`; `seed_json` NULL;
     `nome_rivisto` = 1 se una planimetria dell'area ha `nome_rivisto=1` o il gruppo ha `nomeRivisto` (Sottopasso, Aoyama Itchome); una
     rinomina dall'app lo porta a 1.
   - Sulle planimetrie: `area_chiave`; `versione_ordine` = `gruppo.ordine` (0 se sola); `versione_etichetta` = `gruppo.etichetta` solo
     per le aree con più di una planimetria (7 righe).
5. **Ingressi**: `UPDATE quartiere_ingresso SET area_chiave = (SELECT area_chiave FROM mappa WHERE chiave = mappa_chiave)`; `mappa_chiave`,
   x, y, zoom invariati.
6. **Area riservata allo staff** (decisione dell'utente, 2026-10-20, dopo G-002: nessuna fonte la identifica): area **a livello di città**,
   agganciata a Tokyo: `chiave = 'citta/tokyo/area-riservata-allo-staff'`, `citta_chiave = 'tokyo'`, `nome` = nome del gruppo («Area
   riservata allo staff»), `ordine` 0, `origine='seed'`, **`da_verificare = 1`**; planimetrie `nativo-rmap-150-3-0` (predefinita, «porzione
   occidentale», versione 0) e `150-3-1` («planimetria completa», versione 1). Genitore (`tokyo`) e chiavi invariati. L'utente poi decide
   «Tieni» (toglie `da_verificare`) o «Rimuovi» (cestino `area-fisica`).
7. Log `info` con aree create, planimetrie legate, da collocare, Covo spostato.

### 2.2 Verifiche prima/dopo (test della migrazione + prova sulla copia di produzione già migrata a L1/108)
| Misura | Prima | Dopo |
|---|---:|---:|
| `area` (mondo) | — | **23**: Shibuya 6, Shujin 8, Yongen-Jaya 3, Kichijoji 1, Shinjuku 1, Akihabara 1, Kanda 1, Odaiba 1, **Tokyo 1** (staff, `da_verificare`) |
| planimetrie con `area_chiave` | — | **29**; con etichetta **9** (Sottopasso 2, Covo 5, staff 2); aree con più versioni **3** |
| mappe di zona senza area | 29 | **0** (R2-02) |
| Sottopasso | 2 mappe sciolte | 1 area, predefinita `001-2-0` (16 pin), versione 2 `001-2-1` «planimetria completa» (R2-05/06) |
| Covo | 5 radici | 1 area di Yongen-Jaya, ordine 200, predefinita `022-1-0`, genitore delle 5 = `citta-yongen-jaya` (R2-07) |
| `quartiere_ingresso` | 2 | 2, con `area_chiave` (Vicoli, Central Street), x/y/zoom/mappa identici (R2-22) |
| pin del mondo / verso il mondo | 298 / 2 | identici uno per uno (impronta `impronta-mondo.cjs` per chiave: mappa, x, y, nome, riferimento, condizioni, destinazione, voci) |
| `mappa_alias` / `mappa_percorso` | 690 / 317 | 690 / 317, identici |
| `cestino` | n righe | n righe, stessi id |
| impronta diario/Kamoshida/Madarame (`impronta.cjs`) | `1a71b030…bc4c` | identica (R2-31, R2-32) |
| `spillo_partita` sul mondo | 0 (+1 di Kamoshida, pin 515) | invariato |
Idempotenza (R2-08): seconda esecuzione della funzione della migrazione → 0 righe toccate (test).

### 2.3 Regole che impediscono il ritorno a mappe senza area (R2-10, R2-11, R2-27)
- `POST /api/mappe` con un genitore del mondo (Tokyo, un quartiere o una sua discendente) e tipo `luogo`/`area` → **409**
  `usa-aggiungi-area` («Nel mondo le planimetrie si aggiungono dalla pagina dell'area»). Restano ammesse le mappe dei Palazzi (L3) e le
  importazioni.
- **Pacchetto delle mappe** (`EsportazioneMappeDto`, `shared/types.ts:2278`): campo nuovo in testa `aree?: Array<{ chiave, quartiere,
  dungeon, slug, nome, ordine, predefinita, origine, seedJson }>`, per mappa `area?: string | null` e `versione?: { etichetta: string | null;
  ordine: number }`, per ingresso `area?: string | null`. `importaMappe`: con il campo, crea/aggiorna le aree (con `sovrascrivi`, come le
  mappe) e i legami; **senza** (pacchetto di prima), dopo l'importazione applica `assegnaAreeMondo(db)` (la copia della regola §2.1.4,
  idempotente) così nessuna zona del mondo resta senza area. Round-trip esporta→importa su copia: stesse aree, versioni, predefinite, ingressi.
- **Pacchetto di gioco** (`gioco.db` intero): la tabella viaggia nel file; un pacchetto di prima della 109 riceve la 109 da `runMigrations`.

## 3. API e DTO

### 3.1 DTO (`shared/types.ts`, scritti da BE)
```ts
/** Il posto che contiene un'area: un quartiere (L2) o un Palazzo (L3). Generico da subito, così L3 non cambia i contratti. */
export interface ContenitoreAreaDto { tipo: 'citta' | 'quartiere' | 'dungeon'; chiave: string; nome: string }  // 'citta' = Tokyo (staff)
/** Riferimento all'area di una planimetria (null per le «da collocare», le radici e i Memento). */
export interface AreaRifDto { chiave: string; contenitore: ContenitoreAreaDto; slug: string; nome: string;
  versioneEtichetta: string | null; versioneOrdine: number; predefinita: boolean; casa: string }
export interface PlanimetriaAreaDto { chiave: string /* pubblica */; nome: string; etichetta: string | null; ordine: number;
  predefinita: boolean; numeroSpilli: number; immagineUrl: string | null; asset: string | null; ruoloImmagine: RuoloImmagine }
export interface AreaRiassuntoDto { chiave: string; contenitore: ContenitoreAreaDto; slug: string; nome: string; nomeRivisto: boolean; ordine: number;
  predefinita: string | null /* chiave pubblica */; illustrazione: IllustrazioneDto /* della predefinita, risolutore L1 */;
  numeroPlanimetrie: number; numeroSpilli: number; passaggio: { spillo: number; x: number; y: number } | null /* pin sull'illustrazione del quartiere */;
  ingresso: boolean; origine: 'seed' | 'utente'; modificata: boolean /* seed_json non nullo */; daVerificare: boolean; casa: string }
export interface ElementoAreaDto { tipo: 'luogo' | 'negozio' | 'attivita' | 'confidente'; chiave: string; nome: string; spillo: number; planimetria: string }
export interface AreaDettaglioDto extends AreaRiassuntoDto { planimetrie: PlanimetriaAreaDto[];
  elementi: ElementoAreaDto[]; vicine: Array<{ nome: string; quartiereNome: string | null; casa: string }> }
export interface MappaDaCollocareDto { chiave: string; nome: string; genitoreNome: string | null; numeroSpilli: number; immagineUrl: string | null; asset: string | null }
```
Campi nuovi su DTO esistenti:
- `MappaRiassuntoDto` (2038): `area: AreaRifDto | null`, `casa: string`. `MappaDto.percorso` (2185): per una planimetria con area l'ultima
  tappa ha il **nome dell'area** (Tokyo › Shibuya › Sottopasso), non quello della versione; la versione la dice `area.versioneEtichetta`.
- `RisoluzioneMappaDto` (`shared/organizzazioneMappe.ts:9`): `{ tipo: 'mappa'; mappa: string; casa: string }`.
- `QuartiereDettaglioDto` (1459): `aree: AreaRiassuntoDto[]` (ordinate); `IngressoQuartiereDto` (1392): `area: { slug: string; nome: string } | null`.
- `QuartiereRiassuntoDto` (1397): `aree: number`. `DettaglioSpilloDto` (2068) per `tipo:'mappa'`: `casa` della mappa di destinazione.

### 3.2 Rotte nuove: `server/routes/aree.ts`, montata in `ROUTER_DI_AREA` (`server/routes/index.ts:24`) come `['/api/aree', areeRouter]`
Le rotte si scrivono **una volta** con il contenitore come parametro (`/api/aree/:contenitore/:chiave/…`, `:contenitore` ∈ `citta`
in L2; L3 aggiunge `dungeon` senza nuove rotte): nella tabella sotto `citta/:q` sta per `:contenitore/:chiave`. Errori: `quartiere-non-trovato`, `area-non-trovata` (404); `slug-riservato`,
`nome-vuoto`, `formato-non-ammesso`, `immagine-troppo-grande` (400); `area-con-contenuti`, `ultima-planimetria`, `planimetria-d-ingresso`,
`usa-aggiungi-area` (409, con `details` = riepilogo).
| Metodo e percorso | Corpo / query | Effetto |
|---|---|---|
| `GET /api/aree/citta/:q` | — | `AreaRiassuntoDto[]` del contenitore, in ordine (con `:q = tokyo` le aree della città: la sezione «Aree della città» di `CittaPage`, §4.6; registrata il 2026-10-20 dopo l'implementazione) |
| `GET /api/aree/citta/:q/:slug?partita=` | — | `AreaDettaglioDto` |
| `POST /api/aree/citta/:q` | corpo **immagine** grezza (`image/*`, 8 MB); query `nome` (1–80), `x`,`y` (0–100, facoltativi in coppia), `etichetta` | in una transazione: area (origine `utente`), prima planimetria (`creaMappa` sotto `citta-<q>`, tipo `luogo`, `area_chiave`, versione 0) con l'immagine (`impostaImmagineMappa`: ruolo dedotto L1), pin di passaggio sull'illustrazione del quartiere a x,y (tipo `passaggio`, riferimento `mappa` = la planimetria, nome = nome dell'area). 201 + `AreaDettaglioDto`. Un errore → nulla di scritto (R2-23, R2-24) |
| `PUT /api/aree/citta/:q/:slug` | `{ nome?, predefinita? }` | rinomina (slug invariato) e/o cambia predefinita (deve essere sua); prima correzione di una riga `seed` → `seed_json` |
| `PUT /api/aree/citta/:q/ordine` | `{ slug: string[] }` (tutte le aree del quartiere) | riordina (`ordine` = 100·i) |
| `POST /api/aree/citta/:q/:slug/ripristina` | — | valori di `seed_json`, poi `seed_json` NULL (R2-28); 409 se l'area è `utente` |
| `DELETE /api/aree/citta/:q/:slug?conferma=1` | — | senza conferma e con contenuti (pin sulle sue planimetrie, passaggi entranti, ingresso, elementi) → 409 `area-con-contenuti` con il riepilogo; con conferma (o senza contenuti) → **cestino** tipo `area-fisica`: area, planimetrie (stessi passi di `eliminaMappa`), passaggi che puntano alle sue planimetrie, ingresso che la usa (R2-26) |
| `POST /api/aree/citta/:q/:slug/planimetrie` | immagine grezza; query `etichetta`, `predefinita=1` | nuova versione in coda (`versione_ordine` = max+1) (R2-24) |
| `PUT /api/aree/citta/:q/:slug/planimetrie` | `{ ordine?: string[]; etichette?: Record<string, string \| null> }` | ordine ed etichette delle versioni |
| `GET /api/aree/da-collocare` | — | `MappaDaCollocareDto[]` (dopo la 109 nessuna: lo staff è un'area della città) |
| `PUT /api/aree/citta/tokyo/:slug` `{ daVerificare: false }` | — | «Tieni» un'area da verificare (lo stesso `PUT` dell'area, campo in più); «Rimuovi» = `DELETE` (cestino). Con `:chiave = tokyo` il contenitore è la città |
| `PUT /api/aree/colloca` | `{ mappa, quartiere, area?: slug, nuova?: { nome }, etichetta? }` | assegna una planimetria sciolta a un'area esistente (in coda) o a una nuova; sposta il genitore sotto `citta-<q>` (R2-27) |
Rotte esistenti che cambiano:
- `PUT /api/compendio/citta/:q/ingresso` (`server/routes/compendio.ts:170`): corpo `{ area: slug, x, y, zoom }` (la planimetria è la
  predefinita dell'area al momento del salvataggio; `area_chiave` scritto); il corpo vecchio `{ mappa, … }` resta accettato (l'area si
  deduce dalla mappa). La risposta porta `area`.
- `DELETE /api/mappe/:chiave` di una planimetria del mondo: 409 `ultima-planimetria` se è l'unica della sua area (si elimina l'area);
  409 `planimetria-d-ingresso` senza `?conferma=1` se un ingresso la usa; se era la predefinita, la predefinita passa alla versione
  successiva; le versioni si ricompattano (0..n-1).
- `POST /api/mappe` (§2.3); `GET /api/mappe/risolvi/:chiave` → `casa`; `GET /api/mappe/albero` e `GET /api/mappe/:chiave` → `area`, `casa`.
- `GET /api/mappe/riferimenti?tipo=mappa` (`cercaRiferimenti` ~1437): per le planimetrie con area l'etichetta è «Shibuya › Sottopasso ·
  planimetria completa» (scelta della destinazione dei passaggi nell'editor).
- Documentazione delle API: `server/openapi/descrizioni/aree.ts` (nuovo) e aggiornamenti in `mappe.ts`, `compendio.ts`; `index.ts` delle
  descrizioni e il test `struttura-server.test.ts` (router nuovo).

### 3.3 Servizi (BE)
- `server/services/mappe/areeService.ts` (nuovo): letture (`areeDelQuartiere`, `dettaglioArea`, `areaDellaMappa`), scritture (sopra),
  `assegnaAreeMondo(db)`, eliminazione con `conCestino({ tipo: 'area-fisica', chiave, nome, contesto: <nome del quartiere>, vicini })` e
  `registraRipristinoCestino('area-fisica', …)` (riordino dai vicini, `sincronizzaPercorsiMappe` se una riga dell'albero non è tornata).
  `elementi` = pin con riferimento `luogo|negozio|attivita|confidente` sulle planimetrie dell'area (con il nome dell'entità dal catalogo,
  non quello del pin); `vicine` = destinazioni distinte dei pin di passaggio delle sue planimetrie (risolte con `idMappa`), esclusa lei.
  Dopo ogni scrittura `invalidaCacheDiGioco()`.
- `server/services/cestinoService.ts`: `RADICE['area-fisica'] = { tabella: 'area', colonna: 'chiave' }`, `ETICHETTE.area = ['area', 'aree']`;
  `shared/types.ts:2552` `TipoCestino` con `'area-fisica'`. La pagina del cestino (`RimossiPage`) mostra «Area» come per gli altri tipi.
- `server/services/mappe/mappeService.ts`: `contestoMappe` (86-108) legge anche le aree; `riassunto` (115-129) aggiunge `area` e `casa`;
  `percorsoDi` (158) con il nome dell'area; `dettaglioRiferimento` (175-222) con la `casa`; `creaMappa` (814-845) con il 409 del §2.3;
  `eliminaMappa` (957) diviso in un corpo riusabile in transazione + il guscio col cestino, con le regole del §3.2; `cercaRiferimenti`;
  `esportaMappe` (1472) e `importaMappe` (1611) con i campi del §2.3.
- `server/services/mappe/contenutiGuidaService.ts:34-43` (`risolviPercorsoMappa`): `casa`.
- `server/services/cittaService.ts`: `dettaglioQuartiere` con `aree`, `ingressoQuartiere`/`impostaIngressoQuartiere` con l'area; `elencaQuartieri`
  con il conteggio. Lo scarico della pianta del quartiere resta (riguarda l'illustrazione `citta-<q>`).
- `server/services/mappe/accessoMondoService.ts:64-70`: invariato nel server (l'ingresso resta una destinazione valida); è il FE che manda
  il tipo `quartiere` alla pagina del quartiere (§4).

## 4. Interfaccia

### 4.1 Rotte (`src/router.tsx`)
- Nuova: `{ path: 'guida/citta/:chiave/:area', element: <AreaPage /> }` dopo la riga 86. Query: `planimetria` (versione mostrata), `spillo`,
  `x`/`y`/`zoom` (punto d'arrivo).
- `guida/mappe/:chiave` (`MappaPage`): **redirect alla casa**. `RisolviMappa` (`src/components/mappe/RisolviMappa.tsx:11-15`) riceve `casa`;
  `MappaPage` (52-54): se `casa` ≠ `/guida/mappe/<chiave>` → `<Navigate replace>` alla casa **conservando** `spillo`, `x`, `y`, `zoom`
  (e `contesto`/`area` dove servono). Il confronto si fa sulla stessa codifica (`/guida/mappe/${encodeURIComponent(mappa)}`), così una
  mappa la cui casa è `/guida/mappe/…` (Palazzi, «da collocare») non entra mai in un giro di redirect (test). Copre ogni indirizzo vecchio (pubbliche e alias) di quartieri, zone e versioni (R2-18): per
  `shibuya-sottopasso` l'alias porta a `001-2-1`, quindi alla pagina del Sottopasso **con la versione «planimetria completa»** (richiesta
  del PM); `covo-dei-ladri` → Area del Covo con la versione «planimetria completa». `guida/mappe/:chiave/modifica` (editor) resta (R2-20).
- **«Sulla mappa» del diario** (correzione del PM ad app.md §3): `mappaAzione` (`server/services/azioniStrutturateService.ts:48-63`) dà
  `{ chiave, spilloId }`; sul diario validato 04-01..06-01 lo usano 75 voci su 254 (copia del 20/10 00:08; sulla copia 0440Z il validato ha 255 voci, con una voce del 06-01 sera aggiunta dall'utente, da rimisurare) (63 verso il mondo, 10 verso i Palazzi, 2 verso i
  Memento). Il server **non cambia** (la chiave resta quella della planimetria). Due consumatori: (a) «Oggi» (`OggiGuida.tsx:65` →
  `oggi.sullaMappa`) apre la planimetria sul posto in `MappaIncorporata`, senza indirizzi: invariato, perché `MappaIncorporata` mostra la
  planimetria per chiave; (b) la pagina della guida giorno per giorno (`PercorsoPage.tsx:81`) naviga a `/guida/mappe/<k>?spillo=<id>`: il
  redirect porta alla casa **con lo `spillo`** e, se la planimetria non è la predefinita, con `?planimetria=`: lo spillo sta sempre sulla
  versione mostrata, e `AreaPage` lo passa a `MappaIncorporata` come `spilloIniziale` (selezionato e centrato, come oggi nel visore). Per
  i Palazzi e i Memento la casa resta `/guida/mappe/…` (L3 farà lo stesso controllo).
- `guida/mondo/:tipo/:chiave` (`AccessoMondoPage`): per `tipo = 'quartiere'` `<Navigate replace to="/guida/citta/<q>">` senza chiamare il
  server (R2-15); gli altri tipi invariati (le destinazioni passano poi dal redirect della casa).
- Funzione unica per gli indirizzi: `src/utils/navigazioneMappa.ts` → `urlCasa(casa, arrivo?)` (aggiunge `spillo` o `x/y/zoom` con `?`/`&`
  corretti). Ogni punto che costruisce `/guida/mappe/…` per una mappa del mondo (elenco di app.md §4: `MappaIncorporata:65,108,110,112,133`,
  `ImmaginiLuogo:29`, `AlberoLuoghi:60`, `ContenutiGuidaMappa:41`, `MappaPage:146,189,200,248,269,361,403`, `EditorMappaPage:121,206,215,292`,
  `DoveSiTrova:105`, `NavigazioneSpillo:13-18`) usa `urlCasa(m.casa, …)` quando il DTO ha la `casa`; dove ha solo la chiave resta `urlMappa`,
  e il redirect fa da rete. I punti dei Palazzi (`PercorsoPage:81`, `utils/percorso.ts:37`, `RaccoltaPlanimetrie:75`, `SchedaPlanimetria:222`,
  `PlanimetriePalazzo:507`) non si toccano (L3).

### 4.2 Pagina Quartiere `/guida/citta/<q>` (`src/pages/QuartierePage.tsx`, riscritta) — R2-12
Struttura (stessa grafica di oggi: `card`, `titolo-display`, chip, `PulsanteVisivo`; illustrazione L1 nell'intestazione):
1. «‹ La città» (129) come oggi.
2. **Intestazione** (131-143 di oggi, con `IllustrazioneConSegno` di L1): nome, «N aree · M luoghi», «Si apre:», descrizione. Azioni in riga:
   **«Entra: <area d'ingresso>»** (primario, se c'è un ingresso: riapre la finestra dell'area d'ingresso sul punto x/y/zoom, punto 5), **«Ingresso»**
   (finestra, §4.4), **«Aggiungi area»** (finestra, §4.5).
3. Corpo a due colonne da 1280 (come oggi: `xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]`, colonna sinistra `xl:sticky xl:top-2`):
   - sinistra, **l'illustrazione del quartiere** con i suoi pin (passaggi verso le aree, uscita verso Tokyo): `MappaIncorporata` sulla mappa
     `citta-<q>` (oggi `q.mappaChiave`), altezza `max(420px, min(64vh, 740px))`, con lo schermo intero in pagina (già in `MappaIncorporata`).
     Sotto, la didascalia della pianta pubblicata (156-158 di oggi) e lo scarico al primo uso (114-115). **Scarico fallito** (richiesta del PM
     e LAY-2 di BE, registrata il 2026-10-20): «Scaricamento non riuscito: <messaggio del server>», il collegamento alla pagina della fonte e
     «Carica dall'editor»; «Riprova» solo se l'errore può passare (rete, 5xx), mai con il 400 `fonte-rifiuta`.
   - destra, **Aree** (titolo con conteggio): carte con miniatura della predefinita (`AnteprimaMappa`, con le miniature della variante L1:
     `sizes="96px"`), nome, «N planimetrie · M pin», chip «Ingresso» sull'area d'ingresso, e — se l'area non ha pin sull'illustrazione —
     il pulsante fantasma **«Segna sull'illustrazione»** (finestra con la scelta del punto, crea il pin di passaggio con le API esistenti
     `POST /api/mappe/:chiave/spilli`): è il «da completare» del dubbio 6, dentro la pagina invece che in un elenco a parte. «Riordina»
     (pulsanti ↑/↓ da 44 px, salva con `PUT …/ordine`). Quartiere senza aree: «Nessuna area in <quartiere>: aggiungine una» con il pulsante.
     Sotto, **Luoghi** come oggi (filtro per tipo 173-180, «Aggiungi un luogo» 172, carte 52-94, ancore `#luogo-…` 120-124).
4. Formati: ≥1280 due colonne (illustrazione | aree + luoghi, aree in griglia a 2 colonne da 1536); 768–1279 illustrazione a tutta
   larghezza, aree e luoghi in 2 colonne; <768 colonna unica: intestazione compatta (illustrazione in cima a tutta larghezza come da L1),
   azioni a capo con bersagli da 44 px, illustrazione alta `min(56vh, 460px)`, carte delle aree orizzontali (miniatura 96×72 + testo).
   Nessuna area scorrevole annidata (le liste crescono con la pagina).
5. **Arrivo dalla metro** (decisione del PM, 2026-10-20, che concilia R2-15 e R2-22): la metro porta a `/guida/citta/<q>?ingresso=1`.
   Con `ingresso=1` e un ingresso configurato, la pagina del quartiere si apre con l'**area d'ingresso nella sua finestra** (`Modal` larga,
   foglio dal basso su telefono): titolo «<Area> — ingresso di <Quartiere>», `MappaIncorporata` sulla planimetria d'ingresso con
   `puntoIniziale = { x, y, zoom }` dell'ingresso (come oggi si atterra), azioni «Apri l'area» (→ pagina Area con lo stesso punto) e
   «Chiudi» (resta sul quartiere). Chiudendo, `ingresso` si toglie dalla query con `replace` (l'indietro non riapre la finestra). Senza
   ingresso configurato il parametro si ignora. Dalle schede de La città, dall'indice e dalle briciole si arriva **senza** il parametro:
   pagina adattata e centrata, come oggi (commento dell'utente in `QuartierePage.tsx:147-152`: «l'ingresso serve a chi arriva cliccando il
   quartiere sulla mappa di Tokyo»).
6. Tolto: `IngressoQuartiere` in linea in fondo alla colonna (165-168) e la planimetria d'ingresso incorporata al posto dell'illustrazione (153).
7. **Arrivo su uno spillo dell'illustrazione** (aggiunto da FE in implementazione, valutato e accolto il 2026-10-20 su segnalazione di Test no-reg:
   è il comportamento del visore di prima, e senza di esso il redirect del §4.1 perderebbe lo spillo, perché la casa di `citta-<q>` è questa
   pagina): query `spillo` (e `x`/`y`/`zoom`) come `AreaPage`. Con `?spillo=N` di un pin dell'illustrazione del quartiere, `MappaIncorporata`
   lo riceve come `spilloIniziale` (selezionato e centrato); con `x`/`y`/`zoom` come `puntoIniziale`. Uno spillo che non è sull'illustrazione
   del quartiere si ignora (la pagina si apre normale, nessun errore). Con `spillo` **e** `ingresso=1` vince lo spillo (meta esplicita) e la
   finestra d'ingresso non si apre. Su telefono l'illustrazione è già in cima: nessuno scorrimento in più. Le regole di L5 sugli spilli chiusi
   (evidenziato «Non disponibile adesso» se chiesto con `?spillo=`) valgono anche qui, perché passano dallo stesso `MappaIncorporata`.

### 4.3 Pagina Area `/guida/citta/<q>/<area>` (`src/pages/AreaPage.tsx`, nuova) — R2-13, R2-14, R2-16, R2-17, R2-38, R2-41
- API: `getArea(q, slug, partita)` (`src/services/api/aree.ts` nuovo, nel barrel `index.ts`).
- **Testata compatta** (una riga da 1024): briciole «La città › Shibuya › Sottopasso» (link a `/guida/citta` e `/guida/citta/shibuya`;
  R2-17), titolo, chip «Planimetria · <etichetta>» se ci sono versioni; azioni: «Modifica area», «Aggiungi planimetria», **«Elimina area»** e
  **«Ripristina i valori della guida»** (solo se `modificata`) come pulsanti visibili (variante di FE accolta il 2026-10-20, al posto del menu
  «Altro»: a 1366×657 la testata resta su una riga, 66 px). Condizioni: «Elimina area» in stile fantasma di pericolo, mai primario, apre sempre la
  finestra di conferma del §4.5; «Ripristina» chiede conferma; la testata sta su una riga anche a 1280×689 e 1024×690, altrimenti da quella
  larghezza in giù i due pulsanti tornano nel menu «Altro»; <768 testata su due righe con i due pulsanti nel menu «Altro» (bersagli 44 px).
  «‹ Shibuya» come indietro (risale la gerarchia).
  **Testata su una riga a 1024 e 1280** (UX2-3 / LAY2-1, proposte di FE decise il 2026-10-20): da 1024 a **1535** px (a 1280 le etichette lunghe
  occupano 440 px contro 320 disponibili, misura di FE) le azioni hanno icona **e testo corto** — «Modifica», «Planimetria», «Elimina»,
  «Ripristina» — con il nome accessibile completo («Modifica area», «Aggiungi planimetria», «Elimina area», «Ripristina i valori della guida»);
  «Elimina» resta fantasma di pericolo con conferma. Da 1536 le etichette lunghe. Da 1024 il chip «Planimetria · <etichetta>» **non compare in
  testata**: lo dice già il segmento premuto della fila delle versioni, subito sotto, che è sempre in vista (portato in vista all'arrivo e a ogni
  cambio) e porta `aria-pressed`, con la fila chiamata «Versioni di <area>»; sotto i 1024 il chip resta. Con questo il Covo (5 versioni, chip e
  collegamento alle sfide) sta su una riga a 1280×689 (prima 660/621). **Da 1024 a 1279 px**, perché il Covo stia su una riga anche a 1024×690
  (misura di FE: 634/622, 868 px necessari contro 732): (a) le briciole si fermano al quartiere («La città › Yongen-Jaya»), perché l'ultima
  tappa è il titolo subito accanto, che porta `aria-current="page"`; (b) «Elimina» e «Ripristina» vanno nel menu «Altro» (la regola «se la riga
  non sta» già prevista sopra). Il collegamento «Sfide e Medaglie P del Covo» resta col testo intero (è il nome della meta) e, **da 1024 a 1279
  px, esce dalla testata**: sta in fondo alla fila delle versioni, a destra, fuori dalla parte che scorre (la fila si restringe e scorre nello
  spazio che resta). Così la testata del Covo torna su una riga senza accorciare il nome né abbassare il minimo del visore (420 px); misura di
  FE prima della scelta: 634/622 con la testata su due righe. Se l'area non ha la fila (una sola versione), il collegamento resta in testata. Niente pulsanti a sola icona: l'app si usa dal tablet, dove il suggerimento al
  passaggio del mouse non esiste e un'icona sola non dice cosa fa; nome accessibile completo («Modifica area», «Aggiungi planimetria»). Solo se
  con il testo corto la riga non sta ancora, «Modifica» diventa a sola icona (matita), mai «Planimetria». La carta «Sfide e Medaglie P del Covo»
  diventa un collegamento compatto nella testata con lo stesso testo (è il nome della meta).
- **Versioni** (solo se ≥2): una fila di segmenti sopra il visore, sempre nella prima schermata, **su una riga a ogni larghezza** (da 1024 non va
  più a capo: scorre in orizzontale con bordo evidente, sfumatura sul lato che continua e `overscroll-behavior-x: contain`; la versione scelta
  viene portata in vista all'arrivo; decisione del 2026-10-20 su proposta di FE): per ogni versione miniatura 64×48 (miniature
  L1), etichetta (o «Planimetria N» se manca) e numero di pin; la scelta cambia `?planimetria=` con `replace` (stessa pagina, stessa area:
  R2-14). **Versione senza pin** (punto B del PM: Sottopasso Speciale 0 pin, 4 versioni del Covo con pochi): avviso in testa al visore
  «Su questa planimetria non ci sono pin: quelli dell'area stanno su «inquadratura orientale»» con il pulsante per passarci. La
  predefinita è quella con i pin (Sottopasso `001-2-0`); l'indirizzo vecchio `shibuya-sottopasso` apre comunque la versione a cui puntava.
- **Visore**: `MappaIncorporata` sulla planimetria scelta (piena risoluzione), con la nuova prop `contenutiPannello` inoltrata a
  `VisoreMappa` (che la ha già) e `onNaviga` che passa dalla casa (`urlCasa`). Altezza: da 1024 il visore riempie l'altezza utile
  (`calc(100dvh - <testata> - <versioni>)`, minimo 420 px), così a 1366×657 e 1280×689 testata, versioni e visore stanno in una schermata
  (R2-41); su telefono `min(64dvh, 560px)`.
- **Pannello del visore** (`contenutiPannello`): «Luoghi qui» (`elementi`: tocco = seleziona il pin nel visore; collegamento alla scheda:
  luogo → `/guida/citta/<q>#luogo-…` fino a L5, negozio → `/guida/negozi/<k>`, attività, Confidente), «Aree vicine» (`vicine`, link alla casa),
  «Modifica planimetria» (editor della versione mostrata). Sostituisce il selettore «Aree» che cambiava posto (`MappaPage.tsx:393`) e
  `ImmaginiLuogo` per il mondo.
- **Covo** (punto A, fonte G-004): se l'area è `citta/yongen-jaya/covo-dei-ladri`, una carta «Sfide e Medaglie P del Covo» → `/guida/covo`
  (che resta la meta della fermata della metro); e in `CovoPage` una carta «Planimetrie del Covo» → l'area. Costante unica `COVO_AREA` in `src/utils/covo.ts` (nuovo).
- Area inesistente: `PageState` con «Area non trovata» e il collegamento al quartiere.
- Formati: ≥1280 visore + pannello del visore a destra, **aperto all'arrivo** (confermato il 2026-10-20 dopo LAY e UX2-1: oggi parte chiuso,
  e «Luoghi qui» non si vede); l'utente può chiuderlo e resta chiuso finché resta sulla pagina (stato della pagina, non salvato); 768–1279
  pannello chiudibile, chiuso all'arrivo; <768 testata su due
  righe, versioni in una fila scorrevole orizzontale con bordo evidente e `overscroll-behavior-x: contain` (memoria «Scroll annidati»),
  pannello sotto il visore.

### 4.4 Finestra «Ingresso» (`src/components/mappe/IngressoQuartiere.tsx` → finestra in `Modal`) — R2-21, R2-22, punto C
- Passo 1: scelta dell'**area** (elenco delle aree del quartiere, `Selettore`); passo 2: tocco sul punto della sua planimetria predefinita
  (immagine a piena risoluzione), ingrandimento a scelte fisse **«Intera · 1×», 1,5×, 2,5×, 4×** (variante di FE accolta il 2026-10-20:
  Shibuya e Yongen-Jaya hanno zoom 1 nei dati, che deve restare sceglibile); se il valore salvato non è fra le scelte, compare come scelta in
  più, selezionata, così il salvataggio non lo cambia mai di nascosto; «Salva», «Togli l'ingresso», «Annulla». Salva con `{ area, x, y, zoom }`.
- **OggiMappa** (`src/components/partita/OggiMappa.tsx:39-42`, punto C): la metro dentro «Oggi» scende sul posto senza cambiare pagina
  (come oggi) e ora **con il centro**: `mappaDaHref` riconosce anche `x`, `y`, `zoom`, e `MappaTokyo` passa a `onApri` una destinazione
  esplicita (§4.6), non un indirizzo da interpretare.

### 4.5 Finestre «Aggiungi area» e «Aggiungi planimetria» — R2-23, R2-24
- «Aggiungi area» (Quartiere): nome (obbligatorio), immagine della prima planimetria (obbligatoria; PNG, JPEG, WEBP; 8 MB; anteprima), etichetta
  (facoltativa), punto sull'illustrazione del quartiere (tocco sull'illustrazione; obbligatorio se il quartiere ha un'immagine, altrimenti
  saltato con la nota «potrai segnarla poi»). Invio unico (`POST /api/aree/citta/:q`); l'area compare nell'elenco e sull'illustrazione al
  ricaricamento dei dati della pagina, senza ricaricare il browser.
- «Aggiungi planimetria» (Area): immagine (obbligatoria), etichetta, «diventa la predefinita». Il ruolo non si chiede (L1).
- «Modifica area»: nome, predefinita (tra le versioni), e la tabella delle versioni (etichetta modificabile, ↑/↓, elimina versione con le
  conferme del §3.2, «Apri nell'editor»).
- «Elimina area»: finestra di conferma con il riepilogo del 409 («3 planimetrie, 24 pin, 2 passaggi da altre aree, l'ingresso del
  quartiere») e «Va nel cestino: si può rimettere da Impostazioni › Cestino».
- Tutte le finestre usano `Modal` (`src/components/shared/Modal.tsx:72`).
- **Foglio dal basso sotto i 768 px per tutte le finestre dell'app** (R2-42, difetto LAY2-3 di Test layout; decisione del 2026-10-20). La
  premessa di prima («come le altre») era sbagliata: oggi `Modal` è centrata a ogni larghezza (`.modal-overlay` `align-items: center`,
  `src/tailwind.css:246-269`) ed è usata da 42 componenti. **Una regola sola in `Modal`**, non una variante per L2: così ogni finestra si
  comporta uguale e non nasce una seconda forma da tenere allineata.
  - `src/tailwind.css`, sotto `@media (max-width: 767.98px)`: `.modal-overlay` con `align-items: flex-end`, `padding: 0` e
    `padding-top: calc(8px + env(safe-area-inset-top))`; `.modal-content` larga quanto lo schermo (`width: 100%`), `max-height: calc(100dvh -
    24px)`, angoli arrotondati solo in alto, senza bordo inferiore, `padding-bottom: env(safe-area-inset-bottom)`, ingresso dal basso
    (`slide-up`, niente animazione con `prefers-reduced-motion`). Intestazione e piè di pagina restano fissi, scorre solo `.modal-body`
    (con `overscroll-behavior: contain` già presente), comandi del piè di pagina da 44 px.
  - `Modal.tsx:129`: `larga` passa da stile in linea (`width: 860`) a classe `.modal-content--larga { width: 860px }`, così sotto i 768 px la
    regola del foglio vale anche per le finestre larghe senza `!important`.
  - **Chiusura invariata** (regola dell'utente del 2026-10-17, commento in `Modal.tsx:5-8`): solo con la X o con Esc. Lo sfondo non chiude, e
    il foglio **non** si chiude trascinandolo in basso: sarebbe un'altra chiusura involontaria dello stesso tipo. Fuoco, Tab e ritorno del fuoco
    come oggi.
  - **Verifica di layout a 375** (Test layout, oltre alle finestre di L2) sulle finestre principali delle altre pagine: `NuovaPartitaModal`,
    `ModuloVoceGiornata`, `ModuloCatalogo`, `ModuloPersona`, `ModuloRichiesta`, `EseguiFusioneModal`, `EseguiForcaModal`, `Cestino`,
    `PacchettoGioco`, `BackupIstanza`, `FormPezzo`, `ConfidentiPartita`, `ScortaPersona`, `TrasferisciVoci`, `SchedaPlanimetria`, `GuidaQuiz`:
    foglio dal basso, nessun taglio di intestazione o pulsanti, tastiera del telefono che non copre il campo attivo, nessuno scorrimento
    orizzontale; a 768 e 1280 identiche a prima (finestra centrata). `Modal.test.tsx`: invariato sul comportamento (Esc, X, sfondo che non
    chiude); in più la classe `modal-content--larga` al posto dello stile in linea.

### 4.6 Metro, città, indice, editor
- `MappaTokyo.tsx:367-371`: il cartellino del quartiere ha `href = /guida/citta/<q>?ingresso=1` (R2-15 + R2-22, §4.2 punto 5) e, per chi scende sul posto (OggiMappa), una
  destinazione `{ mappa, centro }` = ingresso (planimetria + punto) o, senza ingresso, l'illustrazione `citta-<q>`. `onApri` riceve la
  destinazione; le pagine (La città) seguono l'`href`.
- `MappaTokyo.tsx:461-463` (Covo, punto A): la fermata **resta su `/guida/covo`**. Fonte: registro dell'Esperto della guida G-004 — nel gioco il
  Covo dei Ladri non è un posto della città né la soffitta del Leblanc: si apre dall'opzione «Covo dei Ladri» del menu, dal 6/5, e non si
  raggiunge in metro. La pagina delle sfide è quindi la meta giusta della fermata; le planimetrie si raggiungono dalla carta «Planimetrie
  del Covo» in `CovoPage` e dall'area di Yongen-Jaya (D2 resta una scelta di ordinamento dell'app). Il testo `quando: 'la soffitta del
  Leblanc'` del cartellino (righe ~461-463) è sbagliato per G-004: diventa `'dal menu di gioco, dal 6/5'`. `AnteprimaMappa.tsx:31` (stemma
  del Covo) invariato.
- `CittaPage.tsx`: il testo in testa che parla di due destinazioni diverse (app.md §2) diventa «Tocca un quartiere sulla mappa o una scheda
  per aprirlo»; sezione **«Aree della città»** con le aree agganciate a Tokyo (oggi solo «Area riservata allo staff»: carta con miniatura,
  chip **«Da verificare»**, «Tieni» e «Rimuovi» con conferma; link alla sua pagina Area `/guida/citta/tokyo/<slug>`); sezione richiudibile in
  fondo **«Planimetrie da collocare (N)»** (solo se N>0) con «Colloca» (finestra: quartiere, area esistente o
  nuova, etichetta) — R2-27.
- `MappaPage.tsx` indice (72-222): sotto un quartiere si elencano le **aree** (una carta per area, miniatura della predefinita, «N versioni»
  se più d'una e la somma dei pin delle versioni), link alla casa; il Covo non è più una radice (ha il genitore); `AlberoLuoghi`
  (`AlberoLuoghi.tsx:32,60`) raggruppa per area. L'albero completo della gerarchia resta L11.
  **Esteso al pannello delle figlie del visore** (variante di FE accolta il 2026-10-20: il Sottopasso compariva due volte): le versioni della
  stessa area sono **una voce sola**, la predefinita, con il nome dell'area; la scelta della versione resta nella fila delle versioni della
  pagina Area (§4.3). Test: nessuna area due volte nel pannello né nell'indice; il conteggio dei pin è la somma.
- `EditorMappaPage`: «Nuova mappa» (495) e «Mappa collegata da uno spillo» (227-231, 659) nascosti quando la mappa è del mondo (Tokyo,
  quartiere o planimetria con area), con al loro posto il collegamento «Aggiungi area / planimetria dalla pagina del quartiere»; «Chiudi» e
  «Torna» portano alla casa; il form della mappa (713-728) non offre più `genitore`/`tipo` per le planimetrie con area.
- **Nomi nella navigazione** (decisione dell'utente, 2026-10-20: «chiamandolo con il suo nome… e non con mappa che si confonde con le mappe»):
  nei menu, nei selettori, nelle briciole, nei cartellini e negli elenchi (aree del quartiere, aree vicine, versioni, «Su: …») ogni voce è il **nome
  del posto** (area, quartiere, città), mai «Mappa»/«Mappe» né il tipo; i pin di **passaggio** mostrano il nome della destinazione dal vivo (dalla
  `casa`), con il nome proprio del pin come nota se diverso (il pin 1628 dei Vicoli, oggi «Mappa», mostra «Yongen-Jaya»). Le righe da correggere
  vengono dal censimento «Etichette di navigazione» di Analisi app (`lotti/L5/app.md`): quelle di aree, quartieri e città sono di L2, quelle dei
  luoghi di L5. **Righe assegnate a L2** (tabella completa in `lotti/L5/modifiche.md` §4.4b): M6, M7, M8, M9 («Modifica planimetria»), M10, M11
  (errore col nome, mai la chiave), M12, M13, M14, M16, M17, M18, M18b, M18c, M19, M20, M21, T1, T2, T3, T4, T7. Test: nessuna voce di
  navigazione chiamata «Mappa», riga per riga.
- `VisoreMappa.tsx`: il chip del tipo (668) e i titoli (`src/utils/vocabolarioMappe.ts:12-43`) dicono «Planimetria» per una mappa con area
  (`nomeTipoMappa(m)` nuovo in `vocabolarioMappe.ts`; `NOME_TIPO_MAPPA` di `shared/spilli.ts:318-320` resta per i Palazzi): R2-39.
  **Testo alternativo e nome della regione** (riga M17, forma di FE accolta il 2026-10-20): immagine di una planimetria «Planimetria di <area>»,
  con « · <etichetta>» quando l'area ha più versioni (così due versioni non hanno lo stesso testo); città e quartieri «Illustrazione di <nome>»;
  il resto il solo nome. La regione del visore si chiama «<livello>: <percorso>» («Quartiere: Tokyo › Shibuya», «Area: Tokyo › Shibuya ›
  Sottopasso»).
- Il pin **1656** (illustrazione di Shujin → planimetria di Kamoshida `152-2-0`, punto D) non si tocca: la sua destinazione non ha area del
  mondo e la sua casa resta `/guida/mappe/…`; segnalato a L3.

### 4.7 Testi nuovi (vocabolario L0: «Area», «Planimetria», «Luogo»; «mappa» non compare nelle pagine nuove)
«Aree» · «N aree» / «un'area» / «nessuna area» · «Entra: Central Street» · «Ingresso» · «Aggiungi area» · «Aggiungi planimetria» ·
«Segna sull'illustrazione» · «Riordina» · «Modifica area» · «Elimina area» · «Ripristina i valori della guida» · «Planimetria N» ·
«N planimetrie · M pin» · «Su questa planimetria non ci sono pin: quelli dell'area stanno su «…»» · «Luoghi qui» · «Aree vicine» ·
«Planimetrie da collocare» · «Colloca» · «Area non trovata» · «Nel mondo le planimetrie si aggiungono dalla pagina dell'area» ·
«Sfide e Medaglie P del Covo» · «Planimetrie del Covo». Messaggi d'errore del server in italiano con i codici del §3.2.

## 5. File e ordine (senza sovrapposizioni)
**BE** (prima; FE può partire con la pagina Area appena ci sono i DTO in `shared/types.ts`, passo 1):
1. `shared/types.ts` (DTO del §3.1, `TipoCestino`), `shared/organizzazioneMappe.ts` (risoluzione con `casa`).
2. `server/db/migrations/109_aree_del_mondo.ts` + `109_aree_del_mondo.test.ts`; registrazione in `server/db/migrations/index.ts`.
3. `server/services/mappe/casaMappa.ts`, `server/services/mappe/areeService.ts` (+ test).
4. `server/services/mappe/mappeService.ts`, `contenutiGuidaService.ts`, `server/services/cittaService.ts`, `server/services/cestinoService.ts`.
5. `server/schemas/aree.ts` (nuovo), `server/schemas/mappe.ts`, `server/routes/aree.ts` (nuovo), `server/routes/index.ts`, `server/routes/compendio.ts:170`.
6. `server/openapi/descrizioni/aree.ts` (nuovo), `mappe.ts`, `compendio.ts`, indice delle descrizioni.
7. Test BE mirati (§6.1); typecheck; lint.
**FE** (non tocca `server/` né `shared/`):
1. `src/services/api/aree.ts` (nuovo) + `index.ts`; `src/utils/navigazioneMappa.ts` (`urlCasa`); `src/utils/vocabolarioMappe.ts`; `src/utils/covo.ts` (nuovo).
2. `src/router.tsx`; `src/pages/AreaPage.tsx` (nuova); `src/pages/QuartierePage.tsx`; `src/pages/MappaPage.tsx`; `src/components/mappe/RisolviMappa.tsx`;
   `src/pages/AccessoMondoPage.tsx`; `src/pages/CittaPage.tsx`; `src/pages/CovoPage.tsx`; `src/pages/EditorMappaPage.tsx`.
3. `src/components/mappe/`: `MappaIncorporata.tsx` (prop `contenutiPannello`, `urlCasa`), `IngressoQuartiere.tsx` (finestra), nuovi
   `FinestraAggiungiArea.tsx`, `FinestraAggiungiPlanimetria.tsx`, `FinestraModificaArea.tsx`, `VersioniArea.tsx`, `CollocaPlanimetria.tsx`;
   `MappaTokyo.tsx`, `AlberoLuoghi.tsx`, `ImmaginiLuogo.tsx`, `DoveSiTrova.tsx`, `NavigazioneSpillo.tsx`, `ContenutiGuidaMappa.tsx`, `VisoreMappa.tsx` (chip e titoli);
   `src/components/partita/OggiMappa.tsx`.
4. Stili in `src/tailwind.css` (token esistenti: fila delle versioni, carta dell'area).
5. Test FE mirati (§6.2); typecheck; lint.
Documenti (ARCHITETTURA §L2, DECISIONI «L2», ROADMAP): il Project manager con i testi di BE/FE.

## 6. Piano dei test

### 6.1 BE (vitest mirati, output grezzo in be.md)
1. Migrazione 109 su una copia ridotta con i casi reali (Shibuya 7 mappe con il gruppo del Sottopasso, Shujin, Yongen-Jaya con Covo radice,
   staff, un Palazzo con gruppi, Memento): conteggi del §2.2; Covo sotto Yongen-Jaya con ordine d'area 200; staff come area di Tokyo `da_verificare` con 2 versioni; Palazzi e
   Memento senza area; pin, alias, percorsi identici; ingressi con area; cestino ricreato con le righe e il tipo nuovo; idempotenza.
2. Equivalenza: `assegnaAreeMondo` del servizio = regola della migrazione sullo stesso insieme.
3. `casaDellaMappa`: tokyo, `citta-shibuya`, `001-2-0` (senza query), `001-2-1` (`?planimetria=shibuya-sottopasso-speciale`), una planimetria
   di Kamoshida (invariata), `citta-mementos` (invariata), staff (`/guida/citta/tokyo/area-riservata-allo-staff`, e `?planimetria=` per 150-3-1); «Tieni» toglie
   `da_verificare`, «Rimuovi» va nel cestino e si rimette.
4. `GET /api/mappe/risolvi/shibuya-sottopasso` → `casa` del Sottopasso con la versione 2; `covo-dei-ladri` → Area del Covo con `022-1-1`.
5. `GET /api/compendio/citta/shibuya` → 6 aree in ordine con predefinite, passaggi (1630–1632 su tre aree), ingresso con area; Kichijoji 1 area senza passaggio.
6. `GET /api/aree/citta/shibuya/sottopasso` → 2 planimetrie (16 e 0 pin), elementi, vicine; quartiere o slug inesistenti → 404.
7. `POST /api/aree/citta/:q` con immagine valida → area, planimetria (ruolo `planimetria-nativa`), pin di passaggio; con immagine non valida o
   nome vuoto → 400 e **niente** scritto; slug riservato → 400; collisione → `-2`.
8. Planimetrie: aggiunta in coda, predefinita, ordine ed etichette; eliminazione dell'ultima → 409; della planimetria d'ingresso → 409 poi
   con conferma; della predefinita → predefinita alla successiva.
9. `PUT` nome/predefinita; prima correzione di un'area `seed` → `seed_json`; `ripristina` → valori di prima; area `utente` → 409.
10. `DELETE` area con contenuti → 409 con riepilogo; con conferma → cestino `area-fisica`; ripristino → area, planimetrie, pin, passaggi,
    ingresso e ordine com'erano.
11. `POST /api/mappe` sotto un quartiere senza area → 409 `usa-aggiungi-area`; sotto un Palazzo → 201 come oggi.
12. Pacchetto delle mappe: esporta→importa su copia (stesse aree, versioni, ingressi); pacchetto senza `aree` → `assegnaAreeMondo` applicata.
13. Ingresso: corpo nuovo `{ area, … }` e vecchio `{ mappa, … }`; area inesistente → 404.
14. Test esistenti da allineare (attese cambiate, non cancellati): `citta.test.ts`, `ingressi.test.ts`, `accesso-mondo.test.ts`,
    `percorsi-map.test.ts`, `verifica-mappe.test.ts`, `mappe-editor.test.ts` (486, «Nuova mappa» nel mondo), `stanze-planimetrie.test.ts`,
    `struttura-server.test.ts`, `alberoMappe.test.ts`, `sincronizzaMappe.test.ts`, `cestinoService.test.ts`, `104_cestino.test.ts`.

### 6.2 FE (vitest mirati)
1. `AreaPage.test.tsx` (nuovo): briciole; versioni con conteggi; scelta della versione cambia solo `?planimetria`; avviso della versione senza
   pin; elementi e vicine con i link giusti; area inesistente; Covo con la carta delle sfide.
2. `QuartierePage.test.tsx` (nuovo): aree in ordine con miniatura; con `?ingresso=1` la finestra dell'area d'ingresso con `puntoIniziale`
   dell'ingresso, chiusura che toglie il parametro; senza parametro nessuna finestra; «Entra» con x/y/zoom; «Segna sull'illustrazione» solo dove manca il pin;
   quartiere senza aree; luoghi e filtro come oggi; con `?spillo=N` di un pin dell'illustrazione lo spillo N selezionato e centrato
   (`spilloIniziale`), con uno spillo di un'altra mappa la pagina normale senza errori, con `?spillo=N&ingresso=1` lo spillo e nessuna finestra;
   `/guida/mappe/citta-<q>?spillo=N` (redirect del §4.1) arriva sulla pagina del quartiere con lo spillo N selezionato; scarico della pianta
  fallito: messaggio, fonte, «Carica dall'editor», niente «Riprova» col 400 `fonte-rifiuta`.
   `AreaPage.test.tsx` in più: «Elimina area» apre sempre la conferma; «Ripristina» solo con `modificata`; <768 i due nel menu «Altro»; testo
   alternativo con l'etichetta della versione; da 1024 a 1279 px il collegamento «Sfide e Medaglie P del Covo» in coda alla fila delle versioni,
   e in testata quando la fila non c'è (misure di FE del 2026-10-20: Covo, Sottopasso, Central Street e Piazza 622/622 a 1024×690, 621/621 a
   1280×689, 589/589 a 1366×657). `IngressoQuartiere.test.tsx` in più: zoom 1 salvato e riletto uguale; un valore fuori dalle
   scelte (3) mostrato e conservato. Visore: il pannello delle figlie elenca il Sottopasso una volta; regione «Quartiere: Tokyo › Shibuya».
3. `MappaPage.test.tsx`: redirect alla casa con `spillo`/`x`/`y`/`zoom` conservati (caso «Sulla mappa»: `/guida/mappe/<planimetria non
   predefinita>?spillo=N` → `/guida/citta/<q>/<slug>?planimetria=…&spillo=N`, e `AreaPage` seleziona lo spillo N); Tokyo → La città (come oggi); un Palazzo resta nel visore.
4. `AccessoMondoPage.test.tsx`: `quartiere` → `/guida/citta/<q>`. `MappaTokyo.test.tsx`: `href` del quartiere (`?ingresso=1`); il Covo resta su `/guida/covo` con il testo nuovo. `OggiMappa.test.tsx`:
   discesa con il centro dell'ingresso. `IngressoQuartiere.test.tsx`: scelta dell'area e salvataggio. `EditorMappaPage.test.tsx`: «Nuova mappa»
   assente nel mondo, presente nei Palazzi. `navigazioneMappa.test.ts` (`urlCasa`), `vocabolarioMappe.test.ts`, `CittaPage.test.tsx`
   (55: il clic va al quartiere; «da collocare»), `CovoPage.test.tsx`.

### 6.3 Funzionali (funzionali.md: un caso per criterio)
- R2-15: le sette strade di app.md §3 (S1 metro, S2 piastrella, S3 indice, S4 accesso al mondo, S5 Oggi, S6 briciole, S7 schede di
  negozi/attività/libri e «scheda del quartiere» del visore): prima/dopo per ognuna; tutte su `/guida/citta/shibuya` tranne S5, che scende sul
  posto dentro Oggi con il centro (decisione 1). S1 (metro) apre in più la finestra dell'area d'ingresso sul punto 38.29/32.67 zoom 1
  (Shibuya) e 37.46/25.14 zoom 1 (Yongen-Jaya); S2 (piastrella) apre la pagina senza finestra; chiusa la finestra, l'indietro non la
  riapre; un quartiere senza ingresso (Kichijoji) dalla metro apre la pagina senza finestra (R2-22).
- R2-16: alla pagina di Central Street da: carta dell'area, pin 1631 sull'illustrazione, passaggio 1501 da Central Street ↔ Piazza, «Dove si
  trova» di un luogo di Central Street, indice, briciole.
- R2-18: gli indirizzi vecchi `/guida/mappe/<k>` per le 29 pubbliche e i 66 alias delle zone, più `shibuya`, `yongen-jaya`, `covo-dei-ladri`,
  `shibuya-sottopasso` (versione 2), `shibuya-sottopasso-1` (versione 1): ognuno sulla casa giusta (script di lettura sull'elenco di dati.md §1.8).
- **«Sulla mappa» del diario** (R2-31, correzione del PM): per tutte le 75 voci del 04-01..06-01 che hanno `mappa` (elenco da
  `mappaAzione` sulla copia di produzione), dalla guida giorno per giorno (`/guida/percorso/<data>`) e da «Oggi»: si apre la stessa
  planimetria con lo **stesso spillo selezionato e centrato** di prima del lotto (63 sul mondo → pagina dell'area con la versione giusta;
  10 dei Palazzi e 2 dei Memento → visore come oggi). Esito voce per voce (data, uid, chiave, spillo, indirizzo d'arrivo, spillo selezionato).
  Le voci che puntano a un pin dell'**illustrazione di un quartiere** (`citta-<q>`) arrivano sulla pagina del Quartiere con lo spillo
  selezionato e centrato (§4.2 punto 7), come nel visore di prima.
- R2-05/06/07: Shibuya 6 aree; Sottopasso Speciale solo come versione (non in elenco, non nell'indice); Covo in Yongen-Jaya con 5 versioni.
- R2-21/22: ingresso di Shibuya e Yongen-Jaya invariato (area, punto, zoom); «Entra» ci porta; modifica dalla finestra e ritorno ai valori.
- R2-23/24/25/26/27/28 con una **partita di prova** e dati di prova creati e poi eliminati dal cestino: aggiungi area con immagine e punto,
  aggiungi versione, rinomina (l'indirizzo non cambia), riordina, predefinita, elimina e rimetti dal cestino, colloca una planimetria dello
  staff in un'area di prova e riportala (prima del ripristino, confronto tabella per tabella: memoria «Prove sui dati reali»).
- Editor (R2-20): da una planimetria dell'area all'editor e ritorno alla pagina dell'area.

### 6.4 UX (ux.md)
- Dal telefono (375) durante la partita: dalla metro a Untouchable (Central Street) in ≤3 tocchi (fermata → area → luogo) (R2-37).
- La pagina dell'area mostra il visore nel suo spazio, non miniature al posto del visore; versioni comprensibili («inquadratura orientale» /
  «planimetria completa») e avviso utile sulla versione vuota (punto B).
- La pagina del quartiere: si capisce cosa sono le aree e come si entra; «Entra» al primo colpo d'occhio; grafica curata come oggi, figure al 100%.
- Testi col vocabolario di L0; nessun «mappa» nelle pagine nuove (R2-39). Covo: dalla metro alle sfide e da lì alle planimetrie, e ritorno (punto A).

### 6.5 No-reg (noreg.md)
- Impronte: `impronta.cjs` (diario, Kamoshida, Madarame) identica; `impronta-mondo.cjs` uguale chiave per chiave salvo `genitore` del Covo e i
  campi nuovi; pin 734 e 515 identici; `mappa_alias`/`mappa_percorso` identici.
- Funzionamento: Kamoshida e Madarame (pagina del Palazzo, visore, voci, segnare/togliere da guida e mappa) come prima; Memento invariati;
  la metro e gli atterraggi dei Palazzi; «Dove si trova» di libri, negozi, attività; pacchetto mappe export/import; cestino (i tipi di prima si
  rimettono come prima); immagini L1 e miniature nelle carte delle aree; partita reale copiata e partita di prova.
- Test mirati delle aree toccate (§6.1–6.2) verdi, output grezzo.

### 6.6 Layout (layout.md)
- Pagine Quartiere (Shibuya, Kichijoji con 1 area, Ikebukuro senza aree) e Area (Sottopasso con versioni, Central Street senza, Covo con 5),
  le finestre Ingresso / Aggiungi area / Aggiungi planimetria / Modifica area / Colloca, la sezione «da collocare» de La città: a 1280, 768,
  375, 1366×657, 1280×689 e 1024×690; nessuno scorrimento orizzontale; bersagli ≥44 px (↑/↓, segmenti delle versioni, chip).
- A 1366×657 e 1280×689 la pagina Area mostra testata, versioni e visore nella prima schermata (R2-41); fila delle versioni a 375 con bordo
  evidente e scorrimento contenuto; nessuna barra che scorre insieme a un'altra.

## 7. Da approvare (scelta prudente applicata)
1. **Metro e ingresso** — **deciso dal Project manager** (2026-10-20): la metro porta alla pagina del quartiere (unico modo di aprire
   Shibuya, R2-15), che arrivando dalla metro si apre con l'area d'ingresso nella sua finestra, sul punto e con lo zoom d'ingresso (R2-22;
   piano «ingresso come area predefinita in una finestra propria»); dalle schede de La città si apre adattata e centrata. «Entra: <area>»
   riapre la stessa finestra; «Oggi» scende sul posto con il centro (punto C). Resta da confermare dall'utente come scelta del PM.
2. **Covo** (punto A, D2), corretto con la fonte G-004 dell'Esperto della guida: la fermata resta sulla pagina delle sfide `/guida/covo`
   (il Covo si apre dal menu di gioco, non dalla città); le 5 planimetrie diventano un'area di Yongen-Jaya come da D2 (scelta di
   ordinamento dell'app, **non** perché sia la soffitta); le due pagine si collegano nei due sensi; il cartellino della metro non dice più
   «la soffitta del Leblanc».
3. **Una tabella `area` per mondo e Palazzi** (anticipa L3 senza riempirla): alternativa, due tabelle separate come nella ricognizione.
4. **Shujin, Aoyama Itchome, staff** — risposte dell'Esperto della guida (registro `guida/registro.md`):
   - G-001 (certezza media-alta): nel gioco le zone della scuola sono i **piani** («Edificio Principale 2P» è una voce del viaggio rapido; fonte
     AGS settimana 1, 13/4; la fonte inglese divide 1F/2F/3F); ogni planimetria `002-0-x` copre il piano di entrambi gli edifici → **un'Area per
     piano**, confermata. L'«Aula» `002-6-0` è l'aula 2-D, non una voce del viaggio rapido (si raggiunge dall'Edificio Principale 2P): resta
     un'area a sé (ha i suoi 2 pin e la sua immagine) — eventuale accorpamento all'area del 2P è una scelta dell'utente («Colloca»), da approvare.
   - G-003 (certezza alta): Aoyama-Itchome è la fermata della scuola (da Shibuya col tornello della linea Ginza, AGS settimana 1, 11/4) →
     **area di Shujin Academy**, confermata.
   - G-002: l'«Area riservata allo staff» `150-3` **non risulta** in nessuna fonte leggibile → **decisione dell'utente** (2026-10-20, via PM):
     area a sé agganciata a Tokyo, a livello di città, marcata «da verificare»; l'utente deciderà poi se tenerla o rimuoverla (§2.1.6).
5. **Slug dal nome intero** (dubbio 8): per Shujin l'indirizzo è lungo (`edificio-principale-1p-edificio-laboratori-1p`) ma deterministico;
   alternativa, slug brevi scritti a mano nella migrazione.
6. **Pin di passaggio non riscritti** (dati.md §2.5, richiesta del PM): la navigazione risolve planimetria → area (casa); nessun
   `riferimento_tipo` nuovo.
7. **Tipo della mappa non normalizzato** (`area`/`luogo` nel mondo restano): l'interfaccia legge l'appartenenza all'area; normalizzazione in L11.
8. **Eliminare un'area porta con sé i passaggi che puntano alle sue planimetrie** (nel cestino, con conferma che li elenca): senza, resterebbero
   pin verso una destinazione che non c'è.
9. **Numeri da aggiornare nei documenti** (dati.md §4.9): 70 passaggi (non 62), 14 aree senza passaggio dal quartiere (non 12), Madarame
   225 voci / 252 pin (non 196/250): R2-32 si verifica con l'impronta per chiave.
