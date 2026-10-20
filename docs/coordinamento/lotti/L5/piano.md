# L5 «Luoghi, negozi, orari» — piano di lavoro per BE e FE

Autore: Stesura modifiche, 2026-10-20. Fonte unica del *cosa*: `lotti/L5/modifiche.md`, abbreviato «M» (§ e righe). Questo file dice solo
**in che ordine** e **chi**, con le dipendenze e cosa si può provare appena un pezzo è pronto.
**Si comincia solo col via del PM**, quando L2 e L3 sono chiusi. Dati di riferimento: la copia più recente in `dati-produzione/` (oggi la base
`p5s-2026-10-20-0503Z`, impronta `ff3033cb…`; Analisi dati sta ricontrollando L5 su questa base).

Regole del piano:
- **Contratti prima**: il pezzo B0 (tipi condivisi) esce per primo, così FE scrive contro tipi veri, senza mock.
- **Nessun file toccato da due ruoli**: BE `server/` e `shared/`, FE `src/`. L'unico passaggio è B0, scritto da BE e poi solo letto da FE.
- Ogni pezzo chiude con typecheck e lint verdi e con i suoi test mirati (`npx vitest run <file>`, mai tutta la suite).
- Un pezzo «pronto» si segnala a FE e ai tester con un messaggio diretto: «L5 · B2 pronto su <porta>».

## Mappa delle dipendenze
```
B0 tipi ─┬─> F1 basi FE (subito, in parallelo a B1…)
         ├─> B1 migrazione M5 ──> (no-reg dati)
         ├─> B2 presenza + pagina del luogo ──> F2 LuogoPage
         ├─> B3 pin, visore, «Luoghi qui» ──> F3 visore e Area
         ├─> B4 negozi (sede, orari, redirect) ──> F4 negozi e link
         └─> B5 scritture e cestino ──> F5 finestre e moduli
B6 OpenAPI, ricerca, accesso al mondo, test allineati (dopo B2–B5) ──> F6 etichette rimaste e rifinitura
```
B1 e B2–B5 possono andare in parallelo dentro BE, ma B2–B5 si provano sui dati migrati: in pratica B1 si fa per prima o insieme a B2.

## BE

### B0 — Contratti (primo, sblocca FE) · M §3.1, §1.1
- `shared/types.ts`: tutti i DTO del M §3.1 in una volta:
  - `LuogoDto`: `area`, `orari`, `presenza`, `casa`, `pin`, `altriPin`;
  - `LuogoDettaglioDto` (nuovo);
  - `NegozioRiassuntoDto`: `sedeCasa`, `eccezioneOrari`;
  - `SpilloDto`: `notaPin`, `presenza`;
  - `DettaglioSpilloDto`, con `luogo` e `negozio`;
  - `QuartiereDettaglioDto.luoghiDaCollocare`;
  - `AreaDettaglioDto`: `luoghi`, `daPosizionare`, `elementi[].presenza`;
  - `TipoCestino`: + `'luogo' | 'negozio'`.
- `shared/orariNegozio.ts`:
  - `ORARI_REGOLA_APP`;
  - `orari.origine: 'guida' | 'regola-app'`;
  - `descriviOrari` con il testo «Giorno e sera · regola dell'app…» (M §1.1, R5-12c).
- Tipo `PresenzaLuogo = { sbloccato: boolean | null; aperto: boolean | null; testo: string }`.
- **Si prova**: typecheck verde. FE può importare i tipi.

### B1 — Migrazione M5 · M §1.1–§1.3
- File: `server/db/migrations/<n>_luoghi_fonte_unica.ts` + test, `server/index.ts`.
- Colonne: `luogo.area_chiave`, `luogo.orari_json`, `negozio.eccezione_orari_json`, `luogo.solo_eventi_confidente`.
- Ricostruzione del cestino, con `luogo` e `negozio` nel CHECK.
- Passi del M §1.2:
  - luogo → area (42);
  - orari sul luogo, con le aggiunte di G-029 e la Chiesa di Kanda senza i giorni di Hifumi;
  - 4 eccezioni di negozio, nessuna per il Leblanc;
  - sede di `prossimo-asso`;
  - 11 pin omonimi seed;
  - Sakura Residence `solo_eventi_confidente = 'futaba'`.
- Le condizioni di sblocco dei luoghi sono di L6 (M §4.1 di L6). Se L5 va prima di L6, le scrive la M5 con la stessa tabella (M, nota in testa).
- **Si prova** (Test no-reg, sulla copia 0440Z):
  - conteggi del M §1.3;
  - idempotenza;
  - nessun pin dell'utente cambiato;
  - impronta di riferimento `ff3033cb…` (base 0503Z), salvo i cambi elencati.

### B2 — Presenza e pagina del luogo · M §2, §3.2 prima riga, §3.3
- File:
  - `server/services/luoghiService.ts` (nuovo): `presenzaDelLuogo`, `dettaglioLuogo`;
  - `cittaService.ts`: `luogoDto` e `dettaglioQuartiere.luoghiDaCollocare`;
  - `server/routes/compendio.ts`: `GET /api/compendio/luoghi/:quartiere/:luogo?partita=`;
  - `server/schemas/luoghi.ts`.
- La presenza usa la condizione effettiva (L6, se c'è; altrimenti le condizioni di oggi) e l'ambito d'orario giusto (R5-12b).
- **Si prova**:
  - M §6.1 test 2 (`presenzaDelLuogo`) e test 3 (le viste concordi: per ora carta e pagina);
  - Test funzionali: R5-04 su carta e pagina, Leblanc «giorno e sera», Chiesa di Kanda senza Hifumi, Clinica di giorno.
- **Sblocca F2.**

### B3 — Pin, visore, «Luoghi qui» · M §2 (regola di navigazione), §3.1 `SpilloDto`, §4.2 (lettori da L2)
- `mappeService.ts`:
  - `dettagliSpillo`: nome e descrizione dal luogo, `notaPin`, `presenza` (via `conNegozioVivo`);
  - `dettaglioRiferimento`: tutti i negozi della sede, presenza, `casa`.
- `areeService.ts`:
  - `elementi[].presenza`;
  - voci dei pin agganciati a un negozio di un altro quartiere segnalate (`daRivedere: 'negozio-altro-quartiere'`);
  - `luoghi`, `daPosizionare`.
- Regola: luogo chiuso o non sbloccato nascosto nei menu e in «Luoghi qui». Eccezione: lo spillo chiesto, evidenziato con il motivo.
  `solo_eventi_confidente` sempre fuori dai menu.
- **Si prova**:
  - M §6.1 test 4 e 5: Fioraio Sukebe (pin 210) di giorno nascosto, ma con `?spillo=210` evidenziato; Untouchable dopo la M5 sempre aperto
    (i suoi giorni erano di Iwai); «Cinema» → «Videonoleggio Scarlet» con nota;
  - test 3 completo (anche il popup);
  - Test funzionali: un'area con un luogo a orario vero in una fascia di chiusura, con lo stesso numero in visore e «Luoghi qui» (i «21 su 24» di
    Central Street di oggi cambiano dopo la M5: rimisurare).
- **Sblocca F3.**

### B4 — Negozi: sede, orari, redirect · M §3.1 `NegozioRiassuntoDto`, §3.2 ultima riga
- `negoziService.ts`:
  - `riassunto` e `dettaglioNegozio` con gli orari della sede più l'eccezione;
  - `disponibilitaArticolo` con la presenza della sede.
- `GET /api/compendio/negozi/:chiave` con `sedeCasa`.
- **Si prova**: M §6.1 test 6 e 9; acquisti di p1 (7) invariati (no-reg).
- **Sblocca F4.**

### B5 — Scritture e cestino · M §3.2 (posiziona, area, catalogo, DELETE), §3.3
- `luoghiService.ts`: `posizionaLuogo`, `collocaLuogo`, eliminazione con `conCestino` e `registraRipristinoCestino('luogo'|'negozio')`.
- `catalogoService.ts`: campi `orari`, `area`, `sblocco`, `confidenti`, `piatti`, `eccezioneOrari`; `staccaDalleMappe`; `eliminaElemento`.
- `cestinoService.ts`: `RADICE`, `ETICHETTE`.
- Rotte:
  - `server/routes/luoghi.ts` (nuova, in `ROUTER_DI_AREA`): `POST /api/luoghi/posiziona`, `PUT /api/luoghi/:q/:l/area`;
  - `server/routes/catalogo.ts`: DELETE con conferma (per luogo e negozio solo eliminazione nel cestino) e `POST /:tipo/:chiave/ripristina`
    (nuova, per tutti i tipi; `ripristinaElemento` separato da `eliminaElemento`, M §3.2);
  - `server/schemas/catalogo.ts`: `datiLuogo`, `datiNegozio`.
- **Si prova**: M §6.1 test 7 e 8; Test funzionali R5-18 e R5-21 con una partita di prova, i cui dati si puliscono alla fine.
- **Sblocca F5.**

### B6 — Resto del server · M §3.2 (OpenAPI), §3.3
- `accessoMondoService.ts`; `cercaRiferimenti` («Quartiere › Area › Luogo»).
- OpenAPI: `compendio.ts`, `catalogo.ts`, `luoghi.ts` (nuova); `struttura-server.test.ts`.
- Allineamento dei test esistenti, M §6.1 test 10.
- **Si prova**: `openapi.test.ts`; Test no-reg su tutto il pacchetto di B1–B5.

## FE

### F1 — Basi (subito dopo B0, non aspetta altro) · M §5 FE 1, §4.4b
- `src/services/api/luoghi.ts` e il barrel.
- `src/utils/citta.ts`: `urlLuogo`.
- `src/utils/cestino.ts`: «Luogo», «Negozio».
- `src/router.tsx`: `guida/luogo/:quartiere/:luogo`, con una pagina vuota che mostra «Caricamento…» finché F2 non c'è.
- Estrazioni senza cambi di comportamento:
  - `src/components/negozi/ListinoNegozio.tsx`, da `NegozioPage`;
  - `src/components/guida/moduli/CampoOrari.tsx`, da `ModuloNegozio.tsx:77-122`.
- Etichette che non dipendono dal server (M §4.4b): M1 `HomePage.tsx:143`, M2 `OggiMappa.tsx:62`, M9 «Modifica planimetria» / «Modifica
  illustrazione», M14 `accessoMondo.ts:46`.
- **Si prova**:
  - `NegozioPage` identica a prima (no-reg di layout e funzioni);
  - test FE delle estrazioni;
  - nessun «Mappa» nelle quattro etichette.

### F1b — Home senza riquadro chiuso (LAY5-1, decisione del PM; nessuna dipendenza da BE) · M §4.4c
- File: `src/pages/HomePage.tsx` (136-153), `src/tailwind.css` (classi `home`, `home-oggi`, `home-mappa`, regola `@media (min-height: 800px)`),
  e `OggiGuida`/`OggiMappa` solo per la prop `riempi`.
- Alle altezze realistiche e sotto i 768 px la Home scorre come pagina: «Oggi» cresce con il suo contenuto e la mappa ha un'altezza propria,
  `sticky` da 1024 px. Solo da 800 px di altezza e 1024 di larghezza resta l'area interna, alta almeno 400 px, e la pagina non scorre.
- **Si prova** (Test layout, LAY5-1): a 1366×657, 1280×689 e 1024×690 nessun riquadro scorrevole sotto i 200 px; a 1920×1080 e 1440×900
  l'area interna è di almeno 400 px e la pagina è ferma; a 768 e 375 la pagina scorre; mai due barre insieme. Test UX: la guida di «Oggi» si
  legge dal tablet in gioco.

### F2 — Pagina del luogo (dopo B2) · M §4.1
- File: `src/pages/LuogoPage.tsx`, `LuogoPage.test.tsx`.
- Contenuti:
  - intestazione con presenza;
  - orari: regola dell'app, eccezioni dei negozi;
  - sblocco generato («dopo l'invito di …», R5-20e);
  - negozi con `ListinoNegozio`;
  - Confidenti, attività, piatti;
  - «Dove si trova»;
  - Sakura Residence: «Ci si va solo durante gli eventi di Futaba».
- **Si prova**:
  - Test funzionali e UX sulla pagina di Untouchable (regola dell'app), Fioraio Sukebe (chiuso di giorno), Leblanc, i distributori di Akihabara
    (6 negozi) e un luogo senza pin;
  - Test layout a 1280, 768, 375, 1366×657, 1280×689 e 1024×690.

### F3 — Visore, «Luoghi qui», editor dei pin (dopo B3) · M §2, §4.2 (lettori da L2), §4.4 editor
- File: `src/components/mappe/VisoreMappa.tsx`, `src/pages/AreaPage.tsx`, `src/pages/EditorMappaPage.tsx`.
- `VisoreMappa.tsx`:
  - il popup e la scheda del pin di un luogo portano alla pagina del luogo, con il nome del luogo al posto di «scheda del quartiere» (T5);
  - `notaPin`;
  - spillo chiesto evidenziato «Non disponibile adesso».
- `AreaPage.tsx`:
  - «Luoghi qui»: presenza, chiusi nascosti, interruttore «Mostra anche i non ancora disponibili» condiviso col visore;
  - chip «Da rivedere · negozio di un altro quartiere»;
  - «Scheda» → `urlLuogo`;
  - «Da posizionare (N)».
- `EditorMappaPage.tsx`: «Nome e descrizione vengono dal luogo», «Togli la nota», «Sposta nel luogo».
- **Si prova**:
  - Test funzionali: Central Street al 06-01, con interruttore spento e acceso;
  - «Sulla mappa» delle 18 voci negozio del validato;
  - Test UX dal telefono.

### F4 — Negozi e link verso il luogo (dopo B4) · M §4.2
- `NegozioPage.tsx`: redirect a `sedeCasa#negozio-<k>`; i 3 senza sede restano.
- `NegoziPage.tsx`: «Dove» dalla sede.
- `QuartierePage.tsx`: carte, «· 3 negozi», «Luoghi da collocare (N)».
- `DoveSiTrova.tsx`: «Apri in <posto>», con Untouchable → Central Street spillo 1517 (M22, UX2-11).
- Tutti i link a `urlLuogo`: `AttivitaPage`, `LibriPage`, `FilmPage`, `VideogiochiPage`, `ConfidenteDettaglioPage`, `OggettiPage` (M24),
  `ProgressiPartita`, `sezioniGuida`, `utils/accessoMondo.ts`, `utils/percorso.ts`.
- Etichette M23 (`PartiAzione.tsx:55-56`) e M25: il nome del posto.
- **Si prova**:
  - Test funzionali dei percorsi U1–U9 (M §6.3);
  - verifica sul DOM: nessun «atlante» e nessun «Mappa» come nome di un posto;
  - Test no-reg: «Dove si trova» di libri, film e attività.

### F5 — Finestre e moduli (dopo B5) · M §4.4
- `src/components/mappe/FinestraAggiungiLuogo.tsx` (nuova): «Aggiungi luogo» e «Posiziona».
- Finestra «Colloca»; «Elimina luogo/negozio» con il riepilogo del 409.
- `ModuloLuogo.tsx`, con `CampoOrari`, area, sblocco, Confidenti e piatti.
- `ModuloNegozio.tsx`: solo `eccezioneOrari`.
- «Ripristina i valori della guida» in `ModuloCatalogo` chiama `POST /api/catalogo/:tipo/:chiave/ripristina` per tutti i tipi; «Elimina» di un
  luogo o negozio chiama `DELETE …?conferma=1` (cestino), mai più lo stesso `DELETE` per due gesti.
- Tutte le finestre su `Modal`, a foglio sotto i 768 px (regola di L2).
- **Si prova**: Test funzionali R5-18 e R5-21 con la partita di prova; Test layout delle finestre a 375 e 1280.

### F6 — Rifinitura (dopo B6)
- Le righe del M §4.4b ancora aperte; test FE allineati (M §6.2); typecheck, lint.
- **Si prova**: Test UX completi (M §6.4); Test layout (M §6.6).

## Per i tester: cosa provare e quando
| Pronto | Funzionali | UX | No-reg | Layout |
|---|---|---|---|---|
| B1 | — | — | conteggi, impronta, pin dell'utente | — |
| B2 + F2 | R5-04 (carta e pagina), orari dei 4 ambiti | pagina del luogo in gioco | — | pagina del luogo |
| B3 + F3 | visore, «Luoghi qui», `?spillo=` | chiuso e «Non disponibile adesso» | pin del mondo | Area e popup |
| B4 + F4 | percorsi U1–U9, redirect | diario → negozio in un tocco | acquisti, listini, «Dove si trova» | elenco negozi |
| B5 + F5 | R5-18, R5-21 (partita di prova) | finestre | cestino | finestre a 375 e 1280 |
| B6 + F6 | tutto il M §6.3 | tutto il M §6.4 | tutto il M §6.5 | tutto il M §6.6 |
