# L3 — integrazione «Guida nel visore» e «Planimetria della voce» (decisa dall'utente il 2026-10-20)

**Correzione del PM (2026-10-20, 19:35Z).** La regola sulle voci per planimetria (RG-3 e RG-5) era una richiesta dell'utente su come si vede la guida, ovunque. L'utente non ha mai chiesto di applicarla solo al visore né di rinviarla. Questa scelta l'ha fatta il PM da solo, interpretando male «non toccare la scheda del Palazzo» e «non deve accantonare lo stato attuale». Per questo L3 è stato dichiarato completo senza la regola. Ora la regola è un difetto di L3 (UX3-14) e FE la realizza sulla scheda e sul visore insieme.

È un'**integrazione** di L3, non un lotto nuovo. Il lavoro già fatto non si accantona. La chiusura dei punti aperti di L3 va avanti per prima, come da piano.

## Requisiti (parole dell'utente → regola)
- **RG-1, guida da usare nel visore.** «nel visore devono esserci solo le funzioni di utilizzo e non quelle di modifica... quindi solo dei checkpoint per segnare come fatto il punto della guida... (che attiva l'equivalente di Raccolto/Riapri) e tutti i dettagli informativi dentro la voce... riferimenti ai pin della mappa (il click su un pin deve evidenziare il punto)».
  - Pulsante «Guida» nella barra del visore, nella scheda del Palazzo e a schermo intero: le funzioni non dipendono dallo schermo intero.
  - Finestra fluttuante che si apre, si chiude e si trascina; sotto i 768 px diventa un pannello dal basso.
  - Ogni voce ha una casella: spuntata vale «Ottenuto», tolta la spunta vale «Riapri». Usa gli stessi stati di pin e scheda.
  - Le voci descrittive non hanno la casella. I passi degli Enigmi hanno ciascuno la propria.
  - La voce mostra tutti i suoi dettagli e i riferimenti ai suoi pin. Il tocco su un riferimento seleziona e centra il pin; il tocco su un pin evidenzia la sua voce.
  - Niente modifica nel visore. La modalità modifica (editor) non cambia.
- **RG-2, la scheda del Palazzo non si tocca** («non voglio che tocchi la scheda del palazzo che funziona bene»). La colonna della guida di modifica (`GuidaDellArea`) resta com'è. Unica aggiunta: il campo «Planimetria» nella modifica della voce (RG-4). La guida da usare è un componente piccolo e nuovo, non una copia di quella di modifica. Riusa stati, azioni e caricamento che esistono già.
- **RG-3, voci senza pin.** «visibili solo nella planimetria dove sono stati inseriti»; «lasciali agganciati alla planimetria 1». Planimetria effettiva di una voce, con una regola sola calcolata alla lettura:
  1. con pin: dove stanno i pin;
  2. senza pin, agganciata a mano: quella;
  3. altrimenti: la planimetria 1 dell'infiltrazione. È la planimetria iniziale della prima area toccata; se l'infiltrazione non tocca aree, la predefinita della prima area del Palazzo.
  - I Memento sono esclusi; Iweleth è compreso.
  - Sulla copia di p5s 0533Z la regola dà 450 voci collocate e nessuna senza planimetria.
- **RG-4, spostamento a mano** («dammi la possibilità di spostarli a mano in altre planimetrie durante la mia review»).
  - Campo «Planimetria» nella modifica della voce: prima le planimetrie del Palazzo toccate dall'infiltrazione, poi le altre.
  - Con «nessuna» la voce torna alla planimetria 1.
  - Nel visore della planimetria X compaiono le voci con pin su X e le voci senza pin la cui planimetria effettiva è X. Un Enigma compare su X se c'è almeno uno dei suoi passi.

- **RG-5, la guida della scheda per planimetria (UX3-14).** Segnalazione dell'utente su p5s, 2026-10-20: in Madarame, infiltrazione 4, «Sala del Tesoro – Atrio», Livello 0, la guida mostra tutte le 123 voci dell'infiltrazione, comprese voci di aree lontane come «Entra nella Stanza di Velluto». La regola dell'utente, che vale anche per la scheda del Palazzo e non solo per il visore:
  > «NIENTE PIN: Vale la planimetria dove è stata inserita la voce. Con almeno un PIN la voce si vede nella planimetria di tutti i PIN che sono contenuti nella planimetria... (ovviamente se viene chiuso sparisce da tutti i punti)»
  - La guida della scheda mostra le voci della **planimetria mostrata nel visore**:
    - le voci con almeno un pin su quella planimetria, che quindi compaiono in ogni planimetria dei loro pin;
    - le voci senza pin la cui planimetria effettiva (RG-3) è quella.
  - Una voce segnata sparisce da tutte le planimetrie, salvo «Anche le segnate».
  - La regola è la stessa del visore, e la lettura è la stessa: `GET /api/mappe/:chiave/guida` di 42b34243.
  - La configurazione delle voci resta come oggi: modifica, Enigmi, collega pin, copia e sposta, aggiungi. Una voce aggiunta prende la planimetria mostrata.
  - Le voci delle altre planimetrie dell'infiltrazione restano raggiungibili sotto una sezione chiusa («Nelle altre planimetrie»), raggruppate per planimetria, così la gestione completa resta possibile.
  - Questa correzione **tocca la colonna della guida della scheda**, ed è chiesta dall'utente.
- **Nota.** Le «Schede da sistemare» (AP3-1) sono contenuti della guida senza pin né voce. Correggere il testo di una voce non le chiude. Si chiudono con «Collega a una voce» o «Crea la voce» (§4.3 di L4, nel rilascio di L4).

## Come entra nel piano
| Passo | Chi | Base | Stato |
|---|---|---|---|
| A1. Chiusura dei punti aperti di L3 | FE, BE | fino a c8338fd0 | **fatto**: tutti i punti corretti, da verificare |
| A2. Collaudo di L3 su una linea di rilascio ferma a c8338fd0 + documenti (`newreview-l3`) | Collaudo | c8338fd0 | da fare, subito dopo B1 (una sessione alla volta) |
| A3. Test funzionali, UX, layout, no-reg (640 indirizzi di NR3-4) | 4 tester, uno alla volta | linea di rilascio | da fare |
| A4. Riga della ROADMAP e validatore | Collaudo, PM | linea di rilascio | da fare |
| A5. Push della sola linea di rilascio su `newreview` (avanzamento rapido), pipeline, verifica di p5s | PM | — | da fare |
| B1. BE di RG-3 e RG-4: migrazione 114 (solo colonna), regola unica, PUT, `GET /api/mappe/:chiave/guida` | BE | sopra c8338fd0 | **fatto** in 42b34243: copia 0533Z 450/450 voci senza pin collocate, impronta delle 116 tabelle identica (colonna nuova esclusa); da verificare. Decisione del PM: un Enigma con passi non si aggancia a mano (400 `enigma-segue-i-passi`), sta dove stanno i passi |
| B2. FE di RG-1, RG-4 e RG-5 (UX3-14, guida della scheda per planimetria) | FE | dopo B1 | da fare, quando i tester di A3 hanno finito, mentre il validatore (A4, agent) lavora: sempre una sessione alla volta |
| B3. Prove e validatore dell'integrazione, poi push | tester, validatore | dopo A5 | da fare |
| Poi | L4 (FE da completare), L5–L11 | | invariato |

La linea di rilascio di A2 tiene fuori i commit di B. Così il collaudo e la validazione di L3 non aspettano l'integrazione, e su p5s non arriva niente di non validato.
