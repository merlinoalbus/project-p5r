# Stato attuale del lavoro — ramo newreview / p5s (aggiornato 2026-10-20, ripresa)

## DOVE SIAMO ADESSO (leggere per primo; prevale su tutto quanto c'è sotto)
- **Ramo unico `newreview`**, pubblicato su p5s a ogni push. Il DTO del quartiere espone ora lo sblocco strutturato con condizione, fonte, inviti ed esito nel commit `7d37ae07`; typecheck, lint e controllo diff sono verdi in tre cicli. Il fetch locale resta bloccato dai permessi sul metadato condiviso del worktree.
- **Dati di p5s**: `userVersion` fino a 119 dopo l'ultimo rilascio; la migrazione 120 è pronta nel ramo e copierà senza sovrascrivere la condizione attuale la guida degli sblocchi dei quartieri, per rendere possibile «Ripristina».
  - 114: planimetria della voce;
  - 115: luoghi come fonte unica;
  - 116 e 117: tolta la frase «Pin nativo del gioco.»;
  - 118: condizioni uniche;
  - 119: requisiti dei Confidenti modificabili;
  - utente 025: inviti della partita.
- **Regole in vigore** (dettaglio in `memoria-del-progetto/`):
  - **zero test**: niente tester, collaudo né validatore; prova l'utente. Typecheck e lint verdi obbligatori;
  - **un solo ramo**;
  - **il pacchetto di gioco è superato**: la fonte è il DB, e le correzioni ai dati si fanno con migrazioni dirette;
  - **intestazione ≤ 30%** della schermata;
  - **mai dichiarare completo** senza aver verificato le richieste in `richieste-utente-aperte.md`;
  - **mai restringere o rinviare** una richiesta dell'utente senza chiedere.

| Lotto | Stato |
|---|---|
| L0, L1, L2 | consegnati e validati |
| L3 Palazzi | pubblicato. Fatte anche le richieste dell'utente sulla guida: scheda per planimetria (UX3-14, b34e577b), campo «Planimetria» (901c7666), guida nel visore in finestra fluttuante (91986570), pin di spostamento che portano a destinazione (67a7bfda, b8048c1b). Da provare dall'utente |
| L4 Avanzamento unico | pubblicato (fde7add7, poi unito): FE completo con FUN3-3 e FUN4-1 |
| L5 Luoghi, negozi, orari | pubblicato, completo: BE 5a22da2a…0fa7bde7 e 50ca121c; FE af5b8e14…820c05ea (F1–F6) |
| L6 Condizioni uniche | **in corso**, B5 pubblicata per contratto BE, filtro lista quartiere, rimozione fallback legacy del validatore e del lettore runtime dei quartieri, lettori strutturati in `sincronizzaMappe`, DTO quartiere con fonte/esito/inviti e filtro delle Aree chiuse nell'indice, nei figli del visore e nelle «Aree vicine». Ora sono pronte migrazione 120 e API di modifica/ripristino dello sblocco; **restano** editor FE, verifica metro-diario e poi B6/FE (`lotti/L6/piano.md`). |
| L7–L11 | progettati (`lotti/Lx/`), da implementare BE e FE |

**Sessioni del team** (app Claude desktop):
- «Implementazione FE» al lavoro su L6.
- «Implementazione BE» ferma: aspetta un «procedi» scritto dall'utente nella sua sessione, e non riparte con il via del PM.
- «Analisi dati» ferma, l'app non la lascia archiviare.
- Tutte le altre sono chiuse.

**Decisioni aperte per l'utente**:
1. togliere dalle Impostazioni il comando «Importa» del pacchetto, che sostituirebbe tutto `gioco.db`, e allineare CLAUDE.md, che descrive ancora il pacchetto come fonte;
2. nella guida del visore, mostrare solo le voci dell'infiltrazione aperta o quelle di tutte le infiltrazioni della planimetria, come oggi.

**Lavoro non ancora committato**: nessuno; il commit `ca54c39c` contiene il filtro disponibilità Aree in indice/visore/«Aree vicine». Il dettaglio di B5 è nella cartella `docs/coordinamento/lotti/L6/`.

**Note dalla prova di ripresa** (un'altra IA, 2026-10-20 sera):
- `git fetch` può fallire per i permessi su `.git/FETCH_HEAD`. Il worktree condivide la cartella `.git` del repository principale. Si chiudono gli altri processi git e si riprova, oppure si usa `git ls-remote github newreview` per leggere il commit remoto.
- `.claude/settings.local.json` è un file di configurazione locale delle sessioni: non va committato.
- Le prove UX di L4 (`lotti/L4/esiti-ux/fde7add7/esito.md`, solo testo) ora sono committate.
- Le richieste in `richieste-utente-aperte.md` segnate «pubblicato» sono **da provare dall'utente**, non da rifare. Restano aperte solo le decisioni dell'utente (comando «Importa» del pacchetto, filtro della guida del visore) e il lavoro di L6–L11.

**Da sapere per chi riprende**:
- `docs/coordinamento/richieste-utente-aperte.md` è l'elenco di controllo delle richieste.
- La Regia è `stato.json`; il cruscotto `regia/server.cjs` legge il file del repository.
- Le copie locali in `~/.claude/p5s-coordinamento` sono superate.

---
# (sotto: storia della giornata, per contesto)

Documento per riprendere il lavoro da zero, con qualunque IA o persona. Il dettaglio è nella Regia (`stato.json`), nella bacheca e in `lotti/`. **Leggere tutto prima di toccare qualcosa.**

## Obiettivo
Mandato dell'utente: completare la razionalizzazione in lotti L0–L11 sul ramo `newreview`, pubblicato su https://p5s.nasmerlinoalbus.cloud. Il ramo `main` e la produzione persona5royal non si toccano. A fine progetto, dopo la validazione dell'utente, i dati di p5s sostituiscono quelli di produzione.

## Avanzamento dei lotti
| Lotto | Stato |
|---|---|
| L0 Vocabolario e testi | consegnato |
| L1 Immagini | consegnato (approvato al giro 5) |
| L2 Mondo: aree e planimetrie | consegnato (approvato al giro 6; push bff237e0; p5s verificato) |
| L3 Palazzi: aree e infiltrazioni | **pubblicato ma NON completo** (19:30Z). Manca la regola dell'utente sulla guida per planimetria: è UX3-14, al lavoro in FE con la guida nel visore e il campo «Planimetria» (`lotti/L3/integrazione-guida-visore.md`, RG-1…RG-5). Il PM l'aveva dichiarato completo per errore. Pubblicazione delle 17:50Z, con la deroga dell'utente: il giro 1 del validatore aveva rigettato solo per prove e documenti, poi chiusi (R1–R9). Push di `newreview-l3` = 91ef6128 su `newreview`, pipeline riuscita, p5s verificato nel browser. FUN3-3 (testo dell'atterraggio) va in L4 |
| L3 · integrazione «Guida nel visore» e «Planimetria della voce» | BE fatto (42b34243, non validato, **non** nella linea di rilascio di L3); FE da fare (B2). Vedi `lotti/L3/integrazione-guida-visore.md` |
| L4 Avanzamento unico | BE fatto (b83c30ac, 71378325, ad585387; migrazioni 111–113, già su p5s). FE fatto: 01e7ae12 più 7 commit c4e9f74e..e058918c (§8.11, §8.6, §4.2, §4.3, §4.1). **Rilascio in corso**: il Collaudo crea `newreview-l4` da 91ef6128 con il cherry-pick dei 7 commit, senza 42b34243. Poi FE su FUN3-3, i tester e il validatore |
| L5–L11 | progettati (requisiti, dati, app, modifiche, piani e casi di prova pronti fino a L9-L10); implementazione da fare |

## Regole in vigore dalla sera del 2026-10-20 (prevalgono su quanto scritto sotto)
- **Un solo ramo: `newreview`.** Le linee di rilascio (`newreview-l2/l3/l4`) e la copia `newreview-lavoro` sono state unite e cancellate. Su GitHub restano solo `main` e `newreview`. Si lavora e si pubblica solo su `newreview`.
- **Zero test**: niente tester, collaudo né validatore; i test li fa l'utente. Restano obbligatori typecheck e lint verdi (`memoria-del-progetto/feedback-zero-test.md`).
- **Un'unica fonte del coordinamento**: questa cartella. La Regia (`regia/server.cjs`) legge `docs/coordinamento/stato.json` del repository.
- **Richieste dell'utente aperte**: `richieste-utente-aperte.md`, da rileggere prima di dichiarare qualsiasi cosa completa.
- Al lavoro, in parallelo: FE (guida per planimetria, poi il FE di L5…L11) e BE (BE di L5…L11).

## Rami e cosa è dove (storico, superato dalla sezione sopra)
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
