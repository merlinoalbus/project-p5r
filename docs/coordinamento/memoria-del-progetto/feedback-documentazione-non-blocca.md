---
name: feedback-documentazione-non-blocca
description: "Se l'applicazione è testata e corretta, il rilascio non si ferma per carenze di documentazione segnalate dal validatore; la documentazione si allinea al codice in parallelo"
metadata:
  node_type: memory
  type: feedback
  originSessionId: cffd8da6-5996-4013-b5ec-2c69430948db
  modified: 2026-10-20T17:21:08.315Z
---

Dopo il rigetto di L3 al giro 1 (2026-10-20), che chiedeva soprattutto prove grezze e documenti, l'utente ha detto: «no fai la documentazione coerente al codice e procedi» e «non mi interessa che sia bloccato per la documentazione... se è tutto testato e corretto a livello di applicazione devi procedere».

**Why:** per l'utente conta che l'app funzioni ed è stata provata. Fermare un lotto pronto per righe di documento rallenta il progetto senza beneficio per chi gioca.

**How to apply:**
- Le richieste del validatore si dividono in due gruppi.
  - **Applicazione**: test, prove dal vivo sul codice finale, difetti, regole dell'utente. Queste bloccano il rilascio finché non sono verdi.
  - **Documentazione**: righe, hash, sezioni di DECISIONI e ARCHITETTURA, stato. Si sistemano in parallelo, coerenti con il codice, e non fermano il rilascio.
- Con l'applicazione testata e corretta si pubblica e si va avanti col lotto successivo.
- La deroga alla regola «senza APPROVATO non si passa oltre» viene dall'utente, che ha autorità pari al validatore. Va dichiarata nella ROADMAP del lotto.

Vedi [[feedback-validare-alla-fine]] e [[feedback-non-interrompere]].
