# L9 «Confidenti, attività, calendario» — analisi dell'app attuale

Autore: sessione «Analisi app attuale» (2026-10-20).

Fonti e modalità:
- codice letto in sola lettura nella cartella di sviluppo `C:\Repository\project-p5r\.claude\worktrees\pensive-burnell-b50941`
  (branch `newreview`);
- `data/gioco.db` aperto in sola lettura (user_version 108);
- FE e BE interrogati solo con GET; nessuna scrittura.

Criteri di riferimento: `requisiti.md` (R9-…). Incrociato con `dati.md` di L9 a stesura finita: le 7 attività, il meteo (diverso per
formato in 287 giorni, `giorno_percorso` solo in 12), i 173 eventi, le 31 domande degli esami. Dove le cifre differiscono vale `dati.md`.

## 0. Fatti che contano per il progetto
1. **La data di sblocco di un Confidente ha sette copie, e nessuna si modifica.**

   | Copia | Chi la legge |
   |---|---|
   | Requisito `data` di rango 1 in `confidente_requisito` | semafori e blocco del rango (`semaforiService.ts:160-164`, `partiteService.ts:342-371`) |
   | Prosa `confidente_disponibilita.sblocco_data` | scheda del Confidente (`ConfidenteDettaglioPage.tsx:127`) |
   | Eventi `sblocco` del calendario | `calendarioService.ts:42-47` |
   | Voci del diario con `rango_atteso=1` | diario |
   | `giorno_percorso.azioni_json` | nessuno (copia storica) |
   | Prosa `luogo.sblocco` | scheda del luogo |
   | Prosa `negozio.sblocco` | scheda del negozio |

   Divergenze sul rango 1 (requisito / voce del diario / calendario / scheda):

   | Confidente | Requisito | Voce del diario | Calendario | Scheda |
   |---|---|---|---|---|
   | Takemi | 04-15 | 04-18 | 04-18 | «18 aprile» |
   | Gemelle | 05-18 | 05-19 | 05-19 | — |
   | Kawakami | 06-04 | 06-08 | 06-06 | «3-4 giugno» |
   | Ohya | 06-18 | 07-05 | 07-05 | — |
   | Shinya | 09-05 | 09-19 | 11-10 | — |
   | Hifumi | 06-28 | 07-02 | 07-02 | — |

   Altre divergenze: per Futaba il calendario dice 11-17 contro 08-31; per Yusuke 06-17 contro 06-18. Makoto, Sojiro, Chihaya, Iwai e
   Yoshida non hanno un requisito di data di rango 1. Ho abbinato gli eventi del calendario per nome nel titolo, quindi questo abbinamento
   è approssimativo.
2. **Giorni, fasce e luogo di un Confidente non sono strutturati.**
   - `confidente_disponibilita.giorni_json`, `fasce_json` e `luogo` sono prosa (date, nomi di giorni, frasi) e nessuno li valuta
     (`compendioService.ts:385-390`).
   - Il legame con i luoghi passa da `luogo.confidenti_json` (34 luoghi, non modificabile) e da `negozio.confidente_chiave`
     (untouchable/iwai, clinica-takemi/takemi, leblanc/sojiro).
   - **Il diario non segnala le voci fuori giorno o fuori fascia**: `voceDto` (`giornataService.ts:91-102`) calcola solo il semaforo di rango,
     il quiz e la mappa.
3. **Anagrafica, punti per rango, abilità, dialoghi (223 righe, 812 scelte), regali e luoghi dei Confidenti non si modificano.** Dalla
   scheda del Confidente si possono cambiare solo:
   - la Dote per incontro (`DotiIncontro.tsx:31-46` → `PUT /compendio/confidenti/:k/doti-incontro`);
   - il requisito «richiesta» (`CorreggiRequisito`);
   - la conferma di un requisito e il regalo consegnato, che sono dati della partita;
   - l'immagine.
4. **Il meteo ha sette fonti.**
   - `giorno_calendario.meteo`: 288 giorni su 346.
   - `giorno_percorso.meteo`: 12 giorni, **tutti e 12 diversi** dal calendario.
   - `meteo_partita`, per partita.
   - `allerta_meteo`: 74 righe.
   - `dati_guida.completamento.meteo`, in prosa.
   - Eventi del calendario di tipo `meteo`: 4.
   - `PartitaDto.meteoOra`, calcolato.

   Il server prende `COALESCE(calendario, percorso)` (`meteoService.ts:87-91`). Le viste invece no:
   - il Calendario mostra il meteo della guida (`CalendarioPage.tsx:40, 110`);
   - la giornata della guida mostra `giorno_percorso.meteo` grezzo (`GiornoGuida.tsx:289`);
   - Oggi mostra il meteo della partita (`OggiGuida.tsx:57-60`, `MeteoGiornata.tsx`).
5. **Il giorno della settimana esiste in cinque formati.**
   - «Lunedi» senza accento in `giorno_calendario`, che `calendarioService.ts:14, 19` trasforma in «Lunedì»;
   - «lun» in `giorno_percorso`;
   - chiavi `lunedi` in `GIORNI_SETTIMANA` (`condizioniSpillo.ts:33-34`);
   - «lunedì» minuscolo in `descriviGiorni`;
   - prosa in `confidente_disponibilita`.

   Nessuno lo calcola dalla data.
6. **Gli esami sono doppi.** La migrazione 078 (`078_domanda_tipo_tv.ts:36-56`) copia in `domanda.risposte_json` i 31 quesiti di
   `esame.domande_json` (4 esami, 12 righe esame-medio/finale). La data di una domanda o di un esame ha sei copie: `domanda.data`,
   `esame.date_json`, `esame.domande_json[].data`, la copia della 078, gli 8 eventi `esame` del calendario e le voci del diario non
   collegate (≈50 «domanda in classe», ≈30 «cruciverba»). Gli esami non si modificano.
7. **Attività.**
   - Le **7 attività che non registrano nulla** (allineate a `dati.md` §2) non hanno né Doti né effetti: sfida-pesca-guardiano-ichigaya,
     jazz-club-kichijoji, allenamento-camera-leblanc, allenamento-palestra-protein-lovers, lettura-metropolitana, curry-leblanc,
     tempio-vecchio-kichijoji.
   - Altre **9** hanno la Dote solo in prosa (`doti_json`) con `effetti_json='[]'`, quindi la spunta non le applica: biliardo,
     pesca-ichigaya, bagno-pubblico-yongen-jaya, centro-battute-yongen-jaya, sala-giochi-gun-about-akihabara, studio-biblioteca-scuola,
     caffe-leblanc, sfida-big-bang-burger, esperimenti-clinici-takemi (biliardo e gun-about: «incremento casuale», senza Dote fissa).
   - La Dote ha sette copie: `doti_json`, `effetti_json`, `dettagli`, `altri_effetti`/`regole`/`premi`, `voce_giornata.produce_json`,
     gli esiti del quiz e `azioni_json`.
   - La paga ha cinque copie (`paga`, `paga_yen`, `paga_massima`, `dettagli`, esiti del quiz) e **non arriva mai agli yen**
     (`registraTurno` `attivitaService.ts:450-474`).
   - I giorni del quiz ci sono solo per il Triple Seven (`quiz_json`, migrazione 105:28).
   - Le attività non hanno una pagina singola: `AttivitaPage` è un elenco con schede Attività e Lavori.
8. **Il calendario dipende da 173 eventi non modificabili.** `evento_calendario` contiene 173 righe: storia 61, sblocco 46, festa 24,
   scadenza 18, vacanza 11, esame 8, meteo 4, consiglio 1. Lo affiancano due tabelle da 346 giorni (`giorno_calendario` e
   `giorno_percorso`). Le voci del diario (954) sono tutte di genere `azione`.
9. **Il link rotto.** `src/components/mappe/VisoreMappa.tsx:901` (`to="/confidenti"`) compare sul pin di un Confidente non collegato. La
   rotta esiste solo come `confidenti/:chiave` (`router.tsx:73`), quindi il link apre NotFound.
10. **Altri difetti trovati.**
    - In `ConfidentiPartita` il pulsante «Regalo» (`:249`) aggiunge 50 punti ma non scrive `regalo_partita`, che si scrive solo dalla scheda
      del Confidente: due pulsanti che non si parlano (questo è lavoro di L10).
    - «Annulla ultimo» (`:251`) usa uno stato locale che si perde ricaricando.
    - Il Calendario imposta la data con `PUT /partite/:id` (`CalendarioPage.tsx:90-98`) invece di `PUT /partite/:id/giorno`
      (strade del giorno: L10).
    - `CruciverbaPage.tsx:109` confronta le date `MM-GG` come stringhe, quindi gennaio-marzo vengono prima di aprile, mentre il server usa
      `indiceGiornoScolastico`.

## 1. Pagine FE e percorsi dell'utente di oggi
| Pagina (rotta) | Cosa mostra | Cosa si modifica | Schermata «prima» |
|---|---|---|---|
| `ConfidenteDettaglioPage` (`/confidenti/:chiave`, `router.tsx:73`) | Dove/Quando/Sblocco in prosa (125-128), prossimo passo con semafori e dialoghi (134-146), requisiti (148-153), abilità (154-166), Dote per incontro (168), dialoghi (170-178), regali con spunta (180-199), fonti | conferma requisito (84-95), regalo consegnato (98-107), requisito «richiesta» (212), Dote per incontro, immagine | `01-confidente-takemi`, `02-confidente-kawakami` |
| `PersonaggiPage` (`/guida/personaggi`) | 27 personaggi da `dati_guida.personaggi`, «Scheda Confidente» (58) | immagine | `03-personaggi` |
| `ConfidentiPartita` (`/partita?scheda=confidenti`) | rango ±, «Segna comunque», note 1-3 con anteprima (`utils/punti.ts:18`, copia della formula del server), Regalo, Uscita, Annulla ultimo, Sblocco, note | stato della partita | `08-partita` |
| `AttivitaPage` (`/guida/attivita`) | schede Attività e Lavori, effetti, sede, costo, paga, quiz, dettagli | correzione e aggiunta al catalogo (103, 144) | `04-attivita` |
| `CalendarioPage` (`/guida/calendario`) | giorno, meteo della guida, allerte, eventi, «Oggi» con settimana e scadenze | «Imposta come data di gioco» | `05-calendario` |
| `DomandePage` (`/guida/domande`) | domande, esami e premi, spunta | catalogo per le domande; esami no | `06-domande` |
| `CruciverbaPage` (`/guida/cruciverba`) | cruciverba e spunta | catalogo | `07-cruciverba` |
| `ProgressiPartita` | squadra, grado cliente, contatori, eventi di storia da segnare, attività svolte ±, punti negozio | stato della partita | `08-partita` |
| Guida giorno per giorno (`/guida/percorso/04-18`) | voci dei Confidenti con semafori di rango, meteo del percorso | spunta (L10) | `09-percorso-0418` |
| `/confidenti` | NotFound | — | `10-confidenti-rotto` |

Le schermate stanno in `lotti/L9/schermate-prima/`: 50 PNG (10 viste × 5 misure), partita 1 al 06-01, in sola lettura.

## 2. Back-end
**Rotte**

| Metodo e percorso | File:riga | Servizio |
|---|---|---|
| `GET /api/compendio/confidenti` | `routes/compendio.ts:89` | — |
| `GET /api/compendio/confidenti/:k` | `:306` | `dettaglioConfidente`, `compendioService.ts:378-393` |
| `PUT /api/compendio/confidenti/:k/doti-incontro` | `:323` | — |
| `PUT`/`DELETE /api/compendio/confidenti/:k/requisiti/:rango/:indice` | `:311`, `:317` | solo `richiesta` |
| `GET /api/compendio/personaggi` | `:109` | — |
| `GET /api/compendio/attivita` | `:181` | — |
| `GET /api/compendio/calendario` | `:299` | — |
| `GET /api/compendio/domande` | `:303` | — |
| `GET /api/compendio/cruciverba` | `:166` | — |
| `GET /api/compendio/percorso` | `:122`, `:125` | — |
| voci della giornata | `:134-151` | — |
| `GET`/`PUT /api/partite/:id/confidenti(/:k)` | `routes/partite.ts:92`, `:96` | `incontriService.ts:136-162` → `partiteService.ts:355-390` |
| `PUT /api/partite/:id/confidenti/:k/requisiti` | `:101` | — |
| `PUT /api/partite/:id/confidenti/:k/regali` | `:106` | — |
| `GET`/`PUT /api/partite/:id/meteo/:data` | `:127`, `:132` | — |
| `PUT /api/partite/:id/cruciverba` | `:141` | — |
| `PUT /api/partite/:id/domande/:id` | `:163` | — |
| `PUT /api/partite/:id/percorso` | `:115-121` | — |
| `PUT /api/partite/:id/giorno` | `:122` | — |
| `GET /api/condizioni/partite/:p/progressi` | `routes/condizioni.ts:112` | — |
| `PUT /api/condizioni/partite/:p/eventi/:k` | `:117` | — |
| `PUT /api/condizioni/partite/:p/attivita/:k` | `:133` | — |
| `POST`/`PUT`/`DELETE /api/catalogo/:tipo/:k` | `routes/catalogo.ts:92-108` | attività `schemas/catalogo.ts:179-211`, quiz `:170-176`, luogo `:214-225`, domanda `:233-243`, cruciverba `:246-252` |

**Servizi**
- `compendioService`: 354-393.
- `partiteService`: 246-398 (formula dei punti 246-250, blocco 342-371).
- `incontriService`: 74-127.
- `semaforiService`: 64-240.
- `attivitaService`: 42-79, 229-271, 419-517.
- `calendarioService`: 14-67.
- `meteoService`: 87-176.
- `domandeService`: 19-79.
- `cruciverbaService`.
- `giornataService`: 91-102, 200-252, 340-362.
- `percorsoService`: 28-90.
- `effettiAzioneService`: 51-100.

## 3. Schema
**Gioco**

| Tabella | Migrazione:righe |
|---|---|
| `confidente` | 001:150-155 |
| `confidente_rango` | 004:23-28 |
| `confidente_abilita`, `_dialogo`, `_regalo`, `_disponibilita` | 010:12-50 |
| `confidente_requisito` | 026:12-20, 090 |
| `confidente_dote_incontro` | 088:30-35, 089 |
| `attivita` | 015:39-56, poi 049, 052, 056/074, 072, 075:53-56, 105:56-58 |
| `giorno_calendario`, `evento_calendario`, `settimana_guida` | 012:11-37 |
| `giorno_percorso` | 018:13-25 |
| `voce_giornata` | 092:38-57 |
| `allerta_meteo` | 091:22-29 |
| `domanda`, `esame`, `esame_premi` | 011:12-37, 055, 078 |
| `cruciverba` | 016:8-15, 055 |

**Partite** (righe in `schemaUtente.ts`): `confidente_partita` 31, `regalo_partita` 61, `requisito_partita` 62 (utente 012),
`incontro_confidente_partita` 41 (utente 009-011), `evento_storia_partita` 40, `attivita_svolta_partita` 26, `turno_partita` 69 (utente 007),
`effetto_lettura_partita` 35, `meteo_partita` 45 (utente 013), `domanda_partita` 33, `cruciverba_partita` 32, `dote_sociale_partita` 34,
`spunta_voce_partita` 65, `partita` 49, `evento_partita` 36.

## 4. DTO
- `shared/types.ts`:
  - Confidenti: `RequisitoRango` 179-197, `ConfidenteDto` 198, `DialogoConfidenteDto` 216, `ConfidenteDettaglioDto` 232-243,
    `SemaforoRequisitoDto` 552-569, `SemaforiRangoDto` 571, `ConfidentePartitaDto` 578-600, `ModificaConfidente` 609-623;
  - partita e meteo: `FasciaGioco` 441, `MeteoFasciaDto` 464, `AllertaGiornoDto` 476, `MeteoGiornoDto` 485;
  - scuola: `DomandaDto` 870, `EsameDto` 889, `DomandeDto` 907, `CruciverbaDto` 1365;
  - personaggi: `PersonaggioDto` 934;
  - incontri ed effetti: `IncontroConfidenteDto` 1040, `EffettiAzioneDto` 1052-1065;
  - attività e calendario: `QuizVoceDto` 1152, `AttivitaDto` 1478-1520, `GiornoCalendarioDto` 1955, `CalendarioDto` 1976;
  - progressi: `ProgressiPartitaDto` 2491-2503.
- Moduli condivisi: `shared/attivita.ts`, `shared/effettiCatalogo.ts` (`VoceEffetto` 16-23), `shared/quizAttivita.ts`,
  `shared/meteoPartita.ts`, `shared/condizioniSpillo.ts` (`GIORNI_SETTIMANA` 33, `EVENTI_STORIA` 55-71), `shared/effettiAzione.ts`.

## 5. Test coinvolti
**Server**
- `confidentiDettaglio.test.ts` (19, 59);
- `incontri-confidenti.test.ts` (48-194);
- `semafori.test.ts`;
- `requisiti-eventi.test.ts` (35-77);
- `calendario.test.ts` (20-66: 346 giorni, «Sabato» il 04-09);
- `meteo-partita.test.ts` (37-122);
- `domande.test.ts`, `cruciverba.test.ts`;
- `quiz-attivita.test.ts` (30-120);
- `effetti-azioni.test.ts` (129-284);
- `personaggi.test.ts`, `condizioni.test.ts` (28, 143, 168), `giornata.test.ts`, `percorso.test.ts`;
- migrazioni 075, 080, 090, 091, 105, utente 015;
- `shared/meteoPartita.test.ts`, `shared/quizAttivita.test.ts`, `puntiDaNote.test.ts`.

**FE**
- `ConfidenteDettaglioPage.test.tsx` (40-99);
- `ConfidentiPartita.test.tsx` (49-172);
- `ProgressiPartita.test.tsx`, `SemaforiRango.test.tsx`, `CorreggiRequisito.test.tsx`;
- `AttivitaPage.test.tsx` (34-105), `CalendarioPage.test.tsx` (34, 53), `DomandePage.test.tsx`, `CruciverbaPage.test.tsx`;
- `ScuolaOggi.test.tsx`, `MeteoGiornata.test.tsx`, `MeteoAlCambioGiorno.test.tsx`, `GuidaQuiz.test.tsx`.

## 6. Cosa cambierà per l'utente
1. **Confidenti.** Ogni Confidente ha una pagina unica, guida e partita insieme, con disponibilità strutturata (giorni, fasce, luogo) e
   **una sola data di sblocco**, uguale in scheda, semafori, calendario e diario. Dalla pagina si modificano anagrafica, punti, abilità,
   dialoghi, regali e luoghi. Il diario avvisa se una voce è fuori giorno o fuori fascia.
2. **Attività.** Ogni attività ha una pagina sua (`/guida/attivita/<k>`); le 7 attività senza effetti registrano la loro Dote; la paga è
   un dato solo.
3. **Calendario.** Diventa la vista mensile del diario, con un solo giorno (meteo, settimana calcolata dalla data, trama). Gli eventi
   diventano voci del diario collegate per chiave; scadenze e sblocchi si ricavano. Gli esami stanno in una sola tabella.
4. **Link rotto.** Il link «Confidenti» del visore non porta più a NotFound.

## 7. Segnalazioni per Stesura modifiche (fatti, non progetto)
- **A.** Le date di sblocco divergono fino a mesi (Shinya: 09-05, 09-19, 11-10): la scelta della data giusta è dell'Esperto della guida.
  G-017 è già in coda.
- **B.** Il meteo di `giorno_percorso` diverge in 12 giorni su 12: va scelta una fonte, oppure va chiesto all'Esperto della guida.
- **C.** Il «Regalo» di ConfidentiPartita e la spunta dei regali nella scheda non si parlano. Lo stesso vale per «Annulla ultimo», che è
  solo locale. Entrambi sono lavoro di L10, ma toccano la pagina del Confidente di L9.
- **D.** Il Calendario cambia la data di gioco con una strada diversa da `/giorno`: è una delle strade del giorno di L10.
- **E.** `CruciverbaPage.tsx:109` ordina male le date di gennaio-marzo.
