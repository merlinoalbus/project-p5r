# L7 «Oggetti» — piano di lavoro per BE e FE

Autore: Stesura modifiche, 2026-10-20. Il *cosa* sta in `lotti/L7/modifiche.md`, che qui chiamo «M» (con § e righe). Questo file dice **in che ordine**,
**chi** fa cosa, le dipendenze e cosa si prova appena un pezzo è pronto. **Si comincia solo col via del Manager.**
- Dati di riferimento: la copia più recente in `dati-produzione/`, oggi la base `p5s-2026-10-20-0533Z`. Analisi dati rimisura su questa base le
  cifre del M (catalogo, legami certi, proposte, forzieri).
- L7 legge dagli altri lotti:
  - da L4: Palazzo «concluso», voci col loro stato, pin forziere;
  - da L5: luogo e negozio con la sede, `sedeCasa`, `presenzaDelLuogo`, set dei distributori;
  - da L6: le condizioni per chiave, il valutatore e il tipo `articolo`.

I riferimenti di riga di `server/` e `src/` toccati da L2–L4 sono aggiornati nella tabella del §9 di `lotti/L7/app.md` (Analisi app, sul codice di oggi):
in caso di differenza vale quella. Il testo `dettagli.contenuto` dei forzieri e il legame `voce_oggetto` restano separati (M §5.1).

Regole del piano (come L5 e L6):
- **contratti prima**: il pezzo B0 esce per primo;
- **nessun file toccato da due ruoli**: BE lavora su `server/` e `shared/`, FE su `src/`;
- ogni pezzo chiude con typecheck e lint verdi e con i suoi test mirati;
- quando un pezzo è pronto, BE manda a FE e ai tester un messaggio diretto: «L7 · Bn pronto su <porta>».

## Mappa delle dipendenze
```
B0 catalogo e DTO ─┬─> F1 basi FE (API, rotta, ricerca nel catalogo dentro ModuloArticolo) — subito
                   ├─> B1 migrazione M7 (catalogo, legami certi, proposte, scambi, distributori) ──> (no-reg acquisti, listini, letture)
                   ├─> B2 catalogo in lettura e pagina dell'oggetto ──> F2 OggettoPage e catalogo unico (OggettiPage)
                   ├─> B3 nomi e prezzi dal catalogo in tutte le letture ──> F3 link verso l'oggetto (listini, regali, forzieri, Richieste, popup)
                   ├─> B4 proposte e fusioni ──> F4 «Abbinamenti da approvare»
                   └─> B5 regali per chiave, scritture e cestino dell'oggetto ──> F5 moduli e regali
B6 OpenAPI, test allineati ──> F6 rifinitura
```

## BE

### B0 — Contratti (primo) · M §1.1, §4
- `shared/catalogo.ts` (nuovo):
  - le categorie con il nome italiano e il gruppo;
  - `chiaveCatalogo(categoria, nome)`;
  - la regola dei nomi di R7-03b: con le due forme si mostra l'estesa, e l'abbreviata va fra i nomi altri.
- `shared/types.ts`:
  - `CatalogoOggettoDto` e `OggettoDettaglioDto`, con `forzieri[].stato: 'preso' | 'non-piu-ottenibile' | 'da-prendere'`;
  - `ArticoloDto.catalogo` e `ArticoloDto.costo`;
  - `RegaloConfidenteDto.catalogo`, `PuntoInteresseDto.contenuto`, `RichiestaDto.ricompense`;
  - `LibroDto`, `FilmDto`, `VideogiocoDto`: `catalogo`;
  - `PropostaAbbinamentoDto`;
  - `TipoCestino` con `'oggetto'`.
- **Si prova**: typecheck.

### B1 — Migrazione M7 · M §1.2, §2
- `server/db/migrations/<n>_catalogo_oggetti.ts` (gioco) e la migrazione utente per `regalo_partita.catalogo_chiave`, con i test e `index.ts`.
- Tabelle e colonne: `catalogo_oggetto`, `articolo.catalogo_chiave`/`costo_json`, `confidente_regalo.catalogo_chiave`, `voce_oggetto`,
  `ricompensa_oggetto`, `ricetta_materiale`, `proposta_abbinamento`, `negozio_luogo_extra` (set dei distributori, M §8.10). Cestino con
  `oggetto`.
- Passi del M §2:
  - il catalogo, con l'equipaggiamento dei listini promosso a oggetti propri (G-024);
  - i legami certi;
  - le proposte, dal file di Analisi dati;
  - gli scambi di Jose (37) e di Sakai (16 finestre, G-031);
  - le condizioni degli articoli: si **controllano** quelle che ci sono già (Katsu a pezzettoni) e si scrivono solo quelle che mancano;
  - la Chiesa di Kanda a 14.000/12.000, col valore di prima in `seed_json`;
  - **G-034**:
    - Tanaka: solo proposte, applicate col sì dall'elenco «Da rivedere»: 10 da nascondere, 10 da abbinare (Homunculus a 5.000) e 8 nuovi.
      Il listino resta di 20 finché l'utente non dice sì, poi è di 18;
    - Sciabola del rischio come ricompensa dello «Zio ingordo»;
    - Modellino di moto a 4.800, e «Set di mascotte locali» a 3.600 se manca;
    - si creano dalla guida gli oggetti dei forzieri e delle ricompense «non trovati».
- Le voci di Kamoshida e Madarame non ricevono `voce_oggetto`: i loro forzieri restano proposte.
- **Si prova**:
  - Test no-reg:
    - conteggi del M §2 («Verifiche prima/dopo») sulla base 0533Z;
    - nessun articolo, voce o acquisto cambiato;
    - acquisti, letture e punti negozio della partita reale invariati;
    - impronta di riferimento della base in uso;
  - idempotenza.

### B2 — Catalogo e pagina dell'oggetto · M §4, §5.1, §5.2
- `server/services/catalogoOggettiService.ts` (nuovo):
  - catalogo con la ricerca su nomi e nomi altri;
  - dettaglio dell'oggetto: dove si compra, con presenza e disponibilità di L5 e L6; a chi piace; dove si trova, con i forzieri e il loro
    stato calcolato dal **pin forziere** (M §5.1); ricompense, scambi, ricette, lettura.
- Rotte (`server/routes/catalogoOggetti.ts`, nuova):
  - `GET /api/catalogo-oggetti?categoria=&q=&partita=`;
  - `GET /api/catalogo-oggetti/:categoria/:slug`.
- **Si prova**:
  - M §7.1 test 3 (prezzi da più negozi);
  - forzieri: Kamoshida p1 tutti «presi», un forziere non preso su una partita di prova con il Palazzo concluso → «Non più ottenibile»;
  - Seme mancante → «Si compra da Jose».
- **Sblocca F2.**

### B3 — Nomi e prezzi dal catalogo ovunque · M §3
- `negoziService.articoloDto` e la ricerca; `attivitaService` (libri, film, videogiochi); `compendioService` (oggetti della guida);
  `richiesteService`; `dungeonService` (contenuto delle voci); `suggerimentiService`; `condizioni/nomiCondizioni.ts`.
- Si tolgono `oggettiSelezionabili.ts` e il doppione `OggettoSelezionabileDto`.
- **Si prova**:
  - M §7.1 test 2: rinominare un oggetto cambia listino, ricerca, condizioni e popup; un articolo non collegato tiene il suo nome;
  - test 7: letture, effetti e condizioni `lettura` invariati;
  - lo storico già scritto resta com'è.
- **Sblocca F3.**

### B4 — Proposte e fusioni · M §4 (proposte), §5.4
- Rotte:
  - `GET /api/catalogo-oggetti/proposte`;
  - `POST …/proposte/conferma` (con la fusione: gli articoli del secondo oggetto passano al primo, che va nel cestino);
  - `POST …/proposte/scarta`;
  - `PUT /api/catalogo-oggetti/legami`.
- Le proposte dei forzieri di Kamoshida e Madarame si confermano anche dalla voce.
- **Si prova**: M §7.1 test 4 (conferma, fusione con ripristino dal cestino, scarta, «scegli un altro»), con una partita di prova i cui dati si
  puliscono alla fine.
- **Sblocca F4.**

### B5 — Regali per chiave, scritture, cestino · M §4, §1.2
- `partiteService` (326-338): i regali si registrano per chiave, e il nome resta accettato per compatibilità. `RIFERIMENTI_PARTITE`.
- Catalogo: `POST`, `PUT` e `DELETE` nel cestino; «Ripristina» con `POST …/ripristina`, come in L5.
- `catalogoService.ts`: `ModuloArticolo` non copia più il nome quando l'articolo ha il catalogo.
- **Si prova**: M §7.1 test 5 e 8.
- **Sblocca F5.**

### B6 — Chiusura
- OpenAPI di `catalogoOggetti`, `compendio` e `partite`.
- Test esistenti allineati (M §7.1 test 9).
- **Si prova**: `openapi.test.ts`; Test no-reg completo del M §7.5.

## FE

### F1 — Basi (subito dopo B0) · M §6 FE 1–2
- `src/services/api/catalogoOggetti.ts` e il barrel.
- `src/router.tsx`: `guida/oggetto/:categoria/:slug`.
- Componente di ricerca nel catalogo, che riusano `ModuloArticolo`, la scelta del regalo e «Scegli un altro oggetto».
- **Si prova**: typecheck e test del componente di ricerca (nome e nomi altri).

### F2 — Pagina dell'oggetto e catalogo (dopo B2) · M §5.1, §5.2
- `OggettoPage.tsx` (nuova), con le sezioni nell'ordine del M §5.1. «Dove si compra» viene per prima su telefono.
- Forzieri con il loro stato: «Preso», «Non più ottenibile», «Da prendere»; «Si compra da Jose».
- `OggettiPage.tsx` diventa il catalogo unico, con ricerca, chip dei gruppi, ordinamento e le sezioni di oggi.
- **Si prova**:
  - Test funzionali: Medicina, un regalo, un libro, un'arma;
  - Test UX dal telefono: dove si compra oggi e a chi regalarlo (R7-24, R7-25);
  - Test layout a 1280, 768, 375, 1366×657 e 1280×689.

### F3 — Link verso l'oggetto (dopo B3) · M §5.3
- `src/components/guida/ArticoliTabella.tsx` (righe aggiornate in `app.md` §9), i regali del Confidente, il contenuto dei forzieri in `GuidaDellArea`, `RichiestePage`, `CovoPage`, la merce nel
  popup del pin (`VisoreMappa.tsx`).
- `LibriPage`, `FilmPage`, `VideogiochiPage`: il nome porta alla pagina dell'oggetto e l'avanzamento resta com'è.
- **Si prova**: Test funzionali, ogni link porta alla pagina giusta; Test no-reg, gli avanzamenti di libri e film sono invariati (62 + 22).

### F4 — Abbinamenti da approvare (dopo B4) · M §5.4
- `components/catalogo/AbbinamentiDaApprovare.tsx` (nuovo), nel catalogo (chip «Da approvare · N») e in Impostazioni.
- Il chip «Contenuto: proposta» in `GuidaDellArea` sulle voci di Kamoshida e Madarame.
- **Si prova**: Test funzionali con la partita di prova (conferma, scarta, scegli un altro, fusione e ripristino); Test UX delle proposte una per
  una dal tablet.

### F5 — Moduli e regali (dopo B5)
- `ModuloArticolo`: la scelta dell'oggetto dal catalogo, senza copiare il nome.
- `ModuloCatalogo`: «Ripristina» con `POST …/ripristina`.
- Il regalo si sceglie per chiave nella pagina del Confidente e in quella dell'oggetto.
- **Si prova**: M §7.1 test 5 visto dalla pagina; Test funzionali «segnare un regalo».

### F6 — Rifinitura (dopo B6)
- Testi del M §5.5: «Oggetto» è la cosa, e «Articolo» non compare più nell'interfaccia.
- Test FE del M §7.2.
- **Si prova**: tutto il M §7.4 e il M §7.6.

## Per i tester: cosa provare e quando
| Pronto | Funzionali | UX | No-reg | Layout |
|---|---|---|---|---|
| B0 + F1 | — | — | — | — |
| B1 | — | — | conteggi sulla base 0533Z; acquisti, listini e letture invariati | — |
| B2 + F2 | pagina dell'oggetto (Medicina, regalo, libro, arma); forzieri e loro stato | dove si compra e a chi piace, dal telefono | — | pagina dell'oggetto e catalogo |
| B3 + F3 | nomi e prezzi ovunque; link verso l'oggetto | — | avanzamenti di libri e film, storico invariato | listini |
| B4 + F4 | proposte e fusioni (partita di prova) | proposte una per una | testi dei forzieri di Kamoshida e Madarame invariati | elenco delle proposte |
| B5 + F5 | regali per chiave; cestino dell'oggetto | — | regali della partita reale | moduli |
| B6 + F6 | tutto il M §7.3 | tutto il M §7.4 | tutto il M §7.5 | tutto il M §7.6 |
