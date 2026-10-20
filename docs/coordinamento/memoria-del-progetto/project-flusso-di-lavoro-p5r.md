---
name: project-flusso-di-lavoro-p5r
description: "Flusso richiesto dall'utente per ogni lotto di project-p5r — ramo lavoro/…, validatore emulato in sola lettura, PR + merge + cancellazione dei rami, solo main locale e remoto; stato dei dati (gioco.db + partite.db, pacchetto al posto del seed)"
metadata:
  node_type: memory
  type: project
  originSessionId: 63bec0e8-695c-4df0-bfcd-ebd80ca4af36
  modified: 2026-09-29T10:14:16.449Z
---

**Aggiornamento 2026-09-29 — l'utente: «non ramo dedicato, direttamente su main».** Si lavora e si committa direttamente su `main` (niente ramo `lavoro/…`, niente PR); resta tutto il resto (verifiche, validatore, documenti). Le righe sotto su rami e PR valgono solo se l'utente torna a chiederle.

Per ogni lotto (stato al 2026-09-12, ultimo chiuso: voce 3 del piano «struttura, non frasi», PR #69):
- Si lavora in `C:\Repository\project-p5r` su un ramo `lavoro/<tema>` creato da `main` (BE 3101 / FE 5273 con `bash scripts/start-all.sh`; il BE gira sotto `tsx watch` e si riavvia da solo a ogni modifica in `server/`).
- Typecheck + lint + `npx vitest run` (164 file / 773 test al 2026-09-12) + verifica nel browser a 1280/768/375 (overflow orizzontale = difetto bloccante), aggiornare ROADMAP/DECISIONI/ARCHITETTURA.
- Il galaxy-task-validator non esiste come agent: si emula con un agent `general-purpose` in sola lettura (divieto di scrivere file, di git che cambia stato, di scritture su `data/` e `pacchetto/`, di API POST/PUT/DELETE). Senza APPROVATO non si passa oltre; i rilievi non bloccanti si accolgono nello stesso lotto.
- Chiusura: commit sul ramo, `git push -u github <ramo>`, `gh pr create`, `gh pr merge --merge --delete-branch`, `git pull github main`, `git fetch --prune github`: devono restare solo `main` in locale e in remoto. Dopo ogni voce chiusa: rapporto in chat con percentuale + voci fatte/restanti.

Dati (dal 2026-09-12): `data/gioco.db` (dati di gioco) + `data/partite.db` (partite, schema «utente»); il seed JSON non esiste più, la sorgente è `pacchetto/gioco.db` = fotografia dell'istanza di produzione (ZIP salvato dall'utente, «non va integrato a quello che avevi»), rigenerabile con `npm run pacchetto -- --da-istanza` (`DATA_DIR` può puntare a una cartella temporanea con il DB estratto dallo ZIP). Prima di ogni script che tocca `DATA_DIR` fermare il BE (`bash scripts/stop-be.sh`): il watch lo riavvierebbe a metà lavoro creando file sbagliati.

**Why:** regole esplicite dell'utente («fai la pr e il merge su main appena hai finito», «sia in locale che in remoto deve restare solo main», rapporto di avanzamento a ogni voce) e del CLAUDE.md del progetto.

**How to apply:** non chiedere conferma per PR e merge di un lotto finito e validato; ripulire sempre i rami; verificare `git branch --show-current` prima di committare; per le modifiche in blocco usare script `.cjs` nello scratchpad (bash mangia backtick e backslash in `node -e`). Vedi [[feedback-modifiche-dirette]] e [[reference-browser-pane-p5r]].
