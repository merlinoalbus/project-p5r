---
name: feedback-prove-sui-dati-reali
description: "Prove nel browser che scrivono dati — partita di prova creata apposta, oppure confronto prima del ripristino; mai ripristinare alla cieca"
metadata:
  node_type: memory
  type: feedback
  originSessionId: e607dac6-f330-471d-b336-bd3dc2c5c00f
  modified: 2026-10-11T20:03:02.100Z
---

Le prove nel browser di project-p5r che scrivono dati (stati, voci, Persona, Richieste) non vanno fatte sulla partita reale dell'utente rimettendo poi i DB alla copia presa prima: il ripristino cancella anche quel che l'utente (o l'app) avesse scritto nel frattempo, e dopo un riavvio `BE.log` e il registro di rete del browser non lo dimostrano più.

**Why:** il validatore ha rigettato due volte per questo (2026-10-11): un ripristino di `gioco.db` senza confronto (sanato a posteriori confrontando tabella per tabella) e uno dopo la prova della voce 2 dei Memento, dove la finestra 21:53–21:57 non era più verificabile e si è dovuto dirlo all'utente.

**How to apply:** per le scritture sulla partita usare una partita di prova creata apposta (poi eliminata, col permesso dell'utente); per le scritture sui dati di gioco, prima del ripristino salvare lo stato attuale e confrontarlo con la copia (script di sola lettura tabella per tabella, come `confronta-gioco.cjs`): le uniche differenze ammesse sono quelle della prova. Copiare in un file le righe di `BE.log` della prova prima di riavviare il BE. Vedi [[reference-browser-pane-p5r]] e [[project-flusso-di-lavoro-p5r]].
