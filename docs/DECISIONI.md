# Decisioni in vigore — project-p5r

Le scelte che spiegano perché l'app si comporta così, raccolte per area e scritte nella forma di oggi. Le decisioni superate non ci
sono più: la loro storia è nella cronologia di git. Il «come» (tabelle, servizi, componenti) sta in [`ARCHITETTURA.md`](ARCHITETTURA.md).

Le voci segnate **(24/10)** valgono come le altre (D16, 01/11).

## 1. Prodotto
- L'app è per **Persona 5 Royal** (non l'edizione base). In caso di discrepanza fra fonti prevale il dato Royal documentato; il
  valore superato resta come nota storica separata, senza medie né fusioni di versioni.
- Obiettivo: portare in app la guida italiana di allgamestaff (Doti con pulsanti, Confidenti con rango e risposte migliori, domande in
  classe, calendario, Palazzi, città) e aggiungere compendio, fusione e tracciamento della partita.
- Tutto in italiano: interfaccia, API, schema, commenti. Nomi delle Persona originali; skill con chiave canonica inglese di Royal
  (per esempio `Drain Fire`) e resa italiana nella tabella `traduzione`, modificabile.
- Le rese italiane di skill, Persona ed equipaggiamento vengono solo dalla guida italiana: chi manca resta con il nome canonico, nessuna
  traduzione inventata. I nomi di oggetti, luoghi e personaggi restano quelli della guida anche quando anticipano la trama.
- Partite multiple: ogni dato utente ha `partita_id`, una sola partita attiva; eliminando l'attiva diventa attiva la più recente.
- Uso durante la partita: layout tablet-first, ottimizzato anche per telefono (375 px) e desktop, bersagli touch ≥ 44 px.

## 2. Dati e fonti
- **La fonte è il DB dell'istanza.** Le correzioni ai dati si applicano con migrazioni dirette, conservative e verificate su Royal.
  Niente pannelli di riconciliazione, approvazione o «da rivedere» senza un sì esplicito dell'utente: bonificare vuol dire consolidare.
- **Un dato, un punto di modifica**, letto da tutte le viste; niente copie a frase. Una frase che ripete una condizione strutturata
  si toglie (con archivio); quella che racconta altro resta come nota.
- **Le condizioni sono stati della partita, mai frasi**: un vocabolario unico strutturato (`shared/condizioniSpillo.ts`) per negozi,
  articoli, spilli, luoghi, quartieri, Richieste, voci del Diario e doni; ciò che l'app non sa calcolare non si scrive come condizione.
- Le migrazioni non distruggono il lavoro validato dall'utente: il Diario validato fino al 1° giugno e i Palazzi completati non si
  riscrivono. Le correzioni delle voci del periodo validato si applicano direttamente, salvo (a) quelle incerte («probabile», «da
  verificare»), (b) quelle che dipendono da una scelta che solo l'utente conosce, (c) quelle che cambierebbero ciò che è già registrato
  nelle partite: queste restano proposte da decidere in «Da completare».
- Due voci del Diario sono la stessa solo con stesso testo, stessi pin e stessa infiltrazione; le fusioni solo su elenco approvato.
- Equipaggiamento del dataset e articoli dei negozi: nessun abbinamento fondato solo sul nome; identità distinte finché l'equivalenza
  non è documentata.
- Dati non decidibili dalle fonti restano senza effetto, con il motivo annotato: niente dati inventati. **(24/10)**
- **Tesori da vendere nel catalogo (Q17)**: i 140 Tesori della guida sono oggetti `altro/…` del catalogo, con prezzo di vendita e reperibilità
  letti dalla riga della guida (nella descrizione, «tesoro, rivendibile per … ¥ · …»; nessuna stima). Non hanno offerte nei negozi: il prezzo
  minimo dell'elenco degli oggetti conta solo le offerte, e il prezzo di vendita di un Tesoro sta nella descrizione.
- **Livello consigliato dei Palazzi (D5, 01/11)**: è un livello minimo e massimo di Royal, e il testo con il confronto delle fonti resta intero
  come nota storica del Palazzo, visibile e modificabile solo nella preparazione. Niente medie fra le fonti. I numeri vengono dalla guida
  italiana dove li dice; Kamoshida (minimo 10) e Niijima (minimo 45) vengono da una fonte secondaria, l'unico consiglio numerico scritto nel
  testo di prima: restano visibili, confermati dall'utente (01/11, «Sì, mostrali»). Dove nessuna fonte dà un consiglio (Kaneshiro, Shido,
  Memento) non c'è un numero.
- **Una regola per dato (L8, 01/11)**: la capienza della scorta (gradini compresi) è un dato del blocco `capienza-scorta`, non il testo delle
  abilità di Igor; il giorno di un'infiltrazione è quello delle voci legate a lei, non una data nel nome; la cattura di una Persona è una
  regola sola per Compendio, alberi di fusione e cicli, con tre stati: provata (un'Ombra catturabile della guida la porta, oppure il compendio
  delle Persona le dà un'area dei Memento), esclusa per documento (speciale, Demone del Tesoro, DLC, del gruppo) e da verificare (nessun dato
  dice dove si incontra); le da verificare restano catturabili (utente, 01/11: «Restano catturabili»), e lo stato resta nel dato; «dove si
  incontra» è un servizio solo,
  con le Ombre della guida e i dedali dei Memento del compendio che le Ombre non dicono (tutti per chi non ha Ombre, come Makami e Scathach),
  senza perdere nulla di quel che la scheda mostrava; «si ottiene per fusione» solo per chi non si incontra da nessuna parte; le Richieste non
  hanno più testi di sblocco e scadenza della guida accanto alle condizioni e alle date.
- **Effetto dei tratti (utente, 01/11: «Quella della guida»)**: la descrizione della guida (scheda «Tratti» delle Sfide) è l'unica descrizione
  dell'effetto di ciascuno dei 90 tratti, mostrata ovunque (Sfide, scheda Persona, pagine delle skill, fusione, ricerca); si corregge e si
  ripristina solo dalla riga del tratto nelle Sfide. La resa di Traduzioni della skill di un tratto non si mostra e non si scrive più.
- **Avvisi del giorno (L8-02, 01/11)**: sono un dato del giorno, modificabile dall'editor del giorno come i vincoli. Gli avvisi che ripetevano per
  intero ciò che la scheda del giorno mostra (voci con il rango atteso, effetti, trama e vincoli, «Giorno non coperto») sono tolti (181, con
  archivio), quelli che ne ripetevano una parte riscritti col resto (11). Anche quelli coperti solo da trama o vincoli sono tolti (l'utente,
  01/11: «Sì, toglile»), come i casi in dubbio decisi: Yoshida del 17 luglio e Sumire del 12 gennaio («Togli l'avviso»), i doppioni rimasti
  dopo l'allineamento delle date (Medjed, Kaneshiro), quelli che le voci nuove di Akechi e di Igor dicono già e quello del 20 luglio sulla
  Richiesta della maid, che la voce del 19 luglio sblocca; quello di Niijima del 31 ottobre dice solo la scadenza. Resta l'avviso del 9 aprile sui salvataggi di Persona 5 («Anticipo utile, resta»): anticipa la voce del 12
  aprile. Restano gli avvisi con un'informazione propria.
- **Conflitti di dati del censimento degli avvisi (decisioni dell'utente, 01/11)**: il ricatto di Kaneshiro scade l'8 luglio, l'ultimo giorno
  della finestra del Palazzo (vincolo del 19 giugno, trame del 20 e del 21 giugno, riassunti delle settimane, nota del Palazzo, evento della
  scadenza all'8 luglio; il risveglio del cuore è il 9 luglio; il titolo dell'evento del 20 giugno, «in 3 settimane», resta per scelta dell'utente); Medjed annuncia l'attacco il
  23 luglio (anche nel riassunto della settimana) e la scadenza è il 20 agosto, l'ultimo giorno utile, perché il 21 è il giorno
  dell'attacco; la scadenza del Palazzo di Niijima è il 19 novembre (anche nel riassunto della settimana), il 20 è l'interrogatorio. Le date
  vecchie sono tutte allineate («Sì, allineali tutti»); il blocco storico delle finestre della guida resta com'era. La lettera a Kamoshida e il furto sono due eventi del calendario («Separo i due eventi»): «Invio della lettera di sfida a
  Kamoshida» il 21 aprile, il giorno della voce che la invia, e «Furto del Tesoro di Kamoshida» il 22, con il confronto e la voce del furto
  (le voci validate non cambiano). «Medicina amara» si sblocca dal rango 7 di Takemi («Dal rango 7 di Takemi»): l'effetto di sblocco sta
  sulla voce del 28 maggio, che non cambia in nient'altro, e le partite che l'avevano già spuntata ricevono lo sblocco come dalla spunta
  («Migrazione automatica», utente 066); il rango 8 di Kawakami (voce del 19 luglio) sblocca «Le fatiche di una maid in
  cattedra» («Sì: sblocca la maid»). Il rango 1 di Akechi è una voce del Diario del 10 giugno, sera, dopo la trasmissione («Sì, aggiungi la voce»); il rango 10
  di Igor è una voce del 24 dicembre, con Impeto dell'Arcano supremo e la fusione di Vishnu («Sì, aggiungi»); l'abilità del rango 6 di Igor
  si chiama «Impeto dell'Arcano superiore», per distinguerla dal «supremo» del 10. Il Biliardo si sblocca al rango 2 di Akechi («Sì, rango 2
  di Akechi», una condizione dell'attività): vale con il rango 2 o più, quindi anche dalla voce del rango 3 del 13 agosto, senza una voce
  apposta per il rango 2. Il requisito del rango 1 di Hifumi («Disponibile dal 25 giugno») e la voce del 2 luglio dicono
  due cose diverse, da quando si può e il giorno della guida («Niente: due cose diverse»). Le date di Okumura (i «22 giorni» della trama del
  19 settembre) e delle elezioni restano quelle della trama («per il momento lascia quella della trama»); le date di apertura e di scadenza
  dei Palazzi si modificano da interfaccia, in «Correggi la scheda» del Palazzo.
- **Requisiti, date e prezzi della guida (L8-03, D4 dell'utente: «Solo i campi che l'app può usare: requisiti, date, prezzi»)**: dei testi
  liberi di Sfide, Aiuto in battaglia, Trofei e finali e Oggetti diventano campi strutturati solo quelli che la partita sa valutare
  (migrazione 340): lo sblocco degli Speciali (le condizioni, la frase generata; il testo della guida si vede solo dove le condizioni non ci
  sono), le condizioni dei boss segreti (Nuova Partita+, una nuova condizione del vocabolario letta da Partita → Modifica), i requisiti dei
  finali con il giorno entro cui valgono (il finale Royal chiede il rango 9 di Maruki entro il 17 novembre; il rango 8 di Akechi non è un
  requisito, perché la guida dice che aggiunge solo una scena), le ricette con l'arco dei Palazzi, il livello consigliato come numero (confrontato col livello della
  partita) e le sfide del Covo che contano uno stato della partita (attività, lavori, contatori, cruciverba risolti, timbri, yen spesi in un
  negozio, Confidenti al rango massimo, Richieste completate, Compendio, livello di una Persona). Dove la guida dice «tutti» (videogiochi,
  Confidenti, Richieste, Persona del Compendio senza DLC) il conteggio non ha un numero scritto: il totale si conta nel DB a ogni lettura. Ogni
  campo si corregge e si ripristina dalla sua riga, con l'editor delle condizioni. Gli altri testi restano come sono, perché l'app non ha lo
  stato che descrivono (fuoricampo, esiti dei turni senza oggetti, Ranghi Staffetta e Tecnico, statistiche delle Persona, fiori). Che il rango 8
  di Akechi non sia un requisito del finale Royal (né il suo contrario del finale standard) è una lettura del testo della guida, non una
  decisione dell'utente. I requisiti della personalizzazione delle armi si leggono dai requisiti di rango di Iwai, il
  loro punto unico; i testi della guida restano. I prezzi non diventano campi nuovi: hanno già il loro punto unico nel catalogo e nei listini,
  e i prezzi della pagina Oggetti diversi dal listino restano note storiche, con il listino com'è (l'utente, 01/11: «Lascia la nota»).
- Dataset del compendio: chinhodado/persona5_calculator (Apache-2.0) con verifica incrociata su aqiu384/megaten-fusion-tool,
  attribuzioni in `NOTICE`. Il foglio Royal della negoziazione (raccolta joyce-chen, senza licenza dichiarata) è copiato nel
  repository per scelta dell'utente, con attribuzione in `NOTICE`.

## 3. Persistenza, pacchetto e istanze
- Dati di gioco in `gioco.db`, partite in `partite.db`, sulla stessa connessione (schema `utente`): sostituire il DB di gioco non
  tocca l'avanzamento.
- Le immagini vivono in `gioco.db` (tabella `immagine`), tranne quelle del compendio e di `ui/`, che stanno in `public/asset/`.
- **«Importa» sostituisce `gioco.db`** con un backup scelto dalla cartella d'appoggio del server, dopo anteprima e conferma, con una
  copia di sicurezza (ne restano 3); non unisce e non tocca `partite.db`. Il file non passa dal browser. L'esportazione
  dell'istanza deve essere sempre reimportabile **(24/10)**.
- Le copie di avvio di gioco e partite sono al più 7 e occupano al più 2 GiB: con file da circa 415 MB ne restano 5. Le 2 più recenti
  con il file di gioco non vuoto restano sempre, anche sopra il tetto; l'età non toglie copie, perché dopo mesi di pausa cancellerebbe quelle utili.
- Il pacchetto completo (con le immagini) resta fuori da git per il limite di dimensione di GitHub; niente LFS per ora.
- **Un id di partita non si riusa (L11-04, 01/11)**: `partita` ha AUTOINCREMENT (utente 064) e il suo contatore parte dal più alto id che
  il file conosca (partite, ogni colonna `partita_id`, Cestino); la partita nuova prende un id oltre anche quello. Una partita nel Cestino
  si può ripristinare anche dopo averne create altre, e l'archivio degli acquisti senza chiave esterna non si mescola con una partita nuova.
  L'archivio resta immutabile; l'unica eccezione sono le 15 righe della partita 3, che non c'era più né fra le partite né nel Cestino, tolte
  una volta dalla utente 065 (l'utente, 01/11: «Toglile»).
- **Censimento delle partite, solo come avviso (L11-04, decisione dell'utente del 01/11: «al massimo warning»)**: ogni tabella del file
  delle partite e ogni sua colonna dal nome di riferimento va classificata, come riferimento ai dati di gioco (`RIFERIMENTI_PARTITE`,
  controllato dall'anteprima dell'«Importa») o con il motivo per cui non lo è (`CENSIMENTO_PARTITE`). Una tabella o una colonna non
  classificata si dice con un avviso nel log, con l'elenco di ciò che manca, all'avvio della preparazione e in «Prepara edizione»; non
  blocca niente, e non c'è un controllo in CI.
- **Due istanze dallo stesso codice**: preparazione (scrittura dei contenuti, un solo proprietario) e rilascio (contenuti in sola lettura,
  partite per utente). La modalità è fissata nella build (punto d'avvio `server/rilascio.ts`, `VITE_MODALITA=rilascio`), mai in una
  variabile dello stack; la sola lettura ha tre livelli più il bundle senza editor; il rilascio non migra e si ferma se l'edizione non
  coincide con il manifesto.
- **Provenienza dei dati nel rilascio (D10, 01/11)**: chi gioca non vede da dove viene un dato né le note per chi lo corregge (collegamenti
  alle fonti, «da fonte secondaria», «Da verificare» delle aree, incertezze delle fonti, provenienze degli esiti della negoziazione,
  affidabilità delle regole), né i comandi di chi prepara i contenuti. Le fonti (guida italiana di allgamestaff, meteo di wikiwiki.jp,
  negoziazione di joyce-chen, dataset del compendio) stanno in un punto solo, Impostazioni → Informazioni, visibile in entrambe le istanze, e
  in `NOTICE`. Nella preparazione quelle note restano, perché servono a chi corregge i dati; i residui tecnici (UID, firme, codici di
  risposta, ore ISO, percorsi `docs/…`) non compaiono in nessuna delle due. Nelle sole schede di amministrazione della preparazione (backup,
  «Prepara edizione») restano i nomi dei file, delle cartelle e delle tabelle, che servono a chi le usa.
- Deploy: immagini su GitHub Container Registry da GitHub Actions dopo il gate CI; nessuna porta pubblicata, frontend sulla rete del
  proxy, backend solo sulla rete interna. La preparazione si aggiorna da sola (Watchtower esterno, solo label); il rilascio ha versioni
  fisse e nessun aggiornamento automatico.
- Repository pubblico: niente indirizzi delle istanze, nomi utente, chiavi o dati personali nei documenti; nel deploy restano solo i
  nomi indispensabili, con i valori nelle variabili dello stack.
- **Il nome del proprietario nei riferimenti alle immagini (D17, 01/11)**: i riferimenti alle immagini nel registro dei container, nei compose
  e nei workflow, contengono per forza il nome del proprietario del registro; restano così, eccezione accettata dall'utente. Lo User-Agent
  delle richieste in uscita invece non porta né il nome né l'indirizzo del repository: `project-p5r/<versione> (guida personale di gioco
  per Persona 5 Royal)`.
- **Sicurezza ed esercizio (L9, 01/11)**: limiti di memoria e di processi su ogni container, misurati sui consumi con margine (la
  preparazione ha il backend più largo per l'importazione delle mappe fino a 512 MB); nel rilascio anche il frontend gira in sola lettura. La
  guardia del bundle di rilascio gira anche nella costruzione dell'immagine, sul bundle che si pubblica.
- **Rifiutate dall'utente (D11, 01/11)**: niente intestazioni di sicurezza nell'nginx della preparazione e niente limite di frequenza né tetto
  di righe per partita nel rilascio (L9-03, prima parte, e L9-04; per il tetto di righe confermato il 01/11: «Sì, niente tetto»). Il limite di
  frequenza del rilascio resta quello del bordo di Cloudflare.
- **CSP del rilascio prima in solo rapporto (L9-03, 01/11)**: la policy completa (`default-src`, `script-src`, `connect-src`, …, tutte sulla
  stessa origine) è in `Content-Security-Policy-Report-Only` accanto alla CSP applicata di prima, che resta com'era. Diventa applicata solo
  dopo averla osservata senza violazioni inattese nell'istanza vera, dietro il bordo; l'unica attesa è la prova di `Function("")` di Zod.

## 4. API e tecnica
- **2026-10-03 — Niente CORS**: il frontend è sulla stessa origine (proxy Vite in sviluppo, nginx in produzione) e l'API non ha
  autenticazione propria nella preparazione, quindi un'altra origine non deve poterla chiamare dal browser dell'utente.
- Documentazione dell'API generata (OpenAPI 3.1 dagli schemi zod, descrizioni in italiano in un registro), servita dall'istanza senza
  CDN; «Prova» spenta per i metodi che scrivono.
- Errori 4xx di Express e del body-parser resi nell'envelope in italiano (413, 400); mai un 500 in inglese per un caso ordinario.
- **Rotte sottili e tipizzate (L11-03, 01/11)**: il corpo, i parametri e la query arrivano al gestore con il tipo dello schema zod che li
  ha validati, senza cast; dove il servizio completa da sé la verifica di un corpo lo schema verifica solo la forma esterna e la rotta
  dichiara il tipo del servizio con `corpoDelServizio<T>()`, che il compilatore confronta con lo schema. L'SQL sta nei servizi, mai
  nelle rotte.
- **Righe del server entro 300 caratteri (L11-02, 01/11)**: il codice compattato si riformatta senza cambiare l'AST (prova: confronto
  dell'albero sintattico senza posizioni e delle parole dei commenti). Restano più lunghe solo le righe fatte da un letterale (SQL,
  messaggi, descrizioni dell'API, DDL di base); le migrazioni registrate e i test non si toccano.
- Il client ripete da solo solo le letture (GET, HEAD, OPTIONS); nessuna scrittura si ripete in automatico, salvo `maxRetries`
  esplicito dove il servizio è provato idempotente (31/10: un acquisto ripetuto dopo una risposta persa si registrava due volte).
- Gli errori arrivano all'utente in italiano e senza codici tecnici (offline, server che non risponde, errore del server); il dettaglio
  resta nella console e nel log.
- **Lint delle dipendenze e dell'accessibilità (L11-06, D12, 01/11)**: le dipendenze di `useCarica` le controlla la regola di `useEffect`
  (`react-hooks/exhaustive-deps`); `eslint-plugin-jsx-a11y` controlla l'accessibilità con le regole raccomandate. Le correzioni non cambiano
  né il comportamento né l'aspetto; dove l'omissione o il gesto sono voluti (un valore che fa solo rileggere, un campo che prende il fuoco
  all'apertura, una finestra che raccoglie i tasti) resta una disattivazione sulla riga con il motivo, mai una regola spenta per tutti.
- I test restano nel repository ma girano solo su richiesta, sul percorso indicato; non girano nella pipeline a ogni push.
- Il numero di una migrazione non si riserva: si prende il primo libero al momento del commit. I test che chiamano funzioni tolte su
  decisione dell'utente diventano `it.skip` con un commento, non si cancellano. **(24/10)**
- Immagini caricate: PNG, JPEG, WEBP, GIF, SVG; una per entità, la nuova sostituisce; servite con rivalidazione ETag e URL versionato,
  così una sostituzione si vede subito. Un SVG esce con una CSP `sandbox` senza script e come allegato: nell'app si vede come `<img>`,
  aperto da solo non esegue nulla (L9-01).
- «Scarica da URL» raggiunge solo siti pubblici: niente indirizzi della rete interna (privati, loopback, link-local, metadati del cloud, gli
  equivalenti IPv6), controllati dopo la risoluzione DNS e a ogni redirect; redirect al più 5, solo http e https (L9-02).
- Un collegamento a una fonte nasce solo da un indirizzo http o https, con una regola condivisa (`shared/urlHttp.ts`, L9-05).

## 5. Interfaccia
- **Tre formati** verificati sul continuo delle larghezze: nessuno sbordo orizzontale; sotto i 768 px file di schede e filtri
  scorrevoli invece di righe di pulsanti. L'intestazione di una pagina occupa al più il 30% dell'altezza a ogni formato, anche quella delle
  schede di dettaglio (L10): ritorno, titolo e azioni su una riga, briciole in una riga che scorre (verso «Indietro» solo la sfumatura,
  senza una seconda freccia), e le righe lunghe (orari di un luogo, sede e orari di un negozio, date e avanzamento del Palazzo al
  telefono) subito sotto la testata; al telefono i comandi della testata dell'Area sono solo icona.
- Navigazione: barra in basso (telefono e tablet) con Home, Compendio, Fusione, Partita, Guida; Skill dal chip in testa al Compendio,
  dalle schede Persona, dalla Home senza partita e, da 1024 px, dalla barra laterale. Briciole a due livelli, «Vai al contenuto»,
  fuoco sul titolo dopo ogni cambio di pagina.
- Installazione come web app dal browser (manifesto, niente service worker né cache offline): la prima volta che la Home si apre con lo
  schermo a tocco (telefono e tablet) e l'app non è già installata, una finestra invita a installarla, una volta per dispositivo. Con
  Chrome, Edge e Samsung Internet il pulsante «Installa» apre la finestra del browser; su iPhone e iPad dice i passi di «Condividi»;
  altrove indica la voce del menu **(01/11)**.
- Un rimando che conosce l'elemento citato porta a lui, non in cima a un elenco: le attività di quartieri, luoghi e Aree, le Richieste e
  le attività delle voci del Diario, le ricompense delle Richieste, le fonti delle ricompense degli oggetti (Richieste, domande, esami,
  sfide, Covo, ricette), le Ombre della scheda Persona e la ricerca globale. Libri e film si aprono da soli solo nel pannello sopra il
  diario; il cartellino «Da segnare» di una Richiesta porta all'elenco, perché il requisito non dice quale. Dal Calendario «Domande ed esami da oggi» porta alla prima domanda da quel giorno in poi; dai Palazzi si va ai Memento.
  «Confidenti» ha un solo indirizzo: con una partita attiva l'elenco della partita, senza i Personaggi.
- Attraversando un passaggio fra due mappe il visore offre il ritorno col nome della mappa di partenza (il testo visibile è il nome della
  cosa, mai «Torna»), verso il pin attraversato.
- Tipografia in rem (radice al 93,75%), testo informativo ≥ 12 px; 11 px solo per quattro segni fitti (etichette dei pin, percentuale
  dello zoom, targhette «LV», iniziale di riserva dei ritratti). I caratteri P5 caricati valgono per titoli e parole grandi; i titoli
  dei pulsanti `PulsanteVisivo` restano nel carattere display maiuscolo.
- Colori: rosso del tema `#e5352b` per fondi, bordi e asset; rosso come testo `#ff6359` e testo secondario `#8e8ea0` **(24/10)**;
  rosso d'errore come testo `#fb7c7c`. I colori degli spilli restano quelli autorati, anche gli otto molto chiari: è una scelta, non una dimenticanza.
- Pulsanti con figura: i pulsanti di solo testo sono convertiti; restano di testo gli «Annulla» delle finestre e i pulsanti a solo
  simbolo con nome accessibile. Ogni chiave d'icona nasce con una riserva SVG in codice.
- «Salva» sta sempre in vista, a ogni formato. Ogni modulo di modifica è la `FinestraModifica` comune (piè fisso con Elimina / Annulla / Salva,
  corpo che scorre da solo): anche le correzioni della guida (`CorrezioneGuida`: voce, infiltrazione, scheda del Palazzo, boss finale, area del
  dedalo) e il totale dei timbri, che prima si aprivano in linea con «Salva» dopo i campi. Fa eccezione il pannello dell'editor di mappa, che
  resta accanto alla mappa: «Salva» ed «Elimina» di spillo e mappa stanno in un piè fisso sul bordo basso del pannello (`.editor-mappa__piede`).
- Conferme con `DialogoConferma`, mai `window.confirm`; una sola vista d'errore. Le finestre (`Modal`) non si chiudono cliccando lo sfondo
  (selezionando del testo si chiudevano per errore); la ricerca globale e il pannello delle schede si chiudono dallo sfondo solo se il
  gesto comincia e finisce lì.
- Pulsanti occupati: di norma `disabled`; `aria-disabled` (il pulsante non perde il fuoco) nei punti delle Doti e nella Fortuna, nei dati
  della partita, nella lettura degli appunti fissi, nelle voci del menu della voce e nella maniglia di riordino; le scelte alla spunta lo
  usano per le opzioni non disponibili. Regioni `aria-live` per notifiche e totali.
- Accessibilità (L6, WCAG 2.2 AA): testo ad almeno 4,5:1 anche nei chip degli elementi e delle affinità (tinte schiarite per il testo,
  colore pieno per bordi e icone); caselle di spunta nel rosso del tema; file di schede con le frecce, Home e Fine; lo scorrimento animato
  si spegne con «riduci movimento»; pin e ritagli dell'editor si spostano anche con le frecce e con i campi X/Y. Pin e frecce delle file
  hanno un bersaglio di 44 px senza cambiare aspetto né posizione (i cartellini di Tokyo che si toccano alla misura del momento diventano
  una pastiglia «+n» con l'elenco dei nomi, anche sulla mappa piccola della scheda «Oggi» della pagina Partita (approvato dall'utente:
  «Raggruppa i pin»; con la mappa non ingrandita, un segno a meno di 24 px dal bordo o dai comandi dello zoom si sposta verso l'interno
  del minimo necessario, così la sua area di tocco è tutta toccabile); un collegamento isolato dentro una frase ha un'area trasparente da 44 px, una fila di
  collegamenti righe da 44 px): il pin singolo ha un'imbottitura trasparente sopra e ai lati (mai sotto,
  così la punta resta sul punto), il gruppo un'imbottitura uguale sui quattro lati; la freccia di una fila, col mouse, ha un riquadro di
  clic da 44 px attorno al cerchio, sul tocco è il pulsante a essere da 44, e lo spazio ai capi della fila resta quello di prima. Le voci «fatte» ed
  «esaurite» non sono più attenuate: hanno a sinistra il segno dello stato (spunta rossa, o cerchio barrato grigio per «esaurito») e il
  nome barrato in un grigio leggibile (D15, scelta C dell'utente, 01/11), anche nella Partita.
- Le bozze dei moduli non si salvano nel browser: ricaricando, una modifica non salvata si perde. **(24/10)**
- La pagina Partita mantiene il suo aspetto; eccezioni approvate: la vista «Avanzamento» del cassetto del Confidente (era «Level up»: nome
  italiano ovunque, solo l'etichetta); nella mappa della scheda «Oggi» i pin troppo vicini in un gruppo «+n» («Raggruppa i pin»); finestra «Regala» in Confidenti; riga «Giorno e fascia
  dell'incontro» come avviso, matita «Modifica» con Ripristina accanto a ogni Dote, scheda «Persona della partita» **(24/10)**; nelle Doti
  l'interruttore «Anima da cineasta» spento e disattivato senza il libro letto, con il motivo nel suggerimento (utente, 01/11); gli schizzi
  L10-01, L10-02 e L10-05 approvati dall'utente (01/11): da 1024 px Denaro e squadra, Confidenti, Compendio personale, Persona della
  partita e Storico riempiono l'altezza come Oggi, Doti e Letture (intestazione e schede ferme, comandi in una fila ferma, l'elenco in
  un'area con bordo; Confidenti su 3 colonne a 1024 e 4 da 1280, Compendio e Persona su due colonne di righe da 44 px, Storico con una voce
  per riga; testi a capo, mai coi puntini); in Persona della partita «In scorta · Liv. N» in oro, «Non in scorta» solo ai lettori di
  schermo, «Registrata · Liv. N»; nella scheda Oggi, sotto i 768 px, «Guida completa» è un pulsante-icona nella riga dei giorni e la
  sezione della fascia ha 8 px di imbottitura; nel cassetto del Confidente, con l'invito SMS acceso, una fascia oro ferma in cima con
  «Spegni», il pulsante dell'invito col bordo oro e «×1,2» in oro sui pulsanti dei punti. In Denaro e squadra, al posto dello schizzo (denaro
  fermo, solo gli oggetti che scorrono), la colonna di sinistra di 340 px (denaro e oggetti) scorre tutta insieme nella sua area con bordo:
  gli oggetti si vedono bene, il denaro esce scorrendo (scelta dell'utente sugli screenshot a 1280×689, «Variante: colonna intera», 01/11).
  Nelle righe dei compagni ritratti più grandi su richiesta dell'utente del 01/11 («un po' più grandi»), resi a 64 px (prima 44), interi;
  le righe sono alte almeno 76 px; a 1024 vanno su due linee, perché la colonna della squadra è stretta. Nella Scorta righe grandi
  (scelta dell'utente del 01/11, «Grandi, 2 colonne»): immagine da 88 px intera, nome da 22 px nel carattere display (un nome lungo va
  a capo, mai coi puntini), arcano con icona da 22 px e testo da 15, skill come quadrati da 28 px con l'icona dell'elemento da 22,
  livello da 40 px; righe alte 120 px, di più dove skill, nome o il segno del deposito vanno a capo; 2 colonne da 1024 px, 1 sotto. Le
  Persona in deposito restano attenuate e hanno il chip «In deposito», che non si tronca mai: accanto all'arcano se c'è posto, sotto
  se no; l'arcano sta da solo.
  Il modulo dei dati della partita si apre in una finestra («Modifica»), non in una scheda «Riepilogo».
- Un selettore solo in tutta l'app, con la ricerca da dieci voci in su.
- **Ricerca per parole ovunque (02/11)**: ogni ricerca dell'app accetta gli spazi e cerca parola per parola, in qualunque ordine
  («takemi tae», «amara medicina»); spazi doppi o ai capi non contano; maiuscole e accenti non contano, e la punteggiatura nemmeno
  («jack o lantern» trova «Jack-o'-Lantern»), anche nel Diario, dove si evidenziano le parole trovate con la loro punteggiatura. Nessuna
  ricerca che trovava prima smette di trovare; un testo di sola punteggiatura («-», «?») ora si cerca com'è, invece di mostrare tutto.
- **Filtri nell'indirizzo (L10-04)**: Compendio, Skill, Glossario, Domande e Cruciverba tengono ricerca e filtri nell'indirizzo, così
  tornando da una scheda il filtro c'è ancora e si condivide. La ricerca non riempie la cronologia; un filtro scelto con un tocco sì, e
  Indietro torna al filtro di prima. Le skill sono in ordine di nome italiano.
- **Impostazioni con l'indice (L10-08, schizzo approvato)**: in testa una fila di chip con le sezioni davvero presenti (nel rilascio solo
  le sue), ferma in cima da 768 px con la sezione corrente accesa, e l'indirizzo `#sezione`; al telefono sta in testa e scorre con la
  pagina. Niente sottotitolo che elenca le sezioni: lo dice l'indice.
- **Testi che informano (L7, 01/11)**: un testo visibile compare solo se dice qualcosa a chi gioca. Niente numeri scritti a mano che vanno
  fuori sincrono (i conteggi si ricavano dai dati o non si scrivono), niente identificativi né percorsi. Le date di gioco si scrivono in un
  modo solo, «12 aprile» (con l'articolo nelle frasi: «del 12 aprile», «dall'11 aprile»), anche nei titoli dello Storico scritti dal server
  (quelli già scritti in «MM-GG» si rendono così in lettura, senza riscrivere i dati); «22 apr» solo nei chip stretti. I moltiplicatori e i
  punti mostrati si leggono dalle regole, mai scritti a mano (anche i fattori della Forca e dell'Isolamento, i punti dell'Allarme dei cicli e
  prezzo e punti dell'Aojiru, L8-10). La scheda dei soli dati di gioco si chiama ovunque «Backup dei dati di gioco».
- Immagini mai ritagliate (`object-contain`); un tocco apre l'ingrandimento con i comandi di caricamento.

## 6. Compendio, skill e traduzioni
- Statistiche delle Persona possedute: stima del livello (+3 punti per livello in proporzione alla base) più i valori registrati
  dall'utente; nessuna fonte compatibile dà le curve di crescita.
- **Compendio a piastrelle orizzontali (L10-04, schizzo approvato)**: arte da 64 px con il cartiglio del livello, nome, arcano e affinità
  su una fila (su due file di cinque dove la piastrella è stretta, come a 1024); due colonne da 640 px, tre da 1024 (nove piastrelle intere
  a 1280×689), quattro da 1536; sotto i 640 px la riga del telefono. Con una partita attiva, e solo se veri, i segni «In scorta ·
  Liv. N» (oro) e «Nel Registro · Liv. N» (rosso), anche nella testa della scheda Persona. La vista «Elenco» non cambia.
- Aggiunta alla scorta: ogni Persona al più una volta per partita; skill precompilate con le ultime 8 apprese al livello scelto; l'aggiunta registra
  la Persona nel compendio personale col livello più alto raggiunto.
- Le descrizioni delle Persona sono testi originali in italiano sull'origine della figura, non il testo del compendio del gioco.
- La resa italiana dell'effetto di una skill (condivisa fra skill con lo stesso testo) si modifica e si ripristina solo dalla pagina
  Traduzioni. **(24/10)** Fanno eccezione i tratti: il loro effetto è la descrizione della guida, corretta dalla riga del tratto nelle Sfide
  (01/11).
- I dati di gioco che nessuna pagina mostra restano correggibili con Ripristina dal servizio unico `/api/correzioni`, senza pagine
  nuove. **(24/10)**

## 7. Fusione
- Motore fedele alle regole di chinhodado, compresi i casi non ovvi (due Demoni del Tesoro fra loro seguono la fusione normale).
- Il costo di un piano è la somma dei prezzi di evocazione dal Registro; una Persona in scorta vale 0 ma si usa una volta sola. Anche
  nella fusione diretta e nelle ricette il costo si chiama «evocazione dal Registro» e un ingrediente in scorta vale 0.
- Il filtro «fino al livello del protagonista» è attivabile, non imposto: spento di partenza in tutte le viste (Ricette, Cerca per skill,
  Piani, Cicli).
- Il prezzo di evocazione è una stima della fonte (`docs/riferimenti/bonus-velluto.md`): ogni cifra mostrata è «circa N ¥», uno 0 resta esatto.
- Primo richiamo delle Persona DLC gratuito (guida, «Palazzo di Kamoshida» e settimana 1), per ogni Persona DLC mai entrata in scorta nella
  partita: vale 0 nei piani (una volta sola per piano) e nelle ricette. I cicli restano a prezzo pieno: il loro costo è per giro e si ripete.
- Una Persona registrata senza livello (Diario, cattura, registrazione a mano) si rievoca dal Registro al livello base, con le skill apprese
  fino a lì; il Registro non cambia.
- I cicli si cercano e si salvano fino a 15 anelli (`shared/limitiFusione.ts`). I piani arrivano a 4 fusioni di profondità, con un tetto
  di calcolo: oltre, valgono i migliori trovati e la vista lo dice.
- Le date di Metatron (25/11), Yoshitsune (23/12), Satana (20/11) e Vohu Manah (18/11) sono note della Persona, come le altre: il motore
  non le applica. Le 20 celle della matrice dei Demoni del Tesoro che discordano con la guida e le note di Chimera e Alilat restano come
  sono finché non si verificano in gioco.
- Esecuzione alla Sedia elettrica: `skill_fonte_esecuzione` registra le carte dell'esito con Allarme. Eigaon resta l'esito con Allarme di
  Rangda: la guida la mette nella colonna normale insieme a Maeiga, ma una Persona ha un solo esito normale.
- I bonus si modellano solo con una fonte (affidabilità in `docs/riferimenti/bonus-velluto.md`). La fusione non trasferisce livelli
  né statistiche dei materiali.
- Le Persona che richiedono un oggetto (Black Frost, Bugs) hanno solo l'etichetta «Richiede l'oggetto»: il motore le propone comunque.
- Piani salvati come istantanea calcolata; l'avanzamento si legge dalla scorta. Valori casuali (Forca, Allarme) li inserisce l'utente.
- **Demoni del Tesoro in «Ricette speciali» (D19, 01/11)**: la tabella dei modificatori dei Demoni del Tesoro è una sezione visibile della
  vista «Ricette speciali», per tutti e anche nel rilascio (la ✎ di modifica solo nella preparazione). «Due arcani» e «Matrice completa»
  restano strumenti nascosti (`?strumenti=1`) della preparazione; nel rilascio non esistono.

## 8. Partita: Doti, Confidenti, Fortuna, denaro, avanzamento
- **Doti sociali a note**: 1♪ = 2, 2♪ = 3, 3♪ = 5 punti (7 con un libro a resa maggiorata), Fortuna ×1,5 per difetto; soglie cumulative
  del contatore. Le Doti si applicano **solo a mano**: le voci e il + del contatore delle attività propongono «Applica», mai in automatico. Le «Dote +N» della guida sono
  note, non punti.
- **Doti da segnare con «Applica» nella notifica (D7, 01/11)**: dove l'app dice soltanto «Da segnare nelle Doti» (letture, videogiochi,
  cruciverba, domande, incontri della pagina Confidenti, turni tolti), la notifica ha il pulsante «Applica», che le segna nella scheda; non
  nasce un promemoria persistente e niente si applica da solo.
- Nella scheda Doti l'interruttore «Anima da cineasta» parte acceso se la partita ha letto il libro e si può spegnere; senza il libro letto è
  spento e disattivato, con il suggerimento «Serve il libro …» (il nome del libro dai dati), e lo scalino in più non vale (utente, 01/11:
  «Spento senza libro»). L'interruttore «Libro» resta a mano **(01/11)**.
- **«Applica» è un gesto unico (31/10)**: l'anteprima non scrive nulla e mostra i movimenti del server; «Annulla» non lascia tracce;
  «Conferma» registra in una sola transazione la dichiarazione «non conteggiata» e l'applicazione.
- Alla spunta di un incontro si chiede solo «Quante note hai ottenuto?» (le note dell'ultima risposta dopo il passaggio di rango): le
  risposte migliori stanno già sulla voce, non si ripetono come scorciatoie (31/10).
- **Confidenti a note**: ♪ = 5, ♪♪ = 10, ♪♪♪ = 15 punti base; alla spunta di un incontro l'app chiede quante note (1–3). Moltiplicatori
  cumulativi (Persona dello stesso arcano ×1,5, invito ×1,2 legato all'effetto «invito» della voce, bonus degli esami solo per i 7
  Confidenti documentati), troncati all'intero a ogni passaggio. I punti si calcolano in ordine cronologico del Diario solo dalle
  spunte nuove; i valori già presenti restano la base. **(24/10)**
- La Dote che un Confidente dà arriva solo al passaggio di rango, non a ogni uscita.
- Requisiti dei Confidenti solo dalla guida Royal: un semaforo è ciò che il gioco impone (non la data consigliata, non i bonus). Le date
  di rango 1 valgono solo se la guida le dichiara come sblocco. I requisiti non verificabili diventano eventi della partita da segnare.
- **Un Confidente ha una data di avvio sola**: «Disponibile dal» è il requisito di rango 1 di tipo data (18 Confidenti su 23), letto dalla
  disponibilità e dalla scheda. La frase del requisito si genera dalla condizione; la colonna `testo` tiene solo ciò che la condizione non dice
  (la nota) e, per un avviso, l'avviso stesso; «Ripristina» riporta la nota della guida da `dati_guida.requisiti-nota-guida-v1`.
- **Date fisse di un rango**: l'eccezione `solo-date-rango` dice in quali giorni un rango si può fare, al posto dei giorni della settimana. La
  usa il Rango 7 di Ryuji, con le 24 date del suo messaggio nella guida. L'avvio del Rango 10 di Kawakami («il primo giorno di scuola dopo il
  Rango 9») non si sa calcolare: resta nelle note, e il calcolo non cambia.
- **Ingressi fuori dalla spunta**: oltre alla spunta del Diario restano, dichiarati, l'invito avvenuto, la Persona messa in scorta dalla
  scheda, la registrazione nel compendio e l'Allarme delle fusioni.
- Gli editor della pagina Confidente (informazioni, requisiti, ranghi, disponibilità) sono finestre uguali con un solo Salva a piè di
  finestra; i requisiti salvano insieme tutti i ranghi cambiati, e il motivo di una modifica alle informazioni è facoltativo.
- Relazione romantica: dato della partita per Confidente, con il giorno d'inizio; si segna dalla scheda o scegliendo alla spunta del
  passaggio al rango 9; vale per gli incontri dopo il rango 9 e per i doni «se fidanzata».
- **2026-10-25 — Fortuna e pesca**: la Fortuna è uno stato momentaneo della partita, acceso dall'interazione con Chihaya o
  dall'interruttore in Doti, e finisce al cambio di giorno. Doti, voci del Diario e Aojiru applicano il ×1,5 comune; la Perizia della
  pesca con la Fortuna confermata legge invece la propria regola (`puntiBase` + `bonusFortuna`, modificabili): col valore di fabbrica
  (2 + 1) il risultato coincide, con altri valori può differire, ed è voluto.
- **Yen**: le spese delle voci spuntate (acquisti, effetto yen negativo) scalano da sole il saldo, mai sotto zero, e l'azione resta
  possibile anche con il saldo insufficiente; togliendo la spunta torna solo quanto scalato. I guadagni legati a voci ed eventi (paga
  dei lavori, ricompense delle Richieste, effetto «Yen ricevuti») entrano da soli. Restano manuali i soldi delle battaglie e delle
  vendite nei Palazzi e nei Memento. Gli yen già scritti in un altro dato (film, attività, lavori, pesca, Richiesta) li muove
  l'elemento collegato, mai la voce; un effetto Yen della voce accanto a quel dato è ammesso solo con una condizione «Vale solo se»,
  come correzione voluta, e l'editor avvisa del rischio di contare due volte **(01/11)**. Il denaro si imposta anche a un valore nuovo.
- **Avanzamento automatico**: spuntata l'ultima voce di giorno senza decisioni aperte, la partita passa alla sera; spuntata l'ultima di
  sera, al giorno dopo (con la richiesta del meteo). Con decisioni aperte avanza alla chiusura dell'ultima. Togliere una spunta non
  riporta indietro.
- Il meteo si segna per fascia nella partita e non blocca nulla.
- Contenuti della partita: «Salvataggio di Persona 5 presente» e «Contenuti scaricabili posseduti» (i set di Persona del gioco) si segnano
  nella finestra «Modifica» della partita. Un dato solo per i contenuti scaricabili: lo leggono la Fusione e le condizioni delle voci.
- Lo storico della partita è scritto dal backend nella stessa transazione della modifica; ogni evento nato da una voce mostra la
  provenienza.
- «Annulla ultimo» nel cassetto del Confidente si legge dallo storico, così non si perde ricaricando (D6, 01/11): annulla l'ultima
  registrazione del Confidente (i punti di una risposta o di un'uscita segnati dalla pagina, o un regalo con la sua consegna) solo se rango e
  punti sono ancora quelli di subito dopo; un cambio di rango o un'altra variazione dei punti la rendono non annullabile. Annullata, il suo
  evento esce dallo storico e torna annullabile quella di prima. I punti segnati dalla pagina compaiono nello storico come «Punti di un
  Confidente».

## 9. Diario (la guida giorno per giorno)
- La giornata della guida è canone, in ordine esatto; le correzioni alle voci valgono per tutte le partite. Le date dei Palazzi seguono
  il percorso della guida italiana, con nota della differenza dalle date Royal. **(24/10)**
- La voce è l'unico gesto che produce effetti sulla partita; ciò che una voce ha applicato si toglie togliendo la spunta (letture e
  visioni comprese): una lettura torna al valore di prima solo se vale ancora quello scritto dalla spunta, altrimenti resta e la spunta lo
  dice; le Doti restano a mano e il loro promemoria se ne va. La spunta di una voce di Palazzo non segna i passi (restano Entra/Esci).
- Un giorno è «coperto» se ha almeno una voce: si calcola, la colonna `giorno.coperto` non si legge più.
- Il server non rifiuta una coppia tipo/collegamento fuori dalla regola, avvisa solo se è nuova: le voci-eccezione già salvate restano com'erano.
- Una voce del Diario validato già spuntata dice, nell'editor e nella conferma d'eliminazione, che modificarla tocca quelle spunte.
- Nella Home la prima casella del giorno sta entro la piega a ogni formato: trama, vincoli e avvisi si ripiegano dietro la freccia della scheda,
  che ne dice il numero; il Diario e la pagina Partita mostrano la scheda per intero.
- Gli effetti di una voce sono un solo elenco, tutti allo stesso livello, con un editor per tipo. Tipi di effetto anche per yen,
  oggetto ricevuto, trofeo, sblocco di una Richiesta o di un lavoro, Persona (solo Compendio o anche scorta), Persona tolta, punti del
  Confidente in note, uscita di un oggetto (restituito o venduto).
- Un effetto di stato aggiunto o cambiato su una voce già spuntata vale subito in ogni partita con la spunta; per le spunte di prima
  con effetti mai applicati si propone un elenco voce per voce, applicato solo con l'approvazione.
- Una voce collegata a un elemento che porta già una Dote non la raddoppia; le ricompense di una Richiesta completata le applica solo
  la Richiesta.
- Una voce può dichiarare quando è dovuta («Si fa solo se»): se la condizione è falsa la voce è «Non dovuta», non si spunta e non ferma
  la fascia.
- Un effetto della voce può dichiarare quando vale («Vale solo se»), con lo stesso vocabolario e lo stesso valutatore, allo stato della
  partita al giorno della voce: solo yen, oggetto ricevuto, Persona, trofeo e sblocco. Con la condizione falsa l'effetto non si applica, non
  diventa proposta e nella partita non si mostra; fuori dalla partita «Il gioco dà» lo dice con «Solo se». La condizione si legge alla
  spunta. Un effetto con condizioni diventato vero dopo la spunta (un'impostazione della partita accesa dopo) segue la via unica degli effetti
  nati dopo la spunta: entra nell'elenco da approvare della partita, yen compresi («Applica», e approvandolo gli yen entrano da soli come alla
  spunta); tornato falso, la sua proposta aperta si chiude. Ciò che è già applicato resta finché non si toglie la spunta.
- Lo Scaffale con lo scatolone del Leblanc (12 aprile) dà le ricompense del salvataggio di Persona 5 (50.000 ¥, Catena di perline ×3,
  Perlina rigenerante ×3, dall'elenco dei bonus della guida) solo con il salvataggio, e registra nel Compendio le Persona dei contenuti
  scaricabili posseduti, set per set. La pagina «Oggetti» della guida cita invece Mela Hogyoku e Band-Ace come bonus del salvataggio, senza
  quantità: resta nota, vale l'elenco dei bonus. Gli oggetti, i costumi e gli yen dei pacchetti a pagamento non hanno una fonte con nomi e
  quantità: non sono effetti.
- La candidatura a un lavoro (voce del Cercalavoro) sblocca il lavoro: il lavoro è disponibile solo dopo la spunta. Allo stesso modo la
  Richiesta «Se scomparissero i gatti» si accetta solo dopo la spunta dell'indagine nei vicoli di Yongen-Jaya del 2 giugno, che ne
  scopre il bersaglio.
- Quantità negli acquisti facoltativa (1 se non indicata).
- Copia, Taglia e Incolla delle voci con gli appunti di sistema, e appunti fissi delle voci che si ripetono: solo nella preparazione.
  Dopo un incolla si esce dalla selezione come con «Fine», anche dalla scelta a caselle, e le fasce chiuse delle voci arrivate si
  riaprono **(01/11)**.
- Appunti fissi per categorie: la lista senza categoria in cima (col titolo solo se ci sono categorie, e a schermo anche vuota, come posto
  dove rilasciare), poi le categorie nel loro ordine, che si aprono e si chiudono dall'intestazione; le categorie chiuse si ricordano per
  dispositivo. Un appunto e una categoria si spostano trascinando la maniglia ⠿ (col dito dopo una pressione lunga) o con le frecce sulla
  maniglia; rilasciato in una categoria chiusa, l'appunto va in fondo e la categoria si apre; la categoria si cambia anche dalla matita
  dell'appunto (in fondo a quel gruppo). Durante la ricerca il riordino è fermo. Eliminando una categoria i suoi appunti non si perdono:
  passano in fondo alla lista senza categoria. Nomi unici senza distinguere maiuscole né accenti **(02/11)**.
- Gli oggetti citati da una voce si aprono in un pannello sopra il Diario, con ritorno alla stessa posizione.
- I 173 eventi del calendario restano eventi collegati per chiave alle voci, non diventano voci. **(24/10)**

## 10. Mondo e mappe
- Gerarchia: Città → Quartiere → Area → Planimetrie → Luoghi; Città → Palazzo → Area → Planimetria, con le infiltrazioni legate alle
  Aree; Città → Memento → Dedalo → Area, senza planimetrie. Iweleth è un solo dedalo dei Memento; il Palazzo di Maruki resta un
  Palazzo **(24/10)**.
- Ogni nodo ha una sola «casa», calcolata dal server. Nella Città la mappa apre il mappamondo, la scheda apre il quartiere.
- **«Bloccato» vuol dire assente dalla mappa attiva, non cancellato**: il catalogo si consulta sempre con lo stato e il motivo; sulla
  mappa ciò che è bloccato non compare, salvo il comando esplicito che lo mostra marcato; l'azione è vietata (409). Un indirizzo con
  `?spillo=` non rivela un pin bloccato.
- Lo sblocco di un quartiere è una regola strutturata (data, rango di un Confidente, libro, Palazzo), anche con «oppure» (Asakusa: Ann
  rango 7 oppure Skytree aperto dal libro).
- Le condizioni di visibilità dei pin sono assolute; un pin può dipendere dallo stato di un altro pin o di una voce della guida.
- Quattro categorie di spillo; la destinazione di uno spostamento è «mappa + spillo». Un pin può appartenere a più voci della guida; una
  voce con più pin è fatta quando lo sono tutti.
- Una planimetria contiene più aree della guida e un'area può stare su più planimetrie. Una planimetria senza niente da raccogliere è
  completata.
- **Palazzo «concluso» e «completato»**: concluso = Tesoro raccolto e boss finale sconfitto, e governa ingresso, presenza sulla mappa di
  Tokyo, requisiti e condizioni «dopo il Palazzo»; completato = concluso e tutti gli oggetti permanenti fatti, e vale solo per anello,
  percentuale e segno «Completato».
- Un Palazzo senza la voce del boss finale dichiarata non può risultare concluso: nella preparazione la sua scheda lo segna «Boss
  finale da dichiarare», con il collegamento che apre «Modifica › Boss finale»; nel rilascio il segno non c'è. **(31/10)**
- Il Tesoro di Futaba e di Maruki è un pin che l'utente colloca dall'editor quando lo vede in gioco: nessuna fonte ne dà la posizione. **(09/11)**
- **Biglietto da visita**: dove la guida non scrive un termine, vale la sua regola generale («entro il giorno prima della scadenza») come valore
  calcolato in lettura, mai salvato, con un solo punto di calcolo (`letteraDelPalazzo`, `shared/datePalazzo.ts`). Il termine scritto prevale
  sempre (Madarame). Shido ha il 12/12 scritto, perché la guida fa cadere lettera e furto nello stesso giorno; Maruki non ha lettera, perché la
  guida non la nomina. **(09/11)**
- **Pin e voci dei Palazzi non validati**: un pin si collega a una voce con una migrazione solo se l'abbinamento è univoco nei due versi e
  riscontrato sulla guida, e mai se una partita ha già uno stato su quel pin o su quella voce; gli altri restano all'editor con il motivo
  annotato. Una voce doppia della guida diventa «Racconto» invece di essere fusa. **(09/11)**
- Iweleth è un dedalo, ma i suoi forzieri e mini-boss tengono il tipo che avevano da Palazzo; le altre voci convertite restano Trama. **(09/11)**
- Una Persona aggiunta a mano a un dedalo si collega alla sua Ombra, o ne crea una dell'utente con i dati ignoti vuoti, e così compare nelle
  Ombre e in «Dove si incontra». **(09/11)**
- **Voci descrittive della guida**: una voce «Altro» fuori dalle aree dei dedali si legge e basta (niente stato, niente pin, non conta nel
  completamento). Se l'utente le dà il carattere «Permanente» o «Si ripropone» è una voce da segnare come le altre: ha la casella, i
  pin, e conta negli oggetti dell'infiltrazione. Senza carattere, o con «Racconto», resta descrittiva. La regola è una sola per server e
  interfaccia (`puntoDescrittivo` / `sqlVoceDescrittiva` in `shared/spilli.ts`); togliere quel carattere a un «Altro» con dei pin si
  rifiuta come farne una voce descrittiva (409). **(31/10)**
- **Una sola guida nel visore**: ogni visore (a schermo intero e incorporato) ha la stessa guida da usare, dal pulsante «Guida», su ogni
  mappa che può avere voci della guida: casella ottenuto/riapri con la conferma della scheda del Palazzo, dettagli e pin centrabili nella
  voce, voci fatte nascoste, le Persona da catturare con la piastrella della scheda, finestra spostabile da 1024 px, foglio dal basso su
  telefono e tablet. Si usa e basta: le voci si correggono nella scheda del Palazzo. La vecchia lista testuale dei contenuti non c'è più in
  nessuna mappa; la radice dei Memento manda alla sua scheda, dove stanno i dedali, e una sezione chiesta con `?area=` si apre lì. Con la
  scheda del Palazzo la guida del visore condivide, senza copie: il salvataggio dello stato con le notifiche delle voci toccate, la cattura
  nel compendio, la conferma di «Riapri», le regole della voce (descrittiva, conteggio delle segnate, voce segnata in vista, passi sotto l'Enigma, voce da
  catturare) e le piastrelle di cattura. Restano propri del visore la casella, il conteggio delle da segnare, i pin centrabili e la finestra; propri della scheda i filtri
  per tipo, le planimetrie dell'elenco e la modifica. **(31/10)**
- **Avanzamento nelle carte dei Luoghi (L10-03, schizzo approvato)**: con una partita le carte dei Palazzi e dei dedali dicono «N su M punti
  segnati» con una barra (e «· completato» solo quando sono segnati tutti; un Palazzo concluso nel gioco con punti ancora da segnare non
  ha segni in più), con gli stessi numeri delle loro pagine, calcolati una volta sola dal server: per un Palazzo i punti segnati su
  tutti i punti dell'indice dei Palazzi, per un dedalo gli elementi che fanno il suo completamento (timbri, uno per timbro, Richieste e
  Trama). Le Persona del dedalo restano contate a parte («catturate») e non entrano nel totale, come vuole la regola del completamento
  (2026-10-11): così la percentuale della pagina del dedalo e la riga della carta sono lo stesso calcolo. Ogni percentuale di avanzamento
  (dedalo, Memento, Palazzo) è per difetto: il 100% compare solo a lavoro finito. Nella fila delle aree del Palazzo (768–1279 px) ogni chip
  ha una seconda riga con lo stesso testo del foglio («2 da prendere su 2»), sempre in 44 px.
- **Timbri per dedalo (Q8, 09/11; scelta dell'utente del 10/11: «Numeri per dedalo»)**: ogni dedalo ha il totale che gli dà la guida; i tre
  per cui la guida non dà un numero (Qimranut, Chemdah, Iweleth) non contano i timbri e lo dicono, senza valori inventati. Nessun totale
  generale si impone: la scheda dei Memento dice una volta, come informazione, la somma dei dedali (153) e il totale dichiarato (123); il 150
  della guida sta solo nel blocco `timbri-dei-dedali` e nella sfida del Covo «Timbri ovunque», che lo chiede per il premio. I timbri contano nel completamento del dedalo, uno per timbro, e nessuna voce di Trama ripete il loro numero.
- **Eligor nei Memento (scelta dell'utente del 10/11: «Solo a Chemdah»)**: il Cavaliere bellicoso sta solo nel Dedalo di Chemdah, come la «Guida
  ai Memento» (r.287); la pagina di Aiyatsbus che lo elenca (r.125) non vale. Il Palazzo di Kamoshida non cambia.
- **Requisiti di Palazzo delle Richieste (Q9, 09/11)**: valgono le pagine dei Dedali; il Palazzo serve a raggiungere il bersaglio, quindi sta fra
  le condizioni per completare la Richiesta, non fra quelle che la sbloccano. La pagina «Richieste nei Memento» dà solo date e ranghi.
- **Richieste**: il posto si cambia in un punto solo, la sezione «Dove» del modulo; il nome del bersaglio è facoltativo con un'Ombra del
  compendio, e vale quello dell'Ombra. **(09/11)**
- **Memento al telefono (L10-10, schizzo approvato)**: sotto i 768 px i nove dedali sono una griglia di pulsanti da 44 px sempre in vista,
  e il pozzo è solo il loro sfondo, attenuato e non toccabile; «Pozzo dei Memento» non è più nel menu «Altro». Tablet e desktop come prima.
- Nessuna immagine ufficiale nel repository: le planimetrie le carica l'utente nell'istanza. I pezzi delle planimetrie (zone
  dell'immagine posate sulla mappa con condizioni) si definiscono una volta e si posano più volte.
- Il Cestino rimette le eliminazioni della guida e delle mappe.
- «Colloca …» di una planimetria da collocare rilegge le aree del contenitore scelto anche quando l'elenco dei quartieri e dei Palazzi
  cambia a finestra aperta (decisione dell'utente del 01/11); un'area scelta che dopo la rilettura non c'è più non si manda.
- L'editor delle mappe copia e incolla gli spilli con gli appunti di sessione, mai con quelli di sistema. Niente «Da posizionare» nel
  pannello dell'Area né «Schermate di riferimento» nell'editor.
- Posizionare un luogo su una planimetria dà l'Area solo a un luogo che non ne ha una. Un luogo che sta in un'altra Area dello stesso
  quartiere non si sposta: il server risponde `luogo-di-altra-area` e l'Area si cambia dal modulo del luogo.
- Un luogo si colloca da una migrazione solo se tutti i suoi pin indicano una sola Area del suo quartiere. Libreria Nagiuri, Odaiba Seaside Park
  e Stazione di Shibuya restano da collocare: il pin della prima sta sull'illustrazione del quartiere, le altre due non hanno pin.
- Lo sblocco di un quartiere è solo la sua condizione (`quartiere.condizioni_json`) con gli inviti (decisione dell'utente del 9/11).
  Nella conversione delle frasi un quartiere conta come datato se la sua condizione contiene una data: Ikebukuro, Odaiba e Maihama non
  contano più, Kanda/Jinbocho e Roppongi sì.

## 11. Negozi, oggetti, regali e attività
- Il «dove» di un negozio o di un'attività è uno solo: la sede (`sede_chiave`, un luogo). Il quartiere si ricava dal luogo della sede e
  non si salva; il testo libero «Come trovarlo» non esiste più (se portava un'informazione in più sta nella nota del negozio). Senza
  sede non c'è quartiere (oggi solo il negozio del Palazzo di Niijima). Un pin di città punta al punto vendita o al luogo, mai a
  un'«attività». Effetto e statistiche di un'offerta sono quelli del suo oggetto nel catalogo.
- Ogni macchina documentata è un punto vendita (riga `negozio`) con offerte e scorta proprie e una sola sede: non esistono listini
  condivisi né sedi aggiuntive. Il luogo dice dove, il punto vendita che cosa si compra, il pin quale. Il pin indica la macchina se
  si sa quale; quando le fonti non lo dicono resta sul luogo, senza attribuzioni per ordine o posizione (Akihabara, Shinjuku, il
  terzo pin dell'edificio della Shujin): quel pin non mostra la merce di una macchina scelta, porta alla pagina del luogo con tutte le
  macchine. Una macchina può non avere pin: esiste nel suo luogo e in «Dove si compra». Le due macchine
  del Tornello della linea Ginza sono punti vendita propri con i listini di prima, per indicazione dell'utente, senza segno «da
  verificare». Il prezzo che la guida dà incerto (Arginade e Acqua della rinascita a Shinjuku) resta senza valore, col motivo nella
  nota dell'offerta. Regole sulle scritture nuove in `shared/puntoVendita.ts`: una sede per punto vendita, pin nell'Area della sede,
  un pin per punto vendita; un luogo che vende non resta senza punti vendita (spostati o nascosti), salvo una riga «In attesa: motivo»
  nelle sue note, nemmeno eliminandoli; un luogo con punti vendita si elimina solo dopo averli spostati o eliminati; una planimetria
  non cambia Area se un suo pin di punto vendita ne uscirebbe; nascondere un luogo intero, reversibile, nasconde con lui i suoi punti
  vendita. Un luogo nuovo che vende può nascere senza punto vendita finché
  l'editor del posto non li crea insieme.
- La disponibilità di negozi e articoli «a un dato momento» è l'insieme delle condizioni della guida italiana Royal; il «disponibile
  dal» mostrato si ricava dalla condizione strutturata.
- Il catalogo degli oggetti è separato dall'equipaggiamento con statistiche; un oggetto ha una sola identità e un solo testo
  d'effetto. Gli effetti degli oggetti sono testo informativo, salvo quelli che incidono su ciò che l'app gestisce (Doti, punti dei
  Confidenti, yen, Fortuna, letture, consumi, sblocchi), modellati con i tipi di effetto dell'app.
- Scorta dei negozi: l'offerta torna secondo la regola di rifornimento dell'articolo (dalla guida o, dove la guida tace, dell'utente);
  si barra solo il pezzo unico.
- Lo sconto di un negozio dal rango di un Confidente (Clinica di Takemi) è un dato del negozio; il prezzo resta quello dell'offerta.
- **Televendite**: Set A e Set B sono due articoli distinti; ogni domenica si compra un set o nessuno, scelto alla spunta; senza set non
  c'è consegna (la voce della consegna è dovuta solo con un set comprato la domenica prima).
- Regali: reazione strutturata (+3/+2/+1), ogni regalo a un Confidente regalabile già incontrato, regalo ripetibile con consumo di copie;
  la Cartolina si spedisce. Dei regali si modificano anche l'oggetto del catalogo collegato, dove si compra, costo e nota **(24/10)**.
- Esiti delle attività in una colonna dell'attività; si scelgono alla spunta. Fabbricazione: lo strumento e la quantità stanno nella
  voce, alla spunta solo l'interruttore «Bonus» sì/no; ogni fabbricazione è uno strumento.
- La spunta non chiede un dato che ha già **(04/11)**: l'esito scritto nella voce vale da solo; se il giorno della voce nella partita non
  lo permette per il tempo, vale il suo unico gemello che differisce solo per tempo e note (la Bistecca nostalgica con la pioggia). Con il
  meteo di quel giorno non segnato, un esito legato al tempo si chiede. Lo stesso per il piazzamento d'esame già segnato in Partita. La
  spunta chiede solo quando il dato manca o quel giorno non vale. Il set delle televendite si sceglie sempre: si ricompra ogni domenica.
  Gli esiti e le condizioni di una voce si valutano col giorno, la fascia e il meteo della voce, non con quelli correnti della partita.
- Lotteria: esito «vinto / non vinto» alla spunta e trofeo; gli yen della vincita a mano; un solo chiosco.
- **Doti delle attività**: ogni attività che dà Doti le ha strutturate, fisse o negli esiti, e il turno le porta nel promemoria
  «Applica»: con la spunta della voce sulla voce, con il + del contatore in Partita → Progressi sotto l'attività (lo stesso «Applica»).
  Il − toglie il promemoria non ancora applicato; quello applicato resta e nasce la proposta inversa, come togliendo una spunta. L'avviso
  «Da segnare nelle Doti» resta solo per un turno tolto con il − che non viene dal + (registrato da una voce o prima del registro). Biliardo e sala giochi Gun About: la
  guida dice una Dote a caso esclusa la Gentilezza (per Gun About nessuna fonte), senza note: Dote e note si scelgono alla spunta.
  Freccette: da 1 a 3 note di Perizia, scelte alla spunta. Frui-te al Diner: Fascino ♪ e Conoscenza ♪♪ come li dà la fonte, senza un
  esito con la pioggia (nessuna fonte lo dice). La Dote dei test di Takemi è quella dei passaggi di rango del Confidente.
  Bonus a caso o senza note documentate (bagno con la pioggia, Coraggio in biblioteca, Caffè bollente e Sandwich al Diner) restano in
  parole; il bagno vale per giorno della settimana, salvo l'esito dichiarato dalla voce.
- Voci del Diario e attività: una voce si collega all'attività quando ne nomina una sola; due attività in alternativa («X o Y») restano
  senza collegamento, due fatte entrambe hanno un turno ciascuna. Delle 38 voci lasciate dalla 312: 7 collegate, 4 già collegate, 27
  senza collegamento (gru, alternative, elementi che non sono attività), ognuna con il motivo nell'audit della migrazione 333.
- Doni dei Confidenti: arrivano da soli nella partita quando la loro regola vale (rango massimo, relazione romantica), letti dalla regola
  anche nelle partite già avviate. I doni «se fidanzata» (pegni del 24 dicembre, cioccolati del 14 febbraio, dolci) arrivano solo
  con la relazione con quella Confidente; i giri choco del 15 febbraio con il rango massimo e senza relazione con lei («restare amici»).
  Con chi si passa il 14 febbraio si sceglie alla spunta della voce di San Valentino, fra gli esiti possibili con le relazioni della partita
  (con l'unica fidanzata, con una di più fidanzate, con nessuna ignorando le richieste della ragazza, senza fidanzata): dalla scelta arrivano,
  come dice la guida Royal, il cioccolato di Ryuji (richieste della ragazza ignorate) e quello di Sojiro (almeno una fidanzata con cui non si è
  passato del tempo). Il Rampino di Morgana arriva con il suo passo segnato nella guida del Palazzo di Kamoshida. Il Sacchetto di carta di
  Iwai non è un dono che arriva da sé: la guida lo lega alla vendita della medaglia del 4 maggio e alla restituzione del 6 maggio, voci del
  periodo validato.
- Big Bang Burger: le voci si collegano all'articolo della sfida; la frase di sblocco resta come nota dell'attività. **(24/10)**
- Lavori con il quiz o il bouquet (Triple Seven, Rafflesia): le Doti e la paga stanno solo negli esiti, come a Ore no Beko; l'esito si sceglie
  alla spunta di una voce nuova, le spunte già date non cambiano. Il «dove» di un'attività nel registro è il nome della sede.
- Dove le due pagine della guida concordano sulle date, un articolo le segue (Razione militare: dal 17/4 al 14/8 e dal 7/12 al 19/12). Requisiti e
  clienti del Crossroads restano come sono finché non si verifica in gioco. Un piatto senza dati non dice che i dati mancano: la colonna Prezzo
  ed Effetto compaiono solo se almeno un piatto li ha.

## 12. Domande, esami, negoziazione, pesca
- Il premio di ogni domanda in classe e dei quiz TV è quello della guida (Conoscenza ♪, con le eccezioni documentate) e vive negli
  effetti della voce del Diario che segna la domanda; i risultati degli esami hanno la loro voce, con il piazzamento scelto alla spunta.
  Le risposte senza punti danno 0 punti. Il testo «Che cosa dà» si modifica solo dove c'è già (la domanda del 25 aprile), non si offre per le altre.
- Domande d'esame solo nelle righe di `domanda`, con la data. **(24/10)**
- Negoziazione: si cerca la domanda (è l'unica cosa che si legge mentre l'Ombra parla); il carattere è un colore.
- Calendario: il giorno della settimana si calcola dalla data (9 aprile = sabato); meteo e sblocchi senza fonte restano vuoti. Le 21 serate
  della cantante al Jazz Club sono eventi di tipo consiglio.
- Pesca, «Registra una visita» (L10-09, D18): tre passi (Quando, Cosa hai pescato, Riepilogo) con gli stessi dati del modulo unico di
  prima. Giorno e fascia partono da quelli della partita, l'ordine dopo l'ultima visita di quella fascia (si corregge con «Cambia»), il
  riepilogo li ripete per primi. «L'avevi già contata nelle attività?» compare solo se ci sono visite contate senza dettaglio (turni del
  contatore non collegati o visite contate prima). Il tocco su «Registra la visita» è la conferma, senza spunta: la protezione è
  l'anteprima obbligatoria, perché il server registra solo con la firma dell'anteprima della stessa richiesta (`revisionePescaAttesa`) e la
  ricalcola prima di scrivere. Aggiungere una registrazione a una visita già segnata è un comando della visita. Le frasi dell'anteprima
  (`esitoPrevisto`, `conseguenze`) le scrive il server in parole da giocatore. «Da applicare» completa la pesca di una voce già fatta con
  lo stesso foglio in tre passi (decisione dell'utente del 01/11): giorno e fascia sono quelli della voce e non si cambiano (si scelgono solo
  se la voce non li ha), per una visita nuova «L'avevi già contata nelle attività?» si fa sempre, senza risposta già scelta, e va data per
  andare avanti; al primo passo la voce si può invece aggiungere a una visita già segnata quel giorno e in quella fascia (con i dati della
  visita com'erano): allora la domanda non si fa e vale il turno di quella visita. Il
  foglio non scrive: «Rivedi la proposta completa» passa la richiesta con la firma dell'anteprima della pesca alla decisione della voce
  (`applica-effetto`), che ha la sua anteprima «Confermi?». Le tre osservazioni incompatibili (tentativi oltre rango + 2, pesce dopo i tentativi fatti, uscita senza ritirare i premi con la Perizia
  ricevuta) sono una regola sola (`incoerenzeOsservazionePesca`), letta dallo schema del server e detta prima dell'anteprima dal foglio in tre passi e da «Correggi la visita».

## 13. Grafica
- Asset originali in stile P5R, generati da IA con ogni testo in italiano e la variante senza testo; nessuna copia delle illustrazioni
  ufficiali. Prima di chiedere un asset si controlla se esiste fra gli originali estratti del gioco.
- Grafica predefinita del compendio e dell'interfaccia: si copia in `public/asset/` e il manifest si genera da solo; il resto della
  grafica si carica nel database. L'app funziona anche senza alcun asset.
