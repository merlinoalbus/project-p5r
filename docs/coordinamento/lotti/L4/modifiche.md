# L4 «Avanzamento unico» — stesura delle modifiche

Autore: sessione «Stesura modifiche» (2026-10-20). Ingressi: `requisiti.md` (R4-01…R4-37, dubbi 1–9), `dati.md` (§1–§10), `app.md` (§0–§8,
segnalazioni A–E), decisioni dell'utente via PM (2026-10-20: **nessuna fusione**, «Oltrepassa le sbarre» compresa; gli **8 pin di Kamoshida
p1** fatti con la voce non segnata non si scrivono in automatico, la divergenza si conserva e si mostra «da verificare» finché l'utente non la
risolve; le **15 permanenti** non segnate di Kamoshida p1 restano non fatte; le **descrittive** tengono il segno e non contano), Esperto della
guida G-005 (nessun tipo «nemico» nel gioco; boss, miniboss, forzieri, Semi permanenti; Ombre sciagura rigenerabili con certezza bassa),
**L3** (aree del Palazzo, `infiltrazione_area`, scheda del Palazzo con infiltrazione e area). L4 si implementa dopo L3 (110): migrazione di gioco
**111**, migrazione delle partite col primo numero libero di `migrazioniUtente` (oggi **022**).

**Principio**: lo stato sta sulla **voce** (`punto_partita`, com'è oggi: nessuna riga riscritta); il pin non ha più uno stato suo quando
rappresenta voci da segnare: lo **calcola** dalle voci. Così voce e pin non possono divergere per costruzione, invece che per riallineamento.

## 0. Il modello in una tabella
| Oggetto | Dove sta lo stato | Regola di lettura | Regola di scrittura |
|---|---|---|---|
| Voce **permanente** (forziere, porta, scorciatoia, Safe Room, meccanismo, Enigma, Seme, boss, miniboss, …) | `punto_partita` della voce | fatta se è segnata **lei o una voce permanente dello stesso «oggetto»** (le voci permanenti unite da pin in comune, a catena: §1.3) | segnare scrive la sua riga; **riaprire** cancella le righe di tutto l'oggetto |
| Voce **rigenerabile** (oggetto, ombra-sciagura) | `punto_partita` della voce | fatta se è segnata lei. Ogni voce appartiene a **una** infiltrazione (dati §1): lo stato «per infiltrazione» **è già** lo stato della voce | solo la sua riga |
| Voce **descrittiva** (storia; altro fuori dai dedali) | `punto_partita` della voce (solo «Storia»: «Altro» fuori dai dedali non ha stato né pin, come oggi — scelta dell'utente del 2026-10-01, `shared/spilli.ts:299-310`) | «Storia» tiene il segno, **non conta**; «Altro» si legge e basta | come oggi |
| Pin con almeno una voce **non descrittiva** — **riga superata dal §8.11 (NR4-1): il pin tiene il suo stato e la voce lo calcola dai suoi pin** | **nessuno** (le righe `spillo_partita` restano ma non si leggono più, L11) | fatto quando sono fatte tutte le sue voci non descrittive; per le rigenerabili di più infiltrazioni, quella del **contesto** (§1.4) | segnare = segnare quelle voci; riaprire = riaprirle |
| Pin senza voci, o con sole voci descrittive | `spillo_partita` come oggi (stato proprio) | come oggi | come oggi |
| **Divergenza conservata** (gli 8 di Kamoshida p1) | tabella nuova `divergenza_partita` | il pin si mostra **fatto** con «Da verificare», la voce **non segnata** con «Da verificare» | sparisce solo con un gesto: «Segna la voce» o «Togli il fatto al pin» |
| Voci dei dedali dei Memento | come oggi | invariate (R4-30) | invariate |

## 1. Regole

### 1.1 Il carattere della voce: un posto solo (segnalazione E)
Nuovo `shared/caratteriVoce.ts`: `CARATTERI = ['permanente', 'rigenerabile', 'descrittiva'] as const`; `carattereDaTipo(tipo, areaDedalo)`:
- voci dei dedali (`areaDedalo` non nullo) e `persona` → `null` (Memento invariati; Persona dei Palazzi a L8);
- `oggetto`, `ombra-sciagura`, `nemico` (se un giorno nasce: G-005) → `rigenerabile`;
- `storia`, `altro` → `descrittiva` (non contano). `puntoDescrittivo` (`shared/spilli.ts:305-310`) **resta com'è** e continua a dire «senza
  stato né pin» del solo «Altro» fuori dai dedali: farlo derivare dal carattere toglierebbe lo stato alle «Storia» (correzione dopo la revisione
  della parte BE, §8.1);
- tutto il resto → `permanente` (forziere, forziere-chiuso, porta, scorciatoia, sicura, meccanismo, puzzle, volonta, boss, miniboss, …).
`NOME_CARATTERE` per l'interfaccia («Permanente», «Si ripropone», «Racconto»). Il carattere effettivo = `punto_interesse.carattere` se scelto
dall'utente, altrimenti la regola: una sola funzione `carattereDellaVoce(riga)` usata da server e interfaccia.

### 1.2 Schema
```sql
-- gioco.db, migrazione 111
ALTER TABLE punto_interesse ADD COLUMN carattere TEXT CHECK (carattere IN ('permanente', 'rigenerabile', 'descrittiva'));
-- NULL = vale la regola di `carattereDaTipo` (nessuna scelta dell'utente); un valore = scelta dell'utente («Ripristina» lo rimette a NULL)

-- partite.db, migrazione utente 022
CREATE TABLE utente.divergenza_partita (
  partita_id  INTEGER NOT NULL,
  spillo_uid  TEXT NOT NULL,
  voce_chiave TEXT NOT NULL,
  rilevata_il TEXT NOT NULL,
  PRIMARY KEY (partita_id, spillo_uid, voce_chiave)
);
```
- Il carattere **non si materializza** per tutte le voci (959 righe): resta NULL e lo dà la regola; così una correzione della regola vale per
  tutte le voci non scelte a mano, e «Ripristina» è banale. (R4-01: l'API lo restituisce sempre, già risolto.)
- `divergenza_partita` sta nel file delle partite (è dato di partita), senza chiavi esterne verso il file di gioco come le altre tabelle
  (`RIFERIMENTI_PARTITE`, `pacchettoGiocoService.ts:61-63`, va esteso: un pin o una voce che spariscono rendono orfana la riga, che si mostra
  e si pulisce come gli altri orfani).

### 1.3 L'«oggetto» permanente (R4-03, R4-18, R4-24)
L'oggetto di una voce permanente è la **componente connessa** del grafo voci permanenti ↔ pin (`spillo_voce`), dentro lo stesso Palazzo: due
voci permanenti sono lo stesso oggetto se condividono un pin, anche attraverso altre voci. Oggi: 17 pin di Madarame collegano voci permanenti
di infiltrazioni diverse (dati §6.0); Kamoshida nessuno. Funzione unica `oggettiPermanenti(dungeon)` in `server/services/mappe/statiGuida.ts`,
calcolata in blocco per richiesta (come `vociDiOgniPin`). Con questa regola il caso del piano vale senza fusioni: il forziere della 2 e la voce
della 4 sullo stesso pin sono un oggetto solo. Il conteggio conta **un oggetto una volta** (R4-24).

### 1.4 Il contesto dei rigenerabili (R4-05)
Un pin collegato a voci rigenerabili di più infiltrazioni (40 a Madarame, dati §5) mostra lo stato della voce dell'**infiltrazione di contesto**:
1. quella guardata (scheda del Palazzo con l'infiltrazione aperta; `?infiltrazione=` nel visore o nella risposta dell'API);
2. altrimenti l'**infiltrazione in corso** della partita (la prima non completata, la stessa regola di L3 §4.4);
3. fra le voci del pin: quella del contesto; se il pin non ne ha una in quell'infiltrazione, quella dell'infiltrazione più recente **prima**
   del contesto; se nemmeno, la prima per ordine.
Il popup e la scheda del pin dicono sempre a quale infiltrazione si riferisce lo stato («Raccolto nella 2ª infiltrazione»), R4-34.

### 1.5 Completamento: una funzione sola (segnalazioni A, B, D)
`shared/completamentoGuida.ts`, usata dal server (che manda i numeri) e dall'interfaccia (che non ricalcola più a modo suo:
`useMappaPartita.ts:101` e `completamentoAree.ts` la chiamano). Conta gli **oggetti permanenti** (§1.3), ciascuno una volta:
| Livello | Fatto quando | Senza niente da contare |
|---|---|---|
| Infiltrazione | tutti gli oggetti permanenti delle sue voci fatti | mai completata (regola del 2026-10-04 mantenuta, R4-22) |
| Area del Palazzo (L3) | tutti gli oggetti permanenti con un pin su una sua planimetria fatti | completata |
| Planimetria | come l'area, per la sola planimetria | completata (2026-10-11) |
| Palazzo **concluso** (decisione dell'utente del 2026-10-20, §8.10) | Tesoro **e** boss finale: governa ingressi, mappa di Tokyo, requisiti e condizioni «Completare il Palazzo» / «dopo il Palazzo di X» | non si conclude senza pin Tesoro (come oggi) |
| Palazzo **completato** | concluso **e** tutti gli oggetti permanenti fatti: vale **solo** per anello, percentuale e segno «Completato» | non si completa |
| Percentuale | oggetti permanenti fatti / oggetti permanenti | — |
- **Tesoro** (segnalazione B): il Tesoro è fatto quando è fatto il **pin `tesoro-palazzo`** con la regola del pin (§0: dalle sue voci se ne ha,
  altrimenti il suo stato) — non serve una voce Tesoro per ogni Palazzo; `palazziService.ts:121` passa dalla stessa funzione.
- **Boss finale**: `eBossFinale` (`palazziService.ts:83-88`) invariato.
- I rigenerabili e le descrittive non entrano (R4-21). Le voci `persona` (L8) non entrano (oggi Kamoshida 2/2).
- Lettori a valle che passano alla funzione (R4-25): `palazziService.valutaPalazzo`/`statoPalazzi` (117-156), `dungeonService.raccoltaMappe`
  (135-160: resta come elenco dei collezionabili di «Da raccogliere», con lo stato dalla regola del pin), `mappeService.senzaIngressoAPalazzoCompletato`
  (290-300), `palazzoDiIngresso` (171-177), `semaforiService.ts:84-86, 121-130`, `disponibilitaService.spilliSegnati` (157-161) e la condizione
  «Voce della guida» (281-291), `DungeonPage.tsx:47, 61, 78`, `MappaTokyo.tsx:396-397`, intestazione della scheda (`DungeonDettaglioPage.tsx:≈325,
  395-399, 439-441`).

### 1.6 «Esaurito» (R4-07, segnalazioni C)
Ammesso solo se la voce è `esauribile` (il server rifiuta altrimenti: 400 `voce-non-esauribile`); si propaga come «ottenuto» (oggetto permanente,
o voce rigenerabile). Togliere il segno da un pin **riapre** le sue voci, «esaurito» compreso, come ha scelto l'utente il 2026-10-09 (R4-11): ma
non lo fa più per sbaglio togliendo il segno a un pin che rappresenta solo **una parte** dell'oggetto (oggi `mappeService.ts:1376`): con la
regola del §0 il pin riapre l'oggetto intero, e l'interfaccia lo dice prima («Riapre anche: Forziere — 4ª infiltrazione»).

## 2. Migrazioni

### 2.1 Gioco 111 `111_carattere_delle_voci.ts`
1. `punto_interesse.carattere` (solo se manca), tutto NULL.
2. Nessun'altra scrittura. Log `info` con il conteggio per carattere (atteso dati §1: Kamoshida 71/47/49 + 2 persona; Madarame 99/82/44).
### 2.2 Partite 022 `022_divergenze_da_verificare.ts` (con `gioco.db` attaccato, come le altre migrazioni utente che leggono il gioco)
1. Crea `divergenza_partita`.
2. Inserisce, per ogni partita, i pin con almeno una voce **non descrittiva** e `spillo_partita.raccolto = 1` le cui voci non descrittive **non**
   sono tutte segnate (con la regola del §1.3) → **8 righe attese**, tutte p1 Kamoshida (dati §3: 1982, 615, 1953, 583, 1970, 1971, 1992, 1993;
   tre delle loro voci sono `storia` e quindi **non** generano divergenza con la regola nuova: il pin resta con il suo stato proprio — la tabella
   ne conterrà quindi **5** se le voci di 1982, 1953, 1970/1971 sono tutte descrittive; il test fissa il numero esatto sulla copia di produzione e
   l'elenco va in `noreg.md`). Nessuna riga di `punto_partita` né di `spillo_partita` cambia.
3. Caso inverso (voce segnata, pin con `raccolto = 0` esplicito): con la lettura di oggi (OR) quei pin risultano già fatti, e con la regola nuova
   pure (dalle voci): **nessun cambio visibile, nessuna riga**. Il test lo conferma contando i casi.
4. Idempotenza: `INSERT OR IGNORE`.
### 2.3 Le schede senza mappa (R4-19, R4-20; dati §7)
Nessuna scrittura: le **149** schede con riferimento a una voce esistente si **assorbono** nella voce per lettura (la voce è già la stessa cosa:
testo uguale in 147/149, le 2 di Madarame rinominate dall'utente — vince la voce). La posizione resta in `marcatore_mappa` (già indicizzata per
voce) come «posizione da collocare» finché la voce non ha un pin. Le **5** senza riferimento (Kamoshida 1, 14, 15, 16; Madarame 28) vanno in un
elenco da approvare (§7.5) e nella sezione «Schede da sistemare» della scheda del Palazzo (§4.3). Le righe `spillo` delle schede non si cancellano
(L11), ma nessuna vista le legge come elementi a sé: `contenutiGuidaService.contenutiMappa` (51-67), `mappeService.schedeContenutiGuida`
(408-414), `elementoSpilloDto` (401-403), `ContenutiGuidaMappa.tsx`, `SchedaContenutoGuida.tsx`.
### 2.4 Verifiche prima/dopo
| Misura | Atteso |
|---|---|
| `punto_interesse` | 959 righe invariate (testo, ordine, uid, tipo, dettagli); `carattere` tutto NULL |
| `punto_partita` / `spillo_partita` / `spillo_voce` | 525 / 410+338 / invariati riga per riga |
| `divergenza_partita` | il numero esatto misurato sulla copia (≤ 8), tutte p1 Kamoshida, elencate |
| impronta `impronta.cjs` | **identica** (`1a71b030…bc4c`) |
| stato **visibile** delle voci, p1 e p2, voce per voce | identico (nessuna voce segnata o riaperta: R4-27) |
| stato visibile dei pin, p1 e p2, pin per pin | identico, salvo i pin «da verificare» (stesso stato, più l'avviso) e i pin di sole descrittive (stato proprio, come oggi) |
| oggetti permanenti con stato misto (una voce segnata, un'altra dello stesso oggetto no) | contati: atteso **0** (Madarame p1 tutti segnati, p2 nessuno); se >0, elenco «da verificare» come le divergenze, nessuna scrittura |
| completamenti | Kamoshida p2 completato; Madarame p1 manca il Tesoro (pin 811) come oggi; **Kamoshida p1 non completato** (15 permanenti non segnate: decisione dell'utente), differenze di percentuale spiegate voce per voce in `noreg.md` |
| Memento | stati, timbri, Richieste, catture identici |

## 3. API e DTO

### 3.1 DTO (`shared/types.ts`)
- `PuntoInteresseDto` (1762-1789): `carattere: 'permanente' | 'rigenerabile' | 'descrittiva' | null` (risolto), `carattereScelto: boolean`,
  `oggetto: string | null` (chiave stabile dell'oggetto permanente: la chiave minima delle sue voci; null se è da sola), `daVerificare: boolean`
  (per la partita), `statoInfiltrazione` resta lo `stato` di oggi (per le rigenerabili è già quello della sua infiltrazione).
- `SpilloDto` (2123-2168): `raccolto` = regola del §0 (non più l'OR); `contestoInfiltrazione: { chiave: string; nome: string } | null` (per i pin
  di rigenerabili), `daVerificare: boolean`, `statoProprio: boolean` (pin senza voci o di sole descrittive).
- `VoceDelPinDto` (2081): `carattere`, `infiltrazione` (chiave e nome), `daVerificare`.
- `DungeonRiassuntoDto` (1867-1899) e `DungeonDettaglioDto`: `completamento: { oggetti: number; fatti: number | null; tesoro: boolean | null;
  boss: boolean | null; completato: boolean | null }` (la funzione unica); `raccolta` resta (elenco dei collezionabili) con lo stato del pin
  nuovo; `daVerificare: number` (per la partita).
- `AreaDungeonDto` (1801): `completamento: { oggetti, fatti, completata }`; `AreaRiassuntoDto` (aree del Palazzo, L3): idem.
- `DivergenzaDto` (nuovo): `{ spillo: number; spilloNome: string; mappa: string; voce: string; voceNome: string; infiltrazione: string }`.

### 3.2 Rotte
| Metodo e percorso | Effetto |
|---|---|
| `PUT /api/partite/:id/punti` (esistente, `partite.ts:159-162`) | segna/riapre la voce con le regole del §0 (oggetto per le permanenti); `esaurito` solo se esauribile; toglie le righe di `divergenza_partita` dei pin della voce («Segna la voce» è il gesto che risolve) |
| `PUT /api/partite/:id/spilli/:spilloId` (esistente, `partite.ts:181-184`) | pin con voci non descrittive: segna/riapre **quelle voci** (rigenerabili: solo quella del contesto, passato in `{ infiltrazione? }` nel corpo); pin senza voci o di sole descrittive: `spillo_partita` come oggi |
| `DELETE /api/partite/:id/divergenze/:spilloUid` (nuova) | «Togli il fatto al pin»: cancella `spillo_partita.raccolto` del pin e la riga di divergenza; la voce resta com'è |
| `GET /api/partite/:id/divergenze?dungeon=` (nuova) | `DivergenzaDto[]` |
| `PUT /api/compendio/punti/:k` (esistente) | campo `carattere` (`null` = «Ripristina regola»); nessun dato di stato riscritto (§1.2: cambia solo la propagazione, R4-08) |
| `GET /api/mappe/:chiave?partita=&infiltrazione=`, `GET /api/compendio/dungeon/:k?partita=&infiltrazione=` | il contesto del §1.4 |
| `POST /api/compendio/schede/:id/voce` `{ tipo }` (nuova, §8.8) | «Crea la voce» da una scheda da sistemare: nome e descrizione della scheda, in fondo alla sua infiltrazione; la posizione della scheda diventa la posizione da collocare della voce; nessuno stato trasferito |
| `PUT /api/compendio/schede/:id/voce` `{ voce }` (nuova, §8.8; percorso come implementato da BE) | «Collega a una voce» del suo Palazzo (400 `voce-di-un-altro-palazzo` altrimenti); stessa posizione da collocare; nessuno stato trasferito |
| `GET /api/compendio/dungeon/:k/copie` (nuova, sola lettura) | i gruppi di copie secondo la regola dell'utente (R4-15: stesso testo, stessi pin, stessa infiltrazione); oggi vuoto (0 a Madarame; «Oltrepassa le sbarre» esclusa per decisione dell'utente). Nessuna azione di fusione in L4 (§7.2) |

### 3.3 Servizi (BE)
- `shared/caratteriVoce.ts`, `shared/completamentoGuida.ts` (nuovi; quest'ultimo con le funzioni pure sui conteggi).
- `server/services/mappe/statiGuida.ts`: `oggettiPermanenti`, `statoDelPin(pin, contesto)`, `scriviStatoVoce` (74-79) con l'oggetto,
  `riapriOggetto`; spariscono `allineaRaccoltoDelPin` (31-39) e i riallineamenti di `collegamentiGuida.allineaStatiPunto` (64-82) /
  `allineaPinScollegato` (88-91): **non c'è più niente da allineare** (lo stato del pin si calcola). Restano gli Enigmi (`allineaEnigma*` 82-106,
  `segnaPassiDellEnigma` 113-119): l'Enigma è permanente e fatto quando lo sono i suoi passi (R4-13).
- `server/services/mappe/voceDelPin.ts` (20-84): `vociGestite`, `fattoPerVoci`, `uidFattiPerVoci` con il carattere e l'oggetto; via l'OR con
  `spillo_partita.raccolto` nei quattro lettori (app.md §0.2): `mappeService.dettagliSpillo` (360-364), `dungeonService.raccoltaMappe` (146),
  `disponibilitaService.spilliSegnati` (157-161), `palazziService.valutaPalazzo` (119).
- `mappeService.impostaRaccolto` (1333-1390) riscritta sul §3.2; `eliminaSpillo` (1321-1330), `importaMappe` (1774-1788, 1882-1891): nessun
  ricalcolo necessario (stato calcolato); pulizia di `divergenza_partita` per i pin tolti.
- `dungeonService.impostaStatoPunto` (350-375), `collegaPinAlPunto` (1005-1034: collegare un pin raccolto **non** segna più la voce in ogni
  partita: il pin non ha stato da trasferire; R4-12), `copiaPuntiInArea` (865-899: la copia nasce senza stato **e** il pin non torna «da fare»,
  perché il pin di una voce permanente segue l'oggetto e la copia — permanente sullo stesso pin — entra nell'oggetto; R4-12), `aggiornaPunto`
  (902-959: `carattere`; «esaurito» che non vale più perché `esauribile` diventa falso → resta come «ottenuto», dichiarato), `eliminaPunto`.
- `cestinoService`: il ripristino di voci e pin non ha più niente da riallineare (R4-32); `divergenza_partita` è una tabella delle partite e il
  cestino la registra come le altre.
- `palazziService.ts` (117-156), `semaforiService.ts`, `disponibilitaService.ts`, `mappeService.senzaIngressoAPalazzoCompletato` sulla funzione unica.
- `contenutiGuidaService.ts`, `mappeService.schedeContenutiGuida`: schede senza mappa assorbite (§2.3).

## 4. Interfaccia

### 4.1 La voce (`GuidaDellArea.tsx`, riga 263-295)
- Chip del carattere accanto al tipo: «Permanente» (icona lucchetto aperto/chiuso), «Si ripropone» (icona ciclo) con «in quest'infiltrazione»,
  «Racconto» per le descrittive (segnabili come «Letto», che non conta). Colori dai token esistenti.
- **«Esaurito»** visibile (segnalazione C, R4-34): chip proprio (non più solo « · esaurito» nel testo, 267) e opacità diversa da «ottenuto».
- Voce permanente che fa parte di un oggetto con voci di altre infiltrazioni: riga sotto «Anche nella 4ª infiltrazione» (link).
- **«Da verificare»** (R4-14b): chip ambra sulla voce e sul pin; il tocco apre la finestra «Da verificare» con il pin, la voce, cosa vuol dire
  («Il pin risulta fatto ma la voce no: era così prima dell'aggiornamento») e due pulsanti: **«Segna la voce»** e **«Togli il fatto al pin»**.
- Modifica della voce: selettore «Carattere» (Permanente / Si ripropone / Racconto) con «Ripristina» al valore della regola.
### 4.2 Il pin (visore, `VisoreMappa.tsx`: popup 864-911, scheda 1106-1158, azioni 1052-1088)
- Pin di più voci: una riga per voce con carattere, infiltrazione e stato (oggi A5/A6); pin di rigenerabili: «Stato nella 2ª infiltrazione»
  (contesto) con il selettore dell'infiltrazione se il pin ne ha più d'una.
- Un solo gesto per segnare dal pin (`AzioniStato` vale anche per i pin con voci: segna le voci, §3.2) e riaprire («Riapre anche: …» quando
  l'oggetto ha voci in altre infiltrazioni).
- Pin «da verificare»: anello ambra sull'icona e la stessa finestra del §4.1.
### 4.3 La scheda del Palazzo (L3)
- Intestazione: anello e percentuale dalla funzione unica (oggetti permanenti); «N da verificare» (link alla sezione); «Tesoro ✓/✗ · Boss ✓/✗».
- «Da raccogliere» (`RaccoltaPlanimetrie`): stesso elenco dei collezionabili, stato del pin nuovo, conteggio «permanenti fatti».
- Sezione richiudibile **«Da verificare (N)»** (sotto «Da raccogliere»): elenco delle divergenze con i due gesti.
- Sezione richiudibile **«Schede da sistemare (N)»** (le 5 senza riferimento): «Crea la voce» / «Collega a una voce», mai «Elimina» senza cestino.
- ✓ delle aree e delle infiltrazioni dalla funzione unica.
### 4.4 Altre viste
`DungeonPage.tsx` (47, 61, 78), `MappaTokyo` (presenza del Palazzo completato), `ContenutiGuidaMappa`/`SchedaContenutoGuida` (le schede assorbite
mostrano la voce), `useMappaPartita.ts` (92-108: niente più ricalcolo locale del raccolto, segnalazione D).
### 4.5 Testi
«Permanente» · «Si ripropone» · «Racconto» · «Letto» · «Esaurito» · «Anche nella Nª infiltrazione» · «Stato nella Nª infiltrazione» ·
«Riapre anche: …» · «Da verificare» · «Il pin risulta fatto ma la voce no: era così prima dell'aggiornamento» · «Segna la voce» · «Togli il fatto
al pin» · «Schede da sistemare» · «Crea la voce» · «Collega a una voce» · «Carattere» · «Ripristina» · «Tesoro» · «Boss». Vocabolario L0;
«Semi della Bramosia» a Kamoshida (G-005, nota di vocabolario).

## 5. File e ordine (senza sovrapposizioni)
**BE**: 1. `shared/caratteriVoce.ts`, `shared/completamentoGuida.ts` (+ test), `shared/spilli.ts` (305-310 sul modulo nuovo), `shared/types.ts`
(§3.1); 2. migrazione gioco 111 e utente 022 (+ test, `index.ts` delle due sequenze, `RIFERIMENTI_PARTITE`); 3. servizi del §3.3; 4. schemi
(`guidaDungeon.ts`: `carattere` in `bodyPunto` 36-57; corpo dello stato del pin con `infiltrazione`), rotte (`partite.ts`, `compendio.ts`);
5. OpenAPI; 6. test BE; typecheck, lint.
**FE** (dopo i DTO): 1. `src/utils/completamentoAree.ts` (sulla funzione condivisa), `src/utils/dungeon.ts` (7, 14: carattere e nomi);
2. `src/components/guida/GuidaDellArea.tsx`, `FinestraDaVerificare.tsx` (nuova), `RaccoltaPlanimetrie.tsx`, sezioni «Da verificare» e «Schede da
sistemare» in `DungeonDettaglioPage.tsx` e nel componente delle aree di L3; 3. `src/components/mappe/VisoreMappa.tsx`, `ContenutiGuidaMappa.tsx`,
`SchedaContenutoGuida.tsx`; `src/hooks/useMappaPartita.ts`; `src/pages/DungeonPage.tsx`; 4. stili; 5. test FE; typecheck, lint.

## 6. Piano dei test
### 6.1 BE (mirati)
1. `carattereDaTipo` e `carattereDellaVoce` per tutti i tipi (dati §1), dedali e persona null.
2. Oggetti permanenti: componente di Madarame con voci di più infiltrazioni sullo stesso pin; segnare nella 2 → fatta nella 4; riaprire nella 4
   → riaperta anche nella 2 (R4-03, R4-06, R4-18); due voci con lo stesso testo su pin diversi restano indipendenti (R4-15b).
3. Rigenerabili: oggetto raccolto nella 2 si ripropone nella 4 (voce della 4 da fare); il pin condiviso mostra lo stato del contesto (§1.4), con e
   senza `?infiltrazione=` (R4-04, R4-05).
4. Pin: fatto ⇔ voci non descrittive fatte; pin di sole descrittive con stato proprio; pin misto descrittiva+permanente e permanente+rigenerabile
   (i 3 casi di Madarame, dati §4); «esaurito» solo se esauribile; togliere il segno riapre l'oggetto (R4-07, R4-11).
5. **Nessuna divergenza nuova** (R4-14): una sequenza di gesti misti (segna voce, segna pin, collega, scollega, copia, sposta, elimina, cestino,
   importa il pacchetto, correggi il carattere) su una partita di prova, poi il controllo dei dati: 0 divergenze oltre `divergenza_partita`.
6. Divergenze conservate: migrazione 022 sulla copia (numero ed elenco esatti); «Segna la voce» e «Togli il fatto al pin» le chiudono; nessun'altra
   scrittura automatica (R4-09, R4-14b).
7. Completamento: Kamoshida p2 completato; Madarame p1 manca il Tesoro (pin 811); Kamoshida p1 non completato per le 15 permanenti; una partita di
   prova che segna tutti i permanenti, il tesoro e il boss senza rigenerabili → completato (R4-23); un oggetto contato una volta (R4-24); lettori a
   valle (MappaTokyo, ingressi bloccati, semafori, condizioni «Voce della guida» e «Pin di una mappa») con la regola nuova (R4-25).
8. Schede senza mappa: 149 assorbite (la voce porta la posizione del marcatore), 5 nell'elenco; nessuna API le restituisce come elementi a sé.
9. Migrazioni 111 e 022: conteggi del §2.4, idempotenza, impronta identica.
10. `GET /copie` vuoto su Madarame; con dati costruiti apposta trova solo i gruppi della regola (R4-15).
11. Test esistenti da allineare (attese, non cancellati; app.md §6): `guida-pin.test.ts` (in particolare 470-602), `condizioni-voce.test.ts`,
    `condizioni-pin.test.ts` (117), `palazzo-completato.test.ts`, `enigmi-guida.test.ts`, `copia-voci-area.test.ts`, `sposta-voce-area.test.ts`,
    `cestino.test.ts`, `aree-eliminabili.test.ts`, `guida-modificabile.test.ts:55`, `mappe-editor.test.ts:174`, `verifica-mappe.test.ts:133`,
    `dungeon.test.ts:73`, `aree-dei-dedali.test.ts` (invariato: Memento), `planimetrie-palazzo.test.ts:64`, `sulla-mappa-palazzo.test.ts:32`,
    migrazioni 094/095/098 e utente 017/019, `cestinoService.test.ts`, `disponibilitaService.test.ts`, `shared/condizioniSpillo.test.ts:113-160`,
    `shared/spilli.test.ts:65-111`.
### 6.2 FE (mirati)
`GuidaDellArea.test.tsx` (chip del carattere, «Esaurito», «Anche nella…», «Da verificare»), `FinestraDaVerificare.test.tsx` (nuovo),
`VisoreMappa.test.tsx` (46, 85, 131, 707-813: popup con carattere e contesto; segnare dal pin con voci), `useMappaPartita.test.tsx` (niente
ricalcolo locale), `DungeonDettaglioPage.test.tsx` (76, 173, 198-254, 401, 417, 869-1002: completamento dalla funzione unica, sezioni nuove),
`RaccoltaPlanimetrie.test.tsx`, `completamentoAree.test.ts`, `SchedaContenutoGuida.test.tsx`, `ContenutiGuidaAccesso.test.tsx`,
`SchedaSpilloStato.test.tsx`, `MappaTokyo.test.tsx:37`.
### 6.3 Funzionali
Ogni R4 con una **partita di prova** (creata e poi rimossa): forziere permanente su pin condiviso segnato nella 2 → aperto nella 4; oggetto raccolto
nella 2 → da fare nella 4; 100% di un Palazzo con soli permanenti, tesoro e boss; segnare e togliere da guida, visore e «Da raccogliere»; collegare
e copiare non riaprono niente; il carattere cambiato a mano non perde segni. Le 8 di Kamoshida p1 (sulla copia della partita reale): visibili «da
verificare», risolte da entrambi i gesti e poi ripristinate dal confronto (memoria «Prove sui dati reali»: mai sulla partita reale senza copia).
### 6.4 UX
Dal tablet in infiltrazione (R4-35): segnare dal pin o dalla voce è un tocco; si capisce se una voce è permanente o si ripropone e a quale
infiltrazione si riferisce lo stato (R4-34); «Da verificare» spiegato senza gergo; «Esaurito» riconoscibile.
### 6.5 No-reg
Impronta identica; stato visibile di **ogni voce** (p1, p2) identico; stato di **ogni pin** identico salvo gli avvisi; elenco delle differenze di
percentuale e completamento di Kamoshida e Madarame, voce per voce (R4-28); Memento identici (R4-30); diario invariato (R4-31); cestino che rimette
voci e pin con il loro stato (R4-32).
### 6.6 Layout
Scheda del Palazzo con le sezioni nuove, popup del pin con più voci e carattere, finestra «Da verificare»: 1280, 768, 375, 1366×657 e 1280×689
(scheda in una schermata con visore visibile, R4-37), 1024×690; bersagli ≥44 px; nessuno scorrimento orizzontale.

## 7. Da approvare (scelta prudente applicata)
1. **Ombre sciagura rigenerabili** (D4; G-005 certezza bassa): applicato, modificabile voce per voce.
2. **Nessuna fusione** (decisione dell'utente): in L4 c'è solo il rilevatore delle copie secondo la regola dell'utente (oggi vuoto); la finestra di
   fusione e lo «separa» (R4-16, R4-17, R4-36) si fanno quando un caso esiste e l'utente lo chiede.
3. **Propagazione dei permanenti attraverso i pin condivisi** («oggetto», §1.3): realizza R4-03/R4-18 senza fusioni (dati §6.0); due voci
   permanenti sullo stesso pin diventano un oggetto anche se descrivono gesti diversi sullo stesso posto: se l'utente non lo vuole, la voce si
   rende «Racconto» o si scollega dal pin.
4. **Contesto dei rigenerabili senza infiltrazione guardata** = infiltrazione in corso della partita (§1.4).
5. **Divergenze**: tabella dedicata nel file delle partite; il numero esatto (≤ 8) dipende da quante delle 8 voci sono descrittive (3 sono
   `storia`: per quei pin il pin ha uno stato proprio e non c'è divergenza da mostrare); elenco in `noreg.md`.
6. **Schede senza mappa senza riferimento** (5): elenco con i due gesti; nessuna creazione automatica di voci.
7. **Carattere non materializzato** (NULL = regola): una correzione della regola vale per tutte le voci non scelte a mano.

## 8. Revisione della parte BE (2026-10-20)
Richiesta del PM: valutare le 9 scelte di `lotti/L4/be.md` §3 (punti dove il progetto taceva) e il completamento di Kamoshida p1. Esito per
punto, confrontato con questo progetto e con `requisiti.md`.
1. **«Altro» resta senza stato** (`puntoDescrittivo` invariato) — **coerente, accolta; corregge il progetto.** Il §1.1 diceva che
   `puntoDescrittivo` «passa a usare questo modulo»: avrebbe tolto lo stato alle «Storia», contro R4-02 («le descrittive tengono il loro segno»)
   e contro la scelta dell'utente del 2026-10-01 («altro niente pin»). Corretti §0 e §1.1: «Storia» tiene il segno e non conta; «Altro» fuori dai
   dedali non ha stato né pin (R4-02 per «Altro» non ha un segno da tenere).
2. **Voci senza carattere** (dedali dei Memento, Persona dei Palazzi) con la regola di prima — **coerente** con §1.1 (`null`), §0 ultima riga
   e R4-30 (Memento identici). Accolta.
3. **Un pin che resta senza voci che contano tiene lo stato che aveva** (`fissaStatoDeiPinCheRestanoSenzaVoci`) — **coerente**, accolta: è la
   regola «nessun lavoro dell'utente perso» (R4-27/R4-29) applicata al caso che il §0 non copriva (il pin passa dalla riga «stato calcolato» alla
   riga «stato proprio»). Condizioni: si scrive solo nel gesto che stacca o elimina l'ultima voce che conta, solo per le partite in cui lo stato
   calcolato è «fatto», e il cestino che rimette la voce toglie la riga scritta così (il pin torna a calcolare); test sui tre casi (scollega,
   elimina voce, cambio di carattere a «Racconto»).
4. **Contesto quando tutte le infiltrazioni sono completate = l'ultima** — **coerente** con L3 §4.4 (`infiltrazioneDaAprire`: «se sono tutte
   completate, l'ultima»). Accolta; completa il §1.4 punto 2.
5. **Togliere il segno a un pin «da verificare» vale come «Togli il fatto al pin»** — **coerente** col §0 (la divergenza sparisce con uno dei due
   gesti) e R4-14b. Accolta, con la condizione che la finestra «Da verificare» resti il punto dove il gesto si spiega: il tocco diretto sul pin
   chiede conferma con lo stesso testo («Il pin risulta fatto ma la voce no…»).
6. **Enigma**: i passi contano come prima (tutti i passi con stato, «Storia» compresa); un passo permanente è fatto anche dal suo oggetto —
   **coerente** con §3.3 (R4-13) e §1.3. Accolta. Precisazione: i passi «Storia» contano per l'**Enigma**, non per il completamento (R4-21).
   **O4-2 (Test funzionali, 2026-10-20), valutato: coerente, nessun cambio.** L'Enigma è una voce **permanente** e conta come tale; i suoi passi,
   di qualunque carattere (rigenerabile e «Storia» compresi), dicono solo se è risolto (R4-13: «fatto quando i suoi passi lo sono, togliere un
   passo lo riapre»). R4-21/R4-23 non sono violati: un rigenerabile non conta **da solo** nel completamento; conta l'Enigma, e per segnarlo
   basta il gesto sull'Enigma, che segna i suoi passi (anche quello rigenerabile). Quindi «tutti i permanenti segnati, rigenerabili lasciati» dà il
   100%, come chiede R4-23. Il caso di O4-2 (tolto **dopo** il passo «sconfiggi i nemici» di «Ogni libro al suo posto» → Enigma riaperto, 70/71)
   è proprio il «togliere un passo lo riapre» di R4-13. È coerente anche col gioco: l'Enigma si risolve facendo tutti i passi; il passo
   rigenerabile appartiene alla sua infiltrazione (§1.4) e non si azzera da solo nelle infiltrazioni successive, quindi un Enigma risolto non si
   riapre per il ricomparire delle Ombre. Aggiunta di interfaccia: togliere il segno a un passo di un Enigma risolto chiede conferma con
   «Riapre anche l'Enigma «Ogni libro al suo posto»» (stessa finestra del §1.6), così la riapertura non arriva di sorpresa. Test FE: la conferma
   compare solo se l'Enigma era risolto. **Rivisto sulla copia 0440Z** (richiesta del PM): Kamoshida è invariato (Analisi dati §11.7) e le
   voci nuove di Madarame sono due `boss`, nessun Enigma: l'esito di O4-2 non cambia.
7. **«Esaurito» solo se esauribile nei Palazzi; nei dedali come prima** — **coerente** con §1.6 e R4-30. Accolta.
8. **Due rotte per le schede da sistemare** (`POST …/schede/:id/voce`, `PUT …/schede/:id { voce }`) — **necessarie** ai gesti del §4.3 che il
   §3.2 non elencava (mia omissione). Accolte e aggiunte al §3.2, con documentazione OpenAPI e test (crea, collega, voce di un altro Palazzo →
   400, nessuno stato trasferito).
9. **Copie solo con insieme di pin non vuoto** — **coerente** con la decisione dell'utente (dubbio 8: «Oltrepassa le sbarre» resta due voci).
   Accolta.

### 8.10 Completamento di Kamoshida p1 (punto critico) — **DECISO dall'utente il 2026-10-20: strada (B), due livelli**
> **Aggiornamento (PM, 2026-10-20):** l'utente ha segnato in produzione le voci di Kamoshida, che ora è al 100%. Le regole non cambiano: due
> livelli (§8.10), boss finale dichiarato (§8.14), ogni pin col suo stato (§8.11), e la «1 B» resta valida anche se non serve più. Sulla prossima
> copia del Collaudo, Kamoshida p1 sarà **concluso e completato**. Le cifre di questo paragrafo, del §8.11 punto 10 e i casi di prova vanno
> rimisurati da Analisi dati: le divergenze, le voci «in corso» (probabilmente 0) e il k/N di p1. **I casi «Kamoshida 56/71» non si tolgono**:
> diventano casi su una **partita di prova** che riproduce lo stato di prima, cioè Tesoro e boss fatti con 15 permanenti non segnate, e deve
> risultare concluso e non completato con i requisiti verdi (R4-14b, R4-22). Cifre definitive qui sotto quando arrivano.
> Criteri allineati con Analisi requisiti:
> - R4-22 e R4-25: la partita di prova è conclusa, non completata, senza ingresso né cartellino, con i requisiti verdi e l'anello k/N senza
>   «Completato»; la partita 1 reale è conclusa e completata;
> - R4-14b: se le 4 divergenze non ci sono più, si costruisce una divergenza sulla partita di prova (uno dei pin 583, 615, 1992 o 1993) e si
>   provano i due gesti; sulla partita 1 reale si verifica solo che non nascano divergenze e che non si scrivano segni;
> - R4-27: la «1 B» resta come regola (nessun segno scritto in migrazione), verificata sulla copia di riferimento in uso.
>
> **Cifre definitive sulla base `p5s-2026-10-20-0503Z`** (Analisi dati, `dati.md` §11.8; **valgono da qui**, al posto di quelle della copia
> 0440Z e delle 00:08 nei §8.10–8.12 e §8.11 punto 10):
> - **Kamoshida p1**: 169/169 voci segnate, 71/71 permanenti → **concluso e completato**; voci «in corso» **0** (prima 3).
> - **Divergenze** (`divergenza_partita` con la regola della 022): **0** righe. Le 4 di prima (583, 615, 1992, 1993) non ci sono più, e
>   nemmeno le 8 del §3 e le 15 permanenti non segnate; R4-14b si prova sulla partita di prova.
> - **k/N** (89 voci permanenti e rigenerabili):
>   - p1 **89 · 0 · 0** (fatte · in corso · da fare); p2 39 · 0 · 50;
>   - con le descrittive a più pin: p1 308/308 pin e 113/113 voci; p2 161/308 e 57/113.
> - Invariati: 90 righe di `spillo_partita_infiltrazione` in p1 (0 in p2, 0 anomalie), 40 pin condivisi (tutti di Madarame), Madarame
>   (p1 concluso e completato).
> - Forzieri di Kamoshida p1 (L7): 21 presi, 0 «non più ottenibili».
> - **Impronta di riferimento** `impronta-0503Z.json` (sha256 `ff3033cb…d97f`): diario 255, spunte 342 e Madarame identici a 0440Z;
>   Kamoshida statiVoci 302 → 338 e statiPin 472 → 517, per il lavoro dell'utente.
> - Test di no-reg su p1: **nessuna divergenza nuova e nessun segno scritto**; il resto sulla partita di prova.
Decisione (via PM, `decisioni-pm.md`, presa dall'utente dopo aver visto gli effetti): **«concluso»** (Tesoro + boss finale) governa ingressi,
mappa di Tokyo e requisiti; **«completato»** (concluso + tutti gli oggetti permanenti) vale solo per l'anello e la percentuale. Sostituisce, per
gli effetti, la regola del 2026-10-04; la «1 B» resta (le 15 voci non si segnano). Kamoshida p1: **concluso**, anello 56/71. Il progetto di
dettaglio è la strada (B) qui sotto, ora **da implementare** (non più alternativa); la (A) decade. §1.5 aggiornato.
Fatto: con la funzione unica Kamoshida p1 è **non completato** (56/71: le 15 permanenti non segnate, decisione «1 B»). Per la decisione
dell'utente del 2026-10-04 (`docs/DECISIONI.md:1264-1297`: «Tesoro + boss + raccolto tutto», «Effetti invariati. Mappa di Tokyo, ingressi
bloccati, requisiti e disponibilità seguono la regola nuova») ne segue che nella partita 1 tornano visibili l'ingresso al Palazzo e i requisiti
«Completare il Palazzo».

**Verifiche.**
- *Analisi requisiti* (2026-10-20): la decisione «1 B» riportata a loro parlava solo del «non completato» (R4-27, dubbio 2), non di ingressi,
  mappa di Tokyo o requisiti; separare gli effetti dal 100% **contraddice R4-22, R4-25 e la decisione del 2026-10-04**, quindi è una scelta
  dell'utente. R4-28: il cambio visibile su p1 va mostrato all'utente in ogni caso. Gli «archi» («dall'arco del Palazzo di X») restano legati
  alla data (2026-09-30) con qualunque definizione.
- *Esperto della guida*, risposta **G-026** del registro (2026-10-20, con le fonti):
  - Dopo il furto del Tesoro, col boss battuto, il Palazzo «sparirà definitivamente e non sarà più accessibile» (AGS, guida
    all'esplorazione dei dungeon, «I Palazzi scompaiono dopo il completamento»). Non si rientra né dall'app di navigazione né dal punto in città.
  - Gli sblocchi «dopo il Palazzo» dipendono dal **furto** (boss battuto). Non c'è un ramo legato alla scadenza: se scade senza furto la
    partita finisce. **Nessuna fonte** lega uno sblocco alla raccolta completa di forzieri, porte o Semi.
  - Forzieri e oggetti non presi sono persi per sempre. Per i Semi, solo una fonte inglese dice che Jose vende quello mancante, senza
    prezzo né data. La guida italiana dice solo che Jose trasforma i Cristalli in Anelli dopo la distruzione del Palazzo.
  - Conclusione dell'Esperto: nel gioco gli effetti (ingressi, sblocchi) seguono «Tesoro + boss»; il 100% della raccolta è un
    indicatore e non sblocca niente.
- *Origine della regola del 2026-10-04*: l'utente vedeva Kamoshida sparire troppo presto perché bastava il **boss** segnato da solo. Una
  regola «Tesoro **e** boss» per gli effetti risolve quel caso lo stesso (il boss da solo non basta).

**Le due strade.**
- **(A) Regola del 2026-10-04 per tutto** — *scartata dall'utente il 2026-10-20*: nella partita 1
  Kamoshida risulta non completato; tornano l'ingresso al Palazzo sulla Shujin, Kamoshida sulla mappa di Tokyo e i requisiti rossi «Completare
  il Palazzo di Kamoshida — manca: tutti gli oggetti permanenti (56/71)», finché l'utente segna le 15 voci. Nessun cambio al codice di BE.
- **(B) Due livelli nella funzione unica** (`shared/completamentoGuida.ts`) — **scelta dall'utente il 2026-10-20, da implementare**:
  - `concluso` = Tesoro **e** boss finale: governa ingressi (`senzaIngressoAPalazzoCompletato`, `palazzoDiIngresso`), presenza sulla mappa di
    Tokyo, requisiti e condizioni «Completare il Palazzo» / «dopo il Palazzo di X» (`semaforiService`, `disponibilitaService`); motivo
    «Tesoro e boss finale»; il requisito rosso dice cosa manca **per il concluso** («manca: il Tesoro del Palazzo raccolto, il boss finale
    sconfitto»), mai gli oggetti permanenti (R4-25 allineato da Analisi requisiti);
  - `completato` = concluso **e** tutti gli oggetti permanenti: governa anello, percentuale e il segno «Completato» della scheda e di
    «Palazzi»; motivo «Tesoro, boss finale e tutti gli oggetti permanenti (n/n)»;
  - Kamoshida p1: concluso (nessun cambio visibile negli effetti), completato no (anello 56/71, «manca: 15 oggetti permanenti»); Madarame p1
    resta non concluso (manca il Tesoro, pin 811) come oggi; i Memento invariati (boss segnato nella Guida).
  - Lavoro: BE `palazziService.valutaPalazzo`/`statoPalazzi` (campo `concluso` accanto a `completato`), `palazziCompletati` → `palazziConclusi`
    per i quattro lettori degli effetti; FE solo i testi del motivo; test: p1 con le 15 non segnate → concluso e non completato; Tesoro senza
    boss → nessuno dei due; partita «Tutorial» con il solo boss all'11/04 → Kamoshida visibile (caso del 2026-10-04).
- (Scartata: segnare le 15 voci in migrazione, esclusa dall'utente con «1 B».)

### 8.11 NR4-1 — ogni pin tiene il suo stato (decisione del PM, strada (a), 2026-10-20). **Sostituisce le righe «Pin» del §0**
Difetto (no-reg, `noreg.md`/`difetti.md`): con il §0 il pin non aveva uno stato suo, quindi raccogliere un pin segnava la voce e con lei tutti
i suoi pin («Raccogli e depreda le Installazioni Artistiche» di Madarame: 8 pin, uno raccolto li segna tutti); 89 voci, 237 pin (117
collezionabili). L'utente ha sempre segnato gli oggetti uno a uno (252 pin di Madarame).

**Regola completa.**
1. **Stato del pin** = il suo, in `utente.spillo_partita` come prima di L4, per **tutti** i pin (anche quelli con voci). Unica eccezione: i
   **pin condivisi da voci rigenerabili di più infiltrazioni** (Madarame: 40; Kamoshida: 0) hanno lo stato **per infiltrazione**, altrimenti
   raccogliere nella 2ª segnerebbe la 4ª (R4-05). Tabella nuova (migrazione **utente 023**: la 022 era già applicata ai dati di sviluppo e
   le migrazioni sono append-only, BE 2026-10-20):
   ```sql
   CREATE TABLE utente.spillo_partita_infiltrazione (
     partita_id INTEGER NOT NULL, spillo_uid TEXT NOT NULL, infiltrazione_chiave TEXT NOT NULL,
     raccolto INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL,
     PRIMARY KEY (partita_id, spillo_uid, infiltrazione_chiave)
   );
   ```
   Per questi pin si legge la riga dell'infiltrazione di **contesto** (§1.4); la riga di `spillo_partita` resta com'è e non si legge più (L11).
   Migrazione: una riga per (pin, infiltrazione) dove il pin è raccolto **e** la voce rigenerabile di quell'infiltrazione è segnata — misura
   sulla copia: Madarame p1 **90 righe** su 90 coppie, p2 0; **nessun** caso pin raccolto con voce non segnata né il contrario. Nessuna
   riga esistente toccata.
2. **Stato della voce con pin** (permanente o rigenerabile, nei Palazzi): **calcolato dai suoi pin** con una funzione sola `statoVoce(voce,
   contesto)` in `statiGuida.ts`: **fatta** se tutti i suoi pin sono fatti (per una rigenerabile, i pin condivisi letti nella **sua**
   infiltrazione), **in corso k/N** se ne è fatta una parte, **da fare** se nessuno. La riga `punto_partita` della voce resta come **specchio**
   scritto nella stessa transazione del gesto (c'è se e solo se la voce è fatta; porta il tipo di stato — ottenuto, esaurito, sconfitto, aperto —
   scelto dal gesto, o quello predefinito del tipo quando la voce si completa raccogliendo l'ultimo pin), così diario, Enigmi, condizione «Voce
   della guida», pacchetto ed export restano coerenti. Import e cestino rifanno lo specchio con la stessa funzione.
3. **Voce senza pin**: `punto_partita` come prima. **Descrittive**: «Storia» col suo segno, «Altro» senza stato (§8.1). **Pin di sole
   descrittive**: stato proprio, come prima.
4. **Gesti** (stesse rotte del §3.2, corpo invariato):
   - **sul pin** (popup, scheda, visore): segna o toglie **solo quel pin** (nel contesto, se è un pin condiviso di rigenerabili); ogni voce del
     pin si ricalcola (k/N). **Togliere il segno a un pin toglie «fatta» a ogni voce che lo contiene**, «esaurito» compreso (R4-11, scelta
     dell'utente del 2026-10-09): il loro specchio si cancella.
   - **sulla voce** (elenco della guida, scheda del Palazzo): «Segna» (o «Esaurito», solo se `esauribile`) segna **tutti i suoi pin**; le
     altre voci che condividono quei pin si ricalcolano e possono diventare fatte (specchio col loro stato predefinito); la risposta le elenca e
     l'interfaccia le dice («Segnate anche: …»). «Riapri» toglie il segno a tutti i suoi pin, con la conferma che elenca le altre voci che si
     riaprono (§1.6, «Riapre anche: …»).
5. **Oggetto permanente** (§1.3): resta l'**unità di conteggio** (R4-24: un oggetto una volta) e non serve più a propagare lo stato, perché
   lo fa il pin condiviso. Un oggetto è fatto quando tutte le sue voci sono fatte. Il completamento (§1.5) conta gli oggetti; il Tesoro è lo
   stato del pin `tesoro-palazzo`; il boss come prima.
6. **Divergenze**: con questa regola la copia di produzione non ne ha nessuna (misura: Kamoshida e Madarame, p1 e p2, voce segnata con pin
   non tutti fatti = 0, voce non segnata con tutti i pin fatti = 0). Le **4** righe di `divergenza_partita` di p1 (pin raccolto, voce con
   più pin non segnata) diventano lo stato normale «in corso k/N». Il chip «Da verificare» resta su quei pin finché l'utente fa uno dei due
   gesti, per la sua decisione: «Segna la voce», che segna tutti i pin, o «Togli il fatto al pin». La tabella resta per i casi futuri, per esempio
   un pacchetto importato con stati incoerenti.
7. **Scelte di BE ricollocate**: §8.3 (pin che resta senza voci) diventa naturale, perché il pin ha già il suo stato e non si scrive niente;
   §8.5 resta com'è; §8.6 (Enigma): un passo con pin è fatto quando lo sono tutti i suoi pin.
8. **Memento**: invariati (R4-30).
9. **Kamoshida p1** con questa regola: 56/71 oggetti fatti, più 3 voci «in corso». Il completamento non cambia (§8.10, ora deciso: concluso).
10. **Cifre sulla copia fresca 0440Z** (Analisi dati, `dati.md` §11.7, che valgono da qui; le cifre sopra sono della copia delle 00:08):
    - voci con il contatore k/N **89** (prima 88: + `scontro-con-madarame-2`, 2/2 in p1, 0/2 in p2); legami 237, pin distinti 200, collezionabili
      92 (voci non descrittive con più pin: 90 · 239 · 119 · 202 · 93);
    - p1 **81 fatte · 3 in corso · 5 da fare**; p2 39 · 0 · 50;
    - Madarame: voci 227, voci permanenti 101, che formano **82 oggetti permanenti** (voci unite da pin in comune, §1.3: è l'unità che il
      completamento conta); p1 **concluso e completato** (82/82 oggetti, 101/101 voci); p2 0/82 (Analisi dati `dati.md` §11.9). Kamoshida:
      71 voci = 71 oggetti;
    - invariati: Kamoshida p1 56/71 con 3 in corso, 4 divergenze, 40 pin condivisi di rigenerabili, **90** righe di
      `spillo_partita_infiltrazione` in p1 (0 incoerenti);
    - impronta di riferimento `bbd9de5d…` (`impronta-0440Z.json`): le differenze dalla precedente sono lavoro dell'utente. *(Superata:
      vale la base 0503Z, `ff3033cb…`, §8.10.)*
    I test di no-reg del §8.11 usano queste cifre.

**Interfaccia**: la voce con N>1 pin mostra il contatore «2/8» accanto al chip del carattere, con l'anello parziale, e «In corso» nei filtri;
il popup del pin mostra lo stato **del pin** e, sotto, le sue voci con il loro k/N; testi nuovi «In corso · 2/8», «Segnate anche: …».

**Test (BE, no-reg)**:
- Installazioni Artistiche: raccoglierne 1 → la voce va a 1/8 e gli altri 7 pin restano invariati; «Segna» sulla voce → 8 pin fatti; togliere
  un pin → 7/8 e lo specchio sparisce.
- Un pin con due voci: toglierlo riapre entrambe (R4-11).
- Un pin condiviso di rigenerabili raccolto nella 2ª infiltrazione resta da fare nella 4ª.
- Migrazione: 90 righe in Madarame p1, nessuna riga di `spillo_partita` o di `punto_partita` cambiata.
- Percentuali e completamenti di Kamoshida e Madarame p1/p2 uguali alla misura qui sopra.
- Specchio coerente dopo import e cestino.

### 8.12 Domanda per l'utente sul §8.10 (posta dal PM; risposta dell'utente: (B))
Testo e raccomandazione in fondo al file (§8.12, testo).

### 8.15 Implementazione di §8.10–8.14: scostamenti e scelte di BE (`be.md` §5), valutati il 2026-10-20
1. **Numeri**: `spillo_partita_infiltrazione` nella migrazione **utente 023**, `voce_boss_finale` nella **gioco 112**. Corretti §8.11 e §8.14.
2. **Voce di G-027 che non esiste** → NULL con riga di log, senza fermarsi; una voce che esiste ma non è `boss` del suo Palazzo → la
   migrazione si ferma. Accolta: il pacchetto iniziale e le copie vecchie non hanno le voci aggiunte dall'utente. Condizione: una verifica sulla
   base 0503Z controlla che i Palazzi abbiano tutti la voce valorizzata (Iweleth a parte, punto 3). È un **controllo eseguito**, non un test
   del repository, perché la base sta fuori dal repository: esito in `lotti/L4/esiti-be/03-base-p5s-0503Z.txt`, 8 Palazzi su 8 con la voce di
   tipo boss, Iweleth `memento`, **OK**. Si ripete a ogni copia di produzione nuova.
3. **Iweleth**: con voce NULL e tipo `palazzo` risulterebbe «non concluso, manca il boss finale», cioè un Palazzo che non si chiude mai,
   contro R8-19b («segue la regola dei Memento, nessun effetto di Palazzo»). Decisione: si applica **già in L4**, con una proprietà
   strutturata e non la chiave scritta nel codice. Colonna `dungeon.regola_boss TEXT NOT NULL DEFAULT 'voce-finale' CHECK (regola_boss IN
   ('voce-finale', 'memento'))`, nella migrazione gioco **113** (la 112 era già applicata e committata; BE, commit `b83c30ac`/`71378325`), con
   Iweleth = `'memento'`. Implementato: Iweleth fuori da `palazziConclusi` e dai semafori, `concluso: null` nel riassunto per la mappa di Tokyo,
   «Modifica › Boss finale» → 400 `boss-finale-dei-memento`, campo `regolaBoss` nel DTO: il boss conta se è segnato nella Guida, come per i Memento
   (`palazziService.ts`, ramo `mementos`). Iweleth non entra in nessun effetto di Palazzo (ingressi, mappa di Tokyo, requisiti); L8 (D3) lo
   porta poi dentro il dedalo. Test: Iweleth non mostra mai «manca: il boss finale».
4. **«Ripristina» del boss finale** con la colonna nuova `dungeon.seed_json`, come per le Aree: accolta.
5. **Rotta** `PUT /api/compendio/schede/:id/voce` ed errore `voce-di-un-altro-palazzo`: allineati nel §3.2.
6. **Scelte del §8.11 dove il testo taceva**:
   - collegare un pin già segnato a una voce i cui pin diventano così tutti fatti la rende fatta: **accolta**, è la regola del §8.11 punto 2;
     lo specchio `punto_partita` si scrive nella stessa transazione;
   - un pin nuovo aggiunto a una voce già fatta prende il segno nelle partite dove la voce è fatta, così la voce non torna «in corso» per un
     gesto di modifica della guida (per esempio un carattere cambiato a mano): **accolta, con condizioni**. Si scrive solo dove la voce era
     fatta; la risposta elenca le partite toccate (`segniAggiunti: {partita, pin, voce}[]` nelle risposte di collega e di modifica della
     voce); **eliminare il pin** toglie anche quei segni (i pin si eliminano senza cestino; nel cestino vanno le planimetrie, e con loro i
     pin). Test.
8. **Boss finale da dichiarare** (commit L4 `ad585387`, condizione del PM sulla voce di G-027 che non esiste): `DungeonRiassuntoDto.bossFinaleDaDichiarare`
   vale `true` per un Palazzo con `regola_boss = 'voce-finale'` e `voce_boss_finale` NULL. Non vale per Iweleth, ed è assente per i Memento.
   «Modifica › Boss finale» lo spegne; «Ripristina» lo riaccende se la guida non ha la voce. FE lo mostra come «Boss finale da dichiarare»,
   come gli altri «da verificare», con il link a «Modifica › Boss finale». Sulla base p5s è `false` per tutti e 8 i Palazzi. Va fra le sorgenti
   dell'elenco unico «Da rivedere» (L11 R11-10c).
7. **Difetto corretto da BE**: `divergenza_partita` e `spillo_partita_infiltrazione` non avevano la chiave verso la partita e restavano orfane
   quando la partita veniva eliminata. Le ricostruisce la migrazione **utente 024** con `ON DELETE CASCADE`. Test no-reg: eliminare una
   partita di prova non lascia righe in nessuna delle due tabelle.
   - una rigenerabile copiata in un'altra infiltrazione rende il pin condiviso, e lì parte da fare: **accolta**, è R4-05 (§8.11 punto 1).

### 8.13 Per `docs/DECISIONI.md` (testo per il PM, che scrive i documenti)
«**2026-10-20 — Un Palazzo «concluso» e «completato»: gli effetti seguono il furto.** Davanti alla partita 1, dove Kamoshida ha Tesoro e boss ma
15 voci permanenti non segnate (56/71), l'utente ha scelto due livelli. **Concluso** = Tesoro del Palazzo raccolto e boss finale sconfitto:
governa l'ingresso al Palazzo, la sua presenza sulla mappa di Tokyo, i requisiti e le condizioni «Completare il Palazzo» / «dopo il Palazzo di
X». **Completato** = concluso e tutti gli oggetti permanenti fatti: vale solo per l'anello, la percentuale e il segno «Completato». Supera,
per gli effetti, la voce «2026-10-04 — Il Palazzo è completato con Tesoro, boss finale e raccolto tutto, insieme» (il boss da solo continua a
non bastare); gli archi restano legati alla data (2026-09-30); i Memento invariati. Motivo: è il gioco (G-026: dopo il furto il Palazzo
sparisce e gli sblocchi dipendono dal furto, mai dalla raccolta completa) e tiene funzionante la partita senza segnare voci al posto
dell'utente; la decisione «1 B» resta (le 15 voci non si segnano). Nella stessa revisione: ogni pin tiene il suo stato e una voce con più pin
è fatta quando lo sono tutti (NR4-1, strada (a) del PM; pin condivisi da rigenerabili di più infiltrazioni con stato per infiltrazione).»

### 8.12, testo — la domanda com'è stata posta
«Nella partita 1 Kamoshida ha Tesoro e boss finale ma 15 voci permanenti non segnate (56/71). Con la
regola del 4 ottobre (Tesoro + boss + raccolto tutto per tutto) torna visibile l'ingresso al Palazzo, ricompare sulla mappa di Tokyo e i
requisiti "Completare il Palazzo di Kamoshida" tornano rossi finché non segni le 15 voci. Preferisci (A) tenere così, oppure (B) che ingressi,
mappa e requisiti seguano solo Tesoro + boss finale — come nel gioco, dove il Palazzo sparisce dopo il furto — mentre il "Completato" e la
percentuale restano al 100% della raccolta?» Raccomandazione: **(B)**, perché tiene funzionante la partita dell'utente senza segnare voci per lui
ed è il comportamento del gioco (G-026: il Palazzo sparisce dopo il furto, e gli sblocchi dipendono dal furto, mai dalla raccolta completa);
risolve anche il caso da cui era nata la regola del 2026-10-04.

### 8.14 Il boss finale di ogni Palazzo (O4-1 di Test funzionali; G-027 dell'Esperto, 2026-10-20)
> **Aggiornamento sulla copia fresca di produzione** (`dati-produzione/2026-10-20-0440Z`, Collaudo; misure di Analisi dati in `dati.md` §11.7;
> correzione dell'Esperto a G-027). L'utente ha finito Madarame in produzione la sera del 19/10, aggiungendo due voci `boss` nell'infiltrazione
> «Il furto del Cuore di Madarame»: ordine 18 «Scontro Madarame a pezzi» (senza pin) e ordine 19 «Scontro con Madarame»
> (`madarame-il-furto-del-cuore-di-madarame-scontro-con-madarame-2`, con i pin 2300 «La vera Sayuri Originale», `tesoro-palazzo`, e 2301
> «Madarame», `boss`, su 153-5-0). Quindi:
> - **la voce proposta «Sconfiggi Madarame» è ritirata e la domanda all'utente cade**: nessuna voce si aggiunge;
> - `voce_boss_finale` di Madarame = `madarame-il-furto-del-cuore-di-madarame-scontro-con-madarame-2` (ordine 19, indicata dall'Esperto),
>   **non NULL**; la riga Madarame della tabella qui sotto va letta così;
> - Madarame p1 è **concluso** (pin Tesoro 811 e 2300 raccolti, boss fatto: la voce ha i suoi 2 pin fatti, 2/2) **e completato** (82/82 oggetti permanenti, cioè 101/101 voci
>   permanenti; `dati.md` §11.9); p2 né l'uno né l'altro;
> - **due pin `tesoro-palazzo`** a Madarame (811 «Tesoro del Palazzo» su 153-9-0 e 2300 su 153-5-0; ogni altro Palazzo ne ha uno): il Tesoro è
>   fatto quando sono fatti **tutti** i pin `tesoro-palazzo` del Palazzo (è già la regola del codice, `tesori.every(fattoPin)`,
>   `palazziService.ts`; la proposta di Analisi dati coincide). Scelta prudente: un Tesoro segnato a metà non conclude. In p1 sono raccolti
>   entrambi, quindi l'esito non cambia. Test: Madarame con il solo pin 811 → Tesoro ✗;
>   **G-030 dell'Esperto**: 811 (Sala principale: il Tesoro preso con la gru, che è un'esca) e 2300 (Giardino centrale: la vera «Sayuri»
>   dopo il boss) **non sono doppioni**, ma due momenti distinti del 1/6. Nessuna fusione, nessun elenco. La regola resta quella decisa
>   dall'utente: concluso = Tesoro **e** boss finale. Il boss è la sola `voce_boss_finale` di G-027, che a Madarame contiene già il pin 2300.
>   Il Tesoro richiede tutti i pin `tesoro-palazzo`, quindi anche l'811, che nel gioco si prende per forza prima del boss: nessun caso reale
>   in cui la regola blocchi un Palazzo davvero concluso. Se l'Esperto intendeva «per il Tesoro basta il pin del boss finale», è un cambio
>   della regola dell'utente e va chiesto, non applicato.
>   **Voce per l'elenco «Da rivedere»** (L11 R11-10c), senza scrittura sul pin: pin 811, con la nota proposta «Il dipinto preso qui con la
>   gru è un'esca; il vero Sayuri è nel Giardino centrale (pin 2300). Il nome del pin resta il tuo.» (G-030). Il gesto «Aggiungi la nota»
>   la scrive come nota del pin, oppure «Scarta»;
> - il **dubbio 10 di L6** (Madarame mai concluso) **cade**;
> - il resto della tabella è invariato; Kamoshida p1 resta 56/71, con 3 voci in corso e 4 divergenze.
**Problema.** «Concluso» richiede il **boss finale**, ma oggi lo riconosce un'euristica (`bossFinali`/`eBossFinale`,
`server/services/palazziService.ts:56-94`): le voci `boss` dell'infiltrazione di ordine più alto, e **basta una qualunque** di esse; se il
Palazzo ha boss in una sola infiltrazione (`unico`), conta **qualunque pin `boss`** del Palazzo. Sui dati di oggi:
- **Madarame non ha nessuna voce né pin `boss`**, quindi non può concludersi in nessuna partita (com'era prima di L4).
- Niijima (Fase 1 e Fase 2), Shido (5 voci nell'Aula Magna, fra cui il Sacrificio umano e la prima forma), Maruki (4 fasi nell'Eden) e
  Iweleth (Santo Graal e Yaldabaoth) si concludono con la **prima** fase.
- A Kamoshida (`unico`) conta anche il pin `boss` 1657 del tutorial dell'11/04, quello della voce «Imprigionare il re»: è il caso che aveva
  portato alla decisione del 2026-10-04.

**Regola.** Una sola voce per Palazzo, dichiarata:
```sql
-- gioco.db, migrazione 112 (la 111 era già applicata ai dati di sviluppo; append-only, BE 2026-10-20)
ALTER TABLE dungeon ADD COLUMN voce_boss_finale TEXT REFERENCES punto_interesse(chiave) ON DELETE SET NULL;
```
Valori dalla tabella di G-027 (certezza alta), per chiave completa:

| Palazzo | `voce_boss_finale` |
|---|---|
| Kamoshida | `kamoshida-rubare-i-desideri-del-cuore-sconfiggi-kamoshida` |
| Madarame | `madarame-il-furto-del-cuore-di-madarame-scontro-con-madarame-2` (copia 0440Z; prima NULL) |
| Kaneshiro | `kaneshiro-04-caveau-sotterraneo/16` |
| Futaba | `futaba-10-santuario-interno-camera-del-vuoto-area-finale-dato-parzialm/0` |
| Okumura | `okumura-10-produzione-armamenti/6` |
| Niijima | `niijima-14-direzione-sala-del-boss/1` (Fase 2) |
| Shido | `shido-16-aula-magna-tesoro-e-boss-finali/4` (seconda forma) |
| Maruki | `maruki-12-eden-modello-psi-cognitivo-eden/3` (forma finale) |
| Iweleth | **nessuna** (R8-19b, requisiti di L8 riletti): Iweleth confluisce nel dedalo (D3) e segue la regola dei Memento per il boss (segnato nella Guida); non genera effetti di Palazzo e nessuna condizione «Palazzo concluso» lo cita. Il boss resta `iweleth-12-cammino-per-il-santo-graal-parte-iv/5` (Yaldabaoth) come dato, non come `voce_boss_finale` |

- La migrazione controlla che ogni chiave esista e sia di tipo `boss`; altrimenti si ferma con un errore leggibile.
- **Boss finale fatto** = quella voce fatta, con la regola del §8.11: dai suoi pin se ne ha, altrimenti `punto_partita`. Nessun altro pin
  `boss` conta. Spariscono l'euristica dell'infiltrazione più alta e quella di `unico`.
- Con `voce_boss_finale` NULL il Palazzo non si conclude, e il requisito dice «manca: il boss finale (nessuna voce di boss finale per questo
  Palazzo)».
- La voce si cambia dalla scheda del Palazzo, con «Modifica» › «Boss finale», scegliendo fra le voci `boss` del Palazzo, e si rimette con
  «Ripristina» (`seed_json`). Un solo punto di modifica, letto ovunque.
- I Memento restano col boss segnato nella Guida, come prima.

**Verifica sui dati di oggi.**
- Kamoshida p1 e p2: la voce è `ottenuto` in entrambe; il pin 2077 è suo. Boss ✓ come prima, quindi Kamoshida p1 resta concluso (§8.10).
- Partita «Tutorial»: il pin 1657 non conta più. Kamoshida resta visibile all'11/04 per costruzione e non più per caso.
- Gli altri Palazzi non hanno stati nelle partite di oggi, quindi nessun cambio visibile.

**Madarame: la voce mancante è lavoro dell'utente da preservare.** Nessuna scrittura senza il suo sì. Se l'utente dice sì, una migrazione
(primo numero libero) aggiunge la voce di G-027:
- infiltrazione `madarame-il-furto-del-cuore-di-madarame`, ordine 18, dopo «Cerca una via d'uscita»;
- tipo `boss`, nome «Sconfiggi Madarame», descrizione e fonte come nel registro;
- `fonte='guida'`, uid nuovo; nessuna voce esistente cambia ordine o testo; le voci di Madarame passano da 225 a 226.

La stessa migrazione imposta `dungeon.voce_boss_finale` di Madarame. Nella partita 1 Madarame si conclude solo quando l'utente segna questa
voce **e** il Tesoro (pin 811, oggi non segnato): finché non lo fa, ingresso e requisiti di Madarame restano come oggi.

**Domanda per l'utente** (la porta il PM): «A Madarame manca la voce del boss finale ("Sconfiggi Madarame", nel cortile durante la fuga del
1/6, dopo "Cerca una via d'uscita"), e senza quella il Palazzo non risulta mai concluso. Aggiungo la voce, con il testo della guida, in fondo
all'infiltrazione "Il furto del Cuore di Madarame"? Nella partita 1 risulterà concluso quando segnerai lei e il Tesoro (oggi non segnato).»

**Test.**
- Niijima con la sola Fase 1 → non concluso; con la Fase 2 → concluso.
- Shido con Akechi o la prima forma → no.
- Kamoshida col solo pin 1657 → boss ✗.
- Madarame NULL → «manca: il boss finale…».
- Cambio della voce dalla scheda e «Ripristina».
- Migrazione ferma su una chiave inesistente.
- La migrazione della voce di Madarame solo dopo il sì: 226 voci, nessun altro cambio nell'impronta.
