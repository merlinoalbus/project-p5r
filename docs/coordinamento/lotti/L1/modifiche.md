# L1 «Immagini» — stato e correzioni da fare (fase: correzioni dopo il 1° giro del validatore)

Il lotto è nel commit `bd20ed72` su `newreview` (cartella di sviluppo). Il validatore lo ha RIGETTATO: verdetto integrale in
`C:\Users\rober\.claude\p5s-coordinamento\verdetto-L1-giro1.txt` (F1–F11). Requisiti: piano righe 89, 214, 414 (Lotto L1: «Un risolutore
d'immagine per tutte le viste; il ruolo dell'immagine si deduce dal posto nella gerarchia». Fatto quando: «Tokyo, i quartieri e ogni
planimetria mostrano la stessa immagine in visore, indice, schede e miniature»).

## Decisione dell'utente su F1/F2/F7 (2026-10-20): «Illustrazione anche nelle schede»
- Le **schede dei quartieri** (La città, `CittaPage`) e le **intestazioni** del quartiere (`QuartierePage`) e del Palazzo
  (`DungeonDettaglioPage`, solo Palazzi) mostrano l'illustrazione della mappa del posto (regola unica: caricata, poi asset dichiarato),
  **con la sagoma / lo stemma sopra come segno**.
- La **metro** (`MappaTokyo`) resta con sagome e stemmi.
- Vincolo di grafica dell'utente: le figure stanno nel loro spazio **al 100% di opacità**, non come sfondi velati dietro al testo
  (src/tailwind.css, commento «Fregio»). Le intestazioni da 1024 px restano compatte (una schermata: memoria «Altezze realistiche»).

## Già fatto (non committato, nella cartella di sviluppo)
- BE: rimosso il campo morto `AreaDungeonDto.mappa` e `mappePresenti` (dungeonService) — chiude F4 punto 3; test allineati
  (server/routes/dungeon.test.ts:34, fixture in AreeDelDedalo/GuidaDellArea/TramaDellArea/DungeonDettaglioPage/dedali test).
- BE: `IllustrazioneDto { immagineUrl, asset }` in shared/types.ts; `illustrazioneDellaMappa(chiave, db?, caricate?)` in
  server/services/mappe/immagineMappa.ts (asset null se il ruolo è `emblema`); campo `illustrazione` su `QuartiereRiassuntoDto`,
  `QuartiereDettaglioDto` (cittaService) e `DungeonDettaglioDto` (dungeonService, radice `dungeon-<k>`); `QuartiereDettaglioDto.mappa`
  ora = c'è una caricata (registrata o con la chiave) — chiude F4 punto 2. **Da verificare**: typecheck, test BE di citta/dungeon, openapi
  (descrizioni/schemi delle risposte se elencano i campi).
- FE: componente nuovo `src/components/mappe/IllustrazioneConSegno.tsx` (illustrazione piena + segno nell'angolo, `senza` se manca).
  **Mancano**: gli stili `.illustrazione-segno`, `__immagine`, `__segno`, `--spenta` in src/tailwind.css; l'uso in CittaPage (scheda: riquadro
  ~128×84 con la sagoma piccola sopra; senza illustrazione la sagoma 112×84 come oggi; quartiere chiuso attenuato), QuartierePage
  (intestazione: illustrazione con la sagoma sopra; telefono in cima, da 640 px a fianco), DungeonDettaglioPage (intestazione dei Palazzi:
  illustrazione con lo stemma sopra, compatta da 1024 px; i Memento invariati); i test.

## Correzioni ancora da fare
- **F2 (FE)** AnteprimaMappa: ordine caricata → asset → stemma solo se la mappa non ha né caricata né asset; riscrivere
  `ImmagineMappaUnica.test.tsx:38-41`.
- **F3 (FE)** EditorMappaPage (righe ~358, 372-373, 449) passa da `useImmagineMappa`; `EmblemaDungeon` usa `segnoPalazzo`; correggere il
  commento falso in `segniMappa.ts:9-10` («le schede no»: anche le schede usavano l'URL fisso) e riscriverlo con la decisione dell'utente.
- **F4 (FE)** `MappaPage.tsx:393`: il filtro delle mappe sorelle con `!!(m.immagineUrl || m.asset)` → regola unica (`ruoloConVisore` o
  presenza reale dell'asset nel manifesto).
- **F5 (BE)** `POST /api/immagini/mappa/:chiave/da-url` (routes/immagini.ts:77-78) e `scaricaPiantaQuartiere` (cittaService ~156) passano da
  `impostaImmagineMappa` (409 `mappa-con-pezzi` senza conferma, `origine='utente'` solo per il caricamento dell'utente — lo scarico automatico
  della pianta pubblicata va valutato: non è una scelta dell'utente); `DELETE /api/immagini/mappa/:chiave` e `DELETE /api/immagini?ambito=mappa`
  su mappe con pezzi: 409 senza conferma (o rimozione dei pezzi con conferma esplicita). Test visti prima rossi (output del fallimento sui
  sorgenti di prima).
- **F6 (BE/test)** eseguire con `--reporter=verbose` e consegnare l'output grezzo: planimetrie-aree-multiple, sulla-mappa-palazzo,
  posizioni-spilli, guida-pin, condizioni-voce, condizioni-pin, `082_*`, `067_*`; più un test sull'import: dimensioni del pacchetto diverse
  da quelle dell'intestazione dell'immagine → quali vincono (dichiararlo).
- **F8 (dati)** etichette delle mappe sorelle di Yongen-Jaya prima e dopo la 107 (copia di produzione vs data/).
- **F9 (BE)** `creaMappa` (mappeService ~830) e l'esportazione (~1519) scrivono `mappe/<chiave>` per convenzione: dichiararne l'asset solo se
  esiste, oppure null; e documentarlo.
- **F10 (test)** estratti grezzi del DOM di indice, visore e schede per Tokyo con caricata, Tokyo senza caricata (prova su una copia: mai
  togliere l'immagine dai dati senza ripristino), e un quartiere con caricata.
- **F11 (dati)** output di `SELECT chiave FROM mappa WHERE chiave LIKE '%archivio-022%'` (e le chiavi pubbliche) per provare che il caso
  rimosso in AlberoLuoghi non esiste.
- **Documenti** DECISIONI «L1» (sostituire la scelta dell'IA sui segni con la decisione dell'utente), ROADMAP riga L1, ARCHITETTURA §L1
  (EmblemaDungeon, segniMappa, IllustrazioneConSegno, illustrazione nei DTO). Li aggiorna il Project manager con i testi di BE/FE.

## Piano dei test di L1 (per le quattro fasi di test)
- Funzionali: le quattro viste (visore, indice/miniature, schede, intestazioni) di Tokyo, di un quartiere con caricata (Shibuya), di uno senza
  caricata (Kichijoji, Nakano, Ikebukuro, Meiji Shrine: solo asset), di un Palazzo con caricata (Kamoshida) e dei Memento (nessuna);
  caricamento/sostituzione/rimozione di un'immagine su una mappa con pezzi (409 senza conferma); grafica predefinita spenta.
- UX: le schede de La città restano leggibili e riconoscibili dalla sagoma; nessuna figura velata; tempi di caricamento della pagina La città
  (19 illustrazioni da ~2,4 MB, `loading=lazy`): misurarli e segnalare se pesano.
- No-reg: impronta della copia di produzione prima/dopo (nessun dato di partita toccato dalla 107 tranne il ruolo della Banchina);
  pacchetto mappe export/import; pezzi; collezioni di Yongen-Jaya.
- Layout: La città, un quartiere, Kamoshida, Memento a 1280, 768, 375, 1366×657, 1280×689.

### Casi aggiunti su proposta della Stesura modifiche (2026-10-20)
- Funzionali, una correzione per caso: F2 (AnteprimaMappa: una mappa con caricata, una con solo asset, una con nessuno dei due → stemma/riquadro);
  F3 (EditorMappaPage mostra la stessa immagine del visore; EmblemaDungeon passa da `segnoPalazzo`); F4 (mappe sorelle di MappaPage: una
  sorella con asset dichiarato ma assente nel manifesto non compare come planimetria); F9 (creaMappa: asset null se il file non esiste;
  export/import di una mappa nuova).
- Funzionali F5: POST da-url e `scaricaPiantaQuartiere` su mappa con pezzi → 409 senza conferma, 200 con conferma; DELETE della singola e
  `DELETE ?ambito=mappa` → 409; `origine` dopo lo scarico automatico.
- Funzionali F6: import del pacchetto mappe con dimensioni diverse da quelle dell'intestazione dell'immagine: quale vince, come dichiarato.
- Funzionali e UX: preferenza «grafica predefinita» accesa **e** spenta: sagome e stemmi nelle schede (CittaPage, QuartierePage,
  DungeonDettaglioPage) e sulla metro seguono il manifesto.
- No-reg: la metro (MappaTokyo) resta identica (sagome e stemmi, non illustrazioni), confronto con lo schermo «prima»; i Memento in
  DungeonDettaglioPage invariati.
- Layout: anche 1024×690 (intestazioni compatte da 1024 px); la scheda chiusa/attenuata de La città; a 375 l'illustrazione in cima al
  quartiere senza scorrimento orizzontale.
- Accessibilità: `alt` dell'illustrazione; il segno `aria-hidden` quando il nome è già nel testo vicino.

## Variante: miniature (Stesura modifiche, 2026-10-20, su richiesta del Project manager)

**Problema** (rilievo di Test UX). Con «Illustrazione anche nelle schede», La città caricherebbe 19 illustrazioni PNG piene
(1672×941, 1,95–2,58 MB l'una, 39,8 MB in tutto) per riquadri da ~128×84. Le intestazioni del quartiere e del Palazzo fanno lo stesso
(2–3 MB per un riquadro di ~240 px). Lo stesso difetto c'è già oggi, prima di L1, nelle miniature dell'indice delle Mappe e delle griglie
(`AnteprimaMappa`, 72×52 e ~200 px), che caricano le planimetrie native da 1024×1024 (ambito `mappe`: 503 file, 176,7 MB, fino a 6,9 MB).
Su telefono, durante la partita, non va bene, e per le schede de La città sarebbe una regressione portata da L1.

**Misure di partenza** (data/gioco.db, sola lettura): ambito `mappa` (caricate) 50 PNG, 72,6 MB; ambito `mappe` (asset) 503 PNG,
176,7 MB; le 19 illustrazioni caricate dei quartieri 1672×941; le 9 dei Palazzi 2,4–3,1 MB.

### Soluzione proposta
Una sola strada per tutte le immagini servite dal database: la rotta che già le serve, `GET /api/immagini/:ambito/:chiave/file`
(server/routes/immagini.ts:44-55), accetta un parametro **`l` (larghezza in pixel)** e risponde con una **miniatura WebP** generata la
prima volta che serve e poi tenuta in cache **nel database**. Le viste che mostrano un'immagine in piccolo la chiedono con `srcset` e
`sizes`, così il browser sceglie la misura giusta per la larghezza e la densità dello schermo. Il visore, l'editor e la scelta del punto
d'ingresso restano a piena risoluzione (lì servono i pixel).

1. **Dove si genera.** Al primo uso, sul server, e poi in cache. Non al caricamento: la maggior parte delle immagini arriva col pacchetto
   (asset predefiniti), non da un caricamento; e generare tutte le misure di 700 immagini all'avvio costerebbe minuti di CPU a ogni
   pacchetto nuovo. Due rinforzi:
   - **coalescenza**: richieste contemporanee della stessa miniatura aspettano la stessa generazione (mappa in memoria
     `chiave → Promise`), una sola scrittura;
   - **riscaldamento** in background dopo il `listen` (mai bloccante, con log del totale e dei millisecondi): le illustrazioni delle
     radici e dei quartieri (`mappa.tipo IN ('citta','quartiere')` e radici dei Palazzi, circa 45 immagini) alle due misure delle schede
     (160 e 320); e, dopo ogni `salvaImmagine` dell'ambito `mappa`, la stessa cosa per quella sola immagine (`setImmediate`, fuori dalla
     transazione). Così la prima apertura de La città dal telefono non aspetta la generazione.
2. **Formato.** WebP, qualità 80, `effort` 4, canale alfa conservato (le planimetrie native sono trasparenti), metadati tolti, proporzioni
   mantenute (`fit: 'inside'`, mai ingrandire). Stima: una 320×180 pesa 15–30 KB; le 19 schede a densità 2 (640 px) ~1–1,5 MB invece di
   39,8 MB. **Misure ammesse: 160, 320, 640, 1024** (un insieme chiuso: la cache non può crescere senza limiti e un URL inventato non genera
   niente). Valore diverso → 400 `larghezza-non-ammessa`. Casi in cui si risponde con l'**originale** (stessa risposta di oggi): SVG e GIF;
   `l` maggiore o uguale alla larghezza reale; generatore non disponibile o errore di decodifica (log `warn` una volta per immagine, mai
   un 500 per una miniatura).
3. **Versione.** La miniatura è legata alla versione della sorgente: la colonna `versione` = `immagine.created_at` della sorgente al
   momento della generazione. L'URL resta quello di oggi più `&l=` (`…/file?v=<created_at>&l=320`): una sostituzione cambia `v`, quindi
   l'URL, e la cache del browser non serve mai la vecchia. Sul server: `salvaImmagine` cancella le miniature di quella `(ambito, chiave)`
   nella stessa transazione (l'`ON CONFLICT DO UPDATE` conserva l'`id`, quindi la cascata non basta); la lettura accetta solo righe con
   `versione = immagine.created_at` e rigenera le altre (difesa in più, per i file di gioco sostituiti in blocco).
   Intestazioni HTTP: le stesse regole di oggi (con `v` → `private, max-age=31536000, immutable`; senza → `private, no-cache`), ETag
   `"<id>-<byte>-<createdAt>-l<l>"`, 304 su `If-None-Match`; più l'intestazione diagnostica `X-Miniatura: generata | cache | originale`
   (serve ai test e al Test UX per misurare).
4. **Come le chiedono le viste.** Un modulo condiviso `shared/miniature.ts`:
   `LARGHEZZE_MINIATURA = [160, 320, 640, 1024] as const`; `urlMiniatura(url, l)` aggiunge `l` **solo** agli URL che cominciano con
   `/api/immagini/` (con `&` se c'è già `?v=`, altrimenti `?`), e lascia invariati gli asset statici `/asset/…` del manifesto pubblico,
   gli URL `blob:`/`data:` e gli esterni; `srcsetMiniature(url, larghezze?)` restituisce `"<u&l=160> 160w, <u&l=320> 320w, …"` (stringa
   vuota per un URL non del database). Le viste:
   - `IllustrazioneConSegno` (src/components/mappe/IllustrazioneConSegno.tsx:39): prop nuova obbligatoria `sizes` (stringa), `src` =
     `urlMiniatura(src, 320)` (il ripiego per i browser senza `srcset`), `srcSet` = `srcsetMiniature(src)`, `sizes` dalla prop. I valori
     li fissa FE sulle misure CSS reali: scheda de La città ≈ `"128px"`; intestazione del quartiere e del Palazzo ≈
     `"(min-width: 640px) 240px, 100vw"` (telefono in cima a tutta larghezza, da 640 px a fianco). Aggiungere `width`/`height`
     intrinseci o tenere il riquadro a misura fissa (lo è già): nessuno spostamento del layout al caricamento.
   - `AnteprimaMappa` (src/components/mappe/AnteprimaMappa.tsx:56): prop `sizes`, default `"72px"` (indice delle Mappe); nelle griglie
     di `MappaPage` (`Griglia`, aspect 4/3, 2/3/4 colonne) `"(min-width: 1536px) 25vw, (min-width: 768px) 33vw, 50vw"`.
   - `ImmaginiLuogo` (src/components/mappe/ImmaginiLuogo.tsx:30, riquadro `w-28 h-24`): `sizes="112px"`.
   - **Invariati** (piena risoluzione): `VisoreMappa`, `EditorMappaPage`, `IngressoQuartiere` (si sceglie un punto: servono i pixel),
     `MappaIncorporata`. Sagome e stemmi (`SagomaQuartiere`, `MappaTokyo`, `EmblemaDungeon`) sono asset piccoli e restano come sono.
5. **Pacchetto.** Le miniature sono **dati derivati**, non dati di gioco:
   - `caricaPacchetto` non le porta (aggiungere `immagine_miniatura` a `NON_DAL_PACCHETTO`, server/services/pacchetto/pacchettoGioco.ts:100);
   - `scripts/genera-pacchetto.ts`: `DELETE FROM immagine_miniatura` prima del `VACUUM INTO` del completo (riga ~73) e dell'iniziale
     (riga 82): né il pacchetto in git né il completo le contengono;
   - l'importazione che sostituisce il file dell'istanza e il backup/ripristino possono portarsele dietro: restano valide perché legate
     alla `versione`, e le stantie si rigenerano;
   - l'esportazione del pacchetto mappe (JSON) non le tocca (esporta le immagini sorgente).

### Dipendenza: `sharp`, valutata contro le alternative
| Opzione | Pro | Contro | Esito |
|---|---|---|---|
| **sharp** (libvips) | Binari precompilati per `linuxmusl-x64` (l'immagine è `node:24-alpine`), `linux-x64` (CI ubuntu) e `win32-x64` (sviluppo): nessuna toolchain nel runtime; decodifica+riduzione+WebP di un PNG 1672×941 in ~50–150 ms; alfa, WebP, `fit: inside`; libreria di riferimento, licenza Apache-2.0 | +~8–10 MB nell'immagine del backend; libvips è LGPL-3.0 (collegata dinamicamente, va citata in NOTICE e in `licenze/`) | **Consigliata** |
| jimp (JS puro) | Nessun nativo | Lento (centinaia di ms e molta memoria per immagine), niente WebP nativo (JPEG perde l'alfa, PNG resta pesante) | Scartata |
| @napi-rs/image | Precompilata, leggera | Meno diffusa e meno provata su musl | Riserva |
| WASM (@jsquash) | Nessun nativo | Integrazione complessa in Node, più lenta | Scartata |
| Riduzione nel browser (canvas) | Nessuna dipendenza | Scarica comunque i 40 MB: non risolve | Scartata |
| Miniature precalcolate nel pacchetto | Nessun lavoro a runtime | Non copre le immagini caricate dall'utente; due insiemi da mantenere | Scartata |

Condizioni per `sharp` (BE):
- `dependencies` con **versione esatta** (niente `^`), l'ultima stabile pubblicata da almeno due settimane; dopo `npm install` controllare
  che `package-lock.json` contenga le voci `node_modules/@img/sharp-linuxmusl-x64` e `@img/sharp-libvips-linuxmusl-x64` (un lock
  generato su Windows a volte le perde: senza, `npm ci` nell'immagine alpine non installa il binario).
- `Dockerfile.backend`, stadio `deps`, accanto al controllo di better-sqlite3 (riga 42): `RUN node -e "require('sharp')({create:{width:2,height:2,channels:4,background:'#000'}}).webp().toBuffer()
  .then(()=>console.log('sharp', require('sharp').versions))"` — una vera codifica WebP con il binario musl: fallisce **la build**, non il
  primo avvio.
- Caricamento difensivo nel servizio: `import('sharp')` una volta, in try/catch; se fallisce, log `error` all'avvio e le miniature
  rispondono con l'originale (l'app resta utilizzabile).
- `sharp.concurrency(1)` e `sharp.cache(false)` (VPS piccolo: la cache è il database, non la memoria); `limitInputPixels` predefinito.
- Gate della pipeline: `npm audit --omit=dev --audit-level=high` in locale prima del commit (è nel gate di `ci.yml`).
- `NOTICE` e `licenze/`: sharp (Apache-2.0) e libvips (LGPL-3.0-or-later), come per Swagger UI.

### Schema e migrazione (BE) — 108
```sql
CREATE TABLE immagine_miniatura (
  immagine_id INTEGER NOT NULL REFERENCES immagine(id) ON DELETE CASCADE,
  larghezza   INTEGER NOT NULL CHECK (larghezza IN (160, 320, 640, 1024)),
  versione    TEXT NOT NULL,            -- immagine.created_at della sorgente quando è stata generata
  mime        TEXT NOT NULL,            -- 'image/webp'
  byte        INTEGER NOT NULL,
  larghezza_reale INTEGER NOT NULL, altezza_reale INTEGER NOT NULL,
  contenuto   BLOB NOT NULL,
  created_at  TEXT NOT NULL,
  PRIMARY KEY (immagine_id, larghezza)
);
```
Solo creazione (nessun dato da convertire): `108_miniature_delle_immagini.ts` + registrazione in `server/db/migrations/index.ts:118-121`.
Verifiche prima/dopo: conteggi di `immagine` e somma di `byte` invariati; tabella vuota dopo la migrazione; impronta della copia di
produzione invariata (nessuna tabella di gioco o di partita toccata). **Nota per L2**: la 108 la prende questa variante; le migrazioni di
L2 partono dalla 109.

### File e ordine (senza sovrapposizioni)
**BE** (prima; FE parte appena c'è il punto 1):
1. `shared/miniature.ts` (nuovo): costanti e `urlMiniatura`/`srcsetMiniature` + `shared/miniature.test.ts`.
2. `package.json`/`package-lock.json` (sharp esatta), `Dockerfile.backend` (controllo nello stadio `deps`), `NOTICE`, `licenze/`.
3. `server/db/migrations/108_miniature_delle_immagini.ts` (+ test) e `index.ts`.
4. `server/services/miniatureService.ts` (nuovo): `miniatura(ambito, chiave, l)` → `{ contenuto, mime, etag, esito: 'generata'|'cache'|'originale' }`,
   coalescenza, caricamento difensivo di sharp, `riscaldaMiniature(chiavi?)`; `server/services/immaginiService.ts` (`salvaImmagine`
   ~89-109: cancellazione delle miniature nella transazione e riscaldamento dopo, per l'ambito `mappa`).
5. `server/schemas/immagini.ts` (query `{ v?: string, l?: '160'|'320'|'640'|'1024' }` per la rotta del file) e
   `server/routes/immagini.ts:44-55` (con `l` passa dal servizio; senza, identica a oggi).
6. `server/index.ts`: riscaldamento in background dopo il `listen`.
7. `server/services/pacchetto/pacchettoGioco.ts:100` e `scripts/genera-pacchetto.ts:73/82`.
8. `server/openapi/descrizioni/immagini.ts`: il parametro `l`, le misure ammesse, `X-Miniatura`, il 400.
9. Test BE mirati (`server/services/miniatureService.test.ts`, `server/routes/immagini-miniature.test.ts`), typecheck, lint, audit.

**FE** (dopo il punto 1 di BE; non tocca `shared/` né `server/`):
1. `src/components/mappe/IllustrazioneConSegno.tsx` (prop `sizes`, `srcSet`) e i suoi usi in `CittaPage`, `QuartierePage`,
   `DungeonDettaglioPage` (i valori di `sizes` misurati sul CSS reale).
2. `src/components/mappe/AnteprimaMappa.tsx` (prop `sizes`, default `"72px"`) e `src/pages/MappaPage.tsx` (`Griglia`, ~riga 345).
3. `src/components/mappe/ImmaginiLuogo.tsx:30`.
4. Test FE mirati: `IllustrazioneConSegno.test.tsx` (nuovo o esteso), `ImmagineMappaUnica.test.tsx` (le asserzioni su `src` diventano
   `src` con `l=320` + `srcset`), `CittaPage.test.tsx`.

### Casi di test della variante
- **BE (vitest mirati)**:
  1. PNG 1672×941 con `l=320` → `image/webp` 320×180, `X-Miniatura: generata`, byte molto minori dell'originale; seconda richiesta
     `cache`, nessuna riga nuova.
  2. Sostituzione dell'immagine → miniature cancellate; il nuovo `?v=` dà la miniatura nuova; una riga con `versione` vecchia viene
     rigenerata.
  3. `l=300`, `l=abc`, `l=0` → 400 `larghezza-non-ammessa`.
  4. `l` ≥ larghezza reale → originale (stesso mime e byte), `X-Miniatura: originale`; SVG e GIF → originale.
  5. `eliminaImmagine` e `eliminaImmaginiAmbito` → righe di `immagine_miniatura` sparite (cascata).
  6. Intestazioni: con `v` immutabile, senza `v` `no-cache`; ETag con `-l<l>`; 304 con `If-None-Match`.
  7. Generatore che lancia (sharp simulato in errore) → 200 con l'originale, `warn` nel log.
  8. Cinque richieste contemporanee della stessa miniatura → una generazione, una riga.
  9. PNG con trasparenza → WebP con alfa (`metadata().hasAlpha`).
  10. `caricaPacchetto` non importa `immagine_miniatura`; il pacchetto iniziale generato ha 0 righe.
  11. Migrazione 108: tabella creata, CHECK sulle misure, cascata attiva.
  12. `shared/miniature.test.ts`: URL con `?v=` → `&l=`; senza query → `?l=`; `/asset/…`, `blob:`, `data:`, esterni invariati;
      `srcsetMiniature` con le quattro misure.
- **Funzionali**: La città a cache fredda (DevTools/`read_network_requests`): somma dei byte delle immagini delle 19 schede **≤ 1,5 MB**
  (obiettivo; ogni miniatura ≤ 80 KB a 640), ogni richiesta con `l=`; ricaricando, nessun trasferimento (cache). Intestazione di Shibuya
  e di Kamoshida con `l=`. Il visore di Shibuya e l'editor chiedono il file **senza** `l`. Caricare una nuova immagine su un quartiere →
  la scheda mostra subito la nuova (URL con `v` nuovo). Indice delle Mappe e griglia di un Palazzo: miniature con `l=`.
- **UX**: nitidezza a 375 con densità 3 e a 1280 densità 1 (nessuna miniatura sgranata: il browser sceglie 640 dove serve); prima apertura
  de La città dal telefono dopo un riavvio del BE (riscaldamento fatto): tempo di comparsa delle schede; nessun riquadro che salta.
- **No-reg**: «Immagini caricate» (elenco e rimozione) invariate, le miniature non compaiono negli elenchi; manifesto invariato;
  backup/ripristino e importazione del pacchetto; esportazione/importazione del pacchetto mappe; visore ed editor a piena risoluzione;
  impronta della copia di produzione invariata dopo la 108.
- **Layout**: a 1280, 768, 375, 1366×657, 1280×689 e 1024×690 nessuno spostamento al caricamento delle immagini (riquadri a misura
  fissa), `sizes` coerente con la larghezza resa (misurare `currentSrc` e la larghezza del riquadro).
- **Immagine Docker**: build del backend con il controllo di sharp verde nella pipeline `newreview`; su p5s, una richiesta con `l=320`
  risponde `image/webp` (verifica dal server, come da memoria «Recupero dalla produzione» ma sullo stack p5s).

### Decisione del Project manager (2026-10-20): i tre punti approvati
Scelte tecniche del PM, registrate in DECISIONI (l'utente può ribaltarle): (1) sharp sì, a condizione che la build Docker del workflow
`:newreview` lo provi su linux con un controllo che genera davvero una miniatura (il `RUN node -e …webp()…` dello stadio `deps`), con NOTICE
e `licenze/` aggiornati; (2) cache in `gioco.db`, esclusa dal pacchetto, con pulizia delle miniature quando l'immagine cambia (cancellazione
in `salvaImmagine`, controllo della `versione`) o viene rimossa (cascata); (3) indice e griglie delle Mappe dentro L1. Migrazione 108 a
questa variante; L2 dalla 109.

### Da approvare (scelta prudente proposta) — chiusi dalla decisione qui sopra
1. **Nuova dipendenza nativa `sharp`** nel backend: consigliata (vedi tabella); alternativa di riserva `@napi-rs/image`. Registrare in
   DECISIONI «scelta consigliata applicata, da confermare».
2. **Cache delle miniature dentro `gioco.db`** (tabella derivata, esclusa dal pacchetto) invece che su disco in `DATA_DIR`: coerente con la
   regola dell'utente «le immagini vivono nel database»; nessun file sparso da ripulire.
3. **Anche l'indice delle Mappe e le griglie** passano alle miniature (il difetto c'era già prima di L1): stesso meccanismo, nessun
   cambiamento visivo; se il PM preferisce limitare L1 alle viste nuove, `AnteprimaMappa` e `ImmaginiLuogo` si spostano a L11.
