# Le migrazioni nuove da c4eda1e3 (rilasciato) a HEAD — per il revisore del dodicesimo giro (2026-10-24)

Richiesta del PM. Sola lettura, nessun commit. Perimetro: `git diff c4eda1e3 HEAD` su `server/db/migrations/` e `server/db/migrazioniUtente/`, con **HEAD = `3c0ac0d6`**. All'inizio del lavoro HEAD era `7e784f8a`: nel frattempo è entrata la 222. Ho letto l'intestazione e, dove contava, il codice di ogni migrazione; **non le ho eseguite in questo giro** (il revisore deve farlo su una copia). Ultima migrazione rilasciata: gioco **187**, utente **42**.

## 1. In breve

- **35 migrazioni di gioco (188–222) e 2 utente (43, 44)**, tutte registrate in `index.ts`, più `colonneCorrezione.ts` (aiuto comune, non una migrazione).
- **Fuori da HEAD (working copy non committata):** `223_negoziazione_correggibile.ts` e `224_dedalo_correggibile.ts` (aggiungono `origine`, `seed_json`, `updated_at`; nessun valore cambia) e una modifica a `index.ts` che le registra. Il revisore deve dire se le include o no.
- **Lavoro da preservare:**
  - **Diario validato (04-01..06-01):** nessuna migrazione ne cambia il testo, l'ordine, la data, la fascia, gli effetti o il segno. **Due** vi scrivono righe nuove di `voce_infiltrazione` (il dato letto dalla voce, non il testo): la **207** su 10 voci (4 di Kamoshida, 6 di Madarame) e la **219** su 1 (04-20, Kamoshida). Sono i legami deliberati con il PM (D2).
  - **Kamoshida e Madarame:** la **192** cambia `area.nome` di 2 Aree di Madarame («Museo, 1P/2P» → «Museo 1P/2P», decisione D6 dell'utente); le 207/219 sono quanto sopra. Nessun'altra tocca Palazzi, Aree, planimetrie o pin di questi due.
  - **Spunte (partite):** nessuna migrazione di gioco scrive in `utente`. Le 2 migrazioni utente tolgono due tabelle (una con guardia «solo se vuota»; l'altra può portare al completo un avanzamento mai ridurlo, 0 righe da portare sulla copia di p5s).
  - **Eventi (calendario):** 189 (ricostruita `evento_calendario` con gli stessi id), 199, 211 (chiave della fonte, e tolti gli eventi `meteo` che ripetono un'allerta), 221, 222 (titolo dell'evento 103).
- **Righe di gioco già presenti su p5s che cambiano valore:** 192, 195, 196, 197, 200, 201, 202, 204, 205, 206, 211, 212, 214, 216, 218 (solo `note` di 4 luoghi), 220, 222; e svuotano colonne con archivio: 191. Tutte con guardia sul valore atteso (una riga già cambiata si salta senza errore, salvo dove indicato «si ferma»).
- **Colonne o tabelle tolte (dati in `dati_guida` come archivio, voce in `FONTI_TOLTE`):** 188, 189, 193, 194, 203, 210, 215, 218, utente 43 e 44.
- **Modifica di una migrazione già rilasciata:** `server/db/migrazioniUtente/015_giornata_canone.ts` (16 righe): legge le azioni del percorso dall'archivio quando `giorno_percorso` non c'è più (effetto della 189). Cambia solo cosa fa su un `partite.db` antico; **va verificato** che per un database già migrato (utente ≥ 15) non cambi nulla. Anche `pesca029Schema.ts` perde un export senza uso, e `index.ts` ha un commento nuovo alla riga della 175.

Legenda delle colonne: **Scrive su p5s** = UPDATE/DELETE/INSERT su righe di gioco che p5s già ha; **Preservato** = tocca diario validato, Kamoshida/Madarame, spunte o eventi.

## 2. Migrazioni di gioco

| # | Che cosa tocca | Scrive su p5s | Preservato |
|---|---|---|---|
| 188 | toglie `quartiere.sblocco` (20 frasi); archivio `archivio-frasi-l11` | sì: colonna tolta, righe archiviate | no |
| 189 | toglie `giorno_calendario` e `giorno_percorso`; **ricostruisce `evento_calendario`** (stessi id, righe e indici; chiave verso `giorno`); archivia divergenze e azioni del percorso; **si ferma** se manca una data in `giorno` | sì: tabelle tolte, `evento_calendario` ricostruita | **eventi** (stesse righe e id). Non tocca voci |
| 190 | ricostruisce `cestino` aggiungendo il tipo `invito` (stessi id, righe identiche) | struttura, righe uguali | no (il Cestino non è lavoro validato) |
| 191 | `esame.domande_json` e `date_json` archiviati e svuotati (`[]`); verifica 31/31 prima, altrimenti **si ferma** | sì: 4 righe di `esame` | no (le righe `domanda` non cambiano) |
| 192 | `area.nome` di 2 Aree di Madarame, solo se il nome è ancora quello di prima | sì: 2 righe | **Madarame** (nome di 2 Aree; chiavi, slug, ordine invariati) |
| 193 | toglie `luogo.quando` (41 righe archiviate) | sì: colonna tolta | no |
| 194 | toglie `articolo.disponibile_dal` (288 righe archiviate); il testo mostrato cambia (generato dalle condizioni, deciso dall'utente) | sì: colonna tolta | no |
| 195 | il cruciverba «Hacker» del 29/8 sera va nel Cestino (formato di `eliminaVoce`); compatta `ordine` della fascia; **si ferma** se la voce è diversa o ha legami/proposte/collegamenti | sì: 1 voce tolta, `ordine` delle sorelle | voce del **29/8** (non validata). Spunte per uid non toccate (sulla copia: nessuna) |
| 196 | riscrive la voce 13/11 sera (acquisto del Katsu), `da_rivedere = 0`, testo precedente conservato | sì: 1 voce | voce del 13/11 (non validata); riferimento a Makoto tolto |
| 197 | Gemelle ×4 (`riferimento_chiave` igor → gemelle: 06-08, 09-06, 11-06, 01-11); Ustione 08-16 → 08-17 sera; 10-15; 10-31; Hagoromo (nota del negozio, orari del luogo, voce 06-05 alla sera con effetto Katsu); **si ferma** se una voce è diversa da prima e da dopo | sì: 8 voci + 1 negozio + 1 luogo | nessuna voce ≤ 06-01 (la più vicina è 06-05). Archivio `archivio-correzioni-diario-l11` |
| 198 | aggiunge `origine`, `seed_json`, `updated_at` a `esame` | colonne nuove, nessun valore cambia | no |
| 199 | idem a `evento_calendario` e `allerta_meteo` | colonne nuove | **eventi** (nessun valore cambia) |
| 200 | voce 14/11: tolto il segno, Arena a 10.000 gettoni (Royal), nota; testo precedente conservato | sì: 1 voce | voce del 14/11 (non validata) |
| 201 | voce 19/11: tolti Moloch e Kasumi (nessuna fonte li conferma) | sì: 1 voce | voce del 19/11 (non validata) |
| 202 | `attivita.dettagli`: frasi ripetute tolte (elenco di sostituzioni esatte, l'attività si salta intera se una non trova il testo); `catalogo_oggetto.descrizione` dei videogiochi | sì: righe di `attivita` e di 7 oggetti | no |
| 203 | toglie `attivita.altri_effetti`, `regole`, `premi`, `paga` (archiviate) | sì: 4 colonne tolte | no |
| 204 | `da_rivedere` 1 → 0 su 12 voci (dopo il 1° giugno: 06-20 … 11-24); audit `da-rivedere-chiuse-204` | sì: 12 voci | nessuna ≤ 06-01 |
| 205 | aggiunge una frase in fondo a `dungeon.note` di Maruki (nessuna data cambia) | sì: 1 riga | no |
| 206 | voce dell'invito di Makoto 07-30 → 08-04 giorno (testo e data precedenti conservati), `da_rivedere = 0`; `confidente_invito` `makoto/07-30`: `data` e `nota` (la chiave resta); compatta `ordine` | sì: 1 voce + 1 invito + `ordine` | voce del 4/8, nessuna ≤ 06-01 |
| 207 | **INSERT** di 19 righe in `voce_infiltrazione` (legami voce → area) per le proposte «certe»; le proposte restano | solo righe nuove | **sì: 10 voci del validato** (Kamoshida 04-11, 04-12, 04-15, 04-22; Madarame 05-16×2, 05-19, 05-20, 05-27, 06-01), **solo i legami**; impronta di `voce_giornata` uguale prima e dopo (decisione D2) |
| 208 | **INSERT** di 2 `nota_storica` + `nota_storica_legame` (Pagine ammuffite) | solo righe nuove | no |
| 209 | `ombra.seed_json`/`origine`: porta la fotografia di nascita alla forma del registro (riga uguale → `NULL`, `seed`; diversa → `utente`) | sì: righe di `ombra` (solo le tre colonne di correzione) | no |
| 210 | archivia e toglie `pianta_quartiere` (provenienza delle illustrazioni) | sì: tabella tolta | no |
| 211 | aggiunge `evento_calendario.fonte_chiave` + indice e la assegna alle righe ricavabili (solo se la data della fonte coincide); **toglie gli eventi `meteo` che ripetono un'allerta e non hanno collegamenti**, con archivio `archivio-eventi-calendario-l11` | sì: colonna, chiavi, righe tolte | **eventi** (chiave; righe `meteo` doppie tolte; id e collegamenti delle altre invariati) |
| 212 | `confidente_regalo`: aggiunge `origine` e `updated_at`; la fotografia di Shinya («Modellino di moto») passa alla forma del registro, `origine='utente'`; **si ferma** su una fotografia sconosciuta | sì: 1 riga (colonne di correzione) | no |
| 213 | `persona` e `skill`: tre colonne di correzione | colonne nuove | no |
| 214 | `esperimenti-clinici-takemi`: `effetti_json` → NULL (la Dote è nella fonte del Confidente); valore di prima in `archivio-correzioni-attivita-l11` | sì: 1 riga | no |
| 215 | toglie `libro.nome_it`, `film.nome_it`, `articolo.nome_it` (archiviate; 46/14/1) | sì: 3 colonne tolte | no |
| 216 | `condizioni_json` di 4 luoghi (Sala giochi di Akihabara, Piazza della Stazione, Ingresso dei Memento, Okumura Foods) e 4 attività (Gun About, biblioteca, Crossroads, Ore no Beko); nota di Harajuku | sì: 8 righe + 1 nota | no (l'ingresso dei Memento prende la condizione `palazzo kamoshida`, ma non cambia Kamoshida) |
| 217 | tre colonne di correzione a `arcana`, `fusione_arcana`, `fusione_speciale`, `tesoro`, `eredita_matrice`, `dlc_set` | colonne nuove | no |
| 218 | toglie `luogo.sblocco` (39) e `attivita.sblocco` (18), archiviate; le frasi di 4 luoghi diventano `note` | sì: 2 colonne tolte + `note` di 4 luoghi | no |
| 219 | **INSERT** di righe in `voce_infiltrazione` per 18 voci multiple (Shido 11/12 limitato a 8 aree per decisione dell'utente); audit `legami-infiltrazioni-voci-219` | solo righe nuove | **sì: 1 voce del validato** (04-20, Kamoshida, 3 legami), solo legami |
| 220 | `articolo` `libreria-taiheido/pagine-ammuffite`: `condizioni_json` → `[dal 04-18, dal 09-01]` | sì: 1 riga | no |
| 221 | tre colonne di correzione a `confidente`, `esame_premi`, `settimana_guida`, `evento_calendario_voce` | colonne nuove | **eventi** (collegamenti evento ↔ voce: nessun valore cambia) |
| 222 | voce 4/10 Okumura (+ Fabbrica centrale, Interscambio, Produzione armamenti), titolo dell'evento 103, nota in coda a `dungeon.note` di Futaba e Okumura | sì: 1 voce, 1 evento, 2 note | voce 4/10 non validata; **evento 103** |
| 223* | tre colonne di correzione a 4 tabelle della negoziazione (*non in HEAD*) | colonne nuove | no |
| 224* | idem a `dedalo_confluenza`, `mappa_dedalo`, `infiltrazione_dedalo` (*non in HEAD*) | colonne nuove | no |

## 3. Migrazioni utente (`partite.db`)

| # | Che cosa tocca | Scrive su p5s | Preservato |
|---|---|---|---|
| 43 | toglie `lettura_partita` (specchio derivato). **Guardia:** se una riga ha un avanzamento più basso delle sessioni, lo porta al completo in `progresso_libro_partita`/`progresso_film_partita` (mai lo abbassa); poi `DROP`. Controlla che nessun'altra tabella delle partite cambi | dati dell'utente: sulla copia di p5s 0 righe da portare | **partite** (letto «letto» identico) |
| 44 | toglie `requisito_partita` **solo se vuota** (altrimenti non fa niente e lo scrive nel log) | nessuna riga persa per costruzione | **partite** (le conferme a mano non si leggono più) |

Prima di una migrazione utente il server copia `partite.db` (`runBootBackup`).

## 4. Che cosa va controllato (per il revisore)

1. **Le 10+1 voci del validato** (207, 219): l'impronta di `voce_giornata` e la lista delle 255 voci 04-01..06-01 uguale prima e dopo; solo righe nuove in `voce_infiltrazione`.
2. **Madarame (192):** solo `area.nome` delle due Aree, solo se il nome era quello di prima; che nessun lettore cerchi le Aree per nome («Museo, 1P»).
3. **Eventi:** 189 (ricostruzione con gli stessi id: riconfrontare id, titoli e `evento_calendario_voce`), 211 (quali eventi `meteo` sono stati tolti: il registro dell'archivio dice quanti), 222 (id 103).
4. **`utente/015` modificata:** su un `partite.db` già a ≥ 15 non cambia nulla; su uno vecchio legge dall'archivio `archivio-giorno-percorso-azioni-l11`.
5. **Idempotenza e «si ferma»:** 189, 191, 195, 197, 212 lanciano senza toccare niente se un'ipotesi non regge: va provato che sulla copia di p5s non scattino.
6. **Le 223/224** non sono in HEAD: decidere se rilasciarle nel giro.
7. **Archivi:** 188, 189, 191, 193, 194, 202, 203, 210, 214, 215, 218 salvano il valore di prima in `dati_guida` (`archivio-frasi-l11` e simili) e hanno la voce in `FONTI_TOLTE`: controllare che l'importazione di un backup vecchio le riconosca (cestino e «Importa»).

## 5. Limiti

- Ho letto intestazioni, guardie e (per 195–197, 204, 206, 207, 219, 222) le istruzioni SQL, ma **non ho eseguito le migrazioni** dopo la 210 né verificato le impronte; i conteggi riportati sono quelli delle intestazioni, non misurati da me, tranne le date delle voci (verificate sulla copia migrata fino alla 210).
- La 211 non è stata applicata alla mia copia: non conosco il numero esatto degli eventi `meteo` che toglie.
- Non ho controllato i test (la regola attuale è zero test).
