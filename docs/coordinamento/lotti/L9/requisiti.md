# L9 «Confidenti, attività, calendario» — requisiti

Autore: sessione «Analisi requisiti» (2026-10-20). Fonti: piano (righe 62-63, 90, 119-139, 209-212, 230-231, 326-347, 371, 422), memoria
«Un punto di modifica», «Lavoro da preservare»; DECISIONI 2026-10-12 (tag delle allerte meteo), 2026-10-17 (Dote dei Confidenti solo al
passaggio di rango; guida del quiz dei lavori). Tabelle di contesto (copia `prod-20261020`): `confidente_disponibilita` 23
(giorni_json, fasce_json, luogo in prosa, sblocco_data, sblocco_requisiti), `confidente_requisito`, `confidente_rango`, `confidente_abilita`,
`confidente_dialogo`, `confidente_dote_incontro`; `giorno_calendario` 346 e `giorno_percorso` 346 (due tabelle giornaliere, meteo in
entrambe), `allerta_meteo` 74, `settimana_guida` 42, `evento_calendario` 173; `esame` 4 (domande in `domande_json`) e `domanda` 78;
`attivita` 30 (luogo/luogo_chiave/sede_chiave, doti_json, effetti_json, paga, paga_yen, sblocco…); `voce_giornata` 996 voci.

## Obiettivo
- **Confidenti**: la **disponibilità** (giorni, fasce, luogo per chiave) è strutturata in un solo posto, sulla pagina del Confidente
  (`/confidenti/<chiave>`, guida e stato di partita insieme); la data di sblocco è il **requisito del rango 1**; anagrafica, punti per
  rango, abilità, risposte ai dialoghi (rango → scelte → note con punti), regali, luoghi del Confidente si modificano dalla pagina.
- **Attività**: ogni attività ha la sua pagina `/guida/attivita/<chiave>` (dove — luogo per chiave —, quando, sblocco come condizione,
  **effetti solo strutturati**, paga); le descrizioni ripetute spariscono; i giorni del quiz in un posto.
- **Calendario**: **un solo giorno** (`giorno`: meteo e allerte, settimana, trama, vincoli) al posto delle due tabelle da 346 giorni; gli
  esami in **una sola tabella** (oggi 31 domande doppie); il giorno della settimana **si calcola** dalla data; gli eventi del calendario
  diventano voci del diario di tipo evento/sblocco/scadenza collegate per chiave e le scadenze e gli sblocchi **si ricavano** dalle
  condizioni (L6) e dalla finestra del Palazzo. Il Calendario è la vista mensile del diario.

**Fatto quando** (piano, riga 422): le date di sblocco dei Confidenti coincidono in ogni vista; le 7 attività registrano le loro Doti.

## Perimetro (contesto, da misurare in `dati.md`)
- Giorni, fasce e luogo di un Confidente: 9 copie, 25 voci del diario fuori giorno, 13 fuori fascia; 4 Confidenti senza luogo; prosa
  contraddittoria (Kawakami, Yusuke); nome sbagliato «Junichi Iwai».
- Data di sblocco: 7 copie, 9/23 divergenti. Abilità per rango 21/101; Dote per incontro 1/32; formula dei punti in 5 copie (bonus esami: 7,
  6 o tutti); risposte ottimali: 812 scelte, 293 senza punti numerici.
- Dote data da un'attività: 7 copie, 13/23 divergenti, 7 attività non registrano nulla; paga di un lavoro 0/4.
- Meteo: 7 copie, 12/12 divergenti fra le due tabelle. Data di una domanda o esame: 6 copie (7 domande senza voce, 4 voci senza domanda);
  cruciverba 6 copie (5 senza voce, 3 voci senza cruciverba); giorno della settimana in 5 formati.
- Eventi del calendario 173 (Storia, Sblocco, Scadenza, Festa, Esame), non modificabili, non citano le entità; Madarame con 3 scadenze.

## Criteri di accettazione
Tipo: **F** funzionale, **UX** esperienza, **NR** no-reg, **L** layout.

### Confidenti
- R9-01 [F] La disponibilità di ogni Confidente (giorni, fasce, luogo per chiave del luogo di L5) vive in un solo posto; scheda del luogo, «Dove si trova», disponibilità, semafori e diario la leggono da lì.
- R9-02 [F] I 4 Confidenti senza luogo hanno un luogo o sono elencati con motivo (es. ovunque / via messaggio); la prosa contraddittoria (Kawakami, Yusuke) è risolta nell'elenco approvato. Valori della guida (Esperto, G-016b): **Kawakami** venerdì e sabato sera, sempre dal Leblanc (telefono a pagamento; «vari luoghi» non risulta); **Yusuke** tutti i giorni di giorno al Sottopasso di Shibuya, ranghi 4/6/9 non con la pioggia («rango 8 con la pioggia» non risulta; oggi `giorni_json` di Yusuke contiene le date dell'itinerario, non la disponibilità: da correggere); **Gemelle** dal 18 maggio, durante il Palazzo di Madarame (non «dopo il completamento», come dice oggi l'app).
- R9-03 [F] Il diario avvisa (tipo «avviso», non bloccante) quando una voce d'incontro è fuori giorno o fuori fascia; le 25 + 13 voci di oggi mostrano l'avviso senza che il loro testo cambi.
- R9-04b [F] **Avvio e incontro sono due cose** (G-017): il requisito del rango 1 dice quando il Confidente si **avvia**, mentre un incontro di trama precedente è un evento distinto, senza rango. Casi:
  - Ohya: incontro il 18/6 al Crossroads, rango 1 il 5/7;
  - Kawakami: evento «Becky» il 3/6, contatto e sblocco il 4/6, rango 1 consigliato l'8/6 con Coraggio rango 3;
  - Gemelle: dal 18/5, durante il Palazzo di Madarame, rango 1 consigliato il 19/5;
  - Takemi: il negozio della clinica dal 16/4 e Tae dal 18/4 (decisione dell'utente, R6-12).

  Le condizioni di rango 1 sono strutturate (data, evento, Dote, Palazzo «concluso» di L4 R4-22), mai una frase (L6 R6-08b, R6-14). Verifica: la pagina di Ohya dice «avvio dal 5 luglio» e mostra l'incontro del 18/6 come evento; quella delle Gemelle dice «dal 18 maggio».
- R9-04 [F] La data di sblocco di un Confidente è il requisito del suo rango 1; semafori, calendario, pagina del Confidente e avvisi la ricavano da lì e coincidono in ogni vista (le 9/23 divergenze spariscono).
- R9-05 [F] Il nome sbagliato «Junichi Iwai» è corretto nella fonte e si vede corretto ovunque, comprese le voci del diario dal vivo (senza riscriverne il testo).
- R9-06 [F] Il nome del Confidente si legge solo dal Confidente: le 80/445 voci del diario con nomi vecchi mostrano il nome giusto dal vivo.
- R9-07 [F] Punti per rango, abilità per rango (21/101), Dote del rango (1/32), risposte ai dialoghi con le note e i punti, regali e luoghi del Confidente si modificano dalla pagina del Confidente con «Ripristina»; la Dote resta «solo al passaggio di rango» (2026-10-17).
- R9-07c [F] Nella pagina del Confidente si indicano **gli inviti del Confidente e cosa sbloccano**: per ogni invito, la data e l'area, il ritrovo o il luogo che apre, e le **condizioni del gioco** strutturate (L6 R6-08c2: per esempio, per Makoto del 30/7, il Palazzo di Futaba concluso e Imperatore rango 1). L'invito si registra solo se le condizioni sono vere. L'invito senza voce del diario è uno solo, quello di Ryuji del 29/5, che sta nel diario validato: si registra solo da qui o dal quartiere. Makoto del 30/7 ha la sua voce «da rivedere» con la condizione scritta (strada (a) del PM, L6 R6-08c3); da qui il gesto vale come per gli altri inviti. È l'unico posto in cui si modificano; la condizione «invito del Confidente avvenuto» del quartiere o del luogo (L6, R6-08c) e la voce del diario (L10, R10-11i) li leggono da lì per chiave. Decisione dell'utente del 2026-10-20: «il Confidente deve poter dare anche la possibilità di sbloccare un'area». Dalla stessa pagina si **registra con un gesto diretto** l'evento «invito avvenuto» della partita, per gli inviti che non hanno una voce del diario (R10-11j2). Verifica: aggiungere dalla pagina di Makoto l'invito del 30/7 che apre Ikebukuro (date di G-023) lo fa comparire nella condizione di Ikebukuro e nella voce del diario, senza scriverlo altrove; toglierlo lo toglie da entrambe.
- R9-07b [F] Ogni rango di un Confidente dice come sale: **a punti legame**, con la soglia in punti verso il rango successivo, oppure **per evento/trama/automatico**, senza accumulo di punti. Il dato è strutturato sulla pagina del Confidente, con valori dall'Esperto della guida. Il motore del diario di L10 lo legge per applicare i punti legame in ordine cronologico (R10-11c..g). Verifica: per ognuno dei 23 Confidenti, ogni rango ha il suo modo di salire e, se sale a punti, la sua soglia, con la fonte. Le regole del gioco sono nella tabella **G-020** dell'Esperto:
  - per tutti i Confidenti il rango 1 e il passaggio 1→2 non chiedono punti;
  - Igor, Morgana, Sae e Gemelle non hanno ranghi a punti;
  - Mishima sale con le Richieste dei Memento;
  - Yoshida non ha soglie;
  - Akechi 9→10 e Maruki 10 sono automatici;
  - il 9→10 non ha soglia in punti per Akechi e Maruki (automatici), Kawakami e Yoshida (a eventi) né per Igor, Morgana, Sae, Gemelle e Mishima (non a punti); per gli altri 14 Confidenti la soglia c'è e vale quella della tabella dei punti (`confidente_rango`, confermata da due fonti indipendenti: ricerca Royal del 24/10, `ricerca-royal-2-2026-10-24.md` §4). Nessuna pagina Royal letta dà un totale di punti: i dati non si toccano.

  Le soglie dell'app coincidono con i dati del gioco (Akechi 6→7 = 55, confermato).
- R9-08 [F] Un solo modulo calcola i punti dei Confidenti (bonus esami compresi) per server e anteprime; le 5 copie della formula danno lo stesso risultato. Regola del gioco (Esperto, G-016c): il risultato dell'esame dà un moltiplicatore sui punti di **7 Confidenti**: Ryuji, Makoto, Haru, Sojiro, Kawakami, Kasumi e **Ann**. È massimo se si è primi in classifica, ridotto se si è nei primi 10, e vale fino ai risultati dell'esame successivo. Ann è stata aggiunta dalla correzione di G-016c in G-020: i numeri del gioco le danno ×1,2 / ×1,5, mentre la guida italiana la omette (discordanza dichiarata, vince il dato del gioco). Il modulo unico applica questa regola e i casi di prova la coprono (primo, nei primi 10, fuori; Confidente dei 6 e fuori dai 6).
- R9-09 [F] `/confidenti/<chiave>` è la casa del Confidente (guida e stato di partita); il secondo elenco in «Personaggi» porta lì; il link rotto `/confidenti` funziona (elenco).

### Attività
- R9-10 [F] Ogni attività ha la sede (luogo per chiave), la fascia, lo sblocco come condizione (L6), gli effetti strutturati (Doti, contatori, paga) e una pagina `/guida/attivita/<chiave>`.
- R9-11 [F] Le 7 attività che oggi non registrano nulla registrano le loro Doti (effetti strutturati); le 13/23 divergenze fra le copie spariscono o sono elencate.
- R9-12 [F] La paga di un lavoro vive sull'attività (paga, paga minima/massima) ed è la sola letta da turno e diario (0/4 coincidenti oggi → tutte dalla stessa fonte).
- R9-13 [F] I giorni del quiz (Triple Seven, 2026-10-17) stanno in un posto solo, letto da guida del quiz e diario.
- R9-14 [F] Le descrizioni ripetute delle attività spariscono dalle viste; la prosa che aggiunge contesto resta come nota.

### Calendario, giorni, esami
- R9-15 [F] Esiste un solo «giorno» per data (meteo, allerte, settimana, trama, vincoli); le due tabelle da 346 righe si fondono; le 12/12 divergenze di meteo sono risolte secondo l'elenco approvato. Per l'Esperto (G-016a) le due tabelle non si contraddicono: `giorno_calendario` dà il meteo in due fasce («giorno/sera», es. «Pioggia/Sereno»), `giorno_percorso` solo la fascia di cui parla la guida; in 11 giorni su 12 la frase della guida conferma la parte corrispondente del calendario → il giorno unico tiene **il meteo in due fasce, dal calendario**; il 05-24 (la guida tace) resta «Nuvoloso» con nota «possibile pioggia» ed entra nell'elenco «da verificare» del resoconto (decisione del PM, dubbio 1).
- R9-16 [F] Il giorno della settimana si calcola dalla data in tutte le viste (nessun formato salvato).
- R9-17 [F] Le allerte meteo restano tag dei giorni (2026-10-12) lette dal giorno.
- R9-18 [F] Gli esami stanno in una tabella sola: le 31 domande doppie fra `esame.domande_json` e `domanda` diventano una; la data di una domanda o esame vive sulla domanda.
- R9-19 [F] Il meteo, la trama e i vincoli di un giorno si modificano dalla «pagina del giorno» con «Ripristina».
- R9-20 [F] I 173 eventi del calendario diventano voci del diario di tipo evento, sblocco o scadenza, collegate per chiave all'oggetto (Palazzo, quartiere, Confidente, attività), con elenco dei casi non collegabili.
- R9-21 [F] Scadenze e sblocchi non si scrivono a mano: si ricavano dalla finestra del Palazzo e dalle condizioni di sblocco (L6); Madarame ha una scadenza sola nel calendario; il calendario coincide con la guida.
- R9-22 [F] Il Calendario è la vista mensile del diario: i tag si modificano dallo stesso modulo delle voci del diario.
- R9-23 [F] Le settimane della guida (42) restano consultabili e collegate ai giorni.

### Lavoro da preservare e non regressione
- R9-24 [NR] Il diario 04-01..06-01 (255 voci sulla copia di produzione 0440Z del 2026-10-20; 254 sulla copia precedente) invariato in testo, ordine, giorno, fascia, uid e spunte; le voci nuove nate dagli eventi del calendario sono aggiunte (tipo evento/sblocco/scadenza) senza spostare né rinumerare le voci esistenti; il segno «validata» sulle 254 voci, se introdotto qui o prima, resta.
- R9-25 [NR] Gli stati dei Confidenti della partita reale copiata (rango, punti, incontri, requisiti confermati, Doti registrate) invariati; i semafori danno lo stesso esito salvo le correzioni elencate.
- R9-26 [NR] Turni, attività svolte, paghe registrate e contatori invariati per p1 e una partita di prova.
- R9-27 [NR] Domande e cruciverba già segnati restano segnati; meteo segnato nella partita (`meteo_partita`) invariato.
- R9-28 [NR] Kamoshida e Madarame (227 voci e 254 pin utente sulla copia 0440Z, impronta 263; 225/252 sulla copia precedente) non toccati: impronta identica; finestre dei Palazzi coerenti con L6.
- R9-29 [NR] Typecheck e lint verdi; test mirati (confidenti, disponibilità, punti, attività, quizAttivita, meteoPartita, calendario, esami, migrazioni nuove) verdi con output grezzo.

### Esperienza e layout
- R9-30 [UX] Dal telefono in partita: sapere «chi posso vedere oggi e dove» in un tocco dal diario, con gli stessi dati della pagina del Confidente.
- R9-31 [UX] La pagina del Confidente unisce guida e stato senza diventare lunga da scorrere: rango e prossimo passaggio in cima, dialoghi del rango corrente subito sotto.
- R9-32 [UX] Il Calendario mensile resta leggibile come oggi (tag Storia, Sblocco, Scadenza, Festa, Esame) e ogni tag porta alla voce e all'oggetto.
- R9-33 [L] Pagine Confidente, Attività, Calendario, pagina del giorno, moduli di modifica: nessuno scorrimento orizzontale a 1280, 768, 375; bersagli ≥44 px; il Calendario mensile a 375 passa a lista per settimana senza perdere i tag; a 1366×657 e 1280×689 la pagina del Confidente mostra rango, disponibilità e dialoghi del rango corrente nella prima schermata.

## Decisioni coinvolte
Nessuna D1–D8 specifica. D6 (automatismi delle Doti) e D8 (paga → yen) sono di L10: L9 rende gli effetti e la paga strutturati, non li
applica in automatico.

## Lavoro dell'utente da preservare toccato dal lotto
- **Diario 04-01..06-01**: le voci restano intatte; le aggiunte (eventi come voci) non le toccano (R9-24).
- Requisiti dei Confidenti confermati a mano, Doti registrate, turni e contatori, meteo segnato, risposte e dialoghi corretti dall'utente.

## Dipendenze
- **L6 consegnato** (condizioni e valutatore unici; sblocchi per chiave).
- L5 (luogo per chiave: disponibilità e sede delle attività), L3 (finestra del Palazzo per le scadenze).
- Prepara **L10** (diario come motore: effetti nuovi, incontro e rango, attività svolta, domanda; D6, D8).

## Casi dubbi da approvare (soluzione prudente proposta)
1. **Meteo divergente fra le due tabelle (12/12)** — *risposta dell'Esperto (G-016a)*: non è una contraddizione (due fasce contro una);
   si tiene il meteo in due fasce dal calendario. **05-24 deciso dal PM (2026-10-20)**: è un dato di gioco senza fonte, non lavoro
   dell'utente. Si applica la soluzione prudente di G-016a: «Nuvoloso» dal calendario, con la nota «possibile pioggia», ed entra
   nell'elenco «da verificare» del resoconto. Chiuso.
2. **Domande doppie (31)**: si tiene la riga con risposte e ricompensa più complete; le differenze in elenco.
3. **Eventi del calendario non collegabili a un oggetto** (feste, eventi generici): diventano voci evento senza collegamento, non si perdono.
4. **Prosa contraddittoria dei Confidenti** (Kawakami, Yusuke) — *risposta dell'Esperto (G-016b)*: valori in R9-02 (Kawakami ven/sab
   sera dal Leblanc; Yusuke ogni giorno di giorno al Sottopasso, ranghi 4/6/9 non con la pioggia; Gemelle dal 18/5). **Confidenti senza
   luogo** — *confermati da Analisi dati*: **igor, gemelle, sae, morgana**, gli unici non citati da nessun luogo in
   `luogo.confidenti_json` (gli altri 19 compaiono in almeno uno; stesso esito su produzione e sviluppo). Morgana ha un pin di Confidente,
   ma su una planimetria di Kamoshida (`nativo-rmap-152-1-0`), non nel mondo. **Esperto della guida (G-016d)**: **Igor, Morgana e Sae** avanzano in
   automatico con la trama, a date fisse; le **Gemelle** salgono consegnando Personae nella Stanza di Velluto, senza consumare tempo, dal
   18/5 al 24/12. Tutti e quattro **restano senza luogo, ognuno con il suo motivo** (trama automatica / Stanza di Velluto), dichiarato nella
   disponibilità e mostrato nell'elenco R9-02. L'unico posto reale in città è il cancello della Stanza di Velluto vicino al Negozio
   Softair di Central Street: vale solo per le Gemelle e può essere indicato come accesso, non come luogo del Confidente (chiuso). Finché manca, disponibilità ampia con avviso, mai blocco.
5. **Risposte ai dialoghi senza punti numerici (293)**: restano con la nota testuale; i punti si aggiungono solo dove la guida li dà.
6. **Formula dei punti** (bonus esami: 7, 6 o tutti) — *risposta dell'Esperto (G-016c, corretta in G-020)*: **7 Confidenti** (Ryuji,
   Makoto, Haru, Sojiro, Kawakami, Kasumi, Ann). La guida italiana omette Ann; i numeri del gioco le danno ×1,2 / ×1,5. La regola è in
   R9-08 (chiuso sul gioco; i valori esatti del moltiplicatore vengono da `registro.md`).
7. **Voci del diario fuori giorno/fascia**: solo avviso; nessuno spostamento automatico delle voci.
