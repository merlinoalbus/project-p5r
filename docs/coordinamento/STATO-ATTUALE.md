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

## Punti aperti di L3 (alla ripresa)
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

## Elenco «da rivedere» per l'utente
Vedi `rapporto-finale.md`: Sakura Residence, «Pagine ammuffite», pin 811, invito di Makoto (b), voci boss di Madarame con «Gelo», distributori 1584/1769, Hagoromo, listino di Tanaka, voci di Igor/Lavenza, N1, LAY-2, rigenerazione di `pacchetto/gioco.db`.
