# B1 — Dati della negoziazione: trascrizione Royal, abbinamenti, differenze

Analisi dati, 2026-10-23. Nessun codice né dato dell'app toccati, nessun commit; file scritti solo con Write/Edit. Questa versione sostituisce quella del mattino (che si fermava alla licenza): dopo la decisione dell'utente («Copia nel repository») il lavoro è completo.

## 1. Esito in breve

- **Foglio Royal trascritto**: 277 domande, 831 risposte, 3324 celle, in sette file con un indice. Controllo cella per cella contro `royal.md` della fonte pubblica: **identico su tutte le righe**. Le 304 celle non confermate sono segnate come tali (300 con la lettera minuscola, 4 multi-esito con campo dedicato).
- **neg-mappa e neg-diff rifatti** da zero sul senso, poi riscontrati con le misure storiche indipendenti: **tutti i conteggi del contratto tornano esattamente** (§4).
- **NOTICE** aggiornato con l'attribuzione a joyce-chen/persona5-negotiation; **DECISIONI.md** ha la voce datata 23/10.
- Resta un solo punto da sapere (§6): due attestazioni da rivedere e il file `negoziazione-royal.json` esteso, che comporrà B5.

## 2. File

Tutti in `docs/coordinamento/lotti/L8/dati-negoziazione/`:

| File | Contenuto |
|---|---|
| [negoziazione-royal.json](dati-negoziazione/negoziazione-royal.json) | Indice, legenda dei codici, fonte e data di lettura, totali per file e per umore, esito della verifica |
| [negoziazione-royal-1.json](dati-negoziazione/negoziazione-royal-1.json) … [-7.json](dati-negoziazione/negoziazione-royal-7.json) | Le 277 domande, in blocchi di 40 (l'ultimo di 37): R 0–39, 40–79, 80–119, 120–159, 160–199, 200–239, 240–276 |
| [neg-mappa.json](dati-negoziazione/neg-mappa.json) | 230 righe app→Royal: `a`, `r`, `ordine`, `certezza`, note e gruppi |
| [neg-diff.json](dati-negoziazione/neg-diff.json) | 87 celle differenti, 24 contraddizioni, 53 celle «solo P5», 58 domande Royal senza abbinamento, rettifiche A19 e A142 |
| [fonti-negoziazione.json](dati-negoziazione/fonti-negoziazione.json) | Fonti, licenza, decisione, allegati ricostruiti |
| [riconciliazione-conteggi.json](dati-negoziazione/riconciliazione-conteggi.json) | Catena 225/230, inventari per umore, multi-esito, doppioni |
| [schema-negoziazione-royal.json](dati-negoziazione/schema-negoziazione-royal.json) | Forma estesa che B5 comporrà e regole di lettura |

Formato compatto delle domande: `{"R":0,"ombre":[…],"q":"…","risposte":[{"n":1,"t":"…","c":["O","G","G","G"]}]}`. Le quattro celle di `c` sono nell'ordine cupa, irritabile, timida, giocosa. `G O B` = buona, passabile, cattiva; minuscolo = non confermata (classe `unconfirmed`); `-` = esito non documentato (non neutro); le quattro multi-esito sono il testo grezzo della cella, con `multi_non_confermate` che indica l'umore. R230 risposte 2 e 3 hanno `testo_disponibile:false`. Testi, errori di battitura, spazi finali e iniziali sono copiati come nella fonte.

## 3. Come ho trascritto e verificato la trascrizione

- Lettura in sola lettura di `royal.md` (nessun file della fonte salvato) e trascrizione a mano con Write, un blocco alla volta.
- Dopo **ogni** blocco: confronto riga per riga (testo della domanda, classi, testo delle risposte, quattro celle con il flag di conferma) con la fonte. Tutti e sette identici al primo confronto.
- Alla fine: confronto complessivo delle 277 domande (identico), ordine R contiguo 0…276, sette file JSON validi, indice coerente con i totali per file.
- Totali: 277 domande, 831 risposte, 3324 celle; per umore GOOD/OK/BAD/vuote/multi: Cupa 239/139/97/355/1, Irritabile 243/114/104/369/1, Timida 212/86/53/480/0, Giocosa 253/115/59/402/2; 304 non confermate (1414 documentate confermate, 1606 vuote). Tutto come nel contratto.
- Limite: il confronto è con `royal.md`, non con l'xlsx; i colori ARGB originali non sono nella pagina e restano quelli del censimento del 21/10.

## 4. Abbinamenti e differenze: riscontro con le misure storiche

Ho abbinato le 230 domande dell'app alle 277 Royal sul senso (domanda e risposte), senza usare i numeri storici per costruire l'abbinamento. Poi li ho confrontati:

| Misura | Mia ricostruzione | Storica |
|---|---|---|
| Domande app abbinate | 229 | 229 |
| Domande Royal distinte abbinate | 219 | 219 |
| Domande Royal senza abbinamento | 58, **identiche** all'elenco di G-021 (49 nuove + 9 varianti) | 58 |
| Risposte dell'app senza corrispondente (domande abbinate) | 49 | 49 |
| Certezza | 219 alta (A156 compresa), 10 media, 1 bassa (A87) | 219 / 10 / 1 |
| Attestazioni: totale, uguali, diverse | 642, 444, 109 | 642, 444, 109 |
| Con Royal vuoto / su risposta non abbinata / su domanda non abbinata | 55 / 33 / 1 | 55 / 33 / 1 |
| Per umore (Cupa, Irritabile, Timida, Giocosa) | identica alla tabella del contratto in tutte le sei colonne | |
| Celle con esiti contraddittori | 24 (22 con Royal singolo, A16 r3 Giocosa e A81 r2 Timida senza Royal) | 24 |
| Celle Royal vuote con esito app | 53 celle, 55 atomiche | 53 / 55 |
| Celle app senza esito coincidente con Royal | 87 (86 di G-021 più A19) | 87 |

Gruppi di domande app sulla stessa Royal, ricostruiti e uguali a quelli storici: R181 (A23, A223), R15 (A32, A194), R70 (A44, A206), R146 (A87, A150), R184 (A88, A168), R104 (A124, A133, A192), R156 (A125, A126), R240 (A128, A208), R54 (A160, A162).

Durante la ricostruzione due scelte iniziali mie non tornavano con il riscontro storico e le ho corrette: A34 risposta 3 («Il mio papà non è onnipotente») non corrisponde a «There's someone I want to save» (senza corrispondente); A146 risposta 2 la riabbino a «Just bad luck» come nel riscontro storico, anche se per me il senso è diverso (vedi §6).

## 5. Rettifiche segnate

- **A19** «Non ho tempo./Chiedo scusa.», Cupa: l'app attesta passabile e buona, Royal cattiva. Mancava dal campo `errori` storico (86 righe): in `neg-diff.json` è fra le rettifiche e dentro le 87 celle.
- **A142** «Tanto non sono maturo.», Giocosa: contraddittoria nell'app (cattiva e buona); Royal cattiva non confermata. G-021 §3 la elenca fra le correzioni; per cella non è una differenza perché uno degli esiti coincide, ma resta da togliere l'esito 'buona'.
- **A101 e A218** sono domande composite (incorporano R196+R216 e R102+R103): abbinate a R216 e R102, con certezza media e la nota che gli esiti non sono attribuibili a uno dei segmenti.
- **Le nove varianti** (R18, R41, R98, R163, R165, R195, R266, R196, R103) non sono scartate: sono righe Royal a sé, già nella trascrizione.

## 6. Da sapere

1. **Due punti da rivedere**: A146 risposta 2 e A34 risposta 3 (§4). Sono dichiarati nelle note di `neg-mappa.json`.
2. **Il file esteso** `server/db/dati/negoziazione-royal.json` (forma del contratto, con coordinate Excel e colori) non è stato creato: lo compone B5 da questi file e dal workbook. La trascrizione compatta contiene già tutte le informazioni di testo, esiti e conferma.
3. **Primo uso di B5**: i 1121 figli di R8-07b hanno ora dati di partenza completi. Le soglie storiche (49/86/979/52/24) vanno rimisurate sull'inventario per cella, non assunte.
4. **Licenza**: il repository della fonte è senza licenza; la copia è decisione dell'utente del 23/10, attribuita in NOTICE. Se l'autore concedesse un permesso o una licenza, si aggiorna la nota in NOTICE e in `fonti-negoziazione.json`.
5. **Il file dell'app `negoziazione-domande.json`** ha la stessa condizione di licenza e non è stato toccato.

## 7. Limiti

- Gli abbinamenti sono giudizi semantici miei, riscontrati con i totali storici; una risposta in più o in meno può cambiare di un'unità i conteggi, come è successo due volte.
- Non ho riletto il workbook xlsx né aperto il documento Google.
- Gli strumenti di controllo (confronto con la fonte, riconciliazione) erano script in sola lettura nella cartella temporanea: non scrivono nulla e non sono nel repository.
