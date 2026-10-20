# L2 — giro 2 del validatore su 292a122e: RIGETTATO (2026-10-20)

Il codice delle correzioni è giudicato in gran parte corretto. Il rigetto è per prove mancanti e documenti non allineati.

| Rif. | Richiesta | Chi può farla |
|---|---|---|
| R1 | Prove grezze integrali sul commit finale in `esiti-giro2/collaudo/<hash>/`: typecheck (anche --force), lint con EXIT, Vitest verbose, git status, grep 2026-10-21, diff da 62547532, patch-id dei 3 cherry-pick, impronta del codice. Rosso grezzo dei test UX2-15, UX2-13 (test 11) ed E5/E7 nella forma committata | Collaudo |
| R2 | No-reg completo sul commit finale con la base p5s-0533Z: lavoro da preservare (diario 255, Kamoshida 169/359, Madarame 227/254, «Prova» id 808), 75/75 «Sulla mappa», metro, 38 endpoint (differenze `?v=…~r2` spiegate), pulizia della cache all'avvio. Layout de La città e delle intestazioni alle sei misure dopo UX2-13 | Test no-reg, Test layout |
| R3 | Verifica INDIPENDENTE di UX2-15 alle sei misure più 1280×800, con Tokyo e Madarame aperti e l'Elenco aperto, con schermate e misure grezze | Test UX, Test layout |
| R4 | Rimisura della carta di Tokyo col testo di E4 alle sei misure, indice a 1024×690 (622/622) e a 768 (964/964), Elenco di Tokyo; aggiornare LAY2-7 | Test layout |
| R5 | Riallineare `difetti.md` (UX2-13, UX2-15, E4/E5/E7, LAY2-7), `ROADMAP.md:1296` (conteggio UX, hash delle prove), `stato.json` (nota di L3) | PM e tester |
| R6 | `ARCHITETTURA.md` (miniature ritagliate, generazione r2, `?v=`; «Linea di rilascio»), `DECISIONI.md` (UX2-13 rispetto a «Immagini: mai ritagliate» del 2026-09-03, UX2-15, «spilli» in L2 / «pin» in L3) | PM |
| R7 | Dichiarare che il PM ha implementato UX2-15 e ne ha fatto le verifiche da solo; orario dell'autorizzazione dell'utente rispetto ai commit dopo il secondo stop (~06:06Z) | PM |
| R8 | (note) commenti `immagini-miniature.test.ts:217` e `MappaPage.tsx:166-167`; singolare «1 spillo» in `MappaPage.tsx:456` e `:347` | FE |

Autorizzazioni dell'utente, da riportare in R7, nell'ordine:
- dopo il secondo stop: «quindi organizza tu per risolvere il L2», prima dei commit delle 06:08–06:09Z;
- «Autorizzo a fare in modo di completare l2», per entrare nella cartella di rilascio e scrivere la ROADMAP (06:19Z).
