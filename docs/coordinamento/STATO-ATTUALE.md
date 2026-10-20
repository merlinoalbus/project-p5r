# Stato attuale del lavoro — ramo newreview / p5s (aggiornato 2026-10-21, ripresa)

## DOVE SIAMO ADESSO (leggere per primo; prevale su tutto quanto c'è sotto)
- **Ripresa L6 del 2026-10-21, 22:43Z del 20/10**: implementazione locale pronta alla pubblicazione unica del lotto, codice e coordinamento insieme. Nessun servizio avviato, fermato o riavviato, nessuna scrittura sui dati dell'utente, nessun commit/push intermedio. Zero test e niente nuovi validatori. Typecheck, lint senza avvisi e build riusciti anche dopo l'ultima correzione della navigazione dei requisiti. Pipeline e browser del nuovo rilascio ancora da osservare: non dichiarare anticipatamente L6 completo.
- **Asakusa risolto dall'utente**: «sblocco se vale la prima o la seconda condizione». Ann rango 7 **oppure** Skytree aperto dal libro «Shitamachi rinato». La migrazione 118 esprime già questo OR; allineati R6-10 e decisioni, nessuna nuova migrazione o scrittura dei dati. Nessuna decisione ancora richiesta su questo punto.
- **Revisione precedente delle rimozioni**: approvate esclusivamente nel perimetro statico; non certifica il runtime né la chiusura/pubblicazione di L6.
- **Richieste successive, perimetro confermato**: rimuovere soltanto il blocco «Da posizionare» del pannello dell'Area e, separatamente, il riquadro «Schermate di riferimento / Aggiungi schermata» dell'editor. Le due rimozioni sono locali. «Aggiungi luogo», gli altri accessi a «Posiziona», le API e i dati esistenti restano invariati. Il tentativo di aggiungere il tipo di pin «Luogo» è stato ritirato per ordine dell'utente; il catalogo dei pin è identico a HEAD. Non introdurre tipi o processi estranei al piano di L6.
- **Controlli freschi del lavoro locale**: `npm run typecheck`, `npm run lint` (zero avvisi) e `npm run build` riusciti; `git diff --check` senza errori. Risolto il parametro inutilizzato di `aperturaTokyo`. Nessun test scritto o eseguito e nessuna verifica runtime locale: non dichiarare il lotto completo o già pubblicato.
- **Decisioni più recenti dell'utente**: si lavora su un lotto intero e si fa commit/push soltanto alla fine, con codice e coordinamento insieme. «Importa» resta: sostituisce il file DB con un backup locale, non reintroduce il pacchetto come fonte dei dati. La guida del visore va bene com'è: restano tutte le infiltrazioni associate alla planimetria.
- **Implementazione locale L6**: collegati editor unico/anteprima server, inviti nelle tre viste, editor requisiti con bozze conservate per rango, fonti degli sblocchi e libri «Apre». La finestra requisiti segue il parametro URL e il Confidente corrente: nessuna finestra del Confidente precedente dopo la navigazione. Città e metro mostrano `disponibile` del server; l'Area chiusa dice perché. Corrette perdita del testo degli avvisi nel DTO/salvataggio, spazi durante la digitazione, prefisso duplicato, avvisi annidati e chip non bloccanti. I semafori generano il testo dai riferimenti correnti, senza perdere le note salvate.
- **B6 e documenti locali**: «Importa» allineato al backup locale nell'interfaccia e in `CLAUDE.md`. Recupero dei vecchi `manuale` durante l'importazione esplicita, dopo le migrazioni storiche, con riepilogo e percorso di ripristino esistente; coperti anche snapshot del catalogo e della guida. Anche il JSON delle mappe ora elenca i recuperi nei pin e nelle copie effettivamente importati: tracce dei pin calcolate dopo le verifiche finali, copie scartate escluse. Riepilogo FE e OpenAPI aggiornati, normalizzazione e regole di sovrascrittura esistenti conservate. Nessuna importazione eseguita. Creato `elenco-frasi-condizioni.md`: 201 righe / 147 frasi distinte dal DB pubblico schema 93, non dai dati privati né come prova dello stato di p5s. Nessuna conversione delle frasi applicata o approvata.
- **Ramo unico `newreview`**: ultimo push `38411d36`, pipeline #63 riuscita (ultimo riscontro precedente). Fetch riuscito, locale e remoto allineati; nessun nuovo rilascio. Tutto il lavoro successivo resta locale fino alla fine di L6, con il coordinamento nello stesso commit.
- **Dati di p5s**: il runtime pubblicato espone già `sbloccoCondizione` con snapshot e il pulsante «Modifica sblocco»; la migrazione 120 copia senza sovrascrivere la condizione attuale la guida degli sblocchi dei quartieri, per rendere possibile «Ripristina». L’API pubblica è stata verificata dopo la pipeline #61 con Shibuya coerente; il numero osservato nell’indice dopo il rilascio è 301 mappe e 767 spilli; non è stato eseguito alcun salvataggio su p5s. La pipeline #62 ha pubblicato `f4dd2c08`; la nuova scheda FE anonima è rimasta su «Caricamento», quindi la verifica utente/browser della pagina resta aperta.
- **Metro/diario L6**: il confronto del codice conferma la destinazione unica: `dungeonService`, `giornataService` e `azioniStrutturateService` usano `atterraggioDelPalazzo`/`destinazionePalazzo`; queste applicano la stessa regola d'atterraggio del giorno e lo stesso fallback all'ingresso. Resta la prova funzionale sulla partita reale, non eseguita da questa sessione.
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
| L6 Condizioni uniche | **in corso**, B5 pubblicata per contratto BE, filtro lista quartiere, rimozione fallback legacy del validatore e del lettore runtime dei quartieri, lettori strutturati in `sincronizzaMappe`, DTO quartiere con fonte/esito/inviti e filtro delle Aree chiuse nell'indice, nei figli del visore e nelle «Aree vicine». Migrazione 120, API di modifica/ripristino, editor FE dello sblocco e descrizioni OpenAPI di B6 sono pubblicati; **restano** verifica metro-diario, prova dell'utente e la chiusura funzionale B6/F6 (`lotti/L6/piano.md`). |
| L7–L11 | progettati (`lotti/Lx/`), da implementare BE e FE |

**Sessioni del team** (app Claude desktop):
- «Implementazione FE» al lavoro su L6.
- «Implementazione BE» ferma: aspetta un «procedi» scritto dall'utente nella sua sessione, e non riparte con il via del PM.
- «Analisi dati» ferma, l'app non la lascia archiviare.
- Tutte le altre sono chiuse.

**Decisioni confermate dall'utente**:
1. mantenere «Importa» per sostituire il file DB con un backup locale; allineare interfaccia e documentazione a questo significato;
2. conservare la guida del visore com'è, con tutte le infiltrazioni associate alla planimetria.

**Lavoro non ancora committato**: completamento FE di L6 e le due rimozioni mirate sopra indicate, con il coordinamento. Nessun nuovo push intermedio: commit e push insieme a fine lotto, secondo la decisione più recente dell'utente.

**Note dalla prova di ripresa** (un'altra IA, 2026-10-20 sera):
- `git fetch` può fallire per i permessi su `.git/FETCH_HEAD`: non è prova di un processo bloccato. Il worktree condivide la cartella `.git` del repository principale. Non chiudere altri processi: usare i permessi previsti oppure `git ls-remote github newreview`. Il fetch di questa ripresa è riuscito; locale e remoto restano a `38411d36`.
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
