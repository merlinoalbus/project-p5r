# L7 «Oggetti» — requisiti

Autore: sessione «Analisi requisiti» (2026-10-20). Fonti: piano (righe 14-16, 66, 88, 91, 97-98, 115, 204, 211, 228, 304, 369, 402-403,
420), memoria «Un punto di modifica», «Lavoro da preservare». Contesto in sola lettura su `prod-20261020/gioco.db`: `oggetto` 223 righe
(id, nome, categoria, vincolo, descrizione), `articolo` 587 (listini dei negozi, con `oggetto_chiave`/`oggetto_fonte` già presenti in
parte), `confidente_regalo` 144 (regali per nome, con `dove` e `costo` in prosa), `libro` 46 e `film` 30 (con `dove`, `prezzo`,
`libro_posizione`, `film_posizione`). Il terzo catalogo del piano (355) va individuato in `dati.md`/`app.md`.

## Obiettivo
**Un catalogo unico `oggetto`** per tutto ciò che il gioco chiama oggetto: equipaggiamento, consumabili, materiali, regali, libri, DVD e
film, videogiochi, oggetti chiave. Ogni oggetto ha **una chiave** e una **pagina** `/guida/oggetto/<chiave>`: effetto, dove si compra
(negozi e prezzi), a chi piace come regalo, ricompense, forzieri, scambi, dove si trova. L'**articolo** diventa «l'oggetto X venduto da Y a
prezzo Z». Regali, ricompense, forzieri (voci dei Palazzi), scambi (Jose, Tanaka, Sakai…) e condizioni «articolo» **citano l'oggetto per
chiave**. I doppioni («Kogatana nera», «Black Robe»…) si fondono, con un elenco approvabile degli abbinamenti dubbi. Le tre pagine-catalogo
separate diventano filtri di una.

**Fatto quando** (piano, riga 420): un oggetto ha una pagina che dice dove si compra, a chi piace, dove si trova.

## Perimetro (contesto, da misurare in `dati.md`)
- Tre cataloghi senza chiave comune (piano: 223 + 355 + 576; oggi `articolo` 587).
- Prezzo di un oggetto in 7 copie (regali 12/116, guida 5/100 divergenti); nome di un articolo in 7 copie.
- Dove si trova un libro: 4 copie, 2 posizioni senza articolo.
- Scambi in 3 copie (Jose 24/37, Tanaka 4/20 divergenti).
- Contenuto di un forziere in 4 copie, 11 nomi con parentesi sbagliate.

## Criteri di accettazione
Tipo: **F** funzionale, **UX** esperienza, **NR** no-reg, **L** layout.

### Catalogo unico e identità
- R7-01 [F] Esiste un solo catalogo degli oggetti con chiave stabile, nome italiano, nome originale, categoria (equipaggiamento, consumabile, materiale, regalo, libro, film/DVD, videogioco, chiave…), effetto e descrizione; l'API lo espone con filtri per categoria.
- R7-02 [F] Ogni riga dei tre cataloghi di oggi è collegata a un oggetto del catalogo unico, o figura nell'elenco «non abbinati» da approvare; nessuna riga si perde.
- R7-03b [F] **Nomi italiani: la regola dell'Esperto (G-024)**, che è già una decisione dell'utente (DECISIONI 2026-09-04: i nomi degli oggetti restano quelli della guida italiana):
  - il nome dell'oggetto è **quello della guida**, comprese le abbreviazioni del menu del gioco («Portaf. guarigione», «Fascia capel. nera R»);
  - quando la guida scrive lo stesso oggetto per esteso e abbreviato, si mostra la forma estesa e l'abbreviata va fra i «nomi altri».

  L'equipaggiamento del dataset (223, itemizzazione) e quello dei listini (277, in vendita) sono **oggetti diversi**: coincidono solo 3 nomi (5 oggetti), e nessuna coppia del campione combacia per statistiche. Quindi **non si fondono per nome**; si fondono solo i doppioni veri dell'elenco approvato. Verifica: dopo la migrazione i 223 oggetti del dataset e i 277 dei listini restano distinti, salvo le fusioni approvate una per una.
- R7-03 [F] I doppioni noti (es. «Kogatana nera», «Black Robe») e quelli trovati dal censimento sono fusi in un oggetto solo, secondo l'elenco approvato e con la regola di R7-03b; le fusioni dubbie non si applicano senza il sì dell'utente.
- R7-04 [F] Il nome di un oggetto si legge solo dall'oggetto: listini, regali, ricompense, forzieri, scambi, diario e condizioni mostrano il nome dell'oggetto; rinominarlo lo cambia ovunque senza rompere collegamenti.
- R7-05 [F] Libri, film/DVD e videogiochi sono oggetti del catalogo con i loro dati di lettura/visione (sessioni, Dote, sblocchi strutturati): le pagine Libri e Film diventano filtri del catalogo, con lo stesso contenuto di oggi.

### Articolo, prezzo, dove si compra
- R7-06 [F] Ogni articolo di un listino cita il suo oggetto per chiave e ha prezzo e condizioni propri di quel negozio; il prezzo vive solo sull'articolo.
- R7-07 [F] Oggetto, regalo, libro, videogioco, popup della mappa e spesa del grado cliente leggono il prezzo dall'articolo; le divergenze di oggi (regali 12/116, guida 5/100) spariscono o sono elencate come eccezioni spiegate.
- R7-08 [F] La pagina dell'oggetto elenca tutti i negozi che lo vendono, con prezzo, condizioni e link alla sezione negozio della pagina del luogo (L5).
- R7-09 [F] «Dove si trova un libro» si legge da articoli e posizioni per chiave; le 2 posizioni senza articolo di oggi hanno un oggetto o sono elencate.

### Regali, ricompense, forzieri, scambi
- R7-10 [F] I regali graditi di un Confidente citano l'oggetto per chiave; la pagina dell'oggetto dice a chi piace (e a chi è sconsigliato); costo e «dove» del regalo si leggono dall'articolo e dal negozio, non dalla prosa.
- R7-11 [F] Il contenuto di un forziere (voce della guida) cita l'oggetto per chiave; la pagina dell'oggetto elenca i forzieri (Palazzo, infiltrazione, area) dove si trova; gli 11 nomi con parentesi sbagliate puntano all'oggetto giusto.
- R7-11b [F] **Forzieri e Palazzo concluso** (G-026; L4 R4-22). Gli oggetti di un forziere non preso prima del furto sono persi per sempre. La pagina dell'oggetto mostra, per ogni forziere di un Palazzo **concluso** nella partita, se il forziere è stato preso oppure se è «non più ottenibile». La regola è del PM (~05:10Z): un forziere è «non più ottenibile» **solo se il suo pin forziere non è raccolto**. I pin di percorso della stessa voce, come il rampino, non contano. Lo stato del pin è il suo (L4 R4-09). Eccezione: un **Seme** mancante si compra da Jose (G-026, fonte inglese, certezza media), quindi non è «perso» ma «da Jose». Jose trasforma i Cristalli in Anelli solo dopo la distruzione del Palazzo collegato. Verifica: un forziere non preso di Kamoshida p1 (concluso, 56/71) appare «non più ottenibile».
- R7-12b [F] **Ricompense delle Richieste** (G-034, certezza alta): i nomi «non trovati» sono corretti, ma mancano nel catalogo, tranne uno: la ricompensa di «Lo zio ingordo» è la **«Sciabola del rischio»** (arma per Mona), non «Venture Saber / Spadone dell'impresa». Sono carte abilità Annulla attacchi fisici, Termopili, Rimonta, Crescita 3, Mediarama, Carica e Recupero 3; la Corona del tumulto è un accessorio. Verifica: la Richiesta «Lo zio ingordo» mostra la Sciabola del rischio con il link alla pagina dell'oggetto; le carte abilità sono oggetti della categoria `carta-abilita`.
- R7-12 [F] Le ricompense (Richieste, domande, Confidenti, trofei…) citano l'oggetto per chiave e compaiono nella pagina dell'oggetto.
- R7-13 [F] Gli scambi (Jose, Tanaka, Sakai e gli altri) sono il listino del venditore, con oggetto dato e oggetto ricevuto per chiave; le divergenze di oggi (Jose 24/37, Tanaka 4/20) spariscono o sono elencate.
- R7-13b [F] **Listino di Tanaka** (Esperto, G-034, certezza alta sul listino, media sugli abbinamenti). I 20 articoli di oggi hanno nomi inglesi e non corrispondono a Royal: per Royal la guida elenca **18 articoli** in italiano, con i prezzi e i gradi di spesa (Nero oltre 10.000 ¥, Oscurità oltre 50.000, Caos oltre 100.000). Ne seguono quattro regole:
  - il listino di Royal (18 articoli) è la proposta;
  - **i 20 articoli di oggi non si toccano senza il sì dell'utente**: vanno nell'elenco unico «Da rivedere» (L11 R11-10c), con gli abbinamenti probabili (Black Robe → Veste nera, Black Kogatana → Kogatana nera, Model Gun → Replica d'arma, Ouija Board → Tavola Ouija, Holy Cloth → Sacra Sindone, Homunculus, Crown of Salvation → Corona della salvezza, «Gemme elementali» → i 6 Magatama), quelli possibili (Five-Inch Nail → Chiodo ossidato, Inspired Hand Mirror → Spec. senso spirit.) e i 10 nomi senza corrispondenza in Royal;
  - dopo il sì, il listino si rifà sui 18 articoli; i 20 di oggi restano nel cestino o come nota, mai cancellati;
  - Homunculus costa 5.000 (vince il listino; 120.000 della pagina Oggetti in nota).

  Verifica: prima del sì il listino di Tanaka è quello di oggi e l'elenco «Da rivedere» ha la voce di Tanaka con i 18 e i 20 affiancati; dopo il sì, sulla partita di prova, il listino ha 18 articoli con i prezzi della guida.
- R7-14 [F] Fabbricazione (strumenti del Covo) e abiti citano gli oggetti per chiave, se presenti nei dati (perimetro da `dati.md`).
- R7-15 [F] La condizione «articolo» (L6) cita l'oggetto o l'articolo per chiave e dà lo stesso esito di prima.

### Pagina e gestione
- R7-16 [F] `/guida/oggetto/<chiave>` è la casa dell'oggetto; ogni link a un oggetto (listini, regali, forzieri, ricompense, diario, ricerca) porta lì; `/guida/oggetti`, `/guida/libri`, `/guida/film` restano come elenco filtrato (indirizzi vecchi senza 404).
- R7-17 [F] «Modifica» nella pagina dell'oggetto, con «Ripristina» al valore della guida; le correzioni sopravvivono a un aggiornamento del pacchetto; eliminare passa dal cestino.
- R7-18 [F] Import ed export del pacchetto portano il catalogo unico e i riferimenti per chiave; i pacchetti vecchi si leggono ancora.

### Lavoro da preservare e non regressione
- R7-19 [NR] Acquisti, regali dati, letture, visioni e progressi dei videogiochi della partita reale copiata e di una partita di prova restano legati agli stessi oggetti, con le stesse date e gli stessi effetti (punti, Doti).
- R7-20 [NR] Il diario 04-01..06-01 (255 voci sulla copia di produzione 0440Z del 2026-10-20; 254 sulla copia precedente) invariato; le voci che citano acquisti, libri, film portano all'oggetto giusto; le 62 voci dei libri e le 22 dei film avanzano come prima.
- R7-21 [NR] Kamoshida (169 voci) e Madarame (227 voci e 254 pin utente sulla copia 0440Z, impronta 263; 225/252 sulla copia precedente): testi delle voci dei forzieri invariati; solo il collegamento per chiave si aggiunge.
- R7-22 [NR] Listini, punti negozio, grado cliente e scambi danno gli stessi totali di prima sulla partita reale copiata.
- R7-23 [NR] Typecheck e lint verdi; test mirati (catalogo, articoli, regali, libri, film, scambi, effettiOggetto/effettiCatalogo, migrazioni nuove) verdi con output grezzo.

### Esperienza e layout
- R7-24 [UX] Dal telefono in partita: cercare un oggetto per nome e vedere in un colpo dove comprarlo oggi (negozio aperto, prezzo) e a chi regalarlo.
- R7-25 [UX] Il catalogo unico non diventa un elenco ingestibile: filtri per categoria, ricerca, ordinamenti; le pagine di oggi (Libri, Film) restano riconoscibili come filtri.
- R7-26 [L] Pagina dell'oggetto, catalogo filtrato, elenco degli abbinamenti da approvare: nessuno scorrimento orizzontale a 1280, 768, 375; bersagli ≥44 px; tabelle a più colonne su desktop, schede su telefono.

## Decisioni coinvolte
Nessuna D1–D8 specifica. D8 (acquisti e yen) non è applicata qui (L10): L7 non cambia cosa fa un acquisto.

## Lavoro dell'utente da preservare toccato dal lotto
- Articoli, negozi, libri, film corretti dall'app (`origine='utente'`); stati di partita di acquisti, regali, letture, visioni.
- Diario 04-01..06-01 (collegamenti a oggetti); voci dei forzieri di Kamoshida e Madarame (solo collegamento in più).

## Dipendenze
- **L6 consegnato** (condizioni per chiave; «articolo» nel vocabolario unico).
- L5 (negozio come listino del luogo: «dove si compra» porta alla sezione del luogo), L4 (voci dei forzieri come permanenti).
- Prepara **L10** (acquisto dalla spunta del diario, regalo in un'azione sola, D8).

## Casi dubbi da approvare (soluzione prudente proposta)
1. **Abbinamenti per nome** fra i tre cataloghi: si applicano solo quelli esatti (nome normalizzato + categoria); tutti gli altri in elenco
   con proposta, nessuna fusione automatica.
2. **Stesso nome, oggetti diversi** (es. equipaggiamento e regalo omonimi): restano due oggetti con categoria diversa.
3. **Prezzi divergenti fra guida e listino**: vince il listino (prezzo del negozio); la cifra della guida resta nota se diversa. Casi
   dell'Esperto:
   - **Braccialetto d'argento** (G-024): la guida si contraddice da sola, 78.000 nella pagina dei regali e 68.000 nell'elenco dei negozi.
     Si applica la regola: vince il listino, 68.000, e 78.000 resta come nota. Da riverificare (certezza bassa).
   - **Chiesa di Kanda** (G-013): Vino della grazia 14.000 e Ceneri del pentimento 12.000 nella guida italiana, contro 3.000 e 4.000 nella
     fonte inglese. Vale la guida italiana.
   - **Modellino di moto** (G-034, certezza alta): **4.800** ovunque, nel negozio Tokobushiya e nei regali di Makoto, Futaba e Shinya. Il
     «3.600-4.800» dei regali è un errore: 3.600 è il prezzo del «Set di mascotte locali» dello stesso negozio.
   - **Dango lunare** 800 (listino di Super Muramasa; 640 nella pagina Oggetti, in nota); **Agodashi Oden** 900 (listino del Triple Seven; 800
     in nota) (G-034, certezza media).
   - **Jose**: le 37 righe sono giuste e la copia da 24 è incompleta (G-034, certezza alta).
4. **Regali senza articolo** (non si comprano: si ottengono): oggetto senza listino, con «dove si trova» in prosa come nota. Lo stesso vale
   per i **libri premio di una Richiesta** (G-018: «Shitamachi rinato», «Parchi divertimento», «Dolci cinesi»): sono oggetti senza listino,
   e «dove si trova» cita la Richiesta per chiave, non una frase. Un libro sblocca un posto **quando si finisce di leggerlo** (G-018, L6
   R6-08b): la pagina del libro mostra cosa sblocca, letto dalla condizione del posto (R6-11).
7. **Distributori con listini ripetuti** (G-014): i distributori del gioco vendono pochi set di bevande che si ripetono. Nel catalogo unico
   il set è un listino condiviso da più distributori (luoghi). I pin 1584 e 1769 dell'utente restano da approvare (L5, dubbio 7); il set C
   con la Creatura oggi non ha un negozio: se l'utente lo approva, nasce come listino nuovo, e solo dopo il sì.
5. **Contenuti dei forzieri con più oggetti o quantità**: il forziere cita più oggetti con quantità; il testo della voce non cambia.
6. **Videogiochi**: se oggi non hanno una tabella propria, entrano nel catalogo dalla fonte che li elenca (da individuare in `dati.md`).
