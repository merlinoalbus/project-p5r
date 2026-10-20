# L11 «Pulizia e ricerca» — analisi dell'app attuale

Autore: sessione «Analisi app attuale», 2026-10-20.

Fonti, tutte lette senza scrivere nulla:
- il codice della cartella di sviluppo `C:\Repository\project-p5r\.claude\worktrees\pensive-burnell-b50941` (`newreview`);
- `data/gioco.db` e `data/partite.db` aperti `readonly`;
- FE e BE interrogati solo con GET;
- i criteri di `requisiti.md` di L11.

Cosa conta come «lettore»: una `FROM`/`JOIN`, oppure un campo letto e restituito, in `server/`, `shared/` o `src/`. Sono esclusi i test,
le migrazioni e `schemaUtente.ts`.

**Avvertenza.** L11 viene **dopo** L2–L10: molte strutture qui sotto le toccano quei lotti (marcatori in L4/L5, `mappa_entita` in L2/L3,
calendario doppio in L9, frasi dei negozi in L5/L6). Questo è l'elenco di **oggi**, e va rifatto a L10 consegnato.

## 0. Fatti che contano per il progetto
1. **Dati senza lettori.**
   - Tabelle:

     | Tabella | Righe | Note |
     |---|---|---|
     | `organizzazione_mappa_esito` | 0 | la scrive solo `organizzazioneMappe.ts:25, 40`, raggiunta solo dalle migrazioni 027 e 042 |

   - Colonne:

     | Colonna | Righe | Note |
     |---|---|---|
     | `luogo.attivita_json`, `luogo.negozio` | — | dichiarate morte in `cittaService.ts:5-8` |
     | `luogo.giorni` | — | sostituita da `giorni_json`; resta solo dentro `seed_json` |
     | `negozio.orari`, `negozio.sblocco`, `negozio.fonte` | — | solo nel tipo `RigaNegozio`, `negoziService.ts:23` |
     | `punto_partita.automatico` | 525 | tutte a 0, la rilegge solo la migrazione utente 017 |
     | `giorno_percorso.azioni_json` | 346 | — |
     | `pianta_area.alternative_json` | — | — |
     | `guida_mappa.metadata_json` | — | — |
     | `mappa_entita.fonte_json` | — | solo scritta |

   - Blocchi di `dati_guida`: `mappe-assenti`, che viene solo ripulito (`dungeonService.ts:564-569`). Di `finestre-dungeon` non sono letti
     `testoSblocco`, `testoScadenza` e la chiave `luoghi`; `finestre[].luogo` lo legge solo `collegaPalazziAiLuoghi`, usata solo nei test.
2. **Dati letti ma mai mostrati.**

   | Dato | Righe | Chi lo legge | Chi lo usa nel FE |
   |---|---|---|---|
   | `marcatore_mappa` | 149 | `dungeonService.ts:87-88` → `PuntoDto.marcatore` | nessuno |
   | `marcatore_luogo` | 47 | `cittaService.ts:137` → `LuogoDto.marcatore` | nessuno |
   | `pianta_area` | 84 | letta solo per ripulire `copre_aree_json`, `dungeonService.ts:550-552` | — |

   `pianta_quartiere` (22 righe) è **viva**: la usano `QuartierePage` ed `EditorMappaPage:243`.
3. **Copie doppie, entrambe lette.**
   - `mappa_entita` (134 righe) e `mappa.entita_*` (139): il legame mappa↔entità sta in due posti. Lettori in `mappeService`,
     `dungeonService`, `palazziService`, `contenutiGuidaService`, `accessoMondoService`, `organizzazioneMappe`. Lo unificano L2 e L3.
   - Calendario doppio: `giorno_calendario` e `giorno_percorso`, 346 righe ciascuna; `meteoService.ts:21-22` fa un `COALESCE` fra i due.
     Lo unifica L9.
4. **Codice senza consumatori.**
   - Rotte che il FE non chiama mai:

     | Rotta | Dove |
     |---|---|
     | `GET /api/mappe/entita/:tipo/:chiave` | `routes/mappe.ts:69` |
     | `GET /api/compendio/arcani` | `compendio.ts:50` |
     | `GET /api/catalogo/oggetti-di/:categoria` | `catalogo.ts:40` |
     | `GET /api/partite/attiva` | `partite.ts:50` |
     | `GET /api/partite/:id` | `:56` |
     | `GET /api/immagini/:ambito/:chiave` (JSON) | `immagini.ts:42` |
     | `PUT /api/mappe/pezzi/:id` | `mappe.ts:134` (il client `aggiornaPezzoMappa` c'è ma nessun componente lo usa) |

   - Funzioni esportate usate solo dai test o mai:
     - `applicaPresenzaAiLuoghi` (`presenzaEntita.ts:87`, vedi anche L5 §0.4);
     - `collegaPalazziAiLuoghi` (`sincronizzaMappe.ts:230`);
     - `sincronizzaMappe` (usata solo dalla migrazione 027) e `riconciliaAreeGuida` (solo dalla 042);
     - `importaPacchetto` (`pacchettoGiocoService.ts:317`), `ripristinaIstanza` (`impostazioniService.ts:386`);
     - `useRisolviAsset` (`src/stores/assetStore.ts:91`): **mai usata**, verificato con grep, anche se `docs/ARCHITETTURA.md` §L1 dice che
       `MappaTokyo` la usa (testo da correggere);
     - `zoneDeiPezzi` (`src/utils/pezziMappa.ts:104`), `eTipoLuogo` (`shared/tipiLuogo.ts:44`);
     - la funzione client `impostaLettura` (`src/services/api/partite.ts:96`).

   **Le migrazioni 027 e 042 importano `sincronizzaMappe` e `riconciliaAreeGuida`.** Prima di eliminare questi servizi bisogna congelarne
   una copia nelle migrazioni.
5. **Il DDL utente non è allineato.** `schemaUtente.ts:64` dichiara `spillo_partita.spillo_id`, ma il file reale ha `spillo_uid`
   (migrazione utente 002). Le tabelle storiche (`TABELLE_UTENTE_STORICHE`, `:78-89`) non esistono più nel file reale.
6. **Non esiste una ricerca globale.** Né la barra superiore né la navigazione ne hanno una.
   - Le ricerche locali sono circa 30, quasi tutte su `CampoRicerca` (`src/components/shared/CampoRicerca.tsx:15`) con
     `normalizzaTesto`/`corrispondeRicerca` (`shared/testo.ts:6, 17`). Dove sono:
     - Compendio 175, Skill 44, Glossario 57, Battaglia 91;
     - Oggetti 68/91/173/226, Sfide 117, Richieste 231;
     - Libri 176, Film 169, Videogiochi 172, Domande 175, Cruciverba 131;
     - Selettori della fusione;
     - CompendioPersonale 56, Scorta 190/350;
     - Quiz 44, Negoziazione 55, Traduzioni 61.
   - Ricerche scritte a mano: visore delle mappe (`VisoreMappa.tsx:231, 518, 552, 753`), Covo (`CovoPage.tsx:88-128`), collegamento dei
     pin (`BarraCollegamentoPin.tsx:43`), schede area e planimetria, selettori dell'editor.
   - Ricerche lato server:
     - `GET /compendio/articoli?q=` (`negoziService.ts:124-140`);
     - `?q=` su persona, skill e oggetti (`compendioService.ts:245, 304, 349`);
     - `GET /mappe/riferimenti?q=`;
     - `GET /traduzioni?q=`;
     - `/fusione/cerca-skill`.
   - Una base parziale per la ricerca globale c'è già: `GET /catalogo/oggetti` (`oggettiSelezionabili.ts`).
7. **L'indice «Mappe» non è l'albero della gerarchia.**
   - Il server (`GET /api/mappe/albero` → `elencaMappe`, `mappeService.ts:149-155`) restituisce un elenco **piatto** e toglie il
     sottoalbero dei Memento (`RADICI_MEMENTO`, `:140-146`). `alberoMappe.ts`, nonostante il nome, contiene solo funzioni di aiuto.
   - Il FE (`MappaPage.tsx`) raggruppa con `radiciRaggruppate` (`:58-70`) e mostra:
     - le carte delle radici;
     - `PannelloLuogo` (`:171-224`), con le sue griglie;
     - in coda, l'`AlberoLuoghi` completo dentro un `<details>`.
   - Le radici reali sono: le **5 mappe del Covo** (tipo `luogo`, senza genitore), **Tokyo**, **9 Palazzi** affiancati a Tokyo e non sotto
     la Città, e `dungeon-mementos`, escluso.
   - Quindi oggi Memento › Dedalo › Area non compare, e Città › Palazzo nemmeno.
8. **«Modifica» con «Ripristina» al valore della guida esiste solo** per le 8 famiglie del catalogo (negozio, articolo, libro, film,
   attività o videogioco, luogo, domanda, cruciverba: `ModuloCatalogo.tsx:74-80, 115-118` → `eliminaElemento` da `seed_json`) e per le
   traduzioni (`TraduzioniEditor.tsx:43, 80`). Elenco per tipo:

   | Oggetto | «Modifica» oggi | «Ripristina» |
   |---|---|---|
   | Quartiere | solo l'ingresso (`IngressoQuartiere`) | solo «Ripristina ingresso predefinito» |
   | Area / mappa | editor (`PUT /mappe/:k`, `origine='utente'`) | no |
   | Palazzo | «Correggi la scheda» (`CorrezioneGuida`, `DungeonDettaglioPage.tsx:≈414-425`), finestra e atterraggi | no |
   | Infiltrazione | «Modifica testo» (`DungeonDettaglioPage.tsx:≈557-569`) | no |
   | Voce della guida | `GuidaDellArea.tsx:309-348` | no |
   | Area del dedalo, Persona nel dedalo | `AreeDelDedalo.tsx:203`, `ModuloPersona.tsx:48` | no |
   | Richiesta | `ModuloRichiesta` (`RichiestePage.tsx:149, 285`) | no |
   | Voce del diario | `ModuloVoceGiornata.tsx:114` | no (manca l'istantanea) |
   | Giorno, evento del calendario | **nessuna** | no |
   | Confidente | solo Dote per incontro e requisiti «richiesta» | no |
   | Persona, skill, Ombra della battaglia, personaggi, sfide, trofei | **nessuna** (solo l'immagine) | no |

   Il Cestino annulla un'eliminazione, non riporta al valore della guida.

## 1. Percorsi dell'utente di oggi
| # | Dove | Che cosa succede | Schermata «prima» |
|---|---|---|---|
| P1 | Guida › Mappe | carte delle radici: Covo (a sé), Tokyo, 9 Palazzi; pannello con griglie; albero in fondo | `01-indice-mappe` |
| P2 | Guida (indice delle sezioni) | nessuna ricerca, solo carte delle sezioni con conteggi scritti a mano (`sezioniGuida.tsx:35, 44`) | `02-guida` |
| P3 | Compendio, Skill, Glossario | ricerca locale alla pagina | `03-compendio`, `04-skill`, `05-glossario` |
| P4 | Rimossi | elementi nascosti del catalogo (diverso dal Cestino) | `06-rimossi` |
| P5 | Impostazioni › Cestino, «I miei dati» | cestino a 4 tipi; righe corrette del catalogo con «Ripristina» (`MieiDati.tsx:73`) | `07-impostazioni` |
| P6 | Personaggi, Sfide | sola consultazione, nessun «Modifica» | `08-personaggi`, `09-sfide` |

Le schermate sono in `lotti/L11/schermate-prima/`: 45 PNG (9 viste × 5 misure), partita 1 al 06-01.

## 2. Documenti con strutture che il piano elimina
- **`docs/ARCHITETTURA.md`**:
  - 199-203: calendario;
  - 205-210 e 247-257: marcatori e piante;
  - 229-240: città, giornata JSON;
  - 482-503, 543-559: `entita_*`, `sincronizzaMappe`, marcatori;
  - 630, 659, 879, 962, 994, 1082-1086, 1129-1132, 1151, 1178-1181, 1346, 1355-1358;
  - §L1 (`useRisolviAsset`).
- **`docs/ROADMAP.md`**: 67-75, 83-86, 146, 153, 383-394, 573-579, 619-620, 709, 826-827, tabella dei lotti 1287-1305 (L11 a 1305).
- **`docs/DECISIONI.md`**: 51, 90, 206-207, 278-283, 312-331, 427-430, 458, 503-506, 613-615, 647-649, 1595.
- **`docs/MAPPE.md`**: 32-34, 56-58, 105-106, 166, 258, 272, 313.
- **OpenAPI** (`server/openapi/descrizioni/*`):
  - `mappe.ts` 27-33, 57-62, 148;
  - `compendio.ts` 19-22, 201, 277, 397;
  - `catalogo.ts` 15;
  - `partite.ts` 19-22, 29;
  - `immagini.ts` 29.

  `openapi.test.ts:36` vuole che ogni rotta abbia la sua descrizione, una a una: togliere una rotta vuol dire togliere anche la sua
  descrizione.

## 3. Test che verificano strutture morte (da aggiornare o togliere insieme)
| Struttura | Test |
|---|---|
| `marcatore_luogo`, `pianta_quartiere` | `piante-citta.test.ts:27-52`, `immagine-mappa-strade.test.ts:65` |
| `marcatore_mappa` | `dungeon.test.ts:96-99`, `sposta-voce-area.test.ts:42`, migrazioni 095 e 098 |
| `pianta_area`, `mappe-assenti` | `aree-eliminabili.test.ts:87-103` |
| `GET /mappe/entita` | `mappe-editor.test.ts:130-132` |
| `/compendio/arcani`, `/partite/attiva` | `api.test.ts:26-27, 137, 163, 282` |
| `oggetti-di` | `oggetti-selezionabili.test.ts:27-99`, `verifica-api.test.ts:116` |
| `sincronizzaMappe`, `applicaPresenzaAiLuoghi`, `collegaPalazziAiLuoghi`, `riconciliaAreeGuida` | `sincronizzaMappe.test.ts:28-127`, `visibilitaCondizionale.test.ts`, `finestreDungeon.test.ts`, `avvioImmutabile.test.ts:11`, `organizzazioneMappe.test.ts:35` |
| `punto_partita.automatico` | `017_boss_non_piu_automatico.test.ts`, `cestino.test.ts:55` |
| `giorno_percorso.azioni_json` | `richieste-modificabili.test.ts:141-156`, `effetti-azioni.test.ts:61`, migrazioni 033 e 034, utente 015 |
| Tabelle storiche | `azioni-utente.test.ts:15, 166`, `effetti-azioni.test.ts:21, 244` |
| `mappa_entita` / `entita_*` | 054, 082, `accesso-mondo`, `aree-eliminabili`, `cestino`, `dungeon`, `enigmi-guida`, `guida-pin`, `nuova-area`, `planimetrie-aree-multiple`, `planimetrie-palazzo`, `organizzazioneMappe`, `Cestino.test.tsx` |
| Funzioni usate solo dai test | `pacchettoGiocoService.test.ts`, `verifica-servizi.test.ts`, `pezziMappa.test.ts`, `tipiLuogo.test.ts` |

Vanno aggiornati insieme anche:
- le etichette delle tabelle nel cestino (`cestinoService.ts:55-80`);
- `RIFERIMENTI_PARTITE` (`pacchettoGiocoService.ts:61-100`);
- le migrazioni 027, 038 e 042, che importano servizi vivi.

## 4. Cosa cambierà per l'utente
1. **Una ricerca globale**, raggiungibile da ogni pagina, su quartieri, aree, planimetrie, luoghi, negozi, Palazzi, infiltrazioni, voci,
   Persona, Ombre, oggetti, Confidenti, attività, libri, film, Richieste e giorni. Ogni risultato porta alla sua pagina. Oggi le ricerche
   sono una trentina, ognuna chiusa nella sua pagina.
2. **L'indice «Mappe» diventa l'albero della gerarchia**: Tokyo › quartieri › aree › planimetrie; Tokyo › Palazzi › aree; Memento ›
   dedali › aree. Il Covo sta sotto Yongen-Jaya (L2), i Palazzi sotto la Città.
3. **«Modifica» con «Ripristina»** su ogni oggetto che oggi non li ha (§0.8).
4. Nessun cambiamento visibile per la pulizia dei dati morti, a parte la sparizione dei conteggi scritti a mano nella Guida.

## 5. Segnalazioni per Stesura modifiche (fatti, non progetto)
- **A.** Questo inventario va **rifatto a L10 consegnato**: L2–L10 toccano gran parte delle strutture qui elencate (§0.3).
- **B.** `useRisolviAsset` è esportata ma mai usata, mentre ARCHITETTURA §L1 dice il contrario: da chiarire con L1 (FE), che è in correzione.
- **C.** Le migrazioni 027, 038 e 042 dipendono da servizi che L11 vuole eliminare (§0.4).
- **D.** Il DDL utente non è allineato al file reale (§0.5): conviene allinearlo, perché i test e `creaSchemaUtente` lo usano.
