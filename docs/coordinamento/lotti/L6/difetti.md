# L6 — riscontri sul codice e richieste successive

## Bonifica locale successiva all'audit — da riesaminare e rilasciare

Il mandato successivo chiede la bonifica e il completamento di L5–L7 con rilascio unico. La soluzione ha ricevuto il gate distinto prima delle modifiche; dopo l'implementazione e le correzioni richieste, `audit_documenti_originali` ha **approvato il riesame statico A56-01…08**. Non è una certificazione del runtime o dei DB reali, né l'approvazione globale di L6/L7.

| Rilievo | Attuazione locale |
|---|---|
| A56-01/02/03 | Quartiere dalla FK anche negli inviti; composizione della presenza condivisa fra Area/visore; tre link Confidente corretti. Dettagli in [difetti L5](../L5/difetti.md). |
| A56-04 | `shared/dipendenzeCondizioni.ts`: influenza positiva della lettura con cofattori booleani, ROBDD e ricerca esatta di soddisfacibilità quando il budget di memoria del diagramma è raggiunto. Nessun risultato omesso per soglia. Avvisi rimossi come operandi anche sotto OR/NON; contraddizioni e negazioni non generano un falso «Apre». Cache riferita alla formula immutata. |
| A56-05 | `sblocco_json` aggiuntivo del negozio, distinto dalle condizioni storiche della 070; editor, schema, riferimenti, consumatori e snapshot/import aggiornati. |
| A56-06 | Nuovo tipo `finestra-palazzo` con vocabolario/editor/descrizione/valutatore e controllo dei riferimenti. Legge le colonne del Palazzo; `arco` mantiene la propria semantica. La 122 converte solo copie esatte su passaggi della guida con provenienza riconosciuta; pin utente/adottati e casi ambigui restano intatti. Visita mirata delle immagini di spillo nel cestino, senza riscritture generiche. Il generatore dei passaggi usa il riferimento unico. |
| A56-07 | `copreIlGiorno` percorre AND/OR/NON annidati; foglie non temporali indeterminate, avvisi non operandi. Solo il falso esclude un candidato. Date/intervalli e nuovo riferimento finestra condividono il significato usato dal valutatore. Destinazione unica metro/diario conservata. |
| A56-08 | Gli effetti visibili dei libri escludono `sblocca-luogo` tramite helper condiviso, senza cancellare dati. Anche i campi API storici `sbloccaLuogo` derivano ora da `apre`, non dall'effetto vecchio. Integrazione del lettore catalogo L7 coordinata separatamente. |

Migrazione `122_bonifica_luoghi_condizioni.ts` predisposta per essere applicata dopo M7=121; **non registrata né eseguita da questo esecutore**. Il resoconto delle conversioni/esclusioni è progettato nella voce `dati_guida.bonifica-finestre-122` del DB dell'istanza, con riferimenti alle righe e motivi: nessuna misura sui dati attuali è inventata, nessun contenuto personale viene commesso.

Tre riesami propri svolti: semantica/cicli/avvisi; provenienza e conservazione di condizioni/snapshot/import/cestino; consumatori, editor, DTO e presentazione. Typecheck integrato eseguito con exit 0 durante il lavoro e lint mirato senza avvisi; controlli finali globali, revisione avversariale dell'implementazione, pubblicazione e osservazione p5s restano da completare. Zero test, nessuna esecuzione di migrazioni, nessuna prova in scrittura.

R6-19 rimane da completare con inventario corrente e riconciliazione delle fonti; il vecchio elenco storico non diventa una prova per effetto della bonifica. I requisiti dati/runtime della matrice rimangono aperti. I confini originari di calendario L9 e gesti Diario L10 non sono una nuova riduzione del mandato L8–L11.

Prima lettura distinta dell'implementazione: recepiti il criterio `ignoto` per la visibilità dell'Area e la composizione delle condizioni proprie con gli inviti prima di calcolare i libri che aprono i posti. Non si confonde un invito registrato con le condizioni attuali che consentono di registrarlo.

Esito distinto successivo: verificati staticamente helper ROBDD→SAT e avvisi, vocabolario/editor/proiezione della finestra, migrazione 122 e immagini del cestino con guardie di provenienza, sblocco negozi e roundtrip di schema/modulo/lettori/import/ripristino. Nessun ulteriore blocco sui rilievi A56. Restano controlli globali e verifiche di rilascio del coordinatore; gli acquisti L7 e il filtro della presentazione generale del Catalogo sono sotto responsabilità dell'esecutore L7.

## Audit indipendente del 21 ottobre — esito sul codice pubblicato precedente

L6 pubblicato in `c025154a` **non è integralmente conforme**. Lorentz e seconda passata distinta confermano i rilievi; nessuna correzione applicata nell'audit.

| Rilievo | Stato |
|---|---|
| A56-01/02/03 — quartiere nella presenza, condizioni pin/elenco, link al Confidente | Aperti, condivisi con L5. |
| A56-04 — «Apre» include letture sotto NON | Bug semantico aperto. |
| A56-05 — sblocco proprio negozi non modificabile né valutato | Omissione aperta. |
| A56-06 — copie finestre lasciate nella migrazione 118 | Scostamento aperto; non autorizza conversione indiscriminata ad `arco` che cambi gli esiti. |
| A56-07 — selezione ingresso ignora date annidate | Limite funzionale aperto, controesempio statico. |
| A56-08 — effetto storico «Sblocca» ancora mostrato dai libri | Nuovo rilievo della seconda passata, aperto. |

Specifiche originali `43ad8889`, evidenze su codice pubblicato e limiti nel [rapporto di audit](../../audit-conformita-2026-10-21.md). Le note successive sono storia del precedente rilascio, non certificazione del codice corrente o della conservazione completa dei dati.

## Collegamenti frontend — riscontro aggiornato

La mancanza iniziale di F1–F5 è stata affrontata e pubblicata in `63e12734`: anteprima server e tipi nell'editor, inviti nelle tre viste, editor dei requisiti, lettura degli sblocchi e disponibilità del server in città/metro. Pipeline #64 riuscita e scheda Asakusa osservata dopo il rilascio. Non dichiarare L6 completo: restano descrizioni residue, copertura completa da dimostrare e prove funzionali dell'utente (`copertura-ripresa.md`). Le sezioni sulle modifiche locali sotto documentano il lavoro poi incluso nel rilascio.

## Descrizioni dei quartieri — residuo dopo il rilascio

Il server espone 23 quartieri con 23 condizioni strutturate e testi generati. In 20 casi il campo storico `sblocco` è diverso. Il codice pubblicato legge ancora prosa/data legacy nelle viste. Corretto localmente: Quartiere e Città usano `sbloccoCondizione.testo`, metro usa motivo/testo server; tolti data legacy dal chip e taglio della descrizione nelle carte. Typecheck/lint/build verdi, nessun server/shared/dato modificato, nessun nuovo rilascio. È un'omissione rispetto a R6-08b e modifiche §4.1 già nel piano, non una nuova scelta da approvare: ritirato il blocco impropriamente introdotto dall'assistente. Da includere con il coordinamento nella chiusura del lotto.

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
