# L1 · be — Implementazione BE (correzioni del 1° giro + variante miniature)

Cartella di sviluppo: `C:\Repository\project-p5r\.claude\worktrees\pensive-burnell-b50941` (branch `newreview`, niente commit).
Esiti grezzi completi in `lotti/L1/esiti-be/` (file `.txt` dell'output dei comandi, con `EXIT=` in fondo).

## Parte 1 — correzioni F5, F6, F9 e verifica del non committato (2026-10-20) — FATTA

### Verifica del già scritto (illustrazione nei DTO, `AreaDungeonDto.mappa` tolto)
- `IllustrazioneDto`, `illustrazioneDellaMappa`, campi `illustrazione` di `QuartiereRiassuntoDto`, `QuartiereDettaglioDto`,
  `DungeonDettaglioDto`: corretti. Prima dei miei cambi il typecheck era rosso **solo** su due fixture FE
  (`esiti-be/typecheck-0.txt`: `CittaPage.test.tsx:176`, `DungeonDettaglioPage.test.tsx:41`, manca `illustrazione`): segnalati a FE,
  ora verdi (`typecheck-1.txt`, EXIT=0).
- Test esistenti di città/dungeon/piante verdi (`vitest-dto.txt`, 10/10), ma nessuno copriva `illustrazione`: aggiunti due casi in
  `server/routes/immagine-mappa-strade.test.ts` — per **ogni** quartiere `illustrazione` (elenco e scheda) è uguale a
  `{ immagineUrl, asset }` del `MappaDto` della sua mappa (la stessa immagine del visore e dell'indice) e `mappa` = c'è una caricata;
  Memento `{ null, null }`, Kamoshida = caricata della radice con `asset: null` (lo stemma resta il segno).
- openapi: descrizioni di `GET /api/compendio/citta`, `/citta/:chiave`, `/dungeon/:chiave` aggiornate con `illustrazione`.

### F5 — strade di scrittura e rimozione allineate ai pezzi
Regola unica in `server/services/mappe/pezziMappa.ts` → `confermaPezzi(mappe, conferma, cosa, blocco)` (409 `mappa-con-pezzi` con
`{ pezzi, copie }`, in blocco `{ mappe, pezzi, copie }`; con la conferma la funzione restituita toglie pezzi e copie nella transazione).
- `impostaImmagineMappa` la usa (comportamento invariato) e accetta `origineUrl` e `dellUtente` (default vero).
- **da-url** (`POST /api/immagini/mappa/:k/da-url`): per una mappa che esiste passa da `scaricaImmagineMappa` (nuova, mappeService):
  controllo dei pezzi **prima** dello scarico e di nuovo dopo, poi `impostaImmagineMappa` (dimensioni, ruolo, `origineUrl`,
  `origine='utente'`: l'indirizzo l'ha scelto l'utente). `?eliminaPezzi=1` conferma.
- **Scarico della pianta** (`scaricaPiantaQuartiere`, `POST /api/mappe/piante-citta/:q/scarica?eliminaPezzi=1`): stessa strada con
  `dellUtente: false` → **l'origine della mappa non cambia** (decisione motivata: è la pianta pubblicata dai dati di gioco, scaricata da
  sola all'apertura del quartiere; segnarla «utente» impedirebbe al pacchetto di aggiornare una mappa del seed). Se la mappa del
  quartiere non esiste resta il salvataggio semplice di prima.
- **DELETE singola** (`eliminaImmagine(ambito, chiave, { eliminaPezzi })`): 404 prima; se l'immagine è quella **mostrata** da una mappa
  con pezzi (la caricata, o l'asset predefinito di una mappa senza caricata: `mappeCheLaPerdono` in `immagineMappa.ts`) → 409; con la
  conferma i pezzi se ne vanno con lei.
- **DELETE in blocco** (`eliminaImmaginiAmbito(ambito?, { eliminaPezzi })`, `?ambito=…&eliminaPezzi=1`): 409 se una qualsiasi mappa con
  pezzi perde la sua immagine; niente si toglie senza conferma.
- Schemi: `queryConfermaPezzi`, `queryRimozioneImmagini` (server/schemas/immagini.ts); anche la PUT generica ora valida la query.
- openapi: da-url, DELETE singola, DELETE in blocco, scarico della pianta (descrizioni + errore 409).

### F6 — dimensioni all'importazione (dichiarato e provato)
Le dimensioni lette dall'**intestazione dell'immagine vincono** su quelle del pacchetto (i pin e i pezzi si posano sui pixel veri);
se l'intestazione **non si legge** (SVG, formato non riconosciuto) **restano quelle del pacchetto** — prima diventavano null.
Codice: `importaMappe`, ciclo delle immagini (mappeService). openapi `POST /api/mappe/importa` aggiornata.

### F9 — asset per convenzione
- `creaMappa` senza `asset`: `mappe/<chiave>` **solo se esiste** una riga della grafica predefinita (stessa esistenza della regola
  del ruolo, anche senza contenuto); altrimenti `null`. Un asset indicato si conserva.
- `esportaMappe`: `asset` = asset dichiarato se esiste, altrimenti null; `assetOriginale` uguale (l'import lo preferisce; i pacchetti di
  prima restano leggibili). Prima ogni mappa usciva con `mappe/<chiave pubblica>`.
- Helper `assetEsistente` in `immagineMappa.ts`. openapi `POST /api/mappe` e `GET /api/mappe/esporta` aggiornate.
- Test esistenti che fissavano la vecchia convenzione riallineati alla regola nuova (non indeboliti: ora affermano `null`):
  `mappe-editor.test.ts:304-305` e `:487-490`, `percorsi-map.test.ts:14-17`.

### Test visti prima rossi (sorgenti senza le correzioni) — `esiti-be/vitest-strade-rosso.txt`
File nuovo `server/routes/immagine-mappa-strade.test.ts`, 8 casi: sui sorgenti di prima **6 falliti, 2 passati** (i 2 dell'illustrazione,
che provano il codice già scritto):
```
 × F5 — da-url su una mappa con pezzi …                      → expected 201 to be 409
 × F5 — scarico della pianta di un quartiere con pezzi …     → expected 201 to be 409
 ✓ illustrazione: scheda e intestazione di ogni quartiere …
 ✓ illustrazione: l’intestazione di un Palazzo …
 × F6 — import: … SVG restano quelle del pacchetto           → expected { …(6) } to match object { …(3) }
 × F9 — una mappa nuova dichiara l’asset predefinito solo se esiste … → expected 'mappe/senza-asset-f9' to be null
 × F5 — rimozione dell’immagine di una mappa con pezzi …     → expected 204 to be 409
 × F5 — rimozione in blocco …                                → expected 200 to be 409
      Tests  6 failed | 2 passed (8)
EXIT=1
```
Dopo le correzioni: 8/8 (`vitest-strade-verde.txt`, EXIT=0).

### F6 — esecuzione verbosa dei file richiesti + aree toccate — `esiti-be/vitest-verbose-be.txt`
`npx vitest run --reporter=verbose` su 21 file: planimetrie-aree-multiple, sulla-mappa-palazzo, posizioni-spilli, guida-pin,
condizioni-voce, condizioni-pin, `082_nome_rivisto_mappa`, `067_identita_stabile_degli_spilli`, `107_ruolo_dalla_gerarchia`,
immagine-mappa-strade, immagine-mappa-unica, pezzi-mappa, mappe-editor, percorsi-map, piante-citta, citta, dungeon, openapi, api,
collezioniImmagini, shared/miniature → **Test Files 21 passed (21), Tests 175 passed (175), EXIT=0**.

### Typecheck e lint
- `npm run typecheck` → EXIT=0 (`typecheck-1.txt`).
- `npx eslint server shared` → EXIT=0, nessun messaggio (`lint-be-1.txt`).

### File BE toccati in questa parte
server/services/mappe/pezziMappa.ts, server/services/mappe/immagineMappa.ts, server/services/immaginiService.ts,
server/services/mappe/mappeService.ts, server/services/cittaService.ts, server/routes/immagini.ts, server/routes/mappe.ts,
server/schemas/immagini.ts, server/openapi/descrizioni/{immagini,mappe,compendio}.ts, server/routes/immagine-mappa-strade.test.ts (nuovo),
server/routes/mappe-editor.test.ts, server/routes/percorsi-map.test.ts; shared/miniature.ts e shared/miniature.test.ts (variante, punto 1).

### Per FE (inviato)
Nuovi 409 `mappa-con-pezzi` e `?eliminaPezzi=1` su da-url, DELETE singola, DELETE in blocco, scarico della pianta (lo scarico automatico
di QuartierePage su una mappa con pezzi ora riceve 409); `shared/miniature.ts` pronto.

## Parte 2 — variante «miniature» (decisioni del PM: sharp, cache in gioco.db con pulizia delle orfane, anche indice e griglie)

### Fatto
1. **`shared/miniature.ts`** (+ `shared/miniature.test.ts`): `LARGHEZZE_MINIATURA` [160, 320, 640, 1024], `larghezzaMiniaturaAmmessa`,
   `urlMiniatura(url, l)` (solo `…/api/immagini/<ambito>/<chiave>/file`, relativo o con origine; `&l=` dopo `?v=`, `?l=` senza query,
   un `l` presente si sostituisce, frammento in fondo), `srcsetMiniature(url, larghezze?)` (stringa vuota per gli altri URL). Avvisato FE.
2. **sharp 0.35.5** esatta in `dependencies` (ultima stabile, pubblicata il 2026-09-27). Il lock contiene `@img/sharp-linuxmusl-x64`,
   `@img/sharp-libvips-linuxmusl-x64`, `@img/sharp-linux-x64`, `@img/sharp-libvips-linux-x64`, `@img/sharp-win32-x64`.
   `npm audit --omit=dev --audit-level=high`: 0 vulnerabilità (`audit-2.txt`).
   **Dockerfile.backend**, stadio `deps`: codifica WebP vera col binario musl, fallisce la build (vedi «Build Docker» sotto).
   **NOTICE** (sharp Apache-2.0, libvips LGPL-3.0-or-later) e **licenze/**: `sharp-LICENSE.txt` (copia di node_modules/sharp/LICENSE),
   `sharp-libvips-linuxmusl-x64-LICENSING.md` (copia della nota di licenza del pacchetto `@img/sharp-libvips-linuxmusl-x64@1.3.4`,
   ottenuto con `npm pack` nello scratchpad). **Manca il testo integrale della LGPL-3.0**: nessun pacchetto installato lo contiene; NOTICE
   rimanda a https://www.gnu.org/licenses/lgpl-3.0.html. Per metterne la copia in `licenze/` va scaricato da gnu.org: decisione del PM.
3. **Migrazione 108** `108_miniature_delle_immagini.ts` (+ test, registrata in `index.ts`): tabella `immagine_miniatura` come da progetto,
   più CHECK su `byte`, `larghezza_reale`, `altezza_reale` > 0. Solo creazione. Applicata dal BE condiviso a `data/` (BE.log riga 4412,
   «migrazione applicata», id 108, con la copia di avvio in data/backups).
4. **`server/services/miniatureService.ts`**: `miniaturaDi(sorgente, l)` → `{ contenuto, mime, etag, esito }`; sharp caricato una volta con
   `import()` difensivo (`concurrency(1)`, `cache(false)`; se manca: `error` nel log e originale); WebP q80 effort 4, `fit: inside`,
   `withoutEnlargement`; originale per SVG/GIF, per `l` ≥ larghezza reale (dall'intestazione, o da sharp se il formato non è riconosciuto),
   e su errore (un `warn` per immagine e versione); cache per (immagine, larghezza, versione); coalescenza con una mappa delle generazioni
   in corso; scrittura solo se la sorgente ha ancora la stessa `created_at`. `eliminaMiniatureDi`, `pulisciMiniatureOrfane`,
   `immaginiDelleSchede` (Tokyo, quartieri, radici di Palazzi e Memento: la caricata, o l'asset per città e quartieri), `riscaldaMiniature`
   (160 e 320, mai solleva, log del totale e dei ms).
5. **`immaginiService.salvaImmagine`**: cancella le miniature della `(ambito, chiave)` nella transazione; dopo, per l'immagine di una
   mappa che è delle schede, riscaldamento con `setImmediate`. Le eliminazioni passano dalla cascata (provato).
6. **Rotta** `GET /api/immagini/:ambito/:chiave/file` con `queryFileImmagine` (`v`, `l`): `l` fuori dalle misure → 400
   `larghezza-non-ammessa`; con `l` ETag `"<id>-<byte>-<createdAt>-l<l>"`, 304 confrontato **prima** di generare, `X-Miniatura`; senza `l`
   identica a prima.
7. **Avvio** (`server/index.ts`): riscaldamento in background dopo il `listen`. **Pulizia delle orfane** in `regoleAllAvvio` (nuovo campo
   `miniatureOrfane`) e alla fine di `ricaricaPacchetto`.
8. **Pacchetto** — **scostamento motivato dal progetto**: `immagine_miniatura` NON va in `NON_DAL_PACCHETTO`, perché quell'insieme salta
   anche la DDL: un'istanza nuova da un pacchetto alla 108 resterebbe senza tabella (la 108 non riparte, `user_version` è già 108). Nuovo
   insieme `SOLO_SCHEMA` in `pacchettoGioco.ts`: in `caricaPacchetto` la tabella si crea ma le righe non si copiano; `ricaricaPacchetto` la
   salta. `scripts/genera-pacchetto.ts`: `DELETE FROM main.immagine_miniatura` prima dei due `VACUUM INTO` (completo e iniziale). Lo script
   non l'ho eseguito (riscrive `pacchetto/`): il punto è provato dal test 10 sul caricamento e dalla lettura del codice.
9. **openapi** della rotta del file: parametro `l`, misure, originale, `ETag`, `X-Miniatura`, 400.

### Prova dal vivo sul BE condiviso (3201, dati di `data/`)
Riscaldamento all'avvio: `{"immagini":34,"generate":0,"ms":70,"msg":"miniature delle schede pronte"}` (le 68 righe — 34 × 2 misure, 774 KB
in tutto — erano già state generate da un avvio precedente durante il lavoro). Shibuya (`citta-shibuya`):
```
senza l   200 image/png  Content-Length: 2407015  ETag "3-2407015-2026-09-09T20:09:28.331Z"
l=160     200 image/webp Content-Length: 3980     X-Miniatura: cache
l=320     200 image/webp Content-Length: 14074    X-Miniatura: cache
l=640     200 image/webp Content-Length: 48706    X-Miniatura: generata
l=1024    200 image/webp Content-Length: 112606   X-Miniatura: generata
l=300     400 (larghezza-non-ammessa)
```

### Test della variante — `esiti-be/vitest-miniature-1.txt` (12/12, EXIT=0)
`server/routes/immagini-miniature.test.ts` (casi 1, 2, 3, 4, 5, 6, 8, 9, 10 e riscaldamento/pulizia),
`server/routes/immagini-miniature-senza-generatore.test.ts` (caso 7, sharp simulato in errore con `vi.mock`),
`server/db/migrations/108_miniature_delle_immagini.test.ts` (caso 11), `shared/miniature.test.ts` (caso 12, 4 test).
Il caso 10 usa una miniatura «valida» nel pacchetto (sorgente con contenuto, stessa versione), così la pulizia delle orfane non la
toglierebbe: se manca è perché le righe non entrano.

### Giro finale verboso — `esiti-be/vitest-verbose-be-2.txt`
30 file (i 21 della parte 1 + 108, immagini-miniature, immagini-miniature-senza-generatore, ricaricaPezzi, pacchettoGiocoService,
impostazioniService, deposito-flussi, conservazione, bootstrap): **Test Files 30 passed (30), Tests 220 passed (220), EXIT=0**.
`npm run typecheck` EXIT=0 (`typecheck-2.txt`), `npm run lint` (tutto il repository) EXIT=0 (`lint-2.txt`), audit EXIT=0 (`audit-2.txt`).

### Build Docker (stadio `deps`, linux/alpine) — `esiti-be/docker-deps.txt`
`docker build --progress=plain --target deps -f Dockerfile.backend .` (Docker 29.7.2, linux) → **EXIT=0**:
```
#10 [deps 6/7] RUN node -e "new (require('better-sqlite3'))(':memory:').close()"
#11 [deps 7/7] RUN node -e "require('sharp')({create:{width:2,height:2,channels:4,background:'#000'}}).webp().toBuffer()…"
#11 0.400 sharp 0.35.5 vips 8.18.7
```
L'immagine di prova è stata rimossa. Resta da fare la verifica su p5s dopo la pipeline (`l=320` → `image/webp` dal server): è della consegna.

## Parte 3 — FUN-1 / osservazione O2 (2026-10-20): un SVG non azzera più le dimensioni dichiarate
- Regola **unica** in `dopoImmagineMappa` (`server/services/mappe/immagineMappa.ts`), la funzione per cui passa ogni strada che scrive
  l'immagine di una mappa (editor, rotta generica, da URL, scarico della pianta, importazione): le dimensioni dell'intestazione vincono;
  se l'intestazione non si legge (SVG, formato non riconosciuto) **restano quelle dichiarate dalla mappa** (prima diventavano null).
- Tolto il caso speciale dell'importazione aggiunto per F6 (`importaMappe`): ora è la stessa regola (le dimensioni del pacchetto sono
  già sulla riga quando l'immagine si salva). Il test F6 resta verde.
- Test nuovo «O2» in `server/routes/immagine-mappa-strade.test.ts`: mappa creata con 777×555, SVG dall'editor e dalla PUT generica →
  777×555 restano; poi un PNG 64×48 → 64×48. Sui sorgenti di prima **rosso** (`esiti-be/vitest-o2-rosso.txt`):
  `- "altezza": 555, + "altezza": null, - "larghezza": 777, + "larghezza": null`, EXIT=1. Dopo: verde.
- Giro mirato (immagine-mappa-strade, immagine-mappa-unica, pezzi-mappa, mappe-editor, piante-citta, immagini-miniature,
  collezioniImmagini, planimetrie-aree-multiple, sulla-mappa-palazzo): **9 file, 75 test verdi** (`vitest-o2-verde.txt`).
  `npm run typecheck` EXIT=0 (`typecheck-3.txt`), `npx eslint server shared` EXIT=0 (`lint-3.txt`).

## Riepilogo per il PM
- Fase `be` di L1 **fatta**: F5, F6, F9, verifica e test dell'illustrazione, variante miniature.
- Da decidere: copia integrale della LGPL-3.0 in `licenze/` (va scaricata da gnu.org).
- Scostamento dal progetto, motivato: `SOLO_SCHEMA` invece di `NON_DAL_PACCHETTO` (punto 8).
- F8 e F11 (dati) e F10 (DOM) non sono BE. I documenti (DECISIONI, ROADMAP, ARCHITETTURA §L1) li aggiorna il PM con questi testi;
  in ARCHITETTURA vanno: `confermaPezzi`/`mappeCheLaPerdono`/`assetEsistente`, `scaricaImmagineMappa`, la regola delle dimensioni
  all'import, `miniatureService` + 108 + `SOLO_SCHEMA` + `shared/miniature.ts`, la dipendenza sharp.
