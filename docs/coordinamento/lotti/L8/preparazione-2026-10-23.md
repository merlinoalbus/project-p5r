# L8 «Persona e Ombre» — preparazione dei blocchi per le sessioni Sonnet

Analisi dati, 2026-10-23, sola lettura. Richiesta del PM: per ogni requisito padre `R8-*` dire che cosa c'è nel DB e nel codice, quali fonti servono, la complessità e le dipendenze,
per dividere L8 in blocchi assegnabili. Niente commit, niente script che scrivono file.

## 1. In breve

- **L8 ha 42 requisiti padri** (non 164: 164 è il totale di tutti i lotti) e **1227 voci figlie**. Di queste **1121 sono di un solo requisito**, `R8-07b` (la verifica voce per voce della negoziazione contro Royal): 49 domande,
  86 esiti da correggere, 909 esiti mancanti, 52 domande senza risposta buona, 24 contrasti, 1 extra. Gli altri 41 padri ne hanno 106 in tutto; **11 padri sono vincoli senza figli** (R8-07e, 07f, 22–30).
- **Nulla di L8 è implementato.** Non esistono la tabella `ombra`, né `ombreService`, né una pagina `/guida/ombra/<chiave>`, né i dati delle 27 forme del gruppo, né le tabelle di negoziazione, né un modo per modificare le affinità di una Persona.
  Esiste invece tutto ciò che L8 deve unificare (le 4 copie delle Ombre, le 4 strade di registrazione, i dedali dei Memento, Iweleth come Palazzo).
- **Il disegno c'è già**: `piano-operativo.md` (P0–P7, approvato dal revisore sul piano, non sul codice), `modifiche.md`, `contratto-negoziazione.md`, `dati.md`. Questo documento lo verifica contro il DB e il codice di oggi
  e lo taglia in **9 blocchi** (§4) in 4 ondate.
- **Prima di partire**: la numerazione delle migrazioni (la 147 esiste ma non è registrata: §6), tre punti che richiedono l'approvazione dell'utente (§6) e dove stanno i dati di partenza di `R8-07b` (§6).

## 2. Stato di partenza (misurato sulla copia di p5s 1935Z portata a 146)

| Cosa | Oggi |
|---|---|
| Ombre della Battaglia | 217 in `dati_guida.battaglia.ombre` (Persona come testo; debolezze come stringhe della guida; personalità: Cupa 32, Timida 32, Irritabile 32, Giocosa 45, **vuota 74**, «-» 1, «Non reclutabile» 1) |
| Voci Persona dei Memento | 131 in `punto_interesse` (dettagli: maschera, deboleA, resisteA, personalità), legate a 95 aree di 9 dedali da `persona_area_dedalo` (827 righe); personalità Cupa 30, Timida 30, Irritabile 30, Giocosa 40, «-» 1 |
| Voci Persona dei Palazzi | **41**: futaba 4, iweleth 9, kamoshida 2, kaneshiro 9, maruki 1, niijima 15, okumura 1; **4 stati di partita**, tutti delle 2 voci narrative di Kamoshida (non sono catture). La tabella di Kamoshida con 14 Ombre è solo nel pacchetto pubblico, non in p5s |
| Altre voci con Ombre | `ombra-sciagura` 70, `miniboss` 57, `boss` 26 nei Palazzi (L4: rigenerabili o permanenti) |
| Compendio | `persona` 232, `persona_affinita` 2320, `persona_skill` 1614; **nessuna** delle 27 forme del gruppo (`persona` non ha una colonna `del_party`); `compendio_partita` 53 righe, `persona_posseduta` 7 |
| Negoziazione | `dati_guida.battaglia.negoziazione.domande`: **225 domande, 680 risposte, 618 verdetti** (il file `server/db/dati/negoziazione-domande.json` ne ha 230, 691, 642: la 084 ha compresso i contraddittori); `traduzione` ambito `negoziazione` 120 righe |
| Iweleth | `dungeon iweleth` tipo `palazzo`, `regola_boss='memento'`; 12 infiltrazioni, 47 voci (9 persona, 3 boss, 6 miniboss, 1 ombra-sciagura, le altre di tipi non ammessi nei dedali), 16 Aree di L3; **0 stati di partita**; i lettori sono in 11 file (§3) |
| Persone del gruppo | `membro_squadra_partita` (joker, morgana, ryuji, ann; `personaggio_chiave`); 27 personaggi in `dati_guida` «personaggi» |
| Boss finale | `dungeon.voce_boss_finale` (L4): Iweleth senza, regola dei Memento (113) |
| Codice di L8 | `shared/` non ha `elementi.ts`, `maschere.ts`, `negoziazione.ts`; il lettore di nomi e debolezze è `src/utils/elementiGuida.ts` (25 righe, regex sul testo della guida); `server/services/maschere.ts` (43 righe) abbina Persona e maschera per nome; `server/services/battagliaService.ts` (19 righe); `catturePersona.ts` (50 righe) riconosce solo i Memento; `RisposteNegoziazione.tsx` (122 righe); `BattagliaPage.tsx` (353); `PersonaDettaglioPage.tsx` (315, sola lettura) |
| Vocabolario vecchio | «Psichico/Oscurità/Quasi-divino/Guarigione/Tuono/Gelo/respinge» compare in pochi file di produzione (`BattagliaPage`, `CompendioPage`, `elementiGuida.ts`, i file della pesca); le etichette stanno nella `traduzione` (13 da correggere, `dati.md` §7.1) |

## 3. I 42 requisiti padri

Complessità: **B** bassa (fino a mezza giornata di una sessione), **M** media (una sessione, più file), **A** alta (più sessioni o gate del revisore). «Voci» = figlie in `pianoAtomico`.

### 3.1 Entità Ombra e dati

| Req | Voci | Oggi nel DB | Oggi nel codice | Fonti per completarlo | Compl. | Dipende da |
|---|---:|---|---|---|---|---|
| **R8-01** entità Ombra | 3 | nessuna tabella `ombra` | nessuno | `modifiche.md` §1.1; `piano-operativo.md` P1 (abbinamento, catturabilità e negoziabilità sono tre dati distinti); `dati.md` | **A** | R8-20c (vocabolario) |
| **R8-02** raccordo delle 4 copie per chiave | 5 | 217 Battaglia, 131 Memento, 41 Palazzi; Kamoshida solo nel pacchetto | `maschere.ts` (indice maschera→Persona per nome); `personaDellaMaschera` | `dati.md` §2 (210/217 abbinate, 213/217 dopo G-035); `traduzione` persona; `maschere.ts`; `censimento-iweleth-pubblico.md` | **A** | R8-01 |
| **R8-03** nome unico, letto dall'Ombra | 4 | nomi doppi (145/183 divergenze di `dati.md`); `traduzione` negoziazione | lettori di Battaglia, dedali, Palazzi, negoziazione leggono il testo | `dati.md` §2; G-035 | **M** | R8-01, R8-02 |
| **R8-03b** un nome per Ombra, quello della guida | 2 | `Prankster Leader` «Capo dei burloni» e `Torn King of Desires` «Re lacerato dei desideri» in `traduzione`; «Maestra degli scherzi» e «Straziato re dei desideri» nella Battaglia | nessuno | G-035 (registro); `dati.md` §11 | **B** | R8-01 |
| **R8-04** personalità valida o «sconosciuta» | 1 | 74 vuote + «-» 1 in Battaglia; «-» 1 nei Memento | solo mostrate | `guida/G-021-negoziazione.md` §5 (le 75 Ombre prive di personalità: 71 dai dati di gioco, Orlov «Giocosa», Servobot non negoziabili) | **M** | R8-02 |
| **R8-05** «dove si incontra» con una fonte | 4 | `persona_area_dedalo` 827; aree dei Palazzi via le voci; `persona.aree_mementos_json` e `piani_mementos` (terza copia) | scheda Persona, dedali e Battaglia leggono ciascuno la sua | `dati.md` §3; L3 (Aree dei Palazzi); `modifiche.md` §1.1 | **A** | R8-01, R8-02, L3 |
| **R8-08** debolezze solo dal compendio | 4 | `persona_affinita` 2320 | `chiaveElementoDaTesto` in `BattagliaPage`; `PersoneDellArea` (`dettagli.deboleA`); `DettagliPunto`; `RichiestePage` (`bersaglio_json`) | `dati.md` §3 (37 + 45 righe diverse: vince il compendio); G-019 | **M** | R8-01, R8-20c |
| **R8-08b** 4 Ombre con affinità proprie | 4 | nessun campo | — | G-019: Take-Minakata (Elettricità riflette), Mithras (Nucleare riflette), Bugs (Fuoco debole, Psicocinesi e Maledizione neutre), Power (Arma da fuoco neutra) | **B** | R8-01, R8-08 |
| **R8-09** 5 non reclutabili e Kaneshiro | 4 | 1 sola «Non reclutabile»; 2 righe di Kaneshiro con Ombra e maschera scambiate | — | G-035 (5 non reclutabili: 4 Servobot e Straziato re con maschera Mara; «Fango pulsante» = Melma nera e «Maestra degli scherzi» = Pixie superiore reclutabili) | **B** | R8-01, R8-02 |
| **R8-10** correggere le affinità di una Persona | 1 | `persona_affinita` | **nessun endpoint** di modifica in `routes/compendio.ts`; `PersonaDettaglioPage` è di sola lettura | `modifiche.md` §1.3; validazione dei codici wk/rs/nu/rp/ab | **M** | R8-20c |

### 3.2 Negoziazione per umore

| Req | Voci | Oggi nel DB | Oggi nel codice | Fonti per completarlo | Compl. | Dipende da |
|---|---:|---|---|---|---|---|
| **R8-07a** schema e lettore unico | 5 | nessuna tabella; JSON in `dati_guida` | `RisposteNegoziazione.tsx`, `src/utils/negoziazione.ts` (prende il primo verdetto con `find`), `battagliaService.ts` | `contratto-negoziazione.md` §B–§D (6 tabelle: famiglia, variante, risposta, verdetto, umore, importazione); `piano-operativo.md` P3 | **A** | R8-07b (dati) |
| **R8-07b** verifica contro Royal | **1121** | 225/680/618 (file: 230/691/642) | — | Royal: raccolta pubblica joyce-chen (foglio `Royal`, 277 domande × 3 risposte × 4 umori; GitHub `joyce-chen/persona5-negotiation`); G-021 §1–§5; `contratto-negoziazione.md` (86 esiti diversi, 957–979 mancanti, 49 domande, 52 senza «buona», 24 contrasti) | **A** (volume), meccanico | R8-07a (schema) |
| **R8-07c** vista per umore | 3 | — | sezione negoziazione di `BattagliaPage` | `modifiche.md` §5; `contratto-negoziazione.md` §C | **M** | R8-07a, R8-04 |
| **R8-07d** umore ↔ scheda Ombra | 2 | — | — | R8-04, R8-06 | **B** | R8-04, R8-06, R8-07c |
| **R8-07e** nessuna perdita [NR] | 0 | 225/680/618 da conservare | — | `piano-operativo.md` P0 (fotografia prima/dopo, conservare ogni variante) | vincolo | R8-07b |
| **R8-07f** due tocchi dal telefono [UX] | 0 | — | — | `ux.md` | vincolo | R8-07c |

### 3.3 Una strada di cattura

| Req | Voci | Oggi nel DB | Oggi nel codice | Fonti per completarlo | Compl. | Dipende da |
|---|---:|---|---|---|---|---|
| **R8-11** Memento registra nel compendio | 1 | `compendio_partita` 53 | già così: `catturePersona.ts`, `PersoneDellArea` | `app.md` §0.3 | **B** (verifica) | — |
| **R8-12** Palazzo registra nel compendio | 1 | 41 voci Persona dei Palazzi; stati propri solo le 2 narrative di Kamoshida | i Palazzi segnano in `punto_partita` | `piano-operativo.md` P2; `modifiche.md` §2 | **M** | R8-01, R8-14 |
| **R8-13** Battaglia registra | 1 | — | nessuna cattura in Battaglia | idem | **M** | R8-01 |
| **R8-14** stato unico dal compendio; revoca con avviso | 4 | `compendio_partita` | 4 strade di registrazione (`partiteService.aggiornaCompendio`, `aggiungiPosseduta`, risultato di fusione, Velluto); su conflitto azzera il livello | `app.md` §0.5; `piano-operativo.md` P2 (`registraPersona` unico) | **A** | R8-01 |
| **R8-15** non contano nel completamento | 1 | — | L4: la voce `persona` non ha carattere, quindi già non conta | `shared/caratteriVoce.ts` | **B** (verifica) | L4 |
| **R8-15b** Palazzo concluso → incontri alternativi | 1 | `dungeon.voce_boss_finale` | `palazziConclusi` | G-026; R8-05 | **B** | R8-05, L4 |

### 3.4 Iweleth

| Req | Voci | Oggi nel DB | Oggi nel codice | Fonti per completarlo | Compl. | Dipende da |
|---|---:|---|---|---|---|---|
| **R8-16** solo come dedalo; 9 Persona doppie → una | 2 | 12 infiltrazioni, 47 voci, 16 Aree, 9 Persona gemelle con `mementos-08-iweleth/7..15`; 0 stati | — | `censimento-iweleth-pubblico.md`; `piano-operativo.md` P5 (raccordo, non cambio di `dungeon.tipo`) | **A** | R8-01, R8-14 |
| **R8-17** 38/47 voci con tipi non ammessi | 1 | 47 voci | — | `censimento-iweleth-pubblico.md` (tipo `storia` per le narrative; Abaddon `ombra-sciagura` da approvare) | **M** | R8-16 |
| **R8-18** lettori della riga `iweleth` | 5 | `dungeon_area` + 12 spilli con FK RESTRICT | 11 file: `condizioniSpillo.ts`, `collocazioneTokyo.ts`, `palazziService.ts`, `dungeonService.ts`, `semaforiService.ts`, `DungeonPage.tsx`, `sezioniGuida.tsx`, `MappaMemento.tsx`, `utils/palazzi.ts`, `types.ts`, `openapi/compendio` + migrazione 101 | `ricognizione-L3-palazzi.md`; `piano-operativo.md` P5 | **A** | R8-16 |
| **R8-19** Parte III/IV su 160-4-0/160-5-0 e area 8 | 3 | planimetrie scambiate | — | `censimento-iweleth-pubblico.md` §7 (160-4→III, 160-5→IV, 160-10 prigione dei compagni, 160-6 fase finale) | **M** | R8-16; approvazione |
| **R8-19b** Iweleth e boss finale | 1 | `regola_boss='memento'`, nessuna `voce_boss_finale` | `palazziService` ramo Iweleth con `senzaEffetti` | `lotti/L4/modifiche.md` §8.14 | **B** (verifica) | R8-16 |

### 3.5 Debolezze, gruppo, vocabolario

| Req | Voci | Oggi nel DB | Oggi nel codice | Fonti per completarlo | Compl. | Dipende da |
|---|---:|---|---|---|---|---|
| **R8-20** Persona del gruppo collegate al compendio per chiave | 1 | `membro_squadra_partita.personaggio_chiave`; `dati_guida` «personaggi» 27; 0 delle 27 forme in `persona` | `squadraService.ts`, `motoreFusione.ts:73` (legge tutte le Persona), `fusioneService.ts:44` (denominatore) | G-025; `piano-operativo.md` P4 | **A** | — |
| **R8-20b** le 27 schede | **27** | nessuna riga | — | `guida/G-025-persona-del-gruppo.json` (27 forme: nome, arcano, livello, quando, tratto, affinità, statistiche, eredità, skill) e `.md`; `NOTICE`; le 175 skill e 18 tratti esistono già in `skill` | **A** | R8-20; gate sul DDL |
| **R8-20c** vocabolario unico | 8 | 13 etichette in `traduzione` (ambiti `elementoAffinita`, `elementoSkill`) | `elementiGuida.ts`, `BattagliaPage`, `CompendioPage` | G-025 (11 elementi, 5 tipi, 5 esiti); `dati.md` §7.1; eccezione: testo delle due voci boss di Madarame dell'utente | **M** | — |
| **R8-21** vista «Persona della partita» | 1 | — | — | già assegnata a L10 (`modifiche.md` §8.6) | fuori da L8 | L10 |

### 3.6 Invarianti, esperienza e layout

| Req | Voci | Che cosa | Fonti | Compl. | Dipende da |
|---|---:|---|---|---|---|
| **R8-22** Memento invariati | 0 | stessa risposta API per `mementos`, salvo Iweleth | impronta di p5s (`project-lavoro-da-preservare.md`) | verifica | tutti i blocchi |
| **R8-23** compendio della partita invariato | 0 | 53 registrazioni, 7 esemplari | idem | verifica | B6 |
| **R8-24** Kamoshida e Madarame | 0 | 169 voci/359 pin e 226 voci/254 pin; le voci Persona mantengono testo, ordine e pin | idem | verifica | B6, B7 |
| **R8-25** diario 04-01..06-01 | 0 | 255 voci, 342 spunte | idem | verifica | tutti |
| **R8-26** scorta, fusioni, Stanza di Velluto | 0 | come prima | — | verifica | B2, B6 |
| **R8-27** typecheck e lint verdi | 0 | `npm run typecheck`, `npm run lint`, build; zero test | CLAUDE.md | verifica | ogni blocco |
| **R8-28** Battaglia dal telefono, 2 tocchi | 0 | trovare un'Ombra, vederne debolezze e registrazione | `ux.md` | **M** | B4, B6, B8 |
| **R8-29** cattura nel Palazzo con un tocco | 0 | piastrella come nei Memento | `PiastrellaPersona.tsx`, `PersoneDellArea.tsx` | **M** | R8-12 |
| **R8-30** layout | 0 | piastrelle ≥88 px, nessuno scorrimento orizzontale a 1280/768/375 | `layout-casi.md`; CLAUDE.md (altezze realistiche, intestazione ≤30%) | **M** | B8 |

## 4. Blocchi assegnabili

Regole per tutti: zero test; typecheck, lint e build verdi; nessun commit per blocco; migrazioni append-only e conservative (come 142–146); una verifica avversariale finale da un agente distinto (Opus).
Le voci contate sono le figlie di `pianoAtomico` (totale 1227).

| Blocco | Contenuto | Requisiti (voci) | Compl. | Dipende da | Sessione |
|---|---|---|---|---|---|
| **B0** Vocabolario | `shared/elementi.ts` (nomi, tipi, esiti), le 13 etichette in `traduzione`, sostituzione nei lettori generati | R8-20c (8) | M | — | Sonnet |
| **B1** Dati di negoziazione | Produrre i dati pubblici versionati (`negoziazione-royal.json`, `-abbinamenti.json`, `-rese-it.json`) dalla raccolta Royal pubblica e da G-021: coordinate, celle `-` come assenze, 4 celle ambigue, R230 con testo non disponibile | input di R8-07b | A (volume) | — | Sonnet |
| **B2** Persona del gruppo | Dati G-025 nel repository, migrazione con la ricostruzione di `persona` e `persona_skill` (NOT NULL → nullable, indice parziale sul nome), 27 schede, guardie nei motori di fusione, Velluto e obiettivi | R8-20 (1), R8-20b (27) | A | gate sul DDL | Sonnet + riesame del DDL |
| **B3** Modifica delle affinità | Endpoint e editor per le affinità di una Persona, con validazione e invalidazione delle letture | R8-10 (1) | M | B0 | Sonnet |
| **B4** Modello Ombra | Schema (`ombra`, `ombra_luogo`), servizio, migrazione con i raccordi delle 4 copie per chiave, personalità, 4 eccezioni, 5 non reclutabili, Kaneshiro, nomi della guida e alias, elenco degli abbinamenti non certi | R8-01 (3), R8-02 (5), R8-03b (2), R8-04 (1), R8-08b (4), R8-09 (4) = 19 | A | B0 | Sonnet in 2–3 sessioni: schema+servizio; migrazione e raccordi; elenco |
| **B5** Negoziazione: schema, importazione, servizio | Le 6 tabelle, l'importazione conservativa con fotografia e rapporto, il lettore unico (principale/alternative), l'endpoint di verifica con i conteggi 49/86/979/52/24 | R8-07a (5), R8-07b (1121), R8-07e | A | B1, B4 (personalità) | Sonnet; la 07b è meccanica ma lunga |
| **B6** Cattura unica | `registraPersona` unico, instradamento delle 4 strade, Palazzi e Battaglia sul compendio, revoca con l'avviso, controllo di catturabilità, incontri raggiungibili | R8-11 (1), R8-12 (1), R8-13 (1), R8-14 (4), R8-15 (1), R8-15b (1) = 9 | A | B4 | Sonnet + riesame |
| **B7** Iweleth | Raccordo aree e Persona nel dedalo, conversione delle voci, lettori dei 11 file, Parte III/IV, boss finale | R8-16 (2), R8-17 (1), R8-18 (5), R8-19 (3), R8-19b (1) = 12 | A | B4, B6; approvazione dell'elenco | Sonnet in 2 sessioni: dati e lettori |
| **B8** Viste e lettori | Pagina `/guida/ombra/<chiave>`, Battaglia con debolezze e registrazione, vista per umore, scheda Persona con incontri e registrazione, lettori che usano il nome e le debolezze dell'Ombra, layout e due tocchi | R8-03 (4), R8-05 (4), R8-06 (4), R8-07 (2), R8-07c (3), R8-07d (2), R8-08 (4) = 23; R8-28, 29, 30 | M/A | B4, B5, B6 | Sonnet in 2–3 sessioni |
| **B9** Chiusura | Invarianti prima/dopo sulla copia di p5s, riesame avversariale, matrice di copertura, aggiornamento di Regia e STATO | R8-22…27 | M | tutti | Opus (verifica) |
| *(fuori)* | Vista «Persona della partita» | R8-21 (1) | — | L10 | L10 |

Somma delle voci: B0 8 + B1/B5 1126 + B2 28 + B3 1 + B4 19 + B6 9 + B7 12 + B8 23 + R8-21 1 = **1227**.

### 4.1 Ondate e dipendenze

```
Ondata 1 (in parallelo, senza dipendenze):   B0   B1   B2
Ondata 2:                                    B3 (dopo B0)   B4 (dopo B0)
Ondata 3:                                    B5 (dopo B1 e B4)   B6 (dopo B4)
Ondata 4:                                    B7 (dopo B4 e B6)   B8 (dopo B4, B5, B6)
Chiusura:                                    B9
```

- **B0, B1, B2 possono partire subito**: toccano file diversi (`shared/elementi.ts` e `traduzione`; i nuovi file dati; la migrazione e i motori di fusione del gruppo).
- **B2 è il più rischioso**: ricostruisce due tabelle (`persona`, `persona_skill`) con i trigger e gli indici, e fa passare il gruppo per i motori di fusione. Serve il gate del revisore sul DDL prima di scrivere
  (`piano-operativo.md` P4).
- **B4 sblocca quasi tutto** (B5 per la personalità, B6, B7, B8): conviene farlo per primo dopo B0 e dividerlo in sessioni piccole.
- **File condivisi da coordinare** (un solo proprietario alla volta): `shared/types.ts`, `server/routes/compendio.ts`, le descrizioni OpenAPI, `server/db/migrations/index.ts` (registrazione), `BattagliaPage.tsx`
  (B5 e B8 toccano sezioni diverse), `PersonaDettaglioPage.tsx` (B3, B6 e B8).

## 5. Che cosa può fare ciascun blocco con i dati di oggi (sulla copia di p5s)

- **B0**: le 13 etichette sono già nella `traduzione`; il lavoro è nel codice e nel dato. Non toccare il testo libero delle due voci boss di Madarame (`R8-20c` ottava voce).
- **B1**: non serve il DB; serve la raccolta Royal pubblica (`joyce-chen/persona5-negotiation`) e G-021. I file `neg-mappa.json`, `neg-diff.json` e `royal.xlsx` citati in `contratto-negoziazione.md` sono nell'area di lavoro privata di chi li ha prodotti:
  **non sono nel repository né in `p5s-coordinamento`** (li ho cercati). Vanno recuperati da chi li ha, oppure rifatti dalla raccolta pubblica e da G-021 §1–§5, che dà gli stessi conteggi.
- **B2**: il JSON G-025 è nel repository (`docs/coordinamento/guida/G-025-persona-del-gruppo.json`, 27 forme); BE deve portarlo in `server/db/migrations/dati/`.
- **B4**: la migrazione deve partire dalle righe vere di p5s, non dal pacchetto (41 voci Persona dei Palazzi, non 44; la tabella di Kamoshida non c'è). I numeri del piano (44/41/38, 53/51, 88 skill) sono storici: non diventano soglie.
- **B5**: l'ingresso runtime è 225/680/618, non 230/691/642; le due fotografie vanno conservate entrambe.
- **B6**: le 4 voci con stato proprio sono narrative (Kamoshida): non si convertono. Solo se esistono catture storiche vere su altre voci si trattano a una a una, senza toccare le registrazioni esistenti.
- **B7**: nessuno stato di partita su Iweleth (0): la conversione non rischia l'avanzamento. Il pericolo sono le 12 FK `RESTRICT` degli spilli guida e i 11 file dei lettori.

## 6. Prima di assegnare

1. **Numerazione delle migrazioni.** In repository c'è la `147_aojiru_effetti_consolidati.ts` non registrata in `index.ts`; la sequenza registrata arriva a 146. Chi apre L8 deve sapere se la 147 verrà registrata (e le migrazioni
   di L8 partirebbero dalla 148) o se il numero è libero. Il piano dice «123 è ipotetico, non riservato».
2. **Approvazioni dell'utente** (da `piano-operativo.md` §3 e §5): (a) la ricostruzione di `persona` e `persona_skill` (B2); (b) l'elenco delle conversioni di Iweleth, soprattutto Abaddon `ombra-sciagura` e le voci
   di combattimento (B7); (c) gli abbinamenti Ombra↔Persona non certi, in un elenco (B4).
3. **Dove sono i dati di `R8-07b`**: vedi §5 (B1). Senza recuperarli o rifarli, i 1121 figli non sono eseguibili.
4. **Zero test** e **verifica avversariale** per ogni consegna (CLAUDE.md). I numeri dei requisiti (49/86/979/52/24, 145/183, 25 divergenze) sono storici: in B4, B5 e B8 si rimisurano sulla copia di p5s e si usano
   come riscontro, non come soglia.
5. **Le correzioni di L7 che toccano L8**: «Gelo/respinge» nelle voci boss di Madarame dell'utente restano come le ha scritte (già deciso); vanno nell'elenco «da rivedere».

## 7. Limiti

- Ho letto DB e codice, non ho eseguito l'app. Le righe di codice citate dai documenti (`app.md`) sono del 20/10: ho verificato l'esistenza dei file e dei dati, non ogni numero di riga.
- Le stime di complessità sono mie e dipendono dal fatto che il disegno di `piano-operativo.md` resti valido; i gate del revisore su B2 e B4 non sono ancora fatti.
- Le misure sono sulla copia 1935Z portata a 146; con altre migrazioni (la 147) o con nuovo lavoro dell'utente su p5s vanno rifatte.
