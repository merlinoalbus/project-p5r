# L6 «Condizioni uniche» — piano di lavoro per BE e FE

Autore: Stesura modifiche, 2026-10-20. Il *cosa* sta in `lotti/L6/modifiche.md`, qui abbreviato «M» (§ e righe); questo file dice
**in che ordine** si lavora, **chi** fa cosa, le dipendenze e cosa si prova appena un pezzo è pronto. **Si comincia solo col via del PM.**
Dati di riferimento: la copia più recente in `dati-produzione/` (oggi la base `p5s-2026-10-20-0503Z`, impronta `ff3033cb…`).
L6 legge L4 (Palazzo «concluso», `voce_boss_finale`, `regola_boss`) e L5 (`presenzaDelLuogo`, `luogo.solo_eventi_confidente`). Se L5 non è
ancora consegnato, le condizioni dei luoghi del M §4.1 le scrive la migrazione di chi arriva prima, con la stessa tabella (L5, nota in testa).

Regole del piano (come L5):
- **contratti prima**: B0 esce per primo e FE scrive su tipi veri;
- **nessun file toccato da due ruoli**: BE lavora su `server/` e `shared/`, FE su `src/`;
- ogni pezzo chiude con typecheck e lint verdi e con i suoi test mirati;
- quando un pezzo è pronto, BE manda a FE e ai tester un messaggio diretto «L6 · Bn pronto su <porta>».

## Mappa delle dipendenze
```
B0 vocabolario e DTO ─┬─> F1 editor unico (tipi, ricerca per nome → chiave) — subito
                      ├─> B1 valutatore unico + /api/condizioni/valuta ──> F2 via i mini-valutatori, anteprima nell'editor
                      ├─> B2 migrazione M6 (quartieri, luoghi, inviti, Clinica, Ohya, finestre) ──> (no-reg esiti alle 6 date)
                      ├─> B3 inviti: tabelle, gesto, condizione effettiva ──> F3 «Invito avvenuto» (Confidente, quartiere, luogo)
                      ├─> B4 riferimenti per chiave, Richieste nel cestino, requisiti dei Confidenti ──> F4 editor dei requisiti
                      └─> B5 Palazzi: finestra a colonne, `arco`, `destinazionePalazzo`, libri «sblocca» ──> F5 metro, città, libri, Confidente
B6 OpenAPI, test allineati, test di equivalenza dei valutatori ──> F6 rifinitura (testi, date in italiano, layout)
```

## BE

### B0 — Contratti (primo) · M §1, §7 BE 1
- `shared/condizioniSpillo.ts`: il vocabolario unico (M §1 tabella), con questi tipi:
  - i tipi di oggi;
  - `palazzo` (= concluso) e `persona-abilita` per chiave;
  - i nuovi `da-subito`, `luogo`, `invito`;
  - `avviso` non bloccante;
  - **niente `manuale`** (R6-01b).

  Per ogni tipo: nome, campi, `descriviRequisitoSpillo` e se è di presenza o di prerequisito. `Condizione = RequisitoSpillo`.
- `shared/types.ts`:
  - `RequisitoRango` diventa alias di `Condizione`;
  - `LibroDto.sblocca: Array<{ tipo; chiave; nome; casa }>`;
  - DTO della valutazione `{ esito, testo, manca? }`;
  - `TipoCestino` con `'richiesta'`;
  - DTO di invito `{ chiave, confidente, data, apre: { tipo, chiave, nome, casa }, condizioni, possibile, registrato }`;
  - `QuartiereDto.sblocco: { condizione, fonte, esito }`.
- `shared/statiPartita.ts`: generato dal vocabolario.
- **Si prova**: typecheck; il test di vocabolario (M §8.1.1: 31 tipi, ognuno col suo nome e la sua descrizione).

### B1 — Valutatore unico · M §2
- `server/services/condizioni/valutatore.ts` (nuovo) = `disponibilitaService.valutaRequisito` più i casi di `semaforiService.valuta`.
- Tutti i chiamanti del M §2 passano da qui: `cittaService`, `negoziService`, `attivitaService`, `mappeService.dettagliSpillo`,
  `palazziService.apertoIl`, `atterraggioPalazziService.regolaCopre`, `disponibilitaService.arcoAllaData` e `semaforiService`.
- `palazzo{}` legge il **concluso** di L4. `luogo{}` legge `presenzaDelLuogo(…).sbloccato` di L5. `invito{}` legge `invito_partita`.
- Rotta nuova `POST /api/condizioni/valuta` `{ condizioni, partita, giorno? }`.
- Si tolgono i lettori di «confermato a mano» (`semaforiService.ts:9, 105`; R6-01b).
- **Si prova**:
  - **test di equivalenza**: i vecchi valutatori e il nuovo danno lo stesso esito su tutte le condizioni salvate, prima di togliere i vecchi
    (M §8.1.2);
  - Test funzionali: esiti uguali fra metro, città, scheda, visore e diario alle 6 date (R6-09).
- **Sblocca F2.**

### B2 — Migrazione M6 · M §5, §4.1–§4.4
- `server/db/migrations/<n>_condizioni_uniche.ts` + test, più `index.ts`.
- Colonne:
  - `quartiere.condizioni_json`, `quartiere.fonte_condizioni_json`;
  - `luogo.fonte_condizioni_json`;
  - `dungeon.finestra_dal`, `finestra_al`, `lettera_entro`.
- Tabelle `confidente_invito` (con `condizioni_json`) e `utente.invito_partita`. La seconda va in una migrazione utente.
- Cestino con `richiesta`.
- Valori da scrivere:
  - i 24 quartieri della tabella del M §4.1 (Roppongi `data{09-15}`);
  - i 26 luoghi confermati da G-029 (e Jose, Untouchable, gabbie, bagno pubblico, infermeria, Sakai con 16 finestre, nagiuri);
  - le **7** date-invito trasformate in righe di `confidente_invito`, con le condizioni di G-028;
  - Clinica 04-16 (sede e 11 articoli), Tae 04-18, Ohya 07-05;
  - `sblocco-luoghi` → `luogo.condizioni_json` dove è vuota;
  - finestre dei Palazzi nelle colonne;
  - pin d'ingresso con finestra identica → `arco`.
- Si scrive solo dove è NULL o dove l'elenco lo dice. Ogni modifica a una riga esistente va elencata con prima e dopo. Le condizioni dei pin
  dell'utente restano byte per byte.
- **Si prova**:
  - Test no-reg: conteggi e **esiti alle 6 date** (04-11, 04-16, 05-20, 06-09, 07-05, 10-11) su p1 e su una partita di prova, uguali salvo
    l'elenco delle correzioni; impronta `ff3033cb…` per diario, Kamoshida e Madarame;
  - l'elenco «cambi visibili sulla partita reale», cioè i luoghi che si chiudono finché l'invito non è registrato (R6-21).

### B3 — Inviti · M §1 (inviti, condizione effettiva, condizioni dell'invito)
- `server/services/inviti.ts` (nuovo):
  - `condizioneEffettiva(posto)`;
  - `invitiDelConfidente`, `invitiCheAprono(posto)`;
  - `registraInvito` / `annullaInvito` con le condizioni vere.
- Rotte: `PUT` e `DELETE /api/partite/:id/inviti/:invito`, più gli inviti nei DTO di Confidente, quartiere e luogo.
- `invito_partita` va in `RIFERIMENTI_PARTITE` e nel cestino delle partite.
- **Si prova**:
  - registrare e annullare un invito: il luogo si apre e si richiude, se non c'è il libro;
  - condizioni non vere → 409 `invito-non-possibile` con «manca: …»;
  - Makoto 30/7 su una partita di prova con Futaba concluso e Imperatore rango 1;
  - Ryuji 29/5 su p1, con Madarame concluso.
- **Sblocca F3.**

### B4 — Riferimenti per chiave e requisiti dei Confidenti · M §3, §4.3
- Gli 11 requisiti `richiesta` passano a una chiave e i `persona-abilita` sicuri vanno per chiave.
- `semaforiService` non accetta più i nomi.
- `richiesteService`: rinominare una Richiesta non cambia niente; eliminarla la manda nel cestino, e le condizioni che la citano danno
  «Richiesta eliminata» (grigio).
- Rotte `compendio.ts`: requisiti di un Confidente in lettura e scrittura, un rango per riga, con `Ripristina`.
- **Si prova**: M §8.1.5; rinominare ed eliminare una Richiesta senza rompere i requisiti (R6-04, R6-15).
- **Sblocca F4.**

### B5 — Palazzi, libri, quartieri · M §4.1, §4.2, §4.4
- `destinazionePalazzo(dungeon, giorno)` usata da metro, `mappaAzione` e `giornataService` (97, 99).
- Si tolgono il lettore di `finestre-dungeon` e il validatore `mappeService` (1100-1165) sui 24 quartieri.
- `attivitaService`: `LibroDto.sblocca` calcolato dalle condizioni.
- `QuartiereDto.sblocco` con la fonte e la scrittura «Modifica sblocco» / «Ripristina».
- Aree e planimetrie del mondo ereditano lo sblocco del quartiere (M §4.1): `condizioneEffettiva(area)`, `AreaDettaglioDto.sblocco` e
  l'esclusione dalla navigazione. Rinomina `senzaIngressoAPalazzoCompletato` → `senzaIngressoAPalazzoConcluso`.
- Riferimenti di riga aggiornati sul codice di oggi: `app.md` §8.3 di Analisi app.
- **Si prova**: M §8.1.3, 8.1.4 e 8.1.6; metro e diario portano nello stesso posto per i Palazzi (R6-17); Odaiba, Asakusa, Kichijoji, Kanda,
  Ikebukuro.
- **Sblocca F5.**

### B6 — Chiusura
- OpenAPI di `condizioni.ts`, `compendio.ts` e inviti.
- Test esistenti allineati (M §8.1.9).
- Un pacchetto vecchio con forme vecchie si converte (R6-22); `manuale` diventa `avviso`, con l'elenco nel riepilogo d'importazione.
- **Si prova**: `openapi.test.ts`, e Test no-reg completo.

## FE

### F1 — Editor unico (subito dopo B0) · M §6.1
- `src/components/guida/CondizioniEditor.tsx`:
  - tutti i tipi del vocabolario, `luogo`, `avviso`, `palazzo`, `persona-abilita`, i 24 quartieri; niente `manuale`;
  - scelta dell'oggetto per **nome con ricerca** e salvataggio per **chiave**;
  - gli inviti in sola lettura, con il link al Confidente.
- Su telefono, foglio dal basso (`Modal`).
- **Si prova**: `CondizioniEditor.test.tsx` (tutti i tipi, ricerca per nome → chiave); Test layout dell'editor a 375 e 1280.

### F2 — Niente valutazioni nel client (dopo B1) · M §2
- Si tolgono `aperturaTokyo.quartiereAperto`/`dentroFinestra` (la metro usa `disponibile` del server), `VisoreMappa.nascostoPerCondizioni`
  (esito nel DTO), `NavigazioneSpillo.tsx:15`, `utils/letture.bloccata`, `ChipDisponibilita.tsx:42` e `ConfidentiPartita.tsx:46`.
- Anteprima dell'esito nell'editor con `POST /api/condizioni/valuta`.
- `CittaPage`: ricarica i quartieri al cambio di giorno o di fascia; l'illustrazione che si «spegne» usa `disponibile` del server.
- Pagina Area di un quartiere chiuso (dopo B5): la riga «Non ancora aperta: …».
- **Si prova**: `MappaTokyo.test.tsx` (nessuna rivalutazione), `CittaPage.test.tsx`; Test funzionali R6-09 alle 6 date.

### F3 — Inviti (dopo B3) · M §1, L9 R9-07c
- Sezione «Inviti» nella pagina del Confidente. Il gesto «Invito avvenuto» / «Annulla» sta anche accanto alla condizione, nelle pagine del
  quartiere e del luogo che l'invito apre.
- Con le condizioni non vere il pulsante è disattivato, con «Non ancora possibile: manca …».
- **Si prova**: Test funzionali e UX su Harajuku, il Planetario e Makoto 30/7 (partita di prova); Test layout del pulsante a 44 px.

### F4 — Editor dei requisiti (dopo B4) · M §6.1
- `src/components/confidenti/EditorRequisiti.tsx` (nuovo): «Modifica requisiti» nella pagina del Confidente, un rango per riga, con
  `Ripristina`. Sostituisce `CorreggiRequisito`.
- **Si prova**: `EditorRequisiti.test.tsx`; Test funzionali «modificare un requisito su dati di prova e ripristinarlo».

### F5 — Metro, città, quartiere, libri, Confidente (dopo B5) · M §4, §6.2
- `QuartierePage`: «Sblocco» con la fonte e «Modifica sblocco».
- `LibriPage`: «Apre» calcolato.
- `ConfidenteDettaglioPage:127`: la data di sblocco descritta dal requisito del rango 1.
- Metro: date in italiano («dal 18 giugno»).
- **Si prova**: Test funzionali «ogni sblocco ha una forma sola» (24 quartieri, Confidenti, Palazzi, luoghi); UX delle condizioni leggibili.

### F6 — Rifinitura (dopo B6) · M §6.2, §8.2–§8.6
- Testi:
  - «Manca: …»;
  - «Disponibile dall'inizio»;
  - «Avviso: …», distinto da «Bloccato»;
  - «Fonte: guida, certezza media — da verificare».
- Test FE allineati.
- **Si prova**: tutto il M §8.4 e il M §8.6.

## Per i tester: cosa provare e quando
| Pronto | Funzionali | UX | No-reg | Layout |
|---|---|---|---|---|
| B0 + F1 | — | editor leggibile | — | editor a 375 e 1280 |
| B1 + F2 | esiti uguali ovunque alle 6 date | metro con date in italiano | semafori del diario uguali (R6-23) | — |
| B2 | — | — | conteggi, esiti alle 6 date, impronta, cambi visibili elencati | — |
| B3 + F3 | inviti (gesto, condizioni, Makoto, Ryuji) | «Non ancora possibile: manca …» | luoghi che si chiudono senza invito, elencati | pulsante «Invito avvenuto» |
| B4 + F4 | Richieste rinominate o eliminate, requisiti modificati | editor dei requisiti dal tablet | requisiti di oggi uguali | editor dei requisiti |
| B5 + F5 | quartieri, Palazzi (metro = diario), libri, Clinica | sblocco con fonte | Tokyo con gli stessi Palazzi negli stessi giorni (R6-25) | pagina del quartiere |
| B6 + F6 | tutto il M §8.3 | tutto il M §8.4 | tutto il M §8.5 | tutto il M §8.6 |
