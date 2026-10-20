# Istruzioni per il validatore, L2 giro 3

Sei il galaxy-task-validator. Valida in SOLA LETTURA il lotto L2 («Mondo: aree e planimetrie») dopo le richieste R1–R8 del giro 2, in `C:\Users\rober\.claude\p5s-coordinamento\lotti\L2\correzioni-giro2.md`. Valgono il mandato del giro 2 (`validatore-giro2-prompt.md`), i vincoli dell'utente e le decisioni (`decisioni-pm.md`, `docs/DECISIONI.md`). Rispondi in italiano. Chiudi con «VERDETTO: APPROVATO» oppure «VERDETTO: RIGETTATO» e le richieste R1…

## Commit da validare
Worktree `C:\Repository\project-p5r\.claude\worktrees\p5s-sviluppo-l2`, branch `newreview-l2`, HEAD **217e726a**.
- Rispetto a 292a122e cambiano solo i documenti (ROADMAP, ARCHITETTURA, DECISIONI). Il codice è identico a 292a122e e a 3a056190.
- Il prompt del giro 2 dichiarava HEAD 292a122e: il commit 217e726a è nuovo.

## Dove si chiudono le richieste del giro 2
- **R1:** `lotti/L2/esiti-giro2/collaudo/292a122e/` (indice in LEGGIMI.md), fatto dal Collaudo riaperto. Contiene: typecheck, tsc --force e lint con EXIT; Vitest verbose 91/91; git status; grep 2026-10-21; diff da 62547532; patch-id dei tre cherry-pick; impronta del codice; i rossi grezzi di UX2-15, UX2-13 (test 11) ed E5/E7 sul codice di prima.
- **R2:**
  - no-reg in `lotti/L2/noreg.md` §4-duodecies e `esiti-giro2/noreg/292a122e/` (Test no-reg riaperto);
  - layout de La città e delle intestazioni in `esiti-giro2/layout/292a122e/esito.md` (Test layout riaperto).
- **R3:** verifica indipendente di UX2-15:
  - Test layout: 48 misure, in `esiti-giro2/layout/292a122e/`;
  - Test UX: rotella vera, in `esiti-giro2/ux/292a122e/` e nella riga UX2-15 di `difetti.md`.
- **R4:** carta di Tokyo col testo di E4, indice a 1024×690 e a 768, Elenco di Tokyo, riga LAY2-7 chiusa su 292a122e: `esiti-giro2/layout/292a122e/`.
- **R5:**
  - `difetti.md`: UX2-13 e UX2-15 verificati; righe nuove E4, E5, E7; LAY2-7; la cella di LAY2-4 che rompeva la tabella, ora su una riga;
  - `docs/ROADMAP.md:1296`: conteggio UX 15/13, prove con l'hash;
  - `stato.json`: nota di L3 senza UX2-13.
- **R6:** `docs/ARCHITETTURA.md`, miniature ritagliate e linea di rilascio; `docs/DECISIONI.md`, sezione L2 «Giro 2».
- **R7:** dichiarazione nella ROADMAP e in DECISIONI che il PM ha implementato UX2-15. Orari:
  - la richiesta dell'utente «quindi organizza tu per risolvere il L2» è arrivata dopo il secondo stop (~06:06Z) e prima dei commit delle 06:08–06:09Z;
  - «Autorizzo a fare in modo di completare l2» è arrivato prima della ROADMAP 292a122e (06:19Z);
  - la riapertura delle sessioni di prova, «una alla volta», l'ha chiesta l'utente dopo il giro 2.
- **R8 (facoltativo):** non fatto. I commenti `immagini-miniature.test.ts:217` e `MappaPage.tsx:166-167` e il singolare in `MappaPage.tsx:456` e `:347` sono rimandati a L3, per non cambiare il codice già provato.

Note nuove dei tester, assegnate a L3:
- UX3-8, le planimetrie senza pin nascoste;
- il riquadro rosso con il numero degli spilli copre l'angolo di alcuni disegni;
- `SelettoreVersioni.tsx:64` sulla linea di sviluppo, lavoro di L3 non committato, viola la regola delle aree scorrevoli.

## Cosa verificare
1. Ogni richiesta R1–R7 del giro 2 è chiusa davvero, con le prove grezze.
2. Il codice di 217e726a è identico a 292a122e; solo i documenti cambiano.
3. I documenti sono coerenti fra loro e con le prove.
4. Main e produzione non sono toccati; p5s non è sovrascritto; nessuna data 2026-10-21.
