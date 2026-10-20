# L3 «Palazzi: aree e infiltrazioni» — analisi dell'app attuale

Autore: sessione «Analisi app attuale» (2026-10-20). Sola lettura: codice della cartella di sviluppo
`C:\Repository\project-p5r\.claude\worktrees\pensive-burnell-b50941` (branch `newreview`, con modifiche di L1 non committate in
`dungeonService.ts`, `mappeService.ts`, `DungeonDettaglioPage.tsx`, `EmblemaDungeon.tsx`, `shared/types.ts`: in `DungeonDettaglioPage.tsx`
le righe si sono già spostate di +4 durante l'analisi, quindi valgono ±5), DB `data/gioco.db` in sola lettura (`user_version` 107, poi
108 per la migrazione L1 delle miniature, che non cambia i dati visibili), FE http://localhost:5373 e BE http://localhost:3201 solo
con GET. Nessuna scrittura e nessuna partita di prova: non ho provato azioni che scrivono.
Fonti incrociate: `requisiti.md` (R3-01…R3-41, casi dubbi 1-10), `ricognizione-L3-palazzi.md` (ogni riferimento verificato, §9).

## 0. Fatti nuovi rispetto a ricognizione e requisiti
1. **Oggi si arriva alla griglia quasi da ovunque.** «Mappa del Palazzo» nella scheda (`DungeonDettaglioPage.tsx:435`,
   `CollegamentoMappa tipo="dungeon"`) e la metro senza atterraggio (`MappaTokyo.tsx:391-393` → `/guida/mondo/dungeon/<k>`) passano dal
   risolutore. `GET /api/mappe/accesso/dungeon/madarame` dà come destinazione unica `palazzo-di-madarame` (criterio `entita-mappa`).
   La radice ha ruolo `emblema` (`shared/immaginiMappa.ts:30`), quindi `haPlanimetria` è falso e si apre `LuogoSenzaPlanimetria`
   (`MappaPage.tsx:234-279`, 390), cioè la **griglia**. Il commento a `MappaTokyo.tsx:389-390` dice «resta la scheda del Palazzo», ma
   non è così. Oggi (partita 1, 06-01) Madarame non ha atterraggio, quindi **la metro porta alla griglia di Madarame**; Kamoshida
   atterra su `151-1-0` (Cancello del castello). Solo la carta in `DungeonPage` va già alla scheda (`schedaAccessoMondo('dungeon')`).
2. **Trappola degli alias anche nei Palazzi.** `GET /api/mappe/risolvi/palazzo-di-madarame-museo-1p` restituisce
   `…-museo-1p-nativo-rmap-153-2-1` (la seconda versione, 3 pin), non `153-2-0` (52 pin). Schermata `13-alias-museo-1p`.
3. **Il diario porta nei Palazzi in tre modi.**
   - Collegamento della voce: `collegamentoAzione` in `src/utils/percorso.ts:36-38` porta all'atterraggio (`urlMappa(planimetria, {spillo})`)
     o a `/guida/dungeon/<k>`, **senza `?area=`**: si apre sulla prima infiltrazione (`DungeonDettaglioPage.tsx:138`, `d.aree[0]`), non
     su quella del giorno.
   - Cartellino: `CartelliniAzione` in `PartiAzione.tsx:42-50`.
   - «Sulla mappa»: `PartiAzione.tsx:52-55` usa `a.mappa` = `ingressoDelPalazzo` (`palazziService.ts:188-209`).
   - Nel codice **non esiste un pulsante «Entra»** (R3-37 descrive la vista futura).
   - Misura sul diario validato 04-01..06-01 (GET della giornata, partita 1): **10 voci** con «Sulla mappa» verso planimetrie dei Palazzi,
     7 verso `nativo-rmap-153-1-0` (Madarame) e 3 verso `152-1-0` (Kamoshida), più 2 verso i Memento (`190-1-0`). Nella guida giorno per
     giorno aprono `/guida/mappe/<chiave>?spillo=` (`PercorsoPage.tsx:81`), in Oggi la mappa della colonna.
4. **«— scegli una planimetria —»** compare in un solo punto: il selettore «Collega anche a» dentro la piega dell'infiltrazione
   (`DungeonDettaglioPage.tsx:584`, piega ≈579-596). C'è anche «— scegli —» in «Collega una planimetria» (≈638-648). La ricognizione
   indicava 551-573: è sbagliato.
5. **«Aggiungi» nel Palazzo crea una mappa sciolta.** Il pulsante (`PlanimetriePalazzo.tsx:349`) fa
   `creaMappa({tipo:'area', genitore:'dungeon-<k>'})` → `POST /api/mappe` (506), poi apre l'editor `?sezione=mappa` (507): la stanza nasce
   senza immagine e senza infiltrazione. Questo è il percorso che R3-20 sostituisce.
6. **Il vocabolario L0 è già nell'interfaccia.** «Area» indica la stanza (es. «Nome dell'area», `SchedaPlanimetria.tsx:143`),
   «Infiltrazione» indica `dungeon_area`. Le chiavi e i DTO però usano ancora `aree` per le infiltrazioni (`DungeonDettaglioDto.aree`,
   `AreaDungeonDto`, `?area=`, `/compendio/aree/:chiave`).
7. **Pin 1656** sull'illustrazione di Shujin Academy porta a `nativo-rmap-152-2-0` (Kamoshida). È un passaggio dal mondo a una planimetria
   di Palazzo: dopo L3 deve portare alla scheda (segnalato da L2).

## 1. Rotte FE coinvolte (`src/router.tsx`)
| Riga | Rotta | Pagina | In L3 |
|---|---|---|---|
| 77 | `guida/dungeon` | `DungeonPage` (elenco; Iweleth in `DungeonPage.tsx:5-9`, 44) | invariata |
| 78 | `guida/dungeon/:chiave` (`?area=<infiltrazione>`) | `DungeonDettaglioPage` | casa unica del Palazzo; `?area=` resta compatibile (R3-18) |
| — | `guida/dungeon/:k/infiltrazione/:i` | **non esiste** | eventuale pagina dell'infiltrazione (R3-17) |
| 83 | `guida/mappe/:chiave` | `MappaPage` → griglia (radice `palazzo-di-<k>`) o visore (planimetria `area`) | redirect alla scheda, sull'area e sulla versione (R3-15) |
| 84 | `guida/mappe/:chiave/modifica` | `EditorMappaPage` | resta per pin, ritagli, pezzi e passaggi (R3-26) |
| 82 | `guida/mondo/dungeon/:k` | `AccessoMondoPage` → griglia | → scheda |

## 2. Viste di oggi
**DungeonDettaglioPage** (`src/pages/DungeonDettaglioPage.tsx`)
- Dati: `getDungeon` (≈135) = `GET /api/compendio/dungeon/:k?partita`; atlante `getAlberoMappe` (≈277) = `GET /api/mappe/albero`, usato
  per nomi, gruppi ed etichette.
- Infiltrazione aperta: `?area=` o la prima (138).
- Intestazione (≈366-460): stemma o illustrazione (L1), percentuale, finestra (si apre / furto consigliato / scade), «Mappa del Palazzo»
  (435 → griglia), `AtterraggioTokyo` (≈437), conteggi («5 infiltrazioni · 86 da raccogliere · 17 planimetrie · 16 complete · 225 punti
  della guida»).
- Tre colonne a ≥1280. Schermate `02-palazzo-madarame`, `10-…-infiltrazione-4`.
  - **Sinistra «Il Palazzo · N»** = `PlanimetriePalazzo` (≈525-532). Elenca le stanze (= aree di domani) con numero, stato, conteggi e
    infiltrazioni che le toccano, maniglia di riordino, «Gestisci» sulle stanze di una sola tavola, ▸ per aprire le versioni; in coda le
    infiltrazioni senza planimetria (`PlanimetriePalazzo.tsx:420-436`).
  - **Centro: l'infiltrazione**: titolo, «Modifica testo», «infiltrazione N di M», descrizione.
    - Selettore «Planimetria» (≈574-576) fra le planimetrie legate all'infiltrazione.
    - Piega «Planimetrie di quest'infiltrazione · N» con «Collega anche a — scegli una planimetria —» (584) e «Scollega questa planimetria»
      (≈590-592).
    - Chip «Su questa planimetria» (≈598-614): le infiltrazioni che toccano la planimetria aperta, cliccabili.
    - `MappaIncorporata` (≈623) sulla planimetria scelta, con «Modifica mappa» → `/guida/mappe/<planimetria>/modifica`.
    - Caso senza planimetria: ≈633-636.
  - **Destra «Da raccogliere»** = `RaccoltaPlanimetrie` (≈653-666): collezionabili per planimetria, «Nel resto del Palazzo», link
    `/guida/mappe/<planimetria>` (`RaccoltaPlanimetrie.tsx:75-76`).
  - **Sotto: `GuidaDellArea`** (≈670): voci dell'infiltrazione, filtri, «Copia o sposta voci», «Aggiungi una voce».
- Muoversi fra le stanze dalla colonna sinistra cambia la planimetria nel visore, ma il visore mostra solo le planimetrie **legate
  all'infiltrazione aperta**. Una stanza nuova senza legame non si vede finché non la si collega con «scegli una planimetria»: è il caso
  «Una stanza aggiunta…» del piano (riga 416).

**Griglia del Palazzo** (`MappaPage.tsx` → `LuogoSenzaPlanimetria` 234-279)
- Briciole (243-250), «Questa mappa non ha una pianta sua: raccoglie le mappe qui sotto», conteggio «17 planimetrie».
- Azioni «Scheda del Palazzo», «Modifica mappa», «Torna alla partita» (268-269).
- Una tessera per planimetria con il numero di pin: «Entrata del Museo 10», «Museo 1P · 1 52», «Museo 1P · 2 3», …
- Le versioni sono tessere distinte con il suffisso «· n» (`nomeConVersione`, `etichettaVersione.ts:28-31`).
- Schermate `04-griglia-madarame`, `05-griglia-kamoshida`.

**Visore di una planimetria del Palazzo** (`MappaPage.tsx` → `DettaglioMappa` 378-409)
- Pannello con `SelettoreContestoMappa`.
- Per le stanze con gruppo d'immagini, `ImmaginiLuogo` (miniature delle versioni, ognuna è **un'altra pagina**); altrimenti il selettore
  «Planimetrie» delle sorelle (393).
- `ContenutiGuidaMappa` (infiltrazioni e voci della planimetria; `ContenutiGuidaMappa.tsx:32`, 41 →
  `/guida/dungeon/<k>?area=<infiltrazione>`).
- Briciole «Palazzo di Madarame › …».
- Schermate `06-…`, `07-…`, `08-labirinto-contorto`, `13-alias-museo-1p`.

**Gestione di oggi** (colonna sinistra e finestre)
| Azione | UI | API |
|---|---|---|
| «Aggiungi» planimetria | `PlanimetriePalazzo.tsx:349` → modale 490-513 → `creaMappa` 506 → editor 507 | `POST /api/mappe` {tipo `area`, genitore `dungeon-<k>`} |
| «Nuova infiltrazione» | `PlanimetriePalazzo.tsx:350` → modale 483-488 (`ModuloNuovaArea`: nome, descrizione, «Dove va nella guida»); oppure da `SchedaPlanimetria.tsx:165-178` già legata alla planimetria | `POST /api/compendio/dungeon/:k/aree` (`compendio.ts:239`, `bodyNuovaArea` `guidaDungeon.ts:70-73`, `creaArea` `dungeonService.ts:597-622`) |
| «Gestisci» una planimetria (nome dell'area = stanza, «Che cosa mostra» = etichetta, nome della planimetria, infiltrazioni, «Rendila un'area a sé», «Sposta in un'altra area», editor, elimina) | `SchedaPlanimetria.tsx` 143, 147, 156, 157 (`SceltaAreePlanimetria`), 183-217, 222, 226; salvataggio `salvaScheda` `PlanimetriePalazzo.tsx:329-338` | `PUT /mappe/:k/presentazione` (101), `PUT /mappe/:k` (89), `PUT /mappe/:k/aree` (93), `PUT /mappe/:k/stanza` (105), `DELETE /mappe/:k` (96) |
| Riordino delle stanze (trascina ⠿ o frecce) | `PlanimetriePalazzo.tsx:285-289` | `PUT /api/mappe/ordine` (76) |
| Collegare o scollegare infiltrazione ↔ planimetria | «Collega anche a» (584), «Collega una planimetria» (≈642), «Scollega» (≈590), `SchedaAreaGuida.tsx` (infiltrazione senza planimetria, 468-471 del genitore), caselle della `SchedaPlanimetria` | sempre `PUT /api/mappe/:k/aree` {aree: [...]} (`impostaAreeMappa` `mappeService.ts:575-594`) |
| Rinominare o eliminare un'infiltrazione | `PlanimetriePalazzo.tsx:473, 477`; `DungeonDettaglioPage` ≈553-557 | `PUT`/`DELETE /api/compendio/aree/:k` (242/246), nel cestino come tipo `area` (`dungeonService.ts:427`) |
| Voci: crea, modifica, sposta, copia, collega al pin | `GuidaDellArea.tsx` (19, 170-180, 340-341), `TrasferisciVociInArea` | `/compendio/aree/:k/punti`, `/punti/:k`, `/punti/sposta-in-area`, `/punti/copia-in-area`, `/punti/:k/pin/:spillo` (`compendio.ts:266-294`) |

## 3. Percorsi dell'utente di oggi (provati con navigazione e GET)
| # | Partenza | Arrivo oggi | Schermata |
|---|---|---|---|
| P1 | Guida › Palazzi (`/guida/dungeon`), carta Madarame | scheda `/guida/dungeon/madarame` sulla 1ª infiltrazione | `01-indice-palazzi`, `02-palazzo-madarame` |
| P2 | Metro, stemma di Madarame (senza atterraggio) | `/guida/mondo/dungeon/madarame` → **griglia** `/guida/mappe/palazzo-di-madarame` | `09-accesso-dungeon-madarame`, `04-griglia-madarame` |
| P3 | Metro, stemma di Kamoshida (atterraggio del giorno) | planimetria `151-1-0` col pin d'arrivo | — (atterraggio dipende dal giorno) |
| P4 | Scheda › «Mappa del Palazzo» | griglia (come P2) | `04-…` |
| P5 | Scheda › «Sulla mappa di Tokyo» | finestra `AtterraggioTokyo` | — |
| P6 | Griglia › tessera | visore della planimetria (`/guida/mappe/<p>`) | `06-…`, `07-…` |
| P7 | Visore › infiltrazione in `ContenutiGuidaMappa` | `/guida/dungeon/madarame?area=<infiltrazione>` | `10-…` |
| P8 | Indice Mappe › «Palazzo di Madarame» | pannello con l'albero delle planimetrie → visore o griglia | `L2/…/05-indice-mappe` |
| P9 | Diario, voce Palazzo: collegamento | atterraggio del giorno o `/guida/dungeon/<k>` (1ª infiltrazione) | `12-percorso-0518` |
| P10 | Diario, «Sulla mappa» | `/guida/mappe/153-1-0?spillo=` (planimetria d'ingresso) | `12-…` |
| P11 | Battaglia, Ombra di un Palazzo (`BattagliaPage.tsx:122`) | planimetria o griglia | — |
| P12 | Alias salvati (`RisolviMappa.tsx:13`, 80 `guida_alias` dei Palazzi) | planimetria (a volte la versione sbagliata, §0.2) | `13-alias-museo-1p` |
| P13 | Richieste (Memento, `RichiestePage.tsx:146`) | dedali: **da non toccare** | `14-memento` |

## 4. Back-end (righe verificate)
**Rotte** `server/routes/compendio.ts`:
| Metodo e percorso | Riga |
|---|---|
| GET `/dungeon` | 219 |
| GET `/dungeon/:chiave` | 222 |
| PUT `/dungeon/:chiave` | 226 |
| PUT `…/finestra` | 230 |
| PUT `…/atterraggi` | 235 |
| POST `/dungeon/:chiave/aree` | 239 |
| PUT/DELETE `/aree/:chiave` | 242/246 |
| dedali | 252-265 (Memento) |
| punti | 266-294 |

Rotte `server/routes/mappe.ts`: GET `/risolvi/:k` 27, `/contenuti/:k` 28, `/accesso/:tipo/:k` 31, `/albero` 44, `/esporta` 49, POST `/importa`
57, GET `/entita/:tipo/:k` 69, PUT `/ordine` 76, POST `/` 81, GET/PUT/DELETE `/:k` 85/89/96, PUT `/:k/aree` 93, `/:k/presentazione` 101,
`/:k/stanza` 105. Cestino in `server/routes/impostazioni.ts:117-129`.

**Schemi**
- `server/schemas/guidaDungeon.ts`: `paramsChiaveGuida` 29, `bodyDungeon` 30-34, `bodyArea` 35, `bodyPunto` 36-57, `bodyNuovaArea` 70-73,
  `bodySpostaPuntiInArea` 75, `bodySpostaPunto` 80, `paramsPinDelPunto` 82, `bodyFinestraDungeon` 88, `bodyAtterraggi` 94.
- `server/schemas/mappe.ts`: `bodyCreaMappa` 32-37, `bodyAreeMappa` 40, `bodyPresentazioneMappa` 42-44, `bodyStanzaMappa` 46,
  `bodyRiordinaMappe` 48, `bodyImporta` 78.

**Servizi**
- `server/services/dungeonService.ts`:
  - `mappeDelleAree` 92-106 (infiltrazione → planimetrie da `mappa_entita`);
  - `raccoltaMappe` 135-160;
  - `planimetrieDelPalazzo` 281-304 (con le infiltrazioni 290-295);
  - `eliminaArea` 420-431 (cestino 427);
  - `postoDaiVicini` 461-470;
  - `rimettiAreaAlPosto` 478-485 (registrazioni 486 `area`, 487 `area-dedalo`);
  - `eliminaAreaInTransazione` 519-540 (`staccaAreaDaOgniMappa` 535);
  - `creaArea` 597-622 (`impostaAreeMappa` 618);
  - `verificaTipoDellaVoce` 651-654.
- `server/services/mappe/mappeService.ts`:
  - `contestoMappe` 86-108 (gruppo 89-92);
  - `mappaPerEntita` 454-455;
  - `sincronizzaLegameEntita` 484-507;
  - `verificaAreePalazzo` 514-524, `allineaColonneArea` 531-537, `areeDellaMappa` 540-543, `staccaAreaDaOgniMappa` 550-560,
    `areePerPacchetto` 563-567, `impostaAreeMappa` 575-594 (400 sulla radice, 580);
  - `aggiornaPresentazioneMappa` 616-645, `tavoleDelGruppo` 653-657, `nomeDelGruppo` 660-663, `rinominaGruppo` 666-671,
    `nomeStanzaDaFissare` 681-692, `gruppoConNomeRivisto` 695-697;
  - `impostaStanzaMappa` 711-770 (riordino delle sorelle 756-767);
  - `riordinaMappe` 777-806;
  - `creaMappa` 814-846;
  - `aggiornaMappa` 892- (chiama `nomeStanzaDaFissare` 921 e `rinominaGruppo` 923);
  - `eliminaMappa` 958- (cestino 962, ripristino 976-978);
  - `esportaMappe` 1486-1513 (presentazioni 1490-1492, `areePerPacchetto` 1497);
  - `importaMappe` (`areeDaLegare` 1678, legami 1726-1744, gruppo 1745-1750, legame dopo i genitori 1861-1868).
- `server/services/palazziService.ts`: `areeDelleMappe` 63-72, `eBossFinale` 83-88, `ingressoDelPalazzo` 188-209.
- `server/services/mappe/contenutiGuidaService.ts`: `destinazioneGuida` 22-28, `contenutiMappa` 51-67.
- `server/services/mappe/accessoMondoService.ts`: 129-130 (entità della mappa), 138-146 (infiltrazione → dungeon).
- `server/services/azioniStrutturateService.ts`: `mappaAzione` 48-63.
- `server/services/atterraggioPalazziService.ts:65`; `giornataService.ts` 97 e 99 (`mappa`, `atterraggio` delle voci).

## 5. Lettori delle fonti vecchie (per R3-09)
- **`mappa_entita` con `entita_tipo='area'`**:
  - `dungeonService.ts` 93-98, 290-291, 617;
  - `palazziService.ts` 65-66;
  - `contenutiGuidaService.ts` 59, 66;
  - `mappeService.ts` 455, 485, 496-503, 534-535, 541-542, 552-555, 564, 584-587, 911, 1702, 1733-1739, 1865;
  - generici: `accessoMondoService.ts:130`;
  - etichetta del cestino: `cestinoService.ts:73`.
- **Colonne `mappa.entita_tipo='area'`**:
  - `mappeService.ts` 533, 551, 557, 825, 917-928, 1720-1722, 1738;
  - `organizzazioneMappe.ts:16` (`riconciliaAreeGuida`, chiamata da `sincronizzaMappe.ts:208` e dalla migrazione 042);
  - `sincronizzaMappe.ts:106`;
  - `accessoMondoService.ts:129`;
  - FE `MappaPage.tsx` 268 e 403 (`schedaAccessoMondo('area')`).
- **`gruppo_immagini_json` / `gruppoImmagini`**:
  - BE: `mappeService.ts` 89-91, 620-621, 639, 654-656, 669, 683-688, 717-722, 1490-1492, 1745-1749; `collezioniImmagini.ts` 14, 20.
  - FE: `PlanimetriePalazzo.tsx` 442, 445; `AlberoLuoghi.tsx` 32, 57; `ImmaginiLuogo.tsx:21`; `MappaPage.tsx` 62, 393;
    `etichettaVersione.ts` 16, 18, 29; `gruppiPlanimetrie.ts:55`; `presentazioneMappa.ts` 56, 69, 75.
  - Tipi: `shared/types.ts` 2045, 2285.
  - **Vale anche per il mondo** (Sottopasso, Covo, staff: L2). Pulirlo «solo sui Palazzi» va coordinato con L2.
- **Nome in `guida_mappa`**: `contenutiGuidaService.ts:23` (`COALESCE(g.nome,a.nome)`), :58; scritture in `organizzazioneMappe.ts:28` e
  `sincronizzaMappe.ts:102`; esistenza in `sincronizzaMappe.ts:141`; `cestinoService.ts:77`.

## 6. DTO
| File:riga | DTO | Nota |
|---|---|---|
| `shared/types.ts:1801` | `AreaDungeonDto` (= infiltrazione; `mappe` 1817, `dedalo` 1820) | **condiviso con i dedali dei Memento**: un cambio di contratto tocca anche `mementos` (R3-12) |
| `shared/types.ts:1934` | `DungeonDettaglioDto` (`aree` = infiltrazioni, `planimetrie` 1943, `raccolta`, `atterraggi`, `illustrazione`) | `aree` va lasciato com'è per i Memento (ricognizione) |
| `shared/types.ts:1921` | `PiantaAreaDto` | usato anche dal quartiere (L2) |
| `shared/types.ts:1796` | `PinDelPuntoDto` | pin di una voce |
| `shared/types.ts:1139`, 1143 | `AzionePercorsoDto.mappa`, `.atterraggio` | diario → Palazzo (§0.3) |
| `shared/types.ts:2038-2066` | `MappaRiassuntoDto` (`gruppoImmagini` 2045) | versioni = gruppo |
| `shared/types.ts:2278` | `EsportazioneMappeDto` (`gruppoImmagini` 2285, `aree` 2291) | pacchetto (R3-11) |
| `shared/types.ts:2552` | `TipoCestino = 'area'\|'voce'\|'mappa'\|'area-dedalo'` | tipo nuovo per R3-25 |
| `shared/organizzazioneMappe.ts:8-14` | `DestinazioneGuidaDto`, `RisoluzioneMappaDto`, `ContenutiMappaDto` | alias → scheda |

## 7. Cestino (R3-25)
- Tipi: `TipoCestino` (`shared/types.ts:2552`); CHECK nella migrazione `104_cestino.ts:30`; parte delle partite in
  `migrazioniUtente/021_cestino_delle_partite.ts`.
- Per aggiungere un tipo servono:
  - una migrazione che ricostruisca la tabella (SQLite non modifica un CHECK);
  - `TipoCestino`;
  - `RADICE` (`cestinoService.ts:58-63`);
  - `NOME_TIPO_CESTINO` (`src/utils/cestino.ts:16-21`);
  - `ETICHETTE` (`cestinoService.ts:69-83`) per le tabelle nuove.
- `conCestino` (161) registra con trigger temporanei su tutte le tabelle; `ripristinaDalCestino` 283-389 (`RADICE` 374, `dopoRipristino`).
- UI: `src/components/impostazioni/Cestino.tsx`; API `src/services/api/impostazioni.ts:82-92`.

## 8. Test coinvolti
Server (`server/routes/`):
- `dungeon.test.ts` (55: ogni infiltrazione con le sue planimetrie);
- `planimetrie-palazzo.test.ts`, `stanze-planimetrie.test.ts`, `planimetrie-aree-multiple.test.ts`;
- `sulla-mappa-palazzo.test.ts` (`ingressoDelPalazzo`), `palazzo-completato.test.ts`, `nuova-area.test.ts`, `aree-eliminabili.test.ts`;
- `cestino.test.ts`, `atterraggio-palazzi.test.ts`, `copia-voci-area.test.ts`, `sposta-voce-area.test.ts`, `guida-pin.test.ts`;
- `guida-modificabile.test.ts` (74-110), `enigmi-guida.test.ts` (47, 233), `mappe-editor.test.ts`;
- servizi `organizzazioneMappe.test.ts`, `avvioImmutabile.test.ts:36`.
- `trasferisci-voci.test.ts` riguarda il diario, non i Palazzi.

FE:
- `DungeonDettaglioPage.test.tsx` (1251 righe):
  - riordino 453-510;
  - versioni della stanza 541;
  - scheda della planimetria 564-624;
  - «Collega anche a» e «Scollega» 636-702;
  - stanza 715-770;
  - infiltrazione senza planimetria 771-831;
  - completamento 869-1002;
  - nuove infiltrazioni 1108-1180;
  - atterraggio 1182-1220.
- **Non esiste `PlanimetriePalazzo.test.tsx`.**
- `MappaPage.test.tsx` (griglia 99-124, indice 141), `RaccoltaPlanimetrie.test.tsx`, `completamentoAree.test.ts`, `presentazioneMappa.test.ts`.

Test che oggi fissano i link da cambiare:
- `OrganizzazioneMappe.test.tsx` 30-34, 56-60;
- `AccessoMondoPage.test.tsx` 75-80;
- `percorso.test.ts` 32-43;
- `MappaTokyo.test.tsx` 49-56;
- `BattagliaPage.test.tsx:53`;
- `RichiestePage.test.tsx:58` (Memento: deve restare).

## 9. Verifica della ricognizione (sintesi)
Riferimenti confermati: `contenutiGuidaService`, `accessoMondoService`, `palazziService`, `catalogoService:312`, `cestinoService:73`,
`gruppiPlanimetrie`, `presentazioneMappa`, `etichettaVersione`, `PlanimetriePalazzo` 263-507, `MappaPage` 72-165/234-279/390/393/405, tutti i
link della sezione «Link da portare alla scheda», Iweleth.

Righe corrette:
| Riferimento della ricognizione | Riga giusta |
|---|---|
| `contestoMappe` 76-91 | 86-108 |
| chiamata da `aggiornaMappa` 891 | 921 |
| import/export 1685-1732/1848 | 1678-1750 / 1486-1513 / 1861-1868 |
| `mappeDelleAree` 91-105 | 92-106 |
| `planimetrieDelPalazzo` 284-307 | 281-304 |
| `raccoltaMappe` 134-159 | 135-160 |
| `creaArea` 600-625 | 597-622 |
| `eliminaArea` 423-434 / 522-543 | 420-431 / 519-540 |
| cestino 430 | 427 |
| `rimettiAreaAlPosto` 481-490 | 478-485 |
| `DungeonDettaglioPage` `?area=` 136 | 138 |
| «scegli una planimetria» 551-573 | 584 |
| 615-619 | ≈622-623 |
| `AlberoLuoghi` 56 | 57 |
| `shared/types.ts` 2039 / 2279 / 1939 / 1793 | 2038 / 2278 / 1934 / 1801 |
| dungeonService 654-657 (Iweleth) | `verificaTipoDellaVoce` 651-654 (vale per tutti i dedali, non solo Iweleth) |

## 10. Schermate «prima»
Cartella `lotti/L3/schermate-prima/`, misure 1280x800, 768x1024, 375x812, 1366x657, 1280x689, partita «Partita Roberto» al 06-01,
Chrome headless, sola lettura (75 file):
- `01-indice-palazzi`;
- `02-palazzo-madarame`, `03-palazzo-kamoshida`;
- `04-griglia-madarame`, `05-griglia-kamoshida`;
- `06-planimetria-madarame-museo-1p`, `07-planimetria-madarame-giardino`, `08-labirinto-contorto`;
- `09-accesso-dungeon-madarame` (= griglia);
- `10-palazzo-madarame-infiltrazione-4` (`?area=madarame-nelle-profondita-del-museo`), `11-palazzo-kamoshida-infiltrazione`;
- `12-percorso-0518` (diario con voci del Palazzo, rifatta dopo un 502 del BE in riavvio);
- `13-alias-museo-1p`;
- `14-memento` (riferimento per R3-12: non deve cambiare);
- `15-palazzo-iweleth`.

Note già visibili: a 1366x657 la scheda mostra intestazione e prime righe delle tre colonne, il visore dell'infiltrazione sta **sotto la
prima schermata** (R3-41 lo chiede nella prima); nella griglia le miniature stanno in alto a sinistra della tessera.

## 11. Cosa cambierà per l'utente
1. **Una casa per il Palazzo.** Metro, «Mappa del Palazzo», griglia, indice, alias, Battaglia, diario e «Sulla mappa» portano a
   `/guida/dungeon/<k>` (sull'area e sulla versione giuste). La griglia sparisce. Oggi metro e «Mappa del Palazzo» portano alla griglia,
   il diario alla prima infiltrazione.
2. **Le stanze diventano Aree** con nome proprio, versioni ed etichette. Le infiltrazioni si legano all'Area intera, non alla singola
   planimetria. «Collega anche a — scegli una planimetria —» sparisce e un'area aggiunta si vede subito.
3. **Aggiungere** area, planimetria e infiltrazione avviene dalla scheda, con immagine subito e senza passare dall'editor. L'editor resta
   per pin, pezzi e passaggi. Eliminare va nel cestino per tutti e tre.
4. **Invariati**: voci, pin, posizioni, stati, percentuali di Kamoshida e Madarame; Memento e dedali; stemma e illustrazione (L1).

## 12. Dubbi e segnalazioni per Stesura modifiche (fatti, non progetto)
- **A.** Il diario apre il Palazzo sulla **prima** infiltrazione, non su quella del giorno: nessun `?area=` in `collegamentoAzione`.
  R3-37 lo chiede; oggi il dato «infiltrazione della voce» non arriva al FE (da verificare con Analisi dati se la voce del diario la cita).
- **B.** `gruppo_immagini_json` serve anche ai gruppi del mondo (L2): azzerarlo «solo sui Palazzi» (ricognizione) e i suoi lettori
  FE (`ImmaginiLuogo`, `AlberoLuoghi`, `etichettaVersione`) vanno coordinati fra L2 e L3.
- **C.** `AreaDungeonDto`/`DungeonDettaglioDto.aree`, `?area=` e `/compendio/aree/:k` usano «area» per l'infiltrazione. Una nuova entità
  «Area del Palazzo» convivrà con questi nomi: va deciso come chiamarla nel contratto senza toccare i Memento.
- **D.** La metro senza atterraggio dovrebbe portare alla scheda (commento `MappaTokyo.tsx:389-390`), ma oggi porta alla griglia: è un
  difetto di oggi che L3 chiude per costruzione.
- **E.** Alias che puntano a una versione secondaria (`…-museo-1p` → `153-2-1`): il redirect di R3-15 deve rispettare la versione
  dell'alias (come per il Sottopasso in L2).
- **F.** Pin 1656 (mondo → `152-2-0`): da portare alla scheda di Kamoshida sull'area giusta.

## 13. Revisione dell'implementazione (richiesta del PM, 2026-10-20)
Autore: Analisi app attuale. Lavoro in sola lettura:
- codice della cartella di sviluppo `pensive-burnell-b50941` (`newreview`, modifiche di L3 non committate in BE e FE);
- FE 5373 e BE 3201 solo con GET, nessuna scrittura né partita di prova. I gesti che scrivono (aggiungi, modifica, sposta, elimina,
  conferma della proposta) non li ho provati: sono di Test funzionali;
- confronto con `modifiche.md` (§0–§7) e `requisiti.md`.

Nota sui dati: il BE di sviluppo è a `user_version` **111** (c'è già la migrazione di L4 «carattere delle voci»), quindi le prove nel
browser girano su dati L3+L4.

### 13.1 Cosa è conforme (verificato)
| Punto del progetto | Esito | Come l'ho verificato |
|---|---|---|
| Componenti cancellati (`PlanimetriePalazzo`, `SchedaAreaGuida`, `SchedaPlanimetria`, `SceltaAreePlanimetria`) | **nessun uso residuo** in `src/`, `server/`, `shared/`, test e CSS. Restano solo due commenti storici (`SpuntaCompletata.tsx:5`, `useRiordino.ts:5`). Le classi CSS che usavano (`visore-mappa__progresso*`) hanno ancora altri utenti | grep su `src server shared` e sulle classi del file di HEAD |
| Casa e redirect (§3.2, §4.1, R3-15/16) | `/guida/mappe/palazzo-di-madarame` → `/guida/dungeon/madarame`; `/guida/mondo/dungeon/madarame` → scheda; `…-museo-1p` → `/area/museo-1p?planimetria=…153-2-1` (la versione dell'alias è conservata, §7.8); `nativo-rmap-152-2-0?spillo=1657` → `/guida/dungeon/kamoshida/area/prigione-sotterranea-tutorial?planimetria=…152-2-0&spillo=1657`; alias della guida `kamoshida-01-…` → `?infiltrazione=…`; Memento: `dungeon-mementos` → `/guida/mappe/memento` (invariato) | `GET /api/mappe/risolvi/…` e navigazione nel browser |
| Parametri (§0, R3-18) | `?area=<infiltrazione>` apre ancora l'infiltrazione giusta («Nelle profondità del Museo»); `?infiltrazione=in-corso` apre la prima non completata; `/area/giardino-centrale` apre l'area con «Scopri dov'è il Tesoro» (la prima infiltrazione che la tocca) | browser |
| Metro (§4.1) | senza atterraggio `href=/guida/dungeon/<k>` (`MappaTokyo.tsx:402`) | codice |
| «Mappa del Palazzo» (§4.1, §7.11) | tolto nei Palazzi, resta «Mappa dei Memento» (`DungeonDettaglioPage.tsx:503-504`) | codice e browser |
| Testi spariti (§4.5) | nessuna occorrenza nella scheda di «— scegli una planimetria —», «Collega anche a», «Collega una planimetria», «Scollega questa planimetria», «Mappa del Palazzo», «non ha una pianta sua», «Gestisci» | `innerText` della scheda di Madarame a 1280 |
| Scheda (§4.2) | «Aree · 8» con ⠿ «Sposta l'area «…»», numero, «(completata)», «(toccata dall'infiltrazione aperta)», «N versioni · N raccolti»; selettore «Infiltrazione 1 di 5»; «Aree toccate», «Modifica aree», «Aggiungi area», «Aggiungi infiltrazione»; riga dell'area con «Modifica», «Planimetria», «Elimina»; visore con «Infiltrazioni in quest'area»; intestazione «8 aree · 17 planimetrie · 16 complete» | browser 1280×800 |
| Diario (§4.4) | il campo «Infiltrazioni:» compare su **43** voci: le 39 con riferimento a un Palazzo (non Memento), più 05-16 (senza riferimento, con proposta) e le 3 dei Confidenti con proposta (10-03, 11-13 giorno, 01-02). **37** proposte, **0** insiemi scritti, **8** voci «da rivedere» (6 corrette, 1 segnalata, 1 nuova), **1** voce nuova (06-26). A schermo: «Infiltrazioni: nessuna · Modifica · Proposta: Tutorial Palazzo 11/04 — La data è nel nome del tutorial. (certa) · Conferma»; 06-26 con «Da rivedere» e il campo senza proposta | GET della giornata su tutto l'anno (script di sola lettura) e browser |
| BE: rotte vecchie (§3.3) | `PUT /api/mappe/:k/aree`, `/presentazione`, `/stanza` passano prima dal modello nuovo (`impostaInfiltrazioniDellaPlanimetria`, `presentazioneDellaPlanimetria`, `stanzaDellaPlanimetria`). Tornano alle funzioni vecchie solo per le mappe senza Area (Memento) | `routes/mappe.ts:98-120`, `areeService.ts:669-736` |
| BE: niente mappe sciolte (§2.3, R3-26) | `creaMappa` sotto `dungeon-<k>` → 409 `usa-aggiungi-area` (non nei Memento) | `mappeService.ts:910-912` |
| BE: R3-09 (fonti vecchie non lette) | `accessoMondoService` legge `infiltrazione_area` per le infiltrazioni (`:133-139`); le funzioni su `mappa_entita` di tipo area restano solo per il pacchetto vecchio e per il ripiego dei Memento | codice |
| Indice «Mappe» (punto «Da fare 1» di fe.md) | **già fatto**: sotto ogni Palazzo le **aree**, con link alla casa (`/guida/dungeon/madarame/area/<slug>`), versioni e pin | browser |

### 13.2 Cosa manca o è diverso (nuovo, non ancora in `difetti.md`)
- **AP3-1 · media · orfano.** Cinque **schede senza mappa** non legate a una voce non si vedono più da nessuna parte: Kamoshida 1 «Cancello
  del Castello», 14 «Tre guardie del Tetto», 15 «Forziere dei 3 Magatama maledetto», 16 «Seme lussuria verde (2° Seme della Bramosia)»;
  Madarame 28 «Forziere — Fiale delle vertigini S».
  - Prima si leggevano solo nel pannello «Contenuti della guida» (`ContenutiGuidaMappa`) del visore di `MappaPage` (`MappaPage.tsx:421`)
    e nella griglia (`:433`).
  - Con il redirect della casa, `MappaPage` non mostra più né il visore né la griglia di una mappa di Palazzo, e la scheda del Palazzo non
    monta `ContenutiGuidaMappa`.
  - Le altre 149 schede con una voce restano leggibili come voci in `GuidaDellArea`, ma senza il loro stato di scheda.
  - Il ramo «Palazzi» di `ContenutiGuidaMappa` (`?infiltrazione=` alla riga 34) e `SchedaContenutoGuida` per i Palazzi restano codice senza
    strada.
  - È il perimetro di L4 (R4-19, `dati.md` di L4 §7: le 5 vanno in un elenco da approvare), ma L3 le rende invisibili **prima** che L4 le
    migri.
  - Proposta prudente (da decidere): mostrarle nella scheda del Palazzo, sotto la guida dell'infiltrazione, come «Elementi senza mappa»,
    finché L4 non le sistema.
  - **Aggiornamento, verificato subito dopo.** Il BE di L4 (non committato, in lavorazione) emette già il campo
    `DungeonDettaglioDto.schedeDaSistemare` (`shared/types.ts:2124`, `dungeonService.ts:385, 1387`) solo per i Palazzi: per Kamoshida
    contiene gli id 1, 14, 15, 16. **Nessun componente FE lo legge ancora.**
  - Quindi: se L3 si consegna da solo, le 5 schede restano invisibili fino al FE di L4; se L3 e L4 escono insieme, basta che FE di L4 le
    mostri. **Decisione del PM** sull'ordine di consegna.
- **AP3-2 · bassa.** Nel visore della scheda resta la sezione **«Planimetrie» con «Su: Palazzo di Madarame»**.
  - `DungeonDettaglioPage.tsx:702` non passa `senzaVicine` a `MappaIncorporata`; la pagina Area di L2 sì (`AreaPage.tsx:215`).
  - Il tocco porta alla radice (`/guida/mappe/palazzo-di-madarame`) e il redirect riporta alla **stessa scheda**, ricaricata e
    sull'infiltrazione predefinita: un giro a vuoto che perde la scelta.
  - Anche i pin di passaggio fra planimetrie dello stesso Palazzo navigano con l'`onNaviga` predefinito (`MappaIncorporata.tsx:139` →
    `urlMappa` → redirect). Arrivano sull'area giusta, ma con un caricamento di pagina e, senza `?infiltrazione=`, sull'infiltrazione
    calcolata dall'area, non su quella aperta.
- **AP3-3 · bassa · da confermare con BE.** `aggiornaMappa` (`mappeService.ts:998-1006`) blocca con `usa-aggiungi-area` lo spostamento di una
  mappa senza Area **solo nel mondo** (FUN2-8).
  - Dall'editor si può ancora spostare una mappa sotto `dungeon-<k>` (campo «Mappa genitore», `EditorMappaPage.tsx:740`) e farla diventare
    una planimetria del Palazzo senza Area, che finisce fra le «da collocare».
  - `creaMappa` invece la blocca (R3-26).
  - Il commento e l'OpenAPI (`descrizioni/mappe.ts:83`) dicono «Palazzi e Memento non cambiano»: va deciso se R3-26 copre anche lo
    spostamento.
- **AP3-4 · bassa · collegamenti con un passaggio in più.** `RaccoltaPlanimetrie.tsx:75` e `ContenutiGuidaMappa.tsx:43` puntano ancora a
  `/guida/mappe/<planimetria>` invece che alla casa (§4.1 li elencava fra «altri link alla casa»). Funzionano grazie al redirect, ma con un
  caricamento in più e perdendo l'infiltrazione aperta. Lo stesso vale per «Apri il visore» dell'editor (`EditorMappaPage.tsx:220`).

### 13.3 Già in `difetti.md` (li ho rivisti, nessuna novità da parte mia)
- UX3-1: il diario con insieme vuoto apre «in-corso» e non la proposta.
- UX3-2: «Entra» nel testo, ma il pulsante si chiama col nome del Palazzo.
- UX3-3: da telefono il visore sta sotto la prima schermata.
- UX3-4: la metro apre la prima infiltrazione.
- R3-41 (altezza) resta aperta in `fe.md`.

### 13.4 Codice ormai senza chiamanti (per L11, nessun effetto a schermo)
- `src/utils/gruppiPlanimetrie.ts` intero: `raggruppaPlanimetrie`, `spostaGruppo` e `spostaVersioneA` non hanno più chiamanti fuori dal file.
- Le funzioni client `impostaAreeMappa`, `aggiornaPresentazioneMappa` e `impostaStanzaMappa` (`src/services/api/mappe.ts`) non hanno più
  chiamanti.
- `LuogoSenzaPlanimetria` e `ImmaginiLuogo` in `MappaPage` non si raggiungono più per i Palazzi (redirect). Restano per i casi fuori da
  Palazzi e mondo.
- Il ramo Palazzi di `ContenutiGuidaMappa` (vedi AP3-1).

### 13.5 Documenti da aggiornare alla consegna
`docs/ARCHITETTURA.md` descrive ancora come attuali i componenti tolti (righe 882-889, 1098, 1116-1126) e la colonna `PlanimetriePalazzo`
(787). In `docs/ROADMAP.md` (631, 770, 860, 876) è registro storico e può restare.
