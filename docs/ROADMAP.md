# Roadmap — project-p5r

Cosa fa l'app oggi, per aree, e cosa resta aperto. Il dettaglio tecnico di ogni area è in [`ARCHITETTURA.md`](ARCHITETTURA.md), le
regole di comportamento in [`DECISIONI.md`](DECISIONI.md). La storia delle lavorazioni è nella cronologia di git.

Stato: tutte le aree sotto sono **in uso**. L'istanza di preparazione (scrittura dei contenuti) e l'istanza di rilascio (contenuti in
sola lettura, partite per utente) girano dallo stesso codice. Schema dei dati: 371 migrazioni di gioco (l'ultima è la 371), 69 delle partite (l'ultima è la 069).

## Compendio e skill
- Compendio delle Persona Royal (`/compendio`) con scheda di dettaglio: arcano, livello, affinità, skill per livello, statistiche,
  descrizione originale in italiano, immagine; filtri e ricerca su nome canonico e italiano.
- Elenco e scheda delle skill (`/skill`), glossario dei termini (`/compendio/glossario`).
- Persona dei membri del gruppo con le loro forme, nel compendio.
- Rese italiane modificabili da Impostazioni → Traduzioni; ogni dato correggibile ha «Modifica» e «Ripristina».

## Fusione
- Fusione diretta e inversa, ricette speciali e Demoni del Tesoro, costo di evocazione (`/fusione`).
- Alberi di fusione ricorsivi ordinati per costo (fino a 4 fusioni, con un tetto di calcolo dichiarato), a partire da scorta, Registro e
  Persona catturabili; cicli di fusione cercati e salvati fino a 15 anelli; costi di evocazione mostrati come «circa».
- Eredità delle skill, ricerca per skill desiderate con propagazione a catena negli alberi.
- Bonus della Stanza di Velluto: sconti del Registro, EXP dei Confidenti, Forca, Isolamento con incensi, Gemelle, Allarme.
- Piani salvati e obiettivi per Persona.

## Partita
- Più partite, una attiva, cambio dalla barra in alto; dati della partita in una finestra (`/partita`), con il salvataggio di Persona 5 e i
  contenuti scaricabili posseduti (li leggono la Fusione e lo Scaffale con lo scatolone del Leblanc).
- Scorta e compendio personale, Persona della partita, statistiche stimate e registrate.
- Confidenti con rango, punti in note, semafori dei requisiti, inviti, relazione romantica, regali con reazione, doni ricevuti;
  scheda del Confidente (`/confidenti/:chiave`).
- Doti sociali con note e soglie, promemoria «Applica», interruttore della Fortuna.
- Denaro con i movimenti automatici delle voci e quelli a mano; oggetti ottenuti, copie, consumi e uscite.
- Progressi, trofei, storico degli eventi con la provenienza, completamento (`/guida/completamento`).
- Avanzamento automatico di fascia e giorno, meteo per fascia.

## Diario (guida giorno per giorno)
- `/guida/percorso`: le voci di ogni giorno e fascia, in ordine, con gli effetti dichiarati (Doti, Confidenti, acquisti, yen, oggetti,
  trofei, sblocchi, Persona, inviti, letture, pesca, domande, esami) e la spunta che li applica e li annulla.
- Voci con condizione «Si fa solo se», effetti con condizione «Vale solo se», voci con alternative (televendite), esiti scelti alla
  spunta, ricevute della spunta.
- Modifica completa delle voci; copia, taglio e incolla (anche fra giorni) e appunti fissi nella preparazione, raggruppati in categorie
  apribili e riordinati trascinando.
- Calendario degli eventi (`/guida/calendario`) collegato alle voci.
- Ancora aperto: le voci e le Doti mancanti dopo il 1° giugno (giorni scoperti, passaggi di rango, Doti da testo), in attesa dell'approvazione
  dell'elenco per blocchi; nessuna è stata applicata.
- Difetto aperto, indipendente dal Diario: il primo avvio da `pacchetto/gioco.db` su una cartella vuota si ferma alla migrazione 330, che legge
  `utente.spunta_voce_partita` prima che la migrazione delle partite 015 la crei.

## Mondo, mappe e luoghi
- Mappa di viaggio di Tokyo con quartieri, Palazzi e luoghi; pagine di quartiere, Area e luogo (`/guida/citta`, `/guida/luogo/…`).
- Palazzi (`/guida/dungeon`) con Aree, planimetrie, infiltrazioni, guida delle aree collegata ai pin, stato «concluso» e «completato».
- Memento con dedali, aree, Persona, Richieste e trama.
- Visore ed editor delle mappe (`/guida/mappe`): spilli in quattro categorie, condizioni di visibilità, pezzi delle planimetrie,
  passaggi, esportazione e importazione; «Dove si trova» per ogni cosa del mondo. Una sola guida da usare in ogni visore, su ogni mappa
  con voci della guida (pulsante «Guida»).
- Luoghi della guida (`/guida/mappe`): miniature delle carte dei Palazzi, dei Memento, dei loro Dedali e delle loro aree, da inserire,
  cambiare o togliere nella preparazione (file, Ctrl+V, «Incolla dagli appunti»).
- Cestino delle eliminazioni della guida e delle mappe.

## Negozi, oggetti e attività
- Negozi con orari, sede, scorta e rifornimento, sconti dal rango di un Confidente (`/guida/negozi`). Il «dove» è la sola sede;
  quartiere e raggruppamenti si ricavano da lì. Ogni macchina documentata è un punto vendita con offerte e scorta proprie. Ancora
  aperti: la finestra unica di modifica del posto; i pin che restano sul luogo finché non si vede in gioco quale macchina indicano
  (Akihabara 272-275, Shinjuku 1564-1566, edificio della Shujin 1759); un luogo nuovo che vende nasce ancora senza punto vendita, finché
  l'editor del posto non li crea insieme.
- Catalogo degli oggetti con offerte, regali, contenuti, ricette e note storiche (`/guida/oggetti`).
- Attività, lavori, libri, film, videogiochi, cruciverba, con esiti, trofei, oggetti e modificatori dei libri. Le Doti delle attività
  sono strutturate (fisse o scelte alla spunta: la Dote a caso del biliardo e di Gun About, le note delle freccette) e diventano il promemoria
  «Applica» sia alla spunta della voce sia con il + del contatore in Partita → Progressi.
- Richieste dei Memento con sblocco e scadenza (`/guida/richieste`).

## Risposte immediate
- Domande in classe, esami e quiz TV con il premio della guida (`/guida/domande`).
- Aiuto in battaglia e schede delle Ombre (`/guida/battaglia`, `/guida/ombra/:chiave`), negoziazione con le risposte Royal.
- Pesca con regole e visite della partita; Covo dei Ladri, sfide, personaggi.

## Ricerca e strumenti
- Ricerca globale su 29 tipi di cose (personaggi, tratti, cruciverba e glossario compresi), dalla barra in alto; ogni risultato porta
  all'elemento nella sua pagina. Tutte le ricerche dell'app, anche quelle dentro le pagine e nei selettori, cercano parola per parola.
- Impostazioni: partite, traduzioni, correzioni, Cestino, caratteri, grafica predefinita, backup dei dati di gioco («Importa»), copia
  dell'istanza, documentazione delle API, «Prepara edizione» del rilascio; «Informazioni» con le fonti dei dati, l'unico punto che le cita.
- Interfaccia per desktop, tablet e telefono; installabile come web app a schermo intero, con l'invito la prima volta che la Home si apre da telefono o tablet.

## Punti aperti

**Piano di intervento del 31 ottobre (approvato)**
- Analisi ECC dell'intera app (codice, dati su una copia, 55 rotte misurate in cinque formati) ordinata in dodici lotti: L0 base di
  misura, L1 difetti visibili mentre si gioca, L2 scritture sicure, L3 mappe al tocco, L4 navigazione verso l'elemento, L5
  prestazioni, L6 accessibilità, L7 testi che informano, L8 coerenza dei dati, L9 sicurezza delle due istanze, L10 miglioramenti che
  cambiano l'aspetto, L11 manutenibilità e documenti.
- Fatti: L0 (misure di base sulla copia), L1 (difetti visibili mentre si gioca; L1-01 e L1-02 secondo lo schizzo approvato per D2) e
  L2 (scritture sicure: niente ripetizioni automatiche delle scritture, errori in italiano, guida del giorno tenuta senza rete,
  «Applica» in un gesto unico) e L3 (mappe al tocco: doppio tocco e pinch sui pin, pagina che scorre col dito sulla mappa a vista
  intera, foglio e Guida che non coprono il pin, trascinamento senza ridisegni, Covo chiuso nell'indice prima del 5 maggio) e L4
  (navigazione verso l'elemento: rimandi all'elemento citato invece che all'elenco, ritorno fra mappe sorelle, quattro tipi nuovi nella
  ricerca, Confidenti con un indirizzo solo, Memento dai Palazzi, Ombre collegate dalla scheda Persona) e L5 (prestazioni: indici,
  cache dei dati di gioco del Diario e dei Palazzi, una voce sola alla spunta, pin letti in blocco, ETag del manifest, copie di avvio
  con un tetto in byte, letture condivise di «Da applicare», schede della Partita a richiesta, librerie in un file proprio; risposte
  campione identiche byte per byte; tempi mediani sulla copia: giorno del Diario −23/−39%, mappe −5/−34%, schede di Palazzo e Memento −2/−3%;
  avvio a freddo con «Slow 4G» −0,2 s).
- L6 (accessibilità) fatto: schede con le frecce, fuoco sopra la barra inferiore, titoli h1, nomi dei pulsanti delle partite, contrasti
  ad almeno 4,5:1 anche con i colori degli elementi (accesi col sì dell'utente), caselle nel rosso del tema, movimento ridotto, editor delle mappe da tastiera, fuoco nel popup del pin, Esc nella Guida, area di tocco
  di 44 px per pin e frecce, piastrelle del Compendio senza pulsanti dentro i link, stati «fatto» ed «esaurito» col segno C ovunque.
- L7 (testi) fatto: nel rilascio niente provenienza dei dati né note per chi li corregge, con le fonti in Impostazioni → Informazioni (D10);
  niente conteggi scritti a mano nella Home e nell'indice della Guida; l'elenco dei Confidenti col bonus degli esami letto dalla regola unica e
  i moltiplicatori (esami, invito, Persona dell'arcano, Fortuna, punti del libro) letti dalle costanti condivise, con lo stesso testo; via la
  frase falsa sui dati «ricaricati a ogni avvio» e un nome solo, «Backup dei dati di gioco»; via UID, firme, codici di risposta, ore ISO, fasi
  interne e percorsi `docs/…` (interfaccia e messaggi del server); date di gioco in un formato solo con l'articolo giusto anche per l'8 e
  l'11, titoli dello Storico compresi (quelli già scritti in «MM-GG» si rendono in lettura); gergo tolto («registro dei gesti», «non ancora
  gestito», «strutture fisse», i testi della pesca in parole da giocatore), «Dove si trova» con la frase del suo tipo; il costo della fusione
  è «evocazione dal Registro», 0 per gli ingredienti in scorta; la disponibilità dell'articolo nel visore dall'esito strutturato; «Stato in:
  …» al posto di «Stato nella …»; nel rilascio la negoziazione mostra le varianti del testo della domanda, senza le provenienze.
- Da L7, per L8 (correzioni ai dati, non fatte: servono migrazioni): nel pacchetto iniziale 308 testi liberi dei dati di gioco (fuori dalle
  colonne di fonte e d'archivio) citano allgamestaff, «da verificare», `docs/` o un file `.md`/`.json`; i più sono in `spillo.descrizione`
  (228), poi `dungeon.note` (8), `punto_interesse.descrizione` (7), `settimana_guida.incertezze` (9), `confidente_regalo.*` (7).
  Il conteggio sull'istanza va rifatto su una copia prima della migrazione.
  Le incertezze del calendario e della battaglia nel rilascio sono già nascoste; gli altri testi si vedono anche lì.
- Decisioni dell'utente (01/11): D1 non toccare (L8-01 resta com'è); D2 procedere; D3, D4, D5, D6 sì come proposto; D7 pulsante
  «Applica» nella notifica; D8 e D9 no (nessun tracciamento del Covo; l'annullo dell'incenso resta com'è); D10 sì; D11 no; D12 sì;
  D13 no; D14 copia della produzione in sola lettura prima delle misure di L8; D15 opzione C (segno a sinistra e nome barrato in grigio); D16 non serve riconfermare;
  D17 sì; D18 procedere; D19 «Tesoro in Ricette speciali», fatto (la tabella dei Demoni del Tesoro è una sezione delle «Ricette speciali»
  per tutti; «Due arcani» e «Matrice completa» restano nascoste con `?strumenti=1` e nel rilascio non esistono); D20 prima gli schizzi.
  Altre decisioni del 01/11, fatte: la pesca di «Da applicare» con il foglio in tre passi; «Colloca …» rilegge le aree quando l'elenco
  dei contenitori cambia.
- L8 (coerenza dei dati), stato attuale (migrazioni 335–343, utente 065–066):
  - Requisiti, date e livelli della guida che l'app sa usare (D4, 340): sblocco degli 8 Speciali, condizioni delle Gemelle e di Lavenza,
    rango 9 di Maruki entro il 17 novembre per tre finali (Royal, standard come negazione, negativo 3), arco dei Palazzi di 3 ricette, livello consigliato come numero (6 Battaglie Sfida,
    2 boss, Mietitore), 17 sfide del Covo che contano uno stato della partita (attività, lavori, contatori, cruciverba, timbri, yen spesi,
    Confidenti al rango massimo, Richieste, Compendio, livello di una Persona; i totali «tutti» contati nel DB); con lo stato nella partita.
    I testi della guida restano; i prezzi hanno già il loro punto unico (catalogo e listini).
  - Sfide del Covo senza conteggio perché la partita non tiene lo stato che contano (lacune aperte, elenco con i motivi nel censimento di
    L8-03): l'esito scelto di un turno resta solo nella ricevuta della spunta, non in uno stato che la partita conta, se non dà oggetti o
    trofei (Big Bang Burger, fuoricampo, miglior caffè e curry), i punti della pesca sono un saldo senza il guadagnato, i punti del negozio dei vestiti usati sono un saldo, le statistiche delle
    Persona sono stime salvo i valori osservati, i fiori dei Memento e le statistiche di battaglia non si tengono; Maid Café e gioco
    dell'artiglio non sono attività del DB, il Jazz Club non si conta.
  - Avvisi del giorno: un dato del giorno, modificabile dall'editor del giorno; non ripetono più le voci, la trama e i vincoli (339, e 343
    per i casi decisi il 01/11: le 13 coperte da trama o vincoli, Yoshida del 17/07, Sumire del 12/01, i doppioni di Medjed, Kaneshiro,
    Akechi e Igor, la maid del 20/07; Niijima del 31/10 riscritto; resta il 9/04).
  - Conflitti di dati del censimento degli avvisi, decisi il 01/11: voci del rango 1 di Akechi (10/06) e del rango 10 di Igor (24/12),
    «Impeto dell'Arcano superiore» al rango 6 di Igor, sblocco di «Medicina amara» sulla voce del rango 7 di Takemi (28/05) e della maid
    sulla voce del rango 8 di Kawakami (19/07) (341), lo sblocco scritto nelle partite che avevano già spuntato la voce del 28/05 come
    dalla spunta (utente 066); termine di Kaneshiro all'8 luglio, Medjed annunciato il 23/07 con scadenza il 20/08, scadenza di Niijima il
    19/11, con le date vecchie allineate anche nei riassunti delle settimane 11, 13, 15 e 28, nella trama del 21/06 e nella nota del Palazzo di
    Kaneshiro (il titolo dell'evento 51, «in 3 settimane», resta per decisione dell'utente; il blocco storico `finestre-dungeon` non si tocca), lettera a Kamoshida il 21/04 e furto del Tesoro il 22/04 in due eventi, Biliardo dal rango 2 di Akechi
    (vale dal rango 2 in su, anche con la voce del rango 3 del 13/08) (342). Hifumi: nessuna modifica (requisito e voce dicono due cose
    diverse). Okumura ed elezioni restano come la trama; le date dei Palazzi si correggono da «Correggi la scheda».
  - Archivio degli acquisti: tolte le 15 righe della partita 3, che non c'è più (utente 065).
  - Livello consigliato dei Palazzi: minimo e massimo, con il confronto delle fonti nella nota storica del Palazzo (335).
  - Capienza della scorta: posti di partenza e gradini in un solo dato (336). Richieste: sblocco dalle condizioni, scadenza dalla data, dedalo
    da `area_chiave` (337). Giorno di un'infiltrazione: quello delle voci legate a lei.
  - Cattura delle Persona: una regola sola per Compendio, alberi e cicli, con tre stati (provata, esclusa per documento, da verificare; le 62
    da verificare restano catturabili, decisione di Roberto). «Dove si incontra»: un servizio solo, Ombre della guida e dedali dei Memento.
  - Effetto dei 90 tratti: un solo testo, la descrizione della guida, in Sfide, scheda Persona, skill e fusione; si corregge dalla riga delle Sfide.
  - Livello consigliato: Kamoshida 10 e Niijima 45 visibili, confermati da Roberto.
  - Forca, Isolamento, Gemelle, cicli e Aojiru leggono i numeri dalle regole condivise. «Anima da cineasta» parte acceso col libro letto ed è
    spento e disattivato senza. Le Doti da segnare hanno «Applica» nella notifica. Le attività che danno Doti (biliardo, Gun About, Takemi,
    bagno, gabbie di battuta, Big Bang Burger) hanno le Doti strutturate.
- L8, in attesa della scelta di Roberto:
  - per 19 Persona le aree dei Memento del compendio non coincidono con le Ombre della guida (la scheda le mostra tutte e due);
  - alberi di fusione: le Persona DLC dei pacchetti posseduti non sono più proposte «da catturare», ma solo se in scorta o nel Registro
    (come già facevano Compendio e cicli);
  - le date dei Palazzi si correggono in «Correggi la scheda», ma non hanno un «Ripristina» (come nome, sovrano e note della stessa scheda).
- L8, ancora da fare: L8-01 (D1: non toccare); i gradini della capienza non hanno un editor (si correggono con una migrazione).
- L9 fatto: gli SVG caricati non eseguono script se aperti da soli (CSP `sandbox` e allegato, nell'app si vedono come prima); «Scarica da
  URL» non raggiunge la rete interna né con un IP nell'URL, né con un nome, né con un redirect (al più 5, solo http e https); i collegamenti
  alle fonti passano tutti da `urlHttp`; la CSP completa del rilascio è attiva in solo rapporto accanto a quella applicata di prima; limiti di
  memoria e di processi su ogni container, frontend del rilascio in sola lettura, guardia intera del bundle nella costruzione dell'immagine;
  lo User-Agent senza il nome utente (D17). Non fatti per D11: intestazioni nell'nginx della preparazione, limite di frequenza e tetto di
  righe nel rilascio (il tetto, confermato il 01/11: «Sì, niente tetto»). Da fare dopo l'osservazione nell'istanza vera: passare la CSP completa da solo rapporto ad applicata.
- L10-01, L10-02, L10-05 fatti, dagli schizzi approvati: da 1024 px Denaro e squadra, Confidenti, Compendio personale, Persona della
  partita e Storico stanno in una schermata (scorre solo l'elenco, nella sua area; in Denaro e squadra la colonna di denaro e oggetti scorre tutta,
  scelta dell'utente del 01/11, e a 1024 le righe dei compagni vanno su due linee); a 375 px la prima voce di «Oggi» sale da 778 a 720
  («Guida completa» come pulsante-icona nella riga dei giorni, sezione della fascia con 8 px di imbottitura); «Annulla ultimo» del cassetto del
  Confidente letto dallo storico e, con l'invito SMS acceso, la fascia oro ferma in cima al cassetto con «Spegni», il bordo oro sul pulsante e
  «×1,2» sui pulsanti dei punti.
- L10-09 fatto (D18, schizzo approvato): «Registra una visita» della Pesca in tre passi (Quando, Cosa hai pescato, Riepilogo), giorno e
  fascia della partita già messi, ordine calcolato con «Cambia», domanda sul conto delle attività solo se ci sono visite contate senza
  dettaglio, pesci a contatore, il resto in «Altri dettagli», niente spunta di conferma; «Aggiungi a questa visita già segnata» è un comando
  della visita. Le frasi dell'anteprima della pesca dette dal server in parole da giocatore.
- Da applicare: la pesca di una voce del Diario si completa con il foglio in tre passi, con giorno e fascia della voce, la domanda sul conto
  sempre obbligatoria per una visita nuova e la scelta di aggiungere la voce a una visita già segnata quel giorno e in quella fascia (allora
  vale il turno di quella visita); la richiesta firmata va
  alla decisione della voce, come prima. Il modulo unico di prima è tolto.
- L10-03/04/08/10 fatti (schizzi approvati per D20): avanzamento «N su M punti segnati» nelle carte dei Palazzi e dei dedali con gli stessi
  numeri delle loro pagine e la raccolta sotto ogni area nella fila del Palazzo; Compendio a piastrelle orizzontali con i segni della partita
  («In scorta», «Nel Registro», anche nella scheda Persona), filtri di Skill, Glossario, Domande e Cruciverba nell'indirizzo, skill per nome
  italiano; indice delle sezioni in testa alle Impostazioni; dedali dei Memento in griglia al telefono, col pozzo come sfondo; testate delle
  schede di dettaglio, dell'Area e del Palazzo entro il 30% a ogni formato.
- L11 (manutenibilità e documenti) fatto, voci da 01 a 07:
  - L11-01 e L11-05: scheda del Palazzo, visore e giorno del Diario divisi in moduli (DOM confrontato prima e dopo a 1366×657,
    1280×689, 1024×690, 768×1024 e 375×812, anche con menu, moduli di modifica, menu della voce e guida del visore aperti); la memoria del
    dispositivo in un'utilità sola, `useMedia` al posto del suo doppione nel visore, il fuoco rimesso da codice ritrovato da una chiave e non
    dal testo o dal nome (menu della voce, posto della voce, appunti fissi, guida del visore, frecce dei giorni), chiavi stabili nei 18
    elenchi modificabili con il fuoco che resta sul gesto dopo «Sposta», la classe dei campi della nota storica.
  - L11-02, L11-03, L11-04 (parte server): righe compattate del server riformattate con l'AST invariato (resta oltre i 300 caratteri
    solo il testo dei letterali: SQL, messaggi, descrizioni dell'API, DDL di base, più le migrazioni registrate e i test, che non si
    toccano); `validate` tipizzato, senza nessun cast di `req.body`, `req.query` o `req.params` nelle rotte, e nessun SQL nelle rotte
    (`condizioniService`); `RIFERIMENTI_PARTITE` completato dallo schema reale e censimento di ogni tabella e colonna di riferimento delle
    partite, che dà un avviso nel log se manca qualcosa (non blocca, decisione dell'utente del 01/11); utente 064, gli id delle partite non
    si riusano più.
  - L11-06 (D12): le dipendenze di `useCarica` controllate dalla regola di `useEffect` (`react-hooks/exhaustive-deps` con
    `additionalHooks`) ed `eslint-plugin-jsx-a11y` 6.10.2 con le regole raccomandate; lint a 0 errori e 0 avvisi, con le correzioni che non
    cambiano il comportamento né l'aspetto e, dove l'omissione o il gesto sono voluti, una disattivazione sulla riga col suo motivo.
  - L11-07: i punti aperti su bagno, centro battute e Big Bang Burger erano già allineati alle migrazioni 233, 314 e 319; commenti
    superati corretti (Iweleth fra i Palazzi, il numero delle schede della Partita, i Palazzi del Meta-Nav, documenti tolti dal
    repository); le decisioni «(24/10)» non si riconfermano (D16).
- Dipendenze di sviluppo: aggiornate le versioni corrette di vitest e `@vitest/coverage-v8` (4.1.12), `fast-uri` (3.1.9) e `undici`
  (7.30.1). Resta l'avviso su `minimatch` (GHSA-g3hv-75wg-m249, gravità moderata, solo strumenti di sviluppo: ESLint, typescript-eslint,
  jsx-a11y): la correzione c'è solo nella 11, una versione maggiore che ESLint 10 e typescript-eslint non accettano ancora; da riprendere
  quando la accetteranno.
- Edizione di rilascio con schema partite 68: alla prossima edizione il partite.db del rilascio (schema 63) va convertito una volta, su
  copia e col sì di Roberto; finché resta l'edizione attuale il rilascio funziona.
- Da L11-04, orfani reali sulla copia della produzione del 01/11 (letti, nessuna correzione fatta): 106 ricevute delle spunte e 13 proposte
  personali citano voci del Diario che non ci sono più (riferimenti già controllati prima), e con i riferimenti nuovi 24 + 27 righe del
  censimento degli stati e 6 movimenti automatici di yen. Sono fotografie di voci eliminate: l'anteprima dell'«Importa» ora le elenca.
- Aperti: L8 (le voci sopra) e L10 (le proposte non ancora fatte). Restano da decidere anche i ritratti tondi ritagliati (`RitrattoPersonaggio`, `SceltaQuale`) e le
  immagini a copertura nel CSS (`.illustrazione-segno__immagine`, `.carta-arcano-mini`), contro la regola «immagini mai ritagliate». Restano attenuati con l'opacità, fuori da D15, i luoghi «non ancora» di `QuartierePage`
  e le Persona in deposito (`.riga-persona--deposito`): da rivedere per il contrasto.

**Lavori aperti**
- **Testata della Mappa senza planimetria, da verificare.** `MappaPage` mostra `LuogoSenzaPlanimetria` (con le briciole) solo per una mappa
  senza planimetria che ha per casa il visore: oggi nei dati non ce n'è nessuna. Quando un dato la mostrerà, va misurata (testata entro il
  30% ai cinque formati) e controllata la fila delle briciole.
- **Vecchia lista dei contenuti della guida.** `ContenutiGuidaMappa` (con `SchedaContenutoGuida` e `GET /api/mappe/contenuti/:chiave`)
  non è più montata da nessuna pagina: la tengono in vita soltanto i suoi test (`ContenutiGuidaAccesso.test.tsx`,
  `OrganizzazioneMappe.test.tsx`, `SchedaContenutoGuida.test.tsx`), che non si cancellano senza il sì dell'utente.

- **Un solo «dove» dei negozi: un residuo.** Otto negozi di Shibuya aperti dal 18 aprile hanno la data solo sulle offerte (la guida la dà anche
  per il negozio): la Lotteria di Shibuya la porta sul negozio, gli altri otto vanno uniformati.

**Riservato all'utente**
- Collaudo automatico completo della ricerca globale: lo esegue l'utente.
- Proposte di conversione delle voci del Diario aperte in «Da completare» (periodo dal 1° aprile al 1° giugno): 43 «da verificare» (lo yen
  dello Scaffale del 12 aprile è chiuso dalla 330, con la condizione del salvataggio di Persona 5) e 8
  «probabili», più 4 certe lasciate (le tre «Concimare la pianta…», che dipendono dal tipo di bionutrimenti usato, e lo yen del bagno
  del 26 maggio, da decidere con la sua «da verificare»). Il conteggio va riletto nella pagina prima di decidere.

**Domande all'utente sui doni dei Confidenti**
- I doni hanno la regola della guida, valutata sulla partita (`doniConfidenti.ts`, il dono vale finché la regola vale): i dolci «se
  fidanzata» (10) e i giri choco del 15 febbraio (11) dalla 329, il Rampino di Morgana dal suo passo nel Palazzo di Kamoshida dalla 332; i
  cioccolatini di Ryuji e Sojiro arrivano dall'esito di San Valentino scelto alla spunta della voce del 14 febbraio (331).
- Resta il Sacchetto di carta di Iwai: la guida lo lega alla vendita della medaglia di Kamoshida del 4 maggio (sbirciando nel sacchetto) e
  alla restituzione del 6 maggio. Sono due voci del periodo validato già spuntate: «oggetto ricevuto» e «restituito» su quelle voci
  cambierebbero le partite, quindi decide l'utente.

**Grafica**
- Caricare nell'istanza di preparazione le 4 illustrazioni delle attività nuove (`docs/grafica/asset-generati/2026-10-29/attivita/`:
  estrazione della lotteria, concimare la pianta, fabbricazione degli strumenti, fabbricazione di Kawakami) con
  `PUT /api/immagini/attivita/<chiave>`; poi la cartella si toglie dal repository.
