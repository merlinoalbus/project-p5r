---
name: feedback-modifiche-dirette
description: "L'utente vuole modifiche fatte direttamente sui file del repository (Edit/Write), non patch né script Python che riscrivono i file"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 63bec0e8-695c-4df0-bfcd-ebd80ca4af36
  modified: 2026-10-04T03:25:13.670Z
---

Modificare il codice direttamente con gli strumenti di edit sui file del worktree; niente file di patch da applicare, niente script Python (o heredoc bash) che riscrivono sorgenti o dati. Uno script è accettabile solo per analisi/lettura (conteggi, validazione JSON).

**Why:** l'utente ha chiesto due volte nella sessione del 2026-09-05 «perché la patch? non hai accesso al codice?» e «perché con script python le modifiche?»: vuole vedere modifiche leggibili e ripercorribili, non trasformazioni indirette.

**How to apply:** per riscritture ampie usare Write dopo una Read; per ritocchi puntuali Edit o `sed` su righe precise; per i JSON del seed intervenire sulla riga (indentazione a 5 spazi in `data/seed/mappe/*.json`). Vedi anche [[project-flusso-di-lavoro-p5r]].

Vale anche per i **documenti** (`docs/*.md`), non solo per il codice: il 2026-10-04 una modifica di `docs/ARCHITETTURA.md` fatta con uno script tsx di sostituzioni (readFileSync/replace/writeFileSync) è stata rifatta a mano su richiesta dell'utente («Rifai a mano»), anche se il contenuto era corretto. Uno script che scrive file si dichiara subito all'utente e al validatore.
