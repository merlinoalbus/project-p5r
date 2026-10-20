---
name: feedback-validare-alla-fine
description: "L'utente vuole più velocità: il galaxy-task-validator si chiama una volta sola, a lavoro finito, non dopo ogni voce"
metadata:
  node_type: memory
  type: feedback
  originSessionId: e607dac6-f330-471d-b336-bd3dc2c5c00f
  modified: 2026-10-17T23:12:10.732Z
---

Dal 2026-10-18 l'utente: «ho anche chiesto di essere più veloce e validare solo alla fine le cose». Il validatore (galaxy-task-validator,
agent ab2acc747348439da nella sessione di allora) si chiama **una volta, alla fine della richiesta**, sul lavoro intero; non dopo ogni
voce del piano. Restano typecheck/lint/test, verifica nel browser ai tre formati e documenti; commit e push quando l'utente lo chiede o a
lavoro finito, con la pipeline seguita fino all'esito.

**Why:** il ciclo voce→validatore→correzione rallentava troppo l'utente (che ha anche detto «committalo e pushalo» senza aspettare l'esame).

**How to apply:** pianificare le voci, farle di fila con le verifiche proprie, poi un solo giro di validazione; i rilievi del validatore si
correggono subito dopo. Questa preferenza prevale sulla regola «validare ogni voce» del CLAUDE.md. Vedi [[project-flusso-di-lavoro-p5r]] e
[[feedback-non-interrompere]].
