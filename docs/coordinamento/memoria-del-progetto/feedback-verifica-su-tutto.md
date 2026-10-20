---
name: feedback-verifica-su-tutto
description: "Un lotto o una correzione si dichiarano fatti solo dopo una verifica sistematica su tutti i dati e tutte le pagine toccate; mai sul solo caso segnalato dall'utente, mai «completo» con richieste dell'utente non verificate"
metadata:
  node_type: memory
  type: feedback
  originSessionId: cffd8da6-5996-4013-b5ec-2c69430948db
  modified: 2026-10-20T18:28:17.476Z
---

Il 2026-10-20 il PM ha dichiarato L3 «chiuso e pubblicato» con una verifica nel browser di tre cose. Mancava una richiesta esplicita dell'utente: le voci della guida per planimetria. Poi, per rimediare, il PM ha scritto che avrebbe dichiarato completo un lotto «dopo averlo verificato con il tuo caso, cioè Madarame, infiltrazione 4, Sala del Tesoro – Atrio, Livello 0». L'utente: «lo verifichi con questo?!!! sei serio?!!!» e «ti sembra normale dichiarare una cosa del genere?!».

**Why:** un caso solo non prova niente, e dichiarare completo un lavoro non verificato è una dichiarazione falsa. L'utente vuole un'analisi sistematica fatta da me (vedi [[feedback-tutto-modificabile-partita]]).

**How to apply:**
- La verifica di una regola si fa su **tutti** i dati: per ogni Palazzo, planimetria, infiltrazione e partita, confrontando il risultato atteso, calcolato in modo indipendente dal codice (per esempio con SQL), con API, scheda e visore. Ogni differenza è un difetto.
- Il caso dell'utente serve a capire il difetto e va incluso, ma non basta mai.
- Prima di dire «completo» si rilegge l'elenco `docs/coordinamento/richieste-utente-aperte.md`: ogni richiesta dell'utente deve risultare verificata su p5s.
- Non si scrivono promesse o regole che non si sono pensate fino in fondo. Una frase sbagliata va ritirata subito, dicendo che era sbagliata.
