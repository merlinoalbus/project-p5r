# L3 «Palazzi: aree e infiltrazioni» — implementazione BE

Autore: sessione «Implementazione BE», 2026-10-20. Cartella di sviluppo `pensive-burnell-b50941` (branch `newreview`, BE 3201), sopra il
commit L2 `1db43bd8` e il ritocco L2 `d66cf5f5`. Riferimenti: `modifiche.md` (§1–§7), `dati.md` (§1–§8.1), G-022 in `guida/registro.md`.
Niente commit né push (li fa il PM).

## 1. Che cosa c'è

### Migrazione 110 `server/db/migrations/110_aree_dei_palazzi.ts` (registrata in `index.ts`)
- Tabelle nuove: `infiltrazione_area`, `voce_infiltrazione`, `proposta_infiltrazione_voce` (nel SQL di §2.1.6 la colonna
  `infiltrazione_chiave` compariva due volte: è una sola); colonne di `voce_giornata` `da_rivedere`, `aggiunta_da`, `testo_precedente_json`,
  `motivo_revisione` (solo se mancano; senza CHECK, come nel §1.4, così L10 le riusa).
- Aree: un'Area per gruppo d'immagini e per planimetria sciolta sotto `dungeon-<k>` (ogni Palazzo tranne i Memento, Iweleth compreso),
  nome della predefinita con la copia di `titoloGruppoImmagini` / `nomePresentazioneMappa` / `senzaGergo`, slug con `-2`…, ordine = ordine di
  mappa minimo, predefinita = #0 del gruppo, versioni nell'ordine di mappa, etichetta del gruppo, origine come §2.1.2.
- Legami da `mappa_entita` di tipo area (seed solo se tutte le righe lo sono; `planimetria_iniziale` = la prima di mappa legata) più la
  coppia del pin 777 (`regola`). **Ritocco**: i legami si ricavano solo per le Aree nate in quella chiamata. Sulla prima esecuzione sono
  tutte (risultato identico: 93/105); quando l'import di un pacchetto di prima riusa la regola, una riga vecchia di `mappa_entita` non
  rimette un legame che l'utente ha tolto.
- Diario: proposte di G-022 (37 voci: le 34 della tabella + 11-13 giorno, 10-03, 01-02), con chiavi e nomi delle infiltrazioni controllati
  uno per uno (chiave, Palazzo, ordine, nome); correzioni del team F4, N1–N3, B1, S1 col testo precedente; 11-13 sera solo segnalata; voce
  nuova Kaneshiro 06-26 (uid fisso `8c58ad986d8176c681c76ed93d2d3fe5`, in fondo alla fascia). Ogni scrittura controlla uid, data (mai
  `BETWEEN '04-01' AND '06-01'`) e valore di oggi: una differenza ferma tutto. `updated_at` delle voci corrette **invariato** (§2.2: «ogni
  altra colonna invariata»).
- **Base senza il diario curato** (`diarioCurato110`): il pacchetto iniziale in git (`pacchetto/gioco.db`, versione 93) è di una generazione
  precedente (18 infiltrazioni di Kamoshida con altre chiavi, voce M1 assente). Se manca una voce o un'infiltrazione di G-022, la parte del
  diario si salta con un `warn` nel log (le Aree si creano lo stesso). Su una base curata ogni differenza ferma la migrazione. Approvato
  dal PM; rigenerare il pacchetto è una decisione per L11.

### Servizi
- `server/services/mappe/legamiInfiltrazioni.ts` (**nuovo**, dipende solo dal database): letture comuni dei legami, `impostaLegamiInfiltrazione`
  (l'unica scrittura, dai due lati), `staccaAreaDalleInfiltrazioni`, `staccaInfiltrazioneDalleVoci` (toglie le posizioni dagli insiemi e
  dalle proposte e ricompatta). File nuovo, non previsto dal §5: serve a evitare giri di import fra i servizi.
- `casaMappa.ts`: casa di L3 (radice → `/guida/dungeon/<k>`, Area → `/guida/dungeon/<k>/area/<slug>` + `?planimetria=`), **dietro
  l'interruttore `CASA_SCHEDA_PALAZZI`** (FUN3-1, vedi §3).
- `areeService.ts`: contenitore `dungeon` (planimetrie di tipo `area` sotto `dungeon-<k>`, niente punto: 400 `punto-non-ammesso`),
  infiltrazioni e raccolta nel riassunto (nei Palazzi la raccolta della scheda, con la partita; nel mondo `presi` null), `creaArea` con
  `infiltrazioni`, `impostaInfiltrazioniDellArea`, `areeDelPalazzo`, `assegnaAreePalazzi`, `eliminaArea` con `pinConVoci` e `infiltrazioni`
  nel riepilogo (le voci restano). `collocaPlanimetria` con `dungeon`: nei Palazzi «Sposta la versione» e «Rendila un'area a sé».
  L'etichetta della versione resta. L'unica versione di un'Area che entra in un'altra **fonde** le due Aree: i legami passano, la vecchia vuota se ne va.
  Rotte vecchie riscritte: `impostaInfiltrazioniDellaPlanimetria`, `presentazioneDellaPlanimetria`, `stanzaDellaPlanimetria` (per le mappe
  con un'Area; quelle senza Area, cioè Memento e radici, restano sulle funzioni di prima).
- `dungeonService.ts`: `mappeDelleAree` dai legami (le planimetrie di un'infiltrazione sono tutte le versioni delle sue Aree),
  `planimetrieDelPalazzo` con `area`/`versioneEtichetta`, `areePalazzo` nella scheda e nelle infiltrazioni (**assenti per i Memento**, NR3-1),
  `creaArea` (infiltrazione) con `areePalazzo` (e `planimetria` = l'Area di quella planimetria), `impostaAreePalazzoInfiltrazione`,
  eliminazione dell'infiltrazione che toglie legami e posizioni nei diari (nel cestino; il ripristino rimette tutto).
- `palazziService.ts` (boss finale), `contenutiGuidaService.ts` (destinazione con `casa`, contenuti della planimetria dai legami, nome
  dell'infiltrazione da `dungeon_area`), `accessoMondoService.ts` (un'infiltrazione → le sue Aree sulla versione da aprire).
- `mappeService.ts`: `creaMappa` 409 `usa-aggiungi-area` sotto un Palazzo (qualunque tipo; Memento no), `mappaPerEntita` dai legami,
  `aggiornaMappa`: un'`entita` di tipo area si lega all'Area della planimetria; colonne `entita_*` e `mappa_entita` di tipo area non si
  scrivono più, e `entita: null` non stacca le infiltrazioni. Tolta `staccaAreaDaOgniMappa`, senza più chiamanti. `sincronizzaLegameEntita`
  non scrive più le righe di tipo area.
- `giornataService.ts`: campi del §3.1 sulla voce (`palazzoDellaVoce`, insieme, opzioni, proposta G-022 o regole (a)/(b),
  `infiltrazioneDaAprire` = prima non completata, poi l'ultima, con la regola di `completamentoAree.ts`), stato «da rivedere» (solo quando
  c'è), `impostaInfiltrazioniVoce`, `rivediVoce`. Eliminando una voce se ne vanno anche il suo insieme e la sua proposta.
- `cestinoService.ts`: etichette di `infiltrazione_area`, `voce_infiltrazione`, `proposta_infiltrazione_voce`. `catalogoService.ts:312`
  riguarda solo luogo/negozio: **nessuna modifica**.
- `cittaService.ts`: il contenitore del quartiere con i campi nuovi.

### Pacchetto delle mappe (§2.3: andata e ritorno identica)
- Export: per mappa `nomeRivisto`, `origine`, `updatedAt`, `percorsoFisso`, `entitaLegami` (righe di `mappa_entita` con la fonte); per pin
  `origine`, `updatedAt`, `seedIdentita`, `nativoJson`; `legami` delle Aree esportate; `updatedAt` delle Aree; il campo vecchio `aree` per
  mappa = infiltrazioni dell'Area.
- Import: scrive quei campi identici (origine forzata solo se il chiamante la chiede, come per il seed); `legami` sostituisce l'insieme
  delle Aree importate; un pacchetto di prima (senza `legami`) lega le infiltrazioni di `aree` all'Area della planimetria, oppure
  all'Area dell'antenato più vicino se la planimetria è annidata. Dopo, `assegnaAreePalazzi` per le planimetrie senza Area. Il pin che torna
  con lo stesso uid riprende il suo id e il testo delle condizioni; pezzi e copie riprendono id e `updated_at` se uguali (`pezziMappa.ts`).
  L'`updated_at` delle mappe è quello del pacchetto anche dopo immagini e ruoli. `aree` non valido è sempre un 400.
- `statiGuida.ts`: `spillo_partita` si riscrive solo se `raccolto` cambia (difetto 4 di L1 noreg §5).
- Esito su copia di `data/` (`scratchpad/l3/andata-ritorno.mts`): con «sovrascrivi» **0 differenze** colonna per colonna su mappa,
  spillo, mappa_entita, area, infiltrazione_area, spillo_voce, spillo_destinazione, pezzo_mappa, copia_pezzo, dungeon_atterraggio,
  mappa_alias, mappa_percorso, mappa_presentazione, quartiere_ingresso, marcatore_mappa, spillo_partita, punto_partita, voce_giornata.
  **Unica eccezione**: `asset` di 2 mappe (`mappe/palazzo-di-madarame-il-labirinto-contorto`, `mappe/shibuya-tornello-…`) → null, la
  regola F9 di L1 già validata (asset inesistente). Senza «sovrascrivi»: 0 differenze.

### DTO, schemi, rotte, OpenAPI
- `shared/types.ts`: campi del §3.1 (tutti facoltativi nei tipi, il server li manda per i Palazzi; per i Memento sono assenti), `InfiltrazioneDto`,
  `EsitoRevisioneVoce`, `LegamePacchetto`, `LegameEntitaPacchetto`, campi nuovi del pacchetto. `shared/organizzazioneMappe.ts`:
  `DestinazioneGuidaDto.casa`.
- Rotte nuove: `PUT /api/aree/:contenitore/:chiave/:slug/infiltrazioni`, `PUT /api/compendio/aree/:chiave/aree-palazzo`,
  `POST /api/compendio/percorso/voci/:uid/rivista`. Cambiate: `GET`/`POST /api/aree/:contenitore/:chiave` (partita, `infiltrazioni`),
  `PUT /api/aree/colloca` (`dungeon`), `POST /api/compendio/dungeon/:k/aree` (`areePalazzo`), `PUT /api/compendio/percorso/voci/:uid`
  (`infiltrazioni`, da solo), rotte vecchie `/api/mappe/:k/aree|presentazione|stanza`. OpenAPI aggiornata (`aree.ts`, `compendio.ts`, `mappe.ts`).

## 2. Verifiche
- 110 su copia di `data/` (API di backup) e sulla copia d'avvio pre-110: aree 101 (117), 10/8/13/18/11/13/16/12 (+16), planimetrie 219 (245),
  senza area 0, etichette 187 (203), legami 93 (105) con 1 `regola`, infiltrazioni senza aree 15, aree senza infiltrazione 31 (35), Memento 0,
  aree del mondo 23, `mappa_entita` area 130 e colonne 105 invariate, `voce_infiltrazione` 0, proposte 37 voci / 102 righe, corrette 6,
  segnalate 1, nuove 1, validato toccato 0, idempotente, FK vuoto. Test no-reg: verde anche sulla copia della produzione (boot reale 106 → 110).
- 117 nomi dorati: uguali uno per uno alle funzioni vere del FE e a `l3aree-dev.json`; riferimento in
  `server/db/migrations/dati/110-nomi-aree-palazzi.json` (scritto con Write, identico byte per byte al calcolato).
- Applicata a `data/` del 3201 alle 01:38Z (copia d'avvio `data/backups/project-p5r-2026-10-20T01-38-43-678Z.{db,partite.db}`), stessi
  numeri.
- Test (solo quelli dell'area, come da regola): 110 (6 casi), 109 (2), `palazzi-aree` nuovo (12 casi: FUN3-1, NR3-1, §6.1 punti 2, 4, 5, 6,
  6b, 8, 9, 9b, 9c, 9d); allineati alle attese nuove senza togliere casi: `atterraggio-palazzi`, `mappe-editor`, `planimetrie-palazzo`,
  `planimetrie-aree-multiple`, `stanze-planimetrie`, `aree-eliminabili`, `aree-mondo` (11), `cestino`, `condizioni-pin`, `enigmi-guida`,
  `guida-pin`, `verifica-mappe` (B4), `guida-modificabile`, `immagine-mappa-strade`, `immagine-mappa-unica`, `nuova-area`,
  `palazzo-completato`, `organizzazioneMappe`. Aiuto comune nuovo `test/planimetriaDiPalazzo.ts` (la preparazione che prima usava
  `creaMappa` sotto un Palazzo, ora 409). Giri: 61 file / 453 test (area mappe e Palazzi) e 84 file / 579 test (diario, raccolta, cestino,
  completamento), tutti verdi.
- `tsc -b tsconfig.full.json` (FE compreso) e `eslint server shared test` verdi. BE 3201: letture principali 200, nessun errore nel log dopo
  le modifiche.

## 3. Da sapere / da fare
- **Interruttore `CASA_SCHEDA_PALAZZI` (FUN3-1) — TOLTO** (2026-10-20, dopo l'avviso di FE: rotta `/guida/dungeon/<k>/area/<slug>` pronta).
  Tolti la variabile, `impostaCasaSchedaPalazzi`, `conCasaSchedaPalazzi` e i rami (`casaMappa.casaDellArea` e `casaDellaMappa`,
  `contenutiGuidaService.destinazioneGuida`): la casa di L3 è l'unico comportamento (radice → scheda, planimetria → Area della scheda, alias
  → `?infiltrazione=`; i Memento nel visore). Nessuna variabile nel docker-compose né nel container (non ce n'erano). Test: `palazzi-aree`
  «FUN3-1» riscritto sulla casa unica e «4» senza interruttore; `aree-mondo` «3/4» allineato (una planimetria di Kamoshida → scheda).
  22 file / 253 test dell'area verdi (`lotti/L3/esiti-casa-scheda.txt`), typecheck e lint verdi; dal vivo sul 3201 `risolvi/dungeon-madarame`
  → `/guida/dungeon/madarame`. File: `casaMappa.ts`, `contenutiGuidaService.ts` (contiene anche lavoro di L4: da committare a parte),
  `palazzi-aree.test.ts`, `aree-mondo.test.ts`.
- Proposte di G-022: certezza «multipla» con più infiltrazioni, «probabile» per B1 e N3 (letta in sintesi o con riserva), «certa» le altre;
  regola «data-nel-nome» per K1–K3, «letta-voce-per-voce» per il resto; motivi in parole (`MOTIVO_*` nella migrazione).
- Scelte del BE dove il progetto taceva: «Sposta la versione» dell'unica versione di un'Area fonde le Aree; «Rendila un'area a sé»
  sull'unica è un 400; con le rotte vecchie `/stanza` `con` + `nome`, l'Area d'arrivo con una sola planimetria prende quel nome; `entita:
  null` dall'editor non stacca le infiltrazioni; il pin, i pezzi e le copie reinseriti riprendono il loro id (identità del pacchetto).
  Accolte da Stesura (modifiche.md §3.6) con le protezioni del §4 qui sotto, implementate.
- Dichiarazione (memoria «modifiche dirette»): in L2 `server/routes/aree.ts` e `server/openapi/descrizioni/aree.ts` sono stati modificati
  con uno script node (commit `d66cf5f5`); verificati dopo, riga per riga: nessun effetto collaterale (UTF-8 senza BOM, LF, `git diff --check`
  pulito). In L3 sono stati usati anche comandi `sed` sui sorgenti, sui test e su `difetti.md`: l'elenco completo è al §5. **Era contro la
  regola dell'utente** (solo Edit e Write diretti): dal richiamo del PM del 2026-10-20 non succede più, nemmeno per una riga.

## 4. Correzioni dopo il no-reg e le scelte accolte (2026-10-20)
Ogni correzione con il test visto prima rosso. Solo Edit e Write.
- **NR3-2 (media)** — `routes/mappe.ts`: la rotta `POST /api/mappe/importa` non forza più `origine: 'utente'`: origine e ultima modifica di
  mappe e pin sono quelle del pacchetto; un pacchetto di prima di L3 (senza `origine`) dà righe dell'utente, come prima; solo il seed la
  forza. Test `palazzi-aree` «NR3-2, NR3-3» (esporta → importa **dalla rotta**, con e senza «sovrascrivi», tabelle identiche colonna per
  colonna, pin del seed contati): rosso prima (origine), poi rosso solo per l'immagine, poi verde.
- **NR3-3 (bassa)** — `mappeService.importaMappe`: un'immagine di mappa identica byte per byte a quella salvata non si riscrive (nome del
  file, data, `?v=` e miniature restano; la mappa la registra con le dimensioni dell'intestazione, come prima). Stessa regola, per
  completezza, alle **schermate dei pin** che tornano con lo stesso uid (oggi 0 nei dati, ma ricevevano chiave e riga nuove a ogni
  reimportazione): stesso posto, didascalia e byte (o asset) → riga, chiave e data di prima; le altre si tolgono a pacchetto inserito. Nel
  test, la parte delle schermate vista rossa disattivando la ripresa, poi verde. Un'immagine diversa si scrive ancora (verificato nel test).
- **O3-1 (decisione del PM)** — `bootstrap.ts`: il limite del corpo della sola `POST /api/mappe/importa` passa da 64 a **512 MB**; il resto
  resta a 5 MB. Test nuovo `server/routes/importa-mappe-grande.test.ts`: 9 mappe con immagini da 7,5 MB (JSON oltre 64 MB) → 200 con le 9
  immagini (rosso prima: 413); un corpo di 6 MB su un'altra rotta resta 413. **Prova sull'esportazione completa reale** (copia di `data/`
  nello scratchpad, `l3/rotta-completa.mts`, HTTP vero): esportazione 98,3 MB in 0,8 s; importazione con «sovrascrivi» 200 in 1,7 s (317
  mappe, 1759 pin, 32 immagini), senza 200 in 0,6 s; tabelle, immagini e miniature **identiche**, salvo le 2 differenze note di F9 (asset
  dichiarato senza file su `palazzo-di-madarame-il-labirinto-contorto` e `shibuya-tornello-…`, preesistente da L1). **Memoria**: picco 1,6
  GB di RSS nel processo che faceva anche da client (stringa, pacchetto e corpo in più copie), limite dello heap di Node 4,1 GB; il solo
  backend sta sotto. Nel docker-compose non c'è un limite di memoria per il container. **Proxy** (autorizzato dal PM): `nginx.conf`, solo nel blocco
  `location = /api/mappe/importa`, `client_max_body_size 64m` → `512m` (riga 75) con un commento (righe 61-62); su p5s vale con la nuova
  immagine del FE. Il FE ha un timeout di 120 s su `importaMappe` (`src/services/api/mappe.ts:89`), largo rispetto agli 1,7 s misurati.
- **§3.6.1 conferma e cestino** — `areeService.collocaPlanimetria`: spostare l'unica versione di un'Area senza `?conferma=1` è un 409
  `area-si-svuota` («<Area> resta senza planimetrie: la versione si sposta in <Area d'arrivo>, <Area> va nel cestino con N legami a
  infiltrazioni»; `details: { area, arrivo, legami }`), e nulla cambia. Confermato: i legami della vecchia passano alla nuova al suo posto
  (`INSERT OR IGNORE`, stesso ordine e origine, la versione spostata da aprire), l'ingresso del quartiere la segue, la vecchia perde la
  predefinita e va nel **cestino** (`area-fisica`, contesto «fusa in «<arrivo>»») con i suoi legami (`conCestino` registra solo la sua
  eliminazione: rimessa, torna vuota con i legami di prima e la versione resta dov'è). Con più versioni nessuna conferma. «Rendila un'area a
  sé» sull'unica → 400 `gia-area-a-se` (prima `colloca-non-valido`). Le rotte vecchie (`/stanza`, `/presentazione`) non conoscono la
  conferma: il loro gesto era esplicito; l'Area svuotata va comunque nel cestino. Rotta `PUT /api/aree/colloca` con `queryColloca`.
  Test «§3.6.1 — spostare l'unica versione…» (rosso prima: nessun 409) e «6b» allineato a `gia-area-a-se`.
- **§3.6.1 nome dalle rotte vecchie** — `stanzaDellaPlanimetria`: l'Area d'arrivo di una sola planimetria prende il `nome` come correzione
  (`aggiornaArea` salva il seed alla prima modifica: «Ripristina» la riporta), mai sopra un nome dato dall'utente (`nome_rivisto = 1` su
  un'Area dell'utente o già corretta), che resta. Test «§3.6.1 — la rotta vecchia `/stanza`…» (rosso prima: il nome dell'utente veniva
  sovrascritto).
- **§3.6.3 id occupati** — `importaMappe` e `pezziMappa.sostituisciPezzi`: un pin, un pezzo o una copia che torna con lo stesso uid e trova
  il suo id preso da un'altra riga ne riceve uno nuovo (i riferimenti — voci, stati delle partite, passaggi, atterraggi, copie — lo seguono
  per uid, come già prima) e l'esito lo elenca in `idCambiati` (`{ tipo, uid, prima, dopo }`, assente se vuoto). Test «§3.6.3» (un pin
  nuovo in testa alla mappa prende l'id liberato; il pin di prima ne ha uno nuovo, lo stato della partita lo segue; rosso prima disattivando
  l'elenco).
- **§3.6.2** (`entita: null` non stacca) era già così e documentato in OpenAPI.
- OpenAPI: `PUT /api/aree/colloca` (409 `area-si-svuota`, 400 `gia-area-a-se`, cestino), `POST /api/mappe/importa` (origine, 512 MB,
  `idCambiati`, immagini identiche), `PUT /api/mappe/:chiave/stanza` (cestino, nome).
- Verifiche: `palazzi-aree` 16/16; i file dell'area (aree, planimetrie, stanze, cestino, pacchetto, pezzi, seed, migrazioni 067/082/104/109,
  OpenAPI) 35 file / 316 test verdi; `tsc -b tsconfig.full.json` e `eslint .` verdi.
- **Per FE**: la finestra «Sposta la versione» deve gestire il 409 `area-si-svuota` (mostrare il messaggio, «Sposta e metti <Area> nel
  cestino» → stessa chiamata con `?conferma=1`); il codice di «Rendila un'area a sé» sull'unica versione è ora `gia-area-a-se`.

## 5. Comandi `sed` usati sui file (elenco completo, ricostruito dalla trascrizione della sessione)
Ore in UTC del 2026-10-20 (salvo dove detto). «Per corrispondenza» = sostituzione senza numero di riga, sulle righe che corrispondevano.
**L3** (dalle 01:21):
- `server/db/migrations/110_aree_dei_palazzi.ts` — per corrispondenza: la colonna `da_rivedere` nel testo dell'`ALTER` (01:21);
  `const INFILTRAZIONI` → `export const` (01:26); `interface Proposta|Correzione|CampiVoce` → `export interface` (01:26).
- `server/db/migrations/110_aree_dei_palazzi.test.ts` — per corrispondenza: `runMigrations(db)` → `runMigrations(db, CON_LA_110)` (2 forme)
  e il blocco prima di `afterEach` (01:28).
- `server/db/migrations/109_aree_del_mondo.test.ts` — per corrispondenza: `runMigrations(db)` → con le sole migrazioni fino alla 109 (01:28).
- `server/db/migrations/index.ts` — per corrispondenza: `migration110` nell'elenco (01:38).
- `server/services/mappe/accessoMondoService.ts` — riga 30: `casa` nella risposta (01:39).
- `server/services/mappe/contenutiGuidaService.ts` — per corrispondenza: la riga d'import da `casaMappa.js` (01:40, 02:02).
- `server/services/mappe/mappeService.ts` — per corrispondenza: `LegamePacchetto` nell'`import type` (01:48).
- `server/services/giornataService.ts` — per corrispondenza: `partita: partitaId` nel contesto (01:54).
- `server/routes/compendio.ts` — righe 12, 13, 21, 26, 28: gli import (01:55).
- `server/routes/aree.ts` — per corrispondenza: le due righe d'import (01:56).
- `server/openapi/descrizioni/aree.ts` — riga 25 (02:06); `server/openapi/descrizioni/mappe.ts` — righe 107 e 109 (02:06).
- Test: `atterraggio-palazzi.test.ts` righe 14, 19, 55–58, 158 (01:59–02:00); `mappe-editor.test.ts` righe 12, 30, 556, 557 (02:00);
  `aree-mondo.test.ts` riga 206 (02:03); `aree-eliminabili.test.ts` riga 8 e una riga per corrispondenza (02:07); `condizioni-pin.test.ts`
  righe 14, 17, 299 e `enigmi-guida.test.ts` una riga per corrispondenza (02:08); `services/mappe/organizzazioneMappe.test.ts` riga 14 e una
  per corrispondenza (02:09); `guida-modificabile.test.ts`, `immagine-mappa-strade.test.ts`, `immagine-mappa-unica.test.ts` per
  corrispondenza (`creaMappa(… tipo: 'area', genitore: 'dungeon-…')` → `planimetriaDiPalazzo(…)`, e la riga d'import aggiunta), più
  `guida-modificabile.test.ts` riga 15 e `palazzo-completato.test.ts` riga 20 (02:09–02:10); `palazzi-aree.test.ts` una riga per
  corrispondenza (02:14).
- Documenti: `lotti/L3/difetti.md` riga 8 (NR3-1 alle 01:41, FUN3-1 alle 02:03).
**Prima di L3, nelle correzioni di L1 e L2 dello stesso giro** (dal 2026-10-19 23:46 UTC alle 01:16): `server/services/mappe/mappeService.ts`
(righe 25, 37, 41, 42, la 1938 e import per corrispondenza), `server/routes/immagini.ts` (riga 61 e import), `server/services/cittaService.ts`
(import, riga 195), `server/db/migrations/index.ts` (riga 118, elenco 108), `server/index.ts` riga 27, `server/services/pacchetto/pacchettoGioco.ts`
riga 30, `server/services/mappe/contenutiGuidaService.ts` riga 14, `server/services/mappe/casaMappa.ts` (import), `server/routes/index.ts` e
`server/openapi/descrizioni/index.ts` (import), `server/routes/mappe.ts` riga 15, `server/services/immaginiService.ts` (import, riga 101 due
volte), `server/openapi/descrizioni/immagini.ts` riga 53 e `mappe.ts` riga 32, `server/services/mappe/areeService.ts` righe 360 e 364 (due
volte), `server/openapi/descrizioni/aree.ts` riga 54 (e per corrispondenza), le date `2026-10-21` → `2026-10-20` in `109_aree_del_mondo.ts`,
`109_aree_del_mondo.test.ts`, `aree-mondo.test.ts`, `scarico-fonte.test.ts`, `areeService.ts`, `casaMappa.ts` e `shared/types.ts`; test
`percorsi-map.test.ts` (righe 1–3, 12, 13, 14, 17), `cestino.test.ts` (righe 140, 194), `mappe-editor.test.ts`, `copia-voci-area.test.ts`
(riga 55 e una per corrispondenza), `aree-mondo.test.ts` (riga 253 e una per corrispondenza); documenti `lotti/L2/difetti.md` righe 8, 9, 16.
Tutti i file risultanti sono stati poi controllati con typecheck, lint e i test dell'area (verdi al commit `caf7b511` e `de67b349`).
- L2 nella stessa giornata: FUN2-5 (testo neutro «1 passaggio che porta qui») e rotta `GET /api/aree/:contenitore/:chiave` per FE.
