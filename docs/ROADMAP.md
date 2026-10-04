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
| 0.6 | Prompt per TUTTI gli asset grafici in stile P5R, testi in italiano, link di ispirazione (`docs/grafica/prompt-immagini.md` (solo asset da consegnare; consegnati in `docs/grafica/archivio-grafico.md`)) — anticipato su richiesta | ✅ 2026-09-03 |
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
| 4.2 | Bonus della Stanza di Velluto (`shared/bonusVelluto.ts`, regole da fonti verificate in `docs/riferimenti/bonus-velluto.md`): sconto del Registro per completamento del compendio (25/50/75/100% → 10/15/25/50%) applicato ai costi di ricette, fusioni e piani; bonus EXP del Confidente per arcano del risultato (×1,15…×3) nel calcolatore; interruttore «Allarme delle fusioni» salvato nella partita con gli effetti documentati; sblocchi delle Gemelle per rango (Trattamento speciale = fusione sopra livello); vista «Forca e Isolamento» (moltiplicatori della Forca con rango/Igor/stesso arcano/Tesoro/Allarme/penalità, sacrifici ordinati; Isolamento con incensi, giorni per rango, tier di resistenza per livello); API `GET /api/fusione/velluto?partita` | ✅ |

## Fase 5 — Tracking partita avanzato
Persona possedute con statistiche potenziate e skill (già in Fase 0), più: storico, obiettivi, piani salvati, esecuzione delle operazioni della Stanza di Velluto dalla scorta.

| Step | Contenuto | Stato |
|---|---|---|
| 5.1 | Storico della partita: migrazione 005 `evento_partita`; ogni modifica di tracking registra un evento in italiano (partita creata, livello del protagonista, Allarme, rango Dote, sblocco/rango Confidente, registrazione nel compendio, Persona aggiunta/livello/skill/statistiche/rimossa; tipi già previsti per fusioni, Forca, Isolamento, obiettivi e piani); `GET /api/partite/:id/storico` (filtri per tipi e Persona, cursore, totale) e `DELETE …/storico/:eventoId`; scheda «Storico» con filtri per gruppo e «Carica altri»; ultimi eventi nel Riepilogo; campo `origine` all'aggiunta in scorta | ✅ |
| 5.2 | Obiettivi: migrazione 006 `obiettivo_partita` (un solo obiettivo aperto per Persona); Persona da ottenere con skill desiderate (mai tratti, max 8), livello minimo, priorità e note; stato aperto/raggiunto/annullato con chiusura automatica quando una copia posseduta soddisfa skill e livello (all'aggiunta/aggiornamento in scorta e alla creazione); avanzamento calcolato sulla scorta (skill mancanti ✓/✗, livello); eventi «obiettivo creato/raggiunto» nello storico; API `GET/POST /api/partite/:id/obiettivi`, `PUT/DELETE …/obiettivi/:obiettivoId`; scheda «Obiettivi» con filtri per stato, modale di creazione/modifica, collegamenti a piano di fusione (con le skill) e ricette; «Aggiungi agli obiettivi» nella scheda Persona | ✅ |
| 5.3 | Piani salvati: migrazione 007 `piano_salvato` (istantanea dell'albero con opzioni e skill, titolo, note, obiettivo facoltativo con coerenza sulla Persona); avanzamento ricalcolato a ogni lettura sulla scorta (foglie in scorta, fusioni già fatte, passi eseguibili adesso con collegamento al calcolatore, completamento); API `GET/POST /api/partite/:id/piani`, `PUT/DELETE …/piani/:pianoId`; «Salva piano» nella vista «Piano di fusione» (legato all'obiettivo se si arriva da lì); scheda «Piani salvati» con albero evidenziato sulla scorta, rinomina, ricalcolo ed eliminazione; conteggio dei piani nell'obiettivo; evento «piano salvato» nello storico | ✅ |
| 5.4 | Esecuzione dalla scorta: `operazioniVellutoService` — anteprima della fusione (risultato, livello suggerito = base + bonus del Confidente per rango del Matto/arcano, skill ereditabili e slot, tratti, punti dell'Allarme 15/20/25 secondo le Persona «cariche») ed esecuzione (ingredienti rimossi, risultato con innate + ereditate, flag «carica» se durante l'Allarme, evento «fusione eseguita», obiettivi verificati); Forca (sacrificio rimosso, livello raggiunto, 1–3 skill trasferite, incidente con punti garantiti 5/10/15, evento con i moltiplicatori); Isolamento (incenso → punti alle statistiche scelte, skill di resistenza da debolezza e livello, evento); migrazione 008 `persona_posseduta.carica`; API `POST /api/partite/:id/velluto/fusione[/anteprima]`, `…/forca`, `…/isolamento`, `GET …/isolamento/:possedutaId`; «Esegui la fusione dalla scorta» nel Calcolatore, «Esegui» sui passi dei piani salvati, «Esegui»/«Registra» in «Forca e Isolamento» | ✅ |
| 5.5 | Cicli di fusione: motore `cicliFusione` (DFS con cache delle fusioni, partner dal Registro/scorta/cattura, potatura per costo, lunghezza 2–5, limite di livello), API `GET /api/fusione/cicli/:id`, vista «Cicli di fusione» (anelli con partner, modo/costo scontato, risultato, bonus di livello del Confidente) e «Salva ciclo»; migrazione 009 `ciclo_salvato`; scheda «Cicli» in Partita con anello corrente, stato di ingrediente/partner nella scorta, «Evoca dal Registro»/«Segna ottenuta», «Esegui anello» (EseguiFusioneModal) e conteggio dei giri; eventi ciclo salvato/anello/iterazione; API `GET/POST /api/partite/:id/cicli`, `PUT/DELETE …/cicli/:cicloId`, `POST …/cicli/:cicloId/avanza` | ✅ |

## Fasi successive (dalla mappa della guida, `docs/riferimenti/mappa-moduli-guida.md`)
## Fase 6 — Confidenti completi, domande in classe, calendario
| Step | Contenuto | Stato |
|---|---|---|
| 6.1 | Confidenti completi: seed `confidenti-dettaglio.json` (guida allgamestaff, 23 Confidenti: 159 abilità per rango, 223 dialoghi con 812 scelte e punti ♪, 133 regali, disponibilità, note Royal); migrazione 010 (tabelle di gioco + `regalo_partita`); `GET /api/compendio/confidenti/:chiave`; pagina «Scheda Confidente» (`/confidenti/:chiave`: prossimo rango evidenziato, abilità sbloccate, risposte migliori con scelte romantiche e avvisi, regali con spunta «consegnato» per partita, disponibilità e sblocco, fonti); collegamento dalla scheda Confidenti della partita; `PUT /api/partite/:id/confidenti/:chiave/regali` | ✅ |
| 6.2 | Domande in classe ed esami: seed `domande.json` (allgamestaff: 55 interrogazioni + 12 voci d'esame, 4 sessioni con domande in ordine e premi); migrazione 011 (`domanda`, `esame`, `esame_premi`, tracking `domanda_partita`); `GET /api/compendio/domande?partita`, `PUT /api/partite/:id/domande/:domandaId` (spunta «fatta» con Conoscenza +1 nota nelle Doti ed evento nello storico); pagina «Guida → Domande» (`/guida/domande`): prossime domande rispetto alla data di gioco, esami con risposte e premi, elenco per mese con filtri; voce «Guida» nel menu e nella Home | ✅ |
| 6.3 | Calendario: seed `calendario.json` (346 giorni dal 9 aprile al 20 marzo con giorno della settimana, meteo wikiwiki.jp per l'83% dei giorni, 167 eventi tipizzati con fonte, tempo libero nei giorni bloccati; 42 «Soluzioni per settimana» allgamestaff); migrazione 012; `GET /api/compendio/calendario?partita&mese` (oggi nella partita, prossime scadenze/esami con giorni mancanti, settimana della guida del giorno); pagina «Guida → Calendario» (`/guida/calendario`): mese per mese, giorno espandibile con eventi e fonti, «Imposta come data di gioco»; pagina d'ingresso «Guida» (`/guida`) e scorciatoia nella barra superiore anche su tablet/telefono | ✅ |

## Fase 7 — Dungeon, aiuto in battaglia, mappe interattive
| Step | Contenuto | Stato |
|---|---|---|
| 7.1 | Palazzi e Dedalo di Iweleth: seed `dungeon.json` (9 dungeon, 107 aree, 524 punti di interesse dalla guida allgamestaff: sicure, forzieri, Volontà, enigmi, mini-boss e boss con debolezze, Ombre sciagura, Persona, oggetti, scorciatoie, con fonte); migrazione 013 (`dungeon`, `dungeon_area`, `punto_interesse` con chiave stabile, `marcatore_mappa`, `punto_partita`); API `GET /api/compendio/dungeon[/:chiave]?partita`, `PUT /api/partite/:id/punti` (ottenuto/esaurito/riapri con evento), `PUT /api/mappe/marcatori`; immagini ambito «mappa» per le piante delle aree (importate dall'utente, mai nel repo); pagine «Guida → Palazzi e Dedali» e scheda del dungeon con aree, filtri per tipo, elenco dei punti con stato e **mappa interattiva** (zoom/trascinamento, spilli colorati per tipo, modalità «posiziona», «mostra anche i gestiti») | ✅ |
| 7.2 | Mementos: i 9 Dedali entrano nel dungeon «Mementos» (164 punti: Jose, sale d'attesa, timbri, boss segreti, enigmi e le Ombre per Dedalo con maschera, debolezze, resistenze e personalità) con mappe interattive; seed `mementos.json` (33 Richieste: committente, date, Dedalo/area con collegamento, bersaglio con forma demoniaca, debolezze, resistenze e vulnerabilità alla Confusione, ricompense, Confidente collegato, note; Jose: fiori, timbri, boss segreto, 37 scambi); migrazione 014 (`richiesta`, `richiesta_partita`, `dati_guida`); `GET /api/compendio/richieste?partita`, `PUT /api/partite/:id/richieste` (accettata/completata/riapri con evento); pagina «Guida → Richieste dei Mementos» con filtri per stato e Dedalo, dettagli e sezione Jose | ✅ 2026-09-04 |
| 7.3 | Aiuto in battaglia: seed `battaglia.json` (allgamestaff) in `dati_guida` con sistema di battaglia, Rapina/Assalto/Parla, negoziazione (4 personalità con risposte efficaci e da evitare), danno tecnico (11 stati), Staffetta (ranghi e moltiplicatori), 8 Speciali, Ombre sciagura, Mietitore, 9 Demoni del Tesoro; indice unico delle Ombre di Palazzi e Dedali (217 voci: nome in battaglia, maschera collegata alla scheda Persona, debolezze, resistenze, personalità, area) con ricerca rapida e filtri per dungeon, debolezza e personalità; `GET /api/compendio/battaglia`; pagina «Guida → Aiuto in battaglia» a schede | ✅ 2026-09-04 |

✅ 7 (voce precedente, completata con 7.1–7.3) Dungeon (Palazzi, Dedali, Richieste) · Aiuto in battaglia (debolezze, danno tecnico, negoziazione) · **Mappe dei dungeon** (richiesta utente 2026-09-03: piante di ogni area con punti di interesse, risorse, forzieri, Volontà, sicure, Persona/Ombre, marcatori sovrapposti a immagini importate dall'utente, mai nel repo; **interattive**: ogni elemento è tracciato per partita, si può segnare come già ottenuto/esaurito e nascondere, con una vista completa che mostra anche gli elementi esauriti)
| Step | Contenuto | Stato |
|---|---|---|
| 7.4 | Piante dei dungeon: seed `mappe.json` con i soli collegamenti alle piante pubblicate (omoteura.com per 102 aree, game8.jp per 5, samurai-gamers.com come alternativa per Kamoshida; 107 aree su 116, le 9 senza pianta hanno il motivo: piani dei Mementos generati casualmente, fuga finale di Madarame); migrazione 020 (`pianta_area`, origine degli spilli); download automatico nell'istanza al primo accesso all'area (`POST /api/mappe/piante/:area/scarica`, con fonti alternative) e credito alla fonte nella scheda; spilli preposizionati dal seed (`origine seed`, mai sopra quelli dell'utente) | ✅ 2026-09-04 (spilli preposizionati con 7.4b) |
| 7.4b | Spilli preposizionati sulle piante dei Palazzi e dei Dedali: 187 punti su 89 delle 107 aree con pianta (Shido 41, Niijima 27, Maruki 25, Kamoshida 21, Madarame 19, Okumura 19, Futaba 16, Iweleth 12, Kaneshiro 7), posizionati leggendo numeri di legenda e icone delle piante giapponesi (confidenza alta 120, media 43, bassa 24 annotata nel seed; solo punti con riscontro in legenda o icona riconoscibile, nessuna posizione inventata); caricati in `marcatore_mappa` con origine seed, spostabili o rimovibili dall'utente (origine utente, mai sovrascritta dal reseed) | ✅ 2026-09-04(approvato dal validatore; note degli spilli complete, senza troncamento) |
| 7.5a | Cruciverba di Leblanc: 38 cruciverba (data, indizio, risposta italiana e inglese) con spunta per partita ed evento; migrazione 016; `GET /api/compendio/cruciverba?partita`, `PUT /api/partite/:id/cruciverba`; pagina «Guida → Cruciverba di Leblanc» | ✅ 2026-09-04 |
| 7.5b | Guida giorno per giorno: seed `percorso.json` (346 giorni dal 9 aprile al 20 marzo dalla soluzione allgamestaff: trama, vincoli, meteo, azioni di giorno e di sera con tipo, riferimento risolto alle chiavi dell'app — Confidenti, dungeon, Richieste, libri, film, attività, negozi, Doti — rango atteso, note, avvisi, fonte; 47 giorni senza azioni: 39 non coperti dalle fonti e 8 di salto di calendario confermato dal gioco); migrazione 018 (`giorno_percorso`, `azione_partita`); giorno corrente = `partita.data_gioco`; `GET /api/compendio/percorso?partita`, `/percorso/:data`, `PUT /api/partite/:id/percorso`, `PUT /api/partite/:id/giorno`; pagina «Guida → Guida giorno per giorno» (apre il giorno corrente, mese/giorno, precedente/successivo, azioni spuntabili con collegamenti alle schede con le risposte, «Segna come giorno corrente») | ✅ 2026-09-04 |

## Fase 8 — Città, attività, inventario

| Step | Contenuto | Stato |
|---|---|---|
| 8.1 | La città (24 quartieri, 84 luoghi con cosa offrono, orari, giorni, sblocco, Confidenti, piatti; luoghi da fonte secondaria segnalati) e Attività e Doti sociali (26 attività, 4 lavori, 46 libri, 21 film/DVD con note delle Doti; libri letti e film visti per partita con evento); migrazione 015; `GET /api/compendio/citta`, `/citta/:chiave`, `/attivita?partita`, `PUT /api/partite/:id/letture`; pagine «Guida → La città» e «Guida → Attività e Doti sociali» | ✅ 2026-09-04 |
| 8.2 | Inventario: seed `negozi.json` (47 negozi e punti di acquisto, 499 articoli: armi, protezioni, accessori, consumabili, regali, cibo, materiali con prezzo, effetto, statistiche, disponibilità, condizioni, fonte e flag `verificato`); migrazione 017 (`negozio`, `articolo`, `acquisto_partita`); `GET /api/compendio/negozi`, `/negozi/:chiave?partita`, `/articoli?q&categoria&per`, `PUT /api/partite/:id/acquisti` (evento «acquisto»); pagine «Guida → Negozi e inventario» (negozi per quartiere, ricerca in tutti i negozi) e scheda negozio con filtri e spunta «acquistato»; collegamento dai luoghi della città | ✅ 2026-09-04 |
| 8.3 | Mappe della città: seed `mappe-citta.json` con i collegamenti alle mappe pubblicate (22 quartieri su 24 dalla wiki Megami Tensei: 7 mappe annotate stile guida per Yongen-Jaya, Shibuya, Shinjuku, Akihabara, Shujin; schermate di gioco per gli altri; Ikebukuro e Nakano senza immagine); migrazione 022 (`pianta_quartiere`, `marcatore_luogo` con origine); download automatico nell'istanza (`POST /api/mappe/piante-citta/:quartiere/scarica`), spilli dei luoghi (`PUT /api/mappe/marcatori-luoghi`), `MappaInterattiva` riusata con colori per tipo di luogo nella scheda del quartiere | ✅ 2026-09-04 (spilli preposizionati con 8.3b) |
| 8.3b | Spilli preposizionati sulle mappe dei quartieri: 47 luoghi su 20 quartieri (Shibuya 11, Yongen-Jaya 9, Akihabara 6, Shinjuku 5, uno per gli altri) posizionati sulle mappe scaricate leggendo icone e insegne (confidenza alta 20, media 9, bassa 18 annotata nel seed) e caricati in `marcatore_luogo` con origine seed; l'utente può spostarli o rimuoverli (origine utente, mai sovrascritta dal reseed); senza spilli restano Ikebukuro e Nakano (nessuna mappa), Kichijoji e Mementos (immagini senza insegne leggibili) | ✅ 2026-09-04(approvato dal validatore) |

✅ 8 (voce precedente, assorbita da 8.1–8.3b) Inventario (negozi, oggetti, armi, accessori, abiti) · Attività (mini-giochi, lavori, libri, DVD) · **Mappe della città in modalità guida** (richiesta utente 2026-09-03: luoghi con cosa offrono; per negozi e punti sensibili elenco di oggetti, armi, accessori, abiti e opzioni disponibili, con date/condizioni)
## Fase 9 — Completamento, sfide, boss

| Step | Contenuto | Stato |
|---|---|---|
| 9.1 | Completamento: seed `completamento.json` (53 trofei con nome italiano e inglese, tipo, come e quando; 6 finali con condizioni e date; Covo dei Ladri con 52 sfide e 36 voci di catalogo; 12 DLC; 11 voci sugli effetti del meteo; Nuova Partita+; differenze Royal/vanilla; fasce orarie e regole del tempo); migrazione 019 (`trofeo`, `trofeo_partita`), consultazione in `dati_guida`; `GET /api/compendio/completamento?partita`, `PUT /api/partite/:id/trofei` (evento «trofeo»); pagina «Guida → Trofei, finali e Covo dei Ladri» a schede | ✅ 2026-09-04 |
| 9.2 | Sfide e boss: seed `sfide.json` in `dati_guida` (7 Battaglie Sfida con regole, nemici, punteggi, ricompense e strategia; boss segreti Jose, Gemelle Custodi e Lavenza con mosse, resistenze e strategia; Magnate; 90 tratti delle Persona con effetto in italiano, nome inglese dal compendio e compagno per i 18 tratti «Alleati»; statistiche e note dei boss); le 11 domande del game show in TV entrano in `domande.json` (tipo «altro», con spunta per partita); `GET /api/compendio/sfide`; pagina «Guida → Battaglie Sfida, boss segreti e tratti» a schede con ricerca dei tratti | ✅ 2026-09-04 |

✅ 9 (voce precedente, assorbita da 9.1–9.2) Trofei, finali, Covo dei Ladri

## Fase 10 — Rifiniture e buchi residui del censimento

| Step | Contenuto | Stato |
|---|---|---|
| 10.1 | Ritratti dei Confidenti in due versioni: `confidenti/<chiave>-fedele` (ritratto fedele, mostrato di default) e `confidenti/<chiave>` (stilizzata, mostrata al passaggio del mouse e con il pulsante nella finestra per il tocco); gli asset arrivano con la consegna grafica, l'app resta perfettamente funzionante senza | ✅ 2026-09-04 |
| 10.2 | Oggetti della guida: seed `oggetti-guida.json` in `dati_guida` (247 consumabili con effetto, dove trovarli e prezzo; 108 oggetti chiave e materiali con uso; 10 ricette di fabbricazione con materiali e quantità; personalizzazione delle armi da Iwai con 8 modifiche e progressione del Confidente; 55 abiti e lavanderia; 5 venditori con 60 scambi; dati da fonti secondarie segnalati); `GET /api/compendio/oggetti-guida`; pagina «Guida → Oggetti, materiali e fabbricazione» a schede con ricerca | ✅ 2026-09-04 (approvato dall'utente in appello: nomi degli oggetti fedeli alla guida, nessuna sanificazione anti-spoiler) |
| 10.3 | Personaggi senza spoiler: seed `personaggi.json` in `dati_guida` (26 personaggi, 10 giocabili con nome in codice, 4 gruppi; ruolo, presentazione, Persona ed evoluzioni, armi, ruolo in battaglia, scuola/età, doppiatori con i campi da fonti secondarie segnalati) collegati alle schede dei Confidenti e ai loro ritratti; `GET /api/compendio/personaggi`; pagina «Guida → Personaggi» | ✅ 2026-09-04 |
| 10.4 | Localizzazione italiana completa dalla guida allgamestaff: `traduzioni.json` con +119 skill (490/525; le 35 restanti — skill dei nemici e passive minori assenti dalla guida — restano col nome canonico), +174 Persona (232/232, identiche incluse per copertura esplicita) e nuovo ambito `oggetti` con i 223 equipaggiamenti (armi, protezioni, accessori) abbinati per statistiche, effetto o Persona da esecuzione (220 certi, 3 probabili con nome ed effetto concordanti); `OggettoDto.nomeIt` e `oggettoNomeIt`/`oggettoAllarmeNomeIt` nella scheda Persona (nome italiano in evidenza, canonico tra parentesi); ricerca del compendio (Persona, skill, oggetti) anche per nome italiano, insensibile ad accenti e punteggiatura (`shared/testo.ts`); editor traduzioni con etichette per skill, Persona, equipaggiamento e termini; 149 consumabili/materiali della guida con il nome inglese per la ricerca (Megami Tensei Wiki, incrocio prezzo/effetto; esclusi gli abbinamenti a bassa confidenza) | ✅ 2026-09-04(approvato dal validatore) |

## Fase 11 — Impatto visivo (confermata dall'utente il 2026-09-04)

Principio: prima la grafica, poi il testo ridotto all'essenziale con i dettagli a richiesta; ogni pagina resta perfettamente
funzionante senza asset (fallback disegnati in codice); verifica su desktop, tablet e mobile a ogni step. Decisioni dell'utente:
pulsanti e chip a taglio diagonale in CSS (nitidi a ogni dimensione, niente sprite), elenco Persona a piastrelle con arte grande
(vista compatta come alternativa), sfondi a tema in tutte le sezioni, font P5 caricati nell'istanza (mai nel repository) con
predefiniti open source nel repo, stati vuoti con l'illustrazione neutra finché Codex non consegna le quattro dedicate.

| Step | Contenuto | Stato |
|---|---|---|
| 11.1 | Fondamenta: tipografia a tre ruoli (`--font-display`, `--font-menu`, `--font-decor`) con predefiniti liberi auto-ospitati (Anton, Bebas Neue e Inter in OFL; Special Elite in Apache 2.0) e slot per i font dell'utente nell'istanza (`DATA_DIR/font/<ruolo>`, `GET/PUT/DELETE /api/font/:ruolo`, `@font-face` generate all'avvio, sezione «Caratteri» in Impostazioni); sfondi a tema per sezione nel layout (Partita, Compendio/Skill, Fusione con Stanza di Velluto, Guida con Mementos, Impostazioni); intestazione «hero» comune (`IntestazionePagina`: titolo a tasselli, sottotitolo, azioni, illustrazione) applicata a tutte le pagine; componente `StellaCinque` (radar SVG a 5 assi, animato e interattivo) con test; caricamento con gli 8 fotogrammi di `illustrazioni/caricamento-*`, errori con `illustrazioni/errore`, stati vuoti sempre illustrati; pulsanti e chip a taglio diagonale in CSS con focus visibile | ✅ 2026-09-04(approvato dal validatore) |
| 11.2 | Partita: Doti con la stella grande al centro (badge ai vertici, rango disegnato sul grafico) e schede compatte con le note su una riga; Confidenti «poster» (ritratto a tutta altezza, carta dell'arcano in filigrana, badge del rango grande sul ritratto, anello di avanzamento, una riga di testo, azioni compatte); Obiettivi, Piani, Cicli e Storico con intestazione visiva, arte delle Persona in evidenza e stati vuoti illustrati | ✅ 2026-09-04(approvato dal validatore) |
| 11.3 | Compendio Persona: elenco a piastrelle con arte grande e livello in stile P5 (vista compatta alternativa, ricordata per dispositivo); dettaglio con hero a tutta larghezza (arte nella `ui/cornice-scheda`, sfondo Mementos, arcano grande, statistiche a pentagono accanto alle barre, badge DLC/speciale/tesoro/allarme da `ui/badge-*` e `ui/tesoro-*`), sezioni in due colonne, icone degli elementi grandi nelle skill | ✅ 2026-09-04(approvato dal validatore) |
| 11.4 | Guida, indice e Palazzi: indice a piastrelle illustrate; ogni Palazzo e Dedalo con emblema, sfondo a tema, scadenza e avanzamento resi come grafica, testo lungo ripiegato | ✅ 2026-09-04(approvato dal validatore) |
| 11.5 | Guida, giorno per giorno, calendario e sezioni: data grande in stile P5, icona del meteo (`meteo/*` appena consegnate), blocchi giorno/sera con icone, Confidenti e luoghi con ritratti e miniature delle mappe; città, negozi, attività, battaglia e oggetti con icone di categoria e copertine | ✅ 2026-09-04(approvato dal validatore dopo le correzioni) |
| 11.6 | Asset aggiuntivi per Codex, prompt in `docs/grafica/prompt-immagini.md`: `ui/nav-guida`, 15 icone delle sezioni della Guida, 10 emblemi di Palazzi e Dedali senza spoiler, icone giorno/sera, 4 illustrazioni per gli stati vuoti (obiettivi, piani, cicli, storico); l'app li usa appena presenti nel manifest, con fallback vettoriali fino ad allora | ✅ 2026-09-04(approvato dal validatore) |

## Fase 12 — Correzioni dal test e gestione della partita (note dell'utente del 2026-09-04)

Decisioni dell'utente: il catalogo dei riferimenti dal wiki è superfluo (l'app ha la propria grafica) e viene rimosso, resta il
caricamento singolo di un'immagine dal riquadro di ogni entità con «Rimuovi tutte» in Impostazioni; la stella delle statistiche
mostra di default la scala unica 0–99 (adattata a richiesta) e si ingrandisce al tocco; i filtri del compendio vivono nell'URL;
nessun pulsante grigio di solo testo: ogni azione ha un elemento visivo (icona da asset con riserva SVG, titolo in carattere display,
dettaglio) e gli asset delle icone sono censiti nei prompt per Codex come tutti gli altri; sulla stella il rango è un tassello grafico.

| Step | Contenuto | Stato |
|---|---|---|
| 12.1 | Correzioni rapide: rimozione del catalogo dei riferimenti (rotte, servizio, UI, cartella e variabili d'ambiente) e sezione «Immagini caricate» con rimozione per ambito o totale (`DELETE /api/immagini?ambito`); nome italiano nel dettaglio delle immagini; compendio con filtri nell'URL (ricerca, arcano, livello minimo e massimo, ordinamento con verso, affinità per elemento e tipo, immagine personalizzata presente/assente) ordinati in un pannello a gruppi etichettati con chip dei filtri attivi e «Azzera», e ritorno dalla scheda alla Persona vista, evidenziata; nome della statistica al passaggio del mouse sui vertici della stella (icone senza testo); stella delle statistiche con scala unica 0–99 di default, «adatta» a richiesta e ingrandimento in finestra; storico con selezione multipla ed eliminazione in blocco (`POST /api/partite/:id/storico/elimina`); Forca e Isolamento con selettori a miniature (`SelettorePosseduta`, `AnteprimaPersona`); logo e nome dell'app più grandi; font dell'utente limitati ai caratteri che possiedono (`unicode-range`, le accentate dal font di riserva); Doti con targhette grandi, tassello grafico del rango (`ui/rango-N`) in angolo alla targhetta sui vertici della stella (in scala con la larghezza reale del riquadro), intestazioni «Rango · tassello · qualificatore» in carattere P5 e modificatori (Fortuna ×1,5, Libro) come pulsanti a tasselli con icona; prompt §14 per Protagonista, Caroline, Justine, Jose e Lavenza con chiavi cablate in Personaggi e Sfide; pulsanti grigi di solo testo della sezione Partita convertiti in elementi visivi (`PulsanteVisivo`/`CollegamentoVisivo`; schede e filtri con icona, prompt §16) e Home con la stella delle Doti come nella scheda e gli arcani potenziati dalla scorta | ✅ 2026-09-04 (237a98b + f188cc8 validati; da74030 in validazione) |
| 12.2 | Statistiche con bonus: la Persona posseduta conserva un bonus per statistica (colonne `bonus_*`, migrazione 023 che converte i valori assoluti registrati in scarti rispetto alla stima del livello), le statistiche effettive sono stima del livello + bonus e seguono il livello; Forca e Isolamento sommano al bonus; compendio personale con istantanea (livello, bonus, skill, tratto) al momento della registrazione — automatica all'ingresso in scorta, esplicita col pulsante «Registra» sulla carta della scorta quando la Persona è cambiata — e ripristinata dall'evocazione dal Registro (cicli e piani con `daRegistro`) | ✅ 2026-09-04 |
| 12.3 | Semafori dei Confidenti: requisiti per rango estratti dalla guida in `data/seed/confidenti-requisiti.json` (Dote, Persona dell'arcano, Palazzo, richiesta dei Mementos, altro Confidente, data, meteo, manuale) valutati sullo stato della partita (`semaforiService`), grigio + conferma manuale «Condizione soddisfatta» per ciò che l'app non verifica (acquisti, caffè e curry, letture di Chihaya, scelte di dialogo, eventi); mostrati nella carta del Confidente (prossimo rango) e nella scheda (prossimo passo e ranghi successivi). Punti dalle azioni della guida alla spunta: Doti «+N» dalle note, note del Confidente scelte 1–3 (scelta A: 2 preselezionato, «Nessun punto»), annullati togliendo la spunta; dopo i rilievi del validatore: titoli delle richieste canonici, requisiti «confidente» mancanti, testi integrali (lo spezzamento in frasi non taglia più dentro le parentesi, es. «(es. …)», e nessun testo resta chiuso da «;»), scansione sistematica del file (parentesi bilanciate, nessun «(es.» residuo); 2026-09-04 sera (richiesta dell'utente): Confidente **bloccato** finché i semafori del rango successivo non sono tutti verdi o confermati — carta spenta con i motivi, «+» e sblocco disattivati, rifiuto 409 `confidente-bloccato` dal server; elenco dei requisiti manuali e condizionali consegnato in `docs/riferimenti/semafori-confidenti.md` | ✅ 2026-09-04 (scelte A e conferma manuale applicate come consigliato) |
| 12.4 | Partita e Guida giorno per giorno: scheda «Oggi» (predefinita) nella Partita e sezione «Oggi» nella Home con la guida del giorno corrente (`GiornoGuida`, condiviso con la pagina della guida) e, accanto (sotto su schermi stretti), la mappa globale navigabile che si sposta sulla mappa dell'azione scelta con «Sulla mappa» centrata sullo spillo (13.5); collegamenti al punto esatto delle pagine (schede, negozio, Palazzo, richieste, mappa con `?spillo=`); stato per azione calcolato dal server (`stato`: consigliata in oro quando i semafori del rango atteso del Confidente sono verdi, bloccata in grigio con il motivo dei requisiti rossi, neutra altrimenti; `mappa` collegata: Palazzo → `dungeon-<k>`, richiesta → Mementos, negozio/Confidente → spillo del luogo); una nuova partita parte dal primo giorno del gioco (04-09) come giorno corrente | ✅ 2026-09-04 |
| 12.5 | Cicli di fusione: partner distinti lungo la catena (opzione attiva di default: ogni Persona una volta sola tranne quella che apre e chiude), anelli minimi e massimi fino a 15 (`lunghezzaMin`/`lunghezzaMax`, API e interfaccia, budget di ricerca proporzionale), test | ✅ 2026-09-04 |
| 12.6 | Asset grafici delle azioni: censimento dei prompt `ui/azione-<chiave>.png` (§17) e `ui/scheda-<chiave>.png` (§16), componente `IconaAzione`/`IconaScheda` che usa l'asset con riserva SVG in codice; Home con il blocco della partita centrato (stella, riquadri, arcani) | ✅ 2026-09-04 |
| 12.7 | Scheda dei personaggi: striscia con la Persona di riferimento e le evoluzioni (`PersonaDelPersonaggio`), click per vedere la versione scelta in grande con la fase; Arsène e Satanael dagli asset del compendio (con collegamento alla scheda), le altre 27 da `persona-gruppo/<slug>.png` (prompt §15) con riserva alle iniziali | ✅ 2026-09-04 |
| 12.8 | Pulsanti grigi di solo testo nelle altre sezioni (Compendio e scheda Persona, Skill, Guida, scheda Confidente, Impostazioni): stesso trattamento di 12.1/12.6 con asset censiti: 42 pulsanti convertiti (Calendario, Compendio, Confidente, Palazzi, Percorso, Persona, Personaggi, Quartiere, Richieste, Cruciverba, Impostazioni, immagini, mappe, Fusione: selettori, Forca, Velluto, ricette) e 14 chiavi nuove nel censimento §17 (46 icone, compresa `filtri` per il pannello del Compendio); dopo il rigetto del validatore convertiti anche «Filtri» del Compendio, gli «Annulla» inline (Traduzioni, note del Percorso), «Salva piano» e «Azzera i bonus», e i pulsanti compatti riportati all'altezza minima di tocco di 44 px; restano di solo testo i soli «Annulla» delle finestre modali e i pulsanti che hanno già un'icona | ✅ 2026-09-04 |
| 12.9 | Descrizione delle Persona nella scheda: 232 descrizioni originali in italiano sull'origine della figura (mitologia, folclore, religione, letteratura; testo redatto per l'app, mai quello del gioco, senza spoiler) in `data/seed/descrizioni-persona.json` con fonte sintetica, colonna `persona.descrizione` (migrazione 024), DTO `descrizione`/`fonteDescrizione`; riquadro «Chi è» a dimensione fissa con scorrimento verticale sotto l'immagine della scheda | ✅ 2026-09-04 |

## Fase 13 — Mappe in stile mapgenie (proposta del 2026-09-04, in attesa di conferma dell'utente)

Sostituisce in modo ordinato La Città, Palazzi e Dedali. Le piante attuali (link a guide esterne, scaricate al primo accesso: per questo
in Città mancano le immagini) restano solo come fonte opzionale dell'immagine di base. Decisioni chieste all'utente: le immagini di base
esportate nel repository entrano nel pacchetto completo consegnato dall'utente, con la provenienza annotata quando scaricate dalle guide (decisione del 2026-09-04 sera); il posizionamento
degli spilli è disponibile solo nell'editor.

| Step | Contenuto | Stato |
|---|---|---|
| 13.1 | Modello dati (migrazione 027): tabelle `mappa` (chiave, nome, tipo città/quartiere/luogo/palazzo/area/dedalo/generica, mappa genitore, immagine di base nell'istanza o asset del repository, dimensioni, collegamento all'entità esistente, origine seed/utente, note), `spillo` (mappa, x/y in percentuale, tipo, nome, descrizione, riferimento tipizzato: altra mappa, negozio, punto di dungeon, luogo, Confidente, richiesta, attività; «collezionabile») e `spillo_partita` (raccolto per partita); registro dei tipi di spillo in `shared/spilli.ts` (passaggio, negozio, forziere, tesoro, boss, miniboss, stanza sicura, scorciatoia, Confidente, attività, ristorante, distributore, treno, nota) con nome, colore e collezionabilità; `sincronizzaMappe` idempotente (albero Tokyo → quartieri, Palazzi/Dedalo → aree; spilli dai marcatori esistenti) eseguita dalla migrazione e alla fine del seed; API `/api/mappe` (albero, dettaglio con stato della partita e articoli dei negozi, per entità, CRUD mappe e spilli, immagine di base come corpo `image/*` con dimensioni lette dall'intestazione, `esporta`/`importa`) e `PUT /api/partite/:id/spilli/:spilloId` (raccolto; per i punti aggiorna anche `punto_partita`); esportazione/importazione come pacchetto JSON versione 1 con immagini in base64 (scelta al posto dello ZIP: nessuna dipendenza di compressione disponibile, cfr. MAPPE.md §6); seed `data/seed/mappe-editor.json` nello stesso formato (senza immagini) caricato con origine «seed» senza toccare le mappe modificate dall'utente; client API `src/services/api/mappe.ts`; test `server/routes/mappe-editor.test.ts` (7 casi); dopo il rigetto del validatore l'importazione senza «sovrascrivi» sostituisce solo gli spilli della stessa origine (il seed non cancella mai gli spilli aggiunti dall'utente su una mappa del seed; `spillo.tipo` resta validato dall'applicazione perché il registro dei tipi vive nel codice) | ✅ 2026-09-04 |
| 13.2 | Visore `VisoreMappa` sul modello di mapgenie.io (studiato dal vivo il 2026-09-04: barra laterale a sinistra con le categorie e i conteggi, «Mostra tutti/Nascondi tutti», ricerca, segnalini a dimensione costante con icona per categoria, popup ancorato al segnalino con titolo, categoria, descrizione e azioni, controlli dello zoom in basso a destra, tracciamento dei trovati): schermo intero (`/guida/mappe/:chiave`) o incorporato; zoom con minimo «adatta» (rotellina attorno al cursore, pulsanti, pinch, doppio click), trascinamento; spilli a goccia con `IconaSpillo` (asset §18 → riserva SVG) e raggruppamento «+n» vicino allo zoom minimo; pannello con livelli (su, mappe figlie), categorie con conteggi, «Mostra anche i raccolti (n)», progresso dei collezionabili, scheda dello spillo (negozio → articoli con prezzo, disponibilità e «comprato»; punto di dungeon → stato nella Guida; luogo, Confidente, richiesta → collegamenti), elenco degli spilli con «Centra»; raccolti nascosti per default e stato per partita (`PUT /api/partite/:id/spilli/:spilloId`); nessun click sulla mappa modifica i dati (gli strumenti dell'editor arrivano da 13.3 via `editor`); indice `/guida/mappe` con l'albero; test `VisoreMappa.test.tsx` (7) e `MappaPage.test.tsx` (3); dopo il rigetto del validatore: azioni «Ottenuto/Esaurito/Riapri» per i punti della Guida (stessi stati della scheda del Palazzo) e acquisto degli articoli del negozio dalla scheda dello spillo (richieste dell'utente), immagine dell'entità collegata (mappa: sua immagine di base o asset; Confidente: ritratto caricato o asset; negozi, luoghi, punti e richieste non hanno immagini nell'app), galleria delle schermate dello spillo (13.3) | ✅ 2026-09-04 |
| 13.3 | Editor `EditorMappaPage` (`/guida/mappe/:chiave/modifica`, targhetta rossa «Modifica»): strumenti «Seleziona» (trascina uno spillo: posizione salvata al rilascio) e «Aggiungi» (palette dei 14 tipi, un tocco sulla mappa crea lo spillo); proprietà dello spillo (nome, tipo, descrizione, collezionabile, riferimento cercato fra mappe, negozi, punti dei Palazzi, luoghi, Confidenti, richieste con `GET /api/mappe/riferimenti`, «Crea mappa collegata» che crea la figlia e trasforma lo spillo in passaggio); schermate di riferimento dello spillo (migrazione 028 `spillo_immagine`: una o più immagini dell'istanza con didascalia, o asset del repository; galleria con ingrandimento nel visore); immagine di base (carica/sostituisci, «Scarica dalla guida» per aree e quartieri: la pianta con la chiave della mappa diventa la sua immagine); proprietà della mappa (nome, tipo, genitore senza discendenti, ordine, asset, note), «Nuova mappa» figlia, eliminazione con conferma; passaggi automatici verso le mappe figlie (Tokyo → 24 quartieri, Palazzo/Dedalo → aree) in griglia da trascinare al posto giusto; «Esporta questo luogo» = ZIP per il repository (`data/seed/mappe/<chiave>.json` + `public/asset/mappe/*` e `public/asset/spilli/*`; scrittore ZIP proprio in `server/utils/zip.ts`; i pacchetti in `data/seed/mappe/` vengono caricati dal seed) oltre a «Esporta» JSON di tutto e «Importa»; ogni modifica è salvata subito via API; test `EditorMappaPage.test.tsx` (3), `mappe-editor.test.ts` (+2), `zip.test.ts` (2) | ✅ 2026-09-04 |
| 13.4 | Integrazione: `MappaIncorporata` (visore ad altezza fissa con «Schermo intero» e «Modifica mappa», hook `useMappaPartita` condiviso col visore a schermo intero) dentro «La città» (mappa di Tokyo con i quartieri come passaggi sopra le piastrelle, miniature dall'istanza o dall'asset `mappe/<chiave>`), nella scheda del quartiere (mappa `citta-<q>` con i luoghi come spilli; download della pianta dalla guida al primo uso conservato) e nella scheda del Palazzo/Dedalo (mappa dell'area corrente, elenco dei punti sincronizzato in entrambe le direzioni con gli stati della partita); piastrelle dei Palazzi con «Mappa» verso `dungeon-<chiave>`; sezione «Mappe» nell'indice della Guida (asset `guida/mappe` censito, §20); il vecchio `MappaInterattiva` e la modalità «posiziona spilli» delle pagine sono rimossi (posizionamento e immagini solo nell'editor; le rotte dei marcatori restano lato server per la sincronizzazione iniziale); test `CittaPage.test.tsx` (2) | ✅ 2026-09-04 |
| 13.5 | Home della Partita: `OggiPartita` (guida del giorno con navigazione fra i giorni, «Segna come giorno corrente», «Guida completa») accanto a `MappaIncorporata` (Tokyo, poi la mappa dell'azione scelta con lo spillo centrato via `selezioneIniziale`, «Torna a Tokyo», «Schermo intero»); usata come scheda «Oggi» della Partita e nella Home; asset `ui/scheda-oggi` censito (§16, 18 icone); riquadri delle mappe incorporate ad altezza adattiva allo schermo (Città, quartiere, Palazzo dall'ingresso); dopo il rigetto di 13.4: a schermi stretti la tela non collassa (righe della griglia con minimo esplicito) e MAPPE.md §9 dichiara le miniature come immagine stessa; pacchetto ZIP sempre completo (immagini di base e schermate degli spilli incluse e puntate come asset; la provenienza delle immagini scaricate dalle guide è annotata in `provenienze` e nel LEGGIMI: decisione dell'utente del 2026-09-04 sera, che supera l'esclusione chiesta dal validatore di 13.3); test `OggiPartita.test.tsx` (2), `percorso.test.ts` (+1) | ✅ 2026-09-04 |
| 13.6 | Asset: icone degli spilli `ui/spillo-<tipo>.png` (§18, 14 file), mappe di base illustrate `mappe/*.png` (§19, 25 file), icona della sezione «Mappe» della Guida `guida/mappe.png` (§20) e icona della scheda «Oggi» `ui/scheda-oggi.png` (§16) censite nei prompt per Codex e nello stato degli asset; l'app funziona con le riserve SVG in codice (`IconaSpillo`, `IconaAzione`, `IconaScheda`) e con le immagini caricate dall'utente finché i file non arrivano; l'utente costruirà le proprie mappe giocando e le consegnerà come pacchetti completi (immagini comprese) da caricare come dati preimpostati | ✅ 2026-09-04 (consegna Codex in attesa) |

## Fase 14 — Fusione: revisione visiva e funzionale (note dell'utente del 2026-09-04)

| Step | Contenuto | Stato |
|---|---|---|
| 14.1 | «Come ottenere»: righe delle ricette con `PersonaChip` (miniatura dell'utente → asset → iniziali, nome, livello, evidenza della scorta), tipo e costo allineati a destra | ✅ 2026-09-04 |
| 14.2 | «Fusioni con»: stesse righe con miniature, risultato in evidenza (bordo rosso, nome in carattere display, miniatura più grande) | ✅ 2026-09-04 |
| 14.3 | Piano di fusione: `motivo` dal server (`non-fondibile` per Demoni del Tesoro, Persona iniziale, speciali senza ricetta, Persona che nessuna coppia produce; `skill-non-ereditabili` quando il tipo di eredità del bersaglio non ammette l'elemento) mostrato in un riquadro esplicito (il caso Arsène + Bagno di sangue spiega che Arsène non nasce da alcuna fusione); albero con `PersonaChip`, modo con icona (scorta, Registro, cattura, fusione); test API | ✅ 2026-09-04 |
| 14.4 | Cerca per skill: tre passi guidati (skill, risultato facoltativo, ricette), risultati possibili con miniatura e numero di ricette, spiegazione tecnica in un riquadro a scomparsa | ✅ 2026-09-04 |
| 14.5 | Cicli di fusione: anelli numerati con `PersonaChip` (ingrediente, partner con modo e costo, risultato in evidenza), «Salva ciclo» visivo | ✅ 2026-09-04 |
| 14.6 | Forca e Isolamento: sacrifici con miniatura e nome in carattere display, moltiplicatore EXP come tassello; selettori a miniature già dal 12.1; revisione funzionale: nessun difetto trovato nei calcoli (test esistenti verdi) | ✅ 2026-09-04 |
| 14.7 | «Due arcani», «Matrice completa» e «Demoni del Tesoro» fuori dalle schede: visibili solo con `?strumenti=1` (API e test invariati) | ✅ 2026-09-04 |
| 14.8 | Ricette speciali: schede in griglia con risultato in evidenza e ingredienti con miniatura, ordinate per livello del risultato, conteggio e stato «tutti in scorta» | ✅ 2026-09-04 |
| 14.9 | Schede della Fusione con icona (`IconaScheda` `fusione-*`, prompt §16: 17 icone) e pulsanti già convertiti in 12.8 | ✅ 2026-09-04 |
| 14.10 | Resa grafica delle ricette (segnalazione del 2026-09-04: «grafica ancora misera e poco accattivante»): tasselli Persona a taglio diagonale con miniatura incorniciata in rosso (figura intera, non ritagliata), nome nel carattere P5, tessera del livello «Lv N», icona e nome dell'arcano, rombo dorato per le rare, spunta verde d'angolo per la scorta; operatori «+» e «→» come cerchi (rosso/bianco) anche nei cicli e nelle ricette speciali; righe con tipo a etichetta, costo nel carattere P5 e barra rossa per le ricette pronte; dopo il rigetto del validatore anche «Fusioni speciali» della scheda Persona usa gli stessi tasselli | ✅ 2026-09-04 |
| 14.11 | Residui segnalati dal validatore di 14.10: «Cicli salvati» e «Piani salvati» della Partita e la finestra «Esegui la fusione dalla scorta» usavano ancora pillole grigie e «+»/«→» di solo testo → tasselli `PersonaChip` (risultato in evidenza, ingredienti in scorta evidenziati, «carica» come suffisso) e `OperatoreRicetta`; il collegamento al calcolatore/ricetta diventa un pulsante visivo | ✅ 2026-09-04 |

## Fase 15 — Tre formati, alone dorato, scuola del giorno, requisiti Royal (note dell'utente del 2026-09-04)

| # | Cosa | Stato |
|---|---|---|
| 15.1 | Pacchetti delle mappe sempre completi (immagini di base e schermate degli spilli incluse e puntate come asset) | ✅ 2026-09-04 |
| 15.2 | Home in una schermata su desktop e tablet: griglia ad aree (`.home-griglia`: telefono incolonnato, tablet con guida e mappa affiancate, desktop a due colonne), stella dimensionata sulla larghezza (30vh su desktop), tessere dei punteggi 2/3/auto per riga; mobile scorre in verticale | ✅ 2026-09-04 |
| 15.3 | Schermo intero della mappa reversibile; cache delle immagini (URL versionati + `immutable`) | ✅ 2026-09-04 |
| 15.4 | Confidenti bloccati dai semafori: carta grigia, «+» e sblocco disattivati, motivi sulla carta, «Segna comunque» tracciato nello storico; due gruppi «Attivi e sbloccabili» / «Non ancora disponibili» (il primo resta visibile anche vuoto) | ✅ 2026-09-04 |
| 15.5 | Alone dorato dei suggerimenti del giorno (`suggerimentiService`, `useSuggerimenti`, `TargaSuggerito`): Confidenti, Doti (lette dal testo dell'azione), Palazzi e aree, Richieste, Attività, libri e film, articoli e negozi, luoghi e quartieri, personaggi, mappe e spilli; le azioni bloccate dai requisiti non vengono suggerite; ricalcolo alla spunta | ✅ 2026-09-04 |
| 15.6 | Scuola del giorno nell'intestazione della Partita (`ScuolaOggi`): domande in classe, domande d'esame (fonte granulare, riassunto solo di ripiego) e cruciverba del giorno corrente con la risposta | ✅ 2026-09-04 |
| 15.7 | Cinque tipi di spillo mancanti (nemico, oggetto-chiave, punto-sensibile, tesoro-palazzo, seme-bramosia) con riclassificazione automatica degli spilli di seed esistenti a ogni sincronizzazione | ✅ 2026-09-04 |
| 15.8 | Doppia barra verticale (regola `.sr-only { top:0; left:0 }` fuori dai layer), stella delle Doti grande e pulsanti compatti, cinque schede senza scorrimento | ✅ 2026-09-04 |
| 15.9 | Tre formati sul continuo delle larghezze: barra superiore in 375 px, titolo a tasselli su una riga, file di schede/filtri scorrevoli sotto i 768 px (`FilaScorrevole`), nessuno sbordo orizzontale da 360 a 1440 px | ✅ 2026-09-04 |
| 15.10 | Requisiti dei ranghi dei 23 Confidenti ricostruiti dalla guida Royal (due letture indipendenti con citazione letterale, fuse per concordanza): 143 ranghi / 174 semafori, niente «Persona dell'arcano» come obbligo, 6 manuali, nessuna data di rango 1 da «giorno consigliato» (Yusuke, Makoto, Chihaya, Takemi, Sojiro, Ohya senza data), vincolo meteo su ogni rango per chi non è mai disponibile con la pioggia, `persona-abilita` per le Gemelle, Haru Perizia massima al rango 4 | ✅ 2026-09-04 |
| 15.11 | Report «Semafori e alone dorato» (artifact) e `docs/riferimenti/semafori-confidenti.md` generato dal seed (tabelle) con le note sulle date e sulla pioggia mantenute a mano | ✅ 2026-09-04 |
| 15.12 | Home desktop (da 1360 px): via gli accessi rapidi (doppione della barra laterale), carta e guida del giorno nella colonna sinistra (5/12), mappa a tutta altezza a destra (7/12), stella limitata dalla colonna (`max(230px, min(40vh, 50cqw, 420px))`); tablet e telefono invariati | ✅ 2026-09-04 |
| 15.13 | Spilli sulla mappa: l'immagine consegnata `ui/spillo-<tipo>` è già uno spillo intero e viene mostrata così (`SpilloGrafico`, `PuntoSpillo`); la goccia colorata col disegno resta solo come riserva | ✅ 2026-09-04 |
| 15.14 | Personaggi: stesso riquadro `ImmagineEntita` per tutti (nuovo ambito `personaggio` per Protagonista, Stanza di Velluto e Jose, caricabile dalle Impostazioni), Lavenza aggiunta alla Stanza di Velluto, ingrandimento delle Persona dei Ladri Fantasma | ✅ 2026-09-04 |
| 15.15 | `statoAzione` non ripiega più sul rango successivo quando il rango obiettivo non ha requisiti (un'azione di rango 1 di Takemi risultava bloccata dal rango 2) | ✅ 2026-09-04 |
| 15.16 | Modificatore «Anima da cineasta» (Royal): film e DVD salgono di uno scalino (2→3, 3→5, 5→7) prima del ×1,5 di Chihaya — terzo interruttore nel pannello Doti e applicazione automatica alla spunta delle azioni film/DVD della guida quando il libro risulta letto. Le «+N» della guida sono note (2/3/5 punti), non punti; i DVD danno sempre due note (3 punti, 5 col libro) anche se la guida li segna «+3»; le tre visite al cinema della guida sono collegate al film (`riferimento` di tipo `film`) | ✅ 2026-09-04 |
| 15.17 | Tipo di spillo `dialogo` («Dialogo», indaco `#6366f1`, collezionabile, senza riferimento tipico) per le conversazioni con personaggi che non sono Confidenti: registro `shared/spilli.ts`, riserva SVG a fumetto in `IconaSpillo`, asset `ui/spillo-dialogo` censito nel §18; il pacchetto `data/seed/mappe/citta-yongen-jaya.json` riclassifica «Poliziotto Dialogo» da `nota` a `dialogo` (reseed automatico via hash dei pacchetti); nessuna corrispondenza automatica dai punti dei dungeon (i punti `persona` sono tabelle di negoziazione) | ✅ 2026-09-05 |
| 15.18 | Disponibilità «ad un dato momento» di articoli e negozi (`server/services/disponibilitaService.ts`): i testi della guida (`disponibileDal`, `condizione`, `sblocco`) diventano requisiti valutati con lo stesso valutatore dei semafori dei Confidenti — date, intervalli, «a partire dall'arco del Palazzo di X» (= Palazzo precedente completato), Palazzi, Doti (anche più in una frase), ranghi dei Confidenti, richieste dei Mementos, pioggia, giorni della settimana («solo la domenica», «dal lunedì al venerdì»), stagioni, «da quando si sblocca Akihabara» (data del quartiere dalla Guida), «domenica 24 aprile» = solo quel giorno; ciò che non si sa leggere resta «ignoto» e visibile. Negozi (`?partita=`) e articoli portano `disponibilita` {stato, requisiti}; chip «Non ancora»/«Da verificare» (`ChipDisponibilita`) nell'elenco negozi, nella scheda del negozio (interruttore «Solo disponibili ora», acceso con una partita) e nella scheda del negozio del visore delle mappe (articoli bloccati nascosti con pulsante «Mostra anche…»); il popup conta solo gli articoli disponibili. Date leggibili nei dettagli («18 aprile», non «04-18») | ✅ 2026-09-05 |
| 15.19 | Rivalidazione dalla fonte allgamestaff Royal di tutte le condizioni di sblocco dei 499 articoli e 47 negozi (workflow: una pagina per agente, citazioni letterali obbligatorie): 294 articoli corretti (105+46+8 riformulati «a partire dall'arco del Palazzo di X»; date mese/giorno lette bene: «1/13» = 13 gennaio, «9/1» = primo settembre; condizioni redazionali e note di posizione/prezzo tolte dalla condizione, quelle utili spostate nella `nota` dell'articolo), 168 confermati, 33 non trovati lasciati invariati (da riassegnare: vedi decisioni aperte); `sblocco` dei negozi ridotto alla sola condizione (descrizioni in `note`); Kichijoji datato 5 giugno in `citta.json` | ✅ 2026-09-05 |
| 15.20 | Editor delle mappe: cambio del tipo dello spillo dal pannello (già presente, ora documentato e coperto dal test) e **copia/incolla** — «Copia» nel pannello dello spillo mette negli appunti tipo, nome, descrizione, collezionabile e riferimento (in `sessionStorage`, sopravvive al cambio di mappa e alla ricarica); strumento «Incolla»: un tocco sulla mappa crea lo spillo identico nel punto toccato, poi si torna a «Seleziona» (gli appunti restano). Icone `azione-copia`/`azione-incolla` censite nel §17 | ✅ 2026-09-05 |
| 15.21 | «Batting Cage» → «Gabbie di Battuta» in `citta.json`, `attivita.json` e nello spillo del pacchetto `citta-yongen-jaya.json` (richiesta dell'utente, chiave invariata) | ✅ 2026-09-05 |
| 15.22 | Condizioni di visibilità degli spilli (richiesta dell'utente: «le stesse di oggetti e Confidenti, non quelle non calcolabili dall'app»): migrazione 029 `spillo.condizioni_json`, tipo condiviso `RequisitoSpillo` (`shared/condizioniSpillo.ts`: data, periodo, Palazzo completato, Dote, rango di un Confidente, richiesta dei Mementos, solo/mai con la pioggia, giorni della settimana, stagione, sblocco di un quartiere — solo quelli con una data nella Guida), validazione zod (date esistenti nel calendario di gioco, periodo con fine ≥ inizio) + esistenza delle chiavi nella Guida (400/404); all'importazione le condizioni con chiavi sconosciute sono scartate e contate; uno spillo del seed modificato conserva la propria identità (`seed_identita_json`, migrazione 030) e il reseed non lo duplica, `SpilloDto.condizioni` con testo in italiano e `disponibilita` con la partita (valutatore dei semafori), visore che nasconde gli spilli bloccati con «Mostra anche i non ancora disponibili (N)» e mostra i semafori nel popup e nella scheda, editor con costruttore a selettori (`CondizioniSpilloEditor`), copia/incolla e pacchetti che trasportano le condizioni; tutti gli spilli esistenti restano senza condizioni (decisione dell'utente). Test: shared, rotte, visore, editor | ✅ 2026-09-05 |
| 15.23 | Momento della giornata nella partita (richiesta dell'utente: «manca la condizione sul momento della giornata»): `partita.fascia_gioco` (migrazione 031, «giorno» o «sera», le due fasce della guida; predefinito «giorno», torna a «giorno» quando cambia il giorno corrente), pulsanti «Giorno»/«Sera» nella scheda «Oggi» (`useOggi.impostaFascia`, PUT `/api/partite/:id`), requisito `fascia` valutato con i semafori: condizione «Solo di giorno / Solo di sera» per gli spilli (`RequisitoSpillo` fascia) e lettura di «solo di sera», «solo la domenica sera», «aperto solo di giorno» nei testi di articoli e negozi (prima erano rumore). Mappa incorporata, negozi e articoli si ricaricano al cambio di fascia o di giorno | ✅ 2026-09-05 |
| 15.24 | Albero e passaggi allineati nell'editor delle mappe (richiesta dell'utente: «procedi con tutti e tre i punti»): (1) «Nuova mappa» crea anche lo spillo «passaggio» sulla mappa genitore (preselezionato) e, a scelta, il passaggio di ritorno nella nuova mappa (`POST /api/mappe` con `passaggio`/`ritorno`); (2) nell'elenco «Mappe figlie» le figlie che nessuno spillo raggiunge hanno la riga «Senza passaggio da questa mappa» con «Crea passaggio»; (3) sotto «Su» il pulsante «Crea passaggio di ritorno» quando nessuno spillo punta al genitore — `POST /api/mappe/:chiave/passaggi` sceglie il punto libero più vicino al centro (o in basso al centro per il ritorno), lo spillo viene selezionato e si trascina; 409 se già esiste. **Nuovi tipi di spillo** (da 20 a 34, `shared/spilli.ts`, palette a gruppi `GRUPPI_SPILLO`): città con le etichette della mappa del gioco — `distributore` rinominato «Bevande», `sigarette`, `cercalavoro`, `lavoro` (part-time), `terme`, `lavanderia`, `cinema`, `biblioteca`, `culto` (chiesa o tempio), `sala-giochi`, `casa`; Palazzi e Mementos — `timbro` (Timbro dei Mementos, collezionabile), `meccanismo`, `rampino`, `porta`. Riserve SVG in `IconaSpillo`, 14 asset `ui/spillo-<tipo>` censiti nel §18 (prompt + registro «DA CONSEGNARE»); il pacchetto `citta-yongen-jaya.json` riclassifica bagno pubblico, cinema, lavanderia e la casa di Sojiro Sakura; pulsanti della palette a 44 px (rilievo del validatore) | ✅ 2026-09-05 |
| 15.25 | Asset del repository predefinito per le nuove mappe (richiesta dell'utente): `POST /api/mappe` senza `asset` imposta `mappe/<chiave>` (`assetPredefinitoMappa` in `shared/spilli.ts`, lo stesso percorso di «Esporta questo luogo»; `null` esplicito = nessun asset); la finestra «Nuova mappa» mostra il campo precompilato che segue la chiave finché non lo si tocca e riparte pulita a ogni apertura; il modulo delle proprietà lo propone come segnaposto (vuoto = nessun asset) e la sezione «Immagine di base» distingue l'asset consegnato da quello non ancora consegnato (griglia). Documentato in MAPPE §3 come funziona il campo vuoto (immagine dell'istanza, poi griglia; il puntatore a un file non consegnato è innocuo). **Prompt completi per Codex** di tutti gli asset mancanti (richiesta dell'utente): §17.1 (azione-copia, azione-incolla) e §18.1 (i 14 spilli) di `docs/grafica/prompt-immagini.md`, con specifiche comuni ricavate dagli asset consegnati, colori esadecimali del registro e verifica di consegna; il registro `stato-generazione-asset.md` rimanda ai prompt | ✅ 2026-09-05 |
| 15.26 | Statistiche reali delle Persona (segnalazione dell'utente: Arsène al livello 2 mostra nel gioco FR 4 MA 2, l'app stimava FR 3 MA 3): la crescita nel gioco segue una ripartizione propria di ogni Persona che il dataset non ha, quindi l'app stima. Ora nella scorta si registrano i **valori reali** letti nel gioco a un livello (migrazione 032 `persona_posseduta.osservate_*` e `compendio_partita.osservate_*`, campo `osservate` dell'API): al livello registrato le statistiche coincidono con quelli, da lì in su la stima riparte da loro (`statisticheStimate` in `shared/statistiche.ts`) e i bonus ripartono da zero perché i valori reali li comprendono; sotto il livello registrato si torna alla base del dataset; «Dimentica» annulla. L'istantanea del compendio li conserva e l'evocazione dal Registro li ripristina. Scorta: campi «Valori reali nel gioco» nella finestra di modifica (precompilati con i valori attuali), chip «Valori reali» / «Stima» / «Stima dal liv. N» nell'elenco, evento storico `persona-statistiche` | ✅ 2026-09-05 |
| 15.27 | Due segnalazioni dell'utente sulla guida del giorno. (a) L'11 aprile il percorso proponeva «Rispondere alla domanda in classe (non determinante)»: la soluzione allgamestaff (settimana 1) non riporta alcuna domanda quel giorno (verificato sulla pagina), quindi l'azione è tolta da `percorso.json`; poiché le spunte sono salvate per (data, indice), la migrazione 033 toglie la spunta dell'indice 0 dell'11 aprile e scala di uno le successive in ogni partita. Le altre azioni «esame» senza una voce in `domande.json` (6 maggio, 7 luglio, gesso, esami, cruciverba) sono confermate dalla guida: le domande mancanti vanno aggiunte al seed (vedi decisioni aperte). (b) «La sera non mi vengono evidenziate attività»: la guida del giorno (scheda «Oggi» e pagina del percorso) evidenzia la sezione «Di giorno» o «Di sera» del momento corrente della partita con il chip «Adesso» e il bordo rosso (`GiornoGuida.fasciaCorrente`, solo per il giorno corrente) | ✅ 2026-09-05 |
| 15.28 | Il Confidente Il Matto si avvia la sera del 12 aprile, non dell'11 (segnalazione dell'utente, confermata dalla soluzione allgamestaff settimana 1: «Rango Confidente +1: Signore della Prigione, arcano Matto» dopo la cena con Ryuji): azione del percorso spostata in coda al 12 aprile, avviso del giorno aggiornato, requisito del rango 1 «dal 12 aprile» in `confidenti-requisiti.json` (prima «dal 11 aprile» con una nota che ammetteva lo scarto); migrazione 034 sposta l'eventuale spunta da 04-11/1 a 04-12/3. Avviata l'analisi sistematica delle 41 settimane della soluzione per riposizionare ogni azione del percorso e ogni regola dei Confidenti | ✅ 2026-09-05 |
| 15.29 | **Backup e ripristino dell'istanza** in Impostazioni (richiesta dell'utente: «un export di tutto il DB corrente su file da scaricare sul browser ed un sistema di reimport con replace dell'attuale DB»): `/api/impostazioni` con stato dell'istanza, esportazione del solo database (`getDb().backup()`, consistente col WAL) e dell'istanza completa in ZIP (database + immagini caricate + caratteri + manifesto + LEGGIMI), ripristino da `.db` o ZIP che **sostituisce** l'istanza previa validazione (firma SQLite, `integrity_check`, tabelle di base, `user_version`) e copia di sicurezza in `data/backups/prima-del-ripristino-…`, con rollback automatico se qualcosa fallisce; migrazioni, seed e cache in memoria rieseguiti a caldo. Sezione «Backup e ripristino» in fondo a Impostazioni con lo stato (dimensioni, partite, schema, copie) e conferma esplicita prima della sostituzione | ✅ 2026-09-05 |
| 15.30 | Il catalogo corretto diventa il punto di partenza di ogni istanza, non solo per i negozi (richiesta dell'utente: «tutto quello che io vado a modificare deve diventare asset/catalogo di default dell'app»): `esportaAttivitaSeed()` ricostruisce `data/seed/attivita.json` dal database — attività, libri, film, DVD e videogiochi — conservando l'ordine delle chiavi, i campi che il database non conosce (`campiEstranei`) e le condizioni proprie, e lasciando fuori le righe nascoste; `scripts/esporta-seed.ts` itera su un elenco di file e **deduce il rientro dal file stesso** (`rientroDi`: due spazi in `negozi.json`, uno in `attivita.json`), perché un diff che cambia tutte le righe non si legge; `sessioni` viene scritto solo se c'era o se è diverso dal valore predefinito della colonna. A tavolo pulito il giro completo è identico byte per byte su entrambi i file | ✅ 2026-09-07 |
| 15.31 | Le figure di categoria arrivano dove i dati le chiamano con un altro nome (difetto trovato integrando le 22 icone di Codex): le illustrazioni si chiamano al plurale, il catalogo parla al singolare — `arma` (143 righe), `protezione` (62), `accessorio` (72), `regalo`, `materiale`, `abito` — e il percorso dice `libro` e `lavoro`, quindi `ui/categoria-arma` non sarebbe mai esistito e quelle righe avrebbero tenuto il cartiglio di riserva pur avendo la figura pronta. `chiaveCategoria()` (`src/utils/categorie.ts`) riconduce le chiavi equivalenti a una sola figura; censita la §24 dei prompt con gli undici soggetti mancanti (i tipi di azione del percorso, che la Guida del giorno mostra a 40 px: di tredici tipi solo `dvd` aveva la sua figura) | ✅ 2026-09-07 |
| 15.32 | **Equipaggiamento** in Oggetti (5.2, parte armi/protezioni/accessori): 223 pezzi che l'app aveva già tradotti — nome italiano, effetto, vincolo — con l'API `/compendio/oggetti` che **nessuna pagina chiamava**, mentre il sottotitolo rimandava al Compendio, dove non c'erano. Nuova scheda con ricerca su nome italiano/originale/effetto, filtro per tipo (36 armi da mischia, 32 a distanza, 30 protezioni, 125 accessori) e per chi può indossarlo; il vincolo diventa i volti della squadra invece della frase (`RitrattoPersonaggio` ora riconosce anche «uomini» e «donne», le parole del vincolo, non solo «maschili»/«femminili» della guida); caricata solo all'apertura della scheda | ✅ 2026-09-07 |
| 15.33 | **Il vocabolario dell'estrattore fuori dalla vista** (atlante): quattordici mappe si presentavano come «Palazzo di Madarame — Immagini native che nessun campo usa — tela quadrata, disegno minuto — la seconda per estensione», e due di Kamoshida hanno cinque spilli ciascuna, quindi comparivano fra le aree vere; ora leggono «Planimetria non attribuita», numerate solo dove due etichette finirebbero uguali (`etichetteDistinte`, calcolata sull'elenco intero del Palazzo perché le due griglie stanno nella stessa pagina). Duecentottanta spilli su 1617 portavano il nome giapponese dello sprite — dodici perfino come byte Shift-JIS mai decodificati: la migrazione 053 traduce **il nome e non il significato** (lo spillo resta «Da identificare»), si rifà a ogni avvio e ha reso in italiano 233 righe. Le cinque decodifiche sono passate a Codex per la promozione a semantica vera | ✅ 2026-09-07 |
| 15.34 | **Il luogo della guida trova la sua planimetria**: venticinque luoghi su ottantasei non hanno uno spillo e l'app rispondeva col solo quartiere. La migrazione 054 **calcola** il collegamento invece di elencarlo — planimetria che porta il nome del luogo, stesso quartiere, solo dove manca lo spillo — e ne trova tre: Biblioteca e Cancello della scuola alla Shujin, Piazza della stazione a Shibuya. Infermeria e corridoio del 2° piano restano scoperti perché una planimetria dedicata non ce l'hanno, e un punto inventato è peggio di nessun punto | ✅ 2026-09-07 |
| 15.35 | **Domande in classe e cruciverba nel catalogo dell'utente**: erano le due cose che si consultano mentre il gioco aspetta una risposta, e le uniche rimaste di sola lettura. Migrazione 055 (colonne del catalogo su `domanda` e `cruciverba`, chiave ricavata dal **giorno** perché la posizione nel file non è un'identità), caricatore del seed che aggiorna e cancella solo le righe della guida e sa lavorare anche su schemi più vecchi di lui, editor delle **risposte giuste** a righe come quello delle Doti, editor delle condizioni nascosto dove la colonna non c'è, esportazione del seed estesa a `domande.json` e `cruciverba.json` (quattro file su quattro identici byte per byte a tavolo pulito) | ✅ 2026-09-07 |

## Analisi in corso: percorso giorno per giorno contro le 42 pagine della soluzione (2026-09-05)

Confronto automatico di tutte le 900 azioni di `data/seed/percorso.json` con le pagine allgamestaff (prologo + 41 settimane), una per agente, con citazione letterale obbligatoria: **704 azioni confermate, 562 differenze proposte** (122 gravi, 166 medie, 274 minori) salvate in `docs/analisi/verifica-percorso-grezza.json`. Tipi ricorrenti: eventi della guida assenti dal seed (160), note e testi imprecisi (157), fascia giorno/sera sbagliata (34), avvisi e ranghi dei Confidenti da correggere. Ogni differenza è in verifica da un secondo agente indipendente prima di toccare il seed; le correzioni verranno applicate a lotti per settimana, con migrazione di riallineamento delle spunte per (data, indice) come nelle 033 e 034.

## Decisioni e forniture aperte (aggiornato il 2026-09-05)

- Attribuzioni di negozio segnalate dalla rivalidazione (2026-09-05), da decidere con l'utente perché comportano spostare o togliere articoli: Kogatana nera e Veste nera non sono vendute da Untouchable (Jose dal 6 giugno / Yumenoshima dal primo settembre / Affari loschi di Tanaka); Fascia rossa, Fascia blu e Braccialetto d'argento → Tsurukame Diamond; Collana cremisi → Cristalloterapia Stoneon; Flan al tè matcha → Taisho Store; Crostatina angelo → Panetteria Yon-Germain; Succo Aojiru → Chiosco delle bevande del Sottopasso (non KiyasuKu); dieci articoli di Affari loschi di Tanaka (Nirvana Ring, Black Stone, Condenser Lens, Hercules Anklet, Heros Eyepatch, Magic Rosary, Atom Match, Retribution Mirror, Dispel Ring, Roland Medal) assenti dalla tabella Royal italiana. Articoli presenti nella guida ma assenti dal seed (Collare commemorativo, Cerotti rigenerativi e Adesivi SP della clinica, progressioni complete delle armi a distanza, prodotti di Big Bang Burger, Chiesa di Kanda, Super Muramasa, Yumenoshima, distributori) da aggiungere in un lotto dedicato.

- Domande in classe da riconciliare con la pagina «Interrogazioni ed esami» di allgamestaff fornita dall'utente il 2026-09-05 (date, professori, risposte, esami con date e criteri, ricompense degli esami, tempo libero con Kawakami, giorni del gesso di Ushimaru): lotto dedicato in coda (es. 6 maggio nel percorso contro 7 maggio «femme fatale» nella pagina; 7 luglio Via Lattea/Somen assente da `domande.json`).
- Risposte dell'utente attese: registrazione delle note alla spunta di un'azione Confidente (A: chiede «quante note?» con 2 preselezionato; B: assume 3; C: nessun automatismo — consigliata A); semafori non verificabili con conferma manuale; conferma della Fase 13 e delle sue due decisioni; conferma di 12.7; `concurrency` per ramo nel workflow CI (`cancel-in-progress: false`).
- Grafica richiesta: completata e approvata il 2026-09-06, incluse le ultime 2 icone di azione e i 14 spilli. Registro: `docs/grafica/stato-generazione-asset.md` (684/684).

## Requisiti trasversali (sempre validi)
- Tutto in italiano; nomi Persona originali; skill con chiave canonica + resa IT modificabile.
- Tablet-first ma **anche mobile** (375px) e desktop.
- Partite multiple con partita attiva selezionabile.
- Dati di gioco e dati utente separati; seed nell'immagine Docker, DB sul volume.

## Integrazione autorizzata 2026-09-05
- Completato e validato: catalogo personale, agenda e conservazione delle spunte durante il reseed (379 test iniziali).
- Completato e validato: quartiere selezionabile, negozi ricercabili senza prodotti, prodotti responsive e dettagli espandibili.
- Completato e validato: condizioni procedurali condivise, naming mappe gerarchico, editor in quattro sezioni, ingresso quartieri con mappa/punto/zoom.
- Completati e validati: 16 asset mancanti, PNG 128×128 RGBA; test applicativi 400/400 prima dell’integrazione parallela dell’atlante. Runtime verificato su istanza isolata.

## Mondo navigabile unico (2026-09-06)
- Validato: risoluzione comune entità → mappa/pin, incluse provenienza, alternative, alias e articoli → negozio.
- Da completare: associazioni native, importazione delle planimetrie estratte, collegamenti reali, semantica e condizioni dei pin, accessi dalle pagine Mappe/Palazzi e Dedali/Città/Negozi e inventario, migrazione protetta e collaudo completo. Il mondo unificato non è ancora consegnato.

- Validato: servizio comune di accesso al mondo, incluso luogo ↔ negozio e articolo → negozio, con regressioni e runtime isolato.
- Validato: accessi principali unificati nelle pagine, conservazione schede/editor/ingressi, protezione risposte tardive. La sostituzione delle mappe correnti con dati nativi resta aperta.
- Planimetrie native: pacchetto portabile di 301 canvas verificati pixel per pixel, importazione isolata di 301 immagini e 21 gruppi di risorse, zero mappe saltate; 7 viste urbane conservate a parte. Staging validato; collegamenti fisici e condizioni narrative ancora da integrare.
- Importatore: validato il limite di 64 MB sulla sola POST di importazione, prima del limite globale di 5 MB; 27 test, typecheck, lint e build superati.
- Requisiti del mondo: accessibilità e interazioni devono seguire giorno, fascia, meteo, avanzamento, confidenti e Persona della partita attiva. Il livello delle Persona non è ancora tra i requisiti delle mappe. La rigenerazione di un vecchio pin al riavvio, osservata nell’istanza isolata, deve essere risolta prima della migrazione definitiva.

## Fasi 5-7 — interfaccia, grafica e revisione (aggiunte il 6 settembre 2026)

Richiesta dell'utente, da affrontare dopo il completamento delle fasi 0-4. Il dettaglio e la
divisione del lavoro con Codex stanno in `docs/ATLANTE-STATO.md`, sezione «Ampliamento del piano».

- **Fase 5 — pagine dell'app.** Layout grafico e moderno per desktop, tablet e cellulare su Mappe,
  Palazzi e Dedali, La città, Negozi e inventario, Attività e doti sociali, Covo dei ladri,
  Oggetti, Materiali e fabbricazione, più le categorie di oggetti delle guide che oggi non hanno
  una pagina. Ogni riferimento alla mappa passa dal risolutore dell'atlante unificato, e la
  posizione si vede già in pagina.
- **Fase 6 — elementi grafici.** Segnalini rigenerati come PNG con alfa reale e sola figura (la
  forma del pin la disegna l'app); copertura di tutta l'interfaccia dove oggi manca l'asset. Le
  immagini le genera Codex, i prompt li scrive e li verifica Claude.
- **Fase 7 — revisione incrociata.** Passata sui difetti sfuggiti, con la regola che chi implementa
  non verifica e viceversa.

## Punti aperti al 8 settembre 2026 (emersi usando l'app, non dal piano)

Le 115 voci qui sopra sono chiuse e validate, e la collaborazione con Codex sulla grafica è
conclusa: §24, §25, §26 e §27 sono consegnate, integrate e verificate — 54 icone di azione, 32
tessere, 33 categorie, 23 illustrazioni di attività, 39 spilli, 12 segni, 11 fregi, nessuna chiave
del codice senza figura e nessuna figura orfana. Quel che resta è nato **usando** l'app, e sta qui
perché non si perda.

### 1. I punti delle Doti hanno due sorgenti che non si parlano — decisione aperta

Segnalato dall'utente: cinque visioni registrate di un film che dà «Coraggio ♪♪♪» hanno lasciato
Coraggio a zero. Cercando ogni riga che tocca i punti, i posti sono tre e nessuno è il «+» delle
pagine di tracciamento: i pulsanti della scheda Doti, la risposta giusta a una domanda in classe, e
la spunta di un'azione nella guida del giorno (`percorsoService.applicaEffetti`). `impostaLettura`
scrive l'avanzamento e un evento nello storico, e nient'altro — vale per film, libri, videogiochi e
attività, non è un difetto di una pagina sola.

E il rovescio: spuntare l'azione nella guida dà i punti ma **non** fa avanzare le visioni del film.
Non c'è doppio conteggio solo perché ciascuno dei due fa metà lavoro.

**Fatto intanto** (nessuna decisione richiesta): le tre pagine dichiarano che il «+» segna
l'avanzamento e non i punti, e dicono dove prenderli — `NotaPuntiDote`. Lasciar credere il
contrario era la parte inequivocabilmente sbagliata.

**Da decidere**: unire le due sorgenti. La strada consigliata è che il tracciamento diventi
l'**unica** sorgente e la guida del giorno smetta di applicare gli effetti per le azioni che
puntano a un elemento tracciato — così il doppio conteggio è impossibile per costruzione e non per
attenzione. Applicare i punti anche dal «+» senza toglierli di là li conterebbe due volte in una
partita vera, ed è un errore che si scopre settimane dopo, quando non si sa più quali punti fossero
veri.

### 2. «Prima visione» e «visioni successive» non sono rappresentabili

La riga di un film ha **un** campo `dote` e **un** campo `note`. «Prima visione +3, successive +1»
esiste solo come prosa dentro `dettagli`, quindi l'app non potrebbe applicarla nemmeno volendo.
Serve modellare i due valori e ricompilare i titoli leggendo la guida: è lavoro sui dati prima che
sul codice, e va fatto una volta bene. Dipende dal punto 1, e va fatto prima.

### 3. Pulizia del repository — quasi chiusa

`data/atlas` e `tools` vivono in [project-p5r-atlante](https://github.com/merlinoalbus/project-p5r-atlante)
(privato) e non esistono più in nessun commit di questo: main passa da 7283 a 1955 file, tolti
esattamente i 5328 attesi, nessun altro file toccato. Il pacchetto scende da 717 a 527 MB — meno
dei 300 stimati, perché l'atlante è quasi tutto JSON e git lo comprimeva già 4:1; i 513 MB che
restano sono `public/asset`, dove il taglio vero è l'ottimizzazione delle immagini (arcani e
confidenti pesano un mega l'uno per essere mostrati a 24-56 px).

Restano da cancellare 10 rami locali già interamente contenuti in main, e il `gc` che libera lo
spazio. Il backup completo pre-riscrittura è in `_backup-project-p5r-20260908.git`.

## Stati e condizioni (11 settembre 2026) — fatto

Lotto 1 del rifacimento di mappe, negozi, oggetti, effetti e stati
(`docs/analisi/2026-09-11-modello-mappe-negozi-oggetti.md`). Catalogo chiuso degli stati
(`shared/statiPartita.ts`), convertitore prosa→stati completo (`shared/migraCondizioni.ts`,
0 scarti su 516 righe), valutatore unico senza lettura di prosa (`disponibilitaService`),
migrazione 064 (324 righe convertite, via `fatto_gioco`), editor unico E/O/NON con ricerca negli
elenchi, scheda **Partita → Progressi** per eventi, attività svolte e punti negozio.

Lotti successivi, nell'ordine concordato: (2) categorie di spillo — spostamento, città,
consumabile, informativo — e «Ingresso al Palazzo»; (3) scheda spillo con destinazione mappa +
spillo; (4) visore e popup (negozio/attività nel riquadro); (5) layout sui tre formati.

## Categorie di spillo, scheda, visore e layout (12 settembre 2026) — fatto

Consegna unica dei lotti 2-5 dell'analisi: quattro categorie di spillo applicate dal server
(migrazione 065, «Ingresso al Palazzo» nuovo), destinazione «mappa + spillo» (arrivo con la mappa
adattata e lo spillo selezionato), scheda dello spillo per categoria («Porta a» / «Collegato a»
con ricerca), popup del visore per categoria (merce del negozio disponibile adesso, «Vai», «Raccolto»),
popup dentro la tela e foglio dal basso sotto i 768 px. Restano da rivedere, con l'utente, i layout
delle altre pagine sui tre formati man mano che emergono difetti.

## Selettore unificato (12 settembre 2026) — fatto

Primo lotto della consegna «struttura, non frasi» (piano del 12 settembre): un solo elenco chiuso in
tutta l'app, `src/components/shared/Selettore.tsx`, al posto delle 62 tendine native. Ricerca
scrivendo da dieci voci in su (o sempre, sugli elenchi della Guida), voce «nessuna scelta» in testa,
gruppi, tastiera, 44 px sul touch anche nella variante compatta dei filtri e nei campi dell'editor. Una regola ESLint e il test
`src/selettoriUnificati.test.ts` vietano ogni `<select>` nel frontend; `lint:ci` copre tutto il
repository. Prossimi lotti, nell'ordine del piano: Personaggi + Città (navigazione, tipi di luogo,
ingresso), architettura dei dati (DB di gioco separato dalle partite, pacchetto con le immagini),
modello del catalogo (orari, condizioni sugli articoli, sedi, effetti dichiarati, attività
strutturate), server e UI delle pagine, Progressi calcolati, export/import.

## Personaggi e Città: navigazione, tipi di luogo, ingresso (12 settembre 2026) — fatto

Voce 2 del piano «struttura, non frasi». Il Protagonista, Caroline, Justine, Lavenza e Jose hanno
le stesse due immagini dei Confidenti (ritratto fedele di default, stilizzato in alternativa).
Nella Città il cartellino sulla mappa apre la planimetria nel mappamondo, la scheda a fianco apre
la pagina del quartiere. I tipi di luogo sono un catalogo condiviso (`shared/tipiLuogo.ts`: chiave,
nome, colore, icona) che ordina i filtri della scheda del quartiere e vale anche per i luoghi che
l'utente aggiungerà (lotto del modello dati). «Fonte» tolta dalla scheda del quartiere e dei luoghi
(resta il credito di licenza della pianta scaricata). L'ingresso del quartiere si imposta con due
gesti: mappa da un elenco con ricerca e tocco sull'immagine, che salva subito; ingrandimento a tre
pastiglie; coordinate esatte sotto «Avanzate». Lo spillo del luogo sulla pianta e il colore della
pastiglia vengono dallo stesso catalogo: la corrispondenza luogo → spillo vive in `shared/tipiLuogo.ts`
(«scuola» è ora una biblioteca, prima era «attività»; «servizio» resta sull'icona generica) e gli spilli di
seed rimasti al tipo vecchio si riallineano all'avvio (`riallineaSpilliLuoghi`), senza toccare i tipi
più fini assegnati dai pacchetti (terme, cinema…). Verificato a 1280, 768 e 375 px.

## Architettura dei dati: due file, pacchetto di gioco, seed dismesso (12 settembre 2026) — fatto

Voce 3 del piano «struttura, non frasi». `gioco.db` (dati di gioco) e `partite.db` (partite, schema
«utente» attaccato alla stessa connessione) al posto del file unico: sostituire il DB di gioco non
tocca l'avanzamento. Migrazione 066 di split (dal vecchio `project-p5r.db`, rinominato al primo
avvio), 067 con l'`uid` degli spilli e `spillo_partita` per uid (migrazione «utente» 002), due
sequenze di migrazioni con il proprio `user_version`. Il seed JSON, il suo caricatore, l'esportatore
e la pipeline sono stati dismessi: la sorgente è `pacchetto/gioco.db` (+ `pacchetto/immagini/`),
generato dal salvataggio della produzione con `npm run pacchetto -- --da-istanza`, copiato in
`DATA_DIR` al primo avvio. I test caricano il pacchetto in memoria (`caricaPacchetto`). Backup ed
esportazione dell'istanza portano entrambi i file; il ripristino accetta anche il vecchio file unico.
Tolti il pacchetto «per il repository» dell'editor mappe e gli script del seed. L'export/import del
pacchetto di gioco dall'app è la voce 10.

## Modello dati del catalogo: migrazioni 068–078 e utente 003 (12 settembre 2026) — fatto

Voce 4 del piano «struttura, non frasi». Tutto ciò che era una frase interpretabile diventa un
valore: `negozio.orari_json` (069, dizionario esatto sulle 21 frasi dei dati), le condizioni di
sblocco dei negozi sugli articoli (070: il negozio non «sparisce», l'articolo dice «non ancora»),
`luogo` catalogabile con origine/nascosto/seed_json/condizioni_json (071, regole da
`sblocco-luoghi`), `sede_chiave` di negozi e attività verso `luogo` (072: 57/60 e 29/30, sette
luoghi nuovi, tre negozi e un'attività dichiaratamente senza sede), articoli delle librerie
collegati ai libri e articolo per ogni videogioco (073), `effetti_json` su libri, film e attività
(074: dote, visioni successive, «sblocca un quartiere», pioggia per lo studio), `paga_yen`/
`paga_massima`/`dettagli`/`tracciamento` delle attività (075), `programma_punti_json` (076),
`dungeon_area.timbri_totale` + `timbri_dedalo_partita` (077 e utente 003), `domanda.tipo='tv'` e
quesiti degli esami sulle righe (078). La 068 ripassa i residui «da configurare» (nessuno nel
pacchetto). Ogni migrazione ha il suo test (riga sintetica + dati del pacchetto); pacchetto
rigenerato alla 78. Le colonne vecchie (`orari`, `paga`, `dote`/`note`, `doti_json`) restano
finché il server (voce 5) e le interfacce (voci 6–8) non leggono i valori nuovi.

## Server del catalogo, della città, dei Palazzi e dei Memento (12 settembre 2026) — fatto

Voce 5 del piano «struttura, non frasi»: il server legge i valori delle migrazioni 068–078 e non
più le frasi. Negozi: la disponibilità è solo gli orari (`orariStrutturati`, `orariTesto`,
condizioni `giorno-settimana`/`fascia`/`meteo`), gli articoli ereditano gli orari (`daNegozio`) e
portano lo sblocco che era del negozio; `sedeChiave`/`sedeNome` e `programmaPunti` nel DTO; la
ricerca degli articoli filtra per più categorie, stato d'acquisto e disponibilità. Luoghi: righe
del catalogo (tipo `luogo`, chiave `<quartiere>/u-…`, nascondibili), negozi e attività dalle sedi,
condizioni dalla riga; `GET /api/compendio/luoghi` per la scelta della sede; il visore aggancia il
negozio al luogo tramite la sede. Letture: `effetti`/`effettiTesto` su libri, film e attività, i
punti Dote da `dotiDaEffetti` con le condizioni della voce valutate sulla partita, «sblocca un
quartiere» dagli effetti, `negozi` (dove si compra) su libri e videogiochi, `sede`/`tracciamento`/
`pagaYen` sulle attività, righe nascoste escluse, lettura non disponibile rifiutata (409). Palazzi:
`raccolta` (collezionabili dell'albero `dungeon-<chiave>`, presi per uid o punto gestito),
`planimetrie` con gli spilli e `aree[].mappe[].spilli`; Memento: `dedalo` per area (timbri
dichiarati + richieste, obiettivi), `PUT /api/partite/:id/timbri` (`timbriService`), evento
`timbri-dedalo`. Richieste ordinate per dedalo con `dedali`; domande: `prossime` = il prossimo
appuntamento; cruciverba: `dataGioco` e `prossimo`. Catalogo: schemi per valori (orari, effetti,
tipo/fascia/tracciamento, sede con l'invariante del quartiere, film al cinema in una visione,
paga solo ai lavori), `GET /api/catalogo/:tipo?nascosti=1&negozio=`. Il frontend è adattato al
minimo (Palazzi, quartiere, negozio, tipo «luogo» nel modulo): le interfacce sono le voci 6–8.

La voce 11 ha poi strutturato `luogo.giorni` (`giorni_json`, migrazione 080). La scheda del Palazzo
è stata allineata dalla voce 8 (anello ed elenco contano la stessa raccolta). Le note su `disponibile_dal`, `orari` come frase e la nota semplice di una Dote con voci
condizionate sono chiuse dalla voce 6: il modulo scrive solo valori (`orari_json`, `effetti_json`,
condizioni).

## UI di negozi, articoli e rimossi (12 settembre 2026) — fatto

Voce 6 del piano «struttura, non frasi»: il modulo del catalogo scrive solo valori. `ModuloCatalogo` è
un guscio (finestra, Salva, Ripristina/Elimina, Nascondi, spunta «Confermato», editor delle
condizioni) e ogni tipo ha il suo modulo in `src/components/guida/moduli/` con una definizione pura
(`iniziali`/`valido`/`prepara` in `definizioni.ts`, provate senza interfaccia) e un componente:
negozio (tipo a tessere, sede con `SceltaLuogo`, Confidente dall'elenco, `OrariEditor`, programma
punti), articolo (`SceltaOggetto` sul selettore con ricerca sempre aperta, poi categoria a tessere ed
effetto dichiarato con `EditorEffetto`), libro, film (dove a tessere, una visione al cinema, «vale
anche alle volte successive» solo lì), attività e videogioco (tipo e fascia a tessere, paga solo ai
lavori, conteggio, `EditorEffetti` con condizioni per voce), luogo, domanda e cruciverba. Componenti
condivisi: `SelettoreIcone` (tessere ≥44 px, radiogroup o interruttori), `FiltriArticoli` con il
filtro come valore (`src/utils/articoli.ts`: ricerca, categorie multiple con conteggio, «Per chi»,
segmenti Acquistati/Da acquistare e Disponibili/Bloccati, letto e scritto nell'indirizzo). Pagine:
`NegoziPage` (filtri nell'indirizzo, ricerca sul server con `categorie`/`stato`/`disponibilita`,
sede e orari sulle schede), `NegozioPage` (sede linkata, orari, programma punti, filtri sull'elenco,
blocco «Rimossi» del negozio; via sblocco, condizioni in prosa, fonte, «nota originale»),
`RimossiPage` (`/guida/rimossi`, un blocco per tipo con il ripristino in un tocco; link da
Negozi e da «I miei dati»). Verifica a 1280/768/375: nessun overflow, bersagli ≥44 px su tablet e
telefono, tessere a tre per riga sul telefono; giro completo nel browser (articolo creato a mano
con effetto dichiarato → salvato → corretto → eliminato; articolo della guida nascosto → nel blocco
«Rimossi» senza ricaricare → rimesso negli elenchi). Validatore: tre rilievi bloccanti corretti
(link della sede alla pagina del quartiere con l'ancora del luogo, «Dove» per i negozi senza quartiere,
campi vuoti della domanda come stringhe) e sette non bloccanti chiusi (elenco unico dei personaggi, CSS
morto, nome del negozio nei rimossi, valori fuori elenco conservati, «gradito a» per i regali, legame
perso segnalato e conservato, figura delle famiglie in `shared`).

## UI di libri, film, videogiochi e attività (12 settembre 2026) — fatto

Voce 7 del piano «struttura, non frasi»: le quattro pagine leggono i valori delle voci 4–5 e non più le
frasi. `LibriPage`: titolo unico, «Dove» = i negozi collegati come collegamenti con il prezzo
(`negozi`) più i luoghi che non sono negozi, «Che cosa fa» = `effettiTesto`, «Apre» = il quartiere
sbloccato, «+ Sessione» spento con il libro non ancora disponibile e il motivo scritto sotto
(`motivoBlocco`), filtro Dote dagli effetti, stato con i `Segmenti`. `FilmPage`: la figura dice
cinema o DVD, «quando» sono le condizioni (non più `periodo`), gli effetti dichiarati con «anche
alle volte successive», «Visioni per completarlo» solo ai DVD, al cinema senza tetto, supporto e
stato con i `Segmenti`, nota sui punti aggiornata (l'app applica gli effetti delle visioni successive).
`VideogiochiPage`: sede, «Che cosa fa», «In vendita da» (articoli collegati con il prezzo, «Gratis» a
0 ¥), «+ Round» spento se bloccato, dettagli; griglia come le pagine sorelle. `AttivitaPage`: tipo e
fascia da `shared/attivita`, sede linkata alla pagina del quartiere con l'ancora del luogo, paga in yen
(`pagaTesto`), effetti come chip con la condizione, `dettagli` come testo unico; via regole/premi/altri
effetti/Doti alzate/sblocco in prosa e la fonte da tutte e quattro. `LettureEGiochi` (Partita): al cinema
il «+» resta attivo a titolo finito, con la riga bloccata resta spento con il motivo. `Segmenti` è un
componente condiviso (`src/components/shared/`), `src/utils/letture.ts` raccoglie ciò che le pagine
hanno in comune (`haDote`, `bloccata`, `motivoBlocco`, `formattaYen`, `prezzoChip`, `pagaTesto`,
`STATI_LETTURA`/`passaStato`). Negli effetti la Dote si scrive col nome («Conoscenza ♪♪♪»,
`NOME_DOTE_EFFETTO` in `shared/effettiOggetto.ts`). Verifica a 1280/768/375 senza overflow e con
bersagli ≥44 px; controllo nel browser con la partita all'11 aprile (libri, film e giochi non ancora
disponibili con il motivo; Tanaka e i lavori con paga e sede). Validatore: un bloccante corretto (le chip-link di
negozi e videogiochi erano sotto i 44 px: aggiunta la classe `touch`, rimisurate a 375/768/1280) e i non
bloccanti chiusi (campo `dove` morto in `LettureEGiochi`, riga «Sessioni» irraggiungibile, prop `className`
speculativa dei `Segmenti`, commento sulla paga, `NOME_DOTE` riesportato da `shared`).

## UI di Palazzi, Memento, Richieste, domande e cruciverba (12 settembre 2026) — fatto

Voce 8 del piano «struttura, non frasi» (sezioni G–J). `DungeonDettaglioPage`: la colonna di destra
è **quel che fa la percentuale** — nei Palazzi i collezionabili delle planimetrie (`RaccoltaPlanimetrie`:
quelli dell'area scelta e, ripiegate, tutte le planimetrie del Palazzo, con «Raccolto» in un tocco via
`PUT /api/partite/:id/spilli/:spilloId` e l'anello aggiornato senza ricaricare), nei Memento gli
obiettivi del dedalo (`ObiettiviDedalo`: timbri con −/+ da 44 px «su N» via `PUT /api/partite/:id/timbri`,
«non dichiarati dalla guida» dove il totale manca, richieste con Accettata/Completata/Riapri); i punti
della guida (sicure, enigmi, boss) stanno in una piega «Dalla guida» con Ottenuto/Esaurito e non contano;
l'elenco delle aree dice quanto resta con la stessa misura dell'anello; per i Memento la «Pianta della
guida» non c'è più (i piani si generano). `RichiestePage`: ricerca (nome, bersaglio, forma demoniaca,
Confidente, dedalo, committente), segmenti indipendenti Accettazione × Completamento, dedalo dal
`Selettore` sui `dedali` in ordine di percorrenza con i conteggi, tenuto in `?dedalo=` (dalla scheda del
dedalo si arriva già filtrati); niente fonte. `DomandePage`: una rappresentazione sola (righe per data
con il quesito accanto a ogni risposta degli esami; la sezione «Esami» dice date, risultati e premi
senza ripetere le domande), il prossimo appuntamento evidenziato nel suo mese con il rimando in cima,
ricerca (domanda, risposte, chi, data), segmenti Tipo [Tutte | In classe | Esami | Quiz TV] × Stato.
`CruciverbaPage`: mesi, prossimo cruciverba evidenziato con il rimando, ricerca (data, indizio,
risposta), segmenti di stato. API FE: `impostaTimbri`. Verifica a 1280/768/375 senza overflow e con bersagli
≥44 px (link compresi); giro nel browser sulla partita (forziere raccolto e riaperto con l'anello che segue e
il server allineato; timbro +1/−1 e richiesta accettata/riaperta nel Dedalo di Aiyatsbus, tutto riportato a
zero). Validatore: tre bloccanti corretti — la colonna del Palazzo mostra subito tutta la raccolta quando
l'area non ha planimetrie legate (132 collezionabili su 185 non stanno in nessuna area) e la voce dell'area
dice «nessuna planimetria legata»; la Dote di Conoscenza si accredita solo alle domande in classe
(«Conoscenza +…»), non agli esami; i link delle planimetrie e delle richieste sono bersagli da 44 px — e i
non bloccanti chiusi (testo dei Memento, conteggi dei dedali nel selettore delle Richieste, rilettura della
raccolta dopo Ottenuto/Esaurito, numerazione fra gli omonimi, pulsanti occupati per riga).

## Progressi calcolati (12 settembre 2026) — fatto

Voce 9 del piano «struttura, non frasi» (sezione K). **Gli eventi «entra in squadra» si calcolano** solo da
`membro_squadra_partita.in_squadra`: `EVENTI_STORIA` porta il legame statico evento → Ladro (`membro`,
`membroDellEvento`), il valutatore (`disponibilitaService`, caso `evento`) risponde con tre stati — verde in
squadra, rosso dichiarato fuori, grigio non segnato — senza date canoniche; `PUT /api/condizioni/partite/:id/
eventi/<calcolato>` risponde 400 `evento-calcolato`; la migrazione utente 004 cancella le righe manuali dei
quattro eventi. **Attività conteggiabili**: `/api/condizioni/elenchi.attivita` e i progressi elencano solo
`tracciamento = 'svolta'` (12 righe: 6 mini-giochi, 4 lavori, 2 sfide); il PUT su un'attività non
conteggiabile risponde 400 `attivita-non-conteggiabile`. **Negozi con programma punti**: `/elenchi.negozi`
porta `programma` (`manuale` | `rango-cliente` | null); l'editor delle condizioni offre «punti negozio»
solo ai programmi manuali e «grado cliente» solo a chi ha il rango; il PUT dei punti su un negozio senza
programma manuale risponde 400 `negozio-senza-punti`. **`ProgressiPartitaDto`** (`GET /api/condizioni/
partite/:id/progressi`) in due parti: calcolati (eventi con `origine: 'calcolato'` e `avvenuto` a tre
stati, `rangoCliente` con spesa, grado e prossima soglia, `contatori`) e da segnare (eventi manuali,
attività per volte, punti dei negozi manuali con nome e unità del programma). **UI** `ProgressiPartita`:
«Calcolati dalla partita» (sola lettura: pallini a tre stati con il rimando a Denaro e squadra, grado cliente
di Tanaka con spesa e prossima soglia, contatori) e «Da segnare» (3 eventi manuali, 12 attività, il negozio a
punti manuali). Verifica a 1280/768/375 senza overflow e con bersagli ≥44 px; test server (tre stati dalla
squadra via `PATCH /api/partite/:id/squadra/:chiave`, rifiuti 400, elenchi filtrati), test della migrazione
utente 004 e del componente.

## Immagini nel database e pacchetto di gioco (12 settembre 2026) — fatto

Voce 10 del piano «struttura, non frasi» (sezioni L/M), con la **correzione di una decisione registrata male**: il
piano diceva «asset di gioco png esterni al DB», ma l'utente non l'ha mai chiesto; la regola giusta è «in
`public/asset/` restano solo compendio (persona, arcani, skill) e interfaccia (`ui/`), tutto il resto va dentro il
database». **Migrazione 079 `immagini_nel_database`**: colonna `immagine.contenuto BLOB`; assorbe (1) i file delle
righe esistenti da `DATA_DIR/immagini` e `pacchetto/immagini`, (2) le 16 famiglie della grafica di gioco di
`public/asset/` (affinita, attivita, confidenti, decori, doti, elementi, guida, identita, illustrazioni, mappe, meteo,
palazzi, persona-gruppo, personaggi, sfondi, spilli: una riga per file, chiave del manifesto, `webp` preferito a
`png`), (3) il `pacchetto/gioco.db` del repository quando ha già le immagini dentro (così un'istanza aggiornata dopo
la rimozione delle cartelle le prende da lì); idempotente, in memoria salta le sorgenti pesanti. `shared/immagini.ts`
distingue gli ambiti di **caricamento** (8, quelli di prima) dalle famiglie **predefinite** (16); `immaginiService` legge
e scrive solo nel database (`GET /api/immagini/:ambito/:chiave/file` risponde dal BLOB con ETag e 304; `GET
/api/immagini/manifest` è la grafica di gioco nella forma del manifest degli asset); elenco e rimozione in blocco
toccano solo gli ambiti di caricamento. **Frontend**: `assetStore` unisce `/asset/manifest.json` (compendio e ui) e
`/api/immagini/manifest` (database; vince a parità di chiave), quindi `useAsset('mappe/tokyo')` non cambia; gli URL
statici delle sagome di Tokyo, degli strati dei Mementos, dei Palazzi e del Covo passano da `urlImmagine`.
`regoleAllAvvio` assorbe le immagini rimaste su disco e mette da parte `DATA_DIR/immagini` in `backups/`; il backup di
avvio si fa solo quando c'è una migrazione da applicare (il file di gioco pesa ~310 MB). **Il pacchetto di gioco è un
solo file `gioco.db`** (761 immagini dentro, 305 MB): `pacchetto/immagini/` e le 16 cartelle di `public/asset/` sono
tolte dal repository; `npm run pacchetto` non copia più file. `pacchettoGiocoService`: `esportaPacchetto` (= la copia
di gioco.db), `anteprimaPacchetto` (versione dello schema contro l'ultima migrazione — un pacchetto più nuovo non si
importa —, conteggi per tabella a confronto, tabelle assenti, immagini, **orfani** delle partite calcolati su 30
riferimenti utente→gioco attaccando `partite.db` al file caricato), `importaPacchetto` (copia di sicurezza, chiusura,
sostituzione di gioco.db, riapertura con migrazioni e regole dell'avvio, orfani ricalcolati; rollback con
`tornaAllaCopiaDiSicurezza`, fattorizzata dal ripristino dell'istanza). Rotte: `POST /api/impostazioni/istanza/gioco/
anteprima`, `PUT /api/impostazioni/istanza/gioco`; il download è `GET /istanza/database`. **UI**: card «Pacchetto di
gioco» in Impostazioni (stato, «Scarica il pacchetto di gioco», «Importa un pacchetto» con anteprima obbligatoria —
schema, tabelle che cambiano, immagini, orfani — e finestra d'esito con gli orfani e «Ricarica l'app»); la card
«Backup e ripristino» non offre più il solo database. Test: migrazione 079, API immagini (manifesto, famiglie protette,
ETag), `impostazioniService` e `pacchettoGiocoService` su istanza reale, `assetStore`, `PacchettoGioco`,
`BackupIstanza`, pagina Città. **Un solo file `gioco.db` in due stati** (decisione dell'utente: il completo pesa 311 MB contro il limite
GitHub di 100 MB, niente LFS per ora): in git `pacchetto/gioco.db` iniziale, senza immagini, che il primo avvio copia
per aprire l'interfaccia; il completo vive in locale in `pacchetto/completo/gioco.db` (ignorato, `pacchetto/README.md`)
e **il caricamento iniziale completo avviene sempre con l'importazione dall'app**, che sostituisce il file dell'istanza;
la card avvisa finché non è importato (`StatoIstanzaDto.completo`; `vuota` se manca anche l'iniziale).

## Pulizia e documentazione (12 settembre 2026) — fatto

Voce 11, l'ultima del piano «struttura, non frasi». **Migrazione 080 `giorni_luogo_strutturati`**: `luogo.giorni_json`
(chiavi dei giorni della settimana, vuoto = nessuna limitazione) al posto della frase `giorni`; la conversione legge solo
l'elenco che precede la parentesi e mette la precisazione, com'era scritta, nelle `note` («Giorni (dalla guida): domenica
(regolare) e festività»); 8 luoghi convertiti, 2 con nota. `presenzaEntita.giorniDaJson` sostituisce `giorniDaTesto`;
`LuogoDto.giorni: GiornoChiave[]` + `giorniTesto` (`descriviGiorni`, ora esportata da `shared/orariNegozio`); lo schema
`datiLuogo` accetta `giorni_json` come elenco di chiavi e il modulo del luogo li sceglie a chip (`Interruttori` di
`OrariEditor`). **Campi di prosa tolti dai DTO** perché nessuna pagina li leggeva più: `FilmDto.periodo`,
`NegozioRiassuntoDto.orari` (la frase; resta `orariStrutturati`/`orariTesto`; anche lo schema `datiNegozio` non accetta più `orari`) e `sblocco`, `fonte` di articolo, negozio,
libro, film, attività, luogo e cruciverba (le colonne restano nel database per il credito, non si scrivono più dal
modulo). `SelettoreRicerca.tsx`, alias di `Selettore` senza più importazioni, è cancellato. Il modulo del luogo, che nessuna pagina apriva,
si apre ora dalla scheda del quartiere («Aggiungi un luogo», «Correggi» su ogni card). **Migrazione 081 `istantanee_luogo_giorni`**:
le istantanee `seed_json` dei luoghi ricevono `giorni_json` (e la nota) dalla loro frase, e le righe della guida rimaste senza
istantanea la riacquistano; `eliminaElemento` ha comunque il ripiego dalla frase. Nello schema i giorni sono salvati nell'ordine
della settimana e `datiNegozio` non accetta più `orari` in prosa. Pacchetti rigenerati alla 081.
Test: migrazione 080 (frasi, idempotenza, pacchetto), fixture allineate; typecheck, lint e suite verdi.

## Caricamento del pacchetto su un'istanza pubblicata (12 settembre 2026) — fatto

Correzione nata da un caso reale: sull'istanza pubblicata l'importazione del pacchetto (311 MB) falliva subito con
«Failed to fetch», e in locale l'invio non mostrava alcun avanzamento. Causa: `client_max_body_size 10M` sulle rotte
`/api/` di `nginx.conf` (il backend non riceveva nulla), più il tunnel Cloudflare che si ferma a 100 MB di corpo.
Fatto: **importazione da indirizzo** (il server scarica il pacchetto, dal browser parte solo l'URL:
`POST /istanza/gioco/anteprima-da-url`, `PUT /istanza/gioco/da-url`, `server/utils/scaricaDaUrl.ts` condiviso con le
immagini); **barra di avanzamento** dell'invio (XMLHttpRequest, `BarraInvio`, percentuale e MB) anche nel ripristino
dell'istanza; **niente più timeout complessivi** che uccidevano gli invii lenti (client: inattività di 10 minuti;
Node: `requestTimeout` a 30 minuti; nginx: 1800s e 1 GB sulle sole rotte delle impostazioni); **importazione unica e
osservabile** (lucchetto con 409, fasi, esito conservato, `GET /istanza/gioco/importazione`), così la chiusura della
connessione da parte del tunnel non viene più scambiata per un fallimento. Test nuovi: `scaricaDaUrl` (intestazioni
contro inattività, tetto senza `Content-Length`, corpo lento che deve arrivare), invio con XHR finto, `BarraInvio`,
lucchetto e stato dell'importazione. Validatore: primo giro rigettato con quattro bloccanti (timeout dello scarico
legato anche al corpo, `requestTimeout` di Node, 524 del tunnel scambiato per errore, documenti), tutti corretti qui.

## Import del pacchetto dalla cartella d'appoggio sul NAS (12 settembre 2026) — fatto

Scelta dell'utente dopo la prova sul campo: niente tunnel né indirizzi, il file si deposita su una condivisione del
NAS montata sul server e l'app importa da lì. `docker-compose.yml` monta la condivisione NFS come volume
`project_p5r_deposito` su `/deposito` (indirizzo e percorso parametrici con `NAS_ADDR`/`NAS_PATH`), con
`DEPOSITO_DIR=/deposito` nel backend; il database vivo **resta sul volume persistente**, perché SQLite in WAL non
regge NFS. Server: `elencaDeposito`, `percorsoNelDeposito` (nessuna risalita), `anteprimaPacchettoDaDeposito`,
`importaPacchettoDaDeposito` (stesso lucchetto e stesse fasi dell'importazione, con la fase nuova `lettura`), rotte
`GET /istanza/gioco/deposito`, `POST /istanza/gioco/deposito/anteprima`, `PUT /istanza/gioco/deposito`. Interfaccia:
nella card «Pacchetto di gioco» il pulsante «Cerca i file disponibili» interroga la cartella, il `Selettore` mostra
nome, dimensione e data di ogni file e «Importa il file scelto» apre l'anteprima; l'importazione da indirizzo resta
come alternativa dentro un pannello richiudibile. Verificato dal vivo con una cartella di prova (elenco, anteprima di
un pacchetto da 311 MB, rifiuto di un file non valido e di tre tentativi di risalita) e a 1280/768/375 senza overflow
con bersagli da 44 px. Test: `server/services/pacchettoDeposito.test.ts` (cartella assente, non leggibile, elenco
ordinato, risalite) e tre casi nella card.

## Le planimetrie del Palazzo: ordine, legame con le aree, giorno corrente nell'editor (18 settembre 2026) — fatto

Richiesta dell'utente dalla scheda di Kamoshida: «devo poter vedere le planimetrie e gestirne
l'avanzamento; ordinarle, aggiungerle e cancellarle; evidenziare i raccolti della mappa specifica».
**Diagnosi**: la guida e l'atlante sono due mondi (18 aree contro 34 planimetrie per Kamoshida) e il
legame `mappa_entita` copriva 3 aree su 18 — 72 legami su tutti i Palazzi. Peggio: **il salvataggio
dell'editor non scriveva mai `mappa_entita`** (solo le colonne `entita_*` della mappa), e la scheda
legge la tabella: legare una planimetria a un'area non si vedeva da nessuna parte. L'ordine esisteva
solo come campo numerico nel modulo dell'editor.

**Server**: `sincronizzaLegameEntita` scrive i due posti insieme dentro la stessa transazione di
`creaMappa`/`aggiornaMappa` e impone **un'area = una planimetria** (legarne una seconda stacca la
prima); `riordinaMappe(genitore, chiavi)` riscrive l'ordine 0..n-1 lasciando in coda, come stavano,
le figlie non elencate (`PUT /api/mappe/ordine`, schema `bodyRiordinaMappe`); `dettaglioDungeon`
porta ora **tutte** le planimetrie dell'albero (radice esclusa) con `ordine` e l'`area` legata, non
più solo quelle con collezionabili — sono proprio le vuote quelle da riordinare o togliere.

**Interfaccia**: pannello «Planimetrie» nella scheda del Palazzo (`PlanimetriePalazzo`), aperto dal
contatore dell'intestazione: elenco ordinabile **a trascinamento di puntatore** (funziona col dito:
la scheda si usa sul tablet) con i tasti Su/Giù per la precisione e la tastiera, avanzamento per
riga, `Selettore` dell'area della guida, «Aggiungi» e «Elimina» con conferma che dice che cosa si
porta via. Scegliere una planimetria apre il suo visore e **la colonna mostra i soli collezionabili
di quella mappa**; se è legata a un'area si apre anche quell'area.

**Editor**: interruttore «Giorno corrente» acceso/spento (`VisoreMappa.vistaGiornoCorrente`):
spento l'editor vede tutto, com'è giusto per modificare anche quel che nel mondo non c'è ancora;
acceso la mappa si rilegge con la partita attiva e nasconde quel che le condizioni escludono oggi.
Senza partita attiva resta spento e disabilitato.

Test: `server/routes/planimetrie-palazzo.test.ts` (legame che arriva nella tabella letta dalla
scheda, 1:1, distacco, elenco completo e ordinato, riordino con la coda, riordino fuori dal
genitore), tre casi nella scheda del Palazzo e due sull'interruttore dell'editor; contratto delle
planimetrie aggiornato in `struttura-server.test.ts`. Verifica dal vivo su Kamoshida (legame,
riordino e scheda dalle API; pannello a 1280 e 375 px senza scorrimento orizzontale né errori in
console).


## Negoziazione: tutte le domande, con il verdetto di ogni carattere (18 settembre 2026) — fatto

La scheda «Negoziazione» dava la regola (quattro personalità, due risposte d'esempio l'una) ma non
serviva davanti all'Ombra: quel che si legge sullo schermo è **la domanda**, e da lì deve partire la
ricerca. **Migrazione 083 `negoziazione_domande`**: 230 domande trascritte (225 dopo la fusione delle
ripetute), 680 risposte e i loro verdetti entrano nella riga `dati_guida` «battaglia» (`negoziazione.domande`, `negoziazione.fonteDomande`) dal file di
repository `server/db/dati/negoziazione-domande.json`; il pacchetto è rigenerato alla 083. Per ogni
risposta si dice quali caratteri la prendono bene (`buona`), così così (`passabile`) o male
(`cattiva`); un carattere che non compare **non è indifferente, non è stato verificato**, e le voci
che nemmeno la fonte conferma restano marcate `incerto`. Esiti e tratti sono in italiano nel dato
(`buona|passabile|cattiva`, `giocosa|timida|irritabile|cupa`, tipi `EsitoRisposta` e `TrattoOmbra`).

**Interfaccia**: `RisposteNegoziazione` in cima alla scheda — barra di ricerca che cerca fra domande
e risposte (tutte le parole scritte, accenti e punteggiatura ignorati), i quattro caratteri come
interruttori con il loro colore fisso (`src/utils/negoziazione.ts`: giocosa oro, timida azzurra,
irritabile rossa, cupa viola) e, per ogni risposta, una pastiglia per carattere con l'esito. Scelto
il carattere, la risposta buona per lui sale in cima e la riga si colora; le altre carte della regola
restano sotto. Fonte e resa italiana dichiarate nella scheda e nel `NOTICE`.

**Migrazione 084 `negoziazione_senza_contraddizioni`** (dalla revisione): la fonte a volte si
contraddice — ventiquattro risposte risultavano buone **e** cattive per lo stesso carattere, e cinque
domande comparivano due volte con verdetti diversi — e la scheda arrivava a consigliare e sconsigliare
la stessa risposta. `normalizzaDomande` impone due regole: un solo verdetto per carattere, **il
peggiore**, marcato incerto quando la fonte non è d'accordo con sé stessa; e una domanda, una scheda,
con risposte e verdetti fusi. Il pacchetto è rigenerato alla 084: 225 domande, 680 risposte, nessun
conflitto, 30 verdetti marcati incerti.

Test: migrazione 083 (file presente, contratto dei valori, nessun residuo inglese, idempotenza,
un solo verdetto per carattere, il peggiore nel dubbio, fusione delle domande ripetute) e
cinque casi sul componente (ricerca, riduzione dell'elenco, verdetti per carattere, ordinamento,
stato vuoto). Verificato dal vivo: 230 domande servite dall'API e la scheda nel browser a 1280 e
375 px senza scorrimento orizzontale né errori in console.


## La sezione dei Palazzi diventa correggibile, e la pianta della guida esce di scena (18 settembre 2026)

Tre richieste dell'utente in fila: «devo poter sistemare e correggere tutte le parti di questa
sezione — descrizioni, raggruppamenti, testi, guide», «tenetele separate ma tutto ordinato e
gestibile», «la pianta della guida si può rimuovere».

**Era l'unica parte della guida in sola lettura.** Negozi, articoli, libri, film, attività, luoghi,
domande e cruciverba hanno il loro modulo da un pezzo; dungeon, aree e i 688 punti di interesse si
potevano solo guardare, benché siano trascrizioni fatte a mano da un sito, con refusi e frasi
tagliate. Ora si correggono **dove si leggono**: `PUT /api/compendio/dungeon/:chiave` (nome,
sovrano, le tre date, livello, note), `PUT /api/compendio/aree/:chiave` (nome, descrizione),
`POST /api/compendio/aree/:chiave/punti`, `PUT` e `DELETE /api/compendio/punti/:chiave`
(nome, descrizione, tipo, esauribile). Sono dati di gioco: valgono per ogni partita ed entrano nel
pacchetto quando lo si rigenera. Interfaccia: `CorrezioneGuida` — la matita accanto al testo, che
apre i campi di quel pezzo e basta — su intestazione del Palazzo, area e singolo punto, più
«Aggiungi un punto» in fondo all'elenco della guida.

**I raggruppamenti si correggono** (`PUT /api/mappe/:chiave/presentazione`): il nome della stanza
vale per tutte le sue tavole e rinominarlo da una le rinomina tutte; l'etichetta dice che cosa
mostra la singola versione; `gruppoId: null` fa uscire una tavola dal raggruppamento. Dal pannello
si correggono la stanza e, dentro, nome ed etichetta di ogni planimetria.

**La pianta della guida non c'è più.** Era una seconda immagine della stessa stanza, scaricata da
indirizzi esterni con fallback e crediti, e su 107 aree ne erano state scaricate 11. Via la vista
«Pianta della guida» dalla scheda, la rotta `POST /api/mappe/piante/:area/scarica`, il servizio
`scaricaPianta`, i campi `pianta`/`piantaScaricata`/`piantaAssente` del DTO e il test che li
copriva (resta intatta la pianta dei **quartieri**, che è un'altra cosa). Al suo posto, dove il
legame manca, la scheda **offre di collegare**: un selettore delle tavole del Palazzo non ancora
assegnate, perché le 221 tavole libere dicono che quasi sempre l'immagine c'è e manca il legame.

**Provato e scartato**: l'accostamento automatico area ↔ planimetria per nome. Sui dati veri dà
**0 proposte su 35 aree**, perché la guida e l'estrazione chiamano le stanze in modo diverso
(«Edificio Ovest 1P» contro «Vecchio castello 1P»): un automatismo che indovina avrebbe prodotto
legami sbagliati da disfare a mano, quindi il collegamento resta una scelta, resa comoda.

Test: `server/routes/guida-modificabile.test.ts` (testi del Palazzo, dell'area, ciclo completo di
un punto, nome vuoto rifiutato, raggruppamento con rinomina che si propaga e uscita dal gruppo).
Verifica dal vivo: correzione del nome di un'area salvata e riletta, nessuna traccia della vista
«Pianta della guida», collegamento offerto sulle aree scoperte.


## Correzioni: quel che era salvato ma non si vedeva, e i tetti presi a occhio (18 settembre 2026)

Due difetti trovati **provando l'interfaccia percorso per percorso**, non dai test: il giro
precedente li aveva verificati solo lato server, ed è un errore di metodo — un endpoint che risponde
200 non dice che la schermata funzioni.

- **L'etichetta della planimetria e il nome della stanza si salvavano senza comparire.** Vengono
  dall'atlante (`getAlberoMappe`), e dopo una correzione la scheda rileggeva solo il Palazzo: il
  testo restava quello vecchio finché non si ricaricava la pagina. Ora `onCambiato` rilegge
  entrambi.
- **I tetti dei campi erano scelti a occhio**, e per giunta scritti due volte: 200 caratteri sul livello consigliato, dove la guida
  ne scrive 352 per Kamoshida. Siccome il modulo rimanda indietro anche i campi non toccati,
  **la scheda di un Palazzo non si poteva salvare affatto** (400 dal server). I tetti ora sono
  misurati sui dati veri con ampio margine (la prosa più lunga è una nota da 3938 caratteri), e il
  nome di una mappa passa da 120 a 300 perché nell'atlante ce n'è uno da 118.

Test nuovi: la rilettura dell'atlante dopo una correzione di stanza, e il giro completo che
**risalva ogni Palazzo, ogni area e ogni punto così come sono** — se un dato nuovo supera un tetto
si rompe la suite, non la scheda in mano a chi gioca. Verifica dal vivo dei sette percorsi di
modifica (Palazzo, area, punto, aggiunta di un punto, stanza, etichetta, nome della planimetria):
tutti salvano e si aggiornano a schermo.

**Un tetto solo, condiviso** (dalla revisione): i limiti stavano nello schema del server *e* nel
`maxLength` del campo, e si sono subito disallineati — il campo lasciava scrivere mille caratteri
dove la rotta ne accettava duecento, e il salvataggio tornava indietro con un 400 senza dire quale
campo fosse di troppo. Ora `shared/limitiGuida.ts` è l'unica fonte, letta dagli schemi zod e dai
moduli. Il nome di una mappa vale 180 e non 300: entra nella chiave leggibile del percorso, che il
server tiene sotto quella soglia — oltre, risponde «percorso-troppo-lungo» e dice di abbreviare.
Test: ogni rotta accetta esattamente il massimo dichiarato e rifiuta il carattere in più.

## Un elenco solo nella scheda del Palazzo (19 settembre 2026) — fatto

Riscontro dell'utente, provando l'interfaccia: «continuo a non vedere su FE come sostieni che io
possa sistemare le planimetrie dei palazzi». Aveva ragione, e il difetto non era la mancanza della
funzione: il pannello per ordinare, legare e correggere le planimetrie **c'era ed era completo**,
ma si apriva solo da un chip grigio («34 planimetrie · gestisci») messo in fila con le targhette
informative «18 aree» e «44 da raccogliere». Niente lo distingueva da un'etichetta.

**Diagnosi, sui dati veri di Kamoshida**: due elenchi dello stesso Palazzo. La colonna di
atterraggio elencava le 18 aree della guida, di cui 15 senza planimetria legata; il pannello
elencava 17 stanze / 34 planimetrie, di cui 14 senza area. Due ordini diversi, nessuno completo.

**Fatto** (scelta dell'utente fra le alternative proposte): un elenco solo, nella colonna di
atterraggio, in ordine di percorso trascinabile.
- `PlanimetriePalazzo` è ora l'elenco del Palazzo e sta nella colonna (allargata a 360 px), con i
  comandi sulle righe: maniglia e ▲▼ per l'ordine, ✎ per stanza e versione, cestino, «Editor»,
  selettore dell'area, «Aggiungi».
- In coda, le aree della guida senza planimetria: righe tratteggiate con il selettore «Collega una
  planimetria». Non spariscono, si collegano.
- Il pannello separato, il pulsante che lo apriva e il caricamento pigro dell'atlante non ci sono
  più: l'atlante serve subito, perché l'elenco è la prima cosa che si vede (nei Memento no: i
  dedali non hanno planimetrie e tengono il pozzo).
- Le tavole libere nel selettore portano il nome di presentazione dell'atlante: prima erano 32 voci
  chiamate tutte «Palazzo di Kamoshida — Immagini native che nessun campo usa».

Test: due nuovi in `DungeonDettaglioPage.test.tsx` (l'elenco è già a schermo senza aprire nulla; e
un'area senza planimetria si collega dalla sua riga in coda), più i sette adattati all'interfaccia
nuova. Verifica dal vivo su Kamoshida, Madarame e Memento: navigazione dalla riga al visore,
collegamento di un'area orfana provato davvero e poi ripristinato, nessun errore in pagina.

## Il formato piccolo: il doppio elenco era tornato (19 settembre 2026) — fatto

Riscontro dell'utente: «FE non ottimizzato, si vede male anche in formato desktop». Guardato a sei
larghezze (1920, 1440, 1280, 1024, 820, 768, 390) con misura dello scorrimento orizzontale e degli
elementi che sforano.

Nessun overflow reale — ma tre difetti veri:

1. **Sotto i 1024 px la doppia lista era tornata**: la fila di chip con tutte le aree (per Kamoshida
   diciotto, che a 768 px non scorrono ma vanno a capo per otto righe) sopra l'elenco del Palazzo che
   le contiene già. L'elenco cominciava a ~700 px dall'alto. Tolta la fila: ora comincia a 389 px.
   Resta nei Memento, dove serve a navigare i dedali del pozzo.
2. **Le date si spezzavano male sul telefono**: andando a capo, la freccia «→» finiva a inizio riga
   davanti alla tappa, dove non collega più niente. Le frecce compaiono da `sm` in su.
3. **Il comando di correzione del Palazzo restava solo su una riga vuota**: un glifo isolato sembra
   un refuso. Ora porta l'etichetta «Correggi la scheda» (nuova prop `etichetta` di
   `CorrezioneGuida`), e l'emblema sul telefono scende da 80 a 52 px.

Un tentativo di tenere titolo e matita sulla stessa riga con `flex-1` è stato **annullato**: a 390 px
schiacciava il titolo a larghezza zero e lo impilava una lettera per riga. Visto nello screenshot e
tolto.

Verifica: 6 larghezze × 4 pagine (Palazzo, Memento, Home, Compendio) senza scorrimento orizzontale e
senza errori in pagina; suite completa 994 test verdi.

**Rilievo della revisione (stesso giorno)**: tolta la fila di chip, in colonna unica l'elenco
srotolato precedeva il contenuto — per Kamoshida 4053 px di righe, con l'area aperta a 4682 px
dall'alto: la navigazione seppelliva ciò che seleziona, molto peggio dei 320 px di chip. Corretto
mettendo il contenuto dell'area **prima** dell'elenco sotto i 1024 px (`order`) e rimettendo il
tetto d'altezza anche sul piccolo (`max-h-[70vh]`). Misurato: l'area scelta comincia a 614 px su
390 px e 415 px su 768 px; sopra i 1024 px nulla cambia (396 px).


## Giornata della guida modificabile e aree che scorrono (29 settembre 2026) — fatto

Richiesta dell'utente: le attività «Di giorno» / «Di sera» non si potevano modificare, aggiungere né rimuovere, e un
evento aggiunto restava sotto, nel riquadro «Le mie note». Lavoro direttamente su `main` (decisione dell'utente).

| Voce | Contenuto | Stato |
|------|-----------|-------|
| 1 | Backend: correzioni alle azioni della guida per tutte le partite (`correzione_azione_guida` nel file delle partite, migrazione «utente» 005; `correzioniGuidaService`: testo, note, fascia, rimozione, ripristino, correzioni «superate» da un pacchetto nuovo con Riapplica/Scarta e 409 su chi le sovrascriverebbe); applicate in scheda del giorno, indice dei giorni, spunta (Doti dalle note corrette; un'azione rimossa non si spunta ma la spunta si toglie) e suggerimenti; `evento_utente.fascia`; `PercorsoGiornoDto` con `rimosse`, `correzioniSuperate`, `agenda`; `annullaEffetti` in `partiteService` (niente giro di import) | ✅ validata |
| 2 | Frontend: «Di giorno» e «Di sera» sempre presenti con «Aggiungi»; eventi, azioni della guida e cose da fare dell'utente nella stessa lista; menu per voce (Modifica, Sposta, Ripristina originale, Rimuovi/Elimina) con conferme (azione spuntata con punti, eliminazione), azioni rimosse da rimettere, «Correzioni da rivedere»; `ModuloVoceGiornata`, `MenuVoce`, `VociAgenda`; via `AgendaGiorno`; segmenti senza parole spezzate sul telefono | ✅ validata |
| 3 | Aree che scorrono dentro la pagina: utility `area-scorrevole` / `area-scorrevole-x` (confine, `overscroll-behavior: contain`, barra d'accento, ombre di bordo), applicate a ogni contenitore annidato e alle regole CSS scorrevoli; test di guardia `src/test/areeScorrevoli.test.ts`; Home e scheda «Oggi» di nuovo in una schermata (la mappa di Tokyo si adatta alla colonna, `MappaTokyo riempi`, riga «Non ancora nel mondo» compatta con «Quali»); la rotellina sopra popup ed elenchi del visore li fa scorrere invece di ingrandire la mappa | ✅ validata |
| 4 | Documenti, commit su `main` | ✅ |

Aperto, da decidere con l'utente: con il vincolo «Home in una schermata» la finestra della guida resta piccola sugli
schermi bassi (Home: 48 px a 1366×768 per la stella che cresce con l'altezza da 1360 px, 141 px a 1024×768, 168 px a
1280×720, 189 px a 768×1024). Dopo il lotto seguente (pulsanti del momento della giornata in griglia) a 1366×768 è 75 px.

## Visualizzazioni, spilli «Oggetto» e «Punto di infiltrazione», grafica mancante (29 settembre 2026) — fatto

Richieste dell'utente: due visualizzazioni da sistemare (screenshot), i tipi di spillo «Oggetto» (consumabile) e «Punto
di infiltrazione» (spostamento) nelle mappe e nell'editor, la verifica degli elementi senza grafica adatta con i prompt per
Codex. Su `main`.

| Voce | Contenuto | Stato |
|------|-----------|-------|
| 1 | «Momento della giornata» (scheda «Oggi»): etichetta sopra e Giorno/Sera affiancati a metà larghezza (`.btn-visivo--a-capo`); Città: schede dei quartieri in `repeat(auto-fill, minmax(min(100%,300px),1fr))`, colonna accanto alla mappa di almeno 340 px, data di apertura mai spezzata; timeout del test «ogni Palazzo…» (arrivato col merge) portato a 30 s | ✅ validata |
| 2 | `shared/spilli.ts`: `oggetto` (consumabile, `#34d399`) e `infiltrazione` (spostamento con destinazione, `#ff2e63`), sempre visibili; riserve SVG; nessuna riclassificazione (decisione dell'utente); tooltip col nome sui tipi troncati di tavolozza e legenda | ✅ validata |
| 3 | 14 asset di Codex controllati e integrati (`docs/grafica/consegna-2026-09-29-spilli-e-categorie.md`): 7 `ui/*` in `public/asset/ui/`, 7 illustrazioni dei videogiochi nel database (`PUT /api/immagini/attivita/<chiave>`); alias `sfida → obiettivo`, riserve `obiettivo`/`allenamento`, `VideogiochiPage` mostra `attivita/<chiave>`; golfer-sarutahiko e star-forneus da rifare (fondo pieno) | ✅ validata |
| 4 | Documenti, commit su `main` | ✅ |

Da fare dall'utente: togliere `public/asset/attivita/` (duplicato locale, il permesso di spostarla è stato negato; non è
in git); caricare le 7 illustrazioni nell'istanza di produzione e rigenerare il pacchetto da lì; far rifare a Codex i due
videogiochi con i prompt del §2 della consegna.

## Più aree della guida per planimetria; Palazzi e Memento in una schermata (29–30 settembre 2026) — fatto

Richieste dell'utente: legare più aree della guida alla stessa planimetria e mostrarle in ordine; la scheda del Palazzo
senza barra di pagina, con le colonne che finiscono alla stessa altezza; poi lo stesso per i Memento. Su `main`.

| Voce | Contenuto | Stato |
|------|-----------|-------|
| 1 | Server: `PUT /api/mappe/:chiave/aree` (`impostaAreeMappa`, chiave di percorso, insieme che sostituisce, un'area stacca la planimetria che l'aveva, `origine='utente'`); `DungeonDettaglioDto.planimetrie[].aree` in ordine di guida; colonne `entita_*` sulla prima area (`allineaColonneArea`); legame singolo dell'editor che tocca solo l'area dichiarata; aree solo del proprio Palazzo (`verificaAreePalazzo`, anche spostando un sottoalbero); pacchetto delle mappe con `aree` (pacchetti vecchi con la sola `entita`), verifica dopo il passaggio dei genitori | ✅ validata |
| 2 | Interfaccia: `SceltaAreePlanimetria` (caselle in ordine di guida, «ora su…» / «si sposta qui da…», riepilogo, Salva solo se cambia) al posto del selettore singolo; aree in ordine nella riga della stanza, della versione e sopra la mappa («Su questa planimetria», tocco = apre quell'area); «Collega una planimetria» su tutte le tavole, aggiungendo l'area | ✅ validata |
| 3 | Palazzi e Memento in una schermata da 1024 px: radice alta quanto `main`, griglia `grid-rows-[minmax(0,1fr)]`, colonne con `area-scorrevole` (tre da 1280 px, due da 1024); intestazione compatta su due righe; da 1280 px mappa e dedalo che riempiono la colonna con minimo 240 px (`MappaIncorporata classeVisore`; da 1024 a 1279 px l'altezza di prima dentro la colonna destra che scorre); descrizione dell'area ripiegabile; nessuna barra di pagina a 1024×690, 1280×689/720, 1366×657, 1440×789, 1920×969 | ✅ validata |
| 4 | Documenti, commit su `main` | ✅ |

Da fare dall'utente: nel database di sviluppo la mappa `nativo-rmap-151-16-0` è rimasta `origine='utente'` dopo la prova
(prima `seed`, `updated_at` 2026-09-09T19:47:16.182Z): il ripristino diretto è stato negato dai permessi.

## Colonna del Palazzo ristrutturata, nemici non raccoglibili, aree eliminabili (30 settembre 2026) — fatto

Richieste dell'utente: la colonna di sinistra del Palazzo «fatta molto molto male… ristrutturala» (la matita sforava, il
cestino «non funzionava» perché la conferma finiva fuori vista), riordinare, associare le aree, cambiare «Che cosa
mostra», eliminare aree e planimetrie; i nemici non devono essere raccoglibili né evidenziati. Su `main`.

| Voce | Contenuto | Stato |
|------|-----------|-------|
| 1 | Server: `nemico` categoria informativa + migrazione 085, 400 sul «raccolto» di un nemico, ombre sciagura non collezionabili nei contenuti della guida; `DELETE /api/compendio/aree/:chiave` (`eliminaArea`: punti e segnature, spilli della guida, timbri, legami con le mappe, riferimenti JSON, ordine ricompattato) | ✅ validata |
| 2 | Interfaccia: colonna «elenco + scheda» (`PlanimetriePalazzo` con `useRiordino`: trascinamento della maniglia con scorrimento automatico e frecce, focus mantenuto; `SchedaPlanimetria`, `SchedaAreaGuida`, «Nuova planimetria» in finestra; conferme nel piè); «Elimina» nel modulo dell'area; verificata dal vivo senza salvare (richieste intercettate) a 1440×789, 1366×657, 1024×690, 768, 375 | ✅ validata |
| 3 | Documenti, commit su `main` | ✅ |

## Stanze delle planimetrie, testo delle aree, nome della stanza (30 settembre 2026) — fatto

Richieste dell'utente: rendere una mappa a sé planimetria di un'altra e il viceversa; modificare il testo delle aree
della guida; poi «Nome della stanza quando lo cambio non prende la modifica. Nome della planimetria quando lo cambio
cambia anche Nome della stanza». Su `main`.

| Voce | Contenuto | Stato |
|------|-----------|-------|
| 1 | `PUT /api/mappe/:chiave/stanza` (`impostaStanzaMappa`): entra nella stanza di un'altra planimetria dello stesso luogo, in fondo alle versioni e subito dopo nell'ordine, o diventa una stanza a sé; etichetta conservata. Scheda della planimetria: sezione «Stanza» («Rendila una stanza a sé», «Sposta in un'altra stanza…» con ricerca, ferma con modifiche non salvate) | ✅ |
| 2 | Testo delle aree: nome e descrizione nella scheda dell'area senza planimetria; «Modifica testo» per esteso accanto al titolo dell'area aperta | ✅ |
| 3 | Nome della stanza: `gruppoImmagini.nomeRivisto` (scritto con `gruppoNome`, `impostaStanzaMappa`, ereditato da chi entra, conservato dal pacchetto) vince in `titoloGruppoImmagini` sul nome rivisto della mappa; il server (`aggiornaMappa`) fissa il titolo della stanza quando si rinomina la sua prima planimetria, anche dall'editor; la scheda fissa il nome della stanza salvando quello della planimetria; «Modifica testo» con nome accessibile che lo contiene; stanze proposte solo dello stesso livello; aree di testo con overscroll contenuto | ✅ |
| 4 | Verifica dal vivo (planimetrie di prova create ed eliminate) e dei formati 1440×789, 1366×657, 1024×690, 768×1024, 375×812; documenti, commit su `main` | ✅ |

## Palazzo completato dai fatti della partita, non dalla data (30 settembre 2026) — fatto

Richiesta dell'utente: «se un palazzo è completato al 100% bisogna che gli eventi diano quel palazzo come completato a
prescindere dalla data di scadenza» — Kamoshida al 100%, con l'Ombra di Kamoshida segnata raccolta sulla mappa, il 22
aprile risultava ancora da completare; poi: che scatti anche col Tesoro del Palazzo o col boss finale raccolto. Su `main`.

| Voce | Contenuto | Stato |
|------|-----------|-------|
| 1 | `palazziService.palazziCompletati(partita)`: completato col boss **finale** segnato nella Guida o raccolto sulla mappa, col Tesoro del Palazzo raccolto o col 100% (regola della scheda); il motivo sta nel semaforo; vale per ogni condizione «Palazzo completato» (requisiti dei Confidenti, spilli, articoli, disponibilità). Boss finale = quello dell'ultima area della Guida con boss; se il Palazzo ha una sola area con boss (Kamoshida, la cui area finale non è legata a nessuna planimetria) ogni boss del Palazzo sulla mappa è il finale | ✅ |
| 2 | Scelte dell'utente: il boss finale della Guida si segna e si toglie da solo col Tesoro o il boss finale sulla mappa (`allineaBossDellaGuida`); ciò che il raccolto aggiunge è marcato `automatico` (migrazione utente 006) e togliendo il raccolto si toglie solo quello, mai il segno messo a mano. L'ingresso al Palazzo completato sparisce dalla mappa (`senzaIngressoAPalazzoCompletato`), riconosciuto anche dall'identità di seed quando lo spillo è stato modificato e ha perso il collegamento (il 1616 della Shujin); gli archi restano legati alla data | ✅ |
| 3 | Test (`palazzo-completato.test.ts`: Kamoshida senza collegamenti artificiali, segno a mano che sopravvive, ingresso 1616; aggiornati `disponibilitaService`, `mappe-editor`), verifica via API su una partita di prova (poi eliminata) e del testo nella scheda del Confidente a 1440, 768, 375; documenti; validatore APPROVATO al terzo esame; commit su `main` | ✅ |


## Effetti delle azioni della Guida; Guida modificabile al 100% (30 settembre 2026) — fatto

Difetti segnalati dall'utente: Zorro finito senza Gentilezza, la nota di Coraggio di Takemi al rango 2 non contata, il
bagno del 25 aprile a +3, «Sbloccare il lavoro» che dava la Dote del turno. Piano approvato (6 voci), su `main`.

| Voce | Contenuto | Stato |
|------|-----------|-------|
| 1 | Effetti strutturati dell'azione (`produce`: Dote, Lettura «almeno n», Turno con Doti proprie facoltative, `shared/effettiAzione.ts`); conversione una volta sola dalle note (migrazione 086, `conversioneEffettiAzione`) con le regole dei libri (prestito non legge, «(1/2)» → 1, «restituire X» → X completato), il cinema a «una visione» per spunta (087), i lavori come turni, le Doti per turno dei quattro lavori; correzioni alle note già fatte convertite (utente 007); motore `effettiAzioneService` (letture fino ad «almeno», visioni contate con le altre spunte, turni con registro `turno_partita`, contatore dei turni sullo stesso motore, errori che fermano la spunta); chip degli effetti con letture (e le Doti date) e turni; orfani dei turni; pacchetto in git alla versione corrente con le sole migrazioni; test `effetti-azioni.test.ts` | ✅ validata (2° esame) |
| 2 | Guida modificabile al 100%: la correzione cambia anche tipo, collegamento (nome dal server), rango atteso ed effetti, con verifica che ciò a cui punta esista; elenchi `GET /api/compendio/percorso-elenchi`; finestra con `EditorAzioneStrutturata`; «Alla spunta: …» su ogni riga; test API e FE; verificata a 1280×689, 768×1024, 375×812, 1024×690, 1366×657; solo il collegamento e gli effetti nuovi si verificano (ogni azione della guida rimandata invariata passa), il nome del collegamento segue le rinomine | ✅ validata (2° esame) |
| 3 | Azioni dell'utente come quelle della guida: stessi campi (migrazione utente 008 `produce_json`, note già scritte convertite), collegamento ed effetti verificati se nuovi, spunta con effetti e note del Confidente e annullamento, stato e mappa, «Togli la spunta ed elimina»; FE con i pezzi comuni `PartiAzione` e l'editor nella finestra; test API (`azioni-utente.test.ts`) e FE; verificata a 1280, 768, 375 | ✅ validata |
| — | Da correggere a parte (fuori dal lotto): `src/pages/EditorMappaPage.test.tsx:268` («Nuova mappa (15.24)») è instabile sotto il carico della suite completa (`findByRole` scaduto una volta, verde da solo 3/3 e al giro successivo): serve un'attesa esplicita o un timeout adeguato | da fare |
| 4 | Lavori: effetti per turno modificabili nella scheda dell'attività («Vale dalla seconda volta in poi» per le attività contate per volte, con la spiegazione; descrizione di `ripetuto` resa esatta ovunque), contatore di Partita → Progressi con «che cosa dà ogni turno» e l'avviso dei punti dati o restituiti; messaggio di eliminazione che nomina le partite (nota della voce 3); test API e FE; verificata a 375 e 1280 | ✅ validata |
| 5 | Confidenti: Dote a ogni incontro come dato del Confidente per rango (`confidente_dote_incontro`, migrazioni 088–089), modificabile nella sua scheda; incontri registrati una volta sola da spunta (guida e cose da fare) e pagina Confidenti (passaggi, risposte, uscite, «Annulla ultimo»), passaggio al rango R unico (migrazioni utente 009–011); avvisi con la Dote data; pacchetto in git alla versione 89 con le sole migrazioni; test API e FE (compreso l'incontro semplice che diventa passaggio); verificata a 1280 e 375 | ✅ validata |
| 6 | Verifiche finali (typecheck, lint, suite completa; tre formati e altezze realistiche verificati voce per voce), limiti noti in DECISIONI, documenti, validatore APPROVATO, commit su `main` | ✅ |

## Denaro impostabile; requisiti da segnare, meteo, cambio giorno, Doti a mano (30 settembre 2026) — fatto

Richieste dell'utente: Sojiro fermo al rango 3 perché «il caffè al Leblanc» non risultava; «ci sono altri blocchi non
verificabili?»; impostare il meteo al cambio giorno; passare da solo al giorno successivo quando tutte le attività del
giorno sono fatte; «i punti Doti Sociali li sposto solo io manualmente»; «cambiare il denaro corrente settando un valore
nuovo (ora sono incassa o spendi)»; poi, durante il lotto, «i meteo sono tutti i possibili?», il cambio del meteo
«diretto», la riga unica, gli «spazi in scroll troppo piccoli» della Home con menu e mappa a scomparsa e il «Chiudi» delle
mappe che torna alla pagina di prima. Piano approvato (6 voci, il denaro per primo; 3a, 3b, 3c aggiunte dall'utente), su `main`.

| Voce | Contenuto | Stato |
|------|-----------|-------|
| 1 | Denaro del gruppo (Partita → Squadra): campo «Importo» e terzo pulsante «Imposta», che riscrive il saldo col numero del campo (zero compreso, tetto 9.999.999 come il server) e lo conferma con un avviso; nello storico resta la differenza. Il campo è testo con tastiera numerica e conta solo le cifre: il vecchio `type="number"` leggeva «123.450» come 123,45 e ne faceva 12.345 ¥ (anche per Incassa e Spendi); senza cifre i tre pulsanti restano spenti. Test FE; verificata dal vivo (partita di prova, poi eliminata) a 375×812, 768×1024, 1024×690, 1280×689 | ✅ validata (2° esame) |
| 2 | Requisiti non verificabili come interruttori in Partita → Progressi: cinque eventi nuovi in `EVENTI_STORIA` (caffè al Leblanc, duello con Akechi vinto, Pietra Sacra, chiamata a Kawakami, Oratore di Shibuya), requisiti `evento` (migrazione 090) valutati da `evento_storia_partita`; «Condizione soddisfatta» scrive lo stesso evento; conferme già date convertite in eventi (utente 012); ogni evento dice in Progressi quale rango sblocca («Sblocca: Sojiro Sakura, rango 3»); Futaba r4 è un `avviso` grigio con icona che non blocca, non si conferma e non conta nei requisiti. Test API, di migrazione e FE; verificata dal vivo (partita di prova, poi eliminata: il clic sul caffè in Progressi sblocca Sojiro) a 375×812, 768×1024, 1024, 1280×689 | ✅ validata |
| 3 | Meteo della partita per giorno e fascia (`meteo_partita`, migrazione utente 013; `meteoService`, `shared/meteoPartita.ts`): quattro meteo di base scelti a mano, pre-compilati dalla guida («Sereno/Pioggia» = sereno di giorno, pioggia di sera); le sei allerte del gioco (pioggia torrenziale, polline, ondata di calore, notte torrida, stagione influenzale, ondata di gelo) lette una volta sola dalle date del catalogo (`allerta_meteo`, migrazione 091) e mostrate dall'app; la pioggia torrenziale conta come pioggia; «non deve piovere» e «piove» leggono la fascia corrente, e senza meteo sono da controllare senza bloccare; `PartitaDto.meteoOra` fa ricaricare mappe, negozi e disponibilità. In Partita → Oggi (e nella Home) **una riga sola**: «Giorno», «Sera» e le quattro icone del meteo della fascia attiva, un tocco salva (ritoccare quella segnata torna alla guida), l'allerta come bollino sul pulsante della fascia. Test API, migrazione, condivisi e FE; verificata dal vivo (partita di prova, poi eliminata) a 375×812, 768×1024, 1024×690, 1280×689, 1366×657: riga di 44 px su una fila, guida della Home a 1024×690 da ~118 a 140 px | ✅ validata |
| 3a | Menu sinistro richiudibile (`Sidebar`, `.barra-laterale`): pulsante in cima che lo riduce alle icone (64 px, il contenuto guadagna 146 px) o lo riapre; ridotto, al passaggio del mouse (solo puntatore vero) o col fuoco da tastiera si apre a 210 px **sopra** il contenuto senza spostarlo; scelta ricordata (`preferenzeStore.menuRidotto`); voci con nome accessibile e `title`. Test FE; verificato a 1366×657 (misure; il passaggio del mouse non arriva sotto emulazione, regole verificate nel CSS servito) | ✅ validata |
| 3b | Mappa della Home a scomparsa: «Nascondi la mappa» la chiude in una linguetta «Mappa» sul bordo destro e carta e guida prendono il suo spazio (da 1024 px carta a sinistra e guida a tutta altezza a destra; 768–1023 impilate; telefono: pulsante «Mappa» al posto della mappa); tocco sulla linguetta = riapre; col mouse (puntatore vero) il passaggio la fa uscire sopra il contenuto, «Tieni aperta» la rimette; resta montata (niente ricaricamento); «Sulla mappa» di un'azione la riapre; scelta ricordata (`preferenzeStore.mappaHomeChiusa`). Guida della Home: 1366×657 da 42 a 342 px, 1024×690 da 140 a 375, 1280×689 da 189 a 374. Test FE (`HomePage.test.tsx`); verificata a 1366×657, 1280×689, 1024×690, 768×1024, 375×812 | ✅ validata |
| 3c | «Chiudi» delle mappe (visore ed editor) torna alla pagina da cui la mappa era stata aperta (percorso e parametri), anche dopo livelli e passaggi visore ↔ editor e dopo un ricaricamento: `utils/ritornoMappe.ts` annota la pagina entrando nelle mappe (`MainLayout`, sessionStorage con riserva in memoria) e la cancella uscendo; aperta direttamente, «Chiudi» fa quel che faceva (visore → elenco delle mappe, editor → visore). Test unitari e di `MappaPage`; verificato dal vivo (Città → Central Street → Modifica → Chiudi = Città) | ✅ validata |
| 4 | Cambio giorno: spuntata l'ultima attività del giorno corrente (guida com'è corretta, le rimosse no, più le mie cose da fare; gli eventi non contano) la partita passa al giorno dopo, di giorno (`percorsoService.avanzaSeGiornoCompleto`, chiamata dalle due spunte; `giornoAvanzato` nella risposta; evento nello storico); togliere la spunta non torna indietro; un giorno non corrente non fa avanzare. FE: `seGiornoAvanzato` allinea lo store e avvisa; «Oggi» segue il giorno nuovo; `MeteoAlCambioGiorno` (in `MainLayout`) chiede il meteo del giorno nuovo a ogni cambio di data della partita (spunta, «Segna come giorno corrente», Calendario, Riepilogo), un tocco segna, allerte scritte; «Oggi» si rilegge (`meteoStore.versione`). Date con l'articolo giusto (`dataGiocoConArticolo`: «l'11 aprile», «dell'11»). Test API, FE, utilità; verificata dal vivo con clic veri (11 aprile completato → 12 aprile, avviso, finestra del meteo, meteo segnato; «Segna come giorno corrente» → finestra) e finestra misurata a 375×812, 768×1024, 1024×690 | ✅ validata |
| 5 | Doti solo a mano, con promemoria: `aggiornaDote` la chiama solo l'API manuale delle Doti. Spunte (`effettiAzioneService`), letture e turni (`attivitaService`: il registro `effetto_lettura_partita` dice che cosa il gioco dà, senza toccare le Doti), incontri (`incontriService`), domande in classe e cruciverba non toccano le Doti né aggiungendo né togliendo, nemmeno togliendo la spunta di un'azione di prima (`annullaEffetti` restituisce solo i punti del Confidente). Dicono che cosa il gioco dà: `effetti` delle spunte, `daSegnare` (`DoteDaSegnareDto`) di letture, contatore dei turni (al posto di `cambioDoti`), domande e cruciverba, `doteIncontro`. FE: `utils/dotiDaSegnare` (somma per Dote, testo, avviso «Da segnare nelle Doti: Gentilezza +3», in negativo quando si disfa), `avvisoSpunta`; righe «Il gioco dà: …» (guida, cose da fare, finestra di modifica, editor), testi di conferma e nota di Film/Libri/Videogiochi aggiornati. Test aggiornati (le Doti restano ferme, il promemoria dice quanto) e nuovi; verificato dal vivo con clic veri (spunta → avviso «Da segnare nelle Doti: Conoscenza +2», Doti a 0; segnata a mano +2 e tolta la spunta → resta 2); testi dell'interfaccia, commenti e ARCHITETTURA allineati alla regola (2° esame) | ✅ validata (2° esame) |
| 6 | Verifiche finali (typecheck, lint, suite completa 231 file / 1172 test; formati e altezze verificati voce per voce); `pacchetto/gioco.db` in git portato alla 91 con le sole migrazioni (74 allerte, nessun requisito «manuale»); limiti noti in DECISIONI; documenti, validatore, commit su `main` | ✅ |

## Pacchetto di gioco dalla produzione (30 settembre 2026) — fatto

Richiesta dell'utente: «parti da questo pacchetto e aggiungi quello che va modificato per renderlo il nuovo pacchetto da
caricare via nas» (export dell'istanza di produzione, `project-p5r-gioco-2026-09-30T20-26-43-695Z.db`, schema 91). Scelta
dell'utente: «la produzione attuale è quella corretta», nessun dato da toccare.

| Voce | Contenuto | Stato |
|------|-----------|-------|
| 1 | Pacchetto rigenerato con lo script del progetto (`DATA_DIR=<copia dell'export> npm run pacchetto -- --da-istanza`): migrazioni e regole dell'avvio non cambiano nulla (già alla 91), integrità e chiavi esterne a posto, nessuna partita; `pacchetto/completo/gioco.db` (316 MB, 782 immagini, fuori da git: il file da mettere sul NAS) e `pacchetto/gioco.db` (5,6 MB, in git) identici all'export tabella per tabella (68 tabelle, 16.796 righe; nell'iniziale il solo `immagine.contenuto` a NULL). Diciassette test che fotografavano il pacchetto vecchio riscritti sulla regola: uid validi e unici (deterministici sugli spilli della guida, stabili se lo spillo si sposta: test nuovo), conteggi di negozi e articoli letti dal file (righe visibili di negozi visibili), «della guida» = non creato dall'app (`NOT (origine='utente' AND seed_json IS NULL)`), articoli di Takemi e passaggi di Kamoshida della guida, `collegaPalazziAiLuoghi` e `riallineaSpilliLuoghi` provati su casi costruiti nel test, regole di visibilità sui dati limitate agli spilli della guida; i passaggi automatici verso le mappe figlie (Tokyo della guida → quartieri con Shibuya a 34.5/49.5, Palazzo della guida → aree, non verso le planimetrie native né da una radice dell'utente) provati su casi costruiti in `sincronizzaMappe.test.ts` (rossi con la creazione disattivata); Kamoshida con tutti i passaggi dell'utente e nessuno della guida. Confronto con l'export esteso a `sqlite_master` intero (70 tabelle, 92 indici) e `sqlite_sequence`: identici. Suite completa, typecheck, lint (numeri e output nel rapporto al validatore); prova su un'istanza temporanea: primo avvio dal pacchetto, anteprima e importazione dal deposito (importabile, 0 migrazioni, 782 immagini, immagini servite). Suite 231 file / 1175 test, typecheck e lint puliti | ✅ validata (2° esame) |

## La giornata è canone, in ordine esatto (richiesta il 30 settembre, conclusa il 1 ottobre 2026) — fatto

Richieste dell'utente: le voci aggiunte alla guida finivano sempre in fondo («devo fare un ordinamento esatto»), anche le
azioni della guida si spostano, «Sposta su / giù» nel menu, «Il tag La mia è irrilevante», e «le modifiche diventano nuovo
canone a tutti gli effetti quindi non sono mai singola partita... ma tutte devono alterare i dati iniziali». Scelte: guida
modificata direttamente, voci «solo in questa partita» di tutte, «Rimuovi» elimina. Piano su `main`.

| Voce | Contenuto | Stato |
|------|-----------|-------|
| 1+2 | Dati e server: `voce_giornata` nel file di gioco (migrazione 092: 950 azioni con uid stabile, ordine per fascia, genere), `spunta_voce_partita` per uid e conversione del modello di prima («utente» 015: spunte, correzioni su voci intatte, rimosse eliminate salvo quelle spuntate con effetti, cose da fare ed eventi dell'utente per tutte le partite, ordine che l'utente vedeva, rientrante; la 014 nata e superata lo stesso giorno resta nella sequenza); `giornataService` (crea al posto esatto, modifica anche fascia/posto/genere, sposta ±1, elimina, spunta), 409 `voce-con-effetti` se spuntata con effetti in qualunque partita; rotte `/api/compendio/percorso/…/voci`, spunta per uid; tolte correzioni per indice e agenda del catalogo; orfani di `spunta_voce_partita` nell'anteprima di import. Prova su copia dei dati reali (951 voci, 11 spunte, integrità). Test nuovi di migrazione e `giornata.test.ts` (sostituisce `percorso-correzioni.test.ts`, mappa dei casi) | ✅ validata (2° esame) |
| 3 | Interfaccia: `GiornoGuida` con una lista per fascia nell'ordine esatto (guida, cose da fare ed eventi insieme), gesti Modifica / Sposta su / Sposta giù (menu aperto, fuoco sul gesto) / Sposta di giorno-sera / Elimina (conferma per genere; «Togli la spunta ed elimina»; errore a metà detto com'è con la giornata riletta); `ModuloVoceGiornata` con genere, «Posto nella giornata» (elenco numerato, Su/Giù da 44 px, fuoco che non si perde ai bordi), campi che si allungano col testo; via «La mia», «Corretta», «Rimosse», «Correzioni da rivedere», «Solo in questa partita»; icone `ui/azione-su`/`giu` (riserva SVG, censimento §21). Verificata dal vivo (spunte per uid, modifica con posto, cambi di fascia e di genere, 409, eliminazioni; dati rimessi com'erano) a 1280×689, 768×1024, 375×812, 375×667, 1366×657 | ✅ validata (2° esame) |
| 4 | Chiusura: `pacchetto/gioco.db` e il completo portati alla 92 con `npm run pacchetto` (dal completo = export di produzione: cambia solo `voce_giornata`, 950 voci); ARCHITETTURA («La giornata è canone», rimandi nelle sezioni superate), DECISIONI, ROADMAP; pacchetto misurato oggetto per oggetto (solo `voce_giornata` e i suoi indici in più, 950 voci fedeli alle azioni, uid e ordine verificati, integrità); suite 232 file / 1179 test, typecheck e lint puliti; validatore, commit | ✅ validata (2° esame) |
| 5 | Pacchetto dal canone di produzione: l'istanza di produzione, già alla 92 dopo l'aggiornamento (conversione fatta dalla «utente» 015 con le sue correzioni e le sue 4 voci aggiunte, 954 voci), stava per ricevere il pacchetto preparato dall'export del giorno prima (950 voci: l'anteprima ne mostrava la perdita e 3 spunte orfane); importazione annullata. Nuovo export dell'istanza (`project-p5r-gioco-2026-09-30T23-02-00-856Z.db`) → `npm run pacchetto -- --da-istanza`: completo e iniziale identici all'export (69 tabelle, 17.750 righe, `sqlite_master` identico, 782 immagini). Test che guardavano la guida com'era: le regole della conversione 086 si provano su `azioni_json` (la guida d'origine); il giorno completato non dipende più dal numero di voci dell'11 aprile. Il validatore ha trovato nel canone la voce di Zorro del 25 aprile che segnava finita anche la Ballerina (conversione della 007 su una correzione del testo, riprodotta): scelta dell'utente, due voci distinte → migrazione 093 (lettura di Zorro; restituzione e prestito della Ballerina senza effetti, subito dopo) con test su canone, guida d'origine, stato non riconosciuto e ripetizione; il test degli effetti fissa lo stato della voce nel canone. Il nome di un collegamento a un elemento nascosto dal catalogo si legge lo stesso (`ancheNascosti`, solo in lettura). Pacchetto alla 93: rispetto all'export cambiano solo le tre voci del 25 aprile e la versione. Suite 233 file / 1182 test (una ripetizione per il test instabile già noto di `EditorMappaPage`), typecheck e lint puliti | ✅ validata (4° esame) |

## Palazzo completato: sparisce anche dalla mappa di Tokyo (1 ottobre 2026) — fatto

Rilievo dell'utente: «come mai vedo KAMOSHIDA nonostante il Tesoro al palazzo è stato recuperato?». La mappa di Tokyo
mostrava i Palazzi per la sola finestra di date; il completamento (Tesoro, boss finale, 100%) bloccava solo gli ingressi
nelle mappe dei quartieri.

| Voce | Contenuto | Stato |
|------|-----------|-------|
| 1 | `DungeonRiassuntoDto.completato` (motivo di `palazziCompletati`, una volta per elenco; null senza partita e per i Memento, che non si completano); `CittaPage` e `OggiMappa` chiedono i Palazzi con la partita; `MappaTokyo` toglie il cartellino di un Palazzo completato e lo elenca fra gli assenti con «completato: <motivo>». Test: `palazzo-completato` (elenco e scheda con e senza partita, dopo il raccolto e dopo il tolto; Memento col boss finale segnato: null), `MappaTokyo` (cartellino presente, poi assente col motivo), `CittaPage` e `OggiPartita` (`getDungeons` con la partita), ognuno visto rosso senza la correzione. Verifica nel browser a 1280/768/375 su una partita di prova, poi eliminata | ✅ validata (2° esame) |

## «Sulla mappa» di un Palazzo: l'ingresso in città (1 ottobre 2026) — fatto

Rilievo dell'utente (screenshot della scheda «Oggi», 11 aprile): «Sulla mappa» sulla voce «Prima infiltrazione tutorial nel
Palazzo di Kamoshida…» apriva la radice `dungeon-kamoshida`, senza planimetria: l'elenco nudo delle stanze, fuori dal
riquadro. Scelta dell'utente: «Ingresso in città».

| Voce | Contenuto | Stato |
|------|-----------|-------|
| 1 | `palazziService.ingressoDelPalazzo(dungeon, giorno)`: lo spillo che da fuori porta nel Palazzo (`palazzoDiIngresso`), quello aperto nel giorno della voce (condizioni di data), in città prima; senza ingresso la prima planimetria del Palazzo in ordine logico; senza nemmeno quella la radice. `mappaAzione` lo usa per le voci collegate a un Palazzo e per le richieste (Memento). `MappaIncorporata`: le mappe figlie di una mappa senza planimetria in un'`area-scorrevole` contenuta nel riquadro. Test: `sulla-mappa-palazzo` (Shujin; 11 aprile → l'ingresso del solo 11, 12 aprile → quello fino al 2 maggio; Palazzo senza ingresso → prima planimetria; Memento; dungeon inesistente), `percorso`, `OrganizzazioneMappe` (area scorrevole), ognuno visto rosso senza la correzione. Verifica nel browser a 1366×657, 768, 375 su una partita di prova, poi eliminata | ✅ validata (2° esame) |

## Guida del Palazzo modificabile e collegata ai pin (1 ottobre 2026) — fatto

Rilievi dell'utente sulla scheda del Palazzo (guida poco modificabile, raccoglibili slegati dai pin, colonna dell'area che
mostrava tutto il Palazzo); scelte in `DECISIONI.md`.

| Voce | Contenuto | Stato |
|------|-----------|-------|
| 1 | Server: `PuntoInteresseDto.pin`, `spostaPunto`, `collegaPinAlPunto` (rifiuti 400/404/409), stato unico voce↔pin (`impostaStatoPunto`, `impostaRaccolto` con «tutti i pin», `allineaStatiPunto` al collegamento), `eliminaPunto`/`eliminaArea` che lasciano il raccolto dei pin, nemico collegato segnabile, voci descrittive senza stato né pin (400 `punto-descrittivo`, 409 `punto-con-pin`, stato rimasto ignorato in lettura; le stesse regole dal lato mappa: dettaglio del pin, raccolto, riferimento nell'editor, popup e schede). Interfaccia: `GuidaDellArea` (voci sempre visibili, Modifica, Elimina, Su/Giù, Aggiungi, «N pin» / «da collegare», «Collega pin» con la mappa di scelta dentro la voce, Scollega, rilettura della scheda dopo ogni collegamento, nessun comando di stato sulle descrittive), `VisoreMappa` modalità `scelta`, colonna dell'area solo dell'area. Test: `guida-pin` (10, casi indipendenti), `GuidaDellArea` (6), `VisoreMappa` scelta (3), `DungeonDettaglioPage` (+1 voce «ottenuto» scollegata), `VisoreMappa` popup di un pin non collezionabile collegato (+1) e pin di una voce descrittiva (+1), `SchedaContenutoGuida` (2), ognuno visto rosso senza la correzione. Verifica nel browser a 1366×657, 1280×689, 1024×690, 768×1024, 375×812 | ✅ validata (3° esame) |

## Nuova area della guida (1 ottobre 2026) — fatto

| Voce | Contenuto | Stato |
|------|-----------|-------|
| 1 | `creaArea` (`POST /api/compendio/dungeon/:chiave/aree`: nome, descrizione, `dopo` un'area / `null` in cima / assente in fondo, `planimetria`; ordine del Palazzo ricompattato; chiave unica anche rispetto agli alias della guida, entro i 200 caratteri delle route (slug troncato; «area» se il nome non ha lettere); tutto o niente con la planimetria). `ModuloNuovaArea` nella scheda della planimetria («Nuova area della guida…», nome della stanza proposto, posto dopo la sua ultima area, in vista e dal nome, invio sospeso con modifiche non salvate o conferma d'eliminazione aperta) e nella colonna del Palazzo («Nuova area»); creata, la scheda la apre. Test: `nuova-area` (6), `DungeonDettaglioPage` (+4), ognuno visto rosso senza la correzione. Verifica nel browser a 1366×657, 768×1024, 375×812 (area di prova creata ed eliminata, ordine delle aree identico a prima) | ✅ validata (3° esame) |

## Aggiornamento di pipeline, immagini e dipendenze (1 ottobre 2026) — fatto

| Voce | Contenuto | Stato |
|------|-----------|-------|
| 1 | GitHub Actions: checkout v7, setup-node v7, setup-buildx v4, build-push v7, Node 24 (ci.yml e docker-publish.yml). Docker: `node:24-alpine`, `nginx:1.30-alpine`. Dipendenze: eslint 10 / @eslint/js 10 (+ correzioni delle regole nuove), react 19.3, react-router 7.18.4, zod 4.6.5, vite 8.3.2, tsx, typescript-eslint 8.71, supertest, globals, tipi; `npm audit` 0. Restano fuori di proposito: TypeScript 7, vitest 5 (+ coverage, jest-dom 7), @types/node 26, concurrently 10; better-sqlite3 12 (bug npm con la 13). `engines` a Node ≥ 22.13 (minima di eslint 10 e vite 8). Verifica: typecheck, lint, lint:ci, 1222 test, build Vite, build e avvio delle due immagini Docker in locale, app nel browser, pipeline su GitHub | ✅ validata (1° esame) |
| Da riprendere | better-sqlite3 13 quando npm/cli#9837 è corretto (toglie il deprecato `prebuild-install`); vitest 5; TypeScript 7 quando typescript-eslint lo supporta | da fare |

## Tipi delle voci della guida ed Enigma contenitore (1 ottobre 2026) — fatto

| Voce | Contenuto | Stato |
|------|-----------|-------|
| 1 | Tipi: etichette «Stanze sicure», «Semi della bramosia», «Forziere normale», «Forziere raro», «Nemico»; nuovi Porta, Meccanismo, Storia; Persona e Storia collegabili a qualunque pin e con stato, «Altro» solo descrittivo; «da collegare» solo per i tipi che hanno di solito un pin (`puntoDaCollegare`); pin «Tesoro» tolto dal registro. Test: `guida-pin` (+1), `GuidaDellArea` (+1, descrittiva ora «Altro»), registro dei pin (41 tipi), palette dell'editor, fixture della mappa; ognuno visto rosso senza la correzione | ✅ validata (2° esame) |
| 2 | Campo dedicato alla voce: `spillo.voce_chiave` (migrazione 094) separato dal riferimento, così si collegano anche i pin con una destinazione o un Confidente (88 nel canone di produzione); migrazione dei collegamenti dei pin delle planimetrie (uid e stati intatti, elementi senza mappa invariati; nel canone e nel DB locale i pin da spostare erano 0); regola unica `VOCE_DEL_PIN` (`voceDelPin.ts`); regole del collegamento uniche (`erroreVoceDelPin`) per guida, editor (che non tocca più il riferimento) e pacchetto delle mappe (campo `voce`, validato, compatibile coi pacchetti di prima, voce conservata quando il pacchetto tace, `vociScartate`); `SpilloDto.voce` letto da visore, editor e stato; «Sulla mappa» della voce. Test: migrazione 094 (nuovo), `guida-pin` (+8: Storia su un passaggio con destinazione — rosso su HEAD, 409 `pin-gia-collegato` —, editor, regole dall'editor, «Sulla mappa», pacchetto nuovo e di prima, voce non valida o di un altro Palazzo, reimportazione che tace, reseed; ognuno visto rosso togliendo la sua correzione), `VisoreMappa` (+1), fixture adeguate; 1236 test verdi; prova nel browser su un passaggio con destinazione, dati di prova ripristinati. Popup del visore con altezza misurata e foglio quando non sta da nessun lato (a 768 il popup di uno spostamento con voce veniva tagliato), test +2. Un pin di una voce spostato fuori dal suo Palazzo si rifiuta (test). Prova nel browser sul canone a 1280/768/375 (visore ed editor), console pulita in una scheda nuova. 1° esame: rigettato (prove grezze, reseed, regole dell'editor, validazione del pacchetto); 2° esame: rigettato (prova nel browser) | ✅ validata (3° esame) |
| 3 | Enigma contenitore: `punto_interesse.contenitore_chiave` (migrazione 095); passi = voci di qualunque tipo ordinate dentro l'Enigma (stessa area, un livello solo, «Su»/«Giù» fra i passi); risolto quando i passi da segnare sono fatti (le descrittive non contano), segnarlo segna i passi ancora da fare e i loro pin (quelli già segnati restano come sono), riaprirlo li riapre, un passo segnato o riaperto (guida, pin raccolto, unione degli stati, elemento senza mappa, boss finale dal Tesoro) porta con sé l'Enigma; un passo nuovo ancora da fare riapre l'Enigma risolto (scelta dell'utente, 2026-10-02); stati in `mappe/statiGuida.ts`; pin solo sui passi (`erroreVoceDelPin`); interfaccia: passi dentro l'Enigma con «N/M passi», «Aggiungi un passo», «Passo di»; contenuti della guida con i passi sotto l'Enigma. Test: migrazione 095, `enigmi-guida` (11), `GuidaDellArea` (+6), `OrganizzazioneMappe` (+1), `DungeonDettaglioPage` (aggiornamento immediato del raccolto con la rilettura ancora in corso, riletture sovrapposte: vince l'ultima chiesta; mock azzerati con reset, non clear); 25 rossi, uno per parte; 1263 test verdi; prova in Edge a 1280/768/375 senza overflow né errori, dati di prova ripristinati — 1° esame: rigettato (passi già segnati riscritti, semantica del passo nuovo da decidere, strade senza test, boss finale, visibilità, misura del browser); 2° esame: rigettato (il test non distingueva l'aggiornamento immediato dalla rilettura). Note aperte: la ricarica completa non passa dal contatore delle riletture; lo storico registra solo le azioni dirette | ✅ validata (3° esame) |

## Stato dei pin e condizioni sullo stato di altri pin (3 ottobre 2026) — fatto

Richiesta dell'utente del 30 settembre (rimasta senza seguito) ripresa il 3 ottobre: lo stato dei pin come quello «raccolto» degli
oggetti anche per meccanismi, punti sensibili, nemici (boss e miniboss compresi) e porte chiuse, collegato agli stati della guida e
degli Enigmi quando i pin sono collegati, e la visibilità di un pin decisa dallo stato di uno o più altri pin, in AND o in OR.

| Voce | Contenuto | Stato |
|------|-----------|-------|
| 1 | Stato dei pin per tipo: Meccanismo «Azionato», Punto sensibile «Gestito», Nemico «Affrontato», Porta chiusa «Aperta», Boss e Miniboss «Sconfitto», gli altri consumabili «Raccolto»; si segnano come i raccolti (stesso dato `spillo_partita`); i quattro informativi non contano nel completamento e segnati restano visibili, attenuati; per togliere il segno «Richiudi» (la porta torna «chiusa»), «Annulla» per gli altri («non più …»); un pin senza stato e senza voce non si segna (400 `spillo-senza-stato`); un pin con voce della guida segna la voce e il suo Enigma, e ne mostra lo stato; pulsanti, avvisi, intestazioni, etichette, invito senza partita e descrizione nell'editor con la parola del tipo; dopo ogni azione il visore rilegge la mappa in silenzio (vince l'ultima lettura; ogni caricamento completo — mappa, partita, versione, momento, `ricarica` — rende vecchie le riletture in sospeso; le copie locali valgono solo sulla copia della mappa a cui si riferiscono). Test: `aree-eliminabili`, `guida-pin`, `enigmi-guida` (+1), `067`, `spilli`, `MappaPage` (+2), `useMappaPartita` (nuovo, 5), `SchedaSpilloStato` (nuovo, 3), `EditorMappaPage` (+1), `ContenutiGuidaAccesso`, `RaccoltaPlanimetrie` (nuovo: la colonna del Palazzo dice «Sconfitto» per i boss); 22 rossi; prova in Edge a 1280/768/375 con pin di prova, DB ripristinati identici — 1° esame: rigettato (testi dell'editor e dell'invito, parole per togliere il segno e per i boss da chiedere all'utente, riletture contro i caricamenti completi, commenti e documenti, prova e rossi incompleti); 2° esame: rigettato (la colonna del Palazzo diceva «Raccolto» ai boss). Note aperte: «Mostra anche i raccolti» e «X di Y raccolti» restano generici dei collezionabili; una `ricarica` a dati visibili (oggi non esposta) andrebbe rivista | ✅ validata (3° esame) |
| 2 | Condizione «Pin di una mappa: segnato / non segnato» (`{ tipo: 'spillo', spillo: uid, segnato }`): di presenza (nasconde il pin anche se è una porta o un meccanismo del gioco), combinabile con TUTTE / ALMENO UNA / NON; scelta del pin con ricerca fra quelli con stato di tutte le mappe; validazione in scrittura e nell'importazione (anche verso pin dello stesso pacchetto, ricontrollati a pacchetto inserito); pin eliminato o diventato senza stato → grigio, cartellino «Da correggere»; il visore rilegge la mappa in silenzio dopo ogni cambio di stato (voce 1). Lo stato si legge anche dalla voce della guida del pin, come nel visore (non le descrittive); solo nelle condizioni dei pin delle mappe (catalogo anche negli effetti e schede della guida senza mappa: 400); niente pin che dipende da se stesso né giri (scelta dell'utente: rifiutati con i nomi, anche nei pacchetti; l'editor non offre il pin aperto, `SpilloDto.uid`); regola degli elementi fissi ripristinata (scelta dell'utente: `restaInVista`, marcati «non ancora»); NON su gruppo misto corretto (scelta dell'utente); `GET /api/condizioni/spilli`; controllo dell'uid e tipo descrittivo in un posto solo (`uidValido`, `TIPO_PUNTO_DESCRITTIVO`). Test: `condizioni-pin` (nuovo, 12), `visibilitaCondizionale` (regola dei fissi), `condizioniSpillo` (+4), `statiPartita` (campione), `EditorMappaPage` (+2), `CondizioniEditor` (+1), `ChipDisponibilita` (+1), `MappaPage` (+1); 29 rossi; prova in Edge a 1280/768/375 (condizione dall'editor, porta che sparisce e ricompare, porta del gioco in vista con «Non ancora», giro rifiutato), DB ripristinati identici — 1° esame: rigettato (autoriferimento e giri, pin citato senza stato, documenti sui fissi, cartellino, ambito «solo pin», rossi); 2° esame: rigettato (codice d'errore del catalogo nei documenti, un commento spostato nel visore). Confermato dall'utente (2026-10-03): «Vai: …» resta disattivato su passaggi e scale del gioco in vista ma non disponibili. Da correggere (l'utente, sul pin Confidente): un pin senza stato ma con voce della guida si segnava ma non si citava — fatto nella sezione «Tutti i pin con uno stato» | ✅ validata (3° esame) |

## Tutti i pin con uno stato: parole e condizioni (3 ottobre 2026) — fatto

Domanda dell'utente: «perché tra i pin della mappa selezionabili non vedo anche il PIN Confidente (che ha Ottenuto true/false)?»,
poi «anche i dialoghi… insomma tutti i pin che hanno uno stato», «vanno integrati con i termini attivo/disattivo corretti e
inseriti tra i pin che condizionano altri pin e il cui status diventa collegabile con gli elementi della guida».

| Voce | Contenuto | Stato |
|------|-----------|-------|
| 1 | Una regola sola per «ha uno stato» (`statoCitabile`): i tipi con uno stato loro e qualunque pin collegato a una voce della guida non descrittiva («ottenuto»); la usano il segno sulla mappa (400 `spillo-senza-stato` anche per un pin di una voce «Altro»), l'elenco dei pin citabili, la validazione e la valutazione delle condizioni. Parole (tabella completa scelta dall'utente): Dialogo «Parlato», Confidente «Incontrato» (stato proprio, resta pin di città), Forziere e Forziere raro «Aperto» (si «Richiudono» → «chiuso»), Tesoro del Palazzo «Rubato», Timbro «Timbrato»; semi e oggetti «Raccolto»; le altre come prima. Il Confidente collegato a una voce la segna e ne è segnato. Test: `condizioni-pin` (+5: Confidente, Dialogo, stanza sicura con voce, voce «Altro», pacchetto, Confidente con voce), `spilli` (tabella, ritorni, `statoCitabile`), `EditorMappaPage`, `RaccoltaPlanimetrie`, e le parole aggiornate in `VisoreMappa`, `MappaPage`, `DungeonDettaglioPage`, `ContenutiGuidaAccesso`, `SchedaSpilloStato`; importazione: i pin del pacchetto si accettano all'inserimento e si verificano a pacchetto inserito, con le voci già scritte (l'esito non dipende più dall'ordine: +3 test, visti rossi prima); il Confidente nell'editor dice il suo stato; il suo «Incontrato» resta separato dal Confidente della partita (scelta dell'utente); 14 rossi; prova in Edge a 1280/768/375 (Confidente «Incontrato» / «Annulla», Dialogo «Parlato», editor con «Confidente · incontrato», «Dialogo · parlato» e la descrizione del Confidente) e reimportazione reale via API, DB ripristinati identici — 1° esame: rigettato (importazione dipendente dall'ordine, documenti, editor del Confidente, commenti, un rosso mancante); 2° esame: rigettato (mancava il test del caso contrario: un pacchetto che cita un suo pin senza stato — aggiunto, con la sua variante rossa: 15 rossi). Note: «Mostra anche i raccolti», «X di Y raccolti», «Tutto raccolto» restano generici dei collezionabili; un pin con stato suo e con voce della guida mostra nel popup gli stati della voce («Ottenuto») e nella condizione la parola del tipo | ✅ validata (3° esame) |

## Verifica completa del codice, commenti e Swagger (3 ottobre 2026) — fatto (PR #96 unita il 4 ottobre)

Richiesta dell'utente: «fai una verifica completa del codice di BE e di FE su un branch di ottimizzazione, verifica che non ci siano
dati e strutture ridondanti, che il codice sia ottimizzato, modulare, senza bug o criticità… Aggiungi commenti al codice (in
italiano) per spiegare le funzioni cosa fanno e la logica interna, aggiungi swagger e fai in modo che la documentazione sia
consultabile». Piano approvato dall'utente; branch `ottimizzazione/verifica-completa`, chiusura con la sola PR (il merge lo fa
l'utente). Misure di partenza: server 210 file / 21k righe, frontend 275 / 26k, condivisi 24 / 5k; 185 rotte nei router
(187 con `/api/health` e `/api/config`) senza documentazione; ~895 funzioni senza commento, 51 file senza intestazione.

| Voce | Contenuto | Stato |
|------|-----------|-------|
| 1 | Verifica in sola lettura (server, condivisi, frontend): bug e criticità, dati e strutture ridondanti, punti lenti; ogni rilievo verificato sul codice; elenco all'utente (le scelte che cambiano comportamento sono sue) | fatto — cinque verifiche e cinque controverifiche indipendenti; dopo la prima validazione aggiunte script/deploy/configurazione/test e commenti e documenti obsoleti; 184 rilievi confermati, nessuno falso, in `docs/analisi/verifica-completa-2026-10-03.md` con gravità, correzione, fase e le due scelte per l'utente (CORS, scaricamento di immagini da URL) |
| 2 | Correzione di bug e criticità, ciascuna con test e variante rossa | fatto — tutti i rilievi di fase 2 corretti (§8 del rapporto), 115 varianti rosse più le prove manuali rosse di A2, S1, S6, S7, D1, D2 e D4; validatore: 1° esame rigettato (F1–F8, N1–N4), 2° rigettato (G1, G2: prove di F7 e N4), APPROVATO al 3° esame; scelte dell'utente: CORS tolto, immagini da URL senza blocchi (DECISIONI 2026-10-03) |
| 3 | Ridondanze e ottimizzazioni senza cambiare il comportamento | fatto — APPROVATO al 2° esame (1° rigettato: H1 prove grezze, H2 prune Docker, H3 dati migrati, H4 cambi visibili, H5 compatibilità con i file di main, H6 asserzioni tolte, H7 fotografia completa; tutto prodotto, le decisioni dell'utente in DECISIONI 2026-10-04; fotografia completa: 4625 GET identiche fra b0939456 e 72e23d70 salvo le differenze previste) — sette lotti (A–G, 9 commit) su tutti i rilievi di fase 3 (§9 del rapporto): fotografia di 1831 risposte identica prima/dopo su una copia dei dati veri; confronti diretti con l'implementazione di prima (raggruppamento degli spilli 12.300 casi, area delle planimetrie 20.000 immagini, impronte di scorta, compendio, Confidenti, importazione delle mappe); misure (dettaglio mappa 8,6 → 1,7 ms, albero 52 → 9,6 ms, bundle iniziale 1215 → 367 kB); migrazioni 096 e utente 016; immagini Docker costruite e provate; browser senza errori. Non fatti e perché: F20, P6' (misurati), parte di K5‴ (TS6307). Da segnalare: il BE in `tsx watch` ha applicato 096/016 ai dati veri (copia di avvio in `data/backups`), e un `docker volume prune` |
| 4 | Commenti in italiano: intestazione dei file, commento di ogni funzione (cosa fa e logica interna) | fatto — APPROVATO al 3° esame (1° rigettato: I1 censimento che contava i divisori, I2 test esclusi, I3 O18 incompleto, I4 prove grezze; 2° rigettato: I5 pulsante inesistente in MAPPE.md) — censimento severo, test compresi: 793 file con intestazione, 2489 funzioni con un commento proprio; revisione dei commenti scritti in parallelo (47 voci); commenti e documenti obsoleti O1–O26 di §5-ter; difetti trovati commentando (testo `//` a schermo in `SchedaContenutoGuida`, residuo di A9) corretti con test; N7 (`Congelato<T>` per `datiGuida`); codice cambiato solo in 10 file voluti (§10 del rapporto) |
| 5 | Swagger: OpenAPI generato dagli schemi zod, descrizione in italiano di ogni rotta, test di copertura, `/api/docs` e `/api/openapi.json`, collegamento da Impostazioni | fatto — APPROVATO al 2° esame (1° rigettato: J1 «Prova» su GET che scrivono, J2 DECISIONI, J3 script su ARCHITETTURA — risposte dell'utente in DECISIONI) — 187 operazioni in 11 aree, registro in italiano in `server/openapi/descrizioni/`, `openapi.test.ts` (copertura e validità OpenAPI 3.1), Swagger UI locale (`swagger-ui-dist`, «Prova» solo sulle GET di sola lettura), collegamento in Impostazioni; licenze ripristinate in `licenze/` (§11 del rapporto) |
| 6 | Chiusura: typecheck, lint, test, browser a 1280/768/375, PR verso main | fatto — APPROVATO al 2° esame (1° rigettato: K1 esito di `npm audit`, poi eseguito su un worktree pulito: 0 vulnerabilità) — controlli completi e build, stack Docker con nginx, 34 pagine a 1280/768/375 senza errori, copie dei dati veri tolte dallo scratchpad (autorizzazione dell'utente), PR verso `main` senza merge (§12 del rapporto) |

## Richieste del 4 ottobre 2026 — in corso

Tre richieste dell'utente arrivate dopo la verifica completa, lavorate su `main`.

| Voce | Contenuto | Stato |
|------|-----------|-------|
| 1 | Spunta delle aree completate nella pagina del Palazzo: un'area della guida è completata quando tutte le sue voci da segnare sono Ottenute o Esaurite. La spunta compare accanto all'area, accanto alla stanza che ha tutte le aree completate e nei chip «Su questa planimetria» | fatto — APPROVATO al 2° esame (1° rigettato: prove grezze, commento sulla posizione della spunta, test delle versioni e del ricalcolo immediato, residui della copia) — regola in `src/utils/completamentoAree.ts`, 13 test nuovi, verifica nel browser a 1280/768/375 con una partita di prova poi rimossa |
| 2 | Palazzo di Kamoshida sulla mappa di Tokyo: visibile dall'11/04, con l'arrivo che cambia con i giorni dei tutorial (11/04 Prigione sotterranea, 12/04 Sala Centrale, poi un altro tutorial, poi l'accesso standard) | da studiare |
| 3 | Un'area della guida agganciata a una seconda planimetria si scollega dalla prima: deve poter stare su più planimetrie | da studiare |
