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
| 0.5 | Frontend: Compendio (232 Persona, filtri, scheda completa con immagine), Skill (525, filtri per elemento, scheda), Fusione (regole degli Arcani), Partita (selettore in Topbar, Doti a note con rango e punti mancanti, Confidenti con rango, punti verso il rango successivo e immagini di personaggio e arcano, scorta con skill/statistiche, compendio personale, riepilogo con Allarme), Impostazioni (partite, immagini degli Arcani, editor traduzioni); tablet/mobile/desktop | ✅ 2026-09-03 |
| 0.6 | Prompt per TUTTI gli asset grafici in stile P5R, testi in italiano, link di ispirazione (`docs/grafica/prompt-immagini.md`) — anticipato su richiesta | ✅ 2026-09-03 |
| 0.7 | Chiusura Fase 0: test FE componenti (DotiSociali, ConfidentiPartita, Modal, ImmagineEntita, utilità punti) e BE (meccaniche pure note→punti/ranghi, import immagini da URL con server locale) — 14 file / 62 test; typecheck, lint, build; verifica runtime in produzione (migrazione 004 e reseed applicati, tablet/mobile/desktop) | ✅ 2026-09-03 |
| 0.8 | Grafica predefinita: manifest automatico degli asset in `public/asset/` (plugin Vite, dev e build), preferenza "usa grafica predefinita" (attiva di default) in Impostazioni, catena immagine utente → asset predefinito → segnaposto testuale in OGNI punto (Persona, Arcani, Confidenti, elementi, affinità, doti, navigazione, badge rango, sfondi, stati vuoti); l'app resta perfettamente funzionante senza alcun asset; | ✅ 2026-09-03 |
| 0.9 | Catalogo dei riferimenti importabile nella propria istanza (link alle immagini di Arcani, Confidenti e Persona reperite sul wiki; nessun file protetto nel repo): importazione in blocco dalle Impostazioni con rapporto esiti, senza sovrascrivere le immagini caricate dall'utente | ✅ 2026-09-03 |
| 0.10 | Qualità visiva e statistiche: immagini grandi senza ritagli con ingrandimento al tocco e comandi di caricamento nella finestra (card Confidenti, scheda Persona, scorta, compendio, Impostazioni); statistiche che crescono col livello (+3 punti/livello dal dataset, `shared/statistiche.ts`) con barre leggibili (nome, tacche, totale) e cursore del livello nella scheda Persona; stima nella scorta finché l'utente non registra i valori reali | ✅ 2026-09-03 |
| 0.11 | Glossario di localizzazione dalla guida allgamestaff (`persona-5-royal/*`: sistema di battaglia, Ombre Sciagura, Demoni del Tesoro, come ottenere tutte le Personae, indice): termini italiani ufficiali del gioco, nomi italiani di Persona ed elementi di guida da integrare nelle traduzioni e nei moduli | ✅ 2026-09-03 |

## Fase 1 — Motore di fusione diretta e inversa + UI calcolatore
| Step | Contenuto | Stato |
|---|---|---|
| 1.1 | Motore (`server/services/fusione/motoreFusione.ts`, regole chinhodado): fusione A+B normale, stesso arcano, Demone del Tesoro, speciale; ricette per ottenere una Persona (inversa completa) e fusioni con una Persona; contesto DLC (dalla partita o esplicito); costo stimato; API `/api/fusione/fondi`, `/ricette/:id`, `/con/:id` con filtro livello e limite; test di coerenza diretta↔inversa su tutto il compendio | ✅ 2026-09-03 |
| 1.2 | UI: Fusione → Calcolatore A + B, Come ottenere, Fusioni con… (ricerca per nome italiano/canonico/arcano, evidenza della scorta, filtro al livello del protagonista, «Mostra altre»); sezione Fusione nella scheda Persona con le 5 ricette più economiche e i collegamenti | ✅ 2026-09-03 |

## Fase 2 — Albero di fusione ricorsivo
| Step | Contenuto | Stato |
|---|---|---|
| 2.1 | Motore `alberoFusione.ts`: piani ricorsivi verso il bersaglio con foglie scorta (gratis, un esemplare una volta), Registro (prezzo di evocazione 27L²+126L+2147), cattura (livello ≤ protagonista); stima ottimistica per programmazione dinamica + ricerca in profondità con potatura; vincoli di profondità, livello e DLC; ricette speciali a più ingredienti; N alternative distinte ordinate per costo; API `GET /api/fusione/piani/:id` (partita, profondita, alternative, catture, limitaLivello); test | ✅ 2026-09-03 |
| 2.2 | UI: vista «Piano di fusione» (bersaglio, profondità, alternative, catture, limite di livello) con albero rientrato e legenda; link «Piano di fusione →» dalla scheda Persona | ✅ 2026-09-03 |

## Fase 3 — Eredità skill e ricerca per skill desiderate
| Step | Contenuto | Stato |
|---|---|---|
| 3.1 | Modulo `eredita.ts` (regole P5/P5R dal wiki e dalla guida): slot dal totale skill dei genitori (3–5→1 … 42→8, uno casuale), matrice tipo × elemento (supporto/passive/quasi-divine sempre, arma da fuoco = fisico), skill esclusive escluse, bacino = skill della scorta se possedute altrimenti innate + apprese al livello, tratti (uno fra ingredienti e proprio); API `GET /api/fusione/eredita?a&b&partita&livelloA&livelloB` e `GET /api/fusione/cerca-skill?skill≤4&risultato&partita&livelloMax` (ricette che consentono tutte le skill: bacino, compatibilità, slot); test | ✅ 2026-09-03 |
| 3.2 | UI: pannello «Eredità delle skill» nel calcolatore (slot, bacino per ingrediente, ereditabili/escluse con motivo, tratti); vista «Cerca per skill» (fino a 4 skill, risultato facoltativo, limite di livello, elenco per Persona e ricette con «Apri nel calcolatore») | ✅ 2026-09-03 |

## Fase 4 — Catene/cicli e ottimizzatore dei bonus
| Step | Contenuto | Stato |
|---|---|---|
| 4.1 | Propagazione delle skill a catena nei piani di fusione: skill richieste sul bersaglio (≤ 4) propagate a ogni fusione (tipo di eredità compatibile, slot a scelta sufficienti — opzione «Conta lo slot casuale», ripartizione fra gli ingredienti che possono portarle, insieme raggiungibile per profondità) fino alle foglie che le possiedono (scorta con skill reali, innate al livello base, apprese salendo di livello segnalate «↑»); API `piani?skill=…&slotFortunato`; selettore skill e badge per nodo nella vista «Piano di fusione»; test | ✅ 2026-09-03 |
| 4.2 | Bonus della Stanza di Velluto: bonus EXP del Confidente per rango dell'arcano, Allarme delle fusioni (statistiche/skill/oggetti «R», incidenti), Forca/Potenziamento (EXP dal sacrificio, Demoni del Tesoro), Isolamento con incenso, sconti del Registro e sblocchi delle Gemelle — regole numeriche da fonti verificate, applicate nei piani e nel calcolatore | ⬜ |

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
