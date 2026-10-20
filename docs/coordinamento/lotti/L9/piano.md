# L9 «Confidenti, attività, calendario» — piano di lavoro per BE e FE

Autore: Stesura modifiche, 2026-10-20. Il *cosa* sta in `lotti/L9/modifiche.md`, qui abbreviato «M» (§ e righe). Questo file dice **in che
ordine**, **chi** fa cosa, le dipendenze e cosa si prova appena un pezzo è pronto. **Si comincia solo col via del Manager.**

Dati di riferimento: la copia più recente in `dati-produzione/`, oggi la base `p5s-2026-10-20-0533Z` (impronta «prima» di L9: `9a64fde1…`;
diario 997 voci).

L9 legge dagli altri lotti:
- L4: Palazzo «concluso»;
- L5: luoghi con la casa, `presenzaDelLuogo`, orari dei Confidenti tolti dai luoghi (G-033);
- L6: valutatore, `confidente_invito` con le condizioni, editor dei requisiti;
- L7: regali per chiave del catalogo.

Regole del piano (come in L5–L8):
- **contratti prima**: B0 è il primo pezzo;
- **nessun file toccato da due ruoli**: BE lavora su `server/` e `shared/`, FE su `src/`;
- ogni pezzo si chiude con typecheck e lint verdi e con i suoi test mirati;
- quando un pezzo è pronto, BE avvisa direttamente FE e i tester con «L9 · Bn pronto su <porta>».

## Mappa delle dipendenze
```
B0 tipi e DTO ─┬─> F1 basi FE (API, rotte /confidenti e /guida/attivita/:k, shared/puntiConfidenti in anteprima) — subito
               ├─> B1 migrazione M9 (disponibilità G-036, confidente_luogo, ranghi G-020, giorno unico, domande d'esame) ──> (no-reg)
               ├─> B2 Confidenti: dettaglio, elenco «oggi», avvisi del diario, scritture ──> F2 pagina del Confidente ed elenco
               ├─> B3 punti: modulo unico, piazzamento agli esami ──> F3 anteprima dei punti, piazzamento in DomandePage
               ├─> B4 attività: effetti, paga, quiz, pagina ──> F4 pagina dell'attività
               └─> B5 calendario: giorno unico, sblocchi e scadenze ricavati, eventi per chiave ──> F5 Calendario, pagina del giorno, diario
B6 OpenAPI, test allineati ──> F6 rifinitura
```

## BE

### B0 — Contratti (primo) · M §4
- `shared/types.ts`:
  - `ConfidenteDettaglioDto.disponibilita`, con `modo` (compreso `'su-messaggio'`), `giorni`, `fasce`, `eccezioni` (anche
    `giorniDopoRango`), `luoghi`, `motivoSenzaLuogo` e `oggi`;
  - `ranghi` (con `modo`, `soglia`, `abilita`, `dote`), `inviti` (con `condizioni`, `possibile`, `avvenuto`), `regali` (L7), `dialoghi`;
  - `AzionePercorsoDto.avvisi`;
  - `GiornoCalendarioDto`, con `meteo: { giorno, sera, nota }`, `giornoSettimana` e `tag[]` con `ricavato`;
  - `AttivitaDto`, con `effetti`, `casa` ed `effettiDaCompletare`.
- `shared/puntiConfidenti.ts` (nuovo): la formula unica di G-020, cioè base, arcano ×1,5, esami ×1,2/×1,5 per i 7 ed eccedenza.
- `shared/date.ts`: `giornoDellaSettimana(MM-GG)`.
- **Si prova**: typecheck e test di `puntiConfidenti` (M §6 BE).

### B1 — Migrazione M9 · M §5, §1.1, §1.3, §3.1, §3.3
- File: `server/db/migrations/<n>_confidenti_calendario.ts` e la migrazione utente per `esame_piazzamento_partita`, con test e `index.ts`.
- Disponibilità:
  - le 23 righe: 11 cambiano, cioè le 8 strutturate con G-036 (Ann senza «anche sera con la pioggia», luogo Centro commerciale sotterraneo,
    ranghi 3/4/5/7/9/10 non con la pioggia; Kasumi `su-messaggio`; Gemelle dal 18/5) e le 3 corrette (Kawakami, Yoshida, Mishima con 2 giorni
    dopo il rango);
  - le disponibilità che arrivano dai luoghi di L5 (G-033): si controlla che coincidano, e si scrive solo Makoto.
- Altri dati:
  - `confidente_luogo`;
  - i ranghi da G-020;
  - «Junichi» → «Munehisa»;
  - `giorno` dalle due tabelle (346 date, 05-24 con nota);
  - le 31 domande d'esame;
  - le colonne per chiave di `evento_calendario`.
- Le 4 voci `igor` → `gemelle` (06-08, 09-06, 11-06, 01-11): **solo proposte** per l'elenco «Da rivedere».
- Nessuna voce del diario e nessuno stato di partita toccati.
- **Si prova** (Test no-reg):
  - conteggi del M §5: 997 voci, 109 domande con 97 visibili, segni delle partite invariati;
  - impronta;
  - idempotenza.

### B2 — Confidenti · M §1.1, §1.2, §1.3 (modifica), §1.4
- `confidentiService`:
  - dettaglio con «oggi», calcolato sulla disponibilità, il giorno e la fascia della partita;
  - elenco `GET /api/compendio/confidenti`;
  - scritture: `PUT …/:k`, `…/ranghi/:rango`, `…/dialoghi/:id`, `POST …/:k/ripristina`.
- Inviti `POST`/`PUT`/`DELETE …/:k/inviti`, con le condizioni di L6.
- `giornataService.voceDto` con gli `avvisi` «fuori giorno» e «fuori fascia». `su-messaggio` non dà mai avvisi.
- Nomi dal vivo nelle voci (`nomeRiferimento`).
- **Si prova**:
  - avvisi: Kawakami di martedì → «fuori giorno»; Yusuke al rango 4 con la pioggia; Mishima nei 2 giorni dopo un rango; Kasumi mai;
  - la data di sblocco è la stessa in semafori, calendario e pagina (R9-04, i 6 casi);
  - rango 1 e incontro di trama separati (Ohya, Kawakami, Gemelle, Takemi).
- **Sblocca F2.**

### B3 — Punti e piazzamento · M §1.3
- `partiteService` usa `shared/puntiConfidenti.ts`, al posto della formula interna (246-250).
- Rotta `PUT /api/partite/:id/esami/:esame/piazzamento`.
- **Si prova**: M §6 BE punti (base, arcano, esame primo / primi 10 / altro, per i 7 e fuori dai 7; eccedenza); l'anteprima è uguale al server.
- **Sblocca F3.**

### B4 — Attività · M §2
- `attivitaService`:
  - `effetti_json` come fonte unica;
  - la paga dall'attività;
  - i giorni del quiz del Triple Seven dal `quiz_json`;
  - «Effetti da completare» per le 7 + 9 attività senza scheda dell'Esperto;
  - per Biliardo e Gun About «casuale», solo come proposta.
- Rotte `GET`/`PUT /api/compendio/attivita/:k`.
- **Si prova**: effetti, paga unica, quiz (G-036 conferma paghe, quiz ed esami).
- **Sblocca F4.**

### B5 — Calendario · M §3
- `calendarioService`:
  - giorno unico;
  - tag ricavati, cioè sblocchi dal rango 1 e dalle condizioni dei luoghi e dei quartieri (L6), e scadenze dalle finestre dei Palazzi (L6:
    Madarame ha una scadenza e la lettera come evento a parte);
  - gli eventi che coincidono con un dato ricavato non si mostrano più, quelli che non coincidono vanno in elenco.
- `meteoService` legge il giorno, senza COALESCE.
- Rotta `PUT /api/compendio/giorni/:data`, con «Ripristina».
- Il cambio del giorno della partita resta `PUT /partite/:id/giorno` (regola unica di L10).
- **Si prova**: 346 giorni, meteo in due fasce, settimana calcolata, 05-24 con la nota; calendario ricavato; nessuna voce aggiunta al diario
  validato (R9-24).
- **Sblocca F5.**

### B6 — Chiusura
- OpenAPI di confidenti, attività, giorni e piazzamento; test esistenti allineati (M §6, app.md §5).
- **Si prova**: `openapi.test.ts`; Test no-reg completo.

## FE

### F1 — Basi (subito dopo B0)
- `src/services/api` (confidenti, attività, giorni).
- `src/router.tsx`: `/confidenti` (elenco) e `/guida/attivita/:chiave`.
- Il link del visore che oggi è rotto (T6, `VisoreMappa.tsx`) porta a `/confidenti`.
- `src/utils/punti.ts` si toglie: l'anteprima usa `shared/puntiConfidenti.ts`.
- **Si prova**: `ConfidentiPartita.test.tsx` (l'anteprima viene dal modulo condiviso); il link T6 funziona.

### F2 — Pagina del Confidente ed elenco (dopo B2) · M §1.4
- `ConfidenteDettaglioPage`:
  - ordine delle sezioni per il gioco: rango, punti verso il prossimo, prossimo passaggio, disponibilità di oggi, dialoghi del rango corrente;
  - poi requisiti, abilità, regali, «Inviti» con le condizioni, luoghi e gli altri ranghi;
  - moduli di modifica con «Ripristina».
- Elenco `/confidenti` con «oggi».
- Chip «Confidenti disponibili oggi · N» in Oggi.
- `GiornoGuida`: avvisi (chip ambra), nomi dal vivo, riga «Eventi del giorno».
- **Si prova**:
  - Test funzionali con la partita di prova: modificare una disponibilità, aggiungere un invito;
  - Test UX: «chi posso vedere oggi e dove» in un tocco (R9-30); la pagina non è lunga (R9-31);
  - Test layout: a 1366×657 e 1280×689 rango, disponibilità e dialoghi stanno nella prima schermata.

### F3 — Punti e piazzamento (dopo B3)
- `DomandePage`: piazzamento accanto ai risultati dell'esame.
- Anteprima dei punti nella pagina del Confidente e in `ConfidentiPartita`.
- **Si prova**: Test funzionali «impostare il piazzamento e vedere i punti».

### F4 — Pagina dell'attività (dopo B4) · M §2
- `AttivitaDettaglioPage.tsx` (nuova): sede con presenza, fascia, sblocco, effetti, quiz, «Modifica» e «Ripristina».
- `AttivitaPage` resta l'elenco, con un link per ogni attività.
- **Si prova**: `AttivitaDettaglioPage.test.tsx`; Test layout.

### F5 — Calendario, giorno, diario (dopo B5) · M §3
- `CalendarioPage`:
  - tag ricavati che portano alla voce o all'oggetto;
  - a 375 diventa una lista per settimana;
  - cambio del giorno con `/giorno`.
- Pagina del giorno: «Modifica il giorno».
- `CruciverbaPage`: ordine con `indiceGiornoScolastico`.
- **Si prova**:
  - Test UX: Calendario leggibile (R9-32);
  - Test no-reg: meteo della partita invariato, diario validato identico;
  - Test layout: lista a 375.

### F6 — Rifinitura (dopo B6)
- Test FE del M §6; testi.
- **Si prova**: tutto il M §6 (UX e Layout).

## Per i tester: cosa provare e quando
| Pronto | Funzionali | UX | No-reg | Layout |
|---|---|---|---|---|
| B0 + F1 | anteprima dei punti = server; link `/confidenti` | — | — | — |
| B1 | — | — | 997 voci, 109 domande, segni, impronta `9a64fde1…` | — |
| B2 + F2 | disponibilità (G-036), avvisi, data di sblocco unica, inviti | chi vedere oggi in un tocco | stati dei Confidenti invariati | pagina del Confidente in una schermata |
| B3 + F3 | punti con piazzamento (partita di prova) | — | — | — |
| B4 + F4 | effetti, paga, quiz | — | turni e contatori invariati | pagina dell'attività |
| B5 + F5 | calendario ricavato, giorno unico | Calendario leggibile | diario validato, meteo della partita | Calendario a 375 |
| B6 + F6 | tutto il M §6 | tutto | tutto | tutto |
