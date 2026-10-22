# L5 — difetti accertati nell'audit del 21 ottobre 2026

## 23ottobre — L5-SUCCHI e nome corrente degli effetti: PASS

Pin1486/1487 e relative schede distinti osservati su138; offertaAojiru e acquisti non trasferiti. Eliminata l'etichetta fissa nell'editor: titolo corrente dalDTO articolo e negozio dallaFK reale, componente condiviso con gli abbinamenti.993108c0/pipeline39866562354 riuscita; typecheck37171/lint9705/build86807 verdi; Galaxy verifica indipendentemente codice/CI/etichetta pubblicata. Nessuna modifica della voce o spunta. Il raccordo commerciale non viene deciso da questo riscontro; L5 resta aperto.

## 21/10 20:24Z —1636 rimosso, esito reale acquisito

137 pubblicata in389387be, pipeline82 riuscita. Prima della rimozione, confronto46tabelle utente e95main identico; Cestino e sequenza preservati. Singolo DELETE204 con UID/CAS freschi e nessuna dipendenza. Dopo: solo spillo/cestino diversi, riga originale integrale conservata in una radice pin, altri dati confrontati identici. Coordinatore e Galaxy: Pin Lavoro part-time con Rimetti/schema137; Galaxy osserva anche l’assenza sulla Banchina e tre pin rimanenti. Gate finale distinto PASS, nessun errore/warn nelle nuove schede. Nessun restore o test. Dettagli in rimozione-pin-1636.md.

Rettifica dell’istruttoria19: Jose386 ha tipo negozio improprio ma riferimentoNULL e nessuna sede, confermati da lettura corrente. Non trattarlo come falso raccordo commerciale attivo e non inventare uno scollegamento.

## 21/10 19:55Z — tre schede applicate e approvate nel perimetro

Consenso esplicito alle tre schede collegate ricevuto; API ordinaria pubblicata,
anteprima e CAS freschi individuali, tre201. Confronti della Regia positivi e
osservazione autonoma Galaxy su tutte le schede/Area/visore: gate finale positivo.
Dettagli in crea-luogo-da-pin.md. Nessun nuovo pin o trasferimento commerciale.
La rimozione1636 resta separata, autorizzata e in implementazione recuperabile137.

## 21/10 19:44Z — pin1636 e tre punti già presenti

L’utente ordina di rimuovere il pin personale1636. Il DELETE ordinario attuale
non lo porta nel Cestino: prima dell’applicazione si prepara il tipo pin con
radice UID originale, fotografia/CAS fresca e ripristino protetto. Nessuna
rimozione ancora eseguita. Lettura mirata readonly del coordinamento: nessuna
dipendenza, immagine o stato collegato al bersaglio rilevato; dati RAW solo RAM.

L’utente precisa che Lotteria/Chiosco/Cinema esistono già: confermati i pin
1466/1486/1526 con identità native e collocazioni esatte. Manca il raccordo al
catalogo luoghi; non si creano pin nuovi. Richiesto consenso alle sole tre
schede collegate in adempimento dell’elenco approvabile originale. Non è una
nuova approvazione a creare duplicati o a trasferire offerte/acquisti.

## 21/10 17:11Z — nuova anteprima da pin, identità della mappa

Sul rilascio `dab604ae`, pipeline77 riuscita, il revisore ha osservato nel browser il gesto fino a «Rivedi», senza creare o salvare dati. L’API risponde200, ma la finestra rifiuta la mappa: il DTO nuovo espone la chiave interna, mentre `MappaDto`, `SpilloDto` e `RisolviMappa` usano il percorso pubblico. Il confronto fra i due domini produce un falso conflitto.

**Correttivo statico approvato, riscontro reale ancora aperto:** `chiaveMappa(raw, db)` nei soli DTO di anteprima e ricevuta. Fotografia, hash, FK e UPDATE mantengono le identità RAW. Tre riesami propri e gate distinto mirato approvati; typecheck47872/lint94003/build10780 exit0. Restano rilascio e anteprima reale prima del gate del gesto e del consenso ai tre luoghi. Nessuna creazione o modifica dei pin è stata applicata.

**17:25Z — difetto dell’anteprima CHIUSO:** correttivo `817c06bb`, pipeline78 riuscita, DTO pubblici attivi e coerenti con i GET delle tre mappe. Il revisore ha ripetuto autonomamente Rivedi1466 e osservato l’anteprima completa senza falso conflitto, poi Annulla. Gate del flusso fino all’anteprima approvato. Nessuna creazione applicata; consenso3 e controllo finale dei dati sono passaggi distinti ancora aperti.

**Aggiornamento del coordinatore, 21/10 07:43Z:** bonifica pubblicata in `e0ea995e`, pipeline #66 riuscita, p5s schema122/26 osservato. Controlli finali typecheck/lint/build verdi e gate statico distinto approvato. Confronto delle proiezioni GET protette identico prima/dopo, nei limiti descritti in STATO-ATTUALE. Restano inventari correnti e proposte puntuali da completare, oltre alle conferme funzionali/layout dell'utente. Le note di implementazione locale e migrazione122 non eseguita sotto sono checkpoint precedenti al rilascio, non lo stato corrente.

## Bonifica locale successiva all'audit

Mandato successivo dell'utente: correggere e completare L5–L7 prima del rilascio unico. Soluzione sottoposta al revisore distinto `audit_documenti_originali` e approvata prima delle modifiche, con protezione delle condizioni dell'utente e distinzione fra sblocco intrinseco e presenza fisica. **Codice locale implementato e riesame statico A56-01…08 approvato dal revisore distinto dopo le correzioni richieste. Controlli finali integrati e rilascio ancora da completare.**

| Rilievo | Correzione locale | Stato della consegna |
|---|---|---|
| A56-01 | `sbloccoLuoghi` compone quartiere AND sblocco proprio/inviti; quartiere dalla FK reale, anche per gli inviti. Il riferimento intrinseco `luogo` conserva il ruolo usato dai quartieri, evitando cicli quartiere→ritrovo→quartiere. | Riesame statico approvato; dati correnti non certificati. |
| A56-02 | `mappe/disponibilitaPin.ts` compone condizioni, presenza e Palazzo concluso per visore e Area. Il DTO dell'elemento espone la disponibilità separata dalla presenza del luogo; la UI usa lo stesso esito e spiega il motivo, con opacità piena. | Riesame statico approvato; interazioni/layout non osservati. |
| A56-03 | Rotte `/confidenti/…` corrette in InvitiConfidente, CondizioniEditor e nel terzo consumatore ConfidentiPartita individuato durante la bonifica. | Riesame statico approvato; navigazione non eseguita. |
| A56-05 | Nuovo `negozio.sblocco_json`, editor e validazione, lettura nel negozio/articoli/pin/sedi condivise; importazione e snapshot conservativi. Il vecchio `condizioni_json` trasferito agli articoli dalla 070 resta storico. | Migrazione 122 predisposta, non eseguita; registrazione coordinata dopo la 121. |

Tre riesami propri: (1) semantica delle dipendenze e cicli, compresa la FK degli inviti; (2) scritture, importazione, snapshot e cestino, senza accesso in scrittura ai DB; (3) callsite condivisi, DTO e UI, inclusi motivi dei pin e ingresso dei Palazzi conclusi. `npm run typecheck` terminato con exit 0 durante l'integrazione; lint mirato dei file della bonifica senza errori o avvisi. I controlli conclusivi sull'intera consegna restano al coordinatore. Nessun test scritto o eseguito, nessuna migrazione o prova funzionale.

Rilievo della lettura distinta sulla prima implementazione: il visore nasconde anche l'esito `ignoto`, mentre la prima correzione dell'Area considerava solo `bloccato`. Recepito e riesaminato favorevolmente: stesso confronto `stato !== disponibile`, motivi grigi inclusi e dicitura «Disponibilità da verificare», senza dichiarare falsa una condizione indeterminata.

Gli inventari incompleti della matrice originale, la conservazione dei dati e le misure dei dispositivi restano aperti: le correzioni del codice non costituiscono prova di quei requisiti. La sezione seguente conserva l'esito del codice pubblicato precedente.

## Esito del codice pubblicato precedente

Codice pubblicato `c025154a`, specifiche originali `43ad8889`. Rapporto Lorentz fornito dall'utente e seconda lettura distinta concordi: L5 non è integralmente conforme. Nessuna correzione applicata durante l'audit.

| Rilievo | Stato |
|---|---|
| A56-01 — presenza del luogo senza sblocco del quartiere | Aperto; coinvolge anche la sede del negozio. |
| A56-02 — «Luoghi qui» non applica le condizioni del pin come il visore | Aperto. |
| A56-03 — link al Confidente su rotta inesistente | Aperto nei due componenti indicati nel rapporto. |
| A56-05 — sblocco proprio del negozio assente | Aperto; requisito esplicitato da L6, rilevante per l'eredità dalla sede di L5. |

Fonti, controesempi, copertura e limiti: [rapporto di audit](../../audit-conformita-2026-10-21.md). Eliminazione/ripristino dei legami ha copertura statica del percorso base: non confermata l'ipotesi di perdita necessaria. Dati correnti, conservazione completa, runtime e layout non certificati; nessun test eseguito.
