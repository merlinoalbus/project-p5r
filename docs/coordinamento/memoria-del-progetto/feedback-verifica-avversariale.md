# Verifica indipendente e avversariale delle consegne

Disposizione diretta dell'utente, 2026-10-21:

> Da questo momento le consegne devono essere verificate da un agent distinto (Lorentz o altro a tua scelta) che acceda alla specifica originale ed esegua le verifiche in modo avversariale.

Ogni consegna richiede un revisore distinto dall'esecutore. Il revisore legge direttamente le specifiche originali, la loro storia e le successive istruzioni dell'utente; non assume come prova le note di attuazione o il resoconto dell'esecutore. Cerca attivamente controesempi, omissioni e alterazioni ingiustificate e confronta requisito e implementazione citando file, righe e revisione. Distingue conformità, scostamenti dimostrati, difetti e aspetti non verificati. Un esito favorevole richiede una copertura dichiarata: una lettura parziale o typecheck/lint verdi non certificano tutta la consegna.

Il revisore opera in sola lettura e non modifica il codice. I rilievi vanno risolti e riesaminati; se contestati, si riportano all'utente con richiesta esatta ed evidenze, senza ignorarli né dichiarare verificata la consegna.

La disposizione vale anche per l'audit in corso su L5 e L6 pubblicati e L7 locale. Oggetto dell'audit sono le reinterpretazioni dell'esecutore rispetto alle richieste ricevute: le richieste del PM costituiscono la base del confronto, non una prova di arbitrarietà dell'esecutore.

Supera il precedente divieto di usare verificatori. Restano zero test, nessuna prova in scrittura sui dati dell'utente e nessun servizio gestito. L'audit non autorizza correzioni del prodotto o nuove decisioni di architettura.

La regola di pubblicazione a fine lotto deriva dalla precedente decisione del 20 ottobre, non dalla frase sulla verifica avversariale. Il prompt diretto della ripresa del 21 ottobre richiede invece commit/push alla fermata: per la consegna dell'audit si salvano solo documenti dopo revisione distinta, senza includere il codice L7 incompleto. Non confondere salvataggio del rapporto, pubblicazione del prodotto e salvataggio remoto della bozza esclusa.
