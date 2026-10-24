# R9-14/1 — le frasi da togliere dalle 30 attività, e la voce dell'11-19 (2026-10-24)

Sola lettura, nessun commit. Dati: copia di p5s `p5s-2026-10-23-1935Z` con tutte le migrazioni committate fino alla 196 (scratchpad); testi letti per intero dalla colonna `attivita.dettagli`. Codice: HEAD `9842b394`.

---

## 1. R9-14/1 — frase per frase

### 1.1 Regole usate

Una frase si toglie solo se **dice ciò che un dato strutturato della stessa attività già dice**, e il dato è letto dalla pagina: `costo`, `fascia`, `condizioni_json` (sblocco), `effetti_json` (Doti), `paga_yen`/`paga_massima`, `quiz_json`, `sede_chiave`, la disponibilità del Confidente. Tutto il resto resta come nota, anche se è prosa. Il testo di partenza di ogni frase è conservato in `dati_guida` (chiave `archivio-dettagli-attivita-l11`, con l'uid dell'attività e il testo intero di prima) prima di scrivere il nuovo `dettagli`.
Etichette di `dettagli`: «Come funziona» (costo, fascia, giorni, compagni), «Premi», «Altri effetti», «Note sulle Doti». Dove tolgo una riga intera, tolgo anche la sua etichetta; dove resta solo una parte, la nota si riscrive in una frase corta senza ripetere il numero.
**Le tre colonne di prosa** `altri_effetti`, `regole`, `premi` sono già dentro `dettagli` per intero (24, 15 e 14 attività): vanno in archivio con voce `FONTI_TOLTE`, come `quartiere.sblocco` (migrazione 188). La colonna `paga` (4 righe, «3.500 yen a turno (fino a 7.400…)») ripete `paga_yen` e `paga_massima` e va in archivio con le altre.

### 1.2 La categoria «videogioco»

Le sette attività `videogioco-*` hanno la stessa frase sui «Premi» e sulle condizioni. La proposta è scriverla **una sola volta** come nota della categoria, in un blocco `dati_guida` `note-categorie-attivita` (chiave `videogioco`), letto dalla pagina Attività sopra l'elenco dei videogiochi:

> «Completando un videogioco si ottiene una tessera scambiabile al negozio di retrogaming di Akihabara per accessori che potenziano abilità elementali specifiche.»

La seconda frase, «Richiede TV CRT (mansarda Leblanc, dal 18 aprile) e Set per retrogaming per poter giocare», **si toglie senza sostituirla**: è già la condizione strutturata di tutte e sette (`evento mansarda-pulita`, `articolo yumenoshima/famidrive`, `evento sistema-videogiochi-installato`, e la data).
Per ogni videogioco resta una nota di una riga sui livelli (vedi tabella).
Nota: `src/pages/VideogiochiPage.tsx:76` mostra anche un proprio `dettagli` della tabella `videogioco`: non l'ho letto, va controllato se ripete le stesse due frasi.

### 1.3 Tabella (30 attività)

«**Resta**» = nota che rimane; «**Toglie**» = parte che sparisce. Dove scrivo «nessuna modifica», `dettagli` è già solo contesto.

| # | Attività | Frase | Dato strutturato che la ripete | Si toglie · resta come nota |
|---|---|---|---|---|
| 1 | freccette | «Ogni sessione costa 800 yen» | `costo` = 800 | **Toglie** «costa 800 yen». **Resta** «Comprende due partite (modalità 301/501/701); la difficoltà varia con il rango Staffetta del compagno» |
| 1 | freccette | «Perizia: 1 nota base per sessione; fino a 3 note completando modalità/sfide speciali» | `effetti_json` Perizia 1 | **Toglie** «1 nota base per sessione». **Resta** «Fino a 3 note completando le modalità e le sfide speciali» |
| 1 | freccette | «Premi: trofeo…», «Altri effetti: rango Staffetta…» | — | **Resta** per intero (non strutturati) |
| 2 | biliardo | «Come funziona», «Premi», «Altri effetti», «Note sulle Doti: Dote casuale fra quattro» | — (`costo` 800 non è nel testo; `effetti_json` vuoto) | nessuna modifica: la Dote casuale non si può strutturare |
| 3 | pesca-ichigaya | «Il beneficio osservato è 1 nota (2 punti interni base); Fortuna confermata porta a 3. Con Fortuna ignota l'intervallo è 2–3» | la regola di pesca (`beneficioPerizia`: 1 nota, 2 punti base, bonus Fortuna 1) | **Toglie** quella frase. **Resta** «La visita si registra una volta sola. Una cattura non prova il riconoscimento finale: riscossione seguita da ripresa e uscita senza nuova riscossione può non dare Perizia» |
| 4 | sfida-pesca-guardiano-ichigaya | tutto il testo | — | nessuna modifica (contesto: ingresso, profili, ranghi 4 e 5, turni storici) |
| 5 | jazz-club-kichijoji | «Ingresso serale a 3.000 yen» | `costo` = 3000; `fascia` = sera | **Toglie** quella parte. **Resta** «Frequentarlo regolarmente sottrae tempo ad altri Confidenti (per esempio Kawakami)» |
| 5 | jazz-club-kichijoji | «Premi: versione vocale di “No More What Ifs”…», «Altri effetti: cocktail per giorno…» | — | **Resta** per intero (il cocktail del giorno non è strutturato) |
| 6 | bagno-pubblico-yongen-jaya | «Attività serale; nessun costo indicato dalle fonti consultate» | `fascia` = sera; `costo` vuoto | **Toglie** l'intera riga «Come funziona» |
| 6 | bagno-pubblico-yongen-jaya | «Fascino: Bagno normale: punti Fascino (fonte secondaria; valore esatto…)»; «Fascino: Lunedì e giovedì: bagno medicinale con punto aggiuntivo» | due righe generiche, già superate dalla frase «Effetti sul Fascino non strutturati: le fonti Royal discordano (+2 con +1 il lunedì e il giovedì; «+2 o +3»; +1 Coraggio con la pioggia)» | **Toglie** le due righe «Note sulle Doti». **Resta** la frase delle fonti discordanti, più «Il lunedì e il giovedì il bagno medicinale dà un punto in più» |
| 6 | bagno-pubblico-yongen-jaya | «Premi: Trofeo…», «Altri effetti: pioggia, prolungare la permanenza…» | — | **Resta** |
| 7 | centro-battute-yongen-jaya | «Altri effetti: … Beginner 70 km/h (500 yen), Intermediate 90 km/h (1.000 yen), Advanced 130 km/h (3.000 yen)…» | `costo` = 500 (solo il primo prezzo) | **Resta** (gli altri due prezzi non sono strutturati); nessuna modifica |
| 7 | centro-battute-yongen-jaya | «Perizia: Completare il minigioco aumenta la Perizia; numero di note non specificato dalla fonte secondaria» | è sostituita dalla frase già presente «Effetti sulla Perizia non strutturati: il valore dipende dal risultato della sessione (+1 per colpo riuscito)» | **Toglie** la riga vecchia. **Resta** la frase nuova |
| 8 | sala-giochi-gun-about-akihabara | «Shinya è presente all'arcade il lunedì, martedì e giovedì pomeriggio dopo scuola» | disponibilità strutturata di Shinya (giorni lun, mar, gio; fascia giorno) | **Toglie** la riga «Come funziona». **Resta** «Il Confidente della Torre (Shinya) potenzia l'uso delle armi da fuoco nei combattimenti» e «Non è stato possibile confermare se Gun About assegni punti a una Dote fuori dalle scene di Shinya» |
| 9 | allenamento-camera-leblanc | «Gratuito, disponibile la sera in mansarda» | `costo` = 0; `fascia` = sera; `sede_chiave` | **Toglie** l'intera riga. **Resta** la tabella degli HP per visita («visite 1-4 = +5 HP…») e «In Royal i bonus si mantengono in Nuova Partita+» |
| 10 | allenamento-palestra-protein-lovers | «2.000 yen a visita» | `costo` = 2000 | **Toglie** l'intera riga «Come funziona». **Resta** «Premio “La leggenda del Drago Nascente” nel Covo dei Ladri», la tabella di HP e SP per visita, il paragrafo sulle proteine, e «Condizione di sblocco non confermata…» |
| 10 | allenamento-palestra-protein-lovers | «Frullato proteico 2.000 yen… Frullato iperproteico 4.500 yen… Proteine d'importazione 8.000 yen» | i prezzi degli articoli nel negozio (da collegare) | **Resta** per ora; segnalo che sono prezzi copiati e vanno sostituiti da un collegamento agli articoli, in un passo a parte |
| 11 | studio-leblanc | «Conoscenza: 2 punti in condizioni normali, 3 nei giorni di pioggia» | `effetti_json`: Conoscenza 2 senza pioggia, 3 con pioggia | **Toglie** i numeri. **Resta** «Valori riportati come “punti”: la conversione in note non è confermata (fonte secondaria)» |
| 12 | studio-biblioteca-scuola | «1 punto Conoscenza, con possibile punto bonus di Coraggio; efficacia ridotta prima della sconfitta di Kamoshida» | `effetti_json`: Conoscenza 1 | **Toglie** «1 punto Conoscenza». **Resta** «Possibile punto bonus di Coraggio; efficacia ridotta prima della sconfitta di Kamoshida (fonte secondaria)» |
| 13 | studio-diner-shibuya | «Conoscenza: 2 punti, 3 nei giorni di pioggia» | `effetti_json`: Conoscenza 2 / 3 con pioggia | **Toglie** la riga «Note sulle Doti». **Resta** «Altri effetti: i piatti specifici (Bistecca nostalgica → Gentilezza; Caffè bollente → Coraggio; Frui-te → Fascino; Sandwich a sorpresa → Coraggio, lentamente)» |
| 14 | lettura-metropolitana | «Altri effetti: se seduto, leggere in metropolitana non consuma tempo…»; «Sede: nessuna…» | — | nessuna modifica |
| 15 | caffe-leblanc | «Fascino: Usare il sifone del caffè genera punti Fascino» | `effetti_json`: Fascino 1 con Confidente Sojiro rango 2 | **Toglie** «genera punti Fascino». **Resta** «Interagire con il bancone/sifone a sinistra del locale» e «Preparare un caffè è necessario per avviare il rango 3 del Confidente di Sojiro» |
| 16 | curry-leblanc | «Si esamina il frigorifero…; disponibile domenica, lunedì, mercoledì e venerdì»; «Altri effetti: il curry si consuma come oggetto…» | i giorni non sono strutturati altrove (`fascia` sì, i giorni no) | nessuna modifica; da strutturare i giorni in un passo a parte |
| 17 | tempio-vecchio-kichijoji | «Gratuito, disponibile di giorno» | `costo` = 0; `fascia` = giorno | **Toglie** l'intera riga. **Resta** «Premi: Trofeo “A Serene Experience”» e «Altri effetti: SP massimo 3 le prime volte, +3 ogni 3 meditazioni, fino a 12» |
| 18 | sfida-big-bang-burger | «Ogni tentativo costa circa 1.500 yen» | `costo` = 1500 | **Toglie** «costa circa 1.500 yen». **Resta** «Costi e soglie possono variare tra le tre sfide (dato non confermato)» |
| 18 | sfida-big-bang-burger | «Coraggio: +1 nota (Comet Burger) fino a +3 (Cosmo Town Burger); Conoscenza e Perizia: stesso schema» | `effetti_json` vuoto: nessun dato strutturato | **Resta** per intero (la struttura di questi effetti è del lavoro R9-10/2) |
| 19 | esperimenti-clinici-takemi | tutto il testo | — | nessuna modifica (rinvia alla scheda di Takemi; l'effetto Coraggio +1 è strutturato e non è ripetuto) |
| 20 | videogioco-star-forneus | «Premi: tessera scambiabile…»; «Richiede TV CRT… Set per retrogaming» | prima frase: nota di categoria (§1.2); seconda: `condizioni_json` | **Toglie** tutte e due. «Coraggio: 2 note per livello, su 3 livelli» → **Toglie** «2 note per livello» (`effetti_json` Coraggio 2). **Resta** «Tre livelli» |
| 21 | videogioco-gambla-goemon | come sopra | come sopra | **Toglie** le due frasi comuni e «2 note per livello» (Fascino 2). **Resta** «Due livelli» |
| 22 | videogioco-punch-ouch | come sopra | come sopra | **Toglie** come sopra (Fascino 2). **Resta** «Tre livelli» |
| 23 | videogioco-train-of-life | come sopra | come sopra | **Toglie** come sopra (Gentilezza 2). **Resta** «Tre livelli» |
| 24 | videogioco-power-intuition | come sopra | come sopra | **Toglie** come sopra (Coraggio 2). **Resta** «Tre livelli» |
| 25 | videogioco-golfer-sarutahiko | come sopra | come sopra | **Toglie** come sopra (Perizia 2). **Resta** «Tre livelli» |
| 26 | videogioco-featherman-seeker | come sopra | come sopra | **Toglie** come sopra (Conoscenza 2). **Resta** «Tre livelli» |
| 27 | lavoro-triple-seven | «Turni diurni, nessun requisito» | `fascia` = giorno; `condizioni_json` vuota | **Toglie** quella parte. **Resta** «Compagni incontrabili al lavoro: Haru, Yoshizawa, Makoto, Mishima, Yusuke, Ann, Ryuji» |
| 27 | lavoro-triple-seven | «Quiz a memoria sui codici a barre il 7, 17 e 27 del mese; superarlo perfettamente aumenta la paga» | `quiz_json` (giorni del mese e premi) e `paga_yen`/`paga_massima` (3.500–7.400) | **Toglie** l'intera riga «Altri effetti» (il quiz è strutturato, e ha la sua pagina) |
| 27 | lavoro-triple-seven | «Fascino: +2 punti a turno (fonte secondaria; valore non confermato in note…)» | `effetti_json`: Fascino 2 (turno e ripetuto) | **Toglie** «+2 punti a turno». **Resta** «Valore non confermato in note sulla guida italiana, che ne conferma solo la presenza» |
| 28 | lavoro-rafflesia | «Solo turni diurni» | `fascia` = giorno | **Toglie** quella parte. **Resta** «Compagni: Yusuke (giorni dispari), Haru (giorni pari)» |
| 28 | lavoro-rafflesia | «Gentilezza: +2 punti a turno» | `effetti_json`: Gentilezza 2 | **Toglie** la riga «Note sulle Doti» per intero. **Resta** «Altri effetti: mercoledì e sabato, bouquet personalizzati…» |
| 29 | lavoro-ore-no-beko | «Solo turni serali, nessun requisito» | `fascia` = sera; condizioni vuote | **Toglie** quella parte. **Resta** «Compagni: Ryuji (giorni dispari), Yoshida (giorni pari)» |
| 29 | lavoro-ore-no-beko | «Perizia: +2 punti a turno» | `effetti_json`: Perizia 2 | **Toglie** la riga. **Resta** «Altri effetti: quiz a memoria sugli ordini dei clienti» |
| 30 | lavoro-crossroads | «Solo turni serali» | `fascia` = sera | **Toglie** l'intera riga «Come funziona». **Resta** «Altri effetti: la domenica un punto bonus in una Dote a scelta con i clienti al bancone (Coraggio, Perizia, Fascino; la Conoscenza non risulta); gestito da Lala Escargot» |
| 30 | lavoro-crossroads | «Gentilezza: +2 punti a turno, invariato anche di domenica» | `effetti_json`: Gentilezza 2; `paga_yen`/`paga_massima` 7.200–12.000 | **Toglie** «+2 punti a turno». **Resta** «Invariato anche di domenica» (la paga di domenica non è strutturata: 12.000 è il massimo) |

**Conteggio.** Su 30 attività, **25 hanno almeno una frase da togliere** (le altre cinque — biliardo, sfida-pesca-guardiano-ichigaya, lettura-metropolitana, curry-leblanc, esperimenti-clinici-takemi — non ripetono nulla). Le frasi da togliere sono di quattro famiglie: le **7 coppie di frasi identiche** dei videogiochi (la prima passa alla nota di categoria, la seconda sparisce perché è la condizione strutturata); le frasi che ripetono `costo`, `fascia` o la condizione (freccette, jazz-club, bagno, camera, palestra, tempio, Big Bang, i quattro lavori); le righe «Note sulle Doti» che ripetono i valori di `effetti_json` (freccette, tre studi, caffè, i quattro lavori, i sette videogiochi, bagno e centro battute); e tre righe isolate (la regola di pesca, il quiz del Triple Seven, i giorni di Shinya). Non ho contato le frasi una per una: i numeri esatti vengono dalla tabella.

### 1.4 Cosa serve a BE

- Una migrazione di sola riscrittura di `dettagli` (nessuna colonna tolta in questo passo) con guardia sul testo attuale di ogni attività (se l'utente l'ha modificato dopo la copia, la riga si salta senza errore), archivio del testo di prima, impronta delle altre colonne invariate.
- Le tre colonne di prosa (`altri_effetti`, `regole`, `premi`) e `paga` vanno in archivio in un secondo passo, con voce `FONTI_TOLTE`, dopo aver verificato che nessun lettore le usi (oggi la pagina Attività non le legge).
- Un posto per la nota di categoria (blocco `dati_guida` `note-categorie-attivita`) e il suo lettore nella pagina Attività.

### 1.5 Rischi e domande

- **«Resta» è un giudizio mio:** la riga delle Doti per freccette («fino a 3 note») e le righe del bagno sono sul bordo; se per l'utente un numero ripetuto è comunque utile da leggere, la regola si può restringere ai soli `costo`, `fascia` e condizioni.
- **Domanda per l'utente (una riga):** «Le note delle Doti come “+2 punti a turno” le togliamo del tutto dal testo, perché la pagina le mostra già dagli effetti?»

---

## 2. La voce dell'11-19 (`589d82e8…`, `da_rivedere = 1`)

### 2.1 Com'è in p5s

| Campo | Valore |
|---|---|
| Giorno e fascia | 11-19, giorno, ordine 0 |
| Tipo e riferimento | `palazzo`; `dungeon:niijima` («Palazzo di Sae Niijima») |
| Testo | «Palazzo di Sae Niijima: battaglia contro l'Ombra di Sae (fase della roulette truccata), poi Sae Leviathan (attacchi elementali, resistente all'elemento corrente), **Moloch (debole al Ghiaccio) e battaglia finale con Kasumi**» |
| Segno | `da_rivedere = 1`, `motivo_revisione` vuoto; nel registro dell'Esperto è N3, «= (uguale)», certezza **media** («contenuto letto in sintesi», sett. 31) |
| Effetti e legami | nessun effetto; nessun legame con infiltrazioni; nessuna spunta |

### 2.2 Che cosa dicono le fonti

**Pin del Palazzo (la guida italiana nell'app).** La stanza «Direzione – sala del boss» ha due voci boss: `niijima-14-direzione-sala-del-boss/0` «Ombra di Sae Niijima — Fase 1» (livello 52, 65.535 PV; la ruota della roulette; Sae bara con una lastra di vetro: non attaccare mentre la ruota gira, perché i PV scendono a 1) e `…/1` «Sae Niijima Leviathan — Fase 2» (livello 53, 8.000 PV; a ogni turno la ruota assegna un elemento e la debolezza è quella opposta; nella seconda metà è forte contro tutto tranne il Divino). `dungeon.voce_boss_finale` è proprio la Fase 2.
**Moloch** nel Palazzo di Niijima non compare in nessun pin; compare come Persona di Iweleth («Custode del rogo sacrificale», **assorbe il Fuoco**) e come maschera di due Ombre dei Memento. **Kasumi** non compare in nessun pin del Palazzo di Niijima.

**Fonti Royal in inglese** (Samurai Gamers: guida Royal del Palazzo, guida del boss, elenco dei boss, walkthrough di novembre). Il boss è **uno solo, «Shadow Niijima (Leviathan)»**: una fase di roulette («Roulette Time» avvia la roulette; «Penalty» porta i PV a uno durante la roulette; durante la fase di gioco non bisogna attaccare né debuffare) seguita dal combattimento, con un limite di tempo; nella tabella dei boss Royal compaiono «Shadow Sae» e «Niijima Leviathan». **Nessuna pagina menziona Moloch né Kasumi** in questo combattimento; la squadra del 19/11 è elencata solo con i nomi in codice (Joker, Fox, Queen, Noir). Nessuna fonte dà una debolezza fissa del boss (le tabelle hanno «–»); la strategia del walkthrough è contro-attacco e attacchi fisici/da fuoco. Il walkthrough di novembre è la «Second Edition» sulla versione giapponese. Kasumi entra nel gruppo molto dopo (terzo semestre), quindi non è nella battaglia del 19/11.

### 2.3 Correzione proposta

La parte «Moloch (debole al Ghiaccio) e battaglia finale con Kasumi» non è sostenuta né dalle fonti Royal né dai pin della stessa guida italiana (Moloch assorbe il Fuoco, ed è di Iweleth); va **tolta**. Il resto è confermato (fase 1 con la roulette truccata, poi Leviathan con l'elemento che cambia).

- **Testo proposto:** «Palazzo di Sae Niijima: battaglia contro l'Ombra di Sae (fase della roulette truccata), poi Sae Leviathan (a ogni turno la roulette assegna un elemento: attacca con quello opposto)»
- Il resto invariato: tipo `palazzo`, riferimento `dungeon:niijima`, data, fascia, ordine, nessun effetto.
- Il testo di prima in `testo_precedente_json`; guardia sul testo attuale.
- `da_rivedere = 0` con la migrazione M-A (D1), perché la voce ora coincide con le fonti.
- Un'osservazione (a parte): se si vuole la forma più vicina al Royal inglese, «Shadow Sae, poi Niijima Leviathan», ma l'italiano usa «Ombra di Sae» e «Sae Niijima Leviathan», e i due pin del Palazzo hanno già questi nomi.

**Certezza.** Alta per la rimozione di Moloch e Kasumi (nessuna fonte, e contraddice un pin); media per la forma esatta della frase finale (le fonti Royal non descrivono come la roulette assegni l'elemento: viene dal pin italiano).
**Domanda per l'utente (una riga):** «Togliamo da quella voce Moloch e la battaglia con Kasumi, che nessuna fonte conferma?»

---

## 3. Limiti

- Non ho eseguito migrazioni né test. Le frasi sono lette sui dati della copia con le migrazioni fino alla 196; se BE ha cambiato `dettagli` dopo, la guardia sul testo attuale salta le righe diverse.
- Per le attività non ho confrontato ogni numero con una fonte Royal: R9-14/1 chiede di togliere le ripetizioni di dati già presenti, non di verificarli. Per il bagno e il centro battute le fonti discordano e la nota resta.
- Per Moloch e Kasumi le fonti Royal sono in inglese e quasi tutte dello stesso sito; il walkthrough di novembre è la «Second Edition» sulla versione giapponese.
