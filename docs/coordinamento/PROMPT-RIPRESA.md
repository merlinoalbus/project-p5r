# Prompt di ripresa (da incollare in una nuova sessione, in qualunque punto si sia interrotto il lavoro)

---

Riprendi il lavoro sul progetto project-p5r, ramo `newreview` (repository https://github.com/merlinoalbus/project-p5r), pubblicato su https://p5s.nasmerlinoalbus.cloud. Rispondi sempre in italiano.

**1. Ricostruisci lo stato prima di fare qualunque cosa.** Non fidarti della memoria della conversazione: fidati solo dei file e di git.
- Esiste **un solo ramo di lavoro: `newreview`**. Fai `git fetch`, passa a `newreview`, leggi `git log --oneline -30` e `git status`. Ogni push su `newreview` pubblica su p5s e applica le migrazioni ai dati dell'utente. `main` non si tocca.
- Leggi in quest'ordine:
  1. `CLAUDE.md`;
  2. `docs/coordinamento/STATO-ATTUALE.md`, a partire dalla sezione «Regole in vigore»;
  3. `docs/coordinamento/richieste-utente-aperte.md`, le richieste dell'utente non ancora soddisfatte;
  4. tutto `docs/coordinamento/memoria-del-progetto/`: sono regole dell'utente e valgono come istruzioni;
  5. `docs/coordinamento/stato.json` (la Regia), `decisioni-pm.md`, `bacheca.md`;
  6. la cartella del lotto in corso, `docs/coordinamento/lotti/Lx/`: requisiti, modifiche, piano, difetti;
  7. `docs/ROADMAP.md`, `docs/DECISIONI.md`, `docs/ARCHITETTURA.md`.
- Confronta quanto dicono i documenti con git e con il codice. Se divergono, vale il codice: segnalalo e aggiorna i documenti.

**2. Riassumi all'utente in poche righe dove si era rimasti**: lotto in corso, ultimo commit pubblicato, esito dell'ultima pipeline, richieste aperte, prossimo passo. Poi procedi senza fermarti. All'utente chiedi solo le decisioni che spettano a lui.

**3. Lavora con queste regole** (il dettaglio è nella memoria del progetto):
- **Dati:**
  - `main` e la produzione persona5royal non si toccano;
  - p5s contiene i dati dell'utente e non si sovrascrive mai;
  - una migrazione non distrugge il lavoro da preservare: diario fino al 1° giugno, Kamoshida, Madarame.
- **Codice:**
  - prima si studia il codice esistente, poi si modifica direttamente, mai con script o sed sui sorgenti;
  - typecheck (`npm run typecheck`) e lint (`npm run lint`) devono essere verdi.
- **Zero test**: l'utente li fa da solo. Niente tester, collaudo né validatore, e niente test da scrivere o lanciare.
- **Interfaccia:**
  - pensata per desktop, tablet e telefono (1366×657, 1280×689, 1024×690, 1920×1080, 768, 375);
  - una sola barra di scorrimento;
  - intestazione al massimo al 30% della schermata;
  - grafica come l'originale, opacità al 100%.
- **Mai dichiarare completo** qualcosa che non soddisfa per intero le richieste dell'utente in `richieste-utente-aperte.md`. Mai restringere o rinviare una richiesta dell'utente senza chiederglielo.
- **Pubblicazione:** commit e push su `newreview`, poi segui la pipeline fino all'esito e guarda p5s nel browser.
- **Salvataggi:**
  - tutto il lavoro va su git: codice, `docs/coordinamento/` (Regia `stato.json`, `STATO-ATTUALE.md`, richieste aperte, difetti);
  - mai dati personali (compresa l'email dell'utente), copie di database, schermate, indirizzi di server o chiavi: il repository è pubblico.
- **Regia:** `docs/coordinamento/stato.json`, mostrata da `docs/coordinamento/regia/server.cjs` su localhost:5999. Va tenuta aggiornata.

**4. Salvataggi e pubblicazione (ultima decisione dell'utente):** aggiorna localmente `STATO-ATTUALE.md`, `richieste-utente-aperte.md` e `stato.json` durante il lavoro. Completa un lotto intero; soltanto alla fine fai commit e push su `newreview` di codice e coordinamento insieme, poi segui la pipeline e guarda p5s. Niente commit o pipeline per ogni aggiornamento intermedio dei documenti.

---
