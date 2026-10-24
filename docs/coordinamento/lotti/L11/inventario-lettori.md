# Inventario dei lettori — L11 R11-01/1 e R11-17/1 (rigenerato sullo schema che esce dalla catena attuale)

> Rigenerato il 2026-10-24 (sera). **Base del codice**: commit `1895f963` (ramo `newreview`), letto da un `git archive` di quel commit (le modifiche non ancora committate di altre sessioni NON sono nel conteggio: tutti i `file:riga` valgono a quel commit). **Schema**: catena di `server/db/migrations/index.ts` fino alla **213** (gioco) e di `server/db/migrazioniUtente/index.ts` fino alla **43** (partite), applicata con `runMigrations` (via `initDb`, `DATA_DIR` sulla copia) a una COPIA di `data/` (mai su `data/`; la copia sta nello scratchpad e viene scartata). Sostituisce la versione `b6b04975` (ferma a gioco 174 / partite 40, prima delle migrazioni 175–213).
> **Dati misurati**: la copia di `data/` del worktree (gioco partito da 136, partite da 28, portati allo schema corrente): righe gioco 31.016, partite 3.202. Sono i dati di sviluppo del worktree, **non** la copia p5s: i conteggi di righe e di «non vuote» servono a leggere la struttura, non sono i dati dell'utente. **Scostamento della copia dallo schema canonico**: nella copia `utente.effetto_applicato` non ha la colonna `assorbita_da` (il DDL della 028 fu modificato il 21/10, commit `814b17d8`, dopo che la copia era arrivata alla 28; nessuna migrazione la aggiunge a una base già a 28) e il codice la usa (`motoreDiario.ts:352,360`, `propostePartitaService.ts:172,283`). Una base creata dalla catena da zero (`pacchetto/gioco.db` + migrazioni, provata in scratchpad) l'ha: lo schema canonico è quindi 1.376 colonne, la copia ne misura 1.375; la riga `assorbita_da` è aggiunta a mano in §5. Strumenti di misura nello scratchpad (non nel repository): `schema.cjs`, `scan2.cjs`, `emit3.cjs`, `dup.cjs`, `tolte2.cjs`, `blocchi.cjs`; ripetibili su una copia portata allo schema corrente.
> **Stato di consegna**: R11-01/1 è un inventario del codice di oggi, non il finale: altri drop di L11 sono ancora da fare e altre sessioni committano di continuo (nel corso di questa misura la base è passata da 205 a 213 e `persona`, `skill` e `confidente_regalo` hanno guadagnato le colonne di Ripristino). Va rigenerato a fine L11 (B19) come già previsto.

## 0. Come si legge

**Schema.** Tutte le tabelle e le colonne vengono dalla catena di migrazioni applicata (`PRAGMA table_info` su `main` e `utente`), non dal grep: 172 tabelle (108 gioco, 64 partite), 1.376 colonne canoniche (892 + 484; la copia ne misura 1.375, vedi sopra), 1 vista (`ombra_luogo_dedalo`).

**Lettori.** Un lettore è un'istruzione SQL, in un letterale di stringa di `server/`, `shared/` o `scripts/` (non test, non migrazioni), che nomina la tabella in `FROM`/`JOIN`. Per le colonne, è la stessa istruzione che nomina la colonna (con l'alias della tabella, oppure senza alias quando la parola non è ambigua; in un'istruzione con più tabelle che hanno la stessa colonna, per esempio `chiave`, la parola vale per tutte). Il file è dato come `file:riga`, con la riga della parola nell'istruzione. Prefissi: nessuno = `server/services/`; `r:` = `server/routes/`; `sh:` = `shared/`; `db:` = `server/db/`; `sc:` = `scripts/`; `srv:` = altro in `server/`. Esclusi dai lettori di colonna (DTO e DDL, non lettori): `server/schemas/`, `server/openapi/`, `shared/types.ts`, `server/db/schemaUtente.ts`, `server/db/fontiTolte.ts`.

**Scrittori.** `INSERT [OR …] INTO`, `REPLACE INTO`, `UPDATE`, `DELETE FROM` della tabella nelle stesse condizioni; una colonna è «scritta» se compare nell'istruzione di scrittura (prima del `WHERE`).

**Segni nelle righe di §4 e §5** (`colonna|non vuote|primo lettore +altri|FE|M|stato|fonte`):
- `non vuote`: `=` tutte le righe hanno un valore (non NULL, non vuoto, non `[]`, non `{}`, non `0`); `0` nessuna; un numero altrimenti. Per le colonne BLOB conta i non NULL. Una tabella con 0 righe mostra `0`.
- `primo lettore +n`: il primo lettore in ordine di nome di file (non quello più importante) e il numero di **altri file** lettori. Il segno `*` dopo la riga = lettura con `SELECT *`, con `alias.*` o con elenco di colonne in una costante (`SELECT ${COLONNE} FROM …`): la colonna è letta solo «in blocco». `—` = nessun lettore.
- `FE`: numero di file di `src/` (non test) che nominano la colonna in snake_case o camelCase. È un conteggio per nome, non una prova di rendering; per i nomi comuni (`chiave`, `nome`, `ordine`) è rumore.
- `M`: numero di file di migrazione che nominano la colonna e che leggono o scrivono la tabella (migrazioni congelate: non contano come lettori di prodotto; l'elenco per tabella è in §3).
- `stato` (vuoto = **viva**, cioè ha almeno un lettore): `senza lettore`; `solo scritta` (scritta ma mai letta); `copia` (duplica un altro dato, con la fonte nella casella dopo); le colonne e tabelle **tolte** sono in §2 (non esistono più nello schema).
- `fonte` (fonte unica): vuota = la colonna è la fonte del proprio dato; `>t.c` = riferimento dichiarato (chiave esterna) a `t.c`, la cui riga è la fonte; `copia di …` = la fonte è l'altra colonna.

**Limiti dichiarati.**
1. Il metodo vede le istruzioni SQL scritte come letterali. Per le istruzioni con il nome della tabella parametrico (`FROM ${tabella}`) le tabelle candidate sono state lette a mano nei 20 file elencati in §0.1: se un'altra tabella passa per quegli stessi punti non è vista. Le istruzioni generiche per nome (cestino: `cestinoService.ts:516-712`, `mappe/fotografiaLuogoDaPin.ts:141`, `mappe/precondizioneRimozionePin.ts:34`, esportazione e importazione del pacchetto, `tabelleDi`/`conteggiTabelle`) non contano come lettori di prodotto.
2. Un SQL costruito unendo più letterali, o con le colonne in una variabile non costante, può non essere visto (falsi «senza lettore»: ogni colonna di §6 è stata riletta a mano, vedi la motivazione).
3. I lettori che usano `SELECT *` o un elenco in costante valgono `*`: provano che la tabella è letta, non quale proprietà della riga il codice usi.
4. L'uguaglianza «copia» è provata dai dati della copia con SQL (`a IS NOT b` = 0 righe), non semanticamente; non copre i dati denormalizzati in JSON.
5. Il FE è cercato solo per nome. Nessun dato personale: le chiavi citate sono chiavi di guida.

### 0.1 SQL parametrico: i punti risolti a mano

| file | tabelle candidate |
|---|---|
| `catalogoService.ts` | negozio, articolo, libro, film, attivita, luogo, domanda, cruciverba (`TABELLA[tipo]`) |
| `azioniStrutturateService.ts`, `catalogoOggettiLetture.ts:56`, `suggerimentiService.ts:211` | libro, film, attivita |
| `catalogoOggettiFusione.ts`, `catalogoOggettiProposte.ts` | voce_oggetto, ricompensa_oggetto, ricetta_materiale, punto_interesse, catalogo_oggetto |
| `catalogoOggettiRiferimenti.ts` | oggetto, libro, film, attivita, articolo, proposta_abbinamento |
| `condizioni/valutatore.ts:80` | persona, skill |
| `dungeonService.ts:708-712` | dungeon_area, area_dedalo |
| `invitiScritture.ts` (`TABELLE_CON_CONDIZIONI`), `richiesteService.ts:245-260` | quartiere, luogo, area, negozio, articolo, attivita, libro, film, spillo, copia_pezzo, confidente_invito |
| `luoghiScritture.ts:124` | luogo, negozio |
| `mappe/accessoMondoService.ts:20-40,124` | mappa, quartiere, dungeon, dungeon_area, luogo, negozio, punto_interesse, confidente, articolo, attivita |
| `mappe/legamiInfiltrazioni.ts:163-170` | voce_infiltrazione, proposta_infiltrazione_voce |
| `mappe/pezziMappa.ts:227` | pezzo_mappa, copia_pezzo |
| `requisitiConfidentiService.ts:68-71` | confidente_requisito, confidente_requisito_guida |
| `ripristinoService.ts:140-155,435` | quartiere, trofeo, dote_sociale, trasformazione_oggetto, evento_calendario, allerta_meteo, ombra, esame (`DEFINIZIONI_RIGA`) |
| `acquistiService.ts:222,227` | da_applicare, effetto_applicato, movimento_yen, acquisto_operazione, proposta_operazione, beneficio_ciclo |
| `mappe/fotografiaLuogoDaPin.ts:141` | spillo_partita, spillo_partita_infiltrazione, divergenza_partita |
| `pescaLetture.ts:107` | le 18 tabelle di `pescaLetture.ts:103` |

## 1. Riepilogo

| | gioco | partite | totale |
|---|---:|---:|---:|
| tabelle | 108 | 64 | 172 |
| colonne (schema canonico) | 892 | 484 | 1.376 |
| righe (copia di sviluppo) | 31.016 | 3.202 | 34.218 |
| colonne **vive** (almeno un lettore) | 844 (di cui 247 solo `*`) | 467 (di cui 156 solo `*`) | 1.311 |
| colonne **solo scritte** (nessun lettore) | 8 | 14 | 22 |
| colonne **senza lettore** (né scritte) | 40 | 3 | 43 |
| colonne **copia** dichiarate (incluse nelle vive) | 8 | 0 | 8 |
| tabelle senza alcun lettore di prodotto | 3 | 1 | 4 |

Le **4 tabelle senza lettore di prodotto**: `audit_aojiru_136` e `audit_pesca_138` (storia delle bonifiche 136 e 138, nessuno scrittore), `infiltrazione_dedalo` (12 righe, creata dalla 166 e popolata dalla 175: **nessun lettore né scrittore di prodotto**, vedi §6), `requisito_partita` (partite, 0 righe, solo 3 `DELETE` di pulizia in `requisitiConfidentiService.ts:50,116,131`). Le colonne senza lettore e solo scritte sono tutte in §6, con il motivo.

**Differenze di struttura rispetto alla versione `b6b04975`**: −10 tabelle (`giorno_calendario`, `giorno_percorso`, `guida_mappa`, `mappa_entita`, `marcatore_luogo`, `marcatore_mappa`, `organizzazione_mappa_esito`, `pianta_area`, `lettura_partita` e `pianta_quartiere` dalla 210, che nella versione precedente era viva) e +7 tabelle (`correzione_dati_guida` 178, `dedalo_confluenza` 175, `infiltrazione_dedalo` 175, `mappa_dedalo` 175, `voce_confluenza` 175, `punti_confidente_generazione` e `punti_confidente_voce`, utente 041). Il dettaglio è in §10.

## 2. Strutture tolte (registro `server/db/fontiTolte.ts`)

27 voci: 10 tabelle e 17 colonne. **Nessuna esiste più nello schema ricostruito** (controllo: `PRAGMA table_info` e `sqlite_master` della copia migrata). Nel codice vivo (`server/`, `shared/`, `scripts/`; esclusi test, migrazioni, `fontiTolte.ts` e il DDL storico di `schemaUtente.ts`) nessuna istruzione SQL nomina più una colonna tolta; nove delle dieci tabelle tolte sono ancora citate, quasi tutte come etichette del cestino:

| struttura tolta | quando | fonte unica oggi | residuo nel codice vivo |
|---|---|---|---|
| gioco.marcatore_mappa | 176 | i pin della guida (schede `spillo`) | etichetta del cestino `cestinoService.ts:112` |
| gioco.marcatore_luogo | 176 | i pin dei luoghi sulla mappa del quartiere | etichetta `cestinoService.ts:135` |
| gioco.pianta_area | 176 | le planimetrie delle infiltrazioni | etichetta `cestinoService.ts:117` |
| gioco.mappa.entita_tipo, entita_chiave | 177 | chiave e tipo della mappa; legami dell'Area con le infiltrazioni | nessuno |
| gioco.mappa_entita | 177 | legami Area↔infiltrazioni, planimetria predefinita dell'Area, chiave della mappa | etichetta `cestinoService.ts:114`; descrizione OpenAPI `openapi/descrizioni/mappe.ts:87` |
| gioco.mappa_presentazione.gruppo_immagini_json | 177 | Area della planimetria e versione della mappa | nessuno |
| gioco.guida_mappa | 177 | nome e descrizione dell'infiltrazione (`dungeon_area`) | etichetta `cestinoService.ts:118` |
| gioco.organizzazione_mappa_esito | 177 | niente (conversione conclusa) | nessuno |
| gioco.luogo.giorni, giorni_json | 184 | `orari_json` e disponibilità dei Confidenti | nessuno (le parole `giorni` restano nei DTO/OpenAPI con altro senso) |
| gioco.negozio.orari, sblocco | 184 | orari del luogo-sede; condizioni dell'offerta | nessuno |
| gioco.luogo.negozio, attivita_json | 187 | `negozio.sede_chiave`, `attivita.sede_chiave` | nessuno |
| gioco.articolo.condizione | 187 | `articolo.condizioni_json` | nessuno |
| gioco.quartiere.sblocco | 188 | `quartiere.condizioni_json` con gli inviti dei Confidenti | nessuno |
| gioco.giorno_calendario | 189 | `giorno` (tabella unica) | etichetta `cestinoService.ts:147` |
| gioco.giorno_percorso | 189 | `giorno` e le voci del Diario | etichetta `cestinoService.ts:147`; **lettura SQL viva** `db/conversioneEffettiAzione.ts:90` (`SELECT data, azioni_json FROM giorno_percorso`): il file è importato solo dalle migrazioni 086, 089 e utente 007, 008 (eseguite sullo schema vecchio); se richiamato su uno schema corrente fallirebbe: da isolare quando si congelano |
| gioco.luogo.quando | 193 | `orari_json` | nessuno |
| gioco.articolo.disponibile_dal | 194 | `condizioni_json` (la data mostrata è generata) | nessuno |
| gioco.attivita.altri_effetti, regole, premi, paga | 203 | `dettagli` e gli effetti strutturati; `paga_yen`, `paga_massima` | nessuno |
| gioco.pianta_quartiere | 210 | l'immagine dell'illustrazione del quartiere nel DB (o la grafica `mappe/citta-…`) | etichetta `cestinoService.ts:148` |
| partite.lettura_partita | utente 43 | `progresso_libro_partita`, `progresso_film_partita` | DDL storico `db/schemaUtente.ts:21`; etichetta `cestinoService.ts:146` |

**Dopo la misura** (commit `b287a7ae`): `partite.requisito_partita` (utente 44) è stata tolta, con voce in `FONTI_TOLTE`; l'etichetta del cestino resta. Le tabelle di partite diventano 63 e le colonne canoniche 1.370.

Le etichette del cestino restano per regola (danno il nome leggibile alle righe saltate). Gli archivi dove sono finiti i valori sono blocchi di `dati_guida` (§7).

## 3. Tabelle

Riga per tabella. `L` = primo e secondo file lettore (+altri), `S` = primo e secondo file scrittore; `M r/w` = migrazioni che leggono / scrivono la tabella (nomi dei file in `server/db/migrations` e `migrazioniUtente`); `vista` = viste che la leggono. Per le tabelle di cui il SQL è parametrico il lettore/scrittore è quello del punto risolto in §0.1.

| s | tabella | righe | col | L (lettori) | S (scrittori) | M r/w | vista |
|---|---|---:|---:|---|---|---|---|
| g | allerta_meteo | 74 | 8 | r:condizioni.ts:64; condizioni/nomiCondizioni.ts:46 (+4) | ripristino/righeCalendario.ts:112; ripristinoService.ts:153 | 2/1 |  |
| g | arcana | 24 | 3 | compendioService.ts:199; fusione/fusioneService.ts:74 (+2) | — | 1/1 |  |
| g | area | 140 | 13 | catalogoService.ts:235; cittaService.ts:139 (+15) | mappe/areeService.ts:348; mappe/legamiInfiltrazioni.ts:135 (+1) | 10/3 |  |
| g | area_dedalo | 95 | 6 | condizioni/nomiCondizioni.ts:113; dungeonService.ts:104 (+5) | dungeonService.ts:712 | 5/3 | ombra_luogo_dedalo |
| g | articolo | 650 | 25 | db:acquistiLegacy.ts:89; r:condizioni.ts:65 (+28) | catalogoOggettiFusione.ts:72; catalogoOggettiProposte.ts:150 (+3) | 22/21 |  |
| g | attivita | 30 | 29 | db:conversioneEffettiAzione.ts:86; r:condizioni.ts:57 (+27) | catalogoOggettiRiferimenti.ts:8; catalogoService.ts:147 (+1) | 9/14 |  |
| g | audit_aojiru_136 | 1 | 9 | — | — | 1/1 |  |
| g | audit_pesca_138 | 1 | 10 | — | — | 1/1 |  |
| g | catalogo_oggetto | 1299 | 15 | acquistiService.ts:81; azioniStrutturateService.ts:30 (+16) | catalogoOggettiFusione.ts:226; catalogoOggettiProposte.ts:210 (+1) | 14/7 |  |
| g | cestino | 5 | 11 | cestinoService.ts:348; mappe/fotografiaLuogoDaPin.ts:108 (+2) | cestinoService.ts:313; sc:genera-pacchetto.ts:63 | 27/11 |  |
| g | confidente | 23 | 4 | azioniStrutturateService.ts:102; catalogoOggettiProposte.ts:59 (+27) | — | 12/1 |  |
| g | confidente_abilita | 159 | 5 | compendioService.ts:470; confidentiScritture.ts:77 | confidentiScritture.ts:96 | 0/1 |  |
| g | confidente_dialogo | 223 | 7 | compendioService.ts:471; confidentiScritture.ts:142 (+1) | confidentiScritture.ts:165 | 1/2 |  |
| g | confidente_disponibilita | 23 | 16 | compendioService.ts:492; disponibilitaConfidentiService.ts:54 (+2) | disponibilitaConfidentiService.ts:183; disponibilitaStrutturataScritture.ts:47 | 2/4 |  |
| g | confidente_dote_incontro | 39 | 3 | confidentiScritture.ts:120; dotiIncontroConfidente.ts:8 (+1) | compendioService.ts:459; confidentiScritture.ts:130 | 3/3 |  |
| g | confidente_invito | 6 | 11 | condizioni/condizioneEffettiva.ts:25; condizioni/nomiCondizioni.ts:64 (+2) | invitiScritture.ts:116 | 3/2 |  |
| g | confidente_rango | 207 | 5 | confidentiScritture.ts:39; partiteService.ts:267 | confidentiScritture.ts:56 | 1/3 |  |
| g | confidente_regalo | 144 | 12 | catalogoOggettiProposte.ts:59; catalogoOggettiService.ts:103 (+7) | catalogoOggettiFusione.ts:216; catalogoOggettiProposte.ts:190 (+2) | 5/4 |  |
| g | confidente_requisito | 177 | 6 | calendarioFonti.ts:43; disponibilitaStrutturataService.ts:61 (+4) | requisitiConfidentiService.ts:42 | 3/4 |  |
| g | confidente_requisito_guida | 177 | 6 | requisitiConfidentiService.ts:70 | — | 1/1 |  |
| g | copia_pezzo | 42 | 12 | invitiScritture.ts:47; mappe/pezziMappa.ts:111 | mappe/pezziMappa.ts:191; pacchetto/pacchettoGioco.ts:221 | 0/1 |  |
| g | correzione_dati_guida | 0 | 5 | datiGuida.ts:56; ripristinoService.ts:303 | ripristinoService.ts:350 | 0/1 |  |
| g | cruciverba | 38 | 11 | catalogoService.ts:103; cruciverbaService.ts:29 (+1) | catalogoService.ts:147 | 2/2 |  |
| g | dati_guida | 53 | 2 | attivitaService.ts:344; catalogoOggettiLetture.ts:107 (+9) | atterraggioPalazziService.ts:127; catalogoOggettiRiferimenti.ts:17 (+4) | 35/47 |  |
| g | decisione_tanaka | 1 | 9 | tanakaStatoListino.ts:41 | — | 1/2 |  |
| g | decisione_tanaka_ripristino | 0 | 4 | tanakaStatoListino.ts:43 | — | 0/1 |  |
| g | dedalo_confluenza | 1 | 3 | dungeonService.ts:121; mappe/gerarchiaMappe.ts:42 (+1) | — | 0/1 |  |
| g | dlc_set | 13 | 2 | compendioService.ts:253 | — | 0/1 |  |
| g | dlc_set_persona | 25 | 2 | compendioService.ts:255; fusione/motoreFusione.ts:73 | — | 0/1 |  |
| g | domanda | 78 | 15 | catalogoService.ts:103; domandeService.ts:36 (+4) | catalogoService.ts:147 | 8/3 |  |
| g | dote_sociale | 5 | 6 | azioniStrutturateService.ts:112; compendioService.ts:222 (+5) | ripristino/righe.ts:155; ripristinoService.ts:153 | 1/2 |  |
| g | dote_sociale_rango | 25 | 4 | partiteService.ts:192; ripristino/righe.ts:137 | ripristino/righe.ts:157 | 1/2 |  |
| g | dungeon | 10 | 18 | atterraggioPalazziService.ts:39; azioniStrutturateService.ts:105 (+19) | atterraggioPalazziService.ts:116; dungeonService.ts:567 | 16/6 |  |
| g | dungeon_area | 100 | 5 | apertureDedaliService.ts:16; catalogoOggettiService.ts:53 (+19) | dungeonService.ts:633 | 19/3 | ombra_luogo_dedalo |
| g | dungeon_atterraggio | 3 | 8 | atterraggioPalazziService.ts:55; mappe/mappeService.ts:1978 | atterraggioPalazziService.ts:99; mappe/mappeService.ts:2103 | 0/1 |  |
| g | eredita_matrice | 144 | 3 | compendioService.ts:248; fusione/eredita.ts:74 | — | 0/1 |  |
| g | esame | 4 | 10 | domandeService.ts:38; esamiCollegamento.ts:44 (+5) | ripristino/righeScuola.ts:49; ripristinoService.ts:153 | 7/3 |  |
| g | esame_premi | 1 | 2 | domandeService.ts:68 | — | 1/1 |  |
| g | evento_calendario | 173 | 11 | calendarioService.ts:34; disponibilitaStrutturataService.ts:73 (+2) | ripristino/righeCalendario.ts:57; ripristinoService.ts:153 | 6/6 |  |
| g | evento_calendario_voce | 135 | 3 | calendarioService.ts:21 | — | 3/3 |  |
| g | film | 30 | 21 | db:conversioneEffettiAzione.ts:82; r:condizioni.ts:66 (+13) | catalogoOggettiRiferimenti.ts:8; catalogoService.ts:147 | 5/3 |  |
| g | film_posizione | 42 | 6 | attivitaService.ts:239 | — | 0/1 |  |
| g | fusione_arcana | 273 | 3 | compendioService.ts:240; fusione/motoreFusione.ts:77 | — | 0/1 |  |
| g | fusione_speciale | 24 | 1 | compendioService.ts:241 | — | 0/1 |  |
| g | fusione_speciale_ingrediente | 94 | 3 | compendioService.ts:191; fusione/motoreFusione.ts:84 | — | 0/1 |  |
| g | giorno | 346 | 17 | acquistiService.ts:108; calendarioFonti.ts:47 (+11) | giorniService.ts:53 | 2/1 |  |
| g | guida_alias | 92 | 2 | dungeonService.ts:843; mappe/contenutiGuidaService.ts:44 | — | 2/3 |  |
| g | immagine | 807 | 9 | dungeonService.ts:1061; immaginiService.ts:65 (+10) | dungeonService.ts:1065; immaginiService.ts:128 (+2) | 6/3 |  |
| g | immagine_miniatura | 107 | 9 | miniatureService.ts:104 | miniatureService.ts:131; sc:genera-pacchetto.ts:66 | 0/1 |  |
| g | infiltrazione_area | 105 | 5 | mappe/areeService.ts:514; mappe/contenutiGuidaService.ts:74 (+3) | dungeonService.ts:765; mappe/areeService.ts:632 (+2) | 5/2 |  |
| g | infiltrazione_dedalo | 12 | 2 | — | — | 0/1 |  |
| g | libro | 46 | 22 | db:conversioneEffettiAzione.ts:79; r:condizioni.ts:66 (+13) | catalogoOggettiRiferimenti.ts:8; catalogoService.ts:147 | 7/4 |  |
| g | libro_posizione | 48 | 5 | attivitaService.ts:250 | — | 0/1 |  |
| g | luogo | 106 | 21 | r:condizioni.ts:80; attivitaService.ts:140 (+29) | catalogoService.ts:147; luoghiScritture.ts:71 (+1) | 20/14 |  |
| g | mappa | 317 | 18 | atterraggioPalazziService.ts:89; catalogoOggettiService.ts:60 (+24) | mappe/areeService.ts:334; mappe/immagineMappa.ts:101 (+3) | 18/10 |  |
| g | mappa_alias | 690 | 2 | mappe/mappeService.ts:744; mappe/percorsiMappe.ts:49 (+1) | mappe/mappeService.ts:744; mappe/percorsiMappe.ts:104 (+1) | 3/3 |  |
| g | mappa_dedalo | 26 | 3 | dungeonService.ts:122 | — | 0/1 |  |
| g | mappa_percorso | 317 | 3 | mappe/percorsiMappe.ts:49 | mappe/percorsiMappe.ts:105 | 6/3 |  |
| g | mappa_presentazione | 227 | 2 | mappe/mappeService.ts:125 | mappe/mappeService.ts:1934 | 3/3 |  |
| g | negoziazione_domanda | 270 | 2 | negoziazioneService.ts:40 | — | 0/2 |  |
| g | negoziazione_importazione | 1 | 6 | negoziazioneService.ts:205 | — | 0/2 |  |
| g | negoziazione_risposta | 1522 | 8 | negoziazioneService.ts:42 | — | 0/2 |  |
| g | negoziazione_umore | 4 | 7 | negoziazioneService.ts:96 | — | 0/2 |  |
| g | negoziazione_variante | 507 | 10 | negoziazioneService.ts:41 | — | 0/2 |  |
| g | negoziazione_verdetto | 3970 | 12 | negoziazioneService.ts:43 | — | 0/2 |  |
| g | negozio | 62 | 21 | db:acquistiLegacy.ts:91; r:condizioni.ts:51 (+28) | catalogoService.ts:147; luoghiScritture.ts:140 | 20/16 |  |
| g | negozio_luogo_extra | 4 | 2 | catalogoOggettiLetture.ts:162; listiniCondivisi.ts:31 (+1) | — | 2/3 |  |
| g | negozio_sede_spillo | 4 | 3 | listiniCondivisi.ts:36; mappe/fotografiaLuogoDaPin.ts:183 (+1) | — | 2/3 |  |
| g | nota_storica | 4 | 6 | noteStoricheService.ts:41; tanakaStatoListino.ts:55 | noteStoricheService.ts:59 | 2/3 |  |
| g | nota_storica_legame | 14 | 3 | noteStoricheService.ts:41 | — | 1/3 |  |
| g | oggetto | 223 | 6 | catalogoOggettiLetture.ts:91; catalogoOggettiRiferimenti.ts:25 (+1) | catalogoOggettiRiferimenti.ts:8 | 1/2 |  |
| g | ombra | 131 | 15 | catturePersona.ts:32; negoziazioneService.ts:185 (+3) | ripristino/righeOmbra.ts:77; ripristinoService.ts:153 | 2/3 |  |
| g | ombra_luogo | 247 | 5 | ombreService.ts:122 | — | 2/3 |  |
| g | ombra_voce | 170 | 2 | catturePersona.ts:32; ombreService.ts:186 | — | 2/3 | ombra_luogo_dedalo |
| g | operazione_effetti_voce | 188 | 6 | motoreDiario.ts:456 | motoreDiario.ts:112 | 0/5 |  |
| g | persona | 259 | 33 | r:condizioni.ts:67; affinitaPersonaService.ts:21 (+23) | ripristino/righePersona.ts:66 | 9/3 |  |
| g | persona_affinita | 2590 | 5 | affinitaPersonaService.ts:30; compendioService.ts:127 (+2) | affinitaPersonaService.ts:34 | 2/3 |  |
| g | persona_area_dedalo | 827 | 2 | dungeonService.ts:104; mappe/gerarchiaMappe.ts:123 | dungeonService.ts:927 | 1/1 | ombra_luogo_dedalo |
| g | persona_skill | 2125 | 4 | compendioService.ts:314; fusione/eredita.ts:62 (+3) | ripristino/righePersona.ts:78 | 2/2 |  |
| g | pezzo_mappa | 24 | 10 | mappe/pezziMappa.ts:106; pacchetto/pacchettoGioco.ts:224 | mappe/pezziMappa.ts:192 | 1/1 |  |
| g | proposta_abbinamento | 87 | 12 | catalogoOggettiFusione.ts:107; catalogoOggettiProposte.ts:33 (+2) | catalogoOggettiFusione.ts:157; catalogoOggettiProposte.ts:128 (+2) | 10/8 |  |
| g | proposta_effetto_voce | 20 | 10 | motoreDiario.ts:443 | motoreDiario.ts:466 | 1/2 |  |
| g | proposta_infiltrazione_voce | 102 | 6 | giornataService.ts:244; mappe/legamiInfiltrazioni.ts:164 | giornataService.ts:701; mappe/legamiInfiltrazioni.ts:165 | 2/1 |  |
| g | punto_interesse | 959 | 13 | catalogoOggettiProposte.ts:69; catalogoOggettiService.ts:52 (+20) | catalogoOggettiProposte.ts:210; dungeonService.ts:736 | 21/8 |  |
| g | quartiere | 24 | 13 | r:condizioni.ts:80; attivitaService.ts:136 (+20) | cittaService.ts:83; ripristino/righe.ts:70 (+1) | 12/5 |  |
| g | quartiere_ingresso | 2 | 6 | cittaService.ts:136; mappe/accessoMondoService.ts:70 (+2) | cittaService.ts:148; mappe/areeService.ts:546 (+1) | 3/2 |  |
| g | regola_pesca | 1 | 8 | regolePescaService.ts:8; vincoliAttivitaPesca.ts:15 | regolePescaService.ts:28 | 1/1 |  |
| g | ricetta_materiale | 23 | 3 | catalogoOggettiFusione.ts:23; catalogoOggettiLetture.ts:229 (+3) | catalogoOggettiFusione.ts:38; catalogoOggettiProposte.ts:210 | 1/2 |  |
| g | richiesta | 33 | 16 | azioniStrutturateService.ts:106; condizioni/contestoConversione.ts:50 (+11) | dungeonService.ts:761; richiesteService.ts:106 | 6/4 |  |
| g | ricompensa_oggetto | 171 | 6 | catalogoOggettiFusione.ts:23; catalogoOggettiLetture.ts:214 (+5) | catalogoOggettiFusione.ts:38; catalogoOggettiProposte.ts:154 | 4/3 |  |
| g | settimana_guida | 42 | 6 | calendarioService.ts:54 | — | 0/2 |  |
| g | skill | 525 | 12 | r:condizioni.ts:71; compendioService.ts:98 (+12) | ripristino/righePersona.ts:113 | 3/1 |  |
| g | skill_fonte_esecuzione | 114 | 2 | compendioService.ts:340 | — | 0/1 |  |
| g | spillo | 1912 | 20 | atterraggioPalazziService.ts:58; azioniStrutturateService.ts:81 (+27) | catalogoService.ts:549; dungeonService.ts:755 (+6) | 23/23 |  |
| g | spillo_destinazione | 223 | 6 | dungeonService.ts:1056; mappe/areeService.ts:246 (+5) | dungeonService.ts:1055; mappe/destinazioniSpillo.ts:103 (+1) | 4/2 |  |
| g | spillo_immagine | 0 | 7 | dungeonService.ts:1057; mappe/fotografiaLuogoDaPin.ts:193 (+3) | dungeonService.ts:1071; mappe/mappeService.ts:1449 | 0/1 |  |
| g | spillo_voce | 539 | 2 | dungeonService.ts:143; mappe/accessoMondoService.ts:130 (+8) | dungeonService.ts:1087; mappe/mappeService.ts:1211 | 6/1 |  |
| g | tesoro | 9 | 2 | compendioService.ts:242; fusione/motoreFusione.ts:87 | — | 0/1 |  |
| g | tesoro_modificatore | 216 | 3 | compendioService.ts:244; fusione/motoreFusione.ts:90 | — | 0/1 |  |
| g | traduzione | 2053 | 6 | ripristino/righePersona.ts:95; traduzioniService.ts:34 | ripristino/righePersona.ts:120; traduzioniService.ts:111 | 7/4 |  |
| g | trasformazione_oggetto | 8 | 8 | ripristino/righe.ts:176; ripristinoService.ts:140 (+1) | catalogoOggettiRiferimenti.ts:10; ripristino/righe.ts:188 (+1) | 1/3 |  |
| g | trofeo | 53 | 14 | completamentoService.ts:31; ricerca/indiceRicerca.ts:333 (+2) | ripristino/righe.ts:120; ripristinoService.ts:153 | 1/1 |  |
| g | voce_confluenza | 47 | 8 | dungeonService.ts:124 | — | 1/1 |  |
| g | voce_effetto | 471 | 8 | acquistiService.ts:36; giornataService.ts:206 (+5) | motoreDiario.ts:81 | 6/6 |  |
| g | voce_effetto_transizione | 1004 | 6 | acquistiService.ts:101; motoreDiario.ts:45 | motoreDiario.ts:83 | 5/7 |  |
| g | voce_giornata | 1004 | 20 | r:condizioni.ts:110; acquistiService.ts:37 (+10) | giornataService.ts:378; richiesteService.ts:219 | 26/13 |  |
| g | voce_infiltrazione | 19 | 3 | apertureDedaliService.ts:16; giornataService.ts:238 (+1) | giornataService.ts:360; mappe/legamiInfiltrazioni.ts:165 | 1/2 |  |
| g | voce_oggetto | 152 | 5 | catalogoOggettiFusione.ts:23; catalogoOggettiLetture.ts:199 (+3) | catalogoOggettiFusione.ts:38; catalogoOggettiProposte.ts:210 | 2/2 |  |
| p | acquisto_legacy_associazione | 7 | 3 | db:acquistiLegacy.ts:182 | db:acquistiLegacy.ts:127 | 0/0 |  |
| p | acquisto_legacy_continuita | 1 | 6 | db:acquistiLegacy.ts:136 | db:acquistiLegacy.ts:145 | 0/0 |  |
| p | acquisto_legacy_raccordo | 0 | 4 | db:acquistiLegacy.ts:197 | db:acquistiLegacy.ts:167 | 0/0 |  |
| p | acquisto_legacy_valutazione | 7 | 13 | db:acquistiLegacy.ts:96 | db:acquistiLegacy.ts:105 | 0/0 |  |
| p | acquisto_operazione | 0 | 6 | acquistiService.ts:136; motoreDiario.ts:230 (+1) | acquistiService.ts:145 | 0/1 |  |
| p | acquisto_partita | 7 | 3 | db:acquistiLegacy.ts:86; acquistiService.ts:20 (+5) | acquistiService.ts:212; luoghiScritture.ts:148 (+1) | 0/1 |  |
| p | acquisto_provenienza | 0 | 10 | acquistiService.ts:19; giornataService.ts:186 (+4) | acquistiService.ts:167; partiteService.ts:162 | 1/1 |  |
| p | acquisto_registrato | 0 | 12 | db:acquistiLegacy.ts:162; acquistiService.ts:18 (+4) | acquistiService.ts:162 | 0/1 |  |
| p | attivita_svolta_partita | 8 | 4 | r:condizioni.ts:114; attivitaService.ts:543 (+2) | attivitaService.ts:548 | 0/1 |  |
| p | beneficio_ciclo | 0 | 9 | acquistiService.ts:222; pescaLetture.ts:107 (+1) | propostePartitaService.ts:214 | 0/1 |  |
| p | cestino_partite | 0 | 10 | db:acquistiLegacy.ts:242; cestinoService.ts:350 (+2) | cestinoService.ts:309 | 0/2 |  |
| p | ciclo_salvato | 0 | 11 | cicliSalvatiService.ts:18 | cicliSalvatiService.ts:101 | 0/1 |  |
| p | compendio_partita | 53 | 19 | catturePersona.ts:80; cicliSalvatiService.ts:36 (+4) | effettiDiStatoService.ts:77; partiteService.ts:534 | 1/3 |  |
| p | confidente_partita | 46 | 7 | disponibilitaStrutturataService.ts:41; fusione/fusioneService.ts:54 (+3) | partiteService.ts:108; puntiCronologici.ts:121 | 0/2 |  |
| p | cruciverba_partita | 3 | 3 | cruciverbaService.ts:23; effettiDiStatoService.ts:62 | cruciverbaService.ts:46 | 0/1 |  |
| p | da_applicare | 0 | 24 | acquistiService.ts:222; giornataService.ts:186 (+5) | motoreDiario.ts:412; propostePartitaService.ts:197 | 2/4 |  |
| p | divergenza_partita | 4 | 4 | divergenzeService.ts:24; mappe/fotografiaLuogoDaPin.ts:141 (+1) | dungeonService.ts:1439; mappe/mappeService.ts:914 (+1) | 0/1 |  |
| p | domanda_partita | 12 | 3 | domandeService.ts:58; effettiDiStatoService.ts:61 | domandeService.ts:82 | 0/1 |  |
| p | dote_sociale_partita | 10 | 4 | partiteService.ts:208; pescaLetture.ts:107 (+1) | partiteService.ts:105 | 0/1 |  |
| p | effetto_applicato | 0 | 15 (14 nella copia) | acquistiService.ts:97; giornataService.ts:684 (+5) | motoreDiario.ts:172 | 1/1 |  |
| p | effetto_lettura_partita | 19 | 8 | attivitaService.ts:378; motoreDiario.ts:185 (+1) | attivitaService.ts:382 | 0/1 |  |
| p | effetto_stato_voce | 0 | 7 | r:condizioni.ts:110; effettiDiStatoService.ts:100 | effettiDiStatoService.ts:102 | 0/1 |  |
| p | esame_piazzamento_partita | 0 | 4 | piazzamentoEsamiService.ts:21 | piazzamentoEsamiService.ts:54 | 0/1 |  |
| p | evento_partita | 1273 | 9 | pescaStorico.ts:21; storicoService.ts:17 | effettiDiStatoService.ts:142; pescaStorico.ts:32 (+2) | 0/2 |  |
| p | evento_storia_partita | 7 | 4 | r:condizioni.ts:104; apertureDedaliService.ts:60 (+1) | semaforiService.ts:167 | 0/3 |  |
| p | fortuna_partita | 0 | 6 | fortunaService.ts:24 | fortunaService.ts:45 | 0/2 |  |
| p | incontro_confidente_partita | 50 | 11 | azioniStrutturateService.ts:40; incontriService.ts:81 | incontriService.ts:94 | 1/2 |  |
| p | invito_partita | 0 | 4 | effettiDiStatoService.ts:63; invitiScritture.ts:162 (+1) | effettiDiStatoService.ts:140; inviti.ts:93 | 0/1 |  |
| p | membro_squadra_partita | 4 | 6 | semaforiService.ts:96; squadraService.ts:40 | partiteService.ts:136; squadraService.ts:90 | 0/1 |  |
| p | meteo_partita | 1 | 5 | meteoService.ts:34 | meteoService.ts:110 | 0/1 |  |
| p | movimento_punti_pesca | 0 | 11 | pescaLetture.ts:107; pescaRipristino.ts:31 (+1) | pescaService.ts:239; propostePartitaService.ts:405 | 0/1 |  |
| p | movimento_yen | 0 | 10 | acquistiService.ts:222; pescaLetture.ts:107 (+1) | propostePartitaService.ts:404 | 0/1 |  |
| p | obiettivo_partita | 0 | 11 | obiettiviService.ts:23; pianiSalvatiService.ts:20 | obiettiviService.ts:111 | 0/1 |  |
| p | partita | 2 | 14 | acquistiService.ts:110; calendarioService.ts:61 (+27) | r:condizioni.ts:179; acquistiService.ts:148 (+27) | 1/2 |  |
| p | persona_posseduta | 7 | 26 | r:partite.ts:372; cicliSalvatiService.ts:37 (+6) | operazioniVellutoService.ts:146; partiteService.ts:738 | 1/3 |  |
| p | persona_posseduta_skill | 34 | 3 | fusione/eredita.ts:114; fusione/fusioneService.ts:208 (+4) | operazioniVellutoService.ts:216; partiteService.ts:744 | 1/1 |  |
| p | pesca_acquisto_esca | 0 | 8 | pescaLetture.ts:98; pescaRipristino.ts:33 (+1) | pescaService.ts:234 | 0/1 |  |
| p | pesca_cattura | 0 | 6 | pescaLetture.ts:107; pescaService.ts:140 | pescaService.ts:155 | 0/1 |  |
| p | pesca_fatto_fonte | 0 | 12 | pescaLetture.ts:19 | pescaService.ts:160 | 0/1 |  |
| p | pesca_operazione | 0 | 6 | allocazioniTurniPesca.ts:33; motoreDiario.ts:148 (+4) | allocazioniTurniPesca.ts:60; pescaService.ts:242 | 0/1 |  |
| p | pesca_osservazione | 0 | 7 | pescaLetture.ts:58; pescaService.ts:151 | pescaService.ts:152 | 0/1 |  |
| p | pesca_provenienza | 0 | 10 | pescaLetture.ts:18 | partiteService.ts:163; pescaService.ts:192 | 0/1 |  |
| p | pesca_quota_storica | 0 | 6 | pescaLetture.ts:107; pescaService.ts:179 | pescaService.ts:180 | 0/1 |  |
| p | pesca_sessione | 0 | 12 | allocazioniTurniPesca.ts:41; attivitaService.ts:604 (+2) | attivitaService.ts:606; pescaService.ts:185 | 0/1 |  |
| p | piano_salvato | 0 | 12 | obiettiviService.ts:65; pianiSalvatiService.ts:20 | pianiSalvatiService.ts:141 | 0/1 |  |
| p | progresso_film_partita | 3 | 4 | attivitaService.ts:191; disponibilitaService.ts:130 (+2) | attivitaService.ts:456 | 1/3 |  |
| p | progresso_libro_partita | 11 | 4 | attivitaService.ts:190; disponibilitaService.ts:133 (+2) | attivitaService.ts:453 | 1/3 |  |
| p | progresso_videogioco_partita | 0 | 4 | attivitaService.ts:192; catalogoService.ts:386 (+3) | attivitaService.ts:460 | 0/1 |  |
| p | proposta_operazione | 0 | 5 | acquistiService.ts:222; pescaLetture.ts:107 (+1) | propostePartitaService.ts:203 | 0/1 |  |
| p | punti_confidente_generazione | 0 | 7 | puntiCronologici.ts:60 | puntiCronologici.ts:70 | 0/1 |  |
| p | punti_confidente_voce | 0 | 12 | motoreDiario.ts:427; puntiCronologici.ts:44 | puntiCronologici.ts:50 | 0/1 |  |
| p | punti_negozio_partita | 0 | 4 | r:condizioni.ts:115; disponibilitaService.ts:144 (+1) | r:condizioni.ts:201; luoghiScritture.ts:149 | 0/1 |  |
| p | punti_pesca_partita | 0 | 3 | pescaLetture.ts:107; pescaRipristino.ts:30 (+2) | pescaService.ts:238 | 0/1 |  |
| p | punto_partita | 525 | 5 | dungeonService.ts:137; giornataService.ts:295 (+5) | dungeonService.ts:1438; mappe/collegamentiGuida.ts:75 (+2) | 4/4 |  |
| p | regalo_partita | 0 | 10 | regaliPartita.ts:39; regaloAzioneService.ts:39 | catalogoOggettiFusione.ts:218; catalogoOggettiScritture.ts:86 (+2) | 1/3 |  |
| p | requisito_partita | 0 | 6 | — | requisitiConfidentiService.ts:50 | 1/2 |  |
| p | richiesta_partita | 1 | 4 | dungeonService.ts:246; effettiDiStatoService.ts:65 (+3) | richiesteService.ts:85 | 0/1 |  |
| p | sessione_videogioco_partita | 0 | 3 | attivitaService.ts:210; catalogoService.ts:387 (+1) | attivitaService.ts:219 | 0/0 |  |
| p | spillo_partita | 668 | 4 | mappe/collegamentiGuida.ts:74; mappe/fotografiaLuogoDaPin.ts:141 (+2) | dungeonService.ts:753; mappe/mappeService.ts:912 (+1) | 5/3 |  |
| p | spillo_partita_infiltrazione | 90 | 5 | mappe/fotografiaLuogoDaPin.ts:141; mappe/statiGuida.ts:193 | mappe/mappeService.ts:915; mappe/statiGuida.ts:462 | 1/1 |  |
| p | spunta_voce_partita | 338 | 4 | r:partite.ts:198; acquistiService.ts:154 (+8) | giornataService.ts:593 | 2/1 |  |
| p | timbri_dedalo_partita | 0 | 4 | timbriService.ts:22 | dungeonService.ts:759; timbriService.ts:41 | 1/3 |  |
| p | trofeo_partita | 0 | 3 | completamentoService.ts:23 | completamentoService.ts:45 | 0/1 |  |
| p | turno_partita | 11 | 5 | allocazioniTurniPesca.ts:39; attivitaService.ts:571 (+3) | attivitaService.ts:574; pescaService.ts:178 | 1/2 |  |

**Note alle tabelle.**
- **Tabelle senza alcun lettore di prodotto**: `audit_aojiru_136`, `audit_pesca_138`, `infiltrazione_dedalo`, `requisito_partita` (vedi §1).
- **Letta solo dalle verifiche d'integrità e dall'anteprima di importazione** (nessun lettore di funzione di gioco): `decisione_tanaka`, `decisione_tanaka_ripristino` (`tanakaStatoListino.ts:41,43`).
- **Copia per «Ripristina»**: `confidente_requisito_guida` è la copia della guida di `confidente_requisito` (fonte unica: `confidente_requisito`, la copia serve a rimettere i valori); letta con tabella parametrica in `requisitiConfidentiService.ts:70-71` (nessuno scrittore: la copia è presa dalla migrazione 119).
- **Registro**: `cestino` e `cestino_partite` sono i registri del cestino (scritti da `cestinoService.ts`), `correzione_dati_guida` è il registro delle correzioni dei blocchi di `dati_guida` (scritta da `ripristinoService.ts:347-367`).
- **Cache** (rigenerabile): `immagine_miniatura` (scritta da `miniatureService.ts:131`).
- **Solo scrittura nella catena `acquisto_legacy_*`**: fotografia legacy immutabile, letta e scritta solo da `db/acquistiLegacy.ts`, che ne verifica l'immutabilità; il cestino la esclude (archivio di prova non ricostruibile: solo l'utente può eliminarla).

## 4. Colonne di gioco (`gioco.db`)

883 colonne, 108 tabelle. Formato: `colonna|non vuote|primo lettore +altri|FE|M|stato|fonte` (vedi §0). Una riga `# tabella (righe)` apre ogni tabella, con le sue chiavi esterne `colonna>tabella.colonna`.

```
# allerta_meteo (74)
data|=|condizioni/valutatore.ts:200+3|75|2
fascia|=|condizioni/valutatore.ts:200+3|44|1
chiave|=|r:condizioni.ts:64+5|299|2
nome|=|r:condizioni.ts:64+4|289|2
effetti_json|=|meteoService.ts:42+2|4|1
origine|=|meteoService.ts:66+1|27|1
seed_json|0|ripristinoService.ts:140|0|1
updated_at|0|ripristinoService.ts:140|3|1
# arcana (24)
chiave|=|compendioService.ts:199+3|299|2
ordine|23|compendioService.ts:199+2|85|1
numero|21|compendioService.ts:199|65|1
# area (140) fk: planimetria_predefinita>mappa.chiave dungeon_chiave>dungeon.chiave quartiere_chiave>quartiere.chiave
chiave|=|catalogoService.ts:235+16|299|8
quartiere_chiave|22|catalogoService.ts:235+10|2|7||>quartiere.chiave
dungeon_chiave|117|dungeonService.ts:830+8|0|2||>dungeon.chiave
slug|=|cittaService.ts:139+9|33|3
nome|=|cittaService.ts:139+9|289|6
nome_rivisto|18|mappe/areeService.ts:76*+5|2|2
ordine|122|mappe/areeService.ts:191+7|85|6
planimetria_predefinita|=|cittaService.ts:151+9|0|2||>mappa.chiave
origine|=|mappe/mappeService.ts:1740+5|27|3
seed_json|0|mappe/mappeService.ts:1740+5|0|2
updated_at|=|mappe/areeService.ts:76*+5|3|3
citta_chiave|1|mappe/areeService.ts:76*+5|0|2
da_verificare|1|mappe/areeService.ts:76*+5|15|2
# area_dedalo (95) fk: dedalo_chiave>dungeon_area.chiave
chiave|=|condizioni/nomiCondizioni.ts:113+6|299|6
dedalo_chiave|=|dungeonService.ts:239+4|0|5||>dungeon_area.chiave
ordine|86|condizioni/nomiCondizioni.ts:115+5|85|3
nome|=|condizioni/nomiCondizioni.ts:111+6|289|4
descrizione|3|dungeonService.ts:239*|39|3
timbri_totale|0|timbriService.ts:28+1|2|3
# articolo (650) fk: articolo_condiviso>articolo.chiave catalogo_chiave>catalogo_oggetto.chiave negozio_chiave>negozio.chiave
chiave|=|sc:copertura-accesso.ts:27+28|299|20
negozio_chiave|=|r:condizioni.ts:65+17|9|14||>negozio.chiave
ordine|590|attivitaService.ts:80+10|85|7
nome|613|r:condizioni.ts:65+14|289|8
nome_it|1|r:condizioni.ts:65+11|43|6
categoria|=|db:acquistiLegacy.ts:89*+6|44|8
per|433|db:acquistiLegacy.ts:89*+6|318|11
prezzo|560|attivitaService.ts:80+12|27|9
effetto|431|db:acquistiLegacy.ts:89*+6|52|6
statistiche|199|db:acquistiLegacy.ts:89*+6|21|5
nota|76|catalogoOggettiService.ts:25+8|68|11
fonte|638|db:acquistiLegacy.ts:89*+6|56|11
verificato|572|negoziService.ts:43+6|16|3
origine|=|catalogoService.ts:349+7|27|14
nascosto|18|sc:copertura-accesso.ts:27+16|16|8
seed_json|66|catalogoOggettiFusione.ts:79+7|0|13
updated_at|155|db:acquistiLegacy.ts:89*+6|3|16
condizioni_json|562|richiesteService.ts:260+7|3|14
oggetto_fonte|48|attivitaService.ts:80+7|2|4
oggetto_chiave|48|attivitaService.ts:80+7|2|4
quantita|11|db:acquistiLegacy.ts:89*+6|12|5
effetto_json|0|db:acquistiLegacy.ts:89*+6|2|3
catalogo_chiave|644|acquistiService.ts:81+16|4|6||>catalogo_oggetto.chiave
costo_json|59|catalogoOggettiFusione.ts:48+10|2|2
articolo_condiviso|0|catalogoOggettiLetture.ts:69+10|0|2||>articolo.chiave
# attivita (30) fk: pesca_regola_chiave>regola_pesca.chiave confidente_chiave>confidente.chiave catalogo_chiave>catalogo_oggetto.chiave sede_chiave>luogo.chiave luogo_chiave>quartiere.chiave
chiave|=|sc:copertura-accesso.ts:30+26|299|15
ordine|29|attivitaService.ts:232+9|85|3
nome|=|r:condizioni.ts:57+15|289|7
tipo|=|db:conversioneEffettiAzione.ts:86+16|156|11
luogo|29|mappe/fotografiaLuogoDaPin.ts:185+8|57|5
luogo_chiave|29|mappe/accessoMondoService.ts:87+11|6|2|copia|copia del quartiere della sede (luogo.quartiere_chiave, 29/29)
fascia|29|attivitaService.ts:208*+7|44|3
costo|12|attivitaService.ts:208*+7|31|3
sblocco|18|attivitaService.ts:208*+7|22|5
doti_json|22|attivitaService.ts:208*+7|2|4
fonte|=|attivitaService.ts:208*+7|56|6
verificato|21|attivitaService.ts:208*+7|16|3
sessioni|=|catalogoOggettiLetture.ts:56+9|23|4
origine|=|catalogoService.ts:349+7|27|4
nascosto|0|r:condizioni.ts:57+10|16|1
seed_json|1|attivitaService.ts:208*+7|0|6
updated_at|1|attivitaService.ts:208*+7|3|5
condizioni_json|17|richiesteService.ts:260+8|3|5
sede_chiave|29|attivitaService.ts:308+12|10|2||>luogo.chiave
effetti_json|17|r:condizioni.ts:57+9|4|4
paga_yen|4|giornataService.ts:87+8|4|1
paga_massima|4|giornataService.ts:87+8|4|1
dettagli|=|attivitaService.ts:208*+7|34|5
tracciamento|=|r:condizioni.ts:57+8|2|3
quiz_json|1|attivitaService.ts:308+7|3|1
catalogo_chiave|7|azioniStrutturateService.ts:30+11|4|0||>catalogo_oggetto.chiave
confidente_chiave|1|azioniStrutturateService.ts:131+7|5|2||>confidente.chiave
pesca_regola_chiave|2|azioniStrutturateService.ts:131+8|3|1||>regola_pesca.chiave
pesca_ruolo|2|pescaService.ts:98+8|2|1
# audit_aojiru_136 (1)
id|=|—|163|1|senza lettore
versione|=|—|61|1|senza lettore
articolo_chiave|=|—|2|1|senza lettore
catalogo_chiave|=|—|4|1|senza lettore
esito|=|—|65|1|senza lettore
motivo|=|—|48|1|senza lettore
prima_json|=|—|0|1|senza lettore
dopo_json|=|—|0|1|senza lettore
creato_il|=|—|1|1|senza lettore
# audit_pesca_138 (1)
id|=|—|163|1|senza lettore
versione|=|—|61|1|senza lettore
regola_chiave|=|—|0|1|senza lettore
esito|=|—|65|1|senza lettore
motivo|=|—|48|1|senza lettore
attivita_json|=|—|0|1|senza lettore
prima_json|=|—|0|1|senza lettore
dopo_json|=|—|0|1|senza lettore
copertura_json|=|—|0|1|senza lettore
creato_il|=|—|1|1|senza lettore
# catalogo_oggetto (1299)
chiave|=|acquistiService.ts:81+18|299|11
categoria|=|catalogoOggettiProposte.ts:33+5|44|6
sottocategoria|353|azioniStrutturateService.ts:29*+4|1|3
nome|=|acquistiService.ts:81+11|289|7
nomi_altri_json|328|regaliPartita.ts:18+5|0|4
nome_originale|372|ricerca/indiceRicerca.ts:170+4|6|3
effetto|879|azioniStrutturateService.ts:29*+4|52|4
descrizione|553|azioniStrutturateService.ts:29*+4|39|6
statistiche_json|742|azioniStrutturateService.ts:29*+4|0|3
fonte_tipo|=|catalogoOggettiLetture.ts:96+5|1|8
fonte_chiave|=|catalogoOggettiLetture.ts:96+5|1|8
origine|=|azioniStrutturateService.ts:29*+4|27|8
seed_json|1|azioniStrutturateService.ts:29*+4|0|9
nascosto|0|catalogoService.ts:165+8|16|6
updated_at|=|azioniStrutturateService.ts:29*+4|3|10
# cestino (5)
id|=|cestinoService.ts:348+2|163|23
uid|=|cestinoService.ts:348+1|36|11
tipo|=|cestinoService.ts:348+1|156|20
chiave|=|cestinoService.ts:348+1|299|23
nome|=|cestinoService.ts:348+1|289|19
contesto|=|cestinoService.ts:348+1|23|10
riepilogo_json|=|cestinoService.ts:348+1|0|10
registro_json|=|cestinoService.ts:348+2|0|18
con_partite|0|cestinoService.ts:348+1|0|10
vicini_json|1|cestinoService.ts:425*+1|0|10
eliminato_il|=|cestinoService.ts:348+1|1|10
# confidente (23) fk: arcana>arcana.chiave
chiave|=|sc:copertura-accesso.ts:29+28|299|10
nome|=|azioniStrutturateService.ts:102+22|289|5
arcana|=|azioniStrutturateService.ts:102+7|16|1||>arcana.chiave
ordine|22|azioniStrutturateService.ts:169+7|85|5
# confidente_abilita (159) fk: confidente_chiave>confidente.chiave
confidente_chiave|=|compendioService.ts:470+1|5|1||>confidente.chiave
rango|=|compendioService.ts:470+1|48|1
ordine|136|compendioService.ts:470+1|85|1
nome|=|compendioService.ts:470+1|289|1
descrizione|=|compendioService.ts:470+1|39|1
# confidente_dialogo (223) fk: confidente_chiave>confidente.chiave
id|=|compendioService.ts:471+1|163|2
confidente_chiave|=|compendioService.ts:471+2|5|2||>confidente.chiave
ordine|200|compendioService.ts:471|85|2
rango|220|compendioService.ts:471+1|48|2
etichetta|=|compendioService.ts:471|179|2
note|216|compendioService.ts:471+2|75|2
scelte_json|199|compendioService.ts:471+2|0|2
# confidente_disponibilita (23) fk: confidente_chiave>confidente.chiave
confidente_chiave|=|compendioService.ts:492+4|5|3||>confidente.chiave
giorni_json|21|compendioService.ts:492*+2|1|2
fasce_json|22|compendioService.ts:492*+2|1|2
luogo|=|compendioService.ts:492*+2|57|2
sblocco_data|21|compendioService.ts:492*+2|1|2
sblocco_requisiti|22|compendioService.ts:492*+2|1|1
note|=|fonteConfidenteAttivitaService.ts:25+3|75|3
note_generali|8|compendioService.ts:492*+2|2|1
fonti_json|=|compendioService.ts:492*+2|1|1
modo|=|compendioService.ts:492*+2|30|1
giorni_settimana_json|18|compendioService.ts:492*+2|0|1
fasce_orarie_json|18|compendioService.ts:492*+2|0|1
eccezioni_json|9|compendioService.ts:492*+2|0|1
dal|1|compendioService.ts:492*+2|182|2
motivo_senza_luogo|4|compendioService.ts:492*+2|2|1
fonte|=|compendioService.ts:492*+2|56|2
# confidente_dote_incontro (39) fk: confidente_chiave>confidente.chiave
confidente_chiave|=|confidentiScritture.ts:120+2|5|3||>confidente.chiave
verso_rango|=|confidentiScritture.ts:120+2|0|3
effetti_json|32|confidentiScritture.ts:120+2|4|3
# confidente_invito (6) fk: confidente_chiave>confidente.chiave
chiave|=|condizioni/nomiCondizioni.ts:64+3|299|5
confidente_chiave|=|condizioni/condizioneEffettiva.ts:25+2|5|3||>confidente.chiave
data|=|condizioni/condizioneEffettiva.ts:25+2|75|5
apre_tipo|=|condizioni/condizioneEffettiva.ts:25*+1|3|3
apre_chiave|=|condizioni/condizioneEffettiva.ts:25*+1|3|3
condizioni_json|=|invitiScritture.ts:83+1|3|3
nota|3|condizioni/condizioneEffettiva.ts:25*+1|68|4
fonte|=|condizioni/condizioneEffettiva.ts:25*+1|56|2
origine|=|condizioni/condizioneEffettiva.ts:25*+1|27|3
seed_json|=|condizioni/condizioneEffettiva.ts:25*+1|0|3
updated_at|=|condizioni/condizioneEffettiva.ts:25*+1|3|4
# confidente_rango (207) fk: confidente_chiave>confidente.chiave
confidente_chiave|=|confidentiScritture.ts:39+1|5|3||>confidente.chiave
rango|=|confidentiScritture.ts:39+1|48|3
punti_necessari|106|confidentiScritture.ts:39+1|4|2
modo|=|confidentiScritture.ts:39+1|30|1
fonte|=|confidentiScritture.ts:39|56|1
# confidente_regalo (144) fk: catalogo_chiave>catalogo_oggetto.chiave confidente_chiave>confidente.chiave
confidente_chiave|=|catalogoOggettiProposte.ts:59+8|5|3||>confidente.chiave
ordine|127|catalogoOggettiProposte.ts:59+5|85|2
nome|=|catalogoOggettiProposte.ts:59+5|289|3
dove|133|catalogoOggettiProposte.ts:59+4|104|2
costo|129|catalogoOggettiProposte.ts:59+4|31|2
effetto|133|catalogoOggettiService.ts:103+3|52|1
sconsigliato|11|catalogoOggettiService.ts:103+6|1|2
catalogo_chiave|=|catalogoOggettiFusione.ts:216+9|4|2||>catalogo_oggetto.chiave
nota|1|costoRegaloService.ts:34+3|68|1
seed_json|1|costoRegaloService.ts:34+3|0|1
origine|=|compendioService.ts:474*+2|27|1
updated_at|1|compendioService.ts:474*+2|3|1
# confidente_requisito (177) fk: confidente_chiave>confidente.chiave
confidente_chiave|=|calendarioFonti.ts:43+5|5|6||>confidente.chiave
rango|=|calendarioFonti.ts:43+5|48|6
indice|31|calendarioFonti.ts:43+5|40|5
tipo|=|calendarioFonti.ts:43+5|156|6
dati_json|176|calendarioFonti.ts:43+5|0|6
testo|=|requisitiConfidentiService.ts:25+3|168|3
# confidente_requisito_guida (177)
confidente_chiave|=|requisitiConfidentiService.ts:70|5|1
rango|=|requisitiConfidentiService.ts:70|48|1
indice|31|requisitiConfidentiService.ts:70|40|1
tipo|=|requisitiConfidentiService.ts:70|156|1
dati_json|176|requisitiConfidentiService.ts:70|0|1
testo|=|requisitiConfidentiService.ts:70|168|1
# copia_pezzo (42) fk: pezzo_id>pezzo_mappa.id
id|=|mappe/pezziMappa.ts:111+1|163|1
uid|=|mappe/pezziMappa.ts:227|36|1
pezzo_id|=|mappe/pezziMappa.ts:111+1|1|1||>pezzo_mappa.id
etichetta|0|mappe/pezziMappa.ts:111*|179|1
x|=|mappe/pezziMappa.ts:111*|141|1
y|=|mappe/pezziMappa.ts:111*|86|1
rotazione|0|mappe/pezziMappa.ts:111*|5|1
specchio_orizzontale|0|mappe/pezziMappa.ts:111*|0|1
specchio_verticale|0|mappe/pezziMappa.ts:111*|0|1
condizioni_json|23|mappe/pezziMappa.ts:111*|3|1
ordine|18|mappe/pezziMappa.ts:111|85|1
updated_at|=|mappe/pezziMappa.ts:111*|3|1
# correzione_dati_guida (0)
blocco|0|datiGuida.ts:56+1|24|1
percorso|0|datiGuida.ts:56+1|48|1
valore_json|0|datiGuida.ts:56|0|1
guida_json|0|ripristinoService.ts:303|0|1
updated_at|0|ripristinoService.ts:303|3|1
# cruciverba (38)
data|=|cruciverbaService.ts:40+2|75|3
ordine|37|catalogoService.ts:380+1|85|2
indizio|=|catalogoService.ts:103*+1|5|1
risposta|=|catalogoService.ts:103*+1|45|2
risposta_en|=|catalogoService.ts:103*+1|3|1
fonte|=|catalogoService.ts:103*+1|56|1
chiave|=|catalogoService.ts:103+1|299|1
origine|=|catalogoService.ts:349+1|27|1
nascosto|0|catalogoService.ts:349+1|16|1
seed_json|0|catalogoService.ts:103*+1|0|1
updated_at|0|catalogoService.ts:103*+1|3|2
# dati_guida (53)
chiave|=|atterraggioPalazziService.ts:127+11|299|47
json|=|attivitaService.ts:344+9|8|47
# decisione_tanaka (1)
operazione_id|=|tanakaStatoListino.ts:41|9|2
versione|=|tanakaStatoListino.ts:41|61|2
negozio_chiave|=|—|9|2|senza lettore
revisione_confronto|=|—|0|2|senza lettore
revisione_piano|=|—|0|2|senza lettore
piano_json|=|—|0|2|senza lettore
prima_json|=|tanakaStatoListino.ts:41|0|2
dopo_json|=|tanakaStatoListino.ts:41|0|2
confermata_il|=|—|0|2|senza lettore
# decisione_tanaka_ripristino (0) fk: decisione_id>decisione_tanaka.operazione_id
operazione_id|0|—|9|1|senza lettore
decisione_id|0|tanakaStatoListino.ts:43|0|1||>decisione_tanaka.operazione_id
prima_json|0|—|0|1|senza lettore
ripristinata_il|0|—|0|1|senza lettore
# dedalo_confluenza (1) fk: dedalo_chiave>dungeon_area.chiave dungeon_chiave>dungeon.chiave
dungeon_chiave|=|dungeonService.ts:121+2|0|1||>dungeon.chiave
dedalo_chiave|=|dungeonService.ts:121+1|0|1||>dungeon_area.chiave
nota|=|—|68|1|senza lettore
# dlc_set (13)
id|=|compendioService.ts:253|163|1
ordine|12|compendioService.ts:253|85|1
# dlc_set_persona (25) fk: persona_id>persona.id set_id>dlc_set.id
set_id|=|compendioService.ts:255+1|0|1||>dlc_set.id
persona_id|=|compendioService.ts:255+1|26|1||>persona.id
# domanda (78)
id|=|domandeService.ts:76+4|163|7
ordine|77|catalogoService.ts:380+2|85|5
data|=|domandeService.ts:36+3|75|7
tipo|=|domandeService.ts:36+3|156|7
chi|=|catalogoService.ts:103*+2|84|2
domanda|=|domandeService.ts:36+5|23|7
risposte_json|=|domandeService.ts:36+2|2|3
ricompensa|=|fontiRicompenseOggetti.ts:32+3|8|1
note|13|catalogoService.ts:103*+2|75|1
fonte|=|catalogoService.ts:103*+2|56|2
chiave|=|catalogoService.ts:103+3|299|4
origine|=|catalogoService.ts:349+2|27|1
nascosto|0|catalogoService.ts:349+2|16|1
seed_json|0|catalogoService.ts:103*+2|0|1
updated_at|0|catalogoService.ts:103*+2|3|1
# dote_sociale (5)
chiave|=|azioniStrutturateService.ts:112+6|299|2
nome|=|azioniStrutturateService.ts:112+5|289|2
ordine|4|azioniStrutturateService.ts:177+5|85|2
origine|=|pescaLetture.ts:106*+1|27|1
seed_json|0|ripristinoService.ts:140+1|0|1
updated_at|0|ripristinoService.ts:140+1|3|2
# dote_sociale_rango (25) fk: dote_chiave>dote_sociale.chiave
dote_chiave|=|partiteService.ts:192+1|0|2||>dote_sociale.chiave
rango|=|partiteService.ts:192+1|48|2
nome|=|partiteService.ts:192+1|289|2
soglia|20|partiteService.ts:192+1|11|2
# dungeon (10) fk: voce_boss_finale>punto_interesse.chiave
chiave|=|atterraggioPalazziService.ts:39+20|299|17
tipo|=|catturePersona.ts:30+11|156|14
ordine|=|azioniStrutturateService.ts:170+8|85|9
nome|=|azioniStrutturateService.ts:105+11|289|10
sovrano|=|dungeonService.ts:358*+1|4|1
arcana_sovrano|5|dungeonService.ts:358*+1|3|1
data_sblocco|=|dungeonService.ts:358*+1|2|1
data_scadenza|8|dungeonService.ts:358*+1|2|2
furto_consigliato|8|dungeonService.ts:358*+1|2|1
livello_consigliato|9|dungeonService.ts:358*+1|6|1
note|=|dungeonService.ts:358*+1|75|6
fonti_json|=|dungeonService.ts:358*+1|1|1
voce_boss_finale|7|palazziService.ts:64+2|0|1||>punto_interesse.chiave
seed_json|0|dungeonService.ts:358*+1|0|6
regola_boss|=|palazziService.ts:101+2|2|1
finestra_dal|=|datiGuida.ts:155+2|0|2
finestra_al|8|calendarioFonti.ts:39+3|0|4
lettera_entro|1|dungeonService.ts:358*+1|0|1
```

```
# dungeon_area (100) fk: dungeon_chiave>dungeon.chiave
chiave|=|apertureDedaliService.ts:16+20|299|17
dungeon_chiave|=|apertureDedaliService.ts:17+19|0|14||>dungeon.chiave
ordine|90|catalogoOggettiService.ts:54+12|85|10
nome|=|apertureDedaliService.ts:22+16|289|9
descrizione|99|dungeonService.ts:427*+3|39|6
# dungeon_atterraggio (3) fk: spillo_id>spillo.id mappa_chiave>mappa.chiave dungeon_chiave>dungeon.chiave
id|=|atterraggioPalazziService.ts:55+1|163|1
dungeon_chiave|=|atterraggioPalazziService.ts:55|0|1||>dungeon.chiave
ordine|2|atterraggioPalazziService.ts:55|85|1
dal|=|atterraggioPalazziService.ts:68|182|1
al|2|atterraggioPalazziService.ts:68|191|1
mappa_chiave|=|atterraggioPalazziService.ts:68+1|6|1||>mappa.chiave
spillo_id|1|atterraggioPalazziService.ts:68+1|13|1||>spillo.id
updated_at|=|atterraggioPalazziService.ts:55*|3|1
# eredita_matrice (144)
tipo|=|compendioService.ts:248+1|156|1
elemento|=|compendioService.ts:248+1|60|1
ammesso|117|compendioService.ts:248+1|2|1
# esame (4)
chiave|=|domandeService.ts:38+6|299|3
ordine|3|domandeService.ts:38+5|85|4
nome|=|domandeService.ts:38+6|289|3
date_json|0|ripristinoService.ts:435*+1|0|2
data_risultati|=|domandeService.ts:38+5|1|3
domande_json|0|ripristinoService.ts:435*+1|0|3
note|1|domandeService.ts:38+4|75|1
origine|=|ripristinoService.ts:435*+1|27|1
seed_json|0|ripristinoService.ts:140+1|0|1
updated_at|0|ripristinoService.ts:140+1|3|1
# esame_premi (1)
chiave|=|domandeService.ts:68|299|1
json|=|domandeService.ts:68|8|1
# evento_calendario (173) fk: data>giorno.data
id|=|calendarioService.ts:34+2|163|9
data|=|calendarioService.ts:34+3|75|7||>giorno.data
ordine|30|calendarioService.ts:34+2|85|5
tipo|=|calendarioService.ts:34+3|156|5
titolo|=|calendarioService.ts:34+2|189|6
dettaglio|122|ripristino/righeCalendario.ts:41+2|91|2
fonte|=|ripristino/righeCalendario.ts:41+2|56|6
origine|=|calendarioService.ts:70*+1|27|1
seed_json|0|ripristinoService.ts:140+1|0|3
updated_at|0|ripristinoService.ts:140+1|3|1
fonte_chiave|36|calendarioService.ts:34+1|1|1
# evento_calendario_voce (135) fk: voce_uid>voce_giornata.uid evento_id>evento_calendario.id
evento_id|=|calendarioService.ts:20|1|4||>evento_calendario.id
voce_uid|=|calendarioService.ts:21|8|3||>voce_giornata.uid
certezza|=|calendarioService.ts:20|4|3
# film (30) fk: catalogo_chiave>catalogo_oggetto.chiave
chiave|=|db:conversioneEffettiAzione.ts:82+13|299|6
ordine|29|attivitaService.ts:290+3|85|3
nome|=|db:conversioneEffettiAzione.ts:82+9|289|2
nome_it|14|db:conversioneEffettiAzione.ts:82+7|43|1
dove|=|db:conversioneEffettiAzione.ts:82+5|104|5
periodo|=|attivitaService.ts:290*+3|3|1
dote|=|attivitaService.ts:290*+3|28|2
note|=|attivitaService.ts:290*+3|75|2
prezzo|18|attivitaService.ts:290*+3|27|1
dettagli|=|attivitaService.ts:290*+3|34|1
fonte|=|attivitaService.ts:290*+3|56|1
verificato|14|attivitaService.ts:290*+3|16|1
sessioni|=|db:conversioneEffettiAzione.ts:82+7|23|5
origine|=|catalogoService.ts:349+3|27|1
nascosto|0|r:condizioni.ts:66+4|16|0
seed_json|1|attivitaService.ts:290*+3|0|0
updated_at|1|attivitaService.ts:290*+3|3|4
condizioni_json|26|richiesteService.ts:260+4|3|1
note_successive|13|attivitaService.ts:290*+3|0|1
effetti_json|=|catalogoOggettiLetture.ts:56+4|4|1
catalogo_chiave|=|azioniStrutturateService.ts:30+7|4|0||>catalogo_oggetto.chiave
# film_posizione (42) fk: film_chiave>film.chiave
film_chiave|=|attivitaService.ts:239|0|1||>film.chiave
ordine|12|attivitaService.ts:239|85|1
tipo|=|attivitaService.ts:239|156|1
chiave|=|attivitaService.ts:239|299|1
etichetta|=|attivitaService.ts:239|179|1
ruolo|=|attivitaService.ts:239|16|1
# fusione_arcana (273) fk: risultato>arcana.chiave b>arcana.chiave a>arcana.chiave
a|=|compendioService.ts:240+1|309|1||>arcana.chiave
b|=|compendioService.ts:240+1|75|1||>arcana.chiave
risultato|=|compendioService.ts:240+1|25|1||>arcana.chiave
# fusione_speciale (24) fk: risultato_id>persona.id
risultato_id|=|compendioService.ts:241|5|1||>persona.id
# fusione_speciale_ingrediente (94) fk: ingrediente_id>persona.id risultato_id>fusione_speciale.risultato_id
risultato_id|=|compendioService.ts:191+1|5|1||>fusione_speciale.risultato_id
ingrediente_id|=|compendioService.ts:191+1|2|1||>persona.id
ordine|70|compendioService.ts:191+1|85|1
# giorno (346) fk: settimana>settimana_guida.numero
data|=|acquistiService.ts:108+12|75|3
ordine|345|calendarioService.ts:66+5|85|3
meteo_giorno|288|giorniService.ts:22+3|1|2
meteo_sera|288|giorniService.ts:22+3|1|2
nota_meteo|17|giorniService.ts:22+3|1|2
meteo_da_verificare|1|giorniService.ts:22+2|1|1
tempo_libero_json|40|calendarioService.ts:66*+1|0|3
settimana|330|calendarioService.ts:66*+1|5|2||>settimana_guida.numero
fase|=|percorsoService.ts:38+1|5|2
trama|=|giorniService.ts:22+2|15|2
vincoli_json|127|giorniService.ts:22+2|0|2
avvisi_json|227|percorsoService.ts:38+1|0|2
fonte|=|calendarioService.ts:66*+1|56|3
coperto|299|percorsoService.ts:38+1|2|2
origine|=|calendarioService.ts:66*+1|27|1
seed_json|0|giorniService.ts:22+2|0|2
updated_at|=|calendarioService.ts:66*+1|3|1
# guida_alias (92) fk: area_chiave>dungeon_area.chiave
chiave|=|dungeonService.ts:843+1|299|2
area_chiave|=|mappe/contenutiGuidaService.ts:44|4|2|copia|copia di guida_alias.chiave (92/92 uguali)
# immagine (807)
id|=|immaginiService.ts:87+5|163|6
ambito|=|dungeonService.ts:1061+9|24|5
chiave|=|dungeonService.ts:1061+9|299|5
nome_file|=|dungeonService.ts:1061+3|0|3
mime|=|immaginiService.ts:87+4|0|3
byte|=|sc:genera-pacchetto.ts:72+6|7|3
created_at|=|dungeonService.ts:1065+6|6|3
origine_url|18|dungeonService.ts:1066*+3|0|3
contenuto|=|sc:genera-pacchetto.ts:72+7|46|1
# immagine_miniatura (107) fk: immagine_id>immagine.id
immagine_id|=|miniatureService.ts:104|0|1||>immagine.id
larghezza|=|miniatureService.ts:104|38|1
versione|=|miniatureService.ts:104|61|1
mime|=|miniatureService.ts:104|0|1
byte|=|—|7|1|solo scritta
larghezza_reale|=|—|0|1|solo scritta
altezza_reale|=|—|0|1|solo scritta
contenuto|=|miniatureService.ts:104|46|1
created_at|=|—|6|1|solo scritta
# infiltrazione_area (105) fk: planimetria_iniziale>mappa.chiave area_chiave>area.chiave infiltrazione_chiave>dungeon_area.chiave
infiltrazione_chiave|=|dungeonService.ts:765+5|0|5||>dungeon_area.chiave
area_chiave|=|mappe/areeService.ts:514+4|4|5||>area.chiave
ordine|29|mappe/areeService.ts:632+4|85|5
planimetria_iniziale|=|mappe/areeService.ts:632+3|2|2||>mappa.chiave
origine|=|mappe/areeService.ts:632+1|27|2
# infiltrazione_dedalo (12) fk: area_dedalo_chiave>area_dedalo.chiave infiltrazione_chiave>dungeon_area.chiave
infiltrazione_chiave|=|—|0|1|senza lettore|>dungeon_area.chiave
area_dedalo_chiave|=|—|0|1|senza lettore|>area_dedalo.chiave
# libro (46) fk: catalogo_chiave>catalogo_oggetto.chiave
chiave|=|db:conversioneEffettiAzione.ts:79+13|299|8
ordine|45|attivitaService.ts:268+4|85|4
nome|=|db:conversioneEffettiAzione.ts:79+9|289|5
nome_it|=|db:conversioneEffettiAzione.ts:79+7|43|2|copia|copia di libro.nome (46/46 uguali)
dove|=|condizioni/contestoConversione.ts:59+5|104|4
prezzo|30|attivitaService.ts:268*+3|27|2
disponibile_dal|45|attivitaService.ts:268*+3|4|2
dote|22|attivitaService.ts:268*+3|28|2
note|22|attivitaService.ts:268*+3|75|2
sblocca|24|attivitaService.ts:268*+3|5|4
sessioni|=|db:conversioneEffettiAzione.ts:79+7|23|5
dettagli|1|attivitaService.ts:268*+3|34|1
fonte|=|attivitaService.ts:268*+3|56|2
verificato|=|attivitaService.ts:268*+3|16|2
origine|=|catalogoService.ts:349+3|27|1
nascosto|0|r:condizioni.ts:66+4|16|1
seed_json|0|attivitaService.ts:268*+3|0|1
updated_at|0|attivitaService.ts:268*+3|3|5
condizioni_json|45|richiesteService.ts:260+4|3|1
effetto_json|0|attivitaService.ts:268*+3|2|4
effetti_json|=|catalogoOggettiLetture.ts:56+4|4|1
catalogo_chiave|=|azioniStrutturateService.ts:30+8|4|0||>catalogo_oggetto.chiave
# libro_posizione (48) fk: libro_chiave>libro.chiave
libro_chiave|=|attivitaService.ts:250|0|1||>libro.chiave
ordine|2|attivitaService.ts:250|85|1
tipo|=|attivitaService.ts:250|156|1
chiave|=|attivitaService.ts:250|299|1
etichetta|=|attivitaService.ts:250|179|1
# luogo (106) fk: solo_eventi_confidente>confidente.chiave area_chiave>area.chiave quartiere_chiave>quartiere.chiave
chiave|=|sc:copertura-accesso.ts:28+29|299|18
quartiere_chiave|=|r:condizioni.ts:80+17|2|11||>quartiere.chiave
ordine|82|r:condizioni.ts:80+11|85|9
tipo|=|cittaService.ts:130+8|156|10
nome|=|r:condizioni.ts:80+21|289|11
cosa_offre|99|luoghiScritture.ts:69+6|8|4
sblocco|39|catalogoService.ts:103*+5|22|7
confidenti_json|34|azioniStrutturateService.ts:87+10|2|3
piatti_json|8|catalogoService.ts:103*+5|2|3
note|51|catalogoService.ts:103*+5|75|8
fonte|99|catalogoService.ts:103*+5|56|10
verificato|67|cittaService.ts:98+6|16|5
origine|=|catalogoService.ts:349+6|27|10
nascosto|0|r:condizioni.ts:80+16|16|4
seed_json|93|catalogoService.ts:103*+5|0|7
updated_at|=|mappe/riallineaSpilliLuoghi.ts:23+6|3|9
condizioni_json|43|attivitaService.ts:140+10|3|7
area_chiave|82|listiniCondivisi.ts:39+9|4|7||>area.chiave
orari_json|40|disponibilitaAttivita.ts:24+7|2|5
solo_eventi_confidente|1|catalogoService.ts:103*+5|1|2||>confidente.chiave
fonte_condizioni_json|28|catalogoService.ts:103*+5|0|3
# mappa (317) fk: area_chiave>area.chiave genitore_chiave>mappa.chiave
chiave|=|atterraggioPalazziService.ts:89+26|299|13
nome|=|condizioni/nomiCondizioni.ts:89+11|289|9
tipo|=|luoghiScritture.ts:33+10|156|10
genitore_chiave|306|atterraggioPalazziService.ts:89+11|0|6||>mappa.chiave
ordine|295|dungeonService.ts:372+9|85|8
immagine_chiave|32|mappe/areeService.ts:85+10|0|5
asset|=|mappe/areeService.ts:85+10|48|5
larghezza|311|condizioni/nomiCondizioni.ts:89*+6|38|1
altezza|311|condizioni/nomiCondizioni.ts:89*+6|44|1
origine|=|mappe/mappeService.ts:1891+6|27|8
note|157|condizioni/nomiCondizioni.ts:89*+6|75|4
updated_at|=|mappe/mappeService.ts:2235+6|3|4
ruolo_immagine|=|mappe/areeService.ts:85+10|2|4
nome_rivisto|41|condizioni/nomiCondizioni.ts:89*+6|2|3
area_chiave|274|catalogoOggettiService.ts:60+17|4|7||>area.chiave
versione_etichetta|220|dungeonService.ts:372+9|3|3
versione_ordine|141|mappe/areeService.ts:85+8|1|3
percorso_fisso|5|condizioni/nomiCondizioni.ts:89*+6|0|1
# mappa_alias (690) fk: mappa_chiave>mappa.chiave
chiave|=|mappe/mappeService.ts:744+2|299|2
mappa_chiave|=|mappe/percorsiMappe.ts:49|6|2||>mappa.chiave
# mappa_dedalo (26) fk: area_dedalo_chiave>area_dedalo.chiave mappa_chiave>mappa.chiave
mappa_chiave|=|dungeonService.ts:122|6|1||>mappa.chiave
area_dedalo_chiave|21|dungeonService.ts:122|0|1||>area_dedalo.chiave
nota|=|dungeonService.ts:122|68|1
# mappa_percorso (317) fk: mappa_chiave>mappa.chiave
mappa_chiave|=|mappe/percorsiMappe.ts:49|6|4||>mappa.chiave
chiave|=|mappe/percorsiMappe.ts:49|299|4
nome|=|mappe/percorsiMappe.ts:67|289|4
# mappa_presentazione (227) fk: mappa_chiave>mappa.chiave
mappa_chiave|=|mappe/mappeService.ts:125|6|5||>mappa.chiave
contesti_json|47|mappe/mappeService.ts:125|0|4
# negoziazione_domanda (270)
chiave|=|negoziazioneService.ts:40|299|1
ordine|=|negoziazioneService.ts:40|85|1
# negoziazione_importazione (1)
chiave|=|negoziazioneService.ts:205|299|1
versione_formato|=|negoziazioneService.ts:205|0|1
fonti_json|=|negoziazioneService.ts:205|1|1
input_runtime_json|=|—|0|1|senza lettore
rapporto_json|=|negoziazioneService.ts:205|0|1
creata_il|=|negoziazioneService.ts:205|2|1
# negoziazione_risposta (1522) fk: variante_chiave>negoziazione_variante.chiave
chiave|=|negoziazioneService.ts:42*|299|1
variante_chiave|=|negoziazioneService.ts:42|0|1||>negoziazione_variante.chiave
testo|1443|negoziazioneService.ts:42*|168|1
testo_originale|=|negoziazioneService.ts:42*|1|1
testo_origine|=|negoziazioneService.ts:42*|1|1
testo_disponibile|1519|negoziazioneService.ts:42*|1|1
ordine|=|negoziazioneService.ts:42|85|1
corrispondenze_json|1254|negoziazioneService.ts:42*|0|1
# negoziazione_umore (4)
umore|=|negoziazioneService.ts:96|4|1
nome|=|negoziazioneService.ts:96|289|1
descrizione|=|negoziazioneService.ts:96|39|1
esempi_json|=|negoziazioneService.ts:96|0|1
da_evitare_json|=|negoziazioneService.ts:96|0|1
fonte|=|negoziazioneService.ts:96|56|1
versione_fonte|=|—|0|1|senza lettore
# negoziazione_variante (507) fk: domanda_chiave>negoziazione_domanda.chiave
chiave|=|negoziazioneService.ts:41*|299|1
domanda_chiave|=|negoziazioneService.ts:41|0|1||>negoziazione_domanda.chiave
testo|495|negoziazioneService.ts:41*|168|1
testo_originale|=|negoziazioneService.ts:41*|1|1
testo_origine|=|negoziazioneService.ts:41*|1|1
fonte|=|negoziazioneService.ts:41*|56|1
versione_fonte|=|negoziazioneService.ts:41*|0|1
localizzatore|=|negoziazioneService.ts:41*|1|1
ordine|=|negoziazioneService.ts:41|85|1
note_json|=|negoziazioneService.ts:41*|0|1
# negoziazione_verdetto (3970) fk: risposta_chiave>negoziazione_risposta.chiave
chiave|=|negoziazioneService.ts:43*|299|1
risposta_chiave|=|negoziazioneService.ts:43*|0|1||>negoziazione_risposta.chiave
umore|=|negoziazioneService.ts:43*|4|1
esito|2364|negoziazioneService.ts:43*|65|1
incerto|9|negoziazioneService.ts:43*|13|1
fonte|=|negoziazioneService.ts:43*|56|1
versione_fonte|=|negoziazioneService.ts:43*|0|1
localizzatore|=|negoziazioneService.ts:43*|1|1
alternativa|4|negoziazioneService.ts:43*|3|1
valore_grezzo|=|negoziazioneService.ts:43*|1|1
colore_grezzo|0|negoziazioneService.ts:43*|0|1
origine_indicata_fonte|2364|negoziazioneService.ts:43*|0|1
# negozio (62) fk: listino_condiviso>negozio.chiave sede_chiave>luogo.chiave confidente_chiave>confidente.chiave luogo_chiave>quartiere.chiave
chiave|=|sc:copertura-accesso.ts:26+29|299|18
ordine|61|attivitaService.ts:80+12|85|8
nome|=|db:acquistiLegacy.ts:91+19|289|9
luogo|61|azioniStrutturateService.ts:82+9|57|8
luogo_chiave|61|catalogoOggettiLetture.ts:162+8|6|4|copia|copia del quartiere della sede (luogo.quartiere_chiave, 61/61)
tipo|=|mappe/mappeService.ts:1480+6|156|13
gestore|7|catalogoService.ts:103*+4|5|1
confidente_chiave|3|condizioni/contestoConversione.ts:73+5|5|2||>confidente.chiave
note|61|catalogoService.ts:103*+4|75|5
fonte|61|catalogoService.ts:103*+4|56|7
origine|=|catalogoService.ts:349+4|27|11
nascosto|1|sc:copertura-accesso.ts:26+18|16|7
seed_json|4|catalogoService.ts:103*+4|0|6
updated_at|12|catalogoService.ts:103*+4|3|11
condizioni_json|0|richiesteService.ts:260+5|3|10
orari_json|61|negoziService.ts:45+4|2|5
sede_chiave|61|azioniStrutturateService.ts:82+11|10|6||>luogo.chiave
programma_punti_json|2|r:condizioni.ts:51+5|2|1
eccezione_orari_json|4|negoziService.ts:45+4|2|2
listino_condiviso|0|catalogoOggettiLetture.ts:148+6|0|2||>negozio.chiave
sblocco_json|2|luoghiService.ts:107+4|2|3
# negozio_luogo_extra (4) fk: luogo_chiave>luogo.chiave negozio_chiave>negozio.chiave
negozio_chiave|=|catalogoOggettiLetture.ts:162+2|9|3||>negozio.chiave
luogo_chiave|=|catalogoOggettiLetture.ts:162+2|6|3||>luogo.chiave
# negozio_sede_spillo (4) fk: negozio_chiave>negozio_luogo_extra.negozio_chiave luogo_chiave>negozio_luogo_extra.luogo_chiave spillo_uid>spillo.uid
spillo_uid|=|listiniCondivisi.ts:35+2|7|2||>spillo.uid
negozio_chiave|=|listiniCondivisi.ts:35+2|9|3||>negozio_luogo_extra.negozio_chiave
luogo_chiave|=|listiniCondivisi.ts:35+2|6|3||>negozio_luogo_extra.luogo_chiave
# nota_storica (4)
chiave|=|noteStoricheService.ts:41|299|3
testo|=|noteStoricheService.ts:41|168|3
fonte|=|noteStoricheService.ts:41|56|3
versione|=|noteStoricheService.ts:41|61|3
seed_json|=|noteStoricheService.ts:41|0|3
updated_at|=|—|3|3|solo scritta
# nota_storica_legame (14) fk: nota_chiave>nota_storica.chiave
nota_chiave|=|noteStoricheService.ts:41|0|3||>nota_storica.chiave
tipo|=|noteStoricheService.ts:42|156|3
chiave|=|noteStoricheService.ts:42|299|3
# oggetto (223) fk: catalogo_chiave>catalogo_oggetto.chiave
id|=|catalogoOggettiLetture.ts:91+2|163|1
nome|=|compendioService.ts:346+1|289|1
categoria|=|compendioService.ts:439+1|44|1
vincolo|98|catalogoOggettiRiferimenti.ts:66*+1|3|1
descrizione|=|compendioService.ts:346+1|39|1
catalogo_chiave|=|catalogoOggettiLetture.ts:91+2|4|0||>catalogo_oggetto.chiave
```

```
# ombra (131) fk: persona_id>persona.id
chiave|=|catturePersona.ts:32+4|299|3
nome|=|catturePersona.ts:60+4|289|3
nomi_altri_json|9|ombreService.ts:145*+2|0|3
persona_id|126|catturePersona.ts:32+3|26|2||>persona.id
maschera_nota|1|ombreService.ts:145*+2|0|2
personalita|=|negoziazioneService.ts:185+3|5|3
catturabile|125|catturePersona.ts:60+3|6|2
negoziabile|117|negoziazioneService.ts:185+3|2|3
nome_negoziazione|0|ombreService.ts:145*+2|0|1
affinita_proprie_json|8|ombreService.ts:145*+2|0|2
livello|3|ombreService.ts:145*+2|55|3
note|78|ombreService.ts:145*+2|75|3
origine|=|ombreService.ts:145*+2|27|3
seed_json|0|ripristinoService.ts:140+2|0|3
updated_at|=|ripristinoService.ts:140+2|3|3
# ombra_luogo (247) fk: infiltrazione_chiave>dungeon_area.chiave dungeon_chiave>dungeon.chiave ombra_chiave>ombra.chiave
id|=|ombreService.ts:123|163|3
ombra_chiave|=|ombreService.ts:121|0|3||>ombra.chiave
dungeon_chiave|=|ombreService.ts:121|0|3||>dungeon.chiave
infiltrazione_chiave|152|ombreService.ts:121|0|3||>dungeon_area.chiave
fonte|=|ombreService.ts:121|56|3
# ombra_voce (170) fk: ombra_chiave>ombra.chiave voce_chiave>punto_interesse.chiave
voce_chiave|=|catturePersona.ts:32+1|0|2||>punto_interesse.chiave
ombra_chiave|=|catturePersona.ts:32+1|0|3||>ombra.chiave
# operazione_effetti_voce (188)
id|=|motoreDiario.ts:456|163|4
voce_uid|=|—|8|4|solo scritta
payload_json|=|motoreDiario.ts:456|0|4
prima_json|=|—|0|4|solo scritta
dopo_json|=|motoreDiario.ts:456|0|4
creata_il|=|—|2|4|solo scritta
# persona (259) fk: deriva_da>persona.id forma_di>persona.id arcana>arcana.chiave
id|=|r:condizioni.ts:70+21|163|11
nome|=|r:condizioni.ts:67+19|289|8
arcana|=|r:condizioni.ts:67+10|16|3||>arcana.chiave
livello|=|compendioService.ts:318+7|55|5
eredita|250|fusione/eredita.ts:69+1|4|3
speciale|24|fusione/motoreFusione.ts:72+2|15|3
rara|9|fusione/motoreFusione.ts:72+3|10|3
dlc|25|fusione/fusioneService.ts:45+3|7|3
richiede_confidente_max|21|compendioService.ts:318*|3|3
nota|8|compendioService.ts:318*|68|4
oggetto|232|compendioService.ts:318*|56|3
oggetto_allarme|232|compendioService.ts:318*|1|3
oggetto_e_carta|114|compendioService.ts:318*|0|3
tratto|=|fusione/eredita.ts:69+2|13|4
forza|=|partiteService.ts:622+2|10|4
magia|=|partiteService.ts:622+2|4|4
resistenza|=|partiteService.ts:622+2|9|4
agilita|=|partiteService.ts:623+2|4|4
fortuna|=|partiteService.ts:623+2|18|4
aree_mementos_json|108|compendioService.ts:318*|0|4
piani_mementos|108|compendioService.ts:318*|1|4
descrizione|232|compendioService.ts:318*|39|5
fonte_descrizione|232|compendioService.ts:318*|1|3
del_party|27|r:condizioni.ts:70+6|2|4
personaggio|29|compendioService.ts:318*|8|2
forma|27|compendioService.ts:318*|41|3
forma_di|18|compendioService.ts:318*|0|2||>persona.id
deriva_da|18|compendioService.ts:318*|1|2||>persona.id
chiave_forma|27|ricerca/indiceRicerca.ts:193+1|0|2
forma_condizioni_json|18|compendioService.ts:318*|0|2
origine|=|compendioService.ts:318*|27|3
seed_json|0|compendioService.ts:318*|0|2
updated_at|0|compendioService.ts:318*|3|5
# persona_affinita (2590) fk: persona_id>persona.id
persona_id|=|affinitaPersonaService.ts:30+3|26|3||>persona.id
elemento|=|affinitaPersonaService.ts:30+3|60|3
codice|=|affinitaPersonaService.ts:30+3|18|3
origine|=|affinitaPersonaService.ts:30+1|27|1
seed_codice|=|affinitaPersonaService.ts:30+1|0|1|copia|copia di persona_affinita.codice presa alla prima correzione (per Ripristina)
# persona_area_dedalo (827) fk: area_dedalo_chiave>area_dedalo.chiave voce_chiave>punto_interesse.chiave
voce_chiave|=|dungeonService.ts:104+1|0|2||>punto_interesse.chiave
area_dedalo_chiave|=|dungeonService.ts:104+1|0|2||>area_dedalo.chiave
# persona_skill (2125) fk: skill_id>skill.id persona_id>persona.id
persona_id|=|compendioService.ts:314+4|26|3||>persona.id
skill_id|=|compendioService.ts:314+4|1|3||>skill.id
livello|1231|compendioService.ts:334+4|55|3
modo|=|compendioService.ts:334+1|30|2
# pezzo_mappa (24) fk: mappa_chiave>mappa.chiave
id|=|mappe/pezziMappa.ts:106+1|163|2
uid|=|mappe/pezziMappa.ts:227+1|36|2
mappa_chiave|=|mappe/pezziMappa.ts:106|6|2||>mappa.chiave
nome|=|mappe/pezziMappa.ts:106*|289|2
sorgente_x|=|mappe/pezziMappa.ts:106*|0|2
sorgente_y|=|mappe/pezziMappa.ts:106*|0|2
larghezza|=|mappe/pezziMappa.ts:106*|38|2
altezza|=|mappe/pezziMappa.ts:106*|44|2
ordine|15|mappe/pezziMappa.ts:106+1|85|2
updated_at|=|pacchetto/pacchettoGioco.ts:222+1|3|2
# proposta_abbinamento (87) fk: catalogo_chiave>catalogo_oggetto.chiave
riga_tipo|=|catalogoOggettiFusione.ts:107+3|1|6
riga_chiave|=|catalogoOggettiFusione.ts:107+3|1|6
gruppo|57|catalogoOggettiFusione.ts:107+3|43|6
catalogo_chiave|=|catalogoOggettiFusione.ts:107+3|4|6||>catalogo_oggetto.chiave
quantita|=|catalogoOggettiFusione.ts:171+3|12|5
motivo|=|catalogoOggettiFusione.ts:170*+3|48|5
certezza|=|catalogoOggettiFusione.ts:170*+3|4|3
stato|=|catalogoOggettiFusione.ts:171+3|136|5
modifica_json|42|catalogoOggettiFusione.ts:107+3|0|3
fonte_snapshot_json|=|snapshotProposteOggetti.ts:93+3|0|3
nota|30|catalogoOggettiFusione.ts:170*+3|68|4
updated_at|=|catalogoOggettiFusione.ts:170*+3|3|6
# proposta_effetto_voce (20) fk: voce_uid>voce_giornata.uid
id|=|motoreDiario.ts:443|163|2
voce_uid|=|motoreDiario.ts:443|8|2||>voce_giornata.uid
tipo|=|motoreDiario.ts:443*|156|2
chiave|=|motoreDiario.ts:443*|299|2
gruppo|=|motoreDiario.ts:443*|43|1
dati_json|=|motoreDiario.ts:443*|0|2
motivo|=|motoreDiario.ts:443*|48|2
certezza|=|motoreDiario.ts:443*|4|1
stato|=|motoreDiario.ts:466|136|2
updated_at|=|motoreDiario.ts:443*|3|2
# proposta_infiltrazione_voce (102) fk: infiltrazione_chiave>dungeon_area.chiave
voce_uid|=|giornataService.ts:245+1|8|2
ordine|65|giornataService.ts:245+1|85|2
infiltrazione_chiave|=|giornataService.ts:244+1|0|2||>dungeon_area.chiave
regola|=|—|48|1|senza lettore
motivo|=|giornataService.ts:244|48|2
certezza|=|giornataService.ts:244|4|2
# punto_interesse (959) fk: planimetria_chiave>mappa.chiave area_dedalo_chiave>area_dedalo.chiave contenitore_chiave>punto_interesse.chiave area_chiave>dungeon_area.chiave
chiave|=|sc:copertura-accesso.ts:31+21|299|20
area_chiave|=|catalogoOggettiService.ts:50+18|4|16||>dungeon_area.chiave
ordine|862|catalogoOggettiProposte.ts:237+13|85|8
tipo|=|condizioni/nomiCondizioni.ts:111+13|156|9
nome|=|catalogoOggettiService.ts:50+16|289|8
descrizione|778|dungeonService.ts:1268+9|39|5
esauribile|232|dungeonService.ts:292+9|3|1
dettagli_json|412|catturePersona.ts:60+8|0|6
fonte|=|dungeonService.ts:1033+7|56|5
contenitore_chiave|81|condizioni/nomiCondizioni.ts:113+9|0|3||>punto_interesse.chiave
area_dedalo_chiave|71|condizioni/nomiCondizioni.ts:113+12|0|8||>area_dedalo.chiave
carattere|0|catalogoOggettiProposte.ts:69*+7|15|5
planimetria_chiave|0|catalogoOggettiProposte.ts:69*+7|0|1||>mappa.chiave
# quartiere (24)
chiave|=|r:condizioni.ts:80+21|299|13
ordine|23|r:condizioni.ts:80+8|85|7
nome|=|r:condizioni.ts:80+18|289|11
descrizione|=|ripristino/righe.ts:66+4|39|2
fonte|=|cittaService.ts:98*+3|56|8
sblocco_data|7|condizioni/contestoConversione.ts:56+5|1|3
condizioni_json|23|attivitaService.ts:136+6|3|7
fonte_condizioni_json|23|cittaService.ts:59+4|0|4
condizioni_guida_json|23|cittaService.ts:59+3|0|3|copia|copia delle condizioni della guida per Ripristina
fonte_condizioni_guida_json|23|cittaService.ts:89+3|0|3|copia|copia della fonte della guida per Ripristina
origine|=|cittaService.ts:98*+3|27|7
seed_json|0|ripristinoService.ts:140+3|0|7
updated_at|0|ripristinoService.ts:140+3|3|6
# quartiere_ingresso (2) fk: area_chiave>area.chiave mappa_chiave>mappa.chiave quartiere_chiave>quartiere.chiave
quartiere_chiave|=|cittaService.ts:136+2|2|4||>quartiere.chiave
mappa_chiave|=|mappe/accessoMondoService.ts:70+2|6|3||>mappa.chiave
x|=|mappe/accessoMondoService.ts:70+2|141|3
y|=|mappe/accessoMondoService.ts:70+2|86|2
zoom|=|mappe/accessoMondoService.ts:70+2|20|1
area_chiave|=|mappe/areeService.ts:121+2|4|3||>area.chiave
# regola_pesca (1)
chiave|=|regolePescaService.ts:8+1|299|1
versione|=|regolePescaService.ts:8*|61|1
nome|=|regolePescaService.ts:8*|289|1
dati_json|=|regolePescaService.ts:8*|0|1
fonti_json|=|regolePescaService.ts:8*|1|1
origine|=|regolePescaService.ts:8*|27|1
seed_json|0|regolePescaService.ts:8*|0|1
updated_at|=|regolePescaService.ts:8*|3|1
# ricetta_materiale (23) fk: catalogo_chiave>catalogo_oggetto.chiave
ricetta|=|catalogoOggettiLetture.ts:229+4|12|1
catalogo_chiave|=|catalogoOggettiFusione.ts:23+4|4|1||>catalogo_oggetto.chiave
quantita|=|catalogoOggettiLetture.ts:229+4|12|1
# richiesta (33) fk: area_dedalo_chiave>area_dedalo.chiave confidente_chiave>confidente.chiave area_chiave>dungeon_area.chiave
chiave|=|azioniStrutturateService.ts:106+12|299|4
ordine|32|azioniStrutturateService.ts:171+4|85|3
nome|=|azioniStrutturateService.ts:106+10|289|4
committente|=|azioniStrutturateService.ts:171+2|3|1
disponibile_dal|=|richiesteService.ts:23*+1|4|1
scadenza|=|richiesteService.ts:23*+1|10|1
area|=|richiesteService.ts:23*+1|110|4
area_chiave|=|dungeonService.ts:249+4|4|3||>dungeon_area.chiave
piano|=|richiesteService.ts:23*+1|19|2
bersaglio_json|=|richiesteService.ts:23*+1|0|1
ricompense_json|=|fontiRicompenseOggetti.ts:31+2|0|1
confidente_chiave|21|richiesteService.ts:23+1|5|2||>confidente.chiave
confidente_rango|13|richiesteService.ts:23*+1|2|1
note|=|richiesteService.ts:23*+1|75|1
fonte|=|richiesteService.ts:23*+1|56|2
area_dedalo_chiave|32|dungeonService.ts:249+3|0|2||>area_dedalo.chiave
# ricompensa_oggetto (171) fk: catalogo_chiave>catalogo_oggetto.chiave
fonte_tipo|=|catalogoOggettiLetture.ts:215+6|1|3
fonte_chiave|=|catalogoOggettiLetture.ts:214+6|1|3
catalogo_chiave|=|catalogoOggettiFusione.ts:23+4|4|3||>catalogo_oggetto.chiave
quantita|161|catalogoOggettiLetture.ts:214+4|12|2
ordine|106|catalogoOggettiLetture.ts:216+3|85|2
nota|154|catalogoOggettiLetture.ts:214+3|68|3
# settimana_guida (42)
numero|41|calendarioService.ts:54|65|1
titolo|=|calendarioService.ts:54|189|2
periodo|=|calendarioService.ts:54|3|1
url|=|calendarioService.ts:54|27|1
riassunto|=|calendarioService.ts:54|4|2
incertezze|=|calendarioService.ts:54|3|1
# skill (525)
id|=|r:condizioni.ts:71+12|163|4
nome|=|r:condizioni.ts:71+11|289|4
elemento|=|fusione/eredita.ts:57+5|60|3
costo_tipo|=|ripristino/righePersona.ts:94+1|0|1
costo_valore|243|ripristino/righePersona.ts:94+1|0|1
effetto|=|fusione/fusioneService.ts:355+2|52|1
fonte_carta|59|compendioService.ts:98*|1|1
negoziazione|120|compendioService.ts:341|10|1
unica|99|fusione/eredita.ts:57+1|48|2
origine|=|compendioService.ts:98*|27|1
seed_json|0|compendioService.ts:98*|0|1
updated_at|0|compendioService.ts:98*|3|4
# skill_fonte_esecuzione (114) fk: persona_id>persona.id skill_id>skill.id
skill_id|=|compendioService.ts:340|1|1||>skill.id
persona_id|=|compendioService.ts:340|26|1||>persona.id
# spillo (1912) fk: area_guida_chiave>dungeon_area.chiave mappa_chiave>mappa.chiave
id|=|atterraggioPalazziService.ts:58+25|163|28
mappa_chiave|1758|atterraggioPalazziService.ts:92+19|6|14||>mappa.chiave
tipo|=|catalogoOggettiService.ts:65+13|156|10
nome|=|atterraggioPalazziService.ts:58+17|289|8
descrizione|838|dungeonService.ts:1584+11|39|4
x|=|dungeonService.ts:1584+11|141|10
y|=|dungeonService.ts:1584+11|86|4
riferimento_tipo|494|azioniStrutturateService.ts:81+24|0|10
riferimento_chiave|494|azioniStrutturateService.ts:81+24|0|10
collezionabile|474|dungeonService.ts:197+11|5|3
ordine|1041|condizioni/nomiCondizioni.ts:91+12|85|6
origine|=|dungeonService.ts:1052+11|27|8
updated_at|=|dungeonService.ts:1052+9|3|7
condizioni_json|173|mappe/areeService.ts:237+12|3|5
seed_identita_json|174|mappe/areeService.ts:237+10|0|2
solo_posizione|0|mappe/contenutiGuidaService.ts:85+10|1|1
area_guida_chiave|154|dungeonService.ts:753+10|0|1||>dungeon_area.chiave
ruolo_guida|154|mappe/contenutiGuidaService.ts:84+10|0|1
nativo_json|1109|condizioni/nomiCondizioni.ts:89*+9|0|1
uid|=|cestinoService.ts:733+16|36|8
# spillo_destinazione (223) fk: spillo_arrivo_id>spillo.id mappa_chiave>mappa.chiave spillo_id>spillo.id
spillo_id|=|dungeonService.ts:1055+6|13|4||>spillo.id
mappa_chiave|=|mappe/areeService.ts:246+6|6|4||>mappa.chiave
x|0|dungeonService.ts:1056*+2|141|4
y|0|dungeonService.ts:1056*+2|86|2
zoom|=|dungeonService.ts:1056*+2|20|2
spillo_arrivo_id|24|mappe/destinazioniSpillo.ts:84+4|0|1||>spillo.id
# spillo_immagine (0) fk: spillo_id>spillo.id
id|0|dungeonService.ts:1057+3|163|1
spillo_id|0|dungeonService.ts:1057+4|13|1||>spillo.id
ordine|0|dungeonService.ts:1057+3|85|1
immagine_chiave|0|dungeonService.ts:1057+4|0|1
asset|0|dungeonService.ts:1057+4|48|1
didascalia|0|dungeonService.ts:1057+3|6|1
updated_at|0|mappe/fotografiaLuogoDaPin.ts:193*+2|3|1
# spillo_voce (539) fk: voce_chiave>punto_interesse.chiave spillo_id>spillo.id
spillo_id|=|dungeonService.ts:143+9|13|7||>spillo.id
voce_chiave|=|dungeonService.ts:143+8|0|7||>punto_interesse.chiave
# tesoro (9) fk: persona_id>persona.id
persona_id|=|compendioService.ts:242+1|26|1||>persona.id
ordine|8|compendioService.ts:242+1|85|1
# tesoro_modificatore (216) fk: tesoro_id>tesoro.persona_id arcana>arcana.chiave
arcana|=|compendioService.ts:244+1|16|1||>arcana.chiave
tesoro_id|=|compendioService.ts:244+1|0|1||>tesoro.persona_id
modificatore|=|compendioService.ts:244+1|3|1
# traduzione (2053)
ambito|=|ripristino/righePersona.ts:95+1|24|7
chiave|=|ripristino/righePersona.ts:95+1|299|7
testo|=|ripristino/righePersona.ts:95+1|168|7
extra_json|101|traduzioniService.ts:34|0|3
fonte|=|traduzioniService.ts:34|56|5
updated_at|=|traduzioniService.ts:34|3|6
# trasformazione_oggetto (8) fk: anello_chiave>catalogo_oggetto.chiave cristallo_chiave>catalogo_oggetto.chiave dungeon_chiave>dungeon.chiave
dungeon_chiave|=|ripristino/righe.ts:176+2|0|2||>dungeon.chiave
cristallo_chiave|=|ripristino/righe.ts:184+2|0|2||>catalogo_oggetto.chiave
anello_chiave|=|ripristino/righe.ts:184+2|0|2||>catalogo_oggetto.chiave
solo_ng_plus|1|ripristino/righe.ts:184+2|0|2
fonte|=|ripristino/righe.ts:184+2|56|2
origine|=|ripristinoService.ts:435*+1|27|2
seed_json|0|ripristinoService.ts:140+1|0|2
updated_at|0|ripristinoService.ts:140+1|3|2
# trofeo (53)
chiave|=|completamentoService.ts:40+3|299|2
ordine|52|completamentoService.ts:31+3|85|2
nome|=|ricerca/indiceRicerca.ts:333+3|289|2
nome_en|=|ricerca/indiceRicerca.ts:333+3|2|2
tipo|=|ripristino/righe.ts:116+2|156|2
descrizione|=|ripristino/righe.ts:116+2|39|2
come|=|ripristino/righe.ts:116+2|201|2
mancabile|0|ripristino/righe.ts:116+2|1|2
quando|16|ripristino/righe.ts:116+2|131|2
fonte|=|ripristino/righe.ts:116+2|56|2
verificato|=|ripristino/righe.ts:116+2|16|2
origine|=|completamentoService.ts:31*+1|27|1
seed_json|0|ripristinoService.ts:140+1|0|1
updated_at|0|ripristinoService.ts:140+1|3|2
# voce_confluenza (47) fk: infiltrazione_chiave>dungeon_area.chiave voce_canonica>punto_interesse.chiave voce_chiave>punto_interesse.chiave
voce_chiave|=|—|0|1|senza lettore|>punto_interesse.chiave
azione|=|dungeonService.ts:124|56|1
voce_canonica|9|—|0|1|senza lettore|>punto_interesse.chiave
tipo_precedente|=|—|0|1|senza lettore
infiltrazione_chiave|=|—|0|1|senza lettore|>dungeon_area.chiave
nota|10|—|68|1|senza lettore
carattere_precedente|0|—|0|1|senza lettore
ordine_precedente|37|—|0|1|senza lettore
# voce_effetto (471) fk: voce_uid>voce_giornata.uid
uid|=|acquistiService.ts:36+4|36|7
voce_uid|=|acquistiService.ts:36+5|8|7||>voce_giornata.uid
ordine|136|acquistiService.ts:101+4|85|6
tipo|=|giornataService.ts:206+5|156|7
chiave|=|giornataService.ts:206+4|299|7
dati_json|=|invitiScritture.ts:165+5|0|5
origine|=|acquistiService.ts:90*+3|27|4
updated_at|=|acquistiService.ts:90*+3|3|5
# voce_effetto_transizione (1004) fk: voce_uid>voce_giornata.uid
voce_uid|=|acquistiService.ts:101+1|8|6||>voce_giornata.uid
stato|=|acquistiService.ts:101*+1|136|5
raw_json|265|motoreDiario.ts:61+1|0|2
motivo|0|acquistiService.ts:101*+1|48|4
impronta|=|acquistiService.ts:101*+1|0|5
aggiornata_il|=|acquistiService.ts:101*+1|0|5
# voce_giornata (1004)
uid|=|r:condizioni.ts:110+10|36|22
data|=|r:condizioni.ts:110+9|75|19
fascia|=|r:condizioni.ts:110+8|44|12
ordine|484|r:condizioni.ts:110+6|85|20
genere|=|giornataService.ts:444+3|8|8
azione|=|r:condizioni.ts:110+7|56|16
note|533|acquistiService.ts:101*+2|75|14
tipo|=|acquistiService.ts:101*+2|156|16
riferimento_tipo|489|giornataService.ts:444+3|0|13
riferimento_chiave|489|giornataService.ts:441+3|0|13
riferimento_testo|456|richiesteService.ts:219+3|4|10
rango_atteso|201|acquistiService.ts:101*+2|6|5
produce_json|265|acquistiService.ts:101*+2|0|6|copia|copia di voce_effetto (265/265 con righe)
indice_guida|643|acquistiService.ts:101*+2|0|6
created_at|=|acquistiService.ts:101*+2|6|6
updated_at|=|acquistiService.ts:101*+2|3|15
da_rivedere|0|acquistiService.ts:101*+2|4|8
aggiunta_da|9|acquistiService.ts:101*+2|1|4
testo_precedente_json|14|acquistiService.ts:101*+2|0|6
motivo_revisione|1|acquistiService.ts:101*+2|1|6
# voce_infiltrazione (19) fk: infiltrazione_chiave>dungeon_area.chiave
voce_uid|=|apertureDedaliService.ts:17+2|8|2
ordine|0|giornataService.ts:239+1|85|2
infiltrazione_chiave|=|apertureDedaliService.ts:16+2|0|2||>dungeon_area.chiave
# voce_oggetto (152) fk: catalogo_chiave>catalogo_oggetto.chiave voce_chiave>punto_interesse.chiave
voce_chiave|=|catalogoOggettiLetture.ts:199+4|0|2||>punto_interesse.chiave
catalogo_chiave|=|catalogoOggettiFusione.ts:23+4|4|2||>catalogo_oggetto.chiave
quantita|=|catalogoOggettiLetture.ts:199+4|12|2
ordine|16|catalogoOggettiLetture.ts:201+2|85|1
nota|30|catalogoOggettiLetture.ts:199+2|68|2
```

## 5. Colonne delle partite (`partite.db`, schema `utente`)

483 colonne, 64 tabelle. Stesso formato di §4.

```
# acquisto_legacy_associazione (7) fk: valutazione_id>acquisto_legacy_valutazione.id partita_id>acquisto_partita.partita_id articolo_chiave>acquisto_partita.articolo_chiave
partita_id|=|db:acquistiLegacy.ts:182|96|0||>acquisto_partita.partita_id
articolo_chiave|=|db:acquistiLegacy.ts:182|2|0||>acquisto_partita.articolo_chiave
valutazione_id|=|db:acquistiLegacy.ts:182*|0|0||>acquisto_legacy_valutazione.id
# acquisto_legacy_continuita (1)
id|=|db:acquistiLegacy.ts:136|163|0
formato|=|db:acquistiLegacy.ts:136*|14|0
origine|=|db:acquistiLegacy.ts:136*|27|0
presenze_json|=|db:acquistiLegacy.ts:136*|0|0
firma|=|db:acquistiLegacy.ts:136*|6|0
creata_il|=|db:acquistiLegacy.ts:136*|2|0
# acquisto_legacy_raccordo (0) fk: valutazione_id>acquisto_legacy_valutazione.id
acquisto_id|0|db:acquistiLegacy.ts:197|2|0
partita_id|0|db:acquistiLegacy.ts:197*|96|0
articolo_chiave|0|db:acquistiLegacy.ts:197*|2|0
valutazione_id|0|db:acquistiLegacy.ts:197*|0|0||>acquisto_legacy_valutazione.id
# acquisto_legacy_valutazione (7)
id|=|db:acquistiLegacy.ts:119|163|0
partita_id|=|db:acquistiLegacy.ts:96|96|0
articolo_chiave|=|db:acquistiLegacy.ts:96|2|0
generazione|=|db:acquistiLegacy.ts:96|8|0
presenza_json|=|db:acquistiLegacy.ts:119*|0|0
presenza_firma|=|db:acquistiLegacy.ts:119*|0|0
identita_json|=|db:acquistiLegacy.ts:119*|0|0
prezzo_catalogo|6|db:acquistiLegacy.ts:119*|0|0
contributo_yen|6|db:acquistiLegacy.ts:119*|1|0
stato_prezzo|=|db:acquistiLegacy.ts:119*|1|0
origine|=|db:acquistiLegacy.ts:119*|27|0
creata_il|=|db:acquistiLegacy.ts:119*|2|0
prova_firma|=|db:acquistiLegacy.ts:119*|0|0
# acquisto_operazione (0) fk: partita_id>partita.id
partita_id|0|acquistiService.ts:136+2|96|1||>partita.id
operazione_id|0|acquistiService.ts:136+2|9|1
azione|0|acquistiService.ts:136+1|56|1
payload_json|0|acquistiService.ts:136+1|0|1
ricevuta_json|0|acquistiService.ts:136+1|0|1
created_at|0|acquistiService.ts:222*|6|1
# acquisto_partita (7) fk: partita_id>partita.id
partita_id|=|db:acquistiLegacy.ts:86+5|96|1||>partita.id
articolo_chiave|=|db:acquistiLegacy.ts:86+6|2|1
updated_at|=|db:acquistiLegacy.ts:86+1|3|1
# acquisto_provenienza (0) fk: partita_id>acquisto_registrato.partita_id acquisto_id>acquisto_registrato.id partita_id>partita.id
id|0|acquistiService.ts:19+3|163|2
partita_id|0|acquistiService.ts:19+5|96|1||>acquisto_registrato.partita_id
acquisto_id|0|acquistiService.ts:95+5|2|1||>acquisto_registrato.id
tipo|0|acquistiService.ts:19*+1|156|2
voce_uid|0|acquistiService.ts:95+4|8|2
effetto_uid|0|acquistiService.ts:95+2|5|2
effetto_ordine|0|acquistiService.ts:19*+1|0|1
fonte_json|0|acquistiService.ts:19*+1|0|1
operazione_id|0|acquistiService.ts:19*+1|9|1
created_at|0|acquistiService.ts:19*+1|6|1
# acquisto_registrato (0) fk: partita_id>partita.id
id|0|db:acquistiLegacy.ts:162+5|163|1
partita_id|0|db:acquistiLegacy.ts:162+4|96|1||>partita.id
articolo_chiave|0|db:acquistiLegacy.ts:162+5|2|1
giorno|0|acquistiService.ts:18|91|1
fascia|0|acquistiService.ts:18|44|1
ordine|0|acquistiService.ts:18|85|1
prezzo_yen|0|propostePartitaService.ts:69+1|1|1
identita_json|0|acquistiService.ts:18*|0|1
dati_json|0|propostePartitaService.ts:69+1|0|1
legacy_firma|0|db:acquistiLegacy.ts:162+1|1|1
legacy_raw_json|0|db:acquistiLegacy.ts:162+1|0|1
created_at|0|acquistiService.ts:18*|6|1
# attivita_svolta_partita (8) fk: partita_id>partita.id
partita_id|=|r:condizioni.ts:114+3|96|1||>partita.id
attivita_chiave|=|r:condizioni.ts:114+3|0|1
volte|=|r:condizioni.ts:114+3|37|1
updated_at|=|pescaLetture.ts:107*|3|1
# beneficio_ciclo (0) fk: partita_id>partita.id
partita_id|0|acquistiService.ts:222+2|96|1||>partita.id
causa_tipo|0|propostePartitaService.ts:134+2|0|1
causa_chiave|0|propostePartitaService.ts:134+2|0|1
tipo|0|propostePartitaService.ts:134+2|156|1
chiave|0|propostePartitaService.ts:134+2|299|1
ciclo|0|propostePartitaService.ts:212+2|9|1
attiva|0|propostePartitaService.ts:212+2|100|1
impronta_target|0|propostePartitaService.ts:212+2|0|1
updated_at|0|propostePartitaService.ts:216+2|3|1
# cestino_partite (0)
uid|0|cestinoService.ts:350+2|36|2
registro_json|0|db:acquistiLegacy.ts:242+3|0|1
eliminato_il|0|cestinoService.ts:374*+2|1|1
tipo|0|cestinoService.ts:374+2|156|1
chiave|0|cestinoService.ts:374*+2|299|1
nome|0|cestinoService.ts:374*+2|289|1
contesto|0|cestinoService.ts:374*+2|23|1
partita_id|0|pescaLetture.ts:107+2|96|1
riepilogo_json|0|cestinoService.ts:374*+2|0|1
formato|0|cestinoService.ts:374*+2|14|1
# ciclo_salvato (0) fk: partita_id>partita.id
id|0|cicliSalvatiService.ts:119|163|1
partita_id|0|cicliSalvatiService.ts:147|96|1||>partita.id
persona_id|0|cicliSalvatiService.ts:18|26|1
nome|0|cicliSalvatiService.ts:18*|289|1
note|0|cicliSalvatiService.ts:18*|75|1
anelli_json|0|cicliSalvatiService.ts:18*|0|1
costo|0|cicliSalvatiService.ts:18*|31|1
iterazioni|0|cicliSalvatiService.ts:18*|2|1
anello_corrente|0|cicliSalvatiService.ts:18*|2|1
created_at|0|cicliSalvatiService.ts:18*|6|1
updated_at|0|cicliSalvatiService.ts:18*|3|1
# compendio_partita (53) fk: partita_id>partita.id
partita_id|=|catturePersona.ts:80+5|96|3||>partita.id
persona_id|=|catturePersona.ts:80+5|26|3
registrata|=|catturePersona.ts:80+5|31|3
livello_registrato|14|effettiDiStatoService.ts:81+1|4|3
updated_at|=|partiteService.ts:469|3|2
bonus_forza|0|effettiDiStatoService.ts:82+1|0|1
bonus_magia|0|effettiDiStatoService.ts:82+1|0|1
bonus_resistenza|0|effettiDiStatoService.ts:82+1|0|1
bonus_agilita|0|effettiDiStatoService.ts:82+1|0|1
bonus_fortuna|0|effettiDiStatoService.ts:82+1|2|1
skill_ids_json|14|effettiDiStatoService.ts:82+1|0|1
tratto_skill_id|0|effettiDiStatoService.ts:82+1|2|2
carica|0|effettiDiStatoService.ts:82+1|66|1
osservate_livello|9|effettiDiStatoService.ts:83+1|0|0
osservate_forza|9|effettiDiStatoService.ts:83+1|0|0
osservate_magia|9|effettiDiStatoService.ts:83+1|0|0
osservate_resistenza|9|effettiDiStatoService.ts:83+1|0|0
osservate_agilita|9|effettiDiStatoService.ts:83+1|0|0
osservate_fortuna|9|effettiDiStatoService.ts:83+1|0|0
# confidente_partita (46) fk: partita_id>partita.id
partita_id|=|disponibilitaStrutturataService.ts:41+4|96|1||>partita.id
confidente_chiave|=|disponibilitaStrutturataService.ts:41+4|5|2
sbloccato|13|partiteService.ts:281+1|13|1
rango|13|disponibilitaStrutturataService.ts:41+4|48|2
note|0|partiteService.ts:282|75|1
updated_at|=|partiteService.ts:282|3|1
punti|5|incontriService.ts:147+2|83|2
# cruciverba_partita (3) fk: partita_id>partita.id
partita_id|=|cruciverbaService.ts:23+1|96|1||>partita.id
data|=|cruciverbaService.ts:23+1|75|1
updated_at|=|—|3|1|solo scritta
# da_applicare (0) fk: partita_id>partita.id
id|0|luoghiScritture.ts:112+3|163|5
uid|0|propostePartitaService.ts:151+2|36|3
partita_id|0|acquistiService.ts:222+5|96|3||>partita.id
voce_uid|0|giornataService.ts:186+4|8|3
causa_tipo|0|acquistiService.ts:236+6|0|3
causa_chiave|0|acquistiService.ts:236+6|0|2
tipo|0|motoreDiario.ts:412+3|156|5
chiave|0|luoghiScritture.ts:112+3|299|3
unita|0|propostePartitaService.ts:161+2|11|1
ciclo|0|acquistiService.ts:222*+2|9|1
revisione_causa|0|propostePartitaService.ts:255+2|0|2
delta|0|acquistiService.ts:222*+2|9|1
dati_json|0|acquistiService.ts:222*+2|0|2
motivo|0|acquistiService.ts:222*+2|48|2
stato|0|giornataService.ts:186+4|136|3
verifica|0|acquistiService.ts:222*+2|24|1
chiusa_da|0|propostePartitaService.ts:258+2|1|3
motivo_chiusura|0|propostePartitaService.ts:258+2|2|3
delta_applicato|0|propostePartitaService.ts:161+2|1|1
delta_riconosciuto|0|propostePartitaService.ts:161+2|1|1
applicazione_json|0|acquistiService.ts:222*+2|0|1
proposte_origine_json|0|acquistiService.ts:222*+2|0|1
creata_il|0|acquistiService.ts:222*+2|2|1
decisa_il|0|acquistiService.ts:222*+2|1|3
# divergenza_partita (4) fk: partita_id>partita.id
partita_id|=|divergenzeService.ts:25+2|96|1||>partita.id
spillo_uid|=|divergenzeService.ts:24+3|7|1
voce_chiave|=|divergenzeService.ts:24+3|0|1
rilevata_il|=|divergenzeService.ts:23+1|0|1
# domanda_partita (12) fk: partita_id>partita.id
partita_id|=|domandeService.ts:58+1|96|1||>partita.id
domanda_id|=|domandeService.ts:58+1|1|1
fatta_at|=|—|0|1|solo scritta
# dote_sociale_partita (10) fk: partita_id>partita.id
partita_id|=|partiteService.ts:208+2|96|1||>partita.id
dote_chiave|=|partiteService.ts:208+2|0|1
punti|6|partiteService.ts:207+2|83|1
updated_at|=|partiteService.ts:207+1|3|1
# effetto_applicato (0) fk: partita_id>partita.id
id|0|acquistiService.ts:230+4|163|2
partita_id|0|acquistiService.ts:97+5|96|1||>partita.id
voce_uid|0|acquistiService.ts:97+5|8|2
effetto_uid|0|acquistiService.ts:97+4|5|2
effetto_ordine|0|acquistiService.ts:222*+3|0|1
formato|0|acquistiService.ts:222*+3|14|1
tipo|0|luoghiScritture.ts:113+5|156|2
chiave|0|luoghiScritture.ts:113+4|299|2
prima_json|0|acquistiService.ts:97+3|0|2
ricevuta_json|0|acquistiService.ts:97+4|0|1
creato|0|acquistiService.ts:222*+3|10|1
applicato_il|0|acquistiService.ts:230+4|1|1
annullato_il|0|acquistiService.ts:97+5|1|1
sostituita_da|0|motoreDiario.ts:349+3|2|1
assorbita_da|n.d.|propostePartitaService.ts:283+1|0|1|assente nella copia|colonna del DDL utente 028 (riga 45), non nella copia: vedi §6.4
# effetto_lettura_partita (19) fk: partita_id>partita.id
partita_id|=|attivitaService.ts:378+2|96|1||>partita.id
tipo|=|attivitaService.ts:378+2|156|1
chiave|=|attivitaService.ts:378+2|299|1
ordine|=|attivitaService.ts:378+2|85|1
dote_chiave|=|attivitaService.ts:401+2|0|1
punti|=|attivitaService.ts:401+2|83|1
note|=|motoreDiario.ts:185*+1|75|1
updated_at|=|motoreDiario.ts:185*+1|3|1
# effetto_stato_voce (0) fk: partita_id>partita.id
partita_id|0|r:condizioni.ts:110+1|96|1||>partita.id
voce_uid|0|r:condizioni.ts:110+1|8|1
effetto_uid|0|effettiDiStatoService.ts:100|5|1
tipo|0|r:condizioni.ts:110+1|156|1
chiave|0|r:condizioni.ts:110+1|299|1
prima_json|0|r:condizioni.ts:110+1|0|1
applicato_il|0|effettiDiStatoService.ts:138|1|1
# esame_piazzamento_partita (0) fk: partita_id>partita.id
partita_id|0|piazzamentoEsamiService.ts:21|96|1||>partita.id
esame_chiave|0|piazzamentoEsamiService.ts:21|0|1
piazzamento|0|piazzamentoEsamiService.ts:21|4|1
updated_at|0|—|3|1|solo scritta
# evento_partita (1273) fk: partita_id>partita.id
id|=|pescaStorico.ts:21+1|163|2
partita_id|=|effettiDiStatoService.ts:142+3|96|2||>partita.id
tipo|=|effettiDiStatoService.ts:142+3|156|1
titolo|=|storicoService.ts:17*|189|1
dettaglio|973|storicoService.ts:17*|91|1
dati_json|=|effettiDiStatoService.ts:142+3|0|1
persona_id|152|storicoService.ts:17|26|1
created_at|=|storicoService.ts:17*|6|1
voce_uid|0|effettiDiStatoService.ts:142+1|8|1
# evento_storia_partita (7) fk: partita_id>partita.id
partita_id|=|r:condizioni.ts:104+2|96|2||>partita.id
evento_chiave|=|r:condizioni.ts:104+2|0|3
avvenuto|=|r:condizioni.ts:104+2|7|2
updated_at|=|—|3|2|solo scritta
# fortuna_partita (0) fk: partita_id>partita.id
partita_id|0|fortunaService.ts:24|96|1||>partita.id
dote|0|fortunaService.ts:24|28|1
giorno|0|fortunaService.ts:24|91|1
acceso_il|0|—|0|1|solo scritta
da_voce|0|fortunaService.ts:66|4|1
prima_json|0|fortunaService.ts:66|0|1
# incontro_confidente_partita (50) fk: partita_id>partita.id
id|=|azioniStrutturateService.ts:40+1|163|3
partita_id|=|azioniStrutturateService.ts:40+1|96|2||>partita.id
confidente_chiave|=|azioniStrutturateService.ts:40+1|5|2
data|=|azioniStrutturateService.ts:40+1|75|2
fascia|=|azioniStrutturateService.ts:40+1|44|2
verso_rango|=|azioniStrutturateService.ts:40+1|0|2
passaggio|37|azioniStrutturateService.ts:40+1|33|2
origine|=|azioniStrutturateService.ts:40+1|27|2
doti_json|11|incontriService.ts:84*|2|2
created_at|=|incontriService.ts:84*|6|2
punti_prima|4|incontriService.ts:162|0|1
# invito_partita (0) fk: partita_id>partita.id
partita_id|0|effettiDiStatoService.ts:63+2|96|1||>partita.id
invito_chiave|0|effettiDiStatoService.ts:63+3|0|1
voce_uid|0|effettiDiStatoService.ts:140+1|8|1
creato_il|0|—|1|1|solo scritta
# membro_squadra_partita (4) fk: partita_id>partita.id
partita_id|=|partiteService.ts:136+2|96|1||>partita.id
personaggio_chiave|=|partiteService.ts:136+2|0|1
livello|=|squadraService.ts:40|55|1
esperienza|=|squadraService.ts:40|2|1
updated_at|=|squadraService.ts:40|3|1
in_squadra|=|semaforiService.ts:96+1|4|0
# meteo_partita (1) fk: partita_id>partita.id
partita_id|=|meteoService.ts:34|96|1||>partita.id
data|=|meteoService.ts:34|75|1
giorno|=|meteoService.ts:34|91|1
sera|=|meteoService.ts:34|38|1
updated_at|=|—|3|1|solo scritta
# movimento_punti_pesca (0) fk: partita_id>partita.id
id|0|pescaLetture.ts:107*|163|0
partita_id|0|pescaLetture.ts:107+2|96|0||>partita.id
proposta_uid|0|propostePartitaService.ts:129+1|0|0
operazione_id|0|propostePartitaService.ts:129+1|9|0
tipo|0|propostePartitaService.ts:129+1|156|0
causa_tipo|0|propostePartitaService.ts:129+1|0|0
causa_chiave|0|propostePartitaService.ts:129+1|0|0
prima|0|propostePartitaService.ts:129+1|146|0
delta|0|propostePartitaService.ts:129+1|9|0
dopo|0|pescaRipristino.ts:31+2|103|0
creato_il|0|pescaLetture.ts:107*|1|0
```

```
# movimento_yen (0) fk: partita_id>partita.id
id|0|acquistiService.ts:222*+1|163|1
partita_id|0|acquistiService.ts:222+2|96|1||>partita.id
proposta_uid|0|propostePartitaService.ts:128+2|0|1
causa_tipo|0|propostePartitaService.ts:128+2|0|1
causa_chiave|0|propostePartitaService.ts:128+2|0|1
prima|0|propostePartitaService.ts:128+2|146|1
delta|0|propostePartitaService.ts:128+2|9|1
dopo|0|propostePartitaService.ts:128+2|103|1
operazione_id|0|propostePartitaService.ts:128+2|9|1
creato_il|0|acquistiService.ts:222*+1|1|1
# obiettivo_partita (0) fk: partita_id>partita.id
id|0|obiettiviService.ts:131+1|163|1
partita_id|0|obiettiviService.ts:104+1|96|1||>partita.id
persona_id|0|obiettiviService.ts:23+1|26|1
skill_json|0|obiettiviService.ts:23*|0|1
livello_min|0|obiettiviService.ts:23*|4|1
priorita|0|obiettiviService.ts:23*|2|1
stato|0|obiettiviService.ts:104+1|136|1
note|0|obiettiviService.ts:23*|75|1
raggiunto_at|0|obiettiviService.ts:23*|1|1
created_at|0|obiettiviService.ts:23*|6|1
updated_at|0|obiettiviService.ts:23*|3|1
# partita (2)
id|=|r:condizioni.ts:179+41|163|3
nome|=|giornataService.ts:682+2|289|2
note|0|partiteService.ts:49*+1|75|1
attiva|1|cestinoService.ts:520+2|100|1
livello_protagonista|=|fusione/fusioneService.ts:223+4|13|1
data_gioco|=|acquistiService.ts:110+17|24|1
difficolta|=|partiteService.ts:49*+1|4|1
nuova_partita_plus|0|trasformazioniOggetti.ts:9+2|7|1
dlc_posseduti_json|0|fusione/fusioneService.ts:34+2|0|1
allarme_attivo|0|fusione/fusioneService.ts:68+3|9|1
created_at|=|partiteService.ts:49*+1|6|1
updated_at|=|acquistiService.ts:110+2|3|2
fascia_gioco|=|acquistiService.ts:110+7|11|1
yen|1|propostePartitaService.ts:322+3|27|0
# persona_posseduta (7) fk: partita_id>partita.id
id|=|r:partite.ts:372+6|163|3
partita_id|=|r:partite.ts:372+7|96|2||>partita.id
persona_id|=|r:partite.ts:372+7|26|2
livello|=|r:partite.ts:372+4|55|2
forza|0|partiteService.ts:622*|10|2
magia|0|partiteService.ts:622*|4|2
resistenza|0|partiteService.ts:622*|9|2
agilita|0|partiteService.ts:622*|4|2
fortuna|0|partiteService.ts:622*|18|2
tratto_skill_id|0|partiteService.ts:622*|2|2
in_squadra|=|partiteService.ts:622*|4|1
note|0|partiteService.ts:282|75|1
created_at|=|partiteService.ts:622*|6|1
updated_at|=|partiteService.ts:622*|3|1
carica|0|operazioniVellutoService.ts:29+1|66|2
bonus_forza|0|partiteService.ts:622*|0|1
bonus_magia|0|partiteService.ts:622*|0|1
bonus_resistenza|0|partiteService.ts:622*|0|1
bonus_agilita|0|partiteService.ts:622*|0|1
bonus_fortuna|0|partiteService.ts:622*|2|1
osservate_livello|5|partiteService.ts:622*|0|0
osservate_forza|5|partiteService.ts:622*|0|0
osservate_magia|5|partiteService.ts:622*|0|0
osservate_resistenza|5|partiteService.ts:622*|0|0
osservate_agilita|5|partiteService.ts:622*|0|0
osservate_fortuna|5|partiteService.ts:622*|0|0
# persona_posseduta_skill (34) fk: posseduta_id>persona_posseduta.id
posseduta_id|=|fusione/eredita.ts:114+5|4|2||>persona_posseduta.id
slot|=|fusione/eredita.ts:114+2|5|2
skill_id|=|fusione/eredita.ts:114+5|1|2
# pesca_acquisto_esca (0) fk: partita_id>partita.id
id|0|pescaLetture.ts:98+3|163|0
partita_id|0|pescaLetture.ts:98+3|96|0||>partita.id
momento_json|0|pescaLetture.ts:98*|0|0
quantita|0|pescaLetture.ts:98*|12|0
costo_punti|0|pescaLetture.ts:98*|0|0
attivo|0|pescaLetture.ts:98*|106|0
identita_json|0|pescaLetture.ts:98*|0|0
creato_il|0|pescaLetture.ts:98*|1|0
# pesca_cattura (0) fk: osservazione_id>pesca_osservazione.id sessione_id>pesca_sessione.id
id|0|pescaLetture.ts:107+1|163|0
sessione_id|0|pescaLetture.ts:107+1|5|0||>pesca_sessione.id
osservazione_id|0|pescaLetture.ts:107*|2|0||>pesca_osservazione.id
specie|0|pescaLetture.ts:107*|5|0
tentativo|0|pescaLetture.ts:107*|19|0
posizione|0|pescaLetture.ts:107*|46|0
# pesca_fatto_fonte (0) fk: provenienza_id>pesca_provenienza.id cattura_id>pesca_cattura.id sessione_id>pesca_sessione.id partita_id>partita.id
id|0|pescaLetture.ts:19+1|163|0
partita_id|0|pescaLetture.ts:19+1|96|0||>partita.id
evento_chiave|0|pescaLetture.ts:19*|0|0
valore|0|pescaLetture.ts:19*|146|0
momento_json|0|pescaLetture.ts:19*|0|0
sessione_id|0|pescaService.ts:160+1|5|0||>pesca_sessione.id
cattura_id|0|pescaLetture.ts:19*|0|0||>pesca_cattura.id
provenienza_id|0|pescaLetture.ts:19*|3|0||>pesca_provenienza.id
fonte_json|0|pescaLetture.ts:19*|0|0
nota|0|pescaLetture.ts:19*|68|0
operazione_id|0|pescaLetture.ts:19*|9|0
creata_il|0|pescaLetture.ts:19*|2|0
# pesca_operazione (0) fk: partita_id>partita.id
partita_id|0|allocazioniTurniPesca.ts:33+5|96|0||>partita.id
operazione_id|0|allocazioniTurniPesca.ts:33+5|9|0
azione|0|allocazioniTurniPesca.ts:33+2|56|0
payload_json|0|allocazioniTurniPesca.ts:54+2|0|0
ricevuta_json|0|allocazioniTurniPesca.ts:54+5|0|0
creata_il|0|allocazioniTurniPesca.ts:33*+2|2|0
# pesca_osservazione (0) fk: sessione_id>pesca_sessione.id
id|0|pescaLetture.ts:107+1|163|0
sessione_id|0|pescaLetture.ts:58+1|5|0||>pesca_sessione.id
versione|0|pescaLetture.ts:114+1|61|0
corrente|0|pescaLetture.ts:58+1|44|0
dati_json|0|pescaLetture.ts:58*+1|0|0
precedente_id|0|pescaLetture.ts:58*+1|0|0
creata_il|0|pescaLetture.ts:58*+1|2|0
# pesca_provenienza (0) fk: partita_id>pesca_sessione.partita_id sessione_id>pesca_sessione.id partita_id>partita.id
id|0|pescaLetture.ts:18+1|163|0
partita_id|0|partiteService.ts:163+2|96|0||>pesca_sessione.partita_id
sessione_id|0|pescaLetture.ts:18*|5|0||>pesca_sessione.id
tipo|0|pescaLetture.ts:18*|156|0
voce_uid|0|pescaLetture.ts:18*|8|0
effetto_uid|0|pescaLetture.ts:18*|5|0
generazione|0|pescaLetture.ts:18*|8|0
operazione_id|0|pescaLetture.ts:18*|9|0
fonte_json|0|pescaLetture.ts:18*|0|0
creata_il|0|pescaLetture.ts:18*|2|0
# pesca_quota_storica (0) fk: partita_id>partita.id
partita_id|0|pescaLetture.ts:107+1|96|0||>partita.id
firma_contatore|0|pescaLetture.ts:133+1|2|0
quota|0|pescaLetture.ts:133|16|0
sessione_id|0|pescaLetture.ts:121|5|0
turno_uid|0|pescaLetture.ts:107*|0|0
creata_il|0|pescaLetture.ts:107*|2|0
# pesca_sessione (0) fk: turno_uid>turno_partita.uid partita_id>partita.id
id|0|allocazioniTurniPesca.ts:41+4|163|0
partita_id|0|allocazioniTurniPesca.ts:41+4|96|0||>partita.id
attivita_chiave|0|attivitaService.ts:604*+1|0|0
giorno|0|attivitaService.ts:604*+1|91|0
fascia|0|attivitaService.ts:604*+1|44|0
ordine_visita|0|attivitaService.ts:604*+1|5|0
turno_uid|0|allocazioniTurniPesca.ts:41+2|0|0||>turno_partita.uid
turno_ordine|0|allocazioniTurniPesca.ts:41+2|0|0
origine_turno|0|allocazioniTurniPesca.ts:41+2|0|0
turno_revocato_il|0|allocazioniTurniPesca.ts:41+2|0|0
identita_json|0|attivitaService.ts:604*+1|0|0
creata_il|0|attivitaService.ts:604*+1|2|0
# piano_salvato (0) fk: obiettivo_id>obiettivo_partita.id partita_id>partita.id
id|0|pianiSalvatiService.ts:159|163|1
partita_id|0|pianiSalvatiService.ts:169|96|1||>partita.id
persona_id|0|pianiSalvatiService.ts:20|26|1
obiettivo_id|0|obiettiviService.ts:65+1|4|1||>obiettivo_partita.id
nome|0|pianiSalvatiService.ts:19*|289|1
note|0|pianiSalvatiService.ts:19*|75|1
opzioni_json|0|pianiSalvatiService.ts:19*|0|1
skill_json|0|pianiSalvatiService.ts:19*|0|1
piano_json|0|pianiSalvatiService.ts:19*|0|1
costo|0|pianiSalvatiService.ts:19*|31|1
created_at|0|pianiSalvatiService.ts:19*|6|1
updated_at|0|pianiSalvatiService.ts:19*|3|1
# progresso_film_partita (3) fk: partita_id>partita.id
partita_id|=|attivitaService.ts:191+3|96|3||>partita.id
film_chiave|=|attivitaService.ts:191+3|0|3
avanzamento|=|attivitaService.ts:191+3|29|3
updated_at|=|motoreDiario.ts:187*|3|3
# progresso_libro_partita (11) fk: partita_id>partita.id
partita_id|=|attivitaService.ts:190+3|96|3||>partita.id
libro_chiave|=|attivitaService.ts:190+3|0|3
avanzamento|=|attivitaService.ts:190+3|29|3
updated_at|=|motoreDiario.ts:187*|3|3
# progresso_videogioco_partita (0) fk: partita_id>partita.id
partita_id|0|attivitaService.ts:192+3|96|1||>partita.id
videogioco_chiave|0|attivitaService.ts:192+4|0|1
avanzamento|0|attivitaService.ts:192+3|29|1
updated_at|0|motoreDiario.ts:187*|3|1
# proposta_operazione (0) fk: partita_id>partita.id
partita_id|0|acquistiService.ts:222+2|96|1||>partita.id
operazione_id|0|propostePartitaService.ts:115+2|9|1
payload_json|0|propostePartitaService.ts:115+2|0|1
ricevuta_json|0|propostePartitaService.ts:115+2|0|1
created_at|0|acquistiService.ts:222*+1|6|1
# punti_confidente_generazione (0) fk: partita_id>partita.id
partita_id|0|puntiCronologici.ts:60|96|1||>partita.id
confidente_chiave|0|puntiCronologici.ts:60|5|1
generazione|0|puntiCronologici.ts:60|8|1
rango_base|0|puntiCronologici.ts:96|0|1
punti_base|0|puntiCronologici.ts:96|2|1
sbloccato_base|0|puntiCronologici.ts:96|0|1
creata_il|0|—|2|1|solo scritta
# punti_confidente_voce (0) fk: partita_id>partita.id
id|0|puntiCronologici.ts:44|163|1
partita_id|0|motoreDiario.ts:427+1|96|1||>partita.id
confidente_chiave|0|puntiCronologici.ts:44|5|1
voce_uid|0|motoreDiario.ts:427+1|8|1
generazione|0|puntiCronologici.ts:60|8|1
tipo|0|puntiCronologici.ts:44|156|1
o_data|0|puntiCronologici.ts:44|0|1
o_fascia|0|puntiCronologici.ts:44|0|1
o_voce|0|puntiCronologici.ts:44|0|1
o_sub|0|puntiCronologici.ts:44|0|1
parametri_json|0|puntiCronologici.ts:100|0|1
creato_il|0|—|1|1|solo scritta
# punti_negozio_partita (0) fk: partita_id>partita.id
partita_id|0|r:condizioni.ts:115+1|96|1||>partita.id
negozio_chiave|0|r:condizioni.ts:115+2|9|1
punti|0|r:condizioni.ts:115+1|83|1
updated_at|0|—|3|1|solo scritta
# punti_pesca_partita (0) fk: partita_id>partita.id
partita_id|0|pescaLetture.ts:107+3|96|0||>partita.id
saldo|0|pescaLetture.ts:139+3|5|0
updated_at|0|pescaLetture.ts:107*|3|0
# punto_partita (525) fk: partita_id>partita.id
partita_id|=|dungeonService.ts:137+6|96|5||>partita.id
punto_chiave|=|dungeonService.ts:137+6|0|5
stato|=|dungeonService.ts:137+3|136|2
updated_at|=|mappe/fotografiaLuogoDaPin.ts:145*|3|3
automatico|0|mappe/fotografiaLuogoDaPin.ts:145*|8|2
# regalo_partita (0) fk: partita_id>partita.id
partita_id|0|regaliPartita.ts:39+1|96|2||>partita.id
confidente_chiave|0|regaliPartita.ts:38+1|5|2
regalo|0|regaliPartita.ts:38+1|12|2
fatto_at|0|regaliPartita.ts:39+1|0|1
catalogo_chiave|0|catalogoOggettiFusione.ts:218+3|4|1
punti_dati|0|regaliPartita.ts:38*+1|0|1
rango_al_regalo|0|regaliPartita.ts:38*+1|0|1
acquisto_articolo|0|regaliPartita.ts:38*+1|0|1
data_gioco|0|regaliPartita.ts:38*+1|24|1
fascia_gioco|0|regaliPartita.ts:38*+1|11|1
# requisito_partita (0) fk: partita_id>partita.id
partita_id|0|—|96|2|senza lettore|>partita.id
confidente_chiave|0|requisitiConfidentiService.ts:50|5|2
rango|0|requisitiConfidentiService.ts:50|48|2
indice|0|requisitiConfidentiService.ts:50|40|2
confermato|0|—|17|2|senza lettore
updated_at|0|—|3|2|senza lettore
# richiesta_partita (1) fk: partita_id>partita.id
partita_id|=|dungeonService.ts:246+4|96|1||>partita.id
richiesta_chiave|=|dungeonService.ts:246+4|0|1
stato|=|dungeonService.ts:246+4|136|1
updated_at|=|—|3|1|solo scritta
# sessione_videogioco_partita (0) fk: partita_id>partita.id
partita_id|0|attivitaService.ts:210+1|96|0||>partita.id
videogioco_chiave|0|attivitaService.ts:210+2|0|0
updated_at|0|—|3|0|solo scritta
# spillo_partita (668) fk: partita_id>partita.id
partita_id|=|mappe/collegamentiGuida.ts:74+3|96|6||>partita.id
spillo_uid|=|dungeonService.ts:753+4|7|5
raccolto|627|mappe/collegamentiGuida.ts:74+3|12|6
updated_at|=|mappe/fotografiaLuogoDaPin.ts:141*|3|4
# spillo_partita_infiltrazione (90) fk: partita_id>partita.id
partita_id|=|mappe/fotografiaLuogoDaPin.ts:141+1|96|2||>partita.id
spillo_uid|=|mappe/fotografiaLuogoDaPin.ts:141+2|7|2
infiltrazione_chiave|=|mappe/statiGuida.ts:193+1|0|1
raccolto|=|mappe/statiGuida.ts:193+1|12|2
updated_at|=|mappe/fotografiaLuogoDaPin.ts:141*|3|1
# spunta_voce_partita (338) fk: partita_id>partita.id
partita_id|=|r:partite.ts:198+9|96|2||>partita.id
voce_uid|=|r:partite.ts:198+8|8|2
fatta_at|=|motoreDiario.ts:373+1|0|2
effetti_json|136|apertureDedaliService.ts:42+5|4|1
# timbri_dedalo_partita (0) fk: partita_id>partita.id
partita_id|0|timbriService.ts:22|96|1||>partita.id
area_chiave|0|dungeonService.ts:759+1|4|3
raccolti|0|dungeonService.ts:1508+1|9|2
updated_at|0|—|3|1|solo scritta
# trofeo_partita (0) fk: partita_id>partita.id
partita_id|0|completamentoService.ts:23|96|1||>partita.id
trofeo_chiave|0|completamentoService.ts:23|0|1
updated_at|0|—|3|1|solo scritta
# turno_partita (11) fk: partita_id>partita.id
partita_id|=|allocazioniTurniPesca.ts:39+4|96|2||>partita.id
attivita_chiave|=|attivitaService.ts:571+4|0|2
ordine|=|attivitaService.ts:571+4|85|2
created_at|=|allocazioniTurniPesca.ts:39*+3|6|2
uid|0|allocazioniTurniPesca.ts:39+4|36|1
```

## 6. Colonne senza lettore, solo scritte, copie e rilievi

Le righe che seguono sono lette a mano nel codice (`SELECT` esplicite lette riga per riga), non solo contate. «Archivio» = storia o prova non ricostruibile; la dichiarazione e l'eventuale eliminazione spettano all'utente (regola di B1.2 di `ondata1/B1-B2-B7-B10.md`). «Provenienza» (`updated_at`, `creato_il`, `seed_json`, `origine`, `fonte`, `verificato`, `nascosto`) si tiene sempre.

### 6.1 Senza lettore e senza scrittore (43 colonne)

| colonna | non vuote | che cos'è | stato e chi decide |
|---|---|---|---|
| gioco.audit_aojiru_136.* (9 colonne) | 1/1 | prima/dopo del consolidamento Aojiru (migrazione 136) | archivio di bonifica (BON-06): nessun lettore né scrittore; solo l'utente può toglierla |
| gioco.audit_pesca_138.* (10 colonne) | 1/1 | come sopra, manifest di pesca (138) | archivio di bonifica, stessa regola |
| gioco.decisione_tanaka.negozio_chiave, revisione_confronto, revisione_piano, piano_json, confermata_il (5) | 1/1 | decisione di Tanaka (consenso tolto da BON-08); le altre 4 colonne sono lette in `tanakaStatoListino.ts:41` per l'integrità del registro | archivio; solo l'utente |
| gioco.decisione_tanaka_ripristino.operazione_id, prima_json, ripristinata_il (3) | 0/0 | ripristini di Tanaka; `decisione_id` è letta in `tanakaStatoListino.ts:43` | archivio; 0 righe |
| gioco.proposta_infiltrazione_voce.regola | 102/102 | la regola con cui è stata calcolata la proposta (110); la tabella ha solo `DELETE` nel codice (`giornataService.ts:701`, `mappe/legamiInfiltrazioni.ts:165`) | provenienza non letta: candidata da decidere (la tabella non ha `INSERT` di prodotto) |
| gioco.negoziazione_umore.versione_fonte | 4/4 | provenienza dell'importazione (172); non selezionata in `negoziazioneService.ts:96` | provenienza |
| gioco.negoziazione_importazione.input_runtime_json | 1/1 | input del runtime all'importazione (172) | provenienza non ricostruibile; solo l'utente |
| gioco.dedalo_confluenza.nota | 1/1 | nota della 175 (Iweleth è dedalo dei Memento); le altre colonne sono lette (`dungeonService.ts:121,414`) | provenienza |
| **gioco.infiltrazione_dedalo (tabella intera: infiltrazione_chiave, area_dedalo_chiave)** | 12/12 | quale infiltrazione di Iweleth corrisponde a quale area del dedalo (175); **nessun lettore né scrittore di prodotto**: la copertura si legge da `mappa_dedalo` e `persona_area_dedalo` | archivio per decisione del PM (§6.3b): registro della conversione di Iweleth (175) |
| gioco.voce_confluenza.voce_chiave, voce_canonica, tipo_precedente, infiltrazione_chiave, nota, carattere_precedente, ordine_precedente (7) | 47/47 … | registro delle conversioni delle voci di Iweleth (175): di tutto il registro il codice legge solo l'aggregato per `azione` (`dungeonService.ts:124`) | provenienza/storia delle conversioni; solo l'utente può toglierla |
| partite.requisito_partita.partita_id, confermato, updated_at (3) | 0/0 | tabella senza lettori né `INSERT`: solo 3 `DELETE` di pulizia (`requisitiConfidentiService.ts:50,116,131`); 0 righe | **tolta** dalla migrazione utente 44 (§6.3b) |

### 6.2 Scritte e mai lette (22 colonne)

| colonne | che cosa sono | stato |
|---|---|---|
| gioco.immagine_miniatura.byte, larghezza_reale, altezza_reale, created_at | metadati della cache delle miniature, scritti da `miniatureService.ts:131`; la lettura (`:104`) prende solo `mime, contenuto` | cache rigenerabile |
| gioco.operazione_effetti_voce.voce_uid, prima_json, creata_il | registro delle operazioni sugli effetti del Diario (`motoreDiario.ts:112,468`); la lettura (`:456`) prende `payload_json, dopo_json` | registro: provenienza e annullamento |
| gioco.nota_storica.updated_at | provenienza | provenienza |
| partite.cruciverba_partita.updated_at, domanda_partita.fatta_at, evento_storia_partita.updated_at, punti_negozio_partita.updated_at, richiesta_partita.updated_at, trofeo_partita.updated_at, timbri_dedalo_partita.updated_at, meteo_partita.updated_at, invito_partita.creato_il, sessione_videogioco_partita.updated_at, fortuna_partita.acceso_il, esame_piazzamento_partita.updated_at, punti_confidente_generazione.creata_il, punti_confidente_voce.creato_il | marche di tempo delle righe di partita | provenienza: si tengono |

### 6.3 Copie (8 dichiarate)

Provate con SQL sui dati della copia (`a IS NOT b` = 0 righe) o per progetto; nessuna è eliminata da questa consegna.

| colonna | copia di | fonte unica | nota |
|---|---|---|---|
| gioco.libro.nome_it | libro.nome (46/46 uguali) | libro.nome | ha lettori (`db:conversioneEffettiAzione.ts:79`, `r:condizioni.ts:66` e altri 6) e il FE la nomina in 43 file: eliminarla richiede il porting dei lettori; per `film.nome_it` non vale (14/30 valorizzate) |
| gioco.guida_alias.area_chiave | guida_alias.chiave (92/92 uguali) | guida_alias.chiave | in questa copia ogni alias è identico all'area: la tabella è un ponte senza dato proprio; nella copia p5s i nomi di prima delle infiltrazioni (177) potrebbero differire |
| gioco.attivita.luogo_chiave | `luogo.quartiere_chiave` della sede `attivita.sede_chiave` (29/29) | sede → luogo → quartiere | ha 12 file lettori (`mappe/accessoMondoService.ts:87`, `catalogoService.ts` …): da portare prima di toglierla |
| gioco.negozio.luogo_chiave | `luogo.quartiere_chiave` della sede (61/61) | sede → luogo → quartiere | come sopra (`catalogoOggettiLetture.ts:162` …) |
| gioco.voce_giornata.produce_json | voce_effetto (265/265 con righe) | voce_effetto | nessuno scrittore; letta solo con `SELECT *` (`acquistiService.ts:101`, `giornataService.ts:393,486`) |
| gioco.persona_affinita.seed_codice | persona_affinita.codice presa alla prima correzione | la riga corrente | copia di Ripristina, per progetto |
| gioco.quartiere.condizioni_guida_json, fonte_condizioni_guida_json | condizioni e fonte della guida | la riga corrente | copie di Ripristina, per progetto (letture in `cittaService.ts:59,89`) |

Le colonne `seed_json` (24 tabelle: dote_sociale, confidente_regalo, esame, dungeon, quartiere, luogo, attivita, libro, film, cruciverba, negozio, articolo, trofeo, domanda, allerta_meteo, area, confidente_invito, catalogo_oggetto, trasformazione_oggetto, regola_pesca, nota_storica, ombra, giorno, evento_calendario, più `persona` e `skill` dalla 213) e `spillo.seed_identita_json` sono la fotografia della riga della guida presa alla prima correzione: servono a «Ripristina» (letta da `ripristinoService.ts:140`, `catalogoService.ts:103`) e non sono copie da eliminare. `confidente_requisito_guida` è lo stesso meccanismo.

### 6.3b Decisione per le 65 colonne senza lettore o solo scritte (richiesta del PM, 24/10)

Strada scelta per ognuna: **di archivio** (dichiarata con il motivo, schema invariato) oppure **morta** (da togliere con migrazione conservativa). Esito: **nessuna migrazione, nessuna colonna morta**. Ogni colonna di `gioco.db` è storia, registro, provenienza o metadato di cache; tolta non darebbe nulla e non ne conosco una il cui scrittore sia un costo da eliminare. Le colonne di `partite.db` e `infiltrazione_dedalo` sono solo dichiarate, come richiesto, e restano all'utente/PM.

| colonne | n. | strada | motivo dell'archivio |
|---|---:|---|---|
| gioco.audit_aojiru_136.*, audit_pesca_138.* | 19 | archivio | audit delle bonifiche 136 e 138 (BON-06): storia non ricostruibile, nessuno scrittore |
| gioco.decisione_tanaka (negozio_chiave, revisione_confronto, revisione_piano, piano_json, confermata_il); decisione_tanaka_ripristino (operazione_id, prima_json, ripristinata_il) | 8 | archivio | registro delle decisioni di Tanaka: il resto della tabella è letto per l'integrità del listino (`tanakaStatoListino.ts:41,43`); il consenso è stato tolto da BON-08 |
| gioco.proposta_infiltrazione_voce.regola | 1 | archivio | provenienza della regola con cui la proposta fu calcolata (110); le righe non si rigenerano |
| gioco.negoziazione_umore.versione_fonte, negoziazione_importazione.input_runtime_json | 2 | archivio | provenienza dell'importazione del corpus (172), non ricostruibile |
| gioco.dedalo_confluenza.nota | 1 | archivio | nota storica della 175 |
| gioco.voce_confluenza (voce_chiave, voce_canonica, tipo_precedente, infiltrazione_chiave, nota, carattere_precedente, ordine_precedente) | 7 | archivio | registro delle conversioni di Iweleth (175): serve a ricostruire lo stato precedente; il codice ne legge l'aggregato per `azione` |
| gioco.immagine_miniatura.byte, larghezza_reale, altezza_reale, created_at | 4 | archivio (metadati di cache) | **decisione del PM (24/10): restano** — servono a diagnosticare la cache; descrivono la miniatura e il suo momento |
| gioco.operazione_effetti_voce.voce_uid, prima_json, creata_il | 3 | archivio (registro) | registro delle operazioni sul Diario: lo stato precedente serve all'annullamento e alla diagnosi |
| gioco.nota_storica.updated_at | 1 | archivio (provenienza) | marca di tempo |
| gioco.infiltrazione_dedalo (infiltrazione_chiave, area_dedalo_chiave) | 2 | archivio (registro di conversione) | **decisione del PM (24/10)**: registro della conversione di Iweleth (migrazione 175, Iweleth resta un solo dedalo per decisione dell'utente) — quale infiltrazione corrispondeva a quale area del dedalo. Non si toglie |
| partite.*_partita.updated_at / fatta_at / acceso_il / creato_il / creata_il (14 colonne elencate in §6.2) | 14 | archivio (provenienza) | **decisione del PM (24/10)**: restano, tracciano quando è cambiata una riga |
| partite.requisito_partita (partita_id, confermato, updated_at, più le altre 3) | 6 | **tolta** | **decisione del PM (24/10)**: tabella vuota e solo `DELETE` di pulizia; tolta dalla migrazione utente 44 (commit `b287a7ae`) con guardia «solo se vuota», i tre `DELETE`, il riferimento in `RIFERIMENTI_PARTITE` e la voce in `FONTI_TOLTE`. Provata su copia: vuota → tolta; con una riga → resta, con avviso nel log |

Totale: 46 colonne di gioco + 2 di `infiltrazione_dedalo` dichiarate di archivio, 14 marche di tempo di `partite.db` dichiarate di archivio, 6 colonne di `requisito_partita` tolte. **A fine di questo passo nessuna colonna resta senza lettore senza una dichiarazione e R11-01/1 è chiuso per quanto riguarda le colonne senza lettori.** Le cifre di §1, §3 e §5 descrivono il commit `1895f963`, prima della 044: `requisito_partita` (6 colonne, tolte) e le sue 3 colonne «senza lettore» di §6.1 non esistono più nello schema.

### 6.4 Rilievi che cambiano decisioni o richiedono un'azione

1. **`utente.effetto_applicato.assorbita_da` manca nella copia di sviluppo** (la 028 fu modificata dopo l'applicazione, commit `814b17d8` del 21/10) ma il codice la usa: una base di partite già arrivata a 28 con la vecchia 028 darebbe errore in `motoreDiario.ts:352,360` e `propostePartitaService.ts:172,283`. Le basi create dalla catena da zero la hanno. Da verificare su p5s (che era a utente 30 il 23/10, quindi dopo la modifica) e, in generale, da evitare: **le migrazioni già applicate non si modificano**.
2. **`db/conversioneEffettiAzione.ts:90`** legge `giorno_percorso`, tabella tolta dalla 189: il file è importato solo dalle migrazioni 086, 089 e utente 007, 008 (eseguite su schemi vecchi). Va isolato quando si congelano (B9).
3. **Colonne lette solo «in blocco»** (`SELECT *` o elenco in costante, mai nominate): `utente.punto_partita.automatico` (0/525, scritta sempre 0 in `mappe/collegamentiGuida.ts:75`, `mappe/mappeService.ts:1413`, `mappe/statiGuida.ts:491,493`; letta solo dalla fotografia `mappe/fotografiaLuogoDaPin.ts:145`), `gioco.voce_giornata.produce_json` (copia, §6.3), `utente.da_applicare.proposte_origine_json` (0 valori, nessuno scrittore), `gioco.dungeon.lettera_entro` (1 valore, nessuno scrittore), `gioco.ombra.nome_negoziazione` (0/131, nessuno scrittore). Sono i candidati dell'inventario precedente ancora vivi; le altre 247 + 156 colonne «solo `*`» sono lette da istruzioni che selezionano la riga intera.
4. **`persona`, `skill`, `persona_skill`, `traduzione`, `confidente_regalo`, `evento_calendario`** hanno oggi uno scrittore dal servizio `/api/correzioni` (migrazioni 211–213) che nell'inventario precedente mancava: non sono più nell'elenco di R11-17/1 (§11).

## 7. Blocchi di dati_guida (53)

53 blocchi (`chiave`, `json`). Lettore = la chiave compare tra apici (o come prefisso costante) in un file non test e non di migrazione di `server/`, `shared/`, `src/`, `scripts/`. Un blocco senza lettore è storia o archivio (dei valori tolti dalle tabelle: «archivio-…»).

**Con lettori di prodotto (13)**

| chiave | caratteri | lettori | modificabile dall'utente? |
|---|---:|---|---|
| battaglia | 180.124 | battagliaService.ts:17; compendioService.ts:61; dungeonService.ts:782 | sì per le sezioni del registro (`battaglia-sezione`); non coperti `fonti`, `tecnico`; `ombre[217]` vive nella tabella `ombra` (correggibile) |
| completamento | 43.664 | completamentoService.ts:28; fontiRicompenseOggetti.ts:56 | sì (finali, covo, dlc, meteo, NG+, differenze, tempo) |
| confidente-disponibilita-editor-v1:makoto | 3.900 | disponibilitaConfidentiService.ts:10 (prefisso) | scritto dall'editor di disponibilità |
| finestre-dungeon | 5.941 | atterraggioPalazziService.ts:121; condizioni/contestoConversione.ts:62; datiGuida.ts:161 | letto solo su schemi precedenti alla 118 (ramo di compatibilità): oggi le finestre sono in `dungeon.finestra_dal/al` |
| jose | 8.488 | catalogoOggettiLetture.ts:146; negoziService.ts:248; richiesteService.ts:61 | sì (`jose`); gli scambi stanno nel negozio |
| mappe-assenti | 3.030 | dungeonService.ts:789 | solo pulizia alla cancellazione di un'area (nessun consumatore) |
| note-categorie-attivita | 176 | attivitaService.ts:344 | **no**: dato vero minimo senza scrittura |
| oggetti-crosswalk | 26.549 | compendioService.ts:31 | no: ponte degli abbinamenti, dato tecnico che si rigenera |
| oggetti-guida | 178.416 | catalogoOggettiLetture.ts:107; catalogoOggettiProposte.ts:47; compendioService.ts:28 | sì per fabbricazione, ricette, armi, abiti; `consumabili[247]` e `chiaveEMateriali[108]` rimandano a `catalogo_oggetto` (correggibile); `scambi[5]` non è letto |
| ombre-l8-166 | 4.531 | ombreService.ts:200 (prefisso `ombre-l8-`) | no: rapporto della 166 |
| personaggi | 26.435 | r:compendio.ts:128; ricerca/indiceRicerca.ts:345 | sì (`personaggio`, `gruppo-personaggi`) |
| sfide | 67.173 | fontiRicompenseOggetti.ts:61; ricerca/indiceRicerca.ts:339; ripristino/registro.ts:91 | sì (battaglie, boss segreti, magnate, tratti, quiz TV) |
| sinonimi-ricerca | 1.077 | ricerca/sinonimiRicerca.ts:14 | **no**: dato vero (sinonimi e abbreviazioni della ricerca) senza scrittura |

**Senza lettore (40): archivio**: archivio-correzioni-diario-l11 (2.667), archivio-dettagli-attivita-l11 (14.470), archivio-eventi-calendario-l11 (3.090), archivio-frasi-l11 (52.091), archivio-giorno-percorso-azioni-l11 (258.986), archivio-legami-e-presentazione-mappe-l11 (6.238), archivio-marcatori-e-piante-l11 (63.368), archivio-pianta-quartiere-l11 (18.861), archivio-traduzioni-doti-l11 (4.437), audit-164-collegamenti-eventi-voci (141), audit-165-date-eventi-calendario (142), audit-182-date-confidenti-royal (107), audit-183-scadenze-palazzi (721), audit-185-attivita-royal (107), audit-bonifica-catalogo-125 (257), audit-bonifica-catalogo-126 (2.571), audit-catalogo-121 (5.683.666), bonifica-condizioni-attivita-124 (1.763), bonifica-condizioni-letture-123 (216), bonifica-finestre-122 (259), correzioni-l7-residue-150 (572), correzioni-royal-l7-146 (239), da-rivedere-chiuse-204 (1.646), iweleth-confluenza-175 (6.353), legami-infiltrazioni-voci-207 (1.751), mappe-citta-assenti (1.783: dopo la 210 non è più letto da `cittaService.ts`), ombre-correzioni-173 (5.441), pin-ann-cestino-145 (43), raccordi-luoghi-l5-approvati (998), raccordi-luoghi-l5-approvati-128 (1.052), raccordi-luoghi-l5-approvati-129 (887), raccordi-scambi-catalogo-132 (66.253), residui-l5-143 (2.746), rettifica-attivita-takemi-135 (3.160), rettifica-banchi-niijima-134 (1.145), rettifica-ingresso-memento-130 (411), rettifica-nota-rango1-makoto-133 (784), sblocco-luoghi (8.730: copiato nelle `condizioni_json` dalla 118), sblocco-quartieri (7.962: idem, 188), vocabolario-l8-162 (754). Sono tutti storia (BON-06) o rapporti di migrazione: solo l'utente può toglierli. `audit-catalogo-121` pesa 5,7 MB.

## 8. Traduzioni per ambito (20)

`traduzione` (2.053 righe) ha 20 ambiti, tutti con almeno un lettore (nomi, descrizioni e termini delle schede Persona, skill, oggetti, Arcani). I nomi si modificano con `PUT/DELETE /api/traduzioni/:ambito/:chiave` (`r:traduzioni.ts:21,25`); per `persona` e `skill` anche da `ripristino/righePersona.ts:95,120`.

| ambito | righe | primo lettore | ambito | righe | primo lettore |
|---|---:|---|---|---:|---|
| affinita | 6 | r:compendio.ts:484 | negoziazione | 120 | compendioService.ts:376 |
| arcana | 24 | openapi/descrizioni/compendio.ts:58 (+21) | notaPersona | 2 | compendioService.ts:365 |
| areaMementos | 9 | compendioService.ts:221 | oggetto | 223 | catalogoOggettiFusione.ts:210 (+19) |
| colonnaEredita | 12 | compendioService.ts:249 | persona | 259 | openapi/descrizioni/compendio.ts:278 (+58) |
| descrizioneOggetto | 223 | compendioService.ts:355 | skill | 490 | openapi/descrizioni/compendio.ts:58 (+16) |
| effettoSkill | 512 | compendioService.ts:100 | statistica | 5 | compendioService.ts:218 |
| elementoAffinita | 10 | compendioService.ts:152 | termine | 56 | compendioService.ts:228 |
| elementoSkill | 16 | compendioService.ts:100 | tipoEredita | 12 | compendioService.ts:179 |
| fonteCarta | 49 | compendioService.ts:418 | tipoOggetto | 4 | compendioService.ts:219 |
| fonteEsclusiva | 9 | compendioService.ts:415 | vincoloOggetto | 12 | compendioService.ts:220 |

## 9. Vista e migrazioni

### 9.1 Vista

`ombra_luogo_dedalo` (migrazione 166): `ombra_voce` ⨝ `persona_area_dedalo` ⨝ `area_dedalo` ⨝ `dungeon_area`, le aree dei dedali dove si incontra un'Ombra (nessuna colonna propria). Lettori: `ombreService.ts:128` (elenco) e `:205` (conteggio). Non ha scrittori: si ricalcola dalle tabelle di base. Le tabelle che alimentano la vista sono marcate nella colonna `vista` di §3.

### 9.2 Migrazioni che importano codice vivo (congelamento, B9)

Una migrazione che importa codice vivo cambia comportamento se quel codice cambia. Import diretti. Solo 5 file importano **servizi** (nella versione precedente erano 10: le 027, 038, 042, 066, 067 non importano più `services/`) e 18 importano **helper di `server/db/`**; altri 48 importano `shared/` (non elencati).

| id | file | importato |
|---|---|---|
| gioco 036, 052, 064, 070 | condizioni_procedurali, condizioni_letture_attivita, stati_al_posto_delle_frasi, condizioni_del_negozio_agli_articoli | services/condizioni/contestoConversione |
| utente 017 | boss_non_piu_automatico | services/mappe/statiGuida |
| gioco 069, 071, 072, 074, 075, 076, 077, 082, 099, 105 | orari strutturati … quiz delle attività | db/colonne |
| gioco 066; utente 001, 027 | partite in un file a parte; schema partite; sessione videogioco | db/schemaUtente |
| gioco 086, 089; utente 007, 008 | effetti delle azioni; dote a ogni incontro riparata | db/conversioneEffettiAzione |
| utente 030 | continuità acquisti | db/acquistiLegacy |

### 9.3 Import, esportazione e cestino

Leggono le tabelle **per nome**, non come lettori di prodotto: `pacchettoGiocoService.ts`, `pacchetto/pacchettoGioco.ts` (copia, import), `sc:genera-pacchetto.ts`, `cestinoService.ts` (`ETICHETTE`, `colonneCompatibili` con `FONTI_TOLTE`), `mappe/precondizioneRimozionePin.ts`, `mappe/registroCestinoPin.ts`, `mappe/fotografiaLuogoDaPin.ts`. Una tabella nuova che non compare in quei registri non è trasportata né ripristinata dal cestino.

## 10. Differenze rispetto all'inventario precedente (`b6b04975`)

- **Tabelle**: 175 → 172. Tolte (10): `giorno_calendario`, `giorno_percorso` (189), `guida_mappa`, `mappa_entita`, `organizzazione_mappa_esito` (177), `marcatore_luogo`, `marcatore_mappa`, `pianta_area` (176), `pianta_quartiere` (210), `lettura_partita` (utente 43). Nuove (7): `correzione_dati_guida` (178), `dedalo_confluenza`, `infiltrazione_dedalo`, `mappa_dedalo`, `voce_confluenza` (175), `punti_confidente_generazione`, `punti_confidente_voce` (utente 41).
- **Colonne**: 1.381 → 1.376 (canoniche). Tolte (17) in §2. Aggiunte: `skill` +3, `persona` +3, `dote_sociale` +3, `trofeo` +3, `esame` +3, `allerta_meteo` +3, `trasformazione_oggetto` +3, `evento_calendario` +4 (`origine`, `seed_json`, `updated_at` più `fonte_chiave` dalla 211), `confidente_regalo` +2, `quartiere` +2 (`condizioni_guida_json`, `fonte_condizioni_guida_json`), `persona_affinita` +2 (`origine`, `seed_codice`). Altre variazioni: `effetto_applicato.assorbita_da` (presente nel canonico, assente nella copia, §6.4).
- **Blocchi dati_guida**: 37 → 53 (16 nuovi: `archivio-*` di L11, `audit-182/183/185`, `da-rivedere-chiuse-204`, `iweleth-confluenza-175`, `legami-infiltrazioni-voci-207`, `archivio-pianta-quartiere-l11`, `archivio-eventi-calendario-l11`, …).
- **Decisioni dell'inventario precedente ormai attuate**: `giorno_calendario` e `giorno_percorso` (189), `mappa_entita`, `guida_mappa`, `organizzazione_mappa_esito` (177), `marcatore_*`, `pianta_area` (176), `pianta_quartiere` (210), `lettura_partita` (utente 43), `luogo.quando/giorni/giorni_json/negozio/attivita_json`, `negozio.orari/sblocco`, `articolo.condizione/disponibile_dal`, `quartiere.sblocco`, `attivita.altri_effetti/regole/premi/paga`. Restano non attuate e ancora presenti: `negozio.luogo_chiave`, `attivita.luogo_chiave`, `voce_giornata.produce_json`, `punto_partita.automatico`, `dungeon.lettera_entro`, `da_applicare.proposte_origine_json`, `utente.requisito_partita`, `negoziazione_importazione.input_runtime_json`, `finestre-dungeon` e `mappe-assenti` (blocchi).

## 11. R11-17/1 — Tabelle di gioco senza una scrittura dall'app

**Criterio.** Una tabella ha una scrittura dall'app se almeno un'istruzione `INSERT`/`UPDATE`/`DELETE` non di migrazione la nomina (anche via SQL parametrico risolto in §0.1) e il servizio che la contiene è raggiunto da una rotta `PUT`/`POST`/`DELETE`. Le vie di modifica con «Ripristina» che esistono oggi:

- **`/api/correzioni/:tipo/:chiave`** (`r:correzioni.ts:20,23`, servizio `ripristinoService.ts`): 37 tipi, righe (`quartiere`, `trofeo`, `dote` con `dote_sociale_rango`, `trasformazione`, `evento-calendario`, `allerta-meteo`, `esame`, `ombra`, `regalo` → `confidente_regalo`, `persona` → `persona`, `persona_skill`, `traduzione`; `skill`) e blocchi di `dati_guida` (`correzione_dati_guida`: personaggi, sfide, completamento, oggetti-guida, battaglia, jose).
- **`/api/catalogo/:tipo`** (`r:catalogo.ts:52-77`, `catalogoService.ts`): `negozio`, `articolo`, `libro`, `film`, `attivita`, `luogo`, `domanda`, `cruciverba`; Modifica, Nascondi, Elimina e Ripristina (`seed_json`/`origine`).
- **Rotte del compendio con «ripristina»** (`r:compendio.ts`, `r:confidentiScritture.ts`): sblocco del quartiere, `dungeon`, requisiti dei Confidenti (con la copia `confidente_requisito_guida`), giorno, affinità della Persona, ranghi, abilità, dialoghi, doti d'incontro e inviti dei Confidenti.
- **Scritture senza «Ripristina»** (strutture create, ordinate o collegate dall'utente; l'annullo è il Cestino): `area`, `area_dedalo`, `dungeon_area`, `dungeon_atterraggio`, `punto_interesse`, `richiesta`, `spillo*`, `mappa*`, `immagine`, `pezzo_mappa`, `copia_pezzo`, `infiltrazione_area`, `voce_infiltrazione`, `quartiere_ingresso`, `catalogo_oggetto`, `voce_oggetto`, `ricompensa_oggetto`, `ricetta_materiale`, `proposta_abbinamento`, `nota_storica`, `regola_pesca`, `voce_giornata`, `voce_effetto`.

**Risultato: 37 tabelle di gioco su 108 non hanno alcuna scrittura dall'app** (nessun `INSERT`/`UPDATE`/`DELETE` fuori dalle migrazioni). 29 sono dati veri, 8 sono dati tecnici.

### 11.1 Dati veri senza scrittura (29): da dare a chi implementa

| tabella | righe | che cosa contiene | modificabile oggi in parte? |
|---|---:|---|---|
| arcana | 24 | gli Arcani maggiori (`ordine`, `numero`) | il nome sì, con la traduzione di ambito `arcana`; ordine e numero no |
| skill_fonte_esecuzione | 114 | da quale Persona si ottiene una skill (legame) | no |
| fusione_arcana | 273 | la matrice delle fusioni fra Arcani (`a`, `b`, `risultato`) | no |
| fusione_speciale | 24 | le fusioni speciali (Persona risultato) | no |
| fusione_speciale_ingrediente | 94 | gli ingredienti delle fusioni speciali | no |
| tesoro | 9 | le Persona del Tesoro | no |
| tesoro_modificatore | 216 | il modificatore per Arcano delle Persona del Tesoro | no |
| eredita_matrice | 144 | la matrice di ereditarietà delle skill | no (i nomi delle colonne sì: ambito `colonnaEredita`) |
| dlc_set | 13 | i set di contenuti scaricabili | no |
| dlc_set_persona | 25 | le Persona di ogni set | no |
| confidente | 23 | l'elenco dei Confidenti (`nome`, `arcana`, `ordine`) | no (ranghi, abilità, dialoghi, inviti e requisiti sì: R11-15/9) |
| esame_premi | 1 | i premi di piazzamento degli esami (JSON) | no |
| settimana_guida | 42 | titolo, periodo, riassunto e incertezze di ogni settimana della guida | no |
| evento_calendario_voce | 135 | il legame evento del Calendario ↔ voce del Diario, con la certezza | no |
| libro_posizione | 48 | dove si trova ogni libro (luogo o quartiere) | no |
| film_posizione | 42 | dove si guarda ogni film (cinema, quartiere) | no |
| negozio_luogo_extra | 4 | sedi aggiuntive di un negozio | no |
| negozio_sede_spillo | 4 | il pin di una sede aggiuntiva | no |
| nota_storica_legame | 14 | a quali articoli/oggetti si riferisce una nota storica | no (la nota sì) |
| ombra_luogo | 247 | dove si incontra un'Ombra (Palazzo, infiltrazione, fonte) | no: la nota di `ripristinoService.ts` dice che «i luoghi d'incontro non si correggono» da lì |
| ombra_voce | 170 | le voci della guida che mostrano l'Ombra | no |
| negoziazione_domanda | 270 | le domande del corpus di negoziazione | no |
| negoziazione_variante | 507 | le varianti di testo di ogni domanda | no |
| negoziazione_risposta | 1.522 | le risposte | no |
| negoziazione_verdetto | 3.970 | l'esito per umore di ogni risposta | no |
| negoziazione_umore | 4 | le carte per umore (nome, descrizione, esempi, da evitare) | no (i nomi sì: ambito `negoziazione`, 120 righe) |
| dedalo_confluenza | 1 | Iweleth è dedalo dei Memento (175): il Palazzo che confluisce | no |
| mappa_dedalo | 26 | quale mappa di Iweleth corrisponde a quale area del dedalo | no |
| infiltrazione_dedalo | 12 | quale infiltrazione di Iweleth corrisponde a quale area (**senza lettore**, §6.1) | no |

Colonne di una tabella già scrivibile che non si modificano da nessuna parte (da valutare con i proprietari delle voci R11-15): `oggetto.categoria`, `oggetto.vincolo` (per `oggetto` si scrive solo `catalogo_chiave`; nome e descrizione sì, con le traduzioni `oggetto` e `descrizioneOggetto`).

Blocchi di `dati_guida` che sono dati veri senza scrittura (e senza correzione): `note-categorie-attivita` (176 caratteri), `sinonimi-ricerca` (1.077), le parti di `battaglia` fuori dal registro (`fonti`, `tecnico`).

### 11.2 Dati tecnici senza scrittura (8): non vanno modificati dall'utente

| tabella | righe | perché è tecnica |
|---|---:|---|
| confidente_requisito_guida | 177 | la copia della guida di `confidente_requisito`: serve a «Ripristina» (letta da `requisitiConfidentiService.ts:70-71`) |
| audit_aojiru_136, audit_pesca_138 | 1, 1 | storia delle bonifiche 136 e 138 (archivio) |
| decisione_tanaka, decisione_tanaka_ripristino | 1, 0 | registro delle decisioni di Tanaka; letti per l'integrità del listino |
| negoziazione_importazione | 1 | rapporto dell'importazione del corpus di negoziazione |
| voce_confluenza | 47 | registro delle conversioni di voci di Iweleth (175) |
| guida_alias | 92 | alias di risoluzione dei nomi di guida (nella copia ogni alias è identico all'area: §6.3) |

### 11.3 Scritture presenti ma solo tecniche (non sono un difetto di R11-17)

`cestino` e `cestino_partite` (registri del cestino), `correzione_dati_guida` (registro delle correzioni), `immagine_miniatura` (cache), `operazione_effetti_voce`, `voce_effetto_transizione` e `proposta_effetto_voce` (registri del motore del Diario), `proposta_infiltrazione_voce` (solo `DELETE`: le righe nascono dalla migrazione 110; 102 righe, nessun `INSERT` di prodotto).

## 12. Verifica distinta

_Da compilare dall'agente revisore distinto (non dall'implementatore): data, esito, copertura e limiti dichiarati. Il revisore può rifare la misura con gli stessi strumenti sullo stesso commit (`git archive 1895f963`) e sulla stessa copia._

| revisore | data | esito | copertura | limiti |
|---|---|---|---|---|
| | | | | |





