# L8 «Persona e Ombre» — piano di lavoro per BE e FE

Autore: Stesura modifiche, 2026-10-20. Il *cosa* sta in `lotti/L8/modifiche.md`, abbreviato «M» (§ e righe); questo file dice **in che ordine**,
**chi** fa cosa, le dipendenze e cosa si prova appena un pezzo è pronto. **Si comincia solo col via del Manager.**
Dati di riferimento: la copia più recente in `dati-produzione/` (oggi la base `p5s-2026-10-20-0533Z`). Analisi dati rimisura su questa base le
cifre del M §6: Ombre, voci con Ombra, negoziazione.
L8 legge da altri lotti:
- da L3: le aree dei Palazzi;
- da L4: Palazzo «concluso» e `regola_boss` (Iweleth è `memento`);
- da L6: il valutatore.
Il file dei dati della M8b è `guida/G-025-persona-del-gruppo.json`: BE lo porta in `server/db/migrations/dati/` con l'attribuzione in `NOTICE`.

Regole del piano (come L5–L7):
- **contratti prima**: B0 esce per primo;
- **nessun file toccato da due ruoli**: BE lavora su `server/` e `shared/`, FE su `src/`;
- ogni pezzo chiude con typecheck e lint verdi e con i suoi test mirati;
- quando un pezzo è pronto, BE avvisa direttamente FE e i tester con «L8 · Bn pronto su <porta>».

## Mappa delle dipendenze
```
B0 tipi, elementi e DTO ─┬─> F1 nomi degli elementi in tutta l'interfaccia (shared/elementi.ts) — subito
                         ├─> B1 migrazione M8 (Ombre, luoghi, voci, affinità proprie, nomi degli elementi) ──> (no-reg Memento, compendio)
                         ├─> B2 Ombre in lettura e pagina Ombra ──> F2 OmbraPage, Battaglia «Ombre», scheda Persona
                         ├─> B3 registraPersona: una strada di cattura ──> F3 piastrella di cattura nei Palazzi, Battaglia, dedali
                         ├─> B4 negoziazione (M8 passi 5–6, G-021) ──> F4 Negoziazione per umore / per Ombra
                         ├─> B5 Persona del party (M8b, G-025) ──> F5 compendio «Del party», personaggi
                         └─> B6 Iweleth come dedalo ──> F6 Iweleth fuori dai Palazzi, archivio nel dedalo
B7 OpenAPI, test allineati ──> F7 rifinitura
```

## BE

### B0 — Contratti (primo) · M §1.3, §4
- `shared/elementi.ts` (nuovo): chiavi e nomi unici di elementi, tipi ed esiti secondo G-025 (Psicocinesi, Maledizione, Divino, Recupero,
  Elettricità, Riflette).
- `shared/maschere.ts`: la funzione unica per normalizzare le maschere.
- `shared/types.ts`:
  - `OmbraDto`, con `affinita[].proprie` e `dove`;
  - `OmbraDettaglioDto.incontri[].raggiungibile`;
  - `PersonaDettaglioDto` con `doveSiIncontra`, `ombre`, `registrata`, `delParty`, `personaggio`, `forma`, `formaDi`;
  - `PuntoInteresseDto.ombra`;
  - `NegoziazioneDto`;
  - `TipoCestino` con `'ombra'`.
- **Si prova**: typecheck.

### B1 — Migrazione M8 · M §6 passi 1–4 e la parte elementi del passo 7, §1.1, §1.3
- `server/db/migrations/<n>_ombre.ts` + test.
- Schema:
  - tabelle `ombra` e `ombra_luogo`;
  - vista `ombra_luogo_dedali`;
  - colonne `punto_interesse.ombra_chiave`, `persona.del_party`/`personaggio`/`forma`/`forma_di`/`forma_condizioni_json`,
    `persona_skill.modo`;
  - cestino con `ombra`.
- Ombre:
  - dalla Battaglia, unite alle voci dei Memento e dei Palazzi; i casi non sicuri vanno in elenco;
  - `ombra_chiave` su 131 + 38 voci, di cui 9 di Iweleth;
  - affinità proprie solo per gli elementi diversi: **5** non reclutabili e le 4 eccezioni di G-019. Il compendio resta com'è;
  - Kaneshiro, G-035: «Fango pulsante» e «Maestra degli scherzi» sono reclutabili. Dove ci sono due nomi italiani vale quello della guida.
- Nomi degli elementi: si correggono 13 righe di `traduzione`. I testi liberi non si toccano: le voci boss di Madarame scritte dall'utente con
  «Gelo» e «respinge» vanno nell'elenco «Da rivedere».
- **Si prova** (Test no-reg):
  - conteggi del M §6 sulla base 0533Z;
  - `compendio_partita` e `persona_posseduta` invariati;
  - **risposta API di `mementos` identica**, salvo i campi in più;
  - impronta di riferimento, con le 2 voci di Kamoshida intatte.

### B2 — Ombre e pagina Ombra · M §4, §5 (Pagina Ombra, Battaglia «Ombre», scheda Persona)
- `server/services/ombreService.ts` (nuovo):
  - elenco e dettaglio, con le affinità dal compendio più le proprie;
  - «dove si incontra» dall'unione delle fonti;
  - «Dove resta catturabile», cioè gli incontri in Palazzi conclusi «non più raggiungibili», con Iweleth secondo la regola dei Memento.
- Rotte: `GET /api/compendio/ombre`, `GET /api/compendio/ombre/:chiave`, `PUT …/:chiave` con «Ripristina», e il cestino.
- `BattagliaDto.ombre` non porta più le stringhe delle debolezze. `PersonaDettaglioDto.doveSiIncontra`.
- **Si prova**:
  - correggere un'affinità nel compendio cambia Ombra, dedalo e Battaglia (R8-10);
  - le 4 eccezioni;
  - un'Ombra di Kamoshida su p1 (Palazzo concluso) → «Non più raggiungibile», con «Dove si cattura ancora».
- **Sblocca F2.**

### B3 — Una strada di cattura · M §2
- `server/services/catturePersona.ts`: `registraPersona` per Memento, Palazzo, Battaglia, CompendioPersonale, scorta e fusione. Non azzera
  livello, bonus e abilità quando la riga esiste (`partiteService.aggiornaCompendio`).
- `PUT /api/partite/:id/compendio/:personaId` passa da qui.
- Le voci Persona dei Palazzi con `ombra_chiave` non scrivono più `punto_partita`. Le 2 voci di Kamoshida restano come sono.
- **Si prova**: la stessa cattura dalle quattro strade dà lo stesso esito; togliere la registrazione la toglie ovunque (R8-14), con una partita di
  prova.
- **Sblocca F3.**

### B4 — Negoziazione · M §1.4, §6 passi 5–6
- Migrazione:
  - dati dal file originale, più Royal da G-021 (allegato e copie di lavoro dell'Esperto);
  - tabelle `negoziazione_domanda`, `negoziazione_risposta`, `negoziazione_verdetto`, `negoziazione_umore`, con `testo_origine`;
  - personalità delle 75 Ombre.
- Rotte: `GET /api/compendio/negoziazione` e `GET …/negoziazione/verifica`, con il rapporto allegato a `be.md`.
- **Si prova**:
  - i 642 verdetti di oggi ci sono tutti (86 come «altra fonte»);
  - le 24 contraddizioni hanno entrambe le righe;
  - +979 esiti di Royal, 53 «solo P5», circa 274 domande;
  - domande senza risposta buona: circa 10.
- **Sblocca F4.**

### B5 — Persona del party · M §1.2, §6 passo 7 (M8b)
- La migrazione M8b legge `server/db/migrations/dati/persona-del-gruppo.json` e scrive:
  - 27 righe di `persona` (9 catene), con `forma` e `forma_di`;
  - le affinità: 1ª e 2ª forma, e la 3ª uguale alla 2ª;
  - le skill per `modo`;
  - le condizioni delle forme: Ervardo con un `avviso`, mai `manuale`;
  - le 6 traduzioni dei nomi.
- `personaFondibili()` esclude `del_party = 1` da fusione, ricette, cicli, Isolamento e Stanza di Velluto.
- **Si prova**:
  - M §7 BE, la parte M8b: 27 forme, 88 skill trovate, arresto su una skill tolta in un test;
  - nessuna Persona del party nelle fusioni.
- **Sblocca F5.**

### B6 — Iweleth come dedalo · M §3
- Le 9 voci Persona prendono l'Ombra del dedalo, e lo stato è uno solo.
- Iweleth esce dall'elenco dei Palazzi, dalla metro e dalle viste dei Palazzi. `/guida/dungeon/iweleth` porta al dedalo.
- L'«Archivio del Palazzo di Iweleth» è in sola lettura.
- Le 38 voci con tipi non ammessi vanno nell'elenco.
- La riga `dungeon iweleth` resta, con `regola_boss = 'memento'` di L4.
- **Si prova**: catturare Lilith nel dedalo la mostra catturata nell'archivio (R8-16); Test no-reg, Memento identici.
- **Sblocca F6.**

### B7 — Chiusura
- OpenAPI di ombre, negoziazione e compendio.
- Test esistenti allineati (M §7 BE: `battaglia`, `memento-persona-trama`, `aree-dei-dedali`, `condizioni-voce`, `api`, `squadra`,
  `operazioniVelluto`, `fusione`, `cicli`, `dungeon`, `personaggi`, `maschere`, migrazioni 019/083/101).
- **Si prova**: `openapi.test.ts`; Test no-reg completo.

## FE

### F1 — Nomi degli elementi (subito dopo B0) · M §1.3, R8-20c
- `CompendioPage.tsx:33`, `BattagliaPage.tsx:63`, `AffinitaGriglia` e i filtri «Debole a» leggono `shared/elementi.ts`.
- `src/utils/elementiGuida.ts` resta solo per leggere i testi vecchi.
- **Si prova**: verifica sul DOM che nessun testo visibile contenga «Tuono», «Gelo», «respinge», «Psichico», «Oscurità», «Quasi-divino» o
  «Guarigione», salvo i testi dell'utente che restano com'erano.

### F2 — Pagina Ombra, Battaglia, scheda Persona (dopo B2) · M §5
- `src/pages/OmbraPage.tsx` (nuova): Persona con la piastrella, debolezze con la nota se proprie, «dove si incontra», «Dove resta catturabile»,
  personalità con il link alla negoziazione.
- `BattagliaPage`: le carte «Ombre» portano alla pagina Ombra.
- `PersonaDettaglioPage`: «Dove si incontra», «Ombre», «Registrata».
- `RichiestePage`: debolezze del bersaglio prese dal compendio.
- **Si prova**:
  - Test funzionali «nessuna debolezza ricopiata»;
  - Test UX, dall'Ombra alle debolezze in due tocchi (R8-28);
  - Test layout della pagina Ombra: piastrelle ≥ 88 px.

### F3 — Piastrella di cattura (dopo B3) · M §2, §5
- `PersoneDellArea` riusato in `GuidaDellArea` per le voci Persona dei Palazzi.
- La piastrella nella Battaglia e nei dedali, dove porta anche alla pagina Ombra.
- **Si prova**: Test funzionali con la partita di prova: catturare in un Palazzo, nei Memento e in Battaglia la registra ovunque, e togliere la
  registrazione la toglie ovunque.

### F4 — Negoziazione (dopo B4) · M §5 Battaglia
- In cima la scelta «Umore» oppure «Ombra», con `trattoIniziale`.
- La ricerca della domanda.
- Per ogni risposta il verdetto per l'umore scelto, con «incerto», la fonte e le due fonti se discordanti.
- La lista «Ombre di questo umore».
- Il segno «resa, non testo del gioco».
- **Si prova**: Test UX, dalla domanda alla risposta in due tocchi dal telefono (R8-07f); Test funzionali, dall'Ombra al verdetto.

### F5 — Compendio e personaggi (dopo B5) · M §1.2, §5
- Nel compendio:
  - le Persona del party col segno «Del party» e un filtro, senza azioni di fusione;
  - le forme 2 e 3 con «Livello: quello raggiunto da <1ª forma>» e le statistiche nascoste.
- `PersonaDelPersonaggio` e `PersonaggiPage` cercano le Persona per chiave.
- **Si prova**: Test funzionali: le 9 catene, i nomi italiani (Ecate, Mercurio, Ioanna, Prometeo, Ervardo, Cenerentola), nessuna nelle
  fusioni.

### F6 — Iweleth (dopo B6) · M §3
- `DungeonPage.tsx`, `collocazioneTokyo.ts:145`, `src/utils/palazzi.ts`, `sezioniGuida.tsx:26` e `MappaMemento.tsx:54`: Iweleth non c'è più fra i
  Palazzi.
- La sezione chiusa «Archivio del Palazzo di Iweleth» nella pagina del dedalo.
- **Si prova**: Test no-reg Memento (API e pagine identiche); Test funzionali per `/guida/dungeon/iweleth` e l'archivio.

### F7 — Rifinitura (dopo B7)
- I test FE del M §7 FE.
- **Si prova**: tutto il M §7 UX e Layout (pagina Ombra, Negoziazione, Battaglia, scheda Persona a 1280, 768, 375, 1366×657 e 1280×689).

## Per i tester: cosa provare e quando
| Pronto | Funzionali | UX | No-reg | Layout |
|---|---|---|---|---|
| B0 + F1 | nomi degli elementi ovunque | — | testi dell'utente invariati | — |
| B1 | — | — | conteggi sulla base 0533Z, compendio, Memento (API identica), impronta | — |
| B2 + F2 | pagina Ombra, debolezze dal compendio, «Dove resta catturabile» | Ombra → debolezze in due tocchi | Battaglia | pagina Ombra |
| B3 + F3 | una strada di cattura (partita di prova) | cattura in un tocco | compendio della partita reale (53/7) | piastrelle |
| B4 + F4 | negoziazione dall'Ombra al verdetto | domanda → risposta in due tocchi | i 642 verdetti di oggi | Negoziazione |
| B5 + F5 | Persona del party, mai nelle fusioni | — | fusioni, cicli, Stanza di Velluto (R8-26) | compendio |
| B6 + F6 | Iweleth come dedalo, archivio | — | Memento identici | dedalo di Iweleth |
| B7 + F7 | tutto il M §7 | tutto | tutto | tutto |
