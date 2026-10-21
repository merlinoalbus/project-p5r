# L6 — pesca A10: fonti, conflitti e proposta da completare

## Stato e perimetro

Analisi del 21 ottobre 2026 sul codice pubblicato `814b17d8` e sulle specifiche
originali L6/L10 a `43ad8889`. **Nessuna nuova formula, soglia, attività o evento
è stato implementato o applicato per A10. Nessun gate A10 è acquisito.**
Il revisore distinto ha avviato la lettura autonoma e richiesto le integrazioni
finite elencate nel §6; il contratto tecnico completo è ancora aperto.

Il difetto del convertitore e dei chiamanti creazione/ripristino è già stato
corretto e riesaminato: non viene riaperto qui. Questa istruttoria riguarda la
meccanica Royal, la formula corrente e la rappresentazione di visite, catture e
benefici. Non certifica tutto L6 o L10 e non restringe il mandato di bonifica.

## 1. Specifiche originali pertinenti

| Requisito | Vincolo per A10 |
|---|---|
| R6-01b | Fatto non deducibile rappresentato come evento/proprietà strutturata o avviso non bloccante; nessuna condizione manuale libera inventata |
| R6-02/03/06 | Unico valutatore, riferimenti per chiave e condizioni composte, senza valutatori FE paralleli |
| R6-18/19 | La prosa non decide esiti; mappa frase → dato esplicita e riesaminabile prima della conversione |
| R6-21/23…26 | Condizioni personali e progressi protetti; nessun riempimento dalle vecchie spunte |
| R6-29 | Esito leggibile con motivo, senza verde che certifichi fatti non conosciuti |
| R10-01/02/05 | Effetti dichiarati per chiave e annullabili; attività svolta e risultato della cattura distinti |
| R10-10 | Benefici proposti con gesto esplicito; niente Dote applicata automaticamente |

## 2. Matrice delle fonti e affidabilità

I numeri di riga indicano il recupero web letto; per la pagina specifica AGS,
leggibile solo nel browser ordinario, si indicano le sezioni. Le fonti non
vengono sommate come voti indipendenti quando derivano dalla stessa pagina.

| Fonte Royal letta | Riferimenti | Cosa sostiene e limite |
|---|---|---|
| [Omoteura — Ichigaya](https://omoteura.com/persona5/the-royal/spot-ichigaya.html) | 6–7; 40; 97–99; 106–134; 196–211 | Distingue esplicitamente Royal da P5. Descrive tentativi `rango+2`, beneficio dopo riscossione, fasce/meteo e due pesci. Tabella dettagliata dell'autore, non codice nativo: scrive sei pesci prima della comparsa e non esplicita la cattura precedente per il Guardiano di giorno |
| [Wiki Royal — pesca](https://wikiwiki.jp/persona5r/%E9%87%A3%E3%82%8A) | 11–12; 104–112; 124–131, compreso commento 127 | Distingue MAX per arrivare al settimo tentativo e cattura Guardian possibile a4. Per il Boss cita terzo semestre, precedente Guardian e MAX. Il commento dichiara verifica anche con sei fallimenti; fonte comunitaria con osservazioni puntuali, non prova della necessità universale delle soglie |
| [AGS — pesca a Ichigaya](https://www.allgamestaff.it/persona-5-royal/pesca-laghetto-ichigaya/) | «Numero di tentativi disponibili»; «Guardiano e Boss di Ichigaya» | Esca dedicata e precedente cattura; contiene una tensione fra `rango+2` e rango4 al settimo tentativo. Non usarla come formula esaustiva. La sua data narrativa del 6 luglio non riapre A02 già corretto |
| [AGS — settimana 32](https://www.allgamestaff.it/persona-5-royal/soluzione-settimana-32/) | 208–212; 266 | Tutorial pesca/beneficio e quota serale; non dimostra soglie universali o date di apertura dei pesci |
| [Lukaight — Royal](https://gamefaqs.gamespot.com/pc/370658-persona-5-royal/faqs/82271/guide) | 15256–15261, giornata 26 gennaio | Caso del Kingpin al primo tentativo nell'itinerario. Non è una tabella universale e contiene un dubbio dichiarato dell'autore |
| [Fandom — Fishing](https://megamitensei.fandom.com/wiki/Fishing) | Sezione Royal e richiami al Wiki | Fonte derivata dal Wiki; segnala ricerca incompleta su soglie in maltempo e terzo semestre. Non è una conferma indipendente |

La lettura Omoteura97–99 distingue l'uscita subito dopo la riscossione dei
punti dall'interruzione/ripresa senza una nuova riscossione: una cattura in
qualsiasi momento della visita **non prova da sola il beneficio finale**.
Questo controesempio è stato richiamato anche dal revisore distinto. Le
catture rimangono fatti validi anche quando la Perizia non viene attribuita.

## 3. Dato e codice confrontati

La proiezione live è attribuita alla lettura readonly del coordinatore delle
19:38Z, conservata esclusivamente in RAM. Non è una firma pubblica da copiare
in una migrazione e non vengono pubblicati righe RAW o dati di partita.

| Oggetto/lettore | Riscontro | Implicazione |
|---|---|---|
| `pesca-ichigaya` | Nessuna condizione propria; sede laghetto; beneficio testuale ambiguo e formula dei tentativi | L'apertura della visita eredita la sede e non prova un pesce o un beneficio |
| `sfida-pesca-guardiano-ichigaya` | Unica soglia Perizia4, fascia entrambe, valore1200 nel costo monetario; tracciamento per volte | Una sola soglia non rappresenta i due obiettivi o la cattura precedente |
| `attivitaService.ts`, turni/volte | Registra esecuzioni e promemoria Doti, senza specie o risultato | `ATTIVITA >= 1` non significa Guardiano catturato |
| `disponibilitaAttivita.ts` | Condizioni e fascia proprie più disponibilità della sede | Non conosce regole d'incontro o risultati della sessione |
| `AttivitaPage.tsx` | Il costo numerico viene formattato in yen | Il prezzo dell'esca in punti è reso con un'unità errata |
| `EVENTI_STORIA`, route condizioni, Progressi | Fatti espliciti revocabili già disponibili | Possibile riuso della famiglia; non prova che catture o terzo semestre siano già modellati |
| `EffettoVoce` dopo I71 | Dote/lettura/turno/acquisto; nessun evento generico | L'effetto canonico di cattura e le sue provenienze sono da progettare, non capacità già consegnata |

Nella proiezione mirata il coordinatore riferisce due righe seed visibili e
nessuna fotografia pertinente. Prima di qualunque implementazione serve il
manifest pubblico93 con le trasformazioni deterministiche successive e una
nuova verifica delle guardie; il live non diventa la fonte del manifest.

## 4. Fatti distinti e proposta funzionale

Conservare **le due chiavi attività**, tutte le collocazioni e i turni/progressi
esistenti. Non creare due attività sostitutive né ripartire il contatore
storico fra Guardiano e Boss. La visita rimane distinta dai due obiettivi
presentati nella scheda della sfida.

Il dato tipizzato proposto deve separare:

1. Apertura del laghetto e disponibilità della visita.
2. Possibilità documentata di tentare ciascuna specie, con ambito e fonte.
3. Presenza/cattura osservata nella sessione, dichiarata esplicitamente.
4. Riscossione finale e beneficio effettivamente riconosciuto, anche ignoto.
5. Cattura già avvenuta in precedenza, con tempo/provenienza conosciuti oppure
   dichiarazione senza data che non ricostruisce il passato.

La proposta raccomandata espone per ogni obiettivo tre esiti specifici:

- **Prerequisito certo mancante**, soltanto per una necessità attestata che
  non risulta, indicando quale fatto manca.
- **Via documentata praticabile**, quando ricorrono i predicati di un caso
  positivo attestato; non significa pesce presente o cattura garantita.
- **Da verificare**, per caso non coperto, dato ignoto o conflitto delle fonti.

Una via sufficiente non diventa necessaria attraverso la sua negazione. Il
rango4 non può essere sostituito arbitrariamente con5; un rango inferiore a
una via attestata non basta a dichiarare impossibilità universale. Anche una
formula OR che si riduce alla sola soglia4 o un AND che richiede entrambi i
pesci rappresenterebbero male la sfida.

Non viene imposto un nuovo calendario assoluto dal percorso della guida.
Il terzo semestre deve essere un avanzamento effettivamente noto; una nuova
casella di fatto, se necessaria, richiede un contratto esplicito e non si
inizializza da rango Maruki, data scelta o vecchie spunte.

### Unità e costi esatti

| Grandezza | Valore attestato | Semantica |
|---|---|---|
| Quota visita di giorno | 3.000 yen | Un ingresso effettivo; non ogni lancio o cattura |
| Quota visita di sera | 1.000 yen | Stessa distinzione; non un prezzo fisso diurno |
| Boilie sospetto | 1.200 punti pesca | Acquisto effettivo dell'esca, distinto da possesso e uso; non debito automatico di ogni visita |
| Beneficio base riconosciuto | Una nota Perizia, due punti interni base | Richiede il fatto finale corretto; non deriva dal semplice conteggio delle visite |
| Beneficio con Fortuna confermata | Tre punti interni, secondo la conversione comune | Fortuna `true/false/ignota` osservata nella sessione; ignota non diventa `false` |

Non sottrarre punti o yen dai progressi storici. Il semplice possesso
dell'esca non prova un nuovo acquisto e il suo uso non prova quando fu pagata.

## 5. Incertezze da rappresentare senza decisioni arbitrarie

| Punto | Stato della prova | Conseguenza nel contratto |
|---|---|---|
| Soglie minime nei casi di comparsa anticipata | Casi positivi attestati; necessità universale non dimostrata | Non usare la negazione del caso positivo come rosso assoluto |
| Guardiano di giorno nel terzo semestre | Wiki/AGS citano cattura precedente; Omoteura non la esplicita nella tabella | Separare via condivisa e casi non coperti, senza attribuire certezza per omissione |
| Settimo tentativo o sei catture riuscite | Wiki dichiara verifica con fallimenti; Omoteura formula sei pesci | Non convertire contatori attività in lanci/catture della sessione |
| Ondata di gelo isolata | Le fonti citano neve/gelo, mentre il meteo base dell'app distingue quattro valori e tratta le allerte separatamente | Non equiparare silenziosamente nuvoloso, neve e allerta gelo |

Questi sono fatti da verificare nelle fonti, non decisioni personali sulle
regole del gioco da trasferire all'utente. La presenza di un avviso non
certifica una meccanica esaustiva o la chiusura A10.

## 6. Riesame distinto: sei integrazioni contrattuali ancora aperte

Il revisore ha letto autonomamente originali e fonti e richiesto i punti
seguenti. Sono vincoli da rendere concreti prima del gate di soluzione, non
un'implementazione autorizzata o già presente.

1. **Vie positive per specie.** Matrice esaustiva dei predicati Guardian/Boss:
   necessari, sufficienti o incerti, includendo esca posseduta, fascia e terzo
   semestre. Nessuna impossibilità universale derivata dalla sola soglia4.
2. **Identità della sessione.** UUID, momento e fonti; raccordo esplicito al
   turno preesistente. Più catture nella stessa visita non aggiungono altri
   turni, quote o benefici. Nessuna quota giornaliera inventata.
3. **Precedenza temporale e provenienze.** Per una valutazione storica,
   Guardian deve risultare catturato prima del momento valutato. Una
   dichiarazione senza data significa «noto ora, passato non ricostruibile».
   Revocare una fonte conserva le altre; Boss non inizializza Guardian.
4. **Economia e Fortuna.** Contratto delle quote 3.000/1.000 yen, acquisto esca
   1.200 punti distinto da uso/possesso, Fortuna tri-stato della sessione e
   unica proposta di beneficio con saldo T−B. Nessuna sottrazione implicita.
5. **Contratto tecnico completo.** Tabelle, DTO, API, writer unico, evento
   canonico e catena di undo/restore/import; vecchie spunte e cancellazione
   della sessione con ricevute già applicate comprese. Le cause attuali delle
   proposte sono `acquisto|voce`: non fabbricare un acquisto per la pesca.
   Manifest pubblico, reader, editor e unità devono essere identificati prima
   del codice. Questa sezione è ancora da definire dal responsabile tecnico.
6. **Fatto che abilita la Perizia.** Il controesempio Omoteura97–99 impedisce
   «almeno un pesce nell'intera visita ⇒ bonus». Il contratto deve registrare
   riconoscimento del beneficio/riscossione finale, con ignoto esplicito,
   conservando ogni cattura anche senza beneficio. La proposta generale del
   §4 recepisce il vincolo; macchina degli stati e payload restano da fissare.

Nessun esito PASS completo è stato comunicato. L'assegnazione successiva del
coordinatore prevede un contratto tecnico in sola analisi, da integrare qui
prima del riesame finale; nessun sorgente pesca viene modificato ora.

## 7. Conservazione e gate di una futura implementazione

La migrazione futura deve partire da firma pubblica riconoscibile, non dal
RAW live, con audit immutabile prima degli UPDATE e transazione atomica.
Varianti personali, fotografie non riconosciute o assenze richiedono esito
esplicito; nessuna ricreazione o cancellazione di progressi per far coincidere
il seed. Ripristino/import non devono reintrodurre metà della vecchia formula
o il prezzo dell'esca come yen.

Il contratto deve includere scheda attività, sede, selettori e voci del Diario,
catalogo, R6-31, unità e reader comuni. La cattura non viene dedotta da nome,
data, Dote o contatore. Le provenienze manuali e Diario devono concorrere
senza annullamenti reciproci indebiti; gli effetti applicati richiedono inverse
esplicite, conservando decisioni e ricevute successive al ripristino.

L'alternativa del solo semaforo della visita con avvisi testuali sui pesci è
descritta per confronto: non soddisfa da sola la disponibilità specifica e
non viene proposta come chiusura completa. La soluzione raccomandata mantiene
visibile l'ambito della prova e il lavoro ancora necessario, senza ridurre o
rinviare silenziosamente requisiti dell'utente.

Nessun test, API writer, migrazione, scrittura DB o servizio eseguito per
questa istruttoria; nessun dato personale, fotografia o copia DB salvato.
