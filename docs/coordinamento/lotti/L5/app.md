# L5 «Luoghi, negozi, orari» — analisi dell'app attuale

Autore: sessione «Analisi app attuale» (2026-10-20). Analisi in sola lettura:
- codice della cartella di sviluppo `C:\Repository\project-p5r\.claude\worktrees\pensive-burnell-b50941` (`newreview`, con le modifiche di
  L1 ancora in corso: alcune righe di `QuartierePage.tsx` e `cittaService.ts` possono spostarsi di qualche riga);
- `data/gioco.db` in sola lettura;
- FE e BE solo con GET. Nessuna scrittura, nessuna partita di prova.

Fonti incrociate: `requisiti.md` (R5-01…R5-33) e `dati.md` di L5.

## 0. Fatti che contano per il progetto
1. **Non esiste una pagina del luogo.** Il luogo vive solo come carta dentro QuartierePage (`QuartierePage.tsx:53-95`, ancora
   `#luogo-…` a `:61`, funzione `ancoraLuogo` in `src/utils/citta.ts:18-21`). Tutti i link a un luogo portano a `/guida/citta/<q>#luogo-…`.
   `schedaAccessoMondo('luogo')` porta a `/guida/citta` generico (`src/utils/accessoMondo.ts:21`).
2. **Il pin copia nome e descrizione del luogo.** `sincronizzaMappe.ts:173` scrive `spillo.nome = luogo.nome` e
   `spillo.descrizione = luogo.cosa_offre`; l'editor modifica la copia (`EditorMappaPage.tsx:609-611, 657, 665`). Il visore mostra la copia
   (popup `VisoreMappa.tsx:869, 875`, scheda `:1123, 1129`) e aggiunge `cosaOffre` solo se diverso dalla descrizione (`:1151`), segno che il
   doppione è noto.
3. **Gli orari di scheda e visore vengono da fonti diverse.**
   - Scheda del quartiere: `quando` e `giorniTesto` del luogo (`QuartierePage.tsx:58-75`), nessun orario del negozio.
   - Scheda del negozio: `orariTesto` del negozio (`NegozioPage.tsx:73, 81, 87-89`).
   - Popup del pin: presenza = condizioni del pin AND orari del **primo negozio della sede** (`conNegozioVivo`,
     `mappeService.ts:334-344, 369`). `luogo.quando` è mostrato grezzo («entrambe»), senza i giorni del luogo (`VisoreMappa.tsx:904`,
     `:1149-1153`).
   - `dati.md` §3 misura 23 divergenze su 57.
4. **La presenza del luogo non arriva mai al visore.** `applicaPresenzaAiLuoghi` (`presenzaEntita.ts:87-120`, che unirebbe quartiere,
   `quando`, `giorni_json` e orari) **non la chiama nessuno in produzione**: la usa solo `visibilitaCondizionale.test.ts:19, 33, 216`. In più i
   pin di città non ammettono condizioni, salvo il Confidente (`shared/spilli.ts:78-80`, `ammetteCondizioni`). Arrivano al visore solo gli
   orari del negozio, tramite `conNegozioVivo`.
5. **Effetto visibile oggi (provato).** Al 06-01 (mercoledì, giorno) il pin di Untouchable (1517, Central Street) **non compare**: il visore
   dice «Spilli 21 di 24 · Mostra anche i non ancora disponibili (3)», e `?spillo=1517` non apre niente. Big Bang Burger (1523) apre il popup
   con il listino («Big Bang Burger · 4 articoli», «scheda del negozio», «Mostra anche i 5 articoli non ancora in vendita»).
   Schermate `05-pin-untouchable-nascosto-chiuso`, `13-pin-big-bang-burger`.
6. **Pin → negozio esistono: 19, tutti dell'utente** (il commento in `mappeService.ts:335-338` che dice «nessun pin punta a un negozio» è
   superato). `dettaglioRiferimento` li gestisce (`case 'negozio'`, `mappeService.ts:201-204`). Alcuni puntano a un negozio di un altro
   quartiere:
   - distributori di Central Street → `distributore-shujin-cancello-2` (1768, 1769) e `distributore-shujin-edificio` (1527);
   - Tornello Ginza → `distributore-yongen-tabaccaio` (1548);
   - Vicoli di Yongen-Jaya → `distributore-shujin-cortile` (1584).

   Il censimento è in `dati.md` §4 («5 dei 9 pin dei distributori di Shujin stanno altrove»).
   `staccaDalleMappe` per un negozio stacca solo i pin `negozio` (`catalogoService.ts:308-315`).
7. **Un luogo con più negozi mostra solo il primo**: `LIMIT 1` / `negozi[0]` in `mappeService.ts:197`, `presenzaEntita.ts:96`,
   `QuartierePage.tsx:91`.
8. **Luoghi e negozi non passano dal cestino.** `eliminaElemento` fa un `DELETE` diretto per le righe dell'utente; per quelle della guida
   esistono solo «Nascondi» (pagina Rimossi) e «Ripristina» da `seed_json` (`catalogoService.ts:318-351`). `TipoCestino` non ha `luogo` né
   `negozio` (`shared/types.ts:2552`). Eliminare un negozio dell'utente non pulisce `acquisto_partita` né `punti_negozio_partita`.

## 1. Rotte e pagine FE
| Rotta (`src/router.tsx`) | Pagina | Cosa mostra / API |
|---|---|---|
| `guida/citta/:chiave` (86) | `QuartierePage` | carte dei luoghi con tipo, `quando`, giorni, sblocco, presenza (`LuogoDto.disponibilita` = solo sblocco, `cittaService.ts:60-63, 72`), Correggi (`:76`), «Articoli in vendita» → primo negozio (`:91`), «Aggiungi un luogo» (`:185`) · `GET /api/compendio/citta/:chiave` |
| `guida/negozi` (99) | `NegoziPage` (`:36-141`) | elenco per quartiere (`:73-74`), ricerca (`:68`), «Dove» = `sedeNome ?? luogo` (`:127`), `DoveSiTrova` (`:100-105`) · `GET /api/compendio/negozi` |
| `guida/negozi/:chiave` (100) | `NegozioPage` (`:35-118`) | listino, filtri, acquisto, quiz della sede, «Dove» con le tre forme vive e link `#luogo-` (`:80`), `DoveSiTrova` (`:102`), Correggi negozio (`:93, 96`) · `GET /api/compendio/negozi/:chiave`, `PUT /api/partite/:id/acquisti` |
| — `guida/luogo/:chiave` | **non esiste** | casa nuova (R5-17) |
| `guida/attivita` | `AttivitaPage` | sede con `#ancora` (`:79`), `CollegamentoMappa` (`:80`), `DoveSiTrova` (`:96`) |
| `guida/libri`, `guida/film`, `guida/videogiochi` | `LibriPage` (negozi `:131`, `sbloccaLuogo` = **quartiere** `:138`, `DoveSiTrova` `:187`), `FilmPage:181`, `VideogiochiPage:97, 182` | posizioni da `libro_posizione`/`film_posizione` (`attivitaService.ts:162-185`) |
| `confidenti/:chiave` | `ConfidenteDettaglioPage` | «Dove» = frase `c.disponibilita.luogo` (`:125`), `CollegamentoMappa` (`:122`) |
| `guida/mappe/:chiave` | visore (`VisoreMappa`) | popup `:864-911` (merce `:887`, «scheda del negozio» `:893-895`, «scheda del quartiere» `:903-905`); `SchedaSpillo` `:1106-` (luogo `:1149-1153`, negozio `:1154-1158`); `MerceNelPopup` `:997` |
| `guida/mappe/:chiave/modifica` | `EditorMappaPage` | `CollegamentoCitta` (`:536, 556-573, 668`, `cercaRiferimenti` → `mappeService.ts:1440-1462`; il riferimento `attivita` cerca in `luogo` `:1447`) |

Moduli di correzione: `src/components/guida/AzioniCatalogo.tsx:29-75`, `ModuloCatalogo` `:40-153`, `moduli/ModuloLuogo.tsx:24-48`
(definizione `moduli/definizioni.ts:142-152`), `moduli/ModuloNegozio.tsx:77-122` (definizione `:16-38`, «Come trovarlo» = frase `:90`),
`SceltaLuogo.tsx:32-54`. Campi del luogo modificabili dall'utente: `catalogoService.ts:38` (mancano `sblocco`, `confidenti_json`,
`piatti_json`, `negozio`, `giorni`).

Altri link verso negozi e luoghi: `src/utils/percorso.ts:43, 50` (diario → `/guida/negozi/<k>`), `ProgressiPartita.tsx:89, 166`,
`OggettiPage.tsx:76, 99, 223`, `sezioniGuida.tsx:35`, `ArticoliTabella.tsx:46` (`/guida/mondo/articolo/<k>`).

## 2. Percorsi dell'utente di oggi (provati)
| # | Partenza | Arrivo oggi | Schermata |
|---|---|---|---|
| U1 | La città › Shibuya | QuartierePage: carte dei luoghi; Untouchable «sera», giorni gio/sab/dom, sblocco in prosa | `04-quartiere-shibuya` |
| U2 | Carta del luogo › «Articoli in vendita» | `/guida/negozi/untouchable` (solo il primo negozio della sede) | `02-negozio-untouchable` |
| U3 | Guida › Negozi › riga | `/guida/negozi/<k>` | `01-negozi`, `14-negozio-big-bang` |
| U4 | Scheda del negozio › «Dove» | `/guida/citta/shibuya#luogo-shibuya-untouchable` (ancora nel quartiere) | `02-…` |
| U5 | Visore › tocco sul pin di un luogo con negozio | popup con listino; «scheda del negozio» → `/guida/negozi/<k>`; «scheda del quartiere» → `/guida/citta/<q>` | `13-pin-big-bang-burger` |
| U6 | Visore in un giorno di chiusura | il pin non c'è (nascosto come «non ancora disponibile») | `05-pin-untouchable-nascosto-chiuso` |
| U7 | Diario, voce «Acquista…» (negozio) | collegamento → `/guida/negozi/<k>`; «Sulla mappa» → `/guida/mappe/<planimetria>?spillo=<pin del luogo>` (`mappaAzione` `azioniStrutturateService.ts:52-56`); 18 voci negozio con «Sulla mappa» nel diario validato (L2 app.md §3) | `L3/…/12-percorso-0518` |
| U8 | Pagina del Confidente (Takemi) | «Dove» in prosa; mappa via `CollegamentoMappa` | `07-confidente-takemi`, `06-pin-takemi` |
| U9 | Shujin Academy › distributori (più negozi in una sede) | quartiere con un luogo «distributori», un negozio per volta | `10-quartiere-shujin-distributori`, `11-pin-distributore` |

## 3. Back-end
**Rotte**
- `server/routes/compendio.ts:152-179`: `/negozi`, `/negozi/:chiave`, `/articoli`, `/luoghi` (163), `/citta` (173), `/citta/:chiave` (176),
  ingresso (169-170).
- `server/routes/partite.ts:138`: `PUT /partite/:id/acquisti`.
- `server/routes/catalogo.ts:53-74`: CRUD del catalogo (POST `/:tipo` 57, PUT `/:tipo/:chiave` 64).
- `server/routes/mappe.ts:63-65`: `GET /riferimenti`.
- Punti negozio manuali: `server/routes/condizioni.ts:40, 88, 144-150`.

**Servizi**
- `cittaService.ts`: `collegamenti` 38-51, `luogoDto` 56-74 (giorni 65-67, negozio ricostruito dalle sedi 64, 68), `regoleSbloccoLuoghi`
  77-85, `dettaglioQuartiere` 133-150 (marcatori 137), `elencaLuoghi` 153-156.
- `catalogoService.ts`: campi 32-41, profili 70-81, `verificaRiferimenti` 120-134, `normalizzaScrittura` 176-181 (il quartiere segue la sede),
  `creaElemento` 240-279, `aggiornaElemento` 282-294, `nascondiElemento` 297-302, `staccaDalleMappe` 308-315, `eliminaElemento` 321-351.
- `negoziService.ts`: `leggiProgrammaPunti` 37-44, `riassunto` 48-59 (orari = presenza 34, 50-52), `disponibilitaArticolo` 64-68
  (`daNegozio`), `articoloDto` 74-83, `elencaNegozi` 93-97, `dettaglioNegozio` 109-121, `ricercaArticoli` 136-153, `impostaAcquisto` 156-171.
- `mappeService.ts`: `dettaglioRiferimento` 175-220 (luogo/attività 192-200 col primo negozio della sede 196-197; negozio 201-204),
  `negozioDettaglio` 223-237, `conNegozioVivo` 334-344, `dettagliSpillo` 353-384 (`SpilloDto.nome/descrizione` 380).
- `presenzaEntita.ts` 87-120 (non usata in produzione, §0.4).
- `accessoMondoService.ts`: luogo → negozi 73-76, Confidente → `confidenti_json` 93, negozio → sede 110-112, 150-155, `nomeSpillo` 120-121.
- `azioniStrutturateService.ts`: `mappaAzione` 48-63, `nomeRiferimento` 68-88, elenco negozi con la frase `luogo` 144.
- `giornataService.ts` 56-61 (nome del negozio dal vivo in `nomeRiferimento`), 97, 177.
- `disponibilitaService.ts`: `nomeNegozio` 163-166, spesa e punti 139-144.
- `suggerimentiService.ts` 79, 88, 178.
- `compendioService.ts` 385-390 (frase «dove» del Confidente).

**Schemi zod** (`server/schemas/catalogo.ts`): `orariNegozio` 25-30, `datiNegozio` 60-73, `datiArticolo` 76-108, `datiLuogo` 214-225
(`quando` 221).

## 4. Dati e schema letti dal codice
- `luogo`: 015 (`015_citta.ts:20-37`), 071 (origine, nascosto, `seed_json`, `condizioni_json`), 080 (`giorni_json`), 081 (istantanee), 072
  (7 luoghi creati, `luogo.negozio` azzerato). `attivita_json` e `negozio` non li legge più nessuno (`cittaService.ts:5-9`).
- `negozio`: 017 (frase `luogo`, `luogo_chiave` = quartiere, frase `orari`, frase `sblocco`), 035, 036/070 (condizioni spostate sugli
  articoli), 069 (`orari_json`; la frase resta), 072 (`sede_chiave`), 076 (`programma_punti_json`).
- `articolo`: 017, 035, 036, 058 (`oggetto_fonte`, `oggetto_chiave`, `quantita`), 059 (`effetto_json`).
- Marcatori:
  - `marcatore_luogo` (022): letto da `cittaService.ts:137` → `LuogoDto.marcatore`, nessun lettore FE; `sincronizzaMappe.ts:163-177`.
  - `marcatore_mappa` (013/020): `dungeonService.ts:86-89, 1112`, `sincronizzaMappe.ts:136-160`, `cestinoService.ts:71`. Riguarda i
    Palazzi: sono le posizioni delle «schede senza mappa» di L4.
- Confidente ↔ luogo in tre forme: `luogo.confidenti_json`, `negozio.confidente_chiave`, frase `confidente_disponibilita.luogo`.
- Partita: `utente.acquisto_partita (partita_id, articolo_chiave)` (`schemaUtente.ts:25`), `utente.punti_negozio_partita` (`:59`), senza FK
  verso il file di gioco (`RIFERIMENTI_PARTITE` in `pacchettoGiocoService.ts:62-63`).

## 5. DTO (`shared/types.ts`)
| DTO | Righe | Campi rilevanti |
|---|---|---|
| `NegozioRiassuntoDto` | 1290-1313 | `luogo` (frase), `luogoChiave`, `quartiereNome`, `orariStrutturati`, `orariTesto`, `sedeChiave`, `sedeNome`, `programmaPunti`, `disponibilita` |
| `ArticoloDto` | 1321-1347 | — |
| `NegozioDettaglioDto` | 1349-1356 | — |
| `RicercaArticoliDto` | 1358-1361 | — |
| `LuogoDto` | 1420-1457 | `quando`, `giorni`, `giorniTesto`, `sblocco`, `negozi`, `negozio`, `marcatore`, `condizioni`, `disponibilita` |
| `QuartiereDettaglioDto` | 1459-1476 | — |
| `AttivitaDto` | 1478-1516 | `sedeChiave`, `sedeNome` |
| `LibroDto` | 1518- | `negozi` 1540, `posizioni` 1543 |
| `FilmDto` | 1568- | `posizioni` 1585 |
| `DettaglioSpilloDto` | 2068-2078 | `luogo` senza giorni né orari 2074; `negozio` 2075 |
| `SpilloDto` | 2123-2168 | `nome`, `descrizione` 2136-2137 |
| `LuogoOpzioneDto` | 2448 | — |
| `TipoCatalogo` / `TIPI_CATALOGO` | 2445, 2508 | — |
| `ElementoCatalogoDto` | 2532-2543 | — |
| `TipoCestino` | 2552 | — |

`OrariNegozio` è definito in `shared/orariNegozio.ts:19-27`, con `leggiOrari` 44-47, `orariComeCondizioni` 64-70 e `descriviOrari` 94-102.

## 6. Test coinvolti
**Server**
- `negozi.test.ts` (29, 50, 95, 132, 159);
- `negozio-del-pin.test.ts` (35, 48);
- `catalogo.test.ts` (23, 53, 76, 87: eliminazione vera con gli articoli);
- `struttura-server.test.ts` (25: Untouchable e Takemi giorno/sera; 74: 93 luoghi e CRUD; 116);
- `citta.test.ts` (20, 44, 66, 86);
- `attivita-mappa.test.ts:15` (un pin di città non tiene condizioni);
- `piante-citta.test.ts` (26, 39: `marcatore_luogo`, 51);
- `accesso-mondo.test.ts` (28, 64, 104, 120);
- `libri.test.ts` (19, 142), `film.test.ts:20`, `cestino.test.ts` (solo i tipi di oggi), `mappe-editor.test.ts:264-273`;
- `visibilitaCondizionale.test.ts` (44, 183, 212, 232);
- migrazioni 069, 070, 071, 072, 080, 081.

**FE**
- `NegozioPage.test.tsx` (44, 79, 97, 108, 116, 127: link `#luogo-shibuya-untouchable`, 155, 174);
- `NegoziPage.test.tsx` (45, 53, 72, 82, 106, 117);
- `CittaPage.test.tsx` (QuartierePage 201-238, «Articoli in vendita» → `/guida/negozi/untouchable` 216);
- `VisoreMappa.test.tsx` (85-100: scheda del negozio e href; 131: acquisto);
- `SchedaAttivita.test.tsx:11`;
- `DoveSiTrova.test.tsx` 60-125;
- `AttivitaPage.test.tsx` (34-42, 105);
- `ModuloLuogo.test.tsx:11`, `LibriPage.test.tsx:68`, `VideogiochiPage.test.tsx:76`, `AccessoMondoPage.test.tsx:52-55`,
  `EditorMappaPage.test.tsx:94-104`.

Manca un test di pagina per il luogo (pagina nuova) e per la presenza del luogo nel visore (oggi non c'è).

## 7. Schermate «prima»
Cartella `lotti/L5/schermate-prima/`, 70 file alle misure 1280x800, 768x1024, 375x812, 1366x657, 1280x689, partita 1 al 06-01 (mercoledì,
giorno), Chrome headless, sola lettura. Viste:
- `01-negozi`, `02-negozio-untouchable`, `03-negozio-takemi`, `14-negozio-big-bang`;
- `04-quartiere-shibuya`, `10-quartiere-shujin-distributori`;
- `05-pin-untouchable-nascosto-chiuso`, `06-pin-takemi`, `11-pin-distributore`, `13-pin-big-bang-burger`;
- `07-confidente-takemi`, `08-attivita`, `09-libri`, `12-oggetti`.

Con `?spillo=` il popup si apre solo se il pin è visibile quel giorno.

## 8. Cosa cambierà per l'utente
1. Ogni luogo ha la sua pagina (`/guida/luogo/<k>`) con orari e «aperto adesso?» in cima, listino di **tutti** i negozi della sede,
   Confidenti, attività e «Dove si trova». Oggi il luogo è una carta nel quartiere e il listino sta in un'altra pagina (`/guida/negozi/<k>`),
   che diventerà un rimando alla sezione.
2. Scheda, quartiere e visore dicono **gli stessi orari**. Oggi divergono (23/57) e il visore conosce solo gli orari del primo negozio.
3. Il pin mostra il nome e la descrizione del luogo: rinominare il luogo cambia il pin. Oggi il pin ha la sua copia.
4. «Aggiungi luogo» dalla planimetria crea anche il pin. Eliminare un luogo o un negozio passa dal cestino (oggi è definitivo per quelli
   dell'utente).
5. Invariati: posizioni dei pin, listini, prezzi, acquisti, punti negozio, testo e spunte del diario.

## 9. Segnalazioni per Stesura modifiche (fatti, non progetto)
- **A.** Decidere se il visore deve nascondere un luogo chiuso (oggi lo nasconde per gli orari del negozio, U6) o mostrarlo «chiuso adesso»:
  con una sola fonte (il luogo) il comportamento cambia per tutti i luoghi senza negozio.
- **B.** `applicaPresenzaAiLuoghi` esiste ma non gira, e i pin di città non ammettono condizioni: la presenza «una fonte» deve passare per un
  calcolo dal vivo, non per una copia sul pin.
- **C.** 19 pin dell'utente puntano a un negozio, 5 a un negozio di un altro quartiere (§0.6): servono un elenco approvabile e la regola
  «pin → luogo».
- **D.** `LibroDto.sbloccaLuogo` è un quartiere, non un luogo (`attivitaService.ts:94-99`): da tenere per L6.
- **E.** Eliminare un negozio dell'utente lascia orfani `acquisto_partita` e `punti_negozio_partita` (§0.8).

## 10. Etichette di navigazione — un posto chiamato «Mappa» o con il tipo al posto del nome (richiesta dell'utente via PM e Stesura, 2026-10-20)
La colonna «Nome che servirebbe» dice anche **che cosa indica davvero** l'etichetta: Città, quartiere, area (mondo), area del Palazzo,
planimetria vera (immagine), luogo o negozio. Le briciole del visore (`VisoreMappa.tsx:664-675`) e «Su: <genitore>» (`:694`) usano già i
nomi: non sono nel censimento. **«Modifica mappa» (M9) e i testi dell'editor (M27) riguardano davvero l'immagine e i pin: da decidere** se
diventano «Modifica planimetria» / «Modifica <nome>».
L'utente vuole che nei menu e nei gesti di navigazione i posti si chiamino con il loro nome (Shibuya, Central Street, Untouchable, Palazzo
di Madarame) e non «Mappa», parola che si confonde con le mappe vere. Questo censimento elenca ogni etichetta trovata, in app e nel codice,
divisa per vista. Le righe valgono per la cartella di sviluppo al 2026-10-20 (`DungeonDettaglioPage.tsx` ±5).

### 10.1 «Mappa» / «Mappe» / «Apri la mappa» al posto del nome del posto
| # | Dove (vista) | File:riga | Testo oggi | Nome che servirebbe |
|---|---|---|---|---|
| M1 | Home, linguetta della mappa a scomparsa | `src/pages/HomePage.tsx:143` | «Mappa» | il posto mostrato (Tokyo / il quartiere / l'area dell'azione) |
| M2 | Oggi, didascalia sotto la mappa | `src/components/partita/OggiMappa.tsx:73` | «Mappa dell'azione scelta» / «Mappa di Tokyo: tocca un quartiere…» | nome del posto dell'azione |
| M3 | Guida, carta della sezione | `src/components/guida/sezioniGuida.tsx:25` | «Mappe» | (sezione: da decidere in L11, indice come albero «Tokyo › …») |
| M4 | Indice Mappe, intestazione e testo | `src/pages/MappaPage.tsx:73, 109-110` (titolo pagina «Mappe», «Tutte le mappe della guida… N mappe con N spilli») | «Mappe» | L11 (albero della gerarchia) |
| M5 | Indice, riga del gruppo | `MappaPage.tsx:142` | «Città · 271 spilli · 47 mappe»; «N mappe» | «47 posti» / quartieri e aree contati per nome del livello |
| M6 | Indice, pulsante del pannello | `MappaPage.tsx:200` | «Apri questa mappa» / «Apri la mappa di Tokyo» | «Apri Shibuya» / «Apri Tokyo» |
| M7 | Indice, griglia | `MappaPage.tsx:360` (aria) | «Apri …: N mappe dentro» | «N aree» / «N planimetrie» |
| M8 | Titolo della scheda del browser nel visore | `MappaPage.tsx:385` | «<nome> — Mappe» / «Mappa» | «<nome> — <quartiere/Palazzo>» |
| M9 | Visore e griglia, azione | `MappaPage.tsx:269, 403`; `MappaIncorporata.tsx:133` | «Modifica mappa» | «Modifica Central Street» (o «Modifica planimetria» nell'editor) |
| M10 | Mappa incorporata (scheda del quartiere, «Dove si trova») | `src/components/mappe/MappaIncorporata.tsx:110` | «Apri la mappa e i contenuti della guida» | «Apri Central Street» |
| M11 | Mappa incorporata, errore | `MappaIncorporata.tsx:95-96` | «Mappa «chiave» non disponibile», «Nessuna mappa «chiave»», «Tutte le mappe» | il nome del posto (oggi mostra la **chiave interna**) |
| M12 | Mappa incorporata, elenco figli (aria) | `MappaIncorporata.tsx:111` | «Mappe di <nome>» | «Aree di Shibuya» |
| M13 | Accesso al mondo | `src/pages/AccessoMondoPage.tsx:109` | «Tutte le mappe» | — |
| M14 | Accesso al mondo, testo del tipo | `src/utils/accessoMondo.ts:46` (`nomeTipoAccessoMondo('mappa')`) | «Mappa: <nome>» (`AccessoMondoPage.tsx:57`) | «Area: …» / «Quartiere: …» dal livello |
| M15 | Scheda del Palazzo / dei Memento | `src/pages/DungeonDettaglioPage.tsx:≈441` | «Mappa del Palazzo» / «Mappa dei Memento» (porta alla griglia, L3 §0.1) | «Palazzo di Madarame» sulle sue aree (L3) |
| M16 | Visore, pannello: elenco dei figli (aria) | `src/components/mappe/VisoreMappa.tsx:696` | «Mappe figlie» | «Aree» / «Planimetrie» |
| M17 | Visore, immagine (aria/alt) | `VisoreMappa.tsx:788, 794` | «Mappa: <percorso>» / «Mappa: <nome>» | «Planimetria di Central Street» |
| M18 | Visore, titoli di ripiego | `src/utils/vocabolarioMappe.ts:19, 30` | «Mappe collegate» / «Mappe» | nome del livello |
| M18b | Visore di un'area del mondo, intestazione dei vicini | `vocabolarioMappe.ts:16` (`titoloMappeVicine('luogo')`), mostrato in `VisoreMappa.tsx:693` | «Planimetrie e mappe collegate» (schermata `L2/…/08`) | indica: aree vicine + quartiere sopra → «Aree vicine» |
| M18c | Visore, selettore delle sorelle | `vocabolarioMappe.ts:24-43` → `MappaPage.tsx:393` | etichetta «Aree» (area del mondo) ma le opzioni sono **aree diverse** e cambiano posto; su un quartiere «Quartieri» | indica: altre aree dello stesso quartiere (L2 §2) |
| M19 | Albero dell'indice (aria) | `src/components/mappe/AlberoLuoghi.tsx:51` | «Mappe di <nome>» / «Mappe» | «Aree di …» |
| M20 | Ingresso del quartiere | `src/components/mappe/IngressoQuartiere.tsx:88` | «Mappa iniziale» | «Area d'ingresso» (R2-21) |
| M21 | Scheda del quartiere (aria) e didascalia | `src/pages/QuartierePage.tsx:159, 169` | «Mappa di Shibuya», «Mappa da <fonte>…» | «Central Street» (l'area mostrata) |
| M22 | Dove si trova | `src/components/mappe/DoveSiTrova.tsx:113` | «Apri sull'atlante» | «Apri Central Street» |
| M23 | Diario (guida giorno per giorno e Oggi), cartellino della voce | `src/components/guida/PartiAzione.tsx:53-54` | «Sulla mappa» (75 voci del validato, L2 §3) | «Central Street» / «Clinica Takemi» (il posto del pin) |
| M24 | Oggetti, colonna «Dove» | `src/pages/OggettiPage.tsx:75-76, 98-99` | «Sulla mappa» | il nome del negozio / luogo |
| M25 | Negozi, pulsante | `src/pages/NegoziPage.tsx:106, 129` | «Posizione» (icona mappa) | il nome della sede |
| M26 | Palazzo, atterraggio | `src/components/guida/AtterraggioTokyo.tsx:77, 142` | «Sulla mappa di Tokyo» | ammissibile (nomina Tokyo), da uniformare |
| M27 | Editor (tecnico) | `src/pages/EditorMappaPage.tsx:119, 220, 236-237, 308, 315, 381, 546, 654, 729, 735, 740, 774` | «Modifica: … — Mappe», «Apri il visore», «Mappa collegata creata», «Mappa salvata/eliminata/creata», sezione «Mappa», «Mappa di arrivo», «Tipo di mappa», «Mappa genitore» | secondo il piano «Mappa» resta solo nome tecnico: nell'editor diventano «Planimetria», «Area», «Arrivo: <nome>» |
| M28 | Mappa di Tokyo (aria) | `src/components/mappe/MappaTokyo.tsx:444, 484` | «Mappa di Tokyo con N mete…» | accettabile (nomina Tokyo) |
| M29 | Impostazioni, immagini caricate | `src/components/impostazioni/ImmaginiCaricate.tsx:24` | «Mappe scaricate» | «Planimetrie e illustrazioni» |

### 10.2 Il tipo al posto del nome
| # | Dove | File:riga | Oggi | Nota |
|---|---|---|---|---|
| T1 | Visore, chip accanto al titolo | `VisoreMappa.tsx:674` (`NOME_TIPO_MAPPA[mappa.tipo]`, `shared/spilli.ts:318-320`) | «Area», «Quartiere», «Planimetria», «Città» | doppio significato: `luogo`→«Area», `area`→«Planimetria» (L2 §11.C) |
| T2 | Visore, elenco dei figli | `VisoreMappa.tsx:702`; editor `EditorMappaPage.tsx:499` | nome + «Area · N» / «Planimetria · N» | il tipo resta come sottotitolo: va bene se il nome è il posto |
| T3 | Indice, riga del gruppo | `MappaPage.tsx:142` | «Città · …», «Palazzo · …», «Area · 27 spilli · 5 versioni» (Covo) | — |
| T4 | Visore, «Scheda del …» | `src/utils/accessoMondo.ts:52-64` (`titoloSchedaAccessoMondo`), usato in `MappaPage.tsx:268, 403` | «Scheda del quartiere», «Scheda del Palazzo», «Scheda del negozio», «Scheda del luogo» | è il pulsante «Scheda del quartiere» in alto nel visore di Shibuya (schermata `L2/…/07`): **tipo, non nome** → «Shibuya» |
| T5 | Popup del pin del luogo | `VisoreMappa.tsx:904, 1151` | link «scheda del quartiere» (testo minuscolo) e «scheda del negozio» (`:893-895, 1158`) | → «Shibuya», «Untouchable» |
| T6 | Pin di un Confidente non collegato | `VisoreMappa.tsx:900-901` | «Confidenti — la pagina dei Confidenti» → link rotto `/confidenti` (L9 §0.9) | — |
| T7 | Ingresso, selettore | `IngressoQuartiere.tsx:76`; editor `:540, 740` | dettaglio/gruppo = `NOME_TIPO_MAPPA` | — |
| T8 | Collegamento generico | `src/components/mappe/CollegamentoMappa.tsx:16` (predefinito «Dove si trova») | usato da Attività (`AttivitaPage.tsx:80`), Confidente (`ConfidenteDettaglioPage.tsx:122`) | ok come azione; il nome del posto non compare |
| T9 | Accesso al mondo, intestazione | `AccessoMondoPage.tsx:57` | «<Tipo>: <nome dello spillo>» (es. «Mappa: …», «Punto di interesse: …») | — |

### 10.3 Nei dati: i pin di passaggio con un nome proprio diverso dalla meta
Nel visore (etichetta `VisoreMappa.tsx:860`, elenco `:774, 966`, scheda `:1123`) il pin mostra **il suo nome**, non quello del posto in
cui porta. Sui pin `riferimento_tipo='mappa'` (passaggi, scale, uscite) la situazione è questa (sola lettura su `data/gioco.db`):
- **229** pin in tutto, e solo **48** hanno il nome uguale alla meta;
- nel mondo i nomi diversi più frequenti sono:

  | Nome del pin | Pin (id) | Meta |
  |---|---|---|
  | «Piano 1/2/3» | 285, 304, 1669-1696, 1712 | «Edificio principale NP / Edificio laboratori NP» |
  | «Banchina Metro» | 1478, 1635, 1649 | — |
  | «Stazione Metropolitana» | 337, 1716 | — |
  | «Scelta Stazione» | 1770 | Tokyo |
  | «Yongen-Java» | 1647, 1648 | — |
  | **«Mappa»** | 1628, su Vicoli | Yongen-Jaya |
- nei Palazzi: «Uscita» (515 → Shujin Academy, 734 → Central Street), «Passaggio» (578), «Piano 2» (1866).

È lo stesso problema del pin che copia il nome del luogo (§0.2): la meta va letta dal posto. `NavigazioneSpillo.tsx:16` («Vai: <nome>»)
e `DoveSiTrova.tsx:86-89` mostrano già il nome della meta. L'elenco completo dei 181 pin si rigenera con la query di sola lettura
`spillo JOIN mappa ON riferimento_chiave` (`riferimento_tipo='mappa' AND lower(s.nome)<>lower(m.nome)`).

### 10.4 Dove va
- Lotti: L2 (pagine Quartiere e Area: M6, M10, M15-M22, T1-T4), L3 (M15), L5 (pin e luoghi: T5, 10.3, M23-M25), L11 (M3-M5, indice).
- Stesura modifiche: a chi decide la regola unica «il gesto porta il nome della destinazione» (es. un'etichetta da `nomePresentazioneMappa`
  / nome del posto) e la lista di testi da cambiare.

## 11. Aggiornamento dopo L2–L4 (richiesta del PM, 2026-10-20, codice di `pensive` non committato e browser 5373)
Ho riletto il §0–§10 contro il codice di oggi, che contiene L2 committato e L3/L4 nella copia di lavoro. Lavoro in sola lettura: codice,
navigazione nel browser, nessuna scrittura. Righe valide al 2026-10-20 ~07:00.

### 11.1 Cosa è cambiato o è superato
- **Una vista in più: la pagina Area** (`src/pages/AreaPage.tsx`, rotta `guida/citta/:chiave/:area`, `router.tsx:91`). Nel pannello del
  visore c'è **«Luoghi qui»** (`AreaPage.tsx:246-260`): gli elementi segnati sulle planimetrie dell'Area.
  - Gli elementi sono pin con riferimento `luogo`, `negozio`, `attivita` o `confidente` (`areeService.ts:205-215`). Il **nome** viene
    letto dal vivo dall'entità (`NOMI_ELEMENTI`), non dal pin.
  - Un tocco seleziona il pin, «Scheda» apre la pagina della guida. Per un **luogo** la scheda è ancora `/guida/citta/<q>#luogo-…`
    (`AreaPage.tsx:45`: «fino a L5»), per un **negozio** `/guida/negozi/<k>`.
  - È un nuovo lettore di luoghi e negozi da portare alla pagina del luogo (R5-17), e un nuovo percorso dell'utente (U10):
    quartiere → area → «Luoghi qui» → luogo.
- **§10.3 (pin di passaggio col nome proprio) — risolto da L2.** Il visore mostra il nome della **meta**: `nomePin` →
  `nomeMetaSpillo` (`VisoreMappa.tsx:149`, `utils/navigazioneMappa.ts:86-90`). La scheda del pin dice «Pin: «…»» quando il nome del pin è
  diverso (`VisoreMappa.tsx:1200`).
- **§0.2 (il pin copia nome e descrizione del luogo) — ancora valido.** `nomePin` vale solo per i passaggi: i pin dei luoghi mostrano
  ancora `s.nome`.
  - Esempi su Central Street: il pin «Cinema», mentre «Luoghi qui» dice «Videonoleggio Scarlet» e gli altri nomi del luogo.
  - Il popup del pin di un luogo ora ha come titolo del collegamento il **nome del luogo** (`VisoreMappa.tsx:952`, era «scheda del
    quartiere»), ma porta ancora a `/guida/citta/<quartiere>` **senza** ancora.
  - Nella scheda del pin resta il testo «scheda del quartiere» (`VisoreMappa.tsx:1228`).
- **§0.5 / §2 U6 (il luogo chiuso sparisce dal visore) — cambiato in parte.** La regola resta: il visore nasconde ogni pin non
  «disponibile» (`nascostoPerCondizioni`, `VisoreMappa.tsx:226`; filtro `:583`; conteggio «Mostra anche i non ancora disponibili (N)»
  `:543`; attivo con una partita e fuori dall'editor, `filtraBloccati` `:540`). Ma ora c'è una **via per vederlo**: da «Luoghi qui» il pin
  scelto si mostra anche se non disponibile (`pinChiesto`, `AreaPage.tsx:118-124`; `mostraNonDisponibili` iniziale, `VisoreMappa.tsx:261`;
  UX2-2 di L2).
  - Al 06-01: Central Street «Spilli (21 di 24)», non disponibili 3. **Untouchable** è in «Luoghi qui» ma il suo pin non è sulla mappa.
  - **Il punto in cui si deciderà «chiuso: nascosto o mostrato come chiuso»** (segnalazione A del §9) è quindi
    `VisoreMappa.tsx:226/540/583`, più il comportamento di «Luoghi qui» (`AreaPage`).
  - La presenza del luogo continua a non arrivare al visore: `applicaPresenzaAiLuoghi` non gira (`presenzaEntita.ts:87`, nessun
    chiamante) e il negozio decide da solo (`conNegozioVivo`, ora `mappeService.ts:402-445`).
- **§0.6 (pin → negozio di un altro quartiere) — ora si vede di più.** In «Luoghi qui» di **Central Street** compaiono «Distributore del
  cancello» ×2 e «Distributore Edificio Scolastico»: sono negozi della **Shujin** (`distributore-shujin-cancello-2`,
  `distributore-shujin-edificio`), agganciati ai pin 1768, 1769 e 1527 di Central Street. Lo stesso vale nelle altre aree con quei pin
  (Tornello Ginza, Vicoli). L'elenco approvabile pin → luogo (§9.C) diventa più urgente.
- **Invariati e ancora validi:**
  - §0.1: nessuna pagina del luogo; il luogo è una carta con ancora in `QuartierePage.tsx:62`;
  - §0.3: orari di scheda, negozio e visore da fonti diverse; `QuartierePage.tsx:69, 74` mostra `quando`/`giorniTesto` del luogo;
  - §0.7: un solo negozio per sede (`QuartierePage.tsx:92` «Articoli in vendita» → `l.negozio`; `mappeService.ts:246` `LIMIT 1`);
  - §0.8: luoghi e negozi fuori dal cestino. `TipoCestino` ora ha anche `area-fisica` (L2), ma non `luogo` né `negozio`
    (`shared/types.ts:2797`).
- **Righe spostate dal lavoro di L2–L4:** in `VisoreMappa.tsx` il popup è ≈+48 righe (link al luogo 952, al Confidente 945-950, «scheda del
  negozio» 1235). I riferimenti del §1 a `QuartierePage` valgono ±1.

### 11.2 Stato del censimento «Etichette di navigazione» (§10) sul codice di oggi
| Voce | Stato |
|---|---|
| M6, M10, M11 (chiave interna), M12, M13 («La città»), M17, M18b, M19, M20 («Mappa iniziale»), M21, T4 (`titoloSchedaAccessoMondo('quartiere')` → nome del quartiere), §10.3 | **risolte da L2** |
| M15 («Mappa del Palazzo») | **risolta da L3** (resta «Mappa dei Memento») |
| M1 Home linguetta «Mappa» (`HomePage.tsx:143`), M2 `OggiMappa.tsx:62`, M4 sottotitolo dell'indice (`MappaPage.tsx:118`), M5 «N mappe» (`MappaPage.tsx:150`) | **restano** |
| M9 «Modifica mappa» (`MappaPage.tsx:279, 431`, `MappaIncorporata.tsx:153` dice già «Modifica planimetria») | **resta**, da decidere |
| M14 `accessoMondo.ts:46` «Mappa» | **resta** |
| M22 «Apri sull'atlante» (`DoveSiTrova.tsx:113`) | **resta** |
| M23 diario «Sulla mappa» (`PartiAzione.tsx:55-56`) | **resta** |
| M24 Oggetti «Sulla mappa» (`OggettiPage.tsx:76, 99`) | **resta** |
| M25 Negozi «Posizione» | **resta** |
| M27 editor | **resta** |
| M29 «Mappe scaricate» | **resta** |
| T1 chip del tipo nel visore (`NOME_TIPO_MAPPA`) | non più nelle viste del mondo e dei Palazzi, che usano Area e scheda; resta nel visore generico |
| T5 «scheda del quartiere» (`VisoreMappa.tsx:1228`) | **resta**; il popup (`:952`) usa il nome del luogo |
| T6 link rotto `/confidenti` (`VisoreMappa.tsx:949`) | **resta** |

### 11.3 Per Stesura (L5)
1. Ai lettori del §1 si aggiungono «Luoghi qui» di `AreaPage` e il suo collegamento «Scheda» (`AreaPage.tsx:45`), da portare a
   `/guida/luogo/<k>`.
2. La decisione «chiuso: nascosto o mostrato» tocca `VisoreMappa.tsx:226/540/583` **e** il comportamento di «Luoghi qui», che oggi rivela il
   pin a richiesta.
3. Il nome del luogo letto dal vivo esiste già in «Luoghi qui» (`NOMI_ELEMENTI`): manca solo il pin del visore (§0.2).
4. I 5 pin di distributori agganciati a negozi di un altro quartiere sono ora visibili come luoghi di quell'area (§0.6).
5. Il censimento §10 si riduce alle voci «resta» della tabella del §11.2.
