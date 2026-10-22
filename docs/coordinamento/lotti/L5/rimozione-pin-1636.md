# L5 — rimozione recuperabile del pin 1636

## Stato della consegna

**Conclusa il21ottobre2026 nel solo perimetro1636.** Rilascio
`389387be631f665e781d7e7a7b9e3cc42e771819`, pipeline82
[`39668626532`](https://github.com/merlinoalbus/project-p5r/actions/runs/39668626532)
riuscita, p5s137/28. Singolo DELETE204 dopo fotografia UID/CAS fresca:
il pin è assente dalla Banchina e conservato nel Cestino con fotografia integrale.
Gate finale Galaxy PASS dopo osservazione autonoma Cestino/Banchina.

Typecheck2245, lint38912 e build62830 exit0, tre riesami propri e due gate statici
distinti prima del rilascio. Nessun test o ripristino del pin esercitato.

Le tre schede collegate ai pin 1466/1486/1526 sono una consegna separata,
approvata dall'utente e applicata con CAS freschi senza nuovi pin. Confronto
readonly positivo delle 46 tabelle utente e degli altri dati dichiarati;
osservazione autonoma Galaxy di schede, Area e visore con gate finale positivo.
Dei23candidati di [residui-23.md](residui-23.md) restano **19**, escluso1636.
Non sono il totale deduplicato dei difetti L5; il lotto resta aperto.

## Mandato e confine

La rimozione singola precedente non produceva un elemento recuperabile nel
Cestino. Il nuovo gesto conserva la fotografia del pin e degli effetti della
rimozione, con radice sull'UID originale. Non interpreta il nome del bersaglio
come attività, annuncio o sede commerciale e non crea un luogo sostitutivo.

La lettura mirata del bersaglio e le baselines sono attribuite al coordinatore;
nessuna riga RAW, UID effettivo, immagine o copia di database viene salvata in
questo dossier. La preparazione documentale non ha effettuato API writer.

## Contratto implementato e pubblicato

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

## Esiti reali e gate finale

Confronto readonly della Regia prima/dopo137:46tabelle utente e95main identiche,
compresi998vociDiario/1913pin/316mappe/3vecchiCestino, epoca e indici. Solo il
DDL del Cestino estende i tipi ammessi. Dati e impronte solo RAM, nessun DB copiato.

L’anteprima corrente del1636 coincide con il consenso, tutti i conteggi sono zero
e non richiede riallineamento. Un solo invio acquisisce204, nessun retry.
Confronto successivo:46utente identiche e95main diverse solo in spillo/cestino;
altri1912pin/998vociDiario/316mappe e tre registri Cestino precedenti identici.
Una nuova radice pin contiene un unico passo D su spillo con la riga originale
integrale, nessuna parte utente; epoca AUTOINCREMENT incrementata di uno.

Il coordinatore e Galaxy osservano in schede indipendenti la voce Pin Lavoro
part-time nel Cestino,505byte, Rimetti disponibile e schema137. Galaxy raggiunge
la Banchina: tre pin (due passaggi e stazione), nessun Lavoro part-time, senza
ricerca o interruttori che lo occultino. Console error/warn vuota nelle due nuove
schede osservate. Nessun Rimetti/Elimina/Svuota premuto. I confronti DB sono prove
della Regia; osservazioni UI indipendenti e PASS finale sono di Galaxy.

| Passaggio | Esito a questo checkpoint |
|---|---|
| Consenso alla rimozione 1636 | Acquisito dall'utente |
| Soluzione e codice BE/FE | Due gate statici distinti PASS, comunicati dal coordinatore |
| Tre riesami propri | Conclusi, comunicati dal coordinatore |
| Typecheck/lint/build | 2245/38912/62830, tutti exit 0 |
| Pubblicazione e pipeline137 |389387be, pipeline82 riuscita |
| Migrazione live e confronto con baseline fresca |137/28, conservazione positiva nel perimetro sopra |
| Rimozione autorizzata con fotografia fresca | Singolo204, pin assente e fotografia integrale nel Cestino |
| Osservazione distinta del risultato e recuperabilità | PASS finale Galaxy, Cestino/Rimetti e Banchina osservati senza scritture |

Nessun test scritto o eseguito, nessun restore esercitato. Questo consuntivo
chiude la richiesta di rimozione1636; non certifica il resto L5.
