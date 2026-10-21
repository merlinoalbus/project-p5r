# Audit di conformità alle specifiche — 21 ottobre 2026

Stato: **non conformità accertate, nessuna approvazione globale**. Rapporto Lorentz acquisito dall'utente; nella ripresa operano revisori distinti per L5/L6, L7 e documenti, in sola lettura e con accesso diretto alle specifiche originali. Questo rapporto non sostituisce le specifiche e non autorizza correzioni del prodotto. I nomi dei revisori descrivono incarichi distinti: la seconda passata non viene attribuita retroattivamente a Lorentz.

La [matrice completa degli identificativi dei requisiti](audit-copertura-2026-10-21.md) accompagna questo rapporto. «Completa» indica che ogni identificativo è riportato, non che tutti i comportamenti siano verificati: ogni riga dichiara copertura e limiti.

## Perimetro ed evidenze

- Ramo `newreview`; pubblicato e remoto verificati con fetch: `c025154a0d2c2e73245348fb532ee74c617ca5e1`.
- Ultima pipeline ricontrollata via GitHub: `39514931684`, stato `completed`, conclusione `success`, sullo stesso SHA. Una pipeline riuscita non prova conformità alle specifiche.
- L5 e L6: verifica del codice **pubblicato** con `git show c025154a:<percorso>`, non dei file locali già modificati per L7. Nessun filtro per autore del commit.
- L7: codice **locale non pubblicato**. Il registro delle migrazioni si ferma a 120 e quello utente a 025; M7/121 e utente 026 non registrate. Il nuovo router del catalogo non è montato.
- Specifiche originali: requisiti, modifiche e piano nella revisione pubblicata, con storia git per stabilirne la precedenza. Per L7, il documento originale `modifiche.md` è già in `43ad8889`; le successive note locali di attuazione non costituiscono autorizzazione retroattiva.
- I requisiti del PM sono input legittimi. L'audit cerca reinterpretazioni, omissioni e scostamenti dell'esecutore rispetto a quegli input e alle istruzioni successive dell'utente. Una possibile inesattezza di dominio del PM non dimostra un arbitrio dell'esecutore.
- Nessun test scritto o eseguito, nessuna migrazione o prova in scrittura sui dati, nessun servizio gestito. Durante l'audit si aggiornano solo i documenti di coordinamento.

## L5 e L6 pubblicati

**Rapporto indipendente di Lorentz acquisito dal messaggio dell'utente nella ripresa del 21 ottobre. Esito: L5/L6 non approvabili come integralmente conformi.** Quattro bug, un'omissione funzionale e uno scostamento esplicito, più un limite della selezione degli ingressi. La seconda lettura indipendente (`revisore_l5_l6`) conferma questi rilievi e aggiunge A56-08. Nessuna correzione del prodotto durante questo audit.

Base originale: piano generale `3ff21b4a`; requisiti e modifiche L5/L6 `43ad8889`, anteriori alle migrazioni 115/118. Codice della matrice: **`c025154a`**, letto con `git show`, non il working tree. Le righe sono quelle delle revisioni indicate. I controesempi sono dedotti staticamente: non dimostrano la presenza delle configurazioni nei dati correnti di p5s.

| ID | Specifica originale a `43ad8889` | Codice a `c025154a` | Esito e controesempio |
|---|---|---|---|
| A56-01 | L6/modifiche:158–161; R5-20b/d: quartiere aperto AND condizioni proprie del luogo | `server/services/sbloccoLuoghi.ts:22`; `luoghiService.ts:114–159` | Bug: lo sblocco combina condizioni proprie e inviti, senza il quartiere. Un luogo di Shinjuku senza condizioni proprie può risultare aperto il 17 giugno con quartiere chiuso; la valutazione incompleta raggiunge anche il negozio. |
| A56-02 | L5/modifiche:265–276; R6-21: corrispondenza visore/«Luoghi qui», condizioni del pin assolute | `server/services/mappe/areeService.ts:243–255`; `src/pages/AreaPage.tsx:260–272`; `server/services/mappe/mappeService.ts:520–535` | Bug: l'elenco valuta la presenza del luogo, il visore anche le condizioni del pin. Luogo aperto, pin subordinato a una voce non segnata: assente nel visore ma selezionabile dall'elenco. |
| A56-03 | R5:102; L6/modifiche:43–46: link al Confidente | `src/components/confidenti/InvitiConfidente.tsx:32`; `src/components/guida/CondizioniEditor.tsx:179`; `src/router.tsx:75` | Bug: link `/guida/confidenti/<chiave>` contro rotta registrata `/confidenti/:chiave`, senza alias. Non è un difetto del gesto di registrazione dell'invito. |
| A56-04 | R6:90 e :46: «Apre» dei libri e condizioni composte valide | `server/services/attivitaService.ts:107–121`; `shared/condizioniSpillo.ts:427`; `src/pages/LibriPage.tsx:138` | Bug semantico: raccolta indiscriminata delle foglie `lettura`, anche sotto NON. Un luogo con NON(lettura X) appare fra quelli aperti dal libro X, ma la lettura lo chiude. |
| A56-05 | R6:47; L6/modifiche:274: editor dello sblocco proprio del negozio quando diverso dalla sede | `src/components/guida/moduli/ModuloNegozio.tsx:29`; `server/services/catalogoService.ts:35`; `negoziService.ts:56` | Omissione: solo eccezioni di orario; manca lo sblocco proprio modificabile, scrivibile e letto dal negozio. Nessuna autorizzazione individuata alla sua eliminazione. |
| A56-06 | L6/modifiche:237–239,255: copie identiche della finestra sui pin sostituite da riferimento unico | `server/db/migrations/118_condizioni_uniche.ts:22–23,301–310` | Scostamento esplicito: le copie, se presenti, restano per scelta dell'esecutore. La motivazione nel commento non è approvazione. Impatto sui dati pubblicati non misurato; non autorizza a cambiare gli esiti delle condizioni. |
| A56-07 | R6:46; L6/modifiche §4.4: condizioni composte e ingresso del giorno | `server/services/condizioni/valutatore.ts:376`; `server/services/palazziService.ts:287` | Limite statico: `copreIlGiorno` considera solo date/intervalli al primo livello. Una finestra annidata può essere respinta dal pin ma ignorata nella scelta dell'ingresso. Nessun ingresso reale con questa configurazione accertato. |
| A56-08 | L6/modifiche:219–221: effetto legacy `sblocca-luogo` non più mostrato | `server/services/attivitaService.ts:43–47,137–138`; `shared/effettiOggetto.ts:162`; `src/pages/LibriPage.tsx:135–138` | Nuovo bug della passata indipendente: «Che cosa fa» continua a mostrare «Sblocca X» dagli effetti storici, accanto ad «Apre» calcolato. Cambiare la condizione del posto lascia la vecchia promessa visibile. Non misurata l'incidenza sui libri di p5s. |

### Copertura dichiarata da Lorentz

| Requisiti L5 | Copertura statica e limite |
|---|---|
| 01,15–16 | Assegnazioni conservative e luoghi senza Area presenti; completezza dei pin/elenchi residui non certificata. Rimozione del solo blocco Area «Da posizionare» autorizzata. |
| 02–04,12b–12c | Nomi/descrizioni del luogo e note proprie distinti; orari luogo/negozio/Confidente separati nei percorsi esaminati. Conversione di ogni riga reale e ogni consumatore non verificata. |
| 06–08 | Sede strutturata e ripristino con protezione degli snapshot vecchi presenti. Rimangono ripieghi per negozi senza sede previsti dal piano. Importa da backup sostituisce la vecchia promessa di aggiornamento del pacchetto. |
| 09–11,14,17–18 | Sezioni negozio, reindirizzamento con ancora, nome commerciale da negozio, creazione atomica luogo/pin e link presenti. Non provati acquisti, posizionamento e tutti i percorsi. |
| 12–13,19–20f | Copertura parziale: A56-01/02/03/05; conservazione acquisti e tutte le sincronizzazioni non provate. Sakura esclusa; Sakai con 16 intervalli; Nagiuri Hifumi 4 OR libro nel codice. |
| 21 | Percorso base di eliminazione/ripristino nel registro del cestino: sedi scollegate e ripristinabili. L'ipotesi iniziale di perdita necessaria dei legami **non è confermata**. |

Il rapporto non certifica runtime, layout, conservazione completa dei dati né equivalenza di tutte le condizioni sulle partite. Le verifiche funzionali spettano all'utente. I limiti restano aperti; non sono requisiti cancellati o trasferiti ad altri lotti.

### Copertura integrativa della seconda passata L5/L6

Confermati staticamente il ripristino anche degli UPDATE del cestino (`cestinoService.ts:305–380`), i nomi correnti luogo/negozio nell'accesso mondo e nei riferimenti del Diario (`mappe/accessoMondoService.ts:129–137`, `azioniStrutturateService.ts:76–99`), lo stato completo passato ai semafori (`partiteService.ts:290–295`) e scrittore/lettore delle finestre sulle colonne del dungeon. Le attività mantengono condizioni proprie, coerenti con la separazione di ambiti del piano e il lavoro previsto in L9: non classificato automaticamente come bug.

Importazione: `condizioni/importazione.ts:10–90` attraversa gruppi, negazioni e snapshot per `manuale → avviso`; chiamata dall'importazione DB in `pacchettoGiocoService.ts:363`; il resoconto mappe riguarda le conversioni accettate (`mappeService.ts:1971–1978`). Non certificata equivalenza di ogni backup. Migrazioni 115/118 lette staticamente, nessuna esecuzione né confronto dei DB. Anche questa passata **non è approvazione integrale requisito per requisito**.

Le precedenti contestazioni fondate soltanto sulla presenza di decisioni del PM vanno ritirate: per esempio, la rettifica del rango 1 di Ohya alla data indicata dal PM è prescritta da L6 `modifiche.md`, non una reinterpretazione autonoma dimostrata. Questo non certifica la correttezza di dominio della prescrizione, che non è l'oggetto della presente attribuzione.

R6-19 resta parziale anche sul metodo: `elenco-frasi-condizioni.md` entra in `63e12734`, dopo la migrazione 118 in `fdae7867`, e dichiara una base storica schema 93, non p5s. Non dimostra l'inventario preliminare completo né la sua approvazione/applicazione; ciò non significa che tutte le conversioni G-029/G-031 siano prive di fonte. Le esclusioni dell'editor fuori dalle mappe hanno inoltre precedenti decisioni esplicite (`DECISIONI.md@c025154a:1014,1488–1490`): la tensione con R6-07 va tracciata senza attribuire automaticamente un'omissione arbitraria.

## L7 locale — riscontri riesaminati da un agente distinto

Esito del revisore `revisore_avversariale_l7`: **L7 non approvabile come consegna conforme**. Specifiche lette direttamente a `43ad8889`, unica revisione commessa del corpus L7, del 20 ottobre 2026 alle 10:29:10 +0200; codice locale letto prima del rapporto dell'esecutore. Nessuna modifica, test, compilazione, DB o servizio gestito dal revisore.

| ID | Specifica o istruzione ricevuta | Codice o documento riscontrato | Valutazione e limite |
|---|---|---|---|
| A7-01 | L7 `modifiche.md` originale §1: identità in `catalogo_oggetto`, fonte primaria sulla stessa riga, riferimenti per chiave; l'utente ha contestato esplicitamente il livello intermedio di conversione. | `server/db/migrations/121_catalogo_oggetti.ts:19` crea anche `catalogo_oggetto_fonte`; `catalogoOggettiLetture.ts:77` la usa nelle letture; `catalogoOggettiFusione.ts:192` la mantiene nelle fusioni; `cestinoService.ts:83` la include fra le tabelle riconosciute. | Estensione architetturale dell'esecutore, assente dallo schema ricevuto e contestata dall'utente. La motivazione tecnica di conservare più fonti dopo una fusione non costituisce approvazione. **Ancora presente**, non rimossa e non pubblicata. |
| A7-02 | L7 `piano.md:92`: togliere `oggettiSelezionabili.ts` e `OggettoSelezionabileDto`; `modifiche.md` originale §1.1: il collegamento si legge con join sul catalogo. | `server/services/oggettiSelezionabili.ts:48` introduce `formatoStorico`; righe 159 e 171–173 conservano esplicitamente un adattatore anche dopo M7. | Il ramo post-M7 conserva un percorso che il piano chiede di eliminare. L7 è incompleto: non è una modifica già consegnata, ma una scelta locale da correggere/riesaminare, non da giustificare come rinvio già approvato. |
| A7-03 | Principio utente degli stati dal Diario; risposta esplicita: «dal Diario quando riporto una visita al memento posso dire se apro il dedalo X». | Il checkpoint L7 delle 04:50Z dichiarava Progressi una scelta autonoma e la domanda una preferenza. Ora `shared/condizioniSpillo.ts:71` contiene nove eventi e `server/routes/partite.ts:129` passa `apertureDedali`, ma `server/services/effettiAzioneService.ts:22` non li contempla; il gesto del Diario non è collegato. | Scelta di flusso fatta dall'esecutore e successivamente superata dalla risposta dell'utente; richiesta del Diario **non soddisfatta**. I resoconti di Progressi sono storici, non prova di approvazione. Non si certifica la semantica completa dei dedali. |
| A7-04 | L7 `modifiche.md` originale §2.4: proposte dal file di Analisi dati `l7-proposte.json`, con chiavi complete. | Checkpoint L7 §«Decisioni e scostamenti», punto 1: file non reperito e proposte ricostruite da chiavi effettive e tabella Tanaka; conversione in `catalogoOggetti121.ts`. | Scostamento del metodo di preparazione degli input. L'equivalenza completa con l'elenco previsto non è dimostrata. Questo da solo non prova che ogni proposta sia errata: occorre confronto riga per riga prima di dichiarare copertura. |
| A7-05 | Non inventare dati mancanti nelle ricette. | `lotti/L7/difetti.md`, L7-19, e checkpoint delle 02:34Z documentano l'assunzione iniziale di resa 1 e la sua rimozione. Lo schema locale `121_catalogo_oggetti.ts:34` ammette resa nulla per i prodotti di ricetta. | Errore dell'esecutore documentato nella bozza e corretto localmente prima del rilascio. Non è una prova di scrittura del valore errato sui dati di p5s, né un difetto attuale dimostrato di tutte le ricette. |

Il revisore conferma A7-01…04 con i limiti della matrice. In A7-02 rileva anche `shared/types.ts:3044` e i consumatori del DTO ancora presenti; l'adattatore viene usato dopo M7, non solo per i dati precedenti. In A7-03 conferma l'assenza del parametro/gesto corrispondente in `src` e della gestione negli effetti. A7-05 è verificato staticamente per la **resa dei prodotti** (`catalogoOggetti121.ts:162–165`, schema e UI); non per qualsiasi quantità.

### Nuovi rilievi della passata indipendente L7

| ID | Specifica | Codice locale | Esito e limite |
|---|---|---|---|
| A7-06 | R7-04 a `43ad8889:38`: nome dalla stessa identità e rinomina ovunque | `server/services/catalogoOggettiService.ts:106–107`; `src/pages/OggettoPage.tsx:127` | Bug: «Serve per fabbricare» usa `nome: r.ricetta`, identificativo storico, anziché il nome del prodotto collegato nel catalogo. Una rinomina del prodotto non raggiunge la pagina dei materiali. Controesempio statico, non gesto eseguito. |
| A7-07 | Non inventare quantità mancanti; conservazione dei dati delle ricette | `server/db/migrations/catalogoOggetti121.ts:172–176` | Quantità del materiale assente/non valida trasformata in 1 prima di legame o proposta. Distinto dalla resa corretta in A7-05. Presenza del caso sui dati attuali non accertata; le 23 quantità valide citate nel checkpoint sono una misura precedente. |
| A7-08 | M7 originale:279–280,289–291,297–301 | Convertitore locale e ricerca nelle migrazioni | Attuazione non individuata per «Set di mascotte locali» se assente, prezzi Kanda 14.000/12.000 con ripristino, controllo/«Da rivedere» di Hagoromo. Non è prova che ogni dato corrente sia sbagliato: manca attuazione o prova che l'operazione sia superflua. |
| A7-09 | Consegna del catalogo raggiungibile e migrazioni registrate | `server/db/migrations/index.ts:134`; `server/db/migrazioniUtente/index.ts:36`; `server/routes/index.ts:25–38` | Integrazione intenzionalmente incompleta: registri a 120/025 e router catalogo non montato. Non attivare per mascherare i rilievi; nessuna prova che M7 abbia già modificato p5s. |

### Contraddizioni della base originale, distinte dagli arbitrii

- **Equipaggiamento:** R7-03b:36 e M7:265–268 a `43ad8889` richiedono identità separate salvo fusioni approvate; M7:86–94,124,263–264 prescrive il collegamento automatico dei cinque articoli con tre nomi coincidenti. `catalogoOggetti121.ts:136–148` segue la seconda prescrizione. Non è un arbitrio dimostrato dell'esecutore. La successiva delega dell'utente e la scelta tecnica sotto risolvono quale regola seguire; il codice non è ancora adeguato.
- **Nomi estesi/abbreviati:** R7-03b richiede forma estesa e abbreviazione fra gli alias; M7 §2.2 prescrive l'opposto, mentre §8.2 torna alla forma estesa. Il conflitto è già in `43ad8889`: conservarne la traccia e risolverlo prima di imporre una regola ai dati.
- **Pagine Libri/Film/Videogiochi:** R7-05 parla di filtri del catalogo, M7 §8.8 di mantenimento delle pagine e dei progressi. Non usare questa tensione per attribuire automaticamente una deviazione all'esecutore o eliminare gesti esistenti.

### Decisione sopravvenuta sulle identità — delega dell'utente, 21 ottobre

Alla domanda esplicita su quale regola applicare al conflitto R7-03b / M7 §2, l'utente ha risposto **«la soluzione migliore»**. La risposta affida la valutazione tecnica all'assistente; non è una scelta testuale dell'utente a favore di una delle opzioni.

**Scelta tecnica, riesaminata favorevolmente da `revisore_avversariale_l7`: nessun abbinamento dataset/listino fondato soltanto sul nome; identità distinte finché l'equivalenza non è documentata, con eventuale fusione sottoposta all'approvazione prevista.** G-024 (`guida/registro.md:1212–1219`) distingue itemizzazione e vendita e documenta differenze statistiche nel campione: non dimostra che tutti e cinque gli articoli siano diversi. Il nome coincidente non basta a giustificare un'identità condivisa, che propagherebbe rinomine e statistiche anche a oggetti potenzialmente diversi.

Prima di qualsiasi conversione confrontare in sola lettura le coppie effettive per chiavi, categoria, destinatario, statistiche, effetto, variante normale/allarme e provenienza. Conservare i collegamenti già scelti esplicitamente dall'utente, senza inventarne l'origine; le identità dubbie rimangono riconoscibili nell'elenco da riesaminare. Chiavi articolo, acquisti, date e riferimenti all'itemizzazione restano invariati; trasferimenti e ripristino della futura fusione richiedono riesame specifico. Prezzo e nome non costituiscono prova d'identità. La regola è scelta e riesaminata; nessuna conversione è stata eseguita o convalidata.

### Copertura e limiti della revisione L7

Esaminati schema/conversione, catalogo/dettaglio, fonti, offerte, regali, proposte/fusione e registro cestino; consumatori principali di letture, compendio e Diario; dedali, listini condivisi e importazione. La fonte intermedia contestata è attiva nei lettori e nelle fusioni, non un residuo inutilizzato.

M7 §8.10 a `43ad8889:302–306` ammette listino per set e conservazione dei duplicati fino a L11: `listino_condiviso`, `articolo_condiviso` e legame per UID **non provano da soli arbitrarietà**. Nel codice letto: corrispondenza biunivoca prima della condivisione, pin 1527/1547/1768 distinti dai dubbi 1584/1769, sede scelta nella presenza e registro del cestino per modifiche/fusioni.

Non verificati: equivalenza completa delle proposte, copertura di ogni contenuto/premio, conservazione dei DB reali, migrazione e reversibilità runtime, completezza dei set A/B/D, tutti i link, prezzi/acquisti reali e layout. Questi limiti impediscono un'approvazione globale.

### Conteggio visite e apertura alla seconda visita

Il convertitore locale `server/db/migrations/scambiJose121.ts:2–7,22–30` associa sette requisiti letterali di apertura a eventi; non conta visite né calcola una seconda visita. Nei percorsi esaminati non è stata trovata una regola automatica di apertura alla seconda visita. Le occorrenze testuali trovate per «seconda visita» riguardano anche cinema e nomi di aree di Shido: non sono prova di una regola dei dedali. **Non si deve presentare questa ricerca come dimostrazione esaustiva di assenza in tutto il sistema.** L'integrazione Diario resta incompleta e la sua semantica non è stata convalidata.

### Errori tecnici e documentazione corrente

Ultimo typecheck osservato nel lavoro precedente: exit 1, per `apertureDedali` non previsto da `OpzioniSpunta` (`server/routes/partite.ts:129`) e import `RiferimentoAzioneDto` inutilizzato (`server/services/azioniStrutturateService.ts:21`). Le incongruenze sono ancora leggibili nei sorgenti; nessuna correzione eseguita durante l'audit. I controlli verdi delle 05:14Z non coprono le modifiche successive. Sono difetti di integrazione, distinti dall'attribuzione di una modifica arbitraria alle specifiche.

Anche i riferimenti tecnici aggiunti per i listini condivisi (`negozio_sede_spillo`, `listino_condiviso`, `articolo_condiviso`) richiedono confronto con L7 §8.10. La sola presenza di colonne aggiuntive non dimostra una modifica arbitraria della logica: il requisito ammette listini condivisi e conservazione dei vecchi articoli fino a L11. Giustificazione, necessità e impatto complessivi non sono ancora convalidati.

## Proposta correttiva da validare prima di modificare il prodotto

La proposta segue i requisiti individuati e non modifica retroattivamente il piano. L'utente ha chiesto prima evidenze e soluzione validata: nessuno degli interventi sotto è già eseguito o autorizzato dal solo rapporto.

1. **L5/L6:** comporre lo sblocco effettivo del luogo con quello del quartiere, riusando la valutazione condivisa; usare la stessa disponibilità del pin per visore ed elenco; correggere i due link alla rotta registrata; distinguere dipendenza positiva/negata nella relazione «Apre» e smettere di mostrare l'effetto storico `sblocca-luogo`; completare sblocco proprio del negozio in schema, editor, scrittura e lettura. Riesaminare tutti i consumatori coinvolti senza trasformare le condizioni in prosa o copie.
2. **Finestre/ingressi:** risolvere la divergenza della 118 con una migrazione successiva, senza riscrivere migrazioni pubblicate né condizioni dell'utente. Prima occorrono inventario e dimostrazione di equivalenza delle sole copie candidabili; quelle non equivalenti restano esplicitamente in elenco. La selezione dell'ingresso deve rispettare le combinazioni temporali, senza assumere vere le sottoespressioni ignorate.
3. **L7, identità:** convertire ai riferimenti diretti previsti, aggiornati anche nelle fusioni e nel ripristino; rimuovere la tabella intermedia contestata e il percorso post-M7 del vecchio selettore. Prima di implementare occorre la mappa di tutti i riferimenti delle fonti originarie: tornare soltanto a `catalogo.fonte_tipo/fonte_chiave` perderebbe le ulteriori fonti dopo una fusione. Conservare identificativi, effetti e progressi esistenti: eliminare un raccordo non significa cancellare le tabelle che custodiscono stati e dati specifici.
4. **L7, Diario:** dichiarazione esplicita del dedalo nella visita Memento, letta dal requisito di Jose. Nessuna deduzione dal numero di visite, data o completamento. Prima dell'implementazione definire la titolarità della dichiarazione per voce e cosa accade all'annullamento in presenza di altre dichiarazioni o dati manuali, coerentemente con gli effetti esistenti e senza creare un secondo avanzamento. Questo punto richiede un disegno puntuale, non autorizza un contatore delle visite.
5. **L7, input e consumatori:** recuperare l'elenco originale delle proposte e confrontarlo per chiave, contenuto e quantità. Se irreperibile, sottoporre l'alternativa all'utente senza dichiararla equivalente. Nome prodotto delle ricette dal catalogo, gestendo anche zero o più prodotti senza sceglierne arbitrariamente il primo. Quantità ignote come anomalia/proposta, mai default 1: lo schema attuale ammette null solo per il prodotto, quindi va definito il percorso per materiale ignoto prima della modifica. Riesaminare le prescrizioni puntuali di A7-08 sui dati correnti in sola lettura.
6. **Chiusura futura:** solo dopo soluzione validata e correzioni, typecheck/lint/build, tre riesami propri e revisione avversariale distinta. Nessun test scritto/eseguito; pubblicazione di codice completa e pipeline seguita, senza includere bozze respinte.

Restano da risolvere con evidenze e validazione i conflitti originari non coperti dalla delega sulle identità, la sostituzione dell'elenco proposte se non recuperabile e qualsiasi conversione di finestre che cambi gli esiti. Non richiedere di nuovo la scelta sulle identità già delegata. I bug dimostrati non giustificano cambiamenti ulteriori alle logiche di gioco.

## Consegna dell'audit e condizioni ancora aperte

Il rapporto Lorentz è acquisito; le nuove passate indipendenti L5/L6 e L7 sono concluse con i rilievi e i limiti sopra. **Riesame documentale distinto: APPROVATO per la sola consegna documentale**, senza rilievi bloccanti residui; nessuna approvazione di prodotto, dati o runtime. La proposta è una direzione correttiva con i punti ancora da progettare dichiarati, **non una specifica eseguibile già approvata**. Non convertire «non verificato» in «conforme», non cambiare il piano per farlo combaciare col codice, non pubblicare L7 incompleto e non attribuire all'utente decisioni dell'esecutore.

Autoriesami della consegna: confronto delle attribuzioni e delle revisioni; coerenza documentale/JSON, percorsi e controllo delle aggiunte per dati personali e segreti; perimetro del commit e identità del codice locale prima/dopo. La matrice contiene tutti gli ID estratti dalle specifiche originali, inclusi i suffissi come 08c2/08c3: L5 40/40, L6 40/40, L7 30/30. Non sono prove funzionali. L'impronta combinata dei sorgenti locali modificati/non tracciati è rimasta invariata durante l'audit.

Il prompt diretto di ripresa richiede commit/push alla fermata; la memoria del 20 ottobre indicava invece solo fine lotto. Per questa consegna si segue il prompt corrente salvando **solo audit e coordinamento**, dopo revisione distinta, a codice pubblicato invariato. Non equivale a consegnare L7 e non salva remotamente la sua bozza di codice: quel limite deve restare esplicito. Nessun dato personale, copia DB o schermata nel commit.
