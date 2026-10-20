---
name: feedback-pm-ascoltare-i-messaggi
description: Da PM ogni resoconto delle sessioni va letto per intero e tradotto in azione o in aggiornamento; mai accusare ricevuta con una riga
metadata:
  node_type: memory
  type: feedback
  originSessionId: cffd8da6-5996-4013-b5ec-2c69430948db
  modified: 2026-10-20T05:18:09.880Z
---

Ogni messaggio o resoconto di una sessione va letto per intero, comprese le parti troncate, e per ognuno ci si chiede:
- cambia il percorso critico?
- sblocca qualcuno?
- serve una decisione?
- cambia la regia?

Dopo si agisce: si avvisa chi è sbloccato, si decide, si aggiorna stato.json e la bacheca. All'utente si riporta l'effetto, non il riassunto del messaggio.

**Why:** il 2026-10-20 l'utente ha dato al PM «bocciato e cartellino giallo al manager che riceve messaggi e non li ascolta». Accusavo ricevuta con una riga e non mi ero accorto che BE aveva già consegnato le modifiche di L2 e che il Collaudo stava committando.

**Regia p5s.** Tenerla sempre aggiornata è il compito principale del PM (richiesta dell'utente del 2026-10-20: «devi tenere sempre aggiornata la Regia p5s visto che è quello il tuo compito... gestire gli altri processi»). Dopo ogni gruppo di resoconti si aggiornano stato.json, cioè fasi e note dei lotti, righe delle sessioni e riga del PM.

**How to apply:** a ogni gruppo di notifiche si fa un passaggio esplicito «cosa cambia → cosa faccio». Se un resoconto è troncato si legge per intero con list_events. Collegati: [[feedback-pm-non-bloccare-team]].
