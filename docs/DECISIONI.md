# Decisioni in vigore — project-p5r

Le scelte che spiegano perché l'app si comporta così, raccolte per area e scritte nella forma di oggi. Le decisioni superate non ci
sono più: la loro storia è nella cronologia di git. Il «come» (tabelle, servizi, componenti) sta in [`ARCHITETTURA.md`](ARCHITETTURA.md).

Le voci segnate **(24/10)** vengono da una giornata di lavoro di cui l'utente ha sospeso le approvazioni fino a una verifica e a una
sua riconferma: il codice oggi le applica, ma vanno riconfermate prima di costruirci sopra.

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
- Il pacchetto completo (con le immagini) resta fuori da git per il limite di dimensione di GitHub; niente LFS per ora.
- **Due istanze dallo stesso codice**: preparazione (scrittura dei contenuti, un solo proprietario) e rilascio (contenuti in sola lettura,
  partite per utente). La modalità è fissata nella build (punto d'avvio `server/rilascio.ts`, `VITE_MODALITA=rilascio`), mai in una
  variabile dello stack; la sola lettura ha tre livelli più il bundle senza editor; il rilascio non migra e si ferma se l'edizione non
  coincide con il manifesto.
- Deploy: immagini su GitHub Container Registry da GitHub Actions dopo il gate CI; nessuna porta pubblicata, frontend sulla rete del
  proxy, backend solo sulla rete interna. La preparazione si aggiorna da sola (Watchtower esterno, solo label); il rilascio ha versioni
  fisse e nessun aggiornamento automatico.
- Repository pubblico: niente indirizzi delle istanze, nomi utente, chiavi o dati personali nei documenti; nel deploy restano solo i
  nomi indispensabili, con i valori nelle variabili dello stack.

## 4. API e tecnica
- **2026-10-03 — Niente CORS**: il frontend è sulla stessa origine (proxy Vite in sviluppo, nginx in produzione) e l'API non ha
  autenticazione propria nella preparazione, quindi un'altra origine non deve poterla chiamare dal browser dell'utente.
- Documentazione dell'API generata (OpenAPI 3.1 dagli schemi zod, descrizioni in italiano in un registro), servita dall'istanza senza
  CDN; «Prova» spenta per i metodi che scrivono.
- Errori 4xx di Express e del body-parser resi nell'envelope in italiano (413, 400); mai un 500 in inglese per un caso ordinario.
- Il client ripete solo i metodi idempotenti; POST, PATCH e i PUT relativi non si ripetono.
- I test restano nel repository ma girano solo su richiesta, sul percorso indicato; non girano nella pipeline a ogni push.
- Il numero di una migrazione non si riserva: si prende il primo libero al momento del commit. I test che chiamano funzioni tolte su
  decisione dell'utente diventano `it.skip` con un commento, non si cancellano. **(24/10)**
- Immagini caricate: PNG, JPEG, WEBP, GIF, SVG; una per entità, la nuova sostituisce; servite con rivalidazione ETag e URL versionato,
  così una sostituzione si vede subito.

## 5. Interfaccia
- **Tre formati** verificati sul continuo delle larghezze: nessuno sbordo orizzontale; sotto i 768 px file di schede e filtri
  scorrevoli invece di righe di pulsanti. L'intestazione di una pagina occupa al più il 30% dell'altezza a ogni formato.
- Navigazione: barra in basso (telefono e tablet) con Home, Compendio, Fusione, Partita, Guida; Skill dal chip in testa al Compendio,
  dalle schede Persona, dalla Home senza partita e, da 1024 px, dalla barra laterale. Briciole a due livelli, «Vai al contenuto»,
  fuoco sul titolo dopo ogni cambio di pagina.
- Tipografia in rem (radice al 93,75%), testo informativo ≥ 12 px; 11 px solo per quattro segni fitti (etichette dei pin, percentuale
  dello zoom, targhette «LV», iniziale di riserva dei ritratti). I caratteri P5 caricati valgono per titoli e parole grandi; i titoli
  dei pulsanti `PulsanteVisivo` restano nel carattere display maiuscolo.
- Colori: rosso del tema `#e5352b` per fondi, bordi e asset; rosso come testo `#ff6359` e testo secondario `#8e8ea0` **(24/10)**;
  rosso d'errore come testo `#fb7c7c`. I colori degli spilli restano quelli autorati, anche gli otto molto chiari: è una scelta, non una dimenticanza.
- Pulsanti con figura: i pulsanti di solo testo sono convertiti; restano di testo gli «Annulla» delle finestre e i pulsanti a solo
  simbolo con nome accessibile. Ogni chiave d'icona nasce con una riserva SVG in codice.
- Conferme con `DialogoConferma`, mai `window.confirm`; una sola vista d'errore. Le finestre non si chiudono cliccando lo sfondo
  (selezionando del testo si chiudevano per errore).
- Pulsanti occupati con `aria-disabled` (non perdono il fuoco); regioni `aria-live` per notifiche e totali.
- Le bozze dei moduli non si salvano nel browser: ricaricando, una modifica non salvata si perde. **(24/10)**
- La pagina Partita mantiene il suo aspetto; eccezioni approvate: finestra «Regala» in Confidenti; riga «Giorno e fascia
  dell'incontro» come avviso, matita «Modifica» con Ripristina accanto a ogni Dote, scheda «Persona della partita» **(24/10)**. Il modulo dei dati
  della partita si apre in una finestra («Modifica»), non in una scheda «Riepilogo».
- Un selettore solo in tutta l'app, con la ricerca da dieci voci in su.
- Immagini mai ritagliate (`object-contain`); un tocco apre l'ingrandimento con i comandi di caricamento.

## 6. Compendio, skill e traduzioni
- Statistiche delle Persona possedute: stima del livello (+3 punti per livello in proporzione alla base) più i valori registrati
  dall'utente; nessuna fonte compatibile dà le curve di crescita.
- Aggiunta alla scorta: una Persona per partita; skill precompilate con le ultime 8 apprese al livello scelto; l'aggiunta registra
  la Persona nel compendio personale col livello più alto raggiunto.
- Le descrizioni delle Persona sono testi originali in italiano sull'origine della figura, non il testo del compendio del gioco.
- La resa italiana dell'effetto di una skill (condivisa fra skill con lo stesso testo) si modifica e si ripristina solo dalla pagina
  Traduzioni. **(24/10)**
- I dati di gioco che nessuna pagina mostra restano correggibili con Ripristina dal servizio unico `/api/correzioni`, senza pagine
  nuove. **(24/10)**

## 7. Fusione
- Motore fedele alle regole di chinhodado, compresi i casi non ovvi (due Demoni del Tesoro fra loro seguono la fusione normale).
- Il costo di un piano è la somma dei prezzi di evocazione dal Registro; una Persona in scorta vale 0 ma si usa una volta sola.
- Il filtro «fino al livello del protagonista» è attivabile, non imposto.
- I bonus si modellano solo con una fonte (affidabilità in `docs/riferimenti/bonus-velluto.md`). La fusione non trasferisce livelli
  né statistiche dei materiali.
- Le Persona che richiedono un oggetto (Black Frost, Bugs) hanno solo l'etichetta «Richiede l'oggetto»: il motore le propone comunque.
- Piani salvati come istantanea calcolata; l'avanzamento si legge dalla scorta. Valori casuali (Forca, Allarme) li inserisce l'utente.

## 8. Partita: Doti, Confidenti, Fortuna, denaro, avanzamento
- **Doti sociali a note**: 1♪ = 2, 2♪ = 3, 3♪ = 5 punti (7 con un libro a resa maggiorata), Fortuna ×1,5 per difetto; soglie cumulative
  del contatore. Le Doti si applicano **solo a mano**: le voci propongono «Applica», mai in automatico. Le «Dote +N» della guida sono
  note, non punti.
- **Confidenti a note**: ♪ = 5, ♪♪ = 10, ♪♪♪ = 15 punti base; alla spunta di un incontro l'app chiede quante note (1–3). Moltiplicatori
  cumulativi (Persona dello stesso arcano ×1,5, invito ×1,2 legato all'effetto «invito» della voce, bonus degli esami solo per i 7
  Confidenti documentati), troncati all'intero a ogni passaggio. I punti si calcolano in ordine cronologico del Diario solo dalle
  spunte nuove; i valori già presenti restano la base. **(24/10)**
- La Dote che un Confidente dà arriva solo al passaggio di rango, non a ogni uscita.
- Requisiti dei Confidenti solo dalla guida Royal: un semaforo è ciò che il gioco impone (non la data consigliata, non i bonus). Le date
  di rango 1 valgono solo se la guida le dichiara come sblocco. I requisiti non verificabili diventano eventi della partita da segnare.
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
  l'elemento collegato, mai la voce. Il denaro si imposta anche a un valore nuovo.
- **Avanzamento automatico**: spuntata l'ultima voce di giorno senza decisioni aperte, la partita passa alla sera; spuntata l'ultima di
  sera, al giorno dopo (con la richiesta del meteo). Con decisioni aperte avanza alla chiusura dell'ultima. Togliere una spunta non
  riporta indietro.
- Il meteo si segna per fascia nella partita e non blocca nulla.
- Lo storico della partita è scritto dal backend nella stessa transazione della modifica; ogni evento nato da una voce mostra la
  provenienza.

## 9. Diario (la guida giorno per giorno)
- La giornata della guida è canone, in ordine esatto; le correzioni alle voci valgono per tutte le partite. Le date dei Palazzi seguono
  il percorso della guida italiana, con nota della differenza dalle date Royal. **(24/10)**
- La voce è l'unico gesto che produce effetti sulla partita; ciò che una voce ha applicato si toglie togliendo la spunta (letture e
  visioni comprese). La spunta di una voce di Palazzo non segna i passi (restano Entra/Esci).
- Gli effetti di una voce sono un solo elenco, tutti allo stesso livello, con un editor per tipo. Tipi di effetto anche per yen,
  oggetto ricevuto, trofeo, sblocco di una Richiesta o di un lavoro, Persona (solo Compendio o anche scorta), Persona tolta, punti del
  Confidente in note, uscita di un oggetto (restituito o venduto).
- Un effetto di stato aggiunto o cambiato su una voce già spuntata vale subito in ogni partita con la spunta; per le spunte di prima
  con effetti mai applicati si propone un elenco voce per voce, applicato solo con l'approvazione.
- Una voce collegata a un elemento che porta già una Dote non la raddoppia; le ricompense di una Richiesta completata le applica solo
  la Richiesta.
- Una voce può dichiarare quando è dovuta («Si fa solo se»): se la condizione è falsa la voce è «Non dovuta», non si spunta e non ferma
  la fascia.
- La candidatura a un lavoro (voce del Cercalavoro) sblocca il lavoro: il lavoro è disponibile solo dopo la spunta.
- Quantità negli acquisti facoltativa (1 se non indicata).
- Copia, Taglia e Incolla delle voci con gli appunti di sistema, e appunti fissi delle voci che si ripetono: solo nella preparazione.
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
- Nessuna immagine ufficiale nel repository: le planimetrie le carica l'utente nell'istanza. I pezzi delle planimetrie (zone
  dell'immagine posate sulla mappa con condizioni) si definiscono una volta e si posano più volte.
- Il Cestino rimette le eliminazioni della guida e delle mappe.
- L'editor delle mappe copia e incolla gli spilli con gli appunti di sessione, mai con quelli di sistema. Niente «Da posizionare» nel
  pannello dell'Area né «Schermate di riferimento» nell'editor.

## 11. Negozi, oggetti, regali e attività
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
- Lotteria: esito «vinto / non vinto» alla spunta e trofeo; gli yen della vincita a mano; un solo chiosco.
- Doni dei Confidenti: arrivano da soli nella partita quando la loro regola vale (rango massimo, relazione romantica); le ricevute delle
  partite già spuntate non si ricalcolano.
- Big Bang Burger: le voci si collegano all'articolo della sfida; la frase di sblocco resta come nota dell'attività. **(24/10)**

## 12. Domande, esami, negoziazione, pesca
- Il premio di ogni domanda in classe e dei quiz TV è quello della guida (Conoscenza ♪, con le eccezioni documentate) e vive negli
  effetti della voce del Diario che segna la domanda; i risultati degli esami hanno la loro voce, con il piazzamento scelto alla spunta.
  Le risposte senza punti danno 0 punti.
- Domande d'esame solo nelle righe di `domanda`, con la data. **(24/10)**
- Negoziazione: si cerca la domanda (è l'unica cosa che si legge mentre l'Ombra parla); il carattere è un colore.
- Calendario: il giorno della settimana si calcola dalla data (9 aprile = sabato); meteo e sblocchi senza fonte restano vuoti.

## 13. Grafica
- Asset originali in stile P5R, generati da IA con ogni testo in italiano e la variante senza testo; nessuna copia delle illustrazioni
  ufficiali. Prima di chiedere un asset si controlla se esiste fra gli originali estratti del gioco.
- Grafica predefinita del compendio e dell'interfaccia: si copia in `public/asset/` e il manifest si genera da solo; il resto della
  grafica si carica nel database. L'app funziona anche senza alcun asset.
