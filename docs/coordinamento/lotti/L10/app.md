# L10 «Partita e diario» — analisi dell'app attuale

Autore: sessione «Analisi app attuale», 2026-10-20.

Come ho lavorato:
- codice letto senza modificarlo, dalla cartella di sviluppo `C:\Repository\project-p5r\.claude\worktrees\pensive-burnell-b50941`
  (branch `newreview`);
- `data/gioco.db` e `data/partite.db` aperti in sola lettura;
- FE e BE interrogati solo con GET.

**Non ho provato i gesti che scrivono** (spunta, giorno, rango, regalo, registrazione). Per farlo serve una partita di prova da eliminare
dopo, e la memoria dell'utente chiede il suo permesso per eliminarla. Le strade le ricostruisco dal codice e dai test, con file:riga; le
prove dal vivo sono dei test, sulla partita di prova.

Fonti incrociate: `requisiti.md` di L10. `dati.md` di L10 non era pronto quando ho scritto: le cifre del diario che cito vengono da L2–L9
(254 voci validate, 954 voci in tutto).

## 0. Fatti che contano per il progetto
1. **La spunta produce poco.** Una voce ha solo tre effetti strutturati, `dote | lettura | turno` (`shared/effettiAzione.ts:52-55`). In più
   può registrare l'incontro e i punti del Confidente. Il percorso è `spuntaVoce` (`giornataService.ts:340-362`) →
   `applicaEffettiAzione` (`effettiAzioneService.ts:51-93`):
   - **Dote**: non viene applicata. Si calcola soltanto un promemoria «da segnare» (`:58-61`), secondo la scelta del 30 settembre.
     **D6 non è implementata**.
   - **Lettura**: porta l'avanzamento «almeno» a N (`:62-70`).
   - **Turno**: `registraTurno` (`attivitaService.ts:450-474`), contatore e registro. La paga non viene mai versata.
   - **Incontro del Confidente**: solo con `tipo='confidente'` (`:78-80`, `incontriService.registraIncontro` `:74-104`). Con
     `rango_atteso` registra un passaggio, ma **non cambia il rango**.
   - **Punti del Confidente**: solo se il client manda `noteRisposta` (`:82-90`).
   - Tipi che restano etichette e collegamenti, senza effetto: acquisto, richiesta, esame, trama, velluto, palazzo
     (`effettiAzione.ts:28-34`, `utils/percorso.ts:30-42`). La spunta non tocca eventi di storia, attività svolte non lavorative,
     acquisti, richieste, domande, cruciverba, voci del Palazzo né yen.
2. **Togliere la spunta annulla poco.** `annullaEffettiAzione` (`effettiAzioneService.ts:96-100`) toglie punti, turno e incontro, ma
   **la lettura resta** (commento a `giornataService.ts:334-338`, testo in `PartiAzione.tsx:66`). Lo storico non toglie mai nulla.
   Il commento del DTO `AzionePercorsoDto.effetti` (`types.ts:1134`), che dice «le Doti si annullano», è inesatto.
3. **Il giorno cambia per 6 strade, con controlli diversi.**

   | # | Strada | API | Controlli |
   |---|---|---|---|
   | 1 | «Segna come giorno corrente» in Oggi (`OggiGuida.tsx:34` → `useOggi.ts:101-118`) | `PUT /partite/:id/giorno` (`partite.ts:122`) → `impostaGiornoCorrente` (`percorsoService.ts:84-90`) | giorno esistente, fascia a «giorno», suggerimenti invalidati; **niente storico** |
   | 2 | La stessa, da `PercorsoPage.tsx:52-64, 78` | come la 1 | come la 1 |
   | 3 | Avanzamento automatico all'ultima spunta (`GiornoGuida.tsx:87`, `utils/giornoAvanzato.ts:16-21`) | `percorsoService.avanzaSeGiornoCompleto` (`:66-81`) | scrive nello storico; togliendo la spunta non torna indietro |
   | 4 | Calendario, «Imposta come data di gioco» (`CalendarioPage.tsx:90-98`) | `PUT /partite/:id` `{dataGioco}` (`partite.ts:59`) → `aggiornaPartita` (`partiteService.ts:115-135`) | **nessuno**: solo la regex MM-GG (`comuni.ts:30`); il giorno non viene verificato, la fascia non torna a «giorno», niente storico né suggerimenti |
   | 5 | Riepilogo della partita, campo «MM-GG», anche vuoto (`RiepilogoPartita.tsx:42-53, 76-78`) | come la 4 | **nessuno** |
   | 6 | Creazione della partita | `POST /partite` → `creaPartita` (`partiteService.ts:77-79, 95`) | la regex |

   Anche la fascia passa da `PUT /partite/:id` (`useOggi.ts:120-135`).
4. **Il rango del Confidente si cambia solo dalla pagina** (`ConfidentiPartita.tsx:194-203` → `PUT /partite/:id/confidenti/:k` →
   `incontriService.aggiornaConfidenteDallaPagina` `:136-162` → `partiteService.aggiornaConfidente` `:355-390`):
   - c'è un blocco 409 dai semafori, che si supera con «Segna comunque»;
   - al cambio di rango i punti si azzerano.

   La spunta del passaggio registra l'incontro, non il rango.
5. **Il regalo ha due pulsanti che non si parlano:**
   - «Regalo» in Partita (`ConfidentiPartita.tsx:249`) dà +50 punti ma non dice quale regalo;
   - «Regalo consegnato» nella scheda del Confidente (`ConfidenteDettaglioPage.tsx:98-107` → `impostaRegaloFatto`,
     `partiteService.ts:326-338`) scrive il regalo per nome, senza punti, storico né acquisto.

   **«Annulla ultimo»** (`ConfidentiPartita.tsx:68, 85-90, 251`) è uno stato locale: si perde ricaricando la pagina.
6. **Registrare una Persona ha 4 strade:** aggiunta alla scorta, «Registra», spunta nel compendio o cattura nei Memento, fusione.
   - La spunta e la cattura riscrivono `livello_registrato` a NULL su una Persona già registrata (`partiteService.ts:504`) e lasciano
     l'istantanea vecchia.
   - Togliere la spunta cancella tutta l'istantanea.
   - Gli ingredienti della fusione e il sacrificio della Forca vengono cancellati senza evento (`operazioniVellutoService.ts:146, 209`).
   - La tabella completa è in L8 `app.md` §0.5.
7. **Letture e turni hanno due contatori ciascuno.**
   - Letture: `lettura_partita` (completati) e `progresso_*_partita` (avanzamento). Lo scrittore è uno solo (`impostaLettura`,
     `attivitaService.ts:318-388`), ma i lettori divergono:
     - `haAnimaDaCineasta` (`:256-258`) e la condizione `lettura` (`disponibilitaService.ts:140`) leggono `lettura_partita`;
     - i contatori `libri-letti` e `film-completati` (`:133-135`) leggono `progresso_*`.
   - Turni: `attivita_svolta_partita.volte` e `turno_partita`. `volte` può superare le righe di `turno_partita`
     (`attivitaService.ts:455-457`).
   - La correzione manuale passa da `PUT /api/condizioni/partite/:p/attivita/:k` (`routes/condizioni.ts:133-139`).
8. **Gli yen non si muovono da soli.** `partita.yen` si scrive solo da `impostaYen` (`squadraService.ts:60-73`, Squadra:
   Incassa/Spendi/Imposta). Gli acquisti (`negoziService.impostaAcquisto` `:156-171`) e i turni non toccano gli yen. `PartitaDto` non ha
   `yen`, che sta in `SquadraPartitaDto`.
9. **Lo storico non segue gli annullamenti.** Nessun annullamento toglie un evento:
   - spunta tolta: `giornataService.ts:355-358`;
   - acquisto tolto: `negoziService.ts:166`;
   - lettura: l'evento nasce solo alla prima registrazione, `attivitaService.ts:360`.

   Le sole cancellazioni sono quelle manuali (`storicoService.ts:76-90`).
10. **Il cestino copre 4 tipi:** area, voce del Palazzo, mappa, area del dedalo. Restano **fuori**, e si cancellano per sempre:
    - voci del diario (`giornataService.ts:322-329`; 409 se spuntate con effetti);
    - partite (`partiteService.ts:148-158`);
    - Persona della scorta;
    - eventi dello storico;
    - luoghi, negozi e oggetti (L5, L7).

    La pagina «Rimossi» è separata.
11. **Home e Partita.** «Oggi» non è un componente unico. Home (`HomePage.tsx:64, 138, 153`) e Partita (`OggiPartita.tsx:28-51`, montato
    in `PartitaPage.tsx:93`) usano gli stessi `useOggi` + `OggiGuida` + `OggiMappa`, ma li compongono a mano in modo diverso:
    - in Home non ci sono `PageState` né `onGiorno`;
    - la mappa a scomparsa c'è solo in Home;
    - lo stato della mappa non è condiviso fra le due.

    `OggiGuida.test.tsx` non esiste.
12. **Non esistono:**
    - un **pannello di dettaglio sopra il diario**: i collegamenti delle voci sono `Link` verso altre pagine; solo l'atterraggio del
      Palazzo si apre nella mappa accanto (`PartiAzione.tsx:44-50`);
    - **«Entra» ed «Esci»** per il Metaverso (vedi L3 §0.3: il collegamento della voce del Palazzo non porta all'infiltrazione del giorno).

## 1. Percorsi dell'utente di oggi (letti dal codice e visti nelle schermate)
| # | Dove | Gesto | Effetto oggi | Schermata «prima» |
|---|---|---|---|---|
| D1 | Home › Oggi | spunta di una voce | effetti §0.1, notifica degli effetti e del giorno avanzato | `01-home-oggi` |
| D2 | Partita › Oggi | come D1, con `onGiorno` | idem | `02-partita` |
| D3 | Guida giorno per giorno (`/guida/percorso/:data`) | spunta, «Segna come giorno corrente», «Sulla mappa» (fuori pagina) | idem; strada 2 | `03-percorso-0601`, `04-percorso-0409` («Inizia a pulire» la mansarda), `05-percorso-0518` |
| D4 | Calendario | «Imposta come data di gioco» | strada 4, senza controlli | `06-calendario` |
| D5 | Scheda del Confidente | «Regalo consegnato», conferma requisito | regalo per nome, senza punti | `07-confidente-sojiro` |
| D6 | Partita › Confidenti | rango ±, note, Regalo, Uscita, Annulla ultimo | §0.4-0.5 | `02-partita` |
| D7 | Attività | consultazione; i turni si contano da Progressi | — | `08-attivita` |
| D8 | Impostazioni › Cestino | 4 tipi | — | `09-impostazioni` |

Le schermate stanno in `lotti/L10/schermate-prima/`: 45 PNG (9 viste × 5 misure), partita 1 al 06-01, sola lettura.

## 2. Back-end
**Rotte**
- `server/routes/compendio.ts`:
  - percorso e giornata: 122, 125, 129;
  - voci: POST 134, PUT 137, sposta 141, trasferisci 145, DELETE 148.
- `server/routes/partite.ts`:
  - creazione: POST `/` 53;
  - partita: PUT `/:id` 59;
  - squadra: 79-87;
  - Confidenti: 92-109;
  - spunta: `/:id/percorso` 115-121;
  - giorno: `/:id/giorno` 122;
  - meteo: 127-135;
  - acquisti: 136;
  - letture: 145;
  - punti: 159;
  - compendio: 169-172;
  - suggerimenti: 177;
  - Persona: 187-202;
  - Velluto: 256-269.
- `routes/condizioni.ts`: eventi 117, attività 133.
- `routes/impostazioni.ts`: cestino 116-131.

**Schemi**
- `schemas/partite.ts`: 180 (`bodyAzionePercorso`), 181 (`bodyGiornoCorrente`) e quelli dei Confidenti, della scorta e del compendio.
- `schemas/compendio.ts`: 35, 46, 57-62.
- `schemas/comuni.ts`: 30 (`dataGioco`), 33 (`uidVoce`).

**Servizi**
- `giornataService` 68-362.
- `percorsoService` 28-90.
- `effettiAzioneService` 51-109.
- `azioniStrutturateService` 27-130.
- `suggerimentiService` (Doti ricavate dal testo con una regex, 22-33).
- `incontriService` 74-162.
- `partiteService` 77-158, 208-215, 246-398, 491-746.
- `attivitaService` 135-143, 256-258, 318-511.
- `negoziService` 156-171.
- `squadraService` 60-73.
- `storicoService` 32-90.
- `cestinoService` 161-402.
- `operazioniVellutoService` 126-297.
- `semaforiService` 207-226.

**Conversioni e migrazioni**
- `server/db/conversioneEffettiAzione.ts` (190-201, 65-70).
- Gioco: 086 (effetti delle azioni), 092 (`voce_giornata`, `genere` 43, uid 30-32).

## 3. Schema
**Gioco**
- `voce_giornata`: 092:38-57; 954 voci, tutte di genere `azione`.
- `giorno_percorso`: `azioni_json` non è più letta.

**Partite** (`schemaUtente.ts`)

| Tabella | Riga |
|---|---|
| `spunta_voce_partita` | 65-66 |
| `acquisto_partita` | 25 |
| `attivita_svolta_partita` | 26 |
| `cestino_partite` | 27 |
| `compendio_partita` | 30 |
| `confidente_partita` | 31 |
| `cruciverba_partita` | 32 |
| `domanda_partita` | 33 |
| `dote_sociale_partita` | 34 |
| `effetto_lettura_partita` | 35 |
| `evento_partita` | 36-39 |
| `evento_storia_partita` | 40 |
| `incontro_confidente_partita` | 41-42 |
| `lettura_partita` | 43 |
| `partita` | 49-50 |
| `persona_posseduta` | 51-52 |
| `progresso_*` | 56-58 |
| `regalo_partita` | 61 |
| `requisito_partita` | 62 |
| `richiesta_partita` | 63 |
| `turno_partita` | 69 |

**Migrazioni utente**: 004, 005, 007, 008, 009-011, 012, 013, 014 (rimossa dalla 015), 015 (giornata canone), 016, 019, 021.

## 4. DTO (`shared/types.ts`)
- Partita, Doti e squadra:
  - `PartitaDto` 443-461 (senza yen), `FasciaGioco` 441;
  - `SquadraPartitaDto` 512;
  - `DoteSocialePartitaDto` 523, `ModificaDote` 539.
- Confidenti e Persona:
  - `ConfidentePartitaDto` 578-599, `ModificaConfidente` 609-623;
  - `CompendioPartitaDto` 625, `PersonaPossedutaDto` 647;
  - `DoteDaSegnareDto` 900.
- Diario e giornata:
  - `IncontroConfidenteDto` 1040, `EffettiAzioneDto` 1052-1065, `RiferimentoAzioneDto` 1067;
  - `SuggerimentiOggiDto` 1074, `StatoAzioneDto` 1101, `GenereVoce` 1107;
  - `AzionePercorsoDto` 1114-1149;
  - `QuizVoceDto` 1152, `ElenchiAzioneDto` 1158, `DatiVoceGiornata` 1173;
  - `TrasferisciVociGiornata` 1190, `VociTrasferiteDto` 1202;
  - `PercorsoIndiceDto` 1242, `GiornoCorrenteDto` 1251, `GiornoAvanzatoDto` 1258, `PercorsoGiornoDto` 1264.
- Storico, progressi e cestino:
  - `EventoPartitaDto` 1988, `StoricoDto` 2003;
  - `ProgressiPartitaDto` 2491;
  - `TipoCestino` 2552, `VoceCestinoDto` 2562.
- `EffettoAzione` sta in `shared/effettiAzione.ts:52`.

## 5. Componenti FE
- `PartitaPage` 30-93: 13 schede, Oggi come predefinita.
- `HomePage` 64-175.
- `OggiPartita` 28-51.
- `useOggi` 56-159.
- `OggiGuida` 23-69.
- `OggiMappa`.
- `GiornoGuida`:
  - `Azione` 65-107;
  - gesti 183-228;
  - «Copia o sposta voci» 302-326.
- `PartiAzione` 26-72.
- `PercorsoPage` 52-81.
- Partita: `ProgressiPartita`, `RiepilogoPartita` (42-53, 76-78, 104), `DotiSociali`, `ConfidentiPartita`.
- Persona e storico: `ScortaPersona`, `CompendioPersonale`, `StoricoPartita`.
- Altre schede: `LettureEGiochi`, `SquadraPartita`, `ScuolaOggi`, `RimossiPage`, `Cestino`.

## 6. Test coinvolti
**Server**
- `giornata.test.ts` (16 casi).
- `giorno-completato.test.ts` (4).
- `effetti-azioni.test.ts` (13), `effetti-letture.test.ts` (5).
- `trasferisci-voci.test.ts` (4), `storico.test.ts` (2).
- `incontri-confidenti.test.ts` (11), `percorso.test.ts` (6), `suggerimenti.test.ts` (5).
- `azioni-utente.test.ts` (8), `obiettivi.test.ts`.
- `partiteService.test.ts` (5), `cestino.test.ts` (12), `operazioniVelluto.test.ts`.
- `memento-persona-trama.test.ts`, `squadra.test.ts`, `negozi.test.ts`.
- Migrazioni utente 015 e 019.

**FE**
- `HomePage.test.tsx` (3), `PartitaPage.test.tsx` (1).
- `GiornoGuida.test.tsx` (24), `PercorsoPage.test.tsx` (3).
- `OggiPartita.test.tsx` (6), `OggiMappa.test.tsx` (5), `useOggi.test.tsx` (3).
- `ConfidentiPartita.test.tsx` (7), `ScortaPersona.test.tsx` (7).
- `StoricoPartita.test.tsx` (4), `ProgressiPartita.test.tsx` (3), `DotiSociali.test.tsx` (5).

Diversi test fissano il comportamento di oggi che L10 cambia, e andranno aggiornati:
- «togliere la spunta non torna indietro»;
- «le letture restano»;
- «il conseguimento dice le Doti senza toccarle».

## 7. Cosa cambierà per l'utente
1. **Partita › Oggi diventa la casa**, un componente solo, incorporato nella Home. Il dettaglio di una voce si apre in un pannello sopra il
   diario, e chiudendolo si torna alla stessa voce.
2. **La spunta aggiorna tutto e togliendola si annulla tutto**, comprese letture, rango, acquisti, Richieste, domande, cruciverba, eventi
   di storia e storico. Esempio del piano: spuntare «Inizia a pulire» (04-09) segna la mansarda pulita, togliere la spunta la riapre.
   Le Doti vengono proposte con «Applica» (D6); acquisti e paghe propongono il movimento di yen (D8).
3. **Una regola per azione**: il giorno si cambia con controlli e storico da qualunque punto; il rango sale dal passaggio; il regalo è
   un'azione sola; registrare una Persona è una strada sola; c'è un contatore solo per letture e uno per turni.
4. **Nel Metaverso**: «Entra» apre la scheda del Palazzo sull'infiltrazione in corso, oppure il menù del Dedalo; «Esci» riporta al diario
   con un riepilogo.
5. **Cestino per tutto**, comprese voci del diario, partite e Persona.
6. **Restano invariati** testo, ordine, uid e spunte delle 254 voci validate. Le spunte già date restano, e i loro effetti già applicati
   non vengono riapplicati.

## 8. Segnalazioni per Stesura modifiche (fatti, non progetto)
- **A.** Le strade 4 e 5 del giorno (Calendario e Riepilogo) passano da `PUT /partite/:id` senza controlli: vanno chiuse o ricondotte a
  `/giorno`.
- **B.** Per le spunte già date nel diario validato, gli effetti nuovi (rango, acquisti, eventi) non vanno applicati retroattivamente
  senza un elenco approvato. Oggi `spunta_voce_partita.effetti_json` registra solo gli effetti di allora.
- **C.** La lettura oggi non si annulla di proposito (scelta in `giornataService.ts:334-338`). Annullarla tocca anche le letture segnate
  dalle loro pagine, perché oggi i due gesti scrivono la stessa riga.
- **D.** I suggerimenti ricavano le Doti dal testo con una regex (`suggerimentiService.ts:22-33`): con gli effetti strutturati questa
  copia va tolta.
- **E.** Due voci del diario che portano a un Palazzo hanno due regole d'atterraggio diverse (L6 §0.8); «Entra» dovrà usarne una.
