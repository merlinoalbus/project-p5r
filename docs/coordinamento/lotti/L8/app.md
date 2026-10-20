# L8 «Persona e Ombre» — analisi dell'app attuale

Autore: sessione «Analisi app attuale» (2026-10-20).

Fonti e modalità:
- codice nella cartella di sviluppo `C:\Repository\project-p5r\.claude\worktrees\pensive-burnell-b50941` (branch `newreview`), letto
  senza modificarlo;
- database aperti in sola lettura: `data/gioco.db`, `data/partite.db`, la copia di produzione `prod-20261020/gioco.db` e il pacchetto
  `pacchetto/gioco.db`;
- FE e BE interrogati solo con GET;
- criteri di confronto: `requisiti.md` (R8-…).

Il §1 risponde alla richiesta del PM sulla vista «Aiuto in battaglia › Negoziazione»: l'utente segnala che domande e risposte non sono
complete né corrette per umore.

## 0. Fatti che contano per il progetto
1. **Le Ombre esistono in quattro copie, nessuna legata per chiave.**

   | Copia | Contenuto | Dove sta |
   |---|---|---|
   | Ombre della Battaglia | 217 Ombre: Persona come testo, debolezze e resistenze come stringhe della guida («Tuono (dimezza)»), `personalita` | `dati_guida.battaglia.ombre` |
   | Voci «persona» dei Memento | 131 voci, con `{maschera, deboleA, resisteA, personalita}` in testo | `punto_interesse` |
   | Voci «persona» dei Palazzi | 41 nell'istanza e nella copia di produzione (futaba 4, iweleth 9, kamoshida 2, kaneshiro 9, maruki 1, niijima 15, okumura 1), 44 nel pacchetto; `dettagli` eterogenei | `punto_interesse` |
   | Tabella di Kamoshida | voce `kamoshida-02-sala-centrale/3`, 14 righe | **solo nel pacchetto**, non nell'istanza né in produzione |

   Note sulle copie:
   - **Battaglia.** Le 217 Ombre si dividono così: Kamoshida 14, Madarame 7, Kaneshiro 11, Futaba 9, Okumura 15, Niijima 13, Shido 16,
     Iweleth 9, Maruki 10, Memento 113. Il collegamento al compendio passa per nome (`personaDellaMaschera`,
     `battagliaService.ts:13-19`).
   - **Kamoshida.** Le 2 voci «persona» di Kamoshida **non sono Ombre**: sono «Parla con Morgana» e «Risveglio Persona di Ryuji», e hanno
     4 stati di partita.
   - **Madarame** non ha voci «persona» nell'istanza.
2. **Le debolezze si leggono dalla guida, non dal compendio.**
   - Le leggono così `BattagliaPage` (`chiaveElementoDaTesto`, `BattagliaPage.tsx:58-61`, `src/utils/elementiGuida.ts:5-25`), le
     piastrelle dei dedali (`PersoneDellArea.tsx:47-50, 117`, da `dettagli.deboleA`), le voci dei Palazzi (`DettagliPunto`) e le Richieste
     (`bersaglio_json`, `RichiestePage.tsx:119-121`).
   - Solo la scheda Persona (`AffinitaGriglia`, `PersonaDettaglioPage.tsx:236-239`) e l'Isolamento
     (`operazioniVellutoService.ts:240-250`) usano `persona_affinita`.
   - Gli elementi hanno nomi diversi nelle due fonti: il compendio dice «Elettricità/Psichico/Oscurità», la guida
     «Tuono/Psicocinesi/Maledizione».
   - Stima delle divergenze con `wk` del compendio: circa 9 su 210 nella Battaglia e circa 6 su 131 nei Memento. Il piano dice 12/210 e
     27/210, quindi il conteggio va rifatto in `dati.md`.
3. **Due strade di cattura.**
   - **Memento**: il tocco sulla piastrella registra la Persona nel compendio (`catturePersona.ts:21-50`, `PersoneDellArea.tsx:73-77`,
     `DungeonDettaglioPage.tsx:201-209`). Lo stato si legge da `compendio_partita`.
   - **Palazzi**: le voci «persona» si segnano in `punto_partita` (Ottenuto / Esaurito / Riapri in `GuidaDellArea`) e non toccano il
     compendio.
   - **Battaglia**: nessuno stato, nessuna cattura.
4. **Iweleth ha due stati.**
   - Come Palazzo (`dungeon iweleth`, tipo `palazzo`): 9 voci «persona» con stato in `punto_partita`.
   - Come dedalo (`mementos-08-iweleth`): le stesse 9 Ombre (`/7..15`), con stato dal compendio.
   - Catturare Lilith nel dedalo non segna la voce del Palazzo, e viceversa.
   - Altri punti di codice: `condizioniSpillo.ts:29` (Iweleth citabile come Palazzo), `collocazioneTokyo.ts:145`, `src/utils/palazzi.ts:5, 41`,
     `DungeonPage.tsx:5-9, 44`, `sezioniGuida.tsx:26`, `MappaMemento.tsx:54`, migrazione `101:45, 53`.
5. **Le strade di registrazione nel compendio sono quattro, con contenuti diversi.**

   | # | Strada | Cosa scrive | Effetto collaterale |
   |---|---|---|---|
   | 1 | Casella in CompendioPersonale o tocco sui Memento (`partiteService.aggiornaCompendio` 491-509) | solo `registrata=1` e livello (anche NULL) | su conflitto azzera `livello_registrato` e lascia bonus e skill vecchi (502-504) |
   | 2 | Aggiunta alla scorta (`aggiungiPosseduta` 618-656, anche dalla fusione `operazioniVellutoService.ts:150-153`) | istantanea completa | — |
   | 3 | «Registra» dalla scorta (`registraPossedutaNelCompendio` 659-673) | — | — |
   | 4 | Migrazione utente 019 | `INSERT OR IGNORE`, livello NULL | nessun evento |

   Nella partita reale ci sono 53 registrazioni; 39 non hanno livello.
6. **Dove si incontra una Persona: tre fonti scollegate.**
   - `persona.aree_mementos_json` e `piani_mementos` in prosa;
   - `persona_area_dedalo` (827 righe; senza piani precisi la Persona finisce in tutte le aree del dedalo, `101:199`);
   - `OmbraDto.dungeonChiave/areaChiave` della Battaglia.

   La scheda Persona mostra solo la riga «Mementos: …» (`PersonaDettaglioPage.tsx:178-180`): niente Palazzi, niente Ombre, niente stato
   di cattura.
7. **Le Persona del party sono testo.** `dati_guida.personaggi[].persona` contiene nomi: 2 su 29 coincidono con il compendio (Arsène,
   Satanael; vedi D7). Il collegamento si fa per nome (`PersonaggiPage.tsx:80`, `PersonaDelPersonaggio.tsx:16-21`).
8. **La personalità si scrive in due modi.** `OmbraDto.personalita` usa «Cupa», «Timida», «Irritabile», «Giocosa». Le Ombre senza
   personalità sono 74, poi c'è 1 «-» e 1 «Non reclutabile». I verdetti della negoziazione usano invece `tratto` in minuscolo.
9. **La normalizzazione delle maschere è duplicata** in tre posti: `maschere.ts:16-43`, migrazione 101 `:57, 174-180`, migrazione utente
   019 `:32-41`.

## 1. «Aiuto in battaglia › Negoziazione» (richiesta del PM)
### 1.1 Come si mostra oggi
Indirizzo: `/guida/battaglia?scheda=negoziazione`. La pagina è `BattagliaPage.tsx`: le schede sono a `:28-34`, la scheda Negoziazione è
`SchedaNegoziazione` a `:135-180`. Dall'alto in basso:
1. **«Quando e come»**: due frasi della guida, la personalità dell'Ombra (Analisi o Rapina) e le tre richieste dell'Hold Up.
2. **«Che cosa ti ha chiesto?»** (`RisposteNegoziazione.tsx:37-122`):
   - un campo di ricerca (`cercaDomande`, `src/utils/negoziazione.ts`: tutte le parole su domanda e risposte);
   - quattro interruttori di carattere (Giocosa, Timida, Irritabile, Cupa), che riordinano le risposte mettendo prima la buona;
   - l'elenco delle domande, 20 alla volta più «Mostra altre (+40)»;
   - per ogni risposta, pastiglie per carattere: ♪ buona, ~ passabile, × cattiva, «?» se incerta. Senza verdetti compare la scritta
     «nessun carattere verificato»;
   - in fondo, l'attribuzione della fonte.
3. **Quattro carte, una per personalità**: descrizione, «Rispondi così» (2 esempi), «Da evitare» (2 categorie), regole, incertezze.

Origine del dato:
- `dati_guida['battaglia'].negoziazione.domande`, servito da `GET /api/compendio/battaglia` (`routes/compendio.ts:193`). La ricerca avviene
  nel browser.
- Le domande arrivano dal file `server/db/dati/negoziazione-domande.json`, che contiene 230 domande e 691 risposte, attraverso la
  migrazione 083 (`083_negoziazione_domande.ts:89-100`). La 084 riapplica `normalizzaDomande` (`:58-80`): un solo verdetto per carattere,
  **il peggiore** se la fonte si contraddice (marcato incerto), e le domande ripetute fuse insieme.
- La fonte è «The Ultimate/Most Complete Guide To Negotiations In Persona 5» (joyce-chen, GooberSD/Chompobar), resa in italiano
  **dall'app**: la nota stessa dice «il gioco in italiano può usare parole diverse».
- Tipi: `TrattoOmbra` e `NegoziazioneDomandaDto` in `shared/types.ts:1663-1673`.

### 1.2 Misure sui dati serviti (GET del 2026-10-20, script di sola lettura)
| Misura | Servito | File sorgente |
|---|---|---|
| Domande | 225 | 230 (5 fuse) |
| Risposte | 680 | 691 |
| Risposte **senza alcun verdetto** | **232 (34%)** | 242 |
| Verdetti incerti | 30 | 7 (+23 nati dalle contraddizioni) |
| Domande con il verdetto di **tutti e 4** i caratteri su ogni risposta | **0** | 0 |
| Domande **senza una risposta buona** per Giocosa | **146 su 225 (65%)** | 142 |
| … per Timida | **157 (70%)** | 159 |
| … per Irritabile | **133 (59%)** | 133 |
| … per Cupa | **152 (68%)** | 154 |
| Risposte senza verdetto per carattere (Giocosa / Timida / Irritabile / Cupa) | 543 / 557 / 480 / 522 su 680 | — |

Quindi, **per umore**, più di metà delle domande non dice quale risposta dare, e un terzo delle risposte non ha nessun verdetto. Il dato
non è completo, e l'interfaccia lo dichiara solo in piccolo: «nessun carattere verificato», «La raccolta non è completa».

### 1.3 Altre cose non corrette, viste nel codice e nei dati
- **Testi non del gioco.** Domande e risposte sono traduzioni dell'app di una guida inglese di **Persona 5** (il titolo non dice Royal),
  non il testo italiano di P5R. La ricerca «per quello che si legge sullo schermo» può quindi non trovare la domanda. Ci sono anche refusi
  (es. «Hai preso un appuntamento, ho?»).
- **Le carte per personalità non coincidono con le domande.** Ho cercato i loro esempi tra le 680 risposte:

  | Carta | Esempio | Cosa dicono le domande |
  |---|---|---|
  | Giocosa | «È per l'automiglioramento» | non c'è in nessuna risposta |
  | Timida | «In realtà sono un ragazzino» | è **passabile** per Timida, non buona |
  | Timida | «Non ce n'è bisogno» | nessun verdetto per Timida |
  | Cupa | «Non ho preoccupazioni» | nessun verdetto per Cupa; c'è solo «passabile» per Giocosa |
  | Irritabile | «Senza impegno?» | non c'è |
  | Cupa | «Non è priva di significato» | non c'è |

  Le categorie «da evitare» («Risposte serie», «vaghe», «gentili», «scherzose») non sono un dato delle risposte: nessuna risposta è
  classificata per tipo, quindi non si possono verificare.
- **«Il peggiore» nasconde l'informazione.** Dove la fonte dice buona e cattiva per lo stesso carattere (24 casi), l'app mostra «cattiva?»,
  e la risposta buona non compare.
- **Nessun legame Ombra → carattere.** `RisposteNegoziazione` accetta `trattoIniziale`, ma `BattagliaPage.tsx:149` non lo passa. Scegliere
  un'Ombra nella scheda «Ombre» non preseleziona il suo carattere, e 74 Ombre su 217 non hanno personalità (più 2 valori fuori dalle 4).
- **Due schede separate.** Durante la trattativa bisogna cambiare scheda («Ombre» → «Negoziazione») e scegliere il carattere a mano.

### 1.4 Schermate «prima»
Cartella `lotti/L8/schermate-prima/`:
- `09-battaglia-negoziazione__{1280x800, 768x1024, 375x812, 1366x657, 1280x689}`;
- la pagina intera `09-battaglia-negoziazione-pagina-intera__1280x3200` e `__375x5200`, dove si vedono la ricerca, i caratteri, le
  pastiglie e le righe «nessun carattere verificato»;
- `10-battaglia-ombre` (5 misure).

### 1.5 Da girare
- La **completezza e la correttezza per umore** sono un problema di **dato e fonte**: le chiede l'utente, quindi vanno all'Esperto della
  guida (il registro guida è `registro.md`). Domande da porgli: (a) esiste una fonte P5R completa per i verdetti dei 4 umori? (b) i testi
  italiani del gioco; (c) le risposte per le 4 carte.
- Il codice (`normalizzaDomande`, `RisposteNegoziazione`) mostra fedelmente quello che ha.

## 2. Altre viste coinvolte (percorsi di oggi)
| Vista | Cosa mostra / fa | Schermata «prima» |
|---|---|---|
| `BattagliaPage` › Ombre (`:75-128`) | ricerca, filtri dungeon / «Debole a» / personalità, carte con maschera → `/compendio/persona/:id` (106-107), area → `/guida/dungeon/<k>?area=<area>` (122); debolezze dalla guida | `01-battaglia`, `10-battaglia-ombre` |
| Memento › dedali (`DungeonDettaglioPage` → `AreeDelDedalo` 501-504 → `PersoneDellArea`) | piastrelle delle Persona dell'area, il tocco registra nel compendio (conferma per togliere), «i» con le debolezze della guida; Trama (`TramaDellArea`) | `02-memento` |
| Richieste (`RichiestePage`) | bersaglio con debolezze da `bersaglio_json` (119-121) | `03-richieste` |
| Iweleth come Palazzo (`/guida/dungeon/iweleth`) | 9 voci «persona» con Ottenuto/Riapri | `04-iweleth` |
| Compendio / scheda Persona (`/compendio/persona/:id`) | affinità dal compendio, «Mementos: …», «Ombra: titolo»; «Aggiungi alla scorta» | `05-compendio`, `06-persona-pixie` |
| Partita (CompendioPersonale, ScortaPersona, Squadra) | casella «registrata» (strada 1), «Registra» (3), aggiunta (2); squadra senza Persona | `07-partita` |
| Kamoshida, voci «persona» (2 non-Ombre) | Ottenuto/Riapri | `08-palazzo-kamoshida-persona` |

Totale: 52 PNG (10 viste × 5 misure, più 2 pagine intere). Partita 1 al 06-01, sola lettura.

## 3. Back-end
**Rotte**

| Area | Metodo e percorso | Riga |
|---|---|---|
| `/api/compendio` | GET `/persona` | 66 |
| | GET `/persona/:id` | 71 |
| | GET `/personaggi` | 109 |
| | GET `/battaglia` | 193 |
| | GET `/richieste` | 196 |
| | GET `/dungeon/:k` | 222 |
| | dedali (aree) | 252-262 |
| | punti | 266-294 |
| `/api/partite` | squadra | 79-87 |
| | `PUT /:id/punti` | 159 |
| | `GET`/`PUT /:id/compendio(/:personaId)` | 169/172 |
| | `/:id/persona` (GET, POST, PUT, DELETE, `registra`) | 187-202 |
| | velluto (fusione, forca, isolamento) | 256-269 |

**Servizi**
- `battagliaService` 13-19;
- `catturePersona` 21-50;
- `compendioService` 64-113, 210-285;
- `dungeonService` 48-62, 311-375, 557-563, 624-694, 910-919, 1082-1088, 1237;
- `partiteService` 410-509, 531-746;
- `operazioniVellutoService` 126-297;
- `squadraService` 29-105;
- `maschere.ts` 16-43.

**Schemi**
- `schemas/partite.ts`: `bodyCompendio` 63-66, `campiPosseduta` 80-89, `bodyAggiungiPosseduta` 91, `bodyStatoPunto` 201,
  velluto 146-162, squadra 213-225.
- `schemas/guidaDungeon.ts`: `TIPI_PUNTO` 19, `dettaglioPunto` 21-26, persona e `areeDedalo` 43-46.
- Le Ombre non hanno uno schema: sono testo della guida.

## 4. Schema e stato di partita
- **Gioco**:
  - `persona` (001:30-52, 024);
  - `persona_affinita` (001:57-62, 2320 righe);
  - `traduzione` (ambiti `persona`, `elementoAffinita`, `affinita`);
  - `skill.negoziazione`;
  - `dati_guida` riga `battaglia` (014:32-35);
  - `punto_interesse` (013, 095, 099);
  - `area_dedalo` (099:31-38);
  - `persona_area_dedalo` (101:142-147);
  - `richiesta.bersaglio_json` (014:17).
- **Partite** (`schemaUtente.ts`):
  - `compendio_partita` (30);
  - `persona_posseduta` (51, UNIQUE per Persona) e `persona_posseduta_skill` (52);
  - `punto_partita` (60);
  - `membro_squadra_partita` (44);
  - migrazioni utente 019 (catture → compendio), 018 e 020 (timbri).

## 5. DTO
Tutti in `shared/types.ts`:

| DTO | Righe |
|---|---|
| `AffinitaDto` | 41-48 |
| `PersonaRiassuntoDto` | 54-71 |
| `PersonaDettaglioDto` | 106-134 |
| `MembroSquadraDto` | 499-515 |
| `CompendioPartitaDto` | 625-642 |
| `PersonaPossedutaDto` | ≈647-680 |
| `PersonaggioDto.persona: string[]` | 944 |
| `OmbraDto` | 1646-1661 |
| `TrattoOmbra`, `EsitoRisposta`, `NegoziazioneDomandaDto` | 1663-1673 |
| `BattagliaDto` | 1675-1696 |
| `RichiestaDto.bersaglio` | 1711 |
| `PuntoInteresseDto` (`persona` 1785, `areeDedalo` 1788) | — |
| `PersonaDellaMascheraDto` | 1793 |
| `AreaDungeonDto.dedalo` | 1820 |
| `AreaDedaloDto`, `DedaloDto` | 1842-1865 |
| `DungeonDettaglioDto.personeCatturate` | ≈1948 |

**I contratti dei dedali (`AreaDedaloDto`, `DedaloDto`, `AreaDungeonDto.dedalo`) non vanno toccati**: i Memento sono il modello di
riferimento.

## 6. Test coinvolti
**Server**
- `battaglia.test.ts` (19, 39-59: 10 dungeon compreso `iweleth`, Bicorno «Cupa» → Bicorn);
- `memento-persona-trama.test.ts` (34-90);
- `aree-dei-dedali.test.ts` (65, 136, 176);
- `condizioni-voce.test.ts` (162-196);
- `api.test.ts` (155, 286: registrazione e scorta);
- `squadra.test.ts`, `operazioniVelluto.test.ts`, `fusione.test.ts`, `cicli.test.ts`, `dungeon.test.ts:73`, `personaggi.test.ts`;
- `maschere.test.ts`;
- migrazioni 019 (utente), 083, 101.

**FE**
- `BattagliaPage.test.tsx:39`;
- `RichiestePage.test.tsx`;
- `DungeonDettaglioPage.test.tsx` (329-355);
- `PersoneDellArea.test.tsx`, `AreeDelDedalo.test.tsx`, `ModuloPersona.test.tsx`, `TramaDellArea.test.tsx`;
- `RisposteNegoziazione.test.tsx` (33-65);
- `ScortaPersona.test.tsx`, `SquadraPartita.test.tsx`, `AffinitaGriglia.test.tsx`, `CicliSalvati.test.tsx`.

**Mancano**: un test per `PersonaDettaglioPage`, `CompendioPersonale` e `PersonaggiPage`.

## 7. Cosa cambierà per l'utente
1. Ogni Ombra ha una pagina (`/guida/ombra/<k>`): nome, Persona, **debolezze del compendio**, dove si incontra (Palazzo o dedalo),
   personalità, negoziazione. Le copie di Battaglia, dedali e voci diventano link a quella pagina.
2. **Catturare un'Ombra, ovunque, registra la sua Persona**; lo stato si legge dal compendio, anche in Battaglia e nei Palazzi. Iweleth
   ha un solo stato (D3: solo dedalo).
3. La scheda Persona dice dove si incontra e se è registrata.
4. Registrare una Persona diventa una strada sola.
5. Le Persona del party portano alla loro scheda (D7).
6. I dedali dei Memento restano come sono.
7. Per la negoziazione, il collegamento Ombra → carattere permette di aprire le risposte già ordinate per quell'Ombra. La completezza delle
   risposte dipende dal dato (§1.5).

## 8. Segnalazioni per Stesura modifiche (fatti, non progetto)
- **A.** Le 2 voci «persona» di Kamoshida non sono Ombre (§0.1): non vanno convertite in Ombre. Il piano (44) conta il pacchetto, non i
  dati dell'utente (41).
- **B.** La strada 1 di registrazione azzera il livello e lascia un'istantanea vecchia (§0.5): da tenere presente per «una strada».
- **C.** La negoziazione (§1) ha un problema di dato prima che di interfaccia: elenco delle domande per l'Esperto della guida.
- **D.** I nomi degli elementi del compendio e della guida sono diversi (§0.2): per «debolezze dal compendio» serve una sola resa in
  italiano.
- **E.** `persona_area_dedalo` mette in tutte le aree del dedalo le Persona senza piani precisi: «dove si incontra» erediterà questa
  approssimazione.
