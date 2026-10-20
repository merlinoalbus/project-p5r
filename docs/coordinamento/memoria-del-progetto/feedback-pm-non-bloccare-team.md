---
name: feedback-pm-non-bloccare-team
description: "Da PM non bloccare mai il team; prima di una domanda all'utente distribuire il lavoro, e i messaggi fra sessioni sono al massimo 10 per ogni messaggio dell'utente"
metadata:
  node_type: memory
  type: feedback
  originSessionId: cffd8da6-5996-4013-b5ec-2c69430948db
  modified: 2026-10-20T04:36:45.152Z
---

Da project manager di un team di sessioni non lascio mai sessioni ferme, e non chiudo un turno chiedendo all'utente di sbloccarmi.

- Prima di una domanda all'utente (AskUserQuestion), che ferma il mio turno, do lavoro a tutte le sessioni che potrebbero restare ferme.
- L'app consegna al massimo 10 messaggi ad altre sessioni fra un messaggio dell'utente e il successivo.
  - Un messaggio solo per sessione, con tutto dentro.
  - Le sessioni le faccio parlare fra loro direttamente.
  - Se il limite è raggiunto, salvo i messaggi in p5s-coordinamento/messaggi-in-attesa.md e lo dico subito.

**Why:** il 2026-10-20 l'utente ha visto 14 sessioni ferme mentre la mia domanda era aperta, e poi altri messaggi bloccati dal limite. L'ha giudicata «una gravissima mancanza» e una violazione del goal «completa il lavoro secondo la tua funzione».

**How to apply:** prima di ogni domanda all'utente o fine turno, controllo i linked sessions idle e do a ciascuna un lavoro senza attese. Tengo aperta la pagina di monitoraggio (localhost:5999). Collegato a [[feedback-non-interrompere]].
