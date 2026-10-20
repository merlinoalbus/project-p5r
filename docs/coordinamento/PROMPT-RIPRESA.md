# Prompt di ripresa (da incollare in una nuova sessione, in qualunque punto si sia interrotto il lavoro)

---

Riprendi il lavoro sul progetto project-p5r, ramo `newreview` (repository https://github.com/merlinoalbus/project-p5r), pubblicato su https://p5s.nasmerlinoalbus.cloud. Rispondi sempre in italiano.

**1. Ricostruisci lo stato prima di fare qualunque cosa.** Non fidarti della memoria della conversazione: fidati solo dei file e di git.
- Fai `git fetch` e guarda tre rami:
  - `newreview`: è quello pubblicato su p5s; ogni push qui pubblica e migra i dati dell'utente;
  - `newreview-lavoro`: il lavoro di sviluppo non ancora validato;
  - `newreview-l3` (o `newreview-lN`): la linea di rilascio del lotto in collaudo.
  Leggi `git log --oneline -30` di ciascuno e `git status`. Lavora su una copia di `newreview-lavoro`. Su `newreview` pusha solo una linea di rilascio APPROVATA dal validatore.
- Leggi in quest'ordine:
  1. `CLAUDE.md`;
  2. `docs/coordinamento/STATO-ATTUALE.md`;
  3. `docs/coordinamento/memoria-del-progetto/`, tutti i file: sono regole dell'utente e valgono come istruzioni;
  4. `docs/coordinamento/processo.md`, `bacheca.md`, `decisioni-pm.md`, `stato.json`;
  5. `docs/ROADMAP.md`, `docs/DECISIONI.md`, `docs/ARCHITETTURA.md`.
- Individua il lotto in corso: è il primo che in `stato.json` non ha tutte le fasi «fatta». Leggi la sua cartella `docs/coordinamento/lotti/Lx/`: requisiti, modifiche, piano, difetti, esiti, gli ultimi `correzioni-giro*.md` e `validatore-giro*-prompt.md`.
- Confronta quanto dicono i documenti con quanto dicono git e il codice. Se divergono, vale il codice: segnalalo e aggiorna i documenti.

**2. Riassumi all'utente in poche righe dove si era rimasti.** Elenca:
- il lotto in corso e la fase;
- l'ultimo commit pubblicato;
- l'esito dell'ultima pipeline;
- i punti aperti;
- il prossimo passo che proponi.

Poi procedi senza fermarti. Chiedi all'utente solo le decisioni che spettano a lui.

**3. Lavora con queste regole** (il dettaglio è nella memoria del progetto):
- **Dati:**
  - `main` e la produzione persona5royal non si toccano;
  - p5s contiene i dati dell'utente e non si sovrascrive mai;
  - le prove sui dati si fanno su copie.
- **Modifiche al codice:**
  - si fanno direttamente, mai con script o sed sui sorgenti;
  - typecheck (`npm run typecheck`) e lint (`npm run lint`) devono essere verdi;
  - test solo mirati (`npx vitest run <percorso>`);
  - ogni correzione ha un test visto rosso prima e verde dopo.
- **Interfaccia:**
  - da verificare nel browser a 1366×657, 1280×689, 1024×690, 1920×1080, 768 e 375;
  - una sola barra di scorrimento;
  - grafica come l'originale.
- **Validazione:**
  - chi implementa non si convalida da solo;
  - a fine lotto lancia il galaxy-task-validator, in sola lettura, con un prompt che dica dove sono codice e prove;
  - correggi e ripeti finché non approva.
- **Dopo l'APPROVATO:**
  - commit dei documenti di chiusura;
  - push su `newreview`;
  - segui la pipeline fino all'esito;
  - verifica p5s nel browser.
- **Salvataggi:**
  - salva su git tutto il lavoro: codice, documenti, aggiornamenti di `docs/coordinamento/` (Regia `stato.json`, `STATO-ATTUALE.md`, difetti, esiti);
  - fai commit a ogni passaggio importante e copia su GitHub nei rami `newreview-lavoro` e `newreview-lN`, che non pubblicano: così nessun lavoro resta solo in memoria e niente di non validato arriva su p5s;
  - non pubblicare mai dati personali, copie di database, indirizzi di server o chiavi: il repository è pubblico.
- **Sessioni di prova:** se usi sessioni separate (tester, collaudo), aprile una alla volta e chiudile a fine compito.
- **Regia:** tienila aggiornata (`docs/coordinamento/stato.json`; il server `docs/coordinamento/regia/server.cjs` la mostra su localhost:5999).

**4. Ogni volta che ti fermi:**
- aggiorna `docs/coordinamento/STATO-ATTUALE.md`: cosa è fatto, cosa è in corso, punti aperti, prossimo passo;
- aggiorna `stato.json`;
- fai commit e copia su GitHub in `newreview-lavoro`. Su `newreview` solo dopo l'APPROVATO.

---
