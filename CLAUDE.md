# CLAUDE.md — project-p5r

Istruzioni per qualsiasi IA (o persona) che apre questo repository. Leggere PRIMA di toccare il codice.

## Cos'è il progetto
Web app **FE + BE + SQLite**, compagno di gioco per **Persona 5 Royal**, usata da tablet, telefono e desktop durante la partita.
Porta in app la guida italiana completa (https://www.allgamestaff.it/persona-5-royal/indice/) e aggiunge funzioni proprie:
compendio Persona/Skill, motore di fusione (diretta, inversa, alberi ricorsivi, catene con bonus), tracciamento della partita
(Persona possedute, Confidenti, Doti sociali, denaro, oggetti, partite multiple), Diario giorno per giorno con gli effetti delle
voci, mappe interattive, risposte immediate (domande in classe, negoziazione).

**Tutto in italiano**: UI, API, nomi di tabelle e colonne, commenti, documentazione. I nomi delle Persona restano originali; i
nomi delle skill restano nella forma canonica del dataset (chiave inglese Royal) con resa italiana nella tabella `traduzione`.

## Documenti
- `README.md` — avvio, comandi, struttura, deploy.
- `docs/ARCHITETTURA.md` — com'è fatto il sistema oggi (stack, cartelle, flussi, DB, modello dei dati, istanze, deploy).
- `docs/DECISIONI.md` — le decisioni in vigore che spiegano il comportamento dell'app.
- `docs/ROADMAP.md` — cosa fa l'app per aree e punti aperti.
- `docs/riferimenti/` — conoscenza di dominio (meccaniche di gioco, fonti dei dati).
- `docs/grafica/` — prompt e regole per gli asset grafici in stile P5R.
- `pacchetto/README.md` — pacchetto iniziale e «Importa»; `NOTICE` e `licenze/` — attribuzioni.

Aggiornarli nello stesso cambiamento che li rende falsi, in forma attuale: niente cronache di lavorazione, la storia sta in git.
Dove documento e codice dissentono, vale il codice.

## Convenzioni tecniche
- **Fonte dei dati**: il DB dell'istanza. Le correzioni ai dati di gioco si applicano con migrazioni dirette e conservative.
  «Importa» sostituisce esplicitamente `gioco.db` con un backup scelto dalla cartella d'appoggio del server, dopo anteprima e
  conferma: non è un aggiornamento automatico né un'unione, e non tocca `partite.db`. I nomi tecnici `PacchettoGioco` e
  `/pacchetto` restano per compatibilità.
- **Boot del backend** (`server/index.ts`): `assicuraPacchettoIniziale` (al primo avvio copia `pacchetto/gioco.db`, senza
  immagini) → `initDb` (apre `gioco.db` e attacca `partite.db` come schema `utente`) → `runBootBackup` → `runMigrations` (due
  sequenze append-only: `server/db/migrations/` per il gioco, `server/db/migrazioniUtente/` per le partite, registrate nei
  rispettivi `index.ts`) → `regoleAllAvvio` → `listen`. Le migrazioni sono append-only: non si modificano quelle registrate.
- Route sottili in `server/routes/`, logica in `server/services/`, schemi zod in `server/schemas/`.
- Risposte API: successo `{ data }`, errore `{ error: { code, message, details? }, requestId }`; 404 JSON su `/api/*`.
- Frontend: pagine in `src/pages/`, componenti in `src/components/<area>/`, stato in `src/stores/` (zustand), chiamate in
  `src/services/api/` (barrel `index.ts`), tema in `src/tailwind.css` (token CSS-first, mai classi interpolate).
- Regole pure condivise in `shared/` (nessun import di Node, DB o DOM).
- Dati di gioco (`gioco.db`, con dentro tutte le immagini tranne compendio e `ui/`) e dati utente (`partite.db`, tabelle per
  `partita_id`) vivono in due file sulla stessa connessione: sostituire il DB di gioco non tocca l'avanzamento.
- Test con Vitest accanto ai sorgenti (`*.test.ts[x]`); typecheck `npm run typecheck` (`tsc -b tsconfig.full.json`); lint ESLint 10.

## Avvio rapido
```bash
npm install && cp .env.example .env
bash scripts/start-all.sh      # BE 3101 + FE 5273 (log in BE.log / FE.log)
bash scripts/restart-be.sh     # solo se il BE si è fermato: gira in `tsx watch` e si riavvia a ogni salvataggio in server/
                               # una migrazione nuova si applica subito ai dati di data/ (copia di avvio in data/backups)
npm run typecheck && npm run lint && npm run build
```

## Regole di lavoro

**Procedura**
- Prima di modificare: studiare il codice esistente e proporre la soluzione; implementare solo dopo il sì.
- Ogni consegna: typecheck, lint e build verdi, con l'exit code letto. Non dichiarare verificato il runtime se non è stato osservato.
- Zero test a carico dell'agente: non si scrivono né si lanciano test, né cicli di collaudo; le prove funzionali sono
  dell'utente. I test esistenti restano nel repository, non si cancellano e girano solo su richiesta (in locale
  `npx vitest run <percorso>`, in CI il workflow `test-su-richiesta.yml`).
- Verifica avversariale: ogni consegna la verifica un agente distinto, che legge la specifica originale e le istruzioni
  dell'utente, cerca scostamenti e controesempi con riferimenti verificabili e non modifica il codice. I rilievi si risolvono o
  si portano all'utente; un rilievo si porta all'utente solo con la prova nel codice. Il resoconto dell'implementatore o un
  controllo statico verde non bastano.
- Dopo un push si segue la pipeline fino all'esito. Un solo commit di codice e documenti a fine lavoro, non uno per ogni
  aggiornamento intermedio.
- Niente mockup, placeholder o regressioni senza autorizzazione esplicita dell'utente.
- Una domanda «è corretto che…» su una violazione di una regola è un difetto da correggere, non una richiesta di misure.
- «Fatto» solo dopo una verifica sistematica su tutti i dati e le pagine coinvolte, mai sul solo caso segnalato. Ottimizzare un
  modulo vuol dire censirlo per intero (testi liberi che contengono dati, meccanismi non modellati, interfaccia), mai un campione;
  non dire che un dato manca senza averlo cercato nei dati.
- Con più agenti sulla stessa copia: controllare il ramo corrente (`git branch --show-current`) prima di committare e non
  cambiare ramo nella copia condivisa; lavorare in un worktree proprio.
- Sorgenti, dati e documenti si modificano direttamente, non con script che riscrivono file.

**Interfaccia**
- Tre formati, ognuno ottimizzato: desktop ≥ 1024 px (sidebar), tablet 768–1023, telefono < 768 (barra inferiore). Si verifica
  a 1280, 768 e 375 di larghezza; «una schermata» si verifica alle altezze reali 1366×657, 1280×689, 1024×690.
- L'intestazione di una pagina occupa al più il 30% dell'altezza della schermata, a ogni formato.
- Scroll annidati da evitare; se servono, l'area interna ha un bordo visibile e `overscroll-behavior: contain`, e due barre non
  scorrono mai insieme.
- Bersagli touch ≥ 44 px (classe `.touch`); testo ≥ 12 px (11 px solo per i quattro segni fitti ammessi, vedi DECISIONI).
- Un testo visibile compare solo se informa.

**Dati**
- Un dato ha un solo punto di modifica, letto da tutte le viste; nessuna copia a frase. Gli stati della partita nascono dalla
  spunta del Diario, con annullo.
- L'app è per Persona 5 Royal: in caso di discrepanza prevale il dato Royal documentato; il dato superato resta come nota storica
  separata, senza medie né fusioni di versioni.
- Bonificare vuol dire consolidare i dati con migrazioni verificate; nessuna sezione di riconciliazione, proposta o conferma senza
  un sì esplicito dell'utente. Le migrazioni non distruggono il lavoro validato dall'utente (Diario validato, Palazzi completati).
- Due voci del Diario sono la stessa solo con stesso testo, stessi pin e stessa infiltrazione; le fusioni solo su elenco approvato.
- Prove sui dati reali: su una partita di prova creata apposta o su una copia, con il confronto prima di ogni ripristino; mai
  ripristinare alla cieca. Le verifiche si scrivono con conteggi e id, non a parole. I dati di prova si tolgono dopo.
- Le immagini vivono in `gioco.db`, tranne quelle del compendio e di `ui/` (in `public/asset/`). Nessuna immagine ufficiale del
  gioco nel repository.
- Le Doti sociali si applicano solo a mano, con promemoria. Gli yen delle voci si muovono da soli secondo le regole in DECISIONI;
  i soldi delle battaglie e delle vendite nei Palazzi restano manuali.

**Operazioni e sicurezza**
- La produzione si guarda soltanto: nessuna scrittura, nessuna preferenza o `localStorage` cambiati, nemmeno ripristinati. Le
  prove con impostazioni diverse si fanno sull'istanza locale. Un recupero di dati dalla produzione si fa su copia e si scrive solo
  dopo il sì dell'utente.
- Non avviare, fermare o riavviare servizi funzionanti che non sono del proprio lavoro; nessuna prova in scrittura sui dati
  dell'utente.
- Repository pubblico: nei file e nei messaggi di commit niente indirizzi di server, domini, percorsi di chiavi, email, token, nomi
  utente o dati personali; nei controlli si scrive «email dell'utente». Non si committano database né dati d'istanza (`data/` è
  ignorata).
- Ogni cambiamento strutturale aggiorna `docs/ARCHITETTURA.md`, `docs/DECISIONI.md` e `docs/ROADMAP.md`, in forma attuale.
