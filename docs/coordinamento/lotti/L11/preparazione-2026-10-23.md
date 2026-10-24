# L11 «Pulizia e ricerca» — preparazione dei blocchi per le sessioni Sonnet

Analisi dati, 2026-10-23, sola lettura. Richiesta del PM: per ogni requisito padre `R11-*` (e `UI-ASSET-01`) dire che cosa c'è nel DB e nel codice, quali fonti servono, la complessità e le dipendenze;
poi blocchi in ondate, voci già soddisfatte con la prova `file:riga`, rischi e limiti. Niente commit, nessuna modifica a codice o dati.

Metodo: `requisiti.md`, `piano.md`, `modifiche.md`, `app.md`, `dati.md`, `difetti.md` di L11 letti per intero; `stato.json` → `pianoAtomico.voci` (lotto L11); requisiti e preparazioni di L2–L10 solo dove citano L11;
DB misurato in sola lettura sulla copia `sim-142b` (p5s portata a gioco 146; il file utente della copia riporta `user_version` 30); lettori cercati con grep reali su `server/`, `shared/`, `src/`
(esclusi `*.test.ts[x]`, `server/db/migrations/`, `server/db/migrazioniUtente/`). Le righe citate sono del worktree al 23/10 (le righe di `app.md` del 20/10 sono in parte superate: dove ho trovato la differenza lo dico).

## 1. In breve

- **L11 ha 23 requisiti padri con voci** (22 `R11-*` + `UI-ASSET-01`) e **82 voci** (81 `da-fare` + 1 `riservato-utente`: `R11-09/collaudo-utente`). Altri 9 padri sono **vincoli senza voci** (`R11-04`, `R11-21`…`R11-27`).
  Tre padri pesano di più: `R11-02` 13 voci, `R11-10c` 13, `R11-15` 12.
- **Nulla della parte nuova è scritto**: non esistono `ricercaService`, `RicercaGlobale`, `/api/ricerca`, `/api/mappe/gerarchia`, `/api/da-rivedere`, `ripristinoService`, `correzione_dati_guida`, il blocco `sinonimi-ricerca`.
  `/guida/mappe` è ancora l'indice vecchio (`MappaPage.tsx:79` `IndiceMappe`, titolo «Mappe» a `:160`).
- **Nessuna delle fonti vecchie è davvero «senza lettori» oggi**: i lotti L2–L5 hanno smesso di scriverle/leggerle in alcuni punti, ma restano lettori e scrittori vivi (§4.1). Quindi in L11 la pulizia è
  quasi sempre **porting dei lettori + migrazione + drop**, non solo `DROP`. Fa eccezione un gruppo piccolo di fonti davvero morte e pronte (§5, blocchi B7 e B8).
- **Tre punti del piano di L11 contraddicono regole o fatti più recenti** e vanno decisi prima di assegnare i blocchi interessati (§8): l'elenco unico «Da rivedere» (`R11-10c`, 13 voci) contro la regola
  del 23/10 «niente nuovi pannelli di revisione senza il sì dell'utente» (BON-11); la riscrittura dei test per tenere il typecheck verde contro `R11-04` («senza modificarli»); `R11-16/17` («le correzioni
  restano dopo un aggiornamento del pacchetto») contro la regola dei dati del 21/10 (la fonte è il DB dell'istanza; «Importa» sostituisce `gioco.db`, non unisce).
- **Proposta**: **20 blocchi** (B1–B21, senza B14) in **6 ondate**, più il collaudo riservato all'utente. 10 blocchi (41 voci) partono nelle ondate 1–3, senza dipendenze da L8–L10; 3 (7 voci) aspettano L8; 3 (10 voci) aspettano L9/L10;
  1 (13 voci) è sospeso (`R11-10c`); 3 (10 voci) sono chiusura.
- **Voci già soddisfatte per intero**: nessuna con prova piena. **Parziali** (cosa c'è, cosa manca): 13 righe fra voci e padri, con prova `file:riga` in §6. Non ne ho chiusa nessuna.

## 2. Stato di partenza (misurato su `sim-142b`)

| Cosa | Oggi |
|---|---|
| Mappe | `mappa` 316 (tipi: area 255, luogo 25, quartiere 24, palazzo 9, citta 1, dedalo 1, generica 1); `mappa.entita_tipo`: NULL 177, area 105, quartiere 24, dungeon 10 |
| Legami vecchi | `mappa_entita` 135 (area 131, luogo 3, quartiere 1); **tutte le 131 righe `area` coincidono con un legame di `infiltrazione_area`** (0 non coperte); le 105 mappe con `entita_tipo='area'` hanno tutte `area_chiave` |
| Presentazione | `mappa_presentazione` 226; `gruppo_immagini_json` non vuoto in 219 (211 mappe `area`, 8 `luogo`) |
| Guida delle mappe | `guida_mappa` 92 (`note` e `metadata_json` sempre vuote), `guida_alias` 92 (viva) |
| Marcatori e piante | `marcatore_mappa` 149 (tutte `seed`, 148 su voci **senza** pin; tutte di Palazzi), `marcatore_luogo` 47, `pianta_area` 84, `pianta_quartiere` 22 |
| Schede senza mappa | `spillo` con `mappa_chiave` NULL: 154, tutte `seed`, tutte di Palazzi (150 con riferimento «punto», 4 di Kamoshida senza voce); 0 in `spillo_voce` |
| Stato di partita | `spillo_partita` 797 (p1 459, p2 338); `spillo_partita_infiltrazione` 90 (p1, 40 uid); **40 righe di `spillo_partita` di p1 coincidono con quei 40 uid** (tutte `raccolto=1`); `punto_partita` 564 (tutte `automatico=0`); `requisito_partita` 0; `lettura_partita` 14; `turno_partita` 11; `attivita_svolta_partita` 8 |
| Calendario | `giorno_calendario` 346, `giorno_percorso` 346 (`azioni_json` non vuoto in 299), `evento_calendario` 173, `allerta_meteo` 74, `settimana_guida` 42; **non esiste `giorno`** (è di L9) |
| Esami | `esame` 4 (`domande_json` in tutte), `domanda` 78 (classe 55, esame-finale 6, esame-medio 6, tv 11) |
| Diario | `voce_giornata` 998; 255 voci fra 04-01 e 06-01; `da_rivedere=1` su 8 (tutte dopo il 06-01); `produce_json` non vuoto in 266; `voce_effetto` 290 (dote 204, lettura 72, turno 9, acquisto 5) |
| Cestino | `cestino` 8 righe (2 mappa, 3 oggetto, 2 pin, 1 voce); i registri citano `mappa.entita_tipo/entita_chiave`, `mappa_presentazione.gruppo_immagini_json`, `articolo.condizione`, 635 passi di `mappa_percorso`; `cestino_partite` 0 |
| Lavoro dell'utente (`origine='utente'`) | spillo 795, mappa 77, articolo 76, area 23, luogo 4, negozio 4, attivita 1, film 1 |
| Partite | 2 (p1 attiva, p2 di prova) |
| `dati_guida` | 30 blocchi; **18 senza alcun riferimento letterale alla chiave nel codice** (audit/rettifiche/raccordi delle migrazioni 121–146, di cui `audit-catalogo-121` ≈ 5,7 MB); `battaglia` 217 Ombre; `personaggi` 27 + 4 gruppi; `sfide` 5 sezioni; `completamento` 7 sezioni |
| Migrazioni | file fino alla **153** (registrate in `server/db/migrations/index.ts`); la copia di misura è a **146**; utente: file fino alla 036 |

Quindi: le misure sono sulla copia 1935Z a 146; le migrazioni 147–153 e la utente 031–036 non sono nella copia (§9).

## 3. Cosa lascia ogni lotto precedente e cosa si può fare già

| Lotto | Stato (stato.json) | Cosa lascia a L11 (con prova) | Effetto su L11 |
|---|---|---|---|
| L2 | tutte le fasi fatte; APPROVATO e consegnato | `mappa.entita_*`, `mappa_entita`, `gruppo_immagini_json` del mondo; Area del mondo (`area` 140), `casa` unica | si può portare e togliere il legame vecchio (B9) |
| L3 | fasi fatte, `consegna: difetti`; UX3-14 pubblicato, restano campo «Planimetria» e guida nel visore | legami `infiltrazione_area`; fonti vecchie non più scritte in parte (`mappeService.ts:647`, `dungeonService.ts:732`) | B9 può partire; l'albero dei Palazzi (B5) si appoggia su `area`/`infiltrazione_area` |
| L4 | consegna fatta; UX/no-reg/layout/validazione da fare (prove utente aperte) | `spillo_partita` dei condivisi, schede senza mappa, `bossFinali` (ancora vivo per i Memento) | B13 dopo il confronto p1/p2; `bossFinali` non è morto (§4.1) |
| L5 | 151 voci chiuse, 49 `chiuso-codice`, 1 `in-corso`; validazione/consegna `difetti` | `marcatore_luogo`, `pianta_area`, `luogo.quando/giorni/negozio`, `negozio.luogo/orari`, nomi dei pin | B8 e B12 |
| L6 | 26 `chiuso-codice`, 5 `chiuso`; «L6 resta aperto» (nota) | frasi di sblocco (`quartiere.sblocco`, `luogo.sblocco`, …), `requisito_partita`, `articolo.condizione` | B12; non toccare finché la ricerca R6 e la pesca A10 non sono chiuse |
| L7 | 84 `chiuso`, 118 `chiuso-codice`; fasi be/fe `in-corso` | vecchi cataloghi articolo (copie di nome/effetto/prezzo), `oggetti-guida`, 18 blocchi di audit | B12 e B1 (archivio) |
| L8 | 1227 voci `da-fare`, nessuna implementazione | nomi vecchi degli elementi, copie delle debolezze, Iweleth come Palazzo | B6, B13, B17 aspettano L8 |
| L9 | 281 voci `da-fare` | `giorno_percorso`/`giorno_calendario`/`evento_calendario`, `esame.domande_json`, frasi di `confidente_disponibilita`, `attivita.luogo/sblocco` | B12, B15, B16 aspettano L9 |
| L10 | 109 `da-fare`, 31 `chiuso-codice`, 3 `chiuso` | `voce_giornata.produce_json`, specchio `lettura_partita` | B15 aspetta L10 |

Regola: nessuna eliminazione parte prima che il lotto che sostituisce sia consegnato **e** i lettori siano portati; l'inventario (B1) si rifà a L10 consegnato (`modifiche.md` §1.1, segnalazione A).

## 4. I 23 requisiti padri

Complessità: **B** bassa (una sessione breve), **M** media (una sessione, più file), **A** alta (più sessioni, o gate del revisore). «Voci» = figlie in `pianoAtomico`.

### 4.1 Dati e codice morti

| Req | Voci | Oggi nel DB | Oggi nel codice | Fonti per completarlo | Compl. | Dipende da |
|---|---:|---|---|---|---|---|
| **R11-01** inventario di ogni tabella/colonna con i lettori | 1 | **161 tabelle** (101 `gioco` con 808 colonne, 60 `utente` con 446: erano 110/816 nel `dati.md` del 20/10); vuote: 3 in `gioco` (`decisione_tanaka_ripristino`, `organizzazione_mappa_esito`, `voce_infiltrazione`) e 31 in `utente` (molte nuove di L6/L10, scritte dal codice: da non eliminare); 18 blocchi `dati_guida` senza lettori; tabelle d'archivio senza lettori: `audit_aojiru_136`, `audit_pesca_138`, `organizzazione_mappa_esito` | nessuno strumento: l'inventario si fa a mano (grep) | `lotti/L11/dati.md` §1–§2, `app.md` §0, `modifiche.md` §1.1, `inventario-prod.md` (scratchpad: **non** nel repository); questo documento §4.1 | **A** (volume, non difficoltà) | tutti i lotti (baseline ora, rifare a L10 consegnato) |
| **R11-02** fonti vecchie L2–L10 | 13 | vedi tabella per voce qui sotto | idem | `modifiche.md` §1.1 | **A** | per voce |
| **R11-02b** fonti vecchie aggiunte dalle decisioni successive | 5 | vedi sotto | idem | `requisiti.md` 23-30, `modifiche.md` §1.1 punto 2b | **A** | per voce |
| **R11-03** codice morto | 4 | — | rotte, funzioni, DTO, componenti (elenco corretto in §6.4) | `app.md` §0.4 (aggiornato in §6.4); typecheck e lint | **M** | R11-02 (solo la parte che dipende dalle fonti tolte) |
| **R11-05** import/export senza le tabelle tolte; riepilogo degli scarti | 3 | export = `getDb().backup()` dell'intero file (`impostazioniService.ts:5,128`); import = `sostituisciDatiDiGioco` (`pacchettoGiocoService.ts:370-412`) | l'import sostituisce `gioco.db`, riapre con le migrazioni e le regole d'avvio (`:385-388`); `EsitoImportazionePacchettoDto` (`shared/types.ts:3027`) ha `migrazioniApplicate` e `condizioniConvertite`, **non** un elenco di tabelle/colonne scartate; l'anteprima ha `tabelleAssenti` ma solo istanza→pacchetto (`pacchettoGiocoService.ts:286,296`) | `modifiche.md` §1.2 | **M** | R11-02 (la prova vera si fa dopo i drop) |
| **R11-06** cestino che ripristina anche con colonne tolte | 1 | 8 righe di cestino; 3 citano colonne da togliere (`mappa.entita_*`, `gruppo_immagini_json`, `articolo.condizione`) | `ripristinaRegistro`: tabella assente → saltata `non-esiste-piu` (`cestinoService.ts:522`); colonna assente → ignorata **in silenzio** (`:524-525`); i motivi sono 3: `cambiata-dopo`, `non-esiste-piu`, `legame-mancante` (`shared/types.ts:3294`) | `modifiche.md` §1.2 | **M** | R11-02 |

#### R11-02 voce per voce

Colonne: oggi nel DB (misura) · lettori e scrittori vivi · cosa serve prima · Compl. · pronta?

| Voce | Fonte | Oggi nel DB | Lettori/scrittori oggi (verificati) | Cosa serve prima | Compl. | Pronta? |
|---|---|---|---|---|---|---|
| R11-02/1 | `mappa.entita_tipo/entita_chiave` | `area` 105, `quartiere` 24, `dungeon` 10 | **vivi per `quartiere` e `dungeon`**: `casaMappa.ts:79,81`, `contenutiGuidaService.ts:29,64-71`, `luoghiScritture.ts:32-36,141`, `luoghiService.ts:79-85`, `areeService.ts:272-279,679-680`, `accessoMondoService.ts:142`, `fotografiaLuogoDaPin.ts:96,186`, `precondizioneRaccordoPin.ts:117,179-213`, `censimentoLuoghiCondizioniService.ts:91`, `mappeService.ts:162,704-708,1011,1128-1132,1848,2201-2239`; FE: `MappaPage.tsx:366,528,530`, `EditorMappaPage.tsx:279-280,433`; DTO `shared/types.ts:2592,2889` | portare quartiere/Palazzo su `area_chiave`/`dungeon` e togliere `MappaRiassuntoDto.entita` e l'import/export `entitaLegami`; le 105 `area` sono già coperte da `area_chiave` | **A** | solo dopo il porting (L11 stesso); **non** è un `DROP` semplice |
| R11-02/2 | `mappa_entita` di tipo area (e le altre 4 righe) | area 131 (tutte coperte da `infiltrazione_area`), luogo 3, quartiere 1 | `area`: letta in `mappeService.ts:706-713,731`, scritta in `:750-752,2223,2409` (ripiego se non c'è `infiltrazioniDellaPlanimetria`, `routes/mappe.ts:117`); `luogo`/`quartiere`: `accessoMondoService.ts:143`, `fotografiaLuogoDaPin.ts:103,184-187`, `precondizioneRaccordoPin.ts:178-181`; la regola d'avvio `collegaLuoghiAllePlanimetrie` **scrive** i legami `luogo` (`054_...ts:51-52`, chiamata da `regoleAllAvvio` `pacchettoGioco.ts:52`) | togliere le righe `area` e i rami di compatibilità `conLegami()`; decidere dove vivono i 4 legami non-area (tenere la tabella ridotta o portarli su `luogo.area_chiave`/`area`) | **M** | dopo R11-02/1; decisione sui 4 legami |
| R11-02/3 | `mappa_presentazione.gruppo_immagini_json` | 219 non vuote (211 area, 8 luogo) | BE `mappeService.ts:126-127,786-805,819-835,849-854,882-888,2245-2249`, `areeService.ts:765`, `collezioniImmagini.ts:14-20`; FE `etichettaVersione.ts:16-29`, `gruppiPlanimetrie.ts:55,74`, `presentazioneMappa.ts:56,88-94`, `MappaPage.tsx:69,157,286-287`, `AlberoLuoghi.tsx:26,38,94-95`, `ImmaginiLuogo.tsx:21-22`; DTO `shared/types.ts:2576,2886` | far leggere etichetta e ordine delle versioni da `mappa.versione_etichetta/versione_ordine` e dall'`area`; `contesti_json` resta | **A** | dopo B5 (l'albero sostituisce `AlberoLuoghi`) |
| R11-02/4 | nome (e `note`/`metadata_json`) di `guida_mappa` | 92 righe, `note` 0 non vuote, `metadata_json` 0 | unico lettore: `contenutiGuidaService.ts:67-71` (`COALESCE(g.note,'')`, sempre vuota; il nome mostrato è `dungeon_area.nome`, non `guida_mappa.nome`); scrittori solo 027/042 (`organizzazioneMappe.ts:28`, `sincronizzaMappe.ts:100-101`); `guida_alias` (92) **resta**: è viva (`dungeonService`, `contenutiGuidaService`) | togliere il JOIN e la voce `cestinoService.ts:108` (`guida_mappa`) dopo il congelamento di 027/042 | **B** | sì, dopo B9-congelamento |
| R11-02/5 | `marcatore_mappa` | 149 (148 su voci senza pin) | `dungeonService.ts:129-131` (`marcatori()`, usata a `:378,445,506,1218` → `PuntoDto.marcatore`, **nessun lettore FE**), `contenutiGuidaService.ts:89-100` (`posizioneDaCollocare`, **nessun lettore FE**: `shared/organizzazioneMappe.ts:27`); scritture `dungeonService.ts:1414,1585`; `sincronizzaMappe.ts:143-145` (solo 027) | decidere se la «posizione da collocare» della scheda sistemata si perde (il FE non la usa) o passa a `spillo` | **M** | sì, dopo decisione §8.7 |
| R11-02/6 | `marcatore_luogo` | 47 | **nessun lettore runtime**: `cittaService.ts:120` (commento), `luoghiService.ts:164` (`marcatore: null`); scritture solo `luoghiScritture.ts:142` (DELETE) e `sincronizzaMappe.ts:170-172` (solo 027); DTO `LuogoDto.marcatore` (`shared/types.ts:1747,2175`) | togliere DTO, DELETE e riga di `cestinoService.ts:123` | **B** | **sì (B8)** |
| R11-02/7 | `pianta_area` | 84 (`copre_aree_json` 1, `alternative_json` 2) | solo `dungeonService.ts:748-751` (ripulisce la copertura quando si elimina un'area); `cestinoService.ts:107` | togliere il blocco di pulizia e la riga del cestino | **B** | **sì (B8)** |
| R11-02/8 | `pianta_quartiere` | 22 | **viva**: `cittaService.ts:123,149`, `routes/mappe.ts:43-47` (`POST /piante-citta/:q/scarica`), FE `QuartierePage.tsx:142-197,255`; fonte URL della mappa del quartiere | decidere: tenerla come «fonte dell'illustrazione» (archivio con motivo) o portare l'URL su `immagine.origine_url`; `mappe-citta-assenti` (blocco) la accompagna | **M** | dopo decisione §8.5 |
| R11-02/9 | frasi di orari e sblocco | `luogo.quando` 41, `luogo.giorni` 10, `luogo.sblocco` 39, `negozio.orari` 59, `negozio.sblocco` 35, `attivita.sblocco` 18, `quartiere.sblocco` 20, `quartiere.sblocco_data` 7, `confidente_disponibilita.sblocco_data/sblocco_requisiti/luogo` 21/22/23 | `luogo.quando`/`giorni_json` letti solo nel ramo «schema di prima» (`luoghiService.ts:154-157`); **`luogo.sblocco` si mostra** (`QuartierePage.tsx:117`, DTO `shared/types.ts:1732`); `quartiere.sblocco` è nel DTO (`cittaService.ts:109,132`) ma il FE non lo mostra; **`quartiere.sblocco_data` è vivo** (fallback in `disponibilitaService.ts:62,90`); le frasi dei Confidenti sono di L9 (`compendioService.ts:464-470`) | regola R6-18: si toglie solo la colonna che è **copia esatta** del dato strutturato; le frasi con contesto restano note | **A** | L5/L6 chiusi + L9 per i Confidenti |
| R11-02/10 | copie di nomi e prezzi | `negozio.luogo` 61 (frase), `negozio.luogo_chiave` 61 (= quartiere, **letto**: `luoghiService.ts:109`), `luogo.negozio` 42, `attivita.luogo` 29, `articolo.condizione` 106 (frase) contro `condizioni_json` 562, `articolo.nome_it` 1, `articolo.prezzo` 574 contro `costo_json` 58 | il testo della voce **non elenca** le copie: `modifiche.md` non le definisce; dichiarate morte in `cittaService.ts:5-8` (`luogo.negozio`, `attivita_json`) | l'elenco esatto lo produce B1 (inventario); da chiarire con l'Esperto o con L7 quali colonne di `articolo` sono copia del catalogo (`catalogo_chiave` 643/650) | **A** | L7 chiuso; elenco da B1 (§8.6) |
| R11-02/11 | seconda tabella giornaliera | `giorno_percorso` 346 e `giorno_calendario` 346 | `percorsoService.ts:31,44,49-50,68,74`, `giornataService.ts:328,575`, `giornoPartitaService.ts:42`, `suggerimentiService.ts:172`, `meteoService.ts:21-22` (`COALESCE` fra le due), `partiteService.ts:84`, `calendarioService.ts:40-52,65`, `disponibilitaService.ts:108`, `acquistiService.ts:107`; `conversioneEffettiAzione.ts:90` | tabella `giorno` di L9 e sei lettori portati | **A** | **L9** (B+C+F) |
| R11-02/12 | `evento_calendario` | 173 (storia 61, sblocco 46, festa 24, scadenza 18, vacanza 11, esame 8, meteo 4, consiglio 1) | `calendarioService.ts:42` | **divergenza fra i documenti di L9**: `requisiti.md` R9-20 dice «diventano voci del diario», `modifiche.md` di L9 dice «restano eventi collegati per chiave» (`L9/preparazione-2026-10-23.md` §6.1); nel secondo caso la tabella **non si elimina** | **M** | L9 + decisione §8.4 |
| R11-02/13 | contatori doppi | `lettura_partita` 14 (specchio derivato di `progresso_libro/film_partita`); `turno_partita` 11 contro `attivita_svolta_partita` 8 | `lettura_partita` scritta come «specchio di compatibilità» (`attivitaService.ts:455-458`), letta ancora da `motoreDiario.ts` (commento `:452-454`), `pacchettoGiocoService.ts:85-86`; «letto» già calcolato dall'avanzamento (`:188`). **`turno_partita` non è un doppione da togliere**: resta il dettaglio dei turni e lo usa la pesca (`allocazioniTurniPesca.ts:23-58`) | L10 (portare `motoreDiario` al calcolo); solo `lettura_partita` è candidata | **M** | **L10** (BE) |

#### R11-02b voce per voce

| Voce | Fonte | Oggi nel DB | Lettori oggi | Cosa serve prima | Compl. | Pronta? |
|---|---|---|---|---|---|---|
| R11-02b/1 | righe `utente.spillo_partita` dei pin condivisi da rigenerabili | p1: 40 righe (tutte `raccolto=1`) con gli stessi 40 uid delle 90 righe di `spillo_partita_infiltrazione`; p2: 0 | per i pin condivisi `statoDelPin` legge solo la riga per infiltrazione (`statiGuida.ts:329-338`); `statiGuida.ts:190` e `mappeService.ts:420` leggono comunque l'insieme dei raccolti; `riallineaStati` le lascia «fino a L11» (`statiGuida.ts:572`) | confronto p1/p2 voce per voce e pin per pin prima e dopo (R11-02b, ultima frase); **è una scrittura su `partite.db`** | **M** | sì tecnicamente; vedi rischi §7 |
| R11-02b/2 | euristica `bossFinali`/`eBossFinale` | `dungeon.voce_boss_finale` dichiarato per i Palazzi; Memento e Iweleth con `regola_boss='memento'`/`'voce-finale'` | `eBossFinale` **non esiste più** (resta in un commento di `112_voce_boss_finale.ts`); **`bossFinali()` vive** (`palazziService.ts:65-81`), usata da `statoPalazzi` (`:167`) per i Memento (`:29,168`) | decidere la regola dei Memento senza l'euristica (o dichiarare che resta, ridenominata, solo per i Memento) | **M** | dopo L8 (Iweleth) e decisione §8.8 |
| R11-02b/3 | frasi di sblocco dei quartieri | `quartiere.sblocco` 20, `sblocco_data` 7; blocco `dati_guida.sblocco-quartieri` | il blocco `sblocco-quartieri` **non ha lettori** (solo un commento a `shared/types.ts:1710`); la colonna `sblocco` è nel DTO (`cittaService.ts:109,132`, FE non la mostra); `sblocco_data` è vivo (`disponibilitaService.ts:62,90`) | togliere il blocco; la frase solo se è copia esatta di `condizioni_json` (23/24 righe hanno la condizione) | **M** | sì per il blocco; la colonna dopo B12 |
| R11-02b/4 | nomi vecchi degli elementi | `traduzione` ambiti `elementoAffinita` 10 e `elementoSkill` 16 (L8: 13 etichette da correggere) | costanti in `BattagliaPage`, `CompendioPage`, `elementiGuida.ts` | **L8 R8-20c non è fatto** | **B** | **L8** |
| R11-02b/5 | copie di orari divise da L5 | `luogo.orari_json` 40, `negozio.eccezione_orari_json` 4, `negozio.orari_json` 61 | `negozio.orari_json` è ancora il solo orario dei negozi **senza sede** (`negoziService.ts:61`; 1 negozio su 62 senza `sede_chiave`); `presenzaEntita.ts:95-96` lo legge ma la funzione è morta (§6.4) | togliere `luogo.quando/giorni/giorni_json` e la copia in `negozio.orari`; i giorni di Hifumi dopo L9 | **M** | L5 chiuso + L9 |

### 4.2 Ricerca globale

| Req | Voci | Oggi nel DB | Oggi nel codice | Fonti per completarlo | Compl. | Dipende da |
|---|---:|---|---|---|---|---|
| **R11-07** ricerca globale da ogni pagina, per nome (it e originale) | 3 | oggetti da indicizzare (misura): quartieri 24, aree 140 (mondo+Palazzi), planimetrie 316, luoghi 109, negozi 62, Palazzi 9, infiltrazioni 100 (`dungeon_area`), voci della guida 960, Persona 232, oggetti 1298 (`catalogo_oggetto`), Confidenti 23, attività 30, libri 46, film 30, Richieste 33, giorni 346, trofei 53; nomi originali: `traduzione` (persona 232, skill 490, oggetto 223, negoziazione 120), `libro.nome_it`, `film.nome_it`, `catalogo_oggetto.nomi_altri_json` | **niente**: ~30 ricerche locali su `CampoRicerca` (`src/components/shared/CampoRicerca.tsx`) con `normalizzaTesto`/`corrispondeRicerca` (`shared/testo.ts:6,17`); `invalidaCacheDiGioco` (`cacheDiGioco.ts:26`, chiamata da 13 file) per svuotare l'indice; case già calcolate: `casaDelLuogo` (`luoghiService.ts:72`), `casaOggetto` (`shared/catalogo.ts:76`), `casaDellaMappa/casaDellArea/casaDelPalazzo` (`casaMappa.ts:60,69,77`); barre: `Topbar.tsx`, `BottomNav.tsx`, `Sidebar.tsx`, `MainLayout.tsx`; rotte esistenti in `router.tsx:68-112` | `modifiche.md` §2; `shared/testo.ts`; G-038 in `docs/coordinamento/guida/registro.md:1185-1207` (sinonimi) | **A** | L8 (pagina Ombra), L9 (pagina attività, elenco Confidenti) per i tipi nuovi |
| **R11-08** raggruppati per tipo, percorso, immagine | 3 | `immagine` 808 + `immagine_miniatura` 152; ruolo/immagine della mappa risolti da `immagineMappa.ts` | il risolutore di L1 è **specifico delle mappe**; per gli altri oggetti l'immagine è per `(ambito, chiave)` (`shared/immagini.ts:17-25`, `useAsset`) | `modifiche.md` §2; percorso dalle case | **M** | R11-07 |
| **R11-09** ogni oggetto si trova | 2 | — | nessun controllo; i tipi senza pagina propria (libro, film, videogioco, Richiesta, trofeo, sfida, giorno) hanno solo l'elenco (`router.tsx:78-101`) | `modifiche.md` §2 «Controllo automatico» (nuovo test: vietato eseguirlo, la regola è zero test; la prova la fa l'utente o un controllo statico/script di sola lettura) | **M** | R11-07; scelta della «casa» per i tipi senza pagina (§8.10) |
| **R11-10** nascosti | 1 | `nascosto=1`: negozio 1, articolo 18 | colonna `nascosto` su 8 tabelle del catalogo (`catalogoService.ts:98,129`) | idem | **B** | R11-07 |
| **R11-10b** luogo chiuso si trova con il motivo; nessun «Mappa»/«atlante»; aree «da verificare» | 3 | `area.da_verificare=1`: 1 (Area riservata allo staff) | `presenzaDelLuogo` già produce «Aperto/Chiuso adesso · …» (`luoghiService.ts:125-137`, DTO `shared/types.ts:1781-1783`); `daVerificare` su Area (`areeService.ts:175`, `casaMappa.ts:110`); «Mappe» ancora nei testi (`sezioniGuida.tsx:25`, `MappaPage.tsx:160,508`) | L5 R5-20b–d | **M** | R11-07, R11-11 |
| **R11-10c** elenco unico «Da rivedere» | 13 | sorgenti: `voce_giornata.da_rivedere` 8; `proposta_infiltrazione_voce` 102; `proposta_effetto_voce` 20; `proposta_abbinamento` 87; `divergenza_partita` 0; `area.da_verificare` 1; pin 811, Sakura Residence, «Pagine ammuffite», Gelo/respinge, Makoto 30/7, 8 voci d'invito | i gesti esistono sparsi: voce `da_rivedere` (`giornataService.ts:320-327`), proposte d'effetto (`routes/compendio.ts:68-77`), divergenze (`routes/partite.ts:277-280`), abbinamenti (`catalogoOggettiFusione.ts`, ma **tolti** da BON-07), Tanaka (**tolto** da BON-08) | `modifiche.md` §2; `requisiti.md` 46-61 | **A** | **blocco di decisione §8.1** (BON-11); L8–L10 per le sorgenti |

### 4.3 Albero «Mappe»

| Req | Voci | Oggi nel DB | Oggi nel codice | Fonti per completarlo | Compl. | Dipende da |
|---|---:|---|---|---|---|---|
| **R11-11** `/guida/mappe` come albero (Città, Palazzi, Memento) | 3 | Tokyo 1, quartieri 24, aree mondo 23, planimetrie mondo 29; Palazzi 9 con aree 117 (Iweleth 16) e planimetrie; `area_dedalo` 95 in 9 dedali; `dungeon` `mementos` + Iweleth come `palazzo` con `regola_boss='memento'` e anche come `mementos-08-iweleth` (13 aree) | `IndiceMappe` (`MappaPage.tsx:79-260`) con `radiciRaggruppate` (`:65`), `PannelloLuogo` (`:262`), `AlberoLuoghi` (124 righe); server `GET /api/mappe/albero` (`routes/mappe.ts:52`) e `/albero/conteggi` (`:57`) usati anche dal visore (`MappaPage.tsx:506`); nessun `gerarchia` | `modifiche.md` §3; `lotti/L2/analisi-elenco-mappe.md` (E1, E2, E6, E8) | **A** | L2/L3 consegnati (Tokyo, Palazzi); **L8 B7** per Memento/Iweleth |
| **R11-12** ogni nodo alla casa; niente viste alternative | 5 | — | `casaDellaMappa` (`casaMappa.ts:77-86`) e gli indirizzi: `/guida/citta`, `/guida/citta/:q`, `/guida/citta/:q/:area`, `/guida/dungeon/:k`, `/guida/dungeon/:k/area/:slug` (`router.tsx`); viste alternative da togliere: `MappaTokyo` (540 righe, usata da `OggiMappa.tsx:69` e `CittaPage`), `PannelloLuogo`, griglia del Palazzo | idem | **M** | R11-11 |
| **R11-13** lista «da collocare» raggiungibile dall'albero | 1 | `mappeDaCollocare` (dopo la 109 nessuna) | `GET /api/aree/da-collocare` (`routes/aree.ts:37`), `PUT /api/aree/colloca` (`:40`), FE `AreeDellaCitta.tsx:81-82` (sotto «La città») | idem | **B** | R11-11 |
| **R11-14** «Nuova mappa» generica non esiste più | 1 | — | nel mondo non c'è (`utils/aree.ts:36-41`, `EditorMappaPage.tsx:585-587`); **fuori dal mondo (Palazzi) resta** «Nuova mappa» (`EditorMappaPage.tsx:587`, `EditorMappaPage.test.tsx:816-820`) | `modifiche.md` §3 ultimo punto | **B** | decisione §8.9 |

### 4.4 «Modifica» e «Ripristina» ovunque

Come funziona oggi «Ripristina»: `seed_json` + `origine='utente'` su 15 tabelle del catalogo/guida (`catalogoService.ts`, `areeService`, `catalogoOggettiScritture`, `dungeonService`, `noteStoricheService`, `costoRegaloService`, `regolePescaService`).

| Voce | Dominio | Oggi nel DB | Oggi nel codice: «Modifica» e «Ripristina» | Compl. | Dipende da |
|---|---|---|---|---|---|
| R11-15/1 | Calendario | `giorno_*` 346, `evento_calendario` 173, `allerta_meteo` 74, `settimana_guida` 42: nessun `seed_json` | nessuna scrittura (`PUT /compendio/giorni/:data` non esiste: `L9/preparazione` §2) | **M** | **L9** (tabella `giorno`) |
| R11-15/2 | Confidenti | `confidente*`: `confidente_regalo.seed_json`, `confidente_invito.seed_json`; il resto senza | solo requisiti di rango con ripristino (`routes/compendio.ts:409-411`), Dote per incontro, costo del regalo (`routes/catalogoOggetti.ts:19`), editor informativo della disponibilità | **A** | **L9** (B, D) |
| R11-15/3 | Persona e compendio | `persona` 232, `persona_affinita` 2320, `persona_skill` 1614, `skill` 525, `fusione_speciale` 24/94, `tesoro` 9, `dlc_set` 13: nessun `seed_json` | **nessun endpoint** di modifica in `routes/compendio.ts`; `PersonaDettaglioPage.tsx` è di sola lettura | **A** | **L8** (B2, B3: le affinità sono di L8 R8-10) |
| R11-15/4 | Ombre e Battaglia | `dati_guida.battaglia` 217 Ombre + 8 sezioni | `battagliaService.ts` solo lettura | **A** | **L8** (B4, B8) |
| R11-15/5 | Oggetti | `catalogo_oggetto` 1298 (`origine='utente'` 0), `ricetta_materiale` 23, `trasformazione_oggetto` 8, `dati_guida.oggetti-guida` 178 KB | catalogo oggetti: `PUT/POST …/ripristina` (`routes/catalogoOggetti.ts:51,54`), FE `OggettoPage.tsx:81`; costo regalo e note storiche con ripristino; **da verificare**: fabbricazione, abiti, scambi, tesori | **M** | L7 chiuso; elenco di verifica |
| R11-15/6 | Città (quartieri) | `quartiere` 24 senza `seed_json` | solo `ingresso` (`compendio.ts:217`) e `sblocco` con ripristino (`:229-234`); **nome e descrizione non modificabili** | **M** | nessuno |
| R11-15/7 | Scuola (esami) | `esame` 4, `esame_premi` 1 (blocchi senza `seed_json`); `domanda`/`cruciverba` con ripristino già | esami (date, domande, premi) solo lettura (`domandeService.ts:35-36`) | **M** | **L9** (R9-18: esami in una tabella) |
| R11-15/8 | Personaggi | `dati_guida.personaggi` (27 + 4 gruppi) | `routes/compendio.ts:127` solo GET | **M** | nessuno (L8 B2 aggiunge le 27 forme del gruppo: coordinare) |
| R11-15/9 | Sfide | `dati_guida.sfide` (5 sezioni) | `sfideService.ts:8` solo lettura | **M** | nessuno |
| R11-15/10 | Trofei | `trofeo` 53 senza `seed_json`; `trofeo_partita` 0 (la scrive `completamentoService.ts:37-40`, **non eliminare**) | solo lettura | **M** | nessuno |
| R11-15/11 | Completamento | `dati_guida.completamento` (7 sezioni) | `completamentoService.ts:28` solo lettura | **M** | nessuno |
| R11-15/12 | Ranghi delle Doti | `dote_sociale` 5, `dote_sociale_rango` 25 | solo lettura | **B** | nessuno |
| **R11-16** le correzioni restano dopo un aggiornamento del pacchetto | 1 | — | `ricaricaPacchetto` (`pacchettoGioco.ts:194`) tiene le righe `utente` e quelle con `seed_json`, ma è **usata solo dai test**; «Importa» **sostituisce** `gioco.db` (`pacchettoGiocoService.ts:370-383`) | `modifiche.md` §4 | **M** | decisione §8.3 |
| **R11-17** nessun dato modificabile solo nel pacchetto | 1 | — | verifica globale | **M** | R11-15 completo |

### 4.5 Documenti

| Req | Voci | Oggi | Fonti | Compl. | Dipende da |
|---|---:|---|---|---|---|
| **R11-18** ARCHITETTURA sul modello finale | 1 | 1748 righe; sezioni superate elencate in `app.md` §2 (199-257, 482-559, 630…); §L1 su `useRisolviAsset` **già corretta** (0 occorrenze) | `app.md` §2; tutti i lotti | **A** (volume) | tutti (ultimo) |
| **R11-19** ROADMAP e DECISIONI | 2 | `ROADMAP.md:1316-1327` ha già la tabella L0–L11 (L8–L11 «⬜»); `DECISIONI.md:2068-2091` ha la tabella D1–D8 «consigliate applicate, da confermare» e voci per L0–L4 (`:2093-2233`); mancano L5–L11 e le scelte confermate distinte | `requisiti.md` 76 | **M** | tutti (ultimo) |
| **R11-20** OpenAPI solo rotte esistenti; redirect documentati | 2 | `server/openapi/descrizioni/*` (16 file); `openapi.test.ts:36` richiede 1:1 rotta↔descrizione | `app.md` §2 | **M** | R11-03/3, B3, B5 |

### 4.6 UI-ASSET-01 (difetti.md)

| Req | Voci | Oggi | Fonti | Compl. | Dipende da |
|---|---:|---|---|---|---|
| **UI-ASSET-01** vecchio chunk durante il rilascio, con bozze preservate | 1 | n/a (è un difetto di continuità) | Causa **probabile, non provata**: le pagine sono `lazy(import())` (`router.tsx:17-19`); `Dockerfile.frontend` sostituisce l'intera cartella di nginx a ogni rilascio, quindi i chunk con hash del bundle vecchio spariscono; `nginx.conf` ha `try_files $uri $uri/ /index.html` (un chunk mancante risponde `index.html` con 200, quindi l'import fallisce); **nessun gestore** di `vite:preloadError` né ritentativo (0 occorrenze); `ErrorBoundary.tsx` offre «Ricarica app» (`window.location.reload()`), che **perde le bozze** | `difetti.md`; `router.tsx`, `nginx.conf`, `Dockerfile.frontend`, `ErrorBoundary.tsx`; bozze: 9 file con stato locale (`CorrezioneGuida`, `ModuloRichiesta`, `FinestraLuogoDaPin`, `EditorDisponibilita`, …) | **M** | nessuno |

### 4.7 Vincoli senza voci

`R11-04` (testi: vedi §8.2), `R11-21` (impronte diario 04-01..06-01, Kamoshida, Madarame), `R11-22` (indirizzi vecchi), `R11-23` (metro/diario/ricerca), `R11-24` (typecheck, lint, build, `npm audit --omit=dev --audit-level=high`),
`R11-25`–`R11-27` (UX telefono, albero, layout): sono criteri di accettazione per tutti i blocchi e per la chiusura (B21).

## 5. Blocchi assegnabili, in ondate

Regole per tutti: **zero test** (nessun test nuovo o eseguito, CLAUDE.md del repo); typecheck, lint e build verdi, con `npm run typecheck` che include `tsconfig.test.json` (§8.2); migrazioni append-only e conservative con copia di sicurezza,
numero **primo libero dopo L10** (oggi registrate fino alla 153, L8/L9/L10 ne prenderanno altre); nessun commit per blocco (unico commit a fine lotto); verifica avversariale finale da un agente distinto (Opus),
con accesso alle specifiche originali; repo pubblico: nessun nome o indirizzo personale; nessuna scrittura di prova sui dati dell'utente (copie e partita di prova).

| Blocco | Contenuto | Voci coperte | N. | Compl. | Dipende da | Ondata |
|---|---|---|---:|---|---|---|
| **B1** Inventario dei lettori | `lotti/L11/inventario-lettori.md`: ogni tabella/colonna di `gioco` e `utente` con lettori, scrittori, lotto sostitutivo, decisione (elimina / archivio con motivo / tieni); include `requisito_partita`, `punto_partita.automatico`, `voce_giornata.produce_json`, i 18 blocchi `dati_guida` e le tabelle d'archivio; **baseline ora, rigenerazione a L10 consegnato** | R11-01/1 | 1 | A | tutti (la voce si chiude alla rigenerazione) | 1 (baseline) e 6 (finale) |
| **B2** UI-ASSET-01 | studio e correzione: gestore `vite:preloadError`/ritentativo di `lazy`, nginx (404 per `/assets/*` mancanti invece del fallback), `ErrorBoundary` che non perde le bozze, avviso «nuova versione» senza ricaricare con form sporchi | UI-ASSET-01 | 1 | M | — | 1 |
| **B3** Ricerca BE | `ricercaService.ts` (indice in memoria svuotato da `invalidaCacheDiGioco`), `GET /api/ricerca`, blocco `dati_guida.sinonimi-ricerca` da G-038, DTO, registro delle «case» per tipo, luoghi chiusi con motivo, aree da verificare, nascosti esclusi, percorso e immagine | R11-07/1, 07/3, 08/2, 08/3, 09/1, 10/1, 10b/1, 10b/3 | 8 | A | L8 e L9 per i tipi nuovi (aggiungibili dopo) | 1 |
| **B4** Ricerca FE | `RicercaGlobale` (tutto schermo su telefono, pannello da 1024), pulsante in `Topbar`/`BottomNav`, scorciatoia `/`, raggruppamento per tipo, «Chiuso adesso», nessun «Mappa/atlante» | R11-07/2, 08/1, 10b/2 | 3 | M | B3 | 2 |
| **B5** Albero Tokyo e Palazzi | `GET /api/mappe/gerarchia` (E1/E2/E6, «Da collocare»), `IndiceMappe` come albero, rami chiusi, miniature, nodi alla casa, via `PannelloLuogo`/`AlberoLuoghi`/`radiciRaggruppate`/nodi alternativi, «Luoghi della guida», «Nuova mappa» fuori dal mondo | R11-11/1, 11/2, 12/1, 12/2, 12/3, 12/5, 13/1, 14/1 | 8 | A | L2, L3 consegnati; §8.9, §8.10 | 2 |
| **B6** Albero dei Memento | Memento › Dedali › Aree con Iweleth sotto il Memento (E8), nodo al menù del Dedalo | R11-11/3, 12/4 | 2 | M | **L8 B7** (Iweleth solo come dedalo) | 4 |
| **B7** Rotte e funzioni orfane provate | togliere le 7 rotte senza consumatori con le loro descrizioni OpenAPI e i client; funzioni senza lettori (elenco corretto in §6.4) | R11-03/3 | 1 | B | nessuno | 1 |
| **B8** Marcatori e piante | `marcatore_luogo` (47), `pianta_area` (84), `marcatore_mappa` (149, dopo decisione), `pianta_quartiere` (dopo decisione): migrazione + DTO + etichette del cestino | R11-02/5, 02/6, 02/7, 02/8 | 4 | M | §8.5, §8.7; B10 (cestino) | 2 |
| **B9** Legami e presentazione delle mappe | congelare 027/038/042 e le altre migrazioni che importano servizi vivi (§7), portare i lettori di `mappa.entita_*`, `mappa_entita`, `gruppo_immagini_json`, `guida_mappa`, poi drop; estrarre `riallineaSpilliLuoghi` (usata ogni avvio) | R11-02/1, 02/2, 02/3, 02/4 | 4 | A | B5 (FE sull'albero), B8 | 3 |
| **B10** Pacchetto e cestino | motivi `colonna-rimossa`/`tabella-rimossa`, riepilogo di cosa è stato scartato in `EsitoImportazionePacchettoDto` e in Impostazioni › Pacchetto, `ETICHETTE` e `RIFERIMENTI_PARTITE` allineati; prova finale su pacchetto vecchio e su cestino | R11-05/1, 05/2, 05/3, 06/1 | 4 | M | sviluppo subito; **prova dopo i drop** (B8, B9, B12, B15) | 2 (sviluppo), 6 (prova) |
| **B11** Ripristino: registro e dati senza dipendenze | `ripristinoService.ts`, tabella `correzione_dati_guida`, moduli «Modifica/Ripristina» per Città (nome, descrizione), Oggetti (verifica), Personaggi, Sfide, Trofei, Completamento, ranghi delle Doti; elenco di verifica `lotti/L11/verifica-modificabile.md` | R11-15/5, 15/6, 15/8, 15/9, 15/10, 15/11, 15/12 | 7 | A | nessuno (coordinare con L8 B2 sui personaggi) | 1 |
| **B12** Frasi e copie | colonne frase copia esatta del dato strutturato (luogo, negozio, attività, quartiere, articolo), `sblocco-quartieri`, copie di orari | R11-02/9, 02/10, 02b/3, 02b/5 | 4 | A | L5–L7 chiusi, **L9**; elenco da B1; §8.6 | 5 |
| **B13** Stato di partita legacy, boss, nomi | righe `spillo_partita` dei condivisi (40 su p1) con confronto p1/p2; regola dei Memento senza `bossFinali`; nomi vecchi degli elementi | R11-02b/1, 02b/2, 02b/4 | 3 | M | **L8** (B0, B7), B9; §8.8 | 4 |
| **B15** Calendario e contatori | `giorno_percorso`/`giorno_calendario`, `evento_calendario` (se la decisione lo consente), `lettura_partita`; porting di 10 lettori | R11-02/11, 02/12, 02/13 | 3 | A | **L9** (B, C, F), **L10** (BE); §8.4 | 5 |
| **B16** Ripristino: Confidenti, Calendario, Scuola | moduli e correzioni dopo L9 | R11-15/1, 15/2, 15/7 | 3 | A | **L9** (D, F); B11 | 5 |
| **B17** Ripristino: Persona e Ombre | affinità, Persona, skill, Ombre | R11-15/3, 15/4 | 2 | A | **L8** (B2, B3, B4, B8); B11 | 4 |
| **B18** Elenco «Da rivedere» | `GET /api/da-rivedere`, pagina, contatore; fornitori con i gesti delle pagine d'origine | R11-10c/1…13 | 13 | A | **decisione §8.1**; L8–L10 per le sorgenti | **sospeso** |
| **B19** Codice morto residuo | servizi, componenti, DTO e utility orfani dopo i drop; rami di compatibilità `sqlite_master`/`tabellaGioco()` (≈ 140 occorrenze: `mappeService.ts` 33, `dungeonService.ts` 16, `legamiInfiltrazioni.ts` 9, …) | R11-03/1, 03/2, 03/4 | 3 | M | B8, B9, B12, B13, B15 | 6 |
| **B20** Documenti | ARCHITETTURA, ROADMAP, DECISIONI, MAPPE, OpenAPI (anche gli indirizzi vecchi come redirect) | R11-18/1, 19/1, 19/2, 20/1, 20/2 | 5 | A | tutti | 6 |
| **B21** Chiusura | prova «le correzioni dell'utente restano» (nella lettura decisa in §8.3), impronte prima/dopo, `npm audit`, rigenerazione di B1, riesame avversariale, aggiornamento di Regia e STATO | R11-16/1, 17/1 | 2 | M | tutti; §8.3 | 6 |
| *(utente)* | collaudo automatico completo della ricerca | R11-09/collaudo-utente | 1 | — | B3, B4 | riservato all'utente |

Somma delle voci: B1 1 + B2 1 + B3 8 + B4 3 + B5 8 + B6 2 + B7 1 + B8 4 + B9 4 + B10 4 + B11 7 + B12 4 + B13 3 + B15 3 + B16 3 + B17 2 + B18 13 + B19 3 + B20 5 + B21 2 + utente 1 = **82**.
(Non esiste B14: la numerazione salta per non rinumerare i riferimenti incrociati.)

### 5.1 Ondate e dipendenze

```
Ondata 1 (subito, in parallelo):      B1 (baseline)   B2   B3   B7   B11
Ondata 2 (dopo l'1):                  B4 (dopo B3)   B5   B8   B10 (sviluppo)
Ondata 3:                             B9 (dopo B5 e B8)
Ondata 4 (dopo L8 consegnato):        B6   B13   B17
Ondata 5 (dopo L9 e L10 consegnati):  B12   B15   B16
Ondata 6 (chiusura):                  B19   B20   B21   (B1 rigenerato, B10 prova)
Sospeso:                              B18
```

- **Si può fare già, senza aspettare L8–L10** (ondate 1–3): B1 (baseline), B2, B3, B4, B5, B7, B8, B9, B10 (sviluppo), B11: 41 voci. B1 e B10 si chiudono solo alla rigenerazione finale / alla prova dopo i drop.
- **Aspetta L8**: B6, B13, B17: 7 voci (e la parte L8 di B3: tipo Ombra).
- **Aspetta L9/L10**: B12, B15, B16: 10 voci (e la parte L9 di B3: pagina attività, elenco Confidenti).
- **Sospeso**: B18: 13 voci.
- **Chiusura**: B19 3 + B20 5 + B21 2 = 10 voci.
- Controllo: 41 + 7 + 10 + 13 + 10 + 1 (collaudo riservato) = 82.

### 5.2 File condivisi da coordinare (un solo proprietario alla volta)

- `shared/types.ts` (DTO nuovi: `RisultatoRicercaDto`, `NodoGerarchiaDto`, correzioni; DTO tolti da B7/B8/B9): B3, B5, B7, B8, B9, B10, B11.
- `server/db/migrations/index.ts` (registrazione) e il **numero** di migrazione: B8, B9, B11, B12, B13, B15; uno per volta, con L8/L9/L10 che lo usano in parallelo.
- `server/routes/mappe.ts`, `server/routes/compendio.ts`, `server/routes/catalogo.ts`, `server/routes/partite.ts`, `server/routes/immagini.ts` e le descrizioni OpenAPI (`openapi.test.ts:36` vuole 1:1): B3, B5, B7, B11.
- `server/services/cestinoService.ts` (etichette e motivi): B8, B9, B10.
- `server/services/pacchettoGiocoService.ts` (`RIFERIMENTI_PARTITE` `:61-100`) e `pacchetto/pacchettoGioco.ts`: B9, B10.
- `server/services/mappe/mappeService.ts` (33 rami di compatibilità), `dungeonService.ts`, `contenutiGuidaService.ts`, `luoghiService.ts`: B5, B8, B9 (conflitto alto: serializzare B8 → B9).
- FE: `src/pages/MappaPage.tsx` (B5 riscrive `IndiceMappe`; B9 tocca `:366,528,530`), `EditorMappaPage.tsx`, `src/components/layout/{Topbar,BottomNav,MainLayout}.tsx` (B4; L10 BON-01 tocca la Home), `src/router.tsx`.
- Lavoro non committato di altre sessioni in questo worktree (git status): `server/services/motoreDiario.ts`, `giornataService.ts`, `propostePartitaService.ts`, `shared/effettiVoce.ts`, `src/services/gestiPartita.ts`, migrazione utente `036` (L10): B15 e B18 li toccano, non partire prima che L10 li abbia consegnati.

## 6. Voci già soddisfatte o parzialmente soddisfatte

**Nessuna voce è soddisfatta per intero con prova.** Dove ho una prova parziale la riporto; il PM le chiude solo dopo la sua verifica. Non ho dichiarato soddisfatto niente di cui non ho letto le righe.

### 6.1 Parzialmente soddisfatte (cosa c'è, cosa manca)

| Voce | Cosa c'è oggi (prova) | Cosa manca |
|---|---|---|
| R11-03/2 (componenti orfani) | `useRisolviAsset` **già rimossa**: `src/stores/assetStore.ts` esporta solo `useAssetStore` (`:60`), `useAssetMulti` (`:79`), `useAsset` (`:90`); 0 occorrenze di `useRisolviAsset` in `server`, `shared`, `src`, `docs/ARCHITETTURA.md` | gli altri componenti orfani (`AlberoLuoghi`, `PannelloLuogo` dopo B5; da B1/B19) |
| R11-03/3 (rotte orfane) | le 7 rotte sono **ancora presenti** e senza consumatori FE (verificato con grep su `src/services/api`): `routes/mappe.ts:84` (`/entita/:tipo/:chiave`), `compendio.ts:81` (`/arcani`), `catalogo.ts:45` (`/oggetti-di/:categoria`), `partite.ts:108,114` (`/attiva`, `GET /:id`), `immagini.ts:42` (JSON), `mappe.ts:177` (`PUT /pezzi/:id`: il client `aggiornaPezzoMappa`, `src/services/api/mappe.ts:58`, non ha componenti) | toglierle con le descrizioni OpenAPI; i test che le chiamano (`api.test.ts:163,284`) compilano ancora |
| R11-02b/2 (euristica boss) | `eBossFinale` non esiste più; la regola dei Palazzi usa `dungeon.voce_boss_finale` (`dungeonService.ts:304,311`, `palazziService.ts:90-94` `vociBossFinale`) | `bossFinali()` (`palazziService.ts:65-81`) serve ancora ai Memento (`:29,167-168`) |
| R11-02b/3 (frasi sblocco quartieri) | il blocco `sblocco-quartieri` ha 0 lettori (`shared/types.ts:1710` è un commento) e la condizione strutturata c'è in 23/24 quartieri (`quartiere.condizioni_json`) | la colonna `quartiere.sblocco` (20 righe, nel DTO `cittaService.ts:109,132`) e `sblocco_data` (vivo: `disponibilitaService.ts:62,90`) |
| R11-05/1 (export senza le tabelle tolte) | l'export è il backup dell'intero file (`impostazioniService.ts:5,128`): **le tabelle tolte spariranno dall'export per costruzione** appena droppate | vale solo dopo i drop |
| R11-05/2 (import di un DB vecchio converte) | `sostituisciDatiDiGioco` sostituisce il file, riapre con le migrazioni e le regole d'avvio (`pacchettoGiocoService.ts:385-388`) e conta le migrazioni applicate (`:407`) | prova su un file vecchio dopo le migrazioni L11 |
| R11-06/1 (cestino con colonne tolte) | tabella assente → saltata con motivo `non-esiste-piu` (`cestinoService.ts:522,570`); colonne assenti ignorate (`:524-525`) | le colonne tolte non vengono **segnalate**; mancano i motivi `colonna-rimossa`/`tabella-rimossa` (`shared/types.ts:3294`) |
| R11-13/1 (da collocare dall'albero) | la lista e il gesto «Colloca» esistono: `routes/aree.ts:37,40`, `src/services/api/aree.ts:72`, `AreeDellaCitta.tsx:81-82` | raggiungerla dall'albero (non esiste ancora) |
| R11-14/1 («Nuova mappa») | nel mondo non c'è: `utils/aree.ts:36-41`, `EditorMappaPage.tsx:585-587` | fuori dal mondo (Palazzi) resta (`EditorMappaPage.tsx:587`; `EditorMappaPage.test.tsx:816-820`): decisione §8.9 |
| R11-19/1 (ROADMAP) | `docs/ROADMAP.md:1316-1327`: tabella L0–L11 con stato (L8–L11 «⬜») | aggiornare a fine lavoro |
| R11-19/2 (DECISIONI) | `docs/DECISIONI.md:2068-2091`: D1–D8 «scelte consigliate applicate, da confermare»; voci per L0–L4 (`:2093-2233`) | voci L5–L11 e le scelte confermate dall'utente distinte |
| R11-10b/1, /3 (mattoni) | `presenzaDelLuogo` (`luoghiService.ts:125-137`); `daVerificare` sull'Area (`areeService.ts:175`, `casaMappa.ts:110`) | la ricerca e l'albero che li mostrano |
| R11-15/5 (Oggetti) | catalogo oggetti con Modifica e Ripristina: `routes/catalogoOggetti.ts:51,54`, `OggettoPage.tsx:81`; costo regalo (`:19`) e note storiche (`:28-34`) | fabbricazione, abiti, scambi, tesori: da verificare nell'elenco di B11 |

### 6.2 Niente da fare perché già così (vincoli, non voci)

`R11-24`: il gate `npm audit --omit=dev --audit-level=high` e typecheck/lint/build sono i comandi di `package.json:14-16`; si rilanciano alla chiusura.

### 6.3 Voci che il testo dà per fatte ma non lo sono

- `R11-02` «frasi di orari e sblocco… sono eliminate»: oggi **mostrate** a schermo (`QuartierePage.tsx:117` mostra `luogo.sblocco`).
- `R11-03` «`eTipoLuogo`»: `app.md` lo elencava come morto; **oggi è usato** (`FinestraLuogoDaPin.tsx:4,204,227`): non toglierlo.

### 6.4 Elenco corretto del codice morto (R11-03), a oggi

- **Da togliere, provato** (nessun lettore non-test): `collegaPalazziAiLuoghi` (stub che restituisce 0, `sincronizzaMappe.ts:227`), `applicaPresenzaAiLuoghi` (`presenzaEntita.ts:87`), `zoneDeiPezzi` (`src/utils/pezziMappa.ts:104`),
  `importaPacchetto` (`pacchettoGiocoService.ts:350`), `ripristinaIstanza` (`impostazioniService.ts:398`), il client `impostaLettura` (`src/services/api/partite.ts:104`, nessun componente), le 7 rotte sopra.
- **Non toglierli**: `eTipoLuogo` (usato), `riallineaSpilliLuoghi` (`sincronizzaMappe.ts:53`, chiamata a ogni avvio da `regoleAllAvvio` `pacchettoGioco.ts:53`), `traduciNomiSpilli` e `collegaLuoghiAllePlanimetrie` (migrazioni 053/054 importate da
  `pacchettoGioco.ts:25-26`), `impostaLettura` server (`attivitaService.ts:405`: usata da `routes/partite.ts:232` e `effettiAzioneService.ts:20,104`), `bossFinali` (§6.1).
- **Funzioni di compatibilità** (non codice morto subito, ma da togliere a fine lotto): ≈ 140 occorrenze di `sqlite_master`/`pragma_table_info`/`tabellaGioco()`/`conLegami()` in `server/` fuori da migrazioni e test.

## 7. Rischi

1. **Lavoro dell'utente da preservare** (R11-21): diario 04-01..06-01 (255 voci sulla copia), Kamoshida e Madarame (voci, pin, passi), cestino (8 righe, 3 delle quali citano colonne da togliere), `origine='utente'`
   (spillo 795, mappa 77, articolo 76, area 23, luogo/negozio 4+4, attività 1, film 1). Nessuna fonte vecchia contiene il testo delle voci del diario né delle voci dei Palazzi (`dati.md` §4), ma **`mappa.entita_*`, `mappa_entita`,
   `gruppo_immagini_json` e `marcatore_mappa` sono dentro i registri del cestino e dentro le righe `utente` delle mappe**: ogni migrazione deve avere impronte identiche (`impronta.cjs`, `impronta-mondo.cjs`: **non nel repository**, sono nello scratchpad delle sessioni) prima e dopo, e conteggi.
2. **Eliminazioni che toccano `partite.db`**: righe `spillo_partita` (40 in p1), `lettura_partita` (14), `requisito_partita` (0), ricostruzione di `punto_partita` per togliere `automatico` (564 righe, tutte 0), `turno_partita` (da **non** toccare: la pesca la usa).
   Una ricostruzione di tabella sui dati reali richiede copia di sicurezza, confronto p1/p2 e prova su copia; nessuna prova in scrittura sui dati dell'utente.
3. **Migrazioni che importano servizi vivi**: non solo 027, 038 e 042 (come dice `app.md`): sono almeno **13** (`027`, `036`, `038`, `042`, `052`, `064`, `066`, `067`, `070`, `130`, `131`, `135`, `150` e utente `017`), più `pacchettoGioco.ts` che importa dalle migrazioni 053/054/079.
   Toccare un servizio importato cambia il comportamento di una migrazione vecchia: B9 deve congelare **tutte**, non tre.
4. **`regoleAllAvvio`** (`pacchettoGioco.ts:44`) gira a ogni avvio e dopo ogni import: dipende da `sincronizzaMappe`, `traduciNomiSpilli`, `collegaLuoghiAllePlanimetrie`; cancellare `sincronizzaMappe` per intero ferma l'avvio.
5. **Typecheck e test**: `npm run typecheck` = `tsc -b tsconfig.full.json`, che include `tsconfig.test.json`; togliere un export o un campo DTO usato da un test rompe il typecheck anche se i test non si eseguono. `R11-04` in `stato.json` dice «senza modificarli»: va deciso (§8.2).
6. **Schema utente congelato**: `schemaUtente.ts` è il DDL della migrazione utente 001 (`migrazioniUtente/001_schema_partite.ts:18`); la proposta di `app.md` §0.5 («allinearlo al file reale») modifica una migrazione già applicata. Meglio un commento di «DDL storico di 001» (§8.7).
7. **Regola BON-11 (23/10)**: niente nuovi pannelli di revisione senza il sì dell'utente; l'`inventario-superfici-2026-10-23.md` elenca i pannelli appena tolti perché non autorizzati («Da applicare», «Frasi e condizioni», abbinamenti, Tanaka). Una pagina «Da rivedere» è esattamente quel genere di superficie.
8. **Ricerca**: indice in memoria su un DB con 1298 oggetti e 960 voci: costo di costruzione a ogni invalidazione (13 punti di scrittura); i tipi senza pagina propria rischiano un 404 o un'ancora che non si apre; i nomi di Persona del gruppo e Ombre (L8) non esistono ancora come entità.
9. **Iweleth compare due volte** finché L8 B7 non è fatto: come `palazzo` (`dungeon` con `regola_boss='memento'`, 12 infiltrazioni, 16 Aree) e come dedalo `mementos-08-iweleth` (13 aree): l'albero (B5/B6) lo mostrerebbe doppio.
10. **Cestino**: le righe delle mappe eliminate citano `mappa_percorso` per 633–635 passi: il ripristino è lungo; dopo il drop delle colonne le segnala solo se B10 aggiunge i motivi.
11. **Repo pubblico**: nei documenti e nei controlli non scrivere il nome utente, i nomi delle partite, indirizzi di p5s o del server; non scrivere dati personali nei dati di prova.
12. **Zero test e verifica avversariale**: l'inventario (B1), l'elenco di verifica «Modifica/Ripristina» (B11) e il controllo «ogni oggetto si trova» (R11-09) sono i soli strumenti di prova previsti; sono **documenti e controlli di sola lettura**, non test automatici nuovi.

## 8. Punti che richiedono una decisione

1. **`R11-10c` «Da rivedere» (13 voci) contro BON-11.** Il requisito è «approvato come decisione del PM (2026-10-20)»; il 23/10 sera l'utente ha detto che pannelli di revisione non autorizzati non devono esistere («Da applicare», «Frasi e condizioni»)
   e ha chiesto di consolidare i dati. Inoltre il requisito elenca sorgenti già superate: Tanaka 18/20 (BON-08: migrazione 142, consenso tolto), abbinamenti (BON-07), «Gelo/respinge» e simili. **Chiedere all'utente** se la pagina si fa, in che forma, o se si sostituisce con un elenco in chat prima di una migrazione.
2. **Test e typecheck (`R11-04`).** `stato.json` dice «conservare i file di test, senza modificarli o eseguirli»; `requisiti.md` dice «si aggiornano o si dichiarano superati». Con `tsconfig.test.json` dentro il typecheck, togliere export o campi DTO rompe la compilazione dei test.
   Serve il permesso di **modifiche minime ai test** per farli compilare (senza eseguirli e senza cancellarli).
3. **`R11-16`/`R11-17` («le correzioni restano dopo un aggiornamento del pacchetto»).** Dal 21/10 la fonte è il DB dell'istanza e «Importa» **sostituisce** `gioco.db` con un backup (`CLAUDE.md`, «Regola attuale dei dati»); `ricaricaPacchetto`, che unisce, non ha chiamanti fuori dai test.
   Chiarire come leggere il requisito (correzioni conservate nei backup e nel DB; oppure sparisce la prova «import»).
4. **`evento_calendario` (R11-02/12).** Se L9 tiene gli eventi come eventi collegati per chiave (decisione del 20/10 in `L9/modifiche.md`), la tabella non si elimina; se diventano voci del diario (`L9/requisiti.md` R9-20) sì. Sciogliere la divergenza di L9 §6.1.
5. **`pianta_quartiere` (R11-02/8).** È la fonte dell'URL per scaricare l'illustrazione del quartiere (`cittaService.ts:149`, `QuartierePage.tsx:142-197`). Tenerla come «fonte» (archivio con motivo) o portare l'URL su `immagine.origine_url`?
6. **Che cosa sono «copie di nomi e prezzi» (R11-02/10).** Il testo non le elenca. Va definito dall'inventario (B1) con l'Esperto/L7; fino ad allora B12 non ha un perimetro certo.
7. **`marcatore_mappa` e DDL utente.** (a) 148 marcatori su voci senza pin alimentano la «posizione da collocare» (`contenutiGuidaService.ts:89-100`) che il FE non mostra: si perdono o si portano su `spillo`? (b) Lasciare `schemaUtente.ts` come DDL storico di 001 con un commento, invece di «allinearlo»?
8. **Boss finale dei Memento (R11-02b/2).** `bossFinali()` serve ancora a `mementos` e a Iweleth: introdurre `voce_boss_finale` anche per i dedali, o dichiarare che l'euristica resta, ridenominata, solo per i Memento.
9. **«Nuova mappa» nei Palazzi (R11-14).** Resta nell'editor delle planimetrie dei Palazzi: va tolta anche lì (con quale gesto sostitutivo) o la voce si limita al mondo?
10. **«Casa» dei tipi senza pagina propria nella ricerca (R11-09)**: libri, film, videogiochi, Richieste, trofei, sfide, giorni. Ancora nell'elenco (`/guida/libri#chiave`?), o pagine singole (che sarebbe lavoro nuovo)?
11. **Archivio nel DB.** 18 blocchi `dati_guida` senza lettori (`audit-catalogo-121` ≈ 5,7 MB, rettifiche 130–146) e le tabelle `audit_aojiru_136`, `audit_pesca_138`, `decisione_tanaka*`: tenerli «di archivio» con motivo (R11-01) o toglierli? (Nel dubbio, tenerli: sono la storia delle bonifiche; BON-06 dice «restano nel DB come storia».)
12. **Nome della pagina** «Luoghi della guida» al posto di «Mappe» (`modifiche.md` §7.4: scelta prudente «da approvare»).
13. **Numero di migrazione.** Oggi registrate fino alla 153; L8, L9 e L10 ne aggiungeranno altre: L11 prende «il primo libero dopo L10» (non riservare un numero ora).

## 9. Limiti

- Ho misurato il DB solo su `sim-142b` (p5s 1935Z portata a gioco 146; utente a `user_version` 30, mentre il repository ha utente fino alla 036 e gioco fino alla 153): conteggi e `produce_json`/`voce_effetto` possono essere cambiati con le migrazioni 147–153 e col lavoro dell'utente su p5s.
  Non ho aperto `data/` del worktree.
- I lettori sono cercati con grep per nome di tabella/colonna: **non vedono i `SELECT *`** (per esempio `voce_giornata.produce_json`: nessun riferimento per nome nei servizi, ma non ho provato che nessun `SELECT *` lo usi) né le letture dinamiche
  (nomi di colonna in array come `catalogoService.ts:46,53`). I «lettori vivi» elencati sono certi; l'assenza di lettori è «nessun riferimento per nome».
- I 18 blocchi `dati_guida` «senza lettori» sono quelli senza la chiave scritta tra apici nel codice fuori da test e migrazioni: una chiave composta a runtime (per esempio `raccordi-luoghi-l5-approvati-${n}`) non l'avrei vista.
- Non ho letto per intero i requisiti di L2–L10 (solo dove citano L11 e `L9/preparazione`, `L8/preparazione`), né `STATO-ATTUALE.md` per intero (solo l'inizio, le righe su L11 e la sezione «Elenco da rivedere»), né i test; non ho eseguito l'app, il typecheck o il lint.
- La complessità è una mia stima. `inventario-prod.md`, `impronta*.cjs` e gli script `l11*.cjs` sono nello scratchpad delle sessioni, non nel repository: B1 e B21 devono ricrearli o riceverli.
- Le righe `file:riga` sono quelle lette al 23/10 nel worktree con modifiche non committate di altre sessioni; possono spostarsi.
- Non ho verificato che le 7 rotte orfane non siano chiamate da script esterni (solo dal FE e dai test).
- Per scrivere questo documento ho usato un piccolo script Node di sola lettura salvato nello scratchpad (poi rimosso) e un file temporaneo di output; nessun file è stato scritto nel repository tranne questo.
