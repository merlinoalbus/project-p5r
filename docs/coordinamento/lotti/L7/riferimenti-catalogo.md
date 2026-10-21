# L7 — inventario dei riferimenti e dei ripristini

Stato al 21 ottobre 2026: riesame statico indipendente e gate di attivazione integrata approvati; migrazioni gioco 121/122 e utente 026, router e descrizioni OpenAPI registrati. Nessun blocker di codice residuo nei perimetri L7 riesaminati. Questo inventario non certifica l'esecuzione delle migrazioni, i dati convertiti, il runtime o il layout. Nessun test eseguito. Il coordinatore riporta typecheck `39444` e lint `29880` exit 0 dopo l'attivazione; build finale in corso. Pubblicazione ed esiti successivi sono nella Regia.

Per A7-04 è approvata la capacità di censimento e riconciliazione. Singoli dati, varianti, proposte e sottoelementi degli aggregati restano da valutare dove indicato; la ricostruzione non è dichiarata equivalente all'input preliminare irreperibile. L'audit è una fotografia della conversione, non un'approvazione automatica delle sue proposte.

Base dei requisiti: requisiti, modifiche e piano L7 alla revisione `43ad8889`, più decisioni esplicite registrate nella ripresa. Le pagine Libri, Film e Videogiochi conservano i propri avanzamenti come previsto dalla sezione 8 delle modifiche; collegano la casa Oggetto.

## Identità e fonti

| Riferimento | Lettura e scrittura | Fusione, eliminazione e ripristino |
| --- | --- | --- |
| `oggetto.catalogo_chiave` | Fonte equipaggiamento, conversione 121 e `catalogoOggettiLetture` | Trasferimento diretto in `catalogoOggettiRiferimenti`; il cestino registra la modifica della sorgente. Nessuna fusione automatica fra dataset e listino per il solo nome. |
| `libro`, `film`, `attivita.catalogo_chiave` | Identità canonica, avanzamenti sulle chiavi originali; `attivitaService`, `catalogoService`, `catalogoOggettiService` | La fusione rifiuta due fonti con progressi distinti e categorie incompatibili. Creare o rinominare una lettura tramite il modulo è atomico con l'identità. Il ripristino dei dati della lettura è distinto dal titolo canonico. |
| `articolo.catalogo_chiave` | Oggetto venduto; prezzo, condizioni, sede e costo restano nell'offerta | Trasferimento nella fusione; FK SET NULL alla cancellazione. Il modulo non inventa un prezzo dalla vecchia fonte del libro. |
| `confidente_regalo.catalogo_chiave` | `compendioService`, `regaliPartita`, scheda Oggetto | Trasferimento nella fusione, scollegamento alla cancellazione, recupero tramite registro. Il nome storico non ricollega automaticamente un regalo già scollegato. |
| Nodi `dati_guida`: `catalogoFonte` e `catalogoChiave` | `shared/riferimentiCatalogoGuida`, `compendioService`, `catalogoOggettiLetture` | La 121 assegna una sola volta l'identità stabile del nodo. I trasferimenti visitano soltanto i puntatori dichiarati, anche annidati. Il ripristino puntuale riconosce il nodo tramite `catalogoFonte`, preservando testo, ordine ed edit successivi. Ambiguità e conflitti sono segnalati. |
| `voce_oggetto` | Contenuti della guida, scheda Oggetto, schede nel visore | Fusione per chiave; quantità divergenti bloccano la fusione. Nessuna scrittura di avanzamenti o riscrittura della prosa. |
| `ricompensa_oggetto` | Richieste, domande, esami, Confidenti, Covo, sfide, prodotti delle ricette e risultati degli scambi | Trasferimento per fonte e chiave; nessuna deduzione di ottenimento. Prodotti multipli restano distinti; quantità ignota della resa resta NULL. |
| `ricetta_materiale` | Materiali per chiave; nomi del prodotto da tutte le identità collegate | Quantità del materiale richiesta esplicitamente quando ignota. Nessun default a uno. Zero prodotti mostra «Prodotto non collegato», con il nome storico distinto. |
| `trasformazione_oggetto` | Otto coppie per chiave mostrate nella casa Oggetto e da Jose | Entrambi i puntatori seguono fusione e cancellazione. Informazione, non acquisto o inventario: sette Palazzi usano il fatto concluso; Maruki usa soltanto il flag Nuova Partita+. Nessun prezzo o quantità inventata. |

La tabella intermedia `catalogo_oggetto_fonte` non viene creata. Se è già presente in uno schema di bozza non pubblicato, la 121 si interrompe prima di mutazioni: non elimina mapping non riconciliati.

L'elenco dei blocchi guida operativi è esplicito (`BLOCCHI_GUIDA_CATALOGO`): attualmente soltanto `oggetti-guida`, unico blocco in cui la 121 assegna puntatori. L'audit `audit-catalogo-121` e ogni snapshot storico sono esclusi dal trasferimento e dai controlli dei puntatori vivi nel cestino: le fotografie della conversione restano immutate anche se un oggetto viene fuso o eliminato.

Le scritture e i ripristini del catalogo verificano tutte le sorgenti libro, film e videogioco effettivamente collegate prima di cambiare categoria. Un'attività videogioco collegata al catalogo o a progressi registrati non può essere trasformata in un altro tipo tramite modifica o ripristino: il conflitto esplicito evita di rendere incoerente l'avanzamento.

## Costi, proposte e snapshot

| Dato | Regola di integrità |
| --- | --- |
| `articolo.costo_json` | Costi tipizzati per chiave, nessuna ricerca per nome. Fusione trasferisce e riunisce componenti uguali entro i limiti del contratto. Costo illeggibile non diventa gratuito. Eliminazione di un'identità citata in un costo vivo è rifiutata esplicitamente. |
| `articolo.seed_json` | La fusione trasferisce soltanto `catalogo_chiave`, il riferimento legacy dichiarato e i componenti di `costo_json`, preservando gli altri campi. Il ripristino dell'offerta verifica identità e costi prima della scrittura. |
| `proposta_abbinamento.catalogo_chiave` | Il candidato può essere realmente assente (NULL), senza chiavi vuote. Letture e aggiornamenti impiegano confronti NULL-safe. La scelta conserva la proposta precedente e la sua provenienza. Una collisione fra due proposte senza candidato blocca l'eliminazione, anziché perdere una riga. |
| `modifica_json` | Costi, risultati ricevuti e snapshot `prima` seguono la fusione con visite dei soli campi tipizzati. Quantità o risultati incompatibili bloccano il gesto. I riferimenti pendenti impediscono una cancellazione che li renderebbe morti. |
| `fonte_snapshot_json` | Fotografia separata dei campi pertinenti della fonte e dei collegamenti. La 121 la cattura per tutte le proposte, comprese quelle senza candidato, dopo la conversione e prima del salvataggio dell'audit. Conferma e scelta alternativa confrontano lo stato corrente nella stessa transazione della scrittura. Nome canonico e note estranee non sono usati per invalidare la proposta. |
| Gruppi della stessa fonte | Dopo una conferma si aggiornano soltanto gli snapshot dei fratelli che coincidevano già prima del gesto. Quelli già obsoleti non sono riabilitati. Scartare resta possibile senza cambiare la fonte. |
| Proposte dopo fusione | Lo snapshot viene conservato nel trasferimento. Se la fusione modifica la fonte pertinente, la proposta viene invalidata con motivo esplicito; resta possibile scartarla e correggere manualmente i collegamenti dalla fonte. «Scegli un altro oggetto» applica la stessa guardia della conferma. |

## Partite e listini condivisi

`acquisto_partita` conserva ogni chiave articolo e data storica. La spunta aggregata nel listino è l'unione delle registrazioni, mentre una condizione che cita una chiave articolo legge quella registrazione precisa. Il comando di annullamento elimina soltanto la chiave richiesta; l'interfaccia espone anche le registrazioni autonome delle altre offerte condivise.

| Registrazioni | Stato condiviso | Condizione articolo A | Condizione articolo B | Annulla A |
| --- | --- | --- | --- | --- |
| Nessuna | Non acquistato | Falsa | Falsa | Nessun acquisto creato |
| Solo A | Acquistato | Vera | Falsa | Nessuna registrazione restante |
| Solo B | Acquistato | Falsa | Vera | B e la sua data restano |
| A e B | Acquistato | Vera | Vera | B e la sua data restano; risposta ancora acquistata |

La migrazione utente 026 aggiunge `regalo_partita.catalogo_chiave` senza cambiare nome o data della consegna. Il riferimento attraversa due database e non ha una FK SQLite: la fusione lo trasferisce esplicitamente; l'eliminazione scollega soltanto la chiave e il cestino ne registra il recupero. I lettori successivi usano il riferimento salvato, anche quando NULL, senza ricostruirlo per nome.

Le sedi aggiuntive dei distributori vengono collegate solo alle chiavi e ai pin attestati: l'unicità di un luogo dello stesso tipo nell'Area non prova che sia quella sede. Luoghi dell'utente incompatibili o elementi già eliminati non vengono riutilizzati o ricreati arbitrariamente.

## Cestino, importazione e backup

Il cestino conserva i cambiamenti puntuali alle tabelle e alle partite. Non vengono riscritti indiscriminatamente registri storici. I confronti della chiave primaria ammettono NULL per le proposte senza candidato.

Il controllo finale del ripristino avviene dopo tutti i passi della transazione: verifica costi vivi e snapshot delle offerte, risultati e rettifiche delle proposte, puntatori annidati della guida e riferimenti dei regali fra database. In questo modo un oggetto rimesso dallo stesso gesto è già presente al controllo. Un riferimento mancante provoca conflitto e rollback completo: il registro resta recuperabile. Le foreign key SQLite continuano a gestire i normali legami strutturati.

`pacchettoGiocoService.RIFERIMENTI_PARTITE` include la colonna opzionale dei regali per la segnalazione degli orfani verso il pacchetto di destinazione. Il controllo non equipara l'importazione di un altro pacchetto a una fusione di identità e non cancella automaticamente le righe delle partite. Backup e ripristino restano quelli esistenti del progetto. L'esecuzione concreta dei roundtrip sui database non è stata effettuata in questa lavorazione.

## Consumatori e riscontri statici

- Catalogo e selettori usano `CatalogoOggettoDto`; il vecchio selettore e il vecchio DTO sono rimossi. I vecchi endpoint di compatibilità restituiscono il contratto canonico.
- Scheda Oggetto: offerte per sede, acquisizioni autonome, regali, progressi delle letture, posizioni strutturate con `DoveSiTrova`, ricompense, prodotti delle ricette e trasformazioni di Jose.
- I libri senza articolo conservano le posizioni strutturate disponibili nella propria scheda; la mancanza di offerte non produce una falsa dichiarazione di assenza di ritrovamenti. I premi delle Richieste restano relazioni strutturate.
- La raccolta dei forzieri usa soltanto pin `forziere` o `forziere-raro`. I Semi provengono da voci strutturate `volonta` e pin `seme-bramosia`, senza classificazione generale per prefisso del nome. Nessun pin di raccolta significa stato da verificare, non raccolta dedotta dalla voce aggregata.
- Gli effetti legacy `sblocca-luogo` dei libri sono filtrati sia nella lettura sia nelle statistiche mostrate dell'Oggetto. «Apre» usa l'influenza positiva della condizione tramite il servizio comune L5/L6.
- `AuditConversioneCatalogo` rende visibile l'inventario ricostruito per riga: la provenienza non è dichiarata equivalente al file originale irreperibile. Il manifest versionato contiene solo fonti del pacchetto pubblico; l'input della conversione effettiva resta nel database dell'istanza.

Tre riletture dell'esecutore: (1) preservazione e roundtrip, compresi costi negli snapshot, proposte NULL e regali cross-database; (2) semantica e fonti, compresi Semi, Cristalli/Anelli, quantità ignote e sedi; (3) consumatori e contratti, compresi nomi ricette, posizioni delle letture, selettore e DTO. Sono riletture statiche: restano distinti il giudizio del revisore, la compilazione e gli esiti effettivi della pubblicazione.
