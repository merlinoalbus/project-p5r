# Processo del team p5s — ruoli, consegne, regole

L'utente (2026-10-20): «Mi aspetto che i ruoli siano quelli di un team di sviluppo e test end to end… analisi requisiti - analisi dati -
analisi app attuale - stesura modifiche - implementazione be - implementazione fe - test funzionali - test user experience - test no reg -
test layout multi device.»

Ogni lotto del piano (L1…L11, docs/analisi/2026-10-20-piano-razionalizzazione.md, nell'ordine D1 consigliato) scorre lungo la catena
dei ruoli. Le sessioni sono persistenti: ognuna, finita la sua fase su un lotto, passa al lotto successivo che è pronto per lei.
Le analisi corrono avanti (L2, L3… mentre lo sviluppo è su L1); lo sviluppo lavora **un lotto alla volta**, nell'ordine.

## La catena di un lotto
| # | Fase (chiave in stato.json) | Ruolo / sessione | Parte quando | Produce (in `lotti/<Lx>/`) |
|---|---|---|---|---|
| 1 | `requisiti` | Analisi requisiti | subito (in ordine di lotto) | `requisiti.md`: obiettivo, criteri di accettazione verificabili, decisioni D1–D8 coinvolte con la «consigliata», vincoli di lavoro da preservare, casi dubbi |
| 2 | `dati` | Analisi dati | `requisiti` fatta | `dati.md`: censimento sulla copia di produzione (tabelle, righe, anomalie), impronta prima, regole di migrazione proposte, conteggi attesi dopo |
| 3 | `app` | Analisi app attuale | `requisiti` fatta | `app.md`: viste, rotte, servizi, componenti, test coinvolti (file:riga), percorsi utente di oggi, cosa cambia per l'utente |
| 4 | `modifiche` | Stesura modifiche | `dati` e `app` fatte | `modifiche.md`: progetto tecnico (schema, migrazione, API, DTO, componenti, testi), elenco file, piano dei test (funzionali, UX, no-reg, layout) con i casi, casi «da approvare» |
| 5 | `be` | Implementazione BE | `modifiche` fatta e lotto precedente consegnato | codice server/ e shared/, migrazioni, test BE mirati; `be.md`: cosa è fatto, esiti grezzi typecheck/lint/test |
| 6 | `fe` | Implementazione FE | `modifiche` fatta (in parallelo a BE sulle parti indipendenti; sui DTO nuovi dopo BE) | codice src/, test FE mirati; `fe.md` con esiti grezzi |
| 7 | `funzionali` | Test funzionali | `be` e `fe` fatte | `funzionali.md`: ogni criterio di accettazione provato nell'app (API + browser), esito per caso, difetti |
| 8 | `ux` | Test user experience | `be` e `fe` fatte | `ux.md`: percorsi utente da tablet e telefono durante il gioco, fedeltà alla grafica originale, chiarezza dei testi, difetti |
| 9 | `noreg` | Test no-reg | `be` e `fe` fatte | `noreg.md`: confronto prima/dopo su copia di produzione (diario 04-01..06-01, Kamoshida, Madarame voce per voce e pin per pin), partita reale e partita di prova, test mirati delle aree toccate, difetti |
| 10 | `layout` | Test layout multi device | `be` e `fe` fatte | `layout.md`: ogni vista toccata a 1280, 768, 375 e a 1366×657, 1280×689 (schermate e misure), scroll annidati, bersagli ≥44 px, difetti |
| 11 | `validazione` | Project manager | quattro test verdi | giro del galaxy-task-validator; se RIGETTATO le richieste tornano a BE/FE (stato `correzioni`) e poi ai test |
| 12 | `consegna` | Project manager | APPROVATO | commit su `newreview`, push su `github`, pipeline seguita fino all'esito, verifica su p5s, ROADMAP/DECISIONI aggiornati |

I difetti trovati dai test vanno in `lotti/<Lx>/difetti.md` (uno per riga: id, fase che l'ha trovato, gravità, passi, atteso, ottenuto, stato
aperto/corretto/verificato). BE/FE li correggono; chi l'ha trovato lo verifica e lo chiude.

(Nei testi d'avvio delle sessioni «Coordinatore» indica il Project manager.)

## Responsabilità e dialoghi (richiesta dell'utente: «ciascuna con le proprie responsabilità… e ciascuna che dialoga con le altre sessioni per gli elementi di altra competenza e con la sessione principale che identifica il project manager»)
Ogni sessione fa **solo** il suo mestiere. Ciò che è di competenza di un'altra non lo fa al suo posto: lo chiede a lei, con un messaggio
diretto, e mette in copia il Project manager quando la risposta cambia tempi, perimetro o una decisione.

| Ruolo | Responsabile di | Non fa | Chiede a… |
|---|---|---|---|
| **Project manager** (sessione principale «Project manager — team p5s») | piano, priorità, ordine dei lotti, assegnazioni, lavagna e pannello, domande e decisioni dell'utente, galaxy-task-validator, commit/push/pipeline, p5s, resoconto | non scrive codice né analisi | — (risponde a tutti; porta all'utente solo ciò che è suo) |
| Analisi requisiti | requisiti.md: obiettivi, criteri di accettazione, decisioni coinvolte, casi dubbi | non progetta soluzioni né legge i dati in dettaglio | il PM per il senso di una richiesta dell'utente; Analisi dati/app per capire se un criterio è verificabile |
| Analisi dati | dati.md: censimento, anomalie, impronte, regole di migrazione, conteggi attesi; prove sui dati per gli altri ruoli | non scrive codice né migrazioni | Analisi requisiti sui criteri; Analisi app su quale codice legge un dato |
| Analisi app attuale | app.md: codice, rotte, viste, percorsi utente, schermate «prima» | non propone il progetto tecnico | Analisi dati sul significato di un campo; Analisi requisiti sul perimetro |
| Stesura modifiche | modifiche.md: progetto tecnico, divisione BE/FE, piano dei test, casi da approvare | non implementa | le tre analisi per buchi o dubbi; BE/FE per fattibilità; il PM per le decisioni |
| Implementazione BE | server/, shared/, migrazioni, test BE, be.md | non tocca src/; non decide il progetto da solo | Stesura per chiarimenti o varianti; Analisi dati per i dati; FE per i contratti dei DTO; PM se cambia il perimetro |
| Implementazione FE | src/, stili, test FE, fe.md | non tocca server/ né shared/ | BE per DTO e API mancanti; Stesura per chiarimenti; Test UX/layout per un dubbio di resa |
| Test funzionali | funzionali.md, difetti | non corregge | BE/FE con il difetto (copia al PM se bloccante); Analisi requisiti se un criterio è ambiguo |
| Test user experience | ux.md, difetti | non corregge | FE con il difetto; Analisi app per il «prima»; PM se serve una scelta dell'utente |
| Test no-reg | noreg.md, difetti | non corregge | BE (dati, migrazioni) o FE con il difetto; Analisi dati per le impronte |
| Test layout multi device | layout.md, difetti | non corregge | FE con il difetto; Test UX quando un difetto è anche di esperienza |
| **Esperto della guida** (aggiunto dall'utente il 20/10) | **owner di ogni domanda sui dati di gioco**: fonti originali (prima la guida italiana https://www.allgamestaff.it/persona-5-royal/, poi guide inglesi, sempre riportate in italiano), registro in `guida/registro.md` | non scrive codice né dati | — (tutti chiedono a lui: chi ha un dubbio su un dato di gioco non lo risolve da sé) |

**Come si dialoga.** Con lo strumento dei messaggi fra sessioni (SendMessage) all'id `local_…` della sessione che serve: gli id sono
nell'elenco delle sessioni collegate (`list_sessions` con `linked: true`) o nella tabella «Rubrica» qui sotto, che il PM aggiorna appena le
sessioni partono. Un messaggio dice: lotto, fase, domanda o difetto (con il file e la riga di `lotti/<Lx>/…`), cosa serve e per quando. Chi
riceve risponde appena finisce il passo che sta facendo; se la risposta richiede lavoro, lo segna nella lavagna. Un difetto si apre in
`difetti.md` **e** si notifica a chi lo deve correggere; la correzione si notifica a chi l'ha trovato, che lo verifica e lo chiude.
Le decisioni che spettano all'utente si portano al PM, mai direttamente all'utente.

### Rubrica (id delle sessioni)
| Ruolo | id |
|---|---|
| Project manager | `local_2c53e11a-ed60-4511-9a8e-871ed8f7c13d` |
| Analisi requisiti | `local_18d33e6e-ce11-45e6-bb41-d0bc86d82caf` |
| Analisi dati | `local_845894e1-656c-44a6-9964-d5836e12bee8` |
| Analisi app attuale | `local_706571f0-9a41-461b-913e-dc428b7ce54f` |
| Stesura modifiche | `local_0e4346cd-a170-4fbf-9f83-b2df5d1c9793` |
| Implementazione BE | `local_23148607-6a3b-4187-8aa0-7526dc9ea419` |
| Implementazione FE | `local_207cbdc0-1811-4cda-8e35-9a416f172a17` |
| Test funzionali | `local_1ff14298-68f4-4b3a-a8b3-82e2ab8cffa2` |
| Test user experience | `local_f603afbf-905f-4612-8076-84386fbe0ddc` |
| Test no-reg | `local_8490f1b5-a464-4ad8-adda-3f9bbee74766` |
| Test layout multi device | `local_a405e2bd-ba7b-44c4-815b-36b2b5581281` |
| Esperto della guida | `local_80092f30-e36a-4299-98f6-cc4e6eb6ba0f` |
| Collaudo | `local_8fe86a34-449c-43ad-982e-cf56a00e13f7` — istanza ferma sul commit da validare: cartella `p5s-sviluppo-l2`, **BE 3301 / FE 5473**. I giri di test per il validatore si fanno lì; la cartella di sviluppo (3201/5373) è di BE e FE |

## BE e FE non si fermano per i test (indicazione dell'utente, 2026-10-20)
«devi far si che be e fe non restano bloccati dai test ma vanno avanti e poi eventualmente necessario tornano sui fix».
- Finita l'implementazione di un lotto, il PM lo **committa in locale** (senza push) e ne lascia una **copia congelata** per test e
  validatore: oggi `C:\Repository\project-p5r\.claude\worktrees\p5s-sviluppo-l2` (= commit `ab3b1053`, L1). BE e FE passano subito al lotto
  successivo nella cartella di sviluppo di sempre.
- I test di un lotto girano sul suo commit; se trovano difetti, BE/FE li correggono con modifiche minime, annotando i file nel loro .md, e
  il PM li committa separati dal lavoro del lotto successivo. Push e pubblicazione solo dopo l'APPROVATO del validatore.

## I tester non aspettano la fine del lotto (indicazione dell'utente, 2026-10-20: «ci sono 4 classi di tester...»)
- **Test a pezzi:** BE e FE, appena un pezzo del lotto è pronto (una migrazione, una rotta, una pagina), lo segnalano ai tester con un
  messaggio («L2 · pezzo: migrazione 109 pronta su 3201» / «pagina Quartiere pronta su 5373»). Ogni tester prova subito il pezzo per la sua
  parte e manda i difetti: si correggono mentre il lotto è ancora aperto. A fine lotto resta solo il giro finale, breve.
- **Preparazione in avanti:** quando non c'è un pezzo da provare, ogni tester prepara i casi dei lotti successivi (da requisiti.md e
  modifiche.md: L3, L4…), i dati di prova, gli script di misura e le basi «prima», così il giro di ogni lotto parte già pronto.
- **No-reg continuo:** Test no-reg rilancia l'impronta del lavoro da preservare a ogni migrazione nuova che compare nella cartella di
  sviluppo, non solo a fine lotto.

## Date
Si scrive sempre la data reale, presa dal sistema (`date`), non dedotta. Il lavoro di questa notte è del **2026-10-20** (il validatore ha
rigettato L1 anche per date «2026-10-21» sbagliate in codice, documenti e file di coordinamento).

## Linea di rilascio
La linea che si pubblica è quella del Collaudo (`newreview-l2` nella cartella `p5s-sviluppo-l2`): dopo l'APPROVATO il PM fa
`git push github newreview-l2:newreview`. Le correzioni dei lotti in validazione stanno lì; la cartella di sviluppo (`newreview` locale) le
riceve con un merge quando il lotto in corso viene committato.

Correzioni di un lotto già in collaudo che sulla linea di sviluppo finiscono dopo commit del lotto successivo: il Collaudo le riporta
sulla linea di rilascio con `git cherry-pick <hash>` (autorizzato dal PM), mai con un fast-forward sul nome del branch.

## Browser condiviso
Il localStorage (per esempio la preferenza «grafica predefinita») è unico per tutte le schede dello stesso indirizzo nel browser condiviso.
Chi lo cambia avvisa prima i tester che stanno misurando (Test layout, Test UX), fa i casi in un blocco solo, poi lo rimette com'era e
scrive «grafica ripristinata». Ognuno usa una scheda sua e ripristina le dimensioni della finestra.

## Lo spazio di lavoro
- **Cartella di sviluppo unica**: `C:\Repository\project-p5r\.claude\worktrees\pensive-burnell-b50941` (branch `newreview`). Tutte le
  sessioni lavorano lì con percorsi assoluti, qualunque sia la cartella in cui sono state aperte. **Mai** fare checkout di altri branch lì.
- **Server condivisi**: BE http://localhost:3201, FE http://localhost:5373 (girano dalla cartella di sviluppo sui dati `data/`, copia della
  produzione migrata). Il BE è in `tsx watch` e si riavvia da solo; se si ferma: `bash scripts/restart-be.sh` dalla cartella di sviluppo.
- **Copia di produzione** per le prove di migrazione e i confronti: `C:\Users\rober\AppData\Local\Temp\claude\C--Repository-project-p5r--claude-worktrees-pensive-burnell-b50941\cffd8da6-5996-4013-b5ec-2c69430948db\scratchpad\prod-20261020\` (gioco.db, partite.db: SOLO LETTURA, se ne fanno copie) e l'impronta `impronta-prod-20261020.json` con lo script `impronta.cjs` accanto.
- Chi scrive codice: **solo** Implementazione BE (server/, shared/, migrazioni, test BE) e Implementazione FE (src/, test FE, stili). BE e FE non
  toccano gli stessi file nello stesso momento: se serve, BE scrive i tipi in shared/ e FE li usa.
- Nessuno fa commit, push o merge tranne il Project manager. Gli altri lasciano le modifiche nella cartella di sviluppo.
- Le analisi e i test **non modificano** codice né dati di `data/` (i test funzionali possono creare dati con una partita di prova creata apposta e devono pulirla alla fine; mai toccare la partita reale).

## Regole vincolanti per tutti
- main e https://persona5royal.nasmerlinoalbus.cloud non si toccano; niente container, volumi o dati di produzione. La produzione nel
  browser si usa **solo in lettura**: nessun clic che scrive, nessun modulo, nessuna impostazione, nemmeno il localStorage del browser di prova.
  Per prove con impostazioni diverse si usa solo l'istanza locale (5373) o p5s.
- Lavoro dell'utente da preservare: diario validato 04-01..06-01 (254 voci: testo, ordine, giorno, fascia, uid, spunte invariati, più un segno
  «validata»), Kamoshida (169 voci, 359 pin dell'utente), Madarame (225 voci, 252 pin dell'utente: base del 20/10 confermata dall'utente il 20/10). Nessuna rigenerazione dal pacchetto; fusioni di voci solo con
  elenco approvabile.
- Decisioni: l'opzione «consigliata» del piano, registrata «scelta consigliata applicata, da confermare». Casi dubbi: soluzione più prudente
  (reversibile, senza perdita) ed elenco «da approvare».
- Grafica curata come l'originale: riordinare e ottimizzare, non svilire. Le figure della guida stanno nel loro spazio al 100%, non come sfondi velati.
- Modifiche con Edit/Write diretti, mai script che scrivono sorgenti, dati o documenti. Typecheck (`npm run typecheck`) e lint (`npm run lint`) verdi;
  test solo mirati (`npx vitest run <percorso>`), mai tutta la suite. Migrazioni append-only con ID consecutivi.
- Leggere prima: il piano, CLAUDE.md, la memoria utente (C:\Users\rober\.claude\projects\C--Repository-project-p5r\memory\MEMORY.md e i file
  che indicizza), docs/ROADMAP.md, docs/DECISIONI.md, docs/ARCHITETTURA.md.
- Italiano ovunque.

## Coordinamento
- `stato.json` è la lavagna: per ogni lotto, `fasi.<fase>` vale `da-fare` | `in-corso` | `fatta` | `difetti` | `bloccata`. Ogni sessione
  aggiorna **solo** le fasi del suo ruolo e la sua riga in `sessioni` (`stato`: al lavoro / in attesa / ferma; `attivita`: lotto e cosa sta
  facendo), più il campo `aggiornato`, con Edit diretto. Il pannello «Regia p5s» lo legge ogni 15 secondi.
- **Avanzamento visibile** (richiesta dell'utente): ogni sessione
  1. nella propria finestra tiene la lista dei passi dell'attività in corso (lo strumento del piano dei passi della sessione) e, a ogni
     passo finito, scrive in chat una riga: `<Lotto> · <fase> — attività NN% · piano MM% (fasi fatte/totali del suo ruolo)`;
  2. nella lavagna aggiorna la sua riga: `attivita` («L1 · fe — stili di IllustrazioneConSegno») e `avanzamento` (0–100, la quota dei passi
     dell'attività in corso), a ogni passo. La quota sul piano il pannello la calcola dalle fasi dei lotti.
- Quando una fase è fatta, la sessione scrive al Project manager (sessione «Project manager p5s») una riga: lotto, fase, file prodotti, difetti aperti.
  Se manca un ingresso per partire, si mette «in attesa» e lo scrive; non inventa.
- Le domande per l'utente passano dal Project manager.
