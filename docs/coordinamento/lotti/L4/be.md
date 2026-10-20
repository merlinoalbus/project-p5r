# L4 «Avanzamento unico» — implementazione BE

Sessione «Implementazione BE», 2026-10-20. Cartella di sviluppo `pensive-burnell-b50941` (branch `newreview`), dati in `data/`.
Ingressi: `modifiche.md` (§0-§3, §5 BE, §6.1), `dati.md`, `app.md`, decisioni dell'utente via PM (nessuna voce segnata in migrazione; le 8
divergenze di Kamoshida conservate «da verificare»; le descrittive tengono il segno e non contano; nessuna fusione).
Tutte le modifiche con Edit e Write; gli script nello scratchpad (`…\365ea5e8-…\scratchpad\l4\`) leggono e scrivono solo copie.
**Niente committato** (committa il PM).

## 1. Che cosa c'è

### Moduli condivisi
- `shared/caratteriVoce.ts` (nuovo, §1.1): `CARATTERI`, `NOME_CARATTERE` («Permanente», «Si ripropone», «Racconto»), `carattereDaTipo(tipo,
  areaDedalo)` (oggetto/ombra-sciagura/nemico → rigenerabile; storia/altro → descrittiva; il resto → permanente; dedali e Persona → null),
  `carattereDellaVoce(v)` (la scelta dell'utente vince), `sqlCarattereVoce(alias)` (la stessa regola in SQL, provata uguale alla funzione).
- `shared/completamentoGuida.ts` (nuovo, §1.5): `infiltrazioneCompletata` (senza niente da contare mai), `areaCompletata` (senza, sì),
  `palazzoCompletato` (oggetti + Tesoro + boss; senza oggetti no), `percentualeOggetti` (intera per difetto).

### Migrazioni
- Gioco **111** `111_carattere_delle_voci.ts`: `punto_interesse.carattere` con CHECK, tutta NULL; nessun'altra scrittura; log per Palazzo.
- Partite **022** `022_divergenze_da_verificare.ts`: `utente.divergenza_partita (partita_id, spillo_uid, voce_chiave, rilevata_il)`;
  una riga per pin con `raccolto = 1` e voce che conta non fatta (regola dell'oggetto permanente calcolata dentro la migrazione, così non
  dipende dai servizi); nessuna riga di `punto_partita`/`spillo_partita` cambia; idempotente; caso inverso solo contato.
- Registrate in `migrations/index.ts` e `migrazioniUtente/index.ts`; applicate a `data/` (111 e 22, 4 divergenze).
- `RIFERIMENTI_PARTITE`: le due colonne di `divergenza_partita` (orfani elencati come gli altri). Cestino: etichetta della tabella.

### Il modello di lettura (`server/services/mappe/statiGuida.ts`)
- `modelloAvanzamento(db)`: voci con carattere effettivo, **oggetti permanenti** (componenti connesse del grafo voci permanenti ↔ pin, per
  Palazzo; chiave = la chiave minima delle voci), voci di ogni pin divise in *contano* / *altre* (senza carattere: dedali, Persona) /
  *descrittive*, infiltrazioni in ordine. Calcolato in blocco, una volta per richiesta.
- `statiDellaPartita`: voci segnate, oggetti fatti, segni dei pin, divergenze.
- `voceFatta` / `statoDellaVoce` (una permanente è fatta dal suo oggetto; «esaurito» rimasto su una voce non più esauribile si legge
  «ottenuto»), `vociFatte`, `oggettiDelleVoci`, `oggettiDelleMappe`, `contaOggetti`, `completamentoDegliOggetti`.
- `statoDelPin(m, s, pin, contesto)` (§0): con voci che contano, fatto quando sono fatte le permanenti e le rigenerabili
  dell'**infiltrazione di contesto** (§1.4: guardata, altrimenti `infiltrazioneInCorso`; se il pin non ne ha, la più recente prima; se
  nemmeno, la prima); con una divergenza conservata, fatto e «da verificare»; senza voci che contano, i dedali con la regola di prima
  (R4-30) e gli altri col loro segno (`statoProprio`).
- Scritture: `scriviStatoVoce` (segnare scrive la sua riga; riaprire una permanente cancella le righe di tutto l'oggetto e allinea gli
  Enigmi di quelle voci; i pin dei dedali seguono come prima; pulisce le divergenze risolte), `allineaEnigma` (passi fatti con la regola
  nuova), `togliIlFattoAlPin`, `fissaStatoDeiPinCheRestanoSenzaVoci` (vedi §3), `vociDelGestoSulPin`.
- `collegamentiGuida.ts`: `allineaStatiPunto` e `allineaPinScollegato` non fanno più niente per le voci con un carattere (collegare un pin
  raccolto non segna più la voce, R4-12); restano per i dedali.

### Servizi
- `dungeonService`: `raccoltaMappe` con lo stato del pin nuovo; `puntoDto` con `carattere`, `carattereScelto`, `oggetto`, `daVerificare`
  (solo Palazzi); scheda con `completamento` per Palazzo, infiltrazione, planimetria, Area del Palazzo, `daVerificare`, `schedeDaSistemare`;
  `?infiltrazione=` (contesto); `impostaStatoPunto`: 400 `voce-non-esauribile` (non nei dedali); `aggiornaPunto`: `carattere` (400
  `carattere-non-ammesso` per dedali e Persona); `staccaPunto` e lo scollegamento fissano lo stato dei pin che restano senza voci e tolgono
  le divergenze della voce; `copieDelPalazzo` (R4-15, sola lettura); `collegaSchedaAllaVoce` / `creaVoceDallaScheda` (schede da sistemare).
- `palazziService`: `valutaPalazzo` con la funzione unica (oggetti permanenti, Tesoro dal pin con la regola del pin, boss dalla voce o dal
  pin); `statoPalazzi(partita?)` dà anche `completamento`; testo «Tesoro, boss finale e tutti gli oggetti permanenti (n/n)».
- `mappeService`: `dettagliSpillo` con `statoDelPin` (via l'«OR»), campi `contestoInfiltrazione`, `daVerificare`, `statoProprio` solo per i
  pin dei Palazzi; voce del pin con `carattere`, `infiltrazione`, `daVerificare`; `?infiltrazione=` su `GET /api/mappe/:chiave`;
  `impostaRaccolto` sul §3.2 (con voci che contano segna/riapre le voci, con `infiltrazione` nel corpo; i dedali come prima; gli altri il
  loro segno); pulizia delle divergenze dei pin tolti (eliminazione di pin e mappe, import).
- `disponibilitaService`: «Voce della guida» con `vociFatte`, «Pin di una mappa» con `statoDelPin`. `semaforiService` legge `statoPalazzi`.
- `areeService`: `completamento` nelle Aree dei Palazzi (`/api/aree/dungeon/:k` e scheda).
- `contenutiGuidaService` (§2.3): nei Palazzi i punti dei contenuti della guida sono **le voci** (`punto:<chiave>`, con stato, carattere,
  esauribile e `posizioneDaCollocare`); le schede senza mappa non sono più elementi a sé; i Memento restano sul ramo di prima.
- `divergenzeService` (nuovo): `elencoDivergenze`, `togliFattoAlPin`.

### Rotte, schemi, DTO, OpenAPI
- `PUT /api/partite/:id/spilli/:spilloId` con `{ raccolto, infiltrazione? }`; `GET /api/partite/:id/divergenze?dungeon=`;
  `DELETE /api/partite/:id/divergenze/:spilloUid`; `GET /api/compendio/dungeon/:k?partita=&infiltrazione=`; `GET /api/compendio/dungeon/:k/copie`;
  `POST`/`PUT /api/compendio/schede/:id/voce` («Crea la voce» col tipo / «Collega a una voce»); `PUT /api/compendio/punti/:k` con `carattere`.
- DTO (`shared/types.ts`, `shared/organizzazioneMappe.ts`): campi nuovi facoltativi (`carattere`, `carattereScelto`, `oggetto`, `daVerificare`,
  `contestoInfiltrazione`, `statoProprio`, `completamento`, `schedeDaSistemare`, `DivergenzaDto`, `GruppoCopieDto`, `SchedaDaSistemareDto`,
  campi dei punti dei contenuti). **Per i Memento non si emettono**: le risposte restano identiche (verificato).
- OpenAPI: le rotte nuove e le descrizioni cambiate (punti, spilli, scheda, mappa, contenuti, correzione della voce).

## 2. Verifiche
- **Copia della produzione** (`prod-20261020`, migrata 106 → 111/22 su una copia nello scratchpad, `l4\prova-111-022.mts`): voci 959,
  `punto_partita` 525, `spillo_partita` 748, `spillo_voce` invariati riga per riga; `carattere` tutto NULL; conteggi per carattere identici
  a `dati.md` §1 (Kamoshida 71/47/49 + 2 Persona, Madarame 99/82/44, …); **4 divergenze**, tutte p1 Kamoshida: pin **583** (seme della
  bramosia), **615** (raccogli-forziere-3), **1992** e **1993** (sconfiggi i capitani delle guardie); i 4 pin con voce `storia` (1982, 1953,
  1970, 1971) non danno divergenza (stato proprio, come oggi); caso inverso 0; idempotente.
- **Stato visibile prima/dopo** (`l4\confronto-stati.mts`, la regola di prima ricalcolata contro `statoDellaVoce`/`statoDelPin`): p1 e p2,
  **0 voci e 0 pin diversi**; i 4 pin da verificare restano fatti.
- Su `data/` (3201, solo GET): Kamoshida p1 `completamento` 56/71, Tesoro sì, boss sì, **non completato** (le 15 permanenti non segnate,
  decisione dell'utente) — prima «Tesoro, boss finale e raccolto tutto (107/107)»; Kamoshida p2 completato (71/71); Madarame p1 80/80
  oggetti (99 voci permanenti, unite dai pin condivisi), manca il Tesoro come oggi (e il boss: Madarame non ha né voce né pin «boss»,
  come prima); Memento identici all'elenco salvato da Analisi dati (p1, p2); `raccolta` e `gestiti` invariati.
- Test: nuovi `shared/caratteriVoce.test.ts`, `shared/completamentoGuida.test.ts`, `111_…test.ts`, `022_…test.ts`,
  `server/routes/avanzamento-unico.test.ts` (8 casi: oggetti, contesto, racconto ed esaurito, carattere, divergenze e nessuna divergenza
  nuova dopo gesti misti, completamento, schede, copie; visto fallire disattivando la regola dell'oggetto). Allineati (attese, nessun test
  tolto): `guida-pin`, `enigmi-guida`, `palazzo-completato` (riscritto sulla regola nuova, stesse intenzioni), `dungeon`, `copia-voci-area`,
  `condizioni-voce`, `guida-modificabile`, `mappe-editor`, `organizzazioneMappe`. Insieme dell'area: **50 file / 445 test verdi**.
- `tsc -p tsconfig.server.json` e `eslint .` verdi. `tsc -b tsconfig.full.json`: 3 errori in `src/pages/DungeonDettaglioPage.test.tsx`
  (866-868), il test che FE sta riscrivendo (921 righe cambiate da FE, non da me): segnalato a FE.
- Tempi sul 3201: scheda di Kamoshida 43 ms, elenco dei Palazzi 15 ms, una planimetria 42 ms, contenuti 31 ms.

## 3. Scelte dove il progetto taceva (da valutare da Stesura)
1. **«Altro» resta senza stato** (`puntoDescrittivo` invariato): il §1.1 dice che `puntoDescrittivo` «passa a usare il modulo»; farlo
   toglierebbe lo stato alle «Storia», contro la decisione «le descrittive tengono il segno». Le «Storia» sono racconto (non contano, pin
   con stato proprio) ma si segnano come prima; «Altro» non si segna, come prima.
2. **I pin delle voci senza carattere** (dedali dei Memento, Persona dei Palazzi) restano con la regola di prima (segno del pin **o** voci
   tutte gestite, con i loro riallineamenti): così i Memento sono identici (R4-30).
3. **Un pin che resta senza voci che contano** (voce eliminata o scollegata) tiene lo stato che aveva: prima del distacco il suo segno
   diventa il suo stato calcolato (`fissaStatoDeiPinCheRestanoSenzaVoci`). Senza, un pin fatto dalla voce tornava «da fare» a vista.
4. **Contesto senza infiltrazione guardata quando tutte sono completate**: l'ultima infiltrazione.
5. **Togliere il segno da un pin «da verificare»** (`PUT …/spilli` con `raccolto: false`) vale anche come «Togli il fatto al pin».
6. **Enigma**: i passi contano come prima (tutti i passi con uno stato, «Storia» compresa); un passo permanente è fatto anche dal suo oggetto.
7. **«Esaurito» solo se esauribile** vale nei Palazzi; nei dedali dei Memento resta come prima (R4-30: un test dei dedali segna «esaurito»
   voci di Trama).
8. **Schede da sistemare**: due rotte non scritte nel §3.2 ma necessarie ai gesti del §4.3 — `POST /api/compendio/schede/:id/voce { tipo }`
   («Crea la voce»: nome e descrizione della scheda, in fondo alla sua infiltrazione) e `PUT … { voce }` («Collega a una voce», del suo
   Palazzo); la posizione della scheda diventa la posizione da collocare della voce. Nessuno stato si trasferisce.
9. **Copie**: due voci senza pin non sono copie (l'insieme dei pin dev'essere non vuoto), così «Oltrepassa le sbarre» resta fuori, come
   ha deciso l'utente.

## 4. Da sapere
- ~~Kamoshida p1 non risulta più completato~~ — **superato dal §8.10** (sotto, §5): Kamoshida p1 è **concluso** (Tesoro e boss finale), e
  ingressi, mappa di Tokyo e requisiti restano come prima; non è **completato** (anello 56/71).
- ~~Le righe `spillo_partita` dei pin con voci che contano non si leggono più~~ — **superato dal §8.11**: si leggono di nuovo (ogni pin
  tiene il suo stato); non si leggono solo quelle dei 40 pin condivisi dai rigenerabili (stato per infiltrazione).
- L3: l'interruttore `CASA_SCHEDA_PALAZZI` è tolto (lotti/L3/be.md §5).

## 5. Revisione di Stesura (modifiche.md §8, 2026-10-20) — implementata
Tutte le modifiche con Edit e Write; niente committato (L4 non si committa finché il PM non lo dice).

### 5.1 §8.10 — due livelli: «concluso» e «completato» (decisione dell'utente)
- `shared/completamentoGuida.ts`: `CompletamentoPalazzo` con `concluso` accanto a `completato`; `palazzoConcluso({ tesoro, boss })` (Tesoro
  **e** boss finale); `palazzoCompletato` = concluso **e** oggetti permanenti tutti fatti (senza oggetti no).
- `palazziService`: `StatoPalazzo { concluso, mancaPerConcludere, completato, manca, completamento }`; motivo «Tesoro e boss finale»
  (`MOTIVO_CONCLUSO`) e «Tesoro, boss finale e tutti gli oggetti permanenti (n/n)»; `palazziConclusi(partita)` accanto a `palazziCompletati`;
  Memento: i due livelli coincidono («boss finale segnato nella Guida», R4-30).
- Lettori degli effetti su **concluso**: `semaforiService` (`palazziCompletati` → `palazziConclusi`, `palazziMancanze` dal solo furto; testo
  «Palazzo di X: concluso (Tesoro e boss finale)» / «non risulta concluso — manca …»), quindi anche `disponibilitaService` («dopo il Palazzo
  di X», condizioni «Completare il Palazzo»), `mappeService.senzaIngressoAPalazzoCompletato` («concluso (Tesoro e boss finale), non ci si
  entra più»). DTO: `DungeonRiassuntoDto.concluso` (nuovo; null per i Memento e senza partita) — **FE**: la presenza sulla mappa di Tokyo
  (`MappaTokyo.tsx:406-407`) va su `d.concluso`, non più su `d.completato`.
- OpenAPI: elenco e scheda dei Palazzi.
- Test: `completamentoGuida.test.ts` (concluso; Kamoshida p1 concluso e non completato); `palazzo-completato.test.ts` allineato (testi dei
  due livelli; l'ingresso di Kaneshiro si chiude col solo Tesoro, prima della raccolta completa) e **3 casi nuovi**: Tesoro + boss con 15
  permanenti non segnate → concluso, non completato, requisito verde, ingresso chiuso, nessuna voce segnata al posto dell'utente; Tesoro
  senza boss → né concluso né completato; partita «Tutorial» col solo boss all'11/04 → Kamoshida visibile; `disponibilitaService.test.ts`,
  `mappe-editor.test.ts`, `avanzamento-unico.test.ts` (forma del DTO).

### 5.2 §8.11 — NR4-1, strada (a): ogni pin tiene il suo stato
- **Modello** (`statiGuida.ts`): `pinDellaVoce` (pin delle planimetrie, con uid) e `condivisi` (pin con rigenerabili di più infiltrazioni →
  quelle infiltrazioni) nel modello; `statiDellaPartita` legge anche `spillo_partita_infiltrazione` e calcola **`statoVoce`** per ogni voce:
  una permanente o rigenerabile con pin è **fatta** se lo sono tutti i suoi pin, **in corso k/N** se una parte, da fare se nessuno (una
  rigenerabile legge i pin condivisi nella sua infiltrazione; una permanente su un pin condiviso nell'infiltrazione del pin più vicina con la
  regola del §1.4, `infiltrazioneDelPinPerLaVoce`); le altre voci (senza pin, «Storia», dedali) da `punto_partita`. `voceFatta`,
  `statoDellaVoce` passano da lì. **Oggetto**: solo unità di conteggio, fatto quando lo sono tutte le sue voci.
  `statoDelPin` = il segno del pin (per i condivisi, la riga dell'infiltrazione di contesto); i pin dei dedali con la regola di prima.
- **Specchio**: `rifaiSpecchio(db, partita, voci|null, adesso, scelte?)` — la riga di `punto_partita` c'è se e solo se la voce è fatta, col
  tipo scelto dal gesto («esaurito»), quello che aveva, o «ottenuto»; gli Enigmi delle voci cambiate seguono. Restituisce le voci segnate e
  riaperte.
- **Gesti**: `segnaIlPin` (sul pin: solo quel pin, nel contesto se condiviso; le sue voci si ricalcolano; togliere il segno toglie «fatta»
  a ogni voce che lo contiene, «esaurito» compreso; su un pin «da verificare» vale come «Togli il fatto al pin», §8.5); `scriviStatoVoce`
  (sulla voce: «Segna»/«Esaurito» segnano tutti i suoi pin, «Riapri» li toglie; le altre voci di quei pin si ricalcolano). Le risposte
  portano `effetti: { segnate, riaperte }` (`PUT …/punti` e `PUT …/spilli/:id`). `togliIlFattoAlPin` ricalcola le voci del pin.
- **Riallineamento ai cambi dei legami**: `riallineaStati(db, mPrima, adesso)` (con il modello di prima del cambio) — (1) un pin che cambia
  forma (diventa condiviso, smette di esserlo, cambia infiltrazioni) porta il suo segno nella forma nuova, letto com'era; un'infiltrazione
  nuova del pin parte da fare (l'oggetto si ripropone; la copia «parte da fare», 2026-10-18); (2) un pin **nuovo** di una voce che era fatta
  prende il segno (come prima di L4: «un punto già segnato segna i suoi pin»; vale anche per il carattere cambiato a mano, così non si
  perde il segno, §6.3); (3) specchio rifatto in ogni partita, divergenze risolte tolte. Chiamato da: collega/scollega (guida e editor),
  `creaSpillo`/`aggiornaSpillo` con voce, `eliminaSpillo`, `eliminaMappa`, `importaMappe`, `staccaPunto` (elimina voce/area),
  `copiaPuntiInArea`, `spostaPuntiInArea`, `aggiornaPunto` (carattere, tipo, infiltrazione); senza modello di prima dopo il **cestino** e
  l'**import del pacchetto di gioco** (specchio con la stessa funzione). `fissaStatoDeiPinCheRestanoSenzaVoci` **tolta** (§8.3: il pin ha
  già il suo segno, non si scrive niente).
- **Schede della guida senza mappa** (strato di prima, assorbito nella voce): il loro gesto resta il gesto sulla voce, come prima.
- **DTO**: `PuntoInteresseDto.avanzamento` (k/N, null senza pin), `condivise` (le altre voci dei suoi pin, per «Riapre anche: …» e
  «Segnate anche: …» prima del gesto), `effetti`; `PinDelPuntoDto.fatto` (il segno di ogni pin letto per la voce); `VoceDelPinDto.avanzamento`;
  `SpilloDto.effetti`; `AvanzamentoVoceDto`, `VoceDelGestoDto`, `EffettiDelGestoDto`. OpenAPI: punti, spilli, divergenze, scheda, mappa.
- **Migrazione utente 023** `023_stato_del_pin_per_infiltrazione.ts` (**non nella 022 come scriveva il §8.11**: la 022 era già applicata a
  `data/` e le migrazioni sono append-only; la 022 resta com'è, con una nota): crea `utente.spillo_partita_infiltrazione` e la riempie
  (pin condiviso raccolto **e** voce rigenerabile dell'infiltrazione segnata); incoerenti contati nel log, nessuna riga scritta per loro;
  nessuna riga esistente toccata; idempotente. `RIFERIMENTI_PARTITE` (pin e infiltrazione) ed etichetta del cestino. Applicata a `data/`
  dal `tsx watch` alle 04:41Z: **40 pin condivisi, 90 righe, 0 incoerenti**.
- **Codice d'errore** di «Collega a una voce» allineato al §3.2: `voce-di-un-altro-palazzo` (era `voce-di-altro-palazzo`; nessun uso in FE).
  Nota per Stesura: la tabella del §3.2 scrive `PUT /api/compendio/schede/:id { voce }`; la rotta (be.md §3 punto 8, accolta) è
  `PUT /api/compendio/schede/:id/voce { voce }` — da correggere nella tabella.

### 5.3 Verifiche
- **Copia fresca della produzione 0440Z** (`l4\prova-8-11.mts`, migrata 106/21 → 111/23 su una copia nello scratchpad): righe di voci,
  `punto_partita`, `spillo_partita`, `spillo_voce` **invariate**; 023: **Madarame p1 90 righe**, p2 0, Kamoshida 0; 40 pin condivisi; 4
  divergenze (583, 615, 1992, 1993); **voci con più pin** p1: Kamoshida 31 fatte, 3 in corso (seme della bramosia 1/4, raccogli-forziere-3
  1/3, capitani delle guardie 2/4), 5 da fare; Madarame 50 fatte → **81/3/5**; p2: 39 fatte, 50 da fare → **39/0/50** (come dati.md §11.7);
  **specchio incoerente 0**; **voci con stato diverso da prima di L4: 0** (p1 e p2). Kamoshida p1: 56/71, Tesoro e boss → **concluso, non
  completato**; Kamoshida p2 concluso e completato (71/71); Madarame p1 82/82 oggetti, Tesoro (811 e 2300) e boss → concluso e completato;
  Madarame p2 nessuno dei due; Memento invariati.
- Su `data/` (3201, solo GET): Kamoshida p1 concluso «Tesoro e boss finale», completato null, 56/71; le 3 voci in corso con «Da verificare»;
  4 divergenze nella scheda.
- Test: nuovi `023_…test.ts`; in `avanzamento-unico.test.ts` 3 casi nuovi (le 8 «Installazioni»: 1/8 → «Segna» 8/8 → tolto un pin 7/8 e
  specchio via → eliminato il pin mancante 7/7 fatta; specchio coerente dopo cestino e import delle mappe; rigenerabile copiata in un'altra
  infiltrazione: il pin diventa condiviso, lì parte da fare) e i controlli «nessuno stato trasferito» delle schede (§8.8). Allineati alla
  regola nuova (attese, nessun test tolto, ognuno con il perché): `guida-pin` (5 casi riscritti: due voci su un pin, gesto sul pin k/N,
  togliere il segno, pin raccolto collegato, NR4-1 voce con due pin), `enigmi-guida` (2), `avanzamento-unico` (2), `copia-voci-area`,
  `condizioni-pin`, `mappe-editor`. Area: **38 file / 317 test verdi**, più `openapi` e `verifica-mappe` (27).
- `tsc -p tsconfig.server.json`, `tsc -p tsconfig.test.json` (lato server) ed `eslint server shared` verdi. Restano 3 errori di tipo nei test
  FE (`DungeonDettaglioPage.test.tsx`, `DungeonPage.test.tsx`: manca `concluso` nei dati di prova; `InfiltrazioniVoce.test.tsx:48`, non mio):
  segnalati a FE.

### 5.4 Scelte dove il §8 taceva
1. **Collegare un pin già segnato** a una voce i cui pin sono così tutti fatti la rende fatta, e un pin nuovo di una voce fatta prende il
   segno (il §3.3 diceva «collegare un pin raccolto non segna più la voce»: con lo stato sul pin la voce si calcola dai pin; così niente si
   perde a vista). Lo stesso per la copia di una voce sullo stesso pin (una permanente copiata su un pin segnato nasce fatta, con lo specchio).
2. **Una rigenerabile spostata** in un'altra infiltrazione su un pin condiviso: il pin cambia forma e il segno si riporta letto com'era in
   ogni infiltrazione (la voce spostata legge quello della sua infiltrazione nuova).
3. **Import del pacchetto di gioco**: lo specchio si rifà, ma senza il modello di prima un pin che cambia forma non riporta il segno (le righe
   per infiltrazione restano per uid e infiltrazione).
4. **Schede della guida senza mappa**: il loro gesto segna la voce come prima (non sono pin della voce: §2.3 le assorbe).

### 5.5 §8.14 (voce_boss_finale, AP4-2) e AP4-1…4
- **Migrazione 112** `112_voce_boss_finale.ts` (non nella 111 come scriveva il §8.14: la 111 era applicata ai dati di sviluppo; append-only):
  `dungeon.voce_boss_finale TEXT REFERENCES punto_interesse(chiave) ON DELETE SET NULL` e `dungeon.seed_json` (per «Ripristina»), con i
  valori di G-027 (Madarame = `…-scontro-con-madarame-2`, Iweleth nessuno). **Si ferma** se una voce di G-027 esiste ma non è `boss` del suo
  Palazzo. **Scelta**: una voce che **non esiste** lascia NULL e lo dice nel log, invece di fermarsi — i pacchetti di prima della copia del
  2026-10-20 (il pacchetto iniziale dei test, i dati di sviluppo di prima) non hanno le voci scritte dopo dall'utente («Sconfiggi Kamoshida»,
  «Scontro con Madarame»), e fermarsi lì bloccherebbe test e istanze. Idempotente (non tocca una voce già impostata).
  Su `data/`: 7 impostate, Madarame NULL (la copia di prima non ha la voce). Su 0440Z: tutte e 8.
- `palazziService`: **boss finale = la voce dichiarata fatta** (§8.11: dai suoi pin se ne ha), nessun altro pin `boss` conta; tolte
  `eBossFinale` e la regola dell'infiltrazione più alta/«unico» per i Palazzi (`bossFinali` resta solo per i Memento). Senza voce:
  «manca: il boss finale (nessuna voce di boss finale per questo Palazzo)». Tesoro: tutti i pin `tesoro-palazzo` (invariato).
  **Iweleth**: tipo `palazzo` con voce NULL → non si conclude (la regola del §8.14 per NULL); la nota «segue la regola dei Memento» è di L8 (D3),
  non applicata qui — da confermare con Stesura.
- **«Modifica › Boss finale»**: `PUT /api/compendio/dungeon/:k { voceBossFinale }` (una voce `boss` del Palazzo; 400 `voce-non-boss`,
  `voce-di-un-altro-palazzo`, `boss-finale-dei-memento`; 404 `punto-non-trovato`; il primo cambio conserva quella della guida in
  `seed_json`); **«Ripristina»**: `POST /api/compendio/dungeon/:k/ripristina` (409 `niente-da-ripristinare`). DTO:
  `DungeonRiassuntoDto.voceBossFinale { chiave, nome } | null` e `bossFinaleCorretto` (solo Palazzi). OpenAPI.
- **AP4-1**: `concluso` assente nella risposta dei Memento (riassunto e dettaglio), come `completamento`; `DungeonRiassuntoDto.concluso` facoltativo.
- **AP4-3**: `spillo_partita_infiltrazione` in `RIFERIMENTI_PARTITE` e nelle etichette del cestino (fatto in §5.2). **AP4-4**: test della 023.
- Test: `112_…test.ts` (G-027 presenti/mancanti, idempotenza, fermo su una voce non `boss`); `palazzo-completato.test.ts`: il pin «Boss» non
  collegato non conta (il caso del tutorial), Niijima: la prima fase non basta più, Madarame senza voce (NULL) → «nessuna voce di boss finale»,
  «Modifica › Boss finale» e «Ripristina» con i 400/409, **Madarame a due Tesori** (solo l'esca → Tesoro ✗) **e boss da 2/2 pin** → concluso;
  Kamoshida nel pacchetto dei test si dichiara con la rotta. Area: **42 file / 350 test verdi**; typecheck e lint puliti.
- **Copia 0440Z** con la 112: Kamoshida p1 concluso (56/71, non completato), p2 concluso e completato; **Madarame p1 concluso e completato
  (82/82 oggetti = 101/101 voci permanenti)**, p2 né l'uno né l'altro; 023 90 righe, k/N 81/3/5 e 39/0/50, specchio coerente, nessuna voce
  cambia stato.
- **Base di riferimento `p5s-0503Z`** (stesso script, `l4\copia-0503`): migrazioni fino a 112/23 pulite, righe invariate; 023 90 righe (Madarame
  p1); **0 divergenze** (la 022 non ne trova: Kamoshida chiuso dall'utente); p1: voci con più pin Kamoshida 39 fatte + Madarame 50 fatte =
  **89/89**, nessuna in corso; **Kamoshida p1 concluso e completato 71/71**, Madarame p1 concluso e completato 82/82; p2 come su 0440Z;
  specchio coerente; nessuna voce cambia stato rispetto a prima di L4. Il caso «concluso e non completato» resta provato sulle partite di prova
  dei test.

### 5.5-bis Commit e §8.15
- **b83c30ac** (L4, via del PM): tutto L4 fino al §8.14 e AP4-1…4, DECISIONI §8.13. Albero isolato: tsc server e full, eslint EXIT=0, 43 file /
  367 test (`esiti-be/01`, `02`).
- **71378325** (correzioni di L4): §8.15 punto 3 — `dungeon.regola_boss` nella **gioco 113** (non nella 112, già applicata e committata),
  Iweleth = `memento`: boss segnato nella Guida, `senzaEffetti` (fuori da `palazziConclusi` e dai semafori, `concluso` null nel riassunto),
  `regolaBoss` nel DTO, «Modifica › Boss finale» 400 `boss-finale-dei-memento`; punto 6 — `segniAggiunti` nelle risposte di collega e modifica
  della voce (solo le partite dove la voce era fatta; eliminando il pin il segno se ne va); **difetto mio** trovato nel controllo
  dell'inventario: `divergenza_partita` e `spillo_partita_infiltrazione` senza chiave verso `partita` (orfane all'eliminazione) → **utente 024**
  le ricostruisce con `ON DELETE CASCADE` (test visto rosso). Punto 2 — verifica sulla base p5s-0503Z: 8/8 voci del boss, Iweleth `memento`
  (`esiti-be/03`). Albero isolato: EXIT=0, 40 file / 319 test (`esiti-be/04`); area intera 51 file / 388 test.

### 5.6 L3 e L2 (stessa giornata)
- **L3** commit `2f9e6c7f` su newreview (solo L3, indice temporaneo): tolto `CASA_SCHEDA_PALAZZI` (FUN3-1) e **AP3-3** (spostare una mappa
  senza Area sotto un Palazzo → 409 `usa-aggiungi-area`; Memento esclusi; test visto rosso). Albero isolato: typecheck, lint, 99 test.
- **L3** commit `d1664295` (UX3-1: «Entra» sulla prima della proposta con l'insieme vuoto, campo assente senza proposta; `GET
  /api/compendio/percorso/voci/:uid`) e `12484305` (O3-1: l'export di un Palazzo porta anche le aree senza planimetrie e i loro legami). Test
  visti rossi, alberi isolati verdi.
- **L2 per il rilascio**: `lotti/L2/esiti-giro2/be/rilascio/` (00-LEGGIMI + 7 file, 10 modifiche testo vecchio → nuovo su 90137ce2),
  provate su una copia di 90137ce2: typecheck completo, lint, 116 test.
