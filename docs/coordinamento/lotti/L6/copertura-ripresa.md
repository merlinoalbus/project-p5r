# L6 — copertura della ripresa dopo il rilascio

Riscontro del 2026-10-21 locale (2026-10-20 UTC), base pubblicata `63e12734` e correzione delle tre viste nella consegna corrente su `newreview`. Questo documento distingue lettura del codice, riscontro pubblico e prove funzionali: non certifica L6 completo. Typecheck/lint/build della correzione riusciti; pipeline e browser della nuova consegna da seguire dopo il push, senza un commit successivo di soli documenti per registrare il suo stesso hash.

## Evidenza del rilascio

- Locale e remoto allineati a `63e12734`, verificati dopo fetch; un commit/push di codice e coordinamento nella consegna corrente.
- [Pipeline #64](https://github.com/merlinoalbus/project-p5r/actions/runs/39510479328): conclusione `success`, SHA `63e127343695f0b51c5e9444de845402ed4a88c6`. Gate typecheck/lint/audit e immagini BE/FE riusciti. Nessun test eseguito.
- Browser p5s dopo il rilascio: scheda Asakusa con nuova disposizione compatta, fonte e motivo del blocco. Editor aperto solo per leggere, poi chiuso con Annulla: gruppo `almeno-una`, Ann rango 7 e Skytree. Nessun salvataggio.
- Lettura GET dell'elenco pubblico `/api/compendio/citta`: **23 quartieri esposti, 23 condizioni strutturate, 23 testi generati**; 20 frasi storiche non coincidono con il testo generato. Il servizio esclude esplicitamente Memento dai quartieri. Nessun contenuto personale o copia dei dati salvato in questo documento.

## Copertura dei requisiti: ciò che il codice dimostra e ciò che non dimostra

| Requisiti | Riscontro sul codice | Limite / lavoro aperto |
|---|---|---|
| R6-01, 01b, 02 | Vocabolario in `shared/condizioniSpillo.ts`, catalogo tipizzato in `shared/statiPartita.ts`, valutatore in `server/services/condizioni/valutatore.ts`; disponibilità e semafori lo chiamano. `manuale` è solo ingresso legacy → avviso, non tipo offerto. | La compilazione non prova l'equivalenza di ogni condizione sulla partita reale. Nessun test richiesto o eseguito. |
| R6-03, 04, 15 | Migrazione 118 converte gli abbinamenti sicuri dei requisiti; valutatore usa chiave Richiesta e ID Persona/abilità. `nomiCondizioni` genera i nomi correnti. Richiesta assente → grigio esplicito. | Nessuna rinomina/eliminazione di prova sui dati; non certificata l'assenza universale di riferimenti legacy in dati non letti. |
| R6-05, 06 | DTO preserva il testo dell'avviso; gruppi e NON propagano `bloccante: false`; aggregazioni ignorano gli avvisi nel decidere il blocco. | Interazioni e salvataggi da provare dall'utente. |
| R6-07, 30 | `CondizioniEditor` condiviso, ricerca per nome/chiave, anteprima server; `EditorRequisiti` per rango con ripristino e bozze. | Non effettuati salvataggi/ripristini funzionali. |
| R6-08, 08b, 09, 10 | Condizione effettiva del quartiere in OR con gli inviti; città/metro consumano disponibilità server. Tutti i 23 quartieri esposti hanno condizione/testo. Asakusa OR confermato anche nel browser. Descrizioni delle tre viste corrette nella consegna corrente. | Riscontro browser della correzione da acquisire dopo il push. Calendario derivato assegnato già dal piano a L9, non un nuovo rinvio (sotto). |
| R6-08c, 08c2, 08c3, 08d, 08e, 08f | Inviti strutturati, registrazione/annullamento in `inviti.ts`, guardia server su esito disponibile; stesso componente in Confidente/quartiere/luogo. | Nessuna registrazione di prova. Integrazione delle voci del diario collegata a L10 nel piano: non dichiararla già verificata da questa consegna. |
| R6-11 | `LibroDto.apre` calcolato dalle condizioni e letto da `LibriPage`. | Completamento lettura e apertura effettiva da provare dall'utente. |
| R6-12, 13, 19 | Migrazione 118 con sede Clinica 16/4 e Confidente 18/4; condizioni certe dei luoghi. Elenco storico pubblico delle frasi preparato, prosa non interpretata automaticamente. | Inventario schema 93 non equivale a confronto coi dati correnti; proposte non approvate né applicate. `modifiche.md` §4.2 prescrive di conservare le frasi come note finché manca il sì. |
| R6-14 | Semafori e scheda Confidente leggono i requisiti del rango 1; testo generato coi nomi correnti. | `modifiche.md` §4.3 assegna esplicitamente a L9 il calendario derivato; non dichiararlo già implementato in L6. |
| R6-16, 16b, 17 | Finestre nelle colonne lette da `finestreDungeon`; valutatore `copreIlGiorno`; `destinazionePalazzo`/`atterraggioDelPalazzo` condivisi da metro, giornata e azioni. Stato concluso separato dal 100%. | Nessuna prova funzionale metro/diario o sulle date. L9 §3.2 / B5 usa queste fonti per il calendario, come già pianificato. |
| R6-18, 20, 21 | Valutazione non ricava condizioni dalla prosa; migrazione con guardie sui valori precedenti, senza riscrittura generale dei pin utente. | Nessun confronto esiti prima/dopo su DB dell'utente: equivalenza e preservazione non certificate da questa lettura statica. |
| R6-22 | Recupero legacy DB dentro importazione esplicita protetta, dopo migrazioni; riepilogo DB/JSON; snapshot guida/catalogo inclusi. | Nessuna importazione, esportazione o sostituzione DB eseguita per prova. |
| R6-23, 24, 25, 26, 27 | Nessuna nuova migrazione nel commit corrente; nessuna scrittura di questa sessione su diario, Palazzi, Memento o conferme. | Non equivale a provare tutti gli esiti runtime: conferma funzionale riservata all'utente. |
| R6-28 | Typecheck/lint/build locali riusciti prima del commit; gate CI dello stesso SHA riuscito. | Prescrizioni storiche sui test superate dall'ordine zero test. |
| R6-29, 31 | Testi generati nelle tre viste nella consegna corrente; intestazioni compattate e Modal condiviso. | Riscontro browser della nuova consegna da acquisire. Nessuna misura dei sei formati certificata; prove dell'utente. |

## Difetto residuo delle descrizioni dei quartieri

Non è un errore dell'OR né un dato da riscrivere. Il server espone già `sbloccoCondizione.testo`, ma nel codice pubblicato `63e12734`:

- `QuartierePage.tsx` mostra ancora `q.sblocco`;
- `CittaPage.tsx` mostra ancora `x.sblocco` e una data legacy nel chip;
- `MappaTokyo.tsx` preferisce `sbloccoData` al motivo/testo della condizione.

Correzione locale eseguita: le tre viste consumano testo generato/motivo già presenti nel DTO, senza leggere prosa/data legacy per descrivere lo sblocco. Nelle carte la descrizione non è più tagliata a due righe. Preservati condizioni, note, API, disponibilità e navigazione; nessun caso speciale per Asakusa o nuovo valutatore.

Tre passaggi di controllo: (1) diff e assenza di lettori `q.sblocco` / `x.sblocco` / `sbloccoData` nelle tre viste; (2) nessuna modifica a server/shared, dati, pin, API e flussi di posizionamento; (3) typecheck, lint e build tutti exit 0 dopo la correzione (23:20Z del 20/10). Nessun test o prova runtime locale. Non ancora pubblicata.

Chiarimento sul processo: l'utente chiede se è già nel piano. **Sì: R6-08b e §4.1 delle modifiche prescrivono già questo testo.** L'assistente aveva impropriamente chiesto un'altra approvazione e introdotto un blocco: non è una nuova scelta dell'utente. Non interpretare il chiarimento come autorizzazione a nuove funzioni o modifiche dei dati. Correzione e coordinamento restano da consegnare insieme a fine lotto, senza pipeline intermedie di soli documenti.

## Confine del calendario già deciso dal piano

La lettura del servizio aveva segnalato che il calendario non deriva ancora gli eventi. Il piano di modifiche L6 **§4.3** dice però esplicitamente che scheda/semafori si correggono in L6 e che il calendario perde le divergenze in **L9**. `lotti/L9/modifiche.md` §3.2 e `piano.md` B5 assegnano lì gli sblocchi/scadenze ricavati da requisiti, condizioni e finestre. Non è una nuova riduzione del perimetro né una decisione richiesta all'utente: non usare la mancata implementazione anticipata di L9 come blocco di L6. Il requisito complessivo del progetto resta aperto finché L9 non lo realizza.
