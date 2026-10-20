# L6 — riscontri sul codice e richieste successive

## Collegamenti frontend — riscontro aggiornato

La mancanza iniziale di F1–F5 è stata affrontata localmente: anteprima server e tipi nell'editor, inviti nelle tre viste, editor dei requisiti, lettura degli sblocchi e disponibilità del server in città/metro. Le modifiche non sono pubblicate né provate nel runtime. Non dichiarare L6 completo sulla sola base dei DTO, delle descrizioni OpenAPI o dei controlli statici.

## Blocco «Da posizionare» nel pannello dell'Area

L'utente ha mostrato il caso Piazza della Stazione: pulsante spezzato e rifiuto `riferimento-non-ammesso`, perché la creazione tentava di collegare una «Nota» informativa a un luogo. Il catalogo `spilloPerLuogo` associa «Punto di interesse» e «Altro» a «Nota».

Decisione finale dell'utente: rimuovere la singola funzione inutilizzabile dal pannello, preservando gli altri processi. Tolto localmente soltanto il blocco «Da posizionare» in `AreaPage.tsx`; conservati «Aggiungi luogo», la finestra condivisa, gli altri accessi, le API e i dati. Il tipo di pin «Luogo», tentato in precedenza, è stato ritirato interamente: nessun nuovo tipo o modifica dei vincoli di categoria.

## Schermate di riferimento dell'editor

Richiesta separata dell'utente: rimuovere «Schermate di riferimento» e «Aggiungi schermata». Tolti localmente riquadro e controlli/callback collegati in `EditorMappaPage.tsx`. Immagini già salvate e loro lettura nel visore conservate; nessuna cancellazione di dati.

Le due rimozioni sono ancora locali: unico commit e push insieme al lavoro di fine L6, per decisione dell'utente. Nessun test scritto o eseguito; controlli ammessi typecheck, lint e build.

Controlli aggiornati alle 22:29Z del 20/10 (21/10 locale): `npm run typecheck`, `npm run lint` senza avvisi e `npm run build` riusciti; `git diff --check` senza errori. Il parametro inutilizzato è risolto. Il diff di catalogo dei pin, icone e finestre di aggiunta/collocazione resta vuoto rispetto a HEAD; anche il DB pubblico di riferimento non è cambiato. La pagina Luogo contiene gli inviti di L6, non modifiche a «Posiziona» o «Colloca». Nessun test scritto/eseguito, nessuna prova runtime locale, nessuna scrittura sui dati dell'utente, nessun servizio avviato, fermato o riavviato. L6 non chiuso.

Revisione indipendente delle due rimozioni: approvata esclusivamente la corrispondenza statica al perimetro. Confermati «Aggiungi luogo», «Posiziona / Colloca» nella pagina Luogo e caricamento immagine della planimetria. Non certificati runtime, pubblicazione o integrità dei dati persistiti; nessuna dichiarazione di chiusura L6.

## Correzioni locali L6, distinte dalle rimozioni

- Avvisi: il DTO preserva il testo del contenuto con `condizioneConTesto`; `condizioniSenzaTesto` non lo elimina; l'editor conserva gli spazi durante la digitazione. Nessun prefisso aggiunto ripetutamente al salvataggio. Il server propaga `bloccante: false` nei gruppi e nei NON; il chip mostra l'avviso anche se disponibile.
- Requisiti: bozze per rango conservate al cambio di riga, chiusura protetta da salvataggio in corso e conferma prima di perdere modifiche; note originali mantenute. La finestra segue il parametro URL e la chiave del Confidente: navigare a un altro Confidente non mantiene aperto l'editor precedente. Semafori descritti dalle condizioni con i nomi correnti.
- Inviti: un esito ignoto non abilita il gesto; la spiegazione del dato mancante viene dal server. Il gesto rilegge lo stato della partita e le viste.
- Importa: etichette e CLAUDE.md allineati al backup locale. Recupero dei legacy `manuale` solo nell'import esplicito, dopo le migrazioni storiche; nessun recupero eseguito all'avvio o sui dati attuali. Include snapshot catalogo/guida, transazione e ripristino esistente in caso di errore. Riepilogo senza contenuti delle note.
- `elenco-frasi-condizioni.md`: inventario pubblico schema 93, 201 righe / 147 frasi. Non è prova dei dati correnti di p5s; nessuna conversione applicata o approvata.
- JSON delle mappe: riepilogo dei vecchi `manuale` letti come avvisi nei soli pin e copie importati. Tracce dei pin raccolte dopo la verifica finale dei riferimenti; copie escluse dal disegno o pezzi scartati non inclusi. Aggiunti campo opzionale del resoconto, lettura FE e descrizione OpenAPI; non cambiate le regole di sovrascrittura né la selezione delle condizioni.
- Intestazioni di Confidente e quartiere compatte, con condizioni/note/comandi nel corpo della pagina; stesse immagini e comandi, nessuna nuova area scorrevole. Nessuna misura runtime dichiarata.

## Prima di chiudere L6

1. **Asakusa risolto** (utente, 2026-10-21): prima OPPURE seconda condizione, Ann rango 7 oppure Skytree aperto dal libro. R6-10 allineato alla migrazione 118 già corretta, senza nuove migrazioni o modifiche dei dati.
2. Controlli conclusivi typecheck, lint senza avvisi e build riusciti anche dopo la correzione della navigazione dei requisiti; nessun test o scrittura di prova. Riepiloghi legacy DB e JSON implementati localmente, nessuna importazione eseguita.
3. Unico commit/push a fine lotto, pipeline fino all'esito e osservazione p5s. Prove funzionali dell'utente. Non usare questi punti per modificare i processi di posizionamento conservati.
