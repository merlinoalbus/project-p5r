# L11 «Pulizia e ricerca» — Ondata 6: schede di chiusura B19, B20, B21 e chiusure finali degli altri blocchi

Analisi, 2026-10-24, **sola lettura**. Richiesta del PM: scheda di implementazione dei blocchi di chiusura di L11 (B19 codice morto residuo, B20 documenti, B21 chiusura) più le chiusure finali di altri blocchi (rigenerazione dell'inventario B1, prova di B10 su pacchetto vecchio e cestino dopo i drop, collaudo riservato all'utente `R11-09/collaudo-utente`). Stesso formato di `ondata1-2026-10-24.md` e `ondata1/*.md`: per ogni voce **(a)** se è già soddisfatta, con la prova `file:riga` letta; **(b)** se no, la modifica precisa e l'ordine dei passi; **come si verifica senza test**; rischi. Nessun commit, nessun codice né dato toccato, nessun test eseguito.

Regole del repository che valgono qui: zero test (nessun test nuovo o eseguito; `R11-24` si legge come typecheck, lint, build e `npm audit`, vedi decisione C13); modifiche ai test **solo per farli compilare**; nessuna scrittura sui dati dell'utente (copie nello scratchpad); repo pubblico (nessun nome utente, nome di partita o indirizzo di server in questo file né nei documenti da scrivere); il numero di una migrazione nuova **non si riserva** (primo libero al commit).

## 0. Come è stata fatta la misura (e quanto vale)

- **Codice**: worktree `newreview` letto il 24/10. **Il worktree si muove mentre si lavora**: nel corso di questa analisi sono arrivati i commit `7e863137` (B10), `a8344484` (B5: `GET /api/mappe/gerarchia`), `43d184f1`, `b86363bd`, `2d64f92e` (B2), e nel working tree `AlberoLuoghi.tsx` risulta cancellato (stato `D` in `git status`), `MappaPage.tsx` e `mappeService.ts` modificati, un file temporaneo `zz-b5-migra.tmp.ts` in radice (non va in nessun commit: vedi §5.5). Tutte le cifre dei §3 e §4.5 sono **un'istantanea**: B19 e B20 le rifanno con gli script del §3.2 e del §4.5 a ondate 1–5 consegnate.
- **Dati**: solo la copia `sim-142b` dello scratchpad (gioco a schema 146, partite con `user_version` 30; `{ readonly: true }`) e `pacchetto/gioco.db` (schema 93, 71 tabelle, aperto in sola lettura). Nessun accesso a `data/`.
- **Strumenti**: solo `node -e` di sola lettura (nessun file scritto nel repository tranne questo). Gli script che ho usato sono riportati nei §3.2 e §4.5, così si rifanno senza fidarsi dei miei numeri.
- **`stato.json`** letto il 24/10 (`aggiornato` è `2026-10-23T06:44:00Z`, ma il file è modificato nel working tree da altre sessioni): conteggi in §4.2.

## 1. In breve

- **Nessuna voce di questi blocchi è soddisfatta per intero con prova**. Parziali con prova: `R11-03/2` (`useRisolviAsset` già rimossa), e le quattro voci di B10 (`R11-05/1`, `05/2`, `05/3`, `06/1`) con **codice consegnato** in `7e863137` ma **non provabili finché nessuna migrazione di eliminazione ha riempito `FONTI_TOLTE`** (oggi `export const FONTI_TOLTE: readonly FonteTolta[] = [];`, `server/db/fontiTolte.ts:24`).
- **`tsc` ed ESLint non trovano le esportazioni inutilizzate**: trovano solo import e locali inutilizzati (`noUnusedLocals`/`noUnusedParameters` in tutti i quattro progetti, `@typescript-eslint/no-unused-vars` in `tseslint.configs.recommended` e, per il BE, con il pattern `_`). `R11-03` («nessuna esportazione inutilizzata segnalata») **non si dimostra con `typecheck` e `lint`**: serve uno script di sola lettura (§3.2). Misurato oggi: **42 esportazioni senza alcun uso** (fuori da migrazioni e test, commenti esclusi; **3 di esse sono appena scritte da B5/B2 e non ancora cablate, quindi non morte**: `FinestraCollocaPlanimetria`, `getGerarchiaMappe`, `useBozzaSporca`) e **13 usate solo dai test**, più **4 file interi** senza importatori non-test.
- **Il codice morto vero è quasi tutto «piccolo»**: le grandi voci elencate nella preparazione del 23/10 (7 rotte, `collegaPalazziAiLuoghi`, `applicaPresenzaAiLuoghi`, `zoneDeiPezzi`, `importaPacchetto`, `ripristinaIstanza`) sono ancora lì; ne sono emerse altre (§3.3), compresa **una ottava rotta orfana** (`GET /api/mappe/spilli/:id/precondizione-raccordo`, `server/routes/mappe.ts:153`, nessun consumatore in `src/`).
- **Rami di compatibilità**: **170 occorrenze in 54 file** (non «circa 140»: 78 `sqlite_master`, 30 `PRAGMA table_info`, 18 `pragma_table_info`, 24 `conLegami(`, 12 `haTabella(`, 4 `tabellaGioco(`, 2 `haColonna(`, 2 `tabellaEsiste(`). Una parte è **legittima** (import, backup, cestino, archivio: restano), una parte cade con i drop di B8/B9/B12/B15, una parte è **guardia su strutture sempre presenti** (la migrazione che le crea è registrata): quest'ultima è il vero lavoro di B19 (§3.4).
- **ARCHITETTURA**: 1748 righe che finiscono a L3 + una sezione «L7 in lavorazione locale» di bozze del 21/10 (`ARCHITETTURA.md:1718-1748`) e **nessuna sezione per L4, L5, L6, L8, L9, L10, L11**; 8 percorsi di file citati non esistono; la testa (`:3-29`) dice «non rilasciata», «M7 inattiva», «ultimo typecheck fallito». Va riscritta **per dominio**, non per fase (§4.1).
- **DECISIONI**: la tabella D1–D8 («consigliate applicate, da confermare», `DECISIONI.md:2088-2099`) non ha **nessuna conferma esplicita dell'utente** in tutto il file; due dichiarazioni del 24/10 citate dal PM («modifiche ai test solo per compilare», «il numero di una migrazione non si riserva») **non sono in `docs/DECISIONI.md`** (grep: nessuna occorrenza). D6 e D8 sono state **superate da parole dell'utente del 23/10** (riga `2026-10-23` della tabella in testa). Dettaglio in §4.3.
- **OpenAPI**: rispetto ai router **nessuna descrizione orfana** (293 descrizioni, di cui 4 delle rotte dell'app; 306 rotte nei router) ma **17 rotte senza descrizione** (L7, L9, L10 in lavorazione). Il documento si costruisce dalle rotte montate (`server/openapi/rotte.ts:48-53`), quindi «solo rotte esistenti» è vero **per costruzione**; resta da garantire 1:1 (`openapi.test.ts:36-41`, che non si esegue: lo sostituisce lo script del §4.5).
- **R11-16/17**: nella lettura decisa («Importa» sostituisce, niente unione) le correzioni **sono dentro il file di export** per costruzione (`copiaDatabase` → `copiaSchema(getDb(), …, 'main')`, `impostazioniService.ts:128-139`) e **dentro la copia di sicurezza** che l'import scatta prima di installare (`copiaDiSicurezza`, `impostazioniService.ts:253-266`). **Scoperta**: la copia di sicurezza ne conserva **solo 3** (`COPIE_DI_RIPRISTINO = 3`, `:250`): tre import consecutivi (anche di prova o falliti a metà) fanno sparire la copia con le correzioni di prima (§5.1, decisione C16).
- **Strumenti d'impronta**: la preparazione dice che stavano tutti fuori dal repository. **Non è vero per uno**: `docs/coordinamento/collaudo/collaudo-dati.cjs` (122 righe) è nel repository e fa foto, ripristino e impronta di **ogni tabella** di entrambi i file. Non esistono invece in nessun punto del repository `impronta.cjs` (lavoro da preservare) e `impronta-mondo.cjs`: da ricreare (§5.3).

## 2. Voce | stato | prova o modifica precisa

| Voce | Stato | Prova / modifica precisa |
|---|---|---|
| **R11-03/1** servizi orfani | **Non soddisfatta** | Elenco misurato in §3.3.A–B (server: 11 funzioni e 2 schemi senza alcun uso, 6 funzioni usate solo da test). Modifica: togliere le funzioni elencate, **dopo** B7 (rotte), B8, B9, B12, B13, B15 e dopo L8–L10 consegnati; per quelle con test applicare la decisione C1. Verifica: §3.5. |
| **R11-03/2** componenti orfani | **Parziale** | **Già fatto**: `useRisolviAsset` non esiste più (`grep -w useRisolviAsset` su `src server shared scripts test` e su `docs/ARCHITETTURA.md`: 0 occorrenze; la preparazione citava `assetStore.ts:60,79,90` per i tre export rimasti). `AlberoLuoghi.tsx` è in cancellazione nel working tree (B5). **Mancano**: `src/pages/RimossiPage.tsx` (sostituita da `NascostiDallaGuida` in Impostazioni: `router.tsx` manda `guida/rimossi` a `/impostazioni#nascosti`; unico importatore: `RimossiPage.test.tsx`), `src/components/partita/CorreggiRequisito.tsx` (unico importatore: il suo test), `PannelloLuogo` e `GriglieDelLuogo` (dopo B5/B6). Vedi §3.3.C. |
| **R11-03/3** rotte orfane (B7, qui solo promemoria) | **Non soddisfatta** | Le 7 rotte sono ancora montate: `routes/mappe.ts:84` (`/entita/:tipo/:chiave`) e `:177` (`PUT /pezzi/:id`), `routes/compendio.ts:87` (`/arcani`), `routes/catalogo.ts:45` (`/oggetti-di/:categoria`), `routes/partite.ts:109` (`/attiva`) e `:115` (`GET /:id`), `routes/immagini.ts:42` (`GET /:ambito/:chiave`, JSON). **Ottava candidata**: `routes/mappe.ts:153` (`/spilli/:id/precondizione-raccordo`): `grep` su `src/` senza risultati (il FE usa `creaLuogoDaPin` con `revisioneRaccordoAttesa`, `FinestraLuogoDaPin.tsx:165`); la descrizione c'è (`descrizioni/mappe.ts:141`). Decisione C5. |
| **R11-03/4** DTO e utility orfani | **Non soddisfatta** | §3.3.D–E: 2 DTO senza uso (`HealthDto` `shared/types.ts:31`, `InfiltrazioneDto` `:2365`), 5 interfacce di richiesta della pesca, 6 costanti/funzioni `shared/*`, 3 utility FE (`gruppiPlanimetrie.ts` con 4 funzioni su 5, `aperturaTokyo.ts` intero, `lotti.ts` intero). Più i campi DTO che portavano le fonti tolte (`MappaRiassuntoDto.entita`/`gruppoImmagini`, `LuogoDto.marcatore`, `PuntoDto.marcatore`, `ConteggiAlberoDto`): li toglie B8/B9, B19 **verifica** che non restino. |
| **R11-18/1** ARCHITETTURA | **Non soddisfatta** | Piano in §4.1 (sezioni superate per titolo e righe, modello finale da descrivere, verifica). |
| **R11-19/1** ROADMAP | **Parziale** | La tabella L0–L11 esiste (`docs/ROADMAP.md`, sezione «Razionalizzazione (dal 20 ottobre 2026)», intorno alle righe 1304-1327; L5–L7 già aggiornate nel working tree, L8–L11 ancora «⬜»). Mancano gli stati reali di L8–L11 e la riga di L4 («prove utente aperte» è già lì): §4.2. |
| **R11-19/2** DECISIONI | **Parziale** | Esistono la tabella D1–D8 (`DECISIONI.md:2088-2099`) e le sezioni di L0–L4 (intestazioni `## 2026-10-20 — L0…` a `:2101`, `L1` `:2126`, `L2` `:2163`, `L3` `:2214`, `L4` `:2241`). Mancano le sezioni L5–L11 e la distinzione consigliate/confermate: §4.3. |
| **R11-20/1** OpenAPI solo rotte esistenti | **Parziale** | Vero per costruzione (documento dalle rotte montate); stato 1:1 misurato in §4.5; modifica: togliere le descrizioni delle rotte che B7/B9 tolgono, aggiungere le 17 mancanti (non sono di L11 ma bloccano la chiusura), togliere il vocabolario vecchio dai testi (§4.5). |
| **R11-20/2** redirect documentati | **Non soddisfatta** | Elenco degli indirizzi vecchi con destinazione e prova in §4.6; vanno scritti in ARCHITETTURA e nelle descrizioni OpenAPI dei due risolutori (`GET /api/mappe/risolvi/:chiave` `routes/mappe.ts:36`; `GET /api/mappe/accesso/…` `:41`). |
| **R11-16/1** correzioni restano dopo un aggiornamento del pacchetto | **Non soddisfatta** (la lettura è decisa; manca la prova) | §5.1: tre affermazioni da provare su copia (contenuto dell'export, andata e ritorno export→import, rete di sicurezza), un rischio nuovo (rotazione a 3 copie) e una modifica opzionale all'anteprima (decisione C11). |
| **R11-17/1** nessun dato di gioco solo nel pacchetto | **Non soddisfatta** | §5.2: controllo sistematico di sola lettura (tabelle e blocchi `dati_guida`) con `verifica-modificabile.md` di B11 come base; **richiede B11, B16, B17 consegnati**. |
| **R11-01/1** rigenerazione dell'inventario | **Non soddisfatta** (bozza fatta) | §5.4.A: si rigenera **dopo B19** e a L10 consegnato; criterio di uscita (nessuna riga `verifica`, ogni `L=0` ha motivo). |
| **R11-05/1** export senza le tabelle tolte | **Codice presente, prova dopo i drop** | L'export è `copiaSchema` (`impostazioniService.ts:128-139`, `dbService.ts:139`): contiene solo le tabelle vive. Prova in §5.4.B (punto 4). |
| **R11-05/2** import di un DB vecchio converte | **Codice presente, prova dopo i drop** | `sostituisciDatiDiGioco` (`pacchettoGiocoService.ts:~405-460`): anteprima, copia di sicurezza, `installaDatabase`, `riapriIstanza` (migrazioni), `convertiCondizioniDatabaseImportato`, `regoleAllAvvio('rigido')`, `riallineaStati`, controllo Tanaka. «DB vecchio» reale: `pacchetto/gioco.db` a schema 93. Prova in §5.4.B. |
| **R11-05/3** riepilogo degli scarti | **Codice presente (7e863137), prova dopo i drop** | `scartiDelPacchetto` `pacchettoGiocoService.ts:152`; usato nell'anteprima (`:334`), scritto in `riepilogo-scarti.json` nella copia di sicurezza (`:419`) e restituito nell'esito (`:457`); FE `ElencoScarti` (`PacchettoGioco.tsx:76`, usato a `:138` e `:388`). Oggi, con `FONTI_TOLTE` vuoto, ogni scarto è «non spiegato». |
| **R11-06/1** cestino con colonne tolte | **Codice presente (7e863137), prova dopo i drop** | `cestinoService.ts:549` (`tabella-rimossa`) e `:557` (`colonna-rimossa`); frasi in `src/utils/cestino.ts:48-56`; tipo `shared/types.ts:3403`. Prova in §5.4.B (punto 3). |
| **R11-09/collaudo-utente** | **Riservata all'utente** | Procedura di sola lettura in §6. Nessuno script o esecuzione di collaudo a carico dell'agente (`stato.json`, criterio della voce). |

## 3. B19 — Codice morto residuo (R11-03/1, 03/2, 03/4)

### 3.1 Che cosa vedono `tsc` ed ESLint con le impostazioni del repository

| Strumento | Impostazione (letta) | Trova | Non trova |
|---|---|---|---|
| `tsc` | `noUnusedLocals` e `noUnusedParameters` a `true` in `tsconfig.app.json:21-22`, `tsconfig.server.json:17-18`, `tsconfig.node.json:19-20`, `tsconfig.test.json` (stessa coppia) | import inutilizzati, variabili e funzioni **non esportate** inutilizzate, parametri inutilizzati | **ogni `export`**, anche mai importato |
| ESLint FE (`src/**`) | `tseslint.configs.recommended` (include `@typescript-eslint/no-unused-vars`, errore) senza pattern di esenzione | idem (variabili e import) | idem |
| ESLint BE/shared/scripts/test | `@typescript-eslint/no-unused-vars` con `argsIgnorePattern`/`varsIgnorePattern` `^_` (`eslint.config.js`, blocco finale) | idem, con l'esenzione dei nomi con `_` iniziale | idem |
| `npm run typecheck` | `tsc -b tsconfig.full.json` = app + node + **server** + **test** (`tsconfig.full.json`) | errori in tutti e quattro | — |
| `npm run build` | `tsc -b && vite build`; `tsconfig.json` rimanda **solo** ad app e node | errori del FE e di `vite` | **non controlla il server né i test** |

Conseguenze: (1) togliere una funzione esportata **non** produce alcun errore finché qualcuno non la importa; l'errore compare solo nei file che la importavano, **test compresi** (`tsconfig.test.json` include `src/**/*.test.tsx`, `server/**`, `test/**`): per questo ogni rimozione di codice con un test va dichiarata (decisione C1); (2) dopo aver tolto una funzione, i suoi helper non esportati diventano «locali inutilizzati» e `tsc` li segnala: il ciclo «togli → `npm run typecheck` → togli quanto segnalato» converge da solo; (3) `npm run build` da solo **non basta** per il server: servono sempre `typecheck` **e** `build`.

### 3.2 Procedura per trovare il codice orfano (script di sola lettura, da rifare a ogni giro)

Perché serve: sezione 3.1. Dove lanciarla: dalla radice del worktree, `node -e`, senza scrivere file. Stessa procedura per i tre tipi di «orfano»: esportazione senza uso, file senza importatori, funzione del client senza uso.

**Script 1 — esportazioni senza alcun uso fuori dal proprio file** (la versione che ho usato; limiti qui sotto):

```js
// node -e '...' dalla radice. Legge server/ shared/ src/ scripts/ test/ vite/ e le due config in radice.
const fs=require("fs"),path=require("path");
function walk(d,o=[]){for(const e of fs.readdirSync(d,{withFileTypes:true})){if(["node_modules","dist","data","coverage",".git"].includes(e.name))continue;const p=path.join(d,e.name);if(e.isDirectory())walk(p,o);else if(/\.(ts|tsx)$/.test(e.name)&&!/\.d\.ts$/.test(e.name))o.push(p.split(path.sep).join("/"));}return o;}
const files=[...walk("server"),...walk("shared"),...walk("src"),...walk("scripts"),...walk("test"),...walk("vite"),"vite.config.ts","vitest.config.ts"];
const isTest=f=>/\.test\.tsx?$/.test(f)||f.startsWith("test/");
// commenti tolti PRIMA di contare (altrimenti un commento che cita il nome lo fa sembrare vivo): prima i commenti di riga, poi i blocchi che iniziano a inizio riga
const strip=s=>s.replace(/^[ \t]*\/\/.*$/gm,"").replace(/(\s)\/\/ .*$/gm,"$1").replace(/(^|\n)[ \t]*\/\*[\s\S]*?\*\//g,"$1").replace(/^[ \t]*\*.*$/gm,"");
const raw={},txt={};for(const f of files){raw[f]=fs.readFileSync(f,"utf8");txt[f]=strip(raw[f]);}
const re=/^export\s+(?:async\s+)?(?:function\*?|const|let|class|type|interface|enum|abstract class)\s+([A-Za-z0-9_$]+)/gm;
const defs=[];for(const f of files){if(isTest(f))continue;let m;while((m=re.exec(raw[f])))defs.push([m[1],f]);}
for(const [n,f] of defs){
  const w=new RegExp("(?<![A-Za-z0-9_$])"+n.split("$").join("[$]")+"(?![A-Za-z0-9_$])","g");
  let altri=0,test=0,stesso=0;
  for(const g of files){const c=(txt[g].match(w)||[]).length;if(!c)continue;if(g===f){stesso=c-1;continue;}if(isTest(g))test+=c;else altri+=c;}
  if(altri===0&&!/\/(migrations|migrazioniUtente)\//.test(f))console.log(f+" :: "+n+" | proprio file "+stesso+" | test "+test);
}
```

Esito del 24/10: 3743 esportazioni, 473 senza uso in altri file non-test (con i commenti contati), **dopo aver tolto i commenti: 42 senza alcun uso, 13 usate solo dai test, 342 usate solo nel proprio file** (migrazioni escluse). Le 342 sono `export` superflui (tipi e componenti di appoggio): **non sono codice morto** e non si toccano (decisione C4).
**Limiti dichiarati** (importanti): (a) un'omonimia nasconde un orfano (`impostaLettura` esiste sia nel client FE sia nel servizio BE: per questo ho fatto un secondo passaggio **solo su `src/`** per le funzioni del client, §3.3.D); (b) i nomi usati con `import * as` o composti a runtime non si vedono come usati: ogni «morto» va riaperto a mano (`grep -w`) prima di toglierlo; (c) il commento tolto può eliminare per errore del codice (i miei filtri sono prudenti, ma una stringa con `//` o `/*` dentro può confonderli); (d) una funzione usata solo da un'altra funzione morta compare solo al giro successivo; (e) `ricaricaPacchetto` (`pacchetto/pacchettoGioco.ts:194`) **non** compare né fra i morti né fra i soli-test perché il suo stesso file ne cita il nome in un messaggio d'errore (`:146`): è comunque usata solo dai test (30 riferimenti, nessuno di produzione; verificato con `grep`): vedi decisione C2.

**Script 2 — file senza importatori non-test**: stesso elenco `files`; per ogni file non-test cercare, nel testo degli altri file, il nome-base fra apici o dopo `/` (`/["'/]nome(\.js|\.ts|\.tsx)?["']/`); i file senza risultato sono orfani (esclusi `src/main.tsx`, `server/index.ts`, `scripts/*`). Gli `import('./pages/X')` del router passano, perché contengono il nome fra apici.

**Script 3 — client FE senza uso**: le funzioni esportate da `src/services/api/*.ts` (esclusi `index.ts`) contate **solo dentro `src/`**.

**Passo di conferma obbligatorio per ogni voce**: `grep -rnw <nome> src server shared scripts test` a mano e lettura del punto d'uso; vale anche per le tre grandi famiglie «tieni comunque» del §3.3.F.

### 3.3 Elenco aggiornato del codice morto (24/10) con prove

**A. Servizi e funzioni senza alcun uso (provate: una sola occorrenza in tutto il repository, la definizione)**. Proprietario dell'attesa: se la funzione appartiene a un lotto in corso (L8, L9, L10) **non toccarla ora**: potrebbe essere cablata a breve; B19 la rivaluta a lotto consegnato.

| File:riga | Funzione | Nota | Si toglie quando |
|---|---|---|---|
| `server/services/catalogoOggettiProposte.ts:83` | `elencaProposteOggetti` | I pannelli di approvazione degli abbinamenti sono usciti (BON-07/BON-11); nessuna rotta la chiama | subito dopo B7 |
| `server/services/catalogoOggettiProposte.ts:246` | `confermaPropostaOggetto` | idem | idem |
| `server/services/disponibilitaConfidentiService.ts:199` | `bonificaInformazioniMakoto` | La migrazione 131 usa la copia `informazioniMakoto131.ts:126`; questa è un residuo (decisione del 23/10: «congela 130, 131, 135») | dopo il congelamento |
| `server/services/listiniCondivisi.ts:48` | `acquistiCondivisi` | senza uso | subito |
| `server/services/luoghiService.ts:141` | `presenzaDelNegozio` | senza uso | subito |
| `server/services/mappe/presenzaEntita.ts:55` | `finestraDaDate` | senza uso | con `applicaPresenzaAiLuoghi` (B12) |
| `server/services/mappe/voceDelPin.ts:76` | `uidFattiPerVoci` | senza uso | subito |
| `server/services/negoziazioneService.ts:31` | `invalidaNegoziazione` | file nuovo di L8 (negoziazione Royal), non ancora cablato | **solo dopo L8** |
| `server/services/personeDelGruppo.ts:23` | `eDelGruppo` | L8 B2 | solo dopo L8 |
| `server/services/pescaLetture.ts:102` | `firmaTurnoPesca` | L6/A10 | solo dopo chiusura A10 |
| `server/services/pescaService.ts:247` | `registraSessionePesca` | L6/A10 | idem |
| `server/schemas/acquisti.ts:10-11` | `paramsAcquistoPartita`, `paramsProvenienzaAcquisto` | L10 in corso | solo dopo L10 |

**B. Funzioni usate solo da test** (compilano; la rimozione rompe la compilazione del test: **decisione C1**):

| File:riga | Funzione | Test che la usano | Nota |
|---|---|---|---|
| `server/services/mappe/sincronizzaMappe.ts:227` | `collegaPalazziAiLuoghi` | `finestreDungeon.test.ts:36,105` (la usa come preparazione: «stub che restituisce 0») | B9 elimina `sincronizzaMappe.ts` (dopo il congelamento di 027) |
| `server/services/mappe/presenzaEntita.ts:87` | `applicaPresenzaAiLuoghi` | `visibilitaCondizionale.test.ts:19,33,216` (il test **è** su questa funzione, 281 righe) | con B12 (legge `luogo.quando`, `giorni_json`, `negozio.orari_json`) |
| `src/utils/pezziMappa.ts:104` | `zoneDeiPezzi` | `pezziMappa.test.ts:7,77` | modifica di compilazione: sostituire la chiamata con l'espressione |
| `server/services/pacchettoGiocoService.ts:388` | `importaPacchetto` | `pacchettoGiocoService.test.ts` (7 punti), `verifica-servizi.test.ts:22,60` | è la «fotografia sincrona» che i test usano per il lucchetto; la strada vera è `importaPacchettoDaDeposito`: decisione C2 |
| `server/services/impostazioniService.ts:398` | `ripristinaIstanza` | `impostazioniService.test.ts`, `verifica-servizi.test.ts` (≈ 11 punti) | idem |
| `server/services/mappe/areeService.ts:392` | `assegnaAreePalazzi` | 2 test | verificare con B9 |
| `server/services/palazziService.ts:212` | `palazziCompletati` | 13 riferimenti di test | verificare: **non** toccare senza decisione (molti test) |
| `shared/completamentoGuida.ts:52` | `percentualeOggetti` | 7 riferimenti di test | idem |
| `src/components/partita/CorreggiRequisito.tsx:32` | `CorreggiRequisito` (file intero, 76 righe) | `CorreggiRequisito.test.tsx` | componente orfano (R11-03/2) |
| `src/pages/RimossiPage.tsx:11` | `RimossiPage` (file intero, 21 righe) | `RimossiPage.test.tsx` | idem; il vecchio indirizzo reindirizza (`router.tsx`) |
| `src/services/api/catalogo.ts:23`, `compendio.ts:63`, `impostazioni.ts:85` | `getTuttiGliOggetti`, `getOggetti`, `getCestino` | 1, 6, 8 riferimenti | client superati dal catalogo unico e dal cestino unificato |

**C. File interi senza importatori non-test** (Script 2): `src/components/mappe/aperturaTokyo.ts` (33 righe, **nessun importatore, nemmeno test**: `dentroFinestra` `:17`, `quartiereAperto` `:30`), `src/utils/lotti.ts` (11 righe, solo test), `src/pages/RimossiPage.tsx`, `src/components/partita/CorreggiRequisito.tsx`. `aperturaTokyo.ts` si può togliere **senza** toccare test; gli altri tre seguono la decisione C1. In arrivo con B5/B6: `PannelloLuogo`, `GriglieDelLuogo`, `Griglia`, `LuogoSenzaPlanimetria` (restano ai soli Memento finché B6 non è fatto; `B5-albero.md:273`).

**D. Client FE esportati e mai usati in `src/`** (Script 3, 23 risultati; per il confronto con le omonimie del server): `mappe.ts` `impostaAreeMappa`, `aggiornaPresentazioneMappa`, `impostaStanzaMappa`, `riordinaMappe` (**tutti e quattro legati a fonti che B9 toglie**: presentazione e legami), `aggiornaPezzoMappa` (rotta orfana di B7; 3 test); `partite.ts:104` `impostaLettura` (nessun uso, nessun test: **di B7**, passo 4); `acquisti.ts` (`registraAcquisto`, `annullaProvenienzaAcquisto`, `rimuoviPresenzaStoricaAcquisto` `:27`, `decidiProposte`), `effettiVoce.ts` (`getEffettiVoce` `:5`, `salvaEffettiVoce`, `decidiEffettoVoce` `:10`; e `decidiEffettoVoceConRegistro` in `src/services/gestiPartita.ts:372`, senza uso), `pesca.ts` (`leggiSessionePesca` `:44`, `leggiFattiPesca`, `leggiRegolaPesca`): **L10/L6 in corso, non toccare ora**; `impostazioni.ts` `ripristinaDalCestino`, `eliminaDalCestino`, `svuotaCestino` (solo test).

**E. DTO, costanti e utility orfani**

- `shared/types.ts:31` `HealthDto`, `:2365` `InfiltrazioneDto`: senza alcun uso.
- `shared/pesca.ts:39-47` cinque interfacce `Richiesta…Pesca` senza uso (L6/A10: dopo la chiusura di A10).
- `shared/acquisti.ts:8` `PUNTI_BASE_AOJIRU`, `shared/catalogo.ts:87` `nomiCatalogo` e `:93` `categoriaOggettoDaArticolo`, `shared/elementi.ts:41,61,105` (`SIGLA_ELEMENTO`, `NOME_TIPO_SKILL`, `ESITI_NEGOZIAZIONE`: vocabolario di L8 non ancora usato: **solo dopo L8**), `shared/immagini.ts:20` `AmbitoPredefinito`, `shared/statiPartita.ts:119` `STATO_DEL_TIPO`.
- `src/utils/gruppiPlanimetrie.ts:49,95,100,109` `raggruppaPlanimetrie`, `chiaviInOrdine`, `spostaGruppo`, `spostaVersioneA` (la sola funzione viva del file è `nomeSenzaPalazzo`, importata da `AtterraggioTokyo.tsx`, `GuidaDellArea.tsx`, `GuidaNelVisore.tsx` e `DungeonDettaglioPage.tsx`): leggono `gruppoImmagini` e quindi **seguono B9**.
- Campi DTO che portavano le fonti tolte: li rimuovono B8 (`LuogoDto.marcatore` `shared/types.ts:~1747,2175`, `PuntoDto.marcatore`) e B9 (`MappaRiassuntoDto.entita`, `gruppoImmagini`); `ConteggiAlberoDto` e `getConteggiAlbero` con `GET /api/mappe/albero/conteggi` (decisione D9 di B5: «si tiene, si toglie in B19»: `B5-albero.md:365`). **Controllo di B19**: dopo B8/B9 `grep -rn "marcatore\b\|gruppoImmagini\|\.entita\b" shared src server` non deve più mostrare questi campi.

**F. NON toglierli (provati vivi o con decisione)**: `eTipoLuogo` (`FinestraLuogoDaPin.tsx:4,204,227`), `riallineaSpilliLuoghi` (`sincronizzaMappe.ts:53`, chiamata da `regoleAllAvvio`, `pacchetto/pacchettoGioco.ts:28,53`: va **estratta** prima di eliminare `sincronizzaMappe.ts`, scheda B9), `traduciNomiSpilli` e `collegaLuoghiAllePlanimetrie` (migrazioni 053/054 importate da `pacchettoGioco.ts:26-27`; la seconda esce da `regoleAllAvvio` con B9), `impostaLettura` del **servizio** (`attivitaService.ts:408`, usata da `routes/partite.ts:235` e `effettiAzioneService.ts:20,106`), `bossFinali` (`palazziService.ts:65`, usata per i Memento a `:167`: decisione sui boss di B13), `FONTI_TOLTE`/`tabellaTolta`/`colonnaTolta` (usate da cestino e pacchetto) e **tutte le etichette delle tabelle tolte in `cestinoService.ETICHETTE`** (la scheda B10 dice esplicitamente «B19 non deve ripulirle», `B1-B2-B7-B10.md:422`), `ricaricaPacchetto` finché C2 non è deciso.

### 3.4 Rami di compatibilità (`sqlite_master`, `pragma_table_info`, `PRAGMA table_info`, `tabellaGioco()`, `conLegami()`, `haTabella()`)

**Perché esistono**: quando i lotti hanno aggiunto tabelle e colonne, i servizi hanno protetto la lettura con «se la struttura c'è» (basi vecchie, pacchetti, ordine di registrazione delle migrazioni: l'ARCHITETTURA parla ancora di «guardia pre-M7»). Oggi `runMigrations` gira prima di qualsiasi servizio (`server/index.ts`: `runMigrations(initDb())` prima di `regoleAllAvvio`), e `test/dbDiProva.ts` apre `initDb(':memory:')` e carica il pacchetto: **a runtime e nella maggior parte dei test lo schema è sempre l'ultimo**. Una guardia su una struttura creata da una migrazione registrata non scatta mai.

**Misura del 24/10** (script: stessi `files` dello Script 1 limitati a `server/` e `shared/` senza `migrations/`, `migrazioniUtente/` e test; conteggio delle occorrenze dei sei modelli): **170 occorrenze in 54 file**. Per i soli `sqlite_master` con nome di tabella scritto per esteso e `pragma_table_info('…')` ho verificato che **tutti i 18 obiettivi nominati esistono già nello schema 146** (`guida_mappa`, `mappa_entita`, `mappa_percorso`, `mappa_presentazione`, `quartiere_ingresso`, `spillo_destinazione` e le tabelle di `col:*`): nessuna guardia protegge una struttura più recente della copia. Gli altri casi usano un aiutante generico (`tabellaGioco(nome)`, `esiste(db, tabella)`, `haTabella(db, schema, nome)`) e vanno letti uno a uno.

**Classificazione preliminare per file** (da nome e da lettura a campione delle righe: la procedura sotto la conferma file per file; i file che non ho letto sono «V»):

| Classe | File (occorrenze) | Che cosa fare |
|---|---|---|
| **K — tieni** (servono all'import, al backup, al cestino, all'archivio, alle migrazioni o alla conversione di un file in ingresso) | `services/pacchetto/pacchettoGioco.ts` (8), `pacchettoGiocoService.ts` (3), `cestinoService.ts` (4), `mappe/registroCestinoPin.ts` (3), `db/colonne.ts` (6: aiutanti delle migrazioni), `db/acquistiLegacy.ts` (7: verifica del registro storico), `condizioni/contestoConversione.ts` (9) e `condizioni/importazione.ts` (2: conversione dei DB importati), `tanakaStatoListino.ts` (6: legge anche il file **in ingresso**, `${schema}.sqlite_master`), `impostazioniService.ts` (1) | Non toccare; B10 ne dipende |
| **L — cadono con un drop di L11** | `mappe/mappeService.ts` (25: `mappa_entita` `:645,730,1105,1832,2178`, `mappa_presentazione` `:125,785,848,880,2181`, `conLegami` ×7), `dungeonService.ts` (11: `pianta_area` `:748`, `tabellaGioco` `:773`), `mappe/sincronizzaMappe.ts` (5, il file va via con B9), `mappe/organizzazioneMappe.ts` (1, idem), `mappe/presenzaEntita.ts` (3, B12), `mappe/fotografiaLuogoDaPin.ts` (3) e `precondizioneRaccordoPin.ts` (1) per `entita_*`/`mappa_entita` | Li toglie il blocco che droppa (B8/B9/B12/B15), nel **porting** dei lettori; B19 verifica con lo Script 4 che non ne restino |
| **D — guardia su struttura sempre presente** (la migrazione che la crea è registrata) | `mappe/legamiInfiltrazioni.ts` (9: `conLegami()` definita a `:21` su `infiltrazione_area`, creata dalla 110), `mappe/areeService.ts` (4), `giornataService.ts` (3), `apertureDedaliService.ts` (1) (tutti `conLegami()`); `mappe/statiGuida.ts` (5: `spillo_voce` `:98`, `divergenza_partita` `:178`, `spillo_partita_infiltrazione` `:184`), `palazziService.ts` (4: `spillo_destinazione` `:244`), `mappe/percorsiMappe.ts` (4: `mappa_percorso` `:41,62`, colonna `percorso_fisso` `:63`), `luoghiService.ts` (3: colonne `eccezione_orari_json` `:102`, `area_chiave` `:233,247`), `atterraggioPalazziService.ts` (2), `mappe/planimetriaDellaVoce.ts` (2), `mappe/voceDelPin.ts` (2), `regaliPartita.ts` (2), `vincoliAttivitaConfidente.ts` (2), `allocazioniTurniPesca.ts` (2), `fotografieIngressoMementoService.ts` (2), `mappe/precondizioneRimozionePin.ts` (2) | **Lavoro di B19**: sostituire la guardia con la sua condizione sempre vera, togliere il ramo «senza» e, se la funzione-guardia resta senza chiamanti, la funzione (`conLegami` per prima: 24 chiamate in 6 file) |
| **V — da leggere** | `negoziazioneService.ts` (3), `regaloAzioneService.ts` (1), `semaforiService.ts`, `requisitiConfidentiService.ts`, `noteStoricheService.ts`, `trasformazioniOggetti.ts`, `catalogoOggettiLetture.ts`, `listiniCondivisi.ts`, `datiGuida.ts`, `ombreService.ts`, `attivitaService.ts`, `catturePersona.ts`, `censimentoLuoghiCondizioniService.ts`, `miniatureService.ts`, `vincoliAttivitaPesca.ts`, `mappe/*` residui (1 ciascuno) | Si leggono a B19; **file di L8–L10 non si toccano prima della loro consegna** |

**Quando si tolgono** (ordine): le guardie L con i blocchi che le droppano; le guardie D **dopo** B9/B12/B15 (stessi file, conflitto alto: serializzare) e a lotti L8–L10 consegnati; le K mai (tranne verifica a mano di `impostazioniService.ts` e dei file V).

**Procedura per ogni guardia D** (senza test): (1) leggere la riga e dire quale tabella o colonna protegge; (2) trovare la migrazione che la crea (`grep -rln "<nome>" server/db/migrations server/db/migrazioniUtente`) e controllare che sia registrata (`server/db/migrations/index.ts`, `migrazioniUtente/index.ts`): se sì, la guardia è sempre vera a runtime; (3) controllare che **nessun test** costruisca una base a schema parziale e chiami quel servizio (`grep -ln "new Database(" server src shared test` limitato ai `*.test.ts`: oggi `053`, `054`, `067` fra le migrazioni, `datiGuida.test.ts`, `caratteriVoce.test.ts`; verificare che nessuno chiami i servizi in esame): se lo fa, quel test si adegua **solo per compilare** o la guardia resta (decisione C3); (4) togliere guardia e ramo; (5) `npm run typecheck` (compila i test) e `npm run lint`.

**Script 4 (verifica finale, sola lettura)**: ripetere la misura e confrontarla con la classificazione: il totale deve scendere da 170 al solo gruppo K più i V motivati; per ogni occorrenza rimasta fuori da K deve esistere una riga nell'elenco di B19 con il motivo.

### 3.5 Passi, verifica senza test, rischi

**Ordine dei passi di B19** (dopo B7, B8, B9, B12, B13, B15, B5/B6 e L8–L10 consegnati; lo dice anche la preparazione, §5):

1. Rifare gli Script 1–3 e riaprire a mano ogni voce (`grep -rnw`). Annotare l'elenco finale in un file di lavoro (non nel repository) e nel resoconto.
2. Togliere nell'ordine: client FE e utility senza uso; DTO e costanti; servizi e funzioni del §3.3.A–B (con le modifiche ai test della decisione C1); file interi del §3.3.C.
3. Ad ogni gruppo: `npm run typecheck` e correggere solo quanto segnala (import e locali ora inutilizzati); `npm run lint`.
4. Rami di compatibilità: classe D, con la procedura del §3.4.
5. Togliere `GET /api/mappe/albero/conteggi`, `ConteggiAlberoDto`, `getConteggiAlbero` (D9 di B5) **con la descrizione OpenAPI** (`openapi.test.ts:36` vuole 1:1).
6. `npm run build`; riesecuzione degli Script 1–3 e 4: nessuna voce nuova.

**Verifica senza test**: `npm run typecheck`, `npm run lint`, `npm run build`, Script 1–4 con i numeri prima/dopo nel resoconto, `git diff --stat` (solo cancellazioni e adeguamenti di compilazione dei test), controllo che nessun file `*.test.*` sia stato **eliminato** (regola dell'utente: i test non si cancellano; con C1 si dichiarano superati con `describe.skip` e motivo).

**Rischi**: (1) **conflitto di file** con B5/B6/B8/B9 sugli stessi servizi (`mappeService.ts`, `dungeonService.ts`, `MappaPage.tsx`): B19 parte solo dopo la loro consegna; (2) **toglie codice che L8–L10 stanno per cablare** (§3.3.A, righe di L8/L10/pesca): rinviate; (3) **test che diventano rossi a runtime** pur compilando (la regola «solo per compilare» li lascia): vanno elencati nel resoconto per l'utente; (4) **omonimie** e `import * as` (limiti dello script): ogni voce si riconferma a mano; (5) togliere una guardia D che un test parziale usava: C3; (6) **SQL dinamico** (`${schema}.sqlite_master`, `tabella(nome)`) non visto dagli script.

## 4. B20 — Documenti (R11-18/1, 19/1, 19/2, 20/1, 20/2)

Principio (memoria «Documentazione non blocca»): i documenti si allineano al codice **in parallelo** e si chiudono per ultimi con una passata sul codice finale. B20 non cambia codice tranne le descrizioni OpenAPI.

### 4.1 `docs/ARCHITETTURA.md` — R11-18/1

**Procedura di confronto con il codice (da rifare a documento scritto)**:

1. **Simboli ritirati**: per ogni termine del §4.1.A, `grep -n` nel documento: deve restare solo dentro una tabella «strutture tolte e dove vive ora il dato» (con riferimento alla migrazione) o nella storia dichiarata, mai come descrizione dello stato corrente.
2. **Percorsi citati**: estrarre ogni percorso fra apici (`server/…`, `shared/…`, `src/…`, `scripts/…`, `docs/…`, `pacchetto/…`) e controllare che esista. Misura del 24/10: **147 percorsi citati, 8 inesistenti**: `shared/PulsanteVisivo.tsx`, `shared/IconaAzione.tsx`, `shared/Selettore.tsx` (abbreviazioni di `src/components/shared/…`), `src/utils/oggetti.ts`, `src/components/guida/PlanimetriePalazzo.tsx`, `src/components/condizioni/SelettoreRicerca.tsx`, `server/services/correzioniGuidaService.ts`, `src/components/guida/SceltaAreePlanimetria.tsx`.
3. **Identificatori**: estrarre i nomi `…Service`, funzioni e tabelle fra apici e controllare che compaiano nel codice o nello schema (`sqlite_master` della copia migrata).
4. **Numeri**: ultima migrazione di gioco (oggi **172**; utente **040**) da `ls server/db/migrations server/db/migrazioniUtente`; numero di tabelle da `sqlite_master`; numero di rotte da §4.5.
5. **Rinvii**: ogni «vedi sezione X» punta a una sezione che esiste.

**§4.1.A Termini da cercare (superati)**: `mappa_entita`, `entita_tipo`, `entita_chiave`, `marcatore_mappa`, `marcatore_luogo`, `pianta_area`, `pianta_quartiere`, `gruppo_immagini`, `guida_mappa`, `sincronizzaMappe`, `riconciliaAreeGuida`, `giorno_percorso`, `giorno_calendario`, `evento_calendario` (resta, ma col modello nuovo), `lettura_partita`, `requisito_partita`, `bossFinali`, `mappe-assenti`, `finestre-dungeon`, `punto_partita.automatico`, `ricaricaPacchetto`, `importaPacchetto`, `caricaSeed`, `seed_meta`, `33 tabelle`, `099`/`018` come «ultima migrazione», `compendio/arcani`, `AlberoLuoghi`, `PannelloLuogo`.

**Sezioni superate (titolo, righe di oggi; il file si sposta: cercare per titolo)**:

| Righe | Sezione | Che cosa è superato |
|---|---|---|
| 1-29 | testa | Note datate 21–23/10 («NOTA rilasciata», «Stato corrente, audit del 21 ottobre», «locale, non rilasciata», «M7 inattiva», «ultimo typecheck documentato fallito»); l'avvertenza di 13-21 sulla storia |
| 60-122 | §3 Struttura del repository | migrazioni «001 … 099» e utente «001 … 018» (`:69-70`), `schemaUtente.ts` «33 tabelle» (`:68`), `services/pacchetto` con `ricaricaPacchetto (test)` (`:73`), elenco `shared/` e `src/` parziale (`:85-116`); mancano `services/ricerca`, `mappe/gerarchiaMappe.ts`, `condizioni/`, `fontiTolte.ts`, gli shared di L4–L10 |
| 144-170 | §5 Persistenza | «33 tabelle» (`:145`), `seed_meta` (`:150,152,158-159`), «oggi `main` è alla 099 e `utente` alla 018» (`:151`), `caricaSeed` (`:152,158`) |
| 205-283 | Fasi 6.1–10.2 (sezioni nate dal seed) | calendario `giorno_calendario`/`evento_calendario`/`settimana_guida` (`:218-222`), `marcatore_mappa` e piante (`:224-229`), `lettura_partita` (`:243-246`), `giorno_percorso` (`:253-257`), «Piante delle aree — superato» con `pianta_area` (`:266-273`), `pianta_quartiere` e `marcatore_luogo` (`:274-277`), `oggetti-guida` (`:282-283`) |
| 285-322 | §5 bis API | tabella storica degli endpoint (`:313-320`: `/arcani`, `/attiva`, `GET /:ambito/:chiave`): da togliere, resta il rinvio a `/api/docs` |
| 349-390 | §7 Frontend | `lettura_partita` (`:371`) e l'elenco di pagine/componenti di Fase 0–1 |
| 499-580 | Mappe a livelli, Visore, Editor, Integrazione (Fasi 13.1–13.4) | `entita_tipo`/`entita_chiave` (`:501`), `sincronizzaMappe`, `marcatore_*` (`:503-505,562,568,578`), `caricaSeed` |
| 597-690 | Semafori… e Alone dorato… (Fasi 12.3, 15) | `requisito_partita` (`:599,644`), `sincronizzaMappe`/`finestre-dungeon` (`:603-605,678`), `giorno_percorso`/`giorno_calendario` (`:649`), `lettura_partita` (`:682`) |
| 692-698 | Immagini nel database e pacchetto | `importaPacchetto`, `AlberoLuoghi` (`:697-698`) |
| 727-749 | Catalogo personale…, Percorsi delle mappe (038), Ingresso dei quartieri (039), «Atlante unico — integrazione in corso (2026-09-06)» | **da leggere**: titolo «in corso» di sei settimane fa |
| 800-998 | Scheda del Palazzo, Richieste, domande e cruciverba | `giorno_percorso` (`:981`), «099» (`:869,911,917`) |
| 1100-1243 | Più aree per planimetria; Colonna del Palazzo | `mappa_entita`/`entita_*` (`:1102-1103`), `riconciliaAreeGuida` (`:1130`), `marcatore_mappa`/`pianta_area`/`guida_mappa`/`mappe-assenti` (`:1148-1151`), `gruppo_immagini` (`:1170`), `bossFinali` (`:1186`), `automatico` (`:1198-1200`), `finestre-dungeon` (`:1217`) |
| 1244-1401 | Effetti delle azioni; La giornata è canone | `lettura_partita`, `ricaricaPacchetto` (`:1274,1280`), `giorno_percorso` (`:1365`) |
| 1402-1595 | Regole trasversali; Strutture comuni; Pezzi; Cestino | `ricaricaPacchetto` (`:1410,1558`), `mappe/albero` (`:1474`), `seed_meta` (`:1484`), `schemaUtente` (`:1377,1571`) |
| 1615-1716 | Razionalizzazione L0–L3 | `ricaricaPacchetto` (`:1653`), «le fonti vecchie del legame … non le legge più nessuna vista» (`:1694`: superato da B9, che le elimina), albero e conteggi (`:1701`) |
| 1718-1748 | «L7 in lavorazione locale» | bozze del 21/10 (migrazioni «non registrate», «M7 inattiva», «router non montato») mentre la 121 è registrata: **da riscrivere** come «Catalogo degli oggetti (L7)» a stato reale |
| (mancano) | — | **nessuna sezione per L4, L5, L6, L8, L9, L10, L11** |

**Modello finale da descrivere** (struttura proposta, per dominio; ogni voce con i file reali, verificati con `ls`):

1. **Vista d'insieme e stack** (invariati, con la nota che i dati di gioco vivono in `gioco.db` dell'istanza e che «Importa» **sostituisce** il file dopo anteprima e conferma, senza unione; correzioni nel DB e nei backup).
2. **Persistenza**: due file e una connessione; due sequenze di migrazioni (gioco fino alla 172+, utente fino alla 040+; contare a fine lotto); `fontiTolte.ts` (registro delle strutture eliminate: cestino, import, riepilogo degli scarti); backup di avvio (7), copia di sicurezza prima dell'import (3), cestino; registro del cestino e dei pin; `cacheDiGioco`.
3. **Il mondo e la sua gerarchia**: Città › Quartiere › Area › Planimetrie; Città › Palazzo › Area › Planimetrie con le Infiltrazioni (`infiltrazione_area`, `legamiInfiltrazioni.ts`); Memento › Dedalo › Area (`area_dedalo`, senza planimetrie); «casa» di ogni nodo (`mappe/casaMappa.ts`), `GET /api/mappe/gerarchia` (`mappe/gerarchiaMappe.ts`), pagina «Luoghi della guida» (se approvato il nome).
4. **Risolutore d'immagine** (L1): `mappe/immagineMappa.ts`, `shared/immaginiMappa.ts`, miniature (`miniatureService.ts`, `shared/miniature.ts`), illustrazioni dei posti.
5. **Vocabolario unico delle condizioni** (L6): `shared/condizioniSpillo.ts` (31 tipi), `services/condizioni/` (`valutatore.ts`, `condizioneEffettiva.ts`, `nomiCondizioni.ts`, `finestrePalazzi.ts`, `importazione.ts`), `GET /api/condizioni/*`.
6. **Catalogo e luoghi** (L5–L7): luoghi, negozi, orari, presenza; catalogo degli oggetti (`catalogoOggetti*.ts`), listini condivisi, registro Tanaka (`tanakaStatoListino.ts`, `shared/tanakaDecisione.ts`), note storiche; pesca (L6/A10: `pescaService.ts`, `regolePescaService.ts`, `profiliPescaService.ts`).
7. **Persona, Ombre, negoziazione** (L8): `ombreService.ts`, `personeDelGruppo.ts`, `negoziazioneService.ts`, `shared/ombre.ts`, `shared/negoziazione.ts`, `shared/elementi.ts` (vocabolario).
8. **Calendario e Confidenti** (L9): un solo giorno (`giorniService.ts`, `giornoPartitaService.ts`, `shared/giorno.ts`, `shared/date.ts`), eventi collegati per chiave alle voci (`evento_calendario`, `evento_calendario_voce`: decisione del 24/10), disponibilità strutturata dei Confidenti, piazzamento agli esami (`piazzamentoEsamiService.ts`).
9. **Il Diario come motore** (L10): `motoreDiario.ts`, `propostePartitaService.ts`, `effettiAzioneService.ts`, `shared/effettiVoce.ts`, `fortunaService.ts`, `acquistiService.ts`, provenienze.
10. **Correzioni e ripristino** (B11): `ripristinoService.ts`, `correzione_dati_guida`, `/api/correzioni` (dopo la consegna).
11. **Ricerca globale** (B3/B4): `services/ricerca/*`, `shared/ricerca.ts`, `RicercaGlobale` (dopo la consegna).
12. **Pacchetto, import ed export**: `pacchettoGiocoService.ts` (anteprima, scarti, importazione), `impostazioniService.ts` (backup, copia di sicurezza), cartella d'appoggio, `lucchettoIstanza.ts`.
13. **Indirizzi vecchi e redirect** (§4.6) e **API documentata** (`/api/docs`, `/api/openapi.json`; `openapi.test.ts` come guardia; script del §4.5).
14. **Strutture tolte e dove vive ora il dato** (tabella: struttura, migrazione, sostituita da; è la stessa fonte di `FONTI_TOLTE`).
15. **Frontend**: layout adattivo, componenti condivisi, router (con i `loader` di precarico di B2), stato.

**Sezioni storiche (decisione C6)**: raccomando di **non** tenere la storia per fase dentro ARCHITETTURA (`R11-18` dice «senza parti superate»): ogni sezione superata si riscrive nel modello sopra o si toglie; la storia sta in git e in `DECISIONI.md`/`ROADMAP.md`. Alternativa: spostare le sezioni nate dal seed in un file `docs/archivio/ARCHITETTURA-storica.md` con avviso in testa.

**Verifica senza test**: i cinque controlli della procedura (simboli, percorsi, identificatori, numeri, rinvii) con l'esito nel resoconto; lettura del documento da un agente distinto contro il codice.

### 4.2 `docs/ROADMAP.md` — R11-19/1

La tabella «Lotto | Contenuto | Stato» sta nella sezione «Razionalizzazione (dal 20 ottobre 2026)» (intestazione a `:1304`, tabella fino alla fine del file). Stati **reali** proposti (da riverificare con il comando sotto il giorno della scrittura; fonti: `stato.json` → `lotti` e `pianoAtomico.voci`, `git log`):

| Lotto | Stato reale da scrivere | Prova |
|---|---|---|
| P, L0, L1 | fatto, consegnato (L0 approvato al 2° giro; L1 approvato al 5° giro, pubblicato) | `stato.json` `lotti` L0/L1: tutte le fasi `fatta` |
| L2 | fatto, consegnato (approvato al giro 6, pubblicato e verificato su p5s) | `lotti` L2 |
| L3 | pubblicato, **consegna «difetti»**: restano il campo «Planimetria» e la guida nel visore | `lotti` L3 (`consegna: difetti`) |
| L4 | pubblicato; **prove utente aperte** (UX, no-reg, layout, validazione `da-fare`) | `lotti` L4 |
| L5 | pubblicato; bonifica: 201 voci, 151 `chiuso`, 50 `chiuso-codice`, 0 `da-fare`; fasi funzionali/UX/no-reg/layout `da-fare` e validazione/consegna `difetti` | `pianoAtomico` L5; `lotti` L5 |
| L6 | pubblicato; 31 voci (26 `chiuso-codice`, 5 `chiuso`); ricerca R6 ancora aperta | idem |
| L7 | pubblicato in parte; 202 voci (84 `chiuso`, 118 `chiuso-codice`); BE/FE `in-corso`; residui Tanaka (transazione, ricevuta, ripristino, import, consenso) | idem; `ROADMAP.md` riga L7 già aggiornata nel working tree |
| L8 | in corso: 1227 voci, 54 `chiuso-codice`, 1173 `da-fare`; commit `f75befcf`, `f2a38ee9` (Persona del gruppo e 27 forme), `7e57b989` (Ombra, migrazione 166), `172_negoziazione_royal` non committata | `pianoAtomico` L8; `git log` |
| L9 | in corso: 281 voci (173 `chiuso-codice`, 107 `da-fare`, 1 `in-verifica`); giorno unico (migrazione 168), collegamento eventi↔voci (164), 6 date corrette (165), editor del giorno | idem |
| L10 | in corso: 143 voci (35 `chiuso-codice`, 4 `chiuso`, 104 `da-fare`); nucleo I71 pubblicato; effetto «invito» (171) | idem |
| L11 | in corso: 82 voci (81 `da-fare` in `stato.json` ma **B10 e B2 già in codice** e B5 in parte: commit `7e863137`, `43d184f1`, `b86363bd`, `2d64f92e`, `a8344484`); collaudo riservato all'utente | `git log --grep L11` |

**Nota di coerenza**: `stato.json` non è allineato al codice (L11 «da-fare» per voci già in codice; L7 senza `da-fare` mentre note e ROADMAP elencano residui): B20 non lo corregge da solo, lo segnala (voce `da-riscontrare`) e la tabella usa **solo** stati che hanno un commit o una prova. Comando di conteggio (sola lettura): `node -e 'const s=require("./docs/coordinamento/stato.json");const c={};for(const x of s.pianoAtomico.voci){(c[x.lotto]=c[x.lotto]||{})[x.stato]=(c[x.lotto][x.stato]||0)+1};console.log(JSON.stringify(c))'`.

Altre righe di ROADMAP che citano strutture superate (`app.md` §2: `67-75, 83-86, 146, 153, 383-394, 573-579, 619-620, 709, 826-827`): sono **registro storico delle richieste**, non descrizione dello stato; R11-19/1 chiede solo la tabella dei lotti. Si lasciano, con la riga introduttiva che dice che le voci anteriori al 20/10 sono storia (da controllare se già c'è).

### 4.3 `docs/DECISIONI.md` — R11-19/2

**Struttura oggi**: tabella cronologica in testa (`:5-…`, righe 7-25 per 21–24/10), poi sezioni per data; la sezione `## 2026-10-20 — Razionalizzazione…` (`:2076`) contiene D1–D8 con la frase «Sono **scelte consigliate applicate, da confermare** (IA, su mandato U)» (`:2088`) e le sezioni di lotto L0–L4.

**Distinzione consigliate / confermate — stato di D1–D8 proposto** (il documento deve dire, per ognuna, una di tre cose: *confermata dall'utente (data e parole)*, *ancora consigliata, da confermare*, *superata da una scelta dell'utente*):

| D | Scelta applicata | Stato da scrivere | Prova |
|---|---|---|---|
| D1 ordine dei lotti L0 → L11 | consigliata | **ancora da confermare** (nessuna risposta dell'utente in `DECISIONI.md`) | — |
| D2 Covo = Area di Yongen-Jaya | consigliata | da confermare | L2 la applica (`DECISIONI.md:2177`: «Scelte consigliate applicate, da confermare: D2…») |
| D3 Iweleth solo dedalo | consigliata | da confermare (L8 e L11 B6 si basano su questa scelta: **rischio**) | `L8/preparazione`, `B5-albero.md` |
| D4 permanenti/rigenerabili | consigliata | da confermare | — |
| D5 negozio come sezione del luogo | consigliata | da confermare | L5 R5-10; `NegozioPage.tsx:62` la applica |
| D6 automatismi del diario («Applica») | consigliata | **superata**: il 23/10 l'utente ha scritto «Da Applicare non è mai stato autorizzato… da applicare deve sparire… Pulsante sulla voce» | riga `2026-10-23` della tabella in testa |
| D7 Persona del party collegate per chiave | consigliata | da confermare | — |
| D8 acquisti e yen | consigliata | **risolta dall'utente** in favore dell'alternativa «yen sempre a mano»: «Gli yen sono solo un promemoria, a mano» | stessa riga del 23/10 |

(Le formule «superata/risolta» sono la mia lettura delle due righe citate: **da confermare dal PM prima di scriverle**, decisione C7.)

**Voci mancanti per lotto (L5–L11)**: ogni sezione di lotto riporta (a) le scelte *confermate* con data e parole dell'utente, (b) le scelte *consigliate applicate, da confermare*, (c) i rinvii. Materiale da distribuire — le righe della tabella in testa (`DECISIONI.md:7-25`):

| Riga (data · tema) | Lotto | Chi |
|---|---|---|
| 24/10 provenienza degli eventi in Partita › Progressi (R10-22/3) | L10 | U |
| 24/10 punti dei Confidenti (bonus esami solo per i 7 documentati; ×1,2 dell'invito; moltiplicatori; troncamento) | L9/L10 | IA su dato Royal e regole dell'utente |
| 24/10 eventi del calendario restano eventi collegati; niente «Da rivedere»; «Importa» sostituisce senza unione | L9 e L11 | U |
| 23/10 bonifica consolida con migrazioni; escono i pannelli non autorizzati; «Da applicare» sparisce; yen a mano | trasversale L5–L10 (e D6/D8) | U |
| 23/10 la pagina Partita non cambia (eccezione «Regala») | L10 | U |
| 23/10 Fortuna come stato della partita | L10 | U (stato, interruttore) · IA da fonte Royal (durata) |
| 23/10 oggetti citati si aprono in un pannello sopra il diario (R10-27) | L10 | U |
| 23/10 pin 339 sul listino visibile; cambio giorno senza 400; congelare 130, 131, 135 | L5/L6 | U |
| 23/10 copia del foglio Royal della negoziazione nel repository (rischio licenza accettato) | L8 | U |
| 23/10 prevale sempre il dato Royal | trasversale | U |
| 21/10 equipaggiamento: nessun abbinamento fondato solo sul nome | L7 | U (delega) |
| 21/10 Asakusa: Ann rango 7 **oppure** Skytree | L6 | U |
| 21/10 «Importa» resta; guida del visore con tutte le infiltrazioni | L11 | U |
| 21/10 solo «Da posizionare» e «Schermate di riferimento» rimossi | L2/L3 | U |
| 21/10 verifica avversariale; commit alla fermata; 20/10 un solo commit di lotto, zero test | processo | U |

**Due decisioni del 24/10 non registrate** (richiamate dal PM): «modifiche ai test solo per farli compilare (senza eseguirli)» e «il numero di una nuova migrazione non si riserva». Non le trovo in `docs/DECISIONI.md`, in `STATO-ATTUALE.md`, nella memoria del progetto né in `CLAUDE.md` (`grep -i "per farli compilare|solo per compilare|non si riserva"`: 0 risultati). **B20 le aggiunge**, con attribuzione «U» solo se il PM conferma che sono parole dell'utente (decisione C7); altrimenti «IA, da confermare».

**Forma da scrivere**: tabella per lotto con colonne `Scelta | Stato (confermata il …, con parole · consigliata, da confermare · superata da …) | Dove si applica`. Le «Scelte del Project manager … (da confermare)» già presenti nelle sezioni L2 (`:2145`), L2 (`:2177`), L3 (`:2181`) si **riportano** nella stessa tabella con lo stato, senza cancellare la storia.

**Verifica**: ogni riga «confermata» ha una citazione dell'utente (data) leggibile nel registro; ogni riga «da confermare» elencata una volta sola nel riepilogo finale per il PM; nessuna decisione attribuita all'utente senza una sua frase (memoria «mai attribuire all'utente decisioni non sue»).

### 4.4 `docs/MAPPE.md` (R11-18, documento collegato)

`docs/MAPPE.md` (458 righe) è lo «studio tecnico della Fase 13» e descrive il modello vecchio: `mappa_entita`/`entita_*` (`:56-58`), `marcatore_mappa`/`marcatore_luogo` (`:34`), `pianta_area`/`pianta_quartiere` (`:32,105,258`), `sincronizzaMappe` (`:166,272,313`), `GET /api/mappe/albero` (`:172`). Modifica: banner in testa («studio storico della Fase 13: lo stato corrente è in ARCHITETTURA §Il mondo») e riscrittura dei soli §3 (modello dati) e §5 (API) sul modello finale; il resto resta storia. Decisione C8.

### 4.5 `server/openapi/*` — R11-20/1: come si garantisce «solo rotte esistenti»

**Garanzia per costruzione**: il documento non è scritto a mano: `elencaRotte(app)` (`server/openapi/rotte.ts:48-53`) legge le rotte montate (`ROUTER_DI_AREA`, `server/routes/index.ts`, 15 router) e `DESCRIZIONI` (`descrizioni/index.ts`) aggiunge sommario, descrizione e risposta. Una rotta tolta dal router **sparisce dal documento**; una **descrizione** senza rotta non viene mostrata ma resta nel registro: è ciò che `openapi.test.ts:36-41` vieta («ogni rotta montata ha la sua descrizione, e ogni descrizione una rotta»).

**Dato che il test non si esegue**: controllo statico equivalente (sola lettura), da lanciare a ogni giro e alla chiusura:

```js
// node -e, dalla radice: confronta le rotte dei router con le chiavi del registro delle descrizioni
const fs=require("fs");
const map={compendio:"/api/compendio",traduzioni:"/api/traduzioni",partite:"/api/partite",immagini:"/api/immagini",fusione:"/api/fusione",mappe:"/api/mappe",font:"/api/font",impostazioni:"/api/impostazioni",catalogo:"/api/catalogo",catalogoOggetti:"/api/catalogo-oggetti",condizioni:"/api/condizioni",aree:"/api/aree",luoghi:"/api/luoghi",regolePesca:"/api/pesca",pesca:"/api/partite/:id/pesca"}; // da tenere uguale a ROUTER_DI_AREA
const rotte=new Set();for(const [f,p] of Object.entries(map)){const t=fs.readFileSync("server/routes/"+f+".ts","utf8");const re=/router\.(get|post|put|patch|delete)\(\s*(?:'([^']*)'|"([^"]*)"|`([^`]*)`)/g;let m;while((m=re.exec(t))){const pa=m[2]??m[3]??m[4];rotte.add(m[1].toUpperCase()+" "+p+(pa==="/"?"":pa));}}
const desc=new Set();for(const f of fs.readdirSync("server/openapi/descrizioni")){if(f==="index.ts")continue;const t=fs.readFileSync("server/openapi/descrizioni/"+f,"utf8");const re=/^\s+'((?:GET|POST|PUT|PATCH|DELETE) \/[^']*)':/gm;let m;while((m=re.exec(t)))desc.add(m[1]);}
console.log("rotte",rotte.size,"descrizioni",desc.size);
console.log("senza descrizione:",[...rotte].filter(r=>!desc.has(r)));
console.log("descrizioni senza rotta:",[...desc].filter(d=>!rotte.has(d)));
```

**Esito del 24/10**: 306 rotte nei router, 293 descrizioni (le 4 rotte dell'app `GET /api/health`, `/config`, `/openapi.json`, `/docs` compaiono solo come descrizioni: sono montate da `bootstrap.ts`, non da un router: normale). **Descrizioni senza rotta: nessuna. Rotte senza descrizione: 17**: `GET /api/compendio/calendario/voci/:uid`; `GET /api/compendio/confidenti/:chiave/requisiti`, `PUT …/requisiti/:rango`, `POST …/requisiti/:rango/ripristina`; `GET/PUT /api/compendio/giorni/:data` e `POST …/ripristina` (commit `72faf179`); `PUT/DELETE /api/partite/:id/inviti/:confidente/:data`; `GET /api/partite/:id/esami/piazzamenti`, `PUT …/esami/:esame/piazzamento`; `PUT /api/catalogo-oggetti/note-storiche/:chiave` e `POST …/ripristina`; `GET /api/partite/:id/pesca`, `…/pesca/sessioni/:sessione`, `…/operazioni/:operazione`, `…/fatti`. Sono rotte di L7, L9, L10, L6 (pesca): **non sono di L11 ma B20/B21 non chiudono finché non hanno la descrizione** (la scrive la sessione che le ha create; `descrizioni/compendio.ts` e `routes/compendio.ts` sono già modificati nel working tree).

**Modifiche precise a `descrizioni/*` per L11** (in questo ordine, ciascuna insieme al blocco che cambia la rotta, perché `openapi.test.ts:36` vuole 1:1):

| File | Intervento | Blocco |
|---|---|---|
| `descrizioni/mappe.ts:68` (`GET /api/mappe/entita/:tipo/:chiave`), `:171` (`PUT /api/mappe/pezzi/:id`; la `DELETE` resta) | togliere le due chiavi | B7 |
| `descrizioni/compendio.ts:44` (`/arcani`) | togliere | B7 |
| `descrizioni/catalogo.ts:17` (`/oggetti-di/:categoria`) | togliere | B7 |
| `descrizioni/partite.ts:69` (`/attiva`), `:79` (`GET /:id`) | togliere | B7 |
| `descrizioni/immagini.ts:29` (`GET /:ambito/:chiave`) | togliere (restano `PUT`/`DELETE`/`/file`) | B7 |
| `descrizioni/mappe.ts:141` (`precondizione-raccordo`) | togliere **se** C5 la dichiara orfana | B7 |
| `descrizioni/mappe.ts` righe che parlano di «entità legata», `entita_*`, `mappa_entita` (`:36`, `:70`, `:94-100`; elenco di `app.md` §2: `27-33, 57-62, 148`) | riscrivere col vocabolario nuovo (Area, Planimetria, Infiltrazione; nessun «entità legata») | B9 |
| `descrizioni/mappe.ts` | aggiungere `GET /api/mappe/gerarchia` e testi di `/albero`, `/albero/conteggi` | B5 / B19 |
| `descrizioni/impostazioni.ts` (anteprima ≈ `:51`, importazione ≈ `:56-57`, ripristino del cestino ≈ `:89-93`) | `scarti`, `riepilogoSalvatoIn`, i due motivi nuovi | B10 (da verificare: la modifica del commit `7e863137` potrebbe averli già aggiunti) |
| nuovo `descrizioni/ricerca.ts`, `descrizioni/correzioni.ts` (+ voci in `AREE`) | nuove aree | B3, B11 |
| tutti i file | rileggere con `grep -n -i "seed\|marcator\|pianta_\|entita\|gruppoImmagini\|lettura_partita\|giorno_percorso"` i testi che nominano strutture tolte (oggi: `catalogo.ts:60,64,67` citano `seed_json`/«riga del seed», che **resta**: nessun intervento; `compendio.ts:386,531,537` parlano di «marcatore» dei punti: da rileggere con B8; `traduzioni.ts:27,29` citano il «pacchetto di gioco iniziale»: da rileggere con R11-17) | B20 |

**Vocabolario nuovo**: Area, Planimetria, Infiltrazione (Palazzi), Dedalo, «Luoghi della guida» (se approvato C: nome della pagina), nessun «Mappa»/«atlante» come nome di un posto.

**Verifica senza test**: script sopra con `senza descrizione` e `descrizioni senza rotta` **entrambi vuoti**; `npm run typecheck` (le descrizioni sono TypeScript tipizzato, `DescrizioniArea`); l'utente esegue `openapi.test.ts` (non lo faccio io).

### 4.6 Indirizzi vecchi e redirect — R11-20/2 e R11-22

Elenco, con destinazione e prova (righe lette il 24/10; documentazione d'origine fra parentesi):

| Indirizzo vecchio | Destinazione | Dove sta il redirect | Origine |
|---|---|---|---|
| `/` | `/home` | `src/router.tsx` (`index: true`, `<Navigate to="/home" replace />`) | — |
| `/guida/rimossi` | `/impostazioni#nascosti` | `src/router.tsx` (commento R10-23/4) | L10 |
| `/guida/mappe/tokyo` | `/guida/citta` | `src/pages/MappaPage.tsx:58-59` | L2 |
| `/guida/mappe/<chiave>` di quartieri, zone, versioni, Covo, Sottopasso | la **casa** (Quartiere o Area, con la versione e `?spillo`/`?contesto` conservati) | `MappaPage.tsx:60-61` (`RisolviMappa` + `casaConArrivo`), `RisolviMappa.tsx` | L2 R2-18 |
| `/guida/mappe/<palazzo | sua planimetria | alias>` | `/guida/dungeon/<k>/area/<slug>` (`?planimetria=` solo se non predefinita; la versione di un alias si conserva) | `RisolviMappa.tsx` (usa la `casa` del server; senza casa ripiega su `/guida/mappe/<palazzo>?area=<area>`) | L3 R3-15 |
| `/guida/mondo/quartiere/<q>` | `/guida/citta/<q>` | `src/pages/AccessoMondoPage.tsx:36` | L2 |
| `/guida/mondo/dungeon/<k>` | `/guida/dungeon/<k>?infiltrazione=in-corso` (i Memento senza parametro) | `AccessoMondoPage.tsx:39` | L3 |
| `/guida/mondo/<altro>/<chiave>` | la destinazione unica (`urlDestinazioneMondo`) oppure la pagina «Dove si trova» | `AccessoMondoPage.tsx:69` | L2 |
| `/guida/dungeon/<k>?area=<infiltrazione>` | stessa infiltrazione (con `?infiltrazione=` insieme, **vince** `infiltrazione`) | parametro accettato dalla scheda (`DungeonDettaglioPage`) | L3 R3-18 |
| `/guida/negozi/<chiave>` (negozio con sede) | `/guida/luogo/<quartiere>/<luogo>#negozio-<chiave>` | `src/pages/NegozioPage.tsx:62` (`n.sedeCasa`); i negozi **senza sede** restano su questa pagina | L5 R5-10 |
| `/guida/attivita?scheda=libri` e `?scheda=film` | `/guida/libri`, `/guida/film` | `src/pages/AttivitaPage.tsx:150-151` | L7 |
| `/guida/oggetti?scheda=<vecchia sezione>` | il gruppo corrispondente del catalogo | `src/pages/OggettiPage.tsx:175-176` | L7 R7-16 |
| `/guida/covo` | **non è un redirect**: pagina viva (sfide e Medaglie P), con collegamento all'Area del Covo di Yongen-Jaya | `src/router.tsx` (`guida/covo`), `CovoPage.tsx` | L2 §4 |

**Dove si documentano**: (1) in ARCHITETTURA, sezione «Indirizzi vecchi e redirect» (tabella sopra); (2) nelle descrizioni OpenAPI dei risolutori che li servono: `GET /api/mappe/risolvi/:chiave` (`routes/mappe.ts:36`, descrizione `descrizioni/mappe.ts:9`) e `GET /api/mappe/accesso/:tipo/:chiave` (`routes/mappe.ts:41`), con la frase «restituisce la casa; il frontend reindirizza»; (3) nelle descrizioni, **mai** come rotte API (sono indirizzi del FE). Nessun redirect lato server è previsto.

**Verifica senza test** (R11-22 è NR): lettura statica delle righe sopra a lotto finito (che il redirect esista ancora dopo B5, che toglie `PannelloLuogo` e riscrive `MappaPage.tsx`: `MappaPage.tsx:55-61` **va conservato**); la prova nel browser spetta all'utente (§6 la include come punto 6).

## 5. B21 — Chiusura (R11-16/1, R11-17/1) e chiusure finali

### 5.1 R11-16/1 — «le correzioni dell'utente restano dopo un aggiornamento del pacchetto» (lettura del 24/10)

**Fatti letti**:

- Le correzioni stanno in `gioco.db`: colonne `origine`/`seed_json`/`updated_at` e tabelle dedicate. Misura sulla copia a 146: **21 tabelle** hanno `origine` o `seed_json` (`confidente_regalo`, `dungeon`, `marcatore_mappa`, `luogo`, `attivita`, `libro`, `film`, `cruciverba`, `negozio`, `articolo`, `marcatore_luogo`, `mappa`, `domanda`, `spillo`, `area`, `infiltrazione_area`, `confidente_invito`, `catalogo_oggetto`, `voce_effetto`, `regola_pesca`, `nota_storica`); righe `origine='utente'` oggi: spillo 795, mappa 77, articolo 76, area 23, infiltrazione_area 40, luogo 4, negozio 4, voce_effetto 5, attività 1, film 1. `traduzione` ha colonna `fonte` (oggi tutta `seed`: 2056). Altre fonti utente: `immagine` (808, BLOB nel DB), `dati_guida` (30 chiavi, comprese quelle di editor delle disponibilità `confidente-disponibilita-editor-v1:*`) e, **dopo B11**, `correzione_dati_guida` (la tabella non esiste ancora). Font e immagini su disco: la copia di sicurezza porta anche `immagini/` e `font/` (`impostazioniService.ts:258-261`), l'export del solo `gioco.db` no (le immagini stanno nel DB dal 079).
- **Export** = `copiaDatabase('gioco')` (`impostazioniService.ts:128-139`) → `copiaSchema(db, percorso, 'main')` (`server/db/dbService.ts:139`): copia pagina per pagina dello schema `main`: **contiene per costruzione tutte le correzioni** (e rifiuta di esportare un registro Tanaka non integro, `:131-135`).
- **«Importa»** = `importaPacchettoDaDeposito` → `sostituisciDatiDiGioco` (`pacchettoGiocoService.ts:~405-460`): anteprima ricalcolata sul file da installare, **copia di sicurezza** (`copiaDiSicurezza`, `impostazioniService.ts:253`: `gioco.db`, `partite.db`, `immagini/`, `font/` in `data/backups/prima-del-ripristino-<timbro>`), `installaDatabase(…, 'sposta')`, `riapriIstanza` (migrazioni), conversioni, `regoleAllAvvio('rigido')`, `riallineaStati`, controllo Tanaka; ogni errore riporta alla copia di sicurezza (`ripristinaCopiaDiSicurezza`, `:274-284`). **Non unisce**; `partite.db` non viene sostituito.
- Altre reti: `runBootBackup` (`backupService.ts:52`): una copia **solo se ci sono migrazioni da applicare**, 7 copie; l'export manuale dell'utente.
- `ricaricaPacchetto` (unisce) è usata solo dai test: non fa parte del percorso reale (decisione del 24/10).

**Come si legge R11-16** (decisione del 24/10): le correzioni **stanno nel DB e nei backup**; dopo un «Importa» di un file più vecchio le correzioni successive al file **non sono nel DB** ma restano nella copia di sicurezza. Tre affermazioni verificabili:

- **P1 (contenuto)**: ogni correzione dell'istanza è nel file di export.
- **P2 (andata e ritorno)**: export dell'istanza A, import di quel file in un'istanza B → le correzioni di B sono identiche a quelle di A.
- **P3 (rete di sicurezza)**: dopo un import di un file più vecchio, le correzioni di prima sono recuperabili dalla copia di sicurezza (che un import di quella copia riporta).

**Procedura di prova su copia** (nessuna scrittura sui dati dell'utente; gli strumenti sono quelli del §5.3; le due istanze usano `DATA_DIR`/`DEPOSITO_DIR` dello scratchpad e **porte libere diverse da quelle delle istanze in uso** — avviare istanze di prova è una scelta da confermare, decisione C10):

1. **Basi**: `node docs/coordinamento/collaudo/collaudo-dati.cjs foto <data> <cartellaA>` (API di backup, sorgente in sola lettura, anche a istanza accesa) → base A; stessa foto in `<cartellaB>` come base B «prima delle correzioni». Impronta di partenza di A e B con `collaudo-dati.cjs impronta`.
2. **Correzioni su A** (una per **tipo**, dalla pagina o dall'API; **mai «Ripristina»**: la correzione deve restare): i tipi sono quelli del registro di B11 e delle famiglie esistenti — catalogo (negozio, articolo, libro, film, attività, luogo, domanda, cruciverba: `ModuloCatalogo.tsx`), area/planimetria, identità e note storiche del catalogo oggetti, costo del regalo, traduzione (`fonte='utente'`), quartiere (nome, descrizione), personaggi, sfide, completamento, trofei, ranghi delle Doti (blocchi di B11), regola della pesca, disponibilità dei Confidenti, immagine caricata. L'elenco esatto e completo viene da `verifica-modificabile.md` di B11 (§5.2): **la prova si fa per ogni riga di quel file con «Modifica sì»**.
3. **Impronta delle correzioni** (script di sola lettura, `impronta-correzioni.cjs`, §5.3): per ogni tabella con `origine`/`seed_json`, SHA-256 delle righe con `origine='utente'` o `seed_json IS NOT NULL` proiettate sulle colonne di dato; più `traduzione` `fonte='utente'`, `correzione_dati_guida`, le chiavi `dati_guida` d'editor e l'hash dei BLOB di `immagine` con `origine_url` nullo → `J_A`.
4. **Export** da A (`GET /api/impostazioni/istanza/database`) → file `E`. Impronta di `E` letto in `readonly`: `J_E == J_A` → **P1**.
5. **Import in B**: depositare `E` nella cartella d'appoggio, anteprima, conferma, «Importa». Verificare: `integrity_check` e `foreign_key_check` puliti; `J_B == J_A` → **P2**; una lettura per tipo (stessa GET della pagina) mostra il valore corretto; `partite.db` identico a prima (impronta `collaudo-dati.cjs`).
6. **Controllo di lettura «senza unione»**: in B fare una correzione `X'`, poi importare di nuovo `E`: `X'` non è più nel DB e **è** nella `prima-del-ripristino-<timbro>` (apertura `readonly` del file nella copia) → **P3**; confermare che `riepilogo-scarti.json` è accanto alla copia.
7. **Pacchetto vecchio**: importare `pacchetto/gioco.db` (schema 93) in B → nessuna correzione di A (atteso: non unisce); le migrazioni L11 girano da 94 alla fine; vedere §5.4.B.

**Rischio nuovo, da decidere (C16)**: `COPIE_DI_RIPRISTINO = 3` (`impostazioniService.ts:250`) e la potatura a `:262-264` cancellano `prima-del-ripristino-*` oltre le tre più recenti: **tre import consecutivi** (anche di prova, anche falliti e ripristinati) fanno sparire la copia con le correzioni di prima. Opzioni: lasciare e **dirlo** nell'anteprima e in ARCHITETTURA; alzare il numero; non potare le copie che contengono più correzioni del file in ingresso. Raccomandazione: lasciare il numero e documentare, con la riga dell'anteprima sotto.

**Modifica opzionale, che chiude la voce nella lettura decisa (C11)**: nell'anteprima dell'import (`anteprimaDalDatabase`, `pacchettoGiocoService.ts:~305-340`; DTO `AnteprimaPacchettoDto`, `shared/types.ts:3050`) il conteggio `differenze` mostra aggiunte e tolte di righe ma **non** le correzioni su righe esistenti (un `UPDATE` non cambia il conteggio). Aggiungere `correzioniIstanza` e `correzioniFile` (conteggi per tabella di `origine='utente'`, `seed_json IS NOT NULL`, `correzione_dati_guida`) e una riga nell'elenco già esistente: «Nell'istanza ci sono N correzioni che il file non ha: dopo l'importazione restano solo nella copia di sicurezza». È **informazione dentro un pannello esistente**, non una nuova superficie di decisione (BON-11): è l'opzione D9 di B10 resa necessaria dalla lettura del 24/10.

**Verifica senza test**: punti 3–6 sono script di sola lettura sui file; i passi che usano l'app (2, 5, 6) sono **prove funzionali su copia**: spettano all'utente, oppure all'agente con il suo permesso esplicito (C10). Se non c'è permesso, resta fatta e dichiarata la parte statica (P1 sull'export di una copia con correzioni scritte **direttamente in SQL su una copia**) e P2/P3 si lasciano all'utente.

### 5.2 R11-17/1 — «nessun dato di gioco resta modificabile solo nel pacchetto»

**Lettura**: per ogni dato di `gioco.db` esiste, nell'app, un punto in cui si modifica (e dove c'è un valore della guida un «Ripristina»), oppure il dato è dichiarato **non modificabile con motivo** (identità, struttura, chiavi di altre tabelle). Base di lavoro: `docs/coordinamento/lotti/L11/verifica-modificabile.md` che B11 consegna (schema in `B11-ripristino.md` §5: «Dominio · Oggetto | Dato | Dove si modifica | Modifica | Ripristina | Prova | Esito»; lo stato di oggi era: 7 righe «sì/sì», 22 oggetti o gruppi «no»).

**Controllo sistematico di sola lettura** (da fare a B11, B16, B17 consegnati):

1. **Tabelle**: elenco delle tabelle di `gioco.db` (oggi 101 a 146; `sqlite_master`) e, per ognuna, il **punto di scrittura** nel codice: `INSERT|UPDATE|DELETE` in `server/services` (non migrazioni, non `pacchetto/`) e la rotta che lo raggiunge (`PUT|POST|DELETE` in `server/routes`); le tabelle **senza** scrittore runtime sono: archivio dichiarato in B1 (motivo), tabelle di cache (`immagine_miniatura`), o **violazioni di R11-17** da portare in `verifica-modificabile.md`.
2. **Blocchi `dati_guida`** (30 chiavi): per ciascuna, scrittore runtime? (le chiavi tolte dal registro «archivio» sono fuori). Dopo B11: tutti i blocchi di dato della guida (`personaggi`, `sfide`, `completamento`, `oggetti-guida` parti) passano da `correzione_dati_guida`.
3. **Traduzioni**: «Ripristina» di una traduzione legge il pacchetto iniziale **del repository** (`traduzioniService.ts:107-137`, `descrizioni/traduzioni.ts:27`): è un punto in cui il valore della guida vive **solo nel pacchetto**. Decisione di B11 D2 (nomi delle Doti dalla colonna, togliendo le 30 righe); per le altre 2026 righe della tabella controllare che «Ripristina» abbia un valore anche quando il pacchetto in git è a schema 93 (C14: **non** rigenerare `pacchetto/gioco.db`, è anche il «pacchetto vecchio» della prova).
3. **Confronto con l'inventario B1**: ogni riga `tieni` con `S=0` (nessuno scrittore runtime) deve comparire in `verifica-modificabile.md` come «non modificabile (motivo)».
4. **Revisione avversariale** del documento: un agente distinto cerca un dato modificabile solo con una migrazione o con un nuovo pacchetto.

**Esito atteso**: nessuna riga «no» senza motivo. Tesori (`tesoro`, `tesoro_modificatore`) e Persona/Ombre sono di B17 (dopo L8).

### 5.3 Impronte prima/dopo (R11-21): strumenti da ricreare e come usarli

**Che cosa c'è nel repository** (verificato): `docs/coordinamento/collaudo/collaudo-dati.cjs` (122 righe; comandi `impronta`, `foto`, `ripristina`, `confronta`; l'impronta copre **ogni tabella** di entrambi i file: `user_version`, SHA-256 dello schema, numero di righe e SHA-256 delle righe in ordine stabile — `rowid`, o tutte le colonne per le tabelle `WITHOUT ROWID` —, BLOB compresi; richiede di essere lanciato dalla cartella che contiene `node_modules`) e la sua procedura `PROCEDURA-DATI.md`; esiste anche `docs/coordinamento/lotti/L1/esiti-funzionali/impronta-db.cjs` (32 righe, non letto). **Non esistono nel repository** `impronta.cjs` e `impronta-mondo.cjs`.

**Limite di `collaudo-dati.cjs`** (letto): fa `select *` su ogni tabella, quindi **una tabella ricostruita senza una colonna cambia impronta anche se i dati restano uguali**. Per i drop di L11 serve un confronto **proiettato** sulle colonne che sopravvivono.

**Da ricreare (e committare nel repository, sotto `docs/coordinamento/collaudo/`, come il file esistente — decisione C12)**:

| Script | Che cosa calcola | Di cui R11-21 vuole l'identità |
|---|---|---|
| `impronta-lavoro.cjs` (era `impronta.cjs`) | SHA-256 + conteggi di: **diario 04-01..06-01** (`voce_giornata` sulle sole colonne di prima della 110 — esclusa `validata` e le quattro colonne nuove `da_rivedere`, `aggiunta_da`, `testo_precedente_json`, `motivo_revisione`: `DATI-INVENTARIO.md` e `PROCEDURA-DATI.md`) e spunte; **Kamoshida** e **Madarame**: aree, voci, pin, stati di voci e di pin, nei **due perimetri** («utente» e «impronta»: voci per area; pin dell'albero di ogni origine più quelli senza mappa legati per `area_guida_chiave`) | requisiti R11-21: diario 255 voci sulla copia 0440Z (254 sulla precedente), Kamoshida 169 voci, Madarame 227 voci e 254 pin utente (225/252 sulla precedente) |
| `impronta-mondo.cjs` | per chiave: mappe (54), pin (300: mappa, x, y, nome, riferimento, condizioni, destinazione, voci), alias (115), ingressi (2), luoghi (93), stati di pin: i campi **che sopravvivono** ai drop | (dati di L2 §1.10 e `noreg.md`) |
| `impronta-correzioni.cjs` | le righe `origine='utente'` e le correzioni di §5.1 punto 3 | R11-16/17 |
| `confronta-proiettato.cjs` | come `confronta` di `collaudo-dati.cjs` ma con l'elenco delle colonne tolte (da `FONTI_TOLTE`) escluso dall'impronta delle tabelle ricostruite | ogni drop |

**Uso per ogni migrazione di eliminazione** (B8, B9, B12, B15 e quelle di partite; ripetuto da B21 su tutte insieme):

1. Foto della copia **prima** (`foto`) e impronta (`impronta`, `impronta-lavoro`, `impronta-mondo`).
2. Applicare le migrazioni sulla copia (avvio dell'istanza di prova **sulla copia**, `DATA_DIR` dello scratchpad).
3. Impronte **dopo**; `confronta-proiettato`: ammesse **solo** le differenze elencate nella voce di `FONTI_TOLTE` (tabelle tolte, colonne tolte), nelle tabelle nuove di archivio e nei campi aggiunti; ogni altra differenza è un blocco.
4. `PRAGMA foreign_key_check` e `integrity_check` su entrambi i file; `sqlite_master` dopo il drop non contiene le strutture elencate.
5. Ripetere su **una base a schema 93** (`pacchetto/gioco.db`): le migrazioni 94 → N **non sono mai state eseguite su quei dati** (rischio dichiarato da B8/B9): migrare da zero e confrontare `sqlite_master` e i conteggi con quelli della copia reale; per B9, prima e dopo il congelamento di 027, 038, 042, 066, 067 (e 130, 131, 135 già deciso).

**Cifre di riferimento**: le impronte «prima» si prendono **sulla copia fresca** a inizio B21 (memoria «Dati freschi»: conteggi e identificativi della copia, non le cifre dei documenti); quelle dei documenti (`1a71b030…`, `ff3033cb…`, `bbd9de5d…`) sono storia di basi diverse.

### 5.4 Chiusure finali degli altri blocchi

**A. Rigenerazione dell'inventario B1 (R11-01/1)** — ordine: **dopo B19** e a L10 consegnato (oggi `stato.json` dà L10 `consegna: da-fare`: la rigenerazione **non si può fare ancora**).

1. Perché dopo B19: una tabella letta solo da codice morto ha `L>0` finché il codice non è tolto; B19 la porta a `L=0`.
2. Procedura (B1.3 di `B1-B2-B7-B10.md`): copia fresca, script di tabelle/colonne/lettori su `server/` e `shared/` senza migrazioni e test, `dati_guida` per chiave, verifica a mano delle righe `L=0`/`C>0`; script unico **da provare tutto insieme** (la nota B1.3 punto 8 dice che non è stato mai lanciato intero).
3. Output: `docs/coordinamento/lotti/L11/inventario-lettori.md` nel formato B1.1, con §8 «Differenze rispetto all'inventario precedente».
4. **Criterio di uscita** (B1.1): righe di §2+§3 = tabelle misurate; §1 senza righe `verifica`; ogni `archivio` ha motivo; ogni `elimina` ha voce di piano, migrazione e corredo; la rigenerazione **non mostra `L=0` privi di motivo**. Se ne compaiono di nuovi, nasce un giro in più (migrazione di eliminazione → B19 → rigenerazione): va **limitato a una iterazione** o alla decisione dell'utente.
5. Verifica: confronto automatico dei conteggi e rilettura a campione (≥ 15 righe `C>0` o `elimina`) da un agente distinto.

**B. Prova di B10 su pacchetto vecchio e cestino, dopo i drop (R11-05/1-3, R11-06/1)** — richiede che B8, B9, B12, B15 abbiano **riempito `FONTI_TOLTE`** nella stessa migrazione che toglie (regola scritta in `fontiTolte.ts:1-10`). Passi, tutti su copie:

1. **Export** (R11-05/1): sulla copia migrata, `sqlite_master` di `main` e di `utente` confrontato con `FONTI_TOLTE` e con le righe `elimina` di B1: nessuna deve comparire.
2. **Riepilogo degli scarti** (R11-05/3): script di sola lettura che apre in `readonly` `pacchetto/gioco.db` (schema 93) e la copia migrata e stampa `scartiDelPacchetto(pacchetto, istanza)` (esportata a `pacchettoGiocoService.ts:152`; usabile con `npx tsx -e` passando due handle `better-sqlite3` `readonly`, senza aprire `data/`). Atteso: ogni drop compare con le righe giuste e `spiegata: true`; la colonna/tabella senza voce compare come «non spiegata» (oggi: `seed_meta` 4 righe, secondo la scheda B10). Ripetere con una copia **prima** delle migrazioni L11 contro lo schema **dopo**.
3. **Cestino** (R11-06/1): script di sola lettura che per ogni riga di `cestino` e `cestino_partite` confronta passo per passo le colonne del registro con `pragma_table_info` di oggi e stampa tabelle assenti, colonne tolte con valore, colonne aggiunte; replica la logica di `registroCestinoPin.ts` per i pin; atteso: nessuna riga irripristinabile (409) e ogni colonna tolta **dichiarata** in `FONTI_TOLTE`. Le 8 righe di cestino della copia a 146 (2 mappa, 3 oggetto, 2 pin, 1 voce; 3 citano colonne da togliere: `mappa.entita_*`, `gruppo_immagini_json`, `articolo.condizione`) devono risultare ripristinabili per ciò che può tornare. Un ripristino reale di una riga (con `colonna-rimossa` e `tabella-rimossa`) è prova funzionale su **copia**: dell'utente, o dell'agente con permesso (C10).
4. **Import di un DB vecchio** (R11-05/2): copiare `pacchetto/gioco.db` nello scratchpad, applicare `runMigrations` (e `regoleAllAvvio('rigido')`) con `DATA_DIR` dello scratchpad (la prova scrive **solo** sulla copia); controllare `foreign_key_check`, `integrity_check`, assenza delle strutture tolte, impronta del mondo e del diario coerenti con quelle del file in ingresso (non c'è lavoro dell'utente nel pacchetto: il confronto è con la sua stessa impronta di partenza). **Prima** di questa prova, nessuna conferma che le migrazioni 94 → N reggano su quei dati.
5. Dopo tutto: `RIFERIMENTI_PARTITE` (`pacchettoGiocoService.ts:~69-130`) senza le righe delle tabelle tolte (`lettura_partita`, `requisito_partita`: scritto in B10.4, «per igiene»); `ETICHETTE` **non** ripulite.

**C. Voce riservata all'utente: R11-09/collaudo-utente** — §6.

### 5.5 Lista di controllo finale (B21)

Da eseguire nell'ordine; ogni riga ha l'esito nel resoconto (output grezzo dove c'è un comando).

1. `git status --short`: **nessun file temporaneo** (oggi c'è `zz-b5-migra.tmp.ts` in radice, di un'altra sessione: non va in nessun commit; nessun `*.tmp.*`, `BE.log`/`FE.log` non tracciati nuovi, nessun DB); nessun file `*.test.*` cancellato.
2. `npm run typecheck` (`tsc -b tsconfig.full.json`: app, node, server, test) → exit 0.
3. `npm run lint` → exit 0.
4. `npm run build` (`tsc -b && vite build`) → exit 0.
5. `npm audit --omit=dev --audit-level=high` (gate di `.github/workflows/ci.yml:40`; richiede rete) → exit 0.
6. Script del §3.2 (esportazioni, file, client) e §3.4 (rami di compatibilità): numeri finali nel resoconto.
7. Script del §4.5: rotte senza descrizione e descrizioni senza rotta, entrambi vuoti.
8. Procedura di confronto di ARCHITETTURA (§4.1): simboli ritirati, percorsi inesistenti (0), numeri, rinvii.
9. Rigenerazione dell'inventario B1 (§5.4.A) con criterio di uscita.
10. Prova di B10 (§5.4.B), prova R11-16 (§5.1) e controllo R11-17 (§5.2), con le impronte di §5.3 identiche prima/dopo (diario 04-01..06-01, Kamoshida, Madarame, mondo) su **copia fresca**; correzioni `origine='utente'` tutte presenti; cestino ripristinabile.
11. **Riesame avversariale** (regola del 21/10): un agente distinto (modello di verifica), con accesso diretto a `requisiti.md`, `modifiche.md`, `difetti.md`, `stato.json`, questa scheda e le altre; cerca scostamenti e controesempi (un redirect perso, una guardia tolta che serve a un'importazione, una rotta senza descrizione, una decisione attribuita all'utente senza sua frase, un dato modificabile solo dal pacchetto); dichiara copertura e limiti; **non modifica nulla**; i rilievi bloccano la chiusura finché non sono risolti o sottoposti all'utente.
12. Aggiornare `docs/coordinamento/regia` (`aggiornamenti.json`, `index.html`), `STATO-ATTUALE.md` e `stato.json` (voci di L11 chiuse con prova; **non** chiudere `R11-09/collaudo-utente`).
13. A fine lotto: **unico commit/push** di codice e coordinamento su `newreview` (verificare `git branch --show-current`); seguire la pipeline **fino all'esito**; aprire p5s nel browser (regole del progetto). Se le migrazioni di L11 entrano in pipeline: backup del volume p5s **prima** del rilascio (procedura del collaudo).
14. Resoconto all'utente con: che cosa non è stato eseguito (test, prove funzionali), i test che diventano rossi a runtime (elenco), le decisioni ancora aperte.

## 6. R11-09/collaudo-utente — procedura di sola lettura per l'utente

Riservata a lui (nessuno script o esecuzione a carico dell'agente). Si fa **a B3 e B4 consegnati** (oggi `ricerca` non esiste: `shared/ricerca.ts` e `server/services/ricerca/` non ci sono). Tutto in **lettura**: nessun salvataggio, nessuna correzione; si apre la ricerca, si cerca, si tocca un risultato, si torna indietro.

1. **Dove si apre**: «Cerca» nell'intestazione (a ogni larghezza), scorciatoia `/` da tastiera; su telefono a tutto schermo; da 1024 px un pannello. Controllare a 1280, 768 e 375 (e a 1366×657 e 1280×689): nessuno scorrimento orizzontale, bersagli ≥ 44 px.
2. **Per ogni tipo** della tabella sotto: scrivere tre lettere del nome e vedere che il risultato del tipo giusto compare **nel suo gruppo**, che porta **una pagina che esiste** (nessun 404, nessuna pagina vuota), e che «indietro» riporta alla pagina da cui si è partiti (la partita si ritrova).
3. **Nomi originali e senza accenti**: cercare un nome originale e uno con accento scritto senza (es. un nome di Persona in inglese; un nome italiano con accento). Cercare un nome in codice del gruppo, per esempio «Queen» (deve trovare Makoto) e «Palazzo di Sae» (deve trovare il Palazzo di Niijima): sinonimi di G-038.
4. **Nascosti**: un elemento nascosto dall'utente (per esempio uno dei 18 articoli nascosti, o il negozio nascosto) **non** compare; la grafica predefinita come nelle viste.
5. **Luoghi chiusi**: un luogo chiuso adesso **si trova** con «Chiuso adesso» e il motivo; un'area «Da verificare» compare con il suo segno; nessun risultato porta il nome «Mappa» o «atlante».
6. **Indirizzi vecchi** (R11-22): aprire a mano i vecchi indirizzi del §4.6 (per esempio `/guida/mappe/<chiave di un quartiere>`, `/guida/mondo/quartiere/<q>`, `/guida/negozi/<negozio con sede>`, `/guida/attivita?scheda=libri`, `/guida/rimossi`): ognuno arriva alla destinazione indicata.
7. **Dalla metro, dal diario e dalla ricerca** (R11-23): lo stesso Palazzo, la stessa infiltrazione e la stessa voce.

Tabella dei tipi e delle quantità da coprire (cifre della preparazione del 23/10 sulla copia a 146; **da rifare** sulla copia fresca): quartieri 24; aree 140 (mondo + Palazzi); planimetrie 316; luoghi 109; negozi 62; Palazzi 9; infiltrazioni 100; voci della guida 960; Persona 232; oggetti 1298; Confidenti 23; attività 30; libri 46; film 30; Richieste 33; giorni 346; trofei 53; più, da L8 e L9, Ombre e pagina attività. **Come l'utente prende i nomi di prova senza scrivere nulla**: un `node -e` di sola lettura su una **copia** di `gioco.db` (aperta `readonly`) che stampa, per ogni tipo, i primi tre nomi e l'ultimo (esempio per gli oggetti: `select nome from catalogo_oggetto where nascosto=0 order by random() limit 3`; i nomi delle colonne si leggono con `pragma_table_info`); oppure scegliere a mano dal compendio. **Controllo statico che compensa** (a carico di B3, non dell'utente): il registro dei tipi in `shared/ricerca.ts` rende obbligatoria una «casa» per ogni tipo (un tipo senza costruttore non compila: `ondata1-2026-10-24.md` §2, R11-09/1).

## 7. Decisioni da confermare

| # | Blocco | Decisione | Raccomandazione |
|---|---|---|---|
| **C1** | B19 | Codice morto con test (§3.3.B–C: 13 funzioni e 2 file con test). La regola del 24/10 ammette modifiche ai test «solo per compilare»; togliere `importaPacchetto`, `zoneDeiPezzi`, `RimossiPage`… rompe la compilazione del test | **Togliere** il codice e, nei test, **togliere solo le asserzioni che lo usano** dichiarandole superate con `it.skip`/`describe.skip` e il motivo (R11-04: «nessuna variante rossa lasciata», «i file non si cancellano»); serve il sì perché è più di «compilare» (stessa domanda di D6 di B10). Alternativa: tenere il codice come «sostegno ai test» (contro R11-03) |
| **C2** | B19/B10 | `importaPacchetto` (`pacchettoGiocoService.ts:388`), `ripristinaIstanza` (`impostazioniService.ts:398`), `ricaricaPacchetto` (`pacchettoGioco.ts:194`): usate solo dai test (≈ 9, 11, 30 punti) | Tenerle finché i test di lucchetto e di pacchetto le usano, **dichiarandole nel codice «per le prove»**, oppure spostarle in un modulo di sostegno ai test; `ricaricaPacchetto` unisce e contraddice la lettura del 24/10: se si toglie, i 30 punti di test si riscrivono (lavoro più grande di «compilare») |
| **C3** | B19 | Rami di compatibilità: togliere le guardie su strutture sempre presenti (classe D, ~25 file) e tenere K; se un test usa uno schema parziale, adeguarlo solo per compilare o lasciare la guardia | Sì; leggere a mano la classe V; mai nei file di L8–L10 prima della consegna |
| **C4** | B19 | Non restringere i 342 `export` usati solo nel proprio file | Confermare (non è R11-03) |
| **C5** | B7/B19 | `GET /api/mappe/spilli/:id/precondizione-raccordo` è un'ottava rotta orfana (nessun consumatore in `src/`) | Toglierla con la descrizione (B7), dopo aver controllato che nessun test di L5 la usi come contratto |
| **C6** | B20 | ARCHITETTURA: riscrittura per dominio senza la storia per fase, o archivio separato | Riscrittura per dominio; la storia resta in git e in `DECISIONI.md`/`ROADMAP.md` |
| **C7** | B20 | DECISIONI: formato consigliate/confermate; stato di D1–D8 come in §4.3 (D6 superata, D8 risolta); aggiungere le due decisioni del 24/10 mancanti; attribuzione «U» solo con parole dell'utente | Confermare lo stato di D1–D8 e se le due decisioni del 24/10 sono parole dell'utente |
| **C8** | B20 | `docs/MAPPE.md`: banner e riscrittura di §3 e §5, o solo banner | Banner + §3 e §5 |
| **C9** | B20 | Redirect documentati in ARCHITETTURA e nelle descrizioni dei due risolutori; nessun redirect lato server | Confermare |
| **C10** | B21 | Chi esegue la prova R11-16 e la prova di ripristino del cestino su copia, e se si possono avviare istanze di prova su porte libere (le regole dicono di non avviare altri servizi funzionanti) | Parte statica e di sola lettura a B21; le parti che usano l'app e scrivono sulla **copia**, all'utente o all'agente con il suo permesso esplicito |
| **C11** | B21/B10 | Conteggio delle correzioni dell'istanza nell'anteprima dell'import (D9 di B10) | Sì: chiude R11-16 nella lettura decisa, senza nuova superficie |
| **C12** | B21 | Script d'impronta nel repository (`docs/coordinamento/collaudo/`) e non nello scratchpad | Sì: erano il punto debole di L2/L11 |
| **C13** | B21 | `R11-24` dice «test mirati verdi con output grezzo»: con la regola zero test non si eseguono | Leggere R11-24 come typecheck, lint, build e audit; i test li esegue l'utente su richiesta |
| **C14** | B21 | Non rigenerare `pacchetto/gioco.db` (schema 93): è il «pacchetto vecchio» della prova e il file di primo avvio | Confermare (e, a fine lotto, valutare `npm run pacchetto` solo se l'utente lo chiede) |
| **C15** | B21 | `VACUUM` dopo i drop | No (D9 di B10): i byte restano nelle pagine libere; scriverlo in ARCHITETTURA |
| **C16** | B21 | `COPIE_DI_RIPRISTINO = 3`: tre import consecutivi cancellano la copia con le correzioni di prima | Lasciare, dirlo nell'anteprima (C11) e in ARCHITETTURA; alternativa: alzare a 5 |
| **C17** | B20 | Nome della pagina «Luoghi della guida» al posto di «Mappe» (è citato in ARCHITETTURA e nei testi OpenAPI) | Decide il PM; la documentazione segue |

## 8. Ordine dei passi e file condivisi

**Ordine fra i blocchi della chiusura** (e con il resto del lotto):

```
B7, B8, B9, B12, B13, B15 (drop)  ──>  B19 (codice morto e guardie)  ──>  B1 rigenerato  ──(eventuale giro)──>  B19 bis
B3, B4, B5, B6, B11, B16, B17 (funzioni) ──>  B20 (documenti)  ──>  B21 (prove, impronte, lista di controllo, riesame)
L8, L9, L10 consegnati                   ──>  B19, B1 rigenerato, B21
```

- **B20 può partire prima** per le parti che non dipendono dal codice finale (D1–D8, tabella dei redirect, stato dei lotti, riscrittura delle sezioni di L0–L7), e si **chiude dopo B19**: l'ultima passata (percorsi, simboli, numeri) si fa sul codice finale.
- **B21 per ultimo**, su **copia fresca** presa in quel momento.
- Dentro B19: (1) client e utility; (2) DTO e costanti; (3) servizi; (4) file interi; (5) guardie D; (6) `conteggi` e `ConteggiAlberoDto`.

**File condivisi (un solo proprietario alla volta)**:

- `shared/types.ts` (B19: rimozione di `HealthDto`, `InfiltrazioneDto`, `ConteggiAlberoDto`; B8, B9, B3, B5, B10, B11 e le altre sessioni con modifiche non committate).
- `server/services/mappe/mappeService.ts`, `dungeonService.ts`, `legamiInfiltrazioni.ts`, `areeService.ts`, `palazziService.ts`, `luoghiService.ts` (B8, B9, B12 e poi B19: **serializzare**).
- `server/openapi/descrizioni/*.ts` e `server/routes/*.ts` (B3, B5, B7, B11, B19, B20; `openapi.test.ts:36` vuole 1:1; `routes/compendio.ts` e `descrizioni/compendio.ts` sono già modificati da L9/L10).
- `docs/ARCHITETTURA.md`, `ROADMAP.md`, `DECISIONI.md`, `MAPPE.md`: solo B20 (le altre sessioni **non** li aggiornano a ogni passo: il documento è di B20; chi consegna un blocco lascia le note nel proprio resoconto).
- `docs/coordinamento/stato.json`, `STATO-ATTUALE.md`, `regia/*`: PM.
- `server/db/fontiTolte.ts` e `cestinoService.ts` (`ETICHETTE` non si ripulisce), `pacchettoGiocoService.ts` (`RIFERIMENTI_PARTITE`).
- `src/router.tsx`, `MainLayout.tsx`, `src/pages/MappaPage.tsx` (B2, B4, B5; il redirect di `MappaPage.tsx:55-61` si conserva).

## 9. Rischi

1. **Il mondo cambia sotto B19 e B20**: L8, L9, L10 stanno committando (migrazioni 166–172, `negoziazioneService`, giorno unico, editor del giorno); un elenco di codice morto e un conteggio di migrazioni invecchiano in ore. Mitigazione: gli script del §3.2 e §4.5 si rifanno **a ondate 1–5 chiuse**, e B19 non tocca i file di un lotto non consegnato.
2. **Falsi morti** (omonimie, `import * as`, SQL dinamico, commenti): ogni voce si riconferma con `grep -rnw` e lettura prima di toglierla; un controllo `typecheck` verde **non** dimostra che nulla sia stato tolto per errore (le esportazioni non usate non danno errori e, viceversa, un nome usato solo per stringa non ne dà quando lo si toglie).
3. **Test che compilano ma diventano rossi a runtime** (le suite delle rotte tolte, C1): non si possono eseguire; elencarli nel resoconto per l'utente.
4. **Guardie tolte che servivano a un import o a un test a schema parziale** (C3): confermare K e V a mano.
5. **Documenti scritti su codice non ancora consegnato**: B20 non descrive come reale ciò che è bozza (memoria «verifica su tutto» e nota di ARCHITETTURA: «non descrivere queste basi come rilascio funzionante»); ogni affermazione ha un `file` o un commit.
6. **Decisioni attribuite male**: D6/D8 e le due del 24/10: C7; mai «U» senza parole dell'utente.
7. **Prova R11-16 sui dati**: scrive solo su copie; istanze di prova su porte libere (C10); le impronte si prendono sulla copia fresca, non sulle cifre dei documenti; la rotazione a 3 copie (C16) è un rischio reale per l'utente anche fuori dalla prova.
8. **Base v93**: le migrazioni 94 → N non sono mai state eseguite sui dati del pacchetto iniziale: se falliscono, **un import di un file vecchio fallisce** e riporta alla copia di sicurezza (comportamento corretto ma R11-05/2 non sarebbe soddisfatta).
9. **`stato.json` non allineato** al codice (L11 e L7): la tabella di ROADMAP usa solo stati con una prova; non correggere `stato.json` di nascosto.
10. **Lavoro dell'utente da preservare (R11-21)**: nessuna delle schede di chiusura scrive su dati reali; ogni drop porta le impronte prima/dopo; il cestino (8 righe sulla copia) deve restare ripristinabile per ciò che può tornare.
11. **Repo pubblico**: nessun nome utente, nome di partita o indirizzo di server nei documenti da scrivere né nei JSON di riepilogo; questa scheda cita solo nomi di tabella, di colonna e di file.
12. **Zero test**: nessun file `*.test.*` nuovo; i controlli sono script di sola lettura e procedure scritte; il collaudo della ricerca è dell'utente.

## 10. Limiti

- Nessun typecheck, lint, build, test o prova nel browser eseguiti da me. Gli script (esportazioni, file, rotte↔descrizioni, rami di compatibilità, percorsi citati in ARCHITETTURA) sono `node -e` di sola lettura, **non ripetuti due volte** e con i limiti dichiarati in §3.2; le cifre sono un'istantanea del 24/10 su un worktree che si muove (commit di B2, B5, B10 arrivati durante il lavoro).
- La classificazione dei 54 file dei rami di compatibilità è **preliminare**: ho letto le righe dei file indicati nel §3.4 (`mappeService.ts`, `dungeonService.ts`, `tanakaStatoListino.ts`, `statiGuida.ts`, `percorsiMappe.ts`, `palazziService.ts`, `luoghiService.ts`, `legamiInfiltrazioni.ts`, `acquistiLegacy.ts`) e verificato per nome i 18 obiettivi esistenti a 146; non ho letto gli altri 45 file né provato che nessun test chiami i servizi su uno schema parziale (solo la lista dei test che aprono un `new Database(`).
- Non ho letto per intero ARCHITETTURA (solo testa, §3, §5, §5 bis e le sezioni 1610-1748 e le righe citate dai termini ritirati): le sezioni 349-390, 727-749, 800-998 e quelle senza termini ritirati sono **da leggere** (le ho segnate «da verificare» dove serve). Non ho letto `docs/analisi/2026-10-20-piano-razionalizzazione.md` né `STATO-ATTUALE.md` per intero.
- Le cifre dei dati (21 tabelle con `origine`/`seed_json`, righe `origine='utente'`, 2056 traduzioni, 8 righe di cestino) sono sulla copia a gioco 146 (utente 30), **non** sulle migrazioni 147-172 né sul lavoro successivo dell'utente: da rifare sulla copia fresca.
- `impronta-db.cjs` (L1) non è stato letto; `collaudo-dati.cjs` letto fino alla riga 40 (impronta completa per tabella con `select *`, comandi `impronta/foto/ripristina/confronta`) e dalla descrizione di `PROCEDURA-DATI.md`.
- Le due decisioni del 24/10 non trovate in `DECISIONI.md` potrebbero essere state registrate altrove (chat, Regia): ho cercato in `docs/`, nella memoria del progetto e in `CLAUDE.md`, non nella cronologia delle sessioni.
- Non ho verificato che le rotte orfane (compresa l'ottava) non siano chiamate da script o strumenti esterni al repository (solo `src`, `server`, `shared`, `scripts`, `test`, `docs`).
