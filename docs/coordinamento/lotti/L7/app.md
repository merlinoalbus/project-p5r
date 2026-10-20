# L7 «Oggetti» — analisi dell'app attuale

Autore: sessione «Analisi app attuale» (2026-10-20). Analisi in sola lettura:
- codice nella cartella di sviluppo `C:\Repository\project-p5r\.claude\worktrees\pensive-burnell-b50941` (`newreview`);
- database `data/gioco.db` e `data/partite.db` aperti in sola lettura;
- FE e BE interrogati solo con GET. Nessuna scrittura.

Fonti incrociate: `requisiti.md` (R7-01…R7-26). `dati.md` di L7, incrociato a stesura finita: regali 8 divergenti su
114, Jose 24/37, forzieri 129 (53 abbinamenti certi, 42 da approvare). Dove le cifre differiscono vale `dati.md`.

## 0. Fatti che contano per il progetto
1. **Gli oggetti stanno in sei archivi diversi**, legati quasi solo per nome:

   | Archivio | Contenuto | Chiave |
   |---|---|---|
   | `oggetto` | 223 pezzi di equipaggiamento, nome inglese, italiano in `traduzione` | numerica |
   | `dati_guida['oggetti-guida']` (solo JSON) | consumabili 247, chiave e materiali 108, ricette 10, abiti 55, scambi di 5 venditori | nessuna: si riconoscono per nome |
   | `articolo` | 587 articoli dei negozi | — |
   | `libro`, `film` | 46 libri, 30 film | — |
   | `attivita` con `tipo='videogioco'` | 7 videogiochi | non esiste una tabella `videogioco` |
   | `confidente_regalo` | 144 regali, costo in testo | solo per nome |

   I ponti fra archivi sono tre:
   - `articolo.oggetto_fonte` + `oggetto_chiave` (migrazione 058): **collegati solo 41 libri e 7 videogiochi**. Per la fonte `guida`
     la chiave è ancora un nome (`consumabili/<nome>`, `oggettiSelezionabili.ts:105, 113, 118`).
   - Il ponte per nome `dati_guida['oggetti-crosswalk']`: 121 abbinamenti su 575 articoli, usato in `compendio.ts:98-107`.
   - Il confronto per slug del nome in `suggerimentiService.ts:95-107, 194-198`.
2. **Il prezzo vive sull'articolo, ma ha delle copie.** `articoloDto` prende dall'oggetto collegato nome, categoria, effetto e
   statistiche, ma il prezzo lo prende dall'articolo (`negoziService.ts:74-83`, `prezzo: r.prezzo`). Le copie del prezzo sono:
   - `libro.prezzo`, mostrato solo se il libro non ha negozi (`LibriPage.tsx:139`);
   - `attivita.costo` dei videogiochi (`VideogiochiPage.tsx:98`);
   - `film.prezzo` (`FilmPage.tsx:140`);
   - `oggetti-guida.consumabili[].prezzo` (`OggettiPage.tsx:76`): 2 diversi dall'articolo;
   - `confidente_regalo.costo` in testo (`ConfidenteDettaglioPage.tsx:193`): 8 diversi su 114 confrontabili secondo `dati.md`
     (es. «Braccialetto d'argento»).
3. **Il nome dell'articolo è copiato anche quando è collegato.** `datiArticolo.nome` è obbligatorio (`schemas/catalogo.ts:84`) e il modulo
   copia nome, categoria e prezzo dell'oggetto (`ModuloArticolo.tsx:38-43`). La copia la leggono:
   - la ricerca (`negoziService.ts:140`);
   - lo storico («Acquistato: <nome>», `:167`);
   - i nomi nelle condizioni (`condizioni/nomiCondizioni.ts:44`, `condizioni.ts:53`);
   - i suggerimenti.
4. **Riferimenti per nome.**
   - Regali graditi: `confidente_regalo.nome`. Lo stato di partita `regalo_partita.regalo` è TEXT (`schemaUtente.ts:61`) e
     `impostaRegaloFatto` (`partiteService.ts:326-338`) non controlla che il nome esista.
   - Ricompense: `richiesta.ricompense_json` (stringhe), `domanda.ricompensa`, `esame_premi`, sfide e battaglia.
   - Contenuto dei forzieri: `punto_interesse.dettagli_json.contenuto`, testo. **174 voci** ce l'hanno: forziere 79, forziere-chiuso 16,
     oggetto 24, puzzle 18, miniboss 14, boss 13, volontà 7, altro 2, ombra-sciagura 1.
   - Scambi: `oggetti-guida.scambi[].offerte{ricevi, dai, note}` e, di nuovo per Jose, `dati_guida['jose']`. **Jose è descritto due volte.**
   - Fabbricazione: `ricette[].materiali[].nome`.
   - Voci d'acquisto del diario: 64 senza riferimento, l'oggetto è nominato solo nel testo dell'azione. `RiferimentoAzioneDto` non ha un
     tipo `articolo` (`types.ts:1068`).
5. **Riferimenti per chiave** (da preservare):
   - condizione `{tipo:'articolo'}` (`condizioniSpillo.ts:102`, valutata su `acquisto_partita`, `disponibilitaService.ts:193-196`);
   - `lettura` (`:101`), `contatore`, `rango-cliente`/`punti-negozio` (`:106`);
   - effetti `lettura` e `turno` delle voci (`effettiAzione.ts:52-55`);
   - `libro_posizione` e `film_posizione`.
6. **Non esistono pagine di un singolo oggetto.** `OggettiPage` ha sette schede (`?scheda=`, `OggettiPage.tsx:28-36`) senza dettaglio;
   `ArticoliTabella` porta a `/guida/mondo/articolo/<k>` (`:46`), cioè alla mappa e non a una scheda. La lista dei regali del Confidente
   non ha link (`ConfidenteDettaglioPage.tsx:181-198`).
7. **Gli oggetti non passano dal cestino.** Le righe dell'utente si cancellano definitivamente (`catalogoService.ts:323-329`, con cascata
   negozio→articoli); quelle della guida si nascondono o si ripristinano dal seed. Restano orfani `acquisto_partita`, `lettura_partita` e
   le condizioni (lo segnala solo `RIFERIMENTI_PARTITE`, `pacchettoGiocoService.ts:61-88`). I forzieri, essendo voci, passano già dal cestino.
8. **Equipaggiamento citato per nome anche dalle Persona:** `persona.oggetto`, `oggetto_allarme`, `oggetto_e_carta` contengono
   `oggetto.nome` (`001_compendio.ts:42`; join in `compendioService.ts:269-278`). I `tesoro` sono Demoni del Tesoro, non oggetti: fuori
   perimetro.
9. **`OggettoSelezionabileDto` è dichiarato due volte** (`shared/types.ts:2515` e `oggettiSelezionabili.ts:43`).
   **Il costo di `risolviOggettoCollegato` è ripetuto per ogni articolo:** ricostruisce l'archivio della sua fonte ogni volta
   (`oggettiSelezionabili.ts:174-186`), e quindi a ogni articolo letto.

## 1. Pagine FE (rotte `src/router.tsx:79-101`)
| Pagina | Cosa mostra | API | Link |
|---|---|---|---|
| `OggettiPage` `/guida/oggetti` | 7 schede (equipaggiamento, consumabili, chiave e materiali, fabbricazione, personalizzazione, abiti, scambi) | `GET /api/compendio/oggetti-guida` (295), `GET /api/compendio/oggetti` (205) | `CollegamentoMappa` articolo/negozio dal crosswalk (75-76, 98-99), `/guida/negozi` (223), `/guida/richieste?foglio=jose` (268) |
| `NegoziPage` `/guida/negozi` | negozi e ricerca degli articoli con filtri nell'URL | `getNegozi`, `ricercaArticoli` (43-59) | `/guida/negozi/:k` (124), `/guida/rimossi` (96) |
| `NegozioPage` `/guida/negozi/:k` | programma punti (85), `ArticoliTabella` (109), Correggi (95-96), Rimossi (111), `DoveSiTrova` (102) | `getNegozio` (42), `PUT /partite/:id/acquisti` | Confidente (72) |
| `ArticoliTabella` | nome (`nomeIt ?? nome`), categoria, per, statistiche, prezzo, disponibilità, spunta di acquisto | `impostaAcquisto` | `/guida/mondo/articolo/<k>` (46) |
| `LibriPage` `/guida/libri` | negozi con prezzo (131), «Apre» quartiere (138), `DoveSiTrova` (186-187), avanzamento | `getLibri` | — |
| `FilmPage`, `VideogiochiPage` | prezzo o costo, posizioni, «In vendita da» (videogiochi 97) | `getFilm`, `getVideogiochi` | — |
| `ConfidenteDettaglioPage` | regali con spunta, effetto, dove, costo (181-198) | `PUT /partite/:id/confidenti/:k/regali` (98-103) | nessun link agli articoli |
| `RichiestePage` | ricompense in testo (129); foglio Jose (249-276) | `GET /api/compendio/richieste` | — |
| Visore, popup del pin | `MerceNelPopup` (`VisoreMappa.tsx:994-1025`), `SchedaSpillo` (1106-1185), acquisto | `mappeService.negozioDettaglio` (223-237) | «scheda del negozio» (894, 1158) |
| `CovoPage` | premi in Medaglie P (51, 92) | `GET /api/compendio/completamento` | — |
| `DungeonDettaglioPage` › `GuidaDellArea` | contenuto del forziere da `dettagli` | `GET /compendio/dungeon/:k` | — |
| Moduli | `SceltaOggetto.tsx:37-40` (`GET /api/catalogo/oggetti`), `ModuloArticolo.tsx:38-43` | `/api/catalogo/:tipo` | — |

Percorsi dell'utente di oggi:
- cercare un oggetto per nome si può solo in Negozi › ricerca articoli (sulla copia del nome) o dentro una scheda di OggettiPage;
- da un regalo del Confidente non si arriva a dove comprarlo;
- da un forziere non si arriva all'oggetto;
- dal popup del pin si compra e si apre la scheda del negozio.

## 2. Back-end
**Rotte**
- `/api/catalogo` (`catalogo.ts`):
  - GET `/` 31, `/oggetti-di/:categoria` 40, `/oggetti` 48;
  - GET/POST `/:tipo` 53/57;
  - GET/PUT `/:tipo/:k` 61/64, PUT `/:tipo/:k/nascosta` 68, DELETE `/:tipo/:k` 72.
  - `TIPI_CATALOGO` sta in `types.ts:2445`.
- `/api/compendio` (`compendio.ts`): `/oggetti` 84, `/oggetti-guida` 92-108, `/completamento` 119, `/percorso-elenchi` 129, `/negozi` 152,
  `/negozi/:k` 155, `/articoli` 158, `/attivita` 181, `/libri` 184, `/film` 187, `/videogiochi` 190, `/richieste` 196, `/confidenti/:k` 306.
- `/api/partite` (`partite.ts`): `/:id/confidenti/:k/regali` 106, `/:id/acquisti` 136, `/:id/letture` 145.
- `/api/condizioni`: `/elenchi` 51, `/partite/:p/progressi` 112 (`progressi()` 83-110), `/partite/:p/punti-negozio/:k` 141.

**Servizi**
- `catalogoService.ts`: `CAMPI` 32-41, `PROFILO` 62-81, crea 240, aggiorna 282, nascondi 297, elimina 321-351, `staccaDalleMappe` 308-315.
- `negoziService.ts`: `articoloDto` 74-83, `acquistiPartita` 86, `dettaglioNegozio` 109, `ricercaArticoli` 136, `impostaAcquisto` 156-171.
- Spesa del grado cliente: `disponibilitaService.ts:145, 225-231` (`SUM(a.prezzo)`) e `RANGHI_CLIENTE` (`condizioniSpillo.ts:47`).
- `oggettiSelezionabili.ts`: `daEquipaggiamento` 85, `daGuida` 101, `daLibri` 125, `daFilm` 140, `daVideogiochi` 153, `tutti…` 165,
  `risolviOggettoCollegato` 174-186.
- `attivitaService.ts`: `articoliCollegati` 58 (solo libri e videogiochi), `libroDto` 103, `filmDto` 120, `videogiocoDto` 147,
  `impostaLettura` 318, `applicaEffettiLettura` 276.
- `compendioService.ts`: `elencaOggetti` 337-350, regali in `dettaglioConfidente` 377-394.
- Effetti: `shared/effettiOggetto.ts` (100-119, 207), `shared/effettiCatalogo.ts` (16, 46, 52).

**Schemi**
- `schemas/catalogo.ts`: `datiArticolo` 76-108 (`oggetto_fonte` 98), `datiLibro` 111-134, `SCHEMI_CATALOGO` 255.
- `schemas/comuni.ts:47` (`categoriaArticolo`).
- `schemas/partite.ts`: `bodyAcquisto` 189, `bodyLettura` 192, `bodyRegalo` 204 (testo fino a 120 caratteri).

## 3. Schema e stato di partita
- **Gioco**:
  - `oggetto` (001:93-99);
  - `articolo` (017:26-42, poi 035, 036, 058:51-57, 059:39, 070, 073:39-75);
  - `libro` (015:57-72, 051, 052, 061, 074) e `libro_posizione` (047:25-32);
  - `film` (015:73-86, 048, 056, 074) e `film_posizione` (048:52-60);
  - `attivita` videogioco (015:39-56, 049, 072, 075, 105);
  - `confidente_regalo` (010:30-39);
  - `dati_guida` (014:32-35) con `oggetti-guida`, `oggetti-crosswalk`, `jose`, `completamento`.
- **Partite** (`schemaUtente.ts`, senza FK verso il gioco):

  | Tabella | Riga | Collegamento |
  |---|---|---|
  | `acquisto_partita` | 25 | chiave dell'articolo |
  | `regalo_partita` | 61 | **nome** |
  | `lettura_partita` | 43 | — |
  | `progresso_libro_partita` | 57 | — |
  | `progresso_film_partita` | 56 | — |
  | `progresso_videogioco_partita` | 58 | `attivita.chiave` |
  | `effetto_lettura_partita` | 35 | — |
  | `punti_negozio_partita` | 59 | — |
  | `evento_partita` (acquisto) | — | titolo col nome, `dati_json.articolo` con la chiave |

## 4. DTO
- `shared/types.ts`:
  - `OggettoDto` 164;
  - `RegaloConfidenteDto` 224, `ConfidenteDettaglioDto.regali` 237-238, `ConfidentePartitaDto.regaliFatti` 591;
  - `OggettiGuidaDto` 922-929, `CompletamentoDto.covo.premi` 1029, `SuggerimentiOggiDto.articoli` 1085;
  - `NegozioRiassuntoDto` 1290, `ArticoloDto` 1321-1347, `NegozioDettaglioDto` 1349, `RicercaArticoliDto` 1358;
  - `AttivitaDto` 1478, `LibroDto` 1518, `FilmDto` 1568, `VideogiocoDto` 1612;
  - `RichiestaDto.ricompense` 1712, `JoseDto` 1725-1731, `PuntoInteresseDto` 1762 (`dettagli` 1768);
  - `ElenchiRegoleDto` 2454, `ProgressiPartitaDto` 2491;
  - `TIPI_CATALOGO` 2445, `OggettoSelezionabileDto` 2515, `ElementoCatalogoDto` 2532.
- `shared/articoli.ts:10-13` (19 categorie).

## 5. Test coinvolti
**Server**
- `catalogo.test.ts` 23-134;
- `negozi.test.ts` 29-159 (Untouchable 218 articoli);
- `negozio-del-pin.test.ts` 35-48;
- `libri.test.ts` 19-164, `film.test.ts` 20-106, `videogiochi.test.ts` 25-45;
- `oggetti-guida.test.ts` 19-43 (247/108/10/8/55/5), `oggetti-selezionabili.test.ts` 33-105;
- `effetti-letture.test.ts` 41-98;
- `confidentiDettaglio.test.ts:59` (regali), `conservazione.test.ts` 25-49, `condizioni.test.ts` (59, 172-178: grado cliente);
- migrazioni 051, 070, 073, 074, 076;
- `pacchettoGiocoService.test.ts`, `disponibilitaService.test.ts` (84, 194).

**FE**
- `OggettiPage.test.tsx` 87-158;
- `LibriPage.test.tsx` 33-101, `FilmPage.test.tsx` 34-81, `VideogiochiPage.test.tsx` 35-100;
- `NegozioPage.test.tsx` 44-174, `NegoziPage.test.tsx` 45-125;
- `ConfidenteDettaglioPage.test.tsx:40`, `RichiestePage.test.tsx:29`, `CovoPage.test.tsx` 51-79, `RimossiPage.test.tsx:15`;
- `ModuloCatalogo.test.tsx` 47-91, `EditorEffetti.test.tsx`, `moduli/definizioni.test.ts`, `ProgressiPartita.test.tsx`.

## 6. Schermate «prima»
Cartella `lotti/L7/schermate-prima/`: 55 PNG (11 viste a 1280x800, 768x1024, 375x812, 1366x657 e 1280x689), partita 1 al 06-01.
Le viste sono:
- `01-oggetti`, `02-libri`, `03-film`, `04-videogiochi`;
- `05-negozio-untouchable`, `06-negozi`;
- `07-confidente-kawakami` (regali);
- `08-richieste` (ricompense e Jose), `09-covo-premi`;
- `10-palazzo-madarame-voci` (contenuto dei forzieri);
- `11-pin-big-bang-listino`.

## 7. Cosa cambierà per l'utente
1. Ogni oggetto avrà la sua pagina (`/guida/oggetto/<k>`): effetto, dove si compra e a che prezzo, a chi piace, dove si trova (forzieri,
   ricompense, scambi). Oggi le stesse informazioni sono sparse su sei archivi e nessuna pagina le riunisce.
2. Nomi e prezzi saranno uguali ovunque, quindi spariranno le differenze di oggi fra regali e articoli e fra consumabili e articoli.
3. Regali, forzieri, ricompense e scambi saranno link all'oggetto. Le pagine Oggetti, Libri, Film e Videogiochi resteranno come filtri
   del catalogo unico.
4. Eliminare un oggetto passerà dal cestino.
5. Restano invariati gli acquisti, le letture, le visioni e il testo delle voci dei forzieri.

## 8. Segnalazioni per Stesura modifiche (sono fatti, non proposte di progetto)
- **A.** Gli abbinamenti esistenti, per chiave, sono solo 48 (libri e videogiochi). Gli altri passano dal nome: crosswalk (121) o slug.
  Il grosso del lotto è quindi l'elenco degli abbinamenti dubbi da far approvare (R7-02, R7-03).
- **B.** Il regalo segnato in partita (`regalo_partita.regalo`) è un nome libero: la migrazione deve portarlo a chiave senza perdere
  segni (R7-19). Oggi non ci sono regali segnati nella partita reale (ricognizione su `data/partite.db`).
- **C.** Il contenuto dei forzieri (174 voci) è testo con note fra parentesi: va abbinato all'oggetto lasciando il testo della voce
  invariato (R7-21).
- **D.** Jose ha due fonti (`jose` e `oggetti-guida.scambi`) e lo stesso vale per gli scambi. Da L8/Memento: `RichiestePage` usa `jose`.
- **E.** Il nome dell'oggetto copiato sull'articolo alimenta la ricerca, lo storico e le condizioni: passare a «nome dall'oggetto»
  cambia i titoli degli eventi già scritti nello storico (che restano testo).

## 9. Rilettura contro il codice attuale (2026-10-20 ~08:05, pensive `newreview`: commit fino ad ad585387 più la cartella di lavoro; dati dall'anteprima 3302, b83c30ac/71378325 sulla base p5s-0533Z)
La prima stesura (~02:19) era sul codice delle ~02:20 (ultimo commit bd20ed72) e su `data/` di sviluppo.

**Invariati**: tutti i file propri del lotto. Cioè le pagine `OggettiPage`, `NegoziPage`, `NegozioPage`, `ArticoliTabella`,
`LibriPage`, `FilmPage`, `VideogiochiPage`, `ConfidenteDettaglioPage` e `RichiestePage`; i servizi `catalogoService`, `negoziService`,
`oggettiSelezionabili`, `attivitaService`, `compendioService`, `suggerimentiService` e `partiteService`; `schemaUtente`, gli schemi
`catalogo`/`comuni`/`partite`, i file condivisi `effetti*`, `articoli` e `condizioniSpillo`, e `nomiCondizioni`. I fatti del §0 e le loro righe restano validi.

**Cambiati da L2-L4**, per le sole parti citate qui:

| Riferimento sopra | Ora | Cambio di sostanza per L7 |
|---|---|---|
| rotte `src/router.tsx:79-101` | `:82-105` (richieste 82, libri/film/videogiochi 93-95, oggetti 101, negozi 104-105) | nessuno (5 rotte nuove di L2/L3) |
| `VisoreMappa`: `MerceNelPopup` 994-1025, `SchedaSpillo` 1106-1185, «scheda del negozio» 894/1158 | `MerceNelPopup` 1084, `SchedaSpillo` 1193, link 1247, «articoli non ancora in vendita» 1111 | nessuno |
| `mappeService.negozioDettaglio` 223-237 | `:272` (usato a 247, 251) | nessuno |
| `CovoPage` 51, 92 | premi descritti a `:6-14, 42-43` (righe spostate di +9) | nessuno |
| `DungeonDettaglioPage › GuidaDellArea`: contenuto del forziere da `dettagli` | `GuidaDellArea.tsx:282` (`DettagliPunto`); modificabile con `EditorDettagli` (`:324`) | il contenuto ora **si modifica** dalla voce: lo stesso testo che R7-21 vuole abbinare all'oggetto lasciandolo invariato |
| `routes/compendio.ts`: `/negozi` 152, `/negozi/:k` 155, `/articoli` 158, `/attivita` 181, `/libri` 184, `/film` 187, `/videogiochi` 190, `/richieste` 196, `/confidenti/:k` 306 | 168, 171, 174, 198, 201, 204, 207, 213, 344 (`/oggetti` 84, `/oggetti-guida` 92, `/completamento` 119 e `/percorso-elenchi` 129 invariati) | nessuno |
| `routes/partite.ts`: regali 106, acquisti 136, letture 145 | 107, 137, 146 | nessuno |
| `disponibilitaService`: spesa 145, articolo 193-196, grado cliente 225-231 | 147, `case 'articolo'` 198, 231-233 | nessuno |
| `pacchettoGiocoService` `RIFERIMENTI_PARTITE` 61-88 | `:62` (tabelle di L4 a 87-88) | nessuno per gli oggetti: `acquisto_partita`, `lettura_partita`, `regalo_partita` come prima |
| DTO in `shared/types.ts`: `OggettoDto` 164, `RegaloConfidenteDto` 224, `regali` 237, `regaliFatti` 591, `OggettiGuidaDto` 922, `covo.premi` 1029, `SuggerimentiOggiDto.articoli` 1085, `RiferimentoAzioneDto` 1068, `NegozioRiassuntoDto` 1290, `ArticoloDto` 1321, `NegozioDettaglioDto` 1349, `RicercaArticoliDto` 1358, `AttivitaDto` 1478, `LibroDto` 1518, `FilmDto` 1568, `VideogiocoDto` 1612, `JoseDto` 1725, `PuntoInteresseDto` 1762, `TIPI_CATALOGO` 2445, `ElenchiRegoleDto` 2454, `ProgressiPartitaDto` 2491, `OggettoSelezionabileDto` 2515, `ElementoCatalogoDto` 2532 | 166, 226, 239, 593, 924, 1031, 1088, 1069, 1316, 1347, 1375, 1384, 1587, 1627, 1677, 1721, 1834, 1871, 2706, 2715, 2752, 2776, 2793 | `RiferimentoAzioneDto` ancora senza tipo `articolo`; `PuntoInteresseDto` ha in più `carattere` (L4) |
| Percorso del file | `ArticoliTabella` sta in `src/components/guida/` | — |

**Cifre ricontrollate sulla base nuova** (anteprima, solo GET):
- **Contenuto dei forzieri (§0.4, §8.C):** dalle API dei dungeon risultano **172** voci con `dettagli.contenuto`, non 174. Per tipo: forziere 79,
  forziere-chiuso 16, oggetto 24, puzzle 18, miniboss 14, **boss 11 (erano 13)**, volontà 7, altro 2, ombra-sciagura 1. I 2 boss di
  scarto non si vedono dalle API dei Palazzi: vanno ricontati sul database, forse sono voci dei Memento lette da un'altra strada.
  Per carattere (L4): 145 permanenti, 25 rigenerabili, 2 descrittive. R7-21 deve sapere che anche le voci rigenerabili hanno un contenuto.
- **Non ricontati:** i regali segnati nella partita reale (§8.B, «nessuno») e le 64 voci d'acquisto del diario senza riferimento (§0.4).
  La base p5s ha 255 voci del diario validate; servirebbero i file del database, che io non apro (le istanze sono del Collaudo).

**Nuovo da L4 che tocca L7:**
- `PuntoInteresseDto.carattere` (permanente, rigenerabile, descrittiva) e il conteggio degli «oggetti permanenti» del Palazzo (§8.10 di L4).
  Se L7 lega il contenuto di un forziere a un oggetto del catalogo, il conteggio del completamento resta per voce: va detto che L7 non lo cambia.
