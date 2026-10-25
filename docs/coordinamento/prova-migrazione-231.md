# Prova della migrazione 231 (lotto C, testi visibili) — 25 ottobre

Prima stesura dell'agente C4b. È stata rifatta due volte dopo la revisione avversariale (due esiti «approvato con rilievi»: R1–R6, poi
N1–N6) e le decisioni nuove dell'utente. La 231 non è pubblicata: si corregge sul posto, senza una 232.
File: `server/db/migrations/231_testi_visibili_puliti.ts` ed elenco chiuso `server/db/migrations/testiGrezzi231.ts`.

## Correzione del resoconto precedente (R1)

Il resoconto diceva che `data/gioco.db` era rimasto intatto: **non è vero**. Il backend locale girava in `tsx watch` e alle 07:26 ha
applicato da solo la 231 vecchia ai dati di `data/` (copia di avvio `data/backups/project-p5r-2026-10-25T07-26-14-869Z.db`). Il PM ha poi
riportato `data/` a 230 da quella copia e ha fermato il backend. Per questa seconda prova `data/` è stato solo letto: `data/gioco.db`
ha la stessa impronta della copia di avvio (`e89cb3a5…`, `partite.db` `d8c31830…`) prima e dopo, e nessun servizio è stato avviato.

## Cosa cambia rispetto alla prima stesura

Elenco: **657 voci** (erano 168). 151 voci restano identiche, 16 cambiano, 1 è tolta, 490 sono nuove. Le nuove sono 420 del secondo giro, la voce del PM sulla fonte di `homunculus-prezzi-fonte`, 22 del terzo giro (N3, N4) 46 del quarto (futuri e «casinò», sotto) e 1 del quinto: `negozio.luogo` di `negozio-palazzo-niijima`, «dungeon del casinò», visibile in `NegoziPage.tsx:132` e `NegozioPage.tsx:82`. La sua copia (`luogo`) è ora in `COPIA_DELLA_GUIDA`. Nelle colonne visibili non resta nessun altro «casino» nel senso di Casinò: restano le chiavi e gli slug, `trofeo.nome_en`, «casini» (confusione) e lo storico `testo_precedente_json`.

| Rilievo / decisione | Come è risolto |
|---|---|
| **R2** (copia della guida) | La voce non porta più `seed`. La migrazione ha un registro `COPIA_DELLA_GUIDA`: per ogni colonna, il campo che la fotografia `seed_json` usa per lo stesso valore. È il `p` del registro del ripristino (`CampoDef.p`: Ombra, regalo, settimana, evento, esame) o il nome della colonna per le fotografie dei servizi (catalogo: negozi, luoghi, domande, attività, film, libri, offerte; catalogo degli oggetti; note storiche; inviti; giorni). Il campo si allinea solo se vale `prima`, come nella 228. Per i JSON: i premi degli esami usano il percorso unito da «/» (`noteGenerali`); `domanda.risposte_json` e `giorno.vincoli_json` stanno nella fotografia come testo intero, che si allinea se coincide con la colonna di prima. Il Palazzo (`dungeon.seed_json`) conserva solo il boss finale: niente da allineare. |
| **R3 + decisione 1** (rapporto) | Tolti da tutte le colonne visibili: eventi 32, 52, 79, 97, 136; regalo di Ann n. 5 (`dove`); abilità di Makoto rango 3; nota generale di Akechi. Le frasi che restano sono grammaticali (per esempio «…(dato dalla guida).», «…non a una data fissa.»). |
| **R4 + decisione 2** (fonte delle note storiche) | `pagine-ammuffite-hinokuniya` e `-taiheido`: «Guida italiana (pagina Libri, elenco dei negozi); fonte esterna (criticalhits.com.br)», con la copia della guida allineata. `homunculus-prezzi-fonte`: la fonte era fatta solo di riferimenti di lavoro e **diventa vuota** («rimuovi la fonte», voce aggiunta dal PM, che ha adattato servizio, rotta e interfaccia alla fonte vuota). La copia della guida dell'invito `makoto/07-30` perde «(G-028)»: è una voce a sé (colonna `seed_json`, percorso `nota`), perché «Ripristina» degli inviti riscrive la nota dalla copia. |
| **Decisione 3** (riformulazioni) | I segmenti «Prima di G-036 (…): …» si tolgono interi (13 segmenti in 8 note). La parentesi «(Fonte: sintesi WebSearch da allgamestaff.it/… (non verificato…).)» si toglie intera (#156, #157). Le frasi su `niijima_note.md`, `mementos_note.md` e «file note» si tolgono. Nessuna frase nuova. |
| **Decisione 4** (accenti) | Aggiunti gli accenti mancanti senza apostrofo in tutte le colonne visibili. Le parole sono decise nel contesto: «abilita il Terzo Occhio» (4 righe) ed «eredita l'abilità» sono verbi e restano; «stabilita dalla trama» è un participio e resta. Ci sono anche frasi decise a mano: «è» al posto di «e», «sì», «dà», «c'è». |
| **R5** | Voce #146 (`requisitoConoscenza.fonte`) **tolta**: è provenienza, la pagina la filtra (`DomandePage.tsx:177`), e la regola dell'utente lascia intatta la provenienza come le altre colonne `fonte`. |
| **N1** (copia di un testo riscritto dall'utente) | Se l'utente ha riscritto proprio il testo dell'elenco, la voce si salta e il suo testo resta intatto. La copia della guida (`seed_json` o `dati_guida`) si allinea lo stesso, se il suo campo vale `prima`: «Ripristina» rimette il testo pulito. Per i JSON conservati come testo (`DOCUMENTO`) si cambia il solo valore al percorso della voce dentro il documento conservato, se è canonico. |
| **N2** (copie degli editor dei Confidenti) | Si allineano con la stessa regola anche `confidente-seed-v1:dialogo:<id>` (`note`, e `scelte_json` al percorso della voce) e `confidente-seed-v1:abilita:<confidente>:<rango>`. In quest'ultima si allinea l'unica abilità con la descrizione di prima. La copia del rango si allinea anche quando l'editor ha rinumerato le righe e la voce trova la «riga assente». |
| **N3** (nomi) | Accentati i nomi mostrati: libro, offerta e oggetto «Eredità dell'Impiccato»; offerte e oggetti «Principi/Maestria del caffè», «Anello della vitalità», «Veste tranquillità»; attività «Preparazione del caffè a Leblanc»; `voce_giornata.riferimento_testo` (3 righe). Allineate le copie (`nome`). Le colonne `chiave` e `fonte_chiave` non si toccano. Nessun codice confronta questi nomi alla lettera (grep su `server`, `shared`, `src`, `scripts` e migrazioni): ricerche e `riferimento_testo` si confrontano senza accenti. |
| **N4** (JSON delle schede) | `attivita.doti_json[].condizione` (freccette, bagno pubblico, caffè Leblanc, Gun About, esperimenti di Takemi), `libro.effetti_json` e `catalogo_oggetto.statistiche_json` di «Lettura rapida»: corretti al percorso esatto, con le copie allineate. I valori-codice e le chiavi JSON non si toccano. Lo storico `voce_giornata.testo_precedente_json` resta com'è: è il testo prima di una revisione. |
| **Quarto giro** (futuri e «casinò») | Ho cercato i futuri in -ero/-era/-iro/-ira/-aro/-ara/-oro/-ora senza accento in tutte le colonne dell'elenco, poi deciso a mano: «ora», «era», «sera», «tollero», «spero», «adoro», «accelera», «dichiara»… sono parole giuste e restano. Corretti in 9 voci nuove: dialoghi 169 «Non farò vincere i cattivi», 170 «Glielo riferirò», 187 «Non funzionerà», 204 «Pensi che ce la farò?», 209 «Non lo scorderò mai»; Diario «ti aiuterà», «non servirà», «Non funzionerà», «Farò il tifo per te!». Nella copia di avvio «Non farò vincere i cattivi» è in una sola riga. «casino'»/«casino» → «casinò» in 37 voci nuove (fasi dei giorni 10-29…11-23, trama e avvisi, Diario, settimane 28 e 30, evento 115 e dettaglio dell'evento 1, effetto della «Sciabola» in offerta e catalogo) e in 2 voci esistenti di cui cambia il «dopo»: `settimana_guida` 0 («Tutorial di fuga dal casinò») e la nota di `negozio-palazzo-niijima`. Le copie si allineano con le stesse regole. |
| **R6 + decisione 5** | Il dominio diventa «AllGameStaff». Nelle righe già toccate dall'elenco diventano «AllGameStaff» anche «allgamestaff» e «Allgamestaff» (#75, #82, #154 e altre). Gli URL completi restano: mascherati prima di ogni regola. «WebSearch» è tolto da #151 («Dati di supporto/incrocio (aggregazione…)»). |

Colonne nuove nell'elenco, con dove si vedono:

| Colonna | Dove si vede |
|---|---|
| `confidente_abilita.descrizione` | `ConfidenteDettaglioPage.tsx:208` |
| `confidente_regalo.dove` | `ConfidenteDettaglioPage.tsx:253` |
| `nota_storica.fonte` | `NoteStoricheOfferta.tsx:54` |
| `confidente_dialogo.note`, `scelte_json[].testo` | `DialogoRango` |
| `confidente_requisito(_guida).testo` | `_guida` è la copia della guida dei requisiti: allineata con le stesse voci |
| `confidente_disponibilita.giorni_json`, `sblocco_requisiti` | `compendioService:509` |
| `voce_giornata.azione`, `.note` | Diario |
| `giorno.fase`, `trama`, `avvisi_json`, `vincoli_json` | `GiornoGuida.tsx:375-385`, via `percorsoService` |
| `traduzione.testo` ed `extra_json.definizione` dei termini | glossario, `compendioService.terminiGlossario` |
| `articolo.effetto`, `catalogo_oggetto.effetto`, `libro.sblocca`, `negozio.note`, `attivita.dettagli` | schede del catalogo |
| `punto_interesse.dettagli_json` | `DettagliPunto` |

## Come è fatta la prova

- **Dati:** copie fresche nello scratch (`C231b/`), mai `data/`.
- **Codice:** il runner vero (`initDb` sulla copia con `DATA_DIR` sulla copia, poi `runMigrations`), lanciato con `tsx`. Script: `prova231b.mts`.
- **Misure:**
  - impronte SHA-256 di ogni tabella di `main` e `utente`, riga per riga;
  - conteggio delle eccezioni in tutto il file di gioco;
  - stato di ogni voce;
  - seconda esecuzione;
  - `integrity_check` e `foreign_key_check`.
- **Elenco:** generato in sola lettura dalla copia di avvio a 230 (`genera2.cjs`), poi rivisto parola per parola.

## Esiti

**A. Copia di avvio a 230 → 231**
- **Versioni:** 230/44 → 231/44, nessun errore.
- **Voci:** 657 su 657 avevano il testo di prima. Tutte applicate, 0 saltate (quinto giro, sulla copia a 230 `C5/gioco-230-check.db`, impronta `e89cb3a5`; il caso C è del terzo giro, con 610 voci).
- **Copie della guida allineate:** `articolo` 9, `nota_storica` 4, `confidente_regalo` 1, `luogo` 1.
- **Tabelle:** ne cambiano 29, solo nelle colonne dell'elenco (e in `seed_json` dove allineato). Le altre 146 hanno impronte identiche (complessiva `0661ff5dc19fa696`).
- **Seconda esecuzione:** nessuna tabella cambia.
- **Integrità:** `integrity_check` ok su `main` e `utente`; `foreign_key_check` vuoto.

**B. Pacchetto `pacchetto/gioco.db` 93 → 231** (con `partite.db` nuovo)
- **Esito:** 231/44 senza errori; 657 voci applicate, 0 saltate, stesse copie allineate di A.
- **Seconda esecuzione e integrità:** come in A.
- **Avvisi:** solo quelli noti di 144 e 110.

**C. Correzioni dell'utente simulate con i servizi veri, poi 231** (su una copia a 230)
- **Ombra `agile-re-delle-scimmie`** (nota riscritta dall'utente): la voce è saltata senza errori («testo diverso da quello di prima»). La nota dell'utente resta intatta.
- **Ombra `amante-geloso`** (corretto il livello, il caso R2): la fotografia aveva «(G-021 §5)», dopo ha il testo pulito. La scheda segna corretto solo `livello`.
- **Premi degli esami** (corretto un altro testo): `noteGenerali` della fotografia allineato.
- **Negozio `leblanc`**, **domanda 25** (`risposte_json` intero) e **giorno 05-17** (`vincoli_json` intero), con un altro campo corretto: le fotografie sono allineate e coincidono con la colonna.
- **E. Fonte di `homunculus-prezzi-fonte` corretta dall'utente** (`modificaNotaStorica`): la voce si salta e la fonte dell'utente resta. La copia passa da «G-034 punto 2; …» a "", e «Ripristina» vero (`ripristinaNotaStorica`) dà la fonte "".
- **N1. Ombra `agile-re-delle-scimmie`:** la nota dell'utente resta intatta. La copia passa al testo pulito, e «Ripristina» della nota dà «Personalità dai dati del gioco Royal.».
- **N2. Dialogo 169:** nota riscritta con `impostaDialogo`, fotografia in `dati_guida`. La nota dell'utente resta. La copia ha la nota pulita («lunedì») e la scelta «C'è un giocatore imbattibile»; la colonna delle scelte, non toccata dall'utente, è applicata. «Ripristina» dà la nota pulita.
- **N2. Abilità di Yoshida al rango 8:** riscritte con `impostaAbilita`, che rinumera le righe, per cui la voce trova la riga assente. La copia del rango si allinea («a volte è possibile…») e «Ripristina» la rimette pulita.
- **N3. Libro «Eredità dell'Impiccato»** con un altro campo corretto: nome della riga e della copia accentati; «Ripristina» dà «Eredità dell'Impiccato».
- **Copie allineate in tutto:** ombra 2 (una con il testo dell'utente intatto); note storiche 4 (una con il testo dell'utente intatto); `dati_guida` dei Confidenti 3 (due con il testo dell'utente intatto); regalo, negozio, luogo, premi, libro e giorno 1 ciascuno; domanda 2; offerte 9.
- **Voci saltate (4, senza errori):** le tre con il testo dell'utente e la riga d'abilità rinumerata.
- **Resto:** eccezioni come in A, seconda esecuzione senza cambi, integrità ok, impronte delle 145 tabelle non toccate identiche.

**Eccezioni intatte (occorrenze in tutto il file di gioco, prima = dopo, in A e in C):**

| Eccezione | Occorrenze |
|---|---|
| «po'» | 81 |
| «Fa'» | 9 |
| «Da'at» | 167 |
| «Jack-o'-Lantern» | 28 |
| contrazioni inglesi «…in'» | 25 |
| «'Anima da cineasta'» | 48 |
| «'Muro della vita'» | 1 |
| «'Frui-te'» | 3 |
| URL completi `https://www.allgamestaff.it` | 5306 |
| «abilita il» (verbo) | 8 |
| «eredita l'» (verbo) | 1 |

In B i conteggi dopo la catena sono gli stessi di A.

**Controlli statici:** `npx tsc -b tsconfig.full.json` = 0, `npx eslint server` = 0. La suite di test non è stata eseguita (regola «zero test»).

## Limiti e punti aperti

- **N5. «Ripristina» delle traduzioni** legge `pacchetto/gioco.db` del repository (a 93), non una copia nei dati: la 231 non lo copre. Dopo un «Ripristina» del glossario possono tornare i testi senza accento (`traduzione.testo` ed `extra_json.definizione`). È un limite noto.
- **Accenti che le parole non rivelano.** Sono corretti quelli riconoscibili dalla parola (-ità, giorni, più/può/già/così/perché/ciò…) e le frasi decise a mano. Restano possibili «e/è», «da/dà», «si/sì» ambigui in testi lunghi. Restano anche le elisioni senza apostrofo («l attivita», «dall inizio», «un abilità»), che non sono accenti.
- **Chiavi non toccate:** le colonne `chiave`, `fonte_chiave` e simili restano senza accento (per esempio `libro/eredita-dellimpiccato`). Il nome «Tazza nera (traduzione non ufficiale allgamestaff)» resta: non ha accenti mancanti e non contiene il dominio.
- **Storico del Diario:** `voce_giornata.testo_precedente_json` resta com'è.
- **Blocchi della guida (`dati_guida`) non toccati:** archivi, registri e il blocco `jose`, dove `timbri.totale` dice «vedi rapporto.md», visibile solo nell'editor.
- **Nome del sito in minuscolo** in una sessantina di altre righe visibili (Ombre dei Palazzi, regali, richieste, giorni del terzo semestre…): resta, perché non è il dominio.
- Il runtime HTTP e le pagine non sono stati osservati. La verifica avversariale spetta a un agente distinto.
