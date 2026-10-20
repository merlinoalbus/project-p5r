# L2 — correzioni chieste dal validatore, giro 1 (2026-10-20)

Verdetto: **RIGETTATO**, sul commit 5ae62692 di `newreview-l2`. Il testo integrale è nella cronologia del PM. Qui c'è l'estratto operativo con gli assegnatari.

Regole che valgono per tutti:
- modifiche dirette, mai script o sed;
- test mirati;
- typecheck e lint verdi;
- le scritture sui dati di 3301/5473 si fanno solo dentro un ciclo del Collaudo, con foto e ripristino;
- l'output grezzo va in `lotti/L2/esiti-giro2/<ruolo>/`.

I commit di codice vanno sulla linea di sviluppo (`newreview` in pensive), separati e solo per L2, così il Collaudo può portarli sulla linea di rilascio con un cherry-pick. Il lavoro di L3 e L4 in corso non entra in questi commit.

| Rif. | Cosa | Chi |
|---|---|---|
| R1 (F1) | Segno «Da verificare» anche nell'indice `/guida/mappe`, per l'area staff di Tokyo. Lato BE: campo `daVerificare` in `AreaRifDto` (`shared/types.ts:1408`) e nel servizio dell'indice. Lato FE: il segno in `OrganizzazioneMappe*`, con lo stesso aspetto della pagina Area. Test BE e FE visti prima rossi. | BE + FE; poi Test layout ai tre formati |
| R2 (F2) | F2-30: partita di prova, «raccolto» su un pin del mondo, letto dalla pagina Area e dal visore. F2-29: rinomina dal vivo di un'area seed, poi «Ripristina». Tutto con foto e ripristino e con le impronte prima e dopo. | Test funzionali, con un ciclo del Collaudo |
| R3 (F2) | Test BE per R2-28: un'area modificata dall'utente resta dopo un import senza «sovrascrivi». Output visto rosso e poi verde. Se il test è rosso perché il codice non conserva la modifica, si corregge il codice. | BE |
| R4 | `funzionali.md:293-299`: separare i casi coperti da quelli non provati, in modo che siano veri. | Test funzionali |
| R5 (F3) | `docs/DECISIONI.md:2163`: la predefinita del Sottopasso è `001-2-0` «inquadratura orientale»; «planimetria completa» è la versione a cui porta l'alias `shibuya-sottopasso`. | Collaudo sulla linea di rilascio (solo documenti, lo autorizzo io); BE riporta la stessa frase sulla linea di sviluppo |
| R6 (F4) | Test FE della finestra «Colloca» in `AreeDellaCitta.tsx` con una lista non vuota: compare la sezione, si apre la finestra, invia a `collocaPlanimetria`, ricarica. Visto rosso. Poi la misura di layout della lista e della finestra a 1280, 768 e 375, in uno stato con la lista non vuota, preparato dal Collaudo. | FE; poi Test layout |
| R7 (F5) | Cestino con almeno una voce `area-fisica` a 1280, 768 e 375 sul commit finale, con schermate. | Test layout, con un ciclo del Collaudo |
| R8 (F6) | Dichiarare lo script node usato in d66cf5f5 su `server/routes/aree.ts` e `server/openapi/descrizioni/aree.ts` dentro `lotti/L2/be.md`. In `lotti/L2/fe.md:141` spostare `VersioniArea.tsx` fra i sorgenti. | BE (be.md), FE (fe.md); il testo per il rapporto finale lo scrive il PM |
| R9 (F7, F8) | `difetti.md`: riga LAY-2 «verificato», riga UX2-7 allineata allo stato reale. Riga ROADMAP: «113 indirizzi distinti (109 aperti nel browser, 4 controllati con `risolvi`)», oltre a ricongiungimento, cherry-pick e il resto di R10. | PM (difetti.md); Collaudo (ROADMAP) |
| R10 | Nuovo commit su `newreview-l2` con: typecheck e lint grezzi; Vitest mirati sui file toccati; impronte identiche; `git status` pulito; grep di 2026-10-21 vuoto. | Collaudo |

Note: F9 (ricongiungimento) va scritto nella riga ROADMAP e in ARCHITETTURA «Linea di rilascio»: merge di `newreview-l2` in `newreview` dopo l'APPROVATO. F10 e F11 restano note per L5 (UX).
