# Coordinamento del team p5s (copia nel repository)

Copia del lavoro di coordinamento del ramo `newreview`, salvata su git per richiesta dell'utente (2026-10-20): «tutto quello che è il
lavoro deve essere salvato su git... per evitare in caso di termine dei crediti di bloccare il lavoro». L'originale vive in
`~/.claude/p5s-coordinamento/`; questa copia va riallineata a ogni passaggio importante.

Cosa c'è:
- `stato.json` e `regia/`: la Regia, cioè l'avanzamento dei lotti e delle sessioni. Il server `regia/server.cjs` la serve su localhost:5999.
- `bacheca.md`, `processo.md`, `decisioni-pm.md`, `rapporto-finale.md`: regole, compiti per sessione, decisioni, bozza del rapporto.
- `lotti/Lx/`: requisiti, dati, app, modifiche, piani, casi di prova, difetti, esiti e verdetti del validatore di ogni lotto.
- `guida/registro.md`: le risposte dell'Esperto della guida (G-001…).
- `collaudo/`: procedure dei dati e strumenti del Collaudo.
- `memoria-del-progetto/`: la memoria persistente del PM (regole dell'utente, decisioni, riferimenti).

Cosa NON c'è, perché il repository è pubblico:
- le copie dei database dell'utente (`dati-produzione/`, `dati-p5s/`): contengono la sua partita;
- le schermate e i log, per peso (circa 250 MB) e perché possono mostrare dati della partita;
- l'indirizzo del server di produzione e il percorso della chiave, omessi nelle copie.
