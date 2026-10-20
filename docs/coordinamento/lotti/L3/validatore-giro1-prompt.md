# Istruzioni per il validatore, L3 giro 1

Sei il galaxy-task-validator. Valida in **SOLA LETTURA** il lotto **L3 «Palazzi: aree e infiltrazioni»** di project-p5r. Non modificare niente. Rispondi in italiano. Chiudi su una riga con «VERDETTO: APPROVATO» oppure «VERDETTO: RIGETTATO», seguita dalle richieste numerate R1, R2…

## Richiesta dell'utente e vincoli
- Mandato: razionalizzazione in lotti L0–L11 sul ramo `newreview`, pubblicato su p5s. `main` e la produzione persona5royal non si toccano. p5s ha i dati dell'utente e non si sovrascrive mai. La base delle prove è una copia di p5s in sola lettura. Le regole dell'utente valgono come istruzioni: sono in `docs/coordinamento/memoria-del-progetto/`, da leggere tutte. Le più rilevanti qui:
  - tre formati e altezze realistiche;
  - scroll annidati: una sola barra;
  - grafica come l'originale, opacità al 100%;
  - **intestazione al massimo al 30% della schermata** (`feedback-intestazione-30.md`, decisione del 2026-10-20);
  - lavoro da preservare;
  - gerarchia del mondo;
  - chi implementa non si convalida da solo.
- Requisiti del lotto: `docs/coordinamento/lotti/L3/requisiti.md`, `modifiche.md`, `app.md`, `dati.md`. Decisioni: `docs/coordinamento/decisioni-pm.md`, `docs/coordinamento/STATO-ATTUALE.md` (sezioni «Decisioni dell'utente di oggi» e «Decisioni del PM di oggi»), `docs/DECISIONI.md`.
- **Fuori dal perimetro di questo giro**: l'integrazione «Guida nel visore» e «Planimetria della voce» (`lotti/L3/integrazione-guida-visore.md`, BE 42b34243). Sta su `newreview` locale e **non** sulla linea di rilascio, che va verificata senza di essa. Anche L4 è fuori: la parte già pubblicata su p5s su richiesta dell'utente non si valida qui.

## Dove sta il lavoro
- **Linea di rilascio**: worktree `C:\Repository\project-p5r\.claude\worktrees\p5s-sviluppo-l2`, branch **`newreview-l3`**, HEAD **b5fd6cfe**, la riga ROADMAP di L3 (`docs/ROADMAP.md:1297`). Prima di b5fd6cfe c'è 2df44d30, l'ultimo commit con codice. I tester sono verdi: funzionali su d5eb9650, no-reg su 48d7a958, UX e layout su 2df44d30. Fra 48d7a958 e 2df44d30 cambiano solo file FE della scheda del Palazzo e dei selettori, riverificati da UX e layout. Copia su GitHub: ramo `newreview-l3`.
  - La catena parte da fd988a3e, cioè c8338fd0 più documenti.
  - Poi solo cherry-pick, con patch-id uguali agli originali di `newreview`: correzioni dei tester e documenti.
  - Prove git a ogni passo in `lotti/L3/esiti-collaudo/<hash>/1-git.txt`.
- **Riferimenti**:
  - `b28bade7` è il codice oggi su p5s, che ha L3 e L4 non validati, pubblicati su richiesta dell'utente;
  - `bff237e0` è L2 approvato.
- **Commit di L3 dalla ripresa**, su `newreview`:
  - correzioni dei punti aperti: d73e7027, 1b29352b, 235b1216, e8324898, d446e4ab, 7efd19e0, f444645d, 0cfbe028, bc08e3ec, c8338fd0;
  - correzioni nate dai tester: 890ef6ca (UX3-9), 22af7649 (UX3-10), bcb8f57e (UX3-11), 5a40b46d (LAY3-3), de5718ed (LAY3-4), f89afdea (LAY3-5), 14d7b9e8 (LAY3-6), 5e56a266 e c5725908 (LAY3-7), b49c28b0 (LAY3-8).
- **Difetti**: `lotti/L3/difetti.md`. Ogni riga ha commit, test (o «nessun test» dichiarato) e verifica.
- **Prove grezze**:
  - `lotti/L3/esiti-collaudo/` (fd988a3e, 765fb2a1, 48d7a958, 7562f6ac, db7d0423, 08da0557, `cicli-dati.md`);
  - `esiti-funzionali/d5eb9650/`;
  - `esiti-ux/d5eb9650/`, `765fb2a1/`, `08da0557/`;
  - `esiti-layout/765fb2a1/`, `48d7a958/`, `7562f6ac/`, `db7d0423/`, `08da0557/`;
  - `esiti-noreg/48d7a958/`.
- **Istanza di prova** del Collaudo: FE 5473, BE 3301, sulla linea di rilascio, con dati identici alla base p5s 0948Z. Puoi leggerla.

## Cosa verificare
1. Ogni requisito di L3 è realizzato nel codice della linea di rilascio, con le prove. Ogni difetto di `difetti.md` è chiuso davvero: codice, test visto rosso dove dichiarato, riverifica del tester sul commit giusto.
2. La linea di rilascio contiene solo L3, più i documenti, rispetto a c8338fd0. Niente di 42b34243, nessuna migrazione oltre la 113. Patch-id uguali.
3. Le regole dell'utente sono rispettate alle misure 1366×657, 1280×689, 1024×690, 1920×1080, 768×1024 e 375×812:
   - una sola barra;
   - nessuno scorrimento orizzontale;
   - nessun testo illeggibile senza mouse;
   - intestazione ≤ 30%;
   - visore entro metà altezza da 1024 in su (R3-41);
   - grafica al 100%.
4. Le decisioni del PM (NR3-4, LAY3-4, LAY3-7, UX3-10, UX3-11, Enigma) sono coerenti con le richieste dell'utente e dichiarate.
5. No-reg:
   - lavoro da preservare identico;
   - 640 indirizzi dei Palazzi;
   - metro e pagine di L2;
   - p5s non scritto, `main` non toccato;
   - nessuna data 2026-10-21 nel codice.
6. I documenti sono coerenti fra loro e con git: ROADMAP, difetti, esiti, STATO-ATTUALE. Le violazioni di regola sono dichiarate per intero.

## Scostamenti già dichiarati (da controllare, non da scoprire)
- **Rosso non visto prima della correzione** in tre casi:
  - il cambio della parola «pin» (7efd19e0): test aggiornati dopo il codice;
  - LAY3-5 (f89afdea): test di struttura scritto dopo il codice;
  - LAY3-7 (c5725908): test di SelettoreVersioni verde da subito, perché il comportamento c'era già.
- **Senza test, perché sono solo disposizione e jsdom non le misura**: LAY3-1, LAY3-2, R3-41 / LAY3-3. La loro verifica sono le misure di Test layout.
- **Comandi di shell vuoti di FE**: un `sed` vuoto in L2, un heredoc Python vuoto e un'aggiunta vuota a un file di test. Non hanno scritto nulla e sono dichiarati in `lotti/L3/fe.md`.
- **Righe dei difetti senza hash**: il Collaudo le ha segnalate e il PM le ha completate (9ab06d6a). La riga FUN3-1 è stata riunita su una riga dal PM, ed è dichiarato nella riga.
- **Esiti di layout precedenti**: Test layout aveva scritto «nessun testo troncato» su 765fb2a1 e 48d7a958, ma aveva controllato solo intestazione e titoli. L'ha corretto ed è annotato in quegli esiti; il caso è diventato LAY3-7.
- **Decisione ritirata**: il PM aveva lasciato l'intestazione a 375 fra le cose «da rivedere». L'utente ha deciso che era un difetto, ora LAY3-5.
