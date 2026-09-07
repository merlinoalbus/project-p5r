# Fabbisogno grafico — quel che manca, scoperto rifacendo le pagine

Registro della **Fase 6.2**. Si riempie strada facendo: ogni pagina rifatta ci scrive le proprie
voci mancanti, invece di fare un censimento a parte alla fine. È la risposta all'osservazione
dell'utente — non si sa quali elementi grafici servono finché le pagine non sono rifatte — quindi
lo si scrive mentre lo si scopre.

**Chi fa cosa:** i prompt li scrive chi ha rifatto la pagina che ne ha bisogno, li verifica
l'altro, e **la generazione è di Codex**. Un prompt sbagliato costa una generazione buttata;
verificarlo costa una lettura.

| stato | significato |
|---|---|
| `da verificare` | il prompt è scritto, l'altro deve leggerlo prima che si generi |
| `pronto` | prompt verificato, Codex può generare |
| `consegnato` | il file è in `public/asset/` e la pagina lo usa |

---

## 1. Shujin Academy — sagoma per la mappa di viaggio

| | |
|---|---|
| **file** | `public/asset/mappe/lmap/tokyo/shujin-academy.png` |
| **misura** | 760 × 620 px |
| **sfondo** | trasparente, **alfa reale** che segue la sagoma (non un rettangolo opaco) |
| **stato** | **`consegnato`** — generata da Codex il 6 settembre 2026, verificata e in uso |
| **serve a** | `src/components/mappe/MappaTokyo.tsx` |

**Perché serve.** La mappa di viaggio disegna ogni quartiere con la propria sagoma originale,
estratta da `P5_MAPDATA.SPD`. Shujin Academy non ce l'ha, perché nel gioco non è una destinazione
del treno: al suo posto compariva la fotografia del quartiere, che in mezzo a venti sagome in
bianco e nero era una macchia. Codex l’ha disegnata apposta nello stesso stile.

**Il riferimento è già nel repository**, ed è la cosa più importante di questo prompt: prima di
generare, guardare `public/asset/mappe/lmap/tokyo/shibuya.png`, `shinjuku.png`, `akihabara.png` e
`asakusa.png`. La resa deve stare in mezzo a quelle senza distinguersi.

**Prompt**

> Illustrazione di un edificio scolastico giapponese in stile Persona 5 Royal, resa come **sagoma
> nera piatta** su fondo trasparente: nessun grigio, nessuna sfumatura, nessun contorno — solo nero
> pieno, con i dettagli ricavati in **negativo bianco** dentro la massa nera (finestre, vetrate,
> gradini).
>
> Il soggetto: il corpo principale di una scuola superiore giapponese vista **di tre quarti
> dall'alto**, largo e basso, con la lunga facciata a fasce di finestre regolari, l'ingresso
> centrale sporgente con la pensilina, e il cortile davanti. Accanto, più arretrato, il volume più
> alto della palestra. Un albero o due sul davanti, ridotti a massa nera.
>
> Il taglio è **grafico e spigoloso**, da xilografia o da stencil: linee dritte, angoli netti,
> prospettiva forzata e leggermente instabile, come un edificio disegnato di corsa con un
> pennarello grosso. Le finestre non sono un reticolo regolare: sono tacche bianche irregolari,
> alcune piene, alcune vuote.
>
> Nessuna cornice, nessun riquadro, nessuna targa, nessun testo, nessuna scritta giapponese.
> Nessun colore: solo nero e trasparente. Il bianco deve essere trasparente, non bianco pieno —
> l'immagine viene ritagliata sul suo contorno e appoggiata su un fondo rosso.
>
> La sagoma deve occupare quasi tutta la tela, centrata, con un margine minimo.

**Come si verifica quando arriva**

1. l'alfa è reale: `alfaMinima` deve essere 0, e il bianco intorno all'edificio deve essere
   trasparente, non bianco — l'estrattore `lmap_sprites.py` lo controlla per gli originali e lo
   stesso vale qui;
2. messa accanto a `shinjuku.png` e `akihabara.png` alla stessa altezza, non si distingue per
   tratto, peso o densità di nero;
3. nella mappa, con il contorno bianco applicato, la sagoma resta leggibile a 5,5% di larghezza —
   è la misura con cui i cartellini vengono disegnati.

**Esito della verifica**

| prova | esito |
|---|---|
| alfa reale | **passa** — canale 0..255, angolo `(0,0,0,0)`, 64,6% di pixel trasparenti. Gli originali stanno al 44-48%: la scuola è più sparsa perché ha il cortile, non perché l'alfa sia finta |
| stile accanto agli originali | **passa** — messa fra Harajuku e Aoyama-Itchōme non si distingue per tratto né per peso del nero |
| leggibilità alla misura reale | **passa** — resa a 74 px di larghezza sulla mappa, l'edificio, la pensilina e gli alberi restano riconoscibili |

Shujin è tornata in `QUARTIERI_TOKYO` a `x: 40, y: 40`, con la linea `Aoyama–Shujin` che la lega ad
Aoyama-Itchōme. È **l'unica sagoma della mappa che non viene dal gioco**, e sta scritto lì accanto:
il resto dell'atlante è estratto e dimostrato, e un disegno fatto apposta non deve poter passare
per originale.

---

## 2 e 3 — RITIRATE: i pezzi dei Memento c'erano già

Avevo scritto due prompt per Codex — nove grappoli di città divelta e le catene del cratere — e
**erano sbagliati da chiedere**: quelle immagini stanno già negli originali estratti, in
`IT/FIELD/PANEL/MEMENTOS/MEMENTOS.SPD`, e hanno pure i nomi.

Gli otto `第N層` — «strato N» — sono i grappoli che compongono l'imbuto scendendo, l'ultimo con la
punta a trivella del fondo. `街並み` è il profilo della città sopra il pozzo, `鎖` sono le catene,
i `血管` («vasi sanguigni») sono le venature rosse che solcano il cratere, e il terzo semestre ha i
suoi dieci strati a parte perché lì il pozzo cambia. In tutto **73 elementi**, estratti da
`lmap_sprites.py` in `public/asset/mappe/lmap/memento/`.

**La lezione, scritta perché non si ripeta:** prima di scrivere un prompt si guarda se la cosa
esiste già fra gli originali. Un asset generato al posto di uno del gioco non è solo lavoro
sprecato — è una differenza di tratto che si vede, ed è un pezzo di mappa che smette di essere
autentico. La sagoma di Shujin (voce 1) resta legittima perché quella nel gioco **non c'è**: la
scuola non è una destinazione del treno, e l'ho verificato nel foglio degli sprite prima di
chiedere il disegno.

---

## 4 — RITIRATA: la sagoma del Covo c'era già, ed è la terza volta

Avevo scritto un prompt per **far disegnare** la sagoma del Covo dei Ladri per la mappa di viaggio.
Era sbagliato da chiedere, e me l'ha mostrato **Codex**, che ha applicato la regola meglio di come
l'avevo applicata io: aveva cercato in tutto `data/atlas/extracted`, non solo dentro
`P5_MAPDATA.SPD`. Il Covo esiste come **Luogo 022**, e i suoi originali sono lì da giorni:

- `png/BASE/FIELD/PANEL/ROADMAP/RMAP_022_1_0.png` … `_1_4.png` — la pianta del Covo, in cinque
  vesti (nera, grigia, e le varianti colorate);
- `panoramiche/Luogo 022 - tavola 01.jpg` — la tavola d'insieme;
- `png/IT/FIELD/PANEL/PLACE_PICT/PLC_022_001_00.png` — **la scritta «COVO DEI LADRI» del gioco, in
  italiano**;
- `icone-mappa/sprite-022.png` — la freccia dell'indicatore.

**Il mio errore, per nome:** avevo verificato l'assenza nel foglio della mappa di viaggio e ne
avevo concluso l'assenza *dal gioco*. Sono due cose diverse. Nel foglio dei quartieri il Covo non
c'è perché non è una fermata del treno — quello era giusto — ma il Covo ha un suo luogo, e quel
luogo ha le sue immagini. È lo stesso errore delle voci 2 e 3, e questa è **la terza volta** che la
regola «prima si guarda fra gli originali» salva un pezzo di mappa dall'essere disegnato al posto
di quello vero. La prima volta è stata una lezione; la terza è un procedimento, e ora sta scritto
anche nello script.

### Che cosa è stato fatto al posto della generazione

`RMAP_022_1_0` è la pianta del Covo **nello stesso linguaggio grafico delle sagome dei quartieri**:
nero pieno, dettagli ricavati in negativo bianco, alfa reale. Sul foglio sta in un angolo di una
tela 1024 × 1024 quasi tutta vuota, quindi l'unica operazione necessaria era portarla al proprio
riquadro. La fa `tools/p5r-map-export/covo_sagoma.py`, che **ritaglia e non genera**:

```
originale   1024x1024
riquadro    (203, 157, 542, 540)
sagoma      339x383
alfa minima 0 (0 = ritaglio reale)
trasparenti 25.8%
angolo      (255, 255, 255, 0)
```

Il file è `public/asset/mappe/lmap/tokyo/covo-dei-ladri.png`, cioè esattamente il percorso che
`assetCovoLadri()` cercava da ieri: **la metà applicativa era già pronta e non ha richiesto una
riga di codice.**

### Non si ingrandisce, e perché

Il ritaglio esce a 339 × 383, più piccolo delle sagome dei quartieri (600-800 px). Lo script ha un
**tetto, non un bersaglio**: rimpicciolisce se serve, non ingrandisce mai. Ingrandire un originale
lo sgrana, e di pixel ce n'è in abbondanza — sulla mappa un cartellino è largo il 5% della tela, e
Shibuya, che è 726 px, viene resa a 74.

### La domanda che restava, e come l'ho decisa guardando

La pianta è un disegno **di un altro genere**: i quartieri sono profili di edifici in prospettiva,
questa è una planimetria vista dall'alto, e per giunta con tre caselle a stella colorate. Una
planimetria in mezzo a venti profili poteva stonare, e non era una cosa da decidere a parole.

Montate le quattro figure fianco a fianco alla misura vera — 30 px, quella della mappa — e poi
ingrandite, il Covo **sta in famiglia**: alla misura d'uso legge come una massa nera compatta con
dettagli bianchi, esattamente come le altre, e il colore delle stelle è un accento di pochi pixel.
Ingrandito si vede che è una pianta, ma a quella misura nessuno lo guarda. **Deciso di tenere
l'originale**: fra un originale che si distingue un poco e un disegno che assomiglia molto, in
questo progetto vince l'originale.

E c'è una ragione in più: il Covo **non è un posto di Tokyo**. È una schermata del menu. Che il suo
segno sia di un altro genere non è un difetto, è un'informazione.

### La scritta del gioco, trovata e non usata

`PLC_022_001_00.png` è la targa «COVO DEI LADRI» disegnata dal gioco, in italiano. Non la uso, e
va detto perché: sulla mappa le targhe sono **tutte** testo reso dall'app, con lo stesso corpo in
`cqw` e lo stesso andare a capo. Una targa-immagine in mezzo a ventinove targhe di testo si
comporterebbe diversamente a ogni larghezza, e romperebbe la sola cosa che tiene insieme la
collocazione. È registrata qui perché esiste e perché la scelta sia una scelta.

### Prova rifatta con la sagoma vera

La promessa era: quando l'asset arriva, si rifà la prova delle sovrapposizioni di `docs/MAPPE.md`.
Rifatta, nel caso peggiore (tutte le date tolte **e** tutti i blocchi aperti: 68 pezzi resi, il
massimo che quella mappa possa mostrare):

| larghezza | pezzi resi | non resi | sovrapposizioni | fuori dalla tela |
|---|---|---|---|---|
| 375 px | 68 | 0 | **0** | **0** |
| 820 px | 68 | 0 | **0** | **0** |
| 1280 px | 68 | 0 | **0** | **0** |
| 1440 px | 68 | 0 | **0** | **0** |

`non resi: 0` è la riga che prima valeva 1: era la sagoma che non c'era.
---

## Non serve un disegno, serve un colore — gli otto spilli troppo chiari

Non è una voce di fabbisogno grafico e sta qui perché è emersa nello stesso lavoro: montando i 37
spilli nuovi uno accanto all'altro si vede che otto hanno una tinta troppo chiara per reggere una
figura anch'essa chiara — `forziere-raro` (#fde047), `terme` (#67e8f9), `casa` (#fdba74),
`lavanderia` (#c4b5fd), `nemico` (#b0b0c0), `porta` (#a3a3a3), `nota` (#9ca3af), `scala` (#2dd4bf).

Si leggono, ma sono il caso peggiore. Si sarebbe risolto in `shared/spilli.ts`, scurendo quegli
otto senza toccare la grafica: le figure vanno bene, è il fondo che non fa da fondo.

**Chiuso: l'utente ha deciso di lasciarli come sono**, ed è registrato in `docs/DECISIONI.md` alla
data del 7 settembre 2026. Resta scritto qui perché non venga «corretto» d'iniziativa da chi
rivede gli spilli fra sei mesi e li trova chiari: è una scelta, non una dimenticanza.

---

## 5. Covo dei Ladri — illustrazione per la piastrella della Guida

| | |
|---|---|
| **file** | `public/asset/guida/covo.png` |
| **misura** | 256 × 256 px |
| **sfondo** | trasparente, **alfa reale** attorno alla figura (come le altre sedici) |
| **stato** | **`da verificare`** — prompt scritto da Claude il 7 settembre 2026, tocca a Codex leggerlo |
| **serve a** | `src/components/guida/sezioniGuida.tsx`, chiave `guida/covo` |

**Perché serve, e come l'ho scoperto.** Il Covo dei Ladri era la terza linguetta della pagina dei
trofei e ora ha una pagina sua, quindi l'indice della Guida ha **diciassette** piastrelle. Le
illustrazioni in `public/asset/guida/` sono **sedici**: manca esattamente questa, ed è la voce che
il rifacimento ha creato. Senza il file la piastrella non si rompe — mostra la riserva vettoriale,
la maschera — ma è l'unica dell'indice a non avere un disegno, e in una griglia si vede subito.

**Resta aperta anche dopo il ritiro della voce 4**, e il perché va detto. La 4 si è chiusa con un
*ritaglio* perché la pianta originale del Covo parla già la lingua delle sagome: nero pieno,
dettagli in negativo bianco. Qui la lingua è un'altra — contorno spesso, campiture bianche, un
accento rosso, alla misura di un'icona da 40 px — e **nessuno** degli originali del Luogo 022 è
quello: le RMAP sono planimetrie, `PLC_022_001_00` è la scritta, `sprite-022` è una freccia. Qui la
lacuna è reale e un disegno serve davvero.

**Il soggetto però lo detta l'originale, non la mia fantasia.** È il rilievo di Codex, ed è
fondato: la prima stesura di questo prompt chiedeva una poltrona con una medaglia, inventate di
sana pianta, mentre le RMAP mostrano il motivo autentico del Covo — **pianta a poligono chiuso,
quasi circolare, e caselle a stella**. Riscritto su quello.

**Il riferimento è nel repository, e va guardato prima di generare.** È la regola che questo
progetto ha imparato sbagliando: `public/asset/guida/dungeon.png` (la maschera sulla pietra
spaccata), `public/asset/guida/completamento.png` (la coppa nell'alloro) e
`public/asset/guida/citta.png` (il treno sotto il sole rosso). La resa deve stare in mezzo a
quelle senza distinguersi: **contorno nero spesso e uniforme, campiture bianche, un solo accento
rosso, nessuno sfondo, figura centrata con un piccolo margine e un sottile alone bianco esterno,
come un adesivo ritagliato.**

**Il soggetto: la stella del Covo, dentro la sua pianta.** Guardando `RMAP_022_1_0` — e la sagoma
appena ritagliata in `public/asset/mappe/lmap/tokyo/covo-dei-ladri.png`, che è più comoda — si
vedono due segni e solo due: il **poligono chiuso, quasi circolare**, che è la sala, e le **caselle
a stella a cinque punte** che marcano i posti dei premi. Sono il Covo, e non li ho inventati io.

Niente maschera: quella è già la piastrella dei Palazzi, e due piastrelle con lo stesso segno si
confondono in una griglia da diciassette — che è precisamente il difetto da evitare in un indice.

**Prompt**

> Illustrazione a icona in stile Persona 5 Royal, **contorno nero spesso e uniforme, campiture
> bianche, un solo accento rosso**, su fondo completamente trasparente.
>
> Il soggetto: una **stella piena a cinque punte**, spigolosa e leggermente storta, al centro; e
> attorno, come una cornice aperta, il **profilo di una sala poligonale quasi circolare** — un
> anello spezzato di lati dritti, con qualche rientranza e due o tre varchi, come la pianta di una
> stanza vista dall'alto. La stella sta dentro l'anello e lo tocca appena.
>
> Dentro l'anello, ai lati della stella, **due caselle quadrate più piccole** viste dall'alto, ognuna
> con una stellina incisa: sono i posti dei premi. Ridotte a due quadrati e due stelline, niente
> più.
>
> **L'accento rosso è solo sulla stella centrale.** L'anello e le due caselle sono bianchi con il
> contorno nero. Nessun grigio, nessuna sfumatura, nessuna ombreggiatura morbida: le ombre, se
> servono, sono macchie nere piatte.
>
> Il taglio è **grafico e spigoloso**, da adesivo: linee dritte, angoli netti, il tratto più spesso
> sul contorno esterno e più sottile nei dettagli interni.
>
> Nessuna cornice esterna, nessun riquadro, nessun testo, nessuna scritta, nessuna maschera da
> ladro, nessun personaggio, nessuna poltrona, nessuna coppa. La figura occupa quasi tutta la tela,
> centrata, con un margine di poche decine di pixel e un sottile alone bianco che la stacca dal
> fondo.

**Come si verifica quando arriva**

1. l'alfa è reale e l'angolo è `(0,0,0,0)`, come nelle altre sedici;
2. messa in griglia con `guida/dungeon.png` e `guida/completamento.png` alla stessa misura, non si
   distingue per spessore del contorno né per quantità di rosso;
3. **a 40 px** — la misura vera della piastrella — la stella si riconosce e non si confonde con la
   maschera dei Palazzi né con la coppa dei trofei. È lì che un soggetto affollato smette di dire
   qualcosa.

### La metà dell'app è già pronta

La piastrella esiste già in `sezioniGuida.tsx` con la chiave `covo` e la riserva vettoriale: quando
il file arriva in `public/asset/guida/covo.png` il plugin lo mette nel manifest e la piastrella lo
usa **senza che nessuno tocchi il codice**, esattamente come per le altre sedici. C'è una prova che
lo garantisce, in `src/pages/GuidaPage.test.tsx`: monta l'indice con e senza manifest e conta le
riserve, quindi si accorge se una piastrella smettesse di accettare la propria illustrazione.


---

## Il censimento dell'interfaccia: fatto, e non manca nient'altro

La Fase 6.2 chiede la grafica per **tutte** le parti d'interfaccia dove manca, non solo per le
sezioni rifatte. Censito il 7 settembre 2026, contando i file presenti contro le chiavi che il
codice cerca davvero — **non contro quelle che uno si aspetta**: ogni riga è stata misurata
leggendo il registro nel sorgente e la cartella, e dove le due liste non combaciano è scritto in
quale delle due manca qualcosa. Le sagome dei quartieri e i tipi di spillo combaciano esattamente,
in tutte e due le direzioni: nessuna chiave senza file e nessun file orfano.

| famiglia | chiave nel codice | chiavi | file | mancanti |
|---|---|---|---|---|
| icone azione | `ui/azione-<chiave>` | 48 | 48 | — |
| icone scheda | `ui/scheda-<chiave>` | 8 | 18 | — |
| spilli della mappa | `ui/spillo-<tipo>` | 37 | 37 | — |
| piastrelle della Guida | `guida/<chiave>` | 17 | 16 | **`covo`** → voce 5 |
| sfondi di sezione e identità | `sfondi/…`, `identita/…` | 7 | 7 | — |
| sagome dei quartieri | `mappe/lmap/tokyo/<chiave>` | 29 | 29 | — |
| illustrazioni dei Palazzi e Memento | `palazzi/<chiave>` | 10 | 10 | — |
| Covo sulla mappa | `mappe/lmap/tokyo/covo-dei-ladri` | 1 | 1 | — (ritagliato dall’originale, voce 4 ritirata) |

Resta aperta **solo la voce 5**, la piastrella del Covo: la 4 si è chiusa senza generare niente,
ritagliando l’originale del Luogo 022 che Codex ha trovato.

### Un conteggio sbagliato, e come si è visto che lo era

Il primo passaggio di questo censimento aveva prodotto una voce 6 — *«le otto icone della Fusione
mancano»* — con otto prompt già scritti. **Era falsa**, e la causa merita di stare qui perché è un
errore facile da rifare: in `IconaAzione.tsx` convivono **due** registri, `RISERVA_AZIONE` che
cerca `ui/azione-<chiave>` e `RISERVA_SCHEDA` che cerca `ui/scheda-<chiave>`. Avevo raccolto le
chiavi di tutti e due con una sola espressione regolare e le avevo confrontate con i soli file
`azione-*`: le otto chiavi della Fusione risultavano senza file perché i loro file si chiamano
`scheda-fusione-*.png` **e ci sono tutti**.

La differenza fra il conteggio sbagliato e quello giusto è un `indexOf` che separa i due blocchi
prima di leggerli. Il conteggio sbagliato avrebbe fatto generare a Codex otto immagini inutili, e
avrebbe messo in `public/asset/ui/` otto file con il nome sbagliato, che nessuno avrebbe caricato:
sarebbero rimasti lì a far credere che il lavoro fosse fatto.

**La regola che ne esce**, sorella di quella dei Memento: prima di dichiarare che un asset manca,
si guarda **con che nome il codice lo cerca**, non con che nome ce lo si aspetta.

## 6. Le figure del rifacimento delle pagine (38) — richieste il 2026-09-07

Rifacendo Palazzi, Mappe, Richieste, Aiuto in battaglia, Libri, Film, Videogiochi e il dettaglio dei
negozi sono comparsi gesti e sezioni che **non hanno una figura**. La regola dettata dall'utente è
netta — «pulsanti senza componente grafico non devono essercene… e questo in ogni pagina e
sottopagina», «ogni elemento grafico provvisorio deve essere appunto provvisorio e sostituito con
la relativa opportuna grafica generata da Codex» — quindi ogni chiave nuova nasce con due cose:
una **riserva SVG in codice**, perché l'app non aspetti nessuno, e una **riga in questo
censimento**, perché la riserva non diventi il traguardo.

| famiglia | chiave nel codice | quante | prompt | stato |
|---|---|---|---|---|
| icone delle azioni nuove | `ui/azione-<chiave>` | 6 | §21 | consegnate il 2026-09-07 (`grafica-azioni-v1`) |
| icone di categoria | `ui/categoria-<chiave>` | 22 | §22 | consegnate il 2026-09-07 (`grafica-categorie-finali-v1`) |
| fregi decorativi delle sezioni | `decori/<chiave>` | 11 | §23 | **da consegnare** |
| icone di categoria delle azioni del giorno | `ui/categoria-<chiave>` | 11 | §24 | **da consegnare** |

Le sei azioni sono `piu`, `meno`, `completati`, `dettagli`, `pianta`, `posizione`: sono i gesti che
prima erano scritte nude — «+», «−», «Mostra i completati», «Dettagli», le due viste di un'area,
«Mostra posizione».

Le ventidue categorie sono le figure dentro il cartiglio rosso delle schede. Fino a oggi non erano
nemmeno **cercate** come asset: `IconaCategoria` disegnava l'SVG e basta, quindi nessuna grafica
avrebbe potuto sostituirle. Ora il componente cerca `ui/categoria-<chiave>` e ripiega sull'SVG,
com'è sempre stato per le icone d'azione.

Consegnate, si è visto che **non bastavano**, per due ragioni distinte. La prima si correggeva in
codice: i dati parlano al singolare (`arma`, `protezione`, `accessorio`, `regalo`, `materiale`,
`abito`) e le figure si chiamano al plurale, quindi le 143 armi e le 62 protezioni del catalogo
avrebbero continuato a mostrare il cartiglio pur avendo l'illustrazione pronta — ora
`chiaveCategoria()` traduce le chiavi equivalenti (compresi `libro`, `lavoro`, `mini-gioco`,
`videogioco`, `lettura`, `ambulante`, `consumabile`) e un solo file serve tutta la famiglia. La
seconda è il §24: il censimento non comprendeva i **tipi di azione del percorso**, che sono la cosa
più vista dell'app — la Guida del giorno ne mostra l'icona a 40 px — e di tredici tipi uno solo
aveva la figura.

Gli undici fregi sono immagini **puramente decorative** per le sezioni di sola prosa: stanno nel
fondo della carta al 16% di opacità, sfumate verso il testo. Dove il file manca resta una macchia
del colore del tema, che alleggerisce comunque l'angolo senza fingere di essere un disegno.

### Il font non è un asset grafico, ma il difetto era lo stesso

Nello stesso giro è venuto fuori che i tre font caricati (display, menu, decor) **non hanno le
lettere accentate**: nel font display esistono nella tabella dei caratteri ma sono glifi vuoti, e il
browser ripiegava su un'altra famiglia — «LA CITTÀ» usciva con la À sottile in mezzo a lettere
pesanti, in ogni titolo dell'app. Non è un disegno da commissionare: le lettere si costruiscono dal
font stesso, ed è quello che fa `scripts/font-italiano.py` (base + accento, più « » — … ’ “ ” ° •).
I file caricati nell'istanza sono già passati di lì; un font nuovo va passato prima di caricarlo.
