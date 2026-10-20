# L2 «Mondo: aree e planimetrie» — analisi dell'app attuale

Autore: sessione «Analisi app attuale» (2026-10-20). Sola lettura: codice della cartella di sviluppo
`C:\Repository\project-p5r\.claude\worktrees\pensive-burnell-b50941` (branch `newreview`, con le modifiche non committate di L1 in
corso: `cittaService.ts`, `immagineMappa.ts`, `shared/types.ts`, `IllustrazioneConSegno.tsx`, `CittaPage.tsx`, `QuartierePage.tsx`:
le righe di questi file possono spostarsi a L1 chiuso), DB `data/gioco.db` aperto `readonly`, app FE http://localhost:5373 e BE
http://localhost:3201 solo con GET. Nessun dato scritto, nessuna partita di prova necessaria (nessuna azione provata scrive).
Fonti incrociate: `requisiti.md` (R2-01…R2-42), `ricognizione-L2-mondo.md`.

## 0. Correzioni alla ricognizione preliminare (verificate)
| Ricognizione / brief | Realtà su `data/gioco.db` | Effetto |
|---|---|---|
| «Covo dei Ladri sotto Yongen-Jaya» | Le 5 mappe `nativo-rmap-022-1-0…4` sono **radici** (`genitore_chiave` NULL), tipo `luogo`, un solo gruppo d'immagini (id `nativo-rmap-022-1-0`) | D2 sposta il Covo sotto Yongen-Jaya: oggi non c'è legame, va creato (non solo rinominato) |
| 29 mappe `luogo` sotto i quartieri | 26 `luogo` (19 sotto 7 quartieri + 2 sotto `tokyo` + 5 Covo radici) + 3 `area` sotto un quartiere: `nativo-rmap-009-2-0` (Vicoli), `yongen-java-banchina-della-metropolitana`, `shibuya-tornello-della-linea-ginza-aoyama-itchome` (sotto Shujin) | Coincide con requisiti.md. Il tipo `area` nel mondo esiste già e oggi significa «planimetria» (`shared/spilli.ts:318-320`: `NOME_TIPO_MAPPA.luogo='Area'`, `.area='Planimetria'`) |
| Pin di passaggio 1625-1626, 1630-1635 | Confermati sulle illustrazioni dei quartieri; in più 1629/1627 (uscita a Tokyo) e **1656** (Shujin → `nativo-rmap-152-2-0`, planimetria del Palazzo di Kamoshida: tocca L3) | 70 pin `riferimento_tipo='mappa'` sulle mappe del mondo; ≈50 sono passaggi fra planimetrie dentro i quartieri (elenco in §6) |
| — | Nessun pin punta a `nativo-rmap-001-2-1` (Sottopasso Speciale); Sottopasso Speciale ha **0 pin**, i 16 del Sottopasso stanno su `001-2-0` | Scegliere la versione «planimetria completa» oggi fa sparire tutti i pin (schermata `10-…`, `19-…`): i pin sono per planimetria, non per Area |

## 1. Rotte FE coinvolte (`src/router.tsx`)
| Riga | Rotta | Pagina | In L2 |
|---|---|---|---|
| 81 | `guida/mappe` | `MappaPage` → `IndiceMappe` | indice: oggi porta a planimetrie sciolte; da riallineare alle case nuove (l'albero vero è L11) |
| 82 | `guida/mondo/:tipo/:chiave` | `AccessoMondoPage` | `quartiere` → oggi la planimetria d'ingresso; dopo → pagina Quartiere/Area |
| 83 | `guida/mappe/:chiave` | `MappaPage` → `RisolviMappa` → `DettaglioMappa` | indirizzi vecchi di quartieri, zone, versioni (R2-18): redirect |
| 84 | `guida/mappe/:chiave/modifica` | `EditorMappaPage` | resta (R2-20); «Nuova mappa» sparisce nel mondo (R2-27) |
| 85 | `guida/citta` | `CittaPage` | metro + piastrelle |
| 86 | `guida/citta/:chiave` | `QuartierePage` | diventa l'unica pagina Quartiere |
| — | `guida/citta/:q/:area` | **non esiste** | nuova pagina Area (R2-13) |
| 93 | `guida/covo` | `CovoPage` | è la pagina **sfide/Medaglie P** del Covo, non la mappa (vedi §7 dubbio A) |
| 53-54 di MappaPage | `guida/mappe/tokyo` | `Navigate` → `/guida/citta` | già «una casa» per la Città |

## 2. Viste di oggi (cosa mostrano, API, file:riga)
**CittaPage** (`src/pages/CittaPage.tsx`) — `MappaTokyo` (78) + piastrelle dei quartieri, ognuna link a `/guida/citta/<q>` (89),
illustrazione con sagoma (97-100). API `getQuartieri(partita)` (42) = `GET /api/compendio/citta`, `getDungeons` (54). Il testo in
testa dice: «tocca un quartiere sulla mappa per aprirne la planimetria nel mappamondo. Le schede a fianco portano invece alla pagina
del quartiere» → **due destinazioni diverse dallo stesso schermo** (schermata `01-citta`).

**QuartierePage** (`src/pages/QuartierePage.tsx`) — `getQuartiere(chiave, partita)` (109) = `GET /api/compendio/citta/:chiave`;
«La città» (130); intestazione con illustrazione e sagoma (137-140); **mappa incorporata della planimetria d'ingresso**
`MappaIncorporata chiave={q.ingresso?.mappa ?? q.mappaChiave}` (160): per Shibuya è Central Street, non l'illustrazione del
quartiere né l'elenco delle aree; didascalia «Si apre su Central Street, nel punto che hai scelto» (162); scarico automatico della
pianta (115); `IngressoQuartiere` **in linea in fondo alla colonna della mappa** (173) dietro «Ingresso da Città» (175); luoghi con
filtro per tipo (179-192), «Aggiungi un luogo» (179), ancora `#luogo-…` (`src/utils/citta.ts:19`, scroll 123-126). **Nessun elenco
delle aree**, nessun «Aggiungi area». Non ha un test proprio: è coperto in `src/pages/CittaPage.test.tsx:197-198`.

**MappaPage** (`src/pages/MappaPage.tsx`)
- `IndiceMappe` (72-165), `getAlberoMappe` (74) = `GET /api/mappe/albero`; raggruppa le radici per gruppo d'immagini
  (`radiciRaggruppate` 58-69): per questo **il Covo compare come radice a sé, accanto a Tokyo** («Area · 27 spilli · 5 versioni»,
  schermata `05-indice-mappe`). Aprendo Tokyo (`PannelloLuogo` 173-222): griglia dei quartieri (pulsanti «N spilli · M dentro» per
  quelli con figli, link `/guida/mappe/<q>` per gli altri) e albero `AlberoLuoghi` (218) con i link a ogni planimetria, le due
  versioni del Sottopasso elencate come «inquadratura orientale» / «planimetria completa», più «Mostra le planimetrie senza spilli · 5».
- `DettaglioMappa` (378-409): `useMappaPartita` (382) = `GET /api/mappe/:chiave`; centro `?x&y&zoom` (381, `centroAccessoMondo`
  `src/utils/accessoMondo.ts:68-74`); pannello (393): se la mappa ha un gruppo d'immagini → `ImmaginiLuogo` (miniature delle versioni),
  altrimenti `Selettore` con `titoloMappeSorelle(tipo)` = **«Aree»** per il tipo `luogo`, che **naviga a un'altra planimetria**
  (`navigate(urlMappa(k))`) → è il «selettore che cambia posto» del piano; su un quartiere il selettore si chiama «Quartieri» e
  cambia quartiere. Azioni «Scheda» / «Modifica mappa» (403); briciole del visore dal `percorso` (`VisoreMappa.tsx:664-675`);
  «Planimetrie e mappe collegate» / «Su: Shibuya» (`VisoreMappa.tsx:691-709`, `titoloMappeVicine` `src/utils/vocabolarioMappe.ts:12-21`).
- `LuogoSenzaPlanimetria` (234-279) per i contenitori senza immagine (briciole 243-250, conteggi 256-263, link 268-269).

**AccessoMondoPage** (`src/pages/AccessoMondoPage.tsx`) — `getAccessoMondo` (46) = `GET /api/mappe/accesso/:tipo/:chiave`; destinazione
unica → `Navigate` (58-59); altrimenti carte (82-92). Per `quartiere/shibuya` la risposta è `esito: unica`, destinazione
`shibuya-central-street` con centro {38.29, 32.67, 1}, criterio `ingresso-quartiere` (provato: `GET /api/mappe/accesso/quartiere/shibuya`).

**EditorMappaPage** (`src/pages/EditorMappaPage.tsx`) — pannello a sezioni (349, 364); «Nuova mappa» (495) → `NuovaMappaModal`
(738-765, tipo predefinito `luogo` sotto un quartiere, 740); `FormMappa` (691-733: nome, tipo, genitore, ordine, note); elimina
(289-295); immagine (450-452); «Scarica dalla guida» (453); passaggi (470, 487); crea mappa collegata da uno spillo (227-231, 659).

**CovoPage** (`src/pages/CovoPage.tsx`) — solo `getCompletamento()` (87): sfide, premi, Medaglie P. **Nessun collegamento alle 5
planimetrie del Covo.** Ci arrivano `MappaTokyo.tsx:461-463` (fermata «Covo dei Ladri» → `/guida/covo`), `CompletamentoPage.tsx:117`,
`sezioniGuida.tsx:39`; `AnteprimaMappa.tsx:31` mappa `covo-dei-ladri` → `guida/covo` per lo stemma.

**OggiMappa** (`src/components/partita/OggiMappa.tsx`, Home e Partita) — la stessa `MappaTokyo` con `onApri`: `mappaDaHref` (39-42)
estrae la chiave da `/guida/mappe/<k>` e solo `?spillo=`: **il centro `?x&y&zoom` dell'ingresso del quartiere si perde** quando la
metro si apre dentro «Oggi» (difetto di oggi, da non portarsi dietro).

## 3. Come si arriva oggi a Shibuya, a un'Area, a una planimetria (provato nell'app)
| # | Punto di partenza | Gesto | Arrivo oggi | Schermata «prima» |
|---|---|---|---|---|
| S1 | La città, metro (`MappaTokyo.tsx:367-371`) | tocco su Shibuya | `/guida/mappe/shibuya-central-street?x=38.29&y=32.67&zoom=1` = **planimetria Central Street** (ingresso) | `08-area-central-street` |
| S2 | La città, piastrella | tocco | `/guida/citta/shibuya` = **QuartierePage** (luoghi + Central Street incorporata) | `02-quartiere-shibuya` |
| S3 | Indice Mappe → Tokyo → Shibuya → «Apri questa mappa» | 3 tocchi | `/guida/mappe/shibuya` = **visore sull'illustrazione** con «Aree» a sinistra (7, compreso Sottopasso Speciale) | `07-mappa-shibuya-illustrazione` |
| S4 | `/guida/mondo/quartiere/shibuya` (da `utils/accessoMondo.ts`, MappaTokyo senza ingresso) | — | redirect a Central Street come S1 | `12-accesso-quartiere-shibuya` |
| S5 | Home/Partita › Oggi, metro | tocco | Central Street dentro Oggi, **senza** il centro dell'ingresso | `21-home-oggi` |
| S6 | Briciole del visore «Shibuya» (da una planimetria) | tocco | `/guida/mappe/shibuya` (illustrazione, come S3) | `08-…` (briciole in alto) |
| S7 | Scheda luogo/pin nel visore «scheda del quartiere» (`VisoreMappa.tsx:904`, `:1151`), Negozi (`NegoziPage:119`, `NegozioPage:80`), Attività (`AttivitaPage:79`), Libri (`LibriPage:138`) | tocco | `/guida/citta/<q>` (+ `#luogo-…`) = QuartierePage | — |
| S8 | Diario (guida giorno per giorno o Oggi), «Sulla mappa» di una voce Confidente/negozio | tocco | `/guida/mappe/<chiave interna>?spillo=<id>` = planimetria (es. Central Street) o illustrazione del quartiere (Ogikubo, Tsukishima, Shujin) col pin; in Oggi la mappa della colonna | `L3/schermate-prima/12-percorso-0518` |

Quindi Shibuya ha oggi **tre viste diverse** (planimetria d'ingresso, QuartierePage, illustrazione nel visore) raggiunte da **quattro
strade** (metro, piastrella/schede, indice/briciole, accesso al mondo), più la variante di Oggi senza centro. Un'Area si raggiunge solo
come planimetria (`/guida/mappe/<chiave>`): dall'albero dell'indice, dal selettore «Aree», dai pin di passaggio, dalle briciole.
**Dal diario** due strade: (1) il collegamento della voce, `collegamentoAzione` (`src/utils/percorso.ts:30-59`), che porta a
Confidenti, Palazzi, Richieste, libri, film, attività, negozi (→ `/guida/negozi/<k>` → «Dove» → QuartierePage); (2) il pulsante
**«Sulla mappa»** (`src/components/guida/PartiAzione.tsx:53-54`, `GiornoGuida.tsx:99-100`) con la mappa calcolata dal server
(`AzionePercorsoDto.mappa` `shared/types.ts:1139`, `mappaAzione` `server/services/azioniStrutturateService.ts:48-63`: negozio o
Confidente → il primo pin del luogo in città; Palazzo → `ingressoDelPalazzo`; Richiesta → ingresso dei Memento). Nella guida giorno per
giorno apre `/guida/mappe/<chiave interna>?spillo=<id>` (`src/pages/PercorsoPage.tsx:81`); in Oggi centra la mappa della colonna
(`OggiGuida.tsx:65`, `oggi.sullaMappa`). **Misura sul diario validato 04-01..06-01** (GET della giornata per ogni giorno, partita 1):
254 voci, **75 con «Sulla mappa»** (42 Confidente, 18 negozio, 15 Palazzo/Richiesta), verso: Central Street `001-3-0` 26, illustrazioni
dei quartieri `citta-ogikubo` 9, `citta-tsukishima` 9, `citta-shujin-academy` 6, Vicoli `009-2-0` 8, Shujin 1P `002-0-0` 4, Centro comm.
`001-4-0` 1 (= **63 verso il mondo**, R2-31), più Palazzi `153-1-0` 7 e `152-1-0` 3 (L3) e Memento `190-1-0` 2. Dopo L2 queste 63 devono
aprire l'Area (o il Quartiere) giusta con il pin evidenziato.

**Trappola degli alias (provata):** `GET /api/mappe/risolvi/shibuya-sottopasso` → `shibuya-sottopasso-speciale` (`mappa_alias`
`shibuya-sottopasso` → `nativo-rmap-001-2-1`), mentre il Sottopasso «vero» con i pin ha percorso
`shibuya-sottopasso-nativo-rmap-001-2-0` (alias anche `shibuya-sottopasso-1`, `shibuya-sottopasso-inquadratura-orientale`). Chi
apre `/guida/mappe/shibuya-sottopasso` vede la planimetria **senza pin** (schermata `19-alias-shibuya-sottopasso`). Gli alias del
mondo sono in `mappa_alias` (55 chiavi di percorso, 5 alias per `001-2-1`, 5 per la Banchina di Yongen-Jaya); `idMappa` cerca prima
`mappa_percorso` poi `mappa_alias` (`server/services/mappe/percorsiMappe.ts:45-48`); `sincronizzaPercorsiMappe` (59-95) aggiunge il
suffisso `-nativo-rmap-…` alle varianti con lo stesso nome (81). Anche il Covo: percorso `covo-dei-ladri` = `022-1-1` («planimetria
completa»), mentre l'indice apre la prima versione `covo-dei-ladri-settore-dingresso` (`022-1-0`).

## 4. Componenti e utilità coinvolti
| File | Righe | Ruolo oggi | In L2 |
|---|---|---|---|
| `src/components/mappe/IngressoQuartiere.tsx` | 30-117 (selettore mappa dall'albero 88, tocco = salva 59-66, zoom 98-102, ripristino 114, API 48) | ingresso in linea | finestra propria; si sceglie l'**Area** (R2-21) |
| `src/components/mappe/MappaTokyo.tsx` | 355-377 (quartieri: `href` ingresso → `mappaChiave` → `/guida/mondo/quartiere`), 378-399 (Palazzi), 454-465 (Covo → `/guida/covo`) | metro | `href` del quartiere → pagina Quartiere; Covo (dubbio A) |
| `src/components/mappe/MappaIncorporata.tsx` | 60-138 (65, 108 `?sezione=mappa`, 110, 112, 133) | mappa dentro le schede (QuartierePage, DoveSiTrova) | link alla pagina Area |
| `src/components/mappe/VisoreMappa.tsx` | 664-675 briciole; 691-709 mappe vicine; 904, 1151 «scheda del quartiere» | visore | briciole Tokyo › Quartiere › Area (R2-17) |
| `src/components/mappe/ImmaginiLuogo.tsx` | 19-33 (29 link) | miniature delle versioni = **navigano a un'altra mappa** | selettore delle versioni dentro l'Area (R2-14) |
| `src/components/mappe/AlberoLuoghi.tsx` | 18-70 (32 raggruppa, 60 link) | albero dell'indice | link alle Aree |
| `src/components/mappe/AnteprimaMappa.tsx` | 28-31, 42-59 | miniature; stemmi Tokyo/Covo | Covo come Area di Yongen-Jaya |
| `src/components/mappe/PassaggiMappa.tsx` | 36-108 (100 «Crea il passaggio») | uscite/arrivi nell'editor | destinazione = Area |
| `src/components/mappe/RisolviMappa.tsx` | 11-15 | alias → mappa | redirect alle case nuove (R2-18) |
| `src/components/mappe/SelettoreContestoMappa.tsx`, `NavigazioneSpillo.tsx` (13-18), `DoveSiTrova.tsx` (105) | — | contesto, «Vai: …», «Dove si trova» | «Vai» e «Dove si trova» → pagina Area (R2-16, R2-19) |
| `src/components/mappe/SagomaQuartiere.tsx` 42-60, `IllustrazioneConSegno.tsx` 34-44 (nuovo L1), `segniMappa.ts:20` | — | segni e illustrazione | invariati (R2-34) |
| `src/components/mappe/aperturaTokyo.ts` 32-38, `collocazioneTokyo.ts` 154 (`COVO_TOKYO`) | — | apertura quartieri, posizione Covo | Covo |
| `src/components/partita/OggiMappa.tsx` | 36-42 | metro in Oggi | stessa destinazione della metro (R2-15) |
| `src/utils/vocabolarioMappe.ts` | 12-43 | titoli «Aree»/«Planimetrie e mappe collegate» | parole delle pagine nuove (R2-39) |
| `src/utils/presentazioneMappa.ts` | 44-58, 66-76, 86-110 | nomi e titoli dei gruppi | nome dell'Area |
| `src/utils/etichettaVersione.ts` | 15-31 | etichetta della versione (ripiego su ordine+1) | etichetta della planimetria (R2-04) |
| `src/utils/accessoMondo.ts` | 9-26, 35, 53, 68-74 | URL e centro dell'accesso | `quartiere` → `/guida/citta/<q>` già (18); `luogo` → `/guida/citta` (21) |
| `src/utils/navigazioneMappa.ts` | 13-29 | `urlMappa`, arrivi | URL dell'Area con versione/punto |
| `src/utils/haPlanimetria.ts` 11-14, `ritornoMappe.ts` 19-49 | — | filtro visore, ritorno | — |
| `src/utils/gruppiPlanimetrie.ts` 49-118 | — | solo Palazzi (versioni/stanze) | modello da riusare per «stessi gesti» di L3 |
| `shared/spilli.ts` | 318-320 | `TIPI_MAPPA`, `NOME_TIPO_MAPPA` (luogo='Area', area='Planimetria') | parole |
| `shared/immaginiMappa.ts` | 28-40 | ruolo dedotto (L1) | «Aggiungi planimetria» non chiede il ruolo (R2-24) |
| `shared/accessoMondo.ts` | 7, 10-24, 27-36 | tipi e `urlDestinazioneMondo` | — |

Punti che costruiscono URL `/guida/mappe/…` (tutti da riportare alla casa giusta per le mappe del mondo): `utils/navigazioneMappa.ts:13-18`,
`shared/accessoMondo.ts:27-36`, `AccessoMondoPage:99`, `RisolviMappa:13`, `MappaIncorporata:65,108,110,112,133`, `ImmaginiLuogo:29`,
`AlberoLuoghi:60`, `ContenutiGuidaMappa:41`, `MappaPage:146,189,200,248,269,361,403`, `EditorMappaPage:121,206,215,292`, `PercorsoPage:81`
(«Sulla mappa» del diario: mondo **e** Palazzi), `utils/percorso.ts:37` (atterraggio dei Palazzi: L3); `RaccoltaPlanimetrie:75`,
`SchedaPlanimetria:222`, `PlanimetriePalazzo:507` sono dei Palazzi (L3).

## 5. Back-end
**Rotte** (`/api/mappe`, `server/routes/mappe.ts`): GET `/risolvi/:chiave` (27), `/contenuti/:chiave` (28), `/accesso/:tipo/:chiave` (31),
POST `/piante-citta/:quartiere/scarica` (36), GET `/albero` (43), GET `/esporta` (48), POST `/importa` (56), GET `/riferimenti` (62),
GET `/entita/:tipo/:chiave` (68, nessun consumatore FE), PUT `/ordine` (75), POST `/` (80), GET/PUT/DELETE `/:chiave` (84/88/95),
PUT `/:chiave/aree` (92), `/presentazione` (100), `/stanza` (104), `/immagine` (109), POST `/:chiave/spilli` (114), `/passaggi` (118),
PUT/DELETE `/spilli/:id` (121/124).
(`/api/compendio`, `server/routes/compendio.ts`): GET `/luoghi` (163), DELETE/PUT `/citta/:chiave/ingresso` (169/170, zod in linea:
mappa, x/y 0-100, zoom 1-6), GET `/citta` (173), GET `/citta/:chiave` (176). (`/api/catalogo`, `catalogo.ts`): POST `/:tipo` (57),
PUT `/:tipo/:chiave` (64) per i luoghi.

**Schemi** `server/schemas/mappe.ts`: `chiaveMappa` 13, `bodyCreaMappa` 32-37 (passaggio/ritorno), `bodyAggiornaMappa` 38,
`bodyAreeMappa` 40, `bodyPresentazioneMappa` 42-44, `bodyStanzaMappa` 46, `bodyRiordinaMappe` 48, `bodyCreaPassaggio` 50,
`bodyCreaSpillo`/`bodyAggiornaSpillo` 51-57, `bodyImporta` 78.

**Servizi**
- `server/services/cittaService.ts`: `chiaveImmagineQuartiere` 28 (`citta-<q>`), `elencaQuartieri` 119-129, `dettaglioQuartiere`
  132-149 (`mappaChiave` = percorso di `citta-<q>`, `ingresso`, `illustrazione` L1 146-147; **nessuna area nel DTO**), `elencaLuoghi`
  152, `scaricaPiantaQuartiere` 158-163, `ingressoQuartiere` 166-169, `impostaIngressoQuartiere` 172-179.
- `server/services/mappe/accessoMondoService.ts`: `risolviAccessoMondo` 25-177 (ingresso del quartiere 64-70, ricerca 118-132 per
  pin, `spillo_voce`, `mappa.entita_*`, `mappa_entita`; ripiego 138-165).
- `server/services/mappe/mappeService.ts`: `contestoMappe` 86-108 (presentazioni 89-93), `riassunto` 115-129, `elencaMappe` 140-155,
  `percorsoDi` 158, `dettaglioRiferimento` 175-222 (passaggi 179-184), `arriviVerso` 423-431, `dettaglioMappa` 434-451,
  `mappaPerEntita` 454, `CHIAVI_MAPPA_RISERVATE` 467-470, `sincronizzaLegameEntita` 484-507 (rispetta la 054, 486-488),
  `impostaAreeMappa` 575, `aggiornaPresentazioneMappa` 616-645, `impostaStanzaMappa` 711-770 (vincolo stesso genitore 738),
  `riordinaMappe` 777, `creaMappa` 814-845 (chiave col prefisso del genitore 820; passaggio/ritorno 841-842), `creaPassaggio` 875-883,
  `aggiornaMappa` 891-934, `eliminaMappa` 958-… (già nel cestino: `conCestino({ tipo: 'mappa', … })` 962; spilli eliminati, figlie senza genitore),
  `impostaImmagineMappa` 980, `creaSpillo` 1221, `aggiornaSpillo` 1254, `esportaMappe` 1472, `importaMappe` 1611.
- `server/services/mappe/percorsiMappe.ts` 45-95 (percorsi e alias, §3); `immagineMappa.ts` 32-97 (L1); `sincronizzaMappe.ts`
  (Tokyo 89, quartieri `citta-<q>` 92-93, passaggi automatici ≈190, `collegaPalazziAiLuoghi` 230); `contenutiGuidaService.ts:34`
  (`risolviPercorsoMappa`, `guida_alias`); `destinazioniSpillo.ts` 21-114; `alberoMappe.ts` 19-51; `collezioniImmagini.ts:17`.

**Lettori di `mappa.entita_*` e `mappa_entita` per le mappe del mondo** (R2-09): sulle mappe di zona `entita_*` è vuoto in tutte
le 29 righe; vale solo sulle 24 mappe `citta-<q>` (`entita_tipo='quartiere'`). Lo leggono `accessoMondoService` 118-132,
`mappaPerEntita` 454, `sincronizzaLegameEntita` 484-507, `contestoMappe`; `mappa_entita` per tipo: area 130 (Palazzi), **luogo 3
(regola 054)**, quartiere 1.

**Migrazioni / DDL**: 015 (`quartiere`, `luogo`), 022 (`pianta_quartiere`, `marcatore_luogo`), 027 (`mappa` con CHECK
`citta|quartiere|luogo|palazzo|area|dedalo|generica`, `spillo`, `spillo_partita`, `sincronizzaMappe`), 037 (`quartiere.sblocco_data`),
038 (`mappa_percorso`, `mappa_alias`), 039 (`quartiere_ingresso`: quartiere PK, mappa FK CASCADE, x, y, zoom), 040/065
(`spillo_destinazione`, arrivi), 042/045 (`mappa_entita`, `mappa_presentazione`), 043/044 (`ruolo_immagine`, `emblema`), 054
(`collegaLuoghiAllePlanimetrie` 41-72: luoghi senza spillo `luogo` 57, solo figli di `citta-<q>` 59, nome uguale o prefisso ≥5 caratteri
64, scrive `mappa_entita` tipo `luogo` origine `regola` 52-53), 071/072/080 (luogo: origine, condizioni, `sede_chiave`, giorni), 082
(`nome_rivisto`), 106-107 (ruolo immagine). `user_version` attuale 107.

## 5 bis. DTO coinvolti
| File:riga | DTO | Oggi | In L2 |
|---|---|---|---|
| `shared/types.ts:1392` | `IngressoQuartiereDto` {mappa, nome, x, y, zoom} | ingresso = planimetria + punto | area d'ingresso + punto (R2-21) |
| `shared/types.ts:1396` | `IllustrazioneDto` (nuovo, L1) | immagine del quartiere | invariato |
| `shared/types.ts:1397-1418` | `QuartiereRiassuntoDto` (`mappaChiave?`, `ingresso?`, `illustrazione`) | metro e piastrelle | link alla pagina Quartiere |
| `shared/types.ts:1420-1457` | `LuogoDto` (`marcatore` 1446, condizioni/disponibilità 1454-1456) | luoghi del quartiere | l'Area del luogo arriva con L5 |
| `shared/types.ts:1459-1476` | `QuartiereDettaglioDto` (`mappaChiave?`, `ingresso?`, `luoghi`, `mappa`, `illustrazione`, `pianta`) | **senza elenco delle aree** | aggiunge le aree ordinate (R2-01, R2-12) |
| `shared/types.ts:2038-2066` | `MappaRiassuntoDto` (`gruppoImmagini` 2045, `contesti` 2042, `immagineCollezione` 2041) | le versioni = gruppo d'immagini | versione/etichetta e Area della planimetria |
| `shared/types.ts:2123-2168` | `SpilloDto` (`destinazione`, `destinazioneNomi`, `riferimento`) | passaggi verso una mappa | destinazione Area (R2-19) |
| `shared/types.ts:2179-2195` | `MappaDto` (`percorso` 2185, `figli`, `arrivi` 2191, `pezzi`) | briciole e mappe vicine dal `percorso` | briciole Tokyo › Quartiere › Area |
| `shared/types.ts:2278` | `EsportazioneMappeDto` | pacchetto mappe | porta le Aree (R2-11) |
| `shared/types.ts:2448` | `LuogoOpzioneDto` | scelta del luogo da collegare | L5 |
| `shared/accessoMondo.ts:10-24` | `DestinazioneMondoDto`, `AccessoMondoDto` | destinazioni con centro | destinazione Quartiere/Area |
| `shared/organizzazioneMappe.ts:8-14` | `DestinazioneGuidaDto`, `RisoluzioneMappaDto`, `ContenutiMappaDto` | alias → mappa | redirect alle case nuove (R2-18) |
| `shared/types.ts:1801`, `1921`, `1934` | `AreaDungeonDto`, `PiantaAreaDto`, `DungeonDettaglioDto` | Palazzi/Memento (`PiantaAreaDto` usato anche da `QuartiereDettaglioDto.pianta`) | non toccare in L2 (L3) |

## 6. Dati di oggi letti dall'app (sola lettura, `data/gioco.db`)
- Gruppi d'immagini nel mondo (`mappa_presentazione.gruppo_immagini_json`): Sottopasso (`001-2-0` «inquadratura orientale» ordine 0,
  `001-2-1` «planimetria completa» 1), Covo (5: settore d'ingresso, planimetria completa, porzione occidentale, porzione
  settentrionale, inquadratura orientale), Area riservata allo staff (`150-3-0` «porzione occidentale», `150-3-1` «planimetria completa»).
- `quartiere_ingresso`: yongen-jaya → `nativo-rmap-009-2-0` (37.46, 25.14, 1); shibuya → `nativo-rmap-001-3-0` (38.29, 32.67, 1).
- Pin sulle mappe del mondo (città, quartieri, zone, Covo): 298 = 151 senza riferimento, 70 `mappa`, 54 `luogo`, 19 `negozio`,
  2 `attivita`, 2 `confidente`. Passaggi fra planimetrie: Shibuya (1457, 1463, 1464, 1477-1483, 1501-1502, 1545-1550, 1646-1653,
  1761-1775), Shujin (285, 289, 304, 336-337, 1669-1716), Yongen-Jaya (1569-1572, 1614-1615, 1628, 1645), illustrazioni (1625-1635);
  tutti `origine='utente'` (lavoro manuale, R2-29). Mappe con `origine='utente'`: Sottopasso, Sottopasso Speciale, Biblioteca, le 3
  `area`, Tokyo e 19 quartieri su 24.

## 7. Funzioni di gestione di oggi (mondo)
| Azione | Punto UI | API | Dopo L2 |
|---|---|---|---|
| Nuova mappa figlia | `EditorMappaPage:495` → `NuovaMappaModal` 738-765 | `POST /api/mappe` (+passaggio/ritorno) | sparisce nel mondo (R2-27); al suo posto «Aggiungi area» (Quartiere) e «Aggiungi planimetria» (Area) |
| Mappa collegata da uno spillo | `EditorMappaPage` 227-231, 659 | `POST /api/mappe` + `PUT /spilli/:id` | idem |
| Proprietà mappa (nome, tipo, genitore, ordine, note) | `FormMappa` 713-728 | `PUT /api/mappe/:chiave` | nome/ordine/predefinita dell'Area dalla pagina Area (R2-25) |
| Elimina mappa | `EditorMappaPage` 289-295 (avviso «Finisce nel cestino», `src/utils/cestino.ts:13`) | `DELETE /api/mappe/:chiave` (nel cestino come tipo `mappa`; le figlie restano senza genitore) | eliminare un'Area con le sue planimetrie, pin e predefinita e rimetterla al posto (R2-26): il cestino oggi lavora per singola mappa |
| Immagine della planimetria | `EditorMappaPage` 450-452; `MappaIncorporata:108` | `PUT /:chiave/immagine` | «Aggiungi planimetria» con immagine obbligatoria |
| Pianta del quartiere | `EditorMappaPage:453`; auto in `QuartierePage:115` | `POST /piante-citta/:q/scarica` | invariato |
| Ingresso del quartiere | `QuartierePage:173-175` → `IngressoQuartiere` | `PUT`/`DELETE /api/compendio/citta/:q/ingresso` | finestra propria, scelta dell'Area (R2-21) |
| Pin di passaggio | editor 417, 140-155, 522-536, 470, 487; `PassaggiMappa:100` | `POST /:chiave/spilli`, `PUT /spilli/:id`, `POST /:chiave/passaggi` | destinazione = Area (R2-19) |
| Pin ↔ luogo della città | `CollegamentoCitta` 519, 539 | `PUT /spilli/:id` | L5 |
| Aggiungi/correggi luogo | `QuartierePage:179`, `:75` | `POST`/`PUT /api/catalogo/luogo` | L5 |
| Versioni, riordino, «aree» | **solo Palazzi** (`PlanimetriePalazzo` 288, 332-335, 458) | `PUT /presentazione`, `/stanza`, `/ordine`, `/aree` | **nel mondo oggi non esiste** nessuna interfaccia per versioni o ordine delle aree |
| Esporta/importa mappe | `EditorMappaPage` 505-506 | `GET /esporta`, `POST /importa` | porta Aree e legami (R2-11) |

## 8. Test esistenti coinvolti
Server (rotte): `citta.test.ts`, `ingressi.test.ts`, `piante-citta.test.ts`, `accesso-mondo.test.ts` (ingresso per quartiere e alias),
`percorsi-map.test.ts`, `verifica-mappe.test.ts` (B3, B4, B5, B8, B12), `immagine-mappa-unica.test.ts`, `mappe-editor.test.ts` («Nuova
mappa» con passaggio e ritorno, 486), `destinazioni-spilli.test.ts`, `posizioni-spilli.test.ts`, `planimetrie-aree-multiple.test.ts`
(legame `luogo` intatto, 75), `stanze-planimetrie.test.ts` (vincolo stesso genitore, 116), `struttura-server.test.ts`,
`import-map-size.test.ts`.
Server (servizi/migrazioni): `alberoMappe.test.ts`, `arriviMappa.test.ts`, `collezioniImmagini.test.ts`, `organizzazioneMappe.test.ts`,
`contestiParziali.test.ts`, `sincronizzaMappe.test.ts` (98: un passaggio da Tokyo per quartiere),
`054_luoghi_con_la_loro_planimetria.test.ts`, `106_…test.ts`, `107_ruolo_dalla_gerarchia.test.ts`.
FE (pagine): `CittaPage.test.tsx` (clic → ingresso 55, illustrazione 172, QuartierePage 197-198), `MappaPage.test.tsx` (indice 141,
contenitore senza immagine 258, Tokyo → città 267/278, contesto 288), `AccessoMondoPage.test.tsx` (ingresso con coordinate 67),
`CovoPage.test.tsx`, `EditorMappaPage.test.tsx` (380, 389, 405, 417, 432, «Nuova mappa» 469, 501).
FE (componenti/utils): `IngressoQuartiere.test.tsx` 31-53, `MappaTokyo.test.tsx`, `PassaggiMappa.test.tsx`, `ImmagineMappaUnica.test.tsx`,
`OrganizzazioneMappe.test.tsx` (Covo, 78), `CollezioniImmagini.test.tsx`, `MappaIncorporata.test.tsx`, `DoveSiTrova.test.tsx`,
`CollegamentoMappa.test.tsx`, `NavigazioneSpillo.test.tsx`, `ContenutiGuidaAccesso.test.tsx`, `VisoreMappa.test.tsx` (119, 982),
`OggiMappa.test.tsx`, `utils/accessoMondo.test.ts`, `vocabolarioMappe.test.ts`, `presentazioneMappa.test.ts` (Covo 22),
`navigazioneMappa.test.ts`, `ritornoMappe.test.ts`. **Manca** un test di pagina per QuartierePage e per la pagina Area (nuova).
Questi test cambieranno attese (redirect, «Nuova mappa», selettore «Aree», Covo radice): elenco da passare a Stesura per il piano dei test.

## 9. Schermate «prima» (riferimento per UX e layout)
Cartella `lotti/L2/schermate-prima/`, file `<vista>__<misura>.png` alle misure 1280x800, 768x1024, 375x812, 1366x657, 1280x689
(Chrome headless, viewport senza scorrere, partita attiva «Partita Roberto», sola lettura):
`01-citta`, `02-quartiere-shibuya`, `03-quartiere-yongen-jaya`, `04-quartiere-shujin`, `05-indice-mappe`, `06-mappa-tokyo` (→ redirect
alla città), `07-mappa-shibuya-illustrazione`, `08-area-central-street`, `09-area-sottopasso`, `10-area-sottopasso-speciale`,
`11-area-piazza-stazione`, `12-accesso-quartiere-shibuya` (→ Central Street), `13-covo` (sfide), `14-mappa-covo`, `15-area-shujin-1p`,
`16-area-staff-tokyo`, `17-editor-central-street`, `18-mappa-yongen-jaya`, `19-alias-shibuya-sottopasso` (trappola), `20-mappa-shujin-quartiere`,
`21-home-oggi` (108 file). Note di layout già visibili nel «prima»: a 375 la barra delle azioni del visore va a capo e «Torna alla
partita» esce dal bordo (`12-…__375x812`); a 1280x689/1366x657 la QuartierePage mostra solo l'intestazione e l'inizio della mappa
incorporata, i luoghi stanno sotto; il pannello del visore sulle aree a 1280 mette selettore, categorie e spilli in una colonna che
scorre, con la planimetria a destra. L'indice con Tokyo aperto non ha un indirizzo proprio: descritto in §2 (provato nel browser).

## 10. Cosa cambierà per l'utente (dal punto di vista dell'app di oggi)
1. **Shibuya una sola**: metro, piastrella, indice, briciole, accesso al mondo, Oggi e le schede (negozi, attività, libri, «scheda
   del quartiere» del visore) portano tutti a `/guida/citta/shibuya`, che diventa la casa con illustrazione + pin delle aree, elenco
   delle aree con miniatura, luoghi filtrabili, ingresso. Oggi metro e accesso al mondo atterrano su Central Street: per atterrare
   sul posto resta la scelta di Stesura (il requisito R2-15 vuole la pagina Quartiere; l'ingresso decide dove si apre il visore
   dell'Area d'ingresso, R2-21/22).
2. **Le aree hanno una pagina** `/guida/citta/<q>/<area>` col visore sulla predefinita e un selettore di versioni che non cambia
   posto; oggi la stessa zona è una planimetria sciolta e il selettore «Aree» del pannello salta altrove.
3. **Sottopasso Speciale** smette di essere una voce a sé (oggi è nell'elenco «Aree» e nell'albero) e diventa la versione «planimetria
   completa» del Sottopasso; il link `shibuya-sottopasso` smette di aprire la versione senza pin.
4. **Covo dei Ladri** passa da radice sciolta dell'indice (accanto a Tokyo) ad Area di Yongen-Jaya con 5 versioni; la pagina delle
   sfide `/guida/covo` resta (dubbio A).
5. **Gestione**: compaiono «Aggiungi area» (Quartiere) e «Aggiungi planimetria» (Area) con eliminazione nel cestino; «Nuova mappa»
   dell'editor sparisce nel mondo; l'ingresso si configura in una finestra scegliendo l'Area.
6. Invariati per l'utente: pin e posizioni (298), stati di partita sui pin, immagini (L1), Palazzi e Memento, testo e spunte del
   diario; cambia solo dove si apre «Sulla mappa» delle 63 voci del diario validato che puntano al mondo (Area/Quartiere invece della
   planimetria sciolta).

## 11. Dubbi e segnalazioni per Stesura modifiche (non progetto: solo fatti emersi)
- **A. Covo: due cose con lo stesso nome.** La fermata della metro `Covo dei Ladri` porta oggi alla pagina delle sfide (`/guida/covo`),
  non alle planimetrie; requisiti.md (dubbio 4) presume una fermata che porti alla mappa. Con D2 bisogna decidere se la fermata va
  all'Area del Covo (Yongen-Jaya) o resta alle sfide, e come le due pagine si richiamano (oggi nessun link fra loro). Da girare ad
  Analisi requisiti/PM.
- **B. Versioni e pin.** I pin stanno sulla singola planimetria: Sottopasso Speciale ne ha 0 (i 16 stanno su `001-2-0`), le 5
  versioni del Covo 3, 15, 3, 1, 5 (dati.md §1.2). Il selettore delle versioni mostrerà quindi versioni con pin diversi o nessuno: il comportamento atteso (avviso, conteggio dei pin per versione) va
  deciso in modifiche.md.
- **C. Tipo `area` nel mondo.** Tre mappe del mondo sono già di tipo `area` e l'interfaccia chiama «Planimetria» il tipo `area`
  e «Area» il tipo `luogo` (`shared/spilli.ts:318-320`, `vocabolarioMappe.ts`): il nuovo modello deve togliere questa doppia lettura.
- **D. OggiMappa perde il centro** dell'ingresso (`OggiMappa.tsx:39-42`): difetto di oggi da non replicare.
- **E. Pin 1656** (illustrazione di Shujin → planimetria del Palazzo di Kamoshida `152-2-0`): passaggio mondo→Palazzo, da tenere
  com'è (non è un'Area del mondo) e segnalare a L3.
- **F. `GET /api/mappe/entita/:tipo/:chiave`** non ha consumatori FE: lettore di `mappa_entita` da considerare nella pulizia (L11).
