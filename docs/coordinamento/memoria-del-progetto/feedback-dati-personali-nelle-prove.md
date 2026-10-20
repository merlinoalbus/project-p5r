---
name: feedback-dati-personali-nelle-prove
description: "Nelle prove e nei documenti del repository pubblico non si scrive il nome utente né l'email dell'utente, nemmeno come voce di un controllo: si scrive «email dell'utente»"
metadata:
  node_type: memory
  type: feedback
  originSessionId: a4ff2e39-92e9-416b-be66-a66bc1f16e27
  modified: 2026-10-20T17:57:30.925Z
---

Nei controlli dei dati sensibili (immagini, indirizzi del server, dati personali in `docs/`), l'etichetta del controllo e il suo esito dicono «email dell'utente», mai il nome utente dell'email. Quel nome è esso stesso un dato personale e, scritto nella prova, finisce nel repository pubblico. Vale anche per i comandi riportati nelle uscite grezze: il criterio di ricerca non si trascrive in chiaro.

**Why:** il PM ha corretto le prove di L4 (c93e3d7d, aac70e23) che scrivevano il nome nel titolo del controllo (2026-10-20). Il repository è pubblico, vedi [[feedback-tutto-su-git]].

**How to apply:** nelle uscite in `~/.claude/p5s-coordinamento/lotti/**` e nei LEGGIMI si scrive «email dell'utente: 0». Il comando di ricerca si lancia con il valore, ma non lo si stampa nell'uscita. Prima di consegnare le prove, si cerca il nome nella cartella e si toglie.
