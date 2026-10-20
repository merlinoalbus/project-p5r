# Stato attuale del lavoro — ramo newreview / p5s (aggiornato 2026-10-20, ~14:30Z)

Documento per riprendere il lavoro da zero, con qualunque IA o persona. Il dettaglio è nella Regia (`stato.json`), nella bacheca e in `lotti/`. **Leggere tutto prima di toccare qualcosa.**

## Obiettivo
Mandato dell'utente: completare la razionalizzazione in lotti L0–L11 sul ramo `newreview`, pubblicato su https://p5s.nasmerlinoalbus.cloud. Il ramo `main` e la produzione persona5royal non si toccano. A fine progetto, dopo la validazione dell'utente, i dati di p5s sostituiscono quelli di produzione.

## Avanzamento dei lotti
| Lotto | Stato |
|---|---|
| L0 Vocabolario e testi | consegnato |
| L1 Immagini | consegnato (approvato al giro 5) |
| L2 Mondo: aree e planimetrie | consegnato (approvato al giro 6; push bff237e0; p5s verificato) |
| L3 Palazzi: aree e infiltrazioni | **dal validatore** (giro 1, dalle 15:30Z) sulla linea di rilascio `newreview-l3` = b5fd6cfe. Tutti i tester sono verdi e tutti i difetti, fino a UX3-13 e LAY3-8, sono corretti e verificati. Con l'APPROVATO: push di `newreview-l3` su `newreview` |
| L3 · integrazione «Guida nel visore» e «Planimetria della voce» | BE fatto (42b34243, non validato, **non** nella linea di rilascio di L3); FE da fare (B2). Vedi `lotti/L3/integrazione-guida-visore.md` |
| L4 Avanzamento unico | BE fatto (b83c30ac, 71378325, ad585387; migrazioni 111–113); FE in parte (01e7ae12). **Il FE riparte alle 15:30Z** sul «Da fare» di `lotti/L4/fe.md`: §8.11 k/N, §8.6, §4.2, §4.1/4.3. Un commit per punto su `newreview`, senza push. Poi la linea di rilascio `newreview-l4`, i tester e il validatore |
| L5–L11 | progettati (requisiti, dati, app, modifiche, piani e casi di prova pronti fino a L9-L10); implementazione da fare |

## Rami e cosa è dove (IMPORTANTE)
- **`newreview` su GitHub** = ciò che gira su p5s. Ultimo push: 49858485, ~08:35Z. Codice di L3/L4 a 01e7ae12 più alcuni documenti. **Ogni push su `newreview` pubblica su p5s** (pipeline «Build & Push Docker Images (newreview)», Watchtower ~3 min) e applica le migrazioni ai dati dell'utente.
- **`newreview` locale** (worktree `pensive-burnell-b50941`) = linea di sviluppo, avanti di molti commit:
  - correzioni di L3 (d73e7027..c8338fd0 e le successive dei tester);
  - **42b34243**, il BE dell'integrazione con la **migrazione 114**;
  - documenti.
  
  Non si pusha su `newreview` finché il lavoro non è validato. Una copia senza pubblicazione è sul ramo remoto **`newreview-lavoro`**, aggiornato a ogni salvataggio importante.
- **`newreview-l3`** (worktree del Collaudo `p5s-sviluppo-l2`) = linea di rilascio di L3:
  - parte da fd988a3e (= c8338fd0 + documenti);
  - si aggiungono solo correzioni dei tester e documenti, con cherry-pick verificati con `git patch-id`;
  - HEAD a db7d0423 alle 14:10Z;
  - copia remota senza pubblicazione: ramo **`newreview-l3`** su GitHub.
  
  Al rilascio di L3, dopo l'APPROVATO, si pusha `newreview-l3` su `newreview`. È un avanzamento rapido: la linea discende dall'ultimo push.
- Poi `newreview` locale si riallinea con un merge di `newreview-l3` e si prosegue con l'integrazione e L4.
- `newreview-l2` = linea di rilascio di L2, già unita. `main` non si tocca.

## L3 — stato di dettaglio
- **Difetti:** tutti in `lotti/L3/difetti.md`, con hash e test.
  - Corretti e verificati dai tester:
    - NR3-4, AP3-1/2/3/4;
    - UX3-1…UX3-11;
    - LAY3-1…LAY3-7;
    - R3-41, E2, E3;
    - residui di L2.
  - E9 rinviato a L11.
- **Aperto:** **LAY3-8** (bassa). A Shido, 1366×657, l'elenco aperto delle versioni esce di 10 px dalla finestra. È assegnato a FE.
- **Prove grezze:**
  - `lotti/L3/esiti-collaudo/<hash>/`;
  - `esiti-funzionali/d5eb9650/`;
  - `esiti-ux/d5eb9650/` e `765fb2a1/`;
  - `esiti-layout/765fb2a1/`, `48d7a958/`, `7562f6ac/`, `db7d0423/`;
  - `esiti-noreg/48d7a958/`;
  - cicli di scrittura sull'istanza: `esiti-collaudo/cicli-dati.md`.
- **Istanza di prova:** del Collaudo, FE 5473 e BE 3301, su `newreview-l3`. Dati = copia di p5s delle 09:48Z, base `L3-base-p5s-20261020-0948Z`. Dopo ogni ciclo di scrittura si ripristina e l'impronta si conferma identica.
- **Prossimi passi:**
  1. FE corregge LAY3-8;
  2. il Collaudo fa il cherry-pick su `newreview-l3`, con typecheck, lint, test mirati e istanza;
  3. Test layout e Test UX riverificano;
  4. riga della ROADMAP di L3;
  5. galaxy-task-validator, con un prompt che indichi linea, prove e richieste dell'utente;
  6. con l'APPROVATO: push di `newreview-l3` su `newreview`, pipeline fino all'esito, verifica di p5s nel browser, notifica all'utente.
- Mentre lavora il validatore, che è un agente e non una sessione, riparte il FE di L4.

## Decisioni dell'utente di oggi da rispettare (oltre a quelle in memoria)
- **Intestazione:** al massimo il **30% dell'altezza della schermata** a ogni dispositivo (`memoria-del-progetto/feedback-intestazione-30.md`).
- **Guida nel visore** (integrazione):
  - solo consultazione: caselle fatto/riapri, dettagli, riferimenti ai pin;
  - la scheda del Palazzo non si tocca, salvo il campo «Planimetria» nella modifica della voce;
  - le voci senza pin stanno solo sulla planimetria dove sono state inserite (per regola, la planimetria 1 dell'infiltrazione) e si spostano a mano.
- **E2:** l'indice conta i pin di contenuto, «più N passaggi e N note». Le porte vanno fra i passaggi.

## Decisioni del PM di oggi
- **NR3-4:** strada (a). Arrivando dalla casa di un'Area si apre la predefinita.
- **LAY3-4 e LAY3-7:** il testo intero si legge con un tocco, nei «Dettagli dalla guida» o nell'elenco aperto. R3-41 ha la precedenza sul mandare a capo i selettori da 1024 in su.
- **UX3-10:** il numero dei pin compare una volta sola, nel riquadro «N pin».
- **UX3-11:** opacità piena.
- **Un Enigma con passi** non si aggancia a mano a una planimetria: sta dove stanno i passi.

## Regole di lavoro in vigore
- La fonte dei dati è p5s, che non si sovrascrive mai. La produzione è in sola lettura. La base delle prove è una copia di p5s, in sola lettura.
- Chi implementa non si convalida da solo: validano i tester e il galaxy-task-validator a fine lotto.
- Modifiche dirette, mai script o sed sui sorgenti. Test mirati, con il rosso visto prima e il verde dopo; typecheck e lint verdi.
- **Una sessione del team alla volta.** Si riapre solo quando serve e si richiude a fine compito. Il PM guida, aggiorna la Regia e porta all'utente solo i blocchi e le decisioni che spettano a lui.
- Niente backup del volume di p5s prima dei rilasci (decisione dell'utente).
- Tutto il lavoro va salvato su git (questa cartella) e copiato su GitHub nei rami `newreview-lavoro` e `newreview-l3`. Mai DB, indirizzi del server o dati personali: il repository è pubblico.

## Come riprendere (per qualunque IA o persona, partendo dal repository pubblico)
1. **Leggere, in quest'ordine:**
   - `CLAUDE.md`;
   - questo file;
   - `PROMPT-RIPRESA.md`;
   - `docs/ROADMAP.md`, `docs/DECISIONI.md`, `docs/ARCHITETTURA.md`;
   - in `docs/coordinamento/`: `processo.md`, `bacheca.md`, `decisioni-pm.md`, `stato.json`;
   - `memoria-del-progetto/`, tutto: sono regole dell'utente;
   - `lotti/L3/` (difetti, integrazione, esiti) e `lotti/L4/` (fe.md, modifiche.md, difetti.md).
2. **Prendere i rami** `newreview-lavoro` e `newreview-l3` da GitHub. Controllare con `git log` che coincidano con quanto scritto qui.
3. **Avvio in locale:** `npm install`, `cp .env.example .env`, `bash scripts/start-all.sh`. Verifiche: `npm run typecheck`, `npm run lint`, test mirati `npx vitest run <percorso>`. La pipeline controlla typecheck, lint e audit, non i test.
4. **Ciclo di un lotto** (vedi `processo.md`):
   1. requisiti, dati, app e modifiche;
   2. BE e FE;
   3. prove sul codice esatto: funzionali, UX, layout ai formati 1366×657 · 1280×689 · 1024×690 · 1920×1080 · 768 · 375, no-reg sui dati;
   4. riga della ROADMAP;
   5. validatore fino all'APPROVATO;
   6. push, pipeline, verifica di p5s.
5. **Dati per le prove:** una copia fresca di p5s, che fornisce l'utente o la sessione del Collaudo, oppure una copia locale. Le copie dei database non sono nel repository.
6. **Prossimo passo concreto:** quello indicato in «L3 — stato di dettaglio», poi L4, `lotti/L4/fe.md` «Da fare». Poi l'integrazione B2, `lotti/L3/integrazione-guida-visore.md`. Poi L5.
7. **Accesso a p5s e al server:** solo l'utente ha indirizzi e chiavi, omessi qui. La verifica di p5s si fa dall'indirizzo pubblico.

## Elenco «da rivedere» per l'utente
Vedi `rapporto-finale.md`.
