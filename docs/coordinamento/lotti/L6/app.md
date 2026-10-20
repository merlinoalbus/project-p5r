# L6 «Condizioni uniche» — analisi dell'app attuale

Autore: sessione «Analisi app attuale» (2026-10-20).

Fonti e modalità:
- codice letto in sola lettura dalla cartella di sviluppo `C:\Repository\project-p5r\.claude\worktrees\pensive-burnell-b50941`
  (`newreview`);
- `data/gioco.db` aperto in sola lettura;
- FE e BE interrogati solo con GET;
- criteri incrociati con `requisiti.md` (R6-01…R6-31).

## 0. Fatti che contano per il progetto
1. **I vocabolari sono quattro, non uno.**
   - **`RequisitoSpillo`**, 27 tipi (`shared/condizioniSpillo.ts:79-122`). Comprende gruppo, non, data, intervallo, fascia, piove, meteo,
     giorno-settimana, stagione, quartiere, arco, palazzo, dote, confidente, squadra, richiesta, lettura, articolo, attività, rango-cliente,
     punti-negozio, evento, contatore, persona-arcano, persona-abilità, spillo, voce-guida.
   - **`RequisitoRango`** dei Confidenti, 12 tipi compresi `avviso` e `manuale` (`shared/types.ts:179-196`). Nel DB ci sono:
     data 54, meteo 63, dote 17, palazzo 15, richiesta 11, persona-abilità 10, evento 5, confidente 1, avviso 1.
   - **`STATI_PARTITA`**, i 24 stati dell'editor (`shared/statiPartita.ts:48-90`).
   - **`OrariNegozio`**, tradotto in condizioni da `orariComeCondizioni` (`shared/orariNegozio.ts:65-71`).

   La presenza ereditata dalle entità (`presenzaEntita.ts:19-25`) aggiunge una quinta traduzione.
2. **I valutatori sono almeno otto.**
   - `disponibilitaService.valutaRequisito` (`:175-314`), che per i tipi `RequisitoRango` delega a `semaforiService.valuta` (`:98-190`).
   - `cittaService.disponibilitaQuartiere` (`:111-117`), più le regole dei luoghi (`:56-85`).
   - `negoziService` (`:48-68`).
   - `attivitaService.conDisponibilita` (`:32-39`).
   - `mappeService.dettagliSpillo` (`:353-384`), in AND con `conNegozioVivo` e `senzaIngressoAPalazzoCompletato`.
   - Mini-valutatori del server: `palazziService.apertoIl` (`:213-217`), `atterraggioPalazziService.regolaCopre` (`:45-49`),
     `arcoAllaData` (`disponibilitaService.ts:105-114`).
   - Valutatori nell'interfaccia: `aperturaTokyo.quartiereAperto` e `dentroFinestra` (`src/components/mappe/aperturaTokyo.ts:18-38`),
     `VisoreMappa.nascostoPerCondizioni` (`:198-200`), `NavigazioneSpillo.tsx:15`, `utils/letture.bloccata` (`:15`),
     `ChipDisponibilita.tsx:42`, `ConfidentiPartita.tsx:46`.
3. **«Quartiere aperto» ha sei significati.**
   - (a) La Città e la metro usano `disponibile` del server (regole `dati_guida.sblocco-quartieri`) **in AND** con `sbloccoData` nell'interfaccia
     (`aperturaTokyo.ts:36-37`). Così le aperture alternative calcolate dal server vengono annullate: Ikebukuro, Odaiba e Maihama restano
     chiusi fino alla data anche se un libro o un Confidente li ha già aperti.
   - (b) La condizione `quartiere` guarda solo `sblocco_data` e, se manca, dà rosso (`disponibilitaService.ts:292-299`). L'esito porta
     per giunta l'etichetta sbagliata `tipo: 'data'`.
   - (c) Sui pin solo i quartieri con una data ricevono la condizione (`sincronizzaMappe.ts:122-124, 198`).
   - (d) L'editor e il validatore offrono solo i 7 quartieri con data (`CondizioniEditor.tsx:49`, `mappeService.ts:1140-1143`).
   - (e) Il convertitore converte solo quei 7 (`migraCondizioni.ts:140-147`).
   - (f) La regola del luogo non è in AND con quella del suo quartiere (`cittaService.ts:60-72`).
4. **Perché 13 quartieri sono sempre rossi.** Kanda-Jinbocho, Harajuku, Ueno, Inokashira, Shinagawa, Nakano, Ogikubo, Chinatown,
   Roppongi, Tsukishima, Santuario Meiji, Ichigaya e Asakusa hanno lo sblocco solo in prosa e `sblocco_data` NULL (verificato su
   `data/gioco.db`). `dataSbloccoQuartiere` (`condizioniSpillo.ts:211-221`) estrae una data solo se la frase comincia con una data.
   La condizione `quartiere` risponde «la Guida non indica una data di sblocco».
   Anche Yongen-Jaya, Shibuya e Shujin hanno `sblocco_data` NULL ma nessuna frase: con la condizione risulterebbero rossi (16 in tutto).
5. **Il visore nasconde anche i prerequisiti.** Il server distingue «bloccato» (presenza) da «ignoto» (prerequisito)
   (`valutaRequisitiSpillo` `:327-343`, `CONDIZIONI_DI_PRESENZA` `condizioniSpillo.ts:146-148`). Il visore però nasconde ogni pin non
   «disponibile» (`VisoreMappa.tsx:198-200, 532-546`), come dichiara anche il test `visibilitaCondizionale.test.ts:122`.
6. **Riferimenti per nome.**
   - Requisiti «richiesta» dei Confidenti: 11 righe con il nome in `dati_json`. Il valutatore accetta sia la chiave sia il nome minuscolo
     (`semaforiService.ts:69-72, 131-141`).
   - Rinomina ed eliminazione di una Richiesta riscrivono i riferimenti, e l'eliminazione **torna al nome** in requisiti e `condizioni_json`
     (`richiesteService.ts:207-227, 239-299`).
   - `persona-abilita` usa i nomi di Persona e skill (`semaforiService.ts:66-68, 115-119`; elenco `routes/condizioni.ts:56-57`).
   - Il convertitore ha alias scritti a mano (`migraCondizioni.ts:51-68`).
   - I libri che sbloccano posti: la prosa diventa un effetto `sblocca-luogo` (061/074) che si **mostra soltanto** (`attivitaService.ts:94-100`
     → `LibriPage.tsx:138`), non si valuta.
   - Gli eventi del calendario sono prosa.
7. **Odaiba e Asakusa.** I libri `luoghi-della-movida` (Odaiba) e `shitamachi-rinato` (Asakusa) dichiarano di sbloccare il quartiere, ma le
   regole `sblocco-quartieri` non li citano:
   - Odaiba: «06-01 oppure Ann 10»;
   - Asakusa: «Ann 7».

   Le regole dei luoghi interni dicono altro: `odaiba-seaside-park` = libro oppure 06-01; `tokyo-skytree` = libro.
   Per R6-10, Asakusa segue il rango 7 di Ann (Esperto della guida, G-009).
8. **La finestra dei Palazzi ha sette copie.**
   1. Prosa `dungeon.data_sblocco` e `data_scadenza`.
   2. `dati_guida.finestre-dungeon`, l'unico lettore con cache (`datiGuida.ts:71-95`), scritto da `impostaFinestra`
      (`atterraggioPalazziService.ts:109-124`).
   3. Copie sulle `condizioni_json` dei pin d'ingresso fatte alla sincronizzazione (`sincronizzaMappe.ts:130-132, 195-204, 230-266`), che
      **non si aggiornano** quando cambia la finestra.
   4. `dungeon_atterraggio`.
   5. Intervalli «durante l'arco» fissati nel catalogo (`migraCondizioni.ts:117-119`).
   6. Eventi del calendario.
   7. Requisiti con date.

   L'atterraggio segue due regole sulla **stessa voce del diario**:
   - `atterraggioDelGiorno` (`atterraggioPalazziService.ts:65-70`, campo `atterraggio`, `giornataService.ts:99`);
   - `palazziService.ingressoDelPalazzo` con `apertoIl` (`:188-217`, campo `mappa` via `mappaAzione`, `giornataService.ts:97`).
9. **La data di sblocco di un Confidente ha tre copie.**
   - Il requisito del rango 1 (`confidente_requisito`) alimenta i semafori e il blocco (`partiteService.ts:293-301, 359-367`).
   - La prosa `confidente_disponibilita.sblocco_data` è mostrata nella scheda (`ConfidenteDettaglioPage.tsx:127`).
   - Gli eventi `sblocco` del calendario sono mostrati solo lì.

   Divergenze verificate:

   | Confidente | Requisito | Scheda | Calendario |
   |---|---|---|---|
   | Yusuke | 06-18 | — | 06-17 |
   | Takemi | 04-15 | 18 aprile | 04-18 |
   | Kawakami | 06-04 | 3-4 giugno | 06-06 |
   | Ohya | 06-18 | 5 luglio | — |
   | Hifumi | 06-28 | — | 07-02 |
   | Gemelle | 05-18 | — | 05-19 |

   Altri cinque Confidenti hanno la data solo in prosa o solo nel calendario.

## 1. Editor delle condizioni oggi
| Editor | File:riga | Dove si usa | Tipi |
|---|---|---|---|
| `CondizioniEditor` | `src/components/guida/CondizioniEditor.tsx:246-283` (profondità 4: `:225`) | pin dell'editor mappe (`EditorMappaPage.tsx:671`, solo se `ammetteCondizioni`); copie dei pezzi (`FormPezzo.tsx:126`); catalogo: articolo, libro, film, attività, videogioco, luogo (`ModuloCatalogo.tsx:137`, `moduli/definizioni.ts:42, 71, 82, 107, 143`); schede senza mappa (`SchedaContenutoGuida.tsx:55`); condizioni degli effetti (`EditorEffetti.tsx:57`) | i 24 stati; quartieri solo con data (`:49`); niente pin né voci fuori dalle mappe |
| `OrariEditor` | `OrariEditor.tsx:33` | negozio (`ModuloNegozio.tsx:49`) | giorni, fasce, pioggia, nota |
| `ModuloLuogo` | `ModuloLuogo.tsx:39, 43` | luogo | `quando`, `giorni_json` (separati da `condizioni_json`) |
| `AtterraggioTokyo` | `AtterraggioTokyo.tsx:72-169` | scheda del Palazzo | finestra e regole d'atterraggio |
| Date dei Palazzi | `DungeonDettaglioPage.tsx:≈409-416` | scheda del Palazzo | prosa |
| `CorreggiRequisito` | `src/components/partita/CorreggiRequisito.tsx:32` | Confidente in Partita | solo i requisiti «richiesta» (sostituisci o togli; `routes/compendio.ts:309-317`) |

**Senza editor:**
- lo sblocco dei quartieri (`sblocco`, `sblocco_data`, `sblocco-quartieri`);
- `sblocco-luoghi`;
- gli altri tipi di `RequisitoRango`;
- `confidente_disponibilita`;
- `evento_calendario`;
- negozio, domanda e cruciverba (`definizioni.ts:17, 183`).

R6-07 chiede un solo editor.

## 2. Percorsi dell'utente di oggi
| # | Dove | Cosa vede oggi | Schermata «prima» |
|---|---|---|---|
| C1 | La città, metro | fermate chiuse con «dal 06-18» (data grezza MM-GG) o motivo; i 13 quartieri si aprono secondo `sblocco-quartieri` | `01-citta-metro` |
| C2 | Quartiere Odaiba / Asakusa | «Si apre: …» in prosa; carte dei luoghi con il loro sblocco | `02-quartiere-odaiba`, `03-quartiere-asakusa` |
| C3 | Libri | «Apre» → collegamento al quartiere, senza effetto sullo sblocco | `04-libri` |
| C4 | Confidente Takemi | data di sblocco in prosa («18 aprile») mentre il requisito dice 04-15 | `05-confidente-takemi` |
| C5 | Negozio Clinica Takemi | presenza dagli orari; sblocco solo sugli articoli | `06-negozio-takemi` |
| C6 | Calendario | tag Sblocco/Scadenza dagli eventi in prosa | `07-calendario` |
| C7 | Scheda del Palazzo | «Si apre / Furto consigliato / Scade» (prosa tagliata da `dataBreve`) e «Sulla mappa di Tokyo dal … al …» (finestra) | `08-palazzo-madarame-date` |
| C8 | Richieste, Partita (semafori dei Confidenti), Home (mappa di Tokyo) | esiti dei requisiti | `09-richieste`, `10-partita`, `11-mappa-tokyo-oggi` |
| C9 | Editor della mappa | pannello del pin con `CondizioniEditor` (aprendo un pin: non fotografabile senza clic) | `12-editor-pin-condizioni` |

Schermate in `lotti/L6/schermate-prima/`: 60 PNG (12 viste × 5 misure), partita 1 al 06-01, sola lettura.

## 3. Back-end
**Rotte**
- `server/routes/condizioni.ts`: elenchi (51-57), pin citabili (71), voci (77), progressi (83-112), punti negozio (141).
- `server/routes/compendio.ts`: `/citta` (173), `/dungeon/:k/finestra` (229-233), `/dungeon/:k/atterraggi` (235), requisiti dei Confidenti
  (309-317).
- `server/routes/catalogo.ts`: scrittura con `migraTestiCondizioni` (`catalogoService.ts:257-260, 333-334`).

**Servizi**
- `disponibilitaService` (44-49, 99-114, 124, 143-161, 175-350).
- `semaforiService` (26-29, 65-75, 98-204).
- `requisitiConfidentiService` (28-46).
- `cittaService` (56-130).
- `negoziService` (48-68), `attivitaService` (32-39, 94-100).
- `mappeService` (290-300, 327-384, 1100, 1115-1165, 1135-1161).
- `palazziService` (188-217), `atterraggioPalazziService` (45-124).
- `datiGuida.ts` (71-95).
- `sincronizzaMappe.ts` (117-132, 195-266), `presenzaEntita.ts` (19-120).
- `server/services/condizioni/contestoConversione.ts` (22-75), `nomiCondizioni.ts` (25-101).
- `richiesteService.ts` (207-299).

**Pacchetti**
- `gioco.db` intero (`pacchetto/pacchettoGioco.ts`).
- Mappe: `esportaMappe` (1486, condizioni 1504) e `importaMappe` (1628). Le condizioni con chiavi assenti si scartano e si contano
  (1624, 1760, 1800, 1893-1901).
- Conversione delle forme vecchie: `shared/migraCondizioni.ts` (`convertiProsa` 267-279, `migraTestiCondizioni` 282-284), usato dalle
  migrazioni 036, 052, 064, 068, 070 e dal catalogo.

## 4. DTO
- `shared/types.ts`:
  - requisiti: `RequisitoRango` 179, `SemaforoRequisitoDto` 552, `SemaforiRangoDto` 571;
  - Confidenti: `ConfidenteDettaglioDto.disponibilita` 239, `ConfidentePartitaDto` 578;
  - diario: `AzionePercorsoDto.atterraggio` 1143;
  - negozi e luoghi: `NegozioRiassuntoDto` 1290, `DisponibilitaDto` 1316, `ArticoloDto` 1321, `LuogoDto` 1420;
  - quartieri: `QuartiereRiassuntoDto` (`sbloccoData` 1402, `disponibile` 1415, `bloccoMotivo` 1417);
  - catalogo: `LibroDto.sbloccaLuogo` 1532-1533;
  - Palazzi e calendario: `DungeonRiassuntoDto` 1867, `AtterraggioPalazzoDto` 1905, `GiornoCalendarioDto` 1955, `CalendarioDto` 1976;
  - pin e pezzi: `CondizioneSpilloDto` 2084, `SpilloDto` 2123, `CopiaPezzoDto` 2219, `DatiCopiaPezzo` 2246, `EsportazioneMappeDto` 2278;
  - elenchi: `ElenchiRegoleDto` 2454, `PinConStatoDto` 2472, `VoceCitabileDto` 2480, `ProgressiPartitaDto` 2491.
- Altri file di `shared/`:
  - `condizioniSpillo.ts` (79, 231);
  - `statiPartita.ts` (33, 93);
  - `orariNegozio.ts` (20);
  - `migraCondizioni.ts` (26, 46);
  - `effettiCatalogo.ts` (22);
  - `effettiOggetto.ts` (110).

## 5. Test coinvolti
**Server**
- `condizioni.test.ts`: quartiere sul dato materializzato (122), squadra (96-100).
- `condizioni-pin.test.ts`, `condizioni-voce.test.ts`.
- `semafori.test.ts`, `requisiti-eventi.test.ts`.
- `citta.test.ts`: aperti l'11 aprile e a fine gioco (66-84). Non c'è un test sulla condizione `quartiere` per i 13.
- `atterraggio-palazzi.test.ts`, `finestreDungeon.test.ts`, `sulla-mappa-palazzo.test.ts`.
- `visibilitaCondizionale.test.ts` (122-139), `disponibilitaService.test.ts` (prosa del seed, 117).
- `shared/condizioniSpillo.test.ts` (30-39), `shared/statiPartita.test.ts`.

**FE**
- `CondizioniEditor.test.tsx`, `AtterraggioTokyo.test.tsx`, `CorreggiRequisito.test.tsx`.
- `MappaTokyo.test.tsx`, `CittaPage.test.tsx`.
- `quartiereAperto` e `dentroFinestra` non hanno un test dedicato.

## 6. Cosa cambierà per l'utente
1. Una sola regola decide se un quartiere, un luogo, un negozio, un pin, un Confidente o un Palazzo sono aperti, e la stessa risposta
   compare in metro, città, scheda, visore, calendario e diario. Oggi metro e condizione «quartiere» rispondono in modo diverso, e 13
   quartieri risultano sempre chiusi nelle condizioni.
2. Odaiba si apre con il libro «Luoghi della movida», Asakusa con il rango 7 di Ann. La Clinica ha una data per il negozio (16/4) e una per
   il Confidente (18/4).
3. I libri che sbloccano un posto lo sbloccano davvero: oggi è solo un'etichetta.
4. Un solo editor delle condizioni, lo stesso ovunque. Si sceglie per nome e si salva per chiave.
5. Rinominare o eliminare una Richiesta non trasforma più i riferimenti in nomi.
6. Calendario e date dei Confidenti si ricavano dai requisiti e dalla finestra del Palazzo: le divergenze del §0.9 spariscono.

## 7. Segnalazioni per Stesura modifiche (fatti, non progetto)
- **A.** Il visore nasconde prerequisiti e presenza allo stesso modo (§0.5). Con un valutatore unico bisogna decidere cosa mostrare come
  «non ancora disponibile» e cosa nascondere.
- **B.** Le condizioni copiate sui pin alla sincronizzazione (finestra e quartiere) non seguono le modifiche (§0.8). In più i pin di città
  non ammettono condizioni (`spilli.ts:78-80`). La presenza va calcolata dal vivo.
- **C.** L'interfaccia rivaluta la data dopo il verdetto del server (`aperturaTokyo.ts:36-37`): con un solo valutatore questa seconda
  valutazione va tolta.
- **D.** La voce del diario porta due regole d'atterraggio (`mappa` e `atterraggio`). Va tenuta presente anche per L10 («Entra»).
- **E.** `CittaPage` ricarica i quartieri solo quando cambia la partita, non quando cambia il giorno (`CittaPage.tsx:42`).

## 8. Rilettura contro il codice attuale (2026-10-20 ~08:15, pensive `newreview`, L2+L3+L4 nella cartella di lavoro, commit fino a 2f9e6c7f)
Base della prima stesura: codice delle ~02:20 (ultimo commit bd20ed72). Dei file citati sopra **sono cambiati**: `shared/types.ts`,
`disponibilitaService`, `semaforiService`, `cittaService`, `mappeService`, `palazziService`, `giornataService`, `VisoreMappa`, `EditorMappaPage`,
`AtterraggioTokyo`, `DungeonDettaglioPage`, `routes/compendio.ts`, `CittaPage`. Gli altri sono **invariati** (`condizioniSpillo`, `statiPartita`,
`orariNegozio`, `migraCondizioni`, `aperturaTokyo`, `CondizioniEditor`, `sincronizzaMappe`, `richiesteService`, `datiGuida`, `atterraggioPalazziService`,
`attivitaService`, `negoziService`, `LibriPage`, ecc.).

### 8.1 Cambi di comportamento che toccano L6 (portati da L4, §8.10)
- **Palazzo «concluso» al posto di «completato»** in tutti i valutatori che guardano un Palazzo. Il requisito `palazzo` dei Confidenti e delle
  condizioni usa `st.palazziConclusi` (Tesoro e boss finale; la raccolta al 100% vale solo per l'anello): `semaforiService.ts:122-131`, stato a
  `:86-88`, fonte `palazziService.palazziConclusi` (`:183`) e `statoPalazzi` (importato in `semaforiService.ts:14`). Dettaglio rosso: «non risulta
  concluso — manca …» con quel che manca (`palazziMancanze`).
- **L'ingresso al Palazzo sparisce a «concluso»**, non più a «completato»: `mappeService.senzaIngressoAPalazzoCompletato` (`:358-369`, nome
  invariato, legge `palazziConclusi`; requisito aggiunto `tipo: 'palazzo'`, «non ancora concluso»). È uno dei valutatori del §0.2.
- Il boss finale oggi viene ancora dall'euristica; con la migrazione 112 di L4 (`dungeon.voce_boss_finale`) diventa la voce dichiarata (§8.14 di
  L4). Per L6 conta che «Palazzo concluso» sia **un solo fatto** letto da semafori, condizioni dei pin e ingressi: lo è già (una sola fonte,
  `palazziService`).

### 8.2 Fatti del §0 ancora veri (verificati sul codice attuale)
- §0.3 (b): la condizione `quartiere` dà ancora rosso senza `sblocco_data` ed etichetta `tipo: 'data'` (`disponibilitaService.ts:297-303`).
- §0.3 (a) e §7.C: `quartiereAperto` rivaluta ancora la data dopo il server (`aperturaTokyo.ts:32-37`, invariato).
- §0.3 (d): editor e validatore offrono solo i quartieri con data (`CondizioniEditor.tsx:49`; `mappeService.ts:1264, 1300`).
- §0.3 (f): la regola del luogo resta sua, senza AND con il quartiere (`cittaService.luogoDto` `:58-77`).
- §0.5 e §7.A: il visore nasconde ancora ogni pin non «disponibile» (`VisoreMappa.nascostoPerCondizioni` `:229-231`, uso `:547, 581, 587`).
- §0.8 e §7.D: due regole d'atterraggio sulla voce del diario (`giornataService.ts:104` `mappa`, `:106` `atterraggio`).
- §7.B: i pin di città senza condizioni (`shared/spilli.ts:72-78`, `ammetteCondizioni`; il file è `shared/spilli.ts`, non `routes/spilli.ts`).
- §7.E: `CittaPage` ricarica i quartieri solo al cambio di partita (`CittaPage.tsx:43`). Le radici del Metaverso invece si ricaricano anche al
  cambio di giorno (`:55`, per l'atterraggio).

### 8.3 Righe spostate (sostituiscono quelle del testo sopra)
| Riferimento sopra | Ora |
|---|---|
| `RequisitoRango` `types.ts:179-196` | `:181` |
| `valutaRequisito` `disponibilitaService.ts:175-314` | `:180`; `case 'quartiere'` `:297`; `valutaRequisitiSpillo` `:332` (era 327) |
| `semaforiService.valuta` `:98-190` | `:99`; `palazzo` `:122`; `persona-abilita` `:116`; richieste `:70-73` |
| `cittaService.disponibilitaQuartiere` `:111-117`; regole luoghi `:56-85` | `:113`; `luogoDto` `:58-77`, `regoleSbloccoLuoghi` `:79`, `regoleSblocco` `:100` |
| `mappeService.dettagliSpillo` `:353-384` | `:421` (AND a `:445-452`); `conNegozioVivo` `:402`; `senzaIngresso…` `:358` |
| `mappeService` validatore `:1140-1143`; `esportaMappe` 1486; `importaMappe` 1628 | `:1264-1300`; `:1694`; `:1951` |
| `palazziService.ingressoDelPalazzo`/`apertoIl` `:188-217` | `:212-241` (`apertoIl` `:237`) |
| `VisoreMappa.nascostoPerCondizioni` `:198-200`, `:532-546` | `:229-231`, `:547-587` |
| `giornataService.ts:97, 99` | `:104, 106` |
| `EditorMappaPage.tsx:671` | `:712` |
| Date dei Palazzi `DungeonDettaglioPage.tsx:≈409-416` | `:77-92` (targhette) e `:423` |
| `routes/compendio.ts` `/citta` 173, finestra 229-233, atterraggi 235, requisiti 309-317 | 190, 263, 268, 349-355 |
| DTO: `SemaforoRequisitoDto` 552, `SemaforiRangoDto` 571, `ConfidentePartitaDto` 578, `AzionePercorsoDto.atterraggio` 1143, `NegozioRiassuntoDto` 1290, `DisponibilitaDto` 1316, `ArticoloDto` 1321, `LuogoDto` 1420, `QuartiereRiassuntoDto` 1402/1415/1417, `LibroDto.sbloccaLuogo` 1532, `DungeonRiassuntoDto` 1867, `AtterraggioPalazzoDto` 1905, `GiornoCalendarioDto` 1955, `CalendarioDto` 1976, `SpilloDto` 2123, `CopiaPezzoDto` 2219, `DatiCopiaPezzo` 2246, `EsportazioneMappeDto` 2278, `ElenchiRegoleDto` 2454, `PinConStatoDto` 2472, `VoceCitabileDto` 2480, `ProgressiPartitaDto` 2491 | 554, 573, 580, 1145, 1316, 1342, 1347, 1527, 1502 (`sbloccoData` 1509, `disponibile` 1522, `bloccoMotivo` 1524), 1641, 2009, 2087, 2146, 2167, 2326, 2443, 2470, 2513, 2704, 2722, 2730, 2741 |
| Percorsi dei file | `ChipDisponibilita` → `src/components/guida/`; `FormPezzo` e `SchedaContenutoGuida` → `src/components/mappe/`; `ModuloNegozio` e `ModuloLuogo` → `src/components/guida/moduli/` |

### 8.4 Novità di L2 che L6 deve sapere
- I quartieri ora hanno le **Aree** (L2): `QuartiereRiassuntoDto.aree` (numero) e il dettaglio con l'elenco (`cittaService.ts:128-133, 150-156`);
  l'ingresso del quartiere è un'Area più un punto (`impostaIngressoQuartiere`, `area_chiave`). Nessuna regola di sblocco sulle Aree: lo sblocco
  resta del quartiere e del luogo. Se L6 vuole che un'Area (o una planimetria) erediti l'apertura del quartiere, va detto nel progetto.
- `CittaPage` mostra l'illustrazione «spenta» per i quartieri chiusi (`spenta={!aperto}`, con `aperto = quartiereAperto(...)`, `:88, 100`): il
  doppio giudizio del §0.3 (a) ora decide anche l'illustrazione.
