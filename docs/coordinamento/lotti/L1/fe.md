# L1 · fe — correzioni dopo il 1° giro (Implementazione FE, 2026-10-20)

Solo `src/` nella cartella di sviluppo (`newreview`, niente commit). Esiti grezzi in `esiti-fe/` (typecheck.txt, lint.txt, vitest-fe.txt).

## Cosa è fatto
### Decisione dell'utente «Illustrazione anche nelle schede» (F1/F2/F7)
- `src/components/mappe/IllustrazioneConSegno.tsx`: illustrazione piena (100%, `object-fit: cover` in un riquadro 16:9 come i file
  1672×941), segno (sagoma o stemma) nell'angolo in basso a sinistra su una piastrina scura, `aria-hidden` (l'`alt` dice il posto);
  `senza` se manca; `spenta` per i quartieri chiusi; prop obbligatoria `sizes` per le miniature.
- Stili in `src/tailwind.css` (`.illustrazione-segno`, `__immagine`, `__segno`, `--spenta`), accanto ad `.anteprima-mappa`.
  Spenta = opacità 0,6 + scala di grigi (a 0,45 l'illustrazione notturna di Shinjuku spariva sul fondo scuro).
- `CittaPage`: scheda con illustrazione 128 px (112 da 1280 px, quando le schede sono la colonna accanto alla metro: il testo resta
  162 px come prima) e sagoma 52×39 sopra; senza illustrazione la sagoma 112×84 di prima; chiusa attenuata.
- `QuartierePage`: intestazione con illustrazione (telefono: in cima, larga quanto la carta fino a 420 px; da 640 px a fianco, 220;
  da 1024 px 200) e sagoma 72×54 sopra; senza, la sagoma 132×100 di prima.
- `DungeonDettaglioPage` (solo Palazzi): illustrazione della radice con lo stemma sopra — 150 (telefono), 176 (640–1023); le misure
  da 1024 px (56 e 86 nel primo giro) sono cambiate con UX-1, vedi «Correzioni dei difetti» più sotto. Lo stemma grande in filigrana (0,07) resta solo dove l'illustrazione manca.
  I Memento invariati (verificato: nessuna illustrazione, stemma 40, filigrana come prima).
- Metro (`MappaTokyo`) non toccata.

### F2 — AnteprimaMappa
Ordine caricata → asset dichiarato (stessa regola del visore, `useImmagineMappa`) → stemma di Tokyo/Covo solo se la mappa non ha
né l'una né l'altro (anche asset dichiarato ma assente dal manifesto) → riquadro col simbolo. `ImmagineMappaUnica.test.tsx`: il caso
«lo stemma vince sull'asset» riscritto («Tokyo senza caricata mostra l'asset, come il visore»), più i casi senza niente, capofila col
prefisso, grafica predefinita spenta.

### F3
- `EditorMappaPage`: l'immagine di base passa da `useImmagineMappa` (righe ~358, 373-374, 450); niente più `useAsset` per conto suo.
- `EmblemaDungeon`: `segnoPalazzo(chiave)` invece di `` `palazzi/${chiave}` ``.
- `segniMappa.ts`: commento riscritto con la decisione dell'utente; tolto il falso «le schede no» (anche le schede usavano l'URL fisso).

### F4 — MappaPage
Le mappe sorelle del selettore passano da `haPlanimetria` (ruolo dedotto dal server, `ruoloConVisore`) invece di
`!!(m.immagineUrl || m.asset)`: una sorella con asset per convenzione inesistente (ruolo «nessuna») o uno stemma non entra.
`haPlanimetria` accetta ora anche il riassunto dell'albero (senza dimensioni).

### Variante «miniature» (approvata dal PM)
`shared/miniature.ts` (di BE) usato da `IllustrazioneConSegno` (`src` = l=320, `srcSet` 160/320/640/1024, `sizes` dalla prop),
`AnteprimaMappa` (prop `sizes`, predefinito `72px`; griglia di `MappaPage` `(min-width: 1536px) 25vw, (min-width: 768px) 33vw, 50vw`;
**anche `AccessoMondoPage`**, griglia 2/3/4 colonne: `(min-width: 1280px) 25vw, (min-width: 640px) 33vw, 50vw` — non era nella sezione
della Stesura, ma col predefinito 72px avrebbe scaricato miniature sgranate), `ImmaginiLuogo` (`112px`, più `loading="lazy"`).
Visore, editor, IngressoQuartiere, MappaIncorporata, sagome e stemmi invariati.
`sizes` misurati: schede `(min-width: 1280px) 112px, 128px`; quartiere `(min-width: 1024px) 200px, (min-width: 640px) 220px,
min(420px, calc(100vw - 64px))` (con `100vw` a 375/dpr 2 il browser prendeva la 1024 per un riquadro di 299 px; con il calcolo la 640);
Palazzo `150px` / `176px` / `56px` / `86px`.

### F5 lato FE (i 409 nuovi di BE)
- `src/services/api/immagini.ts`: `scaricaPiantaQuartiere(q, { eliminaPezzi })`, `eliminaImmagini(ambito, { eliminaPezzi })`.
- `QuartierePage`: lo scarico automatico su una mappa con pezzi (409 `mappa-con-pezzi`) non è un errore: nessun «Riprova», niente
  sostituito.
- `EditorMappaPage` «Scarica dalla guida»: sul 409 la stessa finestra «Sostituire l'immagine di base?» del caricamento di un file
  (stato generalizzato in `{ messaggio, sostituisci, ok }`), conferma → `eliminaPezzi`.
- `ImmaginiCaricate` (Impostazioni): rimozione di un ambito (o di tutte) con mappe con pezzi → la finestra resta aperta col messaggio
  del server e «Rimuovi anche i pezzi»; Annulla dimentica la richiesta.
- `ImmagineEntita` non toccata: nessuno la usa con l'ambito `mappa` (ambiti in uso: altro, arcana, confidente, persona, personaggio, skill).

## Test (mirati, `--reporter=verbose`)
14 file, **201 test verdi**, EXIT=0 (`esiti-fe/vitest-fe.txt`): ImmagineMappaUnica, CittaPage (schede e intestazione del quartiere con e
senza illustrazione, attenuata, `srcset`/`sizes`, 409 silenzioso), DungeonDettaglioPage (quattro misure e `sizes`, Memento senza
illustrazione), EditorMappaPage (scarico dalla guida col 409 → conferma → `eliminaPezzi`), ImmaginiCaricate (nuovo: conferma dei pezzi,
annulla), MappaPage, MappaTokyo, CollegamentoMappa, DoveSiTrova, MappaIncorporata, OrganizzazioneMappe, AccessoMondoPage, accessoMondo,
shared/miniature. Fixture allineate al DTO (`illustrazione`) in CittaPage.test:176 e DungeonDettaglioPage.test:44.
`npm run typecheck` EXIT=0, `npm run lint` EXIT=0.

Nota di procedura: un blocco di test di DungeonDettaglioPage.test.tsx l'avevo aggiunto con un heredoc; l'ho tolto e rimesso con Edit
diretto (contenuto identico), come vuole la memoria dell'utente.

## Verifica nel browser (http://localhost:5373, misure dal DOM)
- **La città**: 1280×800 — scheda 320×134, illustrazione 112×63, testo 162 px (come prima), segno 52×39, opacità 1, 23 illustrazioni
  (19 caricate + 4 asset: Kichijoji, Ikebukuro, Nakano, Meiji Shrine), 16 attenuate, nessuno scorrimento orizzontale. 768 — due colonne,
  scheda 359×155, illustrazione 128×72. 375 — scheda 333×134, illustrazione 128×72, nessuno scorrimento orizzontale.
  **Peso a 375 (dpr 2)**, scorrendo tutte le schede: 19 caricate = 19 richieste tutte con `l=320`, 250.302 byte (max 17.720);
  le 4 asset con `l=320`, 139.448 byte. ~390 KB in tutto contro ~40 MB.
- **Shibuya**: 375 — intestazione 333×345, illustrazione 299×168, segno 72×54, nessuno scorrimento orizzontale; `sizes` sceglie la 640
  (provato a cache fredda). 1280×689 — illustrazione 200×113, intestazione 147.
- **Kamoshida**: 1280×689 e 1366×657 — intestazione 170 (gruppo figura+anello 48 px come prima; con la figura stretta a 48 l'altezza è la
  stessa), `main` 621/621 e 589/589, niente barra di pagina, nessuna filigrana. **1024×690** — con 86 px il sovrano andava a capo
  (intestazione 246 contro 222): da qui la misura da 56 px fra 1024 e 1279 → 222, `main` 622/622. Madarame a 1024: 265, identica alla
  simulazione con lo stemma da 48. 768 — illustrazione 176×99 (miniatura 320), intestazione 297. 375 — illustrazione 150×84.
- **Memento**: nessuna illustrazione, stemma 40, filigrana invariata.
- **Indice delle Mappe** (1280): Tokyo mostra la sua caricata in miniatura (`l=160` a 72 px), le radici dei Palazzi le loro; **griglia** di
  Kamoshida: 26 miniature con `l=` e `sizes` della griglia.

## Correzioni dei difetti UX-1, UX-2, UX-3, LAY-1 (2026-10-20, decisioni del PM)
- **UX-1** (`DungeonDettaglioPage`): 1024–1279 px solo lo stemma da 48 come prima di L1 (niente più figura da 56 px); da 1280
  illustrazione 104×59 con stemma da 40 sopra, **in colonna sopra l'anello** (104 = 48 + 8 + 48, la larghezza di stemma e anello di
  prima). Con 128 px affiancata o in colonna crescevano Madarame, Niijima, Shido (1280) e Iweleth (1366). Telefono 150, tablet 176 invariati.
  Misure (intestazione dopo / prima simulata con lo stemma da 48, sui 9 Palazzi):
  - 1024×690: Kamoshida 222 / 222, solo lo stemma visibile, `main` 622/622.
  - 1280×689: 170/170, 194/194, 197/197, 170/170, 197/197, 170/170, 170/170, 194/194, Maruki 322/322 (Maruki ha già la barra di pagina,
    638/621, anche con lo stemma: preesistente, il PM la segna per L3).
  - 1366×657: tutti uguali (Iweleth 170/170), `main` 589/589. 1440×789 e 1536×789: tutti uguali, `main` 721/721.
  - 1920×969: Madarame, Shido, Maruki uguali; **Kamoshida, Kaneshiro, Futaba, Okumura, Niijima, Iweleth 137 contro 118** (lì
    l'intestazione è su una riga e la colonna la allunga), `main` 901/901 senza barra. Affiancati da 1536 non va (Okumura e Niijima
    118 → 170). **Opzione A approvata dal PM**: colonna da 1280, +19 px solo sugli schermi da circa 1700 in su.
- **UX-2** (`segniMappa.ts`: `useSegno`, `useRisolviSegno`; `MappaTokyo`, `SagomaQuartiere`): sagome e stemmi dal manifesto a
  prescindere dalla preferenza; la preferenza decide solo il ripiego sull'asset (illustrazioni, mappe). `EmblemaDungeon` resta come
  prima di L1 (segue la preferenza, col ripiego dell'arcano o dell'iniziale). Grafica spenta, 375: 10 cartellini su 10 con sagoma o
  stemma e la targa; schede: 19 illustrazioni caricate, 23 sagome (19 segni + 4 sagome piene).
- **UX-3**: con la stessa regola Kichijoji (grafica spenta, 375) mostra la sagoma 132×100, niente vuoto; e se il manifesto non ha la
  sagoma, `SagomaQuartiere` non rende nessun riquadro (la piastrina vuota del segno è nascosta con `:empty`).
- **LAY-1** (`IllustrazioneConSegno` + stili): due scatole — lo spazio 16:9 largo quanto dice chi lo usa (scheda 128×72, sempre uguale)
  e, al centro, il riquadro con la proporzione dell'immagine letta al caricamento (variabile `--proporzione`), fra 4:3 e 16:9; fuori
  forbice `contain` se riempire taglierebbe più del 5%. `min-height: 0` sullo spazio (senza, il riquadro 4:3 lo allungava a 299×224).
  Misurato a 375: le 4 da asset 96×72 dentro 128×72, le 19 caricate 128×72, inizio del testo uguale in tutte le 23 schede (x 173);
  intestazione di Kichijoji 224×168 dentro 299×168, immagine intera.
- Test: ImmagineMappaUnica (sagoma con grafica spenta, sagoma assente o rotta, `useSegno`/`useRisolviSegno`, proporzione 16:9, 4:3,
  fuori forbice), MappaTokyo (sagoma e stemma con grafica spenta), DungeonDettaglioPage (tre misure, banda 1024–1279 senza
  illustrazione, colonna da 1280). Il test segnalato da Test no-reg (ImmagineMappaUnica:101, «con la grafica spenta non c'è») è
  riscritto sulla regola nuova. **14 file, 206 test verdi**, typecheck e lint EXIT=0 (`esiti-fe/`).

- **`useRisolviAsset` tolta** (richiesta del PM, rilievo di Analisi app in L11): era nata in L1 per la metro e dopo UX-2 nessuno la
  usava più, nemmeno i test. `src/stores/assetStore.ts` è tornato identico a prima di L1 (`git diff 6b3dfb99` vuoto). La metro usa
  `useRisolviSegno` (`src/components/mappe/segniMappa.ts:38`, chiamata in `src/components/mappe/MappaTokyo.tsx:352`; le schede `useSegno`, `segniMappa.ts:31`, in `SagomaQuartiere.tsx:43`). Typecheck e lint
  EXIT=0; 17 file di test che toccano `assetStore`, 139 test verdi.

## G6 (validatore, 2° giro) — scarico della pianta e intestazione del quartiere (2026-10-20)
- File: **solo** `src/pages/QuartierePage.tsx` (righe ~118-124) e il test nuovo `src/pages/QuartierePage.scarico.test.tsx`. Nessuna
  modifica di L2 in questi due file al momento della correzione.
- Correzione: dopo uno scarico riuscito della pianta pubblicata, `dati.ricarica()` (rilettura silenziosa: la pagina resta a schermo).
  Il quartiere riletto ha `mappa: true`, quindi lo scarico non riparte; uno scarico fallito o rifiutato per i pezzi (409) non rilegge.
- Test: `g6-rosso.txt` sul codice di prima (EXIT=1: «expected "vi.fn()" to be called 2 times, but got 1 times»), `g6-verde.txt` dopo
  (2 test verdi, EXIT=0). ESLint sui due file EXIT=0.

## Non fatto / da sapere
- Grafica predefinita spenta: coperta dai test (AnteprimaMappa, useImmagineMappa, SagomaQuartiere); nel browser non l'ho cambiata (è una
  preferenza dell'utente sui dati reali).
- La griglia di MappaPage con il valore della Stesura (`33vw` a 1280) sceglie la 640 per riquadri di 296 px: un po' abbondante a dpr 1,
  corretto a dpr 2. Lasciato com'è.
- F10 (estratti grezzi del DOM per Tokyo senza caricata su una copia) è dei test: non l'ho fatto.
