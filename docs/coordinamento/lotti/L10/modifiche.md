# L10 «Partita e diario» — stesura delle modifiche

Autore: sessione «Stesura modifiche» (2026-10-20). Ingressi: `requisiti.md` (R10-01…R10-39, con R10-11a…k e R10-28b; dubbi 1–7), `dati.md`
(§1–§8, uid completi), `app.md` (§0–§8, segnalazioni A–E), decisioni dell'utente (D6 approvata: Doti solo proposte con «Applica»; D8 consigliata:
yen proposti; inviti: nessuna voce sul diario validato, 29/5 solo evento, le 8 voci dopo il 06-01 di G-023 aggiunte «da rivedere» (Makoto 30/7 con la condizione scritta, G-028, decisione del PM); punti legame
«con lo stesso approccio» del campo di L3: campi visibili, proposte confermate, ordine cronologico), Esperto G-020 (regole dei ranghi e dei punti),
G-023 (inviti), e i lotti precedenti: L3 (campo «Infiltrazioni», «Entra»), L4 (stato sulla voce), L5 (`?spillo=` evidenziato anche se chiuso), L6
(valutatore, `confidente_invito`, `invito_partita`, gesto diretto), L7 (catalogo: acquisti e regali per chiave), L8 (`registraPersona`), L9
(ranghi con `modo` e soglia, modulo dei punti, giorno unico, attività con effetti, piazzamento agli esami). Migrazioni: gioco «M10» e partite (il
primo numero libero di `migrazioniUtente`).

**Principio**: **la spunta applica, togliere la spunta annulla**, con un registro che rende l'annullamento esatto anche dopo un ricaricamento;
**nessun effetto nuovo scritto in silenzio** sulle partite esistenti (le spunte già date producono proposte); **nessuna voce del diario validato
riscritta** (testo, ordine, giorno, fascia, uid, spunte) e **nessuna voce nuova** fino al 06-01; ogni azione ha **una funzione sola** usata da
ogni pagina.

## 1. Il diario come motore

### 1.1 Effetti della voce (R10-01, R10-14)
```sql
CREATE TABLE voce_effetto (
  voce_uid  TEXT NOT NULL,              -- voce_giornata.uid
  ordine    INTEGER NOT NULL,
  tipo      TEXT NOT NULL CHECK (tipo IN ('evento-storia', 'attivita', 'turno', 'lettura', 'incontro', 'passaggio', 'acquisto', 'regalo',
                                          'richiesta', 'domanda', 'esame', 'cruciverba', 'cruciverba-aperti', 'dote', 'invito', 'velluto')),
  chiave    TEXT,                       -- l'oggetto per chiave: evento, attività, libro/film, Confidente, articolo/catalogo, richiesta, domanda, cruciverba, dote, invito
  dati_json TEXT NOT NULL DEFAULT '{}', -- es. lettura {sessioni}, incontro {dialogo, scelta, punti?}, dote {dote, punti}, turno {paga?}
  origine   TEXT NOT NULL CHECK (origine IN ('seed', 'regola', 'utente')),
  PRIMARY KEY (voce_uid, ordine)
);
CREATE TABLE proposta_effetto_voce (    -- stesso schema delle proposte di L3 e L7: si conferma nell'app
  voce_uid TEXT NOT NULL, tipo TEXT NOT NULL, chiave TEXT, dati_json TEXT NOT NULL DEFAULT '{}',
  motivo TEXT NOT NULL, certezza TEXT NOT NULL CHECK (certezza IN ('certa', 'probabile', 'da-verificare')),
  stato TEXT NOT NULL DEFAULT 'aperta' CHECK (stato IN ('aperta', 'confermata', 'scartata')),
  PRIMARY KEY (voce_uid, tipo, chiave)
);
ALTER TABLE voce_giornata ADD COLUMN validata INTEGER NOT NULL DEFAULT 0;        -- segno sulle voci 04-01..06-01: 255 sulla copia 0440Z (254 + la voce del 06-01 sera aggiunta dall'utente il 19/10; R10-29); `impronta.cjs` lo esclude già
-- da_rivedere, aggiunta_da, testo_precedente_json e motivo_revisione NON si creano qui: nascono in L3 (migrazione 110, L3 §1.4) e L10 li riusa
-- (meccanismo unico «da rivedere» + testo precedente, decisione del PM del 2026-10-20); le 8 voci di G-023 li valorizzano come in L3.
```
- `voce_effetto` sostituisce `produce_json` come **fonte** (che resta finché L11: non si legge più). La migrazione converte 1:1 i 266 effetti di oggi
  (`dote` 204 su 189 voci, `lettura` 72, `turno` 9) con `origine='seed'`; `voce_giornata` non si tocca in nessuna colonna di oggi.
- `shared/effettiVoce.ts` (nuovo, al posto di `shared/effettiAzione.ts:52-55`): i tipi, i campi, il nome italiano («Segna la mansarda pulita»,
  «Biliardo +1», «Tae: rango 4»), e chi li applica (§1.3). `RiferimentoAzioneDto` (1067) non cambia: il riferimento resta la navigazione, l'effetto
  è a parte.

### 1.2 Abbinamenti (R10-12, R10-13, R10-38)
- **Sicuri** (`origine='regola'`, scritti dalla migrazione come effetti della voce, non come stato): 61 domande (giorni con una sola domanda), 33
  cruciverba per data + 2 per risposta (Ustione e Hacker, sulle voci spostate al 17/8 e al 30/8 da G-037, sotto), la voce cumulativa del 02-01 → `cruciverba-aperti`, libri, film, lavori e
  incontri già collegati (dati §5.2).
- **Proposte** (`proposta_effetto_voce`, nulla di scritto): 5 giorni con 2 domande, 4 voci d'esame senza domanda, 62 acquisti senza collegamento
  (articolo o oggetto del catalogo, L7), 110 voci di trama (eventi di storia: «Inizia a pulire» → `mansarda-pulita`, il caffè al Leblanc, la Pietra
  Sacra, il duello con Akechi… da un elenco preparato con l'Esperto), 20 voci della Stanza di Velluto (solo informative, dubbio 4), le 8 voci che
  descrivono un invito (dati §8: diventano effetto `invito` solo se l'invito esiste in `confidente_invito`), le attività svolte (95 voci).
- **Correzioni di G-037** (Esperto, rilettura dei dati di L10). Tutte dopo il 06-01, col meccanismo «da rivedere» di L3 §1.4; il diario
  validato non si tocca.
  - **Cruciverba**: i 38 della tabella coincidono con la guida, ma due voci del diario stanno nel giorno sbagliato. «Ustione» va dal 08-16 al
    **08-17** e «Hacker» dal 08-29 al **08-30**.
    - La migrazione sposta le due voci nella stessa fascia del giorno giusto, in fondo, e salva data e ordine di prima in
      `testo_precedente_json`, esteso a `data` e `ordine`; mette `da_rivedere = 1` col motivo «Il cruciverba è del 17/8 (G-037)».
    - I due abbinamenti sicuri per risposta seguono le voci.
    - «Rimetti il precedente» le riporta dov'erano.
  - **7/7, domanda in classe che manca**: si aggiunge a `domanda` la domanda del 7/7, «La Via Lattea», e poi «Somen» aiutando Ann, con il
    testo e gli effetti di G-037 (dato di gioco, `fonte='G-037'`). La voce del diario del 7/7, se c'è, riceve l'abbinamento come proposta.
  - **10-15, non è una domanda**: è il gesso di Ushimaru, una prova di Perizia (Fascino +2 se lo schivi). La riga di `domanda` del 10-15
    **non si cancella**: si nasconde (`nascosto = 1`), col motivo nell'elenco «Da rivedere». La voce del diario riceve la proposta d'effetto
    `dote{fascino,+2}` (D6: solo proposta) al posto dell'abbinamento alla domanda.
  - **10-31, «cruciverba scolastico» che non esiste**: quel giorno c'è il tempo libero con Kawakami (rango 5) e la sera il cruciverba «Stand».
    La voce di oggi si **segnala** (`da_rivedere = 1`, `motivo_revisione` con il testo di G-037) e non si riscrive. Le proposte d'effetto sono
    l'incontro con Kawakami di giorno e il cruciverba «Stand» la sera, ognuna sulla voce giusta se c'è, altrimenti nell'elenco.
  - Verifica: 38 cruciverba; le 2 voci spostate con la data e l'ordine di prima conservati; nessun'altra voce cambia.
- **Elenco lavorabile** (R10-38): pagina «Abbinamenti del diario» (in Partita › Diario e in Impostazioni) con filtri per area e mese, «Conferma»,
  «Scarta», «Scegli un altro» per riga e «Conferma tutte le certe» in blocco; le voci del diario validato si confermano solo con un gesto.

### 1.3 Applicare e annullare: un registro (R10-02, R10-22)
```sql
-- partite.db
CREATE TABLE utente.effetto_applicato (
  partita_id INTEGER NOT NULL, voce_uid TEXT NOT NULL, effetto_ordine INTEGER NOT NULL,
  tipo TEXT NOT NULL, chiave TEXT, prima_json TEXT,    -- lo stato com'era prima (per annullare esattamente)
  creato INTEGER NOT NULL,                             -- 1 se questa spunta ha creato lo stato (es. l'evento di storia), 0 se c'era già
  applicato_il TEXT NOT NULL,
  PRIMARY KEY (partita_id, voce_uid, effetto_ordine)
);
CREATE TABLE utente.da_applicare (                    -- proposte nella partita: Doti (D6), yen (D8), effetti delle spunte già date
  id INTEGER PRIMARY KEY, partita_id INTEGER NOT NULL, voce_uid TEXT, tipo TEXT NOT NULL, chiave TEXT, dati_json TEXT NOT NULL,
  motivo TEXT NOT NULL, stato TEXT NOT NULL DEFAULT 'aperta' CHECK (stato IN ('aperta', 'applicata', 'scartata')), creato_il TEXT NOT NULL
);
```
- **Spunta** (`giornataService.spuntaVoce` 340-362 → nuovo `motoreDiario.applica(partita, voce)`): per ogni effetto della voce chiama **la funzione unica
  del suo dominio** e scrive una riga di `effetto_applicato` con lo stato di prima. Domini: evento di storia (`evento_storia_partita`), attività
  (`attivita_svolta_partita.volte`, §3.4), turno (contatore + **proposta** di entrata in yen, D8), lettura (avanzamento, §3.4), incontro/passaggio
  (motore dei punti, §2), acquisto (`acquisto_partita` + **proposta** di uscita in yen, D8), regalo (§3.3), Richiesta/domanda/esame/cruciverba (stati di
  oggi), `cruciverba-aperti` (segna i cruciverba aperti, registrando **quali**), invito (`invito_partita` con `voce_uid`, L6), **Dote → sempre e solo
  proposta** in `da_applicare` (D6), velluto (nessuno stato: nota).
- **Togliere la spunta** (`motoreDiario.annulla`): ripercorre `effetto_applicato` della voce al contrario e riporta ogni stato **a com'era**, ma
  **solo dove l'aveva creato quella voce** (`creato = 1`): un evento di storia che c'era già (es. `mansarda-pulita` segnata a mano in p1 e p2) resta; un
  invito registrato col gesto resta; la lettura torna all'avanzamento di prima (oggi non si annulla: segnalazione C — ora sì, senza toccare ciò che è
  stato segnato dalla pagina del libro dopo); le Doti applicate diventano una **proposta di toglierle** (D6, mai automatico); gli yen una proposta
  inversa. Funziona dopo un ricaricamento perché tutto sta nel registro (l'«Annulla ultimo» locale di `ConfidentiPartita.tsx:68, 85-90, 251` sparisce).
- **«Da applicare»** (R10-10, R10-36): sezione di Oggi e di Progressi con le proposte aperte (Doti, yen, effetti delle spunte già date), «Applica» e
  «Scarta» per riga e in blocco; sostituisce il promemoria «da segnare» delle Doti (`effettiAzioneService.ts:58-61`), che diventa questa lista.
- **Spunte già date** (R10-15, dubbio 2, segnalazione B): la migrazione **non applica** nulla alle 338 spunte esistenti; per le voci spuntate a cui
  ora corrisponde un effetto (sicuro o confermato più avanti) crea una riga `da_applicare` con «Effetto che la spunta avrebbe dato» (124 spunte senza
  riferimento né effetto oggi, dati §4). Dove lo stato esiste già (mansarda pulita), la proposta è segnata «già vero» e non serve applicarla.
- **Il caso del piano** (R10-03): spuntare «Inizia a pulire» (04-09, `b79da6f663d32b6845e6489065b8e841`) dopo la conferma dell'abbinamento segna
  `mansarda-pulita`; togliere la spunta la riapre — **sulla partita di prova**, dove l'evento non era già stato segnato a mano.

## 2. Punti legame e ranghi (R10-07, R10-11a…h, R10-17)
### 2.1 Campi sulla voce (lo stesso approccio del campo «Infiltrazioni» di L3)
- Ogni voce d'incontro mostra i campi **Confidente** (dall'elenco), **scelta di dialogo** (dai dialoghi del rango del Confidente, L9) e **punti**
  (calcolati dal modulo condiviso di L9 sulle note della scelta, correggibili); se la voce è un passaggio, **passaggio al rango N**. Sono l'effetto
  `incontro`/`passaggio` della voce (`voce_effetto.dati_json`), non il testo.
- **Proposte** (R10-11b): Confidente dal riferimento, `rango_atteso` → passaggio, scelta ottimale del dialogo → punti (con il motivo «risposta ottimale
  del rango 3»); confermate dall'utente; nessuna scritta dalla migrazione.
### 2.2 Il motore cronologico
- `shared/puntiConfidenti.ts` (L9) + `server/services/motorePunti.ts` (nuovo): `ricalcolaConfidente(partita, confidente, dalVoce?)` scorre in **ordine
  cronologico** (data, fascia giorno → sera → notte, ordine della voce nella giornata, ordine delle scelte; R10-11c) gli incontri **applicati** e le
  **correzioni a mano** della pagina (registrate con data e fascia nello stesso registro, così la cronologia vale anche per loro):
  - ranghi `punti` (L9): i punti si sommano verso la soglia; a soglia raggiunta il rango è **«evento pronto»** e i punti successivi si conservano; al
    **passaggio** l'eccedenza e i punti dell'evento del salto contano per il rango seguente (G-020, R10-11d, R10-11d2);
  - ranghi non a punti (rango 1 e 1→2 per tutti; Igor, Morgana, Sae, Gemelle; Mishima con le Richieste; Yoshida; Akechi 9→10; Maruki 10; il 9→10 in
    generale): nessun accumulo, il rango segue il suo evento (R10-11e);
  - moltiplicatori: arcano ×1,5, esami (piazzamento, L9) per i 7 Confidenti; ×1,2 dell'invito non applicato (G-020 da verificare).
- Ricalcolare da zero = applicare passo per passo (R10-11c, test di proprietà). Togliere una spunta o cambiare i campi ricalcola **da quella voce in
  poi**: un passaggio non più raggiunto torna indietro e i punti dopo si riassegnano (R10-11f).
- **Base della partita esistente** (R10-11h, nessuna scrittura automatica): la migrazione registra per ogni Confidente di ogni partita una **base** =
  rango e punti di oggi alla data della partita (`utente.confidente_base_partita`); il motore riparte dalla base per gli eventi successivi e **non
  ricalcola il passato**. Il ricalcolo completo dal diario (che darebbe, per esempio, Sojiro p1 diverso: 50 punti con 43 necessari, dati §7.2) si
  mostra come **«da verificare»** per Confidente, voce per voce, con «Applica il ricalcolo»: solo con il gesto.
- **Rango** (R10-17): sale con il passaggio, dal diario o dalla pagina (che scrive una correzione datata); togliere il passaggio lo riporta indietro;
  la correzione a mano resta e il diario la mostra. Il blocco dei semafori («Segna comunque») resta come oggi.

## 3. Una regola per azione
### 3.1 Il giorno (R10-16, segnalazione A)
`partiteService.impostaGiorno(partita, data, { origine })` (nuova, al posto di `percorsoService.impostaGiornoCorrente` 84-90 e dei pezzi di
`avanzaSeGiornoCompleto` 66-81): giorno esistente in `giorno` (L9), fascia «giorno», suggerimenti invalidati, evento nello storico. La usano le 6
strade: Oggi, Guida giorno per giorno, avanzamento automatico (che resta, 2026-09-30), **Calendario** e **Riepilogo** (oggi `PUT /partite/:id`
senza controlli: da qui `PUT /partite/:id` rifiuta `dataGioco` con 400 `usa-il-giorno`, e i due componenti chiamano `PUT /partite/:id/giorno`),
creazione della partita. Anche la fascia passa da una funzione (`impostaFascia`).
### 3.2 Persona (R10-19, R10-25)
`registraPersona` di L8 è la sola strada. **Vista «Persona della partita»** (scheda di Partita, R10-25): per ogni Persona della scorta e del compendio,
«in scorta», «registrata», «registrazione più vecchia dell'esemplare» (confronto livello/abilità/bonus), con «Registra» accanto; unisce `ScortaPersona`
e `CompendioPersonale` in una vista (le due schede di oggi restano come filtri).
### 3.3 Regalo (R10-18)
Un'azione sola `regala(partita, confidente, oggetto, { data, comprato? })`: punti (modulo di L9: 50 di base dove si può, G-020), `regalo_partita` per
chiave del catalogo (L7), effetto nel registro (annullabile), e se l'oggetto non risulta comprato propone «Segna anche comprato» (acquisto + proposta di
uscita in yen). Una finestra unica «Regala» (scelta dell'oggetto dal catalogo, filtrata per «A chi piace»): sostituisce «Regalo» in Partita
(`ConfidentiPartita.tsx:249`, +50 senza dire quale) e «Regalo consegnato» della scheda (`ConfidenteDettaglioPage.tsx:98-107`).
### 3.4 Letture e turni (R10-20)
- **Letture**: un contatore, l'avanzamento (`progresso_libro/film/videogioco_partita`); «completato» si **calcola** (avanzamento ≥ sessioni); `lettura_partita`
  non si scrive più e i suoi lettori (`haAnimaDaCineasta` `attivitaService.ts:256-258`, condizione `lettura` `disponibilitaService.ts:140`) leggono il
  calcolo. Migrazione: per ogni riga di `lettura_partita` senza avanzamento completo, l'avanzamento si porta al completo (stato visibile identico:
  oggi quella riga vale «letto»).
- **Turni e attività**: un contatore, `attivita_svolta_partita.volte`, per tutte le attività (R10-05); `turno_partita` resta il **dettaglio** dei turni
  dei lavori (data, paga proposta) e non è più un secondo contatore.
### 3.5 Acquisti, yen, punti negozio (R10-08, R10-21, D8)
Acquisto: segna l'articolo e propone l'uscita; turno: propone l'entrata (`da_applicare` tipo `yen`); «Applica» muove `partita.yen` con un movimento
registrato (`utente.movimento_yen`, annullabile); senza conferma la proposta resta «in sospeso» (dubbio 5). Punti negozio: calcolati dagli acquisti
dove il programma del negozio li dà per spesa (`programma_punti_json`), a mano dove il gioco li dà per altro (oggi 0 righe).
### 3.6 Storico (R10-22)
Registro **derivato**: ogni effetto applicato e ogni cambio di stato scrive un evento con `voce_uid` (se viene dal diario) e il riferimento
all'effetto; l'annullamento **toglie** l'evento che aveva creato. I 1273 eventi di oggi restano come «storico importato» (dubbio 7), distinti nella
vista. Progressi mostra, per ogni fatto, la voce del diario che l'ha fatto scattare (link alla voce) e la correzione a mano (R10-26).
### 3.7 Cestino per tutto (R10-23)
Tipi nuovi: `voce-diario` (oggi `giornataService.ts:322-329` cancella per sempre, 409 se spuntata con effetti: ora va nel cestino con le sue spunte e il
registro degli effetti), `partita` (`partiteService.ts:148-158`), `persona-scorta`; luoghi, negozi, oggetti (L5, L7). «Rimossi» si unisce al cestino
(sezione «Nascosti dalla guida» in Impostazioni › Cestino; l'indirizzo `/guida/rimossi` porta lì).

## 4. Inviti nel diario (R10-11i…k, decisioni dell'utente)
- Tipo d'effetto `invito` (L6: `confidente_invito`, `invito_partita`): la spunta registra l'evento con `voce_uid`, togliendola si cancella **solo se**
  l'aveva scritto quella voce; il **gesto diretto** dalla pagina del Confidente o del posto (L6) registra lo stesso evento senza voce: voce e gesto non
  lo contano due volte (chiave primaria su partita + invito).
- **Nessuna voce nuova nel diario validato**: il 29/5 (Ryuji → Harajuku) è solo un evento, registrabile col gesto.
- **Le 8 voci nuove dopo il 06-01** (migrazione M10, da G-023, decisione dell'utente «aggiungile poi le rivedo insieme al resto»): 07-02 sera (messaggio
  di Ryuji), 07-03 giorno (Ryuji → Ichigaya), 07-28 sera (messaggio di Akechi), 07-29 giorno (Akechi → Shinagawa), 07-30 giorno (Makoto →
  Ikebukuro, con la condizione scritta: vedi sotto, G-028), 08-06 giorno (Ann → Santuario Meiji), 10-08 sera (messaggio di Futaba), 10-09 giorno (Futaba → Nakano). Ogni voce: testo e riferimenti di G-023
  (riferimento al Confidente), effetto `invito` verso la riga di `confidente_invito` (per i messaggi: nessun effetto, solo la nota «invito per domani»),
  `da_rivedere = 1`, `aggiunta_da = 'team'`, uid nuovo, **in fondo alla sua fascia** (ordine = massimo della fascia + 1: nessuna voce esistente
  rinumerata o spostata). Nella vista: chip «Da rivedere · aggiunta dal team» con «Rivista» (toglie il segno).
  Posizioni sulla copia 0440Z (Analisi dati `dati.md` §9.3), cioè l'ordine dentro la fascia:

  | Voce | Fascia | Ordine |
  |---|---|---|
  | 07-02 | sera | 1 |
  | 07-03 | giorno | 5 |
  | 07-28 | sera | 1 |
  | 07-29 | giorno | 1 |
  | **07-30** | giorno | **1** (dopo la sola voce di Ann, `39c7b4da…`) |
  | 08-06 | giorno | 0 |
  | 10-08 | sera | 0 |
  | 10-09 | giorno | 0 |

  **Giorni in conflitto** (due uscite nella stessa fascia): **07-03, 07-29 e 07-30**. L'invito è un'alternativa e la voce esistente non
  cambia. Il testo dell'invito lo dice («… in alternativa a …») e il conflitto è nell'elenco «Da rivedere».
- Verifica (R10-11j2): il diario 04-01..06-01 resta identico (255 voci sulla copia 0440Z, stessi uid); dopo il 06-01 esattamente 8 voci nuove, tutte «da rivedere».
- **Controllo dell'Esperto (G-028, 2026-10-20)**: 7 voci corrette; **errore sull'invito di Makoto del 30/7**: nel gioco arriva solo con il
  Palazzo di Futaba già completato (e Imperatore rango 1), ma sul percorso del diario (guida italiana) la piramide si completa il 3/8, quindi il
  30/7 l'invito non arriva. **Decisione del PM (2026-10-20, bacheca): resta la (a)**, coerente con la decisione dell'utente «aggiungile [tutte]…
  poi le rivedo»: la voce del 30/7 **c'è**, con la condizione scritta nel testo («… — solo se il Palazzo di Futaba è già completato») e
  `motivo_revisione` = «Sul percorso della guida la piramide si completa il 3/8: il 30/7 Makoto non invita (G-028)». La spunta registra l'invito
  solo con le condizioni vere (sotto). La proposta (b) dell'Esperto (niente voce, solo l'evento con le condizioni) va nell'elenco «Da rivedere»
  per l'utente (L11 R11-10c), con gli altri punti di G-028. I requisiti riletti che dicono «7 voci» (R6-08c3, R10-11j2) vanno riallineati:
  segnalato ad Analisi requisiti.
- **Caso «voce più gesto»** (R10-11k): si prova con Futaba 10-09 (Nakano); Makoto 30/7 si prova a parte con la partita di prova che ha
  concluso la piramide prima del 30/7 (spunta → invito registrato) e sul percorso del diario (spunta → «Non ancora possibile», effetto non
  registrato).
- **«Entra» e l'infiltrazione da aprire** (R10-28a, dalle decisioni del PM UX3-1 e UX3-4, L3 §4.2 e §4.4):
  - insieme confermato → la prima non completata dell'insieme;
  - insieme vuoto con proposta → la prima della proposta, con la riga «da confermare» se la proposta non è certa;
  - senza proposta → `in-corso`;
  - dalla metro senza parametro → la prima non completata.
  Verifiche: la voce del 20/5 apre «Disabilita i sistemi di sicurezza»; dalla metro, con Madarame al 99%, si apre l'infiltrazione in corso.
- **Riepilogo dell'«Esci»** (R10-28c): dice **concluso** (Tesoro + boss finale dichiarato, L4 §8.10 e §8.14) e quanto manca al **completato**
  («Mancano 15 oggetti permanenti per il 100%»). Dopo il concluso l'ingresso al Palazzo non si propone più («Entra» sparisce dal piano del giorno
  per quel Palazzo).
- **Voci aggiunte o corrette dal team** (R10-28d): tutte hanno `da_rivedere` e, se corrette, il testo precedente (L3 §1.4); nel diario validato
  nessuna; F4 08-03 dice «Camera della vacuità» (L3 §2.1.6 a).
- **Condizioni degli inviti** (G-028): ogni riga di `confidente_invito` porta le condizioni del gioco in una colonna nuova `condizioni_json`
  (valutatore unico di L6; L6 §1 la aggiunge): Ryuji 3/7 → Palazzo di Kaneshiro concluso + Temperanza rango 1; Akechi 29/7 → Diavolo rango 1;
  Makoto 30/7 → Palazzo di Futaba concluso + Imperatore rango 1; Ann 6/8 → Palazzo di Futaba concluso + Morte rango 1; Futaba 9/10 → Appeso
  rango 1; le altre righe dal registro. Un invito con le condizioni non vere si mostra «Non ancora possibile: <condizione>» e il gesto e la spunta
  non lo registrano (la spunta della voce resta, l'effetto no, con la nota). Test R10-11k: Makoto 30/7 con una partita di prova che ha
  completato la piramide prima del 30/7 → registrato; sul percorso del diario → «Non ancora possibile».

## 5. Navigazione di gioco
- **Oggi, un componente** (R10-24): `src/components/partita/Oggi.tsx` (al posto della composizione doppia in `HomePage.tsx:64, 138, 153` e
  `OggiPartita.tsx:28-51`), con lo stato della mappa in uno store (`oggiStore`) condiviso fra Home e Partita; la Home lo incorpora (stessa mappa, stesso
  centro), con `PageState` e `onGiorno` in entrambe.
- **Pannello della scheda sopra il diario** (R10-27): toccare un oggetto citato da una voce (Confidente, luogo, Palazzo/infiltrazione, libro, oggetto,
  attività) apre `PannelloScheda` (foglio dal basso su telefono, pannello laterale da 1024 px) con la pagina dell'oggetto in modo incorporato (le
  pagine di L5, L7, L8, L9 accettano `incorporata`) e lo stato di partita; l'indirizzo prende `?scheda=<tipo>/<chiave>` (indietro lo chiude); chiudendo
  si torna alla stessa voce **nella stessa posizione** (lo scorrimento del diario non cambia perché la pagina non cambia).
- **«Entra» ed «Esci»** (R10-28, segnalazione E): «Entra» sulla voce di un Palazzo apre `/guida/dungeon/<k>?infiltrazione=<prima non completata
  dell'insieme della voce o in corso>&da=diario&voce=<uid>` (L3); su una visita ai Memento il menù del Dedalo con `da=diario`. La scheda in modalità
  diario mostra **«Esci»**: torna a `/partita?scheda=oggi#voce-<uid>` e propone «Segna la voce fatta» con il **riepilogo** (voci segnate dopo l'«Entra»:
  permanenti e rigenerabili, catture, timbri). Una sola regola d'atterraggio (L6: `destinazionePalazzo`).
- **`?spillo=` evidenziato anche se non disponibile** (R10-28b): regola di L5 §2 (lo spillo chiesto si mostra con «Non disponibile adesso» e il motivo; gli
  altri restano nascosti). Verifica sulla base di Test no-reg: 66 voci con lo spillo evidenziato (49 + 17) e 9 senza spillo. Il caso «chiuso»
  si prova su un **luogo con un orario vero della guida** (Fioraio Sukebe, pin 210, di giorno), non su Untouchable, che dopo L5 non chiude
  più (G-032: «sera, gio/sab/dom» è la disponibilità di Iwai, L5 §1.2 passo 4).
- Suggerimenti (segnalazione D): le Doti si leggono dagli effetti strutturati, via la regex di `suggerimentiService.ts:22-33`.

## 6. API e DTO (principali)
- `AzionePercorsoDto` (1114-1149): `effetti: Array<{ ordine; tipo; chiave; nome; dati; origine }>`, `proposte: Array<…>` (aperte), `applicati: Array<{
  ordine; testo; annullabile }>` (cosa ha fatto la spunta, R10-37), `confidente?: { chiave; scelta?; punti?; passaggio? }` (i campi di §2.1), `validata`,
  `daRivedere`, `avvisi` (L9), `infiltrazioni` (L3).
- `PUT /api/compendio/voci/:uid/effetti` (modifica degli effetti della voce, con «Ripristina» per quelli `seed`); `GET /api/partite/:id/abbinamenti?area=&mese=`,
  `POST …/abbinamenti/conferma|scarta`; `GET`/`POST /api/partite/:id/da-applicare` (`applica`, `scarta`, in blocco); `GET /api/partite/:id/confidenti/:k/ricalcolo`
  e `POST …/ricalcolo/applica`; `POST /api/partite/:id/regali`; `PUT /api/partite/:id/giorno` (unica strada), `PUT /api/partite/:id/fascia`;
  `GET /api/partite/:id/persona-della-partita`; tipi del cestino nuovi.

## 7. Migrazioni
- **Gioco M10**: `voce_effetto` (266 dal `produce_json` + sicuri del §1.2), `proposta_effetto_voce`, colonna `validata` (= 1 sulle voci del 04-01..06-01, 255 sulla copia 0440Z;
  `da_rivedere`, `aggiunta_da`, `testo_precedente_json` già create da L3); le **8 voci** di G-023 dopo il 06-01 (uid nuovi, testi e riferimenti dell'Esperto); nessun'altra riga di `voce_giornata`
  cambia.
- **Partite**: `effetto_applicato` (vuota: nessun effetto riapplicato), `da_applicare` (le proposte delle spunte già date), `confidente_base_partita`
  (rango e punti di oggi), `movimento_yen`; letture: avanzamento portato al completo dove c'è `lettura_partita`; cestino delle partite con i tipi nuovi.
### Verifiche prima/dopo
| Misura | Atteso |
|---|---|
| voci del diario | **1006** sulla copia 0440Z = 997 + 1 di L3 (Kaneshiro 06-26) + 8 (dopo il 06-01, `da_rivedere`, compresa Makoto 07-30; Analisi dati contava 7 e quindi 1005 prima della decisione (a) del PM); spunte 342 (p1 240) invariate, storico `evento_partita` 1316 sulla base 0503Z (p1 977; +32 eventi «punto-dungeon» di Kamoshida rispetto alla 0440Z), impronta `ff3033cb…`; le 6 corrette da L3 invariate; le 255 del validato (copia 0440Z) identiche (impronta identica, `validata` esclusa) |
| effetti delle voci | 266 seed + sicuri (61 domande, 35 cruciverba, cumulativa) ; proposte: il resto del §1.2 |
| spunte | **342** invariate (p1 240, base 0503Z/0533Z); `effetto_applicato` vuota; `da_applicare` = proposte delle spunte già date |
| stati della partita | invariati riga per riga (dati §4), salvo l'avanzamento delle letture portato al completo (stato visibile uguale) |
| ranghi e punti dei Confidenti | invariati (base); il ricalcolo solo come «da verificare» |
| storico | **1316** righe invariate sulla base 0503Z/0533Z («importato»; erano 1273 sulla copia del 19/10) |

## 8. Piano dei test
### 8.1 BE
1. Motore: per ogni tipo d'effetto, spunta → stato; tolta → stato di prima (anche dopo un riavvio); `creato = 0` non si annulla; Doti sempre e solo
   proposte; yen proposti; `cruciverba-aperti` riapre esattamente i cruciverba che aveva segnato.
2. Caso del piano su una partita di prova: «Inizia a pulire» → `mansarda-pulita` e i requisiti che la chiedono; tolta → riaperta (R10-03); gli altri esempi
   (R10-04) con le proposte confermate.
3. Punti legame: ordine cronologico, eccedenza e «evento pronto», ranghi non a punti, moltiplicatori; ricalcolo da zero = passo per passo (test di
   proprietà su sequenze casuali); togliere una spunta in mezzo riassegna (R10-11c…f); la base della partita esistente non cambia e il ricalcolo è solo
   «da verificare» (R10-11h: Sojiro p1).
4. Giorno: le 6 strade passano da `impostaGiorno`; `PUT /partite/:id` con `dataGioco` → 400; giorno inesistente → 404 (R10-16).
5. Regalo unico; letture con un contatore e «completato» calcolato; turni con un contatore; punti negozio per spesa.
6. Inviti: voce e gesto lo stesso evento; togliere la spunta non cancella il gesto; le 8 voci nuove; Makoto 30/7 (voce o gesto) registrato solo con le condizioni vere (Futaba concluso, Imperatore R1), con una partita di prova che conclude la piramide prima del 30/7 (R6-08e) (date, fasce, in fondo alla fascia, `da_rivedere`);
   validato identico (R10-11j2, R10-11k).
7. Storico derivato con gli annullamenti; cestino per voce del diario (con spunte e registro), partita, Persona della scorta.
8. Migrazioni: conteggi del §7, idempotenza, impronta.
9. Test esistenti da allineare (app.md §6: «togliere la spunta non torna indietro», «le letture restano», «il conseguimento dice le Doti senza toccarle»
   cambiano attesa; non si cancellano).
### 8.2 FE
`Oggi.test.tsx` (nuovo, componente unico in Home e Partita), `GiornoGuida.test.tsx` (effetti applicati accanto alla voce, campi del Confidente, proposte,
chip «da rivedere» e «validata»), `DaApplicare.test.tsx`, `AbbinamentiDiario.test.tsx`, `PannelloScheda.test.tsx` (apre e richiude sulla stessa voce),
`ConfidentiPartita.test.tsx` (niente «Annulla ultimo» locale; regalo unico), `PersonaDellaPartita.test.tsx`, `CalendarioPage`/`RiepilogoPartita` (giorno
dalla strada unica), `DungeonDettaglioPage` («Esci» con riepilogo).
### 8.3 Funzionali
«Fatto quando»: ogni azione ha una regola sola da qualunque pagina (giorno, rango, regalo, registrazione, letture, turni) — provato dalle pagine diverse;
«Inizia a pulire» segna e riapre la mansarda (partita di prova); Progressi mostra la voce di ogni fatto. Inviti: Ikebukuro col gesto e con la voce del
07-30 (R10-11k). «Entra/Esci» su Madarame. Tutto con una **partita di prova** creata e poi eliminata (con il permesso dell'utente) e sulla copia della
partita reale (R10-34): esito voce per voce.
### 8.4 UX
Una giornata intera da Oggi dal telefono (R10-36): spunte, proposte accettate con un tocco, «Da applicare» che non interrompe; effetto visibile e
annullabile accanto alla voce (R10-37); elenco degli abbinamenti lavorabile (R10-38).
### 8.5 No-reg
Diario validato identico e funzionante come prima (spunte, effetti di prima, avanzamento del giorno, collegamenti: R10-29, R10-30); stati della partita
reale identici (R10-31); Kamoshida e Madarame con «Entra/Esci» e i segni come dopo L4 (R10-32); regole già scelte (R10-33).
### 8.6 Layout
Oggi (1366×657 e 1280×689: intestazione del giorno e prime voci nella prima schermata), pannello della scheda (foglio su telefono), Progressi, Persona
della partita, elenco degli abbinamenti, «Da applicare»: 1280, 768, 375, 1024×690; scroll annidati con confine evidente; bersagli ≥44 px.

## 9. Da approvare (scelta prudente applicata)
1. **Spunte già date**: nessun effetto applicato in silenzio; proposte in «Da applicare» (dubbio 2).
2. **Base dei Confidenti**: il motore riparte dallo stato di oggi; il ricalcolo dal diario è solo «da verificare» (R10-11h).
3. **Abbinamenti di trama, acquisti, attività, Velluto**: tutti proposte; le Velluto solo informative (dubbio 4).
4. **Messaggi della sera prima** fra le 8 voci nuove: voci senza effetto (l'invito è la voce dell'uscita).
5. **Lettura annullabile** togliendo la spunta: torna all'avanzamento di prima (segnalazione C).
6. **`PUT /partite/:id` non cambia più il giorno**: una strada sola.
7. **Storico vecchio** come «importato», non riscritto (dubbio 7).
