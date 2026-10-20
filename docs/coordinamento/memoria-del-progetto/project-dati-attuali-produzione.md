---
name: project-dati-attuali-produzione
description: "Dal 2026-10-20 l'utente lavora su p5s e non tocca persona5royal fino alla fine; p5s è dati dell'utente e la fonte di riferimento; alla fine i dati di newreview sostituiscono i principali dopo la validazione"
metadata:
  node_type: memory
  type: project
  originSessionId: cffd8da6-5996-4013-b5ec-2c69430948db
  modified: 2026-10-20T06:21:42.416Z
---

Il 2026-10-20 l'utente ha detto: «persona5royal non lo tocco fino a quando non termini il lavoro». La produzione resta ferma alla copia del 2026-10-20 04:40Z, e da quel momento l'utente gioca e inserisce dati su **p5s** (container project_p5r_review_be, volume p5s_data). Per esempio, ha segnato le voci di Kamoshida per chiuderla al 100%.

Regole:
- p5s contiene dati dell'utente: mai sovrascriverlo, né con copie della produzione né con i rilasci.
- I rilasci su p5s applicano le migrazioni sui suoi dati. Il backup del volume prima del rilascio NON serve, per decisione dell'utente («No backup non ne serve», 2026-10-20, rilascio di L2); all'avvio il BE fa già la sua copia di avvio in data/backups.
- La base di riferimento per anteprima, collaudo e analisi è una copia di p5s in sola lettura. Va rifatta quando l'utente dice di aver lavorato su p5s e prima di ogni rilascio.
- A fine progetto, dopo la validazione dell'utente, i dati di newreview (cioè di p5s) sostituiscono quelli principali di persona5royal.

**Why:** il 2026-10-20 l'utente ha trovato il team al lavoro su un DB vecchio; poi ha chiarito che le sue correzioni stavano su p5s («no l'ho fatto su p5s»). Ho rischiato di far sovrascrivere p5s con una copia della produzione.

**How to apply:** prima di toccare i dati di qualunque istanza chiedersi dove stia l'ultimo lavoro dell'utente. Nessuna cifra misurata su una copia superata va presa per buona. Collegati: [[reference-recupero-produzione]], [[feedback-produzione-sola-lettura]], [[project-lavoro-da-preservare]].
