# L11 «Pulizia e ricerca» — piano di lavoro per BE e FE

Autore: Stesura modifiche, 2026-10-20. Il *cosa* sta in `lotti/L11/modifiche.md` («M», con § e righe). Questo file dice **in che ordine**, **chi**
fa cosa, le dipendenze e cosa si prova per ogni pezzo. **Si comincia solo col via del Manager e dopo la consegna di L10**: l'elenco di cosa
eliminare dipende da tutti i lotti prima (M §1.1).

Dati di riferimento: la copia più recente in `dati-produzione/`, oggi la base `p5s-2026-10-20-0533Z`, con 110 tabelle, 816 colonne e 74 colonne
costanti (M §1).

Regole del piano (come L5–L10):
- **Contratti prima.**
- **Nessun file toccato da due ruoli.**
- Ogni pezzo chiude con typecheck e lint verdi e con i suoi test mirati.
- Quando un pezzo è pronto, BE avvisa direttamente FE e i tester con «L11 · Bn pronto su <porta>».
- **Niente si elimina senza la prova che nessuno lo legge**, e senza impronte identiche prima e dopo.

## Mappa delle dipendenze
```
B0 DTO (ricerca, gerarchia, «Da rivedere», registro del ripristino) ─┬─> F1 basi FE (pulsante «Cerca», scorciatoia «/», rotte)
                                                                     ├─> B1 inventario dei lettori (con Analisi dati e Analisi app) ──> B2 migrazione di pulizia M11
                                                                     ├─> B3 ricerca globale (indice, sinonimi G-038) ──> F2 RicercaGlobale
                                                                     ├─> B4 gerarchia (E1, E2, E6, E8) ──> F3 «Luoghi della guida» come albero
                                                                     ├─> B5 elenco unico «Da rivedere» ──> F4 pagina «Da rivedere»
                                                                     └─> B6 «Modifica» e «Ripristina» ovunque ──> F5 moduli per ogni oggetto
B2 pulizia del codice (rotte e funzioni morte, migrazioni congelate, DDL utente) ──> F6 pulizia del codice FE
B7 pacchetti vecchi, cestino, OpenAPI, test ──> F7 rifinitura; documenti (scritti dal Manager con i testi di BE e FE)
```

## BE

### B0 — Contratti · M §2, §3, §4
- `shared/types.ts`:
  - `RisultatoRicercaDto` `{ tipo, chiave, nome, nomiAltri, percorso, casa, immagine, stato? }`; lo stato vale per i luoghi chiusi (R11-10b) e
    per le aree «da verificare»;
  - `NodoGerarchiaDto` `{ tipo, chiave, nome, casa, immagine, conteggi, conteggiPin, figli }`;
  - `ElementoDaRivedereDto` `{ tipo, chiave, titolo, motivo, proposta?, gesti[], casa }`;
  - `CorrezioneDto`.
- **Si prova**: typecheck.

### B1 — Inventario dei lettori · M §1.1 passi 1–3, §1.1 2b
- Analisi dati rigenera `inventario-*.md` sulla base dopo L10. Analisi app lo incrocia con i lettori del codice. Il risultato è
  `lotti/L11/inventario-lettori.md`, con la decisione per ogni tabella o colonna.
- Ci rientrano le fonti vecchie del M §1.1 2b:
  - le righe di `spillo_partita` dei pin condivisi da rigenerabili;
  - `bossFinali`/`eBossFinale`;
  - le frasi di sblocco dei quartieri;
  - i nomi vecchi degli elementi;
  - le copie degli orari;
  - `requisito_partita`.
- BE controlla l'elenco col codice. Lo approva il Manager.
- **Si prova**: l'elenco ha 0 lettori per ogni riga «elimina» (grep e test).

### B2 — Pulizia · M §1.1 passi 4–7, §1.3
- **Prima di togliere i servizi**: migrazioni congelate per la 027, la 038 e la 042, in `server/db/migrations/congelati/`.
- **Migrazione M11**:
  - `DROP` della tabella o ricostruzione senza la colonna, per ogni riga «elimina»;
  - impronte identiche prima e dopo;
  - le righe di stato (`spillo_partita`, `punto_partita`) solo con il confronto p1/p2 senza differenze.
- **Codice morto**: rotte, funzioni, DTO e campi (M §1.1 passo 6), con le loro descrizioni OpenAPI.
- **DDL utente allineato** (`schemaUtente.ts`).
- Test delle strutture tolte: si aggiornano o si dichiarano superati, **mai cancellati**.
- **Si prova** (Test no-reg):
  - base vecchia migrata da zero fino a M11;
  - impronte del diario, dei Palazzi e del mondo identiche;
  - correzioni dell'utente tutte presenti.

### B3 — Ricerca globale · M §2
- `server/services/ricercaService.ts`:
  - un indice in memoria, svuotato da `invalidaCacheDiGioco`;
  - tutti i tipi del M §2, con i nomi altri;
  - i **sinonimi di G-038** (blocco `dati_guida.sinonimi-ricerca`): nomi in codice, Persona del gruppo in inglese, varianti di grafia,
    abbreviazioni, Palazzo di Sae e Palazzo sconosciuto;
  - i luoghi chiusi con lo stato;
  - i nascosti esclusi;
  - solo nomi e titoli.
- Rotta `GET /api/ricerca`.
- **Si prova**:
  - per ogni tipo, ogni oggetto si trova per nome e porta a una casa esistente (R11-09);
  - «Queen» trova Makoto, «Palazzo di Sae» trova Niijima;
  - nessun «Mappa» o «atlante» nei risultati.
- **Sblocca F2.**

### B4 — Gerarchia · M §3
- `GET /api/mappe/gerarchia`: Tokyo › Quartieri › Aree › Planimetrie, più le «Aree della città»; Tokyo › Palazzi › Aree e Infiltrazioni;
  **Memento** › Dedali (Iweleth compreso, E8) › Aree; «Da collocare».
- Conteggi:
  - **E1**: si contano le cose, non le righe;
  - **E2**: `conteggiPin` di L3;
  - **E6**: un pin conta una volta per oggetto, non per versione.
- **Si prova**:
  - conteggi di Tokyo, Shibuya, Madarame e Memento;
  - E6 su un'Area con più versioni (il Covo, il Sottopasso), confrontato a mano;
  - Iweleth sotto il Memento.
- **Sblocca F3.**

### B5 — Elenco unico «Da rivedere» · M §2 (R11-10c)
- `GET /api/da-rivedere?partita=`: un fornitore per ogni tipo, con i gesti delle pagine d'origine e le stesse rotte. Le sorgenti sono quelle del M:
  - voci del diario `da_rivedere` (L3, L10, G-037);
  - proposte d'infiltrazione e di effetto;
  - divergenze;
  - aree e dati «da verificare»;
  - proposte di abbinamento (L7, con Tanaka);
  - «Boss finale da dichiarare» (L4);
  - nomi da rinominare (E9: Museo, 1P e 2P);
  - note sui pin (811);
  - Makoto (a)/(b);
  - voci boss di Madarame con «Gelo» e «respinge», con il motivo di G-038;
  - voci `igor` → Gemelle (4);
  - Sakura Residence;
  - il negozio delle «Pagine ammuffite»;
  - pin 1584 e 1769, set C.
- **Si prova**: ogni gesto dall'elenco ha lo stesso esito che nella sua pagina; il contatore va a 0 quando l'elenco è chiuso.
- **Sblocca F4.**

### B6 — «Modifica» e «Ripristina» ovunque · M §4
- `server/services/ripristinoService.ts`: il registro, `correggi` e `ripristina`.
- `correzione_dati_guida` per i blocchi JSON: personaggi, sfide, completamento e sinonimi.
- Gli oggetti che non hanno ancora «Modifica» e «Ripristina» (M §4). Le correzioni restano dopo un aggiornamento del pacchetto.
- **Si prova**: per ogni tipo, correggi → ripristina; correzione → import del pacchetto → la correzione c'è ancora (R11-16); l'elenco di
  verifica consegnato.
- **Sblocca F5.**

### B7 — Pacchetti, cestino, OpenAPI · M §1.2, §5
- Un pacchetto vecchio si importa e il riepilogo dice cosa è stato scartato.
- Cestino con le «saltate» `colonna-rimossa` e `tabella-rimossa`.
- OpenAPI: solo le rotte che esistono.
- **Si prova**: M §6.1 test 2, 3 e 7.

## FE

### F1 — Basi (subito dopo B0)
- Pulsante «Cerca» nella barra superiore e in quella inferiore, scorciatoia `/`.
- Rotte `/guida/da-rivedere` e `/guida/mappe` (titolo «Luoghi della guida»).
- Contatore «Da rivedere» nella barra.
- **Si prova**: typecheck; la scorciatoia `/` apre la ricerca.

### F2 — Ricerca (dopo B3) · M §2
- `RicercaGlobale`:
  - a tutto schermo su telefono, pannello da 1024 px;
  - risultati raggruppati per tipo, con immagine e percorso;
  - stato «Chiuso adesso» e chip «Da verificare»;
  - indietro torna dov'eri, e la partita resta.
- **Si prova**:
  - Test UX dal telefono: un tocco, tre lettere, la pagina, poi indietro (R11-25);
  - Test layout a 375 e 1280.

### F3 — Albero dei luoghi (dopo B4) · M §3
- `MappaPage` › `IndiceMappe` come albero:
  - rami chiusi oltre il quartiere o il Palazzo;
  - miniature e conteggi (E1, E2, E6);
  - ogni nodo porta alla sua casa;
  - Memento con Iweleth;
  - scorrimento proprio con confine evidente.
- Si tolgono `AlberoLuoghi` e `radiciRaggruppate`.
- Testi M27 e M29.
- **Si prova**: Test UX con l'albero leggibile (R11-26); Test layout dello scorrimento annidato; Test funzionali: ogni nodo apre la sua casa.

### F4 — Pagina «Da rivedere» (dopo B5)
- Elenco per tipo, con i gesti della pagina d'origine e il link.
- **Si prova**: Test funzionali, un gesto per tipo su dati di prova; Test UX.

### F5 — Moduli (dopo B6) · M §4
- `ModuloCatalogo` come forma unica, per tutti gli oggetti del registro.
- «Creato da te: non c'è un valore della guida» per gli oggetti nati nell'app.
- **Si prova**: test dei moduli nuovi (Persona, skill, personaggi, sfide, trofei, ranghi delle Doti).

### F6 — Pulizia del codice FE (dopo B2)
- Componenti e funzioni senza lettori (`useRisolviAsset` se nessuno la usa; `impostaLettura`).
- Typecheck e lint senza import orfani.
- **Si prova**: build, lint.

### F7 — Rifinitura (dopo B7)
- Test FE del M §6.2.
- **Si prova**: tutto il M §6.4 e il M §6.6.

## Per i tester: cosa provare e quando
| Pronto | Funzionali | UX | No-reg | Layout |
|---|---|---|---|---|
| B0 + F1 | — | «Cerca» sempre a portata | — | barra con «Cerca» |
| B1 + B2 | — | — | impronte identiche, base vecchia migrata, correzioni dell'utente presenti | — |
| B3 + F2 | ogni oggetto si trova; sinonimi | tre lettere e la pagina | — | ricerca a 375 e 1280 |
| B4 + F3 | albero e conteggi (E1/E2/E6/E8) | albero leggibile | — | scorrimento dell'albero |
| B5 + F4 | gesti dall'elenco = gesti della pagina | elenco chiaro | nessuna scrittura senza gesto | pagina «Da rivedere» |
| B6 + F5 | correggi, ripristina, import | moduli uniformi | correzioni dopo l'import | moduli |
| B7 + F7 | pacchetto vecchio, cestino | — | tutto il M §6.5 | tutto il M §6.6 |
