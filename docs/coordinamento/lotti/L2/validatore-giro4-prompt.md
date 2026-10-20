# Istruzioni per il validatore, L2 giro 4

Sei il galaxy-task-validator. Valida in SOLA LETTURA la chiusura delle richieste 1–5 del tuo giro 3 sul lotto L2 di project-p5r. Valgono il mandato dei giri precedenti (`validatore-giro2-prompt.md`, `validatore-giro3-prompt.md`), i vincoli dell'utente e le decisioni. Rispondi in italiano. Chiudi con «VERDETTO: APPROVATO» oppure «VERDETTO: RIGETTATO» e le richieste numerate.

## Commit da validare
Worktree `C:\Repository\project-p5r\.claude\worktrees\p5s-sviluppo-l2`, branch `newreview-l2`, HEAD **b6066830**: solo documenti dopo 217e726a.

## Dove si chiudono le richieste del giro 3
1. **(F1) Codice identico a 292a122e:** `lotti/L2/esiti-giro2/collaudo/b6066830/1-git.txt`, prodotto dal Collaudo riaperto. Contiene rev-parse, diff --stat, diff --name-only su server/shared/src (vuoto), ls-tree, status e il grep di 2026-10-21.
2. **(F2) Righe UX2-13 e UX2-15 di `lotti/L2/difetti.md`:**
   - stato corrente «verificato»;
   - la storia con il passo «corretto», autore, commit di sviluppo e di rilascio, e il percorso del rosso;
   - per UX2-15 l'autore è il PM.
3. **(F3) Rosso di E4 nella forma committata:** `esiti-giro2/collaudo/b6066830/4-rosso-E4.txt`. Anche **(F5)** il rosso isolato di E7 è in `4-rosso-E7.txt`. Il primo tentativo con l'asserzione di E5 è tenuto a parte e dichiarato non valido. I riferimenti nelle righe E4 ed E7 di `difetti.md` sono aggiornati.
4. **(F4) Cronologia con gli orari UTC:**
   - in `docs/DECISIONI.md`, «Dichiarazione e cronologia», e in `docs/ROADMAP.md:1296`;
   - gli orari dei messaggi dell'utente vengono dal registro della sessione del PM;
   - 115581b4 è stato fatto dal Collaudo alle 06:05:01Z, prima del secondo stop delle 06:06:08Z, sul perimetro del Manager dopo «riprendi L2 e completalo» dell'utente (05:55Z e 05:59Z).
5. **Nuovo commit dei documenti:** b6066830, con la richiesta 1 ripetuta su di lui.

Note F6–F8:
- **F6:** in `stato.json` le righe delle sessioni sono aggiornate (chiuse, oppure Collaudo per il giro 3).
- **F7:** `ARCHITETTURA.md`, «Linea di rilascio», non dice più «a contenuto identico».
- **F8:** il singolare «1 spillo» e i commenti sono tracciati nella nota di L3 di `stato.json`.

## Cosa verificare
Che le richieste 1–5 siano chiuse con prove grezze, che i documenti siano coerenti con i reflog e con le prove, e che il codice resti quello già validato nelle sue parti (292a122e).
