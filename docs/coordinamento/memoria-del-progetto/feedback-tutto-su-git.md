---
name: feedback-tutto-su-git
description: "Tutto il lavoro (coordinamento, Regia, stato, punti aperti, memoria) va salvato e pushato su git in docs/coordinamento, così qualunque IA può riprendere; mai DB né indirizzi del server (repo pubblico)"
metadata:
  node_type: memory
  type: feedback
  originSessionId: cffd8da6-5996-4013-b5ec-2c69430948db
  modified: 2026-10-20T13:58:15.408Z
---

Tutto il lavoro va salvato su git e pushato su `newreview`, non solo il codice. Vale anche per lo stato di avanzamento, il coordinamento, i punti aperti, la Regia e la memoria del progetto. Lo scopo, con le parole dell'utente: «per evitare in caso di termine dei crediti di bloccare il lavoro» e perché «una qualsiasi IA che ha accesso all'applicativo pubblico deve poter riprendere il lavoro».

Cosa e dove:
- In `docs/coordinamento/`: copia di `~/.claude/p5s-coordinamento/` (solo testo), `STATO-ATTUALE.md`, `PROMPT-RIPRESA.md`, `memoria-del-progetto/`. `CLAUDE.md` vi rimanda.
- NON si pubblicano le copie dei DB («la copia del db non serve») né schermate e log.
- NON si pubblicano indirizzi del server o percorsi di chiavi, perché il repository è PUBBLICO.

**Why:** richiesta esplicita dell'utente del 2026-10-20.

**How to apply:** a ogni passaggio importante si fanno tre cose: si aggiornano STATO-ATTUALE.md e stato.json, si ricopiano in docs/coordinamento i file cambiati, poi commit e push. Il lavoro non validato si pusha sui rami remoti `newreview-lavoro` (sviluppo) e `newreview-lN` (linea di rilascio), **mai su `newreview`**: un push su `newreview` pubblica su p5s e applica le migrazioni ai dati dell'utente. Su `newreview` va solo la linea di rilascio APPROVATA. Dopo ogni `cp` della memoria si oscura di nuovo l'indirizzo del server in `reference-recupero-produzione.md` e si cerca con grep il nome del server (lo si legge da `~/.ssh/config` o dalla memoria locale, mai scritto qui) prima del commit. Collegati: [[project-dati-attuali-produzione]], [[project-ruoli-pm-manager]].
