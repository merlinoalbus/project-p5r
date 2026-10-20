# L2 · be — Implementazione BE

## Implementazione (2026-10-20, cartella di sviluppo pensive-burnell-b50941, branch newreview, nessun commit) — FATTA
Esiti grezzi in `lotti/L2/esiti-be/` (output dei comandi con `EXIT=` in fondo).

### File (server/ e shared/)
- **shared/types.ts**: `ContenitoreAreaDto` (tipo `citta | quartiere | dungeon`), `AreaRifDto`, `PlanimetriaAreaDto`, `AreaRiassuntoDto` (con
  `nomeRivisto`, `daVerificare`), `ElementoAreaDto`, `AreaDettaglioDto`, `MappaDaCollocareDto`, `AreaPacchetto`; campi nuovi: `MappaRiassuntoDto.area`
  e `.casa`, `QuartiereRiassuntoDto.aree` (numero), `QuartiereDettaglioDto.aree`, `IngressoQuartiereDto.area`, `DettaglioSpilloDto.mappa.area`
  (`{ nome } | null`, **richiesto da FE** per il nome della meta dei passaggi) e `.casa`, `EsportazioneMappeDto.aree` / `mappe[].area` /
  `mappe[].versione` / `ingressi[].area`, `TipoCestino` con `area-fisica`. **shared/organizzazioneMappe.ts**: `RisoluzioneMappaDto.casa`.
- **Migrazione 109** `109_aree_del_mondo.ts` (+ test, registrata): come da preparazione, più la colonna `mappa.percorso_fisso` (FUN2-2, sotto).
- **server/services/mappe/casaMappa.ts** (nuovo): `contestoAree`, `contenitoreDi`, `casaDellArea`, `casaDellaMappa` (regola del §1.2), `areaRifDellaMappa`,
  `verificaIngressoNelQuartiere` (FUN2-1). Nessuna dipendenza dagli altri servizi delle mappe.
- **server/services/mappe/areeService.ts** (nuovo): letture (`areeDelContenitore`, `dettaglioArea`, `numeroAreePerQuartiere`, `mappeDaCollocare`),
  scritture (`creaArea`, `aggiungiPlanimetria`, `aggiornaArea` con «Tieni», `ripristinaArea`, `riordinaAree`, `aggiornaVersioni`, `eliminaArea` nel
  cestino `area-fisica` con planimetrie, passaggi entranti e ingresso, `collocaPlanimetria`), ripristino dal cestino registrato.
  **Scostamento motivato**: `assegnaAreeMondo` del servizio non è una copia della regola ma la funzione stessa della 109
  (`assegnaAreeDelMondo109`), importata dalla migrazione come già fa `pacchettoGioco` con la 053 e la 054: una regola sola, e l'equivalenza del
  §6.1.2 vale per costruzione.
- **mappeService**: contesto con le Aree; `riassunto` con `area` e `casa`; `percorsoDi` chiude col nome dell'Area; dettaglio dei pin verso una
  mappa con `area` e `casa`; `creaMappa` 409 `usa-aggiungi-area` nel mondo per `luogo`/`area` (opzione `dallArea` per il servizio delle Aree);
  `eliminaMappa` con `ultima-planimetria`, `planimetria-d-ingresso` (conferma), predefinita alla successiva e versioni ricompattate (opzione
  `dallArea`); `aggiornaMappa` toglie il percorso fisso a una rinomina o a uno spostamento; `cercaRiferimenti` «Shibuya › Sottopasso · planimetria
  completa»; esportazione con `aree`, `area`/`versione`, `ingressi[].area`; importazione con `importaAree` (stesse regole delle mappe) e la regola
  della 109 per le planimetrie rimaste senza Area (pacchetti di prima), **prima** del controllo degli ingressi; le due INSERT degli ingressi per nome.
- **cittaService**: `aree` (numero) nell'elenco, `aree` nella scheda, `ingresso.area`; `impostaIngressoQuartiere` col corpo `{ area }` (la
  predefinita dell'Area) o `{ mappa }`, sempre in un'Area del quartiere.
- **contenutiGuidaService**: `casa` nella risoluzione dei percorsi (redirect alla casa, alias vecchi compresi).
- **cestinoService**: `RADICE['area-fisica']`, etichette di `area` e `quartiere_ingresso`. **percorsiMappe**: `percorso_fisso`.
- **Rotte**: `server/routes/aree.ts` (nuovo, `/api/aree`, montato in `routes/index.ts`), `server/schemas/aree.ts` (nuovo); `compendio.ts` (ingresso
  `{ area }` | `{ mappa }`); `mappe.ts` (`DELETE …?conferma=1`). **openapi**: `descrizioni/aree.ts` (nuovo, tag «Aree del mondo»), `mappe.ts`,
  `compendio.ts`, `immagini.ts`, indice.

### Difetti dei test, corretti con test visti prima rossi
- **FUN2-1** (ingresso in un'Area di un altro quartiere): 400 `area-di-altro-quartiere` / `ingresso-senza-area` dalla PUT e dall'import.
  Rosso → verde in `vitest-fun2-rosso.txt` / `vitest-fun2-verde.txt`. Verificato e chiuso da Test funzionali.
- **FUN2-2** (percorsi del Covo rinominati dalla sincronizzazione): `mappa.percorso_fisso` (109) fissato ai percorsi di prima e rispettato da
  `sincronizzaPercorsiMappe`. data/ riallineato (confronto approvato da Test no-reg, copia di avvio 00-44-16 rimessa con sha256 verificati, 109
  corretta riapplicata alle 00:53; impronte `impronta-prima-109.json` / `impronta-dopo-109.json` identiche, `1a71b030…`; confronto
  `confronto-gioco.json` / `confronto-partite.json`; copia di sicurezza dello stato di prima nello scratchpad `l2/data-prima-ripristino/`).
  Verificato e chiuso da Test funzionali e Test no-reg.
- **FUN2-3** (un testo spedito come image/png accettato): `salvaImmagine` riconosce il formato dai byte; nessun formato ammesso → 400
  `formato-non-ammesso` per ogni strada; un'immagine vera col tipo sbagliato si salva col formato vero. Rosso → verde in
  `vitest-fun2-34-rosso.txt` / `-verde.txt`. Due test esistenti che caricavano byte non immagine hanno ricevuto una firma valida
  (`api.test.ts` WEBP, `copia-voci-area.test.ts` PNG), con un caso nuovo che il WEBP di 4 byte è rifiutato.
- **FUN2-4** (plurali del messaggio della conferma): «1 planimetria, 1 pin e 1 passaggio da un’altra mappa». Rosso → verde come sopra.
- **LAY-2** (L1, preesistente, spostato in L2 dal PM): User-Agent onesto `project-p5r/<versione> (guida personale di gioco per Persona 5 Royal;
  +github)`, nessun Referer; una fonte che rifiuta (401/403/429/451) è 400 `fonte-rifiuta` con `{ stato, host, url }`. Fonte simulata 200 e 403:
  `scarico-fonte.test.ts`, `scaricaDaUrl.test.ts` (rosso → verde in `vitest-lay2-*.txt`). Dal vivo Fandom risponde ancora 403 → `fonte-rifiuta`
  (verificato da Test layout). L'avviso nella pagina è di FE.

### Test (§6.1) — `server/routes/aree-mondo.test.ts`, 15 casi
FUN2-2, FUN2-1, 3/4 (casa e alias vecchi), 5 (quartiere), 6 (pagina dell'Area, 404), 7 (creazione, errori senza scritture, slug riservato,
`-2`), 8 (versioni, ultima, ingresso con conferma, predefinita alla successiva), 9 (correzioni, seed_json, ripristina, ordine), 10 (eliminazione con
conferma, cestino, ripristino com'era), staff («Tieni», «Rimuovi», ripristino), 11 (409 nel mondo, Palazzi e generiche ammesse), 12 (pacchetto con
Aree e di prima), 13 (ingresso `{ area }` / `{ mappa }`), FUN2-3, FUN2-4. Più il test della 109 (2 casi).
**Allineamento §6.1.14** (attese cambiate, nessun test tolto): `mappe-editor.test.ts` (mappe di prova del mondo `generica` + il 409 per `luogo`),
`percorsi-map.test.ts` (mappe `generica`), `ingressi.test.ts` (ingresso in un'Area, conferma per l'eliminazione, `area` nel pacchetto),
`accesso-mondo.test.ts` (ingresso `{ area }`), `cestino.test.ts` (mappe non del mondo; figlia `generica`; genitore senza suffisso nativo),
`pezzi-mappa.test.ts` (la planimetria se ne va con la sua Area). Gli altri del §6.1.14 (citta, verifica-mappe, stanze-planimetrie,
struttura-server, alberoMappe, sincronizzaMappe, cestinoService, 104_cestino) sono verdi senza cambi.

### Giro finale — `vitest-l2-finale.txt`
44 file (aree e mappe, città, ingressi, accesso al mondo, percorsi, editor, stanze, struttura, cestino, piante, immagini, miniature, pezzi,
dungeon, planimetrie, pin, condizioni, copia voci, pacchetto, impostazioni, openapi, migrazioni 104–109, scarico, bootstrap):
**Test Files 44 passed (44), Tests 317 passed (317), EXIT=0**. `npm run typecheck` (tutto, FE compreso) EXIT=0; `npx eslint server shared` EXIT=0.

### Dal vivo sul 3201 (dati di data/)
Migrazione 109 applicata (23 aree, 29 planimetrie, 9 etichette, 0 senza area); `/api/mappe/risolvi/shibuya-sottopasso` →
`/guida/citta/shibuya/sottopasso?planimetria=shibuya-sottopasso-speciale`, `covo-dei-ladri` → Area del Covo; Shibuya con 6 aree, passaggi 1630–1632,
ingresso Central Street; `/api/aree/citta/tokyo/area-riservata-allo-staff` da verificare con 2 versioni. I pezzi sono stati provati da Test
funzionali via via (FUN2-1…4 aperti e corretti).

### Note per il PM (documenti)
ARCHITETTURA §L2: `casaMappa`, `areeService`, rotte `/api/aree/:contenitore/:chiave`, `percorso_fisso`, riconoscimento del formato in
`salvaImmagine`, `fonte-rifiuta` e User-Agent. DECISIONI: percorso fisso del Covo (FUN2-2), formato dai byte (FUN2-3), regola delle Aree importata
dalla migrazione, ordine 100·i, contatore del cestino conservato, indice unico dello slug per la città.

### Dichiarazione: modifiche fatte con uno script (R8 del giro 1 del validatore)
Nel commit `d66cf5f5` (FUN2-5 e rotta `GET /api/aree/:contenitore/:chiave`) due file sono stati scritti con uno **script node** (sostituzioni
di testo eseguite da `node -e`), contro la regola dell'utente «modifiche dirette, mai script»:
- `server/routes/aree.ts`: aggiunte `areeDelContenitore` e `contenitoreDaRotta` all'import da `areeService` e inserita la rotta
  `router.get('/:contenitore/:chiave', …)` prima della `POST` con lo stesso percorso;
- `server/openapi/descrizioni/aree.ts`: inserita la voce `'GET /api/aree/:contenitore/:chiave'` (sommario, descrizione, risposta, errori).
Nello stesso commit `server/openapi/descrizioni/aree.ts` ha avuto anche due sostituzioni con `sed` sulla descrizione di `DELETE …/:slug`
(«passaggi che portano alle sue planimetrie»), già elencate in `lotti/L3/be.md` §5. Gli altri file del commit (`areeService.ts`,
`aree-mondo.test.ts`) sono stati scritti con Edit. Verifica fatta dopo, riga per riga: le sole righe cambiate sono quelle del diff del commit;
file UTF-8 senza BOM, fine riga LF, `git diff --check` pulito. Da allora solo Edit e Write.

## Giro 2 (2026-10-20) — correzioni del validatore (R1, R3, R5, R8) e FUN2-8
Ogni correzione con il test visto prima rosso; uscite grezze in `lotti/L2/esiti-giro2/be/`. Solo Edit e Write.
- **R1** — `AreaRifDto.daVerificare` (`shared/types.ts`; facoltativo nel tipo, il server lo manda sempre) e `casaMappa.areaRifDellaMappa`:
  l'indice `/api/mappe/albero` e il dettaglio di una mappa dicono «da verificare» dell'Area della planimetria (lo staff di Tokyo). Test
  `aree-mondo` «R1 (giro 2)»: rosso (`01-test-rossi.txt`), poi verde.
- **R3 (R2-28)** — test `aree-mondo` «R3 (giro 2)»: un'Area della guida corretta dall'utente, poi esporta → importa senza «sovrascrivi»
  dall'app (passava già) e **dal seed**: rosso (`02-test-r3-rosso.txt`: il seed riportava il nome della guida). Corretto `importaAree`
  (`mappeService.ts`): un'Area della guida corretta (`seed_json` non nullo) resta com'è anche sotto il seed, e del seed si aggiornano solo i
  valori conservati per «Ripristina». Poi verde; «Ripristina» riporta il nome della guida.
- **FUN2-8 (R2-27)** — `aggiornaMappa`: una mappa senza Area di tipo `luogo`/`area` spostata nel mondo (sotto Tokyo, un quartiere o una
  discendente), o resa `luogo`/`area` lì, è 409 `usa-aggiungi-area`, come la creazione; le generiche del mondo, i Palazzi e i Memento non
  cambiano. Test `aree-mondo` «FUN2-8 (giro 2)»: rosso (`01-test-rossi.txt`: 200), poi verde. OpenAPI di `PUT /api/mappe/:chiave`.
- **R5** — `docs/DECISIONI.md`: la predefinita del Sottopasso è `001-2-0` «inquadratura orientale»; «planimetria completa» è la versione a
  cui porta l'alias `shibuya-sottopasso`.
- **R8** — la dichiarazione qui sopra.
- Verifiche: `aree-mondo` 18/18 (`03-test-verdi.txt`); file delle mappe e delle aree 27 / 199 verdi (`04-test-area.txt`); typecheck (server e
  tutto) e lint EXIT=0 (`05-typecheck-lint.txt`); l'albero del commit **isolato** (estratto senza il lavoro di L4 in corso) compila, passa
  il lint e 8 file / 92 test mirati (`06-commit-isolato.txt`). Dal vivo sul 3201 (GET): `/api/mappe/albero` porta `area.daVerificare` su
  tutte le 274 planimetrie con Area, vero solo per le due dello staff.
- **Commit solo di L2 su `newreview`** (`07-commit.txt`), fatti con un indice temporaneo: i tre file che contengono anche lavoro di L4
  (`shared/types.ts`, `mappeService.ts`, `openapi/descrizioni/mappe.ts`) sono entrati nella versione «HEAD + sole modifiche di L2»; il
  lavoro di L4 resta nella cartella, non committato. Nessuno stash, nessun cambio di ramo.
  - `1cd4187634e21dd13fdb91526e77e0f07e4fc0a2` fix(L2): giro 2 — R1, R2-28, FUN2-8 (codice, test, OpenAPI)
  - `a1def23210a577a2984b05e71008c4dc0c083c86` docs(L2): giro 2 — DECISIONI, predefinita del Sottopasso (R5)
  - `b6f3dd9a` fix(L2): giro 2 — **FUN2-9** (chiesto da FE per la finestra «Colloca»): `MappaDaCollocareDto.genitore`, la chiave pubblica del
    genitore (per un quartiere è la sua `mappaChiave`), in `mappeDaCollocare`; test `aree-mondo` «FUN2-9» rosso (`08-fun2-9-rosso.txt`), poi
    verde (`09-fun2-9-verde.txt`); albero del commit isolato: typecheck, lint e 3 file / 49 test verdi (`10-fun2-9-commit-isolato.txt`).

## Preparazione (2026-10-20, prima della consegna di L1: niente scritto nella cartella di sviluppo)

Su indicazione del PM la migrazione 109 e i suoi test sono stati preparati e provati **fuori** dalla cartella di sviluppo, in una copia isolata
del progetto nello scratchpad di Implementazione BE (`…\365ea5e8-…\scratchpad\l2\sandbox`: server/, shared/, test/, scripts/, configurazioni
e `pacchetto/gioco.db` copiati dalla cartella di sviluppo, `node_modules` collegato). Copia dei file preparati e degli esiti in
`lotti/L2/preparazione-be/`. Alla consegna di L1 si portano nella cartella di sviluppo **con Edit/Write diretti** (i `.diff` sono solo
promemoria leggibili, non patch da applicare).

### Migrazione 109 `109_aree_del_mondo.ts` (modifiche.md §2.1)
1. Tabella `area` (DDL del §1.1, una tabella per mondo e Palazzi), indici unici dello slug per quartiere e per Palazzo,
   `mappa.area_chiave` / `versione_etichetta` / `versione_ordine` (+ indice), `quartiere_ingresso.area_chiave`; solo se mancano.
2. Cestino ricreato con il tipo `area-fisica`: stesse righe e stessi id, indice `idx_cestino_eliminato`. **Scostamento motivato**:
   `sqlite_sequence` non si riallinea al massimo id ma resta al massimo fra il contatore di prima e il massimo id (sui dati di oggi il
   cestino è vuoto con contatore 16: riallinearlo a 0 farebbe riusare gli id di elementi già svuotati).
3. Covo sotto Yongen-Jaya (solo le planimetrie ancora radici, solo se `citta-yongen-jaya` esiste); ordini 0–4 invariati; percorsi non
   ricalcolati.
4. Aree: gruppi d'immagini → un'Area con le versioni; sciolte → un'Area ciascuna; etichette solo nelle Aree con più versioni; origine,
   `nome_rivisto`, predefinita come da progetto. **Scostamento motivato sull'ordine**: le Aree si ordinano per (spostate dopo, ordine minimo
   delle planimetrie, chiave) e ricevono `ordine` = 100·i. Con «ordine minimo» puro a Shujin 1P e Aoyama Itchome avrebbero entrambe 0, e il
   Covo (ordine 0) finirebbe prima di Vicoli: così l'ordine è quello del progetto (Shibuya 0…500, Yongen-Jaya Banchina 0, Vicoli 100,
   Covo 200) e i valori sono unici, come dopo un riordino dall'app (`PUT …/ordine`, 100·i). Slug dal nome intero (scelta 5 del §7),
   riservati `ordine`, `da-collocare`, `nuova` → suffisso `-area`; collisione → `-2`, `-3`.
5. Ingressi: `area_chiave` dalla loro planimetria. Staff: nessuna Area. Log `info` con i conteggi.
La regola dei passi 4–5 è la funzione esportata `assegnaAreeDelMondo109(db, adesso, spostate)`, idempotente.

### Prova sulla copia di `data/` (presa con l'API di backup, schema 108) — `esiti/esito-109.json`
```
{"aree":22,"planimetrie":27,"etichette":7,"ingressi":2,"daCollocare":2,"covoSpostato":5,"cestinoRicopiato":0,"msg":"migrazione 109: Aree del mondo"}
{"versione":[108,109],"aree":22,"planimetrie":27,"etichette":7,"piuVersioni":2,"senzaArea":2,"fk":0}
```
Aree per quartiere: Shibuya 6, Shujin 8, Yongen-Jaya 3, Akihabara/Kanda/Kichijoji/Odaiba/Shinjuku 1 — **tutto come il §2.2**. Sottopasso:
predefinita `001-2-0` «inquadratura orientale», versione 1 `001-2-1` «planimetria completa». Covo: area `citta/yongen-jaya/covo-dei-ladri`,
ordine 200, predefinita `022-1-0`, le 5 con genitore `citta-yongen-jaya`. Ingressi: shibuya → central-street, yongen-jaya → vicoli (mappa,
x, y, zoom identici). Da collocare: `150-3-0`, `150-3-1`. `mappa_alias` 690 e `mappa_percorso` 317 invariati; cestino 0 righe, contatore 16.
Violazioni di chiavi esterne: 0.
- **Impronta del lavoro da preservare** (`impronta.cjs`): prima e dopo `1a71b030acc62215…` — **identica** (diario 254, spunte 338,
  Kamoshida 7/169/373/302/472, Madarame 5/225/261/221/276).
- **Impronta del mondo** (`impronta-mondo.cjs` di Analisi dati) confrontata chiave per chiave: **2 differenze**, solo la colonna nuova
  (`ingressi[0].area_chiave → citta/shibuya/central-street`, `ingressi[1].area_chiave → citta/yongen-jaya/vicoli`); 54 mappe, 300 pin,
  115 alias, 93 luoghi, 1 stato di pin identici (l'impronta non riporta il genitore: lo spostamento del Covo è verificato sopra).

### Test
- `109_aree_del_mondo.test.ts` (copia ridotta coi casi reali: Sottopasso, Shujin con due planimetrie allo stesso ordine, Covo radice in
  un gruppo di 5, staff, figlia dell'ingresso dei Memento, Palazzo con un gruppo, passaggi, alias, percorsi, ingressi, cestino con id
  alti e contatore avanti): elenco esatto delle Aree, versioni ed etichette, Covo, senza Area, ingressi, cestino (stessi id, contatore 16,
  `area-fisica` ammesso, tipo sconosciuto rifiutato), `foreign_key_check` vuoto, impronta di pin/alias/percorsi/ingressi/cestino/mappe
  invariata; idempotenza (seconda esecuzione 0 righe), zona nuova in fondo con slug libero e slug riservato. **2/2** (`esiti/vitest-109-2.txt`;
  il primo giro falliva per un errore del test stesso: Tokyo la crea già una migrazione di prima).
- Test esistenti vicini con la 109 registrata, **prima** di toccare i servizi: 22 file, **4 falliti** (`esiti/vitest-sandbox-vicini.txt`):
  `ingressi.test.ts` (3) e `accesso-mondo.test.ts` (1), 500 per due `INSERT INTO quartiere_ingresso VALUES(?,?,?,?,?)` posizionali
  (`cittaService.impostaIngressoQuartiere` e `importaMappe`) che con la colonna nuova non bastano più. Corretti nella sandbox con le
  colonne per nome e l'Area dedotta dalla planimetria (`cittaService.diff`, `mappeService.diff`): **22/22 file, 125 test** verdi
  (`vitest-sandbox-vicini-2.txt`). Sono da portare **insieme** alla 109: senza, la 109 rompe l'ingresso dei quartieri e l'import.
- Secondo giro (pacchetto, import, API, openapi, Palazzi, miniature): 12 file, 109 test verdi (`vitest-sandbox-pacchetto.txt`).
- `tsc -p tsconfig.server.json` EXIT=0; `tsconfig.test.json` pulito tranne un file che importa `src/` (assente nella sandbox); eslint sui
  file toccati EXIT=0.

### Riallineamento alla stesura generica (2026-10-20: contenitore, `nomeRivisto`, rotte `/api/aree/:contenitore/:chiave`)
Verificato contro la versione nuova di modifiche.md (§1.1, §2.1, §3.1, §3.2) e il messaggio di Stesura modifiche: la 109 preparata **non
cambia**. Schema della tabella `area` e chiave `citta/<quartiere>/<slug>` invariati; `nome_rivisto` era già nella 109 con la regola del
§2.1.4 (1 se una planimetria ha `nome_rivisto=1` o il gruppo `nomeRivisto`): sulla copia di `data/` vale 1 per Sottopasso e Banchina Aoyama
Itchome, 0 per le altre 20; il test lo controlla area per area. DTO (`ContenitoreAreaDto`, `contenitore` in `AreaRifDto`/`AreaRiassuntoDto`,
`nomeRivisto`) e rotte con `:contenitore` non sono nella preparazione: si scrivono direttamente nella forma generica al porting
(`:contenitore` ammette solo `citta` in L2). Il cambio del Covo (fermata su /guida/covo) è solo del FE.

### Aggiornamento: l'Area riservata allo staff diventa un'Area di Tokyo «da verificare» (decisione dell'utente, 2026-10-20)
Da modifiche.md §1.1 e §2.1.6, aggiornati da Stesura. Nella 109 (sandbox, copia in `preparazione-be/`):
- `area` ha `citta_chiave TEXT CHECK (citta_chiave IN ('tokyo'))` e `da_verificare INTEGER NOT NULL DEFAULT 0 CHECK (0,1)`; il CHECK del
  contenitore è «esattamente uno» fra quartiere, Palazzo e città. **Aggiunta**: indice unico `area_slug_citta (citta_chiave, slug)`, come
  quelli di quartiere e Palazzo, perché lo slug sia unico in ogni contenitore.
- La regola delle Aree prende anche le planimetrie figlie di Tokyo con la stessa logica (gruppi, versioni, ordine, origine): diventano
  Aree della città con `da_verificare = 1`. Oggi è solo lo staff: `citta/tokyo/area-riservata-allo-staff`, ordine 0, `seed`, predefinita
  `150-3-0` «porzione occidentale» (v. 0), `150-3-1` «planimetria completa» (v. 1); genitore `tokyo` e chiavi invariati.
- Test 109 aggiornato (2/2, `esiti/vitest-109-3.txt`): Area dello staff esatta, nessun'altra «da verificare», 9 etichette, staff figlio di
  Tokyo, senza Area solo la figlia dei Memento e il Palazzo; il CHECK rifiuta due contenitori, nessuno e una città diversa da Tokyo.
- Copia nuova di `data/` (`esiti/esito-109-staff.json`): **23 aree** (Tokyo 1), **29 planimetrie**, **9 etichette**, **3 aree con più
  versioni**, **0 senza area**, 0 violazioni FK; impronta del lavoro da preservare identica (`1a71b030…`); impronta del mondo: solo le 2
  colonne nuove degli ingressi; cestino vuoto con contatore 20 (nel frattempo l'app ne ha usati altri), che resta 20.
- Test vicini: 28 file, 175 test verdi (`esiti/vitest-sandbox-vicini-3.txt`); tsc ed eslint puliti.
Al porting: `ContenitoreAreaDto.tipo` con `'citta'`, `AreaRiassuntoDto.daVerificare`, `PUT` con `{ daVerificare: false }` («Tieni»),
«Rimuovi» = DELETE nel cestino, casa `/guida/citta/tokyo/<slug>`, i test «Tieni» e «Rimuovi»/ripristino.

### Da fare alla consegna di L1 (nell'ordine del §5 di modifiche.md)
DTO in `shared/types.ts` (FE parte da lì), la 109 + test + registrazione, le due INSERT per nome, poi `casaMappa`, `areeService` (con
`assegnaAreeMondo` copia della regola e test di equivalenza), servizi, rotte, openapi, i test del §6.1 e l'allineamento del §6.1.14.
