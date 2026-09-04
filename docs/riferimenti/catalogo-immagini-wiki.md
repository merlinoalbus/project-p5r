# Catalogo link immagini — 232 Persona + 23 Confidenti (Persona 5 Royal)

Ricerca del 2026-09-03. Solo LINK (nessuna immagine scaricata nel repository). Fonte: Megami Tensei Wiki
(megamitensei.fandom.com), via API MediaWiki (`action=query`, `prop=images` / `prop=imageinfo` / `list=search` /
`list=allimages`), interrogata con `curl` e user-agent da browser (l'endpoint HTML risponde 403/402 agli strumenti
di fetch automatico, l'API MediaWiki no).

## Risultato nel repository
I link sono confluiti in `data/riferimenti/immagini.json` (278 voci: 24 Arcani, 23 Confidenti, 231 Persona; unica
Persona senza riferimento: Orpheus Picaro). Arcani: 23 carte dal censimento di `docs/grafica/riferimenti-visivi.md` §4 più la
carta dell'arcano Fede (`File:Faith.png` sulla pagina "Faith Arcana": la carta "LA FOI"; `FaithArcana.png` è la variante alterata). Correzione applicata rispetto al censimento grezzo: per *Izanagi Picaro* il
file trovato era una tavola del fumetto, sostituito con l'artwork base di Izanagi (P5) come per le altre varianti Picaro.
L'utente importa le immagini nella propria istanza da Impostazioni → "Immagini di riferimento dal wiki".

## Metodo

1. **Persona (232)**: per ciascun nome del seed, `prop=images&redirects=1` sulla pagina omonima del wiki; se la
   pagina non esiste, tentativo con il nome privato del suffisso " Picaro", poi ricerca full-text
   (`list=search`) come ultima risorsa. Tra le immagini elencate nella pagina, selezione del file il cui nome
   contiene il nome della Persona (confronto normalizzato: minuscolo, senza accenti/punteggiatura) e che porta
   il tag `P5R`/`Persona 5 Royal` (affidabilità **alta**) oppure `P5` senza `R`/`X` (affidabilità **media**).
   URL diretto recuperato con `prop=imageinfo`.
2. **Casi residui (23 Persona senza match automatico)**: risolti manualmente seguendo i redirect di
   disambiguazione del wiki (es. "Messiah" → "Messiah (Persona)"), correggendo refusi nei nomi file
   (es. "Decabria" invece di "Decarabia") e usando `list=allimages&aiprefix=` per le Persona "gioiello"
   (Crystal Skull, Orichalcum, ecc.) che non hanno una pagina demone dedicata ma solo un file caricato a sé
   stante. Vedi `fix-persona.js` per il dettaglio riga per riga.
3. **Confidenti (23)**: tentativo diretto sul pattern noto `Persona 5 Confidant Guides Icon (<Arcano>) - <Nome>.png`
   (con `<Arcano>` preso dal seed); per Munehisa Iwai il wiki usa l'arcano "Hanged-Man" (con trattino) invece di
   "Hanged". Per le Gemelle Custodi usato il nome inglese "Caroline and Justine" (il seed riporta la traduzione
   italiana). Tutti e 23 risolti al primo tentativo o alla prima variante.
4. **Verifica**: controllo HEAD (`curl -sI`) su 13 URL campione (11 Persona sparse + 2 Confidenti, incluse alcune
   delle correzioni manuali) → tutti **200**, `content-type: image/webp` (Wikia serve gli originali PNG/JPG
   convertiti in WebP in base all'header `Accept`; è comunque un'immagine valida).

## Statistiche finali

| | Totale | Alta | Media | Bassa | Senza URL |
|---|---|---|---|---|---|
| Persona | 232 | 204 | 26 | 1 | 1 |
| Confidenti | 23 | 23 | 0 | 0 | 0 |

**Un solo Persona senza URL**: *Orpheus Picaro* (vedi sotto, caso "Orpheus F").

## Voci incerte da controllare a mano (42 Persona, elenco completo con motivo)

### Refusi/varianti di grafia nei nomi file del wiki (match corretto, solo nome file diverso — affidabilità alta)
- **Decarabia** → file `Decabria P5R.jpg` (refuso sul wiki)
- **Hecatoncheires** → file `Hecatoncheir P5R.jpg` (singolare sul wiki)
- **Kushi Mitama** → file `Kusi Mitama P5R.jpg` (refuso sul wiki)
- **Mitra** → file `Mithra P5R.jpg` (grafia alternativa sul wiki)
- **Kushinada** → file `Kushinada-Hime P5R.jpg` (nome corretto del demone è "Kushinada-Hime"; la pagina "Kushinada" esiste ma è priva di immagini)
- **Bishamonten**, **Maria**, **Regent** → risolti tramite pagina di disambiguazione del wiki verso la pagina demone reale ("Bishamonten (demon)", "Maria (demon)", "Regent (Treasure Demon)")

### Persona "gioiello"/oggetto senza pagina demone dedicata (file trovato via ricerca per prefisso — affidabilità media)
Crystal Skull, Emperor's Amulet, Hope Diamond, Koh-i-Noor, Orichalcum, Orlov, Queen's Necklace, Stone of Scone.
Questi Persona (oggetti preziosi ottenibili come fusione speciale in P5R) non hanno una pagina demone propria sul
wiki: l'unico riscontro è un file immagine "orfano" (es. `Crystal Skull P5R.jpg`) non collegato ad alcuna pagina di
elenco raggiungibile via `prop=images`. Il link è comunque verificato (200, immagine valida) ma non è collegabile a
una pagina wiki di contesto — il campo `pagina` punta perciò direttamente alla pagina del file.

### Nessun file taggato P5R sulla pagina, solo P5 base (affidabilità media)
- **Ariadne**, **Asterius**, **Izanagi**, **Kaguya**, **Magatsu-Izanagi**, **Thanatos** (e le rispettive varianti
  " Picaro", che riusano la stessa immagine base non essendoci artwork Picaro distinto) → file `P5 <Nome>.jpg`
- **Tsukiyomi** / **Tsukiyomi Picaro** → file `P5 Tsukuyomi.jpg` (grafia alternativa "Tsukuyomi" invece di "Tsukiyomi")
- **Messiah** / **Messiah Picaro** → file `P5 Messiah.jpg` (pagina reale "Messiah (Persona)", raggiunta da
  disambiguazione; nessuna variante Picaro distinta)
- **Bugs** → file `Bugs P5 Anime.png` (immagine dall'anime, non dal videogioco: verificare pertinenza)

### Trovati solo via ricerca prefisso file, non tra le immagini standard della pagina (affidabilità alta ma verificare)
- **Phoenix** → `Phoenix P5R.jpg`
- **Seth** → `Seth P5R.jpg`

### Famiglia "Orpheus" — attenzione, contaminazione tra varianti risolta manualmente
Il seed contiene 4 voci distinte: *Orpheus*, *Orpheus F*, *Orpheus Picaro*, *Orpheus F Picaro* ("F" = variante
femminile del Protagonista di Persona 3 Portable, inclusa in P5R come Persona fondibile via DLC). Sulla pagina
wiki condivisa "Orpheus", gli UNICI file taggati P5R sono `F Orpheus P5R.jpg` e `F Orpheus Picaro P5R.jpg` — cioè
le varianti femminili. La prima esecuzione automatica aveva erroneamente assegnato questi file anche a *Orpheus*
e *Orpheus Picaro* (le varianti base/maschili). Corretto come segue:
- **Orpheus F** → `F Orpheus P5R.jpg` (alta, corretto)
- **Orpheus F Picaro** → `F Orpheus Picaro P5R.jpg` (alta, corretto)
- **Orpheus** → nessun file P5R dedicato disponibile; usato `P5 Orpheus.jpg` (artwork P5 base, media affidabilità)
- **Orpheus Picaro** → **nessun URL** (`url: null`). Nessun artwork P5R distinto trovato per la variante base;
  alternative da valutare a mano: `Orpheus-Picaro-Q2.jpg` (da Persona Q2, gioco diverso) o
  `Orpheus and Orpheus Picaro.jpg` (immagine congiunta, gioco non identificato con certezza).

### Altri casi da verificare visivamente
- **Jack-o'-Lantern** → file `Pyro Jack P5R.jpg`. Sulla pagina dedicata a "Jack-o'-Lantern" l'unico file taggato
  P5R è quello di "Pyro Jack" (demone imparentato/evoluzione nella stessa famiglia). Potrebbe trattarsi dello
  stesso modello 3D riusato in P5R (comune per le famiglie di demoni con recolor, es. Jack Frost/King Frost),
  ma non è stato possibile confermarlo senza ispezione visiva diretta dell'immagine.
- **Orpheus F** / **Orpheus F Picaro** — pagina risolta tramite ricerca full-text (non match diretto sul titolo
  "Orpheus F"): verificare pertinenza.
- **Athena Picaro**, **Izanagi-no-Okami Picaro**, **Kaguya Picaro**, **Ariadne Picaro**, **Asterius Picaro**,
  **Magatsu-Izanagi Picaro**, **Thanatos Picaro** — pagina risolta togliendo il suffisso " Picaro" (nessuna pagina
  separata per la variante Picaro sul wiki): l'immagine potrebbe non riflettere la palette/variante Picaro
  specifica se questa esiste graficamente nel gioco.

### Berith — unico Persona senza artwork P5/P5R (affidabilità bassa)
Nessuna immagine P5 o P5R trovata sul wiki per Berith (solo artwork di Persona 3). Come riferimento di
ripiego è stato usato `P5X Berith.png`, cioè l'artwork da **Persona 5X** (spin-off mobile separato, stile
diverso da P5R): da sostituire a mano se si trova una fonte migliore, o da scartare.

## Problemi incontrati
- L'endpoint HTML del wiki (e presumibilmente gli strumenti di fetch generici) risponde 403/402; l'API
  MediaWiki (`api.php`) invece è liberamente accessibile con uno user-agent da browser via `curl`.
- Diverse pagine "gioiello"/oggetto non hanno una voce demone dedicata sul wiki (solo redirect a pagina di
  disambiguazione del gioco "Persona 5"): risolte con `list=allimages&aiprefix=`.
- Refusi ricorrenti nei nomi dei file caricati sul wiki (Decabria, Kusi Mitama, Mithra, Hecatoncheir) non
  intercettabili da un confronto automatico stringente sul nome — risolti manualmente uno per uno.
- La famiglia "Orpheus" richiede attenzione particolare per non confondere la variante femminile con quella base
  (vedi sopra).
- Wikia/Fandom serve le immagini in formato WebP quando il client lo richiede (verificato via `curl -I`), anche
  se il nome file nell'URL conserva l'estensione originale (`.jpg`/`.png`): non è un errore, è la CDN che fa
  content negotiation.

## Nota d'uso
Nessuna di queste immagini è stata scaricata nel repository: sono opere protette da copyright di Atlus/Sega,
da citare come riferimento visivo esterno (es. nei prompt di generazione asset), non da incorporare direttamente
nel prodotto finale.
