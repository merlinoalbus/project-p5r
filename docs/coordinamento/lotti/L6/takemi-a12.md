# A12 — l’attività dei test rimanda alla fonte Confidente

**18:47Z — CONSEGNATA nel perimetro A12/135 + R6, gate finale distinto APPROVATO.**
Principale e679ac8a/pipeline79 e correttivo UI8d111ced/pipeline80 (`39654227575`) riusciti.
Typecheck53028, lint76056 e build53346 sullo snapshot esatto del correttivo tutti exit0. P5s135/27.
Il coordinatore ha osservato il nuovo requisito18aprile distinto dal testo conservato15; il revisore,
in modo autonomo, scheda/editor/R6/riepilogo con lo stesso componente e il messaggio corretto della fonte.
Nessun campo modificato o gesto salvato nel browser. I due esiti135 rimangono separati e il beneficio8 visibile.
Le prove sui dati restano quelle del coordinatore riportate sotto, non misurazioni autonome del revisore.
Questa chiusura non comprende le altre richieste L6/L7, il calendario globale L9 o I71/Aojiru.

**18:24Z — esiti reali135:** e679ac8a/pipeline79 riuscita; p5s135/27, attività rettificata e beneficio8 aggiunto.
Confronto readonly: soltanto cinque campi dell’attività cambiati;38tabelle utente,998vociDiario/1913spilli/316mappe,
identità/requisiti/disponibilitàTakemi e primi sette benefici identici. Nuovo8: Coraggio1nota. R6-31 conserva201ID,
23ricerche; A12 fontecollegata, formula coincidente, audit valido con due esiti e nessun Applica parziale.
Il revisore ha osservato autonomamente scheda/editor/R6/riepilogo, senza salvare. Gate finale sospeso per due testi UI:
data della nota conservata concatenata al requisito e «sempre disponibile» generico nel guscio linked. Delta solo
presentazione approvato staticamente: requisito strutturato principale e testo informativo separato; condizioni
proprie vuote distinte dalla disponibilità del Confidente. Tre riesami propri del delta completati. Segue controllo
di un esatto snapshot git e rilascio separato, escludendo l’implementazione I71 già in corso nella worktree.

**18:09Z — pronto al rilascio:** gate statico integrato135 e successivo raccordo R6-31 approvati dal revisore distinto,
comprese le correzioni dei RAW, ricevute storiche, fonte illeggibile e due esiti135 mostrati anche nella conferma.
Tre riesami propri del coordinatore completati; controlli finali typecheck10735/lint43607/build83003 exit0.
Nessun test o migrazione locale. Esiti su p5s, confronto dei dati, browser e gate finale ancora da acquisire.

## Mandato e gate

Originali al commit `43ad8889`: L6 R6-12 e modifiche §4.2; L9 R9-01/04/04b/07/10/11/14/25/26;
L10 R10-10/15/33. Il collegamento è esplicito per chiave: requisiti e benefici rimangono nella fonte Confidente.
Il Confidente si avvia dal **18 aprile**, distinto dalla farmacia accessibile dal **16 aprile** (rettifica118).
Il15 aprile della base pubblica93 è anteriore alla rettifica118 e non viene reintrodotto.

Il revisore distinto `audit_documenti_originali` ha approvato il disegno A12, con guardie su tutte le partite,
annullamenti storici consentiti, validazione finale del cestino e manifest completo obbligatorio al gate codice.
Il gate del codice, i controlli integrati e l’osservazione pubblicata sono ancora pendenti. A12 non è chiusa.
Nessun test, migrazione locale o scrittura sui DB eseguiti durante questa implementazione.

## Fonte e significato

- [Guida Royal di Tae Takemi](https://www.allgamestaff.it/persona-5-royal/guida-rango-confidente-di-tae-takemi-morte/):
  disponibilità di giorno, eccezioni di pioggia e uscite serali dopo la relazione; rango1 senza Coraggio2,
  rango2 con Coraggio2; rango8 e Dote associata al passaggio.
- [GameFAQs Royal, Death](https://gamefaqs.gamespot.com/ps4/260936-persona-5-royal/faqs/78212/death):
  rango8 attribuisce2 punti Coraggio, corrispondenti a una nota nel modello dell’app. Le risposte che danno
  affinità non sono premi della Dote. Uscita7.1 e ranghi9/10 non ereditano automaticamente il premio.

Non si ricostruiscono date d’itinerario, relazioni romantiche o incontri intermedi a partire dal rango.
I giorni/fasce/note vengono letti da `confidente_disponibilita`; i semafori valutano soltanto i requisiti
canonici del prossimo rango esatto, anche quando non ci sono righe di requisito. Non garantiscono un incontro
in quel momento. Senza partita il prossimo passo è assente; a rango10 non viene proposto un rango11.

## Scritture selettive135

Append `attivita.confidente_chiave` nullable, FK `confidente(chiave) ON DELETE RESTRICT` e indice.
Manifest pubblico integrale in `server/db/migrations/takemiManifest135.ts` (fino al 2026-10-23 `135_takemi_manifest.ts`), da lettura readonly/fileMustExist
di `pacchetto/gioco.db`93. Nessun valore dell’istanza privata è inserito nel manifest.

La firma dell’attività confronta tutte le colonne93: `chiave`, `ordine`, `nome`, `tipo`, `luogo`,
`luogo_chiave`, `fascia`, `costo`, `sblocco`, `doti_json`, `altri_effetti`, `regole`, `premi`, `paga`, `fonte`,
`verificato`, `sessioni`, `origine`, `nascosto`, `seed_json`, `updated_at`, `condizioni_json`, `sede_chiave`,
`effetti_json`, `paga_yen`, `paga_massima`, `dettagli`, `tracciamento`. Le colonne successive sono confrontate
esplicitamente: `quiz_json=NULL` dalla105 (rettifica soltanto Triple Seven), `catalogo_chiave=NULL` dalla121
(identità delle attività videogioco, non di questa attività di tipo altro), `confidente_chiave=NULL` dalla135.
Anche colonne ulteriori inattese escludono la bonifica: non ricevono default impliciti.

Solo con firma completa, identità Takemi identica alla pubblica93, assenza di fotografie pertinenti e di
storia generica in tutte le partite: si collega `esperimenti-clinici-takemi` a `takemi`, si tolgono fascia e
condizione autonome e la prosa errata dell’Eremita, si aggiorna la spiegazione. Il RAW `doti_json` resta
storico e inattivo. `origine=seed` e `seed_json=NULL` restano invariati: il dato corretto è la baseline delle
future adozioni e di Ripristina guida. Il vecchio errore è conservato soltanto nell’audit immutabile.

In modo indipendente, la135 confronta l’identità completa Takemi e il set completo dei sette benefici1–7,
ciascuno con tutte le tre colonne (`confidente_chiave`, `verso_rango`, `effetti_json`) e RAW esatto pubblico.
Solo con rango8 assente, nessun altro beneficio inatteso e nessuna fotografia pertinente, aggiunge il
beneficio Coraggio di una nota al **passaggio8**. Un8 diverso è una collisione preservata; un8 già identico
è conforme senza UPDATE. Non aggiunge benefici9/10 e non ricalcola incontri, Doti o progressi trascorsi.

Le due decisioni hanno esiti separati nello stesso audit `rettifica-attivita-takemi-135`, mai sovrascritto.
Registri non riconoscibili escludono la bonifica, senza impedire l’append dello schema o l’avvio.
Fotografie `seed_json` o cestino preesistenti non vengono riscritte.

## Gesti ordinari e roundtrip

`POST/PUT /api/catalogo/attivita` accettano `confidente_chiave` nullable. L’omissione conserva il legame;
NULL lo rimuove esplicitamente. La riga finale unita ai dati correnti viene validata nella TX. Il modulo
mostra i campi incompatibili prima di nasconderli e richiede una risoluzione esplicita, comprese le condizioni
possedute dal guscio ModuloCatalogo. Nessun campo personale è azzerato dalla semplice scelta del Confidente.

Il normalizzatore non ricostruisce effetti generici dal RAW `doti_json` di una riga linked. Nuovi premi,
fasce, condizioni, quiz, sessioni multiple, paghe o costi autonomi sono conflitti espliciti. I testi liberi
personali non sono convertiti in requisiti o cancellati. Un nuovo collegamento richiede assenza di storia
generica in tutte le partite: turni, contatori, effetti dei turni e fotografie delle spunte; anche progressi
e sessioni di un eventuale videogioco impediscono la trasformazione. Schemi storici assenti sono elencati,
strutture parziali o fotografie illeggibili non provano assenza di storia.

Nuovi incrementi/turni/sessioni sono bloccati anche dagli endpoint e dagli effetti delle azioni.
Riduzioni e annullamenti già registrati restano possibili e usano il vecchio registro dei premi, senza
dipendere dai nuovi premi correnti. La scheda del Confidente e il Diario mantengono i loro gesti canonici;
la Dote si segna a mano, soltanto una volta per passaggio secondo il servizio degli incontri esistente.

L’anteprima Importa controlla link espliciti, riferimenti e compatibilità prima della sostituzione;
la riapertura controlla anche backup vecchi migrati, sfruttando il rollback del ripristino esistente.
Un file vecchio senza FK non viene collegato per nome. I file nuovi conservano la chiave dichiarata.
Un vecchio Ripristina guida senza FK conserva la fonte e i campi operativi correnti e restituisce un avviso
esplicito; un nuovo snapshot con FK lo ripristina soltanto se il record finale è valido. Il cestino valida
il record finale nella sua TX, compreso un vecchio U senza FK: conflitto409 con rollback dell’intero gesto,
senza lasciare una riga linked con premi autonomi. Un vecchio D senza FK ripristinaNULL.

## DTO e interfaccia

`AttivitaDto.confidenteChiave` e `fonteConfidente` espongono identità/link, disponibilità informativa,
requisiti1 e del prossimo passo, Doti per passaggio, conflitti e avvertenze. La disponibilità autonoma èNULL;
le Doti canoniche non vengono copiate in `effetti_json`. Ricerca e filtro Coraggio leggono la stessa fonte.
L’editor riceve la proiezione readonly in `ElementoCatalogoDto.dati._fonteConfidente`.
La rimozione del link non ricostruisce automaticamente vecchi valori nascosti.

Ownership implementativa: BE/schema/135/shared/OpenAPI e questo dossier `raccordo_97_scambi`; FE
AttivitaPage/ModuloAttivita/ModuloCatalogo e integrazione `root`. Registrazione135, controlli e pubblicazione
restano al coordinatore, dopo riesame distinto del codice. Non è attestata alcuna osservazione runtime135.

## Riesami del coordinatore prima del gate codice

1. Fonte unica e lettori: la scheda e il filtro Dote leggono i benefici canonici; nessun effetto viene copiato
   nell’attività e nessun turno o rango personale viene creato. La disponibilità del prossimo rango non promette
   un incontro; i passaggi senza Dote hanno una dicitura esplicita.
2. Editor e salvataggio: la semplice scelta conserva i valori; la risoluzione esplicita elenca i campi che
   rimuove e aggiorna anche le condizioni possedute dal guscio. Il RAW delle Doti storiche resta temporaneo
   e non viene rispedito, salvo lo svuotamento esplicitamente scelto per un nuovo collegamento.
3. Compatibilità e conservazione: attività autonome e videogiochi mantengono i loro percorsi; rimuovere il
   legame non ricrea premi storici; gli avvisi di Ripristina sono mostrati. Append135 registrato, nessuna
   migrazione locale eseguita. Riferimento readonly prima135: schema134, sette benefici e confronto in RAM
   delle38tabelle utente, più requisiti/disponibilità/identità Takemi separati; nessun RAW privato o hash su git.

Typecheck85610, lint26825 e build75870 terminati con exit0. Successivo delta esclusivamente di testo:
esplicitata l’assenza di Doti nei passaggi senza beneficio. Gate distinto e controlli conclusivi ancora pendenti.
La prima incompatibilità TypeScript del DTO con oggetti precedenti è stata risolta con proprietà additive
opzionali, sempre emesse dal backend corrente. Nessun file di test modificato e nessun test eseguito.

## Rilievi del gate e correzioni mirate

Il revisore ha individuato una storia generica non coperta dalle sole tabelle dei progressi: le ricevute
`effetti_json.letture` possono conservare un videogioco dopo che il suo avanzamento è stato ridotto o rimosso.
Il lettore ora valida il formato reale delle ricevute (categoria, chiave, nome, prima/dopo e campi opzionali)
e rileva `categoria='videogioco'` con chiave esatta nelle tre tabelle storiche. Il progresso corrente assente
non dimostra più assenza di quella storia. Una forma illeggibile esclude il nuovo collegamento e la bonifica.

Giorni o fasce della fonte con JSON illeggibile o forma errata non diventano liste vuote: la proiezione
restituisce disponibilitàNULL, stato conflitto e avvisi distinti sui campi della fonte. Non viene inferito
alcun calendario e il semaforo del prossimo passo non viene dichiarato positivo in quel conflitto.

Il controllo dei campi autonomi ora precede anche il normalizzatore BE, sui valori RAW uniti alla riga corrente.
Nei percorsi linked il normalizzatore non ripulisce `effetti_json`: un effetto malformato o incompatibile
produce conflitto prima di perdere contenuto, anche quando la chiamata arriva da un altro servizio interno.
La validazione finale nella TX resta attiva. I tre delta richiedono rilettura mirata del revisore e nuovi
controlli integrati del coordinatore; nessuna pubblicazione o migrazione locale durante la correzione.

## Raccordo informativo R6-31

Soluzione approvata dal revisore distinto: A12 compare nella riconciliazione come eredità della fonte
Confidente, mantenendo le201 identità e tutte le decisioni persistite. La revisione append del manifest
è `2026-10-21.3`, con le due fonti Royal sopra indicate. Il meccanismo esistente include la revisione
globale nell’impronta: decisioni precedenti possono risultare da riconfermare, senza essere riscritte.

La riga espone `fonteConfidente` e `statoAuditConfidente`. L’audit135 viene riconosciuto soltanto con
versione1, identità esatta dell’attività, Confidente Takemi e rango8 del beneficio, esiti ammessi distinti
e motivi leggibili. Un audit valido proietta due righe separate, prefissate `Attività:` e `Beneficio verso rango8:`.
Audit assente o non riconoscibile restituisce righe vuote e stato esplicito, senza fabbricare un esito escluso;
una fonte corrente collegata non dimostra una
bonifica applicata e non viene usata per ricostruirne l’esito storico. Nessuna prima-immagine è esposta.

La proposta `[]`, con `prima:[]`, è soltanto informativa e compare sulla chiave esatta A12 con FKtakemi,
fonte collegata, campi autonomi neutri e dipendenze tutte leggibili e risolte. Non abilita mai Applica.
Una formula canonica illeggibile o un riferimento mancante non produce il badge coincide.
La conferma del raccordo corrente può
restare disponibile dopo la rimozione della vecchia frase soltanto con `sblocco`SQLNULL e fonte valida;
non si estende a un testo vuoto o a un’altra frase mutata. Confermare non certifica il calendario o il
beneficio del rango8. `esitoFonte` continua a dichiarare mutata la frase rimossa.

Il CAS fotografa array RAW ordinati dedicati per identità, disponibilità, requisiti correnti e guida,
benefici, compresi array vuoti e tabelle assenti, e presenza/RAW dell’audit135 anche illeggibile. Le PK
composte non passano dalla mappa generica chiave/id. Le formule dei requisiti attraversano il visitatore
dei riferimenti già esistente, così cambiamenti alle loro dipendenze invalidano la conferma. Nessun dato
canonico o decisionale viene modificato dalla GET. Gate codice distinto e controlli integrati restano
successivi a questo delta; nessun test o scritturaDB eseguito dall’implementatore.
