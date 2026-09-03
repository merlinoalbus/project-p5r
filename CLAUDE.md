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
- `docs/ARCHITETTURA.md` — com'è fatto il sistema (stack, cartelle, flussi, DB, seed, deploy)
- `docs/ROADMAP.md` — fasi/step con stato (fatto / in corso / da fare) e criteri di completamento
- `docs/DECISIONI.md` — registro delle decisioni prese con l'utente (data + motivazione)
- `docs/riferimenti/` — conoscenza di dominio (meccaniche di gioco, mappa dei moduli della guida)
- `docs/grafica/` — prompt per la generazione degli asset grafici in stile P5R (dallo step 0.6)
- `NOTICE` — attribuzioni delle fonti dati (Apache-2.0) (dallo step 0.2)

## Convenzioni tecniche (ereditate da project-jira, stesso autore)
- Backend: `server/index.ts` → `initDb` → `runBootBackup` → `runMigrations` → `caricaSeed` → `listen`.
  Route sottili in `server/routes/`, logica in `server/services/`, schemi zod in `server/schemas/`,
  migrazioni append-only in `server/db/migrations/` registrate in `index.ts`.
- Risposte API: successo `{ data }`, errore `{ error: { code, message, details? }, requestId }`; 404 JSON su `/api/*`.
- Frontend: pagine in `src/pages/`, componenti in `src/components/<area>/`, stato in `src/stores/` (zustand),
  chiamate in `src/services/api/` (barrel `index.ts`), tema in `src/tailwind.css` (token CSS-first, mai classi interpolate).
- Layout adattivo: sidebar da 1024px in su, barra inferiore sotto; bersagli touch ≥ 44px (classe `.touch`).
- Dati di gioco (rigenerabili dal seed) e dati utente (per `partita_id`) vivono in tabelle SEPARATE.
- Test con Vitest accanto ai sorgenti (`*.test.ts[x]`); typecheck `tsc -b tsconfig.full.json`; lint ESLint 9.

## Procedura di lavoro obbligatoria
1. Studiare il codice esistente e proporre la soluzione prima di implementare.
2. Ogni step della roadmap, una volta completato, va sottoposto al **galaxy-task-validator** (agent di sola
   verifica, autorità pari all'utente). Senza APPROVATO non si passa allo step successivo.
3. Ogni modifica: typecheck + lint + test verdi, verifica runtime (BE/FE avviati, controllo nel browser), nessuna regressione.
4. Aggiornare `docs/ROADMAP.md` (stato) e, se cambia qualcosa di strutturale, `docs/ARCHITETTURA.md` / `docs/DECISIONI.md`.
5. Niente mockup, placeholder o regressioni senza autorizzazione esplicita dell'utente.

## Avvio rapido
```bash
npm install && cp .env.example .env
bash scripts/start-all.sh      # BE 3101 + FE 5273 (log in BE.log / FE.log)
bash scripts/restart-be.sh     # dopo ogni modifica in server/ (non c'è hot reload lato BE)
npm run typecheck && npm run lint && npm test
```
