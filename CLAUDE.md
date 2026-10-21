# CLAUDE.md — project-p5r

Istruzioni per qualsiasi IA (o persona) che apre questo repository. Leggere PRIMA di toccare il codice.

## Cos'è il progetto
Web app locale **FE + BE + SQLite**, "compagno di gioco" per **Persona 5 Royal**, usata da **tablet e cellulare
durante la partita**. Obiettivo dichiarato dall'utente: trasformare in app la guida italiana completa
(https://www.allgamestaff.it/persona-5-royal/indice/), arricchita con funzionalità ad hoc:
compendio Persona/Skill, **motore di fusione** (diretta, inversa, alberi ricorsivi, catene con bonus),
tracking della partita (Persona possedute con skill/livelli, Confidenti con rango e risposte migliori,
Doti sociali con pulsanti di incremento, partite multiple), risposte immediate (domande in classe, scelte nei dialoghi).

**Tutto in italiano**: UI, API, nomi di tabelle/colonne, commenti, documentazione. I nomi delle Persona restano
originali (nomi propri); i nomi delle skill restano nella forma canonica del dataset (chiave EN) con resa
italiana tramite la tabella `traduzione`.

## Documenti di bordo (tenerli aggiornati a ogni step)
- **`docs/coordinamento/STATO-ATTUALE.md` — DA LEGGERE PER PRIMO per riprendere il lavoro del ramo `newreview`** (lotti fatti e in corso,
  punti aperti, regole dell'utente, come ripartire); sotto `docs/coordinamento/` c'è tutto il coordinamento del team (Regia, bacheca,
  lotti, decisioni, memoria del progetto)
- `docs/ARCHITETTURA.md` — com'è fatto il sistema (stack, cartelle, flussi, DB, pacchetto di gioco, deploy)
- `docs/ROADMAP.md` — fasi/step con stato (fatto / in corso / da fare) e criteri di completamento
- `docs/DECISIONI.md` — registro delle decisioni prese con l'utente (data + motivazione)
- `docs/riferimenti/` — conoscenza di dominio (meccaniche di gioco, mappa dei moduli della guida)
- `docs/grafica/` — prompt per la generazione degli asset grafici in stile P5R (dallo step 0.6)
- `NOTICE` — attribuzioni delle fonti dati (Apache-2.0) (dallo step 0.2)

## Convenzioni tecniche (ereditate da project-jira, stesso autore)
**Regola attuale dei dati (2026-10-21):** la fonte è il DB dell'istanza, non un pacchetto esterno. Le correzioni si applicano con migrazioni dirette e conservative. «Importa» resta per la sostituzione esplicita di `gioco.db` con un backup locale scelto dalla cartella d'appoggio del server, dopo anteprima e conferma; non è un aggiornamento automatico né un'unione. `partite.db` non viene sostituito da quel comando. I nomi tecnici `PacchettoGioco` e `/pacchetto` restano per compatibilità con l'implementazione esistente. I riferimenti al pacchetto completo qui sotto descrivono il vecchio flusso iniziale, non autorizzano a sovrascrivere i dati di p5s.

- Backend: `server/index.ts` → `assicuraPacchettoIniziale` (al primo avvio copia `pacchetto/gioco.db`, in git, senza immagini: l'interfaccia si apre; il pacchetto COMPLETO — stesso nome, `pacchetto/completo/gioco.db`, ~311 MB con le immagini, fuori da git — si carica SEMPRE dall'app, dalla cartella d'appoggio (`DEPOSITO_DIR`: Impostazioni → Pacchetto di gioco), e sostituisce il file dell'istanza; vedi `pacchetto/README.md`) → `initDb` (apre `gioco.db` e attacca `partite.db` come schema `utente`) → `runBootBackup` → `runMigrations` (due sequenze: `db/migrations/` per i dati di gioco, `db/migrazioniUtente/` per le partite) → `regoleAllAvvio` → `listen`. Non esiste più un seed JSON: i dati di gioco vivono in `gioco.db` e si aggiornano con import/export del pacchetto.
  Route sottili in `server/routes/`, logica in `server/services/`, schemi zod in `server/schemas/` (cartelle create dallo step 0.4),
  migrazioni append-only in `server/db/migrations/` registrate in `index.ts`.
- Risposte API: successo `{ data }`, errore `{ error: { code, message, details? }, requestId }`; 404 JSON su `/api/*`.
- Frontend: pagine in `src/pages/`, componenti in `src/components/<area>/`, stato in `src/stores/` (zustand),
  chiamate in `src/services/api/` (barrel `index.ts`), tema in `src/tailwind.css` (token CSS-first, mai classi interpolate).
- Layout adattivo: sidebar da 1024px in su, barra inferiore sotto; bersagli touch ≥ 44px (classe `.touch`).
- Dati di gioco (`gioco.db`, dal pacchetto: con dentro anche tutte le immagini che non sono del compendio né di `ui/`) e dati utente (`partite.db`, tabelle per `partita_id`) vivono in DUE FILE separati sulla stessa connessione: sostituire il DB di gioco non tocca l'avanzamento.
- Test con Vitest accanto ai sorgenti (`*.test.ts[x]`); typecheck `tsc -b tsconfig.full.json`; lint ESLint 10.

## Procedura di lavoro obbligatoria
**Mandato corrente del 21 ottobre:** dopo l'audit l'utente ordina la bonifica e il rilascio di tutti i difetti, il completamento delle implementazioni parziali e poi L8–L11. I tre piani correttivi L5/L6, L7 e Diario sono approvati dal revisore distinto; implementazione in corso, codice finale ancora da riesaminare. Le dipendenze richiedono un rilascio integrato L5–L7 completo. Il precedente perimetro audit-only è superato. Il prompt diretto chiede commit/push alla fermata con codice e coordinamento: nessuna migrazione respinta si pubblica per salvare una bozza.

1. Studiare il codice esistente e proporre la soluzione prima di implementare.
2. **Zero test**: niente test nuovi/eseguiti né cicli di collaudo; le prove funzionali sono dell'utente. Dal 2026-10-21 ogni consegna deve essere verificata da un **agente distinto in modo avversariale**, accedendo direttamente alla specifica originale e alle successive istruzioni dell'utente. Il revisore cerca scostamenti e controesempi, confronta specifica e codice con riferimenti verificabili, dichiara copertura e limiti ed emette un esito motivato; non modifica il codice. Non basta il resoconto dell'implementatore né un controllo statico verde. I rilievi impediscono di dichiarare verificata la consegna finché risolti o sottoposti all'utente. La nuova disposizione supera il precedente divieto di verificatori, non il divieto di test. Vale anche per l'audit richiesto su L5, L6 e L7. Dettaglio: `docs/coordinamento/memoria-del-progetto/feedback-verifica-avversariale.md`.
3. Ogni modifica: typecheck + lint verdi, build senza errori; non dichiarare verificato il runtime se non è stato osservato. Non avviare, fermare o riavviare altri servizi funzionanti. Non fare prove in scrittura sui dati dell'utente. A fine lotto: unico commit/push di codice e coordinamento su `newreview`, seguire la pipeline fino all'esito e aprire p5s nel browser. Nessun commit/pipeline per ogni aggiornamento documentale.
4. Aggiornare `docs/ROADMAP.md` (stato) e, se cambia qualcosa di strutturale, `docs/ARCHITETTURA.md` / `docs/DECISIONI.md`.
5. Niente mockup, placeholder o regressioni senza autorizzazione esplicita dell'utente.

## Lavoro in parallelo con altre sessioni/IA
Nel repository possono lavorare più agenti (es. Codex sul branch `codex/asset-grafici-alfa` per gli asset grafici).
Regole: (1) verificare SEMPRE `git branch --show-current` prima di committare; (2) non fare checkout di branch altrui
nella working copy condivisa; (3) per lavorare su `main` usare il worktree dedicato `C:\Repository\project-p5r-main`
(`git worktree list`), che ha i propri `node_modules` e `.env`; (4) gli asset generati vanno in `public/asset/…` e
si integrano su `main` tramite merge del branch di produzione asset.

## Avvio rapido
```bash
npm install && cp .env.example .env
# pacchetto/gioco.db (iniziale, in git) serve al primo avvio e ai test; il completo (pacchetto/completo/gioco.db, immagini dentro) si importa dall'app
bash scripts/start-all.sh      # BE 3101 + FE 5273 (log in BE.log / FE.log)
bash scripts/restart-be.sh     # solo se il BE si è fermato: gira in `tsx watch` e si riavvia da solo a ogni salvataggio in server/
                               # ATTENZIONE: una migrazione nuova si applica subito ai dati di data/ (con la copia di avvio in data/backups)
npm run typecheck && npm run lint
# Zero test nella ripresa corrente: i controlli funzionali spettano all'utente.
```
