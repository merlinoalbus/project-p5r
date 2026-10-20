# L1 «Immagini» — test funzionali

**Esito: 29 casi su 29 superati. FUN-1 (bassa, BE, dall'osservazione O2) corretto da BE e verificato dal vivo il 2026-10-20: nessun difetto funzionale aperto.** Ci sono 5 osservazioni (O1–O5), nessuna bloccante: sono tutte comportamenti
di prima di L1 o casi non provati dal vivo per non toccare i dati reali, e in quel caso sono coperti dai test.
Eseguito il 2026-10-20 dopo le correzioni del 1° giro (BE e FE «fatte», migrazione 108 applicata a `data/`).

- **Ambiente:** FE http://localhost:5373, BE http://localhost:3201, dati `data/` della cartella di sviluppo (`newreview`, non committato).
- **Requisiti:**
  - piano, righe 89, 214 e 414. Il «Fatto quando» dice: «Tokyo, i quartieri e ogni planimetria mostrano la stessa immagine in visore, indice,
    schede e miniature»;
  - decisione dell'utente del 2026-10-20 in `modifiche.md` («Illustrazione anche nelle schede»: la metro resta con sagome e stemmi; le figure
    al 100%).
- **Prove grezze** in `lotti/L1/esiti-funzionali/`:
  - `api-l1-esito.txt` (GET);
  - `scritture-l1-esito.txt` (scritture sulle mappe di prova);
  - `confronto-impronte.txt`;
  - `BE-finestra-prove.log` (le righe di BE.log della finestra di prova);
  - `vitest-funzionali.txt`;
  - gli script `api-l1.cjs`, `scritture-l1.cjs` e `impronta-db.cjs` (sola lettura del DB).
- **Estratti del DOM:** letti nel browser con iframe a 1280×800 sulle pagine vere. Le citazioni sono qui sotto.

## Regola attesa (oracolo)
L'immagine di una mappa è:
1. la **caricata** (`immagineUrl` con `?v=`);
2. altrimenti l'**asset dichiarato** presente nel manifesto;
3. altrimenti il segno o il riquadro.

Lo stemma compare solo se la mappa non ha né caricata né asset. Ogni vista usa lo stesso file: le schede e le miniature chiedono la variante
`&l=320` dello stesso URL.

## Esiti per caso
| id | Criterio | Esito | Prova grezza (estratto) |
|---|---|---|---|
| F-01 | Tokyo con caricata | ✅ | Albero e `GET /api/mappe/tokyo`: `immagineUrl=/api/immagini/mappa/tokyo/file?v=2026-10-18T13%3A17%3A02.571Z`, asset `mappe/tokyo`. Indice: `src=/api/immagini/mappa/tokyo/file?v=2026-10-18T13%3A17%3A02.571Z&l=320`, `sizes=72px`. Editor `/guida/mappe/tokyo/modifica`: `visore-mappa__immagine src=/api/immagini/mappa/tokyo/file?v=2026-10-18T13%3A17%3A02.571Z`. Nessuno stemma `guida/citta`. (Tokyo non ha un visore proprio: vedi O1) |
| F-02 | Tokyo senza caricata (F10) | ✅ | Prova senza toccare i dati: nel browser ho riscritto le risposte `/api/mappe/albero` e `/api/mappe/tokyo` con `immagineUrl: null`, come le darebbe il BE senza la caricata. Indice: `src=/api/immagini/mappe/tokyo/file?v=2026-09-12T14%3A55%3A14.943Z&l=320`. Editor: `src=/api/immagini/mappe/tokyo/file?v=2026-09-12T14%3A55%3A14.943Z`. Quindi l'asset, non lo stemma, nell'indice e nell'editor |
| F-03 | Shibuya (caricata) in quattro viste | ✅ | Le quattro viste usano lo stesso file `citta-shibuya/file?v=2026-09-09T20%3A09%3A28.331Z`. **API:** `compendio/citta` e `/citta/shibuya`, campo `illustrazione.immagineUrl`, uguale al `MappaDto`. **Visore** `/guida/mappe/shibuya`: questo URL. **Scheda:** stesso URL con `&l=320`, sagoma `lmap%2Ftokyo%2Fshibuya` come segno con `aria-hidden="true"`, `alt="Illustrazione di Shibuya"`. **Intestazione** `/guida/citta/shibuya`: stesso URL con `&l=320` dentro `illustrazione-segno w-full max-w-[420px]`, sagoma sopra |
| F-04 | Quartieri con solo l'asset | ✅ | Kichijoji, Nakano, Ikebukuro e Santuario Meiji: `immagineUrl=null`, asset nel manifesto (`mappe/citta-kichijoji` → `/api/immagini/mappe/citta-kichijoji/file?v=2026-09-12…`). **Scheda:** `src=/api/immagini/mappe/citta-kichijoji/file?v=2026-09-12T14%3A55%3A14.943Z&l=320`. **Intestazione:** stesso file con `&l=320`. **Visore** `/guida/mappe/kichijoji` e visore dell'intestazione: stesso file. Gli altri tre quartieri sono uguali nella scheda |
| F-05 | Scheda senza illustrazione | ✅ | Prova con risposta riscritta (`illustrazione={null,null}` per Kichijoji): la scheda torna alla sagoma `<span class="flex shrink-0 items-center justify-center opacity-40 grayscale">`, misura 112×84, `src=…lmap%2Ftokyo%2Fkichijoji…`, nessun `.illustrazione-segno`. Senza illustrazione anche l'intestazione di Shibuya torna alla sola sagoma |
| F-06 | Kamoshida (caricata) | ✅ | **API:** `compendio/dungeon/kamoshida` dà `illustrazione={"immagineUrl":"/api/immagini/mappa/dungeon-kamoshida/file?v=2026-09-29T15%3A32%3A16.649Z","asset":null}`, uguale alla caricata della radice `palazzo-di-kamoshida` (200 image/png, 2.401.139 B). **Intestazione:** quattro varianti per misura (`w-[150px]`, `w-[176px]`, `w-[56px]`, `w-[86px]`), tutte con questo URL e `&l=320`, con lo stemma `palazzi/kamoshida` sopra (`aria-hidden`). **Indice:** stesso URL e `&l=320`. Senza illustrazione (risposta riscritta) resta solo lo stemma |
| F-07 | Memento | ✅ | `illustrazione={"immagineUrl":null,"asset":null}`. Nel DOM di `/guida/dungeon/mementos` non c'è nessun `.illustrazione-segno`: solo gli stemmi `palazzi/mementos` (`aria-hidden`) e le decorazioni della mappa dei Memento |
| F-08 | Metro | ✅ | In `/guida/citta`, `MappaTokyo` ha 0 immagini `/mappa/citta-*`: solo le sagome `lmap/tokyo/*`, gli stemmi `palazzi/madarame` e `palazzi/mementos` e la sagoma del Covo |
| F-09 | Opacità 100% | ✅ | Stile calcolato di `.illustrazione-segno__immagine` e del contenitore: `opacity: 1`, `filter: none`, nessuno sfondo. Riquadro 128×72 |
| F-10 | Grafica predefinita spenta | ✅ | Con la preferenza a falso (presa in turno con Test layout e poi rimessa com'era). **Schede:** 19 caricate e nessuna sagoma; i 4 quartieri con solo l'asset non hanno illustrazione e mostrano il riquadro vuoto 112×84. **Indice:** caricate sì, Covo col riquadro vuoto. **Visore di Kichijoji:** nessuna immagine. **Kamoshida:** caricata sì, stemma no. Coerente con «resta solo la caricata». Per i Memento vedi O5 |
| F-11 | Quartiere chiuso attenuato | ✅ | 16 schede `illustrazione-segno--spenta`: contenitore con `opacity: 0.6` e `filter: grayscale(1)`, immagine interna a 1. Le aperte (Yongen-Jaya, Shibuya, Shujin, Inokashira, Odaiba, Ogikubo, Tsukishima) non sono attenuate |
| F-12 | Editor uguale al visore | ✅ | `/guida/mappe/shibuya/modifica` usa lo stesso `src` del visore `/guida/mappe/shibuya`. Tokyo: vedi F-01 e F-02 |
| F-13 | Selettore delle sorelle | ✅ | Banchina di Yongen-Jaya, `listbox` «Planimetrie»: opzioni `["Banchina della metropolitana","Vicoli"]`, le stesse di prima della 107 (`dati-prove.md` F8) |
| F-14 | `QuartiereDettaglioDto.mappa` | ✅ | `mappa` è `true` per Shibuya e Yongen-Jaya (con caricata) e `false` per Kichijoji e Nakano (solo asset) |
| F-15 | PUT dell'immagine su una mappa con pezzi | ✅ | Mappa di prova con 1 pezzo. `PUT /api/mappe/:k/immagine` → **409** `mappa-con-pezzi` `{"pezzi":1,"copie":1}`. `PUT /api/immagini/mappa/:k` → **409**. In entrambi i casi i pezzi restano 1 |
| F-16 | da-url | ✅ | Senza conferma: **409**, immagine e pezzi invariati. Con `?eliminaPezzi=1`: **201**, `?v=` nuovo, pezzi 0, `origine="utente"` |
| F-17 | DELETE singola | ✅ | Senza conferma: **409** («togliendola verrà eliminato con le copie»), la mappa resta com'era. Con la conferma: **204**, `immagineUrl=null`, `ruolo="nessuna"`, pezzi 0. **DELETE in blocco:** vedi O3 |
| F-18 | Ruolo della Banchina (107) | ✅ | `yongen-jaya-banchina-della-metropolitana`: `planimetria-nativa`. Ruoli dell'albero: 274 nativa, 24 illustrazione, 9 emblema |
| F-19 | Collezioni di Yongen-Jaya (F8) | ✅ | `dati-prove.md`, «Esito F8»: nessuna numerazione né prima né dopo; le opzioni del selettore sono invariate (F-13) |
| F-20 | `creaMappa` senza asset (F9) | ✅ | `POST /api/mappe` → 201 `{"asset":null,"immagineUrl":null,"ruolo":"nessuna"}`: nessun `mappe/<chiave>` messo per convenzione |
| F-21 | Vitest mirati | ✅ | 8 file e 159 test, EXIT=0 (`vitest-funzionali.txt`): immagine-mappa-strade, immagine-mappa-unica, ImmaginiCaricate, ImmagineMappaUnica, CittaPage, DungeonDettaglioPage, EditorMappaPage, MappaPage |
| F-22 | AnteprimaMappa nei tre casi (F2) | ✅ | **Caricata:** Tokyo e i Palazzi (F-01). **Solo asset:** Tokyo senza caricata (F-02) e il Covo con la grafica accesa (`native%2Fnativo-rmap-022-1-0…&l=320`). **Né caricata né asset:** Covo con la grafica spenta, riquadro `anteprima-mappa__vuota`; il caso «asset assente dal manifesto» è coperto dal test «lo stemma solo se la mappa non ha né caricata né asset…» |
| F-23 | EmblemaDungeon (F3) | ✅ | Gli stemmi delle intestazioni usano `/api/immagini/palazzi/kamoshida/file?v=2026-09-12…`, lo stesso URL del manifesto usato dalla metro (`palazzi/madarame`) |
| F-24 | Sorella con asset assente (F4) | ✅ | Nei dati reali nessuna mappa ha ruolo «nessuna» (albero: 0). Coperto dal test «una sorella con l'asset dichiarato ma inesistente («nessuna») e uno stemma non sono planimetrie». Dal vivo, la mappa di prova senza immagine ha `ruolo="nessuna"` (F-17, F-20) |
| F-25 | Export e import di una mappa nuova (F9) | ✅ | Export della mappa di prova: `asset=null`, `assetOriginale=null`. Dopo il reimport l'asset resta `null` |
| F-26 | Scarico della pianta e `origine` | ✅ | **da-url:** dal vivo (F-16), `origine="utente"`. **Scarico della pianta di un quartiere** (409 / con conferma / origine invariata): coperto dai test BE e FE (vedi O4) |
| F-27 | Import con dimensioni diverse (F6) | ✅ | **PNG**, pacchetto con 1234×567: dopo l'import la mappa ha 2048×1536, quindi vince l'intestazione. **SVG**, pacchetto con 1234×567: restano 1234×567, come dichiarato in be.md. Vedi O2 |
| F-28 | Grafica predefinita accesa | ✅ | Chiave della preferenza assente. **Schede:** 23 illustrazioni (19 caricate e 4 asset), sagome come segno. **Metro:** sagome e stemmi. **Intestazioni:** sagoma o stemma sopra. **Indice:** Covo con il suo asset |
| F-29 | Accessibilità | ✅ | L'illustrazione ha `alt="Illustrazione di <posto>"`. Il segno ha `aria-hidden="true"`: sagoma «Sagoma di … sulla mappa di Tokyo», stemma con `alt=""` |

## Giro sul collaudo e9fb4871 (2026-10-20, richiesta del validatore G3/G7 tramite PM e Collaudo)
- **Istanza:** FE http://localhost:5473 e BE http://localhost:3301, commit `e9fb4871` (cartella `p5s-sviluppo-l2`); dati = base pulita di
  produzione + 107–108.
- **Metodo:** pagina vera in un iframe della misura data, così le media query valgono; letture del DOM, solo elementi visibili.
- **Misure:** 375×812, 768×1024, 1024×690, 1280×689.
- **Estratti grezzi:** `esiti-funzionali/collaudo-e9fb4871-dom.txt`.

| Caso | Esito | Sintesi della prova |
|---|---|---|
| F-03 Shibuya | ✅ | Scheda, intestazione e visore usano lo stesso file `mappa/citta-shibuya/file?v=2026-09-09T20%3A09%3A28.331Z`: nelle schede e nell'intestazione la variante `&l=320`, nel visore l'originale. Opacità 1 e sagoma `aria-hidden` sopra. Misure: scheda 128×72 (112×63 a 1280); intestazione 299×168 a 375, 220×124 a 768, 200×113 a 1024 e 1280. Nessuno scorrimento orizzontale |
| F-06 Kamoshida | ✅ | L'API dà `illustrazione = {immagineUrl: …dungeon-kamoshida…?v=2026-09-29T15%3A32%3A16.649Z, asset: null}`. Intestazione: 150×84 a 375 e 176×99 a 768, con lo stemma 34 e 40; a 1280 104×59 con stemma 40. **A 1024 solo lo stemma 48×48, senza illustrazione**: è la correzione di UX-1 approvata dal PM (fe.md, «Correzioni dei difetti») |
| F-10 Grafica spenta | ✅ (regola dopo UX-2) | **Regola:** con la preferenza spenta resta la caricata; sagome e stemmi vengono dal manifesto comunque; `EmblemaDungeon` ripiega sull'iniziale. **Schede:** 19 caricate col segno; le 4 con solo l'asset (Kichijoji, Ikebukuro, Nakano, Santuario Meiji) mostrano la sagoma 112×84 senza illustrazione. **Metro:** 8 sagome e 2 stemmi. **Intestazioni:** Shibuya ha la caricata con la sagoma; Kichijoji la sagoma 132×94. **Kamoshida:** la caricata con l'iniziale «K» (48×48 a 1024). I visori su asset (planimetrie native) restano vuoti. Nessuno scorrimento orizzontale. Rispetto al primo giro (F-10, sviluppo) cambia l'atteso, per UX-2 e UX-3 |
| F-28 Grafica accesa | ✅ | **Schede:** 23 illustrazioni (19 caricate + 4 asset), tutte a opacità 1 con il segno sopra (`aria-hidden="true"`). **Metro:** 0 illustrazioni, 8 sagome, 2 stemmi. Uguale alle quattro misure; nessuno scorrimento orizzontale |
| G6 Pianta scaricata | ✅ (prova dell'interfaccia, senza scritture) | Kichijoji: pianta pubblicata, nessuna caricata, nessun ingresso. Lo scarico vero fallisce sempre per Fandom 403 (LAY-2, preesistente, in L2). Per puntare `pianta_quartiere.url` a un file locale servirebbe uno script che scrive nel DB, perché nessuna API lo fa, e la regola dell'utente lo vieta: sulla rete reale non si può provare. **Prova fatta** (descrizione corretta su richiesta del validatore, terzo giro F5; script verbatim in `esiti-funzionali/g6-intercettazione.js`): **simulata** nel browser, mai arrivata al BE, la POST `/api/mappe/piante-citta/kichijoji/scarica` (risposta 201 costruita dallo script); **arrivate al BE 3301 ma con la risposta riscritta nel browser** le GET successive `/api/compendio/citta/kichijoji` e `/api/mappe/kichijoji` (il BE rispondeva `immagineUrl: null`, `mappa: false`; lo script le ha cambiate in `immagineUrl = /api/immagini/mappa/citta-shibuya/file?v=G6-simulato`, `mappa = true`); **arrivate al BE e non toccate** le GET precedenti e il file dell'immagine `citta-shibuya` (la caricata vera di Shibuya). La prova verifica quindi **solo l'interfaccia** dopo uno scarico riuscito, non lo scarico. **Esito:** a tutte e quattro le misure la pagina rilegge quartiere e mappa senza ricaricarsi; l'intestazione mostra `…?v=G6-simulato&l=320` (200×113, 220×124, 299×168) e il visore `…?v=G6-simulato`: la stessa immagine. Nessuna scrittura sul 3301 (Kichijoji ancora `mappa=false`). Il lato server dello scarico (caricata scritta, origine invariata, 409 con pezzi) è coperto dal test BE «F5 — scarico della pianta…» (`vitest-funzionali.txt`) |

**Preferenza grafica:** cambiata solo per F-10, in blocchi brevi, e tolta alla fine di ognuno (chiave assente, letta dopo). Test layout è
stato avvisato. **Non si sono fatte altre scritture.**

## Osservazioni (non difetti di L1)
- **O1 — Tokyo non ha un visore proprio.**
  - Cosa succede: `/guida/mappe/tokyo` porta a `/guida/citta` (`MappaPage.tsx:34-55`, comportamento di prima di L1, coerente col piano §3).
    La metro è disegnata e non usa la caricata di Tokyo.
  - Dove si vede la caricata: nell'indice e nell'editor.
  - **Confermato dal PM (2026-10-20):** Tokyo è La città, per scelta passata dell'utente; il «Fatto quando» per Tokyo vale su
    indice, editor e schede.
- **O2 — SVG caricato dall'editor o dalla PUT generica.**
  - Cosa succede: una mappa creata con 777×555 passa a `larghezza/altezza = null`.
  - Confronto: all'import, invece, restano le dimensioni del pacchetto.
  - Origine: è il comportamento di prima di L1 (`6b3dfb99`, `impostaImmagineMappa`: `dim?.larghezza ?? null`).
  - **Decisione del PM (2026-10-20):** correzione di BE dentro L1 (stessa regola «ogni strada di scrittura riallinea l'immagine»):
    un SVG caricato dall'editor conserva le dimensioni dichiarate. Aperto come **FUN-1** in `difetti.md`.
  - **Verificato il 2026-10-20** dopo la correzione di BE (`dopoImmagineMappa`). Le due mappe di prova sono state create con 777×555.
    - SVG dall'editor e dalla PUT generica: le dimensioni restano 777×555.
    - PNG: le dimensioni diventano 2048×1536.
    - SVG caricato dopo il PNG: le dimensioni restano 2048×1536.
    - Import di un PNG con 1234×567 nel pacchetto: le dimensioni restano 2048×1536.
  - Prove in `esiti-funzionali/fun1-*`; impronte del DB prima e dopo: nessuna differenza. Stato: **verificato**.
- **O3 — DELETE in blocco (`?ambito=mappa`) non provata dal vivo.**
  - Il rischio: sui dati reali una risposta sbagliata toglierebbe tutte le immagini caricate delle mappe.
  - Copertura: il test BE «rimozione in blocco … 409 senza conferma; con la conferma i pezzi se ne vanno», verde in `vitest-funzionali.txt`.
- **O4 — Scarico della pianta di un quartiere non provato dal vivo.**
  - Il motivo: scarica da allgamestaff e scrive su un quartiere reale.
  - Copertura: il test BE «F5 — scarico della pianta … origine non cambia» e il test FE «lo scarico automatico … con pezzi (409) non
    sostituisce niente», entrambi verdi.
- **O5 — Memento con la grafica predefinita spenta.**
  - Cosa succede: la mappa dei Memento mostra ancora 16 decorazioni `lmap/memento/*`.
  - Origine: `MappaMemento.tsx` non è toccato da L1, quindi viene da prima.
  - Segnalato per Test UX / no-reg. **PM (2026-10-20):** annotata come preesistente, non è di L1.

## Scritture e pulizia
- **Scritture:** solo su due mappe di prova create apposta:
  - `prova-funzionali-l1-a`: l'app ha messo la chiave pubblica `prova-funzionali-l1`, che viene dal nome;
  - `prova-funzionali-l1-svg`.
- **Pulizia:** le due mappe sono state eliminate e le loro voci del cestino (17, 18) tolte. Il cestino era vuoto prima ed è vuoto dopo.
- **Impronte** di `gioco.db` e `partite.db` (`impronta-db.cjs`, righe e hash per tabella), prima e dopo: **NESSUNA DIFFERENZA** in entrambi i file.
- **Partite:** nessuna scrittura sulla partita reale (id 1) né su «Tutorial» (id 2).
- **Preferenza «grafica predefinita»:** cambiata solo per la prova F-10, nel turno concordato con Test layout, e rimessa com'era (chiave assente).
