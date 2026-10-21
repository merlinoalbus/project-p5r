# I71 — Aojiru: implementazione rilasciata e perimetro osservato approvato

Data: 2026-10-21. Stato: **RILASCIATO814b17d8, PIPELINE81 RIUSCITA; GATE FINALE DEL PERIMETRO OSSERVATO APPROVATO**.

Questo dossier raccoglie il contratto trasmesso in quattro parti e le sei
integrazioni richieste dal revisore indipendente, che ha approvato integralmente
il gate della soluzione. Non costituisce un consuntivo di implementazione.
Numeri assegnati dalla Regia: **gioco 136, partite 028**; 135 appartiene ad A12.
La Regia ha autorizzato l'implementazione dopo la pubblicazione135. Il contratto
approvato precede il codice: le sezioni di soluzione restano la sua base di confronto.
Durante l’analisi della soluzione non sono state eseguite migrazioni locali,
prove, simulazioni o scritture ai database. Il consuntivo del rilascio è nel §19.

## 1. Mandato e perimetro

Risolvere I71 mediante consumazioni effettivamente confermate, mantenendo i dati
esistenti e completando le dipendenze necessarie del Diario. Non basta correggere
la frase «1 punto», né interpretare una casella «Acquistato» come un consumo.

Riferimenti originali: L6 `requisiti.md` e `modifiche.md`, L10 `requisiti.md`
R10-01/02/08/10/12/14/15/21/22/23/29/30/31 e `modifiche.md` §§1.1–1.3,
3.5–3.7, alla revisione **43ad8889**. R6-31 è il requisito di impaginazione
dell'editor e dell'elenco; I71 compare nel manifest di riconciliazione corrente.
Il riferimento al manifest non trasforma R6-31 in una regola di gioco.

Parti L10 nuove comprese nella proposta, da approvare come perimetro:

- fonte degli effetti e writer unico per creazione, modifica, copia, spostamento
  ed eliminazione delle voci;
- adattatori dei tre tipi già supportati e nuovo effetto acquisto, con receipt
  nuovi distinti dai receipt legacy;
- registrazioni/provenienze degli acquisti e annullamento della sola fonte;
- proposte persistenti D6/D8, consenso sul già conteggiato e ciclo completo di
  applicazione, inverso e riattivazione;
- roundtrip, orfani e cestino per questi dati, compresa la loro presenza nella
  cancellazione/ripristino di una voce, negozio o partita.

Non si dà per esistente il motore L10. Questa sezione non completa i suoi altri
tipi di effetto, il motore cronologico dei ranghi, gli inviti e gli altri
requisiti del lotto: restano nel mandato complessivo e non sono dichiarati
completati da I71. Il perimetro qui indicato va concordato con la Regia prima
dell'implementazione, senza lasciare a metà i cicli descritti nel dossier.

## 2. Regole di gioco provate

In Royal Aojiru costa 5.000 yen, è disponibile la domenica e non consuma una
fascia. Il guadagno base è **2 punti interni**, visualizzati come **1 nota**.
La rotazione è Fascino → Perizia → Coraggio → Gentilezza → Conoscenza; saltare
una domenica non fa avanzare il succo offerto. Fonti:

- [Megaten Database, Overworld — Aojiru](https://aqiu384.github.io/megaten-database/p5r/overworld.html),
  sezioni Aojiru e Musical Notes;
- [GameFAQs, Royal — How to Use](https://gamefaqs.gamespot.com/ps4/260936-persona-5-royal/faqs/78212/how-to-use),
  sezioni Aojiru Rotation e Musical Notes for Stats;
- [GameFAQs, Royal — Tips and Tricks](https://gamefaqs.gamespot.com/ps4/260936-persona-5-royal/faqs/79923/tips-and-tricks),
  domenica, ordine esplicito della rotazione;
- [AGS, Coraggio in Royal](https://www.allgamestaff.it/come-aumentare-il-coraggio-in-persona-5-royal/),
  distinzione fra regola e date dell'itinerario.

Non si introduce un calendario assoluto di varianti. Le quattro voci pubbliche
con due note non sono una prova di errore: la stessa guida contiene la Lettura
della Fortuna pertinente; la base di due punti con quel bonus dà tre punti,
visualizzati come due note. Quelle voci ed i loro effetti RAW restano intatti.

La fonte esaminata non basta a imporre una nuova UNIQUE per giorno come quota
di gioco. Una data coincidente produce un avviso di possibile duplicazione e
la possibilità di collegare un fatto esistente, non un abbinamento automatico.

Il pin 1486 del chiosco dei succhi è distinto da 1487 KiyasuKu e 1494
distributore. Questa proposta non autorizza raccordi fisici o nuovi luoghi.

## 3. Codice esistente e alternative

### 3.1 Parti esistenti riutilizzabili

`EffettoAzione` supporta soltanto `dote`, `lettura`, `turno`.
`effettiAzioneService` applica i domini già presenti e produce promemoria Doti;
non contiene un ramo acquisto né una coda persistente D6/D8.
`giornataService.spuntaVoce` conserva un receipt in `effetti_json` e una spunta
già presente, normalmente, non riesegue gli effetti. `impostaAcquisto` scrive
una presenza booleana per `(partita_id, articolo_chiave)`.

| Percorso attuale | Responsabilità da rispettare |
| --- | --- |
| `negoziService` 134, 154, 174, 277 | DTO, insieme acquistati e unica scrittura diretta della presenza |
| `disponibilitaService` 135, 139 | articoli ottenuti e spesa per negozio |
| `luoghiScritture` 105, 141 | riepilogo eliminazione e cancellazione, senza/con conferma |
| `pacchettoGiocoService` 66 | riferimenti delle partite per il controllo orfani |
| `cestinoService` 315 e seguenti | ripristino con PK correnti e fotografie RAW |
| `catalogoOggettiService` 43; `mappeService` 344 | proiezioni complete degli acquisti |
| API partite; `AcquistiOfferta`; `ArticoliTabella`; `OfferteDellOggetto` | gesto della presenza nel listino/catalogo |
| `useMappaPartita`; `VisoreMappa`; `SchedaContenutoGuida` | stesso gesto dalle mappe |

Sono censite tutte le scritture SQL dirette a `acquisto_partita`, oltre allo
schema ed alla migrazione storica, che non si modificano.

### 3.2 Scelta proposta

Estendere la **famiglia acquisti** con registrazioni e provenienze normalizzate.
La tabella `acquisto_partita`, la sua PK e le sue righe RAW restano identiche.
La figlia non richiede una riga booleana padre: altrimenti una consumazione nuova
obbligherebbe a scrivere un secondo stato derivato.

Alternative scartate nel contratto, da sottoporre al gate:

- contatore nuovo in `attivita_svolta_partita`: manca la provenienza per
  consumazione e duplica l'identità del prodotto;
- nuova PK di `acquisto_partita`: le vecchie fotografie del cestino non hanno
  l'ID nuovo; il ripristino usa la PK corrente e perderebbe l'identità storica;
- conteggio da `evento_partita`: l'evento si può cancellare senza annullare il
  dominio e non ha un momento di gioco obbligatorio.

## 4. Schema proposto: migrazione partite 028

I nomi sotto sono nuovi; nessuna di queste capacità è già implementata.

### 4.1 Famiglia acquisti

`utente.acquisto_registrato`:

- `id`: UUID di 32 cifre esadecimali, PK immutabile;
- `partita_id`: FK alla partita, con identità composta unica `(partita_id,id)`;
- `articolo_chiave`: riferimento logico, senza FK a main;
- momento di gioco dichiarato: giorno, fascia, ordine nel giorno;
- prezzo in yen e snapshot dell'identità leggibile dell'offerta;
- `dati_json` tipizzato: regola/versione Aojiru, variante osservata fra le cinque
  Doti, base due punti, Fortuna `true|false|null`;
- `legacy_firma` nullable e tuple legacy RAW associata, solo dopo consenso;
- data di creazione.

La presenza attiva si **calcola** dalle provenienze esistenti: nessuna colonna
contatore e nessun bool derivato. La riga del fatto può restare senza fonti
attive per conservare la sua identità durante inversi e ripristini; non conta
come consumazione attiva. I campi osservati non vengono riscritti da un raccordo.

`utente.acquisto_provenienza`:

- UUID PK immutabile, partita, UUID dell'acquisto, tipo `manuale|diario`;
- per il Diario: UID voce, UID effetto stabile, ordine dell'effetto al momento
  dell'applicazione; per il gesto manuale questi campi sono null;
- data di creazione e riferimento all'operazione;
- FK composta `(partita_id,acquisto_id)` verso lo stesso acquisto e partita;
- unicità della fonte attiva Diario `(partita_id,voce_uid,effetto_uid)`.

`utente.acquisto_operazione`:

- PK `(partita_id,operazione_id)`, verbo e identità dell'operazione;
- payload validato e serializzato canonicamente, ricevuta immutabile;
- serve al replay, non al conteggio delle consumazioni;
- una rimozione di fonte non cancella la sua ricevuta d'operazione.

Il lettore unico restituisce la presenza legacy e le registrazioni con fonti,
separatamente. `acquistato` è l'unione derivata; DTO e UI distinguono presenza
storica non quantificabile, consumazioni e provenienze.

### 4.2 Proposte e ricevute L10

Si introducono `effetto_applicato`, `da_applicare`, `movimento_yen` con il
significato delle specifiche originali. Il receipt contiene versione, identità
della causa e dell'effetto, stato precedente pertinente e riferimenti alle
sole risorse/provenienze possedute. Il formato legacy resta distinto.

Per la macchina degli stati, `da_applicare` conserva anche:

- chiave della causa fisica, tipo/chiave dell'effetto ed unità;
- ciclo della causa e revisione del saldo attribuito;
- delta richiesto, eventuale proposta inversa di riferimento;
- decisione esplicita e applicazione con prima/delta effettivo/dopo;
- motivo e autore della chiusura: utente oppure causa non più attiva;
- eventuale riconoscimento esplicito «conteggiato altrove», distinto da una
  scrittura eseguita dall'app.

Gli stati originali `aperta|applicata|scartata` possono essere conservati:
la chiusura automatica usa `scartata` con motivo tipizzato
`non-piu-dovuta`, `chiusa_da=causa` e dicitura UI «Non più dovuta». Non viene
presentata come uno scarto dell'utente. Una decisione umana non si cancella.

Non ci sono FK con cancellazione a cascata da voce, articolo, acquisto o fonte
verso proposte e ricevute di applicazione. Eliminare la causa non deve perdere
il delta necessario per l'inverso. La cancellazione dell'intera partita è
raccolta nel cestino privato come blocco completo, prima della cascata.

## 5. Transizione e writer unico degli effetti — integrazione 1

Gioco 136 introduce `voce_effetto`, `proposta_effetto_voce` e un registro di
transizione per UID della voce. Quest'ultimo distingue esplicitamente:

- `convertita`: anche una lista valida vuota è convertita;
- `legacy-da-correggere`: RAW non convertibile con motivo e impronta.

Ogni effetto canonico ha un UID stabile, oltre al suo ordine. Riordinare una
lista non cambia l'identità di un effetto né il receipt di una spunta precedente.
La migrazione converte meccanicamente uno a uno i tre tipi esistenti validi,
registra il RAW sorgente e non modifica alcuna colonna della voce. Non deduce
acquisti da nomi, date o spunte. Un nodo ignoto/non convertibile non viene
scartato per far risultare riuscita la conversione della voce.

### 5.1 Un solo ingresso di scrittura

Il servizio canonico degli effetti gestisce le operazioni nella stessa
transazione della relativa voce:

| Operazione | Contratto |
| --- | --- |
| Creazione | crea UID voce/effetti nuovi; scrive gli effetti canonici e marca la fonte canonica |
| Modifica degli effetti | valida tutta la lista e la revisione attesa, conserva gli UID invariati, crea UID solo per nuovi effetti |
| Modifica di altri campi | non riscrive né normalizza gli effetti, il RAW legacy o i receipt |
| Copia | nuovo UID voce e nuovi UID effetti; copia solo configurazione, mai check, fonti acquisto, proposte personali o receipt |
| Spostamento | mantiene UID/configurazione; modifica solo il posto della voce; non ridata una consumazione già registrata |
| Eliminazione | passa dal cestino, rimuove le sole fonti possedute nelle partite e riconcilia le proposte; conserva gli altri fatti/fonti |
| Ripristino | ripristina la medesima identità, senza ricreare applicazioni; verifica collisioni e saldi correnti |

La copia di una voce non convertibile conserva il RAW ed il medesimo stato
esplicito di fallback sul nuovo UID: non inventa una lista canonica vuota.
Per le eliminazioni di voci il tipo main `voce-diario` viene aggiunto in 136
conservando integralmente vecchie righe, ID, UID e sequenza del cestino. Partite
e provenienze personali rimangono invece nel cestino utente.

Gli editor attuali e le API di creazione/modifica/copia vengono aggiornati per
chiamare questo writer. Il campo compatibile `produce` viene letto dal modello
canonico ed è adattato ai tipi esistenti. Non continua a scrivere un
`produce_json` ignorato. Un client che invia effetti senza la revisione/identità
necessaria riceve un errore esplicito, non un falso successo. Una sostituzione
parziale che ometta un nuovo acquisto non può cancellarlo implicitamente.

`produce_json` delle voci esistenti rimane il RAW storico fino alla fase di
pulizia prevista. Non si legge insieme alla fonte canonica per produrre due
effetti. Un eventuale ripristino di questo RAW non può attivarlo implicitamente:
passa dalla stessa anteprima di transizione.

### 5.2 Fallback non convertibile

Il reader restituisce stato, RAW e motivo visibile. Una nuova spunta che
richiederebbe di interpretare quel RAW è bloccata con errore circoscritto, non
presentata come «nessun effetto». Le modifiche che non riguardano gli effetti
restano possibili senza riscriverlo. La correzione esplicita mostra prima/dopo,
valida la nuova lista e passa al writer canonico conservando il RAW precedente.

Una vecchia spunta usa **sempre il receipt già memorizzato**:

- assenza della versione nuova significa formato legacy, non applicazione da
  ricostruire dalla nuova configurazione;
- nessuna riesecuzione al cambio del reader, alla migrazione o al caricamento;
- un nuovo effetto confermato su una voce già fatta produce solo una proposta;
- la successiva applicazione esplicita aggiunge un receipt nuovo separato;
- togliere la spunta annulla il receipt legacy secondo il suo formato e i nuovi
  receipt posseduti secondo il loro, senza convertire o perdere campi ignoti;
- receipt malformato/incoerente: 409 prima delle mutazioni, conservazione del
  documento e del dato, nessun reset o stato zero inventato.

## 6. Proposte: saldo e cicli completi — integrazione 2

### Precisazione attuativa: versioni e sostituzione

L'UID identifica il nodo: gli effetti invariati e i duplicati distinti mantengono
il proprio UID anche nel riordino. Una modifica mantiene l'UID e cambia la
versione descritta dalla configurazione e dal receipt. Non si abbina un nodo
per nome o somiglianza. La sostituzione di una versione già applicata produce
una proposta esplicita con prima/dopo e ID del receipt precedente.

Il consenso ritira la versione precedente e applica la nuova nella medesima
transazione. Per una Dote della stessa causa B resta derivato dalle decisioni:
si propone T nuovo meno B. Un acquisto ritira soltanto la provenienza posseduta
dal nodo, riconcilia il vecchio fatto e registra o collega il nuovo; eventuali
altre fonti del fatto precedente restano attive.

Le nuove spunte conservano ricevute legacy per nodo, attribuite dall'ordine
effettivamente eseguito in un'unica chiamata al dominio legacy, e fotografie
delle risorse turno/lettura nominate. Se la lettura è avanzata o ridotta, il
turno è cambiato o il suo ordine è stato riusato successivamente, la sostituzione
restituisce 409 prima delle mutazioni. Non ripristina una fotografia sopra lo
stato corrente. Una vecchia spunta senza sidecar attribuibile rende la
sostituzione non applicabile/da riconciliare: non diventa un'aggiunta implicita.
Un effetto distinto si aggiunge con gesto esplicito e UID nuovo.

Il receipt precedente resta immutato nei contenuti; `sostituita_da` e il puntatore
inverso del successivo descrivono una catena validata. L'undo globale esclude
soltanto le porzioni legacy dimostrate già ritirate, per non annullarle due volte.
L'annullo integrale registra inoltre l'identità della spunta (`fatta_at` e RAW
del receipt) come ricevuta di contesto già annullata: il ripristino di quella
stessa spunta non può annullare una seconda volta risorse successive. Il contesto
di incontro e questi annulli hanno tipo esplicito `contesto`, senza fabbricare
un nodo canonico Dote inesistente. Malformazioni o catene incoerenti danno 409.

Per applicare una proposta di effetto non acquisto il payload non contiene
campi Aojiru; acquisto completo e token sono obbligatori solo per il tipo
acquisto. La chiamata legacy storica riguarda il solo effetto selezionato,
senza rieseguire incontro o intera spunta. Le richieste di una nuova spunta
possono includere tutte le consumazioni con le rispettive anteprime: i token
sono verificati tutti prima della prima mutazione e il gruppo è atomico.

La chiave di beneficio è `(partita, UUID acquisto, tipo, chiave, unità)`.
Si distinguono due quantità:

- **T**: delta dovuto da quel fatto attivo, oppure zero se non ha più fonti;
- **B**: somma dei delta attribuiti al beneficio tramite applicazioni esplicite
  registrate e riconoscimenti espliciti «già conteggiato altrove».

B non è il valore attuale della Dote/portafoglio e non lo ricostruisce da quel
valore. È derivato dalle ricevute durevoli, non un secondo contatore Aojiru.
Il delta della proposta è `T - B`. Una sola proposta aperta può rappresentare
quel saldo/revisione. Aggiungere una seconda fonte allo stesso fatto non cambia
T, il ciclo né la decisione su una proposta già scartata dall'utente.

Esempio con beneficio `+2`; per yen il segno iniziale è `-5000`:

| Situazione | T | B | Esito |
| --- | ---: | ---: | --- |
| nuovo fatto, nulla applicato | 2 | 0 | proposta +2 |
| positiva applicata | 2 | 2 | nessuna proposta |
| ultima fonte rimossa | 0 | 2 | una inversa -2 |
| fonte riaggiunta prima dell'inversa | 2 | 2 | inversa chiusa «Non più dovuta», nessuna nuova positiva |
| tentativo tardivo di applicare quell'inversa | 2 | 2 | 409 per revisione non più corrente; nessuna mutazione |
| inversa già applicata, causa ancora assente | 0 | 0 | nessuna proposta |
| riattivazione dopo inversa applicata | 2 | 0 | una nuova proposta +2, da approvare |
| nuova positiva scartata, causa ancora identica | 2 | 0 | scarto rispettato, nessuna ricreazione periodica |
| positiva mai applicata, ultima fonte rimossa | 0 | 0 | proposta aperta chiusa, nessuna inversa |

Una transizione inattiva→attiva o una nuova rettifica esplicita del beneficio
apre un ciclo; il solo numero delle provenienze non lo fa. Ripetere i cicli
conserva sempre B dalle ricevute: non si presume che una proposta sia applicata
perché chiusa o scomparsa dalla vista.

Applica usa un token CAS che comprende saldo/revisione della causa, proposta e
valore attuale destinatario. Dentro la transazione rilegge tutto. Se la fonte
torna prima dell'applicazione, il vecchio inverso non è più dovuto; se l'inverso
è applicato prima, la riattivazione propone il delta positivo. Nessuna corsa
può eseguire entrambi come se il proprio snapshot fosse ancora corrente.

Il replay di uno stesso ID/payload verifica prima identità e ricevuta storica,
prima del CAS divenuto stale. Restituisce l'esito storico, non muta il valore
corrente. ID con identità/payload diverso dà 409. Limiti di yen/Doti non saturano
in silenzio: prima/delta/dopo coincidono con quanto approvato o la TX fallisce.
Un inverso applica il delta esplicito al valore corrente approvato, non ripristina
un totale vecchio cancellando correzioni manuali successive.

## 7. Dote storica già segnata — integrazione 3

Un promemoria legacy non attesta se l'utente abbia già aggiornato la Dote.
Né il valore attuale né il testo/nome della voce lo possono dimostrare.

Confermando il raccordo storico, il riepilogo mostra separatamente:

1. la consumazione ed i suoi dati osservati;
2. l'effetto-Dote preesistente associato, con RAW conservato;
3. il conteggio già effettuato, con scelta iniziale **non dichiarata**.

Scelte di fatto disponibili:

- **Già conteggiata**: registra una dichiarazione esplicita della quantità già
  conteggiata, distinta da «Applicata dall'app»; non modifica la Dote e non
  crea una nuova proposta positiva per quella stessa quantità;
- **Non ancora conteggiata**: consente di proporre il delta, che resta comunque
  da applicare con il gesto separato;
- **Non so**: raccordo conservato, beneficio da verificare, Applica disabilitato
  finché non è chiarita la quantità già conteggiata.

Se la quantità dichiarata differisce dal beneficio confermato, la proposta
mostra soltanto la differenza, con motivo e consenso. Uno scarto generico non
equivale a «già conteggiata». Lo stesso principio vale per yen storici già
registrati manualmente. Una rimozione successiva può proporre l'inverso della
quantità riconosciuta, ma non la sottrae mai automaticamente.

La rappresentazione del vecchio promemoria da parte del nuovo acquisto è
approvata esplicitamente per UID/effetto: non si sommano due proposte riferite
alla stessa Dote della stessa consumazione. I RAW di una/due note restano
invariati. Fortuna null significa bonus non attestato, non false: nessun
bonus maggiorato viene indovinato.
Per Fortuna non dichiarata il beneficio maggiorato resta da verificare: la UI
mostra la base certa, senza presentarla come totale completo già attestato.

## 8. Una tuple legacy e un fatto fisico — integrazione 4

`legacy_firma` fotografa esattamente `(partita_id,articolo_chiave,updated_at)`
con i valori RAW. La firma non prova una consumazione: occorre la dichiarazione
esplicita e una fonte confermata sul fatto fisico.

Un indice unico su `(partita_id,articolo_chiave,legacy_firma)` dove la firma
non è null impedisce anche transazionalmente che due registrazioni rappresentino
la stessa tuple. Una registrazione inattiva conserva l'identità: si riprende
quel medesimo UUID, non se ne crea un altro per aggirare l'unicità.
Più provenienze devono collegarsi allo stesso acquisto.

Per `collega:id`, dentro la TX si confrontano almeno:

- stessa partita e stessa identità dell'offerta;
- giorno, fascia e ordine dichiarato del fatto;
- variante osservata;
- prezzo in yen;
- Fortuna, con null distinto da false;
- versione della regola e identità della fonte.

Qualsiasi divergenza dà 409 con le differenze: non collega, non sovrascrive e
non crea automaticamente un secondo fatto. Il draft resta disponibile.
L'eventuale associazione di una tuple legacy ancora non associata è solo un
collegamento esplicito, verificato con CAS e unicità; non modifica i campi
osservati dell'acquisto.

La spesa legge una sola volta il contributo del fatto confermato. Il contributo
legacy è soppresso solo se la tuple corrente corrisponde esattamente alla firma
di una registrazione **attiva**. Senza tale dichiarazione rimane la semantica
storica della presenza; le nuove consumazioni devono essere dichiarate ulteriori
oppure collegate a quel segno. Nessun confronto per nome/data fa la scelta.

Per Aojiru, dal rilascio del nuovo gesto non si creano nuove presenze legacy:
`fatto=false` può eliminare solo quella già esistente; `fatto=true` è no-op se
la stessa presenza esiste già, altrimenti restituisce il rimando esplicito al
gesto di consumazione. Gli altri articoli mantengono il loro percorso attuale.
Questa precisazione sostituisce la prima formulazione generica secondo cui un
`true` avrebbe potuto creare ancora una presenza Aojiru non quantificabile.

## 9. Disponibilità e momento dichiarato — integrazione 5

La proposta non usa `statoAlGiorno(statoAttuale, dataPassata)` come una cronaca
dei progressi: Doti, ranghi, eventi, sedi e disponibilità attuali non provano
quelli di un altro momento.

- **Gesto nel momento corrente della partita**: può valutare il normale stato
  attuale, riletto nella TX e incluso nel CAS.
- **Altro momento dichiarato**: verifica il formato/data esistente e le regole
  calendariali provate (domenica per Aojiru), espone versione della regola,
  variante/costo dichiarati e segnala le condizioni storiche non ricostruibili.
  La registrazione è un'osservazione esplicita dell'utente, non un esito verde
  di disponibilità storica calcolato dai suoi progressi attuali.

Il DTO distingue `calendario`, `condizioniStoricheNonRicostruibili` e
`osservazioneUtente`; non sintetizza «disponibile allora» dalla conferma.
Una data incompatibile con la regola settimanale non viene accettata in silenzio:
il riepilogo conserva la bozza e richiede la correzione del momento effettivo,
senza spostare o riscrivere la voce del Diario. La variante resta osservata,
mai desunta dal numero di settimane o dal riferimento del testo.

Il saldo yen attuale non dimostra né impedisce una spesa avvenuta in passato.
Serve soltanto al successivo Applica esplicito della proposta corrente, con CAS.
Una partita senza giorno non riceve una data iniziale inventata: il momento va
indicato. Le lacune dello storico restano dichiarate; il prossimo succo è
«atteso secondo le consumazioni registrate», non certezza su consumi mancanti.

## 10. Rimozione, orfani, restore e import — integrazione 6

### 10.1 Proprietà e cancellazioni

- Rimuovere una fonte cancella quella provenienza nel cestino privato.
  Altre provenienze conservano l'attività del fatto e le loro decisioni.
- Alla perdita dell'ultima fonte il fatto diventa inattivo; si riconcilia il
  saldo delle proposte con la macchina degli stati, senza muovere Doti/yen.
- Eliminare una voce dal Diario raccoglie configurazione, check e receipt;
  annulla le sole fonti possedute. Un receipt non leggibile blocca l'intera TX.
- Una conferma di eliminazione negozio include presenze legacy, registrazioni,
  provenienze, decisioni/proposte pertinenti e collegamenti. Senza conferma,
  anche sole nuove registrazioni producono il riepilogo 409. Con conferma,
  l'intero blocco entra nel cestino; gli inversi restano applicabili dal loro
  snapshot, senza dipendere dall'esistenza dell'articolo cancellato.
- Eliminare una partita raccoglie prima l'intero blocco personale nel cestino
  utente. Non produce inversi da applicare ad un'altra partita o a una partita
  ormai assente. Ripristinarla ripristina il medesimo saldo e relative ricevute.

### 10.2 Cestino delle partite

`conCestino` oggi usa metadati e radice main. Per questi gesti si estende
`utente.cestino_partite` con metadati nullable per voci autonome, preservando PK
e righe vecchie. La lista distingue il riferimento main numerico dal riferimento
utente per UID; le operazioni utente non esportano progressi in un pacchetto di
gioco. Le vecchie voci collegate ad un cestino main restano compatibili.

Il ripristino del dominio acquisti non esegue un reverse cieco delle tabelle
di proposte/movimenti:

1. valida registro, identità, versioni e legami del blocco;
2. ripristina fatto e fonti, preservando modifiche successive;
3. conserva decisioni/applicazioni più recenti e il registro idempotenza;
4. ricalcola T rispetto a B dalle ricevute correnti;
5. chiude un inverso aperto non più dovuto oppure propone il delta necessario
   se l'inverso era già stato applicato; non riapplica punti o yen.

Le registrazioni dell'operazione e dei delta applicati non sono annullate da
un restore di fonte/negozio. Nel cestino dell'intera partita sono invece
conservate insieme al resto del suo stato. Sono necessari handler distinti
per questi casi, non un'esclusione globale che perda i registri della partita.

Stesso UUID già esistente:

- identità e contenuto immutabile identici: è lo stesso oggetto, nessun doppio
  inserimento, fonte o effetto; la riconciliazione vede il numero di fonti reale;
- identità/contenuto divergente: 409 dell'intero blocco, nessuna sovrascrittura,
  nessun suffisso o UUID nuovo inventato;
- registro o catena incoerenti: 409, cestino conservato, nessun reset.

Un vecchio snapshot di `acquisto_partita` rimette soltanto la presenza legacy.
Non genera registrazioni, data, quantità, yen o Doti.

### 10.3 Fonte o oggetto mancanti

L'assenza causata da sostituzione del file di gioco non equivale a un annullo
richiesto dall'utente. Un consumo confermato, il suo snapshot e le sue ricevute
restano leggibili come orfani; non si cancellano o si ricreano voce/articolo.
L'origine mancante si mostra in Progressi/Da applicare con la sua identità
registrata. Il fatto storico conserva la sua variante osservata; il catalogo
mancante non ne ricostruisce una diversa.

Un annullo esplicito di una fonte orfana usa il receipt conservato. Una proposta
non perde il suo inverso per l'assenza di voce/articolo. Applica è possibile solo
se esistono partita e destinatario validi della mutazione; un destinatario Dote
mancante blocca quel gesto con motivo, conservando proposta e receipt. Nessuna
FK a voce/articolo/fonte può cancellarli prima dell'inverso. La semplice
coincidenza di una chiave reintrodotta non applica alcun effetto automaticamente.
Anche una presenza legacy orfana resta rimovibile dalla sua tuple esatta con
anteprima/CAS, senza richiedere che l'articolo sia ancora presente. Rimuoverla
non annulla consumazioni o proposte che non possiede.

Il controllo di sostituzione pacchetto include i riferimenti logici di
registrazioni, fonti, proposte ed effetti. Backup completo nuovo include tutto;
backup vecchio crea le tabelle nuove vuote, senza backfill. Sostituire solo il
filegioco conserva i dati nel filepartite ed espone gli orfani. Sostituire solo
il filepartite non deve abbinare ricevute personali a nuove identità main per
somiglianza.

## 11. Firma pubblica 93 → 121 e bonifica del testo

Fonte della firma: `pacchetto/gioco.db` pubblico, versione 93, aperto con
`readonly:true,fileMustExist:true`, e lettura statica della migrazione 121.
Non contiene dati personali, risultati live o fixture ricavate dal live.

### 11.1 Articolo pubblico

| Campo | Valore RAW pubblico |
| --- | --- |
| chiave | `chiosco-kiyasuku/succo-aojiru` |
| negozio_chiave | `chiosco-kiyasuku` |
| nome | `Succo Aojiru` |
| nome_it | SQL NULL |
| categoria | `consumabile` |
| per | `Joker` |
| prezzo | 5000 |
| statistiche, effetto_json | SQL NULL |
| origine, nascosto, seed_json | `seed`, 0, SQL NULL |
| condizioni_json | `[{"tipo":"giorno-settimana","giorni":["domenica"]}]` |
| oggetto_fonte, oggetto_chiave | SQL NULL |

Effetto RAW:

> Aumenta di 1 punto una statistica sociale a rotazione: prima Fascino, poi Perizia, poi Coraggio, poi Gentilezza, poi Conoscenza

La base pubblica contiene un solo articolo Aojiru e nessun candidato Aojiru
nelle sorgenti oggetto/libro/film/attivita o nei nomi/nomeEn di oggetti-guida.

### 11.2 Derivazione deterministica del catalogo

`catalogoOggetti121.ts` 145–170 non trova un riferimento strutturato o un
candidato; `categoriaArticolo` conserva consumabile, nomeIt||nome dà Succo
Aojiru e `slug121` dà `succo-aojiru`. `crea` 53–65 produce:

| Campo | Atteso pubblico derivato |
| --- | --- |
| chiave | `consumabile/succo-aojiru` |
| categoria, sottocategoria | `consumabile`, SQL NULL |
| nome | `Succo Aojiru` |
| nomi_altri_json, nome_originale | `[]`, SQL NULL |
| effetto | stesso RAW dell'articolo sopra |
| descrizione | stringa vuota |
| statistiche_json | `{"per":"Joker","testo":null}` |
| fonte_tipo | `listino` |
| fonte_chiave | `chiosco-kiyasuku/succo-aojiru` |
| origine, seed_json, nascosto | default `seed`, SQL NULL, 0 |

`updated_at` è generato dalla 121, quindi non è una costante pubblica da
inventare nella firma. Articolo riceve questa catalogo_chiave; costo_json e
articolo_condiviso introdotti da 121 restano SQL NULL.

La bonifica deve interessare atomicamente il campo mostrato dell'oggetto e il
residuo articolo usato senza collegamento. Aggiornare solo l'articolo non basta.
Proposta di frase:

> Ogni consumazione dà 2 punti interni (1 nota) alla Dote del succo offerto. La rotazione è Fascino, Perizia, Coraggio, Gentilezza, Conoscenza e avanza solo dopo una consumazione; saltare una domenica non la fa avanzare.

Guardie selettive esatte su identità, provenienza, link e RAW pertinenti;
snapshot/audit immutabile prima di entrambi gli UPDATE, CAS e changes=1 per
riga, rollback del blocco in caso diverso. Note, prezzi, condizioni e altri
metadati non vengono riscritti. Assenze, varianti e fotografie pertinenti non
uniformabili sono escluse con motivo, mai ricreate. Il dato pubblicato non si
presume identico alla firma: il confronto del live è separato e resta alla Regia.

Il manifest I71 mostra separatamente audit della rettifica e capacità
funzionale consegnata. Una frase già corretta non prova che il modello di
consumazioni/annullo sia operativo.

## 12. Contratto dei gesti e dell'interfaccia

Anteprima readonly strict: operazioneId, articolo, momento, variante osservata,
Fortuna, fonte, scelta nuova/collega UUID, rapporto con eventuale presenza legacy.
Mostra tutti i fatti/fonti pertinenti, confronto immutabile di `collega:id`,
disponibilità verificabile/non ricostruibile, effetto/costo, vecchio promemoria,
già conteggiato, proposte, conflitti e token CAS.

Conferma: stesso payload validato più token, unica TX. Nessun campo sconosciuto
ignorato. Successo ricevuto distinto dal refresh; 201 acquisito non diventa
«creazione fallita» per un GET successivo. Esito incerto: sola rilettura delle
identità, nessun retry cieco o attribuzione di identità da una somiglianza.
Le risposte stale non aggiornano un'altra partita/fonte selezionata.

Gli abbinamenti del Diario sono per UID/effetto, con motivo e RAW precedente.
I 21 nomi Aojiru del pubblico sono candidati, non prova di 21 consumazioni né
censimento completo basato sul nome. Le spunte già date producono proposte
senza riapplicazione; nessun cambiamento del Diario validato fino al 1° giugno.

`DaApplicare` è condiviso da Oggi/Progressi; Applica/Scarta singoli e in blocco
sono durevoli e rispettano i medesimi CAS. Il blocco mostra tutte le variazioni
e applica transazionalmente il gruppo approvato, senza saltare silenziosamente
una proposta diventata stale. L'anteprima del gruppo calcola la sequenza e il
risultato complessivo per destinatario: due proposte sulla stessa Dote non
usano entrambe un prima indipendente. La TX confronta l'intero snapshot del
gruppo e applica l'ordine approvato; una divergenza annulla tutto il gruppo.
Le unità punti interni/note/yen sono distinte.

Modal e Selettore esistenti, target 44 px, una sola scroll verticale, nessun
riepilogo con scroll orizzontale a 1280/768/375; rispetto anche dei restanti
viewport prescritti. Nessuna interfaccia parallela della Home: riusa OggiGuida.

## 13. Elenco finito dei file proposti

Nuovi:

- `shared/acquisti.ts`, `shared/effettiVoce.ts`, `shared/propostePartita.ts`;
- `server/services/acquistiService.ts`, `motoreDiario.ts`, `propostePartitaService.ts`;
- `server/schemas/acquisti.ts`;
- `server/db/migrations/136_aojiru_e_effetti_voce.ts`;
- `server/db/migrazioniUtente/028_acquisti_e_proposte.ts`;
- `src/components/catalogo/ConsumiAojiru.tsx`;
- `src/components/partita/DaApplicare.tsx`;
- `src/components/guida/AbbinamentiEffettiVoce.tsx`;
- questo dossier.

Esistenti, responsabilità circoscritte:

- `shared/effettiAzione.ts`, `shared/types.ts`, `shared/riconciliazioneCondizioniManifest.ts`;
- i due index delle migrazioni (append a cura della Regia);
- `server/services/negoziService.ts`, `disponibilitaService.ts`: lettore unico;
- `server/services/luoghiScritture.ts`: riepiloghi e blocchi di eliminazione;
- `server/services/pacchettoGiocoService.ts`: riferimenti/orfani;
- `server/services/cestinoService.ts`: voci autonome private e handler roundtrip;
- `server/services/giornataService.ts`, `effettiAzioneService.ts`, `azioniStrutturateService.ts`:
  writer/reader/receipt e adattatori dei domini;
- `server/services/storicoService.ts`: riferimenti derivati ai receipt;
- `server/services/catalogoOggettiService.ts`, `mappe/mappeService.ts`: proiezioni;
- `server/services/riconciliazioneCondizioniService.ts`: I71 e audit effettivo;
- `server/services/partiteService.ts`, `squadraService.ts`: contesto applicazione
  esplicita e conservazione del blocco personale;
- `server/routes/partite.ts`, `compendio.ts`, `impostazioni.ts`;
- `server/schemas/partite.ts`, `compendio.ts`;
- `src/services/api/partite.ts`, `compendio.ts`, `impostazioni.ts`;
- `src/components/catalogo/AcquistiOfferta.tsx`, `OfferteDellOggetto.tsx`;
- `src/components/guida/ArticoliTabella.tsx`, `EditorAzioneStrutturata.tsx`,
  `GiornoGuida.tsx`, `ModuloVoceGiornata.tsx`;
- `src/components/mappe/VisoreMappa.tsx`, `SchedaContenutoGuida.tsx`;
- `src/components/partita/ProgressiPartita.tsx`, `OggiGuida.tsx`;
- `src/components/impostazioni/Cestino.tsx`;
- `src/hooks/useMappaPartita.ts`;
- `src/utils/cestino.ts`, `azioneStrutturata.ts`, `dotiDaSegnare.ts`.

Non è un'autorizzazione a modificare questi file: l'ownership di implementazione
deve essere assegnata dopo il gate. Non si toccano migrazioni storiche, main,
altre istanze, dati personali o file di coordinamento assegnati alla Regia.

## 14. Stato del gate

Il primo esame ha confermato fonti/regola e strategia della famiglia acquisti,
richiedendo i sei casi ora esplicitati nei §§5–10. Il revisore indipendente ha
poi letto il documento intero e **approvato il gate della soluzione**, senza
ulteriori blocchi di disegno. La Regia ha confermato l'approvazione ed il
perimetro delle dipendenze L10 comprese. L'approvazione non attesta codice,
consegna I71 o completamento del lotto L10.

Tre riesami propri del contratto: fonti/unità; ingressi di scrittura e compatibilità
dei receipt; cicli/saldi, proprietà, orfani e ripristini. Eventuali rilievi del
revisore vanno integrati prima dell'implementazione. Il prossimo gate riguarda
il codice concreto; dopo il rilascio A12 i sorgenti I71 sono in lavorazione.
Controlli integrati e
riscontri dopo rilascio restano distinti da questo gate documentale; nessun
test è autorizzato da questo documento.

## 15. Innesti concretizzati e limiti della consegna

Ownership separate: nuovi shared/servizi/schema e136/028 al collega incaricato;
servizi esistenti, DTO additivi e rotte all'integratore; interfaccia e client alla
Regia. Nessun punto I71/L10 è dichiarato concluso in questa fase.

- Articoli, offerte del Catalogo e pin espongono `acquisti`; disponibilità e
  spesa usano il lettore unico. La fotografia della richiesta viene riusata,
  senza cache globale e senza rileggere tutti gli acquisti per ogni articolo.
- Il Diario espone `effettiVoce` e `ricevuteEffetti`, lasciando `produce` come
  proiezione di compatibilità. `effettiVoce` nella creazione/modifica ordinaria
  salva atomico con la voce: creazione con UID null e senza token; modifica con
  lista completa e CAS. Non si inviano contemporaneamente le due fonti.
- Prima spunta: motore unico e eventuali acquisti già rivisti nella stessa TX;
  spunta presente: nessuna riesecuzione. Raccordo storico: soltanto l'effetto
  selezionato, senza ripetere l'incontro del Confidente. Ricevute legacy
  validate senza eliminare campi aggiuntivi della fotografia.
- Cancellazioni di voce e negozio passano dal cestino e dai writer di dominio.
  La conferma negozio include consumazioni, provenienze, proposte e ricevute.
  La partita viene fotografata prima delle cascate, senza inversi ad altre partite.
- Cestino unificato soltanto con `?partite=1`: il vecchio GET/DELETE senza query
  continua a vedere/svuotare il solo cestino storico. Le voci personali usano
  riferimento utente/UID e id null; la presenza legacy ha radice composita
  partita/articolo, distinta dalla provenienza UUID. I registri privati non
  entrano nel pacchetto di gioco e nessun RAW del cestino è esposto dall'elenco.
- Nel restore non-partita si conservano decisioni, ricevute, operazioni e
  checkpoint correnti; si ripristinano le identità/fonti e si riconcilia T−B.
  Nel restore della partita torna il blocco completo e la partita attiva
  corrente resta tale. Registro illeggibile o identità divergente: rollback409.
- La sostituzione del pacchetto rileva riferimenti logici nuovi e conserva
  fatti/receipt orfani. Le ricevute esplicite di contesto non sono falsamente
  considerate effetti canonici mancanti.
- Il registro client delle operazioni usa `sessionStorage` versionato della
  sola scheda: payload, ID e CAS restano immutabili prima dell'invio; il recupero
  dei sei gesti è esplicito. La prima spunta si recupera soltanto con rilettura
  dello stato, senza reinvio automatico. Le riletture dello storage rilevano
  pendenti rimossi o cambiati e un successo già ricevuto resta noto anche se
  la sua ricevuta non può essere persistita dal browser. Il gate di questi
  innesti rimane distinto da quello del nucleo.
- Il delta R6 I71 informativo è stato approvato dal revisore: `ricerca` resta;
  nessuna nuova Conferma/Applica. Regola e fonti Royal, compatibilità tecnica
  con il gesto e audit136 sono piani distinti. Audit assente/illeggibile non
  produce un falso esito; versione1 e le due chiavi letterali sono validate,
  con RAW/presenza nel CAS, mai dati di partita.

Riesami statici e gate codice integrato sono ancora da completare. Typecheck,
lint, build, pipeline e osservazione dopo rilascio restano compiti della Regia;
questo dossier non ne anticipa l'esito e non autorizza test.

## 16. Rilievi della prima lettura del nucleo

Il gate codice complessivo non è ancora approvato. Le correzioni dei quattro
rilievi seguenti sono state rilette e approvate staticamente dal revisore:

- Il POST acquisto ordinario accetta solo fonte manuale. Il Diario usa il motore
  per avere receipt/versione; anche l'anteprima valida variante e Fortuna della
  fonte. L'annullo richiede gli ID di provenienza posseduti dai receipt.
- La proposta storica firma il JSON semantico dell'effetto, senza ordine della
  lista né differenze di serializzazione. Un riordino non la rende stale.
- Enum e quantità sono validati senza coercizione di array/stringhe; un RAW
  malformato resta fallback. Lo scanner richiede operazione D/U/I stringa esatta.
- La ricostruzione del cestino136 rifiuta DDL, vincoli, indici o trigger diversi
  dal caso121 noto prima del DROP; confronta righe integrali e sequenza.

Il contratto mirato del raccordo storico `sostituisceDoti` è stato approvato,
implementato e riletto con **P1 APPROVATO STATICAMENTE** nel relativo perimetro.
Assorbe soltanto sidecar Dote puri
e di versione esatta, rileggendo nella TX B netto e fotografie. Il ritiro di T
avviene anche con q=0; per stessa Dote rialloca −q/+q con contropartite e audit
privati reciproci, senza mutare il saldo corrente. Il B del fatto destinatario
si conserva e si somma: le prove comprendono tutte le attribuzioni precedenti
di entrambe le cause. Variante diversa conserva inverse/positive esplicite.
Le ricevute collegate da `assorbita_da` e dal riferimento inverso partecipano a
validazione, CAS e undo; restore e modifiche non riaprono il nodo rivendicato.
Nessun nuovo trasferimento nei cicli annullo/ripristino. Senza sidecar provato,
B non nullo o altre promesse attive ambigue bloccano il raccordo; il caso ammesso
resta da dichiarare. I cinque rilievi del primo gate del nucleo sono chiusi
staticamente nel perimetro esaminato. Il delta Storico è un gate separato;
questo esito non è un'approvazione runtime o globale di I71.
Nessuna applicazione dei dati o esecuzione di migrazioni è avvenuta durante
queste correzioni.

## 17. Delta Storico delle fonti

Soluzione circoscritta approvata dal revisore, implementata e con gate codice
congiunto **APPROVATO STATICAMENTE**. I nuovi eventi del writer hanno il marker esplicito
`acquistoV1:{formato:1,azione}`; non si modifica o classifica alcun evento legacy.
Il writer rimuove gli eventi di registrazione posseduti prima di eliminare una
fonte manuale, una fonte del Diario o le fonti degli articoli eliminati. L'helper
dello Storico verifica nella stessa TX partita, fonte, fatto e ricevuta/journal
esatti; eventi altrui e altri tipi di azione rimangono. Replay e GET non creano
eventi. Il cestino fotografa i DELETE: il ripristino riporta gli eventi originali
soltanto se le guardie del dominio e le decisioni successive lo permettono,
senza rigenerarli o cambiare timestamp/identità. Nessun test o DB write eseguito.

## 18. Interfaccia, riesami e preparazione del rilascio

Il registro degli acquisti in Progressi legge tutti i fatti, le fonti e le
presenze legacy della partita anche senza offerta corrente. Gli annulli usano
le stesse anteprime e gli stessi writer; nessun oggetto viene ricreato.
Le proposte mostrano identità di partita/causa/consumazione/voce/effetto e
ricevuta precedente. Il dettaglio del registro riletto separatamente è
dichiarato corrente; il consenso finale mostra il payload della propria
anteprima, comprese variante/Fortuna osservate, momento, nuova/collega con UUID
e rapporto legacy. Le riallocazioni interne sono distinte dalle dichiarazioni
personali. `ancheChiuse=1` rende consultabile lo storico già previsto dall’API.

La prima spunta si blocca se il GET rileva già fatta, errore, caricamento o
configurazione diversa. Un avviso nella medesima anteprima segnala altre
consumazioni della stessa data, senza inventare una quota o imporre un blocco.
Il registro di scheda conserva il payload prima della rete, mantiene esiti
noti anche se lo storage fallisce e non ripete una prima spunta incerta:
verifica soltanto le ricevute esatte. Il primo400 validation-error pre-handler
è un rifiuto certo; persistere un rifiuto già acquisito non invia RPC.

Tre riesami propri completati su identità e fonti, transazioni/replay e
consumatori/conservazione. Revisore distinto: gate statico integrato I71
approvato; Galaxy ha riletto gli originali43ad8889 e approvato il rilascio nel
perimetro FE/integrazioni esaminato, chiudendo F71-01…05. Typecheck12581,
lint40007 e build18606 exit0 dopo gli ultimi delta. Nessun test.
Baseline reale135/27 readonly conservata solo in RAM:38tabelle utente,
998voci Diario/1913spilli/316mappe/3cestino; DDL del cestino coincide con la
guardia136, due indici e nessun trigger. Rilascio, osservazioni e confronto
dopo136/028 ancora da acquisire: non è una consegna runtime o la chiusura L10.

## 19. Rilascio e osservazioni reali

Commit `814b17d8acd63ba5018df7d2d4f4b13a0fcff9ab`, pipeline81
`39662850767` riuscita; p5s healthok e schema136/28 alle19:39Z.
Confronto readonly della Regia prima/dopo, tenuto esclusivamente in RAM:
38tabelle utente preesistenti identiche nelle rispettive colonne precedenti;
998voci Diario,1913spilli,316mappe e3righe cestino identici integralmente,
compresa la sequenza del cestino. Sole differenze dei due record Aojiru:
campo `effetto` dell’articolo e del catalogo. Audit136: rettificata.
Tutte le otto nuove tabelle utente vuote: nessuna consumazione/proposta/saldo
inizializzato.998transizioni convertite,285effetti e20candidati guida aperti;
i21candidati del pacchetto pubblico citati nel §12 non sono il conteggio live.

Galaxy ha osservato autonomamente in sola lettura il frontend nuovo: registro
delle sette presenze legacy e zero consumazioni, coda vuota, form Aojiru con
variante da scegliere/Fortuna ignota e anteprima disabilitata, testo canonico,
editor di una voce reale convertita e R6 con audit136 rettificata,201righe e
ricerca ancora aperta. Nessun campo, conferma o dato di partita modificato.
Gate finale positivo nel perimetro osservato. Regia ha osservato anche il
registro a602×884: una sola area verticale e nessun overflow orizzontale;
questo non certifica tutte le risoluzioni richieste.

Durante il cambio degli asset il revisore ha visto un errore di importazione
di un vecchio chunk; risolto con reload, senza ulteriori errori/warning osservati.
Riscontro operativo registrato in L11. Writer/replay/undo/restore e fallback
non convertibile non sono stati esercitati: nessun test o progresso inventato.
Questi limiti non diventano un’approvazione dell’intero L10 o di tutte le
decisioni della riconciliazione R6.
