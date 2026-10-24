# L8 «Persona e Ombre» — stesura delle modifiche

Autore: sessione «Stesura modifiche» (2026-10-20). Ingressi: `requisiti.md` (R8-01…R8-30 con R8-07a…f sulla negoziazione, dubbi 1–7),
`dati.md` (§1–§10), `app.md` (§0–§8, segnalazioni A–E), Esperto della guida **G-019** con la decisione del PM (vale il compendio, tranne
**Take-Minakata, Mithras, Bugs, Power** che tengono affinità proprie dell'Ombra; il compendio non si tocca — correzione dell'Esperto e del PM del 2026-10-20),
**G-021** (negoziazione: in arrivo), indicazione del PM su **D7** (righe del compendio «del party», non fondibili, dati dalle fonti
tramite l'Esperto, collegamento per chiave per tutte e 29, niente testo libero), **L3** (aree del Palazzo; Iweleth migrato come Palazzo),
**L4** (voci permanenti/rigenerabili; le voci di cattura fuori dal completamento). Migrazione: il primo numero libero dopo L7 («M8»).

**Principio**: i Memento sono il modello e non si toccano (contratti `AreaDedaloDto`, `DedaloDto`, `AreaDungeonDto.dedalo` invariati). La
Persona resta l'identità; l'Ombra è l'entità nuova; lo stato di cattura è **solo** il compendio della partita.

## 1. Modello

### 1.1 Ombra
```sql
CREATE TABLE ombra (
  chiave            TEXT PRIMARY KEY,              -- slug(nome italiano) con suffisso se doppio
  nome              TEXT NOT NULL,                 -- nome italiano (una sola fonte, R8-03)
  nomi_altri_json   TEXT NOT NULL DEFAULT '[]',    -- nomi di negoziazione e varianti per posto (dati §2: 14 Persona con nomi diversi)
  persona_id        INTEGER REFERENCES persona(id) ON DELETE SET NULL,   -- NULL = non reclutabile
  personalita       TEXT NOT NULL DEFAULT 'sconosciuta' CHECK (personalita IN ('giocosa', 'timida', 'irritabile', 'cupa', 'sconosciuta')),
  affinita_proprie_json TEXT,                      -- solo dove l'Ombra differisce dalla Persona o non ha Persona (§1.3)
  livello           INTEGER,
  note              TEXT NOT NULL DEFAULT '',
  origine           TEXT NOT NULL DEFAULT 'seed' CHECK (origine IN ('seed', 'utente')),
  seed_json         TEXT,
  updated_at        TEXT NOT NULL
);
CREATE TABLE ombra_luogo (                         -- «dove si incontra», una fonte (R8-05)
  ombra_chiave       TEXT NOT NULL REFERENCES ombra(chiave) ON DELETE CASCADE,
  dungeon_chiave     TEXT NOT NULL REFERENCES dungeon(chiave) ON DELETE CASCADE,
  area_chiave        TEXT REFERENCES area(chiave) ON DELETE SET NULL,            -- area del Palazzo (L3)
  area_dedalo_chiave TEXT REFERENCES area_dedalo(chiave) ON DELETE SET NULL,     -- area del dedalo (Memento)
  fonte              TEXT NOT NULL,                -- 'battaglia' | 'voce' | 'dedalo' | 'utente'
  PRIMARY KEY (ombra_chiave, dungeon_chiave, area_chiave, area_dedalo_chiave)
);
ALTER TABLE punto_interesse ADD COLUMN ombra_chiave TEXT REFERENCES ombra(chiave) ON DELETE SET NULL;
```
- Le 131 voci Persona dei dedali **non cambiano** contratto: acquistano solo `ombra_chiave` (il dedalo continua a leggere `persona_area_dedalo`);
  `ombra_luogo` per i dedali si **deriva** da `persona_area_dedalo` + `ombra_chiave` della voce (nessuna copia: vista SQL `ombra_luogo_dedali`).
- `PersonaDellaMascheraDto` (1793) e la normalizzazione delle maschere (tre copie: `maschere.ts:16-43`, migrazione 101, utente 019) diventano una
  sola funzione condivisa in `shared/maschere.ts` per le scritture nuove; le migrazioni vecchie restano come sono.

### 1.2 Persona del party (D7, indicazione del PM)
```sql
ALTER TABLE persona ADD COLUMN del_party INTEGER NOT NULL DEFAULT 0 CHECK (del_party IN (0, 1));
ALTER TABLE persona ADD COLUMN personaggio TEXT;      -- chiave del personaggio (dati_guida.personaggi) per le Persona del party
ALTER TABLE persona ADD COLUMN forma INTEGER CHECK (forma IN (1, 2, 3));   -- solo del party: 1ª, 2ª (risveglio), 3ª forma (Royal)
ALTER TABLE persona ADD COLUMN forma_di TEXT REFERENCES persona(id);       -- solo forme 2 e 3: la 1ª forma della stessa Persona
ALTER TABLE persona ADD COLUMN forma_condizioni_json TEXT;                 -- quando si ottiene (condizioni di L6: rango del Confidente, data, scelta)
ALTER TABLE persona_skill ADD COLUMN modo TEXT NOT NULL DEFAULT 'livello'
  CHECK (modo IN ('livello', 'iniziale', 'risveglio', 'terza-forma', 'rango'));  -- come si impara (le Persona del compendio restano 'livello'/'iniziale')
```
- **Fonte: G-025 dell'Esperto della guida** (registro e allegato `guida/G-025-persona-del-gruppo.md`, 2026-10-20): le **27** forme sono **9
  membri × 3** (Ryuji, Ann, Morgana, Yusuke, Makoto, Futaba, Haru, Akechi, Kasumi). Le forme successive **non sono Persona nuove**: è la stessa
  Persona che si trasforma, con livello e skill conservati. Modello: 27 righe di `persona` con `del_party = 1`, `personaggio`, `forma`, e per le
  forme 2 e 3 `forma_di` = la 1ª forma (Akechi: Robin Hood 1ª, **Loki** 2ª, **Ervardo** 3ª, come G-025 §1). Arsène e Satanael (Joker) sono già
  nel compendio: si collegano con `personaggio` (`del_party` resta 0: sono fondibili come oggi).
- **Nomi**: `persona.nome` = nome canonico del dataset (Hecate, Mercurius, Johanna, Prometheus, Hereward, Cendrillon…, come le altre Persona);
  il nome mostrato viene dalla `traduzione` ambito `persona` con la forma della guida (**Ecate, Mercurio, Ioanna, Prometeo, Ervardo,
  Cenerentola**; gli altri uguali all'inglese), `fonte='seed'`.
- **Arcano** = quello del membro (Carro, Amanti, Mago, Imperatore, Papessa, Eremita, Imperatrice, Giustizia, Fede) nella chiave canonica del
  dataset. **Livello** (colonna NOT NULL) = livello di partenza della 1ª forma (Captain Kidd 4, Carmen 5, Zorro 2, Goemon 15, Ioanna 21,
  Necronomicon 30, Milady 36, Robin Hood 45, Cenerentola 75; Loki 75 come G-025), ripetuto sulle forme 2 e 3 perché il livello si conserva; la
  scheda delle forme 2 e 3 non mostra «Livello N» ma «Livello: quello raggiunto da <1ª forma>».
- **Dati**: il file dell'Esperto `p5s-coordinamento/guida/G-025-persona-del-gruppo.json` (le 27 forme, statistiche comprese) entra nel
  repository come `server/db/migrations/dati/persona-del-gruppo.json`, portato da **Implementazione BE** (l'Esperto non scrive nel repository),
  con l'attribuzione ad aqiu384 in `NOTICE` come gli altri dati; la migrazione M8b legge solo quel file.
- **Statistiche**: quelle iniziali della 1ª forma (`stats` del file); per le forme 2 e 3 G-025 non
  dà numeri: le colonne ripetono quelle della 1ª e la scheda **non le mostra** («Statistiche: crescono con la trasformazione», dalla guida). Mai
  numeri inventati.
- **Affinità** (`persona_affinita`): 1ª e 2ª forma dalla tabella di G-025 §2; 3ª forma = 2ª, con la nota «La guida e i dati non indicano
  resistenze diverse dalla 2ª forma» (G-025: «non risulta»); Necronomicon/Prometeo/Al Azif nessuna affinità (tutte normali); Robin Hood la sua;
  Loki ed Ervardo uguali; Cenerentola, Vanadis, Ella uguali.
- **Skill** (`persona_skill`): la 1ª forma ha le skill «iniziali» (`modo='iniziale'`, livello = livello della Persona, come il dataset) e quelle
  per livello (`modo='livello'`); la 2ª le stesse più le «[risveglio]» (`modo='risveglio'`); la 3ª le stesse più la skill della 3ª forma
  (`modo='terza-forma'`); Necronomicon: le skill di navigazione «con i ranghi e il risveglio» con `modo='rango'`. Ogni skill per **nome canonico**
  (tra parentesi in G-025): le **88** skill e tratti delle 27 forme sono **già tutte** nella tabella `skill` (seguito di G-025, controllo esatto
  sulla copia di produzione), quindi nessuna scheda nuova; la migrazione resta comunque protetta: si **ferma** con l'elenco se una non si trova,
  e non crea mai skill vuote. **Tratto** (colonna NOT NULL): quello della forma (G-025 §1, ultima colonna).
- **Quando** (`forma_condizioni_json`, valutatore di L6): 2ª forma = `confidente{chiave, rango: 10}` con la data consigliata della guida come nota
  (Ryuji 7/6, Ann 10/8, Yusuke 19/8, Makoto 5/11 amicizia o 16/10 amore, Futaba 17/11, Haru 2/12 o 5/12, Kasumi 25/1; Morgana 23/12 automatico =
  `data`); Loki = `data{11-12}` (Palazzo di Shido, certezza media); 3ª forma = `data` della guida (Ryuji 14/1, Ann 13/1, Morgana 10/1, Yusuke
  16/1, Makoto 17/1, Futaba 15/1, Haru 24/1, Kasumi 2/2 certezza media); Ervardo = `data{02-02}` più le scelte di dialogo come `avviso` (non bloccante,
  mai `manuale`: decisioni dell'utente del 2026-09-05 e del 2026-09-30) con il testo di G-025 («Fermeremo Maruki»; «Sei il mio rivale» al R7 o
  «Accetto» al R8; «Voglio mantenere la promessa» dopo Shido). Le certezze medie
  restano nella nota.
- Migrazione dedicata «M8b» (primo numero libero dopo M8): legge il file dati, controlla le 27 righe, le 9 catene, le affinità e le skill (conteggi
  per forma) e non tocca nessun'altra riga di `persona`, `persona_affinita`, `persona_skill`.
- **Mai fondibili**: il motore di fusione (`server/services/fusione/`), le ricette, i cicli, l'Isolamento e la Stanza di Velluto escludono
  `del_party = 1` con un filtro unico (`personaFondibili()` in `compendioService`) usato da tutti i punti che oggi leggono `persona` per fondere;
  test che nessuna ricetta, ciclo o suggerimento contenga una Persona del party.
- `dati_guida.personaggi[].persona` (nomi) → chiavi (`persona.id`): il personaggio porta le sue Persona per chiave (`PersonaggioDto.persona:
  Array<{ id, nome }>`, 944), niente più testo; `PersonaDelPersonaggio.tsx:16-21` e `PersonaggiPage.tsx:80` per chiave.

### 1.3 Debolezze: dal compendio, una copia solo dove serve (R8-08, R8-09, R8-10)
- Ombra con Persona → affinità = `persona_affinita` della Persona (stessa griglia di `AffinitaGriglia`).
- `affinita_proprie_json` **solo** per: le **5 non reclutabili** (4 Servobot e «Straziato re dei desideri», dalla guida). Correzione di
  **G-035** dell'Esperto: nel Palazzo di Kaneshiro «Melma nera» e «Pixie superiore» avevano Ombra e Persona scambiate. Le Ombre sono **«Fango
  pulsante»** (Black Ooze, Timida) e **«Maestra degli scherzi»** (High Pixie, Irritabile), e sono **reclutabili**: prendono la loro Persona e le
  debolezze dal compendio, senza affinità proprie. Prima erano contate fra i non reclutabili, che erano quindi 7.
  Hanno affinità proprie anche le **4 eccezioni di G-019**: Take-Minakata «Vendicatore sconfitto», che Riflette l'Elettricità (la guida scrive
  «respinge Tuono»); Mithras «Sole oscuro», che Riflette il Nucleare (la guida scrive «respinge»: R8-20c); Bugs «Orsacchiotto assassino»: debole al Fuoco, neutro a Psicocinesi e Maledizione; Power «Guerriero divino / Potestà»: neutro
  all'Arma da fuoco) — in questi quattro casi l'affinità mostrata è quella dell'Ombra, con la nota «diversa dalla sua Persona nel gioco».
- **Il compendio non si tocca** (correzione dell'Esperto a G-019 e del PM, 2026-10-20): la Persona Power è davvero debole all'Arma da fuoco
  (verifica sulla Megami Tensei Wiki in `docs/riferimenti/dataset-fonti.md`); è l'Ombra a non esserlo.
- **Un solo nome per ogni elemento** (segnalazione D): `shared/elementi.ts` (nuovo) con chiave (phys, gun, fire, ice, electric, wind, psy, nuclear,
  bless, curse, almighty, più i tipi ailment, healing, support, passive, trait) e un nome italiano unico usato da compendio, Battaglia, dedali, voci
  e Richieste. **Nomi = quelli della guida** (G-025 §4, certezza alta): Fisico, Arma da fuoco, Fuoco, Ghiaccio, **Elettricità**, Vento,
  **Psicocinesi**, Nucleare, Sacro, **Maledizione**, **Divino**; tipi Alterazione, **Recupero**, Supporto, Passiva, Tratto (al singolare come
  etichetta di una skill; i titoli al plurale della guida — «Alterazioni», «Passive», «Tratti» — solo come intestazioni di gruppo); esiti Debole,
  Resiste, Annulla, **Riflette**, Assorbe, Normale. Sigle: Psi, Mal (al posto di Osc), Div.
- **Correzioni** (migrazione M8, solo righe `fonte='seed'` con il valore atteso di oggi; una riga `utente` o diversa resta e va nell'elenco):
  `traduzione` ambiti `elementoAffinita`, `elementoSkill`, `colonnaEredita` per chiave — psy «Psichico» → «Psicocinesi», curse «Oscurità» →
  «Maledizione» (sigla «Mal»), almighty «Quasi-divino» → «Divino», healing «Guarigione» → «Recupero» (9 righe nel `data/gioco.db` di oggi); le 4
  righe di `tipoEredita` con questi nomi (Psy, Curse, Almighty, Healing), per chiave: 13 in tutto. `CompendioPage.tsx:33` e `BattagliaPage.tsx:63` (nomi scritti nel codice) leggono
  `shared/elementi.ts`. **«Tuono», «Gelo», «respinge»** della Battaglia: le affinità delle Ombre diventano chiavi in questo lotto (§1.3, `ombra`),
  quindi si mostrano col nome unico senza riscrivere testi; `chiaveElementoDaTesto` (`src/utils/elementiGuida.ts:5-25`) legge «Tuono»/«Gelo»/
  «respinge» solo in migrazione.
- **Voci boss dei Palazzi sulla copia 0440Z**: 26 (prima 24). Le due nuove di Madarame (`…-scontro-con-madarame` e `…-scontro-con-madarame-2`,
  scritte dall'utente) contengono «Gelo» e «respinge»: sono lavoro da preservare, quindi nessuna sostituzione; vanno nell'elenco
  `elementi-nei-testi.md` e nell'elenco unico «Da rivedere» (L11) con la proposta «Ghiaccio» / «riflette» e il gesto «Applica» / «Tieni».
- **Testi liberi non si riscrivono in blocco**: nella base di oggi «Gelo» è anche il meteo e un oggetto, «Oscurità» e «Guarigione» compaiono in
  nomi di skill e oggetti; e le voci del diario, i pin e le note sono lavoro dell'utente. Si consegna l'**elenco delle occorrenze** (tabella,
  chiave, campo, frase) in `lotti/L8/elementi-nei-testi.md`; nelle descrizioni seed di skill e oggetti (`effettoSkill`, `descrizioneOggetto`) la
  correzione entra solo per le occorrenze dove la parola è il nome dell'elemento, una per una dall'elenco rivisto dall'Esperto; voci, pin, note e
  Richieste dell'utente restano come sono.

### 1.4 Negoziazione per umore (R8-07a…f)
Il dato passa dal JSON di `dati_guida.battaglia.negoziazione` a tabelle, **senza perdere i verdetti contraddittori** (oggi «il peggiore» nasconde la
risposta buona in 24 casi):
```sql
CREATE TABLE negoziazione_domanda (chiave TEXT PRIMARY KEY, testo TEXT NOT NULL, testi_altri_json TEXT NOT NULL DEFAULT '[]', ordine INTEGER NOT NULL, fonte TEXT NOT NULL);
CREATE TABLE negoziazione_risposta (chiave TEXT PRIMARY KEY, domanda_chiave TEXT NOT NULL REFERENCES negoziazione_domanda(chiave) ON DELETE CASCADE,
  testo TEXT NOT NULL, ordine INTEGER NOT NULL);
CREATE TABLE negoziazione_verdetto (risposta_chiave TEXT NOT NULL REFERENCES negoziazione_risposta(chiave) ON DELETE CASCADE,
  umore TEXT NOT NULL CHECK (umore IN ('giocosa', 'timida', 'irritabile', 'cupa')),
  esito TEXT NOT NULL CHECK (esito IN ('buona', 'passabile', 'cattiva')), incerto INTEGER NOT NULL DEFAULT 0,
  fonte TEXT NOT NULL,                     -- 'royal' (G-021) | 'solo-p5' | 'p5-app' (il file di oggi, quando Royal dice altro) | 'utente'
  principale INTEGER NOT NULL DEFAULT 1,   -- 0 per l'«altra fonte» conservata
  PRIMARY KEY (risposta_chiave, umore, fonte));
CREATE TABLE negoziazione_umore (umore TEXT PRIMARY KEY, nome TEXT NOT NULL, descrizione TEXT NOT NULL, esempi_json TEXT NOT NULL, da_evitare_json TEXT NOT NULL, fonte TEXT NOT NULL);
```
- Migrazione: dal **file originale** `server/db/dati/negoziazione-domande.json` (230 domande, 691 risposte, **642** verdetti con i 7 incerti) — non dal
  JSON normalizzato della 083/084 — con le 5 domande ripetute fuse (`testi_altri_json`); risultato atteso 225 domande, 680 risposte, **642** verdetti
  (nessuno perso: dove due fonti si contraddicono restano **tutte e due** le righe, con `incerto`). Le 4 carte delle personalità → `negoziazione_umore`
  (testi di oggi).
- **G-021 è arrivato** (`guida/registro.md` + allegato `guida/G-021-negoziazione.md`): fonte di riferimento il foglio **Royal** di joyce-chen
  (277 domande × 3 risposte × 4 personalità); il file dell'app viene da Persona 5 base. Nella stessa migrazione M8 (dati dall'allegato e dalle
  copie di lavoro dell'Esperto `neg-mappa.json`/`neg-diff.json`, abbinamento domanda per domanda già fatto: 229/230):
  - **regola** (G-021, vince Royal): per ogni risposta abbinata l'esito **principale** è quello di Royal (`fonte='royal'`); dove Royal non dà un esito
    e l'app sì (53), resta quello dell'app con `fonte='solo-p5'` mostrato «solo P5, non verificato in Royal»; gli **86 esiti diversi** da Royal (numeri corretti dall'Esperto dopo la prima versione di G-021; R8-07b): Royal
    principale, quello di prima conservato con `fonte='p5-app'` («altra fonte», visibile nel dettaglio e nel rapporto: nessuna perdita, R8-07e);
  - i **979 esiti** di Royal che mancano nell'app si aggiungono (`fonte='royal'`); le **49 domande nuove** di Royal si aggiungono con le loro tre
    risposte; la domanda A156 senza corrispondente in Royal resta, `solo-p5`; i 9 doppioni dell'app si fondono come oggi (`testi_altri_json`);
  - certezza: **alta** sull'elenco delle domande, **media** sui singoli esiti (la fonte avverte che una parte viene ancora dall'originale): il dato lo
    dice nel rapporto e nella pagina («Esiti da Royal, certezza media»).
- **Testo del gioco e resa** (G-021: nessuna fonte italiana riporta le domande come nel gioco): colonna `testo_origine` su domande e risposte
  (`'gioco' | 'resa-app' | 'resa-esperto'`): le 230 di oggi `resa-app`, le 49 nuove `resa-esperto`, `gioco` solo per le **8 frasi** della guida
  italiana (le risposte d'esempio delle carte). L'interfaccia lo dice con un segno discreto («resa, non testo del gioco») accanto al testo.
- **Carte delle personalità** (`negoziazione_umore`): le 8 frasi verificate con le sostituzioni dell'allegato (gli esempi che oggi non esistono fra
  le risposte, app.md §1.3, sono sostituiti).
- **Personalità delle 75 Ombre** che ne sono prive: dall'allegato (`ombra.personalita`), con la fonte; le rimanenti senza dato restano
  `sconosciuta`.
- Conteggi attesi dopo: domande ≈ 225 + 49; esiti: i 642 di oggi tutti presenti (come principali o «altra fonte») + 979 da Royal; domande senza una
  risposta buona: da **52** a ≈ 10 (come in Royal); le **24** risposte contraddittorie si contano a parte (restano con entrambe le righe).
- Rapporto di verifica (R8-07b): `GET /api/compendio/negoziazione/verifica` (sola lettura) che per ogni umore conta domande, risposte, verdetti per
  fonte, aggiunte, discordanze; BE lo allega a `be.md`.

## 2. Una strada di cattura e di registrazione (R8-11…R8-15, segnalazione B)
- **Una funzione** `registraPersona(partita, personaId, { istantanea?: dati dell'esemplare })` in `server/services/catturePersona.ts` (oggi 21-50):
  - **tocco di cattura** (Memento, Palazzo, Battaglia, CompendioPersonale): `registrata = 1`; se la riga esiste **non** si azzerano livello, bonus né
    abilità (oggi `partiteService.aggiornaCompendio` 491-509 azzera `livello_registrato` sul conflitto, 502-504: corretto);
  - **«Registra» dalla scorta** e **aggiunta alla scorta** (`aggiungiPosseduta` 618-656, `registraPossedutaNelCompendio` 659-673, fusione
    `operazioniVellutoService.ts:150-153`): con l'istantanea completa, che sostituisce la precedente;
  - togliere la registrazione: la conferma di oggi (perdita di livello, bonus e abilità) e lo stesso effetto ovunque.
- **Palazzi**: le voci con `ombra_chiave` e Persona reclutabile si segnano con la **piastrella** dei Memento (`PersoneDellArea` riusato in `GuidaDellArea`
  per le voci di tipo persona): il tocco chiama `registraPersona`; lo stato si legge da `compendio_partita`; `punto_partita` non si scrive più per
  queste voci (R8-12). Non contano nel completamento (L4: `persona` ha carattere `null`, già escluso).
- **Battaglia**: la carta dell'Ombra con Persona ha la stessa piastrella con lo stato del compendio e il tocco che registra (R8-13).
- **Catture già segnate da convertire**: nessuna (dati §4: le 4 righe sono di 2 voci di Kamoshida che **non sono Ombre**, «Parla con Morgana» e
  «Risveglio Persona di Ryuji»). Queste 2 voci **restano come sono** (tipo `persona` senza `ombra_chiave`: si comportano come oggi, `punto_partita`),
  con la proposta di diventare `storia` in elenco (voci dell'utente: nessuna scrittura senza sì, §8.3).

## 3. Iweleth (D3: solo come dedalo dei Memento; R8-16…R8-19)
- **Stato unico**: le 9 voci Persona del «Palazzo» (`iweleth-02-corridoio-della-prigione-parte-i/5..13`) prendono `ombra_chiave` uguale a quella delle
  voci del dedalo (`mementos-08-iweleth/7..15`): stessa Ombra, stessa Persona, stato dal compendio → un solo stato (R8-16). Nessuna riga cancellata.
- **Una sola casa**: Iweleth sparisce dall'elenco dei Palazzi, dalla metro e dalle viste dei Palazzi (`DungeonPage.tsx:5-9, 44`, `collocazioneTokyo.ts:145`,
  `src/utils/palazzi.ts:5, 41`, `sezioniGuida.tsx:26`, `MappaMemento.tsx:54`); la riga `dungeon iweleth` **resta** (citata da `condizioniSpillo.ts:29`, migrazione 101,
  spilli guida con FK RESTRICT) e l'indirizzo `/guida/dungeon/iweleth` porta al dedalo `?…mementos-08-iweleth`.
- **Contenuti del «Palazzo» conservati**: nella pagina del dedalo di Iweleth una sezione chiusa «Archivio del Palazzo di Iweleth» (sola lettura) con
  le sue 16 aree, 26 planimetrie (visore) e 47 voci (dubbio 4): niente si perde, i 12 spilli guida restano collegati. La conversione delle 38 voci con
  tipi non ammessi nei dedali (in Trama o Persona) va in elenco da approvare, voce per voce (R8-17); lo scambio Parte III/IV su 160-4-0/160-5-0 e
  l'area-8 «???» pure (R8-19).

## 4. API e DTO
- `OmbraDto` (1646-1661): `chiave`, `nome`, `persona: { id; nome } | null`, `reclutabile`, `personalita`, `affinita: AffinitaDto[]` (dal compendio o
  proprie, con `proprie: boolean`), `dove: Array<{ dungeon; dungeonNome; area?; areaDedalo?; casa }>`, `registrata: boolean | null` (partita), `casa`
  (`/guida/ombra/<chiave>`). `BattagliaDto.ombre` le porta; le stringhe `debolezze`/`resistenze` della guida non si mandano più.
- `PersonaDettaglioDto` (106-134): `doveSiIncontra: OmbraDto['dove']` (unione di Battaglia, voci, dedali, R8-07), `ombre: Array<{ chiave; nome }>`,
  `registrata` (partita), `delParty`, `personaggio`.
- `PuntoInteresseDto.ombra` (voci): `{ chiave; nome; personaId; registrata }` per le voci con `ombra_chiave` (Palazzi e dedali; nei dedali è un campo in
  più, il contratto resta).
- `NegoziazioneDto`: `umori` (4, con descrizione ed esempi), `domande: Array<{ chiave; testo; risposte: Array<{ chiave; testo; verdetti: Array<{ umore;
  esito; incerto; fonte }> }> }>`; `GET /api/compendio/negoziazione` (sostituisce la parte di `GET /battaglia`), `…/negoziazione/verifica`.
- Rotte: `GET /api/compendio/ombre?dungeon=&personalita=&q=&partita=`, `GET /api/compendio/ombre/:chiave`, `PUT …/:chiave` (correzioni: nome,
  personalità, affinità proprie solo se non reclutabile o eccezione, luoghi; «Ripristina»), cestino tipo `ombra`; `PUT /api/partite/:id/compendio/:personaId`
  passa da `registraPersona` (corpo invariato).

## 5. Interfaccia
- **Pagina Ombra** `/guida/ombra/:chiave` (`src/pages/OmbraPage.tsx`, nuova): nome, Persona (piastrella con immagine, link alla scheda, «Registrata»
  con il tocco che registra), debolezze (griglia `AffinitaGriglia`, con la nota se proprie), dove si incontra (Palazzo › area / Memento › dedalo › area,
  link), personalità con «Negoziazione per <umore>» (link alla vista filtrata, R8-07d). Formati: piastrelle ≥88 px (tre per riga su telefono).
  **Dove resta catturabile** (R8-15b, G-026): con una partita, ogni luogo d'incontro in un Palazzo **concluso** (L4 §8.10) si mostra «Non più
  raggiungibile: il Palazzo è sparito»; sotto, «Dove si cattura ancora» elenca gli altri incontri non chiusi (Memento › dedalo › area, altri
  Palazzi non conclusi) calcolati da `ombra_luogo`; se non ce ne sono, «Solo per fusione» (se la Persona è fondibile) con il link al compendio.
  Calcolo nel server (`OmbraDettaglioDto.incontri[].raggiungibile`). Iweleth segue la regola dei Memento (R8-19b): mai «Palazzo sparito».
- **Affinità proprie solo per gli elementi diversi** (R8-08b, G-019): per le 4 Ombre (Vendicatore sconfitto: Elettricità Riflette; Sole oscuro:
  Nucleare Riflette; Orsacchiotto assassino: Fuoco Debole, Psicocinesi e Maledizione neutre; Guerriero divino / Potestà: Arma da fuoco neutra)
  `affinita_proprie_json` contiene **solo** gli elementi che differiscono dalla Persona; la griglia unisce compendio + differenze. Le altre 37 + 45
  differenze di oggi: vince il compendio. Nomi degli elementi dal §1.3 (R8-20c), verificati sul DOM (nessun «Tuono», «Gelo», «respinge»,
  «Psichico», «Oscurità», «Quasi-divino», «Guarigione» nei testi visibili).
- **Battaglia** (`BattagliaPage.tsx`): «Ombre» con le carte che portano alla pagina Ombra, debolezze dal compendio, piastrella di cattura; filtro
  «Debole a» sui nomi unici degli elementi. **Negoziazione** (R8-07c, R8-07f): in cima la scelta **«Umore»** (4 pulsanti) **oppure «Ombra»** (ricerca:
  preseleziona il suo umore; `trattoIniziale` oggi non passato, `BattagliaPage.tsx:149`); poi la ricerca della domanda; ogni risposta mostra il verdetto
  per l'umore scelto (buona/passabile/cattiva, con «incerto» e la fonte; con due fonti discordanti si vedono entrambe), le altre in piccolo; «Ombre di
  questo umore» (R8-07d). Su telefono: umore → domanda in due tocchi, verdetti leggibili a colpo d'occhio.
- **Dedali dei Memento**: `PersoneDellArea` invariato nell'aspetto; la «i» delle debolezze legge il compendio (o le proprie); la piastrella porta anche
  alla pagina Ombra.
- **Palazzi**: le voci Persona/Ombra con la piastrella dei Memento (R8-29); `DettagliPunto` senza debolezze in testo.
- **Richieste** (`RichiestePage.tsx:119-121`): il bersaglio, se ha un'Ombra, mostra le debolezze del compendio; il `bersaglio_json` in testo resta
  per i bersagli senza Ombra.
- **Scheda Persona** (`PersonaDettaglioPage.tsx:178-180`): «Dove si incontra» completo, «Ombre», «Registrata nella partita».
- **Compendio**: le Persona del party compaiono con il segno «Del party» e un filtro; nessuna azione di fusione su di loro.

## 6. Migrazione M8 (e dedicate)
1. Schema del §1 (`ombra`, `ombra_luogo`, colonne di `punto_interesse` e `persona`, tabelle della negoziazione), cestino con `ombra`.
2. **Ombre**: dalla Battaglia (217) unite alle voci dei Memento (131) e dei Palazzi (38 con Persona), deduplicando per (nome normalizzato, Persona)
   con l'abbinamento delle maschere di `maschere.ts`; i casi non sicuri in elenco (R8-02); `personalita` dalle 4 (null, «-» → `sconosciuta`; «Non
   reclutabile» → `persona_id` NULL). `ombra_luogo` dalla Battaglia e dalle voci (unione delle fonti, nessuna vince: dati §5).
3. Voci: `ombra_chiave` su 131 + 38 (testi, ordine, pin invariati); le 9 voci di Iweleth sulle stesse Ombre del dedalo.
4. Affinità proprie: 5 non reclutabili + 4 eccezioni di G-019 (Take-Minakata, Mithras, Bugs, Power); il compendio non cambia. Fango pulsante e
   Maestra degli scherzi di Kaneshiro sono reclutabili, con Persona Black Ooze / High Pixie e personalità Timida / Irritabile (G-035).
   **Nomi delle Ombre**: dove ci sono due nomi italiani per la stessa Ombra («Capo dei burloni» / «Maestra degli scherzi»; «Re lacerato dei
   desideri» / «Straziato re dei desideri»), il nome è **quello della guida** (il secondo di ogni coppia). L'altro, che oggi sta nella
   `traduzione` della negoziazione («Prankster Leader», «Torn King of Desires»), va in `nomi_altri_json` (G-035). Le due righe di
   `battaglia.ombre` di Kaneshiro si correggono come quelle di Kaitul, che sono già giuste. «Straziato re dei desideri» ha la maschera Mara
   (livello 60) e resta non reclutabile (Analisi dati `dati.md` §11).
   **Cifre sulla base 0533Z**:
   - `battaglia.ombre` ha 217 righe: 2 corrette (Kaneshiro), 1 completata (Straziato re → Mara), 214 identiche;
   - abbinate al compendio 213 su 217;
   - non reclutabili 5;
   - impronta «prima» di L8: `742ed5a2…`.
5. Negoziazione dal file originale (§1.4).
6. Negoziazione Royal da G-021 (§1.4: esiti, 49 domande, carte, personalità delle 75 Ombre).
7. **M8b**: Persona del party da G-025 (§1.2): 27 righe di `persona` (9 catene), le loro affinità e skill, le 6 traduzioni dei nomi italiani;
   ferma se manca una skill o se una chiave esiste già. In M8: le 9 righe di traduzione degli elementi e le 4 di `tipoEredita` (§1.3).
### Verifiche prima/dopo
| Misura | Atteso |
|---|---|
| Ombre | 217 unite alle voci (numero esatto dal test; **5** non reclutabili, G-035) |
| voci con `ombra_chiave` | 131 + 38 (+ 9 di Iweleth fra queste) |
| debolezze lette da copie | 0 per le Ombre con Persona, tranne le 4 eccezioni; `persona_affinita` invariata |
| `compendio_partita` / `persona_posseduta` | 53 / 7 invariati (R8-23) |
| dedali dei Memento | 9 dedali, 95 aree, 827 legami, 131 voci; **risposta API di `mementos` identica** salvo i campi in più e Iweleth (R8-22) |
| negoziazione | ≈ 274 domande (225 + 49 di Royal); i 642 verdetti di oggi tutti presenti (86 come «altra fonte»); + 979 esiti di Royal; 24 contraddittorie a parte; domande senza risposta buona 52 → ≈ 10; 53 «solo P5»; ogni testo con la sua origine |
| impronta diario/Kamoshida/Madarame | identica (le 2 voci di Kamoshida intatte) |

## 7. Piano dei test
- **BE**: migrazione M8 (conteggi, deduplica, elenco dei non abbinati, idempotenza); debolezze dal compendio per un'Ombra con Persona e proprie per le
  4 eccezioni e i 5 non reclutabili; Fango pulsante e Maestra degli scherzi reclutabili con le debolezze della loro Persona (G-035); compendio invariato; correggere un'affinità nel compendio cambia Ombra, dedalo, Battaglia (R8-10); `registraPersona` da Memento,
  Palazzo, Battaglia e CompendioPersonale con lo stesso esito, senza azzerare il livello; togliere la registrazione ovunque (R8-14); Iweleth: catturare
  Lilith nel dedalo la mostra catturata nell'archivio del Palazzo (R8-16); le 2 voci di Kamoshida invariate; negoziazione: 642 verdetti, le 24
  contraddizioni con entrambe le righe, ricerca, verifica; Persona del party mai nelle fusioni, ricette, cicli, suggerimenti; M8b: 27 forme, `forma_di` delle 18 forme 2/3 sulla 1ª giusta, affinità
  1ª/2ª uguali a G-025 §2 e 3ª = 2ª, skill per forma (le «[risveglio]» solo da 2ª, la skill della 3ª solo sulla 3ª), statistiche nascoste per le
  forme 2/3, nomi Ecate/Mercurio/Ioanna/Prometeo/Ervardo/Cenerentola, le 88 skill trovate tutte per nome canonico e arresto provato su una skill tolta in un test; elementi: le 13 righe corrette (9 + 4), una riga
  `utente` o con valore diverso lasciata e segnalata, nessun testo libero cambiato, `CompendioPage`/`BattagliaPage` con «Psicocinesi»,
  «Maledizione», «Divino», «Elettricità», «Riflette»; test esistenti da
  allineare (app.md §6: `battaglia.test.ts`, `memento-persona-trama.test.ts`, `aree-dei-dedali.test.ts`, `condizioni-voce.test.ts` 162-196,
  `api.test.ts` 155/286, `squadra`, `operazioniVelluto`, `fusione`, `cicli`, `dungeon.test.ts:73`, `personaggi`, `maschere`, migrazioni 019/083/101).
- **FE**: `OmbraPage.test.tsx` (nuovo), `BattagliaPage.test.tsx` (Ombre e Negoziazione per umore/Ombra), `RisposteNegoziazione.test.tsx`, `PersoneDellArea`,
  `AreeDelDedalo`, `DungeonDettaglioPage` (Memento identici; Iweleth come dedalo), `RichiestePage`, test nuovi per `PersonaDettaglioPage` e `PersonaggiPage`.
- **Funzionali**: «fatto quando» — nessuna debolezza ricopiata; con una partita di prova catturare un'Ombra in un Palazzo, nei Memento e in Battaglia la
  registra ovunque, Iweleth compreso; togliere la registrazione la toglie ovunque; negoziazione dall'Ombra al verdetto.
- **UX**: in battaglia dal telefono, dall'Ombra alle debolezze e alla registrazione in due tocchi (R8-28); dalla domanda alla risposta in due tocchi (R8-07f).
- **No-reg**: Memento identici (API e pagine); compendio, scorta, fusioni e Stanza di Velluto come prima (R8-26); diario e Palazzi invariati.
- **Layout**: pagina Ombra, Negoziazione per umore, Battaglia, scheda Persona: 1280, 768, 375, 1366×657, 1280×689; piastrelle ≥88 px, bersagli ≥44 px.

## 8. Da approvare (scelta prudente applicata)
1. **Persona del party**: righe del compendio «del party», non fondibili, con i dati di G-025: 9 catene di 3 forme (forma 2 e 3 = stessa
   Persona trasformata), statistiche mostrate solo per la 1ª forma, 3ª forma con le affinità della 2ª (nota); le 88 skill ci sono già tutte.
2. **Nome unico degli elementi** — chiuso da G-025: i nomi della guida (Psicocinesi, Maledizione, Divino, Recupero, Elettricità, Riflette);
   corrette le sole righe di traduzione dei nomi degli elementi; i testi liberi solo dall'elenco rivisto, mai in blocco.
3. **Le 2 voci «persona» di Kamoshida che non sono Ombre**: restano come sono; proposta di ritiparle `storia`, senza scrittura.
4. **Iweleth**: fuori dai Palazzi, archivio del Palazzo in sola lettura dentro il dedalo; conversione delle 38 voci, Parte III/IV e «???» in elenco.
5. **Verdetti**: vince Royal (G-021); quelli di oggi diversi restano come «altra fonte», quelli senza Royal come «solo P5» (non più «il peggiore»).
6. **Vista «Persona della partita»**: in L10 (dubbio 6).
7. **Personalità** delle 75 Ombre senza: dall'allegato di G-021; «sconosciuta» solo dove manca anche lì.

## 9. Implementazione di B0 e B4 (2026-10-24): scarti dal disegno e punti aperti
Commit `5ca53f49` (B0, migrazione 162) e `7e57b989` (B4, migrazione 166; i numeri 123 e M8 del disegno erano ipotetici).
- **Scarti dal §1.1**: il legame voce → Ombra è la tabella `ombra_voce` (una voce, un'Ombra, `ON DELETE CASCADE`) e non la colonna `punto_interesse.ombra_chiave`: non cambia la forma di una tabella che dieci servizi leggono con `SELECT *`. `ombra_luogo` ha una chiave propria e indici univoci (la chiave composta con colonne NULL non impediva i doppioni) e porta il Palazzo e l'infiltrazione (o il dedalo); le aree dei dedali sono la vista `ombra_luogo_dedalo` da `persona_area_dedalo`, senza copia. Catturabilità (`catturabile`) e negoziabilità (`negoziabile`, NULL = non verificata) sono colonne distinte dall'abbinamento alla Persona, come vuole P1. Nessun legame all'Area fisica di L3: le fonti dicono il Palazzo o l'infiltrazione.
- **Identità**: una Ombra è (nome, Persona); la stessa coppia con personalità diverse in luoghi diversi (10 casi) dà Ombre distinte. Le righe senza il nome dell'Ombra (Okumura) vanno all'Ombra della stessa Persona se è una sola e compatibile.
- **Dati**: le 71 personalità di G-021 §5 sono in `server/db/migrations/dati/ombre-personalita.json`. Babau/Bugs (Orsacchiotto assassino) non è catturabile (AllGameStaff, settimana 40). Il rapporto delle decisioni è in `dati_guida` `ombre-l8-166` e in `GET /api/compendio/ombre/verifica`.
- **Non fatto in questa ondata**: rotte di scrittura e cestino `ombra` (§4), il raccordo della tabella di Kamoshida (assente in p5s), i nomi di negoziazione delle altre Ombre, l'elenco delle occorrenze degli elementi nei testi liberi (`elementi-nei-testi.md`), tutte le viste (B8).
