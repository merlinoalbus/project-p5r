# Istruzioni per il validatore, L2 giro 5

Sei il galaxy-task-validator. Valida in SOLA LETTURA la chiusura delle tre richieste del tuo giro 4 sul lotto L2 di project-p5r. Valgono il mandato dei giri precedenti (`validatore-giro2-prompt.md`, `validatore-giro3-prompt.md`, `validatore-giro4-prompt.md`) e le decisioni. Rispondi in italiano. Chiudi con «VERDETTO: APPROVATO» oppure «VERDETTO: RIGETTATO» e le richieste numerate.

Commit: worktree `C:\Repository\project-p5r\.claude\worktrees\p5s-sviluppo-l2`, branch `newreview-l2`, HEAD **8ae417c5** (solo documenti dopo b6066830).

Dove si chiudono le richieste del giro 4:
1. **ROADMAP:1296.** La frase sulla linea di rilascio non dice più «a contenuto identico». Descrive il ricongiungimento come `ARCHITETTURA.md`: stesso codice di L2 sui due rami, patch-id uguali, `newreview` con L3 e L4 in più, `newreview-l2` con i commit di soli documenti. Per N3, `DECISIONI.md`, «Dichiarazione e cronologia», dichiara il tentativo bloccato delle 06:12:36Z.
2. **`stato.json`.**
   - Righe aggiornate: PM, che guida la chiusura di L2 dalle 06:07:44Z; Manager, chiuso; Test no-reg, senza il giro breve superato; Implementazione BE, chiusa e senza attività di L2.
   - Le altre sessioni sono «chiusa». Fa eccezione Analisi dati, che l'app non lascia archiviare: è dichiarato.
   - Il campo `aggiornato` è in UTC con la Z (N1).
3. **Prova git del Collaudo ripetuta su 8ae417c5:** `lotti/L2/esiti-giro2/collaudo/8ae417c5/1-git.txt`.

N2 (asserzione di E7 sui quartieri da irrobustire) è tracciata per L3.
