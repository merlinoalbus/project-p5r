# L5 — rimozione recuperabile del pin 1636

## Stato della consegna

Checkpoint del 21 ottobre 2026, prima della pubblicazione della 137. L'utente ha
ordinato la rimozione del pin 1636: il consenso è già acquisito e non occorre una
nuova domanda. **Il pin è ancora presente e nessuna rimozione è stata applicata.**

La versione pubblicata resta `814b17d8`, pipeline 81 `39662850767` riuscita,
schema 136/28. Il codice BE/FE della rimozione recuperabile e la migrazione 137
sono completi; due gate statici distinti PASS e tre riesami propri conclusi.
Il coordinatore comunica typecheck 2245, lint 38912 e build 62830 con exit 0.
Questi esiti non attestano ancora rilascio, migrazione live, rimozione o restore.

Le tre schede collegate ai pin 1466/1486/1526 sono una consegna separata,
approvata dall'utente e applicata con CAS freschi senza nuovi pin. Confronto
readonly positivo delle 46 tabelle utente e degli altri dati dichiarati;
osservazione autonoma Galaxy di schede, Area e visore con gate finale positivo.
Dei 23 candidati di [residui-23.md](residui-23.md) restano **20**, incluso 1636.
Non sono il totale deduplicato dei difetti L5. La rimozione futura di 1636
porterà questa popolazione a 19 solo dopo un esito effettivamente acquisito.

## Mandato e confine

La rimozione singola precedente non produceva un elemento recuperabile nel
Cestino. Il nuovo gesto conserva la fotografia del pin e degli effetti della
rimozione, con radice sull'UID originale. Non interpreta il nome del bersaglio
come attività, annuncio o sede commerciale e non crea un luogo sostitutivo.

La lettura mirata del bersaglio e le baselines sono attribuite al coordinatore;
nessuna riga RAW, UID effettivo, immagine o copia di database viene salvata in
questo dossier. La preparazione documentale non ha effettuato API writer.

## Contratto implementato nel codice locale

### Anteprima e identità

- `GET /api/mappe/spilli/:id/precondizione-rimozione` è readonly e `no-store`.
  Legge una fotografia transazionale senza assegnare o riparare UID.
- Il DTO identifica ID, UID, nome, mappa pubblica/Area guida e conteggi dei
  contenuti coinvolti; espone `revisioneRimozioneAttesa`, SHA-256 della fotografia.
- Il nuovo gesto UI invia al DELETE la coppia strict
  `{spilloUid,revisioneRimozioneAttesa}`. I due campi devono essere presenti
  insieme e validi; non vengono ignorati campi aggiuntivi. La compatibilità dei
  chiamanti precedenti non trasforma un corpo assente in un consenso CAS.
- La fotografia comprende riga integrale, contesti, relazioni, immagini e
  riferimenti condivisi, condizioni che citano il pin, stati delle partite e
  storia/epoca del Cestino. Se serve il riallineamento delle voci, comprende
  anche gli input del modello coinvolto.
- ID numerico riutilizzato, contenuti o contesto cambiati e vecchia anteprima
  dopo una rimozione/restore non autorizzano il nuovo gesto. Un'immagine
  caricata condivisa con altri pin produce un conflitto conservativo.

### Scrittura e Cestino

`DELETE /api/mappe/spilli/:id` usa una transazione IMMEDIATE sulla connessione
con il file utente collegato. Il nuovo percorso rilegge fotografia e identità,
confronta il CAS, esegue il writer ordinario e richiede `changes === 1` per la
radice. Qualunque errore annulla la transazione. Successo HTTP 204.

La rimozione singola passa da `conCestino` con tipo `pin` e chiave UID originale.
I chiamanti aggregati conservano il proprio unico elemento esterno, senza un
secondo Cestino annidato. Il registro fotografa i cambi effettivi ai due schemi.
Un'allowlist specifica verifica radice, immagini, relazioni e stati prima di
accettare il registro e prima del ripristino; famiglie estranee non sono saltate.

Il ripristino ordinario controlla fotografia integrale, schema corrente,
collisioni e riferimenti; non ricrea una radice diversa né sovrascrive
silenziosamente decisioni successive. Il caso `pin` evita la riconciliazione
degli acquisti estranea al gesto e riallinea le voci solo quando il pin fa parte
del relativo modello. Il Cestino e la sua fotografia restano nell'istanza.

### Risposta incerta e frontend

Prima della rete, il registro versionato della sola scheda conserva identità,
mappa, payload e CAS. Chiusura, cambio selezione o reload non trasformano un
invio incerto in un nuovo invio. Un successo 204 acquisito resta noto anche se
la persistenza locale dell'esito fallisce; il suo salvataggio non ripete RPC.

L'editor mostra la conferma della fotografia. In Impostazioni, «Rimozioni
conservate in questa scheda» consente di rileggere pin e Cestino anche quando
il bersaglio non è più selezionabile. La rilettura distingue lo stato osservato
dall'attribuzione dell'operazione; nessun retry automatico o rimozione del nuovo
pin selezionato. Errori del registro bloccano nuovi invii.

## Migrazione 137 e baseline fresca

La 137 estende soltanto il vincolo dei tipi di `main.cestino` per ammettere
`pin`. Prima di una ricostruzione richiede il DDL 136 noto, le 11 colonne
attese, i due indici riconosciuti, nessun trigger aggiuntivo e nessuna FK
entrante. Schema diverso provoca errore, senza sostituzioni parziali.
Conserva e ricontrolla la firma integrale delle righe e l'epoca AUTOINCREMENT,
anche quando prima non esisteva una sequenza. Non azzera il Cestino e non
arretra l'epoca che impedisce il riuso di anteprime precedenti.

**Baseline compatta fresca prima della 137, riferita dal coordinatore alle
20:11Z:** schema 136/28, 46 tabelle utente, 95 main, 998 voci Diario, 1913 pin,
316 mappe e **tre righe Cestino integre**, bersaglio 1636 presente.
DDL/colonne/indici/trigger/FK coincidono con la guardia sopra. Dati solo RAM.
Il precedente conteggio diagnostico di una riga è stato smentito dal COUNT e
dall'iterazione mirata: non è prova di una cancellazione. La baseline compatta
lo supera senza trasportare i registri RAW, rimasti integri nell'istanza.

## Gate acquisiti e passaggi ancora aperti

| Passaggio | Esito a questo checkpoint |
|---|---|
| Consenso alla rimozione 1636 | Acquisito dall'utente |
| Soluzione e codice BE/FE | Due gate statici distinti PASS, comunicati dal coordinatore |
| Tre riesami propri | Conclusi, comunicati dal coordinatore |
| Typecheck/lint/build | 2245/38912/62830, tutti exit 0 |
| Pubblicazione e pipeline 137 | Non ancora eseguite |
| Migrazione live e confronto con baseline fresca | Da acquisire |
| Rimozione autorizzata con fotografia fresca | Non applicata; pin ancora presente |
| Osservazione distinta del risultato e recuperabilità | Da acquisire sul pubblicato |

Nessun test scritto o eseguito in questa attività. Il passaggio successivo è
del coordinatore: pubblicazione, pipeline, osservazione e applicazione già
autorizzata. Nessun esito futuro è anticipato e il lotto L5 resta aperto.
