# L3 — riprova di layout su newreview-l3 = 48d7a958 (Test layout multi device, 2026-10-20)

Collaudo FE 5473 / BE 3301, dati uguali alla base p5s 0948Z. Commit da verificare:
- 9e8baea3: LAY3-3;
- 48d7a958: LAY3-4, strada (b).

Ho fatto solo letture. L'unico stato preparato è il ciclo 2 del Collaudo per L3-L10.

Metodo: misura dal DOM in un iframe della stessa origine, grande quanto la finestra, con l'attesa di `document.fonts.ready` e le animazioni
finite.
- Ho misurato col **menu pieno**: `menuRidotto:false` solo durante la serie, poi la preferenza del browser è tornata identica (controllata).
- Ho escluso i testi nascosti a vista (≤ 2 px o dentro un contenitore 1×1), le caselle in un'etichetta `.touch` ≥ 44 e i bottoni col velo
  `after:inset-0`.

## 1. LAY3-3 — visore a `min(64dvh, 560px)` sotto i 1024 px: **verde**
Ho misurato tutte le 76 infiltrazioni con mappe dei 9 Palazzi:
- a **375×812** il visore è alto **520 px** in 76 su 76 (atteso `min(0,64 × 812, 560)` = 520);
- a **768×1024** è alto **560 px** in 76 su 76 (atteso `min(655, 560)` = 560).

Nessuno scorrimento orizzontale e nessun testo a una lettera per riga. Le pagine restano lunghe per scelta (L3-L06, L3-L07). Il visore comincia
a 676–1008 px a 768 e a 693–1190 a 375: sul telefono si raggiunge scorrendo (vedi l'osservazione nel §4).

## 2. LAY3-4 — chip delle date di Shido e Maruki: **verde**
Misure 1366×657, 1280×689, 1024×690, 1920×1080, 768×1024, 375×812.
- **Nessun testo tagliato** dal CSS nell'intestazione, a nessuna misura. Si accorciano solo le arcane e le frasi del sovrano, già verificate
  in LAY3-2.
- Chip, da 1024 in su: Maruki mostra «Si apre» (69×22), «Furto consigliato · 3 febbraio» e «Scade · 3 febbraio»; Shido mostra
  «Si apre · 24 novembre», «Furto consigliato» (125×22) e «Scade · 18 dicembre».
- Chip, a 768 e 375: l'etichetta e l'inizio della frase, che termina coi puntini già nel testo, alti 46 px. Per esempio Maruki
  «Si apre · Il Palazzo diventa esplorabile…» 230×46.
- **La frase intera si legge senza mouse**: «Dettagli dalla guida» (121×44 su desktop, 299×44 a 375), poi «Mostra tutto» (71×44) sulla sua
  riga. Dopo il tocco il testo è identico a quello intero:
  - Maruki «Si apre»: 398 caratteri, riga da 1046×98 a 299×206;
  - Shido «Furto consigliato»: riga da 1046×80 a 299×116.

  Controllato a 1366, 1024, 768 e 375, sempre senza scorrimento orizzontale.
- A pagina chiusa le schede restano in una schermata a 1366×657 (589/589) e a 1024×690 (622/622).

## 3. R3-41 di nuovo, da 1024 in su: **verde**
76 infiltrazioni × 5 misure, 380 misure con i font caricati (`loaded` in tutte).

| misura (metà) | inizio del visore | altezza del visore | `main` | intestazione |
|---|---|---|---|---|
| 1366×657 (328,5) | **327–328** | 298–299 | 589/589 in tutte | 106 |
| 1280×689 (344,5) | **327–328** | 330–331 | 621/621 | 106 |
| 1024×690 (345) | **340** | 300 | 622/622 | 106 |
| 1280×800 (400) | 327–328 | 441–442 | 732/732 | 106 |
| 1920×1080 (540) | 317–327 | 722–732 | 1012/1012 | 106 |

- Entro metà in 380 su 380.
- Una sola barra: la pagina non scorre, e scorrono solo le aree interne previste (colonna «Aree · N» e raccolta, bordo 1 px, overscroll
  contenuto).
- Nessuno scorrimento orizzontale, nessun titolo d'area troncato, nessun bersaglio sotto i 44 px.
- Misure grezze: `R3-41-LAY3-3-misure-grezze.json`, 532 righe con le misure a 768 e 375.

## 4. L3-L07, il telefono (375×812): **verde** sui punti del caso
Controllato su Kamoshida («Vecchio Castello»), Madarame, Maruki e Iweleth:
- selettore dell'infiltrazione 182×44–49;
- «Aree · N» 299×44, che apre un **foglio dal basso** 375×788 a distanza 0 dal fondo, con 18–34 voci tutte ≥ 44 px e il corpo che scorre
  da solo (710/886–1206, overscroll contenuto);
- versioni in fila scorrevole (297/338, overscroll contenuto, sfumature ai lati);
- visore 520;
- nessuno scorrimento orizzontale.

**Decisione del PM (2026-10-20)**: nessuna correzione in L3. I requisiti non danno una soglia per il telefono: R3-41 fissa la metà da 1024 in su, e a telefono la pagina è lunga per scelta (L3-L06/L07). Il PM non ha verificato se a 375 l'intestazione sia cambiata rispetto a prima di L3: lo controlla il no-reg. Il punto va nell'elenco «da rivedere» per l'utente (`rapporto-finale.md`).
**Osservazione per il PM o Test UX (nessuna soglia nel caso).** L3-L07 chiede un'«intestazione compatta». A 375 l'intestazione è alta
526–740 px, il 65–91% della prima schermata: Kamoshida 622, Madarame 661, Maruki 740, Iweleth 526. Per arrivare al visore bisogna scorrere.

## 5. L3-L10 «Da collocare»: **verde** (ciclo 2 del Collaudo)
Stato preparato dal Collaudo (foto 11:55:37Z): «Museo 2P - Livello 3» tolta dalla sua Area di Madarame. Misure a 1366×657, 1280×689, 1024×690,
1920×1080, 768×1024 e 375×812.
- «Planimetrie da collocare (1)» è un `summary` di 44 px di altezza, con la sezione richiudibile.
- La riga «Museo 2P - Livello 3 · Palazzo di Madarame · 2 pin» è alta 48 px; a 375 va su più righe, 299×81.
- «Colloca» 98×44. Miniatura 62×46 in `contain`, non rotta.
- Nessun testo troncato o a una lettera per riga, niente oltre il bordo, nessuno scorrimento orizzontale.
- **Finestra «Colloca»**, aperta e chiusa con Annulla senza salvare:
  - a 375 è un foglio dal basso 375×375 a distanza 0 dal fondo;
  - da 768 in su è centrata, 520×376;
  - corpo 220/220 con overscroll contenuto, nessun bersaglio sotto i 44, nessun testo troncato.
- Alla fine `/api/aree/da-collocare` aveva ancora 1 riga. Ho chiesto al Collaudo il ripristino, con la conferma «IDENTICHE».
- **Ripristinato dal Collaudo alle 11:59:09Z.** Dopo il riavvio del BE l'impronta è IDENTICA alla foto e alla base 0948Z, e
  `/api/aree/da-collocare` è di nuovo vuota.
  - Prima del ripristino cambiavano solo la riga staccata in `mappa` (nativo-rmap-153-3-3) e una miniatura in cache (immagine 463 a 160 px,
    scritta dalla lettura `?l=`).
  - Nel BE.log non ci sono mie scritture (`esiti-collaudo/cicli-dati.md`, `ciclo2-*.txt`).
- Misure grezze: `L3-L10-misure-grezze.json`.

## Difetti
Nessun difetto nuovo. LAY3-3 e LAY3-4 sono «verificato (layout, 48d7a958)».
