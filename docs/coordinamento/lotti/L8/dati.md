# L8 «Persona e Ombre» — analisi dati

Analisi dati, 2026-10-20. Sola lettura sulla copia di produzione `…\cffd8da6-…\scratchpad\prod-20261020\` e su `data/` (dev).
Script e uscite (scratchpad `…\161706c7-6e2c-47d6-bdb7-618347ce218c\scratchpad\`): `l8.cjs` → `l8-prod.json` / `l8-dev.json` (**identici**).
Abbinamento maschera → Persona con la stessa regola di `server/services/maschere.ts` (nome inglese o italiano da `traduzione(persona)`,
normalizzato; alias norna → Norn). Debolezze confrontate con `persona_affinita` (codici wk/rs/nu/rp/ab/-); elementi della guida mappati:
Tuono → electric, Maledizione → curse, Fuoco → fire, Sacro → bless, Ghiaccio/Gelo → ice, Arma/Armi da fuoco → gun, Vento → wind,
Psicocinesi → psy, Nucleare → nuclear, Danno/Danni fisici/Attacchi fisici → phys; «(dimezza)» rs, «(annulla)» nu, «(respinge)/(riflette)» rp,
«(assorbe)» ab; nessun elemento non riconosciuto. Requisiti: `lotti/L8/requisiti.md`.

## 1. Dove vivono oggi le Ombre (le «copie»)
| Fonte | Righe | Contenuto |
|---|---:|---|
| `dati_guida.battaglia.ombre` (JSON) | **217** | ombra (nome IT), maschera (persona), debolezze, resistenze, personalità, livello (3), dungeon; area solo per i Memento (113). Per dungeon: mementos 113, okumura 15, shido 16, kamoshida 14, niijima 13, kaneshiro 11, maruki 10, futaba 9, iweleth 9, madarame 7 |
| voci `persona` dei dedali dei Memento (`punto_interesse`, dungeon `mementos`) | **131** | nome dell'Ombra; `dettagli_json`: `maschera`, `deboleA`, `resisteA` (frasi), `personalita`; legate alle aree del dedalo da `persona_area_dedalo` (827 righe, 95 aree in 9 dedali) |
| voci `persona` dei Palazzi | **41** (kaneshiro 9, niijima 15, iweleth 9, futaba 4, kamoshida 2, okumura 1, maruki 1) | nome (spesso «Ombra/Demone»), `dettagli_json.debolezze/resistenze` su 30 |
| voci `ombra-sciagura` / `miniboss` / `boss` dei Palazzi | 70 / 57 / 24 (**26** sulla copia 0440Z, §11) | voci di L4 (rigenerabili o permanenti), non catture |
| `battaglia.demoniTesoro.elenco` | 9 | Demoni tesoro (nome, livello, arcano, dove) |
Il piano dice «217 + 131 + 44»: 217 e 131 tornano; le voci Persona dei Palazzi sono **41** (non 44), e **nessuna ha uno stato di cattura vero** (§4).

## 2. Abbinamento al compendio
- Battaglia: **210/217** con una Persona del compendio (122 Persona distinte; **212/217** dopo la correzione di G-021, §10.5: le prime due righe qui sotto hanno Ombra e
  maschera scambiate). Senza: Melma nera («Fango pulsante»), Pixie superiore
  («Maestra degli scherzi»), 4 Servobot di Okumura, «Straziato re dei desideri» (Memento, senza maschera) → Ombre «non reclutabili».
- Voci dei Memento: **131/131** (dalla `maschera`). Voci Persona dei Palazzi: **38/41**; senza: «Tabella Ombre catturabili del Palazzo di Okumura»
  (contenitore, non un'Ombra), «Parla con Morgana» e «Risveglio Persona di Ryuji» (Kamoshida: eventi di trama, non Ombre).
- Nomi delle Ombre: 129 nomi distinti nella Battaglia; 14 Persona hanno nomi di Ombra diversi a seconda del posto (es. la stessa maschera in
  Palazzo e nei Memento). Solo **38** nomi della Battaglia coincidono con la resa italiana della negoziazione (`traduzione(negoziazione)`, 120 righe):
  i due elenchi di nomi italiani sono diversi in gran parte (il piano: 145/183).

## 3. Debolezze contro il compendio (R8-08)
- Battaglia (210 confrontate): **debolezze diverse 9**, **resistenze diverse 31** (piano: 12/210 e 27/210). Esempi: Reggente/Regent psy wk nella
  guida, «-» nel compendio; Maestra degli scherzi/High Pixie 4 elementi invertiti; Spiritello degli alberi/Kodama fuoco e ghiaccio invertiti;
  Portatore di disgrazie/Shiki-Ouji rs contro nu su tre elementi. Elenco completo in `l8-prod.json`.
- Voci con debolezze proprie: **161** (131 dei Memento + 30 dei Palazzi), di cui **45** diverse dal compendio.
- Regola (dubbio 2): per le Ombre con Persona vince il compendio; per le 7 senza Persona (5 dopo G-021) resta la copia della guida (una sola, sull'Ombra).
- **Verifica dell'Esperto (`guida/registro.md` G-019)**: ha ricostruito le stesse differenze (37 Ombre: 9 debolezze, 31 resistenze; 45 voci) e le ha
  confrontate con le affinità estratte dal gioco Royal (Ombra e Persona):
  - il **compendio coincide col gioco ovunque**: il caso Power / Armi da fuoco (Persona debole, Ombra neutra) **non è un errore del compendio** ma un'altra Ombra con
    affinità diverse dalla sua Persona (correzione di G-019, confermata da `dataset-fonti.md`: per la Megami Tensei Wiki la Persona è debole e l'Ombra no);
  - **la guida ha ragione su 4 Ombre** le cui affinità nel gioco differiscono dalla loro Persona: Take-Minakata (Tuono respinge), Mithras (Nucleare respinge),
    Bugs (Fuoco debole; Psicocinesi e Maledizione neutre), **Power (Armi da fuoco neutro)** → per queste quattro l'Ombra tiene **affinità proprie** (eccezione a «vince il
    compendio»; il compendio resta invariato per la Persona);
  - tutto il resto sono errori della guida (tabella C) o resistenze non elencate (tabella D) → vince il compendio.
  Elenco da mostrare all'utente: le 4 eccezioni (nessuna correzione al compendio).

## 4. Catture e compendio (R8-11…R8-15, R8-23)
- Stati sulle voci `persona` dei Palazzi: **4 righe** (p1 e p2) su 2 voci di Kamoshida, `…11-04-parla-con-morgana` e `…12-04-sconfiggi-3-bestie-bicorne-
  sporche-durante-la-fuga`: **non sono catture** (eventi del tutorial). Nessuna cattura nei Palazzi da convertire in registrazione.
- Voci Persona dei Memento: 0 stati (lo stato è già il compendio, come vuole il modello).
- `compendio_partita`: p1 **53** registrate (p2 nessuna); `persona_posseduta` p1 7. Restano intatti (R8-23).
- Iweleth: 0 stati di partita.

## 5. Personalità e «dove si incontra»
- Personalità nella Battaglia: Giocosa 45, Cupa 32, Timida 32, Irritabile 32, **null 74**, fuori dalle 4: «Orlov: -», «Straziato re dei desideri: Non
  reclutabile». Proposta: null e «-» → «sconosciuta», «Non reclutabile» → flag di non reclutabilità (dubbio 7).
- «Dove si incontra»: 124 Persona hanno almeno una fonte, 113 più di una; in **90** le fonti dicono cose diverse, ma quasi sempre per **copertura**
  (la Battaglia elenca Palazzo e Memento, `persona.aree_mementos_json` solo i Memento, le voci solo dove sono scritte), non per contraddizione
  (es. Bicorn: battaglia[kamoshida, mementos], voci[mementos], compendio[mementos]). Regola: unione delle fonti in Ombra ↔ area (Palazzo o dedalo),
  con elenco; nessuna fonte vince sulle altre.

## 6. Iweleth (D3, R8-16…R8-19)
- 47 voci: forziere 9, persona 9, puzzle 7, miniboss 6, oggetto 4, altro 4, sicura 4, boss 3, ombra-sciagura 1 → **38 con tipi non ammessi nei
  dedali** (solo persona/trama), confermato.
- **9 Persona doppie**, confermate: `iweleth-02-corridoio-della-prigione-parte-i/5..13` (Melchizedek, Moloch, Lilith, Chernobog, Thor, Yamata-no-Orochi,
  Diamante Hope, Abaddon, Teschio di Cristallo) ↔ `mementos-08-iweleth/7..15`, stessa Persona.
- Dedalo `mementos-08-iweleth`: 13 aree (area-8 «???»), 16 voci; infiltrazioni del «Palazzo» 12 (Entrata … Cammino per il Santo Graal IV). Spilli guida
  con FK RESTRICT: **12**. Stati di partita: 0. Planimetrie 26, spilli su planimetria 55 (L3).

## 7. Persona del party (D7, R8-20)
`dati_guida.personaggi`: 27 personaggi, 29 Persona del party; **coincidono col compendio solo 2** (Arsène, Satanael di Joker). Le altre 27 (Captain Kidd,
Carmen, Zorro, Goemon, Johanna/«Ioanna», Necronomicon, Milady, Robin Hood, Cenerentola… con le evoluzioni) **non esistono nel compendio** (non sono
Persona fondibili): non si possono «collegare per chiave» a una riga che non c'è. Proposta: righe nuove marcate «del party» (non fondibili, non nella
fusione) oppure un elenco a parte; da decidere in modifiche.md. `membro_squadra_partita` p1: joker, morgana, ryuji, ann (in squadra).
**Dati per le righe nuove (Esperto, `guida/registro.md` G-025 + allegato `guida/G-025-persona-del-gruppo.md`)**: le 27 sono **9 membri × 3 forme** (Captain Kidd → Seiten
Taisei → William; Carmen → Ecate → Célestine; Zorro → Mercurio → Diego; Goemon → Kamu Susano-o → Gorokichi; Ioanna → Anat → Agnes; Necronomicon → Prometeo → Al Azif;
Milady → Astarte → Lucy; Robin Hood → Loki → Ervardo; Cenerentola → Vanadis → Ella), con arcano del membro, livello di partenza, affinità prima e dopo il risveglio,
skill col livello (dati estratti dal gioco Royal) e data/condizione della 2ª e 3ª forma (guida italiana). Le forme successive **non sono Persona nuove**: è la stessa
Persona che si trasforma (livello e skill conservati) → proposta di modello: **una riga per membro** con le **3 forme** come stati (nome, tratto, affinità), non 27 righe
indipendenti. Nomi nei dati di oggi (`dati_guida.personaggi`): coincidono con la guida italiana (Ecate, Mercurio, Ioanna, Prometeo, Ervardo, Cenerentola). Certezza alta,
media per la data di Loki e di Ella. Dati strutturati delle forme: `guida/G-025-persona-del-gruppo.json` (27 forme: membro, forma, nome e nome IT, arcano, livello, quando,
tratto, affinità, statistiche, skill col livello). **Verifica sui dati**: le **175 skill distinte** e i **18 tratti** delle forme esistono tutti nella tabella `skill` o nella
sua traduzione (0 mancanti, prod = dev): le righe nuove si possono legare alle skill per chiave senza creare skill.

### 7.1 Nome italiano unico degli elementi (G-025)
Forma della guida (= gioco in italiano): Fisico, Arma da fuoco, Fuoco, Ghiaccio, **Elettricità**, Vento, **Psicocinesi**, Nucleare, Sacro, **Maledizione**, **Divino**; tipi
**Alterazioni**, **Recupero**, Supporto, Passive, Tratti; esiti Debole, Resiste, Annulla, **Riflette**, Assorbe. Dove oggi i dati usano un'altra forma (prod = dev):
| Forma di oggi → corretta | Etichette (`traduzione`) | Dentro testi |
|---|---|---|
| Psichico → Psicocinesi | `elementoSkill:psy`, `elementoAffinita:psy`, `tipoEredita:Psy`, `colonnaEredita:psy` (4) | — |
| Oscurità → Maledizione | `elementoSkill:curse`, `elementoAffinita:curse`, `tipoEredita:Curse`, `colonnaEredita:curse` (4) | `effettoSkill` / `descrizioneOggetto` / nomi di skill (fino a 35 frasi), `articolo.condizione` 3, `dati_guida` 1 |
| Quasi-divino → Divino | `elementoSkill:almighty`, `tipoEredita:Almighty` (2) | frasi di `effettoSkill` |
| Guarigione → Recupero | `elementoSkill:healing`, `tipoEredita:Healing`, `colonnaEredita:healing` (3) | frasi di `effettoSkill`/`descrizioneOggetto`, `dati_guida` 1 |
| Tuono → Elettricità, Gelo → Ghiaccio, respinge → Riflette (Battaglia) | — | `dati_guida.battaglia` (217 Ombre: debolezze/resistenze), voci con `deboleA/resisteA/debolezze/resistenze`: **102 voci** (Memento 70, Maruki 9, Shido 7, Okumura 4, Futaba 3, Kaneshiro 3, Niijima 3, Iweleth 3) + 11 descrizioni |
- **Le 13 etichette** in `traduzione` si correggono in un punto solo e cambiano ovunque (sono lette per chiave): correzione sicura.
- **Dentro i testi** (descrizioni di skill e oggetti, frasi delle voci) le parole compaiono anche in altri sensi (es. «Oscurità» in un nome di skill): **non** una sostituzione
  di testo cieca; con L8 debolezze e resistenze delle voci non si leggono più dalle copie (vince il compendio, §3) e le etichette vengono dalla `traduzione` corretta, quindi
  la maggior parte delle forme vecchie esce dalle viste senza riscrivere i testi. I testi restanti: elenco da approvare.
- **Lavoro da preservare**: **nessuna voce di Kamoshida o Madarame** contiene queste forme (0 righe): l'impronta (`1a71b030…bc4c`) non è toccata.

## 8. Regole di migrazione proposte
1. **Ombra** (tabella nuova): una riga per Ombra distinta (nome IT + maschera + dungeon), dalla Battaglia (217) unita alle voci dei Memento (131) e dei
   Palazzi (38 con Persona), deduplicando per (nome normalizzato, Persona); `persona_id` dal compendio (o NULL = non reclutabile); personalità valida
   o «sconosciuta»; affinità proprie **solo** per le Ombre senza Persona (5) e per le **4 Ombre con affinità diverse dalla Persona** (Take-Minakata, Mithras, Bugs, Power: G-019).
2. **Voci**: le 131 dei Memento e le 38 dei Palazzi acquistano `ombra_chiave`; testo, ordine, pin, aree **invariati**; `dettagli_json` non si cancella
   (si smette di leggere `deboleA/resisteA/debolezze/resistenze`).
3. **Cattura**: nessuna riga da convertire (§4); da L8 il tocco sulla voce agisce su `compendio_partita`.
4. **Iweleth** (D3): le 9 voci Persona doppie diventano link alle voci del dedalo (`mementos-08-iweleth/7..15`); le altre 38 voci → Trama o elenco
   (R8-17); planimetrie e spilli conservati (dubbio 4); i 12 spilli guida restano collegati (nessuna cancellazione dell'area con FK RESTRICT).
5. **Party**: vedi §7 (elenco).

## 9. Conteggi attesi dopo
| Voce | Atteso |
|---|---|
| Ombre | ≈ 217 dalla Battaglia unite a 131 + 38 voci (deduplica da elenco); 7 non reclutabili |
| debolezze ricopiate lette | 0 (per le Ombre con Persona) |
| `compendio_partita` / `persona_posseduta` | 53 / 7 invariati |
| voci Kamoshida/Madarame | testi, ordine, pin invariati; impronta identica (`1a71b030…bc4c`) |
| dedali dei Memento | 9 dedali, 95 aree, 827 legami, 131 voci Persona invariati (salvo Iweleth) |

## 10. Negoziazione: umori, domande, risposte, esiti (richiesta del PM; da confrontare con G-021 dell'Esperto, non ancora nel registro)
Censimento (`l8neg.cjs` → `l8neg-prod.json`, prod = dev).
### 10.1 Dove stanno i dati
- **File del repository** `server/db/dati/negoziazione-domande.json` (fonte: «The Ultimate/Most Complete Guide To Negotiations In Persona 5», resa italiana):
  **230 domande, 691 risposte, 642 verdetti** (buona 342, passabile 185, cattiva 115; 7 «incerto»), 5 domande ripetute.
- La migrazione **083** lo normalizza (un verdetto per umore e risposta, «nel dubbio il peggiore» marcato `incerto`; domande ripetute fuse) e lo scrive dentro
  **`dati_guida.battaglia.negoziazione.domande`** (JSON, non una tabella): **225 domande, 680 risposte, 618 verdetti** (buona 319, passabile 184, cattiva 115;
  **30 incerti**), 0 doppioni. Accanto: `personalita` (4: Giocosa, Timida, Irritabile, Cupa, con descrizione, 2 risposte efficaci e 2 da evitare ciascuna),
  `regole` 4, `opzioniHoldUp` 3. Forma di una risposta: `{testo, verdetti: [{esito, tratto, incerto}]}`.
### 10.2 Copertura per umore (la segnalazione dell'utente è confermata)
| Umore | Domande con almeno un verdetto | con una risposta «buona» | senza nessun verdetto |
|---|---:|---:|---:|
| Irritabile | 142 / 225 | 92 | 83 |
| Cupa | 122 | 73 | 103 |
| Giocosa | 112 | 79 | 113 |
| Timida | 100 | 68 | 125 |
- Domande con verdetti per **tutti e 4** gli umori: 27; per 3: 58; per 2: 54; per 1 solo: **86**.
- Domande con una risposta **buona per tutti e 4** gli umori: **10 su 225**; per 3: 27; 2: 55; 1: 81; **nessuna buona per nessun umore: 52**.
- Risposte **senza alcun verdetto**: 232 su 680 (34%). Una domanda ha meno di 3 risposte; massimo 5 risposte.
→ Nei dati di oggi **mancano** i verdetti per gran parte delle combinazioni domanda × umore: la fonte (guida inglese della community) non li dà tutti. Completarli è
lavoro dell'Esperto (G-021): per ogni domanda, la risposta buona per ciascuno dei 4 umori.
### 10.3 Legame con le Ombre
- Nessun legame diretto domanda ↔ Ombra nei dati: le domande non citano l'Ombra; il legame passa dalla **personalità** dell'Ombra.
- Personalità delle Ombre: Battaglia 217 → Giocosa 45, Cupa 32, Timida 32, Irritabile 32, **null 74**, «-» 1, «Non reclutabile» 1; voci dei Memento 131 → Giocosa 40,
  Cupa 30, Timida 30, Irritabile 30, «-» 1. Le Ombre senza personalità (74 + 2) non possono usare l'aiuto alla negoziazione.
- `traduzione(negoziazione)` 120 righe = **nomi delle Ombre** in negoziazione (EN → IT), non domande (vedi §2: solo 38 coincidono coi nomi della Battaglia).
### 10.4 Proposta per L8
Tabella propria (o JSON versionato) **domanda → risposta → verdetto per umore**, con fonte e `incerto`; le 225 di oggi migrate 1:1 (nessun verdetto perso; i 30 «incerti»
restano marcati); le combinazioni mancanti arrivano da G-021 dell'Esperto, aggiunte con la loro fonte, mai inventate; l'Ombra porta la personalità (L8 §5).

### 10.5 Confronto con G-021 dell'Esperto (`guida/registro.md` G-021 + allegato `guida/G-021-negoziazione.md`)
- **Causa**: il file dell'app viene dalla raccolta di joyce-chen per **Persona 5 base**; la fonte giusta è il foglio **Royal** della stessa raccolta: **277 domande** × 3
  risposte × 4 personalità, **1.714 esiti** noti.
- Abbinamento sul file dell'app (230 domande): 229 abbinate (218 certezza alta). Esiti, **ricalcolati dall'Esperto con le contraddizioni contate a parte**:
  **423 uguali**, **86 diversi** (vale Royal), **979 mancanti** nell'app, **51 solo nell'app** (da tenere, marcati «solo P5»), **24 contraddittori** nel file (stessa
  risposta buona e cattiva per lo stesso umore: sono i 24 casi che la migrazione 083 già risolve «col peggiore»), di cui **21 risolti da Royal**; A19 «Non ho tempo./Chiedo
  scusa.» (Cupa) e A142 «Tanto non sono maturo.» (Giocosa) sono contraddizioni, non «diversi». **49 domande nuove** di Royal (+ 9 varianti già presenti); 1 domanda solo
  P5 (A156).
- Domande senza nessuna risposta buona: **oggi 52 → con Royal 10**.
- **Coerenza coi miei numeri**: le mie misure sono sul file e su `dati_guida` per testo esatto; le differenze sono di definizione, non di dato:
  - doppioni: io 5 (testo identico), l'Esperto **9** (stessa domanda con resa diversa);
  - senza nessuna buona: **52**, riconciliato. L'Esperto aveva 55 perché il suo script, con due esiti per lo stesso umore, teneva solo l'ultimo e perdeva il «buona»
    (A8, A135, A162); registro e allegato corretti.
- **Testo italiano**: nessuna fonte italiana ha le domande; le 49 nuove sono **rese fedeli dell'Esperto, da marcare «non testo del gioco»**. Le 8 frasi delle carte
  (guida italiana) sono testo del gioco: 5 confermate, «In realtà sono un ragazzino» per Timida è **passabile** (non buona), 2 non verificabili.
- **Personalità delle 75 Ombre che ne sono prive** (= le mie 74 «null» + 1 «-» del §10.3): dai dati del gioco ne arrivano **69 univoche + 2 corrette per nome**;
  **4 Servobot di Okumura non negoziabili**; i Demoni del Tesoro (Collana della Regina, Pietra di Scone, Koh-i-Noor, Orlov, Amuleto dell'Imperatore, Oricalco) hanno una
  personalità nei dati ma la negoziazione va verificata.
- **Correzione al mio §2**: «Melma nera / Fango pulsante» e «Pixie superiore / Maestra degli scherzi» **non sono Ombre senza Persona**: in quelle due righe della Battaglia
  **Ombra e maschera sono scambiate** (Ombra «Fango pulsante» = Black Ooze; Ombra «Maestra degli scherzi» = High Pixie). Le Ombre senza Persona del compendio
  scendono da 7 a **5** (4 Servobot + «Straziato re dei desideri»); le due righe vanno corrette (scambio dei campi, elenco).
- **Regola di migrazione** (allineata a G-021): esiti da Royal; dove Royal tace e l'app ha un esito, si tiene marcato «solo P5 (non verificato in Royal)»; 49 domande nuove
  con la resa marcata; personalità delle 71 Ombre dai dati del gioco; Ombre sciagura e Servobot esclusi dalla negoziazione. Certezza: alta sull'elenco, media sui singoli
  esiti (la fonte stessa avverte che parte degli esiti Royal viene dall'originale).

## 11. Rimisura sulla copia fresca di produzione (`dati-produzione/2026-10-20-0440Z/`, 2026-10-20)
Sola lettura; script `l8.cjs`, `l8neg.cjs` (uscite `*-0440Z.json` nel mio scratchpad), confronto con la copia di produzione precedente.
- **Una sola cifra cambia**: le voci `boss` dei Palazzi passano da 24 a **26**. Sono le due voci che l'utente ha aggiunto a Madarame la sera del 19/10, nell'infiltrazione
  «Il furto del Cuore di Madarame»: ordine 18 «Scontro Madarame a pezzi» (senza pin) e ordine 19 «Scontro con Madarame» (pin 2300 e 2301). Quest'ultima è la
  `voce_boss_finale` di Madarame (L4 §8.14).
- Restano uguali: Ombre della battaglia 217, voci `persona` dei dedali 131 e dei Palazzi 41, `ombra-sciagura` 70 e `miniboss` 57, abbinamenti al compendio, debolezze,
  party (§7) e negoziazione (`l8neg` identico: §10 invariato).
- Per R8-19b: Iweleth resta **senza** `voce_boss_finale` (L4 §8.14) e il suo boss, `iweleth-12-cammino-per-il-santo-graal-parte-iv/5`, resta un dato; non conta per
  nessun Palazzo concluso.
- **Impronta**: riferimento `impronta-0440Z.json` (sha256 `bbd9de5d7833f0f9…`, L4 §11.7). Le due voci `boss` nuove sono lavoro dell'utente da preservare.
- **Correzione del §7.1 («nessuna voce di Kamoshida o Madarame contiene queste forme»): sulla copia fresca non vale più.** Due delle 396 voci dei due Palazzi le contengono,
  e sono proprio le due voci `boss` nuove dell'utente:
  - `madarame-il-furto-del-cuore-di-madarame-scontro-con-madarame` (`dettagli_json`, assorbimenti: «Occhi: Fuoco, **Gelo**, Elettricità, Vento»);
  - `madarame-il-furto-del-cuore-di-madarame-scontro-con-madarame-2` (descrizione/strategia: «**respinge** gli attacchi di Fuoco…», 4 frasi).
  Sono **lavoro da preservare**: nessuna sostituzione nei loro testi. Si correggono solo le 13 etichette di `traduzione`. Le due frasi vanno nell'elenco «da rivedere»
  dell'utente (R11-10c) come proposta: «Gelo» → «Ghiaccio», «respinge» → «riflette» (G-025). Le scrive solo l'utente, oppure il team dopo il suo sì.
- **Base p5s** (`dati-produzione/p5s-2026-10-20-0503Z/`): `l8` e `l8neg` sono **identici** alla 0440Z. Impronta di riferimento: `ff3033cb…` (L4 §11.8).
- **G-035 dell'Esperto (rilettura di L8 contro la guida)**, controllato sulla base 0533Z in `dati_guida.battaglia.ombre`:
  1. **Kaneshiro, due righe con Ombra e maschera scambiate**: oggi «Melma nera» con Persona «Fango pulsante» e «Pixie superiore» con Persona «Maestra degli scherzi».
     - Si correggono come le righe del Dedalo di Kaitul, che sono già giuste: Ombra «Fango pulsante» con Persona Melma nera (liv. 18, Timida) e Ombra «Maestra degli scherzi»
       con Persona Pixie superiore. Tutte e due sono **reclutabili**.
     - Le Ombre **non reclutabili sono 5**: 4 Servobot + «Straziato re dei desideri». È lo stesso esito del §2.
  2. **Straziato re dei desideri** (Dedalo di Da'at): oggi `persona` null e personalità «Non reclutabile». Resta non reclutabile (obiettivo di una richiesta) e si può segnare la
     maschera **Mara** (liv. 60, Irritabile). Certezza media: dati di gioco aqiu384.
  3. **Nomi doppi**: vale il nome della guida (Battaglia), e l'altro va fra i nomi alternativi:
     - `traduzione` (ambito `negoziazione`) `Prankster Leader` = «Capo dei burloni» contro «Maestra degli scherzi»;
     - `Torn King of Desires` = «Re lacerato dei desideri» contro «Straziato re dei desideri».
     Nessuna riga si cancella.
  4. Personalità (71 + Orlov «Giocosa») e Servobot non negoziabili: già in G-021 (§10.5). «Dove si incontra» con l'unione delle fonti e le 9 Persona doppie di Iweleth:
     confermati. Debolezze (G-019) e party (G-025): confermati.
  Nessuno di questi dati è lavoro da preservare: le voci dei Palazzi di Kamoshida e Madarame non sono coinvolte.
  **Regole di migrazione e cifre attese (G-035), sulla base 0533Z**:
  - `battaglia.ombre`: **217** righe.
    - **2** si correggono (le due di Kaneshiro, scambiando i campi `ombra` e `persona`, con debolezze e resistenze invariate perché sono già quelle della Persona).
    - **1** si completa: Straziato re dei desideri, `persona` = Mara, che esiste nel compendio (`traduzione` persona `Mara`). La personalità resta «Non reclutabile»;
      Irritabile va come nota, certezza media.
    - Le altre 214 restano identiche.
  - Abbinamento al compendio: **213/217** (210 di oggi + 2 di Kaneshiro + Mara). Senza Persona del compendio restano i **4 Servobot**.
  - Ombre **non reclutabili: 5** (4 Servobot + Straziato re dei desideri). Nessuna Ombra reclutabile diventa non reclutabile.
  - **Nomi**: il nome mostrato è quello della guida (Battaglia). Le 2 righe di `traduzione` ambito `negoziazione` (`Prankster Leader` «Capo dei burloni», `Torn King of Desires`
    «Re lacerato dei desideri») diventano **nomi alternativi** dell'Ombra (cercabili). Nessuna riga si cancella.
  - Personalità: **71** completate + Orlov «Giocosa» (G-021 §10.5). Servobot esclusi dalla negoziazione.
- **Impronta «prima» di L8 sulla base p5s-2026-10-20-0533Z** (richiesta del Manager). Script `impronta-lotto.cjs L8` → `impronta-L8-p5s-2026-10-20-0533Z.json`, nel mio scratchpad
  (`…\161706c7-6e2c-47d6-bdb7-618347ce218c\scratchpad\`). Stessa forma dell'impronta di L7: righe e sha256 per tabella, in ordine di chiave, senza `updated_at`/`created_at`.
  Sha256 complessivo **`742ed5a20dfefe1ea15cfcda0d50ccd498420124e7ee519cd5a9521b4de089a4`**, **identico sulla 0503Z** e stabile se rieseguito.
  | Dato | Righe | sha256 (inizio) |
  |---|---:|---|
  | `persona` / `persona_affinita` / `persona_skill` | 232 / 2320 / 1614 | `6c1a5d80…` / `8e1667fa…` / `d2edd393…` |
  | `persona_area_dedalo` / `area_dedalo` | 827 / 95 | `d29c2e7b…` / `62947fd3…` |
  | `skill` | 525 | `193f4b94…` |
  | `traduzione` (persona, skill, effettoSkill, negoziazione, elementoAffinita, elementoSkill, affinita, arcana, areaMementos, notaPersona) | 1421 | `5d964261…` |
  | `punto_interesse` tipo `persona` (Palazzi e dedali) | 172 | `738b510f…` |
  | `punto_interesse` `ombra-sciagura`/`miniboss`/`boss` | 153 | `4f351554…` |
  | `dati_guida` `battaglia` / `personaggi` | — | `c0ca9298…` / `cc7da334…` |
  | partita: `compendio_partita` / `persona_posseduta` / `membro_squadra_partita` | 53 / 7 / 4 | `f4af2b8c…` / `d106a08b…` / `a7558187…` |
  | partita: `punto_partita` delle voci `persona` | 4 | `5aff3ed4…` |
  **Dopo** L8 cambiano solo le righe dichiarate:
  - in `battaglia`, le 2 di Kaneshiro e Mara;
  - le 13 etichette di `traduzione` (§7.1);
  - i nomi alternativi;
  - le tabelle nuove.
  Il resto, compreso tutto quello della partita e le voci `boss` di Madarame con «Gelo/respinge», deve dare gli stessi sha.
