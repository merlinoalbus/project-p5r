# L10 «Partita e diario» — piano di lavoro per BE e FE

Autore: Stesura modifiche, 2026-10-20. Il *cosa* sta in `lotti/L10/modifiche.md` («M» con § e righe); qui: **ordine**, **chi**, dipendenze e prove
per pezzo. **Si comincia solo col via del Manager.**

Dati di riferimento: la copia più recente in `dati-produzione/`, oggi la base `p5s-2026-10-20-0533Z`. Cifre di partenza:
- diario: 997 voci, 255 nel validato;
- spunte: 342, di cui 240 in p1;
- storico: 1316 righe.

L10 è il lotto che chiude il giro e legge da tutti gli altri:
- L3: il campo «Infiltrazioni» e il meccanismo «da rivedere» (`testo_precedente_json`, esteso con `data`/`fascia`/`ordine`);
- L4: lo stato delle voci e «concluso»;
- L5: `?spillo=`;
- L6: il valutatore e gli inviti con le condizioni;
- L7: il catalogo;
- L8: `registraPersona`;
- L9: `puntiConfidenti`, i dialoghi e il giorno unico.

Regole del piano, come in L5–L9:
- i **contratti** escono per primi (B0);
- **nessun file è toccato da due ruoli**: BE lavora su `server/` e `shared/`, FE su `src/`;
- ogni pezzo chiude con typecheck e lint verdi e con i suoi test mirati;
- quando un pezzo è pronto, BE avvisa direttamente FE e i tester: «L10 · Bn pronto su <porta>».

## Mappa delle dipendenze
```
B0 effetti e DTO ─┬─> F1 basi FE (Oggi unico, store, PannelloScheda vuoto) — subito
                  ├─> B1 migrazioni M10 (voce_effetto, proposte, validata, 8 voci inviti, correzioni G-037; partite: registro, da_applicare, base) ──> (no-reg)
                  ├─> B2 motore: applica/annulla, registro, da applicare ──> F2 spunte con effetti visibili, «Da applicare»
                  ├─> B3 abbinamenti ──> F3 «Abbinamenti del diario»
                  ├─> B4 punti legame: campi sulla voce, motore cronologico, base, ricalcolo «da verificare» ──> F4 campi del Confidente sulla voce
                  ├─> B5 una regola per azione: giorno, regalo, letture, turni, yen, storico, cestino ──> F5 Calendario/Riepilogo sul giorno, «Regala», Persona della partita
                  └─> B6 navigazione: «Entra/Esci» con riepilogo, pannello della scheda ──> F6 PannelloScheda, «Esci»
B7 OpenAPI, test allineati ──> F7 rifinitura
```

## BE

### B0 — Contratti · M §1.1, §6
- `shared/effettiVoce.ts`, che prende il posto di `shared/effettiAzione.ts`: tipi, campi, nome italiano e chi applica ogni effetto.
- `shared/types.ts`:
  - `AzionePercorsoDto` con `effetti`, `proposte`, `applicati`, `confidente`, `validata`, `daRivedere`;
  - DTO di «Da applicare», degli abbinamenti, del ricalcolo e di «Persona della partita»;
  - tipi del cestino `voce-diario`, `partita`, `persona-scorta`.
- **Si prova**: typecheck.

### B1 — Migrazioni M10 · M §7, §1.2, §4
- **Gioco**:
  - `voce_effetto`: i 266 di oggi più i sicuri (61 domande, 33 + 2 cruciverba, la cumulativa);
  - `proposta_effetto_voce`;
  - `validata`: 255 righe;
  - le **8 voci** degli inviti dopo il 06-01, nelle posizioni del M §4, compresa Makoto 07-30 in ordine 1 con la condizione scritta;
  - le **correzioni di G-037** (M §1.2): Ustione → 17/8 e Hacker → 30/8 spostate, con data e ordine di prima in `testo_precedente_json`;
    domanda del 7/7 aggiunta; domanda del 10-15 nascosta, con la proposta Fascino +2; voce del 10-31 segnalata.
- **Partite**: `effetto_applicato` vuota; `da_applicare`, con le proposte delle spunte già date; `confidente_base_partita`; `movimento_yen`;
  le letture portate al completo dove c'è `lettura_partita`.
- **Si prova** (Test no-reg):
  - diario **1006** voci, cioè 997 + 1 di L3 + 8;
  - il validato identico, 255 voci;
  - 342 spunte e 1316 righe di storico invariate;
  - stati della partita, ranghi e punti invariati;
  - idempotenza.

### B2 — Motore · M §1.3
- `server/services/motoreDiario.ts`: `applica` e `annulla` per voce e partita. Ogni effetto chiama la funzione del suo dominio e scrive il
  registro con lo stato di prima; un effetto con `creato = 0` non si annulla.
- Doti e yen vanno sempre e solo in `da_applicare` (D6, D8).
- Rotte `GET`/`POST /api/partite/:id/da-applicare`; `giornataService.spuntaVoce` passa da `motoreDiario`.
- **Si prova**:
  - M §8.1 test 1: per ogni tipo d'effetto, la spunta cambia lo stato e toglierla lo rimette, anche dopo un riavvio;
  - test 2 su una partita di prova: «Inizia a pulire» porta a `mansarda-pulita`.
- **Sblocca F2.**

### B3 — Abbinamenti · M §1.2
- Rotte `GET /api/partite/:id/abbinamenti?area=&mese=` e `POST …/conferma|scarta`, più `PUT /api/compendio/voci/:uid/effetti` con «Ripristina».
- Le proposte di G-037: Fascino +2 il 10-15, Kawakami e «Stand» il 10-31, la domanda del 7/7.
- **Si prova**: conferma, scarta, «scegli un altro», «conferma tutte le certe»; le voci del validato si confermano solo con il gesto.
- **Sblocca F3.**

### B4 — Punti legame · M §2
- `server/services/motorePunti.ts`: ordine cronologico, «evento pronto», eccedenza, ranghi non a punti, moltiplicatori di L9; base della
  partita; ricalcolo come «da verificare».
- Rotte `GET`/`POST …/confidenti/:k/ricalcolo`.
- **Si prova**: M §8.1 test 3 (test di proprietà su sequenze casuali; Sojiro p1 «da verificare»).
- **Sblocca F4.**

### B5 — Una regola per azione · M §3
- `partiteService`:
  - `impostaGiorno` e `impostaFascia`: `PUT /partite/:id` con `dataGioco` → 400 `usa-il-giorno`;
  - `regala`;
  - letture con un solo contatore, e «completato» calcolato;
  - turni con un solo contatore;
  - yen con movimento e punti negozio.
- Storico derivato con gli annullamenti.
- Cestino per voce del diario, partita e Persona della scorta. «Rimossi» si unisce al cestino.
- **Si prova**: M §8.1 test 4, 5 e 7; Test funzionali «ogni azione ha una regola sola», provata da pagine diverse.
- **Sblocca F5.**

### B6 — Navigazione · M §5
- «Entra» con `da=diario&voce=<uid>`; riepilogo dell'«Esci»:
  - concluso, con il boss finale dichiarato;
  - quanto manca al completato;
  - dopo il concluso, l'ingresso non si propone più (R10-28c).
- Inviti nel diario (M §4): voce e gesto sono lo stesso evento, solo con le condizioni vere.
- **Si prova**: «Entra/Esci» su Madarame; M §8.1 test 6 (inviti; Makoto 30/7 con la piramide conclusa e sul percorso del diario).
- **Sblocca F6.**

### B7 — Chiusura
- OpenAPI.
- Test esistenti allineati (M §8.1 test 9): le attese cambiano, nessun test si cancella.
- **Si prova**: `openapi.test.ts`; Test no-reg completo (M §8.5).

## FE

### F1 — Basi (subito dopo B0) · M §5
- `src/components/partita/Oggi.tsx`: un componente solo per Home e Partita, con `oggiStore`. Tiene insieme alla Home la regola di L5 LAY5-1:
  una sola barra di scorrimento.
- Struttura vuota di `PannelloScheda`.
- **Si prova**: `Oggi.test.tsx`; Test layout della Home (LAY5-1 ancora verde).

### F2 — Spunte con effetti (dopo B2) · M §1.3
- In `GiornoGuida`, accanto alla voce: gli effetti applicati («Ha segnato: …», con «Annulla»), le proposte, i chip «da rivedere» e «validata»
  e il motivo.
- «Da applicare», con applica e scarta, anche in blocco.
- **Si prova**: Test UX di una giornata da Oggi dal telefono (R10-36, R10-37); Test funzionali «Inizia a pulire» sulla partita di prova.

### F3 — Abbinamenti del diario (dopo B3)
- La pagina «Abbinamenti del diario», in Partita › Diario e in Impostazioni, con i filtri.
- **Si prova**: `AbbinamentiDiario.test.tsx`; Test UX con l'elenco lavorabile (R10-38).

### F4 — Campi del Confidente sulla voce (dopo B4) · M §2.1
- Confidente, scelta di dialogo, punti e passaggio di rango, con le proposte.
- «Da verificare» del ricalcolo nella pagina del Confidente, con «Applica il ricalcolo».
- **Si prova**: Test funzionali su punti ed eccedenza (partita di prova).

### F5 — Giorno, regalo, Persona della partita (dopo B5) · M §3
- `CalendarioPage` e `RiepilogoPartita` usano `PUT /partite/:id/giorno`.
- Una sola finestra «Regala» al posto delle due di oggi.
- La vista «Persona della partita».
- Progressi, con la voce che ha fatto scattare ogni fatto.
- **Si prova**: `PersonaDellaPartita.test.tsx`, `ConfidentiPartita.test.tsx`; Test no-reg sugli stati della partita reale.

### F6 — Pannello della scheda ed «Esci» (dopo B6) · M §5
- `PannelloScheda`: foglio su telefono, pannello da 1024 px, `?scheda=`; si richiude sulla stessa voce.
- `DungeonDettaglioPage`: «Esci» col riepilogo.
- **Si prova**: `PannelloScheda.test.tsx`; Test UX in gioco; Test layout del pannello.

### F7 — Rifinitura (dopo B7)
- Test FE del M §8.2; testi.
- **Si prova**: tutto il M §8.4 e il M §8.6.

## Per i tester: cosa provare e quando
| Pronto | Funzionali | UX | No-reg | Layout |
|---|---|---|---|---|
| B0 + F1 | — | Oggi uguale in Home e Partita | — | Home con una sola barra, Oggi |
| B1 | — | — | 1006 voci, validato 255 identico, 342 spunte, storico 1316, stati e punti | — |
| B2 + F2 | spunta ↔ stato per ogni effetto; «Inizia a pulire» | una giornata da Oggi | annullare rimette lo stato di prima | voce con gli effetti |
| B3 + F3 | abbinamenti, proposte di G-037 | elenco lavorabile | voci del validato toccate solo col gesto | elenco |
| B4 + F4 | punti in ordine cronologico, eccedenza, ricalcolo | — | ranghi della partita reale invariati | campi del Confidente |
| B5 + F5 | una regola per azione, da pagine diverse | «Regala» unico | letture, turni, yen | Progressi, Persona della partita |
| B6 + F6 | Entra/Esci, inviti (Makoto, Futaba) | pannello che richiude sulla voce | Kamoshida e Madarame come dopo L4 | pannello e foglio |
| B7 + F7 | tutto il M §8.3 | tutto | tutto | tutto |
