# L5 — difetti accertati nell'audit del 21 ottobre 2026

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
