# L9 «Confidenti, attività, calendario» — analisi dati

Analisi dati, 2026-10-20. Sola lettura sulla copia di produzione `…\cffd8da6-…\scratchpad\prod-20261020\` e su `data/` (dev).
Script e uscite (scratchpad `…\161706c7-6e2c-47d6-bdb7-618347ce218c\scratchpad\`): `l9.cjs` → `l9-prod.json` / `l9-dev.json` (**identici**).
Giorno della settimana calcolato con l'anno di gioco (aprile–dicembre 2016, gennaio–marzo 2017: il 9 aprile è sabato, come in `giorno_calendario`).
Requisiti: `lotti/L9/requisiti.md`. Risposte dell'Esperto già usate: G-016a (meteo), G-016b (Kawakami, Yusuke), G-016c (esami), G-016d (4 senza luogo), G-017 (date).
**Uid sempre completi** (richiesta del PM).

## 1. Confidenti
### 1.1 Disponibilità (`confidente_disponibilita`, 23 righe)
- **Giorni della settimana validi** (dopo aver tolto accenti e maiuscole: «Lunedì»/«Lunedi»): **13** Confidenti. **In prosa o con date** al posto dei giorni: **8**
  — igor e morgana (elenco di date di trama), makoto, haru, yusuke, futaba («Legato a date fisse di trama: …»), ryuji (frase), gemelle («Sempre
  accessibile…»). **Vuoti**: sae, kasumi.
- Fasce riconoscibili («giorno/sera/notte» in testa alla frase): 19; le altre sono frasi.
- Yusuke: `giorni_json` contiene le date dell'itinerario, non la disponibilità (G-016b: tutti i giorni di giorno al Sottopasso; ranghi 4/6/9 non con
  la pioggia) → da correggere. Kawakami: oggi venerdì e sabato sera (coerente con G-016b).
- **Senza luogo** (nessun `luogo.confidenti_json` li cita): igor, gemelle, sae, morgana — G-016d: restano senza luogo con motivo (trama automatica /
  Stanza di Velluto; le Gemelle con l'accesso dal cancello vicino al Negozio Softair).
### 1.2 Voci del diario d'incontro fuori giorno o fascia (R9-03)
296 voci con `riferimento_tipo='confidente'` (51 nel diario validato). Valutabili: 161 per il giorno (Confidenti con giorni validi), 260 per la fascia.
- **Fuori giorno: 27** (6 nel validato) — piano: 25. Kawakami 14 (martedì/mercoledì/giovedì/domenica/lunedì: con G-016b «ven/sab sera dal Leblanc» sono **voci da
  rivedere**, non dati sbagliati del Confidente), Yoshida 4, Ann 4, Iwai 2, Maruki, Shinya, Sojiro 1. Esempi nel validato:
  05-09 (lunedì) yoshida `21884ede0c011dee7ebfff5917c8642b`; 05-10 (martedì) yoshida `39965e251eb93ff3da77b9e0c67bd556`; 05-21 (sabato) ann
  `a920c1bb939c24a23d598b7dcdd8ff9f` e `450615930d64d4d13c7ce8bcde74b8ba`; 05-26 (giovedì) ann `3db7636b34a050c0eec2f987a5ec1b41`; 04-27 (mercoledì) sojiro
  `20449887b636d5a3168b14cb8c1ea7d9`. Elenco completo con uid in `l9-prod.json` (`fuoriGiornoElenco`).
- **Fuori fascia: 48** (10 nel validato) — piano: 13. Gran parte è Igor (fascia «notte, in sogno» contro voci «sera/giorno») e le frasi «giorno;
  anche sera con la pioggia» (Ann): la fascia strutturata deve prevedere le **eccezioni** (pioggia, rango). Elenco in `fuoriFasciaElenco`.
- Regola (dubbio 7): solo avviso, nessuno spostamento di voci; le 6 + 10 voci del validato restano intatte.
### 1.3 Nomi (R9-05, R9-06)
- «**Junichi** Iwai» compare in 2 testi: `evento_calendario.titolo` (1) e `settimana_guida.riassunto` (1); il Confidente si chiama già «Munehisa Iwai».
- Voci del diario con `riferimento_testo`: 289; nella forma «Nome - Arcano» 278 (coerente col Confidente). **Nome diverso dal Confidente: 39** (6 nel
  validato): Yoshida «Yoshida - Sole» ×12; Kasumi «Sumire Yoshizawa - Fede» ×10 (spoiler voluto dalla guida?), «Dungeon del risveglio di Kasumi» ×1;
  Makoto «Palazzo di Sae Niijima» ×5; takemi «Clinica Takemi» ×4; gemelle «Gemelle Custodi - Forza» ×2; **igor** «Gemelle Custodi - Forza» ×2,
  «Gemelli Custodi - Forza» ×1, «Lavenza - Il Matto» ×1 (**riferimento al Confidente sbagliato**: voci delle Gemelle/Lavenza legate a Igor); maruki
  «Palazzo sconosciuto (Maruki)» ×1. Le voci con `riferimento_chiave` sbagliato (igor ×3) vanno nell'elenco da approvare (cambiare il riferimento
  tocca la voce: solo con sì; se nel validato, mai senza sì).
### 1.4 Ranghi, abilità, Doti, dialoghi (R9-07, R9-08)
- `confidente_rango` 162 = 18 Confidenti × 9 (punti necessari); `confidente_abilita` 159; `confidente_dote_incontro` 38.
- `confidente_dialogo` 223, **scelte 812** (piano 812), **284 senza punti numerici** (piano 293; campi della scelta: ordine, testo, punti, puntiTesto,
  romantica, avviso: la differenza sono scelte con `puntiTesto`).
- Formula dei punti / esami: G-016c (6 Confidenti) — regola di codice, non di dati.
### 1.5 Data di sblocco
Vedi `lotti/L6/dati.md` §6 e §8 (requisito del rango 1: Ohya 06-18 → 07-05, Tae 04-15 → 04-18, decisioni e G-017).

## 2. Attività (30) (R9-10…R9-14)
- Tipi: videogioco 7, mini-gioco 6, lavoro 4, studio 3, altro 3, sfida 2, allenamento 2, cibo 2, lettura 1. `sede_chiave` 29/30 (L5).
- Doti: `doti_json` su 23, `effetti_json` (strutturati) su **14**. **Senza Doti né effetti: 7** — sfida-pesca-guardiano-ichigaya, jazz-club-kichijoji,
  allenamento-camera-leblanc, allenamento-palestra-protein-lovers, lettura-metropolitana, curry-leblanc, tempio-vecchio-kichijoji: sono le «7 attività
  che non registrano nulla» del piano. Altre 9 hanno `doti_json` in prosa ma nessun effetto strutturato (es. biliardo: «incremento casuale»).
- Paga: i 4 lavori hanno frase, `paga_yen` e `paga_massima` (Triple Seven 3.500/7.400, Rafflesia 3.200/7.800, Ore no Beko 3.600/8.800, Crossroads
  7.200/12.000): i valori strutturati ci sono già; il «0/4» del piano riguarda le copie fuori dall'attività (diario, turno: Analisi app).
- Quiz: `lavoro-triple-seven.quiz_json` con i giorni 7, 17, 27 (una sola copia nei dati dell'attività).

## 3. Calendario (R9-15…R9-23)
- `giorno_calendario` e `giorno_percorso`: **346 + 346**, stesse date (0 in una sola).
- Meteo: come testo diverso in 287 giorni, ma per **formato** (il percorso ha il meteo solo in 12 giorni: «pioggia» 10, «neve» 1, «possibile pioggia» 1;
  il calendario ha due fasce «Pioggia/Sereno», note «(notte torrida)» ecc.). **Divergenza vera: 1** — 05-24 calendario «Nuvoloso», percorso «possibile
  pioggia» (G-016a: da approvare). Regola: giorno unico con meteo in due fasce dal calendario.
- Giorno della settimana: calendario «Sabato…», percorso «sab…»; **0 errati** rispetto alla data → si calcola e non si salva.
- `allerta_meteo` 74; `settimana_guida` 42.
- `evento_calendario` **173**: storia 61, sblocco 46, festa 24, scadenza 18, vacanza 11, esame 8, meteo 4, consiglio 1; 27 citano un Palazzo nel titolo.
  **Madarame: 3 scadenze** (05-18 «entro il 5 giugno», 05-31 lettera di sfida, 06-05 ultimo giorno) — come il piano.

## 4. Esami, domande, cruciverba
- `esame` 4 (date di 3 giorni ciascuno), `domande_json` **31 domande**; `domanda` 78 (classe 55, tv 11, esame-medio 6, esame-finale 6).
  Le **31** domande degli esami cadono tutte in giorni che hanno **una** riga «Serie di domande…» nella tabella `domanda` (12 righe d'esame, una per
  giorno): sono la stessa cosa a due granularità (le «31 doppie» del piano). Regola (dubbio 2): tenere le 31 domande puntuali (con data e
  risposta) in `domanda`; le 12 righe riassuntive diventano note dell'esame.
- Diario: 74 voci di domanda/esame; **domande senza voce nel loro giorno 7**, **voci senza domanda 5** (piano: 7 e 4).
- Cruciverba 38, voci del diario 36: **senza voce 5**, **voci senza cruciverba 3** (piano: 5 e 3).

## 5. Stato della partita (R9-25…R9-27, da non toccare)
confidente_partita p1 23 / p2 23; incontro_confidente_partita p1 35 / p2 15; requisito_partita 0; turno_partita p1 9 / p2 2; attivita_svolta_partita
p1 6 / p2 2; meteo_partita p2 1; domanda_partita p1 6 / p2 6; cruciverba_partita p1 1 / p2 2; dote_sociale_partita p1 5 / p2 5; evento_storia_partita
p1 4 / p2 3.

## 6. Regole di migrazione proposte
1. **Disponibilità strutturata**: `giorni` (nomi canonici) e `fasce` per i 13 con giorni validi (normalizzazione di accenti e maiuscole: nessun cambio
   di significato); per gli 8 in prosa/date: «date di trama» o «automatico» come tipo di disponibilità + nota (elenco); Yusuke secondo G-016b; Kawakami
   invariato; luogo per chiave (L5) dove c'è, «senza luogo + motivo» per i 4 (G-016d). Eccezioni di fascia (pioggia, rango) come condizioni (L6).
2. **Diario**: nessuna voce modificata; avvisi calcolati (27 fuori giorno, 48 fuori fascia, prima delle correzioni della disponibilità); i 3
   `riferimento_chiave='igor'` delle voci Gemelle/Lavenza in elenco da approvare.
3. **Nomi**: «Junichi» → «Munehisa» nei 2 testi (elenco); il nome nel diario si mostra dal Confidente (il testo della voce non cambia).
4. **Attività**: effetti strutturati per le 7 senza nulla e per le 9 con sola prosa, da elenco con i valori della guida (Esperto); paga già strutturata.
5. **Giorno unico**: fusione delle due tabelle sulla data; meteo dal calendario (due fasce), 05-24 da approvare; trama/vincoli/azioni dal percorso;
   giorno della settimana calcolato.
6. **Eventi del calendario**: 173 → voci di tipo evento/sblocco/scadenza collegate per chiave (Palazzo, quartiere, Confidente) dove il titolo lo
   permette; Madarame: una scadenza (06-05) + la lettera (05-31) come evento; le altre senza collegamento restano voci evento.
7. **Esami**: 31 domande puntuali in `domanda`; le 12 righe riassuntive → note. Domande e cruciverba senza voce: voci nuove solo da elenco.

## 7. Conteggi attesi dopo
| Voce | Atteso |
|---|---|
| giorni | 346 (una tabella) ; meteo divergenti 0 (05-24 deciso) |
| Confidenti con disponibilità strutturata | 23 (13 settimanali, 8 «trama/automatico», 2 da completare: sae, kasumi) |
| voci del diario | invariate (996); diario 04-01..06-01 identico: impronta `1a71b030…bc4c` |
| attività senza effetti strutturati | 0 dopo l'elenco (oggi 7 + 9) |
| domande | 78 → 78 − 12 riassuntive + 31 puntuali = **97** (da elenco) |
| stato della partita | invariato (righe del §5) |

## 8. Rimisura sulla copia fresca di produzione (`dati-produzione/2026-10-20-0440Z/`, 2026-10-20)
Sola lettura; script `l9.cjs` (uscita `l9-0440Z.json` nel mio scratchpad), confronto con la copia di produzione precedente. Tutte le differenze vengono da **lavoro
dell'utente** del 19/10 sera: la nuova voce del 06-01 sera, Igor, `9b4f62e2f6694fd5af10a407a455d546`, e i due incontri registrati.
| Cifra | Prima | Copia 0440Z | Dove |
|---|---:|---:|---|
| voci con `riferimento_tipo='confidente'` | 296 | **297** | §1.2 |
| … di cui nel diario validato | 51 | **52** | §1.2 |
| valutabili per la fascia | 260 | **261** | §1.2 |
| **fuori fascia** | 48 | **49** | §1.2, §6.2 |
| … di cui nel validato | 10 | **11** | §1.2, §6.2: la voce nuova è «06-01 sera igor (fasce notte)», `9b4f62e2f6694fd5af10a407a455d546` |
| fuori giorno | 27 (6 nel validato) | 27 (6) | invariato |
| `incontro_confidente_partita` | p1 35 / p2 15 | **p1 37** / p2 15 | §5 |
| voci del diario | 996 | **997** | §7 |
Il resto di §1–§5 non cambia: disponibilità, attività, calendario, esami, domande, cruciverba e le altre righe del §5.
- La voce di Igor nuova è un altro caso del tipo già descritto (Igor «notte, in sogno» contro una voce «sera»). Regola invariata (dubbio 7): **solo avviso**, la voce
  resta intatta. Le voci del validato da non toccare sono ora 6 + **11**.
- Righe del §7 da leggere così:
  - voci del diario: **997** sulla copia 0440Z. Con L3 (+1, Kaneshiro 06-26) e L10 (+8 inviti, G-028 strada (a), decisione del PM) diventano **1006**; nessuna è del validato;
  - diario 04-01..06-01 identico, con impronta `bbd9de5d7833f0f9…` (`impronta-0440Z.json`, L4 §11.7) al posto di `1a71b030…bc4c`;
  - stato della partita: le righe del §5 con p1 37 incontri.
- **Base p5s** (`dati-produzione/p5s-2026-10-20-0503Z/`): `l9` è **identico** alla 0440Z. Impronta di riferimento: `ff3033cb…` (L4 §11.8).

## 9. G-036 dell'Esperto (rilettura di L9 contro la guida) e impronta «prima», sulla base p5s-2026-10-20-0533Z
### 9.1 Disponibilità dei Confidenti (`confidente_disponibilita`, 23 righe)
- **Da strutturare: 8.** Righe di oggi → valore della guida:
  - **ryuji**: giorno, tutti i giorni. R2, R3, R6, R8 no con la pioggia; R7 la sera a date fisse dopo un suo messaggio; R5 dal 6/5.
  - **ann**: solo giorno, lun/mar/mer/ven/dom. Si **toglie** «anche sera con la pioggia», che non è nella guida. R3, R4, R5, R7, R9, R10 no con la pioggia.
    **Luogo**: oggi «Aula 2-D (a scuola) oppure Centro Commerciale Sotterraneo…» → Centro commerciale sotterraneo (l'Aula 2-D solo il 6/5).
  - **haru**: solo giorno, lun–sab, mai con la pioggia; Tetto della Shujin.
  - **makoto**: giorno, mar/gio/sab/dom (come G-033); R2, R9 no con la pioggia.
  - **yusuke**: giorno, tutti i giorni; R4, R6, R9 no con la pioggia; Sottopasso di Shibuya.
  - **futaba**: giorno, mer/gio/sab/dom, mai con la pioggia; fuori dal Leblanc.
  - **kasumi**: nessun giorno fisso, si incontra **su messaggio**. È bloccata al R5 (entro il 22/12) e si sblocca il 12/1; R6–R9 dal 13/1, 14/1, 16/1 e 18/1.
  - **gemelle**: senza limiti di calendario, **dal 18/5**, scadenza 24/12. **Luogo**: oggi «Stanza di Velluto (accessibile dopo il completamento del Palazzo di Madarame)»
    → «Stanza di Velluto», dal 18/5.
- **Correzioni: 3.**
  - **kawakami**: luogo, oggi «Leblanc (telefono a pagamento) e, più avanti, appartamento/vari luoghi» → «telefono a pagamento del Leblanc» (come L5 §10.7).
  - **yoshida**: più i **festivi**; no con la pioggia; ultimo giorno utile 13/11.
  - **mishima**: eccezione «non disponibile nei due giorni dopo ogni salto di rango».
- **Confermati: 12.** akechi (R6 dal 3/9, nota sulla discordanza), iwai, ohya, chihaya, shinya, sojiro, takemi, maruki, hifumi; igor, morgana e sae sono automatici.
- **Cifre attese**:
  - 23 righe;
  - **11** cambiano (8 strutturate + 3 corrette);
  - **12** identiche riga per riga;
  - le eccezioni di pioggia e di rango vanno come condizioni (L6), non come frasi;
  - nessuna riga della partita cambia.
### 9.2 Altri dati (tabella B)
- **Lavenza e Gemelle legate a igor: 4 voci** (prima ne contavo 3), tutte **fuori dal diario validato**:
  - `165b8cb392fae0bd067b6ba34b87a8fb` (06-08 giorno), «avanzamenti multipli con i Gemelli Custodi»;
  - `85cce8fcb43e4ca9a05707de5a8ea993` (09-06 giorno), «fusioni con le Gemelle…»;
  - `d26ea0495813e93e62e5940a9912c419` (11-06 giorno), «Gemelle Custodi fino al rango massimo»;
  - `5cb911c7de90d3ee9a9ee47b47e69240` (01-11 giorno), «Incontro con Lavenza all'infermeria…».
  Proposta: `riferimento_chiave` igor → **gemelle**, con il testo invariato, `da_rivedere` e il riferimento di prima conservato. Va nell'elenco «Da approvare».
  Le altre 11 voci di igor restano: tra queste, quella dell'utente del 06-01 `9b4f62e2f6694fd5af10a407a455d546` non si tocca.
- **«Junichi» → «Munehisa»**: 2 testi, `evento_calendario.titolo` (1) e `settimana_guida.riassunto` (1). Nessuna voce del diario: in `voce_giornata` lo cerco su azione e note
  e trovo 0 righe.
- **Confermati**: paghe dei 4 lavori (Crossroads 12.000 è la domenica), quiz 7/17/27, esami in 4 sessioni da 3 giorni con nota «la tabella della guida dice 4 giorni»,
  risultati, scadenze di Madarame.
### 9.3 Impronta «prima» di L9 (richiesta del Manager)
Script `impronta-lotto.cjs L9` → `impronta-L9-p5s-2026-10-20-0533Z.json`, nel mio scratchpad. Stessa forma di L7 e L8. Sha256 complessivo
**`9a64fde1a4172b7e2e9c85e0e2c441fecaf26699a36e45fbc0ec2339023754bc`**, **identico sulla 0503Z**.
| Dato | Righe | sha256 (inizio) |
|---|---:|---|
| `confidente` / `confidente_disponibilita` / `confidente_rango` | 23 / 23 / 162 | `2f436829…` / `1dfcef89…` / `4e9bb7b9…` |
| `confidente_dialogo` / `confidente_abilita` / `confidente_dote_incontro` | 223 / 159 / 38 | `bc95dbcd…` / `4d478e8f…` / `d75bd59e…` |
| `attivita` | 30 | `b53a5bfc…` |
| `giorno_calendario` / `giorno_percorso` / `evento_calendario` | 346 / 346 / 173 | `a7cc3930…` / `09aeb5b5…` / `e4b1e80c…` |
| `settimana_guida` / `allerta_meteo` | 42 / 74 | `5f342f5c…` / `e3e6096d…` |
| `esame` / `domanda` / `cruciverba` | 4 / 78 / 38 | `b8295515…` / `14583649…` / `84944ee1…` |
| `voce_giornata` con riferimento Confidente | 297 | `f65e00e9…` |
| `luogo` con Confidenti | 34 | `5c9af41f…` |
| partita: `confidente_partita` / `incontro_confidente_partita` / `requisito_partita` | 46 / 52 / 0 | `cd833ced…` / `dd7b5245…` / — |
| partita: `turno_partita` / `attivita_svolta_partita` / `meteo_partita` | 11 / 8 / 1 | `30cb7f49…` / `3cb48670…` / `b4e0b098…` |
| partita: `domanda_partita` / `cruciverba_partita` / `dote_sociale_partita` / `evento_storia_partita` | 12 / 3 / 10 / 7 | `b369b707…` / `3819c07b…` / `c3f8750f…` / `4829f31c…` |
**Dopo** L9 cambiano solo:
- le 11 righe di disponibilità del §9.1;
- le 4 voci di igor → gemelle, dopo il sì;
- i 2 testi «Junichi»;
- le tabelle nuove: giorno unico, voci evento del calendario.
Le tabelle della partita devono dare gli **stessi sha**: lo stato della partita non si tocca (R9-25…R9-27).
