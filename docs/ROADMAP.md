# Roadmap — project-p5r

Legenda stato: ✅ fatto e validato · 🔄 in corso · ⏳ fatto, in attesa di validazione · ⬜ da fare.
Ogni step si chiude solo con il verdetto **APPROVATO** del galaxy-task-validator (vedi `CLAUDE.md`).

## Fase 0 — Scaffold + compendio consultabile + tracking partita
| Step | Contenuto | Stato |
|---|---|---|
| 0.1 | Scaffold: config, BE (Express+SQLite, middleware, migrazioni, backup), FE tablet-first (layout, tema P5R), script server, Docker, CI/CD GHCR, docs di bordo, repo GitHub pubblico e deploy in produzione (tunnel Cloudflare) | ✅ 2026-09-03 |
| 0.2 | Dataset Royal: download fissato (chinhodado + aqiu384, manifest sha256), normalizzazione in `data/seed/*.json`, traduzione italiana al 100% (effetti, oggetti, negoziazioni, fonti carta), correzioni documentate (nomi Royal), verifica incrociata con arbitrato di terza fonte, `NOTICE`, test | ✅ 2026-09-03 |
| 0.3 | Schema DB: migrazioni 001 (dati di gioco + traduzioni + seed_meta) e 002 (partite multiple, tracking, immagini); `caricaSeed` idempotente al boot con id stabili e traduzioni utente protette; 23 Confidenti nel seed; test su DB in memoria; migrazione 003 con indici per il motore di fusione | ✅ 2026-09-03 |
| 0.4 | API: compendio (arcani, glossario, regole di fusione, Persona con filtri e scheda completa, skill, oggetti, Confidenti), traduzioni (elenco, modifica utente, ripristino seed), partite (CRUD, attiva unica, Doti sociali ±, Confidenti con rango, compendio personale, Persona possedute con skill/statistiche), immagini (caricamento, import da URL), errori Express in italiano — 40 test | ✅ 2026-09-03 |
| 0.5 | Frontend: Compendio (232 Persona, filtri, scheda completa con immagine), Skill (525, filtri per elemento, scheda), Fusione (regole degli Arcani), Partita (selettore in Topbar, Doti +/−, Confidenti con rango e immagini, scorta con skill/statistiche, compendio personale, riepilogo con Allarme), Impostazioni (partite, immagini degli Arcani, editor traduzioni); tablet/mobile/desktop | ⏳ |
| 0.6 | Prompt per TUTTI gli asset grafici in stile P5R, testi in italiano, link di ispirazione (`docs/grafica/prompt-immagini.md`) — anticipato su richiesta | ✅ 2026-09-03 |
| 0.7 | Test (BE route + motore + FE componenti), typecheck, lint, build, verifica runtime tablet/mobile/desktop | ⬜ |

## Fase 1 — Motore di fusione diretta e inversa + UI calcolatore
⬜ tabella arcana, fusione A+B (speciale/rara/normale), ricette che producono una Persona, filtri (DLC posseduti, cap livello), UI.

## Fase 2 — Albero di fusione ricorsivo
⬜ dal compendio personale/Persona catturabili fino al target; branch-and-bound su costo, profondità, livello; UI ad albero.

## Fase 3 — Eredità skill e ricerca per skill desiderate
⬜ matrice tipo-eredità × elemento, numero di slot, ricette che consentono un set di skill; tratti.

## Fase 4 — Catene/cicli e ottimizzatore dei bonus
⬜ propagazione skill a catena, bonus EXP del Confidente (arcano risultante), Allarme delle fusioni, Potenziamento/Forca (cicli con Demoni del Tesoro), Addestramento, qualsiasi altro bonus documentato.

## Fase 5 — Tracking partita avanzato
⬜ Persona possedute con statistiche potenziate, livelli skill, obiettivi, piani salvati, storico.

## Fasi successive (dalla mappa della guida, `docs/riferimenti/mappa-moduli-guida.md`)
⬜ 6 Confidenti completi (risposte migliori per rango, regali, disponibilità) · Domande in classe/esami · Calendario
⬜ 7 Dungeon (Palazzi, Dedali, Richieste) · Aiuto in battaglia (debolezze, danno tecnico, negoziazione)
⬜ 8 Inventario (negozi, oggetti, armi, accessori, abiti) · Attività (mini-giochi, lavori, libri, DVD)
⬜ 9 Trofei, finali, Covo dei Ladri

## Requisiti trasversali (sempre validi)
- Tutto in italiano; nomi Persona originali; skill con chiave canonica + resa IT modificabile.
- Tablet-first ma **anche mobile** (375px) e desktop.
- Partite multiple con partita attiva selezionabile.
- Dati di gioco e dati utente separati; seed nell'immagine Docker, DB sul volume.
