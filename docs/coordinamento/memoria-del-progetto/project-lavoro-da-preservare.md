---
name: project-lavoro-da-preservare
description: vincolo di ogni ristrutturazione — preservare la validazione del diario fino al 1° giugno e il lavoro sui Palazzi di Kamoshida e Madarame
metadata:
  node_type: memory
  type: project
  originSessionId: e607dac6-f330-471d-b336-bd3dc2c5c00f
  modified: 2026-10-23T19:37:34.899Z
---

Vincolo dell'utente (2026-10-19), per ogni migrazione o riorganizzazione dei dati: **va preservato il lavoro di validazione del diario fino al 1° giugno e il lavoro svolto sui Palazzi di Kamoshida e Madarame.**

Misure di riferimento (base confermata dall'utente il 2026-10-20, fotografia di produzione del 20 ottobre): diario dal 04-01 al 06-01 = 254 voci (nessun segno «validato»: si riconoscono solo da `updated_at`, grosso rivisto il 2026-09-30); Kamoshida 169 voci della guida e 359 pin dell'utente; Madarame **225 voci e 252 pin dell'utente** — il 20/10 l'utente ha completato l'ultima infiltrazione che conclude il Palazzo (i 196/250 erano la fotografia del 19/10). Pin «utente» = spilli con origine='utente' nell'albero `dungeon-<k>`; il perimetro «impronta» (tutte le origini + pin senza mappa legati per area) dà 373 e 261.

Aggiornamento 2026-10-20 06:40 (copia fresca della produzione chiesta dall'utente, `p5s-coordinamento/dati-produzione/2026-10-20-0440Z/`): la sera del 19/10 (22:18–22:36 UTC) l'utente ha aggiunto lavoro. Nuove misure: diario 04-01..06-01 = **255 voci** (+1 il 06-01, Igor sera; e la nota di b9371f80 cambiata), Kamoshida invariata (169 voci, 359 pin utente; impronta 373), Madarame **227 voci e 254 pin dell'utente** (impronta 263; pin nuovi 2300 «La vera Sayuri Originale» e 2301 «Madarame»). Ogni nuova copia va confrontata con la precedente: l'utente continua a giocare e a scrivere in produzione.

Dal 2026-10-20 ~05:05Z **la fonte dei dati è p5s** (utente: «no l'ho fatto su p5s», «persona5royal non lo tocco fino a quando non termini il lavoro»): la produzione resta ferma alla copia 0440Z; p5s contiene lavoro dell'utente e **non si sovrascrive mai** (i rilasci migrano i suoi dati con la sola copia di sicurezza automatica che il server fa a ogni avvio: **niente backup manuale del volume**, decisione dell'utente del 2026-10-20 ribadita il 2026-10-23); la base è la copia in sola lettura di p5s (`dati-produzione/p5s-<data>-<ora>Z/`, prima: `p5s-2026-10-20-0503Z`). Sulla partita 1 Kamoshida è **chiuso al 100%** (169/169 voci ottenute, segnate su p5s 04:52–05:01Z). Regole complete in `p5s-coordinamento/collaudo/PROCEDURA-DATI.md`.

Riscontro del 2026-10-23 19:35Z (copia di p5s in sola lettura, `dati-p5s/p5s-2026-10-23-1935Z/`, schema 138/30):
- Kamoshida 169 voci e 359 pin utente; Madarame 226 voci e 254 pin utente; totale pin utente 613, come la base.
- Madarame ha una voce in meno, «Raccogli Installazione Artistica»: è nel Cestino (id 18), eliminata dall'app il 20/10 alle 17:59:30Z, quindi da una scrittura dell'utente e non da una migrazione. Si recupera con «Rimetti».
- Diario 04-01..06-01: 255 voci, tutte con effetti convertiti.
- Il «611» citato da Codex non trova riscontro: la misura vera è 613.

**Why:** è lavoro manuale lungo dell'utente su dati che la ristrutturazione tocca (voci del diario, infiltrazioni, pin, planimetrie).

Precisazione dell'utente: «devono funzionare anche dopo la conversione» — non basta conservare i dati: diario (spunte, effetti, avanzamento del giorno, collegamenti) e Palazzi (voci, pin, stati, percentuali, segnare/togliere da guida e mappa) vanno provati funzionanti sulla copia della produzione, con la partita reale e una di prova, prima di ogni rilascio.

**How to apply:** ogni migrazione che tocca questi dati: provata su copia della produzione, confronto prima/dopo voce per voce e pin per pin (testi, ordine, uid, collegamenti, stati delle partite), nessuna rigenerazione dal pacchetto, ogni fusione o spostamento proposto in un elenco e applicato solo dopo il sì. Vedi [[project-gerarchia-mondo]], [[feedback-prove-sui-dati-reali]], [[reference-recupero-produzione]].
