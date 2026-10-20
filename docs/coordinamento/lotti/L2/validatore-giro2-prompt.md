# Istruzioni per il validatore, L2 giro 2 (bozza del PM, da completare con l'hash della ROADMAP)

Sei il galaxy-task-validator. Valida il LOTTO L2 («Mondo: aree e planimetrie») dopo le correzioni chieste dal giro 1, in SOLA LETTURA. Il verdetto finale va su una riga, «VERDETTO: APPROVATO» o «VERDETTO: RIGETTATO», seguita dalle richieste numerate R1, R2…

## Richiesta dell'utente e vincoli
Valgono quelli del giro 1. Il testo integrale del giro 1 è in `lotti/L2/correzioni-giro1.md`, le decisioni in `decisioni-pm.md`.

Cosa è cambiato dal giro 1, per decisione dell'utente del 2026-10-20:
- la base dei dati è la copia di **p5s** in `dati-produzione/p5s-2026-10-20-0533Z/` (la 0503Z più la planimetria di prova dell'utente `palazzo-di-kamoshida-prova`, id 808, da non toccare), perché la produzione resta ferma e l'utente lavora su p5s;
- dopo uno stop generale e la chiusura di tutte le sessioni del team, chiesti dall'utente, il PM completa L2 e lancia questo giro su autorizzazione esplicita dell'utente;
- p5s non si sovrascrive mai;
- chi implementa non si convalida da solo.

Lavoro da preservare sulla base p5s:
- diario: 255 voci;
- Kamoshida: 169 voci, 359 pin dell'utente;
- Madarame: 227 voci, 254 pin dell'utente.

## Dove sta il lavoro
- Linea di rilascio: worktree `C:\Repository\project-p5r\.claude\worktrees\p5s-sviluppo-l2`, branch `newreview-l2`, HEAD `292a122e` (riga ROADMAP). Catena dopo 62547532: 872ac976 (LAY2-7, cherry-pick di 126168a0), 4e5f55a0 (ROADMAP intermedia, superata), 115581b4 (UX2-13, cherry-pick di 7624bdda), 0268751a (E4/E5/E7, cherry-pick di d71a1bbd), 3a056190 (UX2-15, cherry-pick di 63b4d80e), 292a122e (ROADMAP finale). I cherry-pick hanno lo stesso patch-id degli originali.
- Dopo lo stop generale e la chiusura delle sessioni del team, il PM ha completato L2 su richiesta esplicita dell'utente («Autorizzo a fare in modo di completare l2»): cherry-pick, correzione UX2-15 con test visto rosso, verifiche e ROADMAP.
- Commit nuovi dal giro 1:
  - 90137ce2 (R5);
  - 5fd97d9f, le modifiche di BE riscritte sul codice di rilascio e applicate alla lettera dal Collaudo (7 file, +107 −9; istruzioni in `lotti/L2/esiti-giro2/be/rilascio/`, esiti in `esiti-giro2/collaudo/modifiche-BE/`);
  - i cherry-pick dei commit FE b0ebdad0, c43b8bc0, fcff89e3, fino a f19a117f;
  - 25012240, cherry-pick di a7fe0aee: chip «1 da verificare» sulla carta di Tokyo nella griglia (decisione del PM su R1: il segno si vede senza aprire «Elenco completo»);
  - 872ac976, cherry-pick di 126168a0: LAY2-7, la riga dei conteggi della carta di Tokyo che si leggono interi a 1280 e 1366. Era un effetto collaterale del chip di R1. Layout e no-reg verdi (`esiti-giro2/layout/LAY2-7-esito.md`, `noreg.md` §4-undecies);
  - 0268751a, cherry-pick di d71a1bbd: E4 (la carta di Tokyo conta quartieri e aree, non righe di `mappa`), E5 (stesso conteggio e stessa parola su ogni riga dell'Elenco completo), E7 (l'Area dello staff in un gruppo «Da verificare» di Tokyo, non fra i quartieri), dall'analisi in `lotti/L2/analisi-elenco-mappe.md`;
  - 3a056190, cherry-pick di 63b4d80e: UX2-15, dalla domanda dell'utente sulle «due barre» in `/guida/mappe`: una sola barra; il pannello delle carte del Palazzo e l'Elenco completo crescono con la pagina, senza max-h (regola dell'utente sugli scroll annidati);
  - 115581b4, cherry-pick di 7624bdda: UX2-13, dalla segnalazione dell'utente su p5s: le miniature `?l=` delle planimetrie si ritagliano sul riquadro del disegno (le native sono tele 2048×2048 con il disegno in un angolo); il visore resta sulla tela intera, coordinate dei pin invariate; cache invalidata senza migrazioni;
  - DICHIARATO E ASSEGNATO AL RILASCIO DI L3, non fa parte di L2: UX3-8 (planimetrie senza pin raccolte in un gruppo nascosto della griglia), insieme a E2 (deciso dall'utente: spilli di contenuto con «più N passaggi e N note»), E3, E9 e UX3-7 dell'indice dei Palazzi. La «Prova» dell'utente sotto Kamoshida è chiusa come non difetto (errore di inserimento dichiarato dall'utente);
  - prove sul commit finale 3a056190, fatte dal PM dopo la chiusura delle sessioni del team: typecheck e lint verdi (exit 0); Vitest mirati 91/91 (server/routes/immagini-miniature.test.ts, src/components/mappe/OrganizzazioneMappe.test.tsx, src/pages/MappaPage.test.tsx, src/test/areeScorrevoli.test.ts, src/pages/CittaPage.test.tsx); test UX2-15 visto rosso con il codice di prima; nel browser sul collaudo 5473, a 1366×657, 1280×689, 768 e 375, una sola barra (quella della pagina) con Tokyo e Madarame aperti e con l'Elenco aperto, nessuno scorrimento orizzontale, conteggi di Tokyo interi, chip «1 da verificare», miniature ritagliate. Le riprove dei tester sui tre commit finali non ci sono, perché le sessioni sono state chiuse dall'utente: verificale tu dove servono, sul codice;
  - la riga ROADMAP: 292a122e.

## Le richieste del giro 1 e dove si chiudono
- R1 (F1), segno «Da verificare» nell'indice: commit di BE e di FE; layout in `esiti-giro2/layout/`.
- R2 e R4 (F2), F2-29 e F2-30 dal vivo, tabella onesta: `funzionali.md`, «Chiusura della fase», e `esiti-giro2/funzionali/`.
- R3 (R2-28), test visto rosso e poi verde: `esiti-giro2/be/02-test-r3-rosso.txt` e seguenti. Il test ha trovato un difetto vero in `importaAree`, corretto.
- R5 (F3), DECISIONI: 90137ce2.
- R6 (F4), «Colloca» con test FE e misure: b0ebdad0, `esiti-giro2/layout/R6-R7-esito.md`.
- R7 (F5), Cestino ai tre formati: stesso file.
- R8 (F6), dichiarazioni: `lotti/L2/be.md` («Dichiarazione») e `fe.md`.
- R9 (F7, F8), `difetti.md` e i 113 indirizzi: righe LAY-2 e UX2-7, e la riga ROADMAP.
- R10, prove sul commit finale: `esiti-giro2/collaudo/`.
- Difetti nuovi del giro 2: FUN2-8 (PUT nel mondo senza Area → 409) e FUN2-9 (Colloca propone il quartiere del genitore), in `difetti.md`.
- F9, ricongiungimento: riga ROADMAP. Il merge di newreview-l2 in newreview si fa dopo l'APPROVATO.

## Cosa verificare
1. Ogni richiesta del giro 1 è chiusa davvero, nel codice e con le prove grezze.
2. FUN2-8 e FUN2-9 sono corretti, con test visti rossi, e riprovati dal vivo sul commit esatto.
3. Il commit BE sul rilascio contiene solo righe di L2, senza contesto di L3 o L4: confronta con il diff dei commit di sviluppo 1cd41876 e b6f3dd9a.
4. No-reg sulla base p5s: lavoro da preservare identico, 75 «Sulla mappa», metro.
5. Documenti coerenti, nessuna data 2026-10-21, main e produzione non toccati, p5s non sovrascritto.
6. Le violazioni di regola sono dichiarate per intero.
