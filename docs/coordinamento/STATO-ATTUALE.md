# Stato attuale del lavoro — ramo newreview / p5s (aggiornato 2026-10-20, ~08:35Z)

Documento per riprendere il lavoro da zero, anche in un'altra sessione. Il dettaglio è nella Regia (`stato.json`), nella bacheca e in `lotti/`.

## Obiettivo
Il mandato dell'utente: completare la razionalizzazione in lotti L0–L11 sul ramo `newreview`, pubblicato su https://p5s.nasmerlinoalbus.cloud. Il ramo `main` e la produzione persona5royal non si toccano. A fine progetto, dopo la validazione dell'utente, i dati di p5s sostituiscono quelli di produzione.

## Avanzamento dei lotti
| Lotto | Stato |
|---|---|
| L0 Vocabolario e testi | consegnato |
| L1 Immagini | consegnato (approvato al giro 5) |
| L2 Mondo: aree e planimetrie | **consegnato** (approvato al giro 6; push bff237e0, pipeline riuscita; p5s verificato alle 07:37Z) |
| L3 Palazzi: aree e infiltrazioni | BE committato; FE committato in 01e7ae12 come lavoro in corso, **non validato**; restano i punti aperti qui sotto |
| L4 Avanzamento unico | BE committato (b83c30ac, 71378325, ad585387); FE in parte in 01e7ae12; non validato |
| L5–L11 | progettati (requisiti, dati, app, modifiche, piani di lavoro e casi di prova pronti fino a L9-L10); implementazione da fare |

## Cosa è pubblicato su p5s
Il push di `newreview` con il merge di L2 e il lavoro di L3/L4 (97c1d46e, 2026-10-20 ~08:28Z) è stato fatto su richiesta dell'utente: «puoi pushare tutto su newreview, comprese le modifiche di L3 ed eventuali altri lavori pending». Così p5s riceve anche L3 e L4, non ancora validati. All'avvio si applicano le migrazioni 110–113 e utente 022–024 sui dati dell'utente; il server fa da solo una copia di avvio in `/data/backups`.

## L3 — stato alle 10:30Z
- Punti aperti di L3: tutti corretti da FE e BE in d73e7027..c8338fd0 (NR3-4, AP3-1/2/4, UX3-7, UX3-8, LAY3-2, R3-41, E2, residui di L2). Sono «da verificare»: il prossimo passo è collaudo, tester e validatore, su una linea di rilascio ferma a c8338fd0.
- Integrazione decisa dall'utente, «Guida nel visore» e «Planimetria della voce»: requisiti e posto nel piano in `lotti/L3/integrazione-guida-visore.md`. BE è in corso; FE dopo. Non ferma la chiusura di L3.

## Punti aperti di L3 (alla ripresa, ora corretti: vedi sopra)
**In corso dalle 08:40Z**: la sola sessione Implementazione FE è riaperta su questi punti, nell'ordine sotto; committa su `newreview` senza push. Per NR3-4 il PM ha deciso la strada (a): la `planimetriaIniziale` dell'infiltrazione vale solo con `?infiltrazione=`; arrivando dalla casa si apre la `predefinita` dell'Area.
- NR3-4 (alta): 80 indirizzi di planimetria su 539 aprono un'altra versione (vedi `lotti/L3/difetti.md`).
- AP3-1, AP3-2, AP3-4: schede senza mappa, `senzaVicine`, collegamenti diretti alla casa.
- R3-41: visore entro metà altezza, applicate le scelte 2 e 3 del PM. Resta lo sforamento a 1024×690.
- LAY3-2: 2 casi residui (nome del sovrano accorciato).
- Indice delle Mappe: UX3-8 (planimetrie senza pin nascoste), UX3-7 (titolo «con tutti i livelli»), E2 (spilli di contenuto «più N passaggi e N note», deciso dall'utente), E3 (la carta di un Palazzo dice «N aree · M planimetrie»), E9.
- Da L2: singolare «1 spillo» (MappaPage.tsx:456, :347); commenti di immagini-miniature.test.ts:217 e MappaPage.tsx:166-167; il riquadro del numero degli spilli che copre l'angolo di alcuni disegni; l'asserzione di E7 sui quartieri da irrobustire.
- AP3-1/2/4 (FE); P3 di Test funzionali; NR3-4 nel browser.
- Poi: collaudo di L3, i quattro tester, no-reg e validatore.

## Punti aperti di L4
FE di L4: k/N, «Riapre anche» sugli Enigmi, «Da verificare» nelle tre viste, schede assorbite. Poi i tester e il validatore.

## Regole di lavoro in vigore
- La fonte dei dati è p5s, che non si sovrascrive mai; la produzione è in sola lettura; base delle prove = copia di p5s in sola lettura.
- Chi implementa non si convalida da solo; validano i tester e il galaxy-task-validator a fine lotto.
- Modifiche dirette, mai script o sed sui sorgenti; test mirati, typecheck e lint verdi.
- Le sessioni del team sono **chiuse**, per scelta dell'utente. Si riaprono una alla volta solo quando servono e si richiudono a fine compito. Il PM guida, aggiorna la Regia e porta i blocchi all'utente.
- Niente backup del volume di p5s prima dei rilasci (decisione dell'utente).
- Tutto il lavoro va salvato su git (questa cartella).

## Come riprendere (per qualunque IA o persona, partendo dal repository pubblico)
1. Leggere, in quest'ordine: `CLAUDE.md` alla radice (regole del progetto), questo file, `docs/ROADMAP.md` (righe dei lotti), `docs/DECISIONI.md`, `docs/ARCHITETTURA.md`, poi in `docs/coordinamento/`: `processo.md` (ruoli e regole del team), `bacheca.md`, `decisioni-pm.md`, `stato.json` (la Regia), `memoria-del-progetto/` (regole dell'utente: leggerle tutte, valgono come istruzioni), `lotti/L3/` e `lotti/L4/` (lotti in corso).
2. Rami:
   - `newreview` è la linea di sviluppo, pubblicata su p5s a ogni push dalla pipeline «Build & Push Docker Images (newreview)», ed è aggiornata a questo stato;
   - `newreview-l2` è la linea di rilascio usata per collaudare e validare L2, già unita a `newreview`;
   - `main` e la produzione non si toccano.
3. Avvio in locale: `npm install`, `cp .env.example .env`, `bash scripts/start-all.sh`; verifiche: `npm run typecheck`, `npm run lint`, test mirati `npx vitest run <percorso>`. La pipeline controlla typecheck, lint e audit, non i test.
4. Ciclo di un lotto (vedi `processo.md`):
   1. requisiti, dati, app e modifiche;
   2. implementazione BE e FE;
   3. prove sul codice esatto: funzionali, UX, layout ai formati 1366×657 · 1280×689 · 1024×690 · 1920×1080 · 768 · 375, no-reg sui dati;
   4. riga della ROADMAP;
   5. validatore indipendente (galaxy-task-validator, in sola lettura) fino all'APPROVATO;
   6. push, pipeline e verifica di p5s.
   I verdetti e le richieste dei giri precedenti sono in `lotti/Lx/` (`correzioni-giro*.md`, `validatore-giro*-prompt.md`).
5. Dati per le prove: chiedere all'utente una copia fresca di p5s, oppure lavorare su una copia locale. Il pacchetto `pacchetto/gioco.db` del repository serve ai test. Le copie dei database dell'utente non sono nel repository.
6. Prossimo passo concreto: riprendere L3 dai «Punti aperti di L3» qui sopra, correggere, poi collaudo, prove e validatore come per L2. Le liste dei difetti sono in `lotti/L3/difetti.md` e `lotti/L4/difetti.md`.
7. Accesso a p5s e al server: solo l'utente ha gli indirizzi e le chiavi, omessi qui perché il repository è pubblico. La verifica di p5s la può fare chiunque dall'indirizzo pubblico.

## Elenco «da rivedere» per l'utente
Vedi `rapporto-finale.md`: Sakura Residence, «Pagine ammuffite», pin 811, invito di Makoto (b), voci boss di Madarame con «Gelo», distributori 1584/1769, Hagoromo, listino di Tanaka, voci di Igor/Lavenza, N1, LAY-2, rigenerazione di `pacchetto/gioco.db`.
