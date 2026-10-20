# L1 · cicli foto/ripristino dei dati dell'istanza di collaudo

Procedura: `p5s-coordinamento/collaudo/PROCEDURA-DATI.md`. Istanza su e9fb4871.

## Ciclo 0 — prova dello strumento (Collaudo, 2026-10-20 02:52), nessuna prova dei tester
- `foto data foto/L1-base-e9fb4871` a BE acceso → `FOTO OK` gioco.db user_version 108, 76 tabelle, 19 826 righe; partite.db user_version 21, 34 tabelle, 3 186 righe; integrity ok.
- Rilevamento: su una copia della foto nello scratchpad, `update partita set nome=nome||' x'` sulla prima partita → `confronta`: `partite.db.partita: righe 2 → 2, contenuto diverso`, EXIT=2 (copia poi cancellata).
- `ripristina` a BE acceso → `ERRORE: il BE è ancora in ascolto su 3301`, EXIT=1 (rifiuto atteso).
- `stop-be.sh` → `ripristina foto/L1-base-e9fb4871 data` → `RIPRISTINO OK: impronta identica alla foto`, EXIT=0 → `start-be.sh` → `/api/health` ok, userVersion 108.
- Impronta dopo il riavvio del BE contro la foto → `IDENTICHE`, EXIT=0.

## Controllo 2026-10-20 02:53 — dopo il giro di Test UX (dichiarato: solo GET e DOM, nessuna scrittura in data/)
- `impronta data` contro `foto/L1-base-e9fb4871/impronta.json` → `IDENTICHE`, EXIT=0. Dichiarazione confermata; nessun ripristino necessario.
- La preferenza nel localStorage del browser di prova (chiave p5r-preferenze, rimessa com'era) è fuori da data/ e da questo controllo.

## Ciclo 1 — Test layout, caso G6 (richiesta del PM): /guida/citta/kichijoji scarica la pianta pubblicata (POST /api/mappe/piante-citta/kichijoji/scarica) e scrive l'immagine della mappa citta-kichijoji
- 02:56 `foto data foto/L1-ciclo1-layout-G6` → `FOTO OK` gioco.db 108, 76 tabelle, 19 829 righe; partite.db 21, 34 tabelle, 3 186 righe. BE.log: nessun POST piante-citta prima della prova.
- Confronto con la base: `gioco.db.immagine_miniatura: righe 69 → 72` — miniature create dal BE su richiesta durante le letture dei tester (cache di L1, migrazione 108), non scritture dei tester; la foto del ciclo parte da questo stato.
- «foto fatta» inviato a Test layout alle 02:56. In attesa della fine della prova.
- 02:58 BE.log: ogni `POST /api/mappe/piante-citta/kichijoji/scarica` (00:57:16, 00:57:28, 00:57:40, 00:57:53, 00:58:34 UTC) → 400 `download-fallito`; dalla macchina `curl https://www.allgamestaff.it/persona-5-royal/indice/` → 200. Segnalato a Test layout e a Test funzionali, a cui tocca aprire il difetto.
- 02:59 impronta intermedia contro la foto del ciclo: cambia solo `immagine_miniatura: righe 72 → 74`, cioè miniature create dalle letture; nessuna immagine di mappa scritta.
- 02:58 Test funzionali chiede lo stesso caso G6: messo in coda dietro Test layout. Dopo il ripristino del ciclo 1 avrà una foto sua (ciclo 2).
- 02:59 Test layout ha finito; secondo lui gli scarichi sono falliti con «L'indirizzo ha risposto 403», perché static.wikia.nocookie.net rifiuta il server.
- 02:59:45 impronta dopo le prove contro la foto → solo `gioco.db.immagine_miniatura: righe 72 → 74`, EXIT=2. Le scritture registrate nel BE.log dopo la foto sono 6 POST, tutti con 400: 5 su `piante-citta/kichijoji/scarica` (00:57:16 → 00:58:34 UTC) e 1 su `piante-citta/meiji-shrine/scarica` (00:59:19 UTC).
- `stop-be.sh` → `ripristina foto/L1-ciclo1-layout-G6 data` → `RIPRISTINO OK: impronta identica alla foto`, EXIT=0 → `start-be.sh` → health ok, userVersion 108 → impronta dopo il riavvio `IDENTICHE`, EXIT=0 (02:59:52). **Ciclo 1 chiuso.**
- Nota: `start-be.sh` azzera BE.log a ogni avvio. Le righe del BE.log di questo ciclo sono quelle trascritte qui sopra. Dal ciclo 2 in poi il BE.log viene archiviato prima del riavvio.

- Origine delle 2 miniature del ciclo 1 (72 → 74), dichiarata da Test no-reg: GET con `l=` durante il suo giro di sola lettura per G7 (00:56–01:02 UTC). Sono le immagini 390 e 391, larghezza 160, created_at 00:58:47.995Z. Il ripristino del ciclo 1 le ha già tolte. Le altre 3 righe in più rispetto alla base (69 → 72) erano già nella foto del ciclo 1 e vengono da letture precedenti. È tutta cache rigenerabile (migrazione 108), quindi non si ripristina la base: lo stato di partenza dei cicli resta la loro foto.

- Esito dichiarato da Test layout: aperto il difetto LAY-2 per il BE, con copia al PM. Causa: Cloudflare/Fandom risponde 403 alle richieste senza Referer; con Referer `https://megamitensei.fandom.com/` e UA da browser curl ottiene 200. Dopo la correzione chiederà un nuovo ciclo per rifare G6, sul commit di correzione.

## Ciclo 2 — Test funzionali, caso G6 (scarico automatico della pianta di Kichijoji; intestazione e visore con la stessa immagine senza ricaricare)
- 02:59:59 `foto data foto/L1-ciclo2-funzionali-G6` → `FOTO OK` gioco.db 108, 76 tabelle, 19 829 righe; partite.db 21, 34 tabelle, 3 186 righe. Confronto con la foto del ciclo 1 → `IDENTICHE`.
- «foto fatta» inviato a Test funzionali, con l'avviso che nel ciclo 1 gli scarichi erano falliti con 403. In attesa della fine della prova.
- Test funzionali dichiara di aver fatto G6 senza scrivere su 3301: ha intercettato la POST di scarico nel browser e ha mandato davvero al BE solo le riletture. Giro su e9fb4871 completo (F-03, F-06, F-10, F-28, G6), esiti in `lotti/L1/funzionali.md`.
- 03:03:33 impronta contro la foto del ciclo → `IDENTICHE`, EXIT=0. BE.log dall'avvio delle 02:59:52: nessuna richiesta POST/PUT/PATCH/DELETE. Nessun ripristino necessario: **ciclo 2 chiuso**.

La foto `L1-base-e9fb4871` resta come base dell'istanza su e9fb4871 (base pulita di produzione + migrazioni 107-108).

## Ciclo 3 — Test no-reg, giro breve su e2cc3ca8 (19 indirizzi dei 75 «Sulla mappa», /guida/citta con grafica accesa e spenta; dichiarato solo GET)
- 03:14:02 `foto data foto/L1-ciclo3-noreg-e2cc3ca8` → `FOTO OK` gioco.db 108, 76 tabelle, 19 834 righe; partite.db 21, 34 tabelle, 3 186 righe (rispetto al ciclo 2 cambiano solo le miniature create dalle letture, 72 → 77). BE.log a 80 righe.
- «foto fatta» inviato, con l'avviso di non aprire i quartieri senza pianta (lo scarico automatico è una POST). In attesa della fine della prova.
- Test no-reg ha finito: 19 indirizzi /guida/mappe/… e /guida/citta due volte, solo GET, nessun quartiere aperto; localStorage trovato vuoto, poi grafica spenta e di nuovo vuoto. Esito dichiarato: 75/75 come la base, metro identica.
- 03:19:23 (orologio della macchina) impronta contro la foto del ciclo → `IDENTICHE`, EXIT=0, cioè nemmeno miniature nuove: erano già in cache. Unica scrittura nel BE.log dal riavvio: la POST di scarico di Kichijoji delle 01:13:10 UTC, 400. Era del Collaudo e precede la foto (vedi giro3/LEGGIMI.md). Nessun ripristino necessario: **ciclo 3 chiuso**.
- Nota: il tester indica «03:20–03:25», ma l'orologio della macchina al confronto segnava 03:19:23; probabilmente l'orario è approssimato. Il confronto vale per tutto ciò che è stato scritto fino alle 03:19:23.
- Correzione dell'orario da parte di Test no-reg: il giro è stato tra le 03:15 e le 03:19 ora italiana (01:15–01:19Z), cioè prima del confronto delle 03:19:23. L'incongruenza è risolta e il confronto copre tutto il giro.

## Ciclo 4 — Test no-reg, nota N1 del validatore: rifà i 75 «Sulla mappa» (19 indirizzi /guida/mappe/…, nessun quartiere), tabella riga per riga; dichiarato solo GET
- 03:24:33 checkout su 84165da5. Server avviati alle 03:13 su e2cc3ca8 e non riavviati: 84165da5 cambia solo la ROADMAP e l'impronta del codice è identica. `foto data foto/L1-ciclo4-noreg-84165da5` → `FOTO OK` (gioco 108/76/19 834, partite 21/34/3 186), identica alla foto del ciclo 3.
- «foto fatta» inviato. In attesa della fine del giro.
- Test no-reg ha finito: 19 GET /guida/mappe/… su 5473, preferenze non toccate, `git` in sola lettura sulla cartella alle 03:24:42; ultima azione 03:25:46 (01:25:46Z). Esito dichiarato: 75/75 come la base.
- 03:26:32 impronta contro la foto del ciclo → `IDENTICHE`, EXIT=0. Nessuna scrittura nel BE.log dopo la foto: l'unica è la POST del Collaudo delle 01:13:10Z, precedente. Nessun ripristino necessario: **ciclo 4 chiuso**.
